# GOAL193 Triage: Page-Break Stanza Candidates

Date checked: 2026-06-02

## Method

Input set: the 29 page/header-gap candidates listed in `docs/research/GOAL188-rca.md:163`.

Decision rule:

- `MERGE`: the two cited fragments are separated in `parsed_data/full_pdf.txt` only by page/form-feed/running-header noise, so the current stanza boundary is a page-break artifact.
- `KEEP`: exclude from the merge-only follow-up. In this triage, both `KEEP` rows are not validated liturgical stanza breaks; they are data-gap cases where `full_pdf.txt` has real omitted body lines between the two cited fragments, so simply merging the current adjacent stanzas would be wrong.

Command cross-check:

```text
meaningful_between=0 for 27/29 candidates after filtering blank/form-feed/page/week/day header lines.
Psalm 111:1-10 meaningful_between=7: full_pdf lines 10480-10486.
Psalm 139:1-18 meaningful_between=4: full_pdf lines 16082-16085.
```

For rows with `–`, I treated the dash as text inside the stanza unless `full_pdf.txt` showed a real non-page stanza separator. A dash at the page edge did not by itself justify preserving the current JSON stanza boundary.

## Triage Table

| # | Ref | Plain line | Rich line | full_pdf evidence | Decision | Rationale |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | Psalm 29:1-10 | `src/data/loth/psalter-texts.json:367` | `src/data/loth/prayers/commons/psalter-texts.rich.json:4653` | `parsed_data/full_pdf.txt:2583` -> `parsed_data/full_pdf.txt:2591` | MERGE | `Сирионыг...` and `Тэрээр...` are split only by page/header noise (`parsed_data/full_pdf.txt:2584` through `parsed_data/full_pdf.txt:2590`); the first fragment has no terminal punctuation. |
| 2 | Psalm 24:1-10 | `src/data/loth/psalter-texts.json:469` | `src/data/loth/prayers/commons/psalter-texts.rich.json:6376` | `parsed_data/full_pdf.txt:2999` -> `parsed_data/full_pdf.txt:3007` | MERGE | `Иаковын Тэнгэрбурхан,` is comma-open and resumes after only page/header noise at `parsed_data/full_pdf.txt:3000` through `parsed_data/full_pdf.txt:3006`. |
| 3 | Psalm 33:1-9 | `src/data/loth/psalter-texts.json:609` | `src/data/loth/prayers/commons/psalter-texts.rich.json:8203` | `parsed_data/full_pdf.txt:3168` -> `parsed_data/full_pdf.txt:3173` | MERGE | The apparent gap is page/week header material (`parsed_data/full_pdf.txt:3169` through `parsed_data/full_pdf.txt:3172`); `Тэдний амийг...` continues the same psalm thought after the printed dash. |
| 4 | Psalm 16:1-6 | `src/data/loth/psalter-texts.json:652` | `src/data/loth/prayers/commons/psalter-texts.rich.json:8754` | `parsed_data/full_pdf.txt:5667` -> `parsed_data/full_pdf.txt:5675` | MERGE | Page/week header only between the fragments (`parsed_data/full_pdf.txt:5668` through `parsed_data/full_pdf.txt:5674`); `Таны баруун мутарт` completes the paired line. |
| 5 | Psalm 20:2-8 | `src/data/loth/psalter-texts.json:670` | `src/data/loth/prayers/commons/psalter-texts.rich.json:8927` | `parsed_data/full_pdf.txt:3304` -> `parsed_data/full_pdf.txt:3312` | MERGE | Only page/week header noise intervenes (`parsed_data/full_pdf.txt:3305` through `parsed_data/full_pdf.txt:3311`); the blessing sequence continues. |
| 6 | Psalm 57:2-12 | `src/data/loth/psalter-texts.json:1054` | `src/data/loth/prayers/commons/psalter-texts.rich.json:14021` | `parsed_data/full_pdf.txt:4138` -> `parsed_data/full_pdf.txt:4146` | MERGE | The split follows a page break and week header only (`parsed_data/full_pdf.txt:4139` through `parsed_data/full_pdf.txt:4145`); no source stanza separator is visible. |
| 7 | Psalm 30:2-13 | `src/data/loth/psalter-texts.json:1157` | `src/data/loth/prayers/commons/psalter-texts.rich.json:15345` | `parsed_data/full_pdf.txt:4393` -> `parsed_data/full_pdf.txt:4401` | MERGE | `ЭЗЭН, Та намайг дээшээ өргөж,` is comma-open and resumes after only page/header noise (`parsed_data/full_pdf.txt:4394` through `parsed_data/full_pdf.txt:4400`). |
| 8 | Psalm 32:1-11 | `src/data/loth/psalter-texts.json:1232` | `src/data/loth/prayers/commons/psalter-texts.rich.json:16405` | `parsed_data/full_pdf.txt:4501` -> `parsed_data/full_pdf.txt:4509` | MERGE | The source gap is only page/week header (`parsed_data/full_pdf.txt:4502` through `parsed_data/full_pdf.txt:4508`); the second line continues the same protection image. |
| 9 | Revelation 11:17-18; 12:10b-12a | `src/data/loth/psalter-texts.json:1279` | `src/data/loth/prayers/commons/psalter-texts.rich.json:17067` | `parsed_data/full_pdf.txt:4574` -> `parsed_data/full_pdf.txt:4582` | MERGE | `Тиймээс тэнгэр хийгээд –` is incomplete and resumes after only page/week header (`parsed_data/full_pdf.txt:4575` through `parsed_data/full_pdf.txt:4581`). |
| 10 | Psalm 51:3-19 | `src/data/loth/psalter-texts.json:1336` | `src/data/loth/prayers/commons/psalter-texts.rich.json:17879` | `parsed_data/full_pdf.txt:16949` -> `parsed_data/full_pdf.txt:16957` | MERGE | Page/week header only between fragments (`parsed_data/full_pdf.txt:16950` through `parsed_data/full_pdf.txt:16956`); `Тэнгэрбурхан Та...` completes the object phrase. |
| 11 | Isaiah 45:15-26 | `src/data/loth/psalter-texts.json:1381` | `src/data/loth/prayers/commons/psalter-texts.rich.json:18494` | `parsed_data/full_pdf.txt:4847` -> `parsed_data/full_pdf.txt:4855` | MERGE | The break is page/week header noise (`parsed_data/full_pdf.txt:4848` through `parsed_data/full_pdf.txt:4854`); the question continues the same address after the printed dash. |
| 12 | Psalm 132:1-10 | `src/data/loth/psalter-texts.json:1548` | `src/data/loth/prayers/commons/psalter-texts.rich.json:20771` | `parsed_data/full_pdf.txt:12662` -> `parsed_data/full_pdf.txt:12670` | MERGE | Only page/week header lines intervene (`parsed_data/full_pdf.txt:12663` through `parsed_data/full_pdf.txt:12669`); the David oath narrative continues. |
| 13 | Psalm 116:10-19 | `src/data/loth/psalter-texts.json:1706` | `src/data/loth/prayers/commons/psalter-texts.rich.json:22714` | `parsed_data/full_pdf.txt:9860` -> `parsed_data/full_pdf.txt:9868` | MERGE | Page/week header only (`parsed_data/full_pdf.txt:9861` through `parsed_data/full_pdf.txt:9867`); `ЭЗЭНий мэлмийд...` completes the same sentence. |
| 14 | Psalm 118:1-16 | `src/data/loth/psalter-texts.json:1814` | `src/data/loth/prayers/commons/psalter-texts.rich.json:24543` | `parsed_data/full_pdf.txt:5876` -> `parsed_data/full_pdf.txt:5884` | MERGE | The two lines are separated only by page/week header noise (`parsed_data/full_pdf.txt:5877` through `parsed_data/full_pdf.txt:5883`). |
| 15 | Psalm 115:1-13 | `src/data/loth/psalter-texts.json:1980` | `src/data/loth/prayers/commons/psalter-texts.rich.json:26410` | `parsed_data/full_pdf.txt:6305` -> `parsed_data/full_pdf.txt:6313` | MERGE | Page/week header only (`parsed_data/full_pdf.txt:6306` through `parsed_data/full_pdf.txt:6312`); the blessing sequence continues. |
| 16 | Psalm 65:2-9 | `src/data/loth/psalter-texts.json:2297` | `src/data/loth/prayers/commons/psalter-texts.rich.json:30216` | `parsed_data/full_pdf.txt:7288` -> `parsed_data/full_pdf.txt:7296` | MERGE | Only page/week header noise intervenes (`parsed_data/full_pdf.txt:7289` through `parsed_data/full_pdf.txt:7295`); the harvest image continues. |
| 17 | Psalm 49:1-13 | `src/data/loth/psalter-texts.json:2325` | `src/data/loth/prayers/commons/psalter-texts.rich.json:30596` | `parsed_data/full_pdf.txt:7431` -> `parsed_data/full_pdf.txt:7439` | MERGE | The page/week header gap (`parsed_data/full_pdf.txt:7432` through `parsed_data/full_pdf.txt:7438`) is the only separator; the ransom statement continues. |
| 18 | Psalm 97:1-12 | `src/data/loth/psalter-texts.json:2493` | `src/data/loth/prayers/commons/psalter-texts.rich.json:32871` | `parsed_data/full_pdf.txt:7878` -> `parsed_data/full_pdf.txt:7886` | MERGE | `Учир нь Та...` is incomplete and resumes after page/header noise only (`parsed_data/full_pdf.txt:7879` through `parsed_data/full_pdf.txt:7885`). |
| 19 | Psalm 62:2-9 | `src/data/loth/psalter-texts.json:2543` | `src/data/loth/prayers/commons/psalter-texts.rich.json:33599` | `parsed_data/full_pdf.txt:8053` -> `parsed_data/full_pdf.txt:8061` | MERGE | Only page/week header noise intervenes (`parsed_data/full_pdf.txt:8054` through `parsed_data/full_pdf.txt:8060`); the admonition continues after the dash. |
| 20 | Psalm 116:1-9 | `src/data/loth/psalter-texts.json:2850` | `src/data/loth/prayers/commons/psalter-texts.rich.json:37751` | `parsed_data/full_pdf.txt:9242` -> `parsed_data/full_pdf.txt:9250` | MERGE | Page/week header only (`parsed_data/full_pdf.txt:9243` through `parsed_data/full_pdf.txt:9249`); `Намайг олж иржээ.` completes the same peril image. |
| 21 | Psalm 92:2-9 | `src/data/loth/psalter-texts.json:3005` | `src/data/loth/prayers/commons/psalter-texts.rich.json:39942` | `parsed_data/full_pdf.txt:9513` -> `parsed_data/full_pdf.txt:9521` | MERGE | The source separator is only page/week header noise (`parsed_data/full_pdf.txt:9514` through `parsed_data/full_pdf.txt:9520`). |
| 22 | Psalm 111:1-10 | `src/data/loth/psalter-texts.json:3263` | `src/data/loth/prayers/commons/psalter-texts.rich.json:42875` | `parsed_data/full_pdf.txt:10472` -> `parsed_data/full_pdf.txt:10487` | KEEP | Do not merge these current adjacent stanzas: after the page/header, real body lines appear at `parsed_data/full_pdf.txt:10480` through `parsed_data/full_pdf.txt:10486` before the cited right fragment. This is a missing-body/data-gap repair, not a safe merge-only case. |
| 23 | Psalm 98:1-9 | `src/data/loth/psalter-texts.json:3643` | `src/data/loth/prayers/commons/psalter-texts.rich.json:48234` | `parsed_data/full_pdf.txt:11980` -> `parsed_data/full_pdf.txt:11988` | MERGE | `ЭЗЭНий өмнө...` is incomplete and resumes after only page/header noise (`parsed_data/full_pdf.txt:11981` through `parsed_data/full_pdf.txt:11987`). |
| 24 | Psalm 90:1-12 | `src/data/loth/psalter-texts.json:4063` | `src/data/loth/prayers/commons/psalter-texts.rich.json:53360` | `parsed_data/full_pdf.txt:14661` -> `parsed_data/full_pdf.txt:14669` | MERGE | Comma-open `Та бидний гэм бурууг...` resumes after page/header noise only (`parsed_data/full_pdf.txt:14662` through `parsed_data/full_pdf.txt:14668`). |
| 25 | Psalm 108:2-7 | `src/data/loth/psalter-texts.json:4341` | `src/data/loth/prayers/commons/psalter-texts.rich.json:57017` | `parsed_data/full_pdf.txt:15827` -> `parsed_data/full_pdf.txt:15835` | MERGE | Only page/week header noise intervenes (`parsed_data/full_pdf.txt:15828` through `parsed_data/full_pdf.txt:15834`); the divine-speech sequence continues. |
| 26 | Psalm 139:1-18 | `src/data/loth/psalter-texts.json:4415` | `src/data/loth/prayers/commons/psalter-texts.rich.json:57701` | `parsed_data/full_pdf.txt:16074` -> `parsed_data/full_pdf.txt:16086` | KEEP | Do not merge these current adjacent stanzas: `full_pdf.txt` has real body lines `ойлгодог.` through `Миний бүх явдлыг дотно сайн мэддэг.` at `parsed_data/full_pdf.txt:16082` through `parsed_data/full_pdf.txt:16085` between the cited fragments. This needs insertion/repair, not a simple boundary merge. |
| 27 | Psalm 143:1-11 | `src/data/loth/psalter-texts.json:4463` | `src/data/loth/prayers/commons/psalter-texts.rich.json:58386` | `parsed_data/full_pdf.txt:16389` -> `parsed_data/full_pdf.txt:16397` | MERGE | Page/week header only (`parsed_data/full_pdf.txt:16390` through `parsed_data/full_pdf.txt:16396`); the plea continues after the dash. |
| 28 | Psalm 147:12-20 | `src/data/loth/psalter-texts.json:4523` | `src/data/loth/prayers/commons/psalter-texts.rich.json:59173` | `parsed_data/full_pdf.txt:9100` -> `parsed_data/full_pdf.txt:9108` | MERGE | The source separator is page/week header noise only (`parsed_data/full_pdf.txt:9101` through `parsed_data/full_pdf.txt:9107`). |
| 29 | Psalm 144:11-15 | `src/data/loth/psalter-texts.json:4545` | `src/data/loth/prayers/commons/psalter-texts.rich.json:59439` | `parsed_data/full_pdf.txt:16677` -> `parsed_data/full_pdf.txt:16685` | MERGE | Comma/dash-open `Баруун гар нь...` resumes after page/week header noise only (`parsed_data/full_pdf.txt:16678` through `parsed_data/full_pdf.txt:16684`). |

