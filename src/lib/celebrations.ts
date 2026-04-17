import type {
  CelebrationOption,
  CelebrationOptionsResult,
  LiturgicalDayInfo,
  SanctoralEntry,
} from './types'
import { getLiturgicalDay } from './calendar'
import {
  getOptionalMemorial,
  getOptionalMemorialsForDate,
  getSaturdayMaryMemorial,
} from './propers-loader'
import { COLOR_NAMES_MN } from './mappings'

export const DEFAULT_CELEBRATION_ID = 'default'
const SATURDAY_MARY_ID = 'saturday-mary'

function mmddOf(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  return `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function isOrdinaryTimeSaturday(day: LiturgicalDayInfo): boolean {
  if (day.season !== 'ORDINARY_TIME') return false
  if (day.rank !== 'WEEKDAY') return false
  const d = new Date(day.date + 'T00:00:00Z')
  return d.getUTCDay() === 6
}

function defaultOption(day: LiturgicalDayInfo): CelebrationOption {
  return {
    id: DEFAULT_CELEBRATION_ID,
    name: day.name,
    nameMn: day.nameMn,
    rank: day.rank,
    color: day.color,
    colorMn: day.colorMn,
    isDefault: true,
    source: 'romcal',
  }
}

/**
 * Enumerate the celebration options the user can pray for a given date.
 *
 * Rules:
 * - The romcal-provided liturgical day is always the first option (id: 'default').
 * - On weekdays (and before ranks are elevated), entries from
 *   `optional-memorials.json` whose `mmdd` matches the date are appended.
 * - On Ordinary Time Saturdays that carry no higher-ranking celebration, the
 *   Saturday memorial of the Blessed Virgin Mary (`saturday-mary`) is appended.
 */
export function getCelebrationOptions(dateStr: string): CelebrationOptionsResult | null {
  const day = getLiturgicalDay(dateStr)
  if (!day) return null

  const options: CelebrationOption[] = [defaultOption(day)]

  // Only surface voluntary celebrations on plain weekdays: solemnities, feasts,
  // and memorials already have a proper office and should not be shadowed.
  if (day.rank === 'WEEKDAY') {
    const mmdd = mmddOf(dateStr)
    for (const { id, entry } of getOptionalMemorialsForDate(mmdd)) {
      options.push({
        id,
        name: entry.name,
        nameMn: entry.nameMn,
        rank: entry.rank,
        color: entry.color,
        colorMn: COLOR_NAMES_MN[entry.color],
        isDefault: false,
        source: 'optional',
      })
    }

    if (isOrdinaryTimeSaturday(day)) {
      const mary = getSaturdayMaryMemorial()
      if (mary) {
        options.push({
          id: SATURDAY_MARY_ID,
          name: 'Saturday Memorial of the Blessed Virgin Mary',
          nameMn: mary.name ?? 'Төгс жаргалт цэвэр Охин Мариагийн Бямба гарагийг дурсахуй',
          rank: 'OPTIONAL_MEMORIAL',
          color: 'WHITE',
          colorMn: COLOR_NAMES_MN.WHITE,
          isDefault: false,
          source: 'votive',
        })
      }
    }
  }

  return { date: dateStr, options }
}

export interface ResolvedCelebration {
  option: CelebrationOption
  /** Sanctoral propers to apply in place of the day's default, if any. */
  sanctoralOverride: SanctoralEntry | null
}

/**
 * Resolve a user-supplied `celebrationId` for a date.
 *
 * Returns the default option when `id` is `undefined`, `'default'`, or unknown
 * for this date. When a non-default option is selected, the matching sanctoral
 * entry is returned so the caller can apply it to the assembly pipeline.
 */
export function resolveCelebration(dateStr: string, id?: string | null): ResolvedCelebration | null {
  const result = getCelebrationOptions(dateStr)
  if (!result) return null
  const { options } = result

  const wanted = id && id !== DEFAULT_CELEBRATION_ID
    ? options.find((o) => o.id === id)
    : undefined

  if (!wanted) {
    return { option: options[0], sanctoralOverride: null }
  }

  let override: SanctoralEntry | null = null
  if (wanted.source === 'optional') {
    override = getOptionalMemorial(wanted.id)
  } else if (wanted.source === 'votive' && wanted.id === SATURDAY_MARY_ID) {
    override = getSaturdayMaryMemorial()
  }

  return { option: wanted, sanctoralOverride: override }
}
