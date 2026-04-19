'use client'

import { useSettings } from '@/lib/settings'
import { pdfHref } from '@/lib/pdf-page'

export function PageRef({ page }: { page?: number }) {
  const { settings } = useSettings()
  if (!settings.showPageRefs || !page) return null

  return (
    <a
      href={pdfHref(page)}
      target="_blank"
      rel="noopener noreferrer"
      className="ml-1 text-xs text-red-700/60 dark:text-red-400/60 font-normal not-italic hover:underline focus:underline focus:outline-none"
      aria-label={`PDF хуудас ${page} нээх`}
      data-role="page-ref-link"
    >
      (х. {page})
    </a>
  )
}
