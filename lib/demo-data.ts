export type IncidentSeverity = 'HIGH' | 'MED' | 'LOW'

export type IncidentColor = 'orange' | 'yellow' | 'red' | 'lime' | 'cobalt' | 'purple'

export interface DetectionLine {
  label: string
  value: string
  tone: IncidentColor
}

export interface DemoIncident {
  id: string
  ref: string
  place: string
  type: string
  severity: IncidentSeverity
  confidence: string
  color: IncidentColor
  zone: string
  detected: string
  crew: string
  status: string
  statusTone: 'cobalt' | 'yellow' | 'orange' | 'lime'
  coords: string
  note: string
  detections: DetectionLine[]
}

export interface DemoHotspot {
  name: string
  count: number
  frequency: number
  type: string
  risk: IncidentSeverity
  tone: IncidentColor
}

export const WASTE_CATEGORIES = [
  'Mixed municipal waste',
  'Organic waste',
  'Plastic waste',
  'Construction debris',
  'Hazardous waste',
  'E-waste',
  'Other',
] as const

export const SEVERITY_OPTIONS: IncidentSeverity[] = ['HIGH', 'MED', 'LOW']

export const DEMO_INCIDENTS: DemoIncident[] = [
  {
    id: '00421',
    ref: 'WX-1042',
    place: 'Ambattur Industrial Area',
    type: 'Mixed municipal waste',
    severity: 'HIGH',
    confidence: '94%',
    color: 'orange',
    zone: 'ZONE 07',
    detected: '10:42:08',
    crew: 'ALPHA-04',
    status: 'DISPATCHED',
    statusTone: 'cobalt',
    coords: '13.0996° N / 80.1630° E',
    note: 'Waste volume estimated at 1.8 m³. Drain proximity raises blockage risk. Recommended response window: 45 minutes.',
    detections: [
      { label: 'MIXED PLASTIC', value: '94%', tone: 'cobalt' },
      { label: 'ORGANIC', value: '81%', tone: 'lime' },
      { label: 'CONSTRUCTION', value: '58%', tone: 'yellow' },
      { label: 'HAZARDOUS', value: '31%', tone: 'red' },
    ],
  },
  {
    id: '00512',
    ref: 'WX-1051',
    place: 'Perambur Market Road',
    type: 'Organic overflow',
    severity: 'MED',
    confidence: '91%',
    color: 'yellow',
    zone: 'ZONE 03',
    detected: '10:39:44',
    crew: 'BRAVO-03',
    status: 'ASSIGNED',
    statusTone: 'yellow',
    coords: '13.1215° N / 80.2341° E',
    note: 'Overflow estimated at 2.4 m³. Market-day peak load. Recommended response window: 90 minutes.',
    detections: [
      { label: 'ORGANIC', value: '91%', tone: 'lime' },
      { label: 'PAPER / CARDBOARD', value: '64%', tone: 'yellow' },
      { label: 'PLASTIC', value: '47%', tone: 'cobalt' },
    ],
  },
  {
    id: '00517',
    ref: 'WX-1057',
    place: 'Guindy Service Road',
    type: 'Construction debris',
    severity: 'HIGH',
    confidence: '88%',
    color: 'red',
    zone: 'ZONE 12',
    detected: '10:37:12',
    crew: 'UNASSIGNED',
    status: 'AWAITING CREW',
    statusTone: 'orange',
    coords: '13.0067° N / 80.2206° E',
    note: 'Debris volume estimated at 3.6 m³. Kerbside obstruction raises access risk. Recommended response window: 60 minutes.',
    detections: [
      { label: 'CONSTRUCTION', value: '88%', tone: 'yellow' },
      { label: 'MIXED PLASTIC', value: '44%', tone: 'cobalt' },
      { label: 'HAZARDOUS', value: '22%', tone: 'red' },
    ],
  },
]

export const DEMO_HOTSPOTS: DemoHotspot[] = [
  { name: 'AMBATTUR INDUSTRIAL AREA', count: 42, frequency: 86, type: 'MIXED', risk: 'HIGH', tone: 'orange' },
  { name: 'PERAMBUR MARKET ROAD', count: 31, frequency: 71, type: 'ORGANIC', risk: 'MED', tone: 'yellow' },
  { name: 'GUINDY SERVICE ROAD', count: 18, frequency: 54, type: 'CONSTRUCTION', risk: 'HIGH', tone: 'red' },
  { name: 'T. NAGAR BUS DEPOT', count: 12, frequency: 38, type: 'PLASTIC', risk: 'MED', tone: 'cobalt' },
]

export function findIncidentByRef(ref: string): DemoIncident | undefined {
  const needle = ref.trim().toLowerCase()
  if (!needle) return undefined
  return DEMO_INCIDENTS.find((incident) => incident.ref.toLowerCase() === needle || incident.id === needle)
}

export function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
