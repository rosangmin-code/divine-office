import romcal from 'romcal'
import type { LiturgicalDayInfo, LiturgicalSeason, DayOfWeek, CelebrationRank } from './types'
import { getMongoliaDateStr } from './timezone'
import {
  SEASON_MAP,
  COLOR_MAP,
  RANK_MAP,
  SEASON_NAMES_MN,
  COLOR_NAMES_MN,
  parseSundayCycle,
  getWeekdayCycle,
  buildLiturgicalNameMn,
} from './mappings'
import { getSanctoralPropers } from './propers-loader'

const DOW_CODES: DayOfWeek[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

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
  const rank: CelebrationRank = RANK_MAP[entry.type] || 'WEEKDAY'

  const dateStr = entry.moment.slice(0, 10)
  const dateObj = new Date(dateStr + 'T00:00:00Z')
  const dayOfWeek = DOW_CODES[dateObj.getUTCDay()]

  // Extract psalter week from romcal (1-4 cycle)
  // romcal returns 5 for Easter Octave; clamp to 1-4 with modular arithmetic
  const rawPsalterWeek = entry.data.meta.psalterWeek?.key ?? 1
  const clampedWeek = rawPsalterWeek > 0 ? rawPsalterWeek : 1
  const psalterWeek = (((clampedWeek - 1) % 4) + 1) as 1 | 2 | 3 | 4

  const mmdd = `${String(dateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(dateObj.getUTCDate()).padStart(2, '0')}`
  const sanctoralName =
    rank === 'SOLEMNITY' || rank === 'FEAST' || rank === 'MEMORIAL'
      ? getSanctoralPropers(mmdd)?.name
      : undefined

  const nameMn = buildLiturgicalNameMn({ season, weekOfSeason, dayOfWeek, sanctoralName })

  return {
    date: dateStr,
    name: entry.name,
    nameMn,
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

  let entries: RomcalEntry[]
  try {
    entries = romcal.calendarFor({ year, locale: 'en' }) as unknown as RomcalEntry[]
  } catch (error) {
    console.error(`[calendar] romcal.calendarFor failed for year ${year}:`, error)
    return []
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    console.error(`[calendar] romcal returned unexpected data for year ${year}`)
    return []
  }

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
  // OT uses its own liturgical week numbering (otWeek) that differs from the
  // season-sequence counter used elsewhere. Refresh nameMn for OT days now that
  // otWeek is known so the Mongolian label matches the liturgical week.
  for (const day of results) {
    if (day.season !== 'ORDINARY_TIME') continue
    const dateObj = new Date(day.date + 'T00:00:00Z')
    const dow = DOW_CODES[dateObj.getUTCDay()]
    const mmdd = `${String(dateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(dateObj.getUTCDate()).padStart(2, '0')}`
    const sanctoralName =
      day.rank === 'SOLEMNITY' || day.rank === 'FEAST' || day.rank === 'MEMORIAL'
        ? getSanctoralPropers(mmdd)?.name
        : undefined
    const effectiveWeek = day.otWeek ?? day.weekOfSeason
    day.nameMn = buildLiturgicalNameMn({
      season: day.season,
      weekOfSeason: effectiveWeek,
      dayOfWeek: dow,
      sanctoralName,
    })
  }

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
  const dateStr = getMongoliaDateStr()
  const result = getLiturgicalDay(dateStr)
  if (!result) {
    throw new Error(`No liturgical data found for today: ${dateStr}`)
  }
  return result
}
