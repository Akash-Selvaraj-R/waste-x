import { and, count, desc, eq, type SQL } from 'drizzle-orm'
import { NextResponse, type NextRequest } from 'next/server'
import { databaseErrorResponse, isUniqueViolation } from '@/lib/api/errors'
import { readJsonBody } from '@/lib/api/read-body'
import { apiError } from '@/lib/api/responses'
import { getDb } from '@/lib/db'
import { incidents } from '@/lib/db/schema'
import { generateIncidentRef } from '@/lib/incidents/ref'
import { toIncidentDto, type IncidentDto } from '@/lib/incidents/types'
import { createIncidentSchema, listIncidentsQuerySchema } from '@/lib/incidents/validation'

export const dynamic = 'force-dynamic'

const REF_INSERT_ATTEMPTS = 5

export async function GET(request: NextRequest) {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries())
  const parsed = listIncidentsQuerySchema.safeParse(query)
  if (!parsed.success) {
    return apiError(
      400,
      'VALIDATION_ERROR',
      'Invalid list query parameters.',
      parsed.error.issues.map((issue) => ({
        field: issue.path.join('.') || '_query',
        message: issue.message,
      })),
    )
  }

  const { limit, offset, status, severity, category } = parsed.data

  try {
    const db = getDb()
    const filters: SQL[] = []
    if (status) filters.push(eq(incidents.status, status))
    if (severity) filters.push(eq(incidents.severity, severity))
    if (category) filters.push(eq(incidents.category, category))

    const where = filters.length > 0 ? and(...filters) : undefined

    const rows = await db
      .select()
      .from(incidents)
      .where(where)
      .orderBy(desc(incidents.createdAt), desc(incidents.id))
      .limit(limit)
      .offset(offset)

    const [totalRow] = await db.select({ total: count() }).from(incidents).where(where)

    const body: { incidents: IncidentDto[]; meta: { limit: number; offset: number; total: number } } = {
      incidents: rows.map(toIncidentDto),
      meta: { limit, offset, total: totalRow?.total ?? 0 },
    }
    return NextResponse.json(body)
  } catch (error) {
    return databaseErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request, createIncidentSchema)
  if (!body.ok) return body.response

  const payload = {
    title: body.data.title,
    description: body.data.description ?? null,
    category: body.data.category,
    severity: body.data.severity,
    status: 'reported' as const,
    location: body.data.location,
    latitude: body.data.latitude ?? null,
    longitude: body.data.longitude ?? null,
  }

  try {
    const db = getDb()
    let created
    let lastConflict: unknown = null

    for (let attempt = 0; attempt < REF_INSERT_ATTEMPTS; attempt += 1) {
      try {
        created = await db.insert(incidents).values({ ...payload, ref: generateIncidentRef() }).returning()
        break
      } catch (error) {
        if (isUniqueViolation(error)) {
          lastConflict = error
          continue
        }
        throw error
      }
    }

    if (!created) throw lastConflict ?? new Error('reference generation failed')

    const record = toIncidentDto(created[0])
    return NextResponse.json({ incident: record }, { status: 201 })
  } catch (error) {
    return databaseErrorResponse(error)
  }
}
