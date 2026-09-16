'use client'

import Link from 'next/link'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Icon } from './icon'
import { shouldOpenOnBodyTap } from '@/lib/prayer-footer-gesture'

// GOAL #66 sub-2 (#68, FR-164) — PrayerFooter 인터랙션.
// H2 (app-review 2026-09-13 §3.3) — 접근성 재설계.
//
// 이력:
//   GOAL #24: 상시 32px ЦЭС strip + Огноо/Тохиргоо 2-메뉴. strip 탭 토글.
//   GOAL #66: 상시 strip 제거 + Огноо 제거(설정만) + 본문 아무 곳 탭 시
//             설정(Тохиргоо) 패널이 하단에서 슬라이드업.
//
// H2 가 지적한 것:
//   - document click 리스너가 비인터랙티브 요소의 **모든** click 을 "패널
//     열기" 로 해석 → 스크린리더 더블탭(합성 click)·관성 스크롤 정지 탭마다
//     패널이 뜨고 포커스를 뺏겼다.
//   - 패널에 `role="dialog"`/`aria-modal` 없음, 배경이 inert 아님.
//   - 백드롭이 `<button aria-hidden="true">` — 포커스 가능한 요소에
//     aria-hidden 을 붙인 ARIA 위반.
//
// 이번 설계 (FR-164 의도 = "기도 중 화면을 가리지 않는 큰 진입점" 보존):
//   (a) 상시 노출되는 **명시적 트리거** (`prayer-footer-handle`) — 하단
//       중앙의 44px 칩. 키보드·스크린리더 사용자의 유일한 결정적 경로이고,
//       GOAL #24 의 32px strip 과 달리 본문 flow 를 차지하지 않는다.
//   (b) 본문 탭 제스처는 **유지하되 좁힌다** — 실제 포인터로, 10px 이내,
//       500ms 이내, 최근 600ms 안에 스크롤이 없었을 때만 (판정 로직은
//       `src/lib/prayer-footer-gesture.ts` 의 순수 함수).
//   (c) 열리면 `role="dialog" aria-modal="true"` + 포커스 트랩 + Esc 닫기
//       + 배경 inert + 닫을 때 **원래 포커스 복원**.
//   (d) 백드롭은 포커스 불가 `<div>` (aria-hidden 없음), 클릭 닫기만.

interface PrayerFooterProps {
  /** 패널 visibility — controlled. undefined 시 내부 useState self-controlled
   *  (프로덕션 경로). 단위 테스트가 expanded 패널을 static 렌더할 때 사용. */
  expanded?: boolean
}

// 본문 탭 시 무시할 요소들 — 인터랙티브 컨트롤 + 풋터 자신.
// H3 에서 커스텀 listbox 의 옵션이 `<li role="option">` 으로 바뀌었으므로
// (중첩 `<button>` 제거) option/listbox/combobox/radio/switch/dialog 역할도
// 인터랙티브로 본다 — 그러지 않으면 드롭다운 옵션을 고르는 탭이 설정
// 패널까지 같이 여는 회귀가 난다.
const IGNORE_SELECTOR =
  'a, button, input, select, textarea, label, summary, [role="button"], [role="option"], [role="listbox"], [role="combobox"], [role="radio"], [role="switch"], [role="dialog"], [contenteditable], [data-role*="dropdown"], [data-role="prayer-footer-root"]'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusableWithin(root: HTMLElement | null): HTMLElement[] {
  if (!root) return []
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('inert') && el.getAttribute('aria-hidden') !== 'true',
  )
}

