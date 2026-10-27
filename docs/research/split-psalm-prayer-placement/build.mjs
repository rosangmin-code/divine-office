#!/usr/bin/env node
/**
 * build.mjs — 분할 시편의 마침 기도를 II부 뒤로 (2026-10-25).
 *
 * 책은 I부/II부로 나뉜 시편의 마침 기도(`Дууллыг төгсгөх залбирал`)를
 * II부 뒤에 한 번만 인쇄한다(분할 시편 10건 전부, 인쇄면 확인).
 * 데이터는 다음처럼 어긋나 있었다:
 *
 *   - 시편 45·49·132·145: 기도가 I부 키에 붙어 I부 뒤에 나옴 → II부 키로 옮김.
 *     rich 기도의 source.id 는 원래부터 II부 이름(`…-45-11-18-…`)이었다 —
 *     2026-08-08 II부 분리 때 I부 키에 남은 것.
 *   - 시편 27·72: 기도가 아예 없음 → 인쇄면(p.119, p.257) 그대로 II부에 추가.
 *   - 시편 135: `135:1-12` 는 제4주간 월 아침에 단독으로도 쓰여(p.429 기도)
 *     카탈로그 기도를 뗄 수 없다 → 제3주간 금 저녁 I부 자리에만
 *     `omitPsalmPrayer: true` (week-3.json).
 *   - 시편 139 II부: 기도 쪽수(p.467) 누락 → 채움.
 *
 * 사용: node docs/research/split-psalm-prayer-placement/build.mjs [--write]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const WRITE = process.argv.includes('--write')
const PLAIN = 'src/data/loth/psalter-texts.json'
const RICH = 'src/data/loth/prayers/commons/psalter-texts.rich.json'
const WEEK3 = 'src/data/loth/psalter/week-3.json'

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'))
const writeJson = (p, v) =>
  fs.writeFileSync(path.join(ROOT, p), JSON.stringify(v, null, 2) + '\n', 'utf8')
const fail = (msg) => {
  throw new Error(msg)
}

const plain = readJson(PLAIN)
const rich = readJson(RICH)
const week3 = readJson(WEEK3)

// (1) I부 → II부 이동
const MOVES = [
  ['Psalm 45:2-10', 'Psalm 45:11-18', 205],
  ['Psalm 49:1-13', 'Psalm 49:14-21', 221],
  ['Psalm 132:1-10', 'Psalm 132:11-18', 369],
  ['Psalm 145:1-13', 'Psalm 145:14-21', 499],
]
for (const [one, two, page] of MOVES) {
  const p1 = plain[one]
  const p2 = plain[two]
  const r1 = rich[one]
  const r2 = rich[two]
  if (!p1?.psalmPrayer || !r1?.psalmPrayerRich) fail(`${one}: I부에 기도가 없음`)
  if (p2.psalmPrayer || r2.psalmPrayerRich) fail(`${two}: II부에 이미 기도가 있음`)
  if (p1.psalmPrayerPage !== page || r1.psalmPrayerRich.page !== page) fail(`${one}: 기도 쪽수가 ${page} 아님`)
  p2.psalmPrayer = p1.psalmPrayer
  p2.psalmPrayerPage = p1.psalmPrayerPage
  r2.psalmPrayerRich = r1.psalmPrayerRich
  delete p1.psalmPrayer
  delete p1.psalmPrayerPage
  delete r1.psalmPrayerRich
  console.log(`${one} → ${two}: 기도 이동 (p.${page}, rich source ${r2.psalmPrayerRich.source.id})`)
}

// (2) 기도 신설 — 인쇄면 PNG(p.119, p.257)와 글자 대조함
const ADDS = [
  [
    'Psalm 27:7-14',
    119,
    'Эцэг минь, Та Өөрт тань найддаг хүмүүсийг хамгаалж, хүчирхэгжүүлдэг. Та Хүүгийнхээ хашхирахыг сонсоод, муу ёрын өдөр түүнийг Өөрийн асартаа оруулан, сахин хамгаалсан. Зовлонгийнхоо үеэр Таны нүүрийг хайж байгаа зарц боолууддаа амьдын газарт сайн сайхныг тань харахад нь ивээлээ хайрла.',
  ],
  [
    'Psalm 72:12-19',
    257,
    'Эцэг минь, Таны нэр алдрыг бид дуудаж байгаа бөгөөд газар дэлхий дээгүүр түүнийг ерөөлтэй еэ хэмээн тунхагладаг. Та Өөрийнхөө хаанчлалд хотол төгс амар амгалан ба шударга ёсыг ард түмэндээ хайрлан соёрхоно уу.',
  ],
]
for (const [ref, page, text] of ADDS) {
  if (plain[ref].psalmPrayer || rich[ref].psalmPrayerRich) fail(`${ref}: 이미 기도가 있음`)
  plain[ref].psalmPrayer = text
  plain[ref].psalmPrayerPage = page
  const slug = ref.toLowerCase().replace(/[^0-9a-z]+/g, '-')
  rich[ref].psalmPrayerRich = {
    blocks: [{ kind: 'para', spans: [{ kind: 'text', text }] }],
    page,
    source: { kind: 'common', id: `psalter-text-${slug}-psalm-prayer` },
  }
  console.log(`${ref}: 기도 추가 (p.${page}, ${text.length}자)`)
}

// (3) 시편 139 II부 기도 쪽수
const ps139 = plain['Psalm 139:13-18, 23-24']
if (!ps139.psalmPrayer) fail('Psalm 139 II부에 기도가 없음')
if (ps139.psalmPrayerPage !== undefined) fail('Psalm 139 II부에 이미 쪽수가 있음')
ps139.psalmPrayerPage = 467
console.log('Psalm 139:13-18, 23-24: psalmPrayerPage 467')

// (4) 시편 135 — 제3주간 금 저녁 I부 자리에서만 기도를 뺀다
const fri = week3.days.FRI.vespers.psalms
if (fri[0].ref !== 'Psalm 135:1-12' || fri[1].ref !== 'Psalm 135:13-21') fail('week-3 FRI vespers 순서가 예상과 다름')
if ('omitPsalmPrayer' in fri[0]) fail('week-3 FRI vespers psalms[0] 에 이미 omitPsalmPrayer')
fri[0].omitPsalmPrayer = true
console.log('week-3 FRI vespers psalms[0] Psalm 135:1-12: omitPsalmPrayer true')

if (!WRITE) {
  console.log('\nDRY RUN — --write 로 반영한다.')
  process.exit(0)
}
writeJson(PLAIN, plain)
writeJson(RICH, rich)
writeJson(WEEK3, week3)
console.log('반영 완료')
