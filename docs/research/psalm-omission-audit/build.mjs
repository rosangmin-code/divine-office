#!/usr/bin/env node
/**
 * build.mjs — 시편·찬가 본문의 빠진 절 복원, 섞여 든 행 제거, 뒤섞인 연 순서 정정 (2026-10-27).
 *
 * 입력: fix-lines.json (emit-fixes.py — 인쇄면 행 + 연 경계).
 * 출력(--write 일 때만):
 *   - src/data/loth/psalter-texts.json                         plain
 *   - src/data/loth/prayers/commons/psalter-texts.rich.json    rich
 *   - src/data/loth/prayers/commons/psalter-headers.rich.json  시편 47 머리말
 *   - src/data/loth/psalter/week-{2,3}.json                    본문 시작 쪽 3곳
 *
 * 기존 행·phrase·role(refrain/continuation)은 건드리지 않고 필요한 자리만 고친다.
 * 새 행은 인쇄 행 1:1, phrase 는 regroupPhrasesByCapitalStart + 따옴표 대문자 분리
 * (docs/research/psalter-139-144-verses/build.mjs 와 같은 체인). plain 은 rich 블록과
 * 1:1 인 stanza 구조를 따른다 — stanza i 는 블록 i 의 phrase 들을 이은 것.
 *
 * 쪽이 바뀌는 자리의 연 구분은 세로 간격으로 잴 수 없다. 앞 쪽 연에 이어 붙일지 새 연으로
 * 둘지는 절 구조로 정했다 (자리마다 주석).
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

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'))
const writeJson = (p, v) =>
  fs.writeFileSync(path.join(ROOT, p), JSON.stringify(v, null, 2) + '\n', 'utf8')

const FIX = JSON.parse(fs.readFileSync(path.join(HERE, 'fix-lines.json'), 'utf8'))
const plain = readJson(PLAIN)
const rich = readJson(RICH)
const headers = readJson(HEADERS)

const QUOTE_CAPITAL_RE = /^[“"„«]\s*[А-ЯЁӨҮ]/
const lineText = (l) => l.spans.map((s) => s.text ?? '').join('')
/** 앱은 호격 «Аяа» 뒤에 늘 쉼표를 둔다 (source-typo-ledger STC-019). */
const appForm = (s) => s.replace(/Аяа(?=\s)/g, 'Аяа,')

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

const fail = (msg) => {
  throw new Error(msg)
}
const expect = (cond, msg) => cond || fail(msg)

function mkLines(texts) {
  return texts.map((t) => ({ spans: [{ kind: 'text', text: appForm(t) }], indent: 0 }))
}

function mkPhrases(lines, role) {
  const ps = splitAtQuotedCapitals(lines, regroupPhrasesByCapitalStart(lines))
  return role ? ps.map((p) => ({ ...p, role })) : ps
}

const phraseText = (lines, p) =>
  lines.slice(p.lineRange[0], p.lineRange[1] + 1).map(lineText).join(' ')

/** fix-lines.json 구간 → 연 경계로 나눈 행 묶음들 */
function stanzasOf(key) {
  const { lines, breaks } = FIX[key]
  const cuts = [0, ...breaks, lines.length]
  return cuts.slice(0, -1).map((s, i) => lines.slice(s, cuts[i + 1]))
}

const blocksOf = (ref) => rich[ref].stanzasRich.blocks
const stanzasPlain = (ref) => plain[ref].stanzas

/** 블록 하나를 새로 만든다 (연 하나). plain stanza 도 함께. */
function makeBlock(texts, role) {
  const lines = mkLines(texts)
  const phrases = mkPhrases(lines, role)
  return { block: { kind: 'stanza', lines, phrases }, stanza: phrases.map((p) => phraseText(lines, p)) }
}

