#!/usr/bin/env node
/**
 * verify-phrase-coverage.js
 *
 * FR-161 R-6 — invariant gate for `psalter-texts.rich.json` phrase
 * groups. Walks every `kind:'stanza'` block that carries the optional
 * `phrases?: PhraseGroup[]` (R-2 builder output) and verifies four
 * invariants per stanza:
 *
 *   1. schema   — each PhraseGroup matches PhraseGroupSchema (R-3).
 *   2. bounds   — each `lineRange = [start, end]` satisfies
 *                 `0 ≤ start ≤ end < lines.length`.
 *   3. non-overlap — sorted lineRanges of two phrases never overlap.
 *   4. coverage — sorted lineRanges cover every index of `lines[]`
 *                 contiguously (no gap, no off-by-one tail).
 *
 * Stanzas without `phrases` are NOT inspected (additive contract from R-2).
 * Refs whose value lacks `stanzasRich.blocks` are silently skipped — those
 * shapes are guarded elsewhere by the loader / R-2 builder.
 *
 * NFR-009j: this script IS the gate. Read-only. Exits 0 on PASS, 1 on any
 * violation.
 *
 * CLI:
 *   node scripts/verify-phrase-coverage.js                 # default file, summary line
 *   node scripts/verify-phrase-coverage.js --check         # verbose per-violation
 *   node scripts/verify-phrase-coverage.js --ref "<key>"   # restrict to one ref
 *   node scripts/verify-phrase-coverage.js --target <path> # alternate rich.json
 *
 * The PhraseGroup Zod schema is intentionally inlined here (CommonJS) to
 * keep the verifier dependency-light and runnable without a TS build.
 * src/lib/schemas.ts (PhraseGroupSchema) is the SSOT — changes there must
 * be mirrored here. The integration test exercises the inline schema
 * against synthetic fixtures so drift surfaces immediately.
 */

'use strict'

const fs = require('fs')
const path = require('path')
const { z } = require('zod')

const ROOT = path.resolve(__dirname, '..')
const DEFAULT_TARGET = 'src/data/loth/prayers/commons/psalter-texts.rich.json'

// ─── PhraseGroup schema (mirrors src/lib/schemas.ts → PhraseGroupSchema) ───
//
// Tuple of two non-negative integers — inclusive both ends, indexes into
// the parent stanza's lines[]. `indent` and `role` are optional metadata.
// `.loose()` allows extractor-side extras (e.g., raw token stream) without
// breaking validation.

const PhraseGroupSchema = z
  .object({
    lineRange: z.tuple([
      z.number().int().nonnegative(),
      z.number().int().nonnegative(),
    ]),
    indent: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
    role: z.enum(['refrain', 'doxology']).optional(),
  })
  .loose()

const PhraseGroupArraySchema = z.array(PhraseGroupSchema)

// ─── Pure invariant checker ────────────────────────────────────────────────

/**
 * Validate one stanza's phrases against the four invariants. Returns the
 * list of violations (empty list = PASS). Each violation object names the
 * invariant + carries enough context to fix the source.
 *
 * Module API kept pure so the test suite can exercise it without writing
 * fixture files to disk.
 *
 * @param {{ lines: any[], phrases: any[] }} stanza
 * @returns {{ kind: string, message: string, [key: string]: any }[]}
 */
function checkStanzaPhrases(stanza) {
  const violations = []
  const lineCount = Array.isArray(stanza.lines) ? stanza.lines.length : 0
  const phrases = Array.isArray(stanza.phrases) ? stanza.phrases : []

  // 1. Schema
  const parsed = PhraseGroupArraySchema.safeParse(phrases)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      violations.push({
        kind: 'SCHEMA',
        message: issue.message,
        path: issue.path.join('.'),
      })
    }
    // Schema-failed phrases can't be trusted for the geometric checks
    // below (e.g., lineRange may be a string). Return early so we don't
    // emit cascading bounds/coverage errors that just duplicate the
    // schema diagnosis.
    return violations
  }

  // 2. Bounds
  for (let i = 0; i < phrases.length; i++) {
    const [start, end] = phrases[i].lineRange
    if (start > end) {
      violations.push({
        kind: 'BOUNDS',
        message: `phrase[${i}] lineRange [${start}, ${end}] has start > end`,
        phraseIndex: i,
      })
      continue
    }
    if (end >= lineCount) {
      violations.push({
        kind: 'BOUNDS',
        message: `phrase[${i}] lineRange [${start}, ${end}] end exceeds lines.length=${lineCount}`,
        phraseIndex: i,
      })
    }
  }

  // 3. Non-overlap (use a sorted copy keyed by original index for messages)
  const sorted = phrases
    .map((p, i) => ({ start: p.lineRange[0], end: p.lineRange[1], index: i }))
    .sort((a, b) => a.start - b.start || a.end - b.end)
  for (let k = 1; k < sorted.length; k++) {
    const prev = sorted[k - 1]
    const curr = sorted[k]
    if (curr.start <= prev.end) {
      violations.push({
        kind: 'OVERLAP',
        message: `phrases[${prev.index}] [${prev.start}, ${prev.end}] overlaps phrases[${curr.index}] [${curr.start}, ${curr.end}]`,
        phraseIndices: [prev.index, curr.index],
      })
    }
  }

  // 4. Coverage — only assert when we have phrases AND lines (additive
  // contract: a stanza with phrases must cover every line). An empty
  // phrases[] on a non-empty stanza is treated as "not yet annotated" and
  // skipped at the call site (see iterStanzas). We still get here for
  // populated phrases on empty stanzas, which is itself a violation.
  if (lineCount === 0) {
    violations.push({
      kind: 'COVERAGE',
      message: `phrases present but stanza has no lines`,
      lineCount: 0,
    })
    return violations
  }
  // After bounds + non-overlap, sorted lineRanges should tile [0, lineCount).
  let cursor = 0
  for (const seg of sorted) {
    if (seg.start > cursor) {
      violations.push({
        kind: 'COVERAGE',
        message: `gap at lines [${cursor}, ${seg.start - 1}] (no phrase covers these indices)`,
        gap: [cursor, seg.start - 1],
      })
    }
    if (seg.end + 1 > cursor) cursor = seg.end + 1
  }
  if (cursor < lineCount) {
    violations.push({
      kind: 'COVERAGE',
      message: `tail gap at lines [${cursor}, ${lineCount - 1}] (uncovered tail)`,
      gap: [cursor, lineCount - 1],
    })
  }

  return violations
}

