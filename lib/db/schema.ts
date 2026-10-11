import {
  bigserial,
  check,
  doublePrecision,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import {
  INCIDENT_STATUSES,
  SEVERITY_OPTIONS,
  WASTE_CATEGORIES,
} from '../incidents/constants'

export const incidentSeverityEnum = pgEnum('incident_severity', SEVERITY_OPTIONS)
export const incidentStatusEnum = pgEnum('incident_status', INCIDENT_STATUSES)
export const wasteCategoryEnum = pgEnum('waste_category', WASTE_CATEGORIES)

/**
 * Persisted incident records. This table holds real, database-backed reports
 * submitted through the intake form. Bundled demo fixtures (lib/demo-data.ts)
 * are never written here unless explicitly seeded in a development database.
 */
export const incidents = pgTable(
  'incidents',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    ref: varchar('ref', { length: 16 }).notNull(),
    title: varchar('title', { length: 160 }).notNull(),
    description: text('description'),
    category: wasteCategoryEnum('category').notNull(),
    severity: incidentSeverityEnum('severity').notNull(),
    status: incidentStatusEnum('status').notNull().default('reported'),
    location: varchar('location', { length: 300 }).notNull(),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('incidents_ref_key').on(table.ref),
    index('incidents_status_idx').on(table.status),
    index('incidents_severity_idx').on(table.severity),
    index('incidents_created_at_idx').on(table.createdAt),
    check(
      'incidents_latitude_range',
      sql`latitude IS NULL OR latitude BETWEEN -90 AND 90`,
    ),
    check(
      'incidents_longitude_range',
      sql`longitude IS NULL OR longitude BETWEEN -180 AND 180`,
    ),
  ],
)

export type IncidentRow = typeof incidents.$inferSelect
export type NewIncidentRow = typeof incidents.$inferInsert
