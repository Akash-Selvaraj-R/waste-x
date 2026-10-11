import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { API_LIMITS } from '@/lib/incidents/constants'
import { formatZodIssues } from '@/lib/incidents/validation'
import { apiError, validationError, type ApiErrorBody } from './responses'
import type { NextResponse } from 'next/server'

export type ReadBodyResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse<ApiErrorBody> }

/**
 * Reads and validates a JSON request body with an explicit size limit.
 * Malformed JSON, oversized payloads and schema failures become 4xx responses.
 */
export async function readJsonBody<T>(
  request: NextRequest,
  schema: z.ZodType<T>,
): Promise<ReadBodyResult<T>> {
  const contentLength = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(contentLength) && contentLength > API_LIMITS.requestBytes) {
    return {
      ok: false,
      response: apiError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large.'),
    }
  }

  let raw: string
  try {
    raw = await request.text()
  } catch {
    return { ok: false, response: apiError(400, 'INVALID_JSON', 'Request body could not be read.') }
  }

  if (raw.length > API_LIMITS.requestBytes) {
    return {
      ok: false,
      response: apiError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large.'),
    }
  }
  if (raw.trim().length === 0) {
    return {
      ok: false,
      response: apiError(400, 'INVALID_JSON', 'A JSON request body is required.'),
    }
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(raw)
  } catch {
    return { ok: false, response: apiError(400, 'INVALID_JSON', 'Request body is not valid JSON.') }
  }

  const result = schema.safeParse(parsedJson)
  if (!result.success) {
    return { ok: false, response: validationError(formatZodIssues(result.error)) }
  }
  return { ok: true, data: result.data }
}
