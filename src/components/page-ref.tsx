'use client'

import Link from 'next/link'
import { useSettings } from '@/lib/settings'
import { viewerHref } from '@/lib/pdf-page'

export function PageRef({ page }: { page?: number }) {
  const { settings } = useSettings()
  if (!settings.showPageRefs || !page) return null

  return (
    <Link
      href={viewerHref(page)}
      className="ml-1 whitespace-nowrap text-xs text-stone-400 dark:text-stone-500 font-normal not-italic hover:underline focus:underline focus:outline-none"
      aria-label={`PDF хуудас ${page} нээх`}
      data-role="page-ref-link"
    >
      (х. {page})
    </Link>
  )
}
