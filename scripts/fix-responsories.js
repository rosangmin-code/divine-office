#!/usr/bin/env node
/**
 * fix-responsories.js
 *
 * One-shot migration that rewrites every `responsory` object in the data
 * tree from the old `{versicle, response}` shape (mis-extracted — see
 * scripts/lib/responsory-parser.js for the root cause) to the full
 * `{fullResponse, versicle, shortResponse}` shape.
 *
 *   node scripts/fix-responsories.js            # dry run
 *   node scripts/fix-responsories.js --write    # persist
 */

const fs = require('fs')
const path = require('path')
const { indexAllResponsories } = require('./lib/responsory-parser')

const ROOT = path.resolve(__dirname, '..')
const PDF_TEXT = path.join(ROOT, 'parsed_data/full_pdf.txt')
const DATA_DIR = path.join(ROOT, 'src/data/loth')

const TARGET_FILES = [
  'psalter/week-1.json',
  'psalter/week-2.json',
  'psalter/week-3.json',
  'psalter/week-4.json',
  'ordinarium/compline.json',
  'propers/advent.json',
  'propers/christmas.json',
  'propers/lent.json',
  'propers/easter.json',
]

function tokenize(s) {
  if (!s) return []
  return s
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

function scoreBlock(block, old) {
  const blockTokens = new Set([
    ...tokenize(block.fullResponse),
    ...tokenize(block.versicle),
    ...tokenize(block.shortResponse),
  ])
  const needleTokens = [...tokenize(old.versicle), ...tokenize(old.response)]
  if (needleTokens.length === 0) return 0
  let hits = 0
  for (const t of needleTokens) if (blockTokens.has(t)) hits++
  return hits / needleTokens.length
}

function pickBlock(blocks, old) {
  let best = null
  let bestScore = 0
  for (const b of blocks) {
    const s = scoreBlock(b, old)
    if (s > bestScore) { best = b; bestScore = s }
  }
  if (old.page) {
    const pageMatches = blocks.filter((b) => b.page === old.page || b.page === old.page - 1 || b.page === old.page + 1)
    for (const b of pageMatches) {
      const s = scoreBlock(b, old)
      if (s >= bestScore - 0.1 && s > 0.4) { best = b; bestScore = s }
    }
  }
  return { best, score: bestScore }
}

function walkResponsories(node, visit) {
  if (Array.isArray(node)) {
    for (const item of node) walkResponsories(item, visit)
    return
  }
  if (!node || typeof node !== 'object') return
  if (node.responsory && typeof node.responsory === 'object' && !Array.isArray(node.responsory)) {
    visit(node)
  }
  for (const [k, v] of Object.entries(node)) {
    if (k === 'responsory') continue
    walkResponsories(v, visit)
  }
}

function main() {
  const write = process.argv.includes('--write')
  const pdfText = fs.readFileSync(PDF_TEXT, 'utf8')
  const blocks = indexAllResponsories(pdfText)
  console.log(`Indexed ${blocks.length} responsory blocks from PDF.`)

  const report = { matched: 0, lowScore: [], unchanged: 0, perFile: {} }

  for (const rel of TARGET_FILES) {
    const abs = path.join(DATA_DIR, rel)
    const raw = fs.readFileSync(abs, 'utf8')
    const doc = JSON.parse(raw)
    let changed = 0
    let total = 0
    const fileLowScore = []

    walkResponsories(doc, (parent) => {
      total++
      const old = parent.responsory
      if (old && typeof old.fullResponse === 'string' && typeof old.shortResponse === 'string') {
        report.unchanged++
        return
      }
      if (old && typeof old._note === 'string' && old._note.includes('Intentionally empty')) {
        const next = {
          fullResponse: '',
          versicle: old.versicle || '',
          shortResponse: '',
          _note: old._note,
        }
        if (old.page !== undefined) next.page = old.page
        parent.responsory = next
        changed++
        report.matched++
        return
      }
      const { best, score } = pickBlock(blocks, old)
      if (!best || score < 0.4) {
        fileLowScore.push({ path: rel, score, old })
        return
      }
      const next = {
        fullResponse: best.fullResponse,
        versicle: best.versicle,
        shortResponse: best.shortResponse,
      }
      if (old.page !== undefined) next.page = old.page
      parent.responsory = next
      changed++
      report.matched++
    })

    report.perFile[rel] = { total, changed, lowScore: fileLowScore.length }
    if (write && changed > 0) {
      fs.writeFileSync(abs, JSON.stringify(doc, null, 2) + '\n', 'utf8')
    }
    if (fileLowScore.length) report.lowScore.push(...fileLowScore)
  }

  console.log()
  console.log('Per-file:')
  for (const [f, s] of Object.entries(report.perFile)) {
    console.log(`  ${f.padEnd(35)} total=${s.total}  changed=${s.changed}  lowScore=${s.lowScore}`)
  }
  console.log()
  console.log(`Total matched: ${report.matched}`)
  console.log(`Already new shape: ${report.unchanged}`)
  console.log(`Low-score: ${report.lowScore.length}`)
  console.log(write ? 'WRITTEN.' : 'Dry run — rerun with --write to persist.')
}

main()
