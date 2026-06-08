import { describe, it, expect } from 'vitest'
import { assembleHour } from '../loth-service'
import type { AssembledHour, HourSection, SectionOverride } from '../types'

// GOAL #105 — solemnity psalmody alignment with the GILH §226-227 mental model.
// @fr GOAL-105

const WEEK1_SUN_LAUDS = ['Psalm 63:2-9', 'Daniel 3:57-88, 56', 'Psalm 149:1-9']
const WEEK1_SUN_VESPERS = ['Psalm 110:1-5, 7', 'Psalm 114:1-8', 'Revelation 19:1-7']
const PENTECOST_FIRST_VESPERS = ['Psalm 113:1-9', 'Psalm 147:1-11', 'Revelation 15:3-4']
const LAUDS_NOTICE =
  'Дууллууд ба магтаалыг 1 дүгээр долоо хоногийн Ням гарагаас татаж авна. х. 58.'
const CURRENT_WEEK_NOTICE = 'Дуулал ба магтаалыг явагдаж буй долоо хоногоос татаж авна.'

function section<T extends HourSection['type']>(
  hour: AssembledHour,
  type: T,
): Extract<HourSection, { type: T }> {
  const s = hour.sections.find((x) => x.type === type)
  if (!s) throw new Error(`section ${type} not found`)
  return s as Extract<HourSection, { type: T }>
}

function psalmRefs(hour: AssembledHour): string[] {
  return section(hour, 'psalmody').psalms.map((p) => p.reference)
}

function psalmodyDirectives(hour: AssembledHour): SectionOverride[] {
  return section(hour, 'psalmody').directives ?? []
}

function hasBody(hour: AssembledHour): boolean {
  return section(hour, 'psalmody').psalms.every(
    (p) => (p.stanzas?.length ?? 0) > 0 || p.verses.length > 0,
  )
}

describe('GOAL #105 — fixed-date solemnity Lauds uses Week-1 Sunday psalter', () => {
  const fixedSolemnities = [
    '2026-03-19',
    '2026-03-25',
    '2026-06-24',
    '2026-06-29',
    '2026-08-15',
    '2026-11-01',
    '2026-12-08',
  ]

  it.each(fixedSolemnities)('%s /lauds renders Ps63/Dan3/Ps149 with the reused notice', async (date) => {
    const h = await assembleHour(date, 'lauds')
    expect(h).not.toBeNull()
    expect(h!.liturgicalDay.rank).toBe('SOLEMNITY')
    expect(psalmRefs(h!)).toEqual(WEEK1_SUN_LAUDS)
    expect(hasBody(h!)).toBe(true)

    const directive = psalmodyDirectives(h!).find((d) => d.mode === 'substitute')
    expect(directive?.text).toBe(LAUDS_NOTICE)
    expect(directive?.bodyInlined).toBe(true)
  })
})

describe('GOAL #105 — sourced and unsourced First/Second Vespers branches', () => {
  it('Trinity First Vespers drops the wrong Ps141/Ps142/Phil2 inline copy and falls back visibly', async () => {
    const h = await assembleHour('2026-05-31', 'firstVespers')
    expect(h).not.toBeNull()

    expect(psalmRefs(h!)).toEqual(WEEK1_SUN_VESPERS)
    expect(psalmRefs(h!)).not.toContain('Psalm 141:1-9')
    expect(psalmRefs(h!)).not.toContain('Psalm 142:1-7')
    expect(psalmRefs(h!)).not.toContain('Philippians 2:6-11')

    const directive = psalmodyDirectives(h!).find((d) => d.mode === 'prepend')
    expect(directive?.text).toBe(CURRENT_WEEK_NOTICE)
    expect(hasBody(h!)).toBe(true)
  })

  it('Pentecost First Vespers keeps its sourced proper Laudate-family psalmody', async () => {
    const h = await assembleHour('2026-05-24', 'firstVespers')
    expect(h).not.toBeNull()
    expect(psalmRefs(h!)).toEqual(PENTECOST_FIRST_VESPERS)
    expect(psalmodyDirectives(h!).map((d) => d.text)).not.toContain(CURRENT_WEEK_NOTICE)
  })

  it('fixed solemnity First and Second Vespers fallback shows the current-week rubric while preserving body', async () => {
    const first = await assembleHour('2026-03-19', 'firstVespers')
    const second = await assembleHour('2026-03-19', 'vespers')
    expect(first).not.toBeNull()
    expect(second).not.toBeNull()

    for (const h of [first!, second!]) {
      const directive = psalmodyDirectives(h).find((d) => d.mode === 'prepend')
      expect(directive?.text).toBe(CURRENT_WEEK_NOTICE)
      expect(hasBody(h)).toBe(true)
    }
  })
})
