import type { CelebrationRank, LiturgicalSeason, SanctoralEntry } from './types'
import { getSanctoralPropers, getSanctoralKeyForRomcalKey } from './propers-loader'

/**
 * P0-3 (docs/bug-reports/2026-09-13-sunday-solemnity-sanctoral-override.md)
 * — single decision point for "which fixed-date sanctoral entry (if any)
 * applies to this liturgical day".
 *
 * Before this module every caller looked the sanctoral up by MM-DD alone,
 * gated only on `rank ∈ {SOLEMNITY, FEAST, MEMORIAL}`. Because `RANK_MAP`
 * folds romcal's SUNDAY into SOLEMNITY, a Sunday that merely shares its
 * MM-DD with a solemnity (2028-03-19 = 3rd Sunday of Lent vs. St Joseph,
 * 2030-12-08 = 2nd Sunday of Advent vs. Immaculate Conception, 2035-03-25 =
 * Easter Sunday vs. Annunciation) rendered the solemnity, while the day
 * romcal actually transferred it to (03-20 / 12-09 / the Monday after the
 * Easter Octave) rendered as a plain weekday.
 *
 * Rules (romcal is the authority on what is celebrated on a given date):
 *   1. rank outside SOLEMNITY/FEAST/MEMORIAL → no sanctoral (unchanged).
 *   2. `romcalType` absent (hand-built `LiturgicalDayInfo` in tests / mocks)
 *      → legacy MM-DD lookup (unchanged behaviour).
 *   3. romcal chose a temporale office (SUNDAY / FERIA / HOLY_WEEK /
 *      TRIDUUM) → no sanctoral. Exception: an entry flagged
 *      `outranksSunday` on a SUNDAY of ORDINARY_TIME (All Souls 11-02 —
 *      Table of Liturgical Days I.3 outranks an Ordinary-Time Sunday
 *      II.6, but romcal 1.3 drops it on Sundays). Sundays of Advent /
 *      Lent / Easter (I.2) are never displaced, so the exception is
 *      restricted to ORDINARY_TIME in code as well.
 *   4. Otherwise (SOLEMNITY / FEAST / MEMORIAL / OPT_MEMORIAL …): the MM-DD
 *      entry applies when it declares no `romcalKey`, or its key matches
 *      romcal's key for the day. If the MM-DD entry was transferred away
 *      (keys differ) it does not apply; instead the entry whose `romcalKey`
 *      matches the day's key is used (the transferred-to date).
 *
 * The lookups go through `getSanctoralPropers(MM-DD)` (never the internal
 * file cache) so existing tests that mock that export keep controlling the
 * outcome; the romcalKey index only translates a key back to an MM-DD.
 */

export interface SanctoralDayLike {
  date: string
  season: LiturgicalSeason
  rank: CelebrationRank
  romcalType?: string
  romcalKey?: string
}

export interface ResolvedSanctoral {
  /** MM-DD key of the entry (also the sanctoral rich-overlay key). */
  key: string
  entry: SanctoralEntry
}

const SANCTORAL_RANKS: ReadonlySet<CelebrationRank> = new Set(['SOLEMNITY', 'FEAST', 'MEMORIAL'])

/** romcal `type` values that mean "the temporale office is celebrated today". */
const ROMCAL_TEMPORALE_TYPES: ReadonlySet<string> = new Set(['SUNDAY', 'FERIA', 'HOLY_WEEK', 'TRIDUUM'])

export function mmddOf(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  return `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export function resolveSanctoralForDay(day: SanctoralDayLike): ResolvedSanctoral | null {
  if (!SANCTORAL_RANKS.has(day.rank)) return null
  const mmdd = mmddOf(day.date)
  const { romcalType, romcalKey } = day

  // 2. Legacy callers without romcal metadata.
  if (romcalType === undefined) {
    const entry = getSanctoralPropers(mmdd)
    return entry ? { key: mmdd, entry } : null
  }

  // 3. Temporale office chosen by romcal. Only an ORDINARY_TIME Sunday can
  //    be displaced by an `outranksSunday` entry (All Souls); privileged
  //    Sundays (Advent / Lent / Easter) never are.
  if (ROMCAL_TEMPORALE_TYPES.has(romcalType)) {
    if (romcalType === 'SUNDAY' && day.season === 'ORDINARY_TIME') {
      const entry = getSanctoralPropers(mmdd)
      if (entry?.outranksSunday) return { key: mmdd, entry }
    }
    return null
  }

  // 4. Sanctoral office chosen by romcal — MM-DD entry when it is (or may
  //    be) the same celebration.
  const byDate = getSanctoralPropers(mmdd)
  if (byDate && (!byDate.romcalKey || !romcalKey || byDate.romcalKey === romcalKey)) {
    return { key: mmdd, entry: byDate }
  }

  // Transferred celebration — find the entry by romcal key.
  if (romcalKey) {
    const transferredKey = getSanctoralKeyForRomcalKey(romcalKey)
    if (transferredKey && transferredKey !== mmdd) {
      const entry = getSanctoralPropers(transferredKey)
      if (entry) return { key: transferredKey, entry }
    }
  }
  return null
}
