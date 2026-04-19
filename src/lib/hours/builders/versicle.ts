import type { HourSection, LiturgicalSeason } from '../../types'
import type { Ordinarium } from '../types'

/**
 * Build the "Deus, in adiutorium" opening versicle section.
 * Used at the start of every hour except when the Invitatory is prayed.
 * Alleluia is omitted during Lent.
 */
export function buildOpeningVersicle(
  ordinarium: Ordinarium,
  season: LiturgicalSeason,
  opts?: { pairedWithInvitatory?: boolean },
): HourSection {
  const ov = ordinarium.commonPrayers.openingVersicle
  return {
    type: 'openingVersicle',
    versicle: ov.versicle,
    response: ov.response,
    gloryBe: ov.gloryBe,
    alleluia: season === 'LENT' ? undefined : ov.alleluia,
    pairedWithInvitatory: opts?.pairedWithInvitatory,
  }
}

/**
 * Build the dismissal section with both priest and individual forms.
 */
export function buildDismissal(ordinarium: Ordinarium): HourSection {
  const d = ordinarium.commonPrayers.dismissal as {
    priest: {
      greeting: { versicle: string; response: string }
      blessing: { text: string; response: string }
      dismissalVersicle: { versicle: string; response: string }
    }
    individual: { versicle: string; response: string }
  }
  return {
    type: 'dismissal',
    priest: d.priest,
    individual: d.individual,
  }
}
