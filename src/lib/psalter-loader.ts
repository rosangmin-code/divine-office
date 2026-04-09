import type { PsalterWeekData, HourPsalmody, HourType, DayOfWeek, PsalmEntry } from './types'
import fs from 'fs'
import path from 'path'

// Cache loaded psalter weeks
const psalterCache = new Map<number, PsalterWeekData>()

function loadWeek(week: 1 | 2 | 3 | 4): PsalterWeekData {
  if (psalterCache.has(week)) return psalterCache.get(week)!

  const filePath = path.join(process.cwd(), `src/data/loth/psalter/week-${week}.json`)
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as PsalterWeekData
  psalterCache.set(week, data)
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
  shortReading: { ref: string; text: string } | null
  responsory: { versicle: string; response: string } | null
  nuncDimittisAntiphon: string
  concludingPrayer: { primary: string; alternate?: string } | null
  examen: string
  blessing: { text: string; response: string } | null
  marianAntiphon: { title: string; text: string }[]
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
    shortReading: (dayData.shortReading as { ref: string; text: string }) ?? null,
    responsory: globalResponsory ?? null,
    nuncDimittisAntiphon: nuncDimittis?.antiphon ?? '',
    concludingPrayer: (dayData.concludingPrayer as { primary: string; alternate?: string }) ?? null,
    examen: examen?.text ?? '',
    blessing: blessing ?? null,
    marianAntiphon: marianOptions,
  }
}
