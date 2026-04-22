#!/usr/bin/env node
/**
 * apply-psalter-indents.js
 *
 * Re-derives the call/response indent for each line in psalter-texts.json
 * from `pdftotext -layout` output. Re-uses the 2-space prefix convention
 * already understood by src/components/psalm-block.tsx.
 *
 * Pipeline per entry:
 *   1. Walk every JSON stanza line.
 *   2. Trim it and look it up in a layout-line index keyed by trimmed text.
 *   3. From the matching layout atom(s), measure leading whitespace.
 *   4. Map: leading ≥ 3 spaces → indent level 1 (`'  '` prefix), else 0.
 *
 * The layout index is built by splitting each layout line at any run of
 * ≥3 spaces — that is the column gap pdftotext inserts between two
 * book columns. The left side keeps its original leading whitespace; the
 * right side has its leading whitespace stripped (we cannot recover the
 * column-2 offset without knowing column-2's left edge in PDF coordinates).
 *
 * Skips entries that already carry leading-space indents (manually patched).
 * In --apply mode, only writes back entries with match ratio ≥ 0.9 — partial
 * matches go into the candidate report instead.
 *
 * Modes:
 *   (default)        Dry run. Writes scripts/out/psalter-indent-candidates.json.
 *   --apply          Mutates src/data/loth/psalter-texts.json.
 *   --force          With --apply, also overwrites entries that already had
 *                    indents. Use only when re-running after a verifier change.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const TEXTS = path.join(ROOT, 'src/data/loth/psalter-texts.json')
const PDF_TXT = path.join(ROOT, 'scripts/out/psalter_layout.txt')
const OUT_DIR = path.join(ROOT, 'scripts/out')
const OUT = path.join(OUT_DIR, 'psalter-indent-candidates.json')

const APPLY = process.argv.includes('--apply')
const FORCE = process.argv.includes('--force')

const INDENT_THRESHOLD_SPACES = 3
const APPLY_THRESHOLD_RATIO = 0.9
const STALE_GAP_SPACES = 10

function buildLayoutAtoms(layoutLines) {
  const atoms = []
  for (const line of layoutLines) {
    if (!line.trim()) continue
    const m = line.match(/(\S)(\s{3,})/)
    if (m) {
      const cut = m.index + 1
      atoms.push(line.slice(0, cut))
      const right = line.slice(cut + m[2].length)
      if (right.trim()) atoms.push(right)
    } else {
      atoms.push(line)
    }
  }
  return atoms
}

function indexByTrimmed(atoms) {
  const map = new Map()
  for (const a of atoms) {
    const t = a.trim()
    if (!t) continue
    if (!map.has(t)) map.set(t, [])
    map.get(t).push(a)
  }
  return map
}

function leadingSpaces(s) {
  return s.length - s.trimStart().length
}

function indentLevelFromAtoms(atoms) {
  let best = null
  for (const a of atoms) {
    const lead = leadingSpaces(a)
    if (lead > STALE_GAP_SPACES) continue
    if (best === null || lead < best) best = lead
  }
  if (best === null) return 0
  return best >= INDENT_THRESHOLD_SPACES ? 1 : 0
}

function entryHasExistingIndents(entry) {
  return entry.stanzas.some(s => s.some(l => /^ /.test(l)))
}

function processEntry(engRef, entry, layoutIndex) {
  const alreadyIndented = entryHasExistingIndents(entry)
  if (alreadyIndented && !FORCE) {
    return { engRef, status: 'already-indented', skipped: true }
  }
  const newStanzas = []
  let foundCount = 0
  let totalCount = 0
  let changedLineCount = 0
  for (const stanza of entry.stanzas) {
    const newStanza = []
    for (const line of stanza) {
      totalCount++
      const stripped = line.replace(/^ */, '')
      const atoms = layoutIndex.get(stripped.trim()) || []
      let prefix = ''
      if (atoms.length > 0) {
        foundCount++
        const lvl = indentLevelFromAtoms(atoms)
        if (lvl === 1) prefix = '  '
      }
      const newLine = prefix + stripped
      if (newLine !== line) changedLineCount++
      newStanza.push(newLine)
    }
    newStanzas.push(newStanza)
  }
  const matchRatio = totalCount === 0 ? 1 : foundCount / totalCount
  return {
    engRef,
    status: 'derived',
    alreadyIndented,
    totalLines: totalCount,
    matchedLines: foundCount,
    matchRatio: Number(matchRatio.toFixed(2)),
    changedLines: changedLineCount,
    stanzas: newStanzas,
  }
}

function main() {
  const texts = JSON.parse(fs.readFileSync(TEXTS, 'utf-8'))
  const layoutLines = fs.readFileSync(PDF_TXT, 'utf-8').split('\n')
  const atoms = buildLayoutAtoms(layoutLines)
  const layoutIndex = indexByTrimmed(atoms)

  const results = []
  for (const [ref, entry] of Object.entries(texts)) {
    if (!entry.stanzas || entry.stanzas.length === 0) continue
    results.push(processEntry(ref, entry, layoutIndex))
  }

  const stats = {
    total: results.length,
    skippedAlreadyIndented: results.filter(r => r.skipped).length,
    perfectMatch: results.filter(r => r.matchRatio === 1).length,
    partialMatch: results.filter(r => r.status === 'derived' && r.matchRatio < 1 && r.matchRatio > 0).length,
    noMatch: results.filter(r => r.matchRatio === 0).length,
    wouldChange: results.filter(r => r.status === 'derived' && r.changedLines > 0).length,
    wouldApply: results.filter(r => r.status === 'derived' && r.changedLines > 0 && r.matchRatio >= APPLY_THRESHOLD_RATIO).length,
  }
  console.log('stats:', stats)

  if (APPLY) {
    const newTexts = { ...texts }
    let applied = 0
    for (const r of results) {
      if (r.status !== 'derived') continue
      if (r.changedLines === 0) continue
      if (r.matchRatio < APPLY_THRESHOLD_RATIO) continue
      newTexts[r.engRef] = { ...texts[r.engRef], stanzas: r.stanzas }
      applied++
    }
    fs.writeFileSync(TEXTS, JSON.stringify(newTexts, null, 2) + '\n')
    console.log(`applied to ${applied} entries`)
  } else {
    fs.mkdirSync(OUT_DIR, { recursive: true })
    const slim = results.map(r => ({
      engRef: r.engRef,
      status: r.status,
      alreadyIndented: r.alreadyIndented,
      totalLines: r.totalLines,
      matchedLines: r.matchedLines,
      matchRatio: r.matchRatio,
      changedLines: r.changedLines,
    }))
    fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), stats, results: slim }, null, 2))
    console.log('wrote', path.relative(ROOT, OUT))
  }
}

main()
