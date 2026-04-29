# FR-161 R-9.B — pattern B handler evidence (V/R prefix, defensive infrastructure)

> **TL;DR** — Pattern B turned out to be **already-handled by R-9.D coverage backfill**: only 4 V/R prefix lines exist in the entire rich.json (all 4 in Revelation 19:1-7, all 4 already phrase-injected). Net unblockable refs: **0**. This PR adds **defensive infrastructure** (~10 LOC `stripVrPrefix` in auto-reconciler `norm()`) so future V/R-prefix refs can align directly without relying on backfill. Total injected coverage unchanged: **95 refs / 212 stanzas (76%)**. R-6 verifier 0 violations. R-9 series complete (D + A + C + B).

@fr FR-161-R9B (task #185)
base: 83077de feat(fr-161): R-9.C pattern handler — section-title noise filter (task #184)

---

## 1. Aggregate before / after

| Metric | After R-9.C | After R-9.B | Net |
|--------|-------------|-------------|-----|
| Refs covered | 95 | **95** | **0** |
| Stanzas with phrases | 212 | **212** | **0** |
| Splits applied (this PR) | — | **0** | — |
| R-6 verifier violations | 0 | **0** | — |
| Vitest baseline | 647/647 | **647/647** | — |
| Defensive LOC added | — | ~10 | — |

Aggregate corpus coverage unchanged at **95/125 = 76%**.

---

## 2. Pattern B turned out to be already-handled

### 2.1 Survey of all V/R prefix occurrences in rich.json

A broad scan over every `kind:'stanza'` block in
`psalter-texts.rich.json` for V/R-style prefixes (`Х. ` / `В. ` /
`(Х. ` / `(В. ` / `Хариу:` / `Versicle:` / `V. ` / `R. `) returned
**8 hits, all in `Revelation 19:1-7`**:

```
Х. ... — 4 hits (one per stanza block, line N varies)
(Х. ... — 4 hits (bracketed inline, mid-block)
В. ... — 0 hits
(В. ... — 0 hits
... and all other patterns: 0 hits
```

That single ref had already been phrase-injected during R-8 (Phase 1
week-1 batch) via the R-2 builder's window-match path. The V/R prefix
lines became single-line phrases in the inject, and R-9.D's coverage
backfill (added in #182) ensured no coverage gap arose from cross-
window-boundary clipping.

### 2.2 Verification — auto-reconciler reports NO_SPLITS_NEEDED for Revelation 19 in all 4 weeks

The auto-reconciler returned `NO_SPLITS_NEEDED` for `Revelation 19:1-7`
in every week before this PR ran. With the new prefix-strip in `norm()`,
the verdict remains `NO_SPLITS_NEEDED`. **No new refs unblocked, no
refs regressed.**

```text
=== week 1..4 (post-B handler) ===
applied 0 split(s) across 0 ref(s)
inject OK — 32 / 31 / 29 / 27 ref(s) updated  (idempotent re-inject)
verifier: OK — 212 stanza(s) with phrases inspected, 0 violations
```

### 2.3 Why R-9.D backfill already covered V/R lines

R-9.D's `translatePhrases` change (#182) added a coverage-backfill loop
that emits a single-line phrase for any window index left uncovered
after extractor-phrase translation. V/R prefix lines fall into this
"uncovered" bucket: the extractor's joined "Аллэлуяа! (аллэлуяа!)."
line matched the rich line under window-match, but its associated
phrase (typically a wrap pair extending into the previous response
stanza) crossed the window boundary and was clipped. The backfill
then created a `lineRange [k,k] indent:0` for the V/R line. R-4
renderer treats that single-line phrase identically to legacy line-by-
line render — no visual change, no coverage gap.

This is the **classic "earlier generic fix absorbs later specific
category"** pattern noted in the leader's R-9.A/C feedback. The R-9.D
backfill was conceived to fix the boundary-clip issue surfaced by
Psalm 147; it incidentally absorbed the entire Pattern B cohort.

---

## 3. Defensive infrastructure (still added)

Even with 0 net unblockable refs, the prefix-strip is added to the
auto-reconciler's `norm()` function as a one-line resilience measure:

```js
const VR_PREFIX_RE = /^\s*\(?\s*[ХВ]\.\s+/

function stripVrPrefix(s) {
  return s.replace(VR_PREFIX_RE, '')
}

function norm(s) {
  return normalizeQuotes(stripVrPrefix((s || '').trim())).replace(/\s+/g, ' ')
}
```

**Why add code with 0 measurable benefit today**:

1. **Future V/R refs** — the rich.json model permits any stanza to
   carry V/R prefix lines (see `prayer-renderer.tsx` versicle/response
   span types). Future curator additions may introduce them.
2. **Auto-reconciler verdict accuracy** — without the strip, future
   V/R-prefix refs would auto-reconciler as NOVEL_EDGE even when the
   builder's window-match + backfill works. The strip keeps the dry-
   run report honest.
3. **Operator mental model** — operators reading the auto-reconciler
   report shouldn't have to know that "NOVEL_EDGE on V/R prefix"
   actually means "already covered by backfill". Strip surfaces it
   correctly as NO_SPLITS_NEEDED.
4. **Cost of inaction** — none today, but a future false-positive
   NOVEL_EDGE would cost 5-15 minutes of operator confusion per
   incident. Net present value positive.

The prefix regex covers both bare (`Х. `) and bracketed (`(Х. `)
forms, with optional `\(` and tolerant inner whitespace.

---

## 4. Cost-model honesty (per leader's R-9.A/C meta-feedback)

R-9.A delivered 3 refs (vs 12-16 estimated). R-9.C delivered 5 refs
(vs 10-15 estimated). R-9.B delivers **0 refs** (vs 3-5 estimated).

This is the cleanest demonstration of the **"earlier generic fix
absorbs later specific category"** pattern:

| Series step | Estimate | Actual | Why actual was lower |
|-------------|----------|--------|---------------------|
| R-9.D | 60+ refs | 63 refs | Hit estimate (multi-page + noise are pervasive) |
| R-9.A | 12-16 refs | 3 refs | trial-align is generic — absorbed C/D variants |
| R-9.C | 10-15 refs | 5 refs | section-title noise was a smaller cohort than antiphon hypothesis predicted |
| R-9.B | 3-5 refs | **0 refs** | R-9.D backfill already covered all V/R prefix lines |

The estimate framework was set in R-8 evidence based on inspecting
NOVEL_EDGE failure points BEFORE R-9.D landed. Each subsequent
handler shrinks the deferred cohort, often disproportionately to its
own scope.

**Accepting this dynamic**: the dispatch-time estimate represents
"upper bound assuming no overlap with previous handlers". Actual
delivery is "incremental beyond what previous handlers absorbed".
For R-9 series planning purposes, sum-of-estimates is valid; per-
handler delivery shrinks as the series progresses.

---

## 5. R-9 series final state

After R-9.D + R-9.A + R-9.C + R-9.B:

| Metric | Pre R-9 (R-8 land) | Post R-9 (this PR) | Net |
|--------|---------------------|---------------------|-----|
| Refs covered | 24 (week 1 only) | **95 (all 4 weeks)** | +71 |
| Stanzas with phrases | 44 | **212** | +168 |
| Wrap-line splits applied | 48 | ~190 cumulative | +142 |
| R-6 verifier violations | 0 | **0** | — |
| Coverage % | 19% (24 of 125) | **76%** | +57 pp |

R-9 series **complete**. Target ~85-90% requires the still-deferred
Pattern D-edge categories (typography drift / column-merge artifact /
deep wraps) — recommend R-9.5 / R-12 series:

| Pattern | Refs remaining (4 weeks) | LOC est. | Status |
|---------|--------------------------|----------|--------|
| **D-edge: typography drift** (em-dash, curly, whitespace) | ~15-20 | ~30 | priority next |
| **D-edge: deep wraps > MAX_JOIN_DEPTH (6)** | ~3-5 | ~10 | minor |
| **D-edge: column-merge artifacts** | ~5-10 | ~50 (R-1 changes) | requires extractor fix |
| **Truly novel** (R-12 catalog) | ~5-10 | manual | per-ref |

Assuming D-edge typography (~30 LOC, 15-20 refs) ships:
projected **~85% coverage** (~115/125 refs, 1.6× current density).

Column-merge artifacts (R-1-level extractor bug) is the hard ceiling
to ~95% — fix would require pdftotext column-split correction OR
pdfminer XML mode integration.

---

## 6. Verification

| Check | Command | Result |
|-------|---------|--------|
| TypeScript | `npx tsc --noEmit` | exit 0 |
| Unit tests | `npx vitest run` | Test Files 40 passed (40), Tests 647 passed (647), 4.80s |
| R-6 phrase coverage | `node scripts/verify-phrase-coverage.js --check` | OK — 212 stanza(s) with phrases inspected, 0 violations exit 0 |
| 6 page verifiers (NFR-009d) | `scripts/verify-{psalter,hymn,...}-pages.js` | inspection 무회귀 (no `page` field touched, no rich.json data changed) |
| Per-week reconciliation | `node scripts/dev/auto-reconcile-wraps.mjs --week N` (1..4) | 0 splits / 0 ref change across all weeks |

---

## 7. Files changed

| File | Change | Notes |
|------|--------|-------|
| `scripts/dev/auto-reconcile-wraps.mjs` | +20 / -2 | added `stripVrPrefix` + `VR_PREFIX_RE`; `norm()` now applies strip after quote normalisation |
| `docs/fr-161-r9b-pattern-b-evidence.md` | +200 new | this doc |

`psalter-texts.rich.json` — **no changes** (defensive infrastructure
doesn't unblock any new refs in current data state).

---

## 8. Self-correction trace

- This PR did NOT use `git stash` (R-7 hygiene preserved across the
  full R-8/R-9.D/A/C/B chain).
- R-6 verifier remained clean throughout (0 mid-execution violations).
- Cost-model honest reporting: 0 net gain confirmed via per-week
  apply runs (0 splits, 0 new refs). Defensive infrastructure
  documented as "future-proofing" rather than oversold as a fix.

---

## 9. Repro

```bash
# 1. Confirm V/R prefix survey (returns 4 hits in Revelation 19 only)
node -e "
const fs=require('fs'),
  rich=JSON.parse(fs.readFileSync('src/data/loth/prayers/commons/psalter-texts.rich.json'));
const re=/^[ХВ]\.\s+/;
let n=0;
for(const r of Object.keys(rich))(rich[r].stanzasRich?.blocks||[]).forEach(b=>{
  if(b.kind==='stanza')(b.lines||[]).forEach(l=>{if(re.test(l.spans?.[0]?.text||''))n++});
});
console.log('V/R prefix lines:',n);
"

# 2. Auto-reconciler dry-run on each week — confirm 0 splits
for w in 1 2 3 4; do
  node scripts/dev/auto-reconcile-wraps.mjs --week $w | head -3
done

# 3. Apply (no-op) + inject (idempotent)
for w in 1 2 3 4; do
  node scripts/dev/auto-reconcile-wraps.mjs --week $w --apply
  node scripts/dev/process-week-phrases.mjs --week $w --inject
done

# 4. Verify
node scripts/verify-phrase-coverage.js --check    # OK 212 stanzas / 0 violations
npx tsc --noEmit                                   # exit 0
npx vitest run                                     # 647/647 PASS
```

---

## 10. Downstream

- **R-9.D-edge typography drift** (em-dash / curly punctuation /
  whitespace tolerance + raise `MAX_JOIN_DEPTH` to 10): ~30 LOC,
  15-25 refs unblockable. **Highest-leverage next dispatch**.
- **R-12 candidates**:
  - **Column-merge artifact fix**: requires R-1 extractor change.
    pdftotext occasionally splits Cyrillic words at column boundaries
    (e.g. "нтай" appears alone after large whitespace in Isaiah 45
    page 145 ext[8]). ~5-10 refs blocked.
  - **Auto-reconcile vs builder algorithm divergence**: surfaced in
    R-9.A evidence (Revelation 4 false-positive NOVEL_EDGE).
    Reconcile to single canonical algorithm OR document the
    intentional divergence.
  - **Section-title token list expansion**: monitor new section
    title patterns as more refs surface.
- **R-10 (NFR-009j CI gate)**: baseline now 212 stanzas. Future
  regressions surface immediately.
