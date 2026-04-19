import type { HourSection } from '@/lib/types'
import { PageRef } from '../page-ref'

export function ExamenSection({
  section,
}: {
  section: Extract<HourSection, { type: 'examen' }>
}) {
  return (
    <section aria-label="Ухамсрын цэгнүүр" className="mb-4">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">
        Ухамсрын цэгнүүр <PageRef page={section.page} />
      </p>
      <p className="mt-2 font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200">
        {section.text}
      </p>
    </section>
  )
}
