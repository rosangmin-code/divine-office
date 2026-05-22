'use client'

import Link from 'next/link'
import { useSettings, type FontSize, type FontFamily, type ThemeMode } from '@/lib/settings'
import { Footer } from '@/components/footer'
import { InstallAppSection } from '@/components/install-app-section'
import { Icon } from '@/components/icon'

const FONT_SIZES: { value: FontSize; label: string; scaleEm: number }[] = [
  { value: 'xs', label: 'XS', scaleEm: 0.875 },
  { value: 'sm', label: 'S', scaleEm: 0.9375 },
  { value: 'md', label: 'M', scaleEm: 1 },
  { value: 'lg', label: 'L', scaleEm: 1.125 },
  { value: 'xl', label: 'XL', scaleEm: 1.25 },
  { value: 'xxl', label: 'XXL', scaleEm: 1.375 },
  { value: 'xxxl', label: 'XXXL', scaleEm: 1.5 },
  { value: 'x4l', label: '4XL', scaleEm: 1.75 },
  { value: 'x5l', label: '5XL', scaleEm: 2 },
]

const FONT_SIZE_DEFAULT_INDEX = FONT_SIZES.findIndex(o => o.value === 'md')

// Visual styling for stepper Aa−/Aa+ buttons:
//   - enabled  → INACTIVE_ACCENT (border + hover affordance, identical to
//                fontFamily/theme inactive radio buttons for surface parity)
//   - disabled → muted border + low-contrast glyph + cursor-not-allowed,
//                so reaching the min (XS) / max (5XL) clamp is visible.
export const STEPPER_BTN_DISABLED =
  'border-stone-200 text-stone-300 cursor-not-allowed dark:border-stone-800 dark:text-stone-700'

const FONT_FAMILIES: { value: FontFamily; label: string; sampleClass: string }[] = [
  { value: 'sans', label: 'Sans (Noto Sans)', sampleClass: 'font-sans' },
  { value: 'serif', label: 'Serif (Noto Serif)', sampleClass: 'font-serif' },
]

const THEMES: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Гэрэлтэй' },
  { value: 'dark', label: 'Харанхуй' },
  { value: 'system', label: 'Систем' },
]

export const SECTION_CARD =
  'rounded-xl bg-white p-6 ring-1 ring-stone-200 dark:bg-neutral-900 dark:ring-stone-800'

export const ACTIVE_ACCENT =
  'border-liturgical-gold bg-liturgical-gold/10 text-liturgical-gold dark:border-liturgical-gold-dark dark:bg-liturgical-gold-dark/10 dark:text-liturgical-gold-dark'

