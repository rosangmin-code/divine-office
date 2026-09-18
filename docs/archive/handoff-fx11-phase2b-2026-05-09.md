> **TL;DR** — F-X11 Phase 2-B (#442) 새 `detectRefrains` 일반화 heuristic (#435 — 2..4 dynamic longest-match-wins) 으로 124 refs 재추출 + atomic 일괄 inject. 96 PASS (123→96 in scope; 27 DRIFT 보존). PB delta = 2 refs (Psalm 24, Daniel 3:52-57). #417 hotfix override (Psalm 46:2-12) 자연 generation 확인되어 EXCLUDE_REFS 비움 (SSOT consolidation). Psalm 80 / Psalm 8 의 #434 hotfix shape 도 자연 일치 — 회귀 0. vitest 1060/1060 PASS.

# F-X11 Phase 2-B — 124 refs paragraphBoundaries 재추출 + 일괄 inject

- Land base: `f2d96d4` (Merge 436-divine-review — Phase 2-A APPROVED_WITH_ISSUES land)
- Author: member-01
- Date: 2026-05-09
- Skill: pair-process-workitem (worktree=442-member-01)

## 1. 변경 요약

**Files (+/-)**:

- `scripts/dev/process-fx11-phase2-batch.mjs` (+16 -5) — `EXCLUDE_REFS = new Set([])` (SSOT consolidation, `Psalm 46:2-12` 제거; 새 detectRefrains 가 자연 generation).
- `src/data/loth/prayers/commons/psalter-texts.rich.json` (data only — 96 refs 재inject; PB delta 5 blocks across 2 refs).

**알고리즘 변경 없음**:
- 모든 algorithm 변경은 #435 Phase 2-A 에서 land. Phase 2-B 는 그 결과를 124 refs 의 paragraphBoundaries 데이터로 propagate.

## 2. Scope 결과

| 분류 | 카운트 |
|---|---|
| 전체 in-scope refs | 123 (124 - `Psalm 31:1-17` page-missing) |
| EXCLUDE_REFS | 0 (was 1: `Psalm 46:2-12` — 자연 generation 확인되어 제거) |
| PASS atomic | 96 (was 95) |
| DRIFT_LINE_COUNT | 24 |
| DRIFT_NO_MATCH | 4 |
| Refs with paragraphBoundaries delta vs current rich.json | **2** |
| Refs whose new PB carries any boundaries | 23 |
| Stanza blocks touched (planned) | 217 |
| Total paragraphBoundaries entries | 73 |
| Refrain-style (multi-PB) stanzas | 15 (was 14) |
| Curator review queue (needsReview) | 206 (was 203) |

## 3. PB delta vs current rich.json (2 refs / 5 blocks)

```
Psalm 24:1-10:
  block 1: [2,4,8,10] -> [2,5,8,11]   # 3-line refrain "Гулдан хаалганууд аа..." new detect
Daniel 3:52-57:
  block 0: [2,4] -> [2]               # 3-line doxology refrain detect (exit at stanzaLineCount → suppressed)
  block 2: [1,3] -> [1]               # 동일 패턴
  block 3: [1,3] -> [1]               # 동일 패턴
  block 4: [2,4] -> [2]               # 동일 패턴
  block 5: [2] (unchanged)            # 4-line block, exit suppressed both alg
  block 6: [2] (unchanged)            # 동일
```

## 4. Hotfix override 통합 검증 (review-435 §8 권고)

새 detectRefrains 결과가 #417 / #434 hotfix shape 와 정확 일치 — SSOT 가 algorithm 으로 이동:

| Ref | Current rich.json (hotfix) | New algorithm result | 일치 |
|---|---|---|---|
| `Psalm 46:2-12` block 0 | `[7,9,17,19]` (#417) | `[7,9,17,19]` | ✅ |
| `Psalm 80:2-8, 15-20` block 0 | `[6,10,19,23]` (#434) | `[6,10,19,23]` | ✅ |
| `Psalm 8:2-10` block 0 | `[3,24]` (#434) | `[3,24]` | ✅ |

**Cleanup**:
- `EXCLUDE_REFS` 에서 `Psalm 46:2-12` 제거. Phase 2-B inject 가 알고리즘 결과를 idempotent 하게 overwrite (= 동일 shape).
- `Psalm 80:2-8, 15-20` / `Psalm 8:2-10` 은 #434 가 rich.json 직접 override 했고 EXCLUDE_REFS 에 없었음. 알고리즘 결과 일치 확인 후 그대로 atomic inject — 자연 generation.

`wrap-rate-invariant.test.mjs` 의 hardcoded PB assertion (3건) 모두 새 데이터와 일치 → 회귀 0.

## 5. PDF spot-check (6 refs)

| Ref | PDF page | Refrain length | New PB | Verdict |
|---|---|---|---|---|
| `Psalm 46:2-12` | 152 right | 2-line "Түг түмдийн ЭЗЭН…" × 2 | `[7,9,17,19]` | ✅ #417 hotfix shape, 자연 generation |
| `Psalm 80:2-8, 15-20` | 246 left | 4-line "Түг түмдийн Тэнгэрбурхан…" × 2 | `[6,10,19,23]` | ✅ #434 hotfix shape, 자연 generation |
| `Psalm 8:2-10` | 282 right | 3-line "ЭЗЭН, бидний Эзэн!…" × 2 | `[3,24]` | ✅ #434 hotfix shape, 자연 generation |
| `Psalm 67:2-8` | 239 right | 2-line "Тэнгэрбурхан, Таныг ард түмнүүд магтаг…" × 2 | `[6,8,11,13]` | ✅ backward-compat, 변동 없음 |
| `Psalm 24:1-10` block 1 | 92 left | 3-line antiphonal Q&A "Гулдан хаалганууд аа…" × 2 | `[2,5,8,11]` (was `[2,4,8,10]`) | ✅ 3-line refrain 정확 detect (Phase 2-A 신기능) |
| `Daniel 3:52-57` | 179 right | doxology refrain "…магтагдах болтугай. / Танд сүр жавхлан…" | block 0 `[2]` etc. | ✅ verse → doxology 전이 한 boundary 만 (exit-at-stanzaLineCount 자동 suppress) |

## 6. 테스트 evidence

```bash
# Pre-inject (dry-run preview)
node scripts/dev/process-fx11-phase2-batch.mjs --json /tmp/dryrun-v2.json
# Scope: 123 refs in scope; 0 excluded; 1 missing page
# Verdict counts: PASS=96, DRIFT_LINE_COUNT=24, DRIFT_NO_MATCH=4
# Aggregate atomic gate: PASS

# Inject
node scripts/dev/process-fx11-phase2-batch.mjs --inject
# inject OK — 96 ref(s) updated in src/data/loth/prayers/commons/psalter-texts.rich.json
# review queue: 206 stanza(s) flagged → .claude/scaffold/phrase-extract-review-queue.json

# Full vitest
npm test 2>&1 | tee /home/min/.claude/pair-cowork/scratch/divineoffice/test-out-task-442.log
# Test Files  50 passed (50)
# Tests       1060 passed (1060)
# Duration    5.14s
```

## 7. NOT-처리 대상 (per dispatch)

- extractor / builder 코드 변경 없음 (#418/#435/#426 에서 완료)
- schema 변경 없음
- renderer 변경 없음

## 8. Follow-up 권고

1. **사용자 모바일 smoke**: Daniel 3:52-57 / Psalm 24:1-10 (W1 일요일 Lauds) 의 새 PB 결과 시각 확인. CACHE_VERSION bump 가 필요한지 별 task 로 평가 (rich.json 데이터 변경되었으므로 권고).
2. **Curator review queue**: 206 stanza needsReview 가 sidecar 에 저장됨 — F-X11 cohort 종결 단계에서 별 batch 로 수동 audit 필요.
3. **DRIFT refs (28건)**: `phrases[]` 가 없는 25건 + `phrases` 있는 3건 (Rev 4 / Col 1 / Rev 11) 은 line count drift 로 PB inject 불가. 별 task 로 rich.json 라인 정합성 reconcile 필요.

## 9. References

- #427 completion (#427 baseline result; PASS=95)
- #435 completion + review-435 (Phase 2-A algorithm change; +12 it() in extract-phrases-from-pdf.test.mjs)
- #428 review (#427 → APPROVED_WITH_ISSUES, M-1 Psalm 80 / M-2 Psalm 8 motivating Phase 2-A)
- #434 commit (Psalm 80 / Psalm 8 PB conservative override; auto-aligned with new alg)
- #417 commit (Psalm 46 PB conservative override; auto-aligned with new alg)
