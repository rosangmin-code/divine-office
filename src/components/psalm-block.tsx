import type { AssembledPsalm } from '@/lib/types'

export function PsalmBlock({ psalm }: { psalm: AssembledPsalm }) {
  return (
    <div className="mb-6">
      {/* Antiphon (before) */}
      {psalm.antiphon && (
        <div className="mb-3 rounded-lg bg-amber-50 px-4 py-2 text-sm italic text-amber-900">
          <span className="font-semibold">Ant. </span>
          {psalm.antiphon}
        </div>
      )}

      {/* Psalm title & reference */}
      <div className="mb-2">
        <span className="text-xs font-medium uppercase tracking-wider text-stone-400">
          {psalm.psalmType === 'canticle' ? 'Дуулал' : 'Дуулал'}
        </span>
        <h4 className="text-sm font-semibold text-stone-600">
          {psalm.reference}
        </h4>
        {psalm.title && (
          <p className="text-xs italic text-stone-400">{psalm.title}</p>
        )}
      </div>

      {/* Verses */}
      <div className="space-y-1 pl-2">
        {psalm.verses.length > 0 ? (
          psalm.verses.map((v, i) => (
            <p key={i} className="text-base leading-relaxed text-stone-800">
              <sup className="mr-1 text-xs text-stone-400">{v.verse}</sup>
              {v.text}
            </p>
          ))
        ) : (
          <p className="text-sm italic text-stone-400">
            [Орчуулга хийгдэж байна]
          </p>
        )}
      </div>

      {/* Gloria Patri */}
      {psalm.gloriaPatri && (
        <p className="mt-2 text-sm italic text-stone-500">
          Эцэг, Хүү, Ариун Сүнсэнд алдар байх болтугай.
        </p>
      )}

      {/* Antiphon (after) */}
      {psalm.antiphon && (
        <div className="mt-3 rounded-lg bg-amber-50 px-4 py-2 text-sm italic text-amber-900">
          <span className="font-semibold">Ant. </span>
          {psalm.antiphon}
        </div>
      )}
    </div>
  )
}
