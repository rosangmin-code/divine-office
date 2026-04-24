import { describe, it, expect } from 'vitest'
import week1 from '../../../data/loth/psalter/week-1.json'
import week2 from '../../../data/loth/psalter/week-2.json'
import week3 from '../../../data/loth/psalter/week-3.json'
import week4 from '../../../data/loth/psalter/week-4.json'

type PsalterFile = {
  days: Record<
    string,
    Record<
      string,
      {
        psalms: Array<{
          antiphon_key: string
          seasonal_antiphons?: {
            lentSunday?: Record<string, string>
            lentPassionSunday?: string
            [k: string]: unknown
          }
        }>
      }
    >
  >
}

function findEntry(file: PsalterFile, day: string, hour: string, key: string) {
  const psalms = file.days?.[day]?.[hour]?.psalms ?? []
  return psalms.find((p) => p.antiphon_key === key)
}

// @fr FR-155 Phase 3
describe('psalter seasonal_antiphons — post-body variants (task #16)', () => {
  it('w2-sun-vesp-cant has lentPassionSunday injected (PDF line 6411, post-body)', () => {
    const entry = findEntry(week2 as PsalterFile, 'SUN', 'vespers', 'w2-sun-vesp-cant')
    expect(entry).toBeDefined()
    expect(typeof entry?.seasonal_antiphons?.lentPassionSunday).toBe('string')
    expect(entry?.seasonal_antiphons?.lentPassionSunday).toMatch(/Биднийг гэм нүгэлд/)
  })

  it('Sunday Vespers canticle entries have lentSunday populated (4 weeks)', () => {
    // Each *-sun-vesp-cant entry's Lenten Sunday antiphon is printed AFTER
    // the canticle body in the PDF. Prior to task #16 the extractor walker
    // stopped at the body heading, silently dropping these 4+ rubrics.
    const cases: Array<{ file: PsalterFile; week: string }> = [
      { file: week1 as PsalterFile, week: 'w1' },
      { file: week2 as PsalterFile, week: 'w2' },
      { file: week3 as PsalterFile, week: 'w3' },
      { file: week4 as PsalterFile, week: 'w4' },
    ]
    for (const { file, week } of cases) {
      const entry = findEntry(file, 'SUN', 'vespers', `${week}-sun-vesp-cant`)
      expect(entry, `${week}-sun-vesp-cant should exist`).toBeDefined()
      expect(
        entry?.seasonal_antiphons?.lentSunday,
        `${week}-sun-vesp-cant.lentSunday should be populated`,
      ).toBeTypeOf('object')
      const keys = Object.keys(entry?.seasonal_antiphons?.lentSunday ?? {})
      expect(keys.length, `${week}-sun-vesp-cant.lentSunday must have ≥1 entry`).toBeGreaterThanOrEqual(
        1,
      )
    }
  })

  it('w2-sun-vesp-ps1/ps2 lentSunday[2] no longer carries Passion Sunday wrap label', () => {
    // Pre-task-#16 these carried a trailing " Ням гараг Дөчин хоногийн цаг
    // улирал, Эзэний" fragment because the walker ran the Passion Sunday
    // wrap into the preceding variant. The new joiner (Эзэний → тарчлалтын)
    // now folds that wrap into the lentPassionSunday MARKER.
    for (const key of ['w2-sun-vesp-ps1', 'w2-sun-vesp-ps2']) {
      const entry = findEntry(week2 as PsalterFile, 'SUN', 'vespers', key)
      const v = entry?.seasonal_antiphons?.lentSunday?.['2']
      expect(v, `${key}.lentSunday[2] should exist`).toBeTypeOf('string')
      expect(v, `${key}.lentSunday[2] must not leak wrap label`).not.toMatch(
        /Ням гараг Дөчин хоногийн/,
      )
    }
  })
})
