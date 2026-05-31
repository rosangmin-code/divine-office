#!/usr/bin/env node
/**
 * GOAL #105 — apply the psalm-prayer page-break completeness fix SURGICALLY to
 * the curated data, and (re)build the NEEDS_REVIEW baseline.
 *
 * WHY surgical (not a full `extract-psalm-texts.js` re-run): the committed
 * `src/data/loth/psalter-texts.json` is a CURATED artifact — extractor output
 * PLUS gospel-canticle entries from a separate script PLUS the #42 manual
 * psalm-prayer repairs (see extract-psalm-texts.js header L14-28: "don't re-run
 * this extractor as a full overwrite"). A full re-run regresses 10 refs
 * (5 #42-repaired prayers + 5 dropped canticle/psalm entries), violating the
 * GOAL #105 [D2] delta-scope AC. So we touch ONLY the one truncated ref.
 *
 * Steps (spec docs/research/GOAL105-spec.md §C / §D):
 *   1. Rebuild the NEEDS_REVIEW baseline via the dedicated 102-marker sweep
 *      (scripts/build-psalmprayer-needs-review.mjs).
 *   2. Locate Psalm 114's now-complete prayer (the marker whose extraction
 *      prefix-matches the committed truncated value) and patch ONLY that
 *      `psalmPrayer` value in psalter-texts.json via a verbatim TEXTUAL
 *      replacement (preserves byte formatting → diff is exactly one line).
 *   3. Surgically patch Psalm 114's `psalmPrayerRich` in psalter-texts.rich.json:
 *      run the full rich build (which already reconstructs Psalm 114 fully from
 *      the PDF, page 70→71), capture ONLY Psalm 114's fresh psalmPrayerRich, then
 *      restore the committed rich catalog and patch that single ref (JSON
 *      round-trip is byte-stable → delta=1). Side artifacts are reverted.
 *
 * Idempotent: re-running when the prayer is already complete is a data no-op.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { buildNeedsReview } from './build-psalmprayer-needs-review.mjs'

const require = createRequire(import.meta.url)
const { extractPsalmPrayer } = require('./extract-psalm-texts.js')

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const PSALTER = resolve(ROOT, 'src/data/loth/psalter-texts.json')
const RICH = resolve(ROOT, 'src/data/loth/prayers/commons/psalter-texts.rich.json')
const FAILURES = resolve(ROOT, 'scripts/out/psalter-prayers-rich-failures.md')
const MARKER = /^Дууллыг төгсгөх залбирал/
const KEY = 'Psalm 114:1-8'
const EXPECT_CONTAINS = 'Та ус ба Сүнсний'
const EXPECT_END = 'болтугай.'

// 1: NEEDS_REVIEW baseline (delegated to the dedicated sweep generator).
buildNeedsReview(ROOT)

// 2: surgical psalter-texts.json patch ----------------------------------------
const psalter = JSON.parse(readFileSync(PSALTER, 'utf8'))
const truncated = psalter[KEY] && psalter[KEY].psalmPrayer
if (typeof truncated !== 'string' || !truncated) {
  throw new Error(`[psalm114-fix] ${KEY}.psalmPrayer missing in ${PSALTER}`)
}
const prefix = truncated.slice(0, 40)

// Find Psalm 114's now-complete prayer text via a targeted marker sweep.
let fullP114 = null
for (const w of [1, 2, 3, 4]) {
  const file = resolve(ROOT, `parsed_data/week${w}/week${w}_final.txt`)
  let lines
  try {
    lines = readFileSync(file, 'utf8').split(/\r?\n/)
  } catch {
    continue
  }
  for (let i = 0; i < lines.length; i++) {
    if (!MARKER.test(lines[i].trim())) continue
    const out = extractPsalmPrayer(lines, i)
    if (typeof out === 'string' && out.startsWith(prefix)) fullP114 = out
  }
}
if (!fullP114) {
  throw new Error(`[psalm114-fix] Psalm 114 marker not found in sweep (prefix="${prefix}")`)
}
if (!fullP114.includes(EXPECT_CONTAINS) || !fullP114.trim().endsWith(EXPECT_END)) {
  throw new Error(`[psalm114-fix] extraction incomplete: ...${fullP114.slice(-45)}`)
}
if (fullP114 === truncated) {
  console.log('[psalm114-fix] psalmPrayer already complete — psalter-texts.json unchanged.')
} else {
  const raw = readFileSync(PSALTER, 'utf8')
  const needle = `"psalmPrayer": ${JSON.stringify(truncated)}`
  const occurrences = raw.split(needle).length - 1
  if (occurrences !== 1) {
    throw new Error(`[psalm114-fix] truncated psalmPrayer line not uniquely found (${occurrences}x)`)
  }
  writeFileSync(PSALTER, raw.replace(needle, `"psalmPrayer": ${JSON.stringify(fullP114)}`), 'utf8')
  console.log(`[psalm114-fix] patched ${KEY}.psalmPrayer (surgical, delta=1 line).`)
}

// 3: surgical psalmPrayerRich patch -------------------------------------------
const richCommittedRaw = readFileSync(RICH, 'utf8')
const failuresCommitted = existsSync(FAILURES) ? readFileSync(FAILURES, 'utf8') : null

console.log('[psalm114-fix] running build-psalter-prayers-rich (capture Psalm 114 rich)…')
const r = spawnSync('node', ['scripts/build-psalter-prayers-rich.mjs'], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 240000,
})
if (r.status !== 0) {
  throw new Error(`[psalm114-fix] rich build failed (status=${r.status}): ${(r.stderr || '').slice(-300)}`)
}
const blob = (r.stdout || '') + '\n' + (existsSync(FAILURES) ? readFileSync(FAILURES, 'utf8') : '')
const failMatch = blob.match(/failure=(\d+)|실패[:\s]+(\d+)/)
const failCount = failMatch ? Number(failMatch[1] ?? failMatch[2]) : NaN
const richFresh = JSON.parse(readFileSync(RICH, 'utf8'))
const freshP114Rich = richFresh[KEY] && richFresh[KEY].psalmPrayerRich
const flat114 =
  freshP114Rich && Array.isArray(freshP114Rich.blocks)
    ? freshP114Rich.blocks
        .filter((b) => b.kind !== 'rubric-line')
        .flatMap((b) => (b.spans || []).map((s) => s.text))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
    : ''
if (failCount !== 0) {
  throw new Error(`[psalm114-fix] rich build failure count = ${failCount} (expected 0 — dual-path divergence)`)
}
if (!flat114.includes(EXPECT_CONTAINS) || !flat114.endsWith(EXPECT_END)) {
  throw new Error(`[psalm114-fix] rich Psalm 114 incomplete: ...${flat114.slice(-45)}`)
}

// restore committed rich catalog + surgically patch only Psalm 114; revert the
// pre-existing-stale failures.md side artifact (the dual-path test regenerates
// it fresh on its own run).
const richCommitted = JSON.parse(richCommittedRaw)
richCommitted[KEY].psalmPrayerRich = freshP114Rich
writeFileSync(RICH, JSON.stringify(richCommitted, null, 2) + '\n', 'utf8')
if (failuresCommitted != null) writeFileSync(FAILURES, failuresCommitted, 'utf8')
console.log(`[psalm114-fix] patched ${KEY}.psalmPrayerRich (surgical, delta=1 ref); rich failure=0.`)
