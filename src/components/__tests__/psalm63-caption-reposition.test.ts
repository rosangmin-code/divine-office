/**
 * GOAL #130 — Psalm 63 Lauds caption reposition (body → post-title header).
 *
 * Step 4 RED tests (DOGFOODING). Component-render layer (D1 screen order +
 * D2 uncited-caption renderer branch). Asserts the renderer draws an
 * `uncited_caption` header in the post-title slot WITHOUT emitting an
 * attribution parenthesis / empty attribution span — the new no-attribution
 * branch that Step 6 must add (spec §2 Caption Preservation, MM §C2).
 *
 * RED before Step 6: the current renderer (`psalm-block.tsx:96-114`)
 * unconditionally emits `(` + `<span data-role="psalm-header-attribution">`
 * + `)` for every `headerRich`, so an uncited caption renders with an empty
 * `()` pair. After Step 6 the uncited branch suppresses the attribution span
 * and the parens → these assertions go GREEN.
 *
 * Pattern adapted from `psalm-block-header-guard.test.ts`. Kept in a
 * dedicated new file to avoid #105 merge conflict.
 *
 * Mongolian liturgical text quoted verbatim (citation exception); spelling
 * is the data/PDF form `тэмүүлнэ`.
 */

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { PsalmBlock } from '../psalm-block'
import { SettingsProvider } from '@/lib/settings'
import type { AssembledPsalm, PsalterHeaderRich } from '@/lib/types'

const PS63_REF = 'Psalm 63:2-9'
const PS63_BODY_FIRST_LINE = 'Тэнгэрбурхан, Та миний Тэнгэрбурхан'
const PS63_CAPTION_L1 = 'Гэм нүглийн харанхуйгаас салсан хэнбугай ч'
const PS63_CAPTION_L2 = 'Тэнгэрбурханыг хүсэн тэмүүлнэ.'
const PS63_TITLE = 'Тэнгэрбурханаар цангаж буй сэтгэл'

function makePsalm(overrides: Partial<AssembledPsalm> = {}): AssembledPsalm {
  return {
    psalmType: 'psalm',
    reference: PS63_REF,
    antiphon: '',
    verses: [],
    gloriaPatri: false,
    ...overrides,
  }
}

function render(node: React.ReactElement): string {
  return renderToStaticMarkup(createElement(SettingsProvider, null, node))
}

// An `uncited_caption` header has no attribution. The kind/optional-
// attribution shape is the Step 6 type change (PsalterHeaderRich union +
// optional attribution); cast here so the RED test compiles against the
// pre-fix type that still requires `attribution`.
function uncitedCaptionHeader(): PsalterHeaderRich {
  return {
    kind: 'uncited_caption',
    preface_text: `${PS63_CAPTION_L1}\n${PS63_CAPTION_L2}`,
    page: 58,
  } as unknown as PsalterHeaderRich
}

function ps63WithRepositionedCaption(): AssembledPsalm {
  return makePsalm({
    title: PS63_TITLE,
    headerRich: uncitedCaptionHeader(),
    // Post-fix body: caption removed, real body line is first.
    stanzas: [[PS63_BODY_FIRST_LINE, 'Би Таныг эртлэн хайх болой.']],
  })
}

// @fr FR-160-C
describe('GOAL #130 — Psalm 63 caption reposition · component render', () => {
  it('[D1] screen order: title → caption(header) → body first line', () => {
    const html = render(createElement(PsalmBlock, { psalm: ps63WithRepositionedCaption() }))
    const titleIdx = html.indexOf(PS63_TITLE)
    const captionIdx = html.indexOf(PS63_CAPTION_L1)
    const bodyIdx = html.indexOf(PS63_BODY_FIRST_LINE)
    expect(titleIdx).toBeGreaterThan(-1)
    expect(captionIdx).toBeGreaterThan(-1)
    expect(bodyIdx).toBeGreaterThan(-1)
    expect(captionIdx).toBeGreaterThan(titleIdx)
    expect(bodyIdx).toBeGreaterThan(captionIdx)
  })

  it('[D2] caption rendered in the post-title headerRich slot (preserved, both lines)', () => {
    const html = render(createElement(PsalmBlock, { psalm: ps63WithRepositionedCaption() }))
    expect(html).toContain('data-role="psalm-header-rich"')
    expect(html).toContain('data-kind="uncited_caption"')
    expect(html).toContain(PS63_CAPTION_L1)
    expect(html).toContain(PS63_CAPTION_L2)
  })

  it('[D2] uncited_caption renders with NO attribution span (RED: current renderer emits one)', () => {
    const html = render(createElement(PsalmBlock, { psalm: ps63WithRepositionedCaption() }))
    // RED before Step 6: the renderer emits `data-role="psalm-header-attribution"`
    // unconditionally for every headerRich kind.
    expect(html).not.toContain('data-role="psalm-header-attribution"')
  })

  it('[D2] uncited_caption renders with NO empty attribution parentheses (RED: current renderer emits `()`)', () => {
    const html = render(createElement(PsalmBlock, { psalm: ps63WithRepositionedCaption() }))
    // Extract the header-rich <p> and assert it carries no `(` … `)` wrapper
    // around an (empty) attribution span.
    const headerMatch = html.match(
      /<p[^>]*data-role="psalm-header-rich"[\s\S]*?<\/p>/,
    )
    expect(headerMatch).not.toBeNull()
    const headerHtml = headerMatch![0]
    // RED before Step 6: header currently ends with ` (<span …></span>)`.
    expect(headerHtml).not.toMatch(/\(\s*<span[^>]*psalm-header-attribution[\s\S]*?\)/)
    expect(headerHtml).not.toContain('psalm-header-attribution')
  })
})
