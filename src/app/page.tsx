import Link from 'next/link'
import { getMongoliaDateStr } from '@/lib/timezone'
import { getHoursSummary } from '@/lib/loth-service'
import { getCelebrationOptions, resolveCelebration, DEFAULT_CELEBRATION_ID } from '@/lib/celebrations'
import { BORDER_COLOR_CLASSES, TEXT_COLOR_CLASSES } from '@/lib/liturgical-colors'
import { formatDateMn, romanNumeral } from '@/lib/mappings'
import { DatePicker } from '@/components/date-picker'
import { HourCardList } from '@/components/hour-card-list'
import { CelebrationPicker } from '@/components/celebration-picker'
import { SettingsLink } from '@/components/settings-link'
import { Footer } from '@/components/footer'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; celebration?: string }>
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

  const options = getCelebrationOptions(dateStr)?.options ?? []
  const resolved = resolveCelebration(dateStr, params.celebration)
  const selectedOption = resolved?.option ?? options[0]
  const celebrationId = selectedOption?.id ?? DEFAULT_CELEBRATION_ID
  const liturgicalDay = selectedOption && !selectedOption.isDefault
    ? {
        ...summary.liturgicalDay,
        nameMn: selectedOption.nameMn,
        rank: selectedOption.rank,
        color: selectedOption.color,
        colorMn: selectedOption.colorMn,
      }
    : summary.liturgicalDay

  const { hours } = summary

  const todayStr = getMongoliaDateStr()

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
        {(() => {
          const { formatted, weekday } = formatDateMn(dateStr)
          return (
            <div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {formatted} {weekday}
              </p>
              <h2 className={`mt-1 text-lg font-semibold ${TEXT_COLOR_CLASSES[liturgicalDay.color]}`}>
                {liturgicalDay.nameMn}
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Дуулалтын {romanNumeral(liturgicalDay.psalterWeek)}
              </p>
            </div>
          )
        })()}
      </div>

      {/* Celebration selector (only shown when multiple options exist) */}
      <CelebrationPicker dateStr={dateStr} options={options} selectedId={celebrationId} />

      {/* Hour cards */}
      <HourCardList hours={hours} dateStr={dateStr} celebrationId={celebrationId} />

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
