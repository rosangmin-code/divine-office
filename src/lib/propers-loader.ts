import type { DayPropers, HourPropers, HourType, LiturgicalSeason, DayOfWeek, SanctoralEntry, HymnCandidate } from './types'
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
  celebrationName?: string,
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

  // Check Easter special keys (easterSunday, ascension, pentecost)
  if (season === 'EASTER' && celebrationName) {
    const lower = celebrationName.toLowerCase()
    let specialKey: string | null = null
    if (lower.includes('easter sunday') || lower === 'easter sunday') specialKey = 'easterSunday'
    else if (lower.includes('ascension')) specialKey = 'ascension'
    else if (lower.includes('pentecost')) specialKey = 'pentecost'

    if (specialKey) {
      const specialDayPropers = weeks[specialKey]?.[day] ?? weeks[specialKey]?.['SUN']
      if (specialDayPropers) {
        return (specialDayPropers[hour as keyof DayPropers] as HourPropers) ?? null
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

// --- Hymn loader ---

interface HymnEntry { title: string; text: string; page?: number }
interface HymnsIndex {
  hymns: { number: number; title: string }[]
  seasonalAssignments: Record<string, Record<string, number[]>>
}

let _hymns: Record<string, HymnEntry> | null = null
let _hymnsIndex: HymnsIndex | null = null

function loadHymns(): Record<string, HymnEntry> {
  if (_hymns) return _hymns
  try {
    const filePath = path.join(process.cwd(), 'src/data/loth/ordinarium/hymns.json')
    _hymns = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    return _hymns!
  } catch {
    _hymns = {}
    return _hymns
  }
}

function loadHymnsIndex(): HymnsIndex {
  if (_hymnsIndex) return _hymnsIndex
  const filePath = path.join(process.cwd(), 'src/data/loth/ordinarium/hymns-index.json')
  _hymnsIndex = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  return _hymnsIndex!
}

const DAY_INDEX: Record<DayOfWeek, number> = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 }

function getCandidateNumbers(
  assignments: Record<string, Record<string, number[]>>,
  season: LiturgicalSeason,
  hour: HourType,
): number[] {
  switch (season) {
    case 'ADVENT':
      return assignments.ADVENT?.hymns ?? []
    case 'CHRISTMAS':
      return assignments.CHRISTMAS?.holyFamily ?? []
    case 'LENT':
      return assignments.LENT?.general ?? []
    case 'EASTER':
      return assignments.EASTER?.general ?? []
    case 'ORDINARY_TIME':
      if (hour === 'lauds') return assignments.ORDINARY_TIME?.lauds ?? []
      if (hour === 'vespers') return assignments.ORDINARY_TIME?.vespers ?? []
      if (hour === 'compline') return assignments.ORDINARY_TIME?.compline ?? []
      return assignments.ORDINARY_TIME?.lauds ?? []
    default:
      return []
  }
}

function computeRotationIndex(weekOfSeason: number, dayOfWeek: DayOfWeek, count: number): number {
  const raw = (weekOfSeason - 1) * 7 + DAY_INDEX[dayOfWeek]
  return ((raw % count) + count) % count
}

/** Resolve candidate numbers to valid entries (with text), filtering out missing/empty ones. */
function resolveValidCandidates(candidateNums: number[], hymns: Record<string, HymnEntry>): { num: number; entry: HymnEntry }[] {
  return candidateNums
    .map(num => {
      const entry = hymns[String(num)]
      if (!entry || !entry.text) return null
      return { num, entry }
    })
    .filter((c): c is { num: number; entry: HymnEntry } => c !== null)
}

export function getHymnForHour(
  season: LiturgicalSeason,
  weekOfSeason: number,
  dayOfWeek: DayOfWeek,
  hour: HourType,
): HymnEntry | null {
  const index = loadHymnsIndex()
  const hymns = loadHymns()
  const candidateNums = getCandidateNumbers(index.seasonalAssignments, season, hour)
  const valid = resolveValidCandidates(candidateNums, hymns)

  if (valid.length === 0) return null

  // Deterministic daily rotation based on week of season + day of week
  const idx = computeRotationIndex(weekOfSeason, dayOfWeek, valid.length)
  return valid[idx].entry
}

export function getHymnCandidatesForHour(
  season: LiturgicalSeason,
  weekOfSeason: number,
  dayOfWeek: DayOfWeek,
  hour: HourType,
): { candidates: HymnCandidate[]; selectedIndex: number } | null {
  const index = loadHymnsIndex()
  const hymns = loadHymns()
  const candidateNums = getCandidateNumbers(index.seasonalAssignments, season, hour)
  const valid = resolveValidCandidates(candidateNums, hymns)

  if (valid.length === 0) return null

  const resolved: HymnCandidate[] = valid.map(({ num, entry }) => {
    const c: HymnCandidate = { number: num, title: entry.title, text: entry.text }
    if (entry.page != null) c.page = entry.page
    return c
  })

  const selectedIndex = computeRotationIndex(weekOfSeason, dayOfWeek, resolved.length)

  return { candidates: resolved, selectedIndex }
}
