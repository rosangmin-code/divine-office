/**
 * responsory-parser.js
 *
 * Parses a Mongolian LOTH responsory block from parsed PDF text into the
 * { fullResponse, versicle, shortResponse } structure.
 *
 * Block structure in the Mongolian LOTH (6 paragraphs):
 *   V1 full response              (leader, no dash — may be omitted)
 *   R1 full response              (people repeat, dashed)
 *   V2 versicle                   (leader)
 *   R2 short response             (people, dashed)
 *   V3 "Эцэг, Хүү, Ариун Сүнсийг магтан дуулъя." (Glory Be)
 *   R3 full response              (people, dashed — repeat of V1)
 *
 * Anchors: Glory Be ("Эцэг,") partitions the block. V1's token count
 * gates R1 wrap-continuation so the first versicle is distinguished from
 * R1's trailing wrap line.
 */

// Stop markers: lines that start with any of these end the responsory block.
// Season-running-header strings live in NOISE_PATTERNS instead — they look like
// section titles but in the PDF appear mid-block as page running headers.
const STOP_MARKERS = [
  'Хариу залбирал',
  'Захариагийн магтаал',
  'Мариагийн магтаал',
  'Сайнмэдээний',
  'Шад магтаал',
  'Шад дуулал',
  'Гуйлтын',
  'Төгсгөлийн',
  'Уншлага',
  'Уншлаг',
  'Ариун ёслолын',
  'Амилалтын Найман',      // in-block seasonal-variant marker — principal form ends here
  'НЯМ ГАРАГ',
  'ДАВАА ГАРАГ',
  'МЯГМАР ГАРАГ',
  'ЛХАГВА ГАРАГ',
  'ПҮРЭВ ГАРАГ',
  'БААСАН ГАРАГ',
  'БЯМБА ГАРАГ',
  'Өглөөний даатгал залбирал',
  'Оройн даатгал залбирал',
  '1 дүгээр Оройн',
  '2 дугаар Оройн',
]

// Noise line patterns: skipped without affecting paragraph boundaries.
const NOISE_PATTERNS = [
  /^\d{1,4}$/,                                          // bare page number
  /^\f+$/,                                              // form-feed only
  /^\d+\s+(дүгээр|дугаар)\s+долоо\s+хоног/i,
  /^\d+\s+\d+\s+(дүгээр|дугаар)\s+долоо\s+хоног/i,     // "56<tab><tab> 1 дүгээр долоо хоног"
  /^(ням|даваа|мягмар|лхагва|пүрэв|баасан|бямба)\s+гараг$/i,
  /^(ням|даваа|мягмар|лхагва|пүрэв|баасан|бямба)\s+гарагийн\s+(өглөө|орой)/i,
  /^\d+\s+(ням|даваа|мягмар|лхагва|пүрэв|баасан|бямба)\s+гараг/i,
  /^Дөчин\s+хоногийн\s+цаг\s+улирал$/i,                 // Lent season running header
  /^Амилалтын\s+улирал$/i,                               // Easter season running header
  /^Ирэлтийн\s+улирал$/i,                                // Advent season running header
  /^Ариун\s+Төрлийн\s+цаг\s+улирал$/i,                  // Christmas season running header
  /^Цаг\s+улирлын\s+Ердийн\s+/i,                         // Ordinary time running header
  /^Мариагийн\s+Бямба\s+гарагийг\s+дурсахуй$/i,          // Saturday Marian memorial header
  /^Эзэний\s+тарчлалтын\s+Ням\s+гараг$/i,                // Palm Sunday running header
  /^Ариун\s+нандин\s+гурван\s+хоног$/i,                  // Sacred Triduum running header
  /^Ариун\s+нандин\s+Долоо\s+хоногийн/i,                 // Holy Week running header
]

function isStopLine(line) {
  return STOP_MARKERS.some((m) => line.startsWith(m))
}

function isNoiseLine(line) {
  return NOISE_PATTERNS.some((p) => p.test(line))
}

function endsWithSentenceTerminator(s) {
  return /[.!?—]\s*$/.test(s)
}

// PDF extractor occasionally emits ".-" where the original had a dash bullet.
function isDashLine(line) {
  return line.startsWith('-') || line.startsWith('.-')
}

function stripDashPrefix(line) {
  return line.replace(/^\.?-\s*/, '')
}

