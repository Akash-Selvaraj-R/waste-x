import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from './schema'

export type WastexDatabase = NodePgDatabase<typeof schema>

export class DatabaseNotConfiguredError extends Error {
  readonly code = 'DATABASE_NOT_CONFIGURED'
  constructor() {
    super('DATABASE_URL is not configured')
    this.name = 'DatabaseNotConfiguredError'
  }
}

let pool: pg.Pool | null = null
let database: WastexDatabase | null = null

export function getDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL?.trim()
  return url ? url : undefined
}

export function isDatabaseConfigured(): boolean {
  return Boolean(getDatabaseUrl())
}

function ensurePool(): pg.Pool {
  const url = getDatabaseUrl()
  if (!url) throw new DatabaseNotConfiguredError()
  if (!pool) pool = new pg.Pool({ connectionString: url, max: 10 })
  return pool
}

export function getDb(): WastexDatabase {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError()
  if (!database) database = drizzle(ensurePool(), { schema })
  return database
}

export async function checkDatabase(): Promise<boolean> {
  if (!isDatabaseConfigured()) return false
  try {
    await ensurePool().query('select 1')
    return true
  } catch {
    return false
  }
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    const current = pool
    pool = null
    database = null
    await current.end()
  }
}
