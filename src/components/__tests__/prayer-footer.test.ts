/**
 * Unit tests for GOAL #24 WI-A (#29) — PrayerFooter 컴포넌트.
 *
 * Test strategy (gospel-canticle-section / month-nav / liturgical-calendar-
 * list 컨벤션 차용):
 *   - vitest 환경에 jsdom / happy-dom 미설치 → 클릭 이벤트 시뮬레이션
 *     불가. 본 컴포넌트는 **controlled** (부모가 expanded state 관리)
 *     이므로 `expanded` prop 값에 따라 마크업이 달라지는 invariant 으로
 *     controlled-component 계약을 가드한다 (DOM 시뮬레이션 없이도 wire-
 *     up 입증 가능).
 *   - strip onClick 직접 시뮬레이션 대신 strip 의 native button 구조
 *     (type="button", data-role, aria-expanded prop-driven) 가 정확함을
 *     verify — `onClick={onToggle}` 자체는 5-char trivial wiring 으로
 *     bug surface 가 아니며, dispatch AC #9-5 (controlled component) 는
 *     prop 변경 시 마크업 변경으로 입증됨.
 *
 * Coverage (dispatch AC #9 + 추가 회귀 가드):
 *   - strip render (32px 고정 픽셀, chevron ⏶ when collapsed)
 *   - expanded=true → 패널 DOM + 메뉴 2개 + chevron ⏷
 *   - menu link href (celebration 부재 / 존재 두 케이스)
 *   - aria-label 몽골어 verbatim ('Цэс харуулах' / 'Цэс нуух')
 *   - controlled-component contract — expanded prop 변화가 데이터-
 *     expanded / aria-expanded / chevron / 패널 DOM 모두 일관 변경
 *   - data-role anchor (strip / content / menu-date / menu-settings)
 *   - safe-area-inset-bottom padding 부착
 */

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { PrayerFooter } from '../prayer-footer'

// @fr GOAL-24-WI-A
describe('PrayerFooter — collapsed (default)', () => {
  // Helper — strip <button> 태그를 한 번 추출해 내부 attribute 들의 순서
  // 의존성 없이 검사 (React/JSX prop 선언 순서에 따라 출력 순서가 변할 수
  // 있으므로 순서-비결정적 매칭).
  function extractStripButton(html: string): string {
    const m = html.match(/<button[^>]*data-role="prayer-footer-strip"[^>]*>/)
    return m ? m[0] : ''
  }

  it('renders strip with 32px height + chevron ⏶ + aria-expanded=false', () => {
    const html = renderToStaticMarkup(
      createElement(PrayerFooter, { date: '2026-05-20' }),
    )
    // outer container data-role
    expect(html).toContain('data-role="prayer-footer"')
    // strip native button — 존재 + type="button"
    const strip = extractStripButton(html)
    expect(strip).not.toBe('')
    expect(strip).toContain('type="button"')
    // 32px 고정 픽셀 (font scaling FR-166 영향 배제)
    expect(strip).toContain('h-[32px]')
    // chevron up (collapsed)
    expect(html).toMatch(/<span[^>]*aria-hidden="true"[^>]*>⏶<\/span>/)
    // aria-expanded reflects collapsed state
    expect(strip).toContain('aria-expanded="false"')
    // data-expanded 양면 surface (CSS hook + e2e selector)
    expect(strip).toContain('data-expanded="false"')
    // 패널 DOM 부재
    expect(html).not.toContain('data-role="prayer-footer-content"')
  })

  it('exposes Mongolian aria-label "Цэс харуулах" when collapsed (NFR-002)', () => {
    const html = renderToStaticMarkup(
      createElement(PrayerFooter, { date: '2026-05-20' }),
    )
    const strip = extractStripButton(html)
    expect(strip).toContain('aria-label="Цэс харуулах"')
    // 영어 fallback 0건
    expect(html).not.toContain('aria-label="Show menu"')
    expect(html).not.toContain('aria-label="Toggle"')
  })

  it('strip points aria-controls at the panel container id (collapsed id reservation)', () => {
    const html = renderToStaticMarkup(
      createElement(PrayerFooter, { date: '2026-05-20' }),
    )
    const strip = extractStripButton(html)
    // collapsed 에도 aria-controls 가 사전 약속된 id 를 가리킴
    const ariaMatch = strip.match(/aria-controls="([^"]+)"/)
    expect(ariaMatch).not.toBeNull()
    expect(ariaMatch![1]).toBeTruthy()
    expect(ariaMatch![1].length).toBeGreaterThan(0)
  })

  // Outer container 의 class attribute 만 추출해서 검사 (attribute 순서
  // 비결정).
  function extractOuterContainer(html: string): string {
    const m = html.match(/<div[^>]*data-role="prayer-footer"[^>]*>/)
    return m ? m[0] : ''
  }

  it('outer container carries safe-area-inset-bottom padding (iOS notch)', () => {
    const html = renderToStaticMarkup(
      createElement(PrayerFooter, { date: '2026-05-20' }),
    )
    const container = extractOuterContainer(html)
    expect(container).not.toBe('')
    expect(container).toContain('pb-[env(safe-area-inset-bottom)]')
  })

  it('outer container is fixed at bottom with z-40 (sticky strip)', () => {
    const html = renderToStaticMarkup(
      createElement(PrayerFooter, { date: '2026-05-20' }),
    )
    const container = extractOuterContainer(html)
    expect(container).toContain('fixed')
    expect(container).toContain('bottom-0')
    expect(container).toContain('z-40')
  })
})

