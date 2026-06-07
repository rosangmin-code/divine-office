import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { RichContent } from '../rich-content'
import type { PrayerBlock, PrayerText } from '@/lib/types'
import hymn37 from '@/data/loth/prayers/hymns/37.rich.json'

/**
 * TEAM GOAL #13 — Магтуу (#37 'Дээдийн дээд') within-stanza paragraph
 * boundary rendering (DOGFOODING; GOAL#7 RCA Approach 1).
 *
 * Bug: hymn stanzas render as one undifferentiated block because
 * `rich-content.tsx` (the hymn render path) IGNORED `block.paragraphBoundaries`,
 * unlike `psalm-block.tsx` which already applies an `mt-3` paragraph gap at
 * boundary indices (L148-153/194 phrase path + L211-218/241 legacy line path).
 *
 * These assertions lock the POST-FIX render contract and are intentionally
 * RED before the rich-content.tsx change:
 *   - [PHRASE +] phrases whose first line is in paragraphBoundaries get
 *     `mt-3` + `data-paragraph-boundary="true"`.
 *   - [PHRASE -] absent paragraphBoundaries → NO extra gap (existing hymns
 *     unaffected — the `?? []` no-op guard).
 *   - [LINE +/-] same contract on the legacy (phrases-absent) line path.
 *   - [#37 DATA] the real 37.rich.json (paragraphBoundaries [2,6,8]) renders
 *     exactly 3 paragraph gaps before the expected stanza-opening lines.
 *
 * Mirror of psalm-block.tsx; non-regression for psalm/canticle is covered by
 * the unchanged psalm-block-phrases.test.ts suite. Mongolian text quoted
 * verbatim from PDF-sourced data (citation exception).
 */

function render(content: PrayerText, flush = false): string {
  return renderToStaticMarkup(createElement(RichContent, { content, flush }))
}

function phraseStanza(
  lineTexts: string[],
  paragraphBoundaries?: number[],
): PrayerText {
  return {
    blocks: [
      {
        kind: 'stanza',
        lines: lineTexts.map((text) => ({
          spans: [{ kind: 'text', text }],
          indent: 0,
        })),
        phrases: lineTexts.map((_, i) => ({
          lineRange: [i, i],
          indent: 0,
        })),
        ...(paragraphBoundaries ? { paragraphBoundaries } : {}),
      } as PrayerBlock,
    ],
  }
}

function lineStanza(
  lineTexts: string[],
  paragraphBoundaries?: number[],
): PrayerText {
  return {
    blocks: [
      {
        kind: 'stanza',
        lines: lineTexts.map((text) => ({
          spans: [{ kind: 'text', text }],
          indent: 0,
        })),
        ...(paragraphBoundaries ? { paragraphBoundaries } : {}),
      } as PrayerBlock,
    ],
  }
}

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1
}

const SIX = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5']

describe('TEAM GOAL #13 — RichContent within-stanza paragraph boundaries', () => {
  describe('[PHRASE path] (hymn flush=true — the Магтуу render path)', () => {
    it('+ phrases whose start line is in paragraphBoundaries get mt-3 + data-paragraph-boundary', () => {
      const html = render(phraseStanza(SIX, [2, 4]), true)
      // RED before fix: rich-content.tsx ignores paragraphBoundaries.
      expect(countOccurrences(html, 'data-paragraph-boundary="true"')).toBe(2)
      expect(countOccurrences(html, 'mt-3')).toBe(2)
    })

    it('- absent paragraphBoundaries → NO extra gap (existing hymns unaffected)', () => {
      const html = render(phraseStanza(SIX), true)
      expect(html).not.toContain('data-paragraph-boundary')
      expect(html).not.toContain('mt-3')
    })

    it('- empty paragraphBoundaries array → NO extra gap (defensive ?? [] no-op)', () => {
      const html = render(phraseStanza(SIX, []), true)
      expect(html).not.toContain('data-paragraph-boundary')
      expect(html).not.toContain('mt-3')
    })
  })

  describe('[LINE path] (phrases absent — legacy line render)', () => {
    it('+ lines at paragraphBoundaries get mt-3 + data-paragraph-boundary', () => {
      const html = render(lineStanza(SIX, [1, 3, 5]))
      // RED before fix.
      expect(countOccurrences(html, 'data-paragraph-boundary="true"')).toBe(3)
      expect(countOccurrences(html, 'mt-3')).toBe(3)
    })

    it('- absent paragraphBoundaries → NO extra gap', () => {
      const html = render(lineStanza(SIX))
      expect(html).not.toContain('data-paragraph-boundary')
      expect(html).not.toContain('mt-3')
    })
  })

  describe('[#37 DATA] real hymn 37.rich.json (Дээдийн дээд) renders 4 stanzas', () => {
    it('renders exactly 3 paragraph gaps before lines 2/6/8 with the expected opening text', () => {
      const content = hymn37.hymnRich as unknown as PrayerText
      const html = render(content, true)
      // RED before fix: data has no paragraphBoundaries AND renderer ignores it.
      expect(countOccurrences(html, 'data-paragraph-boundary="true"')).toBe(3)
      // The three boundary phrases open new stanzas (PDF p906 breaks).
      // line 2 + line 8 = 'Магтан дуулъя ...'; line 6 = 'Мөнхийн ...'.
      // Each boundary span carries the mt-3 gap class.
      const boundaryChunks = html
        .split('data-paragraph-boundary="true"')
        .slice(1)
        .map((c) => c.slice(0, 200))
      // every boundary span also carries mt-3
      for (const chunk of boundaryChunks) {
        expect(chunk).toContain('mt-3')
      }
      // the opening texts of the 2nd/3rd/4th stanzas are present at boundaries
      expect(html).toContain('Мөнхийн мөнх хайрын дээд болсон Эзэн')
      expect(html).toContain('Магтан дуулъя Эзэний нэрийг')
    })
  })
})
