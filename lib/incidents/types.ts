import type { IncidentRow } from '@/lib/db/schema'
import type { IncidentSeverity, IncidentStatus, WasteCategory } from './constants'

/** JSON shape returned by the incidents API. */
export interface IncidentDto {
  id: number
  ref: string
  title: string
  description: string | null
  category: WasteCategory
  severity: IncidentSeverity
  status: IncidentStatus
  location: string
  latitude: number | null
  longitude: number | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
}

export function toIncidentDto(row: IncidentRow): IncidentDto {
  return {
    id: row.id,
    ref: row.ref,
    title: row.title,
    description: row.description,
    category: row.category,
    severity: row.severity,
    status: row.status,
    location: row.location,
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
  }
}
