# GOAL167 RCA B - root cause

## Scope

This note traces why two Week 1 Monday Lauds psalm/canticle boundary symptoms render in the UI:

- Case 1: the non-body text `Үгийг зүрх сэтгэлийнхээ зочин болгон...` appears as Psalm 5 body.
- Case 2: `ЭЗЭН,` appears as a standalone line after `Бидний эцэг өвөг Израилийн Тэнгэрбурхан` in the 1 Chronicles canticle.

## Render path

The renderer is a pass-through for psalter stanza data; it is not creating either symptom.

Evidence:

- `src/lib/loth-service.ts:130-147` loads psalm/canticle entries from the four-week psalter.
- `src/lib/loth-service.ts:559-573` resolves each psalm entry through `resolvePsalm`.
- `src/lib/hours/resolvers/psalm.ts:55-82` loads `src/data/loth/psalter-texts.json`, selects `psalmText.stanzas`, and also loads the optional rich overlay with `loadPsalterTextRich(entry.ref)`.
- `src/lib/prayers/rich-overlay.ts:240-283` loads `src/data/loth/prayers/commons/psalter-texts.rich.json` and returns `entry.stanzasRich`.
- `src/components/prayer-renderer.tsx:80-82` renders `PsalmodySection` for psalmody sections.
- `src/components/prayer-sections/psalmody-section.tsx:40-45` renders each assembled psalm through `PsalmBlock`.
- `src/components/psalm-block.tsx:133-256` renders `psalm.stanzasRich.blocks[].lines[]` when rich data exists; each stored rich line becomes a block span.
- `src/components/psalm-block.tsx:257-276` falls back to `psalm.stanzas[][]`; each stored plain line becomes a block span.

Current data contains both symptoms before rendering:

- `src/data/loth/psalter-texts.json:273-277` stores the Case 1 fragment as the first line under `"Psalm 5:2-10, 12-13"`.
- `src/data/loth/prayers/commons/psalter-texts.rich.json:3404-3433` stores the same fragment as rich stanza lines.
- `src/data/loth/psalter-texts.json:320-325` stores `Бидний эцэг өвөг Израилийн Тэнгэрбурхан` and `ЭЗЭН,` as separate lines under `"1 Chronicles 29:10-13"`.
- `src/data/loth/prayers/commons/psalter-texts.rich.json:4077-4097` preserves the same split as rich lines.

Conclusion for render layer: the UI renders the data it is given. The contamination and split are already present in the data catalogs.

## Extraction path

The relevant source-to-data path is `scripts/extract-psalm-texts.js` -> `src/data/loth/psalter-texts.json` -> `scripts/build-psalter-texts-rich.mjs` -> `src/data/loth/prayers/commons/psalter-texts.rich.json`.

Evidence:

- `scripts/extract-psalm-texts.js:3-11` declares that it extracts psalm/canticle body text from `parsed_data/weekN/weekN_final.txt` and writes `psalter-texts.json`.
- `scripts/extract-psalm-texts.js:14-20` warns that full re-extraction is not idempotent against the curated catalog.
- `scripts/extract-psalm-texts.js:261-274` loads `parsed_data/weekN/weekN_final.txt`.
- `scripts/extract-psalm-texts.js:572-592` finds matching headers, calls `extractPsalmBody`, then writes the resulting `stanzas` into `result[ref]`.
- `scripts/extract-psalm-texts.js:612-614` writes `src/data/loth/psalter-texts.json`.
- `scripts/build-psalter-texts-rich.mjs:149-166` reads each plain `entry.stanzas` and calls `buildPsalterStanzasRich`.
- `scripts/build-psalter-texts-rich.mjs:195-202` writes the generated `stanzasRich` entry into the rich catalog.
- `scripts/parsers/rich-builder.mjs:1351-1364` maps every source stanza line to a rich `line` without dropping or joining text.
- `scripts/parsers/rich-builder.mjs:1368-1380` verifies text equivalence, so the rich builder intentionally preserves the plain catalog text.
- `scripts/parsers/rich-builder.mjs:1383-1406` verifies stanza and line counts, so the rich builder intentionally preserves line boundaries.

`scripts/lib/responsory-parser.js` is not the source of these two symptoms. It parses `Хариу залбирал` responsory blocks into `{ fullResponse, versicle, shortResponse }` (`scripts/lib/responsory-parser.js:4-17`) and stops on psalm/canticle/antiphon/common-prayer markers (`scripts/lib/responsory-parser.js:20-47`, `scripts/lib/responsory-parser.js:109-120`). `scripts/extract-psalter-commons.js` likewise extracts short readings, responsories, gospel-canticle antiphons, intercessions, and concluding prayers (`scripts/extract-psalter-commons.js:103-217`), not psalm/canticle body stanzas.

## Case 1 root cause

Layer: extraction/data.

Mechanism: `extractPsalmBody` skips the psalm reference header and title, then only skips epigraphs that end with a parenthetical reference. The reported Psalm 5 introductory citation has no parenthetical reference in the parsed text, so it is collected as body text.

