import type { HourSection } from '../types'
import type { HourAssembler } from './types'
import { buildInvitatory, resolveInvitatoryAntiphon, buildOpeningVersicle, buildDismissal, resolveShortReading, resolveGospelCanticle } from './shared'
import { parseIntercessions } from './intercessions'
import { attachSectionDirectives } from './shared'
import { shouldUseAlternateConcludingPrayer, buildConcludingPrayerFields } from './concluding-prayer'

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
    sections.push(attachSectionDirectives(buildInvitatory(ctx.ordinarium, antiphon), ctx.mergedPropers))
    sections.push(
      attachSectionDirectives(
        buildOpeningVersicle(ctx.ordinarium, ctx.liturgicalDay.season, {
          pairedWithInvitatory: true,
        }),
        ctx.mergedPropers,
      ),
    )
  } else {
    sections.push(attachSectionDirectives(buildOpeningVersicle(ctx.ordinarium, ctx.liturgicalDay.season), ctx.mergedPropers))
  }

  // 2. Hymn
  sections.push({ type: 'hymn', text: ctx.mergedPropers.hymn ?? '', page: ctx.mergedPropers.hymnPage, candidates: ctx.hymnCandidates, selectedIndex: ctx.hymnSelectedIndex, textRich: ctx.mergedPropers.hymnRich })

  // 3. Psalmody
  if (ctx.assembledPsalms.length > 0) {
    sections.push(attachSectionDirectives({ type: 'psalmody', psalms: ctx.assembledPsalms }, ctx.mergedPropers))
  }

  // 4. Short Reading
  const reading = resolveShortReading(ctx.mergedPropers)
  if (reading) {
    if (ctx.mergedPropers.shortReadingRich) {
      sections.push({ ...reading, textRich: ctx.mergedPropers.shortReadingRich })
    } else {
      sections.push(reading)
    }
  }

  // 5. Responsory
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

  // 6. Gospel Canticle (Benedictus)
  const canticle = resolveGospelCanticle(
    'lauds',
    ctx.ordinarium.canticles,
    ctx.mergedPropers.gospelCanticleAntiphon ?? '',
    ctx.mergedPropers.gospelCanticleAntiphonPage,
    ctx.mergedPropers.gospelCanticleAntiphonRich,
  )
  if (canticle) sections.push(canticle)

  // 7. Intercessions
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

  // 8. Our Father
  sections.push({ type: 'ourFather' })

  // 9. Concluding Prayer
  // F-2 (#214) — see compline.ts for the rubric. Lauds shares the same
  // Solemnity-not-on-Sunday auto-swap behavior; helper applies uniformly.
  // #242 F-X5 FU#3 — symmetry with compline.ts (#216 F-2c): use
  // `effectiveLiturgicalDay ?? liturgicalDay` so a future identity
  // promotion (FR-156 / Q4=P) feeds the swap with the celebration's
  // rank rather than the eve weekday's. Today no path promotes
  // effectiveLiturgicalDay for lauds (lauds is morning prayer — no
  // eve-shifting), so the fall-back makes this a behavior-equivalent
  // refactor for current callers and a forward guarantee for any
  // future eve-promotion of lauds.
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

  // 10. Dismissal
  sections.push(attachSectionDirectives(buildDismissal(ctx.ordinarium), ctx.mergedPropers))

  return sections
}
