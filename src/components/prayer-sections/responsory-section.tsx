import type { HourSection } from '@/lib/types'
import { PageRef } from '../page-ref'

export function ResponsorySection({
  section,
}: {
  section: Extract<HourSection, { type: 'responsory' }>
}) {
  return (
    <section aria-label="Хариу залбирал" className="mb-4">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">
        Хариу залбирал <PageRef page={section.page} />
      </p>
      <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">
        {section.versicle}
      </p>
      <p className="font-serif text-stone-800 dark:text-stone-200">
        <span className="text-red-700 dark:text-red-400">- </span>
        {section.response}
      </p>
    </section>
  )
}
