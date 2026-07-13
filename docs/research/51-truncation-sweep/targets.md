# Two-column-interleave truncation sweep — target population

- Work item: `[#106-sub-1]` / 107
- Census snapshot: `28f6b64fe26bd374cb9a562d636d7d75725e2cca`
- PDF source of truth: `/home/min/myproject/divineoffice/parsed_data/full_pdf.txt`
- Scope: `src/data/**`, with the mandated `gospelCanticleAntiphon*` exclusion
- `trivial_threshold=0`: no target is dropped for being short, duplicated, metadata-like, generated, pilot-only, or non-rendered

## Result

**COMPLETENESS VERDICT: COMPLETE for target identification at the snapshot above.**

The complete mechanically addressable population after the requested gospel-canticle-antiphon exclusion is **52,986 occurrences**:

- **N = 17,743** `src/data/loth/**` occurrences are targets for the specified breviary-PDF two-column-interleave sweep.
- **35,243** `src/data/bible/**` occurrences are fully inventoried sibling data, but are **not** valid targets for a sweep whose sole comparison source is `full_pdf.txt`. The Bible JSONL is the full MoSociety 2019 corpus, while the breviary contains only selected quotations; treating all 35,243 as PDF misses would manufacture false positives.
- **297** occurrences under a `gospelCanticleAntiphon*` ancestor are excluded exactly as dispatched.

The counts are occurrence counts, not unique-value counts. Every stored JSON/JSONL address remains a separate target because duplicate or generated copies can drift independently.

## Population contract

A data unit is one scalar string value that:

1. lives in a `.json` or `.jsonl` file below `src/data`;
2. contains at least one Unicode Cyrillic character;
3. is identified by `repo-relative-file#JSON-pointer`; and
4. has no ancestor key matching `^gospelCanticleAntiphon(?:Rich|Candidates|Rubric)?$`.

The definition deliberately includes rich-AST span text, source/evidence text, rubrics, labels, references containing Cyrillic, pilot assets, generated copies, allow/deny-list prose, and comments. `trivial_threshold=0` means none may be silently screened out by length or presumed runtime importance.

It excludes numbers, booleans, nulls, structural object keys, pure-ASCII identifiers/references, and the one `.gitkeep`. Those are not Mongolian scalar text units. The empty `optional-memorials.json` is preserved in the ledger as a zero-unit area, not forgotten.

The durable enumerator is `docs/research/51-truncation-sweep/enumerate.mjs`. It parses every JSON/JSONL file, emits the full area and field-family reconciliation, and hashes the sorted target address and address-plus-content manifests. A later sweep must use the same address population or explicitly explain a census delta.

## Coverage Ledger

| Data area | Files parsed | Cyrillic leaves | Mandated GCA exclusion | Sweep targets | SoT disposition |
|---|---:|---:|---:|---:|---|
| `src/data/loth/(root)` | 7 | 4,367 | 0 | 4,367 | include |
| `src/data/loth/ordinarium` | 7 | 664 | 0 | 664 | include |
| `src/data/loth/prayers/commons/(root)` | 3 | 4,319 | 0 | 4,319 | include |
| `src/data/loth/prayers/commons/compline` | 7 | 49 | 7 | 42 | include after exclusion |
| `src/data/loth/prayers/commons/psalter` | 56 | 336 | 0 | 336 | include |
| `src/data/loth/prayers/hymns` | 122 | 1,954 | 0 | 1,954 | include |
| `src/data/loth/prayers/seasonal/advent` | 15 | 306 | 0 | 306 | include |
| `src/data/loth/prayers/seasonal/christmas` | 15 | 181 | 0 | 181 | include |
| `src/data/loth/prayers/seasonal/easter` | 21 | 383 | 0 | 383 | include |
| `src/data/loth/prayers/seasonal/lent` | 22 | 443 | 0 | 443 | include |
| `src/data/loth/prayers/seasonal/ordinary-time` | 68 | 264 | 0 | 264 | include; `.gitkeep` recorded separately |
| `src/data/loth/propers` | 5 | 2,452 | 187 | 2,265 | include after exclusion |
| `src/data/loth/psalter` | 4 | 2,095 | 44 | 2,051 | include after exclusion |
| `src/data/loth/sanctoral` | 4 | 227 | 59 | 168 | include after exclusion; optional memorial file has zero |
| **LOTH subtotal / N** | **356** | **18,040** | **297** | **17,743** | **PDF sweep population** |
| `src/data/bible` | 3 | 35,243 | 0 | 35,243 | inventoried; separate MoSociety corpus, not this PDF sweep |
| **All data** | **359 data files** | **53,283** | **297** | **52,986** | reconciled |

