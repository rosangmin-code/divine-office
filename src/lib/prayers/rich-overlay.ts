import fs from 'node:fs'
import path from 'node:path'
import type {
  HourPropers,
  LiturgicalSeason,
  DayOfWeek,
  HourType,
  PrayerText,
} from '../types'
import { resolveSpecialKey } from '../propers-loader'

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

/**
 * Seasonal rich overlay 로더 (3-tier lookup, propers-loader 와 대칭).
 *
 * Lookup 순서 (높은 우선순위부터):
 *   1) **special-key 분기** — `resolveSpecialKey(season, celebrationName, dateStr)`
 *      가 매치하면 `seasonal/{seasonDir}/w{specialKey}-{day}-{hour}.rich.json`
 *      먼저 시도, 부재 시 SUN-슬롯 fallback (`w{specialKey}-SUN-{hour}.rich.json`)
 *      시도. propers-loader.ts L181 의 `weeks[specialKey]?.[day] ??
 *      weeks[specialKey]?.['SUN']` 와 정확히 동일한 패턴 — 평일에 떨어진
 *      movable solemnity (예: 2026-12-25 FRI Christmas Day, 2026-05-14 THU
 *      Ascension) 도 SUN-슬롯 canonical formulary 를 적재한다.
 *      대상:
 *        EASTER         → easterSunday · ascension · pentecost (name)
 *        ORDINARY_TIME  → trinitySunday · corpusChristi ·
 *                         sacredHeart · christTheKing          (name)
 *        CHRISTMAS      → dec25 · jan1 · octave                (date)
 *                         · holyFamily · baptism · epiphany    (name)
 *      **special-key 가 매치된 경우 wk1 fallback 으로 대체 진입하지 않는다**
 *      (#54 회귀 가드: Easter Sunday rich 가 Ascension/Pentecost JSON 위에
 *      덮이는 케이스 차단).
 *   2) **exact weekKey** — `seasonal/{seasonDir}/w{weekKey}-{day}-{hour}.rich.json`.
 *   3) **wk1 fallback** — `seasonal/{seasonDir}/w1-{day}-{hour}.rich.json`.
 *      `propers-loader.ts::getSeasonHourPropers` L141 의 `weeks['1']` fallback
 *      과 대칭. Easter weeks 2-7 평일 (PDF p.700 octave rotation), Lent
 *      weeks 2-5 평일, Advent weeks 2-3 평일에서 JSON propers 가 wk1 로
 *      떨어지는 동안 rich 만 누락되어 발생하던 partial-merge 버그 (#54)
 *      차단. weekKey === '1' 또는 special-key 매치 시 시도하지 않는다.
 */
