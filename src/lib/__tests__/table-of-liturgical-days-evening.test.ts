import { describe, it, expect } from 'vitest'
import { getHoursSummary, assembleHour } from '../loth-service'
import { getLiturgicalDay } from '../calendar'
import solemnities from '../../data/loth/sanctoral/solemnities.json'
import feasts from '../../data/loth/sanctoral/feasts.json'

const cards = (d: string) => getHoursSummary(d)?.hours.map((h) => h.type)
const section = async (d: string, h: 'vespers' | 'firstVespers', type: string) => {
  const a = await assembleHour(d, h)
  return {
    hour: a,
    sec: a?.sections.find((s) => s.type === type) as Record<string, unknown> | undefined,
  }
}
const antiphon = async (d: string, h: 'vespers' | 'firstVespers') =>
  String((await section(d, h, 'gospelCanticle')).sec?.antiphon ?? '')

type Cell = { gospelCanticleAntiphon?: string }
const cell = (src: Record<string, unknown>, mmdd: string, hour: string) =>
  ((src[mmdd] as Record<string, unknown>)[hour] as Cell).gospelCanticleAntiphon ?? ''

// @fr FR-176
/**
 * 전례일 순위표(보편규범 61항)를 저녁 시간대에 적용한다. 몽골어 책은 순위표
 * 자체를 인쇄하지 않으므로, 어느 기도를 바칠지는 사용자 판단(2026-09-17)으로
 * 정해졌다 — 보편 순위표를 따른다.
 */
describe('전례일 순위표 — 저녁 시간대 우선순위 (FR-176)', () => {
  describe('(a) 공현(I.2) > 하느님의 어머니(I.3): 1월 1일이 토요일인 해', () => {
    // 책은 두 기도문을 모두 인쇄한다 — 1월 1일 제2저녁기도 p.608,
    // 공현 제1저녁기도 후렴 p.609(구역 맨 앞, 표제 없이).
    const JAN1_SATURDAYS = ['2028-01-01', '2033-01-01', '2039-01-01']

    it.each(JAN1_SATURDAYS)('%s 저녁은 공현 제1저녁기도다', async (d) => {
      const epiphany = new Date(d + 'T00:00:00Z')
      epiphany.setUTCDate(epiphany.getUTCDate() + 1)
      const epiphanyStr = epiphany.toISOString().slice(0, 10)
      expect(getLiturgicalDay(epiphanyStr)?.romcalKey, d).toBe('epiphany')

      // 전야 URL 이 공현 제1저녁기도 후렴을 렌더한다 (1월 1일 제2저녁기도 아님).
      expect(await antiphon(d, 'vespers')).toBe(await antiphon(epiphanyStr, 'firstVespers'))
      expect(await antiphon(d, 'vespers')).not.toBe(cell(solemnities, '01-01', 'vespers2'))
      // 승격된 정체성을 선언한다.
      const { hour } = await section(d, 'vespers', 'gospelCanticle')
      expect(hour?.effectiveLiturgicalDay?.date).toBe(epiphanyStr)
    })

    it('평범한 해의 공현 전야와 같은 본문을 낸다 (2026-01-03 토)', async () => {
      // 2026 은 공현 전날이 평범한 토요일이라 예전부터 정상 동작했다.
      // 2028 은 그 토요일이 1월 1일이라 성인 고유부가 이겨버렸던 것.
      expect(await antiphon('2028-01-01', 'vespers')).toBe(
        await antiphon('2026-01-03', 'vespers'),
      )
    })
  })

  describe('(b) 토요일 대축일(I.3) > 다음날 연중 주일(II.6)', () => {
    const CASES = [
      ['2026-08-15', '08-15'],
      ['2030-06-29', '06-29'],
      ['2031-11-01', '11-01'],
      ['2028-06-24', '06-24'],
      ['2034-06-24', '06-24'],
    ] as const

    it.each(CASES)('%s 카드가 저녁기도·끝기도를 유지한다', async (d) => {
      expect(cards(d)).toEqual([
        'firstVespers',
        'firstCompline',
        'lauds',
        'vespers',
        'compline',
      ])
    })

    it.each(CASES)('%s 본문이 자기 제2저녁기도를 렌더한다', async (d, mmdd) => {
      expect(await antiphon(d, 'vespers')).toBe(cell(solemnities, mmdd, 'vespers2'))
      const { hour } = await section(d, 'vespers', 'gospelCanticle')
      expect(hour?.effectiveLiturgicalDay).toBeUndefined()
    })

    it('주님의 축일(II.5)도 같다 — 2030-02-02 주님 봉헌', async () => {
      expect(cards('2030-02-02')).toContain('vespers')
      expect(await antiphon('2030-02-02', 'vespers')).toBe(cell(feasts, '02-02', 'vespers2'))
    })

    it('사순·대림 주일(I.2)은 여전히 이긴다 — 2028-03-25 주님 탄생 예고', async () => {
      // 탄생 예고(I.3) < 사순 4주일(I.2) → 주일 제1저녁기도가 이긴다.
      expect(cards('2028-03-25')).toEqual(['firstVespers', 'firstCompline', 'lauds'])
      const { hour } = await section('2028-03-25', 'vespers', 'gospelCanticle')
      expect(hour?.effectiveLiturgicalDay?.date).toBe('2028-03-26')
    })

    it('성인 축일(II.7)은 주일을 이기지 못한다 — 2026-07-25 성 야고보', async () => {
      // 책이 제2저녁기도를 인쇄하지 않는(=`vespers2` 없는) 축일은 규칙 밖.
      expect(cards('2026-07-25')).toEqual(['lauds'])
    })
  })

  describe('(c) 승격된 저녁에는 오늘의 성인 고유부가 얹히지 않는다', () => {
    it.each([
      ['2028-03-25', '03-25', '2028-03-26'],
      ['2029-12-08', '12-08', '2029-12-09'],
      ['2033-03-19', '03-19', '2033-03-20'],
    ])('%s 저녁은 %s 가 아니라 다음날 주일의 후렴', async (d, mmdd, sunday) => {
      const got = await antiphon(d, 'vespers')
      expect(got).not.toBe(cell(solemnities, mmdd, 'vespers2'))
      expect(got).not.toBe(cell(solemnities, mmdd, 'vespers'))
      const { hour } = await section(d, 'vespers', 'gospelCanticle')
      expect(hour?.effectiveLiturgicalDay?.date).toBe(sunday)
    })
  })
})

