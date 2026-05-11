#!/usr/bin/env node
/**
 * build-paragraphs-into-rich.mjs — F-X11 Phase 2 R-2 (#501) paragraph
 * builder bridge.
 *
 * Pilot scope (Psalm 42:2-6 + Psalm 63:2-9 only):
 *   - For each `(ref, blockIndex)` in the per-block manifest, write the
 *     block's logical lines to a temp JSON, call the Python pdfplumber
 *     extractor (`scripts/lib/extract-paragraphs-from-pdf.py`), parse the
 *     emitted `paragraphBoundaries`, and inject it into the matching
 *     stanza block of `src/data/loth/prayers/commons/psalter-texts.rich.
 *     json`.
 *   - Old `paragraphBoundaries` (if any) are diffed against new and
 *     reported as a cross-check signal. The new value REPLACES the old.
 *     (Pilot policy: PDF y-coord is the SSOT; F-X11 text-based heuristic
 *     was a stop-gap.)
 *   - Atomic: if any extractor invocation fails to MATCH, rich.json is
 *     not written. Per-block failures are surfaced with the extractor's
 *     diagnostic JSON.
 *   - `--dry-run`: report the plan + diff, do not write.
 *
 * Pilot manifest (in-script) — 4 stanza blocks for Psalm 42:2-6 (only
 * block 0 carries paragraph content; blocks 1-2 are refrains and block
 * 3 is the long second body), 2 stanza blocks for Psalm 63:2-9. Page
 * indices were verified via `scripts/lib/probe-pdf-page.py`. Refrain
 * blocks are included so the extractor's PB output (always empty for
 * them) can be sanity-checked against the existing PB value.
 *
 * Out of scope for Pilot:
 *   - Sweep over remaining 122 refs (separate task)
 *   - paragraphBoundaries verifier (R-4 separate task)
 *   - Non-Pilot ref entries
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const ROOT = resolve(dirname(__filename), '..')
const RICH_PATH = resolve(
  ROOT,
  'src/data/loth/prayers/commons/psalter-texts.rich.json',
)
const PDF_PATH = resolve(ROOT, 'public/psalter.pdf')
const EXTRACTOR = resolve(ROOT, 'scripts/lib/extract-paragraphs-from-pdf.py')
const PY = '/home/min/venv/bin/python3'
const SCRATCH = resolve(ROOT, '.pair-cowork-scratch/build-paragraphs')

// Pilot manifest — Psalm 42:2-6 + Psalm 63:2-9.
// Page indices verified via probe-pdf-page.py (#501 R-2 pre-flight).
// Each entry maps ONE rich.json stanza block to its physical PDF
// location. Column hint is required because the column-aware filter
// (x0 < 297) selects the correct half of the 2-column LotH layout.
export const PILOT_MANIFEST = [
  // Psalm 63:2-9
  { ref: 'Psalm 63:2-9', blockIndex: 0, pages: [29], column: 'left' },
  { ref: 'Psalm 63:2-9', blockIndex: 1, pages: [29], column: 'right' },
  // Psalm 42:2-6 — body part 1 (page 195 LOTH = idx 97 right)
  { ref: 'Psalm 42:2-6', blockIndex: 0, pages: [97], column: 'right' },
  // Refrain ("Сэтгэл минь ээ...") on page 196 left
  { ref: 'Psalm 42:2-6', blockIndex: 1, pages: [98], column: 'left' },
  // Refrain repeat ("Яагаад чи дотор минь...") on page 197 right
  { ref: 'Psalm 42:2-6', blockIndex: 2, pages: [98], column: 'right' },
  // Body part 2 ("Сэтгэл минь миний дотор...") on page 196 left
  { ref: 'Psalm 42:2-6', blockIndex: 3, pages: [98], column: 'left' },
]

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

function shallowEqArray(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

function ensureScratch() {
  if (!existsSync(SCRATCH)) mkdirSync(SCRATCH, { recursive: true })
}

function runExtractor({ ref, blockIndex, pages, column, blockLines }) {
  ensureScratch()
  const inputPath = resolve(
    SCRATCH,
    `${ref.replace(/[^a-zA-Z0-9]+/g, '_')}_b${blockIndex}.json`,
  )
  writeFileSync(inputPath, JSON.stringify(blockLines), 'utf-8')
  const args = [
    EXTRACTOR,
    '--pdf', PDF_PATH,
    '--pages', pages.join(','),
    '--column', column,
    '--block-lines-json', inputPath,
    '--ref', `${ref} block ${blockIndex}`,
  ]
  let stdout
  try {
    stdout = execFileSync(PY, args, {
      encoding: 'utf-8',
      maxBuffer: 16 * 1024 * 1024,
    })
  } catch (err) {
    // Extractor exits 2 on no-match; capture its diagnostic JSON.
    if (err.stdout) {
      try {
        const diag = JSON.parse(err.stdout)
        diag.error = diag.error || `exit ${err.status}`
        return diag
      } catch {
        // fall through
      }
    }
    throw new Error(
      `extractor failed for ${ref} block ${blockIndex}: ${err.message}`,
    )
  }
  return JSON.parse(stdout)
}

function loadRich() {
  return JSON.parse(readFileSync(RICH_PATH, 'utf-8'))
}

function saveRich(data) {
  // Match existing rich.json formatting: 2-space indent + trailing newline.
  writeFileSync(RICH_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

function main() {
  const argv = process.argv.slice(2)
  const dryRun = argv.includes('--dry-run')
  const verbose = argv.includes('--verbose')

  const rich = loadRich()
  const reports = []
  let allMatched = true

  for (const entry of PILOT_MANIFEST) {
    const { ref, blockIndex, pages, column } = entry
    const refData = rich[ref]
    if (!refData?.stanzasRich?.blocks) {
      reports.push({
        ref,
        blockIndex,
        ok: false,
        reason: 'ref not found or has no stanzasRich.blocks',
      })
      allMatched = false
      continue
    }
    const blocks = refData.stanzasRich.blocks.filter(
      (b) => b.kind === 'stanza',
    )
    const block = blocks[blockIndex]
    if (!block) {
      reports.push({
        ref,
        blockIndex,
        ok: false,
        reason: `stanza block ${blockIndex} not found (have ${blocks.length})`,
      })
      allMatched = false
      continue
    }
    const blockLines = extractBlockLines(block)
    const out = runExtractor({ ref, blockIndex, pages, column, blockLines })
    if (!out.matched) {
      reports.push({
        ref,
        blockIndex,
        ok: false,
        reason: out.error || 'unmatched',
        diag: out,
      })
      allMatched = false
      continue
    }
    const newPB = out.paragraphBoundaries || []
    const oldPB = Array.isArray(block.paragraphBoundaries)
      ? [...block.paragraphBoundaries]
      : null
    const same = oldPB !== null && shallowEqArray(oldPB, newPB)
    reports.push({
      ref,
      blockIndex,
      ok: true,
      lineCount: blockLines.length,
      medianGap: out.medianGap,
      thresholdPt: out.thresholdPt,
      newPB,
      oldPB,
      diffStatus: oldPB === null ? 'NEW' : same ? 'SAME' : 'DIFF',
      stanzaBreakWarnings: out.stanzaBreakWarnings || [],
      consumption: out.consumption || [],
      pages,
      column,
    })
    // Mutate block in-place. Apply policy: PDF y-coord SoT replaces
    // existing PB. Empty PB → remove the field (so blocks without
    // paragraphs stay clean and don't carry an empty array).
    // Find the actual stanza block in the original blocks array (not
    // filtered) and update it. Since stanza blocks are the only ones
    // we're considering, refind by reference.
    if (newPB.length === 0) {
      delete block.paragraphBoundaries
    } else {
      block.paragraphBoundaries = newPB
    }
  }

  // Print structured summary.
  console.log('build-paragraphs-into-rich summary')
  console.log('='.repeat(60))
  for (const r of reports) {
    if (!r.ok) {
      console.log(
        `  [FAIL] ${r.ref} b${r.blockIndex}: ${r.reason}${r.diag ? ' (' + JSON.stringify(r.diag).slice(0, 200) + ')' : ''}`,
      )
      continue
    }
    const consumed = r.consumption.filter((c) => c > 1).length
    const wrapNote = consumed ? ` wraps=${consumed}` : ''
    console.log(
      `  [${r.diffStatus}] ${r.ref} b${r.blockIndex} lines=${r.lineCount} median=${r.medianGap}pt threshold=${r.thresholdPt}pt${wrapNote}` +
        `\n    old=${JSON.stringify(r.oldPB)} new=${JSON.stringify(r.newPB)}` +
        (r.stanzaBreakWarnings.length
          ? `\n    WARN stanza-level gaps inside block: ${JSON.stringify(r.stanzaBreakWarnings)}`
          : ''),
    )
  }

  if (!allMatched) {
    console.error('\nABORT: one or more blocks unmatched — rich.json NOT written.')
    process.exit(2)
  }
  if (dryRun) {
    console.log('\n--dry-run: rich.json NOT written.')
    return
  }
  saveRich(rich)
  console.log(`\n✓ wrote ${RICH_PATH}`)
  if (verbose) {
    for (const r of reports) {
      console.log(JSON.stringify(r))
    }
  }
}

// Module export for testing.
export { runExtractor, extractBlockLines, shallowEqArray, PILOT_MANIFEST as _PILOT_MANIFEST }

// CLI entry — resolve argv[1] to an absolute path before comparing,
// otherwise `node scripts/build-paragraphs-into-rich.mjs` (relative
// path) silently no-ops because process.argv[1] is the bare relative
// path while `fileURLToPath(import.meta.url)` is absolute.
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main()
}
