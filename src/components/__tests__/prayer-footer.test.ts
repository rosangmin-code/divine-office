/**
 * Unit tests for GOAL #66 sub-2 (#68, FR-164) — PrayerFooter 인터랙션 재설계.
 *
 * 새 계약:
 *   - 상시 ЦЭС strip 제거 (더 이상 상시 노출 요소 없음).
 *   - Огноо 메뉴 제거 — 패널엔 설정(Тохиргоо) 링크만.
 *   - 본문 아무 곳 '가벼운 탭' → 설정 패널 슬라이드업 (document click 리스너).
 *   - 유지: always-mounted panel(translate-y swap), backdrop outside-tap,
 *     Esc dismiss, 오픈 시 설정 링크로 focus, motion-reduce transition 제거.
 *
 * H2 (app-review 2026-09-13 §3.3) 갱신 계약:
 *   - 상시 노출 **명시적 트리거** `data-role="prayer-footer-handle"` 추가.
 *   - 패널 = `role="dialog" aria-modal="true" aria-labelledby` + 포커스 트랩.
 *   - 백드롭 = 포커스 불가 `<div>` — `aria-hidden` / `tabindex` 없음.
 *   - 본문 탭 판정은 `src/lib/prayer-footer-gesture.ts` 의 순수 함수
 *     (스크롤 직후·드래그·AT 합성 click 배제) — 판정 자체의 단위 테스트는
 *     `src/lib/__tests__/prayer-footer-gesture.test.ts`.
 *
 * Test strategy (기존 컨벤션 유지):
 *   - vitest 환경에 jsdom / happy-dom 미설치. e2e/ 가 라이브 DOM event
 *     (본문 탭 → 오픈, Esc/backdrop → close, focus) 책임, 본 unit suite 는
 *     SSR static-markup 가드 + 인터랙션 코드 path source-grep 회귀 가드.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { PrayerFooter } from '../prayer-footer'

function collapsedHtml(): string {
  return renderToStaticMarkup(createElement(PrayerFooter, {}))
}
function expandedHtml(): string {
  return renderToStaticMarkup(createElement(PrayerFooter, { expanded: true }))
}
function extractPanel(html: string): string {
  const m = html.match(/<div[^>]*data-role="prayer-footer-content"[^>]*>/)
  return m ? m[0] : ''
}
function extractBackdrop(html: string): string {
  const m = html.match(/<div[^>]*data-role="prayer-footer-backdrop"[^>]*>/)
  return m ? m[0] : ''
}
function extractHandle(html: string): string {
  const m = html.match(/<button[^>]*data-role="prayer-footer-handle"[^>]*>/)
  return m ? m[0] : ''
}
function extractOuterContainer(html: string): string {
  const m = html.match(/<div[^>]*data-role="prayer-footer"[^>]*>/)
  return m ? m[0] : ''
}

// @fr FR-164
describe('PrayerFooter — collapsed (default)', () => {
  it('outer container is fixed bottom z-40 with safe-area padding', () => {
    const html = collapsedHtml()
    const container = extractOuterContainer(html)
    expect(container).not.toBe('')
    expect(container).toContain('fixed')
    expect(container).toContain('bottom-0')
    expect(container).toContain('z-40')
    expect(container).toContain('pb-[env(safe-area-inset-bottom)]')
  })

  it('panel is always mounted but hidden via translate-y-full + aria-hidden', () => {
    const html = collapsedHtml()
    expect(html).toContain('data-role="prayer-footer-content"')
    const panel = extractPanel(html)
    expect(panel).toContain('translate-y-full')
    expect(panel).toContain('aria-hidden="true"')
    expect(panel).toContain('data-expanded="false"')
  })

  it('backdrop is present but non-interactive when collapsed', () => {
    const html = collapsedHtml()
    const backdrop = extractBackdrop(html)
    expect(backdrop).not.toBe('')
    expect(backdrop).toContain('opacity-0')
    expect(backdrop).toContain('pointer-events-none')
    expect(backdrop).toContain('data-expanded="false"')
  })

  // H2 — 백드롭은 포커스 가능한 <button aria-hidden> 이었다. 포커스 가능한
  // 요소에 aria-hidden 을 붙이는 것은 ARIA 위반이라 <div> 로 바꿨다.
  it('backdrop is a non-focusable <div> — no aria-hidden, no tabindex, no button', () => {
    for (const html of [collapsedHtml(), expandedHtml()]) {
      const backdrop = extractBackdrop(html)
      expect(backdrop).not.toBe('')
      expect(backdrop).not.toContain('aria-hidden')
      expect(backdrop).not.toContain('tabindex')
      expect(html).not.toMatch(/<button[^>]*data-role="prayer-footer-backdrop"/)
    }
  })

  // H2 — 본문 탭 말고도 항상 쓸 수 있는 명시적 트리거가 있어야 한다
  // (스크린리더·키보드 사용자에게 유일한 결정적 경로).
  it('always renders an explicit trigger chip (collapsed AND expanded)', () => {
    for (const html of [collapsedHtml(), expandedHtml()]) {
      const handle = extractHandle(html)
      expect(handle).not.toBe('')
      expect(handle).toContain('type="button"')
      expect(handle).toContain('aria-haspopup="dialog"')
      expect(handle).toContain('aria-controls=')
      expect(handle).toContain('min-h-[44px]')
    }
    expect(extractHandle(collapsedHtml())).toContain('aria-expanded="false"')
    expect(extractHandle(expandedHtml())).toContain('aria-expanded="true"')
    // NFR-002 — 트리거 라벨은 몽골어 키릴.
    expect(collapsedHtml()).toContain('Тохиргоо')
  })
})

// @fr FR-164
describe('PrayerFooter — expanded=true', () => {
  it('panel slides up (translate-y-0 + aria-hidden=false)', () => {
    const html = expandedHtml()
    const panel = extractPanel(html)
    expect(panel).toContain('translate-y-0')
    expect(panel).toContain('aria-hidden="false"')
    expect(panel).toContain('data-expanded="true"')
  })

  // H2 — 패널은 모달 dialog 계약을 선언해야 한다.
  it('panel declares role=dialog + aria-modal + aria-labelledby', () => {
    const html = expandedHtml()
    const panel = extractPanel(html)
    expect(panel).toContain('role="dialog"')
    expect(panel).toContain('aria-modal="true"')
    expect(panel).toMatch(/aria-labelledby="[^"]+"/)
    const labelledBy = panel.match(/aria-labelledby="([^"]+)"/)![1]
    // 라벨 대상이 실제로 존재하고 몽골어 제목을 담는다.
    expect(html).toContain(`id="${labelledBy}"`)
    const titleIdx = html.indexOf(`id="${labelledBy}"`)
    expect(html.slice(titleIdx, titleIdx + 200)).toContain('Тохиргоо')
  })

  it('backdrop becomes interactive (opacity-100 + pointer-events-auto)', () => {
    const html = expandedHtml()
    const backdrop = extractBackdrop(html)
    expect(backdrop).toContain('opacity-100')
    expect(backdrop).toContain('pointer-events-auto')
    expect(backdrop).toContain('data-expanded="true"')
  })

  it('renders exactly one menu item — Тохиргоо → /settings', () => {
    const html = expandedHtml()
    const settingsAnchor = html.match(
      /<a[^>]*data-role="prayer-footer-menu-settings"[^>]*>/,
    )
    expect(settingsAnchor).not.toBeNull()
    expect(settingsAnchor![0]).toContain('href="/settings"')
    expect(settingsAnchor![0]).toContain('aria-label="Тохиргоо"')
    // 패널 헤더 라벨 + nav aria-label 이 모두 Тохиргоо (구 'Цэс' 아님)
    expect(html).toMatch(/<nav[^>]*aria-label="Тохиргоо"/)
    expect(html).toContain('Тохиргоо')
  })

  it('menu card renders lucide settings <svg> (no ⚙ emoji, cream/gold palette)', () => {
    const html = expandedHtml()
    expect(html).not.toContain('⚙')
    expect(html).toMatch(/data-role="prayer-footer-menu-settings"[\s\S]*?<svg/)
    // off-palette sky/blue 잔존 0, 골드 토큰 사용
    expect(html).not.toContain('sky-')
    expect(html).not.toContain('blue-')
    expect(html).toContain('--color-liturgical-gold')
  })

  it('panel + backdrop carry motion-reduce classes (prefers-reduced-motion)', () => {
    const html = expandedHtml()
    const panel = extractPanel(html)
    expect(panel).toContain('transition-transform')
    expect(panel).toContain('motion-reduce:transition-none')
    expect(panel).toContain('motion-reduce:duration-0')
    const backdrop = extractBackdrop(html)
    expect(backdrop).toContain('transition-opacity')
    expect(backdrop).toContain('motion-reduce:transition-none')
  })
})

// @fr FR-164
describe('PrayerFooter — removed-surface regression guards', () => {
  it('no strip, no Огноо, no date/celebration surface remains', () => {
    const collapsed = collapsedHtml()
    const expanded = expandedHtml()
    // 상시 strip 제거 — 어느 상태에도 strip 요소/aria/chevron 없음.
    expect(collapsed).not.toContain('data-role="prayer-footer-strip"')
    expect(expanded).not.toContain('data-role="prayer-footer-strip"')
    expect(collapsed).not.toContain('lucide-chevron-up')
    expect(expanded).not.toContain('lucide-chevron-down')
    expect(collapsed).not.toContain('aria-label="Цэс харуулах"')
    expect(expanded).not.toContain('aria-label="Цэс нуух"')
    // Огноо 메뉴 제거.
    expect(expanded).not.toContain('data-role="prayer-footer-menu-date"')
    expect(expanded).not.toContain('Огноо')
    expect(expanded).not.toContain('lucide-calendar')
    // date/celebration prop 이 제거되어 어떤 date query 도 렌더되지 않음.
    expect(expanded).not.toContain('/?date=')
    expect(expanded).not.toContain('celebration=')
  })
})

// @fr FR-164
describe('PrayerFooter — interaction code path (source-grep)', () => {
  function sourceCode(): string {
    const srcPath = resolve(__dirname, '..', 'prayer-footer.tsx')
    const raw = readFileSync(srcPath, 'utf-8')
    // 코멘트 strip — 코드 본문에서만 토큰 존재 확인.
    return raw
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, ''))
      .join('\n')
  }

  it('attaches a document click listener with interactive-element + selection guards', () => {
    const code = sourceCode()
    // 본문 탭 트리거: document 에 'click' 리스너 부착 + cleanup.
    expect(code).toMatch(/document\.addEventListener\(\s*['"]click['"]/)
    expect(code).toMatch(/document\.removeEventListener\(\s*['"]click['"]/)
    // 인터랙티브 요소 무시 가드 (.closest + selector 토큰들).
    expect(code).toMatch(/\.closest\(/)
    expect(code).toMatch(/\[role="button"\]/)
    expect(code).toMatch(/contenteditable/)
    // 텍스트 선택 중 무시 가드.
    expect(code).toMatch(/getSelection\(\)/)
  })

  it('keeps Esc dismiss + focus management + inert/backdrop + hook usage', () => {
    const code = sourceCode()
    expect(code).toMatch(/\buseState\b/)
    expect(code).toMatch(/\buseEffect\b/)
    expect(code).toMatch(/\buseRef\b/)
    expect(code).toMatch(/['"]keydown['"]/)
    expect(code).toMatch(/['"]Escape['"]/)
    expect(code).toMatch(/\bremoveEventListener\b/)
    expect(code).toMatch(/\bfirstMenuRef\b/)
    expect(code).toMatch(/\bhandleClose\b/)
    expect(code).toMatch(/\binert\b/)
    expect(code).toMatch(/prayer-footer-backdrop/)
  })

  // H2 — 탭 판정을 순수 함수에 위임하고, pointer/scroll 관측을 붙였는지.
  it('delegates body-tap eligibility to the pure gesture guard', () => {
    const code = sourceCode()
    expect(code).toMatch(/shouldOpenOnBodyTap/)
    expect(code).toMatch(/document\.addEventListener\(\s*['"]pointerdown['"]/)
    expect(code).toMatch(/document\.addEventListener\(\s*['"]pointerup['"]/)
    expect(code).toMatch(/addEventListener\(\s*['"]scroll['"]/)
    // 이전 구현이 click 하나만 보고 열던 무조건 분기는 사라졌다.
    expect(code).not.toMatch(/if\s*\(window\.getSelection\(\)\?\.toString\(\)\)\s*return/)
  })

  // H2 — 닫을 때 원래 포커스로 복원하고, 배경을 inert 로 만든다.
  it('restores the pre-open focus and inerts the background while open', () => {
    const code = sourceCode()
    expect(code).toMatch(/previouslyFocused/)
    expect(code).toMatch(/previouslyFocused\.focus\(\)/)
    expect(code).toMatch(/setAttribute\(\s*['"]inert['"]/)
    expect(code).toMatch(/removeAttribute\(\s*['"]inert['"]/)
    // Tab 포커스 트랩.
    expect(code).toMatch(/onPanelKeyDown/)
    expect(code).toMatch(/['"]Tab['"]/)
  })
})
