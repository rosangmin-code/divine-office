import { describe, it, expect } from 'vitest'
import { attachSectionDirectives } from '../shared'
import type { HourPropers, HourSection, SectionOverride } from '../../types'

const baseOverride: SectionOverride = {
  rubricId: 'r1',
  mode: 'substitute',
  text: 'Take psalms from Sunday Week 1.',
}

describe('attachSectionDirectives', () => {
  // @fr FR-160-B-5a
  it('attaches directives to psalmody when sectionOverrides.psalmody present', () => {
    const propers: HourPropers = {
      sectionOverrides: { psalmody: [baseOverride] },
    }
    const section: HourSection = {
      type: 'psalmody',
      psalms: [],
    }
    const out = attachSectionDirectives(section, propers)
    expect(out.type).toBe('psalmody')
    if (out.type === 'psalmody') {
      expect(out.directives?.length).toBe(1)
      expect(out.directives?.[0].rubricId).toBe('r1')
    }
  })

  // @fr FR-160-B-5a
  it('attaches directives to intercessions', () => {
    const ov: SectionOverride = { rubricId: 'r2', mode: 'append', text: 'extra' }
    const propers: HourPropers = {
      sectionOverrides: { intercessions: [ov] },
    }
    const section: HourSection = {
      type: 'intercessions',
      intro: '',
      items: ['Original petition'],
    }
    const out = attachSectionDirectives(section, propers)
    if (out.type === 'intercessions') {
      expect(out.directives?.[0].mode).toBe('append')
      expect(out.items).toEqual(['Original petition'])
    }
  })

  // @fr FR-160-B-5a
  it('attaches directives to invitatory', () => {
    const ov: SectionOverride = { rubricId: 'inv1', mode: 'prepend', text: 'Уриа' }
    const propers: HourPropers = {
      sectionOverrides: { invitatory: [ov] },
    }
    const section: HourSection = {
      type: 'invitatory',
      versicle: 'V',
      response: 'R',
      antiphon: 'A',
      psalm: { ref: 'Psalm 95:1-11', title: 't', stanzas: [['l1']] },
      gloryBe: 'G',
    }
    const out = attachSectionDirectives(section, propers)
    if (out.type === 'invitatory') {
      expect(out.directives?.[0].rubricId).toBe('inv1')
    }
  })

  // @fr FR-160-B-5a
  it('attaches directives to dismissal', () => {
    const ov: SectionOverride = { rubricId: 'dis1', mode: 'skip' }
    const propers: HourPropers = {
      sectionOverrides: { dismissal: [ov] },
    }
    const section: HourSection = {
      type: 'dismissal',
      priest: {
        greeting: { versicle: 'v', response: 'r' },
        blessing: { text: 'b', response: 'a' },
        dismissalVersicle: { versicle: 'v', response: 'r' },
      },
      individual: { versicle: 'v', response: 'r' },
    }
    const out = attachSectionDirectives(section, propers)
    if (out.type === 'dismissal') {
      expect(out.directives?.[0].mode).toBe('skip')
    }
  })

  // @fr FR-160-B-5a
  it('attaches directives to openingVersicle', () => {
    const ov: SectionOverride = { rubricId: 'ov1', mode: 'append', text: 'extra' }
    const propers: HourPropers = {
      sectionOverrides: { openingVersicle: [ov] },
    }
    const section: HourSection = {
      type: 'openingVersicle',
      versicle: 'v',
      response: 'r',
      gloryBe: 'g',
    }
    const out = attachSectionDirectives(section, propers)
    if (out.type === 'openingVersicle') {
      expect(out.directives?.[0].rubricId).toBe('ov1')
    }
  })

  // @fr FR-160-B-5a
  it('returns section unchanged when sectionOverrides for that section is missing', () => {
    const propers: HourPropers = {
      sectionOverrides: { psalmody: [baseOverride] },
    }
    const section: HourSection = {
      type: 'invitatory',
      versicle: 'V',
      response: 'R',
      antiphon: 'A',
      psalm: { ref: 'Psalm 95:1-11', title: 't', stanzas: [['l1']] },
      gloryBe: 'G',
    }
    const out = attachSectionDirectives(section, propers)
    expect(out).toBe(section) // identity — no override for invitatory
  })

  // @fr FR-160-B-5a
  it('returns section unchanged when sectionOverrides absent entirely', () => {
    const propers: HourPropers = {}
    const section: HourSection = { type: 'psalmody', psalms: [] }
    const out = attachSectionDirectives(section, propers)
    expect(out).toBe(section)
  })

  // @fr FR-160-B-5a
  it('returns section unchanged when sectionOverrides.<section> is empty array', () => {
    const propers: HourPropers = { sectionOverrides: { psalmody: [] } }
    const section: HourSection = { type: 'psalmody', psalms: [] }
    const out = attachSectionDirectives(section, propers)
    expect(out).toBe(section)
  })

  // @fr FR-160-B-5a
  it('does NOT attach directives to non-PR-8 section types (e.g. shortReading)', () => {
    const propers: HourPropers = {
      sectionOverrides: { shortReading: [baseOverride] },
    }
    const section: HourSection = {
      type: 'shortReading',
      ref: 'X',
      bookMn: 'b',
      verses: [{ verse: 1, text: 'v' }],
    }
    const out = attachSectionDirectives(section, propers)
    expect(out).toBe(section) // shortReading is PR-1 territory; directives not surfaced via map
  })

  // @fr FR-160-B-5a
  it('preserves all other section fields when attaching directives', () => {
    const propers: HourPropers = {
      sectionOverrides: { intercessions: [baseOverride] },
    }
    const section: HourSection = {
      type: 'intercessions',
      intro: 'intro',
      items: ['p1', 'p2'],
      page: 100,
      refrain: 'r',
    }
    const out = attachSectionDirectives(section, propers)
    if (out.type === 'intercessions') {
      expect(out.intro).toBe('intro')
      expect(out.items).toEqual(['p1', 'p2'])
      expect(out.page).toBe(100)
      expect(out.refrain).toBe('r')
    }
  })

  // @fr FR-160-B-5a
  it('multiple directives on same section preserve order', () => {
    const a: SectionOverride = { rubricId: 'a', mode: 'prepend', text: 'A' }
    const b: SectionOverride = { rubricId: 'b', mode: 'append', text: 'B' }
    const propers: HourPropers = {
      sectionOverrides: { psalmody: [a, b] },
    }
    const section: HourSection = { type: 'psalmody', psalms: [] }
    const out = attachSectionDirectives(section, propers)
    if (out.type === 'psalmody') {
      expect(out.directives?.length).toBe(2)
      expect(out.directives?.[0].rubricId).toBe('a')
      expect(out.directives?.[1].rubricId).toBe('b')
    }
  })

  // @fr FR-160-B-5a
  it('immutability: original section unchanged after directive attach', () => {
    const propers: HourPropers = {
      sectionOverrides: { psalmody: [baseOverride] },
    }
    const original: HourSection = { type: 'psalmody', psalms: [] }
    const out = attachSectionDirectives(original, propers)
    expect((original as Extract<HourSection, { type: 'psalmody' }>).directives).toBeUndefined()
    expect(out).not.toBe(original)
  })
})
