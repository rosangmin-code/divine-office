'use client'

import { useId, useState } from 'react'
import type { HourSection } from '@/lib/types'
import { PageRef } from './page-ref'

type MarianAntiphonSectionProps = {
  section: Extract<HourSection, { type: 'marianAntiphon' }>
}

/**
 * Split a Marian antiphon plain string into per-phrase lines on the
 * Аллэлуяа delimiter. Eastertide Marian antiphons (notably "Тэнгэрийн
 * Хатан" / Regina Caeli on PDF p.545) author each phrase terminated by
 * `Аллэлуяа!` — the PDF renders one phrase per line. Pre-fix, the
 * production renderer collapsed all phrases into a single `<p>` so they
 * flowed together into one visual line on every viewport. F-X1 redo
 * (#223): split on the Alleluia delimiter (with its trailing ASCII
 * punctuation) and render each segment as its own `<p>` so the PDF
 * line-break convention surfaces in the web view.
 *
 * Behavior:
 *   - Returns a single-element array (the original string) when no
 *     Аллэлуяа token is present — Salve Regina / Alma Redemptoris /
 *     Hail Mary etc. are single-paragraph in the source PDF and stay
 *     single-paragraph here.
 *   - When Аллэлуяа is present, each phrase ENDS with the Аллэлуяа
 *     token (and its trailing punctuation) and is trimmed of leading
 *     and trailing whitespace.
 *   - Trailing remainder after the last Аллэлуяа token (rare in the
 *     authored data but defensive) becomes its own final line.
 *
 * NFR-002 contract: text is preserved verbatim — split + trim only.
 * No casing changes, no punctuation normalization, no whitespace
 * collapsing inside lines.
 */
export function splitMarianTextOnAlleluia(text: string): string[] {
  if (!/Аллэлуяа/.test(text)) return [text]
  // Capture-group split so the delimiter is interleaved with body
  // segments rather than discarded. Punctuation [!.,?] is kept attached
  // to the delimiter token so the rendered line still carries its
  // closing punctuation.
  const parts = text.split(/(Аллэлуяа[!.,?]?)/)
  const lines: string[] = []
  let buf = ''
  for (const part of parts) {
    if (/^Аллэлуяа[!.,?]?$/.test(part)) {
      lines.push((buf + part).trim())
      buf = ''
    } else {
      buf += part
    }
  }
  const tail = buf.trim()
  if (tail.length > 0) lines.push(tail)
  return lines
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
  // F-X1c (#225) — phrase-unit lines are the authoritative source when
  // present. They are derived from PDF p.544-545 visual line layout in
  // `compline.json` (4 anteMarian antiphons authored phrase-by-phrase).
  // When `lines` is absent — sanctoral propers / hypothetical future
  // Marian variants without the phrase decomposition — fall back to the
  // legacy `splitMarianTextOnAlleluia(text)` path which still surfaces
  // the Eastertide Аллэлуяа line break on the plain string.
  const displayLines: string[] = (current?.lines ?? section.lines) ??
    splitMarianTextOnAlleluia(displayText)

  return (
    <section aria-label={displayTitle} className="mb-4">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">
        {displayTitle} <PageRef page={displayPage} />
      </p>
      <div
        data-role="marian-antiphon-text"
        className="mt-2 font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200"
      >
        {displayLines.map((line, i) => (
          // F-X1c (#225) — hanging indent matches the FR-161 R-13 psalm
          // phrase pattern. `pl-6 -indent-6` reserves a 1.5rem left
          // gutter and pushes wrap-continuation lines IN by the same
          // amount, so the phrase start sits at the baseline and any
          // viewport-induced wrap lines become visually distinguishable
          // from the next phrase boundary. The first phrase of an
          // antiphon also sits at the gutter, matching the PDF visual.
          <p
            key={i}
            data-testid="marian-antiphon-line"
            className="pl-6 -indent-6"
          >
            {line}
          </p>
        ))}
      </div>

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
