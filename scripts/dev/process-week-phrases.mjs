#!/usr/bin/env node
// FR-161 R-8 Phase 1 — week-N phrase ingest harness.
//
// For every (ref, page) tuple discovered in `src/data/loth/psalter/week-N.json`,
// this tool:
//   1. derives the physical PDF page + half via book-page-mapper.mjs
//   2. runs the R-1 extractor for the relevant column AND the spillover
//      (book + 1) column (psalms commonly continue into the opposite
//      half — Psalm 110 spilled to right col for verse 6 in R-7)
//   3. merges the extractor outputs into one batch
//   4. invokes the R-2 builder in --dry-run mode
//   5. classifies the verdict (PASS / DRIFT_LINE_COUNT / DRIFT_NO_MATCH /
//      ALREADY_INJECTED) per ref
//
// The classification table is the input the human operator (this skill)
// uses to drive R-7 option (b) reconciliation across the batch. The tool
// itself does NOT mutate rich.json — that is reserved for an explicit
// `--inject` invocation after the operator has applied any required
// rich.json splits.
//
// Usage:
//   node scripts/dev/process-week-phrases.mjs --week 1                      # dry-run summary
//   node scripts/dev/process-week-phrases.mjs --week 1 --json /tmp/out.json # save full plan
//   node scripts/dev/process-week-phrases.mjs --week 1 --inject             # inject (atomic)

import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { bookPageToPhysical } from '../parsers/book-page-mapper.mjs'
import { injectPhrasesIntoRichData, renderDryRun } from '../build-phrases-into-rich.mjs'
import { stripPageHeadersFromStanzas } from './page-header-filter.mjs'

// FR-161 R-9.D — extra book pages beyond `(page, page+1)` to scan when a
// rich block's first line is missing from the initial scope. Mirrors the
// MULTI_PAGE_DEPTH constant in `auto-reconcile-wraps.mjs` so the dry-run
// classification and the auto-reconciler agree on what's reachable.
const MULTI_PAGE_DEPTH = 4

const TARGET = 'src/data/loth/prayers/commons/psalter-texts.rich.json'

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
        refs.push({ ref: obj.ref, page: obj.page, type: obj.type })
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

function classifyDryRunVerdict(result, ref) {
  if (result.ok) return { verdict: 'PASS', detail: '' }
  const refIssues = (result.issues || []).filter((i) => i.ref === ref)
  if (refIssues.length === 0) return { verdict: 'OTHER', detail: 'no ref-specific issue' }
  // First diagnostic kind drives classification.
  const firstKind = refIssues[0].kind || refIssues[0].error
  if (firstKind === 'LINE_COUNT_MISMATCH') {
    const i = refIssues[0]
    return {
      verdict: 'DRIFT_LINE_COUNT',
      detail: `block ${i.blockIndex}: rich=${i.richLineCount} ext=${i.extractorLineCount} richFirst="${i.richFirstLine}"`,
    }
  }
  if (firstKind === 'NO_MATCHING_EXTRACTOR_STANZA') {
    const i = refIssues[0]
    return {
      verdict: 'DRIFT_NO_MATCH',
      detail: `block ${i.blockIndex}: richFirst="${i.richFirstLine}"`,
    }
  }
  if (firstKind === 'INCOMPLETE_COVERAGE') {
    return {
      verdict: 'INCOMPLETE_COVERAGE',
      detail: `${refIssues.map((i) => i.error).join(' / ')}`,
    }
  }
  return { verdict: 'OTHER', detail: firstKind || 'unknown' }
}

/**
 * Build the extractor stanzas list for a ref, expanding the page scope
 * incrementally (page → page+1 of the same physical page → next physical
 * page → ...) up to MULTI_PAGE_DEPTH. Each fetched page goes through the
 * shared `stripPageHeadersFromStanzas` filter so a wrap pair sitting on
 * either side of a page boundary survives the builder's window match
 * (FR-161 R-9.D — page-header noise + multi-page spillover).
 *
 * Pages already seen at `(physical, half)` are deduped (book N + N+1
 * share one physical page in 2-up landscape).
 */
