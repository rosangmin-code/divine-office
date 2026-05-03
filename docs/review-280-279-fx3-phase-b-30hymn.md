# Review #280 — #279 F-X3 Phase B-stage 30 hymn sweep (member-01)

> **TL;DR** — `0a75ed6` (member-01)는 ORDINARY_TIME 30 hymn 의 rich.json 에 method (a2) phrase 를 additive 주입했다. **회귀 0** (894 vitest PASS / psalter 215+0 / 30 hymns 78 stanzas 0 violations / 0 lint error / tsc clean / builder idempotent). Phase A+B 누적 35 hymn = OT Compline 12/12 전 영역 + OT Lauds/Vespers 핵심 21 + 76 (Phase A CHRISTMAS carryover). **Verdict**: APPROVED_WITH_ISSUES — F-1 single-phrase fallback 이 "parallel-epithet" 시구를 paragraph 로 collapse 해 일부 hymn 에서 legacy 대비 구조 회귀 (R2 spike 인정 known-limit, D-stage). **Risk**: LOW (data-only additive). **Next**: D-stage 진입 시 method-b/per-line phrase 보강 권고.

## Reviewer Identity & Scope

- **Reviewer**: divine-review (adversarial-reviewer profile, divineoffice team)
- **Author**: member-01
- **Subject commit**: `0a75ed6` (worktree-279-member-01, base 21c6493)
- **Merged into main**: `59fa060` (30 files, +869 LOC)
- **Review scope**: F-X3 Phase B-stage selection 적정성, 4 terminator-have phrase 정확성, 26 single-phrase fallback shape + R-13 hanging indent 적용, 회귀 검증, 외부 영역 영향, D-stage 위험 사전 평가
- **Out of scope**: D-stage (sweep-hymn-rest 92 hymn) 사전 구현, 시각 검증 (R5 별 task), 시즌 hymn (Advent/Christmas/Lent/Easter) phrase 주입

## AC Verification Matrix (per GAV Phase C)

