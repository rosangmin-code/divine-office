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

// FR-NEW (#230 F-X5) — Sunday I First Vespers / First Compline routing
// promotion. The PDF (p.49 / p.512) labels these as
// "1 дүгээр Оройн даатгал залбирал" and the Compline that follows
// ("1 ДҮГЭЭР ОРОЙН ЗАЛБИРЛЫН ДАРАА. НЯМ ГАРАГУУДАД БОЛОН ИХ БАЯРУУДАД").
// Pre-#230 these were rendered on the Saturday hour cards (Saturday vespers
// / compline) via the Saturday→Sunday firstVespers branch in
// `loth-service.ts`. #230 moves the rendering target to the Sunday page so
// the URL identity matches the liturgical identity (`/pray/SUN/firstVespers`,
// `/pray/SUN/firstCompline`).
export type HourType =
  | 'lauds'
  | 'vespers'
  | 'compline'
  | 'firstVespers'
  | 'firstCompline'
export type DayOfWeek = 'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT'

export const HOUR_NAMES_MN: Record<HourType, string> = {
  lauds: 'Өглөөний даатгал залбирал',
  vespers: 'Оройн даатгал залбирал',
  compline: 'Шөнийн даатгал залбирал',
  firstVespers: '1 дүгээр Оройн даатгал залбирал',
  firstCompline: '1 дүгээр Оройн залбирлын дараах Шөнийн даатгал залбирал',
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

/**
 * WI #24 (Opt C) — rubric / rubric-line 의 **의미 분류** (semantic role).
 *
 * `kind` 는 시각 hint (rubric span / rubric-line block) 를 결정한다.
 * `role` 은 그 위에 의미 hint 를 얹는다 — 같은 시각 표현이라도
 * "그 다음에 후렴이 온다" / "시즌이 바뀐다" / "감탄 marker" / "전구 prefix" 등
 * 의미가 다를 수 있다. 본 필드는 **비-렌더링 메타데이터**이며 현재 모든
 * 렌더러는 무시한다 (HTML byte-identical 보장, WI #24 acceptance criteria).
 *
 * 채택된 enum (production rubric/rubric-line 사용처 분석 기반):
 * - `'instruction'`     — 일반 지시문 (default, 명시 안 한 rubric 모두 포함)
 * - `'season-cue'`      — 시즌 전환 / 시기별 변형 마커. PDF 의 ':' 종결 rubric-line
 *                         (예: `"Амилалтын улирал:"`) 가 대표 사례. 본 WI 가
 *                         compline.json 의 2 entries 에 backfill.
 * - `'refrain-prefix'`  — 후렴 도입 마커. 현재 production 의 `"- "` rubric span 248건
 *                         이 잠재 후보 (본 WI 에서는 backfill 안 함 — out of scope).
 * - `'acclamation'`     — 감탄/응답 marker (예: "Аллэлуяа!"). 현재 backfill 없음.
 *
 * 향후 새 rubric/rubric-line entry 를 추가할 때 의미가 4 enum 중 하나에
 * 해당하면 role 을 부착. 부재 시 `'instruction'` 으로 간주 (default).
 */
export type RubricRole = 'instruction' | 'season-cue' | 'refrain-prefix' | 'acclamation'

export type PrayerSpan =
  | { kind: 'text'; text: string; emphasis?: ('italic' | 'bold')[] }
  | { kind: 'rubric'; text: string; role?: RubricRole }  // inline 루브릭(빨간 지시문)
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
  // 'continuation' (WI-28) — a call/response continuation phrase (e.g. Psalm 81
  // 'Хүмүүс ээ,' 뒤 'Намайг гэрчилж байхад') that must render FULLY indented
  // under the flush call line, not with the default hanging indent. See the
  // renderer's `isContinuation` branch in psalm-block.tsx.
  role?: 'refrain' | 'doxology' | 'continuation'
}

