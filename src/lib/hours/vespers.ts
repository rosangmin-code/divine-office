import type { HourSection } from '../types'
import type { HourAssembler } from './types'
import { buildOpeningVersicle, buildDismissal, resolveShortReading, resolveGospelCanticle } from './shared'

export const assembleVespers: HourAssembler = (ctx) => {
  const sections: HourSection[] = []

  // 1. Opening Versicle (Deus, in adiutorium)
  sections.push(buildOpeningVersicle(ctx.ordinarium, ctx.liturgicalDay.season))

  // 2. Hymn
  sections.push({ type: 'hymn', text: ctx.mergedPropers.hymn ?? '', page: ctx.mergedPropers.hymnPage, candidates: ctx.hymnCandidates, selectedIndex: ctx.hymnSelectedIndex })

  // 2. Psalmody
  if (ctx.assembledPsalms.length > 0) {
    sections.push({ type: 'psalmody', psalms: ctx.assembledPsalms })
  }

  // 3. Short Reading
  const reading = resolveShortReading(ctx.mergedPropers)
  if (reading) sections.push(reading)

  // 4. Responsory
  if (ctx.mergedPropers.responsory) {
    sections.push({
      type: 'responsory',
      versicle: ctx.mergedPropers.responsory.versicle,
      response: ctx.mergedPropers.responsory.response,
      page: ctx.mergedPropers.responsory.page,
    })
  }

  // 5. Gospel Canticle (Magnificat)
  const canticle = resolveGospelCanticle(
    'vespers',
    ctx.ordinarium.canticles,
    ctx.mergedPropers.gospelCanticleAntiphon ?? '',
    ctx.mergedPropers.gospelCanticleAntiphonPage,
  )
  if (canticle) sections.push(canticle)

  // 6. Intercessions
  if (ctx.mergedPropers.intercessions) {
    sections.push({
      type: 'intercessions',
      intro: '',
      items: ctx.mergedPropers.intercessions,
      page: ctx.mergedPropers.intercessionsPage,
    })
  }

  // 7. Our Father
  sections.push({ type: 'ourFather' })

  // 8. Concluding Prayer
  if (ctx.mergedPropers.concludingPrayer) {
    sections.push({
      type: 'concludingPrayer',
      text: ctx.mergedPropers.concludingPrayer,
      page: ctx.mergedPropers.concludingPrayerPage,
      alternateText: ctx.mergedPropers.alternativeConcludingPrayer,
    })
  }

  // 9. Dismissal
  sections.push(buildDismissal(ctx.ordinarium))

  return sections
}
