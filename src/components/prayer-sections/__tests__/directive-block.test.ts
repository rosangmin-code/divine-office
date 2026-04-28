import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { DirectiveBlock, partitionDirectives } from '../directive-block'
import { PsalmodySection } from '../psalmody-section'
import { DismissalSection } from '../dismissal-section'
import { IntercessionsSection } from '../intercessions-section'
import { OpeningVersicleSection } from '../../opening-versicle-section'
import { InvitatorySection } from '../../invitatory-section'
import { SettingsProvider } from '@/lib/settings'
import type { HourSection, SectionOverride } from '@/lib/types'

function html(node: React.ReactElement): string {
  return renderToStaticMarkup(node)
}

describe('partitionDirectives helper', () => {
  // @fr FR-160-B-5a
  it('partitions by mode', () => {
    const dirs: SectionOverride[] = [
      { rubricId: 'a', mode: 'skip' },
      { rubricId: 'b', mode: 'substitute', text: 'B' },
      { rubricId: 'c', mode: 'prepend', text: 'C' },
      { rubricId: 'd', mode: 'append', text: 'D' },
    ]
    const p = partitionDirectives(dirs)
    expect(p.hasSkip).toBe(true)
    expect(p.hasSubstitute).toBe(true)
    expect(p.prepends.length).toBe(1)
    expect(p.appends.length).toBe(1)
    expect(p.skips.length).toBe(1)
    expect(p.substitutes.length).toBe(1)
  })

  // @fr FR-160-B-5a
  it('handles undefined input', () => {
    const p = partitionDirectives(undefined)
    expect(p.hasSkip).toBe(false)
    expect(p.hasSubstitute).toBe(false)
    expect(p.prepends).toEqual([])
  })
})

describe('DirectiveBlock component', () => {
  // @fr FR-160-B-5a
  it('renders nothing when directives is undefined', () => {
    const out = html(createElement(DirectiveBlock, { directives: undefined }))
    expect(out).toBe('')
  })

  // @fr FR-160-B-5a
  it('renders nothing when directives is empty', () => {
    const out = html(createElement(DirectiveBlock, { directives: [] }))
    expect(out).toBe('')
  })

  // @fr FR-160-B-5a
  it('renders directive with data-role + data-mode + data-rubric-id', () => {
    const out = html(
      createElement(DirectiveBlock, {
        directives: [{ rubricId: 'r-1', mode: 'substitute', text: 'Hello' }],
      }),
    )
    expect(out).toContain('data-role="conditional-rubric-directive"')
    expect(out).toContain('data-rubric-id="r-1"')
    expect(out).toContain('data-mode="substitute"')
    expect(out).toContain('Hello')
  })

  // @fr FR-160-B-5a
  it('falls back to ref or ordinariumKey when text is absent', () => {
    const out = html(
      createElement(DirectiveBlock, {
        directives: [
          { rubricId: 'k', mode: 'substitute', ordinariumKey: 'benedictus' },
        ],
      }),
    )
    expect(out).toContain('(benedictus)')
  })

  // @fr FR-160-B-5a
  it('filterMode renders only matching directives', () => {
    const out = html(
      createElement(DirectiveBlock, {
        directives: [
          { rubricId: 'a', mode: 'prepend', text: 'Pre' },
          { rubricId: 'b', mode: 'append', text: 'App' },
        ],
        filterMode: 'prepend',
      }),
    )
    expect(out).toContain('Pre')
    expect(out).not.toContain('App')
  })
})

