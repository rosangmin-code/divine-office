# Shard D truncation-sweep summary

**Terminal scan reconciliation: COMPLETE for shard D — 4,531 / 4,531 frozen addresses have exactly one terminal disposition. No data fixes were made.**

## Scope

| Area | Count | Dispositions |
|---|---:|---|
| `src/data/loth/ordinarium` | 664 | KEEP_RULED=1, MATCH_LITERAL=390, MATCH_NORMALIZED=192, REVIEW_DIVERGENCE=11, REVIEW_GEOMETRY=60, SOURCE_NOT_FOUND=10 |
| `src/data/loth/prayers/commons/psalter` | 336 | MATCH_LITERAL=118, MATCH_NORMALIZED=148, REVIEW_DIVERGENCE=5, SOURCE_NOT_FOUND=65 |
| `src/data/loth/prayers/hymns` | 1,954 | KEEP_RULED=1, MATCH_LITERAL=1938, REVIEW_DIVERGENCE=6, SOURCE_NOT_FOUND=9 |
| `src/data/loth/prayers/seasonal/advent` | 306 | MATCH_LITERAL=122, MATCH_NORMALIZED=170, REVIEW_DIVERGENCE=2, SOURCE_NOT_FOUND=12 |
| `src/data/loth/prayers/seasonal/christmas` | 181 | MATCH_LITERAL=76, MATCH_NORMALIZED=94, REVIEW_DIVERGENCE=1, SOURCE_NOT_FOUND=10 |
| `src/data/loth/prayers/seasonal/easter` | 383 | MATCH_LITERAL=144, MATCH_NORMALIZED=234, REVIEW_DIVERGENCE=2, SOURCE_NOT_FOUND=3 |
| `src/data/loth/prayers/seasonal/lent` | 443 | MATCH_LITERAL=146, MATCH_NORMALIZED=256, REVIEW_DIVERGENCE=7, SOURCE_NOT_FOUND=34 |
| `src/data/loth/prayers/seasonal/ordinary-time` | 264 | MATCH_LITERAL=92, MATCH_NORMALIZED=149, REVIEW_DIVERGENCE=5, SOURCE_NOT_FOUND=18 |
| **Total** | **4,531** | |

## Verdict

- Exact/normalized matches: 4269.
- Exact address+hash KEEP rulings: 2.
- Metadata-only closures: 0.
- Geometry/alignment review rows: 99.
- Source units not located: 161.
- Scanner-adjudicated `CLEAR_TRUNCATION`: 0.
- Layout-only hymn paragraph/wrap structures were treated as whitespace geometry; normalization never changed words.
- The ledger is detection-only. No JSON data value was edited and no bulk re-extraction was run.

## Artifacts

- `docs/research/51-truncation-sweep/shard-D-results.jsonl` — one machine-readable terminal row per frozen address.
- `docs/research/51-truncation-sweep/shard-D-evidence.md` — method, hashes, disposition reconciliation, and all candidate packets.
- This summary — human-readable shard handoff.
