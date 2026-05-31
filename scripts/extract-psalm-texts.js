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
 *
 * KNOWN LIMITATION (task #42 audit) — the weekN_final.txt column-split
 * output can shift a previous psalm's Gloria/prayer tail INTO the next
 * psalm's entry (D1 entry-shift pattern), or shuffle stanza order
 * across PDF page breaks. 4 entries were identified and repaired with
 * `scripts/repair-d1-psalter-entries.js` (canonical full_pdf.txt
 * source). If those 4 entries regress on a future regenerate, re-apply
 * the repair script — don't re-run this extractor as a full overwrite.
 *
 * Affected refs (see docs/task-40-psalter-texts-reconciliation.md):
 *   Psalm 116:1-9  (prayer was swallowed by Psalm 121)
 *   Psalm 121:1-8  (body picked up Psalm 116 tail)
 *   Psalm 97:1-12  (stanza order shuffled by column split)
 *   Psalm 51:3-19  (stanza order shuffled + declared page wrong)
 *   Psalm 139:23-24 (body confused by Part I/II split)
 *   Psalm 139:1-18 (psalm-prayer missing, shared with 23-24)
 */

const fs = require('fs')
const path = require('path')

const BASE = path.join(__dirname, '..')
const PARSED_DIR = path.join(BASE, 'parsed_data')
const PSALTER_DIR = path.join(BASE, 'src', 'data', 'loth', 'psalter')
const OUTPUT = path.join(BASE, 'src', 'data', 'loth', 'psalter-texts.json')

// GOAL #105 (spec §A C1/C3) — sentence-terminal set for the psalm-prayer
// completeness gate: a period/exclamation/question/ellipsis, optionally
// followed by a closing paren or right quote. A trailing comma (or no
// terminator) is treated as INCOMPLETE (a page-break wrap continuation).
const PRAYER_TERMINAL_RE = /[.!?…][)”»]*\s*$/

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
  /^Магтаал(?:\s|$)/,                 // Next canticle header (standalone)
  /^Уншлага(?:\s|$)/,                 // Reading header
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

/**
 * Merge PDF column-wrap continuations into the previous line.
 *
 * The Mongolian psalter PDF uses a narrow column, so a single hemistich often
 * gets visually wrapped onto two lines. The continuation always starts with a
 * lowercase Cyrillic character, because in Mongolian Cyrillic every new
 * hemistich/sentence starts with an uppercase letter. So a lowercase-initial
 * line is a wrap continuation and should be joined to the previous line with
 * a single space.
 *
 *   Before:  ["Ам минь баясгалант уруулаар магтаалуудыг,", "өргөнө."]
 *   After:   ["Ам минь баясгалант уруулаар магтаалуудыг, өргөнө."]
 */
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

/**
 * Cross-stanza wrap merge: if a stanza's first line starts with a lowercase
 * Cyrillic letter, the apparent stanza break was actually a spurious PDF
 * blank line in the middle of a wrap. Glue the orphan into the previous
 * stanza's last line.
 */
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
      out.push(stanza)
    }
  }
  return out
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
 * Extract book name, chapter number, and starting verse from an English reference.
 * "Psalm 119:9-16"  → { chapter: 119, verseStart: 9 }
 * "Psalm 119:25-32" → { chapter: 119, verseStart: 25 }
 * "Daniel 3:57-88, 56" → { chapter: 3, verseStart: 57 }
 */
function parseRefKey(ref) {
  for (const [eng, mnVariants] of Object.entries(BOOK_MAP)) {
    if (ref.startsWith(eng + ' ')) {
      const rest = ref.slice(eng.length + 1)
      const [chapterStr, versesStr] = rest.split(':')
      const chapter = parseInt(chapterStr, 10)
      let verseStart = null
      if (versesStr) {
        const m = versesStr.match(/^(\d+)/)
        if (m) verseStart = parseInt(m[1], 10)
      }
      return { bookMnVariants: mnVariants, chapter, verseStart }
    }
  }
  return null
}

/**
 * Build regexes to find a psalm/canticle header in parsed_data.
 * Handles variations:
 *   "Дуулал 110:1-5,7" or "Дуулал 110" or "Дуулал 19А"
 *   "1Шастирын дээд 29:10-13"
 *
 * Returns an ordered list: precise (chapter + verseStart) regexes first, then
 * chapter-only fallbacks. Caller tries them in order.
 */
