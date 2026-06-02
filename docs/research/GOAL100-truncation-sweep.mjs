// GOAL100 SCOPE CONTROL — faithful artifact-free parser simulation.
//
// Purpose: enumerate every point where scripts/extract-psalm-texts.js
// extractPsalmPrayer() would break at its L397 lowercase-only continuation
// gate, across the parser's real input (parsed_data/weekN/weekN_final.txt),
// and classify each as a REAL truncation vs a correct STOP.
//
// Why this (not an artifact-gated scan): the parser's truncation gate
// (extract-psalm-texts.js L388-398) fires on a blank line followed by an
// UPPERCASE continuation — it does NOT require a page-break artifact
// (page number / running header) to be present. An artifact-gated sweep
// therefore structurally MISSES no-artifact truncations (proven by
// week2 L3577, art=false). This simulation is the authoritative scope
// control and the mandated regression control for any future L397 fix.
//
// The helpers below are a byte-for-byte replica of:
//   scripts/extract-psalm-texts.js  SKIP_PATTERNS L41-51,
//   END_MARKERS L61-76, ANY_PSALM/CANTICLE_HEADER_RE L220-221,
//   extractPsalmPrayer collection loop L376-408.
//
// Run from repo root:  node docs/research/GOAL100-truncation-sweep.mjs
//
// Expected output (deterministic, 2026-05-30):
//   마커 102 | L397 break 5 | 진짜절단 1 | 정상STOP 4
//   [TRUNC] w1 L740  ... Psalm 114:1-8 (collected tail ends with comma)
//   [STOP]  w2 L3577 ... art=false  (no-artifact break — Method-B blind spot)
//   [STOP]  w3 L644 / w4 L55 / w4 L691  (collected complete; dropped = next section)
import fs from 'node:fs'

const SKIP_PATTERNS = [
  /^\d+\s*$/, /^\d+\s+долоо хоног/, /^\d+\s+дүгээр долоо хоног/, /^\d+\s+дугаар долоо хоног/,
  /гарагийн\s+(өглөө|орой)/i, /^\d+\s+1 дүгээр/, /^\d+\s+2 дугаар/, /^\d+\s+3 дугаар/, /^\d+\s+4 дүгээр/,
]
const isNoise = (l) => { const t = l.trim(); return t ? SKIP_PATTERNS.some((p) => p.test(t)) : false }
const END_MARKERS = [
  /^Эцэг,?\s*Хүү/, /^Дууллыг төгсгөх залбирал/, /^Шад\s+(магтаал|дуулал)/, /^Дуулал\s+\d/,
  /^Магтаал(?:\s|$)/, /^Уншлага(?:\s|$)/, /^Богино уншлага/, /^Хариу залбирал/, /^Хариу дуулал/,
  /^Гуйлтын залбирал/, /^Залбирлын дуудлага/, /^Төгсгөлийн залбирал/, /^Урих дуудлага/, /^Даатгал залбирал/,
]
const isEnd = (l) => END_MARKERS.some((p) => p.test(l.trim()))
const PSALM_HDR = /^Дуулал\s*\d/
const CANTICLE_HDR = /^Магтаал(?:\s|$)/
const PRAYER_MARKER = /^Дууллыг төгсгөх залбирал/

// Replica of extractPsalmPrayer collection loop (L376-408), instrumented
// to capture the L397 uppercase-continuation break point.
function runPrayer(L, markerIdx) {
  const prayerLines = []
  let sawContent = false
  let i = markerIdx + 1
  while (i < L.length) {
    const line = L[i]
    const t = line.trim()
    if (!t) {
      if (!sawContent) { i++; continue }
      let j = i + 1
      while (j < L.length) { const tj = L[j].trim(); if (!tj || isNoise(L[j])) { j++; continue } break }
      if (j >= L.length) break
      const next = L[j].trim()
      if (isEnd(next) || PSALM_HDR.test(next) || CANTICLE_HDR.test(next)) break // L396 STOP
      if (!/^[а-яёөү]/.test(next)) { // L397 — uppercase continuation → break
        let hadArtifact = false
        for (let k = i + 1; k < j; k++) if (L[k].trim() && isNoise(L[k])) hadArtifact = true
        return { tail: prayerLines.join(' ').trim(), dropped: next.slice(0, 50), hadArtifact }
      }
      i = j; continue
    }
    if (isEnd(t)) break
    if (PSALM_HDR.test(t) || CANTICLE_HDR.test(t)) break
    if (isNoise(line)) { i++; continue }
    prayerLines.push(t); sawContent = true; i++
  }
  return null
}

const terminal = /[.!…)”»]\s*$/ // sentence terminal
let markers = 0
const breaks = []
for (const w of [1, 2, 3, 4]) {
  const f = `parsed_data/week${w}/week${w}_final.txt`
  if (!fs.existsSync(f)) continue
  const L = fs.readFileSync(f, 'utf-8').split(/\r?\n/)
  for (let i = 0; i < L.length; i++) {
    if (!PRAYER_MARKER.test(L[i].trim())) continue
    markers++
    const b = runPrayer(L, i)
    if (b) {
      // Real truncation iff the collected text is INCOMPLETE (ends with a
      // comma or lacks a sentence terminal). A complete collected text +
      // uppercase next = the parser correctly stopped at a next section.
      const truncated = b.tail.endsWith(',') || !terminal.test(b.tail)
      breaks.push({ w, line: i + 1, art: b.hadArtifact, truncated, tail: b.tail, dropped: b.dropped })
    }
  }
}
console.log(`마커 ${markers} | L397 break ${breaks.length} | 진짜절단 ${breaks.filter((b) => b.truncated).length} | 정상STOP ${breaks.filter((b) => !b.truncated).length}`)
for (const b of breaks) {
  console.log(`[${b.truncated ? 'TRUNC' : 'STOP'}] w${b.w} L${b.line} art=${b.art} 末:"${b.tail.slice(-28)}" drop:"${b.dropped}"`)
}
