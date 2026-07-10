'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from './icon'

// GOAL #66 sub-2 (#68, FR-164) — PrayerFooter 인터랙션 재설계.
//
// 이전(GOAL #24): 상시 32px ЦЭС strip + Огноо/Тохиргоо 2-메뉴. strip 탭 토글.
// 현재: 상시 strip 제거 + Огноо 제거(설정만) + 본문 아무 곳 '가벼운 탭' 시
//       설정(Тохиргоо) 패널이 하단에서 슬라이드업.
//
// 유지:
//   - Always-mounted panel (translate-y class swap, 200ms slide-up,
//     motion-reduce transition 제거).
//   - Backdrop(bg-black/30) outside-tap dismiss + Esc dismiss.
//   - 오픈 시 첫 메뉴(설정 링크)로 focus.
//   - controlled/uncontrolled hybrid — `expanded` prop 명시 시 controlled
//     (단위 테스트 static 렌더용), 미명시 시 내부 useState self-controlled.
//
// 트리거 재설계: strip 이 사라졌으므로 collapsed 일 때 document click 리스너
// 를 부착해 본문 탭을 감지한다. 아래는 오픈하지 않는다:
//   - 인터랙티브 요소(a/button/input/select/textarea/label/summary/
//     [role=button]/[contenteditable]/[data-role*=dropdown]) 및 패널 자신.
//   - 텍스트 선택 중(window.getSelection() 비어있지 않음).
//   - 이미 expanded(백드롭이 close 담당) — 이때는 리스너 미부착.
//   스크롤은 click 을 유발하지 않아 자동 제외.

interface PrayerFooterProps {
  /** 패널 visibility — controlled. undefined 시 내부 useState self-controlled
   *  (프로덕션 경로). 단위 테스트가 expanded 패널을 static 렌더할 때 사용. */
  expanded?: boolean
}

// 본문 탭 시 무시할 요소들 — 인터랙티브 컨트롤 + 패널 컨테이너 자신.
const IGNORE_SELECTOR =
  'a, button, input, select, textarea, label, summary, [role="button"], [contenteditable], [data-role*="dropdown"], [data-role="prayer-footer"]'

export function PrayerFooter({ expanded: expandedProp }: PrayerFooterProps) {
  const [internalExpanded, setInternalExpanded] = useState(false)
  const isControlled = expandedProp !== undefined
  const expanded = isControlled ? expandedProp : internalExpanded

  const firstMenuRef = useRef<HTMLAnchorElement | null>(null)

  const setExpanded = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalExpanded(next)
    },
    [isControlled],
  )

  const handleClose = useCallback(() => {
    setExpanded(false)
    // 닫힘 시 패널 subtree 가 inert 로 전환되므로, 열려 있던 링크에 남은
    // focus 를 body 로 내려 inert 요소에 focus 가 갇히지 않게 한다.
    ;(document.activeElement as HTMLElement | null)?.blur()
  }, [setExpanded])

  // 본문 탭 → 오픈. collapsed 일 때만 document click 리스너 부착.
  useEffect(() => {
    if (expanded) return
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Element | null
      if (!target) return
      // 인터랙티브 요소 / 패널 자신 클릭은 무시.
      if (target.closest(IGNORE_SELECTOR)) return
      // ponytail: 텍스트 선택 중이면 무시 — 사용자가 본문을 드래그 선택 중.
      if (window.getSelection()?.toString()) return
      setExpanded(true)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [expanded, setExpanded])

  // Esc dismiss — expanded 일 때만 부착.
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

  // 오픈 시 첫 메뉴(설정 링크)로 focus.
  useEffect(() => {
    if (!expanded) return
    firstMenuRef.current?.focus()
  }, [expanded])

  return (
    <>
      {/* Backdrop — outside-tap dismiss + 시각적 dim. collapsed 시 opacity-0
          + pointer-events-none 로 무영향. */}
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
        {/* Panel — ALWAYS mounted. translate-y class swap 으로 visibility 결정
            (collapsed: translate-y-full / expanded: translate-y-0). collapsed
            시 aria-hidden + inert 로 SR·키보드·click 모두 차단. */}
        <div
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
              Тохиргоо
            </span>
          </div>
          <nav aria-label="Тохиргоо" className="flex gap-2 px-3 py-3">
            <Link
              ref={firstMenuRef}
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
      </div>
    </>
  )
}
