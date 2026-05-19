'use client'

import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SettingsLink } from './settings-link'

/**
 * Footer with click-to-toggle visibility (FR-162).
 *
 * Default (no prop) — the chevron-only minimal footer used on every
 * non-home route (/guide, /ordinarium, /pray/..., /settings). The
 * click-to-expand contract surfaced by FR-162 + e2e/footer-toggle.spec.ts
 * is preserved byte-for-byte across that surface.
 *
 * `homeControls={true}` — the wi-006 / WI #18 home variant. Sticky to
 * the viewport bottom, three controls (Өнөөдөр / Тохиргоо / chevron),
 * iOS notch-safe via `env(safe-area-inset-bottom)`. The minimal-footer
 * contract (data-role="footer", "footer-toggle", aria-expanded, aria-
 * controls, aria-label swap, gated footer-content) is preserved INSIDE
 * the home variant too — same DOM roles, just embedded in a richer
 * control strip — so the existing Playwright e2e suite continues to
 * pass for the home route.
 *
 * Accessibility: native <button> elements (Tab + Space/Enter), each
 * with Mongolian Cyrillic aria-label (NFR-002 — no English fallback).
 */

export interface FooterProps {
  /** When true, render the sticky-bottom home variant with the three
   *  controls. Default (false) keeps the existing minimal footer for
   *  every other page. */
  homeControls?: boolean
}

export function Footer({ homeControls = false }: FooterProps = {}) {
  const [expanded, setExpanded] = useState(false)
  const contentId = useId()
  const router = useRouter()
  const handleToggle = () => setExpanded((prev) => !prev)
  // "Өнөөдөр" = jump to today. Pushing `/` with no query params lets
  // the page.tsx 3-tier resolver pick Tier 3 (today's month + today
  // anchor row) without us needing to compute today on the client.
  const handleTodayJump = () => router.push('/')

  // Toggle button — shared between the minimal and home variants so the
  // FR-162 contract surface (data-role + aria + Mongolian labels) is
  // a single source of truth.
  const toggleButton = (
    <button
      type="button"
      onClick={handleToggle}
      aria-expanded={expanded}
      aria-controls={contentId}
      aria-label={expanded ? 'Доод бичвэр нуух' : 'Доод бичвэр харуулах'}
      data-role="footer-toggle"
      data-expanded={expanded ? 'true' : 'false'}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-base leading-none text-stone-400 transition-colors hover:bg-stone-200 hover:text-stone-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-liturgical-gold)] dark:text-stone-500 dark:hover:bg-stone-700 dark:hover:text-stone-300"
    >
      <span aria-hidden="true">{expanded ? '▴' : '▾'}</span>
    </button>
  )

  // Conditional credit-lines panel — gated identically in both variants.
  const expandedPanel = expanded ? (
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
  ) : null

  // --- Home variant (wi-006) -------------------------------------
  if (homeControls) {
    return (
      <footer
        data-role="footer"
        data-variant="home"
        className="sticky bottom-0 z-30 mt-6 border-t border-stone-200 bg-white/95 backdrop-blur dark:border-stone-800 dark:bg-stone-900/90"
        // iOS notch / Android nav-bar safe area: combine with a default
        // 0.75rem pad so devices without an inset still get breathing
        // room.
        style={{
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-around gap-2 px-2 pt-3 md:px-6">
          <button
            type="button"
            onClick={handleTodayJump}
            aria-label="Өнөөдрийн өдөр рүү шилжих"
            data-role="footer-today"
            className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-liturgical-gold)] dark:text-stone-200 dark:hover:bg-stone-800"
          >
            <span aria-hidden="true" className="text-lg leading-none">⊙</span>
            <span>Өнөөдөр</span>
          </button>
          {/* SettingsLink with text label — reuses the shared gear icon
              and /settings href so any future settings-route changes
              live in one place. */}
          <SettingsLink showLabel />
          {toggleButton}
        </div>
        {expandedPanel}
      </footer>
    )
  }

  // --- Default minimal variant (existing behavior, all other routes) ---
  return (
    <footer className="py-6 text-center" data-role="footer">
      {toggleButton}
      {expandedPanel}
    </footer>
  )
}
