import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const h = vi.hoisted(() => {
  class DatabaseNotConfiguredError extends Error {
    code = 'DATABASE_NOT_CONFIGURED'
    constructor() {
      super('DATABASE_URL is not configured')
      this.name = 'DatabaseNotConfiguredError'
    }
  }

  const state = {
    rows: [] as Record<string, unknown>[],
    total: 0,
    getDbError: null as unknown,
    insertErrors: [] as { code: string }[],
    notConfigured: false,
    dbUp: true,
    inserted: [] as Record<string, unknown>[],
  }

  function thenable(getValue: () => unknown) {
    const chain = {
      from: () => chain,
      where: () => chain,
      orderBy: () => chain,
      limit: () => chain,
      offset: () => chain,
      then: (onFulfilled: (value: unknown) => unknown, onRejected: (reason: unknown) => unknown) =>
        Promise.resolve()
          .then(getValue)
          .then(onFulfilled, onRejected),
    }
    return chain
  }

  const db = {
    select: (fields?: Record<string, unknown>) => {
      const isCount = Boolean(fields && 'total' in fields)
      return thenable(() => (isCount ? [{ total: state.total }] : state.rows))
    },
    insert: () => ({
      values: (payload: Record<string, unknown>) => ({
        returning: async () => {
          if (state.insertErrors.length > 0) throw state.insertErrors.shift()
          const row = {
            id: 42,
            description: null,
            latitude: null,
            longitude: null,
            status: 'reported',
            createdAt: new Date('2026-10-10T10:00:00.000Z'),
            updatedAt: new Date('2026-10-10T10:00:00.000Z'),
            resolvedAt: null,
            ...payload,
          }
          state.inserted.push(payload)
          return [row]
        },
      }),
    }),
  }

  return { state, db, DatabaseNotConfiguredError }
})

vi.mock('@/lib/db', () => ({
  DatabaseNotConfiguredError: h.DatabaseNotConfiguredError,
  isDatabaseConfigured: () => !h.state.notConfigured,
  getDatabaseUrl: () => (h.state.notConfigured ? undefined : 'postgresql://wastex:super-secret@db.internal/wastex'),
  getDb: () => {
    if (h.state.getDbError) throw h.state.getDbError
    return h.db
  },
  checkDatabase: async () => h.state.dbUp,
  closeDatabase: async () => undefined,
}))

import { GET as listIncidents, POST as createIncidentRoute } from '@/app/api/incidents/route'
import { GET as getIncident } from '@/app/api/incidents/[ref]/route'

const API = 'http://localhost:3000/api/incidents'

const validPayload = {
  title: 'Mixed waste blocking drain on service road',
  category: 'Mixed municipal waste',
  severity: 'HIGH',
  location: 'Ambattur Industrial Area / Zone 07',
  latitude: 13.0996,
  longitude: 80.163,
}

function post(body: unknown): NextRequest {
  return new NextRequest(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function get(url = API): NextRequest {
  return new NextRequest(url, { method: 'GET' })
}

function detail(ref: string) {
  return getIncident(get(`${API}/${encodeURIComponent(ref)}`), {
    params: Promise.resolve({ ref: encodeURIComponent(ref) }),
  })
}

beforeEach(() => {
  h.state.rows = []
  h.state.total = 0
  h.state.getDbError = null
  h.state.insertErrors = []
  h.state.notConfigured = false
  h.state.dbUp = true
  h.state.inserted = []
})

describe('POST /api/incidents', () => {
  it('creates an incident and returns the generated reference', async () => {
    const response = await createIncidentRoute(post(validPayload))
    expect(response.status).toBe(201)

    const body = await response.json()
    expect(body.incident.ref).toMatch(/^WX-\d{4}$/)
    expect(body.incident.title).toBe(validPayload.title)
    expect(body.incident.category).toBe('Mixed municipal waste')
    expect(body.incident.severity).toBe('HIGH')
    expect(body.incident.status).toBe('reported')
    expect(body.incident.location).toBe(validPayload.location)
    expect(body.incident.latitude).toBeCloseTo(13.0996)
    expect(body.incident.createdAt).toBe('2026-10-10T10:00:00.000Z')
    expect(h.state.inserted).toHaveLength(1)
    expect(h.state.inserted[0].ref).toMatch(/^WX-\d{4}$/)
  })

  it('rejects malformed JSON with a 400', async () => {
    const response = await createIncidentRoute(post('{ not json'))
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error.code).toBe('INVALID_JSON')
  })

  it('rejects an empty body with a 400', async () => {
    const response = await createIncidentRoute(post(''))
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error.code).toBe('INVALID_JSON')
  })

  it('rejects a payload with missing fields and reports field details', async () => {
    const response = await createIncidentRoute(post({ title: 'too short' }))
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
    const fields = body.error.details.map((detail: { field: string }) => detail.field)
    expect(fields).toContain('category')
    expect(fields).toContain('severity')
    expect(fields).toContain('location')
    expect(h.state.inserted).toHaveLength(0)
  })

  it('rejects unsupported enum values', async () => {
    const response = await createIncidentRoute(post({ ...validPayload, category: 'Toxic sludge' }))
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error.details.some((detail: { field: string }) => detail.field === 'category')).toBe(true)
  })

  it('rejects out-of-range coordinates', async () => {
    const response = await createIncidentRoute(post({ ...validPayload, latitude: 145, longitude: 400 }))
    expect(response.status).toBe(400)
    const body = await response.json()
    const fields = body.error.details.map((detail: { field: string }) => detail.field)
    expect(fields).toContain('latitude')
    expect(fields).toContain('longitude')
  })

  it('rejects latitude without longitude', async () => {
    const { longitude: _longitude, ...rest } = validPayload
    const response = await createIncidentRoute(post(rest))
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error.details.some((detail: { field: string }) => detail.field === 'longitude')).toBe(true)
  })

  it('rejects oversized request bodies with a 413', async () => {
    const response = await createIncidentRoute(post({ ...validPayload, description: 'x'.repeat(40_000) }))
    expect(response.status).toBe(413)
    const body = await response.json()
    expect(body.error.code).toBe('PAYLOAD_TOO_LARGE')
  })

  it('returns 503 when the database is not configured', async () => {
    h.state.notConfigured = true
    h.state.getDbError = new h.DatabaseNotConfiguredError()
    const response = await createIncidentRoute(post(validPayload))
    expect(response.status).toBe(503)
    const text = await response.text()
    expect(text).toContain('DATABASE_NOT_CONFIGURED')
    expect(text).toContain('.env.example')
    expect(text).not.toContain('postgresql://')
    expect(text).not.toContain('super-secret')
  })

  it('returns 503 when the database is unreachable', async () => {
    h.state.getDbError = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' })
    const response = await createIncidentRoute(post(validPayload))
    expect(response.status).toBe(503)
    const body = await response.json()
    expect(body.error.code).toBe('DATABASE_UNAVAILABLE')
    expect(body.error.message).not.toContain('ECONNREFUSED')
  })

  it('returns a generic 500 without leaking internals on unexpected failures', async () => {
    h.state.getDbError = new Error('select * from incidents -- secret sql')
    const response = await createIncidentRoute(post(validPayload))
    expect(response.status).toBe(500)
    const text = await response.text()
    expect(text).toContain('INTERNAL_ERROR')
    expect(text).not.toContain('secret sql')
    expect(text).not.toContain('stack')
  })

  it('retries a reference collision and succeeds', async () => {
    h.state.insertErrors = [{ code: '23505' }]
    const response = await createIncidentRoute(post(validPayload))
    expect(response.status).toBe(201)
  })

  it('returns 409 when references keep colliding', async () => {
    h.state.insertErrors = Array.from({ length: 6 }, () => ({ code: '23505' }))
    const response = await createIncidentRoute(post(validPayload))
    expect(response.status).toBe(409)
    const body = await response.json()
    expect(body.error.code).toBe('CONFLICT')
  })
})

