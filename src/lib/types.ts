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

/**
 * FR-161 R-3 — Phrase-unit grouping (Option B, additive).
 *
 * 시편/기도문 PDF 의 phrase (시구) 단위를 보존하기 위한 메타데이터.
 * `PrayerBlock` `kind: 'stanza'` 위에 `phrases?: PhraseGroup[]` 으로 얹는다.
 *
 * - `lineRange = [start, end]` — 같은 stanza 의 `lines[]` 배열 인덱스 범위
 *   (inclusive both ends). `lineRange[0] <= lineRange[1]` 가 정상.
 * - `indent` — phrase 자체의 visual indent (0/1/2). `lines[].indent` 와 별개 차원.
 * - `role` — phrase 단위로 격상해야 할 의미(`refrain`, `doxology`). `lines[].role`
 *   와 정합 필요 시 phrase 로 끌어올린다.
 *
 * Renderer 계약: `phrases` 가 비어있지 않으면 phrase 단위 `<p>` 로 emit (각
 * `lineRange` 의 line 들을 공백으로 join 후 viewport wrap 자유). `phrases`
 * 부재 또는 빈 배열이면 legacy line-단위 hard-break 렌더 (회귀 0).
 *
 * 자세한 설계 근거는 docs/fr-161-phrase-unit-pivot-plan.md §4 (Option B) 참조.
 */
export type PhraseGroup = {
  lineRange: [number, number]
  indent?: 0 | 1 | 2
  role?: 'refrain' | 'doxology'
}

