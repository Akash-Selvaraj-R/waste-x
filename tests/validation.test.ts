import { describe, expect, it } from 'vitest'
import { generateIncidentRef, isValidIncidentRef } from '@/lib/incidents/ref'
import {
  createIncidentSchema,
  incidentRefSchema,
  listIncidentsQuerySchema,
} from '@/lib/incidents/validation'

const validPayload = {
  title: 'Mixed waste blocking drain on service road',
  category: 'Mixed municipal waste',
  severity: 'HIGH',
  location: 'Ambattur Industrial Area / Zone 07',
  latitude: 13.0996,
  longitude: 80.163,
}

describe('createIncidentSchema', () => {
  it('accepts a valid payload', () => {
    const result = createIncidentSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it('accepts a payload without coordinates and with a description', () => {
    const result = createIncidentSchema.safeParse({
      ...validPayload,
      latitude: undefined,
      longitude: undefined,
      description: 'Overflow reported by a resident near the drain mouth.',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an empty body', () => {
    const result = createIncidentSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects a missing title', () => {
    const { title: _title, ...rest } = validPayload
    const result = createIncidentSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects a title below the minimum length', () => {
    const result = createIncidentSchema.safeParse({ ...validPayload, title: 'short' })
    expect(result.success).toBe(false)
  })

  it('rejects a title above the maximum length', () => {
    const result = createIncidentSchema.safeParse({ ...validPayload, title: 'x'.repeat(161) })
    expect(result.success).toBe(false)
  })

  it('rejects an unsupported waste category', () => {
    const result = createIncidentSchema.safeParse({ ...validPayload, category: 'Nuclear waste' })
    expect(result.success).toBe(false)
  })

  it('rejects an unsupported severity value', () => {
    const result = createIncidentSchema.safeParse({ ...validPayload, severity: 'CRITICAL' })
    expect(result.success).toBe(false)
  })

  it('rejects a location below the minimum length', () => {
    const result = createIncidentSchema.safeParse({ ...validPayload, location: 'AB' })
    expect(result.success).toBe(false)
  })

  it('rejects latitude outside the valid range', () => {
    const result = createIncidentSchema.safeParse({ ...validPayload, latitude: 91 })
    expect(result.success).toBe(false)
  })

  it('rejects longitude outside the valid range', () => {
    const result = createIncidentSchema.safeParse({ ...validPayload, longitude: -181 })
    expect(result.success).toBe(false)
  })

  it('rejects non-numeric coordinates', () => {
    const result = createIncidentSchema.safeParse({ ...validPayload, latitude: 'north' })
    expect(result.success).toBe(false)
  })

  it('rejects latitude without longitude', () => {
    const result = createIncidentSchema.safeParse({ ...validPayload, longitude: undefined })
    expect(result.success).toBe(false)
    expect(result.success === false && result.error.issues.some((issue) => issue.path.includes('longitude'))).toBe(true)
  })

  it('rejects a description above the maximum length', () => {
    const result = createIncidentSchema.safeParse({ ...validPayload, description: 'x'.repeat(2001) })
    expect(result.success).toBe(false)
  })

  it('ignores unknown properties instead of persisting them', () => {
    const result = createIncidentSchema.safeParse({
      ...validPayload,
      status: 'resolved',
      crew: 'ALPHA-04',
      randomSql: 'drop table incidents',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('status')
      expect(result.data).not.toHaveProperty('crew')
      expect(result.data).not.toHaveProperty('randomSql')
    }
  })
})

describe('listIncidentsQuerySchema', () => {
  it('applies default pagination values', () => {
    const result = listIncidentsQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(20)
      expect(result.data.offset).toBe(0)
    }
  })

  it('coerces numeric strings and accepts filters', () => {
    const result = listIncidentsQuerySchema.safeParse({
      limit: '5',
      offset: '10',
      status: 'reported',
      severity: 'HIGH',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(5)
      expect(result.data.offset).toBe(10)
      expect(result.data.status).toBe('reported')
    }
  })

  it('rejects a non-numeric limit', () => {
    expect(listIncidentsQuerySchema.safeParse({ limit: 'all' }).success).toBe(false)
  })

  it('rejects a limit above the maximum page size', () => {
    expect(listIncidentsQuerySchema.safeParse({ limit: '5000' }).success).toBe(false)
  })

  it('rejects a negative offset', () => {
    expect(listIncidentsQuerySchema.safeParse({ offset: '-1' }).success).toBe(false)
  })

  it('rejects an unknown status filter', () => {
    expect(listIncidentsQuerySchema.safeParse({ status: 'deleted' }).success).toBe(false)
  })
})

describe('incident references', () => {
  it('accepts the generated reference format', () => {
    for (let i = 0; i < 200; i += 1) {
      const ref = generateIncidentRef()
      expect(ref).toMatch(/^WX-\d{4}$/)
      expect(isValidIncidentRef(ref)).toBe(true)
      expect(incidentRefSchema.safeParse(ref).success).toBe(true)
    }
  })

  it('rejects malformed references', () => {
    for (const ref of ['', 'WX1042', 'wx-1042x', 'WX-', 'DROP TABLE incidents', '../../etc/passwd', 'WX-12']) {
      expect(incidentRefSchema.safeParse(ref).success).toBe(false)
      expect(isValidIncidentRef(ref)).toBe(false)
    }
  })
})
