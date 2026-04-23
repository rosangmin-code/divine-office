# PoC Findings — PDF extraction pipeline redesign

- **Scope**: physical PDF pages **376–378** of `public/psalter.pdf` (= book
  pages 750..755; Week 1 SUN Lauds concluding prayer lives on book page 753,
  which is the right half of physical page 377).
- **Artefacts**:
  - `scripts/out/poc-pdftotext-sample.txt` — `pdftotext -layout -f 376 -l 378`
  - `scripts/out/poc-pdfjs-tokens.json` — raw text items from `pdfjs-dist` 5.6
    (legacy build) with `{ str, x, y, width, height, scaleX, scaleY, fontName,
    hasEOL }` plus per-page colour-run metadata.
  - `scripts/out/poc-pdfjs-histogram.txt` — font + fill-colour histograms,
    per-page colour run tally, and a sampled concatenation of red-coloured
    `showText` glyph unicode.
- **Tooling availability**: `pdftotext` **v24.02.0 installed**, `pdfjs-dist`
  **5.6.205** already in `node_modules` and importable server-side via
  `pdfjs-dist/legacy/build/pdf.mjs`. No installs required.

## (A) `pdftotext -layout` — strengths & limits

**Strengths**

- Preserves indentation whitespace with high fidelity. In the sample, stanza
  indents, refrain indents, and centred headings all reach the output as
  deterministic column-aligned spaces. This is the same characteristic the
  current `psalter.txt` snapshot already relies on.
- Emits page-number tokens (`750`, `752`, `754`) as the first glyph of each
  physical-page block, so page-break detection is trivial (tab-separated
  number + header text + closing number).
- Reads 3 pages in well under a second — zero ongoing maintenance, zero
  process risk for the body extraction path.

**Limits**

- The book is laid out **2-up landscape** (each physical PDF page carries two
  book pages side by side). `-layout` interleaves both columns line by line.
  Example (line 3 of the sample):

  > `хаанчлалын амар амгаланг эдлэхэд бидэнд туслах     Пэнтикост буюуАриун Сүнсний буултын`

  The left fragment ("…hэдлэхэд бидэнд туслах") belongs to book page 750 and
  the right fragment ("Пэнтикост буюу…") belongs to book page 751. Any
  downstream consumer **must split each physical-page block into two column
  streams by a fixed x-cut** before reassembling paragraphs. The old
  `mergeColumnWraps` heuristic tried to do this across lines and produced
  the oft-cited corruption — a layout-aware splitter keyed on the `-layout`
  output's own column of spaces (~50-char whitespace gutter) is safer.
- Does **not** carry any style signal. Rubric (red) text, italics, small-caps
  markers like "Төгсгөлийн Даатгал залбирал" are flattened to plain strings.
  Detecting them from `pdftotext -layout` alone would require post-hoc
  pattern matching, which is exactly the brittleness that produced the 6
  manual corrections in commit `c92abf3`.
- Glyph-level spacing inside small-caps words is partially lost. Because the
  source PDF emits "Төг", "С", "гөлийн" as three separate runs (each styled
  differently — see pdfjs histogram), `pdftotext` merges them into
  `Төгсгөлийн` cleanly but gives no signal that the original was styled.

## (B) `pdfjs-dist` token stream — strengths & limits

**Strengths**

- **Column separation is clean via x-coordinate**. On page 377, left-column
  tokens cluster in `x ≈ 30–240` and right-column tokens in `x ≈ 330–540`
  with an empty gutter between. A simple `x < pageWidth/2` split is reliable
  and does not require heuristics over whitespace counts.
