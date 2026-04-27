import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  PsalterWeekSchema,
  SeasonPropersFileSchema,
  SanctoralFileSchema,
  HymnsFileSchema,
  HymnsIndexFileSchema,
  ConditionalRubricSchema,
  PageRedirectSchema,
  OrdinariumKeyCatalogSchema,
  safeParse,
} from '../schemas'

function load(relPath: string): unknown {
  const full = path.join(process.cwd(), relPath)
  return JSON.parse(fs.readFileSync(full, 'utf-8'))
}

describe('schema acceptance against live data files', () => {
  it('accepts every psalter week file', () => {
    for (const week of [1, 2, 3, 4]) {
      const data = load(`src/data/loth/psalter/week-${week}.json`)
      const parsed = PsalterWeekSchema.safeParse(data)
      if (!parsed.success) {
        console.error(`week-${week}.json issues:`, parsed.error.issues.slice(0, 3))
      }
      expect(parsed.success).toBe(true)
    }
  })

  it('accepts every season propers file', () => {
    const seasons = ['advent', 'christmas', 'lent', 'easter', 'ordinary-time']
    for (const season of seasons) {
      const data = load(`src/data/loth/propers/${season}.json`)
      const parsed = SeasonPropersFileSchema.safeParse(data)
      expect(parsed.success).toBe(true)
    }
  })

  it('accepts sanctoral files', () => {
    for (const file of ['solemnities', 'feasts', 'memorials']) {
      const data = load(`src/data/loth/sanctoral/${file}.json`)
      const parsed = SanctoralFileSchema.safeParse(data)
      expect(parsed.success).toBe(true)
    }
  })

  it('accepts the hymns file', () => {
    const data = load('src/data/loth/ordinarium/hymns.json')
    const parsed = HymnsFileSchema.safeParse(data)
    expect(parsed.success).toBe(true)
  })

  it('accepts the hymns index file', () => {
    const data = load('src/data/loth/ordinarium/hymns-index.json')
    const parsed = HymnsIndexFileSchema.safeParse(data)
    expect(parsed.success).toBe(true)
  })
})

describe('FR-160-B ConditionalRubric schema', () => {
  // @fr FR-160-B-1
  it('accepts a minimal skip rubric', () => {
    const ok = ConditionalRubricSchema.safeParse({
      rubricId: 'lent-fri-skip-alleluia',
      when: { season: ['LENT'] },
      action: 'skip',
      appliesTo: { section: 'gospelCanticle' },
      evidencePdf: { page: 100, text: 'Аллэлуяа: татаж авна' },
    })
    expect(ok.success).toBe(true)
  })

  // @fr FR-160-B-1
  it('accepts a substitute rubric with target.text', () => {
    const ok = ConditionalRubricSchema.safeParse({
      rubricId: 'easter-sun-substitute-prayer',
      when: { season: ['EASTER'], dayOfWeek: ['SUN'] },
      action: 'substitute',
      target: { text: 'Замилалын залбирал…' },
      appliesTo: { section: 'concludingPrayer' },
      evidencePdf: { page: 200, line: 12, text: 'Эсвэл: …' },
      liturgicalBasis: 'GILH §198',
    })
    expect(ok.success).toBe(true)
  })

  // @fr FR-160-B-1
  it('rejects substitute action without target', () => {
    const bad = ConditionalRubricSchema.safeParse({
      rubricId: 'broken-substitute',
      when: { season: ['LENT'] },
      action: 'substitute',
      appliesTo: { section: 'concludingPrayer' },
      evidencePdf: { page: 100, text: 'rubric line' },
    })
    expect(bad.success).toBe(false)
  })

  // @fr FR-160-B-1
  it('rejects substitute action with empty target', () => {
    const bad = ConditionalRubricSchema.safeParse({
      rubricId: 'broken-empty-target',
      when: { season: ['LENT'] },
      action: 'substitute',
      target: {},
      appliesTo: { section: 'concludingPrayer' },
      evidencePdf: { page: 100, text: 'rubric line' },
    })
    expect(bad.success).toBe(false)
  })

  // @fr FR-160-B-1
  it('rejects rubric whose `when` is empty (no fields)', () => {
    const bad = ConditionalRubricSchema.safeParse({
      rubricId: 'always-on',
      when: {},
      action: 'skip',
      appliesTo: { section: 'concludingPrayer' },
      evidencePdf: { page: 100, text: 'rubric line' },
    })
    expect(bad.success).toBe(false)
  })

  // @fr FR-160-B-1
  it('rejects bad MM-DD format in dateRange', () => {
    const bad = ConditionalRubricSchema.safeParse({
      rubricId: 'advent-late',
      when: { dateRange: { from: '12/17', to: '12/24' } },
      action: 'skip',
      appliesTo: { section: 'invitatory' },
      evidencePdf: { page: 100, text: 'rubric line' },
    })
    expect(bad.success).toBe(false)
  })

  // @fr FR-160-B-1
  it('rejects unknown section enum value', () => {
    const bad = ConditionalRubricSchema.safeParse({
      rubricId: 'bad-section',
      when: { season: ['LENT'] },
      action: 'skip',
      appliesTo: { section: 'somethingNotReal' },
      evidencePdf: { page: 100, text: 'rubric line' },
    })
    expect(bad.success).toBe(false)
  })

  // @fr FR-160-B-1
  it('accepts ordinariumKey as substitute target', () => {
    const ok = ConditionalRubricSchema.safeParse({
      rubricId: 'compline-redirect',
      when: { dayOfWeek: ['SAT'] },
      action: 'substitute',
      target: { ordinariumKey: 'compline-responsory' },
      appliesTo: { section: 'responsory' },
      evidencePdf: { page: 515, text: 'redirect to compline body' },
    })
    expect(ok.success).toBe(true)
  })
})

