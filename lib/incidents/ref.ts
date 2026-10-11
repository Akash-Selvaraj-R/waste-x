import { INCIDENT_REF_PATTERN } from './constants'

/**
 * Generates a unique, human-readable incident reference such as `WX-4821`.
 * Collisions are extremely unlikely and are retried by the caller.
 */
export function generateIncidentRef(): string {
  const value = 1000 + Math.floor(Math.random() * 9000)
  return `WX-${value}`
}

export function isValidIncidentRef(ref: string): boolean {
  return INCIDENT_REF_PATTERN.test(ref.trim())
}
