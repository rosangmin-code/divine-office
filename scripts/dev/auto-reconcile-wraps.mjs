#!/usr/bin/env node
// FR-161 R-8 — auto-reconciler for rich.json pre-joined wrap pairs.
//
// Background: when R-2 builder dry-run returns LINE_COUNT_MISMATCH on a
// ref, it usually means rich.json's `lines[]` array merges what the PDF
// (and the R-1 extractor) sees as 2-N visual lines into a single joined
// line. R-7 demonstrated the manual fix (option b — split the joined
// line into PDF-visual lines). At week-1 scale (42 refs, 36 with drift,
// often multiple joins per ref), manual splits are infeasible.
//
// Algorithm (per ref):
//   1. Run the R-1 extractor for both PDF columns covering the ref's page
//   2. Flatten extractor stanzas into a single line stream
//   3. For each rich `kind:'stanza'` block, ALIGN rich.lines[i] against a
//      window of extractor lines starting at the cursor `j`:
//        - try a 1-line match (rich.line[i] === ext.line[j])
//        - else try a 2-line concat (rich.line[i] === ext.line[j] + ' ' + ext.line[j+1])
//        - else try 3, 4, up to 5 (deeper joins are rare)
//      All comparisons run through the SAME quote-normalised matcher
//      that the R-2 builder uses (`stanzaFirstLineMatches`-style).
//   4. If every rich line aligns to a contiguous extractor window, the
//      ref is RECONCILABLE: emit a patch list of (rich.line[i] → split
//      into N PDF-visual lines) and apply.
//   5. Otherwise the ref is NOVEL_EDGE: leave rich.json untouched,
//      report the first failing rich line for the evidence doc.
//
// The algorithm preserves R-7 visual contract: R-4 renderer joins split
// lines back via PhraseGroup `lineRange`, so byte-identical output.
//
// Usage:
//   node scripts/dev/auto-reconcile-wraps.mjs --week 1 --dry-run
//   node scripts/dev/auto-reconcile-wraps.mjs --week 1 --apply

import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { bookPageToPhysical } from '../parsers/book-page-mapper.mjs'
import { stripPageHeaders } from './page-header-filter.mjs'

const TARGET = 'src/data/loth/prayers/commons/psalter-texts.rich.json'
const MAX_JOIN_DEPTH = 6

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    if (!flag.startsWith('--')) continue
    const key = flag.slice(2)
    const next = argv[i + 1]
    if (next && !next.startsWith('--')) {
      args[key] = next
      i++
    } else {
      args[key] = true
    }
  }
  return args
}

function normalizeQuotes(s) {
  return s.replace(/[“”„‟]/g, '"').replace(/[‘’‚‛]/g, "'")
}
function norm(s) {
  return normalizeQuotes((s || '').trim()).replace(/\s+/g, ' ')
}

function discoverRefs(weekFile) {
  const data = JSON.parse(readFileSync(weekFile, 'utf-8'))
  const refs = []
  const seen = new Set()
  function walk(obj) {
    if (!obj || typeof obj !== 'object') return
    if (Array.isArray(obj)) {
      obj.forEach(walk)
      return
    }
    if (
      obj.ref &&
      typeof obj.page === 'number' &&
      (obj.type === 'psalm' || obj.type === 'canticle')
    ) {
      if (!seen.has(obj.ref)) {
        seen.add(obj.ref)
        refs.push({ ref: obj.ref, page: obj.page })
      }
    }
    Object.values(obj).forEach(walk)
  }
  walk(data)
  return refs
}

function runExtractor(pdfPath, bookPage, column) {
  const out = execFileSync(
    'node',
    [
      resolve('scripts/parsers/extract-phrases-from-pdf.mjs'),
      '--pdf',
      pdfPath,
      '--book-page',
      String(bookPage),
      '--column',
      column,
    ],
    { encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024 },
  )
  return JSON.parse(out)
}

function flattenExtractor(stanzas) {
  const flat = []
  for (const s of stanzas) {
    for (const line of s.lines) flat.push(line)
  }
  return flat
}

// FR-161 R-9.D — multi-page extractor scope.
//
// `reconcileOneRef` originally extracts only `(page, page+1)` of the same
// physical PDF page. Some psalms (Psalm 33 v9 → block 2 on book page 98,
// Psalm 41 block 1, Psalm 21 block 2) spill BEYOND that single physical
// page. The handler now extracts up to MULTI_PAGE_DEPTH consecutive book
// pages whenever the initial alignment cannot find a rich block's first
// line. Each extra page is appended to the flat stream (with its own
// page-header noise filtered via shared `page-header-filter.mjs` so a wrap
// pair sitting on either side of a page boundary is treated as one
// logical sequence) and alignment is retried.
const MULTI_PAGE_DEPTH = 4 // pages beyond the start page

/**
 * Find the start index in `extLines` where `richLines[0]` begins. Returns
 * the first match by 12-char prefix (after normalisation) — rich line may
 * be a join of multiple consecutive extractor lines, so we don't require
 * length equality here, just prefix.
 */