export function loadSeasonalRichOverlay(
  season: LiturgicalSeason,
  weekKey: string,
  day: DayOfWeek,
  hour: HourType,
  celebrationName?: string | null,
  dateStr?: string | null,
): RichOverlay | null {
  const seasonDir = SEASON_KEBAB[season]
  const baseDir = path.join(
    process.cwd(),
    'src/data/loth/prayers/seasonal',
    seasonDir,
  )

  // Tier 1 — special-key. propers-loader.ts:resolveSpecialKey 가 (season,
  // celebrationName, dateStr) 셋 중 적절한 신호로 매치 — Christmas 의
  // dec25/jan1/octave 는 dateStr 기반, 그 외는 celebrationName 기반.
  const specialKey = resolveSpecialKey(season, celebrationName, dateStr)
  if (specialKey) {
    // Day-specific 우선, SUN-슬롯 fallback. propers-loader 의
    // `weeks[specialKey]?.[day] ?? weeks[specialKey]?.['SUN']` 와 동일한
    // 우선순위. 현재 디스크에는 SUN-슬롯 파일만 authored 되어 있어 평일
    // movable solemnity (Christmas FRI, Ascension THU 등) 에서도
    // SUN-슬롯 rich 가 적재된다.
    const dayPath = path.join(
      baseDir,
      `w${specialKey}-${day}-${hour}.rich.json`,
    )
    const dayOverlay = readOverlayFile(dayPath)
    if (dayOverlay) return dayOverlay
    if (day !== 'SUN') {
      const sunPath = path.join(
        baseDir,
        `w${specialKey}-SUN-${hour}.rich.json`,
      )
      const sunOverlay = readOverlayFile(sunPath)
      if (sunOverlay) return sunOverlay
    }
    // 디스크 파일 부재 시에도 fall-through 하지 않는다 — propers-loader 가
    // wk1 fallback 으로 가지 않는 것과 동일. #54 회귀 가드 보존.
    return null
  }

  // Tier 2 — exact weekKey.
  const exact = path.join(baseDir, `w${weekKey}-${day}-${hour}.rich.json`)
  const direct = readOverlayFile(exact)
  if (direct) return direct

  // Tier 3 — wk1 fallback. weekKey === '1' 자기 자신은 시도 X.
  if (weekKey === '1') return null
  const fallback = path.join(baseDir, `w1-${day}-${hour}.rich.json`)
  return readOverlayFile(fallback)
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

/**
 * Psalter commons rich overlay — 시즌 중립 4주 시편 주간 공통문 영역.
 * `getPsalterCommons(psalterWeek, day, hour)` 가 내려주는 shortReading /
 * responsory / intercessions / concludingPrayer / gospelCanticleAntiphon
 * 의 PDF 원형 마크업이 여기에 들어간다. 우선순위는 seasonal 보다 낮음 —
 * 시즌 propers 가 같은 필드를 갖고 있으면 seasonal 이 이긴다.
 */
export function loadPsalterCommonsRichOverlay(
  psalterWeek: number | string,
  day: DayOfWeek,
  hour: HourType,
): RichOverlay | null {
  const filePath = path.join(
    process.cwd(),
    'src/data/loth/prayers/commons/psalter',
    `w${psalterWeek}-${day}-${hour}.rich.json`,
  )
  return readOverlayFile(filePath)
}

/**
 * Compline commons rich overlay — `ordinarium/compline.json` 의 7일치
 * shortReading / responsory / concludingPrayer 등 nested 구조의 PDF 원형
 * 마크업. 시즌·주간 무관하게 요일로만 키.
 */
export function loadComplineCommonsRichOverlay(
  day: DayOfWeek,
): RichOverlay | null {
  const filePath = path.join(
    process.cwd(),
    'src/data/loth/prayers/commons/compline',
    `${day}.rich.json`,
  )
  return readOverlayFile(filePath)
}

/**
 * 중앙 hymn 카탈로그 조회.
 * `src/data/loth/prayers/hymns/{number}.rich.json` 은 hymn number 로 공유되는
 * 카탈로그 — 여러 (season, week, day, hour) 가 같은 rich 를 재사용한다.
 * 반환 형태는 `{ hymnRich: PrayerText }` 이므로 RichOverlay 로 그대로 읽고
 * 필드만 꺼낸다.
 */
export function loadHymnRichOverlay(hymnNumber: number | string): PrayerText | null {
  const filePath = path.join(
    process.cwd(),
    'src/data/loth/prayers/hymns',
    `${hymnNumber}.rich.json`,
  )
  const overlay = readOverlayFile(filePath)
  return overlay?.hymnRich ?? null
}

// ── psalter-texts 카탈로그 로더 (FR-153f) ─────────────────────────────
//
// 137 refs 의 stanzasRich 가 한 파일 `prayers/commons/psalter-texts.rich.json`
// 에 있다. per-ref 파일이 아니므로 기존 loader 들과 달리 **카탈로그 전체를
// mtime 키로 메모이즈** 하고 ref 조회는 O(1) 맵 lookup.

type PsalterTextsCatalog = Record<
  string,
  { stanzasRich?: PrayerText; psalmPrayerRich?: PrayerText }
>
type PsalterTextsCacheEntry = { mtimeMs: number; catalog: PsalterTextsCatalog | null }
const psalterTextsCache = new Map<string, PsalterTextsCacheEntry>()

function loadPsalterTextsCatalog(): PsalterTextsCatalog | null {
  const filePath = path.join(
    process.cwd(),
    'src/data/loth/prayers/commons/psalter-texts.rich.json',
  )
  let mtimeMs = 0
  try {
    mtimeMs = fs.statSync(filePath).mtimeMs
  } catch (error) {
    if (isEnoent(error)) {
      psalterTextsCache.set(filePath, { mtimeMs: 0, catalog: null })
      return null
    }
    console.error(`[rich-overlay] stat failed for ${filePath}:`, error)
    return null
  }
  const cached = psalterTextsCache.get(filePath)
  if (cached && cached.mtimeMs === mtimeMs) return cached.catalog
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
      console.error(`[rich-overlay] ${filePath} is not a JSON object`)
      psalterTextsCache.set(filePath, { mtimeMs, catalog: null })
      return null
    }
    const catalog = raw as PsalterTextsCatalog
    psalterTextsCache.set(filePath, { mtimeMs, catalog })
    return catalog
  } catch (error) {
    console.error(`[rich-overlay] failed to load ${filePath}:`, error)
    return null
  }
}

/**
 * 시편/찬가 본문의 rich stanzasRich 오버레이 조회. ref (예: "Psalm 63:2-9")
 * 를 키로 카탈로그에서 `stanzasRich` PrayerText 를 반환한다. 없으면 null →
 * 호출자는 legacy `stanzas: string[][]` 경로로 fallback 한다.
 */
export function loadPsalterTextRich(ref: string): PrayerText | null {
  const catalog = loadPsalterTextsCatalog()
  if (!catalog) return null
  const entry = catalog[ref]
  return entry?.stanzasRich ?? null
}

/**
 * 시편 본문 말미에 붙는 `psalmPrayer` 의 rich 오버레이 조회. ref (예:
 * "Psalm 63:2-9") 로 카탈로그에서 `psalmPrayerRich` PrayerText 를 반환한다.
 * 없으면 null → 호출자는 legacy plain `psalmPrayer: string` 경로로 fallback.
 * FR-153h.
 */
export function loadPsalterTextPsalmPrayerRich(ref: string): PrayerText | null {
  const catalog = loadPsalterTextsCatalog()
  if (!catalog) return null
  const entry = catalog[ref]
  return entry?.psalmPrayerRich ?? null
}

export function __resetRichOverlayCache(): void {
  overlayCache.clear()
  psalterTextsCache.clear()
}
