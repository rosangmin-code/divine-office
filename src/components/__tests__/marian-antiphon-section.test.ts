/**
 * Unit + render tests for `MarianAntiphonSection` line-break behavior on
 * the Аллэлуяа delimiter — F-X1 redo (#223).
 *
 * Background: Eastertide Marian antiphon "Тэнгэрийн Хатан" (Regina Caeli,
 * PDF p.545) authors 6 phrases each terminated by `Аллэлуяа!`. Pre-fix
 * the renderer collapsed all phrases into a single `<p>` so they flowed
 * as one visual line. The split-on-Alleluia helper preserves the PDF
 * line-break convention without touching the underlying data.
 *
 * Test surface:
 *   - splitMarianTextOnAlleluia (pure helper) — split / preservation
 *     edge cases including non-EASTER pass-through, single-phrase
 *     idempotency, leading/trailing whitespace handling, NFR-002 text
 *     verbatim contract.
 *   - MarianAntiphonSection render — `<p data-testid="marian-antiphon-line">`
 *     count matches segments, data-role wrapper present, single-phrase
 *     antiphons render as one paragraph (no over-split regression for
 *     Salve Regina / Alma Redemptoris / Hail Mary).
 *
 * Render uses `react-dom/server` (no jsdom) — matches the
 * `gospel-canticle-section.test.ts` pattern. Structural-substring
 * asserts so cosmetic class re-ordering does not flake.
 */

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import type React from 'react'
import {
  MarianAntiphonSection,
  splitMarianTextOnAlleluia,
} from '../marian-antiphon-section'
import type { HourSection } from '@/lib/types'

type MarianSection = Extract<HourSection, { type: 'marianAntiphon' }>

function makeSection(overrides: Partial<MarianSection> = {}): MarianSection {
  return {
    type: 'marianAntiphon',
    title: 'Salve Regina',
    text: 'Salve Regina body',
    page: 544,
    ...overrides,
  } as MarianSection
}

function render(node: React.ReactElement): string {
  return renderToStaticMarkup(node)
}

// Production "Тэнгэрийн Хатан" (Regina Caeli, Eastertide default) text
// from src/data/loth/ordinarium/compline.json:292. Mirrored here so
// helper-level assertions reference the actual authored data shape.
const REGINA_CAELI_TEXT =
  'Тэнгэрийн Хатан Та, баясагтун. Аллэлуяа! Таны тэврэх зохистой Есүс. Аллэлуяа! Өгүүлсэнчлэн амьд болов. Аллэлуяа! Тэнгэрээс бидний төлөө гуйгтун. Аллэлуяа! Эзэн минь үнэхээр амилсны тул. Аллэлуяа! Охин Мариа, та баясан цэнгэгтүн. Аллэлуяа!'

// Production Salve Regina body (no Alleluia tokens) — single-paragraph
// antiphons must remain single-line after the split helper runs.
const SALVE_REGINA_TEXT =
  'Амар сайн уу, нигүүлсэхүй Хатан эх минь. Амар сайн уу, амь нас минь, зөөлөн найдвар минь. Евагийн огоорсон хөвгүүд бид Тандаа хандму. Эмгэнэж, гашууддаг бид нулимст энэхэн хөндийд таныгаа эгээрмү. Асрагч эх та нигүүлсэнгүй мэлмийгээрээ биднийг тольдоно уу. Ариун хэвлийнхээ үр Есүсийг та бидэнд энэхэн цөллөгөөс хагацсанаас хойш үзүүлнэ үү. Аяа, өршөөлт, итгэлт, зөөлөн охин Мариа минь.'