export type PrayerBlock =
  | { kind: 'para'; spans: PrayerSpan[]; indent?: 0 | 1 | 2 }
  | { kind: 'rubric-line'; text: string; role?: RubricRole }      // 단독 루브릭 줄(섹션 제목 등)
  | {
      kind: 'stanza'
      lines: { spans: PrayerSpan[]; indent: 0 | 1 | 2; role?: 'refrain' | 'doxology' }[]
      /** FR-161 R-3 — phrase grouping (additive, optional). 부재/빈 배열 → legacy line-render fallback. */
      phrases?: PhraseGroup[]
      /**
       * F-X11 (#408) — within-stanza paragraph boundaries. Each entry is a
       * 0-based `lines[]` (or `phrases[]` first-line-index) at which a
       * paragraph break should render. Boundary is BEFORE the listed index:
       * e.g. `[3, 7]` means an extra spacing gap is rendered above
       * `lines[3]` and `lines[7]` (before-line semantics, mirrors how
       * `paragraphBoundaries` is populated by the extractor's 1-blank-vs-
       * 2+-blank distinction). Index 0 is rejected by the builder as a
       * no-op (a paragraph break at the very start of a stanza is the
       * stanza boundary itself).
       *
       * Renderer contract: when present and non-empty, the phrase-render
       * path inserts `mt-3` (within-stanza paragraph spacing) above any
       * phrase whose `lineRange[0]` matches a boundary; the legacy
       * line-render path applies the same to its inner `<span>` blocks.
       * Absent / empty array → no within-stanza paragraph spacing
       * (regression-safe additive — this is how every pre-#408 stanza
       * looks today).
       *
       * See `docs/handoff-fx11-paragraph-break-audit-2026-05-08.md` §4
       * Option B for the design rationale.
       */
      paragraphBoundaries?: number[]
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
  // F-X2 Phase 3 (#352): occurrence-specific psalmPrayer **text** override.
  // For 3 emergent occurrences (Psalm 110:1-5,7 W2-SUN-vespers @186 /
  // Psalm 100:1-5 W3-FRI-lauds @380 / Psalm 147:12-20 W4-FRI-lauds @493)
  // the PDF prints a wholly different `Дууллыг төгсгөх залбирал` body
  // than the catalog default — text mismatch, not just page mismatch
  // (which Phase 2 already covered). When this field is set, the resolver
  // prefers it over `psalter-texts.json.psalmPrayer` AND suppresses the
  // catalog `psalmPrayerRich` overlay (R-1 strategy): the rich AST encodes
  // the W1-default prayer text, so emitting it alongside an override would
  // render mismatched UX. The 3 occurrences therefore fall back to the
  // plain-text rendering path (already exercised by FR-153h). See
  // docs/handoff-fx2-phase3-audit-2026-05-08.md §1-3 for verbatim PDF
  // sources and peer-locked R-1 consensus.
  psalmPrayer?: string           // Override for catalog psalmPrayer text (occurrence-specific)
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
  // GOAL #87: proper psalmody printed in-line for an hour whose book page
  // prints its OWN psalms (not a 4-week-psalter slot nor a Week-1 borrow).
  // Used by the Second Vespers of fixed-date season-proper Solemnities
  // (Christmas Day — Ps 110:1-5,7 / Ps 130 / Col 1:12-20, full_pdf
  // p.592-596). Mirrors `FirstVespersPropers.psalms`; absent for every
  // hour that draws psalmody from the running psalter. additive optional.
  psalms?: PsalmEntry[]
  shortReading?: ShortReading
  responsory?: Responsory
  gospelCanticleAntiphon?: string
  // FR-168 (GOAL #90) — saturday-mary Benedictus 6-option candidates +
  // default index + rubric. Additive optional; copied verbatim into the
  // assembled gospelCanticle HourSection by `resolveGospelCanticle`. When
  // present, the section's plain `antiphon` is the selected candidate's
  // text. Absent for every legacy single-antiphon entry.
  gospelCanticleAntiphonCandidates?: GospelCanticleAntiphonCandidate[]
  gospelCanticleAntiphonSelectedIndex?: number
  gospelCanticleAntiphonRubric?: string
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
  /**
   * GOAL #13 (FR-160-B-6): true when a `substitute` rubric's target was
   * resolved INTO the section body (the assembler inlined the borrowed
   * psalter psalms via `target.psalterRef`). The UI then renders the
   * section body (psalms) AND surfaces this directive as a small
   * affordance — rather than HIDING the body and showing the directive
   * alone. Set for a fixed `psalterRef` (Easter/Pentecost/Christmas
   * Week-1) AND, since GOAL #27 (#27-sub-2), for a DYNAMIC
   * `psalterRef.week: 'current'` borrow on the day's OWN hour (All Souls'
   * 11-02 when it falls on Sunday). Absent / false for substitutes whose
   * body stays note-only by design (late-Advent "current running week",
   * Dec 24) AND for a `'current'` borrow evaluated on an eve /
   * First-Vespers promotion (e.g. Saturday-eve 11-02) — those keep the
   * legacy note-only surface so this WI does not regress their behavior.
   */
  bodyInlined?: boolean
  /**
   * GOAL #201 (#201-sub-2): the PDF page where this rubric's text is
   * printed in the book, propagated from `ConditionalRubric.evidencePdf.page`
   * by `rubricToOverride`. The UI surfaces it as a `(х. NNN)` PDF link next
   * to the directive — but ONLY when the directive text does NOT already
   * carry an inline page reference (the "Дууллууд … х. 58." substitute
   * family embeds its borrowed-psalm page in the text, so a second ref
   * would be redundant). Derived from the evidence SoT, never hand-set.
   */
  page?: number
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

// FR-168 (GOAL #90) — one selectable Benedictus antiphon option for the
// saturday-mary memorial. `text` is the authentic breviary antiphon
// (propers_final.txt L9856-9882, book p863-864); `page` is its printed
// book page. Mirrors `HymnCandidate` / `MarianAntiphonCandidate`.
export interface GospelCanticleAntiphonCandidate {
  text: string
  page?: number
  // FR-168 (GOAL #90, spec §1a) — optional rich overlay for a candidate
  // antiphon. Reserved for future seasonal/rich variants; the saturday-mary
  // candidates ship plain text only, so this is unused today (additive).
  textRich?: PrayerText
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
   * Second Vespers of a movable Solemnity (GOAL #20 / FR-156 option B).
   * Sibling to `SanctoralEntry.vespers2` but lives on the season-propers
   * DayPropers so movable Solemnities (Ascension, Pentecost, Trinity
   * Sunday, Corpus Christi, Sacred Heart, Christ the King — which have no
   * fixed MM-DD sanctoral entry) can carry their own-day Second Vespers.
   *
   * On the Solemnity's own day, `/pray/<date>/vespers` must render this
   * (Second Vespers), NOT the regular/duplicate `vespers` cell. The
   * resolver's `hour === 'vespers' && rank === 'SOLEMNITY'` swap
   * (loth-service.ts) consults `getSeasonVespers2` for movables — mirroring
   * the `sanctoral.vespers2` swap that already covers fixed-date
   * Solemnities. Without this field the resolver served the (wrong)
   * First-Vespers-duplicate `vespers` cell + the running psalter week (the
   * Pentecost EP-II bug GOAL #20 fixes).
   */
  vespers2?: HourPropers
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

/**
 * FR-145 (#8) — `CelebrationOption` v2 classifier. Captures the *category*
 * of the option as displayed in the calendar-list first screen, on top of
 * the existing `source` (data origin) discriminator.
 *
 * - `automatic`        — the "Today (Automatic)" anchor entry. Synthetic
 *                        row that links to today's romcal auto-pick. Only
 *                        the synthetic anchor row's option uses this kind.
 * - `weekday-baseline` — romcal default that resolves to a plain weekday
 *                        (rank=WEEKDAY) — e.g. "Wednesday of the 6th week
 *                        of Eastertide". Rendered in stone (non-red) per
 *                        user decision 6.
 * - `fixed-sanctoral`  — romcal default that resolves to a sanctoral
 *                        celebration with rank ∈
 *                        {SOLEMNITY, FEAST, MEMORIAL, OPTIONAL_MEMORIAL}.
 *                        Pre-empts the weekday baseline. RED for solemnity
 *                        + feast per user decision 6.
 * - `optional-memorial`— alternative offered alongside the weekday
 *                        baseline (e.g. "or Our Lady of Fátima"). Sourced
 *                        from `optional-memorials.json` or the votive
 *                        `saturday-mary` slot. Per user decision 5/7, only
 *                        entries with PDF-authored propers are surfaced.
 */
export type CelebrationOptionKind =
  | 'automatic'
  | 'weekday-baseline'
  | 'fixed-sanctoral'
  | 'optional-memorial'

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
  /**
   * FR-145 — display classification used by the calendar-list first
   * screen (#8). Distinct from `source` (data origin) — `kind` answers
   * "how should this option be rendered" rather than "where did it come
   * from". Optional for backward compatibility with pre-FR-145 callers;
   * callers that don't care about the classification can ignore it.
   * See `CelebrationOptionKind` for the closed enum.
   */
  kind?: CelebrationOptionKind
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
  /**
   * GOAL #13 (FR-160-B-6): structured psalter source for a
   * `substitute` + `appliesTo.section: 'psalmody'` rubric. When present,
   * the assembler (loth-service.ts step 6.5) fetches the borrowed psalms
   * via `getPsalterPsalmody(week, day, hour)` and inlines them in place of
   * the WRONG default psalter week — so movable solemnities whose Lauds /
   * 2nd-Vespers psalmody is "drawn from psalter Week 1 Sunday" (Pentecost,
   * Easter Sunday, Christmas Day; PDF "х. 58") render the actual psalm
   * body + antiphons instead of a pointer-only directive note.
   *
   * Antiphons resolve through the normal `resolvePsalm` season path so the
   * borrowing day's Easter Alleluia augmentation (GILH §113) applies and
   * any solemnity-proper `antiphonOverrides` win — the borrowed psalter
   * default antiphons (page 58) are used only when no proper override
   * exists.
   *
   * GOAL #27 (#27-sub-2): `week` also accepts the `'current'` sentinel —
   * a DYNAMIC borrow that resolves to the rendering day's own
   * `psalterWeek` (the 4-week-cycle week the date naturally falls on) at
   * assembly time. This is the All Souls' (11-02) Sunday-collision case:
   * the PDF rubric (p.839) says draw "from the matching/appropriate
   * Sunday (тохиож буй зөв Ням гараг) in the 'Four Weeks' section" — i.e.
   * the running cycle's Sunday, NOT a fixed Week-1. The assembler
   * (loth-service.ts step 6.5) narrows `'current'` → `day.psalterWeek`
   * before `getPsalterPsalmody`. A `'current'` ref is gated to the day's
   * OWN hour (NOT its eve / First-Vespers promotion — see
   * `ConditionalRubricContext.isEveOfFollowingDay`) so a Saturday-eve
   * 11-02 keeps its legacy note-only surface (zero regression).
   *
   * Absent for substitute rubrics whose psalms stay note-only by design
   * (late-Advent "current running week", Dec 24) — those rely on the
   * default `psalmEntries` and keep the directive-only surface.
   */
  psalterRef?: { week: 1 | 2 | 3 | 4 | 'current'; day: DayOfWeek; hour: 'lauds' | 'vespers' }
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
//
// GOAL #130 — a third kind `uncited_caption` was added for the Psalm 63 Lauds
// caption (`Гэм нүглийн … тэмүүлнэ.`): a 2-line caption that carries NO
// patristic / NT attribution and is relocated from the psalm body to the
// post-title header slot. `attribution` is therefore OPTIONAL: it is absent
// for `uncited_caption` and the renderer omits the `(attribution)` parenthesis
// for that kind. `patristic_preface` / `nt_typological` entries remain
// attribution-backed in the data (every catalog entry carries one) and their
// render path is unchanged.
// See docs/design/mental-models/goal130-psalm63-caption-reposition.md §C2.
export interface PsalterHeaderRich {
  kind: 'patristic_preface' | 'nt_typological' | 'uncited_caption'
  attribution?: string      // e.g. "Хэсихиус", "Гэгээн Августин", "Үйлс 2:42";
                            // absent for `uncited_caption`
  preface_text: string      // The full preface / caption body
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
      // FR-168 (GOAL #90) — saturday-mary Benedictus 6-option dropdown.
      // When `candidates` is present + non-empty, the renderer surfaces a
      // dropdown (combobox) and `antiphon` is the text of
      // `candidates[selectedIndex]` (the assembler pre-syncs the plain
      // `antiphon` to the default option). `rubric` is the breviary
      // instruction shown beside the dropdown (kept OUT of the antiphon
      // body). Additive optional — absent for every legacy single-antiphon
      // entry (mirrors the `hymn` candidates/selectedIndex pattern above).
      candidates?: GospelCanticleAntiphonCandidate[]
      selectedIndex?: number
      rubric?: string
      /**
       * WI #35 — within-canticle paragraph boundaries for the `verses[]`
       * body. Each entry is a 0-based `verses[]` index at which a
       * paragraph break should render. Boundary is BEFORE the listed
       * index: e.g. `[4, 6]` means an extra spacing gap is rendered
       * above `verses[4]` and `verses[6]` (before-line semantics — same
       * convention as the psalm F-X11 #408 `PrayerBlock.stanza
       * .paragraphBoundaries`).
       *
       * Absent / empty array → no within-canticle paragraph spacing
       * (regression-safe additive — this is how every pre-WI-35
       * canticle entry renders today). Index 0 is a no-op (a paragraph
       * break at the very start of the canticle body is the body
       * boundary itself).
       *
       * Renderer contract: `gospel-canticle-section.tsx` verses path
       * prepends `mt-3` to any `<p>` whose 0-based index appears in
       * this set. Mirrors the within-stanza paragraph spacing the psalm
       * renderer applies on the F-X11 path (`psalm-block.tsx:129-191`).
       *
       * Sourced from `canticles.json#{benedictus|magnificat|nuncDimittis}
       * .paragraphBoundaries`, passed through `resolveGospelCanticle()`.
       */
      paragraphBoundaries?: number[]
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
  | { type: 'concludingPrayer'; text: string; page?: number; alternateText?: string; alternatePage?: number; textRich?: PrayerText; alternateTextRich?: PrayerText }
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