Universe closure:

- 360 filesystem files = 356 JSON + 3 JSONL + one `.gitkeep`.
- All 360 are tracked and the worktree had no pre-census drift.
- 359 data files parsed with zero parse errors.
- One parsed file has zero Cyrillic leaves: `src/data/loth/sanctoral/optional-memorials.json`.
- All target addresses are unique.
- `17,743 + 35,243 = 52,986`.

Population fingerprints:

- LOTH target addresses: `1aabb72bdbd92157854e6a7df3f985e7b0ac981be8bc54c8223e8b0bc51a8a10`
- LOTH target addresses + contents: `07a593492d00bcd3c3f96a6778e8f0675d5c74939055622537a4ae18547492b5`
- All-data target addresses: `17c73a844302e5ccce9a5c0c249aae56911cc9df3150f38bf5742a97bc616e83`
- All-data target addresses + contents: `5b07a840fa1807dc00112842499df576bd4a1d0b2ce307f1b232a2d0fb7e155e`

## Enumeration commands and verbatim outputs

### Tracked/filesystem closure

```sh
printf 'tracked_src_data='; git ls-files src/data | wc -l; printf 'filesystem_src_data='; find src/data -type f | wc -l; git status --short
```

Verbatim output:

```text
tracked_src_data=360
filesystem_src_data=360
```

### Authoritative population enumeration

```sh
node docs/research/51-truncation-sweep/enumerate.mjs
```

Verbatim output:

```text
DATA FILE UNIVERSE
all_files=360
json=356
jsonl=3
other=1
OTHER src/data/loth/prayers/seasonal/ordinary-time/.gitkeep
parse_errors=0
zero_cyrillic_data_files=1
ZERO src/data/loth/sanctoral/optional-memorials.json

AREA RECONCILIATION (occurrences, not deduplicated values)
area | files | cyrillic_leaves | excluded_gca | targets
src/data/bible | 3 | 35243 | 0 | 35243
src/data/loth/(root) | 7 | 4367 | 0 | 4367
src/data/loth/ordinarium | 7 | 664 | 0 | 664
src/data/loth/prayers/commons/(root) | 3 | 4319 | 0 | 4319
src/data/loth/prayers/commons/compline | 7 | 49 | 7 | 42
src/data/loth/prayers/commons/psalter | 56 | 336 | 0 | 336
src/data/loth/prayers/hymns | 122 | 1954 | 0 | 1954
src/data/loth/prayers/seasonal/advent | 15 | 306 | 0 | 306
src/data/loth/prayers/seasonal/christmas | 15 | 181 | 0 | 181
src/data/loth/prayers/seasonal/easter | 21 | 383 | 0 | 383
src/data/loth/prayers/seasonal/lent | 22 | 443 | 0 | 443
src/data/loth/prayers/seasonal/ordinary-time | 68 | 264 | 0 | 264
src/data/loth/propers | 5 | 2452 | 187 | 2265
src/data/loth/psalter | 4 | 2095 | 44 | 2051
src/data/loth/sanctoral | 4 | 227 | 59 | 168

TOTALS
cyrillic_leaves=53283
excluded_gca=297
all_data_targets_after_gca=52986
loth_pdf_sweep_targets=17743
bible_sibling_units_non_pdf_sot=35243
reconciles=true
target_addresses_unique=true
loth_target_address_sha256=1aabb72bdbd92157854e6a7df3f985e7b0ac981be8bc54c8223e8b0bc51a8a10
loth_target_content_sha256=07a593492d00bcd3c3f96a6778e8f0675d5c74939055622537a4ae18547492b5
all_data_target_address_sha256=17c73a844302e5ccce9a5c0c249aae56911cc9df3150f38bf5742a97bc616e83
all_data_target_content_sha256=5b07a840fa1807dc00112842499df576bd4a1d0b2ce307f1b232a2d0fb7e155e

GCA EXCLUSION RECONCILIATION
gospelCanticleAntiphon | 283
gospelCanticleAntiphonCandidates | 6
gospelCanticleAntiphonRich | 7
gospelCanticleAntiphonRubric | 1
sum=297

LOTH TARGETS BY NEAREST NAMED FIELD (complete nonzero list)
_doc | 1
$comment | 1
1 | 51
2 | 48
3 | 102
4 | 84
5 | 102
6 | 48
7 | 51
advent | 177
adventDec17_23 | 60
adventDec24 | 3
afterEpiphany | 1
alleluia | 1
allSaints | 1
allSouls | 1
alternate | 2
alternativeConcludingPrayer | 79
annunciation | 1
antiphon | 1
ascension | 1
assumption | 1
attribution | 81
baptismOfTheLord | 1
beforePentecost | 1
birthJohnBaptist | 1
concludingPrayer | 280
corpusChristi | 1
day | 45
dec17_23 | 1
dec24 | 1
default | 4
default_antiphon | 342
doxology | 4
easter | 129
epigraph | 4
evidence_pdf | 2
exaltationOfCross | 1
forced_lines | 13
FRI | 2
fullResponse | 169
gloryBe | 1
goodFriday | 1
holyFamily | 1
holySaturday | 1
holyWeek | 1
immaculateConception | 1
intercessions | 1752
jan1 | 1
label | 49
lentPassionSunday | 48
lines | 167
liturgical_basis | 1
liturgicalBasis | 8
MON | 2
name | 16
note | 3
paragraphs | 52
pentecost | 1
peterAndPaul | 1
preface_text | 78
presentation | 1
primary | 7
psalmPrayer | 88
r | 11
reason | 2
ref | 75
response | 7
rubric | 1
sacredHeart | 1
SAT | 2
saturdayBVM | 1
season | 7
shortResponse | 168
shortText | 1
stanzas | 3840
stJoseph | 1
subtitle | 9
SUN | 2
text | 8722
THU | 2
title | 454
titleMn | 3
transfiguration | 1
TUE | 2
v | 11
verses | 48
versicle | 178
w1-sun-lauds-cant | 3
w1-sun-lauds-ps1 | 3
w1-sun-lauds-ps3 | 3
w1-sun-vesp-cant | 1
w1-sun-vesp-ps1 | 1
w1-sun-vesp-ps2 | 1
WED | 2
```

