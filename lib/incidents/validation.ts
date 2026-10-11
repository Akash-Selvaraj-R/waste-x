import { z } from 'zod'
import {
  API_LIMITS,
  INCIDENT_REF_PATTERN,
  INCIDENT_STATUSES,
  SEVERITY_OPTIONS,
  WASTE_CATEGORIES,
} from './constants'

const coordinate = (label: string, min: number, max: number) =>
  z
    .number({ error: `${label} must be a number between ${min} and ${max}.` })
    .min(min, `${label} must be between ${min} and ${max}.`)
    .max(max, `${label} must be between ${min} and ${max}.`)

export const createIncidentSchema = z
  .object({
    title: z
      .string({ error: 'Title is required.' })
      .trim()
      .min(API_LIMITS.titleMin, `Title must be at least ${API_LIMITS.titleMin} characters.`)
      .max(API_LIMITS.titleMax, `Title must be at most ${API_LIMITS.titleMax} characters.`),
    description: z
      .string()
      .trim()
      .max(API_LIMITS.descriptionMax, `Description must be at most ${API_LIMITS.descriptionMax} characters.`)
      .optional(),
    category: z.enum(WASTE_CATEGORIES, {
      error: `Category must be one of: ${WASTE_CATEGORIES.join(', ')}.`,
    }),
    severity: z.enum(SEVERITY_OPTIONS, {
      error: `Severity must be one of: ${SEVERITY_OPTIONS.join(', ')}.`,
    }),
    location: z
      .string({ error: 'Location is required.' })
      .trim()
      .min(API_LIMITS.locationMin, `Location must be at least ${API_LIMITS.locationMin} characters.`)
      .max(API_LIMITS.locationMax, `Location must be at most ${API_LIMITS.locationMax} characters.`),
    latitude: coordinate('Latitude', -90, 90).nullish(),
    longitude: coordinate('Longitude', -180, 180).nullish(),
  })
  .superRefine((value, ctx) => {
    const hasLatitude = value.latitude !== null && value.latitude !== undefined
    const hasLongitude = value.longitude !== null && value.longitude !== undefined
    if (hasLatitude !== hasLongitude) {
      ctx.addIssue({
        code: 'custom',
        message: 'Latitude and longitude must be provided together.',
        path: [hasLatitude ? 'longitude' : 'latitude'],
      })
    }
    if (value.description !== undefined && value.description.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'Description cannot be empty.', path: ['description'] })
    }
  })

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>

export const listIncidentsQuerySchema = z.object({
  status: z.enum(INCIDENT_STATUSES).optional(),
  severity: z.enum(SEVERITY_OPTIONS).optional(),
  category: z.enum(WASTE_CATEGORIES).optional(),
  limit: z.coerce
    .number({ error: 'limit must be a number.' })
    .int('limit must be an integer.')
    .min(1, 'limit must be at least 1.')
    .max(API_LIMITS.pageSizeMax, `limit must be at most ${API_LIMITS.pageSizeMax}.`)
    .default(20),
  offset: z.coerce
    .number({ error: 'offset must be a number.' })
    .int('offset must be an integer.')
    .min(0, 'offset must be zero or greater.')
    .max(API_LIMITS.pageOffsetMax, `offset must be at most ${API_LIMITS.pageOffsetMax}.`)
    .default(0),
})

export type ListIncidentsQuery = z.infer<typeof listIncidentsQuerySchema>

export const incidentRefSchema = z
  .string()
  .trim()
  .regex(INCIDENT_REF_PATTERN, 'Reference must look like WX-1042.')

export function formatZodIssues(error: z.ZodError): { field: string; message: string }[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : '_request',
    message: issue.message,
  }))
}
