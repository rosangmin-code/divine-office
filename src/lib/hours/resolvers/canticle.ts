import type { HourSection, HourType } from '../../types'
import { parseScriptureRef } from '../../scripture-ref-parser'
import { lookupRef } from '../../bible-loader'

/**
 * Resolve the gospel canticle (Benedictus, Magnificat, or Nunc Dimittis).
 */
export function resolveGospelCanticle(
  hour: HourType,
  canticlesData: Record<
    string,
    { ref: string; titleMn: string; verses?: string[]; doxology?: string; page?: number }
  >,
  antiphon: string,
  page?: number,
): HourSection | null {
  let canticleKey: 'benedictus' | 'magnificat' | 'nuncDimittis'

  if (hour === 'lauds') canticleKey = 'benedictus'
  else if (hour === 'vespers') canticleKey = 'magnificat'
  else if (hour === 'compline') canticleKey = 'nuncDimittis'
  else return null

  const canticleInfo = canticlesData[canticleKey]
  if (!canticleInfo) return null

  // `page` is the seasonal antiphon page (from propers); `bodyPage` is the
  // fixed ordinarium page where the canticle verses are printed (same every
  // day). Prior to this split, `page` alone was attached to the canticle
  // heading in the UI, which made it look as though the Magnificat body was
  // printed on the daily propers page. See task #11.
  const bodyPage = typeof canticleInfo.page === 'number' ? canticleInfo.page : undefined

  if (canticleInfo.verses && canticleInfo.verses.length > 0) {
    return {
      type: 'gospelCanticle',
      canticle: canticleKey,
      antiphon: antiphon || '',
      text: canticleInfo.verses.join('\n'),
      verses: canticleInfo.verses,
      doxology: canticleInfo.doxology,
      page,
      bodyPage,
    }
  }

  const refs = parseScriptureRef(canticleInfo.ref)
  let text = ''
  for (const ref of refs) {
    const result = lookupRef(ref)
    if (result) {
      text += result.texts.map((v) => v.text).join('\n')
    }
  }

  return {
    type: 'gospelCanticle',
    canticle: canticleKey,
    antiphon: antiphon || '',
    text,
    page,
    bodyPage,
  }
}
