/**
 * Unit tests for `Footer` — credit lines ALWAYS visible, no toggle
 * (FR-162, #51/#53).
 *
 * The click-to-toggle(▾/▴) chevron was removed: the church credit lines
 * are now permanently shown as a small caption so they are discoverable
 * without interaction. These tests assert the new contract via
 * `react-dom/server.renderToStaticMarkup` (the vitest config loads no DOM
 * environment, mirroring the SSR-string pattern used elsewhere):
 *
 *   1. data-role="footer" wraps the content (both variants).
 *   2. NO data-role="footer-toggle" / aria-expanded / ▾▴ anywhere.
 *   3. The two credit lines are present on first paint (always visible),
 *      inside data-role="footer-content".
 *   4. Home variant: two controls (Өнөөдөр / Тохиргоо), each a lucide
 *      <Icon> (SVG, no ⊙/⚙ emoji) + Mongolian Cyrillic label/aria-label
 *      (NFR-002 — no English fallback).
 */

import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import type { ComponentType } from 'react'
import { Footer } from '../footer'
import type { FooterProps } from '../footer'

// Footer's home variant uses `useRouter` from 'next/navigation'. In vitest
// (no Next runtime) we mock the module so the hook returns a no-op router
// instead of throwing. Tests assert on rendered HTML, not router.push
// calls (click behavior is covered by Playwright e2e).
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, back: () => {}, forward: () => {}, refresh: () => {}, prefetch: () => {} }),
}))

const FooterAsComponent = Footer as ComponentType<FooterProps>

function renderFooter(homeControls: boolean = false): string {
  return renderToStaticMarkup(createElement(FooterAsComponent, { homeControls }))
}

const CREDIT_LINE_1 = 'Цагийн Залбирал — Монгол Католик Сүм'
const CREDIT_LINE_2 = 'Зарим орчуулга хийгдэж байна'

describe('Footer — minimal variant (credits always shown, no toggle)', () => {
  it('wraps content in a <footer> with data-role="footer"', () => {
    const html = renderFooter()
    expect(html).toMatch(/<footer\b[^>]*\bdata-role="footer"/)
  })

  it('shows BOTH church-credit lines on first paint (always visible)', () => {
    const html = renderFooter()
    expect(html).toContain('data-role="footer-content"')
    expect(html).toContain(CREDIT_LINE_1)
    expect(html).toContain(CREDIT_LINE_2)
  })

  it('renders NO toggle chevron (no footer-toggle / aria-expanded / ▾▴)', () => {
    const html = renderFooter()
    expect(html).not.toContain('data-role="footer-toggle"')
    expect(html).not.toContain('aria-expanded')
    expect(html).not.toContain('▾')
    expect(html).not.toContain('▴')
  })

  it('has no English aria-label fallback (NFR-002)', () => {
    const html = renderFooter()
    expect(html.toLowerCase()).not.toMatch(/aria-label="(show|hide|toggle)/)
  })
})

describe('Footer — home variant (#51/#53: two controls + always-on credits)', () => {
  it('marks the variant with data-variant="home" + data-role="footer"', () => {
    const html = renderFooter(true)
    expect(html).toMatch(/<footer\b[^>]*\bdata-role="footer"/)
    expect(html).toContain('data-variant="home"')
  })

  it('applies sticky bottom-0 + safe-area-inset-bottom padding', () => {
    const html = renderFooter(true)
    expect(html).toMatch(/<footer\b[^>]*\bsticky\b/)
    expect(html).toMatch(/<footer\b[^>]*\bbottom-0\b/)
    expect(html).toMatch(/style="[^"]*env\(safe-area-inset-bottom\)/)
  })

  it('renders the Өнөөдөр today-jump button as a lucide icon + label (no ⊙)', () => {
    const html = renderFooter(true)
    expect(html).toContain('data-role="footer-today"')
    expect(html).toContain('aria-label="Өнөөдрийн өдөр рүү шилжих"')
    expect(html).toContain('Өнөөдөр') // visible label text
    // lucide Icon renders an inline <svg>; the old ⊙ unicode glyph is gone.
    expect(html).toMatch(/data-role="footer-today"[\s\S]*?<svg/)
    expect(html).not.toContain('⊙')
  })

  it('renders the Тохиргоо settings link (Link to /settings) as icon + label (no ⚙)', () => {
    const html = renderFooter(true)
    expect(html).toMatch(/<a[^>]*\bhref="\/settings"/)
    expect(html).toContain('aria-label="Тохиргоо"')
    expect(html).toContain('data-role="settings-link"')
    expect(html).toContain('Тохиргоо') // visible label text alongside icon
    expect(html).toMatch(/data-role="settings-link"[\s\S]*?<svg/)
    expect(html).not.toContain('⚙')
  })

  it('shows the church-credit lines (always visible, not gated)', () => {
    const html = renderFooter(true)
    expect(html).toContain('data-role="footer-content"')
    expect(html).toContain(CREDIT_LINE_1)
    expect(html).toContain(CREDIT_LINE_2)
  })

  it('renders NO toggle chevron in the home variant either', () => {
    const html = renderFooter(true)
    expect(html).not.toContain('data-role="footer-toggle"')
    expect(html).not.toContain('aria-expanded')
    expect(html).not.toContain('▾')
    expect(html).not.toContain('▴')
  })

  it('today control hits the min 44×44 tap target (WCAG 2.5.5)', () => {
    const html = renderFooter(true)
    expect(html).toMatch(/data-role="footer-today"[^>]*min-h-\[44px\]/)
    expect(html).toMatch(/data-role="settings-link"[^>]*min-h-\[44px\]/)
  })

  it('keeps a visible focus-visible ring on the controls (WCAG 2.4.7)', () => {
    const html = renderFooter(true)
    // Tailwind `focus:outline-none` overrides the global :focus-visible
    // outline, so the controls restore a keyboard indicator via
    // focus-visible:ring-* in the liturgical-gold token.
    expect(html).toMatch(/data-role="footer-today"[^>]*focus-visible:ring-2/)
    expect(html).toMatch(
      /focus-visible:ring-\[var\(--color-liturgical-gold\)\]/,
    )
  })

  it('orders the two controls today → settings (left → right)', () => {
    const html = renderFooter(true)
    const todayIdx = html.indexOf('data-role="footer-today"')
    const settingsIdx = html.indexOf('data-role="settings-link"')
    expect(todayIdx).toBeGreaterThan(-1)
    expect(settingsIdx).toBeGreaterThan(todayIdx)
  })
})
