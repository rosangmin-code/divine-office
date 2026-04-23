import Link from 'next/link'
import { notFound } from 'next/navigation'
import { assembleHour } from '@/lib/loth-service'
import { isValidDateStr } from '@/lib/date-validation'
import { PrayerRenderer } from '@/components/prayer-renderer'
import { SettingsLink } from '@/components/settings-link'
import { Footer } from '@/components/footer'
import { HourIcon } from '@/components/hour-icon'
import type { HourType } from '@/lib/types'
import { BORDER_COLOR_CLASSES, TEXT_COLOR_CLASSES } from '@/lib/liturgical-colors'
import { formatDateMn, romanNumeral } from '@/lib/mappings'

const VALID_HOURS: HourType[] = ['lauds', 'vespers', 'compline']

export default async function PrayPage({
  params,
  searchParams,
}: {
  params: Promise<{ date: string; hour: string }>
  searchParams: Promise<{ celebration?: string }>
}) {
  const { date, hour: hourParam } = await params
  const { celebration } = await searchParams

  if (!isValidDateStr(date)) {
    notFound()
  }

  if (!VALID_HOURS.includes(hourParam as HourType)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-stone-500 dark:text-stone-400">Буруу цагийн төрөл: {hourParam}</p>
      </div>
    )
  }

  const hourType = hourParam as HourType
  const assembled = await assembleHour(date, hourType, { celebrationId: celebration })

  if (!assembled) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-stone-500 dark:text-stone-400">Өгөгдөл олдсонгүй: {date}</p>
      </div>
    )
  }

  const { liturgicalDay } = assembled

  return (
    <div className="mx-auto max-w-2xl lg:max-w-3xl px-4 md:px-6 py-6">
      {/* Back link + settings actions */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/?date=${date}${celebration && celebration !== 'default' ? `&celebration=${encodeURIComponent(celebration)}` : ''}`}
          aria-label="Бүх цагийн залбирлууд руу буцах"
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
        >
          ← Бүх цагийн залбирал
        </Link>
        <div className="flex items-center gap-1">
          <SettingsLink />
        </div>
      </div>

      {/* Header */}
      <header className={`mb-6 rounded-xl border-l-4 ${BORDER_COLOR_CLASSES[liturgicalDay.color]} bg-white p-6 shadow-sm dark:bg-neutral-900 dark:shadow-none dark:ring-1 dark:ring-stone-800`}>
        <div className="flex items-center gap-3">
          <HourIcon hour={hourType} className="h-5 w-5 text-stone-400 dark:text-stone-500" />
          <div>
            <h1 className={`text-xl font-bold ${TEXT_COLOR_CLASSES[liturgicalDay.color]}`}>
              {assembled.hourNameMn}
            </h1>
            {(() => {
              const { formatted, weekday } = formatDateMn(date)
              return (
                <>
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                    {formatted} {weekday}
                  </p>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    {liturgicalDay.nameMn}
                  </p>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    Дуулалтын {romanNumeral(liturgicalDay.psalterWeek)}
                  </p>
                </>
              )
            })()}
          </div>
        </div>
      </header>

      {/* Prayer content */}
      <article>
        <PrayerRenderer hour={assembled} />
      </article>

      {/* Back to home — prev/next hour navigation 제거됨 (사용자 피드백: 시간대 간
          직접 이동 불필요). task #10 / CACHE_VERSION bump 필요 (링크 스키마 변경). */}
      <nav aria-label="Залбирлын навигаци" className="mt-6 flex items-center justify-center">
        <Link
          href={`/?date=${date}${celebration && celebration !== 'default' ? `&celebration=${encodeURIComponent(celebration)}` : ''}`}
          className="rounded-lg bg-stone-200 px-6 py-2 text-sm font-medium text-stone-700 hover:bg-stone-300 dark:bg-stone-700 dark:text-stone-200 dark:hover:bg-stone-600"
        >
          Буцах
        </Link>
      </nav>

      {/* Footer */}
      <Footer />
    </div>
  )
}
