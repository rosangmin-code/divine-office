#!/usr/bin/env node
/**
 * FR-156 Phase 2 (task #20). Extract the 4 psalter-week "1 дүгээр Оройн
 * даатгал залбирал" (Sunday 1st Vespers) sections from
 * parsed_data/full_pdf.txt and build structured FirstVespersPropers
 * objects keyed by psalter week (1..4).
 *
 * PDF layout:
 *   "N ДҮГЭЭР/ДУГААР ДОЛОО ХОНОГ"  ← week header
 *   "НЯМ ГАРАГ"                     ← Sunday banner
 *   "1 дүгээр Оройн даатгал залбирал"  ← section anchor
 *   <opening versicle rubric>
 *   "Дууллын залбирал"
 *   "Шад дуулал 1 …"  default antiphon + seasonal variants + "Дуулал NN" body
 *   "Шад дуулал 2 …"  ditto
 *   "Шад магтаал …"   ditto (NT canticle Phil 2:6-11)
 *   "Уншлага"          shortReading (ref + text)
 *   "Хариу залбирал"   responsory
 *   "Мариагийн магтаал"  Magnificat (antiphon typically = "draw from seasonal")
 *   "Гуйлтын залбирал" intercessions
 *   "Төгсгөлийн залбирлыг …"  concludingPrayer (typically = "draw from seasonal")
 *   "Төгсгөлийг дэг жаягийн дагуу дуусгана"  ← block terminator
 *
 * Only the 4 base psalter-week sections (lines 1473, 5531, 9760, 13703)
 * are extracted. Subsequent "1 дүгээр Оройн даатгал залбирал" anchors
 * belong to solemnity propers (outside Phase 2 scope).
 *
 * Output: scripts/output/first-vespers-extracted.json
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const PDF_PATH = path.join(ROOT, 'parsed_data', 'full_pdf.txt')
const OUT_DIR = path.join(ROOT, 'scripts', 'output')
const OUT_PATH = path.join(OUT_DIR, 'first-vespers-extracted.json')

// --- shared constants (kept in sync with extract-psalter-seasonal-antiphons.js) ---

const NOISE_PATTERNS = [
  /^\s*$/,
  /^\d{1,3}\s*$/,
  /^\d{1,3}\s*\t+\s*$/,
  /^\d{1,3}\s+\d{1,3}\s*$/,
  /^\d+\s*\t+.*(дугаар|дүгээр)\s+долоо\s+хоног/,
  /^\s*\d+\s+(дугаар|дүгээр)\s+долоо\s+хоног\s*$/,
  // day-header banner (end-anchored so marker continuations like "Ням гараг:" pass through)
  /^\s*(Ням|Даваа|Мягмар|Лхагва|Пүрэв|Баасан|Бямба)\s+гараг(ийн\s+(өглөө|орой))?\s*$/,
  /^\s*(Өглөөний|Оройн|Шөнийн)\s+(даатгал|урих)\s+залбирал/,
  /^\s*\f\s*$/,
]

function isNoise(line) {
  for (const re of NOISE_PATTERNS) if (re.test(line)) return true
  return false
}

const HARD_TERMINATORS = [
  /^Шад\s+(дуулал|магтаал)(?:\s|$)/,
  /^Шад\s+магтуу(?:\s|$)/,
  /^Дууллы[нг]\s+(?:төгсгөх\s+)?залбирал/,
  /^Магтууллы[нг]\s+(?:төгсгөх\s+)?залбирал/,
  /^["“][Дд]уулал\s+\d+["”]\s+нь/,
  // First-Vespers-specific section headings (this extractor operates on
  // contiguous 1st-Vespers blocks where these introduce non-psalm sections).
  // Note: Cyrillic letters are not "word chars" in ASCII-era JS regex, so
  // `\b` is unreliable — use `(?=\s|$)` or `\s*` explicit boundary.
  /^Уншлага(?=\s|$)/,
  /^Хариу\s+залбирал/,
  /^Мариагийн\s+магтаал/,
  /^Гуйлтын\s+залбирал/,
  /^Төгсгөлийн\s+залбирлыг/,
  /^Төгсгөлийг\s+дэг\s+жаягийн/,
]

const RUBRIC_INSTRUCTION_TERMINATORS = [/^Оройн\s+даатгал\s+залбирлыг/]
const BODY_ENTRY_MARKERS = [
  /^Дуулал\s+\d/,
  /^Магтаал\s*$/,
  /^Магтаал\s+\d/,
  /^(I|II|III|IV|V|VI|VII|VIII|IX|X)\s*$/,
]

const SKIP_MARKERS = [/^Ариун\s+долоо\s+хоног:/, /^Хэрэв\s+энэ\s+Ням\s+гараг/]

const MARKERS = [
  { season: 'lentSunday', re: /^Дөчин хоногийн цаг улирлын\s+([\d,\s]+)\s+(?:дэх|дахь)\s+Ням\s+гараг:\s*(.*)$/, isPerSunday: true },
  { season: 'easterSunday', re: /^Амилалтын цаг улирлын\s+([\d,\s]+)\s+(?:дэх|дахь)\s+Ням\s+гараг:\s*(.*)$/, isPerSunday: true },
  { season: 'lentPassionSunday', re: /^Ням\s+гараг\s+Дөчин хоногийн цаг улирал,\s+Эзэний\s+тарчлалтын\s+Ням\s+гараг:\s*(.*)$/ },
  { season: 'lentPassionSunday', re: /^Дөчин хоногийн цаг улирал,\s+Эзэний\s+тарчлалтын\s+Ням\s+гараг:\s*(.*)$/ },
  { season: 'lentPassionSunday', re: /^тарчлалтын\s+Ням\s+гараг:\s*(.*)$/ },
  { season: 'easterAlt', re: /^Эсвэл,\s+амилалтын\s+цаг\s+улирлын\s+үед:\s*(.*)$/ },
  { season: 'adventDec24', re: /^12\s+сарын\s+24:\s*(.*)$/ },
  { season: 'adventDec17_23', re: /^12\s+сарын\s+17[–-]23:\s*(.*)$/ },
  { season: 'easter', re: /^Амилалтын улирал:\s*(.*)$/ },
  { season: 'easter', re: /^Амилалтын цаг улирал\s+(.*)$/ },
  { season: 'advent', re: /^Ирэлтийн цаг улирал:\s*(.*)$/ },
]

// --- helpers ---

function parseAnchor(line) {
  const m1 = line.match(/^Шад\s+дуулал(?:\s+(\d+))?\s+(.+)$/)
  if (m1) {
    const rest = m1[2].trim()
    if (/^ердийн/.test(rest)) return null
    return { type: 'psalm', num: m1[1] ? parseInt(m1[1], 10) : null, preview: rest }
  }
  const m2 = line.match(/^Шад\s+магтаал(?:\s+(\d+))?\s+(.+)$/)
  if (m2) {
    const rest = m2[2].trim()
    if (/^ердийн/.test(rest)) return null
    return { type: 'canticle', num: m2[1] ? parseInt(m2[1], 10) : null, preview: rest }
  }
  return null
}

function maybeJoinMarker(lines, i) {
  const curr = lines[i]
  if (
    !/(Ням\s*$)|(Ням\s+хоног\s*$)|(Ариун\s+долоо\s*$)|(тарчлалтын\s*$)|(Эзэний\s*$)|(энэ\s+Ням\s*$)/.test(
      curr,
    )
  ) {
    return null
  }
  for (let j = i + 1; j < lines.length && j < i + 4; j++) {
    const nxt = lines[j]
    if (/^\s*$/.test(nxt) || isNoise(nxt)) continue
    if (
      /^гараг:/.test(nxt) ||
      /^хоног:/.test(nxt) ||
      /^Ням\s+гараг:/.test(nxt) ||
      /^тарчлалтын\s+Ням\s+гараг:/.test(nxt)
    ) {
      return { joined: curr + ' ' + nxt, consumed: j - i }
    }
    break
  }
  return null
}

function readDefaultAntiphon(lines, startIdx) {
  const m = lines[startIdx].match(/^Шад\s+(?:дуулал|магтаал)(?:\s+\d+)?\s+(.*)$/)
  if (!m) return null
  const parts = [m[1].trim()]
  let sawBlank = false
  let i = startIdx + 1
  for (; i < lines.length; i++) {
    const line = lines[i]
    if (/^\s*$/.test(line)) {
      if (sawBlank || /[.!?]$/.test(parts.join(' ').trim())) break
      sawBlank = true
      continue
    }
    if (HARD_TERMINATORS.some(re => re.test(line))) break
    if (BODY_ENTRY_MARKERS.some(re => re.test(line))) break
    if (MARKERS.some(m2 => m2.re.test(line))) break
    if (isNoise(line)) continue
    parts.push(line.trim())
    sawBlank = false
  }
  return { defaultText: parts.join(' ').replace(/\s+/g, ' ').trim(), endIdx: i }
}

function readVariantBlocks(lines, startIdx) {
  const variants = []
  let current = null
  let discarding = false
  let inBody = false
  let i = startIdx
  for (; i < lines.length; i++) {
    let line = lines[i]
    let extraConsumed = 0
    const join = maybeJoinMarker(lines, i)
    if (join) {
      line = join.joined
      extraConsumed = join.consumed
    }
    if (HARD_TERMINATORS.some(re => re.test(line))) break
    if (/^\s*$/.test(line) || isNoise(line)) continue
    if (SKIP_MARKERS.some(re => re.test(line))) {
      if (current) { variants.push(current); current = null }
      discarding = true; inBody = false
      i += extraConsumed
      continue
    }
    if (RUBRIC_INSTRUCTION_TERMINATORS.some(re => re.test(line))) {
      if (current) { variants.push(current); current = null }
      discarding = true
      continue
    }
    let matched = false
    for (const mk of MARKERS) {
      const mm = line.match(mk.re)
      if (mm) {
        if (current) variants.push(current)
        current = {
          season: mk.season,
          isPerSunday: !!mk.isPerSunday,
          weekNums: mk.isPerSunday
            ? mm[1].split(',').map(s => parseInt(s.trim(), 10)).filter(n => Number.isFinite(n))
            : null,
          text: mm[mk.isPerSunday ? 2 : 1].trim(),
        }
        discarding = false; inBody = false; matched = true
        i += extraConsumed
        break
      }
    }
    if (!matched) {
      if (BODY_ENTRY_MARKERS.some(re => re.test(line))) {
        if (current) { variants.push(current); current = null }
        inBody = true
        continue
      }
      if (inBody) continue
      if (discarding) continue
      if (current) current.text = (current.text + ' ' + line.trim()).replace(/\s+/g, ' ').trim()
    }
  }
  if (current) variants.push(current)
  return { variants, endIdx: i }
}

// --- First-Vespers-specific helpers ---

// Find the psalter-week number preceding an anchor line. Search back up
// to 10 lines for "N ДҮГЭЭР/ДУГААР ДОЛОО ХОНОГ".
function findWeekHeader(lines, anchorLineIdx) {
  const WEEK_HEADER = /^(\d+)\s+(?:ДҮГЭЭР|ДУГААР)\s+ДОЛОО\s+ХОНОГ\s*$/
  for (let i = anchorLineIdx - 1; i >= Math.max(0, anchorLineIdx - 10); i--) {
    const m = lines[i].match(WEEK_HEADER)
    if (m) return parseInt(m[1], 10)
  }
  return null
}

// Pull the body ref within a range [startIdx, endIdx) that already
// contains the psalm/canticle body header consumed by readVariantBlocks
// in its `inBody` state. Scan for "Дуулал NN:verse-range" (psalm) or
// "Магтаал" followed by a canticle citation on a subsequent line.
function readBodyRefInRange(lines, startIdx, endIdx) {
  let i = startIdx
  while (i < endIdx) {
    const line = lines[i]
    if (/^\s*$/.test(line) || isNoise(line)) { i++; continue }
    const mPs = line.match(/^Дуулал\s+(\d+(?::\d+(?:-\d+)?)?)/)
    if (mPs) return `Psalm ${mPs[1]}`
    if (/^Магтаал\s*$/.test(line)) {
      for (let j = i + 1; j < Math.min(endIdx, i + 10); j++) {
        const l2 = lines[j]
        if (/^\s*$/.test(l2) || isNoise(l2)) continue
        const mPh = l2.match(/^Филиппой\s+(\d+:\d+[-–]\d+)/)
        if (mPh) return `Philippians ${mPh[1].replace('–', '-')}`
        const mEph = l2.match(/^Ефесүс\s+(\d+:\d+[-–]\d+)/)
        if (mEph) return `Ephesians ${mEph[1].replace('–', '-')}`
        const mCol = l2.match(/^Колоссай\s+(\d+:\d+[-–]\d+)/)
        if (mCol) return `Colossians ${mCol[1].replace('–', '-')}`
        const mRev = l2.match(/^Илчлэл\s+(\d+:\d+[-–]\d+)/)
        if (mRev) return `Revelation ${mRev[1].replace('–', '-')}`
        break
      }
      return null
    }
    i++
  }
  return null
}

// Read a "section" — generic prose block between two heading markers.
// Stops at any heading in `stopPatterns` or at HARD_TERMINATORS.
function readProseUntil(lines, startIdx, stopPatterns) {
  const parts = []
  let i = startIdx
  for (; i < lines.length; i++) {
    const line = lines[i]
    if (stopPatterns.some(re => re.test(line))) break
    if (isNoise(line)) continue
    parts.push(line.trim())
  }
  return { text: parts.join(' ').replace(/\s+/g, ' ').trim(), endIdx: i }
}

// Parse intercessions into array. Structure per petition:
//   statement line(s)
//   - response line(s)
// Boundary: a non-dash line that follows a completed dash-response closes
// the previous petition. The very first item = lead prose + refrain (no
// dash) — merged into a single string per propers/*.json convention.
function readIntercessions(lines, startIdx, stopPatterns) {
  const items = []
  let buf = []
  let i = startIdx
  let state = 'statement' // 'statement' or 'response'
  let leadColonSeen = false // saw a `:`-terminated line inside item[0]
  const flush = () => {
    if (buf.length > 0) {
      const t = buf.join(' ').replace(/\s+/g, ' ').trim()
      if (t) items.push(t)
      buf = []
    }
    leadColonSeen = false
  }
  for (; i < lines.length; i++) {
    const line = lines[i]
    if (stopPatterns.some(re => re.test(line))) break
    if (/^\s*$/.test(line)) continue
    if (isNoise(line)) continue
    const trimmed = line.trim()
    if (/^Эсвэл:\s*$/.test(trimmed)) {
      // Alternative section marker — stay in current buffer; skip the label.
      continue
    }
    const isDash = /^[-–—]\s+/.test(trimmed)
    if (isDash) {
      const body = trimmed.replace(/^[-–—]\s+/, '')
      if (buf.length === 0) {
        buf.push(body)
      } else {
        buf.push('— ' + body)
      }
      state = 'response'
      continue
    }
    // non-dash statement line. If previous line ended mid-sentence (no
    // terminal punctuation), treat as word-wrap continuation — append
    // to current buf without flushing. Otherwise transition from
    // response→statement by flushing.
    const lastEntry = buf.length > 0 ? buf[buf.length - 1] : ''
    const prevEndsSentence = /[.!?…]['"“”»]?\s*$/.test(lastEntry)
    if (state === 'response') {
      if (prevEndsSentence) {
        flush()
        state = 'statement'
        buf.push(trimmed)
      } else {
        // continuation of the wrapped response — append to last entry
        buf[buf.length - 1] = lastEntry + ' ' + trimmed
      }
      // (note: when continuing, we stay in 'response' state so the next
      // non-dash line that DOES end a sentence still triggers flush)
      continue
    }
    buf.push(trimmed)
    // Lead+refrain detection — the lead always ends with `:` (invites
    // the refrain). The FIRST subsequent sentence-terminated line (., !, ?)
    // closes the refrain. Flush so petition 1 opens a fresh item.
    if (items.length === 0) {
      if (/:['"“”»]?\s*$/.test(trimmed)) {
        leadColonSeen = true
      } else if (leadColonSeen && /[.!?…]['"“”»]?\s*$/.test(trimmed)) {
        flush()
        state = 'statement'
      }
    }
  }
  flush()
  return { items, endIdx: i }
}

// Determine whether a Magnificat/concluding block is a reference
// ("draw from seasonal" pointer) rather than a literal text. If so,
// callers skip injection.
function isSeasonalReference(text) {
  if (!text) return true
  return /Цаг\s+улирлын\s+Онцлог\s+шинж/.test(text) || /гэсэн\s+хэсгээс\s+татаж\s+авна/.test(text)
}

// --- block walker ---

function walkBlock(lines, startLineIdx) {
  // Parse one "1 дүгээр Оройн даатгал залбирал" block. Returns
  // { psalms[3], shortReading, responsory, magnificatAntiphon?,
  //   intercessions[], concludingPrayer? }
  const result = {
    psalms: [],
    shortReading: null,
    responsory: null,
    gospelCanticleAntiphon: null,
    intercessions: [],
    concludingPrayer: null,
  }

  // Fast-forward to `Дууллын залбирал` heading (opens the first psalm).
  let i = startLineIdx + 1
  while (i < lines.length) {
    if (/^Дууллын\s+залбирал\s*$/.test(lines[i])) { i++; break }
    i++
  }

  // Extract 3 psalm entries.
  let psalmIdx = 0
  while (psalmIdx < 3 && i < lines.length) {
    // Scan to next `Шад дуулал` or `Шад магтаал` anchor.
    while (i < lines.length && !parseAnchor(lines[i])) {
      // Break on section-level markers (Уншлага, Мариагийн магтаал, Хариу залбирал, Гуйлтын залбирал)
      if (/^Уншлага\b/.test(lines[i]) || /^Хариу\s+залбирал/.test(lines[i])) break
      i++
    }
    if (i >= lines.length) break
    const anchorLine = lines[i]
    const anchor = parseAnchor(anchorLine)
    if (!anchor) break

    // read default antiphon
    const defRead = readDefaultAntiphon(lines, i)
    const defaultText = defRead.defaultText

    // read seasonal variants
    const variantsRead = readVariantBlocks(lines, defRead.endIdx)
    const seasonalAntiphons = {}
    for (const v of variantsRead.variants) {
      if (v.isPerSunday) {
        const bucket = seasonalAntiphons[v.season] || {}
        for (const wnum of v.weekNums) bucket[wnum] = v.text
        seasonalAntiphons[v.season] = bucket
      } else {
        seasonalAntiphons[v.season] = v.text
      }
    }

    // read body ref from inside the range already walked (body header
    // was consumed by readVariantBlocks when entering inBody state).
    const bodyRef = readBodyRefInRange(lines, defRead.endIdx, variantsRead.endIdx)

    result.psalms.push({
      type: anchor.type,
      anchorNum: anchor.num,
      ref: bodyRef,
      default_antiphon: defaultText,
      seasonal_antiphons: seasonalAntiphons,
    })

    i = variantsRead.endIdx
    psalmIdx++
  }

  // Scan forward for section headings.
  // "Уншлага" → shortReading
  while (i < lines.length && !/^Уншлага(?=\s|$)/.test(lines[i]) && !/^Хариу\s+залбирал/.test(lines[i]) && !/^Төгсгөлийг\s+дэг\s+жаягийн/.test(lines[i])) {
    i++
  }
  if (i < lines.length && /^Уншлага(?=\s|$)/.test(lines[i])) {
    i++
    // Next non-noise line(s) = biblical ref (e.g. "Ром 11:25, 30-36")
    while (i < lines.length && (isNoise(lines[i]) || /^\s*$/.test(lines[i]))) i++
    let refLine = i < lines.length ? lines[i].trim() : ''
    // Convert Mongolian book abbrev to canonical English form.
    const refOut = convertBibleRef(refLine)
    i++
    // Capture text until "Хариу залбирал".
    // Do NOT list `\f` as a stop — form-feed alone is a page break
    // inside a wrapped passage and is handled by NOISE_PATTERNS.
    const stop = [/^Хариу\s+залбирал/]
    const prose = readProseUntil(lines, i, stop)
    result.shortReading = { ref: refOut || refLine, text: prose.text }
    i = prose.endIdx
  }

  // "Хариу залбирал" → responsory. The PDF layout is:
  //   Хариу залбирал
  //   {fullResponse line 1}
  //   {fullResponse line 2} (wrapped)
  //   - {fullResponse echo}
  //   {versicle}
  //   - {shortResponse}
  //   Эцэг, Хүү, Ариун Сүнсийг магтан дуулъя.
  //   - {fullResponse echo again}
  // Simplified: capture fullResponse before the first "- ", then versicle
  // between dashes.
  if (i < lines.length && /^Хариу\s+залбирал/.test(lines[i])) {
    i++
    const respLines = []
    while (
      i < lines.length &&
      !/^Мариагийн\s+магтаал/.test(lines[i]) &&
      !/^Гуйлтын\s+залбирал/.test(lines[i]) &&
      !/^Төгсгөлийг\s+дэг\s+жаягийн/.test(lines[i])
    ) {
      if (!isNoise(lines[i])) respLines.push(lines[i].trim())
      i++
    }
    result.responsory = parseResponsory(respLines)
  }

  // "Мариагийн магтаал" → gospelCanticleAntiphon (or reference)
  if (i < lines.length && /^Мариагийн\s+магтаал/.test(lines[i])) {
    i++
    // Next line is usually "Шад магтаал: үүнийг «Цаг улирлын Онцлог шинж»..."
    // which is a reference, not a literal text.
    while (i < lines.length && (isNoise(lines[i]) || /^\s*$/.test(lines[i]))) i++
    const stopAnt = [/^Гуйлтын\s+залбирал/, /^Төгсгөлийг\s+дэг\s+жаягийн/]
    const antProse = readProseUntil(lines, i, stopAnt)
    if (!isSeasonalReference(antProse.text)) {
      result.gospelCanticleAntiphon = antProse.text
    }
    i = antProse.endIdx
  }

  // "Гуйлтын залбирал" → intercessions
  if (i < lines.length && /^Гуйлтын\s+залбирал/.test(lines[i])) {
    i++
    const stopInter = [
      /^Төгсгөлийн\s+залбирлыг/,
      /^Төгсгөлийг\s+дэг\s+жаягийн/,
      /^"Тэнгэр\s+дэх\s+Эцэг\s+минь\s+ээ/,
      /^“Тэнгэр\s+дэх\s+Эцэг\s+минь\s+ээ/,
    ]
    const inter = readIntercessions(lines, i, stopInter)
    result.intercessions = inter.items
    i = inter.endIdx
  }

  // Skip the Lord's Prayer line.
  while (
    i < lines.length &&
    (/^"Тэнгэр\s+дэх\s+Эцэг\s+минь\s+ээ/.test(lines[i]) || /^“Тэнгэр\s+дэх\s+Эцэг\s+минь\s+ээ/.test(lines[i]))
  ) {
    i++
  }

  // "Төгсгөлийн залбирлыг" → concludingPrayer (usually a reference)
  while (i < lines.length && !/^Төгсгөлийн\s+залбирлыг/.test(lines[i]) && !/^Төгсгөлийг\s+дэг\s+жаягийн/.test(lines[i])) {
    i++
  }
  if (i < lines.length && /^Төгсгөлийн\s+залбирлыг/.test(lines[i])) {
    // Look at subsequent lines; if they describe a reference, skip.
    const stopCp = [/^Төгсгөлийг\s+дэг\s+жаягийн/]
    const cpProse = readProseUntil(lines, i, stopCp)
    if (!isSeasonalReference(cpProse.text)) {
      result.concludingPrayer = cpProse.text
    }
    i = cpProse.endIdx
  }

  return { block: result, endIdx: i }
}

function parseResponsory(respLines) {
  // Roman short-responsory layout (Mongolian rendering):
  //   Block 1 (no dash)  ← fullResponse
  //   Block 2 (dash)     ← echo of fullResponse (skip)
  //   Block 3 (no dash)  ← versicle
  //   Block 4 (dash)     ← shortResponse
  //   Block 5 (no dash)  ← doxology intro "Эцэг, Хүү, Ариун Сүнсийг…" (skip)
  //   Block 6 (dash)     ← final echo of fullResponse (skip)
  //
  // Group consecutive lines into blocks where each block starts with
  // either a dash or a non-dash line and accumulates non-dash
  // continuation lines until the next starter.
  const clean = respLines.map(l => l.trim()).filter(l => l.length > 0)
  const blocks = []
  let cur = null
  for (const line of clean) {
    const isDashStart = /^[-–—]\s+/.test(line)
    // A new block starts when:
    //  - the current line begins with a dash (=dash block), OR
    //  - no block is open yet, OR
    //  - the previous line ended a sentence (. ! ? …) — word-wrap
    //    continuations do not end with terminal punctuation.
    const prevEndsSentence =
      cur !== null &&
      /[.!?…]['"“”»]?\s*$/.test(cur.text)
    if (isDashStart || cur === null || prevEndsSentence) {
      if (cur) blocks.push(cur)
      cur = {
        isDash: isDashStart,
        text: line.replace(/^[-–—]\s+/, ''),
      }
    } else {
      cur.text += ' ' + line
    }
  }
  if (cur) blocks.push(cur)

  const fullResp = blocks[0] && !blocks[0].isDash ? blocks[0].text : ''
  const versicle = blocks[2] && !blocks[2].isDash ? blocks[2].text : ''
  const shortResp = blocks[3] && blocks[3].isDash ? blocks[3].text : ''

  return {
    fullResponse: fullResp.replace(/\s+/g, ' ').trim(),
    versicle: versicle.replace(/\s+/g, ' ').trim(),
    shortResponse: shortResp.replace(/\s+/g, ' ').trim(),
  }
}

// --- Bible ref conversion ---

const BOOK_MAP = [
  [/^Ром\s+/, 'Romans '],
  [/^Еврей\s+/, 'Hebrews '],
  [/^Илчлэл\s+/, 'Revelation '],
  [/^Филиппой\s+/, 'Philippians '],
  [/^Ефесүс\s+/, 'Ephesians '],
  [/^Колоссай\s+/, 'Colossians '],
  [/^Иаков\s+/, 'James '],
  [/^1\s+Петр\s+/, '1 Peter '],
  [/^2\s+Петр\s+/, '2 Peter '],
  [/^1\s+Иохан\s+/, '1 John '],
  [/^2\s+Коринт\s+/, '2 Corinthians '],
  [/^1\s+Коринт\s+/, '1 Corinthians '],
  [/^Галат\s+/, 'Galatians '],
  [/^Тесалоник\s+/, 'Thessalonians '],
  [/^1\s+Тесалоник\s+/, '1 Thessalonians '],
  [/^2\s+Тесалоник\s+/, '2 Thessalonians '],
]

function convertBibleRef(s) {
  if (!s) return s
  for (const [re, rep] of BOOK_MAP) {
    if (re.test(s)) return s.replace(re, rep).replace(/–/g, '-').trim()
  }
  return s
}

// --- main ---

function main() {
  const pdfText = fs.readFileSync(PDF_PATH, 'utf8')
  const lines = pdfText.split(/\r?\n/)

  const ANCHOR_RE = /^1 дүгээр Оройн даатгал залбирал\s*$/
  const blocks = {}

  for (let i = 0; i < lines.length; i++) {
    if (!ANCHOR_RE.test(lines[i])) continue
    const week = findWeekHeader(lines, i)
    if (!week || week < 1 || week > 4) continue
    if (blocks[week]) continue // keep first occurrence only (the psalter one)

    const walk = walkBlock(lines, i)
    blocks[week] = {
      pdfLine: i + 1,
      pdfLineEnd: walk.endIdx + 1,
      ...walk.block,
    }
  }

  // stats
  const summary = {}
  for (const wk of ['1', '2', '3', '4']) {
    const b = blocks[wk]
    if (!b) { summary[`week${wk}`] = 'MISSING'; continue }
    const seasons = new Set()
    let perSunday = 0
    for (const p of b.psalms) {
      for (const s of Object.keys(p.seasonal_antiphons || {})) {
        seasons.add(s)
        if (typeof p.seasonal_antiphons[s] === 'object') {
          perSunday += Object.keys(p.seasonal_antiphons[s]).length
        }
      }
    }
    summary[`week${wk}`] = {
      pdfLine: b.pdfLine,
      psalms: b.psalms.length,
      psalmRefs: b.psalms.map(p => p.ref),
      seasons: Array.from(seasons),
      perSundayVariants: perSunday,
      hasShortReading: !!b.shortReading,
      hasResponsory: !!b.responsory,
      hasGospelCanticleAntiphon: !!b.gospelCanticleAntiphon,
      intercessionCount: b.intercessions.length,
      hasConcludingPrayer: !!b.concludingPrayer,
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(OUT_PATH, JSON.stringify(blocks, null, 2) + '\n', 'utf8')
  console.log(`[extract-fv] wrote ${OUT_PATH}`)
  console.log('[extract-fv] summary:')
  for (const k of Object.keys(summary)) {
    console.log(`  ${k}:`, typeof summary[k] === 'string' ? summary[k] : JSON.stringify(summary[k]))
  }
}

main()
