import { describe, it, expect } from 'vitest'
import { getHoursSummary, assembleHour, isFirstVespersEligibleDate } from '../loth-service'
import { getLiturgicalDay } from '../calendar'

const cards = (d: string) => getHoursSummary(d)?.hours.map((h) => h.type)

// @fr FR-175
/**
 * 저녁 시간대는 하루에 하나뿐이다 — 오늘의 제2저녁기도(Evening Prayer II)와
 * 내일의 제1저녁기도(First Vespers)가 같은 저녁을 놓고 겨룬다. 전례일 순위표
 * (보편규범 61항)가 승자를 정하고, 카드 목록과 본문은 **같은 답**을 내야 한다.
 *
 * 이 파일은 카드 목록이 본문과 어긋나 있던 두 부류를 고정한다.
 */
describe('제2저녁기도 vs 다음날 제1저녁기도 (FR-175)', () => {
  describe('부활 대축일에는 제1저녁기도가 없다 (부활 성야가 그 자리)', () => {
    // 인쇄면 근거: 책 p.690-693 부활 대축일 구역은
    //   «Дээгүүр өнгөрөх цаг улирлын эхлэл» → «Урих дуудлага»
    //   → «Өглөөний даатгал залбирал» → «Оройн даатгал залбирал»
    // 만 인쇄하고 «1 дүгээр Оройн даатгал залбирал» 표제가 없다. 대조:
    // 부활 제2주일은 p.701 에 그 표제를 명시 인쇄한다.
    const EASTERS = ['2026-04-05', '2027-03-28', '2028-04-16', '2030-04-21', '2033-04-17']
    const HOLY_SATURDAYS = ['2026-04-04', '2027-03-27', '2028-04-15', '2030-04-20', '2033-04-16']

    it.each(EASTERS)('%s 부활 대축일 카드에 firstVespers 가 없다', (d) => {
      expect(getLiturgicalDay(d)?.romcalKey).toBe('easter')
      expect(cards(d)).toEqual(['lauds', 'vespers', 'compline'])
    })

    it.each(EASTERS)('%s `/firstVespers` URL 은 적격이 아니다 (404)', (d) => {
      // 이전에는 SUN 단축평가로 적격 판정 → 라우트가 200 을 주고 backstop
      // merge 가 제2저녁기도를 복제해 보여줬다.
      expect(isFirstVespersEligibleDate(d)).toBe(false)
    })

    it.each(HOLY_SATURDAYS)('%s 성토요일이 자기 저녁기도·끝기도 카드를 되찾는다', async (d) => {
      // 책 p.683 이 «Ариун нандин гурван хоног» 안에 성토요일
      // «Оройн даатгал залбирал» 을 인쇄한다. 이전에는 "내일(부활)이
      // 제1저녁기도를 가진다" 는 오판 때문에 카드가 lauds 하나로 잘렸다.
      expect(getLiturgicalDay(d)?.romcalKey).toBe('holySaturday')
      expect(cards(d)).toEqual(['lauds', 'vespers', 'compline'])

      // 본문은 이전에도 자기 저녁기도를 렌더했다 — 카드만 어긋나 있었다.
      const body = await assembleHour(d, 'vespers')
      expect(body?.effectiveLiturgicalDay).toBeUndefined()
    })
  })

  describe('토요일 성탄: 성탄 제2저녁기도(I.2)가 성가정 제1저녁기도(II.5)를 이긴다', () => {
    const SATURDAY_CHRISTMASES = ['2027-12-25', '2032-12-25', '2038-12-25']

    it.each(SATURDAY_CHRISTMASES)('%s 저녁 카드가 유지된다', async (d) => {
      const day = getLiturgicalDay(d)
      expect(day?.romcalKey).toBe('christmas')
      expect(day?.rank).toBe('SOLEMNITY')
      // 성탄 자신의 제1저녁기도(전날 저녁) 카드 + 자기 저녁기도·끝기도.
      expect(cards(d)).toEqual([
        'firstVespers',
        'firstCompline',
        'lauds',
        'vespers',
        'compline',
      ])

      // 본문은 FR-173 의 `day.rank !== 'SOLEMNITY'` 게이트 덕에 이전부터
      // 성탄 제2저녁기도를 지키고 있었다 — 카드가 틀린 쪽이었다.
      const body = await assembleHour(d, 'vespers')
      expect(body?.effectiveLiturgicalDay).toBeUndefined()
    })
  })

  describe('회귀 가드 — 기존 우선순위 규칙은 그대로', () => {
    it('연중 주일(II.6)은 월요일 대축일(I.3) 제1저녁기도에 자리를 내준다', () => {
      // 2026-06-28 13주일 OT → 06-29 베드로·바오로 (#240 F-X5 FU#1)
      expect(cards('2026-06-28')).toEqual(['firstVespers', 'firstCompline', 'lauds'])
    })

    it('대림 제4주일은 성탄 제1저녁기도에 자리를 내준다 (보편규범 40항)', () => {
      // 2028-12-24 (#245 F-X5 FU#4)
      expect(cards('2028-12-24')).toEqual(['firstVespers', 'firstCompline', 'lauds'])
    })

    it('사순 주일(I.2)은 월요일 대축일에도 자기 제2저녁기도를 지킨다', () => {
      // 2028-03-19 사순 3주일 → 03-20 성 요셉 (전임)
      expect(cards('2028-03-19')).toContain('vespers')
      expect(cards('2028-03-19')).toContain('compline')
    })

    // FR-175 시점에는 "범위 밖, 현행 유지" 로 고정했던 케이스다. 사용자
    // 판단(2026-09-17)으로 보편 순위표를 적용하기로 해 FR-176 에서 뒤집혔고,
    // 그쪽 테스트 파일이 새 기대값을 가진다. 여기서는 옛 기대값이 남아
    // 이중 계약이 되지 않도록 제거한다.

    it('부활 8일 축제 토요일은 종전대로 다음 주일 제1저녁기도를 따른다', async () => {
      // 2026-04-11 — 부활 제2주일은 책 p.701 에 제1저녁기도를 인쇄한다.
      expect(cards('2026-04-11')).toEqual(['lauds'])
      const body = await assembleHour('2026-04-11', 'vespers')
      expect(body?.effectiveLiturgicalDay?.date).toBe('2026-04-12')
    })
  })
})
