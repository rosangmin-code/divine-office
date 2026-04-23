#!/usr/bin/env node
/**
 * extract-psalter-pilot.mjs — Stage 3a pilot body-text extractor.
 *
 * Scope: the three psalms/canticles on Week 1 Sunday Lauds only:
 *   Psalm 63:2-9    (book p. 58)
 *   Daniel 3:57-88, 56 (book p. 60)  — canticle with refrain structure
 *   Psalm 149:1-9   (book p. 64)
 *
 * Pipeline:
 *   1. Run `pdftotext -layout` over the three physical pages that host these
 *      book pages (and the two following, so bodies that spill onto the next
 *      book page are captured).
 *   2. Split every physical page into left/right book-page columns with
 *      scripts/parsers/pdftotext-column-splitter.mjs (no merge heuristics).
 *   3. For each pilot ref, walk the book-page-ordered line stream forward
 *      from the declared book page, match the psalm header, then collect
 *      body lines until the next psalm header / concluding-prayer marker /
 *      Gloria Patri.
 *   4. Stanzas are derived from blank lines only. No cross-stanza merges.
 *   5. Indent is encoded as a leading integer count of spaces ÷ 2.
 *
 * Output: `src/data/loth/psalter-texts.pilot.json` — NEVER writes to
 * `psalter-texts.json`. The pilot JSON is a side-car for diff review.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { splitColumns } from './parsers/pdftotext-column-splitter.mjs'
import { bookPageToPhysical, selfVerify } from './parsers/book-page-mapper.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '..')
const PDF_PATH = resolve(REPO_ROOT, 'public', 'psalter.pdf')
const FULLTEXT_PATH = resolve(REPO_ROOT, 'scripts', 'out', 'psalter-fulltext.txt')
const OUTPUT_PATH = resolve(REPO_ROOT, 'src', 'data', 'loth', 'psalter-texts.pilot.json')

// ── Pilot set ────────────────────────────────────────────────────────────

const PILOT_REFS = [
  { ref: 'Psalm 63:2-9', bookPage: 58, title: 'Тэнгэрбурханаар цангаж буй сэтгэл', headerRegex: /^\s*Дуулал\s*63\s*(?::|$)/ },
  { ref: 'Daniel 3:57-88, 56', bookPage: 60, title: 'Эзэний хамаг бүтээлүүд ээ, Эзэнийг магтагтун', headerRegex: /Даниел\s*3\s*:\s*57/ },
  { ref: 'Psalm 149:1-9', bookPage: 64, title: 'Тэнгэрбурханы ариун ард түмний баяр хөөр', headerRegex: /^\s*Дуулал\s*149\b/ },
]

// ── End markers (page-local; NEVER cross-book) ──────────────────────────
//
// The only markers we use are hard structural ones that every psalm body
// shares. Any heuristic that tries to *merge* across these is explicitly
// out of scope for Stage 3a (see docs/PRD Stage 3a).
const END_MARKERS = [
  // Gloria Patri — always starts "Эцэг, Хүү, Ариун Сүнсэнд" (dative case).
  // The Daniel canticle's own last verse begins "Эцэг, Хүү, Ариун Сүнсийг"
  // (accusative case) and is NOT an end-marker — it belongs to the body.
  /^\s*Эцэг, Хүү, Ариун Сүнсэнд/,
  // Rubric preceding the next antiphon in the Daniel 3 canticle: tells the
  // reader NOT to recite the Gloria Patri here. Page-local; always ends the
  // canticle body.
  /^\s*Энэ магтаалын төгсгөл/,
  /^\s*Дууллыг төгсгөх залбирал/, // Concluding psalm prayer header
  /^\s*Шад магтаал/, // Next antiphon (psalm)
  /^\s*Шад дуулал/, // Next antiphon (canticle variant)
  /^\s*Дуулал\s*\d/, // Next psalm header
  /^\s*Магтаал\b/, // Next canticle header
  /^\s*Уншлага\b/, // Reading header
  /^\s*Богино уншлага/, // Short reading
  /^\s*Хариу залбирал/, // Responsory
]

function isEndMarker(line) {
  const trimmed = line.trim()
  if (!trimmed) return false
  return END_MARKERS.some((re) => re.test(trimmed))
}

// ── pdftotext runner ─────────────────────────────────────────────────────

/**
 * Run `pdftotext -layout` over a page range and persist the result. Cached
 * on disk — re-running the pilot over the same PDF reuses the cached file.
 *
 * @param {number} firstPhysical - first physical page (inclusive)
 * @param {number} lastPhysical  - last physical page (inclusive)
 * @returns {string} - decoded UTF-8 content
 */
