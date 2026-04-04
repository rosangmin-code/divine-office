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
export function getComplinePsalmody(day: DayOfWeek): PsalmEntry[] {
  if (!_complineData) {
    const filePath = path.join(process.cwd(), 'src/data/loth/ordinarium/compline.json')
    _complineData = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  }
  return (_complineData as Record<string, Record<string, Record<string, PsalmEntry[]>>>).days[day]?.psalms ?? []
}
