# GOAL210 Hymn Page-Break Merge Spec

## Mental Model

GOAL #210 is a design lock for the 20 genuine hymn page-break stanza splits confirmed by GOAL #205/#209. The intended behavior is narrow: when one logical hymn verse/clause is split into two rich stanza blocks only because a PDF page break inserted structural noise, the app should render it as one paragraph/stanza. The observable outcome is that each target's rich `hymnRich.blocks` and plain `ordinarium/hymns.json` text match the continuous source order in `parsed_data/full_pdf.txt`, while preserving non-target stanza/refrain structure.

Primary evidence is the corrected GOAL205 instance table: 20 rows are `genuine wrong-split`; 12 additional page-break-adjacent rows are legitimate boundaries and explicitly excluded (`docs/research/GOAL205-other-area-pagebreak-sweep.md:85-120`). Historical hymns 41/45/111 already demonstrate the desired merged end state and are currently NOOP in the existing repair script (`docs/research/GOAL205-other-area-pagebreak-sweep.md:61-81`).

Non-goals:

- Do not alter the 12 legitimate rows: 19, 25, 31, 52, 57, 66, 94, 97, 105 block 0->2, 105 block 4->6, 105 block 8->10, 112 (`docs/research/GOAL205-other-area-pagebreak-sweep.md:91-116`).
- Do not alter hymns 41/45/111 except to keep them idempotent NOOPs in the repair script (`scripts/fix-hymn-pagebreak-stanza-drift.mjs:64-88`, `scripts/fix-hymn-pagebreak-stanza-drift.mjs:97-115`).
- Do not alter compline, propers, sanctoral, psalter, or extractor logic. GOAL205 confirmed those areas are absent/no shared defect (`docs/research/GOAL205-other-area-pagebreak-sweep.md:30-44`).
- Do not full re-extract curated data.

## Scenarios

| id | scenario | expected behavior |
|---|---|---|
| D1 happy path | A two-block split such as hymn 21 has pre-break `учраас` and post-break `Булаг мэтээр амьдрал ундарч далай мэтээр` (`docs/research/GOAL205-other-area-pagebreak-sweep.md:92`). | Merge tail stanza block 2 into head stanza block 0, drop divider block 1, remove the matching blank line from `hymns.json`, and regenerate phrases for the merged stanza. |
| D2 edge cases | Multi-instance/large hymns and fragment rows: hymn 71 merges only block 4 into block 2, hymn 79 has a 26-line head, hymn 86 has short pre-break fragment `гарган`, hymn 77 has trailing whitespace in plain text, and hymn 105 has legitimate boundaries that must not be touched (`docs/research/GOAL205-other-area-pagebreak-sweep.md:105-115`). | Target matching must be exact per hymn/block/index and per plain `prevLine`/`nextLine`; no heuristic sweep. Only listed 20 genuine targets mutate. |
| D3 failure path | A build accidentally merges a legitimate refrain/stanza/repeat row, e.g. hymn 19 or 105 (`docs/research/GOAL205-other-area-pagebreak-sweep.md:91`, `docs/research/GOAL205-other-area-pagebreak-sweep.md:113-115`). | Regression tests fail by asserting those 12 boundaries remain unchanged. The implementation must refuse unexpected target shapes rather than making broad edits. |

## Approach Decision

Locked approach: **A. Extend `scripts/fix-hymn-pagebreak-stanza-drift.mjs`** with the 20 new targets.

Rationale:

- The script already encodes the right operation: each rich target has a head stanza that swallows the next stanza after one divider, guarded by `headFirstLine`, `tailFirstLine`, and expected line counts (`scripts/fix-hymn-pagebreak-stanza-drift.mjs:58-88`, `scripts/fix-hymn-pagebreak-stanza-drift.mjs:146-199`).
- The rich merge is already idempotent: an already merged head with the expected combined line count and tail offset returns NOOP (`scripts/fix-hymn-pagebreak-stanza-drift.mjs:128-144`).
- The plain-text path already validates the empty line, `prevLine`, and `nextLine` before removing exactly one blank line (`scripts/fix-hymn-pagebreak-stanza-drift.mjs:226-291`).
- `--dry-run` already exists, so the build member can verify the exact 20 new merges plus the 3 historical NOOPs before writing (`scripts/fix-hymn-pagebreak-stanza-drift.mjs:41-46`, `scripts/fix-hymn-pagebreak-stanza-drift.mjs:303-337`).
- Surgical per-file edits would duplicate the same guard logic manually across 20 rich files plus `hymns.json`, increasing the chance of editing a legitimate row or missing phrase regeneration.