// @fr FR-NEW (#223 redirect)
describe('splitMarianTextOnAlleluia — pure helper', () => {
  it('splits Тэнгэрийн Хатан into 6 lines, each ending with Аллэлуяа!', () => {
    const lines = splitMarianTextOnAlleluia(REGINA_CAELI_TEXT)
    expect(lines).toHaveLength(6)
    for (const line of lines) {
      expect(line).toMatch(/Аллэлуяа!$/)
    }
    // Spot-check first and last lines verbatim — guards against silent
    // text mutation (NFR-002 contract).
    expect(lines[0]).toBe('Тэнгэрийн Хатан Та, баясагтун. Аллэлуяа!')
    expect(lines[5]).toBe('Охин Мариа, та баясан цэнгэгтүн. Аллэлуяа!')
  })

  it('returns a single-element array when no Аллэлуяа token is present (Salve Regina, Alma, Hail Mary)', () => {
    const lines = splitMarianTextOnAlleluia(SALVE_REGINA_TEXT)
    expect(lines).toEqual([SALVE_REGINA_TEXT])
  })

  it('preserves the original text verbatim across joined lines (NFR-002 contract)', () => {
    const lines = splitMarianTextOnAlleluia(REGINA_CAELI_TEXT)
    // Joining with a single space recovers the source text up to inner
    // whitespace normalisation. The authored data uses single-space
    // separators between phrases; trim removes those, joining restores
    // them. This guards against accidental text mutation in the helper.
    const rejoined = lines.join(' ')
    expect(rejoined).toBe(REGINA_CAELI_TEXT)
  })

  it('handles a single Аллэлуяа phrase (one-line input ending in Alleluia)', () => {
    const text = 'Тэнгэрийн Хатан Та, баясагтун. Аллэлуяа!'
    const lines = splitMarianTextOnAlleluia(text)
    expect(lines).toEqual([text])
  })

  it('handles a trailing remainder after the last Аллэлуяа token (defensive)', () => {
    // Authored data does not currently take this shape, but the helper
    // must not drop content if it ever does.
    const text = 'Phrase one. Аллэлуяа! Phrase two. Аллэлуяа! Phrase three (no Alleluia ending).'
    const lines = splitMarianTextOnAlleluia(text)
    expect(lines).toHaveLength(3)
    expect(lines[0]).toBe('Phrase one. Аллэлуяа!')
    expect(lines[1]).toBe('Phrase two. Аллэлуяа!')
    expect(lines[2]).toBe('Phrase three (no Alleluia ending).')
  })

  it('honours alternate punctuation after Аллэлуяа (period, comma, question)', () => {
    const text = 'Foo. Аллэлуяа. Bar baz. Аллэлуяа, Qux. Аллэлуяа?'
    const lines = splitMarianTextOnAlleluia(text)
    expect(lines).toHaveLength(3)
    expect(lines[0]).toBe('Foo. Аллэлуяа.')
    expect(lines[1]).toBe('Bar baz. Аллэлуяа,')
    expect(lines[2]).toBe('Qux. Аллэлуяа?')
  })

  it('passes through empty string as a single empty line', () => {
    expect(splitMarianTextOnAlleluia('')).toEqual([''])
  })
})

