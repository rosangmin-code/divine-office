import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * F-X7 (#299) + F-X7b (#317) regression guard — assert that the PDF
 * hymn-page header label 'Магтуу' has not leaked back into either of
 * the two hymn render paths as standalone page-noise tokens.
 *
 * History: when 122 hymns were transcribed from PDF, the page header
 * 'Магтуу' (which sits at the top of every hymn-section page) was
 * captured at page boundaries and ended up either as a single-line
 * stanza ['Магтуу'] between dividers, or as the first line of an
 * otherwise-real stanza in the rich path; and as a standalone token
 * line inside the `text` field in the plain-text path. F-X7 removed
 * all 16 occurrences from rich.json (14 files); F-X7b removed all 16
 * occurrences from ordinarium/hymns.json (14 hymns). The plain-text
 * path matters because hymn-section.tsx falls back to it whenever the
 * user picks a non-default candidate via the '다른 찬미가' menu
 * (`useRich` gate is false for alt-pick).
 *
 * Note: this only forbids the standalone uppercase 'Магтуу' page label.
 * Inflected forms ('магтуунуудыг', 'магтууг', etc.) remain valid body
 * content — they are part of meaningful sentences. Lowercase 'магтуу'
 * as a word in body sentences is also acceptable.
 */

const ROOT = path.resolve(__dirname, '../../../..')
const HYMN_DIR = path.join(ROOT, 'src/data/loth/prayers/hymns')
const ORDINARIUM_HYMNS = path.join(ROOT, 'src/data/loth/ordinarium/hymns.json')
const PAGE_LABEL = 'Магтуу'

interface Span { kind?: string; text?: string }
interface Line { spans?: Span[]; indent?: number }
interface Block { kind?: string; lines?: Line[] }
interface RichDoc { hymnRich?: { blocks?: Block[] } }

function findRichNoise() {
  const out: Array<{ file: string; block: number; line: number; shape: string }> = []
  const files = fs
    .readdirSync(HYMN_DIR)
    .filter((f) => /^\d+\.rich\.json$/.test(f))
  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(HYMN_DIR, f), 'utf8')) as RichDoc
    const blocks = data?.hymnRich?.blocks || []
    blocks.forEach((b, i) => {
      if (b.kind !== 'stanza') return
      const lines = b.lines || []
      lines.forEach((ln, j) => {
        const text = (ln.spans || []).map((s) => s.text || '').join('').trim()
        if (text === PAGE_LABEL) {
          out.push({
            file: f,
            block: i,
            line: j,
            shape: lines.length === 1 ? 'A:single-line-stanza' : 'B:first-line-of-stanza',
          })
        }
      })
    })
  }
  return out
}

interface OrdinariumEntry { title?: string; text?: string; page?: number }

// #330 F-X7b F-2 — pure detector function. Takes an in-memory data map
// (caller-provided) and returns the same hit list the file-reading
// `findOrdinariumNoise()` produces. Splitting parse-from-file from the
// detection logic lets us pin the detector with a synthetic positive
// fixture: a future regex/path/trim refactor that silently breaks
// detection now fails the positive test instead of merely passing the
// data-regression assertion (which only proves "current data is clean",
// not "detector still detects").
export function parseOrdinariumNoise(
  data: Record<string, OrdinariumEntry>,
): Array<{ hymnId: string; line: number }> {
  const out: Array<{ hymnId: string; line: number }> = []
  for (const [id, entry] of Object.entries(data)) {
    if (!entry || typeof entry !== 'object') continue
    const text = entry.text
    if (typeof text !== 'string' || !text.includes(PAGE_LABEL)) continue
    const lines = text.split('\n')
    lines.forEach((line, idx) => {
      if (line.trim() === PAGE_LABEL) {
        out.push({ hymnId: id, line: idx })
      }
    })
  }
  return out
}

function findOrdinariumNoise() {
  const data = JSON.parse(fs.readFileSync(ORDINARIUM_HYMNS, 'utf8')) as Record<
    string,
    OrdinariumEntry
  >
  return parseOrdinariumNoise(data)
}

describe('F-X7 hymn page-noise regression guard', () => {
  it("rich path: no standalone 'Магтуу' tokens in src/data/loth/prayers/hymns/*.rich.json", () => {
    const hits = findRichNoise()
    expect(
      hits,
      `${hits.length} rich-path page-noise tokens found:\n${hits
        .map((h) => `  ${h.file} block[${h.block}] line[${h.line}] shape=${h.shape}`)
        .join('\n')}`,
    ).toEqual([])
  })

  it("plain-text path (alt-pick): no standalone 'Магтуу' lines in src/data/loth/ordinarium/hymns.json text fields", () => {
    const hits = findOrdinariumNoise()
    expect(
      hits,
      `${hits.length} ordinarium-path page-noise tokens found:\n${hits
        .map((h) => `  hymn[${h.hymnId}] line[${h.line}]`)
        .join('\n')}`,
    ).toEqual([])
  })

  // #330 F-X7b F-2 — positive control for the parseOrdinariumNoise()
  // detector. The data-regression assertion above only proves the
  // current ordinarium/hymns.json file is clean; it cannot detect a
  // refactor that silently breaks the detector itself (e.g., a typo
  // in PAGE_LABEL, a wrong split character, or a `.trim()` removal).
  // This synthetic fixture forces a positive hit so any future change
  // that disables detection fails CI immediately.
  it("plain-text path detector returns hits for synthetic data containing 'Магтуу' lines", () => {
    const synthetic: Record<string, OrdinariumEntry> = {
      cleanHymn: { title: 'No noise', text: 'Бид Эзэнийг магтан дуулъя\nАллэлуяа' },
      noiseStrict: {
        title: 'Strict empty around noise',
        text: 'Real verse 1\nМагтуу\nReal verse 2',
      },
      noiseWhitespace: {
        title: 'Whitespace-padded noise',
        text: 'verse a\n  Магтуу  \nverse b',
      },
      missingText: { title: 'No text field' },
      inflectedNotMatched: {
        title: 'Inflected form is body, not noise',
        text: 'Магтууг нь дуулъя гэж бид амласан', // "Магтууг" mid-sentence — does NOT match
      },
    }
    const hits = parseOrdinariumNoise(synthetic)
    // Two distinct hymns produce hits (strict + whitespace-padded);
    // each appears at exactly line index 1 within its own text block.
    expect(hits).toEqual([
      { hymnId: 'noiseStrict', line: 1 },
      { hymnId: 'noiseWhitespace', line: 1 },
    ])
  })

  // #330 F-X7b F-2 — negative control. Hymns whose text field has
  // `Магтуу` only as a substring (inflected form, mid-sentence) must
  // NOT register. Pins the `line.trim() === PAGE_LABEL` exact-match
  // contract so a future relaxation to substring matching is caught.
  it('plain-text path detector ignores inflected/embedded forms', () => {
    const synthetic: Record<string, OrdinariumEntry> = {
      inflected: { title: 'Inflected', text: 'Магтуунуудыг бид дуулъя' },
      embedded: { title: 'Embedded', text: 'Энэ Магтуу гэдэг нь утгатай' },
      lowercase: { title: 'Lowercase', text: 'магтуу гэсэн нь өөр зүйл' },
    }
    expect(parseOrdinariumNoise(synthetic)).toEqual([])
  })
})
