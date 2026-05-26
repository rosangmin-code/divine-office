// FR-160-B Layer 4.5 conditional rubric hydration.
//
// Evaluates `HourPropers.conditionalRubrics` against runtime context
// (season, dayOfWeek, dateStr, hour, isFirstHourOfDay) and applies the
// matching rubric's action to the surrounding fields. When no rubrics
// are defined, or no rubric matches, the propers are returned
// unchanged (deep-cloned at the top level) so assembleHour determinism
// is preserved.
//
// Currently supported actions:
//   - skip        → clear the section's primary fields
//   - substitute  → replace section's text with target.text / target.ref
//   - prepend     → prepend target.text to existing field (rare)
//   - append      → append target.text to existing field (rare)
//
// PR-1 sections (mutate HourPropers fields directly):
//   concludingPrayer, hymn, shortReading, responsory, intercessions
//   (skip only), gospelCanticle (skip only)
//
// PR-8 sections (record in sectionOverrides; printed body lives outside
// HourPropers in ordinarium / psalter / sanctoral.properPsalmody):
//   psalmody, intercessions (substitute/prepend/append),
//   invitatory, dismissal, openingVersicle
//
// The PR-8 sections cover rubrics like 11-02 All Souls' "Хурлын
// даатгал залбирлуудыг … Ням гарагаас татаж авна" (substitute psalmody
// → take prayers from the regular Sunday office). The assembler / UI
// (PR-9 + B5) reads sectionOverrides to render the directive without
// re-running the psalter resolver.

import type {
  ConditionalRubric,
  ConditionalRubricAction,
  ConditionalRubricLocator,
  ConditionalRubricSection,
  ConditionalRubricWhen,
  ConditionalRubricTarget,
  DayOfWeek,
  HourPropers,
  HourType,
  LiturgicalSeason,
  SectionOverride,
  SectionOverrideMap,
} from '../types'

export interface ConditionalRubricContext {
  season: LiturgicalSeason
  dayOfWeek: DayOfWeek
  /** YYYY-MM-DD */
  dateStr: string
  hour: HourType
  isFirstHourOfDay: boolean
  isVigil?: boolean
  isObligatoryMemorial?: boolean
  /**
   * GOAL #27 (#27-sub-2): true when this hour is the EVE / First-Vespers
   * promotion of the FOLLOWING liturgical day (e.g. Saturday-evening
   * Vespers rendered as First Vespers of Sunday — the assembler promotes
   * `effectiveDayOfWeek` to SUN). The civil date is NOT yet the day whose
   * rubric is being evaluated. A DYNAMIC `psalterRef.week: 'current'`
   * borrow is SUPPRESSED in this branch so an All Souls' (11-02) rubric
   * keyed `when.dayOfWeek: ['SUN']` does NOT inline psalms onto a
   * Saturday-eve render (which only matches via the SUN promotion) —
   * preserving the legacy note-only surface there. Fixed `psalterRef`
   * (Week-1 Easter/Pentecost/Christmas) is unaffected. Defaults to false.
   */
  isEveOfFollowingDay?: boolean
}

export interface ApplyConditionalRubricsResult {
  propers: HourPropers
  rubricsApplied: ConditionalRubric[]
}

/**
 * Match a `when` clause against the runtime context. All present
 * fields must match (AND semantics); absent fields are wildcards.
 */
export function matchesWhen(
  when: ConditionalRubricWhen,
  ctx: ConditionalRubricContext,
): boolean {
  if (when.season != null && !when.season.includes(ctx.season)) return false
  if (when.dayOfWeek != null && !when.dayOfWeek.includes(ctx.dayOfWeek)) return false
  if (when.dateRange != null) {
    const mmdd = ctx.dateStr.slice(5) // 'YYYY-MM-DD' → 'MM-DD'
    if (mmdd < when.dateRange.from || mmdd > when.dateRange.to) return false
  }
  if (when.predicate != null) {
    if (when.predicate === 'isFirstHourOfDay' && !ctx.isFirstHourOfDay) return false
    if (when.predicate === 'isVigil' && !ctx.isVigil) return false
    if (when.predicate === 'isObligatoryMemorial' && !ctx.isObligatoryMemorial) return false
  }
  return true
}

