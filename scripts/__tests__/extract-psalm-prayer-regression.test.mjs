/**
 * GOAL #105 / WI #109 ([#105-sub-4]) — 시편기도 전수 회귀 + NEEDS_REVIEW
 * baseline + dual-path — **회귀/통합 계층 (b)+(D3) RED 테스트**.
 *
 * 계약: docs/research/GOAL105-spec.md §D.1(전수=실함수 직접실행, 구 sweep 단독
 *   금지) + §D.2(NEEDS_REVIEW 4-baseline allowlist + 신규0) + §C/§D.3c(dual-path
 *   fresh-run failures=0 AND rich 完文).
 * 시나리오: §6.1(검증 blind-spot 최우선) / §2.5(dual-path) / §6.5(baseline).
 *
 * ⚠️ RED — 재추출/수정(#111) 전:
 *   - NEEDS_REVIEW 산출(scripts/out/psalmprayer-needs-review.json)이 **부재**
 *     (recordNeedsReview 는 fix 가 추가) → baseline 단언 FAIL(RED). worktree 실행.
 *
 * ⚠️⚠️ 소스 코퍼스 부재(리더 플래그): `parsed_data/week{1..4}/*_final.txt` +
 * `parsed_data/full_pdf.txt` 가 main 체크아웃 **untracked** → worktree 에 부재.
 * 따라서 (b)전수실행·(D3)dual-path fresh-run 은 **소스 있는 환경에서만 실행**
 * 가능(아래 SOURCES_PRESENT 게이트). worktree(소스 부재)에선 skip — 이 테스트들은
 * #110/#111 이 소스 보유 환경에서 실행해야 RED→GREEN 확인됨.
 */

import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
const require = createRequire(import.meta.url)
const fs = require('fs')

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const NEEDS_REVIEW = path.join(ROOT, 'scripts/out/psalmprayer-needs-review.json')
const RICH_FAILURES = path.join(ROOT, 'scripts/out/psalter-prayers-rich-failures.md')
const DATA = path.join(ROOT, 'src/data/loth/psalter-texts.json')
const RICH_JSON = path.join(ROOT, 'src/data/loth/prayers/commons/psalter-texts.rich.json')
const SRC_WEEK1 = path.join(ROOT, 'parsed_data/week1/week1_final.txt')
const PDF = path.join(ROOT, 'public/psalter.pdf')

// 전수회귀(b)는 parsed_data/weekN 만 필요. dual-path(D3)는 PDF + pdftotext 도 필요.
// 둘 다 main 체크아웃 untracked → worktree 기본 부재(아래 게이트로 skip).
const SOURCES_PRESENT = fs.existsSync(SRC_WEEK1)
const DUALPATH_RUNNABLE = SOURCES_PRESENT && fs.existsSync(PDF)
if (!SOURCES_PRESENT) {
  console.warn(
    '[#109] parsed_data 소스 코퍼스 부재(worktree untracked) → 전수실행 테스트 skip. ' +
      '#110/#111 은 소스 보유 환경에서 실행 필요.',
  )
}
if (!DUALPATH_RUNNABLE) {
  console.warn('[#109] PDF(public/psalter.pdf) 부재 → dual-path fresh-run 테스트 skip.')
}

// 고정 baseline allowlist (spec §D.2, 4 시그니처) — week:line 키.
const BASELINE_KEYS = ['2:3577', '3:644', '4:55', '4:691']

// @fr GOAL-105 [D2]
describe('GOAL#105 [D2] NEEDS_REVIEW = 4 baseline allowlist + 신규 0', () => {
  it('scripts/out/psalmprayer-needs-review.json == 4 baseline(week:line), length 4', () => {
    // RED: 현재 파일 부재(recordNeedsReview 는 fix 가 추가).
    expect(fs.existsSync(NEEDS_REVIEW)).toBe(true)
    const arr = JSON.parse(fs.readFileSync(NEEDS_REVIEW, 'utf8'))
    expect(Array.isArray(arr)).toBe(true)
    expect(arr.length).toBe(4)
    const keys = arr.map((e) => `${e.week}:${e.line}`).sort()
    expect(keys).toEqual(BASELINE_KEYS) // 신규(baseline 외) entry = 0
    for (const e of arr) {
      expect(typeof e.tailRaw).toBe('string')
      expect(typeof e.nextHead).toBe('string')
    }
  })
})