- **Rubric red IS detected at the token level** — unambiguously. The fill
  histogram on the 3 sample pages yielded exactly two distinct RGB fills:
  `#2c2e35` (body grey-black) and `#ff0000` (rubric red). 33 of the 57
  `setFillRGBColor` operations were red. The red-coloured `showText` glyph
  stream on page 377 concatenates to:

  > `Эзэний баярЖИРИЙН ЦАГ УЛИРАЛДууллын залбирал: 1 дүгээр долоо хоног … ТөгСгөлийнДааТгалзалбирал …Сонголтот залбирал…`

  This confirms that in this PDF the rubric colour marks **both** section
  titles ("ЖИРИЙН ЦАГ УЛИРАЛ", "Сонголтот залбирал", "Төгсгөлийн даатгал
  залбирал") **and** the running headers ("Эзэний баяр", "Жирийн цаг
  улирал") **and** in some cases the concluding-prayer body itself
  (cross-check against page 376's red-run sample, which contains the whole
  "Аяа, Эцэг минь, Таны Хүү Есүсийн зүрхнээс…" prayer in red).
- **Four distinct fonts** on the sampled pages:
  - `g_d0_f1` (n=8 across 3 pages) — page-number glyphs.
  - `g_d0_f2` (n=588) — regular body.
  - `g_d0_f3` (n=42) — all-caps section titles (constant scaleX=11).
  - `g_d0_f4` (n=102) — small-caps fragments (scaleX=8.55, ~22% narrower).
  Font name plus scaleX gives us a stable "this is a concluding-prayer
  marker / psalm-prayer marker / small-caps heading" classifier that does
  not depend on Cyrillic text matching.
- Every text item carries `{x, y, width, height, fontName, hasEOL}` — enough
  to reconstruct lines, detect stanza boundaries by y-gap threshold, and
  classify each line as body / header / marker / pagenumber without any
  lexical heuristic.

**Limits**

- `pdfjs-dist` emits text items **per glyph group**, not per logical word. In
  a couple of spots words are split ("Төг" + "С" + "гөлийн"). Joining them
  back is easy when (a) y-coordinate matches and (b) the x-gap is narrower
  than a typical space advance — but the joiner has to be aware of this.
- `getOperatorList()` fill-colour state does **not** propagate into
  `getTextContent()` items. To tag each text item with a colour you must
  walk `opList` in parallel and track the active fill across `beginText` /
  `endText` / `showText` — the PoC does this at run-level (contiguous block
  granularity) and that's sufficient to segment a page, but item-level
  tagging requires walking both streams and matching by occurrence index.
  `pdfjs-dist` 5.x gives `showText` args as arrays of glyph objects
  (`{ unicode, fontChar, isSpace, width, isInFont }`); reconstructing the
  exact per-item substring from `opList` is workable but non-trivial.
- Requires pointing `GlobalWorkerOptions.workerSrc` at a real file path even
  in Node (empty string fails). Legacy build resolves the worker in-process.

## Does the 2-layer pipeline hold? — Yes, conditionally

**Verdict: two-layer pipeline is viable and recommended**, but with one
important refinement from what the original plan implied.

| Layer | Tool | Responsibility |
|---|---|---|
| Body text | `pdftotext -layout` + a column splitter | Deterministic UTF-8 text, whitespace-preserved indentation, page-number anchors. No style. |
| Style overlay | `pdfjs-dist` operator walker | Per-run fill colour (`#ff0000` vs body) + fontName/scaleX classification (regular / all-caps / small-caps). Coordinates to line-match back to layer-A lines. |

The PoC proves both signals exist and are extractable without extra
dependencies. A single physical page yields ~250 text items and ~20 colour
runs — cheap to process in bulk (485 pages × ~250 items ≈ 120k tokens, single
JSON file on the order of a few MB).

**The refinement**: layer A's output is not neutral. It contains
**interleaved left/right columns per line**. Any consumer of layer A must
implement column splitting based on the whitespace gutter (30+ spaces). The
alternative — reconstruct lines from layer B's x/y token stream alone — is
tempting but loses `pdftotext`'s battle-tested indentation fidelity (which
commit `362bd25` already depends on via `scripts/out/psalter_layout.txt`).

One watch-out: **rubric colour does not cleanly mark "heading vs body"** in
this PDF. Page 376's red-run sample includes the full concluding-prayer
prose, not just section titles. Conclusion: red is a *liturgical* marker
(rubric = editor's instruction / prayer-block delimiter / title), not a
structural one. Styling decisions must combine colour **and** font class
(e.g. "red + f3 = section title", "red + f2 = rubric instruction text", "red
+ f4 small-caps = concluding-prayer marker line").

## Recommendations for Stage 3a / 3b

1. **Stage 3a (body-conservative extraction)**: adopt `pdftotext -layout` as
   the single source of body text. Build a *pure* column splitter (no merge
   heuristics) that takes each physical page block, cuts at the fixed
   whitespace gutter, and emits two independent line streams keyed by
   `bookPage`. Drop `mergeColumnWraps` and `mergeAcrossStanzaBoundaries`
   entirely. Kill the old `scripts/extract-psalm-texts.js` or narrow it to a
   pure passthrough over the split output.
2. **Stage 3b (style overlay tokens)**: write a production version of
   `scripts/parsers/pdf-lexer.poc.mjs` that, for every physical page:
   - emits one token per text item with `{ bookPage, x, y, str, fontName,
     scaleX, hasEOL, fill, isAllCaps, isSmallCaps }`,
   - assigns `fill` by walking `opList` in parallel and indexing into the
     `showText` occurrences (not by run-granularity),
   - joins fragmented small-caps words in-place when same-y + tight x-gap,
   - outputs a side-car JSON the UI can overlay onto layer-A body text to
     colour rubrics and mark section starts without repeating the body
     prose.
3. **Do not attempt style detection from pdftotext output alone.** The PoC
   shows `pdftotext` loses every style signal — rebuilding rubric flags from
   Cyrillic pattern matching is the exact path that produced the c92abf3
   corruption. Use layer B for style, always.
4. **Do not attempt body extraction from pdfjs alone.** Glyph-fragmentation
   (small-caps split into `Төг`+`С`+`гөлийн`, kerning-only spaces) means the
   token-stream body reconstruction is lossier than `pdftotext -layout`'s
   whitespace output for our Mongolian text. Use layer A for body, always.
5. **Column splitter test fixtures**: reuse pages 376–378 as the golden
   sample in unit tests. They cover a concluding prayer spanning two halves
   of a 2-up spread (a previously brittle case) plus a section-title
   transition ("ЖИРИЙН ЦАГ УЛИРАЛ") which is exactly the rubric-style case
   layer B must classify.
6. **No new dependencies required.** `pdftotext` is a system binary (already
   used by `scripts/out/psalter_layout.txt`), and `pdfjs-dist` is already
   shipped for the PDF viewer. Both are sufficient for full-book extraction.

## Open questions / follow-ups

- Do all 485 PDF pages use exactly the same two fill colours (`#ff0000`,
  `#2c2e35`)? A full-book colour histogram run will confirm before we wire
  layer B's colour taxonomy into production.
- How much variance in scaleX exists across small-caps runs? If >1 variant
  exists (e.g., different point sizes for "Төгсгөлийн" vs "Сонголтот"), the
  classifier must bucket by {fontName, scaleX rounded to 0.5}.
- Is any text rendered via text-as-image/Type3 glyphs that both tools would
  miss? Page 377 has 740 text items total which is plausible for full body
  coverage, but spot-check a sanctoral page before committing.
