'use client'

import { useState, useEffect } from 'react'
import type { HourType } from '@/lib/types'
import { getMongoliaHour } from '@/lib/timezone'

export type HourStatus = 'done' | 'current' | 'upcoming'

const HOUR_RANGES: { type: HourType; start: number; end: number }[] = [
  { type: 'lauds', start: 0, end: 12 },
  { type: 'vespers', start: 12, end: 20 },
  { type: 'compline', start: 20, end: 24 },
]

export function getHourStatus(hourType: HourType, now: Date): HourStatus {
  const currentHour = getMongoliaHour(now)

  const currentIdx = HOUR_RANGES.findIndex(
    (r) => currentHour >= r.start && currentHour < r.end
  )
  const targetIdx = HOUR_RANGES.findIndex((r) => r.type === hourType)

  if (targetIdx === -1 || currentIdx === -1) return 'upcoming'

  if (targetIdx < currentIdx) return 'done'
  if (targetIdx === currentIdx) return 'current'
  return 'upcoming'
}

export function useCurrentHour(isToday: boolean): Record<HourType, HourStatus> | null {
  const [statuses, setStatuses] = useState<Record<HourType, HourStatus> | null>(null)

  useEffect(() => {
    if (!isToday) {
      const neutral: Record<string, HourStatus> = {}
      for (const r of HOUR_RANGES) {
        neutral[r.type] = 'upcoming'
      }
      setStatuses(neutral as Record<HourType, HourStatus>)
      return
    }

    function compute() {
      const now = new Date()
      const result: Record<string, HourStatus> = {}
      for (const r of HOUR_RANGES) {
        result[r.type] = getHourStatus(r.type, now)
      }
      setStatuses(result as Record<HourType, HourStatus>)
    }

    compute()
    const interval = setInterval(compute, 60_000)
    return () => clearInterval(interval)
  }, [isToday])

  return statuses
}
