# Review #435 — F-X11 Phase 2-A — detectRefrains 일반화 (2..4 dynamic)

> **TL;DR** — solver 의 detectRefrains 일반화 (length=2 fixed → 2..4 longest-match-wins) 와 refineParagraphBoundariesWithRefrains multi-line 자동 지원을 검증. 알고리즘 정확, 65 tests PASS, lint clean, live PDF 6/6 spot-check 모두 solver 주장과 정확히 일치. **Verdict**: APPROVED_WITH_ISSUES (CONDITIONAL). Phase 2-B prerequisite 충족.

- Reviewer: divine-review (adversarial-reviewer)
- Reviewee: solver (#435)
- Base: d6e7e13 (Merge 435-solver) → solver commit 4651e43
- Date: 2026-05-09
- Peer audit: codex (quality_auditor)

---

## 1. 변경 요약

**Files changed** (+503 -83):
- `scripts/parsers/extract-phrases-from-pdf.mjs` (+201 -45)
- `scripts/parsers/__tests__/extract-phrases-from-pdf.test.mjs` (+302 -38)

**알고리즘 변경**:
1. `detectRefrains(stanzaLines, maxLength=4)`:
   - **Before** (#418): length=2 fixed window matching.
   - **After** (#435): length=2..MAX_REFRAIN_LENGTH (default 4) longest-match-wins per starting position.
   - 각 시작 i 에서 cap = min(maxLength, floor((n-i)/2)) 로 산출, len=cap..2 시도, 첫 ≥2 instance 채택.
   - `used` set + `j += len` 점프로 non-overlap 보장.
   - `MAX_REFRAIN_LENGTH = 4` 새 export, `maxLength` 인자 configurable.
2. `refineParagraphBoundariesWithRefrains`:
   - **알고리즘 변경 없음** — 기존부터 `r.length` 를 사용하여 multi-line 자동 지원.
   - docstring 만 multi-line 케이스 worked example 추가.

---

## 2. AC Registry (per-AC verdict)

| AC | Type | Criterion | Verdict | Evidence |
|----|------|-----------|---------|----------|
| AC-1 | semantic | 알고리즘 correctness (cap, longest-match, used-set) | **MET** | detectRefrains:608-683. cap=min(maxLength, floor((n-i)/2)) line 644 — 2 non-overlapping windows 보장. j+=len jump line 659 — overlap 방지. trimmed comparison line 630-634. |
| AC-2 | executable | Backward-compat — 2-line refrain (Psalm 46/67) + no-refrain (Psalm 110) 보존 | **MET** | Live PDF: Psalm 46:2-12 → refrains=[{8,2},{18,2}] PB=[8,10,18,20] 동일. Psalm 67:2-8 → refrains=[{13,2},{18,2}] 동일. Psalm 110 → refrains=[] PB=[]. 65 PASS in target test file. |
| AC-3 | executable | New behavior — 3-line (Psalm 8) + 4-line (Psalm 80) 단일 instance per occurrence | **MET** | Live PDF: Psalm 80:2-8,15-20 (book 246 left) → refrains=[{11,4},{24,4}] PB=[11,15,24,28] = builder coord [6,10,19,23] = #434 hotfix shape. Psalm 8:2-10 (book 282 right) → refrains=[{1,3},{25,3}] PB=[1,4,25] = builder coord [3,24] = #434 hotfix shape. |
| AC-4 | semantic | refineParagraphBoundariesWithRefrains multi-line 자동 지원 (no algorithm change) | **MET** | r.length 사용 line 743-748. Adjacent zero-gap (after === beforeNext) 정확 처리. Tests: 3-line Psalm 8 shape line 1019-1028, 4-line Psalm 80 shape line 1030-1038. |
| AC-5 | structural | Test coverage — 14 new tests (3-line/4-line/longest/cap/explicit/tail/adjacent) | **PARTIALLY_MET** | git diff 결과 +12 added it() (1 deleted-and-replaced 포함). Solver commit body claims "51→65" (+14) 와 dispatch "+14 new" 모두 imprecise. 실제 +11 net (or +12 added). 토픽 coverage 는 모두 존재 — 단지 count 정확성 nit. |
| AC-6 | executable | Edge cases — n<4=[], maxLength<2=[], whitespace excluded, trimmed compare | **MET** | n<4 line 611, maxLength<2 line 612, trimmed[].length===0 exclusion line 623. NaN maxLength → for-loop NaN>=2 false → safe []. |
| AC-7 | structural | Phase 2-B prerequisite — algorithm only, no rich.json data change | **MET** | 4651e43 only touches 2 files (extractor + test). rich.json 무변경. 124 ref re-extraction Phase 2-B 별 task. |

**Overall verdict**: APPROVED_WITH_ISSUES (CONDITIONAL — peer + Claude 합의 R1).

---

## 3. Live PDF spot-check (6 refs, 모두 ✅)

| Ref | Book p. | Column | refrains | PB (extractor) | Builder coord | Expected | 일치 |
|-----|---------|--------|----------|----------------|---------------|----------|------|
| Psalm 80:2-8, 15-20 | 246 | left | [{11,4},{24,4}] | [11,15,24,28] | [6,10,19,23] | #434 hotfix | ✅ |
| Psalm 8:2-10 | 282 | right | [{1,3},{25,3}] | [1,4,25] | [3,24] | #434 hotfix | ✅ |
| Psalm 46:2-12 | 152 | right | [{8,2},{18,2}] | [8,10,18,20] | [7,9,17,19] | #418 baseline | ✅ |
| Psalm 67:2-8 | 239 | right | [{13,2},{18,2}] | [13,15,18,20] | [6,8,11,13] | rich.json 일치 | ✅ |
| Psalm 110:1-5,7 | 68 | left | [] | [] | n/a | no-refrain | ✅ |
| Daniel 3:52-57 | 179 | right | [{9,3},{17,3},{21,3},{26,3}] | [3,9,12,17,20,21,24,26] | TBD (Phase 2-B) | NEW 4×3-line | ✅ |

**Notable findings**:
- Daniel 3:52-57 4 instance × length=3 refrain detection 은 #435 가 가능하게 한 NEW 케이스. Pre-#435 length=2 fixed 로는 detect 못함. Phase 2-B inject 시 데이터 변경 예상.
- Psalm 80 4-line refrain 의 builder coord [6,10,19,23] 는 #434 manual hotfix data 와 자연스럽게 align — algorithm 가 완성되면 hotfix override 의 SSOT 가 algorithm 으로 이동 가능 (Phase 2-B).

---

## 4. 테스트 evidence

```bash
# Targeted (extractor module):
npx vitest run scripts/parsers/__tests__/extract-phrases-from-pdf.test.mjs --reporter=verbose
# Test Files  1 passed (1)
# Tests       65 passed (65)
# Duration    296ms

# Full suite:
npm test 2>&1 | tee /home/min/.claude/pair-cowork/scratch/divineoffice/test-out-task-436.log
# Test Files  50 passed (50)
# Tests       1060 passed (1060)
# Duration    5.22s

# Lint:
npx eslint scripts/parsers/extract-phrases-from-pdf.mjs scripts/parsers/__tests__/extract-phrases-from-pdf.test.mjs
# ESLint: No issues found
```

**테스트 추가 분석** (git diff 4651e43):
- **Added** (12): `detectRefrains` 7 (3-line, 4-line, longest-match-wins, 5+-line cap, explicit maxLength, tail-end, adjacent), `refineParagraphBoundariesWithRefrains` 3 (3-line shape, 4-line shape, mid-refrain interior survival), `splitIntoStanzas` 2 (4-line integration, 3-line integration).
- **Deleted** (1): "only locks the first 2 lines of a repeating 3-line refrain (length is fixed at 2)" — pre-#435 negative test 가 새 동작 (length=3 detection) 으로 의도적으로 교체됨. **정확하고 의도적**.
- Net: +11 (or +12 if counting replacement as new).

---

## 5. Adversarial scan — 6축 결과

| 축 | 발견 | 심각도 |
|----|------|--------|
| Edge cases | n=4 length=2 (smallest valid) 직접 테스트 없음 — 알고리즘 trace 로 정상 동작 확인 | NIT |
| Off-by-one | cap=floor((n-i)/2) 정확. 2 non-overlapping len-window 보장 | OK |
| Race | 동기 JS, 동시성 없음 | OK |
| Input validation | NaN/negative/0/1 maxLength 모두 safe-fail. null/undefined stanzaLines 미검증 (caller=splitIntoStanzas 만 호출) | OK |
| Off-by-one | tail-end refrain (start + length === stanzaLineCount) suppressed 정확 | OK |
| Resource leak | 순수 함수, stack-only, no I/O | OK |

**Codex peer 추가 finding**:
- **Sub-pattern aliasing risk** (NIT): 알고리즘은 per-start longest-match, 글로벌 longest-match 가 아님. 가설 stanza ['A','B','A','B','C','D','A','B','C','D'] 에서 'AB' 2-line 이 i=0 에서 먼저 lock 되어 'ABCD' 4-line composite at i=2 가 occluded. 실제 corpus 에서는 contrived case — 현실 risk 낮음.

---

## 6. Issues (NIT, non-blocking)

### N-1 (codex peer): Sub-pattern aliasing
**Severity**: NIT (theoretical edge case, not corpus-relevant)
**Description**: per-start longest-match 알고리즘은 글로벌 최적이 아님. 짧은 refrain 이 긴 refrain 의 일부 라인을 먼저 lock 하면 긴 refrain detect 못함.
**Mitigation**: 현실 corpus 에서는 multi-line refrain 의 라인이 다른 곳에서 정확히 반복되지 않음. Phase 2-B 후 한번 더 audit 권고.

### N-2 (codex peer + reviewer): 테스트 count 정확성
**Severity**: NIT (documentation precision)
**Description**: dispatch "+14 new" 와 commit body "51→65" 모두 정확하지 않음. 실제는 12 added + 1 deleted-and-replaced (+11 net).
**Mitigation**: commit body 에 정확한 카운트 기재 (future commits). Topic coverage 는 충분.

### N-3 (reviewer): Coverage gap — n=4 length-2
**Severity**: NIT
**Description**: 가장 작은 valid case (n=4, length-2 refrain `['A','B','A','B']`) 직접 테스트 없음. 알고리즘 trace 로는 정확 동작 확인.
**Mitigation**: 다음 NIT batch 에서 1 line 추가 가능.

### N-4 (reviewer): Daniel 3:52-57 4-instance multi-line 단위 테스트 없음
**Severity**: LOW
**Description**: live PDF 에서 4 instance × length=3 refrain detect 확인했으나 단위 테스트는 2-line × 3 instance 만 존재.
**Mitigation**: Phase 2-B 에서 Daniel 3:52-57 가 deferred refs 에 포함되어 있다면 fixture 테스트 추가 권고.

### N-5 (reviewer): MAX_REFRAIN_LENGTH=4 conservativeness
**Severity**: LOW (info)
**Description**: 5+ line refrain 가 corpus 에 출현하면 length=4 partial detect + 잠재적 length-2 leftover. 현재 corpus 에서는 미관측.
**Mitigation**: Phase 2-B audit 시 5+-line 케이스 surfacing 모니터.

---

## 7. 합의 결과 (R1)

| 참가자 | Stance | Confidence |
|--------|--------|------------|
| Claude (divine-review) | AGREE (APPROVED_WITH_ISSUES) | HIGH |
| Codex peer (quality_auditor) | AGREE (APPROVED_WITH_ISSUES) | HIGH |

`pair-cli discussion submit-stance` → consensus_reached: true at round 1.

---

## 8. Phase 2-B 권고사항

#435 는 algorithm-only fix (no data change). Phase 2-B (124 deferred refs 일괄 재추출 + inject) 진행 시:

1. **재추출 diff 검증**: 새 algorithm 으로 124 refs 재추출 → rich.json 현재 데이터 (#427 + #434 hotfix) 와 정확 비교.
   - Psalm 80 / Psalm 8 hotfix 는 algorithm 결과로 자연 일치 → hotfix override 제거 가능 (SSOT consolidation).
   - Psalm 46 / 67 / 110 등 95 PASS refs 는 데이터 무변경 예상.
   - Daniel 3:52-57 등 새로 detect 되는 multi-line refrain refs → 데이터 변경 예상, curator review queue 에 surface.
2. **사용자 visual smoke 테스트**: Daniel 3 / Psalm 80 / Psalm 8 모바일 렌더링 직접 확인 (CACHE_VERSION bump 필요 시).
3. **CACHE_VERSION bump**: rich.json 데이터 변경되므로 `public/sw.js` 의 `divine-office-vN` 갱신 필요. SW navigation 정책 무변경.

---

## 9. Decision

**APPROVED_WITH_ISSUES (CONDITIONAL)** — production merge 가능. Phase 2-B 별 task 진행 권고.

NITs 는 follow-up batch 으로 처리 (현재 커밋 amend 불필요):
- N-2 (test count documentation) — 다음 commit body 에서 정확 카운트
- N-3 (n=4 length-2 test) — 1-line 추가
- N-4 (Daniel 3:52-57 fixture) — Phase 2-B 와 함께
