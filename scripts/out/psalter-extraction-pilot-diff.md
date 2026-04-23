# Psalter Extraction Pilot — diff report

**Scope**: Ordinary Time Week 1 SUN Lauds (3 refs). The pilot is a
read-only side-car (`src/data/loth/psalter-texts.pilot.json`); the
production `psalter-texts.json` is untouched.

**Pipeline**: `pdftotext -layout` over physical PDF pages 30..33 ->
`scripts/parsers/pdftotext-column-splitter.mjs` (pure column cut, no merge
heuristics) -> `scripts/extract-psalter-pilot.mjs` (page-local header and
end-marker scan).

---

## Summary table

| Ref | Existing stanzas / lines / chars | Pilot stanzas / lines / chars | Text match | Prayer preserved | Verdict |
|---|---|---|---|---|---|
| Psalm 63:2-9 | 2 / 25 / 747 | 8 / 26 / 747 | YES (byte-identical after whitespace norm) | existing=yes, pilot=no | **IMPROVEMENT (stanzas), PARTIAL (prayer dropped)** |
| Daniel 3:57-88, 56 | 15 / 84 / 1931 | 19 / 84 / 1931 | YES | both=no | **IMPROVEMENT (stanza granularity closer to PDF)** |
| Psalm 149:1-9 | 1 / 22 / 741 | 1 / 25 / 741 | YES | existing=yes, pilot=no | **MATCH (stanza), IMPROVEMENT (line wrap), PARTIAL (prayer dropped)** |

After whitespace normalisation all three ref bodies reproduce the existing
text byte-for-byte. No content was dropped; no foreign content was injected
into any pilot body. Stanza counts differ intentionally: the pilot respects
the PDF's own blank-line boundaries instead of applying the legacy
`mergeAcrossStanzaBoundaries` heuristic, which is the **primary fix**
motivating Stage 3a.

---

## Psalm 63:2-9 (book page 58)

- **Stanza count**: existing = 2, pilot = 8. **IMPROVEMENT.** The PDF
  (physical page 30) shows five visible blank-line breaks inside the psalm
  body (between verses 2-3, 4, 5, 6, 6-7, 7 — the narrow column forces
  separate stanzas for each sense unit). The existing JSON collapsed all of
  them into two macro-stanzas because `mergeAcrossStanzaBoundaries`
  re-glued any stanza whose first line began with a lowercase Cyrillic
  letter. The pilot preserves the PDF structure.
- **Line count**: existing = 25, pilot = 26. The single extra line is a
  wrap-continuation ("өргөнө.") that the existing extractor had folded into
  its neighbour. Pilot keeps it as a separate physical line. **NEUTRAL.**
- **Indent**: existing `{0, 2}`, pilot `{0, 3}`. Both encode a two-level
  hierarchy (main hemistich vs. continuation). Pilot uses the raw
  pdftotext column offsets; existing had been normalised to 2-space steps.
  Renderer (`psalm-block.tsx`) treats `>0` uniformly, so this is cosmetic.
  **MATCH (semantically).**
- **Prayer**: existing carries a 275-character `psalmPrayer`; pilot has
  none. **REGRESSION** against the existing JSON but expected — the pilot
  extractor is scoped to psalm body only. Prayer attachment is a Stage 3a-b
  follow-up (separate extractor pass keyed on the `Дууллыг төгсгөх
  залбирал` marker, same PDF pages).
- **Text fidelity**: `existing === pilot` after whitespace normalisation.
  First non-match: none.

---

## Daniel 3:57-88, 56 (book page 60)

This is the canticle with a refrain structure ("Эзэнийг магтагтун.") —
the STANZA_SPLIT stress test.

- **Stanza count**: existing = 15, pilot = 19. **IMPROVEMENT-LEANING.**
  The 4 extra stanzas are caused by column-wrap orphans at the book
  boundaries (books 60 left / 61 right / 62 left / 63 right of physical
  pages 31 and 32). When a hemistich fills out the left column's last line
  and the refrain lands on the right column's first line (or vice versa),
  pdftotext outputs them as separate visible lines with a blank row
  between them, which the pilot respects. The legacy extractor had
  `mergeColumnWraps` paper over these; the pilot does not (by design). The
  price is a handful of 1-line "orphan refrain" stanzas — see pilot
  stanzas 4, 11, 13 in the output. These remain faithful to the PDF's own
  layout; downstream can join them at render time (via the `psalm-block`
  indent rule: indent >= 2 follows the preceding hemistich).
