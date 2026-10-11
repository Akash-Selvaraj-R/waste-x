import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { closeDatabase } from '@/lib/db'

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL?.trim()
const shouldRun = Boolean(TEST_DATABASE_URL)

const root = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..')

const validPayload = {
  title: 'Integration test waste report on service road',
  category: 'Plastic waste',
  severity: 'MED',
  location: 'Guindy Service Road / Zone 12',
  latitude: 13.0067,
  longitude: 80.2206,
}

function post(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/incidents', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function get(url: string): NextRequest {
  return new NextRequest(url, { method: 'GET' })
}

describe.skipIf(!shouldRun)('incidents API against a real PostgreSQL database', () => {
  let admin: pg.Client
  let listIncidents: typeof import('@/app/api/incidents/route').GET
  let createIncident: typeof import('@/app/api/incidents/route').POST
  let getIncident: typeof import('@/app/api/incidents/[ref]/route').GET
  const createdRefs: string[] = []

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL

    admin = new pg.Client({ connectionString: TEST_DATABASE_URL })
    await admin.connect()

    const migrationDir = path.join(root, 'drizzle')
    const { rows: existing } = await admin.query(
      "select to_regclass('public.incidents') as table_name",
    )
    const files = existsSync(migrationDir)
      ? readdirSync(migrationDir)
          .filter((file) => file.endsWith('.sql'))
          .sort()
      : []
    if (existing[0]?.table_name) {
      // Schema already present in this test database — never re-run DDL.
    } else {
      for (const file of files) {
        const sql = readFileSync(path.join(migrationDir, file), 'utf8')
        for (const statement of sql.split('--> statement-breakpoint')) {
          if (statement.trim().length > 0) await admin.query(statement)
        }
      }
    }

    const route = await import('@/app/api/incidents/route')
    const detailRoute = await import('@/app/api/incidents/[ref]/route')
    listIncidents = route.GET
    createIncident = route.POST
    getIncident = detailRoute.GET
  })

  afterAll(async () => {
    if (admin && createdRefs.length > 0) {
      await admin.query('delete from incidents where ref = any($1)', [createdRefs])
    }
    await closeDatabase()
    await admin?.end()
  })

  beforeEach(() => {
    createdRefs.length = 0
  })

  it('rejects invalid input before touching the database', async () => {
    const response = await createIncident(post({ title: 'x' }))
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('creates, lists, and retrieves a persisted incident', async () => {
    const createResponse = await createIncident(post(validPayload))
    expect(createResponse.status).toBe(201)
    const created = await createResponse.json()
    expect(created.incident.ref).toMatch(/^WX-\d{4}$/)
    createdRefs.push(created.incident.ref)

    const listResponse = await listIncidents(
      get('http://localhost:3000/api/incidents?limit=100&severity=MED&status=reported'),
    )
    expect(listResponse.status).toBe(200)
    const listBody = await listResponse.json()
    const found = listBody.incidents.find(
      (incident: { ref: string }) => incident.ref === created.incident.ref,
    )
    expect(found).toBeTruthy()
    expect(found.title).toBe(validPayload.title)
    expect(listBody.meta.total).toBeGreaterThanOrEqual(1)

    const detailResponse = await getIncident(get(`http://localhost:3000/api/incidents/${created.incident.ref}`), {
      params: Promise.resolve({ ref: created.incident.ref }),
    })
    expect(detailResponse.status).toBe(200)
    const detailBody = await detailResponse.json()
    expect(detailBody.incident.ref).toBe(created.incident.ref)
    expect(detailBody.incident.latitude).toBeCloseTo(validPayload.latitude, 5)
    expect(new Date(detailBody.incident.createdAt).toString()).not.toBe('Invalid Date')

    const reloadResponse = await getIncident(
      get(`http://localhost:3000/api/incidents/${created.incident.ref}`),
      { params: Promise.resolve({ ref: created.incident.ref }) },
    )
    expect(reloadResponse.status).toBe(200)
  })

  it('returns 404 for an unknown reference', async () => {
    const response = await getIncident(get('http://localhost:3000/api/incidents/WX-9999'), {
      params: Promise.resolve({ ref: 'WX-9999' }),
    })
    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('returns 400 for a malformed reference', async () => {
    const response = await getIncident(get('http://localhost:3000/api/incidents/oops'), {
      params: Promise.resolve({ ref: 'oops' }),
    })
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error.code).toBe('INVALID_REFERENCE')
  })

  it('rejects coordinates outside PostgreSQL check constraints via the API', async () => {
    const response = await createIncident(post({ ...validPayload, latitude: 95 }))
    expect(response.status).toBe(400)
  })

  it('generates unique references across repeated creates', async () => {
    const refs = new Set<string>()
    for (let i = 0; i < 5; i += 1) {
      const response = await createIncident(post({ ...validPayload, title: `Unique reference probe ${i}` }))
      expect(response.status).toBe(201)
      const body = await response.json()
      refs.add(body.incident.ref)
      createdRefs.push(body.incident.ref)
    }
    expect(refs.size).toBe(5)
  })
})

describe.runIf(!shouldRun)('integration suite (skipped)', () => {
  it('is skipped because TEST_DATABASE_URL is not set', () => {
    expect(shouldRun).toBe(false)
  })
})
