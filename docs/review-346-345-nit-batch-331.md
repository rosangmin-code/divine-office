# Review #346 — #345 NIT batch (#331 review 잔여 5 nit/info cleanup)

**Reviewer**: divine-review (adversarial-reviewer profile)
**Target**: commit `db7ff2f` (#345 NIT batch — #331 review 잔여 5 finding cleanup)
**Base**: `a9dc51c` (post-#338 merge)
**Date**: 2026-05-08
**Verdict**: **APPROVED_WITH_ISSUES**
**Stance consensus**: Claude AGREE / Peer (codex `quality_auditor`) AGREE — round 1

---

## AC verdict matrix

| AC | Type | Claude | Peer | Final | Evidence |
|---|---|---|---|---|---|
| AC-1 | structural | PARTIALLY_MET | PARTIALLY_MET | PARTIALLY_MET | `package.json` has no root `engines` field. Practical Node floor enforced by `next@16.2.4` lock (Node ≥20.9 per `package-lock.json:5919-5920`), well above `structuredClone`'s Node 17 requirement. No README minimum-Node statement. |
| AC-2 | semantic | MET | PARTIALLY_MET | MET-with-nit | I-5 dev-warn fires once per call at function entry of `splitMagtuuPhrasesOnCapitalBoundaries` (`scripts/build-hymn-phrases-into-rich.mjs:492-500`); per-phrase warn spam contractually avoided. Peer probe with `phrases=[null,...]` shows the existing for-of body at L505 dereferences `phrase.lineRange` directly — asymmetric defensiveness vs the new guard's `p?.lineRange`, but consistent with the function's pre-existing non-null-phrase contract. |
| AC-3 | structural | MET | MET | MET | Fixture is `«Бид магтан дуулай.»` at `scripts/__tests__/build-hymn-phrases-into-rich.test.mjs:888`; opener `«` (U+00AB) is NOT a Mongolian-Cyrillic lowercase, so Pass B `mergeLowercaseWraps` no-merge intent is preserved. Production `«[А-ЯЁ]…»` shapes exist in `src/data/loth/prayers/commons/psalter-texts.rich.json` and other commons; fixture matches data shape. |
| AC-4 | semantic | MET | MET | MET | Errata states 946 / +9 with breakdown 7 + 2 at `docs/review-331-nit-batch-330.md:120-127`; the test file diff this commit (+4/-2) is fixture-text only, not count-changing. Math reconciles with `npm test` actual = 946. |
| AC-5 | semantic | MET | MET | MET | I-2 comment at `scripts/strip-ordinarium-magtuu-noise.mjs:62-69` accurately states JS `.trim()` removes NBSP (U+00A0) but NOT ZWSP (U+200B). Empirical node probe confirmed: `" ".trim()===""` true; `"​".trim()===""` false. ZWSP follow-up (regex-based guard) acknowledged as deferred option. |
| AC-6 | executable | MET | MET | MET | Builder rerun: `node scripts/build-hymn-phrases-into-rich.mjs --all` → 122 hymns OK / 549 stanzas; `git status -s src/data/loth/prayers/hymns/` empty. byte-identical contract upheld. `structuredClone` of plain-data phrases has no nondeterministic ordering impact. |
| AC-7 | executable | MET | MET | MET | npm test 47 files / 946 tests pass; tsc --noEmit 0 errors; ESLint 0 errors / 17 pre-existing warnings (1 in target file is pre-existing); verify-phrase-coverage 0 violations / 215 stanzas; verify-no-page-noise 0 occurrences. |

Final aggregate: **APPROVED_WITH_ISSUES** (1 PARTIALLY_MET — explicit Node engines floor; 1 MET-with-nit — asymmetric defensiveness in dev-warn guard; 1 nit — stale L527 line-number reference in I-5 comment).

---

## Findings

### F-1 (MINOR / INFO) — `package.json` lacks explicit `engines` field for `structuredClone` floor
- **File**: `package.json` (root)
- **Issue**: `structuredClone()` (introduced in #345 I-3) is a Node 17+ global. The repo has no root `engines` field declaring this floor. Practical safety is currently enforced by `next@16.2.4` lock requiring Node ≥20.9 (`package-lock.json:5919-5920`) — well above 17 — but the contract is implicit, not repo-explicit.
- **Severity**: MINOR / INFO (no runtime risk under current dependency lock).
- **Recommendation**: Add `"engines": {"node": ">=20.9"}` to `package.json` to make the floor self-documenting and to fail-fast on `npm install` if a developer attempts an old Node. **Optional / non-blocking.**

### F-2 (MINOR) — Dev-warn guard's `p?.lineRange` is more defensive than the function body
- **File**: `scripts/build-hymn-phrases-into-rich.mjs:492-500` vs `:504-506`
- **Issue**: The new I-5 dev-warn uses `phrases.some((p) => Array.isArray(p?.lineRange) && p.lineRange[1] > p.lineRange[0])` — defensively handles `null`/`undefined` entries. The pre-existing for-of loop at L505 dereferences `phrase.lineRange` directly without the same guard. Peer adversarial probe with `phrases=[null, {}, {lineRange:[0,1]}]` showed the loop throws `TypeError: Cannot read properties of null` before the guard's optional chaining could matter. The function's contract is "valid phrase array", so this is invalid-input only.
- **Severity**: MINOR (asymmetric defensiveness; not a regression — pre-existing loop behavior was identical before this commit).
- **Recommendation**: Either drop the optional chaining in the new guard for symmetry with the function contract, or add the same defensiveness to the loop body. **Optional / non-blocking.**

### F-3 (NIT) — Stale `L527` line-number reference in I-5 comment
- **File**: `scripts/build-hymn-phrases-into-rich.mjs:482-491` (comment) vs actual position
- **Issue**: The I-5 comment says "the per-phrase safeEnd clamp at L527" — but the new dev-warn block (just inserted by this same patch) shifts the actual `safeEnd` position to L542. The comment was authored AFTER the insertion that moved the line, so the reference was already stale at commit time.
- **Severity**: NIT (cosmetic; line-number comments age poorly regardless).
- **Recommendation**: Either update to "L542" (transient — will re-stale on next edit) or rephrase as "the per-phrase `safeEnd` clamp inside the loop below" (line-number-agnostic, durable). **Optional / non-blocking.**

---

## Adversarial scan — defenses verified

| Vector | Status | Evidence |
|---|---|---|
| `structuredClone` non-clonable types | **Pass** | Phrase shape is plain `{lineRange:[int,int], indent:int, kind?:string}` — all primitive. JSDoc on `clonePhrase` notes "pure data so no clone-incompatible types"; tests exercise both Pass A and Pass B with all 122 hymn fixtures (946 tests pass). |
| `structuredClone` ordering nondeterminism | **Pass** | `git diff` post-rerun is empty across all 122 hymns / 549 stanzas → byte-identical idempotent contract upheld. |
| Mongolian-Cyrillic fixture coverage regression | **Pass** | Old (`«Bid`) and new (`«Бид`) fixtures both lead with `«` (U+00AB), not a Mongolian-Cyrillic lowercase character. `mergeLowercaseWraps` checks the leading char; both produce `mergedCount=0`. Functional equivalence; cosmetic improvement that aligns with production data shape. |
| ZWSP / NBSP `.trim()` claim | **Pass** | Empirical node probe: NBSP-only `.trim()===""` true; ZWSP-only `.trim()===""` false. Comment matches behavior. |
| Errata math (947/+10 → 946/+9) | **Pass** | 7 + 2 = 9; baseline 937 + 9 = 946 = current `npm test` count. |
| Per-phrase warn spam (I-5 design intent) | **Pass** | New warn is at function entry, before the loop — fires AT MOST 1× per call when conditions hit. Production gated by `process.env.NODE_ENV !== 'production'`. |
| SSOT/DRY violations | **None** | Each finding maps to a distinct file/line; no duplicated logic introduced. |
| Build determinism / concurrency | **Pass** | Builder is single-threaded Node script; no shared mutable state across hymns. |

---

## Notes (informational, not blocking)

- **Self-reported stash usage** — the dispatch acknowledged that the solver self-reported `git stash` use during #345. `refs/stash` is repo-global across worktrees; the WIP-commit pattern is the constitutional alternative. Result is verified (byte-identical, all tests pass), so this is informational only — recommend reminder for future cycles.

---

## Verdict rationale (single-round AGREE)

| Dimension | Status |
|---|---|
| Production behavior | Unchanged (byte-identical builder rerun, all 946 tests pass) |
| Documentation accuracy | Improved (errata corrects off-by-1; comment corrects ZWSP claim) |
| Forward compatibility | Improved (`structuredClone` deep-clones future schema fields) |
| Defensive surfacing | Improved (linesLen=0 degenerate case warns once at entry) |
| Test fixture verisimilitude | Improved (fixture matches production data shape) |
| Outstanding issues | 1 MINOR + 1 MINOR + 1 NIT — all bounded to docs/cosmetic, no functional defect |

This batch cleanly closes 5 of 5 finding from #331 review. The 3 residual concerns identified above are each lower-severity than the findings being cleaned up (they are doc-style, not behavioral). Recommend acceptance with no immediate follow-up required; F-1 (engines field) is the most actionable if a future polish batch is opened.

**Final verdict: APPROVED_WITH_ISSUES.**
