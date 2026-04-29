#!/usr/bin/env node
/**
 * build-phrases-into-rich.mjs — FR-161 R-2 builder.
 *
 * Reads phrase-extractor JSON (output of `scripts/parsers/extract-phrases-
 * from-pdf.mjs`) and injects `phrases?: PhraseGroup[]` into the matching
 * `kind: 'stanza'` blocks of `src/data/loth/prayers/commons/psalter-
 * texts.rich.json` (or any compatible rich-AST file).
 *
 * Contracts (per R-2 dispatch):
 *
 *   1. additive — existing `lines[]` are preserved; `phrases?` is appended
 *      to the stanza block. Refs without phrases stay untouched.
 *   2. atomic — across the entire input batch, EITHER every (ref, stanza)
 *      can be matched and injected, OR no file is written. Partial inject
 *      is forbidden (reduces operator confusion when a single bad mapping
 *      surfaces an extractor / rich.json drift).
 *   3. idempotent — re-running with the same extractor JSON produces the
 *      same rich.json. The injected `phrases` array fully overwrites any
 *      prior value at the matched stanza block.
 *   4. dry-run (--dry-run) — print the proposed diff to stdout without
 *      touching the rich.json on disk.
 *
 * Matching algorithm:
 *
 *   For each `kind:'stanza'` block in `richData[ref].stanzasRich.blocks`:
 *     a. take the first line's text (`block.lines[0].spans[0].text`)
 *     b. find the extractor stanza whose first non-blank line matches
 *        (exact equality after `.trim()`, OR a 12-char prefix match for
 *        rare punctuation drift such as smart-quote vs straight quote).
 *     c. require `extractorStanza.lines.length === richBlock.lines.length`
 *        — otherwise the rich.json has pre-joined wraps that PhraseGroup
 *        `lineRange` would mis-index. Mismatch → atomic rejection so the
 *        operator surfaces the underlying data drift before injecting.
 *     d. on success, `block.phrases = extractorStanza.phrases`.
 *
 * Input shape (extractor JSON):
 *
 *   Single-ref: { ref: "Psalm 110:1-5, 7", stanzas: [...] }
 *   Multi-ref:  { refs: [{ ref: "...", stanzas: [...] }, ...] }
 *
 * The extractor itself does not emit `ref` (it works in PDF coordinates).
 * The CLI here therefore accepts `--ref <key>` to attach a ref to a single-
 * file extractor output, or expects `refs:[]` shape for batch mode.
 *
 * CLI:
 *
 *   node scripts/build-phrases-into-rich.mjs --extractor-out <json> \
 *     [--target src/data/loth/prayers/commons/psalter-texts.rich.json] \
 *     [--ref "Psalm 110:1-5, 7"] [--dry-run]
 *
 * Module API (preferred for tests):
 *
 *   import { injectPhrasesIntoRichData } from './build-phrases-into-rich.mjs'
 *   const result = injectPhrasesIntoRichData(richData, batches)
 *   if (result.ok) writeFileSync(target, JSON.stringify(result.data, null, 2))
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const DEFAULT_TARGET = 'src/data/loth/prayers/commons/psalter-texts.rich.json'

/**
 * Compare two strings for stanza-first-line match. Trims whitespace; on
 * exact mismatch, falls back to a 12-character prefix overlap (rich.json
 * occasionally normalizes smart-quotes / typography while the extractor
 * preserves the PDF original). The prefix length 12 covers a typical 2-3
 * Mongolian word opener; longer would over-tighten, shorter would hit
 * spurious matches across short refrain lines.
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function stanzaFirstLineMatches(a, b) {
  const at = (a || '').trim()
  const bt = (b || '').trim()
  if (!at || !bt) return false
  if (at === bt) return true
  // Normalise smart/curly quotes to straight ASCII before prefix comparison
  // — rich.json sometimes carries `“`/`”`/`’` while the extractor preserves
  // PDF straight quotes (or vice versa). Without this, a leading-quote
  // line never prefix-matches.
  const normA = normalizeQuotes(at)
  const normB = normalizeQuotes(bt)
  if (normA === normB) return true
  const prefixLen = Math.min(12, normA.length, normB.length)
  return normA.slice(0, prefixLen) === normB.slice(0, prefixLen)
}

function normalizeQuotes(s) {
  return s.replace(/[“”„‟]/g, '"').replace(/[‘’‚‛]/g, "'")
}

/**
 * Flatten extractor stanzas into one stream: `[{ text, stanzaIndex,
 * lineWithinStanza }, ...]`. Used by `planRefUpdates` so a rich-block whose
 * lines span MULTIPLE extractor stanzas (rich.json sometimes combines what
 * the PDF separates by blank lines — Psalm 110:1-5,7 stanza 0 is 5 verses)
 * can still be matched.
 *
 * @param {{ stanzaIndex?: number, lines: string[], phrases: any[] }[]} extractorStanzas
 */
