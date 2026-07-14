# Truncation sweep — shard B evidence

This is the evidence packet for `wi-106-003`, covering every Cyrillic scalar
below `src/data/loth/prayers/commons/(root)` after the mandated
`gospelCanticleAntiphon*` exclusion. The authoritative row-level ledger is
`shard-B-results.jsonl`.

## Method and provenance

The scan followed `plan.md` stages 0–5 in order:

1. **Freeze.** The three source files produced 160 + 135 + 4,024 = 4,319
   addresses at frozen HEAD `52a8d02b50d4bc5374b9987bd89eb1bf2c2e234d`.
   The sorted shard address hash is
   `77dc7ed607cc7ac506c8c6b759af198ec20d44ae588ba5b116f4fa262022b486`.
2. **Enrich without filtering.** Every Cyrillic scalar received a row,
   including the catalog `_doc`, attribution fields, generated rich spans,
   pilot duplicates, and the Psalm 63 caption. Nearby ref/family and up to two
   preceding/following scalar values were retained as structural anchors.
3. **Reconstruct visual order.** `public/psalter.pdf` glyphs were clustered by
   y within ±1.5 pt, split at x = 297 pt, sorted by x inside each line, and read
   left-book-page then right-book-page. Only confirmed running headers and page
   numbers were removed. Section labels were retained. A repeated unit was
   localized by maximum family-wide sibling coverage plus exact physical-line
   matches; a repeated single prefix was insufficient.
4. **Compare conservatively.** Literal comparison ran first. Allowed normalized
   tiers were NFKC plus curly/straight quote and dash variants, then collapsed
   or stripped whitespace. Letters, inflection, vocabulary, punctuation
   presence, and word order were never normalized away. The existing
   12-character prefix locator was not used as a verdict.
5. **Adjudicate.** The coordinator's main-tree
   `intentional-divergences.jsonl` was applied by exact address and current
   value SHA-256. All remaining nonmatches were reviewed against their ref,
   adjacent lines, reconstructed book page, raw text line range, and plain
   twin. Every address then received one terminal disposition.

Review iteration 2 tightened the literal/normalized boundary against the
retained evidence itself. For every row initially marked `MATCH_NORMALIZED`,
the complete `evidence.data` value was tested as a byte substring of
`evidence.pdf_raw`. The 184 positive rows were reclassified as
`MATCH_LITERAL/literal`; 25 rows still require normalization (10 typography,
15 whitespace), and none of those 25 contains its data value verbatim in the
retained raw evidence.

Review iteration 3 corrected three raw-evidence excerpts that had converted
the PDF's actual curly quote glyphs to straight quotes. The Psalm 16 row on
book pages 168→169, Psalm 42 on page 195, and Psalm 96 on page 318 now retain
the literal U+201C/U+201D glyphs and physical newlines from pdfplumber. Their
data/PDF typography is identical; collapsing only physical-line/page-column
whitespace yields equality, so all three are `MATCH_NORMALIZED/whitespace`.

Leader-authorized review iteration 4 corrected the remaining ten whitespace
rows whose match was valid in compacted coordinate geometry but whose retained
excerpt had fallen back to the start of the page. Each row now retains the
minimal literal pdfplumber glyph span from its assigned book-page column. In
these spans the PDF has no whitespace glyph at one visual word gap; removing
whitespace from the stored value yields a byte-identical substring. An
exhaustive recheck now proves that all 15 `whitespace` rows satisfy that exact
tier, all 10 `typography` rows satisfy only the declared typography
normalization, all 4,276 `MATCH_LITERAL` rows contain their complete stored
value byte-for-byte, and no normalized row is already a literal match.

Source stamps:

- `/home/min/myproject/divineoffice/parsed_data/full_pdf.txt`:
  `f12f6135556f77df75593d2627ec2642ec6113c2a56f52b26102653580c1b330`
- `public/psalter.pdf`:
  `fa0397e9674745f2dc740094eb53f4a367740f6b55d50e1edcf8970972fc3fcd`

## Exact KEEP verification

Exactly two coordinator rulings intersect shard B. Both address and hash must
match; no phrase-level rule was used.

| Address | Current SHA-256 | Ruling | Result |
| --- | --- | --- | --- |
| `src/data/loth/prayers/commons/psalter-headers.rich.json#/refs/Psalm 63:2-9/entries/0/preface_text` | `d9be741e4dff2c0833556b9b39cc5005f7d34f2d5e9548239a155e599ef48bc5` | `AUTHORED_LAYOUT`; `goal126-psalm63-caption-provenance.md`; approved 2026-06-13 | `KEEP_RULED` |
| `src/data/loth/prayers/commons/psalter-headers.rich.json#/refs/Psalm 116:10-19/entries/0/preface_text` | `27a33e6c1a62679e446e2509c5ebe8c748a3b1e3a507c64601d3138b2ccc40ae` | `CURATED_CORRECTION`; STC-002; approved 2026-06-13 | `KEEP_RULED` |

