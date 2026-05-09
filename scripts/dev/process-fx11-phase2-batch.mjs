#!/usr/bin/env node
// F-X11 Phase 2 (#427) — 124 deferred refs 일괄 paragraphBoundaries 재추출 + inject.
//
// Walks every ref in `psalter-texts.rich.json` (excluding `Psalm 46:2-12`,
// the #417 hotfix override pinned 4-entry [7,9,17,19]), discovers its
// PDF book page from the data tree (`week-N.json`, propers, psalter-
// headers), runs the R-1 extractor + R-9.D multi-page gather + R-2
// builder, classifies the verdict per ref, and (with `--inject`) writes
// the atomic batch back to `psalter-texts.rich.json`.
//
// SCOPE
//   - PASS refs are injected as one atomic batch via the standard
//     `injectPhrasesIntoRichData` (additive: existing `lines[]` and
//     `phrases[]` are preserved, `paragraphBoundaries` is overwritten
//     when the extractor produces it; empty arrays strip the field so
//     idempotency holds).
//   - Psalm 46:2-12 is NEVER touched — the `--exclude` set protects
//     #417 hotfix data even if the extractor produces a different
//     answer (which it does, see review-419 spot-check).
//   - The curator review queue (`.claude/scaffold/phrase-extract-
//     review-queue.json`, M-1 from review-419) is rewritten from
//     scratch with the disagreements the new heuristic produced.
//
// USAGE
//   node scripts/dev/process-fx11-phase2-batch.mjs                 # dry-run summary
//   node scripts/dev/process-fx11-phase2-batch.mjs --json out.json # save full plan
//   node scripts/dev/process-fx11-phase2-batch.mjs --inject        # atomic write

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join as joinPath, resolve } from 'node:path'
import { bookPageToPhysical } from '../parsers/book-page-mapper.mjs'
import {
  injectPhrasesIntoRichData,
  collectReviewQueue,
  renderDryRun,
} from '../build-phrases-into-rich.mjs'
import { stripPageHeadersFromStanzas } from './page-header-filter.mjs'

const TARGET = 'src/data/loth/prayers/commons/psalter-texts.rich.json'
const HEADERS = 'src/data/loth/prayers/commons/psalter-headers.rich.json'
const PSALTER_TEXTS = 'src/data/loth/psalter-texts.json'
const REVIEW_QUEUE_PATH = '.claude/scaffold/phrase-extract-review-queue.json'

// MULTI_PAGE_DEPTH mirrors process-week-phrases.mjs (FR-161 R-9.D). 4
// pages of forward gather catches the "stanza spills onto next physical
// page" case (Psalm 110, Psalm 32, ...).
const MULTI_PAGE_DEPTH = 4

// #417 hotfix override — paragraphBoundaries [7,9,17,19] for Psalm 46:2-
// 12 was hand-curated AFTER review showed the extractor over-fragmented.
// Phase 2 must not re-overwrite this — `--exclude` keeps it out of the
// batch. (See docs/review-426-fx11-followup-batch.md M-3 + #417 commit.)
const EXCLUDE_REFS = new Set(['Psalm 46:2-12'])

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

/**
 * Build the `ref → page` map from every data source we know about.
 * Priority order (first wins):
 *   1. `src/data/loth/psalter/week-{1..4}.json` (canonical psalter rota)
 *   2. `src/data/loth/propers/*.json` (advent / christmas / lent / easter
 *      / ordinary-time — covers compline psalms that aren't in the rota)
 *   3. `src/data/loth/psalter-texts.json` (legacy flat catalog with
 *      `page`)
 *   4. `psalter-headers.rich.json` `refs[<ref>].entries[0].page` (header
 *      catalog — picks up compline psalms with no other reference)
 */
