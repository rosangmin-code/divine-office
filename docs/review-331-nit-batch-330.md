# Review #331 — #330 NIT batch (F-X7b/X8 13 findings cleanup)

**Reviewer**: divine-review (adversarial-reviewer profile)
**Target**: commit 03a1f9c (#330 NIT batch — F-X8 review-324 10 + F-X7b review-318 3)
**Base**: 1aab618 (post-#324 merge); merge commit 8150202c
**Date**: 2026-05-04
**Verdict**: **APPROVED_WITH_ISSUES**
**Stance consensus**: Claude AGREE / Peer (codex quality_auditor) AGREE — round 1

---

## AC verdict matrix

| AC | Type | Claude | Peer | Final | Evidence |
|---|---|---|---|---|---|
| AC-1 | executable | MET | PARTIALLY_MET | PARTIALLY_MET | npm test 47 files / 946 tests pass; commit msg claims 947 + "+10 신규" — actual +9 (off-by-1, doc-only) |
| AC-2 | executable | MET | MET | MET | tsc --noEmit EXIT=0, 0 errors |
| AC-3 | executable | MET | MET | MET | ESLint 0 errors, 2 pre-existing warnings (matches commit claim) |
| AC-4 | executable | MET | MET | MET | verify-no-page-noise OK — 0 occurrences both paths |
| AC-5 | executable | MET | MET | MET | verify-phrase-coverage OK — 215 stanzas / 0 violations |
| AC-6 | executable | MET | MET | MET | builder rerun → empty git diff (122 hymn rich.json byte-identical) |
| AC-7 | structural | MET | MET | MET | All 13 findings have identifiable artifacts (see commit-330.patch) |
| AC-8 | semantic | MET | MET | MET | rich-content.tsx F-2 guard is dev-only console.warn; no JSX path change |
| AC-9 | semantic | MET | PARTIALLY_MET | PARTIALLY_MET | strip-ordinarium-magtuu-noise.mjs L62-65 comment claims ZWSP coverage but JS `trim()` does NOT remove U+200B |
| AC-10 | semantic | MET | PARTIALLY_MET | PARTIALLY_MET | 9 new tests ADEQUATE / no AP-1..AP-6; commit-msg "+10" off-by-1 |

Final aggregate: **APPROVED_WITH_ISSUES** (3 PARTIALLY_MET, all NIT/INFO severity, no functional defect).

---

## Findings

### F-1 (INFO) — Commit message test-count off-by-1
- **File**: commit message of `03a1f9c`
- **Claim**: "47 files / 947 tests PASS (937 baseline + 10 신규)"
- **Actual** (per `npm test` evidence): 47 files / **946 tests**, +**9** new tests in diff:
  - `scripts/__tests__/build-hymn-phrases-into-rich.test.mjs`: F-7a (1) + F-7b (1) + F-6/F-7c (2) + F-7d (3) = **7 new**
  - `src/lib/__tests__/data/hymn-page-noise.test.ts`: F-X7b F-2 positive + negative = **2 new**
- **Severity**: INFO. Documentation accuracy only — no code/data/test impact.
- **Recommendation**: Acknowledge in next NIT batch or amend follow-up note in `docs/handoff-fx8-magtuu-wrap-rule.md`.

### F-2 (INFO) — `strip-ordinarium-magtuu-noise.mjs` ZWSP claim overstated
- **File**: `scripts/strip-ordinarium-magtuu-noise.mjs:62-65`
- **Issue**: Comment states `whitespace-only / NBSP-only / ZWSP-only 라인도 blank 으로 인식`. Verified: JavaScript `String.prototype.trim()` removes U+00A0 (NBSP, category Zs) but does **NOT** remove U+200B (ZWSP, category Cf) — `'​'.trim().length === 1`.
- **Functional impact**: None on current data (no ZWSP present). The defensive widening ACTUALLY catches NBSP and other Unicode whitespace (Zs); the ZWSP claim is doc-only.
- **Severity**: INFO. Comment overstates defensive coverage.
- **Recommendation** (if pursued in next batch): either narrow the comment to NBSP+whitespace, or replace the test with a regex that includes ZWSP/ZWNJ/BOM (e.g. `/^[\s​-‍﻿]*$/`) for true coverage.

### F-3 (NIT) — `clonePhrase` shallow on non-lineRange fields
- **File**: `scripts/build-hymn-phrases-into-rich.mjs:469-474`
- **Observation**: `clonePhrase` deep-clones only `lineRange` (the single mutable Array field). Other phrase fields today are primitives (`indent: number`, `role?: string`) so shallow spread is sufficient.
- **Risk**: If a future planner adds a nested mutable field (e.g. `meta: {...}`), input-array immutability would silently regress.
- **Severity**: NIT (latent / forward-compat). Not blocking — current planners are primitive-only.
- **Recommendation**: Add a comment near `clonePhrase` documenting the assumption, or use structured cloning when fields grow.

### F-4 (NIT) — F-7d punctuation test uses Latin transliteration
- **File**: `scripts/__tests__/build-hymn-phrases-into-rich.test.mjs:886-894`
- **Observation**: F-7d punctuation test fixture is `«Bid magtan dulai.»` (Latin body) instead of Mongolian-Cyrillic. The leading `«` is non-letter so the contract assertion holds, but the choice of Latin body characters in a Mongolian-Cyrillic-context test mildly muddies intent.
- **Severity**: NIT (cosmetic).

### F-5 (INFO) — `safeEnd` floor uses `start` (intentional, but obscure)
- **File**: `scripts/build-hymn-phrases-into-rich.mjs:524`
- **Observation**: `safeEnd = Math.min(end, Math.max(linesLen - 1, start))`. When `linesLen === 0`, the floor collapses to `start`, so iteration `i = start+1; i <= start` is empty and tail emits `[start, start]` — degenerate but coherent.
- **Severity**: INFO. Defensive; flagged by F-3/F-8 dev-warn upstream so any planner mismatch is surfaced.

---

## Adversarial 6-axis scan summary

| Axis | Result |
|---|---|
| Edge cases / boundary | F-3 lineRange[1] guard sound; F-4 start>end + start===end split correct; F-8 safeEnd clamp degenerate-safe |
| Error paths | dev-warn never reaches prod (`NODE_ENV !== 'production'` gate); pass-through preserves no-crash |
| Race conditions | N/A (synchronous build script, sync renderer guard) |
| Input validation | F-X7b F-1 isBlank widening correct under `whitespace-pre-line` CSS; F-9 superset claim verified (set ⊃ Russian lowercase + ё + ъ ы ь + ө ү); ZWSP comment overstated (F-2) |
| Off-by-one | F-3 `typeof` guards prevent undefined arithmetic; iteration ranges fence-post correct |
| Resource leaks / cleanup | clonePhrase deep-clones `lineRange`; primitives sufficient via shallow spread; F-3 latent doc gap |

No critical/major defects.

---

## Anti-pattern scan (AP-1..AP-6)

| AP | Detection | Result |
|---|---|---|
| AP-1 `d.get(.., True)` default | Grep new tests | **CLEAN** |
| AP-2 `\|\| true` exit-code swallow | Grep build/test diffs | **CLEAN** |
| AP-3 triple-fallback-PASS | Manual: every code path → PASS | **CLEAN** |
| AP-4 `else: pass`/`else: ok` | Grep | **CLEAN** |
| AP-5 JSON-valid-only assertions | Test field-level audit | **CLEAN** (toEqual structural + numeric counts) |
| AP-6 `not get('error')` proxy | Grep | **CLEAN** |

All 9 new tests are ADEQUATE per behavioral coverage protocol (positive + negative + field-level structural).

---

## Recommendations

- **PARTIALLY_MET items above (F-1, F-2)** are doc-only NITs. Acceptable for merge as-is given LOW-priority NIT-batch scope. Track for next NIT cleanup if accumulating.
- **NIT items (F-3, F-4)** are cosmetic / forward-compat; defer.
- **No re-work blocking required**.

## Stance summary

```json
{
  "stance": "APPROVED_WITH_ISSUES",
  "rationale": "All 6 executable AC PASS. 13 claimed findings have identifiable artifacts. Adversarial 6-axis scan + AP-1..AP-6 scan both clean. Two doc-accuracy NITs (test-count off-by-1, ZWSP claim overstated) flagged as INFO; no functional or data impact.",
  "confidence": "HIGH"
}
```

---

## Errata (added by #345 NIT cleanup batch)

**F-1 / I-1 — Commit 03a1f9c message off-by-1 — accepted as immutable**

The commit message of `03a1f9c` claims `47 files / 947 tests PASS (937 baseline + 10 신규)`.
Verified actual count from `npm test` evidence: **47 files / 946 tests PASS, +9 new tests** (not +10).
Per-file breakdown:

- `scripts/__tests__/build-hymn-phrases-into-rich.test.mjs` — F-7a (1) + F-7b (1) + F-6/F-7c (2) + F-7d (3) = **7 new**
- `src/lib/__tests__/data/hymn-page-noise.test.ts` — F-X7b F-2 positive + negative = **2 new**

**Decision**: defer. Commit history is immutable; rewriting (force-push, amend) is more invasive than the doc-accuracy benefit warrants. This errata note is the canonical source of truth for the actual count. No action required from downstream consumers.

**F-2 / I-2 — strip-ordinarium-magtuu-noise.mjs comment overstated** — fixed in #345 (this batch). Comment now accurately documents that JS `.trim()` handles NBSP (U+00A0) but NOT ZWSP (U+200B); current ordinarium data has neither, so behavioral effect is 0.

**F-3 / I-3 — clonePhrase forward-compat** — fixed in #345 (this batch). Replaced manual `lineRange` deep-clone with `structuredClone()` (Node 17+) for forward-compat against future schema growth.

**F-4 / I-4 — F-7d test fixture Latin → Cyrillic** — fixed in #345 (this batch). Test fixture switched to verbatim Mongolian-Cyrillic «Бид магтан дуулай.» to match production data shape.

**F-5 / I-5 — splitMagtuuPhrasesOnCapitalBoundaries linesLen=0 explicit guard** — fixed in #345 (this batch). One-time dev warning at function entry surfaces the degenerate case (empty lines + multi-line phrases) without spamming per-phrase warnings deeper in the loop.
