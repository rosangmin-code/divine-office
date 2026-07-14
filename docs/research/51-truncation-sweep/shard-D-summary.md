# Shard D truncation-sweep summary

**Terminal scan reconciliation: COMPLETE for shard D — 4,531 / 4,531 frozen addresses have exactly one terminal disposition. No data fixes were made.**

## Scope

| Area | Count | Dispositions |
|---|---:|---|
| `src/data/loth/ordinarium` | 664 | KEEP_RULED=1, MATCH_LITERAL=390, MATCH_NORMALIZED=192, REVIEW_DIVERGENCE=11, REVIEW_GEOMETRY=62, SOURCE_NOT_FOUND=8 |
| `src/data/loth/prayers/commons/psalter` | 336 | MATCH_LITERAL=118, MATCH_NORMALIZED=149, REVIEW_DIVERGENCE=1, REVIEW_GEOMETRY=46, SOURCE_NOT_FOUND=22 |
| `src/data/loth/prayers/hymns` | 1,954 | KEEP_RULED=1, MATCH_LITERAL=1938, REVIEW_DIVERGENCE=6, REVIEW_GEOMETRY=1, SOURCE_NOT_FOUND=8 |
| `src/data/loth/prayers/seasonal/advent` | 306 | MATCH_LITERAL=122, MATCH_NORMALIZED=171, REVIEW_DIVERGENCE=1, REVIEW_GEOMETRY=5, SOURCE_NOT_FOUND=7 |
| `src/data/loth/prayers/seasonal/christmas` | 181 | MATCH_LITERAL=76, MATCH_NORMALIZED=94, REVIEW_DIVERGENCE=1, SOURCE_NOT_FOUND=10 |
| `src/data/loth/prayers/seasonal/easter` | 383 | MATCH_LITERAL=144, MATCH_NORMALIZED=235, REVIEW_DIVERGENCE=1, SOURCE_NOT_FOUND=3 |
| `src/data/loth/prayers/seasonal/lent` | 443 | MATCH_LITERAL=146, MATCH_NORMALIZED=256, REVIEW_DIVERGENCE=7, REVIEW_GEOMETRY=1, SOURCE_NOT_FOUND=33 |
| `src/data/loth/prayers/seasonal/ordinary-time` | 264 | MATCH_LITERAL=100, MATCH_NORMALIZED=155, REVIEW_DIVERGENCE=5, SOURCE_NOT_FOUND=4 |
| **Total** | **4,531** | |

## Verdict

- Exact/normalized matches: 4286.
- Exact address+hash KEEP rulings: 2.
- Metadata-only closures: 0.
- Geometry/alignment review rows: 148.
- Source units not located: 95.
- Scanner-adjudicated `CLEAR_TRUNCATION`: 0.
- Tier-truthfulness self-audit: 0 literal evidence mismatches; 0 byte-equal normalized rows; 0 normalized-tier violations; 0 false `SOURCE_NOT_FOUND` rows in `full_pdf.txt` or either column of the recorded physical spread.
- Layout-only hymn paragraph/wrap structures were treated as whitespace geometry; normalization never changed words.
- The ledger is detection-only. No JSON data value was edited and no bulk re-extraction was run.

## Artifacts

- `docs/research/51-truncation-sweep/shard-D-results.jsonl` — one machine-readable terminal row per frozen address.
- `docs/research/51-truncation-sweep/shard-D-evidence.md` — method, hashes, disposition reconciliation, and all candidate packets.
- This summary — human-readable shard handoff.
