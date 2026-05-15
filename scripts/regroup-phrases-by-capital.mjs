#!/usr/bin/env node
/**
 * regroup-phrases-by-capital.mjs — Phase 1 Pilot helper (#498) + Sweep CLI (#499).
 *
 * Apply `regroupPhrasesByCapitalStart` (exported from
 * `scripts/build-phrases-into-rich.mjs`) to every `kind:'stanza'` block of
 * the refs passed via `--refs`, OR to every ref of the target file that
 * carries `stanzasRich.blocks` via `--all-refs` (#499 Sweep).
 *
 * Scope notes:
 *   - Pilot (#498): only `--refs "Psalm 63:2-9" "Psalm 42:2-6"`.
 *   - Sweep (#499): `--all-refs` rewrites every ref in the file (124).
 *     The rewrite is IDEMPOTENT — applying twice produces the same JSON.
 *     The CLI reports per-ref delta so the operator can audit "no-change",
 *     "merge-N", and "shrink-to-1" cases at a glance.
 *
 * What it does NOT change:
 *   - `lines[]` (text + indent + role) — UNTOUCHED.
 *   - `paragraphBoundaries` — UNTOUCHED (still indexes into `lines[]`).
 *   - Any block whose `kind` is not 'stanza'.
 *   - Any ref without `stanzasRich.blocks` (e.g., antiphon-only refs).
 *
 * What it DOES change:
 *   - `phrases` array of each matching stanza block — REPLACED with the
 *     capital-start re-grouping. Empty input → empty output (no crash).
 *
 * CLI:
 *   # Targeted (pilot) shape:
 *   node scripts/regroup-phrases-by-capital.mjs \
 *     --target src/data/loth/prayers/commons/psalter-texts.rich.json \
 *     --refs "Psalm 63:2-9" "Psalm 42:2-6" \
 *     [--dry-run] [--summary-json <path>]
 *
 *   # Sweep shape:
 *   node scripts/regroup-phrases-by-capital.mjs \
 *     --all-refs [--dry-run] [--summary-json <path>]
 *
 *   --dry-run:        print before/after phrase counts per block, do not write.
 *   --target:         alternate rich.json (default = canonical psalter file).
 *   --refs:           one or more ref keys (positional after the flag).
 *   --all-refs:       rewrite every ref with `stanzasRich.blocks` in the file.
 *                     Mutually exclusive with --refs.
 *   --force-inject:   override the "no-prior-phrases" scope guard and inject
 *                     capital-start phrases into every targeted stanza block
 *                     regardless of prior state. Used when seeding phrases
 *                     for refs added AFTER the F-X11 sweep cohort (#499) —
 *                     e.g. WI-15 끝기도 시편 6개 catalog entries whose lines[]
 *                     were land-ed verbatim from PDF SoT but never went
 *                     through the original PDF-extract→regroup chain. The
 *                     final visual result is identical to the canonical
 *                     F-X11 cohort (regrouped per task #498/#499), so this
 *                     flag is the simpler bridge for late-seeded refs.
 *   --summary-json:   also emit machine-readable per-ref summary to <path>.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { regroupPhrasesByCapitalStart } from './build-phrases-into-rich.mjs'

const DEFAULT_TARGET = 'src/data/loth/prayers/commons/psalter-texts.rich.json'

function parseCliArgs(argv) {
  const args = {
    target: DEFAULT_TARGET,
    refs: [],
    dryRun: false,
    allRefs: false,
    forceInject: false,
    summaryJson: null,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--target') {
      args.target = argv[++i]
    } else if (a === '--dry-run') {
      args.dryRun = true
    } else if (a === '--all-refs') {
      args.allRefs = true
    } else if (a === '--force-inject') {
      args.forceInject = true
    } else if (a === '--summary-json') {
      args.summaryJson = argv[++i]
    } else if (a === '--refs') {
      // Collect every positional token after --refs until the next flag.
      while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        args.refs.push(argv[++i])
      }
    } else {
      throw new Error(`Unknown arg: ${a}`)
    }
  }
  if (args.allRefs && args.refs.length) {
    throw new Error('--all-refs and --refs are mutually exclusive.')
  }
  if (!args.allRefs && !args.refs.length) {
    throw new Error('Pass --refs <key>… or --all-refs.')
  }
  return args
}

/**
 * Collect every ref key whose value carries `stanzasRich.blocks`. Used by
 * `--all-refs` to drive the sweep (#499). Refs without stanza blocks
 * (e.g., antiphon-only entries) are skipped silently.
 */
export function listStanzaRefs(richData) {
  const out = []
  for (const ref of Object.keys(richData)) {
    const blocks = richData[ref]?.stanzasRich?.blocks
    if (Array.isArray(blocks) && blocks.some((b) => b?.kind === 'stanza')) {
      out.push(ref)
    }
  }
  return out
}

/**
 * Apply capital-start regrouping to every `kind:'stanza'` block of the
 * given ref. Returns a summary the CLI prints (or the test asserts on).
 *
 * Scope-preservation contract (#499 Sweep): by default, ONLY blocks that
 * already carry a non-empty `phrases` array are rewritten. Blocks whose
 * `phrases` was previously absent or empty are SKIPPED — that path falls
 * back to the legacy line-render in `psalm-block.tsx`, and we do not
 * want the sweep to silently flip those refs over to phrase rendering
 * (different indent classes / hanging indent → visual change for blocks
 * outside the F-X11 phrase-injection cohort).
 *
 * Pass `forceInject: true` to override and inject phrases into every
 * stanza block regardless of prior state — used by the unit test suite
 * (and any future task that explicitly opts into broader scope).
 */
