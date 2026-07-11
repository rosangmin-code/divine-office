/**
 * Unit tests for `ResponsorySection` — PDF 6-line emission contract.
 *
 * #5 (WI 10, 2026-05-19) — PDF universal 6-line pattern (refrain / -refrain /
 * versicle / -shortResponse / Glory Be / -refrain) 의 deterministic emission
 * 을 검증한다. 과거 rich AST body path (`<div class="space-y-2">` 5-block
 * 래퍼 + Х./В. 키릴 prefix) 는 PDF 본문 (`-` hyphen-only) 과 불일치라
 * 제거되었고, `rich` AST 의 `rubric-line` 블록만 PDF 시즌 cue ("Амилалтын
 * улирал:" 등) 보존을 위해 header 와 body 사이에 prepend 한다.
 *
 * Render 는 react-dom/server (`renderToStaticMarkup`) — jsdom 의존 없이
 * 정적 마크업 비교로 충분 (이 컴포넌트는 interactivity 없음).
 */

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { ResponsorySection } from '../responsory-section'
import type { HourSection, PrayerText } from '@/lib/types'

const FULL = 'Аяа Эзэн минь, Таны үйлсийг тунгаан бодоод бидний зүрх сэтгэл гайхамшгаар дүүрдэг.'
const VERSICLE = 'Бүхнийг Та мэргэн ухаанаар бүтээсэн билээ.'
const SHORT = 'Бүхнийг бүтээсэн мэргэн ухааныг бид магтдаг.'
const GLORY_BE = 'Эцэг, Хүү, Ариун Сүнсийг магтан дуулъя.'

type ResponsorySection = Extract<HourSection, { type: 'responsory' }>

function makeSection(
  overrides: Partial<ResponsorySection> = {},
): ResponsorySection {
  return {
    type: 'responsory',
    fullResponse: FULL,
    versicle: VERSICLE,
    shortResponse: SHORT,
    page: 56,
    ...overrides,
  }
}

function renderSection(section: ResponsorySection): string {
  return renderToStaticMarkup(createElement(ResponsorySection, { section }))
}

// Count occurrences of a substring in a string.
function countOf(haystack: string, needle: string): number {
  if (!needle) return 0
  return haystack.split(needle).length - 1
}