function buildHeaderRegexes(bookMnVariants, chapter, verseStart) {
  const precise = []
  const fallback = []
  for (const mn of bookMnVariants) {
    const book = escapeRegex(mn)
    if (verseStart != null) {
      // "Дуулал 119:9" or "Дуулал 119: 9-16" — verseStart must be the first
      // number after the colon, followed by a non-digit (-, , or end).
      precise.push(new RegExp(`^${book}\\s*${chapter}(?:[АБВабв])?\\s*:\\s*${verseStart}(?:[^0-9]|$)`))
    }
    // Chapter-only fallback for headers that represent the WHOLE psalm
    // ("Дуулал 11", "Дуулал 100", "Дуулал 19А"). Critically, must NOT match
    // sub-section headers like "Дуулал 119:145-152" — otherwise every
    // sub-range of Psalm 119 inherits the wrong body.
    fallback.push(new RegExp(`^${book}\\s*${chapter}(?:[АБВабв])?(?:\\s*$|[^0-9:])`))
  }
  return { precise, fallback }
}

/**
 * Detect any psalm/canticle header line — used as a "next section" stop marker
 * when extracting a body, so we don't bleed into the following psalm.
 */
const ANY_PSALM_HEADER_RE = /^Дуулал\s*\d/
const ANY_CANTICLE_HEADER_RE = /^Магтаал(?:\s|$)/

// ── Collect all psalm refs from psalter JSONs ──

