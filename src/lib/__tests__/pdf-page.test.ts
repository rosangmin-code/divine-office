import { describe, it, expect } from 'vitest'
import { bookPageToPdfPage, pdfHref, PDF_ASSET_PATH } from '../pdf-page'

describe('bookPageToPdfPage', () => {
  it('maps confirmed samples (2-up layout)', () => {
    // Verified directly against Four-Week psalter.- 2025.pdf.
    expect(bookPageToPdfPage(108)).toBe(55) // PDF p.55 shows book pages 108|109
    expect(bookPageToPdfPage(109)).toBe(55)
    expect(bookPageToPdfPage(6)).toBe(4)    // PDF p.4 shows ГАРЧИГ 6|7
    expect(bookPageToPdfPage(7)).toBe(4)
  })

  it('maps even and odd pages to the same spread', () => {
    for (const even of [10, 50, 100, 200, 400]) {
      expect(bookPageToPdfPage(even)).toBe(bookPageToPdfPage(even + 1))
    }
  })

  it('handles low page numbers without returning zero', () => {
    expect(bookPageToPdfPage(1)).toBeGreaterThanOrEqual(1)
    expect(bookPageToPdfPage(2)).toBeGreaterThanOrEqual(1)
  })
})

describe('pdfHref', () => {
  it('builds asset path with #page fragment', () => {
    expect(pdfHref(58)).toBe('/psalter.pdf#page=30')
    expect(pdfHref(108)).toBe('/psalter.pdf#page=55')
  })

  it('uses the exported PDF asset path', () => {
    expect(PDF_ASSET_PATH).toBe('/psalter.pdf')
    expect(pdfHref(200).startsWith(PDF_ASSET_PATH)).toBe(true)
  })
})
