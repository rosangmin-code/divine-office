/**
 * Unit tests for FR-161 R-4 — `PsalmBlock` phrase-render branch.
 *
 * Asserts the renderer's contract per planer plan §4 (Option B):
 *   - phrases absent → legacy line-by-line render (regression-safe additive)
 *   - phrases present → join `block.lines.slice(start, end+1)` with a space,
 *     emit one viewport-wrappable block per phrase
 *   - phrase.indent (0|1|2) → CSS indent class
 *   - phrase.role ('refrain'|'doxology') → role-tagged data-role + colour/italic
 *
 * Render via `react-dom/server` so tests run without jsdom (matches the
 * existing pattern in `directive-block.test.ts`). The rendered HTML is
 * structural-snapshot inspected via class / data-role substring asserts —
 * NOT exact string match, so cosmetic class re-ordering does not flake.
 */

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { PsalmBlock } from '../psalm-block'
import { SettingsProvider } from '@/lib/settings'
import type { AssembledPsalm, PhraseGroup, PrayerBlock, PrayerText } from '@/lib/types'

function makeStanzaBlock(
  lineTexts: string[],
  options: { phrases?: PhraseGroup[]; lineIndents?: (0 | 1 | 2)[] } = {},
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

function makePsalm(blocks: PrayerBlock[]): AssembledPsalm {
  const stanzasRich: PrayerText = { blocks }
  return {
    psalmType: 'psalm',
    reference: 'Psalm test',
    antiphon: 'test antiphon',
    verses: [],
    stanzasRich,
    gloriaPatri: false,
  }
}

function render(node: React.ReactElement): string {
  // Wrap in SettingsProvider — PsalmBlock calls useSettings().
  return renderToStaticMarkup(
    createElement(SettingsProvider, null, node),
  )
}

// @fr FR-161
describe('PsalmBlock — phrase render branch (FR-161 R-4)', () => {
  it('renders legacy line-by-line when phrases is absent (no regression)', () => {
    const psalm = makePsalm([
      makeStanzaBlock(['Газар хийгээд', 'түүнийг дүүргэдэг бүхэн,']),
    ])
    const html = render(createElement(PsalmBlock, { psalm }))
    // Legacy outer keeps `whitespace-pre-line`.
    expect(html).toContain('whitespace-pre-line')
    // No phrase render-mode marker.
    expect(html).not.toContain('data-render-mode="phrase"')
    // Both lines appear as separate <span class="block">.
    expect(html).toContain('Газар хийгээд')
    expect(html).toContain('түүнийг дүүргэдэг бүхэн,')
    const blockSpanCount = (html.match(/<span class="block[^"]*"/g) ?? []).length
    expect(blockSpanCount).toBe(2)
  })

  it('renders a single PhraseGroup as one joined-text span (phrase path)', () => {
    const psalm = makePsalm([
      makeStanzaBlock(['Газар хийгээд', 'түүнийг дүүргэдэг бүхэн,'], {
        phrases: [{ lineRange: [0, 1], indent: 0 }],
      }),
    ])
    const html = render(createElement(PsalmBlock, { psalm }))
    // Phrase-mode marker present.
    expect(html).toContain('data-render-mode="phrase"')
    // Outer drops whitespace-pre-line (phrases own the wrap policy now).
    expect(html).not.toContain('whitespace-pre-line')
    // Lines are joined with a single space — assert the joined string is
    // present whole.
    expect(html).toContain('Газар хийгээд түүнийг дүүргэдэг бүхэн,')
    // Exactly one phrase span (with default data-role="psalm-phrase").
    expect(html).toContain('data-role="psalm-phrase"')
    expect(
      (html.match(/data-role="psalm-phrase[a-z-]*"/g) ?? []).length,
    ).toBe(1)
  })

  it('renders multiple PhraseGroups with correct hanging indent classes (FR-161 R-13)', () => {
    const psalm = makePsalm([
      makeStanzaBlock(['Phrase A start', 'Phrase A wrap', 'Phrase B start'], {
        phrases: [
          { lineRange: [0, 1], indent: 0 },
          { lineRange: [2, 2], indent: 1 },
        ],
      }),
    ])
    const html = render(createElement(PsalmBlock, { psalm }))
    // Two phrase spans.
    const phraseSpans = (html.match(/data-role="psalm-phrase[a-z-]*"/g) ?? []).length
    expect(phraseSpans).toBe(2)
    // First phrase joins lines 0+1 (indent=0 → hanging: `pl-6 -indent-6`).
    expect(html).toContain('Phrase A start Phrase A wrap')
    expect(html).toMatch(/class="block pl-6 -indent-6"[^>]*>Phrase A start Phrase A wrap</)
    // Second phrase indent=1 → hanging: `pl-12 -indent-6`.
    expect(html).toMatch(/class="block pl-12 -indent-6"[^>]*>Phrase B start</)
  })

  // FR-161 R-13: hanging indent — wrap continuation lines indent further
  // than the phrase first-line via `text-indent: -1.5rem` (-indent-6).
  // Visual contract: first-line position preserved at legacy indents
  // (0 / 6 / 12 spacing units); viewport-wrapped continuation lines push
  // in by an additional 1.5rem so wrap is distinguishable from the next
  // phrase boundary. User spec: "구문 wrap 시 들여쓰기".
  it('applies hanging indent classes for all three indent levels (FR-161 R-13)', () => {
    const psalm = makePsalm([
      makeStanzaBlock(['Level 0', 'Level 1', 'Level 2'], {
        phrases: [
          { lineRange: [0, 0], indent: 0 },
          { lineRange: [1, 1], indent: 1 },
          { lineRange: [2, 2], indent: 2 },
        ],
      }),
    ])
    const html = render(createElement(PsalmBlock, { psalm }))
    // indent=0 → pl-6 -indent-6 (first line at 0, wrap +6)
    expect(html).toMatch(/class="block pl-6 -indent-6"[^>]*>Level 0</)
    // indent=1 → pl-12 -indent-6 (first line at 6, wrap +6 = 12)
    expect(html).toMatch(/class="block pl-12 -indent-6"[^>]*>Level 1</)
    // indent=2 → pl-18 -indent-6 (first line at 12, wrap +6 = 18)
    expect(html).toMatch(/class="block pl-18 -indent-6"[^>]*>Level 2</)
  })

  it('marks phrase.role refrain with data-role + red text class', () => {
    const psalm = makePsalm([
      makeStanzaBlock(['Refrain text'], {
        phrases: [{ lineRange: [0, 0], indent: 0, role: 'refrain' }],
      }),
    ])
    const html = render(createElement(PsalmBlock, { psalm }))
    expect(html).toContain('data-role="psalm-phrase-refrain"')
    expect(html).toMatch(/text-red-700/)
    // Joined text present.
    expect(html).toContain('Refrain text')
  })

  it('marks phrase.role doxology with data-role + italic class', () => {
    const psalm = makePsalm([
      makeStanzaBlock(['Doxology line'], {
        phrases: [{ lineRange: [0, 0], indent: 0, role: 'doxology' }],
      }),
    ])
    const html = render(createElement(PsalmBlock, { psalm }))
    expect(html).toContain('data-role="psalm-phrase-doxology"')
    expect(html).toMatch(/italic/)
    expect(html).toContain('Doxology line')
  })

  it('falls back to legacy when phrases is an empty array (defensive)', () => {
    const psalm = makePsalm([
      makeStanzaBlock(['Empty phrases'], { phrases: [] }),
    ])
    const html = render(createElement(PsalmBlock, { psalm }))
    expect(html).not.toContain('data-render-mode="phrase"')
    expect(html).toContain('whitespace-pre-line')
    expect(html).toContain('Empty phrases')
  })

  it('renders mixed: stanza-block-1 with phrases + stanza-block-2 without', () => {
    const psalm = makePsalm([
      makeStanzaBlock(['With phrase'], {
        phrases: [{ lineRange: [0, 0], indent: 0 }],
      }),
      makeStanzaBlock(['Legacy line A', 'Legacy line B']),
    ])
    const html = render(createElement(PsalmBlock, { psalm }))
    // Phrase-mode appears (block 1) + legacy whitespace-pre-line (block 2)
    // BOTH appear on the same page output.
    expect(html).toContain('data-render-mode="phrase"')
    expect(html).toContain('whitespace-pre-line')
    expect(html).toContain('With phrase')
    expect(html).toContain('Legacy line A')
    expect(html).toContain('Legacy line B')
  })
})
