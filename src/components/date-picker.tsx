'use client'

import { useRouter } from 'next/navigation'

export function DatePicker({ value }: { value: string }) {
  const router = useRouter()

  return (
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
  )
}
