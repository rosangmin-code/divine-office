import type { AssembledPsalm } from '@/lib/types'
import { PageRef } from './page-ref'
import { AntiphonBox } from './prayer-renderer'

export function PsalmBlock({ psalm, antiphonNumber }: { psalm: AssembledPsalm; antiphonNumber?: number }) {
  return (
    <section aria-label={psalm.reference} className="mb-6">
      {/* Antiphon (before) */}
      {psalm.antiphon && <AntiphonBox text={psalm.antiphon} label={psalm.psalmType === 'canticle' ? 'canticle' : 'psalm'} number={antiphonNumber} page={psalm.page} className="mb-3" />}

      {/* Psalm title & reference */}
      <div className="mb-2">
        <span className="text-xs font-medium uppercase tracking-wider text-red-700 dark:text-red-400">
          {psalm.psalmType === 'canticle' ? 'Магтуу' : 'Дуулал'}
        </span>
        <h4 className="text-sm font-semibold text-red-700 dark:text-red-400">
          {psalm.reference} <PageRef page={psalm.page} />
        </h4>
        {psalm.title && (
          <p className="text-xs italic text-stone-500 dark:text-stone-500">{psalm.title}</p>
        )}
      </div>

      {/* Stanzas (PDF source) or Verses (fallback) */}
      {psalm.stanzas && psalm.stanzas.length > 0 ? (
        <div className="space-y-5 pl-3 md:space-y-4 md:pl-2">
          {psalm.stanzas.map((stanza, si) => (
            <p key={si} className="whitespace-pre-line font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200">
              {stanza.map((line, li) => (
                <span key={li} className="block">{line}</span>
              ))}
            </p>
          ))}
        </div>
      ) : psalm.verses.length > 0 ? (
        <div className="space-y-1 pl-3 md:pl-2">
          {psalm.verses.map((v, i) => (
            <p key={i} className="whitespace-pre-line font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200">
              <sup className="mr-1 text-xs text-stone-500 dark:text-stone-500" aria-label={`Ишлэл ${v.verse}`}>{v.verse}</sup>
              {v.text}
            </p>
          ))}
        </div>
      ) : (
        <div className="pl-3 md:pl-2">
          <p role="note" className="text-sm italic text-stone-500 dark:text-stone-500">
            [Орчуулга хийгдэж байна]
          </p>
        </div>
      )}

      {/* Gloria Patri */}
      {psalm.gloriaPatri ? (
        <p className="mt-2 font-serif text-sm italic text-stone-500 dark:text-stone-400">
          Эцэг, Хүү, Ариун Сүнсэнд жавхланг Эхэн цагт байсан мэт аливаа цагт болготугай. Амэн.
        </p>
      ) : psalm.gloriaPatri === false && (
        <p className="mt-2 text-xs italic text-red-700/80 dark:text-red-400/80">
          Эцэг, Хүү, Ариун Сүнсэнд жавхланг... уншихгүй
        </p>
      )}

      {/* Psalm-concluding prayer (Дууллыг төгсгөх залбирал) */}
      {psalm.psalmPrayer && (
        <div data-role="psalm-prayer" className="mt-3">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">Дууллыг төгсгөх залбирал</p>
          <p className="mt-1 font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200">
            {psalm.psalmPrayer}
          </p>
        </div>
      )}

      {/* Antiphon (after) */}
      {psalm.antiphon && <AntiphonBox text={psalm.antiphon} label={psalm.psalmType === 'canticle' ? 'canticle' : 'psalm'} number={antiphonNumber} page={psalm.page} className="mt-3" />}
    </section>
  )
}
