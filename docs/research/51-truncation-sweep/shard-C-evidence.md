# Truncation sweep — shard C evidence

- Work item: `[#106-sub-3c]` / `wi-106-004`
- Scanner: `dvo-sol-co`
- Frozen source HEAD: `52a8d02b50d4bc5374b9987bd89eb1bf2c2e234d`
- Scope: `propers` 2,265 + `psalter` 2,051 + `sanctoral` 168 + `prayers/commons/compline` 42
- Terminal denominator: **4,526 / 4,526**
- Result ledger: `docs/research/51-truncation-sweep/shard-C-results.jsonl`
- Reproducer: `python3 docs/research/51-truncation-sweep/scan-shard-c.py`
- Policy: detection only; no source-data fixes

## Frozen inputs

| Input | Frozen evidence |
|---|---|
| Global LOTH denominator | `17,743` |
| Global address SHA-256 | `1aabb72bdbd92157854e6a7df3f985e7b0ac981be8bc54c8223e8b0bc51a8a10` |
| Shard-C address count | `4,526` unique addresses |
| Shard-C address SHA-256 | `283e83ca9c46a0d3c5186dc410d9befffcb9ab52e2630ab62a2acd57a1eb1c0d` |
| Shard-C address+content SHA-256 | `f4b386fd9c652802de155db6b7571b2d5c57b4c9df2c931c044dc698b9124e50` |
| Raw text SoT | `/home/min/myproject/divineoffice/parsed_data/full_pdf.txt` |
| Raw text SHA-256 | `f12f6135556f77df75593d2627ec2642ec6113c2a56f52b26102653580c1b330` |
| Geometry source | `public/psalter.pdf` |
| Geometry SHA-256 | `fa0397e9674745f2dc740094eb53f4a367740f6b55d50e1edcf8970972fc3fcd` |
| Result-ledger SHA-256 | `dce2fa91eb13724330479011502088ea199bf920ccf4781fb8a61521b438c41e` |

The scanner aborts on HEAD, source-hash, area-count, total-count, or duplicate-address drift. It reads the coordinator ledger from the main worktree and applies a KEEP only when both exact address and current value SHA-256 match.

## Geometry-first scan

The detector implements the committed plan's stages without changing data:

1. It walks every JSON scalar containing Cyrillic in the four assigned areas and excludes only the mandated `gospelCanticleAntiphon*` ancestors.
2. It attaches the nearest field-specific page hint, structural anchors, literal value hash, field family, and cross-area plain/rich links.
3. It opens the tracked PDF with `pdfplumber`, clusters glyphs by y within ±1.5 pt, splits spreads at x=297, sorts each book-page column independently, and removes only proven running page headers/numbers. The 485-file-page PDF yields 968 independently ordered book-page streams (front/back singles plus the intervening spreads).
4. It tests literal reconstructed order, then NFKC/typography, then whitespace-stripped equality. Raw-text substring presence is retained only as evidence and never promoted to a geometry match.
5. It applies the exact coordinator KEEP ledger, classifies authored/runtime metadata explicitly, and sends every remaining localized mismatch to divergence or geometry review.
6. Every output row carries the nine `clear_truncation_gates`, literal data, raw-text fragment, reconstructed visual fragment, twin addresses, and a terminal disposition.

## Terminal reconciliation

| Area | Units | `MATCH_LITERAL` | `MATCH_NORMALIZED` | `KEEP_RULED` | `REVIEW_DIVERGENCE` | `REVIEW_GEOMETRY` | `NOT_APPLICABLE_METADATA` | Twin-linked rows |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `propers` | 2,265 | 1,334 | 664 | 12 | 192 | 32 | 31 | 759 |
| `psalter` | 2,051 | 1,940 | 45 | 1 | 65 | 0 | 0 | 224 |
| `sanctoral` | 168 | 85 | 38 | 0 | 41 | 0 | 4 | 0 |
| `prayers/commons/compline` | 42 | 41 | 1 | 0 | 0 | 0 | 0 | 35 |
| **Total** | **4,526** | **3,400** | **748** | **13** | **298** | **32** | **35** | **1,018** |

There are zero `SOURCE_NOT_FOUND` rows and zero `CLEAR_TRUNCATION` rows. The terminal sum is `3,400 + 748 + 13 + 298 + 32 + 35 = 4,526`.

### Tier-truthfulness self-audit

`evidence.pdf_visual` is the exact original geometry slice used for the verdict; surrounding text is retained separately as `evidence.pdf_visual_context`. A full-ledger audit returned:

```text
MATCH_LITERAL rows=3400 byte_mismatches=0
MATCH_NORMALIZED rows=748 byte_equal_violations=0 tier_truth_violations=0
SOURCE_NOT_FOUND rows=0 raw_occurrence_violations=0
SELF_AUDIT=PASS
```

For a normalized row, `comparison_tier=typography` requires equality after only NFKC plus quote/dash/ellipsis normalization while preserving whitespace. `comparison_tier=whitespace` requires equality after that typography normalization plus whitespace removal. The reproducer raises instead of writing a row when either invariant is false.

## Exact KEEP application

Thirteen of the coordinator's 17 approved entries belong to shard C:

