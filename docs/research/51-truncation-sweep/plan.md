# Two-column-interleave truncation sweep — processing plan

- Work item: `[#106-sub-2]` / 108
- Input census: `docs/research/51-truncation-sweep/targets.md` at `a83720c`
- Sweep denominator: `N = 17,743`
- Target-address fingerprint: `1aabb72bdbd92157854e6a7df3f985e7b0ac981be8bc54c8223e8b0bc51a8a10`
- Text SoT: `/home/min/myproject/divineoffice/parsed_data/full_pdf.txt`
- Visual-order geometry: tracked `public/psalter.pdf`
- Policy: read-only detection first; surgical fixes only after `CLEAR_TRUNCATION` adjudication

## Decision summary

Step 3 should use **four scanning shards**. This is the best point in the requested 3–5-member range: the four whole-area shard sizes are 4,367, 4,319, 4,526, and 4,531, a max/min ratio of 1.049. If five members are available, the fifth is more valuable as the whitelist/adjudication/integration coordinator than as an undersized fifth scan shard.

Every target is processed through:

1. census and provenance gates;
2. page/section localization;
3. geometry-backed visual-reading-order reconstruction;
4. strict alignment plus a truncation-signature test;
5. exact-address/hash KEEP ruling lookup;
6. human adjudication for every non-exact candidate; and
7. denominator reconciliation.

Raw substring failure is **candidate-generation evidence only**. It is never a truncation verdict. The g-48 examples prove that the text dump may emit a correct two-column sentence in non-reading order.

Only a candidate satisfying every `CLEAR_TRUNCATION` gate may be fixed. All other mismatches are `KEEP_RULED`, `MATCH`, `REVIEW`, `SOURCE_NOT_FOUND`, or `NOT_APPLICABLE`. No bulk re-extraction is allowed.

## Scope accounting: “15 areas” versus N

The accepted Step-1 ledger has **15 data-area rows**, but only **14 LOTH rows** sum to `17,743`. The fifteenth row is `src/data/bible`: its 35,243 units were inventoried as sibling data but are not comparable to the full breviary PDF. Step 3 must not silently add them to N.

| Ledger class | Areas | Units | Step-3 action |
|---|---:|---:|---|
| LOTH PDF-sweep areas | 14 | 17,743 | partition across scanners |
| Bible sibling area | 1 | 35,243 | coordinator records `NOT_APPLICABLE_SOURCE` outside N; separate source-specific goal if wanted |
| Mandated `gospelCanticleAntiphon*` exclusion | across LOTH | 297 excluded leaves | remains outside N; do not rediscover |

Thus “15 areas covered” means fourteen scanned areas plus one explicitly closed non-applicable sibling area. Terminal scan reconciliation remains exactly `17,743`.

## Detection pipeline

### Stage 0 — freeze the denominator

Before dispatch:

- run `node docs/research/51-truncation-sweep/enumerate.mjs`;
- require `loth_pdf_sweep_targets=17743`, `reconciles=true`, `target_addresses_unique=true`, and address SHA `1aabb72b…`;
- materialize one immutable row per `file#JSON-pointer`, preserving duplicate values; and
- stamp every shard manifest with source HEAD, target count, target-address SHA, `full_pdf.txt` SHA `f12f6135…`, and `public/psalter.pdf` SHA `fa0397e…`.

If HEAD changes data before a shard starts, regenerate and have the coordinator approve the census delta. A worker must not scan an old address against new content.

### Stage 1 — enrich without filtering

For each target row, attach:

- area and shard;
- literal data value and its SHA-256;
- semantic field family and any known plain/rich twin;
- page hints from nearby `page`, `*Page`, `source.page`, `evidencePdf.page`, or evidence line ranges;
- nearest stable structural anchors such as ref, title, heading, day/hour, hymn number, or section id; and
- candidate provenance: curated plain, generated rich, pilot, catalog, rubric/evidence metadata, or runtime body.

`trivial_threshold=0` still applies. Short labels, one-word strings, comments, rich spans, and generated duplicates get rows and terminal dispositions. “Probably not rendered” is not a filter.

### Stage 2 — reconstruct visual reading order before matching

`full_pdf.txt` remains the wording SoT, but its raw order is not the page’s reading order. Use the tracked PDF only to recover geometry:

