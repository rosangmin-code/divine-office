'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CalendarListRow, CalendarListWindow } from '@/lib/calendar-list-types'
import { LiturgicalCalendarRow } from './liturgical-calendar-row'

// FR-145 (#8) — Infinite-scroll calendar-list container.
//
// User decision 4: list window is today-centric + infinite scroll. Row
// selection toggles an *inline* expansion (hour cards + celebration
// picker) — no panel / no route navigation.
//
// Strategy:
//   - Hydrate from a server-rendered initial window (`initialRows`),
//     which already includes the synthetic anchor + N rows before/after
//     today.
//   - Two IntersectionObservers (one top, one bottom) trigger
//     `loadOlder()` / `loadNewer()` when their sentinels come into view.
//     Each call extends `rows` by a page (default 14 days) by calling
//     into the server adapter via the bound action.
//   - Row expand/collapse state is local (`expandedDate`). Selecting a
//     row scrolls it into view (the synthetic anchor / today row remain
//     scroll-anchored at mount). Only one row is expanded at a time —
//     simpler model, matches the "browse calendar then commit" flow.

interface LiturgicalCalendarListProps {
  initialRows: CalendarListRow[]
  todayStr: string
  /** Date the URL initially asked us to scroll to + expand (when present). */
  initialDate?: string
  /** Celebration query param initially selected (preserved across route trips). */
  initialCelebrationId?: string
  /**
   * Server action that returns a new window centered at `anchorDate`.
   * Allows the client to extend the visible range without paying for a
   * full page render.
   */
  loadWindow: (
    anchorDate: string,
    before: number,
    after: number,
  ) => Promise<CalendarListWindow>
  /** Days to extend on each scroll-near-edge trigger. Default 14. */
  pageSize?: number
}

