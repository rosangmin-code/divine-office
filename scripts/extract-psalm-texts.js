#!/usr/bin/env node
/**
 * Extract psalm/canticle body text from parsed_data/weekN/weekN_final.txt
 * and produce src/data/loth/psalter-texts.json.
 *
 * Source: "Four-Week psalter.- 2025.pdf" → parsed_data/
 *
 * Output format:
 * {
 *   "Psalm 5:2-10, 12-13": { "stanzas": [["line1","line2",...], ["line3",...]] },
 *   ...
 * }
 */

const fs = require('fs')
const path = require('path')

const BASE = path.join(__dirname, '..')
const PARSED_DIR = path.join(BASE, 'parsed_data')
const PSALTER_DIR = path.join(BASE, 'src', 'data', 'loth', 'psalter')
const OUTPUT = path.join(BASE, 'src', 'data', 'loth', 'psalter-texts.json')

// ── Noise filters (reused from extract-psalter-commons.js) ──

const SKIP_PATTERNS = [
  /^\d+\s*$/,                        // bare page numbers
  /^\d+\s+долоо хоног/,             // "N долоо хоног" page headers
  /^\d+\s+дүгээр долоо хоног/,      // "N дүгээр долоо хоног"
  /^\d+\s+дугаар долоо хоног/,
  /гарагийн\s+(өглөө|орой)/i,       // "Даваа гарагийн өглөө" etc.
  /^\d+\s+1 дүгээр/,
  /^\d+\s+2 дугаар/,
  /^\d+\s+3 дугаар/,
  /^\d+\s+4 дүгээр/,
]

function isNoiseLine(line) {
  const t = line.trim()
  if (!t) return false  // blank lines are meaningful (stanza breaks)
  return SKIP_PATTERNS.some(p => p.test(t))
}

// ── End markers: lines that signal the psalm body has ended ──

const END_MARKERS = [
  /^Эцэг,?\s*Хүү/,                   // Gloria Patri
  /^Дууллыг төгсгөх залбирал/,       // Concluding psalm prayer
  /^Шад\s+(магтаал|дуулал)/,         // Next antiphon
  /^Дуулал\s+\d/,                     // Next psalm header
  /^Магтаал\b/,                       // Next canticle header (standalone)
  /^Уншлага\b/,                       // Reading header
  /^Богино уншлага/,                  // Short reading
  /^Хариу залбирал/,                 // Responsory
  /^Хариу дуулал/,                   // Responsory
  /^Гуйлтын залбирал/,              // Intercessions
  /^Залбирлын дуудлага/,             // Intercessions
  /^Төгсгөлийн залбирал/,           // Concluding prayer
  /^Урих дуудлага/,                  // Invitatory
  /^Даатгал залбирал/,              // Hour header
]

function isEndMarker(line) {
  const t = line.trim()
  return END_MARKERS.some(p => p.test(t))
}

// ── Reference conversion: "Psalm 5:2-10, 12-13" → "Дуулал 5:2-10, 12-13" ──

