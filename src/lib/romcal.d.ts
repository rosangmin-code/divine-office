declare module 'romcal' {
  interface CalendarOptions {
    year?: number
    locale?: string
    country?: string
  }

  interface RomcalResult {
    moment: string
    type: string
    name: string
    data: {
      season: { key: string; value: string }
      meta: {
        titles: string[]
        psalterWeek: { key: number; value: string }
        liturgicalColor: { key: string; value: string }
        cycle: { key: number; value: string }
      }
      calendar: { weeks: number; week: number; day: number }
      prioritized: boolean
    }
    key: string
    source: string
  }

  const romcal: {
    calendarFor(options?: CalendarOptions): RomcalResult[]
  }

  export default romcal
}