- twelve enumerated `STC-003` corrected-space addresses in propers; and
- `src/data/loth/psalter/week-2.json#/days/FRI/vespers/intercessions/3` (`STC-001`, corrected `ард`).

Each row matched the coordinator's exact address and value hash. The other four coordinator entries are outside shard C and were not applied here. No phrase, page, filename, or regex suppression exists.

## Plain/rich twin evidence

The ledger records 1,018 rows with a cross-structure twin link:

- responsory: 335;
- intercessions: 315;
- concluding prayer: 156;
- short reading: 119;
- alternative concluding prayer: 58; and
- Compline rich text spans: 35.

By area this is 759 propers rows linked to seasonal rich overlays, 224 psalter rows linked to commons/psalter overlays, and 35 Compline-rich rows linked back to the plain ordinarium catalog. Sanctoral has no corresponding rich overlay in the frozen data. Links may cross scan-shard boundaries; they are evidence only and do not authorize independent mutation.

## Nine-gate adjudication

No row satisfies all nine `CLEAR_TRUNCATION` gates:

- exact/normalized rows establish stored scalar equality in reconstructed order and therefore fail **strict prefix loss** and **positive tail**;
- exact KEEP rows fail **no exact KEEP** by definition;
- divergence rows contain substitution, reorder, translation, or contrary content and therefore fail **strict prefix loss** and/or **no contrary content**;
- geometry rows cannot establish **visual order**; and
- metadata rows are not PDF-authored content claims.

The matched atomic content families were also tail-checked against their next visual boundary. Short readings terminate before the responsory heading; concluding prayers terminate before `Сонголтот залбирал` or the closing rubric; psalm prayers terminate before the next psalm/reading marker. Apparent abrupt fragments in intercession arrays and rich spans are stored visual-line units with explicit next-scalar/twin linkage, not omitted PDF tails. No content-unit match exposed a visually attached omitted continuation.

## Manual divergence packets

These five cases are useful controls because a raw-substring detector would misclassify them:

### Header contamination — Advent week 1 Sunday Lauds responsory

- Address: `src/data/loth/propers/advent.json#/weeks/1/SUN/lauds/responsory/versicle`
- Data: `Ирэлтийн цаг улирал Та ирэх ёстой Нэгэн мөн.`
- Book page 552 visual order: running header `Ирэлтийн цаг улирал`; separate versicle `Та ирэх ёстой Нэгэн мөн.`
- Verdict: `REVIEW_DIVERGENCE`. The stored scalar prepends a running header; contrary content defeats the truncation signature.

### Cross-page join — week 2 Wednesday Lauds intercession

- Address: `src/data/loth/psalter/week-2.json#/days/WED/lauds/intercessions/6`
- Data joins `байгаарай.` to `- Таны хишиг ивээл...`
- Visual order: book 234 ends the first unit; book 235 starts the second response.
- Verdict: `REVIEW_DIVERGENCE`. This is cross-page contamination/reorder, not suffix loss.

### Cross-page join — week 3 Monday Lauds intercession

- Address: `src/data/loth/psalter/week-3.json#/days/MON/lauds/intercessions/13`
- Data joins `болгооно уу.` to `- Бид Таны хамтран ажиллагчид...`
- Visual order: the fragments are separate units across the 320/321 spread boundary.
- Verdict: `REVIEW_DIVERGENCE` for the same contrary-content reason.

### Mixed-script source title

- Address: `src/data/loth/psalter/week-3.json#/days/THU/lauds/psalms/1/title`
- Data: `Сайн Хоньчин ...`
- Book page 361: `Сайн хоньчnн ...` (Latin `n` in the PDF word).
- Verdict: `REVIEW_DIVERGENCE`; a character substitution/correction is not strict-prefix loss.

### Sanctoral heading substitution

- Address: `src/data/loth/sanctoral/memorials.json#/deceased/name`
- Data: `Талийгааг Бологсдын Төлөөх Хурал`
- Book page 844: `Талийгаач бологсдын төлөөх хурал`
- Verdict: `REVIEW_DIVERGENCE`; the final character differs before the unit boundary.

## Geometry review queue

The 32 `REVIEW_GEOMETRY` rows are paired `pageRedirects` label/evidence values for styled `Магтуу` page references. The wording is exact in `full_pdf.txt`, but the PDF renders the heading with separately styled glyph runs whose baselines exceed the ±1.5 pt clustering tolerance (for example, geometry emits `М: . 874-875. агТуух`). Because reconstructed equality is not proven, these rows remain geometry review instead of being called matches. None has positive omitted-tail evidence.

## Metadata closure

The 35 metadata rows comprise durable curator/runtime prose rather than PDF-authored content claims: 11 explicit notes/basis fields, 14 English scripture `ref` identifiers whose only Cyrillic is a verse suffix such as `б`, and 10 bracketed `[Ерөнхий хэм хэмжээ]` curator explanations. Ordinary `evidencePdf.text` quotations and redirect labels were not screened as metadata.

## Outcome

Shard C is scan-complete and read-only. All 4,526 frozen addresses have terminal dispositions and evidence packets. No candidate passes the nine clear-truncation gates, so this shard proposes no fixes, no fix bundles, and no regression-data mutations.
