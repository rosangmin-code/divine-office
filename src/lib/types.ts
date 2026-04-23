// === Liturgical Calendar types (shared with readings) ===

export type LiturgicalSeason = 'ADVENT' | 'CHRISTMAS' | 'LENT' | 'EASTER' | 'ORDINARY_TIME'
export type LiturgicalColor = 'GREEN' | 'VIOLET' | 'WHITE' | 'RED' | 'ROSE'
export type CelebrationRank = 'SOLEMNITY' | 'FEAST' | 'MEMORIAL' | 'OPTIONAL_MEMORIAL' | 'WEEKDAY'

export interface LiturgicalDayInfo {
  date: string
  name: string
  nameMn: string
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

export type HourType = 'lauds' | 'vespers' | 'compline'
export type DayOfWeek = 'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT'

export const HOUR_NAMES_MN: Record<HourType, string> = {
  lauds: 'Өглөөний даатгал залбирал',
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

// --- Rich Prayer Content AST ---
// PDF 원형(루브릭 빨간색, italic, V./R., indent)을 JSON 에서 보존하기 위한
// 구조. 기존 `string` 필드는 그대로 두고 *Rich 오버레이 필드를 함께 둔다
// (dual-field 병행). 렌더는 rich 우선, 없으면 legacy string 경로 fallback.
//
// Stage 2 확산 단계에서 `src/lib/prayers/` 카탈로그가 `source` 태그를 실어
// 반환하므로 "어느 경로(공통/시즌/축일)에서 선택된 기도문인지" 추적 가능.

export type PrayerSpan =
  | { kind: 'text'; text: string; emphasis?: ('italic' | 'bold')[] }
  | { kind: 'rubric'; text: string }           // inline 루브릭(빨간 지시문)
  | { kind: 'versicle'; text: string }         // V.
  | { kind: 'response'; text: string }         // R.

export type PrayerBlock =
  | { kind: 'para'; spans: PrayerSpan[]; indent?: 0 | 1 | 2 }
  | { kind: 'rubric-line'; text: string }      // 단독 루브릭 줄(섹션 제목 등)
  | { kind: 'stanza'; lines: { spans: PrayerSpan[]; indent: 0 | 1 | 2; role?: 'refrain' | 'doxology' }[] }
  | { kind: 'divider' }

export type CommonPrayerSource = { kind: 'common'; id: string }
export type SeasonalPrayerSource = {
  kind: 'seasonal'
  season: LiturgicalSeason
  weekKey: string
  dayKey: DayOfWeek
  hour: HourType
}
export type SanctoralPrayerSource = { kind: 'sanctoral'; celebrationId: string; hour: HourType }
export type OverridePrayerSource = { kind: 'override'; note: string }

export type PrayerSourceRef =
  | CommonPrayerSource
  | SeasonalPrayerSource
  | SanctoralPrayerSource
  | OverridePrayerSource

// Discriminated-union narrowing helpers. Only `common` carries `id`; only
// `sanctoral` carries `celebrationId`. Call sites that need these fields
// MUST narrow through one of these guards (TypeScript does not narrow from
// `expect(...).toBe(kind)` assertions).
export function isCommonSource(
  source: PrayerSourceRef | null | undefined,
): source is CommonPrayerSource {
  return source?.kind === 'common'
}
export function isSanctoralSource(
  source: PrayerSourceRef | null | undefined,
): source is SanctoralPrayerSource {
  return source?.kind === 'sanctoral'
}

export interface PrayerText {
  blocks: PrayerBlock[]
  page?: number
  source?: PrayerSourceRef
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
  // PDF 의 각 시편 엔트리는 default 후렴 아래 rubric 행으로 시즌별 variant
  // (예: "Амилалтын улирал:" / "12 сарын 17-23:") 를 수록한다. Phase 2 에서
  // 실제 PDF 텍스트를 주입하며, 본 필드가 존재하면 resolver 가 이를
  // default_antiphon 보다 우선 선택한다 (sanctoral/seasonal overrides 다음).
  seasonal_antiphons?: {
    easter?: string
    adventDec17_23?: string
    lent?: string
    christmas?: string
  }
}

export interface HourPsalmody {
  psalms: PsalmEntry[]
}

export interface PsalterDay {
  lauds: HourPsalmody
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
  fullResponse: string           // R. 전체 응답 (시작과 끝에 반복)
  versicle: string               // V. 전구 (중간 구절)
  shortResponse: string          // R. 짧은 응답
  page?: number                  // Source PDF page number
}

export interface HourPropers {
  antiphons?: Record<string, string>    // antiphon_key -> Mongolian text override
  shortReading?: ShortReading
  responsory?: Responsory
  gospelCanticleAntiphon?: string
  alleluiaConditional?: boolean         // true = append Alleluia outside Lent (e.g. sanctoral propers for 03-19, 03-25)
  gospelCanticleAntiphonPage?: number   // Source PDF page number
  intercessions?: string[]
  intercessionsPage?: number            // Source PDF page number
  concludingPrayer?: string
  concludingPrayerPage?: number         // Source PDF page number
  alternativeConcludingPrayer?: string  // Сонголтот залбирал
  alternativeConcludingPrayerPage?: number  // Source PDF page number
  hymn?: string
  hymnPage?: number                     // Source PDF page number

  // Rich overlays (dual-field 병행). 존재하면 렌더가 우선 사용, 없으면
  // 기존 string 필드 경로 fallback.
  shortReadingRich?: PrayerText
  responsoryRich?: PrayerText
  intercessionsRich?: PrayerText
  concludingPrayerRich?: PrayerText
  alternativeConcludingPrayerRich?: PrayerText
  hymnRich?: PrayerText
}

export interface HymnCandidate {
  number: number
  title: string
  text: string
  page?: number
}

export interface MarianAntiphonCandidate {
  title: string
  text: string
  page?: number
}

export interface DayPropers {
  lauds?: HourPropers
  vespers?: HourPropers
  compline?: HourPropers
}

export interface SeasonPropers {
  season: string
  weeks: Record<string, Record<string, DayPropers>>  // week -> day -> propers
}

// --- Sanctoral data structures ---

export interface SanctoralEntry {
  name?: string
  lauds?: HourPropers
  vespers?: HourPropers
  vespers2?: HourPropers
  replacesPsalter?: boolean
  properPsalmody?: {
    lauds?: HourPsalmody
    vespers?: HourPsalmody
  }
}

// --- Celebration option (축일 선택) ---

export interface OptionalMemorialEntry extends SanctoralEntry {
  /** MM-DD of the calendar date on which this entry is eligible */
  mmdd: string
  /** English celebration name shown to liturgical-year logic */
  name: string
  /** Mongolian celebration name rendered in the UI */
  nameMn: string
  /** Ranking within the liturgical hierarchy */
  rank: CelebrationRank
  /** Liturgical color used when this celebration is chosen */
  color: LiturgicalColor
}

export interface CelebrationOption {
  /** Stable slug used in URL query + API: 'default' | `${mmdd}-${slug}` | 'saturday-mary' */
  id: string
  name: string
  nameMn: string
  rank: CelebrationRank
  color: LiturgicalColor
  colorMn: string
  /** True for the celebration romcal assigns as the day's default */
  isDefault: boolean
  /** Origin of the option — romcal pick, optional-memorials.json entry, or votive (e.g. Saturday Mary) */
  source: 'romcal' | 'optional' | 'votive'
}

export interface CelebrationOptionsResult {
  date: string
  options: CelebrationOption[]
}

// --- Assembled Hour (output of loth-service) ---

export interface AssembledPsalm {
  psalmType: 'psalm' | 'canticle'
  reference: string
  title?: string
  antiphon: string
  verses: { verse: number; text: string }[]  // fallback when stanzas unavailable
  stanzas?: string[][]                        // poetic lines grouped by stanza (from PDF source)
  stanzasRich?: PrayerText       // FR-153f: rich AST overlay for stanzas (indent 0/1/2 + refrain role)
  gloriaPatri: boolean
  psalmPrayer?: string           // Дууллыг төгсгөх залбирал — post-Gloria Patri oratio
  psalmPrayerRich?: PrayerText   // FR-153h: rich AST overlay for psalmPrayer (prose blocks + rubric spans)
  psalmPrayerPage?: number       // Source PDF page number of the psalmPrayer
  page?: number                  // Source PDF page number
}

export type HourSection =
  | {
      type: 'invitatory'
      versicle: string
      response: string
      antiphon: string
      psalm: { ref: string; title: string; epigraph?: string; stanzas: string[][] }
      candidates?: { ref: string; title: string; epigraph?: string; stanzas: string[][]; page?: number }[]
      selectedIndex?: number
      gloryBe: string
      rubric?: string
      page?: number
    }
  | { type: 'openingVersicle'; versicle: string; response: string; gloryBe: string; alleluia?: string; pairedWithInvitatory?: boolean }
  | { type: 'hymn'; text: string; page?: number; candidates?: HymnCandidate[]; selectedIndex?: number; textRich?: PrayerText }
  | { type: 'psalmody'; psalms: AssembledPsalm[] }
  | { type: 'shortReading'; ref: string; bookMn: string; verses: { verse: number; text: string }[]; page?: number; textRich?: PrayerText }
  | { type: 'responsory'; fullResponse: string; versicle: string; shortResponse: string; page?: number; rich?: PrayerText }
  | {
      type: 'gospelCanticle'
      canticle: 'benedictus' | 'magnificat' | 'nuncDimittis'
      antiphon: string
      text: string
      verses?: string[]
      doxology?: string
      // `page` is the SEASONAL ANTIPHON page (daily propers). Carried on the
      // HourSection for backward compatibility with existing consumers; the UI
      // now renders it alongside the antiphon box rather than next to the
      // canticle heading to avoid implying the fixed Magnificat/Benedictus
      // body is printed on that page (it isn't — see bodyPage).
      page?: number
      // `bodyPage` is the FIXED ORDINARIUM page where the canticle verses are
      // printed (Benedictus p34 / Magnificat p40 / Nunc Dimittis p515). Same
      // for every day of the year. Surfaced next to the heading so the reader
      // knows where to find the body text in the printed book.
      bodyPage?: number
      textRich?: PrayerText
    }
  | {
      type: 'intercessions'
      intro: string
      items: string[]
      introduction?: string
      refrain?: string
      petitions?: { versicle: string; response?: string }[]
      closing?: string
      page?: number
      rich?: PrayerText
    }
  | { type: 'ourFather' }
  | { type: 'concludingPrayer'; text: string; page?: number; alternateText?: string; textRich?: PrayerText; alternateTextRich?: PrayerText }
  | { type: 'dismissal'; priest: { greeting: { versicle: string; response: string }; blessing: { text: string; response: string }; dismissalVersicle: { versicle: string; response: string } }; individual: { versicle: string; response: string } }
  | { type: 'examen'; text: string; page?: number }
  | { type: 'blessing'; text: string; response: string; page?: number }
  | { type: 'marianAntiphon'; title: string; text: string; page?: number; candidates?: MarianAntiphonCandidate[]; selectedIndex?: number }

export interface AssembledHour {
  hourType: HourType
  hourNameMn: string
  date: string
  liturgicalDay: LiturgicalDayInfo
  psalterWeek: 1 | 2 | 3 | 4
  sections: HourSection[]
}
