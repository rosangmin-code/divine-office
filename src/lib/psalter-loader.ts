import type { PsalterWeekData, HourPsalmody, HourType, DayOfWeek, PsalmEntry } from './types'
import fs from 'fs'
import path from 'path'

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
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as PsalterWeekData
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
  shortReading?: { ref: string; text: string }
  responsory?: { versicle: string; response: string }
  gospelCanticleAntiphon?: string
  intercessions?: string[]
  concludingPrayer?: string
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
  if (hourEntry.intercessions) result.intercessions = hourEntry.intercessions as string[]
  if (hourEntry.concludingPrayer) result.concludingPrayer = hourEntry.concludingPrayer as string

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

export interface ComplineData {
  psalms: PsalmEntry[]
  shortReading: { ref: string; text: string; page?: number } | null
  responsory: { versicle: string; response: string; page?: number } | null
  nuncDimittisAntiphon: string
  concludingPrayer: { primary: string; alternate?: string; page?: number } | null
  examen: string
  examenPage?: number
  blessing: { text: string; response: string; page?: number } | null
  blessingPage?: number
  marianAntiphon: { title: string; text: string; page?: number }[]
}

export function getFullComplineData(day: DayOfWeek): ComplineData {
  const data = loadComplineData() as Record<string, unknown>
  const days = data.days as Record<string, Record<string, unknown>>
  const dayData = days[day] ?? {}

  const globalResponsory = data.responsory as { versicle: string; response: string } | undefined
  const nuncDimittis = data.nuncDimittis as { antiphon: string } | undefined
  const examen = data.examen as { text: string } | undefined
  const blessing = data.blessing as { text: string; response: string } | undefined
  const anteMarian = data.anteMarian as {
    salveRegina: { title: string; text: string }
    alternatives: { title: string; text: string }[]
  } | undefined

  const marianOptions: { title: string; text: string }[] = []
  if (anteMarian?.salveRegina) marianOptions.push(anteMarian.salveRegina)
  if (anteMarian?.alternatives) marianOptions.push(...anteMarian.alternatives)

  return {
    psalms: (dayData.psalms as PsalmEntry[]) ?? [],
    shortReading: (dayData.shortReading as { ref: string; text: string; page?: number }) ?? null,
    responsory: globalResponsory as { versicle: string; response: string; page?: number } | null ?? null,
    nuncDimittisAntiphon: nuncDimittis?.antiphon ?? '',
    concludingPrayer: (dayData.concludingPrayer as { primary: string; alternate?: string; page?: number }) ?? null,
    examen: examen?.text ?? '',
    examenPage: (examen as { text: string; page?: number } | undefined)?.page,
    blessing: blessing as { text: string; response: string; page?: number } | null ?? null,
    blessingPage: (blessing as { text: string; response: string; page?: number } | undefined)?.page,
    marianAntiphon: marianOptions,
  }
}
