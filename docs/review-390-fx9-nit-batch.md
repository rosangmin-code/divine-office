# Review #390 — F-X9 NIT batch (#383): renderer cf-prefix parity + fallback title invariant

**Reviewer**: divine-review (independent — author: member-01)
**Target**: commit 8a51995 (merged via 6d6e2914), worktree 390-divine-review @ base a44f3d9
**Peer**: codex (quality_auditor), discussion R1 → consensus APPROVED_WITH_ISSUES
**Verdict**: **APPROVED_WITH_ISSUES** (2 minor accounting/hardening suggestions, 0 blocking)

> **TL;DR** — F-X9 NIT batch는 #376 review (APPROVED_WITH_ISSUES)의 NIT-1 (renderer regex cf-prefix parity)와 NIT-2 (fallback title invariant fixture)를 정확히 처리. layered defense (renderer + extractor + invariant)의 dirty-pattern 정의가 byte-identical로 정렬됨. 11 PDF-only fallback titles는 PDF SSOT verbatim (parsed_data/full_pdf.txt 모두 매치). MINOR-1 page-break artifact는 OUT-OF-SCOPE로 정확히 분리됨 (F-X13 권고). 2개 nit 개선 제안 (invariant `includes` 강화 + test count 정확화), 둘 다 비차단.

---

## §1. AC matrix

| AC | Type | Verdict | Evidence |
|----|------|---------|----------|
| AC-1: vitest 전체 PASS | executable | **MET** | `npx vitest run` → PASS (985) FAIL (0). Log: `~/.claude/pair-cowork/scratch/divineoffice/test-out-task-390.log` |
| AC-2: NIT-1 regex parity (renderer ↔ extractor ↔ invariant) | structural | **MET** | psalm-block.tsx:65 = extract-psalter-headers.js:261-264 = psalter-headers.test.ts:238-241 byte-identical pattern (`\s*\((?:харьцуул\.\s+)?${esc}\)\.?\s*$` + flag `u`). escapeRegExp impl 동일. |
| AC-3: NIT-1 unit test 커버리지 | executable | **MET** | psalm-block-header-guard.test.ts 13 → 15 tests. 2 new cf-prefix variants (line 92-115): `(харьцуул. attribution)` no-period + `(харьцуул. attribution).` with-period. 기존 trailing-attribution tests 패턴 정합. |
| AC-4: NIT-2 fallback fixture PDF SSOT | structural | **MET** | 11 pdfTitle 모두 parsed_data/full_pdf.txt 에 verbatim 매치 (lines 841, 1506, 5020, 5570, 5626, 9786, 15583, 15929, 17732, 17782, 17902, 18547, 18689). "Эзэний нэр алдрыгмагтан" 무 space 가 PDF SSOT 그대로 (line 9786) — NFR-002 verbatim 정책 정합. |
| AC-5: NIT-2 invariant assertion 정확성 | structural | **MET** | psalter-headers.test.ts:390 startsWith assertion + 별도 missing list. fallbackStripFirstPdfLine 가 첫 줄 strip → startsWith 회귀 직접 catch. 7 in-catalog 만 assert, 4 unmatched (Psalm 95/4/134/91) 는 documented but skipped (loader 미참조). Catalog drift 도 missing 리스트로 catch. |
| AC-6: OUT-OF-SCOPE separation (MINOR-1) | structural | **MET** | `git diff --name-status 8a51995^ 8a51995` → 3 files only: psalm-block.tsx, psalm-block-header-guard.test.ts, psalter-headers.test.ts. 데이터 파일 (week-N.json, psalter-texts.json, rich.json) 무변경. F-X13 별 task 권고 정확. |
| AC-7: CLAUDE.md 체크리스트 | structural | **MET** | 링크/URL 변경 없음 (renderer regex만), public/ 무변경, 새 라우트 없음, 몽골어 cf-prefix 정확 (PDF verbatim), CACHE_VERSION bump 불필요 (renderer 코드 변경은 chunk hash 자동 갱신). |

**전체 verdict**: **APPROVED_WITH_ISSUES**

---

## §2. Findings (peer + 자체 audit consensus AGREE)

모두 nit/minor — no blocker.

### F-1 [NIT] regex parity completeness — MET ✓
Both Claude + Peer confirmed renderer regex (psalm-block.tsx:65) is byte-identical to extractor stripAttributionSuffix (extract-psalter-headers.js:261-264) and canonical invariant pattern (psalter-headers.test.ts:238-241). escapeRegExp 구현 동일. Capture/non-capture drift 없음. 'u' flag 정합.