function findRichStart(richLines, extLines) {
  if (richLines.length === 0) return -1
  const richFirstNorm = norm(richLines[0])
  const prefixLen = Math.min(12, richFirstNorm.length)
  for (let i = 0; i < extLines.length; i++) {
    const extNorm = norm(extLines[i])
    if (richFirstNorm === extNorm) return i
    const ePrefix = extNorm.slice(0, Math.min(prefixLen, extNorm.length))
    if (ePrefix && richFirstNorm.startsWith(ePrefix)) return i
  }
  return -1
}

/**
 * Align richLines starting from extLines[startJ]. Returns:
 *   { ok: true, splits: [{ richIndex, parts: [string,...] }] }    on success
 *   { ok: false, failAtRichIndex, failExtIndex, reason }          on failure
 */
function align(richLines, extLines, startJ) {
  const splits = []
  let j = startJ
  for (let i = 0; i < richLines.length; i++) {
    const target = norm(richLines[i])
    let matched = false
    for (let depth = 1; depth <= MAX_JOIN_DEPTH && j + depth <= extLines.length; depth++) {
      const slice = extLines.slice(j, j + depth)
      const joined = norm(slice.join(' '))
      if (joined === target) {
        if (depth > 1) {
          splits.push({ richIndex: i, parts: slice.map((s) => s.trim()) })
        }
        j += depth
        matched = true
        break
      }
    }
    if (!matched) {
      return {
        ok: false,
        failAtRichIndex: i,
        failExtIndex: j,
        reason: 'no contiguous extractor join up to depth ' + MAX_JOIN_DEPTH,
        richSample: target.slice(0, 60),
        extSample: extLines.slice(j, j + 3).map((s) => s.trim().slice(0, 30)),
      }
    }
  }
  return { ok: true, splits, finalJ: j }
}

/**
 * Apply a list of splits to a rich block's `lines[]`. Each split replaces
 * `lines[richIndex]` with N lines whose `.spans[0].text` is each part. All
 * other line metadata (`indent`, `role`, etc.) is copied from the original
 * line so style does not regress.
 */
function applySplits(block, splits) {
  if (splits.length === 0) return block
  // Apply highest richIndex first so earlier indices remain valid.
  const sorted = [...splits].sort((a, b) => b.richIndex - a.richIndex)
  const newLines = [...block.lines]
  for (const s of sorted) {
    const original = newLines[s.richIndex]
    const replacement = s.parts.map((text) => ({
      ...original,
      spans: [{ ...original.spans[0], text }],
    }))
    newLines.splice(s.richIndex, 1, ...replacement)
  }
  return { ...block, lines: newLines }
}

/**
 * FR-161 R-9.D — extract a flat extractor stream covering one or more
 * book-page pairs (left + right of each physical page that hosts the
 * relevant book pages). Pages are walked starting at `startBookPage` and
 * include every book page from `startBookPage` to `startBookPage + extraDepth`.
 *
 * Page-header noise (running headers like "Даваа гарагийн орой ... 85") is
 * filtered automatically — the lexically interleaved header is what blocks
 * the line aligner from joining a wrap pair across the page boundary.
 *
 * @param {string} pdfPath
 * @param {number} startBookPage
 * @param {number} extraDepth — additional book pages beyond start (0 = just page+1)
 * @returns {string[]} flat, noise-filtered extractor lines in book order
 */
function extractFlatStream(pdfPath, startBookPage, extraDepth = 0) {
  const flat = []
  const seen = new Set() // dedupe physical pages — book N + N+1 share one physical
  for (let bp = startBookPage; bp <= startBookPage + 1 + extraDepth; bp++) {
    const phys = bookPageToPhysical(bp)
    if (seen.has(`${phys.physical}:${phys.half}`)) continue
    seen.add(`${phys.physical}:${phys.half}`)
    try {
      const out = runExtractor(pdfPath, bp, phys.half)
      flat.push(...out.stanzas.flatMap((s) => s.lines))
    } catch {
      // Some pages are blank or don't exist — ignore.
    }
  }
  return stripPageHeaders(flat)
}