function buildPageMap() {
  const map = {}
  function walk(obj, source) {
    if (!obj || typeof obj !== 'object') return
    if (Array.isArray(obj)) {
      obj.forEach((o) => walk(o, source))
      return
    }
    if (obj.ref && typeof obj.page === 'number') {
      const t = obj.type
      if (
        t === 'psalm' ||
        t === 'canticle' ||
        t === 'oldTestamentCanticle' ||
        t === 'newTestamentCanticle' ||
        t === 'gospelCanticle'
      ) {
        if (!map[obj.ref]) map[obj.ref] = { page: obj.page, source }
      }
    }
    Object.values(obj).forEach((v) => walk(v, source))
  }
  for (let w = 1; w <= 4; w++) {
    const file = `src/data/loth/psalter/week-${w}.json`
    walk(JSON.parse(readFileSync(file, 'utf-8')), `week-${w}`)
  }
  const propersDir = 'src/data/loth/propers'
  if (existsSync(propersDir)) {
    for (const f of readdirSync(propersDir)) {
      if (!f.endsWith('.json')) continue
      const file = joinPath(propersDir, f)
      try {
        walk(JSON.parse(readFileSync(file, 'utf-8')), `propers/${f}`)
      } catch {
        // ignore parse errors — propers may carry comments in some places
      }
    }
  }
  // Pass 3 — flat catalog with `page` key.
  try {
    const flat = JSON.parse(readFileSync(PSALTER_TEXTS, 'utf-8'))
    for (const [ref, body] of Object.entries(flat)) {
      if (typeof body?.page === 'number' && !map[ref]) {
        map[ref] = { page: body.page, source: 'psalter-texts.json' }
      }
    }
  } catch {
    // ignore
  }
  // Pass 4 — header catalog last.
  try {
    const headers = JSON.parse(readFileSync(HEADERS, 'utf-8'))
    for (const [ref, body] of Object.entries(headers.refs || {})) {
      if (map[ref]) continue
      const p = body?.entries?.[0]?.page
      if (typeof p === 'number') map[ref] = { page: p, source: 'psalter-headers' }
    }
  } catch {
    // ignore
  }
  return map
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

function classifyResult(result, ref) {
  if (result.ok) return { verdict: 'PASS', detail: '' }
  const refIssues = (result.issues || []).filter((i) => i.ref === ref)
  if (refIssues.length === 0) return { verdict: 'OTHER', detail: 'no ref-specific issue' }
  const i = refIssues[0]
  const k = i.kind || i.error
  if (k === 'LINE_COUNT_MISMATCH') {
    return {
      verdict: 'DRIFT_LINE_COUNT',
      detail: `block ${i.blockIndex}: rich=${i.richLineCount} ext=${i.extractorLineCount} richFirst="${(i.richFirstLine || '').slice(0, 30)}"`,
    }
  }
  if (k === 'NO_MATCHING_EXTRACTOR_STANZA') {
    return {
      verdict: 'DRIFT_NO_MATCH',
      detail: `block ${i.blockIndex}: richFirst="${(i.richFirstLine || '').slice(0, 30)}"`,
    }
  }
  if (k === 'INCOMPLETE_COVERAGE') {
    return { verdict: 'INCOMPLETE_COVERAGE', detail: i.error }
  }
  if (k === 'REF_NOT_FOUND') {
    return { verdict: 'REF_NOT_FOUND', detail: '' }
  }
  return { verdict: 'OTHER', detail: k || 'unknown' }
}

function processOne(ref, page, pdfPath, richData) {
  const start = bookPageToPhysical(page)
  let lastResult = null
  let lastVerdict = null
  let extractorStanzaCount = 0
  let extractorStanzas = []
  for (let depth = 0; depth <= MULTI_PAGE_DEPTH; depth++) {
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
    const verdictInfo = classifyResult(result, ref)
    lastResult = result
    lastVerdict = verdictInfo
    if (verdictInfo.verdict === 'PASS') break
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
    extractorStanzas,
  }
}

function summarisePlan(plan) {
  // Boundary count + refrain-detection signal per stanza in the plan's
  // updates. A stanza is "refrain-detected" when at least one of its
  // paragraphBoundaries values is plausibly the START of a refrain — we
  // can only tell from the extractor stanza, so we instead count
  // paragraphBoundaries arrays that have multiple entries (single-entry
  // PB is more often a single-paragraph break than a refrain enter+exit
  // pattern; multi-entry PB strongly correlates with refrain).
  if (!plan) return { boundaries: 0, refrainStanzas: 0 }
  let boundaries = 0
  let refrainStanzas = 0
  for (const u of plan.updates) {
    const pb = u.paragraphBoundaries || []
    boundaries += pb.length
    if (pb.length >= 2) refrainStanzas += 1
  }
  return { boundaries, refrainStanzas }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const pdfPath = args.pdf || 'public/psalter.pdf'
  const richData = JSON.parse(readFileSync(TARGET, 'utf-8'))
  const allRefs = Object.keys(richData)
  const pageMap = buildPageMap()

  // Scope: every rich.json ref except the #417 override.
  const refsInScope = []
  const refsExcluded = []
  const refsMissingPage = []
  for (const ref of allRefs) {
    if (EXCLUDE_REFS.has(ref)) {
      refsExcluded.push(ref)
      continue
    }
    const meta = pageMap[ref]
    if (!meta) {
      refsMissingPage.push(ref)
      continue
    }
    refsInScope.push({ ref, page: meta.page, source: meta.source })
  }

  process.stdout.write(
    `Scope: ${refsInScope.length} refs in scope; ${refsExcluded.length} excluded; ${refsMissingPage.length} missing page\n`,
  )
  if (refsExcluded.length > 0) {
    process.stdout.write(`  Excluded (#417 override): ${refsExcluded.join(', ')}\n`)
  }
  if (refsMissingPage.length > 0) {
    process.stdout.write(`  Missing page (skipped): ${refsMissingPage.join(', ')}\n`)
  }

  const results = []
  for (let i = 0; i < refsInScope.length; i++) {
    const { ref, page } = refsInScope[i]
    process.stderr.write(
      `\r[${i + 1}/${refsInScope.length}] ${ref.padEnd(40)} page=${page}  `,
    )
    const r = processOne(ref, page, pdfPath, richData)
    results.push(r)
  }
  process.stderr.write('\n')

  // Counts by verdict.
  const counts = {}
  for (const r of results) {
    counts[r.verdict] = (counts[r.verdict] ?? 0) + 1
  }

  // Build atomic batch from PASS refs.
  const passResults = results.filter((r) => r.verdict === 'PASS')
  const batches = passResults.map((r) => ({ ref: r.ref, stanzas: r.extractorStanzas }))
  const aggregate = injectPhrasesIntoRichData(richData, batches)
  const reviewQueue = collectReviewQueue(batches)

  // Diff stats: how many refs / blocks / boundaries the inject changes.
  let blocksTouched = 0
  let totalBoundaries = 0
  let refsWithBoundaries = 0
  let refrainStanzaCount = 0
  for (const refPlan of aggregate.plan || []) {
    const summary = summarisePlan(refPlan)
    totalBoundaries += summary.boundaries
    refrainStanzaCount += summary.refrainStanzas
    if (summary.boundaries > 0) refsWithBoundaries += 1
    blocksTouched += refPlan.updates.length
  }

  // Refs whose PB content actually changes (vs current rich.json).
  let refsWithBoundaryDelta = 0
  if (aggregate.ok) {
    for (const refPlan of aggregate.plan) {
      const oldBlocks = richData[refPlan.ref]?.stanzasRich?.blocks || []
      const newBlocks = aggregate.data[refPlan.ref]?.stanzasRich?.blocks || []
      let changed = false
      for (let i = 0; i < oldBlocks.length; i++) {
        const oldPB = JSON.stringify(oldBlocks[i]?.paragraphBoundaries || [])
        const newPB = JSON.stringify(newBlocks[i]?.paragraphBoundaries || [])
        if (oldPB !== newPB) {
          changed = true
          break
        }
      }
      if (changed) refsWithBoundaryDelta += 1
    }
  }

  process.stdout.write(`\nVerdict counts:\n`)
  for (const [v, n] of Object.entries(counts).sort()) {
    process.stdout.write(`  ${v}: ${n}\n`)
  }
  process.stdout.write(
    `\nAggregate atomic gate: ${aggregate.ok ? 'PASS' : 'FAIL (' + (aggregate.issues?.length ?? 0) + ' issue(s))'}\n`,
  )
  process.stdout.write(
    `  Refs (PASS, in batch): ${passResults.length}\n` +
      `  Refs with paragraphBoundaries delta: ${refsWithBoundaryDelta}\n` +
      `  Refs whose new PB has any boundaries: ${refsWithBoundaries}\n` +
      `  Stanza blocks touched (planned): ${blocksTouched}\n` +
      `  Total paragraphBoundaries entries: ${totalBoundaries}\n` +
      `  Refrain-style (multi-PB) stanzas: ${refrainStanzaCount}\n` +
      `  Curator review queue (needsReview): ${reviewQueue.length}\n`,
  )

  // Per-ref summary table (compact).
  process.stdout.write('\nPer-ref verdicts (non-PASS only):\n')
  for (const r of results) {
    if (r.verdict === 'PASS') continue
    process.stdout.write(
      `  ${r.verdict.padEnd(20)} ${r.ref.padEnd(40)} page=${String(r.page).padEnd(4)} ${r.detail || ''}\n`,
    )
  }

  if (args.json) {
    const out = {
      counts,
      aggregateOk: aggregate.ok,
      passCount: passResults.length,
      refsWithBoundaryDelta,
      refsWithBoundaries,
      blocksTouched,
      totalBoundaries,
      refrainStanzaCount,
      reviewQueueCount: reviewQueue.length,
      refsExcluded,
      refsMissingPage,
      results: results.map(({ extractorStanzas, ...rest }) => rest),
      reviewQueue,
    }
    writeFileSync(args.json, JSON.stringify(out, null, 2) + '\n', 'utf-8')
    process.stdout.write(`\nfull plan saved to ${args.json}\n`)
  }

  if (args.inject) {
    if (!aggregate.ok) {
      process.stderr.write(
        '\ninject FAILED — aggregate atomic gate did not pass:\n' +
          renderDryRun(aggregate) +
          '\n',
      )
      process.exit(4)
    }
    writeFileSync(TARGET, JSON.stringify(aggregate.data, null, 2) + '\n', 'utf-8')
    process.stdout.write(
      `\ninject OK — ${passResults.length} ref(s) updated in ${TARGET}\n`,
    )

    // Persist review queue regardless of dry-run, but ONLY when we are
    // actually writing data (so a curator audit doesn't go stale against
    // unchanged rich.json). M-1 from review-419.
    mkdirSync(dirname(REVIEW_QUEUE_PATH), { recursive: true })
    writeFileSync(REVIEW_QUEUE_PATH, JSON.stringify(reviewQueue, null, 2) + '\n', 'utf-8')
    process.stdout.write(
      `review queue: ${reviewQueue.length} stanza(s) flagged → ${REVIEW_QUEUE_PATH}\n`,
    )
  }
}

main()
