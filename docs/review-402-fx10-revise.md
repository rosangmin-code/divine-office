# Re-review #402 — F-X10 revise (#396): Stage 2 gate strengthening + 12/13 over-merge correction

**Reviewer**: divine-review (independent — author: solver)
**Target**: commit 553c71b (merged via f1fc1eb), worktree 402-divine-review @ base f1fc1eb
**Peer**: codex (quality_auditor), discussion R1 → consensus APPROVED_WITH_ISSUES
**Verdict**: **APPROVED_WITH_ISSUES** (prior 4 MAJOR all resolved within declared scope; 0 blockers)
**Prior review**: docs/review-389-fx10-fix.md (CONDITIONAL — 4 MAJOR)

> **TL;DR** — F-X10 revise resolves all 4 MAJOR from #389: F-1 over-merge (13 candidates → 0 active, 1 allowlisted), F-2 Stage 2 gate (`score >= max(2, occ/5)` + sentence-boundary filter), F-4 invariants (max_span + phrase/line ratio + 13% floor + allowlist). F-3 (per-content-block baseline) explicitly deferred to F-X11 cohort with minimal 1-block allowlist (Psalm 147:12-20 block 1 — peer-verified structural cause). 6 secondary findings all minor/nit non-blocking. Both Claude+Peer consensus APPROVED_WITH_ISSUES at HIGH confidence.

---

## §1. AC matrix (re-review of prior 4 MAJOR)

