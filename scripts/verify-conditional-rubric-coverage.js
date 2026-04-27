#!/usr/bin/env node
/**
 * verify-conditional-rubric-coverage.js
 *
 * FR-160-B PR-2..7 — cardinality + integrity gate for the rubric marking
 * pipeline. Two checks (both hard-fail on integrity, soft-report on coverage):
 *
 *   1. INTEGRITY (hard-fail): every JSON conditionalRubric/pageRedirect
 *      entry's `evidencePdf.text` MUST appear at the cited
 *      `evidencePdf.page` in `parsed_data/full_pdf.txt`. Drift here means
 *      the JSON is asserting a PDF citation that doesn't exist.
 *
 *   2. COVERAGE (informational): per-season rubric pattern count from the
 *      PDF (using FR-160-B Phase B plan §2 patterns) versus the JSON
 *      marking count. Reports the table; does NOT exit non-zero on
 *      under-coverage (B3 is incremental across 6 sub-PRs).
 *
 *   3. OVER-COVERAGE (hard-fail): JSON marking count for a season MUST
 *      NOT exceed the PDF mention count by more than 20 %. Catches
 *      duplicate / spurious markings.
 *
 * The script is read-only on JSON. Exits 0 on success, 1 on integrity or
 * over-coverage failure.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const PDF_PATH = path.join(ROOT, 'parsed_data/full_pdf.txt')

const PROPERS_FILES = {
  advent: 'src/data/loth/propers/advent.json',
  christmas: 'src/data/loth/propers/christmas.json',
  lent: 'src/data/loth/propers/lent.json',
  easter: 'src/data/loth/propers/easter.json',
  'ordinary-time': 'src/data/loth/propers/ordinary-time.json',
}

const SANCTORAL_FILES = [
  'src/data/loth/sanctoral/solemnities.json',
  'src/data/loth/sanctoral/feasts.json',
  'src/data/loth/sanctoral/memorials.json',
  'src/data/loth/sanctoral/optional-memorials.json',
]

// Per-season PDF page ranges for the propers section in
// parsed_data/full_pdf.txt. These bound the rubric scan so a "Магтуу" hit
// inside (say) the Easter section is not counted toward Advent.
//
// Boundaries derived empirically by tracing running headers:
//   - Advent:    pages 548-580 (last advent page is dec24 lauds at 580)
//   - Christmas: pages 583-617 (12-25..first sunday after epiphany)
//   - Lent:      pages 620-707 (approx; ash wed → holy saturday)
//   - Easter:    pages 711-870 (pentecost included)
//   - OT:        pages 711-870 overlaps in this PDF; computed via inversion
//                (any propers-section page outside the season-specific
//                range that still mentions the rubric pattern).
//
// `sanctoral` has no contiguous range (entries scattered by feast date);
// it is reported as "n/a" for PDF cardinality.
const SEASON_PAGE_RANGES = {
  advent: { from: 548, to: 580 },
  christmas: { from: 583, to: 617 },
  lent: { from: 620, to: 707 },
  easter: { from: 711, to: 870 },
  // ordinary-time: shares the post-Easter section with the per-season
  // weekday cycle. PDF coverage reporting is best-effort.
  'ordinary-time': { from: 47, to: 540 },
}

// PDF rubric patterns — FR-160-B Phase B plan §2.1 + §2.2.
//
// Each pattern carries:
//   - `lineMatch`  — anchored RegExp for per-line scan (handles non-wrapped occurrences)
//   - `concatMatch`— global RegExp for per-page concat scan (handles wrapped
//                    occurrences AND also captures all repeated mentions on
//                    a single page; we use matchAll to count occurrences
//                    rather than once-per-page)
const PATTERNS = [
  { name: 'skip', lineMatch: /үл уншина/, concatMatch: /үл уншина/g },
  { name: 'substitute', lineMatch: /татаж авна/, concatMatch: /татаж авна/g },
  { name: 'alt', lineMatch: /^Эсвэл:|^Эсвэл, /, concatMatch: /(?:^|[\s.])Эсвэл[:,]/g },
  { name: 'conditional', lineMatch: /Хэрэв.*таарвал/, concatMatch: /Хэрэв[^\n]*таарвал/g },
  { name: 'redirect-magtuu', lineMatch: /Магтуу: х\. ?[0-9]+/, concatMatch: /Магтуу: х\. ?[0-9]+/g },
  {
    name: 'redirect-invitatory',
    lineMatch: /Урих дуудлагын дуулал.*х\. ?[0-9]+/,
    concatMatch: /Урих дуудлагын дуулал[^\n]*?х\. ?[0-9]+/g,
  },
]

function loadPdfPages() {
  if (!fs.existsSync(PDF_PATH)) {
    return null
  }
  const lines = fs.readFileSync(PDF_PATH, 'utf-8').split(/\r?\n/)
  const indexed = []
  let currentPage = null
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (/^\d{1,4}$/.test(trimmed)) {
      currentPage = parseInt(trimmed, 10)
      continue
    }
    if (currentPage != null) {
      indexed.push({ page: currentPage, line: i + 1, text: line })
    }
  }
  return indexed
}

function countPdfMatches(indexed, range) {
  if (!indexed) return null
  const counts = Object.fromEntries(PATTERNS.map((p) => [p.name, 0]))
  // Counting strategy: per-page concat scan with `matchAll`, which
  // counts EVERY occurrence (including multiple wrapped instances on
  // the same page). The simpler per-line scan is then used only to
  // assert that the concat scan did not UNDERCOUNT — i.e., concat
  // count must be ≥ line count for each pattern. If a pattern shows
  // line > concat (unlikely but possible if regex differs), we keep
  // the larger of the two. This makes the counter monotone and
  // robust as PR-3..7 add volume.
  const byPage = new Map()
  for (const { page, text } of indexed) {
    if (page < range.from || page > range.to) continue
    const buf = byPage.get(page) ?? []
    buf.push(text)
    byPage.set(page, buf)
  }
  // Concat counting (authoritative for occurrence count).
  for (const [, buf] of byPage) {
    const joined = buf.join(' ').replace(/\s+/g, ' ')
    for (const p of PATTERNS) {
      const matches = joined.match(p.concatMatch)
      if (matches) counts[p.name] += matches.length
    }
  }
  // Line-only safety check: if a pattern's anchored line scan yields
  // MORE than the concat scan (regex divergence), bump up the count.
  // This is a defensive backstop, not the primary path.
  const lineCounts = Object.fromEntries(PATTERNS.map((p) => [p.name, 0]))
  for (const { page, text } of indexed) {
    if (page < range.from || page > range.to) continue
    for (const p of PATTERNS) {
      if (p.lineMatch.test(text)) lineCounts[p.name] += 1
    }
  }
  for (const p of PATTERNS) {
    if (lineCounts[p.name] > counts[p.name]) counts[p.name] = lineCounts[p.name]
  }
  counts.total = PATTERNS.reduce((acc, p) => acc + counts[p.name], 0)
  return counts
}

function* iterArrays(node, key, locator) {
  if (node == null || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      yield* iterArrays(node[i], key, `${locator}[${i}]`)
    }
    return
  }
  for (const [k, v] of Object.entries(node)) {
    if (k === key && Array.isArray(v)) {
      yield { array: v, locator: `${locator}.${k}` }
      continue
    }
    yield* iterArrays(v, key, `${locator}.${k}`)
  }
}

function loadFile(relPath) {
  const full = path.join(ROOT, relPath)
  if (!fs.existsSync(full)) return null
  const raw = fs.readFileSync(full, 'utf-8')
  return JSON.parse(raw)
}

function collectMarks(relPath) {
  const data = loadFile(relPath)
  if (!data) return { conditional: [], redirect: [] }
  const conditional = []
  const redirect = []
  for (const { array, locator } of iterArrays(data, 'conditionalRubrics', relPath)) {
    for (let i = 0; i < array.length; i++) {
      conditional.push({ entry: array[i], locator: `${locator}[${i}]` })
    }
  }
  for (const { array, locator } of iterArrays(data, 'pageRedirects', relPath)) {
    for (let i = 0; i < array.length; i++) {
      redirect.push({ entry: array[i], locator: `${locator}[${i}]` })
    }
  }
  return { conditional, redirect }
}

function checkIntegrity(indexed, marks, fileLabel, errors) {
  if (!indexed) return // PDF unavailable — integrity check skipped.
  // Build a per-page text concatenation for substring search.
  const byPage = new Map()
  for (const { page, text } of indexed) {
    const buf = byPage.get(page) ?? []
    buf.push(text)
    byPage.set(page, buf)
  }
  function pageContains(page, needle) {
    const buf = byPage.get(page)
    if (!buf) return false
    return buf.some((line) => line.includes(needle))
  }
  function pageContainsAcrossLines(page, needle) {
    // Some evidencePdf.text spans multiple PDF lines (e.g. wrapped at
    // column 60). Concatenate the page's lines with a single space so a
    // wrapped-but-otherwise-byte-equal needle still matches.
    const buf = byPage.get(page)
    if (!buf) return false
    const joined = buf.join(' ').replace(/\s+/g, ' ')
    const needleNorm = needle.replace(/\s+/g, ' ')
    return joined.includes(needleNorm)
  }
  for (const { entry, locator } of marks.conditional) {
    const ev = entry.evidencePdf
    if (!ev) {
      errors.push(`${fileLabel} :: ${locator}: missing evidencePdf`)
      continue
    }
    const found = pageContains(ev.page, ev.text) || pageContainsAcrossLines(ev.page, ev.text)
    if (!found) {
      errors.push(
        `${fileLabel} :: ${locator}: evidencePdf.text not found at PDF page ${ev.page} ` +
          `(rubricId=${entry.rubricId})`,
      )
    }
  }
  for (const { entry, locator } of marks.redirect) {
    const ev = entry.evidencePdf
    if (!ev) {
      errors.push(`${fileLabel} :: ${locator}: missing evidencePdf`)
      continue
    }
    const found = pageContains(ev.page, ev.text) || pageContainsAcrossLines(ev.page, ev.text)
    if (!found) {
      errors.push(
        `${fileLabel} :: ${locator}: evidencePdf.text not found at PDF page ${ev.page} ` +
          `(redirectId=${entry.redirectId})`,
      )
    }
  }
}

function fmtRow(label, pdfTotal, jsonCount, ratio) {
  const pdfStr = pdfTotal == null ? 'n/a' : String(pdfTotal)
  const ratioStr = pdfTotal == null || pdfTotal === 0 ? 'n/a' : `${(ratio * 100).toFixed(0)}%`
  return `  ${label.padEnd(16)}  pdf=${pdfStr.padStart(4)}  json=${String(jsonCount).padStart(4)}  coverage=${ratioStr}`
}

function main() {
  const indexed = loadPdfPages()
  if (!indexed) {
    console.warn(`[verify-conditional-rubric-coverage] WARN: ${path.relative(ROOT, PDF_PATH)} not present — integrity check skipped, only JSON counts reported`)
  }
  const errors = []

  console.log('verify-conditional-rubric-coverage (FR-160-B PR-2..7)')
  console.log('-'.repeat(60))
  console.log('Per-season PDF mention vs JSON marking:')

  let overCoverageFail = false

  for (const [season, file] of Object.entries(PROPERS_FILES)) {
    const range = SEASON_PAGE_RANGES[season]
    const pdfCounts = range ? countPdfMatches(indexed, range) : null
    const marks = collectMarks(file)
    checkIntegrity(indexed, marks, file, errors)
    const jsonCount = marks.conditional.length + marks.redirect.length
    const pdfTotal = pdfCounts ? pdfCounts.total : null
    const ratio = pdfTotal && pdfTotal > 0 ? jsonCount / pdfTotal : 0
    console.log(fmtRow(season, pdfTotal, jsonCount, ratio))
    if (pdfTotal != null && pdfTotal > 0 && jsonCount > Math.ceil(pdfTotal * 1.2)) {
      overCoverageFail = true
      errors.push(
        `${season}: JSON marking count ${jsonCount} exceeds PDF mention count ${pdfTotal} by > 20% — possible duplicate / spurious entries`,
      )
    }
  }

  // Sanctoral roll-up (no PDF page range — feasts are scattered).
  let sanctoralJson = 0
  for (const f of SANCTORAL_FILES) {
    const marks = collectMarks(f)
    checkIntegrity(indexed, marks, f, errors)
    sanctoralJson += marks.conditional.length + marks.redirect.length
  }
  console.log(fmtRow('sanctoral', null, sanctoralJson, 0))

  if (errors.length) {
    console.error('')
    console.error(`[verify-conditional-rubric-coverage] ${errors.length} error(s):`)
    for (const e of errors.slice(0, 30)) console.error(`  - ${e}`)
    if (errors.length > 30) console.error(`  … and ${errors.length - 30} more`)
    process.exit(1)
  }

  if (overCoverageFail) {
    process.exit(1) // belt-and-braces; errors path already exited
  }

  console.log('')
  console.log('[verify-conditional-rubric-coverage] OK — integrity gate passed')
}

main()
