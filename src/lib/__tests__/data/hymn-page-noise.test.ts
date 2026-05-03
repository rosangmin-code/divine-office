import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * F-X7 (#299) regression guard — assert that the PDF hymn-page header
 * label 'Магтуу' has not leaked back into hymn rich.json bodies as
 * standalone single-word stanzas or first-line-of-stanza tokens.
 *
 * History: when 122 hymns were transcribed from PDF, the page header
 * 'Магтуу' (which sits at the top of every hymn-section page) was
 * captured at page boundaries and ended up either as a single-line
 * stanza ['Магтуу'] between dividers, or as the first line of an
 * otherwise-real stanza. F-X7 surgically removed all 16 occurrences
 * across 14 files. This test guards the cleanup and would fail if a
 * future rebuild from PDF or hand-edit reintroduces the noise.
 *
 * Note: this only forbids the standalone uppercase 'Магтуу' page label.
 * Inflected forms ('магтуунуудыг', 'магтууг', etc.) remain valid body
 * content — they are part of meaningful sentences. Lowercase 'магтуу'
 * as a word in body sentences is also acceptable.
 */

const HYMN_DIR = path.resolve(__dirname, '../../../../src/data/loth/prayers/hymns')
const PAGE_LABEL = 'Магтуу'

interface Span { kind?: string; text?: string }
interface Line { spans?: Span[]; indent?: number }
interface Block { kind?: string; lines?: Line[] }
interface RichDoc { hymnRich?: { blocks?: Block[] } }

function findNoise() {
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

describe('F-X7 hymn page-noise regression guard', () => {
  it("no standalone 'Магтуу' page-header tokens leak into hymn rich.json bodies", () => {
    const hits = findNoise()
    expect(
      hits,
      `${hits.length} page-noise tokens found:\n${hits
        .map((h) => `  ${h.file} block[${h.block}] line[${h.line}] shape=${h.shape}`)
        .join('\n')}`,
    ).toEqual([])
  })
})
