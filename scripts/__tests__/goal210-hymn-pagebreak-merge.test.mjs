// @fr GOAL210

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const RICH_DIR = 'src/data/loth/prayers/hymns'
const PLAIN_HYMNS_FILE = 'src/data/loth/ordinarium/hymns.json'

const MERGE_TARGETS = [
  {
    hymnId: '8',
    headBlockIdx: 2,
    headFirstLine: 'Дахилт: Ертөнцийн Эзэний сургаалаар',
    tailFirstLine: 'Өөрийн бие шигээ нэгнээ хайрлацгаая',
    expectedHeadLineCount: 1,
    expectedTailLineCount: 7,
    lineIdx: 5,
    prevLine: 'Дахилт: Ертөнцийн Эзэний сургаалаар',
    nextLine: 'Өөрийн бие шигээ нэгнээ хайрлацгаая',
  },
  {
    hymnId: '14',
    headBlockIdx: 2,
    headFirstLine: 'Бядуучуудын Эцэг буугтун!',
    tailFirstLine: 'Аятайхнаар та гийгүүлэгтүн!',
    expectedHeadLineCount: 11,
    expectedTailLineCount: 16,
    lineIdx: 15,
    prevLine: 'Алив сүсэгтний сэтгэлийг',
    nextLine: 'Аятайхнаар та гийгүүлэгтүн!',
  },
  {
    hymnId: '21',
    headBlockIdx: 0,
    headFirstLine: 'Баярлан магтан хүндэтгэцгээе сүр жавхлантай',
    tailFirstLine: 'Булаг мэтээр амьдрал ундарч далай мэтээр',
    expectedHeadLineCount: 17,
    expectedTailLineCount: 6,
    lineIdx: 17,
    prevLine: 'учраас',
    nextLine: 'Булаг мэтээр амьдрал ундарч далай мэтээр',
  },
  {
    hymnId: '23',
    headBlockIdx: 0,
    headFirstLine: 'Өө өө өө би Таныг магтъя',
    tailFirstLine: 'Бидний итгэлийг аваач Есүс ээ',
    expectedHeadLineCount: 8,
    expectedTailLineCount: 5,
    lineIdx: 8,
    prevLine: 'Өө өө Бид Tаны хайраар амьдарьяа',
    nextLine: 'Бидний итгэлийг аваач Есүс ээ',
  },
  {
    hymnId: '27',
    headBlockIdx: 0,
    headFirstLine: '1.Бидний нүглийг уучилаач, биднийг өршөөгөөч',
    tailFirstLine: 'Гэрэл цацарсан хайраа бидэн рүү тусгаач',
    expectedHeadLineCount: 3,
    expectedTailLineCount: 1,
    lineIdx: 3,
    prevLine: 'Гэмт амьдралаас минь биднийг татаач',
    nextLine: 'Гэрэл цацарсан хайраа бидэн рүү тусгаач',
  },
  {
    hymnId: '37',
    headBlockIdx: 0,
    headFirstLine: 'Дээдийн дээд Хаадын Хаан болсон Эзэн',
    tailFirstLine: 'Зүрх сэтгэлийн гүнээс магтъя',
    expectedHeadLineCount: 9,
    expectedTailLineCount: 3,
    lineIdx: 9,
    prevLine: 'Магтан дуулъя Эзэний нэрийг',
    nextLine: 'Зүрх сэтгэлийн гүнээс магтъя',
  },
  {
    hymnId: '42',
    headBlockIdx: 0,
    headFirstLine: 'Есүс хамгийн нандин нэр юм аа',
    tailFirstLine: 'ӨӨ Есүс ээ чанга дуугаар өргөн магтъя',
    expectedHeadLineCount: 10,
    expectedTailLineCount: 2,
    lineIdx: 10,
    prevLine: 'Есүс Таны хайр хязгааргүй юм аа',
    nextLine: 'ӨӨ Есүс ээ чанга дуугаар өргөн магтъя',
  },
  {
    hymnId: '48',
    headBlockIdx: 0,
    headFirstLine: 'Зовлонгийн үе ойртон ирэхэд',
    tailFirstLine: 'Айдсын дунд цустай хөлсөө урсган',
    expectedHeadLineCount: 2,
    expectedTailLineCount: 2,
    lineIdx: 2,
    prevLine: 'Есүс Эзэн ууланд очжээ',
    nextLine: 'Айдсын дунд цустай хөлсөө урсган',
  },
  {
    hymnId: '55',
    headBlockIdx: 0,
    headFirstLine: 'Их Эзэний минь цус Их Эзэний минь цус',
    tailFirstLine: 'Аврагч Эзэний нандин тэр цус Ариун тахил юм',
    expectedHeadLineCount: 2,
    expectedTailLineCount: 12,
    lineIdx: 2,
    prevLine: 'Хүч чадлыг надад өглөө',
    nextLine: 'Аврагч Эзэний нандин тэр цус Ариун тахил юм',
  },
  {
    hymnId: '69',
    headBlockIdx: 0,
    headFirstLine: 'Намайг өөрчлөөч намайг өөрчлөөч',
    tailFirstLine: 'Төгс биелүүлж чадахын тулд',
    expectedHeadLineCount: 2,
    expectedTailLineCount: 5,
    lineIdx: 2,
    prevLine: 'Таны дуудсан дуудлагыг',
    nextLine: 'Төгс биелүүлж чадахын тулд',
  },
  {
    hymnId: '71',
    headBlockIdx: 2,
    headFirstLine: 'Дахилт:',
    tailFirstLine: 'Эрдэнийн эх дэлхийгээ хамгаалан',
    expectedHeadLineCount: 6,
    expectedTailLineCount: 3,
    lineIdx: 10,
    prevLine: 'Энэрэлт Эзэний үгийг түгээж',
    nextLine: 'Эрдэнийн эх дэлхийгээ хамгаалан',
  },
  {
    hymnId: '77',
    headBlockIdx: 2,
    headFirstLine: '1. Эзэнийг магтан дуулагтун',
    tailFirstLine: 'Бүх ард түмнүүдээ',
    expectedHeadLineCount: 6,
    expectedTailLineCount: 2,
    lineIdx: 7,
    prevLine: '*сайнмэдээг тунхаглагтун',
    nextLine: 'Бүх ард түмнүүдээ ',
  },
  {
    hymnId: '79',
    headBlockIdx: 0,
    headFirstLine: '(Veni, creator Spiritus)',
    tailFirstLine: 'Ариун Сүнсэнд жавхланг',
    expectedHeadLineCount: 26,
    expectedTailLineCount: 3,
    lineIdx: 26,
    prevLine: 'Эцэг, Хөвгүүн хийгээд',
    nextLine: 'Ариун Сүнсэнд жавхланг',
  },
  {
    hymnId: '86',
    headBlockIdx: 0,
    headFirstLine: 'Та бол хайрыг авахын төлөө төрсөн хүн билээ',
    tailFirstLine: 'Энэ хорвоо дэлхий дээр таны амьдарч байгаа',
    expectedHeadLineCount: 7,
    expectedTailLineCount: 7,
    lineIdx: 7,
    prevLine: 'гарган',
    nextLine: 'Энэ хорвоо дэлхий дээр таны амьдарч байгаа',
  },
  {
    hymnId: '93',
    headBlockIdx: 0,
    headFirstLine: '1. Танд хайртай миний Есүсээ Танд хайртай',
    tailFirstLine: 'Миний хайртай охин Би чамайг ерөөж байна',
    expectedHeadLineCount: 5,
    expectedTailLineCount: 1,
    lineIdx: 5,
    prevLine: 'Миний хайртай хүү Би чамайг сайн мэднэ',
    nextLine: 'Миний хайртай охин Би чамайг ерөөж байна',
  },
  {
    hymnId: '99',
    headBlockIdx: 0,
    headFirstLine: 'Ундран оргилох булаг мэт',
    tailFirstLine: 'Зовлонт сэтгэлийн хүлээсийг тайлна',
    expectedHeadLineCount: 3,
    expectedTailLineCount: 7,
    lineIdx: 3,
    prevLine: 'Хүчит аварга хүрхрээ мэт тэнгэрээс асгарч',
    nextLine: 'Зовлонт сэтгэлийн хүлээсийг тайлна',
  },
  {
    hymnId: '115',
    headBlockIdx: 8,
    headFirstLine: '4. Энэхэн нялх хөвгүүн',
    tailFirstLine: 'Эгээрэл ба өршөөлийн',
    expectedHeadLineCount: 4,
    expectedTailLineCount: 2,
    lineIdx: 25,
    prevLine: 'Эргүү хорыг засч',
    nextLine: 'Эгээрэл ба өршөөлийн',
  },
  {
    hymnId: '117',
    headBlockIdx: 12,
    headFirstLine: '6. Эгээрэл ба туйлын их баяртай',
    tailFirstLine: 'Энсэн гуйн хүлээж суумуй.',
    expectedHeadLineCount: 3,
    expectedTailLineCount: 1,
    lineIdx: 25,
    prevLine: 'Энх жаргалын Ариун Сүнс буухуйг',
    nextLine: 'Энсэн гуйн хүлээж суумуй.',
  },
  {
    hymnId: '119',
    headBlockIdx: 6,
    headFirstLine: '2. Агуу Эзэнийг магтан дуулахад',
    tailFirstLine: 'Алдарт Эзэний энэрэнгүй сэтгэл',
    expectedHeadLineCount: 2,
    expectedTailLineCount: 2,
    lineIdx: 9,
    prevLine: 'Айх зүйл бидэнд байхгүй',
    nextLine: 'Алдарт Эзэний энэрэнгүй сэтгэл',
  },
  {
    hymnId: '122',
    headBlockIdx: 0,
    headFirstLine: 'Эзэнийг магтан хүндэтгэн',
    tailFirstLine: 'Миний бүх зүйл болсон Их Эзэн',
    expectedHeadLineCount: 2,
    expectedTailLineCount: 13,
    lineIdx: 2,
    prevLine: 'Миний хэлэхийг хүсэж буй үг нь Би Танд хайртай',
    nextLine: 'Миний бүх зүйл болсон Их Эзэн',
  },
]

