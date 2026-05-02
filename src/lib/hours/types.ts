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
  canticles: Record<string, { ref: string; titleMn: string; title?: string; subtitle?: string; verses?: string[]; doxology?: string; page?: number }>
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
  /**
   * #230 F-X5 + #216 F-2c — effective liturgical identity for FR-156
   * first-Vespers promotion paths (and the new firstVespers /
   * firstCompline routes when they relocate the rendered identity).
   *
   * When a render BORROWS tomorrow's identity (eve-of-Solemnity URL
   * `/pray/MonEve/vespers` showing Tuesday-Solemnity first vespers,
   * or the Saturday→Sunday legacy fallback) the civil `liturgicalDay`
   * is the eve's day (rank usually MEMORIAL or null) but the rendered
   * propers belong to the next day. Without an explicit "effective"
   * field, downstream rubric logic (e.g. compline F-2 primary↔alternate
   * concluding-prayer swap, which checks `rank === 'SOLEMNITY'`)
   * silently misses the promoted identity → #216 F-2c latent bug.
   *
   * For the new firstVespers / firstCompline routes (Q4=P), the URL
   * date IS the Solemnity / Sunday, so `liturgicalDay` already
   * carries the correct rank — we still set `effectiveLiturgicalDay`
   * here (mirror of `liturgicalDay`) so consumers can read a single
   * field and not branch on path.
   *
   * Absent (`undefined`) means the render is NOT borrowing — civil
   * `liturgicalDay` is authoritative. Consumers SHOULD prefer
   * `effectiveLiturgicalDay ?? liturgicalDay`.
   */
  effectiveLiturgicalDay?: LiturgicalDayInfo
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
