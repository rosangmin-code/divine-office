# Review #353 — #352 F-X2 Phase 3 fix (psalmPrayer override, Option A + R-1)

**Reviewer**: divine-review (adversarial-reviewer profile)
**Target**: commit `e3b096e` (F-X2 Phase 3 — psalmPrayer text override, Option A + R-1)
**Base**: `1254f0a` (post-#346 merge)
**Date**: 2026-05-08
**Verdict**: **APPROVED_WITH_ISSUES**
**Stance consensus**: Claude AGREE / Peer (codex `quality_auditor`) AGREE — round 1

---

## AC verdict matrix

| AC | Type | Claude | Peer | Final | Evidence |
|---|---|---|---|---|---|
| AC-1 | semantic | MET | MET | MET | R-1 suppression at both return sites — `psalm.ts:65-69` (catalog) and `psalm.ts:125+134-137` (Bible-fallback). Symmetric ternary `override !== undefined ? undefined : load(...)`. Edge note (peer): `null` would be asymmetric (`null !== undefined` suppresses rich, but `null ?? catalog` falls back to catalog text) — types disallow but no runtime guard. |
| AC-2 | semantic | MET | MET | MET | PDF SSOT verbatim verified for 3 occurrences. W2 Psalm 110 = PDF L6241-6247 → `week-2.json:107`. W3 Psalm 100 = PDF L13110-13117 → `week-3.json:868`. W4 Psalm 147 = PDF L17088-17092 + L17100-17104 → `week-4.json:873` (page-marker noise L17094-17099 correctly omitted across page-break 493→494). |
| AC-3 | executable | MET | MET | MET | Phase 2 anchors (Psalm 92, 51 W2/W3/W4) all pass; W1-Psalm-110 no-override negative case passes (catalog default 69 retained). 23 resolver-suite tests + 951 full-suite tests all PASS. |
| AC-4 | structural | MET | MET | MET | `PsalmEntry.psalmPrayer?: string` at `types.ts:212` mirrors `psalmPrayerPage?: number` at `:198`. JSDoc cross-references Phase 2 shape and R-1 strategy. AssembledPsalm propagation already declared (`:679-681`). |
| AC-5 | semantic | PARTIALLY_MET | PARTIALLY_MET | PARTIALLY_MET | Positive tests (`psalm.test.ts:421/441/459`) pin exact text + page + rich-suppression — ADEQUATE. **F-1 (MINOR)**: negative pair (`:496`) uses `toBeDefined()` instead of `toBe(SENTINEL_RICH_AST)` — doesn't pin identity. **F-2 (MINOR)**: Bible-fallback Phase 3 test (`:521`) uses Psalm 200 where loader mock returns `null` — suppression branch and no-override branch both yield `undefined`, so the `expect(...).toBeUndefined()` passes vacuously, not observably proving R-1 on the fallback path. |
| AC-6 | executable | MET | MET | MET | `git diff 1254f0a..e3b096e --name-only` shows only `week-{2,3,4}.json` modified in psalter/. `psalter-texts.json` and `psalter-texts.rich.json` UNCHANGED. R-1 invariant upheld. |
| AC-7 | executable | MET | MET | MET | `psalter-texts.rich.json` inspection: Psalm 110 / 100 / 147 have `psalmPrayerRich.blocks` (1, 1, 7) but ZERO `phrases` field on any block. Suppression delta is FR-161-zero. `verify-phrase-coverage.js` 215/0 unchanged. Plain-text fallback at `psalm-block.tsx:188-196` covers UX. |
| AC-8 | executable | MET | MET | MET | `npm test`: 47 files / **951 tests PASS** / 0 FAIL / 5.05s. `npx tsc --noEmit`: 0 errors. `npm run lint`: 0 errors / 17 pre-existing warnings. `verify-phrase-coverage` 215/0. `verify-no-page-noise` 0/0. `verify-psalter-pages` agree=157, verified-correction=4, manual-review=1, part-II-skipped=6 (baseline). `audit-fx2-phase2-pages` rows 1/8/15 page-✓, prayer-text-DIFFERS (intentional per R-1). |

Final aggregate: **APPROVED_WITH_ISSUES** (1 PARTIALLY_MET — test-observability gaps; 2 MINOR + 1 NIT findings; zero NOT_MET).

---

## Findings

### F-1 (MINOR) — W1 negative-pair test does not pin SENTINEL_RICH_AST identity
- **File**: `src/lib/hours/resolvers/__tests__/psalm.test.ts:496`
- **Issue**: The negative pair test for Psalm 110 W1 (no override) asserts `expect(result.psalmPrayerRich).toBeDefined()` — this only verifies the value is not `undefined`, not that it equals the loader-supplied `SENTINEL_RICH_AST`. The loader mock at `:80-85` returns SENTINEL for this ref, so the test COULD pin `toBe(SENTINEL_RICH_AST)` or `toEqual(SENTINEL_RICH_AST)` to actively prove the no-override branch surfaces the catalog AST.
- **Severity**: MINOR. Implementation IS correct; the test merely under-verifies. The 3 positive tests collectively exercise the suppression branch, so the invariant holds — but the negative pair claim "proves the previous tests' `undefined` is the suppression branch rather than vacuous absence" is weaker than written.
- **Recommendation**: Strengthen to `expect(result.psalmPrayerRich).toBe(SENTINEL_RICH_AST)`. **Optional / non-blocking.**

### F-2 (MINOR) — Bible-fallback Phase 3 test does not observably prove R-1 on the fallback path
- **File**: `src/lib/hours/resolvers/__tests__/psalm.test.ts:521`
- **Issue**: The test uses synthetic `Psalm 200:1-3` to exercise the Bible-fallback return site. The loader mock at `:80-85` returns `null` (not SENTINEL) for this ref. Result: both the suppression branch AND the no-override branch produce `result.psalmPrayerRich === undefined` — so `expect(result.psalmPrayerRich).toBeUndefined()` passes regardless of which branch ran. The R-1 invariant on the fallback path is not observably tested. The in-line comment at `:518-520` partly acknowledges this ("the loader mock returns null anyway, but the assertion still pins the suppression contract for future loader-side changes") — but this is documentation, not enforcement.
- **Severity**: MINOR. Implementation at `psalm.ts:134-137` mirrors the catalog path correctly (verified by code reading), but the dispatch claim "Bible-fallback parity assertion" is stronger than the test enforces.
- **Recommendation**: Either (a) make the loader mock return SENTINEL for `Psalm 200:1-3`, or (b) add a Phase 3 negative pair on the fallback path (Psalm 200 with no override + loader returning SENTINEL → assert `toBe(SENTINEL_RICH_AST)`), then with-override → assert `toBeUndefined()`. **Optional / non-blocking.**

### F-3 (NIT) — `null` runtime asymmetry vs `undefined`
- **File**: `src/lib/hours/resolvers/psalm.ts:65-69` (and `:125+134-137`)
- **Issue**: Suppression uses `psalmPrayerOverride !== undefined ? undefined : load(...)`. Text uses `psalmPrayerOverride ?? psalmText.psalmPrayer`. If `entry.psalmPrayer === null` ever appears at runtime (TypeScript types prohibit but JSON.parse could yield `null` if a future entry literally writes `"psalmPrayer": null`):
  - `null !== undefined` → suppression triggers (rich → `undefined`)
  - `null ?? catalog` → catalog text emitted
  - Result: catalog text WITHOUT catalog rich AST. Mismatched UX vs intended R-1 behavior.
- **Severity**: NIT. Types disallow this and no current data writes `null`. Defensive guard would add complexity for an unenforced edge case.
- **Recommendation**: Either tighten to `psalmPrayerOverride != null ? undefined : load(...)` (loose-equality covers both `null` and `undefined`), or add a JSON schema guard. **Optional / non-blocking.**

---

## Adversarial scan — defenses verified

| Vector | Status | Evidence |
|---|---|---|
| R-1 suppression both return sites | **Pass** | psalm.ts:65-69 (catalog), :125+134-137 (Bible-fallback) — identical ternary pattern. |
| PDF SSOT verbatim 3 occurrences | **Pass** | parsed_data L6240-6247 / L13109-13117 / L17087-17104 vs week-{2,3,4}.json byte-equality verified, including W4 page-break (493→494) noise omission. |
| Phase 2 (#224) regression | **Pass** | All Phase 2 anchors continue to pass (15 occurrences across 11 keys). psalmPrayerPage and psalmPrayer are independent ?? chains; no combinatorial collision. |
| Schema mirror | **Pass** | types.ts:198 vs :212 — same shape (optional, scalar, occurrence-bound, JSDoc-cross-referenced). |
| Test design (positive + negative + field-level) | **Partial Pass** | Positive tests ADEQUATE. Negative pair (F-1) and fallback parity (F-2) under-verify (see findings). |
| Catalog zero-churn | **Pass** | psalter-texts.json + psalter-texts.rich.json UNCHANGED (`git diff` empty). Resolver reads, never mutates. |
| FR-161 phrase-coverage net-zero | **Pass** | 3 affected refs have NO phrase entries on psalmPrayerRich blocks. `verify-phrase-coverage` 215/0 unchanged. Plain fallback at psalm-block.tsx:188-196 covers UX. |
| `null` vs `undefined` asymmetry | **Edge** | F-3 documented; types disallow but no runtime guard. |
| SSOT/DRY/coupling | **Pass** | Override path is occurrence-bound (week-N.json), catalog default unchanged — clean separation. No shared mutable state. |

---

## Verdict rationale (single-round AGREE)

| Dimension | Status |
|---|---|
| Production behavior — 3 emergent occurrences | Now correctly emit PDF-verbatim text on PDF page (186/380/493). Renders via plain-text path. |
| Production behavior — non-Phase-3 occurrences | Catalog default unchanged (W1-Psalm-110, W3/W4-Psalm-110-vespers, W1-Psalm-100-lauds, W2-Psalm-147-lauds verified). |
| Phase 2 regression | Zero (all anchors pass). |
| Schema additivity | Optional field; no impact on existing entries. |
| Test coverage | 5 Phase 3 anchors + 2 fallback parity tests, all green; 2 MINOR observability gaps. |
| Catalog mutation risk | Zero (R-1 invariant). |
| FR-161 impact | Zero (no phrase coverage on affected refs). |
| Outstanding issues | 2 MINOR + 1 NIT — all bounded to test/edge-case hardening, no functional defect. |

This batch closes Phase 3 of F-X2 (psalmPrayer text+page mismatch). The implementation faithfully follows the audit (#344) R2 peer-locked R-1 strategy. The 2 MINOR findings concern test observability (negative pair identity assertion + fallback parity proof) — implementation behavior is verified correct via code reading and full test suite, but the test claims are stronger than the assertions enforce. The NIT is a defensive edge-case for an explicitly-disallowed type state.

Recommend acceptance. F-1 and F-2 are the highest-value follow-ups if a future polish batch is opened (low cost, would tighten the regression net for any future loader-side change).

**Final verdict: APPROVED_WITH_ISSUES.**