const PROTECTED_BOUNDARIES = [
  {
    hymnId: '19',
    headBlockIdx: 4,
    prevLine: 'Амар амгаланг бидэнд дахин өгөөч',
    nextLine: 'Дахилт:Үнэн итгэл хайрын Эзэн',
  },
  {
    hymnId: '25',
    headBlockIdx: 0,
    prevLine: 'Эзэнийг магтан дуулж байна',
    nextLine: 'Бидний Эзэний Ариун Сүнс надад оршин',
  },
  {
    hymnId: '31',
    headBlockIdx: 0,
    prevLine: 'Бурханы царайг харвал амьдарна',
    nextLine: 'Дахилт:',
  },
  {
    hymnId: '52',
    headBlockIdx: 0,
    prevLine: 'Ариун замаар хөтлөн дагуулаач',
    nextLine: 'Итгэмжтэйгээр үнэн зүрхээр',
  },
  {
    hymnId: '57',
    headBlockIdx: 2,
    prevLine: 'Миний бие сүнс магтан дуулж байна',
    nextLine: 'Их Эзэний агуу алдар сүр хүчийг',
  },
  {
    hymnId: '66',
    headBlockIdx: 0,
    prevLine: 'Би Танд хайртай',
    nextLine: 'Мөнхийн мөнхөд бүхнээ зориулж Танд би',
  },
  {
    hymnId: '94',
    headBlockIdx: 4,
    prevLine: 'Та надад үзүүлээч',
    nextLine: 'Дахилт: Миний төлөө эдлэсэн Таны бүх зовлонг',
  },
  {
    hymnId: '97',
    headBlockIdx: 0,
    prevLine: 'Баярын дуу сүр жавхланг Та бэлэглээч',
    nextLine: 'Дахилт: Дээрээс гэрэл цацарч тэнгэр элч дэргэд',
  },
  {
    hymnId: '105',
    headBlockIdx: 0,
    prevLine: 'Та бол бидний Тэнгэрбурхан /х2/',
    nextLine: 'Дахилт:',
  },
  {
    hymnId: '105',
    headBlockIdx: 4,
    prevLine: 'Та бол бидний Тэнгэрбурхан /х2/',
    nextLine: 'Дахилт:',
  },
  {
    hymnId: '105',
    headBlockIdx: 8,
    prevLine: 'Та бол бидний Тэнгэрбурхан /х2/',
    nextLine: 'Дахилт:',
  },
  {
    hymnId: '112',
    headBlockIdx: 0,
    prevLine: 'Тосоор тослооч ээ, тосоор тослооч ээ',
    nextLine: 'Гал мэт хайрыг бид өргөж байна,',
  },
]

