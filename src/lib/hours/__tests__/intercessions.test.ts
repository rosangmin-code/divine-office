import { describe, expect, it } from 'vitest'
import { parseIntercessions } from '../intercessions'
import week2 from '../../../data/loth/psalter/week-2.json'

type IntercessionsHost = {
  days: Record<
    string,
    Record<string, { intercessions: string[] }>
  >
}

describe('parseIntercessions — GOAL #125 parenthesized alternate boundary RED', () => {
  it('keeps Week 2 Wednesday Vespers alternate pair separate from the following petition', () => {
    const raw = (week2 as unknown as IntercessionsHost).days.WED.vespers
      .intercessions

    expect(raw).toEqual(
      expect.arrayContaining([
        '(эсвэл Аяа, Эзэн, Та бүх зовлон зүдгүүрээс',
        'биднийг аварна уу. - Бидний гэрүүдийг адисална уу)',
        'Та итгэлт талийгаачдад Өөрийнхөө царайгаа',
        'харуулна уу. - Тэднийг Өөрийн оршихуйгаар баярлуулна уу.',
      ]),
    )

    const parsed = parseIntercessions(raw)

    expect(parsed.petitions[4].versicle).toBe(
      '(эсвэл Аяа, Эзэн, Та бүх зовлон зүдгүүрээс биднийг аварна уу.',
    )
    expect(parsed.petitions[4].response).toBe(
      'Бидний гэрүүдийг адисална уу)',
    )
    expect(parsed.petitions[5].versicle).toBe(
      'Та итгэлт талийгаачдад Өөрийнхөө царайгаа харуулна уу.',
    )
    expect(parsed.petitions[5].response).toBe(
      'Тэднийг Өөрийн оршихуйгаар баярлуулна уу.',
    )
  })
})
