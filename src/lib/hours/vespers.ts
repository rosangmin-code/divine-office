import type { HourSection } from '../types'
import type { HourAssembler } from './types'
import { buildOpeningVersicle, buildDismissal, resolveShortReading, resolveGospelCanticle, attachSectionDirectives } from './shared'
import { parseIntercessions } from './intercessions'
import { shouldUseAlternateConcludingPrayer, buildConcludingPrayerFields } from './concluding-prayer'

export const assembleVespers: HourAssembler = (ctx) => {
  const sections: HourSection[] = []

  // 1. Opening Versicle (Deus, in adiutorium)
  sections.push(attachSectionDirectives(buildOpeningVersicle(ctx.ordinarium, ctx.liturgicalDay.season), ctx.mergedPropers))

  // 2. Hymn
  sections.push({ type: 'hymn', text: ctx.mergedPropers.hymn ?? '', page: ctx.mergedPropers.hymnPage, candidates: ctx.hymnCandidates, selectedIndex: ctx.hymnSelectedIndex, textRich: ctx.mergedPropers.hymnRich })

  // 2. Psalmody
  if (ctx.assembledPsalms.length > 0) {
    sections.push(attachSectionDirectives({ type: 'psalmody', psalms: ctx.assembledPsalms }, ctx.mergedPropers))
  }

  // 3. Short Reading
  const reading = resolveShortReading(ctx.mergedPropers)
  if (reading) {
    if (ctx.mergedPropers.shortReadingRich) {
      sections.push({ ...reading, textRich: ctx.mergedPropers.shortReadingRich })
    } else {
      sections.push(reading)
    }
  }

  // 4. Responsory
  if (ctx.mergedPropers.responsory) {
    sections.push({
      type: 'responsory',
      fullResponse: ctx.mergedPropers.responsory.fullResponse,
      versicle: ctx.mergedPropers.responsory.versicle,
      shortResponse: ctx.mergedPropers.responsory.shortResponse,
      page: ctx.mergedPropers.responsory.page,
      rich: ctx.mergedPropers.responsoryRich,
    })
  }

  // 5. Gospel Canticle (Magnificat)
  const canticle = resolveGospelCanticle(
    'vespers',
    ctx.ordinarium.canticles,
    ctx.mergedPropers.gospelCanticleAntiphon ?? '',
    ctx.mergedPropers.gospelCanticleAntiphonPage,
    ctx.mergedPropers.gospelCanticleAntiphonRich,
  )
  if (canticle) sections.push(canticle)

  // 6. Intercessions
  if (ctx.mergedPropers.intercessions) {
    const parsed = parseIntercessions(ctx.mergedPropers.intercessions)
    sections.push(attachSectionDirectives({
      type: 'intercessions',
      intro: '',
      items: ctx.mergedPropers.intercessions,
      introduction: parsed.introduction,
      refrain: parsed.refrain,
      petitions: parsed.petitions,
      closing: parsed.closing,
      page: ctx.mergedPropers.intercessionsPage,
      rich: ctx.mergedPropers.intercessionsRich,
    }, ctx.mergedPropers))
  }

  // 7. Our Father
  sections.push({ type: 'ourFather' })

  // 8. Concluding Prayer
  // F-2 (#214) — see compline.ts for the rubric. Vespers shares the same
  // Solemnity-not-on-Sunday auto-swap behavior; helper applies uniformly.
  // #242 F-X5 FU#3 — symmetry with compline.ts (#216 F-2c): use
  // `effectiveLiturgicalDay ?? liturgicalDay` so the legacy
  // FR-156 Sat-vespers eve-of-Solemnity promotion (loth-service.ts
  // L209-280) and the F-X5 firstVespers route (loth-service.ts L307-371)
  // both feed the swap with the celebration's identity. Without this
  // fall-back, eve-promoted vespers would silently lose F-2 alternation
  // when tomorrow is a non-Sunday Solemnity carrying primary+alternate
  // concluding-prayer variants.
  if (ctx.mergedPropers.concludingPrayer || ctx.mergedPropers.concludingPrayerRich) {
    const effectiveDay = ctx.effectiveLiturgicalDay ?? ctx.liturgicalDay
    const swap = shouldUseAlternateConcludingPrayer(effectiveDay, ctx.dayOfWeek)
    const fields = buildConcludingPrayerFields({
      primaryText: ctx.mergedPropers.concludingPrayer,
      primaryRich: ctx.mergedPropers.concludingPrayerRich,
      primaryPage: ctx.mergedPropers.concludingPrayerPage,
      alternateText: ctx.mergedPropers.alternativeConcludingPrayer,
      alternateRich: ctx.mergedPropers.alternativeConcludingPrayerRich,
      alternatePage: ctx.mergedPropers.alternativeConcludingPrayerPage,
    }, swap)
    sections.push({ type: 'concludingPrayer', ...fields })
  }

  // 9. Dismissal
  sections.push(attachSectionDirectives(buildDismissal(ctx.ordinarium), ctx.mergedPropers))

  return sections
}
