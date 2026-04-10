import Link from 'next/link'
import { assembleHour } from '@/lib/loth-service'
import { PrayerRenderer } from '@/components/prayer-renderer'
import { ThemeToggle } from '@/components/theme-toggle'
import { Footer } from '@/components/footer'
import { HourIcon } from '@/components/hour-icon'
import type { HourType } from '@/lib/types'
import { BORDER_COLOR_CLASSES } from '@/lib/liturgical-colors'

const VALID_HOURS: HourType[] = [
  // officeOfReadings, terce, sext, none: 데이터 미완성으로 임시 비활성화
  'lauds', 'vespers', 'compline',
]

const HOUR_NAMES_MN: Record<HourType, string> = {
  officeOfReadings: 'Уншлагын цаг',
  lauds: 'Өглөөний залбирал',
  terce: 'Гуравдугаар цаг',
  sext: 'Зургаадугаар цаг',
  none: 'Есдүгээр цаг',
  vespers: 'Оройн залбирал',
  compline: 'Нойрны өмнөх залбирал',
}

export default async function PrayPage({
  params,
}: {
  params: Promise<{ date: string; hour: string }>
}) {
  const { date, hour: hourParam } = await params

  if (!VALID_HOURS.includes(hourParam as HourType)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-stone-500 dark:text-stone-400">Буруу цагийн төрөл: {hourParam}</p>
      </div>
    )
  }

  const hourType = hourParam as HourType
  const assembled = await assembleHour(date, hourType)

  if (!assembled) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-stone-500 dark:text-stone-400">Өгөгдөл олдсонгүй: {date}</p>
      </div>
    )
  }

  const { liturgicalDay } = assembled

  // 이전/다음 기도시간 네비게이션
  const currentIdx = VALID_HOURS.indexOf(hourType)
  const prevHour = currentIdx > 0 ? VALID_HOURS[currentIdx - 1] : null
  const nextHour = currentIdx < VALID_HOURS.length - 1 ? VALID_HOURS[currentIdx + 1] : null

  return (
    <div className="mx-auto max-w-2xl lg:max-w-3xl px-4 md:px-6 py-6">
      {/* Back link + ThemeToggle */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/?date=${date}`}
          aria-label="Бүх цагийн залбирлууд руу буцах"
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
        >
          ← Бүх цагийн залбирал
        </Link>
        <ThemeToggle />
      </div>

      {/* Header */}
      <header className={`mb-6 rounded-xl border-l-4 ${BORDER_COLOR_CLASSES[liturgicalDay.color]} bg-white p-6 shadow-sm dark:bg-neutral-900 dark:shadow-none dark:ring-1 dark:ring-stone-800`}>
        <div className="flex items-center gap-3">
          <HourIcon hour={hourType} className="h-5 w-5 text-stone-400 dark:text-stone-500" />
          <div>
            <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">
              {assembled.hourNameMn}
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {liturgicalDay.name}
            </p>
            <p className="text-xs text-stone-400 dark:text-stone-500">
              {date} · {liturgicalDay.seasonMn}
            </p>
          </div>
        </div>
      </header>

      {/* Prayer content */}
      <article className="rounded-xl bg-white p-6 md:p-8 ring-1 ring-stone-200 dark:bg-neutral-900 dark:ring-stone-800">
        <PrayerRenderer hour={assembled} />
      </article>

      {/* Bottom navigation */}
      <nav aria-label="Залбирлын навигаци" className="mt-6 flex items-center justify-between gap-4">
        {prevHour ? (
          <Link
            href={`/pray/${date}/${prevHour}`}
            className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm text-stone-600 hover:bg-stone-200 dark:text-stone-400 dark:hover:bg-stone-700"
          >
            <span>←</span>
            <span className="hidden sm:inline">{HOUR_NAMES_MN[prevHour]}</span>
          </Link>
        ) : <div />}

        <Link
          href={`/?date=${date}`}
          className="rounded-lg bg-stone-200 px-6 py-2 text-sm font-medium text-stone-700 hover:bg-stone-300 dark:bg-stone-700 dark:text-stone-200 dark:hover:bg-stone-600"
        >
          Буцах
        </Link>

        {nextHour ? (
          <Link
            href={`/pray/${date}/${nextHour}`}
            className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm text-stone-600 hover:bg-stone-200 dark:text-stone-400 dark:hover:bg-stone-700"
          >
            <span className="hidden sm:inline">{HOUR_NAMES_MN[nextHour]}</span>
            <span>→</span>
          </Link>
        ) : <div />}
      </nav>

      {/* Footer */}
      <Footer />
    </div>
  )
}
