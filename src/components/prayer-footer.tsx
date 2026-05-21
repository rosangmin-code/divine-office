'use client'

import Link from 'next/link'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Icon } from './icon'

// GOAL #24 WI-B (#30) — PrayerFooter interaction logic 내재화.
//
// 본 WI 에서 WI-A (#29) 의 controlled-only API 위에 추가:
//   - **Controlled/uncontrolled hybrid** — `expanded` prop 명시 시 부모
//     controlled, 미명시 시 내부 useState 로 self-controlled. 이전 controlled
//     사용처와 호환 (호출자가 prop 패싱하면 기존 동작 그대로).
//   - **Always-mounted panel** (#29 reviewer observation #1 해소) — 패널
//     DOM 은 항상 마운트되고 `translate-y` class swap 으로 visibility 결정.
//     slide-up animation (200ms transition-transform) 의 from-state → to-state
//     이 필요해 conditional render 로는 animation 불가. aria-controls 가
//     실재 DOM element 를 가리키게 되어 WAI-ARIA SHOULD 도 충족.
//   - **Slide-up animation** — `transition-transform duration-200 ease-out` +
//     `motion-reduce:transition-none motion-reduce:duration-0` 으로 `prefers-
//     reduced-motion: reduce` 사용자에게 transition 제거.
//   - **Backdrop element** — 패널 expanded 시 반투명 dim (bg-black/30) 으로
//     body content 시각적 dim + outside-tap 캡처. `<button type="button">`
//     인 backdrop 을 클릭하면 close. backdrop 도 collapsed 시 opacity-0 +
//     pointer-events-none 으로 무영향.
//   - **Esc key dismiss** — useEffect window keydown listener (expanded 일
//     때만 attach). Escape 누르면 collapse + strip 에 focus 복귀 (사용자가
//     키보드 흐름을 잃지 않도록).
//   - **Focus management** — 패널 expanded 시 첫 menu item (Огноо) 으로
//     auto-focus. collapse 시 strip 으로 복귀 (Esc handler 에서 명시 호출).
//     uncontrolled toggle 도 strip 클릭이 strip 에 focus 를 남기므로
//     자연스럼.
//   - **inert on collapsed panel** — collapsed 시 panel 의 모든 자식이
//     키보드 Tab 흐름과 click 으로 도달 불가하도록 `inert` 속성 부착. screen
//     reader 도 inert subtree 를 스킵.
//
// 본 WI scope 외 (후속 WI):
//   - page.tsx 통합 + 상단 SettingsLink 제거 + body container `pb-16` →
//     WI-C (#31).
//   - PRD/traceability + FR 부여 → WI-D (#32).
//   - Playwright e2e (실제 클릭/Esc/outside-tap/focus/reduced-motion 검증)
//     → WI-E (#33).

interface PrayerFooterProps {
  /** 현재 보고 있는 기도문의 날짜, 'YYYY-MM-DD' format. Огноо 링크가
   *  이 날짜로 / 페이지를 anchor. */
  date: string
  /** Огноо 링크에 함께 보존할 celebration 식별자. URL 인코딩 후
   *  `&celebration=...` 으로 부착. 부재 시 query 미포함. */
  celebration?: string
  /** 패널 visibility — controlled. undefined 일 때 컴포넌트 내부 useState
   *  로 self-controlled. WI-A 와 호환 (호출자 명시 prop = controlled
   *  override). */
  expanded?: boolean
  /** strip 탭 시 호출되는 콜백. controlled mode 에서는 부모가 본 콜백 안에서
   *  expanded state 를 toggle. uncontrolled mode 에서도 호출 (부모가 상태
   *  변화 알림을 받을 수 있도록 — telemetry / 분석 hook 등). */
  onToggle?: () => void
}

