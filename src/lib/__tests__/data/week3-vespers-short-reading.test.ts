import { describe, expect, it } from 'vitest'
import week3 from '../../../data/loth/psalter/week-3.json'
import sunVespersRich from '../../../data/loth/prayers/commons/psalter/w3-SUN-vespers.rich.json'
import satVespersRich from '../../../data/loth/prayers/commons/psalter/w3-SAT-vespers.rich.json'

const EXPECTED_ENDING = 'хүндэтгэлд хүрэх юм.'

describe('week 3 vespers short readings', () => {
  it('keeps 1 Peter 1:3-7 complete for Sunday and Saturday vespers', () => {
    const sunReading = week3.days.SUN.vespers.shortReading
    const satReading = week3.days.SAT.vespers.shortReading

    expect(sunReading.ref).toBe('1 Петр 1:3-7')
    expect(satReading.ref).toBe('1 Петр 1:3-7')
    expect(sunReading.text.endsWith(EXPECTED_ENDING)).toBe(true)
    expect(satReading.text.endsWith(EXPECTED_ENDING)).toBe(true)
  })

  it('keeps rich mirrors aligned with the completed short reading', () => {
    const sunText = sunVespersRich.shortReadingRich.blocks[0].spans[0].text
    const satText = satVespersRich.shortReadingRich.blocks[0].spans[0].text

    expect(sunText).toBe(week3.days.SUN.vespers.shortReading.text)
    expect(satText).toBe(week3.days.SAT.vespers.shortReading.text)
    expect(sunText.endsWith(EXPECTED_ENDING)).toBe(true)
    expect(satText.endsWith(EXPECTED_ENDING)).toBe(true)
  })
})
