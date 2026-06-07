/**
 * NFR-002 lock — Settings page UI chrome is Mongolian Cyrillic only
 * (GOAL #64 / WI-84, audit I-2/I-4).
 *
 * Before this WI the settings header carried a redundant English subtitle
 * ("Settings") under the Mongolian h1 ("Тохиргоо"), and the font-family
 * control labels were the English typographic terms "Sans (Noto Sans)" /
 * "Serif (Noto Serif)". Both are visible English UI chrome (NFR-002
 * violations). The fix removes the duplicate subtitle and replaces the
 * font labels with the Mongolian glosses already used in the section's
 * description ("Орчин үеийн" / "Сонгодог").
 *
 * Verified via `react-dom/server.renderToStaticMarkup` (the vitest config
 * loads no DOM environment — same SSR-string pattern as footer.test.ts).
 * `useSettings()` falls back to DEFAULTS through the context default value
 * when no SettingsProvider wraps the tree, so the page renders standalone.
 *
 * NOTE: the Latin font-preview line ("Dominus tecum.") is an intentional
 * liturgical citation and is OUT of scope for NFR-002 (it is not English
 * UI chrome) — these tests do not touch it.
 */

import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import SettingsPage from '../page'

// The Footer (rendered inside the settings page) imports next/navigation.
// In vitest (no Next runtime) we stub it so hooks resolve to a no-op router.
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: () => {},
    replace: () => {},
    back: () => {},
    forward: () => {},
    refresh: () => {},
    prefetch: () => {},
  }),
}))

function renderSettings(): string {
  return renderToStaticMarkup(createElement(SettingsPage))
}

describe('Settings page — NFR-002 (Mongolian-only UI chrome)', () => {
  it('shows the Mongolian title "Тохиргоо"', () => {
    const html = renderSettings()
    expect(html).toContain('Тохиргоо')
  })

  it('has NO English "Settings" subtitle (duplicate gloss removed)', () => {
    const html = renderSettings()
    // The page route is "/settings" (lowercase) in hrefs — capital-S
    // "Settings" only ever came from the removed English subtitle.
    expect(html).not.toContain('Settings')
  })

  it('font-family labels use Mongolian glosses (Орчин үеийн / Сонгодог)', () => {
    const html = renderSettings()
    expect(html).toContain('Орчин үеийн')
    expect(html).toContain('Сонгодог')
  })

  it('has NO English typographic terms "Sans"/"Serif" as visible labels', () => {
    const html = renderSettings()
    // CSS classes font-sans / font-serif are lowercase, so capital-S
    // "Sans"/"Serif" only ever came from the English labels we replaced.
    expect(html).not.toContain('Sans')
    expect(html).not.toContain('Serif')
  })
})
