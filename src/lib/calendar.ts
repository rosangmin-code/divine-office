import romcal from 'romcal'
import type { LiturgicalDayInfo, LiturgicalSeason } from './types'
import {
  SEASON_MAP,
  COLOR_MAP,
  RANK_MAP,
  SEASON_NAMES_MN,
  COLOR_NAMES_MN,
  parseSundayCycle,
  getWeekdayCycle,
} from './mappings'

interface RomcalEntry {
  moment: string
  type: string
  name: string
  data: {
    season: { key: string; value: string }
    meta: {
      liturgicalColor: { key: string }
      cycle: { value: string }
      psalterWeek: { key: number }
    }
    calendar: { week: number; day: number }
  }
  key: string
}

// In-memory cache for yearly calendars
const yearCache = new Map<number, LiturgicalDayInfo[]>()

function mapEntry(entry: RomcalEntry, weekOfSeason: number, year: number): LiturgicalDayInfo {
  const season: LiturgicalSeason = SEASON_MAP[entry.data.season.key] || 'ORDINARY_TIME'
  const color = COLOR_MAP[entry.data.meta.liturgicalColor.key] || 'GREEN'
  const rank = RANK_MAP[entry.type] || 'WEEKDAY'

  const dateStr = entry.moment.slice(0, 10)

  // Extract psalter week from romcal (1-4 cycle)
  const psalterWeek = (entry.data.meta.psalterWeek?.key ?? 1) as 1 | 2 | 3 | 4

  return {
    date: dateStr,
    name: entry.name,
    season,
    seasonMn: SEASON_NAMES_MN[season],
    color,
    colorMn: COLOR_NAMES_MN[color],
    rank,
    sundayCycle: parseSundayCycle(entry.data.meta.cycle.value),
    weekdayCycle: getWeekdayCycle(year),
    weekOfSeason,
    psalterWeek,
  }
}

export function getCalendarForYear(year: number): LiturgicalDayInfo[] {
  if (yearCache.has(year)) {
    return yearCache.get(year)!
  }

  const entries = romcal.calendarFor({ year, locale: 'en' }) as unknown as RomcalEntry[]

  // Track week of season
  let currentSeasonKey = ''
  let weekOfSeason = 0
  let lastSundaySeen = false

  const results = entries.map((entry) => {
    const seasonKey = entry.data.season.key
    const date = new Date(entry.moment)
    const isSunday = date.getUTCDay() === 0

    // Holy Week is sometimes a separate season key in romcal but should continue Lent's week count
    const isHolyWeek = seasonKey === 'HolyWeek' || entry.name.includes('Holy Week') || entry.name === 'Palm Sunday'
    const effectiveSeasonKey = isHolyWeek ? 'Lent' : seasonKey

    if (effectiveSeasonKey !== currentSeasonKey) {
      weekOfSeason = effectiveSeasonKey === 'Lent' ? 0 : 1
      currentSeasonKey = effectiveSeasonKey
      lastSundaySeen = false
    }

    if (isSunday) {
      if (lastSundaySeen || seasonKey === 'Lent') weekOfSeason++
      lastSundaySeen = true
    }

    return mapEntry(entry, weekOfSeason, year)
  })

  assignOTWeeks(results)

  yearCache.set(year, results)
  return results
}

function assignOTWeeks(days: LiturgicalDayInfo[]): void {
  for (const day of days) {
    if (day.season !== 'ORDINARY_TIME') continue
    const m = day.name.match(/(\d+)\w*\s+(?:Sunday|week)\s+of\s+Ordinary\s+Time/i)
    if (m) {
      day.otWeek = parseInt(m[1], 10)
    }
  }

  let currentOTWeek: number | undefined
  for (const day of days) {
    if (day.season !== 'ORDINARY_TIME') {
      currentOTWeek = undefined
      continue
    }
    if (day.otWeek !== undefined) {
      currentOTWeek = day.otWeek
    } else if (currentOTWeek !== undefined) {
      day.otWeek = currentOTWeek
    }
  }
}

export function getLiturgicalDay(dateStr: string): LiturgicalDayInfo | null {
  const date = new Date(dateStr + 'T00:00:00Z')
  const year = date.getUTCFullYear()
  const calendar = getCalendarForYear(year)
  return calendar.find((d) => d.date === dateStr) ?? null
}

export function getToday(): LiturgicalDayInfo {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const result = getLiturgicalDay(dateStr)
  if (!result) {
    throw new Error(`No liturgical data found for today: ${dateStr}`)
  }
  return result
}
