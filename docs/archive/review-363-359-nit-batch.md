# Review #363 — #359 NIT batch (#353 review 3 finding cleanup)

**Reviewer**: divine-review (adversarial-reviewer profile)
**Target**: commit `e193e27` — `fix(#359): NIT batch — #353 review 3 finding cleanup`
**Base**: `53c2d0d` (post-#353 merge); merge into main as `40013e1`
**Date**: 2026-05-08
**Verdict**: **APPROVED**
**Stance consensus**: Claude AGREE / Peer (codex `quality_auditor`) AGREE — round 1

---

## AC verdict matrix

| AC | Type | Claude | Peer | Final | Evidence |
|---|---|---|---|---|---|
| AC-1 | executable | MET | MET | MET | `npx vitest run src/lib/hours/resolvers/__tests__/psalm.test.ts` → 24 passed (24), EXIT=0. F-1/F-2 active pins at `psalm.test.ts:506` (override path) and `:556` (Bible-fallback negative pair). |
| AC-2 | executable | MET | MET | MET | `npx vitest run` → 47 files / **952 tests PASS** / 0 FAIL / 5.24s. +1 over 951 baseline. Phase 2/3 anchors regression-zero. |
| AC-3 | structural | MET | MET | MET | F-1 closed: `psalm.test.ts:506` `expect(result.psalmPrayerRich).toBe(SENTINEL_RICH_AST)` replaces `toBeDefined()` — identity pin proves loader-supplied AST surfaces through no-override branch. |
| AC-4 | structural | MET | MET | MET | F-2(a) closed: loader mock at `psalm.test.ts:80-91` adds `'Psalm 200:1-3'` to SENTINEL list. Same ref has empty `stanzas: []` at `:61-65` — `psalmText.stanzas.length > 0` is FALSE → resolver falls through to Bible-fallback at `psalm.ts:102`. |
| AC-5 | structural | MET | MET | MET | F-2(b) closed: NEW negative pair test `:536` "Bible-fallback path surfaces catalog rich when entry.psalmPrayer is absent" asserts `psalmPrayerRich).toBe(SENTINEL_RICH_AST)` at `:556` — distinguishes suppression from natural absence on BOTH return sites. |
| AC-6 | structural | MET | MET | MET | F-3 closed: `psalm.ts:72` (catalog return site) + `:143` (Bible-fallback return site) both use `psalmPrayerOverride != null` (loose-equality). Zero remaining `psalmPrayerOverride !== undefined` (verified via grep). |
| AC-7 | semantic | MET | MET | MET | Symmetric with text-path `??` semantics for `null`/`undefined`/`''`/runtime-`0`. Type `psalmPrayer?: string` at `types.ts:212` excludes `null` at TS layer; defensive `!= null` guards against `JSON.parse` runtime null and future schema drift. Comment at `psalm.ts:65-69` accurately documents the rationale. |
| AC-8 | structural | MET | MET | MET | `git diff --stat 53c2d0d..40013e1`: only `src/lib/hours/resolvers/psalm.ts` (+8/-4) and `src/lib/hours/resolvers/__tests__/psalm.test.ts` (+39/-8). Zero data-file (`.json`) impact. |
| AC-9 | executable | MET | MET | MET | `verify-phrase-coverage`: OK — 215 stanza(s) with phrases, **0 violations**. `verify-no-page-noise`: OK — **0 occurrences**. NFR-009j data integrity unaffected. |

Final aggregate: **APPROVED** (9/9 MET, zero PARTIALLY_MET, zero NOT_MET, zero adversarial findings).

---

## Findings

**None.** All three #353 review-3 findings (F-1, F-2, F-3) closed correctly:

| Source finding | Status | Closure mechanism |
|---|---|---|
| F-1 (MINOR) — W1 negative-pair `toBeDefined()` lacks identity pin | **CLOSED** | `:506` `toBe(SENTINEL_RICH_AST)` |
| F-2 (MINOR) — Bible-fallback test vacuous because loader returns null | **CLOSED** | `:80-91` loader mock SENTINEL for Psalm 200:1-3 + new negative-pair test `:536-558` |
| F-3 (NIT) — `null` runtime asymmetry vs `??` text path | **CLOSED** | `psalm.ts:72` + `:143` `!= null` (loose-equality) on both return sites |

---

## Adversarial scan — defenses verified

| Vector | Status | Evidence |
|---|---|---|
| F-1 identity pin actively proves loader AST surfaces | **Pass** | `psalm.test.ts:499-506` — no-override entry with `psalmPrayer: 'Bible-fallback path Phase 3 override.'` removed. Comment at `:502-505` documents intent. |
| F-2(a) loader mock SENTINEL surfaces fallback path | **Pass** | Existing override-path test `:508-528` `expect(...).toBeUndefined()` would FAIL if suppression branch didn't fire (now that loader returns SENTINEL). Active proof. |
| F-2(b) Bible-fallback negative pair on no-override case | **Pass** | NEW test `:536-558` — entry has no `psalmPrayer` override → `??` falls through → catalog text "Synthetic prayer for fallback path test." surfaces, `!= null` is FALSE → loader rich AST surfaces (asserted to be SENTINEL_RICH_AST). |
| F-3 symmetry across both return sites | **Pass** | `psalm.ts:72` (catalog L66-74) and `:143` (Bible-fallback L138-145) both use identical `psalmPrayerOverride != null ? undefined : (loadPsalterTextPsalmPrayerRich(entry.ref) ?? undefined)` pattern. |
| F-3 edge cases: `null`/`undefined`/`''`/runtime-`0` | **Pass** | `null != null` FALSE → rich surfaces (matches `null ?? catalog`); `undefined != null` FALSE → rich surfaces (matches `undefined ?? catalog`); `'' != null` TRUE → rich suppressed (matches `'' ?? x = ''` override-wins); runtime `0 != null` TRUE → suppressed (matches `0 ?? x = 0`). All four cases symmetric with `??`. |
| Hidden coupling — Psalm 200:1-3 in 4 test entries | **Pass** | L373/L393 older Phase 2 page-fallback tests assert ONLY on `psalmPrayerPage`/`verses.length` — never on `psalmPrayerRich`. Adding SENTINEL to loader mock cannot regress them. L520 (existing Phase 3 override-path) and L544 (NEW negative pair) are the two affected by SENTINEL — both intentionally so. |
| Comment accuracy "TS types disallow but JSON.parse could yield null" | **Pass** | `src/lib/types.ts:212` declares `psalmPrayer?: string` (`string \| undefined`). null is NOT in the type. Comment is accurate. |
| `lookupRef` mock for synthetic Psalm 200 fallback | **Pass** | `psalm.test.ts:99-102` returns synthetic verse for `book === 'psalm' && chapter === 200`. Bible-fallback path produces `verses.length > 0` → tests' `expect(result.verses?.length).toBeGreaterThan(0)` passes, confirming branch entry. |
| Catalog/data zero-churn | **Pass** | `git diff --name-only 53c2d0d..40013e1` lists only `psalm.ts` + `psalm.test.ts`. No `psalter-texts.json` / `.rich.json` / `week-*.json` / hymn / propers mutations. |
| TypeCheck + Lint | **Pass** | `npx tsc --noEmit`: 0 errors, EXIT=0. `npx eslint psalm.ts psalm.test.ts`: 0 errors, EXIT=0. |
| FR-161 phrase coverage | **Pass** | `verify-phrase-coverage`: 215 stanzas / 0 violations. `verify-no-page-noise`: 0 occurrences. Code/test-only change cannot affect phrase data. |

---

## Verdict rationale (single-round AGREE)

| Dimension | Status |
|---|---|
| All 3 #353 review-3 findings closed | F-1 ✓, F-2(a/b) ✓, F-3 ✓ |
| Test observability — vacuous → active | F-1 + F-2 both flip `toBeDefined()` / loader-null vacuity to active SENTINEL identity pin |
| F-3 defensive symmetry | Both return sites converted to `!= null` mirroring `??` text path; runtime null no longer creates asymmetric UX |
| Phase 2/3 regression | Zero (all anchors pass; +1 net new test = 952 total) |
| Schema/data impact | Zero (code/test only) |
| Cross-referenced inline comments | F-3 comments at `psalm.ts:65-69` + `:130-132` document the rationale; F-2 comment at `psalm.test.ts:514-518` documents the active-suppression intent |
| L1 / L2 / L3 cross-review | L1 author = solver; L2 = divine-review (compact, accumulated review knowledge); L3 NIT-batch single-round AGREE per leader hint (LOW complexity, optional per Cross-Review fragment) |

NIT-batch closure is clean: the original three findings have been actively closed (not papered over), test coverage is strengthened (positive + negative pair on BOTH return sites with identity-pinned assertions), and the defensive `!= null` guard improves robustness without behavior change. Single-round AGREE consensus is consistent with the leader's "NIT batch — single-round AGREE 가능" hint.

---

## Recommendation

**APPROVE for merge.** The follow-up findings raised in review #353 are now closed with active test enforcement and a defensive symmetry guard. No further action needed.
