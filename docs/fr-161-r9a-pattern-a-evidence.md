# FR-161 R-9.A — pattern A handler evidence (refrain interpolation, multi-candidate trial-align)

> **TL;DR** — A handler upgrades `findRichStart`'s linear-first-match to **multi-candidate trial alignment** + extends multi-page expansion to ALWAYS retry on alignment failure. Total injected coverage: **90 refs / 202 stanzas** (R-9.D 87/197 → **+3 refs / +5 stanzas**), driven by **Daniel 3:57-88, 56** (44-rep canticle stress test) + 3 newly-RECONCILABLE refs (Psalm 48 / Psalm 46 / week-4 ref). R-6 verifier 0 violations across 202 stanzas. All 647 vitest tests pass.

@fr FR-161-R9A (task #183)
base: 51296c8 feat(fr-161): R-9.D pattern handler — mid-stream drift / multi-page (task #182)

---

## 1. Aggregate before / after

| Metric | After R-9.D | After R-9.A | Net |
|--------|-------------|-------------|-----|
| Refs covered | 87 | **90** | +3 |
| Stanzas with phrases | 197 | **202** | +5 |
| Per-week NO_SPLITS_NEEDED (w1/w2/w3/w4) | 29/26/23/21 = 99 | **32/29/25/24 = 110** | +11 |
| R-6 verifier violations | 0 | **0** | — |
| Vitest baseline | 647/647 | **647/647** | — |

Aggregate corpus coverage (refs at least 1 phrases array): 90/125 = **72%** of all rich.json psalter entries.

---

## 2. Pattern A — what surfaced beyond the R-8 hypothesis

R-8's evidence document hypothesised Pattern A as **"rich.json spells out
repeated refrains; PDF prints refrain once with implicit/visual
repetition cue"**. Investigation against the canonical case (Daniel 3:57-88,
56 — 44-rep cosmic-praise canticle) revealed a **different** root cause:

- The PDF actually emits each refrain LITERALLY (44 instances of
  "Эзэнийг магтагтун." appear in the extractor stream).
- The trap was a **PDF "header preview" line**: the PDF prints a
  combined first-line+refrain teaser at the start of the canticle
  (ext[12] = "Эзэний хамаг бүтээлүүд ээ, Эзэнийг магтагтун") BEFORE
  the body proper begins (ext[15] onward).
- Legacy `findRichStart` returned the FIRST prefix-12 match — ext[12]
  — and `align()` then bailed at rich.line[1] because ext[13] is
  unrelated commentary, not the second body line.

**Diagnostic example (Daniel 3:57-88, 56)**:
```
ext[11]: Магтаал                            Даниел 3:57-88, 56
ext[12]: Эзэний хамаг бүтээлүүд ээ, Эзэнийг магтагтун   ← header preview (joined!)
ext[13]: Эзэний бүх боолууд аа, Түүндээ магтаалыг        ← commentary
ext[14]: өргөгтүн (Илчлэл 19:5).                         ← commentary
ext[15]: Эзэний хамаг бүтээлүүд ээ,                       ← BODY START (rich line 0)
ext[16]: Эзэнийг магтагтун.                               ← rich line 1
ext[17]: Түүнийг магтаж,                                  ← rich line 2
ext[18]: бүгдийн дээр үүрд мөнх өргөмжлөгтүн.             ← rich line 3
```

Rich block 0 = `[ext[15], ext[16], ext[17], ext[18]]`. Legacy aligner
trapped on ext[12]. The fix needed to **try multiple candidate starts**
and pick the one that aligns through to the end of the block.

---

## 3. Implementation

### 3.1 Multi-candidate trial alignment

`scripts/dev/auto-reconcile-wraps.mjs` — replaced the single-shot
`findRichStart` flow with `trialAlign`:

1. `findRichStartCandidates(richLines, extLines)` — collect EVERY
   matching extractor index for `richLines[0]`, separated into:
   - `kind: 'exact'` — full-text equality after quote-normalisation
   - `kind: 'prefix'` — 12-char prefix match (legacy fallback)
   - Stable order: exact-by-index first, then prefix-by-index
2. `trialAlign(richLines, extLines, cursor)` — walk candidates, run
   `align()` against each, return the first FULL alignment success.
3. `findRichStart` retained as backwards-compat shim returning first
   candidate (used nowhere on the hot path now).

For Daniel: 2 candidates exist (ext[12] header-preview prefix +
ext[15] exact body). Trial-align picks ext[15] because alignment from
ext[12] fails at rich line 1, but ext[15] aligns through all 4 rich
lines. Exact match preference (listed before prefix in candidates)
also short-circuits common cases — exact matches usually align
correctly without trying prefix-only fallbacks.

### 3.2 Always-retry on alignment failure (depth expansion)

`reconcileOneRef` previously broke out of the depth loop on any failure
other than `NO_START_FROM_CURSOR` (the rationale being "ALIGN_DRIFT is
content-shape, more pages won't fix it"). Pattern A revealed the
counter-example: when a refrain block straddles a page boundary, the
rich block's late lines exist on the NEXT physical page that wasn't
yet extracted. `align()` reaches the end of the current ext stream and
correctly reports `ALIGN_DRIFT` — adding one more page resolves it.

Change: removed the `break` — the loop now reaches `MULTI_PAGE_DEPTH = 4`
on any failure. The depth ceiling bounds cost (worst case: 4 extra
PDF page fetches per ref, ~2 seconds added per truly-deferred ref).

### 3.3 Diagnostic differentiation

When trial-align fails entirely, the failure path now distinguishes:

- `NO_START_FROM_CURSOR` — first line absent from extractor stream
  (suggests multi-page spillover; depth expansion may help)
- `ALIGN_DRIFT` — first line found but every candidate drifted
  (suggests Pattern C/B/D-edge; depth expansion or different handler)

The detail string also reports `tried N candidate start(s)` so the
operator can distinguish single-candidate failures (typography drift)
from multi-candidate failures (genuine content-shape mismatch).

---

## 4. Pipeline executed

```bash
for w in 1 2 3 4; do
  node scripts/dev/auto-reconcile-wraps.mjs --week $w --apply
  node scripts/dev/process-week-phrases.mjs --week $w --inject
done
node scripts/verify-phrase-coverage.js --check
# OK — 202 stanza(s) with phrases inspected, 0 violations
npx tsc --noEmit          # exit 0
npx vitest run            # 647/647 PASS
```

Per-week split application: w1 5 splits / w2 0 / w3 0 / w4 1 splits.
Most A-handler benefit accrued via trial-align (no rich.json change
needed — extractor was just looking at the wrong starting position).

---

## 5. Per-week verdict snapshot (post-A)

| Week | NO_SPLITS_NEEDED | NOVEL_EDGE | Total | Coverage |
|------|------------------|------------|-------|----------|
| 1 | 32 | 10 | 42 | 76% |
| 2 | 29 | 10 | 39 | 74% |
| 3 | 25 | 16 | 41 | 61% |
| 4 | 24 | 16 | 40 | 60% |
| **Total** | **110** | **52** | **162** | **68%** |

(Auto-reconciler NO_SPLITS_NEEDED counts include refs where the
alignment path now succeeds even if no splits were needed; the
"refs with phrases" stat from rich.json is the more precise inject
count: 90 of 125 = 72%.)

---

## 6. Remaining NOVEL_EDGE pattern coverage (52 refs across 4 weeks)

After A handler, remaining edge cases distribute as:

| Pattern | Status | Refs remaining (4 weeks) | LOC est. (R-9.C / B / D-edge) |
|---------|--------|--------------------------|-------------------------------|
| **C. Antiphon-as-block-0** | not started | ~10-15 | ~40 |
| **B. V/R prefix** | not started | ~3-5 | ~10 |
| **D-edge: typography drift** | partially solved | ~20-25 | ~30 (em-dash / curly punctuation) |
| **D-edge: deep wrap > depth 6** | not started | ~3-5 | ~10 (raise MAX_JOIN_DEPTH) |

**R-9.C / R-9.B** dispatches still recommended in the original order
(C → B). After all four pattern handlers ship, projected ~95% coverage
across the 162-ref full corpus.

---

## 7. Files changed

| File | Change | Notes |
|------|--------|-------|
| `scripts/dev/auto-reconcile-wraps.mjs` | +60 / -15 | trial-align + always-retry on failure + richer diagnostics |
| `src/data/loth/prayers/commons/psalter-texts.rich.json` | +many / -few | A handler unblocked 6 splits across 3 refs (Psalm 48/46 + week-4 ref) + 5 newly-injected stanzas via trial-align |
| `docs/fr-161-r9a-pattern-a-evidence.md` | +200 new | this doc |

---

## 8. Verification

| Check | Command | Result |
|-------|---------|--------|
| TypeScript | `npx tsc --noEmit` | exit 0 |
| Unit tests | `npx vitest run` | Test Files 40 passed (40), Tests 647 passed (647), 4.79s — all builder/extractor/renderer contracts preserved |
| R-6 phrase coverage | `node scripts/verify-phrase-coverage.js --check` | OK — 202 stanza(s) with phrases inspected, 0 violations exit 0 |
| 6 page verifiers (NFR-009d) | `scripts/verify-{psalter,hymn,...}-pages.js` | inspection 무회귀 (no `page` field touched) |
| Visual regression | by construction | 0 — R-4 renderer joins split lines back via PhraseGroup `lineRange`; rich-overlay loader doesn't assume line counts |

---

## 9. Self-correction trace

- This PR did NOT use `git stash` (R-7 violation; cp/idempotent-write
  pattern preserved per R-8/R-9.D hygiene).
- Pre-existing Revelation 4:11; 5:9-10, 12 was reported NO_SPLITS_NEEDED
  by R-9.D (because that ref was already injected via R-2 builder's
  window match), but auto-reconciler NOW reports it NOVEL_EDGE because
  `align()` is stricter than the builder's window match (the rich block
  has "Алдар ба" + "магтаалыг авах..." split into 2 lines, but the
  extractor sees them joined as one ext line "Алдар ба магтаалыг авах...").
  This is a documentation discrepancy, NOT a data regression — the
  --apply gate skips NOVEL_EDGE refs, so Revelation 4 stays as the
  R-9.D-injected version. R-2 builder's window match remains the
  authoritative inject path; auto-reconciler is the rich-side
  reconciliation pre-flight tool.
- R-6 verifier 202 stanzas / 0 violations confirms data integrity
  across the new injects.

---

## 10. Repro

```bash
# 1. Run upgraded auto-reconciler on a week
node scripts/dev/auto-reconcile-wraps.mjs --week N --apply

# 2. Inject batch (atomic per ref)
node scripts/dev/process-week-phrases.mjs --week N --inject

# 3. Verify
node scripts/verify-phrase-coverage.js --check
npx tsc --noEmit
npx vitest run
```

---

## 11. Downstream

- **R-9.C** (antiphon-as-block-0): Psalm 5 / 48 / 46 + similar — ~10-15 refs. Recipe: detect "rich block 0 first line absent from extractor stream + rest aligns from ext[0]" and either drop the antiphon line or migrate to `antiphon` field. (Note: Psalm 48 / 46 came back with A handler's trial-align — already injected.)
- **R-9.B** (versicle/response prefix): Revelation 19 + similar — ~3-5 refs. Recipe: strip `^[ХВ]\.\s+` from rich lines pre-align.
- **R-9.D-edge** (typography drift, deep wraps): em-dash / curly-punctuation tolerant matcher + raise `MAX_JOIN_DEPTH` to 10. ~20-25 refs unblockable.
- **R-10** (NFR-009j CI gate): baseline now 202 stanzas. Future regressions surface immediately.
- **R-12** candidate: investigate `auto-reconciler` vs `R-2 builder` algorithmic divergence — the auto-reconciler's strict line-by-line align differs from builder's window match; reconcile to single canonical algorithm OR document the intentional divergence as "auto-reconciler = rich-side reconciliation, builder = extractor-side window match".
