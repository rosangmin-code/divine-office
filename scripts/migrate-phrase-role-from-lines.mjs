#!/usr/bin/env node
// task #4 (2026-05-14) — one-shot migration to back-fill `phrases[i].role`
// from `lines[].role` on existing rich catalog. Idempotent — re-running
// after the first execution is a no-op (already populated phrase.role is
// preserved; uniform-defined check is content-equivalent).
//
// Background: prior phrase-injection runs (FR-161 R-8 Phase 1 sweep + post-
// phrase-grouping commits) populated `phrases[]` but dropped the
// `lines[i].role='refrain'` annotations (FR-160-A4 allowlist + FR-153f
// threshold detection). The fix in `scripts/build-phrases-into-rich.mjs`
// covers FUTURE runs; this migration handles the EXISTING catalog without
// re-running the full extractor → inject pipeline (which would need the
// PDF extractor output JSON re-emitted from current pdftotext runs).
//
// Tie-break: same as production fix — all rich lines in phrase's coverage
// share the same defined role → propagate. Mixed roles or any undefined
// → skip (line.role preserved, renderer can fall back to legacy line-mode
// if needed).
//
// Usage:
//   node scripts/migrate-phrase-role-from-lines.mjs [--dry-run] [--target <path>]
//
// Default target: src/data/loth/prayers/commons/psalter-texts.rich.json
//
// Output: counts of (refs scanned / phrases mutated / refs touched), and
// in --dry-run mode prints the per-ref / per-phrase diff summary.

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const DEFAULT_TARGET = 'src/data/loth/prayers/commons/psalter-texts.rich.json'

function uniformLineRole(lines, start, end) {
  if (!Array.isArray(lines)) return undefined
  if (start < 0 || end >= lines.length || start > end) return undefined
  const head = lines[start]?.role
  if (head === undefined) return undefined
  for (let i = start + 1; i <= end; i++) {
    if (lines[i]?.role !== head) return undefined
  }
  return head
}

function parseArgs(argv) {
  const out = { dryRun: false, target: DEFAULT_TARGET }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') out.dryRun = true
    else if (argv[i] === '--target') out.target = argv[++i]
  }
  return out
}

function migrate(richData) {
  let refsScanned = 0
  let refsTouched = 0
  let phrasesMutated = 0
  const perRef = []
  for (const [refKey, entry] of Object.entries(richData)) {
    refsScanned++
    const blocks = entry?.stanzasRich?.blocks
    if (!Array.isArray(blocks)) continue
    let refMutated = 0
    const perBlock = []
    for (let bi = 0; bi < blocks.length; bi++) {
      const block = blocks[bi]
      if (!Array.isArray(block?.phrases) || !Array.isArray(block?.lines)) continue
      let blockMutated = 0
      for (const phrase of block.phrases) {
        if (phrase.role !== undefined) continue // preserve existing role
        const [start, end] = phrase.lineRange ?? []
        const role = uniformLineRole(block.lines, start, end)
        if (role === undefined) continue
        phrase.role = role
        blockMutated++
        phrasesMutated++
      }
      if (blockMutated > 0) {
        perBlock.push({ blockIndex: bi, mutated: blockMutated })
        refMutated += blockMutated
      }
    }
    if (refMutated > 0) {
      refsTouched++
      perRef.push({ ref: refKey, mutated: refMutated, blocks: perBlock })
    }
  }
  return { refsScanned, refsTouched, phrasesMutated, perRef }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const targetPath = resolve(args.target)
  const richData = JSON.parse(readFileSync(targetPath, 'utf-8'))
  const summary = migrate(richData)
  process.stdout.write(
    `[migrate-phrase-role] scanned=${summary.refsScanned} touched=${summary.refsTouched} ` +
      `phrasesMutated=${summary.phrasesMutated}\n`,
  )
  if (summary.perRef.length > 0) {
    process.stdout.write('Refs touched:\n')
    for (const r of summary.perRef) {
      process.stdout.write(
        `  ${r.ref}: ${r.mutated} phrase(s) mutated ` +
          `[${r.blocks.map((b) => `b${b.blockIndex}=${b.mutated}`).join(', ')}]\n`,
      )
    }
  }
  if (args.dryRun) {
    process.stdout.write('dry-run: target NOT modified\n')
    return
  }
  if (summary.phrasesMutated === 0) {
    process.stdout.write('no-op: nothing to migrate\n')
    return
  }
  writeFileSync(targetPath, JSON.stringify(richData, null, 2) + '\n', 'utf-8')
  process.stdout.write(`wrote ${targetPath}\n`)
}

main()
