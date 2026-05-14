'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import type { CelebrationOption } from '@/lib/types'

interface CelebrationPickerProps {
  dateStr: string
  options: CelebrationOption[]
  selectedId: string
  /**
   * FR-145 (#8) — Optional callback that takes over selection handling
   * when the picker is rendered inside the calendar-list inline-expand
   * surface. When omitted, the picker keeps its original behaviour:
   * mutate `/?date=&celebration=` via `router.replace`. When provided,
   * the picker delegates to the callback (URL is not touched) — the
   * caller owns the selection state, typically a React-tree-local
   * `useState` per expanded row.
   */
  onSelectAction?: (id: string) => void
}

export function CelebrationPicker({ dateStr, options, selectedId, onSelectAction }: CelebrationPickerProps) {
  const router = useRouter()

  const handleChange = useCallback(
    (id: string) => {
      if (onSelectAction) {
        onSelectAction(id)
        return
      }
      const params = new URLSearchParams()
      params.set('date', dateStr)
      if (id !== 'default') params.set('celebration', id)
      router.replace(`/?${params.toString()}`, { scroll: false })
    },
    [dateStr, router, onSelectAction],
  )

  if (options.length <= 1) return null

  return (
    <section
      aria-label="Өнөөдрийн сонголтот дурсахуй"
      data-testid="celebration-picker"
      className="mb-6 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-neutral-900"
    >
      <h2 className="mb-3 text-sm font-semibold text-stone-700 dark:text-stone-300">
        Өнөөдрийн залбирлын сонголт
      </h2>
      <div
        role="radiogroup"
        aria-labelledby="celebration-picker-label"
        className="flex flex-col gap-2"
      >
        <span id="celebration-picker-label" className="sr-only">
          Залбирлын сонголт
        </span>
        {options.map((opt) => {
          const isSelected = opt.id === selectedId
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              data-celebration-id={opt.id}
              onClick={() => handleChange(opt.id)}
              className={
                'flex items-start gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors min-h-[44px] ' +
                (isSelected
                  ? 'border-liturgical-gold bg-liturgical-gold/10 text-stone-900 dark:text-stone-100'
                  : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700 dark:border-stone-700 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-stone-300')
              }
            >
              <span
                aria-hidden
                className={
                  'mt-1 h-3 w-3 shrink-0 rounded-full border ' +
                  (isSelected
                    ? 'border-liturgical-gold bg-liturgical-gold'
                    : 'border-stone-400 dark:border-stone-500')
                }
              />
              <span className="flex-1">
                <span className="block font-medium">{opt.nameMn}</span>
                <span className="block text-xs text-stone-500 dark:text-stone-400">
                  {opt.colorMn}
                  {opt.isDefault ? ' · Анхны сонголт' : ''}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
