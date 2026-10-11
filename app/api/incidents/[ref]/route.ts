import { eq } from 'drizzle-orm'
import { NextResponse, type NextRequest } from 'next/server'
import { databaseErrorResponse } from '@/lib/api/errors'
import { apiError } from '@/lib/api/responses'
import { getDb } from '@/lib/db'
import { incidents } from '@/lib/db/schema'
import { incidentRefSchema } from '@/lib/incidents/validation'
import { toIncidentDto } from '@/lib/incidents/types'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, context: { params: Promise<{ ref: string }> }) {
  const { ref } = await context.params
  const parsed = incidentRefSchema.safeParse(decodeURIComponent(ref))
  if (!parsed.success) {
    return apiError(400, 'INVALID_REFERENCE', 'Incident reference must look like WX-1042.')
  }

  try {
    const db = getDb()
    const [row] = await db.select().from(incidents).where(eq(incidents.ref, parsed.data)).limit(1)
    if (!row) {
      return apiError(404, 'NOT_FOUND', `No incident exists with reference ${parsed.data}.`)
    }
    return NextResponse.json({ incident: toIncidentDto(row) })
  } catch (error) {
    return databaseErrorResponse(error)
  }
}
