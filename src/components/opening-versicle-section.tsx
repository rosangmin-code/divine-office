'use client'

import type { HourSection } from '@/lib/types'
import { useSettings } from '@/lib/settings'

type OpeningVersicleSectionProps = {
  section: Extract<HourSection, { type: 'openingVersicle' }>
}

export function OpeningVersicleSection({ section }: OpeningVersicleSectionProps) {
  const { settings } = useSettings()

  if (section.pairedWithInvitatory && !settings.invitatoryCollapsed) {
    return null
  }

  return (
    <section aria-label="Удиртгал" className="mb-4">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">Удиртгал</p>
      <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">
        {section.versicle}
      </p>
      <p className="font-serif text-stone-800 dark:text-stone-200">
        <span className="text-red-700 dark:text-red-400">- </span>{section.response}
      </p>
      <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">
        {section.gloryBe}{section.alleluia ? ` ${section.alleluia}` : ''}
      </p>
    </section>
  )
}
