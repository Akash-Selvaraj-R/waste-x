'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowUpRight, BrainCircuit, Check, ChevronRight, CircleDot, Clock, Crosshair, Download, FileText, Gauge, Grid2X2, Layers3, MapPin, Network, Plus, Radar, RotateCcw, Route as RouteIcon, Search, Settings, ShieldCheck, Sparkles, Truck, Upload, X } from 'lucide-react'
import {
  DEMO_HOTSPOTS,
  DEMO_INCIDENTS,
  SEVERITY_OPTIONS,
  WASTE_CATEGORIES,
  decodeSegment,
} from '@/lib/demo-data'
import {
  createIncident,
  fetchIncident,
  fetchIncidents,
  type IncidentFailure,
  type IncidentFailureKind,
} from '@/lib/incidents/client'
import type { IncidentDto } from '@/lib/incidents/types'
import { INCIDENT_STATUSES, type IncidentSeverity, type IncidentStatus, type WasteCategory } from '@/lib/incidents/constants'

const nav = [
  ['01', 'COMMAND CENTER', '/dashboard', Gauge],
  ['02', 'INCIDENTS', '/incidents', CircleDot],
  ['03', 'AI VISION', '/ai-vision', BrainCircuit],
  ['04', 'HOTSPOTS', '/hotspots', Radar],
  ['05', 'OPERATIONS', '/operations', Layers3],
  ['06', 'ROUTES', '/routes', RouteIcon],
  ['07', 'VERIFICATION', '/verification', ShieldCheck],
  ['08', 'ANALYTICS', '/analytics', Grid2X2],
  ['09', 'AGENTS', '/agents', Network],
  ['10', 'REPORTS', '/reports', FileText],
] as const

const navSecondary = [
  ['LIVE MAP', '/map', MapPin],
  ['SETTINGS', '/settings', Settings],
] as const

const feed = [
  ['10:42:08', 'INCIDENT DETECTED', 'Mixed waste signal / Zone 07 / Ambattur', 'orange'],
  ['10:42:11', 'VISION AGENT CLASSIFIED', 'Plastic 92% / Organic 81% / confidence 94%', 'cobalt'],
  ['10:42:14', 'RISK SCORE UPDATED', 'Drain blockage probability raised to 0.81', 'purple'],
  ['10:42:19', 'CREW ASSIGNED', 'ALPHA-04 dispatched to incident #00421', 'lime'],
  ['10:42:27', 'ROUTE OPTIMIZED', 'Route 07 rebuilt / 8.4 km / est. 31 min', 'cobalt'],
  ['10:42:43', 'VERIFICATION PENDING', 'After-image required to close #00418', 'yellow'],
] as const

const commands: [string, string, string][] = [
  ['/incident', 'OPEN INCIDENT QUEUE', '/incidents'],
  ['/hotspot', 'SHOW RECURRING HOTSPOTS', '/hotspots'],
  ['/route', 'ROUTE OPTIMIZATION BOARD', '/routes'],
  ['/agent', 'AGENT NETWORK GRAPH', '/agents'],
  ['/report', 'OPEN REPORT MODULE', '/reports'],
  ['/vision', 'RUN AI VISION ANALYSIS', '/ai-vision'],
  ['/ops', 'FIELD OPERATIONS BOARD', '/operations'],
  ['/verify', 'VERIFY CLEANUP EVIDENCE', '/verification'],
  ['/map', 'OPEN FULL CITY MAP', '/map'],
  ['/new', 'REPORT A NEW INCIDENT', '/incidents/new'],
]

function Logo() {
  return (
    <span className="brand-mark" aria-label="WASTEX mark">
      <svg viewBox="0 0 44 44" width="44" height="44" aria-hidden="true">
        <rect x="1.5" y="1.5" width="41" height="41" fill="#111111" />
        <path d="M8 12 L14.5 31 L21.5 19 L28.5 31 L35 12" fill="none" stroke="#F5F1E8" strokeWidth="3.4" strokeLinejoin="miter" />
        <path d="M4 37 H40" stroke="#2354FF" strokeWidth="2" strokeDasharray="3 3" />
        <rect x="30" y="6" width="8" height="8" fill="#C6F531" stroke="#111111" strokeWidth="2" />
        <circle cx="8" cy="12" r="2.6" fill="#FF5A1F" />
      </svg>
    </span>
  )
}

