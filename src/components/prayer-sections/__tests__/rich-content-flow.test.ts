/**
 * Unit tests for FR-161 R-15 — `RichContent` flow mode.
 *
 * Asserts the renderer's flow contract:
 *   - flow=true on a stanza block → single `<p>` with inline spans,
 *     no `<span class="block">` per line, all line spans space-joined,
 *     `data-render-mode="flow"` marker present
 *   - flow=false (default) → preserves the legacy line-by-line render
 *     with `<span class="block">` per line (regression safety)
 *   - flow=true with a phrase-bearing stanza → flow path takes
 *     precedence over phrase rendering (defensive — flow contexts
 *     should not carry phrases, but a data-quality slip must not
 *     reintroduce hard line breaks)
 *   - flow=true preserves para / rubric-line / divider blocks
 *     unchanged (those already wrap naturally)
 *
 * Render via `react-dom/server` so tests run without jsdom (matches
 * the existing pattern in `directive-block.test.ts` and
 * `psalm-block-phrases.test.ts`).
 */

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { RichContent } from '../rich-content'
import type { PrayerBlock, PrayerText } from '@/lib/types'

function makeStanzaBlock(
  lineTexts: string[],
  options: { phrases?: any[]; lineIndents?: (0 | 1 | 2)[] } = {},
): PrayerBlock {
  const lineIndents = options.lineIndents ?? lineTexts.map(() => 0 as const)
  return {
    kind: 'stanza',
    lines: lineTexts.map((text, i) => ({
      spans: [{ kind: 'text', text }],
      indent: lineIndents[i],
    })),
    ...(options.phrases ? { phrases: options.phrases } : {}),
  } as PrayerBlock
}

function makeContent(blocks: PrayerBlock[]): PrayerText {
  return { blocks }
}

function render(node: React.ReactElement): string {
  return renderToStaticMarkup(node)
}

// @fr FR-161
describe('RichContent — flow mode (FR-161 R-15)', () => {
  it('flow=true on a multi-line stanza renders a single <p> with inline spans', () => {
    const content = makeContent([
      makeStanzaBlock([
        'Тэнгэрбурхан Эцэг,',
        'та өөрийн Хүүгийн загалмайгаар',
        'хүн төрөлхтнийг аварсан билээ.',
      ]),
    ])
    const html = render(createElement(RichContent, { content, flow: true }))
    // Flow-mode marker present.
    expect(html).toContain('data-render-mode="flow"')
    // No `<span class="block">` per line — that's the line-break source.
    expect(html).not.toMatch(/<span class="block"/)
    // All three lines appear, space-joined, in source order.
    expect(html).toContain('Тэнгэрбурхан Эцэг,')
    expect(html).toContain('та өөрийн Хүүгийн загалмайгаар')
    expect(html).toContain('хүн төрөлхтнийг аварсан билээ.')
    // Single <p> wraps the joined content.
    const pCount = (html.match(/<p\b/g) ?? []).length
    expect(pCount).toBe(1)
  })

  it('flow=false (default) preserves the legacy <span class="block"> per line', () => {
    const content = makeContent([
      makeStanzaBlock(['line A', 'line B']),
    ])
    const html = render(createElement(RichContent, { content }))
    // No flow marker.
    expect(html).not.toContain('data-render-mode="flow"')
    // Each line gets a <span class="block ..."> wrapper.
    const blockSpans = (html.match(/<span class="block[^"]*"/g) ?? []).length
    expect(blockSpans).toBe(2)
    expect(html).toContain('line A')
    expect(html).toContain('line B')
  })

  it('flow=true takes precedence over phrases (defensive — data-quality safety)', () => {
    // Flow contexts (시편 마침 기도문 / 짧은 독서) should not carry phrase
    // groupings, but if they do (data sourcing slip), flow MUST still
    // produce a single natural-wrap <p> so hard `display: block` line
    // breaks do not re-emerge.
    const content = makeContent([
      makeStanzaBlock(['Phrase A', 'Phrase A wrap'], {
        phrases: [{ lineRange: [0, 1], indent: 0 }],
      }),
    ])
    const html = render(createElement(RichContent, { content, flow: true }))
    expect(html).toContain('data-render-mode="flow"')
    expect(html).not.toContain('data-render-mode="phrase"')
    // No phrase span data-roles.
    expect(html).not.toMatch(/data-role="psalm-phrase/)
    // No hanging-indent classes from the phrase path.
    expect(html).not.toMatch(/-indent-6/)
    // Joined text is present (strip tags — flow path puts each span in
    // its own `<span>` separated by a single-space `<span>`).
    const stripped = html.replace(/<[^>]+>/g, '')
    expect(stripped).toContain('Phrase A Phrase A wrap')
  })

  it('flow=true preserves para blocks unchanged (already natural wrap)', () => {
    const content: PrayerText = {
      blocks: [
        {
          kind: 'para',
          spans: [{ kind: 'text', text: 'A paragraph that wraps naturally.' }],
        } as PrayerBlock,
      ],
    }
    const html = render(createElement(RichContent, { content, flow: true }))
    // Para renders as <p> with body class — no flow marker (only stanza
    // is affected by flow), no block-span wrapper.
    expect(html).toContain('A paragraph that wraps naturally.')
    expect(html).not.toContain('data-render-mode="flow"')
    expect(html).not.toMatch(/<span class="block"/)
  })

  it('flow=true preserves rubric-line blocks unchanged', () => {
    const content: PrayerText = {
      blocks: [
        {
          kind: 'rubric-line',
          text: 'Залбирах нь',
        } as PrayerBlock,
      ],
    }
    const html = render(createElement(RichContent, { content, flow: true }))
    expect(html).toContain('Залбирах нь')
    expect(html).toMatch(/text-red-700/)
  })

  it('flow=true joins lines with single space (not double)', () => {
    const content = makeContent([
      makeStanzaBlock(['first', 'second', 'third']),
    ])
    const html = render(createElement(RichContent, { content, flow: true }))
    // Exactly "first second third" — no double spaces, no markup
    // between the words that would change the visible text run.
    const stripped = html.replace(/<[^>]+>/g, '')
    expect(stripped).toContain('first second third')
    expect(stripped).not.toContain('first  second')
  })
})
