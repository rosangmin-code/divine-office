/**
 * GOAL #106 후속 — 시편 본문 행 끝의 PDF 조판 en-dash 를 렌더 단계에서
 * 제거하는 계약 (사용자 ruling 2026-08-06: 데이터는 PDF SoT 재현으로 보존,
 * 화면에만 안 보이게).
 *
 * 세 렌더 경로 모두를 덮는다 — phrase / legacy-line / plain-stanzas.
 * phrase 경로는 행을 공백으로 이어 붙이므로 join **전에** 제거해야 하며,
 * 그렇지 않으면 dash 가 문장 중간에 남는다. 그 순서가 이 테스트의 핵심이다.
 *
 * 렌더는 `react-dom/server` 로 한다 (psalm-block-phrases.test.ts 와 동일 패턴).
 */

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { PsalmBlock, stripTrailingLineDash } from '../psalm-block'
import { SettingsProvider } from '@/lib/settings'
import type { AssembledPsalm, PrayerBlock, PrayerText } from '@/lib/types'

// psalter-texts.json 의 실제 값에서 가져온 대표 케이스.
// Psalm 51:3-19 stanzas[1][25..26] — 공백 있는 형태
const REAL_SPACED = 'Эмтэрсэн, гэмшсэн зүрхийг –'
const REAL_NEXT = 'Тэнгэрбурхан Та жигшихгүй.'
// Psalm 30:2-13 stanzas[0][26] — 공백 없는 형태
const REAL_TIGHT = 'ЭЗЭНд би гуйлтыг өргөсөн.–'

function stanzaBlock(lineTexts: string[], phrases?: { lineRange: [number, number]; indent: 0 }[]): PrayerBlock {
  return {
    kind: 'stanza',
    lines: lineTexts.map((text) => ({ spans: [{ kind: 'text', text }], indent: 0 })),
    ...(phrases ? { phrases } : {}),
  } as PrayerBlock
}

// antiphon 은 AssembledPsalm 필수 필드다. dash 를 포함하지 않는 값을 써서
// 본문 검사(`not.toContain('–')`)에 간섭하지 않게 한다.
function richPsalm(blocks: PrayerBlock[]): AssembledPsalm {
  const stanzasRich: PrayerText = { blocks }
  return {
    psalmType: 'psalm',
    reference: 'Psalm test',
    antiphon: 'test antiphon',
    verses: [],
    stanzasRich,
    gloriaPatri: false,
  }
}

function plainPsalm(stanzas: string[][]): AssembledPsalm {
  return {
    psalmType: 'psalm',
    reference: 'Psalm test',
    antiphon: 'test antiphon',
    verses: [],
    stanzas,
    gloriaPatri: false,
  }
}

const render = (node: React.ReactElement): string =>
  renderToStaticMarkup(createElement(SettingsProvider, null, node))

// @fr FR-024
describe('stripTrailingLineDash', () => {
  it('drops a trailing en-dash with or without a preceding space', () => {
    expect(stripTrailingLineDash(REAL_SPACED)).toBe('Эмтэрсэн, гэмшсэн зүрхийг')
    expect(stripTrailingLineDash(REAL_TIGHT)).toBe('ЭЗЭНд би гуйлтыг өргөсөн.')
  })

  it('leaves an en-dash that is not at the end of the line', () => {
    const mid = 'Эхлэл – төгсгөл нь ойрхон.'
    expect(stripTrailingLineDash(mid)).toBe(mid)
  })

  it('does not touch em-dash or hyphen-minus (they are legitimate in the body)', () => {
    // 실측: 데이터의 행말 dash 68건은 전부 U+2013 이다. 나머지 dash 류를
    // 함께 지우면 정당한 용법까지 건드린다.
    expect(stripTrailingLineDash('Аяа Эзэн —')).toBe('Аяа Эзэн —')
    expect(stripTrailingLineDash('Аяа Эзэн -')).toBe('Аяа Эзэн -')
  })

  it('is a no-op on clean lines', () => {
    expect(stripTrailingLineDash(REAL_NEXT)).toBe(REAL_NEXT)
    expect(stripTrailingLineDash('')).toBe('')
  })
})

// @fr FR-024
describe('PsalmBlock — trailing en-dash is stripped in every render path', () => {
  it('phrase path: dash removed before the space-join, not left mid-sentence', () => {
    const psalm = richPsalm([
      stanzaBlock([REAL_SPACED, REAL_NEXT], [{ lineRange: [0, 1], indent: 0 }]),
    ])
    const html = render(createElement(PsalmBlock, { psalm }))

    expect(html).toContain('data-render-mode="phrase"')
    // 이어붙인 결과에 dash 가 남지 않는다 — 이게 join 순서 계약이다.
    expect(html).toContain('Эмтэрсэн, гэмшсэн зүрхийг Тэнгэрбурхан Та жигшихгүй.')
    expect(html).not.toContain('зүрхийг – Тэнгэрбурхан')
    expect(html).not.toContain('–')
  })

  it('legacy line path: dash removed per line', () => {
    const psalm = richPsalm([stanzaBlock([REAL_SPACED, REAL_TIGHT])])
    const html = render(createElement(PsalmBlock, { psalm }))

    expect(html).not.toContain('data-render-mode="phrase"')
    expect(html).toContain('Эмтэрсэн, гэмшсэн зүрхийг</span>')
    expect(html).toContain('ЭЗЭНд би гуйлтыг өргөсөн.</span>')
    expect(html).not.toContain('–')
  })

  it('plain stanzas path: dash removed alongside the existing indent strip', () => {
    const psalm = plainPsalm([[`  ${REAL_SPACED}`, REAL_TIGHT]])
    const html = render(createElement(PsalmBlock, { psalm }))

    // 기존 leading-space strip 과 공존해야 한다.
    expect(html).toContain('>Эмтэрсэн, гэмшсэн зүрхийг</span>')
    expect(html).toContain('>ЭЗЭНд би гуйлтыг өргөсөн.</span>')
    expect(html).not.toContain('–')
  })

  it('does not alter clean stanzas (no-op on the common case)', () => {
    const psalm = richPsalm([stanzaBlock(['Газар хийгээд', 'түүнийг дүүргэдэг бүхэн,'])])
    const html = render(createElement(PsalmBlock, { psalm }))
    expect(html).toContain('Газар хийгээд')
    expect(html).toContain('түүнийг дүүргэдэг бүхэн,')
  })
})
