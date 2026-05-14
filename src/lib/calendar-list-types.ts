import type {
  CelebrationOption,
  CelebrationRank,
  HourType,
  LiturgicalColor,
} from './types'

// FR-145 (#8) — Pure types + UI helpers for the calendar-list first
// screen. NO server-side imports (no fs / no romcal / no propers-loader)
// so that client components can import this freely without dragging
// Node-only modules into the client bundle.
//
// Counterpart `calendar-list.ts` carries the server-side data adapters
// (getCalendarRow / getCalendarWindow / getTodayAnchorRow). Splitting them
// keeps the client bundle slim.

export interface CalendarListRow {
  kind: 'today-anchor' | 'date'
  date: string
  /** True when `date === today (Asia/Ulaanbaatar)`. False for the anchor row. */
  isToday: boolean
  /** Short Mongolian weekday label, e.g. "Пүр". Empty string for the anchor row. */
  dayLabel: string
  /** Numeric day-of-month, 1-31. 0 for the anchor row. */
  dayOfMonth: number
  /** 1-12. 0 for the anchor row. */
  month: number
  /** romcal-picked default celebration for this date. */
  defaultCelebration: CelebrationOption
  /** Liturgical color of the default celebration (drives the red rule). */
  color: LiturgicalColor
  /** Liturgical rank of the default celebration. */
  rank: CelebrationRank
  /** Psalter week, 1-4. */
  psalterWeek: 1 | 2 | 3 | 4
  /** Visible alternatives the user can choose alongside the default. */
  alternatives: CelebrationOption[]
  /** Hours available for this date (drives inline expansion). */
  hoursSummary: ReadonlyArray<{ type: HourType; nameMn: string }>
}

export interface CalendarListWindow {
  /** Date the window is anchored at (today by default). */
  anchorDate: string
  /** Real-time today (Asia/Ulaanbaatar) — used by the UI to highlight. */
  todayStr: string
  rows: CalendarListRow[]
}

/**
 * Predicate helper: is this date's default celebration the kind that
 * should be rendered in red on the calendar list?
 *
 * Per user decision 6 (verbatim 2026-05-14): the calendar-list "red
 * highlight" is reserved for **rank ∈ {SOLEMNITY, FEAST}** — the image.png
 * design shows Ascension (color=WHITE liturgically) AND 7th Sunday of
 * Easter (color=WHITE) in red because both are solemnities. The
 * `liturgical-colors.ts` palette (used in the existing day-card surface)
 * still governs per-color text/border tinting — this predicate is the
 * higher-priority "highlight a big day" signal that overrides the normal
 * stone-text default on the calendar-list rows.
 */
export function shouldRowUseRedAccent(row: CalendarListRow): boolean {
  if (row.kind !== 'date') return false
  return row.rank === 'SOLEMNITY' || row.rank === 'FEAST'
}

/** Shift `YYYY-MM-DD` by `offset` days, returning the new ISO date string. */
export function shiftDate(dateStr: string, offset: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10)
}