// @fr FR-NEW (#223 redirect)
describe('MarianAntiphonSection — Аллэлуяа line-break render (#223 PDF p.545 정합)', () => {
  it("renders 'Тэнгэрийн Хатан' as 6 separate <p> lines, each ending with Аллэлуяа!", () => {
    const section = makeSection({
      title: 'Тэнгэрийн Хатан',
      text: REGINA_CAELI_TEXT,
      page: 545,
    })
    const html = render(createElement(MarianAntiphonSection, { section }))
    // data-role wrapper present (e2e selector contract).
    expect(html).toContain('data-role="marian-antiphon-text"')
    // 6 line elements (one per phrase). data-testid count is the
    // primary assertion — guarantees the split actually fired and
    // surfaced to the DOM.
    const lineMatches = html.match(/data-testid="marian-antiphon-line"/g) ?? []
    expect(lineMatches).toHaveLength(6)
    // Each rendered phrase ends with Аллэлуяа! before the closing </p>
    // (no inline run-together).
    const phraseEndings = html.match(/Аллэлуяа!<\/p>/g) ?? []
    expect(phraseEndings).toHaveLength(6)
    // First and last phrases verbatim — guards against text mutation.
    expect(html).toContain('Тэнгэрийн Хатан Та, баясагтун. Аллэлуяа!')
    expect(html).toContain('Охин Мариа, та баясан цэнгэгтүн. Аллэлуяа!')
  })

  it("renders Salve Regina (no Аллэлуяа) as a single <p> line — no over-split regression", () => {
    const section = makeSection({
      title: 'Төгс жаргалт Цэвэр Охин Мариагийн хүндэтгэлийн дуу',
      text: SALVE_REGINA_TEXT,
    })
    const html = render(createElement(MarianAntiphonSection, { section }))
    expect(html).toContain('data-role="marian-antiphon-text"')
    const lineMatches = html.match(/data-testid="marian-antiphon-line"/g) ?? []
    expect(lineMatches).toHaveLength(1)
    expect(html).toContain(SALVE_REGINA_TEXT)
  })

  it('renders Alma Redemptoris (no Аллэлуяа) as a single <p> line', () => {
    const section = makeSection({
      title: 'Аврагчийн хайрт эх',
      text: 'Тэнгэрийн замд та бол үүд Зүгийг заагч од, Унасан биднийг өргөн босготугай.',
    })
    const html = render(createElement(MarianAntiphonSection, { section }))
    const lineMatches = html.match(/data-testid="marian-antiphon-line"/g) ?? []
    expect(lineMatches).toHaveLength(1)
  })

  it('renders Hail Mary (no Аллэлуяа) as a single <p> line', () => {
    const section = makeSection({
      title: 'Амар амгалан Мариа',
      text: 'Амар амгалан Мариа минь ээ, Та хишиг ивээлээр бялхам билээ. Эзэн тантай хамт байна.',
    })
    const html = render(createElement(MarianAntiphonSection, { section }))
    const lineMatches = html.match(/data-testid="marian-antiphon-line"/g) ?? []
    expect(lineMatches).toHaveLength(1)
  })

  it("when candidates are present, switches displayText source but still splits 'Тэнгэрийн Хатан' on Alleluia", () => {
    // Mirrors the production assembleCompline output where
    // selectedIndex points at the Eastertide-selected Marian
    // (idx 2 = Тэнгэрийн Хатан). Renderer derives displayText from
    // candidates[selectedIdx], not section.text.
    const section = makeSection({
      title: 'Salve Regina',
      text: 'Salve Regina body',
      candidates: [
        { title: 'Salve Regina', text: SALVE_REGINA_TEXT, page: 544 },
        { title: 'Аврагчийн хайрт эх', text: 'Alma body', page: 544 },
        { title: 'Тэнгэрийн Хатан', text: REGINA_CAELI_TEXT, page: 545 },
        { title: 'Амар амгалан Мариа', text: 'Hail Mary body', page: 545 },
      ],
      selectedIndex: 2,
    })
    const html = render(createElement(MarianAntiphonSection, { section }))
    // selectedIndex=2 (Eastertide default) → 6 lines, each ending Alleluia.
    const lineMatches = html.match(/data-testid="marian-antiphon-line"/g) ?? []
    expect(lineMatches).toHaveLength(6)
    const phraseEndings = html.match(/Аллэлуяа!<\/p>/g) ?? []
    expect(phraseEndings).toHaveLength(6)
  })

  it("preserves font-serif + leading-relaxed + amber-stone styling on the wrapper (visual identity unchanged)", () => {
    const section = makeSection({
      title: 'Тэнгэрийн Хатан',
      text: REGINA_CAELI_TEXT,
    })
    const html = render(createElement(MarianAntiphonSection, { section }))
    // Wrapper carries the original `<p>` styling so visual identity is
    // preserved — only the inner block structure changed.
    expect(html).toMatch(
      /data-role="marian-antiphon-text"[^>]*class="[^"]*mt-2[^"]*font-serif[^"]*leading-relaxed[^"]*"/,
    )
  })
})
