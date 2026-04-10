import type {
  HourType,
  LiturgicalDayInfo,
  AssembledHour,
  PsalmEntry,
  HourPropers,
  HourPsalmody,
  HOUR_NAMES_MN,
} from './types'
import { HOUR_NAMES_MN as hourNamesMn } from './types'
import { getLiturgicalDay, getToday } from './calendar'
import { getPsalterPsalmody, getComplinePsalmody, getFullComplineData, getPsalterCommons } from './psalter-loader'
import { getSeasonHourPropers, getSanctoralPropers, getHymnForHour } from './propers-loader'

import { loadOrdinarium, dateToDayOfWeek, resolvePsalm } from './hours/shared'
import { getAssembler } from './hours'
import { mergeComplineDefaults } from './hours/compline'
import type { HourContext } from './hours/types'

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
  //    Saturday vespers = Sunday 1st Vespers per liturgical convention,
  //    so look up Sunday's vespers propers for concluding prayer / gospel canticle antiphon.
  let seasonPropers = getSeasonHourPropers(
    day.season,
    day.weekOfSeason,
    dayOfWeek,
    hour,
    dateStr,
  )

  if (!seasonPropers && dayOfWeek === 'SAT' && hour === 'vespers') {
    // Next day is Sunday — use Sunday's vespers (1st Vespers) propers
    const nextWeek = day.weekOfSeason + 1
    seasonPropers = getSeasonHourPropers(day.season, nextWeek, 'SUN', 'vespers', dateStr)
      ?? getSeasonHourPropers(day.season, day.weekOfSeason, 'SUN', 'vespers', dateStr)
  }

  // 4. Get sanctoral propers (if applicable)
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

  // 8. Merge propers: sanctoral > season > psalter commons > defaults
  //    Per GILH §157/§183/§199, weekday readings/responsories/intercessions/prayers
  //    come from the 4-week psalter cycle when no seasonal proper exists.
  const psalterCommons = getPsalterCommons(day.psalterWeek, dayOfWeek, hour)

  let mergedPropers: HourPropers = {}

  // Layer 1: psalter commons (lowest priority)
  if (psalterCommons) {
    if (psalterCommons.shortReading) mergedPropers.shortReading = psalterCommons.shortReading
    if (psalterCommons.responsory) mergedPropers.responsory = psalterCommons.responsory
    if (psalterCommons.gospelCanticleAntiphon) mergedPropers.gospelCanticleAntiphon = psalterCommons.gospelCanticleAntiphon
    if (psalterCommons.intercessions) mergedPropers.intercessions = psalterCommons.intercessions
    if (psalterCommons.concludingPrayer) mergedPropers.concludingPrayer = psalterCommons.concludingPrayer
  }

  // Layer 2: season propers (override psalter)
  if (seasonPropers) {
    mergedPropers = { ...mergedPropers, ...seasonPropers }
  }

  // Layer 3: sanctoral propers (highest priority)
  if (hourPropers) {
    mergedPropers = { ...mergedPropers, ...hourPropers }
  }

  // 8b. For Compline, fill propers from compline.json when not overridden
  let complineData = null
  if (hour === 'compline') {
    complineData = getFullComplineData(dayOfWeek)
    mergedPropers = mergeComplineDefaults(mergedPropers, complineData)
  }

  // 8c. Fill hymn from seasonal assignments if not already set
  if (!mergedPropers.hymn) {
    const hymnData = getHymnForHour(day.season, day.weekOfSeason, dayOfWeek, hour)
    if (hymnData) {
      mergedPropers.hymn = hymnData.text
    }
  }

  // 9. Build context and delegate to hour assembler
  const isFirstHourOfDay = hour === 'lauds'

  const ctx: HourContext = {
    hour,
    dateStr,
    dayOfWeek,
    liturgicalDay: day,
    assembledPsalms,
    mergedPropers,
    ordinarium,
    isFirstHourOfDay,
    complineData,
  }

  const assembler = getAssembler(hour)
  if (!assembler) return null

  const sections = assembler(ctx)

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
    // officeOfReadings: 교부 독서 데이터 미완성으로 임시 비활성화
    { type: 'lauds', nameMn: hourNamesMn.lauds },
    // terce, sext, none: 낮기도 propers 데이터 미완성으로 임시 비활성화
    { type: 'vespers', nameMn: hourNamesMn.vespers },
    { type: 'compline', nameMn: hourNamesMn.compline },
  ]

  return { date: dateStr, liturgicalDay: day, hours }
}
