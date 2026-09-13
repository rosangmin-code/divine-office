import romcal from 'romcal'
import type { LiturgicalDayInfo, LiturgicalSeason, DayOfWeek, CelebrationRank } from './types'
import { getMongoliaDateStr } from './timezone'
import {
  SEASON_MAP,
  COLOR_MAP,
  RANK_MAP,
  SEASON_NAMES_MN,
  COLOR_NAMES_MN,
  MOVABLE_SOLEMNITY_NAMES_MN,
  parseSundayCycle,
  getWeekdayCycle,
  buildLiturgicalNameMn,
} from './mappings'
import { resolveSpecialKey } from './propers-loader'
import { resolveSanctoralForDay } from './sanctoral-resolver'

const DOW_CODES: DayOfWeek[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const DAY_MS = 24 * 60 * 60 * 1000

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

  // P0-3: the sanctoral entry applies only when romcal actually chose that
  // celebration for the date (see `sanctoral-resolver.ts`) — never on a
  // plain Sunday / Triduum day that merely shares the MM-DD.
  const sanctoralName = resolveSanctoralForDay({
    date: dateStr,
    rank,
    romcalType: entry.type,
    romcalKey: entry.key,
  })?.entry.name

  // Movable solemnities (Ascension/Pentecost/Trinity/Corpus Christi/Sacred
  // Heart/Christ the King) lack a fixed MM-DD sanctoral entry, so they
  // need a separate special-key lookup to avoid the weekday fallback name.
  const movableKey =
    rank === 'SOLEMNITY' ? resolveSpecialKey(season, entry.name, dateStr) : null
  const movableSolemnityName = movableKey
    ? MOVABLE_SOLEMNITY_NAMES_MN[movableKey]
    : undefined

  const nameMn = buildLiturgicalNameMn({
    season,
    weekOfSeason,
    dayOfWeek,
    sanctoralName,
    movableSolemnityName,
  })

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
    romcalType: entry.type,
    romcalKey: entry.key,
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

    // romcal 1.3 emits Holy Week (Palm Sunday .. Holy Saturday, incl. the
    // TRIDUUM entries) under the season key 'Holy Week' (with a space — the
    // same key `SEASON_MAP` folds into LENT). It must continue Lent's week
    // count (Palm Sunday = week 6, Triduum = week 6) instead of opening a
    // new season. The name checks are a belt-and-braces fallback only: the
    // Triduum names ('Holy Thursday', 'Good Friday', 'Holy Saturday/Easter
    // Vigil') do NOT contain 'Holy Week', so the key comparison is what
    // keeps them on week 6 (P0-2, docs/bug-reports/2026-09-13-triduum-*).
    const isHolyWeek = seasonKey === 'Holy Week' || entry.name.includes('Holy Week') || entry.name === 'Palm Sunday'
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
  // Ordinary Time uses its own liturgical week numbering (otWeek, 1..34,
  // anchored on Christ the King) that differs from the season-sequence
  // counter computed above (which restarts at 1 after Pentecost and lags
  // the liturgical week by one before Lent). Every downstream consumer —
  // `propers/ordinary-time.json weeks[N]`, the seasonal rich overlays
  // `w{N}-SUN-*`, hymn rotation, first-vespers `nextWeek` — is keyed by the
  // LITURGICAL week, so once otWeek is known it becomes the single
  // `weekOfSeason` value for OT days (P0-1, docs/bug-reports/2026-09-13-
  // ot-sunday-propers-weekofseason.md). Non-OT seasons keep the counter.
  // nameMn is refreshed at the same time so the label matches.
  for (const day of results) {
    if (day.season !== 'ORDINARY_TIME') continue
    if (day.otWeek !== undefined) day.weekOfSeason = day.otWeek
    const dateObj = new Date(day.date + 'T00:00:00Z')
    const dow = DOW_CODES[dateObj.getUTCDay()]
    const sanctoralName = resolveSanctoralForDay(day)?.entry.name
    const movableKey =
      day.rank === 'SOLEMNITY'
        ? resolveSpecialKey(day.season, day.name, day.date)
        : null
    const movableSolemnityName = movableKey
      ? MOVABLE_SOLEMNITY_NAMES_MN[movableKey]
      : undefined
    day.nameMn = buildLiturgicalNameMn({
      season: day.season,
      weekOfSeason: day.weekOfSeason,
      dayOfWeek: dow,
      sanctoralName,
      movableSolemnityName,
    })
  }

  yearCache.set(year, results)
  return results
}

function assignOTWeeks(days: LiturgicalDayInfo[]): void {
  const advent1 = days.find((day) => {
    if (day.season !== 'ADVENT') return false
    return utcDate(day.date).getUTCDay() === 0
  })
  const christTheKingAnchor = advent1
    ? addDays(utcDate(advent1.date), -7)
    : undefined

  let index = 0
  while (index < days.length) {
    if (days[index].season !== 'ORDINARY_TIME') {
      index++
      continue
    }

    const start = index
    while (index < days.length && days[index].season === 'ORDINARY_TIME') {
      index++
    }
    const segment = days.slice(start, index)
    const hasPriorEaster = days
      .slice(0, start)
      .some((day) => day.season === 'EASTER')

    if (hasPriorEaster && christTheKingAnchor) {
      for (const day of segment) {
        const sundayAnchor = weekStartSunday(utcDate(day.date))
        const weeksBack = diffWeeks(sundayAnchor, christTheKingAnchor)
        day.otWeek = 34 - weeksBack
      }
      continue
    }

    const firstSundayAnchor = weekStartSunday(utcDate(segment[0].date))
    for (const day of segment) {
      const sundayAnchor = weekStartSunday(utcDate(day.date))
      day.otWeek = diffWeeks(firstSundayAnchor, sundayAnchor) + 1
    }
  }
}

function utcDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00Z')
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

function weekStartSunday(date: Date): Date {
  return addDays(date, -date.getUTCDay())
}

function diffWeeks(earlier: Date, later: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / (7 * DAY_MS))
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
