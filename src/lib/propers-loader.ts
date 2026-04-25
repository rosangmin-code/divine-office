import type { DayPropers, FirstVespersPropers, HourPropers, HourType, LiturgicalSeason, DayOfWeek, SanctoralEntry, HymnCandidate, OptionalMemorialEntry } from './types'
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

/**
 * Resolve a romcal `celebrationName` to a season-propers special-key
 * bucket name, when the (season, name) pair identifies a movable
 * observance with its own propers block outside the per-week 1..N cycle.
 *
 * Returns null for celebrations that should fall through to the normal
 * `weeks[weekOfSeason]` lookup.
 *
 * Covered observances:
 *   EASTER         → easterSunday · ascension · pentecost
 *   ORDINARY_TIME  → trinitySunday · corpusChristi · sacredHeart · christTheKing
 *
 * Name matching is permissive (`lower.includes(fragment)`) so romcal
 * localisation drift ("Sacred Heart of Jesus" vs "The Most Sacred
 * Heart of Jesus" etc.) does not silently bypass the lookup.
 *
 * FR-156 Phase 4a (task #23): adds OT keys so movable OT solemnities
 * (Trinity Sunday, Corpus Christi, Sacred Heart, Christ the King) can
 * resolve to their own First Vespers / Hour Propers blocks. Data
 * injection lands in Phase 4b (task #24) — Phase 4a is resolver-only.
 */
export function resolveSpecialKey(
  season: LiturgicalSeason,
  celebrationName: string | undefined | null,
): string | null {
  if (!celebrationName) return null
  const lower = celebrationName.toLowerCase()
  if (season === 'EASTER') {
    if (lower.includes('easter sunday')) return 'easterSunday'
    if (lower.includes('ascension')) return 'ascension'
    if (lower.includes('pentecost')) return 'pentecost'
    return null
  }
  if (season === 'ORDINARY_TIME') {
    if (lower.includes('trinity')) return 'trinitySunday'
    if (lower.includes('corpus christi') || lower.includes('body and blood')) return 'corpusChristi'
    if (lower.includes('sacred heart')) return 'sacredHeart'
    if (lower.includes('christ the king') || lower.includes('king of the universe')) return 'christTheKing'
    return null
  }
  return null
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

  // Check movable-observance special keys (Easter: easterSunday /
  // ascension / pentecost; OT: trinitySunday / corpusChristi /
  // sacredHeart / christTheKing). See `resolveSpecialKey` for the
  // season/name matrix.
  const specialKey = resolveSpecialKey(season, celebrationName)
  if (specialKey) {
    const specialDayPropers = weeks[specialKey]?.[day] ?? weeks[specialKey]?.['SUN']
    if (specialDayPropers) {
      return (specialDayPropers[hour as keyof DayPropers] as HourPropers) ?? null
    }
  }

  const weekKey = String(weekOfSeason)

  // Try exact week first, then fall back to week "1". Reflects the source
  // PDF layout: Easter octave (PDF p.700) is the only authored weekday
  // formulary for weeks 2-7, and Advent / Lent weekdays similarly repeat
  // their wk1 weekday entries (Advent's "weekday repeat" + Lent wk2-5
  // mirroring). The rich overlay path (`loadSeasonalRichOverlay`,
  // src/lib/prayers/rich-overlay.ts L77+) implements the SAME fallback so
  // JSON propers + rich body cannot drift (#54 partial-merge fix).
  // Special-key dates — Easter ascension/easterSunday/pentecost, OT
  // trinitySunday/corpusChristi/sacredHeart/christTheKing — are matched
  // earlier by `resolveSpecialKey` (L123 above) and bypass this fallback;
  // their seasonal rich counterparts live in
  // `seasonal/{season}/w{specialKey}-{day}-{hour}.rich.json` and are
  // picked up by Tier 1 of `loadSeasonalRichOverlay`.
  const dayPropers = weeks[weekKey]?.[day] ?? weeks['1']?.[day]
  if (!dayPropers) return null

  const hourData = (dayPropers[hour as keyof DayPropers] as HourPropers | undefined) ?? null
  if (hourData) return hourData

  // Per-hour fallback — FR-156 Phase 2 may create `weeks[N].SUN` entries
  // that carry only `firstVespers` (no regular vespers/lauds/vespers2).
  // Without this extra fallback, a missing hour on an existing day entry
  // masks the weeks['1'] fallback above, breaking regular Sunday
  // rendering for weeks>1 in seasons where only weeks['1'] previously
  // existed (Advent, Lent). Safe no-op for seasons that already populate
  // weeks[N] fully (Ordinary Time).
  if (weekKey !== '1') {
    const week1Day = weeks['1']?.[day] as DayPropers | undefined
    const week1Hour = week1Day?.[hour as keyof DayPropers] as HourPropers | undefined
    return week1Hour ?? null
  }
  return null
}

