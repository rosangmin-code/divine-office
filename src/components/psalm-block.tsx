import type { AssembledPsalm } from '@/lib/types'
import { PageRef } from './page-ref'

export function PsalmBlock({ psalm }: { psalm: AssembledPsalm }) {
  return (
    <section aria-label={psalm.reference} className="mb-6">
      {/* Antiphon (before) */}
      {psalm.antiphon && (
        <div role="note" className="mb-3 rounded-lg bg-amber-50 px-4 py-2 font-serif text-sm italic text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <span className="font-semibold">Ant. </span>
          {psalm.antiphon}
        </div>
      )}

      {/* Psalm title & reference */}
      <div className="mb-2">
        <span className="text-xs font-medium uppercase tracking-wider text-red-700 dark:text-red-400">
          {psalm.psalmType === 'canticle' ? 'Магтаал дуу' : 'Дуулал'}
        </span>
        <h4 className="text-sm font-semibold text-red-700 dark:text-red-400">
          {psalm.reference} <PageRef page={psalm.page} />
        </h4>
        {psalm.title && (
          <p className="text-xs italic text-stone-500 dark:text-stone-500">{psalm.title}</p>
        )}
      </div>

      {/* Verses */}
      <div className="space-y-1 pl-2">
        {psalm.verses.length > 0 ? (
          psalm.verses.map((v, i) => (
            <p key={i} className="font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200">
              <sup className="mr-1 text-xs text-stone-500 dark:text-stone-500" aria-label={`Ишлэл ${v.verse}`}>{v.verse}</sup>
              {v.text}
            </p>
          ))
        ) : (
          <p role="note" className="text-sm italic text-stone-500 dark:text-stone-500">
            [Орчуулга хийгдэж байна]
          </p>
        )}
      </div>

      {/* Gloria Patri */}
      {psalm.gloriaPatri && (
        <p className="mt-2 font-serif text-sm italic text-stone-500 dark:text-stone-400">
          Эцэг, Хүү, Ариун Сүнсэнд алдар байх болтугай.
        </p>
      )}

      {/* Antiphon (after) */}
      {psalm.antiphon && (
        <div role="note" className="mt-3 rounded-lg bg-amber-50 px-4 py-2 font-serif text-sm italic text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <span className="font-semibold">Ant. </span>
          {psalm.antiphon}
        </div>
      )}
    </section>
  )
}
