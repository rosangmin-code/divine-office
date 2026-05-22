import { describe, test, expect } from 'vitest'
import {
  buildLiturgicalNameMn,
  MOVABLE_SOLEMNITY_NAMES_MN,
} from '../mappings'
import { resolveSpecialKey } from '../propers-loader'

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

// WI #6 review-iter1 follow-up (dvo-rev-cl ISSUE-1) — drift guard.
// MOVABLE_SOLEMNITY_NAMES_MN is a curated SUBSET of resolveSpecialKey()'s
// keys; the wiring's correctness depends on (a) the 6 movable keys the
// resolver returns being PRESENT in the map, and (b) the resolver's other
// keys being ABSENT (so they fall through). These tests pin both against
// the LIVE resolver so a future rename / key drift on either side fails
// loudly instead of silently producing a generic name.
describe('resolveSpecialKey → MOVABLE_SOLEMNITY_NAMES_MN drift guard', () => {
  // (season, romcal-style celebrationName, expected resolver key). Names
  // mirror resolveSpecialKey()'s permissive `lower.includes(...)` matchers.
  test.each([
    ['EASTER', 'The Ascension of the Lord', 'ascension'],
    ['EASTER', 'Pentecost Sunday', 'pentecost'],
    ['ORDINARY_TIME', 'The Most Holy Trinity', 'trinitySunday'],
    ['ORDINARY_TIME', 'The Most Holy Body and Blood of Christ (Corpus Christi)', 'corpusChristi'],
    ['ORDINARY_TIME', 'The Most Sacred Heart of Jesus', 'sacredHeart'],
    ['ORDINARY_TIME', 'Our Lord Jesus Christ, King of the Universe', 'christTheKing'],
  ] as const)(
    'resolveSpecialKey(%s, %s) → %s is mapped to a name',
    (season, name, expectedKey) => {
      const key = resolveSpecialKey(season, name, '2026-05-14')
      expect(key).toBe(expectedKey)
      // The resolved key MUST have a Mongolian name (catches a rename on
      // either side that would otherwise fall through to a generic label).
      expect(MOVABLE_SOLEMNITY_NAMES_MN[key as string]).toBeTruthy()
    },
  )

  // Non-movable special keys resolveSpecialKey() also returns MUST stay
  // ABSENT from the map → undefined → buildLiturgicalNameMn falls through
  // to their sanctoral / weekday name (verified by reviewer regression
  // controls: Easter Sunday / Christmas / Mary Mother of God unaffected).
  test.each(['easterSunday', 'holyFamily', 'baptism', 'epiphany', 'dec25', 'jan1', 'octave'])(
    'non-movable special key %s is intentionally NOT mapped (fall-through)',
    (key) => {
      expect(MOVABLE_SOLEMNITY_NAMES_MN[key]).toBeUndefined()
    },
  )

  // Sanity: an unmapped key flowing through buildLiturgicalNameMn yields
  // the weekday fallback, not a crash or a stray movable name.
  test('undefined movableSolemnityName → weekday/Sunday fallback', () => {
    expect(
      buildLiturgicalNameMn({
        season: 'EASTER',
        weekOfSeason: 7,
        dayOfWeek: 'SUN',
        movableSolemnityName: MOVABLE_SOLEMNITY_NAMES_MN['easterSunday'],
      }),
    ).toBe('Дээгүүр өнгөрөх цаг улирлын 7-р Ням')
  })
})
