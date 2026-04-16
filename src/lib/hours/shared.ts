import type {
  AssembledPsalm,
  HourSection,
  HourType,
  LiturgicalSeason,
  PsalmEntry,
  DayOfWeek,
  HourPropers,
  LiturgicalDayInfo,
} from '../types'
import type { Ordinarium, InvitatoryAntiphons } from './types'
import { parseScriptureRef } from '../scripture-ref-parser'
import { lookupRef } from '../bible-loader'

import fs from 'fs'
import path from 'path'

// --- JSON file loading & ordinarium cache ---

function loadJsonFile(relativePath: string) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), 'utf-8'))
}

let _ordinarium: Ordinarium | null = null
let _psalterTexts: Record<string, { stanzas: string[][] }> | null = null

function loadPsalterTexts(): Record<string, { stanzas: string[][] }> {
  if (_psalterTexts) return _psalterTexts
  try {
    _psalterTexts = loadJsonFile('src/data/loth/psalter-texts.json')
  } catch {
    _psalterTexts = {}
  }
  return _psalterTexts!
}

export function loadOrdinarium(): Ordinarium {
  if (!_ordinarium) {
    const invData = loadJsonFile('src/data/loth/ordinarium/invitatory.json')
    _ordinarium = {
      invitatory: {
        openingVersicle: invData.openingVersicle,
        invitatoryPsalms: invData.invitatoryPsalms,
        gloryBe: invData.gloryBe,
        rubric: invData.rubric,
      },
      invitatoryAntiphons: loadJsonFile('src/data/loth/ordinarium/invitatory-antiphons.json'),
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
 * Prefers psalter-texts.json (PDF source with stanza structure) over Bible JSONL.
 */
export async function resolvePsalm(
  entry: PsalmEntry,
  antiphonOverrides?: Record<string, string>,
): Promise<AssembledPsalm> {
  const antiphon =
    antiphonOverrides?.[entry.antiphon_key] ??
    entry.default_antiphon ??
    ''

  // Try psalter-texts.json first (has stanza structure from PDF)
  const psalterTexts = loadPsalterTexts()
  const psalmText = psalterTexts[entry.ref]

  if (psalmText && psalmText.stanzas.length > 0) {
    return {
      psalmType: entry.type,
      reference: entry.ref,
      title: entry.title,
      antiphon,
      stanzas: psalmText.stanzas,
      verses: [],
      gloriaPatri: entry.gloria_patri,
      page: entry.page,
    }
  }

  // Fallback: Bible JSONL lookup
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
    page: entry.page,
  }
}

// --- Gospel canticle resolution ---

/**
 * Resolve the gospel canticle (Benedictus, Magnificat, or Nunc Dimittis).
 */
export function resolveGospelCanticle(
  hour: HourType,
  canticlesData: Record<string, { ref: string; titleMn: string; verses?: string[]; doxology?: string }>,
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

  // Prefer pre-loaded verses from canticles.json (PDF source)
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

  // Fallback: Bible JSONL lookup (should not be reached with current data)
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

// --- Opening versicle builder (Deus, in adiutorium) ---

/**
 * Build the "Deus, in adiutorium" opening versicle section.
 * Used at the start of every hour except when the Invitatory is prayed.
 * Alleluia is omitted during Lent.
 */
export function buildOpeningVersicle(ordinarium: Ordinarium, season: LiturgicalSeason): HourSection {
  const ov = ordinarium.commonPrayers.openingVersicle
  return {
    type: 'openingVersicle',
    versicle: ov.versicle,
    response: ov.response,
    gloryBe: ov.gloryBe,
    alleluia: season === 'LENT' ? undefined : ov.alleluia,
  }
}

// --- Dismissal builder ---

/**
 * Build the dismissal section with both priest and individual forms.
 */
export function buildDismissal(ordinarium: Ordinarium): HourSection {
  const d = ordinarium.commonPrayers.dismissal as {
    priest: { greeting: { versicle: string; response: string }; blessing: { text: string; response: string }; dismissalVersicle: { versicle: string; response: string } }
    individual: { versicle: string; response: string }
  }
  return {
    type: 'dismissal',
    priest: d.priest,
    individual: d.individual,
  }
}

// --- Invitatory antiphon resolution ---

/**
 * Resolve the invitatory antiphon based on liturgical day, season, and date.
 */
export function resolveInvitatoryAntiphon(
  antiphons: InvitatoryAntiphons,
  day: LiturgicalDayInfo,
  dayOfWeek: DayOfWeek,
  dateStr: string,
): string {
  const month = parseInt(dateStr.slice(5, 7), 10)
  const dayNum = parseInt(dateStr.slice(8, 10), 10)

  const name = day.name ?? ''

  // Season-specific antiphons
  switch (day.season) {
    case 'ADVENT': {
      if (month === 12 && dayNum === 24) return antiphons.advent.dec24
      if (month === 12 && dayNum >= 17 && dayNum <= 23) return antiphons.advent.dec17_23
      return antiphons.advent.default
    }
    case 'CHRISTMAS': {
      if (name.includes('Ариун угаал') || name.includes('Baptism')) {
        return antiphons.christmas.baptismOfTheLord
      }
      if (name.includes('Ариун Гэр бүл') || name.includes('Holy Family')) {
        return antiphons.christmas.holyFamily
      }
      if (month === 1 && dayNum === 1) return antiphons.christmas.jan1
      if (month === 1 && dayNum >= 6) return antiphons.christmas.afterEpiphany
      return antiphons.christmas.default
    }
    case 'LENT': {
      if (name.includes('Тарчлалтын Баасан') || name.includes('Good Friday')) {
        return antiphons.lent.goodFriday
      }
      if (name.includes('Ариун Бямба') || name.includes('Holy Saturday')) {
        return antiphons.lent.holySaturday
      }
      if (name.includes('Ариун долоо хоног') || name.includes('Holy Week')) {
        return antiphons.lent.holyWeek
      }
      return antiphons.lent.default
    }
    case 'EASTER': {
      if (name.includes('Пэнтикост') || name.includes('Pentecost')) {
        return antiphons.easter.pentecost
      }
      if (name.includes('тэнгэрт заларсан') || name.includes('Ascension')) {
        return antiphons.easter.ascension
      }
      return antiphons.easter.default
    }
    case 'ORDINARY_TIME':
    default: {
      const parity = (day.psalterWeek % 2 === 1) ? 'odd' : 'even'
      return antiphons.ordinaryTime[parity][dayOfWeek] ?? antiphons.ordinaryTime.odd.SUN
    }
  }
}

// --- Invitatory builder ---

/**
 * Build the full invitatory section: opening versicle, antiphon, psalm with stanzas, glory be.
 */
export function buildInvitatory(
  ordinarium: Ordinarium,
  antiphon: string,
): HourSection {
  const psalm = ordinarium.invitatory.invitatoryPsalms[0] // Default: Psalm 95
  return {
    type: 'invitatory',
    versicle: ordinarium.invitatory.openingVersicle.versicle,
    response: ordinarium.invitatory.openingVersicle.response,
    antiphon,
    psalm: {
      ref: psalm.ref,
      title: psalm.title,
      epigraph: psalm.epigraph,
      stanzas: psalm.stanzas,
    },
    gloryBe: ordinarium.invitatory.gloryBe.text,
    rubric: ordinarium.invitatory.rubric,
  }
}
