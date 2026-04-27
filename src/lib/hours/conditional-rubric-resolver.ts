// FR-160-B PR-1 — Layer 4.5 conditional rubric hydration.
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
// PR-1 scope: hydrate signature + match logic + skip/substitute/prepend/
// append for `concludingPrayer`, `shortReading`, `responsory`,
// `hymn`. Other sections (psalmody/intercessions) are placeholder noops
// that defer mutation to PR-8 (B4) — the rubricsApplied counter still
// fires so verifier coverage gates can detect drift.

import type {
  ConditionalRubric,
  ConditionalRubricLocator,
  ConditionalRubricWhen,
  DayOfWeek,
  HourPropers,
  HourType,
  LiturgicalSeason,
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
  // upstream assembler (PR-8); here we treat them as opaque-no-text.
  return null
}

function applySkip(propers: HourPropers, locator: ConditionalRubricLocator): HourPropers {
  const next = { ...propers }
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
      break
    case 'gospelCanticle':
      delete next.gospelCanticleAntiphon
      delete next.gospelCanticleAntiphonPage
      break
    // psalmody / invitatory / openingVersicle / dismissal — handled by
    // assembler stage (PR-8). PR-1 keeps the section data intact.
  }
  return next
}

function applySubstitute(
  propers: HourPropers,
  rubric: ConditionalRubric,
): HourPropers {
  const text = resolveTargetText(rubric)
  if (text == null) return propers
  const next = { ...propers }
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
    // PR-1 scope: other sections deferred to PR-8.
  }
  return next
}

function applyPrependAppend(
  propers: HourPropers,
  rubric: ConditionalRubric,
  mode: 'prepend' | 'append',
): HourPropers {
  const text = resolveTargetText(rubric)
  if (text == null) return propers
  const next = { ...propers }
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
  }
  return next
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
  for (const rubric of rubrics) {
    if (!matchesWhen(rubric.when, ctx)) continue
    switch (rubric.action) {
      case 'skip':
        next = applySkip(next, rubric.appliesTo)
        break
      case 'substitute':
        next = applySubstitute(next, rubric)
        break
      case 'prepend':
        next = applyPrependAppend(next, rubric, 'prepend')
        break
      case 'append':
        next = applyPrependAppend(next, rubric, 'append')
        break
    }
    applied.push(rubric)
  }

  return { propers: next, rubricsApplied: applied }
}
