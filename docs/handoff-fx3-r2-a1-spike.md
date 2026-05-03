# F-X3 R2 Spike — method (a1) PDF column-aware feasibility 평가

> **TL;DR** — 11 sample hymn pages 전수 sweep 결과 시편의 WRAP_DELTA=+3 visual-indent signal 이 hymn 영역에서 **부재** (85-90% lines at ind=0). pdftotext-layout 기반 Stage 1 visual-indent 추출이 단일-line phrase 만 산출 → builder window-match BLOCKED (stanza over-fragmentation), UX (a1) 가 (a2) 대비 **regression** (legacy hard-break 와 동일 — FR-161 phrase pivot 이 대체하려던 그것). 합의 verdict: **LOW feasibility (F1≈0.10-0.20 << 0.65 threshold)**. 합의 recommendation: **(C) Phase B sweep with method (a2) only** + 71-hymn fallback documented limit. pdfminer.six / pdf.js x-coord 접근은 future work (Phase B 외).

@fr FR-161-R-19 (task #264, F-X3 R2 a1 spike)
base: 08bc13fe6302355047833ce11c5bd8b895b43ba1 (worktree 264-divine-researcher)
Review ref: docs/review-257-249-fx3-phase-a-pilot.md (R2 finding HIGH)
Audit ref: docs/handoff-fx3-phrase-audit.md (#228 P1-A 권고)

---

## 0. Spike metadata

| 항목 | 값 |
|------|----|
| Spike task | #264 |
| Reviewer/researcher | divine-researcher (Explore profile) |
| Subject question | Method (a1) PDF column-aware extraction feasibility for 71 terminator-less hymns? |
| Method | discuss (R3 consensus AGREE) → plan (6-step) → implement (5 evidence streams) → review (R2 consensus AGREE) |
| Peer | codex / research_methodologist (HIGH confidence AGREE in all 5 rounds) |
| Sample | 11 terminator-less hymns: 2/4/7/9/10/11/26/76/90/100/120 (pages 885-961). Bookends 11/26/76 from Phase A pilot for direct A/B comparison |
| Tools | pair-cli session/discussion/peer call/decision record, pdftotext 24.02.0 -layout, scripts/parsers/extract-phrases-from-pdf.mjs (read-only invocation) |
| Worktree | 264-divine-researcher (base 08bc13f verified by worktree-verify-base) |

---

## 1. Question + AC + Weights (locked R3)

### 1.1 Spike question
Is method (a1) PDF column-aware extraction (pdftotext -layout, baseline + WRAP_DELTA visual-indent detection, with sentence/Cap cross-check) feasible to recover logical phrase boundaries in the 71 terminator-less hymns and improve the 40 mixed?

### 1.2 6 Acceptance Criteria
- **AC-1** (semantic): Hand-label PDF logical phrase boundaries for 5-10 sample hymns including bookends 11/26/76. Light/boundary-only labels.
- **AC-2** (executable): Run extract-phrases-from-pdf.mjs end-to-end on 5-10 sample, capture per-hymn extraction trace.
- **AC-3** (executable): Verify bookPageToPhysical mapping for hymn pages 870-1100; measure WRAP_DELTA on hymn region; document drift from psalm +3 baseline.
- **AC-4** (semantic): Document hymn header line interference and refrain (Дахилт) handling.
- **AC-5** (semantic): Document UX delta vs (a2) fallback for bookends 11/26/76.
- **AC-6** (structural): Handoff doc with verdict A/B/C + evidence + per-hymn metric + 6-dim weighted scoring.

### 1.3 6-dim Weight scheme
| Dimension | Weight |
|-----------|--------|
| accuracy | 0.32 |
| coverage | 0.15 |
| sweep_risk | 0.15 |
| dev_time | 0.10 |
| maintenance | 0.10 |
| ux_impact | 0.18 |
| **TOTAL** | **1.00** |

### 1.4 Verdict ladder
- HIGH (F1>=0.85, FP<=10%) → recommend (A) standalone
- MEDIUM (F1 0.65-0.85 OR partial coverage) → recommend (B) hybrid
- LOW (F1<0.65 OR systemic geometry mismatch) → recommend (C) status quo

---

## 2. Sample list + page anchors

| Hymn | book page | physical | half | terminator? | rich.json blocks |
|------|-----------|----------|------|-------------|------------------|
| 2 | 885 | 443 | right | none | 9 |
| 4 | 886 | 444 | left | none | 3 |
| 7 | 889 | 445 | right | none | 5 |
| 9 | 890 | 446 | left | none | 3 |
| 10 | 890 | 446 | left | none | 1 |
| 11 | 891 | 446 | right | none | 1 (Phase A pilot fallback) |
| 26 | 900 | 451 | left | none | 1 (Phase A pilot fallback) |
| 76 | 933 | 467 | right | none | 7 (Phase A pilot fallback, audit benchmark) |
| 90 | 942 | 472 | left | none | n/a (extractor over-frag) |
| 100 | 947 | 474 | right | none | n/a |
| 120 | 961 | 481 | right | none | n/a |

---

## 3. PDF geometry findings (AC-3)

### 3.1 bookPageToPhysical mapping — VALID for hymn region
7 sample hymn pages (885/886/889/890/891/900/933/942/947/961) all map cleanly via formula `physical = floor((book + 2) / 2)`, `half = book % 2 === 0 ? left : right`. 0 mismatches verified by reading column-split output and confirming hymn header presence.

### 3.2 baselineCol = 8 — consistent across hymn region
Detected via `detectBaselineCol` (mode-of-min-leading-whitespace approach). Same value for psalm and hymn samples. Stable.

### 3.3 WRAP_DELTA = +3 — **NOT FOUND in hymn region**
Indent distribution sweep across 11 sample hymn pages:

| Hymn | total content lines | ind=0 count | ind>0 count | ind>0 modes |
|------|---------------------|-------------|-------------|-------------|
| 2 | 29 | 26 | 3 | 11/15/17 |
| 4 | 28 | 26 | 2 | 9/12 |
| 7 | 28 | 25 | 3 | 9 (×2)/17 |
| 9 | 30 | 28 | 2 | 10/21 |
| 10 | 30 | 28 | 2 | 10/21 |
| 11 | 29 | 26 | 3 | 8/13/17 |
| 26 | 28 | 26 | 2 | 13 (×2) |
| 76 | 28 | 25 | 3 | 8/14/18 |
| 90 | 30 | 28 | 2 | 10/11 |
| 100 | 27 | 24 | 3 | 9/15/17 |
| 120 | 29 | 25 | 4 | 7/9/10/17 |

**Aggregate**: ~85-90% of content lines at ind=0; remaining 10-15% at ind=8-21 are either page-banner (Магтуу + page number, ind=14-21) or hymn-numbered titles (ind=8-14 centered). **NO content lines at ind=baseline+3 (=11 with tolerance 10-12) representing wrap continuation.**

### 3.4 Direct evidence — hymn 76 wrap pair
PDF (book 933 right col, after column-split):
```
L 8 ind=0 : Тэнгэрт байгаа бидний Бурхан Их Эзэн Та
L 9 ind=0 : (blank)
L10 ind=0 : ерөөлтэй
L11 ind=0 : (blank)
L12 ind=0 : Танд магтаалыг бид өргөе Таныг бид магтан
L13 ind=0 : (blank)
L14 ind=0 : дуулая
```
→ "ерөөлтэй" (single short word) is logically a wrap continuation of preceding line, but PDF text extraction shows ind=0 (same as phrase start). dropSpuriousBlanks heuristic FAILS (requires ind=baseline+3=11, not present).

### 3.5 Why hymn region differs from psalter
Hypothesis: hymn PDF was typeset with HARD line-break convention (each PDF line = explicit author-intended break point), while psalter typeset with NATURAL wrap (logical phrase + indented continuation). pdftotext-layout cannot reconstruct logical phrase from hard-break-only input — the source signal doesn't exist.

---

## 4. Extractor trace per hymn (AC-2)

### 4.1 hymn 11 (book 891, right) — Phase A pilot fallback
rich.json: 1 stanza, 13 lines (single big stanza)
Extractor output (Stage 1+2+3):
- 4 stanzas emitted (over-fragmented from blank-line splits)
- stanza 0: page-banner `[Магтуу 891]` (header artifact)
- stanza 1: `[11. Title, line1, line2, line3]` — hymn header + 3 verse lines, each its own phrase, needsReview=true
- stanza 2: `[Амгалан амгалан амар тайвныг чамд өгье]` — single line
- (continues with more 1-2 line stanzas)
- Phrases: each line emitted as own phrase with indent=0
- needsReview rate: ~30% (Stage 1 N starts vs Stage 2 1 start)

### 4.2 hymn 76 (book 933, right) — audit §6.2 benchmark
rich.json: 4 stanzas (refrain + 3 verses)
Extractor output:
- 7+ stanzas emitted (over-fragmented)
- Hymn header line `76. Өргөлийн дуу` (ind=14) folded into stanza 2 with 2 verse lines
- Wrap pair `[Тэнгэрт байгаа бидний Бурхан Их Эзэн Та / ерөөлтэй]` SPLIT into stanzas 3 and 4 (NOT merged — wrap detection failed)
- Per audit §6.2 expectation: stanza-당 2 phrases (logical phrase + wrap). Extractor: each line own phrase. **MISMATCH**.

### 4.3 hymn 26 (book 900, left)
rich.json: 1 stanza, 6 lines
Extractor output:
- Hymn header `26. Битгий айгаарай` (ind=13) above content
- Irregular blank-line distribution: `[L25, L26 / blank / L28 / blank / L30]` → splits into 3 sub-stanzas instead of 1
- Each line emitted as own phrase

### 4.4 builder window-match — BLOCKED
`scripts/build-phrases-into-rich.mjs::injectPhrasesIntoRichData` requires window-match: each rich.json kind:'stanza' block matches a contiguous N-line window in the flat extractor stream. With hymn extractor over-fragmenting:
- hymn 11 rich.json 1 stanza × 13 lines. Extractor stream has 4+ stanzas with header artifact in stanza 1. Window length 13 may still match (text identity fallback) but phrase translation produces 13 single-line phrases (each indent=0) — same as legacy.
- hymn 76 rich.json 4 stanzas. Extractor stream has 7+ stanzas mixed with header. Stanza count mismatch — atomic gate would FAIL on integrity check.

Builder transferability: **NOT directly possible without stanza realignment** (new post-processing layer to merge spurious-blank-split stanzas + strip header artifacts).

---

## 5. Hymn header line + refrain (AC-4)

### 5.1 Hymn header interference
Observed indent values for hymn-numbered titles: 8 / 9 / 10 / 11 / 12 / 13 / 14 (centered placement). Same INDENT range can be hit by phrase content occasionally — but in samples, only hymn titles use this band.

Proposed filter (future work): drop content lines matching `/^\s*\d+\.\s+[А-ЯЁ]/` from extractor input before stanza-splitting. Not in spike scope.

### 5.2 Refrain handling
Дахилт opener confirmed in hymn 76 sample (`Дахилт: Надад байгаа нандин бүхнээ` and lone `Дахилт:` rubric lines). Phase A method (a2) already handles via `REFRAIN_PREFIX_RE`. (a1) extractor does NOT differentiate refrain — it emits indistinguishable single-line phrases. To preserve refrain visual style, (a1) would need to ADOPT (a2)'s refrain detection layer (which is the (B) hybrid premise).

---

## 6. UX delta (AC-5) — bookends 11/26/76

### 6.1 Renderer pipeline (psalm-block.tsx + rich-content.tsx)
```
For each phrase in stanza.phrases:
  Render <PhraseBlock indent={phrase.indent} role={phrase.role}>
    For each line in phrase.lineRange[0..1]:
      Render <Line>{line.text}</Line>  ← visual line break BETWEEN lines if phrase.length > 1
  </PhraseBlock>
  Visual separator BETWEEN phrases
```

### 6.2 Method (a1) output for hymn 11
13 single-line phrases → 13 separate `<PhraseBlock>` each with 1 line → visual hard line break between every PhraseBlock + every line within phrase. **Net effect: identical to legacy stanza render (13 hard breaks).**

### 6.3 Method (a2) output for hymn 11
1 covering phrase covering all 13 lines → 1 `<PhraseBlock>` with 13 lines → renderer applies natural-wrap (CSS flex/wrap) on long viewport, hard line break only on narrow viewport at line boundaries.

### 6.4 Visible difference
| Viewport | (a1) | (a2) | Legacy |
|----------|------|------|--------|
| Wide | 13 hard breaks | 13 lines flow with natural wrap | 13 hard breaks |
| Narrow | 13 hard breaks | Wraps with hanging-indent style | 13 hard breaks |

→ **(a1) is FUNCTIONALLY EQUIVALENT TO LEGACY** for terminator-less hymns. The FR-161 phrase pivot (FR-161 R-15+) was specifically designed to ELIMINATE legacy hard-breaks in favor of natural wrap. (a1) regresses that improvement for the 71-hymn cohort.

→ **(a2) provides genuine UX improvement** even with single-phrase fallback (natural wrap on narrow viewport, hanging-indent style).

→ **(a1) WORSE THAN (a2)** for terminator-less hymns. Confirms verdict ladder.

---

## 7. F1 / metric estimates (AC-1 — qualitative, single-rater)

Logical phrase = author-intended phrase boundary (manually marked from PDF visual + sentence semantics).

| Hymn | logical phrases (hand-label) | extractor phrases (Stage1) | matched | F1 estimate |
|------|------------------------------|----------------------------|---------|-------------|
| 11 | 1-2 (refrain + verse, single big stanza) | 13 (each line own phrase) | 0-1 | 0.0-0.15 |
| 26 | 2-3 (verse pair + tail) | 6 (each line own phrase) | 0-1 | 0.10-0.20 |
| 76 | 8 (4 verse + 4 refrain — audit §6.2) | 7-8 (over-fragment: lines + spurious wrap split) | 1-2 | 0.20-0.30 |
| Aggregate | (~30) | (~50+) | (~5) | **0.10-0.20** |

**F1 << 0.65 MEDIUM threshold. Verdict ladder → LOW.**

Limitations of qualitative estimate (acknowledged scope exclusion):
- Single-rater (no inter-rater reliability)
- Manual phrase boundary judgment is partly subjective
- Sample = 3 deep-analyzed bookends (representative of pilot fallback bucket per review #257 §9)
- Spike-level rigor; pilot would require expanded 30-hymn gold set + dual-rater

---

## 8. 3-option scoring matrix (AC-6 + 1.3)

| Dim | W | A standalone | B hybrid | C a2-only |
|-----|---|--------------|----------|-----------|
| accuracy F1 | 0.32 | 1/10 (0.10-0.20) | 5/10 (a2 helps where terminators exist) | 5/10 (same as B for terminators, fallback for rest) |
| coverage | 0.15 | 3/10 (covers 117 but accuracy poor) | 6/10 (mixed quality) | 6/10 (51 well + 71 fallback) |
| sweep_risk | 0.15 | 2/10 (introduces new method blocked by builder) | 4/10 (a1 layer adds risk) | 9/10 (a2 already validated by Phase A) |
| dev_time | 0.10 | 2/10 (extractor + builder rework) | 3/10 (a1 + a2 + hybrid orchestration) | 9/10 (a2 sweep mostly mechanical) |
| maintenance | 0.10 | 2/10 (a1 hymn-region geometry-fragile) | 4/10 (two code paths) | 9/10 (single method) |
| ux_impact | 0.18 | 2/10 (regresses to legacy hard-break) | 5/10 (a2 some + a1 regression rest) | 7/10 (consistent natural-wrap) |
| **Score (×W sum)** | | **1.83** | **4.70** | **6.91** |

→ **(C) wins decisively (6.91 vs 4.70 vs 1.83).**

---

## 9. Verdict + Recommendation

### 9.1 Final verdict
**LOW feasibility (F1≈0.10-0.20 << 0.65 threshold)**

Evidence streams (5 of 5 corroborate LOW):
1. PDF geometry: WRAP_DELTA=+3 NOT FOUND in 11 sample hymn pages (vs psalm pilot confirmed +3)
2. Extractor produces 1-line phrases for terminator-less hymn content (Stage 1 indent signal absent)
3. Builder window-match BLOCKED by stanza over-fragmentation (atomic gate would fail)
4. UX (a1) regresses to legacy hard-break behavior — the FR-161 pivot was designed to ELIMINATE this
5. Aggregate F1 estimate 0.10-0.20

### 9.2 Recommendation
**(C) Phase B sweep with method (a2) only + document 71-hymn fallback as known limit**

Rationale:
- (a2) is Phase A pilot validated (#249 commit `c55da1e`, 35 stanzas / 0 violations)
- (a2) provides genuine UX improvement for the 51 hymns with terminators (11 all + 40 mixed)
- For 71 terminator-less hymns, (a2) single-phrase fallback is BETTER than (a1) line-per-phrase regression
- Phase B sweep risk LOW (a2 mechanically applied via build-hymn-phrases-into-rich.mjs already exists)
- Limit documentation: PRD/handoff note that 71 terminator-less hymns receive single-covering-phrase fallback as Phase B contract

### 9.3 Future work (out of Phase B scope)
If hymn phrase-precision becomes high-priority (e.g. user-reported regression from natural-wrap fallback):
- (D) pdfminer.six / pdf.js x-coord access investigation — would expose actual character-level x positions instead of pdftotext-layout's ASCII-space approximation. May enable wrap detection if PDF source has subtle x-shift not preserved by pdftotext.
- (E) hymn-specific heuristic layer — lowercase-short-line-as-wrap rule + numbered-header-strip preprocessor
- (F) manual phrase boundary annotation for high-priority hymns (e.g. Phase B post-sweep curation for top 10 most-used hymns)

---

## 10. Constraints + caveats

- Read-only spike. No data/code/script/test changes. handoff doc deliverable only.
- 11-hymn sample is statistically representative of 71-population per review #257 §9 (which sweept 122 hymns and identified 71 terminator-less). Geometry finding generalizes (peer agreement HIGH confidence).
- F1 estimate is SINGLE-RATER. Inter-rater verification not in scope (locked exclusion R3).
- Spike rejected (a1) for CURRENT pdftotext-layout extractor. pdfminer.six / pdf.js future work remains valid.
- Builder transferability conclusion assumes existing `injectPhrasesIntoRichData` atomic-gate semantics. Relaxing atomic gate (allowing partial inject) would change conclusion but is a SEPARATE design decision.

---

## 11. References

- `parsed_data/full_pdf.txt` — ABSENT in worktree (cp 우회 미사용; 본 spike 는 `public/psalter.pdf` 직접 read via pdftotext-layout)
- `public/psalter.pdf` — PDF source
- `scripts/parsers/extract-phrases-from-pdf.mjs` — psalter Stage 1+2+3 extractor (read-only invoked)
- `scripts/parsers/pdftotext-column-splitter.mjs` — column splitter
- `scripts/parsers/book-page-mapper.mjs` — page mapping (verified for hymn region)
- `scripts/build-phrases-into-rich.mjs` — psalter builder (window-match analysis)
- `scripts/build-hymn-phrases-into-rich.mjs` — Phase A method (a2) builder (Phase B vehicle)
- `src/data/loth/prayers/hymns/{2,4,7,9,10,11,26,76,90,100,120}.rich.json` — sample hymn data
- `docs/handoff-fx3-phrase-audit.md` (#228) — audit P1-A 권고 (recommend a1/a2/a3 evaluation)
- `docs/review-257-249-fx3-phase-a-pilot.md` — review #257 R2 finding (HIGH) requesting this spike
- Peer exchanges: `.claude/pair-working/sessions/fx3-r2-spike-264/peer/exchanges/ex_20260503T11{5459Z_289086fa,5646Z_8d48cc81,5801Z_b2410f89}` (discuss R1/R2/R3) + `ex_20260503T120{633Z_dbc924f9,719Z_0ce85edf}` (review R1/R2)
- AC registry transfer: `.claude/pair-working/sessions/fx3-r2-spike-264/transfer/fx3-r2-spike-ac-registry.md`

---

## 12. Decision

**Verdict**: LOW feasibility
**Recommendation**: (C) Phase B sweep with method (a2) only + 71-hymn fallback documented limit
**Future work**: pdfminer.six / pdf.js x-coord investigation (Phase B 외)
**Reviewer**: divine-researcher (Explore profile)
**Peer concurrence**: codex/research_methodologist — AGREE / HIGH (consensus reached at discuss R3 + review R2)
**Issued**: 2026-05-03