## Merge-Only Input For WI-193-002

The merge-only list is 27 candidates:

```text
Psalm 29:1-10 @ src/data/loth/psalter-texts.json:367 / rich:4653
Psalm 24:1-10 @ src/data/loth/psalter-texts.json:469 / rich:6376
Psalm 33:1-9 @ src/data/loth/psalter-texts.json:609 / rich:8203
Psalm 16:1-6 @ src/data/loth/psalter-texts.json:652 / rich:8754
Psalm 20:2-8 @ src/data/loth/psalter-texts.json:670 / rich:8927
Psalm 57:2-12 @ src/data/loth/psalter-texts.json:1054 / rich:14021
Psalm 30:2-13 @ src/data/loth/psalter-texts.json:1157 / rich:15345
Psalm 32:1-11 @ src/data/loth/psalter-texts.json:1232 / rich:16405
Revelation 11:17-18; 12:10b-12a @ src/data/loth/psalter-texts.json:1279 / rich:17067
Psalm 51:3-19 @ src/data/loth/psalter-texts.json:1336 / rich:17879
Isaiah 45:15-26 @ src/data/loth/psalter-texts.json:1381 / rich:18494
Psalm 132:1-10 @ src/data/loth/psalter-texts.json:1548 / rich:20771
Psalm 116:10-19 @ src/data/loth/psalter-texts.json:1706 / rich:22714
Psalm 118:1-16 @ src/data/loth/psalter-texts.json:1814 / rich:24543
Psalm 115:1-13 @ src/data/loth/psalter-texts.json:1980 / rich:26410
Psalm 65:2-9 @ src/data/loth/psalter-texts.json:2297 / rich:30216
Psalm 49:1-13 @ src/data/loth/psalter-texts.json:2325 / rich:30596
Psalm 97:1-12 @ src/data/loth/psalter-texts.json:2493 / rich:32871
Psalm 62:2-9 @ src/data/loth/psalter-texts.json:2543 / rich:33599
Psalm 116:1-9 @ src/data/loth/psalter-texts.json:2850 / rich:37751
Psalm 92:2-9 @ src/data/loth/psalter-texts.json:3005 / rich:39942
Psalm 98:1-9 @ src/data/loth/psalter-texts.json:3643 / rich:48234
Psalm 90:1-12 @ src/data/loth/psalter-texts.json:4063 / rich:53360
Psalm 108:2-7 @ src/data/loth/psalter-texts.json:4341 / rich:57017
Psalm 143:1-11 @ src/data/loth/psalter-texts.json:4463 / rich:58386
Psalm 147:12-20 @ src/data/loth/psalter-texts.json:4523 / rich:59173
Psalm 144:11-15 @ src/data/loth/psalter-texts.json:4545 / rich:59439
```

Excluded from merge-only list:

- `Psalm 111:1-10` at `src/data/loth/psalter-texts.json:3263`: repair must account for omitted `parsed_data/full_pdf.txt:10480` through `parsed_data/full_pdf.txt:10486`.
- `Psalm 139:1-18` at `src/data/loth/psalter-texts.json:4415`: repair must account for omitted `parsed_data/full_pdf.txt:16082` through `parsed_data/full_pdf.txt:16085`.

