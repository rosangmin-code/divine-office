const TIMEZONE = 'Asia/Ulaanbaatar'

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const hourFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIMEZONE,
  hour: 'numeric',
  hour12: false,
})

export function getMongoliaDateStr(now = new Date()): string {
  // en-CA locale outputs YYYY-MM-DD format
  return dateFormatter.format(now)
}

export function getMongoliaHour(now = new Date()): number {
  const parts = hourFormatter.formatToParts(now)
  return Number(parts.find((p) => p.type === 'hour')!.value)
}