function flattenExtractorStream(extractorStanzas) {
  const stream = []
  for (let s = 0; s < extractorStanzas.length; s++) {
    const stanza = extractorStanzas[s]
    for (let i = 0; i < stanza.lines.length; i++) {
      stream.push({
        text: stanza.lines[i],
        stanzaPos: s,
        lineWithinStanza: i,
      })
    }
  }
  return stream
}

/**
 * Search the flat extractor stream for a window of `richTexts.length`
 * consecutive lines whose text matches `richTexts` line-by-line (with
 * quote/whitespace normalisation). Returns the start index of the window
 * in the flat stream, or `-1` if no full match exists.
 *
 * @param {{ text: string }[]} stream
 * @param {string[]} richTexts
 */
function findWindow(stream, richTexts) {
  if (richTexts.length === 0) return -1
  const N = richTexts.length
  outer: for (let start = 0; start <= stream.length - N; start++) {
    for (let k = 0; k < N; k++) {
      if (!stanzaFirstLineMatches(stream[start + k].text, richTexts[k])) continue outer
    }
    return start
  }
  return -1
}

/**
 * Translate the extractor's phrase list (whose lineRange is RELATIVE to
 * each extractor stanza) into rich-block-relative phrases by walking the
 * window in the flat stream. Only phrases whose every line in the
 * extractor stanza falls inside the window are kept; cross-window phrases
 * (would happen if rich.json splits a phrase the extractor groups) are
 * dropped — they shouldn't exist when line-by-line text already matches.
 *
 * @param {{ stanzaPos: number, lineWithinStanza: number }[]} window
 * @param {{ stanzaIndex?: number, phrases: any[] }[]} extractorStanzas
 */
function translatePhrases(window, extractorStanzas) {
  // Build a quick lookup: (stanzaPos, lineWithinStanza) → windowIndex.
  const lookup = new Map()
  for (let i = 0; i < window.length; i++) {
    const w = window[i]
    lookup.set(`${w.stanzaPos}:${w.lineWithinStanza}`, i)
  }
  const phrases = []
  for (let s = 0; s < extractorStanzas.length; s++) {
    for (const phrase of extractorStanzas[s].phrases) {
      // FR-161 R-9.D — coverage repair for boundary-crossing phrases.
      // When a rich block starts at a wrap-continuation line (Psalm 147
      // v12 starts mid-sentence "хөндлүүдийг бэхжүүлэн"), the matching
      // extractor phrase straddles the window's leading edge: lineRange
      // [k-1, k] in extractor, but k-1 lives BEFORE the window start.
      // Old behaviour dropped the entire phrase, leaving rich line 0
      // uncovered → R-6 verifier coverage gap. New behaviour: clip the
      // phrase to the window's intersection so coverage is preserved.
      const origStart = phrase.lineRange[0]
      const origEnd = phrase.lineRange[1]
      let firstInWindow = -1
      let lastInWindow = -1
      for (let li = origStart; li <= origEnd; li++) {
        const wi = lookup.get(`${s}:${li}`)
        if (wi === undefined) continue
        if (firstInWindow === -1) firstInWindow = wi
        lastInWindow = wi
      }
      if (firstInWindow === -1) continue // phrase outside window entirely
      // Verify clipped range is contiguous in the window (i.e. all
      // intermediate window indices between firstInWindow..lastInWindow
      // come from the same logical phrase).
      if (lastInWindow - firstInWindow !== /* line count - 1 */ (function () {
        let n = 0
        for (let li = origStart; li <= origEnd; li++) {
          if (lookup.has(`${s}:${li}`)) n++
        }
        return n - 1
      })()) {
        continue // discontiguous — drop
      }
      phrases.push({
        ...phrase,
        lineRange: [firstInWindow, lastInWindow],
      })
    }
  }
  // Sort by start index for stable output.
  phrases.sort((a, b) => a.lineRange[0] - b.lineRange[0])
  // FR-161 R-9.D — final coverage backfill. R-6 verifier demands every
  // line index is covered by at least one phrase. After the contiguous
  // clip pass, a window index can be uncovered when the source phrase
  // crossed the window's leading or trailing edge and was either dropped
  // (no surviving lookup) or clipped (kept neighbours). Backfill each
  // uncovered index as its own single-line phrase. SKIP backfill when the
  // extractor stream had zero phrases overall — that path means "no
  // phrase data available", and the caller (`injectPhrasesIntoRichData`)
  // wants to strip the `phrases` field so legacy line-render takes over.
  const totalExtractorPhrases = extractorStanzas.reduce(
    (acc, s) => acc + (s.phrases?.length ?? 0),
    0,
  )
  if (totalExtractorPhrases === 0) return []
  const covered = new Set()
  for (const p of phrases) {
    for (let i = p.lineRange[0]; i <= p.lineRange[1]; i++) covered.add(i)
  }
  for (let i = 0; i < window.length; i++) {
    if (covered.has(i)) continue
    phrases.push({ lineRange: [i, i], indent: 0 })
  }
  phrases.sort((a, b) => a.lineRange[0] - b.lineRange[0])
  return phrases
}

