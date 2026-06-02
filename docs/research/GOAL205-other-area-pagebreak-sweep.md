# GOAL205 other-area page-break paragraph split sweep

## Methodology

Symptom under review: a data structure boundary exists at a PDF page-break run, the pre-break line is not sentence-closed, and the post-break line begins with an uppercase character. The scan does not translate Mongolian; it compares data strings verbatim to `parsed_data/full_pdf.txt` and only counts source gaps whose intervening lines are page-break noise such as form-feed, bare page number, or running header.

Reference defect: the psalter extractor originally merged wrap continuations by lowercase Cyrillic start (`scripts/extract-psalm-texts.js:98-118`, `scripts/extract-psalm-texts.js:141-151`) and only crossed stanza boundaries on lowercase/start-wrap shape until the later metadata-aware hardening (`scripts/extract-psalm-texts.js:120-126`, `scripts/extract-psalm-texts.js:160-180`).

Data enumerated:

- hymns: `src/data/loth/prayers/hymns/*.rich.json` = 122 files, plus `src/data/loth/ordinarium/hymns.json` and `src/data/loth/ordinarium/hymns-index.json`.
- compline: `src/data/loth/ordinarium/compline.json`.
- propers: `src/data/loth/propers/advent.json`, `christmas.json`, `easter.json`, `lent.json`, `ordinary-time.json`.
- sanctoral: `src/data/loth/sanctoral/feasts.json`, `memorials.json`, `optional-memorials.json`, `solemnities.json`.

Scan command summary:

```text
area boundaries shape_candidates source_pagebreak_candidates
hymns 294 104 32
compline 25 7 0
propers 568 0 0
sanctoral 5 0 0
```

`boundaries` are adjacent data-unit boundaries scanned. `shape_candidates` additionally satisfy incomplete-pre / uppercase-post. `source_pagebreak_candidates` additionally match `full_pdf.txt` with only page-break noise between the two source lines.

## Verdicts

| area | data verdict | basis | fix GOAL? |
|---|---|---|---|
| hymns | PRESENT | 20 genuine wrong-splits remain in rich stanza boundaries; 12 additional page-break-adjacent rows are legitimate refrain/stanza/repeat boundaries and are excluded from remediation. The older three known splits are already merged (`scripts/fix-hymn-pagebreak-stanza-drift.mjs:64-88`; dry-run output below). | Yes, for the 20 genuine wrong-splits only. |
| compline | ABSENT | Scan found 25 boundaries, 7 shape candidates, 0 source page-break candidates. Data is mostly single-string fields and explicit arrays (`src/data/loth/ordinarium/compline.json:1-182`). | No. |
| propers | ABSENT | Scan found 568 boundaries, 0 shape candidates, 0 source page-break candidates across the five files. | No. |
| sanctoral | ABSENT | Scan found 5 boundaries, 0 shape candidates, 0 source page-break candidates across the four files. | No. |

## Pipeline-Sharing Verdict

| area | shares psalter lowercase-only merge defect? | evidence |
|---|---|---|
| hymns | partial/no | Legacy parser splits segments by blank lines (`scripts/parsers/hymn-parser.ts:84-91`, `scripts/parsers/hymn-parser.ts:192-206`), not by psalter lowercase-only stanza merge. Current direct `full_pdf.txt` extractor strips page-break runs before parsing (`scripts/extract-hymns-from-pdf.ts:50-86`), but its content-aware merge intentionally keeps whitespace-only current data (`scripts/extract-hymns-from-pdf.ts:162-180`). |
| compline | no | Responsory parser skips page/header noise while collecting a block (`scripts/lib/responsory-parser.js:109-120`) and parses by dash/glory structure (`scripts/lib/responsory-parser.js:123-202`); builder only reads existing fields and builds rich output (`scripts/build-compline-responsory-rich.mjs:36-62`). |
| propers | no | Pipeline annotates page fields by token fingerprints without changing text/paragraph structure (`scripts/extract-propers-pages.js:9-21`, `scripts/extract-propers-pages.js:66-83`, `scripts/extract-propers-pages.js:112-204`). Patch script only applies page-number corrections (`scripts/patch-propers-pages.js:39-54`). |
| sanctoral | no | Sanctoral uses the same page-correction protocol as propers; patch script only replaces page fields after locator validation (`scripts/patch-sanctoral-pages.js:38-52`). |

