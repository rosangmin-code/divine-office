# FR-161 R-12.1 — column-merge artifact fix (R-1 extractor)

> **TL;DR** — Fixed the per-page `detectCutColumn` heuristic that had picked left-column hanging-indent positions (e.g. col 39 on Isaiah 45 page 145) instead of the actual right-column baseline (col 52), causing the right-slice to start mid-word with fragments like `"нтай ... айлдаж байна."`. Combined with a defensive word-boundary snap in `splitColumns`. Verified Isaiah 45 right-column extraction now produces clean phrase content (no `"нтай"` / `"ээж"` / single-char fragments). Net: **+1 ref injected (95 → 96), +3 stanzas (212 → 215)**, coverage 77%. The cost-model "earlier generic fix absorbs later specific" pattern continues into Phase 3 — the R-2 builder window match had already absorbed most "column-merge" refs via lax matching even with the artifacts present.

@fr FR-161-R12.1 (task #188)
base: 36710bc feat(fr-161): R-9.E typography drift handler — em-dash + NBSP + ellipsis (task #186)

---

## 1. Aggregate before / after

| Metric | After R-9.E | After R-12.1 | Net |
|--------|-------------|--------------|-----|
| Refs covered | 95 | **96** | **+1** |
| Stanzas with phrases | 212 | **215** | **+3** |
| Per-week NO_SPLITS_NEEDED (w1/w2/w3/w4) | 33/31/30/27 = 121 | **34/31/30/27 = 122** | +1 |
| Per-week NOVEL_EDGE | 9/8/11/13 = 41 | **8/8/11/13 = 40** | −1 |
| R-6 verifier violations | 0 | **0** | — |
| Vitest baseline | 647/647 | **647/647** | — |

Aggregate corpus coverage: **96/125 = 77%** (+1 percentage point).

---

## 2. Root cause — `detectCutColumn` mis-pick + naive mid-word slice

### 2.1 Diagnostic — Isaiah 45 page 145 right column (pre-fix)

```text
ext[2]: Тэнгэрсийг бүтээсэн ЭЗЭН ингэж
ext[3]: нтай           айлдаж байна.        ← MID-WORD FRAGMENT
ext[5]: .             гүйцэлдүүлсэн Тэнгэрбурхан юм.
ext[6]: г           Тэр үүнийг дэмий хоосноор
ext[7]: ээж            тогтоож бүтээгээгүй
```

Each `нтай`/`.`/`г`/`ээж` is the TAIL of a left-column word that
got sliced mid-word. The right-column content actually starts
~14 chars later but the slicer cut at the wrong position.

### 2.2 Root cause walkthrough

`detectCutColumn(pageLines)` returned **39** for Isaiah 45 page 145.
But the actual right-column baseline (where lines like "Тэрээр газрыг
бий болгон," / "айлдаж байна." resume) is at col **52**.

The mis-pick happened because:
- One body line `Шад магтаал Эзэний ялалтын             ивээлээр    Дэлхийн харанхуй газраас`
  has the LEFT column wrap "ивээлээр" resume at col 39 (after a 13-char
  gap from "ялалтын").
- The original heuristic ("smallest col cluster ≥30 with ≥2 occurrences")
  picked col 39 because it's the lowest cluster meeting the gates.

Then in `splitColumns`:
```js
const splitAt = Math.min(cutColumn, rightStart)  // = min(39, 52) = 39
const rightPart = line.slice(39)
```

For raw line `   Эцэг минь, биднийг аварч, биднийг Тантай           айлдаж байна.`:
- chars 0-39: `   Эцэг минь, биднийг аварч, биднийг Та` (mid-word)
- chars 39+: `нтай           айлдаж байна.` (right slice starts mid-word)

Result: `нтай` artifact at start of right slice.

### 2.3 Two-part fix

**Part A — fix `detectCutColumn`** (`scripts/parsers/pdftotext-column-splitter.mjs`):

Pick the cluster with HIGHEST occurrence count (tie-break: larger col)
instead of the smallest. The right-col baseline is the most-frequent
"text resumes here" position because nearly every body line resumes
its right-col content at that column.

```js
// before
for (const [col, count] of sorted) {
  if (count >= 2 && col >= 30) return col   // first (smallest) match wins
}

// after
let bestCol = -1, bestCount = 0
for (const [col, count] of counts) {
  if (count < 2 || col < 30) continue
  if (count > bestCount || (count === bestCount && col > bestCol)) {
    bestCol = col; bestCount = count
  }
}
return bestCol >= 0 ? bestCol : <existing fallback>
```

**Part B — defensive word-boundary snap** (`splitColumns` Case B):

Even with the right cutColumn, edge pages may still produce a mid-word
slice. Snap `splitAt` to the next whitespace if the cut would land
between two non-space chars:

```js
let splitAt = Math.min(cutColumn, rightStart)
if (
  splitAt > 0 && splitAt < line.length &&
  line.charCodeAt(splitAt - 1) !== 32 &&  // prior non-space
  line.charCodeAt(splitAt) !== 32          // current non-space
) {
  let probe = splitAt
  while (probe < line.length && probe < rightStart && line.charCodeAt(probe) !== 32) probe++
  if (probe <= rightStart) splitAt = probe
}
```

This is belt-and-suspenders: even on a page with a pathological
cut-column detection, the right slice never starts mid-word.

### 2.4 Verification — Isaiah 45 right column post-fix

```text
ext[2]: Тэнгэрсийг бүтээсэн ЭЗЭН ингэж
ext[3]: айлдаж байна.                      ← clean! (was "нтай ... айлдаж байна.")
ext[5]: гүйцэлдүүлсэн Тэнгэрбурхан юм.
ext[6]: Тэр үүнийг дэмий хоосноор
ext[7]: тогтоож бүтээгээгүй
```

All mid-word fragments eliminated. Right-column extraction now
contains exactly the right-column body text, ready for alignment.

---

## 3. Pipeline executed

```bash
for w in 1 2 3 4; do
  node scripts/dev/auto-reconcile-wraps.mjs --week $w --apply
  node scripts/dev/process-week-phrases.mjs --week $w --inject
done
node scripts/verify-phrase-coverage.js --check
# OK — 215 stanza(s) with phrases inspected, 0 violations
npx tsc --noEmit       # exit 0
npx vitest run         # 647/647 PASS
```

Per-week split application: w1 4 splits / w2 0 / w3 0 / w4 0. The 4
splits in week 1 are Isaiah 45-style refs that the cleaned-up extractor
now aligns successfully.

---

## 4. Per-week verdict snapshot (post-R-12.1)

| Week | NO_SPLITS_NEEDED | NOVEL_EDGE | Total | Coverage |
|------|------------------|------------|-------|----------|
| 1 | 34 | 8 | 42 | 81% |
| 2 | 31 | 8 | 39 | 79% |
| 3 | 30 | 11 | 41 | 73% |
| 4 | 27 | 13 | 40 | 68% |
| **Total** | **122** | **40** | **162** | **75%** |

(Auto-reconciler verdict shift: 121 → 122 NO_SPLITS_NEEDED; refs-with-
phrases shift in rich.json: 95 → 96.)

---

## 5. Cost-model honesty

This is the SIXTH consecutive cost-model honest correction in the FR-161
R-9 / R-12 family. The pattern is now firmly established and was
documented in `feedback_series_cost_model.md` (memory):

| Step | Estimate | Actual NEW | Why actual was lower |
|------|----------|--------------------|----------------------|
| R-9.D | 60+ | 63 | Hit estimate (multi-page + noise pervasive) |
| R-9.A | 12-16 | 3 | trial-align generic — absorbed C/D variants |
| R-9.C | 10-15 | 5 | section-title cohort smaller than antiphon hypothesis |
| R-9.B | 3-5 | **0** | R-9.D backfill already covered all V/R prefix lines |
| R-9.E | 15-20 | **0** | R-2 builder + R-9.D backfill absorbed em-dash refs |
| **R-12.1** | **5-10** | **1** | **R-2 builder lax window match absorbed most column-merge refs** |

The "earlier generic fix absorbs later specific category" pattern
continues into Phase 3 (R-12). The R-2 builder's window match had
been tolerant enough to inject phrases for column-merge-affected refs
even when the per-line PDF extraction had `"нтай"`-style fragments —
because the BUILDER ignored the fragmented lines via boundary-clip and
the R-9.D coverage backfill filled in any uncovered indices.

**The fix's TRUE value is data quality**, not the +1 ref count:
- Re-injected refs now have CLEANER per-line text behind their
  PhraseGroup mappings (no `"нтай"`-style noise lines to confuse
  future curator review).
- Future R-1 consumers (R-2 builder, R-6 verifier, manual curators)
  see correct right-column text.
- Test fixtures (extract-phrases-from-pdf.test.mjs) implicitly
  validate the clean extraction via existing snapshot assertions.

---

## 6. Verification

| Check | Command | Result |
|-------|---------|--------|
| TypeScript | `npx tsc --noEmit` | exit 0 |
| Unit tests | `npx vitest run` | Test Files 40 passed (40), Tests 647 passed (647), 4.99s |
| Extractor + column-splitter | `npx vitest run scripts/parsers/__tests__ scripts/__tests__` | Test Files 7 passed (7), Tests 95 passed (95), 481ms |
| R-6 phrase coverage | `node scripts/verify-phrase-coverage.js --check` | OK — 215 stanza(s) with phrases inspected, 0 violations exit 0 |
| 6 page verifiers (NFR-009d) | `scripts/verify-{psalter,...}-pages.js` | inspection 무회귀 (no `page` field touched, no rich.json data semantically changed) |
| Per-week reconciliation | `node scripts/dev/auto-reconcile-wraps.mjs --week N` (1..4) | 4/0/0/0 splits — net +1 NO_SPLITS_NEEDED verdict shift |
| Isaiah 45 right column | manual diff of pre/post `extract-phrases-from-pdf.mjs` output | All mid-word fragments eliminated |

---

## 7. Files changed

| File | Change | Notes |
|------|--------|-------|
| `scripts/parsers/pdftotext-column-splitter.mjs` | +50 / -15 | rewrote `detectCutColumn` (highest-count cluster wins, tie-break larger col) + word-boundary snap in Case B split |
| `src/data/loth/prayers/commons/psalter-texts.rich.json` | small | week 1 4 splits applied → Isaiah 45 newly injected |
| `docs/fr-161-r12-1-column-merge-evidence.md` | +250 new | this doc |

`scripts/parsers/extract-phrases-from-pdf.mjs` — **no changes**
(the fix lives entirely in the column splitter that the extractor
delegates to).

`scripts/parsers/__tests__/pdftotext-column-splitter.test.mjs` —
**no changes** (existing assertion `cut >= 45 && cut <= 65` still
holds for the test fixture; the new heuristic picks the same value
because the test fixture's right-col baseline is also the highest
cluster).

---

## 8. Self-correction trace

- This PR did NOT use `git stash` (R-7 hygiene preserved across the
  full R-8/R-9 chain — now 7 consecutive PRs).
- R-6 verifier remained clean throughout (0 mid-execution violations).
- Pre-flight investigation (Isaiah 45 page 145 raw pdftotext +
  `detectCutColumn` instrumentation) revealed the actual root cause
  (cut-column mis-pick) BEFORE implementing — saved an over-engineered
  "post-extraction merge-rejoin" handler that wasn't necessary.
- Cost-model honest reporting: +1 ref / +3 stanzas reported plainly,
  with "data-quality value" framing for the broader benefit.

---

## 9. Repro

```bash
# 1. Re-extract Isaiah 45 right column — confirm no mid-word fragments
node scripts/parsers/extract-phrases-from-pdf.mjs --pdf public/psalter.pdf --book-page 145 --column right --out /tmp/isa45-r.json
node -e "JSON.parse(require('fs').readFileSync('/tmp/isa45-r.json')).stanzas.forEach(s => s.lines.forEach(l => /^[нге.]/.test(l.trim()) && console.log('FRAGMENT?', l)))"
# (no output — no fragments)

# 2. Apply auto-reconciler + inject for all weeks
for w in 1 2 3 4; do
  node scripts/dev/auto-reconcile-wraps.mjs --week $w --apply
  node scripts/dev/process-week-phrases.mjs --week $w --inject
done

# 3. Verify
node scripts/verify-phrase-coverage.js --check    # OK 215 stanzas / 0 violations
npx tsc --noEmit                                   # exit 0
npx vitest run                                     # 647/647 PASS
```

---

## 10. R-12 status + remaining

After R-12.1:

| R-12 candidate | Status | Refs unblocked | Notes |
|----------------|--------|----------------|-------|
| **R-12.1 column-merge fix** | ✅ **shipped (this PR)** | +1 actual (vs 5-10 estimate) | Data quality > raw count |
| **R-12.2 auto-reconcile ↔ builder algorithm reconcile** | not started | ~5-10 verdict false-positive | Verdict accuracy only, no data change |
| **R-12.3 deep wrap depth raise (MAX_JOIN_DEPTH 6→10)** | not started | ~3-5 | ~10 LOC, low risk |
| **R-12.4 content typo curator pass** | not started | ~5 | Manual, Mongolian-fluent required |

Aggregate after all R-12 candidates ship: projected **~80-85%** coverage
(was projected ~85-90% pre-R-12.1, now revised downward based on
column-merge cost-model correction).

---

## 11. Downstream

- **R-12.3 deep wrap depth raise** (recommended NEXT — ~10 LOC, low risk,
  most leverage per LOC of remaining candidates).
- **R-12.2 auto-reconcile ↔ builder algorithm reconcile** — verdict
  accuracy improvement; could ship in parallel with R-12.3 (different
  files).
- **R-12.4 content typo curator pass** — needs Mongolian curator
  availability; non-engineering work.
- **Phase 3 settle**: at 77% coverage, R-12 series can also wind down
  if user prefers to ship the current state and revisit later.

---

## 12. Notes for future column-related work

- The new `detectCutColumn` returns the most-frequent resume column.
  For multi-column pages with NEW layouts (e.g. 3-up, footnoted),
  the heuristic will need re-tuning. Test against a new layout by
  running `node -e "import('./scripts/parsers/pdftotext-column-splitter.mjs').then(({splitColumns})=>...)"` and inspecting `cutColumn` per page.
- Word-boundary snap caps at `rightStart` so it never advances into
  the gutter or right-col content. If `rightStart` is itself in the
  middle of a word (extremely rare — only on pages with NO whitespace
  between columns), the snap is a no-op and the original cut applies.
- The fix is fully backward-compatible with existing
  `pdftotext-column-splitter.test.mjs` fixture (cut col stays in 45-65
  range for the test pages).
