'use client'

import Link from 'next/link'
import { useCurrentHour, type HourStatus } from '@/hooks/use-current-hour'
import { HourIcon } from './hour-icon'
import type { HourType } from '@/lib/types'

const HOUR_TIME_HINTS: Partial<Record<HourType, string>> = {
  lauds: '~06:00',
  vespers: '~18:00',
  compline: '~21:00',
}

interface HourCardListProps {
  hours: { type: HourType; nameMn: string }[]
  dateStr: string
  isToday: boolean
}

export function HourCardList({ hours, dateStr, isToday }: HourCardListProps) {
  const statuses = useCurrentHour(isToday)

  return (
    <section aria-label="Цагийн залбирлууд" className="space-y-4">
      {hours.map((hour) => {
        const status = statuses?.[hour.type] ?? 'upcoming'
        return (
          <HourCard
            key={hour.type}
            hour={hour}
            dateStr={dateStr}
            status={status}
          />
        )
      })}
    </section>
  )
}

function HourCard({
  hour,
  dateStr,
  status,
}: {
  hour: { type: HourType; nameMn: string }
  dateStr: string
  status: HourStatus
}) {
  const isCurrent = status === 'current'
  const isDone = status === 'done'

  return (
    <Link
      href={`/pray/${dateStr}/${hour.type}`}
      className={`
        group relative flex items-center gap-4 rounded-xl transition-all duration-200
        ${isCurrent
          ? 'bg-white p-6 shadow-md ring-2 ring-stone-300 hover:shadow-lg dark:bg-neutral-900 dark:ring-stone-600'
          : 'bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] dark:bg-neutral-900 dark:shadow-none dark:ring-1 dark:ring-stone-800'
        }
        ${isDone ? 'opacity-60' : ''}
      `}
    >
      {/* Left accent bar for current */}
      {isCurrent && (
        <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-stone-400 dark:bg-stone-500" />
      )}

      {/* Icon */}
      <HourIcon
        hour={hour.type}
        className={`h-7 w-7 shrink-0 ${isCurrent ? 'text-stone-700 dark:text-stone-300' : 'text-stone-500 dark:text-stone-400'}`}
      />

      {/* Content */}
      <div className="flex-1">
        <h3 className={`font-semibold ${isCurrent ? 'text-stone-900 dark:text-stone-100' : 'text-stone-800 dark:text-stone-200'}`}>
          {hour.nameMn}
        </h3>
        <p className="text-[10px] uppercase tracking-wider text-stone-400 opacity-50 dark:text-stone-500">
          {hour.type}
        </p>
      </div>

      {/* Right side: time hint + status */}
      <div className="flex flex-col items-end gap-1">
        {HOUR_TIME_HINTS[hour.type] && (
          <span className="text-sm text-stone-400 dark:text-stone-500">
            {HOUR_TIME_HINTS[hour.type]}
          </span>
        )}
        {isCurrent && (
          <span className="rounded-full bg-stone-800 px-3 py-1 text-[11px] font-medium text-white dark:bg-stone-200 dark:text-stone-900">
            ОДОО ЗАЛБИРАХ
          </span>
        )}
        {isDone && (
          <svg className="h-4 w-4 text-stone-400 dark:text-stone-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>

      {/* Arrow */}
      {!isCurrent && !isDone && (
        <span className="text-stone-300 dark:text-stone-600">→</span>
      )}
    </Link>
  )
}