| AC | Type | Verdict | Evidence |
|----|------|---------|----------|
| **AC-1** (#389 F-1): Over-merge correction (max_span ≤ 5) | structural | **MET** | Pre-revise: 13 candidates (Psalm 32 [0,14] 15 lines, Psalm 143 [0,13] 14 lines, Rev 11 [0,11] 12 lines, Psalm 116 [0,9] 10 lines, Psalm 100 [8,17] 10 lines, etc.). Post-revise: 0 active violations (max_span ≤ 2 across all corrected). 1 deferred (Psalm 147:12-20 block 1, span 5) under explicit allowlist. |
| **AC-2** (#389 F-2): Stage 2 gate strengthening | structural | **MET** | extract-phrases-from-pdf.mjs:294 — `if (best.score >= max(2, best.occurrence / 5)) return best.col`. scoreWraps line 213 — `!SENTENCE_END_RE.test(prev.trim())` filter. Both directly implement my prior recommendations (a) absolute floor 2 + (b) density-relative + sentence-boundary. JSDoc Worked Examples (Psalm 46/110/32 page 136) addresses prior F-2 NIT on threshold rationale opacity. |
| **AC-3** (#389 F-3): Per-content-block baseline | semantic | **PARTIALLY_MET (deferred)** | Explicit deferral to F-X11 cohort. KNOWN_DEFERRED_OVER_MERGE allowlist with single entry (Psalm 147:12-20::block-1) + structural rationale comment. Peer verified: PDF physical 135 col 0 prose (closing prayer + reading) = 20 lines vs col 3 verses = 7 lines → Stage 1 dominance correctly picks col 0 (20 > 2×7). Resolution requires per-stanza baseline detection — accepted scope of F-X11 cohort. |
| **AC-4** (#389 F-4): Test invariant strengthening | structural | **MET** | wrap-rate-invariant.test.mjs added: `MAX_PHRASE_SPAN = 5` (catches over-merge), `MIN_PHRASE_LINE_RATIO = 0.4` for blocks ≥5 lines (catches collapse where wrap-rate satisfies), `KNOWN_DEFERRED_OVER_MERGE` allowlist, wrap-rate floor 15→13% with mechanism explanation. New unit test fixture psalter-physical-069.txt + 45-line test for Psalm 32 page 136 regression. |
| **AC-5** (test gate): vitest 988 PASS / 0 FAIL | executable | **MET** | `npx vitest run` → PASS (988) FAIL (0). Log: `~/.claude/pair-cowork/scratch/divineoffice/test-out-task-402.log`. 985 baseline + 3 new (max_span + ratio + Psalm 32 fixture). |
| **AC-6**: PILOT preservation | structural | **MET** | Psalm 110:1-5,7 R-7 multi-line invariant maintained (separate test passing). |
| **AC-7**: User-reported case (Psalm 46) preservation | structural | **MET** | Psalm 46 wrap pair "Далайн зүрх рүү ... / бид айхгүй." maintained (separate test passing). |
| **AC-8**: CLAUDE.md checklist | structural | **MET** | 링크/URL/자산 변경 없음 (extractor + data + tests). 모바일 회귀 sample (Psalm 32/143/Rev 19/116) 정정 확인. 몽골어 SSOT 변경 없음. CACHE_VERSION bump 불필요 (rich.json은 bundled). |

**전체 verdict**: **APPROVED_WITH_ISSUES**

---

## §2. Findings (peer + adversarial scan, both AGREE)

모두 minor/nit — 0 blockers.

### F-1 [MINOR, accept-with-issues] Sentence-filter regex `.)`, `!)`, `?]` 미지원
**증거 (peer)**: scoreWraps의 `!SENTENCE_END_RE.test(prev.trim())` filter는 `.`, `!`, `?` + optional close-quote 만 인식. PDF에 `....)` 또는 `?]` 같은 trailing 결합 가 등장하면 sentence-end 인지 못 하고 wrap pair 로 카운트 → 잠재 false-positive over-merge.

**현재 상태**: 노출 없음 (현 데이터에 active over-merge 없음).

**제안**: 차후 NIT 묶음에 regex 확장 — 단, latent 이며 비차단. PDF SSOT 에서 `.)` patterns 발견 시 즉시 fix.

### F-2 [NIT, accept] Occurrence-relative gate threshold (/5 = ~20%)
**증거 (peer)**: 게이트 shape (`max(2, occ/5)`) 가 적절. occ=1 single-column 는 candidates 가 count >= 2 필터로 사전 차단되어 Stage 2 미도달. Dominant 30-line column 은 Stage 1 dominance 가 먼저 처리. 30-line 본문 + 5 noise 의 occ=30 → gate=6 도 healthy psalm 에서 달성 가능 (Psalm 24 left col ~43%, Psalm 110 left col mid-30%).

### F-3 [MINOR, accept] Fallback 6 cases max_span=1 — round-trip 우려 해소
**우려**: 11 corrected 중 6 cases (Psalm 32 / 143 / Rev 19 / 116:10-19 / 116:1-9 / 62 / 33) 가 post-fix 에서 max_span=1 — 모두 single-line phrase 로 fragmenting. 이는 pre-F-X10 의 ALL-single fragmentation 과 같음 → round-trip 회귀 의심.

**Peer 검증**: PDF physical page 136 (Psalm 32 page 136) raw lines 가 동일 col 3 baseline 이며 +3 wrap 구조 자체가 PDF 에 존재하지 않음. extractor 가 내부적으로 review flag 를 띄우지만 rich injection 은 정확히 huge phrase 를 회피. → all-single 이 STRUCTURALLY 정확한 추출 (PDF 에 wrap pair 가 없음). round-trip regression 아님.

**해소**: peer evidence 가 이 6 cases 의 PDF 구조를 검증 → all-single 이 정확한 동작. F-X11 cohort 가 처리할 case 와 별개 (F-X11 은 closing-prayer + verses 혼재 column).

### F-4 [MINOR, accept] Allowlist 범위 적정성
**검증**: KNOWN_DEFERRED_OVER_MERGE 는 정확히 1 entry (Psalm 147:12-20::block-1). Allowlist 제거 후 invariant scan 실행 → 정확히 동일 1 case 만 violation. 따라서 minimal + necessary.

### F-5 [MINOR, accept-with-issues] FU-3 deferral 구조적 검증
**Peer 검증**: PDF physical 135 left col — col 0 (closing prayer prose + Reading) = 20 lines vs col 3 (5 verses, blank-separated) = 7 lines. Stage 1 dominance: 20 > 2×7=14 → col 0 picked. splitIntoStanzas 가 col 3 verses 를 합쳐 단일 stanza 로 평탄화. 이는 per-column 단일 baseline 의 구조적 한계 — per-content-block (per-stanza) baseline 으로만 해결 가능.

**현재 처리**: F-X11 cohort 통합 정확. 다른 latent case 미발견.

### F-6 [MINOR, accept-with-issues] 13% wrap-rate floor 마진 좁음
**증거 (peer)**: 현재 wrap-rate = 324/2362 = 13.717%. 13% floor 까지 buffer 가 ~16 multi-line phrase. 미래 추가 정정 시 margin 압박 가능.

**완화**: max_span / phrase-line ratio invariants 가 collapse-induced false-multi-line 을 catch 하므로 floor 자체는 보조 가드 역할. 단독 의존 아님.

---

## §3. Positive findings

### F+1 [GOOD] Prior 4 MAJOR 모두 in-scope 또는 deferred-with-rationale 처리
- F-1 over-merge: explicit invariant + 11 cases 정정 → 0 active violations
- F-2 gate: 두 layered floor + sentence filter (직접 권고 반영)
- F-4 invariant: max_span + ratio + allowlist + floor adjustment with rationale
- F-3: per-content-block 구조적 한계 명시 + F-X11 통합 + 1-entry allowlist

### F+2 [GOOD] JSDoc Worked Examples 추가
review #389 F-2 NIT (threshold rationale opacity) 직접 해결:
```
- Psalm 46:2-12 right col → Stage 1 dominance fires (col 0 occ=24 > col 3 occ=5×2=10)
- Psalm 110:1-5,7 left col → Stage 1 dominance fires (col 3 occ=18 > col 0 occ=4×2=8)
- Psalm 32 page 136 → Stage 1 fails (17 ≤ 11×2=22), Stage 2 sentence-filtered col 0 score=1 < gate min=2.2 → Stage 3 fallback to col 3
```

### F+3 [GOOD] 새 fixture (psalter-physical-069.txt) 으로 Psalm 32 page 136 regression guard
extractor unit test level 에서 baseline=3 + max-span ≤ 2 codified. 미래 regression 시 즉시 catch.

### F+4 [GOOD] PILOT + user case 보존 검증
Psalm 110 R-7 PILOT multi-line 유지, Psalm 46 wrap pair 유지 — re-review 에서 직접 확인.

### F+5 [GOOD] Allowlist 메커니즘 + commit message 정확성
1-entry allowlist (Psalm 147 block 1) + 명시적 rationale (col 0 prose 20 > 2×7 col 3 dominance). F-X11 cohort 통합 path 명시.

### F+6 [GOOD] 12/13 over-merge 정정 검증 (실제 데이터)
Spot-check 결과:
- Psalm 32:1-11 block 1: 15 lines / 15 phrases / max_span 1 (PDF wrap 부재 — 구조적 정확)
- Psalm 143:1-11 block 1: 14/14/1
- Rev 19:1-7 block 0: 7/7/1
- Psalm 116:10-19 block 1: 10/10/1
- Psalm 100:1-5 block 0: 18/17/2 / multi 1
- Rev 11:17-18 block 0: 24/22/2 / multi 2
- Psalm 11:1-7 block 0: 27/25/2 / multi 2
- Psalm 41:2-14 block 1: 8/7/2 / multi 1

모든 11 prior over-merge 가 max_span ≤ 2 + ratio ≥ 0.88 ✓.

---

## §4. CLAUDE.md 체크리스트

- [x] **링크/URL/자산 경로/Content-Type**: 변경 없음 (extractor + data + tests).
- [x] **모바일 실제 회귀**: 11 over-merge corrected blocks 모두 max_span ≤ 2 → 시각적 fragmentation 정상화. Sample 회귀 (Psalm 32 page 136) 정정 확인.
- [x] **몽골어 라벨 오타**: 없음 (extractor + tests, 텍스트 미변경).
- [x] **PRD/traceability**: FR-161 (F-X10 cohort) 영역. F-X11 cohort 통합 path 명시.
- [x] **`HourSection` 개수**: 변경 없음.
- [x] **e2e `@fr` 태그**: wrap-rate-invariant.test.mjs `// @fr FR-161` 유지.
- [x] **psalter `page` verifier**: rich.json 변경했으나 page 필드 변경 아님 → verifier 영향 없음.
- [x] **다른 데이터 영역 verifier**: 영향 없음.
- [x] **`audit-psalter-ref-consistency.js`**: ref / page 변경 없음, stanza 지문 variation 가능 → window ±2 내 영향. 우려 없음.
- [x] **CACHE_VERSION bump**: 불필요 (psalter-texts.rich.json은 src/data 번들 → Next.js chunk hash 자동 갱신, sw.js v7 유지).

---

## §5. Verdict 근거

| 기준 | 평가 |
|------|------|
| 모든 focus PASS | ✓ (AC-1..AC-8 모두 MET, AC-3 PARTIALLY via deferred allowlist) |
| Prior 4 MAJOR 해결 | F-1 ✓ / F-2 ✓ / F-3 deferred-with-rationale ✓ / F-4 ✓ |
| Critical findings | 없음 |
| Major findings | 없음 |
| Minor/nit findings | 6 (F-1 sentence regex latent, F-2 gate shape OK, F-3 fragmentation valid, F-4 allowlist minimal, F-5 deferral verified, F-6 margin modest) |
| Test gate | 988 PASS / 0 FAIL ✓ |

**결정: APPROVED_WITH_ISSUES** — prior CONDITIONAL findings 모두 in-scope 처리 또는 명시적 deferred-with-allowlist. 0 blockers.

---

## §6. Follow-up 권고 (LOW priority)

### NIT-FU-1 [optional, latent]: SENTENCE_END_RE 확장
`SENTENCE_END_RE` 가 `.)`, `!)`, `?]` 등 close-paren-after-terminator 인식하도록 확장. 현재 노출 없으나 latent false-positive over-merge 위험. PDF SSOT 에서 해당 패턴 발견 시 즉시 적용.

### NIT-FU-2 [P1]: F-X11 cohort 통합 (FU-3)
Psalm 147:12-20 block 1 (KNOWN_DEFERRED_OVER_MERGE 의 유일 entry) + 잠재 추가 case 들의 per-content-block baseline 처리. F-X11 cohort 와 동시 dispatch 권고 (사용자 결정 게이트).

### NIT-FU-3 [optional]: 13% margin 모니터링
Wrap-rate floor 13% 까지 16-phrase buffer. 미래 정정 시 margin 압박 시 max_span / ratio invariants 가 보조 가드. floor 단독 의존 회피.

---

## §7. References

- **Audit**: `docs/handoff-fx10-fx11-fx12-audit-2026-05-08.md` (F-X10 audit)
- **Prior review**: `docs/review-389-fx10-fix.md` (CONDITIONAL — 4 MAJOR)
- **Files**:
  - `scripts/parsers/extract-phrases-from-pdf.mjs:120-300` (detectBaselineCol 3-stage with FU-1)
  - `scripts/__tests__/wrap-rate-invariant.test.mjs:75-200` (4 invariants + KNOWN_DEFERRED)
  - `scripts/parsers/__tests__/extract-phrases-from-pdf.test.mjs` (Psalm 32 page 136 regression test)
  - `scripts/parsers/__tests__/fixtures/psalter-physical-069.txt` (new fixture)
  - `src/data/loth/prayers/commons/psalter-texts.rich.json` (regenerated)
- **Peer**: codex (quality_auditor), exchange `ex_20260508T162613Z_0292d2bc`
- **Discussion**: R1 consensus APPROVED_WITH_ISSUES (HIGH confidence)
- **Related**: F-X11 cohort (paragraph boundary), F-X10 cohort (#369 audit, #375 fix, #389 review, #396 revise, #402 re-review)
