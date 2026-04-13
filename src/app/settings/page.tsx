'use client'

import Link from 'next/link'
import { useSettings, type FontSize, type FontFamily, type ThemeMode } from '@/lib/settings'
import { Footer } from '@/components/footer'

const FONT_SIZES: { value: FontSize; label: string; scaleEm: number }[] = [
  { value: 'xs', label: 'XS', scaleEm: 0.875 },
  { value: 'sm', label: 'S', scaleEm: 0.9375 },
  { value: 'md', label: 'M', scaleEm: 1 },
  { value: 'lg', label: 'L', scaleEm: 1.125 },
  { value: 'xl', label: 'XL', scaleEm: 1.25 },
]

const FONT_FAMILIES: { value: FontFamily; label: string; sampleClass: string }[] = [
  { value: 'sans', label: 'Sans (Noto Sans)', sampleClass: 'font-sans' },
  { value: 'serif', label: 'Serif (Noto Serif)', sampleClass: 'font-serif' },
]

const THEMES: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Гэрэлтэй' },
  { value: 'dark', label: 'Харанхуй' },
  { value: 'system', label: 'Системийн дагуу' },
]

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings()

  return (
    <div className="mx-auto max-w-2xl px-4 md:px-6 py-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
          >
            ← Нүүр хуудас
          </Link>
        </div>
        <h1 className="text-center mb-2 text-2xl md:text-3xl font-bold text-stone-900 dark:text-stone-100">
          Тохиргоо
        </h1>
        <p className="text-center text-sm text-stone-500 dark:text-stone-400">Settings</p>
      </header>

      <div className="space-y-6">
        {/* Font size */}
        <section
          aria-labelledby="font-size-heading"
          className="rounded-xl bg-white p-6 shadow-sm dark:bg-neutral-900 dark:ring-1 dark:ring-stone-800"
        >
          <h2 id="font-size-heading" className="text-lg font-semibold text-stone-800 dark:text-stone-200 mb-1">
            Үсгийн хэмжээ
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
            Залбирлын бичвэрийн хэмжээ
          </p>
          <div role="radiogroup" aria-labelledby="font-size-heading" className="grid grid-cols-5 gap-2">
            {FONT_SIZES.map(opt => {
              const active = settings.fontSize === opt.value
              return (
                <button
                  key={opt.value}
                  role="radio"
                  aria-checked={active}
                  aria-label={`Үсгийн хэмжээ ${opt.label}`}
                  onClick={() => updateSettings({ fontSize: opt.value })}
                  className={`min-h-[44px] rounded-lg border-2 px-2 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'border-liturgical-green bg-liturgical-green/10 text-liturgical-green dark:border-liturgical-green-dark dark:bg-liturgical-green-dark/10 dark:text-liturgical-green-dark'
                      : 'border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:bg-stone-800'
                  }`}
                >
                  <span style={{ fontSize: `${opt.scaleEm}em` }}>{opt.label}</span>
                </button>
              )
            })}
          </div>
          <p
            aria-hidden="true"
            className="mt-4 rounded-lg bg-stone-50 px-4 py-3 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
          >
            Ave Maria, gratia plena, Dominus tecum.
          </p>
        </section>

        {/* Font family */}
        <section
          aria-labelledby="font-family-heading"
          className="rounded-xl bg-white p-6 shadow-sm dark:bg-neutral-900 dark:ring-1 dark:ring-stone-800"
        >
          <h2 id="font-family-heading" className="text-lg font-semibold text-stone-800 dark:text-stone-200 mb-1">
            Үсгийн хэлбэр
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
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
                    active
                      ? 'border-liturgical-green bg-liturgical-green/10 text-liturgical-green dark:border-liturgical-green-dark dark:bg-liturgical-green-dark/10 dark:text-liturgical-green-dark'
                      : 'border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:bg-stone-800'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </section>

        {/* Theme */}
        <section
          aria-labelledby="theme-heading"
          className="rounded-xl bg-white p-6 shadow-sm dark:bg-neutral-900 dark:ring-1 dark:ring-stone-800"
        >
          <h2 id="theme-heading" className="text-lg font-semibold text-stone-800 dark:text-stone-200 mb-1">
            Горим
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
            Гэрэлтэй, харанхуй, эсвэл системийн сонголт
          </p>
          <div role="radiogroup" aria-labelledby="theme-heading" className="grid grid-cols-3 gap-2">
            {THEMES.map(opt => {
              const active = settings.theme === opt.value
              return (
                <button
                  key={opt.value}
                  role="radio"
                  aria-checked={active}
                  onClick={() => updateSettings({ theme: opt.value })}
                  className={`min-h-[44px] rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'border-liturgical-green bg-liturgical-green/10 text-liturgical-green dark:border-liturgical-green-dark dark:bg-liturgical-green-dark/10 dark:text-liturgical-green-dark'
                      : 'border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:bg-stone-800'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </section>

        {/* Page references toggle */}
        <section
          aria-labelledby="page-refs-heading"
          className="rounded-xl bg-white p-6 shadow-sm dark:bg-neutral-900 dark:ring-1 dark:ring-stone-800"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="page-refs-heading" className="text-lg font-semibold text-stone-800 dark:text-stone-200 mb-1">
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
                  ? 'bg-liturgical-green dark:bg-liturgical-green-dark'
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
      </div>

      <Footer />
    </div>
  )
}
