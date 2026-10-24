#!/usr/bin/env node
/**
 * build.mjs — 시편 139 II부 13–18절 복원 + 시편 144 목요일 I부 분리 (2026-10-24).
 *
 * 입력: emit-lines.py 가 낸 ps139-II.json · ps144-I.json (인쇄면 행 + 연 경계).
 * 출력(--write 일 때만):
 *   - src/data/loth/psalter-texts.json                         plain
 *   - src/data/loth/prayers/commons/psalter-texts.rich.json    rich
 *   - src/data/loth/prayers/commons/psalter-headers.rich.json  머리말
 *   - src/data/loth/psalter/week-4.json                        ref
 *
 * 키 이름은 부의 실제 절 범위로 맞춘다 (분할 시편 II부 5건과 같은 규약 — 화면
 * 제목이 키에서 나온다):
 *   Psalm 139:1-18  → Psalm 139:1-12           (내용이 원래 1–12절)
 *   Psalm 139:23-24 → Psalm 139:13-18, 23-24   (13–18절 복원)
 *   Psalm 144:1-8   신설 (목요일 저녁 I부)     화요일 아침 Psalm 144:1-10 은 그대로
 *   Psalm 144:11-15 → Psalm 144:9-15           (내용이 원래 9–15절, "II" 표지 추가)
 *
 * 책은 부가 나뉜 시편에서 머리말을 I부 앞에, 마침 기도를 II부 뒤에 한 번만
 * 인쇄한다. 그래서 139 I부의 마침 기도와 139 II부의 머리말(I부 것의 복제)을
 * 지우고, 144 목요일 I부에는 화요일 것이 아닌 p.480 머리말(Гэгээн Хилайр)을 단다.
 *
 * phrases 는 기존 체인(`regroupPhrasesByCapitalStart` + 따옴표 대문자 분리)을
 * 그대로 쓴다 — `docs/research/split-psalm-part2/build-part2.mjs` 와 같다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { regroupPhrasesByCapitalStart } from '../../../scripts/build-phrases-into-rich.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../../..')
const WRITE = process.argv.includes('--write')

const PLAIN = 'src/data/loth/psalter-texts.json'
const RICH = 'src/data/loth/prayers/commons/psalter-texts.rich.json'
const HEADERS = 'src/data/loth/prayers/commons/psalter-headers.rich.json'
const WEEK4 = 'src/data/loth/psalter/week-4.json'

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'))
const writeJson = (p, v) =>
  fs.writeFileSync(path.join(ROOT, p), JSON.stringify(v, null, 2) + '\n', 'utf8')

const QUOTE_CAPITAL_RE = /^[“"„«]\s*[А-ЯЁӨҮ]/
const lineText = (l) => l.spans.map((s) => s.text ?? '').join('')

function splitAtQuotedCapitals(lines, phrases) {
  const out = []
  for (const p of phrases) {
    const [s, e] = p.lineRange
    let start = s
    for (let i = s + 1; i <= e; i++) {
      if (QUOTE_CAPITAL_RE.test(lineText(lines[i]).replace(/^\s+/, ''))) {
        out.push({ ...p, lineRange: [start, i - 1] })
        start = i
      }
    }
    out.push({ ...p, lineRange: [start, e] })
  }
  return out
}

/** 키 순서를 지키며 oldKey 를 newKey 로 바꾼다 (value 를 주면 값도 교체). */
function renameKey(obj, oldKey, newKey, value) {
  if (!(oldKey in obj)) throw new Error(`없음: ${oldKey}`)
  if (newKey in obj && newKey !== oldKey) throw new Error(`이미 존재: ${newKey}`)
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    if (k === oldKey) out[newKey] = value === undefined ? v : value
    else out[k] = v
  }
  return out
}

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

/** 앱은 호격 «Аяа» 뒤에 늘 쉼표를 둔다 (source-typo-ledger STC-019). */
const appForm = (s) => s.replace(/Аяа(?=\s)/g, 'Аяа,')

/** emit-lines.py 산출물 → { plain stanzas, rich block } */
function buildPart(label, ref) {
  const src = JSON.parse(fs.readFileSync(path.join(HERE, `${label}.json`), 'utf8'))
  const lines = src.lines.map((t) => ({ spans: [{ kind: 'text', text: appForm(t) }], indent: 0 }))
  const phrases = splitAtQuotedCapitals(lines, regroupPhrasesByCapitalStart(lines))
  const stanza = { kind: 'stanza', lines, phrases, paragraphBoundaries: src.paragraphBoundaries }
  const joined = phrases.map(({ lineRange: [s, e] }) =>
    lines.slice(s, e + 1).map(lineText).join(' '))
  console.log(`[${label}] ${ref}: 인쇄 ${lines.length}행 → 논리 ${phrases.length}행, ` +
    `연경계 ${JSON.stringify(src.paragraphBoundaries)}`)
  return {
    stanzas: [joined],
    rich: { blocks: [stanza], source: { kind: 'common', id: `psalter-text-${ref}` } },
  }
}

let plain = readJson(PLAIN)
let rich = readJson(RICH)
let headers = readJson(HEADERS)
const week4 = readJson(WEEK4)

const slot = (day, hour, i, expectRef) => {
  const s = week4.days[day][hour].psalms[i]
  if (s.ref !== expectRef) throw new Error(`week-4 ${day} ${hour}[${i}] = ${s.ref}, ${expectRef} 기대`)
  return s
}

