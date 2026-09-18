import { describe, it, expect } from 'vitest'
import { assembleHour, getHoursSummary, isFirstVespersEligibleDate } from '../loth-service'
import feasts from '../../data/loth/sanctoral/feasts.json'
import ordinaryTime from '../../data/loth/propers/ordinary-time.json'

// @fr FR-180
/**
 * 주님의 축일 제1저녁기도 — 주일에 걸릴 때만 (FR-180).
 *
 * 책은 주님 봉헌(p.821)·거룩한 변모(p.831)·십자가 현양(p.835)의 제1저녁기도
 * 앞에 «Хэрэв энэ баяр Ням гарагт таарвал …» 을 인쇄한다 — 축일이 주일에
 * 걸리는 해에만 바친다. 라테라노 대성전 봉헌(p.840)은 그 주석 없이 표제만
 * 인쇄하므로 매년 바친다. 데이터는 `firstVespers.sundayOnly` 로 이 차이를
 * 담고, 카드·라우트 적격성·전야 승격·`/firstVespers` 라우트가 모두
 * `eligibleSanctoralFirstVespers` 한 곳을 거친다.
 *
 * 이전에는 (1) 비주일 occurrence 에도 카드가 뜨고 전날 저녁이 축일
 * 제1저녁기도로 바뀌었고, (2) 주일 occurrence 에는 그 주석문을 `substitute
 * hymn` 지시로 잘못 부호화한 conditionalRubric 이 찬미가 자리에 주석문을
 * 렌더했다.
 */

type Cell = { gospelCanticleAntiphon?: string }
const feastCell = (mmdd: string, hour: string) =>
  ((feasts as Record<string, Record<string, unknown>>)[mmdd][hour] as Cell).gospelCanticleAntiphon ?? ''
const otSundayCell = (week: string, hour: string) =>
  ((ordinaryTime as { weeks: Record<string, Record<string, Record<string, Cell>>> }).weeks[week].SUN[hour])
    .gospelCanticleAntiphon ?? ''

const cards = (d: string) => getHoursSummary(d)?.hours.map((h) => h.type)
const dayBefore = (d: string) => {
  const t = new Date(d + 'T00:00:00Z')
  t.setUTCDate(t.getUTCDate() - 1)
  return t.toISOString().slice(0, 10)
}
const sectionOf = async (d: string, h: 'vespers' | 'firstVespers', type: string) => {
  const a = await assembleHour(d, h)
  return {
    hour: a,
    sec: a?.sections.find((s) => s.type === type) as Record<string, unknown> | undefined,
  }
}
const antiphon = async (d: string, h: 'vespers' | 'firstVespers') =>
  String((await sectionOf(d, h, 'gospelCanticle')).sec?.antiphon ?? '')
const hymnText = async (d: string, h: 'vespers' | 'firstVespers') => {
  const { sec } = await sectionOf(d, h, 'hymn')
  return String(sec?.text ?? sec?.content ?? '')
}

const RUBRIC_FRAGMENT = 'Ням гарагт таарвал'

