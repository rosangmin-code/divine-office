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
  'src/data/loth/propers/advent.json':
    '41c528f556ca5a0d88021b0513697e4d3f1a37b26c81b7e279df4075dc782987',
  'src/data/loth/propers/christmas.json':
    'd22e8925b09ff74c44c31d6580515fb6f2824e164fe05b58849649bcec78704c',
  'src/data/loth/propers/easter.json':
    'f6fba649cf8f36f2b7b1e72697fc5d9422c7f3ec29570abe8943dd0eb3aae52d',
  'src/data/loth/propers/lent.json':
    '47dfdb96e159a474adbe5f0517b640fea668ae3d679a7aeab35035491d46fd49',
  'src/data/loth/propers/ordinary-time.json':
    '5cbec009830ac92e441bf389ab6bb0ed289570dc0eb92ab3189508e53083c1ff',
  'src/data/loth/sanctoral/feasts.json':
    'aed354d01103442536a502924f4e53c03cf040341fa14e079dded1869d8653e6',
  'src/data/loth/sanctoral/memorials.json':
    '4e6d78947eba4ab95f0bbf998b894d9b6a55769aa907b927d2277430a4ea6d02',
  'src/data/loth/sanctoral/optional-memorials.json':
    'ca3d163bab055381827226140568f3bef7eaac187cebd76878e0b63e9e442356',
  'src/data/loth/sanctoral/solemnities.json':
    '3adc252bf6ce536cf64ab8fe2b93e7db200482fd7a29ea5d0cbe87a78e315643',
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
