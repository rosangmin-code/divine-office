import type { DayOfWeek, LiturgicalSeason, PrayerText, PsalmEntry } from '../types'

/**
 * Apply season-specific modifications to a psalm or canticle antiphon.
 *
 * Roman tradition (GILH §113, §272): throughout Easter season, every
 * psalm / canticle antiphon of the major hours is terminated with
 * "Alleluia" unless it already ends with one. The Mongolian LOTH
 * follows the same rubric — the 4-week psalter antiphons (which are
 * authored for Ordinary Time weekdays) are reused during Easter but
 * must carry the Alleluia ending so they read as Easter-season
 * antiphons rather than Ordinary Time ones.
 *
 * Sunday antiphons in the 4-week psalter already include "Аллэлуяа!";
 * this helper leaves those unchanged (idempotent). Empty antiphons
 * pass through untouched — `Дан 3` or similar canticle entries that
 * intentionally render without an antiphon stay empty.
 *
 * When a PDF-sourced `seasonal_antiphons` variant is used for an entry
 * (via `pickSeasonalVariant` below), this fallback is SKIPPED — the PDF
 * text already carries the proper Alleluia ending.
 */
export function applySeasonalAntiphon(
  antiphon: string,
  season: LiturgicalSeason | undefined,
): string {
  if (!antiphon) return antiphon
  if (season !== 'EASTER') return antiphon
  const trimmed = antiphon.trimEnd()
  if (trimmed.length === 0) return antiphon
  // Already ends with Alleluia (any trailing punctuation).
  if (/[Аа]ллэлуяа[,.!?]*$/.test(trimmed)) return antiphon
  // Ensure the preceding clause is closed with a period before appending.
  const closer = /[.!?]$/.test(trimmed) ? '' : '.'
  return `${trimmed}${closer} Аллэлуяа!`
}

/**
 * Apply the Eastertide Alleluia rubric to a rich antiphon AST. Mirror of
 * `applySeasonalAntiphon` for the rich path so seasonal augmentation does
 * not silently skip when the renderer takes the rich branch (FR-161 wi-002 +
 * F-X1 #217 — pre-fix the rich path stayed un-augmented because the helper
 * only operated on plain strings).
 *
 * Rule: append a NEW `para` block containing only
 * `{ kind: 'rubric', text: 'Аллэлуяа!' }` at the END of `rich.blocks`
 * during EASTER. The renderer (`gospel-canticle-section.tsx
 * renderAntiphonRich`) emits a `<br/>` between every block, so the rubric
 * naturally surfaces on its own line — matching the user-reported PDF
 * layout convention where `(Аллэлуяа!)` is printed BELOW the antiphon
 * body, not glued to its right edge.
 *
 * F-X1 redo (#223): pre-fix this helper appended `{kind:'text',text:' '},
 * {kind:'rubric',text:'Аллэлуяа!'}` INLINE to the last para's spans, which
 * the renderer concatenated into a single visual line (`body. Аллэлуяа!`).
 * Users opening Eastertide Saturday Compline expected Аллэлуяа on a
 * separate line; the inline shape silently regressed that expectation.
 * The block-level append surfaces the rubric across the renderer's
 * existing `<br/>` block separator without changing the renderer.
 *
 * Skipped when:
 *   - season is not EASTER
 *   - input is null/undefined (no rich AST to augment)
 *   - any existing span/block already carries Аллэлуяа (idempotent —
 *     protects against double-application in test fixtures and in
 *     seasonal overlays that already author the rubric)
 *   - no `para` block exists (e.g. stanza-only or rubric-line-only AST —
 *     Eastertide rubric placement remains ambiguous in those shapes;
 *     defer to the data author rather than auto-augment)
 *
 * The rubric span surfaces as red + upright in `gospel-canticle-section.tsx
 * `renderAntiphonSpan`, matching the PDF parenthetical convention
 * (`(Аллэлуяа!)` printed in red after the antiphon body).
 */
export function applySeasonalAntiphonRich(
  rich: PrayerText | undefined,
  season: LiturgicalSeason | undefined,
): PrayerText | undefined {
  if (!rich) return rich
  if (season !== 'EASTER') return rich
  if (!rich.blocks || rich.blocks.length === 0) return rich

  // Idempotent guard — bail if any text/rubric span anywhere already
  // carries Alleluia.
  for (const block of rich.blocks) {
    if (block.kind === 'rubric-line') {
      if (/[Аа]ллэлуяа/.test(block.text)) return rich
      continue
    }
    if (block.kind === 'para') {
      for (const span of block.spans) {
        const text =
          span.kind === 'text' ||
          span.kind === 'rubric' ||
          span.kind === 'versicle' ||
          span.kind === 'response'
            ? span.text
            : ''
        if (/[Аа]ллэлуяа/.test(text)) return rich
      }
      continue
    }
    if (block.kind === 'stanza') {
      for (const line of block.lines) {
        for (const span of line.spans) {
          const text =
            span.kind === 'text' ||
            span.kind === 'rubric' ||
            span.kind === 'versicle' ||
            span.kind === 'response'
              ? span.text
              : ''
          if (/[Аа]ллэлуяа/.test(text)) return rich
        }
      }
    }
  }

  // Defer when no para block exists — preserve original ambiguity guard
  // (stanza-only / rubric-line-only AST). The block-level append below
  // is unambiguous about placement, but absence of a body para is still
  // a signal to defer to the data author.
  const hasPara = rich.blocks.some((b) => b.kind === 'para')
  if (!hasPara) return rich

  // Block-level append — NEW para block at the end carrying only the
  // rubric span. Renderer's inter-block `<br/>` produces the line break
  // the user expects without renderer changes.
  const newBlock = {
    kind: 'para' as const,
    spans: [{ kind: 'rubric' as const, text: 'Аллэлуяа!' }],
  }
  return { ...rich, blocks: [...rich.blocks, newBlock] }
}

