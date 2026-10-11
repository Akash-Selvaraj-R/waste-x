import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  state: { configured: true, up: true, url: 'postgresql://wastex:super-secret@db.internal/wastex' },
}))

vi.mock('@/lib/db', () => ({
  DatabaseNotConfiguredError: class extends Error {
    code = 'DATABASE_NOT_CONFIGURED'
  },
  isDatabaseConfigured: () => h.state.configured,
  getDatabaseUrl: () => (h.state.configured ? h.state.url : undefined),
  getDb: () => {
    throw new Error('getDb should not be called by the health check')
  },
  checkDatabase: async () => h.state.up,
  closeDatabase: async () => undefined,
}))

import { GET as health } from '@/app/api/health/route'

beforeEach(() => {
  h.state.configured = true
  h.state.up = true
})

describe('GET /api/health', () => {
  it('reports ok when the database answers', async () => {
    const response = await health()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.service).toBe('wastex-api')
    expect(body.status).toBe('ok')
    expect(body.checks.database).toBe('ok')
    expect(typeof body.time).toBe('string')
  })

  it('never leaks connection details', async () => {
    const response = await health()
    const text = await response.text()
    expect(text).not.toContain('super-secret')
    expect(text).not.toContain('postgresql://')
    expect(text).not.toContain('db.internal')
  })

  it('reports unconfigured persistence as degraded', async () => {
    h.state.configured = false
    const response = await health()
    expect(response.status).toBe(503)
    const body = await response.json()
    expect(body.status).toBe('unconfigured')
    expect(body.checks.database).toBe('not_configured')
  })

  it('reports an unreachable database as degraded', async () => {
    h.state.up = false
    const response = await health()
    expect(response.status).toBe(503)
    const body = await response.json()
    expect(body.status).toBe('degraded')
    expect(body.checks.database).toBe('unreachable')
  })
})