/** 블록 bi 의 행 위치 at 에 새 행들을 넣는다. groups = 연 경계로 나눈 행 묶음. */
function insertIntoBlock(ref, bi, at, groups, { pbBefore = false, pbAfter = false, role } = {}) {
  const block = blocksOf(ref)[bi]
  const texts = groups.flat()
  const n = texts.length
  expect(!block.phrases.some((p) => p.lineRange[0] < at && at <= p.lineRange[1]),
    `${ref} b${bi}: 위치 ${at} 가 phrase 중간`)
  const newLines = mkLines(texts)
  const newPhrases = mkPhrases(newLines, role).map((p) => ({
    ...p, lineRange: [p.lineRange[0] + at, p.lineRange[1] + at],
  }))
  const before = block.phrases.filter((p) => p.lineRange[0] < at)
  const after = block.phrases.filter((p) => p.lineRange[0] >= at).map((p) => ({
    ...p, lineRange: [p.lineRange[0] + n, p.lineRange[1] + n],
  }))
  block.lines.splice(at, 0, ...newLines)
  block.phrases = [...before, ...newPhrases, ...after]

  const pb = new Set((block.paragraphBoundaries ?? []).map((i) => (i >= at ? i + n : i)))
  if (pbBefore && at > 0) pb.add(at)
  if (pbAfter && at + n < block.lines.length) pb.add(at + n)
  let off = at
  for (const g of groups.slice(0, -1)) {
    off += g.length
    pb.add(off)
  }
  if (pb.size || block.paragraphBoundaries) block.paragraphBoundaries = [...pb].sort((a, b) => a - b)

  // plain: 같은 stanza 의 phrase 순번 자리에 논리 행으로 넣는다
  const st = stanzasPlain(ref)[bi]
  st.splice(before.length, 0, ...newPhrases.map((p) => phraseText(block.lines, p)))
}

/** 블록 bi 의 맨 앞 phrase(행 0..k-1)를 지운다. */
function dropLeadingPhrase(ref, bi, expectText) {
  const block = blocksOf(ref)[bi]
  const p0 = block.phrases[0]
  expect(phraseText(block.lines, p0) === expectText, `${ref} b${bi}: 첫 phrase 가 예상과 다름`)
  const k = p0.lineRange[1] + 1
  block.lines.splice(0, k)
  block.phrases = block.phrases.slice(1).map((p) => ({
    ...p, lineRange: [p.lineRange[0] - k, p.lineRange[1] - k],
  }))
  if (block.paragraphBoundaries) {
    block.paragraphBoundaries = block.paragraphBoundaries.map((i) => i - k).filter((i) => i > 0)
  }
  const st = stanzasPlain(ref)[bi]
  expect(st[0].trim() === expectText, `${ref} plain s${bi}: 첫 행이 예상과 다름`)
  st.splice(0, 1)
}

function appendBlocks(ref, groups, role) {
  for (const g of groups) {
    const { block, stanza } = makeBlock(g, role)
    blocksOf(ref).push(block)
    stanzasPlain(ref).push(stanza)
  }
}

function removeBlock(ref, bi, expectLines) {
  const got = blocksOf(ref)[bi].lines.map(lineText)
  expect(JSON.stringify(got) === JSON.stringify(expectLines), `${ref} b${bi}: 지울 블록이 예상과 다름 ${JSON.stringify(got)}`)
  blocksOf(ref).splice(bi, 1)
  stanzasPlain(ref).splice(bi, 1)
}

/** 블록 순서를 바꾼다. order 의 원소는 블록 번호 또는 [앞, 뒤] (뒤를 앞에 연 구분 없이 잇는다). */
function reorder(ref, order) {
  const B = blocksOf(ref)
  const P = stanzasPlain(ref)
  expect(order.flat().sort((a, b) => a - b).join() === B.map((_, i) => i).join(), `${ref}: 순서 목록이 블록 전부가 아님`)
  const nb = []
  const np = []
  for (const o of order) {
    if (!Array.isArray(o)) {
      nb.push(B[o])
      np.push(P[o])
      continue
    }
    const [a, b] = o
    const n = B[a].lines.length
    const pb = [...(B[a].paragraphBoundaries ?? []), ...(B[b].paragraphBoundaries ?? []).map((i) => i + n)]
    const merged = {
      ...B[a],
      lines: [...B[a].lines, ...B[b].lines],
      phrases: [...B[a].phrases, ...B[b].phrases.map((p) => ({
        ...p, lineRange: [p.lineRange[0] + n, p.lineRange[1] + n],
      }))],
    }
    if (pb.length) merged.paragraphBoundaries = pb
    else delete merged.paragraphBoundaries
    nb.push(merged)
    np.push([...P[a], ...P[b]])
  }
  rich[ref].stanzasRich.blocks = nb
  plain[ref].stanzas = np
}

