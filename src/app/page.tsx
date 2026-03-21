import Link from 'next/link'
import { getHoursSummary } from '@/lib/loth-service'
import type { HourType, LiturgicalColor } from '@/lib/types'

const HOUR_ICONS: Record<HourType, string> = {
  officeOfReadings: '📖',
  lauds: '🌅',
  terce: '🕘',
  sext: '☀️',
  none: '🕒',
  vespers: '🌇',
  compline: '🌙',
}

const HOUR_TIME_HINTS: Record<HourType, string> = {
  officeOfReadings: '',
  lauds: '~06:00',
  terce: '~09:00',
  sext: '~12:00',
  none: '~15:00',
  vespers: '~18:00',
  compline: '~21:00',
}

const COLOR_CLASSES: Record<LiturgicalColor, string> = {
  GREEN: 'bg-liturgical-green',
  VIOLET: 'bg-liturgical-violet',
  WHITE: 'bg-liturgical-white border border-stone-300',
  RED: 'bg-liturgical-red',
  ROSE: 'bg-liturgical-rose',
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const params = await searchParams
  const now = new Date()
  const dateStr = params.date ?? now.toISOString().slice(0, 10)
  const summary = getHoursSummary(dateStr)

  if (!summary) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-stone-500">Өгөгдөл олдсонгүй: {dateStr}</p>
      </div>
    )
  }

  const { liturgicalDay, hours } = summary

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <header className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-stone-900">
          Цагийн Залбирал
        </h1>
        <p className="text-sm text-stone-500">Liturgy of the Hours</p>
      </header>

      {/* Date navigation */}
      <div className="mb-6 flex items-center justify-center gap-4">
        <Link
          href={`/?date=${getPrevDate(dateStr)}`}
          className="rounded-lg px-3 py-2 text-stone-600 hover:bg-stone-200"
        >
          ←
        </Link>
        <div className="text-center">
          <input
            type="date"
            defaultValue={dateStr}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-center text-stone-800"
          />
        </div>
        <Link
          href={`/?date=${getNextDate(dateStr)}`}
          className="rounded-lg px-3 py-2 text-stone-600 hover:bg-stone-200"
        >
          →
        </Link>
      </div>

      {/* Liturgical day info */}
      <div className="mb-8 rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div
            className={`h-4 w-4 rounded-full ${COLOR_CLASSES[liturgicalDay.color]}`}
          />
          <div>
            <h2 className="text-lg font-semibold text-stone-800">
              {liturgicalDay.name}
            </h2>
            <p className="text-sm text-stone-500">
              {liturgicalDay.seasonMn} · {liturgicalDay.colorMn} ·{' '}
              {romanNumeral(liturgicalDay.psalterWeek)} долоо хоног
            </p>
          </div>
        </div>
      </div>

      {/* Hour cards */}
      <div className="space-y-3">
        {hours.map((hour) => (
          <Link
            key={hour.type}
            href={`/pray/${dateStr}/${hour.type}`}
            className="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <span className="text-2xl">{HOUR_ICONS[hour.type]}</span>
            <div className="flex-1">
              <h3 className="font-semibold text-stone-800">{hour.nameMn}</h3>
              <p className="text-xs text-stone-400">{hour.type}</p>
            </div>
            {HOUR_TIME_HINTS[hour.type] && (
              <span className="text-sm text-stone-400">
                {HOUR_TIME_HINTS[hour.type]}
              </span>
            )}
            <span className="text-stone-300">→</span>
          </Link>
        ))}
      </div>
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