// ── 시편 139 ────────────────────────────────────────────────────────────
{
  const P1_OLD = 'Psalm 139:1-18', P1 = 'Psalm 139:1-12'
  const P2_OLD = 'Psalm 139:23-24', P2 = 'Psalm 139:13-18, 23-24'

  // I부: 키 이름만 바로잡고, 책에 없는 I부 뒤 마침 기도를 뗀다 (II부가 같은 기도를 가짐)
  const { psalmPrayer: p1Prayer, ...p1Plain } = plain[P1_OLD]
  if (p1Prayer !== plain[P2_OLD].psalmPrayer) throw new Error('139 I·II부 마침 기도가 다름')
  plain = renameKey(plain, P1_OLD, P1, p1Plain)
  rich = renameKey(rich, P1_OLD, P1, {
    ...rich[P1_OLD],
    stanzasRich: { ...rich[P1_OLD].stanzasRich, source: { kind: 'common', id: `psalter-text-${P1}` } },
  })
  headers.refs = renameKey(headers.refs, P1_OLD, P1)

  // II부: 인쇄면에서 다시 만든다 (기존 23–24절 5행은 새 본문의 끝 5행과 같다)
  const part = buildPart('ps139-II', P2)
  const oldTail = rich[P2_OLD].stanzasRich.blocks[0].lines.map(lineText)
  const newTail = part.rich.blocks[0].lines.slice(-oldTail.length).map(lineText)
  if (JSON.stringify(oldTail) !== JSON.stringify(newTail)) throw new Error('139 23–24절이 기존과 다름')
  plain = renameKey(plain, P2_OLD, P2, { stanzas: part.stanzas, psalmPrayer: plain[P2_OLD].psalmPrayer })
  rich = renameKey(rich, P2_OLD, P2, { stanzasRich: part.rich })
  // II부 머리말은 I부 것의 복제였다 — 책은 I부 앞에만 인쇄한다
  delete headers.refs[P2_OLD]

  slot('WED', 'vespers', 0, P1_OLD).ref = P1
  slot('WED', 'vespers', 1, P2_OLD).ref = P2
}

// ── 시편 144 (목요일 저녁) ──────────────────────────────────────────────
{
  const TUE = 'Psalm 144:1-10', P1 = 'Psalm 144:1-8'
  const P2_OLD = 'Psalm 144:11-15', P2 = 'Psalm 144:9-15'

  // I부 신설: 1–8절. 마침 기도는 II부 뒤에만 있으므로 넣지 않는다
  const part = buildPart('ps144-I', P1)
  plain = insertAfter(plain, TUE, P1, { stanzas: part.stanzas })
  rich = insertAfter(rich, TUE, P1, { stanzasRich: part.rich })
  headers.refs = insertAfter(headers.refs, TUE, P1, {
    entries: [{
      kind: 'patristic_preface',
      attribution: 'Гэгээн Хилайр',
      preface_text: '“Би ертөнцийг ялсан” гэж айлдсанчлан Христ ертөнцийг ялахдаа дайтах урлагийг сурч авсан',
      page: 480,
      source: 'manual',
      evidence_line_range: [16622, 16624],
    }],
  })

  // II부: 키 이름을 9–15절로, 책의 "II" 표지를 맨 앞에 (분할 시편 II부 5건과 같은 꼴)
  const p2Plain = structuredClone(plain[P2_OLD])
  p2Plain.stanzas[0].unshift('II')
  const p2Rich = structuredClone(rich[P2_OLD])
  const blk = p2Rich.stanzasRich.blocks[0]
  if (p2Rich.stanzasRich.blocks.length !== 1 || lineText(blk.lines[0]) === 'II') throw new Error('144 II부 모양이 예상과 다름')
  blk.lines.unshift({ spans: [{ kind: 'text', text: 'II' }], indent: 0 })
  blk.phrases = [{ lineRange: [0, 0], indent: 0 },
    ...blk.phrases.map((p) => ({ ...p, lineRange: [p.lineRange[0] + 1, p.lineRange[1] + 1] }))]
  blk.paragraphBoundaries = blk.paragraphBoundaries.map((i) => i + 1)
  p2Rich.stanzasRich.source = { kind: 'common', id: `psalter-text-${P2}` }
  plain = renameKey(plain, P2_OLD, P2, p2Plain)
  rich = renameKey(rich, P2_OLD, P2, p2Rich)

  slot('THU', 'vespers', 0, TUE).ref = P1
  slot('THU', 'vespers', 1, P2_OLD).ref = P2
  slot('TUE', 'lauds', 2, TUE) // 화요일 아침은 그대로
}

// ── 시편 85:2 — «ЭЗЭН» 뒤 쉼표 (호격, 사용자 결정 2026-10-24) ─────────────
{
  const REF = 'Psalm 85:2-14'
  const FROM = 'Аяа, ЭЗЭН Та Өөрийн нутагт ивээлээ үзүүлсэн.'
  const TO = 'Аяа, ЭЗЭН, Та Өөрийн нутагт ивээлээ үзүүлсэн.'
  let n = 0
  plain[REF].stanzas = plain[REF].stanzas.map((st) => st.map((l) => (l.includes(FROM) ? (n++, l.replace(FROM, TO)) : l)))
  for (const b of rich[REF].stanzasRich.blocks)
    for (const l of b.lines ?? [])
      for (const s of l.spans) if (s.text?.includes(FROM)) { s.text = s.text.replace(FROM, TO); n++ }
  if (n !== 2) throw new Error(`시편 85 쉼표: ${n}곳 (2 기대)`)
  console.log(`[ps85] ${REF}: «ЭЗЭН,» 2곳 (plain·rich)`)
}

if (!WRITE) {
  console.log('\nDRY RUN — 파일을 쓰지 않았다. --write 로 반영한다.')
  process.exit(0)
}
writeJson(PLAIN, plain)
writeJson(RICH, rich)
writeJson(HEADERS, headers)
writeJson(WEEK4, week4)
console.log('\n반영 완료')