describe('PrayerFooter — expanded=true', () => {
  function extractStripButton(html: string): string {
    const m = html.match(/<button[^>]*data-role="prayer-footer-strip"[^>]*>/)
    return m ? m[0] : ''
  }

  it('renders panel + menu 2 items + chevron ⏷ + aria-expanded=true', () => {
    const html = renderToStaticMarkup(
      createElement(PrayerFooter, {
        date: '2026-05-20',
        expanded: true,
      }),
    )
    // 패널 DOM 마운트
    expect(html).toContain('data-role="prayer-footer-content"')
    // 메뉴 항목 2개 (data-role anchor)
    expect(html).toContain('data-role="prayer-footer-menu-date"')
    expect(html).toContain('data-role="prayer-footer-menu-settings"')
    // chevron down (expanded)
    expect(html).toMatch(/<span[^>]*aria-hidden="true"[^>]*>⏷<\/span>/)
    // aria-expanded / data-expanded 양면 true (strip 안에서)
    const strip = extractStripButton(html)
    expect(strip).toContain('aria-expanded="true"')
    expect(strip).toContain('data-expanded="true"')
    // 패널 내부의 '<nav aria-label="Цэс">' 구조적 wrapping
    expect(html).toMatch(/<nav[^>]*aria-label="Цэс"/)
  })

  it('exposes Mongolian aria-label "Цэс нуух" when expanded (NFR-002, footer.tsx 동사 어형 정합)', () => {
    const html = renderToStaticMarkup(
      createElement(PrayerFooter, { date: '2026-05-20', expanded: true }),
    )
    const strip = extractStripButton(html)
    expect(strip).toContain('aria-label="Цэс нуух"')
    // 'нуху' 같은 grammatical 오타가 들어가지 않음을 가드 (FR-162 'нуух'
    // 동사 어형 정합 + CLAUDE.md 몽골어 교정 흔함 경고).
    expect(html).not.toContain('aria-label="Цэс нуху"')
  })

  it('menu link labels are Mongolian Cyrillic verbatim (Огноо / Тохиргоо)', () => {
    const html = renderToStaticMarkup(
      createElement(PrayerFooter, { date: '2026-05-20', expanded: true }),
    )
    expect(html).toContain('Огноо')
    expect(html).toContain('Тохиргоо')
    // 패널 제목
    expect(html).toContain('Цэс')
  })

  it('panel container id matches strip aria-controls (cross-attribute integrity)', () => {
    const html = renderToStaticMarkup(
      createElement(PrayerFooter, { date: '2026-05-20', expanded: true }),
    )
    const strip = extractStripButton(html)
    const controlsMatch = strip.match(/aria-controls="([^"]+)"/)
    // 패널 컨테이너 id — `<div id="..." data-role="prayer-footer-content"`
    // 또는 reverse 순서 모두 수용.
    const idMatchA = html.match(/id="([^"]+)"[^>]*data-role="prayer-footer-content"/)
    const idMatchB = html.match(/data-role="prayer-footer-content"[^>]*id="([^"]+)"/)
    const panelId = idMatchA ? idMatchA[1] : idMatchB ? idMatchB[1] : null
    expect(controlsMatch).not.toBeNull()
    expect(panelId).not.toBeNull()
    expect(controlsMatch![1]).toBe(panelId)
  })
})