Evidence:

- Source layout: `parsed_data/full_pdf.txt:2455-2459` has `Дуулал 5:2-10, 12-13`, the title, then the reported fragment.
- Actual body starts after it: `parsed_data/full_pdf.txt:2460-2467` starts with `ЭЗЭН, үгэнд минь чих тавьж, ...`.
- Extracted week file has the same order: `parsed_data/week1/week1_final.txt:947-952` places the fragment before the Psalm 5 body.
- `scripts/extract-psalm-texts.js:317-343` skips the header and title.
- `scripts/extract-psalm-texts.js:345-348` calls `skipEpigraph`.
- `scripts/extract-psalm-texts.js:496-518` defines `skipEpigraph`; it only skips when a scanned line ends with `)` or `).`.
- `scripts/extract-psalm-texts.js:350-352` has a special exact-text skip only for Psalm 63, not Psalm 5.
- `scripts/extract-psalm-texts.js:354-377` then collects every non-noise, non-end-marker line into `bodyLines`.
- Resulting data: `src/data/loth/psalter-texts.json:273-277` stores the fragment as Psalm 5 stanza text.

Conclusion: Case 1 is a pre-body metadata boundary miss. The extractor lacks a rule/catalog entry for uncited introductory citations like the Psalm 5 line, so the line crosses from source header/preface area into the body catalog.

## Case 2 root cause

Layer: extraction/data.

Mechanism: `extractPsalmBody` preserves physical PDF lines unless a continuation line starts with lowercase Cyrillic. The wrapped word `ЭЗЭН,` starts with uppercase Cyrillic, so the line-wrap merge heuristic does not join it to the preceding line. The rich builder then preserves that line boundary by design.

Evidence:

- Source layout: `parsed_data/full_pdf.txt:2523-2531` introduces the `1Шастирын дээд 29:10-13` canticle and prints `Бидний эцэг өвөг Израилийн Тэнгэрбурхан`, `ЭЗЭН,`, `Та мөнхийн мөнхөд магтагдах болтугай.` on consecutive physical lines.
- Extracted week file has the same split: `parsed_data/week1/week1_final.txt:310-318`.
- `scripts/out/psalter_layout.txt:1392-1402` shows those lines in the same right-column canticle block, not separated by a new heading or response marker.
- `scripts/extract-psalm-texts.js:89-114` documents and implements `mergeColumnWraps`: only lowercase-initial Cyrillic lines are merged into the previous line.
- `scripts/extract-psalm-texts.js:380-397` groups body lines into stanzas and applies `mergeColumnWraps`.
- Because `ЭЗЭН,` starts uppercase, it remains a separate stanza line.
- Resulting plain data: `src/data/loth/psalter-texts.json:320-325`.
- Resulting rich data: `src/data/loth/prayers/commons/psalter-texts.rich.json:4077-4097`.

Conclusion: Case 2 is a physical-line-wrap heuristic miss. The line is legitimate canticle body, but the extractor treats an uppercase wrapped divine-name word as a new logical line.

## Common cause?

The two symptoms share the same layer but not the same exact predicate.

- Common layer: psalter body extraction/data, specifically the path from `parsed_data/weekN/weekN_final.txt` into `psalter-texts.json`, then into `psalter-texts.rich.json`.
- Not render: `PsalmBlock` renders stored lines as block spans and does not inject the Psalm 5 fragment or split `ЭЗЭН,`.
- Not active responsory parsing: `scripts/lib/responsory-parser.js` handles `Хариу залбирал` blocks, not psalm/canticle body stanzas.
- Not `extract-psalter-commons.js`: that script populates common prayer fields, not `psalter-texts.json` body stanzas.
- Different predicates:
  - Case 1: missing pre-body uncited epigraph/citation exclusion.
  - Case 2: uppercase one-word physical wrap not merged by the lowercase-only continuation heuristic.

## Outcome verification

Expected AC: two symptoms' root cause is identified by file:line at the data/extraction/render layer, with a conclusion on whether they share a common cause.

Captured evidence:

```sh
rg -n "Үгийг зүрх|Бидний эцэг өвөг|Psalm 5:2-10|1 Chronicles 29:10-13" \
  src/data/loth/psalter-texts.json \
  src/data/loth/prayers/commons/psalter-texts.rich.json \
  parsed_data/week1/week1_final.txt \
  parsed_data/full_pdf.txt -S
```

Key captured hits:

- `parsed_data/full_pdf.txt:2457` and `src/data/loth/psalter-texts.json:276` prove Case 1 exists in the source-adjacent extracted text and in body data.
- `parsed_data/full_pdf.txt:2529` and `src/data/loth/psalter-texts.json:323` prove Case 2 exists in the source-adjacent extracted text and in body data.
- `src/data/loth/prayers/commons/psalter-texts.rich.json:3414` and `src/data/loth/prayers/commons/psalter-texts.rich.json:4087` prove the rich render input preserves both symptoms.
