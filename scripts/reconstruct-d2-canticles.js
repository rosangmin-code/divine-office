#!/usr/bin/env node
/**
 * Task #40 Stage 3 — D2 canticle body reconstruction from PDF.
 *
 * For each of the 5 D2 entries, extract the canticle body from
 * parsed_data/full_pdf.txt between the ref header line and the
 * `Эцэг, Хүү, Ариун Сүнсэнд жавхланг` Gloria marker, then emit a
 * proposed stanzas array using:
 *   - Page-break markers (pure numeric lines) as stanza boundaries.
 *   - Blank lines as secondary stanza boundaries within a page.
 * Page-number lines and running-header lines (day-of-week headers like
 * "Лхагва гарагийн өглөө") are filtered out.
 *
 * Output: scripts/out/d2-canticle-reconstruction.json
 *   {
 *     "<ref>": { body_lines: [...], stanzas: [[...], [...]], psalmPrayer?: str, psalmPrayerPage?: int }
 *   }
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const PDF = path.join(ROOT, 'parsed_data', 'full_pdf.txt')
const OUT = path.join(ROOT, 'scripts', 'out', 'd2-canticle-reconstruction.json')

const D2_ENTRIES = [
  { ref: 'Exodus 15:1-4a, 8-13, 17-18', headerLine: 5352, searchTokens: ['Гэтлэл', '15'] },
  { ref: '1 Samuel 2:1-10',             headerLine: 7768, searchTokens: ['1', 'Самуел', '2'] },
  { ref: 'Isaiah 33:13-16',             headerLine: 11899, searchTokens: ['Исаиа', '33'] },
  { ref: 'Wisdom 9:1-6, 9-11',          headerLine: 13528, searchTokens: ['Мэргэн', 'ухаан', '9'] },
  { ref: 'Tobit 13:8-11, 13-15',        headerLine: 16995, searchTokens: ['Тобит', '13', '8-11'] },
]

const RUNNING_HEADER_RE = /^(Ням|Даваа|Мягмар|Лхагва|Пүрэв|Баасан|Бямба)\s+гараг(ийн|т)\s+(өглөө|орой)$/
const PAGE_NUM_RE = /^\s*\d+\s*$/
const PAGE_NUM_WITH_TAB_RE = /^\s*\d+\s*\t+\s*$/
const WEEK_HEADER_RE = /^\d+\s+(дугаар|дүгээр)\s+долоо\s+хоног$/
const GLORIA_RE = /^Эцэг,\s*Хүү,?\s*Ариун\s+Сүнсэнд\s+жавхланг/
const CLOSING_PRAYER_HEADER_RE = /^Дууллыг\s+төгсгөх\s+залбирал$/
const ANTIPHON_MARKER_RE = /^Шад\s+дуулал(\s+\d+)?/

function extractBody(lines, startLine) {
  // Skip: header line + 1-4 preamble lines (subtitle + epigraph + citation).
  // Body begins after the last preamble line before the first substantive
  // content. Heuristic: find the first line whose tokens have >= 1 Cyrillic
  // word AND the preceding line doesn't end with "(...)" or period followed
  // by uppercase letter. For simplicity, start body at the line *after* the
  // citation line (line containing "(... \d+:\d+)").
  let i = startLine  // 1-indexed; lines[startLine-1] is header
  i++  // skip header ref line

  // Skip preamble until we hit the body. The subtitle is line 1, followed
  // by epigraph (1-3 lines) ending with `(Ref X:Y)`, then body. Simplest:
  // stop skipping when we find a line NOT ending with ")" or newline-
  // following a `)` line.
  let sawCitation = false
  const CITATION_RE = /\([^)]*\d+[^)]*\)\.?\s*$/  // any parenthetical with a digit, line-terminal
  let preambleSkip = 0
  while (i < lines.length) {
    const line = lines[i]
    if (sawCitation && !/^\s*$/.test(line)) break
    if (CITATION_RE.test(line.trim())) {
      sawCitation = true
    }
    preambleSkip++
    if (preambleSkip > 8) break  // safety cap — preamble should be ≤ 4 lines typically
    i++
  }

  // Now collect body lines until Gloria or closing-prayer marker.
  const body = []
  let stanzas = [[]]
  for (; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (GLORIA_RE.test(trimmed)) break
    if (CLOSING_PRAYER_HEADER_RE.test(trimmed)) break
    if (ANTIPHON_MARKER_RE.test(trimmed)) break
    if (/^Дуулал\s+\d/.test(trimmed)) break  // next psalm header
    if (/^Магтаал$/.test(trimmed)) break  // next canticle header
    // Skip page-number & running-header & week-header lines.
    if (PAGE_NUM_RE.test(line) || PAGE_NUM_WITH_TAB_RE.test(line)) {
      if (stanzas[stanzas.length - 1].length > 0) stanzas.push([])
      continue
    }
    if (RUNNING_HEADER_RE.test(trimmed)) continue
    if (WEEK_HEADER_RE.test(trimmed)) continue
    if (/^\s*$/.test(line)) continue  // blank (kept as in-body, but we can
                                       // use as soft break — let's treat as
                                       // no-op for now; body is single flow)
    body.push(trimmed)
    stanzas[stanzas.length - 1].push(trimmed)
  }

  // Remove empty trailing stanza.
  while (stanzas.length > 0 && stanzas[stanzas.length - 1].length === 0) stanzas.pop()

  // Capture optional closing prayer that follows the body (before next
  // canticle/psalm/antiphon). Only if line right after Gloria is a
  // `Дууллыг төгсгөх залбирал` marker (within next 4 non-empty lines).
  let psalmPrayer = null
  let psalmPrayerPage = null
  if (i < lines.length && GLORIA_RE.test(lines[i].trim())) {
    // look ahead past any antiphon variants for "Дууллыг төгсгөх залбирал"
    let j = i + 1
    while (j < lines.length && j < i + 30) {
      const l = lines[j].trim()
      if (CLOSING_PRAYER_HEADER_RE.test(l)) {
        // determine page by scanning backwards for nearest page-num line
        for (let k = j; k >= 0 && k >= j - 20; k--) {
          const pl = lines[k].trim()
          if (PAGE_NUM_RE.test(lines[k]) || PAGE_NUM_WITH_TAB_RE.test(lines[k])) {
            psalmPrayerPage = parseInt(pl, 10)
            break
          }
        }
        // collect prayer text until next section marker
        const prayerLines = []
        for (let k = j + 1; k < lines.length; k++) {
          const pl = lines[k].trim()
          if (ANTIPHON_MARKER_RE.test(pl)) break
          if (/^Уншлага/.test(pl)) break
          if (/^Дуулал\s+\d/.test(pl)) break
          if (/^Магтаал$/.test(pl)) break
          if (CLOSING_PRAYER_HEADER_RE.test(pl)) break
          if (PAGE_NUM_RE.test(lines[k]) || PAGE_NUM_WITH_TAB_RE.test(lines[k])) continue
          if (RUNNING_HEADER_RE.test(pl)) continue
          if (WEEK_HEADER_RE.test(pl)) continue
          if (/^\s*$/.test(lines[k])) continue
          prayerLines.push(pl)
        }
        psalmPrayer = prayerLines.join(' ').replace(/\s+/g, ' ').trim()
        break
      }
      if (ANTIPHON_MARKER_RE.test(l) || /^Дуулал\s+\d/.test(l) || /^Магтаал$/.test(l)) {
        // Hit next psalm/canticle before finding prayer → no psalmPrayer
        break
      }
      j++
    }
  }

  return { body, stanzas, psalmPrayer, psalmPrayerPage }
}

function main() {
  const lines = fs.readFileSync(PDF, 'utf8').split(/\r?\n/)
  const result = {}
  for (const e of D2_ENTRIES) {
    const { body, stanzas, psalmPrayer, psalmPrayerPage } = extractBody(lines, e.headerLine)
    result[e.ref] = {
      _meta: { header_line: e.headerLine, body_lines_count: body.length, stanzas_count: stanzas.length },
      stanzas,
      ...(psalmPrayer ? { psalmPrayer } : {}),
      ...(psalmPrayerPage ? { psalmPrayerPage } : {}),
    }
    console.log(`[${e.ref}] body_lines=${body.length} stanzas=${stanzas.length} prayer=${psalmPrayer ? 'Y' : 'N'}(page ${psalmPrayerPage || '-'})`)
  }
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n', 'utf8')
  console.log(`\nWrote ${OUT}`)
}

main()
