# GOAL167 RCA C - scan and fix direction

## Scope

This note lists the currently found two-class psalter/canticle body boundary defects and recommends a prevention strategy. It builds on:

- `docs/research/GOAL167-rca-A-identity.md`
- `docs/research/GOAL167-rca-B-rootcause.md`

## Scan method

I scanned `src/data/loth/psalter-texts.json` and `src/data/loth/prayers/commons/psalter-texts.rich.json` for:

- Class A: non-body text in stanza/body fields: prayer doxology tails, rubric/directive lines, and uncited epigraph/citation lines.
- Class B: body lines that are fragments rather than valid unit starts: one-word or short continuation lines that should attach to the previous line, and lowercase first lines that prove the entry starts mid-verse.

Focused command output for the final classified instances:

```json
{
  "classA_instances": [
    {"ref":"Psalm 5:2-10, 12-13","si":0,"li":0,"text":"Үгийг зүрх сэтгэлийнхээ зочин болгон, хүлээн авдаг тэдгээр нь цаглашгүй баяр баясгаланг эдлэх болно"},
    {"ref":"Psalm 137:1-6","si":0,"li":0,"text":"Тантай, Ариун Сүнсний нэгдэлтэй, үүрд мөнх оршин хаанчилдаг Тэнгэрбурхан Есүс Христ бидний Эзэн, Таны Хүүгээр уламжлан тийн болтугай."},
    {"ref":"Psalm 137:1-6","si":2,"li":0,"text":"Төгсгөлийг дэг жаягийн дагуу дуусгана, х. 38."}
  ],
  "classB_instances": [
    {"ref":"1 Chronicles 29:10-13","si":0,"li":1,"text":"ЭЗЭН,"},
    {"ref":"Psalm 147:12-20","si":0,"li":0,"text":"хөндлүүдийг бэхжүүлэн"}
  ]
}
```

Marker scan note: a broad `Х.`/rubric-marker scan also returns Revelation 19 refrain lines and one Isaiah body phrase. These are not counted as defects: Revelation 19 is a responsorial biblical canticle in the PDF (`parsed_data/full_pdf.txt:2273-2301`) and rich data explicitly marks those lines as `role: "refrain"` (`src/data/loth/prayers/commons/psalter-texts.rich.json:3158-3167`, `src/data/loth/prayers/commons/psalter-texts.rich.json:3261-3270`); Isaiah's `Хариу нь Түүний өмнө байна.` is ordinary body text, not a section marker.

## Class A instances - content contamination

| id | file:line | fragment | identity | office/location |
|---|---|---|---|---|
| A1 | `src/data/loth/psalter-texts.json:273-277`; rich visible at `src/data/loth/prayers/commons/psalter-texts.rich.json:3404-3433` | `Үгийг зүрх... эдлэх болно` | uncited epigraph/citation, not Psalm 5 body | Week 1 Monday Lauds psalm 1: `src/data/loth/psalter/week-1.json:192-205`; raw source `parsed_data/full_pdf.txt:2455-2460` |
| A2 | `src/data/loth/psalter-texts.json:4265-4269` | `Тантай, Ариун Сүнсний...` | previous/adjacent concluding-prayer doxology tail leaked into Psalm 137 plain body | Week 4 Tuesday Vespers psalm 1: `src/data/loth/psalter/week-4.json:432-441`; polluted intermediate `parsed_data/week4/week4_final.txt:1740-1748`; clean raw source `parsed_data/full_pdf.txt:15530-15538` |
| A3 | `src/data/loth/psalter-texts.json:4270-4278` | `Төгсгөлийг дэг жаягийн дагуу дуусгана, х. 38.` | rubric/directive line leaked into Psalm 137 plain body | same Week 4 Tuesday Vespers location; polluted intermediate `parsed_data/week4/week4_final.txt:1750-1757`; clean raw source `parsed_data/full_pdf.txt:15538-15544` |

Visibility note: A2/A3 are latent in the plain catalog. The rich overlay for Psalm 137 starts with the correct body at `src/data/loth/prayers/commons/psalter-texts.rich.json:56119-56160`, so current rich-first rendering should hide those two plain-catalog defects. They still matter because `resolvePsalm` keeps `stanzas: psalmText.stanzas` as fallback data (`src/lib/hours/resolvers/psalm.ts:55-83`).

## Class B instances - line/verse boundary defects

| id | file:line | fragment | identity | office/location |
|---|---|---|---|---|
| B1 | `src/data/loth/psalter-texts.json:320-325`; rich visible at `src/data/loth/prayers/commons/psalter-texts.rich.json:4077-4097` | `ЭЗЭН,` after `Бидний эцэг өвөг Израилийн Тэнгэрбурхан` | one-word continuation split into its own line/phrase; belongs with the preceding invocation | Week 1 Monday Lauds canticle: `src/data/loth/psalter/week-1.json:207-217`; raw source `parsed_data/full_pdf.txt:2523-2531` |
| B2 | `src/data/loth/psalter-texts.json:4518-4522`; rich visible at `src/data/loth/prayers/commons/psalter-texts.rich.json:59018-59029` | entry starts with lowercase `хөндлүүдийг бэхжүүлэн` | body starts mid-verse; preceding lines `Йерусалим аа...`, `Сион оо...`, `Тэрээр гулдан хаалгануудын чинь` are missing from the catalog entry | Week 2 Friday Lauds psalm 3: `src/data/loth/psalter/week-2.json:838-848`; raw/intermediate source `parsed_data/week2/week2_final.txt:3387-3395`; full PDF example `parsed_data/full_pdf.txt:17054-17069` |

## Existing verifier coverage

