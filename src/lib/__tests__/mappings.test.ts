import { describe, test, expect } from 'vitest'
import {
  buildLiturgicalNameMn,
  MOVABLE_SOLEMNITY_NAMES_MN,
} from '../mappings'

describe('buildLiturgicalNameMn', () => {
  test('sanctoralName takes priority over everything', () => {
    expect(
      buildLiturgicalNameMn({
        season: 'EASTER',
        weekOfSeason: 6,
        dayOfWeek: 'THU',
        sanctoralName: '06-29 St. Peter and Paul',
        movableSolemnityName: 'Эзэний Тэнгэрт Заларсан нь — Их баяр',
      }),
    ).toBe('06-29 St. Peter and Paul')
  })

  test('movableSolemnityName falls in between sanctoral and weekday fallback', () => {
    expect(
      buildLiturgicalNameMn({
        season: 'EASTER',
        weekOfSeason: 6,
        dayOfWeek: 'THU',
        movableSolemnityName: 'Эзэний Тэнгэрт Заларсан нь — Их баяр',
      }),
    ).toBe('Эзэний Тэнгэрт Заларсан нь — Их баяр')
  })

  test('weekday fallback when neither sanctoral nor movable solemnity is set', () => {
    expect(
      buildLiturgicalNameMn({
        season: 'EASTER',
        weekOfSeason: 6,
        dayOfWeek: 'THU',
      }),
    ).toBe('Дээгүүр өнгөрөх цаг улирлын 6-р долоо хоног')
  })

  test('Sunday fallback uses "Ням" suffix', () => {
    expect(
      buildLiturgicalNameMn({
        season: 'ORDINARY_TIME',
        weekOfSeason: 34,
        dayOfWeek: 'SUN',
      }),
    ).toBe('Жирийн цаг улирлын 34-р Ням')
  })
})

describe('MOVABLE_SOLEMNITY_NAMES_MN', () => {
  // Canonical names — psalter.pdf headings, cross-checked against
  // readings/feasts.json missal (WI #6, 2026-05-22, user decision = keep
  // current). readings day_title fields are PDF parse artifacts (generic
  // Mass labels for ascension/pentecost, truncated for sacredHeart,
  // case-mangled for the rest) → not adoptable verbatim; cores agree with
  // the names below. Keys mirror resolveSpecialKey() in propers-loader.ts.
  test.each([
    ['ascension', 'Эзэний Тэнгэрт Заларсан нь — Их баяр'],
    ['pentecost', 'Пэнтикост — Ариун Сүнсний буулт — Их баяр'],
    ['trinitySunday', 'Туйлын Ариун Нандин Гурвалын Ням гараг — Их баяр'],
    ['corpusChristi', 'Христийн Туйлын Ариун Нандин Бие ба Цус — Их баяр'],
    ['sacredHeart', 'Есүсийн Туйлын Ариун Нандин Зүрх — Их баяр'],
    ['christTheKing', 'Есүс Христ Бидний Эзэн Ертөнцийн Хаан — Их баяр'],
  ])('%s → %s', (key, expected) => {
    expect(MOVABLE_SOLEMNITY_NAMES_MN[key]).toBe(expected)
  })

  test('covers all 6 movable solemnities exactly (no orphans)', () => {
    expect(Object.keys(MOVABLE_SOLEMNITY_NAMES_MN).sort()).toEqual(
      [
        'ascension',
        'christTheKing',
        'corpusChristi',
        'pentecost',
        'sacredHeart',
        'trinitySunday',
      ].sort(),
    )
  })
})