describe('GET /api/incidents', () => {
  it('returns persisted incidents with pagination metadata', async () => {
    const base = {
      title: 'Fixture incident',
      description: null,
      category: 'Mixed municipal waste',
      severity: 'HIGH',
      location: 'Ambattur Industrial Area',
      latitude: null,
      longitude: null,
      createdAt: new Date('2026-10-10T10:00:00.000Z'),
      updatedAt: new Date('2026-10-10T10:00:00.000Z'),
      resolvedAt: null,
    }
    h.state.rows = [
      { ...base, id: 1, ref: 'WX-1042', title: 'First', status: 'reported' },
      { ...base, id: 2, ref: 'WX-1051', title: 'Second', status: 'triaged' },
    ]
    h.state.total = 7

    const response = await listIncidents(get(`${API}?limit=2&offset=0`))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.incidents).toHaveLength(2)
    expect(body.incidents[0].ref).toBe('WX-1042')
    expect(body.incidents[0].createdAt).toBe('2026-10-10T10:00:00.000Z')
    expect(body.meta).toEqual({ limit: 2, offset: 0, total: 7 })
  })

  it('applies default pagination when no query is supplied', async () => {
    h.state.rows = []
    h.state.total = 0
    const response = await listIncidents(get(API))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.meta.limit).toBe(20)
    expect(body.meta.offset).toBe(0)
  })

  it('rejects invalid pagination parameters', async () => {
    const response = await listIncidents(get(`${API}?limit=9999`))
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects unsupported filter values', async () => {
    const response = await listIncidents(get(`${API}?status=expunged`))
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error.details[0].field).toBe('status')
  })

  it('returns 503 when the database is not configured', async () => {
    h.state.notConfigured = true
    h.state.getDbError = new h.DatabaseNotConfiguredError()
    const response = await listIncidents(get(API))
    expect(response.status).toBe(503)
    const body = await response.json()
    expect(body.error.code).toBe('DATABASE_NOT_CONFIGURED')
  })
})

describe('GET /api/incidents/[ref]', () => {
  it('returns the matching incident', async () => {
    h.state.rows = [
      {
        id: 1,
        ref: 'WX-1042',
        title: 'Mixed waste blocking drain',
        category: 'Mixed municipal waste',
        severity: 'HIGH',
        status: 'reported',
        location: 'Ambattur',
        latitude: null,
        longitude: null,
        description: null,
        createdAt: new Date('2026-10-10T10:00:00.000Z'),
        updatedAt: new Date('2026-10-10T10:00:00.000Z'),
        resolvedAt: null,
      },
    ]
    h.state.total = 1

    const response = await detail('WX-1042')
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.incident.ref).toBe('WX-1042')
    expect(body.incident.title).toBe('Mixed waste blocking drain')
  })

  it('returns 404 for an unknown but well-formed reference', async () => {
    h.state.rows = []
    const response = await detail('WX-9999')
    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error.code).toBe('NOT_FOUND')
    expect(body.error.message).toContain('WX-9999')
  })

  it('returns 400 for a malformed reference', async () => {
    const response = await detail('not-a-reference')
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error.code).toBe('INVALID_REFERENCE')
  })

  it('returns 503 when the database is not configured', async () => {
    h.state.notConfigured = true
    h.state.getDbError = new h.DatabaseNotConfiguredError()
    const response = await detail('WX-1042')
    expect(response.status).toBe(503)
    const body = await response.json()
    expect(body.error.code).toBe('DATABASE_NOT_CONFIGURED')
  })
})
