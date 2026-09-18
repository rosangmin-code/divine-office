# Review #419 — #418 F-X11 follow-up extractor heuristic 보강

> **TL;DR** — APPROVED_WITH_ISSUES (CONDITIONAL). 핵심 #411 MAJOR 회귀 (Psalm 46:2-12 over-fragmentation) 가 2-layer architecture 로 깔끔히 해소됨. 1031/1031 vitest pass + 0 신규 lint + backward-compat 보존. 다만 124 deferred refs 일괄 재추출 전에 보완 권고: **needsReview production 게이트 누락** (Major), **length-mismatch 방어 미테스트** (Major), **5 PDF spot-check 중 4건 visual 미확인** (Major).

| 항목 | 값 |
|---|---|
| Reviewer | divine-review |
| Author | solver (#418) |
| Reviewer ≠ Author | ✅ |
| Land commit | 5ead3d1 (Merge 418-solver) |
| Source commit | 08e9cf1 |
| Files changed | scripts/parsers/extract-phrases-from-pdf.mjs (+213 LOC), scripts/parsers/__tests__/extract-phrases-from-pdf.test.mjs (+314 LOC) |
| review_verdict | **CONDITIONAL** |

---

## Per-AC verdict

| AC | 영역 | Claude | Peer (codex) | Final |
|---|---|---|---|---|
| AC-1 | dropColumnArtifactBlanks live path | PARTIALLY_MET | MET | **PARTIALLY_MET** |
| AC-2 | detectRefrains precision | MET | PARTIALLY_MET | **PARTIALLY_MET** |
| AC-3 | refineParagraphBoundariesWithRefrains | MET | MET | **MET** |
| AC-4 | Layer 1.5 sentence-end heuristic 보존 | MET | MET | **MET** |
| AC-5 | backward-compat (legacy + schema/builder/renderer 무손) | MET | MET | **MET** |
| AC-6 | 19 new tests 충실성 | PARTIALLY_MET | MET | **PARTIALLY_MET** |
| AC-7 | 5 PDF spot-check 정확성 | PARTIALLY_MET | MET | **PARTIALLY_MET** |
| AC-8 | vitest 1031/1031 PASS | MET | MET | **MET** |
| AC-9 | ESLint clean on changed files | MET | MET | **MET** |
| AC-10 | 124 deferred refs extension safety | PARTIALLY_MET | MET | **PARTIALLY_MET** |
| AC-11 | reviewer != author (divine-review ≠ solver) | MET | MET | **MET** |

---

## Findings

### Major (CONDITIONAL — 124 batch 재추출 전 권고)

**M-1. needsReview Stage 3 quality flag 가 production builder 에서 silently drop**
- 위치: `scripts/parsers/extract-phrases-from-pdf.mjs:944-961` (CLI sidecar 만 존재) + `scripts/build-phrases-into-rich.mjs` (0 occurrences of `needsReview`)
- 증상: extractor 가 `needsReview=True` 로 표시한 stanza 들이 batch 빌드 시 어떤 surface 에도 도달하지 못함. CLI `--review-out` 플래그 가 있어야만 sidecar 가 만들어짐.
- 영향: Psalm 46 spot-check 결과 `needsReview=True` 였음 (Stage 1 vs Stage 2 불일치). 124 deferred refs 를 일괄 재추출하면 비슷한 disagreement 가 다수 발생할텐데 curator 검토 큐 없이 데이터 land.
- 권고: builder 가 `paragraphBoundaries` injection 시 `needsReview` 도 함께 sidecar 에 적재하거나, build job 에서 `--review-out` 강제 사용.

**M-2. dropColumnArtifactBlanks length-mismatch 방어 미테스트**
- 위치: `scripts/parsers/extract-phrases-from-pdf.mjs:399-400`
- 동작: `i >= otherColLines.length` 일 때 `otherLine = ''` (= keep blank). 방어적 동작.
- 증상: `splitColumns` 가 row-aligned equal-length 스트림을 생성해서 production 에서는 발생하지 않음. 다만 회귀 가드 없음. 미래에 `splitColumns` 동작이 바뀌면 silently corrupted.
- 권고: 1 unit test 추가 — `otherColumnLines` 가 `thisColumnLines` 보다 짧을 때 후반부 blank 가 보존되는지 확인.

**M-3. 5 PDF spot-check 중 4건 visual 미확인**
- 위치: evidence-tests.md (review session scratch)
- 증상: Psalm 46 만 user-confirmed. Psalm 24/110/8/32 는 "heuristic + 구조" 추론. dispatch instruction 의 "Psalm 32 (FU-1): [6] — 정합? PDF 검증 필요" 명시 미해결.
- 권고: 최소 Psalm 32 [6] 1건 visual 확인 (FU-1 baseline preservation case 라 asymmetric impact).

### Minor / Nit

**N-1.** `scripts/parsers/extract-phrases-from-pdf.mjs:528` — detectRefrains docstring 의 "separated by ≥ 2 lines" 가 misleading. 실제 minimum gap 은 `j = i + 2` (인접 가능). Algorithm 은 정확하나 doc 만 갱신 필요.

**N-2.** `scripts/parsers/extract-phrases-from-pdf.mjs:645` — `merged.includes(rb)` O(N×M) dedup. Stanzas <50 lines 이라 영향 없으나 `Set` 사용이 더 idiomatic.

**N-3.** Test gap: `refineParagraphBoundariesWithRefrains` 의 boundary equality cases — `b === after` (refrain exit 와 정확히 같은 heuristic boundary) 와 `b === beforeNext` (다음 refrain enter 와 정확히 같은 heuristic boundary) 양쪽 다 묵시적으로 통과하나 명시 test 없음.

**N-4.** Test gap: refrain 이 stanzaLineCount 끝에 정확히 도달하는 case (line 619 `r.start + r.length < stanzaLineCount` exit suppress 검증).

**N-5.** AC-2 negative test gap (peer noted) — 1-line refrain 이 NOT matched 되는 negative test, 또는 진짜 3-line refrain 이 (only first 2 lines) matched 되어 부분 처리되는 confirmation test 없음.

**N-6.** Psalm 145 underfragmentation (extension safety sample) — 반복 antiphon "Би Эзэнийг..." 변형 (dash prefix 등) 으로 detectRefrains 가 정확히 [] 반환. 이는 design rationale ("non-refrain 형태 시편 대부분 []") 와 일치하나 regression test 로 잠금되지 않음.

---

## Architecture 평가

### 강점
1. **2-layer separation of concerns** — Layer 1 (cross-column verification, dropColumnArtifactBlanks) 와 Layer 2 (text-pattern refrain detection) 가 직교적 신호를 사용. Layer 1.5 (sentence-end heuristic) 는 그대로 유지하면서 Layer 1+2 가 "spurious 만 drop" 하는 발상이 명료.
2. **Backward-compat 깔끔** — `hasOtherCol` 게이트 (line 772-773) 로 단일-컬럼 fixture-only 테스트 모드와 production 양-컬럼 모드를 분리. `splitOnEveryBlank` legacy 경로 (line 841-858) 가 `paragraphBoundaries: []` 을 항상 반환해 downstream 분기 불필요.
3. **회귀 가드 견고** — Psalm 46:2-12 cross-column live integration test (line 720-754) 가 `[8,10,18,20]` 을 hard-pin. 동시에 `WITHOUT otherColumnLines stays in legacy single-column mode` test 가 backward-compat 잠금.

### 약점
1. **needsReview production 누설** (M-1) — Stage 3 quality flag 가 CLI 기반 sidecar 에만 존재해 batch 빌드에서 사라짐.
2. **Length-mismatch silent path** (M-2) — `splitColumns` 의 invariant 에 의존하나 코드 간 contract 가 명시되지 않음.
3. **Spot-check verbose-but-unverified** (M-3) — 5건 중 1건만 user-visual confirmed.

---

## 결론

| 시나리오 | 결정 |
|---|---|
| #418 단독 land | **PASS** (regression fixed cleanly) |
| 124 deferred refs 일괄 재추출 직전 | **CONDITIONAL** — M-1, M-2, M-3 follow-up 권고 |

**Recommended follow-up scope** (next NIT/follow-up batch):
- M-1: builder needsReview sidecar 통합 OR build job `--review-out` 강제화
- M-2: dropColumnArtifactBlanks length-mismatch unit test 1건
- M-3: Psalm 32 [6] PDF visual 확인 (해당 없으면 docs 에 "approximate-confirmed only" 명시)
- N-1: docstring 갱신
- N-3..N-5: test edge case 추가 (5건 batch)
