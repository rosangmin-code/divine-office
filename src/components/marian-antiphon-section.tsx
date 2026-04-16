'use client'

import { useId, useState } from 'react'
import type { HourSection } from '@/lib/types'
import { PageRef } from './page-ref'

type MarianAntiphonSectionProps = {
  section: Extract<HourSection, { type: 'marianAntiphon' }>
}

export function MarianAntiphonSection({ section }: MarianAntiphonSectionProps) {
  const listId = useId()
  const [selectedIdx, setSelectedIdx] = useState(section.selectedIndex ?? 0)
  const [menuOpen, setMenuOpen] = useState(false)

  const candidates = section.candidates
  const current = candidates?.[selectedIdx]
  const displayTitle = current?.title ?? section.title
  const displayText = current?.text ?? section.text
  const displayPage = current?.page ?? section.page

  return (
    <section aria-label={displayTitle} className="mb-4">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">
        {displayTitle} <PageRef page={displayPage} />
      </p>
      <p className="mt-2 font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200">
        {displayText}
      </p>

      {candidates && candidates.length > 1 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-controls={listId}
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
              className={`transition-transform ${menuOpen ? 'rotate-90' : ''}`}
              aria-hidden="true"
            >
              <polyline points="9 6 15 12 9 18" />
            </svg>
            Бусад дуу ({candidates.length})
          </button>

          {menuOpen && (
            <ul
              id={listId}
              className="mt-2 space-y-1"
              role="listbox"
              aria-label="Мариагийн дуу сонгох"
            >
              {candidates.map((c, i) => (
                <li key={c.title} role="option" aria-selected={i === selectedIdx}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIdx(i)
                      setMenuOpen(false)
                    }}
                    className={`w-full text-left rounded px-2 py-1.5 text-sm transition-colors ${
                      i === selectedIdx
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200'
                        : 'text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800'
                    }`}
                  >
                    {c.title}
                    {i === section.selectedIndex && (
                      <span className="ml-2 text-xs text-stone-400 dark:text-stone-500">
                        (өнөөдрийн)
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
