#!/usr/bin/env node
/**
 * build-part2.mjs — 분할 시편 II부 엔트리를 데이터에 반영한다.
 *
 * 입력: emit-lines.py 가 낸 part2-<label>.json (인쇄면 행 + 연 경계).
 * 출력(--write 일 때만):
 *   - src/data/loth/psalter-texts.json                       plain stanzas
 *   - src/data/loth/prayers/commons/psalter-texts.rich.json  stanzasRich
 *   - src/data/loth/psalter/week-{2,3,4}.json                ref + page
 *
 * phrases 는 프로젝트 기존 체인(`regroupPhrasesByCapitalStart`)을 그대로 쓴다.
 * 이 함수가 저장된 I부 5건 전 블록의 phrases 를 정확히 재현하는 것을 확인했다.
 * 다만 여는 따옴표로 시작하는 행(`“Биеийн…`)은 `^[А-ЯЁӨҮ]` 에 걸리지 않아
 * 앞 phrase 로 잘못 병합된다 — 저장된 ps132 I부가 실제로 그 상태다.
 * 새 데이터에는 같은 결함을 재생산하지 않도록 따옴표 뒤 대문자도 phrase 시작
 * 으로 본다 (plain 쪽 저장본이 이미 그렇게 나뉘어 있어 그쪽과도 일치한다).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { regroupPhrasesByCapitalStart } from '../../../scripts/build-phrases-into-rich.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../../..')
const WRITE = process.argv.includes('--write')

// label → { part1Ref, part2Ref, week, day, hour, slot }
const TARGETS = [
  { label: 'ps45',  one: 'Psalm 45:2-10',   two: 'Psalm 45:11-18',  week: 2, day: 'MON', hour: 'vespers', slot: 1 },
  { label: 'ps49',  one: 'Psalm 49:1-13',   two: 'Psalm 49:14-21',  week: 2, day: 'TUE', hour: 'vespers', slot: 1 },
  { label: 'ps72',  one: 'Psalm 72:1-11',   two: 'Psalm 72:12-19',  week: 2, day: 'THU', hour: 'vespers', slot: 1 },
  { label: 'ps132', one: 'Psalm 132:1-10',  two: 'Psalm 132:11-18', week: 3, day: 'THU', hour: 'vespers', slot: 1 },
  { label: 'ps145', one: 'Psalm 145:1-13',  two: 'Psalm 145:14-21', week: 4, day: 'FRI', hour: 'vespers', slot: 1 },
]

const QUOTE_CAPITAL_RE = /^[“"„«]\s*[А-ЯЁӨҮ]/

/** 여는 따옴표 + 대문자로 시작하는 행에서 phrase 를 추가로 끊는다. */
function splitAtQuotedCapitals(lines, phrases) {
  const text = (i) => lines[i].spans.map((s) => s.text ?? '').join('').replace(/^\s+/, '')
  const out = []
  for (const p of phrases) {
    const [s, e] = p.lineRange
    let start = s
    for (let i = s + 1; i <= e; i++) {
      if (QUOTE_CAPITAL_RE.test(text(i))) {
        out.push({ ...p, lineRange: [start, i - 1] })
        start = i
      }
    }
    out.push({ ...p, lineRange: [start, e] })
  }
  return out
}

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'))
const writeJson = (p, v) =>
  fs.writeFileSync(path.join(ROOT, p), JSON.stringify(v, null, 2) + '\n', 'utf8')

/** obj 의 afterKey 바로 뒤에 newKey 를 끼워 넣은 새 객체 (키 순서 보존). */
function insertAfter(obj, afterKey, newKey, value) {
  if (newKey in obj) throw new Error(`이미 존재: ${newKey}`)
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v
    if (k === afterKey) out[newKey] = value
  }
  if (!(newKey in out)) throw new Error(`기준 키 없음: ${afterKey}`)
  return out
}

const plain = readJson('src/data/loth/psalter-texts.json')
const rich = readJson('src/data/loth/prayers/commons/psalter-texts.rich.json')
const weeks = {}
for (const w of [2, 3, 4]) weeks[w] = readJson(`src/data/loth/psalter/week-${w}.json`)

let nextPlain = plain
let nextRich = rich

for (const t of TARGETS) {
  const src = JSON.parse(fs.readFileSync(path.join(HERE, `part2-${t.label}.json`), 'utf8'))
  if (src.blocks.length !== 1) throw new Error(`${t.label}: 블록 ${src.blocks.length}개 — 1개를 기대`)
  const b = src.blocks[0]
  const lines = b.lines.map((text) => ({ spans: [{ kind: 'text', text }], indent: 0 }))
  const phrases = splitAtQuotedCapitals(lines, regroupPhrasesByCapitalStart(lines))
  const stanza = { kind: 'stanza', lines, phrases, paragraphBoundaries: b.paragraphBoundaries }
  const richEntry = {
    stanzasRich: { blocks: [stanza], source: { kind: 'common', id: `psalter-text-${t.two}` } },
  }
  const joined = phrases.map(({ lineRange: [s, e] }) =>
    lines.slice(s, e + 1).map((l) => l.spans.map((x) => x.text).join('')).join(' '))

  nextPlain = insertAfter(nextPlain, t.one, t.two, { stanzas: [joined] })
  nextRich = insertAfter(nextRich, t.one, t.two, richEntry)

  const wk = weeks[t.week]
  const slot = (wk.days ?? wk)[t.day][t.hour].psalms[t.slot]
  if (slot.ref !== t.one) throw new Error(`${t.label}: 슬롯 ref 가 ${slot.ref} — ${t.one} 을 기대`)
  const page = b.spansPages ? b.spansPages[0] : b.bookPage
  console.log(`[${t.label}] ${t.two}: ${lines.length}행 → ${phrases.length} phrases, ` +
    `연경계 ${JSON.stringify(b.paragraphBoundaries)}, week-${t.week} ${t.day} page ${slot.page} → ${page}`)
  slot.ref = t.two
  slot.page = page
}

if (!WRITE) {
  console.log('\nDRY RUN — 파일을 쓰지 않았다. --write 로 반영한다.')
  process.exit(0)
}
writeJson('src/data/loth/psalter-texts.json', nextPlain)
writeJson('src/data/loth/prayers/commons/psalter-texts.rich.json', nextRich)
for (const w of [2, 3, 4]) writeJson(`src/data/loth/psalter/week-${w}.json`, weeks[w])
console.log('\n반영 완료')
