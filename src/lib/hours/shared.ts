import type {
  AssembledPsalm,
  HourSection,
  HourType,
  PsalmEntry,
  DayOfWeek,
  HourPropers,
} from '../types'
import type { Ordinarium } from './types'
import { parseScriptureRef } from '../scripture-ref-parser'
import { lookupRef } from '../bible-loader'

import fs from 'fs'
import path from 'path'

// --- JSON file loading & ordinarium cache ---

function loadJsonFile(relativePath: string) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), 'utf-8'))
}

let _ordinarium: Ordinarium | null = null

export function loadOrdinarium(): Ordinarium {
  if (!_ordinarium) {
    _ordinarium = {
      invitatory: loadJsonFile('src/data/loth/ordinarium/invitatory.json'),
      canticles: loadJsonFile('src/data/loth/ordinarium/canticles.json'),
      commonPrayers: loadJsonFile('src/data/loth/ordinarium/common-prayers.json'),
      complineData: loadJsonFile('src/data/loth/ordinarium/compline.json'),
    }
  }
  return _ordinarium
}

// --- Date utility ---

export function dateToDayOfWeek(dateStr: string): DayOfWeek {
  const date = new Date(dateStr + 'T00:00:00Z')
  const dayIndex = date.getUTCDay()
  const days: DayOfWeek[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  return days[dayIndex]
}

// --- Psalm resolution ---

/**
 * Resolve a psalm entry into an AssembledPsalm with actual verse text.
 */
export async function resolvePsalm(
  entry: PsalmEntry,
  antiphonOverrides?: Record<string, string>,
): Promise<AssembledPsalm> {
  const antiphon =
    antiphonOverrides?.[entry.antiphon_key] ??
    entry.default_antiphon ??
    ''

  const refs = parseScriptureRef(entry.ref)
  const allVerses: { verse: number; text: string }[] = []

  for (const ref of refs) {
    const result = lookupRef(ref)
    if (result) {
      allVerses.push(...result.texts)
    }
  }

  return {
    psalmType: entry.type,
    reference: entry.ref,
    title: entry.title,
    antiphon,
    verses: allVerses,
    gloriaPatri: entry.gloria_patri,
  }
}

// --- Gospel canticle resolution ---

/**
 * Resolve the gospel canticle (Benedictus, Magnificat, or Nunc Dimittis).
 */
export function resolveGospelCanticle(
  hour: HourType,
  canticlesData: Record<string, { ref: string; titleMn: string }>,
  antiphon: string,
): HourSection | null {
  let canticleKey: 'benedictus' | 'magnificat' | 'nuncDimittis'

  if (hour === 'lauds') canticleKey = 'benedictus'
  else if (hour === 'vespers') canticleKey = 'magnificat'
  else if (hour === 'compline') canticleKey = 'nuncDimittis'
  else return null

  const canticleInfo = canticlesData[canticleKey]
  if (!canticleInfo) return null

  const refs = parseScriptureRef(canticleInfo.ref)
  let text = ''
  for (const ref of refs) {
    const result = lookupRef(ref)
    if (result) {
      text += result.texts.map((v) => v.text).join(' ')
    }
  }

  return {
    type: 'gospelCanticle',
    canticle: canticleKey,
    antiphon: antiphon || '',
    text,
  }
}

// --- Short reading resolution ---

/**
 * Resolve the short reading from propers into a HourSection.
 */
export function resolveShortReading(propers: HourPropers | null): HourSection | null {
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

  // If direct text is provided, use it instead
  if (propers.shortReading.text) {
    return {
      type: 'shortReading',
      ref: readingRef,
      bookMn,
      verses: [{ verse: 0, text: propers.shortReading.text }],
    }
  }

  if (allVerses.length > 0) {
    return {
      type: 'shortReading',
      ref: readingRef,
      bookMn,
      verses: allVerses,
    }
  }

  return null
}

// --- Invitatory builder ---

/**
 * Build the invitatory section (opening versicle + response).
 */
export function buildInvitatory(ordinarium: Ordinarium): HourSection {
  return {
    type: 'invitatory',
    versicle: ordinarium.invitatory.openingVersicle.versicle,
    response: ordinarium.invitatory.openingVersicle.response,
  }
}