function resolveTargetText(rubric: ConditionalRubric): string | null {
  const t = rubric.target
  if (!t) return null
  if (typeof t.text === 'string' && t.text.length > 0) return t.text
  // ref-only / ordinariumKey-only / textRich-only targets defer to
  // the assembler / UI; here we treat them as opaque-no-text.
  return null
}

// PR-8 sections — the printed body lives outside HourPropers, so the
// resolver records each matching rubric in sectionOverrides[section]
// instead of mutating a string field. These are also the sections
// that don't have substitute/prepend/append wiring in PR-1.
const PR8_SECTIONS: ReadonlySet<ConditionalRubricSection> = new Set([
  'psalmody',
  'invitatory',
  'dismissal',
  'openingVersicle',
])

function appendSectionOverride(
  propers: HourPropers,
  section: ConditionalRubricSection,
  override: SectionOverride,
): HourPropers {
  const next: HourPropers = { ...propers }
  const existing: SectionOverrideMap = next.sectionOverrides ?? {}
  const sectionList = existing[section] ?? []
  next.sectionOverrides = {
    ...existing,
    [section]: [...sectionList, override],
  }
  return next
}

function rubricToOverride(
  rubric: ConditionalRubric,
  text: string | null,
  eveOfFollowingDay = false,
): SectionOverride {
  const out: SectionOverride = {
    rubricId: rubric.rubricId,
    mode: rubric.action,
  }
  if (text != null) out.text = text
  if (rubric.target?.ref != null) out.ref = rubric.target.ref
  if (rubric.target?.ordinariumKey != null) out.ordinariumKey = rubric.target.ordinariumKey
  if (typeof rubric.appliesTo.index === 'number') out.index = rubric.appliesTo.index
  // GOAL #13 (FR-160-B-6): a psalmody substitute carrying a structured
  // `psalterRef` has its borrowed psalms inlined into the section body by
  // the assembler (loth-service step 6.5). Flag the directive so the UI
  // renders the body + surfaces this note as an affordance, instead of
  // hiding the body. Substitutes WITHOUT a psalterRef (late-Advent
  // dynamic / Dec 24) keep the legacy note-only surface — no regression.
  //
  // GOAL #27 (#27-sub-2): a DYNAMIC `psalterRef.week: 'current'` borrow is
  // inlined only on the day's OWN hour. On an eve / First-Vespers
  // promotion (`eveOfFollowingDay`) it is suppressed back to note-only so
  // a Saturday-eve 11-02 (matched only via the SUN promotion) keeps its
  // legacy surface — must stay consistent with the step-6.5 injection gate
  // (`resolvePsalmodySubstituteRef` returns null for the same case).
  if (
    rubric.action === 'substitute' &&
    rubric.appliesTo.section === 'psalmody' &&
    rubric.target?.psalterRef != null &&
    !(rubric.target.psalterRef.week === 'current' && eveOfFollowingDay)
  ) {
    out.bodyInlined = true
  }
  return out
}

function applySkip(propers: HourPropers, locator: ConditionalRubricLocator, rubric: ConditionalRubric): HourPropers {
  let next = { ...propers }
  switch (locator.section) {
    case 'shortReading':
      delete next.shortReading
      delete next.shortReadingRich
      break
    case 'responsory':
      delete next.responsory
      delete next.responsoryRich
      break
    case 'concludingPrayer':
      delete next.concludingPrayer
      delete next.concludingPrayerPage
      delete next.concludingPrayerRich
      break
    case 'hymn':
      delete next.hymn
      delete next.hymnPage
      delete next.hymnRich
      break
    case 'intercessions':
      delete next.intercessions
      delete next.intercessionsPage
      delete next.intercessionsRich
      next = appendSectionOverride(next, 'intercessions', rubricToOverride(rubric, null))
      break
    case 'gospelCanticle':
      delete next.gospelCanticleAntiphon
      delete next.gospelCanticleAntiphonPage
      break
    case 'psalmody':
    case 'invitatory':
    case 'dismissal':
    case 'openingVersicle':
      next = appendSectionOverride(next, locator.section, rubricToOverride(rubric, null))
      break
  }
  return next
}

