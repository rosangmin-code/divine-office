#!/usr/bin/env node
/**
 * extract-hymn-pages.js
 *
 * Annotates src/data/loth/ordinarium/hymns.json with PDF page numbers by
 * matching each hymn's title and text against parsed_data/hymns/hymns_full.txt.
 *
 * Match strategy (in order, first hit wins):
 *   1. "<number>. <title>" exact phrase (e.g. "1. Аав аа Та миний баяр")
 *      — strongest signal, since the body section explicitly numbers each hymn.
 *   2. The plain title alone.
 *   3. The first non-empty line of the hymn body (text.split('\n')[0]).
 */

const fs = require('fs')
const path = require('path')
const {
  buildSourceIndex,
  buildFirstTokenIndex,
  lookupPage,
} = require('./lib/page-fingerprint')

const ROOT = path.resolve(__dirname, '..')
const FULL_PDF = path.join(ROOT, 'parsed_data/full_pdf.txt')
const SOURCE_TXT = fs.existsSync(FULL_PDF)
  ? FULL_PDF
  : path.join(ROOT, 'parsed_data/hymns/hymns_full.txt')
const TARGET = path.join(ROOT, 'src/data/loth/ordinarium/hymns.json')

function firstBodyLines(text, n) {
  if (typeof text !== 'string') return ''
  const lines = []
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (t) lines.push(t)
    if (lines.length >= n) break
  }
  return lines.join(' ')
}

function main() {
  console.log('Indexing source:', path.relative(ROOT, SOURCE_TXT))
  const tokens = buildSourceIndex(SOURCE_TXT)
  const firstTokenIndex = buildFirstTokenIndex(tokens)
  console.log(`  ${tokens.length.toLocaleString()} tokens, ${firstTokenIndex.size.toLocaleString()} unique`)

  const raw = fs.readFileSync(TARGET, 'utf8')
  const data = JSON.parse(raw)

  let added = 0
  let changed = 0
  let unchanged = 0
  let missed = 0
  const missedNumbers = []

  for (const [num, entry] of Object.entries(data)) {
    if (!entry || typeof entry !== 'object') continue
    const title = typeof entry.title === 'string' ? entry.title.trim() : ''
    const body3 = firstBodyLines(entry.text, 3)
    const body6 = firstBodyLines(entry.text, 6)
    const body1 = firstBodyLines(entry.text, 1)

    // "<num>. <title>\n<first 3 body lines>" is the strongest signal — it's
    // long enough (≥10 tokens) to clear SAFE_AMBIGUOUS_MIN, and it appears
    // exactly once in the PDF body (not in TOC). Try progressively shorter
    // fingerprints as fallback.
    const tries = []
    if (title && body3) tries.push(`${num}. ${title} ${body3}`)
    if (body6) tries.push(body6)
    if (title && body1) tries.push(`${num}. ${title} ${body1}`)
    if (title) tries.push(`${num}. ${title}`)
    if (body3) tries.push(body3)
    if (title) tries.push(title)
    if (body1) tries.push(body1)

    let page = null
    for (const t of tries) {
      page = lookupPage(t, tokens, firstTokenIndex)
      if (page !== null) break
    }

    if (page !== null) {
      const before = entry.page
      entry.page = page
      if (before === undefined) added++
      else if (before !== page) changed++
      else unchanged++
    } else {
      missed++
      missedNumbers.push(num)
    }
  }

  // Re-emit with stable key ordering: title, text, page (page last for diff hygiene).
  const next = {}
  for (const [num, entry] of Object.entries(data)) {
    const ordered = {}
    if ('title' in entry) ordered.title = entry.title
    if ('text' in entry) ordered.text = entry.text
    if ('page' in entry) ordered.page = entry.page
    for (const k of Object.keys(entry)) {
      if (!(k in ordered)) ordered[k] = entry[k]
    }
    next[num] = ordered
  }

  const out = JSON.stringify(next, null, 2) + '\n'
  JSON.parse(out)
  fs.writeFileSync(TARGET, out, 'utf8')

  const total = added + changed + unchanged + missed
  console.log(`\n[ok] ${path.relative(ROOT, TARGET)}`)
  console.log(`  added: ${added}, changed: ${changed}, unchanged: ${unchanged}, missed: ${missed} / ${total}`)
  if (missedNumbers.length > 0) {
    console.log(`  missed hymn numbers: ${missedNumbers.join(', ')}`)
  }
}

main()
