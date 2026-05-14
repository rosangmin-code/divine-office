import { getMongoliaDateStr } from '@/lib/timezone'
import { getCalendarWindow } from '@/lib/calendar-list'
import { LiturgicalCalendarList } from '@/components/liturgical-calendar-list'
import { SettingsLink } from '@/components/settings-link'
import { Footer } from '@/components/footer'
import Link from 'next/link'
import { loadCalendarWindowAction } from '@/app/actions/calendar'

// FR-145 (#8) — Liturgical-calendar first screen.
//
// Replaces the prior single-day card view with an image.png-style
// vertical liturgical calendar. The first row is a synthetic "Today
// (Автомат)" anchor; subsequent rows show each calendar date with the
// default celebration + optional alternatives. Rows expand inline (no
// route navigation) to surface the hour cards.
//
// Render policy:
//   - Server renders an initial window (±60 days from anchor by
//     default) — large enough that infinite scroll is rarely needed for
//     a typical browsing session.
//   - Client extends the visible range via `loadCalendarWindowAction`
//     when the top/bottom sentinel reaches the viewport.
//   - Back link preservation (FR-145 AC5): prayer pages still link
//     back via `/?date=YYYY-MM-DD&celebration=...`. The home page reads
//     those params to anchor the list at the requested date and
//     pre-select the matching row's celebration.

const INITIAL_BEFORE_DAYS = 60
const INITIAL_AFTER_DAYS = 60

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; celebration?: string }>
}) {
  const params = await searchParams
  const todayStr = getMongoliaDateStr()
  const anchorDate = params.date ?? todayStr

  const window = getCalendarWindow(anchorDate, {
    before: INITIAL_BEFORE_DAYS,
    after: INITIAL_AFTER_DAYS,
    todayStr,
    includeTodayAnchor: true,
  })

  return (
    <div className="mx-auto max-w-2xl px-2 md:px-6 py-6">
      {/* Header — image.png style "Dates" + actions */}
      <header className="mb-4 flex items-center justify-between border-b border-stone-200 pb-3 dark:border-stone-800">
        <h1
          data-testid="calendar-list-heading"
          className="text-xl font-bold text-stone-900 dark:text-stone-100"
        >
          Огноо
        </h1>
        <SettingsLink />
      </header>

      {window.rows.length === 0 ? (
        <p className="py-12 text-center text-stone-500 dark:text-stone-400">
          Өгөгдөл олдсонгүй: {anchorDate}
        </p>
      ) : (
        <LiturgicalCalendarList
          initialRows={window.rows}
          todayStr={todayStr}
          initialDate={params.date}
          initialCelebrationId={params.celebration}
          loadWindow={loadCalendarWindowAction}
        />
      )}

      {/* Reference links */}
      <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-4">
        <Link
          href="/guide"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-stone-600 hover:bg-stone-200 dark:text-stone-400 dark:hover:bg-stone-700 transition-colors"
        >
          <span className="text-base">📖</span>
          Залбиралт цагийн заавар
        </Link>
        <Link
          href="/ordinarium"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-stone-600 hover:bg-stone-200 dark:text-stone-400 dark:hover:bg-stone-700 transition-colors"
        >
          <span className="text-base">📜</span>
          Залбиралт цагийн ёслолын дэг жаяг
        </Link>
      </div>

      <Footer />
    </div>
  )
}
