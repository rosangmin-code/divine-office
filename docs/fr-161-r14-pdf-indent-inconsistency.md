# FR-161 R-14 — PDF indent inconsistency audit (read-only)

> **TL;DR** — User-reported case (Psalm 108:2-7 "гэв.") IS a genuine PDF wrap-indent omission: the dialogue tag sits at col 4 (base) instead of col 7 (wrap +3) even though the same page uses col 7 for other wraps. Sweep of all 29 unique NOVEL_EDGE refs across weeks 1-4 reveals that **pure same-page indent inconsistency is a minority cause**. Dominant causes: cross-page typesetting variance for re-used canticles (6 refs), rich.json content/translation drift (~5 refs), residual rich.json column-merge artifacts (1 confirmed), cross-block contamination (1), and rich.json mid-line truncation (~3). Recommended fix paths split between **rich.json data-quality dispatches** (majority of cohort) and **extractor heuristic boost** (minority — Psalm 108-style wrap inference).

@fr FR-161-R14 (task #191)
base: 4dba0dc feat(fr-161): R-13 hanging indent — phrase wrap continuation 들여쓰기 (task #190)

---

## 1. User-reported case — Psalm 108:2-7 "гэв." line

**Location**: book page 457 (`src/data/loth/psalter/week-4.json:515`), psalter.pdf physical lines 8825-8835.

**PDF raw layout (left column, baseline col 4, wrap col 7):**

```text
L8825 col=4    Едомын дээр Би гутлаа шиднэ.
L8826 col=4    Филистийн дээгүүр Би ялгууснаар хашхирна"          ← end of quoted speech
L8827 col=4    гэв.                                                ← speech tag — col 4 (BASE), not col 7 (WRAP)
L8829 col=4    Хэн намайг бэхлэгдсэн хотод авчрах вэ?
L8831 col=4    Хэн намайг Едом руу хөтлөх вэ?
L8833 col=4    Өө, Тэнгэрбурхан,
L8835 col=7      Та Өөрөө биднээс татгалзсан бус уу?              ← genuine wrap continuation at col 7
```

**Inconsistency**: `гэв.` (L8827) is logically the dialogue close-tag for the quoted speech ending at L8826 — the same logical role as L8835 ("Та Өөрөө...") plays for L8833 ("Өө, Тэнгэрбурхан,"). The typesetter chose to render `гэв.` at col 4 (treating it as a fresh verse line) but rendered `Та Өөрөө...` at col 7 (treating it as wrap continuation). Both are linguistically wrap-continuations of the line above; the PDF treats them differently.

**Extractor verdict**: faithful to PDF — produces 3 single-line phrases at indent=0 (Едомын / Филистийн / гэв.). The R-1 extractor cannot infer that `гэв.` should bind to the previous phrase because the visual indent is identical to a fresh line.

**Net rendering effect**: minor — phrase grouping treats these as 3 independent phrases rather than 2 phrases (last of which has a 2-line lineRange). Visual output stays close to PDF intent because `гэв.` is short and reads naturally as a follow-up.

---

## 2. Sweep — 29 unique NOVEL_EDGE refs (weeks 1-4)

`auto-reconcile-wraps.mjs --dry-run` per week (post R-12.3, MAX_JOIN_DEPTH=10):

| Week | Total refs | NO_SPLITS_NEEDED | NOVEL_EDGE |
|------|-----------|------------------|-----------|
| 1    | 42        | 34               | 8         |
| 2    | 39        | 31               | 8         |
| 3    | 41        | 30               | 11        |
| 4    | 40        | 27               | 13        |
| **Total ref-instances** | **162** | **122 (75%)** | **40 (25%)** |
| **Unique NOVEL_EDGE refs** | | | **29** (after de-duplication across weeks) |

Note: Several canticles appear on 2-4 pages (re-used by different weekday hours); de-dup collapses 40 instances → 29 distinct references.

---

## 3. Top inconsistency categories

### Category A — Cross-page typesetting variance (PDF-side, **6 refs**)

Same canticle text, different pages, different line splits. The PDF itself is internally inconsistent.

| Ref | Pages | Variance |
|-----|-------|----------|
| Revelation 4:11; 5:9-10, 12 | 104 / 339 / 452 | Page 104: `Алдар ба магтаалыг авах зохистой нь Тэр мөн.` ALL ON ONE PDF LINE. Page 339: split into "Алдар ба" + (col 7 wrap) "магтаалыг авах зохистой нь Тэр мөн." — uses wrap convention. |
| Revelation 11:17-18; 12:10b-12a | 137 / 257 / 483 | Same pattern — different splits per page. |
| Ephesians 1:3-10 | 87 / 206 / 325 / 436 | + rich.json column-merge (see Cat C). |
| Colossians 1:12-20 | 119 / 240 / 355 / 467 | + content drift (see Cat B). |
| Psalm 117:1-2 | 162 / 394 | Page 162 (L2999): split. Page 394 (L7572): `ЭЗЭНий үнэн үүрд мөнх, ЭЗЭНийг магтагтун!` ON ONE LINE. |
| Psalm 135:1-12 | 383 / 428 | + content drift (Далайнууд / Далайнуудад). |

**Suggested fix**: rich.json patch — accept the more-detailed split as canonical for ALL pages of the canticle. The renderer can produce consistent output even when one PDF page compresses what another expands. (Option **a — rich.json patch**.)

### Category B — Content / translation drift (**~5 refs**)

rich.json wording differs from PDF text at single-token level. Auto-reconciler cannot align because the words don't match.

| Ref | rich.json | PDF | Note |
|-----|-----------|-----|------|
| Colossians 1:12-20 line 7 | `Өөртэйгөө **эвлэрүүлэхийг** бас таалсан билээ.` | `Өөртэйгөө **эвлэрүүлснийг** бас таалсан билээ.` | infinitive vs past participle |
| Psalm 135:1-12 line 5 | `**Далайнууд** ба` | `**Далайнуудад** ба` | nominative vs dative-locative |
| Daniel 3:57-88 block 14 | `... үүрд мөнх **өргөмжлөх** болтугай` | `... үүрд мөнх **өргөмжлөгтүн**` / `**өргөмжлөцгөөе**` | imperfect-imperative variants |
| Jeremiah 31:10-14 | `Тэд **иржу**, Сионы өндөрлөгүүд дээр` | (likely `ирж` / `ирээд`) | verb form |
| Psalm 119:145-152 / Wisdom 9 / Psalm 117 | various | various | sampled but not exhaustively diffed |

**Suggested fix**: out of FR-161 scope — content correction belongs in a separate translation review track. **Do NOT fix as indent issue.** Mark these refs as `needsManualReconcile: true` and exclude from R-2 builder injection. (Option **b — PDF accept (renderer leaves rich.json text intact)**, plus a separate translation-review dispatch.)

### Category C — Rich.json column-merge artifacts (residual post-R-12.1, **≥1 confirmed**)

R-12.1 fixed the R-1 extractor's column-cut heuristic, but rich.json itself still carries pre-R-12.1 artifacts where two PDF columns were concatenated into one rich.json line.

**Confirmed**: Ephesians 1:3-10 block 1 line 3 contains:

```text
"Хишиг ивээлээ бидэнд хүртээсэн билээ. өвийг хуваалцахад биднийг боломжтой болгосон"
```

Two distinct sentences — first ends with period, second starts with lowercase fragment. PDF L1582 left col has `"Хишиг ивээлээ бидэнд хүртээсэн билээ."` and PDF L1579 right col has `"өвийг хуваалцахад биднийг боломжтой болгосон"`. Past extraction concatenated across columns.

**Suggested fix**: rich.json patch — split into two lines. (Option **a — rich.json patch**.)

### Category D — Cross-block contamination (**1 ref**)

Psalm 137:1-6 page 449 — first rich.json line is `"Тантай, Ариун Сүнсний нэгдэлтэй, үүрд мө"` which is a Trinity-formula concluding prayer fragment, NOT psalm content. Past extraction landed prayer block text inside the psalm block.

**Suggested fix**: rich.json patch — drop the contaminating prefix line. (Option **a**.)

### Category E — Rich.json mid-line truncation (**~3 refs**)

| Ref | Truncated line | Likely full text |
|-----|---------------|------------------|
| Psalm 81:2-11 page 250 block 1 | `"Хүч маань болсон Тэнгэрбурханд баярлан **д**"` | `... баярлан дуул...` |
| Psalm 137:1-6 page 449 block 0 | `"Тантай, Ариун Сүнсний нэгдэлтэй, үүрд **мө**"` | (and this is also Cat D contamination) |
| Psalm 144:1-10 page 445 block 0 | `"Гарыг минь дайтахад,"` | full but page-mapping issue (PDF L8578 / L9285 has this on different declared pages) |

**Suggested fix**: rich.json patch — restore truncated text from PDF. (Option **a**.)

### Category F — Pure single-page wrap-indent omission (USER-REPORTED CLASS, **~minority**)

The Psalm 108:2-7 "гэв." case. Single-page PDF where typesetter put a logical wrap-continuation at base col instead of wrap col. Verified case so far: 1 (Psalm 108). Other deferred refs were not pure-Cat-F on inspection — most fell into Cat A-E.

**Suggested fix**: extractor heuristic boost (Option **c — extractor 보강**) — Stage 2 punctuation heuristic could flag a line whose previous line ends with a closing quote or comma as a probable wrap-continuation regardless of visual col. This is a follow-up R-12.5+ candidate but covers a small slice of the cohort, so **expected delivery is low** per "earlier generic absorbs later specific" cost-model from MEMORY.

### Category G — Structural divergence / page-mapping errors (**~3 refs**)

`Psalm 30:2-13` block 4 (cursor=82 mismatch) — PDF and rich.json have different ordering or extra/missing lines around this block. `Psalm 21:2-8, 14` block 3 ("Учир нь хаан ЭЗЭНд түшдэг бөгөөд" not found at depth=4 cursor=57). `Psalm 144:1-10` declared page=445 but rich first line found at PDF physical lines 8578 / 9285 — declared page may be wrong or PDF has different content at declared page.

**Suggested fix**: rich.json patch + page-number audit (Option **a + scripts/audit-psalter-ref-consistency.js re-run** per CLAUDE.md NFR-009c).

---

## 4. Category counts (29 unique NOVEL_EDGE refs)

| Category | Count | Fix path |
|----------|-------|----------|
| A — Cross-page typesetting variance | 6 | rich.json patch |
| B — Content / translation drift | ~5 | translation review (separate track) |
| C — Column-merge artifact (residual) | ≥1 | rich.json patch |
| D — Cross-block contamination | 1 | rich.json patch |
| E — Mid-line truncation | ~3 | rich.json patch |
| F — Pure single-page wrap omission (USER-REPORTED CLASS) | minority | extractor heuristic boost (R-12.5+) |
| G — Structural divergence / page mapping | ~3 | rich.json patch + page audit |
| Overlap / unclassified | remainder | per-ref triage |

**Net implication**: **majority (~15+ refs of 29) are rich.json data-quality issues**, not PDF inconsistency or extractor weakness. The user-reported pattern (Cat F) is real but accounts for a small subset of the deferred cohort.

---

## 5. Recommended next dispatch sequence

1. **R-14a — rich.json data-quality batch (Cat A + C + D + E)**: ~10 refs, manual rich.json edits (split joined lines, remove contamination, restore truncations). Run R-2 builder + R-6 verifier after. Expected coverage: 96 → ~104-106 refs.
2. **R-14b — content/translation drift audit (Cat B)**: ~5 refs. Either correct rich.json to match PDF, or document as intentional retranslation. Out of FR-161 immediate scope.
3. **R-14c — page-mapping audit (Cat G)**: re-run `scripts/audit-psalter-ref-consistency.js` for the 3 problem refs; correct `page` values in week-*.json where wrong.
4. **R-12.5 — extractor wrap-inference heuristic (Cat F)**: optional, low ROI. Cost-model "earlier generic absorbs later specific" suggests delivery will be 1-2 refs incremental (Psalm 108 + maybe 1 more). Defer until R-14a/c shipped and the residual cohort re-evaluated.

---

## 6. Constraints + caveats

- **Read-only audit** per dispatch. No code/JSON modified. Fix dispatches to be split by category.
- Sample PDF inspection covered the user-reported case (Psalm 108) and 5 NOVEL_EDGE refs at depth (Revelation 4:11, Colossians 1:12-20, Psalm 117:1-2, Psalm 135:1-12, Ephesians 1:3-10, Daniel 3:57-88, Psalm 137:1-6, Psalm 30:2-13). The remaining 21 refs were assigned to categories based on failure-message pattern matching; some refs may shift category on detailed inspection.
- Cat F (pure wrap-indent omission) was confirmed on Psalm 108 only. Other deferred refs that *might* fall into Cat F on inspection were NOT exhaustively re-checked — so the "minority" estimate is conservative. R-12.5 dispatch should re-survey before implementation.
- Mongolian-fluent reviewer recommended for Cat B (translation drift) — case-ending suffixes (-ад, -ийг, -лөгтүн) require linguistic judgement, not just string match.
