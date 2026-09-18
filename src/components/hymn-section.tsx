'use client'

import { useState } from 'react'
import type { HourSection } from '@/lib/types'
import { PageRef } from './page-ref'
import { RichContent } from './prayer-sections/rich-content'
import { Icon } from './icon'
import { listboxOptionClassName, useListbox } from './ui/listbox'

type HymnSectionProps = {
  section: Extract<HourSection, { type: 'hymn' }>
}

export function HymnSection({ section }: HymnSectionProps) {
  const [selectedIdx, setSelectedIdx] = useState(section.selectedIndex ?? 0)

  const candidates = section.candidates
  // H3 — 공용 접근 가능 listbox (화살표/Home/End/Enter/Esc/바깥클릭/포커스).
  const listbox = useListbox({
    count: candidates?.length ?? 0,
    selectedIndex: selectedIdx,
    onSelect: setSelectedIdx,
  })
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
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-liturgical-red dark:text-liturgical-red-dark">Магтуу</p>
        <p className="mt-1 text-sm italic text-stone-500 dark:text-stone-400" role="note">
          [Орчуулга хийгдэж байна]
        </p>
      </section>
    )
  }

  return (
    <section aria-label="Магтуу" className="mb-4">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-liturgical-red dark:text-liturgical-red-dark">
        Магтуу <PageRef page={displayPage} />
      </p>
      {useRich ? (
        // GOAL #4 (X.912) — Магтуу 줄바꿈: each phrase renders as one verse
        // line; its viewport-wrap continuation hangs-indents so it stays
        // visually attached and is NOT mistaken for a new verse (F-X8 #300's
        // "no indent" rule reverted — see rich-content.tsx). Phrase boundaries
        // are owned by the hymn builder (`build-hymn-phrases-into-rich.mjs`).
        // `flush` is now vestigial (no render effect) — kept until a dedicated
        // prop-removal cleanup.
        <RichContent content={section.textRich!} className="mt-2" flush />
      ) : (
        <div className="mt-2 whitespace-pre-line font-reading text-stone-800 dark:text-stone-200">
          {displayText}
        </div>
      )}

      {candidates && candidates.length > 1 && (
        <div className="mt-3">
          <button
            {...listbox.triggerProps}
            aria-label={`Бусад магтуу (${candidates.length})`}
            className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-liturgical-gold)]"
          >
            <Icon
              name="next"
              size={14}
              className={`transition-transform ${listbox.open ? 'rotate-90' : ''}`}
              aria-hidden="true"
            />
            Бусад магтуу ({candidates.length})
          </button>

          {listbox.open && (
            <ul {...listbox.listProps} className="mt-2 space-y-1" aria-label="Магтуу сонгох">
              {candidates.map((c, i) => (
                <li
                  key={c.number}
                  {...listbox.getOptionProps(i)}
                  className={listboxOptionClassName(i === selectedIdx)}
                >
                  {c.number}. {c.title}
                  {i === section.selectedIndex && (
                    <span className="ml-2 text-xs text-stone-500 dark:text-stone-400">
                      (өнөөдрийн)
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
