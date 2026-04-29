/**
 * Unit tests for FR-161 R-15 — `RichContent` flow modes.
 *
 * Asserts the renderer's flow contract:
 *   - flow="natural" on a stanza block → single `<p>` with inline spans,
 *     no `<span class="block">` per line, all line spans space-joined,
 *     `data-render-mode="flow"` marker present
 *   - flow=undefined (default) → preserves the legacy line-by-line
 *     render with `<span class="block">` per line (regression safety)
 *   - flow="natural" with a phrase-bearing stanza → flow path takes
 *     precedence over phrase rendering (defensive — flow contexts
 *     should not carry phrases, but a data-quality slip must not
 *     reintroduce hard line breaks)
 *   - flow="natural" preserves para / rubric-line / divider blocks
 *     unchanged (those already wrap naturally)
 *   - flow="sentence" on a multi-sentence stanza → multiple `<p>`,
 *     each sentence is one paragraph (lines joined inline within),
 *     `data-render-mode="sentence"` marker on the wrapper, each
 *     paragraph carries `data-role="sentence"`
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
describe('RichContent — flow="natural" (FR-161 R-15)', () => {
  it('renders a single <p> with inline spans for a multi-line stanza', () => {
    const content = makeContent([
      makeStanzaBlock([
        'Тэнгэрбурхан Эцэг,',
        'та өөрийн Хүүгийн загалмайгаар',
        'хүн төрөлхтнийг аварсан билээ.',
      ]),
    ])
    const html = render(
      createElement(RichContent, { content, flow: 'natural' }),
    )
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

  it('flow undefined (default) preserves the legacy <span class="block"> per line', () => {
    const content = makeContent([
      makeStanzaBlock(['line A', 'line B']),
    ])
    const html = render(createElement(RichContent, { content }))
    // No flow marker.
    expect(html).not.toContain('data-render-mode="flow"')
    expect(html).not.toContain('data-render-mode="sentence"')
    // Each line gets a <span class="block ..."> wrapper.
    const blockSpans = (html.match(/<span class="block[^"]*"/g) ?? []).length
    expect(blockSpans).toBe(2)
    expect(html).toContain('line A')
    expect(html).toContain('line B')
  })

  it('takes precedence over phrases (defensive — data-quality safety)', () => {
    // Flow contexts (시편 마침 기도문 / 짧은 독서) should not carry phrase
    // groupings, but if they do (data sourcing slip), flow MUST still
    // produce a single natural-wrap <p> so hard `display: block` line
    // breaks do not re-emerge.
    const content = makeContent([
      makeStanzaBlock(['Phrase A', 'Phrase A wrap'], {
        phrases: [{ lineRange: [0, 1], indent: 0 }],
      }),
    ])
    const html = render(
      createElement(RichContent, { content, flow: 'natural' }),
    )
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

  it('preserves para blocks unchanged (already natural wrap)', () => {
    const content: PrayerText = {
      blocks: [
        {
          kind: 'para',
          spans: [{ kind: 'text', text: 'A paragraph that wraps naturally.' }],
        } as PrayerBlock,
      ],
    }
    const html = render(
      createElement(RichContent, { content, flow: 'natural' }),
    )
    // Para renders as <p> with body class — no flow marker (only stanza
    // is affected by flow), no block-span wrapper.
    expect(html).toContain('A paragraph that wraps naturally.')
    expect(html).not.toContain('data-render-mode="flow"')
    expect(html).not.toMatch(/<span class="block"/)
  })

  it('preserves rubric-line blocks unchanged', () => {
    const content: PrayerText = {
      blocks: [
        {
          kind: 'rubric-line',
          text: 'Залбирах нь',
        } as PrayerBlock,
      ],
    }
    const html = render(
      createElement(RichContent, { content, flow: 'natural' }),
    )
    expect(html).toContain('Залбирах нь')
    expect(html).toMatch(/text-red-700/)
  })

  it('joins lines with single space (not double)', () => {
    const content = makeContent([
      makeStanzaBlock(['first', 'second', 'third']),
    ])
    const html = render(
      createElement(RichContent, { content, flow: 'natural' }),
    )
    // Exactly "first second third" — no double spaces, no markup
    // between the words that would change the visible text run.
    const stripped = html.replace(/<[^>]+>/g, '')
    expect(stripped).toContain('first second third')
    expect(stripped).not.toContain('first  second')
  })
})

// @fr FR-161
describe('RichContent — flow="sentence" (FR-161 R-15 sentence-mode)', () => {
  // 사용자 spec: "각 문장을 한 단위씩 묶고 문장이 바뀌는 데서는 줄바꿈을 하면 돼".
  // 전체 마침 기도문 (Төгсгөлийн даатгал залбирал) 은 보통 본문 petition
  // + Trinitarian doxology — 2-3 문장으로 구성. 한 문장 = 한 paragraph
  // (자연 wrap), 문장 경계에서만 hard break.

  it('groups multi-line stanza into sentence-bounded <p> elements', () => {
    // 4 PDF lines that compose 2 sentences:
    //   sentence 1: lines 0+1 ("...энх амгаланг өгтөгөй.")
    //   sentence 2: lines 2+3 ("...эзэрхэх Хүүгийн нэрээр.")
    const content = makeContent([
      makeStanzaBlock([
        'Хайрт Эцэг ээ, Та биднийг гэрэлтүүлж',
        'мөнхийн энх амгаланг өгтөгөй.',
        'Тэр нь Таны Хүү, бидний Эзэн Есүс Христ ',
        'үүрд мөнхөд эзэрхэх Хүүгийн нэрээр.',
      ]),
    ])
    const html = render(
      createElement(RichContent, { content, flow: 'sentence' }),
    )
    // Sentence-mode marker on the wrapper.
    expect(html).toContain('data-render-mode="sentence"')
    // Two sentences → two <p data-role="sentence"> elements.
    const sentencePs = (html.match(/data-role="sentence"/g) ?? []).length
    expect(sentencePs).toBe(2)
    // No `<span class="block">` per line.
    expect(html).not.toMatch(/<span class="block"/)
    // Stripped text contains both sentences whole.
    const stripped = html.replace(/<[^>]+>/g, '')
    expect(stripped).toContain('Хайрт Эцэг ээ, Та биднийг гэрэлтүүлж мөнхийн энх амгаланг өгтөгөй.')
    expect(stripped).toContain('Тэр нь Таны Хүү, бидний Эзэн Есүс Христ  үүрд мөнхөд эзэрхэх Хүүгийн нэрээр.')
  })

  it('detects sentence boundary at "." / "!" / "?"', () => {
    const content = makeContent([
      makeStanzaBlock(['Question one?', 'Statement two.', 'Exclamation three!']),
    ])
    const html = render(
      createElement(RichContent, { content, flow: 'sentence' }),
    )
    expect(html).toContain('data-render-mode="sentence"')
    // 3 sentence boundaries → 3 separate <p> elements.
    const sentencePs = (html.match(/data-role="sentence"/g) ?? []).length
    expect(sentencePs).toBe(3)
  })

  it('emits a single <p> when no sentence boundary is found (graceful)', () => {
    // No closing punctuation on either line — both lines collapse into
    // one trailing group (still one <p>, never dropped).
    const content = makeContent([
      makeStanzaBlock(['Line one without period', 'Line two also unterminated']),
    ])
    const html = render(
      createElement(RichContent, { content, flow: 'sentence' }),
    )
    expect(html).toContain('data-render-mode="sentence"')
    const sentencePs = (html.match(/data-role="sentence"/g) ?? []).length
    expect(sentencePs).toBe(1)
    const stripped = html.replace(/<[^>]+>/g, '')
    expect(stripped).toContain('Line one without period Line two also unterminated')
  })

  it('preserves trailing fragment after the last sentence boundary', () => {
    // 3 lines: line 0 ends sentence, line 1 starts new sentence, line 2
    // is unterminated continuation of sentence 2. Result: 2 <p>, with
    // sentence 2 = "Sentence two start Sentence two end without period".
    const content = makeContent([
      makeStanzaBlock([
        'Sentence one complete.',
        'Sentence two start',
        'Sentence two end without period',
      ]),
    ])
    const html = render(
      createElement(RichContent, { content, flow: 'sentence' }),
    )
    const sentencePs = (html.match(/data-role="sentence"/g) ?? []).length
    expect(sentencePs).toBe(2)
    const stripped = html.replace(/<[^>]+>/g, '')
    expect(stripped).toContain('Sentence one complete.')
    expect(stripped).toContain('Sentence two start Sentence two end without period')
  })

  it('treats ellipsis "…" as a sentence terminator', () => {
    const content = makeContent([
      makeStanzaBlock(['First part trails off…', 'Second sentence follows.']),
    ])
    const html = render(
      createElement(RichContent, { content, flow: 'sentence' }),
    )
    const sentencePs = (html.match(/data-role="sentence"/g) ?? []).length
    expect(sentencePs).toBe(2)
  })

  it('handles a single-sentence stanza as a single <p>', () => {
    const content = makeContent([
      makeStanzaBlock([
        'One short prayer ends here.',
      ]),
    ])
    const html = render(
      createElement(RichContent, { content, flow: 'sentence' }),
    )
    const sentencePs = (html.match(/data-role="sentence"/g) ?? []).length
    expect(sentencePs).toBe(1)
  })

  // FR-161 R-16: explicit `'legacy'` literal — accepted as alias for
  // undefined / default. Caller code can write `flow="legacy"` to make
  // the intent explicit rather than relying on omission.
  it('accepts flow="legacy" as explicit alias for default behavior', () => {
    const content = makeContent([
      makeStanzaBlock(['line A', 'line B']),
    ])
    const html = render(
      createElement(RichContent, { content, flow: 'legacy' }),
    )
    expect(html).not.toContain('data-render-mode="flow"')
    expect(html).not.toContain('data-render-mode="sentence"')
    const blockSpans = (html.match(/<span class="block[^"]*"/g) ?? []).length
    expect(blockSpans).toBe(2)
  })

  // FR-161 R-16: look-ahead capital detection — punctuation alone is
  // NOT enough. The next line must begin with an uppercase letter.
  // Guards against false positives at abbreviations or rare mid-clause
  // periods where the continuation starts lowercase.
  it('does not split when next line starts with lowercase (abbreviation safe)', () => {
    const content = makeContent([
      makeStanzaBlock([
        'See section 3 vs.',
        'subsequent material that follows.',
      ]),
    ])
    const html = render(
      createElement(RichContent, { content, flow: 'sentence' }),
    )
    // Period after `vs.` — but next line begins with lowercase `s`
    // → no split. Last-line-always-boundary rule still emits a single
    // grouping that contains both lines.
    const sentencePs = (html.match(/data-role="sentence"/g) ?? []).length
    expect(sentencePs).toBe(1)
    const stripped = html.replace(/<[^>]+>/g, '')
    expect(stripped).toContain('See section 3 vs. subsequent material that follows.')
  })

  // FR-161 R-16: colon `:` is a sentence terminator — clauses introduced
  // by colons in liturgical Mongolian frequently start a new
  // capitalized sentence.
  it('treats colon ":" as a sentence boundary when next line starts uppercase', () => {
    const content = makeContent([
      makeStanzaBlock([
        'Гуйж байна:',
        'Хайрт Эцэг минь, биднийг хайрла.',
      ]),
    ])
    const html = render(
      createElement(RichContent, { content, flow: 'sentence' }),
    )
    const sentencePs = (html.match(/data-role="sentence"/g) ?? []).length
    expect(sentencePs).toBe(2)
    const stripped = html.replace(/<[^>]+>/g, '')
    expect(stripped).toContain('Гуйж байна:')
    expect(stripped).toContain('Хайрт Эцэг минь, биднийг хайрла.')
  })
})