function gatherStanzas(pdfPath, startBookPage, depth) {
  const seen = new Set()
  const out = []
  for (let bp = startBookPage; bp <= startBookPage + 1 + depth; bp++) {
    const phys = bookPageToPhysical(bp)
    const key = `${phys.physical}:${phys.half}`
    if (seen.has(key)) continue
    seen.add(key)
    try {
      const json = runExtractor(pdfPath, bp, phys.half)
      out.push(...stripPageHeadersFromStanzas(json.stanzas))
    } catch {
      // missing / blank page — ignore
    }
  }
  return out
}

function processOne(refMeta, pdfPath, richData) {
  const { ref, page } = refMeta
  const start = bookPageToPhysical(page)

  // Adaptive scope: start at depth 0 (just `(page, page+1)` mapped to the
  // same physical page). On a NO_MATCHING_EXTRACTOR_STANZA / INCOMPLETE_COVERAGE
  // failure, expand depth and retry. Stop on PASS, on a non-recoverable
  // failure (LINE_COUNT_MISMATCH = drift inside an already-found block —
  // more pages won't help), or when MULTI_PAGE_DEPTH is exhausted.
  let lastResult = null
  let lastVerdict = null
  let extractorStanzaCount = 0
  for (let depth = 0; depth <= MULTI_PAGE_DEPTH; depth++) {
    let extractorStanzas
    try {
      extractorStanzas = gatherStanzas(pdfPath, page, depth)
    } catch (err) {
      return {
        ref,
        page,
        verdict: 'EXTRACTOR_FAILED',
        detail: err.message.split('\n')[0],
      }
    }
    extractorStanzaCount = extractorStanzas.length
    const batch = [{ ref, stanzas: extractorStanzas }]
    const result = injectPhrasesIntoRichData(richData, batch)
    const verdictInfo = classifyDryRunVerdict(result, ref)
    lastResult = result
    lastVerdict = verdictInfo
    if (verdictInfo.verdict === 'PASS') break
    // Only retry deeper for missing-stanza failures; LINE_COUNT_MISMATCH
    // is a content-shape drift that more pages won't fix.
    if (
      verdictInfo.verdict !== 'DRIFT_NO_MATCH' &&
      verdictInfo.verdict !== 'INCOMPLETE_COVERAGE'
    ) {
      break
    }
  }

  return {
    ref,
    page,
    physicalPage: start.physical,
    startCol: start.half,
    extractorStanzaCount,
    verdict: lastVerdict.verdict,
    detail: lastVerdict.detail,
    plan: lastResult.plan?.find((p) => p.ref === ref) ?? null,
  }
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
    const r = processOne(refMeta, pdfPath, richData)
    results.push(r)
  }

  // Build batch atomic inject if requested. Re-gather extractor stanzas
  // using the SAME adaptive depth + page-header filter the dry-run pass
  // used so the inject batch sees the identical line stream the verdict
  // was based on.
  if (args.inject) {
    const batches = results
      .filter((r) => r.verdict === 'PASS' && r.plan)
      .map((r) => ({
        ref: r.ref,
        stanzas: gatherStanzas(pdfPath, r.page, MULTI_PAGE_DEPTH),
      }))
    if (batches.length === 0) {
      process.stderr.write('refusing to inject: no PASS refs in batch\n')
      process.exit(3)
    }
    const result = injectPhrasesIntoRichData(richData, batches)
    if (!result.ok) {
      process.stderr.write('inject FAILED:\n' + renderDryRun(result) + '\n')
      process.exit(4)
    }
    writeFileSync(TARGET, JSON.stringify(result.data, null, 2) + '\n', 'utf-8')
    process.stdout.write(`inject OK — ${batches.length} ref(s) updated in ${TARGET}\n`)
  }

  // Summary table.
  const counts = results.reduce(
    (acc, r) => {
      acc[r.verdict] = (acc[r.verdict] ?? 0) + 1
      return acc
    },
    {},
  )
  process.stdout.write(
    `\nSummary (${results.length} refs scanned in week ${args.week}):\n` +
      Object.entries(counts)
        .map(([v, n]) => `  ${v}: ${n}`)
        .join('\n') +
      '\n\n',
  )
  for (const r of results) {
    const label = r.verdict.padEnd(20)
    process.stdout.write(
      `  ${label} ${r.ref.padEnd(40)} page=${String(r.page).padEnd(4)} ${r.detail || ''}\n`,
    )
  }

  if (args.json) {
    writeFileSync(args.json, JSON.stringify(results, null, 2) + '\n', 'utf-8')
    process.stdout.write(`\nfull plan saved to ${args.json}\n`)
  }
}

main()
