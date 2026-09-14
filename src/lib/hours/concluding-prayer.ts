import type { LiturgicalDayInfo, DayOfWeek, PrayerText } from '../types'
import { dateToDayOfWeek } from './date-utils'

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

/**
 * Context slice the hour assemblers hand to `resolveConcludingPrayerSwap`.
 * Mirrors the relevant `HourContext` fields (see `./types`).
 */
export interface ConcludingPrayerSwapContext {
  liturgicalDay: LiturgicalDayInfo
  effectiveLiturgicalDay?: LiturgicalDayInfo
  dayOfWeek: DayOfWeek
}

/**
 * Decide the F-2 swap for an assembled hour — the single call site shared
 * by Lauds / Vespers / Compline.
 *
 * The rubric keys on two facts of ONE celebration: its rank and the weekday
 * it falls on. When FR-156 promotes a render to borrow tomorrow's identity
 * (Saturday → Sunday First Vespers, or the eve of a Solemnity / Feast),
 * `ctx.effectiveLiturgicalDay` carries the celebration while
 * `ctx.dayOfWeek` is still the EVE's civil weekday. Reading the rank from
 * the promoted day but the weekday from the eve made every Saturday eve of
 * a Sunday (romcal ranks Sundays as SOLEMNITY — Trinity Sunday 2026-05-31,
 * 1st Sunday of Advent, plain Ordinary-Time Sundays…) fire the
 * "Solemnity not on Sunday" alternate, while the same First Vespers on the
 * `/firstVespers` route (URL date = the Sunday) correctly kept the primary.
 *
 * Therefore the weekday is derived from the effective day's own `date`
 * (`LiturgicalDayInfo.date`, always set by `getLiturgicalDay`), so rank and
 * weekday always describe the same day. Fixtures that build a
 * `LiturgicalDayInfo` without `date` fall back to `ctx.dayOfWeek`, which
 * is also the value for every non-promoted render (`effectiveDay.date ===
 * ctx.dateStr`).
 */
export function resolveConcludingPrayerSwap(ctx: ConcludingPrayerSwapContext): boolean {
  const effectiveDay = ctx.effectiveLiturgicalDay ?? ctx.liturgicalDay
  const derived = effectiveDay.date ? dateToDayOfWeek(effectiveDay.date) : undefined
  return shouldUseAlternateConcludingPrayer(effectiveDay, derived ?? ctx.dayOfWeek)
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
  alternatePage?: number
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
      alternatePage: inputs.primaryPage,
      textRich: inputs.alternateRich,
      alternateTextRich: inputs.primaryRich,
    }
  }
  return {
    text: inputs.primaryText ?? '',
    page: inputs.primaryPage,
    alternateText: inputs.alternateText,
    alternatePage: inputs.alternatePage,
    textRich: inputs.primaryRich,
    alternateTextRich: inputs.alternateRich,
  }
}