describe('주님의 축일 제1저녁기도 — 주일에 걸릴 때만 (FR-180)', () => {
  describe('데이터 계약: feasts.json 의 sundayOnly', () => {
    it.each([
      ['02-02', 821],
      ['08-06', 831],
      ['09-14', 835],
    ])('%s firstVespers 는 sundayOnly (p.%i) 이고 conditionalRubrics 가 없다', (mmdd, page) => {
      const fv = (feasts as Record<string, Record<string, unknown>>)[mmdd].firstVespers as {
        sundayOnly?: { evidencePdf: { page: number; text: string } }
        conditionalRubrics?: unknown[]
      }
      expect(fv.sundayOnly?.evidencePdf.page).toBe(page)
      expect(fv.sundayOnly?.evidencePdf.text).toContain(RUBRIC_FRAGMENT)
      expect(fv.conditionalRubrics).toBeUndefined()
    })

    it('11-09 라테라노는 sundayOnly 가 없다 (p.840 — 주석 없이 표제만)', () => {
      const fv = (feasts as Record<string, Record<string, unknown>>)['11-09'].firstVespers as {
        sundayOnly?: unknown
      }
      expect(fv.sundayOnly).toBeUndefined()
    })
  })

  describe('비주일 occurrence: 제1저녁기도 없음', () => {
    const WEEKDAY_CASES: [string, string, string][] = [
      // [축일 날짜, MM-DD, 요일]
      ['2026-02-02', '02-02', 'MON'],
      ['2026-08-06', '08-06', 'THU'],
      ['2026-09-14', '09-14', 'MON'],
      ['2027-02-02', '02-02', 'TUE'],
    ]

    it.each(WEEKDAY_CASES)('%s (%s, %s) 는 /firstVespers 적격이 아니다', (d) => {
      expect(isFirstVespersEligibleDate(d)).toBe(false)
    })

    it.each(WEEKDAY_CASES)('%s 카드는 lauds/vespers/compline 뿐이다', (d) => {
      expect(cards(d)).toEqual(['lauds', 'vespers', 'compline'])
    })

    it.each(WEEKDAY_CASES)('%s 전날은 자기 저녁·밤 기도 카드를 지킨다', (d) => {
      // 전날이 주일이면 주일 자신의 제1저녁기도 카드(토요일 저녁분)는 그대로다 —
      // 여기서 보는 것은 저녁·밤 기도 카드가 축일에 밀려 사라지지 않는다는 것.
      const eve = cards(dayBefore(d))
      expect(eve).toContain('vespers')
      expect(eve).toContain('compline')
    })

    it.each(WEEKDAY_CASES)('%s 전날 저녁은 축일 제1저녁기도 후렴을 쓰지 않고 자기 정체성을 지킨다', async (d, mmdd) => {
      const eve = dayBefore(d)
      const { hour, sec } = await sectionOf(eve, 'vespers', 'gospelCanticle')
      expect(String(sec?.antiphon ?? '')).not.toBe(feastCell(mmdd, 'firstVespers'))
      expect(hour?.effectiveLiturgicalDay?.date ?? hour?.liturgicalDay.date).toBe(eve)
    })

    it('2026-02-01 (연중 4주일) 은 자기 제2저녁기도를 지킨다 — 월요일 주님 봉헌에 밀리지 않는다', async () => {
      // 주일 자신의 카드 5장 — 앞의 두 장은 주일 자신의 제1저녁기도(토요일 저녁분).
      expect(cards('2026-02-01')).toEqual(['firstVespers', 'firstCompline', 'lauds', 'vespers', 'compline'])
      expect(await antiphon('2026-02-01', 'vespers')).toBe(otSundayCell('4', 'vespers2'))
    })

    it('2026-09-13 (연중 24주일) 은 자기 제2저녁기도를 지킨다 — 월요일 십자가 현양에 밀리지 않는다', async () => {
      expect(cards('2026-09-13')).toEqual(['firstVespers', 'firstCompline', 'lauds', 'vespers', 'compline'])
      expect(await antiphon('2026-09-13', 'vespers')).toBe(otSundayCell('24', 'vespers2'))
    })
  })

  describe('주일 occurrence: 제1저녁기도를 바치고, 찬미가는 주석문이 아니다', () => {
    const SUNDAY_CASES: [string, string][] = [
      ['2025-02-02', '02-02'],
      ['2028-08-06', '08-06'],
      ['2025-09-14', '09-14'],
    ]

    it.each(SUNDAY_CASES)('%s 는 /firstVespers 적격이고 카드에 제1저녁·밤 기도가 있다', (d) => {
      expect(isFirstVespersEligibleDate(d)).toBe(true)
      expect(cards(d)).toEqual(['firstVespers', 'firstCompline', 'lauds', 'vespers', 'compline'])
      expect(cards(dayBefore(d))).toEqual(['lauds'])
    })

    it.each(SUNDAY_CASES)('%s /firstVespers 와 전날 토요일 저녁이 축일 제1저녁기도 후렴을 낸다', async (d, mmdd) => {
      expect(await antiphon(d, 'firstVespers')).toBe(feastCell(mmdd, 'firstVespers'))
      expect(await antiphon(dayBefore(d), 'vespers')).toBe(feastCell(mmdd, 'firstVespers'))
    })

    it.each(SUNDAY_CASES)('%s 찬미가 자리에 «Ням гарагт таарвал» 주석문이 없다 (라우트·전야 모두)', async (d) => {
      const route = await hymnText(d, 'firstVespers')
      const eve = await hymnText(dayBefore(d), 'vespers')
      expect(route).not.toContain(RUBRIC_FRAGMENT)
      expect(eve).not.toContain(RUBRIC_FRAGMENT)
      expect(route.length).toBeGreaterThan(0)
      expect(eve.length).toBeGreaterThan(0)
    })
  })

  describe('라테라노 대성전 봉헌 (11-09): 매년 제1저녁기도 — 무변경', () => {
    it.each(['2026-11-09', '2027-11-09'])('%s (평일) 는 여전히 /firstVespers 적격이다', (d) => {
      expect(isFirstVespersEligibleDate(d)).toBe(true)
      expect(cards(d)).toEqual(['firstVespers', 'firstCompline', 'lauds', 'vespers', 'compline'])
    })

    it('2026-11-08 (연중 32주일) 은 월요일 라테라노 제1저녁기도에 자리를 내준다', async () => {
      expect(cards('2026-11-08')).toEqual(['firstVespers', 'firstCompline', 'lauds'])
      expect(await antiphon('2026-11-08', 'vespers')).toBe(feastCell('11-09', 'firstVespers'))
    })
  })
})
