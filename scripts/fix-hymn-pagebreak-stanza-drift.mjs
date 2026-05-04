#!/usr/bin/env node
/**
 * fix-hymn-pagebreak-stanza-drift.mjs — F-X7c (#337) page-break stanza-drift fix.
 *
 * Background:
 *   PDF transcribe split 3 hymn stanzas across page boundaries: the verse
 *   was 4 lines in the PDF, but the page break (with 'Магтуу' header)
 *   landed between line 1↔2 (hymn 41 stanza 1), line 3↔4 (hymn 45 stanza
 *   3), or line 2↔3 (hymn 111 stanza 3). F-X7 (#299) and F-X7b (#317)
 *   stripped the noise label, exposing a 1L+3L / 3L+1L / 2L+2L split.
 *
 *   In the rich.json path the split surfaces as TWO stanza blocks
 *   separated by a divider; in the ordinarium/hymns.json plain-text path
 *   it surfaces as a `\n\n` (empty line) inside what should be one verse.
 *
 *   Review #311 finding F-2 documented the cohort and recommended a
 *   re-merge as the F-X7c follow-up. This script is that follow-up.
 *
 * Fix strategy:
 *   - Rich path (3 files):
 *       blocks[i].lines += blocks[i+2].lines, drop blocks[i+1] (divider)
 *       and blocks[i+2] (continuation). Strip the existing `phrases`
 *       field on the merged block; the F-X3 builder
 *       (`scripts/build-hymn-phrases-into-rich.mjs`) MUST be re-run to
 *       repopulate phrases on the merged 4-line stanza. This keeps the
 *       fix narrowly scoped — we do not duplicate phrase planning here.
 *   - Plain path (1 file, 3 entries):
 *       In `ordinarium/hymns.json` `text`, locate the empty line at the
 *       documented index for each affected hymn id and splice it out.
 *       Both surrounding lines stay; the only change is the removal of
 *       one orphan empty line.
 *
 * Targeting: hand-listed by hymn id + verse anchor lines (PDF-verbatim
 * SSOT per memory `feedback_pdf_ssot_verbatim.md`). Each target carries
 * the EXPECTED first-line text of the head and tail blocks so the script
 * refuses to mutate if the data has drifted between dispatch and run.
 *
 * Re-run safety: idempotent. After the merge succeeds, a second run sees
 * no matching split and exits no-op (same exit code).
 *
 * Usage:
 *   node scripts/fix-hymn-pagebreak-stanza-drift.mjs           # apply
 *   node scripts/fix-hymn-pagebreak-stanza-drift.mjs --dry-run # preview
 *
 * Post-step (MANDATORY when --apply changed any rich.json file):
 *   node scripts/build-hymn-phrases-into-rich.mjs --ids 41,45,111
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const HYMN_RICH_DIR = 'src/data/loth/prayers/hymns'
const ORDINARIUM_HYMNS_FILE = 'src/data/loth/ordinarium/hymns.json'

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run') || args.includes('-n')

// ── Targets ──────────────────────────────────────────────────────────────
//
// Each rich-path target points at a stanza block that should swallow the
// next-stanza block (after one divider) back into itself. `headFirstLine`
// and `tailFirstLine` are the expected first-line texts on each side, used
// for pre-mutation validation.
const RICH_TARGETS = [
  {
    hymnId: '41',
    headBlockIdx: 0,
    headFirstLine: '1. Есүс мандан ирсэн',
    tailFirstLine: 'Их адис хайранд',
    expectedHeadLineCount: 1,
    expectedTailLineCount: 3,
  },
  {
    hymnId: '45',
    headBlockIdx: 6,
    headFirstLine: '3. Ядуурлыг баримтлан',
    tailFirstLine: 'Юуны тул зүдэв?',
    expectedHeadLineCount: 3,
    expectedTailLineCount: 1,
  },
  {
    hymnId: '111',
    headBlockIdx: 6,
    headFirstLine: '3. Өлмий, мутар, хавирганы',
    tailFirstLine: 'Үзүүлэхүй дор тэд тийн',
    expectedHeadLineCount: 2,
    expectedTailLineCount: 2,
  },
]

// Each plain-text target points at one empty line inside an
// ordinarium/hymns.json text field that should be spliced out. `lineIdx`
// is the index of the empty line in the `text.split('\n')` array; the two
// surrounding `prevLine` / `nextLine` strings validate that we are at the
// right page-break gap and not accidentally collapsing a real stanza
// boundary (which is also signalled by `\n\n` in this format).
const PLAIN_TARGETS = [
  {
    hymnId: '41',
    lineIdx: 1,
    prevLine: '1. Есүс мандан ирсэн',
    nextLine: 'Их адис хайранд',
  },
  {
    hymnId: '45',
    lineIdx: 16,
    prevLine: 'Явганаар ном тавьж',
    nextLine: 'Юуны тул зүдэв?',
  },
  {
    hymnId: '111',
    lineIdx: 13,
    prevLine: 'Үлдэж хоцорсон шархаа',
    nextLine: 'Үзүүлэхүй дор тэд тийн',
  },
]

// ── Helpers ──────────────────────────────────────────────────────────────

function lineText(line) {
  return ((line && line.spans) || []).map((s) => s.text || '').join('')
}

function richFilePath(hymnId) {
  return resolve(HYMN_RICH_DIR, `${hymnId}.rich.json`)
}

// Detect the post-merge state so a re-run is a clean no-op (not an error).
// On success the head block now has expectedHeadLineCount + expectedTailLineCount
// lines AND the block at headBlockIdx+1 is no longer the original divider+tail
// pair (either it's a totally different stanza or there are not enough blocks
// remaining after the merge).
function isRichTargetAlreadyMerged(blocks, t) {
  const head = blocks[t.headBlockIdx]
  if (!head || head.kind !== 'stanza') return false
  if (lineText(head.lines?.[0] || {}) !== t.headFirstLine) return false
  const expectedMergedLineCount =
    t.expectedHeadLineCount + t.expectedTailLineCount
  if (head.lines.length !== expectedMergedLineCount) return false
  // The tail-first-line should already be present at the expectedHeadLineCount
  // offset.
  const tailOffsetText = lineText(head.lines[t.expectedHeadLineCount] || {})
  return tailOffsetText === t.tailFirstLine
}

function processRichTarget(t) {
  const path = richFilePath(t.hymnId)
  const raw = readFileSync(path, 'utf-8')
  const data = JSON.parse(raw)
  const blocks = data?.hymnRich?.blocks
  if (!Array.isArray(blocks)) {
    return { hymnId: t.hymnId, status: 'error', reason: 'hymnRich.blocks missing or non-array' }
  }

  if (isRichTargetAlreadyMerged(blocks, t)) {
    return { hymnId: t.hymnId, status: 'noop', reason: 'already merged' }
  }

  const head = blocks[t.headBlockIdx]
  const divider = blocks[t.headBlockIdx + 1]
  const tail = blocks[t.headBlockIdx + 2]

  // Pre-mutation validation: refuse if the trio doesn't match the documented
  // shape. This protects against silent data drift between dispatch + run.
  if (!head || head.kind !== 'stanza' || lineText(head.lines?.[0] || {}) !== t.headFirstLine) {
    return {
      hymnId: t.hymnId,
      status: 'error',
      reason: `head block at idx ${t.headBlockIdx} did not match expected first-line "${t.headFirstLine}"`,
    }
  }
  if (!divider || divider.kind !== 'divider') {
    return {
      hymnId: t.hymnId,
      status: 'error',
      reason: `expected divider at idx ${t.headBlockIdx + 1}, got kind="${divider?.kind}"`,
    }
  }
  if (!tail || tail.kind !== 'stanza' || lineText(tail.lines?.[0] || {}) !== t.tailFirstLine) {
    return {
      hymnId: t.hymnId,
      status: 'error',
      reason: `tail block at idx ${t.headBlockIdx + 2} did not match expected first-line "${t.tailFirstLine}"`,
    }
  }
  if (head.lines.length !== t.expectedHeadLineCount) {
    return {
      hymnId: t.hymnId,
      status: 'error',
      reason: `head block line count ${head.lines.length} ≠ expected ${t.expectedHeadLineCount}`,
    }
  }
  if (tail.lines.length !== t.expectedTailLineCount) {
    return {
      hymnId: t.hymnId,
      status: 'error',
      reason: `tail block line count ${tail.lines.length} ≠ expected ${t.expectedTailLineCount}`,
    }
  }

  // Merge: head.lines += tail.lines; drop the existing phrases (builder
  // will regenerate them on the merged 4-line stanza).
  const mergedLines = [...head.lines, ...tail.lines]
  const { phrases: _drop, ...headRest } = head
  const newHead = { ...headRest, lines: mergedLines }

  const newBlocks = [
    ...blocks.slice(0, t.headBlockIdx),
    newHead,
    ...blocks.slice(t.headBlockIdx + 3), // skip divider + tail
  ]

  const next = { ...data, hymnRich: { ...data.hymnRich, blocks: newBlocks } }

  if (!DRY_RUN) {
    writeFileSync(path, JSON.stringify(next, null, 2) + '\n', 'utf-8')
  }

  return {
    hymnId: t.hymnId,
    status: 'merged',
    reason: `merged blocks ${t.headBlockIdx} (${t.expectedHeadLineCount}L) + ${t.headBlockIdx + 2} (${t.expectedTailLineCount}L) → ${mergedLines.length}L; dropped divider at idx ${t.headBlockIdx + 1}`,
  }
}

function isPlainTargetAlreadyMerged(textLines, t) {
  // After fix: the previously-empty index now holds nextLine, and
  // prevLine sits at lineIdx - 1.
  const prev = textLines[t.lineIdx - 1]
  const cur = textLines[t.lineIdx]
  return prev === t.prevLine && cur === t.nextLine
}

function processPlainTargets(targets) {
  const path = resolve(ORDINARIUM_HYMNS_FILE)
  const raw = readFileSync(path, 'utf-8')
  const data = JSON.parse(raw)
  const results = []
  let anyChanged = false

  for (const t of targets) {
    const entry = data[t.hymnId]
    if (!entry || typeof entry !== 'object' || typeof entry.text !== 'string') {
      results.push({
        hymnId: t.hymnId,
        status: 'error',
        reason: `ordinarium hymn "${t.hymnId}" missing or has no text field`,
      })
      continue
    }
    const lines = entry.text.split('\n')
    if (isPlainTargetAlreadyMerged(lines, t)) {
      results.push({ hymnId: t.hymnId, status: 'noop', reason: 'already merged' })
      continue
    }
    const cur = lines[t.lineIdx]
    const prev = lines[t.lineIdx - 1]
    const next = lines[t.lineIdx + 1]
    if (cur !== '') {
      results.push({
        hymnId: t.hymnId,
        status: 'error',
        reason: `expected empty line at idx ${t.lineIdx}, got "${cur}"`,
      })
      continue
    }
    if (prev !== t.prevLine) {
      results.push({
        hymnId: t.hymnId,
        status: 'error',
        reason: `expected prev line "${t.prevLine}" at idx ${t.lineIdx - 1}, got "${prev}"`,
      })
      continue
    }
    if (next !== t.nextLine) {
      results.push({
        hymnId: t.hymnId,
        status: 'error',
        reason: `expected next line "${t.nextLine}" at idx ${t.lineIdx + 1}, got "${next}"`,
      })
      continue
    }
    // Splice the empty line out.
    const newLines = [...lines.slice(0, t.lineIdx), ...lines.slice(t.lineIdx + 1)]
    entry.text = newLines.join('\n')
    anyChanged = true
    results.push({
      hymnId: t.hymnId,
      status: 'merged',
      reason: `removed empty line at idx ${t.lineIdx} between "${t.prevLine}" and "${t.nextLine}"`,
    })
  }

  if (anyChanged && !DRY_RUN) {
    writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf-8')
  }

  return results
}

// ── Main ─────────────────────────────────────────────────────────────────

function main() {
  console.log(`[fix-hymn-pagebreak-stanza-drift] mode=${DRY_RUN ? 'dry-run' : 'apply'}`)
  console.log()

  console.log('rich.json targets:')
  let richMerged = 0
  let richNoop = 0
  let richError = 0
  for (const t of RICH_TARGETS) {
    const r = processRichTarget(t)
    if (r.status === 'merged') richMerged += 1
    else if (r.status === 'noop') richNoop += 1
    else richError += 1
    console.log(`  hymn ${r.hymnId}: ${r.status.toUpperCase()} — ${r.reason}`)
  }

  console.log()
  console.log('ordinarium/hymns.json targets:')
  const plainResults = processPlainTargets(PLAIN_TARGETS)
  let plainMerged = 0
  let plainNoop = 0
  let plainError = 0
  for (const r of plainResults) {
    if (r.status === 'merged') plainMerged += 1
    else if (r.status === 'noop') plainNoop += 1
    else plainError += 1
    console.log(`  hymn ${r.hymnId}: ${r.status.toUpperCase()} — ${r.reason}`)
  }

  console.log()
  console.log(`summary: rich merged=${richMerged} noop=${richNoop} error=${richError}; plain merged=${plainMerged} noop=${plainNoop} error=${plainError}`)
  if (richMerged > 0) {
    console.log()
    console.log('NEXT STEP: re-run F-X3 builder so merged stanzas get fresh phrases:')
    console.log('  node scripts/build-hymn-phrases-into-rich.mjs --ids 41,45,111')
  }

  if (richError + plainError > 0) {
    process.exit(1)
  }
}

main()
