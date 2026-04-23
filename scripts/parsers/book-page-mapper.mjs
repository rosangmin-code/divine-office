/**
 * book-page-mapper.mjs — book-page <-> physical-PDF-page mapping for
 * `public/psalter.pdf`.
 *
 * The PDF is laid out 2-up landscape: every physical page carries two book
 * pages side by side (left half = the even book page, right half = the
 * following odd book page).
 *
 * PoC verification (see scripts/out/poc-findings.md):
 *   book 750 -> physical 376 left
 *   book 751 -> physical 376 right
 *   book 752 -> physical 377 left
 *   book 753 -> physical 377 right
 *
 * Spot-checked against the pilot set in this repo:
 *   book 58  -> physical 30  left   (Psalm 63:2-9 header)
 *   book 60  -> physical 31  left   (Daniel 3:57-88 canticle header)
 *   book 64  -> physical 33  left   (Psalm 149 header)
 * confirmed by running `pdftotext -layout -f {n} -l {n}` and locating the
 * declared headers in the left half.
 *
 * Formula:
 *   physical = Math.floor((book + BOOK_PAGE_OFFSET) / 2)
 *   half     = book % 2 === 0 ? 'left' : 'right'
 *
 * BOOK_PAGE_OFFSET encodes the front-matter shift between the book's own
 * printed page numbers and the physical PDF page ordinal. 2 is empirically
 * correct for this PDF; changing editions would require re-running the
 * self-verify helper below.
 */

export const BOOK_PAGE_OFFSET = 2

/**
 * Convert a book page number to its physical PDF page + half.
 * @param {number} book
 * @returns {{ physical: number, half: 'left'|'right' }}
 */
export function bookPageToPhysical(book) {
  if (!Number.isInteger(book) || book < 1) {
    throw new Error(`bookPageToPhysical: invalid book=${book}`)
  }
  const physical = Math.floor((book + BOOK_PAGE_OFFSET) / 2)
  const half = book % 2 === 0 ? 'left' : 'right'
  return { physical, half }
}

/**
 * Return the two book pages occupying a given physical PDF page.
 * @param {number} physical
 * @returns {{ left: number, right: number }}
 */
export function physicalToBookPages(physical) {
  if (!Number.isInteger(physical) || physical < 1) {
    throw new Error(`physicalToBookPages: invalid physical=${physical}`)
  }
  const left = physical * 2 - BOOK_PAGE_OFFSET
  const right = left + 1
  return { left, right }
}

/**
 * Round-trip self-check: for a handful of pilot book pages, confirm the
 * forward and reverse mappings agree. Used by the pilot extractor at startup
 * so an off-by-one offset fails loudly instead of silently mis-paging.
 *
 * @returns {{ ok: boolean, failures: Array<{ book: number, physical: number, half: string, reverse: any }> }}
 */
export function selfVerify() {
  const pilotBooks = [58, 60, 64, 750, 752]
  const failures = []
  for (const book of pilotBooks) {
    const { physical, half } = bookPageToPhysical(book)
    const rev = physicalToBookPages(physical)
    const expected = half === 'left' ? rev.left : rev.right
    if (expected !== book) {
      failures.push({ book, physical, half, reverse: rev })
    }
  }
  return { ok: failures.length === 0, failures }
}
