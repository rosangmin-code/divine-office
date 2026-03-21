import type { PsalterWeekData, HourPsalmody, HourType, DayOfWeek, PsalmEntry } from './types'

// Cache loaded psalter weeks
const psalterCache = new Map<number, PsalterWeekData>()

function loadWeek(week: 1 | 2 | 3 | 4): PsalterWeekData {
  if (psalterCache.has(week)) return psalterCache.get(week)!

  // Dynamic import of JSON files
  /* eslint-disable @typescript-eslint/no-require-imports */
  const data = require(`@/data/loth/psalter/week-${week}.json`) as PsalterWeekData
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

export function getComplinePsalmody(day: DayOfWeek): PsalmEntry[] {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const complineData = require('@/data/loth/ordinarium/compline.json')
  return complineData.days[day]?.psalms ?? []
}