describe('PsalmodySection — directive surface', () => {
  const psalmsBase = [
    {
      psalmType: 'psalm' as const,
      reference: 'Psalm 1',
      antiphon: 'A',
      verses: [{ verse: 1, text: 'v1' }],
      gloriaPatri: true,
    },
  ]

  // @fr FR-160-B-5a
  it('substitute hides body and shows directive in its place (11-02 case)', () => {
    const section: Extract<HourSection, { type: 'psalmody' }> = {
      type: 'psalmody',
      psalms: psalmsBase,
      directives: [
        {
          rubricId: 'all-souls-sub',
          mode: 'substitute',
          text: 'Take prayers from Sunday Week 1.',
        },
      ],
    }
    const out = html(createElement(PsalmodySection, { section }))
    expect(out).toContain('Take prayers from Sunday Week 1.')
    expect(out).toContain('data-mode="substitute"')
    // Body (psalm content) hidden — original verse text not rendered
    expect(out).not.toContain('v1')
  })

  // @fr FR-160-B-5a
  it('skip (without substitute) hides body and shows skip directive', () => {
    const section: Extract<HourSection, { type: 'psalmody' }> = {
      type: 'psalmody',
      psalms: psalmsBase,
      directives: [{ rubricId: 'skip-1', mode: 'skip' }],
    }
    const out = html(createElement(PsalmodySection, { section }))
    expect(out).toContain('data-mode="skip"')
    expect(out).not.toContain('v1')
  })

  // @fr FR-160-B-5a
  it('prepend renders directive before body, body still visible', () => {
    const section: Extract<HourSection, { type: 'psalmody' }> = {
      type: 'psalmody',
      psalms: psalmsBase,
      directives: [{ rubricId: 'p-1', mode: 'prepend', text: 'PREFIX' }],
    }
    const out = html(createElement(PsalmodySection, { section }))
    expect(out).toContain('PREFIX')
    expect(out).toContain('data-mode="prepend"')
    expect(out).toContain('v1')
    // PREFIX precedes verse text
    expect(out.indexOf('PREFIX')).toBeLessThan(out.indexOf('v1'))
  })

  // @fr FR-160-B-5a
  it('append renders directive after body, body still visible', () => {
    const section: Extract<HourSection, { type: 'psalmody' }> = {
      type: 'psalmody',
      psalms: psalmsBase,
      directives: [{ rubricId: 'a-1', mode: 'append', text: 'SUFFIX' }],
    }
    const out = html(createElement(PsalmodySection, { section }))
    expect(out).toContain('SUFFIX')
    expect(out).toContain('v1')
    expect(out.indexOf('v1')).toBeLessThan(out.indexOf('SUFFIX'))
  })

  // @fr FR-160-B-5a (regression)
  it('without directives: original psalmody body renders unchanged', () => {
    const section: Extract<HourSection, { type: 'psalmody' }> = {
      type: 'psalmody',
      psalms: psalmsBase,
    }
    const out = html(createElement(PsalmodySection, { section }))
    expect(out).toContain('v1')
    expect(out).not.toContain('conditional-rubric-directive')
  })
})

describe('DismissalSection — directive surface', () => {
  const baseDismissal: Extract<HourSection, { type: 'dismissal' }> = {
    type: 'dismissal',
    priest: {
      greeting: { versicle: 'pV', response: 'pR' },
      blessing: { text: 'pB', response: 'pBR' },
      dismissalVersicle: { versicle: 'pDV', response: 'pDR' },
    },
    individual: { versicle: 'iV', response: 'iR' },
  }

  // @fr FR-160-B-5a
  it('substitute hides priest+individual body, shows directive', () => {
    const section = { ...baseDismissal, directives: [{ rubricId: 'sub', mode: 'substitute', text: 'New dismissal' } as SectionOverride] }
    const out = html(createElement(DismissalSection, { section }))
    expect(out).toContain('New dismissal')
    expect(out).not.toContain('pV')
    expect(out).not.toContain('iV')
  })

  // @fr FR-160-B-5a
  it('append renders directive after body', () => {
    const section = { ...baseDismissal, directives: [{ rubricId: 'app', mode: 'append', text: 'After-note' } as SectionOverride] }
    const out = html(createElement(DismissalSection, { section }))
    expect(out).toContain('pV')
    expect(out).toContain('After-note')
    expect(out.indexOf('pV')).toBeLessThan(out.indexOf('After-note'))
  })

  // @fr FR-160-B-5a (regression)
  it('without directives: original dismissal body renders unchanged', () => {
    const out = html(createElement(DismissalSection, { section: baseDismissal }))
    expect(out).toContain('pV')
    expect(out).toContain('iV')
    expect(out).not.toContain('conditional-rubric-directive')
  })
})

describe('OpeningVersicleSection — directive surface', () => {
  const baseOV: Extract<HourSection, { type: 'openingVersicle' }> = {
    type: 'openingVersicle',
    versicle: 'Тэнгэрбурхан минь',
    response: 'Эзэн минь',
    gloryBe: 'Жавхлан Эцэгт',
    alleluia: 'Аллэлуяа!',
  }

  // @fr FR-160-B-5a
  it('substitute hides versicle/response/gloryBe and shows directive', () => {
    const section = {
      ...baseOV,
      directives: [{ rubricId: 'sub-ov', mode: 'substitute', text: 'Замилалын удиртгал' } as SectionOverride],
    }
    const out = html(
      createElement(SettingsProvider, { children: createElement(OpeningVersicleSection, { section }) }),
    )
    expect(out).toContain('Замилалын удиртгал')
    expect(out).toContain('data-mode="substitute"')
    expect(out).not.toContain('Тэнгэрбурхан минь')
  })

  // @fr FR-160-B-5a
  it('append renders directive after body, body still visible', () => {
    const section = {
      ...baseOV,
      directives: [{ rubricId: 'app-ov', mode: 'append', text: 'POST' } as SectionOverride],
    }
    const out = html(
      createElement(SettingsProvider, { children: createElement(OpeningVersicleSection, { section }) }),
    )
    expect(out).toContain('Тэнгэрбурхан минь')
    expect(out).toContain('POST')
  })

  // @fr FR-160-B-5a (regression)
  it('without directives: original openingVersicle body unchanged', () => {
    const out = html(
      createElement(SettingsProvider, { children: createElement(OpeningVersicleSection, { section: baseOV }) }),
    )
    expect(out).toContain('Тэнгэрбурхан минь')
    expect(out).toContain('Жавхлан Эцэгт')
    expect(out).not.toContain('conditional-rubric-directive')
  })
})

