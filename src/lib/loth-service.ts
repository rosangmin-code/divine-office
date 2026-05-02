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

  // dayOfWeek used for compline/psalter lookups.
  //
  // FR-NEW #230 (F-X5, Q4=P): firstCompline ALWAYS uses the SAT slot
  // regardless of what civil day-of-week the URL date falls on. Per
  // the PDF p.512 subhead — "1 ДҮГЭЭР ОРОЙН ЗАЛБИРЛЫН ДАРАА. НЯМ
  // ГАРАГУУДАД БОЛОН ИХ БАЯРУУДАД" ("After 1st Vespers, on Sundays
  // AND on Solemnities") — the Compline that follows First Vespers
  // is liturgically the same body of psalmody/propers (Sunday I
  // Compline) whether the celebration is a plain Sunday OR a weekday
  // Solemnity (Christmas Day, Ascension, etc.). compline.json's SAT
  // slot holds this Sunday-I body (per F-X4 #229 page mapping). We
  // therefore route firstCompline data fetches to SAT directly rather
  // than eve-shifting, which would land on the wrong weekday slot for
  // weekday Solemnities (e.g., Christmas Day Fri 2026 → Thu compline,
  // structurally wrong).
  let dataLookupDayOfWeek: DayOfWeek = dayOfWeek
  if (isFirstCompline) {
    dataLookupDayOfWeek = 'SAT'
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
  // #216 F-2c integration (#230 Q4=P): track the post-promotion liturgical
  // identity for downstream rubric logic (compline F-2 primary↔alternate
  // concluding-prayer swap, etc.). Default = today's `day`. FR-156 vespers
  // promotion (Solemnity/Feast eve, Saturday→Sunday) overwrites with
  // tomorrow's day; the new firstVespers/firstCompline routes leave it as
  // today's day (URL date IS the rendered identity, so no promotion needed).
  let effectiveLiturgicalDay: LiturgicalDayInfo = day

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
        // #216 F-2c integration: also promote the liturgical-day rank
        // so compline F-2 primary↔alternate concluding-prayer swap and
        // any other rank-keyed rubric sees the Solemnity/Feast (not the
        // eve weekday's MEMORIAL/null rank). Latent until Q4=P (#230)
        // routes Solemnity firstVespers via the Solemnity URL itself,
        // but the legacy eve URL still benefits from this promotion.
        effectiveLiturgicalDay = tomorrowDay
      }
    }
  }

  // FR-NEW #230 (F-X5, Q4=P) — explicit firstVespers route resolution.
  // The URL `/pray/<date>/firstVespers` is hit on Sunday or Solemnity/Feast
  // pages. Three lookup paths (mirrors FR-156 vespers branch above —
  // intentionally parallel structure since both render the SAME
  // liturgical concept, just on different URL anchors):
  //   1. Sanctoral entry (fixed-date Solemnities + 4 fixed-date Feasts
  //      with PDF-authored firstVespers) — sanctoral.firstVespers.
  //   2. Movable Solemnity special-key (Ascension, Pentecost,
  //      Trinity Sunday, Corpus Christi, Sacred Heart, Christ the King) —
  //      `getSeasonFirstVespers` via `resolveSpecialKey`.
  //   3. Plain Sunday — `weeks[N].SUN.firstVespers` (Phase 2 task #20).
  //
  // Path 1/2 are self-contained (PDF prints full ordinary on the
  // celebration's section). Path 3 uses Sunday's regular vespers as
  // per-field backstop (seasonal Sunday propers carry the
  // gospelCanticleAntiphon + concludingPrayer that firstVespers Phase 2
  // entries omit).
  //
  // NO effective-day-of-week promotion needed (URL date IS the rendered
  // identity), but `effectiveLiturgicalDay` is mirrored from `day` for
  // explicit semantic (so consumers reading
  // `effectiveLiturgicalDay ?? liturgicalDay` get a consistent value).
  if (isFirstVespers) {
    let firstVespersData: FirstVespersPropers | null | undefined = null
    let isSelfContained = false

    // Path 1 — sanctoral.firstVespers (Solemnity / Feast)
    if (day.rank === 'SOLEMNITY' || day.rank === 'FEAST') {
      const d = new Date(dateStr + 'T00:00:00Z')
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
      const dd = String(d.getUTCDate()).padStart(2, '0')
      const todaySanctoral = getSanctoralPropers(`${mm}-${dd}`)
      if (todaySanctoral?.firstVespers) {
        firstVespersData = todaySanctoral.firstVespers
        isSelfContained = true
      }
    }

    // Path 2 — movable Solemnity special-key
    if (
      !firstVespersData &&
      day.rank === 'SOLEMNITY' &&
      resolveSpecialKey(day.season, day.name) != null
    ) {
      firstVespersData = getSeasonFirstVespers(
        day.season,
        day.weekOfSeason,
        dateStr,
        day.name,
      )
      if (firstVespersData) isSelfContained = true
    }

    // Path 3 — plain Sunday (or any season firstVespers entry as fallback)
    if (!firstVespersData) {
      firstVespersData = getSeasonFirstVespers(
        day.season,
        day.weekOfSeason,
        dateStr,
        day.name,
      )
      // Path 3 is NOT self-contained — uses Sunday-regular vespers as
      // per-field backstop (already in seasonPropers from initial fetch).
    }

    if (firstVespersData) {
      seasonPropers = isSelfContained
        ? (firstVespersData as HourPropers)
        : { ...(seasonPropers ?? {}), ...firstVespersData }
      if (firstVespersData.psalms && firstVespersData.psalms.length > 0) {
        psalmEntries = firstVespersData.psalms
      }
    }
    // else: leave seasonPropers as initial fetch (Sunday regular vespers
    // for plain Sunday; null for non-Sun non-celebration where no
    // firstVespers data exists — `assembleHour` returns whatever
    // assembler emits, may be sparse).
    effectiveLiturgicalDay = day
  }
  // firstCompline route — no extra propers fetch beyond the eve-shifted
  // psalmody (handled above by `dataLookupDayOfWeek`); the propers come
  // from the eve's compline.json slot via `mergeComplineDefaults` in
  // step 8b. effectiveLiturgicalDay = day so F-2 alternation reads the
  // celebration's rank when the URL date IS a Solemnity not on Sunday.
  if (isFirstCompline) {
    effectiveLiturgicalDay = day
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
      // #216 F-2c integration: also promote liturgical day so downstream
      // rank-keyed rubric (compline F-2) sees Sunday's identity. For
      // plain-Sunday Saturday→Sunday this is usually a no-op for F-2
      // (rank stays non-SOLEMNITY for plain Sundays), but it keeps the
      // semantic explicit and parallels the Solemnity branch above.
      const sundayDay = getLiturgicalDay(sundayStr)
      if (sundayDay) effectiveLiturgicalDay = sundayDay
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
    effectiveLiturgicalDay,
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
 * Internal helper — does this date carry First Vespers / First Compline
 * (i.e. should the cards appear above Lauds)?
 *
 * Returns true for:
 *   - All Sundays (Phase 2 #20: `weeks[N].SUN.firstVespers` always present
 *     as data, even when partial — backstop merge in `assembleHour` fills
 *     the rest from regular Sunday vespers).
 *   - Solemnity/Feast with a sanctoral.firstVespers entry (12 fixed-date
 *     solemnities + 4 fixed-date feasts: 02-02 Presentation, 08-06
 *     Transfiguration, 09-14 Exaltation, 11-09 Lateran Basilica).
 *   - Movable Solemnity (Ascension, Pentecost, Trinity Sunday,
 *     Corpus Christi, Sacred Heart, Christ the King) — `getSeasonFirstVespers`
 *     via `resolveSpecialKey` (Phase 4b #24).
 */
function hasFirstVespersAndCompline(
  dateStr: string,
  day: LiturgicalDayInfo,
  dayOfWeek: DayOfWeek,
): boolean {
  if (dayOfWeek === 'SUN') return true
  if (day.rank !== 'SOLEMNITY' && day.rank !== 'FEAST') return false
  // Sanctoral path
  const d = new Date(dateStr + 'T00:00:00Z')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const sanctoral = getSanctoralPropers(`${mm}-${dd}`)
  if (sanctoral?.firstVespers) return true
  // Movable Solemnity special-key path
  if (day.rank === 'SOLEMNITY' && resolveSpecialKey(day.season, day.name) != null) {
    const fv = getSeasonFirstVespers(day.season, day.weekOfSeason, dateStr, day.name)
    if (fv) return true
  }
  return false
}

/**
 * Get a summary of all hours available for a given date.
 *
 * FR-NEW #230 (F-X5, Q4=P) — per-day hour list with forward-looking
 * eve-stripping:
 *
 *   - **Today carries firstVespers/firstCompline** (Sunday OR
 *     Solemnity/Feast with firstVespers data per
 *     `hasFirstVespersAndCompline`):
 *       firstVespers + firstCompline + lauds + vespers + compline (5
 *       cards). The first-vespers cards render BEFORE lauds because
 *       they belong liturgically to the celebration's evening-before
 *       (Saturday night → Sunday I; Mon night → Tue Solemnity).
 *
 *   - **Today is the eve-weekday of (SUN | SOLEMNITY/FEAST with
 *     firstVespers data)**: vespers + compline cards STRIPPED. Only
 *     lauds remains. Saturday eve of plain Sunday is the original
 *     case (Q1); Q4=P extends to weekday-eve-of-celebration. The
 *     eve URLs (`/pray/<eve>/vespers`, `/pray/<eve>/compline`) still
 *     resolve server-side for SW/cache backward-compat (FR-156
 *     promotion preserved on those URLs); they are simply removed
 *     from the visible card list. (Sunday's own structure is NOT
 *     stripped even when the next day is a Solemnity — Sunday II
 *     Vespers card stays; rubric subtlety reserved for follow-up.)
 *
 *   - **Other weekday** (no firstVespers today, no celebration tomorrow):
 *     lauds + vespers + compline (unchanged from pre-#230).
 */
export function getHoursSummary(dateStr: string): {
  date: string
  liturgicalDay: LiturgicalDayInfo
  hours: { type: HourType; nameMn: string }[]
} | null {
  const day = getLiturgicalDay(dateStr)
  if (!day) return null

  const dayOfWeek = dateToDayOfWeek(dateStr)
  const todayHasFirstVespers = hasFirstVespersAndCompline(dateStr, day, dayOfWeek)

  // Forward-looking: strip vespers/compline from today's eve cards if
  // tomorrow carries firstVespers (the eve content is then surfaced on
  // tomorrow's firstVespers/firstCompline cards). Sundays themselves
  // are not stripped — the rubric collision (Sun II Vespers vs Mon
  // Solemnity Vespers I) is reserved for follow-up.
  const tomorrowDate = new Date(dateStr + 'T00:00:00Z')
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1)
  const tMM = String(tomorrowDate.getUTCMonth() + 1).padStart(2, '0')
  const tDD = String(tomorrowDate.getUTCDate()).padStart(2, '0')
  const tomorrowStr = `${tomorrowDate.getUTCFullYear()}-${tMM}-${tDD}`
  const tomorrowDay = getLiturgicalDay(tomorrowStr)
  const tomorrowDow = dateToDayOfWeek(tomorrowStr)
  const tomorrowHasFirstVespers = !!tomorrowDay
    && hasFirstVespersAndCompline(tomorrowStr, tomorrowDay, tomorrowDow)
  // Strip eve vespers/compline ONLY for non-Sunday today (Sunday's own
  // 5-card structure stays even when next day is celebration).
  const stripEveCards = dayOfWeek !== 'SUN' && tomorrowHasFirstVespers

  const hours: { type: HourType; nameMn: string }[] = []

  if (todayHasFirstVespers) {
    hours.push({ type: 'firstVespers', nameMn: hourNamesMn.firstVespers })
    hours.push({ type: 'firstCompline', nameMn: hourNamesMn.firstCompline })
  }
  hours.push({ type: 'lauds', nameMn: hourNamesMn.lauds })
  if (!stripEveCards) {
    hours.push({ type: 'vespers', nameMn: hourNamesMn.vespers })
    hours.push({ type: 'compline', nameMn: hourNamesMn.compline })
  }

  return { date: dateStr, liturgicalDay: day, hours }
}
