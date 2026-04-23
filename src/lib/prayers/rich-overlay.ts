import fs from 'node:fs'
import path from 'node:path'
import type {
  HourPropers,
  LiturgicalSeason,
  DayOfWeek,
  HourType,
} from '../types'

export type RichOverlay = Partial<Pick<HourPropers,
  | 'shortReadingRich'
  | 'responsoryRich'
  | 'intercessionsRich'
  | 'concludingPrayerRich'
  | 'alternativeConcludingPrayerRich'
  | 'hymnRich'
>>

const SEASON_KEBAB: Record<LiturgicalSeason, string> = {
  ADVENT: 'advent',
  CHRISTMAS: 'christmas',
  LENT: 'lent',
  EASTER: 'easter',
  ORDINARY_TIME: 'ordinary-time',
}

// Cache entry tracks the file's mtime so callers see fresh content when the
// overlay JSON is edited (dev HMR doesn't reset module state, and in prod we
// still want overlay updates to take effect after atomic rename). Missing
// files cache as { mtimeMs: 0, overlay: null } and are cheaply re-checked.
type CacheEntry = { mtimeMs: number; overlay: RichOverlay | null }
const overlayCache = new Map<string, CacheEntry>()

function isEnoent(error: unknown): boolean {
  return (error as NodeJS.ErrnoException)?.code === 'ENOENT'
}

// Shallow shape check — the rich JSON is trusted data but we guard against
// accidental array / primitive payloads poisoning downstream spread.
function asOverlay(raw: unknown, filePath: string): RichOverlay | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    console.error(`[rich-overlay] ${filePath} is not a JSON object`)
    return null
  }
  return raw as RichOverlay
}

function readOverlayFile(filePath: string): RichOverlay | null {
  let mtimeMs = 0
  try {
    mtimeMs = fs.statSync(filePath).mtimeMs
  } catch (error) {
    if (isEnoent(error)) {
      overlayCache.set(filePath, { mtimeMs: 0, overlay: null })
      return null
    }
    console.error(`[rich-overlay] stat failed for ${filePath}:`, error)
    return null
  }

  const cached = overlayCache.get(filePath)
  if (cached && cached.mtimeMs === mtimeMs) return cached.overlay

  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    const overlay = asOverlay(raw, filePath)
    overlayCache.set(filePath, { mtimeMs, overlay })
    return overlay
  } catch (error) {
    console.error(`[rich-overlay] failed to load ${filePath}:`, error)
    return null
  }
}

export function loadSeasonalRichOverlay(
  season: LiturgicalSeason,
  weekKey: string,
  day: DayOfWeek,
  hour: HourType,
): RichOverlay | null {
  const seasonDir = SEASON_KEBAB[season]
  const filePath = path.join(
    process.cwd(),
    'src/data/loth/prayers/seasonal',
    seasonDir,
    `w${weekKey}-${day}-${hour}.rich.json`,
  )
  return readOverlayFile(filePath)
}

export function loadSanctoralRichOverlay(
  celebrationKey: string,
  hour: HourType,
): RichOverlay | null {
  const filePath = path.join(
    process.cwd(),
    'src/data/loth/prayers/sanctoral',
    `${celebrationKey}-${hour}.rich.json`,
  )
  return readOverlayFile(filePath)
}

export function __resetRichOverlayCache(): void {
  overlayCache.clear()
}