function applySubstitute(
  propers: HourPropers,
  rubric: ConditionalRubric,
  eveOfFollowingDay = false,
): HourPropers {
  const text = resolveTargetText(rubric)
  if (text == null) {
    // ref / ordinariumKey-only target with no inline text: still
    // record the override for downstream resolvers (PR-9 surfaces
    // ref/ordinariumKey hints).
    if (
      rubric.target?.ref != null ||
      rubric.target?.ordinariumKey != null
    ) {
      const sec = rubric.appliesTo.section
      if (PR8_SECTIONS.has(sec) || sec === 'intercessions') {
        return appendSectionOverride(propers, sec, rubricToOverride(rubric, null, eveOfFollowingDay))
      }
    }
    return propers
  }
  let next = { ...propers }
  switch (rubric.appliesTo.section) {
    case 'concludingPrayer':
      next.concludingPrayer = text
      // Drop the original page — it points to the *replaced* prayer, not
      // the substitute. The target's evidencePdf already encodes the
      // correct page when downstream wiring (B4) wants to surface it.
      delete next.concludingPrayerPage
      delete next.concludingPrayerRich
      break
    case 'hymn':
      next.hymn = text
      delete next.hymnPage
      delete next.hymnRich
      break
    case 'shortReading':
      next.shortReading = { ref: rubric.target?.ref ?? '', text }
      delete next.shortReadingRich
      break
    case 'intercessions':
      // substitute the petition list with a single directive line.
      // The override map carries the rubric metadata for B5 UI.
      next.intercessions = [text]
      delete next.intercessionsPage
      delete next.intercessionsRich
      next = appendSectionOverride(next, 'intercessions', rubricToOverride(rubric, text))
      break
    case 'psalmody':
    case 'invitatory':
    case 'dismissal':
    case 'openingVersicle':
      next = appendSectionOverride(next, rubric.appliesTo.section, rubricToOverride(rubric, text, eveOfFollowingDay))
      break
    // responsory / gospelCanticle — substitute deferred (no current data).
  }
  return next
}

function applyPrependAppend(
  propers: HourPropers,
  rubric: ConditionalRubric,
  mode: 'prepend' | 'append',
): HourPropers | null {
  const text = resolveTargetText(rubric)
  // Textless prepend/append cannot mutate any field — return null so
  // the caller knows to skip this rubric entirely (no rubricsApplied
  // record). Avoids overstating applied effects in audit/telemetry.
  if (text == null) return null
  let next = { ...propers }
  const join = (existing: string | undefined, addition: string): string =>
    mode === 'prepend' ? `${addition}\n${existing ?? ''}`.trim() : `${existing ?? ''}\n${addition}`.trim()

  switch (rubric.appliesTo.section) {
    case 'concludingPrayer':
      next.concludingPrayer = join(next.concludingPrayer, text)
      break
    case 'hymn':
      next.hymn = join(next.hymn, text)
      break
    case 'shortReading':
      if (next.shortReading) {
        next.shortReading = {
          ...next.shortReading,
          text: join(next.shortReading.text, text),
        }
      }
      break
    case 'intercessions': {
      const existing = next.intercessions ?? []
      next.intercessions = mode === 'prepend' ? [text, ...existing] : [...existing, text]
      next = appendSectionOverride(next, 'intercessions', rubricToOverride(rubric, text))
      break
    }
    case 'psalmody':
    case 'invitatory':
    case 'dismissal':
    case 'openingVersicle':
      next = appendSectionOverride(next, rubric.appliesTo.section, rubricToOverride(rubric, text))
      break
    // responsory / gospelCanticle — prepend/append deferred (no current data).
    default:
      // Section that has no prepend/append handler — treat as no-op
      // and signal the caller via null so rubricsApplied isn't padded.
      return null
  }
  return next
}