/**
 * Pick a PDF-sourced seasonal antiphon variant from a PsalmEntry for the
 * given season/date/week, or undefined when no matching variant exists.
 *
 * Selection order (first match wins):
 *   1. Per-Sunday override — `dayOfWeek === 'SUN'` + matching
 *      `weekOfSeason`:
 *        LENT  SUN w5 → `lentPassionSunday` (Passion Sunday, more
 *                       specific than `lentSunday[5]`)
 *        EASTER       → `easterSunday[weekOfSeason]`
 *        LENT         → `lentSunday[weekOfSeason]`
 *   2. Date-specific (ADVENT only):
 *        12/17-23 → `adventDec17_23`
 *        12/24    → `adventDec24`
 *   3. Season general:
 *        EASTER → `easter`, then `easterAlt` (fallback when the
 *                 primary variant is not authored for this entry)
 *        ADVENT (not 12/17+) → `advent`
 *
 * Christmas has no PDF markers so CHRISTMAS is not listed — its entries
 * fall through to `default_antiphon`. LENT has no season-wide weekday
 * marker either; weekday LENT entries fall through. ORDINARY_TIME
 * always returns undefined.
 *
 * Phase 3 scope (task #15): adds `lentPassionSunday` (Passion Sunday,
 * GILH §5e rubric — the Sunday before Palm Sunday) and `easterAlt`
 * (Easter season alternate antiphon, fallback semantic) on top of the
 * Phase 1 chain. `easterAlt` is authored only for a handful of entries
 * lacking a primary `easter` variant; when both fields are present
 * (which should not occur in production data) `easter` wins.
 */
export function pickSeasonalVariant(
  entry: PsalmEntry,
  season: LiturgicalSeason | undefined,
  dateStr?: string,
  dayOfWeek?: DayOfWeek,
  weekOfSeason?: number,
): string | undefined {
  const sa = entry.seasonal_antiphons
  if (!sa) return undefined
  if (!season) return undefined

  // 1. Per-Sunday override — highest priority within seasonal_antiphons.
  if (dayOfWeek === 'SUN' && typeof weekOfSeason === 'number') {
    // Passion Sunday / Palm Sunday — take precedence over the generic
    // lentSunday[N] because the PDF authors them as a more-specific rubric.
    // Week 5 ("5th Sunday of Lent", older "Passion Sunday" name) and
    // Week 6 ("Palm Sunday of the Passion of the Lord", modern rite)
    // both carry the Passion theme; both fire lentPassionSunday when the
    // entry authors it. FR-156 Phase 2 (task #20) extends the original
    // W5-only match so First Vespers of Palm Sunday (Sat preceding
    // romcal's weekOfSeason=6) also surfaces the Passion antiphon.
    if (
      season === 'LENT' &&
      (weekOfSeason === 5 || weekOfSeason === 6) &&
      sa.lentPassionSunday
    ) {
      if (sa.lentPassionSunday.length > 0) return sa.lentPassionSunday
    }
    if (season === 'EASTER' && sa.easterSunday) {
      const v = sa.easterSunday[weekOfSeason]
      if (typeof v === 'string' && v.length > 0) return v
    }
    if (season === 'LENT' && sa.lentSunday) {
      const v = sa.lentSunday[weekOfSeason]
      if (typeof v === 'string' && v.length > 0) return v
    }
  }

  // 2. Date-specific (ADVENT only, requires calendar season match).
  if (season === 'ADVENT') {
    if (isAdventDec24(dateStr)) {
      if (sa.adventDec24) return sa.adventDec24
      // Dec 24 PDF marker missing for this entry — fall through to
      // general advent variant if authored (rare but keeps coverage).
    }
    if (isLateAdventDate(dateStr)) {
      if (sa.adventDec17_23) return sa.adventDec17_23
    }
  }

  // 3. Season general.
  if (season === 'EASTER') {
    if (sa.easter && sa.easter.length > 0) return sa.easter
    if (sa.easterAlt && sa.easterAlt.length > 0) return sa.easterAlt
    return undefined
  }
  if (season === 'ADVENT') return sa.advent

  return undefined
}

/** true when dateStr (YYYY-MM-DD) is within Dec 17-23 inclusive. */
function isLateAdventDate(dateStr: string | undefined): boolean {
  const md = parseMonthDay(dateStr)
  if (!md) return false
  return md.month === 12 && md.day >= 17 && md.day <= 23
}

/** true when dateStr (YYYY-MM-DD) is Dec 24 (Christmas Eve). */
function isAdventDec24(dateStr: string | undefined): boolean {
  const md = parseMonthDay(dateStr)
  if (!md) return false
  return md.month === 12 && md.day === 24
}

function parseMonthDay(
  dateStr: string | undefined,
): { month: number; day: number } | null {
  if (!dateStr) return null
  const parts = dateStr.split('-')
  if (parts.length !== 3) return null
  const month = Number(parts[1])
  const day = Number(parts[2])
  if (!Number.isFinite(month) || !Number.isFinite(day)) return null
  return { month, day }
}