describe('PrayerFooter — menu link hrefs', () => {
  // AC #4 — Огноо 링크는 /?date=${date}, celebration 있으면 &celebration= 부착
  // 주의: React 가 JSX prop 을 alphabetical 순으로 정렬해 HTML 출력하므로
  // `<a>` 태그 안의 attribute 순서는 data-role / aria-label / class / href
  // 형태. 정규식은 attribute 순서 비결정적 매칭 (data-role + href 둘 다
  // 같은 anchor 안에 등장하는지) 으로 가드.
  it('Огноо href is /?date=YYYY-MM-DD (no celebration param)', () => {
    const html = renderToStaticMarkup(
      createElement(PrayerFooter, {
        date: '2026-05-20',
        expanded: true,
      }),
    )
    // anchor 추출 후 attribute 두 가지 동시 보유 확인
    const anchorMatch = html.match(
      /<a[^>]*data-role="prayer-footer-menu-date"[^>]*>/,
    )
    expect(anchorMatch).not.toBeNull()
    expect(anchorMatch![0]).toContain('href="/?date=2026-05-20"')
    // celebration 부재 시 query 미포함
    expect(anchorMatch![0]).not.toContain('celebration=')
    // HTML 전체에서도 celebration 미등장 (회귀 가드)
    expect(html).not.toContain('celebration=')
  })

  it('Огноо href includes celebration query when prop is set', () => {
    const html = renderToStaticMarkup(
      createElement(PrayerFooter, {
        date: '2026-05-20',
        celebration: 'pentecost-vigil',
        expanded: true,
      }),
    )
    const anchorMatch = html.match(
      /<a[^>]*data-role="prayer-footer-menu-date"[^>]*>/,
    )
    expect(anchorMatch).not.toBeNull()
    // React SSR 가 attribute value 의 `&` 를 `&amp;` 로 HTML-escape 함
    // (브라우저가 다시 `&` 로 decode 해 URL 정상 사용). 단언은 escape
    // 후 형태로 매칭.
    expect(anchorMatch![0]).toContain(
      'href="/?date=2026-05-20&amp;celebration=pentecost-vigil"',
    )
  })

  it('celebration param is URL-encoded for special characters', () => {
    const html = renderToStaticMarkup(
      createElement(PrayerFooter, {
        date: '2026-05-20',
        celebration: 'a b/c',
        expanded: true,
      }),
    )
    // encodeURIComponent('a b/c') === 'a%20b%2Fc'. React SSR 가 `&` 를
    // `&amp;` 로 추가 HTML-escape.
    const anchorMatch = html.match(
      /<a[^>]*data-role="prayer-footer-menu-date"[^>]*>/,
    )
    expect(anchorMatch).not.toBeNull()
    expect(anchorMatch![0]).toContain(
      'href="/?date=2026-05-20&amp;celebration=a%20b%2Fc"',
    )
  })

  it('Тохиргоо href is /settings (fixed route)', () => {
    const html = renderToStaticMarkup(
      createElement(PrayerFooter, {
        date: '2026-05-20',
        expanded: true,
      }),
    )
    const anchorMatch = html.match(
      /<a[^>]*data-role="prayer-footer-menu-settings"[^>]*>/,
    )
    expect(anchorMatch).not.toBeNull()
    expect(anchorMatch![0]).toContain('href="/settings"')
  })
})

