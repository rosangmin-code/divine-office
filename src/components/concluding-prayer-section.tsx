'use client'

import { useState } from 'react'
import type { HourSection } from '@/lib/types'
import { PageRef } from './page-ref'

type ConcludingPrayerSectionProps = {
  section: Extract<HourSection, { type: 'concludingPrayer' }>
}

export function ConcludingPrayerSection({ section }: ConcludingPrayerSectionProps) {
  const [showAlternate, setShowAlternate] = useState(false)

  const displayText = showAlternate && section.alternateText ? section.alternateText : section.text

  return (
    <section aria-label="Төгсгөлийн даатгал залбирал" className="mb-4">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">
        Төгсгөлийн даатгал залбирал <PageRef page={section.page} />
      </p>
      <p className="mt-2 font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200">
        {displayText}
      </p>

      {section.alternateText && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowAlternate(!showAlternate)}
            className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-liturgical-gold)]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform"
              aria-hidden="true"
            >
              <polyline points="7 16 12 21 17 16" />
              <polyline points="7 8 12 3 17 8" />
            </svg>
            {showAlternate ? 'Үндсэн залбирал' : 'Сонголтот залбирал'}
          </button>
        </div>
      )}
    </section>
  )
}
