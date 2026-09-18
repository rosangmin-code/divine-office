# Review #318 — #317 F-X7b ordinarium/hymns.json plain-text 'Магтуу' residual cleanup (member-01)

> **TL;DR** — F-X7b 가 review #311 F-1 MAJOR scope-gap finding (alt-pick plain-text path 의 Магтуу 잔여) 를 정상 closure. 14 hymn 의 16 instance 를 `src/data/loth/ordinarium/hymns.json` `text` 필드에서 정확하게 strip, F-X7 (rich path) 와 동일한 hymn id set 으로 parity 검증 완료. Schema 보존, idempotency, regression guard 양쪽 path 통합 모두 만족. 10 AC 중 9 MET, AC-8 PARTIALLY_MET (whitespace-only blank line edge gap). 3 MINOR/NIT findings — 모두 follow-up 또는 cosmetic. **Verdict**: **APPROVED_WITH_ISSUES**.
>
> **Reviewer**: divine-review (adversarial-reviewer profile)
> **Author**: member-01
> **Subject commit**: `9dc4008` → main `969e99d` (4 files, +228/-37)
> **Pipeline**: analyze → adversarial-scan (peer: codex/quality_auditor, consensus AGREE) → verdict
> **Peer evidence**: exchange `ex_20260504T001524Z_6d0835c7` — APPROVED_WITH_ISSUES, HIGH confidence

---

## 1. Scope

member-01 가 #317 F-X7b dispatch (review #311 F-1 follow-up cohort) 를 다음과 같이 처리:

1. **Audit (`scripts/strip-ordinarium-magtuu-noise.mjs --dry-run`)**:
   - 14 hymn × 16 occurrences (41×2, 44, 45×2, 46, 50, 81, 82, 89, 93, 105, 108, 111, 115, 117)
   - F-X7 (#299) rich path 와 동일한 14 id set (set-equality 검증)
   - 모두 `line.trim() === 'Магтуу'` 단일 라인 토큰

2. **Strip script** `scripts/strip-ordinarium-magtuu-noise.mjs` (NEW, 111 lines):
   - `text.split('\n')` → drop lines whose `trim() === 'Магтуу'` → re-join
   - Collapse 2+ consecutive blank lines → 1 blank (paragraph-gap preserved, whitespace-pre-line CSS 시각 widening 방지)
   - Trim trailing blank lines (`...\n\n\n` at EOF artifact 제거)
   - Idempotent: rerun 시 0 occurrences 검출되면 no-op

3. **Regression guard 확장**:
   - `scripts/verify-no-page-noise.js`: 양쪽 path 모두 scan (rich + ordinarium), exit 1 on any hit
   - `src/lib/__tests__/data/hymn-page-noise.test.ts`: 2개 it() block 으로 split (rich + ordinarium 각각)

4. **Test evidence (executable)**:
   - npm test: 47 files / **917 tests** PASS (916 → +1 신규 ordinarium it())
   - npx tsc --noEmit: clean
   - npm run lint: 0 errors / 16 pre-existing warnings (변경 영역 무관)
   - `node scripts/verify-no-page-noise.js`: OK 0 occurrences (both paths)
   - `node scripts/strip-ordinarium-magtuu-noise.mjs` (rerun): no-op (idempotent)

## 2. Acceptance Criteria — verdict

| AC | Type | Criterion | Verdict | Evidence |
|----|------|-----------|---------|----------|
| AC-1 | executable | `verify-no-page-noise.js` 0 occurrences (both paths) | **MET** | `node scripts/verify-no-page-noise.js` → `OK — 0 occurrences of standalone 'Магтуу' in: src/data/loth/prayers/hymns (rich), src/data/loth/ordinarium/hymns.json (plain-text)`, exit 0 |
| AC-2 | executable | Idempotent stripper rerun | **MET** | `node scripts/strip-ordinarium-magtuu-noise.mjs` (post-fix rerun) → `[strip-ordinarium-magtuu-noise] no-op — 0 occurrences in src/data/loth/ordinarium/hymns.json`, exit 0. Implementation: L93-96 totalRemoved===0 short-circuit. |
| AC-3 | executable | Test guard split into rich + ordinarium it() blocks | **MET** | `npx vitest run src/lib/__tests__/data/hymn-page-noise.test.ts` → `PASS (2) FAIL (0)`. test file L85 (rich) + L95 (ordinarium) — both pass `expect(hits).toEqual([])`. |
| AC-4 | executable | npm test 917 tests pass | **MET** | `npm test` → `Test Files 47 passed (47), Tests 917 passed (917)`, exit 0. (916 → +1 new ordinarium it() block.) |
| AC-5 | executable | tsc --noEmit clean | **MET** | `npx tsc --noEmit` → `TypeScript: No errors found`, exit 0 |
| AC-6 | executable | lint 0 errors | **MET** | `npm run lint` → `ESLint: 0 errors, 16 warnings in 9 files`. 16 warnings 모두 pre-existing `@typescript-eslint/no-unused-vars`, F-X7b 변경 영역 무관 (`scripts/strip-ordinarium-magtuu-noise.mjs` 0 hits, `scripts/verify-no-page-noise.js` 0 hits, ordinarium/hymns.json 0 hits, hymn-page-noise.test.ts 0 hits). |
| AC-7 | semantic | Stripper precision: only standalone uppercase 'Магтуу' lines, no false positives | **MET** | `scripts/strip-ordinarium-magtuu-noise.mjs:49` `if (line.trim() === NOISE)` exact match — 'Магтуугаар' / 'Магтуу.' / lowercase 'магтуу' / mid-line 'X Магтуу Y' 모두 미매치. Schema 검증으로 14 hymn 외 변경 0건 확인. F-X7 (rich) 의 hand-decision (PDF SSOT uppercase) 와 동일한 정확성 기준. |
| AC-8 | semantic | Edge cases: blank-collapse + trailing-trim 정확 | **PARTIALLY_MET** | Standard empty-line case OK: `scripts/strip-ordinarium-magtuu-noise.mjs:62` blank-run counter (`line === ''`), `:71` trailing pop. **Gap (peer-flagged)**: whitespace-only line (e.g. `'  '`, U+00A0 only) 은 blank 으로 인식 안됨 → run reset, 인접 blank-collapse 미작동. 현 14 hymn 데이터 영향 없음 (실측 0 케이스), 미래 데이터 변형 시 silent 누락 가능. defensive minor. |
| AC-9 | semantic | Hymn-id parity F-X7 ↔ F-X7b (same 14 IDs) | **MET** | python3 `git show 9dc4008^:` vs `git show 9dc4008:` diff: 14 hymns changed, 16 lines removed (distribution 41×2, 44, 45×2, 46, 50, 81, 82, 89, 93, 105, 108, 111, 115, 117 — commit message 와 일치). F-X7 set: `{41,44,45,46,50,81,82,89,93,105,108,111,115,117}`. F-X7b set: identical, symmetric_diff = ∅. |
| AC-10 | structural | JSON schema preserved (no key drift, escape corruption) | **MET** | python3 round-trip: base/new key set equal (122 hymns), changed_count = 14, 14 hymn 모두 `text` 필드만 변경 (title/page/기타 필드 unchanged). `JSON.stringify(data, null, 2)` 가 entry 간 key order 또는 escape 변형을 일으킬 가능성 있으나 실측 git diff 가 only 14 hymn × text 만 보여줌. spread `{...entry, text: newText}` (`scripts/strip-ordinarium-magtuu-noise.mjs:89`) 로 다른 필드 보존. |

**9/10 MET, 1 PARTIALLY_MET (AC-8) — APPROVED_WITH_ISSUES with 3 MINOR/NIT findings.**

## 3. Adversarial scan — findings

### Finding F-1 (MINOR — defensive): Whitespace-only blank lines not treated as blank in collapse/trim

**관찰**: `scripts/strip-ordinarium-magtuu-noise.mjs:62` 의 blank 검출은 strict equality `line === ''`. 마찬가지로 `:71` 의 trailing-trim while-loop 도 `collapsed[len-1] === ''`. 결과:

- `'  '` (spaces only), U+00A0 (NBSP), U+200B (ZWSP) 등으로 구성된 "시각적 blank" 라인은 blank-run counter 를 리셋시켜 인접 blank 들과 collapse 되지 않음.
- 동일 이유로 trailing whitespace-only 라인은 trim 되지 않음.

**평가**: 현 14 hymn 의 strip 결과 데이터 (실측 git diff 14 hymn × `text` only) 에 영향 0건 — 즉 현 ordinarium/hymns.json 의 blank 들은 모두 strict empty. peer (codex) 도 동일 finding 을 minor 로 분류 (`hits not affected`). PDF re-transcribe 또는 데이터 추가 시 silent 누락 위험 존재.

**권고 follow-up (선택)**: stripper 의 blank 판정을 `line.trim() === ''` 로 완화. trailing-trim 도 동일 변경. 1-line patch 가능.

### Finding F-2 (MINOR — test depth): Regression guard 의 positive fixture 부재

**관찰**: `src/lib/__tests__/data/hymn-page-noise.test.ts:67-82` 의 `findOrdinariumNoise()` 는 실제 데이터 파일만 읽고, assertion `expect(hits).toEqual([])` (`:95-103`) 도 absence-only. 결과:

- `findOrdinariumNoise()` 자체에 버그가 있어 항상 빈 배열을 리턴해도 (e.g., 잘못된 path, 잘못된 트리밍 로직) test 가 silent pass.
- 미래 refactor 시 regex/path 변경이 detector 를 무력화해도 가드 못함.

3-point check: P=yes (positive intent: hits===[]), N=**no** (no negative fixture proving detection works), F=yes (PAGE_LABEL exact match). → **SHALLOW** by behavioral audit taxonomy.

**평가**: peer 도 동일 분류 ("shallow as a detector unit test, though adequate as a data regression guard"). 데이터-회귀 가드로는 충분하나 detector unit 자체의 회귀 가드는 없음.

**권고 follow-up (선택)**: in-memory fixture 를 추가하여 `findOrdinariumNoise(syntheticDataWithNoise)` 가 ≥1 hit 를 리턴함을 검증하는 it() 추가. Pure-function refactor 가 prerequisite (현재 함수가 fs.readFileSync 직접 호출).

### Finding F-3 (NIT — cosmetic): Comment-vs-code mismatch on blank-collapse rule

**관찰**: `scripts/strip-ordinarium-magtuu-noise.mjs:57` 의 주석:

```js
// Collapse 3+ consecutive empty lines -> 2 ("","" = single visual gap).
```

그러나 `:60-69` 의 코드 (`if (blankRun <= 1) collapsed.push(line)`) 는 실제로 `2+ → 1` 로 동작 (첫 blank 만 keep, 두 번째부터 drop).

**평가**: cosmetic discrepancy. Commit message 본문은 `2+ → 1` 의도를 정확히 기술. 동작 자체는 의도대로 (whitespace-pre-line CSS 에서 1 blank = 1 paragraph gap, 시각적 widening 방지). 문서화 결함 only.

**권고**: 1-line 주석 정정 (`Collapse 2+ consecutive empty lines -> 1`), 또는 무시 가능 수준.

## 4. Test method transparency

| AC-id | Test Level | Method | Actual Command | What Was Asserted | Limitation | level_check |
|-------|-----------|--------|----------------|-------------------|------------|-------------|
| AC-1 | L4 (Manual) | Node script subprocess | `node scripts/verify-no-page-noise.js` | exit 0 + "OK 0 occurrences" stdout (both paths) | uppercase exact match only; doesn't catch case-variant or NBSP-padded | OK |
| AC-2 | L4 (Manual) | Node script subprocess | `node scripts/strip-ordinarium-magtuu-noise.mjs` (rerun) | exit 0 + "no-op — 0 occurrences" stdout | post-fix state only; doesn't validate first-run behavior | OK |
| AC-3 | L3 (Unit) | vitest targeted | `npx vitest run src/lib/__tests__/data/hymn-page-noise.test.ts` | 2 it() blocks pass (rich + ordinarium) | Both blocks are absence-only (see F-2) | OK |
| AC-4 | L1 (E2E) | vitest full run | `npm test` | 47 files / 917 tests pass | vitest + jsdom only; no playwright e2e for alt-pick render | OK |
| AC-5 | L4 (Manual) | tsc subprocess | `npx tsc --noEmit` | 0 type errors | strict per tsconfig; no runtime check | OK |
| AC-6 | L4 (Manual) | ESLint subprocess | `npm run lint` | 0 errors (16 warnings allowed) | flat config rules only; F-X7b changed-area = 0 hits in summary | OK |
| AC-7 | L3 (Unit) | source code read + git diff | `Read scripts/strip-ordinarium-magtuu-noise.mjs:49` + diff inspection | exact `line.trim() === 'Магтуу'`; no false positive in 14-hymn diff | static; no fuzz of pathological inputs | OK |
| AC-8 | L3 (Unit) | source code read | `Read scripts/strip-ordinarium-magtuu-noise.mjs:60-71` | blank-run + trailing-pop logic correct for `''`; whitespace-only gap noted | strict equality; missed whitespace-padded blanks | OK (with PARTIAL verdict) |
| AC-9 | L3 (Unit) | python3 set-equality | `python3 ... set(base.keys())==set(new.keys()); ...` | F-X7 set ≡ F-X7b set (14 IDs); total removed = 16 | per-hymn count derived, not per-line PDF cross-ref | OK |
| AC-10 | L3 (Unit) | python3 JSON inspection | `python3 ... json.loads(base) vs json.loads(new); only 'text' field changed` | 122 keys preserved, only text field touched in 14 hymns | JSON.stringify could in theory reformat unrelated entries — git diff confirms it did not | OK |

`pair-cli verify-level` consistency: 모든 entry method-level 일치 (downgrade 없음).

## 5. Decision

**Verdict**: **APPROVED_WITH_ISSUES**

- 9/10 ACs MET, AC-8 PARTIALLY_MET (whitespace-only blank gap, defensive minor).
- 3 findings: F-1 MINOR (whitespace-only blank), F-2 MINOR (test detector positive fixture 부재), F-3 NIT (comment-vs-code).
- Pipeline consensus: Claude (adversarial) + Peer (codex/quality_auditor) AGREE on APPROVED_WITH_ISSUES.
- 모든 finding follow-up 가능, 차기 NIT batch 또는 F-X7b 후속 patch 로 처리 가능.

**Recommend follow-up tasks (선택, blocking 아님)**:
1. **F-1 (MINOR)** — stripper blank 판정을 `line.trim() === ''` 로 완화 + trailing-trim 동일 변경 (1-line patch).
2. **F-2 (MINOR)** — `findOrdinariumNoise()` 를 pure function 화 + synthetic-fixture positive-case it() 추가 (detector self-test).
3. **F-3 (NIT)** — `strip-ordinarium-magtuu-noise.mjs:57` 주석 `Collapse 2+ → 1` 로 정정.

**No revise required for #317 itself** — F-X7b 는 declared scope 내 정확하게 작동, F-X7 (rich) ↔ F-X7b (plain-text) parity 완성, regression guard 양쪽 path 통합 완료.

**Out-of-scope (commit msg에서 author 가 명시한 deferred 항목)**:
- F-X7c (3 hymns 41/45/111 PDF page-break stanza-drift) — review #311 F-2 에서 식별된 별도 cohort.
- F-X8 (#300, Магтуу 류 줄바꿈 규칙) — in_progress, F-X7b 의 leftover stanza-internal blank line (e.g. hymn 41 L1) 은 본 task 에서 handle 예정.

---

## 6. Reviewer notes

- **Direct closure of review #311 F-1**: F-X7b 가 F-X7 review 의 첫 번째 MAJOR follow-up cohort 를 정확히 closure. dispatch 시 `pre_skill_command` (worktree-verify-base --fix) 로 worktree HEAD 를 dispatched base_commit 와 일치시켜 false-PASS 위험 차단 (memory `feedback_enterworktree_base_mismatch.md` 참조).

- **F-X7 ↔ F-X7b parity 검증**: python3 set-equality 로 동일 14 hymn id 확인. 16 line distribution (41×2, 45×2, others×1) 도 commit message 와 일치. F-X7 의 audit 가 신뢰할 수 있는 SSOT 임을 재확인.

- **Stripper architectural choice**: F-X7 의 strip-hymn-magtuu-noise.mjs 는 rich.json 의 block/lines/spans nested 구조를 다루며 Pattern A (single-line stanza) + Pattern B (first-line-of-stanza) 두 케이스 분리. F-X7b 는 plain-text `text` 필드의 `\n` separated string 만 다루므로 단일 Pattern A (standalone-text-line) 로 충분. 두 script 가 서로 다른 데이터 shape 에 맞춤 — 코드 복제가 아닌 path-specific tool.

- **Verifier통합**: `scripts/verify-no-page-noise.js` 가 양쪽 path 를 동시 scan, 단일 exit-code 로 CI 통합 가능 (현재 npm scripts 미연동 — review #311 F-3 에서 식별된 design nit, F-X7b 에서도 동일 상태 유지). 본 review scope 외이며 별도 follow-up.

- **Whitespace-pre-line CSS 정합성**: stripper 의 blank-collapse 가 `2+ → 1` 인 이유는 whitespace-pre-line 에서 `\n\n` 이 paragraph gap 으로 표현되기 때문. 만약 `2+ → 2` 로 두면 시각적으로 더 넓어짐. 이 결정은 commit message 에 정확히 기술되어 있으나 stripper 주석 (`:57`) 에는 잘못 표기 (F-3).

- **인접 cohorts**:
  - #300 F-X8 (대문자=새 절, 소문자=wrap, 들여쓰기 없음) 가 in_progress. F-X7b 의 leftover stanza-internal blank line (hymn 41 의 "1. Есүс мандан ирсэн\n\nИх адис хайранд" 같은 pattern) 은 F-X8 에서 줄바꿈 규칙으로 handle 예상.
  - F-X7c (review #311 F-2 finding, 3 hymn page-break stanza-drift) 는 별도 cohort 로 deferred — 본 review 와 무관.