export const INACTIVE_ACCENT =
  'border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:bg-stone-800'

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings()

  // #3 (#3-sub-2): psalm-prayer 토글은 '보이기(show)' 양수 의미로 표시한다.
  // 사용자 실버그 — 이전 UI 는 스위치를 collapsed(숨김)에 직접 바인딩해
  // ON=숨김(역방향)이었다. 저장 키 psalmPrayerCollapsed(숨김)는 그대로 유지
  // (localStorage 마이그레이션 회피)하고 UI 표현만 반전한다:
  //   psalmPrayerVisible = !psalmPrayerCollapsed → ON=보임 / OFF=숨김.
  // showPageRefs 섹션과 동일한 양수 토글 패턴. 렌더 게이트
  // (psalm-block.tsx 의 !settings.psalmPrayerCollapsed)는 불변 — 기본값
  // collapsed=false(기본 노출) 유지 → 토글은 기본 ON(보임)으로 표시된다.
  const psalmPrayerVisible = !settings.psalmPrayerCollapsed

  // Stepper state derivation (WI-B #46):
  //   - currentIndex is derived from settings.fontSize via FONT_SIZES, which
  //     is the SSOT (settings.tsx FONT_SIZES + this page's metadata array
  //     are kept in lock-step; AC10 forbids touching settings.tsx, but the
  //     two arrays share the same index space by convention).
  //   - safeIndex falls back to 'md' when the persisted value drifted
  //     beyond the union (defense-in-depth — migrateSettings already
  //     clamps drift, but defending here keeps the stepper render
  //     deterministic even mid-migration / mid-storage-event).
  const rawIndex = FONT_SIZES.findIndex(o => o.value === settings.fontSize)
  const safeIndex = rawIndex < 0 ? FONT_SIZE_DEFAULT_INDEX : rawIndex
  const currentMeta = FONT_SIZES[safeIndex]
  const atMin = safeIndex <= 0
  const atMax = safeIndex >= FONT_SIZES.length - 1
  const currentPercent = Math.round(currentMeta.scaleEm * 100)

  const decreaseFontSize = () => {
    if (atMin) return
    updateSettings({ fontSize: FONT_SIZES[safeIndex - 1].value })
  }
  const increaseFontSize = () => {
    if (atMax) return
    updateSettings({ fontSize: FONT_SIZES[safeIndex + 1].value })
  }

  return (
    <div className="mx-auto max-w-2xl px-2 md:px-6 py-8">
      <header className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/"
            aria-label="Нүүр хуудас"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-stone-200"
          >
            <Icon name="back" aria-hidden />
          </Link>
          <span aria-hidden="true" className="min-w-[44px]" />
        </div>
        <h1 className="mb-2 text-center text-2xl md:text-3xl font-bold text-stone-900 dark:text-stone-100">
          Тохиргоо
        </h1>
        <p className="text-center text-sm text-stone-500 dark:text-stone-400">Settings</p>
      </header>

      <div className="space-y-6">
        {/* Font size */}
        <section aria-labelledby="font-size-heading" className={SECTION_CARD}>
          <h2 id="font-size-heading" className="mb-1 text-lg font-semibold text-stone-800 dark:text-stone-200">
            Үсгийн хэмжээ
          </h2>
          <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
            Залбирлын бичвэрийн хэмжээ
          </p>
          <div
            role="group"
            aria-labelledby="font-size-heading"
            data-role="font-size-stepper"
            className="flex items-center justify-between gap-3"
          >
            <button
              type="button"
              aria-label="Үсгийн хэмжээ багасгах"
              data-role="font-size-decrease"
              onClick={decreaseFontSize}
              disabled={atMin}
              className={`flex h-12 min-h-[44px] w-12 min-w-[44px] items-center justify-center rounded-lg border-2 transition-colors ${
                atMin ? STEPPER_BTN_DISABLED : INACTIVE_ACCENT
              }`}
            >
              <Icon name="minus" size={22} aria-hidden />
            </button>
            <div
              data-testid="font-size-current"
              data-font-size-value={currentMeta.value}
              aria-live="polite"
              className={`flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-lg border-2 px-4 py-2 ${ACTIVE_ACCENT}`}
            >
              <span style={{ fontSize: `${currentMeta.scaleEm}em` }} className="leading-none">
                Aa
              </span>
              <span className="text-xs text-stone-500 dark:text-stone-400">
                {currentMeta.label} ({currentPercent}%)
              </span>
            </div>
            <button
              type="button"
              aria-label="Үсгийн хэмжээ томруулах"
              data-role="font-size-increase"
              onClick={increaseFontSize}
              disabled={atMax}
              className={`flex h-12 min-h-[44px] w-12 min-w-[44px] items-center justify-center rounded-lg border-2 transition-colors ${
                atMax ? STEPPER_BTN_DISABLED : INACTIVE_ACCENT
              }`}
            >
              <Icon name="plus" size={22} aria-hidden />
            </button>
          </div>
        </section>

        {/* Font family */}
        <section aria-labelledby="font-family-heading" className={SECTION_CARD}>
          <h2 id="font-family-heading" className="mb-1 text-lg font-semibold text-stone-800 dark:text-stone-200">
            Үсгийн хэлбэр
          </h2>
          <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
            Sans (орчин үеийн) эсвэл Serif (сонгодог)
          </p>
          <div role="radiogroup" aria-labelledby="font-family-heading" className="grid grid-cols-2 gap-2">
            {FONT_FAMILIES.map(opt => {
              const active = settings.fontFamily === opt.value
              return (
                <button
                  key={opt.value}
                  role="radio"
                  aria-checked={active}
                  onClick={() => updateSettings({ fontFamily: opt.value })}
                  className={`min-h-[44px] rounded-lg border-2 px-4 py-3 text-sm transition-colors ${opt.sampleClass} ${
                    active ? ACTIVE_ACCENT : INACTIVE_ACCENT
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>

          <div
            data-testid="font-preview"
            className="mt-4 rounded-lg bg-stone-50 px-4 py-3 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
          >
            <p className="mb-1 text-xs uppercase tracking-wide text-stone-400 dark:text-stone-500">
              Жишээ
            </p>
            <p>Эзэн таны нэр алдаршиг, таны хаант улс ирэх болтугай.</p>
            <p className="mt-1 italic">Dominus tecum.</p>
          </div>
        </section>

        {/* Theme */}
        <section aria-labelledby="theme-heading" className={SECTION_CARD}>
          <h2 id="theme-heading" className="mb-1 text-lg font-semibold text-stone-800 dark:text-stone-200">
            Горим
          </h2>
          <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
            Гэрэлтэй, харанхуй, эсвэл системийн сонголт
          </p>
          <div role="radiogroup" aria-labelledby="theme-heading" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {THEMES.map(opt => {
              const active = settings.theme === opt.value
              return (
                <button
                  key={opt.value}
                  role="radio"
                  aria-checked={active}
                  onClick={() => updateSettings({ theme: opt.value })}
                  className={`min-h-[44px] rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors ${
                    active ? ACTIVE_ACCENT : INACTIVE_ACCENT
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </section>

        {/* Page references toggle */}
        <section aria-labelledby="page-refs-heading" className={SECTION_CARD}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="page-refs-heading" className="mb-1 text-lg font-semibold text-stone-800 dark:text-stone-200">
                Хуудасны лавлагаа
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                PDF хуудасны дугаарыг бичвэр дотор харуулах
              </p>
            </div>
            <button
              role="switch"
              aria-checked={settings.showPageRefs}
              aria-labelledby="page-refs-heading"
              onClick={() => updateSettings({ showPageRefs: !settings.showPageRefs })}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                settings.showPageRefs
                  ? 'bg-liturgical-gold dark:bg-liturgical-gold-dark'
                  : 'bg-stone-300 dark:bg-stone-600'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                  settings.showPageRefs ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Psalm-concluding prayer visibility toggle (#3-sub-2: 양수 '보이기' 의미) */}
        <section aria-labelledby="psalm-prayer-heading" className={SECTION_CARD}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="psalm-prayer-heading" className="mb-1 text-lg font-semibold text-stone-800 dark:text-stone-200">
                Дууллыг төгсгөх залбирал
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Дуулал бүрийн дараах залбирлыг харуулах
              </p>
            </div>
            <button
              role="switch"
              aria-checked={psalmPrayerVisible}
              aria-labelledby="psalm-prayer-heading"
              onClick={() => updateSettings({ psalmPrayerCollapsed: psalmPrayerVisible })}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                psalmPrayerVisible
                  ? 'bg-liturgical-gold dark:bg-liturgical-gold-dark'
                  : 'bg-stone-300 dark:bg-stone-600'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                  psalmPrayerVisible ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </section>

        {/* App install */}
        <InstallAppSection />
      </div>

      <Footer />
    </div>
  )
}
