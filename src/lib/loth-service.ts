import type {
  DayOfWeek,
  HourType,
  LiturgicalDayInfo,
  AssembledHour,
  AssembledPsalm,
  PsalmEntry,
  HourPropers,
  HourPsalmody,
  HOUR_NAMES_MN,
  SanctoralEntry,
  CelebrationOption,
} from './types'
import { HOUR_NAMES_MN as hourNamesMn } from './types'
import { getLiturgicalDay, getToday } from './calendar'
import { getPsalterPsalmody, getComplinePsalmody, getFullComplineData, getPsalterCommons } from './psalter-loader'
import { getSeasonHourPropers, getSeasonFirstVespers, getSanctoralPropers, getHymnForHour, getHymnCandidatesForHour } from './propers-loader'
import { resolveCelebration } from './celebrations'
import { resolveRichOverlay } from './prayers/resolver'
import { loadHymnRichOverlay } from './prayers/rich-overlay'

import {
  getAssembler,
  loadOrdinarium,
  dateToDayOfWeek,
  resolvePsalm,
  mergeComplineDefaults,
} from './hours'
import { applySeasonalAntiphon, pickSeasonalVariant } from './hours/seasonal-antiphon'
import { warmBibleCache } from './bible-loader'
import type { HourContext } from './hours'

export interface AssembleHourOptions {
  celebrationId?: string | null
}

/**
 * Main assembly function: given a date and hour, produce the complete prayer.
 */
