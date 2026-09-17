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
import { getSeasonHourPropers, getSeasonFirstVespers, getSeasonVespers2, getHymnForHour, getHymnCandidatesForHour, resolveSpecialKey } from './propers-loader'
import { resolveSanctoralForDay } from './sanctoral-resolver'
import { resolveCelebration } from './celebrations'
import { resolveRichOverlayLayers, applyRichSourceParity, type RichOverlayLayers } from './prayers/resolver'
import { loadHymnRichOverlay, type SeasonalRichHourKey } from './prayers/rich-overlay'

import {
  getAssembler,
  loadOrdinarium,
  dateToDayOfWeek,
  resolvePsalm,
  mergeComplineDefaults,
  promoteToFirstVespersIdentity,
} from './hours'
import { mergeSundayFirstVespers } from './hours/first-vespers-merge'
import { applySeasonalAntiphon, applySeasonalAntiphonRich, pickSeasonalVariant } from './hours/seasonal-antiphon'
import {
  applyConditionalRubrics,
  resolvePsalmodySubstituteRef,
} from './hours/conditional-rubric-resolver'
import { applyPageRedirects, loadOrdinariumKeyCatalog } from './hours/page-redirect-resolver'
import { warmBibleCache } from './bible-loader'
import type { HourContext } from './hours'

/**
 * Does today's own Evening Prayer II outrank tomorrow's First Vespers?
 *
 * Universal Norms n. 61 / Table of Liturgical Days. Two independent rules:
 *
 * **(a) Privileged Sunday** — Sundays of Advent, Lent and Easter (class
 * I.2) outrank a Solemnity (I.3) or a Feast of the Lord (II.5) falling on
 * the Monday, so the Sunday keeps its own Evening Prayer II. Ordinary-Time
 * / Christmas-season Sundays (II.6) yield to the Monday's First Vespers.
 * The single exception is the Advent → Christmas boundary (Dec 24):
 * "Advent ends before First Vespers of the Nativity" (n. 40), so the 4th
 * Sunday of Advent yields to Christmas First Vespers.
 *
 * **(b) Solemnity on a weekday vs a Feast of the Lord** — Christmas
 * (I.2) falling on a Saturday keeps its Evening Prayer II against the
 * Holy Family's First Vespers (II.5) on the Sunday: 2027-12-25,
 * 2032-12-25, … This mirrors the `day.rank !== 'SOLEMNITY'` gate on
 * FR-173 Path 2b in `assembleHour`, which already made the *body* keep
 * Christmas Evening Prayer II — the card list was the side still
 * stripping it (recorded as a known gap in
 * `docs/bug-reports/2026-09-16-sunday-vespers2-epiphany.md`).
 *
 * **(c) Weekday celebration that prints its own Evening Prayer II vs a
 * plain Sunday of Ordinary Time / Christmas season** — the Assumption on
 * Saturday 2026-08-15, Sts Peter and Paul 2030-06-29, All Saints
 * 2031-11-01, the Birth of John the Baptist 2028-06-24; and the Feasts of
 * the Lord, the Presentation 2030-02-02, the Exaltation of the Cross
 * 2030-09-14, the Transfiguration 2033-08-06 … A Solemnity (I.3) and a
 * Feast of the Lord (II.5) both outrank a Sunday of Ordinary Time or the
 * Christmas season (II.6), so the celebration keeps its own Evening Prayer
 * II — the book prints one for each of these and before this rule there
 * was no way to reach it. Sundays of Advent / Lent / Easter (I.2) still
 * win, which is why the season test is here and not a blanket "tomorrow
 * is a Sunday".
 *
 * The gate is the DATA, not the rank: only a celebration whose sanctoral
 * entry carries a `vespers2` qualifies. That is exactly the set the book
 * gives a distinct Second Vespers (the 8 Solemnities + the 4 Feasts of the
 * Lord), and it keeps a saint's Feast (II.7, no `vespers2` — it does not
 * outrank a Sunday) from ever reaching the rule.
 *
 * `tomorrowDay.romcalType === 'SUNDAY'` is what makes (c) mean *plain*
 * Sunday: romcal reports the superseding celebration's own type when one
 * displaces the Sunday, so Epiphany (I.2, `SOLEMNITY`), the Holy Family
 * (`FEAST`) and Divine Mercy Sunday keep the pre-existing behaviour — for
 * Epiphany that is deliberate, since Epiphany outranks Jan 1 (FR-176).
 *
 * `dayOfWeek !== 'SUN'` is load-bearing in (b) and (c): romcal ranks EVERY
 * Sunday as `SOLEMNITY`, so without it a plain Ordinary-Time Sunday (II.6)
 * would be protected against a Monday Feast of the Lord (II.5) and undo (a).
 *
 * Shared by `getHoursSummary` (card list, #240 / #245) and the vespers
 * eve branch in `assembleHour` so the rendered body can never disagree
 * with the cards (the P0-3 romcal-key transfer index made the eve branch
 * find Monday solemnities such as St Joseph 2028-03-20 / Immaculate
 * Conception 2030-12-09 / Annunciation 2027-04-05 — the body must keep the
 * privileged Sunday's Evening Prayer II exactly as the cards do).
 *
 * NOT covered (deliberately): a weekday Solemnity whose *next* day is a
 * plain Sunday — e.g. the Assumption on Saturday 2026-08-15, or Mary
 * Mother of God on Saturday 2028-01-01. By the Table those Solemnities
 * (I.3) outrank a Sunday of Ordinary Time / Christmas season (II.6), but
 * here the cards and the body already agree (both defer to the Sunday's
 * First Vespers, the plain Saturday→Sunday rule), so there is no
 * card↔body split to repair, and changing it is a rubric decision about
 * what the Mongolian book intends, not a bug fix.
 */
