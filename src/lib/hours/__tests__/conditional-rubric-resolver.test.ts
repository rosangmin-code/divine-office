import { describe, it, expect } from 'vitest'
import {
  applyConditionalRubrics,
  matchesWhen,
  type ConditionalRubricContext,
} from '../conditional-rubric-resolver'
import type { ConditionalRubric, HourPropers } from '../../types'

const baseCtx: ConditionalRubricContext = {
  season: 'LENT',
  dayOfWeek: 'FRI',
  dateStr: '2026-03-13',
  hour: 'lauds',
  isFirstHourOfDay: true,
}

describe('matchesWhen', () => {
  // @fr FR-160-B-1
  it('matches when no fields are present (handled at schema level)', () => {
    expect(matchesWhen({ season: ['LENT'] }, baseCtx)).toBe(true)
  })

  // @fr FR-160-B-1
  it('matches season + dayOfWeek combination (AND)', () => {
    expect(matchesWhen({ season: ['LENT'], dayOfWeek: ['FRI'] }, baseCtx)).toBe(true)
  })

  // @fr FR-160-B-1
  it('returns false when season mismatches', () => {
    expect(matchesWhen({ season: ['EASTER'] }, baseCtx)).toBe(false)
  })

  // @fr FR-160-B-1
  it('returns false when dayOfWeek mismatches', () => {
    expect(matchesWhen({ dayOfWeek: ['SUN'] }, baseCtx)).toBe(false)
  })

  // @fr FR-160-B-1
  it('matches dateRange MM-DD inclusive', () => {
    expect(matchesWhen({ dateRange: { from: '03-01', to: '03-31' } }, baseCtx)).toBe(true)
    expect(matchesWhen({ dateRange: { from: '04-01', to: '04-30' } }, baseCtx)).toBe(false)
  })

  // @fr FR-160-B-1
  it('matches predicate isFirstHourOfDay', () => {
    expect(matchesWhen({ predicate: 'isFirstHourOfDay' }, baseCtx)).toBe(true)
    expect(
      matchesWhen({ predicate: 'isFirstHourOfDay' }, { ...baseCtx, isFirstHourOfDay: false }),
    ).toBe(false)
  })
})

describe('applyConditionalRubrics — noop paths', () => {
  // @fr FR-160-B-1
  it('returns unchanged propers when conditionalRubrics is undefined', () => {
    const propers: HourPropers = { hymn: 'foo' }
    const out = applyConditionalRubrics(propers, baseCtx)
    expect(out.propers).toBe(propers)
    expect(out.rubricsApplied).toEqual([])
  })

  // @fr FR-160-B-1
  it('returns unchanged propers when conditionalRubrics is empty', () => {
    const propers: HourPropers = { hymn: 'foo', conditionalRubrics: [] }
    const out = applyConditionalRubrics(propers, baseCtx)
    expect(out.propers).toBe(propers)
    expect(out.rubricsApplied).toEqual([])
  })

  // @fr FR-160-B-1
  it('does not apply rubric whose `when` mismatches', () => {
    const rubric: ConditionalRubric = {
      rubricId: 'easter-only',
      when: { season: ['EASTER'] },
      action: 'skip',
      appliesTo: { section: 'concludingPrayer' },
      evidencePdf: { page: 100, text: '...' },
    }
    const propers: HourPropers = {
      concludingPrayer: 'unchanged',
      conditionalRubrics: [rubric],
    }
    const out = applyConditionalRubrics(propers, baseCtx)
    expect(out.propers.concludingPrayer).toBe('unchanged')
    expect(out.rubricsApplied).toEqual([])
  })
})

