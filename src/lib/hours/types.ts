import type {
  HourType,
  DayOfWeek,
  LiturgicalDayInfo,
  AssembledPsalm,
  HourSection,
  HourPropers,
} from '../types'
import type { ComplineData } from '../psalter-loader'

// --- Ordinarium data shape (loaded from JSON) ---

export interface Ordinarium {
  invitatory: {
    openingVersicle: { versicle: string; response: string }
    psalms: unknown[]
  }
  canticles: Record<string, { ref: string; titleMn: string }>
  commonPrayers: Record<string, unknown>
  complineData: Record<string, unknown>
}

// --- Hour assembler contract ---

/**
 * All pre-loaded data that any hour assembler might need.
 * Computed once in assembleHour(), passed to the assembler.
 */
export interface HourContext {
  hour: HourType
  dateStr: string
  dayOfWeek: DayOfWeek
  liturgicalDay: LiturgicalDayInfo
  assembledPsalms: AssembledPsalm[]
  mergedPropers: HourPropers
  ordinarium: Ordinarium
  isFirstHourOfDay: boolean
  complineData: ComplineData | null
}

/**
 * Each hour module exports a function matching this signature.
 * Synchronous because all async work (psalm resolution) is done
 * before the assembler is called.
 */
export type HourAssembler = (ctx: HourContext) => HourSection[]
