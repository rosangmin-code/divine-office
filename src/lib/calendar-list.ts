import { DAY_NAMES_MN, type CelebrationOption } from './types'
import { getMongoliaDateStr } from './timezone'
import { getLiturgicalDay } from './calendar'
import { getCelebrationOptions } from './celebrations'
import { getHoursSummary } from './loth-service'
import type { CalendarListRow, CalendarListWindow } from './calendar-list-types'
import { shiftDate } from './calendar-list-types'

// FR-145 (#8) — Server-side data adapters for the calendar-list first
// screen.
//
// Pure types + tiny stateless helpers (e.g. `shouldRowUseRedAccent`,
// `shiftDate`) live in `calendar-list-types.ts` so client components can
// import them without dragging fs/romcal into the client bundle. This
// file owns the *data-bearing* APIs that resolve a date into a populated
// row via romcal + propers-loader.
//
// User decisions reflected here (verbatim from dispatch, 2026-05-14):
//   1. General Roman calendar, no transfer — romcal auto-pick is the
//      authoritative default for each date (Ascension on Thu pre-empts
//      the 6th-week-of-Eastertide weekday; Saint Matthias has no PDF
//      propers so does not surface).
//   2/7. PDF-authored data only — alternatives are skipped when the
//        underlying propers (`optional-memorials.json` / `saturday-mary`)
//        are not in the data. `getCelebrationOptions` is the single
//        source of truth, so this falls out naturally.
//   5. Pre-empted feasts are also skipped from the alternatives list —
//      naturally handled because they would not be in
//      `optional-memorials.json`.
//   6. Red coloring is anchored on rank ∈ {SOLEMNITY, FEAST} (see the
//      `shouldRowUseRedAccent` predicate in `calendar-list-types.ts`).

const DOW_CODES: Array<'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT'> = [
  'SUN',
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
]

// Re-export pure helpers for callers that don't want to fork their imports.
export type { CalendarListRow, CalendarListWindow } from './calendar-list-types'
export { shouldRowUseRedAccent, shiftDate } from './calendar-list-types'

// Window-extent upper bound (~10 years forward / backward). Callers always
// pre-clamp to non-negative via `Math.max(0, ...)` so a lower bound is
// unreachable; only the upper clamp is needed.
const MAX_OFFSET = 3650

function clampOffset(offset: number): number {
  if (offset > MAX_OFFSET) return MAX_OFFSET
  return offset
}

/** Format `YYYY-MM-DD` as the row label parts. */
export function describeDate(dateStr: string): {
  dayLabel: string
  dayOfMonth: number
  month: number
} {
  const d = new Date(dateStr + 'T00:00:00Z')
  const dow = DOW_CODES[d.getUTCDay()]
  // Short 3-char Mongolian weekday — matches the image.png "Wed 13 May"
  // density. We use the first 3 chars of the canonical label.
  const longLabel = DAY_NAMES_MN[dow]
  const dayLabel = longLabel.slice(0, 3)
  return {
    dayLabel,
    dayOfMonth: d.getUTCDate(),
    month: d.getUTCMonth() + 1,
  }
}

/**
 * Build one calendar-list row for the given date. Returns null when the
 * date is outside the romcal-supported range or otherwise unresolvable.
 */
export function getCalendarRow(dateStr: string, todayStr?: string): CalendarListRow | null {
  const day = getLiturgicalDay(dateStr)
  if (!day) return null

  const optionsResult = getCelebrationOptions(dateStr)
  if (!optionsResult || optionsResult.options.length === 0) return null

  const [defaultOption, ...alternatives] = optionsResult.options
  const summary = getHoursSummary(dateStr)
  const { dayLabel, dayOfMonth, month } = describeDate(dateStr)
  const today = todayStr ?? getMongoliaDateStr()

  return {
    kind: 'date',
    date: dateStr,
    isToday: dateStr === today,
    dayLabel,
    dayOfMonth,
    month,
    defaultCelebration: defaultOption,
    color: day.color,
    rank: day.rank,
    psalterWeek: day.psalterWeek,
    alternatives,
    hoursSummary: summary?.hours ?? [],
  }
}

/**
 * Build the synthetic "Today (Automatic)" anchor row. Links to today's
 * romcal auto-pick (no celebration query param). Always rendered at the
 * top of the list per user decision 3.
 */
export function getTodayAnchorRow(todayStr?: string): CalendarListRow | null {
  const today = todayStr ?? getMongoliaDateStr()
  const row = getCalendarRow(today, today)
  if (!row) return null
  // Override the default option's `kind` so the UI can distinguish the
  // synthetic anchor from a normal date row's default.
  const anchorDefault: CelebrationOption = {
    ...row.defaultCelebration,
    kind: 'automatic',
  }
  return {
    ...row,
    kind: 'today-anchor',
    isToday: false, // never highlight the anchor — the actual today row owns the highlight
    dayLabel: '',
    dayOfMonth: 0,
    month: 0,
    defaultCelebration: anchorDefault,
    // The anchor surfaces just the auto-pick — alternatives belong on the
    // real today row, not on the synthetic anchor.
    alternatives: [],
  }
}

