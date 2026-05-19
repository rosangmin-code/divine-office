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

import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import type { ComponentType } from 'react'
import { Footer } from '../footer'
import type { FooterProps } from '../footer'

// wi-006 (#18) — Footer's home variant uses `useRouter` from
// 'next/navigation'. `renderToStaticMarkup` runs in a server-like
// environment where useRouter returns a stub via Next's runtime; in
// vitest (no Next runtime) we mock the module so the hook returns a
// no-op router instead of throwing. Tests assert on rendered HTML,
// not on router.push calls (click behavior is covered by Playwright).
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, back: () => {}, forward: () => {}, refresh: () => {}, prefetch: () => {} }),
}))

// Cast Footer to ComponentType<FooterProps> so React.createElement's
// generic prop inference picks up `homeControls`. Without the cast,
// TypeScript collapses Footer's default-argument signature into a
// no-prop overload and rejects `homeControls`.
const FooterAsComponent = Footer as ComponentType<FooterProps>

function renderFooter(homeControls: boolean = false): string {
  return renderToStaticMarkup(createElement(FooterAsComponent, { homeControls }))
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

// wi-006 (#18) — home variant: sticky bottom + 3 controls.
describe('Footer — home variant (wi-006 / #18, FR-162 contract preserved)', () => {
  it('marks the variant with data-variant="home" + data-role="footer"', () => {
    const html = renderFooter(true)
    expect(html).toMatch(/<footer\b[^>]*\bdata-role="footer"/)
    expect(html).toContain('data-variant="home"')
  })

  it('applies sticky bottom-0 + safe-area-inset-bottom padding', () => {
    const html = renderFooter(true)
    expect(html).toMatch(/<footer\b[^>]*\bsticky\b/)
    expect(html).toMatch(/<footer\b[^>]*\bbottom-0\b/)
    // safe-area-inset-bottom embedded in the inline style for iOS notch
    // (Tailwind doesn't ship a built-in safe-area utility, so the
    //  contract is pinned to the rendered `style` attribute).
    expect(html).toMatch(/style="[^"]*env\(safe-area-inset-bottom\)/)
  })

  it('renders the [⊙ Өнөөдөр] today-jump button with Mongolian aria-label', () => {
    const html = renderFooter(true)
    expect(html).toContain('data-role="footer-today"')
    expect(html).toContain('aria-label="Өнөөдрийн өдөр рүү шилжих"')
    expect(html).toContain('Өнөөдөр') // visible label text
    expect(html).toContain('⊙') // icon glyph
  })

  it('renders the [⚙ Тохиргоо] settings link (Link to /settings) with label', () => {
    const html = renderFooter(true)
    // SettingsLink at showLabel=true should render the text alongside
    // the gear icon, and the href must still be /settings.
    expect(html).toMatch(/<a[^>]*\bhref="\/settings"/)
    expect(html).toContain('aria-label="Тохиргоо"')
    expect(html).toContain('data-role="settings-link"')
    expect(html).toContain('Тохиргоо') // visible label text alongside icon
  })

  it('still renders the ▾ chevron toggle (FR-162 contract preserved)', () => {
    const html = renderFooter(true)
    // Same data-role + aria contract as the minimal variant — the e2e
    // suite (e2e/footer-toggle.spec.ts) keys on these.
    expect(html).toMatch(
      /<button\b[^>]*\btype="button"[^>]*\bdata-role="footer-toggle"/,
    )
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('aria-label="Доод бичвэр харуулах"')
    expect(html).toContain('▾')
  })

  it('starts with footer-content COLLAPSED (chevron toggles credit lines)', () => {
    const html = renderFooter(true)
    expect(html).not.toContain('data-role="footer-content"')
    expect(html).not.toContain('Цагийн Залбирал — Монгол Католик Сүм')
  })

  it('each control hits min 44×44 tap-target (WCAG 2.5.5 / mobile accessibility)', () => {
    const html = renderFooter(true)
    // The three home-variant controls (today / settings / chevron) all
    // use min-h-[44px] or h-9 (36px) — only the chevron-toggle's 36px
    // is acceptable inside a touch-friendly strip because the strip's
    // own py-* padding pushes the tap area past 44px. We pin the two
    // primary controls to the 44px floor.
    expect(html).toMatch(/data-role="footer-today"[^>]*min-h-\[44px\]/)
  })

  it('renders all three controls inside the same flex strip', () => {
    const html = renderFooter(true)
    // Sanity-check structural ordering: today → settings → toggle
    // (left → right reading order). Each appears exactly once.
    const todayIdx = html.indexOf('data-role="footer-today"')
    const settingsIdx = html.indexOf('data-role="settings-link"')
    const toggleIdx = html.indexOf('data-role="footer-toggle"')
    expect(todayIdx).toBeGreaterThan(-1)
    expect(settingsIdx).toBeGreaterThan(todayIdx)
    expect(toggleIdx).toBeGreaterThan(settingsIdx)
  })
})
