// Facade: external callers import via './hours' (see index.ts) which in turn
// re-exports from here. Existing imports of `./shared` keep working.
export { loadOrdinarium, loadPsalterTexts } from './loaders'
export { dateToDayOfWeek } from './date-utils'
export { resolvePsalm } from './resolvers/psalm'
export { resolveGospelCanticle } from './resolvers/canticle'
export { resolveShortReading } from './resolvers/reading'
export { buildOpeningVersicle, buildDismissal } from './builders/versicle'
export {
  resolveInvitatoryAntiphon,
  buildInvitatory,
} from './builders/invitatory'
