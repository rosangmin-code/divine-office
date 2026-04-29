# FR-161 R-8 Phase 1 — week-1 phrase ingest evidence

> **TL;DR** — Applied R-7 reconciliation pattern to **week-1 (42 refs)**: **24 refs (57%) injected** with phrases (1 pilot from R-7 + 23 new) after auto-applying **48 wrap-line splits across 18 refs**. **18 refs (43%) deferred to R-9** as 4 newly-classified novel-edge patterns. R-6 verifier 0 violations across 44 inspected stanzas. All baseline tests + tsc clean.

@fr FR-161-R8 (task #180)
base: 11c8ab4 feat(fr-161): R-7 pilot — Psalm 110:1-5,7 phrases inject + evidence (task #179)

---

## 1. Aggregate stats

| Metric | Count | % |
|--------|-------|---|
| Refs scanned (week-1, deduped psalm + canticle) | 42 | 100% |
| **Already PASS pre-reconcile (R-7 + first-try matches)** | 6 | 14% |
| **Auto-reconciled via line splits → PASS** | 18 | 43% |
| **Deferred to R-9 (novel edge)** | 18 | 43% |
| Phrases-injected refs (this PR) | **24** | 57% |
| Total wrap-line splits applied | 48 | — |
| Stanzas inspected by R-6 verifier | 44 | — |
| R-6 violations | 0 | — |

---

## 2. Tooling built (`scripts/dev/`)

Two one-off harnesses replace per-ref manual reconciliation. Both are
operator tools, not shipped runtime.

### 2.1 `process-week-phrases.mjs`

Discovers all `(ref, page)` tuples in `src/data/loth/psalter/week-N.json`,
runs the R-1 extractor for each ref's PDF page (left + right columns to
catch verse-spillover), invokes the R-2 builder in dry-run mode, and
classifies the verdict per ref:

| Verdict | Meaning |
|---------|---------|
| `PASS` | atomic gate passes — phrases ready to inject |
| `DRIFT_LINE_COUNT` | LINE_COUNT_MISMATCH — pre-joined wraps in rich.json |
| `DRIFT_NO_MATCH` | NO_MATCHING_EXTRACTOR_STANZA — first line absent |
| `INCOMPLETE_COVERAGE` | rich has stanza blocks the extractor didn't cover |

CLI:
```bash
node scripts/dev/process-week-phrases.mjs --week 1                      # dry-run summary
node scripts/dev/process-week-phrases.mjs --week 1 --json /tmp/plan.json # save full plan JSON
node scripts/dev/process-week-phrases.mjs --week 1 --inject              # batch atomic inject
```

### 2.2 `auto-reconcile-wraps.mjs`

Implements the R-7 option (b) pattern at scale: for each rich.json
`kind:'stanza'` block whose lines don't align line-for-line with
extractor lines, attempts to align by joining 1 to 6 consecutive
extractor lines into one rich line. When alignment succeeds, splits the
rich line back into PDF-visual lines (preserving `indent`/`role`
metadata).

Verdicts:

| Verdict | Meaning |
|---------|---------|
| `NO_SPLITS_NEEDED` | rich already line-for-line aligned (R-7 pilot type) |
| `RECONCILABLE` | alignment found; N splits will be applied |
| `NOVEL_EDGE` | alignment failed at some rich line — different drift pattern |
| `NO_RICH_BLOCKS` | no `stanzasRich.blocks` to align |

CLI:
```bash
node scripts/dev/auto-reconcile-wraps.mjs --week 1                # dry-run summary
node scripts/dev/auto-reconcile-wraps.mjs --week 1 --apply        # apply splits to rich.json
node scripts/dev/auto-reconcile-wraps.mjs --week 1 --json out.json # save plan
```

The two tools compose: run auto-reconcile-wraps `--apply` first, then
process-week-phrases `--inject` to land phrases.

---

## 3. Pipeline executed

```bash
# 1. discover scope
node scripts/dev/process-week-phrases.mjs --week 1
# → 6 PASS, 36 DRIFT_LINE_COUNT

# 2. auto-reconcile rich.json line splits
node scripts/dev/auto-reconcile-wraps.mjs --week 1 --apply
# → 18 RECONCILABLE (48 splits), 18 NOVEL_EDGE, 6 NO_SPLITS_NEEDED

# 3. re-discover post-reconcile
node scripts/dev/process-week-phrases.mjs --week 1
# → 24 PASS, 18 DRIFT_LINE_COUNT (the NOVEL_EDGE refs)

# 4. inject phrases for the 24 PASS refs (atomic batch)
node scripts/dev/process-week-phrases.mjs --week 1 --inject
# → inject OK — 24 ref(s) updated

# 5. verify
node scripts/verify-phrase-coverage.js --check
# → OK — 44 stanza(s) with phrases inspected, 0 violations
```

---

## 4. Per-ref outcome

### 4.1 Injected (24 refs)

Already-PASS pre-reconcile (6):

| Ref | Page | Stanzas | Splits applied |
|-----|------|---------|----------------|
| Psalm 110:1-5, 7 | 68 | 2 | 0 (R-7 pilot, already injected) |
| Psalm 29:1-10 | 80 | n/a | 0 |
| Psalm 15:1-5 | 86 | n/a | 0 |
| Revelation 4:11; 5:9-10, 12 | 104 | n/a | 0 |
| Psalm 27:7-14 | 118 | n/a | 0 |
| Psalm 116:10-19 | 289 | n/a | 0 |

Auto-reconciled (18, total 48 splits):

| Ref | Page | Splits | Notes |
|-----|------|--------|-------|
| Psalm 63:2-9 | 58 | 1 | single wrap pair across 2 blocks |
| Psalm 149:1-9 | 64 | 3 | refrain stanza wraps |
| Psalm 114:1-8 | 70 | 1 | |
| 1 Chronicles 29:10-13 | 79 | 1 | canticle |
| Psalm 24:1-10 | 92 | 6 | dense wrap-pair stanza (2 blocks) |
| Psalm 20:2-8 | 101 | 4 | |
| Psalm 36:6-13 | 109 | 4 | |
| Judith 16:2-3a, 13-15 | 111 | 1 | canticle |
| Psalm 47:2-10 | 112 | 4 | |
| Psalm 27:1-6 | 116 | 3 | |
| Psalm 57:2-12 | 125 | 2 | |
| Psalm 32:1-11 | 135 | 3 | |
| Revelation 11:17-18; 12:10b-12a | 137 | 1 | |
| Psalm 100:1-5 | 147 | 1 | |
| Revelation 15:3-4 | 154 | 3 | |
| Psalm 119:145-152 | 159 | 6 | dense wrap stanza |
| Psalm 113:1-9 | 287 | 2 | |
| Philippians 2:6-11 | 54 | 2 | canticle |

### 4.2 Deferred to R-9 (18 refs, by edge-pattern)

The auto-reconciler's alignment failed for 18 refs. Inspecting the
failure points reveals **four newly-classified edge patterns** that
need dedicated handling logic. None of these are blocked by R-1/R-2/R-3
contracts; they are rich.json structural shapes the simple "join N PDF
lines into 1 rich line" model doesn't cover.

#### Pattern A — Refrain interpolation (4+ refs)

Rich.json spells out repeated refrains literally; the PDF source shows
each refrain once with implicit/visual repetition cues. Auto-aligner
sees N refrain lines in rich vs 1 in extractor and bails.

Affected refs:
- **Daniel 3:57-88, 56** (canticle) — `block 3` first line "Наран саран хоёр оо," — cosmic-praise canticle with "Эзэнийг магтан, мөнхөд алдаршуулагтун!" refrain after every verse
- **Tobit 13:1-8** (canticle) — `block 4` similar refrain echo
- **Jeremiah 31:10-14** (canticle) — `block 1`
- **Exodus 15:1-4a, 8-13, 17-18** (canticle) — `block 2`

R-9 recipe: detect "rich line N+1 == rich line N+m" (literal repetition);
match each rich repetition against ONE extractor occurrence + a refrain
indicator (`role:'refrain'` or row position).

#### Pattern B — Versicle/Response prefix (1 ref)

Rich uses `Х.` (Mongolian Cyrillic response prefix) at the start of a
line; the PDF / extractor sees the same content without the prefix.

Affected: **Revelation 19:1-7** — `block 0` line 6 "Х. Аллэлуяа! (аллэлуяа!)."

R-9 recipe: strip leading `Х. ` / `В. ` from rich lines before alignment,
or treat them as `kind:'versicle'`/`'response'` spans (which already
exists in PrayerSpan schema).

#### Pattern C — Antiphon/header bleed into block 0 (3+ refs)

Rich block 0 first line is the antiphon or section header text rather
than the psalm body's first line. Extractor never sees this line in
the psalm body extraction.

Affected:
- **Psalm 5:2-10, 12-13** — block 0 first line is a long antiphon-style
  text "Үгийг зүрх сэтгэлийнхээ зочин болгон, хүлээн авдаг..." not in the PDF psalm body
- **Psalm 48:2-12** — block 0 first line "Тэнгэрбурханы маань хот, ариун ууланд" not in extractor stream
- **Psalm 46:2-12** — same shape

R-9 recipe: detect "rich block 0 first line absent from extractor stream"
+ if the rest of the block aligns starting at extractor[0], drop the
first rich line as antiphon (or move to a separate `antiphon` field).

#### Pattern D — Mid-stream drift / multi-page span (10+ refs)

Auto-aligner finds the rich first line but drifts at some mid-block line,
suggesting either (a) extractor missed PDF lines (whitespace/quote edge
case the R-1 normaliser doesn't cover yet), (b) rich.json mid-block edits
that diverged from PDF source, or (c) the psalm body spans further than
left+right of one physical page (extractor only fetched 1 physical page).

Affected:
- **Psalm 11:1-7** — `block 0` line 6 drift
- **Ephesians 1:3-10** — `block 1` line 3
- **Psalm 33:1-9** — `block 2` first line not found from cursor 58
- **Psalm 21:2-8, 14** — `block 2` first line not found from cursor 32
- **Colossians 1:12-20** — `block 0` line 4
- **Psalm 30:2-13** — `block 2` first line not found from cursor 56
- **Psalm 51:3-19** — `block 1` line 3
- **Isaiah 45:15-26** — `block 1` line 4
- **Psalm 41:2-14** — `block 1` first line not found from cursor 57
- **Psalm 117:1-2** — `block 0` line 4

R-9 recipe: extend extractor scope to also fetch page+1 / page+2 (some
psalms span beyond the 2-up spread); add per-line whitespace-tolerant
matcher for the few that diverged due to typography edits.

### 4.3 Why batch-atomic still passed

R-2 builder's atomic gate is per `injectPhrasesIntoRichData` call. The
24-ref inject batch contained ONLY PASS refs (NOVEL_EDGE refs were
filtered out before inject). So the gate was honoured; deferred refs
remain untouched in rich.json.

---

## 5. Verification

| Check | Command | Result |
|-------|---------|--------|
| TypeScript | `npx tsc --noEmit` | exit 0 |
| Unit tests | `npx vitest run` | Test Files 40 passed (40), Tests 647 passed (647), 4.88s |
| Phrase coverage | `node scripts/verify-phrase-coverage.js --check` | OK — 44 stanza(s) with phrases inspected, 0 violations exit 0 |
| 6 page verifiers (NFR-009d) | `node scripts/verify-{psalter,hymn,psalter-body,compline,propers,sanctoral}-pages.js` | inspection-based 무회귀 (no `page` field touched in this commit; worktree env can't symlink `parsed_data/full_pdf.txt` so live run deferred to operator) |
| Visual regression | by construction | 0 — R-4 renderer joins split lines back via PhraseGroup `lineRange`; rich-AST loader (`rich-overlay.ts`) doesn't assume line counts |

---

## 6. R-9 (Phase 2) recommendations

Phase 2 (full week-2..week-4 + sanctoral + propers) needs the four
edge-pattern handlers above implemented in the auto-reconciler before
mass dispatch. Estimated work:

| Pattern | Implementation | LOC | Refs unblocked (est.) |
|---------|----------------|-----|-----------------------|
| A. Refrain interpolation | rich-side dedup + match-once | ~30 | 4-8 per week × 4 weeks = ~24 |
| B. Versicle prefix strip | regex `^[ХВ]\.\s+` strip pre-align | ~10 | 1-3 per week × 4 weeks = ~8 |
| C. Antiphon-as-block-0 | detect + drop or migrate to antiphon field | ~40 | 3-6 per week × 4 weeks = ~18 |
| D. Mid-stream drift / multi-page | extractor page+1/+2 + whitespace-tolerant matcher | ~50 | 10 per week × 4 weeks = ~40 |

**Recommendation**: ship R-9 as a 4-step series — one pattern per
sub-WI — so each pattern's reconciler can be reviewed independently.
Apply each pattern across all 4 weeks, then mass inject.

Once all four patterns ship, the success rate should reach ~95%+ across
the full corpus (100+ refs). Remaining refs become per-ref manual fixes
(< 5).

---

## 7. Files changed

| File | Change | Notes |
|------|--------|-------|
| `src/data/loth/prayers/commons/psalter-texts.rich.json` | +4387 / -210 | 48 wrap splits + phrases on 24 refs (44 stanzas) |
| `scripts/dev/process-week-phrases.mjs` | +220 new | week-N discover + dry-run + atomic inject harness |
| `scripts/dev/auto-reconcile-wraps.mjs` | +290 new | option (b) auto-applier (R-7 → R-8 scale-up) |
| `docs/fr-161-r8-phase1-week1-evidence.md` | +200 new | this doc |

---

## 8. Repro

```bash
# 1. discover scope (week-N parameterised)
node scripts/dev/process-week-phrases.mjs --week 1

# 2. apply auto-reconcile splits (R-7 option b at scale)
node scripts/dev/auto-reconcile-wraps.mjs --week 1 --apply

# 3. inject phrases for all PASS refs
node scripts/dev/process-week-phrases.mjs --week 1 --inject

# 4. verify (R-6 NFR-009j gate)
node scripts/verify-phrase-coverage.js --check

# 5. regression
npx tsc --noEmit
npx vitest run
```

---

## 9. Self-correction trace

R-7 evidence noted a `git stash` violation. This PR's pipeline did NOT
use stash — file copy / WIP-commit pattern was used wherever needed.
The auto-reconciler writes rich.json directly (idempotent re-runs fine);
no temporary state-bouncing required.
