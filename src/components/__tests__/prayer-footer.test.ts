/**
 * Unit tests for GOAL #24 WI-A (#29) + WI-B (#30) — PrayerFooter 컴포넌트.
 *
 * Test strategy (gospel-canticle-section / month-nav / liturgical-calendar-
 * list 컨벤션 차용 + WI-B Option B — leader directive 정합):
 *   - vitest 환경에 jsdom / happy-dom 미설치. 프로젝트 testing posture 는
 *     "e2e/ 가 DOM event 책임, unit/ 는 SSR-only" 분리. WI-B 의 인터랙션
 *     로직 (toggle / Esc / outside-tap / focus / reduced-motion) 의 라이브
 *     동작은 WI-E (#33) Playwright e2e 가 mobile + desktop + reduced-
 *     motion viewport 로 검증한다.
 *   - 본 unit suite 는 **인터랙션 패턴 가드** — uncontrolled vs controlled
 *     mode static markup 차이, always-mounted panel 패턴 (panel DOM 항상
 *     존재 + translate-y class swap), motion-reduce CSS 클래스 부착, ARIA
 *     정확성, useState/useEffect/useRef 코드 source-grep 회귀 가드로
 *     인터랙션 코드 path 자체의 존재를 입증.
 *
 * Coverage (WI-A 16 + WI-B Option B 6):
 *   - WI-A: strip render (32px + ⏶/⏷) / Mongolian aria-label (Цэс
 *     харуулах / Цэс нуух) / menu link href (celebration 유무) / data-role
 *     anchor / safe-area-inset-bottom / focus-visible CSS / outer container
 *     fixed/bottom/z-40
 *   - WI-B: always-mounted panel 패턴 (collapsed 시도 panel DOM 존재 +
 *     translate-y-full / expanded 시 translate-y-0 swap) / motion-reduce
 *     클래스 / aria-hidden + inert (collapsed) / backdrop element (outside-
 *     tap 캡처) / useState+useEffect+useRef 코드 존재 (source-grep) /
 *     uncontrolled vs controlled mode 분기 (source-grep)
 *
 * 인터랙션 라이브 동작 (e2e WI-E #33 책임): 실제 strip 클릭 → expand,
 * Escape 키 → collapse + strip focus 복귀, backdrop 클릭 → collapse,
 * panel expand 시 first menu item focus, prefers-reduced-motion 활성 시
 * transition duration 0.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { PrayerFooter } from '../prayer-footer'

// @fr GOAL-24-WI-A
// @fr GOAL-24-WI-B
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
    // WI-B: panel ALWAYS mounted (slide animation 위해). collapsed 시도
    // panel DOM 존재 + translate-y-full + aria-hidden=true + inert.
    expect(html).toContain('data-role="prayer-footer-content"')
    const panelTag = html.match(/<div[^>]*data-role="prayer-footer-content"[^>]*>/)
    expect(panelTag).not.toBeNull()
    expect(panelTag![0]).toContain('translate-y-full')
    expect(panelTag![0]).toContain('aria-hidden="true"')
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

    // WI-B: panel always mounted (animation 필요). collapsed 도 expanded
    // 도 panel DOM 존재. visibility 는 translate-y class swap 으로 결정.
    expect(collapsedHtml).toContain('data-role="prayer-footer-content"')
    expect(expandedHtml).toContain('data-role="prayer-footer-content"')
    expect(collapsedHtml).toContain('translate-y-full')
    expect(expandedHtml).toContain('translate-y-0')
    // aria-hidden 양방향 swap (attribute 순서 비결정 — panel tag 추출 후
    // attribute 동시 보유 확인).
    const collapsedPanel = collapsedHtml.match(/<div[^>]*data-role="prayer-footer-content"[^>]*>/)
    const expandedPanel = expandedHtml.match(/<div[^>]*data-role="prayer-footer-content"[^>]*>/)
    expect(collapsedPanel).not.toBeNull()
    expect(expandedPanel).not.toBeNull()
    expect(collapsedPanel![0]).toContain('aria-hidden="true"')
    expect(expandedPanel![0]).toContain('aria-hidden="false"')

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

  it('default expanded value is false (omit prop → collapsed, uncontrolled mode)', () => {
    // prop 미지정 시 uncontrolled mode → 내부 useState 초기값 false →
    // collapsed 마크업.
    const html = renderToStaticMarkup(
      createElement(PrayerFooter, { date: '2026-05-20' }),
    )
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('>⏶<')
    // WI-B: panel mounted (always-mounted 패턴) 이지만 translate-y-full
    // 으로 viewport 아래로 hidden.
    expect(html).toContain('data-role="prayer-footer-content"')
    expect(html).toContain('translate-y-full')
  })
})

// WI-B (#30) — Option B 인터랙션 패턴 가드 6 cases.
// dispatch 의 5+ AC 요구 충족 (toggle 직접 시뮬은 e2e WI-E #33 책임).
describe('PrayerFooter — WI-B interaction patterns (Option B)', () => {
  // AC #1 — uncontrolled vs controlled mode 분기
  it('uncontrolled mode (no expanded prop) renders default collapsed markup', () => {
    const html = renderToStaticMarkup(
      createElement(PrayerFooter, { date: '2026-05-20' }),
    )
    // uncontrolled: 내부 useState 초기값 false
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('translate-y-full')
    expect(html).toContain('>⏶<')
  })

  it('controlled mode (explicit expanded=true) respects parent state', () => {
    const html = renderToStaticMarkup(
      createElement(PrayerFooter, { date: '2026-05-20', expanded: true }),
    )
    expect(html).toContain('aria-expanded="true"')
    expect(html).toContain('translate-y-0')
    expect(html).toContain('>⏷<')
  })

  // AC #2 — always-mounted panel + translate-y class swap
  it('always-mounted panel: panel DOM present in both states, class swap controls visibility', () => {
    const collapsedHtml = renderToStaticMarkup(
      createElement(PrayerFooter, { date: '2026-05-20', expanded: false }),
    )
    const expandedHtml = renderToStaticMarkup(
      createElement(PrayerFooter, { date: '2026-05-20', expanded: true }),
    )
    // 양쪽 다 panel DOM 마운트
    expect(collapsedHtml).toContain('data-role="prayer-footer-content"')
    expect(expandedHtml).toContain('data-role="prayer-footer-content"')
    // panel tag 추출 후 attribute 순서 비결정 매칭
    const collapsedPanel = collapsedHtml.match(/<div[^>]*data-role="prayer-footer-content"[^>]*>/)
    const expandedPanel = expandedHtml.match(/<div[^>]*data-role="prayer-footer-content"[^>]*>/)
    expect(collapsedPanel).not.toBeNull()
    expect(expandedPanel).not.toBeNull()
    // collapsed: translate-y-full + aria-hidden=true (no translate-y-0)
    expect(collapsedPanel![0]).toContain('translate-y-full')
    expect(collapsedPanel![0]).toContain('aria-hidden="true"')
    expect(collapsedPanel![0]).not.toMatch(/\btranslate-y-0\b/)
    // expanded: translate-y-0 + aria-hidden=false (no translate-y-full)
    expect(expandedPanel![0]).toContain('translate-y-0')
    expect(expandedPanel![0]).toContain('aria-hidden="false"')
    expect(expandedPanel![0]).not.toMatch(/\btranslate-y-full\b/)
  })

  // AC #3 — prefers-reduced-motion CSS 클래스
  it('panel + backdrop carry motion-reduce: classes (prefers-reduced-motion respect)', () => {
    const html = renderToStaticMarkup(
      createElement(PrayerFooter, { date: '2026-05-20', expanded: true }),
    )
    // panel transition + motion-reduce override
    const panelMatch = html.match(/<div[^>]*data-role="prayer-footer-content"[^>]*>/)
    expect(panelMatch).not.toBeNull()
    expect(panelMatch![0]).toContain('transition-transform')
    expect(panelMatch![0]).toContain('motion-reduce:transition-none')
    expect(panelMatch![0]).toContain('motion-reduce:duration-0')
    // backdrop도 동일 처리 (opacity-100 → opacity-0 transition)
    const backdropMatch = html.match(/<button[^>]*data-role="prayer-footer-backdrop"[^>]*>/)
    expect(backdropMatch).not.toBeNull()
    expect(backdropMatch![0]).toContain('transition-opacity')
    expect(backdropMatch![0]).toContain('motion-reduce:transition-none')
  })

  // AC #4 — backdrop element + outside-tap path
  it('backdrop element exists for outside-tap dismiss (opacity-driven visibility)', () => {
    const collapsedHtml = renderToStaticMarkup(
      createElement(PrayerFooter, { date: '2026-05-20' }),
    )
    const expandedHtml = renderToStaticMarkup(
      createElement(PrayerFooter, { date: '2026-05-20', expanded: true }),
    )
    // backdrop은 양쪽 다 마운트, opacity + pointer-events 로 분기
    expect(collapsedHtml).toMatch(/<button[^>]*data-role="prayer-footer-backdrop"/)
    expect(expandedHtml).toMatch(/<button[^>]*data-role="prayer-footer-backdrop"/)
    // collapsed: opacity-0 + pointer-events-none (인터랙티브 아님)
    const collapsedBackdrop = collapsedHtml.match(/<button[^>]*data-role="prayer-footer-backdrop"[^>]*>/)
    expect(collapsedBackdrop![0]).toContain('opacity-0')
    expect(collapsedBackdrop![0]).toContain('pointer-events-none')
    // expanded: opacity-100 + pointer-events-auto (클릭 캡처)
    const expandedBackdrop = expandedHtml.match(/<button[^>]*data-role="prayer-footer-backdrop"[^>]*>/)
    expect(expandedBackdrop![0]).toContain('opacity-100')
    expect(expandedBackdrop![0]).toContain('pointer-events-auto')
    // backdrop 은 키보드 Tab 흐름에서 제외 (tabIndex=-1)
    expect(collapsedBackdrop![0]).toContain('tabindex="-1"')
    expect(expandedBackdrop![0]).toContain('tabindex="-1"')
  })

  // AC #5 — interaction 로직 코드 존재 (source-grep 회귀 가드)
  // 실제 동작은 e2e WI-E #33 책임이나, 코드 path 자체가 사라지지 않도록
  // 소스 본문에서 useState / useEffect / useRef + 인터랙션 키워드를
  // grep 으로 가드.
  it('source code contains interaction logic (useState + useEffect + useRef + Escape handler)', () => {
    // Note: 이 test 는 컴포넌트 소스를 읽어 인터랙션 path 가 코드에 존재
    // 하는지 확인. WI-A 의 controlled-only API 시점에 부재 → WI-B 에서
    // 추가된 코드가 제거되면 회귀 detect.
    const srcPath = resolve(__dirname, '..', 'prayer-footer.tsx')
    const raw = readFileSync(srcPath, 'utf-8')
    // 코멘트 strip — 회귀 가드는 코드 본문에서만 토큰 존재 확인.
    const code = raw
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, ''))
      .join('\n')

    // controlled/uncontrolled hybrid: useState + isControlled 분기
    expect(code).toMatch(/\buseState\b/)
    expect(code).toMatch(/\bisControlled\b/)
    // Esc handler: useEffect + keydown 리스너 + 'Escape' 키
    expect(code).toMatch(/\buseEffect\b/)
    expect(code).toMatch(/['"]keydown['"]/)
    expect(code).toMatch(/['"]Escape['"]/)
    // focus 관리: useRef + .focus() 호출
    expect(code).toMatch(/\buseRef\b/)
    expect(code).toMatch(/\.focus\(\)/)
    // window listener cleanup (memory leak 가드)
    expect(code).toMatch(/\bremoveEventListener\b/)
  })

  // AC #6 — focus / backdrop / inert source grep (interaction code path 가드)
  it('source code carries focus management + backdrop + inert markers', () => {
    const srcPath = resolve(__dirname, '..', 'prayer-footer.tsx')
    const raw = readFileSync(srcPath, 'utf-8')
    const code = raw
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, ''))
      .join('\n')

    // strip ref + firstMenu ref — focus 복귀 / auto-focus 둘 다 가능
    expect(code).toMatch(/\bstripRef\b/)
    expect(code).toMatch(/\bfirstMenuRef\b/)
    // backdrop element + handleClose (outside-tap path)
    expect(code).toMatch(/prayer-footer-backdrop/)
    expect(code).toMatch(/\bhandleClose\b/)
    // inert (collapsed 시 panel 키보드 Tab 차단)
    expect(code).toMatch(/\binert\b/)
  })
})
