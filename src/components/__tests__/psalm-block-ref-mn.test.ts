/**
 * NFR-002 — 시편·찬가 헤더의 성경 참조를 몽골어 표기로 렌더 (app-review
 * 2026-09-13 §2 "영문 성경 참조 라벨 노출", §3.3 NFR-002 목록 1번).
 *
 * 이전: `<span>Дуулал</span><h4>PSALM 63:2-9</h4>` + `aria-label="Psalm 63:2-9"`.
 * 이후: PDF 레이아웃 재현 —
 *   시편  `<h4 data-role="psalm-header">Дуулал 63:2-9</h4>` (한 줄, L1810)
 *   찬가  `<span>Магтаал</span><h4>Даниел 3:57-88, 56</h4>` (두 줄, L1876-1877)
 * aria-label 도 몽골어. e2e 가 쓰는 원본 키는 `data-ref` 로 보존.
 *
 * SSR (react-dom/server) 패턴은 psalm-block-header-guard.test.ts 와 동일.
 */
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { PsalmBlock } from '../psalm-block'
import { ShortReadingSection } from '../prayer-sections/short-reading-section'
import { SettingsProvider } from '@/lib/settings'
import type { AssembledPsalm, HourSection } from '@/lib/types'

function makePsalm(overrides: Partial<AssembledPsalm> = {}): AssembledPsalm {
  return {
    psalmType: 'psalm',
    reference: 'Psalm 63:2-9',
    antiphon: 'Тэнгэрбурхан, Та миний Тэнгэрбурхан',
    verses: [],
    stanzas: [['Тэнгэрбурхан, Та миний Тэнгэрбурхан', 'Би Таныг эртлэн хайх болой.']],
    gloriaPatri: true,
    page: 60,
    ...overrides,
  }
}

function render(node: React.ReactElement): string {
  return renderToStaticMarkup(createElement(SettingsProvider, null, node))
}

function headerText(html: string): string {
  const m = html.match(/<h4[^>]*data-role="psalm-header"[^>]*>([\s\S]*?)<\/h4>/)
  if (!m) throw new Error('psalm-header h4 not found')
  return m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function ariaLabel(html: string): string {
  const m = html.match(/<section[^>]*data-role="psalm-block"[^>]*aria-label="([^"]*)"/)
  if (!m) throw new Error('psalm-block aria-label not found')
  return m[1]
}

