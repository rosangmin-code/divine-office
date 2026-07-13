# Truncation sweep coordinator manifest

- Work item: `[#106-sub-3co]` / `wi-106-001`
- Frozen at source HEAD: `52a8d02b50d4bc5374b9987bd89eb1bf2c2e234d`
- Census report: `docs/research/51-truncation-sweep/targets.md` (`a83720c`)
- Processing plan: `docs/research/51-truncation-sweep/plan.md` (`52a8d02`)
- Freeze verified: 2026-07-14
- State: Phase 1 complete; scanner evidence adjudication and final reconciliation pending

## Frozen denominator contract

| Contract item | Frozen value |
|---|---|
| LOTH sweep denominator | `N = 17,743` scalar-string addresses |
| LOTH target-address SHA-256 | `1aabb72bdbd92157854e6a7df3f985e7b0ac981be8bc54c8223e8b0bc51a8a10` |
| LOTH target address+content SHA-256 | `07a593492d00bcd3c3f96a6778e8f0675d5c74939055622537a4ae18547492b5` |
| Text SoT | `/home/min/myproject/divineoffice/parsed_data/full_pdf.txt` |
| Text SoT SHA-256 | `f12f6135556f77df75593d2627ec2642ec6113c2a56f52b26102653580c1b330` |
| Geometry source | `public/psalter.pdf` |
| Geometry source SHA-256 | `fa0397e9674745f2dc740094eb53f4a367740f6b55d50e1edcf8970972fc3fcd` |
| Mandated GCA exclusion | `297` Cyrillic leaves, outside N |

The freeze was reproduced with:

```sh
node docs/research/51-truncation-sweep/enumerate.mjs
sha256sum /home/min/myproject/divineoffice/parsed_data/full_pdf.txt public/psalter.pdf
```

The enumerator returned `loth_pdf_sweep_targets=17743`, `reconciles=true`,
`target_addresses_unique=true`, and the fingerprints above. Every shard must
stamp these exact values. If a data address or source asset changes before a
shard starts, the shard must stop for a coordinator-approved census delta.

## Bible sibling closure

`src/data/bible` is closed as `NOT_APPLICABLE_SOURCE` outside N:

| Area | Files | Units | Denominator effect | Evidence |
|---|---:|---:|---|---|
| `src/data/bible` | 3 JSONL | 35,243 | none; do not add to 17,743 | `targets.md:13-17,55-65`; `plan.md:29-39` |

The three files are `bible_gospels.jsonl`, `bible_nt_rest.jsonl`, and
`bible_ot.jsonl`. Together they are the full MoSociety 2019 Bible sibling
corpus, while `full_pdf.txt` is the breviary and includes only selected
quotations. Treating absent Bible units as PDF misses would manufacture false
positives. A Bible completeness audit therefore requires a separate
source-specific goal.

Universe accounting remains:

```text
17,743 LOTH PDF-sweep targets
+ 35,243 Bible sibling units (NOT_APPLICABLE_SOURCE, outside N)
= 52,986 all-data targets after the mandated GCA exclusion
```

## Exact KEEP seed

`intentional-divergences.jsonl` contains 17 exact address+value-hash rulings:

- 1 authored-layout ruling: Psalm 63's two-line uncited caption, approved
  2026-06-13;
- 2 GOAL #128 PDF-origin one-glyph corrections (`STC-001`, `STC-002`);
- 12 explicitly enumerated `STC-003` dropped-space correction addresses; and
- 2 plain/rich `STC-004` dropped-space correction addresses.

There are no phrase-, regex-, filename-, or page-wide suppressions. A hash
mismatch makes only that row stale and sends it to review. In particular,
`хэнбугай ч` remains independently scannable at every address other than the
single approved Psalm 63 header address.

The g-41 accepted judgments were also reviewed. Commits
`22cdc117c6019faf7b0150539086e790398baba8`,
`f4b747133917040dc6e769a9138c3c2fb4b07d27`, and
`46092291762a7128f3c01de5ca1ff578713d5f11` restored the affected sanctoral
values to the PDF wording. They therefore need no whitelist row under
`plan.md:149-157` (corrected data that now matches the PDF is not an
intentional divergence). The leader-resolved `ёолон` KEEP likewise matches the
PDF and needs no intentional-divergence entry.

## Terminal reconciliation contract

Each of the 17,743 frozen addresses must receive exactly one disposition from
the locked plan. Final closure requires all of the following:

1. shard address sets are pairwise disjoint;
2. their disjoint union has exactly 17,743 addresses;
3. the sorted union reproduces target-address SHA-256
   `1aabb72bdbd92157854e6a7df3f985e7b0ac981be8bc54c8223e8b0bc51a8a10`;
4. every `CLEAR_TRUNCATION` has a second-person nine-gate adjudication; and
5. every approved fix bundle gives one owner all affected plain/rich twins.

Until those conditions hold, this sweep remains open even if every scanner has
finished candidate generation.
