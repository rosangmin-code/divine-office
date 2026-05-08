#!/usr/bin/env node
/**
 * strip-ordinarium-magtuu-noise.mjs — F-X7b (#317) page-info 잔여
 * 'Магтуу' 정리 (alt-pick / plain-text path).
 *
 * Background:
 *   #299 F-X7 정리한 src/data/loth/prayers/hymns/{N}.rich.json (rich
 *   render path) 와는 별개로, src/data/loth/ordinarium/hymns.json 의
 *   'text' 필드 (plain-text alt-pick render path) 에 동일한 PDF page
 *   header 'Магтуу' 잔여가 16건 (14 hymns) 남아 있다. hymn-section.tsx
 *   의 useRich gate 가 alt-pick 시 plain-text 로 fallback 되므로 사용자
 *   가 '다른 찬미가' 메뉴를 선택하면 동일 노이즈가 노출된다 (review
 *   #311 F-1 MAJOR scope-gap finding, peer codex AGREE).
 *
 *   #299 audit 와 동일한 14 hymn id 가 영향 (41×2, 44, 45×2, 46, 50,
 *   81, 82, 89, 93, 105, 108, 111, 115, 117). hymn 41/45 는 multi-line
 *   stanza 안의 첫 줄 형태가 아닌 standalone 분리된 line 으로 모두 들어
 *   있어 plain-text 영역에서는 Pattern A 단일 처리로 충분.
 *
 * Fix:
 *   각 entry 의 `text` 필드를 '\n' 로 split → trim() === 'Магтуу' 인
 *   line 제거 → 다시 join('\n'). 단순 단일 라인 strip. noise 제거
 *   후 발생할 수 있는 3+ 연속 빈 줄은 단일 빈 줄로 collapse 하여 원본
 *   문단 간격을 유지한다 (whitespace-pre-line CSS 가 빈 줄을 paragraph
 *   gap 으로 표현하므로 노이즈 양쪽 빈 줄이 합쳐지면 시각적으로 더
 *   넓어지는 것을 방지).
 *
 *   Idempotent: 노이즈가 없으면 no-op (exit 0).
 *
 * Usage:
 *   node scripts/strip-ordinarium-magtuu-noise.mjs           # apply
 *   node scripts/strip-ordinarium-magtuu-noise.mjs --dry-run # preview
 */

import { readFileSync, writeFileSync } from 'fs'

const TARGET = 'src/data/loth/ordinarium/hymns.json'
const NOISE = 'Магтуу'

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run') || args.includes('-n')

function stripNoiseFromText(text) {
  if (typeof text !== 'string' || !text.includes(NOISE)) return { text, removed: 0 }
  const lines = text.split('\n')
  const kept = []
  let removed = 0
  for (const line of lines) {
    if (line.trim() === NOISE) {
      removed += 1
      continue
    }
    kept.push(line)
  }
  if (removed === 0) return { text, removed: 0 }

  // Collapse 2+ consecutive empty lines -> 1 (a single blank line
  // already represents one paragraph gap under whitespace-pre-line CSS;
  // anything more would visually widen the gap).
  // Also trim trailing blank lines (so we don't leave "...\n\n\n" at EOF).
  //
  // #330 F-X7b F-1 — blank判定을 `line.trim() === ''` 로 완화하여 일반
  // whitespace + NBSP (U+00A0) only 라인도 blank 으로 인식한다.
  // 주의: JS .trim() 은 NBSP (U+00A0) 는 제거하지만 ZWSP (U+200B) 는
  // format 문자로 분류되어 제거하지 않는다 — ZWSP-only 라인은 비-blank.
  // 현 ordinarium 데이터에는 NBSP/ZWSP 모두 없어 동작 영향은 0이지만,
  // PDF 재추출 또는 데이터 추가 시 NBSP 라인이 들어올 수 있어 defensive
  // widen 의도이며, ZWSP 도 가드하려면 정규식 기반 검사가 필요하다
  // (#345 I-2 follow-up — 옵션, 현재 미적용).
  const isBlank = (line) => line.trim() === ''
  const collapsed = []
  let blankRun = 0
  for (const line of kept) {
    if (isBlank(line)) {
      blankRun += 1
      if (blankRun <= 1) collapsed.push(line)
    } else {
      blankRun = 0
      collapsed.push(line)
    }
  }
  // Trim trailing blanks (whitespace-only included).
  while (collapsed.length > 0 && isBlank(collapsed[collapsed.length - 1])) collapsed.pop()

  return { text: collapsed.join('\n'), removed }
}

function main() {
  const raw = readFileSync(TARGET, 'utf-8')
  const data = JSON.parse(raw)

  let totalRemoved = 0
  const perHymn = []

  for (const [id, entry] of Object.entries(data)) {
    if (!entry || typeof entry !== 'object' || typeof entry.text !== 'string') continue
    const { text: newText, removed } = stripNoiseFromText(entry.text)
    if (removed > 0) {
      perHymn.push({ id, title: entry.title, page: entry.page, removed })
      totalRemoved += removed
      data[id] = { ...entry, text: newText }
    }
  }

  if (totalRemoved === 0) {
    console.log(`[strip-ordinarium-magtuu-noise] no-op — 0 occurrences in ${TARGET}`)
    return
  }

  if (!DRY_RUN) {
    writeFileSync(TARGET, JSON.stringify(data, null, 2) + '\n', 'utf-8')
  }

  console.log(`[strip-ordinarium-magtuu-noise] mode=${DRY_RUN ? 'dry-run' : 'apply'}`)
  console.log(`  hymns affected: ${perHymn.length}`)
  console.log(`  noise instances removed: ${totalRemoved}`)
  console.log()
  for (const h of perHymn) {
    console.log(`  hymn[${h.id}] (page ${h.page}) "${h.title}" — ${h.removed} removed`)
  }
}

main()
