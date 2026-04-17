import { describe, it, expect } from 'vitest'
import { parseHymn } from './hymn-parser.ts'

// Real PDF-extraction samples harvested from
// ../divine-office-reader/public/data/content/hymns.json (read-only upstream).

const RAW_CLEAN_103 = [
  'Цангасан сэтгэлийг минь Та ундаалж',
  'Цаглашгүй хайраараа Та тэтгээч',
  'Хүн бүхэн Таны тэр хайрыг',
  'Хүсэл сэтгэлийн үзүүрт эрж хайна',
  'Бидний дунд хайрын булгыг оргилуулаач',
  'Таны хайраар амьдарч мөнхөрье',
].join('\n')

const RAW_ATTRIBUTION_9 = [
  '(Ая - Үг: Hervé KUAFA, cicm, Улаанбаатар, © 2010, H.K.L.)',
  '',
  'Цовдлогдож, булшлагдсан Эзэн минь',
  'Зарлигийн ёсоор үхлээс амилсан',
  'Өнө мөнхөд бидэнтэй хамт',
  'Жаргалтайгаар Эзэнээ магтан дуулцгаая',
  '',
  'Дахилт: Аллэлүяа, Аллэлүяа, Аллэлүяа, Аллэлүяа',
  'Аллэлүяа, Аллэлүяа, Аллэлүяа, Аллэлүяа',
].join('\n')

const RAW_CONTAMINATED_107 = [
  'Магтуу',
  '',
  '11 дүгээр сарын 2-ны өдөр - Хамаг итгэлт',
  'талийгаачдыг дурсгахуйн өдөр',
  '64. Миний төлөө',
  '103. Хайрын булаг оргилуулаач',
  '11 дүгээр сарын 9-ний өдөр - Латраны',
  'нэрэмжит дээд сүмийн Аравнай',
  '71. Оролцоот сүмийн төлөө',
  '12 дугаар сарын 8-ны өдөр - Язгуурын гэм',
  'нүгэлгүй бүрэлдсэн төгс жаргалт Цэвэр Охин',
  'Мариа',
  '10. Амар амгалан Мариа',
  '60. Мариа туслагч минь',
  '70. Намуун дөлгөөн эмэгтэй',
  '95. Туйлын цэвэр Мариагийн магтаал',
  'ТАЛИЙГААЧДЫН ТӨЛӨӨХ ХУРАЛ',
  '103. Хайрын булаг оргилуулаач',
  '110. Цээжинд цохилох зүрх',
  'ТӨГС',
  'ЖАРГАЛТ',
  'ЦЭВЭР',
  'ОХИН',
  'МАРИАГИЙН',
  'БЯМБА',
  'ГАРАГИЙГ',
  'ДУРСАХУЙ',
  '10. Амар амгалан Мариа',
  '60. Мариа туслагч минь',
  '70. Намуун дөлгөөн эмэгтэй',
  '95. Туйлын цэвэр Мариагийн магтаал',
  '',
  'Магтуу',
  '1. Аав аа Та миний баяр',
  'Ааваа Та миний амьдралын Эзэн',
  'Та миний найдвар баяр баясгалан',
  'Танд би хайртай үнэхээр хайртай',
  'Миний баяр Их Эзэн',
  'Есүс Та миний амьдралын эрдэнэ',
  'Та бол үнэхээр ариухан сайхан',
  'Танд би хайртай үнэхээр хайртай',
  'Миний баяр Их Эзэн',
].join('\n')

const RAW_EMPTY_BODY_89 = [
  '3 дугаар сарын 25-ны өдөр - Эзэний тухай Хэл',
  'мэдээ хүргэсэн их баярын өдөр',
  '31. Бүү ай',
  '63. Миний сэтгэл Эзэнийг магтана',
  '6 дугаар сарын 24-ний өдөр - Иохан Баптист',
  'гэгээнтний мэндэлсэн өдөр',
  '49. Илүү хайр, илүү хүч хайр',
  '',
  'Магтуу',
].join('\n')

// Stanza markers at segment boundaries — numbered lines whose suffix is NOT
// a known hymn title should be preserved as stanza starters.
const RAW_STANZA_MARKERS_13 = [
  'Бүхний төлөө загалмайн өмнө',
  'Бидний гэмийг та үүрсэн (2x)',
  'Дахилт: Өө өө өө өө',
  '',
  '7. Хүний гэмийг хүчрэлгүй',
  'Өвдөг сөхрөн унасан ч',
  'Дахин босож алхсан (2x)',
  'Дахилт: Өө өө өө өө',
].join('\n')

const KNOWN_TITLES_SMALL = new Set([
  'Аав аа Та миний баяр', // hymn #1 — should be recognized as TOC target
  'Амар амгалан Мариа',   // #10
  'Миний төлөө',          // #64
  'Оролцоот сүмийн төлөө', // #71
  'Хайрын булаг оргилуулаач', // #103
  'Цээжинд цохилох зүрх', // #110
  'Намуун дөлгөөн эмэгтэй', // #70
  'Мариа туслагч минь', // #60
  'Туйлын цэвэр Мариагийн магтаал', // #95
])

describe('parseHymn', () => {
  it('preserves a clean verse-only body untouched', () => {
    const result = parseHymn(RAW_CLEAN_103)
    expect(result.value?.text).toBe(RAW_CLEAN_103)
  })

  it('keeps verse body and Дахилт refrain marker, drops lone attribution', () => {
    const result = parseHymn(RAW_ATTRIBUTION_9)
    const text = result.value?.text ?? ''
    expect(text.split('\n')[0]).toBe('Цовдлогдож, булшлагдсан Эзэн минь')
    expect(text).toContain('Дахилт: Аллэлүяа')
    expect(text).not.toContain('Hervé KUAFA')
  })

  it('strips TOC preamble and starts with real hymn verse (#107)', () => {
    const result = parseHymn(RAW_CONTAMINATED_107, { knownTitles: KNOWN_TITLES_SMALL })
    const text = result.value?.text ?? ''
    expect(text.split('\n')[0]).toBe('Ааваа Та миний амьдралын Эзэн')
    expect(text.split('\n')).toHaveLength(8)
    expect(text).not.toContain('ТАЛИЙГААЧДЫН')
    expect(text).not.toContain('ТӨГС')
    expect(text).not.toContain('талийгаачдыг')
    // cross-reference to another hymn's title must not leak into body
    expect(text).not.toContain('1. Аав аа')
  })

  it('returns null when upstream only contains a TOC (#89)', () => {
    const result = parseHymn(RAW_EMPTY_BODY_89)
    expect(result.value).toBeNull()
    expect(result.diagnostics.some(d => d.kind === 'warn')).toBe(true)
  })

  it('returns null for empty input', () => {
    expect(parseHymn('').value).toBeNull()
  })

  it('keeps stanza markers when the suffix is not a known hymn title (#13)', () => {
    const result = parseHymn(RAW_STANZA_MARKERS_13, { knownTitles: KNOWN_TITLES_SMALL })
    const text = result.value?.text ?? ''
    // Stanza 7's first verse line must survive — it contains the "7. " prefix.
    expect(text).toContain('7. Хүний гэмийг хүчрэлгүй')
    expect(text).toContain('Өвдөг сөхрөн унасан ч')
    expect(text).toContain('Дахилт: Өө өө')
  })
})
