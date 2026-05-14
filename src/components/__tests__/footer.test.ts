/**
 * Unit tests for `Footer` — click-to-toggle visibility (FR-162).
 *
 * The vitest config (`vitest.config.ts`) does not load a DOM environment
 * (no jsdom / happy-dom dependency), so this suite mirrors the existing
 * SSR-based pattern used by `marian-antiphon-section.test.ts` etc.:
 * render the component with `react-dom/server.renderToStaticMarkup` and
 * assert on the resulting HTML string (structural substring match —
 * cosmetic class re-ordering does not flake).
 *
 * Click-state transitions are covered by the Playwright e2e suite
 * (`e2e/footer-toggle.spec.ts`, FR-162), which exercises real DOM
 * events. Here we assert the **initial (collapsed) render contract**
 * the component MUST satisfy:
 *
 *   1. data-role="footer" wraps the toggle.
 *   2. data-role="footer-toggle" is a real <button> with type="button"
 *      and aria-expanded="false" on first paint.
 *   3. data-role="footer-content" (the two credit paragraphs) is
 *      ABSENT in the collapsed default state (no leaked text).
 *   4. Mongolian Cyrillic aria-label = "Доод бичвэр харуулах" — no
 *      English fallback (NFR-002).
 *   5. aria-controls points at the same id that the (yet-unrendered)
 *      content panel would receive when expanded — i.e. the button
 *      advertises the controlled region by id even when collapsed,
 *      so the contract survives expand/collapse cycles.
 */

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { Footer } from '../footer'

function renderFooter(): string {
  return renderToStaticMarkup(createElement(Footer))
}

describe('Footer — collapsed default render (FR-162)', () => {
  it('wraps content in a <footer> with data-role="footer"', () => {
    const html = renderFooter()
    expect(html).toMatch(/<footer\b[^>]*\bdata-role="footer"/)
  })

  it('renders the toggle as a native <button type="button">', () => {
    const html = renderFooter()
    expect(html).toMatch(
      /<button\b[^>]*\btype="button"[^>]*\bdata-role="footer-toggle"/,
    )
  })

  it('starts collapsed — aria-expanded="false" and data-expanded="false"', () => {
    const html = renderFooter()
    // Both ARIA + data-state surfaces report collapsed on first paint.
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('data-expanded="false"')
  })

  it('does NOT render footer-content while collapsed', () => {
    const html = renderFooter()
    expect(html).not.toContain('data-role="footer-content"')
    // Sanity: the credit lines are gated behind expanded=true.
    expect(html).not.toContain('Цагийн Залбирал — Монгол Католик Сүм')
    expect(html).not.toContain('Зарим орчуулга хийгдэж байна')
  })

  it('uses the Mongolian Cyrillic "show" aria-label (NFR-002)', () => {
    const html = renderFooter()
    expect(html).toContain('aria-label="Доод бичвэр харуулах"')
    // Negative: no English fallback in either state.
    expect(html.toLowerCase()).not.toMatch(/aria-label="(show|hide|toggle)/)
  })

  it('advertises the controlled region via aria-controls', () => {
    const html = renderFooter()
    // aria-controls is present and non-empty even when collapsed
    // (the button is the persistent handle that will reveal the panel).
    const match = html.match(/aria-controls="([^"]+)"/)
    expect(match).not.toBeNull()
    expect(match?.[1]).toBeTruthy()
  })

  it('keeps the toggle button keyboard-focusable (no tabindex=-1)', () => {
    const html = renderFooter()
    // Native <button> is Tab-focusable by default; explicit tabindex=-1
    // would silently break AC4 (keyboard Tab → Space/Enter toggle).
    expect(html).not.toMatch(/<button[^>]*\btabindex="-1"/)
  })

  it('renders a visible focus-visible ring (WCAG 2.4.7 regression guard)', () => {
    const html = renderFooter()
    // Tailwind `focus:outline-none` (specificity 0,2,0) overrides the
    // global `:focus-visible { outline: 2px solid gold }` (0,1,0) rule
    // in globals.css. The compensating `focus-visible:ring-*` utilities
    // restore the keyboard focus indicator. Iter 1 → iter 2 regression
    // (peer review dvo-review msg_20260514T1344380000_8a90).
    expect(html).toMatch(/<button\b[^>]*\bfocus-visible:ring-2\b/)
    expect(html).toMatch(
      /<button\b[^>]*focus-visible:ring-\[var\(--color-liturgical-gold\)\]/,
    )
  })
})
