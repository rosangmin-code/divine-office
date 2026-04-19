import { describe, it, expect } from 'vitest'
import { bookPageToPdfPage, bookPageSide, viewerHref, PDF_ASSET_PATH } from '../pdf-page'

describe('bookPageToPdfPage', () => {
  it('maps confirmed samples (2-up layout)', () => {
    expect(bookPageToPdfPage(108)).toBe(55)
    expect(bookPageToPdfPage(109)).toBe(55)
    expect(bookPageToPdfPage(6)).toBe(4)
    expect(bookPageToPdfPage(7)).toBe(4)
    expect(bookPageToPdfPage(58)).toBe(30)
    expect(bookPageToPdfPage(59)).toBe(30)
  })

  it('collapses adjacent even/odd pages onto the same spread', () => {
    for (const even of [10, 50, 100, 200, 400]) {
      expect(bookPageToPdfPage(even)).toBe(bookPageToPdfPage(even + 1))
    }
  })
})

describe('bookPageSide', () => {
  it('places even book pages on the left, odd on the right', () => {
    expect(bookPageSide(58)).toBe('left')
    expect(bookPageSide(59)).toBe('right')
    expect(bookPageSide(108)).toBe('left')
    expect(bookPageSide(109)).toBe('right')
  })
})

describe('viewerHref', () => {
  it('points at the in-app viewer route', () => {
    expect(viewerHref(58)).toBe('/pdf/58')
    expect(viewerHref(109)).toBe('/pdf/109')
  })

  it('keeps the PDF asset path exported for the viewer component', () => {
    expect(PDF_ASSET_PATH).toBe('/psalter.pdf')
  })
})