describe('InvitatorySection — directive surface (R1 fix: collapsed-aware)', () => {
  const baseInvitatory: Extract<HourSection, { type: 'invitatory' }> = {
    type: 'invitatory',
    versicle: 'V',
    response: 'R',
    antiphon: 'A',
    psalm: { ref: 'Psalm 95:1-11', title: 'PsTitle', stanzas: [['l1']] },
    gloryBe: 'G',
  }

  // @fr FR-160-B-5a
  it('R1 fix: substitute directive surfaces even when invitatory is collapsed (default invitatoryCollapsed=true)', () => {
    const section = {
      ...baseInvitatory,
      directives: [{ rubricId: 'sub-inv', mode: 'substitute', text: 'INVITATORY-SUB' } as SectionOverride],
    }
    const out = html(
      createElement(SettingsProvider, { children: createElement(InvitatorySection, { section }) }),
    )
    // With default invitatoryCollapsed=true, the body would be hidden;
    // R1 fix surfaces directives in a separate collapsed-aware block.
    expect(out).toContain('INVITATORY-SUB')
    expect(out).toContain('data-mode="substitute"')
    expect(out).toContain('data-role="invitatory-directives-collapsed"')
  })

  // @fr FR-160-B-5a
  it('R1 fix: skip directive surfaces when collapsed', () => {
    const section = {
      ...baseInvitatory,
      directives: [{ rubricId: 'skip-inv', mode: 'skip' } as SectionOverride],
    }
    const out = html(
      createElement(SettingsProvider, { children: createElement(InvitatorySection, { section }) }),
    )
    expect(out).toContain('data-mode="skip"')
  })

  // @fr FR-160-B-5a (regression)
  it('without directives, no collapsed-directive block rendered', () => {
    const out = html(
      createElement(SettingsProvider, { children: createElement(InvitatorySection, { section: baseInvitatory }) }),
    )
    expect(out).not.toContain('data-role="invitatory-directives-collapsed"')
    expect(out).not.toContain('conditional-rubric-directive')
  })
})

describe('IntercessionsSection — directive surface', () => {
  const baseInt: Extract<HourSection, { type: 'intercessions' }> = {
    type: 'intercessions',
    intro: 'Intro line',
    items: ['petition 1', 'petition 2'],
  }

  // @fr FR-160-B-5a
  it('skip-only with empty items hides petitions, shows skip directive', () => {
    const section = { ...baseInt, items: [], directives: [{ rubricId: 'sk', mode: 'skip' } as SectionOverride] }
    const out = html(createElement(IntercessionsSection, { section }))
    expect(out).toContain('Гуйлтын залбирал') // section header still rendered
    expect(out).toContain('data-mode="skip"')
    expect(out).not.toContain('petition')
  })

  // @fr FR-160-B-5a
  it('substitute (with PR-8 mutated array=[text]) renders petition + substitute directive notice', () => {
    const section = {
      ...baseInt,
      items: ['Substitution directive text'],
      directives: [
        { rubricId: 'sub', mode: 'substitute', text: 'Substitution directive text' } as SectionOverride,
      ],
    }
    const out = html(createElement(IntercessionsSection, { section }))
    expect(out).toContain('Substitution directive text')
    // The directive notice is rendered (so the user sees it's a rubric, not a normal petition)
    expect(out).toContain('data-mode="substitute"')
  })

  // @fr FR-160-B-5a (regression)
  it('without directives: original intercessions body renders unchanged', () => {
    const out = html(createElement(IntercessionsSection, { section: baseInt }))
    expect(out).toContain('petition 1')
    expect(out).toContain('petition 2')
    expect(out).not.toContain('conditional-rubric-directive')
  })
})
