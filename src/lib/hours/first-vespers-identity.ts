import type { DayOfWeek } from '../types'

/**
 * FR-156 First Vespers identity promotion.
 *
 * The `loth-service.ts` vespers branch has two independent paths that
 * decide an evening render should carry TOMORROW's liturgical identity
 * (not today's):
 *
 *   1. evening-before-solemnity-or-feast (Phase 3a/4a, FEAST ext task
 *      #30) — any weekday eve whose tomorrow is SOLEMNITY or FEAST
 *      carrying `firstVespers`.
 *   2. Saturday → Sunday 1st Vespers (Phase 2, task #20) — Saturday
 *      eve whose tomorrow is a regular Sunday with `firstVespers`.
 *
 * Both paths need `pickSeasonalVariant` to run against tomorrow's
 * `(dayOfWeek, weekOfSeason)` so per-Sunday seasonal antiphons
 * (`lentSunday[N]`, `easterSunday[N]`, `lentPassionSunday`) resolve
 * against the correct key. Without the promotion the render uses the
 * caller's own weekday/week, falls through the SUN gate, and lands on
 * `default_antiphon` (FR-156 Phase 4c regression, task #25).
 *
 * This helper centralises the 2-line assignment so the two sites stay
 * textually identical. Divergence between them is what produced the
 * task #25 regression — the solemnity branch shipped without the
 * promotion while the Saturday branch had it. Future changes MUST move
 * both call sites together; a grep for `promoteToFirstVespersIdentity`
 * surfaces every user.
 *
 * `targetDate` is not read by the current implementation — it is taken
 * as a parameter so the call site records WHICH date the identity
 * belongs to (useful for future logging/assertions and for reviewers
 * scanning call-site legibility).
 */
export function promoteToFirstVespersIdentity(
  targetDate: string,
  targetDayOfWeek: DayOfWeek,
  targetWeekOfSeason: number,
): { effectiveDayOfWeek: DayOfWeek; effectiveWeekOfSeason: number } {
  void targetDate
  return {
    effectiveDayOfWeek: targetDayOfWeek,
    effectiveWeekOfSeason: targetWeekOfSeason,
  }
}