export type PrayerBlock =
  | { kind: 'para'; spans: PrayerSpan[]; indent?: 0 | 1 | 2 }
  | { kind: 'rubric-line'; text: string }      // 단독 루브릭 줄(섹션 제목 등)
  | {
      kind: 'stanza'
      lines: { spans: PrayerSpan[]; indent: 0 | 1 | 2; role?: 'refrain' | 'doxology' }[]
      /** FR-161 R-3 — phrase grouping (additive, optional). 부재/빈 배열 → legacy line-render fallback. */
      phrases?: PhraseGroup[]
    }
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
  // F-X2 Phase 1 (#219): occurrence-specific psalmPrayer page override.
  // Same psalm `ref` reused at multiple (week, dayKey, hour) positions in
  // the 4-week LOTH cycle prints its prayer body on a different PDF page
  // each time. The catalog (`psalter-texts.json.psalmPrayerPage`) stores
  // a single default (= the first occurrence's page); when this entry-
  // level field is set, the resolver prefers it via nullish-coalesce —
  // letting per-occurrence pages live alongside the rest of the
  // occurrence-bound metadata (page / antiphon_key) in week-N.json,
  // which is already the SSOT for 4-week cycle data.
  psalmPrayerPage?: number       // Override for catalog default (occurrence-specific)
  // PDF 의 각 시편 엔트리는 default 후렴 아래 rubric 행으로 시즌/날짜/주차별
  // variant 를 수록한다. Phase 2 (task #14) 에서 실제 PDF 텍스트를 주입하며,
  // 본 필드가 존재하면 resolver 가 이를 default_antiphon 보다 우선 선택한다
  // (sanctoral / seasonal propers overrides 다음).
  //
  // 필드 매핑 (divine-tester Phase 2 사전 조사 2026-04-23 실측):
  //   easter            — "Амилалтын улирал:" (EASTER 시즌 전역, 99건)
  //   easterAlt         — "Эсвэл, амилалтын цаг улирлын үед:" (EASTER
  //                       대체 후렴, 3건. Phase 3 semantic = fallback —
  //                       `easter` 가 없는 엔트리에서만 채택.)
  //   advent            — "Ирэлтийн цаг улирал:" (ADVENT 주중 일반, 35건)
  //   adventDec17_23    — "12 сарын 17-23:" (ADVENT 12/17-23, 63건)
  //   adventDec24       — "12 сарын 24:" (ADVENT 12/24, 3건)
  //   easterSunday[N]   — "Амилалтын цаг улирлын N дэх/дахь Ням гараг:"
  //                       (EASTER 주일 per-week override, N=3..7, 43건)
  //   lentSunday[N]     — "Дөчин хоногийн цаг улирлын N дэх/дахь Ням гараг:"
  //                       (LENT 주일 per-week, N=1..5, 41건)
  //   lentPassionSunday — "тарчлалтын Ням гараг:" (Passion Sunday, 전례상
  //                       Lent 5th Sunday = Palm Sunday 전주. 3건. `lentSunday[5]`
  //                       보다 우선 — 더 specific.)
  //
  // 주의: Christmas 시즌 전역 후렴은 PDF 에 마커 0건이라 필드 부재.
  // LENT 시즌 전역 weekday 후렴도 0건 (LENT 는 주일만 존재).
  seasonal_antiphons?: {
    easter?: string
    easterAlt?: string
    advent?: string
    adventDec17_23?: string
    adventDec24?: string
    easterSunday?: Record<number, string>
    lentSunday?: Record<number, string>
    lentPassionSunday?: string
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
  // Gospel canticle antiphon rich overlay (FR-161 C-3a/wi-001). 존재하면
  // resolveGospelCanticle 가 HourSection.antiphonRich 로 그대로 전달, 없으면
  // 기존 plain `gospelCanticleAntiphon` 문자열 경로로 fallback. 데이터 주입
  // (overlay JSON authoring) 은 C-3b/wi-002 에서 수행한다.
  gospelCanticleAntiphonRich?: PrayerText

  // FR-160-B: inline rubric directives. Both arrays are additive — the
  // Layer 4.5 hydrate step evaluates them against runtime context and
  // mutates the surrounding fields (skip/substitute/prepend/append for
  // conditional, ordinarium body inlining for redirect). Empty arrays
  // and `undefined` are equivalent (noop).
  conditionalRubrics?: ConditionalRubric[]
  pageRedirects?: PageRedirect[]

  // FR-160-B PR-8 (B4): per-section rubric overrides surfaced for the
  // 5 sections whose printed body lives outside HourPropers
  // (psalmody/intercessions/invitatory/dismissal/openingVersicle).
  // PR-1 already handles concludingPrayer/hymn/shortReading by mutating
  // the corresponding HourPropers fields directly. For the 5 PR-8
  // sections the resolver records the matched directive in this map so
  // the assembler/UI (PR-9) can render it alongside (or in place of)
  // the section body — without re-running upstream ordinarium loaders.
  // Empty / undefined = noop. additive only.
  sectionOverrides?: SectionOverrideMap

  // FR-160-B PR-10: ordinarium-body inline hydrate. After Layer 4.5
  // resolves `pageRedirects`, the resolver loads the body referenced by
  // each redirect's catalog `sourcePath` and stores it here. Existing
  // section builders are unaffected (they continue to load from the
  // ordinarium index directly); this field is the canonical record so
  // downstream callers can byte-equal verify what got rendered against
  // the ordinarium source. Empty / undefined = noop. additive only.
  pageRedirectBodies?: HydratedPageRedirect[]
}

// FR-160-B PR-8: applied conditional-rubric record. Captures the
// resolved action so the assembler can decide *how* to surface the
// directive (skip = hide the section; substitute = show only the
// directive; prepend/append = render directive before/after the body).
// `text` is the resolved target.text (post-resolveTargetText). `ref`
// and `ordinariumKey` propagate the rubric's target hints when present
// for downstream resolvers (e.g. ordinarium body inlining in B5).
export interface SectionOverride {
  rubricId: string
  mode: ConditionalRubricAction
  text?: string
  ref?: string
  ordinariumKey?: PageRedirectOrdinariumKey
  /**
   * Propagated from `ConditionalRubric.appliesTo.index` so the
   * assembler / UI can target an item-level override (e.g. psalmody[1]
   * specifically). Absent when the rubric applies to the whole
   * section.
   */
  index?: number
}

export type SectionOverrideMap = Partial<
  Record<ConditionalRubricSection, SectionOverride[]>
