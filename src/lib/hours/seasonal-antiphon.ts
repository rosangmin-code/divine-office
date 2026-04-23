import type { LiturgicalSeason } from '../types'

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
