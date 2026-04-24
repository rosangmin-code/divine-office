#!/usr/bin/env node
/**
 * FR-156 task #36 — inject PDF page numbers into every `firstVespers`
 * subtree (52 Sunday + 13 solemnity/feast + 6 movable = 71 blocks).
 *
 * NFR-009d scope extension: brings firstVespers under the same page-
 * marker verification umbrella as regular propers / psalter / sanctoral.
 *
 * Walks TARGET_FILES and enters only nodes whose parent key is
 * `firstVespers`. Within such a node, annotates the standard text
 * fields via the shared `first-vespers-page-annotator` (which itself
 * delegates to `page-fingerprint`).
 *
 * Existing page values are overwritten when a match is found (the PDF
 * extract is authoritative — same convention as extract-propers-pages.js).
 * No new text fields are introduced. Other subtrees (regular lauds /
 * vespers / memorials / etc.) are NEVER visited.
 *
 * Output: rewrites the source JSON files in-place. A summary per file
 * is printed. The companion verifiers (`verify-{first,solemnity,movable}-
 * first-vespers.js`) reuse the same annotator for byte-equal diffing.
 *
 * Usage: node scripts/inject-first-vespers-pages.js
 */

const fs = require('fs')
const path = require('path')
const { buildPageIndex, annotatePagesInPlace } = require('./lib/first-vespers-page-annotator')

const ROOT = path.resolve(__dirname, '..')

const TARGET_FILES = [
  'src/data/loth/propers/advent.json',
  'src/data/loth/propers/christmas.json',
  'src/data/loth/propers/lent.json',
  'src/data/loth/propers/easter.json',
  'src/data/loth/propers/ordinary-time.json',
  'src/data/loth/sanctoral/solemnities.json',
  'src/data/loth/sanctoral/feasts.json',
]

function snapshotPages(fv) {
  const snap = {}
  if (!fv || typeof fv !== 'object') return snap
  for (const [k, v] of Object.entries(fv)) {
    if (typeof v === 'number' && (k === 'page' || k.endsWith('Page'))) snap[k] = v
    else if (v && typeof v === 'object' && !Array.isArray(v) && typeof v.page === 'number') snap[`${k}.page`] = v.page
  }
  if (Array.isArray(fv.psalms)) {
    fv.psalms.forEach((p, i) => {
      if (p && typeof p === 'object' && typeof p.page === 'number') snap[`psalms[${i}].page`] = p.page
    })
  }
  return snap
}

function walk(node, idx, stats) {
  if (Array.isArray(node)) {
    for (const item of node) walk(item, idx, stats)
    return
  }
  if (!node || typeof node !== 'object') return
  for (const key of Object.keys(node)) {
    const v = node[key]
    if (key === 'firstVespers' && v && typeof v === 'object' && !Array.isArray(v)) {
      const before = snapshotPages(v)
      annotatePagesInPlace(v, idx)
      const after = snapshotPages(v)
      stats.fvBlocks++
      for (const k of Object.keys(after)) {
        if (!(k in before)) stats.added++
        else if (before[k] !== after[k]) stats.changed++
        else stats.unchanged++
      }
    } else if (v && typeof v === 'object') {
      walk(v, idx, stats)
    }
  }
}

function main() {
  console.log('[inject-fv-pages] building page index…')
  const idx = buildPageIndex(ROOT)
  console.log(`  primary tokens: ${idx.primary.tokens.length.toLocaleString()}`)
  if (idx.fallback) console.log(`  fallback tokens: ${idx.fallback.tokens.length.toLocaleString()}`)

  const grandTotals = { added: 0, changed: 0, unchanged: 0, fvBlocks: 0 }

  for (const rel of TARGET_FILES) {
    const abs = path.join(ROOT, rel)
    if (!fs.existsSync(abs)) {
      console.log(`\n[skip] ${rel} (not found)`)
      continue
    }
    const raw = fs.readFileSync(abs, 'utf8')
    let data
    try {
      data = JSON.parse(raw)
    } catch (err) {
      console.error(`\n[error] Failed to parse ${rel}: ${err.message}`)
      continue
    }

    const stats = { added: 0, changed: 0, unchanged: 0, fvBlocks: 0 }
    walk(data, idx, stats)

    if (stats.fvBlocks === 0) {
      console.log(`\n[skip] ${rel} — no firstVespers subtrees`)
      continue
    }

    fs.writeFileSync(abs, JSON.stringify(data, null, 2) + '\n', 'utf8')

    console.log(`\n[ok] ${rel}`)
    console.log(`  firstVespers blocks: ${stats.fvBlocks}`)
    console.log(`  added: ${stats.added}, changed: ${stats.changed}, unchanged: ${stats.unchanged}`)

    grandTotals.added += stats.added
    grandTotals.changed += stats.changed
    grandTotals.unchanged += stats.unchanged
    grandTotals.fvBlocks += stats.fvBlocks
  }

  console.log('\n=== summary ===')
  console.log(JSON.stringify(grandTotals, null, 2))
}

main()
