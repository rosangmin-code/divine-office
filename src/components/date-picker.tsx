'use client'

import { useRouter } from 'next/navigation'

export function DatePicker({ value, todayStr }: { value: string; todayStr: string }) {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        type="date"
        value={value}
        onChange={(e) => {
          if (e.target.value) {
            router.push(`/?date=${e.target.value}`)
          }
        }}
        aria-label="Огноо сонгох"
        className="min-h-[44px] rounded-lg border border-stone-300 bg-white px-4 py-2 text-center text-stone-800 transition-colors [color-scheme:light] dark:border-stone-600 dark:bg-neutral-800 dark:text-stone-200 dark:[color-scheme:dark]"
      />
      {value !== todayStr && (
        <button
          type="button"
          onClick={() => router.push(`/?date=${todayStr}`)}
          className="text-xs px-3 py-1 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors"
        >
          Өнөөдөр
        </button>
      )}
    </div>
  )
}