const HISTORICAL_MERGED_TARGETS = [
  {
    hymnId: '41',
    headBlockIdx: 0,
    headFirstLine: '1. Есүс мандан ирсэн',
    tailFirstLine: 'Их адис хайранд',
    expectedHeadLineCount: 1,
    expectedTailLineCount: 3,
    lineIdx: 1,
    prevLine: '1. Есүс мандан ирсэн',
    nextLine: 'Их адис хайранд',
  },
  {
    hymnId: '45',
    headBlockIdx: 6,
    headFirstLine: '3. Ядуурлыг баримтлан',
    tailFirstLine: 'Юуны тул зүдэв?',
    expectedHeadLineCount: 3,
    expectedTailLineCount: 1,
    lineIdx: 16,
    prevLine: 'Явганаар ном тавьж',
    nextLine: 'Юуны тул зүдэв?',
  },
  {
    hymnId: '111',
    headBlockIdx: 6,
    headFirstLine: '3. Өлмий, мутар, хавирганы',
    tailFirstLine: 'Үзүүлэхүй дор тэд тийн',
    expectedHeadLineCount: 2,
    expectedTailLineCount: 2,
    lineIdx: 13,
    prevLine: 'Үлдэж хоцорсон шархаа',
    nextLine: 'Үзүүлэхүй дор тэд тийн',
  },
]

