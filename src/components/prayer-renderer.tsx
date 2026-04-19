'use client'

import type { AssembledHour } from '@/lib/types'
import { useSettings } from '@/lib/settings'
import { InvitatorySection } from './invitatory-section'
import { OpeningVersicleSection } from './opening-versicle-section'
import { HymnSection } from './hymn-section'
import { MarianAntiphonSection } from './marian-antiphon-section'
import { ConcludingPrayerSection } from './concluding-prayer-section'
import { SectionDivider } from './prayer-sections/section-divider'
import { PsalmodySection } from './prayer-sections/psalmody-section'
import { ShortReadingSection } from './prayer-sections/short-reading-section'
import { ResponsorySection } from './prayer-sections/responsory-section'
import { GospelCanticleSection } from './prayer-sections/gospel-canticle-section'
import { IntercessionsSection } from './prayer-sections/intercessions-section'
import { OurFatherSection } from './prayer-sections/our-father-section'
import { DismissalSection } from './prayer-sections/dismissal-section'
import { ExamenSection } from './prayer-sections/examen-section'
import { BlessingSection } from './prayer-sections/blessing-section'

// Re-export AntiphonBox for existing imports from './prayer-renderer'
export { AntiphonBox } from './prayer-sections/antiphon-box'

const MAJOR_SECTIONS = new Set([
  'psalmody',
  'shortReading',
  'gospelCanticle',
  'intercessions',
  'ourFather',
  'concludingPrayer',
])

export function PrayerRenderer({ hour }: { hour: AssembledHour }) {
  const { settings } = useSettings()

  const visibleSections = hour.sections.filter((section) => {
    if (
      section.type === 'openingVersicle' &&
      section.pairedWithInvitatory &&
      !settings.invitatoryCollapsed
    ) {
      return false
    }
    return true
  })

  return (
    <div>
      {visibleSections.map((section, i) => {
        const showDivider = i > 0
        const spacing =
          i === 0 ? '' : MAJOR_SECTIONS.has(section.type) ? 'mt-6' : 'mt-2'

        return (
          <div
            key={i}
            className={spacing}
            style={{ animation: `fadeIn 0.3s ease-out ${i * 0.05}s both` }}
          >
            {showDivider && <SectionDivider />}
            {section.type === 'invitatory' && (
              <InvitatorySection section={section} />
            )}
            {section.type === 'openingVersicle' && (
              <OpeningVersicleSection section={section} />
            )}
            {section.type === 'hymn' && <HymnSection section={section} />}
            {section.type === 'psalmody' && (
              <PsalmodySection section={section} />
            )}
            {section.type === 'shortReading' && (
              <ShortReadingSection section={section} />
            )}
            {section.type === 'responsory' && (
              <ResponsorySection section={section} />
            )}
            {section.type === 'gospelCanticle' && (
              <GospelCanticleSection section={section} />
            )}
            {section.type === 'intercessions' && (
              <IntercessionsSection section={section} />
            )}
            {section.type === 'ourFather' && <OurFatherSection />}
            {section.type === 'concludingPrayer' && (
              <ConcludingPrayerSection section={section} />
            )}
            {section.type === 'dismissal' && (
              <DismissalSection section={section} />
            )}
            {section.type === 'examen' && <ExamenSection section={section} />}
            {section.type === 'blessing' && (
              <BlessingSection section={section} />
            )}
            {section.type === 'marianAntiphon' && (
              <MarianAntiphonSection section={section} />
            )}
          </div>
        )
      })}
    </div>
  )
}
