'use client'

import { useId, useState } from 'react'
import type { HourSection } from '@/lib/types'
import { PageRef } from './page-ref'
import { RichContent } from './prayer-sections/rich-content'

type HymnSectionProps = {
  section: Extract<HourSection, { type: 'hymn' }>
}

export function HymnSection({ section }: HymnSectionProps) {
  const listId = useId()
  const [selectedIdx, setSelectedIdx] = useState(section.selectedIndex ?? 0)
  const [menuOpen, setMenuOpen] = useState(false)

  const candidates = section.candidates
  const currentHymn = candidates?.[selectedIdx]
  const displayText = currentHymn?.text ?? section.text
  const displayPage = currentHymn?.page ?? section.page
  // Rich overlay applies only to the default hymn (selectedIdx matches the
  // rotation pick). When the user picks another candidate, candidates carry
  // plain text only — fall back to the legacy render path.
  const useRich =
    !!section.textRich &&
    section.textRich.blocks.length > 0 &&
    (!candidates || selectedIdx === (section.selectedIndex ?? 0))

  if (!displayText && !useRich) {
    return (
      <section aria-label="Магтуу" className="mb-4">
        <p className="text-sm font-semibold text-red-700 dark:text-red-400">Магтуу</p>
        <p className="mt-1 text-sm italic text-stone-500 dark:text-stone-400" role="note">
          [Орчуулга хийгдэж байна]
        </p>
      </section>
    )
  }

  return (
    <section aria-label="Магтуу" className="mb-4">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">
        Магтуу <PageRef page={displayPage} />
      </p>
      {useRich ? (
        <RichContent content={section.textRich!} className="mt-2" />
      ) : (
        <div className="mt-2 whitespace-pre-line font-serif text-stone-800 dark:text-stone-200">
          {displayText}
        </div>
      )}

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
            Бусад магтуу ({candidates.length})
          </button>

          {menuOpen && (
            <ul
              id={listId}
              className="mt-2 space-y-1"
              role="listbox"
              aria-label="Магтуу сонгох"
            >
              {candidates.map((c, i) => (
                <li key={c.number} role="option" aria-selected={i === selectedIdx}>
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
                    {c.number}. {c.title}
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
