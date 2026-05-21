'use client'

import { useRef } from 'react'
import { Icon } from './icon'

// GOAL #4 (wi-003 / WI #15) — Month navigation control.
//
// 'YYYY-MM' 단위 month 선택 컨트롤. 디스플레이 + prev/next ± 1 month
// 버튼 + native `<input type="month">` 피커. URL push 는 본 컴포넌트가
// 하지 않고 호출자 (page.tsx wrapper, wi-004 #16) 가 `onMonthChange`
// 콜백을 받아 `router.push('/?month='+ym)` 호출하는 분리 원칙 — 그래야
// unit test 가 URL 의존성 없이 컴포넌트 자체 동작만 검증한다.
//
// 모바일 UX: month 라벨 버튼 탭 → `showPicker()` 로 native month picker
// 호출. 데스크탑: 동일 라벨 버튼 + 별도 prev/next 버튼 + 라벨 옆 lucide
// 달력(calendar) 아이콘으로 'picker available' affordance. (이전 ◀▶▼
// 유니코드 글리프 → lucide <Icon> 단일 패밀리, DESIGN.md Iconography.)
//
// 라벨 포맷: 'YYYY оны M-р сар' (몽골어 관용 표현, 예: '2026 оны 6-р сар').

/**
 * 'YYYY-MM' 을 delta 개월만큼 이동시킨 'YYYY-MM' 을 반환.
 *
 * 연도 경계 (1월 prev → 전년 12월, 12월 next → 다음년 1월) 와 큰 delta
 * (예: ±15) 모두 동일 산식으로 처리. month 는 1-12 (1-based) 로 인터프리트.
 *
 * Exported for unit test 직접 호출 (헬퍼는 클릭 핸들러의 본문 — 컴포넌트
 * 는 얇은 와이어링 레이어).
 */
export function shiftMonth(yearMonth: string, delta: number): string {
  const [yearStr, monthStr] = yearMonth.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr) // 1-12
  // 0-based total months from year 0 month 1. delta 가 음수든 양수든
  // 동일 산식 (음수일 때 Math.floor 가 -∞ 방향 truncation 으로 정상 동작).
  const totalMonths = year * 12 + (month - 1) + delta
  const newYear = Math.floor(totalMonths / 12)
  const newMonth = ((totalMonths % 12) + 12) % 12 + 1
  return `${newYear}-${String(newMonth).padStart(2, '0')}`
}

/**
 * 'YYYY-MM' → 'YYYY оны M-р сар' (몽골어 month 라벨).
 *
 * 6 → '6-р сар' (one-letter prefix 없음 — '06-р сар' 가 아님).
 *
 * Exported for unit test 직접 호출.
 */
export function formatMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-')
  return `${year} оны ${Number(month)}-р сар`
}

interface MonthNavProps {
  /** 현재 표시 month, 'YYYY-MM' format (e.g. '2026-05'). */
  currentMonth: string
  /** prev/next/picker 어느 동작으로든 month 가 바뀔 때 호출. URL push 는 호출자 담당. */
  onMonthChange: (yearMonth: string) => void
  /** prev 버튼 aria-label. default 몽골어. */
  prevLabel?: string
  /** next 버튼 aria-label. default 몽골어. */
  nextLabel?: string
  /** picker 버튼 + native input aria-label. default 몽골어. */
  pickerLabel?: string
}

export function MonthNav({
  currentMonth,
  onMonthChange,
  prevLabel = 'Өмнөх сар',
  nextLabel = 'Дараах сар',
  pickerLabel = 'Сар сонгох',
}: MonthNavProps) {
  // Native month picker 호출용 hidden input. button 의 onClick 이
  // showPicker() 를 트리거. 일부 구형 브라우저는 showPicker 미지원이라
  // try/catch + focus() fallback.
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handlePrev = () => onMonthChange(shiftMonth(currentMonth, -1))
  const handleNext = () => onMonthChange(shiftMonth(currentMonth, 1))
  const handlePickerOpen = () => {
    const input = inputRef.current
    if (!input) return
    // showPicker(): Chrome 99+ / Safari 16+ / Firefox 101+. 그 외 환경은
    // input.focus() 로 폴백 — iOS Safari 등은 focus 만으로도 month picker
    // 가 자연스레 열린다.
    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker()
      } catch {
        input.focus()
      }
    } else {
      input.focus()
    }
  }

  return (
    <nav
      role="navigation"
      aria-label={pickerLabel}
      data-testid="month-nav"
      data-role="month-nav"
      className="relative flex items-center justify-between gap-2 py-2"
    >
      <button
        type="button"
        aria-label={prevLabel}
        data-testid="month-nav-prev"
        onClick={handlePrev}
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-3 py-2 text-stone-700 transition-colors hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-400 dark:text-stone-200 dark:hover:bg-stone-800"
      >
        <Icon name="prev" aria-hidden />
        <span className="ml-1 hidden text-sm md:inline">{prevLabel}</span>
      </button>

      <button
        type="button"
        aria-label={pickerLabel}
        aria-haspopup="dialog"
        data-testid="month-nav-label"
        onClick={handlePickerOpen}
        className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg px-3 py-2 text-base font-semibold text-stone-800 transition-colors hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-400 dark:text-stone-100 dark:hover:bg-stone-800"
      >
        <span data-testid="month-nav-label-text">{formatMonthLabel(currentMonth)}</span>
        <Icon name="calendar" size={16} aria-hidden className="ml-2 text-stone-500 dark:text-stone-400" />
      </button>

      <button
        type="button"
        aria-label={nextLabel}
        data-testid="month-nav-next"
        onClick={handleNext}
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-3 py-2 text-stone-700 transition-colors hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-400 dark:text-stone-200 dark:hover:bg-stone-800"
      >
        <span className="mr-1 hidden text-sm md:inline">{nextLabel}</span>
        <Icon name="next" aria-hidden />
      </button>

      {/*
        Hidden native input. tab 으로 도달 가능 (focusable), 스크린리더에는
        aria-label 그대로 노출. 시각적으론 부모 nav 안에 absolute 배치하여
        클릭은 위의 라벨 버튼이 받고 input.showPicker() 로 native 피커 호출.
        sr-only 대신 `absolute inset-y-0 opacity-0 pointer-events-none` 를
        쓰는 이유: showPicker() 가 input 의 viewport 위치를 기반으로 피커
        anchor 를 정하므로 layout-collapsed (sr-only) input 은 일부 모바일
        브라우저에서 피커가 좌상단에 잘못 anchor 된다. nav 안에 정상 크기로
        존재시키고 opacity 만 0 으로 둬서 anchor 가 정확.
      */}
      <input
        ref={inputRef}
        type="month"
        value={currentMonth}
        aria-label={pickerLabel}
        data-testid="month-nav-picker"
        onChange={(e) => {
          if (e.target.value) onMonthChange(e.target.value)
        }}
        className="pointer-events-none absolute inset-y-0 left-0 right-0 -z-10 opacity-0"
        tabIndex={-1}
      />
    </nav>
  )
}
