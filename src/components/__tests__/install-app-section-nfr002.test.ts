/**
 * NFR-002 lock — InstallAppSection iOS instructions are Mongolian Cyrillic
 * only (GOAL #64 / WI-84, audit I-3).
 *
 * The iOS Safari install hint previously named the share control with the
 * English word "Share" ("Share товчийг дар" and "Safari-гийн Share: …").
 * NFR-002 forbids English UI chrome, so "Share" is replaced with the
 * standard Mongolian verb "Хуваалцах". "Safari" stays — it is a product
 * (brand) name.
 *
 * The 'ios' / 'iosDismissed' branches are only reachable through runtime
 * userAgent detection inside a useEffect, so a plain SSR render of
 * <InstallAppSection /> (status === 'unknown') never exercises them. The
 * component therefore exports the pure `renderBody(status, …)` renderer so
 * every status can be asserted directly without faking `navigator`.
 */

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { renderBody } from '../install-app-section'

const noop = () => {}

function renderStatus(status: Parameters<typeof renderBody>[0]): string {
  return renderToStaticMarkup(renderBody(status, noop, noop))
}

describe('InstallAppSection — NFR-002 (Mongolian-only iOS install hint)', () => {
  it('iOS step list uses "Хуваалцах" and no English "Share"', () => {
    const html = renderStatus('ios')
    expect(html).toContain('Хуваалцах товчийг дар')
    expect(html).toContain('Нүүр дэлгэцэнд нэмэх')
    expect(html).not.toContain('Share')
  })

  it('iOS dismissed reminder uses "Хуваалцах" and no English "Share"', () => {
    const html = renderStatus('iosDismissed')
    expect(html).toContain('Хуваалцах')
    expect(html).not.toContain('Share')
  })

  it('keeps the "Safari" product name (brand, allowed under NFR-002)', () => {
    expect(renderStatus('ios')).toContain('Safari')
    expect(renderStatus('iosDismissed')).toContain('Safari')
  })
})
