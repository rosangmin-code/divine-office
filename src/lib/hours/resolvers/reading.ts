import type { HourSection, HourPropers } from '../../types'
import { parseScriptureRef } from '../../scripture-ref-parser'
import { lookupRef } from '../../bible-loader'

/**
 * Resolve the short reading from propers into a HourSection.
 */
export function resolveShortReading(
  propers: HourPropers | null,
): HourSection | null {
  if (!propers?.shortReading) return null

  const readingRef = propers.shortReading.ref
  const refs = parseScriptureRef(readingRef)
  const allVerses: { verse: number; text: string }[] = []
  let bookMn = ''

  for (const ref of refs) {
    const result = lookupRef(ref)
    if (result) {
      if (!bookMn) bookMn = result.bookMn
      allVerses.push(...result.texts)
    }
  }

  if (propers.shortReading.text) {
    return {
      type: 'shortReading',
      ref: readingRef,
      bookMn,
      verses: [{ verse: 0, text: propers.shortReading.text }],
      page: propers.shortReading.page,
    }
  }

  if (allVerses.length > 0) {
    return {
      type: 'shortReading',
      ref: readingRef,
      bookMn,
      verses: allVerses,
      page: propers.shortReading.page,
    }
  }

  return null
}
