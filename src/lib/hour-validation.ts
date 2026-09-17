import type { HourType } from './types'

/**
 * The five hour slugs the app routes on (`/pray/{date}/{hour}`,
 * `/api/loth/{date}/{hour}`). Kept in one place because the SSR route and the
 * API route must reject exactly the same set — they used to carry separate
 * copies of this literal.
 */
export const VALID_HOURS: HourType[] = [
  'lauds',
  'vespers',
  'compline',
  'firstVespers',
  'firstCompline',
]

export function isValidHourType(input: unknown): input is HourType {
  return typeof input === 'string' && (VALID_HOURS as string[]).includes(input)
}

/** First Vespers / First Compline are the only hours gated by eligibility. */
export function isEveHourType(hour: HourType): boolean {
  return hour === 'firstVespers' || hour === 'firstCompline'
}