/**
 * Plan the (ref, stanza) updates for a single batch ref. Pure: returns
 * `{ updates, issues }` without mutating the input.
 *
 * Window-based matching: searches for a contiguous N-line window across
 * the flat extractor stream (rather than requiring an extractor stanza to
 * start at exactly the rich block's first line). This handles rich.json
 * structures that combine several PDF blank-separated mini-stanzas into a
 * single logical stanza block.
 *
 * @param {{ block: any, blockIndex: number }[]} richStanzaSlots
 * @param {{ stanzaIndex?: number, lines: string[], phrases: any[] }[]} extractorStanzas
 * @returns {{
 *   updates: { blockIndex: number, phrases: any[], richFirstLine: string }[],
 *   issues: { blockIndex: number, kind: string, [key: string]: any }[],
 * }}
 */
export function planRefUpdates(richStanzaSlots, extractorStanzas) {
  const updates = []
  const issues = []
  const stream = flattenExtractorStream(extractorStanzas)
  // Track consumed window ranges so two rich blocks can't claim the same
  // span. Stored as [start, end] inclusive, sorted by start.
  const consumed = []
  function isOverlap(start, end) {
    for (const [cs, ce] of consumed) {
      if (start <= ce && end >= cs) return true
    }
    return false
  }

  for (const slot of richStanzaSlots) {
    const richTexts = (slot.block.lines || []).map(
      (l) => l?.spans?.[0]?.text || '',
    )
    const richFirstLine = richTexts[0]?.trim() ?? ''
    if (!richFirstLine) {
      issues.push({ blockIndex: slot.blockIndex, kind: 'EMPTY_RICH_LINE' })
      continue
    }
    // Search the stream for an unconsumed window.
    let windowStart = -1
    for (let probe = 0; probe <= stream.length - richTexts.length; probe++) {
      let matchHere = true
      for (let k = 0; k < richTexts.length; k++) {
        if (!stanzaFirstLineMatches(stream[probe + k].text, richTexts[k])) {
          matchHere = false
          break
        }
      }
      if (!matchHere) continue
      if (isOverlap(probe, probe + richTexts.length - 1)) continue
      windowStart = probe
      break
    }
    if (windowStart < 0) {
      // Fall back diagnostic: find any matching first-line position, then
      // measure how far it agrees in sequence before drifting. Three
      // distinguishable outcomes:
      //   - first line absent entirely → NO_MATCHING_EXTRACTOR_STANZA
      //   - first line found, prefix matches all richTexts (would have
      //     succeeded but every such window is already consumed by an
      //     earlier slot) → NO_MATCHING_EXTRACTOR_STANZA (window contention)
      //   - first line found, sequence drifts before reaching N → LINE_COUNT_MISMATCH
      const firstLineHit = stream.findIndex((s) =>
        stanzaFirstLineMatches(s.text, richTexts[0]),
      )
      if (firstLineHit < 0) {
        issues.push({
          blockIndex: slot.blockIndex,
          kind: 'NO_MATCHING_EXTRACTOR_STANZA',
          richFirstLine,
        })
      } else {
        const matchedPrefix = countMatchingPrefix(stream, firstLineHit, richTexts)
        if (matchedPrefix === richTexts.length) {
          // The text aligns; only blocker was overlap with a prior consumed
          // window. Surface it as NO_MATCHING_EXTRACTOR_STANZA — the
          // operator's fix is to either map to a different ref or split
          // the rich block.
          issues.push({
            blockIndex: slot.blockIndex,
            kind: 'NO_MATCHING_EXTRACTOR_STANZA',
            richFirstLine,
          })
        } else {
          issues.push({
            blockIndex: slot.blockIndex,
            kind: 'LINE_COUNT_MISMATCH',
            richFirstLine,
            richLineCount: richTexts.length,
            extractorLineCount: matchedPrefix,
          })
        }
      }
      continue
    }
    const window = stream.slice(windowStart, windowStart + richTexts.length)
    consumed.push([windowStart, windowStart + richTexts.length - 1])
    updates.push({
      blockIndex: slot.blockIndex,
      phrases: translatePhrases(window, extractorStanzas),
      richFirstLine,
    })
  }
  return { updates, issues }
}