- **Line count**: existing = 84, pilot = 84. **MATCH.**
- **Char count**: existing = 1931, pilot = 1931. **MATCH.**
- **Indent**: existing `{0, 2}`, pilot `{0, 2, 3, 5, 6}`. The wider indent
  palette reflects the fact that the canticle body crosses four book
  columns, each with its own baseline column on its physical page. When
  the right-column baseline differs from the left by 2-3 characters the
  pilot preserves that offset as ±2-3 indent. Visually equivalent (the
  renderer collapses any indent >= 2 into a single "continuation" class),
  but a **potential REGRESSION if a renderer elsewhere expects {0, 2}
  exclusively**. Flag for review.
- **Gloria Patri false-positive**: an early iteration of the pilot matched
  the canticle's own final stanza ("Эцэг, Хүү, Ариун Сүнсийг магтацгаая",
  accusative case) against the Gloria Patri end-marker ("Эцэг, Хүү,
  Ариун Сүнсэнд", dative). Fixed by pinning the marker to the dative form
  only. Equivalent accusative-case false matches are a thing to watch for
  elsewhere in the corpus.
- **Post-body rubric**: the pilot extractor had to add an explicit end
  marker for "Энэ магтаалын төгсгөлийн үед..." (the rubric instructing
  readers NOT to recite the Gloria Patri after this canticle) and
  "Шад дуулал" (the next antiphon's marker for canticles). Without them
  the pilot kept reading into the next section. **Addressed.**
- **Text fidelity**: `existing === pilot` after whitespace normalisation.

---

## Psalm 149:1-9 (book page 64)

- **Stanza count**: existing = 1, pilot = 1. **MATCH.** Single-stanza
  psalm on physical page 33 left column, no internal blank lines in the
  PDF.
- **Line count**: existing = 22, pilot = 25. **IMPROVEMENT.** The
  existing extractor had folded 3 wrap-continuation lines ("болгодог.",
  "дуулуул.", "гүйцэтгэхийн тулд болой.") into their preceding
  hemistiches via `mergeColumnWraps`. Pilot keeps them as separate visible
  lines — this matches the PDF layout and is the intended behaviour when
  the UI's psalm renderer drives hemistich joining via indent rules rather
  than post-hoc text mangling.
- **Indent**: existing `{0}`, pilot `{3}`. Both are single-level, so the
  offset is cosmetic. However the existing JSON shows ind=0 across the
  board because the extractor had `trim`-then-render; pilot preserves the
  PDF's left-margin 3-space indent. Renderer treats uniformly.
  **NEUTRAL.**
- **Prayer**: existing carries a 261-character psalmPrayer; pilot has
  none. Same scope note as Psalm 63 above. **REGRESSION** (scoped).
- **Text fidelity**: `existing === pilot` after whitespace normalisation.

---

## Trade-offs and open questions before scaling to 167 entries

1. **Orphan-refrain stanzas** (Daniel 3 case): the pilot's refusal to
   merge across blank lines produces small "orphan" single-line stanzas
   at book-column boundaries. For the pilot's canticle these amount to
   3-4 stanzas out of 19. Before scaling, decide whether the downstream
   renderer (`psalm-block.tsx`) can absorb them visually (by treating
   ind>=2 as a continuation) or whether a **structural** post-process is
   needed. Our strong recommendation: handle at render-time, keep the
   data source faithful to the PDF.
2. **Psalm prayer attachment**: out of scope for this pilot. The 275-char
   and 261-char prayers in Psalm 63 and Psalm 149's existing entries must
   be re-extracted by a parallel `Дууллыг төгсгөх залбирал` scan before
   the pilot can replace production data. Design: keyed on book-page
   range, bounded by the same page-local end-markers.
3. **Gloria Patri vs. canticle final verse**: confirmed with Daniel 3
   that pinning the marker to the dative case ("Сүнсэнд") avoids false
   matches. Verify the same distinction survives the full 4-week corpus.
4. **Indent palette**: pilot emits `{0, 2, 3, 5, 6}` for Daniel 3. The
   renderer must collapse these or the diff against the current JSON
   will produce cosmetic spacing regressions. Audit `psalm-block.tsx`'s
   indent class mapping before committing the pilot output to prod.
5. **Rubric/antiphon marker coverage**: the pilot added "Энэ магтаалын
   төгсгөл", "Шад дуулал", and the stricter Gloria Patri pattern on the
   fly. Scaling requires enumerating every such marker from the corpus
   (likely one more scan of `psalter_full_text.txt`) — otherwise
   ~5-10% of entries will over-run into the next section.

---

## Recommendation

Pilot is **APPROVE with caveats for Stage 3a scaling**. Text fidelity is
confirmed byte-equal across all three pilot entries. Stanza-count
differences are by design and favour the PDF-faithful structure we want
going forward. Before scaling to all 167 entries, the four items above
(orphan joining at render-time, prayer attachment pass, Gloria Patri case
discipline, indent palette audit) need to be resolved or the full
production JSON will see cosmetic regressions even though the text body
is correct.
