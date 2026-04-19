import type { DayPropers, HourPropers, HourType, LiturgicalSeason, DayOfWeek, SanctoralEntry, HymnCandidate, OptionalMemorialEntry } from './types'
import fs from 'fs'
import path from 'path'
import {
  SeasonPropersFileSchema,
  SanctoralFileSchema,
  OptionalMemorialsFileSchema,
  HymnsFileSchema,
  HymnsIndexFileSchema,
  safeParse,
} from './schemas'

function isEnoent(error: unknown): boolean {
  return (error as NodeJS.ErrnoException)?.code === 'ENOENT'
}

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
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    safeParse(SeasonPropersFileSchema, raw, `propers/${fileMap[season]}.json`)
    const weeks = raw.weeks ?? {}
    seasonCache.set(season, weeks)
    return weeks
  } catch (error) {
    if (isEnoent(error)) {
      // File doesn't exist yet — cache the empty result permanently.
      seasonCache.set(season, {})
      return {}
    }
    // Transient I/O or malformed JSON — don't poison the cache.
    console.error(`[propers-loader] failed to load season ${season}:`, error)
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
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    safeParse(SanctoralFileSchema, raw, `sanctoral/${type}.json`)
    sanctoralCache.set(type, raw)
    return raw
  } catch (error) {
    if (isEnoent(error)) {
      sanctoralCache.set(type, {})
      return {}
    }
    console.error(`[propers-loader] failed to load sanctoral ${type}:`, error)
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

/**
 * Lookup the memorial entry that replaces the weekday when the user chooses
 * the Blessed Virgin Mary on Saturday. Delegates to the existing `memorials`
 * sanctoral file so we keep a single source of truth.
 */
export function getSaturdayMaryMemorial(): SanctoralEntry | null {
  const data = loadSanctoralFile('memorials')
  return data['saturday-mary'] ?? null
}

// --- Optional memorials loader ---

let _optionalMemorials: Record<string, OptionalMemorialEntry> | null = null

export function loadOptionalMemorials(): Record<string, OptionalMemorialEntry> {
  if (_optionalMemorials) return _optionalMemorials
  try {
    const filePath = path.join(process.cwd(), 'src/data/loth/sanctoral', 'optional-memorials.json')
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    safeParse(OptionalMemorialsFileSchema, raw, 'optional-memorials.json')
    _optionalMemorials = raw as Record<string, OptionalMemorialEntry>
    return _optionalMemorials
  } catch (error) {
    if (isEnoent(error)) {
      _optionalMemorials = {}
      return _optionalMemorials
    }
    console.error('[propers-loader] failed to load optional-memorials.json:', error)
    return {}
  }
}

export function getOptionalMemorial(id: string): OptionalMemorialEntry | null {
  return loadOptionalMemorials()[id] ?? null
}

/** All optional memorials registered on the given MM-DD. */
export function getOptionalMemorialsForDate(mmdd: string): { id: string; entry: OptionalMemorialEntry }[] {
  const all = loadOptionalMemorials()
  const result: { id: string; entry: OptionalMemorialEntry }[] = []
  for (const [id, entry] of Object.entries(all)) {
    if (entry.mmdd === mmdd) result.push({ id, entry })
  }
  return result
}

/** Test hook: reset the cached optional memorials (unit test use only). */
export function __resetOptionalMemorialsCache(): void {
  _optionalMemorials = null
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
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    safeParse(HymnsFileSchema, raw, 'hymns.json')
    _hymns = raw as Record<string, HymnEntry>
    return _hymns
  } catch (error) {
    if (isEnoent(error)) {
      _hymns = {}
      return _hymns
    }
    console.error('[propers-loader] failed to load hymns.json:', error)
    return {}
  }
}

function loadHymnsIndex(): HymnsIndex {
  if (_hymnsIndex) return _hymnsIndex
  try {
    const filePath = path.join(process.cwd(), 'src/data/loth/ordinarium/hymns-index.json')
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    safeParse(HymnsIndexFileSchema, raw, 'hymns-index.json')
    _hymnsIndex = raw as HymnsIndex
    return _hymnsIndex
  } catch (error) {
    if (isEnoent(error)) {
      const empty: HymnsIndex = { hymns: [], seasonalAssignments: {} }
      _hymnsIndex = empty
      return empty
    }
    console.error('[propers-loader] failed to load hymns-index.json:', error)
    // Don't cache — the next call retries.
    return { hymns: [], seasonalAssignments: {} }
  }
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
