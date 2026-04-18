import type {
  HourType,
  DayOfWeek,
  LiturgicalDayInfo,
  AssembledPsalm,
  HourSection,
  HourPropers,
  HymnCandidate,
} from '../types'
import type { ComplineData } from '../psalter-loader'

// --- Ordinarium data shape (loaded from JSON) ---

export interface InvitatoryPsalmData {
  ref: string
  title: string
  epigraph?: string
  stanzas: string[][]
  page?: number
}

export interface InvitatoryAntiphons {
  ordinaryTime: {
    odd: Record<string, string>
    even: Record<string, string>
  }
  advent: Record<string, string>
  christmas: Record<string, string>
  lent: Record<string, string>
  easter: Record<string, string>
  feasts: Record<string, string>
}

export interface Ordinarium {
  invitatory: {
    openingVersicle: { versicle: string; response: string }
    invitatoryPsalms: InvitatoryPsalmData[]
    gloryBe: { text: string; shortText: string }
    rubric?: string
  }
  invitatoryAntiphons: InvitatoryAntiphons
  canticles: Record<string, { ref: string; titleMn: string; title?: string; subtitle?: string; verses?: string[]; doxology?: string }>
  commonPrayers: {
    openingVersicle: { versicle: string; response: string; gloryBe: string; alleluia: string }
    [key: string]: unknown
  }
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
  hymnCandidates?: HymnCandidate[]
  hymnSelectedIndex?: number
}

/**
 * Each hour module exports a function matching this signature.
 * Synchronous because all async work (psalm resolution) is done
 * before the assembler is called.
 */
export type HourAssembler = (ctx: HourContext) => HourSection[]
