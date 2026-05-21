import type { HourSection } from '@/lib/types'
import { DirectiveBlock, partitionDirectives } from './directive-block'

export function DismissalSection({
  section,
}: {
  section: Extract<HourSection, { type: 'dismissal' }>
}) {
  const { hasSkip, hasSubstitute, prepends, appends, substitutes, skips } =
    partitionDirectives(section.directives)
  const hideBody = hasSkip || hasSubstitute
  return (
    <section aria-label="Төгсгөл" className="mb-4">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400 mb-2">
        Төгсгөл
      </p>

      <DirectiveBlock directives={prepends} />

      {hideBody ? (
        <DirectiveBlock directives={hasSubstitute ? substitutes : skips} />
      ) : (
        <>
          <div className="mb-3">
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-1 italic">
              Санваартан эсвэл тахилч удирдаж байгаа бол:
            </p>
            <p className="font-serif text-stone-800 dark:text-stone-200">
              {section.priest.greeting.versicle}
            </p>
            <p className="font-serif text-stone-800 dark:text-stone-200">
              <span className="text-liturgical-gold dark:text-liturgical-gold-dark">- </span>
              {section.priest.greeting.response}
            </p>
            <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">
              {section.priest.blessing.text}
            </p>
            <p className="font-serif text-stone-800 dark:text-stone-200">
              <span className="text-liturgical-gold dark:text-liturgical-gold-dark">- </span>
              {section.priest.blessing.response}
            </p>
            <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">
              {section.priest.dismissalVersicle.versicle}
            </p>
            <p className="font-serif text-stone-800 dark:text-stone-200">
              <span className="text-liturgical-gold dark:text-liturgical-gold-dark">- </span>
              {section.priest.dismissalVersicle.response}
            </p>
          </div>

          <p className="text-xs text-stone-500 dark:text-stone-400 mb-1 italic">
            Хувийн уншлагын үед:
          </p>
          <p className="font-serif text-stone-800 dark:text-stone-200">
            {section.individual.versicle}
          </p>
          <p className="font-serif text-stone-800 dark:text-stone-200">
            <span className="text-red-700 dark:text-red-400">- </span>
            {section.individual.response}
          </p>
        </>
      )}

      <DirectiveBlock directives={appends} />
    </section>
  )
}
