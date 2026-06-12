# Mental Model — Psalm 110 Quote-Pair Imbalance (`залрагтун”` reported without an opening quote) (GOAL #127)

> Blueprint SSOT for GOAL #127. This document is a **Step-1 MM definition** authored from a
> fresh investigation (not a consolidation of a prior locked analysis). It fixes the GOAL's
> intended behavior, the **complete instance inventory**, the observable outcome, non-goals,
> the AC link `[D1..D3]`, and the AC-separability note. Root-cause localization and the actual
> reproduction belong to downstream steps (#148 RED → #150 root-cause → #151 develop) and must
> take this MM's inventory + Test Scenario Map as input.
>
> Author: dvo-sol (solver, task #147 / `[#127-sub-1]`). Worktree `147-dvo-sol`,
> base `ca33609`. Authored in English with the Mongolian liturgical text quoted **verbatim**
> (citation exception — the bug is about the quotation marks themselves, so exact glyphs matter).
>
> **Headline finding (read first):** every **stored production-data** instance of this verse —
> and every instance in the SoT book — is quote-**balanced** (opening `“` U+201C present, closing
> `”` U+201D present). The user-supplied screenshot is itself balanced. There is therefore **no
> known missing-opening-quote in the data**. The GOAL is **reproduction-gated**: Step #148 must
> first establish whether/where the reported imbalance is actually observable before any fix is
> proposed, and the fix is **PROPOSAL-GATED** (per `[D2]`). Per the leader's dispatch note the
> report is **not dismissed** — open hypotheses are catalogued below.

---

## Intended behavior (의도된 동작)

Wherever Psalm 110:1 is recited, the quoted divine speech is rendered with a **matched quote
pair** exactly as the printed Mongolian book prints it:

- Opening **left** double quotation mark `“` (U+201C) immediately before `Би` (`“Би чиний
  дайснуудыг …`), and
- Closing **right** double quotation mark `”` (U+201D) immediately after `залрагтун`
  (`… залрагтун” гэв.`).

The book's verbatim form (SoT `parsed_data/full_pdf.txt`):

```
ЭЗЭН миний Эзэнд
“Би чиний дайснуудыг
Хөлийн чинь гишгүүр болготол
Миний баруун гарт залрагтун” гэв.
```

A second matched pair occurs later in the same psalm and is **also balanced** in all data:
`“Мелхизедекийн хэргэмийн дагуу` … `Чи мөнхийн тахилч юм” гэв.`

**The intended state is "no change unless an actual imbalance is reproduced."** If reproduction
(#148) shows every surface already renders a balanced pair, the correct outcome of this GOAL may
be **"no data change"** plus a typographic/perception explanation — fabricating an extra opening
quote into already-balanced data is explicitly forbidden (see Non-goals).

---

## State Model (상태 모델 — what is stored, and in what form)

Psalm 110 is recited on many days (Sunday Vespers across weeks, commons), but the production
data **deduplicates** the psalm text by `ref` — the multi-occurrence physical book collapses to
a **single** stored body entry plus a single commons-rich entry plus per-week antiphons.

| Store | Key | Quote chars | Pairing |
|-------|-----|-------------|---------|
| Plain psalter body | `"Psalm 110:1-5, 7"` (`psalter-texts.json`) | curly `“` U+201C / `”` U+201D | **balanced** (2 pairs) |
| Rich/commons body | `"Psalm 110:1-5, 7"` (`psalter-texts.rich.json`) | curly `“` / `”` | **balanced** (2 pairs) |
| Antiphon | `default_antiphon` (`week-3.json`) | **straight** `"` U+0022 / `"` U+0022 | **balanced** (1 pair, short fragment) |
| Bible reading | `Дуулал 110:1` (`bible_ot.jsonl`) | curly `“` / `”` | **balanced** |

Key state facts:

1. **The body opening quote IS present** — `psalter-texts.json:187` is `“Би чиний дайснуудыг`
   (codepoint U+201C confirmed), closing `psalter-texts.json:189` is `… залрагтун” гэв.`
   (U+201D confirmed). Same for the rich/commons copy (`:2342` open, `:2360` close).
2. **Quote-character inconsistency across surfaces (the one genuine anomaly found):** the **body**
   uses **curly** `“…”`; the **antiphon** uses **straight** `"…"`; a unit-test fixture
   (`psalm.test.ts:37`) also uses **straight**. There is **no** quote-normalization code in
   `src/lib` / `src/components` (grep for smart-quote/normalize returns nothing) — quotes are
   stored as-authored and rendered as-is.
3. **The antiphon quotes a *shorter* span** than the body — only `"Миний баруун гарт залрагтун"`,
   not the full `“Би … залрагтун”`. So the antiphon and body legitimately differ in quote scope.

---

## Instance inventory (인스턴스 인벤토리 — REQUIRED)

Every renderable instance of the `залрагтун` verse, with opening/closing presence and the
rendering surface. **Derived/test artifacts are listed separately and are NOT fix targets.**

### Source data (production — candidate fix surfaces)

| # | File:line (open → close) | Opening | Closing | Char | Balanced | Rendering surface |
|---|---------------------------|---------|---------|------|----------|-------------------|
| 1 | `src/data/loth/psalter-texts.json:187 → :189` | `“` present | `”` present | curly U+201C/U+201D | ✅ | Psalm body (plain resolver → `psalm-block.tsx` stanzas) wherever Ps 110 is recited |
| 2 | `src/data/loth/prayers/commons/psalter-texts.rich.json:2342 → :2360` | `“` present | `”` present | curly | ✅ | Psalm body (rich overlay → `rich-content.tsx`) in commons-driven renders |
| 3 | `src/data/loth/psalter/week-3.json:104` | `"` present | `"` present | **straight** U+0022 | ✅ | Antiphon (`AntiphonBox`, top `psalm-block.tsx:79` + bottom `:339`); short fragment only |
| 4 | `src/data/bible/bible_ot.jsonl:588` (`Дуулал` 110:1) | `“` present | `”` present | curly | ✅ | Bible reading view (`Дуулал 110`) |

Second pair (`Мелхизедек … тахилч`) in #1/#2 and in #4 (`bible_ot.jsonl:588` v.4) — **balanced**.

Pilot variants `psalter-texts.pilot.json` / `psalter-texts.pilot.rich.json`: **0 occurrences**
(Psalm 110 not present) — not in scope.

**No production instance is missing an opening quote.**

### Derived / test artifacts (NOT fix targets — cross-reference only)

| File:line | Note |
|-----------|------|
| `scripts/out/psalter_layout.txt` (×7: `:1220 :3449 :5795 :5815 :7955 :11463 :13567`) | Rendered-layout extraction from the PDF; mirrors the book (closing `”` visible). Regenerated artifact, not a source. |
| `scripts/parsers/__tests__/fixtures/psalter-physical-035.txt:18` | Parser test fixture. |
| `src/lib/hours/resolvers/__tests__/psalm.test.ts:37` | Unit fixture; uses **straight** quotes (`"Миний баруун гарт залрагтун"`). |

---

## SoT cross-reference (`parsed_data/full_pdf.txt` — the printed book)

Psalm 110:1 is **printed 7 times** in the book; the book uses **curly** `“…”` throughout. **Five**
print as a contiguous balanced block; **two are physically split across a page boundary** — the
opening `“Би` line sits on the previous page, so the closing line appears with no opening quote in
its immediate vicinity:

| SoT line | Form | Opening `“` near close? | Cause |
|----------|------|--------------------------|-------|
| `:2155`, `:6214`, `:10411`, `:14335` | full quote, contiguous | ✅ (2 lines above) | normal |
| `:10383` | antiphon form `“Миний … залрагтун” гэв. Аллэлуяа!` | ✅ (`:10382`) | normal |
| **`:20513`** | closing line only | ❌ — preceded by page number `593` (`:20510`) | **page break splits the quote** |
| **`:24056`** | closing line only | ❌ — preceded by page number `694` + heading `Дээгүүр өнгөрөх Ням гараг` | **page break + heading split** |

**Interpretation:** the two "orphan closing" lines are **physical printing artifacts** (the book
ran past a page edge). They do **not** propagate to the deduplicated production data, which stores
one balanced copy. This is, however, the most concrete **hypothesis seed** for the user report:
if any rendering surface reproduces a book-page split (or a section/continuation boundary) that
detaches the opening line, a closing-only fragment could surface. **To be confirmed by #148, not
assumed here.**

---

## Action Map / Sync Surface (동기화 표면 — resolve → render path)

```
psalter-texts.json ──(psalm.ts resolver / loaders.ts)──┐
psalter-texts.rich.json ──(rich-overlay.ts)────────────┼──> AssembledPsalm ──> psalm-block.tsx
week-3.json default_antiphon ──────────────────────────┘                         ├─ AntiphonBox (straight quotes)
                                                                                 └─ stanzas (curly quotes)
                                                          rich path ──> rich-content.tsx
```

- Resolver: `src/lib/hours/resolvers/psalm.ts`; loader `src/lib/hours/loaders.ts`.
- Rich overlay: `src/lib/prayers/rich-overlay.ts`.
- Renderer: `src/components/psalm-block.tsx` (title + stanzas + `AntiphonBox`),
  `src/components/prayer-sections/rich-content.tsx` (rich blocks).
- **No quote transform** sits on this path — what is stored is what renders.

**Sync surfaces that must stay consistent if any edit is made:** `psalter-texts.json` ↔
`psalter-texts.rich.json` (the rich builder consumes the plain JSON — re-run
`scripts/build-psalter-texts-rich.mjs` after any source edit), the SoT `parsed_data/full_pdf.txt`,
and `public/sw.js` `CACHE_VERSION` (any data-bundle change forces a bump, per CLAUDE.md).

---

## Observable outcome (관찰 가능한 결과 — 사용자 지각)

On the Psalm 110 screen (the surface the user reported), the quoted speech reads as a matched
pair — `“Би … залрагтун”` — with **both** marks visible, matching the book. There is no
"closing-only" fragment on any surface.

Because reproduction has **not** yet shown an imbalance, the observable acceptance for this GOAL is
defined **conditionally** (resolved at #148):

- **If** #148 reproduces a real missing-opening-quote on some surface → the fix restores the pair
  on that surface, and the screen renders `“Би … залрагтун”` balanced.
- **If** #148 cannot reproduce an imbalance (all surfaces balanced) → the user-facing outcome is an
  **explanation** (typography/glyph perception, or the curly-vs-straight inconsistency), proposed to
  the user per `[D2]`; **no punctuation is fabricated**.

---

## Scenarios (시나리오)

- **S1 — body recitation (primary, matches screenshot):** Sunday Vespers Ps 110 body; opening `“Би`
  on the indented poetic line, closing `залрагтун”` four poetic lines down. Expected: balanced.
- **S2 — antiphon:** `AntiphonBox` shows `Эзэн миний Эзэнд "Миний баруун гарт залрагтун" гэв.
  Аллэлуяа!` with **straight** quotes. Expected: balanced (but a different quote glyph than the body
  on the same screen — candidate source of perceived inconsistency).
- **S3 — page/continuation boundary:** any day where the rendered psalm is split such that the
  opening line and closing line land in different rendered blocks (mirrors SoT `:20513` / `:24056`).
  Expected (intended): still balanced; **this is the scenario most likely to expose a real bug** and
  is the priority for #148.
- **S4 — bible reading view:** `Дуулал 110:1`; single-line, balanced curly.

---

## Visibility Boundary (가시성 경계)

- **In view:** the quote glyphs on the rendered Psalm 110 surfaces (body stanzas, antiphon box,
  bible reading). The user perceives "opening quote present/absent" — a **typographic/semantic**
  perception, not a numeric value.
- **Out of view (developer-only):** the stored codepoints (U+201C / U+201D / U+0022), the SoT page
  splits, the dedup that collapses 7 printed occurrences to one stored entry.
- The gap between "developer sees balanced data" and "user reports imbalance" is exactly why **#148
  reproduction-first is mandatory** — the boundary must be crossed with a real rendered screen, not
  a data inspection.

---

## Candidate hypotheses (열린 가설 — for #148/#150, NOT committed here)

Listed so the report is not dismissed; **none is adopted as root cause in this MM**:

1. **Page/section-split rendering** (strongest seed) — a continuation boundary detaches the opening
   line, surfacing a closing-only fragment (cf. SoT `:20513` / `:24056`). → reproduce S3.
2. **Glyph/perception** — the curly opening `“` (U+201C) in the app's Mongolian serif font is
   small/high and not registered as a quote by the user, though present. → inspect rendered pixels.
3. **Curly-vs-straight inconsistency** — body curly vs antiphon straight on the same screen reads as
   a mismatched pair to the user, even though each is individually balanced.
4. **A different unreported instance/day** — Ps 110 surface other than the screenshot's. → sweep
   surfaces.

---

## Non-goals (비목표)

- **Fabricating punctuation is FORBIDDEN.** Every data instance already carries a balanced pair and
  the SoT shows balanced quotes everywhere; inserting an extra opening quote (or any mark) that the
  SoT does not support is prohibited (MT/fabrication ban).
- **The fix is PROPOSAL-GATED (`[D2]`).** No edit is applied until the analysis + proposal is shown
  to the user and confirmed. This GOAL's shippable Step-1 output is the analysis blueprint, not an
  edit.
- **No "fix" without reproduction.** If #148 cannot reproduce an imbalance, the correct deliverable
  is an explanation, not a data change.
- **Quote-style unification is out of scope unless it is the confirmed cause.** Converting the
  antiphon's straight `"` to curly `“…”` (or vice-versa) is a separate consistency concern; only
  pursue it if #150 proves it is the user's actual complaint.
- **Derived/test artifacts** (`scripts/out/psalter_layout.txt`, parser fixtures, `psalm.test.ts`)
  are **not** edited to "fix" quotes — they are regenerated/fixture outputs.
- **No machine translation / no guessing** — any retained or changed character must come from the
  SoT `parsed_data/full_pdf.txt` only.

---

## AC link (GOAL #127 description — DOGFOODING AC)

- **[D1]** The cause of the quote-pair imbalance is analysed and reported **with evidence**
  (`file:line`, SoT cross-reference, the specific exposed surface). — `semantic` / investigation.
  **MM section:** Instance inventory + SoT cross-reference + State Model. **Note:** the evidence
  currently shows *balanced data everywhere*; D1 is satisfied by either localizing a real
  reproduced imbalance (#148/#150) **or** by the evidenced conclusion that the data is balanced and
  the report is typographic/perceptual.
- **[D2]** A **SoT-grounded fix proposal is presented to the user** before any edit (proposal-gated;
  no arbitrary data insertion / fabrication). — `semantic` / user-facing proposal. **MM section:**
  Non-goals + Observable outcome (conditional).
- **[D3]** On fix application, a **regression check for quote-balance** (no unbalanced pair) is
  included. — `executable`. **MM section:** Test Scenario Map (T3 balance invariant).

---

## AC-separability note (Gate-alpha `multi_feature_ac` input)

`multi_feature_ac = NO` (single feature). `[D1] → [D2] → [D3]` are **sequential phases of one
defect** (analyse the imbalance → propose an SoT-grounded fix → regression-guard the fix), not
independently shippable features. They share one ref (`Psalm 110:1-5, 7`), one data cluster, and one
user-perceived outcome (a balanced quote pair). They should be processed as a single linear chain,
not parallelized into separate feature tracks. (Contrast: a GOAL bundling "fix Psalm 110 quotes"
**and** "unify all antiphon quote styles app-wide" would be separable — but quote-style unification
is explicitly a Non-goal here unless proven causal.)

---

## Test Scenario Map (downstream RED #148 / GREEN #152 input)

| ID | Scenario | Command / method | Assertion |
|----|----------|------------------|-----------|
| T1 | Body data balance | `node` read of `psalter-texts.json` `"Psalm 110:1-5, 7"` | joined stanzas contain equal count of `“` (U+201C) and `”` (U+201D); opening precedes `Би`, closing follows `залрагтун` |
| T2 | Rich data balance | read `psalter-texts.rich.json` `"Psalm 110:1-5, 7"` block | same balance invariant on rendered line order |
| T3 | **Balance invariant (regression guard for [D3])** | scan all Ps 110 stored instances | every instance has matched `“…”` (curly) or `"…"` (straight) pairs; **count(open)==count(close)** |
| T4 | Real-screen reproduction (S1/S3) | render Ps 110 page (in-process production render / Playwright per CLAUDE.md visual-verify) | opening quote visible immediately before `Би`; no closing-only fragment |
| T5 | Antiphon balance | read `week-3.json` `default_antiphon` | straight `"…"` pair balanced around `Миний баруун гарт залрагтун` |
| T6 | Negative guard | second pair `“Мелхизедек … тахилч юм”` | remains balanced and unchanged by any edit |

> Reproduction (#148) **must** run T4 on a real rendered surface before T1–T3 are treated as
> dispositive — data-level balance (T1–T3) passing does **not** by itself disprove a rendering-level
> imbalance (T4). Per CLAUDE.md, SW-cache / A2HS / real-device scenarios are not reproducible by
> Playwright and may need user-device confirmation if T4 is clean but the user still observes the
> defect.

---

## Citation index (인용 색인)

- **User request + screenshot:** GOAL #127 description (verbatim 2026-06-13);
  `/home/min/myproject/divineoffice/Screenshot_20260612_180234_Samsung Browser.jpg` (untracked,
  main-tree; shows a **balanced** body pair `“Би … залрагтун”`).
- **Production data (balanced):** `src/data/loth/psalter-texts.json:186-200` (open `:187`,
  close `:189`); `src/data/loth/prayers/commons/psalter-texts.rich.json:2342` (open) / `:2360`
  (close); `src/data/loth/psalter/week-3.json:104` (antiphon, straight quotes).
- **Bible reading:** `src/data/bible/bible_ot.jsonl:588` (`Дуулал` 110:1, balanced curly).
- **SoT (printed book):** `parsed_data/full_pdf.txt` Psalm 110:1 ×7 —
  `:2155 :6214 :10411 :14335` (contiguous, balanced), `:10383` (antiphon form, balanced),
  **`:20513`** (page `593` split) / **`:24056`** (page `694` + heading split — orphan closing).
- **Resolve/render path:** `src/lib/hours/resolvers/psalm.ts`, `src/lib/hours/loaders.ts`,
  `src/lib/prayers/rich-overlay.ts`, `src/components/psalm-block.tsx` (antiphon `:79` / `:339`),
  `src/components/prayer-sections/rich-content.tsx`. No quote-normalization code exists.
- **Rich builder (sync surface):** `scripts/build-psalter-texts-rich.mjs` (plain JSON → rich.json).
- **Derived/test (not fix targets):** `scripts/out/psalter_layout.txt`,
  `scripts/parsers/__tests__/fixtures/psalter-physical-035.txt:18`,
  `src/lib/hours/resolvers/__tests__/psalm.test.ts:37`.
- **Deploy:** `public/sw.js` `CACHE_VERSION` (bump required only if a data edit ships).
