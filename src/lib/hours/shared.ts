// Facade: external callers import via './hours' (see index.ts) which in turn
// re-exports from here. Existing imports of `./shared` keep working.
export { loadOrdinarium, loadPsalterTexts } from './loaders'
export { dateToDayOfWeek } from './date-utils'
export { promoteToFirstVespersIdentity } from './first-vespers-identity'
export { resolvePsalm } from './resolvers/psalm'
export { resolveGospelCanticle } from './resolvers/canticle'
export { resolveShortReading } from './resolvers/reading'
export { buildOpeningVersicle, buildDismissal } from './builders/versicle'
export {
  resolveInvitatoryAntiphon,
  buildInvitatory,
} from './builders/invitatory'

import type {
  ConditionalRubricSection,
  HourPropers,
  HourSection,
} from '../types'

// FR-160-B PR-9a — attach the matched conditional-rubric directives
// (recorded by Layer 4.5 in mergedPropers.sectionOverrides) onto the
// HourSection so the UI components can render mode-specific surfaces
// (skip = hide body, substitute = replace body with directive,
// prepend/append = render directive before/after body).
//
// Only the 5 sections targeted by PR-8 (psalmody / intercessions /
// invitatory / dismissal / openingVersicle) carry a `directives` slot;
// the other section types pass through unchanged.
const DIRECTIVE_SECTION_TYPES: ReadonlySet<ConditionalRubricSection> = new Set([
  'psalmody',
  'intercessions',
  'invitatory',
  'dismissal',
  'openingVersicle',
])

export function attachSectionDirectives<S extends HourSection>(
  section: S,
  mergedPropers: HourPropers,
): S {
  if (!DIRECTIVE_SECTION_TYPES.has(section.type as ConditionalRubricSection)) {
    return section
  }
  const overrides = mergedPropers.sectionOverrides?.[section.type as ConditionalRubricSection]
  if (!overrides || overrides.length === 0) return section
  return { ...section, directives: overrides }
}
