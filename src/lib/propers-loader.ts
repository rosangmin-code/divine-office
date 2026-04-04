import type { DayPropers, HourPropers, HourType, LiturgicalSeason, DayOfWeek, SanctoralEntry } from './types'
import fs from 'fs'
import path from 'path'

// Date-keyed overrides (e.g. "dec24") take priority over week-based lookup

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
    const filePath = path.join(process.cwd(), 'src/data/loth/propers', `${fileMap[season]}.json`)
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
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
  dateStr?: string,
): HourPropers | null {
  const weeks = loadSeasonPropers(season)

  // Check date-keyed overrides first (e.g. "dec17" through "dec24")
  if (dateStr) {
    const date = new Date(dateStr + 'T00:00:00Z')
    const month = date.getUTCMonth() + 1
    const dayOfMonth = date.getUTCDate()
    const dateKey = `dec${dayOfMonth}`
    if (month === 12 && dayOfMonth >= 17 && dayOfMonth <= 24) {
      const dateDayPropers = weeks[dateKey]?.[day] ?? weeks[dateKey]?.['SUN']
      if (dateDayPropers) {
        return (dateDayPropers[hour as keyof DayPropers] as HourPropers) ?? null
      }
    }
  }

  const weekKey = String(weekOfSeason)

  // Try exact week first, then fall back to week "1" (Advent weekday propers repeat each week)
  const dayPropers = weeks[weekKey]?.[day] ?? weeks['1']?.[day]
  if (!dayPropers) return null

  return (dayPropers[hour as keyof DayPropers] as HourPropers) ?? null
}

// Cache for sanctoral propers
const sanctoralCache = new Map<string, Record<string, SanctoralEntry>>()

function loadSanctoralFile(type: 'solemnities' | 'feasts' | 'memorials'): Record<string, SanctoralEntry> {
  if (sanctoralCache.has(type)) return sanctoralCache.get(type)!

  try {
    const filePath = path.join(process.cwd(), 'src/data/loth/sanctoral', `${type}.json`)
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
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