function tokenCount(s) {
  if (!s) return 0
  return s
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

function collapseSpaces(s) {
  return s.replace(/\s+/g, ' ').trim()
}

/**
 * Collect the raw "Хариу залбирал" block lines from `lines[startIdx]`
 * (the header line itself) until the next stop marker.
 */
function collectBlock(lines, startIdx, endLimit = lines.length) {
  const blockLines = []
  let i = startIdx + 1
  while (i < endLimit) {
    const t = lines[i].trim()
    if (t.length === 0) { i++; continue }
    if (isStopLine(t)) break
    if (isNoiseLine(t)) { i++; continue }
    blockLines.push(t)
    i++
  }
  return { blockLines, endIdx: i }
}

function parseResponsory(lines, startIdx, endLimit = lines.length) {
  const { blockLines, endIdx } = collectBlock(lines, startIdx, endLimit)

  const dashIndices = []
  for (let i = 0; i < blockLines.length; i++) {
    if (isDashLine(blockLines[i])) dashIndices.push(i)
  }
  const gloryIdx = blockLines.findIndex((l) => l.startsWith('Эцэг,'))

  if (dashIndices.length === 0) {
    return { fullResponse: '', versicle: '', shortResponse: '', endIdx }
  }

  const v1 = collapseSpaces(blockLines.slice(0, dashIndices[0]).join(' '))

  let r3Start
  if (gloryIdx >= 0) {
    r3Start = dashIndices.find((d) => d > gloryIdx)
  } else {
    r3Start = dashIndices[dashIndices.length - 1]
  }
  let r3 = ''
  if (r3Start !== undefined) {
    r3 = stripDashPrefix(blockLines[r3Start])
    for (let i = r3Start + 1; i < blockLines.length; i++) {
      if (isDashLine(blockLines[i]) || blockLines[i].startsWith('Эцэг,')) break
      r3 += ' ' + blockLines[i]
    }
    r3 = collapseSpaces(r3)
  }

  const fullResponse = v1 || r3
  const targetTokens = tokenCount(fullResponse)

  let r2Start, r2End
  if (gloryIdx >= 0) {
    const dashesBefore = dashIndices.filter((d) => d < gloryIdx)
    if (dashesBefore.length > 0) {
      r2Start = dashesBefore[dashesBefore.length - 1]
      r2End = gloryIdx
    }
  } else if (dashIndices.length >= 2) {
    r2Start = dashIndices[dashIndices.length - 2]
    r2End = r3Start ?? blockLines.length
  }
  let shortResponse = ''
  if (r2Start !== undefined) {
    shortResponse = stripDashPrefix(blockLines[r2Start])
    for (let i = r2Start + 1; i < r2End; i++) {
      if (isDashLine(blockLines[i]) || blockLines[i].startsWith('Эцэг,')) break
      shortResponse += ' ' + blockLines[i]
    }
    shortResponse = collapseSpaces(shortResponse)
  }

  let versicle = ''
  if (r2Start !== undefined) {
    const dashesBeforeR2 = dashIndices.filter((d) => d < r2Start)
    if (dashesBeforeR2.length > 0) {
      const r1FinalDash = dashesBeforeR2[dashesBeforeR2.length - 1]
      let r1 = stripDashPrefix(blockLines[r1FinalDash])
      let k = r1FinalDash + 1
      while (k < r2Start) {
        const cur = blockLines[k]
        if (isDashLine(cur) || cur.startsWith('Эцэг,')) break
        if (targetTokens > 0 && tokenCount(r1) >= targetTokens) break
        r1 += ' ' + cur
        k++
      }
      const v2Parts = []
      for (let m = k; m < r2Start; m++) {
        const cur = blockLines[m]
        if (isDashLine(cur) || cur.startsWith('Эцэг,')) break
        v2Parts.push(cur)
      }
      versicle = collapseSpaces(v2Parts.join(' '))
    }
  }

  return { fullResponse, versicle, shortResponse, endIdx }
}

function indexAllResponsories(fullText) {
  const lines = fullText.split(/\r?\n/)
  const blocks = []
  let currentPage = null
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim()
    if (/^\d{1,4}$/.test(t)) {
      currentPage = parseInt(t, 10)
      continue
    }
    if (t.startsWith('Хариу залбирал')) {
      const parsed = parseResponsory(lines, i)
      blocks.push({
        page: currentPage,
        startLine: i,
        fullResponse: parsed.fullResponse,
        versicle: parsed.versicle,
        shortResponse: parsed.shortResponse,
      })
      i = parsed.endIdx - 1
    }
  }
  return blocks
}

module.exports = {
  STOP_MARKERS,
  isStopLine,
  isNoiseLine,
  endsWithSentenceTerminator,
  tokenCount,
  collectBlock,
  parseResponsory,
  indexAllResponsories,
}
