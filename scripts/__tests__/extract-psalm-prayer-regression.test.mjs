/**
 * GOAL #105 / WI #109 ([#105-sub-4]) — 시편기도 전수 회귀 + NEEDS_REVIEW
 * baseline + dual-path — **회귀/통합 계층 (b)+(D3)**.
 *
 * 계약: docs/research/GOAL105-spec.md §D.1(전수 = 수정된 extractPsalmPrayer 를
 *   import 해 102 마커에 직접 실행; 구 GOAL100-truncation-sweep 복제 단독 금지) +
 *   §D.2(NEEDS_REVIEW 4-baseline allowlist + 신규0) + §C/§D.3c(dual-path
 *   fresh-run failures=0 AND rich 完文).
 * 시나리오: §6.1(검증 blind-spot 최우선) / §2.1·§2.4(over-absorb) / §2.5(dual-path) / §6.5(baseline).
 *
 * 재설계(#109 재오픈, base b0a3971): 이전 describe 2 는
 *   `spawnSync('node', extract-psalm-texts.js)`(full overwrite) 산출을 **committed
 *   psalter-texts.json(큐레이트본)** 과 byte 비교했다. committed 본은 extractor +
 *   캐논티클 스크립트 + #42 수동 prayer 교정의 누적(extract-psalm-texts.js 헤더
 *   L14-28 "don't re-run as full overwrite")이라 full re-run 은 **비멱등**(10 refs
 *   회귀) → 시편114 완벽수정에도 FAIL 한다. spec §D.1 권장안대로 **import-over-
 *   markers** 로 교체하고, 기준선은 **OLD(ee45f5d, 수정 전) 함수를 동일 102 마커에
 *   fresh 실행한 산출**(committed 데이터 대비 아님)로 둔다.
 *
 * #111 계약(b0a3971): `extractPsalmPrayer(lines, startIdx, onNeedsReview?)` — 콜백.
 *   terminal末 + non-marker next 에서 STOP 시 `onNeedsReview({line, tailRaw, nextHead})`
 *   호출(week 는 caller 가 주석). require.main 가드로 import 부작용 없음. committed
 *   psalter-texts.json / rich.json 의 데이터 단언은 layer-c(psalm114-prayer-
 *   completeness.test.mjs)가 담당 — 여기서 중복 금지.
 *
 * ⚠️ 소스 코퍼스: `parsed_data/week{1..4}/*_final.txt` + `parsed_data/full_pdf.txt`
 *   는 main 체크아웃 **untracked** → worktree 기본 부재. (b)전수실행·(D3)dual-path 는
 *   `SOURCES_PRESENT` 게이트로 소스 보유 환경에서만 실행(메인 체크아웃, 또는 메인에서
 *   parsed_data 심링크). describe 1(committed 아티팩트)·layer-a 픽스처는 소스 불요.
 */

import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import { spawnSync, execFileSync } from 'node:child_process'
import path from 'node:path'
const require = createRequire(import.meta.url)
const fs = require('fs')
const os = require('os')

// 수정된(NEW) 추출기 — require.main 가드가 있어 import 시 main() 부작용 없음.
// PRAYER_TERMINAL_RE 는 impl 의 종결집합 SSOT(드리프트 방지) 재사용.
const { extractPsalmPrayer, PRAYER_TERMINAL_RE } = require('../extract-psalm-texts.js')

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const NEEDS_REVIEW = path.join(ROOT, 'scripts/out/psalmprayer-needs-review.json')
const RICH_FAILURES = path.join(ROOT, 'scripts/out/psalter-prayers-rich-failures.md')
const RICH_JSON = path.join(ROOT, 'src/data/loth/prayers/commons/psalter-texts.rich.json')
const SRC_WEEK1 = path.join(ROOT, 'parsed_data/week1/week1_final.txt')
const PDF = path.join(ROOT, 'public/psalter.pdf')

const SOURCES_PRESENT = fs.existsSync(SRC_WEEK1)
const DUALPATH_RUNNABLE = SOURCES_PRESENT && fs.existsSync(PDF)
if (!SOURCES_PRESENT) {
  console.warn(
    '[#109] parsed_data 소스 코퍼스 부재(worktree untracked) → import-over-markers 전수실행 skip. ' +
      '소스 보유 환경(메인 체크아웃 / parsed_data 심링크)에서 실행 필요.',
  )
}
if (!DUALPATH_RUNNABLE) {
  console.warn('[#109] PDF(public/psalter.pdf) 부재 → dual-path fresh-run 테스트 skip.')
}

