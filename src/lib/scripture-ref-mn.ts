/**
 * NFR-002 — 성경 참조 문자열의 **책 이름만** 몽골어(키릴)로 바꾼다.
 *
 * 데이터(`psalter/week-*.json`, `propers/*.json`, `ordinarium/*.json`)의
 * `ref`/`reference` 는 영문 책 이름 + 장:절 (`"Psalm 63:2-9"`,
 * `"Daniel 3:57-88, 56"`, `"1 Chronicles 29:10-13"`, `"Isa 53:11b-12"`) 로
 * 저장돼 있고, 시편·찬가 헤더(`psalm-block.tsx`)와 aria-label 이 이를 그대로
 * 노출해 사용자에게 `PSALM 63:2-9` 가 보였다 (app-review 2026-09-13 §2·§3.3).
 * PDF 원문(`parsed_data/full_pdf.txt`)은 `Дуулал 63:2-9` (L1810),
 * `Магтаал` / `Даниел 3:57-88, 56` (L1876-1877) 식으로 **책 이름만 몽골어,
 * 장:절은 그대로** 다. 이 모듈은 그 표기를 렌더 단계에서 재현한다 — 데이터
 * 키(`Psalm 63:2-9`)는 psalter-texts / rich 파일 조인 키라서 손대지 않는다.
 *
 * 규칙
 * - 장:절 부분은 **문자열 그대로** (`3:57-88, 56`, `1:2б-6`, `53:11b-12`,
 *   `4:11; 5:9-10, 12` 전부 무변경).
 * - 이미 키릴로 시작하면(`Исаиа 52:13-15`) 그대로 반환 — 짧은 독서 `ref` 는
 *   몽골어·영문이 혼재한다.
 * - 미지의 영문 책 이름은 원문 반환 + `console.warn` 1회(입력당).
 *
 * 매핑 출처
 * - 정경 66권: `src/data/bible/*.jsonl` 의 `book_mn` (단위 테스트가 상수와
 *   jsonl 의 일치를 검사한다 — `scripture-ref-mn.test.ts`).
 * - 제2경전(Tobit/Judith/Wisdom/Sirach)은 성경 데이터에 없어 PDF 인쇄면에서
 *   직접 확인: Тобит (L3038·L3720·L16995), Иудит (L3635·L14853),
 *   Мэргэн ухаан (L13528), Сирак (L6650). Baruch/1-2 Maccabees 는 PDF 에
 *   등장하지 않아 매핑하지 않는다(미지 → 원문 유지 + warn).
 * - `PDF_OVERRIDES`: jsonl 과 PDF 표기가 다른 책. 화면은 PDF(책) 재현이
 *   원칙이고 같은 화면의 시편 머리말 attribution(`(Илчлэл 19:5)`)·loth
 *   데이터가 전부 PDF 표기를 쓰므로 PDF 를 따른다.
 */
import { BOOK_NAME_MAP } from './scripture-ref-parser'

/**
 * 성경 데이터 키(`bible-loader` 의 `book`) → 몽골어 책 이름.
 * 정경 66권은 `src/data/bible/*.jsonl` `book_mn` 과 동일해야 한다
 * (`PDF_OVERRIDES` 예외). 클라이언트 컴포넌트에서 쓰이므로 jsonl 을 런타임에
 * 읽지 않고 정적 상수로 둔다.
 */