export function PrayerFooter({
  date,
  celebration,
  expanded: expandedProp,
  onToggle,
}: PrayerFooterProps) {
  // Controlled/uncontrolled hybrid.
  // - controlled: `expandedProp` 가 boolean (true/false) — 부모가 상태 관리.
  //   internal useState 는 미사용 (값 변경 시 부모 setState 호출 후 prop
  //   재전달).
  // - uncontrolled: `expandedProp === undefined` — 내부 useState 로 자가
  //   관리. default false.
  // React 의 input element 패턴과 동일 (`value` prop 유무 = controlled
  // 여부).
  const [internalExpanded, setInternalExpanded] = useState(false)
  const isControlled = expandedProp !== undefined
  const expanded = isControlled ? expandedProp : internalExpanded

  const contentId = useId()
  const stripRef = useRef<HTMLButtonElement | null>(null)
  const firstMenuRef = useRef<HTMLAnchorElement | null>(null)

  // 상태 변경 single source — controlled 시는 onToggle 만 호출하고 internal
  // state 는 건들지 않음, uncontrolled 시는 internal state 토글 + onToggle
  // 호출.
  const setExpanded = useCallback(
    (_next: boolean) => {
      if (!isControlled) setInternalExpanded(_next)
      onToggle?.()
    },
    [isControlled, onToggle],
  )

  const handleToggle = useCallback(() => {
    setExpanded(!expanded)
  }, [setExpanded, expanded])

  const handleClose = useCallback(() => {
    setExpanded(false)
    // 키보드/포커스 흐름 보존: 닫힘과 함께 strip 으로 focus 복귀.
    // WI-E (#33) e2e D4d 발견: backdrop click 후 focus 가 hidden
    // backdrop 버튼에 머물러 a11y 가 망가짐 (Esc 경로는 별도로 명시
    // focus 호출이 있어 정상이었음). handleClose 가 모든 dismiss
    // 경로 (backdrop click + Esc) 의 single source 이므로 여기에
    // 1-line shift — Esc handler 안의 별도 focus 호출은 제거되어
    // dismiss 경로 대칭성 확보.
    stripRef.current?.focus()
  }, [setExpanded])

  // Esc key dismiss — expanded 일 때만 listener 부착.
  useEffect(() => {
    if (!expanded) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [expanded, handleClose])

  // Focus management — expanded 가 false → true 로 전환되는 순간 첫 menu
  // item 으로 focus. useEffect deps=[expanded] 이라 expanded 변화 시에만
  // 트리거됨. 초기 mount 시 expanded=true 면 (드문 케이스, controlled 부모
  // 가 처음부터 열린 상태로 마운트) 한 번 focus — 일반 UX 와 정합.
  useEffect(() => {
    if (!expanded) return
    firstMenuRef.current?.focus()
  }, [expanded])

  const dateHref = celebration
    ? `/?date=${date}&celebration=${encodeURIComponent(celebration)}`
    : `/?date=${date}`

  return (
    <>
      {/*
        Backdrop — outside-tap dismiss + 시각적 dim. 전체 viewport 를 덮는
        반투명 검정 layer. expanded=true 시 opacity-100 + pointer-events-
        auto, collapsed 시 opacity-0 + pointer-events-none 으로 인터랙티브
        영역 사라짐. `<button type="button">` 인 이유: native button 이
        Enter 키 활성화 + 스크린리더에서 명확한 동작 안내 (실제로는 sr 가
        aria-hidden 으로 스킵하지만 fallback). `tabIndex=-1` 로 키보드 Tab
        흐름에서 제외 (Esc 키가 명시적 dismiss path 이므로 backdrop 은
        키보드 노출 불요).
      */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={handleClose}
        data-role="prayer-footer-backdrop"
        data-expanded={expanded ? 'true' : 'false'}
        className={`fixed inset-0 z-30 cursor-pointer bg-black/30 transition-opacity duration-200 ease-out motion-reduce:transition-none motion-reduce:duration-0 ${
          expanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      <div
        data-role="prayer-footer"
        className="fixed inset-x-0 bottom-0 z-40 flex flex-col pb-[env(safe-area-inset-bottom)]"
      >
        {/*
          Panel — ALWAYS mounted. translate-y class swap 으로 visibility 결정:
            - collapsed: `translate-y-full` (viewport 아래로 100% 이동, strip
              뒤로 숨음)
            - expanded: `translate-y-0` (정상 위치)
          slide-up animation 은 `transition-transform duration-200 ease-out`,
          prefers-reduced-motion 사용자에게는 `motion-reduce:transition-none
          motion-reduce:duration-0` 으로 transition 제거.
          `aria-hidden` 은 expanded state 미러 — collapsed 시 screen reader
          가 panel subtree 스킵. `inert` 속성으로 collapsed 시 키보드 Tab
          흐름 + click 이벤트도 모두 차단 (modern browser 의 보편 가드).
          aria-controls (strip 의 attribute) 가 본 element 의 id 를 가리키
          므로 WAI-ARIA SHOULD 충족 (#29 reviewer observation #1 해소).
        */}
        <div
          id={contentId}
          aria-hidden={!expanded}
          {...(!expanded && { inert: true })}
          data-role="prayer-footer-content"
          data-expanded={expanded ? 'true' : 'false'}
          className={`border-t border-stone-300 bg-white shadow-[0_-6px_16px_rgba(0,0,0,0.06)] transition-transform duration-200 ease-out motion-reduce:transition-none motion-reduce:duration-0 dark:border-stone-700 dark:bg-neutral-900 ${
            expanded ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-2 dark:border-stone-800">
            <span className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Цэс
            </span>
          </div>
          <nav aria-label="Цэс" className="flex gap-2 px-3 py-3">
            <Link
              ref={firstMenuRef}
              href={dateHref}
              data-role="prayer-footer-menu-date"
              aria-label="Огноо"
              className="flex flex-1 flex-col items-center rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-center text-stone-800 transition-colors hover:border-[var(--color-liturgical-gold)] hover:bg-[var(--color-liturgical-gold-container)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-liturgical-gold)] dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:border-[var(--color-liturgical-gold-dark)] dark:hover:bg-stone-700"
            >
              <span aria-hidden="true" className="leading-none">
                <Icon name="calendar" size={24} />
              </span>
              <span className="mt-1 text-sm font-medium">Огноо</span>
            </Link>
            <Link
              href="/settings"
              data-role="prayer-footer-menu-settings"
              aria-label="Тохиргоо"
              className="flex flex-1 flex-col items-center rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-center text-stone-800 transition-colors hover:border-[var(--color-liturgical-gold)] hover:bg-[var(--color-liturgical-gold-container)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-liturgical-gold)] dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:border-[var(--color-liturgical-gold-dark)] dark:hover:bg-stone-700"
            >
              <span aria-hidden="true" className="leading-none">
                <Icon name="settings" size={24} />
              </span>
              <span className="mt-1 text-sm font-medium">Тохиргоо</span>
            </Link>
          </nav>
        </div>

        {/* Strip — 항상 렌더 (sticky bottom). 탭하면 toggle. */}
        <button
          ref={stripRef}
          type="button"
          onClick={handleToggle}
          aria-expanded={expanded}
          aria-controls={contentId}
          aria-label={expanded ? 'Цэс нуух' : 'Цэс харуулах'}
          data-role="prayer-footer-strip"
          data-expanded={expanded ? 'true' : 'false'}
          className="flex h-[32px] w-full items-center justify-center border-t border-stone-400 bg-gradient-to-b from-stone-200 to-stone-300 text-stone-600 transition-colors hover:from-stone-300 hover:to-stone-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-liturgical-gold)] dark:border-stone-600 dark:from-stone-700 dark:to-stone-800 dark:text-stone-300 dark:hover:from-stone-600 dark:hover:to-stone-700"
        >
          <span aria-hidden="true" className="text-base leading-none">
            {expanded ? '⏷' : '⏶'}
          </span>
        </button>
      </div>
    </>
  )
}
