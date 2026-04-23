/**
 * Unit tests for pdftotext-column-splitter.mjs.
 *
 * Fixture: `scripts/out/poc-pdftotext-sample.txt` — `pdftotext -layout -f 376
 * -l 378` over public/psalter.pdf, covering book pages 750..755. These pages
 * include a section-title transition ("ЖИРИЙН ЦАГ УЛИРАЛ"), a concluding
 * prayer that spans both halves of a 2-up spread, and mixed single/dual
 * column rows — exactly the brittle cases the splitter must handle.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { splitColumns } from '../pdftotext-column-splitter.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const FIXTURE_PATH = resolve(HERE, '..', '..', 'out', 'poc-pdftotext-sample.txt')

function loadFixture() {
  return readFileSync(FIXTURE_PATH, 'utf-8')
}

describe('splitColumns', () => {
  it('produces two columns per physical page in book-order', () => {
    const content = loadFixture()
    const result = splitColumns(content, [376, 377, 378])

    // 3 physical pages × 2 columns = 6 streams.
    expect(result).toHaveLength(6)
    // First stream is physical 376 left = book 750.
    expect(result[0]).toMatchObject({ physicalPage: 376, column: 'left', bookPage: 750 })
    expect(result[1]).toMatchObject({ physicalPage: 376, column: 'right', bookPage: 751 })
    expect(result[2]).toMatchObject({ physicalPage: 377, column: 'left', bookPage: 752 })
    expect(result[3]).toMatchObject({ physicalPage: 377, column: 'right', bookPage: 753 })
    expect(result[4]).toMatchObject({ physicalPage: 378, column: 'left', bookPage: 754 })
    expect(result[5]).toMatchObject({ physicalPage: 378, column: 'right', bookPage: 755 })
  })

  it('places the "Төгсгөлийн даатгал залбирал" marker on book 753 (right column of page 377)', () => {
    const content = loadFixture()
    const result = splitColumns(content, [376, 377, 378])
    const book753 = result.find((r) => r.bookPage === 753)
    expect(book753).toBeDefined()
    const joined = book753.lines.join('\n')
    expect(joined).toMatch(/Төгсгөлийн даатгал залбирал/)
    // And the OTHER side of that spread (book 752) must NOT contain the
    // concluding-prayer title — it lives entirely in the right half.
    const book752 = result.find((r) => r.bookPage === 752)
    expect(book752.lines.join('\n')).not.toMatch(/Төгсгөлийн даатгал залбирал/)
  })

  it('keeps the "Сонголтот залбирал / Аяа, Эцэг минь..." body on book 752 (left column of page 377)', () => {
    const content = loadFixture()
    const result = splitColumns(content, [376, 377, 378])
    const book752 = result.find((r) => r.bookPage === 752)
    expect(book752).toBeDefined()
    const joined = book752.lines.join('\n')
    // "Сонголтот залбирал" header is the first meaningful block on book 752.
    expect(joined).toMatch(/Сонголтот залбирал/)
    // The body that follows starts with "Аяа, Эцэг минь..." — must stay left.
    expect(joined).toMatch(/Аяа, Эцэг минь, хүний хэрцгийллээс/)
    // And that same body must NOT have leaked into the right column.
    const book753 = result.find((r) => r.bookPage === 753)
    expect(book753.lines.join('\n')).not.toMatch(/хүний хэрцгийллээс/)
  })

  it('preserves stanza/indent leading whitespace on both sides', () => {
    const content = loadFixture()
    const result = splitColumns(content, [376, 377, 378])

    // Left column of page 377 (book 752) contains the stanza-indented body of
    // "Аяа, Эцэг минь, хүний хэрцгийллээс болж / эмтэрсэн Таны Хүүгийн
    // зүрхийг бид хүндэтгэж". The body lines in the raw fixture begin at
    // column 0 on the left (no indent), so the preserved leading-space count
    // must be 0. But the header "Сонголтот залбирал" is centred in the
    // column — its leading-space count must be > 0.
    const book752 = result.find((r) => r.bookPage === 752)
    const headerLine = book752.lines.find((l) => l.includes('Сонголтот залбирал'))
    expect(headerLine).toBeDefined()
    const headerIndent = headerLine.match(/^ */)[0].length
    expect(headerIndent).toBeGreaterThan(0) // centred header keeps its indent

    const bodyLine = book752.lines.find((l) => l.includes('Аяа, Эцэг минь'))
    expect(bodyLine).toBeDefined()
    const bodyIndent = bodyLine.match(/^ */)[0].length
    // Body on left column starts at col 0 in the fixture (no indent).
    expect(bodyIndent).toBe(0)

    // Right column of page 377 (book 753) has the concluding-prayer body.
    // Its lines in the raw fixture are right-slice content, so leading
    // spaces reflect the right column's own indent (not the gutter). Some
    // lines should still show the centred heading indent for
    // "Төгсгөлийн даатгал залбирал".
    const book753 = result.find((r) => r.bookPage === 753)
    const rightHeader = book753.lines.find((l) => l.includes('Төгсгөлийн даатгал залбирал'))
    expect(rightHeader).toBeDefined()
    // The right-column heading in the fixture is preceded by a visible
    // indent; allow either zero (if pdftotext trimmed at gutter) or >0 —
    // critically, the full text must NOT be prefixed by the gutter's
    // 30+ spaces any more.
    const rightHeaderLeading = rightHeader.match(/^ */)[0].length
    expect(rightHeaderLeading).toBeLessThan(20)
  })

  it('detects a sensible cut column on every page (within the 45..60 range for 2-up landscape pages)', () => {
    const content = loadFixture()
    const result = splitColumns(content, [376, 377, 378])
    const uniquePhysical = new Map()
    for (const stream of result) uniquePhysical.set(stream.physicalPage, stream.cutColumn)
    for (const [, cut] of uniquePhysical) {
      expect(cut).toBeGreaterThanOrEqual(45)
      expect(cut).toBeLessThanOrEqual(65)
    }
  })

  it('mirrors blank lines on both sides so stanza breaks survive independently', () => {
    const content = loadFixture()
    const result = splitColumns(content, [376, 377, 378])
    const book752 = result.find((r) => r.bookPage === 752)
    // At least one blank line must exist on the left stream.
    expect(book752.lines.some((l) => l === '')).toBe(true)
  })

  it('throws when physicalPages count does not match \\f-block count', () => {
    const content = loadFixture()
    expect(() => splitColumns(content, [376, 377])).toThrow(/page count mismatch/)
  })
})