// @fr FR-177
/**
 * 주님의 축일 4개(주님 봉헌 02-02 · 거룩한 변모 08-06 · 십자가 현양 09-14 ·
 * 라테라노 대성전 봉헌 11-09)는 **당일 저녁기도가 제1저녁기도로** 렌더되고
 * 있었다 — `vespers2` 스위치가 SOLEMNITY 로만 게이트돼 있어서. 매년 4일.
 *
 * 책 p.821 적색 규정이 그 셀의 정체를 명시한다:
 * «Хэрэв энэ баяр Ням гарагт таарвал 1 дүгээр Оройн даатгал залбирал уншина.»
 * (이 축일이 주일에 걸리면 제1저녁기도를 읽는다.) p.831·p.835 동일,
 * p.840(라테라노)은 표제만 있고 주석이 없으며 데이터가 그 차이를 그대로 담고 있다.
 */
describe('주님의 축일 당일 저녁기도 = 제2저녁기도 (FR-177)', () => {
  const FEASTS = ['02-02', '08-06', '09-14', '11-09'] as const

  it.each(FEASTS)('%s — 2026~2029 매 해 제2저녁기도를 렌더한다', async (mmdd) => {
    for (const y of [2026, 2027, 2028, 2029]) {
      const d = `${y}-${mmdd}`
      if (getLiturgicalDay(d)?.rank !== 'FEAST') continue // 주일에 밀린 해는 건너뜀
      expect(await antiphon(d, 'vespers'), d).toBe(cell(feasts, mmdd, 'vespers2'))
      expect(await antiphon(d, 'vespers'), d).not.toBe(cell(feasts, mmdd, 'vespers'))
    }
  })

  it('제1저녁기도 셀은 `/firstVespers` 경로에만 쓰인다', async () => {
    // FR-180: 십자가 현양의 제1저녁기도는 주일에 걸린 해(2025)에만 있다.
    expect(await antiphon('2025-09-14', 'firstVespers')).toBe(cell(feasts, '09-14', 'firstVespers'))
  })

  it('대축일은 종전대로 제2저녁기도 (회귀 가드)', async () => {
    expect(await antiphon('2026-06-29', 'vespers')).toBe(cell(solemnities, '06-29', 'vespers2'))
  })
})
