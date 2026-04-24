import type { HourType } from '../types'
import type { HourAssembler } from './types'
import { assembleLauds } from './lauds'
import { assembleVespers } from './vespers'
import { assembleCompline } from './compline'

const assemblers: Partial<Record<HourType, HourAssembler>> = {
  lauds: assembleLauds,
  vespers: assembleVespers,
  compline: assembleCompline,
}

export function getAssembler(hour: HourType): HourAssembler | null {
  return assemblers[hour] ?? null
}

// Re-export public API — external code should import from './hours' only
export type { HourAssembler, HourContext, Ordinarium } from './types'
export { loadOrdinarium, dateToDayOfWeek, resolvePsalm, promoteToFirstVespersIdentity } from './shared'
export { mergeComplineDefaults } from './compline'
