# Review #411 — F-X11 fix Option B (paragraph break 4-layer cohort)

> **TL;DR** — APPROVED_WITH_ISSUES. 인프라 (schema/builder/renderer/tests) 는 clean. extractor sentence-end heuristic 이 audit §4 cross-column verification 을 거부한 trade-off 가 Psalm 46 데이터에서 false-positive 가능성으로 표면화 ([14,15,16,17] 연속 4 boundary = every-adjacent-line-paragraph 비현실적 over-fragmentation). 1건 데이터 적용에 한정되므로 ship-stop 은 아니나 사용자 visual smoke 후 hotfix 또는 추출 룰 보강 권고.

| Field | Value |
|-------|-------|
| **Reviewer** | divine-review |
| **Subject** | a5a81f1 (Merge 408-solver) — feat F-X11 #408 paragraph break Option B |
| **Author** | solver |
| **Verdict** | APPROVED_WITH_ISSUES |
| **Peer** | codex (quality_auditor) — concurring APPROVED_WITH_ISSUES |
| **Test evidence** | vitest: 1008/1008 pass (50 files, 5.04s) |
| **Lint** | 0 errors, 3 warnings (deferred NIT) |
| **Typecheck** | 0 errors |
| **Files reviewed** | 10 (4 layers + data 1건 + tests 4) |

## Per-AC Verdict

| AC | Type | Verdict | Evidence |
|----|------|---------|----------|
| AC-1 | structural | MET | src/lib/types.ts:135-159 — `paragraphBoundaries?: number[]` additive, optional, idx-0 rejected, doc 충실 |
| AC-2 | semantic | **PARTIALLY_MET** | extract-phrases-from-pdf.mjs:455-468 — sentence-end + capital-start heuristic, audit §4 cross-column 거부. major false-positive risk |
| AC-3 | structural | **PARTIALLY_MET** | extract-phrases-from-pdf.mjs:378-413 — dropColumnArtifactBlanks defined+exported but live path intentionally NOT calling. dead-export of rejected safety model |
| AC-4 | structural | MET | build-phrases-into-rich.mjs:351-389 — translateParagraphBoundaries window→block-relative, idx-0 belt-and-suspenders, idempotent strip |
| AC-5 | structural | MET | psalm-block.tsx:127-220 — phrase + legacy 양 path 동일 mt-3 + data-paragraph-boundary contract |
| AC-6 | executable | MET | npm test → 1008/1008 pass |
| AC-7 | executable | MET | eslint 0 errors / tsc 0 errors |
| AC-8 | semantic | **PARTIALLY_MET** | rich.json:18056 paragraphBoundaries=[7,9,12,14,15,16,17,19]. 사용자 reported 7,9 정확. **14,15,16,17 연속 4 boundary 가 every-adjacent-line = column-split artifact false-positive 가능성 (central unresolved risk)** |
| AC-9 | semantic | **PARTIALLY_MET** | 4 test files 의 sentence-end / comma-negative / lowercase-negative 분기는 cover. **gaps**: Mongolian ᠃ (U+1803), guillemets «», Latin 대문자 mixed start, "4 consecutive sentence lines" false-positive shape |
| AC-10 | structural | MET | dispatch context — 125 refs 재추출 별 task / Psalm 147:12-20 KNOWN_DEFERRED / SENTENCE_END_RE NIT 명시됨 |

## Issues

### MAJOR — Extractor heuristic false-positive risk (AC-2 + AC-8)
- **file**: scripts/parsers/extract-phrases-from-pdf.mjs:455-468
- **description**: 1-blank-with-period+capital → paragraph boundary heuristic 이 column-split artifact 와 PDF visual paragraph 구분 불가. PDF layout 모드는 right col 매줄 사이에 1-row blank 발생 (left col 동시 content 영향). 몽골어 시편은 verse 마다 마침표 + 대문자 시작이 흔함 → SENTENCE_END_RE+STARTS_UPPER_RE 가 거의 모든 verse boundary 를 paragraph 로 promote 가능.
- **evidence (live extractor reproduction on PDF p.77)**:
  ```
  paragraphBoundaries: [8, 10, 13, 15, 16, 17, 18, 20] (page header offset 포함)
  → 데이터 [7, 9, 12, 14, 15, 16, 17, 19] 와 정확히 일치
  ```
  Psalm 46 lines 14, 15, 16, 17 연속 4 = every-adjacent-line-paragraph (의미 없는 over-fragmentation).