/**
 * GOAL #13 (FR-160-B-6): pre-resolution scan for a psalmody-`substitute`
 * rubric carrying a structured `target.psalterRef`. The assembler calls
 * this BEFORE psalm-text resolution (loth-service step 6.5) so the borrowed
 * psalter psalms flow through the normal `resolvePsalm` pipeline (season
 * antiphon augmentation + proper antiphonOverrides) — unlike
 * `applyConditionalRubrics` (Layer 4.5), which runs AFTER psalm resolution
 * and therefore can only record the directive note, not swap the psalms.
 *
 * Iterates the conditionalRubrics of every propers source passed in
 * (season propers first, then sanctoral/hour propers), returning the first
 * matching substitute-on-psalmody rubric's `psalterRef`. Returns null when
 * no such rubric matches the context (the common case — the assembler then
 * keeps the default base psalmody). Match semantics are identical to
 * `applyConditionalRubrics` (`matchesWhen` + action/section gate) so a
 * rubric that resolves here is exactly the one that surfaces its directive
 * note downstream.
 */
export function resolvePsalmodySubstituteRef(
  propersSources: ReadonlyArray<HourPropers | null | undefined>,
  ctx: ConditionalRubricContext,
): NonNullable<ConditionalRubricTarget['psalterRef']> | null {
  for (const propers of propersSources) {
    const rubrics = propers?.conditionalRubrics
    if (!rubrics || rubrics.length === 0) continue
    for (const rubric of rubrics) {
      if (rubric.action !== 'substitute') continue
      if (rubric.appliesTo.section !== 'psalmody') continue
      if (!matchesWhen(rubric.when, ctx)) continue
      const ref = rubric.target?.psalterRef
      if (!ref) continue
      // GOAL #27 (#27-sub-2): a DYNAMIC `'current'`-week borrow is meant
      // for the day's OWN hour. On an eve / First-Vespers promotion the
      // rubric only matched via the SUN promotion (`ctx.dayOfWeek` is the
      // promoted day, not the civil one), so suppress the inline injection
      // and let the base psalmody + note-only surface stand — kept
      // consistent with `rubricToOverride`'s bodyInlined gate. Fixed
      // `psalterRef` (Week-1 Easter/Pentecost/Christmas) is unaffected.
      //
      // `continue` (not `return null`): a suppressed `'current'` ref does
      // NOT short-circuit the scan — a LATER fixed-week substitute in the
      // same sources can still resolve on the eve. Moot for the only
      // current `'current'` rubric (All Souls 11-02 — one substitute per
      // hour, no co-located fixed-week sibling), but keeps the scan
      // composable if future data co-locates a dynamic + fixed substitute.
      if (ref.week === 'current' && ctx.isEveOfFollowingDay === true) continue
      return ref
    }
  }
  return null
}

/**
 * Layer 4.5 entry point. Caller passes the merged propers from Layer 4
 * and the runtime context; helper iterates `propers.conditionalRubrics`
 * and mutates a shallow copy. Original propers are not modified.
 */
export function applyConditionalRubrics(
  propers: HourPropers,
  ctx: ConditionalRubricContext,
): ApplyConditionalRubricsResult {
  const rubrics = propers.conditionalRubrics
  if (!rubrics || rubrics.length === 0) {
    return { propers, rubricsApplied: [] }
  }

  let next = propers
  const applied: ConditionalRubric[] = []
  const eveOfFollowingDay = ctx.isEveOfFollowingDay === true
  for (const rubric of rubrics) {
    if (!matchesWhen(rubric.when, ctx)) continue
    switch (rubric.action) {
      case 'skip':
        next = applySkip(next, rubric.appliesTo, rubric)
        break
      case 'substitute':
        next = applySubstitute(next, rubric, eveOfFollowingDay)
        break
      case 'prepend': {
        const out = applyPrependAppend(next, rubric, 'prepend')
        if (out == null) continue // textless / unhandled section — don't record
        next = out
        break
      }
      case 'append': {
        const out = applyPrependAppend(next, rubric, 'append')
        if (out == null) continue
        next = out
        break
      }
    }
    applied.push(rubric)
  }

  return { propers: next, rubricsApplied: applied }
}

// Re-export action enum for callers wanting strict typing of override.mode.
export type { ConditionalRubricAction }
