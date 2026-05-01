import type { LiturgicalDayInfo, DayOfWeek, PrayerText } from '../types'

/**
 * Determine whether the alternate concluding prayer should become the default
 * for the given liturgical day, per the Mongolian LOTH PDF rubric (책 p.516,
 * physical p.259, line 17855-17874 left column):
 *
 *   "Эсвэл: Ням гарагт үл тохиох Их баярын өдөр"
 *   (Or: Solemnity not on Sunday)
 *
 * Sister rubric (same column):
 *
 *   "Ням гарагуудад болон амилалтын найм хоногийн үеэр"
 *   (On Sundays and during Easter Octave)
 *
 * Combined effect — the alternate is the default when:
 *   - rank === SOLEMNITY, AND
 *   - dayOfWeek !== SUN (Sundays use the primary), AND
 *   - NOT inside Easter Octave (Octave weekdays use the primary even
 *     though romcal assigns SOLEMNITY rank to each Octave day).
 *
 * Easter Octave detection mirrors `selectSeasonalCompResponsory` (F-1, #210):
 * `weekOfSeason === 1` covers Easter Sunday + 6 Octave weekdays. The closing
 * day of the Octave (week 2 SUN, Divine Mercy Sunday) is already excluded by
 * the dayOfWeek === 'SUN' check above, so it does not need a second guard
 * here.
 *
 * Applies uniformly to Lauds, Vespers, and Compline. The `mergedPropers`
 * carries both primary (`concludingPrayer{,Rich,Page}`) and alternate
 * (`alternativeConcludingPrayer{,Rich,Page}`) fields populated from the
 * propers JSON; `buildConcludingPrayerFields` consumes both and emits the
 * swapped pair into the HourSection.
 */
export function shouldUseAlternateConcludingPrayer(
  liturgicalDay: LiturgicalDayInfo,
  dayOfWeek: DayOfWeek,
): boolean {
  if (liturgicalDay.rank !== 'SOLEMNITY') return false
  if (dayOfWeek === 'SUN') return false
  if (liturgicalDay.season === 'EASTER' && liturgicalDay.weekOfSeason === 1) {
    return false
  }
  return true
}

export interface ConcludingPrayerInputs {
  primaryText?: string
  primaryRich?: PrayerText
  primaryPage?: number
  alternateText?: string
  alternateRich?: PrayerText
  alternatePage?: number
}

export interface ConcludingPrayerFields {
  text: string
  page?: number
  alternateText?: string
  textRich?: PrayerText
  alternateTextRich?: PrayerText
}

/**
 * Build the `concludingPrayer` HourSection fields, applying the rubric-driven
 * primary↔alternate swap when `swap === true`.
 *
 * Graceful degradation: if `swap` is requested but no alternate data is
 * authored (`alternateText` and `alternateRich` both falsy), the helper
 * returns the primary unchanged. This keeps MON-SAT compline (where
 * `complineData.concludingPrayer.alternate` is undefined) and any unauthored
 * weekday-Solemnity propers from emitting an empty section.
 */
export function buildConcludingPrayerFields(
  inputs: ConcludingPrayerInputs,
  swap: boolean,
): ConcludingPrayerFields {
  const hasAlternate = Boolean(inputs.alternateText || inputs.alternateRich)
  if (swap && hasAlternate) {
    return {
      text: inputs.alternateText ?? '',
      page: inputs.alternatePage ?? inputs.primaryPage,
      alternateText: inputs.primaryText,
      textRich: inputs.alternateRich,
      alternateTextRich: inputs.primaryRich,
    }
  }
  return {
    text: inputs.primaryText ?? '',
    page: inputs.primaryPage,
    alternateText: inputs.alternateText,
    textRich: inputs.primaryRich,
    alternateTextRich: inputs.alternateRich,
  }
}
