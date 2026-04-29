import type { HourSection } from '@/lib/types'
import { PageRef } from '../page-ref'
import { RichContent } from './rich-content'

export function ShortReadingSection({
  section,
}: {
  section: Extract<HourSection, { type: 'shortReading' }>
}) {
  return (
    <section aria-label="Уншлага" className="mb-4">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">
        Уншлага <PageRef page={section.page} />
      </p>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
        {section.bookMn && `${section.bookMn} — `}
        {section.ref}
      </p>
      {section.textRich && section.textRich.blocks.length > 0 ? (
        // FR-161 R-15: 짧은 독서는 산문 — natural flow (사용자 spec).
        <RichContent content={section.textRich} className="mt-2" flow="natural" />
      ) : (
        <div className="mt-2 space-y-1">
          {section.verses.map((v, i) => (
            <p
              key={i}
              className="font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200"
            >
              {v.verse > 0 && (
                <sup className="mr-1 text-xs text-stone-500 dark:text-stone-400">
                  {v.verse}
                </sup>
              )}
              {v.text}
            </p>
          ))}
        </div>
      )}
    </section>
  )
}
