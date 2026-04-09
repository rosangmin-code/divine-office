import type { HourType } from '../types'
import type { HourAssembler } from './types'
import { assembleLauds } from './lauds'
import { assembleDaytimePrayer } from './daytime-prayer'
import { assembleVespers } from './vespers'
import { assembleCompline } from './compline'

const assemblers: Partial<Record<HourType, HourAssembler>> = {
  lauds: assembleLauds,
  terce: assembleDaytimePrayer,
  sext: assembleDaytimePrayer,
  none: assembleDaytimePrayer,
  vespers: assembleVespers,
  compline: assembleCompline,
}

export function getAssembler(hour: HourType): HourAssembler | null {
  return assemblers[hour] ?? null
}

// Re-export for convenience
export type { HourAssembler, HourContext } from './types'
export { loadOrdinarium, dateToDayOfWeek, resolvePsalm } from './shared'