function collectAllRefs() {
  const refs = []
  for (let w = 1; w <= 4; w++) {
    const weekFile = path.join(PSALTER_DIR, `week-${w}.json`)
    if (!fs.existsSync(weekFile)) continue
    const data = JSON.parse(fs.readFileSync(weekFile, 'utf-8'))
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
    const hours = ['lauds', 'vespers']

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

// ── GOAL #130 — Psalm 63 Lauds caption reposition (ref-keyed body skip) ──
//
// The Psalm 63:2-9 header carries a 2-line caption that, UNLIKE the patristic /
// NT epigraphs handled by `skipEpigraph`, ends with NO parenthetical citation —
// so `skipEpigraph` leaves it in the body and it lands as the psalm's first
// stanza. This skip removes it from the body, keyed EXACTLY on the canonical
// `ref` AND the two verbatim source lines. It is deliberately NOT a shape-only
// heuristic (e.g. "two unindented lines then indented body"): such a heuristic
// would corrupt the legitimate body starts of `Revelation 19:1-7` (`Аллэлуяа!`)
// and `Psalm 139:1-18` (`I`), whose first lines share that shape but are genuine
// body text. The caption is preserved as an `uncited_caption` entry in
// `psalter-headers.rich.json` and rendered after the psalm title.
// See docs/research/GOAL130-spec.md §1 and the mental model §C1.
const PSALM63_CAPTION_REF = 'Psalm 63:2-9'
const PSALM63_CAPTION_LINES = [
  'Гэм нүглийн харанхуйгаас салсан хэнбугай ч',
  'Тэнгэрбурханыг хүсэн тэмүүлнэ.',
]

function skipPsalm63Caption(lines, startIdx, ref) {
  if (ref !== PSALM63_CAPTION_REF) return startIdx
  // Collect the next `PSALM63_CAPTION_LINES.length` meaningful source lines
  // (non-blank, non-noise) and require an exact, in-order match.
  const seen = []
  let i = startIdx
  while (i < lines.length && seen.length < PSALM63_CAPTION_LINES.length) {
    const trimmed = lines[i].trim()
    if (!trimmed || isNoiseLine(lines[i])) { i++; continue }
    seen.push({ idx: i, text: trimmed })
    i++
  }
  if (seen.length < PSALM63_CAPTION_LINES.length) return startIdx
  const exact = seen.every((s, k) => s.text === PSALM63_CAPTION_LINES[k])
  if (!exact) return startIdx
  // Advance to just past the last matched caption line.
  return seen[seen.length - 1].idx + 1
}

// ── Extract psalm body from text at a given position ──

function extractPsalmBody(lines, headerIdx, title, ownHeaderRegexes = [], ref = null) {
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

  // GOAL #130: drop the Psalm 63 post-title caption from the body (ref-keyed,
  // exact-text). NOP for every other ref — see `skipPsalm63Caption` above.
  i = skipPsalm63Caption(lines, i, ref)

  // Collect psalm body lines until end marker or next psalm/canticle header
  const bodyLines = []
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // End markers (Gloria Patri, next antiphon, reading header, etc.)
    if (isEndMarker(trimmed)) break

    // Next psalm/canticle header — stop so we don't bleed into the following
    // section. ownHeaderRegexes lets the caller's own header re-appear (e.g. a
    // duplicate header in the parsed text) without prematurely stopping; any
    // OTHER psalm/canticle header is a hard stop.
    if (i > headerIdx && (ANY_PSALM_HEADER_RE.test(trimmed) || ANY_CANTICLE_HEADER_RE.test(trimmed))) {
      const isOwnHeader = ownHeaderRegexes.some(re => re.test(trimmed))
      if (!isOwnHeader) break
    }

    // Skip noise
    if (isNoiseLine(line)) { i++; continue }

    // Keep the line (even blank lines for stanza detection)
    bodyLines.push(trimmed)
    i++
  }

  // Group into stanzas by blank lines, then merge PDF column-wrap continuations.
  const stanzas = []
  let currentStanza = []
  for (const line of bodyLines) {
    if (line === '') {
      if (currentStanza.length > 0) {
        stanzas.push(mergeColumnWraps(currentStanza))
        currentStanza = []
      }
    } else {
      currentStanza.push(line)
    }
  }
  if (currentStanza.length > 0) {
    stanzas.push(mergeColumnWraps(currentStanza))
  }

  return { stanzas: mergeAcrossStanzaBoundaries(stanzas), endIdx: i }
}

/**
 * Extract the psalm-concluding prayer (Дууллыг төгсгөх залбирал) that follows
 * a psalm body. Scans forward from `startIdx` within a small window to locate
 * the marker; then collects lines until the next end marker / next section
 * header, applies column-wrap merge, and joins into a single paragraph.
 *
 * Returns the prayer as a single string, or null if no prayer is found.
 */
/**
 * @param {string[]} lines
 * @param {number} startIdx
 * @param {(entry: {line: number, tailRaw: string, nextHead: string}) => void} [onNeedsReview]
 *   GOAL #105 (spec §A C4 / §D.2): invoked when the prayer collected so far is
 *   already TERMINAL but the next meaningful line is a non-marker — i.e. the
 *   prayer STOPs without absorbing, but the boundary is flagged for review so a
 *   future genuine complete-sentence-then-continuation case cannot silently
 *   truncate. `line` is the 1-based marker line; the caller annotates `week`.
 */
function extractPsalmPrayer(lines, startIdx, onNeedsReview) {
  const PRAYER_MARKER = /^Дууллыг төгсгөх залбирал/
  const SEARCH_WINDOW = 40

  let markerIdx = -1
  for (let i = startIdx; i < lines.length && i < startIdx + SEARCH_WINDOW; i++) {
    const t = lines[i].trim()
    if (PRAYER_MARKER.test(t)) { markerIdx = i; break }
    // Stop scanning if we hit a header for the next psalm/canticle.
    if (ANY_PSALM_HEADER_RE.test(t) || ANY_CANTICLE_HEADER_RE.test(t)) return null
  }
  if (markerIdx === -1) return null

  const prayerLines = []
  let sawContent = false
  let i = markerIdx + 1
  while (i < lines.length) {
    const line = lines[i]
    const t = line.trim()

    if (!t) {
      if (!sawContent) { i++; continue }
      // After content: a blank usually means a new rubric/section follows.
      // BUT the PDF has page breaks that split a single prayer paragraph
      // across pages — blank + page-number/header + blank + continuation.
      // Peek past the blank/noise block to the next meaningful line.
      let j = i + 1
      while (j < lines.length) {
        const tj = lines[j].trim()
        if (!tj || isNoiseLine(lines[j])) { j++; continue }
        break
      }
      if (j >= lines.length) break
      const next = lines[j].trim()
      // (1) Hard guards FIRST — an end-marker / next-section header always stops
      // the prayer, regardless of completeness (GOAL #105 spec §A C2).
      if (isEndMarker(next) || ANY_PSALM_HEADER_RE.test(next) || ANY_CANTICLE_HEADER_RE.test(next)) break
      // (2) Completeness gate (GOAL #105 spec §A C1) — REPLACES the former
      // lowercase-only case gate `if (!/^[а-яёөү]/.test(next)) break`. Decide by
      // the completeness of the text collected SO FAR, not the case of `next`:
      //   - collected ends INCOMPLETE (comma / no sentence-terminal) → this is a
      //     page-break wrap continuation → ABSORB (keep collecting), even when
      //     `next` starts with an uppercase letter (e.g. Psalm 114 "Та ус ба...").
      //   - collected ends TERMINAL (. ! ? … + optional closing ) ” ») → the
      //     prayer is complete → STOP. Because `next` is a non-marker here, flag
      //     it NEEDS_REVIEW (spec §A C4 — neither silently trust nor absorb).
      const lastCollected = prayerLines.length
        ? prayerLines[prayerLines.length - 1].trim()
        : ''
      if (PRAYER_TERMINAL_RE.test(lastCollected)) {
        if (typeof onNeedsReview === 'function') {
          onNeedsReview({
            line: markerIdx + 1,
            tailRaw: lastCollected.slice(-40),
            nextHead: next.slice(0, 40),
          })
        }
        break
      }
      // incomplete → absorb the continuation
      i = j
      continue
    }

    if (isEndMarker(t)) break
    if (ANY_PSALM_HEADER_RE.test(t) || ANY_CANTICLE_HEADER_RE.test(t)) break
    if (isNoiseLine(line)) { i++; continue }
    prayerLines.push(t)
    sawContent = true
    i++
  }

  if (prayerLines.length === 0) return null

  return mergeColumnWraps(prayerLines).join(' ').trim()
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
  let prayersFound = 0

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

    const { bookMnVariants, chapter, verseStart } = parsed
    const { precise, fallback } = buildHeaderRegexes(bookMnVariants, chapter, verseStart)
    let extracted = false

    // Try precise (chapter + verseStart) first. If no precise header is found
    // anywhere, fall back to chapter-only — but the fallback regex excludes
    // sub-section headers (anything with `:`), so it only matches whole-psalm
    // headers like "Дуулал 11" or "Дуулал 100".
    const passes = precise.length > 0 ? [precise, fallback] : [fallback]

    for (const headerRegexes of passes) {
      if (extracted) break
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

          const { stanzas, endIdx } = extractPsalmBody(lines, idx, info.title, headerRegexes, ref)
          if (stanzas.length > 0 && stanzas.some(s => s.length > 0)) {
            const entry = { stanzas }
            const prayer = extractPsalmPrayer(lines, endIdx)
            if (prayer) entry.psalmPrayer = prayer
            result[ref] = entry
            found++
            if (prayer) prayersFound++
            extracted = true
            break
          }
        }
        if (extracted) break
      }
    }

    if (!extracted) {
      console.warn(`  NOT FOUND: ${ref} → ${bookMnVariants[0]} ${chapter}`)
      notFound++
    }
  }

  console.log(`\nResults: ${found} found, ${notFound} not found out of ${uniqueRefs.size}`)
  console.log(`Psalm prayers: ${prayersFound} attached`)

  // Write output
  fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2), 'utf-8')
  console.log(`Written to ${OUTPUT}`)
  // NOTE (GOAL #105): the NEEDS_REVIEW baseline (spec §D.2) is produced by the
  // dedicated 102-marker sweep `scripts/build-psalmprayer-needs-review.mjs`, NOT
  // here — main() is ref-based + de-duped, so it misses markers (e.g. week3:644)
  // and would emit an incomplete 3/4 baseline. main() also performs a full
  // re-extraction that is NON-idempotent against the curated psalter-texts.json
  // (see header L14-28); the surgical applier is the data path, not this.

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

// GOAL #105 (spec §C7a) — export extractPsalmPrayer for direct unit testing and
// guard main() so `require()` does NOT trigger a full re-extraction (which would
// overwrite psalter-texts.json as a side effect of import).
module.exports = { extractPsalmPrayer, PRAYER_TERMINAL_RE }

if (require.main === module) main()