// @fr GOAL-105 [D2] — 소스-게이트 전수 실행(§6.1 blind-spot: 실함수 직접실행)
describe('GOAL#105 [D2] 전수회귀 — 실제 extract-psalm-texts.js 실행(102 마커)', () => {
  it.skipIf(!SOURCES_PRESENT)(
    '재추출 후 Psalm 114 완전(болтугай.) + 나머지 101 psalmPrayer byte-불변 baseline',
    () => {
      const before = fs.readFileSync(DATA, 'utf8')
      const baseline = JSON.parse(before)
      const r = spawnSync('node', ['scripts/extract-psalm-texts.js'], {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 120000,
      })
      try {
        expect(r.status).toBe(0)
        const after = JSON.parse(fs.readFileSync(DATA, 'utf8'))
        // 시편114 = 완전체 (RED: 현 코드는 절단 재생성)
        const p114 = after['Psalm 114:1-8']?.psalmPrayer ?? ''
        expect(p114).toContain('Та ус ба Сүнсний')
        expect(p114.trim().endsWith('болтугай.')).toBe(true)
        // 나머지 101 byte-불변 (delta-scope: 시편114만 변경)
        for (const [ref, entry] of Object.entries(baseline)) {
          if (ref === 'Psalm 114:1-8') continue
          expect(after[ref]?.psalmPrayer, `${ref} psalmPrayer 가 변경됨(delta 위반)`).toBe(
            entry.psalmPrayer,
          )
        }
      } finally {
        fs.writeFileSync(DATA, before) // 산출 복원(테스트 부작용 차단)
      }
    },
  )
})

// @fr GOAL-105 [D3] — 소스-게이트 dual-path fresh-run
describe('GOAL#105 [D3] dual-path — build-psalter-prayers-rich fresh-run failures=0 AND rich 完文', () => {
  it.skipIf(!DUALPATH_RUNNABLE)(
    'rich 재생성 fresh-run: 실패 0 라인 AND Psalm114 psalmPrayerRich болтугай. 종결',
    () => {
      // 안전: 빌더가 rich.json/failures.md 를 mutate 하므로 snapshot 후 finally 복원.
      const richBefore = fs.readFileSync(RICH_JSON, 'utf8')
      const failBefore = fs.existsSync(RICH_FAILURES) ? fs.readFileSync(RICH_FAILURES, 'utf8') : null
      try {
        // stale 아티팩트 무시: 새 실행의 stdout/리포트 파싱(§C.2 fresh-run).
        if (fs.existsSync(RICH_FAILURES)) fs.rmSync(RICH_FAILURES)
        const r = spawnSync('node', ['scripts/build-psalter-prayers-rich.mjs'], {
          cwd: ROOT,
          encoding: 'utf8',
          timeout: 180000,
        })
        const report = fs.existsSync(RICH_FAILURES) ? fs.readFileSync(RICH_FAILURES, 'utf8') : ''
        const blob = (r.stdout ?? '') + '\n' + report
        const m = blob.match(/실패[:\s]+(\d+)/)
        expect(m, '실패 카운트 라인 미발견').toBeTruthy()
        expect(Number(m[1])).toBe(0) // RED: 한쪽만 고치면 divergence→실패
        // §C.2 (ii): 양쪽 절단 유지로 '실패 0' 우회 차단 — rich 完文 AND 단언.
        const richAfter = JSON.parse(fs.readFileSync(RICH_JSON, 'utf8'))
        const blocks = richAfter['Psalm 114:1-8']?.psalmPrayerRich?.blocks ?? []
        const flat = blocks
          .flatMap((b) => (b.spans ?? []).map((s) => s.text))
          .join(' ')
          .trim()
        expect(flat.endsWith('болтугай.')).toBe(true)
      } finally {
        fs.writeFileSync(RICH_JSON, richBefore)
        if (failBefore != null) fs.writeFileSync(RICH_FAILURES, failBefore)
      }
    },
    200000,
  )
})