export async function assembleHour(
  dateStr: string,
  hour: HourType,
  opts: AssembleHourOptions = {},
): Promise<AssembledHour | null> {
  // 0. Pre-warm Bible cache (async I/O, no-op if already loaded)
  await warmBibleCache()

  // 1. Get liturgical day info — optionally overridden by a user-chosen celebration.
  const rawDay = getLiturgicalDay(dateStr)
  if (!rawDay) return null

  const resolved = resolveCelebration(dateStr, opts.celebrationId)
  const selectedOption: CelebrationOption | null = resolved?.option ?? null
  const celebrationOverride: SanctoralEntry | null = resolved?.sanctoralOverride ?? null

  const day: LiturgicalDayInfo = celebrationOverride && selectedOption && !selectedOption.isDefault
    ? {
        ...rawDay,
        name: selectedOption.name,
        nameMn: selectedOption.nameMn,
        rank: selectedOption.rank,
        color: selectedOption.color,
        colorMn: selectedOption.colorMn,
      }
    : rawDay

  const dayOfWeek = dateToDayOfWeek(dateStr)
  const ordinarium = loadOrdinarium()

  // 2. Get base psalmody from 4-week psalter
  let psalmEntries: PsalmEntry[] = []

  if (hour === 'compline') {
    psalmEntries = getComplinePsalmody(dayOfWeek)
  } else {
    try {
      const basePsalmody = getPsalterPsalmody(day.psalterWeek, dayOfWeek, hour)
      psalmEntries = basePsalmody?.psalms ?? []
    } catch {
      psalmEntries = []
    }
  }

  // 3. Get season propers
  //    Saturday vespers = Sunday 1st Vespers per liturgical convention,
  //    so look up Sunday's vespers propers for concluding prayer / gospel canticle antiphon.
  let seasonPropers = getSeasonHourPropers(
    day.season,
    day.weekOfSeason,
    dayOfWeek,
    hour,
    dateStr,
    day.name,
  )

  // Track whether the Saturday→Sunday first-vespers branch applies so the
  // downstream psalm resolver sees Sunday's identity (for pickSeasonalVariant
  // to hit lentSunday[N] / easterSunday[N] / lentPassionSunday). Without
  // this, Saturday evening renders with its own weekday variants and the
  // injected firstVespers seasonal antiphons never surface.
  let effectiveDayOfWeek: DayOfWeek = dayOfWeek
  let effectiveWeekOfSeason: number = day.weekOfSeason
  if (!seasonPropers && dayOfWeek === 'SAT' && hour === 'vespers') {
    // Next day is Sunday. FR-156: prefer the Sunday's dedicated
    // firstVespers propers when authored (Phase 2, task #20). Falls
    // back to the upcoming Sunday's regular vespers propers otherwise.
    const nextWeek = day.weekOfSeason + 1
    const firstVespers = getSeasonFirstVespers(day.season, nextWeek, dateStr, day.name)
      ?? getSeasonFirstVespers(day.season, day.weekOfSeason, dateStr, day.name)
    // Always compute the upcoming Sunday's regular vespers propers —
    // used as standalone fallback when firstVespers is absent, AND as a
    // per-field backstop underneath firstVespers (FR-156 Phase 2).
    // Rationale: the PDF's psalter First Vespers blocks reference the
    // seasonal Sunday propers for gospelCanticleAntiphon and
    // concludingPrayer ("Шад магтаал: үүнийг «Цаг улирлын Онцлог шинж»
    // гэсэн хэсгээс татаж авна"). Rather than duplicate those fields
    // in firstVespers, the extractor omits them and the resolver
    // composes the final HourPropers as firstVespers ⟩ SundayRegular.
    const sundayRegular = getSeasonHourPropers(day.season, nextWeek, 'SUN', 'vespers', dateStr, day.name)
      ?? getSeasonHourPropers(day.season, day.weekOfSeason, 'SUN', 'vespers', dateStr, day.name)
    if (firstVespers) {
      seasonPropers = {
        ...(sundayRegular ?? {}),
        ...firstVespers,
      }
      // First Vespers may carry its own psalm array (distinct from the
      // 4-week psalter Saturday). Override so the resolver downstream
      // resolves 1st-Vespers psalm antiphons + seasonal variants.
      if (firstVespers.psalms && firstVespers.psalms.length > 0) {
        psalmEntries = firstVespers.psalms
      }
      // The liturgical identity of Saturday 1st Vespers IS Sunday —
      // promote dayOfWeek/weekOfSeason so pickSeasonalVariant fires the
      // per-Sunday branches (lentSunday, easterSunday, lentPassionSunday).
      effectiveDayOfWeek = 'SUN'
      effectiveWeekOfSeason = nextWeek
    } else {
      // Pre-Phase-2 path: reuse the upcoming Sunday's regular (2nd) Vespers propers.
      seasonPropers = sundayRegular
    }
  }

  // 4. Get sanctoral propers (if applicable)
  //    When the user has chosen a non-default celebration, its propers take
  //    precedence over whatever sanctoral entry would normally apply.
  const dateObj = new Date(dateStr + 'T00:00:00Z')
  const dateKey = `${String(dateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(dateObj.getUTCDate()).padStart(2, '0')}`
  const sanctoral: SanctoralEntry | null = celebrationOverride
    ?? ((day.rank === 'SOLEMNITY' || day.rank === 'FEAST' || day.rank === 'MEMORIAL')
      ? getSanctoralPropers(dateKey)
      : null)

  // 5. Determine antiphon overrides (sanctoral > season)
  //    For solemnities on the day itself, use vespers2 (Second Vespers) data
  let hourPropers: HourPropers | undefined
  if (hour === 'vespers' && day.rank === 'SOLEMNITY' && sanctoral?.vespers2) {
    hourPropers = sanctoral.vespers2 as HourPropers
  } else {
    hourPropers = sanctoral?.[hour as keyof typeof sanctoral] as HourPropers | undefined
  }
  const antiphonOverrides: Record<string, string> = {
    ...(seasonPropers?.antiphons ?? {}),
    ...(hourPropers?.antiphons ?? {}),
  }

  // 6. Check if sanctoral replaces psalter entirely
  if (sanctoral?.replacesPsalter && sanctoral.properPsalmody) {
    const properPsalmody = sanctoral.properPsalmody[hour as keyof typeof sanctoral.properPsalmody] as HourPsalmody | undefined
    if (properPsalmody) {
      psalmEntries = properPsalmody.psalms
    }
  }

  // 7. Resolve psalm texts — use allSettled so a single bad psalm (e.g. a
  // scripture reference that fails to parse or a missing Bible chapter)
  // does not collapse the whole hour into a 404. Failed entries render as
  // empty-verse placeholders with the antiphon we already know.
  const psalmResults = await Promise.allSettled(
    psalmEntries.map((entry) =>
      resolvePsalm(
        entry,
        antiphonOverrides,
        day.season,
        dateStr,
        effectiveDayOfWeek,
        effectiveWeekOfSeason,
      ),
    ),
  )
  const assembledPsalms: AssembledPsalm[] = psalmResults.map((result, i) => {
    if (result.status === 'fulfilled') return result.value
    const entry = psalmEntries[i]
    console.error(
      `[loth-service] resolvePsalm failed for ${entry.ref} (${dateStr} ${hour}):`,
      result.reason,
    )
    // Mirror resolvePsalm's selection chain so the fallback placeholder
    // still respects overrides > PDF seasonal variant > default_antiphon.
    const override = antiphonOverrides[entry.antiphon_key]
    const seasonalVariant = pickSeasonalVariant(
      entry,
      day.season,
      dateStr,
      effectiveDayOfWeek,
      effectiveWeekOfSeason,
    )
    const fallbackAntiphon = override ?? seasonalVariant ?? entry.default_antiphon ?? ''
    const usedPdfVariant = override === undefined && seasonalVariant !== undefined
    return {
      psalmType: entry.type,
      reference: entry.ref,
      title: entry.title,
      antiphon: usedPdfVariant
        ? fallbackAntiphon
        : applySeasonalAntiphon(fallbackAntiphon, day.season),
      verses: [],
      gloriaPatri: entry.gloria_patri,
      ...(entry.page != null ? { page: entry.page } : {}),
    }
  })

  // 8. Merge propers: sanctoral > season > psalter commons > defaults
  //    Per GILH §157/§183/§199, weekday readings/responsories/intercessions/prayers
  //    come from the 4-week psalter cycle when no seasonal proper exists.
  let psalterCommons: ReturnType<typeof getPsalterCommons> = null
  try {
    psalterCommons = getPsalterCommons(day.psalterWeek, dayOfWeek, hour)
  } catch {
    // psalter loading failed (e.g. unexpected week value); continue with season propers only
  }

  let mergedPropers: HourPropers = {}

  // Layer 1: psalter commons (lowest priority)
  if (psalterCommons) {
    if (psalterCommons.shortReading) mergedPropers.shortReading = psalterCommons.shortReading
    if (psalterCommons.responsory) mergedPropers.responsory = psalterCommons.responsory
    if (psalterCommons.gospelCanticleAntiphon) mergedPropers.gospelCanticleAntiphon = psalterCommons.gospelCanticleAntiphon
    if (typeof psalterCommons.gospelCanticleAntiphonPage === 'number') mergedPropers.gospelCanticleAntiphonPage = psalterCommons.gospelCanticleAntiphonPage
    if (psalterCommons.intercessions) mergedPropers.intercessions = psalterCommons.intercessions
    if (typeof psalterCommons.intercessionsPage === 'number') mergedPropers.intercessionsPage = psalterCommons.intercessionsPage
    if (psalterCommons.concludingPrayer) mergedPropers.concludingPrayer = psalterCommons.concludingPrayer
    if (typeof psalterCommons.concludingPrayerPage === 'number') mergedPropers.concludingPrayerPage = psalterCommons.concludingPrayerPage
  }

  // Layer 2: season propers (override psalter)
  if (seasonPropers) {
    mergedPropers = { ...mergedPropers, ...seasonPropers }
  }

  // Layer 3: sanctoral propers (highest priority)
  if (hourPropers) {
    mergedPropers = { ...mergedPropers, ...hourPropers }
  }

  // Layer 4: Rich overlays (PDF 원형 마크업)
  const richOverlay = resolveRichOverlay({
    season: day.season,
    weekKey: String(day.weekOfSeason),
    day: dayOfWeek,
    hour,
    sanctoralKey: sanctoral ? dateKey : null,
    psalterWeek: day.psalterWeek,
  })
  mergedPropers = { ...mergedPropers, ...richOverlay }

  // Layer 5: seasonal antiphon augmentation (GILH §113 — Easter Alleluia).
  // Applied last so it affects both seasonal and psalter-commons gospel
  // canticle antiphons uniformly.
  if (mergedPropers.gospelCanticleAntiphon) {
    mergedPropers.gospelCanticleAntiphon = applySeasonalAntiphon(
      mergedPropers.gospelCanticleAntiphon,
      day.season,
    )
  }

  // 8b. For Compline, fill propers from compline.json when not overridden
  let complineData = null
  if (hour === 'compline') {
    complineData = getFullComplineData(dayOfWeek)
    mergedPropers = mergeComplineDefaults(mergedPropers, complineData)
  }

  // 8c. Fill hymn from seasonal assignments if not already set
  let hymnCandidates: import('./types').HymnCandidate[] | undefined
  let hymnSelectedIndex: number | undefined

  if (!mergedPropers.hymn) {
    const hymnData = getHymnForHour(day.season, day.weekOfSeason, dayOfWeek, hour)
    if (hymnData) {
      mergedPropers.hymn = hymnData.text
      mergedPropers.hymnPage = hymnData.page
    }
    // Load all candidates for the hymn selection menu
    const candidateData = getHymnCandidatesForHour(day.season, day.weekOfSeason, dayOfWeek, hour)
    if (candidateData) {
      hymnCandidates = candidateData.candidates
      hymnSelectedIndex = candidateData.selectedIndex
      // 기본 rotation 의 hymn 번호로 중앙 rich 카탈로그를 조회한다.
      // seasonal/sanctoral overlay 의 hymnRich 가 이미 있으면 우선 유지 —
      // 카탈로그는 override 가 없을 때의 기본 rich 소스다.
      if (!mergedPropers.hymnRich) {
        const selected = candidateData.candidates[candidateData.selectedIndex]
        if (selected) {
          const rich = loadHymnRichOverlay(selected.number)
          if (rich) mergedPropers.hymnRich = rich
        }
      }
    }
  }

  // 9. Build context and delegate to hour assembler
  const isFirstHourOfDay = hour === 'lauds'

  const ctx: HourContext = {
    hour,
    dateStr,
    dayOfWeek,
    liturgicalDay: day,
    assembledPsalms,
    mergedPropers,
    ordinarium,
    isFirstHourOfDay,
    complineData,
    hymnCandidates,
    hymnSelectedIndex,
  }

  const assembler = getAssembler(hour)
  if (!assembler) return null

  const sections = assembler(ctx)

  return {
    hourType: hour,
    hourNameMn: hourNamesMn[hour],
    date: dateStr,
    liturgicalDay: day,
    psalterWeek: day.psalterWeek,
    sections,
  }
}

/**
 * Get today's assembled hour.
 */
export async function getTodayHour(hour: HourType): Promise<AssembledHour | null> {
  const today = getToday()
  return assembleHour(today.date, hour)
}

/**
 * Get a summary of all hours available for a given date.
 */
export function getHoursSummary(dateStr: string): {
  date: string
  liturgicalDay: LiturgicalDayInfo
  hours: { type: HourType; nameMn: string }[]
} | null {
  const day = getLiturgicalDay(dateStr)
  if (!day) return null

  const hours: { type: HourType; nameMn: string }[] = [
    { type: 'lauds', nameMn: hourNamesMn.lauds },
    { type: 'vespers', nameMn: hourNamesMn.vespers },
    { type: 'compline', nameMn: hourNamesMn.compline },
  ]

  return { date: dateStr, liturgicalDay: day, hours }
}
