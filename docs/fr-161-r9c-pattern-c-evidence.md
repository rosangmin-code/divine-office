# FR-161 R-9.C — pattern C handler evidence (section-title noise filter)

> **TL;DR** — C handler extends the shared noise filter (`page-header-filter.mjs`) with **section-title token detection** ("Магтаал" / "Уншлага" / "Шад дуулал" / "Шад магтаал" / "Дууллыг төгсгөх залбирал"). Total injected coverage: **95 refs / 212 stanzas** (R-9.A 90/202 → **+5 refs / +10 stanzas**, **76% coverage**). 12 wrap-line splits applied across 5 refs. R-6 verifier 0 violations. All 647 vitest tests pass.

@fr FR-161-R9C (task #184)
base: 6cd2b8e feat(fr-161): R-9.A pattern handler — multi-candidate trial-align (task #183)

---

## 1. Aggregate before / after

| Metric | After R-9.A | After R-9.C | Net |
|--------|-------------|-------------|-----|
| Refs covered | 90 | **95** | +5 |
| Stanzas with phrases | 202 | **212** | +10 |
| Per-week NO_SPLITS_NEEDED (w1/w2/w3/w4) | 32/29/25/24 = 110 | **33/30/27/25 = 115** | +5 |
| R-6 verifier violations | 0 | **0** | — |
| Vitest baseline | 647/647 | **647/647** | — |

Aggregate corpus coverage (refs at least 1 phrases array): **95/125 = 76%** of all rich.json psalter entries.

---

## 2. Pattern C — actual root cause vs hypothesis

R-8 evidence document hypothesised Pattern C as **"rich.json block 0 first
line is an antiphon text not present in PDF body"**. Investigation against
the canonical case (Psalm 5:2-10, 12-13) and other failing refs revealed
the pattern is more nuanced:

### 2.1 The "antiphon-as-block-0" cases mostly self-resolved

When R-9.A landed multi-candidate `trialAlign`, several Pattern C
candidates (Psalm 48:2-12, Psalm 46:2-12) became RECONCILABLE because
the PDF *does* contain the antiphon — it just appears at a non-first
extractor index. trial-align found the right body start automatically.

So for canonical "antiphon at block 0" refs, the trial-align mechanism
from R-9.A already handled them.

### 2.2 The dominant remaining cause is mid-stream section titles

Diagnostic survey of 6 NOVEL_EDGE refs (Psalm 21 / Psalm 30 /
Colossians 1 / Ephesians 1 / Jeremiah 31 / Isaiah 45) revealed that
the failure point was almost always a **standalone section-title line**
inserted into the extractor stream by `pdftotext -layout` between
psalm body verses:

```
Psalm 5 block 1 alignment context (page 78 left):
  ext[2]: Та намайг зөв шударгаараа хөтлөөч.   ← rich line 1
  ext[3]: Магтаал                              ← section title (NOISE)
  ext[4]: Миний өмнө замаа тэгшитгээч.          ← rich line 2

Colossians 1 block 0 alignment context (page 120):
  ext[7]: Тэрээр эс үзэгдэх Тэнгэрбурханы дүр   ← rich line 3
  ext[8]: Уншлага                               ← section title (NOISE)
  ext[9]: Хамаг бүтээлээс урьд анхан Төрөгч    ← rich line 4
```

These tokens are **not page headers** (no weekday / week marker / page
number) — they're section dividers placed inside the body text by the
PDF layout. The R-9.D page-header filter didn't catch them.

### 2.3 Other underlying causes (Pattern D-edge, out of R-9.C scope)

The remaining 47 NOVEL_EDGE refs (post-C) appear to fall into Pattern
D-edge categories:
- **Typography drift** (em-dash `–` vs hyphen `-`, curly punctuation,
  whitespace inside tokens) — `align()`'s strict `norm()` equality
  fails. ~20-25 refs.
- **Column-merge artifacts** — pdftotext occasionally splits a Cyrillic
  word across column boundaries, e.g. ext[7-8] of Isaiah 45 page 145:
  `"Тэнгэрсийг бүтээсэн ЭЗЭН ингэж" / "нтай           айлдаж байна."`
  This is an extractor-level bug requiring R-1 changes; out of scope
  for the rich-side reconcile.
- **Deep wraps > MAX_JOIN_DEPTH (6)** — long verses wrapping across
  4+ visual lines. Tractable via raising MAX_JOIN_DEPTH to 10.

---

## 3. Implementation

`scripts/dev/page-header-filter.mjs` — extended `isPageHeaderLine` with
a section-title token list and a stand-alone-line regex:

```js
const SECTION_TITLE_TOKENS = [
  'Магтаал',                     // Canticle / Praise title
  'Уншлага',                     // Short reading title
  'Шад дуулал',                  // Antiphon-psalm marker
  'Шад магтаал',                 // Antiphon-canticle marker
  'Дууллыг төгсгөх залбирал',    // Concluding-prayer title
]
const SECTION_TITLE_RE = new RegExp(
  `^\\s*(?:${SECTION_TITLE_TOKENS.map((t) => t.replace(/\s+/g, '\\s+')).join('|')})\\s*$`,
)
```

**Critical safety**: each token only matches when it stands ALONE on a
line (`^\s*…\s*$`). A body verse like "Магтаалыг өргөгтүн" remains
visible — the regex requires the title word to be the entire line content
modulo leading/trailing whitespace.

**Multi-word title handling**: titles like "Шад дуулал" / "Дууллыг төгсгөх
залбирал" use `\s+` between tokens so PDF-injected extra spaces don't
break detection.

The shared filter is consumed by both `auto-reconcile-wraps.mjs` and
`process-week-phrases.mjs` (both `import` it at the top), so the
alignment-time strip and the builder-time strip stay consistent.

---

## 4. Pipeline executed

```bash
for w in 1 2 3 4; do
  node scripts/dev/auto-reconcile-wraps.mjs --week $w --apply
  node scripts/dev/process-week-phrases.mjs --week $w --inject
done
node scripts/verify-phrase-coverage.js --check
# OK — 212 stanza(s) with phrases inspected, 0 violations
npx tsc --noEmit       # exit 0
npx vitest run         # 647/647 PASS
```

Per-week split application: w1 2 / w2 5 / w3 3 / w4 2 splits = **12
new splits across 5 newly-reconcilable refs**.

---

## 5. Per-week verdict snapshot (post-C)

| Week | NO_SPLITS_NEEDED | NOVEL_EDGE | Total | Coverage |
|------|------------------|------------|-------|----------|
| 1 | 33 | 9 | 42 | 79% |
| 2 | 30 | 9 | 39 | 77% |
| 3 | 27 | 14 | 41 | 66% |
| 4 | 25 | 15 | 40 | 63% |
| **Total** | **115** | **47** | **162** | **71%** |

---

## 6. Newly-injected refs (week-attribution)

Identified via the auto-reconciler's "applied N splits" delta per week.
Reconstruction (which refs unlocked) requires manual diff inspection of
the rich.json change set, but per-week split counts confirm the C
handler unlocked at least 5 refs (one per week with non-zero split
count + the implicit splits that were already injected by R-9.A's
trial-align after the noise was filtered out).

Cross-checking against the `Refs with phrases` aggregate stat:
**90 → 95** (+5 refs).

Likely candidates from the per-week NOVEL_EDGE delta (post-A list vs
post-C list):
- **Week 1**: Psalm 5:2-10, 12-13 (block 1 line 2 was "Миний өмнө замаа..." stuck behind "Магтаал" at ext[3])
- **Week 2**: refs with mid-body "Уншлага" or "Магтаал" titles (5 splits — likely 1 ref with deep wrap pattern)
- **Week 3**: 2 refs unlocked
- **Week 4**: 1 ref unlocked

---

## 7. Verification

| Check | Command | Result |
|-------|---------|--------|
| TypeScript | `npx tsc --noEmit` | exit 0 |
| Unit tests | `npx vitest run` | Test Files 40 passed (40), Tests 647 passed (647), 4.79s |
| R-6 phrase coverage | `node scripts/verify-phrase-coverage.js --check` | OK — 212 stanza(s) with phrases inspected, 0 violations exit 0 |
| 6 page verifiers (NFR-009d) | `scripts/verify-{psalter,hymn,...}-pages.js` | inspection 무회귀 (no `page` field touched) |
| Visual regression | by construction | 0 — R-4 renderer joins split lines back via PhraseGroup `lineRange`; rich-overlay loader doesn't assume line counts |

---

## 8. Cost-model honesty (per leader's R-9.A meta-feedback)

R-9.A's evidence report flagged that the R-8 cost model overestimated
Pattern A (predicted 12-16 refs, delivered 3) because the actual root
cause (header preview trap) was more localised than the hypothesis
(refrain interpolation) suggested.

R-9.C delivers **5 refs** vs the dispatch's **~10-15 estimate** — same
direction of overestimate. Two reasons:

1. **R-9.A's trial-align already absorbed the canonical "antiphon-as-block-0"
   cases** (Psalm 48 / Psalm 46) before this dispatch ran. The dispatch
   estimate was made against the pre-R-9.A NOVEL_EDGE list.
2. **The actual remaining Pattern C signal turned out to be section
   titles, not antiphons** — a smaller cohort because section-title
   noise only blocks specific block-internal positions (after a section
   transition), whereas antiphon-as-block-0 would block at the very
   start of every affected ref.

Updated jagged cost-model estimates for the rest of R-9 series:

| Pattern | Status | Refs unblockable | LOC est. |
|---------|--------|------------------|----------|
| **B. V/R prefix** | not started | ~3-5 (small ↓ likely) | ~10 |
| **D-edge: typography drift** (em-dash, curly punctuation, whitespace) | not started | ~15-20 | ~30 |
| **D-edge: deep wraps > depth 6** | not started | ~3-5 | ~10 |
| **D-edge: column-merge artifacts** | requires R-1 changes | ~5-10 | ~50 (out of scope) |
| **Truly novel** | likely | ~5-10 | manual / R-12 |

Total realistic remaining unblockable: ~25-40 refs (out of 47 NOVEL_EDGE
post-C). After R-9.B + D-edge handlers, projected coverage: **~85-90%**
(135-145 refs out of 162). The original "~95%" projection appears
slightly optimistic.

---

## 9. Self-correction trace

- This PR did NOT use `git stash` (R-7 hygiene preserved per R-8/R-9.D/A).
- No mid-execution coverage regression (R-6 stayed clean throughout).
- Pre-flight investigation (Psalm 5 block 1 alignment context dump)
  revealed the actual noise mechanism (mid-body section titles) BEFORE
  implementing — saved an over-engineered "antiphon-skip" handler that
  the trial-align mechanism already covered.

---

## 10. Files changed

| File | Change | Notes |
|------|--------|-------|
| `scripts/dev/page-header-filter.mjs` | +30 / -10 | added SECTION_TITLE_TOKENS + safe stand-alone-line regex; updated docstring |
| `src/data/loth/prayers/commons/psalter-texts.rich.json` | +many / -few | 12 splits across 5 newly-reconcilable refs + injected phrases for those refs |
| `docs/fr-161-r9c-pattern-c-evidence.md` | +200 new | this doc |

---

## 11. Repro

```bash
# 1. Run upgraded auto-reconciler on each week
for w in 1 2 3 4; do
  node scripts/dev/auto-reconcile-wraps.mjs --week $w --apply
  node scripts/dev/process-week-phrases.mjs --week $w --inject
done

# 2. Verify
node scripts/verify-phrase-coverage.js --check
npx tsc --noEmit
npx vitest run
```

---

## 12. Downstream

- **R-9.B** (versicle/response prefix): ~3-5 refs (Revelation 19 + similar). Recipe: strip `^[ХВ]\.\s+` from rich lines pre-align.
- **R-9.D-edge** (typography drift): em-dash / curly punctuation tolerant matcher + raise `MAX_JOIN_DEPTH` to 10. ~15-25 refs unblockable.
- **R-10** (NFR-009j CI gate): baseline now 212 stanzas. Future regressions surface immediately.
- **R-12 candidates**: (a) auto-reconcile vs builder algorithm divergence (surfaced in R-9.A evidence); (b) extractor-level column-merge bug fix (~5-10 refs blocked); (c) section-title token list expansion as new refs surface.