## Command Evidence

Hymn direct extractor verification:

```text
node --experimental-strip-types scripts/extract-hymns-from-pdf.ts --verify
=== extract-hymns-from-pdf ===
source: parsed_data/full_pdf.txt
body-region start line: 30092 | headers located: 122 /122
REAL content/page changes ( 0 ):
whitespace-only re-extract diffs kept-as-current ( 39 ): 8,14,19,21,23,25,27,31,37,41,42,44,45,46,48,50,52,55,57,66,69,71,73,77,79,81,82,86,93,94,97,99,105,108,112,115,117,119,122
empty-body hymns ( 0 ):
verify: OK — all 122 hymn bodies/pages agree with full_pdf.txt re-extraction
```

Historical hymn page-break repair dry-run:

```text
node scripts/fix-hymn-pagebreak-stanza-drift.mjs --dry-run
[fix-hymn-pagebreak-stanza-drift] mode=dry-run
rich.json targets:
  hymn 41: NOOP — already merged
  hymn 45: NOOP — already merged
  hymn 111: NOOP — already merged
ordinarium/hymns.json targets:
  hymn 41: NOOP — already merged
  hymn 45: NOOP — already merged
  hymn 111: NOOP — already merged
summary: rich merged=0 noop=3 error=0; plain merged=0 noop=3 error=0
```

The already-merged historical targets are visible in current rich/plain data and source:

- hymn 41 current rich has the formerly split first stanza in one 4-line stanza (`src/data/loth/prayers/hymns/41.rich.json:11-38`), plain text starts with the same merged sequence (`src/data/loth/ordinarium/hymns.json:202-204`), and the source page break sits between `1. Есүс мандан ирсэн` and `Их адис хайранд` (`parsed_data/full_pdf.txt:30972-30977`).
- hymn 45 current rich has `3. Ядуурлыг баримтлан ... Юуны тул зүдэв?` in one stanza (`src/data/loth/prayers/hymns/45.rich.json:254-281`), plain text is also merged (`src/data/loth/ordinarium/hymns.json:222-224`), and the source page break is `parsed_data/full_pdf.txt:31105-31112`.
- hymn 111 current rich has `3. Өлмий, мутар, хавирганы ... Үзүүлэхүй дор тэд тийн` in one stanza (`src/data/loth/prayers/hymns/111.rich.json:220-238`), plain text is merged (`src/data/loth/ordinarium/hymns.json:552-554`), and the source page break is `parsed_data/full_pdf.txt:32481-32487`.

## PRESENT Instances

All PRESENT rows are hymns. The 20 `genuine wrong-split` rows are `(a) legacy data residue`: the current direct hymn extractor has page-break stripping, but current rich data still has a stanza boundary at these page-break-only source gaps. The 12 `legitimate boundary` rows are retained for audit traceability but are not remediation targets. This is not the same lowercase-only psalter merge defect.

