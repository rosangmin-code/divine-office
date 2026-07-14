# Truncation sweep — shard B summary

- Work item: `wi-106-003` / `[#106-sub-3b]`
- Scope: `src/data/loth/prayers/commons/(root)`
- Shard justification: none; one indivisible data area, no runnable test shard authored
- Frozen source HEAD: `52a8d02b50d4bc5374b9987bd89eb1bf2c2e234d`
- Result: **4,319 / 4,319 addresses have one terminal disposition**
- Fix-eligible result: **0 `CLEAR_TRUNCATION`**; no data fixes were made

## Frozen manifest

| Item | Value |
| --- | --- |
| Files | `psalter-headers.rich.json` 160; `psalter-texts.pilot.rich.json` 135; `psalter-texts.rich.json` 4,024 |
| Shard target count | `4,319` |
| Unique addresses | `true` |
| Shard address SHA-256 | `77dc7ed607cc7ac506c8c6b759af198ec20d44ae588ba5b116f4fa262022b486` |
| Shard address+content SHA-256 | `24448f9d38646bedd1ef73abeccecd25b2071071b4698f06dc69b5230b1b7312` |
| Global LOTH denominator | `17,743` |
| Global LOTH address SHA-256 | `1aabb72bdbd92157854e6a7df3f985e7b0ac981be8bc54c8223e8b0bc51a8a10` |
| Text SoT | `/home/min/myproject/divineoffice/parsed_data/full_pdf.txt` |
| Text SoT SHA-256 | `f12f6135556f77df75593d2627ec2642ec6113c2a56f52b26102653580c1b330` |
| Geometry source | `public/psalter.pdf` |
| Geometry SHA-256 | `fa0397e9674745f2dc740094eb53f4a367740f6b55d50e1edcf8970972fc3fcd` |
| Result ledger SHA-256 | `e509e2d44149c910429573c37ef444f7d91301a2480c71eb59766dccf66a2b10` |

The frozen values agree with the coordinator's main-tree
`coordinator-manifest.md`. The three source files were unchanged from the
frozen HEAD while this scan ran.

## Terminal reconciliation

| Disposition | Count |
| --- | ---: |
| `MATCH_LITERAL` | 4,276 |
| `MATCH_NORMALIZED` | 25 |
| `KEEP_RULED` | 2 |
| `REVIEW_DIVERGENCE` | 15 |
| `NOT_APPLICABLE_METADATA` | 1 |
| `CLEAR_TRUNCATION` | 0 |
| `REVIEW_GEOMETRY` | 0 |
| `SOURCE_NOT_FOUND` | 0 |
| **Total** | **4,319** |

Comparison tiers among all rows are 4,291 literal, 13 typography-normalized,
12 whitespace-normalized, and 3 not compared (the two exact KEEP rulings and
one catalog `_doc` metadata row).

Review iteration 1 recomputed tiers directly from retained row evidence. It
promoted 184 former `MATCH_NORMALIZED/typography` rows whose complete data
value occurs byte-for-byte in `evidence.pdf_raw` to
`MATCH_LITERAL/literal`. A second all-row check found zero remaining normalized
rows with a verbatim raw-evidence hit.

The two `KEEP_RULED` rows are exact address+value-hash hits in the coordinator
ledger, never phrase-wide suppressions:

1. Psalm 63's authored two-line uncited caption (`AUTHORED_LAYOUT`).
2. Psalm 116:10-19's corrected `Тэнгэрбурханд` preface (`CURATED_CORRECTION`,
   source typo `Гэнгэрбурханд`).

The 15 review rows are terminal `REVIEW_DIVERGENCE`, not unresolved source
locations. Each has a uniquely anchored PDF quote and a plain twin with the
same stored divergence. Every row contains substitution, vocabulary, or
contrary punctuation before any possible cut, so it fails the strict-prefix
and no-contrary-content gates. They are reported for coordinator/user judgment;
the coordinator-locked fix policy forbids this scanner from changing them.

## Detection result

Geometry reconstruction split each physical spread at x = 297 pt, clustered
glyphs into lines within ±1.5 pt y, and read the left and right book pages
separately. Only confirmed page numbers and running headers were removed from
the comparison stream. Section labels remained available as boundaries.
Repeated psalms/canticles were localized as complete families by maximizing
their sibling-line coverage and exact physical-line matches, rather than by a
single repeated prefix.

Allowed comparison normalization was limited to Unicode NFKC, collapsed
whitespace, curly/straight quote variants, and dash variants. No letter,
vocabulary, inflection, or word-order equivalence was allowed. Raw substring
failure was never used as a verdict.

The strict-prefix audit of the 4,301 match rows closed as follows:

| Audit class | Count |
| --- | ---: |
| Exact physical-line equality | 4,000 |
| Complete scalar spanning physical lines | 143 |
| Structured header preface/attribution fields | 157 |
| Rich split whose continuation is present in its sibling scalar | 1 |
| Uncovered strict-prefix candidates | **0** |
| **Total match rows** | **4,301** |

Psalm 118 supplies the only repeated-occurrence punctuation edge case: book
page 407 adds a separator dash after `авралыг соёрхооч!`, while the ref plus
both adjacent lines identify a byte-identical complete occurrence on book page
177 (`full_pdf.txt:5933-5936`). It is therefore a literal match, not an omitted
tail.

## Artifacts

- `shard-B-results.jsonl`: one evidence-bearing row per frozen address.
- `shard-B-evidence.md`: method, exact KEEP verification, all 15 divergence
  packets, twin checks, and the grouped nine-gate adjudication.
- `shard-B-summary.md`: this manifest and reconciliation.

No source data, runtime code, whitelist approval, or fix bundle was changed.
