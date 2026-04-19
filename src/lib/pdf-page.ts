export const PDF_ASSET_PATH = '/psalter.pdf'

export function bookPageToPdfPage(bookPage: number): number {
  return Math.floor(bookPage / 2) + 1
}

export function pdfHref(bookPage: number): string {
  return `${PDF_ASSET_PATH}#page=${bookPageToPdfPage(bookPage)}`
}
