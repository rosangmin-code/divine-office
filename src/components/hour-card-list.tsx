import Link from 'next/link'
import { HourIcon } from './hour-icon'
import type { HourType } from '@/lib/types'

interface HourCardListProps {
  hours: { type: HourType; nameMn: string }[]
  dateStr: string
}

export function HourCardList({ hours, dateStr }: HourCardListProps) {
  return (
    <section aria-label="Цагийн залбирлууд" className="space-y-4">
      {hours.map((hour) => (
        <HourCard key={hour.type} hour={hour} dateStr={dateStr} />
      ))}
    </section>
  )
}

function HourCard({
  hour,
  dateStr,
}: {
  hour: { type: HourType; nameMn: string }
  dateStr: string
}) {
  return (
    <Link
      href={`/pray/${dateStr}/${hour.type}`}
      className="group flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] dark:bg-neutral-900 dark:shadow-none dark:ring-1 dark:ring-stone-800"
    >
      {/* Icon */}
      <HourIcon
        hour={hour.type}
        className="h-7 w-7 shrink-0 text-stone-500 dark:text-stone-400"
      />

      {/* Content */}
      <div className="flex-1">
        <h3 className="font-semibold text-stone-800 dark:text-stone-200">
          {hour.nameMn}
        </h3>
        <p className="text-[10px] uppercase tracking-wider text-stone-400 opacity-50 dark:text-stone-500">
          {hour.type}
        </p>
      </div>

      {/* Arrow */}
      <span className="text-stone-300 dark:text-stone-600">→</span>
    </Link>
  )
}