### F-2 [NIT] cf-prefix coverage gap — MET ✓
PDF parsed_data/full_pdf.txt 전체 grep 결과 `харьцуул.` 만 존재. 다른 비교 prefix (`тулгуурла.`, `үзэх.`, `харьцуулах`) 미발견 → 단일 prefix 가드로 충분. 미래 확장 시 same approach (extractor + renderer + invariant) 동시 갱신 패턴 유지.

### F-3 [NIT] NIT-2 PDF SSOT fixture — MET ✓
모든 11 pdfTitle parsed_data/full_pdf.txt verbatim:
- Аюулын үед унших даатгал залбирал → line 1506 (Psalm 141:1-9 page 50)
- Тэнгэрбурханы энэрэл хайрын тухай бясалгал → line 5570 (Psalm 119:105-112 page 167)
- Эзэн бол миний өв юм → lines 5626, 18547 (Psalm 16:1-6 pages 168, 535)
- Эзэний нэр алдрыгмагтан дуулагтун → line 9786 (Psalm 113:1-9 page 287) [무 space verbatim]
- Тэнгэрбурханд найдагчид → line 15929 (Psalm 146:1-10 page 460)
- Өвчтэй хүний даатгал залбирал → lines 5020, 18689 (Psalm 88:2-10 page 539)
- Тэнгэрбурханыг магтах дуудлага → line 841 (Psalm 95 page 28, unmatched)
- Талархал магтаал → lines 15583, 17732 (Psalm 4 page 512, unmatched)
- Сүм хийдийн доторх үдшийн даатгал залбирал → line 17782 (Psalm 134 page 514, unmatched)
- Тэнгэрбурханы ивээл доорх аюулгүй байдал → line 17902 (Psalm 91 page 517, unmatched)

NFR-002 verbatim 정책 정합 — "missing space" 같은 PDF 결함도 그대로 보존.

### F-4 [NIT, suggestion] NIT-2 invariant scope — PARTIALLY_MET → accept-with-issues
현재 `preface_text.startsWith(fixture.pdfTitle)` 만 assert. fallbackStripFirstPdfLine 회귀는 startsWith 로 정확히 잡힘 (regression 시 첫 줄 = title). 하지만:
- mid-string regression (extractor 가 다른 위치에 title append) 미커버
- trailing regression 미커버

**제안**: `expect(match.preface_text.includes(fixture.pdfTitle)).toBe(false)` 로 강화하면 비용 거의 동일 + 더 넓은 가드. 현재도 fallback-strip 회귀는 catch 가능하므로 accept; 차후 NIT 묶음에 포함 권고.

### F-5 [NIT, accounting] test count claim — PARTIALLY_MET
Commit message: "Baseline #376 review = 967 PASS / 0 FAIL → +13 (NIT-1 2건 + NIT-2 1건 + 기존 testsuite 변화 +10 — 별 영역 PASS 증가)".

