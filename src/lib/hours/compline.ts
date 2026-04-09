import type { HourSection, HourPropers } from '../types'
import type { ComplineData } from '../psalter-loader'
import type { HourAssembler } from './types'
import { resolveShortReading, resolveGospelCanticle } from './shared'

/**
 * Merge compline-specific defaults from complineData into propers
 * when not already overridden by season or sanctoral propers.
 */
export function mergeComplineDefaults(
  mergedPropers: HourPropers,
  complineData: ComplineData,
): HourPropers {
  const result = { ...mergedPropers }

  if (!result.shortReading && complineData.shortReading) {
    result.shortReading = complineData.shortReading
  }
  if (!result.responsory && complineData.responsory) {
    result.responsory = complineData.responsory
  }
  if (!result.gospelCanticleAntiphon && complineData.nuncDimittisAntiphon) {
    result.gospelCanticleAntiphon = complineData.nuncDimittisAntiphon
  }
  if (!result.concludingPrayer && complineData.concludingPrayer) {
    result.concludingPrayer = complineData.concludingPrayer.primary
  }

  return result
}

export const assembleCompline: HourAssembler = (ctx) => {
  const sections: HourSection[] = []

  // 1. Examen of Conscience
  if (ctx.complineData?.examen) {
    sections.push({ type: 'examen', text: ctx.complineData.examen })
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

  // 6. Gospel Canticle (Nunc Dimittis)
  const canticle = resolveGospelCanticle(
    'compline',
    ctx.ordinarium.canticles,
    ctx.mergedPropers.gospelCanticleAntiphon ?? '',
  )
  if (canticle) sections.push(canticle)

  // 7. Concluding Prayer
  if (ctx.mergedPropers.concludingPrayer) {
    sections.push({ type: 'concludingPrayer', text: ctx.mergedPropers.concludingPrayer })
  }

  // 8. Blessing
  if (ctx.complineData?.blessing) {
    sections.push({
      type: 'blessing',
      text: ctx.complineData.blessing.text,
      response: ctx.complineData.blessing.response,
    })
  }

  // 9. Marian Antiphon
  if (ctx.complineData?.marianAntiphon && ctx.complineData.marianAntiphon.length > 0) {
    const marian = ctx.complineData.marianAntiphon[0]
    sections.push({
      type: 'marianAntiphon',
      title: marian.title,
      text: marian.text,
    })
  }

  return sections
}
