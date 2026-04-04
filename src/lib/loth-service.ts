import type {
  HourType,
  DayOfWeek,
  LiturgicalDayInfo,
  AssembledHour,
  AssembledPsalm,
  HourSection,
  PsalmEntry,
  HourPropers,
  HourPsalmody,
  HOUR_NAMES_MN,
} from './types'
import { HOUR_NAMES_MN as hourNamesMn } from './types'
import { getLiturgicalDay, getToday } from './calendar'
import { getPsalterPsalmody, getComplinePsalmody } from './psalter-loader'
import { getSeasonHourPropers, getSanctoralPropers } from './propers-loader'
import { parseScriptureRef } from './scripture-ref-parser'
import { lookupRef } from './bible-loader'

import fs from 'fs'
import path from 'path'

// Load ordinarium data
function loadJsonFile(relativePath: string) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), 'utf-8'))
}

let _ordinarium: ReturnType<typeof _loadOrdinarium> | null = null
function _loadOrdinarium() {
  const invitatory = loadJsonFile('src/data/loth/ordinarium/invitatory.json')
  const canticles = loadJsonFile('src/data/loth/ordinarium/canticles.json')
  const commonPrayers = loadJsonFile('src/data/loth/ordinarium/common-prayers.json')
  const complineData = loadJsonFile('src/data/loth/ordinarium/compline.json')
  return { invitatory, canticles, commonPrayers, complineData }
}
function loadOrdinarium() {
  if (!_ordinarium) _ordinarium = _loadOrdinarium()
  return _ordinarium
}

function dateToDayOfWeek(dateStr: string): DayOfWeek {
  const date = new Date(dateStr + 'T00:00:00Z')
  const dayIndex = date.getUTCDay()
  const days: DayOfWeek[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  return days[dayIndex]
}

/**
 * Resolve a psalm entry into an AssembledPsalm with actual verse text.
 */
async function resolvePsalm(
  entry: PsalmEntry,
  antiphonOverrides?: Record<string, string>,
): Promise<AssembledPsalm> {
  // Determine final antiphon: override > default > placeholder
  const antiphon =
    antiphonOverrides?.[entry.antiphon_key] ??
    entry.default_antiphon ??
    ''

  // Parse and look up the scripture reference
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
    gloriaPari: entry.gloria_patri,
  }
}

/**
 * Resolve the gospel canticle (Benedictus, Magnificat, or Nunc Dimittis).
 */
function resolveGospelCanticle(
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

  // Resolve the canticle text from Bible
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

/**
 * Build the complete list of sections for a given hour.
 */
function buildSections(
  hour: HourType,
  assembledPsalms: AssembledPsalm[],
  propers: HourPropers | null,
  ordinarium: ReturnType<typeof loadOrdinarium>,
  isFirstHourOfDay: boolean,
): HourSection[] {
  const sections: HourSection[] = []

  // 1. Invitatory (only for the first hour of the day, typically Lauds or Office of Readings)
  if (isFirstHourOfDay) {
    sections.push({
      type: 'invitatory',
      versicle: ordinarium.invitatory.openingVersicle.versicle,
      response: ordinarium.invitatory.openingVersicle.response,
    })
  }

  // 2. Hymn
  const hymnText = propers?.hymn ?? ''
  sections.push({
    type: 'hymn',
    text: hymnText,
  })

  // 3. Psalmody
  if (assembledPsalms.length > 0) {
    sections.push({
      type: 'psalmody',
      psalms: assembledPsalms,
    })
  }

  // 4. Short Reading
  if (propers?.shortReading) {
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
      sections.push({
        type: 'shortReading',
        ref: readingRef,
        bookMn,
        verses: [{ verse: 0, text: propers.shortReading.text }],
      })
    } else if (allVerses.length > 0) {
      sections.push({
        type: 'shortReading',
        ref: readingRef,
        bookMn,
        verses: allVerses,
      })
    }
  }

  // 5. Responsory
  if (propers?.responsory) {
    sections.push({
      type: 'responsory',
      versicle: propers.responsory.versicle,
      response: propers.responsory.response,
    })
  }

  // 6. Gospel Canticle (Lauds, Vespers, Compline only)
  if (hour === 'lauds' || hour === 'vespers' || hour === 'compline') {
    const canticle = resolveGospelCanticle(
      hour,
      ordinarium.canticles,
      propers?.gospelCanticleAntiphon ?? '',
    )
    if (canticle) sections.push(canticle)
  }

  // 7. Intercessions (Lauds and Vespers only)
  if ((hour === 'lauds' || hour === 'vespers') && propers?.intercessions) {
    sections.push({
      type: 'intercessions',
      intro: '',
      items: propers.intercessions,
    })
  }

  // 8. Our Father (Lauds and Vespers only)
  if (hour === 'lauds' || hour === 'vespers') {
    sections.push({ type: 'ourFather' })
  }

  // 9. Concluding Prayer
  if (propers?.concludingPrayer) {
    sections.push({
      type: 'concludingPrayer',
      text: propers.concludingPrayer,
    })
  }

  // 10. Dismissal
  sections.push({ type: 'dismissal' })

  return sections
}