## Prior-audit overlap

### g-30: typo-candidate audit

Reference: `docs/research/g30-typo-candidates.md`.

This audit looked for character rearrangement, one-character addition/substitution, and vocabulary absent from the PDF. It is **structurally unable to guarantee truncation detection**: deleting a suffix introduces no misspelled or novel retained token. It may incidentally flag a damaged last token, but a clean prefix ending at a word boundary passes its model. It also did not establish a path-complete `src/data/**` population.

### g-36: sanctoral meaning-change audit

Reference: `docs/research/g36-sanctoral-divergences.md`.

This audit **can catch truncation inside its aligned sanctoral scope** and did so: its report contains explicit “omitted after” and “missing phrase” findings. It is nevertheless limited to sanctoral comparison cases and is not a complete cross-area truncation sweep. It does not close psalter, propers, ordinarium, rich overlays, hymns, or GILH.

### g-48: gospel-canticle-antiphon visual-order sweep

References: `docs/design/mental-models/goal83-gospel-canticle-antiphon-pipeline.md`; commits `dbab488` and `2b888a8`.

This is the only prior audit among the three designed specifically around multi-column visual reading order. It directly verified **44 psalter blocks** and is therefore capable of catching the target defect for that population. The current dispatch excludes the entire `gospelCanticleAntiphon*` family, which is **297 leaf occurrences**. That exclusion is obeyed, but the “done in g-48” evidence is narrower: 44 psalter values are directly attested, while the remaining excluded propers/sanctoral/rich/candidate/rubric occurrences are not proven by the g-48 MM. This is a scope caveat for the leader, not a reason to violate the explicit exclusion.

## Sweep handoff

The next stage should:

1. materialize or stream all **17,743** LOTH target addresses from the enumerator;
2. retain per-address duplicates rather than deduplicating text;
3. reconstruct PDF visual reading order before judging an apparent prefix/suffix mismatch;
4. record a disposition for every address, including metadata/generated/pilot units;
5. require terminal reconciliation `checked + excluded-by-evidence + not-applicable = 17,743`; and
6. keep Bible corpus checks in a separate source-specific work item rather than calling absent full-PDF matches truncations.

## Outcome evidence

- **How:** read `docs/research/51-truncation-sweep/targets.md`; run `node docs/research/51-truncation-sweep/enumerate.mjs` from repo root; verify file-universe closure, parse errors, reconciliations, and fingerprints.
- **Expected:** “enumerate the COMPLETE population of Mongolian text-bearing data units across ALL data areas (src/data/loth/ and siblings) for the two-column-interleave truncation sweep, and produce docs/research/51-truncation-sweep/targets.md (target report + Coverage Ledger with COMPLETENESS VERDICT, trivial_threshold=0).”
- **Captured:** the report surface above states `COMPLETENESS VERDICT: COMPLETE`, `trivial_threshold=0`, LOTH `N = 17,743`, sibling Bible `35,243`, all-data `52,986`, `parse_errors=0`, `reconciles=true`, and four manifest fingerprints. The area ledger covers every `src/data` branch and explicitly records the only non-data and zero-unit files.
