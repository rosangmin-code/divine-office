'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CalendarListRow } from '@/lib/calendar-list-types'
import { JUMP_TO_TODAY_EVENT, revealRow } from '@/lib/jump-to-today'
import { LiturgicalCalendarRow } from './liturgical-calendar-row'

// FR-145 + GOAL #4 (WI #17 / wi-005) — Month-mode calendar list.
//
// 이 컴포넌트는 페이지가 이미 결정한 한 달치 (또는 한 윈도우 분량의) rows
// 를 그대로 받아 렌더한다. 이전 iter (FR-145 #8) 의 **infinite scroll**
// 메커니즘 — IntersectionObserver, loadOlder/loadNewer, hasScrolled
// 게이트, exhausted*/loading* state, top/bottom sentinel — 은 GOAL #4
// '한 달씩 끊어 보기' 결정으로 제거됐다. page.tsx (wi-002) 가 ?month=
// 쿼리에서 결정한 month-bounded rows 가 본 컴포넌트로 직접 전달된다.
//
// 보존 동작:
//   - focusRowRef + scrollIntoView({block:'center'}) on mount —
//     initialDate ?? todayStr 로 결정된 'focus row' 를 표시 영역 중앙으로
//     스크롤. 단 focusDate 가 현재 rows 에 없으면 ref 가 어떤 row 에도
//     attach 되지 않으므로 useEffect 의 scrollIntoView 도 no-op.
//   - row expand/collapse (`expandedDate`) — 한 row 만 펼침.
//   - per-date celebration picker (`selectedByDate`).
//   - today-anchor vs date discrimination — 동일 date 의 anchor row 와
//     today row 가 별도 fiber 로 유지되도록 `${row.kind}-${row.date}` 키.

interface LiturgicalCalendarListProps {
  initialRows: CalendarListRow[]
  todayStr: string
  /** Date the URL initially asked us to scroll to + expand (when present). */
  initialDate?: string
  /** Celebration query param initially selected (preserved across route trips). */
  initialCelebrationId?: string
}

