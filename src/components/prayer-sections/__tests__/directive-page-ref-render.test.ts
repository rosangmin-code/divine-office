/**
 * GOAL #201 (#201-sub-2) — real-production-render outcome verification.
 *
 * Renders the ACTUAL `PsalmodySection` + `PageRef` component tree through
 * the real code path (renderToStaticMarkup) with `showPageRefs` enabled, to
 * prove the user-perceptible outcome: the "Дуулал ба магтаалыг явагдаж буй
 * долоо хоногоос татаж авна." notice now shows its PDF source page as a
 * `(х. 580)` link — while a notice that already embeds an inline `х. 58`
 * does NOT get a redundant second link.
 *
 * `useSettings` is mocked to `showPageRefs: true` because the SSR snapshot
 * (`getServerSnapshot`) otherwise returns DEFAULTS (showPageRefs: false) and
 * `PageRef` short-circuits to null. All other settings fields keep their
 * real defaults.
 *
 * @fr FR-160-B
 */

import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import type { HourSection } from '@/lib/types'

vi.mock('@/lib/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/settings')>()
  return {
    ...actual,
    useSettings: () => ({
      settings: { ...actual.DEFAULTS, showPageRefs: true },
      updateSettings: () => {},
    }),
  }
})

// Imported AFTER the mock so the PageRef in the tree sees showPageRefs=true.
const { PsalmodySection } = await import('../psalmody-section')

const psalmsBase = [
  {
    psalmType: 'psalm' as const,
    reference: 'Psalm 110',
    antiphon: 'A',
    verses: [{ verse: 1, text: 'v1' }],
    gloriaPatri: true,
  },
]

describe('GOAL #201 — notice source page in real production render', () => {
  it('surfaces (х. 580) next to the "Дуулал ба магтаал" notice', () => {
    const section: Extract<HourSection, { type: 'psalmody' }> = {
      type: 'psalmody',
      psalms: psalmsBase,
      directives: [
        {
          rubricId: 'goal201-notice',
          mode: 'prepend',
          text: 'Дуулал ба магтаалыг явагдаж буй долоо хоногоос татаж авна.',
          page: 580,
        },
      ],
    }
    const out = renderToStaticMarkup(createElement(PsalmodySection, { section }))
    expect(out).toContain('Дуулал ба магтаалыг явагдаж буй долоо хоног')
    expect(out).toContain('(х. 580)')
    expect(out).toContain('data-role="page-ref-link"')
    // The notice (and its page ref) precede the psalm body (prepend).
    expect(out.indexOf('580')).toBeLessThan(out.indexOf('v1'))
  })

  it('does NOT add a redundant ref to a notice that already embeds х. 58', () => {
    const section: Extract<HourSection, { type: 'psalmody' }> = {
      type: 'psalmody',
      psalms: psalmsBase,
      directives: [
        {
          rubricId: 'borrow-week1',
          mode: 'substitute',
          text: 'Дууллууд ба магтаалыг 1 дүгээр долоо хоногийн Ням гарагаас татаж авна. х. 58.',
          page: 589,
          bodyInlined: true,
        },
      ],
    }
    const out = renderToStaticMarkup(createElement(PsalmodySection, { section }))
    expect(out).toContain('х. 58') // inline ref preserved
    expect(out).not.toContain('(х. 589)') // no redundant evidencePdf-page link
  })
})
