/**
 * Seeds the development database with the bundled demo incidents.
 * Demo fixtures are kept separate from persisted records: this script is the
 * only place where fixture data is written to the database, and it never
 * overwrites records that already exist (conflicts on `ref` are ignored).
 *
 * Usage: pnpm db:seed
 */
import 'dotenv/config'
import { closeDatabase, getDb, isDatabaseConfigured } from '@/lib/db'
import { incidents } from '@/lib/db/schema'
import { DEMO_INCIDENTS } from '@/lib/demo-data'
import type { IncidentStatus, WasteCategory } from '@/lib/incidents/constants'

const CATEGORY_BY_FIXTURE: Record<string, WasteCategory> = {
  'Mixed municipal waste': 'Mixed municipal waste',
  'Organic overflow': 'Organic waste',
  'Construction debris': 'Construction debris',
}

const STATUS_BY_FIXTURE: Record<string, IncidentStatus> = {
  DISPATCHED: 'in_progress',
  ASSIGNED: 'triaged',
  'AWAITING CREW': 'reported',
}

const COORDS_BY_REF: Record<string, { latitude: number; longitude: number }> = {
  'WX-1042': { latitude: 13.0996, longitude: 80.163 },
  'WX-1051': { latitude: 13.1215, longitude: 80.2341 },
  'WX-1057': { latitude: 13.0067, longitude: 80.2206 },
}

async function seed() {
  if (!isDatabaseConfigured()) {
    console.error('DATABASE_URL is not configured. Copy .env.example to .env and set it first.')
    process.exitCode = 1
    return
  }

  const db = getDb()
  let inserted = 0

  for (const fixture of DEMO_INCIDENTS) {
    const coords = COORDS_BY_REF[fixture.ref]
    const [row] = await db
      .insert(incidents)
      .values({
        ref: fixture.ref,
        title: `${fixture.type} — ${fixture.place}`,
        description: fixture.note,
        category: CATEGORY_BY_FIXTURE[fixture.type] ?? 'Other',
        severity: fixture.severity,
        status: STATUS_BY_FIXTURE[fixture.status] ?? 'reported',
        location: `${fixture.place} / ${fixture.zone}`,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
      })
      .onConflictDoNothing({ target: incidents.ref })
      .returning({ id: incidents.id })

    if (row) inserted += 1
  }

  console.log(
    inserted > 0
      ? `Seeded ${inserted} demo incident(s).`
      : 'Demo incidents already present — nothing to seed.'
  )
  await closeDatabase()
}

seed().catch(async (error) => {
  console.error('Seed failed:', error instanceof Error ? error.message : error)
  await closeDatabase().catch(() => undefined)
  process.exitCode = 1
})
