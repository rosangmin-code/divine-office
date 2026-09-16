'use client'

import { useState } from 'react'
import type { HourSection } from '@/lib/types'
import { PageRef } from './page-ref'
import { Icon } from './icon'
import { listboxOptionClassName, useListbox } from './ui/listbox'

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
  const [selectedIdx, setSelectedIdx] = useState(section.selectedIndex ?? 0)

  const candidates = section.candidates
  // H3 — 공용 접근 가능 listbox (hymn/invitatory/gospel-canticle 와 동일 훅).
  const listbox = useListbox({
    count: candidates?.length ?? 0,
    selectedIndex: selectedIdx,
    onSelect: setSelectedIdx,
  })
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
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-liturgical-red dark:text-liturgical-red-dark">
        {displayTitle} <PageRef page={displayPage} />
      </p>
      <div
        data-role="marian-antiphon-text"
        className="mt-2 font-reading text-base leading-relaxed text-stone-800 dark:text-stone-200"
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
            {...listbox.triggerProps}
            aria-label={`Бусад дуу (${candidates.length})`}
            className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-liturgical-gold)]"
          >
            <Icon
              name="next"
              size={14}
              className={`transition-transform ${listbox.open ? 'rotate-90' : ''}`}
              aria-hidden="true"
            />
            Бусад дуу ({candidates.length})
          </button>

          {listbox.open && (
            <ul
              {...listbox.listProps}
              className="mt-2 space-y-1"
              aria-label="Мариагийн дуу сонгох"
            >
              {candidates.map((c, i) => (
                <li
                  key={c.title}
                  {...listbox.getOptionProps(i)}
                  className={listboxOptionClassName(i === selectedIdx)}
                >
                  {c.title}
                  {i === section.selectedIndex && (
                    <span className="ml-2 text-xs text-stone-400 dark:text-stone-500">
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