/**
 * Main assembly function: given a date and hour, produce the complete prayer.
 */
export async function assembleHour(
  dateStr: string,
  hour: HourType,
): Promise<AssembledHour | null> {
  // 1. Get liturgical day info
  const day = getLiturgicalDay(dateStr)
  if (!day) return null

  const dayOfWeek = dateToDayOfWeek(dateStr)
  const ordinarium = loadOrdinarium()

  // 2. Get base psalmody from 4-week psalter
  let psalmEntries: PsalmEntry[] = []

  if (hour === 'compline') {
    psalmEntries = getComplinePsalmody(dayOfWeek)
  } else {
    const basePsalmody = getPsalterPsalmody(day.psalterWeek, dayOfWeek, hour)
    psalmEntries = basePsalmody?.psalms ?? []
  }

  // 3. Get season propers
  const seasonPropers = getSeasonHourPropers(
    day.season,
    day.weekOfSeason,
    dayOfWeek,
    hour,
    dateStr,
  )

  // 4. Get sanctoral propers (if applicable)
  // Use date-based key (MM-DD) to match sanctoral JSON data
  const dateObj = new Date(dateStr + 'T00:00:00Z')
  const dateKey = `${String(dateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(dateObj.getUTCDate()).padStart(2, '0')}`
  const sanctoral = (day.rank === 'SOLEMNITY' || day.rank === 'FEAST' || day.rank === 'MEMORIAL')
    ? getSanctoralPropers(dateKey)
    : null

  // 5. Determine antiphon overrides (sanctoral > season)
  const hourPropers = sanctoral?.[hour as keyof typeof sanctoral] as HourPropers | undefined
  const antiphonOverrides: Record<string, string> = {
    ...(seasonPropers?.antiphons ?? {}),
    ...(hourPropers?.antiphons ?? {}),
  }

  // 6. Check if sanctoral replaces psalter entirely
  if (sanctoral?.replacesPsalter && sanctoral.properPsalmody) {
    const properPsalmody = sanctoral.properPsalmody[hour as keyof typeof sanctoral.properPsalmody] as HourPsalmody | undefined
    if (properPsalmody) {
      psalmEntries = properPsalmody.psalms
    }
  }

  // 7. Resolve psalm texts
  const assembledPsalms = await Promise.all(
    psalmEntries.map((entry) => resolvePsalm(entry, antiphonOverrides)),
  )

  // 8. Merge propers: sanctoral > season > defaults
  const mergedPropers: HourPropers = {
    ...(seasonPropers ?? {}),
    ...(hourPropers ?? {}),
  }

  // 9. Determine if this is the first hour of the day
  // Liturgically, invitatory belongs to whichever hour is prayed first.
  // In practice, Lauds is the standard first hour for most users.
  const isFirstHourOfDay = hour === 'lauds'

  // 10. Build sections
  const sections = buildSections(hour, assembledPsalms, mergedPropers, ordinarium, isFirstHourOfDay)

  return {
    hourType: hour,
    hourNameMn: hourNamesMn[hour],
    date: dateStr,
    liturgicalDay: day,
    psalterWeek: day.psalterWeek,
    sections,
  }
}

/**
 * Get today's assembled hour.
 */
export async function getTodayHour(hour: HourType): Promise<AssembledHour | null> {
  const today = getToday()
  return assembleHour(today.date, hour)
}

/**
 * Get a summary of all hours available for a given date.
 */
export function getHoursSummary(dateStr: string): {
  date: string
  liturgicalDay: LiturgicalDayInfo
  hours: { type: HourType; nameMn: string }[]
} | null {
  const day = getLiturgicalDay(dateStr)
  if (!day) return null

  const hours: { type: HourType; nameMn: string }[] = [
    { type: 'officeOfReadings', nameMn: hourNamesMn.officeOfReadings },
    { type: 'lauds', nameMn: hourNamesMn.lauds },
    { type: 'terce', nameMn: hourNamesMn.terce },
    { type: 'sext', nameMn: hourNamesMn.sext },
    { type: 'none', nameMn: hourNamesMn.none },
    { type: 'vespers', nameMn: hourNamesMn.vespers },
    { type: 'compline', nameMn: hourNamesMn.compline },
  ]

  return { date: dateStr, liturgicalDay: day, hours }
}
