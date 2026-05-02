import type {
  DayOfWeek,
  HourType,
  LiturgicalDayInfo,
  AssembledHour,
  AssembledPsalm,
  PsalmEntry,
  HourPropers,
  HourPsalmody,
  SanctoralEntry,
  CelebrationOption,
  FirstVespersPropers,
} from './types'
import { HOUR_NAMES_MN as hourNamesMn } from './types'
import { getLiturgicalDay, getToday } from './calendar'
import { getPsalterPsalmody, getComplinePsalmody, getFullComplineData, getPsalterCommons } from './psalter-loader'
import { getSeasonHourPropers, getSeasonFirstVespers, getSanctoralPropers, getHymnForHour, getHymnCandidatesForHour, resolveSpecialKey } from './propers-loader'
import { resolveCelebration } from './celebrations'
import { resolveRichOverlay } from './prayers/resolver'
import { loadHymnRichOverlay } from './prayers/rich-overlay'

import {
  getAssembler,
  loadOrdinarium,
  dateToDayOfWeek,
  resolvePsalm,
  mergeComplineDefaults,
  promoteToFirstVespersIdentity,
} from './hours'
import { applySeasonalAntiphon, applySeasonalAntiphonRich, pickSeasonalVariant } from './hours/seasonal-antiphon'
import { applyConditionalRubrics } from './hours/conditional-rubric-resolver'
import { applyPageRedirects, loadOrdinariumKeyCatalog } from './hours/page-redirect-resolver'
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

  // FR-NEW #230 (F-X5) — firstVespers / firstCompline data-lookup keying.
  // The two new hours render on the Sunday page (URL identity) but their
  // PDF data lives in eve-of-Sunday slots (firstVespers in Sunday's own
  // `firstVespers` propers; firstCompline in compline.json's SAT slot
  // which holds Sunday I Compline per existing convention). Compute the
  // dayOfWeek to use for psalmody / propers lookups separately from the
  // user-facing dayOfWeek.
  //
  //   firstVespers: data-key remains today's dayOfWeek (SUN). The
  //     firstVespers propers are authored under
  //     `weeks[N].SUN.firstVespers` in season-propers JSON, so SUN is
  //     correct. Sunday-vespers psalter (week N, SUN, vespers) is the
  //     base psalmody when the firstVespers entry omits its own
  //     psalms[].
  //   firstCompline: data-key shifts back one day (SUN → SAT) so
  //     compline.json's Saturday slot (which contains Sunday I
  //     Compline content per F-X4 #229) is fetched.
  //
  // `effectiveDayOfWeek` (the post-promotion key for seasonal-variant
  // selection further below) handles a different concern (FR-156
  // first-Vespers identity) — distinct from this lookup-key shift.
  const isFirstVespers = hour === 'firstVespers'
  const isFirstCompline = hour === 'firstCompline'
  const isComplineLike = hour === 'compline' || isFirstCompline

  // dayOfWeek used for compline/psalter lookups (eve-shift only for firstCompline)
  let dataLookupDayOfWeek: DayOfWeek = dayOfWeek
  if (isFirstCompline) {
    const eveDate = new Date(dateStr + 'T00:00:00Z')
    eveDate.setUTCDate(eveDate.getUTCDate() - 1)
    const eMM = String(eveDate.getUTCMonth() + 1).padStart(2, '0')
    const eDD = String(eveDate.getUTCDate()).padStart(2, '0')
    const eveStr = `${eveDate.getUTCFullYear()}-${eMM}-${eDD}`
    dataLookupDayOfWeek = dateToDayOfWeek(eveStr)
  }

  // hour key used for non-compline propers / psalter / rich-overlay lookups.
  // firstVespers is structurally a vespers (Sunday vespers psalter as base);
  // firstCompline is structurally a compline (compline.json fetch).
  const dataLookupHour: HourType = isFirstVespers
    ? 'vespers'
    : isFirstCompline
      ? 'compline'
      : hour

  // 2. Get base psalmody from 4-week psalter
  let psalmEntries: PsalmEntry[] = []

  if (isComplineLike) {
    psalmEntries = getComplinePsalmody(dataLookupDayOfWeek)
  } else {
    try {
      const basePsalmody = getPsalterPsalmody(
        day.psalterWeek,
        // firstVespers uses Sunday's vespers psalter as fallback base
        // (existing data-key paths keep dayOfWeek=SUN; isFirstVespers is
        // explicit for legibility — the assignment is a no-op when
        // dayOfWeek === 'SUN' but documents intent if the function is
        // ever reused for non-Sunday firstVespers (Q4=P expansion).
        isFirstVespers ? 'SUN' : dayOfWeek,
        dataLookupHour,
      )
      psalmEntries = basePsalmody?.psalms ?? []
    } catch {
      psalmEntries = []
    }
  }

  // 3. Get season propers
  //    Saturday vespers = Sunday 1st Vespers per liturgical convention,
  //    so look up Sunday's vespers propers for concluding prayer / gospel canticle antiphon.
  //    For firstVespers/firstCompline (FR-NEW #230) the lookup uses
  //    `dataLookupHour` (vespers/compline respectively) since those data
  //    files are still keyed by the canonical hour names.
  let seasonPropers = getSeasonHourPropers(
    day.season,
    day.weekOfSeason,
    isFirstCompline ? dataLookupDayOfWeek : dayOfWeek,
    dataLookupHour,
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

  // FR-156 Phase 3a/4a/FEAST-ext: Solemnity/Feast First Vespers
  // (highest-priority vespers override). Any vespers evening — not
  // just Saturday — consults the NEXT day's liturgical identity; if
  // tomorrow is a SOLEMNITY or FEAST carrying `firstVespers` (either
  // via sanctoral MM-DD or via season-propers special key for
  // movables), adopt those propers (and psalms) in full.
  //
  // This runs BEFORE the Saturday→Sunday Sunday-firstVespers branch so
  // a Solemnity/Feast that lands on a Sunday is rendered as the
  // celebration's own 1st Vespers rather than the Sunday's. It also
  // overrides any existing `seasonPropers` (e.g. ADVENT 12/24 date-key
  // propers displaced when 12/25 carries Christmas firstVespers).
  //
  // Two lookup paths:
  //   1. Fixed-date solemnities + 4 feast entries whose PDFs author
  //      1st Vespers (02-02 Presentation, 08-06 Transfiguration,
  //      09-14 Exaltation of the Cross, 11-09 Lateran Basilica) —
  //      `getSanctoralPropers(MM-DD)` returns a SanctoralEntry whose
  //      `firstVespers` is populated by Phase 3b (task #22).
  //   2. Movable solemnities (Ascension, Pentecost, Trinity Sunday,
  //      Corpus Christi, Sacred Heart, Christ the King) — no MM-DD
  //      sanctoral entry; instead, `getSeasonFirstVespers` resolves
  //      the celebration name to a season-propers special key
  //      (`weeks['ascension'].SUN.firstVespers`, etc.) via
  //      `resolveSpecialKey`. Data lives in Phase 4b (task #24).
  //      FEAST 는 Path 1 only (data-driven activation) — GILH/GIRM
  //      상 FEAST 는 통상 1st Vespers 없고, 위 4건만 PDF 원문이
  //      authored 한 예외. movable FEAST special-key 버킷도 없으므로
  //      Path 2 는 SOLEMNITY 에서만 시도.
  if (hour === 'vespers') {
    const tomorrowDate = new Date(dateStr + 'T00:00:00Z')
    tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1)
    const tMM = String(tomorrowDate.getUTCMonth() + 1).padStart(2, '0')
    const tDD = String(tomorrowDate.getUTCDate()).padStart(2, '0')
    const tomorrowStr = `${tomorrowDate.getUTCFullYear()}-${tMM}-${tDD}`
    const tomorrowDay = getLiturgicalDay(tomorrowStr)
    if (
      tomorrowDay &&
      (tomorrowDay.rank === 'SOLEMNITY' || tomorrowDay.rank === 'FEAST')
    ) {
      // Path 1 — fixed-date celebration via sanctoral entry.
      // `getSanctoralPropers` walks solemnities → feasts → memorials,
      // so FEAST entries (02-02, 08-06, 09-14, 11-09) resolve here.
      const tomorrowSanctoral = getSanctoralPropers(`${tMM}-${tDD}`)
      let solemnityFirstVespers: FirstVespersPropers | null | undefined =
        tomorrowSanctoral?.firstVespers
      // Path 2 — movable SOLEMNITY via season-propers special key.
      // Gated to SOLEMNITY AND a resolvable special key (`resolveSpecialKey`
      // returns one of: ascension / pentecost / trinitySunday /
      // corpusChristi / sacredHeart / christTheKing). Without the special-
      // key gate, `getSeasonFirstVespers` falls through to
      // `weeks[N].SUN.firstVespers` even for plain Sundays — and romcal
      // labels EVERY Sunday as `rank === 'SOLEMNITY'`. The plain-Sunday
      // firstVespers entries (Phase 2, task #20) are intentionally
      // partial (psalms + shortReading + responsory + intercessions; no
      // concludingPrayer / gospelCanticleAntiphon — those come from the
      // regular Sunday vespers). Adopting them as `solemnityFirstVespers`
      // bypasses the Saturday→Sunday merge below (L209-216) and silently
      // drops the concluding prayer + Magnificat antiphon. Restricting
      // Path 2 to special-key solemnities lets the Saturday→Sunday branch
      // handle plain Sundays as before.
      if (
        !solemnityFirstVespers &&
        tomorrowDay.rank === 'SOLEMNITY' &&
        resolveSpecialKey(tomorrowDay.season, tomorrowDay.name) != null
      ) {
        solemnityFirstVespers = getSeasonFirstVespers(
          tomorrowDay.season,
          tomorrowDay.weekOfSeason,
          tomorrowStr,
          tomorrowDay.name,
        )
      }
      if (solemnityFirstVespers) {
        // Solemnity First Vespers is self-contained — no per-field
        // backstop to the regular seasonal vespers. The PDF prints the
        // entire 1st Vespers ordinary on the solemnity's own section.
        seasonPropers = solemnityFirstVespers as HourPropers
        if (solemnityFirstVespers.psalms && solemnityFirstVespers.psalms.length > 0) {
          psalmEntries = solemnityFirstVespers.psalms
        }
        // Promote effectiveDayOfWeek/weekOfSeason to tomorrow's
        // identity via `promoteToFirstVespersIdentity`. IDENTICAL
        // semantic to the Saturday→Sunday branch below — task #32
        // extracted the helper specifically so both sites stay textually
        // aligned. See `src/lib/hours/first-vespers-identity.ts` for
        // the full rationale (and the FR-156 Phase 4c task #25
        // regression that motivated the helper).
        ;({ effectiveDayOfWeek, effectiveWeekOfSeason } =
          promoteToFirstVespersIdentity(
            tomorrowStr,
            dateToDayOfWeek(tomorrowStr),
            tomorrowDay.weekOfSeason,
          ))
      }
    }
  }

  // FR-NEW #230 (F-X5) — explicit firstVespers route resolution.
  // When the URL is `/pray/SUN/firstVespers` we are looking at the
  // Sunday's own First Vespers; the data lives in
  // `weeks[N].SUN.firstVespers` (Phase 2 task #20) and overrides the
  // initial Sunday-regular-vespers fetch above. Sunday's regular
  // vespers acts as per-field backstop (the PDF's psalter First Vespers
  // blocks reference seasonal Sunday propers verbatim — see the
  // Saturday→Sunday branch below for the same merge pattern). NO
  // effective-day promotion is needed because `dayOfWeek` is already
  // SUN.
  //
  // For Solemnity/Feast Sundays (Q4=P expansion): a sanctoral entry
  // carrying its own `firstVespers` (Path 1 in the FR-156 block above)
  // takes precedence — handled by the sanctoral merge in step 4 below.
  if (isFirstVespers) {
    const firstVespersData = getSeasonFirstVespers(
      day.season,
      day.weekOfSeason,
      dateStr,
      day.name,
    )
    if (firstVespersData) {
      // Compose: Sunday-regular (already in seasonPropers from initial
      // fetch above) ⟩ firstVespers entry. This mirrors the
      // Saturday→Sunday branch's `{ ...sundayRegular, ...firstVespers }`
      // merge so per-field backstop semantics are identical.
      seasonPropers = {
        ...(seasonPropers ?? {}),
        ...firstVespersData,
      }
      // First Vespers may carry its own psalm array (distinct from the
      // 4-week psalter Sunday). Override so the resolver downstream
      // resolves 1st-Vespers psalm antiphons + seasonal variants.
      if (firstVespersData.psalms && firstVespersData.psalms.length > 0) {
        psalmEntries = firstVespersData.psalms
      }
    }
    // No firstVespers block authored → leave seasonPropers as Sunday
    // regular vespers (already fetched above). Equivalent to the
    // legacy Saturday→Sunday branch's "Pre-Phase-2 path" fallback.
  }

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
      // promote dayOfWeek/weekOfSeason via `promoteToFirstVespersIdentity`
      // so pickSeasonalVariant fires the per-Sunday branches
      // (lentSunday, easterSunday, lentPassionSunday). IDENTICAL
      // semantic to the solemnity branch above.
      const sundayDate = new Date(dateStr + 'T00:00:00Z')
      sundayDate.setUTCDate(sundayDate.getUTCDate() + 1)
      const sMM = String(sundayDate.getUTCMonth() + 1).padStart(2, '0')
      const sDD = String(sundayDate.getUTCDate()).padStart(2, '0')
      const sundayStr = `${sundayDate.getUTCFullYear()}-${sMM}-${sDD}`
      ;({ effectiveDayOfWeek, effectiveWeekOfSeason } =
        promoteToFirstVespersIdentity(sundayStr, 'SUN', nextWeek))
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
  //    For solemnities on the day itself, use vespers2 (Second Vespers) data.
  //    For firstVespers route, prefer sanctoral.firstVespers when authored;
  //    for firstCompline route, fall back to sanctoral.compline (no
  //    `firstCompline` field exists in SanctoralEntry per current schema).
  let hourPropers: HourPropers | undefined
  if (hour === 'vespers' && day.rank === 'SOLEMNITY' && sanctoral?.vespers2) {
    hourPropers = sanctoral.vespers2 as HourPropers
  } else if (isFirstVespers && sanctoral?.firstVespers) {
    hourPropers = sanctoral.firstVespers as HourPropers
  } else if (isFirstCompline) {
    // SanctoralEntry has no compline / firstCompline field by design —
    // compline propers come from the ordinarium-level compline.json
    // (per-day slot). Leave hourPropers undefined.
    hourPropers = undefined
  } else {
    hourPropers = sanctoral?.[hour as keyof typeof sanctoral] as HourPropers | undefined
  }
  const antiphonOverrides: Record<string, string> = {
    ...(seasonPropers?.antiphons ?? {}),
    ...(hourPropers?.antiphons ?? {}),
  }

  // 6. Check if sanctoral replaces psalter entirely
  if (sanctoral?.replacesPsalter && sanctoral.properPsalmody) {
    const psalmodyKey: HourType = isFirstCompline
      ? 'compline'
      : isFirstVespers
        ? 'vespers'
        : hour
    const properPsalmody = sanctoral.properPsalmody[
      psalmodyKey as keyof typeof sanctoral.properPsalmody
    ] as HourPsalmody | undefined
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
    // FR-NEW #230: psalter commons for firstCompline use Saturday slot
    // (same eve-shift as the compline psalmody fetch above). For
    // firstVespers, use Sunday slot + vespers (no shift; isFirstVespers
    // explicit for legibility).
    psalterCommons = getPsalterCommons(
      day.psalterWeek,
      isFirstCompline ? dataLookupDayOfWeek : isFirstVespers ? 'SUN' : dayOfWeek,
      dataLookupHour,
    )
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
  // FR-156 Symptom A fix (Option α, task #66/#72): psalterWeek 은
  // firstVespers 분기가 활성일 때만 undefined 로 넘겨 psalter commons rich
  // 적재를 skip 한다. 그렇게 하지 않으면 Saturday 의 psalter commons rich
  // (예: w3-SAT-vespers shortReadingRich = 1 Petr 1:3-7) 가 Layer 4 에서
  // Sunday firstVespers plain shortReading (예: 2 Peter 1:19-21 PDF p.402)
  // 위에 textRich-priority 로 덮여 화면에서 가린다. 두 분기
  // (Solemnity/FEAST + Saturday→Sunday) 모두 promoteToFirstVespersIdentity
  // 로 effectiveDayOfWeek 을 다음 날(보통 SUN) 로 바꾸므로
  // `effectiveDayOfWeek !== dayOfWeek` 가 깔끔한 분기-활성 시그널.
  // FR-NEW #230: explicit firstVespers / firstCompline route also acts as
  // a "branch active" signal even when no eve-promotion happened (so
  // psalter commons rich shadowing is suppressed identically to the legacy
  // Saturday→Sunday branch).
  const firstVespersBranchActive =
    effectiveDayOfWeek !== dayOfWeek || isFirstVespers || isFirstCompline
  const richOverlay = resolveRichOverlay({
    season: day.season,
    weekKey: String(day.weekOfSeason),
    // For firstCompline: rich overlay keyed on SAT slot (mirrors
    // compline.json eve-shift). For firstVespers: keyed on SUN
    // (today's dayOfWeek). For others: dayOfWeek.
    day: isFirstCompline ? dataLookupDayOfWeek : dayOfWeek,
    hour: dataLookupHour,
    sanctoralKey: sanctoral ? dateKey : null,
    psalterWeek: firstVespersBranchActive ? undefined : day.psalterWeek,
    celebrationName: day.name,
    dateStr,
  })
  mergedPropers = { ...mergedPropers, ...richOverlay }

  // Layer 4.5: FR-160-B conditional + page-redirect hydration.
  // Both helpers are noop when the propers don't carry the new
  // arrays, so existing data files are byte-equal until B3 marks
  // them. applyPageRedirects fail-hards on unknown ordinariumKey.
  //
  // Use `effectiveDayOfWeek` (not the civil `dayOfWeek`) so Saturday
  // First Vespers / next-day Solemnity branches evaluate rubrics with
  // the day's liturgical identity (typically SUN). Otherwise rubrics
  // keyed to `dayOfWeek: ['SUN']` would silently miss on Saturday eve.
  {
    const isFirstHourOfDayCtx = hour === 'lauds'
    const condResult = applyConditionalRubrics(mergedPropers, {
      season: day.season,
      dayOfWeek: effectiveDayOfWeek,
      dateStr,
      hour,
      isFirstHourOfDay: isFirstHourOfDayCtx,
    })
    mergedPropers = condResult.propers
    if (mergedPropers.pageRedirects && mergedPropers.pageRedirects.length > 0) {
      const catalog = loadOrdinariumKeyCatalog()
      const redirResult = applyPageRedirects(mergedPropers, catalog)
      mergedPropers = redirResult.propers
    }
  }

  // Layer 5: seasonal antiphon augmentation (GILH §113 — Easter Alleluia).
  // Applied to both plain and rich paths so renderer-branch parity is
  // preserved (F-X1 #217 — pre-fix the rich path stayed un-augmented).
  // For Compline, the plain antiphon is filled by `mergeComplineDefaults`
  // BELOW (Layer 8b) and so Layer 5 plain augmentation is a no-op here;
  // we re-run `applySeasonalAntiphon` after the compline-defaults merge
  // so the Eastertide Alleluia surfaces on the plain path too.
  if (mergedPropers.gospelCanticleAntiphon) {
    mergedPropers.gospelCanticleAntiphon = applySeasonalAntiphon(
      mergedPropers.gospelCanticleAntiphon,
      day.season,
    )
  }
  if (mergedPropers.gospelCanticleAntiphonRich) {
    mergedPropers.gospelCanticleAntiphonRich = applySeasonalAntiphonRich(
      mergedPropers.gospelCanticleAntiphonRich,
      day.season,
    )
  }

  // 8b. For Compline, fill propers from compline.json when not overridden.
  // Pass `day` and `dayOfWeek` so mergeComplineDefaults can apply the
  // season+Octave-keyed responsory variant (F-1, task #210) — Easter
  // Octave / Eastertide PDF p.515 variants override the default
  // responsory body in the absence of explicit per-day propers.
  let complineData = null
  if (isComplineLike) {
    // FR-NEW #230: firstCompline fetches the SAT-keyed compline slot
    // (Sunday I Compline content per F-X4 #229). All other compline-
    // defaults logic stays day-based — `dataLookupDayOfWeek` shifts only
    // for firstCompline; `dayOfWeek` (today's civil day) stays for the
    // rendered identity.
    complineData = getFullComplineData(dataLookupDayOfWeek)
    mergedPropers = mergeComplineDefaults(
      mergedPropers,
      complineData,
      { season: day.season, weekOfSeason: day.weekOfSeason },
      dataLookupDayOfWeek,
    )
    // F-X1 #217 — re-augment AFTER compline defaults are merged so the
    // ordinarium-sourced `nuncDimittisAntiphon` (filled in by
    // `mergeComplineDefaults`, which runs AFTER Layer 5) also receives
    // the Eastertide Alleluia. Idempotent: `applySeasonalAntiphon`
    // returns its input unchanged if Alleluia is already present.
    if (mergedPropers.gospelCanticleAntiphon) {
      mergedPropers.gospelCanticleAntiphon = applySeasonalAntiphon(
        mergedPropers.gospelCanticleAntiphon,
        day.season,
      )
    }
  }

  // 8c. Fill hymn from seasonal assignments if not already set
  let hymnCandidates: import('./types').HymnCandidate[] | undefined
  let hymnSelectedIndex: number | undefined

  if (!mergedPropers.hymn) {
    // FR-NEW #230: hymn lookup uses the data-key (vespers / compline)
    // and shifts the dayOfWeek only for firstCompline. firstVespers
    // hymns live under SUN/vespers in season hymn data.
    const hymnLookupDay: DayOfWeek = isFirstCompline
      ? dataLookupDayOfWeek
      : isFirstVespers
        ? 'SUN'
        : dayOfWeek
    const hymnData = getHymnForHour(day.season, day.weekOfSeason, hymnLookupDay, dataLookupHour)
    if (hymnData) {
      mergedPropers.hymn = hymnData.text
      mergedPropers.hymnPage = hymnData.page
    }
    // Load all candidates for the hymn selection menu
    const candidateData = getHymnCandidatesForHour(day.season, day.weekOfSeason, hymnLookupDay, dataLookupHour)
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

  // FR-NEW #230: firstVespers/firstCompline reuse the vespers/compline
  // assemblers respectively — section structure is identical, only the
  // input data differs (handled above by dataLookup* keys).
  const assembler = getAssembler(dataLookupHour)
  if (!assembler) return null

  const sections = assembler(ctx)

  return {
    hourType: hour,
    hourNameMn: hourNamesMn[hour],
    date: dateStr,
    liturgicalDay: day,
    psalterWeek: day.psalterWeek,
    sections,
    // FR-160-B PR-10: surface hydrated audit metadata (no body). The
    // body itself lives only in the internal resolver record — clients
    // render via section builders, so we strip it from the API surface
    // to keep payloads lean (hymns.json alone is ~134KB). Absent when
    // no PageRedirect declared.
    ...(mergedPropers.pageRedirectBodies && mergedPropers.pageRedirectBodies.length > 0
      ? {
          pageRedirectBodies: mergedPropers.pageRedirectBodies.map(
            ({ redirectId, ordinariumKey, page, label, appliesAt, catalog }) => ({
              redirectId,
              ordinariumKey,
              page,
              label,
              appliesAt,
              catalog,
            }),
          ),
        }
      : {}),
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
 *
 * FR-NEW #230 (F-X5) — per-day hour list:
 *   - Saturday: lauds only. Vespers + Compline are NOT shown on
 *     Saturday cards because their content is liturgically Sunday I
 *     First Vespers / First Compline; users access those via the
 *     Sunday page (`firstVespers`, `firstCompline` cards). The legacy
 *     URLs `/pray/SAT/vespers` and `/pray/SAT/compline` still resolve
 *     server-side for SW/cache backward-compat (existing first-Vespers
 *     test suite anchors there) — they are simply removed from the
 *     visible hour-card list.
 *   - Sunday: firstVespers + firstCompline + lauds + vespers + compline
 *     (5 hours, in that order; firstVespers/firstCompline render BEFORE
 *     lauds because they belong liturgically to the Sunday's evening-
 *     before, which precedes its morning).
 *   - Other weekdays (Mon-Fri): lauds + vespers + compline (unchanged
 *     from pre-#230). FR-156 weekday-eve Solemnity/Feast firstVespers
 *     promotion (`/pray/MON/vespers` showing Tuesday-Solemnity firstVespers)
 *     is preserved per Q4=Q decision.
 */
export function getHoursSummary(dateStr: string): {
  date: string
  liturgicalDay: LiturgicalDayInfo
  hours: { type: HourType; nameMn: string }[]
} | null {
  const day = getLiturgicalDay(dateStr)
  if (!day) return null

  const dayOfWeek = dateToDayOfWeek(dateStr)
  const hours: { type: HourType; nameMn: string }[] = []

  if (dayOfWeek === 'SUN') {
    // Sunday gains First Vespers / First Compline cards above lauds.
    hours.push({ type: 'firstVespers', nameMn: hourNamesMn.firstVespers })
    hours.push({ type: 'firstCompline', nameMn: hourNamesMn.firstCompline })
    hours.push({ type: 'lauds', nameMn: hourNamesMn.lauds })
    hours.push({ type: 'vespers', nameMn: hourNamesMn.vespers })
    hours.push({ type: 'compline', nameMn: hourNamesMn.compline })
  } else if (dayOfWeek === 'SAT') {
    // Saturday loses Vespers + Compline cards (they moved to Sunday's
    // firstVespers / firstCompline). Lauds remains.
    hours.push({ type: 'lauds', nameMn: hourNamesMn.lauds })
  } else {
    hours.push({ type: 'lauds', nameMn: hourNamesMn.lauds })
    hours.push({ type: 'vespers', nameMn: hourNamesMn.vespers })
    hours.push({ type: 'compline', nameMn: hourNamesMn.compline })
  }

  return { date: dateStr, liturgicalDay: day, hours }
}