The other occurrences of `хэнбугай ч` were independently scanned. Only the
single Psalm 63 header address above was suppressed by the authored-layout
ruling.

## Metadata closure

`src/data/loth/prayers/commons/psalter-headers.rich.json#/_doc` is the only
`NOT_APPLICABLE_METADATA` row. It documents loader, renderer, generator, and
evidence conventions; its Cyrillic marker examples are not a PDF-authored
content claim. It remains inside the 4,319 denominator and is not filtered out.

## Human-adjudicated divergence packets

All 15 rows below are in
`src/data/loth/prayers/commons/psalter-texts.rich.json`; each twin is in
`src/data/loth/psalter-texts.json`. Page is the printed book page. Source lines
refer to the absolute `full_pdf.txt` above. The PDF quote was also observed in
the geometry-reconstructed column stream on that page.

| # | Rich pointer → plain twin | Page / source lines | Stored scalar | PDF visual-order quote | First contrary content |
| ---: | --- | --- | --- | --- | --- |
| 1 | `#/Exodus 15:1-4a, 8-13, 17-18/stanzasRich/blocks/4/lines/1/spans/0/text` → `#/Exodus 15:1-4a, 8-13, 17-18/stanzas/4/1` | 161 / 5385–5387 | `Овоо мэт болсон давалгаа урсхаа умартан,` | `Овоо мэт болсон давалгаа урсахаа умартан,` | `урсхаа` → `урсахаа` |
| 2 | `#/Exodus 15:1-4a, 8-13, 17-18/stanzasRich/blocks/5/lines/2/spans/0/text` → `#/Exodus 15:1-4a, 8-13, 17-18/stanzas/5/2` | 161 / 5388–5391 | `Сэлэм юугаа сугалья,` | `Сэлэм юугаа сугалъя,` | `сугалья` → `сугалъя` |
| 3 | `#/Exodus 15:1-4a, 8-13, 17-18/stanzasRich/blocks/6/lines/0/spans/0/text` → `#/Exodus 15:1-4a, 8-13, 17-18/stanzas/6/0` | 161 / 5391–5394 | `Салхиа Та үлээх,` | `Салхиа Та үлээн,` | `үлээх` → `үлээн` |
| 4 | `#/Exodus 15:1-4a, 8-13, 17-18/stanzasRich/blocks/8/lines/5/spans/0/text` → `#/Exodus 15:1-4a, 8-13, 17-18/stanzas/8/5` | 162 / 5410–5415 | `тэднийгээ ариун гэрт тань авч ирлээ.` | `тэднийгээ ариун гэрт тань авч ирлээ` | stored text has a contrary terminal period |
| 5 | `#/Psalm 81:2-11/stanzasRich/blocks/6/lines/4/spans/0/text` → `#/Psalm 81:2-11/stanzas/6/4` | 251 / 8530–8533 | `Хаднаас гарсан балаар Би хангах байсан”.` | `Хаднаас гарсан балаар Би хангах байсан.”.` | period/closing-quote order differs |
| 6 | `#/Psalm 72:1-11/stanzasRich/blocks/0/lines/24/spans/0/text` → `#/Psalm 72:1-11/stanzas/0/24` | 255 / 8676–8679 | `Шеба хийгээд Себагийно хаад` | `Шеба хийгээд Себагийнo хаад` | stored Cyrillic `о` versus source Latin `o` |
| 7 | `#/Deuteronomy 32:1-12/stanzasRich/blocks/2/lines/2/spans/0/text` → `#/Deuteronomy 32:1-12/stanzas/2/2` | 281 / 9574–9577 | `Түүний хүүхэд биш, нүгэлтэй толбо болов.` | `Түүний хүүхэд биш, ичгүүрт толбо болов.` | `нүгэлтэй` → `ичгүүрт` |
| 8 | `#/Deuteronomy 32:1-12/stanzasRich/blocks/2/lines/4/spans/0/text` → `#/Deuteronomy 32:1-12/stanzas/2/4` | 281 / 9577–9579 | `Та нар ЭЗЭНд ингэж хариу байх байгаа юм уу?` | `Та нар ЭЗЭНд ингэж хариу барьж байгаа юм уу?` | `байх` → `барьж` |
| 9 | `#/Jeremiah 14:17-21/stanzasRich/blocks/0/lines/3/spans/0/text` → `#/Jeremiah 14:17-21/stanzas/0/3` | 378 / 13031–13034 | `Хөндүүртэй халдвар шархтай бэртээд` | `Хөндүүртэй халдварт шархтай бэртээд` | `халдвар` → `халдварт` |
| 10 | `#/Jeremiah 14:17-21/stanzasRich/blocks/3/lines/2/spans/0/text` → `#/Jeremiah 14:17-21/stanzas/3/2` | 378 / 13043–13046 | `Та биднийг юунд эдгүүлэгүйгээр цохив?` | `Та биднийг юунд эдгэшгүйгээр цохив?` | `эдгүүлэгүйгээр` → `эдгэшгүйгээр` |
| 11 | `#/Ezekiel 36:24-28/stanzasRich/blocks/0/lines/2/spans/0/text` → `#/Ezekiel 36:24-28/stanzas/0/2` | 507 / 17556–17559 | `Та нарыг эх нутагт чинь авчрах болно.` | `Та нарыг эх нутагт чинь аваачих болно.` | `авчрах` → `аваачих` |
| 12 | `#/Ezekiel 36:24-28/stanzasRich/blocks/1/lines/2/spans/0/text` → `#/Ezekiel 36:24-28/stanzas/1/2` | 507 / 17559–17562 | `Би та нарыг хамаг хир бүртгэс чинь,` | `Би та нарыг хамаг хир буртгаас чинь,` | `бүртгэс` → `буртгаас` |
| 13 | `#/Ezekiel 36:24-28/stanzasRich/blocks/1/lines/3/spans/0/text` → `#/Ezekiel 36:24-28/stanzas/1/3` | 507 / 17559–17563 | `Хамаг шүтээнээс та нарыг арилгах болно.` | `Хамаг шүтээнээс чинь цэвэрлэх болно.` | `та нарыг арилгах` → `чинь цэвэрлэх` |
| 14 | `#/Tobit 13:8-11, 13-15/stanzasRich/blocks/6/lines/2/spans/0/text` → `#/Tobit 13:8-11, 13-15/stanzas/6/2` | 492 / 17030–17033 | `Учир нь тэд цугларч, шударгатнуудыг Эзэнийг` | `Учир нь тэд цугларч, шударгатнуудын Эзэнийг` | `шударгатнуудыг` → `шударгатнуудын` |
| 15 | `#/Tobit 13:8-11, 13-15/stanzasRich/blocks/8/lines/0/spans/0/text` → `#/Tobit 13:8-11, 13-15/stanzas/8/0` | 492 / 17034–17037 | `Сэтгэл минь Эзэний, агуу Хааныг` | `Сэтгэл минь Эзэнийг, агуу Хааныг` | `Эзэний` → `Эзэнийг` |