기술적으로 정확 — `git grep` `it(` count: 8a51995^ = 670, 8a51995 = 673 (+3 from #383 alone). +10 from intervening merges (#372/#373/#374/#375 가 #376 review 와 #383 사이에 ?). Commit 텍스트가 의도 명시했으므로 misleading 아님 — 단지 외부 reader 입장에서 attribution 이 약간 abstract.

**제안**: 차후 commit message 에 "이번 commit 본인 +N tests + 기존 +M unrelated" 명시하면 더 readable. 비차단.

### F-6 [MINOR] OUT-OF-SCOPE separation — MET ✓
`git diff --name-status 8a51995^ 8a51995`:
```
M  src/components/__tests__/psalm-block-header-guard.test.ts
M  src/components/psalm-block.tsx
M  src/lib/prayers/__tests__/psalter-headers.test.ts
```

3 files only. 데이터 파일 (psalter-texts.json, rich.json, week-N.json) 무변경. Psalm 113:1-9 + 122:1-9 page-break artifact (MINOR-1) 정확히 deferred to F-X13.

---

## §3. Positive findings

### F+1 [GOOD] Layered defense parity 회복
3 layers 모두 동일 dirty pattern 정의:
- **Data fix layer** (extract-psalter-headers.js:261-264 — F-X9 fix A from #372): catalog 생성시 cf-prefix 제거
- **Render guard layer** (psalm-block.tsx:65 — this NIT-1): stale catalog 방어선
- **Invariant test layer** (psalter-headers.test.ts:238-241): 회귀 가드

세 layer가 동일 pattern 공유 → 미래 새 dirty shape 등장 시 한 곳에서 추가하면 다른 두 곳에 동기화 필요성 명확. 유지보수 비용 감소.

### F+2 [GOOD] NIT-2 fixture comment 우수
Comment 가 (a) 무엇이 fallback path 인지, (b) 왜 canonical title invariant 가 부족한지, (c) PDF SSOT 어디서 추출했는지, (d) catalog drift 가드 메커니즘까지 모두 설명. 미래 reviewer 가 invariant 의도 이해 용이.

### F+3 [GOOD] missing/violations dual-check
fixture entry 가 catalog 에 없는 경우 (catalog drift) 도 명시적으로 missing 리스트로 surface — silent skip 방지. expect 가 둘 다 빈 리스트 검증.

### F+4 [GOOD] OUT-OF-SCOPE 정확 분리
MINOR-1 page-break artifact 를 별 task (F-X13) 로 deferred. extractor 결함 (pre-existing F-X3 issue) 이지 F-X9 회귀 아니라는 author 판단 합리적. 작업 단위 분리 명확.

---

## §4. CLAUDE.md 체크리스트

- [x] **링크/URL/자산 경로/Content-Type**: 변경 없음 (renderer regex 만, 데이터 파일 무변경). sw.js 영향 없음.
- [x] **모바일 실제 회귀**: 없음 (cf-prefix 처리는 catalog 깨끗한 한 NOP path; 미래 stale-catalog 회귀 시 활성화).
- [x] **몽골어 라벨 오타**: 없음. cf-prefix `харьцуул.` 정확. PDF SSOT verbatim 보존.
- [x] **PRD/traceability**: F-X9 layered defense (FR-160-C 영역) 보강. 새 FR 행 불필요.
- [x] **`HourSection` 개수**: 변경 없음.
- [x] **e2e `@fr` 태그**: psalter-headers.test.ts 에 `// @fr FR-160` 태그 기존 보유. NIT-2 새 it block 같은 describe 내부.
- [x] **psalter `page` verifier**: 변경 없음.
- [x] **다른 데이터 영역 verifier**: 변경 없음.
- [x] **`audit-psalter-ref-consistency.js`**: 변경 없음.
- [x] **CACHE_VERSION bump**: 불필요 (renderer 변경 → Next.js chunk hash 자동 갱신).

---

## §5. Verdict 근거

| 기준 | 평가 |
|------|------|
| 모든 focus PASS | ✓ (AC-1..AC-7 모두 MET, AC-5 only PARTIALLY in F-4 nit) |
| Critical findings | 없음 |
| Major findings | 없음 |
| Minor/nit findings | 2 (F-4 invariant `includes` 강화 제안, F-5 test count attribution 정확화) |
| 전체 fix direction | NET POSITIVE — layered defense 정렬, 11 PDF-only refs fixture 보호 |
| 새 데이터 회귀 | 없음 (3 files only, no data file touched) |
| Test gate | 985 PASS / 0 FAIL ✓ |

**결정: APPROVED_WITH_ISSUES** — fix 정확히 의도 달성, 2 nit 개선 제안 차후 NIT 묶음 가능.

---

## §6. Follow-up 권고 (LOW priority)

### NIT-FU-1 [optional]: NIT-2 invariant `includes` 강화
```diff
- if (match.preface_text.startsWith(fixture.pdfTitle)) {
+ if (match.preface_text.includes(fixture.pdfTitle)) {
```
Trade-off: false positive 위험 미세 (pdfTitle 이 본문에 정상 포함될 수 있는 경우 — 가능성 낮음). startsWith 가 fallback-strip 직접 회귀 가드로 충분하므로 priority LOW.

### NIT-FU-2 [optional]: commit message attribution 정확화
미래 cumulative test count claim 에 본 commit vs 기존 차이를 명시. 예:
```
Tests: this commit +3 (NIT-1 2 + NIT-2 1) + intervening merges +10. Total #376 baseline 967 → 980.
```

### NIT-FU-3 [referenced]: F-X13 page-break artifact
MINOR-1 (Psalm 113:1-9 + 122:1-9) — author 가 별 task 권고. 별도 dispatch 필요.

---

## §7. References

- **Audit**: `docs/handoff-fx9-psalm-title-repeat-audit-2026-05-08.md` (F-X9 audit)
- **Cohort**: #372 (data fix A), #373 (renderer guard B), #374 (related #382 review docs), #383 (this NIT batch)
- **Files**:
  - `src/components/psalm-block.tsx:51-67` (sanitizePsalmHeaderPreface, NIT-1)
  - `src/components/__tests__/psalm-block-header-guard.test.ts:92-115` (NIT-1 unit tests)
  - `src/lib/prayers/__tests__/psalter-headers.test.ts:254-406` (NIT-2 fixture)
  - `scripts/extract-psalter-headers.js:259-266` (extractor — parity reference)
- **Peer**: codex (quality_auditor), exchange `ex_20260508T160032Z_26843126`
- **Discussion**: R1 consensus APPROVED_WITH_ISSUES
- **Related reviews**: `docs/review-376-fx9-fix-cohort.md` (NIT origin), `docs/review-389-fx10-fix.md` (preceding review)
