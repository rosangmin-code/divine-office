# Review #382 — F-X12 Phase A verdict (#374)

> **TL;DR** — F-X12 Phase A (legacy intercessions refrain italic heuristic) successfully addresses 사용자 가시 회귀. **Verdict: APPROVED_WITH_ISSUES**. 2 NIT (audit divergence on `u` flag + optional punct) — no current false positive in real data. 977 PASS / 0 FAIL.

**Reviewer**: divine-review (adversarial-reviewer profile, independent — author 는 dev)
**Author**: dev (#374)
**Base commit**: `ecf88d6` (HEAD — leader merge of #376 review on top of #374 merge `36688f2`)
**Test SHARD**: full-suite (`npm test`)
**Peer**: codex (quality_auditor) — 독립 audit
**Consensus**: Claude AGREE + Peer AGREE → APPROVED_WITH_ISSUES

## 1. Verdict 요약

**APPROVED_WITH_ISSUES** — 사용자 가시 회귀 fix 완성. 2 NIT (cosmetic + design alignment).

| 영역 | 결과 |
|---|---|
| 사용자 가시 회귀 | ✅ 해결 (legacy items[] path에 italic refrain 적용) |
| 통합 테스트 | ✅ 977 PASS / 0 FAIL / 49 files |
| Lint + typecheck | ✅ clean |
| Path separation | ✅ Rich + Structured paths 무변경, legacy 만 수정 |
| Real-data 적용 | ✅ 34 occurrences (33 `:` + 1 `.`) 모두 매칭 |
| Audit 정렬 | ⚠️ 2 minor 차이 (NIT) |
| CLAUDE.md 체크리스트 | ✅ 모든 항목 통과 |

## 2. Per-AC verdict (10 AC)

Claude + Peer both rated 10/10 MET — no PARTIALLY_MET, no NOT_MET.

| AC | Type | Verdict | Evidence |
|---|---|---|---|
| AC-1 regex Cyrillic-safe + end-anchored | structural | **MET** | `intercessions-section.tsx:17` — `/залбирцгаая[:.]?\s*$/`, no `\b`, `$` anchor + `\s*` whitespace tolerance |
| AC-2 narrow stem scope | structural | **MET** | Negative tests at `intercessions-section.test.ts:61-69` (алдаршуулцгаая/гуйцгаая/магтацгаая 모두 false) |
| AC-3 i===0 guard | structural | **MET** | `intercessions-section.tsx:133-136` (`i > 0 ? section.items[i-1] : ''` + `i > 0 && regex.test`); integration test `:113-128` |
| AC-4 path separation | structural | **MET** | `structured ? <structured 84-121> : <legacy 122-153>` ternary. Heuristic only in legacy map (line 130-145). Rich path (42-54) 무변경 |
| AC-5 rendered output markers | structural | **MET** | line 140-145: `data-role={isRefrain ? 'intercessions-refrain' : undefined}` + `italic` Tailwind class. Test `:96-100` asserts both |
| AC-6 test ADEQUACY | structural | **MET** | 10 tests: 7 regex unit (positive/negative/edge) + 3 integration (renderToStaticMarkup with HTML occurrence count). All field-level. ≥90% ADEQUATE |
| AC-7 full-suite test | executable | **MET** | `npm test`: 49 files / 977 PASS / 0 FAIL / 5.30s. Lint clean, tsc clean. |
| AC-8 CLAUDE.md self-review | human-judgment | **MET** | 링크/URL 무변경, italic class consistency (rich/structured paths 동일), Mongolian text 미추가, SW navigation network-only |
| AC-9 audit alignment Phase A scope | structural | **MET** | Audit §6 Phase A 권고와 일치. Phase A.1 (structured response italic) 의도적 제외 (line 107-110 plain) — audit `:183-186` "사용자 confirm 필요" 매칭 |
| AC-10 33 anchor coverage | semantic | **MET** | Real-data grep: 34 occurrences (33 `:` + 1 `.` + 0 bare). Implementation 정규식 `[:.]?` 모두 매칭. False positive 0 |

## 3. Findings

### NIT-1 — Regex `u` flag missing [style]
- **위치**: `src/components/prayer-sections/intercessions-section.tsx:17`
- **현재**: `/залбирцгаая[:.]?\s*$/`
- **Audit 권고** (`docs/handoff-fx12-intercession-italic-audit-2026-05-08.md:164`): `/залбирцгаая[:\.]\s*$/u` (with `u` flag)
- **영향**: BMP Cyrillic literal 만 사용 — `u` flag 없이도 동작 동일. 단 F-X9 cohort 의 정규식 (`extract-psalter-headers.js:262`, `psalter-headers.test.ts:238`) 은 모두 `u` flag 사용 → 코드베이스 내 inconsistency
- **권고**: NIT batch 에 추가하여 `u` flag 추가 (defensive consistency)

### NIT-2 — Punctuation optional vs audit's required [design]
- **위치**: `src/components/prayer-sections/intercessions-section.tsx:17`
- **현재**: `[:.]?` (optional, makes bare cohortative match possible)
- **Audit 권고**: `[:\.]` (required `:` or `.`)
- **Real-data 검증** (grep psalter/week-N.json): 34 occurrences, 0 bare cohortatives. Implementation의 broader match 는 dead defensive
- **잠재 risk**: 미래에 PDF 가 bare "залбирцгаая" 종결 추가 시 의도치 않은 italic 적용 가능. 단 narrow stem 자체가 cohortative 형태라 false positive risk 매우 낮음
- **권고**: 두 입장 모두 defensible. 보수적으로 가려면 audit 권고 `[:.]` (required) 로 좁히기. 현재대로 유지하면 future-proof. NIT batch 에서 결정 가능

## 4. Test transparency

| AC-id | Test Level | Method | Actual Command | Asserted | Limitation |
|---|---|---|---|---|---|
| AC-1 | L3 | source read + regex inspection | `Read intercessions-section.tsx:17` | `\b` 없음 + `$` anchor + `\s*` | 실제 unicode edge case 미검증 |
| AC-2 | L3 | source + test read | included in vitest run (line 61-69) | 3 cohortative 모두 false 반환 | 모든 가능한 cohortative 변형 미커버 |
| AC-3 | L3 | source + integration test | `Read intercessions-section.tsx:133` + test `:113-128` | i=0 가드 + 두번째 item 만 refrain | jsdom only |
| AC-4 | L3 | source full read | `Read intercessions-section.tsx` (158 lines) | ternary branch isolation | runtime path coverage 별도 검증 미시도 |
| AC-5 | L2 | renderToStaticMarkup integration | included in vitest test `:96-100` | HTML 에 data-role + italic class 동시 존재 | server render only, hydration 미검증 |
| AC-6 | L3 | vitest test count | `npm test` (49 files / 977 PASS) | 10 신규 test PASS | total count |
| AC-7 | L1 | full vitest run | `npm test 2>&1 \| tee ~/.claude/pair-cowork/scratch/divineoffice/test-out-task-382.log` | 49 files / 977 PASS / 0 FAIL / 5.30s | unit + integration vitest only, e2e 별도 |
| AC-8 | L4 | manual checklist | scope inspection | 변경 파일 모두 renderer + tests + docs | mobile 실제 환경 미검증 |
| AC-9 | L4 | audit doc cross-reference | Read audit §6 + source 비교 | structured response (line 107-110) plain 유지 | audit 의도 vs 구현 의도 manually compare |
| AC-10 | L4 | grep + regex match | `grep -roE 'залбирцгаая[^"]*"' src/data/loth/psalter/` | 33 `:` + 1 `.` + 0 bare; 모두 implementation regex 매칭 | psalter/week-*.json만, propers/* 별도 |

**Anti-cheating note**: AC-7 evidence는 actual command output (vitest 977 PASS). `Actual Command = NOT_EXECUTED` 또는 `What Was Asserted = NO_ASSERTION` 항목 없음.

## 5. Recommendations

### Block merge: NONE
F-X12 Phase A 는 사용자 가시 회귀를 해결하고, full-suite test 통과, audit 권고 Phase A scope 정확히 land. **Merge 차단 사유 없음.** (이미 land 된 상태)

### Follow-up tasks (LOW priority)
1. **NIT-1**: `u` flag 추가 (`/залбирцгаая[:.]?\s*$/u`) — F-X9 cohort 와 codebase consistency
2. **NIT-2**: 보수적으로 `[:.]?` → `[:.]` (required) — audit 권고 align. 현재 false-positive 없으니 선택적

2건 모두 NIT batch follow-up 가능. 또는 Phase A.1 (structured response italic) 사용자 confirm 받을 때 함께 처리.

## 6. References

- **Audit doc**: `docs/handoff-fx12-intercession-italic-audit-2026-05-08.md` (Phase A 권고 §6, 33 anchor sweep §3.1)
- **Combined audit**: `docs/handoff-fx10-fx11-fx12-audit-2026-05-08.md` §3.5 (narrow scope rationale)
- **Tasks**: #371 (audit), #374 (Phase A fix), #382 (this review)
- **PR commit**: 9a61956 (#374) — merged at 36688f2
- **Peer exchange**: `.claude/pair-working/sessions/adhoc-review-382-fx12-phase-a/peer/exchanges/ex_20260508T152541Z_eede8662/response.txt`
- **Evidence transfer**: `.claude/pair-working/sessions/adhoc-review-382-fx12-phase-a/transfer/evidence-summary.md` (SHA256: eb3037503c8d1492)
