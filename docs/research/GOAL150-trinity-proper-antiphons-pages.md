# GOAL #150 - Trinity Sunday proper antiphons and page confirmation

Task: WI-160. Scope: confirm what the local Ordo/PDF and available source evidence can support for Trinity Sunday First Vespers psalm/canticle antiphons and page fields.

## Findings summary

[D1] The local Mongolian PDF does not print a Trinity First Vespers psalmody block for the corrected GOAL #150 target (`Psalm 113:1-9`, `Psalm 147:12-20`, `Ephesians 1:3-10`). In the Trinity section, the PDF prints the First Vespers heading and Magnificat antiphon, then immediately moves to Lauds. Therefore it does not provide Mongolian psalm/canticle antiphons or page anchors for the three First Vespers psalmody entries.

[D2] Universalis confirms the Latin/English First Vespers target and antiphon slots for the US calendar on Saturday 2026-05-30: Psalm 112/113, Psalm 147B, and Ephesians 1. Its English antiphon incipits are `All glory belongs`, `Blessed be the holy Trinity`, and `Glory and honour be`. This confirms the three antiphon slots exist, but it is not a Mongolian text source and must not be machine-translated into app data.

[D3] The local PDF does confirm Trinity Gospel-canticle antiphons and pages:

| Office | Confirmed PDF page | Local data page | Source |
| --- | ---: | ---: | --- |
| First Vespers Magnificat antiphon | 747 | 745 | `parsed_data/full_pdf.txt:25879` to `parsed_data/full_pdf.txt:25885`; current data at `src/data/loth/propers/ordinary-time.json:3471` and page field at `:3476` |
| Lauds Benedictus antiphon | 747 | 747 | `parsed_data/full_pdf.txt:25886` to `parsed_data/full_pdf.txt:25891`; current data at `src/data/loth/propers/ordinary-time.json:3479` to `:3480` |
| Second Vespers Magnificat antiphon | 748-749 | 748 | `parsed_data/full_pdf.txt:25924` to `parsed_data/full_pdf.txt:25932`; current data at `src/data/loth/propers/ordinary-time.json:3501` to `:3502` |

[D4] Page review tooling already flagged the First Vespers page mismatch: `scripts/out/propers-page-review.json:116` to `scripts/out/propers-page-review.json:132` records `weeks.trinitySunday.SUN.firstVespers.gospelCanticleAntiphonPage` and `concludingPrayerPage` as declared `745`, matched `747`, delta `2`. This is separate from the missing First Vespers psalmody; do not copy the stale `745` page value onto new psalm entries.

## Evidence

Local PDF/Ordo evidence:

- Table of contents points `Туйлын Ариун Нандин Гурвал` to page 747 at `parsed_data/full_pdf.txt:85`.
- Trinity section begins at `parsed_data/full_pdf.txt:25872` to `parsed_data/full_pdf.txt:25879`.
- First Vespers prints only `Мариагийн магтаал` and its antiphon at `parsed_data/full_pdf.txt:25879` to `parsed_data/full_pdf.txt:25885`.
- The next heading is Lauds at `parsed_data/full_pdf.txt:25886`, followed by its Benedictus antiphon at `parsed_data/full_pdf.txt:25887` to `parsed_data/full_pdf.txt:25891`.
- The collect and optional collect occupy `parsed_data/full_pdf.txt:25892` to `parsed_data/full_pdf.txt:25923`.
- Second Vespers begins at `parsed_data/full_pdf.txt:25924`, and its Magnificat antiphon is printed at `parsed_data/full_pdf.txt:25925` to `parsed_data/full_pdf.txt:25932`.
- No local Ordo file was found outside the PDF-derived assets: `rg --files | rg -i 'ordo'` returned no project source.

Local repo search:

- Searching `parsed_data/full_pdf.txt` and `src/data/loth` for Trinity-specific phrases finds the three Gospel-canticle antiphons and collect material, but no separate Mongolian antiphons corresponding to the Universalis Psalm 113, Psalm 147B, or Ephesians 1 antiphons.
- Existing local body text for the target entries remains available, as recorded in `docs/research/GOAL150-trinity-1vespers-psalms.md:46` to `docs/research/GOAL150-trinity-1vespers-psalms.md:53`.

External confirmation:

- `https://universalis.com/usa/20260530/vespers.htm` identifies the date as Saturday 30 May 2026 and lists the First Vespers target sequence as `Psalm 112 (113)`, `Psalm 147 (147B)`, and `Canticle | Ephesians 1`.
- The same source shows three distinct psalm/canticle antiphon slots, but only in English. Use it to confirm structure, not Mongolian text.

## Implementation implications

1. The data implementation for GOAL #150 can safely add First Vespers psalm refs `Psalm 113:1-9`, `Psalm 147:12-20`, and `Ephesians 1:3-10`.
2. The implementation cannot safely fill Mongolian psalm/canticle antiphon text for those three entries from the current local PDF/Ordo evidence.
3. If the schema requires antiphon fields, use explicit source-gap placeholders or a local `sourceStatus`/TODO convention rather than translating Universalis English.
4. Do not assign page `745` to the new psalmody entries. The local PDF does not provide page anchors for them, and the page-review artifact already shows `745` is stale for nearby Trinity First Vespers material.
5. If a later source supplies Mongolian antiphons, attach page fields from that source. Until then, regression tests for GOAL #150 should assert refs/body presence and absence of Psalm 114 from First Vespers, but should not assert invented Mongolian antiphon text.

This keeps the GOAL #150 fix bounded: target refs are confirmed; body text is local; proper Mongolian psalm/canticle antiphons and their pages remain unconfirmed by current Ordo/PDF evidence.
