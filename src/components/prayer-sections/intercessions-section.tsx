import type { HourSection } from '@/lib/types'
import { PageRef } from '../page-ref'

export function IntercessionsSection({
  section,
}: {
  section: Extract<HourSection, { type: 'intercessions' }>
}) {
  if (section.items.length === 0) {
    return (
      <section aria-label="Гуйлтын залбирал" className="mb-4">
        <p className="text-sm font-semibold text-red-700 dark:text-red-400">
          Гуйлтын залбирал
        </p>
        <p
          className="mt-1 text-sm italic text-stone-500 dark:text-stone-400"
          role="note"
        >
          [Орчуулга хийгдэж байна]
        </p>
      </section>
    )
  }

  const petitions = section.petitions ?? []
  const structured = petitions.length > 0

  return (
    <section aria-label="Гуйлтын залбирал" className="mb-4">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">
        Гуйлтын залбирал <PageRef page={section.page} />
      </p>

      {structured ? (
        <>
          {section.introduction && (
            <p className="mt-3 font-serif text-stone-800 dark:text-stone-200">
              {section.introduction}
            </p>
          )}
          {section.refrain && (
            <p
              data-role="intercessions-refrain"
              className="mt-3 rounded-md bg-amber-50/60 px-3 py-2 font-serif italic text-stone-800 dark:bg-stone-800/50 dark:text-stone-200"
            >
              {section.refrain}
            </p>
          )}
          <ul className="mt-3 space-y-3">
            {petitions.map((p, i) => (
              <li
                key={i}
                data-role="intercessions-petition"
                className="font-serif text-stone-800 dark:text-stone-200"
              >
                <div>{p.versicle}</div>
                {p.response && (
                  <div data-role="intercessions-response" className="mt-1">
                    <span className="text-red-700 dark:text-red-400">- </span>
                    {p.response}
                  </div>
                )}
              </li>
            ))}
          </ul>
          {section.closing && (
            <p className="mt-3 font-serif italic text-stone-700 dark:text-stone-300">
              «{section.closing}»
            </p>
          )}
        </>
      ) : (
        <>
          {section.intro && (
            <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">
              {section.intro}
            </p>
          )}
          <ul className="mt-2 space-y-2">
            {section.items.map((item, i) => (
              <li
                key={i}
                className="font-serif text-stone-800 dark:text-stone-200"
              >
                — {item}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
