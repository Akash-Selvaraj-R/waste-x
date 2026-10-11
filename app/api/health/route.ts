import { NextResponse } from 'next/server'
import { checkDatabase, isDatabaseConfigured } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const configured = isDatabaseConfigured()
  const databaseUp = configured ? await checkDatabase() : false

  const status = databaseUp ? 'ok' : configured ? 'degraded' : 'unconfigured'
  const body = {
    service: 'wastex-api',
    status,
    time: new Date().toISOString(),
    checks: {
      database: databaseUp ? 'ok' : configured ? 'unreachable' : 'not_configured',
    },
  }

  return NextResponse.json(body, { status: databaseUp ? 200 : 503 })
}
