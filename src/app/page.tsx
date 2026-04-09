import Link from 'next/link'
import { getHoursSummary } from '@/lib/loth-service'
import type { HourType } from '@/lib/types'
import { BORDER_COLOR_CLASSES } from '@/lib/liturgical-colors'
import { DatePicker } from '@/components/date-picker'
import { HourIcon } from '@/components/hour-icon'
import { ThemeToggle } from '@/components/theme-toggle'
import { Footer } from '@/components/footer'

const HOUR_TIME_HINTS: Record<HourType, string> = {
  officeOfReadings: '',
  lauds: '~06:00',
  terce: '~09:00',
  sext: '~12:00',
  none: '~15:00',
  vespers: '~18:00',
  compline: '~21:00',
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const params = await searchParams
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const dateStr = params.date ?? `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const summary = getHoursSummary(dateStr)

  if (!summary) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 dark:bg-neutral-950">
        <p className="text-stone-500 dark:text-stone-400">Өгөгдөл олдсонгүй: {dateStr}</p>
      </div>
    )
  }

  const { liturgicalDay, hours } = summary

  return (
    <div className="mx-auto max-w-2xl px-4 md:px-6 py-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-end mb-4">
          <ThemeToggle />
        </div>
        <h1 className="text-center mb-2 text-3xl md:text-4xl font-bold text-stone-900 dark:text-stone-100">
          Цагийн Залбирал
        </h1>
        <p className="text-center text-sm text-stone-500 dark:text-stone-400">Liturgy of the Hours</p>
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
        <DatePicker value={dateStr} />
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
            {liturgicalDay.name}
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {liturgicalDay.seasonMn} · {liturgicalDay.colorMn} ·{' '}
            {romanNumeral(liturgicalDay.psalterWeek)} долоо хоног
          </p>
        </div>
      </div>

      {/* Hour cards */}
      <section aria-label="Цагийн залбирлууд" className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
        {hours.map((hour) => (
          <Link
            key={hour.type}
            href={`/pray/${dateStr}/${hour.type}`}
            className="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] dark:bg-neutral-900 dark:shadow-none dark:ring-1 dark:ring-stone-800"
          >
            <HourIcon hour={hour.type} className="h-7 w-7 text-stone-500 dark:text-stone-400" />
            <div className="flex-1">
              <h3 className="font-semibold text-stone-800 dark:text-stone-200">{hour.nameMn}</h3>
              <p className="text-xs text-stone-400 dark:text-stone-500">{hour.type}</p>
            </div>
            {HOUR_TIME_HINTS[hour.type] && (
              <span className="text-sm text-stone-400 dark:text-stone-500">
                {HOUR_TIME_HINTS[hour.type]}
              </span>
            )}
            <span className="text-stone-300 dark:text-stone-600">→</span>
          </Link>
        ))}
      </section>

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
