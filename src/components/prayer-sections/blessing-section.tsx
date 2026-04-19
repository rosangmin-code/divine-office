import type { HourSection } from '@/lib/types'
import { PageRef } from '../page-ref'

export function BlessingSection({
  section,
}: {
  section: Extract<HourSection, { type: 'blessing' }>
}) {
  return (
    <section aria-label="Адислал" className="mb-4">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">
        Адислал <PageRef page={section.page} />
      </p>
      <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">
        {section.text}
      </p>
      <p className="font-serif text-stone-800 dark:text-stone-200">
        <span className="text-red-700 dark:text-red-400">- </span>
        {section.response}
      </p>
    </section>
  )
}
