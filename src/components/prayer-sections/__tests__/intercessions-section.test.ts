/**
 * Unit + integration tests for F-X12 Phase A (#374) — legacy
 * intercessions-section refrain italic heuristic.
 *
 * Audit doc: `docs/handoff-fx10-fx11-fx12-audit-2026-05-08.md` §3.5
 *
 * Two-axis coverage:
 *  1. Regex unit tests (`LEGACY_INTERCESSION_REFRAIN_LEAD_RE`) —
 *     punctuation variants, trailing whitespace, narrow-stem guard.
 *  2. Integration via `react-dom/server` — rendered legacy `items[]`
 *     receives `data-role="intercessions-refrain"` + `italic` class on
 *     the line immediately following a залбирцгаая trigger; siblings
 *     stay plain.
 */

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import {
  IntercessionsSection,
  LEGACY_INTERCESSION_REFRAIN_LEAD_RE,
} from '../intercessions-section'
import type { HourSection } from '@/lib/types'

function html(node: React.ReactElement): string {
  return renderToStaticMarkup(node)
}

function makeLegacy(items: string[]): Extract<
  HourSection,
  { type: 'intercessions' }
> {
  return {
    type: 'intercessions',
    intro: '',
    items,
  }
}

// @fr F-X12
describe('LEGACY_INTERCESSION_REFRAIN_LEAD_RE — cohortative trigger', () => {
  const re = LEGACY_INTERCESSION_REFRAIN_LEAD_RE

  it('matches "залбирцгаая:" — trailing colon (canonical PDF form)', () => {
    expect(re.test('хандан залбирцгаая:')).toBe(true)
  })

  it('matches "залбирцгаая." — trailing period', () => {
    expect(re.test('хандан залбирцгаая.')).toBe(true)
  })

  it('matches "залбирцгаая;" — trailing semicolon (NIT batch #409, review #382)', () => {
    // Punctuation class expanded to `[:;.!?]?` so future PDF petition
    // variants using `;` / `!` / `?` still trigger the refrain heuristic.
    expect(re.test('хандан залбирцгаая;')).toBe(true)
  })

  it('matches "залбирцгаая!" — trailing exclamation (NIT batch #409, review #382)', () => {
    expect(re.test('хандан залбирцгаая!')).toBe(true)
  })

  it('matches "залбирцгаая?" — trailing question mark (NIT batch #409, review #382)', () => {
    expect(re.test('хандан залбирцгаая?')).toBe(true)
  })

  it('matches "залбирцгаая" — bare cohortative (no punct)', () => {
    expect(re.test('хандан залбирцгаая')).toBe(true)
  })

  it('tolerates trailing whitespace', () => {
    expect(re.test('хандан залбирцгаая:   ')).toBe(true)
    expect(re.test('хандан залбирцгаая   ')).toBe(true)
  })

  it('does NOT match other cohortative stems (narrow scope)', () => {
    // Audit §3.5 — narrow scope. Other cohortatives (алдаршуулцгаая,
    // гуйцгаая, магтацгаая, …) intentionally NOT triggers; extend
    // case-by-case on user follow-up rather than risk false-positive
    // italic on normal versicles.
    expect(re.test('хандан алдаршуулцгаая:')).toBe(false)
    expect(re.test('Эзэнд гуйцгаая:')).toBe(false)
    expect(re.test('магтацгаая:')).toBe(false)
  })

  it('does NOT match mid-line occurrences', () => {
    // Trigger must be at end of line — anchor `\s*$`.
    expect(re.test('залбирцгаая: гэх мэт.')).toBe(false)
  })

  it('does NOT match unrelated trailing text', () => {
    expect(re.test('Эзэн, Та бол бидний амь болон аврал билээ.')).toBe(false)
    expect(re.test('Бүгдээрээ хандан')).toBe(false)
  })
})

// @fr F-X12
describe('IntercessionsSection — legacy items[] refrain italic (#374)', () => {
  it('marks the line immediately after залбирцгаая: as refrain (italic)', () => {
    // Real-shape input from week-1.json SUN lauds intercessions tail:
    // closing "...залбирцгаая:" → next line is the response refrain that
    // PDF renders italic. (audit §3.1 example)
    const section = makeLegacy([
      'Христ бол хэзээ ч жаргахгүй нар, хүн бүрийн',
      'дээрээс тусдаг үнэн гэрэл билээ. Бүгдээрээ Түүнд',
      'хандан залбирцгаая:',
      'Эзэн, Та бол бидний амь болон аврал билээ.',
      'Оддын бүтээгч ээ, Эзэн биднийг гэгээрүүлээч.',
    ])
    const out = html(createElement(IntercessionsSection, { section }))
    // Refrain item present with both data-role + italic class.
    expect(out).toContain('data-role="intercessions-refrain"')
    expect(out).toMatch(
      /<li data-role="intercessions-refrain" class="font-serif text-stone-800 dark:text-stone-200 italic">— Эзэн, Та бол бидний амь болон аврал билээ\.<\/li>/,
    )
    // Versicles preceding/following stay plain (no italic class, no
    // refrain data-role).
    expect(out).toContain(
      '<li class="font-serif text-stone-800 dark:text-stone-200">— Христ бол хэзээ ч жаргахгүй нар, хүн бүрийн</li>',
    )
    expect(out).toContain(
      '<li class="font-serif text-stone-800 dark:text-stone-200">— Оддын бүтээгч ээ, Эзэн биднийг гэгээрүүлээч.</li>',
    )
    // Sanity — only one refrain in this fixture.
    expect(out.match(/data-role="intercessions-refrain"/g)?.length).toBe(1)
  })

  it('keeps i=0 plain even if line text is "залбирцгаая:" (no preceding line)', () => {
    // Defensive — the regex check guards `i > 0`. Pathological input
    // where the first item ends in a trigger should never elevate
    // ITSELF to refrain.
    const section = makeLegacy([
      'хандан залбирцгаая:',
      'Эзэн, Та бол бидний амь болон аврал билээ.',
    ])
    const out = html(createElement(IntercessionsSection, { section }))
    // First item must NOT be flagged as refrain.
    expect(out).toMatch(
      /<li class="font-serif text-stone-800 dark:text-stone-200">— хандан залбирцгаая:<\/li>/,
    )
    // Second item IS the refrain (preceded by trigger).
    expect(out).toContain('data-role="intercessions-refrain"')
  })

  it('does not italicize when no залбирцгаая trigger exists', () => {
    const section = makeLegacy([
      'Эзэнд гуйцгаая:',
      'Бид Танд гуйж байна.',
      'Эзэн биднийг сонсооч.',
    ])
    const out = html(createElement(IntercessionsSection, { section }))
    // No refrain marker — narrow regex (only залбирцгаая) ignores
    // sibling cohortatives like гуйцгаая.
    expect(out).not.toContain('data-role="intercessions-refrain"')
    expect(out).not.toMatch(/text-stone-200 italic"/)
  })
})
