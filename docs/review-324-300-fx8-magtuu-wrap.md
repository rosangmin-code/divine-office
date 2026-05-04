# Review #324 — F-X8 (#300) Магтуу 류 hymn 줄바꿈 규칙

> **TL;DR** — F-X8 cleanly implements the user spec ("대문자=새 절, 소문자 wrap=같은 절,
> 들여쓰기 없음") for all 122 찬미가 via two pure post-process passes
> (`splitMagtuuPhrasesOnCapitalBoundaries`, `mergeLowercaseWraps`) plus a
> parameter-driven renderer flush gate (`RichContent flush?: boolean`).
> 6 / 7 AC MET, AC-5 PARTIALLY_MET (handoff §5 doesn't explicitly address
> F-X7c + F-X7b review-318 follow-up orthogonality). 11 minor/nit/info
> findings, 0 blockers. Pre-validated gates all green: vitest 937 PASS,
> tsc 0 err, lint 0 err, verify-phrase-coverage 0 violations,
> verify-no-page-noise 0 occurrences, builder rerun byte-identical.
> 5 / 5 PDF SSOT spot-checks match (hymns 11 / 1.b4 / 26 / 76 / 118).
>
> **Reviewer**: divine-review (adversarial-reviewer profile)
> **Author**: member-01
> **Subject commit**: `02310352` → main `9e2a572` (117 files, +8366 / -35)
> **Pipeline**: pair-perfect --adhoc (single round, Claude + codex/quality_auditor consensus)
> **Verdict**: **APPROVED_WITH_ISSUES**

---

## 1. Scope

F-X8 implements the user-reported spec from 2026-05-03:

> Магтуу 류 찬미가 의 줄바꿈/들여쓰기 규칙이 일반 hymn 과 다름.
> - 들여쓰기 없음 (no indent)
> - 대문자로 시작하는 line = 새로운 절(verse) 의 시작 — phrase boundary
> - 소문자로 시작하는 line = 같은 절의 wrap continuation — 이전 line 에 이어짐
> - 새 절 다시 시작 = 대문자

The author interprets "Магтуу 류" as **all 122 hymns** (not just titled
"Магтуу"). This is supported by handoff TL;DR ("122 찬미가의 phrase
분해…") and Out-of-scope §5.2 ("F-X8 은 hymn 만 영향. 시편의 hanging
indent 는 R-13 contract 그대로 유지"). The implementation matches that
interpretation: Pass A/B fire unconditionally on every stanza in every
hymn rich.json, and only `hymn-section.tsx` opts into `flush={true}`.

## 2. AC Verdict (consensus: Claude + codex/quality_auditor)

| AC | Type | Verdict | Evidence |
|---|---|---|---|
| **AC-1** | semantic | **MET** | `scripts/build-hymn-phrases-into-rich.mjs:453-499` (Pass A) walks `start+1..end`, splits at non-lowercase boundaries with `carry` inheritance for indent/role; `:516-546` (Pass B) absorbs lowercase-opening phrases into prev. Cyrillic-safe `MONGOLIAN_CYRILLIC_LOWERCASE` Set at `:416-418` (avoids `\b` regex pitfall per `memory/feedback_regex_unicode_boundary.md`). Idempotency claim verified by builder rerun byte-identical (`§4 row "Builder idempotency"`). Refrain inheritance verified by tests at `scripts/__tests__/build-hymn-phrases-into-rich.test.mjs`. |
| **AC-2** | executable | **MET** | `git diff --name-only d95324b..9e2a572 \| grep -v 'hymns/\|test\|docs/\|scripts/'` returns ONLY `hymn-section.tsx` + `rich-content.tsx`. No psalm/responsory/intercession/short-reading/concluding-prayer/canticle/marian rich.json modified. Renderer changes are gated by `flush ?? false` default → R-13 hanging-indent preserved for non-hymn callers. |
| **AC-3** | structural | **MET** | `src/components/hymn-section.tsx:51` is the ONLY caller passing `flush`. 5 other RichContent callers (short-reading-section / responsory-section / intercessions-section / concluding-prayer-section / psalm-block) leave `flush` undefined → default false. `gospel-canticle-section.tsx` opts out of RichContent entirely (visual reasons). |
| **AC-4** | semantic | **MET** | 5 PDF SSOT spot-checks all match: hymn 11 (page 891, b2_layer1 absorbed=1, line 8 "чамд өгье" merged into prior), hymn 1.b4 (page 913→914 cross-stanza wrap, lowercase preserved as documented limitation), hymn 26 (page 900, 4-line all-capital pure split), hymn 76 (page 933, refrain with 2 wraps absorbed into right phrases), hymn 118 (page 960, b2_layer1 absorbed=2 — "би даган явъя" / "би зогсон хүлээе" wraps merged). |
| **AC-5** | semantic | **PARTIALLY_MET** | Handoff §5 explicitly documents (a) cross-stanza wrap (1.b4 / 44.b4), (b) plain-text alt-pick path (F-X7b scope), (c) non-hymn regions (psalm/responsory/intercession/short-reading) preserved. **However**, F-X7c (3 hymns 41/45/111 page-break stanza-drift) and F-X7b review-318 follow-up F-1 (whitespace-blank), F-2 (positive fixture), F-3 (comment-vs-code) are NOT mentioned in handoff §5. Verified hymn 41 rich.json: stanza-drift (block[0]=1-line "1. Есүс мандан ирсэн" + block[2]=3-line body) is pre-existing — F-X8 didn't fix nor regress it. F-1/F-2/F-3 target a different script (`strip-ordinarium-magtuu-noise.mjs`), so orthogonal but should be acknowledged for traceability. |
| **AC-6** | executable | **MET** | All gates green: vitest 47 files / 937 tests PASS (+21 new vs 916 baseline), tsc 0 errors, ESLint 0 errors / 16 pre-existing warnings, verify-phrase-coverage 0 violations on 215 stanzas, verify-no-page-noise 0 occurrences across rich + plain-text paths, builder `--all` rerun produces byte-identical output (idempotency confirmed via `git status` clean post-rerun). |
| **AC-7** | semantic | **MET** | `phraseHangingIndentClass(level, flush=false)` at `rich-content.tsx:34-47` is a parameter-driven ternary (no section-type detection). `RichContent` types `flush?: boolean` as optional (`:449`); legacy mode forwards `flush ?? false` at `:480` so `undefined` → false. Default branch returns `pl-6 -indent-6` (R-13) — no silent regression. |

Stance summary:
- **Claude (general-purpose adversarial Agent)**: AGREE → APPROVED_WITH_ISSUES
- **Peer (codex / quality_auditor relay, single round)**: APPROVED_WITH_ISSUES
- **Consensus** (`pair-cli consensus check`): `outcome: consensus`, round 1 / max 3

## 3. Adversarial findings (union)

11 unique findings across two evaluators. **0 critical, 0 major**. All
minor/nit/info — none block merge.

| ID | Severity | Category | File:Line | Description |
|----|----------|----------|-----------|-------------|
| **F-1** | minor | doc | `docs/handoff-fx8-magtuu-wrap-rule.md:135-146` | Handoff §5 omits F-X7c (41/45/111) and F-X7b review-318 follow-up F-1/F-2/F-3 orthogonality assessment. They are about a different script and pre-existing structural issues, but their absence weakens traceability. (drives AC-5 PARTIALLY_MET) |
| **F-2** | minor | design | `src/components/prayer-sections/rich-content.tsx:446-448, 480` | Renderer footgun: `flush` is silently ignored when `flow !== undefined`. JSDoc explains, but no compile-time guard or runtime warning. No current caller hits this combo, but the type signature does not enforce mutual exclusion. |
| **F-3** | minor | bug | `scripts/build-hymn-phrases-into-rich.mjs:528-540` | Pass B reads `cur.lineRange[1]` without bounds check. Defensive guard at `:528-531` only validates `firstLineIdx = cur.lineRange?.[0]` (number), not `cur.lineRange[1]`. Malformed `[N]` (length-1) input would produce `[prev.start, undefined]`. Production planner output is well-formed so unreachable in practice. |
| **F-4** | minor | bug | `scripts/build-hymn-phrases-into-rich.mjs:469` | Pass A handles `start > end` (truly malformed) identically to `start === end` (single-line) via `if (start >= end)`. No diagnostic emitted. Production never produces this, but an asymmetric handling vs. line 481 `for (i = start+1; i <= end; i++)` (which would simply not iterate) would also silently mask. |
| **F-5** | minor | bug | `scripts/build-hymn-phrases-into-rich.mjs:471, 519` | Pass A/B pass-through via `out.push({ ...phrase })` shallow-clones, but inner `lineRange` array reference is shared with input. Pass A/B themselves never mutate `lineRange[i]` in place (line 539 reassigns to a fresh array), so claim of purity is preserved IF callers don't index-mutate. Tests check JSON.stringify equality (snapshot), not reference identity. |
| **F-6** | minor | design | `scripts/build-hymn-phrases-into-rich.mjs:539-543` | Pass B drops absorbed phrase's role/indent (only prev's metadata survives). Documented at `:504-506`. Practical impact: low — current planners assign role uniformly per stanza. But no test pins this contract for the case `prev.role !== cur.role`. |
| **F-7** | minor | test | `scripts/__tests__/build-hymn-phrases-into-rich.test.mjs` | Coverage gaps: (a) multi-line phrase whose first line opens lowercase (cross-stanza wrap inside a single phrase), (b) malformed range start>end, (c) `prev.role !== cur.role` absorption contract pinning, (d) negative test for non-Cyrillic-Mongolian lowercase (Latin 'a', digit, punct). |
| **F-8** | nit | design | `scripts/build-hymn-phrases-into-rich.mjs:482` | `lines[i] \|\| {}` defensively absorbs out-of-range indices via `joinedLineText({}) → ''`. Masks malformed end values past `lines.length` instead of asserting. |
| **F-9** | nit | doc | `scripts/build-hymn-phrases-into-rich.mjs:416-418` | `MONGOLIAN_CYRILLIC_LOWERCASE` set spec ('абвгдеёжзийклмнопрстуфхцчшщъыьэюяөү') happens to cover full Russian + Mongolian-specific ө/ү. A code comment clarifying the Russian-superset choice would aid future maintainers. |
| **F-10** | nit | doc | `scripts/build-hymn-phrases-into-rich.mjs:578-580` | Comment claims Pass A/B are "commutative wrt the final phrase-count on production hymn data (verified by the unit tests)", but no test runs them in reverse order. Code does not depend on commutativity (order is hard-coded A→B), so the comment slightly overstates what's tested. |
| **F-11** | info | design | `scripts/build-hymn-phrases-into-rich.mjs:582-587` | Pass order hard-coded A→B. Correctness does not depend on commutativity — code is robust if planner contract changes. (peer-only INFO observation) |

## 4. Pipeline evidence

- **Pre-validation gates** (Step 2 evidence supply, all green):
  - `npm test` → 47 files / 937 tests PASS (was 916 baseline; +21 new from F-X8)
  - `npx tsc --noEmit` → 0 errors
  - `npm run lint` → 0 errors / 16 pre-existing warnings
  - `node scripts/verify-phrase-coverage.js` → 0 violations / 215 stanzas inspected
  - `node scripts/verify-no-page-noise.js` → 0 occurrences (rich + plain-text)
  - `node scripts/build-hymn-phrases-into-rich.mjs --all` → byte-identical (idempotent)
- **PDF SSOT spot-check** (5 hymns × different decision categories):
  - hymn 11 (b2_layer1, wrap merged) ✓
  - hymn 1.b4 (cross-stanza wrap edge case, documented limitation) ✓
  - hymn 26 (a2_terminator-equivalent, all-capital) ✓
  - hymn 76 (a2_refrain, role propagation across split + 2 wraps) ✓
  - hymn 118 (b2_layer1, 2 absorbed wraps "би даган явъя" / "би зогсон хүлээе") ✓

## 5. Test method transparency

| AC | Test Level | Method | Actual Command | What Was Asserted | Limitation |
|----|-----------|--------|----------------|-------------------|------------|
| AC-1 | L3 (Unit) | source read + Pass A/B trace + unit tests | Read `build-hymn-phrases-into-rich.mjs:453-546` + `build-hymn-phrases-into-rich.test.mjs` | Pure-function claim, role/indent inheritance, idempotency | static read; no fuzz of pathological inputs |
| AC-2 | L4 (Manual) | git diff scope check | `git diff --name-only d95324b..9e2a572 \| grep -v hymns/` | only renderer files, no other rich.json data modified | structural check, doesn't verify byte-identity of every non-hymn rich.json (would require explicit byte-compare) |
| AC-3 | L4 (Manual) | grep + read | `grep -rn 'RichContent' src/components/` + `grep -n 'flush' rich-content.tsx hymn-section.tsx` | only hymn-section passes flush; renderer default flush=false preserves R-13 | static; doesn't run a render |
| AC-4 | L4 (Manual) | PDF spot-check + JSON load | Python json + `grep -n` PDF reference for 5 hymns | phrase ranges + line texts match PDF column wraps | sample of 5 / 111 modified hymns; risk of unsampled regressions |
| AC-5 | L4 (Manual) | doc read | Read `handoff-fx8-magtuu-wrap-rule.md` + `review-318-...md` | enumerate documented limitations vs review-318 follow-up cohort | qualitative judgment on "should be documented for traceability" |
| AC-6 | L1 (E2E) | full vitest + tsc + lint subprocess | `npm test 2>&1 \| tee /tmp/test-out-324.log` etc. | 937/0, 0 err, 0 violations | jsdom only, no playwright |
| AC-7 | L3 (Unit) | source read + flush prop test | Read `rich-content.tsx:34-47, 449, 480` + `rich-content-flow.test.ts` | parameter-driven gate, undefined → false default | static; relies on test coverage for runtime behavior |

`pair-cli verify-level` not invoked (single-reviewer adversarial pipeline; methods match claimed levels — no DOWNGRADE candidates).

## 6. Recommended follow-up tasks (NOT blocking)

Per author + reviewer agreement, the following are explicitly **out-of-scope
for #300 / #324** but should be tracked separately:

1. **F-1 (MINOR — handoff §5 traceability addendum)** — Add 1-2 sentence
   note to `docs/handoff-fx8-magtuu-wrap-rule.md` §5 explicitly stating
   F-X7c (41/45/111 page-break stanza-drift) and F-X7b review-318
   follow-up F-1/F-2/F-3 are orthogonal to F-X8 scope. Cosmetic but
   improves downstream review coherence. (next NIT batch)
2. **F-2 (MINOR — flush + flow guard)** — Add either runtime warning
   (`if (flush && flow) console.warn(...)`) in dev mode OR refactor
   `RichContent` props as discriminated union to make `flush` and
   `flow` mutually exclusive at the type level. Preventive.
3. **F-3 + F-4 + F-8 (MINOR — defensive input validation)** — Tighten
   Pass A/B input validation: assert `lineRange.length === 2` AND
   `start <= end` AND `end < lines.length`, fail loud on planner
   violation rather than silently passing through. Could be a 1-task
   defensive batch.
4. **F-7 (MINOR — test coverage)** — Add 4 missing unit tests:
   (a) multi-line input phrase opening lowercase, (b) malformed range,
   (c) `prev.role !== cur.role` absorption pinning, (d) Latin/digit/punct
   negative test.
5. **F-X7c follow-up** — Page-break stanza-drift fix for hymns 41 / 45 / 111
   (separate task already known).
6. **F-X7b review-318 follow-up F-1/F-2/F-3** — `strip-ordinarium-magtuu-noise.mjs`
   whitespace-blank handling + positive fixture + comment-vs-code
   (separate task, F-X7b cohort).

**No revise required for #300 / #324 itself** — F-X8 is correctly scoped,
matches user spec, all gates green, 5 / 5 PDF spot-checks match. The 11
findings are improvement opportunities for future iterations, not
defects in the current delivery.

## 7. Decision

**APPROVED_WITH_ISSUES** — F-X8 may merge to main as-is. The 11 minor/nit/info
findings are cataloged here for follow-up and do not block the Магтуу
wrap-rule rollout. AC-5 PARTIALLY_MET status reflects a documentation
traceability gap, not a functional defect.

---

**Author**: divine-review
**Date**: 2026-05-04
**Pipeline**: pair-perfect --adhoc, single round, Claude + codex/quality_auditor consensus
**Status**: completed