function usePaletteHotkey(setOpen: (value: boolean) => void) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setOpen])
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const results = commands.filter((item) => `${item[0]} ${item[1]}`.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      const id = window.setTimeout(() => inputRef.current?.focus(), 30)
      const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
      window.addEventListener('keydown', escape)
      return () => { window.clearTimeout(id); window.removeEventListener('keydown', escape) }
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    setActive((current) => (current >= results.length ? 0 : current))
  }, [results.length, open])

  useEffect(() => {
    if (!open) return
    document.getElementById(`palette-item-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  const run = (href: string) => { onClose(); router.push(href) }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((current) => (current + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((current) => (current - 1 + results.length) % results.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const target = results[active]
      if (target) run(target[2])
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActive(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActive(results.length - 1)
    }
  }

  if (!open) return null

  return (
    <div className="palette-overlay" role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={onClose}>
      <div className="palette" onMouseDown={(event) => event.stopPropagation()}>
        <div className="palette-head">
          <span className="mono-label">OPERATOR CONSOLE / KEYBOARD COMMAND</span>
          <button className="palette-close" onClick={onClose} aria-label="Close palette"><X /></button>
        </div>
        <div className="palette-field">
          <Search />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => { setQuery(event.target.value); setActive(0) }}
            onKeyDown={handleKeyDown}
            placeholder="SEARCH COMMANDS"
            aria-label="Search commands"
            aria-controls="palette-list"
            aria-expanded
            aria-activedescendant={results.length > 0 ? `palette-item-${active}` : undefined}
            role="combobox"
            autoComplete="off"
          />
          <kbd>ESC</kbd>
        </div>
        <div className="palette-list" id="palette-list" role="listbox" aria-label="Commands">
          {results.map(([cmd, label, href], index) => (
            <button
              key={cmd}
              id={`palette-item-${index}`}
              role="option"
              aria-selected={index === active}
              className={index === active ? 'palette-item active' : 'palette-item'}
              onMouseEnter={() => setActive(index)}
              onClick={() => run(href)}
            >
              <span className="palette-cmd">{cmd}</span>
              <span className="palette-label">{label}</span>
              <kbd>{href}</kbd>
              <ChevronRight />
            </button>
          ))}
          {results.length === 0 && <div className="palette-empty">NO COMMAND MATCHES / TRY “/ROUTE”</div>}
        </div>
        <div className="palette-foot"><span>↑ ↓ NAVIGATE</span><span>↵ EXECUTE</span><span>ESC CLOSE</span></div>
      </div>
    </div>
  )
}

function Sidebar({ active = '/dashboard' }: { active?: string }) {
  return (
    <aside className="sidebar">
      <Link href="/" className="brand">
        <Logo />
        <span><strong>WASTEX</strong><small>AI WASTE INTELLIGENCE SYSTEM</small></span>
      </Link>
      <div className="side-label">SECTIONS / 01 — 10</div>
      <nav className="nav-list">
        {nav.map(([num, label, href, Icon]) => (
          <Link key={href} href={href} className={active === href ? 'nav-item active' : 'nav-item'}>
            <span className="nav-num">{num}</span>
            <Icon />
            <span className="nav-label">{label}</span>
            {active === href && <span className="nav-node" />}
          </Link>
        ))}
      </nav>
      <div className="side-label system-label">SYSTEM</div>
      <nav className="nav-list nav-list-secondary">
        {navSecondary.map(([label, href, Icon]) => (
          <Link key={href} href={href} className={active === href ? 'nav-item active' : 'nav-item'}>
            <span className="nav-num">—</span>
            <Icon />
            <span className="nav-label">{label}</span>
          </Link>
        ))}
      </nav>
      <div className="system-status"><span className="pulse" /> SYSTEM OPERATIONAL / ONLINE</div>
      <div className="sidebar-foot"><span>REPORTS PERSISTED / ANALYTICS DEMO</span><span>v0.9.4 — CHENNAI GRID</span></div>
    </aside>
  )
}

function Topbar({ title = 'Command center', eyebrow = 'LIVE OPERATIONS / CHENNAI', onSearch }: { title?: string; eyebrow?: string; onSearch: () => void }) {
  return (
    <header className="topbar">
      <div className="mobile-brand"><Logo /><strong>WASTEX</strong></div>
      <div className="topbar-title">
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
      </div>
      <div className="top-actions">
        <button className="search-btn" onClick={onSearch} aria-label="Search commands"><Search /><span>SEARCH COMMANDS</span><kbd>⌘ K</kbd></button>
        <Link href="/incidents/new" className="button button-lime"><Plus /> NEW INCIDENT</Link>
        <span className="avatar" title="Demo operator badge">AK</span>
      </div>
    </header>
  )
}

function Shell({ active, title, eyebrow, children }: { active: string; title: string; eyebrow: string; children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false)
  usePaletteHotkey(setPaletteOpen)
  return (
    <div className="app-shell">
      <Sidebar active={active} />
      <main className="main-content">
        <Topbar title={title} eyebrow={eyebrow} onSearch={() => setPaletteOpen(true)} />
        {children}
      </main>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}

function Metric({ value, label, change, tone = 'lime', lead = false }: { value: string; label: string; change: string; tone?: string; lead?: boolean }) {
  return (
    <div className={`metric metric-${tone} ${lead ? 'metric-lead' : ''}`}>
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
      <div className="metric-change">{change}</div>
    </div>
  )
}

type MapLayerState = {
  markers: boolean
  hotspotZones: boolean
  routeOverlay: boolean
  zoneBoundaries: boolean
  coordinateGrid: boolean
}

const DEFAULT_MAP_LAYERS: MapLayerState = {
  markers: true,
  hotspotZones: false,
  routeOverlay: false,
  zoneBoundaries: true,
  coordinateGrid: true,
}

type MapMarker = { x: number; y: number; tone: 'high' | 'med' | 'low'; ref?: string; place?: string }

const mapMarkers: MapMarker[] = [
  { x: 18, y: 29, tone: 'high', ref: 'WX-1042', place: 'Ambattur Industrial Area' },
  { x: 31, y: 62, tone: 'med', ref: 'WX-1051', place: 'Perambur Market Road' },
  { x: 45, y: 40, tone: 'high', ref: 'WX-1057', place: 'Guindy Service Road' },
  { x: 56, y: 72, tone: 'low' },
  { x: 67, y: 27, tone: 'high' },
  { x: 76, y: 54, tone: 'med' },
  { x: 85, y: 36, tone: 'low' },
  { x: 23, y: 78, tone: 'med' },
  { x: 74, y: 77, tone: 'high' },
]

const hotspotSpots = [
  { x: 18, y: 29, warn: false },
  { x: 31, y: 62, warn: true },
  { x: 45, y: 40, warn: false },
]

function MapCanvas({ tall = false, routes = false, layers }: { tall?: boolean; routes?: boolean; layers?: Partial<MapLayerState> }) {
  const router = useRouter()
  const resolved: MapLayerState = { ...DEFAULT_MAP_LAYERS, routeOverlay: routes, ...layers }
  return (
    <div className={`map-canvas ${tall ? 'map-tall' : ''} ${resolved.coordinateGrid ? '' : 'grid-off'}`}>
      {resolved.coordinateGrid && <div className="map-grid" />}
      <div className="map-road road-a" />
      <div className="map-road road-b" />
      <div className="map-road road-c" />
      <div className="map-road road-d" />
      {resolved.zoneBoundaries && (
        <>
          <div className="map-zone zone-a" />
          <div className="map-zone zone-b" />
        </>
      )}
      {resolved.hotspotZones &&
        hotspotSpots.map((spot, i) => (
          <div
            key={`hotspot-${i}`}
            className={`map-hotspot ${spot.warn ? 'map-hotspot-warn' : ''}`}
            style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
            aria-hidden="true"
          />
        ))}
      {resolved.routeOverlay && (
        <svg className="route-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline className="route-line route-line-ghost" points="12,84 30,66 48,52 62,34 84,22" />
          <polyline className="route-line route-line-main" points="8,72 26,60 44,64 62,44 78,30 92,26" />
          <polyline className="route-line route-line-alt" points="20,20 34,38 52,44 70,66 88,74" />
        </svg>
      )}
      {resolved.markers &&
        mapMarkers.map((marker, i) => (
          <button
            key={i}
            className={`map-node ${marker.tone}`}
            style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
            aria-label={marker.ref ? `Open incident ${marker.ref} — ${marker.place}` : 'Unregistered demo signal — open incident queue'}
            onClick={() => router.push(marker.ref ? `/incidents/${marker.ref}` : '/incidents')}
          ><span /></button>
        ))}
      <div className="map-label label-one">AMBATTUR<br /><small>INDUSTRIAL AREA / Z07</small></div>
      <div className="map-label label-two">PERAMBUR<br /><small>MARKET ROAD / Z03</small></div>
      <div className="map-label label-three">GUINDY<br /><small>SERVICE ROAD / Z12</small></div>
      <div className="map-coords">13°06&apos;52.9&quot;N<br />80°09&apos;17.3&quot;E<br />GRID / 44.61<br />DEMO GRID</div>
      <div className="map-legend">
        <span><i className="dot orange" />HIGH RISK</span>
        <span><i className="dot yellow" />ACTIVE</span>
        <span><i className="dot lime" />VERIFIED</span>
        <span><i className="dot cobalt" />ROUTE</span>
      </div>
    </div>
  )
}

function MapPanel({ routes = false }: { routes?: boolean }) {
  return (
    <section className="panel map-panel">
      <div className="panel-head">
        <div><div className="eyebrow">GEOSPATIAL INTELLIGENCE / DEMO GRID</div><h2>City signal map</h2></div>
        <Link href="/map" className="icon-button" aria-label="Open full city map"><ArrowUpRight /></Link>
      </div>
      <MapCanvas routes={routes} />
      <div className="map-footer">
        <span><span className="pulse" /> 9 ACTIVE TEAMS IN FIELD</span>
        <Link href="/map">OPEN FULL MAP <ArrowUpRight /></Link>
      </div>
    </section>
  )
}

function SignalStream() {
  return (
    <section className="panel activity-panel">
      <div className="panel-head">
        <div><div className="eyebrow">SYSTEM TELEMETRY / DEMO STREAM</div><h2>Live signal stream</h2></div>
        <span className="live-tag"><span className="pulse" /> DEMO</span>
      </div>
      <div className="feed">
        {feed.map(([time, agent, text, tone]) => (
          <div className="feed-row" key={time}>
            <time>{time}</time>
            <div className={`feed-marker ${tone}`} />
            <div><strong>{agent}</strong><p>{text}</p></div>
          </div>
        ))}
      </div>
      <Link href="/agents" className="panel-link">VIEW AGENT NETWORK <ArrowUpRight /></Link>
    </section>
  )
}

const STATUS_META: Record<IncidentStatus, { label: string; chip: string }> = {
  reported: { label: 'REPORTED', chip: 'reported' },
  triaged: { label: 'TRIAGED', chip: 'triaged' },
  in_progress: { label: 'IN PROGRESS', chip: 'in_progress' },
  resolved: { label: 'RESOLVED', chip: 'resolved' },
}

const SEVERITY_TONE: Record<IncidentSeverity, string> = {
  HIGH: 'orange',
  MED: 'yellow',
  LOW: 'cobalt',
}

function formatWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date
    .toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    .toUpperCase()
}

function failureCopy(failure: IncidentFailure): { title: string; body: string } {
  switch (failure.kind) {
    case 'not_configured':
      return {
        title: 'DATABASE NOT CONFIGURED',
        body: 'This server has no DATABASE_URL configured, so incidents cannot be saved or loaded yet. Copy .env.example to .env, set your PostgreSQL connection string, run `pnpm db:migrate`, and restart the server.',
      }
    case 'unavailable':
      return {
        title: 'DATABASE UNAVAILABLE',
        body: 'The incident database is not responding. Nothing was loaded or saved — please retry in a moment.',
      }
    case 'not_found':
      return { title: 'NOT FOUND', body: failure.message }
    case 'server_error':
      return { title: 'SERVER ERROR', body: failure.message }
    default:
      return { title: 'REQUEST REJECTED', body: failure.message }
  }
}

function IncidentRowLink({ incident }: { incident: IncidentDto }) {
  return (
    <Link href={`/incidents/${incident.ref}`} className="incident-row">
      <div className={`incident-icon ${SEVERITY_TONE[incident.severity]}`}><Crosshair /></div>
      <div className="incident-main">
        <strong>{incident.ref} / {incident.title}</strong>
        <span>{incident.location} — {formatWhen(incident.createdAt)}</span>
      </div>
      <div className="incident-type">{incident.category}</div>
      <div className={`severity ${incident.severity.toLowerCase()}`}>{incident.severity}</div>
      <div className={`incident-status ${STATUS_META[incident.status].chip}`}>{STATUS_META[incident.status].label}</div>
      <ChevronRight />
    </Link>
  )
}

function IncidentRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="skeleton-row" key={index}>
          <span className="skeleton-bar skeleton-icon" />
          <span className="skeleton-bar skeleton-main" />
          <span className="skeleton-bar skeleton-short" />
        </div>
      ))}
    </div>
  )
}

function IncidentListState({
  failure,
  onRetry,
}: {
  failure: IncidentFailure
  onRetry?: () => void
}) {
  const copy = failureCopy(failure)
  return (
    <div className="list-state" role="alert">
      <span className="demo-chip">PERSISTENCE / ERROR STATE</span>
      <strong>{copy.title}</strong>
      <p>{copy.body}</p>
      {onRetry && (
        <button type="button" className="button button-outline" onClick={onRetry}>
          RETRY <RotateCcw />
        </button>
      )}
    </div>
  )
}

function IncidentQueue() {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [items, setItems] = useState<IncidentDto[]>([])
  const [failure, setFailure] = useState<IncidentFailure | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    setPhase('loading')
    fetchIncidents({ limit: 5 }).then((result) => {
      if (cancelled) return
      if (result.ok) {
        setItems(result.data.incidents)
        setPhase('ready')
      } else {
        setFailure(result.failure)
        setPhase('error')
      }
    })
    return () => {
      cancelled = true
    }
  }, [reloadToken])

  return (
    <section className="panel incident-panel">
      <div className="panel-head">
        <div>
          <div className="eyebrow">
            {phase === 'ready' ? `PRIORITY QUEUE / ${items.length} PERSISTED RECORDS` : 'PRIORITY QUEUE / DATABASE RECORDS'}
          </div>
          <h2>Incidents requiring action</h2>
        </div>
        <Link href="/incidents" className="panel-link">VIEW ALL <ArrowUpRight /></Link>
      </div>
      {phase === 'loading' && <IncidentRowsSkeleton rows={3} />}
      {phase === 'error' && failure && (
        <IncidentListState failure={failure} onRetry={() => setReloadToken((token) => token + 1)} />
      )}
      {phase === 'ready' && items.length === 0 && (
        <div className="list-state">
          <span className="demo-chip">PERSISTENCE / EMPTY</span>
          <strong>NO REPORTS SAVED YET</strong>
          <p>No incidents exist in the database. Submit the intake form to create the first persistent record.</p>
          <Link href="/incidents/new" className="button button-lime"><Plus /> REPORT NEW INCIDENT</Link>
        </div>
      )}
      {phase === 'ready' && items.length > 0 && (
        <div className="incident-list">
          {items.map((incident) => <IncidentRowLink key={incident.ref} incident={incident} />)}
        </div>
      )}
    </section>
  )
}

function EvidenceScene({ clean = false, stamp }: { clean?: boolean; stamp: string }) {
  return (
    <div className={`scene ${clean ? 'scene-clean' : ''}`}>
      <div className="scene-sky" />
      <div className="scene-road" />
      {!clean && <><span className="blob b1" /><span className="blob b2" /><span className="blob b3" /><span className="blob b4" /></>}
      {clean && <span className="scene-check"><Check /></span>}
      <span className="scene-stamp">{stamp}</span>
      <span className="scene-crosshair" />
    </div>
  )
}

function CommandCenter() {
  return (
    <Shell active="/dashboard" title="Command center" eyebrow="DEMO OPERATIONS / CHENNAI">
      <div className="dashboard-wrap">
        <section className="hero-strip">
          <div className="hero-copy">
            <span className="signal-line"><span className="pulse" /> CITY OPERATIONS ROOM / RUNNING</span>
            <h2>CITY WASTE<br />INTELLIGENCE</h2>
            <p className="hero-flow">REAL-TIME DETECTION <b>→</b> ANALYSIS <b>→</b> ACTION <b>→</b> VERIFICATION</p>
          </div>
          <div className="hero-hud">
            <div className="hud-row"><span>SYSTEM STATUS</span><strong>ONLINE</strong></div>
            <div className="hud-row"><span>DATA MODE</span><strong>DEMO / SIMULATED</strong></div>
            <div className="hud-row"><span>AI AGENTS</span><strong>07</strong></div>
            <div className="hud-row"><span>LIVE INCIDENTS</span><strong>128</strong></div>
            <div className="hud-row"><span>GRID</span><strong>13.0827° N / 80.2707° E</strong></div>
          </div>
        </section>

        <div className="metrics-note"><span className="demo-chip">DEMO DATASET / SIMULATED FIGURES — NOT LIVE MUNICIPAL DATA</span></div>

        <div className="metrics">
          <Metric lead value="128" label="ACTIVE INCIDENTS" change="+18 TODAY / 41 UNASSIGNED" tone="orange" />
          <Metric value="37" label="HOTSPOTS" change="09 CRITICAL / RECURRING" tone="yellow" />
          <Metric value="14" label="CREWS ACTIVE" change="ALPHA / BRAVO / DELTA" tone="cobalt" />
          <Metric value="92%" label="VERIFICATION RATE" change="+3.8% VS LAST MONTH" tone="lime" />
        </div>

        <div className="dashboard-grid">
          <MapPanel />
          <SignalStream />
        </div>
        <IncidentQueue />
      </div>
    </Shell>
  )
}

function Pipeline() {
  const [stage, setStage] = useState(4)
  const stages: [string, string, string][] = [
    ['OBSERVE', 'Street imagery captured', 'done'],
    ['UNDERSTAND', 'Materials classified', 'done'],
    ['ASSESS', 'Risk score computed', 'done'],
    ['PREDICT', 'Model timeout / auto-retry queued', 'failed'],
    ['PLAN', 'Cleanup strategy generated', 'active'],
    ['ACT', 'Crew dispatched to zone', 'idle'],
    ['VERIFY', 'Before / after evidence diff', 'idle'],
    ['LEARN', 'Hotspot intelligence updated', 'idle'],
  ]
  return (
    <section id="pipeline" className="pipeline-section">
      <div className="section-kicker"><span>01 / THE AI PIPELINE</span><span>OBSERVE → LEARN / HOVER TO INSPECT</span></div>
      <div className="pipeline-grid">
        {stages.map(([name, text, state], i) => (
          <button
            key={name}
            className={`pipeline-stage ${state} ${stage === i ? 'selected' : ''}`}
            onMouseEnter={() => setStage(i)}
            onFocus={() => setStage(i)}
            onClick={() => setStage(i)}
          >
            <span className="stage-index">0{i + 1}</span>
            <span className="stage-state">{state === 'done' ? 'COMPLETE' : state === 'failed' ? 'FAILED' : state === 'active' ? 'ACTIVE' : 'QUEUED'}</span>
            <strong>{name}</strong>
            <p>{text}</p>
          </button>
        ))}
      </div>
      <div className="pipeline-output"><span className="pulse" /> ACTIVE STAGE / {stages[stage][0]} — {stages[stage][1]}</div>
    </section>
  )
}

function Landing() {
  const [paletteOpen, setPaletteOpen] = useState(false)
  usePaletteHotkey(setPaletteOpen)
  return (
    <main className="landing">
      <header className="landing-nav">
        <Link href="/" className="brand"><Logo /><span><strong>WASTEX</strong><small>AI WASTE INTELLIGENCE SYSTEM</small></span></Link>
        <div className="landing-meta">
          <span className="landing-status"><span className="pulse" /> SYSTEM STATUS: ONLINE</span>
          <span className="landing-status">AI AGENTS: 07</span>
          <span className="landing-status">LIVE INCIDENTS: 128</span>
          <button className="search-btn" onClick={() => setPaletteOpen(true)} aria-label="Search commands"><Search /><span>⌘ K</span></button>
          <Link href="/dashboard" className="button button-lime">OPEN COMMAND CENTER <ArrowUpRight /></Link>
        </div>
      </header>

      <section className="landing-hero">
        <div className="hero-copy">
          <div className="eyebrow">AI WASTE INTELLIGENCE / OPERATIONS SYSTEM</div>
          <h1>WASTE<br />IS DATA.<br /><span>TURN IT INTO ACTION.</span></h1>
          <p>WASTEX uses AI to detect waste, understand patterns, coordinate operations and verify results.</p>
          <div className="hero-actions">
            <Link href="/dashboard" className="button button-lime">OPEN COMMAND CENTER <ArrowUpRight /></Link>
            <a href="#pipeline" className="button button-outline">SEE HOW IT WORKS <ChevronRight /></a>
          </div>
          <div className="hero-flow hero-flow-landing">CHAOS <b>→</b> INTELLIGENCE <b>→</b> ACTION <b>→</b> VERIFICATION</div>
          <div className="hero-note"><span className="pulse" /> LIVE DEMO MODE <span>/</span> CHENNAI / INDIA <span>/</span> 13.0827° N, 80.2707° E</div>
        </div>

        <div className="hero-visual">
          <div className="visual-top"><span>WX / SIGNAL FIELD / 001</span><span>AI PROCESSING <span className="pulse" /></span></div>
          <div className="signal-field">
            {Array.from({ length: 42 }).map((_, i) => <i key={i} style={{ left: `${(i * 37) % 93}%`, top: `${(i * 61) % 84}%`, animationDelay: `${(i % 8) * 0.18}s` }} />)}
            <div className="signal-ring ring-a" />
            <div className="signal-ring ring-b" />
            <div className="visual-core"><Logo /><strong>WASTEX</strong><small>OPERATIONAL INTELLIGENCE</small></div>
            <div className="signal-label sl-a">+ INCIDENTS / 128</div>
            <div className="signal-label sl-b">+ HOTSPOTS / 37</div>
            <div className="signal-label sl-c">+ CREWS / 14</div>
          </div>
          <div className="visual-bottom"><span>DETECT</span><span>DECIDE</span><span>DISPATCH</span><span>VERIFY</span></div>
        </div>
      </section>

      <Pipeline />

      <section className="landing-proof">
        <div>
          <span className="eyebrow">END OF PIPELINE / OUTPUT</span>
          <h2>CHAOS IN.<br />INTELLIGENCE OUT.</h2>
          <p className="proof-note">Every street signal becomes classified data, an operational decision, a dispatched crew and verified proof.</p>
        </div>
        <div className="proof-grid">
          <div><strong>01</strong><span>SEE THE WASTE</span><p>Vision models turn street-level evidence into structured data.</p></div>
          <div><strong>02</strong><span>TRACE THE PATTERN</span><p>Risk and hotspot intelligence surfaces what repeats.</p></div>
          <div><strong>03</strong><span>MOVE THE TEAM</span><p>Operations, routing and verification close the loop.</p></div>
        </div>
      </section>

      <footer className="landing-footer"><span>WASTEX / AI OPERATING SYSTEM FOR URBAN WASTE</span><span>DEMO DATA / NOT REAL-TIME MUNICIPAL DATA</span></footer>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </main>
  )
}

function VisionModule() {
  return (
    <div className="vision-grid">
      <section className="panel vision-stage">
        <div className="panel-head">
          <div><div className="eyebrow">EVIDENCE / DEMO FRAME 00421-A</div><h2>Street capture</h2></div>
          <span className="live-tag live-tag-blue"><span className="pulse" /> DEMO / SIMULATED ANALYSIS</span>
        </div>
        <div className="vision-canvas">
          <EvidenceScene stamp="FRAME 00421-A / 10:42:08" />
          <div className="det-box det-a"><span>PLASTIC 92%</span></div>
          <div className="det-box det-b"><span>ORGANIC 81%</span></div>
          <div className="det-box det-c"><span>HAZARDOUS 67%</span></div>
          <div className="vision-scan" />
        </div>
      </section>
      <section className="panel vision-side">
        <div className="panel-head"><div><div className="eyebrow">CLASSIFICATION OUTPUT / DEMO FIXTURE</div><h2>Material breakdown</h2></div></div>
        <div className="bar-list">
          {[['PLASTIC', 92, 'cobalt'], ['ORGANIC', 81, 'lime'], ['CONSTRUCTION', 74, 'yellow'], ['HAZARDOUS', 67, 'red'], ['PAPER / CARDBOARD', 41, 'purple']].map(([label, value, tone]) => (
            <div className="bar-row" key={String(label)}>
              <div className="bar-meta"><strong>{label}</strong><span>{value}%</span></div>
              <div className="bar-track"><i className={`bar-fill tone-${tone}`} style={{ width: `${value}%` }} /></div>
            </div>
          ))}
        </div>
        <div className="vision-agent-card">
          <span className="mono-label">VISION AGENT / WX-V01 / DEMO</span>
          <strong>STATIC DEMO CLASSIFICATION</strong>
          <p>Fixture frame 00421-A. No model inference runs in this build — live vision arrives with the AI phase.</p>
        </div>
      </section>
    </div>
  )
}

const STATUS_TONE: Record<IncidentStatus, string> = {
  reported: 'orange',
  triaged: 'yellow',
  in_progress: 'cobalt',
  resolved: 'lime',
}

function IncidentRecordModule({ incident }: { incident: IncidentDto }) {
  const statusMeta = STATUS_META[incident.status]
  const coords =
    incident.latitude !== null && incident.longitude !== null
      ? `${incident.latitude.toFixed(4)}, ${incident.longitude.toFixed(4)}`
      : null

  return (
    <div className="forensic">
      <section className="panel">
        <div className="panel-head">
          <div><div className="eyebrow">FORENSIC WORKSPACE / PERSISTENT RECORD</div><h2>{incident.ref}</h2></div>
          <span className={`severity ${incident.severity.toLowerCase()}`}>SEVERITY: {incident.severity}</span>
        </div>
        <div className="forensic-grid">
          <div className="forensic-col evidence-col">
            <span className="mono-label">01 / LOCATION + EVIDENCE</span>
            <div className="no-media">
              <Crosshair />
              <strong>{incident.location}</strong>
              <p>{coords ? `COORDS ${coords}` : 'NO COORDINATES PROVIDED'}</p>
            </div>
            <div className="evidence-meta">
              <span>SOURCE: CITIZEN REPORT</span>
              <span>{formatWhen(incident.createdAt)}</span>
            </div>
            <p className="field-hint">No photo is attached to this record — image capture and storage arrive in a later phase.</p>
          </div>
          <div className="forensic-col detect-col">
            <span className="mono-label">02 / REPORTED DETAILS</span>
            <div className="record-details">
              <h3>{incident.title}</h3>
              <p>{incident.description || 'No additional description was provided with this report.'}</p>
            </div>
            <div className="det-list">
              <div className="det-row"><span className={`det-swatch tone-${SEVERITY_TONE[incident.severity]}`} /><strong>{incident.category.toUpperCase()}</strong><span className="det-pct">{incident.severity}</span></div>
            </div>
            <div className="detect-note">
              <Sparkles />
              <p>AI classification does not run in this phase — category and severity are exactly what the reporter submitted.</p>
            </div>
          </div>
          <div className="forensic-col intel-col">
            <span className="mono-label">03 / INCIDENT RECORD</span>
            <div className="intel-list">
              <div><span>REFERENCE</span><strong>{incident.ref}</strong></div>
              <div><span>RECORD ID</span><strong>#{String(incident.id).padStart(5, '0')}</strong></div>
              <div><span>SEVERITY</span><strong className="tone-orange">{incident.severity}</strong></div>
              <div><span>CATEGORY</span><strong>{incident.category.toUpperCase()}</strong></div>
              <div><span>STATUS</span><strong className={`tone-${STATUS_TONE[incident.status]}`}>{statusMeta.label}</strong></div>
              <div><span>LOCATION</span><strong>{incident.location}</strong></div>
              <div><span>REPORTED</span><strong>{formatWhen(incident.createdAt)}</strong></div>
              <div><span>UPDATED</span><strong>{formatWhen(incident.updatedAt)}</strong></div>
              <div><span>RESOLVED</span><strong>{incident.resolvedAt ? formatWhen(incident.resolvedAt) : '—'}</strong></div>
            </div>
            <Link href="/incidents" className="button button-block">BACK TO INCIDENT QUEUE <ArrowUpRight /></Link>
          </div>
        </div>
      </section>
      <IncidentQueue />
    </div>
  )
}

function IncidentNotFound({ incidentRef, failure }: { incidentRef: string; failure: IncidentFailure | null }) {
  const copy = failure ? failureCopy(failure) : null
  return (
    <section className="panel">
      <div className="panel-head">
        <div><div className="eyebrow">LOOKUP FAILED / NO MATCHING RECORD</div><h2>Incident not found</h2></div>
        <span className="demo-chip">DATABASE RECORDS ONLY</span>
      </div>
      <div className="notfound-body">
        <p>
          No incident exists with reference <strong>{incidentRef}</strong>. References are generated when a report is
          saved and look like <strong>WX-1042</strong>. Demo fixtures are not served from this route — they are
          development data only.
        </p>
        {copy && <p>{copy.body}</p>}
        <div className="boundary-actions">
          <Link href="/incidents" className="button button-outline">BROWSE INCIDENT QUEUE <ArrowUpRight /></Link>
          <Link href="/incidents/new" className="button button-lime"><Plus /> REPORT NEW INCIDENT</Link>
        </div>
      </div>
    </section>
  )
}

function IncidentListPage() {
  const limit = 12
  const [status, setStatus] = useState<IncidentStatus | ''>('')
  const [items, setItems] = useState<IncidentDto[]>([])
  const [total, setTotal] = useState(0)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [failure, setFailure] = useState<IncidentFailure | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreFailure, setMoreFailure] = useState<IncidentFailure | null>(null)

  useEffect(() => {
    let cancelled = false
    setPhase('loading')
    setMoreFailure(null)
    fetchIncidents({ limit, offset: 0, status: status || undefined }).then((result) => {
      if (cancelled) return
      if (result.ok) {
        setItems(result.data.incidents)
        setTotal(result.data.meta.total)
        setPhase('ready')
      } else {
        setFailure(result.failure)
        setPhase('error')
      }
    })
    return () => {
      cancelled = true
    }
  }, [status, reloadToken])

  const loadMore = async () => {
    setLoadingMore(true)
    setMoreFailure(null)
    const result = await fetchIncidents({ limit, offset: items.length, status: status || undefined })
    if (result.ok) {
      setItems((current) => [...current, ...result.data.incidents])
      setTotal(result.data.meta.total)
    } else {
      setMoreFailure(result.failure)
    }
    setLoadingMore(false)
  }

  return (
    <Shell active="/incidents" title="Incident intelligence" eyebrow="INVESTIGATION / PERSISTENT RECORDS">
      <div className="workspace-wrap">
        <div className="workspace-hero tone-orange">
          <div>
            <span className="signal-line"><span className="pulse" /> INVESTIGATION / POSTGRESQL RECORDS</span>
            <h2>Incident register</h2>
            <p>Every report submitted through WASTEX is stored in PostgreSQL and served by the incidents API. Rows open the full record for that reference.</p>
          </div>
          <div className="workspace-code">WX/INCIDENTS<br />POSTGRES / LIVE<br />API / V1</div>
        </div>
        <section className="panel incident-panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">
                {phase === 'ready' ? `${total} RECORDS / SHOWING ${items.length}` : 'DATABASE RECORDS / LOADING'}
              </div>
              <h2>All incidents</h2>
            </div>
            <div className="panel-head-actions">
              <label className="list-filter">
                <span>STATUS</span>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as IncidentStatus | '')}
                  aria-label="Filter incidents by status"
                >
                  <option value="">ALL STATUSES</option>
                  {INCIDENT_STATUSES.map((option) => (
                    <option key={option} value={option}>{STATUS_META[option].label}</option>
                  ))}
                </select>
              </label>
              <Link href="/incidents/new" className="button button-lime"><Plus /> NEW INCIDENT</Link>
            </div>
          </div>

          {phase === 'loading' && <IncidentRowsSkeleton rows={4} />}
          {phase === 'error' && failure && (
            <IncidentListState failure={failure} onRetry={() => setReloadToken((token) => token + 1)} />
          )}
          {phase === 'ready' && items.length === 0 && (
            <div className="list-state">
              <span className="demo-chip">PERSISTENCE / EMPTY RESULT</span>
              <strong>NO INCIDENTS MATCH THIS VIEW</strong>
              <p>
                {status
                  ? `No stored incident currently has the status "${STATUS_META[status].label}".`
                  : 'The database contains no incident reports yet.'}
              </p>
              <Link href="/incidents/new" className="button button-lime"><Plus /> REPORT NEW INCIDENT</Link>
            </div>
          )}
          {phase === 'ready' && items.length > 0 && (
            <>
              <div className="incident-list">
                {items.map((incident) => <IncidentRowLink key={incident.ref} incident={incident} />)}
              </div>
              <div className="list-foot">
                <span className="mono-label">SHOWING {items.length} OF {total}</span>
                {items.length < total && (
                  <button type="button" className="button button-outline" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? 'LOADING…' : 'LOAD MORE'} <RotateCcw />
                  </button>
                )}
              </div>
              {moreFailure && <IncidentListState failure={moreFailure} onRetry={loadMore} />}
            </>
          )}
        </section>
        <SignalStream />
      </div>
    </Shell>
  )
}

function IncidentDetailPage({ incidentRef }: { incidentRef: string }) {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'not_found' | 'error'>('loading')
  const [incident, setIncident] = useState<IncidentDto | null>(null)
  const [failure, setFailure] = useState<IncidentFailure | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    setPhase('loading')
    fetchIncident(incidentRef).then((result) => {
      if (cancelled) return
      if (result.ok) {
        setIncident(result.data.incident)
        setFailure(null)
        setPhase('ready')
        return
      }
      setFailure(result.failure)
      setPhase(result.failure.kind === 'not_found' ? 'not_found' : 'error')
    })
    return () => {
      cancelled = true
    }
  }, [incidentRef, reloadToken])

  const resolved = phase === 'ready' && incident
  const eyebrow = resolved
    ? 'INVESTIGATION / PERSISTENT RECORD'
    : phase === 'not_found'
      ? 'INVESTIGATION / REFERENCE NOT FOUND'
      : phase === 'error'
        ? 'INVESTIGATION / DATABASE ERROR'
        : 'INVESTIGATION / LOADING RECORD'

  return (
    <Shell active="/incidents" title={resolved ? `Incident ${incident.ref}` : 'Incident lookup'} eyebrow={eyebrow}>
      <div className="workspace-wrap">
        <div className={`workspace-hero tone-${resolved ? SEVERITY_TONE[incident.severity] : 'yellow'}`}>
          <div>
            <span className="signal-line">
              <span className="pulse" /> {resolved ? 'FORENSIC WORKSPACE / DATABASE RECORD' : eyebrow}
            </span>
            <h2>{resolved ? incident.title : `Unknown / ${incidentRef}`}</h2>
            <p>
              {resolved
                ? `${incident.category} reported at ${incident.location} — saved to PostgreSQL on ${formatWhen(incident.createdAt)}.`
                : phase === 'loading'
                  ? `Fetching reference ${incidentRef} from the incidents API…`
                  : 'This reference does not match any stored incident report.'}
            </p>
          </div>
          <div className="workspace-code">
            {resolved ? `WX/${incident.ref}` : phase === 'loading' ? 'WX/…' : 'WX/404'}
            <br />{resolved ? incident.status.replace('_', ' ').toUpperCase() : 'NO MATCH'}
            <br />{resolved ? incident.severity : '—'}
          </div>
        </div>

        {phase === 'loading' && (
          <section className="panel">
            <div className="panel-head">
              <div><div className="eyebrow">DATABASE READ / IN PROGRESS</div><h2>Loading {incidentRef}</h2></div>
              <span className="live-tag"><span className="pulse" /> FETCHING</span>
            </div>
            <IncidentRowsSkeleton rows={2} />
          </section>
        )}
        {phase === 'not_found' && <IncidentNotFound incidentRef={incidentRef} failure={failure} />}
        {phase === 'error' && failure && (
          <section className="panel">
            <div className="panel-head">
              <div><div className="eyebrow">DATABASE READ / FAILED</div><h2>Record unavailable</h2></div>
              <span className="demo-chip">PERSISTENCE / ERROR STATE</span>
            </div>
            <IncidentListState failure={failure} onRetry={() => setReloadToken((token) => token + 1)} />
          </section>
        )}
        {phase === 'ready' && incident && <IncidentRecordModule incident={incident} />}
      </div>
    </Shell>
  )
}

type IntakeValues = {
  title: string
  category: string
  severity: IncidentSeverity | ''
  location: string
  latitude: string
  longitude: string
}

type IntakeErrors = Partial<Record<keyof IntakeValues, string>>

const EMPTY_INTAKE: IntakeValues = { title: '', category: '', severity: '', location: '', latitude: '', longitude: '' }

function validateIntake(values: IntakeValues): IntakeErrors {
  const errors: IntakeErrors = {}
  const title = values.title.trim()
  if (title.length < 8) errors.title = 'Enter a short description of at least 8 characters.'
  else if (title.length > 160) errors.title = 'Title must be 160 characters or fewer.'
  if (!values.category) errors.category = 'Select a waste category.'
  if (!values.severity) errors.severity = 'Select a severity level.'
  const location = values.location.trim()
  if (location.length < 3) errors.location = 'Enter a location or address.'
  else if (location.length > 300) errors.location = 'Location must be 300 characters or fewer.'
  const lat = values.latitude.trim()
  const lng = values.longitude.trim()
  if (lat !== '') {
    const parsed = Number(lat)
    if (!Number.isFinite(parsed) || parsed < -90 || parsed > 90) errors.latitude = 'Latitude must be a number between −90 and 90.'
  }
  if (lng !== '') {
    const parsed = Number(lng)
    if (!Number.isFinite(parsed) || parsed < -180 || parsed > 180) errors.longitude = 'Longitude must be a number between −180 and 180.'
  }
  if (!errors.latitude && !errors.longitude && (lat === '') !== (lng === '')) {
    if (lat === '') errors.latitude = 'Latitude and longitude must be provided together.'
    else errors.longitude = 'Latitude and longitude must be provided together.'
  }
  return errors
}

function IncidentIntakeForm() {
  const [values, setValues] = useState<IntakeValues>(EMPTY_INTAKE)
  const [errors, setErrors] = useState<IntakeErrors>({})
  const [submitState, setSubmitState] = useState<'editing' | 'saving' | 'saved' | 'error'>('editing')
  const [saved, setSaved] = useState<IncidentDto | null>(null)
  const [failure, setFailure] = useState<IncidentFailure | null>(null)
  const [fileNames, setFileNames] = useState<string[]>([])
  const [attempted, setAttempted] = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)

  const errorCount = Object.keys(errors).length

  const focusStatus = () => window.requestAnimationFrame(() => statusRef.current?.focus())

  const update = (key: keyof IntakeValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }))
    if (attempted) {
      setErrors(validateIntake({ ...values, [key]: value }))
    }
    if (submitState !== 'saving') setSubmitState('editing')
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validateIntake(values)
    setAttempted(true)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setSubmitState('editing')
      focusStatus()
      return
    }

    setSubmitState('saving')
    setFailure(null)

    const result = await createIncident({
      title: values.title.trim(),
      category: values.category as WasteCategory,
      severity: values.severity as IncidentSeverity,
      location: values.location.trim(),
      latitude: values.latitude.trim() === '' ? null : Number(values.latitude),
      longitude: values.longitude.trim() === '' ? null : Number(values.longitude),
    })

    if (result.ok) {
      setSaved(result.data.incident)
      setSubmitState('saved')
      focusStatus()
      return
    }

    setFailure(result.failure)
    if (result.failure.details && result.failure.details.length > 0) {
      setErrors((current) => {
        const merged: IntakeErrors = { ...current }
        for (const detail of result.failure.details!) {
          if (detail.field in EMPTY_INTAKE) {
            merged[detail.field as keyof IntakeValues] = detail.message
          }
        }
        return merged
      })
    }
    setSubmitState('error')
    focusStatus()
  }

  const handleReset = () => {
    setValues(EMPTY_INTAKE)
    setErrors({})
    setFileNames([])
    setAttempted(false)
    setSaved(null)
    setFailure(null)
    setSubmitState('editing')
  }

  const failureCopyText = failure ? failureCopy(failure) : null

  return (
    <form className="intake-form" onSubmit={handleSubmit} noValidate aria-labelledby="intake-title">
      {attempted && errorCount > 0 && submitState === 'editing' && (
        <div className="form-alert" role="alert" tabIndex={-1} ref={statusRef}>
          <AlertTriangle />
          FORM NOT SUBMITTED — {errorCount} {errorCount === 1 ? 'FIELD NEEDS' : 'FIELDS NEED'} ATTENTION.
        </div>
      )}

      {submitState === 'saving' && (
        <div className="form-notice" role="status" tabIndex={-1} ref={statusRef}>
          <strong>SAVING REPORT…</strong>
          <p>Sending this report to POST /api/incidents. Keep this page open until the save completes.</p>
        </div>
      )}

      {submitState === 'error' && failure && failureCopyText && (
        <div className="form-alert form-alert-stack" role="alert" tabIndex={-1} ref={statusRef}>
          <AlertTriangle />
          <div>
            <strong>{failureCopyText.title}</strong>
            <p>{failureCopyText.body}</p>
            {failure.details && failure.details.length > 0 && (
              <ul>
                {failure.details.map((detail) => (
                  <li key={`${detail.field}-${detail.message}`}>{detail.field}: {detail.message}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {submitState === 'saved' && saved && (
        <div className="form-notice form-success" role="status" tabIndex={-1} ref={statusRef}>
          <strong>REPORT SAVED — {saved.ref}</strong>
          <p>
            This incident was written to PostgreSQL and will still be there after a refresh. It is now served by the
            incidents API like any other stored record.
          </p>
          <dl>
            <dt>REFERENCE</dt><dd>{saved.ref}</dd>
            <dt>TITLE</dt><dd>{saved.title}</dd>
            <dt>CATEGORY</dt><dd>{saved.category}</dd>
            <dt>SEVERITY</dt><dd>{saved.severity}</dd>
            <dt>STATUS</dt><dd>{STATUS_META[saved.status].label}</dd>
            <dt>LOCATION</dt><dd>{saved.location}</dd>
            {(saved.latitude !== null && saved.longitude !== null) && (
              <><dt>COORDS</dt><dd>{saved.latitude}, {saved.longitude}</dd></>
            )}
            <dt>SAVED</dt><dd>{formatWhen(saved.createdAt)}</dd>
            {fileNames.length > 0 && (<><dt>PHOTOS</dt><dd>{fileNames.length} file(s) held in browser only — not uploaded</dd></>)}
          </dl>
          <div className="boundary-actions">
            <Link href={`/incidents/${saved.ref}`} className="button button-lime">VIEW SAVED INCIDENT <ArrowUpRight /></Link>
            <button type="button" className="button button-outline" onClick={handleReset}>
              REPORT ANOTHER <RotateCcw />
            </button>
          </div>
        </div>
      )}

      <div className="intake-grid">
        <div className="field field-span">
          <label htmlFor="intake-title">TITLE / SHORT DESCRIPTION *</label>
          <input
            id="intake-title"
            name="title"
            type="text"
            value={values.title}
            onChange={(event) => update('title', event.target.value)}
            placeholder="MIXED WASTE BLOCKING DRAIN / SERVICE ROAD"
            aria-required="true"
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={errors.title ? 'intake-title-error' : undefined}
          />
          {errors.title && <p className="field-error" id="intake-title-error">{errors.title}</p>}
        </div>

        <div className="field">
          <label htmlFor="intake-category">WASTE CATEGORY *</label>
          <select
            id="intake-category"
            name="category"
            value={values.category}
            onChange={(event) => update('category', event.target.value)}
            aria-required="true"
            aria-invalid={errors.category ? true : undefined}
            aria-describedby={errors.category ? 'intake-category-error' : undefined}
          >
            <option value="">SELECT CATEGORY</option>
            {WASTE_CATEGORIES.map((category) => (
              <option key={category} value={category}>{category.toUpperCase()}</option>
            ))}
          </select>
          {errors.category && <p className="field-error" id="intake-category-error">{errors.category}</p>}
        </div>

        <fieldset className="field severity-field" aria-invalid={errors.severity ? true : undefined} aria-describedby={errors.severity ? 'intake-severity-error' : undefined}>
          <legend>SEVERITY *</legend>
          <div className="severity-group">
            {SEVERITY_OPTIONS.map((option) => (
              <label className="severity-option" key={option}>
                <input
                  type="radio"
                  name="severity"
                  value={option}
                  checked={values.severity === option}
                  onChange={() => update('severity', option)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
          {errors.severity && <p className="field-error" id="intake-severity-error">{errors.severity}</p>}
        </fieldset>

        <div className="field field-span">
          <label htmlFor="intake-location">LOCATION / ADDRESS *</label>
          <input
            id="intake-location"
            name="location"
            type="text"
            value={values.location}
            onChange={(event) => update('location', event.target.value)}
            placeholder="STREET, AREA, ZONE — E.G. AMBATTUR INDUSTRIAL AREA / ZONE 07"
            aria-required="true"
            aria-invalid={errors.location ? true : undefined}
            aria-describedby={errors.location ? 'intake-location-error' : undefined}
          />
          {errors.location && <p className="field-error" id="intake-location-error">{errors.location}</p>}
        </div>

        <div className="field">
          <label htmlFor="intake-latitude">LATITUDE (OPTIONAL)</label>
          <input
            id="intake-latitude"
            name="latitude"
            type="number"
            step="any"
            min={-90}
            max={90}
            inputMode="decimal"
            value={values.latitude}
            onChange={(event) => update('latitude', event.target.value)}
            placeholder="13.0827"
            aria-invalid={errors.latitude ? true : undefined}
            aria-describedby={errors.latitude ? 'intake-latitude-error' : 'intake-coords-hint'}
          />
          {errors.latitude
            ? <p className="field-error" id="intake-latitude-error">{errors.latitude}</p>
            : <p className="field-hint" id="intake-coords-hint">Decimal degrees. Leave blank if unknown.</p>}
        </div>

        <div className="field">
          <label htmlFor="intake-longitude">LONGITUDE (OPTIONAL)</label>
          <input
            id="intake-longitude"
            name="longitude"
            type="number"
            step="any"
            min={-180}
            max={180}
            inputMode="decimal"
            value={values.longitude}
            onChange={(event) => update('longitude', event.target.value)}
            placeholder="80.2707"
            aria-invalid={errors.longitude ? true : undefined}
            aria-describedby={errors.longitude ? 'intake-longitude-error' : undefined}
          />
          {errors.longitude && <p className="field-error" id="intake-longitude-error">{errors.longitude}</p>}
        </div>

        <div className="field field-span">
          <label htmlFor="intake-photo">PHOTO ATTACHMENTS (OPTIONAL)</label>
          <input
            id="intake-photo"
            name="photo"
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => setFileNames(Array.from(event.target.files ?? []).map((file) => file.name))}
            aria-describedby="intake-photo-hint"
          />
          <p className="field-hint" id="intake-photo-hint">
            <Upload aria-hidden="true" size={12} style={{ verticalAlign: 'text-bottom' }} /> Photos stay in your browser — attachment upload arrives with the storage backend.
          </p>
          {fileNames.length > 0 && (
            <ul className="file-list">
              {fileNames.map((name) => <li key={name}>{name}</li>)}
            </ul>
          )}
        </div>
      </div>

      <div className="form-actions">
        <button
          type="submit"
          className="button button-lime"
          disabled={submitState === 'saving' || submitState === 'saved'}
        >
          {submitState === 'saving' ? 'SAVING REPORT…' : submitState === 'saved' ? 'REPORT SAVED' : submitState === 'error' ? 'RETRY SUBMIT' : 'SUBMIT REPORT'} <ArrowUpRight />
        </button>
        <button type="button" className="button button-outline" onClick={handleReset} disabled={submitState === 'saving'}>
          RESET FORM <RotateCcw />
        </button>
        <span className="demo-chip">SAVED VIA POST /api/incidents → POSTGRESQL</span>
      </div>
    </form>
  )
}

function IncidentIntakePage() {
  return (
    <Shell active="/incidents" title="Report incident" eyebrow="INTAKE / NEW SIGNAL">
      <div className="workspace-wrap">
        <div className="workspace-hero tone-orange">
          <div>
            <span className="signal-line"><span className="pulse" /> INTAKE / NEW SIGNAL</span>
            <h2>Report incident</h2>
            <p>Capture a street-level waste signal. Valid reports are validated by the API and saved to PostgreSQL, where they appear in the incident register.</p>
          </div>
          <div className="workspace-code">WX/INTAKE<br />ZOD + DRIZZLE<br />API / V1</div>
        </div>
        <IncidentIntakeForm />
      </div>
    </Shell>
  )
}

function HotspotModule() {
  return (
    <div className="hotspot-wrap">
      <div className="hotspot-stats">
        <div className="hot-stat hot-stat-lead"><strong>42</strong><span>PEAK RECURRENCE / AMBATTUR</span></div>
        <div className="hot-stat"><strong>37</strong><span>ACTIVE HOTSPOTS</span></div>
        <div className="hot-stat"><strong>09</strong><span>CRITICAL / RISK 0.8+</span></div>
        <div className="hot-stat"><strong>6.4d</strong><span>AVG RETURN INTERVAL</span></div>
      </div>
      <div className="hotspot-grid">
        <section className="panel">
          <div className="panel-head"><div><div className="eyebrow">PATTERN ENGINE / DEMO REGISTRY</div><h2>HOTSPOT REGISTER</h2></div><span className="demo-chip">DEMO FIXTURES</span></div>
          {DEMO_HOTSPOTS.map(({ name, count, frequency, type, risk, tone }) => (
            <div className="hot-row" key={name}>
              <div className={`hot-rank tone-${tone}`}>{String(count).padStart(2, '0')}</div>
              <div className="hot-main"><strong>{name}</strong><span>{type} / RISK {risk}</span></div>
              <div className="hot-freq"><div className="bar-track"><i className={`bar-fill tone-${tone}`} style={{ width: `${frequency}%` }} /></div><span>{frequency}% RECURRENCE</span></div>
            </div>
          ))}
        </section>
        <MapPanel />
      </div>
    </div>
  )
}

function OperationsModule() {
  const columns = [
    ['DETECTED', 'orange', [['#00421', 'AMBADTUR / MIXED', '94%'], ['#00419', 'SALIGRAMAM / ORGANIC', '88%'], ['#00418', 'ADYAR / PLASTIC', '82%']]],
    ['ASSIGNED', 'yellow', [['#00412', 'KODAMBURAKKAM / MIXED', '91%'], ['#00409', 'ROYAPETTAH / DEBRIS', '86%']]],
    ['IN PROGRESS', 'cobalt', [['#00398', 'T. NAGAR / PLASTIC', '93%'], ['#00391', 'VELACHERY / ORGANIC', '89%'], ['#00387', 'MANDAIVELI / MIXED', '84%']]],
    ['VERIFICATION', 'purple', [['#00372', 'AMBATTUR / MIXED', '96%'], ['#00368', 'PERAMBUR / ORGANIC', '90%']]],
    ['COMPLETED', 'lime', [['#00351', 'GUINDY / DEBRIS', '97%'], ['#00344', 'CHETPET / PLASTIC', '95%']]],
  ] as const
  return (
    <div className="board">
      {columns.map(([title, tone, cards]) => (
        <section className={`board-col tone-${tone}`} key={title}>
          <header className="board-col-head"><span>{title}</span><em>{String(cards.length).padStart(2, '0')}</em></header>
          {cards.map(([id, place, conf]) => (
            <article className="board-card" key={id}>
              <span className="board-strip" />
              <strong>{id}</strong>
              <p>{place}</p>
              <div className="board-meta"><span>AI {conf}</span><span><Clock /> 12M</span></div>
            </article>
          ))}
        </section>
      ))}
    </div>
  )
}

function RoutesModule() {
  const routes = [
    ['ROUTE 07', '12 INCIDENTS', '8.4 KM', 'EST. 31 MIN', 'CREW: ALPHA-04', 'URGENT MIXED WASTE / DRAIN PROXIMITY PRIORITY', 'main'],
    ['ROUTE 03', '08 INCIDENTS', '5.2 KM', 'EST. 22 MIN', 'CREW: BRAVO-03', 'MARKET CLUSTER / HIGH ORGANIC LOAD', 'alt'],
    ['ROUTE 11', '15 INCIDENTS', '11.6 KM', 'EST. 44 MIN', 'CREW: DELTA-11', 'CONSTRUCTION CORRIDOR / HEAVY DEBRIS', 'ghost'],
  ] as const
  return (
    <div className="routes-wrap">
      <div className="routes-grid">
        {routes.map(([name, count, dist, eta, crew, reason, tone]) => (
          <section className={`panel route-card route-${tone}`} key={name}>
            <div className="route-card-head"><span className="mono-label">{name}</span><span className={`route-status tone-${tone === 'main' ? 'orange' : tone === 'alt' ? 'cobalt' : 'purple'}`}>AI OPTIMIZED</span></div>
            <div className="route-nums"><strong>{dist}</strong><span>{count}</span></div>
            <div className="route-meta"><div><span>EST. TIME</span><strong>{eta.replace('EST. ', '')}</strong></div><div><span>UNIT</span><strong>{crew.replace('CREW: ', '')}</strong></div></div>
            <p className="route-reason"><Sparkles /> {reason}</p>
          </section>
        ))}
      </div>
      <section className="panel">
        <div className="panel-head"><div><div className="eyebrow">ROUTE ENGINE / DEMO OVERLAY</div><h2>Optimized route overlay</h2></div><span className="demo-chip">DEMO ROUTES</span></div>
        <MapCanvas tall routes />
        <div className="map-footer"><span>3 ROUTES / 35 INCIDENTS / 25.2 KM TOTAL</span><Link href="/map">OPEN FULL MAP <ArrowUpRight /></Link></div>
      </section>
    </div>
  )
}

function VerificationModule() {
  return (
    <div className="verify-wrap">
      <section className="panel">
        <div className="panel-head">
          <div><div className="eyebrow">CLOSURE LOOP / DEMO EVIDENCE</div><h2>BEFORE vs. AFTER</h2></div>
          <span className="verify-badge"><ShieldCheck /> INCIDENT #00372 / AMBATTUR</span>
        </div>
        <div className="verify-split">
          <div className="verify-pane">
            <div className="verify-tag">BEFORE</div>
            <EvidenceScene stamp="10:12:44 / PRE-CLEANUP" />
            <div className="verify-data"><span>WASTE INDEX</span><strong>0.91</strong></div>
          </div>
          <div className="verify-vs">VS</div>
          <div className="verify-pane">
            <div className="verify-tag verify-tag-after">AFTER</div>
            <EvidenceScene clean stamp="11:58:40 / POST-CLEANUP" />
            <div className="verify-data"><span>WASTE INDEX</span><strong>0.04</strong></div>
          </div>
        </div>
        <div className="verify-result verify-ok">
          <div><span className="mono-label">AI VERIFICATION</span><strong>CLEANUP CONFIRMED</strong></div>
          <div className="verify-score">96%<small>AREA CLEARED / 92% REDUCTION</small></div>
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><div className="eyebrow">CLOSURE QUEUE / PENDING REVIEW</div><h2>Verification status</h2></div></div>
        <div className="incident-list">
          {[['00372', 'AMBATTUR INDUSTRIAL AREA', 'CLEANUP CONFIRMED', 'ok'], ['00368', 'PERAMBUR MARKET ROAD', 'VERIFICATION REQUIRED', 'wait'], ['00351', 'GUINDY SERVICE ROAD', 'CLEANUP CONFIRMED', 'ok'], ['00344', 'CHETPET MAIN ROAD', 'IMAGE PENDING', 'wait']].map(([id, place, status, kind]) => (
            <div className="incident-row verify-row" key={id}>
              <div className={`incident-icon ${kind === 'ok' ? 'lime' : 'yellow'}`}>{kind === 'ok' ? <Check /> : <AlertTriangle />}</div>
              <div className="incident-main"><strong>INCIDENT #{id}</strong><span>{place}</span></div>
              <div className={`verify-chip ${kind}`}>{status}</div>
              <ChevronRight />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function AnalyticsModule() {
  const bars = [58, 72, 49, 84, 66, 91, 77, 62, 88, 70, 95, 68]
  return (
    <div className="analytics-wrap">
      <div className="metrics-note"><span className="demo-chip">DEMO DATASET / SIMULATED SERIES — NOT LIVE MUNICIPAL DATA</span></div>
      <div className="ana-stats">
        <div className="ana-stat"><strong className="tone-orange">+18.4%</strong><span>INCIDENT RECURRENCE</span></div>
        <div className="ana-stat"><strong className="tone-cobalt">−27%</strong><span>AVERAGE RESPONSE TIME</span></div>
        <div className="ana-stat"><strong className="tone-lime">84</strong><span>ACTIVE ZONES</span></div>
        <div className="ana-stat"><strong className="tone-purple">92.4%</strong><span>VERIFICATION RATE</span></div>
      </div>
      <div className="analytics-grid">
        <section className="panel">
          <div className="panel-head">
            <div><div className="eyebrow">VOLUME / 12 WEEKS / DEMO SERIES</div><h2>Waste incident volume</h2></div>
            <div className="panel-head-extra"><span className="trend trend-up">+18.4%</span><span className="demo-chip">DEMO</span></div>
          </div>
          <div className="chart">
            <div className="chart-axis"><span>900</span><span>600</span><span>300</span><span>0</span></div>
            <div className="chart-bars">{bars.map((value, i) => <i key={i} style={{ height: `${value}%` }} className={i === 10 ? 'peak' : ''} />)}</div>
          </div>
          <div className="chart-labels"><span>W01</span><span>W04</span><span>W08</span><span>W12</span></div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div><div className="eyebrow">RESPONSE TIME / AVG MINUTES / DEMO SERIES</div><h2>Response trend</h2></div>
            <div className="panel-head-extra"><span className="trend trend-down">−27%</span><span className="demo-chip">DEMO</span></div>
          </div>
          <div className="chart chart-line">
            <svg viewBox="0 0 300 120" preserveAspectRatio="none" aria-hidden="true">
              <polyline className="chart-baseline" points="0,119 300,119" />
              <polyline className="chart-series" points="0,24 40,38 80,32 120,56 160,50 200,74 240,68 300,92" />
            </svg>
            <div className="chart-axis"><span>48m</span><span>36m</span><span>24m</span></div>
          </div>
          <div className="chart-labels"><span>JAN</span><span>MAR</span><span>MAY</span><span>JUL</span></div>
        </section>
      </div>
      <section className="panel">
        <div className="panel-head"><div><div className="eyebrow">ZONE COMPARISON / INCIDENTS VS VERIFIED</div><h2>Zone performance</h2></div><span className="demo-chip">DEMO DATA</span></div>
        <div className="zone-table">
          {[['ZONE 07 / AMBATTUR', 92, 74, 'orange'], ['ZONE 03 / PERAMBUR', 71, 63, 'yellow'], ['ZONE 12 / GUINDY', 58, 51, 'cobalt'], ['ZONE 01 / T. NAGAR', 44, 42, 'lime']].map(([name, total, verified, tone]) => (
            <div className="zone-row" key={String(name)}>
              <strong>{name}</strong>
              <div className="zone-bars">
                <i className={`zone-bar tone-${tone}`} style={{ width: `${Number(total)}%` }} />
                <i className="zone-bar zone-bar-verified" style={{ width: `${Number(verified)}%` }} />
              </div>
              <span>{total} / {verified} VERIFIED</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function AgentsModule() {
  const agents = [
    ['VISION AGENT', 'WX-V01', 'ONLINE', 'Classifying street evidence', '10:42:11', 'PLASTIC 92% / CONF 94%', 'lime'],
    ['RISK AGENT', 'WX-R02', 'ONLINE', 'Scoring drain blockage risk', '10:42:14', 'RISK 0.81 / HIGH', 'lime'],
    ['HOTSPOT AGENT', 'WX-H03', 'ONLINE', 'Matching recurrence cluster', '10:42:16', 'ZONE 07 / MATCH 0.93', 'lime'],
    ['ROUTE AGENT', 'WX-T04', 'ACTIVE', 'Optimizing crew path', '10:42:27', 'ROUTE 07 / 8.4 KM', 'cobalt'],
    ['OPERATIONS AGENT', 'WX-O05', 'ACTIVE', 'Dispatching ALPHA-04', '10:42:19', 'DISPATCHED / ETA 12M', 'cobalt'],
    ['VERIFICATION AGENT', 'WX-C06', 'IDLE', 'Awaiting after-image', '10:41:02', 'PENDING / #00418', 'yellow'],
    ['REPORT AGENT', 'WX-P07', 'ONLINE', 'Compiling daily brief', '10:40:00', '08:00 DAILY / READY', 'lime'],
  ] as const
  return (
    <div className="agents-wrap">
      <div className="agent-flow" aria-hidden="true"><span>OBSERVE</span><b /><span>REASON</span><b /><span>PLAN</span><b /><span>ACT</span><b /><span>VERIFY</span></div>
      <div className="agent-grid">
        {agents.map(([name, id, status, task, ran, output, tone], index) => (
          <article className={`agent-node ${index === 3 ? 'is-active' : ''}`} key={id}>
            <header><span className="agent-id">{id}</span><span className={`agent-status tone-${tone}`}>{status}</span></header>
            <strong>{name}</strong>
            <dl>
              <div><dt>CURRENT TASK</dt><dd>{task}</dd></div>
              <div><dt>LAST EXECUTION</dt><dd>{ran}</dd></div>
              <div><dt>OUTPUT</dt><dd>{output}</dd></div>
            </dl>
            <span className="agent-signal" />
          </article>
        ))}
        <article className="agent-node agent-node-graph">
          <span className="mono-label">INTELLIGENCE FLOW</span>
          <div className="mini-graph">
            <span>V</span><i /><span>R</span><i /><span>H</span><i /><span>T</span><i /><span>O</span><i /><span>C</span><i /><span>P</span>
          </div>
          <p>VISION → RISK → HOTSPOT → ROUTE → OPERATIONS → VERIFICATION → REPORT</p>
        </article>
      </div>
    </div>
  )
}

function buildDemoReport(): string {
  const lines: string[] = [
    '# WASTEX DEMO INTELLIGENCE REPORT',
    '',
    '> Built locally in your browser from demo fixtures bundled with this build.',
    '> NOT live municipal data. No server, API, or AI inference was involved.',
    `> Generated at: ${new Date().toISOString()}`,
    '',
    '## Incidents (demo fixtures)',
    '',
    '| Ref | ID | Location | Category | Severity | Confidence | Zone | Detected | Status |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...DEMO_INCIDENTS.map((incident) =>
      `| ${incident.ref} | #${incident.id} | ${incident.place} | ${incident.type} | ${incident.severity} | ${incident.confidence} | ${incident.zone} | ${incident.detected} | ${incident.status} |`,
    ),
    '',
    '## Recurring hotspots (demo registry)',
    '',
    '| Location | Incidents | Recurrence | Type | Risk |',
    '| --- | --- | --- | --- | --- |',
    ...DEMO_HOTSPOTS.map((hotspot) =>
      `| ${hotspot.name} | ${hotspot.count} | ${hotspot.frequency}% | ${hotspot.type} | ${hotspot.risk} |`,
    ),
    '',
    '## Notes',
    '',
    '- Routes, verification evidence and analytics shown in the app are demo visualizations.',
    '- Scheduled city briefs and server-side report generation ship with the backend phase.',
    '',
  ]
  return lines.join('\n')
}