const firstLine = (ref, bi) => lineText(blocksOf(ref)[bi].lines[0])
const lastLine = (ref, bi) => lineText(blocksOf(ref)[bi].lines.at(-1))

function replaceText(ref, from, to) {
  let n = 0
  plain[ref].stanzas = plain[ref].stanzas.map((st) => st.map((l) => (l.includes(from) ? (n++, l.replace(from, to)) : l)))
  for (const b of blocksOf(ref))
    for (const l of b.lines)
      for (const s of l.spans) if (s.text?.includes(from)) { s.text = s.text.replace(from, to); n++ }
  expect(n === 2, `${ref}: «${from}» ${n}곳 (plain·rich 2 기대)`)
}

const log = []
const note = (ref, what) => log.push(`${ref.padEnd(22)} ${what}`)

// ── 빠진 절 ────────────────────────────────────────────────────────────────
{ // 시편 33 끝 연 (22절, p.98). 같은 쪽, 앞 연과 사이에 빈 줄
  const ref = 'Psalm 33:1-9'
  expect(lastLine(ref, 2) === 'Зүрх маань Түүнд баярладаг.', `${ref}: 끝 행`)
  insertIntoBlock(ref, 2, blocksOf(ref)[2].lines.length, stanzasOf('ps33-end'), { pbBefore: true })
  note(ref, '끝 연 3행 (p.98)')
}
{ // 시편 47 — 본문 첫 행에 들어가 있던 머리말을 머리말 자리로, 끝 연 (10절, p.113) 복원.
  // p.112 의 연들은 두 절씩(2–3, 4–5, 6–7, 8–9)이라 10절은 새 연으로 둔다.
  const ref = 'Psalm 47:2-10'
  const header = FIX['ps47-header'].lines.join(' ')
  dropLeadingPhrase(ref, 0, header)
  insertIntoBlock(ref, 0, blocksOf(ref)[0].lines.length, stanzasOf('ps47-end'), { pbBefore: true })
  const keys = Object.keys(plain)
  const prev = keys.slice(0, keys.indexOf(ref)).reverse().find((k) => k in headers.refs)
  const refs = {}
  for (const [k, v] of Object.entries(headers.refs)) {
    refs[k] = v
    if (k === prev) {
      refs[ref] = {
        entries: [{
          kind: 'uncited_caption',
          preface_text: header,
          page: FIX['ps47-header'].page,
          source: 'manual',
          evidence_line_range: [3676, 3677],
        }],
      }
    }
  }
  expect(ref in refs, `${ref}: 머리말 자리 못 찾음`)
  headers.refs = refs
  note(ref, '본문 첫 행(머리말) → 머리말, 끝 연 6행 (p.113)')
}
{ // 예레미야 31 끝 연 (14절, p.128). 이 항목은 연마다 블록이라 새 블록
  const ref = 'Jeremiah 31:10-14'
  expect(lastLine(ref, 2) === 'Зовлонгийнх нь оронд тэдэнд баяр хөөрийг өгнө.', `${ref}: 끝 행`)
  appendBlocks(ref, stanzasOf('jer31-end'))
  note(ref, '끝 연 5행 (p.128)')
}
{ // 이사야 45:16 (p.145 첫 2행). 뒤에 빈 줄이 있고 앞은 쪽 경계 — 15절 연에 이어 붙인다
  const ref = 'Isaiah 45:15-26'
  expect(lastLine(ref, 0) === 'Тэнгэрбурхан юм.', `${ref}: 블록 0 끝 행`)
  expect(firstLine(ref, 1) === 'Харин Израил ЭЗЭНээр аврагдана.', `${ref}: 블록 1 첫 행`)
  insertIntoBlock(ref, 0, blocksOf(ref)[0].lines.length, stanzasOf('isa45-v16'))
  note(ref, '16절 2행 (p.145)')
}
{ // 에페소 1 끝 세 연 (p.88). 이 쪽은 연마다 블록이라 새 블록 셋
  const ref = 'Ephesians 1:3-10'
  expect(lastLine(ref, 2) === 'Гэм нүглүүдийн уучлалыг хүртдэг юм.', `${ref}: 끝 행`)
  appendBlocks(ref, stanzasOf('eph1-end'))
  note(ref, '끝 세 연 10행 (p.88)')
}
{ // 시편 62:3 (p.237 첫 2행). 2절과 한 연 — 앞 블록에 이어 붙인다
  const ref = 'Psalm 62:2-9'
  expect(lastLine(ref, 0) === 'Аврал минь Түүнээс юм.', `${ref}: 블록 0 끝 행`)
  expect(firstLine(ref, 1) === 'Нурж буй хана,', `${ref}: 블록 1 첫 행`)
  insertIntoBlock(ref, 0, blocksOf(ref)[0].lines.length, stanzasOf('ps62-v3'))
  note(ref, '3절 2행 (p.237)')
}
{ // 이사야 12 첫 두 연 (p.249) — 첫 연은 시편 80 끝에 붙어 있었다
  const ref = 'Isaiah 12:1-6'
  expect(firstLine(ref, 0) === 'Та нар авралын худгаас баяртайгаар ус татна.', `${ref}: 첫 행`)
  insertIntoBlock(ref, 0, 0, stanzasOf('isa12-start'), { pbAfter: true })
  note(ref, '첫 두 연 8행 (p.249)')
}
{ // 시편 148:7–8 (p.301 첫 4행, 뒤에 빈 줄). 7절은 1절과 짝을 이루는 새 단락의 시작
  const ref = 'Psalm 148:1-14'
  expect(firstLine(ref, 1) === 'Уулс, хамаг толгод,', `${ref}: 블록 1 첫 행`)
  insertIntoBlock(ref, 1, 0, stanzasOf('ps148-v7'), { pbAfter: true })
  note(ref, '7–8절 4행 (p.301)')
}
// 시편 67 끝 후렴 (p.334) 은 넣지 않는다 — 책이 시편 67 을 세 번 인쇄하는데(p.30 초대송,
// p.239 제2주간 수 저녁, p.333 제3주간 화 아침) 끝 후렴 반복은 p.333 에만 있다. 앱은 두
// 시간경이 본문 하나(`Psalm 67:2-8`)를 같이 쓰므로 한쪽에 맞추면 다른 쪽이 틀린다.
// 사용자 판단으로 남김 — docs/bug-reports/2026-10-27-psalm-omission-audit.md
{ // 시편 131 첫 연 + 둘째 연 첫 행 (p.338). 둘째 연은 p.339 로 이어진다 — 뒤에 연 구분 없음
  const ref = 'Psalm 131:1-3'
  expect(firstLine(ref, 0) === 'Өөрийгөө би тогтуун, нам гүм байлгав.', `${ref}: 첫 행`)
  insertIntoBlock(ref, 0, 0, stanzasOf('ps131-start'))
  note(ref, '1–2a절 5행 (p.338)')
}
{ // 시편 137 끝 두 연 (4–6절, p.449). 연마다 블록
  const ref = 'Psalm 137:1-6'
  expect(lastLine(ref, 1) === 'Биднийг зовоогчид баяр хөөр шаардсан юм.', `${ref}: 끝 행`)
  appendBlocks(ref, stanzasOf('ps137-end'))
  note(ref, '4–6절 두 연 9행 (p.449)')
}
{ // 시편 147:1 앞 두 행 (p.476). 같은 연
  const ref = 'Psalm 147:1-11'
  expect(firstLine(ref, 0) === 'Юутай сайн бэ!', `${ref}: 첫 행`)
  insertIntoBlock(ref, 0, 0, stanzasOf('ps147-start'))
  note(ref, '1절 앞 2행 (p.476·p.734)')
}

