#!/usr/bin/env node
/**
 * strip-hymn-magtuu-noise.mjs — F-X7 (#299) page-info 잔여 'Магтуу' 정리.
 *
 * Background:
 *   PDF page header 'Магтуу' (hymn section label) 가 본문 transcribe 시 page
 *   boundary 에서 단어 단위로 stanza 안에 침투했다. 사용자 보고:
 *   찬미가 본문 중간에 'магтуу' 텍스트가 노이즈로 표시된다는 증상.
 *
 *   F-X7 audit 로 14 hymn rich.json 의 16 인스턴스를 분류했다 (모두 'Магтуу'
 *   uppercase, lineIdx=0):
 *     - Pattern A (13 instances): single-line stanza ['Магтуу'] between
 *       two dividers (또는 trailing). page header 가 통째로 별도 stanza
 *       로 묶여 침투.
 *     - Pattern B (3 instances): multi-line stanza의 첫 줄 'Магтуу' +
 *       이어지는 실제 본문 라인. page header 가 다음 stanza의 첫 줄에
 *       흡수.
 *
 * Decision (task #299, hand-decision per dispatch instruction):
 *   사용자 instruction은 "소문자 'магтуу'만"이지만 hymn rich.json 실데이터
 *   에는 lowercase가 0건이고 (PDF source 도 page header는 'Магтуу'로 capital),
 *   uppercase 'Магтуу' 16건만 발견. PDF source 검증으로 (lines 561, 589,
 *   1009, 1241 ... full_pdf.txt) 표준 hymn page header가 'Магтуу' 대문자
 *   임을 확인. lowercase 'магтуу'는 inflected form (e.g., 'магтуунуудыг')
 *   으로 본문 정상 단어이므로 hymn rich.json 에는 의도적으로 없는 것이
 *   맞다. 그래서 본 fix 는 uppercase 'Магтуу' 16건만 정리한다.
 *
 * Fix strategy:
 *   - Pattern A (single-line 'Магтуу'):
 *     * stanza 블록을 통째로 제거.
 *     * 인접 divider 가 양쪽 모두 있으면 trailing divider를 함께 제거
 *       (divider-stanza-divider → divider).
 *     * trailing 이 없는 경우 (89.rich.json last block) leading divider
 *       를 함께 제거 (divider-stanza → ∅).
 *   - Pattern B (multi-line, 'Магтуу' as line[0]):
 *     * 첫 줄만 제거 (lines.shift()).
 *     * phrases[].lineRange 를 -1 shift (e.g., [0,3] → [0,2]).
 *     * 줄 수 하나 줄어든 후 phrase boundary 가 새 line[0] 부터 다시
 *       시작하도록 lineRange[1] 도 -1 shift.
 *
 * Re-run safety: idempotent. 'Магтуу' 노이즈가 없으면 no-op (exit 0).
 *
 * Usage:
 *   node scripts/strip-hymn-magtuu-noise.mjs           # apply
 *   node scripts/strip-hymn-magtuu-noise.mjs --dry-run # preview only
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'

const HYMN_DIR = 'src/data/loth/prayers/hymns'
const NOISE_TEXT = 'Магтуу'
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run') || args.includes('-n')

function isNoiseLine(ln) {
  const text = (ln.spans || []).map((s) => s.text || '').join('')
  return text.trim() === NOISE_TEXT
}

function adjustPhrasesAfterFirstLineDrop(phrases) {
  if (!phrases) return phrases
  // Drop or shift phrases that referenced the removed first line.
  const out = []
  for (const ph of phrases) {
    const [a, b] = ph.lineRange || [0, 0]
    // Phrase entirely above the removed line: shouldn't happen (line 0
    // is the removed one and lineRange is sorted), but guard anyway.
    if (b < 0) continue
    // Phrase started at the removed line: shift start to 0.
    const newA = Math.max(0, a - 1)
    const newB = b - 1
    if (newB < 0) continue // entire phrase was just the noise line
    out.push({ ...ph, lineRange: [newA, newB] })
  }
  return out
}

function processFile(file) {
  const path = join(HYMN_DIR, file)
  const raw = readFileSync(path, 'utf-8')
  const data = JSON.parse(raw)
  const blocks = data?.hymnRich?.blocks
  if (!Array.isArray(blocks)) return { file, changed: false, removals: [] }

  const removals = [] // {kind:'block'|'line', blockIdx, info}
  const newBlocks = []

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    if (b.kind === 'stanza' && Array.isArray(b.lines) && b.lines.length > 0) {
      if (b.lines.length === 1 && isNoiseLine(b.lines[0])) {
        // Pattern A: single-line noise stanza. Remove this block AND
        // consume one neighboring divider to keep block-divider rhythm.
        const prevWasDivider = newBlocks.length > 0 && newBlocks[newBlocks.length - 1]?.kind === 'divider'
        const nextIsDivider = blocks[i + 1]?.kind === 'divider'
        removals.push({ kind: 'block', blockIdx: i, totalLines: 1, neighborTrim: nextIsDivider ? 'next' : (prevWasDivider ? 'prev' : 'none') })
        if (nextIsDivider) {
          i += 1 // skip the trailing divider too
        } else if (prevWasDivider) {
          newBlocks.pop() // drop the leading divider we already pushed
        }
        continue // skip the stanza
      }
      if (isNoiseLine(b.lines[0])) {
        // Pattern B: multi-line stanza with noise on first line.
        const newLines = b.lines.slice(1)
        const newPhrases = adjustPhrasesAfterFirstLineDrop(b.phrases)
        const newBlock = { ...b, lines: newLines }
        if (newPhrases !== undefined) newBlock.phrases = newPhrases
        removals.push({ kind: 'line', blockIdx: i, totalLines: b.lines.length })
        newBlocks.push(newBlock)
        continue
      }
    }
    newBlocks.push(b)
  }

  if (removals.length === 0) return { file, changed: false, removals: [] }

  const next = { ...data, hymnRich: { ...data.hymnRich, blocks: newBlocks } }
  if (!DRY_RUN) {
    writeFileSync(path, JSON.stringify(next, null, 2) + '\n', 'utf-8')
  }
  return { file, changed: true, removals }
}

function main() {
  const files = readdirSync(HYMN_DIR)
    .filter((f) => /^\d+\.rich\.json$/.test(f))
    .sort((a, b) => parseInt(a) - parseInt(b))

  let changedFiles = 0
  let totalRemovals = 0
  const report = []
  for (const f of files) {
    const r = processFile(f)
    if (r.changed) {
      changedFiles += 1
      totalRemovals += r.removals.length
      report.push(r)
    }
  }

  console.log(`[strip-hymn-magtuu-noise] mode=${DRY_RUN ? 'dry-run' : 'apply'}`)
  console.log(`  files scanned: ${files.length}`)
  console.log(`  files changed: ${changedFiles}`)
  console.log(`  noise instances removed: ${totalRemovals}`)
  console.log()
  for (const r of report) {
    console.log(`  ${r.file}:`)
    for (const rem of r.removals) {
      if (rem.kind === 'block') {
        console.log(`    - block[${rem.blockIdx}] single-line stanza removed (neighborTrim=${rem.neighborTrim})`)
      } else {
        console.log(`    - block[${rem.blockIdx}] first-line dropped (was ${rem.totalLines} lines, now ${rem.totalLines - 1})`)
      }
    }
  }
}

main()
