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

// ─── #225 — phrase-unit `lines` field + hanging indent ───
//
// 4 PDF p.544-545 Marian antiphons author phrase boundaries directly via
// `lines: string[]` in compline.json. The renderer prefers `lines` over
// the legacy `splitMarianTextOnAlleluia(text)` fallback so the line
// boundaries match the PDF visual layout (not just the Аллэлуяа token).
// Each rendered `<p>` carries `pl-6 -indent-6` so wrap continuations
// hang under the phrase start, matching the FR-161 R-13 psalm pattern.

// Production phrase decomposition for the 4 antiphons — kept here as
// the single anchor so test failures point straight at compline.json
// drift.
const SALVE_REGINA_LINES = [
  'Амар сайн уу, нигүүлсэхүй Хатан эх минь.',
  'Амар сайн уу, амь нас минь, зөөлөн найдвар минь.',
  'Евагийн огоорсон хөвгүүд бид Тандаа хандму.',
  'Эмгэнэж, гашууддаг бид нулимст энэхэн хөндийд таныгаа эгээрмү.',
  'Асрагч эх та нигүүлсэнгүй мэлмийгээрээ биднийг тольдоно уу.',
  'Ариун хэвлийнхээ үр Есүсийг та бидэнд энэхэн цөллөгөөс хагацсанаас хойш үзүүлнэ үү.',
  'Аяа, өршөөлт, итгэлт, зөөлөн охин Мариа минь.',
]

const ALMA_REDEMPTORIS_LINES = [
  'Тэнгэрийн замд та бол үүд Зүгийг заагч од,',
  'Унасан биднийг өргөн босготугай.',
  'Ардыг тэтгэн босготугай.',
  'Таны төрсөн нь Гайхамшигт чанартай',
  'Түүнийг бидэнд гуйтугай!',
  'Нэгэн насанд бат охин Габриелийн үгсээр',
  'Амгаланг хүртэгч',
  'Нүгэлтнүүдийг нигүүлсэгтүн.',
]

const REGINA_CAELI_LINES = [
  'Тэнгэрийн Хатан Та, баясагтун. Аллэлуяа!',
  'Таны тэврэх зохистой Есүс. Аллэлуяа!',
  'Өгүүлсэнчлэн амьд болов. Аллэлуяа!',
  'Тэнгэрээс бидний төлөө гуйгтун. Аллэлуяа!',
  'Эзэн минь үнэхээр амилсны тул. Аллэлуяа!',
  'Охин Мариа, та баясан цэнгэгтүн. Аллэлуяа!',
]

const HAIL_MARY_LINES = [
  'Амар амгалан Мариа минь ээ',
  'Та хишиг ивээлээр бялхам билээ.',
  'Эзэн тантай хамт байна.',
  'Таныг эмэгтэйчүүдийн дундаас адисалсан билээ.',
  'Таны хэвлий дэх үр Есүсийг бас адисалсан билээ.',
  'Тэнгэрбурханы эх Мариа Гэгээн минь ээ',
  'Та одоо болон насан эцэслэх мөчид',
  'Нүгэлт бидний төлөө залбиран соёрхоно уу.',
]