/**
 * Walk every `kind:'stanza'` block under `richData[ref].stanzasRich.blocks`
 * and yield `{ ref, blockIndex, stanza }` for blocks whose `phrases` field
 * is a non-empty array. Stanzas without phrases are skipped — phrase
 * coverage is an opt-in invariant per the additive R-2 contract.
 *
 * @param {Record<string, any>} richData
 * @param {string|null} refFilter
 */
function* iterStanzasWithPhrases(richData, refFilter = null) {
  const refs = refFilter ? [refFilter] : Object.keys(richData)
  for (const ref of refs) {
    const entry = richData[ref]
    if (!entry || typeof entry !== 'object') continue
    const blocks = entry.stanzasRich?.blocks
    if (!Array.isArray(blocks)) continue
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      if (!block || block.kind !== 'stanza') continue
      if (!Array.isArray(block.phrases) || block.phrases.length === 0) continue
      yield { ref, blockIndex: i, stanza: block }
    }
  }
}

/**
 * Check an entire rich-AST data blob; returns the aggregate violation list.
 *
 * @param {Record<string, any>} richData
 * @param {{ ref?: string|null }} [opts]
 */
function checkRichData(richData, opts = {}) {
  const refFilter = opts.ref ?? null
  const violations = []
  let stanzasInspected = 0
  for (const slot of iterStanzasWithPhrases(richData, refFilter)) {
    stanzasInspected += 1
    for (const v of checkStanzaPhrases(slot.stanza)) {
      violations.push({
        ref: slot.ref,
        blockIndex: slot.blockIndex,
        ...v,
      })
    }
  }
  return { violations, stanzasInspected }
}

// ─── CLI ───────────────────────────────────────────────────────────────────

function parseCliArgs(argv) {
  const args = { check: false, ref: null, target: null }
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    if (flag === '--check') {
      args.check = true
    } else if (flag === '--ref') {
      args.ref = argv[i + 1] || null
      i++
    } else if (flag === '--target') {
      args.target = argv[i + 1] || null
      i++
    } else if (flag === '--help' || flag === '-h') {
      args.help = true
    }
  }
  return args
}

function printHelp() {
  process.stdout.write(
    'Usage: node scripts/verify-phrase-coverage.js [--check] [--ref <key>] [--target <path>]\n' +
      '\n' +
      'Verifies phrase coverage invariants on psalter-texts.rich.json (NFR-009j).\n' +
      '  --check        verbose per-violation output\n' +
      "  --ref <key>    restrict to one ref (e.g. 'Psalm 110:1-5, 7')\n" +
      '  --target <p>   alternate rich.json path (default: ' +
      DEFAULT_TARGET +
      ')\n',
  )
}

function main() {
  const args = parseCliArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return 0
  }
  const targetRel = args.target || DEFAULT_TARGET
  const targetAbs = path.isAbsolute(targetRel)
    ? targetRel
    : path.join(ROOT, targetRel)
  if (!fs.existsSync(targetAbs)) {
    console.error(`[verify-phrase-coverage] target not found: ${targetAbs}`)
    return 1
  }
  let richData
  try {
    richData = JSON.parse(fs.readFileSync(targetAbs, 'utf-8'))
  } catch (err) {
    console.error(`[verify-phrase-coverage] JSON parse failed: ${err.message}`)
    return 1
  }
  if (!richData || typeof richData !== 'object' || Array.isArray(richData)) {
    console.error(
      '[verify-phrase-coverage] target is not an object map of refs',
    )
    return 1
  }
  if (args.ref && !(args.ref in richData)) {
    console.error(`[verify-phrase-coverage] ref not found: ${args.ref}`)
    return 1
  }
  const { violations, stanzasInspected } = checkRichData(richData, {
    ref: args.ref,
  })
  if (violations.length === 0) {
    console.log(
      `[verify-phrase-coverage] OK — ${stanzasInspected} stanza(s) with phrases inspected, 0 violations`,
    )
    return 0
  }
  console.error(
    `[verify-phrase-coverage] FAIL — ${violations.length} violation(s) across ${stanzasInspected} inspected stanza(s)`,
  )
  if (args.check) {
    for (const v of violations) {
      console.error(
        `  ${v.ref} :: blocks[${v.blockIndex}] :: ${v.kind} — ${v.message}`,
      )
    }
  } else {
    const byKind = violations.reduce((acc, v) => {
      acc[v.kind] = (acc[v.kind] || 0) + 1
      return acc
    }, {})
    const summary = Object.entries(byKind)
      .map(([k, n]) => `${k}=${n}`)
      .join(' ')
    console.error(`  ${summary}`)
    console.error('  re-run with --check for per-violation detail')
  }
  return 1
}

if (require.main === module) {
  process.exit(main())
}

module.exports = {
  checkStanzaPhrases,
  checkRichData,
  iterStanzasWithPhrases,
  PhraseGroupSchema,
  PhraseGroupArraySchema,
}