function countMatchingPrefix(stream, start, richTexts) {
  let n = 0
  while (
    start + n < stream.length &&
    n < richTexts.length &&
    stanzaFirstLineMatches(stream[start + n].text, richTexts[n])
  ) {
    n++
  }
  return n
}

/**
 * Plan + apply all batches against the rich data. Atomic: if ANY batch
 * has issues, no mutation happens — returns `{ ok: false, issues }`.
 *
 * @param {Record<string, any>} richData
 * @param {{ ref: string, stanzas: { stanzaIndex?: number, lines: string[], phrases: any[] }[] }[]} batches
 * @returns {{
 *   ok: boolean,
 *   data?: Record<string, any>,
 *   plan?: { ref: string, updates: any[] }[],
 *   issues?: { ref: string, error: string, [key: string]: any }[],
 * }}
 */
export function injectPhrasesIntoRichData(richData, batches) {
  // 1. Plan every batch first; collect issues without mutating.
  const planned = []
  const allIssues = []

  for (const batch of batches) {
    const ref = richData[batch.ref]
    if (!ref) {
      allIssues.push({ ref: batch.ref, error: 'REF_NOT_FOUND' })
      continue
    }
    const blocks = ref.stanzasRich?.blocks
    if (!Array.isArray(blocks)) {
      allIssues.push({ ref: batch.ref, error: 'NO_STANZAS_RICH_BLOCKS' })
      continue
    }
    const richStanzaSlots = blocks
      .map((block, blockIndex) => ({ block, blockIndex }))
      .filter((x) => x.block.kind === 'stanza')
    if (richStanzaSlots.length === 0) {
      allIssues.push({ ref: batch.ref, error: 'NO_STANZA_BLOCKS' })
      continue
    }
    const { updates, issues } = planRefUpdates(richStanzaSlots, batch.stanzas)
    if (issues.length > 0) {
      for (const issue of issues) {
        allIssues.push({ ref: batch.ref, error: 'STANZA_PLAN_ISSUE', ...issue })
      }
      continue
    }
    if (updates.length !== richStanzaSlots.length) {
      allIssues.push({
        ref: batch.ref,
        error: 'INCOMPLETE_COVERAGE',
        plannedUpdates: updates.length,
        richStanzaCount: richStanzaSlots.length,
      })
      continue
    }
    planned.push({ ref: batch.ref, updates })
  }

  // 2. Atomic gate.
  if (allIssues.length > 0) {
    return { ok: false, issues: allIssues, plan: planned }
  }

  // 3. Apply (deep clone the touched refs so the caller's input is intact).
  const data = { ...richData }
  for (const refPlan of planned) {
    const ref = data[refPlan.ref]
    const blocks = ref.stanzasRich.blocks.map((block, i) => {
      const update = refPlan.updates.find((u) => u.blockIndex === i)
      if (!update) return block
      // Idempotent: assigning `phrases` overwrites any prior value at this
      // block. Empty-phrases arrays are skipped to keep additive minimal.
      if (!update.phrases || update.phrases.length === 0) {
        // Strip a previously-set phrases field if extractor now has none —
        // keeps round-trips honest.
        const { phrases: _drop, ...rest } = block
        return rest
      }
      return { ...block, phrases: update.phrases }
    })
    data[refPlan.ref] = {
      ...ref,
      stanzasRich: { ...ref.stanzasRich, blocks },
    }
  }
  return { ok: true, data, plan: planned }
}

