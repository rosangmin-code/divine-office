/**
 * NFR-002 — 성경 참조 책 이름 몽골어 표기 (`scripture-ref-mn.ts`).
 *
 * 시편·찬가 헤더/aria-label 이 데이터의 영문 `reference`(`Psalm 63:2-9`) 를
 * 그대로 노출하던 문제(app-review 2026-09-13 §2·§3.3)의 변환 계약:
 *   - 책 이름만 몽골어, 장:절은 문자열 그대로
 *   - 이미 키릴이면 통과
 *   - 미지 책은 원문 유지 + console.warn 1회
 *   - 정적 상수 `BOOK_NAMES_MN` 은 `src/data/bible/*.jsonl` 의 `book_mn` 과
 *     일치 (PDF 표기가 다른 책은 `PDF_OVERRIDES` 로 명시)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  BOOK_NAMES_MN,
  PDF_OVERRIDES,
  formatRefMn,
  hasMongolianBookName,
  resolveBookKeyMn,
  __resetRefMnWarnings,
} from '../scripture-ref-mn'
import { BOOK_NAME_MAP } from '../scripture-ref-parser'

// @fr NFR-002
describe('formatRefMn — 책 이름만 몽골어, 장:절 원문 유지', () => {
  beforeEach(() => {
    __resetRefMnWarnings()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('시편: Psalm → Дуулал (PDF L1810 `Дуулал 63:2-9`)', () => {
    expect(formatRefMn('Psalm 63:2-9')).toBe('Дуулал 63:2-9')
    expect(formatRefMn('Psalm 141:1-9')).toBe('Дуулал 141:1-9')
    // 장만 있는 형식 (compline `Psalm 4`, `Psalm 134`)
    expect(formatRefMn('Psalm 4')).toBe('Дуулал 4')
  })

  it('찬가: 쉼표 병기 절 표기를 그대로 둔다 (PDF L1877 `Даниел 3:57-88, 56`)', () => {
    expect(formatRefMn('Daniel 3:57-88, 56')).toBe('Даниел 3:57-88, 56')
    expect(formatRefMn('Psalm 110:1-5, 7')).toBe('Дуулал 110:1-5, 7')
    expect(formatRefMn('Romans 11:25, 30-36')).toBe('Ром 11:25, 30-36')
  })

  it('번호 접두 책 (1 Chronicles / 1 Peter / 1 Samuel)', () => {
    expect(formatRefMn('1 Chronicles 29:10-13')).toBe('1 Шастир 29:10-13')
    expect(formatRefMn('1 Peter 2:21-24')).toBe('1 Петр 2:21-24')
    expect(formatRefMn('1 Samuel 2:1-10')).toBe('1 Самуел 2:1-10')
    expect(formatRefMn('2 Peter 1:19-21')).toBe('2 Петр 1:19-21')
  })

  it('제2경전은 PDF 인쇄 표기 (Тобит L3038 / Иудит L3635 / Мэргэн ухаан L13528 / Сирак L6650)', () => {
    expect(formatRefMn('Tobit 13:1-8')).toBe('Тобит 13:1-8')
    expect(formatRefMn('Judith 16:2-3a, 13-15')).toBe('Иудит 16:2-3a, 13-15')
    expect(formatRefMn('Wisdom 9:1-6, 9-11')).toBe('Мэргэн ухаан 9:1-6, 9-11')
    expect(formatRefMn('Sirach 36:1-5, 10-13')).toBe('Сирак 36:1-5, 10-13')
  })

  it('Revelation 은 PDF 표기 Илчлэл (jsonl `Илчлэлт` 아님)', () => {
    expect(formatRefMn('Revelation 19:1-7')).toBe('Илчлэл 19:1-7')
    // 세미콜론 다중 장 표기도 뒤쪽은 원문 그대로
    expect(formatRefMn('Revelation 4:11; 5:9-10, 12')).toBe('Илчлэл 4:11; 5:9-10, 12')
  })

  it('절 접미(a/b, 키릴 б/а)는 원문 유지', () => {
    expect(formatRefMn('Isa 53:11b-12')).toBe('Исаиа 53:11b-12')
    expect(formatRefMn('Colossians 1:2б-6')).toBe('Колоссай 1:2б-6')
    expect(formatRefMn('Judith 16:2-3а, 13-15')).toBe('Иудит 16:2-3а, 13-15')
    expect(formatRefMn('Exod 19:4-6a')).toBe('Гэтлэл 19:4-6a')
  })

  it('짧은 독서 영문 약어 (propers 실측 형태)', () => {
    expect(formatRefMn('Rom 13:11-14')).toBe('Ром 13:11-14')
    expect(formatRefMn('Heb 8:1b-3a')).toBe('Еврей 8:1b-3a')
    expect(formatRefMn('Jas 5:16,19-20')).toBe('Иаков 5:16,19-20')
    expect(formatRefMn('Phil 3:20b-21')).toBe('Филиппой 3:20b-21')
    expect(formatRefMn('Eph 2:3b-5')).toBe('Ефес 2:3b-5')
    expect(formatRefMn('Neh 8:9-10')).toBe('Нехемиа 8:9-10')
    expect(formatRefMn('Jer 30:21-22')).toBe('Иеремиа 30:21-22')
    expect(formatRefMn('Gen 49:8-10')).toBe('Эхлэл 49:8-10')
    expect(formatRefMn('Gal 4:3-7')).toBe('Галат 4:3-7')
    expect(formatRefMn('Deut 7:6,8-9')).toBe('Дэд хууль 7:6,8-9')
    expect(formatRefMn('1 Pet 3:18, 22')).toBe('1 Петр 3:18, 22')
    expect(formatRefMn('2 Cor 6:1-4a')).toBe('2 Коринт 6:1-4a')
    expect(formatRefMn('1 Thess 5:19-24')).toBe('1 Тесалоник 5:19-24')
    expect(formatRefMn('1 Kgs 8:51-53a')).toBe('1 Хаад 8:51-53a')
    expect(formatRefMn('1 Cor 9:24-27')).toBe('1 Коринт 9:24-27')
    expect(formatRefMn('1 John 1:1-3')).toBe('1 Иохан 1:1-3')
    // 마침표 붙은 약어도 허용
    expect(formatRefMn('Isa. 11:1-5')).toBe('Исаиа 11:1-5')
  })

  it('복수 단어 책 이름', () => {
    expect(formatRefMn('Song of Songs 2:8-14')).toBe('Соломоны дуун 2:8-14')
    expect(formatRefMn('Wisdom of Solomon 9:1-6')).toBe('Мэргэн ухаан 9:1-6')
  })

  it('이미 키릴이면 그대로 반환 (짧은 독서 ref 혼재)', () => {
    expect(formatRefMn('Исаиа 52:13-15')).toBe('Исаиа 52:13-15')
    expect(formatRefMn('Дэд хууль 4:39-40а')).toBe('Дэд хууль 4:39-40а')
    expect(formatRefMn('1 Петр 2:21-24')).toBe('1 Петр 2:21-24')
    expect(formatRefMn('Иов 1:21. 2:10б')).toBe('Иов 1:21. 2:10б')
    expect(console.warn).not.toHaveBeenCalled()
  })

  it('미지의 책 이름은 원문 반환 + console.warn 1회 (입력당)', () => {
    expect(formatRefMn('Baruch 5:1-9')).toBe('Baruch 5:1-9')
    expect(formatRefMn('Baruch 5:1-9')).toBe('Baruch 5:1-9')
    expect(console.warn).toHaveBeenCalledTimes(1)
    expect(formatRefMn('Nonexistent 1:1')).toBe('Nonexistent 1:1')
    expect(console.warn).toHaveBeenCalledTimes(2)
  })

  it('빈 문자열·공백은 그대로 (warn 없음)', () => {
    expect(formatRefMn('')).toBe('')
    expect(formatRefMn('   ')).toBe('   ')
    expect(console.warn).not.toHaveBeenCalled()
  })

  it('장:절이 없는 임의 텍스트도 책 이름만 바꾸고 나머지는 그대로 (테스트 픽스처 `Psalm test`)', () => {
    expect(formatRefMn('Psalm test')).toBe('Дуулал test')
  })

  it('hasMongolianBookName — 키릴 시작 (서수 접두 포함) 판별', () => {
    expect(hasMongolianBookName('Дуулал 63:2-9')).toBe(true)
    expect(hasMongolianBookName('1 Петр 2:21-24')).toBe(true)
    expect(hasMongolianBookName('Өвгөн 1:1')).toBe(true)
    expect(hasMongolianBookName('Psalm 63:2-9')).toBe(false)
    expect(hasMongolianBookName('1 Peter 2:21-24')).toBe(false)
  })

  it('resolveBookKeyMn — 정확 일치만 (파서의 prefix 휴리스틱 미사용)', () => {
    expect(resolveBookKeyMn('Psalm')).toBe('psalm')
    expect(resolveBookKeyMn('psalms')).toBe('psalm')
    expect(resolveBookKeyMn('Jas')).toBe('james')
    expect(resolveBookKeyMn('Psalm test')).toBeUndefined()
    expect(resolveBookKeyMn('Ps')).toBe('psalm')
  })
})

// @fr NFR-002
describe('BOOK_NAMES_MN ↔ src/data/bible/*.jsonl book_mn 일치', () => {
  const dataDir = path.resolve(__dirname, '../../data/bible')
  const files = ['bible_ot.jsonl', 'bible_nt_rest.jsonl', 'bible_gospels.jsonl']

  function loadJsonlBookMn(): Map<string, string> {
    const m = new Map<string, string>()
    for (const f of files) {
      const content = fs.readFileSync(path.join(dataDir, f), 'utf-8')
      for (const line of content.split('\n')) {
        if (!line.trim()) continue
        const raw = JSON.parse(line) as { book: string; book_mn: string }
        const prev = m.get(raw.book)
        if (prev !== undefined && prev !== raw.book_mn) {
          throw new Error(`jsonl book_mn 불일치: ${raw.book} ${prev} vs ${raw.book_mn}`)
        }
        m.set(raw.book, raw.book_mn)
      }
    }
    return m
  }

  it('정경 66권 전부가 상수에 있고 book_mn 과 같다 (PDF_OVERRIDES 예외 명시)', () => {
    const jsonl = loadJsonlBookMn()
    expect(jsonl.size).toBe(66)
    const mismatches: string[] = []
    for (const [book, bookMn] of jsonl) {
      const constant = BOOK_NAMES_MN[book]
      const override = PDF_OVERRIDES[book]
      if (constant === undefined) {
        mismatches.push(`${book}: 상수 누락 (jsonl ${bookMn})`)
        continue
      }
      if (override) {
        if (bookMn !== override.jsonl) mismatches.push(`${book}: jsonl 이 ${bookMn} 로 바뀜 (override.jsonl ${override.jsonl})`)
        if (constant !== override.pdf) mismatches.push(`${book}: 상수 ${constant} ≠ override.pdf ${override.pdf}`)
        continue
      }
      if (constant !== bookMn) mismatches.push(`${book}: 상수 ${constant} ≠ jsonl ${bookMn}`)
    }
    expect(mismatches).toEqual([])
  })

  it('상수의 정경 외 키는 제2경전 4권뿐이고, 모든 키가 파서 BOOK_NAME_MAP 의 값에 존재한다', () => {
    const jsonl = loadJsonlBookMn()
    const extra = Object.keys(BOOK_NAMES_MN).filter((k) => !jsonl.has(k)).sort()
    expect(extra).toEqual(['judith', 'sirach', 'tobit', 'wisdom'])
    const parserKeys = new Set(Object.values(BOOK_NAME_MAP))
    for (const k of Object.keys(BOOK_NAMES_MN)) expect(parserKeys.has(k), k).toBe(true)
  })

  it('PDF_OVERRIDES 는 revelation 만 (Илчлэлт → Илчлэл)', () => {
    expect(Object.keys(PDF_OVERRIDES)).toEqual(['revelation'])
    expect(BOOK_NAMES_MN.revelation).toBe('Илчлэл')
  })
})
