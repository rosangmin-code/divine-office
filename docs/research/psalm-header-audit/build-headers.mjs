#!/usr/bin/env node
/**
 * build-headers.mjs — 시편 머리말을 책대로 (2026-10-27).
 *
 * 입력: header-book.json (emit-headers.py — 자리마다 책 머리말, 띄어쓰기는 full_pdf.txt).
 * 출력(--write 일 때만):
 *   - src/data/loth/prayers/commons/psalter-headers.rich.json
 *   - src/data/loth/psalter/week-4.json   시편 146 제목 (머리말 앞에 새어 들어가 있던 둘째·셋째 행)
 *
 * 로더는 이제 자리의 쪽(`PsalmEntry.page`) ±1 쪽에 인쇄된 항목을 고른다
 * (`loadPsalterHeaderRich(ref, page)`). 그래서 항목 = 책의 인쇄본 하나다:
 *   - 책이 머리말을 인쇄한 자리마다 그 쪽 항목이 있어야 하고,
 *   - 책이 머리말을 싣지 않은 자리(분할 시편 II부, 성탄·성령강림 제1저녁 고유 시편)
 *     근처에는 항목이 없어야 한다.
 * 기존 항목은 책과 글자가 같으면 그대로 둔다. 새 항목은 source "manual".
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../../..')
const WRITE = process.argv.includes('--write')

const HEADERS = 'src/data/loth/prayers/commons/psalter-headers.rich.json'
const WEEK4 = 'src/data/loth/psalter/week-4.json'
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'))
const writeJson = (p, v) => fs.writeFileSync(path.join(ROOT, p), JSON.stringify(v, null, 2) + '\n', 'utf8')
const fail = (m) => { throw new Error(m) }
const expect = (c, m) => c || fail(m)

const book = JSON.parse(fs.readFileSync(path.join(HERE, 'header-book.json'), 'utf8'))
const catalog = readJson(HEADERS)
const week4 = readJson(WEEK4)
const refs = catalog.refs
const log = []

const squash = (s) => (s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
const sameExact = (e, b) => e.preface_text.replace(/\n/g, ' ') === b.preface && (e.attribution ?? null) === b.attribution
const sameLoose = (e, b) => squash(e.preface_text) === squash(b.preface) && squash(e.attribution) === squash(b.attribution)

// 책과 글자가 다른 기존 항목 중 책대로 고칠 것 — 나머지 차이는 멈춘다
const FIX_TEXT = {
  'Psalm 80:2-8, 15-20@246': '머리말 앞의 «: » 제거',
  'Psalm 135:1-12@383': '출처 «харьцуул.» (비교) 살림',
  'Psalm 135:1-12@428': '출처 «харьцуул.» (비교) 살림',
  'Psalm 146:1-10@460': '제목 둘째·셋째 행이 머리말 앞에 붙어 있던 것 제거',
}
// 책과 글자는 같고 표기만 다른 기존 항목 — 그대로 둔다
const KEEP_LOOSE = {
  'Psalm 51:3-19': 'PDF 추출이 «Та нар оюун» 을 붙여 냄 — 앱이 맞다',
  'Psalm 111:1-10@306': 'full_pdf.txt 행 첫머리의 «.» 은 추출 잡음 — 앱이 맞다',
}
// 책에 없는 머리말 — 지운다 (분할 시편 II부에 I부 머리말을 복제해 둔 것)
const DROP = {
  'Psalm 27:7-14': '«Одоо Тэнгэрбурхан…» (Илчлэл 21:3) — I부(p.116) 머리말 복제. II부는 p.118 에 자기 머리말이 있다',
  'Psalm 135:13-21': 'I부 머리말 복제 — 책은 II부에 머리말을 싣지 않는다 (p.385)',
  'Psalm 136:10-26': 'I부 머리말 복제 — 책은 II부에 머리말을 싣지 않는다 (p.434)',
}

for (const [ref, why] of Object.entries(DROP)) {
  expect(refs[ref]?.entries?.length === 1, `${ref}: 지울 항목 수`)
  const e = refs[ref].entries[0]
  if (ref === 'Psalm 27:7-14') expect(e.attribution === 'Илчлэл 21:3', `${ref}: 예상한 복제가 아님`)
  delete refs[ref]
  log.push(`삭제  ${ref.padEnd(26)} ${why}`)
}

// 책 머리말을 (ref, 머리말 쪽) 단위로 모은다 — 초대송은 invitatory.json 의 epigraph 라 제외
const wanted = new Map()
for (const r of book) {
  if (!r.key.startsWith('psalter-texts:') || !r.header) continue
  const k = `${r.ref}@${r.header.page}`
  if (!wanted.has(k)) wanted.set(k, { ref: r.ref, ...r.header, places: [] })
  wanted.get(k).places.push(r.page)
}

let added = 0
const addedRefs = new Set()
for (const [k, b] of wanted) {
  const entries = (refs[b.ref] ??= { entries: [] }).entries
  const near = entries.filter((e) => Math.abs(e.page - b.page) <= 1)
  expect(near.length <= 1, `${k}: ±1 쪽 항목이 둘 이상`)
  const e = near[0]
  if (e) {
    if (e.page !== b.page) fail(`${k}: 기존 항목 쪽 ${e.page} ≠ 머리말 쪽 ${b.page}`)
    if (sameExact(e, b)) continue
    const fixKey = `${b.ref}@${b.page}`
    if (FIX_TEXT[fixKey]) {
      e.preface_text = b.preface
      if (b.attribution) e.attribution = b.attribution
      e.source = 'manual'
      log.push(`고침  ${fixKey.padEnd(26)} ${FIX_TEXT[fixKey]}`)
      continue
    }
    if ((KEEP_LOOSE[fixKey] || KEEP_LOOSE[b.ref]) && sameLoose(e, b)) continue
    fail(`${k}: 기존 항목이 책과 다름 — 앱 «${e.preface_text}» (${e.attribution}) / 책 «${b.preface}» (${b.attribution})`)
  }
  const entry = { kind: b.kind }
  if (b.attribution) entry.attribution = b.attribution
  Object.assign(entry, {
    preface_text: b.preface,
    page: b.page,
    source: 'manual',
    evidence_line_range: b.evidence_line_range,
  })
  entries.push(entry)
  entries.sort((x, y) => x.page - y.page)
  added++
  addedRefs.add(b.ref)
  log.push(`추가  ${k.padEnd(26)} [${b.kind}] «${b.preface}»${b.attribution ? ` (${b.attribution})` : ''}`)
}

// 새로 생긴 ref 키는 psalter-texts.json 순서 근처가 아니라 맨 뒤에 붙는다 — 키 순서를 쪽 순으로 정리하지는 않는다
// unmatched: 끝기도 시편 4·134·91 은 이제 refs 에 있다
for (const k of ['Psalm 4', 'Psalm 134', 'Psalm 91']) {
  expect(k in (catalog.unmatched ?? {}), `unmatched 에 ${k} 없음`)
  delete catalog.unmatched[k]
}
log.push('정리  unmatched 에서 Psalm 4 · 134 · 91 제거 (끝기도 시편 머리말이 refs 에 들어감)')

// 시편 146 제목 — 책은 세 행 «Тэнгэрбурханд найдагчид / аз жаргалтай болох гэдэг нь / ямар утгатай вэ гэдгээ мэддэг»
{
  const e = week4.days.WED.lauds.psalms[2]
  expect(e.ref === 'Psalm 146:1-10' && e.title === 'Тэнгэрбурханд найдагчид аз жаргалтай болох нь', '시편 146 제목')
  e.title = 'Тэнгэрбурханд найдагчид аз жаргалтай болох гэдэг нь ямар утгатай вэ гэдгээ мэддэг'
  log.push('제목  Psalm 146:1-10 «…аз жаргалтай болох нь» → «…аз жаргалтай болох гэдэг нь ямар утгатай вэ гэдгээ мэддэг» (p.460)')
}

// ── 점검: 로더가 자리마다 책과 같은 머리말을 고르는가 (쪽 ±1, 가까운 것) ──────────────────
const pick = (ref, page) => {
  let best = null
  for (const e of refs[ref]?.entries ?? []) {
    const d = Math.abs(e.page - page)
    if (d <= 1 && (!best || d < Math.abs(best.page - page))) best = e
  }
  return best
}
let checked = 0
for (const r of book) {
  if (!r.key.startsWith('psalter-texts:')) continue
  const e = pick(r.ref, r.page)
  checked++
  if (!r.header) {
    expect(!e, `${r.key}: 책에 머리말이 없는데 항목이 잡힘 (p.${e?.page})`)
    continue
  }
  expect(e, `${r.key}: 책 머리말 (p.${r.header.page}) 을 로더가 못 고름`)
  expect(sameExact(e, r.header) || ((KEEP_LOOSE[r.ref] || KEEP_LOOSE[`${r.ref}@${r.header.page}`]) && sameLoose(e, r.header)),
    `${r.key}: 고른 항목이 책과 다름`)
}
for (const [ref, v] of Object.entries(refs)) {
  const kinds = new Set(v.entries.map((e) => e.kind))
  const attrs = new Set(v.entries.map((e) => e.attribution))
  expect(kinds.size === 1 && attrs.size === 1, `${ref}: 항목끼리 kind·출처가 다름`)
}

console.log(log.join('\n'))
console.log(`\n항목 추가 ${added} (ref ${addedRefs.size}개), 자리 ${checked}곳 로더 점검 통과`)
if (!WRITE) {
  console.log('DRY RUN — 파일을 쓰지 않았다. --write 로 반영한다.')
  process.exit(0)
}
writeJson(HEADERS, catalog)
writeJson(WEEK4, week4)
console.log('반영 완료')
