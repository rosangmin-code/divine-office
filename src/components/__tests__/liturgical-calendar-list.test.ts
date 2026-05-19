/**
 * Unit tests for WI #17 / wi-005 — `LiturgicalCalendarList` infinite scroll
 * 제거 후 month-mode 렌더 검증. gospel-canticle-section.test.ts 의 패턴
 * (react-dom/server + structural-substring assert) 을 따른다 — vitest config
 * 에 jsdom 환경이 없으므로 useEffect / IntersectionObserver 동적 동작은
 * 본 unit suite 에서 verify 하지 않고, **rendered HTML 의 구조적 부재** +
 * **소스 코드 grep** 으로 회귀 가드한다.
 *
 * Coverage:
 *   - 기본 렌더 — rows 가 그대로 출력 (initialRows 길이만큼 row 가 mount)
 *   - month-mode no infinite scroll — sentinel `<div aria-hidden>` 0건,
 *     loading 메시지 ('Уншиж байна...') 0건, source 의 IntersectionObserver
 *     / loadOlder / loadNewer / loadWindow 코드 토큰 0건
 *   - focus row 결정 — focusDate 가 row 안에 있을 때 vs 없을 때 (HTML
 *     은 동일하지만 ref attach 여부는 mount 후 useEffect 동작 — 본
 *     suite 는 HTML structural 만 verify, 실제 scrollIntoView 호출은
 *     e2e/jsdom 책임)
 *   - expandedDate default — focusDate row 의 expanded prop true 로 전달
 *     (LiturgicalCalendarRow 가 본인 자식 마크업에서 어떻게 표현하는지에
 *     의존하므로, 본 suite 는 row 가 마운트되었다는 사실만 verify)
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { LiturgicalCalendarList } from '../liturgical-calendar-list'
import type { CalendarListRow } from '@/lib/calendar-list-types'

function makeDateRow(date: string, overrides: Partial<CalendarListRow> = {}): CalendarListRow {
  const dayOfMonth = Number(date.slice(8, 10))
  const month = Number(date.slice(5, 7))
  return {
    kind: 'date',
    date,
    isToday: false,
    dayLabel: 'Лха',
    dayOfMonth,
    month,
    defaultCelebration: {
      id: 'default',
      mn: `${dayOfMonth}-ийн өдөр`,
      shortMn: `${dayOfMonth}-ийн өдөр`,
      rank: 'WEEKDAY',
      color: 'GREEN',
      source: 'romcal',
    },
    color: 'GREEN',
    rank: 'WEEKDAY',
    psalterWeek: 1,
    alternatives: [],
    hoursSummary: [],
    ...overrides,
  } as CalendarListRow
}

function makeMonthRows(startDate: string, count: number): CalendarListRow[] {
  const rows: CalendarListRow[] = []
  const base = new Date(startDate + 'T00:00:00Z')
  for (let i = 0; i < count; i++) {
    const d = new Date(base)
    d.setUTCDate(base.getUTCDate() + i)
    rows.push(makeDateRow(d.toISOString().slice(0, 10)))
  }
  return rows
}

// @fr FR-145
describe('LiturgicalCalendarList — WI #17 month-mode (no infinite scroll)', () => {
  it('renders each row from initialRows (31일 한 달치)', () => {
    const rows = makeMonthRows('2026-05-01', 31)
    const html = renderToStaticMarkup(
      createElement(LiturgicalCalendarList, {
        initialRows: rows,
        todayStr: '2026-05-14',
      }),
    )
    expect(html).toContain('data-testid="liturgical-calendar-list"')
    // 31 row 가 모두 마운트 — LiturgicalCalendarRow 가 각 row 에 부착하는
    // `data-date="YYYY-MM-DD"` attribute 로 verify.
    for (let day = 1; day <= 31; day++) {
      const date = `2026-05-${String(day).padStart(2, '0')}`
      expect(html).toContain(`data-date="${date}"`)
    }
  })

  // AC #8 — month-mode no infinite scroll
  it('renders NO infinite-scroll sentinels (top/bottom aria-hidden divs)', () => {
    const rows = makeMonthRows('2026-05-01', 31)
    const html = renderToStaticMarkup(
      createElement(LiturgicalCalendarList, {
        initialRows: rows,
        todayStr: '2026-05-14',
      }),
    )
    // 이전 iter 의 top/bottom sentinel `<div aria-hidden ...>` 는 제거됨.
    // list 컨테이너 안에 aria-hidden 속성을 가진 자식이 존재하지 않아야 함.
    expect(html).not.toMatch(/<div[^>]*aria-hidden[^>]*class="h-1"/)
  })

  // AC #8 — loading 표시 surface 제거
  it('renders NO loading message ("Уншиж байна...") even when many rows are present', () => {
    const rows = makeMonthRows('2026-05-01', 31)
    const html = renderToStaticMarkup(
      createElement(LiturgicalCalendarList, {
        initialRows: rows,
        todayStr: '2026-05-14',
      }),
    )
    // 이전 iter 가 loadingOlder || loadingNewer state 에 따라 노출하던
    // 'Уншиж байна...' 메시지. infinite scroll 제거와 함께 사라짐.
    expect(html).not.toContain('Уншиж байна')
    expect(html).not.toContain('calendar-list-loading')
  })

  // AC #1, #2, #3, #4 — source-level structural assertions (regression guard).
  // 주의: 본 컴포넌트는 '제거한 것' 을 코멘트로 명시한다 (이전 iter 의
  // IntersectionObserver / loadOlder / loadNewer / hasScrolled / loadWindow
  // 가 모두 사라졌다는 history 를 보존). 단순 `toContain` 은 코멘트 안의
  // 토큰까지 매치하므로 회귀 가드로 부적합 — 본 테스트는 **코드 부분만**
  // 추출 (블록/라인 코멘트 strip) 한 뒤 토큰 부재를 단언한다.
  it('source code (comments stripped) contains NO infinite-scroll mechanisms', () => {
    const srcPath = resolve(__dirname, '..', 'liturgical-calendar-list.tsx')
    const raw = readFileSync(srcPath, 'utf-8')
    // /* ... */ 블록 코멘트 + // 라인 코멘트 제거 (TypeScript 의 JSX
    // 내부 `{/* */}` 도 동일하게 제거됨 — 본 컴포넌트는 JSX 내 주석을
    // 쓰지 않으므로 안전).
    const code = raw
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, ''))
      .join('\n')
    // AC #1 — IntersectionObserver 호출 0건
    expect(code).not.toContain('IntersectionObserver')
    // AC #2 — loadOlder / loadNewer 함수 부재
    expect(code).not.toMatch(/\bloadOlder\b/)
    expect(code).not.toMatch(/\bloadNewer\b/)
    // AC #3 — loadWindow prop 부재
    expect(code).not.toMatch(/\bloadWindow\b/)
    // AC #4 — hasScrolled / exhausted* / loading* state 부재
    expect(code).not.toMatch(/\bhasScrolled\b/)
    expect(code).not.toMatch(/\bexhaustedOlder\b/)
    expect(code).not.toMatch(/\bexhaustedNewer\b/)
    expect(code).not.toMatch(/\bloadingOlder\b/)
    expect(code).not.toMatch(/\bloadingNewer\b/)
    // sentinel ref 부재
    expect(code).not.toMatch(/\btopSentinelRef\b/)
    expect(code).not.toMatch(/\bbottomSentinelRef\b/)
    // window scroll listener 부재 (auto-arming 패턴)
    expect(code).not.toMatch(/window\.addEventListener\(['"]scroll['"]/)
  })

  // AC #5, #6 — focus row determination + autoscroll-on-mount 동작 보존
  it('renders focus row from initialDate when present in rows', () => {
    const rows = makeMonthRows('2026-05-01', 31)
    const html = renderToStaticMarkup(
      createElement(LiturgicalCalendarList, {
        initialRows: rows,
        todayStr: '2026-05-14',
        initialDate: '2026-05-30',
      }),
    )
    // 5/30 row 는 정상적으로 출력 — ref attach 여부는 jsdom 책임이지만
    // mount 자체는 static markup 에서 확인 가능.
    expect(html).toContain('data-date="2026-05-30"')
  })

  it('handles initialDate that is NOT in rows (focus ref un-attached, no scroll)', () => {
    // page.tsx 가 month=2026-05 만 로드했을 때 사용자가
    // /?date=2026-08-15 로 들어오면 focusDate=2026-08-15 가 현재 rows
    // 안에 없으므로 어떤 row 도 focus 로 마킹되지 않는다. 이 시나리오는
    // 컴포넌트 mount 자체가 깨지지 않고 정상 렌더되는지만 가드.
    const rows = makeMonthRows('2026-05-01', 31)
    const html = renderToStaticMarkup(
      createElement(LiturgicalCalendarList, {
        initialRows: rows,
        todayStr: '2026-05-14',
        initialDate: '2026-08-15',
      }),
    )
    expect(html).toContain('data-testid="liturgical-calendar-list"')
    // out-of-range focusDate 의 row 는 rows 에 없으므로 마크업에 등장 X.
    expect(html).not.toContain('data-date="2026-08-15"')
    // 31 row 가 모두 정상 출력 (회귀 가드).
    for (let day = 1; day <= 31; day++) {
      const date = `2026-05-${String(day).padStart(2, '0')}`
      expect(html).toContain(`data-date="${date}"`)
    }
  })

  it('renders with empty rows array (defensive — guards against crash)', () => {
    const html = renderToStaticMarkup(
      createElement(LiturgicalCalendarList, {
        initialRows: [],
        todayStr: '2026-05-14',
      }),
    )
    // 컨테이너는 마운트되고 ul 도 마운트 (자식 0개).
    expect(html).toContain('data-testid="liturgical-calendar-list"')
    expect(html).toMatch(/<ul[^>]*class="space-y-1"[^>]*><\/ul>/)
  })
})