// ── 섞여 든 행 ─────────────────────────────────────────────────────────────
{ // 시편 80 끝 블록 = 이사야 12 첫 연
  const ref = 'Psalm 80:2-8, 15-20'
  removeBlock(ref, 3, FIX['isa12-start'].lines.slice(0, 4))
  note(ref, '끝에 붙은 이사야 12 첫 연 4행 제거')
}
{ // 시편 30 가운데의 한 행 = 시편 32 부활 시기 후렴 둘째 행 (p.135 맨 위)
  const ref = 'Psalm 30:2-13'
  removeBlock(ref, 2, ['Тэнгэрбурхантай эвлэрүүлэгдсэн. Аллэлуяа!'])
  note(ref, '시편 32 후렴 행 제거')
}

// ── 연 순서 (같은 펼침면의 왼쪽·오른쪽 쪽이 엇갈려 들어감) ─────────────────────
{ // 시편 42: p.197 맨 위 후렴 끝(블록 2)이 p.196 첫 연 뒤에 끼어 있었다.
  // p.196 끝 «Сэтгэл минь ээ, чи юунд цөхөрнө вэ?»(블록 3 끝) 뒤로 옮긴다. 두 블록을
  // 한 블록으로 잇지는 않는다 — 시편 42 는 연 경계 파일럿(scripts/build-paragraphs-into-rich.mjs
  // PILOT_MANIFEST)이 블록마다 인쇄 쪽 하나를 고정한다. 매니페스트의 블록 2·3 도 함께 바꾼다
  const ref = 'Psalm 42:2-6'
  expect(firstLine(ref, 2) === 'Яагаад чи дотор минь гасална вэ?', `${ref}: 블록 2`)
  expect(lastLine(ref, 3) === 'Сэтгэл минь ээ, чи юунд цөхөрнө вэ?', `${ref}: 블록 3`)
  reorder(ref, [0, 1, 3, 2])
  note(ref, '끝 후렴 4행을 제자리(끝)로')
}
{ // 시편 65: p.214 의 연(블록 1·3·5·7)과 p.215 의 연(0·2·4·6·8)이 엇갈려 있었다.
  // 블록 7 «Бидний авралын Тэнгэрбурхан,» 은 p.215 첫 연(블록 0)과 한 연
  const ref = 'Psalm 65:2-9'
  const want = {
    0: 'Газар дэлхийн бүх хязгаар,', 1: 'Тэнгэрбурхан, Таны өмнө', 2: 'Та газар дэлхийд айлчилж, усалдаг',
    3: 'Танд бүх махбод очдог.', 4: 'Та түүний шанг арвинаар услан', 5: 'Хашаандаа суулгахаар',
    6: 'Та ээлтэй жилдээ титэм өмсгөн', 7: 'Бидний авралын Тэнгэрбурхан,', 8: 'Нугыг хонин сүрэг нөмөрч, –',
  }
  for (const [i, t] of Object.entries(want)) expect(firstLine(ref, +i) === t, `${ref}: 블록 ${i} 첫 행`)
  reorder(ref, [1, 3, 5, [7, 0], 2, 4, 6, 8])
  note(ref, '연 순서를 책대로')
}
{ // 시편 81: p.250 의 연(블록 1·3·5·7)과 p.251 의 연(0·2·4·6)이 엇갈려 있었다
  const ref = 'Psalm 81:2-11'
  const want = {
    0: 'Дунд чинь гаднын бурхан бүү байг.', 1: 'Хүч маань болсон Тэнгэрбурханд', 2: 'Гэвч Миний хүмүүс дууг минь сонссонгүй',
    3: 'Дуу өргөж, товшуур цохиж,', 4: 'Хүмүүс минь Намайг сонсож,', 5: 'Учир нь Израилд зориулсан зарлиг,',
    6: 'ЭЗЭНийг үзэн ядагсад', 7: 'Би мэдэхгүй хэлээ сонсов.',
  }
  for (const [i, t] of Object.entries(want)) expect(firstLine(ref, +i).trim() === t, `${ref}: 블록 ${i} 첫 행 ${firstLine(ref, +i)}`)
  reorder(ref, [1, 3, 5, 7, 0, 2, 4, 6])
  note(ref, '연 순서를 책대로')
}

