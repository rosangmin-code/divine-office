import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import fs from 'fs'
import path from 'path'
import { RichContent } from '../../../components/prayer-sections/rich-content'
import type { PrayerBlock, PrayerText, PrayerSpan } from '../../types'

interface RichLine {
  spans: PrayerSpan[]
  indent: 0 | 1 | 2
  role?: 'refrain' | 'doxology'
}

/**
 * GOAL #204 [#204-sub-2] — Psalm 139:1-18 "бодлуудыг" stanza split.
 *
 * DEFECT (parsed_data/full_pdf.txt:16071-16083, page boundary 464->465):
 *   The colon "Та хаа холоос миний санаа бодлуудыг ойлгодог." (Ps 139:2b —
 *   "you discern my thoughts from far away") wraps across two physical book
 *   lines (16074 "…бодлуудыг" / 16082 "ойлгодог.") which the page break split
 *   with the page header "465 / Лхагва гарагийн орой / 465" inserted between
 *   them. In the rich render data the colon's two lines are grouped by a
 *   `phrases[]` entry (lineRange + indent); the page break left "ойлгодог." as
 *   its OWN phrase at indent 0 (flush) while its colon head "…бодлуудыг" is a
 *   phrase at indent 1. The render then showed "ойлгодог." as a separate
 *   flush-left line broken off from its phrase (user screenshot
 *   Screenshot_20260624_180522).
 *
 * FIX (surgical, source-faithful — text byte-preserved, only the split
 *   structure repaired; each file parallel to its own v1 convention; MT 금지):
 *   - rich (psalter-texts.rich.json — the live render): merge the two phrases
 *     into ONE `{lineRange:[head,tail], indent:1}`, exactly mirroring v1's
 *     phrase `{lineRange:[1,2], indent:0}` which groups "Аяа ЭЗЭН, Та намайг
 *     судлан," + "намайг мэдсэн билээ." into one rendered phrase. The tail
 *     line's own `indent` is also realigned 0->1 to match its phrase head.
 *   - plain (psalter-texts.json): merge the two array elements into one
 *     "  Та хаа холоос миний санаа бодлуудыг ойлгодог." — mirrors plain v1,
 *     which merges the wrapped colon into a single entry.
 *
 * @fr NFR-009 (book-faithful Mongolian body text)
 */
const REPO_ROOT = process.cwd()
const PLAIN_PATH = path.join(REPO_ROOT, 'src/data/loth/psalter-texts.json')
const RICH_PATH = path.join(
  REPO_ROOT,
  'src/data/loth/prayers/commons/psalter-texts.rich.json',
)

const PSALM_KEY = 'Psalm 139:1-18'
const COLON_HEAD = 'Та хаа холоос миний санаа бодлуудыг'
const COLON_TAIL = 'ойлгодог.'
const MERGED_PLAIN = '  Та хаа холоос миний санаа бодлуудыг ойлгодог.'

interface RichPhrase {
  lineRange: [number, number]
  indent: 0 | 1 | 2
}

const plain = JSON.parse(fs.readFileSync(PLAIN_PATH, 'utf-8')) as Record<
  string,
  { stanzas: string[][] }
>
const rich = JSON.parse(fs.readFileSync(RICH_PATH, 'utf-8')) as Record<
  string,
  { stanzasRich: { blocks: PrayerBlock[] } }
>

function lineText(l: RichLine): string {
  return (l.spans ?? [])
    .map((s: PrayerSpan) => ('text' in s ? s.text : ''))
    .join('')
}

const blocks = rich[PSALM_KEY].stanzasRich.blocks
const block = blocks.find(
  (b) =>
    'lines' in b &&
    b.lines &&
    (b.lines as RichLine[]).some((l) => lineText(l) === COLON_TAIL),
)!
const richLines = (block as { lines: RichLine[] }).lines
const phrases = (block as unknown as { phrases: RichPhrase[] }).phrases
const headIdx = richLines.findIndex((l) => lineText(l) === COLON_HEAD)
const tailIdx = richLines.findIndex((l) => lineText(l) === COLON_TAIL)

