# Truncation sweep — coordinator final reconciliation

- Work item: `[#106-sub-3co]` / `wi-106-001`
- Coordinator: `dvo-rev2-co`
- Frozen source HEAD: `52a8d02b50d4bc5374b9987bd89eb1bf2c2e234d`
- Reconciled main HEAD: `54e0f4c0cbbc397b0a0b7070e08801904d709118`
- Frozen denominator: `N = 17,743`
- Frozen address SHA-256: `1aabb72bdbd92157854e6a7df3f985e7b0ac981be8bc54c8223e8b0bc51a8a10`
- Final verdict: **COMPLETE for the dispatched truncation sweep; zero `CLEAR_TRUNCATION` rows and zero authorized fix bundles**

## Closure statement

All four review-PASSed shard ledgers were parsed and logically merged by
address. Their disjoint union contains exactly the frozen 17,743 LOTH target
addresses. There are no duplicate, missing, or extra addresses, and the sorted
union reproduces the frozen address SHA-256 exactly.

No row passed all nine `CLEAR_TRUNCATION` gates after shard-level adversarial
review and correction iterations. Phase 2 is therefore empty: there are no
candidate packets for second-person approval, no plain/rich fix bundles, no
fix owner locks, and no data or regression-test changes to dispatch.

This conclusion is deliberately narrower than “all data agrees with the
PDF.” The terminal union still contains 446 `REVIEW_DIVERGENCE`, 413
`REVIEW_GEOMETRY`, and 132 `SOURCE_NOT_FOUND` rows. Those 991 rows are fully
counted and remain visible as non-clear residuals; they were not silently
promoted to matches or discarded from N.

## Input ledger provenance

| Shard | Scope | Rows | Merge commit | Result-ledger SHA-256 |
|---|---|---:|---|---|
| A | `src/data/loth/(root)` | 4,367 | `1f43248a211e61ee15c085bc046c4d18df1c5213` | `074cb63ccbafa11c1360753409e1665fcd3bacb34c3b140c879b3c96685a3550` |
| B | `src/data/loth/prayers/commons/(root)` | 4,319 | `96403c0ec6f7da842b515328dd441cab97a1fbf0` | `8cb26612eff183af593647c786a146b53e6488027c9355b75578b3a5858aec04` |
| C | propers, psalter, sanctoral, commons/compline | 4,526 | `54e0f4c0cbbc397b0a0b7070e08801904d709118` | `8ff9ed7708e7f6fbef6fa785f17057a7242b7327b1922826b76007686e567840` |
| D | ordinarium, commons/psalter, hymns, seasonal | 4,531 | `db02119fd414b760843cbda067b4a2f8a9effb3e` | `ef43dd36b93649a92c6119a0d5521cf615771ef461cd4c65f14f07306e40c0ba` |
| **Union** | **14 LOTH areas** | **17,743** | — | canonical sorted-row SHA-256 `05ff9e6d8dc25b0ef8356ce9b5aa230496aaf5128a72238164fde9f2bed5e219` |

The union hash above is an integrity fingerprint for the logical final ledger:
each original JSONL line is parsed, rows are sorted by `address`, and the
verbatim lines are joined with `\n` without a trailing newline. The four shard
JSONLs remain the durable row-level ledger; duplicating their approximately
28 MiB of evidence into a fifth file would add no information.

## Disjoint-union proof

The coordinator re-enumerated the frozen population using the same contract as
`enumerate.mjs`: every Cyrillic scalar in `src/data/loth/**/*.json`, preserving
duplicate values as separate JSON-pointer addresses and excluding only a
`gospelCanticleAntiphon*` ancestor. Every shard row was then checked against
that re-enumeration.

| Invariant | Result |
|---|---:|
| Frozen addresses re-enumerated | 17,743 |
| Shard rows parsed | 17,743 |
| Unique shard addresses | 17,743 |
| Duplicate addresses | 0 |
| Missing frozen addresses | 0 |
| Extra shard addresses | 0 |
| Rows whose `value_sha256` differs from the current frozen scalar | 0 |
| Rows whose declared area differs from the census area | 0 |
| Invalid/missing invariant fields or dispositions | 0 |
| Sorted union address SHA-256 | `1aabb72bdbd92157854e6a7df3f985e7b0ac981be8bc54c8223e8b0bc51a8a10` |
| Frozen SHA reproduced | **yes** |