// ── 책에 없는 낱말 ─────────────────────────────────────────────────────────
replaceText('Ezekiel 36:24-28', 'Хамаг шүтээнээс та нарыг арилгах болно.', 'Хамаг шүтээнээс чинь цэвэрлэх болно.')
note('Ezekiel 36:24-28', '«та нарыг арилгах» → «чинь цэвэрлэх» (p.507)')
replaceText('Deuteronomy 32:1-12', 'Түүний хүүхэд биш, нүгэлтэй толбо болов.', 'Түүний хүүхэд биш, ичгүүрт толбо болов.')
note('Deuteronomy 32:1-12', '«нүгэлтэй» → «ичгүүрт» (p.281)')

// ── 본문이 시작하는 쪽 (page) ───────────────────────────────────────────────
// 앞부분이 빠지거나 뒤섞여 있던 세 시편은 `page` 가 앱의 (틀린) 첫 행이 있던 쪽을 가리켰다.
// 본문 첫 행이 제자리를 찾았으므로 책에서 본문이 시작하는 쪽으로 맞춘다
// (scripts/verify-psalter-pages.js 의 verified-correction 3건과 같다).
const WEEK = (n) => `src/data/loth/psalter/week-${n}.json`
const weeks = { 2: readJson(WEEK(2)), 3: readJson(WEEK(3)) }
for (const [w, day, hour, i, ref, from, to] of [
  [2, 'TUE', 'lauds', 2, 'Psalm 65:2-9', 215, 214],
  [2, 'THU', 'lauds', 2, 'Psalm 81:2-11', 251, 250],
  [3, 'TUE', 'vespers', 1, 'Psalm 131:1-3', 339, 338],
]) {
  const e = weeks[w].days[day][hour].psalms[i]
  expect(e.ref === ref && e.page === from, `week-${w} ${day} ${hour}[${i}]: ${e.ref} p.${e.page}`)
  e.page = to
  note(ref, `page ${from} → ${to}`)
}

