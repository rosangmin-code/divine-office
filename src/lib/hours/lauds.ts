import type { HourSection } from '../types'
import type { HourAssembler } from './types'
import { buildInvitatory, resolveInvitatoryAntiphon, buildOpeningVersicle, buildDismissal, resolveShortReading, resolveGospelCanticle } from './shared'

export const assembleLauds: HourAssembler = (ctx) => {
  const sections: HourSection[] = []

  // 1. Invitatory — only when Lauds is the first hour of the day
  if (ctx.isFirstHourOfDay) {
    const antiphon = resolveInvitatoryAntiphon(
      ctx.ordinarium.invitatoryAntiphons,
      ctx.liturgicalDay,
      ctx.dayOfWeek,
      ctx.dateStr,
    )
    sections.push(buildInvitatory(ctx.ordinarium, antiphon))
  }

  // 2. Opening Versicle (Удиртгал) — always present at Lauds, after the Invitatory
  sections.push(buildOpeningVersicle(ctx.ordinarium, ctx.liturgicalDay.season))

  // 2. Hymn
  sections.push({ type: 'hymn', text: ctx.mergedPropers.hymn ?? '', page: ctx.mergedPropers.hymnPage, candidates: ctx.hymnCandidates, selectedIndex: ctx.hymnSelectedIndex })

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
      page: ctx.mergedPropers.responsory.page,
    })
  }

  // 6. Gospel Canticle (Benedictus)
  const canticle = resolveGospelCanticle(
    'lauds',
    ctx.ordinarium.canticles,
    ctx.mergedPropers.gospelCanticleAntiphon ?? '',
    ctx.mergedPropers.gospelCanticleAntiphonPage,
  )
  if (canticle) sections.push(canticle)

  // 7. Intercessions
  if (ctx.mergedPropers.intercessions) {
    sections.push({
      type: 'intercessions',
      intro: '',
      items: ctx.mergedPropers.intercessions,
      page: ctx.mergedPropers.intercessionsPage,
    })
  }

  // 8. Our Father
  sections.push({ type: 'ourFather' })

  // 9. Concluding Prayer
  if (ctx.mergedPropers.concludingPrayer) {
    sections.push({ type: 'concludingPrayer', text: ctx.mergedPropers.concludingPrayer, page: ctx.mergedPropers.concludingPrayerPage })
  }

  // 10. Dismissal
  sections.push(buildDismissal(ctx.ordinarium))

  return sections
}