describe('FR-160-B PageRedirect schema', () => {
  // @fr FR-160-B-2
  it('accepts a valid Магтуу redirect', () => {
    const ok = PageRedirectSchema.safeParse({
      redirectId: 'sun-vespers-dismissal-879',
      ordinariumKey: 'dismissal-blessing',
      page: 879,
      label: 'Магтуу: х. 879',
      appliesAt: 'dismissal',
      evidencePdf: { page: 879, text: 'Магтуу: х. 879' },
    })
    expect(ok.success).toBe(true)
  })

  // @fr FR-160-B-2
  it('rejects unknown ordinariumKey', () => {
    const bad = PageRedirectSchema.safeParse({
      redirectId: 'bad-key',
      ordinariumKey: 'something-else',
      page: 100,
      label: 'something',
      appliesAt: 'dismissal',
      evidencePdf: { page: 100, text: 'irrelevant' },
    })
    expect(bad.success).toBe(false)
  })

  // @fr FR-160-B-2
  it('rejects page outside 1..969', () => {
    const tooHigh = PageRedirectSchema.safeParse({
      redirectId: 'too-high',
      ordinariumKey: 'hymns',
      page: 1000,
      label: 'oops',
      appliesAt: 'hymn',
      evidencePdf: { page: 1, text: 'irrelevant' },
    })
    const tooLow = PageRedirectSchema.safeParse({
      redirectId: 'too-low',
      ordinariumKey: 'hymns',
      page: 0,
      label: 'oops',
      appliesAt: 'hymn',
      evidencePdf: { page: 1, text: 'irrelevant' },
    })
    expect(tooHigh.success).toBe(false)
    expect(tooLow.success).toBe(false)
  })

  // @fr FR-160-B-2
  it('rejects empty label', () => {
    const bad = PageRedirectSchema.safeParse({
      redirectId: 'empty-label',
      ordinariumKey: 'benedictus',
      page: 34,
      label: '',
      appliesAt: 'gospelCanticle',
      evidencePdf: { page: 34, text: 'something' },
    })
    expect(bad.success).toBe(false)
  })
})

describe('FR-160-B OrdinariumKeyCatalog schema', () => {
  // @fr FR-160-B-2
  it('accepts the live catalog file', () => {
    const data = load('src/data/loth/ordinarium-key-catalog.json')
    const parsed = OrdinariumKeyCatalogSchema.safeParse(data)
    if (!parsed.success) {
      console.error('catalog issues:', parsed.error.issues)
    }
    expect(parsed.success).toBe(true)
  })

  // @fr FR-160-B-2
  it('catalog has all 9 known keys', () => {
    const data = load('src/data/loth/ordinarium-key-catalog.json') as { entries: Record<string, unknown> }
    const expected = [
      'benedictus',
      'magnificat',
      'nunc-dimittis',
      'dismissal-blessing',
      'compline-responsory',
      'common-prayers',
      'gloria-patri',
      'invitatory-psalms',
      'hymns',
    ]
    for (const key of expected) {
      expect(data.entries[key]).toBeDefined()
    }
  })
})

describe('safeParse failure contract', () => {
  it('returns null and logs when input violates the schema', () => {
    const errors: unknown[] = []
    const origError = console.error
    console.error = (...args: unknown[]) => {
      errors.push(args)
    }
    try {
      const out = safeParse(
        PsalterWeekSchema,
        { week: 5, days: {} }, // week out of range, days missing required day keys
        'test fixture',
      )
      expect(out).toBeNull()
      expect(errors.length).toBeGreaterThan(0)
    } finally {
      console.error = origError
    }
  })
})
