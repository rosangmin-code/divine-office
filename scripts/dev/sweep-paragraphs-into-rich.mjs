#!/usr/bin/env node
/**
 * sweep-paragraphs-into-rich.mjs — F-X11 Phase 2 R-3 (#503) Sweep driver.
 *
 * Replaces the F-X11 Phase 2-A text-based extractor
 * (`scripts/parsers/extract-phrases-from-pdf.mjs`) with the new
 * pdfplumber y-gap extractor (`scripts/lib/extract-paragraphs-from-pdf.py`,
 * Phase 2 R-2 / #501 SoT).
 *
 * Flow per ref → per stanza block:
 *   1. Look up the ref's starting book page via `buildPageMap` (shared with
 *      `process-fx11-phase2-batch.mjs`).
 *   2. Convert to physical PDF page idx (0-indexed) + starting column hint
 *      via `bookPageToPhysical`.
 *   3. Build a pages window `[physical, physical+1, ..., physical+DEPTH]`.
 *   4. Call the Python extractor with `--column multi` so cross-column
 *      and cross-page joins are skipped naturally in the gap stream.
 *   5. Collect the matched `paragraphBoundaries` and pin them back onto
 *      the stanza block in-memory.
 *
 * After every block of every ref has been visited, the in-memory rich.json
 * is written atomically (one fs.writeFileSync). On any block FAIL, the
 * sweep aborts and rich.json is NOT written.
 *
 * Idempotency contract (#501 carry-over):
 *   Psalm 42:2-6 and Psalm 63:2-9 are re-extracted by this sweep but MUST
 *   produce the same PB the Pilot wrote (`b0=[4,8,12]`, `b3=[3,7,11,15,19]`
 *   for 42; `b0=[2,8]`, `b1=[6]` for 63). The end-of-run report records
 *   any drift on those two refs as a regression flag.
 *
 * Usage:
 *   node scripts/dev/sweep-paragraphs-into-rich.mjs              # dry-run summary
 *   node scripts/dev/sweep-paragraphs-into-rich.mjs --inject     # write rich.json
 *   node scripts/dev/sweep-paragraphs-into-rich.mjs --json out.json
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname, join as joinPath } from 'node:path'
import { bookPageToPhysical } from '../parsers/book-page-mapper.mjs'

const __filename = fileURLToPath(import.meta.url)
const ROOT = resolve(dirname(__filename), '..', '..')
const RICH_PATH = resolve(
  ROOT,
  'src/data/loth/prayers/commons/psalter-texts.rich.json',
)
const HEADERS_PATH = resolve(
  ROOT,
  'src/data/loth/prayers/commons/psalter-headers.rich.json',
)
const PSALTER_TEXTS = resolve(ROOT, 'src/data/loth/psalter-texts.json')
const PDF_PATH = resolve(ROOT, 'public/psalter.pdf')
const EXTRACTOR = resolve(ROOT, 'scripts/lib/extract-paragraphs-from-pdf.py')
const PY = '/home/min/venv/bin/python3'
const SCRATCH = resolve(ROOT, '.pair-cowork-scratch/sweep-paragraphs')

// How many pages forward to gather when calling the extractor with
// `--column multi`. 4 pages forward = 8 columns of text, enough to
// catch a stanza block that spills off the starting column into the
// adjacent column / page (mirror of MULTI_PAGE_DEPTH in process-fx11-
// phase2-batch.mjs).
const MULTI_PAGE_DEPTH = 4

// Orphan refs — refs that exist in rich.json but aren't referenced
// from any week-N.json / propers / psalter-texts.json / psalter-
// headers.rich.json. Without an entry here, buildPageMap returns
// undefined and the sweep can't locate the block in the PDF.
//
// Psalm 31:1-17 — text-only entry from `psalter-texts.json` (no
// `page` field). Resolved by PDF spot-check (#503 dry-run):
// physical page 265 right column → book page 529.
const PAGE_MAP_OVERRIDES = {
  'Psalm 31:1-17': { page: 529, source: 'override-#503' },
}

// Known data-quality issues that prevent a single block from being
// re-extracted by the y-gap mechanism. Skipped blocks retain their
// existing paragraphBoundaries unchanged (no overwrite). The sweep
// reports them as SKIPPED rather than FAILED so the inject can
// proceed atomically.
//
// Psalm 31:1-17 b1 — `lines[0]` is the section-title noise
// "Шөнийн даатгал залбирал" (running compline-page header), not
// genuine stanza content. The page-header filter drops it from the
// PDF stream, so the rich anchor cannot match. Existing PB is []
// (nothing to preserve); skipping is a no-op. A separate data-
// quality task should strip the spurious header from the rich.json
// block. (See `feedback_pdf_ssot_verbatim` memory note.)
const KNOWN_SKIP_BLOCKS = new Set([
  'Psalm 31:1-17#1',
])

function ensureScratch() {
  if (!existsSync(SCRATCH)) mkdirSync(SCRATCH, { recursive: true })
}

/**
 * Build ref → starting book page map. Priority chain mirrors the F-X11
 * Phase 2 batch (`scripts/dev/process-fx11-phase2-batch.mjs`):
 *   1. week-1..4.json (psalter rota)
 *   2. propers/*.json
 *   3. psalter-texts.json flat
 *   4. psalter-headers.rich.json (fallback for refs that aren't on the
 *      rota at all, e.g. Sunday First Vespers psalms that share the
 *      header but no entry in week-1)
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
    const file = resolve(ROOT, `src/data/loth/psalter/week-${w}.json`)
    walk(JSON.parse(readFileSync(file, 'utf-8')), `week-${w}`)
  }
  const propersDir = resolve(ROOT, 'src/data/loth/propers')
  if (existsSync(propersDir)) {
    for (const f of readdirSync(propersDir)) {
      if (!f.endsWith('.json')) continue
      try {
        walk(JSON.parse(readFileSync(joinPath(propersDir, f), 'utf-8')), `propers/${f}`)
      } catch {
        // ignore
      }
    }
  }
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
  try {
    const headers = JSON.parse(readFileSync(HEADERS_PATH, 'utf-8'))
    for (const [ref, body] of Object.entries(headers.refs || {})) {
      if (map[ref]) continue
      const p = body?.entries?.[0]?.page
      if (typeof p === 'number') map[ref] = { page: p, source: 'psalter-headers' }
    }
  } catch {
    // ignore
  }
  // Final pass — orphan refs that aren't referenced from any rota /
  // propers / catalog. Override entries are PDF-verified at the time
  // they are added (see PAGE_MAP_OVERRIDES comment block).
  for (const [ref, entry] of Object.entries(PAGE_MAP_OVERRIDES)) {
    if (!map[ref]) map[ref] = entry
  }
  return map
}

function extractBlockLines(block) {
  return block.lines.map((line) => {
    const span = (line.spans || []).find((s) => s.kind === 'text')
    if (!span) {
      throw new Error(
        `block line has no text span: ${JSON.stringify(line).slice(0, 100)}`,
      )
    }
    return span.text
  })
}

function safeName(ref, blockIndex) {
  return `${ref.replace(/[^a-zA-Z0-9]+/g, '_')}_b${blockIndex}.json`
}

function runExtractor({ ref, blockIndex, pages, blockLines }) {
  ensureScratch()
  const inputPath = resolve(SCRATCH, safeName(ref, blockIndex))
  writeFileSync(inputPath, JSON.stringify(blockLines), 'utf-8')
  const args = [
    EXTRACTOR,
    '--pdf', PDF_PATH,
    '--pages', pages.join(','),
    '--column', 'multi',
    '--block-lines-json', inputPath,
    '--ref', `${ref} block ${blockIndex}`,
  ]
  try {
    const stdout = execFileSync(PY, args, {
      encoding: 'utf-8',
      maxBuffer: 32 * 1024 * 1024,
    })
    return JSON.parse(stdout)
  } catch (err) {
    if (err.stdout) {
      try {
        const diag = JSON.parse(err.stdout)
        diag.error = diag.error || `exit ${err.status}`
        return diag
      } catch {
        // fall through
      }
    }
    return {
      matched: false,
      error: `extractor failed: ${err.message.split('\n')[0]}`,
    }
  }
}

function shallowEqArray(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

function pagesWindow(bookPage) {
  const { physical } = bookPageToPhysical(bookPage)
  // pdfplumber.pages is 0-indexed; book-page-mapper returns 1-indexed.
  const start0 = physical - 1
  const out = []
  for (let i = 0; i <= MULTI_PAGE_DEPTH; i++) {
    if (start0 + i >= 0) out.push(start0 + i)
  }
  return out
}

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i]
    if (!tok.startsWith('--')) continue
    const eq = tok.indexOf('=')
    if (eq > -1) {
      args[tok.slice(2, eq)] = tok.slice(eq + 1)
      continue
    }
    const key = tok.slice(2)
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

function classifyDelta(oldPB, newPB) {
  if (!Array.isArray(oldPB) && !Array.isArray(newPB)) return 'NEW' // no prior, no new
  if (!Array.isArray(oldPB)) return newPB.length === 0 ? 'NEW_EMPTY' : 'NEW_ADD'
  if (newPB.length === 0 && oldPB.length === 0) return 'SAME_EMPTY'
  if (shallowEqArray(oldPB, newPB)) return 'SAME'
  if (oldPB.length === 0) return 'ADD'
  if (newPB.length === 0) return 'REMOVE'
  return 'DIFF'
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const inject = !!args.inject
  const verbose = !!args.verbose

  const rich = JSON.parse(readFileSync(RICH_PATH, 'utf-8'))
  const pageMap = buildPageMap()
  const allRefs = Object.keys(rich)

  process.stdout.write(`Sweep scope: ${allRefs.length} refs in rich.json\n`)

  const results = []
  const refsMissingPage = []
  let blocksTotal = 0
  let blocksMatched = 0
  let blocksFailed = 0

  for (let i = 0; i < allRefs.length; i++) {
    const ref = allRefs[i]
    const refData = rich[ref]
    const meta = pageMap[ref]
    if (!meta) {
      refsMissingPage.push(ref)
      results.push({ ref, ok: false, reason: 'no page mapping found' })
      continue
    }
    const stanzaBlocks = (refData?.stanzasRich?.blocks || []).filter(
      (b) => b.kind === 'stanza',
    )
    if (stanzaBlocks.length === 0) {
      results.push({ ref, ok: true, blocks: [], note: 'no stanza blocks' })
      continue
    }
    const pages = pagesWindow(meta.page)
    const blockReports = []
    let refOk = true
    for (let bi = 0; bi < stanzaBlocks.length; bi++) {
      blocksTotal++
      const block = stanzaBlocks[bi]
      const blockKey = `${ref}#${bi}`
      if (KNOWN_SKIP_BLOCKS.has(blockKey)) {
        blockReports.push({
          blockIndex: bi,
          ok: true,
          skipped: true,
          reason: 'data-quality skip (KNOWN_SKIP_BLOCKS)',
          oldPB: Array.isArray(block.paragraphBoundaries)
            ? [...block.paragraphBoundaries]
            : null,
          newPB: null,
          delta: 'SKIP',
        })
        blocksMatched++ // skip-by-design counts as resolved
        continue
      }
      let blockLines
      try {
        blockLines = extractBlockLines(block)
      } catch (err) {
        refOk = false
        blocksFailed++
        blockReports.push({
          blockIndex: bi,
          ok: false,
          reason: err.message,
        })
        continue
      }
      const out = runExtractor({ ref, blockIndex: bi, pages, blockLines })
      if (!out.matched) {
        refOk = false
        blocksFailed++
        blockReports.push({
          blockIndex: bi,
          ok: false,
          reason: out.error || 'unmatched',
          pages,
          firstLine: blockLines[0]?.slice(0, 40),
          lineCount: blockLines.length,
        })
        continue
      }
      blocksMatched++
      const newPB = out.paragraphBoundaries || []
      const oldPB = Array.isArray(block.paragraphBoundaries)
        ? [...block.paragraphBoundaries]
        : null
      const delta = classifyDelta(oldPB, newPB)
      blockReports.push({
        blockIndex: bi,
        ok: true,
        lineCount: blockLines.length,
        medianGap: out.medianGap,
        thresholdPt: out.thresholdPt,
        oldPB,
        newPB,
        delta,
        stanzaBreakWarnings: out.stanzaBreakWarnings || [],
      })
    }
    results.push({ ref, ok: refOk, page: meta.page, source: meta.source, blocks: blockReports })
    process.stderr.write(`\r[${i + 1}/${allRefs.length}] ${ref.padEnd(40)} blocks=${blockReports.length} ${refOk ? 'OK' : 'FAIL'}   `)
  }
  process.stderr.write('\n')

  // Aggregate stats
  const deltaCounts = {}
  let oldPBTotal = 0
  let newPBTotal = 0
  let refsWithDelta = 0
  const driftRefs = []
  const addRefs = []
  const removeRefs = []
  const diffRefs = []

  for (const r of results) {
    if (!r.ok || !r.blocks) continue
    let refHasDelta = false
    let refOldPB = 0
    let refNewPB = 0
    for (const b of r.blocks) {
      if (!b.ok) continue
      deltaCounts[b.delta] = (deltaCounts[b.delta] ?? 0) + 1
      refOldPB += (b.oldPB || []).length
      refNewPB += (b.newPB || []).length
      if (b.delta !== 'SAME' && b.delta !== 'SAME_EMPTY' && b.delta !== 'NEW_EMPTY') {
        refHasDelta = true
      }
    }
    oldPBTotal += refOldPB
    newPBTotal += refNewPB
    if (refHasDelta) {
      refsWithDelta += 1
      driftRefs.push({ ref: r.ref, oldPB: refOldPB, newPB: refNewPB, blocks: r.blocks.filter(b=>b.ok && b.delta!=='SAME' && b.delta!=='SAME_EMPTY' && b.delta!=='NEW_EMPTY') })
    }
  }
  for (const dr of driftRefs) {
    for (const b of dr.blocks) {
      if (b.delta === 'ADD' || b.delta === 'NEW_ADD') addRefs.push(`${dr.ref} b${b.blockIndex}`)
      if (b.delta === 'REMOVE') removeRefs.push(`${dr.ref} b${b.blockIndex}`)
      if (b.delta === 'DIFF') diffRefs.push(`${dr.ref} b${b.blockIndex}`)
    }
  }

  process.stdout.write(`\nResults:\n`)
  process.stdout.write(`  total blocks: ${blocksTotal}\n`)
  process.stdout.write(`  matched: ${blocksMatched}\n`)
  process.stdout.write(`  failed: ${blocksFailed}\n`)
  process.stdout.write(`  refs missing page mapping: ${refsMissingPage.length}\n`)
  if (refsMissingPage.length > 0) {
    process.stdout.write(`    ${refsMissingPage.join('\n    ')}\n`)
  }
  process.stdout.write(`\nParagraphBoundaries totals: old=${oldPBTotal} new=${newPBTotal} delta=${newPBTotal - oldPBTotal}\n`)
  process.stdout.write(`Refs with delta: ${refsWithDelta}\n`)
  process.stdout.write(`Block-level delta counts:\n`)
  for (const [k, v] of Object.entries(deltaCounts).sort()) {
    process.stdout.write(`  ${k}: ${v}\n`)
  }
  process.stdout.write(`\nADDs (${addRefs.length}): ${addRefs.slice(0, 30).join(', ')}${addRefs.length > 30 ? ' …' : ''}\n`)
  process.stdout.write(`REMOVEs (${removeRefs.length}): ${removeRefs.slice(0, 30).join(', ')}${removeRefs.length > 30 ? ' …' : ''}\n`)
  process.stdout.write(`DIFFs (${diffRefs.length}): ${diffRefs.slice(0, 30).join(', ')}${diffRefs.length > 30 ? ' …' : ''}\n`)

  // Idempotency check on Pilot refs (Psalm 42 / Psalm 63)
  const PILOT_EXPECT = {
    'Psalm 63:2-9': { 0: [2, 8], 1: [6] },
    'Psalm 42:2-6': { 0: [4, 8, 12], 1: [], 2: [], 3: [3, 7, 11, 15, 19] },
  }
  const idempotencyIssues = []
  for (const [ref, blocks] of Object.entries(PILOT_EXPECT)) {
    const refResult = results.find((r) => r.ref === ref)
    if (!refResult?.ok) {
      idempotencyIssues.push(`${ref}: ref not OK in sweep`)
      continue
    }
    for (const [biStr, expected] of Object.entries(blocks)) {
      const bi = Number(biStr)
      const blockReport = refResult.blocks.find((b) => b.blockIndex === bi)
      if (!blockReport) {
        idempotencyIssues.push(`${ref} b${bi}: missing from report`)
        continue
      }
      if (!shallowEqArray(blockReport.newPB || [], expected)) {
        idempotencyIssues.push(
          `${ref} b${bi}: got ${JSON.stringify(blockReport.newPB)} expected ${JSON.stringify(expected)}`,
        )
      }
    }
  }
  process.stdout.write(`\nIdempotency check (Pilot Psalm 42/63):\n`)
  if (idempotencyIssues.length === 0) {
    process.stdout.write(`  ✓ bit-identical to #501 Pilot\n`)
  } else {
    for (const m of idempotencyIssues) process.stdout.write(`  ✗ ${m}\n`)
  }

  // Apply in-memory mutations for PASS refs (skipped blocks retain
  // existing PB — they are not mutated)
  let blocksApplied = 0
  let blocksSkipped = 0
  for (const r of results) {
    if (!r.ok || !r.blocks) continue
    const stanzaBlocks = rich[r.ref].stanzasRich.blocks.filter((b) => b.kind === 'stanza')
    for (const b of r.blocks) {
      if (!b.ok) continue
      if (b.skipped) {
        blocksSkipped++
        continue
      }
      const block = stanzaBlocks[b.blockIndex]
      if (!block) continue
      const newPB = b.newPB || []
      if (newPB.length === 0) {
        if ('paragraphBoundaries' in block) delete block.paragraphBoundaries
      } else {
        block.paragraphBoundaries = newPB
      }
      blocksApplied++
    }
  }
  if (blocksSkipped > 0) {
    process.stdout.write(`\nSkipped blocks (KNOWN_SKIP_BLOCKS): ${blocksSkipped}\n`)
  }

  if (args.json) {
    writeFileSync(args.json, JSON.stringify({
      summary: {
        totalRefs: allRefs.length,
        refsMissingPage: refsMissingPage.length,
        blocksTotal,
        blocksMatched,
        blocksFailed,
        oldPBTotal,
        newPBTotal,
        refsWithDelta,
        deltaCounts,
        idempotencyIssues,
      },
      refsMissingPage,
      results: results.map(({ blocks, ...rest }) => ({ ...rest, blocks })),
    }, null, 2) + '\n', 'utf-8')
    process.stdout.write(`\nfull plan saved to ${args.json}\n`)
  }

  const refFailures = results.filter((r) => !r.ok)
  if (refFailures.length > 0) {
    process.stdout.write(`\nRef failures (${refFailures.length}):\n`)
    for (const f of refFailures) {
      const failedBlocks = (f.blocks || []).filter(b => !b.ok)
      if (failedBlocks.length === 0) {
        process.stdout.write(`  ${f.ref}: ${f.reason || 'unknown'}\n`)
      } else {
        process.stdout.write(`  ${f.ref}: ${failedBlocks.length} block(s) failed\n`)
        for (const b of failedBlocks) {
          process.stdout.write(`    b${b.blockIndex}: ${b.reason} firstLine="${(b.firstLine || '').slice(0,40)}" pages=${JSON.stringify(b.pages)}\n`)
        }
      }
    }
  }

  if (!inject) {
    process.stdout.write(`\n--dry-run: rich.json NOT written. Use --inject to write.\n`)
    if (verbose) {
      for (const r of results) {
        if (!r.ok) continue
        const drifted = (r.blocks || []).filter(b => b.ok && b.delta !== 'SAME' && b.delta !== 'SAME_EMPTY' && b.delta !== 'NEW_EMPTY')
        if (drifted.length === 0) continue
        process.stdout.write(`  ${r.ref}:\n`)
        for (const b of drifted) {
          process.stdout.write(`    b${b.blockIndex} ${b.delta}: old=${JSON.stringify(b.oldPB)} new=${JSON.stringify(b.newPB)}\n`)
        }
      }
    }
    return
  }

  // Atomic write
  if (refFailures.length > 0) {
    process.stderr.write(`\nABORT: ${refFailures.length} ref(s) had failures — rich.json NOT written.\n`)
    process.exit(2)
  }
  writeFileSync(RICH_PATH, JSON.stringify(rich, null, 2) + '\n', 'utf-8')
  process.stdout.write(`\n✓ wrote ${RICH_PATH} (${blocksApplied} block(s) updated)\n`)
}

// Module exports for testing.
export { buildPageMap, pagesWindow, classifyDelta, shallowEqArray, parseArgs }

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main()
}
