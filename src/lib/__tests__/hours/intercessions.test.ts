import { describe, it, expect } from 'vitest'
import { parseIntercessions } from '../../hours/intercessions'
import week4 from '../../../data/loth/psalter/week-4.json'

describe('parseIntercessions', () => {
  describe('psalter commons format (multi-line intro + single-line refrain + " - " separator)', () => {
    // week-1.json 일요일 lauds 실제 원본
    const raw = [
      'Христ бол хэзээ ч жаргахгүй нар, хүн бүрийн',
      'дээрээс тусдаг үнэн гэрэл билээ. Бүгдээрээ Түүнд',
      'хандан залбирч алдаршуулцгаая:',
      'Эзэн, Та бол бидний амь болон аврал билээ.',
      'Оддын бүтээгч ээ, үүрийн туяаг хайрласан',
      'хишигт тань бид талархъя. - Мөн Таны амилалтыг бид дурсан санаж байна.',
      'Таны Ариун Сүнс бидэнд өнөөдөр Таны дур',
      'тааллыг биелүүлэхэд туслах болтугай. - Мөн Таны билиг ухаан биднийг үргэлж удирдан',
      'залах болтугай.',
      'Ням гараг бүрт Таны үг болон Таны тахилын',
      'ширээний дэргэд цугларсан Таны ард түмэн',
      'лүгээ нэгэн адил биднийг - Та баясган цэнгүүлнэ үү.',
      'Бид Таны хязгааргүй их адислалд - Чин зүрхнээсээ талархаж байна.',
      '“Тэнгэр дэх Эцэг минь ээ...”',
    ]

    const parsed = parseIntercessions(raw)

    it('joins multi-line intro into a single paragraph ending without colon', () => {
      expect(parsed.introduction).toBeDefined()
      expect(parsed.introduction).toContain('Христ бол')
      expect(parsed.introduction).toContain('алдаршуулцгаая')
      expect(parsed.introduction?.endsWith(':')).toBe(false)
    })

    it('extracts refrain as the line immediately after the colon-terminated intro', () => {
      expect(parsed.refrain).toBe('Эзэн, Та бол бидний амь болон аврал билээ.')
    })

    it('splits each petition into versicle and response around the " - " separator', () => {
      expect(parsed.petitions).toHaveLength(4)
      expect(parsed.petitions[0]).toEqual({
        versicle: expect.stringContaining('хишигт тань бид талархъя.'),
        response: expect.stringContaining('Мөн Таны амилалтыг'),
      })
      // 각 petition에 응답이 모두 존재
      for (const p of parsed.petitions) {
        expect(p.response).toBeTruthy()
      }
    })

    it('merges multi-line responses into a single response field', () => {
      const second = parsed.petitions[1]
      expect(second.versicle).toContain('Ариун Сүнс')
      expect(second.response).toContain('билиг ухаан')
      expect(second.response).toContain('залах болтугай')
    })

    it('extracts the Lord\'s Prayer hint into closing', () => {
      expect(parsed.closing).toContain('Тэнгэр дэх Эцэг')
    })
  })

  describe('seasonal propers format (intro+refrain on same line + " — " separator)', () => {
    // advent.json 대림 1주 주일 vespers 실제 원본
    const raw = [
      'Есүс Христ бол Түүний ирэлтийг хүсэн хүлээж буй бүх хүмүүсийн баяр баясгалан аз жаргал юм. Бүгдээрээ Түүнд хандан ийн залбирцгаая: Эзэн ирэгтүн, хоцролгүй ирэгтүн!',
      'Бид Таны ирэхийг баяртайгаар хүлээж байгаа тул — Ирэгтүн! Эзэн Есүс ээ.',
      'Цаг нь болохоос өмнө Та Эцэгтэйгээ амьдралыг хуваалцсан тул — Ирэгтүн! Биднийг аварна уу.',
      'Та энэ ертөнцийг болон түүн дээр амьдрах бүх хүмүүсийг бүтээсэн тул — Ирэгтүн! Өөрийн гарын бүтээлүүдээ аварна уу.',
      'Та үхлийн эрх мэдэл дор хүмүүн болохоос татгалзаагүй тул — Ирэгтүн! Үхлийн эрх мэдлээс биднийг аварна уу.',
      'Та бидэнд бялхам амийг өгөхөөр ирсэн юм. — Ирэгтүн! Мөнхийн амийг бидэнд хайрлана уу.',
      'Та бүх хүмүүсийг хаанчлалынхаа хайраар амьдруулахыг таалдаг тул — Ирэгтүн! Тантай нүүр тулан уулзахыг хүссэн тэдгээр хүмүүсийг цуглуулна уу.',
    ]

    const parsed = parseIntercessions(raw)

    it('splits intro and refrain when they share one string separated by colon', () => {
      expect(parsed.introduction).toContain('Есүс Христ бол')
      expect(parsed.introduction).toContain('залбирцгаая')
      expect(parsed.introduction?.endsWith(':')).toBe(false)
      expect(parsed.refrain).toBe('Эзэн ирэгтүн, хоцролгүй ирэгтүн!')
    })

    it('parses 6 petitions with versicle and response from em-dash separator', () => {
      expect(parsed.petitions).toHaveLength(6)
      expect(parsed.petitions[0].versicle).toContain('Бид Таны ирэхийг')
      expect(parsed.petitions[0].response).toBe('Ирэгтүн! Эзэн Есүс ээ.')
    })

    it('has no closing when source omits the Lord\'s Prayer hint', () => {
      expect(parsed.closing).toBeUndefined()
    })
  })

  // GOAL #51 / WI-52 (@fr FR-150) — multi-element (wrapped) refrain regression.
  // Root cause (#50 diagnosis): a psalter-format refrain that the source PDF
  // wrapped across 2+ array elements was captured as a SINGLE element, so the
  // tail was dropped from the refrain AND mis-absorbed as a prefix into the
  // first petition's versicle. Fix: accumulate continuation elements up to the
  // sentence-ending boundary or the first petition SEPARATOR, without
  // over-accumulating single-element refrains.
  describe('psalter commons format — multi-element (wrapped) refrain accumulation', () => {
    it('restores the full wrapped refrain and leaves petition[0].versicle uncontaminated (week-4 WED vespers, p470)', () => {
      // Real production data — the exact user-reported 2026-05-27 Vespers case.
      const raw = (week4 as { days: Record<string, { vespers: { intercessions: string[] } }> })
        .days.WED.vespers.intercessions
      const parsed = parseIntercessions(raw)
      // Refrain restored end-to-end (was truncated at "...Таны дотор").
      expect(parsed.refrain).toBe(
        'Эзэн, Танд итгэж найддаг бүгд Таны дотор баясан цэнгэх болтугай.',
      )
      // The recovered tail no longer pollutes the first petition's versicle.
      expect(parsed.petitions[0].versicle).toBe(
        'Эзэн, Та Өөрийн Хүүгээ энэ ертөнцийг шүүхээр бус харин аврахаар илгээснээ санагтун.',
      )
      expect(parsed.petitions[0].versicle).not.toContain('баясан цэнгэх болтугай')
      expect(parsed.petitions).toHaveLength(5)
    })

    it('accumulates a wrapped refrain up to the sentence-ending boundary', () => {
      const raw = [
        'Бид Түүнд хандан ийн залбирцгаая:',
        'Эзэн минь, биднийг сонсож', // refrain line 1 — no sentence end
        'хайрлан соёрхоно уу.', // refrain line 2 — sentence end → stop accumulating
        'Та биднийг хайрласан тул - Бид Танд талархъя.', // first petition (separator)
      ]
      const parsed = parseIntercessions(raw)
      expect(parsed.refrain).toBe('Эзэн минь, биднийг сонсож хайрлан соёрхоно уу.')
      expect(parsed.petitions).toHaveLength(1)
      expect(parsed.petitions[0].versicle).toBe('Та биднийг хайрласан тул')
      expect(parsed.petitions[0].response).toBe('Бид Танд талархъя.')
    })

    it('stops at the first petition SEPARATOR boundary even when the refrain lacks end punctuation', () => {
      const raw = [
        'Бид Түүнд хандан ийн залбирцгаая:',
        'Эзэн минь, биднийг сонсооч', // refrain — no sentence end, next line is a petition
        'Та биднийг бүтээсэн тул - Бид Танд талархъя.', // separator boundary → refrain stops here
      ]
      const parsed = parseIntercessions(raw)
      expect(parsed.refrain).toBe('Эзэн минь, биднийг сонсооч')
      expect(parsed.petitions).toHaveLength(1)
      expect(parsed.petitions[0].versicle).toBe('Та биднийг бүтээсэн тул')
    })

    it('does NOT over-accumulate a single-element refrain that is already sentence-complete', () => {
      const raw = [
        'Бид Түүнд хандан ийн залбирцгаая:',
        'Эзэн минь, биднийг адислаач.', // single-element refrain ending in "." → stop after one element
        'Та биднийг бүтээсэн тул - Бид Танд талархъя.', // must remain the petition, not be pulled into refrain
      ]
      const parsed = parseIntercessions(raw)
      expect(parsed.refrain).toBe('Эзэн минь, биднийг адислаач.')
      expect(parsed.petitions).toHaveLength(1)
      expect(parsed.petitions[0].versicle).toBe('Та биднийг бүтээсэн тул')
    })
  })

  describe('fallback', () => {
    it('returns an empty petitions array for empty input', () => {
      expect(parseIntercessions([])).toEqual({ petitions: [] })
    })

    it('produces no petitions when neither colon nor separator appears', () => {
      const parsed = parseIntercessions(['just a line', 'another line'])
      expect(parsed.petitions).toHaveLength(0)
      expect(parsed.refrain).toBeUndefined()
    })
  })
})