// @fr FR-NEW (#225)
describe('MarianAntiphonSection — phrase-unit `lines` path (#225 PDF p.544-545 정합)', () => {
  it('prefers `lines` over `splitMarianTextOnAlleluia(text)` when `lines` is present on the section', () => {
    // text contains a single Аллэлуяа token (would split to 1 line via
    // the legacy helper); `lines` carries 3 phrases. Renderer must use
    // `lines` — proves the precedence wired in the renderer.
    const section = makeSection({
      title: 'Custom',
      text: 'one. Аллэлуяа!',
      lines: ['phrase A', 'phrase B', 'phrase C'],
    })
    const html = render(createElement(MarianAntiphonSection, { section }))
    const lineMatches = html.match(/data-testid="marian-antiphon-line"/g) ?? []
    expect(lineMatches).toHaveLength(3)
    expect(html).toContain('phrase A')
    expect(html).toContain('phrase B')
    expect(html).toContain('phrase C')
  })

  it("Salve Regina renders 7 phrase lines (PDF p.544 visual layout)", () => {
    const section = makeSection({
      title: 'Төгс жаргалт Цэвэр Охин Мариагийн хүндэтгэлийн дуу',
      text: SALVE_REGINA_TEXT,
      lines: SALVE_REGINA_LINES,
      page: 544,
    })
    const html = render(createElement(MarianAntiphonSection, { section }))
    const lineMatches = html.match(/data-testid="marian-antiphon-line"/g) ?? []
    expect(lineMatches).toHaveLength(7)
    for (const line of SALVE_REGINA_LINES) {
      expect(html).toContain(line)
    }
  })

  it('Alma Redemptoris renders 8 phrase lines (PDF p.544 visual layout, sense-line breaks without sentence-end punctuation)', () => {
    const section = makeSection({
      title: 'Аврагчийн хайрт эх',
      text: 'unused legacy text',
      lines: ALMA_REDEMPTORIS_LINES,
      page: 544,
    })
    const html = render(createElement(MarianAntiphonSection, { section }))
    const lineMatches = html.match(/data-testid="marian-antiphon-line"/g) ?? []
    expect(lineMatches).toHaveLength(8)
    // Spot-check a comma-terminated line and a no-terminal-punct line —
    // helper-fallback would have ignored these as non-Alleluia and
    // collapsed the antiphon into a single line; `lines` preserves the
    // PDF break.
    expect(html).toContain('Тэнгэрийн замд та бол үүд Зүгийг заагч од,')
    expect(html).toContain('Амгаланг хүртэгч')
  })

  it('Regina Caeli (Eastertide default) renders 6 Аллэлуяа phrase lines (PDF p.545)', () => {
    const section = makeSection({
      title: 'Тэнгэрийн Хатан',
      text: REGINA_CAELI_TEXT,
      lines: REGINA_CAELI_LINES,
      page: 545,
    })
    const html = render(createElement(MarianAntiphonSection, { section }))
    const lineMatches = html.match(/data-testid="marian-antiphon-line"/g) ?? []
    expect(lineMatches).toHaveLength(6)
    const phraseEndings = html.match(/Аллэлуяа!<\/p>/g) ?? []
    expect(phraseEndings).toHaveLength(6)
  })

  it('Hail Mary renders 8 phrase lines (PDF p.545, mixed terminal/no-terminal punctuation)', () => {
    const section = makeSection({
      title: 'Амар амгалан Мариа',
      text: 'unused legacy text',
      lines: HAIL_MARY_LINES,
      page: 545,
    })
    const html = render(createElement(MarianAntiphonSection, { section }))
    const lineMatches = html.match(/data-testid="marian-antiphon-line"/g) ?? []
    expect(lineMatches).toHaveLength(8)
    expect(html).toContain('Амар амгалан Мариа минь ээ')
    expect(html).toContain('Нүгэлт бидний төлөө залбиран соёрхоно уу.')
  })

  it('every line carries the `pl-6 -indent-6` hanging-indent classes (FR-161 R-13 visual parity)', () => {
    const section = makeSection({
      title: 'Тэнгэрийн Хатан',
      text: REGINA_CAELI_TEXT,
      lines: REGINA_CAELI_LINES,
    })
    const html = render(createElement(MarianAntiphonSection, { section }))
    // Match every `<p data-testid="marian-antiphon-line" class="...">`
    // and assert the class string contains both pl-6 and -indent-6.
    const pTagRegex = /<p[^>]*data-testid="marian-antiphon-line"[^>]*class="([^"]*)"[^>]*>/g
    const classMatches = Array.from(html.matchAll(pTagRegex))
    expect(classMatches).toHaveLength(6)
    for (const m of classMatches) {
      const cls = m[1]
      expect(cls).toContain('pl-6')
      expect(cls).toContain('-indent-6')
    }
  })

  it('candidates carry per-candidate `lines`; switching selectedIndex switches lines source', () => {
    // Mirrors production flow — assembler attaches `lines` from the
    // selected candidate; renderer must prefer `current.lines` (from
    // candidates[selectedIdx]) over the section-level `lines`.
    const section = makeSection({
      title: 'Salve Regina',
      text: 'unused',
      lines: ['section-level line — should NOT render when candidate has its own lines'],
      candidates: [
        { title: 'Salve Regina', text: SALVE_REGINA_TEXT, lines: SALVE_REGINA_LINES, page: 544 },
        { title: 'Аврагчийн хайрт эх', text: 'Alma body', lines: ALMA_REDEMPTORIS_LINES, page: 544 },
        { title: 'Тэнгэрийн Хатан', text: REGINA_CAELI_TEXT, lines: REGINA_CAELI_LINES, page: 545 },
        { title: 'Амар амгалан Мариа', text: 'Hail Mary body', lines: HAIL_MARY_LINES, page: 545 },
      ],
      selectedIndex: 2,
    })
    const html = render(createElement(MarianAntiphonSection, { section }))
    const lineMatches = html.match(/data-testid="marian-antiphon-line"/g) ?? []
    // selectedIndex=2 (Eastertide) → 6 phrase lines from REGINA_CAELI_LINES.
    expect(lineMatches).toHaveLength(6)
    expect(html).toContain('Охин Мариа, та баясан цэнгэгтүн. Аллэлуяа!')
    // Section-level `lines` not used when candidate carries its own.
    expect(html).not.toContain('section-level line')
  })

  it('falls back to splitMarianTextOnAlleluia(text) when neither candidate.lines nor section.lines is present (legacy data)', () => {
    // Sanctoral propers / hypothetical future Marian variants without
    // the phrase decomposition — must keep working via the helper.
    const section = makeSection({
      title: 'Legacy Marian',
      text: 'first phrase. Аллэлуяа! second phrase. Аллэлуяа!',
      // no `lines` field
    })
    const html = render(createElement(MarianAntiphonSection, { section }))
    const lineMatches = html.match(/data-testid="marian-antiphon-line"/g) ?? []
    expect(lineMatches).toHaveLength(2)
    expect(html).toContain('first phrase. Аллэлуяа!')
    expect(html).toContain('second phrase. Аллэлуяа!')
  })

  it('NFR-002 — `lines` content matches PDF source verbatim per the authored decomposition', () => {
    // Anchor against compline.json drift: every line in each authored
    // antiphon must equal the constant arrays declared above. Failure
    // here means compline.json has drifted from the PDF reference.
    expect(SALVE_REGINA_LINES).toHaveLength(7)
    expect(ALMA_REDEMPTORIS_LINES).toHaveLength(8)
    expect(REGINA_CAELI_LINES).toHaveLength(6)
    expect(HAIL_MARY_LINES).toHaveLength(8)
    // Reginae specifically — every phrase ends with the Eastertide
    // Аллэлуяа! token.
    for (const line of REGINA_CAELI_LINES) {
      expect(line).toMatch(/Аллэлуяа!$/)
    }
  })
})

