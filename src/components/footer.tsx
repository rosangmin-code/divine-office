'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icon } from './icon'

/**
 * Footer — 교회 출처표시(credit) 2줄을 **항상** 노출한다 (FR-162, #51/#53).
 *
 * 이전 click-to-toggle(▾/▴) 메커니즘은 제거됐다: 출처 2줄이 토글 뒤에
 * 숨어 발견성이 낮았던 문제를 해소하기 위해 작은 caption 으로 상시 노출한다.
 * 따라서 `data-role="footer-toggle"` / `aria-expanded` / `expanded` state /
 * `aria-controls` 패널 게이팅은 더 이상 존재하지 않는다.
 *
 * Default (no prop) — 모든 비-home 라우트(/guide, /ordinarium, /pray/...,
 * /settings)에서 쓰는 미니멀 footer: 가운데 정렬된 출처 2줄.
 *
 * `homeControls={true}` — 홈 변형(sticky bottom). 컨트롤 2개
 * (Өнөөдөр / Тохиргоо, 아이콘+라벨) + 출처 2줄. iOS notch-safe via
 * `env(safe-area-inset-bottom)`.
 *
 * 접근성: native <button>/<a> (Tab + Space/Enter), 각 컨트롤은 몽골어
 * 키릴 aria-label (NFR-002 — 영어 fallback 없음). 아이콘은 lucide 단일
 * 패밀리(<Icon>) — 이모지/유니코드 글리프 금지 (DESIGN.md Iconography).
 */

export interface FooterProps {
  /** When true, render the sticky-bottom home variant with the two
   *  controls. Default (false) keeps the minimal credit-only footer for
   *  every other page. */
  homeControls?: boolean
}

/**
 * 교회 출처표시 2줄 — 양쪽 변형에서 항상 노출(작은 caption, faint).
 * data-role="footer-content" 는 출처 컨테이너 식별자로 유지된다(상시 렌더).
 */
function CreditLines() {
  return (
    <div data-role="footer-content" className="text-center">
      <p className="text-xs text-stone-400 dark:text-stone-500">
        Цагийн Залбирал — Монгол Католик Сүм
      </p>
      <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
        Зарим орчуулга хийгдэж байна
      </p>
    </div>
  )
}

export function Footer({ homeControls = false }: FooterProps = {}) {
  const router = useRouter()
  // "Өнөөдөр" = jump to today. Pushing `/` with no query params lets the
  // page.tsx 3-tier resolver pick Tier 3 (today's month + today anchor row).
  const handleTodayJump = () => router.push('/')

  // --- Home variant ------------------------------------------------
  if (homeControls) {
    return (
      <footer
        data-role="footer"
        data-variant="home"
        className="sticky bottom-0 z-30 mt-6 border-t border-stone-200 bg-white/95 backdrop-blur dark:border-stone-800 dark:bg-stone-900/90"
        // iOS notch / Android nav-bar safe area: combine with a default
        // 0.75rem pad so devices without an inset still get breathing room.
        style={{
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-around gap-2 px-2 pt-3 md:px-6">
          <button
            type="button"
            onClick={handleTodayJump}
            aria-label="Өнөөдрийн өдөр рүү шилжих"
            data-role="footer-today"
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-liturgical-gold)] dark:text-stone-200 dark:hover:bg-stone-800"
          >
            <Icon name="today" aria-hidden />
            <span>Өнөөдөр</span>
          </button>
          {/* Тохиргоо — lucide settings 아이콘 + 라벨. /settings 진입로.
              data-role="settings-link" 는 e2e(settings/calendar-list-month)
              가 키로 쓰는 식별자라 유지한다. */}
          <Link
            href="/settings"
            aria-label="Тохиргоо"
            title="Тохиргоо"
            data-role="settings-link"
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-liturgical-gold)] dark:text-stone-200 dark:hover:bg-stone-800"
          >
            <Icon name="settings" aria-hidden />
            <span>Тохиргоо</span>
          </Link>
        </div>
        <div className="mt-2 px-2 pb-1 md:px-6">
          <CreditLines />
        </div>
      </footer>
    )
  }

  // --- Default minimal variant (existing behavior, all other routes) ---
  return (
    <footer className="py-6" data-role="footer">
      <CreditLines />
    </footer>
  )
}