export function PrayerFooter({ expanded: expandedProp }: PrayerFooterProps) {
  const [internalExpanded, setInternalExpanded] = useState(false)
  const isControlled = expandedProp !== undefined
  const expanded = isControlled ? expandedProp : internalExpanded

  const panelId = useId()
  const titleId = `${panelId}-title`

  const rootRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const handleRef = useRef<HTMLButtonElement | null>(null)
  const firstMenuRef = useRef<HTMLAnchorElement | null>(null)

  const setExpanded = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalExpanded(next)
    },
    [isControlled],
  )

  const handleClose = useCallback(() => {
    setExpanded(false)
  }, [setExpanded])

  // ---------------------------------------------------------------------
  // (b) 본문 탭 → 오픈. collapsed 일 때만 리스너 부착.
  //     click 하나만 보지 않고 pointerdown/pointerup/scroll 을 함께 관측해
  //     "진짜 탭" 인지 판정한다 (shouldOpenOnBodyTap).
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (expanded) return

    const gesture = {
      downAt: null as number | null,
      upAt: null as number | null,
      downX: 0,
      downY: 0,
      movePx: 0,
      durationMs: 0,
      lastScrollAt: null as number | null,
      scrollAtPointerDown: null as number | null,
    }

    const onScroll = () => {
      gesture.lastScrollAt = Date.now()
    }
    const onPointerDown = (e: PointerEvent) => {
      gesture.downAt = Date.now()
      gesture.downX = e.clientX
      gesture.downY = e.clientY
      gesture.movePx = 0
      gesture.durationMs = 0
      gesture.scrollAtPointerDown = gesture.lastScrollAt
    }
    const onPointerUp = (e: PointerEvent) => {
      const now = Date.now()
      gesture.upAt = now
      gesture.movePx = Math.hypot(e.clientX - gesture.downX, e.clientY - gesture.downY)
      gesture.durationMs = gesture.downAt === null ? Number.POSITIVE_INFINITY : now - gesture.downAt
    }
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Element | null
      if (!target) return
      const open = shouldOpenOnBodyTap({
        detail: e.detail,
        onInteractiveTarget: !!target.closest(IGNORE_SELECTOR),
        hasTextSelection: !!window.getSelection()?.toString(),
        lastPointerDownAt: gesture.downAt,
        lastPointerUpAt: gesture.upAt,
        lastPointerMovePx: gesture.movePx,
        lastPointerDurationMs: gesture.durationMs,
        scrollAtPointerDown: gesture.scrollAtPointerDown,
        now: Date.now(),
      })
      if (open) setExpanded(true)
    }

    window.addEventListener('scroll', onScroll, { passive: true, capture: true })
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('pointerup', onPointerUp, true)
    document.addEventListener('click', onDocClick)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('pointerup', onPointerUp, true)
      document.removeEventListener('click', onDocClick)
    }
  }, [expanded, setExpanded])

  // ---------------------------------------------------------------------
  // (c) 모달 수명주기 — 배경 inert + 첫 인터랙티브 요소로 focus +
  //     닫힐 때 원래 포커스 복원. 한 effect 로 묶어 cleanup 순서를 고정한다
  //     (inert 해제 → focus 복원).
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!expanded) return
    const previouslyFocused = document.activeElement as HTMLElement | null

    // 배경 inert: root 의 조상 사슬을 따라 올라가며 형제들을 inert 로.
    // root 자신(백드롭·핸들·패널)은 건드리지 않는다.
    const inerted: HTMLElement[] = []
    let node: HTMLElement | null = rootRef.current
    while (node && node !== document.body) {
      const parent: HTMLElement | null = node.parentElement
      if (!parent) break
      for (const sibling of Array.from(parent.children)) {
        if (sibling === node) continue
        if (!(sibling instanceof HTMLElement)) continue
        if (sibling.hasAttribute('inert')) continue
        sibling.setAttribute('inert', '')
        inerted.push(sibling)
      }
      node = parent
    }

    // 패널 안 첫 인터랙티브 요소(설정 링크)로 focus.
    firstMenuRef.current?.focus()

    return () => {
      for (const el of inerted) el.removeAttribute('inert')
      if (
        previouslyFocused &&
        previouslyFocused.isConnected &&
        previouslyFocused !== document.body &&
        typeof previouslyFocused.focus === 'function'
      ) {
        previouslyFocused.focus()
      } else {
        // 본문 탭으로 열었으면 직전 포커스가 body 다 — 패널 링크에 남은
        // focus 만 떼어 inert 요소에 갇히지 않게 한다.
        ;(document.activeElement as HTMLElement | null)?.blur()
      }
    }
  }, [expanded])

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

  // 포커스 트랩 — Tab 이 패널 밖으로 새지 않게 순환시킨다.
  const onPanelKeyDown = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return
    const focusables = focusableWithin(panelRef.current)
    if (focusables.length === 0) {
      e.preventDefault()
      return
    }
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const active = document.activeElement
    const inside = panelRef.current?.contains(active) ?? false
    if (e.shiftKey) {
      if (!inside || active === first) {
        e.preventDefault()
        last.focus()
      }
    } else if (!inside || active === last) {
      e.preventDefault()
      first.focus()
    }
  }, [])

  return (
    // display:contents — 레이아웃에 영향 없이 DOM 트리에는 남아, 배경
    // inert 계산의 기준점이 된다.
    <div ref={rootRef} data-role="prayer-footer-root" className="contents">
      {/* (d) Backdrop — 포커스 불가 <div>. aria-hidden 없음(포커스 가능
          요소가 아니므로 필요 없고, 붙이면 ARIA 위반이었다). collapsed 시
          opacity-0 + pointer-events-none 로 무영향. */}
      <div
        onClick={handleClose}
        data-role="prayer-footer-backdrop"
        data-expanded={expanded ? 'true' : 'false'}
        className={`fixed inset-0 z-30 cursor-pointer bg-black/30 transition-opacity duration-200 ease-out motion-reduce:transition-none motion-reduce:duration-0 ${
          expanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* (a) 상시 노출 트리거 — 하단 우측 칩. 본문 flow 를 차지하지 않는
          fixed overlay 다. 중앙이 아니라 우측인 이유: 스크롤 중 칩이 본문
          위에 뜨는데, 중앙이면 읽던 줄의 가운데를 가려 판독이 끊긴다
          (실측 스크린샷). 우측이면 줄 끝만 겹치고 한 손 엄지 도달도 낫다.
          패널이 열리면 inert + 투명으로 물러난다. */}
      <div
        data-role="prayer-footer-handle-bar"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-end pr-3 pb-[calc(env(safe-area-inset-bottom)_+_0.5rem)]"
        {...(expanded && { inert: true })}
      >
        <button
          ref={handleRef}
          type="button"
          data-role="prayer-footer-handle"
          aria-haspopup="dialog"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded(!expanded)}
          className={`pointer-events-auto inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-stone-300 bg-white/90 px-4 text-xs text-stone-600 shadow-sm backdrop-blur transition-opacity duration-200 ease-out hover:border-[var(--color-liturgical-gold)] hover:text-stone-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-liturgical-gold)] motion-reduce:transition-none motion-reduce:duration-0 dark:border-stone-700 dark:bg-neutral-900/90 dark:text-stone-300 dark:hover:text-stone-100 ${
            expanded ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <span aria-hidden="true" className="leading-none">
            <Icon name="settings" size={16} />
          </span>
          Тохиргоо
        </button>
      </div>

      <div
        data-role="prayer-footer"
        className="fixed inset-x-0 bottom-0 z-40 flex flex-col pb-[env(safe-area-inset-bottom)]"
      >
        {/* Panel — ALWAYS mounted. translate-y class swap 으로 visibility 결정
            (collapsed: translate-y-full / expanded: translate-y-0). collapsed
            시 aria-hidden + inert 로 SR·키보드·click 모두 차단. expanded 시엔
            role="dialog" aria-modal 로 모달 계약을 선언하고 배경을 inert 로
            만든다. */}
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          id={panelId}
          onKeyDown={onPanelKeyDown}
          aria-hidden={!expanded}
          {...(!expanded && { inert: true })}
          data-role="prayer-footer-content"
          data-expanded={expanded ? 'true' : 'false'}
          className={`border-t border-stone-300 bg-white shadow-[0_-6px_16px_rgba(0,0,0,0.06)] transition-transform duration-200 ease-out motion-reduce:transition-none motion-reduce:duration-0 dark:border-stone-700 dark:bg-neutral-900 ${
            expanded ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-2 dark:border-stone-800">
            <span
              id={titleId}
              className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400"
            >
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
    </div>
  )
}