describe('ResponsorySection — PDF 6-line emission (#5, WI 10)', () => {
  it('emits exactly 7 <p> (1 header + 6 body lines) for a standard responsory', () => {
    const html = renderSection(makeSection())
    const pCount = (html.match(/<p\b/g) ?? []).length
    expect(pCount).toBe(7)
  })

  it('renders the 6 body lines in PDF order: refrain / -refrain / versicle / -shortResponse / Glory Be / -refrain', () => {
    const html = renderSection(makeSection())
    // Strip the header `<p>` so we only inspect the body sequence.
    // Find the position of the first cantor refrain occurrence inside a body
    // `<p>` (the header has different classes — body uses `font-reading`).
    const fullIdx1 = html.indexOf(FULL)
    const fullIdx2 = html.indexOf(FULL, fullIdx1 + 1)
    const versicleIdx = html.indexOf(VERSICLE)
    const shortIdx = html.indexOf(SHORT)
    const gloryIdx = html.indexOf(GLORY_BE)
    const fullIdx3 = html.indexOf(FULL, fullIdx2 + 1)

    expect(fullIdx1).toBeGreaterThan(-1)
    expect(fullIdx2).toBeGreaterThan(fullIdx1)
    expect(versicleIdx).toBeGreaterThan(fullIdx2)
    expect(shortIdx).toBeGreaterThan(versicleIdx)
    expect(gloryIdx).toBeGreaterThan(shortIdx)
    expect(fullIdx3).toBeGreaterThan(gloryIdx)

    // fullResponse occurs exactly 3 times (line 1, 2, 6).
    expect(countOf(html, FULL)).toBe(3)
  })

  it('adds gold "- " prefix on response lines (lines 2, 4, 6) only — no Х./В. markers', () => {
    const html = renderSection(makeSection())
    // WI-62 재스킨: 응답구 마커는 골드 악센트. PDF response prefix 는
    // styled `<span>- </span>` 가 정확히 3회 (cantor refrain / versicle / Glory Be 뒤).
    // (after cantor refrain / after versicle / after Glory Be).
    const hyphenPrefixCount = countOf(
      html,
      '<span class="text-liturgical-gold dark:text-liturgical-gold-dark">- </span>',
    )
    expect(hyphenPrefixCount).toBe(3)

    // Past rich-path markers must not appear.
    expect(html).not.toContain('Х.')
    expect(html).not.toContain('В.')
  })

  it('Triduum simplified form: renders versicle alone when fullResponse + shortResponse are empty', () => {
    const html = renderSection(
      makeSection({ fullResponse: '', shortResponse: '', versicle: VERSICLE }),
    )
    // Header + single body `<p>` for the antiphon.
    const pCount = (html.match(/<p\b/g) ?? []).length
    expect(pCount).toBe(2)
    expect(html).toContain(VERSICLE)
    // No `-` prefix (no response repeat in simplified form).
    expect(html).not.toContain('- </span>')
    expect(html).not.toContain(GLORY_BE)
  })

  it('Easter Octave simplified form: no versicle / shortResponse → 4-line emission (refrain / -refrain / Glory Be / -refrain)', () => {
    // eastertideOctave shape in production: fullResponse populated, versicle &
    // shortResponse empty. Plain path skips empty middle lines automatically.
    const html = renderSection(
      makeSection({
        fullResponse: 'Энэ нь Эзэний бүтээсэн өдөр тул үүнд хөгжилдөн баярлацгаая. Аллэлуяа!',
        versicle: '',
        shortResponse: '',
      }),
    )
    const pCount = (html.match(/<p\b/g) ?? []).length
    // 1 header + 4 body (refrain / -refrain / Glory Be / -refrain).
    expect(pCount).toBe(5)
    // fullResponse appears 3 times (lines 1, 2, final).
    const fr = 'Энэ нь Эзэний бүтээсэн өдөр тул үүнд хөгжилдөн баярлацгаая. Аллэлуяа!'
    expect(countOf(html, fr)).toBe(3)
    // No versicle / shortResponse strings.
    expect(html).toContain(GLORY_BE)
    // Two `-` prefixes (after cantor refrain + after Glory Be).
    const hyphenPrefixCount = countOf(
      html,
      '<span class="text-liturgical-gold dark:text-liturgical-gold-dark">- </span>',
    )
    expect(hyphenPrefixCount).toBe(2)
  })
})

describe('ResponsorySection — rich.rubric-line preservation (#5, WI 10)', () => {
  it('renders rich.blocks[].kind="rubric-line" entries between header and body', () => {
    const rich: PrayerText = {
      blocks: [
        { kind: 'rubric-line', text: 'Амилалтын улирал:' },
        // The 5 standard responsory blocks below MUST be ignored by the body
        // renderer — plain 6-line path is the SSOT for the responsory body
        // since #5 (WI 10).
        { kind: 'para', spans: [{ kind: 'response', text: FULL }] },
        { kind: 'para', spans: [{ kind: 'versicle', text: VERSICLE }] },
        { kind: 'para', spans: [{ kind: 'response', text: SHORT }] },
        { kind: 'para', spans: [{ kind: 'text', text: GLORY_BE }] },
        { kind: 'para', spans: [{ kind: 'response', text: FULL }] },
      ],
    }
    const html = renderSection(makeSection({ rich }))

    // Rubric-line is rendered as a red prefix paragraph with the dedicated
    // data-role marker.
    expect(html).toContain('data-role="responsory-rubric-line"')
    expect(html).toContain('Амилалтын улирал:')

    // Body still emits 6 plain lines + 1 header + 1 rubric-line = 8 <p>.
    const pCount = (html.match(/<p\b/g) ?? []).length
    expect(pCount).toBe(8)

    // No legacy Х./В. markers even though rich AST is present.
    expect(html).not.toContain('Х.')
    expect(html).not.toContain('В.')
  })

  it('omits rubric-line section entirely when rich is undefined', () => {
    const html = renderSection(makeSection({ rich: undefined }))
    expect(html).not.toContain('responsory-rubric-line')
  })

  it('omits rubric-line section when rich has no rubric-line blocks', () => {
    const rich: PrayerText = {
      blocks: [
        { kind: 'para', spans: [{ kind: 'response', text: FULL }] },
      ],
    }
    const html = renderSection(makeSection({ rich }))
    expect(html).not.toContain('responsory-rubric-line')
  })
})