1. Open the hinted physical page in `public/psalter.pdf`.
2. Cluster glyphs into lines by y (the existing `scripts/lib/extract-paragraphs-from-pdf.py` uses ±1.5 pt).
3. Split left/right book-page columns by x; the existing geometry uses `COLUMN_BOUNDARY=297`.
4. Sort within each column by y, and glyphs within a line by x.
5. Map the two physical-page columns to book pages using printed page numbers.
6. Preserve an unfiltered raw fragment and a filtered comparison stream. Only confirmed page numbers/running headers may be removed from the comparison stream.
7. Locate the unit by page hint plus its structural anchors. Without a page hint, search reconstructed book-page streams using at least two independent anchors; a repeated single prefix is insufficient.
8. Allow a unit to span a page boundary only when its section identity continues across the boundary.

The PoC at `scripts/out/poc-findings.md` already proves that `pdftotext -layout` interleaves the two book pages and that x-coordinate separation is reliable. Reuse the geometry, not its body-rewrite recommendations.

Do **not** use `extract-paragraphs-from-pdf.py::line_matches` as the truncation verdict. Its 12-character prefix tolerance is appropriate for locating a known rich line, but in this sweep it could accept the exact prefix-loss defect being sought.

If geometry extraction is unavailable or page identity cannot be proven, disposition is `REVIEW_GEOMETRY`, not “no defect.”

### Stage 3 — normalize for comparison, never for repair

Maintain two forms:

- **Evidence form:** literal data and literal reconstructed PDF text, retained for quotes.
- **Comparison form:** Unicode NFKC, collapsed whitespace, normalized curly/straight quote and dash variants, and optional whitespace-stripped alignment.

Comparison normalization must not change letters, inflection, word order, punctuation presence, or vocabulary. No spell correction, translation equivalence, or 12-character-prefix “match” is permitted. A normalized match is recorded with the exact normalization tier used.

### Stage 4 — alignment and truncation signature

First classify exact/normalized equality. For a mismatch, align the whole data value against the uniquely localized PDF unit and capture the longest common prefix/suffix, missing PDF tail, extra data tail, and first divergence.

A candidate is `CLEAR_TRUNCATION` only when **all** are true:

1. **Identity:** page/section/ref anchors identify one PDF unit, not merely a repeated phrase.
2. **Visual order:** comparison is against geometry-reconstructed reading order, not raw `full_pdf.txt` order.
3. **Strict prefix loss:** after allowed typographic normalization, the complete data value is a strict prefix of the same PDF unit, or one stored final line is a strict prefix whose omitted continuation is visually attached to that line.
4. **Positive tail:** the PDF supplies at least one omitted character/token before the proven unit boundary. `trivial_threshold=0` means a one-character tail still counts.
5. **Boundary proof:** the tail is not the next antiphon, rubric, prayer, stanza, column, page header, or neighboring unit.
6. **No contrary content:** stored text has no substitution, reorder, or extra tail before the cut. Those are divergence/contamination, not clear truncation.
7. **No exact KEEP:** no current exact-address + value-hash user/curator ruling applies.
8. **Twin confirmation:** a plain/rich counterpart is inspected, even if only one copy is truncated.
9. **Human evidence:** a reviewer records the PDF quote, book page, raw interleaved fragment, reconstructed order, data prefix, and omitted tail.

Punctuation and lowercase/uppercase starts are triage signals only. A missing terminal mark does not prove truncation, and a terminal mark does not prove completeness.

### Stage 5 — terminal dispositions

Every one of the 17,743 target addresses gets exactly one:

| Disposition | Meaning | Fix allowed? |
|---|---|---|
| `MATCH_LITERAL` | literal equality in reconstructed order | no |
| `MATCH_NORMALIZED` | equality under an allowed typography/whitespace tier | no |
| `KEEP_RULED` | exact current value is covered by an approved ruling | no |
| `CLEAR_TRUNCATION` | passes all nine gates | yes, under fix policy |
| `REVIEW_DIVERGENCE` | substitution/reorder/translation/ambiguous boundary | no |
| `REVIEW_GEOMETRY` | visual order or unique source location not proven | no |
| `SOURCE_NOT_FOUND` | source unit cannot be located after anchored search | no |
| `NOT_APPLICABLE_METADATA` | unit is Mongolian data but not a PDF-authored content claim; evidence explains why | no |

“No raw substring” is not a terminal disposition.

The coordinator closes the sweep only when the disjoint union of all terminal rows equals 17,743 and reproduces the frozen address SHA.

## Intentional-divergence and user-ruling whitelist

Step 3 should create a reviewed JSONL ledger such as `docs/research/51-truncation-sweep/intentional-divergences.jsonl`. It is not a phrase blacklist. Each entry is an evidence-bearing ruling:

