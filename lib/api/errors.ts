import { DatabaseNotConfiguredError } from '@/lib/db'
import { apiError, type ApiErrorBody } from './responses'
import type { NextResponse } from 'next/server'

interface PgLikeError {
  code?: string
  errno?: string
  syscall?: string
}

function codeOf(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null) {
    const candidate = error as PgLikeError
    if (typeof candidate.code === 'string') return candidate.code
    if (typeof candidate.errno === 'string') return candidate.errno
  }
  return undefined
}

export function isUniqueViolation(error: unknown): boolean {
  return codeOf(error) === '23505'
}

export function isConnectionFailure(error: unknown): boolean {
  const code = codeOf(error)
  if (!code) return false
  return [
    'ECONNREFUSED',
    'ECONNRESET',
    'ENOTFOUND',
    'ETIMEDOUT',
    'EAI_AGAIN',
    'EPIPE',
    '57P01',
    '57P03',
    '08006',
    '08001',
    '08003',
    '08000',
  ].includes(code)
}

export function isDatabaseNotConfigured(error: unknown): boolean {
  return error instanceof DatabaseNotConfiguredError || codeOf(error) === 'DATABASE_NOT_CONFIGURED'
}

/**
 * Maps database failures to safe, non-leaking API responses.
 * SQL text, connection strings and stack traces are never returned to clients.
 */
export function databaseErrorResponse(error: unknown): NextResponse<ApiErrorBody> {
  if (isDatabaseNotConfigured(error)) {
    return apiError(
      503,
      'DATABASE_NOT_CONFIGURED',
      'Persistence is not configured for this server. Set DATABASE_URL (see .env.example), run migrations, and try again.',
    )
  }
  if (isUniqueViolation(error)) {
    return apiError(
      409,
      'CONFLICT',
      'A record with that reference already exists. Please retry the request.',
    )
  }
  if (isConnectionFailure(error)) {
    return apiError(
      503,
      'DATABASE_UNAVAILABLE',
      'The database is currently unreachable. Your report was not saved — please try again shortly.',
    )
  }
  console.error('[wastex-api] unexpected database error:', codeOf(error) ?? 'unknown')
  return apiError(500, 'INTERNAL_ERROR', 'An unexpected error occurred while handling the request.')
}
