import { describe, it, expect } from 'vitest'
import { getMongoliaDateStr, getMongoliaHour } from '../timezone'

describe('getMongoliaDateStr', () => {
  it('returns Mongolia date when UTC is still previous day', () => {
    // UTC 2026-04-10 20:00 = Mongolia 2026-04-11 04:00 (UTC+8)
    const utcDate = new Date('2026-04-10T20:00:00Z')
    expect(getMongoliaDateStr(utcDate)).toBe('2026-04-11')
  })

  it('returns same date when UTC and Mongolia agree', () => {
    // UTC 2026-04-10 10:00 = Mongolia 2026-04-10 18:00
    const utcDate = new Date('2026-04-10T10:00:00Z')
    expect(getMongoliaDateStr(utcDate)).toBe('2026-04-10')
  })

  it('handles year boundary', () => {
    // UTC 2025-12-31 18:00 = Mongolia 2026-01-01 02:00
    const utcDate = new Date('2025-12-31T18:00:00Z')
    expect(getMongoliaDateStr(utcDate)).toBe('2026-01-01')
  })
})

describe('getMongoliaHour', () => {
  it('returns Mongolia hour (UTC+8)', () => {
    // UTC 04:00 = Mongolia 12:00
    const utcDate = new Date('2026-04-10T04:00:00Z')
    expect(getMongoliaHour(utcDate)).toBe(12)
  })

  it('wraps past midnight', () => {
    // UTC 20:00 = Mongolia 04:00 (next day)
    const utcDate = new Date('2026-04-10T20:00:00Z')
    expect(getMongoliaHour(utcDate)).toBe(4)
  })
})