```json
{
  "address": "src/data/loth/...json#/exact/json/pointer",
  "value_sha256": "<current literal value hash>",
  "decision": "KEEP",
  "reason_code": "USER_RULING|CURATED_CORRECTION|AUTHORED_LAYOUT|INTENTIONAL_TRANSLATION",
  "evidence": ["tracked doc:line", "commit or user-ruling record"],
  "approved_by": "user|leader",
  "approved_on": "YYYY-MM-DD",
  "notes": "why PDF divergence or layout is intended"
}
```

Rules:

- match exact address **and** current value hash;
- never suppress by substring, regex, filename, page, or phrase globally;
- a hash mismatch makes the entry `STALE_WHITELIST` and sends the row to review;
- duplicates require explicit addresses or an explicit, enumerated address list;
- workers may propose whitelist entries but may not approve their own proposals;
- corrected data that now matches PDF needs no whitelist;
- `KEEP_RULED` remains counted inside N; it is not dropped from the denominator.

### Required seed: `хэнбугай ч`

GOAL #126 records the user decision to keep the Psalm 63 uncited caption’s authored two-line layout. The exact current header value is:

```text
Гэм нүглийн харанхуйгаас салсан хэнбугай ч
Тэнгэрбурханыг хүсэн тэмүүлнэ.
```

Seed a KEEP entry for the exact `psalter-headers.rich.json` `preface_text` address/value, citing `docs/research/goal126-psalm63-caption-provenance.md` and the 2026-06-13 goal-completion ruling. The phrase `хэнбугай ч` must **not** become a global suppression: its occurrences in pilot body catalogs have different structural roles and must be independently classified.

Seed other entries only from durable user rulings or curated-correction evidence (for example, accepted g-41 judgments), never from “the current data differs, therefore it must be intentional.”

## Parallel shard plan

### Preferred: four scanners

| Shard | Areas | Units | Deviation from 4-shard average |
|---|---|---:|---:|
| A | `src/data/loth/(root)` | 4,367 | −1.55% |
| B | `src/data/loth/prayers/commons/(root)` | 4,319 | −2.63% |
| C | `propers` 2,265 + `psalter` 2,051 + `sanctoral` 168 + `prayers/commons/compline` 42 | 4,526 | +2.03% |
| D | `ordinarium` 664 + `prayers/commons/psalter` 336 + `prayers/hymns` 1,954 + seasonal advent 306 + christmas 181 + easter 383 + lent 443 + ordinary-time 264 | 4,531 | +2.15% |
| **Total** | **14 included areas** | **17,743** | average 4,435.75 |

Range is 212 units; max/min ratio is 1.0491. The `src/data/bible` row is handled once by the coordinator as the fifteenth, non-N area.

### If only three members are available

Use a dedicated three-shard regrouping rather than making one worker consume two four-member shards:

| Shard | Areas | Units |
|---|---|---:|
| 3A | LOTH root 4,367 + all five seasonal areas 1,577 | 5,944 |
| 3B | commons root 4,319 + ordinarium 664 + commons/psalter 336 + sanctoral 168 + commons/compline 42 | 5,529 |
| 3C | propers 2,265 + psalter 2,051 + hymns 1,954 | 6,270 |
| **Total** | **14 included areas** | **17,743** |

The maximum deviation from the three-member average is 6.52%.

### If five members are available

Keep the preferred four scan shards and assign member 5 as coordinator/adjudicator:

- own the immutable denominator and Bible non-applicable closure;
- seed and review the KEEP ledger;
- perform second-person review of `CLEAR_TRUNCATION` evidence;
- lock cross-shard plain/rich fix bundles;
- merge shard ledgers and enforce terminal reconciliation; and
- integrate commits in a serialized order.

This is safer and more balanced than forcing an indivisible 4,367-unit root area into a five-way whole-area split.

### Shard protocol

Each scanner receives a frozen manifest and writes one result row per address. Detection is read-only and parallel. Before any fix:

1. worker submits a `CLEAR_TRUNCATION` evidence packet;
2. coordinator verifies all nine gates;
3. coordinator expands it into a `fix_bundle` containing every plain/rich twin and affected file;
4. coordinator locks those addresses/files to one owner; and
5. only that owner edits and commits the complete bundle.

This separates balanced scan ownership from mutation ownership. It prevents the root plain catalog and commons rich catalog—different scan shards—from being edited independently for the same semantic defect.

If early pilots show strong complexity skew (rich AST review costs more than plain strings), rebalance only unopened whole subareas before fixes begin. Record old/new shard manifests and preserve the disjoint-union hash.

