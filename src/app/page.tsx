import { getMongoliaDateStr } from '@/lib/timezone'
import { getCalendarMonth } from '@/lib/calendar-list'
import { LiturgicalCalendarList } from '@/components/liturgical-calendar-list'
import { MonthNavController } from '@/components/month-nav-controller'
import { Footer } from '@/components/footer'
import { Icon } from '@/components/icon'
import Link from 'next/link'

// wi-004 (#16) header — replaced previous [h1 'Огноо' | SettingsLink]
// pair with MonthNav (?month=YYYY-MM URL push driven). The Settings entry
// point moves to the footer (wi-006 / #18). Other pages (/guide,
// /ordinarium, /pray/...) still mount their own SettingsLink; only the
// home header drops it here.

// NOTE: `loadCalendarWindowAction` (src/app/actions/calendar.ts) is no
// longer referenced — wi-005 removed the consuming infinite-scroll prop
// from `LiturgicalCalendarList`. The action file itself is left in place
// as an orphan for a separate cleanup follow-up (outside wi-002 scope).

// FR-145 (#8 / GOAL #4) — Liturgical-calendar first screen.
//
// 3-tier searchParams resolution (highest-priority first):
//   1. ?date=YYYY-MM-DD → render the month containing that date; the
//      named date row is pre-selected via LiturgicalCalendarList's
//      `initialDate` prop (back-link preservation, FR-145 AC5).
//   2. ?month=YYYY-MM → render exactly that month; the synthetic
//      "Today (Automatic)" anchor row appears only when today falls
//      inside the requested month (delegated to getCalendarMonth).
//   3. Neither → render today's month with the today-anchor prepended.
//
// Invalid ?date / ?month values silently fall back to today's month
// (no 4xx, no empty screen). The 3-tier decision is encapsulated in
// the pure helper `resolveMonthRouting` below so it can be unit-tested
// without spinning up Next.

const DATE_PARAM_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
const MONTH_PARAM_RE = /^(\d{4})-(0[1-9]|1[0-2])$/

export interface MonthRoutingDecision {
  /** Resolved 'YYYY-MM' to render. Already falls back to today's month
   *  when the input was malformed — always safe to pass directly into
   *  `getCalendarMonth`. */
  yearMonth: string
  /** ?date param passed through ONLY when it parses as YYYY-MM-DD.
   *  Drives LiturgicalCalendarList's pre-selected row (FR-145 AC5
   *  back-link preservation). `undefined` whenever ?date is absent
   *  or malformed. */
  initialDate: string | undefined
}

/**
 * Pure helper — resolves the 3-tier searchParams priority into the
 * single month to render plus the (optional) pre-selected row.
 *
 *   ?date wins → month derived from date, initialDate = date
 *   ?month → month as-is, initialDate undefined
 *   neither → today's month, initialDate undefined
 *
 * Malformed inputs silently degrade to today's month. The validation
 * regexes mirror the strict shape that `getCalendarMonth` would also
 * reject, so the helper's output never causes getCalendarMonth to
 * throw — keeping the page handler exception-free.
 */
export function resolveMonthRouting(
  params: { date?: string; month?: string },
  todayStr: string,
): MonthRoutingDecision {
  const todayMonth = todayStr.slice(0, 7)

  // Tier 1 — ?date dictates BOTH the month and the pre-selected row.
  if (params.date !== undefined) {
    if (DATE_PARAM_RE.test(params.date)) {
      return {
        yearMonth: params.date.slice(0, 7),
        initialDate: params.date,
      }
    }
    // Invalid ?date silently degrades to today's month; do NOT propagate
    // the malformed value as initialDate (would anchor to a bogus row).
    return { yearMonth: todayMonth, initialDate: undefined }
  }

  // Tier 2 — explicit ?month selector.
  if (params.month !== undefined) {
    if (MONTH_PARAM_RE.test(params.month)) {
      return { yearMonth: params.month, initialDate: undefined }
    }
    return { yearMonth: todayMonth, initialDate: undefined }
  }

  // Tier 3 — neither param: today's month.
  return { yearMonth: todayMonth, initialDate: undefined }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string
    month?: string
    celebration?: string
  }>
}) {
  const params = await searchParams
  const todayStr = getMongoliaDateStr()
  const { yearMonth, initialDate } = resolveMonthRouting(
    { date: params.date, month: params.month },
    todayStr,
  )

  const window = getCalendarMonth(yearMonth, { todayStr })

  return (
    // pb-24 reserves room for the sticky home-variant Footer so the
    // last calendar row / reference-link strip never disappears behind
    // the footer at scroll-end (wi-006 / #18). The footer's own padding
    // additionally adds env(safe-area-inset-bottom) on iOS notch.
    <div className="mx-auto max-w-2xl px-2 md:px-6 pt-6 pb-24">
      {/* Header — image.png style month-navigation. MonthNav itself
          serves as the page's primary title (its label shows the
          current month, e.g. '2026 оны 5-р сар'). The previous
          `Огноо` h1 + SettingsLink are removed: heading text is now
          implied by the MonthNav label, and Settings reaches users
          via the footer entry point (wi-006). A visually-hidden h1
          is retained for accessibility + the legacy
          `calendar-list-heading` testid that some tests / future
          consumers may key on. */}
      <header className="mb-4 border-b border-stone-200 pb-3 dark:border-stone-800">
        <h1
          data-testid="calendar-list-heading"
          className="sr-only"
        >
          Огноо
        </h1>
        <MonthNavController currentMonth={yearMonth} />
      </header>

      {window.rows.length === 0 ? (
        <p className="py-12 text-center text-stone-500 dark:text-stone-400">
          Өгөгдөл олдсонгүй: {window.anchorDate}
        </p>
      ) : (
        <LiturgicalCalendarList
          initialRows={window.rows}
          todayStr={todayStr}
          initialDate={initialDate}
          initialCelebrationId={params.celebration}
        />
      )}

      {/* Reference links — surface 행: 좌측 아이콘 + 텍스트 + 우측 chevron(next).
          이모지(📖/📜) → lucide <Icon> (DESIGN.md Iconography, 단일 패밀리). */}
      <div className="mx-auto mt-6 flex max-w-md flex-col gap-2">
        <Link
          href="/guide"
          className="flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm text-stone-600 transition-colors hover:bg-stone-200 dark:text-stone-400 dark:hover:bg-stone-700"
        >
          <Icon name="guide" size={18} className="shrink-0 text-stone-400 dark:text-stone-500" aria-hidden />
          <span>Залбиралт цагийн заавар</span>
          <Icon name="next" size={18} className="ml-auto shrink-0 text-stone-400 dark:text-stone-500" aria-hidden />
        </Link>
        <Link
          href="/ordinarium"
          className="flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm text-stone-600 transition-colors hover:bg-stone-200 dark:text-stone-400 dark:hover:bg-stone-700"
        >
          <Icon name="order" size={18} className="shrink-0 text-stone-400 dark:text-stone-500" aria-hidden />
          <span>Залбиралт цагийн ёслолын дэг жаяг</span>
          <Icon name="next" size={18} className="ml-auto shrink-0 text-stone-400 dark:text-stone-500" aria-hidden />
        </Link>
      </div>

      {/* home Footer — sticky variant: [Өнөөдөр] [Тохиргоо] (lucide
          아이콘+라벨) + 교회 출처표시 2줄 상시 노출. 토글 chevron 제거
          (#51/#53, FR-162). Other pages mount the minimal credit-only Footer. */}
      <Footer homeControls />
    </div>
  )
}
