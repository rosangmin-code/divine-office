/**
 * Unit tests for WI #15 / wi-003 — MonthNav 컴포넌트.
 *
 * Test strategy (gospel-canticle-section.test.ts / liturgical-calendar-list
 * .test.ts 패턴 차용):
 *   - vitest 환경에 jsdom / happy-dom 없음 → 클릭 이벤트는 직접 시뮬레이션
 *     불가. 대신 **로직 헬퍼 직접 호출** + **renderToStaticMarkup 정적
 *     마크업 검증** 두 축으로 AC 를 커버한다.
 *   - shiftMonth / formatMonthLabel 는 pure helper 로 export 되어 있어
 *     클릭 핸들러의 본문을 헬퍼 단위 테스트로 직접 가드 (AC #2-6 의
 *     boundary 계산).
 *   - 컴포넌트의 a11y / 구조 / 라벨 / focus-visible CSS / desktop picker
 *     affordance 는 정적 마크업으로 verify (AC #1, #7, #8, #9).
 */

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { MonthNav, shiftMonth, formatMonthLabel } from '../month-nav'

// @fr FR-145
describe('MonthNav helper — shiftMonth (AC #2-5 boundary)', () => {
  // AC #2 — prev 클릭 → 직전 month
  it('shiftMonth(-1) within same year', () => {
    expect(shiftMonth('2026-05', -1)).toBe('2026-04')
    expect(shiftMonth('2026-12', -1)).toBe('2026-11')
    expect(shiftMonth('2026-02', -1)).toBe('2026-01')
  })

  // AC #3 — next 클릭 → 다음 month
  it('shiftMonth(+1) within same year', () => {
    expect(shiftMonth('2026-05', 1)).toBe('2026-06')
    expect(shiftMonth('2026-01', 1)).toBe('2026-02')
    expect(shiftMonth('2026-11', 1)).toBe('2026-12')
  })

  // AC #4 — 12월 next → 다음년 1월 (boundary)
  it('shiftMonth(+1) crosses year boundary December → next-year January', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2099-12', 1)).toBe('2100-01')
  })

  // AC #5 — 1월 prev → 전년 12월 (boundary)
  it('shiftMonth(-1) crosses year boundary January → previous-year December', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2000-01', -1)).toBe('1999-12')
  })

  it('shiftMonth handles large delta (multi-year jumps)', () => {
    // +13 개월 = 1 year 1 month forward
    expect(shiftMonth('2026-05', 13)).toBe('2027-06')
    // -25 개월 = 2 year 1 month backward
    expect(shiftMonth('2026-05', -25)).toBe('2024-04')
    // 0 은 항등 — 같은 month 그대로
    expect(shiftMonth('2026-05', 0)).toBe('2026-05')
  })

  it('shiftMonth output is zero-padded month (YYYY-MM 항상 2자리)', () => {
    // single-digit month 도 'YYYY-0M' 으로 정규화 (AC #6 picker value 와
    // round-trip 정합).
    expect(shiftMonth('2026-10', -1)).toBe('2026-09')
    expect(shiftMonth('2026-09', -8)).toBe('2026-01')
  })
})

describe('MonthNav helper — formatMonthLabel (AC #1 라벨)', () => {
  // AC #1 — 'YYYY оны M-р сар' (몽골어 관용 표현, plan_artifact section_D
  // wi-003 권장 포맷).
  it('formats single-digit month without leading zero', () => {
    expect(formatMonthLabel('2026-05')).toBe('2026 оны 5-р сар')
    expect(formatMonthLabel('2026-01')).toBe('2026 оны 1-р сар')
    expect(formatMonthLabel('2026-09')).toBe('2026 оны 9-р сар')
  })

  it('formats double-digit month as-is', () => {
    expect(formatMonthLabel('2026-10')).toBe('2026 оны 10-р сар')
    expect(formatMonthLabel('2026-11')).toBe('2026 оны 11-р сар')
    expect(formatMonthLabel('2026-12')).toBe('2026 оны 12-р сар')
  })
})