const AREA_HASHES = {
  'src/data/loth/ordinarium/compline.json':
    '10261a2e03d3b73bf479abbdfea6bf0ca72f15ce4a24b88db94cedc76ee86a4c',
  // WI-81 intended default_antiphon trim; re-locked for #191 wi-003 S1
  // space-split correction (owctononuudiig tailvshruulzh, advent:633).
  'src/data/loth/propers/advent.json':
    '193f7d034c1a62380617e7ca5108baf269c01f7fddf6e882fec670a33462e84e',
  // WI-88 (#87): dec25.SUN.vespers2 proper psalmody wiring (Ps 110:1-5,7 /
  // Ps 130 / Col 1:12-20, full_pdf p.592-596).
  'src/data/loth/propers/christmas.json':
    '06837c6af60899053b94bb55850063f281773a2f2207e768a3c9080d83b9077d',
  // WI-81 intended default_antiphon trim; re-locked for #191 wi-003 S1
  // space-split correction (owctononuudiig tailvshruulzh, easter:540/865).
  'src/data/loth/propers/easter.json':
    'd1a8e024e42f175f1acdaf3b3009f004acd838a860c526cfbb20948ac56758da',
  // WI-81 intended default_antiphon trim; re-locked for #191 wi-003 S1
  // space-split correction (owctononuudiig tailvshruulzh, lent:618).
  'src/data/loth/propers/lent.json':
    '2eaf15d01e4a18b50288b0d1b56918e680c7e355c3adffaeeddd2baf8d0bce39',
  // WI-81 intended default_antiphon trim; re-locked for #191 wi-003 S1
  // space-split correction (owctononuudiig tailvshruulzh, ordinary-time x8).
  'src/data/loth/propers/ordinary-time.json':
    '9581c3177314e1d9687ebc0a74b924d1715f6c5546b136441e1fac597871ef28',
  'src/data/loth/sanctoral/feasts.json':
    'aed354d01103442536a502924f4e53c03cf040341fa14e079dded1869d8653e6',
  // WI-76 intended memorials page 863->862.
  // #203 (WI-215): 11-02 All Souls + deceased lauds/vespers concludingPrayer
  // truncation — restored Trinitarian doxology from full_pdf p.852 (L28884-87).
  'src/data/loth/sanctoral/memorials.json':
    'e999e4c6bcc1458a6dc9572fe1806b6d0845a81aba4868296c03dd58aabdb90b',
  'src/data/loth/sanctoral/optional-memorials.json':
    'ca3d163bab055381827226140568f3bef7eaac187cebd76878e0b63e9e442356',
  // #203 (WI-212): 06-24 John Baptist lauds + vespers2 concludingPrayer
  // truncation — restored Trinitarian doxology from full_pdf p.828 (L28144-47).
  // #203 (WI-215): 03-19 St Joseph lauds + vespers2 concludingPrayer truncation
  // — restored short doxology variant from full_pdf p.824 (L28034-36).
  // #2/g-20 (WI-16): 06-29 Peter & Paul lauds + vespers2 concludingPrayer
  // typo байсган→баясган (PDF-fidelity restore, full_pdf p.830 L28206).
  'src/data/loth/sanctoral/solemnities.json':
    'fd5543f94d76eeaba6a39fd89f5e669479905c170b30f5d0dde2a88fe5a5ef8e',
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(path), 'utf8'))
}

function richData(hymnId) {
  return readJson(`${RICH_DIR}/${hymnId}.rich.json`)
}

function plainHymns() {
  return readJson(PLAIN_HYMNS_FILE)
}

function lineText(line) {
  return (line?.spans ?? []).map((span) => span.text ?? '').join('')
}

function stanzaLines(block) {
  return (block?.lines ?? []).map(lineText)
}