>

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
  /**
   * F-X1c (#225) — phrase-unit decomposition derived from PDF p.544-545
   * visual line layout. Each entry is a single phrase line as authored
   * in the source PDF; the renderer surfaces them as separate `<p>`
   * with hanging indent (matching the FR-161 R-13 psalm phrase pattern).
   * Optional — when absent, the renderer falls back to
   * `splitMarianTextOnAlleluia(text)` which handles legacy Eastertide
   * data and (for non-Eastertide antiphons) yields a single-line
   * pass-through.
   */
  lines?: string[]
}

/**
 * First Vespers of Sunday — extends HourPropers with an optional own
 * `psalms` array.
 *
 * Roman Rite: 일요일 Vespers 는 두 번 노래된다. 토요일 저녁 = 다가오는
 * Sunday 의 "1st Vespers", 일요일 저녁 = 같은 Sunday 의 "2nd Vespers"
 * (=regular Sunday vespers). 1st Vespers 는 자체 proper psalms + 각
 * psalm 의 전용 default antiphon/seasonal variant 를 가지며, 기존
 * `HourPropers` 의 antiphons/shortReading/responsory/... 슬롯 외에
 * PDF 의 "1 дүгээр Оройн даатгал залбирал" 섹션에 인쇄된 `psalms`
 * 배열을 own 한다. 부재 시 consumer 는 기존 Sunday regular vespers 로
 * fallback (loth-service 의 SAT+vespers 분기 참조).
 *
 * Phase 1 (task #19): 스키마 + resolver wiring. 실제 데이터 주입은
 * Phase 2 (task #20) 에서 PDF 추출로 수행.
 */
export interface FirstVespersPropers extends HourPropers {
  /**
   * Override psalm 배열 — 4-week psalter 의 Saturday vespers 기본값을
   * 대체해 First Vespers 전용 psalm 들을 렌더. 각 entry 는 psalter 와
   * 동일한 PsalmEntry 구조 (ref / antiphon_key / default_antiphon /
   * seasonal_antiphons 포함) 이므로 FR-155 의 variant resolver 가
   * 동일하게 작동.
   */
  psalms?: PsalmEntry[]
}