/**
 * Render a human-readable dry-run summary.
 *
 * @param {{
 *   ok: boolean,
 *   data?: any,
 *   plan?: { ref: string, updates: any[] }[],
 *   issues?: any[],
 * }} result
 * @returns {string}
 */
export function renderDryRun(result) {
  const lines = []
  if (result.ok) {
    lines.push(`atomic gate: PASS — ${result.plan.length} ref(s) ready to inject`)
    for (const refPlan of result.plan) {
      lines.push(`  ${refPlan.ref}:`)
      for (const u of refPlan.updates) {
        const phraseSummary = u.phrases
          .map((p) => `[${p.lineRange[0]},${p.lineRange[1]}]`)
          .join(' ')
        lines.push(
          `    block ${u.blockIndex} (first="${u.richFirstLine.slice(0, 30)}…") → ${u.phrases.length} phrase(s) ${phraseSummary}`,
        )
      }
    }
  } else {
    lines.push(`atomic gate: FAIL — ${result.issues.length} issue(s); no inject`)
    for (const issue of result.issues) {
      const detail = Object.entries(issue)
        .filter(([k]) => k !== 'ref' && k !== 'error')
        .map(([k, v]) => `${k}=${typeof v === 'string' ? v.slice(0, 40) : v}`)
        .join(' ')
      lines.push(`  ${issue.ref}: ${issue.error} ${detail}`)
    }
  }
  return lines.join('\n')
}

// ── CLI ────────────────────────────────────────────────────────────────────

function parseCliArgs(argv) {
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
 * Normalise extractor input into `{ refs: [...] }` regardless of whether
 * the file was a single-ref or multi-ref export. Single-ref needs an
 * external `ref` (from `--ref` flag).
 *
 * @param {any} extractorJson
 * @param {string|undefined} explicitRef
 * @returns {{ ref: string, stanzas: any[] }[]}
 */
function normalizeBatches(extractorJson, explicitRef) {
  if (Array.isArray(extractorJson?.refs)) {
    return extractorJson.refs.map((r) => ({ ref: r.ref, stanzas: r.stanzas }))
  }
  if (Array.isArray(extractorJson?.stanzas)) {
    if (!explicitRef) {
      throw new Error('extractor JSON is single-ref shape but --ref was not provided')
    }
    return [{ ref: explicitRef, stanzas: extractorJson.stanzas }]
  }
  throw new Error('extractor JSON has neither refs[] nor stanzas[]')
}

function cliMain() {
  const argv = process.argv.slice(2)
  if (argv.length === 0 || argv.includes('--help')) {
    process.stdout.write(
      'Usage: node scripts/build-phrases-into-rich.mjs ' +
        '--extractor-out <json> [--target <rich.json>] [--ref <key>] [--dry-run]\n',
    )
    process.exit(argv.length === 0 ? 1 : 0)
  }
  const args = parseCliArgs(argv)
  if (!args['extractor-out']) {
    process.stderr.write('error: --extractor-out is required\n')
    process.exit(2)
  }
  const targetPath = resolve(args.target || DEFAULT_TARGET)
  const extractorJson = JSON.parse(readFileSync(args['extractor-out'], 'utf-8'))
  const batches = normalizeBatches(extractorJson, args.ref)
  const richData = JSON.parse(readFileSync(targetPath, 'utf-8'))

  const result = injectPhrasesIntoRichData(richData, batches)
  process.stdout.write(renderDryRun(result) + '\n')

  if (!result.ok) {
    process.exit(3)
  }
  if (args['dry-run']) {
    process.stdout.write('dry-run: target NOT modified\n')
    return
  }
  writeFileSync(targetPath, JSON.stringify(result.data, null, 2) + '\n', 'utf-8')
  process.stdout.write(`wrote ${targetPath}\n`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  cliMain()
}
