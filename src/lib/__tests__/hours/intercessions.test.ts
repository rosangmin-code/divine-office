import { describe, it, expect } from 'vitest'
import { parseIntercessions } from '../../hours/intercessions'

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