describe('MonthNav component — structural render (AC #1, #7-9)', () => {
  // AC #1 — label 'YYYY оны M-р сар' 텍스트 등장
  it('renders Mongolian month label inside the picker button', () => {
    const html = renderToStaticMarkup(
      createElement(MonthNav, {
        currentMonth: '2026-05',
        onMonthChange: () => {},
      }),
    )
    expect(html).toContain('data-testid="month-nav"')
    expect(html).toContain('data-testid="month-nav-label"')
    expect(html).toContain('data-testid="month-nav-label-text"')
    // 5월 → '2026 оны 5-р сар'
    expect(html).toContain('2026 оны 5-р сар')
  })

  // AC #7 — a11y aria-label 몽골어 (default), nav role
  it('exposes nav role and Mongolian aria-labels on prev / next / picker (default)', () => {
    const html = renderToStaticMarkup(
      createElement(MonthNav, {
        currentMonth: '2026-05',
        onMonthChange: () => {},
      }),
    )
    // <nav role="navigation"> + aria-label="Сар сонгох"
    expect(html).toMatch(/<nav[^>]*role="navigation"[^>]*aria-label="Сар сонгох"/)
    // prev 버튼
    expect(html).toMatch(/<button[^>]*aria-label="Өмнөх сар"[^>]*data-testid="month-nav-prev"/)
    // next 버튼
    expect(html).toMatch(/<button[^>]*aria-label="Дараах сар"[^>]*data-testid="month-nav-next"/)
    // picker label button (aria-haspopup="dialog")
    expect(html).toMatch(
      /<button[^>]*aria-haspopup="dialog"[^>]*data-testid="month-nav-label"/,
    )
    // hidden native input — picker
    expect(html).toMatch(/<input[^>]*type="month"[^>]*data-testid="month-nav-picker"/)
    // input 의 value 도 currentMonth 반영
    expect(html).toMatch(/<input[^>]*data-testid="month-nav-picker"[^>]*value="2026-05"/)
  })

  // AC #7 (override) — custom aria-label props 가 적용됨
  it('respects custom prevLabel / nextLabel / pickerLabel props', () => {
    const html = renderToStaticMarkup(
      createElement(MonthNav, {
        currentMonth: '2026-05',
        onMonthChange: () => {},
        prevLabel: 'Previous month',
        nextLabel: 'Next month',
        pickerLabel: 'Choose month',
      }),
    )
    expect(html).toMatch(/<nav[^>]*aria-label="Choose month"/)
    expect(html).toMatch(/<button[^>]*aria-label="Previous month"[^>]*data-testid="month-nav-prev"/)
    expect(html).toMatch(/<button[^>]*aria-label="Next month"[^>]*data-testid="month-nav-next"/)
    // 디폴트 몽골어가 사용되지 않음
    expect(html).not.toContain('aria-label="Өмнөх сар"')
    expect(html).not.toContain('aria-label="Дараах сар"')
    expect(html).not.toContain('aria-label="Сар сонгох"')
  })

  // AC #8 — focus-visible CSS 적용 (키보드 Tab 접근성 시각적 가드)
  it('applies focus-visible outline classes to all interactive buttons', () => {
    const html = renderToStaticMarkup(
      createElement(MonthNav, {
        currentMonth: '2026-05',
        onMonthChange: () => {},
      }),
    )
    // prev / next / label 버튼 모두 focus-visible:outline-* 클래스 부착
    const buttonTags = html.match(/<button[^>]*>/g) ?? []
    expect(buttonTags.length).toBeGreaterThanOrEqual(3)
    for (const btn of buttonTags) {
      expect(btn).toMatch(/focus-visible:outline-2/)
      expect(btn).toMatch(/focus-visible:outline-offset-2/)
    }
  })

  // AC #9 — picker affordance: lucide 달력(calendar) 아이콘이 month 라벨 옆에
  // 표시 (이전 '▼' 유니코드 글리프 → <Icon name="calendar">, DESIGN.md).
  // + md:inline 으로 데스크탑에서만 prev/next 라벨 텍스트 노출.
  it('renders a lucide calendar icon next to month label (no ▼ glyph) + md:inline prev/next labels', () => {
    const html = renderToStaticMarkup(
      createElement(MonthNav, {
        currentMonth: '2026-05',
        onMonthChange: () => {},
      }),
    )
    // 라벨 버튼 안에 lucide 아이콘(<svg>) — 유니코드 ▼ 글리프는 더 이상 없음.
    expect(html).toMatch(/data-testid="month-nav-label"[\s\S]*?<svg/)
    expect(html).not.toContain('▼')
    // prev/next 버튼의 유니코드 글리프(◀▶)도 제거됨.
    expect(html).not.toContain('◀')
    expect(html).not.toContain('▶')
    // prev 버튼 안에 'Өмнөх сар' 텍스트 span (md:inline)
    expect(html).toMatch(/<span[^>]*class="[^"]*md:inline[^"]*"[^>]*>Өмнөх сар<\/span>/)
    // next 버튼 안에 'Дараах сар' 텍스트 span (md:inline)
    expect(html).toMatch(/<span[^>]*class="[^"]*md:inline[^"]*"[^>]*>Дараах сар<\/span>/)
  })

  // AC #1 — 다른 month 값들도 정상 렌더 (boundary)
  it('renders correctly across various months including year boundaries', () => {
    for (const ym of ['2026-01', '2026-12', '2025-09', '2099-11']) {
      const html = renderToStaticMarkup(
        createElement(MonthNav, {
          currentMonth: ym,
          onMonthChange: () => {},
        }),
      )
      expect(html).toContain(formatMonthLabel(ym))
      expect(html).toMatch(new RegExp(`<input[^>]*data-testid="month-nav-picker"[^>]*value="${ym}"`))
    }
  })

  // AC #6 — native input type="month" 가 정상 마크업으로 등장 (picker change
  // 이벤트는 jsdom 없이 시뮬레이션 불가 — onChange 시그니처는 컴포넌트
  // 소스에서 직접 검증).
  it('renders <input type="month"> with controlled value (picker source-of-truth)', () => {
    const html = renderToStaticMarkup(
      createElement(MonthNav, {
        currentMonth: '2026-07',
        onMonthChange: () => {},
      }),
    )
    expect(html).toMatch(
      /<input[^>]*type="month"[^>]*data-testid="month-nav-picker"[^>]*value="2026-07"/,
    )
    // 시각적으로 숨김 (opacity-0 + pointer-events-none + -z-10) — 부모 nav
    // 의 라벨 버튼이 위에 떠 있어서 사용자는 라벨 버튼을 탭한다.
    expect(html).toMatch(/<input[^>]*data-testid="month-nav-picker"[^>]*class="[^"]*opacity-0[^"]*"/)
    expect(html).toMatch(
      /<input[^>]*data-testid="month-nav-picker"[^>]*class="[^"]*pointer-events-none[^"]*"/,
    )
  })
})