/**
 * Look up the First Vespers of Sunday proper for a given season/week.
 *
 * Saturday evening physically sings the 1st Vespers of the upcoming Sunday
 * (Roman Rite). Callers pass the Sunday's week-of-season (i.e. the NEXT
 * week relative to the Saturday's own `weekOfSeason`) to retrieve
 * `weeks[weekKey].SUN.firstVespers` if present. Returns `null` when the
 * season JSON has no firstVespers authored for that Sunday — callers
 * should then fall through to `getSeasonHourPropers(... 'SUN', 'vespers'
 * ...)` (the regular/2nd-Vespers propers) so existing behaviour is
 * preserved.
 *
 * Phase 1 (task #19): resolver wiring only — no propers JSON carries a
 * firstVespers slot yet. Phase 2 (task #20) will populate it via PDF
 * extraction, and this helper then becomes the active lookup path.
 */
export function getSeasonFirstVespers(
  season: LiturgicalSeason,
  sundayWeekOfSeason: number,
  dateStr?: string,
  celebrationName?: string,
): FirstVespersPropers | null {
  const weeks = loadSeasonPropers(season)

  // Date-keyed overrides (ADVENT 12/17-24) — check `firstVespers` on the
  // Sunday entry under the date key. Rare but parallels the regular
  // propers lookup.
  if (dateStr) {
    const date = new Date(dateStr + 'T00:00:00Z')
    const month = date.getUTCMonth() + 1
    const dayOfMonth = date.getUTCDate()
    const dateKey = `dec${dayOfMonth}`
    if (month === 12 && dayOfMonth >= 17 && dayOfMonth <= 24) {
      const dateDayPropers = weeks[dateKey]?.['SUN']
      const fv = (dateDayPropers as DayPropers | undefined)?.firstVespers
      if (fv) return fv
    }
  }

  // Movable-observance special keys — same pattern as
  // `getSeasonHourPropers`, delegated to `resolveSpecialKey`. Covers
  // both Easter movables (ascension / pentecost) and OT movables
  // (trinitySunday / corpusChristi / sacredHeart / christTheKing)
  // added in FR-156 Phase 4a.
  //
  // Phase 4b data-injection hook: once an OT movable carries a
  // `firstVespers` entry under `weeks['<specialKey>'].SUN.firstVespers`,
  // this lookup returns it unchanged. No caller changes needed.
  const specialKey = resolveSpecialKey(season, celebrationName)
  if (specialKey) {
    const specialDayPropers = weeks[specialKey]?.['SUN']
    const fv = (specialDayPropers as DayPropers | undefined)?.firstVespers
    if (fv) return fv
  }

  const weekKey = String(sundayWeekOfSeason)
  const dayPropers = weeks[weekKey]?.['SUN'] ?? weeks['1']?.['SUN']
  if (!dayPropers) return null
  const fv = (dayPropers as DayPropers).firstVespers
  if (fv) return fv
  // Parallel per-hour fallback — if weeks[weekKey].SUN exists but is
  // missing firstVespers, try weeks['1'].SUN.firstVespers. Mirrors the
  // fallback added to getSeasonHourPropers (FR-156 Phase 2).
  if (weekKey !== '1') {
    const week1FV = (weeks['1']?.['SUN'] as DayPropers | undefined)?.firstVespers
    return week1FV ?? null
  }
  return null
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
