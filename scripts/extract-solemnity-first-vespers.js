#!/usr/bin/env node
/**
 * FR-156 Phase 3b (task #22). Extract Solemnity / major-feast First
 * Vespers ("1 дүгээр Оройн даатгал залбирал") blocks from
 * parsed_data/full_pdf.txt and key them by MM-DD date (for sanctoral
 * injection) or by a named slug (for movable solemnities — out-of-scope
 * for Phase 3b but still captured so a later phase can consume).
 *
 * Anchor: same regex as Phase 2 (`^1 дүгээр Оройн даатгал залбирал$`).
 * 61 total in the PDF; the first 4 are psalter-week sections handled by
 * Phase 2, and the remaining 57 cover Advent/Lent generic Sundays, OT
 * Sundays 2..33, seasonal movable celebrations (Ascension, Pentecost,
 * Trinity, Corpus Christi, Sacred Heart, Christ the King, Palm/Easter
 * Sunday, Holy Family, Baptism of the Lord), and fixed-date
 * solemnities/feasts (Christmas, Mary Mother of God, St. Joseph, etc.).
 *
 * For each anchor we:
 *   1. Walk back up to 60 lines looking for:
 *        - An "N сарын M" date line           → fixed MM-DD key
 *        - An uppercase celebration heading   → name
 *        - A rank label ("Их баяр" | "Баяр")  → SOLEMNITY | FEAST
 *        - A movable-celebration heading (НЯМ ГАРАГ within a
 *          season block) → classify as season_sunday / movable
 *   2. Walk forward parsing the 1st Vespers structure (psalms[3],
 *      shortReading, responsory, Magnificat antiphon [literal text,
 *      not a seasonal reference as in Phase 2], intercessions,
 *      concludingPrayer, alternativeConcludingPrayer).
 *   3. Emit `{anchorLine, date, name, rank, category, firstVespers}`.
 *
 * Output: scripts/output/solemnity-first-vespers-extracted.json
 *   {
 *     "12-25": { ...FirstVespersPropers, _meta: {...} },
 *     "3-19":  { ...FirstVespersPropers, _meta: {...} },
 *     ...
 *   }
 *
 * Shared extraction helpers are kept in sync (copied) with
 * `extract-first-vespers.js`.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const PDF_PATH = path.join(ROOT, 'parsed_data', 'full_pdf.txt')
const OUT_DIR = path.join(ROOT, 'scripts', 'output')
const OUT_PATH = path.join(OUT_DIR, 'solemnity-first-vespers-extracted.json')

// --- shared constants (copied from extract-first-vespers.js) ---

const NOISE_PATTERNS = [
  /^\s*$/,
  /^\d{1,3}\s*$/,
  /^\d{1,3}\s*\t+\s*$/,
  /^\d{1,3}\s+\d{1,3}\s*$/,
  /^\d+\s*\t+.*(дугаар|дүгээр)\s+долоо\s+хоног/,
  /^\s*\d+\s+(дугаар|дүгээр)\s+долоо\s+хоног\s*$/,
  /^\s*(Ням|Даваа|Мягмар|Лхагва|Пүрэв|Баасан|Бямба)\s+гараг(ийн\s+(өглөө|орой))?\s*$/,
  /^\s*(Өглөөний|Оройн|Шөнийн)\s+(даатгал|урих)\s+залбирал/,
  /^\s*\f\s*$/,
  // Section banner headers that appear at page breaks inside solemnity
  // blocks (Christmas/Lent/Easter/Advent 1st Vespers sections wrap
  // across multiple PDF pages and the page header re-prints the season
  // title as standalone text). Must be end-anchored so marker
  // continuations like "Ирэлтийн цаг улирал:" (with colon) still pass.
  /^Эзэний\s+мэндлэлтийн\s+цаг\s+улирал\s*$/i,
  /^Ирэлтийн\s+цаг\s+улирал\s*$/i,
  /^Дөчин\s+хоногийн\s+цаг\s+улирал\s*$/i,
  /^Амилалтын\s+цаг\s+улирал\s*$/i,
  /^Жирийн\s+цаг\s+улирал\s*$/i,
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
  /^Уншлага(?=\s|$)/,
  /^Хариу\s+залбирал/,
  /^Мариагийн\s+магтаал/,
  /^Гуйлтын\s+залбирал/,
  /^Төгсгөлийн\s+залбирлыг/,
  /^Төгсгөлийн\s+даатгал\s+залбирал/,
  /^Сонголтот\s+залбирал/,
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

// --- helpers (copied from extract-first-vespers.js) ---

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
    if (join) { line = join.joined; extraConsumed = join.consumed }
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
        const m1P = l2.match(/^1\s+Петр\s+(\d+:\d+[-–]\d+)/)
        if (m1P) return `1 Peter ${m1P[1].replace('–', '-')}`
        const mJas = l2.match(/^Иаков\s+(\d+:\d+[-–]\d+)/)
        if (mJas) return `James ${mJas[1].replace('–', '-')}`
        break
      }
      return null
    }
    i++
  }
  return null
}

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

function readIntercessions(lines, startIdx, stopPatterns) {
  const items = []
  let buf = []
  let i = startIdx
  let state = 'statement'
  let leadColonSeen = false
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
    if (/^Эсвэл:\s*$/.test(trimmed)) continue
    const isDash = /^[-–—]\s+/.test(trimmed)
    if (isDash) {
      const body = trimmed.replace(/^[-–—]\s+/, '')
      if (buf.length === 0) buf.push(body)
      else buf.push('— ' + body)
      state = 'response'
      continue
    }
    const lastEntry = buf.length > 0 ? buf[buf.length - 1] : ''
    const prevEndsSentence = /[.!?…]['"“”»]?\s*$/.test(lastEntry)
    if (state === 'response') {
      if (prevEndsSentence) {
        flush()
        state = 'statement'
        buf.push(trimmed)
      } else {
        buf[buf.length - 1] = lastEntry + ' ' + trimmed
      }
      continue
    }
    buf.push(trimmed)
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

function parseResponsory(respLines) {
  const clean = respLines.map(l => l.trim()).filter(l => l.length > 0)
  const blocks = []
  let cur = null
  for (const line of clean) {
    const isDashStart = /^[-–—]\s+/.test(line)
    const prevEndsSentence =
      cur !== null && /[.!?…]['"“”»]?\s*$/.test(cur.text)
    if (isDashStart || cur === null || prevEndsSentence) {
      if (cur) blocks.push(cur)
      cur = { isDash: isDashStart, text: line.replace(/^[-–—]\s+/, '') }
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

// --- metadata detection (Phase 3b specific) ---

// Mongolian date pattern: "12 дугаар сарын 25", "1 дүгээр сарын 1",
// "8 сарын 15" (no ordinal), etc.
const DATE_RE = /^(\d{1,2})\s+(?:дүгээр|дугаар)?\s*сарын\s+(\d{1,2})\s*$/

// Known named slugs for movable celebrations (keyed by ALLCAPS substring).
const MOVABLE_SLUGS = [
  { re: /ЭЗЭНИЙ\s+ТЭНГЭРТ\s+ЗАЛАРСАН/, slug: 'ascension' },
  { re: /АРИУН\s+СҮНСНИЙ\s+БУУЛТ/, slug: 'pentecost' },
  { re: /ТУЙЛЫН\s+АРИУН\s+НАНДИН\s+ГУРВАЛ/, slug: 'trinitySunday' },
  { re: /БИЕ\s+БА\s+ЦУС/, slug: 'corpusChristi' },
  { re: /ЕСҮСИЙН\s+ТУЙЛЫН\s+АРИУН\s+НАНДИН/, slug: 'sacredHeart' },
  { re: /ЕРТӨНЦИЙН\s+ХААН/, slug: 'christTheKing' },
  { re: /ДАЛ\s+МОДНЫ\s+МӨЧРИЙН/, slug: 'palmSunday' },
  { re: /АМИЛАЛТЫН\s+ЦАГ\s+УЛИРАЛ/, slug: 'easterSundayVigil' },
  { re: /ИОСЕФ,\s+МАРИА,\s+ЕСҮСИЙН\s+АРИУН\s+ГЭР\s+БҮЛ/, slug: 'holyFamily' },
  { re: /ЭЗЭНИЙ\s+АРИУН\s+УГААЛ/, slug: 'baptismOfTheLord' },
]

function detectMetadata(lines, anchorIdx) {
  // Search back up to 60 lines for date / rank / name markers.
  const WINDOW = 60
  const upperBound = Math.max(0, anchorIdx - WINDOW)
  let date = null  // { mm, dd }
  let rank = null  // 'SOLEMNITY' | 'FEAST'
  let name = null
  let isSeasonSunday = false
  let seasonContext = null  // 'advent' | 'lent' | 'easter' | 'ordinary' | 'christmas'
  let movableSlug = null

  // Section-level headings frequently sit right above the anchor block.
  for (let k = anchorIdx - 1; k >= upperBound; k--) {
    const l = lines[k].trim()
    if (!l) continue

    // Rank label — either standalone line OR as suffix of a heading
    // (e.g. "ЭЗЭНИЙ МЭНДЭЛСЭН ӨДӨР Их баяр"). Suffix form is more common
    // on solemnity section headers; standalone form appears when the
    // name wraps to 2 lines.
    if (!rank) {
      if (/^Их\s+баяр\s*$/.test(l) || /\s+Их\s+баяр\s*$/.test(l)) rank = 'SOLEMNITY'
      else if (/^Баяр\s*$/.test(l) || /\s+Баяр\s*$/.test(l)) rank = 'FEAST'
    }

    // Date line
    const dm = l.match(DATE_RE)
    if (dm && !date) date = { mm: parseInt(dm[1], 10), dd: parseInt(dm[2], 10) }

    // Uppercase celebration heading. Accept `XXX Их баяр` / `XXX Баяр`
    // suffix so `ЭЗЭНИЙ МЭНДЭЛСЭН ӨДӨР Их баяр` is treated as a name.
    if (!name) {
      // Strip suffix rank label from candidate before matching uppercase.
      const stripped = l.replace(/\s+(Их\s+баяр|Баяр)\s*$/, '')
      if (/^[А-ЯЁӨҮ\s\-,]{5,}$/.test(stripped)) {
        if (!/^(НЯМ\s+ГАРАГ|ДУУЛАЛТ|ДОЛОО\s+ХОНОГ|ДҮГЭЭР\s+ДОЛОО|ДУГААР\s+ДОЛОО)/.test(stripped)) {
          if (/^ИРЭЛТИЙН\s+ЦАГ\s+УЛИРАЛ/.test(stripped)) seasonContext = 'advent'
          else if (/^ЭЗЭНИЙ\s+МЭНДЛЭЛТИЙН/.test(stripped)) seasonContext = 'christmas'
          else if (/^ДӨЧИН\s+ХОНОГИЙН\s+ЦАГ\s+УЛИРАЛ/.test(stripped)) seasonContext = 'lent'
          else if (/^АМИЛАЛТЫН\s+ЦАГ\s+УЛИРАЛ/.test(stripped)) seasonContext = 'easter'
          else name = stripped
        }
      }
    }

    // Sunday numeric heading (OT Sundays: "ХОЁР ДАХЬ НЯМ ГАРАГ" etc.)
    if (/НЯМ\s+ГАРАГ$/.test(l) && /(ДАХ|ДЭХ|ДАХЬ)/.test(l)) {
      if (!isSeasonSunday) {
        isSeasonSunday = true
        if (!name) name = l
      }
    }
  }

  // Match name against known movable slugs.
  if (name) {
    for (const { re, slug } of MOVABLE_SLUGS) {
      if (re.test(name)) { movableSlug = slug; break }
    }
  }

  return { date, rank, name, seasonContext, isSeasonSunday, movableSlug }
}

// --- block walker (Phase 3b — collects solemnity fields including
//     explicit gospelCanticleAntiphon, concludingPrayer, and the
//     alternative concluding prayer that solemnities often carry) ---

function walkBlock(lines, startLineIdx) {
  const result = {
    psalms: [],
    shortReading: null,
    responsory: null,
    gospelCanticleAntiphon: null,
    intercessions: [],
    concludingPrayer: null,
    alternativeConcludingPrayer: null,
  }

  let i = startLineIdx + 1
  // Fast-forward to `Дууллын залбирал` (psalm block opener). Abort if
  // we hit the next anchor first (empty block).
  while (i < lines.length) {
    if (/^Дууллын\s+залбирал\s*$/.test(lines[i])) { i++; break }
    if (/^1 дүгээр Оройн даатгал залбирал\s*$/.test(lines[i])) break
    // Some solemnity entries (Holy Family, Motherhood of Mary, Baptism of
    // the Lord, Epiphany, Ascension, Pentecost, Trinity, Corpus Christi,
    // Sacred Heart, Christ the King) start with "Мариагийн магтаал" only
    // (no full psalm set — the psalms come from the preceding psalter
    // reference). Bail early so we capture the Magnificat antiphon + rest.
    if (/^Мариагийн\s+магтаал\s*$/.test(lines[i])) break
    i++
  }

  // Extract up to 3 psalm entries (if any — shortened solemnity blocks have none).
  let psalmIdx = 0
  while (psalmIdx < 3 && i < lines.length) {
    // Scan to next `Шад дуулал` or `Шад магтаал` anchor, or a section
    // heading that closes the psalm block.
    let scanI = i
    while (scanI < lines.length && !parseAnchor(lines[scanI])) {
      if (/^Уншлага\b/.test(lines[scanI])) break
      if (/^Хариу\s+залбирал/.test(lines[scanI])) break
      if (/^Мариагийн\s+магтаал/.test(lines[scanI])) break
      if (/^1 дүгээр Оройн даатгал залбирал/.test(lines[scanI])) break
      scanI++
    }
    if (scanI >= lines.length) { i = scanI; break }
    if (!parseAnchor(lines[scanI])) { i = scanI; break }

    i = scanI
    const anchorLine = lines[i]
    const anchor = parseAnchor(anchorLine)
    if (!anchor) break

    const defRead = readDefaultAntiphon(lines, i)
    const defaultText = defRead.defaultText
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

  // "Уншлага" → shortReading
  while (i < lines.length && !/^Уншлага(?=\s|$)/.test(lines[i]) && !/^Хариу\s+залбирал/.test(lines[i]) && !/^Мариагийн\s+магтаал/.test(lines[i]) && !/^Төгсгөлийг\s+дэг\s+жаягийн/.test(lines[i]) && !/^1 дүгээр Оройн даатгал залбирал/.test(lines[i])) {
    i++
  }
  if (i < lines.length && /^Уншлага(?=\s|$)/.test(lines[i])) {
    i++
    while (i < lines.length && (isNoise(lines[i]) || /^\s*$/.test(lines[i]))) i++
    const refLine = i < lines.length ? lines[i].trim() : ''
    const refOut = convertBibleRef(refLine)
    i++
    const stop = [/^Хариу\s+залбирал/]
    const prose = readProseUntil(lines, i, stop)
    result.shortReading = { ref: refOut || refLine, text: prose.text }
    i = prose.endIdx
  }

  // "Хариу залбирал" → responsory
  if (i < lines.length && /^Хариу\s+залбирал/.test(lines[i])) {
    i++
    const respLines = []
    while (
      i < lines.length &&
      !/^Мариагийн\s+магтаал/.test(lines[i]) &&
      !/^Гуйлтын\s+залбирал/.test(lines[i]) &&
      !/^Төгсгөлийн\s+(залбирлыг|даатгал)/.test(lines[i]) &&
      !/^Сонголтот\s+залбирал/.test(lines[i]) &&
      !/^Төгсгөлийг\s+дэг\s+жаягийн/.test(lines[i]) &&
      !/^1 дүгээр Оройн даатгал залбирал/.test(lines[i])
    ) {
      if (!isNoise(lines[i])) respLines.push(lines[i].trim())
      i++
    }
    result.responsory = parseResponsory(respLines)
  }

  // "Мариагийн магтаал" → gospelCanticleAntiphon (literal text for solemnities)
  if (i < lines.length && /^Мариагийн\s+магтаал/.test(lines[i])) {
    i++
    // Skip "Шад магтаал" prefix line if present (it's a rubric header).
    // For solemnities the actual antiphon may begin with "Шад магтаал <text>"
    // on one line.
    const antLines = []
    while (
      i < lines.length &&
      !/^Гуйлтын\s+залбирал/.test(lines[i]) &&
      !/^Төгсгөлийн\s+(залбирлыг|даатгал)/.test(lines[i]) &&
      !/^Сонголтот\s+залбирал/.test(lines[i]) &&
      !/^Төгсгөлийг\s+дэг\s+жаягийн/.test(lines[i]) &&
      !/^1 дүгээр Оройн даатгал залбирал/.test(lines[i]) &&
      // Short solemnity blocks (St. Joseph, Assumption, etc.) print
      // the Magnificat antiphon then jump directly to the Invitatory /
      // morning / 2nd Vespers / next-day sections. Terminate the
      // antiphon capture at any of those section headers.
      !/^Урих\s+дуудлага/.test(lines[i]) &&
      !/^Өглөөний\s+даатгал\s+залбирал/.test(lines[i]) &&
      !/^Захариагийн\s+магтаал/.test(lines[i]) &&
      !/^2\s+дугаар\s+Оройн\s+даатгал\s+залбирал/.test(lines[i])
    ) {
      if (!isNoise(lines[i])) {
        let l = lines[i].trim()
        // Strip leading "Шад магтаал " prefix when it introduces the
        // antiphon body on the same line.
        l = l.replace(/^Шад\s+магтаал\s+/, '')
        antLines.push(l)
      }
      i++
    }
    const antText = antLines.join(' ').replace(/\s+/g, ' ').trim()
    // Skip references ("draw from seasonal" pointers).
    if (antText && !isSeasonalReference(antText)) {
      result.gospelCanticleAntiphon = antText
    }
  }

  // "Гуйлтын залбирал" → intercessions
  if (i < lines.length && /^Гуйлтын\s+залбирал/.test(lines[i])) {
    i++
    const stopInter = [
      /^Төгсгөлийн\s+(залбирлыг|даатгал)/,
      /^Сонголтот\s+залбирал/,
      /^Төгсгөлийг\s+дэг\s+жаягийн/,
      /^"Тэнгэр\s+дэх\s+Эцэг\s+минь\s+ээ/,
      /^“Тэнгэр\s+дэх\s+Эцэг\s+минь\s+ээ/,
      /^1 дүгээр Оройн даатгал залбирал/,
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

  // "Төгсгөлийн даатгал залбирал" or "Төгсгөлийн залбирлыг" → concludingPrayer.
  // The former (даатгал залбирал) introduces literal text on solemnities.
  // The latter (залбирлыг) is a reference to seasonal propers.
  while (
    i < lines.length &&
    !/^Төгсгөлийн\s+(залбирлыг|даатгал)/.test(lines[i]) &&
    !/^Сонголтот\s+залбирал/.test(lines[i]) &&
    !/^Төгсгөлийг\s+дэг\s+жаягийн/.test(lines[i]) &&
    !/^1 дүгээр Оройн даатгал залбирал/.test(lines[i])
  ) {
    i++
  }
  if (i < lines.length && /^Төгсгөлийн\s+(залбирлыг|даатгал)/.test(lines[i])) {
    const isLiteral = /^Төгсгөлийн\s+даатгал/.test(lines[i])
    i++
    const stopCp = [
      /^Сонголтот\s+залбирал/,
      /^Төгсгөлийг\s+дэг\s+жаягийн/,
      /^1 дүгээр Оройн даатгал залбирал/,
      /^Талархал/,
    ]
    const cpProse = readProseUntil(lines, i, stopCp)
    if (isLiteral && cpProse.text && !isSeasonalReference(cpProse.text)) {
      result.concludingPrayer = cpProse.text
    }
    i = cpProse.endIdx
  }

  // "Сонголтот залбирал" → alternativeConcludingPrayer
  if (i < lines.length && /^Сонголтот\s+залбирал/.test(lines[i])) {
    i++
    const stopAlt = [
      /^Төгсгөлийг\s+дэг\s+жаягийн/,
      /^1 дүгээр Оройн даатгал залбирал/,
      /^Талархал/,
    ]
    const altProse = readProseUntil(lines, i, stopAlt)
    if (altProse.text) result.alternativeConcludingPrayer = altProse.text
    i = altProse.endIdx
  }

  return { block: result, endIdx: i }
}

function isSeasonalReference(text) {
  if (!text) return true
  return /Цаг\s+улирлын\s+Онцлог\s+шинж/.test(text) || /гэсэн\s+хэсгээс\s+татаж\s+авна/.test(text)
}

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
  [/^1\s+Тесалоник\s+/, '1 Thessalonians '],
  [/^2\s+Тесалоник\s+/, '2 Thessalonians '],
  [/^Тесалоник\s+/, 'Thessalonians '],
  [/^Үйлс\s+/, 'Acts '],
  [/^Дэд\s+хууль\s+/, 'Deuteronomy '],
  [/^Иосиа\s+/, 'Joshua '],
  [/^Исаиа\s+/, 'Isaiah '],
  [/^Иеремиа\s+/, 'Jeremiah '],
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
  const anchors = []
  for (let i = 0; i < lines.length; i++) {
    if (ANCHOR_RE.test(lines[i])) anchors.push(i)
  }
  console.log(`[extract-solemnity-fv] ${anchors.length} total anchors found`)

  // Skip the first 4 (psalter W1-W4 — handled by Phase 2 extractor).
  const nonPsalterAnchors = anchors.slice(4)
  console.log(`[extract-solemnity-fv] ${nonPsalterAnchors.length} non-psalter anchors to process`)

  const entries = []
  for (const a of nonPsalterAnchors) {
    const meta = detectMetadata(lines, a)
    const walk = walkBlock(lines, a)

    // Classify entry
    let key = null
    let category = 'unclassified'
    if (meta.date) {
      key = `${String(meta.date.mm).padStart(2, '0')}-${String(meta.date.dd).padStart(2, '0')}`
      category = meta.rank === 'SOLEMNITY' ? 'fixed_solemnity' : meta.rank === 'FEAST' ? 'fixed_feast' : 'fixed_dated'
    } else if (meta.movableSlug) {
      key = meta.movableSlug
      category = 'movable'
    } else if (meta.isSeasonSunday) {
      // OT Sunday — use name-derived ordinal slug
      key = `otSunday-${(meta.name || 'unknown').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`
      category = 'ot_sunday'
    } else if (meta.seasonContext) {
      key = `${meta.seasonContext}-sunday-generic`
      category = 'season_generic_sunday'
    }

    entries.push({
      anchorLine: a + 1,
      key,
      category,
      meta: { date: meta.date, rank: meta.rank, name: meta.name, seasonContext: meta.seasonContext, isSeasonSunday: meta.isSeasonSunday, movableSlug: meta.movableSlug },
      firstVespers: walk.block,
    })
  }

  // Output: keyed map of fixed-date solemnities/feasts + separate
  // lists for movable and season_generic_sunday entries.
  const out = {
    fixed: {},       // MM-DD → FirstVespersPropers
    movable: {},     // slug → FirstVespersPropers
    seasonGeneric: {}, // seasonContext-sunday-generic → FirstVespersPropers
    otSunday: {},    // key → FirstVespersPropers
    unclassified: [],// raw debug
  }
  for (const e of entries) {
    const target = {
      psalms: e.firstVespers.psalms,
      shortReading: e.firstVespers.shortReading,
      responsory: e.firstVespers.responsory,
      gospelCanticleAntiphon: e.firstVespers.gospelCanticleAntiphon,
      intercessions: e.firstVespers.intercessions,
      concludingPrayer: e.firstVespers.concludingPrayer,
      alternativeConcludingPrayer: e.firstVespers.alternativeConcludingPrayer,
      _meta: { anchorLine: e.anchorLine, rank: e.meta.rank, name: e.meta.name },
    }
    if (e.category === 'fixed_solemnity' || e.category === 'fixed_feast' || e.category === 'fixed_dated') {
      out.fixed[e.key] = target
    } else if (e.category === 'movable') {
      out.movable[e.key] = target
    } else if (e.category === 'ot_sunday') {
      out.otSunday[e.key] = target
    } else if (e.category === 'season_generic_sunday') {
      out.seasonGeneric[e.key] = target
    } else {
      out.unclassified.push({ anchorLine: e.anchorLine, meta: e.meta })
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8')

  // --- summary ---
  console.log(`\n[extract-solemnity-fv] summary:`)
  console.log(`  fixed (MM-DD):         ${Object.keys(out.fixed).length}`)
  console.log(`  movable (name slug):   ${Object.keys(out.movable).length}`)
  console.log(`  season generic Sunday: ${Object.keys(out.seasonGeneric).length}`)
  console.log(`  OT Sundays:            ${Object.keys(out.otSunday).length}`)
  console.log(`  unclassified:          ${out.unclassified.length}`)
  console.log(`\n  Fixed:`)
  for (const k of Object.keys(out.fixed).sort()) {
    const e = out.fixed[k]
    const fields = []
    if (e.psalms && e.psalms.length > 0) fields.push(`psalms=${e.psalms.length}`)
    if (e.shortReading) fields.push('shortReading')
    if (e.responsory) fields.push('responsory')
    if (e.gospelCanticleAntiphon) fields.push('gospelCantAnt')
    if (e.intercessions && e.intercessions.length > 0) fields.push(`interc=${e.intercessions.length}`)
    if (e.concludingPrayer) fields.push('concPrayer')
    if (e.alternativeConcludingPrayer) fields.push('altConcPrayer')
    console.log(`    ${k} (${e._meta.rank || '?'}): ${fields.join(',')} — ${(e._meta.name || '').slice(0,45)}`)
  }
  console.log(`\n  Movable:`)
  for (const k of Object.keys(out.movable).sort()) {
    const e = out.movable[k]
    const fields = []
    if (e.psalms && e.psalms.length > 0) fields.push(`psalms=${e.psalms.length}`)
    if (e.gospelCanticleAntiphon) fields.push('gospelCantAnt')
    if (e.concludingPrayer) fields.push('concPrayer')
    if (e.alternativeConcludingPrayer) fields.push('altConcPrayer')
    console.log(`    ${k}: ${fields.join(',')} — ${(e._meta.name || '').slice(0,45)}`)
  }
  console.log(`\n[extract-solemnity-fv] wrote ${OUT_PATH}`)
}

main()
