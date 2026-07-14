# Truncation sweep — shard C summary

**Verdict: COMPLETE, 4,526 / 4,526 terminal dispositions; zero clear truncations; no fixes.**

Shard C covers propers (2,265), psalter (2,051), sanctoral (168), and Compline rich commons (42). The frozen address set is unique and hashes to `283e83ca9c46a0d3c5186dc410d9befffcb9ab52e2630ab62a2acd57a1eb1c0d`.

| Disposition | Count |
|---|---:|
| `MATCH_LITERAL` | 3,400 |
| `MATCH_NORMALIZED` | 748 |
| `KEEP_RULED` | 13 |
| `REVIEW_DIVERGENCE` | 298 |
| `REVIEW_GEOMETRY` | 32 |
| `NOT_APPLICABLE_METADATA` | 35 |
| `CLEAR_TRUNCATION` | 0 |
| **Total** | **4,526** |

The detector reconstructs left/right book-page reading order from PDF glyph geometry before comparison. Raw substring presence is evidence only. The 13 KEEP rows are exact address+value-hash hits from the coordinator ledger; no global phrase suppression was used. Plain/rich linkage is recorded on 1,018 rows, including cross-shard overlays.

Tier self-audit is clean: all 3,400 literal rows have byte-equal data/visual evidence, all 748 normalized rows are non-byte-equal and pass their recorded typography or whitespace transform, and there are no `SOURCE_NOT_FOUND` rows.

The most important negative controls are documented in `shard-C-evidence.md`: one running-header contamination, two cross-page interleave joins, and two source substitutions. All fail the no-contrary-content/strict-prefix gates. The 32 geometry reviews are styled `Магтуу` redirect pairs whose glyph runs cannot be reliably reassembled at the locked ±1.5 pt clustering tolerance.

Artifacts:

- `shard-C-results.jsonl` — one evidence-bearing terminal row per frozen address;
- `shard-C-evidence.md` — method, reconciliation, twin linkage, KEEP use, nine-gate analysis, and manual packets; and
- `scan-shard-c.py` — deterministic reproducer with freeze guards.

No source data was modified. Coordinator adjudication may later resolve `REVIEW_DIVERGENCE` or `REVIEW_GEOMETRY`, but this shard contains no authorized `CLEAR_TRUNCATION` fix candidate.