| # | data | split | full_pdf | pre-break text | post-break text | class |
|---:|---|---|---|---|---|---|
| 8 | `src/data/loth/prayers/hymns/8.rich.json:85` / `src/data/loth/prayers/hymns/8.rich.json:112` | blocks 2->4 | pre `parsed_data/full_pdf.txt:30253` / post `parsed_data/full_pdf.txt:30263` | `Дахилт: Ертөнцийн Эзэний сургаалаар` | `Өөрийн бие шигээ нэгнээ хайрлацгаая` | genuine wrong-split |
| 14 | `src/data/loth/prayers/hymns/14.rich.json:159` / `src/data/loth/prayers/hymns/14.rich.json:255` | blocks 2->4 | pre `parsed_data/full_pdf.txt:30397` / post `parsed_data/full_pdf.txt:30407` | `Алив сүсэгтний сэтгэлийг` | `Аятайхнаар та гийгүүлэгтүн!` | genuine wrong-split |
| 19 | `src/data/loth/prayers/hymns/19.rich.json:158` / `src/data/loth/prayers/hymns/19.rich.json:209` | blocks 4->6 | pre `parsed_data/full_pdf.txt:30498` / post `parsed_data/full_pdf.txt:30506` | `Амар амгаланг бидэнд дахин өгөөч` | `Дахилт:Үнэн итгэл хайрын Эзэн` | legitimate boundary (refrain) |
| 21 | `src/data/loth/prayers/hymns/21.rich.json:155` / `src/data/loth/prayers/hymns/21.rich.json:244` | blocks 0->2 | pre `parsed_data/full_pdf.txt:30532` / post `parsed_data/full_pdf.txt:30540` | `учраас` | `Булаг мэтээр амьдрал ундарч далай мэтээр` | genuine wrong-split |
| 23 | `src/data/loth/prayers/hymns/23.rich.json:74` / `src/data/loth/prayers/hymns/23.rich.json:149` | blocks 0->2 | pre `parsed_data/full_pdf.txt:30567` / post `parsed_data/full_pdf.txt:30575` | `Өө өө Бид Tаны хайраар амьдарьяа` | `Бидний итгэлийг аваач Есүс ээ` | genuine wrong-split |
| 25 | `src/data/loth/prayers/hymns/25.rich.json:20` / `src/data/loth/prayers/hymns/25.rich.json:53` | blocks 0->2 | pre `parsed_data/full_pdf.txt:30601` / post `parsed_data/full_pdf.txt:30609` | `Эзэнийг магтан дуулж байна` | `Бидний Эзэний Ариун Сүнс надад оршин` | legitimate boundary (stanza/repeat) |
| 27 | `src/data/loth/prayers/hymns/27.rich.json:29` / `src/data/loth/prayers/hymns/27.rich.json:69` | blocks 0->2 | pre `parsed_data/full_pdf.txt:30635` / post `parsed_data/full_pdf.txt:30643` | `Гэмт амьдралаас минь биднийг татаач` | `Гэрэл цацарсан хайраа бидэн рүү тусгаач` | genuine wrong-split |
| 31 | `src/data/loth/prayers/hymns/31.rich.json:47` / `src/data/loth/prayers/hymns/31.rich.json:101` | blocks 0->2 | pre `parsed_data/full_pdf.txt:30704` / post `parsed_data/full_pdf.txt:30712` | `Бурханы царайг харвал амьдарна` | `Дахилт:` | legitimate boundary (refrain) |
| 37 | `src/data/loth/prayers/hymns/37.rich.json:29` / `src/data/loth/prayers/hymns/37.rich.json:38` | blocks 0->2 | pre `parsed_data/full_pdf.txt:30840` / post `parsed_data/full_pdf.txt:30845` | `Магтан дуулъя Эзэний нэрийг` | `Зүрх сэтгэлийн гүнээс магтъя` | genuine wrong-split |
| 42 | `src/data/loth/prayers/hymns/42.rich.json:92` / `src/data/loth/prayers/hymns/42.rich.json:181` | blocks 0->2 | pre `parsed_data/full_pdf.txt:31039` / post `parsed_data/full_pdf.txt:31047` | `Есүс Таны хайр хязгааргүй юм аа` | `ӨӨ Есүс ээ чанга дуугаар өргөн магтъя` | genuine wrong-split |
| 48 | `src/data/loth/prayers/hymns/48.rich.json:20` / `src/data/loth/prayers/hymns/48.rich.json:53` | blocks 0->2 | pre `parsed_data/full_pdf.txt:31275` / post `parsed_data/full_pdf.txt:31285` | `Есүс Эзэн ууланд очжээ` | `Айдсын дунд цустай хөлсөө урсган` | genuine wrong-split |
| 52 | `src/data/loth/prayers/hymns/52.rich.json:20` / `src/data/loth/prayers/hymns/52.rich.json:53` | blocks 0->2 | pre `parsed_data/full_pdf.txt:31380` / post `parsed_data/full_pdf.txt:31388` | `Ариун замаар хөтлөн дагуулаач` | `Итгэмжтэйгээр үнэн зүрхээр` | legitimate boundary (stanza/repeat) |
| 55 | `src/data/loth/prayers/hymns/55.rich.json:20` / `src/data/loth/prayers/hymns/55.rich.json:53` | blocks 0->2 | pre `parsed_data/full_pdf.txt:31414` / post `parsed_data/full_pdf.txt:31422` | `Хүч чадлыг надад өглөө` | `Аврагч Эзэний нандин тэр цус Ариун тахил юм` | genuine wrong-split |
| 57 | `src/data/loth/prayers/hymns/57.rich.json:94` / `src/data/loth/prayers/hymns/57.rich.json:129` | blocks 2->4 | pre `parsed_data/full_pdf.txt:31450` / post `parsed_data/full_pdf.txt:31458` | `Миний бие сүнс магтан дуулж байна` | `Их Эзэний агуу алдар сүр хүчийг` | legitimate boundary (stanza/repeat) |
| 66 | `src/data/loth/prayers/hymns/66.rich.json:56` / `src/data/loth/prayers/hymns/66.rich.json:117` | blocks 0->2 | pre `parsed_data/full_pdf.txt:31584` / post `parsed_data/full_pdf.txt:31592` | `Би Танд хайртай` | `Мөнхийн мөнхөд бүхнээ зориулж Танд би` | legitimate boundary (stanza/repeat) |
| 69 | `src/data/loth/prayers/hymns/69.rich.json:20` / `src/data/loth/prayers/hymns/69.rich.json:53` | blocks 0->2 | pre `parsed_data/full_pdf.txt:31617` / post `parsed_data/full_pdf.txt:31625` | `Таны дуудсан дуудлагыг` | `Төгс биелүүлж чадахын тулд` | genuine wrong-split |
| 71 | `src/data/loth/prayers/hymns/71.rich.json:130` / `src/data/loth/prayers/hymns/71.rich.json:197` | blocks 2->4 | pre `parsed_data/full_pdf.txt:31655` / post `parsed_data/full_pdf.txt:31663` | `Энэрэлт Эзэний үгийг түгээж` | `Эрдэнийн эх дэлхийгээ хамгаалан` | genuine wrong-split |
| 77 | `src/data/loth/prayers/hymns/77.rich.json:46` / `src/data/loth/prayers/hymns/77.rich.json:143` | blocks 2->4 | pre `parsed_data/full_pdf.txt:31758` / post `parsed_data/full_pdf.txt:31766` | `*сайнмэдээг тунхаглагтун` | `Бүх ард түмнүүдээ` | genuine wrong-split |
| 79 | `src/data/loth/prayers/hymns/79.rich.json:236` / `src/data/loth/prayers/hymns/79.rich.json:437` | blocks 0->2 | pre `parsed_data/full_pdf.txt:31823` / post `parsed_data/full_pdf.txt:31833` | `Эцэг, Хөвгүүн хийгээд` | `Ариун Сүнсэнд жавхланг` | genuine wrong-split |
| 86 | `src/data/loth/prayers/hymns/86.rich.json:65` / `src/data/loth/prayers/hymns/86.rich.json:126` | blocks 0->2 | pre `parsed_data/full_pdf.txt:31960` / post `parsed_data/full_pdf.txt:31968` | `гарган` | `Энэ хорвоо дэлхий дээр таны амьдарч байгаа` | genuine wrong-split |
| 93 | `src/data/loth/prayers/hymns/93.rich.json:47` / `src/data/loth/prayers/hymns/93.rich.json:94` | blocks 0->2 | pre `parsed_data/full_pdf.txt:32099` / post `parsed_data/full_pdf.txt:32107` | `Миний хайртай хүү Би чамайг сайн мэднэ` | `Миний хайртай охин Би чамайг ерөөж байна` | genuine wrong-split |
| 94 | `src/data/loth/prayers/hymns/94.rich.json:268` / `src/data/loth/prayers/hymns/94.rich.json:343` | blocks 4->6 | pre `parsed_data/full_pdf.txt:32133` / post `parsed_data/full_pdf.txt:32141` | `Та надад үзүүлээч` | `Дахилт: Миний төлөө эдлэсэн Таны бүх зовлонг` | legitimate boundary (refrain) |
| 97 | `src/data/loth/prayers/hymns/97.rich.json:38` / `src/data/loth/prayers/hymns/97.rich.json:85` | blocks 0->2 | pre `parsed_data/full_pdf.txt:32166` / post `parsed_data/full_pdf.txt:32174` | `Баярын дуу сүр жавхланг Та бэлэглээч` | `Дахилт: Дээрээс гэрэл цацарч тэнгэр элч дэргэд` | legitimate boundary (refrain) |
| 99 | `src/data/loth/prayers/hymns/99.rich.json:29` / `src/data/loth/prayers/hymns/99.rich.json:69` | blocks 0->2 | pre `parsed_data/full_pdf.txt:32204` / post `parsed_data/full_pdf.txt:32212` | `Хүчит аварга хүрхрээ мэт тэнгэрээс асгарч` | `Зовлонт сэтгэлийн хүлээсийг тайлна` | genuine wrong-split |
| 105 | `src/data/loth/prayers/hymns/105.rich.json:56` / `src/data/loth/prayers/hymns/105.rich.json:117` | blocks 0->2 | pre `parsed_data/full_pdf.txt:32283` / post `parsed_data/full_pdf.txt:32284` | `Та бол бидний Тэнгэрбурхан /х2/` | `Дахилт:` | legitimate boundary (refrain) |
| 105 | `src/data/loth/prayers/hymns/105.rich.json:224` / `src/data/loth/prayers/hymns/105.rich.json:285` | blocks 4->6 | pre `parsed_data/full_pdf.txt:32293` / post `parsed_data/full_pdf.txt:32294` | `Та бол бидний Тэнгэрбурхан /х2/` | `Дахилт:` | legitimate boundary (refrain) |
| 105 | `src/data/loth/prayers/hymns/105.rich.json:392` / `src/data/loth/prayers/hymns/105.rich.json:453` | blocks 8->10 | pre `parsed_data/full_pdf.txt:32303` / post `parsed_data/full_pdf.txt:32313` | `Та бол бидний Тэнгэрбурхан /х2/` | `Дахилт:` | legitimate boundary (refrain) |
| 112 | `src/data/loth/prayers/hymns/112.rich.json:74` / `src/data/loth/prayers/hymns/112.rich.json:142` | blocks 0->2 | pre `parsed_data/full_pdf.txt:32513` / post `parsed_data/full_pdf.txt:32523` | `Тосоор тослооч ээ, тосоор тослооч ээ` | `Гал мэт хайрыг бид өргөж байна,` | legitimate boundary (stanza/repeat) |
| 115 | `src/data/loth/prayers/hymns/115.rich.json:417` / `src/data/loth/prayers/hymns/115.rich.json:464` | blocks 8->10 | pre `parsed_data/full_pdf.txt:32587` / post `parsed_data/full_pdf.txt:32595` | `Эргүү хорыг засч` | `Эгээрэл ба өршөөлийн` | genuine wrong-split |
| 117 | `src/data/loth/prayers/hymns/117.rich.json:443` / `src/data/loth/prayers/hymns/117.rich.json:483` | blocks 12->14 | pre `parsed_data/full_pdf.txt:32656` / post `parsed_data/full_pdf.txt:32664` | `Энх жаргалын Ариун Сүнс буухуйг` | `Энсэн гуйн хүлээж суумуй.` | genuine wrong-split |
| 119 | `src/data/loth/prayers/hymns/119.rich.json:166` / `src/data/loth/prayers/hymns/119.rich.json:199` | blocks 6->8 | pre `parsed_data/full_pdf.txt:32690` / post `parsed_data/full_pdf.txt:32698` | `Айх зүйл бидэнд байхгүй` | `Алдарт Эзэний энэрэнгүй сэтгэл` | genuine wrong-split |
| 122 | `src/data/loth/prayers/hymns/122.rich.json:20` / `src/data/loth/prayers/hymns/122.rich.json:53` | blocks 0->2 | pre `parsed_data/full_pdf.txt:32725` / post `parsed_data/full_pdf.txt:32733` | `Миний хэлэхийг хүсэж буй үг нь Би Танд хайртай` | `Миний бүх зүйл болсон Их Эзэн` | genuine wrong-split |

## Recommendation

Open a follow-up fix GOAL for hymns only if hymn stanza rendering should treat the 20 genuine wrong-splits the same way the three historical hymn cases were treated. The 12 legitimate refrain/stanza/repeat boundaries in the table are explicitly excluded from remediation scope. The fix should be data/render scoped, because current rich JSON contains dividers at the genuine wrong-split boundaries. It should not be framed as the psalter lowercase-only extractor defect: the hymn extractor has a page-break stripping path, and the remaining issue is legacy whitespace/rich-structure residue plus the current `wsOnly -> keep current` policy.

No fix GOAL is warranted for compline, propers, or sanctoral on this symptom: the scan found no data instances, and their pipelines do not share the psalter lowercase-only stanza merge logic.