export const BOOK_NAMES_MN: Readonly<Record<string, string>> = {
  // OT
  genesis: 'Эхлэл',
  exodus: 'Гэтлэл',
  leviticus: 'Леви',
  numbers: 'Тооллого',
  deuteronomy: 'Дэд хууль',
  joshua: 'Иошуа',
  judges: 'Шүүгчид',
  ruth: 'Рут',
  '1-samuel': '1 Самуел',
  '2-samuel': '2 Самуел',
  '1-kings': '1 Хаад',
  '2-kings': '2 Хаад',
  '1-chronicles': '1 Шастир',
  '2-chronicles': '2 Шастир',
  ezra: 'Езра',
  nehemiah: 'Нехемиа',
  esther: 'Естер',
  job: 'Иов',
  psalm: 'Дуулал',
  proverbs: 'Сургаалт үгс',
  ecclesiastes: 'Номлогчийн үгс',
  'song-of-songs': 'Соломоны дуун',
  isaiah: 'Исаиа',
  jeremiah: 'Иеремиа',
  lamentations: 'Гашуудал',
  ezekiel: 'Езекиел',
  daniel: 'Даниел',
  hosea: 'Хосеа',
  joel: 'Иоел',
  amos: 'Амос',
  obadiah: 'Обадиа',
  jonah: 'Иона',
  micah: 'Мика',
  nahum: 'Нахум',
  habakkuk: 'Хабаккук',
  zephaniah: 'Зефаниа',
  haggai: 'Хаггаи',
  zechariah: 'Зехариа',
  malachi: 'Малахи',
  // Deuterocanonical — PDF 인쇄면 표기 (성경 jsonl 에 없음)
  tobit: 'Тобит',
  judith: 'Иудит',
  wisdom: 'Мэргэн ухаан',
  sirach: 'Сирак',
  // NT
  matthew: 'Матай',
  mark: 'Марк',
  luke: 'Лука',
  john: 'Иохан',
  acts: 'Үйлс',
  romans: 'Ром',
  '1-corinthians': '1 Коринт',
  '2-corinthians': '2 Коринт',
  galatians: 'Галат',
  ephesians: 'Ефес',
  philippians: 'Филиппой',
  colossians: 'Колоссай',
  '1-thessalonians': '1 Тесалоник',
  '2-thessalonians': '2 Тесалоник',
  '1-timothy': '1 Тимот',
  '2-timothy': '2 Тимот',
  titus: 'Тит',
  philemon: 'Филемон',
  hebrews: 'Еврей',
  james: 'Иаков',
  '1-peter': '1 Петр',
  '2-peter': '2 Петр',
  '1-john': '1 Иохан',
  '2-john': '2 Иохан',
  '3-john': '3 Иохан',
  jude: 'Иуда',
  revelation: 'Илчлэл',
}

/**
 * jsonl `book_mn` 과 PDF 인쇄 표기가 다른 책. `BOOK_NAMES_MN` 은 `pdf` 값을
 * 쓰고, 단위 테스트는 jsonl 쪽이 여전히 `jsonl` 값인지도 검사한다(성경
 * 데이터가 바뀌면 이 표를 함께 갱신하라는 신호).
 *
 * - revelation: jsonl `Илчлэлт` vs PDF `Илчлэл` (full_pdf.txt 49회 / `Илчлэлт`
 *   0회, 예: L2271 `Илчлэл 19:1-7`; loth 데이터 ref·attribution 16회도 전부
 *   `Илчлэл`).
 */
export const PDF_OVERRIDES: Readonly<
  Record<string, { readonly jsonl: string; readonly pdf: string }>
> = {
  revelation: { jsonl: 'Илчлэлт', pdf: 'Илчлэл' },
}

/**
 * 파서의 `BOOK_NAME_MAP` 이 모르는 영문 약어 (propers 짧은 독서 `ref` 실측:
 * Isa/Rom/Heb/Jas/Phil/Eph/Neh/Jer/Gen/Gal/Exod/Deut/1 Pet/2 Cor/1 Thess/
 * 1 Kgs …). 키는 소문자·마침표 제거·공백 1칸 정규화.
 */
