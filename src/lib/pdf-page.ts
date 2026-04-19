export const PDF_ASSET_PATH = '/psalter.pdf'

// The source PDF is laid out 2-up (landscape) — each physical PDF page
// renders two book pages side by side. These helpers convert between
// book page numbers and the underlying PDF page + half.
export function bookPageToPdfPage(bookPage: number): number {
  return Math.floor(bookPage / 2) + 1
}

// Which half of the 2-up spread the book page occupies.
// Even book pages sit on the left; odd book pages sit on the right.
export function bookPageSide(bookPage: number): 'left' | 'right' {
  return bookPage % 2 === 0 ? 'left' : 'right'
}

// In-app viewer link. Keeps the user inside the app so the browser
// back button restores scroll position on the prayer page.
export function viewerHref(bookPage: number): string {
  return `/pdf/${bookPage}`
}