function ReportsModule() {
  const [exportedAt, setExportedAt] = useState<string | null>(null)

  const exportReport = () => {
    const blob = new Blob([buildDemoReport()], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'wastex-demo-report.md'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    setExportedAt(new Date().toLocaleTimeString())
  }

  return (
    <div className="reports-wrap">
      <section className="panel report-cta">
        <div className="eyebrow">REPORT ENGINE / LOCAL DEMO EXPORT</div>
        <h2>EXPORT DEMO<br />INTELLIGENCE REPORT</h2>
        <p>Compiles the demo incident fixtures and hotspot registry into a Markdown file, generated locally in your browser. Server-side city reports arrive with the backend phase.</p>
        <button className="button button-lime button-xl" onClick={exportReport}>
          EXPORT DEMO REPORT (.MD) <Download />
        </button>
        <span className="mono-label report-state" role="status">
          {exportedAt
            ? `STATUS / EXPORTED LOCALLY AT ${exportedAt} — WASTEX-DEMO-REPORT.MD`
            : 'STATUS / IDLE — NOTHING SENT TO A SERVER'}
        </span>
      </section>
      <section className="panel report-output">
        <div className="panel-head"><div><div className="eyebrow">DOCUMENT STRUCTURE / DEMO FIGURES</div><h2>Report sections</h2></div><span className="demo-chip">DEMO DATA</span></div>
        <div className="report-grid">
          {[['INCIDENTS ANALYZED', '128', 'orange'], ['HOTSPOTS IDENTIFIED', '37', 'yellow'], ['ROUTES OPTIMIZED', '14', 'cobalt'], ['CLEANUPS VERIFIED', '311', 'lime']].map(([label, value, tone]) => (
            <div className={`report-item tone-${tone}`} key={label}><strong>{value}</strong><span>{label} / DEMO</span></div>
          ))}
        </div>
        <div className="report-list">
          <div><span className="mono-label">01</span><strong>DAILY WASTE INTELLIGENCE</strong><em>PLANNED / NOT SCHEDULED</em></div>
          <div><span className="mono-label">02</span><strong>WEEKLY HOTSPOT REPORT</strong><em>PLANNED / NOT SCHEDULED</em></div>
          <div><span className="mono-label">03</span><strong>OPERATIONS PERFORMANCE</strong><em>PLANNED / NOT SCHEDULED</em></div>
        </div>
      </section>
    </div>
  )
}

function MapModule() {
  const [layers, setLayers] = useState<MapLayerState>({
    markers: true,
    hotspotZones: true,
    routeOverlay: true,
    zoneBoundaries: true,
    coordinateGrid: true,
  })

  const layerRows: { key: keyof MapLayerState; label: string }[] = [
    { key: 'markers', label: 'INCIDENT MARKERS' },
    { key: 'hotspotZones', label: 'HOTSPOT ZONES' },
    { key: 'routeOverlay', label: 'ROUTE OVERLAY' },
    { key: 'zoneBoundaries', label: 'ZONE BOUNDARIES' },
    { key: 'coordinateGrid', label: 'COORDINATE GRID' },
  ]

  return (
    <div className="map-page">
      <section className="panel">
        <div className="panel-head">
          <div><div className="eyebrow">FULL CITY MAP / DEMO OPERATIONAL GRID</div><h2>Chennai waste grid</h2></div>
          <span className="demo-chip">DEMO SIGNALS</span>
        </div>
        <MapCanvas tall layers={layers} />
        <div className="map-footer"><span><span className="pulse" /> 9 ACTIVE TEAMS IN FIELD</span><span>TOGGLE LAYERS IN THE CONTROL PANEL</span></div>
      </section>
      <div className="map-page-aside">
        <section className="panel">
          <div className="panel-head"><div><div className="eyebrow">LAYER CONTROL / WIRED TO MAP</div><h2>Map layers</h2></div></div>
          <div className="layer-list">
            {layerRows.map(({ key, label }) => (
              <label className="layer-row" key={key}>
                <input
                  type="checkbox"
                  checked={layers[key]}
                  onChange={() => setLayers((current) => ({ ...current, [key]: !current[key] }))}
                />
                <span>{label}</span>
                <em>{layers[key] ? 'ON' : 'OFF'}</em>
              </label>
            ))}
            <div className="layer-row is-disabled">
              <input type="checkbox" disabled aria-describedby="crew-layer-note" />
              <span>CREW TELEMETRY</span>
              <em>UNAVAILABLE</em>
            </div>
          </div>
          <p className="layer-note" id="crew-layer-note">
            <Truck aria-hidden="true" size={12} style={{ verticalAlign: 'text-bottom' }} /> CREW TELEMETRY HAS NO DATA SOURCE IN THIS BUILD — DISABLED UNTIL THE FIELD TELEMETRY PHASE.
          </p>
        </section>
        <SignalStream />
      </div>
    </div>
  )
}

function GenericModule({ slug }: { slug: string }) {
  return (
    <div className="workspace-grid">
      <section className="panel workspace-list">
        <div className="panel-head"><div><div className="eyebrow">ACTIVE SIGNALS / UPDATED NOW</div><h2>Operational stream</h2></div><span className="live-tag"><span className="pulse" /> LIVE</span></div>
        {['SYSTEM STATUS / ONLINE', 'AI CORE / READY', 'CITY FEED / LIVE', `MODULE / ${slug.toUpperCase()}`].map((item, index) => (
          <div className="workspace-row" key={item}><span className="workspace-index">0{index + 1}</span><strong>{item}</strong><ArrowUpRight /></div>
        ))}
      </section>
      <MapPanel />
    </div>
  )
}

const workspaceMeta: Record<string, { eyebrow: string; title: string; description: string; tone: string }> = {
  'ai-vision': { eyebrow: 'AI CORE / DEMO DETECTION FIXTURE', title: 'AI vision system', description: 'Computer vision turns street evidence into structured waste intelligence. Figures shown are demo fixtures.', tone: 'cobalt' },
  hotspots: { eyebrow: 'PATTERN ENGINE / DEMO REGISTRY', title: 'Where waste returns.', description: 'Recurring signals reveal where the city needs a different response. Hotspot figures are demo fixtures.', tone: 'yellow' },
  operations: { eyebrow: 'FIELD CONTROL / DEMO DISPATCH BOARD', title: 'Operations center', description: 'Move from assessed risk to coordinated action without losing the chain of evidence.', tone: 'lime' },
  routes: { eyebrow: 'ROUTE ENGINE / DEMO OPTIMIZED', title: 'Route optimization', description: 'The shortest route is not always the smartest route. WASTEX balances urgency, distance and team capacity.', tone: 'cobalt' },
  verification: { eyebrow: 'CLOSURE LOOP / DEMO EVIDENCE REVIEW', title: 'Verification', description: 'Every operation ends with proof, not a checkbox.', tone: 'lime' },
  analytics: { eyebrow: 'CITY SIGNALS / DEMO PERFORMANCE LAYER', title: 'Operational analytics', description: 'Read the city through response time, recurrence and verified outcomes. All series are demo data.', tone: 'yellow' },
  agents: { eyebrow: 'AI CORE / DEMO AGENT NETWORK', title: 'Agent network', description: 'A living system that observes, reasons, plans and learns across every incident.', tone: 'cobalt' },
  reports: { eyebrow: 'REPORT ENGINE / LOCAL DEMO EXPORT', title: 'Waste intelligence reports', description: 'Export the demo fixtures you can see into a Markdown record. Scheduled city reports ship with the backend phase.', tone: 'lime' },
  map: { eyebrow: 'GEOSPATIAL / DEMO CITY GRID', title: 'City map', description: 'Black roads, command markers, zone boundaries and demo route overlays — each layer toggle is wired to the map.', tone: 'cobalt' },
  settings: { eyebrow: 'SYSTEM / DEMO SETTINGS', title: 'Settings', description: 'Configuration surface. Account and integration settings arrive with the backend phase.', tone: 'lime' },
}

function WorkspacePage({ slug }: { slug: string }) {
  const meta = workspaceMeta[slug] ?? {
    eyebrow: 'WASTEX / SYSTEM MODULE',
    title: slug.replaceAll('-', ' '),
    description: 'Operational intelligence for a city in motion.',
    tone: 'lime',
  }

  const body = (() => {
    switch (slug) {
      case 'ai-vision': return <VisionModule />
      case 'hotspots': return <HotspotModule />
      case 'operations': return <OperationsModule />
      case 'routes': return <RoutesModule />
      case 'verification': return <VerificationModule />
      case 'analytics': return <AnalyticsModule />
      case 'agents': return <AgentsModule />
      case 'reports': return <ReportsModule />
      case 'map': return <MapModule />
      default: return <GenericModule slug={slug} />
    }
  })()

  return (
    <Shell active={`/${slug}`} title={meta.title} eyebrow={meta.eyebrow}>
      <div className="workspace-wrap">
        <div className={`workspace-hero tone-${meta.tone}`}>
          <div>
            <span className="signal-line"><span className="pulse" /> {meta.eyebrow}</span>
            <h2>{meta.title}</h2>
            <p>{meta.description}</p>
          </div>
          <div className="workspace-code">WX/{slug.toUpperCase()}<br />DEMO / 13.0827° N<br />AI CORE / 07</div>
        </div>
        {body}
        {slug !== 'map' && slug !== 'analytics' && slug !== 'verification' && slug !== 'routes' && slug !== 'agents' && slug !== 'reports' && slug !== 'operations' && <SignalStream />}
      </div>
    </Shell>
  )
}

function GenericPage({ slug }: { slug: string }) {
  return slug === 'dashboard' ? <CommandCenter /> : <WorkspacePage slug={slug} />
}

export default function WastexApp({ segments = [], route }: { segments?: string[]; route?: string }) {
  const parts =
    segments.length > 0
      ? segments
      : route && route !== '/'
        ? route.replace(/^\//, '').split('/').filter(Boolean)
        : []

  if (parts.length === 0) return <Landing />

  const [head, second] = parts

  if (head === 'incidents') {
    if (parts.length === 1) return <IncidentListPage />
    if (second === 'new') return <IncidentIntakePage />
    return <IncidentDetailPage incidentRef={decodeSegment(second)} />
  }

  return <GenericPage slug={head} />
}

export { CommandCenter as Dashboard }
