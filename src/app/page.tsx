import Link from 'next/link'
import { getMongoliaDateStr } from '@/lib/timezone'
import { getHoursSummary } from '@/lib/loth-service'
import { BORDER_COLOR_CLASSES } from '@/lib/liturgical-colors'
import { DatePicker } from '@/components/date-picker'
import { HourCardList } from '@/components/hour-card-list'
import { SettingsLink } from '@/components/settings-link'
import { Footer } from '@/components/footer'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const params = await searchParams
  const dateStr = params.date ?? getMongoliaDateStr()
  const summary = getHoursSummary(dateStr)

  if (!summary) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 dark:bg-neutral-950">
        <p className="text-stone-500 dark:text-stone-400">Өгөгдөл олдсонгүй: {dateStr}</p>
      </div>
    )
  }

  const { liturgicalDay, hours } = summary

  // 서버 측 isToday 힌트 (클라이언트에서 재검증)
  const todayStr = getMongoliaDateStr()
  const isToday = dateStr === todayStr

  return (
    <div className="mx-auto max-w-2xl px-4 md:px-6 py-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-end gap-1 mb-4">
          <SettingsLink />
        </div>
        <h1 className="text-center text-3xl md:text-4xl font-bold text-stone-900 dark:text-stone-100">
          Цагийн Залбирал
        </h1>
      </header>

      {/* Date navigation */}
      <nav aria-label="Огноо навигаци" className="mb-6 flex items-center justify-center gap-4">
        <Link
          href={`/?date=${getPrevDate(dateStr)}`}
          aria-label="Өмнөх өдөр"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-stone-600 hover:bg-stone-200 dark:text-stone-400 dark:hover:bg-stone-700"
        >
          ←
        </Link>
        <DatePicker value={dateStr} todayStr={todayStr} />
        <Link
          href={`/?date=${getNextDate(dateStr)}`}
          aria-label="Дараа өдөр"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-stone-600 hover:bg-stone-200 dark:text-stone-400 dark:hover:bg-stone-700"
        >
          →
        </Link>
      </nav>

      {/* Liturgical day info */}
      <div className={`mb-8 rounded-xl bg-white p-6 shadow-sm border-l-4 ${BORDER_COLOR_CLASSES[liturgicalDay.color]} dark:bg-neutral-900 dark:shadow-none dark:ring-1 dark:ring-stone-800`}>
        <div>
          <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
            {liturgicalDay.nameMn}
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {liturgicalDay.seasonMn} · {liturgicalDay.colorMn} ·{' '}
            {romanNumeral(liturgicalDay.psalterWeek)} долоо хоног
          </p>
        </div>
      </div>

      {/* Hour cards — Client Component for time-based status */}
      <HourCardList hours={hours} dateStr={dateStr} isToday={isToday} />

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

      {/* Footer */}
      <Footer />
    </div>
  )
}

function getPrevDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

function getNextDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function romanNumeral(n: number): string {
  const numerals = ['I', 'II', 'III', 'IV']
  return numerals[n - 1] ?? String(n)
}