The Bible sibling closure remains outside this proof: its 35,243 units are
`NOT_APPLICABLE_SOURCE` because the full MoSociety corpus is not comparable to
the breviary PDF. They are outside N, as are the 297 mandated
`gospelCanticleAntiphon*` excluded leaves. Neither group was silently folded
into or removed from the 17,743-row LOTH reconciliation.

## Terminal dispositions by area

Abbreviations: `ML` = `MATCH_LITERAL`, `MN` = `MATCH_NORMALIZED`, `KEEP` =
`KEEP_RULED`, `CLEAR` = `CLEAR_TRUNCATION`, `RD` = `REVIEW_DIVERGENCE`, `RG`
= `REVIEW_GEOMETRY`, `SNF` = `SOURCE_NOT_FOUND`, and `NAM` =
`NOT_APPLICABLE_METADATA`.

| Area | ML | MN | KEEP | CLEAR | RD | RG | SNF | NAM | Total |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `src/data/loth/(root)` | 2,583 | 1,465 | 0 | 0 | 100 | 154 | 37 | 28 | 4,367 |
| `src/data/loth/ordinarium` | 390 | 192 | 1 | 0 | 11 | 62 | 8 | 0 | 664 |
| `src/data/loth/prayers/commons/(root)` | 4,276 | 25 | 2 | 0 | 15 | 0 | 0 | 1 | 4,319 |
| `src/data/loth/prayers/commons/compline` | 41 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 42 |
| `src/data/loth/prayers/commons/psalter` | 118 | 149 | 0 | 0 | 1 | 46 | 22 | 0 | 336 |
| `src/data/loth/prayers/hymns` | 1,938 | 0 | 1 | 0 | 6 | 1 | 8 | 0 | 1,954 |
| `src/data/loth/prayers/seasonal/advent` | 122 | 171 | 0 | 0 | 1 | 5 | 7 | 0 | 306 |
| `src/data/loth/prayers/seasonal/christmas` | 76 | 94 | 0 | 0 | 1 | 0 | 10 | 0 | 181 |
| `src/data/loth/prayers/seasonal/easter` | 144 | 235 | 0 | 0 | 1 | 0 | 3 | 0 | 383 |
| `src/data/loth/prayers/seasonal/lent` | 146 | 256 | 0 | 0 | 7 | 1 | 33 | 0 | 443 |
| `src/data/loth/prayers/seasonal/ordinary-time` | 100 | 155 | 0 | 0 | 5 | 0 | 4 | 0 | 264 |
| `src/data/loth/propers` | 1,304 | 638 | 12 | 0 | 192 | 88 | 0 | 31 | 2,265 |
| `src/data/loth/psalter` | 1,921 | 45 | 1 | 0 | 65 | 19 | 0 | 0 | 2,051 |
| `src/data/loth/sanctoral` | 48 | 38 | 0 | 0 | 41 | 37 | 0 | 4 | 168 |
| **Total** | **13,207** | **3,464** | **17** | **0** | **446** | **413** | **132** | **64** | **17,743** |

The terminal arithmetic is:

```text
13,207 MATCH_LITERAL
+ 3,464 MATCH_NORMALIZED
+    17 KEEP_RULED
+     0 CLEAR_TRUNCATION
+   446 REVIEW_DIVERGENCE
+   413 REVIEW_GEOMETRY
+   132 SOURCE_NOT_FOUND
+    64 NOT_APPLICABLE_METADATA
= 17,743
```

## KEEP seed reconciliation

The 17-row coordinator seed and the 17 final `KEEP_RULED` rows form an exact
address+value-hash bijection. There are no stale unused seed rows, no unseeded
KEEP rows, and no duplicate KEEP use.