Current NFR-style verifiers do not catch these classes reliably:

- `scripts/verify-psalter-pages.js` validates page numbers using header and first-stanza fingerprints (`scripts/verify-psalter-pages.js:3-18`). It explicitly skips doxology-like stanza prefixes when fingerprinting (`scripts/verify-psalter-pages.js:122-136`, `scripts/verify-psalter-pages.js:153-165`), so A2/A3-style contamination can be ignored by design. It does not assert that all body-start lines are semantically valid.
- `scripts/audit-psalter-ref-consistency.js` compares first-stanza fingerprints to declared pages (`scripts/audit-psalter-ref-consistency.js:3-23`, `scripts/audit-psalter-ref-consistency.js:50-58`). Running `node scripts/audit-psalter-ref-consistency.js --json` reported two unrelated suspects, not the five instances above: `1 Samuel 2:1-10` and `Revelation 4:11; 5:9-10, 12`.
- `scripts/verify-phrase-coverage.js` checks phrase schema, bounds, non-overlap, contiguous coverage, and role uniformity (`scripts/verify-phrase-coverage.js:3-30`, `scripts/verify-phrase-coverage.js:87-223`). Running `node scripts/verify-phrase-coverage.js --check` returned `OK — 354 stanza(s) with phrases inspected, 0 violations`; this proves geometry only, not semantic correctness.
- `scripts/verify-psalter-stanzas.js` is a coarse suspect finder for line-count divergence, doxology disagreement, and truncation (`scripts/verify-psalter-stanzas.js:3-22`). It drops leading metadata heuristically (`scripts/verify-psalter-stanzas.js:189-210`) and is not a fail-hard semantic guard for uncited epigraphs, rubric lines inside bodies, or uppercase orphan words.

Conclusion: existing verifiers are useful but orthogonal. They mostly validate page/ref/geometry invariants; they do not enforce "stanza body contains only body units".

## Fix direction

### Class A

Recommended fix: combination of data sanitize, extraction fix, and new verifier.

1. Data sanitize existing catalog entries.
   - Remove A1 from Psalm 5 body/plain and rich stanza lines.
   - Remove A2/A3 from Psalm 137 plain `psalter-texts.json`; confirm rich remains as-is.
2. Extraction fix.
   - Extend `scripts/extract-psalm-texts.js` body-start logic beyond parenthesized epigraphs. The current generic skip only recognizes epigraphs ending with `)` (`scripts/extract-psalm-texts.js:495-514`), and Psalm 5 proves uncited epigraphs need either a ref-keyed skip like Psalm 63 (`scripts/extract-psalm-texts.js:277-313`) or a stronger body-start anchor.
   - Add a hard stop/filter for rubric/directive lines such as `Төгсгөлийг дэг жаягийн дагуу...` when collecting stanza body; the current collection keeps any non-noise, non-end-marker line (`scripts/extract-psalm-texts.js:354-377`).
3. Verifier prevention.
   - Add a semantic "body purity" verifier over both plain and rich catalogs. It should fail on doxology/concluding-prayer tails, page/rubric directives, section headers, and known non-body epigraphs in stanza arrays unless explicitly allowlisted.

### Class B

Recommended fix: combination of data sanitize and targeted semantic verifier; extraction logic should be improved but not by a broad uppercase merge.

1. Data sanitize existing catalog entries.
   - B1: join `Бидний эцэг өвөг Израилийн Тэнгэрбурхан` + `ЭЗЭН,` for display/phrase purposes, or override phrase grouping so the two lines render as one phrase. Because `ЭЗЭН,` begins uppercase, broad lowercase-wrap logic will never join it.
   - B2: restore the missing Psalm 147 opening lines before `хөндлүүдийг бэхжүүлэн` from the source (`parsed_data/week2/week2_final.txt:3391-3395` or `parsed_data/full_pdf.txt:17066-17069`) in both plain and rich catalogs.
2. Extraction fix.
   - Keep the current lowercase-continuation merge for ordinary wraps (`scripts/extract-psalm-texts.js:89-137`), but add targeted exception handling for sacred-name uppercase continuations like `ЭЗЭН,` where the previous line is an incomplete invocation.
   - Avoid a broad "merge uppercase short line into previous" rule; many legitimate repeated acclamations are uppercase short lines.
3. Verifier prevention.
   - Add checks for lowercase first body lines in psalter entries. The scan found only `Psalm 147:12-20` in that shape, making it a low-noise fail-hard rule.
   - Add checks for one-token uppercase orphan lines after non-terminal previous lines, with a small allowlist for legitimate acclamations/refrains. B1 should fail; Daniel/Revelation repeated responses should remain allowlisted by liturgical basis.

## Outcome evidence

Expected AC: two classes of contamination instances fully listed, with evidence-backed fix direction including recurrence prevention.

Captured:

- Instance count: Class A = 3 catalog instances; Class B = 2 catalog instances.
- Class A file evidence: `src/data/loth/psalter-texts.json:273-277`, `src/data/loth/prayers/commons/psalter-texts.rich.json:3404-3433`, `src/data/loth/psalter-texts.json:4265-4278`.
- Class B file evidence: `src/data/loth/psalter-texts.json:320-325`, `src/data/loth/prayers/commons/psalter-texts.rich.json:4077-4097`, `src/data/loth/psalter-texts.json:4518-4522`, `src/data/loth/prayers/commons/psalter-texts.rich.json:59018-59029`.
- Verifier evidence: `node scripts/verify-phrase-coverage.js --check` passed geometry with 354 stanzas; `node scripts/audit-psalter-ref-consistency.js --json` reported unrelated suspects, showing current checks do not cover these semantic classes.

Result: AC met.
