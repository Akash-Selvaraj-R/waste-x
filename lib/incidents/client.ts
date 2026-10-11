import type { IncidentDto } from './types'
import type { IncidentSeverity, IncidentStatus, WasteCategory } from './constants'

export type IncidentFailureKind =
  | 'validation'
  | 'not_found'
  | 'not_configured'
  | 'unavailable'
  | 'conflict'
  | 'server_error'

export interface IncidentFailure {
  kind: IncidentFailureKind
  status: number
  message: string
  details?: { field: string; message: string }[]
}

export type IncidentResult<T> = { ok: true; data: T } | { ok: false; failure: IncidentFailure }

export interface IncidentListPage {
  incidents: IncidentDto[]
  meta: { limit: number; offset: number; total: number }
}

export interface CreateIncidentPayload {
  title: string
  description?: string
  category: WasteCategory
  severity: IncidentSeverity
  location: string
  latitude?: number | null
  longitude?: number | null
}

const GENERIC_MESSAGE = 'The request could not be completed. Please try again.'

function mapFailure(status: number, code: string | undefined, message: string | undefined): IncidentFailure {
  const fallback = status >= 500 ? 'server_error' : 'validation'
  const kind: IncidentFailureKind =
    status === 404 || code === 'NOT_FOUND' || code === 'INVALID_REFERENCE'
      ? 'not_found'
      : code === 'DATABASE_NOT_CONFIGURED'
        ? 'not_configured'
        : code === 'DATABASE_UNAVAILABLE'
          ? 'unavailable'
          : code === 'CONFLICT'
            ? 'conflict'
            : fallback
  return {
    kind,
    status,
    message: message || GENERIC_MESSAGE,
  }
}

async function parseResponse<T>(response: Response): Promise<IncidentResult<T>> {
  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const envelope = payload as { error?: { code?: string; message?: string; details?: { field: string; message: string }[] } } | null
    const failure = mapFailure(response.status, envelope?.error?.code, envelope?.error?.message)
    if (envelope?.error?.details) failure.details = envelope.error.details
    return { ok: false, failure }
  }

  return { ok: true, data: payload as T }
}

async function request<T>(path: string, init?: RequestInit): Promise<IncidentResult<T>> {
  let response: Response
  try {
    response = await fetch(path, init)
  } catch {
    return {
      ok: false,
      failure: {
        kind: 'unavailable',
        status: 0,
        message: 'Could not reach the WASTEX server. Check your connection and try again.',
      },
    }
  }
  return parseResponse<T>(response)
}

export function fetchIncidents(
  params: { limit?: number; offset?: number; status?: IncidentStatus } = {},
): Promise<IncidentResult<IncidentListPage>> {
  const search = new URLSearchParams()
  if (params.limit) search.set('limit', String(params.limit))
  if (params.offset) search.set('offset', String(params.offset))
  if (params.status) search.set('status', params.status)
  const query = search.toString()
  return request<IncidentListPage>(`/api/incidents${query ? `?${query}` : ''}`)
}

export function fetchIncident(ref: string): Promise<IncidentResult<{ incident: IncidentDto }>> {
  return request<{ incident: IncidentDto }>(`/api/incidents/${encodeURIComponent(ref)}`)
}

export function createIncident(
  payload: CreateIncidentPayload,
): Promise<IncidentResult<{ incident: IncidentDto }>> {
  return request<{ incident: IncidentDto }>('/api/incidents', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
