import type {
  DayOfWeek,
  HourSection,
  LiturgicalDayInfo,
} from '../../types'
import type { InvitatoryAntiphons, Ordinarium } from '../types'

/**
 * Resolve the invitatory antiphon based on liturgical day, season, and date.
 */
export function resolveInvitatoryAntiphon(
  antiphons: InvitatoryAntiphons,
  day: LiturgicalDayInfo,
  dayOfWeek: DayOfWeek,
  dateStr: string,
): string {
  const month = parseInt(dateStr.slice(5, 7), 10)
  const dayNum = parseInt(dateStr.slice(8, 10), 10)

  const name = day.name ?? ''

  switch (day.season) {
    case 'ADVENT': {
      if (month === 12 && dayNum === 24) return antiphons.advent.dec24
      if (month === 12 && dayNum >= 17 && dayNum <= 23)
        return antiphons.advent.dec17_23
      return antiphons.advent.default
    }
    case 'CHRISTMAS': {
      if (name.includes('Ариун угаал') || name.includes('Baptism')) {
        return antiphons.christmas.baptismOfTheLord
      }
      if (name.includes('Ариун Гэр бүл') || name.includes('Holy Family')) {
        return antiphons.christmas.holyFamily
      }
      if (month === 1 && dayNum === 1) return antiphons.christmas.jan1
      if (month === 1 && dayNum >= 6) return antiphons.christmas.afterEpiphany
      return antiphons.christmas.default
    }
    case 'LENT': {
      if (name.includes('Тарчлалтын Баасан') || name.includes('Good Friday')) {
        return antiphons.lent.goodFriday
      }
      if (name.includes('Ариун Бямба') || name.includes('Holy Saturday')) {
        return antiphons.lent.holySaturday
      }
      if (name.includes('Ариун долоо хоног') || name.includes('Holy Week')) {
        return antiphons.lent.holyWeek
      }
      return antiphons.lent.default
    }
    case 'EASTER': {
      if (name.includes('Пэнтикост') || name.includes('Pentecost')) {
        return antiphons.easter.pentecost
      }
      if (name.includes('тэнгэрт заларсан') || name.includes('Ascension')) {
        return antiphons.easter.ascension
      }
      return antiphons.easter.default
    }
    case 'ORDINARY_TIME':
    default: {
      const parity = day.psalterWeek % 2 === 1 ? 'odd' : 'even'
      return (
        antiphons.ordinaryTime[parity][dayOfWeek] ??
        antiphons.ordinaryTime.odd.SUN
      )
    }
  }
}

/**
 * Build the full invitatory section: opening versicle, antiphon, psalm with stanzas, glory be.
 */
export function buildInvitatory(
  ordinarium: Ordinarium,
  antiphon: string,
): HourSection {
  const psalms = ordinarium.invitatory.invitatoryPsalms
  const psalm = psalms[0]
  return {
    type: 'invitatory',
    versicle: ordinarium.invitatory.openingVersicle.versicle,
    response: ordinarium.invitatory.openingVersicle.response,
    antiphon,
    psalm: {
      ref: psalm.ref,
      title: psalm.title,
      epigraph: psalm.epigraph,
      stanzas: psalm.stanzas,
    },
    candidates: psalms.map((p) => ({
      ref: p.ref,
      title: p.title,
      epigraph: p.epigraph,
      stanzas: p.stanzas,
      page: p.page,
    })),
    selectedIndex: 0,
    gloryBe: ordinarium.invitatory.gloryBe.text,
    rubric: ordinarium.invitatory.rubric,
    page: psalm.page,
  }
}