// @fr NFR-002
describe('PsalmBlock — 헤더·aria-label 몽골어 성경 참조 (NFR-002)', () => {
  it('시편: h4 가 `Дуулал 63:2-9` 한 줄, 라벨 span 중복 없음', () => {
    const html = render(createElement(PsalmBlock, { psalm: makePsalm() }))
    expect(headerText(html)).toBe('Дуулал 63:2-9')
    // 이전의 별도 라벨 span(`>Дуулал<`)이 사라져 "Дуулал Дуулал" 이중 표기가 없다
    expect(html).not.toMatch(/>\s*Дуулал\s*<\/span>/)
    expect((html.match(/Дуулал 63:2-9/g) ?? []).length).toBeGreaterThanOrEqual(1)
  })

  it('찬가: `Магтаал` 라벨 span + h4 `Даниел 3:57-88, 56` 두 줄', () => {
    const html = render(
      createElement(PsalmBlock, {
        psalm: makePsalm({ psalmType: 'canticle', reference: 'Daniel 3:57-88, 56' }),
      }),
    )
    expect(html).toMatch(/>\s*Магтаал\s*<\/span>/)
    expect(headerText(html)).toBe('Даниел 3:57-88, 56')
    expect(ariaLabel(html)).toBe('Даниел 3:57-88, 56')
  })

  it('aria-label 이 몽골어이고 원본 키는 data-ref 로 보존된다', () => {
    const html = render(createElement(PsalmBlock, { psalm: makePsalm() }))
    expect(ariaLabel(html)).toBe('Дуулал 63:2-9')
    expect(html).toContain('data-ref="Psalm 63:2-9"')
  })

  it('DOM 텍스트·aria-label 어디에도 영문 `Psalm` 이 남지 않는다 (data-ref 제외)', () => {
    const html = render(createElement(PsalmBlock, { psalm: makePsalm() }))
    const withoutDataRef = html.replace(/data-ref="[^"]*"/g, '')
    expect(withoutDataRef).not.toMatch(/\bPsalm\b/)
    expect(withoutDataRef).not.toMatch(/aria-label="[^"]*[A-Za-z]{3,}[^"]*"/)
  })

  it('번호 접두 찬가·Revelation·제2경전 표기', () => {
    const cases: Array<[string, string]> = [
      ['1 Chronicles 29:10-13', '1 Шастир 29:10-13'],
      ['Revelation 19:1-7', 'Илчлэл 19:1-7'],
      ['Tobit 13:1-8', 'Тобит 13:1-8'],
      ['Colossians 1:2б-6', 'Колоссай 1:2б-6'],
    ]
    for (const [reference, expected] of cases) {
      const html = render(
        createElement(PsalmBlock, { psalm: makePsalm({ psalmType: 'canticle', reference }) }),
      )
      expect(headerText(html), reference).toBe(expected)
      expect(ariaLabel(html), reference).toBe(expected)
    }
  })

  it('h4 는 앱 섹션 헤딩 규약대로 uppercase 클래스를 유지한다 (DOM 텍스트는 PDF 대소문자)', () => {
    const html = render(createElement(PsalmBlock, { psalm: makePsalm() }))
    const h4 = html.match(/<h4[^>]*data-role="psalm-header"[^>]*>/)![0]
    expect(h4).toContain('uppercase')
    expect(headerText(html)).toBe('Дуулал 63:2-9')
  })
})

function makeShortReading(
  overrides: Partial<Extract<HourSection, { type: 'shortReading' }>> = {},
): Extract<HourSection, { type: 'shortReading' }> {
  return {
    type: 'shortReading',
    ref: 'Isa 53:11b-12',
    bookMn: 'Исаиа',
    verses: [{ verse: 0, text: 'Миний зөвт зарц олныг зөвтгөнө.' }],
    page: 700,
    ...overrides,
  }
}

function shortReadingRef(html: string): string {
  const m = html.match(/<p[^>]*data-role="short-reading-ref"[^>]*>([\s\S]*?)<\/p>/)
  if (!m) throw new Error('short-reading-ref not found')
  return m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

// @fr NFR-002
describe('ShortReadingSection — 참조 몽골어 표기 (NFR-002)', () => {
  it('영문 약어 ref 는 몽골어 책 이름으로, bookMn 접두는 중복이라 생략', () => {
    const html = renderToStaticMarkup(
      createElement(ShortReadingSection, { section: makeShortReading() }),
    )
    expect(shortReadingRef(html)).toBe('Исаиа 53:11b-12')
    expect(html).not.toContain('Исаиа — Исаиа')
    expect(html).not.toMatch(/\bIsa\b/)
  })

  it('이미 몽골어 ref 는 그대로 (bookMn 없음)', () => {
    const html = renderToStaticMarkup(
      createElement(ShortReadingSection, {
        section: makeShortReading({ ref: 'Исаиа 52:13-15', bookMn: '' }),
      }),
    )
    expect(shortReadingRef(html)).toBe('Исаиа 52:13-15')
  })

  it('매핑 없는 영문 책은 원문 유지 + bookMn 접두 (이전 표기 보존)', () => {
    const html = renderToStaticMarkup(
      createElement(ShortReadingSection, {
        section: makeShortReading({ ref: 'Baruch 5:1-9', bookMn: 'Барух' }),
      }),
    )
    expect(shortReadingRef(html)).toBe('Барух — Baruch 5:1-9')
  })
})