describe('GOAL #204 — Psalm 139 "бодлуудыг ойлгодог" stanza split repair', () => {
  describe('plain psalter-texts.json (merged, parallel to v1)', () => {
    const stanza = plain[PSALM_KEY].stanzas[0]

    it('carries the merged colon as a single element', () => {
      expect(stanza).toContain(MERGED_PLAIN)
    })

    it('no longer carries the broken-off bare "ойлгодог." element', () => {
      expect(stanza).not.toContain(COLON_TAIL)
      expect(stanza).not.toContain(`  ${COLON_HEAD}`)
    })
  })

  describe('rich psalter-texts.rich.json (phrases — the render driver)', () => {
    it('the colon head & tail are consecutive lines in the same stanza', () => {
      expect(headIdx).toBeGreaterThanOrEqual(0)
      expect(tailIdx).toBe(headIdx + 1)
    })

    it('ONE phrase spans both colon lines (no standalone flush "ойлгодог." phrase)', () => {
      const covering = phrases.filter(
        (p) => p.lineRange[0] <= tailIdx && p.lineRange[1] >= tailIdx,
      )
      // exactly one phrase covers the tail line, and it also covers the head
      expect(covering).toHaveLength(1)
      expect(covering[0].lineRange).toEqual([headIdx, tailIdx])
      // and it is indented (level 1) like its colon head — not flush (0)
      expect(covering[0].indent).toBe(1)
      // no phrase is the bare flush tail [tailIdx, tailIdx]
      const bareTail = phrases.find(
        (p) =>
          p.lineRange[0] === tailIdx &&
          p.lineRange[1] === tailIdx &&
          p.indent === 0,
      )
      expect(bareTail).toBeUndefined()
    })

    it('the tail line’s own indent is realigned to its phrase head (1)', () => {
      expect(richLines[headIdx].indent).toBe(1)
      expect(richLines[tailIdx].indent).toBe(1)
    })
  })

  // DV1 render-boundary — render the REAL stanza via production RichContent and
  // assert "бодлуудыг" + "ойлгодог." render inside ONE phrase span (space-joined,
  // indented pl-12), not as a separate flush phrase.
  describe('RichContent render boundary (real DOM)', () => {
    const content: PrayerText = { blocks }

    it('renders the colon head and tail contiguously within one indented phrase', () => {
      const markup = renderToStaticMarkup(
        createElement(RichContent, { content }),
      )
      // Contiguous: head </span> <space span> <tail> — only possible when both
      // lines belong to the SAME phrase. Pre-fix they were separate phrases.
      expect(markup).toContain(
        `${COLON_HEAD}</span><span> </span><span>${COLON_TAIL}</span>`,
      )
      // The enclosing phrase is indented (pl-12), the same level as the head.
      const m = markup.match(
        /class="([^"]*)"[^>]*><span>Та хаа холоос миний санаа бодлуудыг<\/span>/,
      )
      expect(m, 'merged phrase span should render').not.toBeNull()
      expect(m![1]).toContain('pl-12')
    })

    it('RED guard: un-merging the phrase makes "ойлгодог." a separate flush phrase', () => {
      // Reconstruct the pre-fix phrase shape: split [head,tail]/indent1 back
      // into [head,head]/indent1 + [tail,tail]/indent0, mirroring the page-break
      // artifact. Proves the contiguity assertion above actually bites.
      const buggy: PrayerBlock[] = JSON.parse(JSON.stringify(blocks))
      const bb = buggy.find(
        (b) =>
          'lines' in b &&
          b.lines &&
          (b.lines as RichLine[]).some((l) => lineText(l) === COLON_TAIL),
      ) as unknown as { phrases: RichPhrase[] }
      const idx = bb.phrases.findIndex(
        (p) => p.lineRange[0] === headIdx && p.lineRange[1] === tailIdx,
      )
      bb.phrases.splice(
        idx,
        1,
        { lineRange: [headIdx, headIdx], indent: 1 },
        { lineRange: [tailIdx, tailIdx], indent: 0 },
      )
      const markup = renderToStaticMarkup(
        createElement(RichContent, { content: { blocks: buggy } }),
      )
      expect(markup).not.toContain(
        `${COLON_HEAD}</span><span> </span><span>${COLON_TAIL}</span>`,
      )
    })
  })
})
