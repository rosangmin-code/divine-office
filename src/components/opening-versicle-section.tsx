'use client'

import type { HourSection } from '@/lib/types'
import { useSettings } from '@/lib/settings'
import { DirectiveBlock, partitionDirectives } from './prayer-sections/directive-block'

type OpeningVersicleSectionProps = {
  section: Extract<HourSection, { type: 'openingVersicle' }>
}

export function OpeningVersicleSection({ section }: OpeningVersicleSectionProps) {
  const { settings } = useSettings()

  if (section.pairedWithInvitatory && !settings.invitatoryCollapsed) {
    return null
  }

  const { hasSkip, hasSubstitute, prepends, appends, substitutes, skips } =
    partitionDirectives(section.directives)
  const hideBody = hasSkip || hasSubstitute

  return (
    <section aria-label="Удиртгал" className="mb-4">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-liturgical-red dark:text-liturgical-red-dark">Удиртгал</p>
      <DirectiveBlock directives={prepends} />
      {hideBody ? (
        <DirectiveBlock directives={hasSubstitute ? substitutes : skips} />
      ) : (
        <>
          <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">
            {section.versicle}
          </p>
          <p className="font-serif text-stone-800 dark:text-stone-200">
            <span className="text-liturgical-gold dark:text-liturgical-gold-dark">- </span>{section.response}
          </p>
          <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">
            {section.gloryBe}{section.alleluia ? ` ${section.alleluia}` : ''}
          </p>
        </>
      )}
      <DirectiveBlock directives={appends} />
    </section>
  )
}
