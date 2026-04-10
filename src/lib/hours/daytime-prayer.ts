import type { HourSection } from '../types'
import type { HourAssembler } from './types'
import { resolveShortReading } from './shared'

/**
 * Assembler for Terce, Sext, and None (daytime prayers).
 * These three hours share an identical structure.
 */
export const assembleDaytimePrayer: HourAssembler = (ctx) => {
  const sections: HourSection[] = []

  // 1. Hymn
  sections.push({ type: 'hymn', text: ctx.mergedPropers.hymn ?? '', page: ctx.mergedPropers.hymnPage })

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

  // 5. Concluding Prayer
  if (ctx.mergedPropers.concludingPrayer) {
    sections.push({ type: 'concludingPrayer', text: ctx.mergedPropers.concludingPrayer, page: ctx.mergedPropers.concludingPrayerPage })
  }

  // 6. Dismissal
  sections.push({ type: 'dismissal' })

  return sections
}
