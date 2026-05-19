'use client'

import { useRouter } from 'next/navigation'
import { MonthNav } from './month-nav'

// GOAL #4 (wi-004 / WI #16) — Thin client-side controller for MonthNav.
//
// Why this exists as a separate file:
//   - MonthNav (#15) is callback-driven (`onMonthChange(yearMonth)`)
//     so the render path needs a handler that pushes `/?month=<ym>`.
//   - The home page (`src/app/page.tsx`) is a server component — it
//     calls `getCalendarMonth` which depends on fs / romcal that
//     cannot run client-side, so `'use client'` on page.tsx is not
//     viable.
//   - `useRouter` from 'next/navigation' is client-only.
// This file bridges the two: server page passes `currentMonth` as a
// prop; this client controller wires the URL push.
//
// The dispatch (wi-004) explicitly authorized this wrapper option:
// "(조건부) page.tsx 가 server component 일 경우 onMonthChange 핸들러
// 처리 위해 client 컴포넌트 wrapper 추가 OR MonthNav 자체를 client".

interface MonthNavControllerProps {
  /** 'YYYY-MM' — the resolved month being rendered (from
   *  `resolveMonthRouting` in page.tsx). */
  currentMonth: string
}

export function MonthNavController({ currentMonth }: MonthNavControllerProps) {
  const router = useRouter()
  const handleMonthChange = (yearMonth: string) => {
    // The home route's 3-tier resolver treats `?month=` as Tier 2;
    // pushing this URL re-renders with the chosen month and (because
    // we omit `?date=`) suppresses any initialDate row anchor.
    router.push(`/?month=${yearMonth}`)
  }
  return <MonthNav currentMonth={currentMonth} onMonthChange={handleMonthChange} />
}
