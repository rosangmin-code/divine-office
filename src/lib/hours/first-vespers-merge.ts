import type { HourPropers, FirstVespersPropers } from '../types'

/**
 * Fields of a Sunday's First Vespers that the SEASON's Sunday Evening
 * Prayer I proper (`weeks[N].SUN.vespers`) supplies when it prints them,
 * paired with their page metadata. Everything else (psalms + antiphons,
 * antiphon overrides, hymn, conditional rubrics, …) comes from the
 * `weeks[N].SUN.firstVespers` cell.
 */
const SEASONAL_PRIORITY_FIELDS: ReadonlyArray<
  readonly [keyof HourPropers, keyof HourPropers | null]
> = [
  ['shortReading', null], // page lives inside the object
  ['responsory', null], // page lives inside the object
  ['intercessions', 'intercessionsPage'],
  ['concludingPrayer', 'concludingPrayerPage'],
  ['alternativeConcludingPrayer', 'alternativeConcludingPrayerPage'],
]

/**
 * Compose a plain Sunday's First Vespers propers from the season's Sunday
 * Evening Prayer I proper (`sundayRegular` = `weeks[N].SUN.vespers`) and
 * the Sunday's `firstVespers` cell.
 *
 * Precedence per field:
 *   - shortReading / responsory / intercessions / concludingPrayer (+
 *     alternative, + their page fields): the SEASONAL cell wins when it
 *     prints the field; otherwise the firstVespers cell's value stands.
 *   - every other field: firstVespers cell ⟩ seasonal cell (unchanged).
 *
 * Why (book, PDF `parsed_data/full_pdf.txt`): the season sections print the
 * Sunday EP I proper — Advent p.548-550 (1 Thess 5:19-24 + responsory +
 * intercessions + prayers), Lent p.618-620 (2 Cor 6:1-4a), Palm Sunday
 * p.651-653 (1 Pet 1:18-21), Easter p.700-702 (1 Pet 2:9-10). The FR-156
 * Phase-2 `firstVespers` cells were extracted from the psalter's Sunday
 * EP I blocks (p.55-56 / 171-172 / 291-292 / 402-403 — the 4-week
 * psalter, i.e. Ordinary-Time readings; `intercessionsPage` 56/172/292/403
 * proves the provenance), and the psalter is the fallback only where no
 * seasonal proper exists (GILH 157/183/199, cf. Layer 1 < Layer 2 in
 * `loth-service`). The previous `{ ...sundayRegular, ...firstVespers }`
 * spread let the psalter copy override the seasonal proper on every
 * Advent / Lent / Easter Sunday; the seasonal RICH overlay happened to be
 * spread on top, so the SCREEN showed the seasonal text while the API /
 * Saturday-eve plain carried the psalter text. This helper makes plain,
 * rich, `/firstVespers` route and Saturday-eve `/vespers` agree.
 *
 * Ordinary Time and the Christmas-season Sundays are unaffected: their
 * `SUN.vespers` cells print only the Magnificat antiphon + concluding
 * prayer(s), so the firstVespers cell keeps supplying reading /
 * responsory / intercessions (verified by the 2026 full-year sweep).
 */
export function mergeSundayFirstVespers(
  sundayRegular: HourPropers | null | undefined,
  firstVespers: FirstVespersPropers,
): HourPropers {
  const merged: HourPropers = { ...(sundayRegular ?? {}), ...firstVespers }
  if (!sundayRegular) return merged
  const out = merged as Record<string, unknown>
  const takeSeasonal = (field: keyof HourPropers, pageField: keyof HourPropers | null) => {
    const value = sundayRegular[field]
    if (value == null) delete out[field]
    else out[field] = value
    if (pageField) {
      const page = sundayRegular[pageField]
      if (page == null) delete out[pageField]
      else out[pageField] = page
    }
  }
  for (const [field, pageField] of SEASONAL_PRIORITY_FIELDS) {
    if (sundayRegular[field] == null) continue
    takeSeasonal(field, pageField)
    // The alternate concluding prayer is a pair with the primary: when the
    // season supplies the primary, the alternate must be the season's too
    // (or absent) — never a psalter alternate beside a seasonal primary.
    if (field === 'concludingPrayer') {
      takeSeasonal('alternativeConcludingPrayer', 'alternativeConcludingPrayerPage')
    }
  }
  return merged
}
