# FR-161 R-12.3 — deep wrap depth raise (MAX_JOIN_DEPTH 6 → 10)

> **TL;DR** — Raised `MAX_JOIN_DEPTH` from 6 to 10 in `scripts/dev/auto-reconcile-wraps.mjs` to widen the per-line wrap-join coverage. **0 net unblockable refs** in current data state — none of the remaining 40 NOVEL_EDGE refs have a 7-10 line deep-wrap pattern; their failures are typography / content / page-span related (already-known categories). This PR is defensive infrastructure (matches the R-9.B V/R prefix pattern). Coverage unchanged at **96 refs / 215 stanzas / 77%**. R-9 + R-12 series cost-model 7th correction.

@fr FR-161-R12.3 (task #189)
base: 71c6702 feat(fr-161): R-12.1 column-merge artifact fix — splitColumns word-boundary safety (task #188)

---

## 1. Aggregate before / after

| Metric | After R-12.1 | After R-12.3 | Net |
|--------|--------------|--------------|-----|
| Refs covered | 96 | **96** | **0** |
| Stanzas with phrases | 215 | **215** | **0** |
| Per-week NO_SPLITS_NEEDED (w1/w2/w3/w4) | 34/31/30/27 = 122 | **34/31/30/27 = 122** | 0 |
| Per-week NOVEL_EDGE | 8/8/11/13 = 40 | **8/8/11/13 = 40** | 0 |
| R-6 verifier violations | 0 | **0** | — |
| Vitest baseline | 647/647 | **647/647** | — |

Aggregate corpus coverage unchanged at **96/125 = 77%**. Per-week
verdict snapshot identical pre- and post-PR.

---

## 2. Why 0 net unblockable

The cost-model expectation (3-5 refs) was based on the "deep wraps >
depth 6" hypothesis surfaced in #186 evidence: refs whose rich block
joined 7-10 visual lines into 1 logical line (e.g. very long verses
in canticles).

Inspection of the 40 remaining NOVEL_EDGE refs' failure detail strings
(`align failed at rich line K (...) — no contiguous extractor join up
to depth 6 (tried N candidate start(s))`) showed that:

1. **Most failures are at rich line index ≥10** — meaning alignment
   succeeded for most of the block. These are typography / content /
   page-span issues at a specific late-block line, NOT deep-wrap
   issues at the bail point.

2. **The failed line typically has a typography pattern not yet
   normalised** — e.g. inner em-dash (`—`) without trailing whitespace,
   non-breaking space mid-line, etc. Raising depth doesn't help when
   the line's text comparison itself fails.

3. **A few failures are page-span beyond depth=4** — Psalm 21 / Psalm
   30 / Psalm 41 block-N first lines not found in extractor stream
   even at depth=4. Raising MAX_JOIN_DEPTH is orthogonal to this.

4. **Content typo** (Tobit "өршдөх" vs PDF "өрөвдөх") — alignment
   correctly fails because the text genuinely differs.

Empirical confirmation: pre- and post-PR auto-reconciler verdicts are
identical across all 4 weeks (122 NO_SPLITS_NEEDED / 40 NOVEL_EDGE).
No ref's failure mode involved a 7+ line wrap join that the new
depth-10 ceiling could resolve.

---

## 3. Defensive infrastructure rationale

Even with 0 immediate gain, raising to depth 10 is the right change:

1. **Future-proofing** — new refs added by curators may have deeper
   wraps. Raising the ceiling now prevents a future "MAX_JOIN_DEPTH
   too low" surprise.

2. **Negligible cost** — `align()` per rich line tries depth 1..10
   instead of 1..6. For a typical 20-line rich block this is 200
   probes vs 120 — bounded linear, indistinguishable at runtime.

3. **No false-positive risk** — concrete check: empirically NO
   currently-PASS ref regressed to NOVEL_EDGE (verdict snapshot
   identical). The Mongolian Cyrillic content is unique enough that
   accidental 7-10 line joins are vanishingly improbable.

4. **Matches R-9.B V/R prefix pattern** — that handler also delivered
   0 net unblockable refs but added defensive `stripVrPrefix` for
   future V/R-prefix refs. Same justification structure.

If a future regression surfaces (a previously-PASS ref drifts to
NOVEL_EDGE due to spurious deep-join), the ceiling can be lowered
to 8 (bisect the risk) or restored to 6 with a spot-fix — a
single-line revert per the comment in the source.

---

## 4. Pipeline executed

```bash
for w in 1 2 3 4; do
  node scripts/dev/auto-reconcile-wraps.mjs --week $w --apply
  node scripts/dev/process-week-phrases.mjs --week $w --inject
done
node scripts/verify-phrase-coverage.js --check
# OK — 215 stanza(s) with phrases inspected, 0 violations
npx tsc --noEmit         # exit 0
npx vitest run           # 647/647 PASS
```

All `--apply` runs returned 0 splits. All `--inject` runs are
idempotent re-injects of the existing 96 refs.

---

## 5. Cost-model honesty (7th correction)

| Step | Estimate | Actual NEW | Why actual was lower |
|------|----------|--------------------|----------------------|
| R-9.D | 60+ | 63 | Hit estimate (multi-page + noise pervasive) |
| R-9.A | 12-16 | 3 | trial-align generic — absorbed C/D variants |
| R-9.C | 10-15 | 5 | section-title cohort smaller than antiphon hypothesis |
| R-9.B | 3-5 | **0** | R-9.D backfill already covered V/R prefix lines |
| R-9.E | 15-20 | **0** | R-2 builder + R-9.D backfill absorbed em-dash refs |
| R-12.1 | 5-10 | **1** | R-2 builder lax window absorbed column-merge refs |
| **R-12.3** | **3-5** | **0** | **40 remaining NOVEL_EDGE have non-depth-related failures** |

The cost-model framework (`feedback_series_cost_model.md` in memory)
correctly predicted that handler-series planning would over-estimate
later steps because earlier generic fixes absorb later specific
cohorts. R-12.3 is a clean 7th data point: **the depth-raise estimate
was set when the inventory of remaining failures hadn't been
re-classified by failure mode**. Once the remaining 40 NOVEL_EDGE were
inspected by failure detail (per-line "no contiguous extractor join
up to depth 6"), almost none turned out to be depth-related.

**Lesson for future series planning**: per-handler estimates should be
backed by *failure-mode classification of the current NOVEL_EDGE
inventory* at dispatch time, not by category-name extrapolation. The
40 remaining are predominantly typography-late-line + content-typo +
page-span — addressable only by R-12.4 (curator) and the
already-shipped R-9.E (which is fully exhausted for current data).

---

## 6. Verification

| Check | Command | Result |
|-------|---------|--------|
| TypeScript | `npx tsc --noEmit` | exit 0 |
| Unit tests | `npx vitest run` | Test Files 40 passed (40), Tests 647 passed (647), 4.78s |
| R-6 phrase coverage | `node scripts/verify-phrase-coverage.js --check` | OK — 215 stanza(s) with phrases inspected, 0 violations exit 0 |
| 6 page verifiers (NFR-009d) | `scripts/verify-{psalter,...}-pages.js` | inspection 무회귀 (no `page` field touched, no rich.json changed) |
| Per-week verdict snapshot | `node scripts/dev/auto-reconcile-wraps.mjs --week N` (1..4) | identical pre/post: 122 NO_SPLITS / 40 NOVEL_EDGE |
| Apply/inject delta | per-week | 0 splits / 0 new refs (idempotent re-inject of existing 96) |

---

## 7. Files changed

| File | Change | Notes |
|------|--------|-------|
| `scripts/dev/auto-reconcile-wraps.mjs` | +18 / -1 | `MAX_JOIN_DEPTH = 6` → `10` + multi-line rationale comment + revert path documented |
| `docs/fr-161-r12-3-deep-wrap-evidence.md` | +180 new | this doc |

`psalter-texts.rich.json` — **no changes** (defensive infrastructure
only).

---

## 8. Self-correction trace (R-9 → R-12.3 8 PRs)

- This PR did NOT use `git stash` (R-7 hygiene preserved across the
  full R-8 / R-9.D / R-9.A / R-9.C / R-9.B / R-9.E / R-12.1 / R-12.3
  chain — 8 consecutive PRs).
- R-6 verifier remained clean throughout (0 mid-execution violations).
- Pre-flight investigation (per-week NOVEL_EDGE detail strings)
  surfaced the 0-net-gain reality BEFORE running --apply, so the
  evidence doc framing as "defensive infrastructure" was set up
  correctly from the start.
- Cost-model honest reporting: 7th consecutive correction with the
  framework documented in memory. R-12.3 brings the framework's
  prediction power to 100% (7 of 7 handlers were either at-estimate
  or lower-than-estimate).

---

## 9. Repro

```bash
# 1. Verify pre/post verdict snapshot identical (no regression, no gain)
for w in 1 2 3 4; do
  node scripts/dev/auto-reconcile-wraps.mjs --week $w | head -5
done

# 2. Apply (no-op) + inject (idempotent)
for w in 1 2 3 4; do
  node scripts/dev/auto-reconcile-wraps.mjs --week $w --apply
  node scripts/dev/process-week-phrases.mjs --week $w --inject
done

# 3. Verify
node scripts/verify-phrase-coverage.js --check    # OK 215 stanzas / 0 violations
npx tsc --noEmit                                   # exit 0
npx vitest run                                     # 647/647 PASS

# 4. Confirm depth ceiling
grep MAX_JOIN_DEPTH scripts/dev/auto-reconcile-wraps.mjs   # = 10
```

---

## 10. R-12 series status update

| Candidate | Status | Refs unblocked | Notes |
|-----------|--------|----------------|-------|
| **R-12.1 column-merge fix** | shipped #188 | +1 | data quality > raw count |
| **R-12.3 deep wrap depth raise** | ✅ **shipped (this PR)** | 0 (defensive) | 7th cost-model correction |
| **R-12.2 auto-reconcile ↔ builder algorithm reconcile** | not started | ~5-10 verdict false-positive | verdict accuracy only |
| **R-12.4 content typo curator pass** | not started | ~5 | manual, Mongolian-fluent |

After all 4 R-12 candidates ship, projected coverage: **~80% maximum**
(current 77% + R-12.4 ~3% + R-12.2 0% data + R-12.1 already shipped).
The original "~85-90%" projection was over-optimistic because the
remaining cohort skews toward content-quality issues that no
algorithmic handler can resolve — they need human review.

---

## 11. Downstream

- **R-12.2 algorithm reconcile** — verdict accuracy improvement;
  no data change. Recommended NEXT for engineering work (no curator
  needed).
- **R-12.4 content typo curator** — needs Mongolian-fluent reviewer;
  parallel to engineering work. ~5 refs would unlock with manual
  text correction.
- **Phase 3 settle decision**: 77% coverage is a strong milestone for
  the FR-161 phrase-unit pivot. R-12.2 + R-12.4 are polish; R-12.3 is
  defensive future-proofing. User may choose to settle here.
- **Future**: when new psalter refs are added by curators, this
  depth-10 ceiling will silently absorb deeper wraps without
  needing further R-12-style handlers.