// ── 점검: 바꾼 항목은 plain stanza i == 블록 i 의 phrase 들 (원래 그랬던 항목) ──────
const touched = [...new Set(log.map((l) => l.slice(0, 22).trim()))]
for (const ref of touched) {
  const B = blocksOf(ref)
  const P = stanzasPlain(ref)
  expect(B.length === P.length, `${ref}: 블록 ${B.length} / stanza ${P.length}`)
  const flatRich = B.flatMap((b) => b.lines.map(lineText)).join(' ').replace(/\s+/g, ' ').trim()
  const flatPlain = P.flat().map((l) => l.trim()).join(' ').replace(/\s+/g, ' ').trim()
  expect(flatRich === flatPlain, `${ref}: plain·rich 본문이 다름`)
  for (const b of B) {
    const covered = b.phrases.flatMap((p) => Array.from({ length: p.lineRange[1] - p.lineRange[0] + 1 }, (_, k) => p.lineRange[0] + k))
    expect(covered.join() === b.lines.map((_, i) => i).join(), `${ref}: phrase 가 행을 빈틈없이 덮지 않음`)
    for (const i of b.paragraphBoundaries ?? []) expect(i > 0 && i < b.lines.length, `${ref}: 연 경계 범위 밖 ${i}`)
  }
}

console.log(log.join('\n'))
console.log(`\n${touched.length}개 항목`)
if (!WRITE) {
  console.log('DRY RUN — 파일을 쓰지 않았다. --write 로 반영한다.')
  process.exit(0)
}
writeJson(PLAIN, plain)
writeJson(RICH, rich)
writeJson(HEADERS, headers)
for (const [w, data] of Object.entries(weeks)) writeJson(WEEK(w), data)
console.log('반영 완료')
