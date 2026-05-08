# Review #376 — F-X9 fix cohort verdict (#372 + #373)

> **TL;DR** — F-X9 Option C (data fix #372 + renderer guard #373 + invariant test) successfully eliminates 시편 제목/성경구절 중복 회귀. **Verdict: APPROVED_WITH_ISSUES**. 3 minor follow-ups (1 renderer parity gap, 1 invariant fixture gap, 1 pre-existing page-artifact bug — all LOW priority). 967 PASS / 0 FAIL.

**Reviewer**: divine-review (adversarial-reviewer profile, independent — author 는 member-01 + dev)
**Authors**: member-01 (#372 fix A) + dev (#373 fix B)
**Base commit**: `b7e22f3` (HEAD — #373 merge; first parent `32ec3fa` = #372 merge)
**Test SHARD**: full-suite (`npm test` — Makefile 부재로 적응)
**Peer**: codex (quality_auditor) — 독립 audit
**Consensus**: Claude AGREE + Peer AGREE → APPROVED_WITH_ISSUES

## 1. Verdict 요약

**APPROVED_WITH_ISSUES** — 사용자 가시 회귀 fix 완성. 3 NIT/MINOR 후속 권고 (none block merge).

| 영역 | 결과 |
|---|---|
| 사용자 가시 회귀 | ✅ 해결 (title-dup 67/77 → 0/77, attr-dup 74/77 → 0/77) |
| 통합 테스트 | ✅ 967 PASS / 0 FAIL / 48 files |
| Lint + typecheck | ✅ clean |
| Layered defense | ✅ 데이터 fix + renderer guard 양쪽 land |
| Invariant 잠금 | ✅ 2 invariant tests catch future regression |
| CLAUDE.md 체크리스트 | ✅ 모든 항목 통과 (SW cache risk 없음) |

## 2. Per-AC verdict (10 AC)

| AC | Type | Verdict | Evidence |
|---|---|---|---|
| AC-1 strip helpers edge cases | structural | **MET** | escapeRegExp:100, normWS:109, collectRefTitlePairs:117, loadPsalmTitlesByNumber:138 (catches missing/JSON-error), stripTitlePrefix:182 (longest-first), fallbackStripFirstPdfLine:222 (6 guard clauses incl. empty-body protection :246), stripAttributionSuffix:259 |
| AC-2 attribution regex false-positive safe | structural | **MET** | `\s*\((?:харьцуул\.\s+)?${escAttrib}\)\.?\s*$` end-anchored to `$` (`scripts/extract-psalter-headers.js:262`). 본문 중간 parenthetical 안전 |
| AC-3 catalog regen integrity | structural | **MET** | 64 refs / 77 entries (jq verified). 5 spot-checks (Psalm 149/114/11/29 + Psalm 67 multi-occur) clean. F-X9 invariant test asserts 0/77 violations |
| AC-4 invariant test ADEQUACY | structural | **PARTIALLY_MET** | 2 tests positive+negative+field-level (`psalter-headers.test.ts:197, :221`). **GAP**: title invariant 가 canonical week-N.json titles 만 검증 — fallback path (11/77) 의 PDF-only titles 는 별도 positive fixture 없음 (NIT-2 참조) |
| AC-5 renderer guard SSOT/NOP | structural | **PARTIALLY_MET** | sanitizePsalmHeaderPreface exported + clean-data NOP verified (`psalm-block.tsx:37`). **GAP**: 정규식이 `харьцуул.` prefix variant 누락 — extractor + invariant 는 지원 (NIT-1 참조) |
| AC-6 guard tests ADEQUACY | structural | **MET** | 13 tests: 10 unit (clean/title-only/attr-only/both/regex-meta/no-FP/empty-title/empty-preface) + 3 SSR integration (count occurrences). 모든 assertion 이 field-level (≥90% ADEQUATE) |
| AC-7 layered defense coherence | semantic | **MET** | 데이터 fix (#372) → catalog 깨끗 → guard NOP path. dirty regression 시 guard 가 1차 방어. 'clean data — NOP path' 테스트가 NOP 동작 잠금 |
| AC-8 CLAUDE.md self-review | human-judgment | **MET** | 링크/URL/자산경로 무변경, public/ 무변경, 새 라우트 없음, Content-Type 변경 없음 → CACHE_VERSION bump 불필요. 몽골어 strip 만 (새 텍스트 없음) → NFR-002 안전 |
| AC-9 full-suite test | executable | **MET** | `npm test`: 48 files / 967 PASS / 0 FAIL / 5.10s. baseline 952 → 967 PASS 일치. 별도 lint + tsc --noEmit clean |
| AC-10 Option C 정합 | structural | **MET** | Both fixes merged: 32ec3fa (#372 member-01) + b7e22f3 (#373 dev) 양쪽 main 에 land. handoff §5 Option C 권고 충족 |

**Verdict**: 8/10 MET, 2/10 PARTIALLY_MET (둘 다 NIT 수준의 design gap — block 안 함).

## 3. Findings

### NIT-1 — Renderer guard 의 харьцуул prefix parity gap [bug, minor]
- **위치**: `src/components/psalm-block.tsx:52-54` — `\s*\(${escapeRegExp(attribution)}\)\.?\s*$`
- **대조**: Extractor (`scripts/extract-psalter-headers.js:262`) + Invariant (`src/lib/prayers/__tests__/psalter-headers.test.ts:238`) 양쪽 모두 `(?:харьцуул\.\s+)?` 가변 prefix 지원
- **영향**: 만약 catalog 가 stale 상태로 회귀해서 `(харьцуул. Хэсихиус)` literal 을 가질 경우, renderer 만 silently NOP → 사용자에게 중복 노출 (catalog 가 깨끗한 한 발생 안 함)
- **권고**: 후속 task — renderer 정규식에 `(?:харьцуул\.\s+)?` 추가하여 layered defense 의 두 layer 가 동일한 dirty pattern 정의를 갖게 함

### NIT-2 — Title invariant 의 fallback path 미보호 [design]
- **위치**: `src/lib/prayers/__tests__/psalter-headers.test.ts:197-219` — title invariant 가 `loadPsalmTitlesByNumber()` 로 canonical week-N.json/propers 만 walk
- **누락**: Fallback path (11/77) 의 PDF-only title (week-N.json 에 `title` field 없는 entries, e.g. Psalm 119:105-112 page 167) 은 별도 positive fixture 없음. 만약 extractor fallback 이 회귀하지만 canonical strip 은 그대로 작동하면, 그 11 entries 만 dup re-grow 가능하고 invariant 가 catch 못 함
- **권고**: 후속 task — `__fixtures__/fallback-only-titles.json` 같은 fixture 로 11 entries 의 expected preface 잠금

### MINOR-1 — Pre-existing page-break artifact (OUT OF F-X9 SCOPE) [bug]
- **위치**: `src/data/loth/prayers/commons/psalter-headers.rich.json` 2 entries
  - Psalm 113:1-9 page 287 (line 685): `"...буулган даруу 288 288 3 дугаар долоо хоног байгсдыг..."` — page marker `288 288` + running header `3 дугаар долоо хоног` mid-body
  - Psalm 122:1-9 page 398 (line 891): `"...Тэнгэрбурханы хот, 399 Бямба гарагийн орой 399 тэнгэрлэг..."` — page marker `399` + running header `Бямба гарагийн орой` + `399` mid-body
- **PDF 검증**: parsed_data/full_pdf.txt:9785-9795 (Ps 113), :13728-13738 (Ps 122) — preface body 가 PDF page break 를 가로지름. extractor `block-capture` (`scripts/extract-psalter-headers.js:374-379`) 가 빈 line 만 filter, 페이지 marker / running header 는 filter 안 함
- **회귀 여부**: **PRE-EXISTING** (`git show 32ec3fa^:src/data/loth/prayers/commons/psalter-headers.rich.json | jq '.refs["Psalm 113:1-9"]'` 로 확인 — #372 이전 catalog 도 동일 노이즈 존재). F-X9 cohort 가 도입한 새 결함 아님
- **F-X9 효과**: title prefix + attribution suffix 는 정상 strip. mid-body 노이즈만 잔존
- **권고**: 별도 task 로 분리 — extractor block-capture 에 page-marker line filter (`findPagesForLines` 로직 재활용) + running-header heuristic 추가. F-X9 review 의 verdict 에는 영향 없음 (cohort scope 외)

## 4. Test transparency

| AC-id | Test Level | Method | Actual Command | Asserted | Limitation |
|---|---|---|---|---|---|
| AC-1 | L3 | source read + structural inspection | `Read scripts/extract-psalter-headers.js` | 7개 helper 함수 존재 + 각 edge guard 라인 인식 | runtime 동작은 invariant test 통해 간접 검증 |
| AC-2 | L3 | regex pattern read + anchor verification | grep regex pattern in :262 | end-anchor `$` 존재 + escapeRegExp 적용 | 실제 mid-body parenthetical 입력으로 negative test 미실행 |
| AC-3 | L4 | jq + spot-check verbatim | `jq '.refs["Psalm 149:1-9"].entries[0]'` | preface_text 가 title 로 시작 안 함 + attribution 로 끝 안 함 (5 entries) | 77 entries 중 5 spot-check (invariant test 가 전수) |
| AC-4 | L3 | vitest run | `npx vitest run psalter-headers.test.ts` | 9 PASS (existing 7 + F-X9 invariant 2) | 원시 PASS count |
| AC-5 | L3 | source read + cross-reference | `Read psalm-block.tsx + extract-psalter-headers.js` | 두 파일에 escapeRegExp + sanitizer 정의 + 차이점 인식 | 정규식 차이 (хapьцуул) 만 manually identified |
| AC-6 | L2 | vitest run + react-dom/server integration | `npx vitest run psalm-block-header-guard.test.ts` | 13 PASS (10 unit + 3 SSR) | jsdom 환경, 실제 hydration 미검증 |
| AC-7 | L2 | combined integration | included in 13 guard tests + invariant tests | NOP path test 통과 | 실제 prod 데이터 path 는 spot-check 만 |
| AC-8 | L4 | manual checklist via CLAUDE.md | scope inspection of changed files | 변경 파일이 모두 data/script/component/tests/docs 임 | mobile 실제 환경 미검증 (dispatch 권고 사항) |
| AC-9 | L1 | full vitest run | `npm test 2>&1 \| tee ~/.claude/pair-cowork/scratch/divineoffice/test-out-task-376.log` | 967 PASS / 0 FAIL | 단위/통합 vitest 만, e2e Playwright 미실행 |
| AC-10 | L4 | git ancestry verify | `git show --stat b7e22f3 + git rev-parse HEAD` | merge structure 확인 (32ec3fa first parent + d00e2aa second) | git history 만, deploy 검증 별개 |

**Anti-cheating note**: AC-9 evidence는 actual command 실행 (full vitest output)에 근거. `Actual Command = NOT_EXECUTED` 또는 `What Was Asserted = NO_ASSERTION` 항목 없음.

## 5. Recommendations

### Block merge: NONE
F-X9 cohort 는 사용자 가시 회귀를 완전히 해결하고, full-suite test 통과, layered defense + invariant test 안전망 갖춤. **Merge 차단 사유 없음.** (이미 land 된 상태라 merge 사후 review)

### Follow-up tasks (LOW priority, NIT batch 가능)
1. **NIT-1**: Renderer 정규식에 `(?:харьцуул\.\s+)?` 추가 — extractor 와 layered parity
2. **NIT-2**: Fallback path 11 entries 에 대한 fixture-based invariant 추가
3. **MINOR-1 (별도 task)**: Extractor block-capture 에 page-marker / running-header filter 추가 — pre-existing 결함, F-X9 와 무관

3건 모두 LOW priority. NIT batch 로 묶어 솔버에 dispatch 가능.

## 6. References

- **Audit doc**: `docs/handoff-fx9-psalm-title-repeat-audit-2026-05-08.md` (Option C 권고)
- **Tasks**: #362 (audit), #372 (fix A), #373 (fix B), #376 (this review)
- **PR commits**: 29e6e47 (#372), d00e2aa (#373) — merged at 32ec3fa, b7e22f3 respectively
- **Peer exchange**: `.claude/pair-working/sessions/adhoc-review-376-fx9-cohort/peer/exchanges/ex_20260508T151124Z_c537122a/response.txt`
- **Decision record**: see `pair-cli decision record` output below
- **Evidence transfer**: `.claude/pair-working/sessions/adhoc-review-376-fx9-cohort/transfer/evidence-summary.md` (SHA256: 0ab7e77697caba70)
