import { notFound } from 'next/navigation'
import { PdfViewer } from '@/components/pdf-viewer'

const MIN_BOOK_PAGE = 1
const MAX_BOOK_PAGE = 969

export default async function PdfViewerPage({
  params,
}: {
  params: Promise<{ page: string }>
}) {
  const { page } = await params
  const bookPage = Number.parseInt(page, 10)
  if (
    !Number.isFinite(bookPage) ||
    bookPage < MIN_BOOK_PAGE ||
    bookPage > MAX_BOOK_PAGE
  ) {
    notFound()
  }
  return <PdfViewer initialBookPage={bookPage} />
}
