import type { AssembledPsalm, DayOfWeek, LiturgicalSeason, PsalmEntry } from '../../types'
import { parseScriptureRef } from '../../scripture-ref-parser'
import { lookupRef } from '../../bible-loader'
import { loadPsalterTexts } from '../loaders'
import {
  loadPsalterTextRich,
  loadPsalterTextPsalmPrayerRich,
  loadPsalterHeaderRich,
} from '../../prayers/rich-overlay'
import { applySeasonalAntiphon, pickSeasonalVariant } from '../seasonal-antiphon'

/**
 * Resolve a psalm entry into an AssembledPsalm with actual verse text.
 * Prefers psalter-texts.json (PDF source with stanza structure) over Bible JSONL.
 *
 * Antiphon selection priority:
 *   1. `antiphonOverrides[antiphon_key]` — sanctoral + seasonal propers
 *      overrides merged by the caller (loth-service).
 *   2. `entry.seasonal_antiphons` — PDF-sourced seasonal variant
 *      resolved by `pickSeasonalVariant` (per-Sunday > date-specific >
 *      season general). Phase 1 stub, populated in Phase 2 (task #14).
 *      When present, the append-Alleluia fallback is SKIPPED because
 *      the PDF variant already carries the proper seasonal ending.
 *   3. `entry.default_antiphon` — 4-week psalter default (Ordinary Time
 *      authorship). Receives the append-Alleluia augmentation during Easter.
 *
 * `dateStr` / `dayOfWeek` / `weekOfSeason` drive the date and per-Sunday
 * gates in `pickSeasonalVariant`. Callers that don't pass them simply
 * skip the gated lookups.
 */
export async function resolvePsalm(
  entry: PsalmEntry,
  antiphonOverrides?: Record<string, string>,
  season?: LiturgicalSeason,
  dateStr?: string,
  dayOfWeek?: DayOfWeek,
  weekOfSeason?: number,
): Promise<AssembledPsalm> {
  const override = antiphonOverrides?.[entry.antiphon_key]
  const seasonalVariant = pickSeasonalVariant(
    entry,
    season,
    dateStr,
    dayOfWeek,
    weekOfSeason,
  )
  // override > seasonal_antiphons variant > default_antiphon.
  const rawAntiphon = override ?? seasonalVariant ?? entry.default_antiphon ?? ''
  // Skip append-Alleluia when the PDF-sourced variant is used — the PDF
  // text already carries the proper seasonal ending. Overrides and defaults
  // go through applySeasonalAntiphon as before.
  const usedPdfVariant = override === undefined && seasonalVariant !== undefined
  const antiphon = usedPdfVariant ? rawAntiphon : applySeasonalAntiphon(rawAntiphon, season)

  const psalterTexts = loadPsalterTexts()
  const psalmText = psalterTexts[entry.ref]

  if (psalmText && psalmText.stanzas.length > 0) {
    const stanzasRich = loadPsalterTextRich(entry.ref) ?? undefined
    // F-X2 Phase 3 (#352, R-1): when entry-level `psalmPrayer` text override
    // is set (3 emergent occurrences with PDF-divergent prayer body),
    // suppress the catalog `psalmPrayerRich` overlay — it encodes the
    // W1-default prayer AST and would render alongside the wrong text.
    // The plain-text path (already used by FR-153h fallback) stays correct.
    // #359 F-3: use loose-equality `!= null` so a defensive `null` value
    // (TypeScript types disallow but JSON.parse could yield it) is treated
    // identically to `undefined` — the text path uses `??` which already
    // falls through on null, so suppression must align to avoid emitting
    // catalog text without its rich AST (asymmetric UX).
    const psalmPrayerOverride = entry.psalmPrayer
    const psalmPrayerRich =
      psalmPrayerOverride != null
        ? undefined
        : (loadPsalterTextPsalmPrayerRich(entry.ref) ?? undefined)
    const headerRich = loadPsalterHeaderRich(entry.ref) ?? undefined
    return {
      psalmType: entry.type,
      reference: entry.ref,
      title: entry.title,
      antiphon,
      stanzas: psalmText.stanzas,
      stanzasRich,
      headerRich,
      verses: [],
      gloriaPatri: entry.gloria_patri,
      // F-X2 Phase 3 (#352): per-occurrence text override wins over the
      // catalog default; preserves nullish-coalesce semantics with the
      // Phase 1/2 page-override (psalmPrayerPage below).
      psalmPrayer: psalmPrayerOverride ?? psalmText.psalmPrayer,
      psalmPrayerRich,
      // F-X2 Phase 1 (#219): per-occurrence override wins over the
      // catalog's single default page. Multi-occurrence psalms (e.g.
      // Psalm 92:2-9 W2-SAT-lauds@280 vs W4-SAT-lauds@506) carry their
      // own `psalmPrayerPage` on the week-N.json entry; nullish-coalesce
      // falls back to the catalog default for the 80+ refs that have
      // not been migrated yet.
      psalmPrayerPage: entry.psalmPrayerPage ?? psalmText.psalmPrayerPage,
      page: entry.page,
    }
  }

  const refs = parseScriptureRef(entry.ref)
  const allVerses: { verse: number; text: string }[] = []

  for (const ref of refs) {
    const result = lookupRef(ref)
    if (result) {
      allVerses.push(...result.texts)
    }
  }

  // Fail loudly when neither the PDF-sourced stanzas nor the Bible fallback
  // produced any text. Returning { verses: [] } would silently render a
  // blank psalm in the UI; throwing lets loth-service's Promise.allSettled
  // catch it and substitute a placeholder so the rest of the hour still
  // renders AND the error surfaces in server logs for the data owner.
  if (allVerses.length === 0) {
    throw new Error(
      `[resolvePsalm] no text resolved for "${entry.ref}" — ` +
        `psalter-texts.json ${
          psalmText ? 'has entry but stanzas is empty' : 'has no entry'
        }, Bible lookup returned 0 verses`,
    )
  }

  // F-X2 Phase 3 (#352, R-1): same suppression on the Bible-fallback path —
  // keeps R-1 invariant across both return sites so a multi-occurrence
  // psalm that loses its catalog entry but keeps its week-N.json mapping
  // (text + page override) still emits the correct plain text alone.
  // #359 F-3: see catalog return site above — `!= null` mirrors the `??`
  // text path so a stray runtime `null` cannot trigger suppression while
  // the text falls back to catalog (asymmetric UX guard).
  const psalmPrayerOverride = entry.psalmPrayer
  return {
    psalmType: entry.type,
    reference: entry.ref,
    title: entry.title,
    antiphon,
    verses: allVerses,
    gloriaPatri: entry.gloria_patri,
    psalmPrayer: psalmPrayerOverride ?? psalmText?.psalmPrayer,
    psalmPrayerRich:
      psalmPrayerOverride != null
        ? undefined
        : (loadPsalterTextPsalmPrayerRich(entry.ref) ?? undefined),
    // F-X2 Phase 1 (#219): same per-occurrence override on the Bible
    // fallback path — keeps semantics aligned across the two return
    // sites in case a multi-occurrence psalm ever loses its catalog
    // entry but retains its week-N.json mapping.
    psalmPrayerPage: entry.psalmPrayerPage ?? psalmText?.psalmPrayerPage,
    page: entry.page,
    headerRich: loadPsalterHeaderRich(entry.ref) ?? undefined,
  }
}