export interface DayPropers {
  lauds?: HourPropers
  vespers?: HourPropers
  compline?: HourPropers
  /**
   * First Vespers of Sunday (Saturday 저녁에 채택). Sunday 의
   * DayPropers 에 주입하며, resolver 가 `SAT + vespers` 조회 시 다음
   * Sunday 의 `firstVespers` 를 먼저 확인하고 존재 시 우선 사용한다
   * (FR-156).
   */
  firstVespers?: FirstVespersPropers
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
  /**
   * First Vespers of a Solemnity (FR-156 Phase 3a) — sung the evening
   * BEFORE the solemnity's calendar date. Mirrors `DayPropers.firstVespers`
   * for the psalter/season path but lives on the sanctoral entry so the
   * resolver can look up tomorrow's entry from today's evening and adopt
   * it when tomorrow carries rank=SOLEMNITY. Sibling to `vespers2` (which
   * is Second Vespers on the solemnity itself).
   *
   * Phase 3a (task #21): schema + resolver wiring. Phase 3b (task #22)
   * will populate data via PDF extraction into `sanctoral/solemnities.json`.
   */
  firstVespers?: FirstVespersPropers
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

// FR-160-B — Inline conditional + page-redirect rubric data model
// (PR-1: schema + types + Zod + Layer 4.5 hydrate). Two new sibling
// fields land on `HourPropers` outside the existing PrayerText AST
// because semantics (when/action/redirect) differ from presentation
// (rubric span). Layer 4 of `assembleHour` merges these alongside
// rich overlays; Layer 4.5 hydrates them against runtime context
// (season/dayOfWeek/dateStr/hour) and the ordinarium catalog.

export type ConditionalRubricAction = 'skip' | 'substitute' | 'prepend' | 'append'

export type ConditionalRubricSection =
  | 'invitatory'
  | 'openingVersicle'
  | 'hymn'
  | 'psalmody'
  | 'shortReading'
  | 'responsory'
  | 'gospelCanticle'
  | 'intercessions'
  | 'concludingPrayer'
  | 'dismissal'

export interface ConditionalRubricLocator {
  section: ConditionalRubricSection
  /** Optional ordinal — e.g. psalmody[1] = the second psalm */
  index?: number
}

export interface ConditionalRubricWhen {
  season?: LiturgicalSeason[]
  dayOfWeek?: DayOfWeek[]
  /** Inclusive MM-DD range, both ends required when present */
  dateRange?: { from: string; to: string }
  /** Built-in predicates evaluated against HourContext */
  predicate?: 'isFirstHourOfDay' | 'isVigil' | 'isObligatoryMemorial'
}

export interface ConditionalRubricTarget {
  /** Bible/canticle ref that the directive points to (e.g. "Psalm 95:1-11") */
  ref?: string
  /** Inline plain text */
  text?: string
  /** Inline rich AST (rare) */
  textRich?: PrayerText
  /** Closed-enum lookup into the ordinarium catalog */
  ordinariumKey?: PageRedirectOrdinariumKey
}

export interface ConditionalRubricEvidencePdf {
  page: number
  line?: number
  text: string
}

export interface ConditionalRubric {
  /** Unique identifier — stable across rebuilds (e.g. "easter-sun-lauds-skip-ps2") */
  rubricId: string
  when: ConditionalRubricWhen
  action: ConditionalRubricAction
  /** Mandatory for non-skip actions (validated by Zod refinement) */
  target?: ConditionalRubricTarget
  appliesTo: ConditionalRubricLocator
  evidencePdf: ConditionalRubricEvidencePdf
  /** GILH § / liturgical reference */
  liturgicalBasis?: string
}

/**
 * Closed enum of ordinarium catalog keys. Adding a new key is a schema
 * change and requires updating both Zod + the ordinarium-key-catalog
 * JSON in the same PR.
 */
export type PageRedirectOrdinariumKey =
  | 'benedictus'
  | 'magnificat'
  | 'nunc-dimittis'
  | 'dismissal-blessing'
  | 'compline-responsory'
  | 'common-prayers'
  | 'gloria-patri'
  | 'invitatory-psalms'
  | 'hymns'

export type PageRedirectSection =
  | 'invitatory'
  | 'hymn'
  | 'psalmody'
  | 'shortReading'
  | 'responsory'
  | 'gospelCanticle'
  | 'intercessions'
  | 'concludingPrayer'
  | 'dismissal'

export interface PageRedirect {
  redirectId: string
  ordinariumKey: PageRedirectOrdinariumKey
  /** PDF page (1..969 — outside the printed book is rejected at parse time) */
  page: number
  /** PDF label as printed (e.g. "Магтуу: х. 879") */
  label: string
  appliesAt: PageRedirectSection
  evidencePdf: ConditionalRubricEvidencePdf
}

/**
 * FR-160-B PR-10: hydrated ordinarium body, attached after Layer 4.5
 * resolves a `PageRedirect`. The resolver loads the body referenced by
 * the catalog `sourcePath` (e.g. `canticles.json#benedictus`) and pins
 * it to the propers so unit tests / verifiers can byte-equal compare
 * the rendered section against the ordinarium source.
 *
 * `body` is the raw JSON value at the catalog's `sourcePath`. The shape
 * is determined by the source file (e.g. canticle object, dismissal
 * struct, invitatory whole-file, hymns array). The closed enum
 * `ordinariumKey` discriminates the consumer's expected shape.
 *
 * Internal only — this type carries the full body and is attached to
 * `HourPropers.pageRedirectBodies`. The HTTP / `AssembledHour` surface
 * uses `PageRedirectBodyMeta` instead so audit metadata reaches
 * downstream consumers without paying the body-size cost (e.g. the
 * `hymns` source is ~134KB; we don't ship that to every API caller).
 */
export interface HydratedPageRedirect {
  redirectId: string
  ordinariumKey: PageRedirectOrdinariumKey
  page: number
  label: string
  appliesAt: PageRedirectSection
  /** Catalog metadata snapshot — `kind`, canonical `page`, `label`, `sourcePath` */
  catalog: {
    kind: 'fixed' | 'variable'
    page: number
    label: string
    sourcePath: string
  }
  /** Raw JSON value at sourcePath. byte-equal to the ordinarium source. */
  body: unknown
}

/**
 * Public mirror of `HydratedPageRedirect` without the `body` payload.
 * Surfaces on `AssembledHour.pageRedirectBodies` for audit/debug
 * consumers (e2e, telemetry) — the body lives only in the internal
 * `HourPropers.pageRedirectBodies` resolver record. Slimming the API
 * surface avoids shipping multi-KB ordinarium bodies (especially
 * hymns.json at ~134KB) to every client request.
 */
export interface PageRedirectBodyMeta {
  redirectId: string
  ordinariumKey: PageRedirectOrdinariumKey
  page: number
  label: string
  appliesAt: PageRedirectSection
  catalog: {
    kind: 'fixed' | 'variable'
    page: number
    label: string
    sourcePath: string
  }
}

// FR-160-C — psalm-header preface (rubric red metadata above the psalm
// body in the Mongolian LOTH PDF). Two kinds: patristic Father preface
// (Хэсихиус / Августин / Касиодор / Арнобиус / Кацен / Ориген) or NT
// typological citation pointing to a NT verse that prefigures the psalm
// (Үйлс / Матай / Иохан / Лук / Марк / Ром / Еврей / Ефес / Галат /
// Илчлэл / Филиппой). Catalog: src/data/loth/prayers/commons/
// psalter-headers.rich.json. Loader: loadPsalterHeaderRich(ref).
export interface PsalterHeaderRich {
  kind: 'patristic_preface' | 'nt_typological'
  attribution: string       // e.g. "Хэсихиус", "Гэгээн Августин", "Үйлс 2:42"
  preface_text: string      // The full preface body (the citation/quote text)
  page?: number             // Book page where this header appears
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
  headerRich?: PsalterHeaderRich // FR-160-C: psalm-header preface (patristic Father / NT typological citation)
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
      directives?: SectionOverride[]
    }
  | { type: 'openingVersicle'; versicle: string; response: string; gloryBe: string; alleluia?: string; pairedWithInvitatory?: boolean; directives?: SectionOverride[] }
  | { type: 'hymn'; text: string; page?: number; candidates?: HymnCandidate[]; selectedIndex?: number; textRich?: PrayerText }
  | { type: 'psalmody'; psalms: AssembledPsalm[]; directives?: SectionOverride[] }
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
      // FR-161 C-3a (wi-001): rich overlay for the seasonal antiphon. When
      // present, the renderer (C-3b/wi-002) prefers this AST over the plain
      // `antiphon` string. Sourced from
      // `HourPropers.gospelCanticleAntiphonRich` via assembler wiring.
      antiphonRich?: PrayerText
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
      directives?: SectionOverride[]
    }
  | { type: 'ourFather' }
  | { type: 'concludingPrayer'; text: string; page?: number; alternateText?: string; textRich?: PrayerText; alternateTextRich?: PrayerText }
  | { type: 'dismissal'; priest: { greeting: { versicle: string; response: string }; blessing: { text: string; response: string }; dismissalVersicle: { versicle: string; response: string } }; individual: { versicle: string; response: string }; directives?: SectionOverride[] }
  | { type: 'examen'; text: string; page?: number }
  | { type: 'blessing'; text: string; response: string; page?: number }
  | { type: 'marianAntiphon'; title: string; text: string; page?: number; candidates?: MarianAntiphonCandidate[]; selectedIndex?: number; lines?: string[] }

export interface AssembledHour {
  hourType: HourType
  hourNameMn: string
  date: string
  liturgicalDay: LiturgicalDayInfo
  psalterWeek: 1 | 2 | 3 | 4
  sections: HourSection[]
  /**
   * FR-160-B PR-10: hydrated ordinarium audit metadata for any
   * `pageRedirects` declared on this hour's propers. The full body is
   * intentionally NOT included here — clients render section content
   * via the existing builders, and shipping the raw ordinarium source
   * (e.g. ~134KB hymns.json) on every API response is wasteful.
   * Internal byte-equal verification uses
   * `HourPropers.pageRedirectBodies` (full body) inside the resolver.
   * Absent when the hour declares no PageRedirect.
   */
  pageRedirectBodies?: PageRedirectBodyMeta[]
}