Implementation shape:

- Append a second target cohort to `RICH_TARGETS`/`PLAIN_TARGETS` or add a clearly named `NEW_210_TARGETS` block that is folded into the existing processors.
- Keep the existing 41/45/111 targets unchanged; after the new implementation, those should still report NOOP.
- After any rich merge writes, run `node scripts/build-hymn-phrases-into-rich.mjs --ids <20 hymn ids plus any historical changed ids if non-NOOP>` so merged stanzas get regenerated `phrases`. Existing script already drops phrases on merged heads (`scripts/fix-hymn-pagebreak-stanza-drift.mjs:201-205`).

## Per-Instance Edit Spec

For rich JSON, "merge block B into block A" means: append `blocks[B].lines` to `blocks[A].lines`, remove `blocks[A + 1]` divider and `blocks[B]`, drop `phrases` from the merged head, then regenerate phrases. For plain JSON, remove exactly the listed blank line from `entry.text.split("\n")`. Do not infer or discover additional targets.

| hymn | GOAL205 row | rich edit spec | plain `hymns.json` edit spec |
|---:|---|---|---|
| 8 | `docs/research/GOAL205-other-area-pagebreak-sweep.md:89` | `src/data/loth/prayers/hymns/8.rich.json:85-112`: merge block 4 into block 2; drop divider block 3; headFirst=`Дахилт: Ертөнцийн Эзэний сургаалаар`; tailFirst=`Өөрийн бие шигээ нэгнээ хайрлацгаая`; head/tail=1L/7L. | `src/data/loth/ordinarium/hymns.json:39`: remove blank `text.split("\n")` index 5 between `Дахилт: Ертөнцийн Эзэний сургаалаар` and `Өөрийн бие шигээ нэгнээ хайрлацгаая`. |
| 14 | `docs/research/GOAL205-other-area-pagebreak-sweep.md:90` | `src/data/loth/prayers/hymns/14.rich.json:69-255`: merge block 4 into block 2; drop divider block 3; headFirst=`Бядуучуудын Эцэг буугтун!`; tailFirst=`Аятайхнаар та гийгүүлэгтүн!`; head/tail=11L/16L. | `src/data/loth/ordinarium/hymns.json:69`: remove blank index 15 between `Алив сүсэгтний сэтгэлийг` and `Аятайхнаар та гийгүүлэгтүн!`. |
| 21 | `docs/research/GOAL205-other-area-pagebreak-sweep.md:92` | `src/data/loth/prayers/hymns/21.rich.json:11-244`: merge block 2 into block 0; drop divider block 1; headFirst=`Баярлан магтан хүндэтгэцгээе сүр жавхлантай`; tailFirst=`Булаг мэтээр амьдрал ундарч далай мэтээр`; head/tail=17L/6L. | `src/data/loth/ordinarium/hymns.json:104`: remove blank index 17 between `учраас` and `Булаг мэтээр амьдрал ундарч далай мэтээр`. |
| 23 | `docs/research/GOAL205-other-area-pagebreak-sweep.md:93` | `src/data/loth/prayers/hymns/23.rich.json:11-149`: merge block 2 into block 0; drop divider block 1; headFirst=`Өө өө өө би Таныг магтъя`; tailFirst=`Бидний итгэлийг аваач Есүс ээ`; head/tail=8L/5L. | `src/data/loth/ordinarium/hymns.json:114`: remove blank index 8 between `Өө өө Бид Tаны хайраар амьдарьяа` and `Бидний итгэлийг аваач Есүс ээ`. |
| 27 | `docs/research/GOAL205-other-area-pagebreak-sweep.md:95` | `src/data/loth/prayers/hymns/27.rich.json:11-69`: merge block 2 into block 0; drop divider block 1; headFirst=`1.Бидний нүглийг уучилаач, биднийг өршөөгөөч`; tailFirst=`Гэрэл цацарсан хайраа бидэн рүү тусгаач`; head/tail=3L/1L. | `src/data/loth/ordinarium/hymns.json:134`: remove blank index 3 between `Гэмт амьдралаас минь биднийг татаач` and `Гэрэл цацарсан хайраа бидэн рүү тусгаач`. |
| 37 | `docs/research/GOAL205-other-area-pagebreak-sweep.md:97` | `src/data/loth/prayers/hymns/37.rich.json:11-38`: merge block 2 into block 0; drop divider block 1; headFirst=`Дээдийн дээд Хаадын Хаан болсон Эзэн`; tailFirst=`Зүрх сэтгэлийн гүнээс магтъя`; head/tail=9L/3L. | `src/data/loth/ordinarium/hymns.json:184`: remove blank index 9 between `Магтан дуулъя Эзэний нэрийг` and `Зүрх сэтгэлийн гүнээс магтъя`. |
| 42 | `docs/research/GOAL205-other-area-pagebreak-sweep.md:98` | `src/data/loth/prayers/hymns/42.rich.json:11-181`: merge block 2 into block 0; drop divider block 1; headFirst=`Есүс хамгийн нандин нэр юм аа`; tailFirst=`ӨӨ Есүс ээ чанга дуугаар өргөн магтъя`; head/tail=10L/2L. | `src/data/loth/ordinarium/hymns.json:209`: remove blank index 10 between `Есүс Таны хайр хязгааргүй юм аа` and `ӨӨ Есүс ээ чанга дуугаар өргөн магтъя`. |
| 48 | `docs/research/GOAL205-other-area-pagebreak-sweep.md:99` | `src/data/loth/prayers/hymns/48.rich.json:11-53`: merge block 2 into block 0; drop divider block 1; headFirst=`Зовлонгийн үе ойртон ирэхэд`; tailFirst=`Айдсын дунд цустай хөлсөө урсган`; head/tail=2L/2L. | `src/data/loth/ordinarium/hymns.json:239`: remove blank index 2 between `Есүс Эзэн ууланд очжээ` and `Айдсын дунд цустай хөлсөө урсган`. |
| 55 | `docs/research/GOAL205-other-area-pagebreak-sweep.md:101` | `src/data/loth/prayers/hymns/55.rich.json:11-53`: merge block 2 into block 0; drop divider block 1; headFirst=`Их Эзэний минь цус Их Эзэний минь цус`; tailFirst=`Аврагч Эзэний нандин тэр цус Ариун тахил юм`; head/tail=2L/12L. | `src/data/loth/ordinarium/hymns.json:274`: remove blank index 2 between `Хүч чадлыг надад өглөө` and `Аврагч Эзэний нандин тэр цус Ариун тахил юм`. |
| 69 | `docs/research/GOAL205-other-area-pagebreak-sweep.md:104` | `src/data/loth/prayers/hymns/69.rich.json:11-53`: merge block 2 into block 0; drop divider block 1; headFirst=`Намайг өөрчлөөч намайг өөрчлөөч`; tailFirst=`Төгс биелүүлж чадахын тулд`; head/tail=2L/5L. | `src/data/loth/ordinarium/hymns.json:344`: remove blank index 2 between `Таны дуудсан дуудлагыг` and `Төгс биелүүлж чадахын тулд`. |
| 71 | `docs/research/GOAL205-other-area-pagebreak-sweep.md:105` | `src/data/loth/prayers/hymns/71.rich.json:85-197`: merge block 4 into block 2; drop divider block 3; headFirst=`Дахилт:`; tailFirst=`Эрдэнийн эх дэлхийгээ хамгаалан`; head/tail=6L/3L. | `src/data/loth/ordinarium/hymns.json:354`: remove blank index 10 between `Энэрэлт Эзэний үгийг түгээж` and `Эрдэнийн эх дэлхийгээ хамгаалан`. |
| 77 | `docs/research/GOAL205-other-area-pagebreak-sweep.md:106` | `src/data/loth/prayers/hymns/77.rich.json:37-143`: merge block 4 into block 2; drop divider block 3; headFirst=`1. Эзэнийг магтан дуулагтун`; tailFirst=`Бүх ард түмнүүдээ`; head/tail=6L/2L. | `src/data/loth/ordinarium/hymns.json:384`: remove blank index 7 between `*сайнмэдээг тунхаглагтун` and exact plain next line `Бүх ард түмнүүдээ ` (note trailing space). |
| 79 | `docs/research/GOAL205-other-area-pagebreak-sweep.md:107` | `src/data/loth/prayers/hymns/79.rich.json:11-437`: merge block 2 into block 0; drop divider block 1; headFirst=`(Veni, creator Spiritus)`; tailFirst=`Ариун Сүнсэнд жавхланг`; head/tail=26L/3L. | `src/data/loth/ordinarium/hymns.json:394`: remove blank index 26 between `Эцэг, Хөвгүүн хийгээд` and `Ариун Сүнсэнд жавхланг`. |
| 86 | `docs/research/GOAL205-other-area-pagebreak-sweep.md:108` | `src/data/loth/prayers/hymns/86.rich.json:11-126`: merge block 2 into block 0; drop divider block 1; headFirst=`Та бол хайрыг авахын төлөө төрсөн хүн билээ`; tailFirst=`Энэ хорвоо дэлхий дээр таны амьдарч байгаа`; head/tail=7L/7L. | `src/data/loth/ordinarium/hymns.json:429`: remove blank index 7 between `гарган` and `Энэ хорвоо дэлхий дээр таны амьдарч байгаа`. |
| 93 | `docs/research/GOAL205-other-area-pagebreak-sweep.md:109` | `src/data/loth/prayers/hymns/93.rich.json:11-94`: merge block 2 into block 0; drop divider block 1; headFirst=`1. Танд хайртай миний Есүсээ Танд хайртай`; tailFirst=`Миний хайртай охин Би чамайг ерөөж байна`; head/tail=5L/1L. | `src/data/loth/ordinarium/hymns.json:464`: remove blank index 5 between `Миний хайртай хүү Би чамайг сайн мэднэ` and `Миний хайртай охин Би чамайг ерөөж байна`. |
| 99 | `docs/research/GOAL205-other-area-pagebreak-sweep.md:112` | `src/data/loth/prayers/hymns/99.rich.json:11-69`: merge block 2 into block 0; drop divider block 1; headFirst=`Ундран оргилох булаг мэт`; tailFirst=`Зовлонт сэтгэлийн хүлээсийг тайлна`; head/tail=3L/7L. | `src/data/loth/ordinarium/hymns.json:494`: remove blank index 3 between `Хүчит аварга хүрхрээ мэт тэнгэрээс асгарч` and `Зовлонт сэтгэлийн хүлээсийг тайлна`. |
| 115 | `docs/research/GOAL205-other-area-pagebreak-sweep.md:117` | `src/data/loth/prayers/hymns/115.rich.json:390-464`: merge block 10 into block 8; drop divider block 9; headFirst=`4. Энэхэн нялх хөвгүүн`; tailFirst=`Эгээрэл ба өршөөлийн`; head/tail=4L/2L. | `src/data/loth/ordinarium/hymns.json:574`: remove blank index 25 between `Эргүү хорыг засч` and `Эгээрэл ба өршөөлийн`. |
| 117 | `docs/research/GOAL205-other-area-pagebreak-sweep.md:118` | `src/data/loth/prayers/hymns/117.rich.json:425-483`: merge block 14 into block 12; drop divider block 13; headFirst=`6. Эгээрэл ба туйлын их баяртай`; tailFirst=`Энсэн гуйн хүлээж суумуй.`; head/tail=3L/1L. | `src/data/loth/ordinarium/hymns.json:584`: remove blank index 25 between `Энх жаргалын Ариун Сүнс буухуйг` and `Энсэн гуйн хүлээж суумуй.` |
| 119 | `docs/research/GOAL205-other-area-pagebreak-sweep.md:119` | `src/data/loth/prayers/hymns/119.rich.json:157-199`: merge block 8 into block 6; drop divider block 7; headFirst=`2. Агуу Эзэнийг магтан дуулахад`; tailFirst=`Алдарт Эзэний энэрэнгүй сэтгэл`; head/tail=2L/2L. | `src/data/loth/ordinarium/hymns.json:594`: remove blank index 9 between `Айх зүйл бидэнд байхгүй` and `Алдарт Эзэний энэрэнгүй сэтгэл`. |
| 122 | `docs/research/GOAL205-other-area-pagebreak-sweep.md:120` | `src/data/loth/prayers/hymns/122.rich.json:11-53`: merge block 2 into block 0; drop divider block 1; headFirst=`Эзэнийг магтан хүндэтгэн`; tailFirst=`Миний бүх зүйл болсон Их Эзэн`; head/tail=2L/13L. | `src/data/loth/ordinarium/hymns.json:609`: remove blank index 2 between `Миний хэлэхийг хүсэж буй үг нь Би Танд хайртай` and `Миний бүх зүйл болсон Их Эзэн`. |