describe('applyConditionalRubrics — actions', () => {
  // @fr FR-160-B-1
  it('skip action removes the section field', () => {
    const rubric: ConditionalRubric = {
      rubricId: 'lent-skip-prayer',
      when: { season: ['LENT'] },
      action: 'skip',
      appliesTo: { section: 'concludingPrayer' },
      evidencePdf: { page: 100, text: '...' },
    }
    const propers: HourPropers = {
      concludingPrayer: 'should be skipped',
      concludingPrayerPage: 200,
      conditionalRubrics: [rubric],
    }
    const out = applyConditionalRubrics(propers, baseCtx)
    expect(out.propers.concludingPrayer).toBeUndefined()
    expect(out.propers.concludingPrayerPage).toBeUndefined()
    expect(out.rubricsApplied.length).toBe(1)
  })

  // @fr FR-160-B-1
  it('substitute action replaces concludingPrayer with target.text', () => {
    const rubric: ConditionalRubric = {
      rubricId: 'sub-prayer',
      when: { season: ['LENT'] },
      action: 'substitute',
      target: { text: 'replacement prayer' },
      appliesTo: { section: 'concludingPrayer' },
      evidencePdf: { page: 100, text: '...' },
    }
    const propers: HourPropers = {
      concludingPrayer: 'original',
      conditionalRubrics: [rubric],
    }
    const out = applyConditionalRubrics(propers, baseCtx)
    expect(out.propers.concludingPrayer).toBe('replacement prayer')
  })

  // @fr FR-160-B-1
  it('substitute drops the original page (would otherwise point to replaced text)', () => {
    const rubric: ConditionalRubric = {
      rubricId: 'sub-with-page',
      when: { season: ['LENT'] },
      action: 'substitute',
      target: { text: 'replacement' },
      appliesTo: { section: 'concludingPrayer' },
      evidencePdf: { page: 100, text: '...' },
    }
    const propers: HourPropers = {
      concludingPrayer: 'original',
      concludingPrayerPage: 200,
      conditionalRubrics: [rubric],
    }
    const out = applyConditionalRubrics(propers, baseCtx)
    expect(out.propers.concludingPrayer).toBe('replacement')
    expect(out.propers.concludingPrayerPage).toBeUndefined()
  })

  // @fr FR-160-B-1
  it('substitute on hymn section drops hymnPage', () => {
    const rubric: ConditionalRubric = {
      rubricId: 'sub-hymn',
      when: { season: ['LENT'] },
      action: 'substitute',
      target: { text: 'new hymn body' },
      appliesTo: { section: 'hymn' },
      evidencePdf: { page: 100, text: '...' },
    }
    const propers: HourPropers = {
      hymn: 'old',
      hymnPage: 901,
      conditionalRubrics: [rubric],
    }
    const out = applyConditionalRubrics(propers, baseCtx)
    expect(out.propers.hymn).toBe('new hymn body')
    expect(out.propers.hymnPage).toBeUndefined()
  })

  // @fr FR-160-B-1
  it('append action concatenates target.text to existing field', () => {
    const rubric: ConditionalRubric = {
      rubricId: 'append-alleluia',
      when: { season: ['EASTER'] },
      action: 'append',
      target: { text: 'Аллэлуяа!' },
      appliesTo: { section: 'concludingPrayer' },
      evidencePdf: { page: 100, text: '...' },
    }
    const propers: HourPropers = {
      concludingPrayer: 'amen',
      conditionalRubrics: [rubric],
    }
    const out = applyConditionalRubrics(propers, { ...baseCtx, season: 'EASTER' })
    expect(out.propers.concludingPrayer).toBe('amen\nАллэлуяа!')
  })

  // @fr FR-160-B-1
  it('prepend action prefixes target.text to existing field', () => {
    const rubric: ConditionalRubric = {
      rubricId: 'prepend-prefix',
      when: { season: ['LENT'] },
      action: 'prepend',
      target: { text: 'Сөгдөн залбираясуу:' },
      appliesTo: { section: 'concludingPrayer' },
      evidencePdf: { page: 100, text: '...' },
    }
    const propers: HourPropers = {
      concludingPrayer: 'body',
      conditionalRubrics: [rubric],
    }
    const out = applyConditionalRubrics(propers, baseCtx)
    expect(out.propers.concludingPrayer).toBe('Сөгдөн залбираясуу:\nbody')
  })

  // @fr FR-160-B-1
  it('does not mutate the input propers (immutable contract)', () => {
    const rubric: ConditionalRubric = {
      rubricId: 'mut-test',
      when: { season: ['LENT'] },
      action: 'skip',
      appliesTo: { section: 'concludingPrayer' },
      evidencePdf: { page: 100, text: '...' },
    }
    const original: HourPropers = {
      concludingPrayer: 'keep me',
      conditionalRubrics: [rubric],
    }
    const out = applyConditionalRubrics(original, baseCtx)
    expect(original.concludingPrayer).toBe('keep me')
    expect(out.propers).not.toBe(original)
  })
})
