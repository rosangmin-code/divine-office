# FR-161 R-9.E — typography drift handler evidence

> **TL;DR** — typography handler adds em-dash strip + NBSP/ellipsis normalization to both auto-reconciler `norm()` and builder `stanzaFirstLineMatches()`. **0 new refs injected** (95 → 95) because the R-2 builder's window-match path had ALREADY landed those refs via R-7/R-8 + R-9.D backfill. The handler **shifts 6 refs from NOVEL_EDGE to NO_SPLITS_NEEDED in the auto-reconciler verdict** — improving operator dry-run report accuracy without changing rich.json data. R-6 verifier 0 violations across 212 stanzas. R-9 series final state: **95 refs / 212 stanzas / 76% coverage**, with the typography handler completing the auto-reconciler ↔ builder verdict reconciliation for em-dash trailing-marker refs.

@fr FR-161-R9E (task #186)
base: f856ae5 feat(fr-161): R-9.B pattern handler — defensive V/R prefix strip (task #185)

---

## 1. Aggregate before / after

| Metric | After R-9.B | After R-9.E | Net |
|--------|-------------|-------------|-----|
| Refs covered | 95 | **95** | **0** |
| Stanzas with phrases | 212 | **212** | **0** |
| Per-week NO_SPLITS_NEEDED (w1/w2/w3/w4) | 33/30/27/25 = 115 | **33/31/30/27 = 121** | **+6** |
| Per-week NOVEL_EDGE | 9/9/14/15 = 47 | **9/8/11/13 = 41** | **−6** |
| R-6 verifier violations | 0 | **0** | — |
| Vitest baseline | 647/647 | **647/647** | — |

Aggregate corpus coverage unchanged at **95/125 = 76%**. The 6 NOVEL_EDGE
→ NO_SPLITS_NEEDED shift represents refs whose phrases were already
present in rich.json (injected via R-7/R-8/R-9.D builder paths) but
the auto-reconciler's strict line-by-line `align()` had been reporting
them as NOVEL_EDGE due to em-dash drift. With the typography
normalization, the auto-reconciler verdict matches the actual data
state.

---

## 2. Typography drift survey

A scan over rich.json's NOVEL_EDGE failure points found that the
**dominant typography drift character is U+2013 em-dash `–`** appended
as a trailing poetic-pause marker that the PDF body extractor never
sees. Affected lines (representative):

| Ref | Block | Line | Rich text (truncated) |
|-----|-------|------|----------------------|
| Psalm 51:3-19 | block 1 | 27 | "Эмтэрсэн, гэмшсэн зүрхийг **–**" |
| Psalm 92:2-9 | block 0 | 23 | "Та над дээр шинэхэн тос цутгасан.**–**" (no leading space) |
| Psalm 118:1-16 | block 0 | 12 | "Хүн надад юу хийж чадах вэ? **–**" |
| Psalm 135:1-12 | block 1 | 3 | "Учир нь тэр сайхан юм. **–**" |
| Psalm 144:11-15 | block 0 | 6 | "Баруун гар нь худлын баруун гар болсон, **–**" |
| Daniel 3:57-88, 56 | block 8 | 0 | "Уулс болон толгод оо, **–**" |
| Isaiah 45:15-26 | block 1 | 21 | "Тэд хамтдаа зөвлөлдөг. **–**" |
| 1 Samuel 2:1-10 | block 0 | 0 | "ЭЗЭН тандаа зүрх минь баярлана. **–**" |

Other typography variants surveyed but found at lower frequency:
- **NBSP** (U+00A0): defensive normalization included
- **Ellipsis** (`…` U+2026): defensive normalization included
- **Inner em-dash**: defensive normalization included (rare in rich,
  defensive only)

Refs with em-dash specifically classified as Pattern D-edge typography
in #185 evidence's cost-model: ~15-20 estimated.

---

## 3. Implementation

`scripts/dev/auto-reconcile-wraps.mjs` `norm()`:
```js
const TRAILING_EM_DASH_RE = /\s*[-–—]\s*$/   // hyphen FIRST, then em/en

function normalizeTypography(s) {
  return s
    .replace(/[ ]/g, ' ')         // NBSP → space
    .replace(TRAILING_EM_DASH_RE, '')  // RUN FIRST: trailing em/en/hyphen + ws strip
    .replace(/[–—]/g, '-')             // inner em/en-dash → ASCII hyphen (defensive)
    .replace(/…/g, '...')              // ellipsis → ASCII
}

function norm(s) {
  return normalizeTypography(
    normalizeQuotes(stripVrPrefix((s || '').trim())),
  ).replace(/\s+/g, ' ')
}
```

**Critical ordering**: trailing-dash strip MUST run BEFORE the inner
em-dash conversion. If inner conversion ran first, a trailing em-dash
would be downgraded to a hyphen, then `[-–—]` regex would still strip
it (since it includes `-`). But for safety the order is explicit —
the regex matches hyphen+em+en, run first.

`scripts/build-phrases-into-rich.mjs` `stanzaFirstLineMatches()`:
mirrors the same `normalizeTypography` so the auto-reconciler and the
builder agree on what counts as "the same line" after typography
normalization.

**Display-time impact**: ZERO. Normalization runs only at alignment-
time / window-match-time comparisons. The `block.lines[].spans[].text`
string itself is never modified — R-4 renderer continues to emit the
original em-dash visually.

---

## 4. Pipeline executed

```bash
for w in 1 2 3 4; do
  node scripts/dev/auto-reconcile-wraps.mjs --week $w --apply
  node scripts/dev/process-week-phrases.mjs --week $w --inject
done
node scripts/verify-phrase-coverage.js --check
# OK — 212 stanza(s) with phrases inspected, 0 violations
npx tsc --noEmit         # exit 0
npx vitest run           # 647/647 PASS
```

Apply runs all returned 0 splits (alignment now succeeds without
needing rich.json line splits, since em-dash is normalized away in
comparison instead of via rich.json edit).

---

## 5. Per-week verdict snapshot (post-typography)

| Week | NO_SPLITS_NEEDED | NOVEL_EDGE | Total | Coverage |
|------|------------------|------------|-------|----------|
| 1 | 33 | 9 | 42 | 79% |
| 2 | 31 | 8 | 39 | 79% |
| 3 | 30 | 11 | 41 | 73% |
| 4 | 27 | 13 | 40 | 68% |
| **Total** | **121** | **41** | **162** | **75%** |

(Auto-reconciler verdict shift: 115 → 121 NO_SPLITS_NEEDED, 47 → 41
NOVEL_EDGE. The 6 newly-PASS refs have rich.json data already containing
phrases — the typography normalization corrects the verdict, not the
data.)

---

## 6. Cost-model honesty

This is the FIFTH consecutive cost-model honest correction in the R-9
series. The pattern is now well-documented:

| Step | Estimate | Actual NEW injects | Why actual was lower |
|------|----------|--------------------|----------------------|
| R-9.D | 60+ | 63 | Hit estimate (multi-page + noise pervasive) |
| R-9.A | 12-16 | 3 | trial-align generic — absorbed C/D variants |
| R-9.C | 10-15 | 5 | section-title cohort smaller than antiphon hypothesis |
| R-9.B | 3-5 | **0** | R-9.D backfill already covered all V/R prefix lines |
| **R-9.E** | **15-20** | **0** | **R-2 builder window-match + backfill already covered em-dash refs** |

The "earlier generic fix absorbs later specific category" pattern
extends one more level: this time it's the R-2 BUILDER (not just R-9.D
auto-reconciler backfill) that absorbed the typography category. The
builder's window-match was tolerant enough to inject these refs at
R-7/R-8 phase, even though em-dash was technically a drift. The
auto-reconciler's strict `align()` then misreported them as NOVEL_EDGE
until this PR's normalization caught up.

**Lessons for future series planning**:
1. Per-handler estimates should now bake in the "previous handlers
   already absorbed N% of this category" discount.
2. Auto-reconciler verdict accuracy is a SECONDARY value (alongside
   primary value of unblocking new injects). Both deserve weight.
3. The auto-reconciler ↔ builder algorithmic divergence (surfaced in
   R-9.A evidence as R-12 candidate) is now demonstrably impactful:
   builder's looser matching means 6+ refs that auto-reconciler
   couldn't align were nonetheless successfully injected. R-12
   reconciliation between the two algorithms remains a valid future
   investment.

---

## 7. Verification

| Check | Command | Result |
|-------|---------|--------|
| TypeScript | `npx tsc --noEmit` | exit 0 |
| Unit tests | `npx vitest run` | Test Files 40 passed (40), Tests 647 passed (647), 4.92s |
| R-6 phrase coverage | `node scripts/verify-phrase-coverage.js --check` | OK — 212 stanza(s) with phrases inspected, 0 violations exit 0 |
| 6 page verifiers (NFR-009d) | `scripts/verify-{psalter,...}-pages.js` | inspection 무회귀 (no `page` field touched, no rich.json data changed) |
| Per-week reconciliation | `node scripts/dev/auto-reconcile-wraps.mjs --week N` (1..4) | 0/0/1/0 splits across weeks — net +6 NO_SPLITS_NEEDED verdict shift |

---

## 8. R-9 series final state (D + A + C + B + E)

| Metric | Pre R-9 (R-8 land) | Post R-9 (this PR) | Net |
|--------|---------------------|---------------------|-----|
| Refs covered | 24 (week 1 only) | **95 (all 4 weeks)** | +71 |
| Stanzas with phrases | 44 | **212** | +168 |
| Wrap-line splits applied | 48 | ~190 cumulative | +142 |
| R-6 verifier violations | 0 | **0** | — |
| Coverage % | 19% (24 of 125) | **76%** | +57 pp |
| Auto-reconciler NOVEL_EDGE | n/a | **41** | (down from 47 post R-9.B → 41 post R-9.E) |

R-9 series **complete** with 5 sub-handlers (D/A/C/B/E). Coverage
ceiling target ~85-90% per leader's revised projection requires the
remaining 41 NOVEL_EDGE distribution:

| Pattern | Refs remaining | LOC est. | Notes |
|---------|----------------|----------|-------|
| **D-edge: column-merge artifacts** | ~5-10 | ~50 (R-1 changes) | Requires extractor fix; pdftotext occasionally splits Cyrillic words at column boundaries |
| **D-edge: deep wraps > MAX_JOIN_DEPTH (6)** | ~3-5 | ~10 | Raise depth ceiling to 10 |
| **Content typo / mismatch** | ~5 | manual | Tobit "өршдөх" vs PDF "өрөвдөх" — out of scope |
| **Auto-reconcile vs builder algorithm divergence** | ~5-10 false-positive NOVEL_EDGE | ~50 (R-12) | Builder injects, auto-reconciler misreports — verdict-only issue, not data |
| **Truly novel** | ~10-15 | manual | R-12 catalog |

---

## 9. Files changed

| File | Change | Notes |
|------|--------|-------|
| `scripts/dev/auto-reconcile-wraps.mjs` | +20 / -2 | added `normalizeTypography` + `TRAILING_EM_DASH_RE`; `norm()` now applies it |
| `scripts/build-phrases-into-rich.mjs` | +15 / -2 | mirror `normalizeTypography` in `stanzaFirstLineMatches` |
| `docs/fr-161-r9e-typography-evidence.md` | +200 new | this doc |

`psalter-texts.rich.json` — **no changes** (defensive normalization;
no new refs unblocked, no splits applied).

---

## 10. Self-correction trace

- This PR did NOT use `git stash` (R-7 hygiene preserved across the
  full R-8/R-9.D/A/C/B/E chain — 6 consecutive PRs).
- R-6 verifier remained clean throughout (0 mid-execution violations).
- Mid-execution discovery: my initial `normalizeTypography` ordering
  bug (inner-dash conversion BEFORE trailing strip) caused trailing
  em-dash to be downgraded to hyphen and preserved. Fix: added
  hyphen `-` to the trailing-strip character class AND ran the strip
  FIRST. Re-ran weeks 1-4 — verified em-dash refs now align cleanly.
- Cost-model honest reporting: 0 net inject gain confirmed via per-
  week apply runs (0 splits apply, 0 new refs in `refsWithPhrases`
  aggregate). Defensive infrastructure documented as "verdict accuracy
  improvement + builder/reconciler synchronization" rather than
  oversold as a coverage-improving fix.

---

## 11. Repro

```bash
# 1. Confirm em-dash survey (returns ~8 trailing em-dash lines)
node -e "
const fs=require('fs'),
  rich=JSON.parse(fs.readFileSync('src/data/loth/prayers/commons/psalter-texts.rich.json'));
const re=/[-–—]\s*$/;
let n=0;
for(const r of Object.keys(rich))(rich[r].stanzasRich?.blocks||[]).forEach(b=>{
  if(b.kind==='stanza')(b.lines||[]).forEach(l=>{if(re.test(l.spans?.[0]?.text||''))n++});
});
console.log('Trailing em-dash lines:',n);
"

# 2. Auto-reconciler dry-run on each week — confirm verdict shift
for w in 1 2 3 4; do
  node scripts/dev/auto-reconcile-wraps.mjs --week $w | head -5
done

# 3. Apply (~0 splits, verdict shift only) + inject (idempotent)
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

## 12. Downstream

- **R-12 column-merge artifact fix** (R-1 extractor change): pdftotext
  occasionally splits Cyrillic words at column boundaries. ~5-10 refs
  blocked. ~50 LOC, requires R-1 (extract-phrases-from-pdf.mjs) fix.
- **R-12 auto-reconcile vs builder algorithm reconciliation**: surfaced
  in R-9.A and quantified here (6 refs verdict-misreported). Either
  (a) extend auto-reconciler `align()` to do depth-N joins of rich
  lines into ext lines (currently only ext→rich direction), OR
  (b) document the intentional divergence ("auto-reconciler = strict
  rich-side, builder = lax window-side"). Recommend (a).
- **R-12 deep wrap depth ceiling**: raise `MAX_JOIN_DEPTH` from 6 to
  10 to catch the ~3-5 refs with very deep wraps.
- **R-12 content typo curator pass**: ~5 refs with rich/PDF content
  divergence (e.g. Tobit "өршдөх" vs "өрөвдөх") need manual review
  by Mongolian-fluent curator.
- **R-10 (NFR-009j CI gate, divine-tester #187 in flight)**: baseline
  now 212 stanzas. Future regressions surface immediately.