export function LiturgicalCalendarList({
  initialRows,
  todayStr,
  initialDate,
  initialCelebrationId,
  loadWindow,
  pageSize = 14,
}: LiturgicalCalendarListProps) {
  const [rows, setRows] = useState<CalendarListRow[]>(initialRows)
  const [expandedDate, setExpandedDate] = useState<string | null>(
    initialDate ?? todayStr,
  )
  // selectedCelebrationId is keyed by date so different days can hold
  // independent picker selections during a single browse session.
  const [selectedByDate, setSelectedByDate] = useState<Record<string, string>>(() => {
    if (initialDate && initialCelebrationId && initialCelebrationId !== 'default') {
      return { [initialDate]: initialCelebrationId }
    }
    return {}
  })

  const [loadingOlder, setLoadingOlder] = useState(false)
  const [loadingNewer, setLoadingNewer] = useState(false)
  // FR-145 — gate auto-extend behind a real user scroll signal. Without
  // this, the top sentinel sits at scroll=0 on first paint (already in
  // the viewport) and triggers loadOlder repeatedly, walking the dataset
  // backward in time before the user has actually scrolled there. The
  // initial server window (±60 days from anchor) is large enough that a
  // typical session never reaches the edge — auto-extend is purely the
  // "user scrolled past the edge" affordance.
  const [hasScrolled, setHasScrolled] = useState(false)

  const dataDateRange = useMemo(() => {
    const dateRows = rows.filter((r) => r.kind === 'date')
    if (dateRows.length === 0) return null
    const earliest = dateRows[0].date
    const latest = dateRows[dateRows.length - 1].date
    return { earliest, latest }
  }, [rows])

  const topSentinelRef = useRef<HTMLDivElement | null>(null)
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null)
  const todayRowRef = useRef<HTMLElement | null>(null)
  const hasScrolledToToday = useRef(false)

  // Auto-scroll: bring today's row into view exactly once on mount.
  // Done after layout so the row has dimensions.
  useEffect(() => {
    if (hasScrolledToToday.current) return
    if (!todayRowRef.current) return
    todayRowRef.current.scrollIntoView({ block: 'center', behavior: 'auto' })
    hasScrolledToToday.current = true
  }, [rows])

  // Track real user-driven scroll so the sentinel-triggered extend
  // doesn't fire on initial render (when scroll=0 → top sentinel is
  // already in view). We listen on window and capture the FIRST scroll
  // event after the autoscroll-to-today has had a chance to settle.
  useEffect(() => {
    let armed = false
    // Defer arming so the auto-scroll-to-today event doesn't count as
    // "user scrolled". 200 ms is enough for the smooth/auto scroll to
    // complete in headless and real browsers.
    const armTimer = window.setTimeout(() => {
      armed = true
    }, 200)
    const onScroll = () => {
      if (!armed) return
      setHasScrolled(true)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.clearTimeout(armTimer)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  const loadOlder = useCallback(async () => {
    if (!hasScrolled) return
    if (loadingOlder || !dataDateRange) return
    setLoadingOlder(true)
    try {
      // Window: [earliest - pageSize, earliest - 1] — fetch only the
      // strictly-older chunk so we don't re-emit the rows we already have.
      const newAnchor = dataDateRange.earliest
      const { rows: more } = await loadWindow(newAnchor, pageSize, -1)
      // Filter out anchor/duplicate dates we already render.
      const existingDates = new Set(rows.filter((r) => r.kind === 'date').map((r) => r.date))
      const newPrepend = more.filter((r) => r.kind === 'date' && !existingDates.has(r.date))
      if (newPrepend.length > 0) {
        setRows((prev) => {
          const anchor = prev.find((r) => r.kind === 'today-anchor')
          const rest = prev.filter((r) => r.kind !== 'today-anchor')
          return anchor ? [anchor, ...newPrepend, ...rest] : [...newPrepend, ...rest]
        })
      }
    } finally {
      setLoadingOlder(false)
    }
  }, [hasScrolled, loadingOlder, dataDateRange, loadWindow, pageSize, rows])

  const loadNewer = useCallback(async () => {
    if (!hasScrolled) return
    if (loadingNewer || !dataDateRange) return
    setLoadingNewer(true)
    try {
      // Window: [latest + 1, latest + pageSize] — strict newer chunk only.
      const newAnchor = dataDateRange.latest
      const { rows: more } = await loadWindow(newAnchor, -1, pageSize)
      const existingDates = new Set(rows.filter((r) => r.kind === 'date').map((r) => r.date))
      const newAppend = more.filter((r) => r.kind === 'date' && !existingDates.has(r.date))
      if (newAppend.length > 0) {
        setRows((prev) => [...prev, ...newAppend])
      }
    } finally {
      setLoadingNewer(false)
    }
  }, [hasScrolled, loadingNewer, dataDateRange, loadWindow, pageSize, rows])

  // IntersectionObserver: top sentinel → loadOlder, bottom → loadNewer.
  // We use a small rootMargin so the fetch fires before the user actually
  // reaches the edge, hiding the latency from short scrolls.
  useEffect(() => {
    const topEl = topSentinelRef.current
    const bottomEl = bottomSentinelRef.current
    if (!topEl || !bottomEl) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          if (entry.target === topEl) void loadOlder()
          if (entry.target === bottomEl) void loadNewer()
        }
      },
      { rootMargin: '400px 0px' },
    )
    observer.observe(topEl)
    observer.observe(bottomEl)
    return () => {
      observer.disconnect()
    }
  }, [loadOlder, loadNewer])

  const handleToggle = useCallback((date: string) => {
    setExpandedDate((prev) => (prev === date ? null : date))
  }, [])

  const handleSelectCelebration = useCallback((date: string, id: string) => {
    setSelectedByDate((prev) => ({ ...prev, [date]: id }))
  }, [])

  return (
    <div data-testid="liturgical-calendar-list">
      <div ref={topSentinelRef} aria-hidden className="h-1" />
      <ul className="space-y-1">
        {rows.map((row) => {
          const expanded = !!row.date && expandedDate === row.date && row.kind === 'date'
          const selectedId = selectedByDate[row.date] ?? 'default'
          const refProp = row.isToday
            ? (el: HTMLElement | null) => {
                todayRowRef.current = el
              }
            : undefined
          return (
            <RowSlot key={`${row.kind}-${row.date}-${row.kind === 'today-anchor' ? 'anchor' : 'date'}`} refProp={refProp}>
              <LiturgicalCalendarRow
                row={row}
                expanded={expanded}
                selectedCelebrationId={selectedId}
                onToggle={() => handleToggle(row.date)}
                onSelectCelebration={(id) => handleSelectCelebration(row.date, id)}
              />
            </RowSlot>
          )
        })}
      </ul>
      <div ref={bottomSentinelRef} aria-hidden className="h-1" />
      {(loadingOlder || loadingNewer) && (
        <p
          data-testid="calendar-list-loading"
          className="py-4 text-center text-xs text-stone-500 dark:text-stone-400"
        >
          Уншиж байна...
        </p>
      )}
    </div>
  )
}

/**
 * Tiny wrapper that forwards the ref-callback to the row's <li>. Using a
 * separate slot keeps the LiturgicalCalendarRow pure (no ref plumbing)
 * while still letting the parent observe the today row for scroll-anchor.
 */
function RowSlot({
  refProp,
  children,
}: {
  refProp?: (el: HTMLElement | null) => void
  children: React.ReactNode
}) {
  // Wrap the child with a ref-capturing element. We render a fragment-ish
  // shim that attaches the ref to a relative-positioned span so the row
  // layout is untouched while still being observable. The shim is
  // visually invisible.
  return (
    <span
      ref={refProp as unknown as React.Ref<HTMLSpanElement> | undefined}
      style={{ display: 'contents' }}
    >
      {children}
    </span>
  )
}
