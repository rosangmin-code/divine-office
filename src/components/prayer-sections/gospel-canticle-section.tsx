import type { HourSection } from '@/lib/types'
import { PageRef } from '../page-ref'
import { AntiphonBox } from './antiphon-box'

const CANTICLE_NAMES: Record<string, string> = {
  benedictus: 'Захариагийн магтаал',
  magnificat: 'Мариагийн магтаал',
  nuncDimittis: 'Сайнмэдээний айлдлын магтаал',
}

export function GospelCanticleSection({
  section,
}: {
  section: Extract<HourSection, { type: 'gospelCanticle' }>
}) {
  const name = CANTICLE_NAMES[section.canticle] ?? section.canticle
  return (
    <section aria-label={name} className="mb-4">
      {/*
        Heading page ref points at the FIXED ordinarium body (`bodyPage`),
        not the daily propers antiphon page. The antiphon page is rendered
        on the AntiphonBox below. This split prevents the long-standing
        confusion where users opened the PDF to e.g. p722 expecting the
        Magnificat body and found only the seasonal antiphon (task #11).
      */}
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">
        {name} <PageRef page={section.bodyPage} />
      </p>

      {section.antiphon && (
        <AntiphonBox
          text={section.antiphon}
          label="canticle"
          page={section.page}
        />
      )}

      {section.verses && section.verses.length > 0 ? (
        <div className="space-y-1 pl-2">
          {section.verses.map((verse, vi) => (
            <p
              key={vi}
              className="font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200"
            >
              {verse}
            </p>
          ))}
          {section.doxology && (
            <p className="mt-2 font-serif text-sm italic text-stone-500 dark:text-stone-400">
              {section.doxology}
            </p>
          )}
        </div>
      ) : section.text ? (
        <div className="space-y-1 pl-2">
          {section.text.split('\n').map((line, li) => (
            <p
              key={li}
              className="font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200"
            >
              {line}
            </p>
          ))}
        </div>
      ) : (
        <p
          className="text-sm italic text-stone-500 dark:text-stone-400"
          role="note"
        >
          [Орчуулга хийгдэж байна]
        </p>
      )}

      {section.antiphon && (
        <AntiphonBox
          text={section.antiphon}
          label="canticle"
          page={section.page}
        />
      )}
    </section>
  )
}
