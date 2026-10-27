#!/usr/bin/env node
/**
 * build-titles.mjs — 시편 제목(빨간 부제)을 책대로 (2026-10-27).
 *
 * 입력: title-book.json (emit-titles.py — 데이터 항목마다 책 제목). 제목 글자는 인쇄 행
 * (pdfplumber)을 이은 것이고, 새로 넣는 21개는 인쇄면 PNG 로 대조했다.
 *
 *   - 제목 없음(165): 주일 제1저녁 고유 시편(시기 고유부 5개 파일) + 끝기도 시편 9 → 넣는다
 *   - 책에 없는 제목(11): 분할 시편 II부 10(책은 «II» 표지만) + 시락 36(책에 부제 없음) → 지운다
 *   - 글자 다름: 시편 113 «Эзэний нэрийг…» 2곳 → 책 낱말대로. 시편 11 끝 «.», 시편 80 끝 «:»
 *
 * 시편 113 제목은 책이 «алдрыгмагтан» 으로 붙여 찍었다 — 띄어 쓴다(사용자 결정 2026-10-27,
 * source-typo-ledger STC-021). 시편 150 «!»·다니엘 3 마침표 없음은 인쇄면 그대로라 앱이 맞고,
 * 이사야 40 «Хоньчин» 대문자는 STC-009 의 앱 결정이라 그대로 둔다.
 *
 * 시기 고유부 christmas·easter·ordinary-time 은 손으로 한 줄로 접은 객체가 있어 JSON 을 다시
 * 쓰면 수백 행이 바뀐다. 그래서 고유부는 텍스트에서 항목의 `"default_antiphon"` 행 바로 뒤에
 * `"title"` 행만 끼워 넣는다 (같은 ref 의 몇 번째 출현인지로 위치를 찾고 단언한다).
 * 시편집 week-*.json·compline.json 은 JSON 왕복이 같은 바이트라 객체로 고친다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../../..')
const DATA = 'src/data/loth'
const WRITE = process.argv.includes('--write')
const fail = (m) => { throw new Error(m) }
const expect = (c, m) => c || fail(m)

const rows = JSON.parse(fs.readFileSync(path.join(HERE, 'title-book.json'), 'utf8'))
const PS113 = 'Эзэний нэр алдрыг магтан дуулагтун'
const bookTitle = (r) => (r.ref === 'Psalm 113:1-9' ? PS113 : r.book_lines.join(' '))

// 글자는 같고 표기만 다른 항목 — 손대지 않는다
const KEEP = {
  'Psalm 150:1-6': '인쇄면은 «Эзэнийг магтагтун!» — full_pdf.txt 대조가 같은 글자의 후렴 행(«.»)을 잡았다. 앱이 맞다',
  'Daniel 3:57-88, 56': '인쇄면에 마침표 없음 — 앱이 맞다',
  'Isaiah 40:10-17': '«Сайн Хоньчин» 대문자는 앱 결정 (STC-009)',
}

// 항목별 목표: { where → title | null(삭제) }
const plan = new Map()
const log = []
for (const r of rows) {
  if (r.status === 'ok' || r.status === 'none') continue
  if (r.status === 'MISSING') {
    plan.set(r.where, { ref: r.ref, to: bookTitle(r), from: null })
  } else if (r.status === 'EXTRA') {
    plan.set(r.where, { ref: r.ref, to: null, from: r.app })
  } else if (r.status === 'DIFF') {
    expect(r.ref === 'Psalm 113:1-9' && r.app === 'Эзэний нэрийг магтан дуулагтун', `예상 밖 DIFF: ${r.where}`)
    plan.set(r.where, { ref: r.ref, to: PS113, from: r.app })
  } else if (r.status === 'ok~') {
    if (KEEP[r.ref]) continue
    if (r.ref === 'Psalm 113:1-9') { expect(r.app === PS113, 'week-2 시편 113'); continue }
    expect(['Psalm 11:1-7', 'Psalm 80:2-8, 15-20'].includes(r.ref), `예상 밖 표기 차이: ${r.where} ${r.app} / ${r.book}`)
    plan.set(r.where, { ref: r.ref, to: bookTitle(r), from: r.app })
  }
}

const byFile = new Map()
for (const [where, p] of plan) {
  const [file, rest] = where.split(/\.json/)
  if (!byFile.has(file)) byFile.set(file, [])
  byFile.get(file).push({ where, path: rest, ...p })
}

/** '.weeks.1.SUN.firstVespers.psalms[0]' → 객체 */
function resolve(obj, p) {
  let node = obj
  for (const m of p.matchAll(/\.([^.[]+)|\[(\d+)\]/g)) node = m[1] !== undefined ? node[m[1]] : node[Number(m[2])]
  return node
}

/** JSON 객체를 문서 순서로 훑어 ref 가 같은 객체들의 경로 목록 */
function refOrder(obj, ref) {
  const out = []
  const walk = (n, p) => {
    if (Array.isArray(n)) return n.forEach((v, i) => walk(v, `${p}[${i}]`))
    if (!n || typeof n !== 'object') return
    if (n.ref === ref) out.push(p)
    for (const [k, v] of Object.entries(n)) walk(v, `${p}.${k}`)
  }
  walk(obj, '')
  return out
}

const written = []
for (const [file, items] of byFile) {
  const rel = `${DATA}/${file}.json`
  const abs = path.join(ROOT, rel)
  const text = fs.readFileSync(abs, 'utf8')
  const obj = JSON.parse(text)
  const roundTrips = JSON.stringify(obj, null, 2) + '\n' === text

  if (roundTrips) {
    for (const it of items) {
      const e = resolve(obj, it.path)
      expect(e?.ref === it.ref, `${it.where}: ref ${e?.ref}`)
      expect((e.title ?? null) === it.from, `${it.where}: 지금 제목이 예상과 다름 «${e.title}»`)
      if (it.to === null) {
        delete e.title
      } else if ('title' in e) {
        e.title = it.to
      } else {
        // default_antiphon 바로 뒤에 title (시편집 항목과 같은 키 순서)
        const entries = Object.entries(e)
        const at = entries.findIndex(([k]) => k === 'default_antiphon')
        expect(at >= 0, `${it.where}: default_antiphon 없음`)
        entries.splice(at + 1, 0, ['title', it.to])
        for (const k of Object.keys(e)) delete e[k]
        Object.assign(e, Object.fromEntries(entries))
      }
    }
    written.push([rel, JSON.stringify(obj, null, 2) + '\n'])
  } else {
    // 텍스트 끼워 넣기 — 넣기만 한다
    let out = text
    const insertAt = [] // [offset, line]
    for (const it of items) {
      expect(it.to !== null && it.from === null, `${it.where}: 고유부는 넣기만`)
      const order = refOrder(obj, it.ref)
      const k = order.indexOf(it.path)
      expect(k >= 0, `${it.where}: 경로 못 찾음`)
      const needle = `"ref": ${JSON.stringify(it.ref)}`
      let pos = -1
      for (let i = 0; i <= k; i++) pos = text.indexOf(needle, pos + 1)
      const occurrences = text.split(needle).length - 1
      expect(occurrences === order.length, `${rel}: ${it.ref} 텍스트 출현 ${occurrences} ≠ 객체 ${order.length}`)
      const da = text.indexOf('"default_antiphon":', pos)
      const close = text.indexOf('}', pos)
      expect(da > 0 && da < close, `${it.where}: default_antiphon 이 같은 객체에 없음`)
      expect(!text.slice(pos, close).includes('"title":'), `${it.where}: 이미 title 있음`)
      const lineStart = text.lastIndexOf('\n', da) + 1
      const lineEnd = text.indexOf('\n', da)
      const indent = text.slice(lineStart, da)
      expect(text.slice(lineEnd - 1, lineEnd) === ',', `${it.where}: default_antiphon 행이 쉼표로 끝나지 않음`)
      insertAt.push([lineEnd + 1, `${indent}"title": ${JSON.stringify(it.to)},\n`])
    }
    insertAt.sort((a, b) => b[0] - a[0])
    for (const [off, line] of insertAt) out = out.slice(0, off) + line + out.slice(off)
    // 결과 점검: 다시 읽어 각 항목의 title
    const check = JSON.parse(out)
    for (const it of items) expect(resolve(check, it.path).title === it.to, `${it.where}: 넣은 뒤 title 이 다름`)
    expect(JSON.stringify(JSON.parse(text)).length + items.reduce((n, it) => n + `,"title":${JSON.stringify(it.to)}`.length, 0)
      === JSON.stringify(check).length, `${rel}: title 말고 다른 것이 바뀜`)
    written.push([rel, out])
  }
  const counts = items.reduce((c, it) => {
    const kind = it.to === null ? '삭제' : it.from === null ? '추가' : '고침'
    c[kind] = (c[kind] ?? 0) + 1
    return c
  }, {})
  log.push(`${rel.padEnd(42)} ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}${roundTrips ? '' : '  (텍스트 끼워 넣기)'}`)
}

// 넣을 제목 목록 (검토용)
const distinct = new Map()
for (const p of plan.values()) {
  const key = `${p.ref} → ${p.to === null ? '(삭제)' : `«${p.to}»`}${p.from ? `  [이전 «${p.from}»]` : ''}`
  distinct.set(key, (distinct.get(key) ?? 0) + 1)
}
console.log([...distinct].map(([k, n]) => `${String(n).padStart(3)}× ${k}`).join('\n'))
console.log('\n' + log.join('\n'))
console.log(`\n항목 ${plan.size}개`)
if (!WRITE) {
  console.log('DRY RUN — 파일을 쓰지 않았다. --write 로 반영한다.')
  process.exit(0)
}
for (const [rel, content] of written) fs.writeFileSync(path.join(ROOT, rel), content, 'utf8')
console.log('반영 완료')