// Map English book names to possible Mongolian forms in parsed_data
// Some books have multiple forms (different editions/spellings)
const BOOK_MAP = {
  'Psalm': ['Дуулал'],
  '1 Chronicles': ['1Шастирын дээд', '1 Шастир', '1Шастир'],
  '1 Samuel': ['1 Самуел', '1Самуел'],
  'Colossians': ['Колоссай'],
  'Daniel': ['Даниел'],
  'Deuteronomy': ['Дэд хууль'],
  'Ephesians': ['Ефес'],
  'Exodus': ['Гэтлэл'],
  'Ezekiel': ['Езекиел'],
  'Habakkuk': ['Хабаккук'],
  'Isaiah': ['Исаиа'],
  'Jeremiah': ['Иеремиа'],
  'Judith': ['Иудит'],
  'Philippians': ['Филиппой'],
  'Revelation': ['Илчлэл'],
  'Sirach': ['Сирак', 'Сирах'],
  'Tobit': ['Тобит'],
  'Wisdom': ['Мэргэн ухаан'],
  '1 Peter': ['1 Петр', '1Петр'],
  '1 Timothy': ['1 Тимот', '1Тимот'],
  'Romans': ['Ром'],
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Extract book name and chapter number from an English reference.
 * Returns all possible Mongolian book names for matching.
 */
function parseRefKey(ref) {
  for (const [eng, mnVariants] of Object.entries(BOOK_MAP)) {
    if (ref.startsWith(eng + ' ')) {
      const rest = ref.slice(eng.length + 1)
      const chapter = parseInt(rest.split(':')[0], 10)
      return { bookMnVariants: mnVariants, chapter }
    }
  }
  return null
}

/**
 * Build regexes to find a psalm/canticle header in parsed_data.
 * Handles variations:
 *   "Дуулал 110:1-5,7" or "Дуулал 110" or "Дуулал 19А"
 *   "1Шастирын дээд 29:10-13"
 */
function buildHeaderRegexes(bookMnVariants, chapter) {
  return bookMnVariants.map(mn => {
    // Match: bookMn + optional space + chapter number + optional suffix (А, Б, etc.)
    return new RegExp(`^${escapeRegex(mn)}\\s*${chapter}(?:[АБВабв])?(?:\\s*:|\\s*$|[^0-9])`)
  })
}

// ── Collect all psalm refs from psalter JSONs ──

function collectAllRefs() {
  const refs = []
  for (let w = 1; w <= 4; w++) {
    const weekFile = path.join(PSALTER_DIR, `week-${w}.json`)
    if (!fs.existsSync(weekFile)) continue
    const data = JSON.parse(fs.readFileSync(weekFile, 'utf-8'))
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
    const hours = ['officeOfReadings', 'lauds', 'terce', 'sext', 'none', 'vespers']

    for (const day of days) {
      if (!data.days[day]) continue
      for (const hour of hours) {
        if (!data.days[day][hour]) continue
        for (const psalm of data.days[day][hour].psalms) {
          refs.push({
            ref: psalm.ref,
            title: psalm.title || '',
            week: w,
            day,
            hour,
          })
        }
      }
    }
  }
  return refs
}

// ── Load parsed_data files ──

function loadWeekText(week) {
  const finalFile = path.join(PARSED_DIR, `week${week}`, `week${week}_final.txt`)
  if (fs.existsSync(finalFile)) {
    return fs.readFileSync(finalFile, 'utf-8')
  }
  // Fallback: concatenate individual day files
  const dayFiles = ['1-Sunday', '1-Monday', '1-Tuesday', '1-Wednesday', '1-Thursday', '1-Friday', '1-Saturday']
    .map(d => d.replace('1-', `${week}-`))
  let text = ''
  for (const d of dayFiles) {
    const f = path.join(PARSED_DIR, `week${week}`, `${d}.txt`)
    if (fs.existsSync(f)) text += fs.readFileSync(f, 'utf-8') + '\n'
  }
  return text
}

// ── Extract psalm body from text at a given position ──

function extractPsalmBody(lines, headerIdx, title) {
  // Skip header line
  let i = headerIdx + 1

  // Skip title line(s): match against known title from psalter JSON
  if (title) {
    const titleNorm = title.replace(/\s+/g, ' ').trim().toLowerCase()
    let titleBuffer = ''
    const titleStart = i
    while (i < lines.length && i < titleStart + 6) {
      const lineTrim = lines[i].trim()
      if (!lineTrim) { i++; continue }
      if (isNoiseLine(lines[i])) { i++; continue }
      titleBuffer += (titleBuffer ? ' ' : '') + lineTrim
      i++
      if (titleBuffer.toLowerCase().includes(titleNorm) ||
          titleNorm.includes(titleBuffer.toLowerCase())) {
        if (titleBuffer.length >= titleNorm.length * 0.8) break
      }
    }
    // If title matching failed, just skip the first non-empty line as title
    if (!titleBuffer) {
      i = titleStart
      while (i < lines.length && !lines[i].trim()) i++
      i++ // skip one title line
    }
  }

  // Skip epigraph: scan ahead for lines ending with closing parenthesis
  // Pattern: epigraph ends with (Гэгээн ...), (1 Коринт 15:25), (Илчлэл 8:4). etc.
  const epigraphEnd = skipEpigraph(lines, i)
  i = epigraphEnd

  // Collect psalm body lines until end marker
  const bodyLines = []
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // End markers
    if (isEndMarker(trimmed)) break

    // Skip noise
    if (isNoiseLine(line)) { i++; continue }

    // Keep the line (even blank lines for stanza detection)
    bodyLines.push(trimmed)
    i++
  }

  // Group into stanzas by blank lines
  const stanzas = []
  let currentStanza = []
  for (const line of bodyLines) {
    if (line === '') {
      if (currentStanza.length > 0) {
        stanzas.push(currentStanza)
        currentStanza = []
      }
    } else {
      currentStanza.push(line)
    }
  }
  if (currentStanza.length > 0) {
    stanzas.push(currentStanza)
  }

  return stanzas
}

