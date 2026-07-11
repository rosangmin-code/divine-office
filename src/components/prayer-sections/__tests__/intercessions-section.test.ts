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

// F-X12 Phase A.1 (#425) — structured petition fixture builder.
// `items` MUST be non-empty for the structured branch to render — the
// renderer's "no items" early-return (line 61, intercessions-section.tsx)
// fires BEFORE the petitions check. In real data lauds.ts/vespers.ts
// always pass the raw lines array as `items`, so we mirror that:
// fallback to a single-line stub when caller doesn't override.
function makeStructured(args: {
  petitions: { versicle: string; response?: string }[]
  introduction?: string
  refrain?: string
  closing?: string
  items?: string[]
}): Extract<HourSection, { type: 'intercessions' }> {
  return {
    type: 'intercessions',
    intro: '',
    items: args.items ?? ['__structured_stub__'],
    introduction: args.introduction,
    refrain: args.refrain,
    petitions: args.petitions,
    closing: args.closing,
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
      /<li data-role="intercessions-refrain" class="font-reading text-stone-800 dark:text-stone-200 italic">— Эзэн, Та бол бидний амь болон аврал билээ\.<\/li>/,
    )
    // Versicles preceding/following stay plain (no italic class, no
    // refrain data-role).
    expect(out).toContain(
      '<li class="font-reading text-stone-800 dark:text-stone-200">— Христ бол хэзээ ч жаргахгүй нар, хүн бүрийн</li>',
    )
    expect(out).toContain(
      '<li class="font-reading text-stone-800 dark:text-stone-200">— Оддын бүтээгч ээ, Эзэн биднийг гэгээрүүлээч.</li>',
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
      /<li class="font-reading text-stone-800 dark:text-stone-200">— хандан залбирцгаая:<\/li>/,
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

// @fr F-X12
// F-X12 Phase A.1 (#425) — structured petitions[].response italic.
//
// Schema: `petitions[].response` is the post-`-` segment parsed by
// `parseIntercessions` (lib/hours/intercessions.ts) — it is, by
// construction, the italic per-petition response refrain. Unlike the
// legacy items[] path (#374) which infers the refrain via the
// LEGACY_INTERCESSION_REFRAIN_LEAD_RE heuristic, the structured path
// has no inference — every `response` field IS the italic refrain.
//
// PDF spot-check (audit doc §3.5):
//   p67 Sun Lauds:    "Эзэн, Та бол бидний амь болон аврал билээ." italic
//   p75 Sun Vespers:  "Эзэн, Таны хаанчлал орших болтугай." italic
//   p83 Mon Lauds:    "Эзэн, Та бидэнд Сүнсээ хайрлана уу." italic
describe('IntercessionsSection — structured petitions[].response italic (#425)', () => {
  it('renders each petition response with italic class (positive)', () => {
    // Real-shape input — Sunday Vespers (PDF p75) shape after parser:
    // refrain (lead) + 2 versicle/response pairs.
    const section = makeStructured({
      introduction:
        'Эзэн Христ бол бидний тэргүүн. Бид түүний гишүүд. Түүндээ баяртайгаар хандан ийн залбирцгаая:',
      refrain: 'Эзэн, Таны хаанчлал орших болтугай.',
      petitions: [
        {
          versicle:
            'Христ, бидний Аврагч минь, Та Өөрийн Католик шашныг бүх хүн төрөлхтний эв нэгдлийн тод бэлгэ тэмдэг болгоно уу.',
          response:
            'Түүнийгээ Та бүх хүмүүсийн төлөө авралын ариун ёслолыг илүү бодитоор болгоно уу.',
        },
        {
          versicle:
            'Та өөрийн оршихуйгаар уламжлан Пап ламтай нэгтгэгдсэн хамба лам нарын бүлгэмийг удирдан зална уу.',
          response:
            'Тэдэнд эв нэгдэл, хайр энэрэл ба амар амгалангийн хишгийг хайрлан соёрхоно уу.',
        },
      ],
    })
    const out = html(createElement(IntercessionsSection, { section }))

    // Both responses must carry the data-role marker AND the `italic`
    // class. Fixture has 2 petitions — sanity-count both occurrences.
    const responseMatches = out.match(/data-role="intercessions-response"/g)
    expect(responseMatches?.length).toBe(2)
    // Each response div carries `italic` Tailwind class.
    expect(
      out.match(
        /<div data-role="intercessions-response" class="mt-1 italic">/g,
      )?.length,
    ).toBe(2)
    // Verbatim PDF text (NFR-002 — Mongolian Cyrillic only).
    expect(out).toContain(
      'Түүнийгээ Та бүх хүмүүсийн төлөө авралын ариун ёслолыг илүү бодитоор болгоно уу.',
    )
    expect(out).toContain(
      'Тэдэнд эв нэгдэл, хайр энэрэл ба амар амгалангийн хишгийг хайрлан соёрхоно уу.',
    )
    // Versicle div MUST stay plain (no italic on the `<div>{p.versicle}</div>`).
    expect(out).toMatch(
      /<div>Христ, бидний Аврагч минь, Та Өөрийн Католик шашныг бүх хүн төрөлхтний эв нэгдлийн тод бэлгэ тэмдэг болгоно уу\.<\/div>/,
    )
    // Lead refrain (separate <p>) keeps its existing italic class —
    // F-X12 Phase A.1 must not regress the lead refrain styling.
    expect(out).toContain('data-role="intercessions-refrain"')
    expect(out).toMatch(/font-reading italic/)
    // Hyphen prefix span must NOT inherit italic (it's a gold response
    // marker, not part of the response text). `not-italic` reverses
    // the parent `italic` so the dash stays upright per PDF. WI-62 재스킨:
    // 응답구 마커는 골드 악센트.
    expect(out).toContain(
      '<span class="not-italic text-liturgical-gold dark:text-liturgical-gold-dark">- </span>',
    )
  })

  it('omits the response div entirely when response is undefined', () => {
    // Defensive — `response` is optional on `ParsedPetition`. A
    // versicle-only petition (no `-` separator in the source) MUST NOT
    // emit an italic empty div, and MUST NOT emit the dash prefix.
    const section = makeStructured({
      petitions: [
        {
          versicle: 'Бид Танд итгэдэг — Эзэн биднийг сонсооч.',
          // intentionally no response
        },
      ],
    })
    const out = html(createElement(IntercessionsSection, { section }))
    expect(out).not.toContain('data-role="intercessions-response"')
    expect(out).not.toMatch(/<span class="not-italic text-red-700/)
  })

  it('idempotent — repeated renders produce identical italic markup', () => {
    // Idempotency: italic is applied via a stable className, not
    // accumulated in any state. Two renders of the same section must
    // produce byte-identical markup; no double-italic compounding.
    const section = makeStructured({
      petitions: [
        {
          versicle: 'Та амар тайван өдрийг хайрлана уу.',
          response: 'Үдэш болоход бид Таныг магтана.',
        },
      ],
    })
    const out1 = html(createElement(IntercessionsSection, { section }))
    const out2 = html(createElement(IntercessionsSection, { section }))
    expect(out1).toBe(out2)
    // Single italic class — never doubled.
    expect(
      out1.match(/data-role="intercessions-response" class="mt-1 italic"/g)
        ?.length,
    ).toBe(1)
    expect(out1).not.toMatch(/italic\s+italic/)
  })

  it('legacy items[] refrain italic still works (regression #374 / #382)', () => {
    // Phase A.1 must NOT regress Phase A. Same fixture as the original
    // legacy-path test — re-asserted here to keep the structured-vs-
    // legacy boundary explicit.
    const section = makeLegacy([
      'Бүгдээрээ Түүнд хандан залбирцгаая:',
      'Эзэн, Та бол бидний амь болон аврал билээ.',
      'Оддын бүтээгч ээ, Эзэн биднийг гэгээрүүлээч.',
    ])
    const out = html(createElement(IntercessionsSection, { section }))
    expect(out).toContain('data-role="intercessions-refrain"')
    expect(out).toMatch(
      /<li data-role="intercessions-refrain" class="font-reading text-stone-800 dark:text-stone-200 italic">— Эзэн, Та бол бидний амь болон аврал билээ\.<\/li>/,
    )
    // The structured-path data-role MUST NOT leak into legacy markup
    // (legacy items[] uses <li>, not the <div data-role="intercessions-response">).
    expect(out).not.toContain('data-role="intercessions-response"')
  })
})
