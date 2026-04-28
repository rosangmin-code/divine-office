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
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">Удиртгал</p>
      <DirectiveBlock directives={prepends} />
      {hideBody ? (
        <DirectiveBlock directives={hasSubstitute ? substitutes : skips} />
      ) : (
        <>
          <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">
            {section.versicle}
          </p>
          <p className="font-serif text-stone-800 dark:text-stone-200">
            <span className="text-red-700 dark:text-red-400">- </span>{section.response}
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