/** `YYYY-MM-DD` + 1 day, UTC-anchored like the rest of this module. */
function nextDateStr(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function keepsOwnEveningPrayerII(
  day: LiturgicalDayInfo,
  dayOfWeek: DayOfWeek,
  tomorrowDay: LiturgicalDayInfo | null,
): boolean {
  // (a) privileged Sunday
  const isPrivilegedSunday =
    dayOfWeek === 'SUN' &&
    (day.season === 'ADVENT' || day.season === 'LENT' || day.season === 'EASTER')
  if (isPrivilegedSunday) {
    const isAdventToChristmasBoundary =
      day.season === 'ADVENT' && !!tomorrowDay && tomorrowDay.season === 'CHRISTMAS'
    return !isAdventToChristmasBoundary
  }

  if (dayOfWeek === 'SUN' || !tomorrowDay) return false
  if (day.rank !== 'SOLEMNITY' && day.rank !== 'FEAST') return false

  // (b) weekday Solemnity vs tomorrow's Feast of the Lord
  if (day.rank === 'SOLEMNITY' && tomorrowDay.rank === 'FEAST') return true

  // (c) vs tomorrow's plain non-privileged Sunday
  const tomorrowIsPrivilegedSunday =
    tomorrowDay.season === 'ADVENT' ||
    tomorrowDay.season === 'LENT' ||
    tomorrowDay.season === 'EASTER'
  if (
    tomorrowDay.romcalType === 'SUNDAY' &&
    !tomorrowIsPrivilegedSunday &&
    resolveSanctoralForDay(day)?.entry?.vespers2
  ) {
    return true
  }

  return false
}

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
  // Hour segment for the SEASONAL rich file (Layer 4). Follows the cell the
  // seasonal plain was taken from: normally `dataLookupHour`; the GOAL #20
  // Second Vespers swap below replaces the seasonal plain with the
  // `weeks[key].SUN.vespers2` cell and flips this to `'vespers2'` so the
  // rich is read from `w{key}-{day}-vespers2.rich.json` (§6-3 convention,
  // docs/bug-reports/2026-09-14-eve-vespers-alternate-and-rich.md).
  let seasonalRichHour: SeasonalRichHourKey = dataLookupHour
  // FR-171 (GOAL #268): set when step 3b COMPOSED the seasonal plain from
  // `{ ...SUN.vespers, ...SUN.vespers2 }` (a plain Sunday's own Evening
  // Prayer II) rather than replacing it with a single cell. The rich lookup
  // then reads both `-vespers2` and `-vespers` files, each parity-checked
  // against its own cell. The GOAL #20 special-key swap is a wholesale
  // replacement and keeps its single-source semantics.
  let sundayVespers2Overlay = false

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
    day.romcalKey,
  )

  // GOAL #20 (option B): movable-Solemnity Second Vespers swap. On a
  // movable Solemnity's OWN day, `/pray/<date>/vespers` must render the
  // Second Vespers (vespers2), not the regular/duplicate `vespers` cell.
  // Fixed-date Solemnities get this via the `sanctoral.vespers2` swap (step
  // 5 below); movable ones (Ascension, Pentecost, Trinity Sunday, Corpus
  // Christi, Sacred Heart, Christ the King) have no MM-DD sanctoral entry,
  // so their Second Vespers lives in `weeks['<specialKey>'].SUN.vespers2`
  // and is fetched here via `getSeasonVespers2`. Before this, the initial
  // fetch above returned `weeks[specialKey].SUN.vespers` — which for
  // Pentecost/Ascension is a First-Vespers DUPLICATE (wrong gospel-canticle
  // antiphon + reading) and for the OT solemnities is absent entirely
  // (psalter falls to the running week). Gated to the celebration's own day
  // (rank=SOLEMNITY + resolvable special key); the Saturday→Sunday
  // First-Vespers branch (below) is unaffected because it fires for the eve,
  // where `day.rank` is the weekday's rank.
  if (
    hour === 'vespers' &&
    day.rank === 'SOLEMNITY' &&
    // GOAL #87: pass `dateStr` so DATE-matched Christmas-season special keys
    // (dec25 / jan1 / octave) resolve here, not just NAME-matched movable
    // solemnities. Without it the Christmas Day Second Vespers swap never
    // fired (Christmas has no name-key), so `/pray/<dec25>/vespers` rendered
    // the regular (First-Vespers-shaped) `weeks.dec25.SUN.vespers` cell with
    // the running-week weekday psalter instead of the proper EP-II content.
    // Movable EASTER/OT keys ignore `dateStr` (name-matched) → unchanged;
    // jan1/octave carry no `christmas.json` vespers2 → getSeasonVespers2
    // returns null → no behavior change (jan1 stays on the sanctoral swap).
    resolveSpecialKey(day.season, day.name, dateStr, day.romcalKey) != null
  ) {
    const seasonVespers2 = getSeasonVespers2(
      day.season,
      day.weekOfSeason,
      dateStr,
      day.name,
      day.romcalKey,
    )
    if (seasonVespers2) {
      seasonPropers = seasonVespers2
      seasonalRichHour = 'vespers2'
      // GOAL #87: a fixed-date season-proper Solemnity whose Second Vespers
      // prints its OWN proper psalmody in the book (Christmas Day —
      // Ps 110:1-5,7 / Ps 130 / Col 1:12-20, full_pdf p.592-596) — NOT a
      // Week-1 Sunday borrow (Ps 130 is not a Week-1 Sunday psalm). Mirror
      // the firstVespers psalms override (above) so the proper psalmody +
      // its proper antiphons surface instead of the running weekday psalter.
      // No-op for vespers2 cells without an inline `psalms` array.
      if (seasonVespers2.psalms && seasonVespers2.psalms.length > 0) {
        psalmEntries = seasonVespers2.psalms
      }
    }
  }

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
  // Rich-overlay lookup identity (Layer 4 below). `null` = today's own
  // keys (season / week / weekday / sanctoral key / name / date). The
  // FR-156 Solemnity-Feast eve branch sets it to TOMORROW's identity so the
  // rich markup is fetched from the same celebration the plain propers
  // came from — exactly the keys the `/firstVespers` route on tomorrow's
  // URL uses. Before this, Christmas Eve 2026-12-24 (ADVENT w4 THU) merged
  // `seasonal/advent/w1-THU-vespers.rich.json` (Advent weekday concluding
  // prayer, p.571) under the Christmas First Vespers plain text (p.588),
  // and the Sunday eve of the Presentation 2026-02-01 pulled the Ordinary
  // Time Sunday-4 concluding-prayer rich (p.757) under the feast's plain
  // (p.821).
  let richLookupIdentity: {
    season: LiturgicalDayInfo['season']
    weekKey: string
    day: DayOfWeek
    sanctoralKey?: string | null
    celebrationName: string
    dateStr: string
    romcalKey?: string | null
  } | null = null

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
  //      `resolveSanctoralForDay(tomorrow)` (P0-3, romcal-gated and
  //      transfer-aware) returns the SanctoralEntry whose `firstVespers`
  //      is populated by Phase 3b (task #22).
  //   2. Movable solemnities (Ascension, Pentecost, Trinity Sunday,
  //      Corpus Christi, Sacred Heart, Christ the King) — no MM-DD
  //      sanctoral entry; instead, `getSeasonFirstVespers` resolves
  //      the celebration name to a season-propers special key
  //      (`weeks['ascension'].SUN.firstVespers`, etc.) via
  //      `resolveSpecialKey`. Data lives in Phase 4b (task #24).
  //   2b. FR-173 (GOAL #268) — movable FEASTS OF THE LORD that fall on a
  //      SUNDAY and carry a season-propers special key: Holy Family
  //      (PDF p.599) and the Baptism of the Lord (p.616). Both print
  //      «1 дүгээр Оройн даатгал залбирал» in the book, and p.599's red
  //      rubric — «Хэрэв Эзэний Мэндэлсэн өдөр … Ням гарагт таарвал …
  //      12 сарын 30-нд … “1 дүгээр Оройн даатгал залбирал” гэж байхгүй.»
  //      — says First Vespers is omitted ONLY in the years where Christmas
  //      is a Sunday (Holy Family then moves to Friday 12-30). The
  //      `tomorrowDow === 'SUN'` gate below reproduces that rubric exactly
  //      and costs nothing else: both feasts are Sundays in every other
  //      year. Table of Liturgical Days II.5 (Feast of the Lord) outranks
  //      II.7 (St Stephen / St John / Holy Innocents) and II.9 (weekday of
  //      the Christmas Octave), so 12-26..12-31 evening yields to Holy
  //      Family EP I — which is what `getHoursSummary` already assumes
  //      when it strips the eve cards (#240). Before this, the legacy eve
  //      URL `/pray/2026-12-26/vespers` disagreed with the card list and
  //      rendered the Octave weekday's Evening Prayer.
  //      Composition differs from Path 1/2: the `weeks[key].SUN.firstVespers`
  //      cells of holyFamily / baptism are psalter extracts (psalms +
  //      reading + responsory + intercessions, NO Magnificat antiphon and
  //      NO concluding prayer), so they are merged with the celebration's
  //      own `SUN.vespers` (EP I) cell through `mergeSundayFirstVespers` —
  //      byte-identical to what the `/firstVespers` route (Path 3 below)
  //      renders on the feast's own URL. A Solemnity's own EP II still
  //      wins over the next day's Feast EP I (Table I.2/I.3 > II.5), hence
  //      the `day.rank !== 'SOLEMNITY'` guard: Christmas Day on a Saturday
  //      (2027-12-25) keeps its Second Vespers.
  if (hour === 'vespers') {
    const tomorrowDate = new Date(dateStr + 'T00:00:00Z')
    tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1)
    const tMM = String(tomorrowDate.getUTCMonth() + 1).padStart(2, '0')
    const tDD = String(tomorrowDate.getUTCDate()).padStart(2, '0')
    const tomorrowStr = `${tomorrowDate.getUTCFullYear()}-${tMM}-${tDD}`
    const tomorrowDay = getLiturgicalDay(tomorrowStr)
    // Privileged-Sunday guard (Universal Norms n. 61): a Sunday of Advent /
    // Lent / Easter keeps its own Evening Prayer II even when Monday is a
    // Solemnity/Feast with First Vespers — identical rule to the card list
    // in `getHoursSummary`, see `keepsOwnEveningPrayerII`.
    if (
      tomorrowDay &&
      (tomorrowDay.rank === 'SOLEMNITY' || tomorrowDay.rank === 'FEAST') &&
      !keepsOwnEveningPrayerII(day, dayOfWeek, tomorrowDay)
    ) {
      // Path 1 — fixed-date celebration via sanctoral entry.
      // `resolveSanctoralForDay` (P0-3) applies the entry only when romcal
      // chose that celebration for tomorrow — a plain Sunday sharing the
      // MM-DD (2028-03-19 vs St Joseph) yields null, and a transferred
      // solemnity (2028-03-20) is found by romcal key. Solemnities → feasts
      // → memorials, so FEAST entries (02-02, 08-06, 09-14, 11-09) resolve.
      const tomorrowResolvedSanctoral = resolveSanctoralForDay(tomorrowDay)
      const tomorrowSanctoral = tomorrowResolvedSanctoral?.entry
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
      const tomorrowSpecialKey = resolveSpecialKey(
        tomorrowDay.season,
        tomorrowDay.name,
        undefined,
        tomorrowDay.romcalKey,
      )
      if (
        !solemnityFirstVespers &&
        tomorrowDay.rank === 'SOLEMNITY' &&
        tomorrowSpecialKey != null
      ) {
        solemnityFirstVespers = getSeasonFirstVespers(
          tomorrowDay.season,
          tomorrowDay.weekOfSeason,
          tomorrowStr,
          tomorrowDay.name,
          tomorrowDay.romcalKey,
        )
      }
      // Path 2b — Feast of the Lord on a SUNDAY (Holy Family, Baptism of
      // the Lord). See the header comment above for the rubric. Composed
      // with the celebration's own EP I cell, never self-contained.
      let eveComposedWith: HourPropers | null = null
      if (
        !solemnityFirstVespers &&
        tomorrowDay.rank === 'FEAST' &&
        dateToDayOfWeek(tomorrowStr) === 'SUN' &&
        day.rank !== 'SOLEMNITY' &&
        tomorrowSpecialKey != null
      ) {
        const feastFirstVespers = getSeasonFirstVespers(
          tomorrowDay.season,
          tomorrowDay.weekOfSeason,
          tomorrowStr,
          tomorrowDay.name,
          tomorrowDay.romcalKey,
        )
        if (feastFirstVespers) {
          solemnityFirstVespers = feastFirstVespers
          eveComposedWith = getSeasonHourPropers(
            tomorrowDay.season,
            tomorrowDay.weekOfSeason,
            'SUN',
            'vespers',
            tomorrowStr,
            tomorrowDay.name,
            tomorrowDay.romcalKey,
          )
        }
      }
      if (solemnityFirstVespers) {
        // Path 1/2 First Vespers are self-contained — no per-field
        // backstop to the regular seasonal vespers. The PDF prints the
        // entire 1st Vespers ordinary on the solemnity's own section.
        // Path 2b (`eveComposedWith` set) composes instead, mirroring the
        // `/firstVespers` route so card and eve URL agree byte-for-byte.
        seasonPropers = eveComposedWith
          ? mergeSundayFirstVespers(eveComposedWith, solemnityFirstVespers)
          : (solemnityFirstVespers as HourPropers)
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
        // Rich overlay follows the plain source: key Layer 4 on tomorrow's
        // identity (mirror of the `/firstVespers` route's lookup for the
        // same celebration). When the celebration authors no rich, the
        // section falls back to plain — never another day's markup.
        richLookupIdentity = {
          season: tomorrowDay.season,
          weekKey: String(tomorrowDay.weekOfSeason),
          day: dateToDayOfWeek(tomorrowStr),
          sanctoralKey: tomorrowResolvedSanctoral?.key ?? null,
          celebrationName: tomorrowDay.name,
          dateStr: tomorrowStr,
          romcalKey: tomorrowDay.romcalKey,
        }
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

    // Path 1 — sanctoral.firstVespers (Solemnity / Feast). P0-3: resolved
    // through romcal's choice for the day (see `sanctoral-resolver.ts`).
    if (day.rank === 'SOLEMNITY' || day.rank === 'FEAST') {
      const todaySanctoral = resolveSanctoralForDay(day)?.entry
      if (todaySanctoral?.firstVespers) {
        firstVespersData = todaySanctoral.firstVespers
        isSelfContained = true
      }
    }

    // Path 2 — movable Solemnity special-key
    if (
      !firstVespersData &&
      day.rank === 'SOLEMNITY' &&
      resolveSpecialKey(day.season, day.name, undefined, day.romcalKey) != null
    ) {
      firstVespersData = getSeasonFirstVespers(
        day.season,
        day.weekOfSeason,
        dateStr,
        day.name,
        day.romcalKey,
      )
      if (firstVespersData) isSelfContained = true
      // GOAL #177 — running psalter-week Sunday FIRST Vespers psalmody
      // fallback for the four in-scope OT movable Solemnities (Trinity
      // Sunday / Corpus Christi / Sacred Heart / Christ the King). Their
      // special-key `firstVespers` block is self-contained for proper
      // fields (Magnificat antiphon + concluding prayer) but carries NO
      // `psalms`. Without sourced Mongolian Laudate psalmody, First Vespers
      // must follow the date's running psalter-week Sunday FIRST Vespers set
      // `weeks[day.psalterWeek].SUN.firstVespers.psalms` (fv-wN-sun-*), NOT
      // the regular Sunday SECOND Vespers base seeded at step 2
      // (Ps 110 / Ps 114 / Rev 19). We pull ONLY the psalm array from the
      // numeric weekly Sunday First Vespers block (passing neither date nor
      // name so `getSeasonFirstVespers` bypasses the special-key lookup) and
      // leave every proper field untouched. Pentecost is unaffected: its
      // special-key block carries sourced `movable-pentecost-*` psalms, so
      // the no-psalms guard never fires. See
      // docs/design/mental-models/goal177-solemnity-firstvespers-running-week.md.
      const otMovableSpecialKey = resolveSpecialKey(day.season, day.name)
      if (
        firstVespersData &&
        (!firstVespersData.psalms || firstVespersData.psalms.length === 0) &&
        (otMovableSpecialKey === 'trinitySunday' ||
          otMovableSpecialKey === 'corpusChristi' ||
          otMovableSpecialKey === 'sacredHeart' ||
          otMovableSpecialKey === 'christTheKing')
      ) {
        const runningSundayFirstVespers = getSeasonFirstVespers(
          day.season,
          day.psalterWeek,
        )
        if (
          runningSundayFirstVespers?.psalms &&
          runningSundayFirstVespers.psalms.length > 0
        ) {
          firstVespersData = {
            ...firstVespersData,
            psalms: runningSundayFirstVespers.psalms,
          }
        }
      }
    }

    // Path 3 — plain Sunday (or any season firstVespers entry as fallback)
    if (!firstVespersData) {
      firstVespersData = getSeasonFirstVespers(
        day.season,
        day.weekOfSeason,
        dateStr,
        day.name,
        day.romcalKey,
      )
      // Path 3 is NOT self-contained — composed with the Sunday's regular
      // (EP I) vespers proper, which is already in seasonPropers from the
      // initial fetch. `mergeSundayFirstVespers`: the season's reading /
      // responsory / intercessions / concluding prayer(s) win over the
      // firstVespers cell's psalter copies (book season sections vs
      // psalter Sunday EP I blocks — see the helper); psalms + antiphons
      // stay the firstVespers cell's. Same composition as the Saturday
      // eve `/vespers` path below, so route and eve agree.
    }

    if (firstVespersData) {
      seasonPropers = isSelfContained
        ? (firstVespersData as HourPropers)
        : mergeSundayFirstVespers(seasonPropers, firstVespersData)
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

  // FR-176 rule (c): a weekday Solemnity outranks a plain Sunday of
  // Ordinary Time / Christmas season (I.3 > II.6), so Saturday's own
  // Evening Prayer II stays. Without this gate the FR-156 branch above
  // correctly declined to promote, but the plain Saturday→Sunday rule
  // below still promoted the identity and the psalmody — leaving the
  // Assumption's Magnificat antiphon sitting on the Sunday's psalms.
  const saturdayDefersToSunday =
    dayOfWeek !== 'SAT' ||
    !keepsOwnEveningPrayerII(day, dayOfWeek, getLiturgicalDay(nextDateStr(dateStr)))
  if (!seasonPropers && dayOfWeek === 'SAT' && hour === 'vespers' && saturdayDefersToSunday) {
    // Next day is Sunday. FR-156: prefer the Sunday's dedicated
    // firstVespers propers when authored (Phase 2, task #20). Falls
    // back to the upcoming Sunday's regular vespers propers otherwise.
    //
    // Season/week come from the SUNDAY's own liturgical day (falling
    // back to Saturday's season + 1 when the calendar has no entry, e.g.
    // mocked tests): within a season `sunday.weekOfSeason === saturday
    // .weekOfSeason + 1`, but across the OT → Advent boundary (Saturday
    // of OT week 34, 2026-11-28) Saturday's `weeks['35']` does not exist
    // and fell back to OT `weeks['1'].SUN` — an empty Magnificat
    // antiphon. The First Vespers sung that evening is Advent Sunday I
    // (`advent.json weeks['1'].SUN`).
    const sundayDate = new Date(dateStr + 'T00:00:00Z')
    sundayDate.setUTCDate(sundayDate.getUTCDate() + 1)
    const sMM = String(sundayDate.getUTCMonth() + 1).padStart(2, '0')
    const sDD = String(sundayDate.getUTCDate()).padStart(2, '0')
    const sundayStr = `${sundayDate.getUTCFullYear()}-${sMM}-${sDD}`
    const sundayDay = getLiturgicalDay(sundayStr)
    const sundaySeason = sundayDay?.season ?? day.season
    const nextWeek = sundayDay?.weekOfSeason ?? day.weekOfSeason + 1
    // FR-172 (GOAL #268): the celebration IDENTITY handed to the propers
    // loader must be the SUNDAY's, not Saturday's. Christmas-season buckets
    // are keyed by identity (`holyFamily` / `baptism` / `epiphany`), so
    // passing Saturday's own name ("Saturday after Epiphany",
    // "The Most Holy Name of Jesus") resolved no special key and the
    // Sunday's authored First Vespers was skipped — 2026-01-10 evening
    // rendered no Magnificat antiphon and no concluding prayer even though
    // `weeks['baptism'].SUN.firstVespers` exists. Ordinary-Time and the
    // other seasons are keyed by week NUMBER, so they are unaffected.
    //
    // `dateStr` deliberately stays SATURDAY's: `getSeasonHourPropers` /
    // `getSeasonFirstVespers` use it for the ADVENT dec17-24 date-key
    // block, and substituting the Sunday's date would make the eve of a
    // Sunday Dec 24 (2028-12-24, 2034-12-24) read `weeks['dec24'].SUN`,
    // which authors only `lauds` — the whole vespers lookup would return
    // null instead of the 4th Advent Sunday's propers.
    const sundayName = sundayDay?.name ?? day.name
    const sundayRomcalKey = sundayDay?.romcalKey
    const firstVespers = getSeasonFirstVespers(sundaySeason, nextWeek, dateStr, sundayName, sundayRomcalKey)
      ?? getSeasonFirstVespers(day.season, day.weekOfSeason, dateStr, day.name, day.romcalKey)
    // Always compute the upcoming Sunday's regular vespers propers —
    // used as standalone fallback when firstVespers is absent, AND as the
    // seasonal Sunday EP I proper composed with firstVespers (FR-156
    // Phase 2). Rationale: the PDF's psalter First Vespers blocks reference
    // the seasonal Sunday propers for gospelCanticleAntiphon and
    // concludingPrayer ("Шад магтаал: үүнийг «Цаг улирлын Онцлог шинж»
    // гэсэн хэсгээс татаж авна"), and in Advent / Lent / Easter the season
    // section also prints the Sunday EP I reading / responsory /
    // intercessions (p.548-550 / 618-620 / 700-702) which take precedence
    // over the psalter copies in the firstVespers cell —
    // `mergeSundayFirstVespers` (identical composition to the
    // `/firstVespers` route, Path 3 above).
    const sundayRegular = getSeasonHourPropers(sundaySeason, nextWeek, 'SUN', 'vespers', dateStr, sundayName, sundayRomcalKey)
      ?? getSeasonHourPropers(day.season, day.weekOfSeason, 'SUN', 'vespers', dateStr, day.name, day.romcalKey)
    if (firstVespers) {
      seasonPropers = mergeSundayFirstVespers(sundayRegular, firstVespers)
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
      ;({ effectiveDayOfWeek, effectiveWeekOfSeason } =
        promoteToFirstVespersIdentity(sundayStr, 'SUN', nextWeek))
      // #216 F-2c integration: also promote liturgical day so downstream
      // rank-keyed rubric (compline F-2) sees Sunday's identity. For
      // plain-Sunday Saturday→Sunday this is usually a no-op for F-2
      // (rank stays non-SOLEMNITY for plain Sundays), but it keeps the
      // semantic explicit and parallels the Solemnity branch above.
      if (sundayDay) effectiveLiturgicalDay = sundayDay
    } else {
      // Pre-Phase-2 path: reuse the upcoming Sunday's regular (2nd) Vespers propers.
      seasonPropers = sundayRegular
    }
  }

  // 3b. FR-171 (GOAL #268) — Sunday Evening Prayer II on the Sunday itself.
  //
  // The book prints every Sunday's propers as three numbered blocks —
  // `1 дүгээр Оройн даатгал залбирал` (Evening Prayer I) /
  // `Өглөөний даатгал залбирал` (Morning Prayer) /
  // `2 дугаар Оройн даатгал залбирал` (Evening Prayer II) — with no
  // year-cycle (A/B/C) variants anywhere in the volume. The data mirrors
  // that: `weeks[N].SUN.vespers` is EP I, `weeks[N].SUN.vespers2` is EP II.
  // Saturday evening and `/firstVespers` correctly sing the EP I cell; the
  // Sunday's OWN `/vespers` was re-using that same cell and therefore
  // rendered Evening Prayer I a second time (41 of 52 Sundays in 2026 —
  // in Advent / Lent / Easter the reading, responsory and intercessions
  // were EP I's too). See `docs/research/2026-09-16-sunday-vespers2.md` §1.
  //
  // OVERLAY, not replacement: Ordinary-Time `vespers2` cells print only the
  // Magnificat antiphon + the (identical) concluding prayer, and the book
  // prints the `Сонголтот залбирал` alternate once per Sunday — replacing
  // wholesale would drop it. Advent / Lent / Easter and the Christmas
  // feasts author complete `vespers2` cells, so there the overlay IS a
  // replacement.
  //
  // Gates:
  //   - `hour === 'vespers'` — never `/firstVespers`, never Saturday eve.
  //   - the celebration's OWN evening: a Sunday, or a Feast of the Lord
  //     that carries a season-propers special key (Holy Family, Baptism of
  //     the Lord — which land on a weekday in the years Christmas or
  //     Epiphany displaces them: Holy Family Fri 2033-12-30, Baptism Mon
  //     2029-01-08). The SOLEMNITY equivalent is the GOAL #20 swap above.
  //   - no First-Vespers promotion fired above (`effectiveLiturgicalDay`
  //     still today): a Sunday whose Monday carries First Vespers already
  //     renders tomorrow's celebration, and the privileged-Sunday guard
  //     (`keepsOwnEveningPrayerII`) decides which wins.
  //   - the GOAL #20 movable-Solemnity swap has not already run
  //     (`seasonalRichHour !== 'vespers2'`).
  // Special-key celebrations that own no `vespers2` (Easter Sunday — its
  // `vespers` cell IS Evening Prayer II, jan1, the Christmas Octave
  // weekdays) short-circuit inside `getSeasonVespers2`, so this block is a
  // no-op for them.
  const isOwnDayOfFeastSpecialKey =
    day.rank === 'FEAST' &&
    resolveSpecialKey(day.season, day.name, dateStr, day.romcalKey) != null
  if (
    hour === 'vespers' &&
    (dayOfWeek === 'SUN' || isOwnDayOfFeastSpecialKey) &&
    effectiveLiturgicalDay.date === day.date &&
    seasonalRichHour !== 'vespers2'
  ) {
    const sundayVespers2 = getSeasonVespers2(
      day.season,
      day.weekOfSeason,
      dateStr,
      day.name,
      day.romcalKey,
    )
    if (sundayVespers2) {
      seasonPropers = { ...(seasonPropers ?? {}), ...sundayVespers2 }
      seasonalRichHour = 'vespers2'
      sundayVespers2Overlay = true
      // Mirror of the #20 swap: a `vespers2` cell that prints its own
      // psalmody (none today outside dec25/pentecost, both special-key)
      // overrides the running psalter.
      if (sundayVespers2.psalms && sundayVespers2.psalms.length > 0) {
        psalmEntries = sundayVespers2.psalms
      }
    }
  }

  // 4. Get sanctoral propers (if applicable)
  //    When the user has chosen a non-default celebration, its propers take
  //    precedence over whatever sanctoral entry would normally apply.
  //    P0-3: the romcal-gated resolver decides whether the fixed-date entry
  //    applies today (and which MM-DD key it lives under when transferred).
  const dateObj = new Date(dateStr + 'T00:00:00Z')
  const dateKey = `${String(dateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(dateObj.getUTCDate()).padStart(2, '0')}`
  const resolvedSanctoral = celebrationOverride ? null : resolveSanctoralForDay(day)
  const sanctoral: SanctoralEntry | null = celebrationOverride ?? resolvedSanctoral?.entry ?? null
  const sanctoralKey: string | null = sanctoral ? (resolvedSanctoral?.key ?? dateKey) : null

  // 5. Determine antiphon overrides (sanctoral > season)
  //    For solemnities on the day itself, use vespers2 (Second Vespers) data.
  //    For firstVespers route, prefer sanctoral.firstVespers when authored;
  //    for firstCompline route, fall back to sanctoral.compline (no
  //    `firstCompline` field exists in SanctoralEntry per current schema).
  //    FR-176: when the eve promotion above moved the office to ANOTHER day,
  //    today's own sanctoral propers must not overlay it — we are rendering
  //    tomorrow's First Vespers, not today's Evening Prayer. Tomorrow's
  //    sanctoral First Vespers is already folded into `seasonPropers` by
  //    Path 1, and the rich overlay is already keyed to tomorrow through
  //    `richLookupIdentity`, so the plain sanctoral layer was the one place
  //    still speaking for the wrong day (2028-01-01 evening rendered the
  //    Epiphany's identity with Jan 1's Magnificat antiphon).
  //
  //    Narrowed to entries that carry a `vespers2` — the celebrations that
  //    would otherwise impose their OWN Evening Prayer II on an evening that
  //    belongs to tomorrow. All Souls (11-02) has a single `vespers` cell and
  //    a substitute directive that FR-160-B-7 deliberately keeps surfaced on
  //    a Saturday eve, so it stays outside this gate.
  const officeMovedToAnotherDay =
    effectiveLiturgicalDay.date !== day.date && !!sanctoral?.vespers2
  let hourPropers: HourPropers | undefined
  if (officeMovedToAnotherDay) {
    hourPropers = undefined
  } else if (
    hour === 'vespers' &&
    (day.rank === 'SOLEMNITY' || day.rank === 'FEAST') &&
    sanctoral?.vespers2
  ) {
    // FR-177 — the celebration's OWN evening is Evening Prayer II whenever
    // the book prints one. `vespers2` is exactly that signal: 8 Solemnities
    // + the 4 Feasts of the Lord (`sanctoral/{solemnities,feasts}.json`);
    // no memorial or saint's Feast carries it, so the rank test only guards
    // against reading a `vespers2` that is not there.
    //
    // The `FEAST` half was missing, so the Presentation, the
    // Transfiguration, the Exaltation of the Cross and the Dedication of
    // the Lateran fell through to `sanctoral.vespers` — their FIRST
    // Vespers — on their own evening, every year. The book is explicit
    // about what that cell is and when it is used: p.821 «Хэрэв энэ баяр
    // Ням гарагт таарвал 1 дүгээр Оройн даатгал залбирал уншина.» (also
    // p.831, p.835; p.840 prints the heading without the note, and the
    // data mirrors that per-feast difference). Same defect shape as
    // FR-171 for Sundays.
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

  // 6.5 GOAL #13 (FR-160-B-6): psalmody-substitute logic-resolve. Movable
  // solemnities whose Lauds / 2nd-Vespers psalmody is "drawn from psalter
  // Week 1 Sunday" (Pentecost, Easter Sunday, Christmas Day; PDF "х. 58")
  // carry a `substitute` rubric with a structured `target.psalterRef`.
  // Resolve it HERE — before step 7 psalm-text resolution — so the borrowed
  // psalms flow through `resolvePsalm` with the borrowing day's season
  // (EASTER → Alleluia augmentation, GILH §113) and any solemnity-proper
  // `antiphonOverrides`. Without this the assembler renders the WRONG
  // psalter week (e.g. Pentecost falls on psalterWeek 4, not 1) and Layer
  // 4.5 + psalmody-section.tsx then hide it behind the directive-only note
  // — the exact "시편이 안 나온다" bug GOAL #13 fixes. Skipped when sanctoral
  // `replacesPsalter` already supplied proper psalmody (more specific wins).
  //
  // GOAL #27 (#27-sub-2): the eve / First-Vespers-promotion signal gates
  // the DYNAMIC `psalterRef.week: 'current'` borrow (All Souls' 11-02 on
  // Sunday). On a Saturday-eve render the All Souls rubric matches only via
  // the SUN promotion, so the dynamic inline is suppressed there (both the
  // injection below and Layer 4.5's bodyInlined) — preserving the legacy
  // note-only surface. Mirrors `firstVespersBranchActive` computed below.
  const isEveOfFollowingDay =
    effectiveDayOfWeek !== dayOfWeek || isFirstVespers || isFirstCompline
  if (!(sanctoral?.replacesPsalter && sanctoral.properPsalmody)) {
    const substituteRef = resolvePsalmodySubstituteRef([seasonPropers, hourPropers], {
      season: day.season,
      dayOfWeek: effectiveDayOfWeek,
      dateStr,
      hour,
      isFirstHourOfDay: hour === 'lauds',
      isEveOfFollowingDay,
    })
    if (substituteRef) {
      try {
        // GOAL #27: narrow the `'current'` sentinel to the rendering day's
        // own 4-week-cycle week (the "matching Sunday" per PDF p.839).
        const borrowedWeek =
          substituteRef.week === 'current' ? day.psalterWeek : substituteRef.week
        const borrowed = getPsalterPsalmody(
          borrowedWeek,
          substituteRef.day,
          substituteRef.hour,
        )
        if (borrowed?.psalms && borrowed.psalms.length > 0) {
          psalmEntries = borrowed.psalms
        }
      } catch {
        // Borrowed-psalter fetch failed (e.g. unexpected ref) — fall back to
        // the base psalmody already loaded above rather than blanking the
        // section. The directive note still surfaces via Layer 4.5.
      }
    }
  }

  // 7. Resolve psalm texts — use allSettled so a single bad psalm (e.g. a
  // scripture reference that fails to parse or a missing Bible chapter)
  // does not collapse the whole hour into a 404. Failed entries render as
  // empty-verse placeholders with the antiphon we already know.
  //
  // Season for the PDF seasonal-antiphon variant follows the PROMOTED
  // identity, like `effectiveDayOfWeek` / `effectiveWeekOfSeason` already
  // do. The two differ only across a season boundary: Saturday of Ordinary
  // Time week 34 (2025-11-29 / 2026-11-28) renders the 1st Sunday of
  // Advent's First Vespers (`5cc8a80` fetched the Advent propers), but
  // with `day.season === 'ORDINARY_TIME'` `pickSeasonalVariant` never
  // reached `seasonal_antiphons.advent` and Ps 141 kept its psalter default
  // antiphon while `/2025-11-30/firstVespers` showed the Advent one.
  const effectiveSeason = effectiveLiturgicalDay.season
  const psalmResults = await Promise.allSettled(
    psalmEntries.map((entry) =>
      resolvePsalm(
        entry,
        antiphonOverrides,
        effectiveSeason,
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
      effectiveSeason,
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
        : applySeasonalAntiphon(fallbackAntiphon, effectiveSeason),
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
  // Identical predicate to `isEveOfFollowingDay` (computed before step 6.5);
  // reuse it so the eve/promotion signal has a single source of truth.
  const firstVespersBranchActive = isEveOfFollowingDay
  // Eve of a Solemnity / Feast (FR-156 Path 1/2): the plain propers are
  // tomorrow's First Vespers, so the rich overlay is keyed on tomorrow's
  // identity (`richLookupIdentity`, set in the eve branch) — otherwise
  // today's weekday rich (e.g. Advent w1 THU on Christmas Eve) would be
  // spread under a different celebration's plain text.
  const richKey = richLookupIdentity
    ? {
        season: richLookupIdentity.season,
        weekKey: richLookupIdentity.weekKey,
        day: richLookupIdentity.day,
        hour: dataLookupHour,
        seasonalHour: seasonalRichHour,
        sanctoralKey: richLookupIdentity.sanctoralKey,
        psalterWeek: undefined,
        celebrationName: richLookupIdentity.celebrationName,
        dateStr: richLookupIdentity.dateStr,
        romcalKey: richLookupIdentity.romcalKey,
      }
    : {
        season: day.season,
        weekKey: String(day.weekOfSeason),
        // For firstCompline: rich overlay keyed on SAT slot (mirrors
        // compline.json eve-shift). For firstVespers: keyed on SUN
        // (today's dayOfWeek). For others: dayOfWeek.
        day: isFirstCompline ? dataLookupDayOfWeek : dayOfWeek,
        hour: dataLookupHour,
        seasonalHour: seasonalRichHour,
        sanctoralKey,
        psalterWeek: firstVespersBranchActive ? undefined : day.psalterWeek,
        celebrationName: day.name,
        dateStr,
        romcalKey: day.romcalKey,
      }
  let richLayers = resolveRichOverlayLayers(richKey)
  if (seasonalRichHour === 'vespers2' && !richLayers.seasonal) {
    // No `-vespers2` rich authored for this Second Vespers cell (e.g. the
    // Ascension `wascension-SUN-vespers2` file does not exist). Fall back
    // to the celebration's `-vespers` file the way the pre-convention
    // lookup did; `applyRichSourceParity` below compares it against the
    // `vespers` cell it was generated from, so only fields whose text is
    // identical in EP I and EP II (Ascension's concluding prayer, p.731)
    // survive — never the First Vespers reading / antiphon.
    seasonalRichHour = dataLookupHour
    richLayers = resolveRichOverlayLayers({ ...richKey, seasonalHour: seasonalRichHour })
  }
  // Rich ↔ plain source parity (`applyRichSourceParity`): a rich field is
  // kept only when the merged plain text equals the text of the cell that
  // rich was generated from. The seasonal cell is re-fetched with the very
  // key used for the seasonal rich (same special-key / week / wk1 fallback
  // chain in `getSeasonHourPropers`), the psalter-commons cell is the
  // Layer 1 object, the sanctoral cell is Layer 3's `hourPropers`. This
  // stops a lower layer's rich (running-week seasonal / psalter) from
  // being rendered over a higher layer's plain (sanctoral Solemnity,
  // Solemnity First Vespers, `vespers2`) — the class behind All Saints
  // Lauds showing the OT Sunday-31 concluding prayer and Christmas Eve
  // Vespers carrying the Advent weekday prayer's rich as its alternate.
  // The seasonal cell is the one the seasonal rich was generated from:
  // `vespers2` → `getSeasonVespers2` (same special-key resolution as the
  // GOAL #20 swap), otherwise `getSeasonHourPropers` with the rich key.
  const seasonalCellForRich = seasonalRichHour === 'vespers2'
    ? getSeasonVespers2(
        richKey.season,
        Number(richKey.weekKey),
        richKey.dateStr ?? undefined,
        richKey.celebrationName ?? undefined,
        richKey.romcalKey,
      )
    : getSeasonHourPropers(
        richKey.season,
        Number(richKey.weekKey),
        richKey.day,
        dataLookupHour,
        richKey.dateStr ?? undefined,
        richKey.celebrationName ?? undefined,
        richKey.romcalKey,
      )
  // FR-171: the plain-Sunday Evening Prayer II overlay composed TWO cells
  // (`{ ...SUN.vespers, ...SUN.vespers2 }`), so the `-vespers` rich is a
  // legitimate second source for the fields `vespers2` does not print —
  // Ordinary Time's alternate concluding prayer, and Advent / Lent /
  // Easter's responsory + concluding prayers, whose EP I and EP II copies
  // are byte-identical in the book (every authored `-vespers2` file on disk
  // carries `shortReadingRich` only). Parity still compares each candidate
  // against ITS OWN cell, so Advent's EP I intercessions rich is dropped
  // rather than rendered over the EP II petitions. Not applied to the
  // GOAL #20 special-key swap: that REPLACES the cell wholesale, so its
  // single-source semantics stand.
  let seasonalFallbackRich: RichOverlayLayers['seasonalFallback'] = null
  let seasonalFallbackCell: HourPropers | null = null
  if (sundayVespers2Overlay && seasonalRichHour === 'vespers2') {
    seasonalFallbackRich = resolveRichOverlayLayers({
      ...richKey,
      seasonalHour: dataLookupHour,
    }).seasonal
    seasonalFallbackCell = getSeasonHourPropers(
      richKey.season,
      Number(richKey.weekKey),
      richKey.day,
      dataLookupHour,
      richKey.dateStr ?? undefined,
      richKey.celebrationName ?? undefined,
      richKey.romcalKey,
    )
  }
  const richOverlay = applyRichSourceParity(
    { ...richLayers, seasonalFallback: seasonalFallbackRich },
    {
      psalterCommons,
      seasonal: seasonalCellForRich,
      seasonalFallback: seasonalFallbackCell,
      sanctoral: hourPropers,
    },
    mergedPropers,
  )
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
      // GOAL #27 (#27-sub-2): same eve/promotion gate as step 6.5 so the
      // dynamic `'current'` bodyInlined flag stays consistent with the
      // injection (suppressed on Saturday-eve 11-02 → note-only preserved).
      isEveOfFollowingDay,
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
  // FR-168 (GOAL #90) — when a saturday-mary candidate list is present, the
  // gospel-canticle antiphon is a fixed Marian proper chosen from
  // `gospelCanticleAntiphonCandidates`; do NOT apply the seasonal-antiphon
  // augmentation (Eastertide Alleluia) to it. The Saturday memorial of the
  // BVM only surfaces on Ordinary-Time Saturdays anyway, so this is a
  // no-op in practice — but skipping keeps the candidate texts byte-equal
  // to the breviary source (peer-corrected "applySeasonalAntiphon skip").
  if (
    mergedPropers.gospelCanticleAntiphon &&
    !(mergedPropers.gospelCanticleAntiphonCandidates &&
      mergedPropers.gospelCanticleAntiphonCandidates.length > 0)
  ) {
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
    // Response contract (FR-156, §6-1 option a): `liturgicalDay` stays the
    // URL date's civil identity; the promoted identity is exposed
    // separately and ONLY when the eve branches above moved it to another
    // date (Saturday → Sunday, Solemnity/Feast eve). The firstVespers /
    // firstCompline routes mirror `day` and therefore omit the field.
    liturgicalDay: day,
    ...(effectiveLiturgicalDay.date !== day.date
      ? { effectiveLiturgicalDay }
      : {}),
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
 *   - All Sundays (Phase 2 #20: most `weeks[N].SUN.firstVespers` slots
 *     are populated; the SUN branch fires unconditionally regardless,
 *     and `assembleHour`'s backstop merge from regular Sunday vespers
 *     fills partial slots and the empty ones. Empty `SUN.firstVespers`
 *     slots exist across `propers/easter.json` (Easter Octave —
 *     `weeks['easterSunday'].SUN`, `weeks[1].SUN`),
 *     `propers/advent.json` (`weeks['dec24'].SUN`), and
 *     `propers/christmas.json` (`weeks['dec25'/'octave'/'jan1'/
 *     'epiphany'/'epiphanyWeek'].SUN`); eligibility holds because
 *     the SUN branch short-circuits before any data check — see
 *     `hasFirstVespersAndCompline` below).
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
  // Easter Sunday has NO First Vespers — the Easter Vigil takes its place.
  // Printed evidence: the book's Easter Sunday section (p.690-693) runs
  // «Дээгүүр өнгөрөх цаг улирлын эхлэл» → «Урих дуудлага» → «Өглөөний
  // даатгал залбирал» → «Оройн даатгал залбирал», with no «1 дүгээр Оройн
  // даатгал залбирал» heading — unlike the Second Sunday of Easter, which
  // prints one on p.701. The data agrees: `easter.json`
  // `weeks.easterSunday.SUN` holds only `lauds` and `vespers`.
  //
  // Without this exception the blanket `dayOfWeek === 'SUN'` rule below
  // made two things wrong every year: `/pray/<easter>/firstVespers`
  // answered 200 with a copy of Evening Prayer II (via the backstop
  // merge), and — because the card list asks whether TOMORROW carries
  // First Vespers — Holy Saturday lost its own Evening Prayer and Night
  // Prayer cards even though the book prints Holy Saturday's Evening
  // Prayer on p.683.
  if (day.romcalKey === 'easter') return false
  if (dayOfWeek === 'SUN') return true
  if (day.rank !== 'SOLEMNITY' && day.rank !== 'FEAST') return false
  // Sanctoral path (P0-3: romcal-gated, transfer-aware)
  const sanctoral = resolveSanctoralForDay(day)?.entry
  if (sanctoral?.firstVespers) return true
  // Movable Solemnity special-key path
  if (day.rank === 'SOLEMNITY' && resolveSpecialKey(day.season, day.name, undefined, day.romcalKey) != null) {
    const fv = getSeasonFirstVespers(day.season, day.weekOfSeason, dateStr, day.name, day.romcalKey)
    if (fv) return true
  }
  return false
}

/**
 * #242 F-X5 FU#2 — public eligibility gate for the
 * `/pray/<date>/firstVespers`, `/pray/<date>/firstCompline`, and parallel
 * `/api/loth/<date>/{firstVespers,firstCompline}` URLs.
 *
 * A date is eligible iff its OWN `hasFirstVespersAndCompline()` returns
 * true — the date itself carries firstVespers content:
 *   - any Sunday (Phase 2 #20: most `weeks[N].SUN.firstVespers` slots
 *     are populated, with backstop merge from regular Sunday vespers
 *     filling partial slots. Several SUN slots are empty across the
 *     propers — Easter Octave (`weeks['easterSunday'].SUN`,
 *     `weeks[1].SUN` of `easter.json`), Christmas season
 *     (`weeks['dec25'/'octave'/'jan1'/'epiphany'/'epiphanyWeek'].SUN`
 *     of `christmas.json`), and Advent Dec 24 (`weeks['dec24'].SUN`
 *     of `advent.json`) — and rely ENTIRELY on the backstop merge.
 *     Eligibility still holds because the dayOfWeek=SUN gate in
 *     `hasFirstVespersAndCompline` short-circuits before the data
 *     check, so the route 200s and serves the merged content),
 *   - a fixed-date Solemnity/Feast with sanctoral `firstVespers` data
 *     (12 Solemnities + 4 Feasts of the Lord), or
 *   - a movable Solemnity resolved via `getSeasonFirstVespers`
 *     special-key path (Ascension, Pentecost, Trinity Sunday,
 *     Corpus Christi, Sacred Heart, Christ the King).
 *
 * Ordinary weekdays (Mon-Sat with no celebration) are NOT eligible —
 * before #242 the URL still returned 200 with an out-of-rubric Sunday
 * vespers fallback. Routes now `notFound()` / 404 for non-eligible
 * dates so SW caches do not pin out-of-rubric content (#231 R2 FU#2
 * finding).
 */
export function isFirstVespersEligibleDate(dateStr: string): boolean {
  const day = getLiturgicalDay(dateStr)
  if (!day) return false
  const dayOfWeek = dateToDayOfWeek(dateStr)
  return hasFirstVespersAndCompline(dateStr, day, dayOfWeek)
}

/**
 * Get a summary of all hours available for a given date.
 *
 * FR-NEW #230 (F-X5, Q4=P) + #240 (F-X5 FU#1) — per-day hour list with
 * forward-looking eve-stripping:
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
 *     case (Q1); Q4=P extends to weekday-eve-of-celebration.
 *
 *   - **Today is a non-privileged Sunday (ORDINARY_TIME or CHRISTMAS,
 *     class 6 in Table of Liturgical Days) with tomorrow carrying
 *     firstVespers** (i.e., Mon = Solemnity class 3 / Feast of the
 *     Lord class 5): Sun II vespers + compline cards STRIPPED — the
 *     content is now surfaced on Mon's firstVespers/firstCompline
 *     cards. Per Universal Norms n. 61 (GIRM #59), the higher-rank
 *     I Vespers wins. Privileged Sundays (ADVENT/LENT/EASTER, class
 *     2) are PROTECTED — their II Vespers outranks Mon Solemnity of
 *     Saints (class 3) / Mon Feast of the Lord (class 5).
 *     Implemented in #240 F-X5 FU#1. Test case: 2026-06-28 (13th
 *     Sun OT) → 2026-06-29 (Mon Sts. Peter & Paul SOLEMNITY).
 *
 *   - **Sun ADVENT → Mon CHRISTMAS season boundary** (e.g.,
 *     2028-12-24 Sun 4th Advent → 2028-12-25 Mon Christmas): the
 *     privileged-Sunday guard is OVERRIDDEN. Per Universal Norms
 *     n. 40, "Advent ends before First Vespers of the Nativity of
 *     the Lord" — the season boundary itself displaces Sunday II
 *     Vespers, regardless of class-rank collision. Detected as
 *     `today.season === 'ADVENT' && tomorrow.season === 'CHRISTMAS'`
 *     (only Dec 24 satisfies both). Implemented in #245 F-X5 FU#4.
 *     Recurrence ~6-7 yr (next 2028-12-24, then 2034-12-24).
 *
 *   - **Other weekday** (no firstVespers today, no celebration tomorrow):
 *     lauds + vespers + compline (unchanged from pre-#230).
 *
 * Eve URLs (`/pray/<eve>/vespers`, `/pray/<eve>/compline`) still
 * resolve server-side for SW/cache backward-compat (FR-156 promotion
 * preserved on those URLs); they are only removed from the visible
 * card list — never from server routing.
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
  // tomorrow's firstVespers/firstCompline cards).
  const tomorrowDate = new Date(dateStr + 'T00:00:00Z')
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1)
  const tMM = String(tomorrowDate.getUTCMonth() + 1).padStart(2, '0')
  const tDD = String(tomorrowDate.getUTCDate()).padStart(2, '0')
  const tomorrowStr = `${tomorrowDate.getUTCFullYear()}-${tMM}-${tDD}`
  const tomorrowDay = getLiturgicalDay(tomorrowStr)
  const tomorrowDow = dateToDayOfWeek(tomorrowStr)
  const tomorrowHasFirstVespers = !!tomorrowDay
    && hasFirstVespersAndCompline(tomorrowStr, tomorrowDay, tomorrowDow)
  // #240 F-X5 FU#1: extend strip to non-privileged Sundays (OT /
  // CHRISTMAS, class 6) when Mon = Solemnity/Feast carrying
  // firstVespers (class 3 / 5). Per Universal Norms n. 61, Mon I
  // Vespers wins. Privileged Sundays (ADVENT/LENT/EASTER, class 2)
  // are NOT stripped — their II Vespers outranks Mon Solemnity of
  // Saints / Feast of the Lord.
  // #245 F-X5 FU#4: Advent → Christmas season-boundary override.
  // Per Universal Norms n. 40, "Advent ends before First Vespers of
  // the Nativity of the Lord" — the season boundary itself displaces
  // Sun ADVENT II Vespers, overriding the privileged-Sun guard. Only
  // Dec 24 satisfies (today.season=ADVENT && tomorrow.season=CHRISTMAS);
  // Sun Lent → Mon Annunciation / Sun Advent → Mon Immaculate
  // Conception remain protected (no season cross).
  // Both rules live in `keepsOwnEveningPrayerII`, shared with the
  // vespers eve branch of `assembleHour` so cards and body agree.
  const stripEveCards =
    tomorrowHasFirstVespers && !keepsOwnEveningPrayerII(day, dayOfWeek, tomorrowDay)

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
