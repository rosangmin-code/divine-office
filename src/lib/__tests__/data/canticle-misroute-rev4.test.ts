import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * GOAL #290 [D1]/[D2] dogfooding — page-boundary misroute fix.
 *
 * DEFECT: the NT canticle 'Revelation 4:11; 5:9-10, 12' was MISSING its
 * Rev 4:11b lines; page-boundary noise (parsed_data/full_pdf.txt:3413-3419)
 * split the verse and the extractor misrouted the 2 bridge lines into the
 * PRECEDING 'Psalm 21:2-8, 14' entry as a spurious stanza.
 *
 * Source (parsed_data/full_pdf.txt:3409-3437):
 *   L3409-3412 Rev 4:11a … 'Учир нь Та бүх юмсыг бүтээсэн билээ.'
 *   [page noise L3413-3419]
 *   L3420      'Таны хүслийн улмаас'
 *   L3421-3422 'Тэдгээр нь тогтоогдсон бөгөөд' / 'бүтээгдсэн юм.' (stored joined)
 *   L3423+     Rev 5:9 'Эзэн болох Христ минь,'
 *
 * Expected strings derived by READING full_pdf.txt + the in-repo data — NOT
 * retyped from memory (NFR-002, no machine-translation). Both the base SoT and
 * its generated rich mirror are app-consumed, so both must carry the fix.
 */
const REPO_ROOT = process.cwd()
const BASE_PATH = path.join(REPO_ROOT, 'src/data/loth/psalter-texts.json')
const RICH_PATH = path.join(
  REPO_ROOT,
  'src/data/loth/prayers/commons/psalter-texts.rich.json',
)

const CANTICLE_REF = 'Revelation 4:11; 5:9-10, 12'
const PSALM21_REF = 'Psalm 21:2-8, 14'
// Rev 4:11b bridge lines (full_pdf.txt:3420-3422; the last two source lines
// are joined into one stored line).
const LINE_A = 'Таны хүслийн улмаас'
const LINE_B = 'Тэдгээр нь тогтоогдсон бөгөөд бүтээгдсэн юм.'
// Rev 4:11a closing line the bridge must immediately follow (full_pdf.txt:3412).
const ANCHOR = 'Учир нь Та бүх юмсыг бүтээсэн билээ.'
// Rev 5:9 stanza incipit that must stay AFTER the bridge (full_pdf.txt:3423).
const REV5_INCIPIT = 'Эзэн болох Христ минь,'

interface PsalterEntry {
  stanzas: string[][]
}
type PsalterTexts = Record<string, PsalterEntry>

interface RichSpan {
  kind: string
  text: string
}
interface RichLine {
  spans: RichSpan[]
  indent?: number
}
interface RichBlock {
  kind: string
  lines?: RichLine[]
  paragraphBoundaries?: number[]
}
interface RichEntry {
  stanzasRich?: { blocks: RichBlock[] }
}
type RichTexts = Record<string, RichEntry>

const baseRaw = fs.readFileSync(BASE_PATH, 'utf-8')
const richRaw = fs.readFileSync(RICH_PATH, 'utf-8')
const base = JSON.parse(baseRaw) as PsalterTexts
const rich = JSON.parse(richRaw) as RichTexts

function baseEntry(ref: string): PsalterEntry {
  const entry = base[ref]
  if (!entry) throw new Error(`base entry not found: ${ref}`)
  return entry
}
function baseLines(ref: string): string[] {
  return baseEntry(ref)
    .stanzas.flat()
    .map((l) => l.trim())
}
function richLines(ref: string): string[] {
  const entry = rich[ref]
  if (!entry?.stanzasRich) throw new Error(`rich entry not found: ${ref}`)
  const out: string[] = []
  for (const block of entry.stanzasRich.blocks) {
    for (const line of block.lines ?? []) {
      out.push(line.spans.map((s) => s.text).join('').trim())
    }
  }
  return out
}
function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1
}

describe('GOAL #290 — Rev 4:11b canticle misroute fix', () => {
  describe('[D1] canticle complete & continuous (base SoT)', () => {
    const lines = baseLines(CANTICLE_REF)

    it('contains both Rev 4:11b bridge lines', () => {
      expect(lines).toContain(LINE_A)
      expect(lines).toContain(LINE_B)
    })

    it('places the bridge lines immediately after Rev 4:11a closing, in source order', () => {
      const anchorIdx = lines.indexOf(ANCHOR)
      expect(anchorIdx).toBeGreaterThanOrEqual(0)
      expect(lines[anchorIdx + 1]).toBe(LINE_A)
      expect(lines[anchorIdx + 2]).toBe(LINE_B)
    })

    it('keeps the Rev 5:9 stanza after the bridge', () => {
      const idxBridge = lines.indexOf(LINE_B)
      const idxRev5 = lines.indexOf(REV5_INCIPIT)
      expect(idxBridge).toBeGreaterThanOrEqual(0)
      expect(idxRev5).toBeGreaterThan(idxBridge)
    })
  })

  describe('[D2] Psalm 21 clean — no foreign fragment (base SoT)', () => {
    it('contains NEITHER bridge line', () => {
      const lines = baseLines(PSALM21_REF)
      expect(lines).not.toContain(LINE_A)
      expect(lines).not.toContain(LINE_B)
    })

    it('has exactly 3 stanzas (spurious stanza removed)', () => {
      expect(baseEntry(PSALM21_REF).stanzas).toHaveLength(3)
    })
  })

  describe('each bridge line occurs exactly once across SoT + rich mirror', () => {
    it('base psalter-texts.json: LINE_A x1, LINE_B x1', () => {
      expect(countOccurrences(baseRaw, LINE_A)).toBe(1)
      expect(countOccurrences(baseRaw, LINE_B)).toBe(1)
    })

    it('rich psalter-texts.rich.json: LINE_A x1, LINE_B x1', () => {
      expect(countOccurrences(richRaw, LINE_A)).toBe(1)
      expect(countOccurrences(richRaw, LINE_B)).toBe(1)
    })
  })

  describe('rich mirror mirrors the correction', () => {
    it('canticle rich block contains both bridge lines', () => {
      const lines = richLines(CANTICLE_REF)
      expect(lines).toContain(LINE_A)
      expect(lines).toContain(LINE_B)
    })

    it('Psalm 21 rich block contains neither bridge line', () => {
      const lines = richLines(PSALM21_REF)
      expect(lines).not.toContain(LINE_A)
      expect(lines).not.toContain(LINE_B)
    })

    // #298/#303 regression guard: Rev 4:11 is ONE continuous verse
    // (full_pdf.txt:3409-3422 — only page-break noise internally, no blank-line
    // stanza separator), so the canticle's first stanza block must carry NO
    // within-stanza paragraph boundary. #298 set paragraphBoundaries [5]->[] to
    // remove a spurious mt-3 gap rendered ABOVE the last line (before-line
    // semantics, types.ts F-X11). Without this assertion a future rich regen
    // could silently re-introduce [5] and every other test would stay green.
    // toEqual deep-compares: [5] !== [], so a re-introduced gap FAILS here.
    // `?? []` treats an absent field as "no gap" (also a pass) while still
    // failing on any non-empty boundary array.
    it('canticle first stanza block has NO within-stanza gap (paragraphBoundaries === [])', () => {
      const entry = rich[CANTICLE_REF]
      if (!entry?.stanzasRich) {
        throw new Error(`rich entry not found: ${CANTICLE_REF}`)
      }
      const block0 = entry.stanzasRich.blocks[0]
      expect(block0.paragraphBoundaries ?? []).toEqual([])
    })
  })
})