function reconcileOneRef(refMeta, pdfPath, richData) {
  const { ref, page } = refMeta
  const ref0 = richData[ref]
  if (!ref0 || !ref0.stanzasRich || !Array.isArray(ref0.stanzasRich.blocks)) {
    return { ref, page, verdict: 'NO_RICH_BLOCKS' }
  }

  const blocks = ref0.stanzasRich.blocks
  const stanzaSlots = blocks
    .map((b, i) => ({ b, i }))
    .filter((x) => x.b.kind === 'stanza')

  // FR-161 R-9.D — adaptive multi-page extraction. Start with the same
  // 1-physical-page scope R-8 used; if alignment fails, retry with more
  // pages until success or depth ceiling.
  let lastFailure = null
  for (let depth = 0; depth <= MULTI_PAGE_DEPTH; depth++) {
    const extLines = extractFlatStream(pdfPath, page, depth)
    if (extLines.length === 0) {
      return { ref, page, verdict: 'EXTRACTOR_FAIL', detail: 'no extractor lines' }
    }

    let cursor = 0
    const blockSplits = []
    let failure = null
    for (const slot of stanzaSlots) {
      const richLines = slot.b.lines.map((l) => l.spans?.[0]?.text || '')
      const startJ = findRichStart(richLines, extLines.slice(cursor))
      if (startJ < 0) {
        failure = {
          blockIndex: slot.i,
          kind: 'NO_START_FROM_CURSOR',
          detail: `block ${slot.i}: rich first line "${richLines[0]?.slice(0, 40)}" not found in extractor stream (depth=${depth}, cursor=${cursor})`,
        }
        break
      }
      const absStart = cursor + startJ
      const align1 = align(richLines, extLines, absStart)
      if (!align1.ok) {
        failure = {
          blockIndex: slot.i,
          kind: 'ALIGN_DRIFT',
          detail: `block ${slot.i}: align failed at rich line ${align1.failAtRichIndex} ("${align1.richSample}") — ${align1.reason}`,
        }
        break
      }
      blockSplits.push({ blockIndex: slot.i, splits: align1.splits })
      cursor = align1.finalJ
    }

    if (failure === null) {
      const totalSplits = blockSplits.reduce((acc, x) => acc + x.splits.length, 0)
      return {
        ref,
        page,
        verdict: totalSplits === 0 ? 'NO_SPLITS_NEEDED' : 'RECONCILABLE',
        blockSplits,
        splitCount: totalSplits,
        depthUsed: depth,
      }
    }

    lastFailure = failure
    // Only retry deeper if the failure was a missing-start (suggests
    // multi-page spillover); ALIGN_DRIFT inside an already-found block is
    // a content-shape mismatch that more pages won't fix.
    if (failure.kind !== 'NO_START_FROM_CURSOR') break
  }

  return {
    ref,
    page,
    verdict: 'NOVEL_EDGE',
    detail: lastFailure ? lastFailure.detail : 'unknown alignment failure',
  }
}

function applyAll(richData, allReconciliations) {
  const data = JSON.parse(JSON.stringify(richData))
  for (const r of allReconciliations) {
    if (r.verdict !== 'RECONCILABLE') continue
    const ref = data[r.ref]
    const blocks = [...ref.stanzasRich.blocks]
    for (const { blockIndex, splits } of r.blockSplits) {
      blocks[blockIndex] = applySplits(blocks[blockIndex], splits)
    }
    data[r.ref] = { ...ref, stanzasRich: { ...ref.stanzasRich, blocks } }
  }
  return data
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.week) {
    process.stderr.write('error: --week N required\n')
    process.exit(2)
  }
  const pdfPath = args.pdf || 'public/psalter.pdf'
  const weekFile = `src/data/loth/psalter/week-${args.week}.json`
  const refs = discoverRefs(weekFile)
  const richData = JSON.parse(readFileSync(TARGET, 'utf-8'))

  const results = []
  for (const refMeta of refs) {
    results.push(reconcileOneRef(refMeta, pdfPath, richData))
  }

  // Summary
  const counts = results.reduce((acc, r) => {
    acc[r.verdict] = (acc[r.verdict] ?? 0) + 1
    return acc
  }, {})
  process.stdout.write(
    `Reconciliation summary (week ${args.week}, ${results.length} refs):\n` +
      Object.entries(counts).map(([v, n]) => `  ${v}: ${n}`).join('\n') +
      '\n\nPer-ref detail:\n',
  )
  for (const r of results) {
    const tag = r.verdict.padEnd(20)
    if (r.verdict === 'RECONCILABLE') {
      process.stdout.write(
        `  ${tag} ${r.ref.padEnd(40)} page=${String(r.page).padEnd(4)} ${r.splitCount} split(s) across ${r.blockSplits.length} block(s)\n`,
      )
    } else {
      process.stdout.write(
        `  ${tag} ${r.ref.padEnd(40)} page=${String(r.page).padEnd(4)} ${r.detail || ''}\n`,
      )
    }
  }

  if (args.apply) {
    const newData = applyAll(richData, results)
    writeFileSync(TARGET, JSON.stringify(newData, null, 2) + '\n', 'utf-8')
    const applied = results.filter((r) => r.verdict === 'RECONCILABLE')
    const splitCount = applied.reduce((acc, r) => acc + r.splitCount, 0)
    process.stdout.write(
      `\napplied ${splitCount} split(s) across ${applied.length} ref(s) — wrote ${TARGET}\n`,
    )
  }

  if (args.json) {
    writeFileSync(args.json, JSON.stringify(results, null, 2) + '\n', 'utf-8')
    process.stdout.write(`\nfull plan saved to ${args.json}\n`)
  }
}

main()
