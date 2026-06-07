'use client'

import type { AssembledHour, SectionOverride } from '@/lib/types'
import { useSettings } from '@/lib/settings'
import { DirectiveBlock } from './prayer-sections/directive-block'
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

export function getPrayerSectionRenderKey(
  hour: Pick<AssembledHour, 'date' | 'hourType'>,
  section: AssembledHour['sections'][number],
  index: number,
): string | number {
  const isEphemeralCandidateSection =
    (section.type === 'hymn' ||
      section.type === 'marianAntiphon' ||
      section.type === 'gospelCanticle') &&
    Array.isArray(section.candidates) &&
    section.candidates.length > 0

  // FR-168 (GOAL #90 / D2-E5), generalized by WI-83 — candidate
  // dropdown selections are ephemeral client state. Key candidate
  // sections by date + hour so client-side route changes remount them
  // with the new assembler-selected default instead of leaking the
  // previous date's useState selection.
  if (isEphemeralCandidateSection) {
    return `${section.type}-${hour.date}-${hour.hourType}-${index}`
  }

  // Preserve the original gospel-canticle date key for non-candidate
  // entries too. The visible stale-state bug is candidate-specific, but
  // this keeps the existing FR-168 lifecycle surface unchanged.
  if (section.type === 'gospelCanticle') {
    return `gc-${hour.date}-${hour.hourType}-${index}`
  }

  return index
}

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

  // GOAL #48 — hoist the "psalms + canticles borrowed from psalter Week 1
  // Sunday" solemnity notice to the very TOP of the prayer body: after the
  // title header (rendered by the page, outside this component) and BEFORE
  // the first section (УДИРТГАЛ / openingVersicle). On a psalterFrom
  // solemnity (Corpus Christi, Trinity Sunday, Ascension, Pentecost,
  // Christmas, Jan 1 …) the user should be told up-front that the psalmody
  // is borrowed — it is special. The notice is EXACTLY the `bodyInlined`
  // psalmody-`substitute` directive (the only override flag set when a
  // psalmody substitute carries a structured `target.psalterRef` —
  // conditional-rubric-resolver.ts `rubricToOverride`). Note-only
  // substitutes, skip / append / prepend directives, and plain days are
  // NOT hoisted (AC D2 — no section-order regression). PsalmodySection is
  // told to skip re-rendering these (`hoistInlinedSubstituteNote`) so the
  // notice appears exactly once, here at the top.
  //
  // The `psalms.length > 0` gate MIRRORS PsalmodySection's
  // `substituteInlined = substitutes.some(bodyInlined) && hasPsalms`
  // gate (review #48 iter-1 nit): the hoist fires EXACTLY when
  // PsalmodySection would have shown the body + inline note, so the two
  // gates are symmetric. In the defensive edge where a bodyInlined
  // substitute carries zero psalms, the hoist stays out and
  // PsalmodySection falls back to its legacy note-only surface (the note
  // renders once, in-section) — never a double render.
  const hoistedPsalterNotices: SectionOverride[] = hour.sections.flatMap(
    (section) =>
      section.type === 'psalmody' && section.psalms.length > 0
        ? (section.directives ?? []).filter(
            (d) => d.mode === 'substitute' && d.bodyInlined,
          )
        : [],
  )

  return (
    <div>
      {hoistedPsalterNotices.length > 0 && (
        <DirectiveBlock
          directives={hoistedPsalterNotices}
          className="mb-4"
        />
      )}
      {visibleSections.map((section, i) => {
        const showDivider = i > 0
        const spacing =
          i === 0 ? '' : MAJOR_SECTIONS.has(section.type) ? 'mt-6' : 'mt-2'

        const key = getPrayerSectionRenderKey(hour, section, i)

        return (
          <div
            key={key}
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
              <PsalmodySection section={section} hoistInlinedSubstituteNote />
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
