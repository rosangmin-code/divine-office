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
    { ref: string; titleMn: string; verses?: string[]; doxology?: string }
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

  if (canticleInfo.verses && canticleInfo.verses.length > 0) {
    return {
      type: 'gospelCanticle',
      canticle: canticleKey,
      antiphon: antiphon || '',
      text: canticleInfo.verses.join('\n'),
      verses: canticleInfo.verses,
      doxology: canticleInfo.doxology,
      page,
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
  }
}
