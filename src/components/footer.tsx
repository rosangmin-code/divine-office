'use client'

import { useId, useState } from 'react'

/**
 * Footer with click-to-toggle visibility (FR-162).
 *
 * Default state: collapsed — only a small chevron toggle button is rendered
 * (Option B per dispatch #11: 작은 toggle 버튼/handle만 default로 표시).
 * Clicking the button expands the footer to show the project credit lines;
 * clicking again collapses back to the chevron-only state.
 *
 * State is self-contained (no props, no lifting) — the public signature
 * `<Footer />` is preserved across src/app/page.tsx, settings, guide,
 * ordinarium, and pray/[date]/[hour]/page.tsx.
 *
 * Accessibility: native `<button>` (Tab + Space/Enter), `aria-expanded`
 * reflects toggle state, `aria-controls` points at the conditional
 * content container, `aria-label` swaps between "show" / "hide" verbs
 * in Mongolian Cyrillic (NFR-002 verbatim — no English fallback).
 */
export function Footer() {
  const [expanded, setExpanded] = useState(false)
  const contentId = useId()
  const handleToggle = () => setExpanded((prev) => !prev)

  return (
    <footer className="py-6 text-center" data-role="footer">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={expanded}
        aria-controls={contentId}
        aria-label={expanded ? 'Доод бичвэр нуух' : 'Доод бичвэр харуулах'}
        data-role="footer-toggle"
        data-expanded={expanded ? 'true' : 'false'}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-sm leading-none text-stone-400 transition-colors hover:bg-stone-200 hover:text-stone-600 focus:outline-none dark:text-stone-500 dark:hover:bg-stone-700 dark:hover:text-stone-300"
      >
        <span aria-hidden="true">{expanded ? '▴' : '▾'}</span>
      </button>
      {expanded && (
        <div
          id={contentId}
          data-role="footer-content"
          className="mt-2"
        >
          <p className="text-xs text-stone-400 dark:text-stone-500">
            Цагийн Залбирал — Монгол Католик Сүм
          </p>
          <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
            Зарим орчуулга хийгдэж байна
          </p>
        </div>
      )}
    </footer>
  )
}
