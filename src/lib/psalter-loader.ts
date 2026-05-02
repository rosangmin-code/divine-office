import type { PsalterWeekData, HourPsalmody, HourType, DayOfWeek, PsalmEntry } from './types'
import fs from 'fs'
import path from 'path'
import { PsalterWeekSchema, safeParse } from './schemas'

// Cache loaded psalter weeks
const psalterCache = new Map<number, PsalterWeekData>()

function safeWeek(week: number): 1 | 2 | 3 | 4 {
  if (week >= 1 && week <= 4) return week as 1 | 2 | 3 | 4
  const clamped = week > 0 ? week : 1
  return (((clamped - 1) % 4) + 1) as 1 | 2 | 3 | 4
}

function loadWeek(week: 1 | 2 | 3 | 4): PsalterWeekData {
  const w = safeWeek(week)
  if (psalterCache.has(w)) return psalterCache.get(w)!

  const filePath = path.join(process.cwd(), `src/data/loth/psalter/week-${w}.json`)
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  const validated = safeParse(PsalterWeekSchema, raw, `psalter week-${w}.json`)
  // Validation failure is loud (schemas.ts logs the failing paths) but we
  // still fall back to the raw blob so a minor schema drift does not
  // brick the whole app — the existing PsalterWeekData cast covers the
  // fields the rest of the code actually reads.
  const data = (validated ?? (raw as PsalterWeekData)) as PsalterWeekData
  psalterCache.set(w, data)
  return data
}

export function getPsalterPsalmody(
  week: 1 | 2 | 3 | 4,
  day: DayOfWeek,
  hour: HourType,
): HourPsalmody | null {
  // Compline uses its own fixed cycle, not the psalter
  if (hour === 'compline') return null

  const weekData = loadWeek(week)
  const dayData = weekData.days[day]
  if (!dayData) return null

  const hourKey = hour as keyof typeof dayData
  const psalmody = dayData[hourKey]
  return psalmody ?? null
}

/**
 * Get common prayer elements from the psalter (short reading, responsory,
 * gospel canticle antiphon, intercessions, concluding prayer).
 * These are the 4-week cycle defaults used on ordinary weekdays per GILH §157/§183/§199.
 */
export interface PsalterCommons {
  shortReading?: { ref: string; text: string; page?: number }
  responsory?: { fullResponse: string; versicle: string; shortResponse: string; page?: number }
  gospelCanticleAntiphon?: string
  gospelCanticleAntiphonPage?: number
  intercessions?: string[]
  intercessionsPage?: number
  concludingPrayer?: string
  concludingPrayerPage?: number
}

export function getPsalterCommons(
  week: 1 | 2 | 3 | 4,
  day: DayOfWeek,
  hour: HourType,
): PsalterCommons | null {
  if (hour === 'compline') return null

  const weekData = loadWeek(week)
  const dayData = weekData.days[day]
  if (!dayData) return null

  const hourEntry = dayData[hour as keyof typeof dayData] as unknown as Record<string, unknown> | undefined
  if (!hourEntry) return null

  const result: PsalterCommons = {}
  if (hourEntry.shortReading) result.shortReading = hourEntry.shortReading as PsalterCommons['shortReading']
  if (hourEntry.responsory) result.responsory = hourEntry.responsory as PsalterCommons['responsory']
  if (hourEntry.gospelCanticleAntiphon) result.gospelCanticleAntiphon = hourEntry.gospelCanticleAntiphon as string
  if (typeof hourEntry.gospelCanticleAntiphonPage === 'number') result.gospelCanticleAntiphonPage = hourEntry.gospelCanticleAntiphonPage
  if (hourEntry.intercessions) result.intercessions = hourEntry.intercessions as string[]
  if (typeof hourEntry.intercessionsPage === 'number') result.intercessionsPage = hourEntry.intercessionsPage
  if (hourEntry.concludingPrayer) result.concludingPrayer = hourEntry.concludingPrayer as string
  if (typeof hourEntry.concludingPrayerPage === 'number') result.concludingPrayerPage = hourEntry.concludingPrayerPage

  return Object.keys(result).length > 0 ? result : null
}

let _complineData: Record<string, unknown> | null = null
function loadComplineData(): Record<string, unknown> {
  if (!_complineData) {
    const filePath = path.join(process.cwd(), 'src/data/loth/ordinarium/compline.json')
    _complineData = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  }
  return _complineData!
}