| ID | Type | Criterion | Verdict | Evidence |
|----|---|---|---|---|
| AC-1 | executable | `npm test` 회귀 없음 (894 PASS) | **MET** | `Test Files 46 passed (46) \| Tests 894 passed (894)` (`scratch/test-out.log` 5.78s) |
| AC-2 | executable | verify-phrase-coverage psalter 변동 없음 | **MET** | `OK — 215 stanza(s) with phrases inspected, 0 violations` (`scratch/verify-psalter.log`) |
| AC-3 | executable | verify-phrase-coverage hymns 30개 = 78 stanzas / 0 violations | **MET** | per-hymn 합산: 5+2+1+2+3+1+3+3+1+2+2+7+2+1+1+5+1+1+1+1+2+1+1+12+1+2+1+1+11+1 = 78 / 0 violations (`scratch/verify-hymns.log`) |
| AC-4 | executable | `npm run lint` 0 errors / `npx tsc --noEmit` clean | **MET** | `ESLint: 0 errors, 16 warnings` (warnings 모두 pre-existing `@typescript-eslint/no-unused-vars`, #279 신규 도입 없음) + `TypeScript: No errors found` |
| AC-5 | executable | builder idempotency byte-identical | **MET** | `node scripts/build-hymn-phrases-into-rich.mjs --ids 3,4,...,121` → OK=30 FAIL=0; `git diff --stat` 빈 출력, `git status --short` 빈 출력 |
| AC-6 | semantic | Selection 30 hymn ORDINARY_TIME pool 일치 + Phase A 와 disjoint | **PARTIALLY_MET** | hymns-index.json cross-check: Phase A∩B = ∅; OT Compline 12/12 (전 영역, 11/26/40 from A + 9 from B) ✓; OT L/V 24/~46 (15 deferred); Phase A 76 = CHRISTMAS-only (acceptable carryover). 단 dispatch summary "ORDINARY_TIME 매일 visible" wording 은 imprecise — strict reading (week-1 visible only) 18 hymn 인 반면 실제 scope 는 broader. Commit body 의 "OT Compline 전 영역 + L/V 핵심 21" 가 정확한 표현. 코드/데이터 결함 아님, 문서 명료성 nit. |
| AC-7 | semantic | 4 terminator-have hymn (3, 49, 80, 110) phrase boundary 정확성 | **MET** | spot-sample (`Bash node`-side dump): 모든 phrase boundary 가 (a) sentence terminator (`. ! ? …`) on end-of-line 또는 (b) 의미 단위 closing (refrain stanza opener). hymn 3 stanza[0] 2 phrases at line 1/3 마침표; hymn 49 stanza[2] (refrain) 3 phrases via `Дахилт:` opener + `Эсвэл:` mid-stanza alternate + 종결 `олгогтун!`; hymn 80 stanza[1] 2 phrases via `…` + `(Latin)` 닫는 괄호; hymn 110 stanza[6] (refrain) 2 phrases via `ирэв.` + 마지막 합창. False positive (구절 내 마침표 split) 없음 — `closesPhrase(text)` 가 trailing-char-only 정책으로 mid-line `.` 무시. |
| AC-8 | semantic | 26 single-phrase fallback shape + R-13 hanging indent 자동 적용 | **MET (with caveat)** | 데이터 shape: `phrases:[{lineRange:[0,N], indent:0}]` (or `+role:'refrain'` for refrain stanzas) — 단일 phrase, role 정확. 렌더러 `src/components/psalm-block.tsx:79-83`: `indent === 0` → `pl-6 -indent-6` (Tailwind `padding-left:1.5rem` + `text-indent:-1.5rem`) → 첫 줄 좌측 정렬, viewport-wrap 시 1.5rem hanging indent 적용. R-13 mechanism intact. **Caveat**: 단일 phrase 가 stanza 의 모든 line 을 하나의 paragraph 로 join 하므로 PDF 의 의도된 line break 가 소실 — F-1 (아래 참고). |
| AC-9 | semantic | 외부 영역 (loader / 시즌 매핑 / propers) 영향 없음 | **MET** | `git diff --stat 21c6493 59fa060`: 30 changed files **모두** `src/data/loth/prayers/hymns/{N}.rich.json`. 0 deletion, +869 LOC additive. loader (`src/lib/propers-loader.ts`, `src/lib/prayers/rich-overlay.ts`), 렌더러 (`src/components/psalm-block.tsx`), 시즌 매핑 (`src/data/loth/psalter/week-*.json`), 빌더 (`scripts/build-hymn-phrases-into-rich.mjs`) 변경 0. 순수 data injection. |
| AC-10 | structural | docs/review-280-279-fx3-phase-b-30hymn.md 작성 (이전 review docs 형식 일치) | **MET** | 본 파일 (`docs/review-280-279-fx3-phase-b-30hymn.md`) 작성, format 은 `docs/review-270-263-fx3-polish.md` 와 일관 (TL;DR + Reviewer Identity + AC Matrix + Findings + Adversarial Cross-Checks + Consensus + Recommendation + References). |

**9 AC MET + 1 PARTIALLY_MET (doc clarity nit, 코드 결함 아님). Verdict: APPROVED_WITH_ISSUES.**

## Findings (3 — 1 MAJOR design-acknowledged + 2 MINOR/NIT)

| ID | Severity | Category | File:Line | Finding | Recommended Action |
|----|---|---|---|---|---|
| F1 | major | design (R2 known limit) | `scripts/build-hymn-phrases-into-rich.mjs:planStanzaPhrases` + `src/components/psalm-block.tsx:62-67` | Single-phrase fallback path (26 hymn 적용) 가 stanza 내 모든 line 을 `lines.slice(start, end+1).join(' ')` 로 단일 paragraph 화. PDF 의 의도된 line break 가 소실. 두 가지 상반된 효과: **(a)** wrap artifact (예: hymn 110 block-stanza[4] `...дийлэх нь / үгүй / Хожим...` — "үгүй"가 wrap continuation) → join 후 자연스럽게 읽힘, **net improvement**; **(b)** parallel-epithet verse (예: hymn 49 stanza[1] `1. Маш сайхан цэвэр / Маш бат журамт / Маш түвшин хичээлт / Маш үнэн шударгуу`) → 4 parallel epithets 가 단일 paragraph 으로 collapse, **structural regression** vs legacy `whitespace-pre-line` 4 hard-break render. Dispatch 의 "71 hymn fallback UX 가 legacy hard-break 보다 실제 개선" 주장은 **mixed** — hymn 별 구조에 따라 improvement vs regression 갈림. R2 spike (#264) 가 LOW feasibility 로 method (a1) 우회 결정 시 인정한 known limit, D-stage 에서 method-b (per-line phrase generation) 또는 PDF column-aware 재방문 권고. | D-stage 진입 시 (a) parallel-epithet 검출 (선두 prefix 반복 패턴) → per-line phrase split 도입, 또는 (b) PDF-aware re-parse 로 line-break 의도 보존. 본 PR 은 R2 인정 framing 하 accept. **Phase B revert 권고 아님** — 데이터는 유효, 이슈는 design 영역. |
| F2 | minor | doc-clarity | dispatch instruction summary | "ORDINARY_TIME 매일 visible (Lauds/Vespers/Compline) union" 문구가 모호함. Strict reading (week-1 visible only): 18 hymn (Lauds[0..6] ∪ Vespers[0..6] ∪ Compline[0..6]). 실제 Phase B scope: OT Compline 12/12 (week 1 visible 7 + week 2-3 추가 5) + OT L/V 핵심 21 (week 1 visible 핵심 + week 2-3 일부). Commit body 의 "OT Compline 전 영역 + Lauds/Vespers 핵심 21" 가 정확. | 향후 dispatch 또는 handoff 문서에서 "week-1 매일 visible" 표현 대신 "OT Compline 전체 + L/V 핵심 N" 처럼 commit body wording 채택. |
| F3 | nit | lint-warnings | `scripts/build-hymn-phrases-into-rich.mjs` (1 warning), `scripts/build-phrases-into-rich.mjs` (2 warnings) | `@typescript-eslint/no-unused-vars` 경고 — 모두 pre-existing (각각 #263 / #176 / #196 등에서 도입). #279 가 신규 도입한 lint 경고 0. | 선택적: 후속 NIT 배치에서 unused-vars cleanup. 본 PR scope 외. |

## Adversarial Cross-Checks (passed)

1. **Selection 적정성 (AC-6 cross-check)** — `src/data/loth/ordinarium/hymns-index.json` `seasonalAssignments.ORDINARY_TIME` 직접 inspect:
   - Lauds (26 cand): Phase A {1, 40} + Phase B {3, 4, 21, 28, 29, 31, 37, 56, 57, 58, 66, 75, 80, 86, 110} + deferred {87, 91, 93, 96, 100, 103, 105, 109, 113}
   - Vespers (23 cand): Phase A {11, 40} + Phase B {29, 30, 32, 42, 49, 52, 54, 59, 62, 63, 84, 107, 110, 121} + deferred {88, 90, 92, 93, 99, 101, 122}
   - Compline (12 cand): Phase A {11, 26, 40} + Phase B {20, 59, 62, 68, 84, 102, 107, 110, 121} = **12/12 전 영역 ✓**
   - Phase A∩B = ∅ (disjoint, no double-injection)
   - Phase A {76} = CHRISTMAS only (not OT) — 기 도입 carryover, scope-out
2. **Refrain detection regex robustness** — `REFRAIN_PREFIX_RE = /^\s*(?:Дахилт(?:\s*\d+)?|Нийтээр|Эсвэл(?:\s+нийтээр)?)\s*:/`. 직접 trace:
   - `Дахилт:Их` (no-space variant, hymn 57 block[2] L0) → match ✓ (#263 polish 기여)
   - `Дахилт: Их` (space) → match ✓
   - `Дахилт N:` (numbered) → match ✓ (hymn 80 block[3] etc.)
   - 데이터 검증: hymn 57 block[2] phrases[0].role = 'refrain' ✓ (실제로 추출된 데이터에서 refrain 태그됨)
3. **Lone "Дахилт:" rubric handling** — `isLoneRefrainRubric(text)` 가 lone-form 만 매치 (trailing `:\s*$`). hymn 4 block[1] L0 "Дахилт:", hymn 57 block[6] L0 "Дахилт:" → builder 가 phrase split 하지 않고 본문에 attach (`Дахилт:` rubric + 다음 line(s) = 단일 phrase). ✓
4. **Terminator boundary precision** — `closesPhrase(text)` 는 joined-line 의 trailing char 만 검사. mid-line `.` (예: hymn 110 stanza[0] "Цээжинд цохилох зүрх. Сэтгэлд орших Сүнсээ" — 줄 중간 마침표) → 분할되지 않음 (의도된 동작, 줄 끝 마침표만 phrase 종결). False positive 없음.
5. **Idempotency hazard** — re-run `--ids 3,4,...,121` 후 git diff/status 모두 empty. 빌더의 `{ phrases: _drop, ...rest }` 패턴이 기존 phrases 를 덮어쓰는 안전성 보장.
6. **External impact scope** — 30 변경 파일 모두 `src/data/loth/prayers/hymns/`. loader/resolver/renderer/builder 코드 변경 0. textRich loader (`src/lib/prayers/rich-overlay.ts`), Hymn rotation (`src/lib/propers-loader.ts:466 getHymnForHour`), Compline marian (`src/lib/hours/compline.ts`) 등 모두 unaffected.
7. **D-stage 위험 사전 평가** — Phase A+B 35 hymn 중 4 (hymn 3, 49, 80, 110) 만 terminator-have, 31 single-phrase fallback (Phase A 5 + Phase B 26). Ratio = ~11% terminator-have. D-stage 92 hymn 가 동일 ratio 로 진행되면 약 ~10 terminator-have / 82 single-phrase fallback 예상 — F1 의 parallel-epithet regression 이 D-stage 에서 augment 될 가능성 있음. Method-b 도입 검토 필요.

## Test Method Transparency

| AC | Test Level | Method | Actual Command | What Was Asserted | Limitation |
|----|---|---|---|---|---|
| AC-1 | L3 (Unit/Integration) | vitest run | `npm test 2>&1 \| tee scratch/test-out.log` | `Tests 894 passed (894)` | 회귀 detection — 신규 phrase data 가 기존 test 깨뜨리지 않음. 신규 visual rendering test 부재 (R5 별 task). |
| AC-2 | L3 (Unit) | node script | `node scripts/verify-phrase-coverage.js` | psalter 215 stanzas 0 violations (default target) | schema/bounds/non-overlap/coverage 4 invariants 만 검증. 의미적 정확성 (PDF verbatim 일치) 검증 없음. |
| AC-3 | L3 (Unit) | per-hymn loop | `for h in 30 ids; node scripts/verify-phrase-coverage.js --target src/data/loth/prayers/hymns/${h}.rich.json` | 78 stanzas total / 0 violations across 30 hymns | 동일 invariant 검사. 30 파일 union 한 번에 검증하는 빌더 모드 부재 (개별 호출 합산). |
| AC-4 | L3 (Static) | eslint + tsc | `npm run lint && npx tsc --noEmit` | 0 errors / TypeScript clean | warnings 16 모두 pre-existing 확인 (별도 git history grep). |
| AC-5 | L4 (Manual reproduce) | builder + git | `node scripts/build-hymn-phrases-into-rich.mjs --ids ...` then `git diff --stat`/`git status --short` | byte-identical (no diff, no status) | 1회 reproduce. multi-run aging 미검증 (정상 실행 보장은 1회 검증으로 충분). |
| AC-6 | L3 (Static) | node introspection | hymns-index.json JSON.parse + set arithmetic | Phase A∩B disjoint, OT Compline 12/12, deferred 15 명시 | 명시 selection rationale 문서 부재 (commit body 외). |
| AC-7 | L4 (Manual spot-check) | data dump | `node -e "...JSON parse, print phrases per stanza..."` | hymn 3, 49, 80, 110 의 phrase boundary 가 sentence terminator + refrain prefix 정합 | PDF verbatim cross-check (`parsed_data/full_pdf.txt`) 미수행 — Bash limitation; spot-sample 수준에서 의미 단위 합리성 확인. PDF parsed_data 비교는 D-stage 또는 시각 검증 별도 task 권고. |
| AC-8 | L3 (Code read) | renderer source review | Read `src/components/psalm-block.tsx` lines 62-83 | `pl-6 -indent-6` Tailwind classes → CSS hanging indent 적용 | 실제 viewport rendering 미검증 (Playwright headless test 기존 e2e 에 phrase-render path 단위 테스트 부재; 본 review 의 sub-scope 외). |
| AC-9 | L3 (git diff) | git diff --stat | `git diff --stat 21c6493 59fa060` | 30 changed files all in src/data/loth/prayers/hymns/ | static delta 만 검증; runtime side-effect 없음을 가정. |
| AC-10 | L4 (Filesystem) | Write tool | `Write docs/review-280-279-fx3-phase-b-30hymn.md` | 본 파일 작성됨 | format consistency 는 `docs/review-270-263-fx3-polish.md` 와 manual diff. |

## Consensus

- **Claude (divine-review)**: AGREE → APPROVED_WITH_ISSUES
- **Peer (codex, quality_auditor)**: AGREE → APPROVED_WITH_ISSUES
- `pair-cli consensus check`: `outcome: consensus, consensus_reached: true` (round 1, no escalation)

## Recommendation

**APPROVED_WITH_ISSUES** — 이미 main 에 merge 됨 (`59fa060`). F1 은 R2 spike (#264) 인정 known limit 으로 본 PR scope 외 (D-stage 또는 별도 method-b 추진 시 해소 권고). F2/F3 는 follow-up 불필요 (NIT). **Phase B revert / revise 권고 없음.**

D-stage 진입 시 권장 사전 작업:
1. Parallel-epithet 검출 알고리즘 prototype — 선두 N-gram 반복 패턴 기반 per-line split 후보 도출 (예: "Маш ..." × 4)
2. PDF column-aware re-parse 재방문 — R2 spike (#264) 의 LOW feasibility 결론 update 가능 여부 (PDF 추출 도구 진화)
3. D-stage 92 hymn → ~10 terminator-have / 82 fallback 예상 비율 — F1 영향 hymn 식별 우선 sweep

## References

- Origin: `docs/handoff-fx3-phrase-audit.md` (#228 audit), `docs/handoff-fx3-r2-a1-spike.md` (#264 R2 LOW feasibility), `docs/review-257-249-fx3-phase-a-pilot.md` (#257 Phase A 1차 review), `docs/review-270-263-fx3-polish.md` (#270 polish review)
- Subject: commit `0a75ed6` (worktree-279-member-01) → merge `59fa060`
- Evidence: `.claude/pair-working/sessions/adhoc-review-280-fx3-phase-b/transfer/evidence-summary.md` + scratch/{test-out, verify-psalter, verify-hymns, lint, tsc}.log
- Peer exchange: `.claude/pair-working/sessions/adhoc-review-280-fx3-phase-b/peer/exchanges/ex_20260503T125815Z_4ea0727e/`
- AC registry: `.claude/pair-working/sessions/adhoc-review-280-fx3-phase-b/transfer/goal-ac-registry.md`
