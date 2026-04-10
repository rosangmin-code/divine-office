'use client'

import { useSettings } from '@/lib/settings'

export function PageRef({ page }: { page?: number }) {
  const { settings } = useSettings()
  if (!settings.showPageRefs || !page) return null

  return (
    <span
      className="ml-1 text-xs text-red-700/60 dark:text-red-400/60 font-normal not-italic"
      aria-label={`хуудас ${page}`}
    >
      (х. {page})
    </span>
  )
}