function runPdftotext(firstPhysical, lastPhysical) {
  const outDir = dirname(FULLTEXT_PATH)
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
  console.log(
    `[pilot] pdftotext -layout -f ${firstPhysical} -l ${lastPhysical} ${PDF_PATH} -> ${FULLTEXT_PATH}`,
  )
  execFileSync(
    'pdftotext',
    [
      '-layout',
      '-f',
      String(firstPhysical),
      '-l',
      String(lastPhysical),
      PDF_PATH,
      FULLTEXT_PATH,
    ],
    { stdio: 'inherit' },
  )
  return readFileSync(FULLTEXT_PATH, 'utf-8')
}

// ── Body extraction ──────────────────────────────────────────────────────

/**
 * Given an array of { bookPage, column, lines } streams in book order, find
 * the header for a pilot ref and collect its body. Returns
 * `{ stanzas: string[][] }` where each stanza is an array of indent-encoded
 * lines. `stanzas` may be empty if nothing matched.
 *
 * Body lines keep the leading-space indent from pdftotext, but we normalise
 * `indent = Math.floor(leadingSpaces / 2)` for structured storage. The
 * encoded shape matches what the existing JSON already uses: lines are just
 * strings with leading spaces acting as visual indent (the psalm-block
 * renderer turns them into `mn-l-*` classes).
 */
function extractBody(streams, ref, bookPage, headerRegex, title) {
  // Find the starting stream for this book page.
  const startIdx = streams.findIndex((s) => s.bookPage === bookPage)
  if (startIdx < 0) {
    throw new Error(`extractBody(${ref}): bookPage ${bookPage} not present in streams`)
  }

  // Flatten forward: everything from bookPage onwards. Keep per-line metadata.
  const flat = []
  for (let i = startIdx; i < streams.length; i++) {
    const { bookPage: bp, column, lines } = streams[i]
    for (let j = 0; j < lines.length; j++) {
      flat.push({ bookPage: bp, column, line: lines[j] })
    }
  }

  // Locate the header line.
  let headerIdx = -1
  for (let i = 0; i < flat.length; i++) {
    if (headerRegex.test(flat[i].line)) {
      headerIdx = i
      break
    }
  }
  if (headerIdx < 0) {
    console.warn(`[pilot] header not found for ${ref} (searched ${flat.length} lines)`)
    return { stanzas: [], bodyStartBookPage: null, bodyEndBookPage: null, headerFound: false }
  }

  // After the header we typically see 1..2 lines of title/epigraph. Skip
  // lines until either (a) we've consumed the title (by substring match) or
  // (b) we've hit 6 non-blank lines without matching (safety).
  let i = headerIdx + 1
  if (title) {
    const needle = title.replace(/\s+/g, ' ').trim()
    let skipped = 0
    while (i < flat.length && skipped < 6) {
      const t = flat[i].line.trim()
      if (!t) {
        i++
        continue
      }
      skipped++
      // Substring match either direction — title may be split across lines
      // in some PDFs.
      if (t.includes(needle.slice(0, Math.min(needle.length, 20))) || needle.includes(t.slice(0, 20))) {
        i++
        // If title spans next line, skip it too.
        if (i < flat.length && flat[i].line.trim() && needle.length > 40) {
          const t2 = flat[i].line.trim()
          if (needle.includes(t2) || t2.includes(needle.slice(20, 40))) i++
        }
        break
      }
      i++
    }
  }

  // Skip epigraph: lines up to and including one that ends with `)` (with
  // optional period) within the next 8 non-empty lines.
  let scanned = 0
  let j = i
  while (j < flat.length && scanned < 8) {
    const t = flat[j].line.trim()
    if (!t) {
      j++
      continue
    }
    scanned++
    if (/\)\s*\.?\s*$/.test(t)) {
      i = j + 1
      break
    }
    j++
  }

  // Collect body. Keep indent-preserved `line` strings; blank-line separators
  // produce stanza breaks.
  const bodyLines = []
  let bodyStartBookPage = null
  let bodyEndBookPage = null
  while (i < flat.length) {
    const { line, bookPage: bp } = flat[i]
    const trimmed = line.trim()

    if (isEndMarker(line)) break

    // Skip running-header / page-number noise: lines like "58  1 дүгээр долоо хоног  Ням гарагийн өглөө  59".
    // These typically only appear on the first line of a left-column stream
    // (the page-number header). Blank lines between pages are meaningful
    // stanza breaks though — only suppress actual noise patterns.
    if (
      /^\d+\s*$/.test(trimmed) ||
      /^\d+\s+[\s\S]*долоо хоног/.test(trimmed) ||
      /гарагийн\s+(өглөө|орой)/i.test(trimmed)
    ) {
      i++
      continue
    }

    if (trimmed === '') {
      bodyLines.push('') // stanza separator
      i++
      continue
    }

    if (bodyStartBookPage === null) bodyStartBookPage = bp
    bodyEndBookPage = bp
    bodyLines.push(line.replace(/\s+$/, '')) // drop trailing spaces only
    i++
  }

  // Group into stanzas by blank lines. No cross-stanza merge.
  const stanzas = []
  let current = []
  for (const l of bodyLines) {
    if (l === '') {
      if (current.length > 0) {
        stanzas.push(current)
        current = []
      }
    } else {
      current.push(l)
    }
  }
  if (current.length > 0) stanzas.push(current)

  return {
    stanzas,
    bodyStartBookPage,
    bodyEndBookPage,
    headerFound: true,
  }
}