function splitLinesFor(hymnId) {
  return plainHymns()[hymnId].text.split('\n')
}

function expectRichMerged(target) {
  const block = richData(target.hymnId).hymnRich.blocks[target.headBlockIdx]
  const lines = stanzaLines(block)

  expect(block.kind).toBe('stanza')
  expect(lines[0]).toBe(target.headFirstLine)
  expect(lines).toHaveLength(target.expectedHeadLineCount + target.expectedTailLineCount)
  expect(lines[target.expectedHeadLineCount]).toBe(target.tailFirstLine)
}

function expectPlainMerged(target) {
  const lines = splitLinesFor(target.hymnId)

  expect(lines[target.lineIdx - 1]).toBe(target.prevLine)
  expect(lines[target.lineIdx]).toBe(target.nextLine)
}

function expectRichSplit(boundary) {
  const blocks = richData(boundary.hymnId).hymnRich.blocks
  const head = blocks[boundary.headBlockIdx]
  const divider = blocks[boundary.headBlockIdx + 1]
  const tail = blocks[boundary.headBlockIdx + 2]

  expect(head.kind).toBe('stanza')
  expect(divider.kind).toBe('divider')
  expect(tail.kind).toBe('stanza')
  expect(stanzaLines(head).at(-1)).toBe(boundary.prevLine)
  expect(stanzaLines(tail)[0]).toBe(boundary.nextLine)
}

function countPlainSplit(boundary) {
  const lines = splitLinesFor(boundary.hymnId)
  let count = 0

  for (let i = 1; i < lines.length - 1; i += 1) {
    if (lines[i - 1] === boundary.prevLine && lines[i] === '' && lines[i + 1] === boundary.nextLine) {
      count += 1
    }
  }

  return count
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(resolve(path))).digest('hex')
}

describe('GOAL210 genuine hymn page-break merges', () => {
  it.each(MERGE_TARGETS)('hymn $hymnId is merged in rich JSON and plain hymns.json', (target) => {
    expectRichMerged(target)
    expectPlainMerged(target)
  })
})

describe('GOAL210 protected legitimate page-break-adjacent boundaries', () => {
  it.each(PROTECTED_BOUNDARIES)('hymn $hymnId block $headBlockIdx remains split in rich JSON', (boundary) => {
    expectRichSplit(boundary)
  })

  it('keeps the 12 documented legitimate boundaries split in plain hymns.json', () => {
    const actual = new Map()

    for (const boundary of PROTECTED_BOUNDARIES) {
      const key = `${boundary.hymnId}|${boundary.prevLine}|${boundary.nextLine}`
      actual.set(key, countPlainSplit(boundary))
    }

    expect(Object.fromEntries(actual)).toEqual({
      '19|Амар амгаланг бидэнд дахин өгөөч|Дахилт:Үнэн итгэл хайрын Эзэн': 1,
      '25|Эзэнийг магтан дуулж байна|Бидний Эзэний Ариун Сүнс надад оршин': 1,
      '31|Бурханы царайг харвал амьдарна|Дахилт:': 1,
      '52|Ариун замаар хөтлөн дагуулаач|Итгэмжтэйгээр үнэн зүрхээр': 1,
      '57|Миний бие сүнс магтан дуулж байна|Их Эзэний агуу алдар сүр хүчийг': 1,
      '66|Би Танд хайртай|Мөнхийн мөнхөд бүхнээ зориулж Танд би': 1,
      '94|Та надад үзүүлээч|Дахилт: Миний төлөө эдлэсэн Таны бүх зовлонг': 1,
      '97|Баярын дуу сүр жавхланг Та бэлэглээч|Дахилт: Дээрээс гэрэл цацарч тэнгэр элч дэргэд': 1,
      '105|Та бол бидний Тэнгэрбурхан /х2/|Дахилт:': 1,
      '112|Тосоор тослооч ээ, тосоор тослооч ээ|Гал мэт хайрыг бид өргөж байна,': 1,
    })
  })
})

describe('GOAL210 historical hymn page-break merges', () => {
  it.each(HISTORICAL_MERGED_TARGETS)('hymn $hymnId remains already merged', (target) => {
    expectRichMerged(target)
    expectPlainMerged(target)
  })
})

describe('GOAL210 non-hymn areas are byte-unchanged', () => {
  it('keeps compline, propers, and sanctoral files at their locked hashes', () => {
    const actual = Object.fromEntries(Object.keys(AREA_HASHES).map((path) => [path, sha256(path)]))

    expect(actual).toEqual(AREA_HASHES)
  })
})
