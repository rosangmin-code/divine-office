'use client'

import Link from 'next/link'
import { useId } from 'react'

// GOAL #24 WI-A (#29) — PrayerFooter component (strip + slide-up panel).
//
// 기도문 화면 (`/pray/[date]/[hour]`) 하단에 32px sticky strip 을 두고,
// strip 탭 시 위로 슬라이드되는 패널 안에 [📅 Огноо] / [⚙ Тохиргоо]
// 두 가지 진입점을 노출한다. 사용자 directive (2026-05-19) — 상단의
// SettingsLink 를 제거하고 본 컴포넌트로 단일 진입점화 (D5=a).
//
// 본 WI 의 범위:
//   - 컴포넌트 구조 + 시각적 렌더링 + 메뉴 링크.
//   - **Controlled component** — 부모가 `expanded` 상태를 관리하고
//     strip 탭 시 `onToggle` 콜백으로 통지한다. 본 WI 에서는 패널
//     visibility 만 `expanded` prop 에 의해 결정 (CSS-only conditional
//     render). slide-up animation + dismiss 로직 (useState 내부화 +
//     Escape 키 + outside-tap) 은 후속 WI-B (#30) 가 추가.
//   - page.tsx 통합 + 상단 SettingsLink 제거는 후속 WI-C (#31) 가 처리.
//
// a11y:
//   - native `<button type="button">` strip — Tab / Space / Enter 무료.
//   - `aria-expanded` 가 토글 상태 반영, `aria-controls` 가 패널 컨테이너
//     id 를 가리킴 (collapsed 에서도 id 사전 약속 유지).
//   - `aria-label` 은 Mongolian Cyrillic ('Цэс харуулах' / 'Цэс нуух') —
//     NFR-002 영어 fallback 0건. footer.tsx (FR-162) 의 'Доод бичвэр
//     нуух' 와 동일한 동사 어형.
//   - chevron span 은 `aria-hidden` 으로 스크린리더 중복 노출 차단.
//   - menu 링크 2개는 별도 `<nav aria-label="Цэс">` 안에 배치 (구조적
//     의미 + 스크린리더 분기 navigation 영역).
//   - 모든 인터랙티브 요소에 `focus-visible:outline-2 outline-offset-2`
//     키보드 포커스 가드.
//
// safe-area:
//   - `pb-[env(safe-area-inset-bottom)]` 으로 iOS notch / Android navbar
//     겹침 회피. 컨테이너 안에서 strip 아래쪽으로 padding 부여 — strip
//     자체가 노치에 가려지지 않도록 push.
//
// 레이아웃:
//   - 외곽 컨테이너 `fixed inset-x-0 bottom-0 z-40 flex flex-col` —
//     panel 이 strip 위에 쌓이도록 column 정렬. `fixed bottom-0` 이
//     컨테이너의 BOTTOM 을 viewport bottom 에 고정하므로 panel 추가 시
//     컨테이너가 UP 방향으로 성장하여 strip 은 항상 viewport 바닥에
//     머문다.
//   - z-40 — body content (z-10 이하) 위, modal (z-50 이상) 아래.
//   - 32px (`h-[32px]`) — 명시적 픽셀 값으로 FR-166 (font scaling, GOAL
//     #34) 영향 배제. handle 만 표시되는 strip 이므로 텍스트 스케일링
//     이 strip 높이를 흔들면 안 됨.

interface PrayerFooterProps {
  /** 현재 보고 있는 기도문의 날짜, 'YYYY-MM-DD' format. Огноо 링크가
   *  이 날짜로 / 페이지를 anchor. */
  date: string
  /** Огноо 링크에 함께 보존할 celebration 식별자. URL 인코딩 후
   *  `&celebration=...` 으로 부착. 부재 시 query 미포함. */
  celebration?: string
  /** 패널 visibility (controlled). 부모가 useState 로 관리하고 본 컴포넌트
   *  는 prop 값만 반영. default false. */
  expanded?: boolean
  /** strip 탭 시 호출되는 콜백. 부모는 이 콜백 안에서 expanded state
   *  를 toggle. WI-B (#30) 에서 useState 내재화 + Esc/outside-tap dismiss
   *  추가 예정. */
  onToggle?: () => void
}

export function PrayerFooter({
  date,
  celebration,
  expanded = false,
  onToggle,
}: PrayerFooterProps) {
  // 패널 컨테이너 id — `aria-controls` 가 collapsed 에서도 사전 약속된
  // id 를 가리키도록 unconditional 으로 생성 (footer.tsx FR-162 동일 패턴).
  const contentId = useId()

  // Огноо 링크 href — celebration 가 truthy 일 때만 query 부착.
  // encodeURIComponent 로 특수문자 안전 (사용자가 URL-안전 식별자만
  // 입력한다는 가정 없이 방어).
  const dateHref = celebration
    ? `/?date=${date}&celebration=${encodeURIComponent(celebration)}`
    : `/?date=${date}`

  return (
    <div
      data-role="prayer-footer"
      className="fixed inset-x-0 bottom-0 z-40 flex flex-col pb-[env(safe-area-inset-bottom)]"
    >
      {/*
        Slide-up panel — `expanded === true` 일 때만 마운트. WI-B (#30)
        가 slide animation (transform: translateY(100%) → 0) + reduced-
        motion respect 를 추가. 본 WI 에서는 조건부 DOM 부재/존재 만으로
        visibility 결정.
      */}
      {expanded && (
        <div
          id={contentId}
          data-role="prayer-footer-content"
          className="border-t border-stone-300 bg-white shadow-[0_-6px_16px_rgba(0,0,0,0.06)] dark:border-stone-700 dark:bg-neutral-900"
        >
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-2 dark:border-stone-800">
            <span className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Цэс
            </span>
          </div>
          <nav aria-label="Цэс" className="flex gap-2 px-3 py-3">
            <Link
              href={dateHref}
              data-role="prayer-footer-menu-date"
              aria-label="Огноо"
              className="flex flex-1 flex-col items-center rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-center text-stone-800 transition-colors hover:border-sky-300 hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-400 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:border-sky-700 dark:hover:bg-sky-900/30"
            >
              <span aria-hidden="true" className="text-2xl leading-none">
                📅
              </span>
              <span className="mt-1 text-sm font-medium">Огноо</span>
            </Link>
            <Link
              href="/settings"
              data-role="prayer-footer-menu-settings"
              aria-label="Тохиргоо"
              className="flex flex-1 flex-col items-center rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-center text-stone-800 transition-colors hover:border-sky-300 hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-400 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:border-sky-700 dark:hover:bg-sky-900/30"
            >
              <span aria-hidden="true" className="text-2xl leading-none">
                ⚙
              </span>
              <span className="mt-1 text-sm font-medium">Тохиргоо</span>
            </Link>
          </nav>
        </div>
      )}

      {/* Strip — 항상 렌더 (sticky bottom). 탭하면 onToggle 호출. */}
      <button
        type="button"
        onClick={onToggle}
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
  )
}