- **severity**: major | **category**: design (false-positive)
- **영향 제한**: 데이터 1건만 land (124 refs 재추출 deferred). 사용자 visual 영향 = Psalm 46 단일 시편의 spacing 과잉.
- **권고 (추가 task로 처리 가능)**:
  1. audit §4 §B-2 cross-column blank verification 보강 (둘 다 column blank 일 때만 paragraph) — solver 의 거부 사유 (사용자 사례 false-negative) 는 valid 하므로 sentence-end + cross-column 둘 다 만족 OR 들여쓰기 변화 같은 추가 시그널과 결합.
  2. 또는 Psalm 46 데이터 manual override (paragraphBoundaries=[7,9,19] 같은 사용자 reported + refrain-stanza boundary 만)
  3. 사용자에게 PDF p.153 직접 visual 확인 요청 후 정확한 paragraph 위치 확정.

### MINOR — dropColumnArtifactBlanks dead-export (AC-3)
- **file**: scripts/parsers/extract-phrases-from-pdf.mjs:378-413
- **description**: 함수 정의 + export 되었으나 extractPhrasesFromColumn 에서 명시적으로 호출 안 함 (intentional comment line 489-495). audit doc §4 cross-column 룰을 표현 만 하고 실제 path 에서는 거부. fixture-only path 만 사용.
- **severity**: minor | **category**: design (dead-export)
- **권고**: 향후 cross-column verification 통합 시 wire up, 그렇지 않으면 별도 NIT batch 에서 drop.

### MINOR — Test 부정 path 보강 필요 (AC-9)
- **files**: scripts/parsers/__tests__/extract-phrases-from-pdf.test.mjs (+115)
- **description**: SENTENCE_END_RE + STARTS_UPPER_RE 의 boundary case 일부 누락:
  - Mongolian special punct (᠃ U+1803) → SENTENCE_END_RE 에 미포함, 미테스트
  - Guillemets «» / 곱슬따옴표 → 옵셔널 close-quote 그룹 cover 했지만 «» 미커버
  - Latin 대문자 mixed start (예: "Alleluja!") → STARTS_UPPER_RE \p{Lu} 에서 cover 되나 명시 테스트 없음
  - "4 consecutive sentence lines" false-positive shape (Psalm 46 의 14-17 case) — 의도적 negative test 누락
- **severity**: minor | **category**: test coverage
- **권고**: 다음 NIT batch 에 추가 테스트 4 case.

### NIT — Lint warnings (3)
- **file**: scripts/build-phrases-into-rich.mjs:154,478,479
- **description**:
  - `findWindow` (line 154) defined but never used — pre-existing dead helper (NOT introduced by this fix; F-X11 가 처음 추가하지 않음)
  - `_dropP` (line 478), `_dropB` (line 479) — destructure rest pattern, leading underscore convention. ESLint config 가 underscore 변수 무시 안 함
- **severity**: nit | **category**: hygiene
- **권고**: 다음 NIT batch 에 포함.

### INFO — Manual smoke 필요
- **description**: dark mode + 모바일 visual smoke (audit doc §5.3 recommend). CACHE_VERSION bump 는 #410 에서 v7→v8 처리됨 (cohort 통합).
- **severity**: info | **category**: manual

## Recommendation
- **즉시 ship**: 인프라 layer (schema/builder/renderer) 는 production-ready. 1008 tests pass, 0 lint/tc errors.
- **사용자 검증 필요**: Psalm 46:2-12 visual rendering — 사용자가 PDF p.153 과 비교하여 14,15,16,17 boundary 가 의도된 paragraph 인지 확인 (추측: 14,15,16,17 은 over-fragmentation). 의도와 다르면 heuristic 보강 또는 데이터 override hotfix.
- **deferred 권고**: cross-column verification 통합 (audit §4) 또는 데이터 manual override 를 별 task 로 등록.
- **block 가능 여부**: NO. 1건 데이터 적용 한정 + 충분한 인프라 + 사용자 reported 사례 정확히 cover.

## References
- Audit doc: docs/handoff-fx11-paragraph-break-audit-2026-05-08.md §4 (Option B 권고 + cross-column blank 검증)
- Combined audit: docs/handoff-fx10-fx11-fx12-audit-2026-05-08.md §2
- Reviewed commit: a5a81f1 (Merge 408-solver), parent 8fb907d (feat F-X11)
- Peer exchange: .claude/pair-working/sessions/adhoc-411-review/peer/exchanges/ex_20260509T004235Z_7256462c/
