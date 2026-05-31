#!/usr/bin/env node
/**
 * GOAL #105 (spec §D.1 / §D.2) — build the psalm-prayer NEEDS_REVIEW baseline
 * by an IMPORT-OVER-MARKERS sweep.
 *
 * Imports the FIXED `extractPsalmPrayer` and runs it at EVERY
 * "Дууллыг төгсгөх залбирал" marker across week1..4 (the full 102-marker set),
 * collecting the terminal+non-marker STOP boundaries it flags. This is the
 * authoritative producer of `scripts/out/psalmprayer-needs-review.json` — NOT
 * `extract-psalm-texts.js` main(), which is ref-based + de-duped (it misses
 * markers such as week3:644, yielding an incomplete 3/4 baseline) and performs
 * a non-idempotent full re-extraction.
 *
 * Output entry: { week, line, tailRaw, nextHead } where `line` is the 1-based
 * marker line. The fixed corpus baseline is exactly 4 terminal+non-marker STOPs
 * (w2:3577, w3:644, w4:55, w4:691); a new (baseline-outside) entry is the signal
 * that a future complete-sentence-then-continuation case needs human review.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { extractPsalmPrayer } = require('./extract-psalm-texts.js')

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const MARKER = /^Дууллыг төгсгөх залбирал/
const OUT = resolve(ROOT, 'scripts/out/psalmprayer-needs-review.json')

/**
 * Sweep every prayer marker in week1..4 and collect the NEEDS_REVIEW boundaries.
 * @param {string} [root] repo root (defaults to the script's repo root)
 * @returns {{week:number, line:number, tailRaw:string, nextHead:string}[]}
 */
export function sweepNeedsReview(root = ROOT) {
  const sink = []
  for (const w of [1, 2, 3, 4]) {
    const file = resolve(root, `parsed_data/week${w}/week${w}_final.txt`)
    let lines
    try {
      lines = readFileSync(file, 'utf8').split(/\r?\n/)
    } catch (e) {
      // FAIL-LOUD (regression-hardened): a missing week source MUST NOT be
      // silently skipped — doing so emits an INCOMPLETE baseline (e.g. dropping
      // the week-3:644 STOP), and the §D.2 lock requires the full 4-entry set.
      // The sweep is a regen tool that must be run with all week sources present
      // (symlink parsed_data/weekN from the main checkout when in a worktree).
      throw new Error(
        `[needs-review] week${w} source missing — cannot build a complete baseline (${file}). ` +
          `Run with all parsed_data/week{1..4}/*_final.txt present. (${e && e.message})`,
      )
    }
    for (let i = 0; i < lines.length; i++) {
      if (!MARKER.test(lines[i].trim())) continue
      // caller annotates `week`; the function emits { line, tailRaw, nextHead }.
      extractPsalmPrayer(lines, i, (e) => sink.push({ week: w, ...e }))
    }
  }
  sink.sort((a, b) => a.week - b.week || a.line - b.line)
  return sink
}

/** Sweep + write the baseline artifact. Returns the collected entries. */
export function buildNeedsReview(root = ROOT) {
  const sink = sweepNeedsReview(root)
  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, JSON.stringify(sink, null, 2) + '\n', 'utf8')
  console.log(
    `[needs-review] ${sink.length} entries → ${OUT}\n` +
      `[needs-review] keys: ${sink.map((e) => `${e.week}:${e.line}`).join(', ')}`,
  )
  return sink
}

if (import.meta.url === `file://${process.argv[1]}`) buildNeedsReview()
