#!/usr/bin/env node
/**
 * Task #42 — targeted D1-subtype repair for psalter-texts.json entries
 * that `extract-psalm-texts.js` built from the column-shuffled
 * `parsed_data/weekN_final.txt` sources. Canonical source is
 * `parsed_data/full_pdf.txt` (verse-ordered, authoritative).
 *
 * Scope: 4 D1 entries (Psalm 121:1-8, Psalm 97:1-12, Psalm 51:3-19,
 * Psalm 139:23-24) + bonus repair for upstream entries whose data the
 * D1 shift had swallowed (Psalm 116:1-9 prayer + Psalm 139:1-18
 * prayer share the same `Дууллыг төгсгөх залбирал` block).
 *
 * Other 132 entries are NOT touched — the diff from this script is
 * strictly scoped to the 6 target refs.
 *
 * Usage: node scripts/repair-d1-psalter-entries.js
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const PDF_PATH = path.join(ROOT, 'parsed_data/full_pdf.txt')
const JSON_PATH = path.join(ROOT, 'src/data/loth/psalter-texts.json')

// --- end-marker / noise / header helpers (parity with extract-psalm-texts.js) ---

const END_MARKERS = [
  /^Эцэг,?\s*Хүү/,
  /^Дууллыг\s+төгсгөх\s+залбирал/,
  /^Шад\s+(магтаал|дуулал)/,
  /^Дуулал\s+\d/,
  /^Магтаал(?:\s|$)/,
  /^Уншлага(?:\s|$)/,
  /^Богино\s+уншлага/,
  /^Хариу\s+залбирал/,
  /^Хариу\s+дуулал/,
  /^Гуйлтын\s+залбирал/,
  /^Залбирлын\s+дуудлага/,
  /^Төгсгөлийн\s+залбирал/,
  /^Урих\s+дуудлага/,
  /^Даатгал\s+залбирал/,
]

const NOISE_PATTERNS = [
  /^\d+\s*$/,
  /^\d+\s+долоо хоног/,
  /^\d+\s+дүгээр долоо хоног/,
  /^\d+\s+дугаар долоо хоног/,
  /гарагийн\s+(өглөө|орой)/i,
  /^\d+\s+1 дүгээр/,
  /^\d+\s+2 дугаар/,
  /^\d+\s+3 дугаар/,
  /^\d+\s+4 дүгээр/,
]

const ANY_PSALM_HEADER_RE = /^Дуулал\s*\d/
const ANY_CANTICLE_HEADER_RE = /^Магтаал(?:\s|$)/

function isNoise(line) {
  const t = line.trim()
  if (!t) return false
  return NOISE_PATTERNS.some(p => p.test(t))
}

function isEndMarker(line) {
  const t = line.trim()
  return END_MARKERS.some(p => p.test(t))
}

function mergeColumnWraps(stanza) {
  const out = []
  for (const line of stanza) {
    const first = line.charAt(0)
    const isLowerCyrillic = /^[а-яёөү]/.test(first)
    if (out.length > 0 && isLowerCyrillic) {
      out[out.length - 1] = out[out.length - 1] + ' ' + line
    } else {
      out.push(line)
    }
  }
  return out
}

function mergeAcrossStanzaBoundaries(stanzas) {
  const out = []
  for (const stanza of stanzas) {
    if (stanza.length === 0) continue
    const first = stanza[0].charAt(0)
    const isLowerCyrillic = /^[а-яёөү]/.test(first)
    if (out.length > 0 && isLowerCyrillic) {
      const prev = out[out.length - 1]
      prev[prev.length - 1] = prev[prev.length - 1] + ' ' + stanza[0]
      for (let i = 1; i < stanza.length; i++) prev.push(stanza[i])
    } else {
      out.push(stanza.slice())
    }
  }
  return out
}

// --- core extraction from full_pdf.txt given a starting line ---

function skipEpigraph(lines, startIdx) {
  let scanned = 0
  for (let i = startIdx; i < lines.length && scanned < 8; i++) {
    const trimmed = lines[i].trim()
    if (!trimmed || isNoise(lines[i])) continue
    scanned++
    if (/\)\s*\.?\s*$/.test(trimmed)) return i + 1
  }
  return startIdx
}

function skipTitle(lines, from, title) {
  const norm = (title || '').replace(/\s+/g, ' ').trim().toLowerCase()
  if (!norm) {
    for (let k = from; k < Math.min(lines.length, from + 10); k++) {
      const t = lines[k].trim()
      if (!t || isNoise(lines[k])) continue
      return k + 1
    }
    return from
  }
  let buf = ''
  for (let k = from; k < Math.min(lines.length, from + 6); k++) {
    const t = lines[k].trim()
    if (!t || isNoise(lines[k])) continue
    buf += (buf ? ' ' : '') + t
    if (norm.includes(buf.toLowerCase()) || buf.toLowerCase().includes(norm)) {
      if (buf.length >= norm.length * 0.8) return k + 1
    }
  }
  if (!buf) {
    for (let k = from; k < Math.min(lines.length, from + 10); k++) {
      const t = lines[k].trim()
      if (!t || isNoise(lines[k])) continue
      return k + 1
    }
  }
  return from
}

function collectBody(lines, from, ownHeaderRe) {
  const body = []
  let i = from
  while (i < lines.length) {
    const trimmed = lines[i].trim()
    if (isEndMarker(trimmed)) break
    if (i > from && (ANY_PSALM_HEADER_RE.test(trimmed) || ANY_CANTICLE_HEADER_RE.test(trimmed))) {
      if (!ownHeaderRe || !ownHeaderRe.test(trimmed)) break
    }
    if (isNoise(lines[i])) { i++; continue }
    body.push(trimmed)
    i++
  }
  return { body, endIdx: i }
}

function bodyToStanzas(bodyLines) {
  const stanzas = []
  let cur = []
  for (const line of bodyLines) {
    if (line === '') {
      if (cur.length > 0) {
        stanzas.push(mergeColumnWraps(cur))
        cur = []
      }
    } else {
      cur.push(line)
    }
  }
  if (cur.length > 0) stanzas.push(mergeColumnWraps(cur))
  return mergeAcrossStanzaBoundaries(stanzas)
}

function extractPrayer(lines, startIdx) {
  const PRAYER_MARKER = /^Дууллыг\s+төгсгөх\s+залбирал/
  let markerIdx = -1
  for (let i = startIdx; i < lines.length && i < startIdx + 40; i++) {
    const t = lines[i].trim()
    if (PRAYER_MARKER.test(t)) { markerIdx = i; break }
    if (ANY_PSALM_HEADER_RE.test(t) || ANY_CANTICLE_HEADER_RE.test(t)) return null
  }
  if (markerIdx < 0) return null

  const out = []
  let saw = false
  let i = markerIdx + 1
  while (i < lines.length) {
    const t = lines[i].trim()
    if (!t) {
      if (!saw) { i++; continue }
      let j = i + 1
      while (j < lines.length) {
        const tj = lines[j].trim()
        if (!tj || isNoise(lines[j])) { j++; continue }
        break
      }
      if (j >= lines.length) break
      const nxt = lines[j].trim()
      if (isEndMarker(nxt) || ANY_PSALM_HEADER_RE.test(nxt) || ANY_CANTICLE_HEADER_RE.test(nxt)) break
      if (!/^[а-яёөү]/.test(nxt)) break
      i = j
      continue
    }
    if (isEndMarker(t)) break
    if (ANY_PSALM_HEADER_RE.test(t) || ANY_CANTICLE_HEADER_RE.test(t)) break
    if (isNoise(lines[i])) { i++; continue }
    out.push(t)
    saw = true
    i++
  }
  if (out.length === 0) return null
  return mergeColumnWraps(out).join(' ').trim()
}

// --- targets: per-ref anchor into full_pdf.txt ---

function extractFromHeader(lines, headerLine, title, ownHeaderText) {
  const ownHeaderRe = new RegExp('^' + ownHeaderText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const afterTitle = skipTitle(lines, headerLine + 1, title)
  const afterEpi = skipEpigraph(lines, afterTitle)
  const { body, endIdx } = collectBody(lines, afterEpi, ownHeaderRe)
  const stanzas = bodyToStanzas(body)
  const prayer = extractPrayer(lines, endIdx)
  return { stanzas, prayer, endIdx }
}

function extractPart2_139(lines) {
  // "Дуулал 139:1-18, 23-24" is a combined PDF block. The app JSON
  // splits it into two sibling refs: `Psalm 139:1-18` (Part I + Part
  // II verses 13-18) and `Psalm 139:23-24` (verses 23-24 only, after
  // a date-rubric break inside Part II). Both sub-refs share the same
  // concluding `Дууллыг төгсгөх залбирал` prayer on page 467.
  //
  // For the 23-24 sub-ref we want the body that starts with "Аяа
  // Тэнгэрбурхан," (verse 23a) and runs through verse 24d, picking up
  // the "Намайг шалган, бодлуудыг минь мэдээч." continuation on page
  // 467 after the page-break blanks. We find the verse-23a anchor by
  // scanning forward from the "II" marker for a line that begins with
  // "Аяа Тэнгэрбурхан," followed by "намайг судлан зүрхийг минь
  // мэдээч" (this phrase appears only once in the combined block, so
  // a loose anchor suffices).
  //
  // lines[] is 0-indexed; PDF line N is at lines[N-1]. Scan PDF lines
  // 16100..16200 → array indices 16099..16199.
  let iiIdx = -1
  for (let i = 16099; i < 16199 && i < lines.length; i++) {
    if (lines[i].trim() === 'II') { iiIdx = i; break }
  }
  if (iiIdx < 0) return null
  const { body: fullBody, endIdx } = collectBody(lines, iiIdx + 1, /^Дуулал\s*139/)
  // Capture the prayer shared by both 139 sub-refs.
  const prayer = extractPrayer(lines, endIdx)

  // Find the verse-23 anchor in fullBody and slice from there.
  let anchor = -1
  for (let k = 0; k < fullBody.length; k++) {
    if (/^Аяа\s+Тэнгэрбурхан,\s*$/.test(fullBody[k])) {
      // The next non-blank line should be the verse-23 continuation
      // ("намайг судлан зүрхийг минь мэдээч."). Confirm it's not the
      // page-17 stanza whose full line is "Аяа Тэнгэрбурхан, надад
      // хандсан бодлууд тань" which is verse 17 (different).
      const next = k + 1 < fullBody.length ? fullBody[k + 1] : ''
      if (/^намайг\s+судлан/.test(next)) { anchor = k; break }
    }
  }
  if (anchor < 0) return { stanzas: null, prayer }

  // Slice from anchor; drop any blank lines so the 23-24 block collapses
  // into a single stanza (page-break artefact should NOT split the
  // 2-verse excerpt).
  const sliced = fullBody.slice(anchor).filter(l => l !== '')
  const stanza = mergeColumnWraps(sliced)
  return { stanzas: [stanza], prayer }
}

function getTitle(weekJsons, ref) {
  for (const w of [1, 2, 3, 4]) {
    const data = weekJsons[w]
    if (!data) continue
    for (const day of Object.keys(data.days || {})) {
      for (const hr of Object.keys(data.days[day] || {})) {
        const entry = data.days[day][hr]
        if (!entry || typeof entry !== 'object') continue
        for (const p of entry.psalms || []) {
          if (p.ref === ref) return p.title || ''
        }
      }
    }
  }
  return ''
}

// --- main ---

function main() {
  const pdfText = fs.readFileSync(PDF_PATH, 'utf8')
  const lines = pdfText.split('\n')

  const weekJsons = {}
  for (const w of [1, 2, 3, 4]) {
    const p = path.join(ROOT, 'src/data/loth/psalter', `week-${w}.json`)
    weekJsons[w] = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null
  }

  const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'))

  // Per-ref anchor spec. headerLine is 1-based PDF line of "Дуулал N" header
  // for the block whose body we want.
  const TARGETS = [
    { ref: 'Psalm 116:1-9',   headerLine: 9232,  headerText: 'Дуулал 116:1-9' },
    { ref: 'Psalm 121:1-8',   headerLine: 9290,  headerText: 'Дуулал 121' },
    { ref: 'Psalm 97:1-12',   headerLine: 7842,  headerText: 'Дуулал 97' },
    { ref: 'Psalm 51:3-19',   headerLine: 16890, headerText: 'Дуулал 51' },
    { ref: 'Psalm 139:23-24', headerLine: null,  headerText: null, mode: 'part2-139' },
    // Psalm 139:1-18 prayer share — the combined PDF block's prayer
    // belongs to both sub-entries in the JSON split.
    { ref: 'Psalm 139:1-18',  headerLine: null,  headerText: null, mode: 'prayer-only-139' },
  ]

  for (const t of TARGETS) {
    const title = getTitle(weekJsons, t.ref)
    let result
    if (t.mode === 'part2-139') {
      result = extractPart2_139(lines)
    } else if (t.mode === 'prayer-only-139') {
      // Piggyback: re-use part-2 extraction to find prayer
      const r = extractPart2_139(lines)
      result = r ? { prayer: r.prayer } : null
    } else {
      const headerIdx = t.headerLine - 1
      result = extractFromHeader(lines, headerIdx, title, t.headerText)
    }
    if (!result) {
      console.warn(`  [skip] ${t.ref} — extraction failed`)
      continue
    }

    const before = data[t.ref]
    const existingStanzas = before ? JSON.stringify(before.stanzas ?? null) : null
    const existingPrayer = before ? (before.psalmPrayer ?? '') : ''

    if (!data[t.ref]) data[t.ref] = {}

    if (t.mode !== 'prayer-only-139' && result.stanzas) {
      data[t.ref].stanzas = result.stanzas
    }
    if (result.prayer) {
      data[t.ref].psalmPrayer = result.prayer
    }

    const newStanzas = data[t.ref].stanzas ? JSON.stringify(data[t.ref].stanzas) : null
    const newPrayer = data[t.ref].psalmPrayer ?? ''

    const changes = []
    if (existingStanzas !== newStanzas) changes.push('stanzas')
    if (existingPrayer !== newPrayer) changes.push('psalmPrayer')
    console.log(`[ok] ${t.ref}: ${changes.length ? changes.join(', ') : 'no-op'} ${
      result.stanzas ? `(${result.stanzas.length} stanzas)` : ''
    }`)
  }

  fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8')
  console.log(`\nWritten ${JSON_PATH}`)
}

main()
