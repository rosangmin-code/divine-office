import type { LiturgicalSeason, PsalmEntry } from '../types'

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
 * Pick a PDF-sourced seasonal antiphon variant from a PsalmEntry for the
 * given season/date, or undefined when no matching variant exists.
 *
 * Season key mapping:
 *   EASTER     → `easter`
 *   LENT       → `lent`
 *   CHRISTMAS  → `christmas`
 *   ADVENT     → `adventDec17_23` **only** when `dateStr` falls within
 *                Dec 17-23 (late Advent "O antiphons" window). Outside
 *                that window, ADVENT returns undefined so the default
 *                antiphon is used.
 *
 * Phase 1 scope (task #13): schema + selection logic only. Data files
 * remain unpopulated until Phase 2 (task #14) so this function returns
 * undefined for all current production data — the legacy
 * applySeasonalAntiphon fallback path continues to run.
 */
export function pickSeasonalVariant(
  entry: PsalmEntry,
  season: LiturgicalSeason | undefined,
  dateStr?: string,
): string | undefined {
  const sa = entry.seasonal_antiphons
  if (!sa) return undefined
  if (!season) return undefined
  switch (season) {
    case 'EASTER':
      return sa.easter
    case 'LENT':
      return sa.lent
    case 'CHRISTMAS':
      return sa.christmas
    case 'ADVENT':
      return isLateAdventDate(dateStr) ? sa.adventDec17_23 : undefined
    default:
      return undefined
  }
}

/** true when dateStr (YYYY-MM-DD) is within Dec 17-23 inclusive. */
function isLateAdventDate(dateStr: string | undefined): boolean {
  if (!dateStr) return false
  const parts = dateStr.split('-')
  if (parts.length !== 3) return false
  const month = Number(parts[1])
  const day = Number(parts[2])
  if (!Number.isFinite(month) || !Number.isFinite(day)) return false
  return month === 12 && day >= 17 && day <= 23
}
