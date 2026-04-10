// === Liturgical Calendar types (shared with readings) ===

export type LiturgicalSeason = 'ADVENT' | 'CHRISTMAS' | 'LENT' | 'EASTER' | 'ORDINARY_TIME'
export type LiturgicalColor = 'GREEN' | 'VIOLET' | 'WHITE' | 'RED' | 'ROSE'
export type CelebrationRank = 'SOLEMNITY' | 'FEAST' | 'MEMORIAL' | 'OPTIONAL_MEMORIAL' | 'WEEKDAY'

export interface LiturgicalDayInfo {
  date: string
  name: string
  season: LiturgicalSeason
  seasonMn: string
  color: LiturgicalColor
  colorMn: string
  rank: CelebrationRank
  sundayCycle: 'A' | 'B' | 'C'
  weekdayCycle: '1' | '2'
  weekOfSeason: number
  otWeek?: number
  psalterWeek: 1 | 2 | 3 | 4
}

// === Bible types (shared with readings) ===

export interface BibleVerse {
  verse: number
  text: string
}

export interface BibleChapter {
  book: string
  bookMn: string
  chapter: number
  headings: string[]
  verses: BibleVerse[]
}

export interface VerseRef {
  num: number
  suffix?: 'a' | 'b' | 'c'
}

export interface ScriptureRef {
  book: string
  chapter: number
  verses: VerseRef[]
}

export interface ReadingText {
  reference: string
  bookMn: string
  texts: { verse: number; text: string }[]
}

// === LOTH-specific types ===

export type HourType = 'officeOfReadings' | 'lauds' | 'terce' | 'sext' | 'none' | 'vespers' | 'compline'
export type DayOfWeek = 'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT'

export const HOUR_NAMES_MN: Record<HourType, string> = {
  officeOfReadings: 'Уншлагын залбирал',
  lauds: 'Өглөөний даатгал залбирал',
  terce: 'Гуравдугаар цагийн залбирал',
  sext: 'Зургадугаар цагийн залбирал',
  none: 'Есдүгээр цагийн залбирал',
  vespers: 'Оройн даатгал залбирал',
  compline: 'Шөнийн даатгал залбирал',
}

export const DAY_NAMES_MN: Record<DayOfWeek, string> = {
  SUN: 'Ням',
  MON: 'Даваа',
  TUE: 'Мягмар',
  WED: 'Лхагва',
  THU: 'Пүрэв',
  FRI: 'Баасан',
  SAT: 'Бямба',
}

// --- Psalter data structures ---

export interface PsalmEntry {
  type: 'psalm' | 'canticle'
  ref: string                    // English reference: "Psalm 63:2-9"
  antiphon_key: string           // Key for season-specific override
  default_antiphon: string       // Default antiphon text (Mongolian)
  title?: string                 // Psalm title (Mongolian)
  gloria_patri: boolean          // Include Glory Be
  page?: number                  // Source PDF page number
}

export interface HourPsalmody {
  psalms: PsalmEntry[]
}

export interface PsalterDay {
  officeOfReadings: HourPsalmody
  lauds: HourPsalmody
  terce: HourPsalmody
  sext: HourPsalmody
  none: HourPsalmody
  vespers: HourPsalmody
}

export interface PsalterWeekData {
  week: 1 | 2 | 3 | 4
  days: Record<DayOfWeek, PsalterDay>
}

// --- Propers data structures ---

export interface ShortReading {
  ref: string
  text?: string                  // Direct text if not from Bible
  page?: number                  // Source PDF page number
}

export interface Responsory {
  versicle: string
  response: string
  page?: number                  // Source PDF page number
}

export interface HourPropers {
  antiphons?: Record<string, string>    // antiphon_key -> Mongolian text override
  shortReading?: ShortReading
  responsory?: Responsory
  gospelCanticleAntiphon?: string
  gospelCanticleAntiphonPage?: number   // Source PDF page number
  intercessions?: string[]
  intercessionsPage?: number            // Source PDF page number
  concludingPrayer?: string
  concludingPrayerPage?: number         // Source PDF page number
  alternativeConcludingPrayer?: string  // Сонголтот залбирал
  hymn?: string
  hymnPage?: number                     // Source PDF page number
}

export interface PatristicReading {
  author: string
  source: string
  text: string
}

export interface OfficeOfReadingsPropers extends HourPropers {
  firstReading?: { ref: string }
  secondReading?: PatristicReading
}

export interface DayPropers {
  lauds?: HourPropers
  vespers?: HourPropers
  officeOfReadings?: OfficeOfReadingsPropers
  terce?: HourPropers
  sext?: HourPropers
  none?: HourPropers
  compline?: HourPropers
}

export interface SeasonPropers {
  season: string
  weeks: Record<string, Record<string, DayPropers>>  // week -> day -> propers
}

// --- Sanctoral data structures ---

export interface SanctoralEntry {
  lauds?: HourPropers
  vespers?: HourPropers
  vespers2?: HourPropers
  officeOfReadings?: OfficeOfReadingsPropers
  replacesPsalter?: boolean
  properPsalmody?: {
    lauds?: HourPsalmody
    vespers?: HourPsalmody
  }
}

// --- Assembled Hour (output of loth-service) ---

export interface AssembledPsalm {
  psalmType: 'psalm' | 'canticle'
  reference: string
  title?: string
  antiphon: string
  verses: { verse: number; text: string }[]  // fallback when stanzas unavailable
  stanzas?: string[][]                        // poetic lines grouped by stanza (from PDF source)
  gloriaPatri: boolean
  page?: number                  // Source PDF page number
}

export type HourSection =
  | { type: 'invitatory'; versicle: string; response: string; antiphon: string; psalm: { ref: string; title: string; epigraph?: string; stanzas: string[][] }; gloryBe: string; page?: number }
  | { type: 'openingVersicle'; versicle: string; response: string; gloryBe: string; alleluia?: string }
  | { type: 'hymn'; text: string; page?: number }
  | { type: 'psalmody'; psalms: AssembledPsalm[] }
  | { type: 'shortReading'; ref: string; bookMn: string; verses: { verse: number; text: string }[]; page?: number }
  | { type: 'responsory'; versicle: string; response: string; page?: number }
  | { type: 'gospelCanticle'; canticle: 'benedictus' | 'magnificat' | 'nuncDimittis'; antiphon: string; text: string; page?: number }
  | { type: 'intercessions'; intro: string; items: string[]; page?: number }
  | { type: 'ourFather' }
  | { type: 'concludingPrayer'; text: string; page?: number }
  | { type: 'dismissal'; priest: { greeting: { versicle: string; response: string }; blessing: { text: string; response: string }; dismissalVersicle: { versicle: string; response: string } }; individual: { versicle: string; response: string } }
  | { type: 'patristicReading'; author: string; source: string; text: string; page?: number }
  | { type: 'examen'; text: string; page?: number }
  | { type: 'blessing'; text: string; response: string; page?: number }
  | { type: 'marianAntiphon'; title: string; text: string; page?: number }

export interface AssembledHour {
  hourType: HourType
  hourNameMn: string
  date: string
  liturgicalDay: LiturgicalDayInfo
  psalterWeek: 1 | 2 | 3 | 4
  sections: HourSection[]
}
