#!/usr/bin/env node
/**
 * regroup-phrases-by-capital.mjs — #498 Phase 1 Pilot helper.
 *
 * Apply `regroupPhrasesByCapitalStart` (exported from
 * `scripts/build-phrases-into-rich.mjs`) to every `kind:'stanza'` block of
 * the refs passed via `--refs`. Reads/writes the target rich.json in place.
 *
 * Pilot scope (#498): Psalm 63:2-9 + Psalm 42:2-6. Other refs are NOT
 * touched even when present in the same target file. The 124-ref sweep
 * follows in a separate task after user validation of the pilot output.
 *
 * What it does NOT change:
 *   - `lines[]` (text + indent + role) — UNTOUCHED.
 *   - `paragraphBoundaries` — UNTOUCHED (still indexes into `lines[]`).
 *   - Any block whose `kind` is not 'stanza'.
 *   - Any ref not listed in `--refs`.
 *
 * What it DOES change:
 *   - `phrases` array of each matching stanza block — REPLACED with the
 *     capital-start re-grouping. Empty input → empty output (no crash).
 *
 * CLI:
 *   node scripts/regroup-phrases-by-capital.mjs \
 *     --target src/data/loth/prayers/commons/psalter-texts.rich.json \
 *     --refs "Psalm 63:2-9" "Psalm 42:2-6" \
 *     [--dry-run]
 *
 *   --dry-run: print before/after phrase counts per block, do not write.
 *   --target:  alternate rich.json (default = canonical psalter file).
 *   --refs:    one or more ref keys (positional after the flag).
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { regroupPhrasesByCapitalStart } from './build-phrases-into-rich.mjs'

const DEFAULT_TARGET = 'src/data/loth/prayers/commons/psalter-texts.rich.json'

function parseCliArgs(argv) {
  const args = { target: DEFAULT_TARGET, refs: [], dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--target') {
      args.target = argv[++i]
    } else if (a === '--dry-run') {
      args.dryRun = true
    } else if (a === '--refs') {
      // Collect every positional token after --refs until the next flag.
      while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        args.refs.push(argv[++i])
      }
    } else {
      throw new Error(`Unknown arg: ${a}`)
    }
  }
  if (!args.refs.length) {
    throw new Error('At least one --refs <key> is required (pilot scope).')
  }
  return args
}

/**
 * Apply capital-start regrouping to every `kind:'stanza'` block of the
 * given ref. Returns a summary the CLI prints (or the test asserts on).
 */
export function regroupRef(richData, ref) {
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
  const allSummary = {}
  for (const ref of args.refs) {
    allSummary[ref] = regroupRef(richData, ref)
  }
  if (args.dryRun) {
    console.log('DRY RUN — no write. Summary:')
  } else {
    writeFileSync(targetPath, JSON.stringify(richData, null, 2) + '\n', 'utf8')
    console.log(`Wrote ${targetPath}. Summary:`)
  }
  for (const ref of args.refs) {
    console.log(`\n[${ref}]`)
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

if (
  typeof process !== 'undefined' &&
  process.argv?.[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  cliMain()
}
