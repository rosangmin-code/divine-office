import type { HourSection } from '../types'
import type { HourAssembler } from './types'
import { buildInvitatory, resolveShortReading, resolveGospelCanticle } from './shared'

export const assembleLauds: HourAssembler = (ctx) => {
  const sections: HourSection[] = []

  // 1. Invitatory (only for the first hour of the day)
  if (ctx.isFirstHourOfDay) {
    sections.push(buildInvitatory(ctx.ordinarium))
  }

  // 2. Hymn
  sections.push({ type: 'hymn', text: ctx.mergedPropers.hymn ?? '' })

  // 3. Psalmody
  if (ctx.assembledPsalms.length > 0) {
    sections.push({ type: 'psalmody', psalms: ctx.assembledPsalms })
  }

  // 4. Short Reading
  const reading = resolveShortReading(ctx.mergedPropers)
  if (reading) sections.push(reading)

  // 5. Responsory
  if (ctx.mergedPropers.responsory) {
    sections.push({
      type: 'responsory',
      versicle: ctx.mergedPropers.responsory.versicle,
      response: ctx.mergedPropers.responsory.response,
    })
  }

  // 6. Gospel Canticle (Benedictus)
  const canticle = resolveGospelCanticle(
    'lauds',
    ctx.ordinarium.canticles,
    ctx.mergedPropers.gospelCanticleAntiphon ?? '',
  )
  if (canticle) sections.push(canticle)

  // 7. Intercessions
  if (ctx.mergedPropers.intercessions) {
    sections.push({
      type: 'intercessions',
      intro: '',
      items: ctx.mergedPropers.intercessions,
    })
  }

  // 8. Our Father
  sections.push({ type: 'ourFather' })

  // 9. Concluding Prayer
  if (ctx.mergedPropers.concludingPrayer) {
    sections.push({ type: 'concludingPrayer', text: ctx.mergedPropers.concludingPrayer })
  }

  // 10. Dismissal
  sections.push({ type: 'dismissal' })

  return sections
}
