import type { DayPropers, HourPropers, HourType, LiturgicalSeason, DayOfWeek, SanctoralEntry } from './types'

// Cache for season propers
const seasonCache = new Map<string, Record<string, Record<string, DayPropers>>>()

function loadSeasonPropers(season: LiturgicalSeason): Record<string, Record<string, DayPropers>> {
  if (seasonCache.has(season)) return seasonCache.get(season)!

  const fileMap: Record<LiturgicalSeason, string> = {
    ADVENT: 'advent',
    CHRISTMAS: 'christmas',
    LENT: 'lent',
    EASTER: 'easter',
    ORDINARY_TIME: 'ordinary-time',
  }

  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const data = require(`@/data/loth/propers/${fileMap[season]}.json`)
    const weeks = data.weeks ?? {}
    seasonCache.set(season, weeks)
    return weeks
  } catch {
    // File doesn't exist yet - return empty
    seasonCache.set(season, {})
    return {}
  }
}

export function getSeasonHourPropers(
  season: LiturgicalSeason,
  weekOfSeason: number,
  day: DayOfWeek,
  hour: HourType,
): HourPropers | null {
  const weeks = loadSeasonPropers(season)
  const weekKey = String(weekOfSeason)
  const dayPropers = weeks[weekKey]?.[day]
  if (!dayPropers) return null

  return (dayPropers[hour as keyof DayPropers] as HourPropers) ?? null
}

// Cache for sanctoral propers
const sanctoralCache = new Map<string, Record<string, SanctoralEntry>>()

function loadSanctoralFile(type: 'solemnities' | 'feasts' | 'memorials'): Record<string, SanctoralEntry> {
  if (sanctoralCache.has(type)) return sanctoralCache.get(type)!

  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const data = require(`@/data/loth/sanctoral/${type}.json`)
    sanctoralCache.set(type, data)
    return data
  } catch {
    sanctoralCache.set(type, {})
    return {}
  }
}

export function getSanctoralPropers(celebrationKey: string): SanctoralEntry | null {
  // Search in order: solemnities, feasts, memorials
  for (const type of ['solemnities', 'feasts', 'memorials'] as const) {
    const data = loadSanctoralFile(type)
    if (data[celebrationKey]) return data[celebrationKey]
  }
  return null
}