## Fix policy

### What may be fixed

Only `CLEAR_TRUNCATION`. A fix commit must contain:

- exact data address and old value;
- book page plus literal PDF quote;
- raw interleaved fragment and reconstructed visual-order quote;
- omitted tail highlighted;
- whitelist miss evidence;
- plain/rich twin disposition;
- area-specific RED→GREEN regression evidence; and
- updated shard result row.

### Plain/rich twins are atomic

- Update plain and rich copies together when both exist.
- If rich is generated from plain, regenerate only the relevant entry/path and prove unrelated entries byte-stable.
- If one side is intentionally absent, record the loader/render reason.
- Flatten both post-fix values and assert semantic equality.
- Never leave a complete plain value beside a stale truncated rich overlay, or vice versa.

The plain/rich asymmetries documented in `docs/research/GOAL167-rca-review.md` show why count-only validation is insufficient.

### Regression test per affected area

Add or extend one focused regression file per affected data area, grouping that area’s findings:

- assert complete PDF-verbatim value(s);
- negative-guard the former truncated prefix;
- assert plain/rich semantic equality where applicable; and
- assert the detector no longer emits the fixed addresses while denominator reconciliation stays unchanged.

Do not add one test file per leaf. Run JSON parsing, the area regression, existing area verifiers, the detector reconciliation, and relevant loader/render tests.

### Surgical change only

- No bulk `extract-psalm-texts.js` or full-catalog overwrite.
- No “fix all mismatches” script.
- Prefer exact old-value/hash-guarded JSON-pointer edits or a narrowly scoped idempotent patcher.
- Abort if the expected old value is absent or non-unique.
- Keep formatting and unrelated bytes stable.
- Do not fold typos, translations, line-wrap preferences, contamination, or page-number changes into a truncation fix.
- Ambiguous cases remain reports for user/leader judgment.

`scripts/apply-psalmprayer-completeness-fix.mjs` documents the same reason: curated catalogs contain manual and multi-pipeline corrections that a full re-extraction can destroy.

## Artifacts expected from Step 3

- immutable shard manifests with counts and hashes;
- per-address result JSONL for every shard;
- reviewed intentional-divergence ledger;
- `CLEAR_TRUNCATION` evidence packets;
- surgical fix commits and area regressions, if any;
- ambiguity/user-decision report;
- final merge ledger proving terminal count 17,743 and original address-set equality.

Suggested result-row minimum:

```json
{
  "address": "file#pointer",
  "value_sha256": "...",
  "shard": "A",
  "page": 123,
  "anchors": ["ref/title", "section"],
  "comparison_tier": "literal|typography|whitespace",
  "disposition": "MATCH_LITERAL|MATCH_NORMALIZED|KEEP_RULED|CLEAR_TRUNCATION|REVIEW_DIVERGENCE|REVIEW_GEOMETRY|SOURCE_NOT_FOUND|NOT_APPLICABLE_METADATA",
  "evidence": {"data": "...", "pdf_raw": "...", "pdf_visual": "...", "omitted_tail": "..."},
  "twin_addresses": [],
  "reviewer": "..."
}
```

## Outcome evidence

- **How:** read this committed plan and assert that it contains the geometry-first pipeline, nine-gate truncation signature, exact-address/hash whitelist with the `хэнбугай ч` KEEP seed, four-shard sum, 3/4/5-member operating modes, and surgical plain+rich fix contract.
- **Expected:** “author the Step-2 processing plan for the truncation sweep — (1) detection pipeline (visual-reading-order reconstruction pre-filter + truncation-signature test; raw substring unreliable per g-48), (2) intentional-divergence whitelist strategy (curated corrections + user rulings must NOT be re-flagged — e.g. 'хэнбугай ч' is a KEEP ruling), (3) balanced parallel shard partition of the 15 areas / 17,743 units for 3-5 Step-3 members, (4) fix policy (CLEAR truncations only, PDF quotes per change, plain+rich twins in pairs, regression test per area, no bulk re-extraction).”
- **Captured:** this document records geometry-before-match and forbids raw-substring verdicts; defines all-nine `CLEAR_TRUNCATION` gates; scopes KEEP by exact address/hash and seeds the GOAL #126 ruling; reconciles 14 LOTH areas plus one Bible non-N area; sums preferred shards to 4,367 + 4,319 + 4,526 + 4,531 = 17,743; supplies 3-, 4-, and 5-member modes; and makes PDF quotes, twin-atomic edits, area regressions, and surgical no-bulk changes mandatory.