export interface CalendarListWindowOptions {
  /** Days before the anchor (defaults to 7). Clamped to [0, 3650]. */
  before?: number
  /** Days after the anchor (defaults to 21). Clamped to [0, 3650]. */
  after?: number
  /** Override "today" (Asia/Ulaanbaatar). Test seam. */
  todayStr?: string
  /** Include the synthetic "Today (Automatic)" anchor row at the top. */
  includeTodayAnchor?: boolean
}

/**
 * Build a calendar-list window anchored at `anchorDate`. Returns one row
 * per date in the inclusive range `[anchorDate - before, anchorDate + after]`,
 * sorted chronologically, with optional "Today (Automatic)" anchor row
 * prepended.
 */
export function getCalendarWindow(
  anchorDate: string,
  opts: CalendarListWindowOptions = {},
): CalendarListWindow {
  const before = clampOffset(Math.max(0, opts.before ?? 7))
  const after = clampOffset(Math.max(0, opts.after ?? 21))
  const todayStr = opts.todayStr ?? getMongoliaDateStr()
  const includeAnchor = opts.includeTodayAnchor ?? true

  const rows: CalendarListRow[] = []

  if (includeAnchor) {
    const anchor = getTodayAnchorRow(todayStr)
    if (anchor) rows.push(anchor)
  }

  for (let offset = -before; offset <= after; offset++) {
    const dateStr = shiftDate(anchorDate, offset)
    const row = getCalendarRow(dateStr, todayStr)
    if (row) rows.push(row)
  }

  return { anchorDate, todayStr, rows }
}

// 'YYYY-MM' with month constrained to 01..12. Single-digit / 2-digit-year
// / 13+ months are rejected by the regex.
const YEAR_MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/

/**
 * Return the number of days in the given calendar month. `month` is
 * 1-indexed (1=Jan..12=Dec). Uses the `Date.UTC(year, month, 0)`
 * convention (day=0 yields the last day of the previous month, so
 * passing `month` resolves to the last day of the requested month).
 *
 * Leap-year handling falls out naturally from the JS Date semantics:
 *   daysInMonth(2024, 2) === 29
 *   daysInMonth(2025, 2) === 28
 */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export interface CalendarMonthOptions {
  /** Override "today" (Asia/Ulaanbaatar). Test seam. Drives the synthetic
   *  "Today (Automatic)" anchor row — included only when this date falls
   *  inside the requested month. */
  todayStr?: string
}

/**
 * Build a calendar-list window covering exactly one calendar month
 * (1st through the last day). Delegates to `getCalendarWindow` with
 * `anchorDate = ${yearMonth}-01`, `before = 0`, `after = daysInMonth - 1`.
 *
 * The synthetic "Today (Automatic)" anchor row is prepended ONLY when
 * `todayStr` (default: Asia/Ulaanbaatar today) falls inside the
 * requested month. Other months render as pure date rows.
 *
 * Throws `TypeError` on malformed `yearMonth` — must be `'YYYY-MM'`
 * with month ∈ 01..12 (e.g. `'2026-05'`). Strings like `'2026-13'`,
 * `'2026-5'`, `'26-05'`, `'abc'`, or `''` are rejected.
 *
 * @example
 *   getCalendarMonth('2026-05', { todayStr: '2026-05-14' })
 *   // → rows.length === 32 (1 anchor + 31 date rows)
 *
 *   getCalendarMonth('2026-06', { todayStr: '2026-05-14' })
 *   // → rows.length === 30 (no anchor, June has 30 days)
 */
export function getCalendarMonth(
  yearMonth: string,
  opts: CalendarMonthOptions = {},
): CalendarListWindow {
  const match = YEAR_MONTH_RE.exec(yearMonth)
  if (!match) {
    throw new TypeError(
      `getCalendarMonth: invalid yearMonth "${yearMonth}" — expected "YYYY-MM" with month 01..12`,
    )
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const days = daysInMonth(year, month)
  const anchorDate = `${yearMonth}-01`
  const todayStr = opts.todayStr ?? getMongoliaDateStr()
  // Anchor decision: include only when today is in the requested month.
  // Compare via the 'YYYY-MM-' prefix to avoid date-arithmetic surprises.
  const includeTodayAnchor = todayStr.startsWith(`${yearMonth}-`)

  return getCalendarWindow(anchorDate, {
    before: 0,
    after: days - 1,
    todayStr,
    includeTodayAnchor,
  })
}
