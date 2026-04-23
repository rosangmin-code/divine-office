import type { AssembledPsalm, LiturgicalSeason, PsalmEntry } from '../../types'
import { parseScriptureRef } from '../../scripture-ref-parser'
import { lookupRef } from '../../bible-loader'
import { loadPsalterTexts } from '../loaders'
import { loadPsalterTextRich, loadPsalterTextPsalmPrayerRich } from '../../prayers/rich-overlay'
import { applySeasonalAntiphon } from '../seasonal-antiphon'

/**
 * Resolve a psalm entry into an AssembledPsalm with actual verse text.
 * Prefers psalter-texts.json (PDF source with stanza structure) over Bible JSONL.
 *
 * `season` controls seasonal antiphon post-processing (e.g. Easter appends
 * Alleluia). Callers that don't know the season pass undefined, which
 * preserves the raw psalter antiphon.
 */
export async function resolvePsalm(
  entry: PsalmEntry,
  antiphonOverrides?: Record<string, string>,
  season?: LiturgicalSeason,
): Promise<AssembledPsalm> {
  const rawAntiphon =
    antiphonOverrides?.[entry.antiphon_key] ?? entry.default_antiphon ?? ''
  const antiphon = applySeasonalAntiphon(rawAntiphon, season)

  const psalterTexts = loadPsalterTexts()
  const psalmText = psalterTexts[entry.ref]

  if (psalmText && psalmText.stanzas.length > 0) {
    const stanzasRich = loadPsalterTextRich(entry.ref) ?? undefined
    const psalmPrayerRich = loadPsalterTextPsalmPrayerRich(entry.ref) ?? undefined
    return {
      psalmType: entry.type,
      reference: entry.ref,
      title: entry.title,
      antiphon,
      stanzas: psalmText.stanzas,
      stanzasRich,
      verses: [],
      gloriaPatri: entry.gloria_patri,
      psalmPrayer: psalmText.psalmPrayer,
      psalmPrayerRich,
      psalmPrayerPage: psalmText.psalmPrayerPage,
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

  return {
    psalmType: entry.type,
    reference: entry.ref,
    title: entry.title,
    antiphon,
    verses: allVerses,
    gloriaPatri: entry.gloria_patri,
    psalmPrayer: psalmText?.psalmPrayer,
    psalmPrayerRich: loadPsalterTextPsalmPrayerRich(entry.ref) ?? undefined,
    psalmPrayerPage: psalmText?.psalmPrayerPage,
    page: entry.page,
  }
}
