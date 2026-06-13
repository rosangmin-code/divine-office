/**
 * GOAL #127 / #172 — Week-3 Sunday Vespers Psalm 110 antiphon quote-style guard.
 *
 * Data-fidelity regression (NFR-009 family — source-faithful punctuation): the
 * book (parsed_data/full_pdf.txt:10382-10383) and the psalm BODY
 * (psalter-texts.json) print the Psalm 110 antiphon with CURLY quotes
 * (“ U+201C / ” U+201D). week-3.json `default_antiphon` (Sunday Vespers,
 * ~line 104) currently uses STRAIGHT quotes (" U+0022) around
 * "Миний баруун гарт залрагтун", producing a quote-style inconsistency on the
 * /pray/<W3-SUN>/vespers screen (GOAL127 §proposal Option A; reproduced in
 * docs/research/goal127-psalm110-quote-repro.md §Render evidence — straight=4
 * across the full render because PsalmBlock renders the antiphon twice).
 *
 * Promoted from that research §Reproduction harness into a committed guard.
 * REAL resolvePsalm (real loaders/data) + REAL PsalmBlock via react-dom/server.
 *
 * RED until #172-sub-2 (#174) rewrites week-3.json antiphon straight→curly.
 * Body (psalter-texts.json) and psalmPrayer carry ZERO straight U+0022
 * (verified), so the antiphon is the only straight-quote source — a full-render
 * straight count is therefore an antiphon-region assertion.
 *
 * MM blueprint: docs/design/mental-models/goal127-psalm110-quote-imbalance.md
 *   (Test Scenario Map T3 balance invariant + T5 antiphon balance).
 */
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { resolvePsalm } from '@/lib/hours/resolvers/psalm'
import { PsalmBlock } from '@/components/psalm-block'
import { SettingsProvider } from '@/lib/settings'
import week3 from '@/data/loth/psalter/week-3.json'
import type { PsalmEntry } from '@/lib/types'

const STRAIGHT = '"' // U+0022
const OPEN = '“' // U+201C
const CLOSE = '”' // U+201D

function findPsalm110Entry(root: unknown): PsalmEntry {
  let found: PsalmEntry | undefined
  const walk = (o: unknown) => {
    if (found) return
    if (Array.isArray(o)) {
      o.forEach(walk)
    } else if (o && typeof o === 'object') {
      const rec = o as Record<string, unknown>
      if (typeof rec.ref === 'string' && rec.ref.startsWith('Psalm 110')) {
        found = rec as unknown as PsalmEntry
        return
      }
      Object.values(rec).forEach(walk)
    }
  }
  walk(root)
  if (!found) throw new Error('Psalm 110 entry not found in week-3.json')
  return found
}

describe('GOAL #127/#172 — W3 SUN Vespers Psalm 110 antiphon uses curly, not straight, quotes', () => {
  it('renders zero straight U+0022 quotes and balanced curly pairs', async () => {
    const entry = findPsalm110Entry(week3)
    const assembled = await resolvePsalm(entry)
    const html = renderToStaticMarkup(
      createElement(SettingsProvider, null, createElement(PsalmBlock, { psalm: assembled })),
    )
    const text = html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&quot;/g, STRAIGHT)
      .replace(/&#x27;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')

    const straight = (text.match(/"/g) ?? []).length
    const open = (text.match(/“/g) ?? []).length
    const close = (text.match(/”/g) ?? []).length

    // (a) zero straight quotes — the antiphon is the only straight-quote source
    // (body + psalmPrayer verified straight-free), so this isolates the W3
    // antiphon defect. RED today: straight === 4 (antiphon rendered ×2).
    expect(straight).toBe(0)
    // (b) curly pairs balanced (always-on data-fidelity invariant).
    expect(open).toBe(close)
    expect(open).toBeGreaterThan(0)
    // The resolved antiphon string itself must be straight-free + curly-balanced.
    expect((assembled.antiphon.match(/"/g) ?? []).length).toBe(0)
    expect((assembled.antiphon.match(/“/g) ?? []).length).toBe(
      (assembled.antiphon.match(/”/g) ?? []).length,
    )
  })
})
