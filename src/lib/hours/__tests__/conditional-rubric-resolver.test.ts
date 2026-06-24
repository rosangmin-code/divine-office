import { describe, it, expect } from 'vitest'
import {
  applyConditionalRubrics,
  matchesWhen,
  resolvePsalmodySubstituteRef,
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

describe('applyConditionalRubrics — PR-8 B4 5 신규 sections × 4 actions', () => {
  // @fr FR-160-B-4
  it('11-02 substitute psalmody (sanctoral memorial Sunday): records sectionOverride.psalmody with rubric text', () => {
    const rubric: ConditionalRubric = {
      rubricId: 'sanctoral-memorial-11-02-all-souls-lauds-sunday-substitute',
      when: { dayOfWeek: ['SUN'] },
      action: 'substitute',
      target: {
        text: 'Хэрэв "11 дүгээр сарын 2" гэсэн Дурсахуй Ням гарагт таарвал … Хурлын даатгал залбирлуудыг … Ням гарагаас татаж авна.',
      },
      appliesTo: { section: 'psalmody' },
      evidencePdf: {
        page: 839,
        text: 'бологсдын төлөөх хурлыг үл уншина.',
      },
      liturgicalBasis: 'All Souls Lauds when on Sunday: take Sunday office.',
    }
    const propers: HourPropers = {
      conditionalRubrics: [rubric],
      gospelCanticleAntiphon: 'unchanged',
    }
    const out = applyConditionalRubrics(propers, { ...baseCtx, dayOfWeek: 'SUN' })
    expect(out.rubricsApplied.length).toBe(1)
    expect(out.propers.sectionOverrides?.psalmody?.length).toBe(1)
    const ov = out.propers.sectionOverrides?.psalmody?.[0]
    expect(ov?.rubricId).toBe(rubric.rubricId)
    expect(ov?.mode).toBe('substitute')
    expect(ov?.text).toContain('Ням гарагаас татаж авна')
    // Existing fields untouched
    expect(out.propers.gospelCanticleAntiphon).toBe('unchanged')
  })

  // @fr FR-160-B-4 (GOAL #201 / #201-sub-2 — surface the rubric's PDF source page)
  it('prepend psalmody propagates evidencePdf.page onto the override (х. 580)', () => {
    const rubric: ConditionalRubric = {
      rubricId: 'goal201-psalmody-notice-source-page',
      when: { dateRange: { from: '03-19', to: '03-19' } },
      action: 'prepend',
      target: { text: 'Дуулал ба магтаалыг явагдаж буй долоо хоногоос татаж авна.' },
      appliesTo: { section: 'psalmody' },
      evidencePdf: {
        page: 580,
        line: 20071,
        text: 'Дуулал ба магтаалыг явагдаж буй долоо хоногоос',
      },
    }
    const propers: HourPropers = { conditionalRubrics: [rubric] }
    const out = applyConditionalRubrics(propers, { ...baseCtx, dateStr: '2026-03-19' })
    const ov = out.propers.sectionOverrides?.psalmody?.[0]
    expect(ov?.mode).toBe('prepend')
    expect(ov?.page).toBe(580)
    expect(ov?.text).toContain('явагдаж буй долоо хоног')
  })

  // @fr FR-160-B-4
  it('substitute psalmody when wrong dayOfWeek → noop, no override recorded', () => {
    const rubric: ConditionalRubric = {
      rubricId: 'sun-only',
      when: { dayOfWeek: ['SUN'] },
      action: 'substitute',
      target: { text: '...' },
      appliesTo: { section: 'psalmody' },
      evidencePdf: { page: 1, text: '...' },
    }
    const propers: HourPropers = { conditionalRubrics: [rubric] }
    const out = applyConditionalRubrics(propers, { ...baseCtx, dayOfWeek: 'MON' })
    expect(out.rubricsApplied.length).toBe(0)
    expect(out.propers.sectionOverrides).toBeUndefined()
  })

  // @fr FR-160-B-4
  it('skip psalmody (sanctoral): records mode=skip override', () => {
    const rubric: ConditionalRubric = {
      rubricId: 'skip-psalms',
      when: { season: ['LENT'] },
      action: 'skip',
      appliesTo: { section: 'psalmody' },
      evidencePdf: { page: 1, text: '...' },
    }
    const propers: HourPropers = { conditionalRubrics: [rubric] }
    const out = applyConditionalRubrics(propers, baseCtx)
    expect(out.propers.sectionOverrides?.psalmody?.[0].mode).toBe('skip')
    expect(out.propers.sectionOverrides?.psalmody?.[0].text).toBeUndefined()
  })

  // @fr FR-160-B-4
  it('append psalmody: records mode=append + text', () => {
    const rubric: ConditionalRubric = {
      rubricId: 'append-cant',
      when: { season: ['LENT'] },
      action: 'append',
      target: { text: 'Доксологи нэмж унш.' },
      appliesTo: { section: 'psalmody' },
      evidencePdf: { page: 1, text: '...' },
    }
    const propers: HourPropers = { conditionalRubrics: [rubric] }
    const out = applyConditionalRubrics(propers, baseCtx)
    expect(out.propers.sectionOverrides?.psalmody?.[0].mode).toBe('append')
    expect(out.propers.sectionOverrides?.psalmody?.[0].text).toBe('Доксологи нэмж унш.')
  })

  // @fr FR-160-B-4
  it('prepend invitatory: records under invitatory key', () => {
    const rubric: ConditionalRubric = {
      rubricId: 'inv-prep',
      when: { season: ['LENT'] },
      action: 'prepend',
      target: { text: 'Уриа: …' },
      appliesTo: { section: 'invitatory' },
      evidencePdf: { page: 1, text: '...' },
    }
    const propers: HourPropers = { conditionalRubrics: [rubric] }
    const out = applyConditionalRubrics(propers, baseCtx)
    expect(out.propers.sectionOverrides?.invitatory?.[0].mode).toBe('prepend')
    expect(out.propers.sectionOverrides?.invitatory?.[0].text).toBe('Уриа: …')
    expect(out.propers.sectionOverrides?.psalmody).toBeUndefined()
  })

  // @fr FR-160-B-4
  it('skip dismissal: records dismissal override', () => {
    const rubric: ConditionalRubric = {
      rubricId: 'skip-dismiss',
      when: { season: ['LENT'] },
      action: 'skip',
      appliesTo: { section: 'dismissal' },
      evidencePdf: { page: 1, text: '...' },
    }
    const propers: HourPropers = { conditionalRubrics: [rubric] }
    const out = applyConditionalRubrics(propers, baseCtx)
    expect(out.propers.sectionOverrides?.dismissal?.[0].mode).toBe('skip')
  })

  // @fr FR-160-B-4
  it('substitute openingVersicle with ordinariumKey target: passes through', () => {
    const rubric: ConditionalRubric = {
      rubricId: 'ov-redirect',
      when: { season: ['LENT'] },
      action: 'substitute',
      target: { ordinariumKey: 'common-prayers' },
      appliesTo: { section: 'openingVersicle' },
      evidencePdf: { page: 1, text: '...' },
    }
    const propers: HourPropers = { conditionalRubrics: [rubric] }
    const out = applyConditionalRubrics(propers, baseCtx)
    const ov = out.propers.sectionOverrides?.openingVersicle?.[0]
    expect(ov?.mode).toBe('substitute')
    expect(ov?.ordinariumKey).toBe('common-prayers')
    // No text resolved (ordinariumKey-only target)
    expect(ov?.text).toBeUndefined()
  })

  // @fr FR-160-B-4
  it('intercessions substitute: replaces array AND records override', () => {
    const rubric: ConditionalRubric = {
      rubricId: 'int-sub',
      when: { season: ['LENT'] },
      action: 'substitute',
      target: { text: 'Зөвхөн нэг гуйлт' },
      appliesTo: { section: 'intercessions' },
      evidencePdf: { page: 1, text: '...' },
    }
    const propers: HourPropers = {
      intercessions: ['old1', 'old2', 'old3'],
      intercessionsPage: 222,
      conditionalRubrics: [rubric],
    }
    const out = applyConditionalRubrics(propers, baseCtx)
    expect(out.propers.intercessions).toEqual(['Зөвхөн нэг гуйлт'])
    expect(out.propers.intercessionsPage).toBeUndefined()
    expect(out.propers.sectionOverrides?.intercessions?.[0].mode).toBe('substitute')
  })

  // @fr FR-160-B-4
  it('intercessions append: pushes to array + records override', () => {
    const rubric: ConditionalRubric = {
      rubricId: 'int-app',
      when: { season: ['LENT'] },
      action: 'append',
      target: { text: 'нэмэлт гуйлт' },
      appliesTo: { section: 'intercessions' },
      evidencePdf: { page: 1, text: '...' },
    }
    const propers: HourPropers = {
      intercessions: ['a', 'b'],
      conditionalRubrics: [rubric],
    }
    const out = applyConditionalRubrics(propers, baseCtx)
    expect(out.propers.intercessions).toEqual(['a', 'b', 'нэмэлт гуйлт'])
    expect(out.propers.sectionOverrides?.intercessions?.[0].mode).toBe('append')
  })

  // @fr FR-160-B-4
  it('intercessions prepend: unshifts to array', () => {
    const rubric: ConditionalRubric = {
      rubricId: 'int-pre',
      when: { season: ['LENT'] },
      action: 'prepend',
      target: { text: 'эхний гуйлт' },
      appliesTo: { section: 'intercessions' },
      evidencePdf: { page: 1, text: '...' },
    }
    const propers: HourPropers = {
      intercessions: ['a', 'b'],
      conditionalRubrics: [rubric],
    }
    const out = applyConditionalRubrics(propers, baseCtx)
    expect(out.propers.intercessions).toEqual(['эхний гуйлт', 'a', 'b'])
  })

  // @fr FR-160-B-4
  it('intercessions skip: clears array AND records override', () => {
    const rubric: ConditionalRubric = {
      rubricId: 'int-skip',
      when: { season: ['LENT'] },
      action: 'skip',
      appliesTo: { section: 'intercessions' },
      evidencePdf: { page: 1, text: '...' },
    }
    const propers: HourPropers = {
      intercessions: ['a', 'b'],
      intercessionsPage: 100,
      conditionalRubrics: [rubric],
    }
    const out = applyConditionalRubrics(propers, baseCtx)
    expect(out.propers.intercessions).toBeUndefined()
    expect(out.propers.intercessionsPage).toBeUndefined()
    expect(out.propers.sectionOverrides?.intercessions?.[0].mode).toBe('skip')
  })

  // @fr FR-160-B-4
  it('multiple PR-8 rubrics on same section accumulate in order', () => {
    const r1: ConditionalRubric = {
      rubricId: 'first',
      when: { season: ['LENT'] },
      action: 'prepend',
      target: { text: 'A' },
      appliesTo: { section: 'psalmody' },
      evidencePdf: { page: 1, text: '...' },
    }
    const r2: ConditionalRubric = {
      rubricId: 'second',
      when: { season: ['LENT'] },
      action: 'append',
      target: { text: 'B' },
      appliesTo: { section: 'psalmody' },
      evidencePdf: { page: 1, text: '...' },
    }
    const propers: HourPropers = { conditionalRubrics: [r1, r2] }
    const out = applyConditionalRubrics(propers, baseCtx)
    expect(out.propers.sectionOverrides?.psalmody?.length).toBe(2)
    expect(out.propers.sectionOverrides?.psalmody?.[0].rubricId).toBe('first')
    expect(out.propers.sectionOverrides?.psalmody?.[1].rubricId).toBe('second')
  })

  // @fr FR-160-B-4
  it('regression guard: pre-existing PR-1 sections (concludingPrayer/hymn/shortReading) byte-equal when only PR-8 sections matched', () => {
    const r: ConditionalRubric = {
      rubricId: 'pr8-only',
      when: { season: ['LENT'] },
      action: 'substitute',
      target: { text: 'directive' },
      appliesTo: { section: 'invitatory' },
      evidencePdf: { page: 1, text: '...' },
    }
    const original: HourPropers = {
      concludingPrayer: 'cp',
      concludingPrayerPage: 200,
      hymn: 'h',
      hymnPage: 900,
      shortReading: { ref: 'X', text: 'sr' },
      conditionalRubrics: [r],
    }
    const out = applyConditionalRubrics(original, baseCtx)
    expect(out.propers.concludingPrayer).toBe('cp')
    expect(out.propers.concludingPrayerPage).toBe(200)
    expect(out.propers.hymn).toBe('h')
    expect(out.propers.hymnPage).toBe(900)
    expect(out.propers.shortReading).toEqual({ ref: 'X', text: 'sr' })
    expect(out.propers.sectionOverrides?.invitatory?.length).toBe(1)
  })

  // @fr FR-160-B-4
  it('regression guard: empty conditionalRubrics → input unchanged identity', () => {
    const propers: HourPropers = {
      hymn: 'foo',
      conditionalRubrics: [],
    }
    const out = applyConditionalRubrics(propers, baseCtx)
    expect(out.propers).toBe(propers)
    expect(out.propers.sectionOverrides).toBeUndefined()
  })

  // @fr FR-160-B-4
  it('dispatch matrix: psalmody substitute fires only on EASTER + isFirstHourOfDay', () => {
    const rubric: ConditionalRubric = {
      rubricId: 'easter-sunday-lauds',
      when: { season: ['EASTER'], predicate: 'isFirstHourOfDay' },
      action: 'substitute',
      target: { text: 'redirect text' },
      appliesTo: { section: 'psalmody' },
      evidencePdf: { page: 690, text: '...' },
    }
    const propers: HourPropers = { conditionalRubrics: [rubric] }
    // matches: EASTER + lauds
    const easterLauds = applyConditionalRubrics(propers, {
      ...baseCtx,
      season: 'EASTER',
      hour: 'lauds',
      isFirstHourOfDay: true,
    })
    expect(easterLauds.rubricsApplied.length).toBe(1)
    // misses: EASTER + vespers (not first hour)
    const easterVespers = applyConditionalRubrics(propers, {
      ...baseCtx,
      season: 'EASTER',
      hour: 'vespers',
      isFirstHourOfDay: false,
    })
    expect(easterVespers.rubricsApplied.length).toBe(0)
    // misses: LENT + lauds (wrong season)
    const lentLauds = applyConditionalRubrics(propers, {
      ...baseCtx,
      season: 'LENT',
      hour: 'lauds',
      isFirstHourOfDay: true,
    })
    expect(lentLauds.rubricsApplied.length).toBe(0)
  })

  // @fr FR-160-B-4
  it('SectionOverride propagates appliesTo.index for item-level targeting (R1 fix)', () => {
    const rubric: ConditionalRubric = {
      rubricId: 'psalm2-only',
      when: { season: ['LENT'] },
      action: 'skip',
      appliesTo: { section: 'psalmody', index: 1 },
      evidencePdf: { page: 1, text: '...' },
    }
    const propers: HourPropers = { conditionalRubrics: [rubric] }
    const out = applyConditionalRubrics(propers, baseCtx)
    expect(out.propers.sectionOverrides?.psalmody?.[0].index).toBe(1)
  })

  // @fr FR-160-B-4
  it('absent appliesTo.index → SectionOverride.index undefined', () => {
    const rubric: ConditionalRubric = {
      rubricId: 'whole-section',
      when: { season: ['LENT'] },
      action: 'skip',
      appliesTo: { section: 'psalmody' },
      evidencePdf: { page: 1, text: '...' },
    }
    const propers: HourPropers = { conditionalRubrics: [rubric] }
    const out = applyConditionalRubrics(propers, baseCtx)
    expect(out.propers.sectionOverrides?.psalmody?.[0].index).toBeUndefined()
  })

  // @fr FR-160-B-4
  it('textless prepend/append does NOT add to rubricsApplied (R1 fix — no overstating)', () => {
    const textlessAppend: ConditionalRubric = {
      rubricId: 'textless-app',
      when: { season: ['LENT'] },
      action: 'append',
      target: { ref: 'Psalm 1' }, // ref-only, no text
      appliesTo: { section: 'concludingPrayer' },
      evidencePdf: { page: 1, text: '...' },
    }
    const textfulSkip: ConditionalRubric = {
      rubricId: 'real-skip',
      when: { season: ['LENT'] },
      action: 'skip',
      appliesTo: { section: 'concludingPrayer' },
      evidencePdf: { page: 1, text: '...' },
    }
    const propers: HourPropers = {
      concludingPrayer: 'cp',
      conditionalRubrics: [textlessAppend, textfulSkip],
    }
    const out = applyConditionalRubrics(propers, baseCtx)
    // Only the skip rubric should be in rubricsApplied (not the textless append)
    expect(out.rubricsApplied.length).toBe(1)
    expect(out.rubricsApplied[0].rubricId).toBe('real-skip')
    // concludingPrayer is removed by skip
    expect(out.propers.concludingPrayer).toBeUndefined()
  })

  // @fr FR-160-B-4
  it('immutable contract: original.sectionOverrides absent stays absent after applying', () => {
    const r: ConditionalRubric = {
      rubricId: 'imm',
      when: { season: ['LENT'] },
      action: 'substitute',
      target: { text: 'x' },
      appliesTo: { section: 'psalmody' },
      evidencePdf: { page: 1, text: '...' },
    }
    const original: HourPropers = { conditionalRubrics: [r] }
    const out = applyConditionalRubrics(original, baseCtx)
    expect(original.sectionOverrides).toBeUndefined()
    expect(out.propers.sectionOverrides?.psalmody?.length).toBe(1)
    expect(out.propers).not.toBe(original)
  })
})

describe('resolvePsalmodySubstituteRef (GOAL #13 / FR-160-B-6)', () => {
  const easterCtx: ConditionalRubricContext = {
    season: 'EASTER',
    dayOfWeek: 'SUN',
    dateStr: '2026-05-24',
    hour: 'lauds',
    isFirstHourOfDay: true,
  }

  function psalmodySubstitute(
    overrides: Partial<ConditionalRubric> = {},
  ): ConditionalRubric {
    return {
      rubricId: 'pentecost-sub',
      when: { season: ['EASTER'], predicate: 'isFirstHourOfDay' },
      action: 'substitute',
      target: {
        text: 'Week 1 Sunday p.58.',
        psalterRef: { week: 1, day: 'SUN', hour: 'lauds' },
      },
      appliesTo: { section: 'psalmody' },
      evidencePdf: { page: 58, text: '...' },
      ...overrides,
    }
  }

  // @fr FR-160-B-6
  it('returns the psalterRef of a matching psalmody substitute', () => {
    const propers: HourPropers = { conditionalRubrics: [psalmodySubstitute()] }
    expect(resolvePsalmodySubstituteRef([propers], easterCtx)).toEqual({
      week: 1,
      day: 'SUN',
      hour: 'lauds',
    })
  })

  // @fr FR-160-B-6
  it('returns null when the when-clause does not match the context', () => {
    const propers: HourPropers = { conditionalRubrics: [psalmodySubstitute()] }
    // isFirstHourOfDay predicate fails for vespers context
    const vespersCtx = { ...easterCtx, hour: 'vespers' as const, isFirstHourOfDay: false }
    expect(resolvePsalmodySubstituteRef([propers], vespersCtx)).toBeNull()
  })

  // @fr FR-160-B-6
  it('returns null for a substitute that carries no psalterRef (text-only)', () => {
    const propers: HourPropers = {
      conditionalRubrics: [
        psalmodySubstitute({ target: { text: 'current running week' } }),
      ],
    }
    expect(resolvePsalmodySubstituteRef([propers], easterCtx)).toBeNull()
  })

  // @fr FR-160-B-6
  it('ignores non-substitute actions and non-psalmody sections', () => {
    const skipPsalmody: HourPropers = {
      conditionalRubrics: [
        psalmodySubstitute({ action: 'skip', target: undefined }),
      ],
    }
    expect(resolvePsalmodySubstituteRef([skipPsalmody], easterCtx)).toBeNull()

    const substituteHymn: HourPropers = {
      conditionalRubrics: [psalmodySubstitute({ appliesTo: { section: 'hymn' } })],
    }
    expect(resolvePsalmodySubstituteRef([substituteHymn], easterCtx)).toBeNull()
  })

  // @fr FR-160-B-6
  it('scans multiple propers sources in order (season then sanctoral)', () => {
    const seasonNoMatch: HourPropers = { conditionalRubrics: [] }
    const sanctoralMatch: HourPropers = {
      conditionalRubrics: [psalmodySubstitute()],
    }
    expect(
      resolvePsalmodySubstituteRef([seasonNoMatch, sanctoralMatch, undefined], easterCtx),
    ).toEqual({ week: 1, day: 'SUN', hour: 'lauds' })
  })

  // @fr FR-160-B-6
  it('returns null for empty / undefined sources', () => {
    expect(resolvePsalmodySubstituteRef([undefined, {}], easterCtx)).toBeNull()
    expect(resolvePsalmodySubstituteRef([], easterCtx)).toBeNull()
  })

  // @fr FR-160-B-6 — applyConditionalRubrics marks the recorded psalmody
  // override `bodyInlined: true` ONLY when the substitute carried a
  // psalterRef (Type-A). Without it (A'/All-Souls), the flag is absent so
  // the UI keeps the legacy note-only surface (no regression).
  it('applyConditionalRubrics sets bodyInlined on a psalterRef substitute override', () => {
    const propers: HourPropers = { conditionalRubrics: [psalmodySubstitute()] }
    const out = applyConditionalRubrics(propers, easterCtx)
    const override = out.propers.sectionOverrides?.psalmody?.[0]
    expect(override?.mode).toBe('substitute')
    expect(override?.bodyInlined).toBe(true)
  })

  // @fr FR-160-B-6
  it('applyConditionalRubrics omits bodyInlined for a substitute WITHOUT psalterRef', () => {
    const propers: HourPropers = {
      conditionalRubrics: [
        psalmodySubstitute({ target: { text: 'current running week' } }),
      ],
    }
    const out = applyConditionalRubrics(propers, easterCtx)
    const override = out.propers.sectionOverrides?.psalmody?.[0]
    expect(override?.mode).toBe('substitute')
    expect(override?.bodyInlined).toBeUndefined()
  })
})

// GOAL #27 (#27-sub-2 / FR-160-B-7): All Souls' (11-02) Sunday-collision
// dynamic psalter borrow. The substitute carries `psalterRef.week:'current'`
// (resolved to the day's own psalterWeek by loth-service step 6.5). The
// borrow + bodyInlined are gated to the day's OWN hour — suppressed on an
// eve / First-Vespers promotion (`isEveOfFollowingDay`) so a Saturday-eve
// 11-02 keeps its legacy note-only surface.
describe("All Souls dynamic 'current' psalterRef (GOAL #27 / FR-160-B-7)", () => {
  // The actual-Sunday context: civil day IS Sunday, NOT an eve promotion.
  const allSoulsSundayCtx: ConditionalRubricContext = {
    season: 'ORDINARY_TIME',
    dayOfWeek: 'SUN',
    dateStr: '2025-11-02',
    hour: 'lauds',
    isFirstHourOfDay: true,
    isEveOfFollowingDay: false,
  }

  // The Saturday-eve context: matches `when.dayOfWeek:['SUN']` ONLY via the
  // First-Vespers promotion (civil day is SAT) → isEveOfFollowingDay true.
  const allSoulsEveCtx: ConditionalRubricContext = {
    ...allSoulsSundayCtx,
    hour: 'vespers',
    isFirstHourOfDay: false,
    dateStr: '2024-11-02',
    isEveOfFollowingDay: true,
  }

  function allSoulsSubstitute(
    hour: 'lauds' | 'vespers' = 'lauds',
    overrides: Partial<ConditionalRubric> = {},
  ): ConditionalRubric {
    return {
      rubricId: `all-souls-${hour}`,
      when: { dayOfWeek: ['SUN'] },
      action: 'substitute',
      target: {
        text: 'Take the prayers from the matching Sunday of the Four Weeks.',
        psalterRef: { week: 'current', day: 'SUN', hour },
      },
      appliesTo: { section: 'psalmody' },
      evidencePdf: { page: 839, text: '...' },
      ...overrides,
    }
  }

  // @fr FR-160-B-7
  it("resolves the 'current' psalterRef on the day's own hour (actual Sunday)", () => {
    const propers: HourPropers = { conditionalRubrics: [allSoulsSubstitute('lauds')] }
    expect(resolvePsalmodySubstituteRef([propers], allSoulsSundayCtx)).toEqual({
      week: 'current',
      day: 'SUN',
      hour: 'lauds',
    })
  })

  // @fr FR-160-B-7
  it("suppresses the 'current' borrow on an eve / First-Vespers promotion", () => {
    const propers: HourPropers = { conditionalRubrics: [allSoulsSubstitute('vespers')] }
    expect(resolvePsalmodySubstituteRef([propers], allSoulsEveCtx)).toBeNull()
  })

  // @fr FR-160-B-7 — a FIXED psalterRef is NOT eve-gated (it still resolves
  // on an eve, preserving the Easter/Pentecost First-Vespers behavior).
  it("does NOT suppress a fixed-week psalterRef on an eve", () => {
    const fixed: HourPropers = {
      conditionalRubrics: [
        allSoulsSubstitute('vespers', {
          target: { text: 'Week 1.', psalterRef: { week: 1, day: 'SUN', hour: 'vespers' } },
        }),
      ],
    }
    expect(resolvePsalmodySubstituteRef([fixed], allSoulsEveCtx)).toEqual({
      week: 1,
      day: 'SUN',
      hour: 'vespers',
    })
  })

  // @fr FR-160-B-7
  it("marks bodyInlined for a 'current' substitute on the day's own hour", () => {
    const propers: HourPropers = { conditionalRubrics: [allSoulsSubstitute('lauds')] }
    const out = applyConditionalRubrics(propers, allSoulsSundayCtx)
    const override = out.propers.sectionOverrides?.psalmody?.[0]
    expect(override?.mode).toBe('substitute')
    expect(override?.bodyInlined).toBe(true)
  })

  // @fr FR-160-B-7 — the bodyInlined gate MUST stay consistent with the
  // step-6.5 injection gate: omitted on the eve so the UI keeps note-only.
  it("omits bodyInlined for a 'current' substitute on an eve", () => {
    const propers: HourPropers = { conditionalRubrics: [allSoulsSubstitute('vespers')] }
    const out = applyConditionalRubrics(propers, allSoulsEveCtx)
    const override = out.propers.sectionOverrides?.psalmody?.[0]
    expect(override?.mode).toBe('substitute')
    expect(override?.bodyInlined).toBeUndefined()
  })
})
