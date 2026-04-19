import type { DayOfWeek } from '../types'

export function dateToDayOfWeek(dateStr: string): DayOfWeek {
  const date = new Date(dateStr + 'T00:00:00Z')
  const dayIndex = date.getUTCDay()
  const days: DayOfWeek[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  return days[dayIndex]
}
