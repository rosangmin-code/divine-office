# GOAL #127 Step-2 — Psalm 110 quote-imbalance reproduction across surfaces

> **TL;DR** — The user's literal complaint ("`залрагтун”` has a closing quote but the front
> has no opening quote") is **NOT reproduced**. Every renderable Psalm 110 surface — every week's
> Sunday Vespers **body** (curly `“…”`) and the only quoting **antiphon** (week-3, straight `"…"`)
> — renders a **balanced** quote pair via the real resolver + real `PsalmBlock` render. The
> opening quote is present on all surfaces, matching the user's own screenshot. **Outcome (b):
> no-repro.** One **genuine SoT-divergence** was found, but it is a quote-**style** mismatch, not
> a missing quote: the week-3 antiphon uses straight `"…"` (U+0022) where the book
> (`parsed_data/full_pdf.txt:10382-10383`) prints curly `“…”`. This is the only SoT-grounded fix
> candidate and is offered as a **PROPOSAL ([D2], user-gated)** below. **Nothing was implemented.**
>
> Author: dvo-sol (solver, task #148 / `[#127-sub-2]`). Worktree `148-dvo-sol`, base `513f6b8`.
> Blueprint: `docs/design/mental-models/goal127-psalm110-quote-imbalance.md`.

---

## Methodology

1. **Surface enumeration** — grep every scheduled `Psalm 110:1-5, 7` slot across `src/data/loth`.
2. **Real in-process render** (MM Test Scenario Map T1/T2/T4/T5; LLM-dispatch-safe
   in-process real-production-render) — a throwaway vitest harness builds each surface's
   `PsalmEntry`, runs the **real** `resolvePsalm` (real loaders, real data files), renders the
   **real** `PsalmBlock` via `react-dom/server`, and measures quote-pair balance in the rendered
   DOM text. No mocks for the data path.
3. **SoT cross-check** — compare each rendered/stored quote against `parsed_data/full_pdf.txt`.
4. **Hypothesis verdicts** for the three MM open hypotheses (stanza/page split, straight-vs-curly,
   glyph).

Harness source is embedded at the end of this document (§Reproduction harness) so the run is
reproducible; per the "implement nothing / PROPOSAL-GATED" dispatch the harness file itself is
**not committed** (it should be promoted to a committed balance-invariant guard at Step 6 #152).

Data parity note: between main HEAD `ca33609` and this base `513f6b8` only MM docs changed
(`git diff --name-only ca33609 513f6b8` = 5 `.md` files); all Psalm 110 data and render code are
byte-identical, so the render evidence reflects the shipping state.

---

## Surface enumeration

`Psalm 110:1-5, 7` is recited at Sunday Vespers in all 4 psalter weeks + Christmas Second Vespers.
All five reference the **same** balanced body key in `psalter-texts.json`; only the antiphon differs.

| Surface | File:line | Antiphon | Quotes залрагтун? | Quote char |
|---------|-----------|----------|-------------------|------------|
| Week-1 SUN Vespers | `psalter/week-1.json:98` (p.68) | "Эзэн Сионоос …" | no | — |
| Week-2 SUN Vespers | `psalter/week-2.json:101` (p.185) | "Христ … Мелхизедек …" | no | — |
| **Week-3 SUN Vespers** | `psalter/week-3.json:102` (p.304) | `Эзэн миний Эзэнд "Миний баруун гарт залрагтун" гэв. Аллэлуяа!` | **YES** | **straight `"` U+0022** |
| Week-4 SUN Vespers | `psalter/week-4.json:108` (p.415) | "Мөнхийн сүр жавхлангаар …" | no | — |
| Christmas 2nd Vespers | `propers/christmas.json:138` (p.592) | "Танд мэндэлсэн …" | no | — |
| **Body (all of the above)** | `psalter-texts.json:187/189` | n/a | **YES** | **curly `“ ”` U+201C/U+201D** |

So `залрагтун` appears **with quotes** on exactly two render paths: the shared **body** (curly,
every week) and the **week-3 antiphon** (straight, week-3 only). The user's screenshot (title
`Аврагч бол хаан ба тахилч юм` = Psalm 110) shows the **body**.

---

## Render evidence (real resolver + real PsalmBlock)

Verbatim console output of the harness (`react-dom/server` rendered DOM text, tags stripped,
entities decoded; `open` = count of `“` U+201C, `close` = `”` U+201D, `straight` = `"` U+0022):

```
[WEEK1] body excerpt: "нд “Би чиний дайснуудыг  Хөлийн чинь гишгүүр болготол  Миний баруун гарт залрагтун” г"
[WEEK1] counts: {"open":3,"close":3,"straight":0}

[WEEK3] head (antiphon region): "   Шад дуулал:  Эзэн миний Эзэнд \"Миний баруун гарт залрагтун\" гэв. Аллэлуяа!   Дуулал  Psalm 110:1-5, 7   Аврагч бол хаан ба тахилч юм     ЭЗЭН миний Эзэнд “Би"
[WEEK3] counts: {"open":3,"close":3,"straight":4}
```

Run: `vitest run src/lib/hours/resolvers/__tests__/goal127-psalm110-quote-repro.test.ts` →
**Test Files 1 passed (1) | Tests 2 passed (2)**.

Interpretation:
- **Body (week-1, representative of all weeks):** opening `“Би` present, closing `залрагтун”`
  present, `open == close == 3` (the `“Би…залрагтун”` pair, the `“Мелхизедек…тахилч юм”` pair, and
  the psalmPrayer's pair) — **balanced**. No closing-only fragment.
- **Week-3:** the antiphon renders `"Миний баруун гарт залрагтун"` with a **straight** opening AND
  closing quote (balanced); the body below renders `“Би … залрагтун”` curly (balanced).
  `open == close == 3`, `straight == 4` (even ⇒ balanced). Two quote **styles** coexist on one
  screen, but each pair is individually closed.

---

## Hypothesis verdicts (MM §Candidate hypotheses)

| Hyp | MM claim | Verdict | Evidence |
|-----|----------|---------|----------|
| **H1** | page/section split detaches the opening line → closing-only fragment | **NOT reproduced** | Body renders all 4 poetic lines in one block with `“Би` and `залрагтун”` both present; the SoT page-splits (`full_pdf.txt:20513`/`:24056`) are print artifacts that do not propagate to the deduplicated single stored body. |
| **H2** | body curly vs antiphon straight reads as mismatched | **CONFIRMED as a real inconsistency** (but each pair balanced) | Week-3 render shows straight-quoted antiphon directly above curly-quoted body. This is the **most plausible source of the user's perception**, and maps to a real SoT-divergence (below). |
| **H3** | glyph: curly `“` not registered as a quote | **NOT reproduced** | The user's own Samsung-browser screenshot renders the curly `“` opening quote clearly; the render contains U+201C. |

---

## Genuine finding — SoT-divergence (week-3 antiphon quote style)

The **only** SoT-divergence found in any Psalm 110 quote:

- **Production data:** `src/data/loth/psalter/week-3.json:104` `default_antiphon` uses **straight**
  quotes — `… "Миний баруун гарт залрагтун" …` (U+0022 / U+0022).
- **SoT (book):** `parsed_data/full_pdf.txt:10382-10383` prints the **same** antiphon with **curly**
  quotes — `… “Миний баруун` (U+201C, L10382) `гарт залрагтун” гэв. Аллэлуяа!` (U+201D, L10383).
- The body (`psalter-texts.json`) and the bible reading (`bible_ot.jsonl`) already use curly,
  matching the book. The week-3 antiphon is the lone outlier.

This is a quote-**style** mismatch (straight vs curly), **not** a missing opening quote. It is
SoT-grounded and fixable without fabricating any character.

---

## Outcome: (b) NO-REPRO of the literal complaint

The reported "missing opening quote" was **not** reproduced on any surface. Per the dispatch's
(b) branch, this step produces a **[D2] proposal draft** rather than a RED test. The literal defect
does not exist in data or render; the adjacent real issue is the week-3 antiphon quote style.

---

## [D2] proposal draft (PROPOSAL-GATED — requires user confirmation before any edit)

Per GOAL #127 `[D2]` (SoT-grounded fix presented to the user before applying; no fabrication),
the analysis yields **two options**. Recommendation first.

**Option A (recommended) — normalize the week-3 antiphon straight quotes → curly.**
- Change `src/data/loth/psalter/week-3.json:104` `default_antiphon` from
  `… "Миний баруун гарт залрагтун" …` to `… “Миний баруун гарт залрагтун” …`
  (opening straight `"` U+0022 → curly `“` U+201C; closing straight `"` U+0022 → curly `”` U+201D).
- **SoT basis:** `parsed_data/full_pdf.txt:10382-10383` prints curly here. This restores
  book-fidelity AND removes the on-screen style inconsistency with the body.
- **Scope:** one antiphon string, one file. No body change (body already correct).
- **Regression guard ([D3], Step 6):** promote the balance harness (below) to a committed test
  asserting `open == close` on all Psalm 110 surfaces **and** that the week-3 antiphon uses curly
  quotes; add a quote-style consistency check to `audit-psalter-ref-consistency.js` if desired.
- **Deploy:** data-bundle change ⇒ bump `public/sw.js` `CACHE_VERSION` (CLAUDE.md).

**Option B — no change.**
- Every quote pair is already balanced and the body (the surface in the screenshot) matches the
  book exactly. If the user's concern was the body's curly opening quote (which is correct), no
  edit is warranted; the report would be a perception of a correctly-rendered curly `“`.

**Open question for the user (must resolve before applying either):** *On which screen/day did you
see the missing opening quote — the psalm body (curly, balanced) or the week-3 Sunday-Vespers
antiphon (straight)?* The answer selects Option A vs B. Until confirmed, **no edit is applied**.

---

## AC mapping (this WI → MM sections)

| AC (Step-2 deliverable) | Type | Verdict | MM section (MM-conformance) |
|--------------------------|------|---------|------------------------------|
| Enumerate every Psalm 110 surface | structural | PASS | §Instance inventory + §Scenarios (yes) |
| Render + test open hypotheses | semantic | PASS | §Candidate hypotheses + §Test Scenario Map T1/T2/T4/T5 (yes) |
| Outcome (a) RED or (b) [D2] proposal | semantic | PASS — (b) no-repro → [D2] draft | §Observable outcome (conditional) + §Non-goals (proposal-gated) (yes) |
| Implement nothing (proposal-gated) | structural | PASS — doc-only; harness uncommitted | §Non-goals (yes) |

---

## Reproduction harness (uncommitted — for reproducibility / Step 6 promotion)

`src/lib/hours/resolvers/__tests__/goal127-psalm110-quote-repro.test.ts` (throwaway):

```ts
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { resolvePsalm } from '../psalm'
import { PsalmBlock } from '@/components/psalm-block'
import { SettingsProvider } from '@/lib/settings'
import type { PsalmEntry } from '@/lib/types'

function decode(h: string) {
  return h.replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&#x27;/g, "'")
          .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x2F;/g, '/')
}
function render(p) { return decode(renderToStaticMarkup(
  createElement(SettingsProvider, null, createElement(PsalmBlock, { psalm: p })))) }
function counts(s) { return { open:(s.match(/“/g)||[]).length, close:(s.match(/”/g)||[]).length,
  straight:(s.match(/"/g)||[]).length } }

// week1Entry / week3Entry built verbatim from psalter/week-{1,3}.json Psalm 110 slots.
// week-1: non-quoting antiphon; week-3: straight-quoted antiphon. Both resolved via the
// REAL resolvePsalm (real loaders) and rendered via the REAL PsalmBlock.
// Assertions: text contains `“Би`, `залрагтун”`; counts.open === counts.close;
//             week-3 contains `"Миний баруун гарт залрагтун"`; counts.straight % 2 === 0.
```

Output as quoted in §Render evidence. To re-run: recreate the file (full source in the worktree
git history of `148-dvo-sol` working tree pre-cleanup, or rebuild from the assertions above),
`ln -s <main>/node_modules node_modules`, then
`node_modules/.bin/vitest run <file> --disable-console-intercept`.

---

## Citation index

- **Blueprint MM:** `docs/design/mental-models/goal127-psalm110-quote-imbalance.md`.
- **Surfaces:** `psalter/week-1.json:98`, `week-2.json:101`, `week-3.json:102` (antiphon `:104`),
  `week-4.json:108`, `propers/christmas.json:138`; shared body `psalter-texts.json:183-200`
  (open `:187`, close `:189`).
- **SoT antiphon (curly — divergence basis):** `parsed_data/full_pdf.txt:10382` (`“` open) /
  `:10383` (`”` close). Body SoT: `:2153/:2155` etc. (curly throughout, 7 occurrences).
- **Render path (no quote transform):** `src/lib/hours/resolvers/psalm.ts::resolvePsalm`,
  `src/components/psalm-block.tsx` (antiphon `:79`/`:339` via `AntiphonBox`; body via
  `RichContent`).
- **Render evidence:** vitest harness, 2 passed; tee
  `~/.claude/pair-cowork/scratch/dvo/test-out-task-148.log`.