## Protection Rules

The implementation must be target-list driven and fail-closed:

- Only the 20 rows above may appear in the new target cohort.
- Each rich target must validate `hymnId`, `headBlockIdx`, divider kind at `headBlockIdx + 1`, tail stanza kind at `headBlockIdx + 2`, `headFirstLine`, `tailFirstLine`, and expected head/tail line counts before writing, matching the existing guard model (`scripts/fix-hymn-pagebreak-stanza-drift.mjs:159-199`).
- Each plain target must validate exact `prevLine`, blank current line, and exact `nextLine` before splicing, matching the existing guard model (`scripts/fix-hymn-pagebreak-stanza-drift.mjs:251-291`).
- The 12 legitimate rows must not be listed as targets. Add regression assertions that they remain split exactly as documented in GOAL205 (`docs/research/GOAL205-other-area-pagebreak-sweep.md:91-116`).
- Historical 41/45/111 targets remain in the script and must still report NOOP after the new run (`docs/research/GOAL205-other-area-pagebreak-sweep.md:61-81`).
- Compline, propers, sanctoral, psalter, extractor scripts, and `parsed_data/full_pdf.txt` are out of scope and must not be modified.

## Test Strategy

Use Node/Vitest style tests under `scripts/__tests__/*.test.mjs`; do not add Python tests.