// 고정 baseline allowlist (spec §D.2, 4 시그니처) — week:line 키.
const BASELINE_KEYS = ['2:3577', '3:644', '4:55', '4:691']
// 4 STOP 의 다음-섹션 head (over-absorb 음성 단언 — 어떤 기도에도 흡수되면 안 됨).
const DROP_HEADS = ['Амилалтын улирал:', 'Хоол хүнс өгчээ.', 'Манаач хүн', '(Х. Аллэлуяа!)']
const PRAYER_MARKER = /^Дууллыг төгсгөх залбирал/
const P114_FINGERPRINT = 'Та ус ба Сүнсний'

// 전 weekN(week1-4)의 모든 "Дууллыг төгсгөх залбирал" 마커(102개)에 `fn` 직접 실행.
// 반환: { outputs: [{week,line,text}], sink: NEEDS_REVIEW entries }.
// #111 콜백 계약: extractPsalmPrayer(lines, startIdx, onNeedsReview) — terminal+
// non-marker STOP 시 onNeedsReview({line,tailRaw,nextHead}) 호출, week 는 여기서
// 주석. OLD(2-arg)는 3번째 콜백 인자를 무시 → sink 비어 있음.
function sweepMarkers(fn) {
  const outputs = []
  const sink = []
  for (const w of [1, 2, 3, 4]) {
    const file = path.join(ROOT, `parsed_data/week${w}/week${w}_final.txt`)
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
      if (!PRAYER_MARKER.test(lines[i].trim())) continue
      const text = fn(lines, i, (e) => sink.push({ week: w, ...e }))
      outputs.push({ week: w, line: i + 1, text })
    }
  }
  return { outputs, sink }
}

// OLD(ee45f5d, case-gate 절단) extractPsalmPrayer 를 git 에서 꺼내 import.
// OLD 파일은 export/require.main 가드가 없고 끝에 무조건 `main()` 을 호출하므로,
// (1) 끝의 main() 호출을 제거하고 (2) module.exports 를 덧붙인 뒤 os.tmpdir() 에
// 써서 require 한다. tmpdir 격리 — 설령 main() 이 남아 실행돼도 OUTPUT 경로가
// tmpdir 기준이라 worktree 의 psalter-texts.json 을 건드리지 못한다(방어 2중).
function loadOldExtractor() {
  const src = execFileSync('git', ['show', 'ee45f5d:scripts/extract-psalm-texts.js'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  })
  const stripped = src.replace(/\nmain\(\)\s*;?\s*$/, '\n')
  if (/^main\(\)/m.test(stripped)) {
    throw new Error('[#109] OLD extractor 의 main() 호출 제거 실패 — require 중단(데이터 보호)')
  }
  const patched = stripped + '\nmodule.exports = { extractPsalmPrayer }\n'
  const tmp = path.join(os.tmpdir(), `goal105-extract-old-ee45f5d-${process.pid}.cjs`)
  fs.writeFileSync(tmp, patched)
  return require(tmp).extractPsalmPrayer
}