export function LiturgicalCalendarList({
  initialRows,
  todayStr,
  initialDate,
  initialCelebrationId,
}: LiturgicalCalendarListProps) {
  // FR-145 iter 2 — focusDate 는 mount 시점 auto-scroll 대상.
  // 사용자가 /pray/2026-05-30/lauds 에서 back-link 로 / 로 돌아오면
  // page.tsx 가 ?date=2026-05-30 을 붙여 initialDate 로 흘려준다.
  // 그 경우 today (5/14) 가 아닌 5/30 으로 스크롤되어야 사용자가
  // 자신이 기도하던 날짜로 돌아온다. initialDate 가 없으면 todayStr
  // 으로 폴백.
  const focusDate = initialDate ?? todayStr
  const [expandedDate, setExpandedDate] = useState<string | null>(focusDate)
  // selectedCelebrationId 는 date 별로 보관해 한 세션 내에서 서로 다른
  // 날짜의 picker 선택이 독립 유지.
  const [selectedByDate, setSelectedByDate] = useState<Record<string, string>>(() => {
    if (initialDate && initialCelebrationId && initialCelebrationId !== 'default') {
      return { [initialDate]: initialCelebrationId }
    }
    return {}
  })

  const listRef = useRef<HTMLDivElement | null>(null)
  const focusRowRef = useRef<HTMLLIElement | null>(null)
  const todayRowRef = useRef<HTMLLIElement | null>(null)
  const hasScrolledToFocus = useRef(false)
  // Bumped by each "go to today" (FR-187); the scroll runs after the row
  // has re-rendered open.
  const [todayJumps, setTodayJumps] = useState(0)

  // FR-145 iter 2 NIT #5 — stable ref callbacks so React doesn't see a
  // fresh function identity on every render. The focus row and today's
  // row are usually the same <li>, hence the combined setter.
  const setFocusRowEl = useCallback((el: HTMLLIElement | null) => {
    focusRowRef.current = el
  }, [])
  const setTodayRowEl = useCallback((el: HTMLLIElement | null) => {
    todayRowRef.current = el
  }, [])
  const setFocusAndTodayRowEl = useCallback((el: HTMLLIElement | null) => {
    focusRowRef.current = el
    todayRowRef.current = el
  }, [])

  // Auto-scroll on mount: bring focus row (initialDate ?? today) into
  // view exactly once. focusRowRef 가 어떤 row 에도 attach 되지 않은
  // 경우 (focusDate 가 현재 표시 rows 에 없음) early-return 으로 no-op.
  // The page keys this list by month, so switching months mounts it anew.
  useEffect(() => {
    const el = focusRowRef.current
    if (el && !hasScrolledToFocus.current) {
      revealRow(el, 'auto')
      hasScrolledToFocus.current = true
    }
    // `data-ready` — the list is hydrated and its one-time scroll is done.
    // e2e waits for it: a click sent ~350ms after load used to land on
    // whatever that scroll had just moved under the pointer
    // (docs/bug-reports/2026-10-29-e2e-preexisting-failures.md). Set on
    // the node directly; nothing renders from it.
    listRef.current?.setAttribute('data-ready', 'true')
  }, [])

  // FR-187 — «Өнөөдөр» (footer) and the «Өнөөдөр (Автомат)» row: open
  // today's row and bring it into view. The footer reaches this list
  // through JUMP_TO_TODAY_EVENT; cancelling the event tells it that today
  // is here, so it does not navigate.
  const jumpToToday = useCallback(() => {
    setExpandedDate(todayStr)
    setTodayJumps((n) => n + 1)
  }, [todayStr])

  useEffect(() => {
    const onJump = (e: Event) => {
      if (!todayRowRef.current) return
      e.preventDefault()
      jumpToToday()
    }
    window.addEventListener(JUMP_TO_TODAY_EVENT, onJump)
    return () => window.removeEventListener(JUMP_TO_TODAY_EVENT, onJump)
  }, [jumpToToday])

  useEffect(() => {
    if (todayJumps === 0 || !todayRowRef.current) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    revealRow(todayRowRef.current, reduce ? 'auto' : 'smooth')
  }, [todayJumps])

  // FR-145 iter 2 MAJOR #2 — `today-anchor` row 가 today 의 `date` 를
  // 공유하므로 (`getTodayAnchorRow` 가 레이아웃 연속성용으로 합성),
  // 안커 row 의 토글이 아래 today row 를 접지 않도록 kind 가드.
  // FR-187 — the anchor itself jumps to today's row instead of doing nothing.
  const handleToggle = useCallback(
    (date: string, kind: CalendarListRow['kind']) => {
      if (kind === 'today-anchor') {
        jumpToToday()
        return
      }
      setExpandedDate((prev) => (prev === date ? null : date))
    },
    [jumpToToday],
  )

  const handleSelectCelebration = useCallback((date: string, id: string) => {
    setSelectedByDate((prev) => ({ ...prev, [date]: id }))
  }, [])

  return (
    <div ref={listRef} data-testid="liturgical-calendar-list">
      {/* space-y-2 — 행 간 여백을 늘려 빽빽함 완화(DESIGN.md: 홈 달력 호흡). */}
      <ul className="space-y-2">
        {initialRows.map((row) => {
          // FR-145 iter 2 MAJOR #2 — anchor (kind=today-anchor, date=todayStr)
          // 와 real today (kind=date, date=todayStr) 가 동일 date 를 가지므로
          // React 키는 `${row.kind}-${row.date}` 로 fiber 를 분리.
          const expanded = row.kind === 'date' && expandedDate === row.date
          const selectedId = selectedByDate[row.date] ?? 'default'
          // FR-145 iter 2 MAJOR #1 — focus row 는 initialDate (back-link 경로)
          // 또는 today (홈 방문 default). focusDate 가 현재 rows 에 없으면
          // 어떤 row 도 isFocusRow=true 가 되지 않아 ref 는 attach 안 되고
          // mount useEffect 의 scrollIntoView 도 no-op.
          const isFocusRow = row.kind === 'date' && row.date === focusDate
          const isTodayRow = row.kind === 'date' && row.isToday
          const ref = isFocusRow && isTodayRow
            ? setFocusAndTodayRowEl
            : isFocusRow
              ? setFocusRowEl
              : isTodayRow
                ? setTodayRowEl
                : undefined
          return (
            <LiturgicalCalendarRow
              key={`${row.kind}-${row.date}`}
              ref={ref}
              row={row}
              expanded={expanded}
              selectedCelebrationId={selectedId}
              onToggle={() => handleToggle(row.date, row.kind)}
              onSelectCelebration={(id) => handleSelectCelebration(row.date, id)}
            />
          )
        })}
      </ul>
    </div>
  )
}