export function regroupRef(richData, ref, { forceInject = false } = {}) {
  const refData = richData[ref]
  if (!refData) {
    throw new Error(`Ref not found in target: ${ref}`)
  }
  const blocks = refData.stanzasRich?.blocks
  if (!Array.isArray(blocks)) {
    throw new Error(`Ref has no stanzasRich.blocks: ${ref}`)
  }
  const summary = []
  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi]
    if (block.kind !== 'stanza') continue
    const before = Array.isArray(block.phrases) ? block.phrases.length : 0
    // Scope guard: only rewrite blocks that already have phrases unless
    // explicitly overridden. The block's existing `phrases` array (even
    // when length === 0 means schema-present-but-empty) signals it is in
    // scope for the phrase-render path.
    const hasExistingPhrases = Array.isArray(block.phrases) && before > 0
    if (!forceInject && !hasExistingPhrases) {
      summary.push({
        blockIndex: bi,
        lineCount: (block.lines || []).length,
        phrasesBefore: before,
        phrasesAfter: before,
        multiLinePhrases: [],
        skipped: 'no-prior-phrases',
      })
      continue
    }
    const newPhrases = regroupPhrasesByCapitalStart(block.lines || [])
    block.phrases = newPhrases
    summary.push({
      blockIndex: bi,
      lineCount: (block.lines || []).length,
      phrasesBefore: before,
      phrasesAfter: newPhrases.length,
      multiLinePhrases: newPhrases
        .filter((p) => p.lineRange[0] !== p.lineRange[1])
        .map((p) => p.lineRange),
    })
  }
  return summary
}

function cliMain() {
  const args = parseCliArgs(process.argv.slice(2))
  const targetPath = resolve(process.cwd(), args.target)
  const richData = JSON.parse(readFileSync(targetPath, 'utf8'))
  const refs = args.allRefs ? listStanzaRefs(richData) : args.refs
  const allSummary = {}
  for (const ref of refs) {
    allSummary[ref] = regroupRef(richData, ref, { forceInject: args.forceInject })
  }
  if (args.dryRun) {
    console.log(`DRY RUN — no write. ${refs.length} ref(s). Summary:`)
  } else {
    writeFileSync(targetPath, JSON.stringify(richData, null, 2) + '\n', 'utf8')
    console.log(`Wrote ${targetPath} (${refs.length} ref(s)). Summary:`)
  }
  // Aggregate counters for the sweep summary (#499).
  let totalBefore = 0
  let totalAfter = 0
  let multiLineCount = 0
  let zeroDeltaRefs = 0
  const outlierRefs = []
  for (const ref of refs) {
    const refBefore = allSummary[ref].reduce(
      (sum, s) => sum + s.phrasesBefore,
      0,
    )
    const refAfter = allSummary[ref].reduce(
      (sum, s) => sum + s.phrasesAfter,
      0,
    )
    const refMultiLine = allSummary[ref].reduce(
      (sum, s) => sum + s.multiLinePhrases.length,
      0,
    )
    totalBefore += refBefore
    totalAfter += refAfter
    multiLineCount += refMultiLine
    if (refBefore === refAfter) {
      zeroDeltaRefs += 1
    } else if (refBefore - refAfter >= 5) {
      // Outlier = ref with >=5 lines collapsing into wrap continuations.
      // Worth a curator spot-check for over-merging.
      outlierRefs.push({ ref, before: refBefore, after: refAfter })
    }
    if (refs.length <= 4 || refBefore !== refAfter) {
      console.log(`\n[${ref}] total ${refBefore} → ${refAfter} phrases`)
      for (const s of allSummary[ref]) {
        console.log(
          `  block ${s.blockIndex}: ${s.lineCount} lines, ` +
            `${s.phrasesBefore} → ${s.phrasesAfter} phrases` +
            (s.multiLinePhrases.length
              ? `, multi-line: ${JSON.stringify(s.multiLinePhrases)}`
              : ''),
        )
      }
    }
  }
  if (args.allRefs) {
    console.log(
      `\n=== Sweep summary: ${refs.length} ref(s) processed ` +
        `===\n  total phrases: ${totalBefore} → ${totalAfter} ` +
        `(Δ ${totalAfter - totalBefore})\n` +
        `  multi-line phrases: ${multiLineCount}\n` +
        `  zero-delta refs: ${zeroDeltaRefs} / ${refs.length}\n` +
        `  outlier refs (Δ ≥ -5): ${outlierRefs.length}`,
    )
    if (outlierRefs.length) {
      console.log('  Outlier list:')
      for (const o of outlierRefs) {
        console.log(`    - ${o.ref}: ${o.before} → ${o.after}`)
      }
    }
  }
  if (args.summaryJson) {
    const summaryPath = resolve(process.cwd(), args.summaryJson)
    writeFileSync(
      summaryPath,
      JSON.stringify(
        {
          target: args.target,
          refs,
          totals: {
            refsProcessed: refs.length,
            phrasesBefore: totalBefore,
            phrasesAfter: totalAfter,
            multiLinePhrases: multiLineCount,
            zeroDeltaRefs,
          },
          outliers: outlierRefs,
          perRef: allSummary,
        },
        null,
        2,
      ) + '\n',
      'utf8',
    )
    console.log(`Summary JSON written to ${summaryPath}.`)
  }
}

if (
  typeof process !== 'undefined' &&
  process.argv?.[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  cliMain()
}
