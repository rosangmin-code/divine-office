# Review #270 — #263 F-X3 Phase A Polish (member-01)

> **TL;DR** — `ae76fd5` (member-01)는 review #257 R1 (HIGH) + R3 (LOW) 권고를 정확히 정리했다. REFRAIN_PREFIX_RE 를 `Дахилт` 단일에서 `(?:Дахилт(?:\s*\d+)?|Нийтээр|Эсвэл(?:\s+нийтээр)?)` alternation 으로 확장하고, 6 신규 unit test 로 회귀 감지 가능. 894 vitest PASS / 0 lint error / tsc clean / verify-phrase-coverage 215+35 stanzas 0 violations / 빌더 idempotency 0-diff. **Verdict**: APPROVED_WITH_ISSUES — 5 잔여 findings 모두 NIT~MINOR (post-merge NIT 배치 권장). **Risk**: LOW. **Next**: optional NIT cleanup follow-up.

## Reviewer Identity & Scope

- **Reviewer**: divine-review (adversarial-reviewer profile, divineoffice team)
- **Author**: member-01 (compact)
- **Subject commit**: `ae76fd5` (worktree-263-member-01, base 08bc13f)
- **Merged into main**: `45e26fd` (3 files, +112/-19)
- **Review scope**: review #257 R1 (HIGH design — refrain regex extension) + R3 (LOW design — 6 unit test)
- **Out of scope**: R2 (a1 spike, #264), R5 (viewport)

## AC Verification Matrix (per GAV Phase C)

| ID | Type | Criterion | Verdict | Evidence |
|----|---|---|---|---|
| AC-1 | executable | npm test ≥894 PASS with 6 new R1+R3 tests | **MET** | `Test Files 46 passed (46) \| Tests 894 passed (894)` (`/tmp/test-out-270.log`) |
| AC-2 | executable | verify-phrase-coverage no new violations | **MET** | psalter 215/0 (unchanged) + 5 hymns 35/0 (per-file) |
| AC-3 | executable | npm run lint 0 errors | **MET** | 0 errors, 16 warnings (all pre-existing) |
| AC-4 | executable | npx tsc --noEmit clean | **MET** | TypeScript: No errors found |
| AC-5 | executable | builder idempotent (zero git diff) | **MET** | OK=5 FAIL=0; `git diff --stat -- src/data/loth/prayers/hymns/` empty |
| AC-6 | semantic | regex correctness (no precedence bug) | **MET** | manual trace: `Эсвэл нийтээр:` greedy-match wins; `Эсвэл:` fallback works; `НийтээрFOO:` no false-positive; tests 5+6 pin both branches |
| AC-7 | semantic | option (a) vs (b) rationale defensible | **MET** | Phase A italic-only RUBRIC_CLASS scope justifies single role; option (b) deferred to Phase B |
| AC-8 | structural | 6 new unit tests (Дахилт N×2, no-space, R1×3) | **MET** | test file +73 lines, 6 distinct `it(...)` cases with `expect(phrases).toEqual([...])` shape |
| AC-9 | structural | data delta = hymn 1 only (1 file +2/-1) | **MET** | `git diff --stat 08bc13f..ae76fd5 -- src/data/loth/prayers/hymns/` shows only `1.rich.json`, +2/-1 (block[2] role:'refrain' added); hymns 11/26/40/76 byte-identical |
| AC-10 | semantic | adversarial coverage (corpus, precedence, non-first-line) | **MET** | PDF grep covers 3 families (Дахилт 111 / Нийтээр 3 / Эсвэл±нийтээр 17+1); `Хариу залбирал` is section header (out of hymn scope); `planStanzaPhrases:194-195` gates role on `lines[0]` only (structural non-first-line guard) |

**All 10 ACs MET. Verdict: APPROVED_WITH_ISSUES.**

## Findings (5 — all non-blocking, severity ≤ MINOR)

| ID | Severity | Category | File:Line | Finding | Recommended Action |
|----|---|---|---|---|---|
| F1 | nit | doc-drift | `scripts/build-hymn-phrases-into-rich.mjs:190` | Inline comment "if the FIRST line opens with `Дахилт`" still mentions only Дахилт; the implementation now covers Дахилт + Нийтээр + Эсвэл families via `isRefrainStanzaOpener`. Code is correct; only the inline note lags. | Update comment to reflect 3 families (matches the broadened JSDoc at lines 127-138). |
| F2 | minor | test-coverage | `scripts/__tests__/build-hymn-phrases-into-rich.test.mjs:87` | `isLoneRefrainRubric` was extended to recognize `Нийтээр:` / `Эсвэл:` / `Эсвэл нийтээр:` lone-rubric form, but tests only cover lone `Дахилт:`. Author justifies "코퍼스 instance 0이지만 일관성. defensive 정당성." A future regex tightening could silently drop the lone-form recognition for the new families with no test failure. | Add 1 lone-rubric test for lone `Нийтээр:\\nbody` (or the composite) to lock-in the defensive symmetry. |
| F3 | nit | test-coverage | `scripts/__tests__/build-hymn-phrases-into-rich.test.mjs:111` | Regex `Дахилт(?:\\s*\\d+)?` allows zero-space numbered `Дахилт1:`, but only spaced numbered (`Дахилт 1:`, `Дахилт 2:`, `Дахилт 3:`) are directly tested. | Optional: add a `Дахилт1:` no-space-numbered test if any corpus instance exists. PDF corpus shows none, so defensive nit. |
| F4 | minor | test-coverage | `scripts/__tests__/build-hymn-phrases-into-rich.test.mjs:99` | The single negative test (verse number `1.`) only covers a non-prefix first line. There is no explicit negative test for a stanza where one of the new prefixes (`Нийтээр:` / `Эсвэл:`) appears on **line 2** — to lock-in that role propagation gates on `lines[0]` only. The structural guard at `planStanzaPhrases:194-195` is correct, but a future refactor could regress without test coverage. | Add 1 negative test: `[line('Бид ариун Эзэн.'), line('Нийтээр: foo')]` should NOT propagate refrain. |
| F5 | nit | review-evidence | `.claude/scaffold/anti-pattern-catalog.yml` | Peer (codex) flagged that the anti-pattern catalog referenced by the Behavioral Coverage Audit Protocol is absent in this worktree, so AP-1..AP-6 catalog comparison could not be independently performed. Manual inspection of the 6 new tests confirmed no AP-1/2/3/4/5/6 anti-pattern (all use exact-array `toEqual` assertions). | Process-level: optionally seed `anti-pattern-catalog.yml` for future reviewers. Not a code defect. |

## Adversarial Cross-Checks (passed)

1. **Regex precedence (AC-10b)** — `(?:\s+нийтээр)?` greedy-matches before falling back; `Эсвэл нийтээр:` and `Эсвэл:` both unambiguously covered. Test 6 (`Эсвэл нийтээр: Аллэлуяа... !`) directly pins the composite branch. **No bug.**
2. **Corpus prefix coverage (AC-10a)** — line-anchored grep on `parsed_data/full_pdf.txt` finds:
   - `^Дахилт*`: 111 lines (canonical refrain)
   - `^Нийтээр:`: 3 lines (31073, 32149, 32569 — all hymn area)
   - `^Эсвэл(?:\s+нийтээр)?:`: ~17 + 1 lines (most non-hymn alternates; hymn-area: 31338, 32377, 32571 composite)
   - `Хариу залбирал`: 137 occurrences but these are **section headers** for "responsorial prayer" (NOT a stanza prefix; out of `prayers/hymns/` scope)
   - `Цогцоор` / `Удирдагч` / `Туслагч`: substantive nouns, not refrain prefixes
   No missing prefix family for the hymn corpus.
3. **Schema decision (AC-7)** — option (a) is scope-bounded (Phase A italic styling only). Liturgically: `Дахилт` (refrain) ≠ `Нийтээр` (congregational response) ≠ `Эсвэл` (alternate) at the *functional* level, but they share the *visual* italic rubric class. Option (b) (separate `role: 'response'` / `role: 'alternate'`) is appropriate for Phase B if functional differentiation surfaces (audio cues, accessibility labels). The commit message acknowledges this trade-off explicitly.
4. **Idempotency** — re-running `node scripts/build-hymn-phrases-into-rich.mjs --ids 1,11,26,40,76` produces zero git diff. The builder uses `{ phrases: _drop, ...rest }` to overwrite cleanly per stanza.
5. **Pre-existing baseline** — the 1 lint warning in the builder (`_drop` unused) is inherited from #249, NOT introduced by #263.

## Consensus

- **Claude (divine-review)**: AGREE → APPROVED_WITH_ISSUES
- **Peer (codex, quality_auditor)**: AGREE → APPROVED_WITH_ISSUES
- `pair-cli consensus check`: `outcome: consensus` (round 1, no escalation)

## Recommendation

**APPROVED_WITH_ISSUES** — already merged at `45e26fd`. The 5 findings are all NIT or MINOR; none warrant a revert or revise. Suggest queuing F1 + F2 + F4 as a single small NIT batch (LOW priority) for a future cleanup pass; F3 + F5 are informational only.

## References

- Origin: `docs/review-257-249-fx3-phase-a-pilot.md` (R1 + R3 권고)
- Subject: commit `ae76fd5` / merge `45e26fd`
- Evidence: `.claude/pair-working/sessions/adhoc-review-270-263-fx3-polish/transfer/evidence.md`
- Peer exchange: `.claude/pair-working/sessions/adhoc-review-270-263-fx3-polish/peer/exchanges/ex_20260503T120124Z_01648c10/`
