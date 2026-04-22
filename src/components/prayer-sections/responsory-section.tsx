import type { HourSection } from '@/lib/types'
import { PageRef } from '../page-ref'

const GLORY_BE = 'Эцэг, Хүү, Ариун Сүнсийг магтан дуулъя.'

export function ResponsorySection({
  section,
}: {
  section: Extract<HourSection, { type: 'responsory' }>
}) {
  const { fullResponse, versicle, shortResponse } = section
  // Triduum simplified form: only the antiphon (stored in `versicle`) is rendered.
  const simplified = !fullResponse && !shortResponse && !!versicle

  return (
    <section aria-label="Хариу залбирал" className="mb-4" data-role="responsory">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">
        Хариу залбирал <PageRef page={section.page} />
      </p>

      {simplified ? (
        <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">{versicle}</p>
      ) : (
        <>
          {fullResponse && (
            <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">{fullResponse}</p>
          )}
          {fullResponse && (
            <p className="font-serif text-stone-800 dark:text-stone-200">
              <span className="text-red-700 dark:text-red-400">- </span>
              {fullResponse}
            </p>
          )}
          {versicle && (
            <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">{versicle}</p>
          )}
          {shortResponse && (
            <p className="font-serif text-stone-800 dark:text-stone-200">
              <span className="text-red-700 dark:text-red-400">- </span>
              {shortResponse}
            </p>
          )}
          <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">{GLORY_BE}</p>
          {fullResponse && (
            <p className="font-serif text-stone-800 dark:text-stone-200">
              <span className="text-red-700 dark:text-red-400">- </span>
              {fullResponse}
            </p>
          )}
        </>
      )}
    </section>
  )
}