| Shard | Expected seed intersection | Actual `KEEP_RULED` | Ruling groups |
|---|---:|---:|---|
| A | 0 | 0 | none |
| B | 2 | 2 | Psalm 63 `AUTHORED_LAYOUT`; STC-002 |
| C | 13 | 13 | STC-001; twelve explicitly addressed STC-003 rows |
| D | 2 | 2 | STC-004 plain/rich twin addresses |
| **Total** | **17** | **17** | exact bijection |

Every application used the complete address and the current scalar SHA-256.
No phrase, substring, regex, filename, or page-wide suppression was used. In
particular, the Psalm 63 ruling suppresses only its one approved header address,
not other occurrences of `хэнбугай ч`.

## Honest residual accounting

The 991 `REVIEW_*`/`SOURCE_NOT_FOUND` rows are terminal for this detection
protocol but are not affirmative matches and are not authorized fixes:

| Residual class | Count | What the count means |
|---|---:|---|
| `REVIEW_DIVERGENCE` | 446 | A localized value has substitution, reorder, contamination, punctuation, larger-unit ambiguity, or other contrary content before a provable cut. It fails strict-prefix and/or no-contrary-content gates. |
| `REVIEW_GEOMETRY` | 413 | A repeated occurrence, page identity, column, or coordinate-backed visual unit was not uniquely proven. Raw-text or out-of-hint hits were not promoted to matches. |
| `SOURCE_NOT_FOUND` | 132 | The scanner could not locate a defensible source unit after its anchored search. Absence was recorded rather than inventing identity. |
| **Total residual** | **991** | counted inside N; none is called `CLEAR_TRUNCATION` |

Shard evidence explains the residual shapes rather than treating them as one
generic failure:

- Shard A: 100 divergences (12 rejected mechanical strict-prefix signals, 39
  values found only inside larger units, and 49 whole-alignment/contrary-content
  failures), 154 geometry reviews, and 37 source-not-found rows.
- Shard B: 15 uniquely localized plain/rich divergence pairs. Each has a
  substitution, vocabulary, or contrary-punctuation difference before any
  possible cut; gates 3 and 6 fail. It has no geometry or source-not-found
  residuals.
- Shard C: 298 divergences, including explicitly retained header contamination,
  two cross-page joins, and source substitutions; 112 geometry hits outside
  the allowed page-identity boundary plus 32 styled-glyph reconstruction
  failures; no source-not-found rows.
- Shard D: 33 prefix/alignment divergences; 115 geometry rows split among
  missing two-anchor identity, raw-text-without-geometry identity, and
  opposite-column occurrences; 95 hinted units not located. Its self-audit
  found no SNF literal hit in `full_pdf.txt` and no normalized hit in either
  column of the recorded physical spread.

The additional 64 `NOT_APPLICABLE_METADATA` rows are also inside N. They are
explicit curator/runtime metadata closures, not omitted PDF content and not an
excuse to lower the denominator.

## Phase 2 and fix disposition

Across all four shards:

- `CLEAR_TRUNCATION = 0`;
- second-person CLEAR packets required = 0;
- approved/rejected coordinator CLEAR decisions = 0/0;
- fix bundles = 0;
- plain/rich fix-owner locks = 0; and
- source-data edits = 0.

The shard evidence records why every candidate family fails at least one of
the nine required gates. Therefore creating a fix from any residual row would
violate the locked plan. Wording, translation, metadata, geometry, or
source-location follow-ups may be opened separately, but they are not hidden
truncation fixes and do not alter this sweep's terminal reconciliation.

## Final outcome

GOAL 106's truncation sweep denominator is closed without loss:

1. all 17,743 frozen LOTH addresses have exactly one terminal disposition;
2. the union is disjoint and reproduces the frozen address fingerprint;
3. all 17 exact KEEP rulings are used once and only once;
4. zero candidate satisfies all nine `CLEAR_TRUNCATION` gates; and
5. all non-clear residuals remain explicitly counted and evidence-bearing.

The correct closeout is therefore **no truncation data fixes**, with the four
shard JSONLs retained as the final row-level ledger and this report as the
coordinator reconciliation record.