// @fr GOAL-105 [D2]
describe('GOAL#105 [D2] NEEDS_REVIEW = 4 baseline allowlist + 신규 0 (committed 아티팩트)', () => {
  it('scripts/out/psalmprayer-needs-review.json == 4 baseline(week:line), length 4', () => {
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

// @fr GOAL-105 [D2] — import-over-markers 전수회귀 (§D.1 권장안, §6.1 blind-spot 최우선)
describe('GOAL#105 [D2] import-over-markers 전수회귀 (수정 함수 × 102 마커)', () => {
  it.skipIf(!SOURCES_PRESENT)(
    'NEW: 시편114 흡수(болтугай.) + over-absorb 0(drop head 부재) + 신규절단 0(종결) + NEEDS_REVIEW=4 baseline',
    () => {
      const { outputs, sink } = sweepMarkers(extractPsalmPrayer)
      expect(outputs.length, '마커 전수(102) 미스윕').toBe(102)

      // [D1] 시편114 = 完文: fingerprint 포함 산출이 정확히 1건, болтугай. 종결.
      const p114 = outputs.filter((o) => o.text && o.text.includes(P114_FINGERPRINT))
      expect(p114.length, '시편114 흡수 산출 != 1').toBe(1)
      expect(p114[0].text.trim().endsWith('болтугай.'), '시편114 完文 미종결').toBe(true)

      // [D2 over-absorb 음성] 어떤 산출에도 4 STOP 의 다음-섹션 head 부재(§2.1/§2.4).
      for (const o of outputs) {
        if (o.text == null) continue
        for (const drop of DROP_HEADS) {
          expect(
            o.text.includes(drop),
            `w${o.week}:${o.line} 가 다음섹션 '${drop}' 흡수(over-absorb)`,
          ).toBe(false)
        }
      }

      // [D2 신규 절단 0] 모든 비-null 산출이 종결집합(PRAYER_TERMINAL_RE)으로 끝남.
      for (const o of outputs) {
        if (o.text == null) continue
        expect(
          PRAYER_TERMINAL_RE.test(o.text.trim()),
          `w${o.week}:${o.line} 비종결 종료(신규 절단 의심): ...${o.text.trim().slice(-30)}`,
        ).toBe(true)
      }

      // [D2 NEEDS_REVIEW] 수정 함수(콜백)의 fresh sink == 4 baseline(week:line), 신규 0.
      expect(sink.length, 'NEEDS_REVIEW sink != 4').toBe(4)
      expect(sink.map((e) => `${e.week}:${e.line}`).sort()).toEqual(BASELINE_KEYS)
    },
  )

  it.skipIf(!SOURCES_PRESENT)(
    'OLD↔NEW 전수 diff = 정확히 1건(시편114): OLD 절단(минь,) → NEW 完文(болтугай.), 나머지 101 byte-불변',
    () => {
      // §6.1: 新 completeness 가 "구 break-set 밖"에 만드는 over-absorb 까지 포착하려면
      // 구 sweep 시뮬레이터가 아니라 OLD 실함수 산출과 전수 비교해야 한다.
      const { outputs: nu } = sweepMarkers(extractPsalmPrayer)
      const oldFn = loadOldExtractor()
      const ol = []
      // OLD 는 (lines,startIdx) 2-arg — 동일 마커 순서로 산출(3번째 콜백 인자 무시).
      for (const w of [1, 2, 3, 4]) {
        const lines = fs
          .readFileSync(path.join(ROOT, `parsed_data/week${w}/week${w}_final.txt`), 'utf8')
          .split(/\r?\n/)
        for (let i = 0; i < lines.length; i++) {
          if (!PRAYER_MARKER.test(lines[i].trim())) continue
          ol.push({ week: w, line: i + 1, text: oldFn(lines, i) })
        }
      }
      expect(ol.length).toBe(nu.length)

      const diffs = []
      for (let k = 0; k < nu.length; k++) {
        if ((nu[k].text ?? null) !== (ol[k].text ?? null)) {
          diffs.push({ week: nu[k].week, line: nu[k].line, old: ol[k].text, new: nu[k].text })
        }
      }
      // 유일 delta = 시편114(w1:740). 그 외 마커에서 NEW≠OLD 이면 over-absorb/회귀.
      expect(
        diffs.length,
        `OLD↔NEW diff 가 1건(시편114) 초과 — 신규 회귀: ${JSON.stringify(
          diffs.map((d) => `${d.week}:${d.line}`),
        )}`,
      ).toBe(1)
      const d = diffs[0]
      // OLD = 절단(흡수 전: fingerprint 미포함, минь, 종료) → NEW = 完文.
      expect(d.old.includes(P114_FINGERPRINT), 'OLD 가 이미 흡수됨(절단 재현 실패)').toBe(false)
      expect(d.old.trim().endsWith('минь,'), 'OLD 절단 末이 минь, 아님').toBe(true)
      expect(d.new.includes(P114_FINGERPRINT)).toBe(true)
      expect(d.new.trim().endsWith('болтугай.')).toBe(true)
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
        expect(Number(m[1])).toBe(0) // 한쪽만 고치면 divergence→실패
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