export function getComplinePsalmody(day: DayOfWeek): PsalmEntry[] {
  const data = loadComplineData() as Record<string, Record<string, Record<string, PsalmEntry[]>>>
  return data.days[day]?.psalms ?? []
}

/**
 * Seasonal compline responsory variant — replaces the default
 * `compline.json::responsory` body during EASTER (and its 8-day Octave).
 *
 * Sourced from PDF physical p.258 (book p.515) right column. Two variants
 * keyed off the calendar:
 *   - `eastertideOctave` — PDF rubric "Амилалтын Найман хоногийн доторх
 *     өдрүүдэд:" — single-line replacement (no V/R structure). Active for
 *     the 8 days of Easter Octave (Easter Sunday + 6 weekdays + Octave
 *     Sunday / Divine Mercy Sunday).
 *   - `eastertide` — PDF rubric "Амилалтын улирал:" — full V/R/Glory Be
 *     structure with Latin double-Alleluia ("Аллэлуяа, аллэлуяа!") in
 *     fullResponse + shortResponse. Active for Eastertide post-Octave.
 *
 * `versicle` / `shortResponse` may be empty strings for the Octave variant
 * (single-line form). The `rich` field carries the PDF-faithful AST so the
 * renderer can bypass the standard Responsory shape (which always emits
 * Glory Be cue + final response repeat — incorrect for the Octave line).
 */
export interface SeasonalComplineResponsoryVariant {
  fullResponse: string
  versicle: string
  shortResponse: string
  rich?: import('./types').PrayerText
  page?: number
}

export interface SeasonalComplineResponsoryMap {
  eastertideOctave?: SeasonalComplineResponsoryVariant
  eastertide?: SeasonalComplineResponsoryVariant
}

export interface ComplineData {
  psalms: PsalmEntry[]
  shortReading: { ref: string; text: string; page?: number } | null
  responsory: { fullResponse: string; versicle: string; shortResponse: string; page?: number } | null
  /**
   * Season+Octave-keyed compline responsory overrides. Selected by
   * `selectSeasonalCompResponsory(season, dayOfWeek, weekOfSeason)` —
   * absent / null → renderer falls back to the default `responsory`.
   */
  seasonalResponsory: SeasonalComplineResponsoryMap | null
  nuncDimittisAntiphon: string
  concludingPrayer: { primary: string; alternate?: string; page?: number } | null
  examen: string
  examenPage?: number
  blessing: { text: string; response: string; page?: number } | null
  blessingPage?: number
  marianAntiphon: { title: string; text: string; page?: number; lines?: string[] }[]
}

export function getFullComplineData(day: DayOfWeek): ComplineData {
  const data = loadComplineData() as Record<string, unknown>
  const days = data.days as Record<string, Record<string, unknown>>
  const dayData = days[day] ?? {}

  const globalResponsory = data.responsory as { fullResponse: string; versicle: string; shortResponse: string } | undefined
  const seasonalResponsory = data.seasonalResponsory as SeasonalComplineResponsoryMap | undefined
  const nuncDimittis = data.nuncDimittis as { antiphon: string } | undefined
  const examen = data.examen as { text: string } | undefined
  const blessing = data.blessing as { text: string; response: string } | undefined
  const anteMarian = data.anteMarian as {
    salveRegina: { title: string; text: string; page?: number; lines?: string[] }
    alternatives: { title: string; text: string; page?: number; lines?: string[] }[]
  } | undefined

  const marianOptions: { title: string; text: string; page?: number; lines?: string[] }[] = []
  if (anteMarian?.salveRegina) marianOptions.push(anteMarian.salveRegina)
  if (anteMarian?.alternatives) marianOptions.push(...anteMarian.alternatives)

  return {
    psalms: (dayData.psalms as PsalmEntry[]) ?? [],
    shortReading: (dayData.shortReading as { ref: string; text: string; page?: number }) ?? null,
    responsory: globalResponsory as { fullResponse: string; versicle: string; shortResponse: string; page?: number } | null ?? null,
    seasonalResponsory: seasonalResponsory ?? null,
    nuncDimittisAntiphon: nuncDimittis?.antiphon ?? '',
    concludingPrayer: (dayData.concludingPrayer as { primary: string; alternate?: string; page?: number }) ?? null,
    examen: examen?.text ?? '',
    examenPage: (examen as { text: string; page?: number } | undefined)?.page,
    blessing: blessing as { text: string; response: string; page?: number } | null ?? null,
    blessingPage: (blessing as { text: string; response: string; page?: number } | undefined)?.page,
    marianAntiphon: marianOptions,
  }
}