Required regression checks:

- Dry-run report test: `node scripts/fix-hymn-pagebreak-stanza-drift.mjs --dry-run` reports 20 new rich merges and 20 new plain merges, while 41/45/111 are NOOP.
- Rich data assertions after apply: for each of the 20 targets, the head block contains `expectedHeadLineCount + expectedTailLineCount` lines and the former tail first line appears at the expected offset, matching the `isRichTargetAlreadyMerged` semantics (`scripts/fix-hymn-pagebreak-stanza-drift.mjs:128-144`).
- Plain data assertions after apply: each target's `text.split("\n")` no longer contains the listed blank index between `prevLine` and `nextLine`, matching `isPlainTargetAlreadyMerged` semantics (`scripts/fix-hymn-pagebreak-stanza-drift.mjs:226-231`).
- Protection assertions: the 12 legitimate boundaries still exist as separate rich/plain structures; 41/45/111 remain already merged; compline/propers/sanctoral files are byte-unchanged.
- Phrase regeneration assertion: after `node scripts/build-hymn-phrases-into-rich.mjs --ids ...`, all affected rich stanza blocks have phrase coverage and no stale `phrases` from pre-merge heads.

## Deploy Note

This implementation will edit `src/data/loth/prayers/hymns/*.rich.json` and `src/data/loth/ordinarium/hymns.json`, changing SSR/rendered HTML content. Per `CLAUDE.md`, cache version must bump whenever static content/precached output changes; missing the bump can serve stale cache-first assets indefinitely (`CLAUDE.md:18`, `CLAUDE.md:35`). Current service worker version is `divine-office-v49` (`public/sw.js:549`), so the required deploy step is `v49 -> v50`.
