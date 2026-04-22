import type { HourSection } from '../types'
import type { HourAssembler } from './types'
import { buildInvitatory, resolveInvitatoryAntiphon, buildOpeningVersicle, buildDismissal, resolveShortReading, resolveGospelCanticle } from './shared'
import { parseIntercessions } from './intercessions'

export const assembleLauds: HourAssembler = (ctx) => {
  const sections: HourSection[] = []

  // 1. Invitatory OR Opening Versicle — mutually exclusive per GILH §266.
  //    When Lauds is the first hour of the day, include both so the client can
  //    swap between them based on the user's `invitatoryCollapsed` setting
  //    (only one is visible at a time — paired openingVersicle is hidden when
  //    the Invitatory body is expanded).
  if (ctx.isFirstHourOfDay) {
    const antiphon = resolveInvitatoryAntiphon(
      ctx.ordinarium.invitatoryAntiphons,
      ctx.liturgicalDay,
      ctx.dayOfWeek,
      ctx.dateStr,
    )
    sections.push(buildInvitatory(ctx.ordinarium, antiphon))
    sections.push(
      buildOpeningVersicle(ctx.ordinarium, ctx.liturgicalDay.season, {
        pairedWithInvitatory: true,
      }),
    )
  } else {
    sections.push(buildOpeningVersicle(ctx.ordinarium, ctx.liturgicalDay.season))
  }

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
      fullResponse: ctx.mergedPropers.responsory.fullResponse,
      versicle: ctx.mergedPropers.responsory.versicle,
      shortResponse: ctx.mergedPropers.responsory.shortResponse,
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
    const parsed = parseIntercessions(ctx.mergedPropers.intercessions)
    sections.push({
      type: 'intercessions',
      intro: '',
      items: ctx.mergedPropers.intercessions,
      introduction: parsed.introduction,
      refrain: parsed.refrain,
      petitions: parsed.petitions,
      closing: parsed.closing,
      page: ctx.mergedPropers.intercessionsPage,
    })
  }

  // 8. Our Father
  sections.push({ type: 'ourFather' })

  // 9. Concluding Prayer
  if (ctx.mergedPropers.concludingPrayer) {
    sections.push({
      type: 'concludingPrayer',
      text: ctx.mergedPropers.concludingPrayer,
      page: ctx.mergedPropers.concludingPrayerPage,
      alternateText: ctx.mergedPropers.alternativeConcludingPrayer,
    })
  }

  // 10. Dismissal
  sections.push(buildDismissal(ctx.ordinarium))

  return sections
}
