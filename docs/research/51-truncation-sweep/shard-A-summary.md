# Shard A — truncation sweep summary

## Frozen manifest stamp

- Source HEAD: `52a8d02b50d4bc5374b9987bd89eb1bf2c2e234d`
- Shard: `A` — `src/data/loth/(root)`
- Target count: **4,367**
- Global LOTH address SHA-256: `1aabb72bdbd92157854e6a7df3f985e7b0ac981be8bc54c8223e8b0bc51a8a10`
- Shard-A address SHA-256: `8e2eef63faf7a40f821bd72499ec42a85cda62fdd604bdde67f7b53d5dc28e19`
- Shard-A address+content SHA-256: `b98fbd987430d8e2cb72a1912a130cea2655aeecd66398afaf640aef9b79e3ad`
- `full_pdf.txt` SHA-256: `f12f6135556f77df75593d2627ec2642ec6113c2a56f52b26102653580c1b330`
- `public/psalter.pdf` SHA-256: `fa0397e9674745f2dc740094eb53f4a367740f6b55d50e1edcf8970972fc3fcd`
- Coordinator KEEP ledger consulted: 17 exact address+hash rows; shard-A exact matches: **0** (no phrase-global suppression)

The result JSONL is the immutable shard manifest enriched with the value hash, geometry localization, terminal disposition, and evidence. It contains exactly one row for every frozen address.

## Terminal reconciliation

| Disposition | Count |
|---|---:|
| `MATCH_LITERAL` | 3,569 |
| `MATCH_NORMALIZED` | 479 |
| `KEEP_RULED` | 0 |
| `CLEAR_TRUNCATION` | 0 |
| `REVIEW_DIVERGENCE` | 100 |
| `REVIEW_GEOMETRY` | 148 |
| `SOURCE_NOT_FOUND` | 43 |
| `NOT_APPLICABLE_METADATA` | 28 |
| **Total** | **4,367** |

Reconciliation: `4367 == 4367`; unique addresses: `4367 == 4367`. Raw substring failure was candidate generation only and never a terminal verdict. No source data was modified.

## Nine-gate adjudication outcome

No candidate passed all nine `CLEAR_TRUNCATION` gates. The 12 strict-prefix signals were individually reviewed and rejected on identity/boundary/positive-tail evidence; all other non-matches fail strict-prefix, contrary-content, geometry, or source-identity gates by construction. Details and raw/visual fragments are in `shard-A-evidence.md`.