Disposition for all 15 is `REVIEW_DIVERGENCE`. The ledger retains the literal
data, PDF quote, first divergence, book/physical page, ref/family/neighbor
anchors, and exact plain twin address for each row.

## Nine-gate adjudication

No row qualifies for a `CLEAR_TRUNCATION` evidence packet. The 15 nonmatches
share the following human adjudication; rows 1–15 above are the evidence set.

| Gate | Result | Evidence |
| --- | --- | --- |
| 1. Identity | PASS | Ref plus two adjacent scalar lines uniquely localize the cited PDF unit. |
| 2. Visual order | PASS | Quotes were verified in x/y geometry-reconstructed book-page columns, not accepted from raw interleaved order alone. |
| 3. Strict prefix loss | **FAIL** | None is a complete strict prefix of the same PDF unit after allowed normalization; a letter, word, or punctuation order diverges first. |
| 4. Positive tail | NOT REACHED | There is no proven omitted continuation after an otherwise identical stored prefix. |
| 5. Boundary proof | PASS | Adjacent line anchors and section/ref boundaries are recorded. |
| 6. No contrary content | **FAIL** | Each packet identifies the contrary stored content before any possible cut. |
| 7. No exact KEEP | PASS | None of the 15 addresses appears as a current exact address+hash KEEP ruling. |
| 8. Twin confirmation | PASS | The exact plain twin was inspected and carries the same divergence in every packet. |
| 9. Human evidence | PASS | Stored/PDF quotes, book page, source lines, anchors, and first divergence are recorded above and in JSONL. |

Because gates 3 and 6 fail, no omitted tail can be asserted, no fix bundle can
be requested, and no scanner-owned change is allowed. These rows remain
visible to the coordinator/user as non-truncation wording/punctuation review.

## Strict-prefix audit closure

All 4,301 match rows were rechecked specifically for the defect shape that a
raw substring test could hide:

- 4,000 are equal to a complete reconstructed physical line;
- 143 are complete scalars spanning physical lines;
- 157 are deliberately structured header preface/attribution fields; and
- one rich-line split has its entire visual continuation in the adjacent
  sibling scalar.

There are zero uncovered strict-prefix candidates. The Psalm 118 separator-dash
edge case was localized to its byte-identical repeated unit on book page 177
(`full_pdf.txt:5933-5936`), with the same ref and both adjacent lines. The dash
after the page-407 occurrence is not an omitted lexical continuation.

## No-fix disposition

No source file was edited. The 15 divergence pairs cannot be corrected by this
worker because only coordinator-adjudicated `CLEAR_TRUNCATION` bundles may be
fixed, and plain/rich twins must be locked to one fix owner. This packet is
therefore detection evidence only.