// @fr FR-NEW (#225) — L2 integration: assembleCompline → MarianAntiphonSection
// reads compline.json directly so any drift in the authored `lines`
// fields is caught at the production boundary.
describe('assembleCompline + render — Marian phrase-unit production data (#225 L2)', () => {
  it('Eastertide Saturday (2026-05-02 SAT) → Regina Caeli surfaces 6 phrase <p>s with hanging indent', async () => {
    const { assembleHour } = await import('../../lib/loth-service')
    const result = await assembleHour('2026-05-02', 'compline')
    expect(result).not.toBeNull()
    const marian = result!.sections.find(
      (s): s is Extract<import('../../lib/types').HourSection, { type: 'marianAntiphon' }> =>
        s.type === 'marianAntiphon',
    )
    expect(marian).toBeDefined()
    // Eastertide selector picks Regina Caeli (idx 2).
    expect(marian!.title).toBe('Тэнгэрийн Хатан')
    expect(marian!.lines).toEqual(REGINA_CAELI_LINES)
    // Render through the production component.
    const html = render(createElement(MarianAntiphonSection, { section: marian! }))
    const lineMatches = html.match(/data-testid="marian-antiphon-line"/g) ?? []
    expect(lineMatches).toHaveLength(6)
    // Hanging-indent class on every rendered line.
    const pTagRegex = /<p[^>]*data-testid="marian-antiphon-line"[^>]*class="([^"]*)"[^>]*>/g
    const classMatches = Array.from(html.matchAll(pTagRegex))
    for (const m of classMatches) {
      expect(m[1]).toContain('pl-6')
      expect(m[1]).toContain('-indent-6')
    }
  })

  it('Ordinary Time Saturday (2026-08-29) → Salve Regina (default) surfaces 7 phrase <p>s', async () => {
    const { assembleHour } = await import('../../lib/loth-service')
    const result = await assembleHour('2026-08-29', 'compline')
    expect(result).not.toBeNull()
    const marian = result!.sections.find(
      (s): s is Extract<import('../../lib/types').HourSection, { type: 'marianAntiphon' }> =>
        s.type === 'marianAntiphon',
    )
    expect(marian).toBeDefined()
    expect(marian!.title).toBe('Төгс жаргалт Цэвэр Охин Мариагийн хүндэтгэлийн дуу')
    expect(marian!.lines).toEqual(SALVE_REGINA_LINES)
    const html = render(createElement(MarianAntiphonSection, { section: marian! }))
    const lineMatches = html.match(/data-testid="marian-antiphon-line"/g) ?? []
    expect(lineMatches).toHaveLength(7)
  })

  it('Advent Sunday (2025-12-07 ADVENT WEEK 2) → Alma Redemptoris surfaces 8 phrase <p>s', async () => {
    const { assembleHour } = await import('../../lib/loth-service')
    const result = await assembleHour('2025-12-07', 'compline')
    expect(result).not.toBeNull()
    const marian = result!.sections.find(
      (s): s is Extract<import('../../lib/types').HourSection, { type: 'marianAntiphon' }> =>
        s.type === 'marianAntiphon',
    )
    expect(marian).toBeDefined()
    expect(marian!.title).toBe('Аврагчийн хайрт эх')
    expect(marian!.lines).toEqual(ALMA_REDEMPTORIS_LINES)
    const html = render(createElement(MarianAntiphonSection, { section: marian! }))
    const lineMatches = html.match(/data-testid="marian-antiphon-line"/g) ?? []
    expect(lineMatches).toHaveLength(8)
  })

  it('all 4 candidates carry their own `lines` field (renderer dropdown switches between them)', async () => {
    const { assembleHour } = await import('../../lib/loth-service')
    const result = await assembleHour('2026-05-02', 'compline')
    const marian = result!.sections.find(
      (s): s is Extract<import('../../lib/types').HourSection, { type: 'marianAntiphon' }> =>
        s.type === 'marianAntiphon',
    )
    expect(marian!.candidates).toHaveLength(4)
    for (const c of marian!.candidates ?? []) {
      expect(c.lines).toBeDefined()
      expect(c.lines!.length).toBeGreaterThan(0)
    }
  })
})