/**
 * Skip epigraph lines after the title.
 * Epigraphs are patristic/biblical quotes ending with parenthetical references:
 *   (Гэгээн Августин), (1 Коринт 15:25), (Илчлэл 8:4). etc.
 *
 * Strategy: scan ahead up to 8 non-empty lines looking for a line ending with `)`/`).`
 * If found, skip everything up to and including that line.
 * If not found within the window, assume no epigraph.
 */
function skipEpigraph(lines, startIdx) {
  let scanned = 0
  for (let i = startIdx; i < lines.length && scanned < 8; i++) {
    const trimmed = lines[i].trim()
    if (!trimmed || isNoiseLine(lines[i])) continue
    scanned++

    // Check if this line ends with a closing parenthesis (epigraph reference end)
    if (/\)\s*\.?\s*$/.test(trimmed)) {
      return i + 1 // skip past the epigraph
    }
  }

  return startIdx // no epigraph found
}

// ── Main ──

function main() {
  console.log('Collecting psalm references from psalter JSONs...')
  const allRefs = collectAllRefs()
  console.log(`Found ${allRefs.length} psalm entries across 4 weeks`)

  // Deduplicate by ref (same psalm can appear in multiple weeks/days)
  const uniqueRefs = new Map()
  for (const r of allRefs) {
    if (!uniqueRefs.has(r.ref)) {
      uniqueRefs.set(r.ref, r)
    }
  }
  console.log(`${uniqueRefs.size} unique psalm references`)

  // Load all week texts
  const weekTexts = {}
  for (let w = 1; w <= 4; w++) {
    weekTexts[w] = loadWeekText(w)
  }

  // Extract psalm texts
  const result = {}
  let found = 0
  let notFound = 0

  // Pre-split all week texts into lines
  const weekLines = {}
  for (let w = 1; w <= 4; w++) {
    weekLines[w] = weekTexts[w] ? weekTexts[w].split('\n') : []
  }

  for (const [ref, info] of uniqueRefs) {
    const parsed = parseRefKey(ref)
    if (!parsed) {
      console.warn(`  SKIP (unknown book): ${ref}`)
      notFound++
      continue
    }

    const { bookMnVariants, chapter } = parsed
    const headerRegexes = buildHeaderRegexes(bookMnVariants, chapter)
    let extracted = false

    // Search across all weeks (psalm might appear in a different week than expected)
    for (let w = 1; w <= 4; w++) {
      const lines = weekLines[w]
      if (!lines.length) continue

      // Find ALL matching headers (same psalm chapter might appear multiple times)
      for (let idx = 0; idx < lines.length; idx++) {
        const t = lines[idx].trim()
        if (!headerRegexes.some(re => re.test(t))) continue
        // Skip lines that are clearly not psalm headers (e.g., references within epigraphs)
        if (t.includes('нь урих дуудлагын')) continue
        if (t.includes('нь х.')) continue

        const stanzas = extractPsalmBody(lines, idx, info.title)
        if (stanzas.length > 0 && stanzas.some(s => s.length > 0)) {
          result[ref] = { stanzas }
          found++
          extracted = true
          break
        }
      }
      if (extracted) break
    }

    if (!extracted) {
      console.warn(`  NOT FOUND: ${ref} → ${bookMnVariants[0]} ${chapter}`)
      notFound++
    }
  }

  console.log(`\nResults: ${found} found, ${notFound} not found out of ${uniqueRefs.size}`)

  // Write output
  fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2), 'utf-8')
  console.log(`Written to ${OUTPUT}`)

  // Print sample
  const sampleRef = 'Psalm 5:2-10, 12-13'
  if (result[sampleRef]) {
    console.log(`\nSample: ${sampleRef}`)
    console.log(`  Stanzas: ${result[sampleRef].stanzas.length}`)
    for (let si = 0; si < result[sampleRef].stanzas.length; si++) {
      console.log(`  Stanza ${si + 1} (${result[sampleRef].stanzas[si].length} lines):`)
      for (const line of result[sampleRef].stanzas[si].slice(0, 3)) {
        console.log(`    ${line}`)
      }
      if (result[sampleRef].stanzas[si].length > 3) console.log(`    ...`)
    }
  }
}

main()