const ABBREVIATIONS: Readonly<Record<string, string>> = {
  gen: 'genesis',
  exod: 'exodus',
  ex: 'exodus',
  lev: 'leviticus',
  num: 'numbers',
  deut: 'deuteronomy',
  dt: 'deuteronomy',
  josh: 'joshua',
  judg: 'judges',
  '1 sam': '1-samuel',
  '2 sam': '2-samuel',
  '1 kgs': '1-kings',
  '2 kgs': '2-kings',
  '1 chr': '1-chronicles',
  '2 chr': '2-chronicles',
  neh: 'nehemiah',
  esth: 'esther',
  ps: 'psalm',
  pss: 'psalm',
  prov: 'proverbs',
  eccl: 'ecclesiastes',
  song: 'song-of-songs',
  isa: 'isaiah',
  is: 'isaiah',
  jer: 'jeremiah',
  lam: 'lamentations',
  ezek: 'ezekiel',
  dan: 'daniel',
  hos: 'hosea',
  obad: 'obadiah',
  jon: 'jonah',
  mic: 'micah',
  nah: 'nahum',
  hab: 'habakkuk',
  zeph: 'zephaniah',
  hag: 'haggai',
  zech: 'zechariah',
  mal: 'malachi',
  tob: 'tobit',
  jdt: 'judith',
  wis: 'wisdom',
  sir: 'sirach',
  matt: 'matthew',
  mt: 'matthew',
  mk: 'mark',
  lk: 'luke',
  jn: 'john',
  rom: 'romans',
  '1 cor': '1-corinthians',
  '2 cor': '2-corinthians',
  gal: 'galatians',
  eph: 'ephesians',
  phil: 'philippians',
  col: 'colossians',
  '1 thess': '1-thessalonians',
  '2 thess': '2-thessalonians',
  '1 tim': '1-timothy',
  '2 tim': '2-timothy',
  tit: 'titus',
  phlm: 'philemon',
  heb: 'hebrews',
  jas: 'james',
  '1 pet': '1-peter',
  '2 pet': '2-peter',
  '1 jn': '1-john',
  '2 jn': '2-john',
  '3 jn': '3-john',
  rev: 'revelation',
}

/** 키릴 문자(몽골어 Өө Үү 포함)로 시작하는 참조인지. 선행 서수(`1 Петр`) 허용. */
const CYRILLIC_BOOK_START = /^\s*(?:[1-3]\s*)?[Ѐ-ӿ]/u

/** 영문 책 이름 후보: 선택적 서수(1-3) + 알파벳 단어 1~3개 (`Song of Songs`). */
const ENGLISH_BOOK_PART = /^(?:[1-3]\s+)?[A-Za-z][A-Za-z.]*(?:\s+[A-Za-z][A-Za-z.]*){0,2}$/

const warned = new Set<string>()

function normalizeBookPart(part: string): string {
  return part.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim()
}

/** 영문 책 이름(전체명 또는 약어) → 성경 데이터 키. 정확 일치만 (파서의 prefix 휴리스틱은 쓰지 않음). */
export function resolveBookKeyMn(bookPart: string): string | undefined {
  const norm = normalizeBookPart(bookPart)
  return BOOK_NAME_MAP[norm] ?? ABBREVIATIONS[norm]
}

/** 참조가 이미 몽골어(키릴) 책 이름으로 시작하는가. */
export function hasMongolianBookName(ref: string): boolean {
  return CYRILLIC_BOOK_START.test(ref)
}

/**
 * `"Psalm 63:2-9"` → `"Дуулал 63:2-9"`, `"1 Chronicles 29:10-13"` →
 * `"1 Шастир 29:10-13"`, `"Isa 53:11b-12"` → `"Исаиа 53:11b-12"`.
 * 이미 키릴이면 그대로. 미지의 책 이름이면 원문 반환 + warn 1회.
 *
 * 책 이름은 앞쪽 알파벳 토큰(최대 3단어 + 선행 서수)에서 **가장 긴 정확
 * 일치**를 고르고, 나머지 토큰은 공백 1칸으로 이어 그대로 붙인다.
 */
export function formatRefMn(ref: string): string {
  const trimmed = ref.trim()
  if (!trimmed || hasMongolianBookName(trimmed)) return ref

  const tokens = trimmed.split(/\s+/)
  const maxBookTokens = Math.min(4, tokens.length)
  for (let n = maxBookTokens; n >= 1; n--) {
    const bookPart = tokens.slice(0, n).join(' ')
    if (!ENGLISH_BOOK_PART.test(bookPart)) continue
    const key = resolveBookKeyMn(bookPart)
    const mn = key ? BOOK_NAMES_MN[key] : undefined
    if (mn) {
      const rest = tokens.slice(n)
      return rest.length > 0 ? `${mn} ${rest.join(' ')}` : mn
    }
  }

  if (!warned.has(ref)) {
    warned.add(ref)
    console.warn(`[scripture-ref-mn] 몽골어 책 이름 매핑 없음 — 원문 유지: "${ref}"`)
  }
  return ref
}

/** 테스트 전용: warn-once 기억을 비운다. */
export function __resetRefMnWarnings(): void {
  warned.clear()
}
