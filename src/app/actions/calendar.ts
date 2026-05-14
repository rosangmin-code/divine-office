'use server'

import type { CalendarListWindow } from '@/lib/calendar-list'
import { getCalendarWindow } from '@/lib/calendar-list'

// FR-145 (#8) — Server action backing the calendar-list infinite scroll.
//
// Returns a window centered at `anchorDate` with `before` rows preceding
// and `after` rows following. The client passes the existing edge (oldest
// or newest visible date) as the anchor and a non-zero direction to extend
// the visible range without re-paying for the full page render.
export async function loadCalendarWindowAction(
  anchorDate: string,
  before: number,
  after: number,
): Promise<CalendarListWindow> {
  return getCalendarWindow(anchorDate, {
    before,
    after,
    includeTodayAnchor: false,
  })
}
