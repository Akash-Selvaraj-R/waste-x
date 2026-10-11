export const WASTE_CATEGORIES = [
  'Mixed municipal waste',
  'Organic waste',
  'Plastic waste',
  'Construction debris',
  'Hazardous waste',
  'E-waste',
  'Other',
] as const

export type WasteCategory = (typeof WASTE_CATEGORIES)[number]

export const SEVERITY_OPTIONS = ['HIGH', 'MED', 'LOW'] as const
export type IncidentSeverity = (typeof SEVERITY_OPTIONS)[number]

export const INCIDENT_STATUSES = ['reported', 'triaged', 'in_progress', 'resolved'] as const
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number]

/** Public, human-readable reference format: WX-1042 */
export const INCIDENT_REF_PATTERN = /^WX-\d{4,6}$/

export const API_LIMITS = {
  titleMin: 8,
  titleMax: 160,
  descriptionMax: 2000,
  locationMin: 3,
  locationMax: 300,
  pageSizeMax: 100,
  pageOffsetMax: 100_000,
  requestBytes: 32 * 1024,
} as const
