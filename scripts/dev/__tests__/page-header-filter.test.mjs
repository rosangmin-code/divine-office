// F-X16 (#508) — page-header filter pattern coverage.
//
// Mirror of scripts/lib/__tests__/test_page_header_filter.py. Both
// files MUST stay in sync — the Node + Python implementations are
// kept structurally identical (see scripts/dev/page-header-filter.mjs
// and scripts/lib/extract-paragraphs-from-pdf.py module headers).
//
// 8+ minimum cases per dispatch contract:
//   A-1 (Compline section header)  PASS + FAIL
//   A-2 (bare nominative weekday)  PASS + FAIL
//   A-3 (caps weekday — i flag)    PASS
//   A-4 (ordinal week label)       PASS + FAIL
// Plus regression locks for the original four patterns so the new
// rules cannot silently weaken existing coverage.

import { describe, expect, test } from 'vitest'

import { isPageHeaderLine, stripPageHeaders } from '../page-header-filter.mjs'

describe('F-X16 A-1 — Compline section header literal', () => {
  test('PASS: filters bare "Шөнийн даатгал залбирал"', () => {
    expect(isPageHeaderLine('Шөнийн даатгал залбирал')).toBe(true)
  })

  test('PASS: tolerates leading/trailing whitespace', () => {
    expect(isPageHeaderLine('   Шөнийн даатгал залбирал   ')).toBe(true)
  })

  test('PASS: tolerates extra inner whitespace (PDF column spacing)', () => {
    expect(isPageHeaderLine('Шөнийн   даатгал   залбирал')).toBe(true)
  })

  test('FAIL (confounding): does NOT filter body sentence containing the literal', () => {
    // Body verse that happens to start with the section title — must
    // remain visible (parallel to existing 'Магтаалыг өргөгтүн' case).
    expect(isPageHeaderLine('Шөнийн даатгал залбирал нь сайн юм')).toBe(false)
  })
})

describe('F-X16 A-2 — bare nominative weekday header', () => {
  test('PASS: filters "Баасан гараг"', () => {
    expect(isPageHeaderLine('Баасан гараг')).toBe(true)
  })

  test('PASS: filters "Бямба гараг"', () => {
    expect(isPageHeaderLine('Бямба гараг')).toBe(true)
  })

  test('PASS: filters all 7 weekdays in nominative bare form', () => {
    for (const wd of ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба']) {
      expect(isPageHeaderLine(`${wd} гараг`)).toBe(true)
    }
  })

  test('FAIL: does NOT filter genitive form "Баасан гарагт" (different word, "on Friday")', () => {
    // 'гарагт' (locative) ≠ 'гараг' (nominative). The end-anchor must
    // reject inflected forms so body text like "Баасан гарагт болсон"
    // survives.
    expect(isPageHeaderLine('Баасан гарагт')).toBe(false)
  })

  test('FAIL: does NOT filter "Баасан" alone (no гараг token)', () => {
    expect(isPageHeaderLine('Баасан')).toBe(false)
  })
})

describe('F-X16 A-3 — uppercase weekday header (i flag)', () => {
  test('PASS: filters "БААСАН ГАРАГ"', () => {
    expect(isPageHeaderLine('БААСАН ГАРАГ')).toBe(true)
  })

  test('PASS: filters "НЯМ ГАРАГ"', () => {
    expect(isPageHeaderLine('НЯМ ГАРАГ')).toBe(true)
  })

  test('PASS: filters all 7 weekdays in caps form', () => {
    for (const wd of ['НЯМ', 'ДАВАА', 'МЯГМАР', 'ЛХАГВА', 'ПҮРЭВ', 'БААСАН', 'БЯМБА']) {
      expect(isPageHeaderLine(`${wd} ГАРАГ`)).toBe(true)
    }
  })
})

describe('F-X16 A-4 — ordinal week label (page-less)', () => {
  test('PASS: filters "Эхний Долоо хоног"', () => {
    expect(isPageHeaderLine('Эхний Долоо хоног')).toBe(true)
  })

  test('PASS: filters "Хоёр дахь Долоо хоног"', () => {
    expect(isPageHeaderLine('Хоёр дахь Долоо хоног')).toBe(true)
  })

  test('PASS: filters all 4 ordinal labels (Эхний/Хоёр/Гурав/Дөрөв дахь)', () => {
    expect(isPageHeaderLine('Эхний Долоо хоног')).toBe(true)
    expect(isPageHeaderLine('Хоёр дахь Долоо хоног')).toBe(true)
    expect(isPageHeaderLine('Гурав дахь Долоо хоног')).toBe(true)
    expect(isPageHeaderLine('Дөрөв дахь Долоо хоног')).toBe(true)
  })

  test('FAIL (confounding): existing NUMBERED_WEEK_HEADER_RE still catches "85 1 дугаар долоо хоног"', () => {
    // Distinct pattern (page-prefixed) — must remain caught by the
    // pre-existing regex, NOT by the new ordinal regex (which
    // requires a leading ordinal word).
    expect(isPageHeaderLine('85 1 дугаар долоо хоног')).toBe(true)
  })
})

describe('Regression — original four patterns still match', () => {
  test('WEEKDAY_HEADER_RE: "Даваа гарагийн орой 85"', () => {
    expect(isPageHeaderLine('Даваа гарагийн орой 85')).toBe(true)
  })

  test('NUMBERED_WEEK_HEADER_RE: "85 1 дугаар долоо хоног"', () => {
    expect(isPageHeaderLine('85 1 дугаар долоо хоног')).toBe(true)
  })

  test('BARE_PAGE_NUMBER_RE: "85"', () => {
    expect(isPageHeaderLine('85')).toBe(true)
  })

  test('SECTION_TITLE_RE: "Магтаал" (existing literal still catches)', () => {
    expect(isPageHeaderLine('Магтаал')).toBe(true)
  })

  test('SECTION_TITLE_RE: "Дууллыг төгсгөх залбирал" (existing literal)', () => {
    expect(isPageHeaderLine('Дууллыг төгсгөх залбирал')).toBe(true)
  })

  test('FAIL (regression lock): body text "Магтаалыг өргөгтүн" must remain visible', () => {
    // The classic confounding case from R-9.C — the new patterns must
    // not regress this.
    expect(isPageHeaderLine('Магтаалыг өргөгтүн')).toBe(false)
  })

  test('empty / whitespace-only line returns false', () => {
    expect(isPageHeaderLine('')).toBe(false)
    expect(isPageHeaderLine('   ')).toBe(false)
    expect(isPageHeaderLine(null)).toBe(false)
    expect(isPageHeaderLine(undefined)).toBe(false)
  })
})

describe('stripPageHeaders integration', () => {
  test('drops a mixed batch covering all 4 new + 4 original patterns', () => {
    const lines = [
      'Шөнийн даатгал залбирал', // A-1
      'Бямба гараг', // A-2
      'БААСАН ГАРАГ', // A-3
      'Эхний Долоо хоног', // A-4
      'Даваа гарагийн орой 85', // original (a)
      '85 1 дугаар долоо хоног', // original (b)
      '85', // original (c)
      'Магтаал', // original (R-9.C)
      'Бид Эзэнд талархъя.', // body — must remain
      'Магтаалыг өргөгтүн', // body — confounding, must remain
    ]
    const result = stripPageHeaders(lines)
    expect(result).toEqual(['Бид Эзэнд талархъя.', 'Магтаалыг өргөгтүн'])
  })
})
