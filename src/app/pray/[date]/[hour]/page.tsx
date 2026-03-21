import Link from 'next/link'
import { assembleHour } from '@/lib/loth-service'
import { PrayerRenderer } from '@/components/prayer-renderer'
import type { HourType, LiturgicalColor } from '@/lib/types'

const VALID_HOURS: HourType[] = [
  'officeOfReadings', 'lauds', 'terce', 'sext', 'none', 'vespers', 'compline',
]

const COLOR_CLASSES: Record<LiturgicalColor, string> = {
  GREEN: 'bg-liturgical-green',
  VIOLET: 'bg-liturgical-violet',
  WHITE: 'bg-liturgical-white border border-stone-300',
  RED: 'bg-liturgical-red',
  ROSE: 'bg-liturgical-rose',
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
        <p className="text-stone-500">Буруу цагийн төрөл: {hourParam}</p>
      </div>
    )
  }

  const hourType = hourParam as HourType
  const assembled = await assembleHour(date, hourType)

  if (!assembled) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-stone-500">Өгөгдөл олдсонгүй: {date}</p>
      </div>
    )
  }

  const { liturgicalDay } = assembled

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Back link */}
      <Link
        href={`/?date=${date}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700"
      >
        ← Бүх цагийн залбирал
      </Link>

      {/* Header */}
      <header className="mb-6 rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div
            className={`h-4 w-4 rounded-full ${COLOR_CLASSES[liturgicalDay.color]}`}
          />
          <div>
            <h1 className="text-xl font-bold text-stone-900">
              {assembled.hourNameMn}
            </h1>
            <p className="text-sm text-stone-500">
              {liturgicalDay.name}
            </p>
            <p className="text-xs text-stone-400">
              {date} · {liturgicalDay.seasonMn}
            </p>
          </div>
        </div>
      </header>

      {/* Prayer content */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <PrayerRenderer hour={assembled} />
      </div>

      {/* Bottom navigation */}
      <div className="mt-6 flex justify-center">
        <Link
          href={`/?date=${date}`}
          className="rounded-lg bg-stone-200 px-6 py-2 text-sm font-medium text-stone-700 hover:bg-stone-300"
        >
          Буцах
        </Link>
      </div>
    </div>
  )
}