// ── Main ─────────────────────────────────────────────────────────────────

function main() {
  const verify = selfVerify()
  if (!verify.ok) {
    console.error('[pilot] book-page mapper self-verify FAILED:', verify.failures)
    process.exit(1)
  }
  console.log('[pilot] book-page mapper self-verify ok')

  if (!existsSync(PDF_PATH)) {
    console.error(`[pilot] PDF not found: ${PDF_PATH}`)
    process.exit(1)
  }

  // Determine physical page range: take the min declared book page, the max
  // declared book page + 1 (spill), and map to physical pages. For the pilot
  // set (books 58, 60, 64) that's physical 30..33, which covers bodies that
  // might continue onto the right half of the same spread.
  const bookPages = PILOT_REFS.map((r) => r.bookPage)
  const minBook = Math.min(...bookPages)
  const maxBook = Math.max(...bookPages) + 1 // allow spill
  const firstPhysical = bookPageToPhysical(minBook).physical
  const lastPhysical = bookPageToPhysical(maxBook).physical
  console.log(
    `[pilot] book ${minBook}..${maxBook} -> physical ${firstPhysical}..${lastPhysical}`,
  )

  const content = runPdftotext(firstPhysical, lastPhysical)
  const physicalPages = []
  for (let p = firstPhysical; p <= lastPhysical; p++) physicalPages.push(p)
  const streams = splitColumns(content, physicalPages)
  console.log(
    `[pilot] column-split produced ${streams.length} streams ` +
      `(${streams.map((s) => `${s.bookPage}${s.column[0]}`).join(',')})`,
  )

  const out = {}
  const report = []
  for (const pilot of PILOT_REFS) {
    const { ref, bookPage, headerRegex, title } = pilot
    const extracted = extractBody(streams, ref, bookPage, headerRegex, title)
    if (!extracted.headerFound) {
      report.push(`[pilot]   ${ref}: HEADER NOT FOUND`)
      continue
    }
    out[ref] = { stanzas: extracted.stanzas }
    const lineCount = extracted.stanzas.reduce((acc, s) => acc + s.length, 0)
    report.push(
      `[pilot]   ${ref}: ${extracted.stanzas.length} stanzas, ${lineCount} lines ` +
        `(books ${extracted.bodyStartBookPage}..${extracted.bodyEndBookPage})`,
    )
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(out, null, 2) + '\n', 'utf-8')

  console.log('[pilot] extraction summary:')
  for (const line of report) console.log(line)
  console.log(`[pilot] wrote ${Object.keys(out).length} entries -> ${OUTPUT_PATH}`)
}

main()
