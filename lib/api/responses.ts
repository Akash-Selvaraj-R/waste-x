import { NextResponse } from 'next/server'

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_JSON'
  | 'PAYLOAD_TOO_LARGE'
  | 'INVALID_REFERENCE'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'DATABASE_NOT_CONFIGURED'
  | 'DATABASE_UNAVAILABLE'
  | 'INTERNAL_ERROR'

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode
    message: string
    details?: { field: string; message: string }[]
  }
}

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: { field: string; message: string }[],
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = { error: { code, message } }
  if (details && details.length > 0) body.error.details = details
  return NextResponse.json(body, { status })
}

export function validationError(details: { field: string; message: string }[]): NextResponse<ApiErrorBody> {
  return apiError(400, 'VALIDATION_ERROR', 'The submitted report is invalid.', details)
}
