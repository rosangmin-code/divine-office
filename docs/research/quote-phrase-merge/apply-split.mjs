#!/usr/bin/env node
/**
 * 여는 따옴표 + 대문자 행에서 phrase 를 끊는다 (37건).
 *
 * 근거: 이 책의 접힘 신호는 **소문자 시작**이다 (calibrate.py — 확실한 접힘
 * 277건이 단 끝까지 차지 않는다. 들여쓰기·단 폭은 판별력이 없다). 따옴표 뒤
 * 대문자는 규약상 새 시행이고, 별도로 큐레이트된 plain `stanzas[]` 가 37건 중
 * 32건에서 그 행을 독립 항목으로 갖고 있다 (병합해 둔 건 0건).
 *
 * 검증은 "rich phrase 결합 결과 == plain stanzas" 일치 refs 수를 전후로 비교한다.
 * --write 없이는 쓰지 않는다.
 */
import fs from 'node:fs'
import { regroupPhrasesByCapitalStart } from '../../../scripts/build-phrases-into-rich.mjs'

const RICH = 'src/data/loth/prayers/commons/psalter-texts.rich.json'
const PLAIN = 'src/data/loth/psalter-texts.json'
const QUOTE_CAPITAL_RE = /^[“"„«]\s*[А-ЯЁӨҮ]/
const WRITE = process.argv.includes('--write')

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

const joinPhrases = (block, phrases) =>
  phrases.map(({ lineRange: [s, e] }) =>
    block.lines.slice(s, e + 1).map(lineText).join(' '))

const rich = JSON.parse(fs.readFileSync(RICH, 'utf8'))
const plain = JSON.parse(fs.readFileSync(PLAIN, 'utf8'))

let before = 0, after = 0, total = 0, touched = 0, splits = 0
const regressions = []
for (const [ref, entry] of Object.entries(rich)) {
  const blocks = entry?.stanzasRich?.blocks ?? []
  const stanzas = plain[ref]?.stanzas ?? []
  blocks.forEach((b, bi) => {
    if (!b.phrases?.length || bi >= stanzas.length) return
    total++
    const want = stanzas[bi].map((x) => x.replace(/^\s+/, ''))
    const eq = (ph) => JSON.stringify(joinPhrases(b, ph)) === JSON.stringify(want)
    const wasEqual = eq(b.phrases)
    const next = splitAtQuotedCapitals(b.lines, b.phrases)
    const isEqual = eq(next)
    if (wasEqual) before++
    if (isEqual) after++
    if (wasEqual && !isEqual) regressions.push(`${ref} b${bi}`)
    if (next.length !== b.phrases.length) {
      touched++
      splits += next.length - b.phrases.length
      b.phrases = next
    }
  })
}
console.log(`phrases 보유 블록 ${total}`)
console.log(`plain 과 완전 일치: 적용 전 ${before} → 적용 후 ${after} (${after - before >= 0 ? '+' : ''}${after - before})`)
console.log(`분리된 블록 ${touched}, 새로 생긴 phrase ${splits}`)
console.log(`회귀(일치→불일치): ${regressions.length ? regressions.join(', ') : '없음'}`)

if (!WRITE) { console.log('\nDRY RUN — --write 로 반영'); process.exit(regressions.length ? 1 : 0) }
if (regressions.length) { console.error('회귀가 있어 쓰지 않는다'); process.exit(1) }
fs.writeFileSync(RICH, JSON.stringify(rich, null, 2) + '\n', 'utf8')
console.log('\n반영 완료')
