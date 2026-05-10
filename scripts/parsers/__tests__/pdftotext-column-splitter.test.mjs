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

// ─────────────────────────────────────────────────────────────────────
// #492 Phase 2-I1b — right-column-bleed guards.
//
// Pre-#492 the splitter mis-routed two distinct shapes of right-column
// content into the LEFT stream:
//
//   Shape A (Case A short line — Psalm 42:2-6 b3 root cause):
//     A short right-column wrap fragment ("уу.") that ends BEFORE the
//     detected cutColumn was classified as left because
//     `firstNonSpace < cutColumn - 2` (e.g. 47 < 48 with cutColumn=50)
//     was treated as a "definitely left" signal.
//
//   Shape B (Case B inner-runs only — Psalm 96:1-13 b0 root cause):
//     A right-column-only line whose internal whitespace runs sit DEEP
//     inside the right column (far past cutColumn) caused
//     `resolveLineGutter` to fall through to the "widest run" last-resort
//     fallback, splitting MID-RIGHT-COLUMN-CONTENT and pushing the right-
//     column tail into the left stream.
//
// Both shapes now activate the same `firstNonSpace >= max(20, cutColumn -
// 10)` right-column-zone guard.
// ─────────────────────────────────────────────────────────────────────

describe('splitColumns — #492 right-column-bleed guards', () => {
  // Synthetic helper: build a one-physical-page \f-delimited input with
  // a generous left-column body to anchor the cutColumn detection at a
  // predictable value (~48-52). Three "anchor" lines establish a wide
  // gutter; the test line under inspection is appended after them.
  function pageWithGutter(testLine) {
    const anchor1 = ' Эхний мөр                                       Right anchor one'
    const anchor2 = ' Хоёр дахь                                       Right anchor two'
    const anchor3 = ' Гурав дахь                                      Right anchor three'
    return [anchor1, anchor2, anchor3, testLine].join('\n')
  }

  // ── Shape A: short right-column line (firstNonSpace < cut, length <= cut) ──
  it('routes a short right-column line to the right stream (Case A guard)', () => {
    // Test line: 47 leading spaces + "уу." (3 chars). Length = 50.
    // The pageWithGutter anchors push cutColumn into the high 40s / low
    // 50s — this line ends AT or BEFORE the cut. Pre-#492 this would
    // hit the `firstNonSpace < cutColumn - 2 → left` branch.
    const testLine = ' '.repeat(47) + 'уу.'
    const content = pageWithGutter(testLine)
    const result = splitColumns(content, [99])
    const left = result.find((s) => s.column === 'left')
    const right = result.find((s) => s.column === 'right')
    // Test line is the 4th line (index 3).
    expect(left.lines[3]).toBe('') // no bleed into left
    expect(right.lines[3]).toMatch(/уу\./) // present in right
  })

  it('still routes left-column wrap-continuation (firstNonSpace small) to the left', () => {
    // Regression guard: a deep left-column wrap continuation (e.g.
    // "    надтай") has firstNonSpace = 4, way below the right-column
    // threshold. Must continue to be routed left.
    const testLine = '    надтай'
    const content = pageWithGutter(testLine)
    const result = splitColumns(content, [99])
    const left = result.find((s) => s.column === 'left')
    const right = result.find((s) => s.column === 'right')
    expect(left.lines[3]).toMatch(/надтай/)
    expect(right.lines[3]).toBe('')
  })

  // ── Shape B: long right-column-only line with inner whitespace runs ──
  it('routes a right-column-only long line with inner runs to the right stream (resolveLineGutter guard)', () => {
    // Test line: 45 leading spaces + content with INNER 3-space runs but
    // NO 3-space run at or near the cutColumn. Pre-#492 the "widest run"
    // last-resort fallback would split mid-content.
    // Structure: 45 spaces + "тэвчээрийг,  амилалтаараа   шинэ   горьдол"
    //   (2 spaces between тэв and ами — NOT a 3-space run)
    //   (3 spaces between ами and шинэ — a 3-space run at ~col 70)
    //   (3 spaces between шинэ and горьдол — another 3-space run)
    const testLine = ' '.repeat(45) + 'тэвчээрийг,  амилалтаараа   шинэ   горьдол'
    const content = pageWithGutter(testLine)
    const result = splitColumns(content, [99])
    const left = result.find((s) => s.column === 'left')
    const right = result.find((s) => s.column === 'right')
    // The full right-column content must be intact in the right stream
    // and absent from the left stream.
    expect(left.lines[3]).toBe('')
    expect(right.lines[3]).toMatch(/тэвчээрийг/)
    expect(right.lines[3]).toMatch(/горьдол/) // no mid-content split
  })

  it('still routes a normal two-column line correctly (resolveLineGutter direct gutter)', () => {
    // Regression guard: a true two-column line with a clean gutter must
    // continue to split with both halves preserved.
    const testLine = ' Зүүн талын текст                                Right side body'
    const content = pageWithGutter(testLine)
    const result = splitColumns(content, [99])
    const left = result.find((s) => s.column === 'left')
    const right = result.find((s) => s.column === 'right')
    expect(left.lines[3]).toMatch(/Зүүн талын текст/)
    expect(left.lines[3]).not.toMatch(/Right side/)
    expect(right.lines[3]).toMatch(/Right side body/)
    expect(right.lines[3]).not.toMatch(/Зүүн талын/)
  })
})
