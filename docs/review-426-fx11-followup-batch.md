# Cleanup #426 — review #419 F-X11 follow-up findings batch

> **TL;DR** — 3 MAJOR + 4 NIT cleanup. **M-1** builder가 `needsReview`를 silent drop 하는 누설을 sidecar 큐 `.claude/scaffold/phrase-extract-review-queue.json` 으로 차단. **M-2** `dropColumnArtifactBlanks` length-mismatch 방어 행동을 회귀 테스트로 잠금. **M-3** Psalm 32 [6] paragraph boundary 는 fixture row 9 가 양쪽 컬럼 모두 blank 이므로 **PLAUSIBLE & CORRECT** — 데이터 hotfix 불필요. NIT 4건 (N-1 docstring, N-2 Set dedup, N-3 boundary equality, N-5 negative tests) 정리. 124 deferred refs 일괄 재추출 직전 가드 완료.

| 항목 | 값 |
|---|---|
| Source review | docs/review-419-fx11-followup.md (CONDITIONAL) |
| Scope | 3 MAJOR + 4 NIT (#419 finding 카탈로그 7건 중 N-4/N-6 deferred) |
| Files changed | scripts/build-phrases-into-rich.mjs, scripts/parsers/extract-phrases-from-pdf.mjs, scripts/__tests__/build-phrases-into-rich.test.mjs, scripts/parsers/__tests__/extract-phrases-from-pdf.test.mjs |
| Targeted tests | 77 passed (vitest) |
| Schema impact | NONE — `needsReview`는 별 channel sidecar 로 분리 (rich-AST 무변) |

---

## M-1 — needsReview production builder pipeline 통합

### 회귀 surface

`scripts/parsers/extract-phrases-from-pdf.mjs` 의 Stage 3 quality flag (`needsReview`) 는 Stage 1 (visual indent) 과 Stage 2 (sentence-end heuristic) 가 disagreement 를 일으킬 때 stanza 에 표시된다. 그러나 batch 빌더 (`scripts/build-phrases-into-rich.mjs`) 는 이 flag 를 `injectPhrasesIntoRichData` 내부에서 silent drop 했다. 빌더 소스 전수 검색 시 `needsReview` 0 occurrences. CLI 의 `--review-out` 우회로 sidecar 가 만들어지는 path 만 존재.

124 deferred refs 일괄 재추출 시 비슷한 disagreement 가 다수 발생할 텐데 curator review queue 없이 데이터가 land 한다는 것이 #419 review 의 M-1 finding.

### 픽스

- 새 export `collectReviewQueue(batches)` — extractor stanza 의 `needsReview: true` 를 모아서 `{ ref, stanzaIndex, firstLine, lineCount }` 형태의 큐 entry 로 normalise.
- `injectPhrasesIntoRichData` 의 result 에 `reviewQueue: [...]` 필드를 항상 surface (atomic gate PASS / FAIL 무관 — gate fail 시에도 curator 가 어느 stanza 가 attention 필요한지 알아야 함).
- CLI `cliMain` 가 `result.reviewQueue` 를 `.claude/scaffold/phrase-extract-review-queue.json` 으로 persist. `--review-queue <path>` override + `--no-review-queue` suppress + `--dry-run` 시 자동 suppress (mirror data-write semantics) 지원.
- **Schema 무변** — `needsReview` 자체는 절대 rich.json (`stanzasRich.blocks[i].needsReview`) 에 inject 되지 않음. Test `result.data['PB Ref'].stanzasRich.blocks[0].needsReview` is undefined 가 contract 잠금.

### 검증

`scripts/__tests__/build-phrases-into-rich.test.mjs` 에 새 describe block 4건 추가:

1. `collectReviewQueue` 가 flagged stanza 만 normalise 후 emit.
2. flagged stanza 가 없으면 `[]` 반환.
3. inject 결과의 `result.reviewQueue` 가 atomic gate PASS 시에도 surface + rich.json 에는 `needsReview` 누설 안 됨.
4. atomic gate FAIL (`REF_NOT_FOUND`) 시에도 reviewQueue 가 surface — curator 가 fallback 가시성 확보.

---

## M-2 — dropColumnArtifactBlanks length-mismatch defensive behavior 잠금

### 회귀 surface

`dropColumnArtifactBlanks` 의 line 399:
```js
const otherLine = i < otherColLines.length ? otherColLines[i] : ''
```

Out-of-range 시 빈 문자열로 취급 — defensive. 그러나 production `splitColumns` 가 row-aligned EQUAL-length 스트림을 emit 해서 이 path 는 live 에서 발현되지 않는다. 회귀 가드 부재 → 미래에 `splitColumns` invariant 가 깨지면 paragraph boundary corruption 으로 멀리서 surface.

### 픽스

`scripts/parsers/__tests__/extract-phrases-from-pdf.test.mjs` 의 `describe('dropColumnArtifactBlanks (F-X11)')` 에 새 테스트 추가:

```js
it('treats out-of-range otherColLines as blank (defensive contract for length mismatch)', ...)
```

`left.length=5`, `right.length=3` 의 fixture 에서 in-range row 의 artifact-drop 동작과 out-of-range row 의 blank-keep 동작을 동시 검증.

---

## M-3 — Psalm 32 [6] PDF visual confirm

### 분석 절차

1. `parsed_data/full_pdf.txt` L4473-4523 Psalm 32 본문 검토 — linearized stream 에서는 verse 8 ("Чамд зөвлөнө.") 와 verse 9 ("Ухаангүй адуу...") 사이에 explicit blank 없음.
2. `scripts/parsers/__tests__/fixtures/psalter-physical-069.txt` (Psalm 32 continuation page 136 left col) 의 원본 column-extracted layout 검토 — row 9 가 **양쪽 컬럼 모두 blank** (left col blank, right col blank).
3. `extractPhrasesFromColumn(left, { otherColumnLines: right })` 직접 실행 → `paragraphBoundaries: [6]` reproduce 확인. needsReview=true (Stage 1↔Stage 2 disagree on phrase boundaries — unrelated to paragraph layer).

### 결과: PLAUSIBLE & CORRECT

Fixture row 9 의 양쪽 컬럼 동시 blank 는 `dropColumnArtifactBlanks` 의 contract 상 **TRUE PDF blank row** (column-split artifact 아님). 즉 인쇄된 PDF 에 verse 8/9 사이의 visual gap 이 실제로 존재. 추출기는:

1. row 4 (left blank, right content "Амилалтын цаг улирал...") 를 column-split artifact 로 drop ✓
2. row 9 (양쪽 blank) 를 surviving 1-blank 로 보존 ✓
3. sentence-end heuristic 적용 — prev = "Чамд зөвлөнө." (period 종결), next = "Ухаангүй адуу..." (Cyrillic 대문자 У 시작) → paragraph boundary promotion ✓
4. `paragraphBoundaries: [6]` (in-stanza index, header/attribution stripped before builder window match)

**verdict**: [6] 은 verse cluster 8/9 의 인쇄상 visual gap 을 정확히 식별. fixture 데이터 hotfix 불필요. #417 같은 conservative override 도 불필요. 5 PDF spot-check 의 Psalm 32 entry 는 ✅ confirmed (visual / structural reasoning).

### 잔여 4건 (Psalm 24 / 110 / 8) — heuristic 추론

dispatch instruction 은 Psalm 32 1건만 명시 검증 권고. 잔여 4건은 R-7/R-12.1 pilot path (Psalm 24 left, Psalm 110 left, Psalm 8 left) 로 이미 fixture 회귀 테스트가 lock 되어 있으며 paragraphBoundaries 가 빈 배열 (legacy single-column mode 에서 검증) 이라 별도 PDF visual 검증 불필요. 추후 production 에서 paragraph boundary 가 emit 되는 케이스가 출현하면 그때 case-by-case 검증.

---

## NIT 4건

### N-1 — `detectRefrains` docstring 정확화

기존:
> A "refrain" here is a 2-line text pattern that appears at two or more non-overlapping positions (separated by ≥ 2 lines) in the same stanza.

문제: 실제 inner loop 는 `j = i + 2` 부터 시작 — 즉 두 instance 가 인접 (`[i, i+1]` + `[i+2, i+3]`) 가능. "≥ 2 lines separation" 은 misleading.

수정:
> ...non-overlapping positions (the inner search starts at `j = i + 2`, so two instances may sit immediately adjacent — `[i, i+1]` followed by `[i+2, i+3]` — though Mongolian liturgical convention more commonly bookends a body with refrains separated by several body lines).

### N-2 — `refineParagraphBoundariesWithRefrains` Set dedup

`merged.includes(rb)` (O(N×M) — stanzas <50 lines 라 perf 영향 없음) 을 `Set` 으로 교체. 추가로 `mergedSet` 사용으로 heuristic boundaries 수집 시 implicit 중복 제거도 자동 처리.

```js
// Before
const merged = []
for (const b of heuristicBoundaries) { ... if (!dropAsBetween) merged.push(b) }
for (const rb of refrainEnterExit) { if (!merged.includes(rb)) merged.push(rb) }
return merged.sort(...)

// After
const mergedSet = new Set()
for (const b of heuristicBoundaries) { ... if (!dropAsBetween) mergedSet.add(b) }
for (const rb of refrainEnterExit) { mergedSet.add(rb) }
return [...mergedSet].sort(...)
```

### N-3 — boundary equality 명시 테스트

`refineParagraphBoundariesWithRefrains` 의 strict `>`/`<` filter 는 boundary equality (`b === after`, `b === beforeNext`) 시에 implicit pass-through + Set dedup 으로 정합. 명시 테스트 3건 추가:

1. `b === after` (refrain exit position 과 같은 heuristic boundary) preserve + Set dedup
2. `b === beforeNext` (next refrain enter position 과 같은 heuristic boundary) preserve + Set dedup
3. `b === after + 1` (1 step inside the gap, strictly between) drop — strict-inequality 회귀 가드 (`>=` / `<=` 로 surface 시 여기서 잡힘)

### N-5 — `detectRefrains` negative tests

1. 1-line repetition (e.g. "Аллэлуяа") — 2-line pattern 만 매치하므로 `[]` 반환.
2. 진짜 3-line refrain 이 존재 — algorithm 은 length=2 fixed 라 first 2 lines 만 lock (line C 는 미보호). 문서화된 limitation 을 회귀 테스트로 잠금.

---

## 보류 항목 (out of scope)

- **N-4** — refrain 이 stanzaLineCount 끝에 정확히 도달하는 case (line 619 `r.start + r.length < stanzaLineCount` exit suppress 검증). dispatch instruction 미포함.
- **N-6** — Psalm 145 underfragmentation regression test. dispatch instruction 미포함.

후속 NIT batch 가 필요하면 재dispatch 권고.

---

## 검증

### Targeted tests

```bash
npx vitest run scripts/parsers/__tests__/extract-phrases-from-pdf.test.mjs scripts/__tests__/build-phrases-into-rich.test.mjs
```

```
Test Files  2 passed (2)
     Tests  77 passed (77)
  Duration  272ms
```

### Schema 회귀 가드

- `result.data[ref].stanzasRich.blocks[i].needsReview` is undefined (test "surfaces reviewQueue on the inject result alongside data (atomic gate PASS)" 에서 명시).
- 기존 Psalm 46:2-12 [8,10,18,20] override + 4-entry pin (#417 hotfix) 무변. backward-compat 보존.

### 데이터 무변

- `psalter-texts.rich.json` 무손 — 본 batch 는 builder 로직 + extractor docstring + 테스트만 수정.
- 124 deferred refs 일괄 재추출은 본 batch 가 land 된 이후에 별도 dispatch 로 진행.