describe('PrayerFooter — controlled-component contract (AC #9-5)', () => {
  // jsdom 미설치 → 클릭 이벤트 시뮬레이션 불가. 본 component 는 controlled
  // (부모가 expanded state 보유) 이므로 prop 변경 시 마크업 자체가 변하는
  // 것을 확인해 controlled-component wire-up 을 입증한다.
  //
  // onClick={onToggle} 자체는 5-char 직접 prop 패싱 — bug surface 0.
  // 실제 통합 시 부모 useState 가 onToggle 호출에 반응해 expanded
  // 를 toggle 하면, 본 컴포넌트는 새 expanded prop 으로 다시 렌더 →
  // 아래 invariant 의 두 상태가 양방향으로 swap 됨.
  it('renders different chevron / aria-expanded / panel for expanded false vs true', () => {
    const collapsedHtml = renderToStaticMarkup(
      createElement(PrayerFooter, { date: '2026-05-20', expanded: false }),
    )
    const expandedHtml = renderToStaticMarkup(
      createElement(PrayerFooter, { date: '2026-05-20', expanded: true }),
    )

    // chevron 양방향 swap
    expect(collapsedHtml).toContain('>⏶<')
    expect(collapsedHtml).not.toContain('>⏷<')
    expect(expandedHtml).toContain('>⏷<')
    expect(expandedHtml).not.toContain('>⏶<')

    // aria-expanded 양방향 swap
    expect(collapsedHtml).toContain('aria-expanded="false"')
    expect(expandedHtml).toContain('aria-expanded="true"')

    // 패널 DOM 마운트 양방향
    expect(collapsedHtml).not.toContain('data-role="prayer-footer-content"')
    expect(expandedHtml).toContain('data-role="prayer-footer-content"')

    // aria-label 양방향 swap
    expect(collapsedHtml).toContain('aria-label="Цэс харуулах"')
    expect(expandedHtml).toContain('aria-label="Цэс нуух"')
  })

  it('strip is a native <button type="button"> wired with onToggle prop (clickable + Tab/Space/Enter)', () => {
    // Native button 은 type="button" 으로 form submit 회피 + Tab focus +
    // Space/Enter 활성화 자동 (브라우저 기본 동작). onToggle prop 은
    // React 의 onClick handler 로 그대로 패싱되어 사용자 클릭 / 키보드
    // 활성화 시 부모의 setState 가 트리거됨. jsdom 미설치라 실제 클릭
    // 시뮬레이션은 e2e (WI-E #33) 책임.
    const html = renderToStaticMarkup(
      createElement(PrayerFooter, {
        date: '2026-05-20',
        onToggle: () => {},
      }),
    )
    // type="button" 확인 (strip 안에서)
    const strip = html.match(/<button[^>]*data-role="prayer-footer-strip"[^>]*>/)
    expect(strip).not.toBeNull()
    expect(strip![0]).toContain('type="button"')
  })

  it('default expanded value is false (omit prop → collapsed)', () => {
    // prop 미지정 시 default = false 임을 가드 (TS 시그니처 + 런타임
    // default value 둘 다 확인 — collapsed 마크업으로 입증).
    const html = renderToStaticMarkup(
      createElement(PrayerFooter, { date: '2026-05-20' }),
    )
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('>⏶<')
    expect(html).not.toContain('data-role="prayer-footer-content"')
  })
})
