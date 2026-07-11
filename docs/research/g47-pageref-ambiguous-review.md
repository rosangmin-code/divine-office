# G47 page-reference correction and ambiguous review

Date: 2026-07-11  
Scope: four-week psalter `page` normalization and deferred `antiphonPage` review  
Source of truth: `parsed_data/full_pdf.txt` (no machine translation)

## Method

- `page` means the printed page on which the first real psalm/canticle stanza begins (Anchor S).
- Each correction below was accepted only when the verifier's first-stanza fingerprint resolved to one page in the local window and the same token stream was found directly in `full_pdf.txt`.
- The historical 23-row antiphon review cohort uses the first six normalized `default_antiphon` tokens. Zero or multiple distinct page matches are not assigned (NFR-009b).
- Generic `Шад дуулал N` text is only a block locator. It is not accepted as an antiphon fingerprint.
- The six Part II rows stay structurally skipped because their printed header belongs to Part I. Two of them also occur in the 23-row antiphon cohort; the tables intentionally show that overlap.

## Confirmed body-page corrections (22)

Every row had `H = old page` and a unique `S = old page + 1`. The PDF line is the start of the matched source token stream; Psalm 8 repeats the same fingerprint twice on the same unique page.

| Location | Ref | Old H | New S | `full_pdf.txt` line | First-stanza fingerprint |
| --- | --- | ---: | ---: | ---: | --- |
| W1 FRI vespers `[0]` | Psalm 41:2-14 | 150 | 151 | 5031 | `дорой хүмүүсийг анхааран асрагч нь юутай` |
| W1 FRI vespers `[1]` | Psalm 46:2-12 | 152 | 153 | 5103 | `тэнгэрбурхан бидний хоргодох газар ба хүч` |
| W1 SAT vespers `[0]` | Psalm 113:1-9 | 287 | 288 | 9796 | `эзэний зарц нар аа магтагтун` |
| W2 SUN lauds `[2]` | Psalm 150:1-6 | 180 | 181 | 6068 | `эзэнийг магтагтун тэнгэрбурханыг ариун газарт нь` |
| W2 SUN vespers `[1]` | Psalm 115:1-13 | 186 | 187 | 6279 | `бидэнд биш өө эзэн бидэнд биш` |
| W2 MON lauds `[1]` | Sirach 36:1-7, 13-16 | 197 | 198 | 6661 | `бүгдийн тэнгэрбурхан эзэн минь` |
| W2 TUE lauds `[2]` | Psalm 65:2-9 | 214 | 215 | 7262 | `газар дэлхийн бүх хязгаар` |
| W2 THU lauds `[1]` | Isaiah 12:1-6 | 248 | 249 | 8452 | `та нар авралын худгаас баяртайгаар ус` |
| W2 THU lauds `[2]` | Psalm 81:2-11 | 250 | 251 | 8515 | `дунд чинь гаднын бурхан бүү байг` |
| W2 THU vespers `[0]` | Psalm 72:1-11 | 254 | 255 | 8655 | `тэнгэрбурхан шүүлтээ хаанд зөвт байдлаа хааны` |
| W2 SAT lauds `[2]` | Psalm 8:2-10 | 282 | 283 | 9628, 9652 | `эзэн бидний эзэн таны нэр бүх` |
| W2 SAT vespers `[0]` | Psalm 113:1-9 | 287 | 288 | 9796 | `эзэний зарц нар аа магтагтун` |
| W3 SUN vespers `[0]` | Psalm 110:1-5, 7 | 304 | 305 | 10408 | `эзэн миний эзэнд би чиний дайснуудыг` |
| W3 MON vespers `[0]` | Psalm 123:1-4 | 322 | 323 | 11060 | `тэнгэрт залрагч аа тан руу би` |
| W3 TUE vespers `[1]` | Psalm 131:1-3 | 338 | 339 | 11626 | `өөрийгөө би тогтуун нам гүм байлгав` |
| W3 FRI lauds `[1]` | Jeremiah 14:17-21 | 377 | 378 | 13030 | `нүд минь шөнө ч өдөр ч` |
| W3 SAT vespers `[0]` | Psalm 113:1-9 | 287 | 288 | 9796 | `эзэний зарц нар аа магтагтун` |
| W4 SUN lauds `[0]` | Psalm 118:1-16 | 405 | 406 | 13993 | `эзэнд талархал өргө учир нь тэр` |
| W4 MON vespers `[0]` | Psalm 136:1-9 | 432 | 433 | 14962 | `эзэнд талархагтун учир нь тэр сайн` |
| W4 TUE lauds `[1]` | Daniel 3:26-27, 29, 34-41 | 442 | 443 | 15311 | `эзэн бидний өвөг дээдсийн тэнгэрбурхан` |
| W4 SAT vespers `[0]` | Psalm 122:1-9 | 398 | 399 | 13739 | `тэд надад эзэний өргөө рүү явцгаая` |
| W4 SAT vespers `[2]` | Philippians 2:6-11 | 401 | 402 | 13848 | `хэдийгээр есүс тэнгэрбурханы дүр байсан ч` |

## Deferred antiphon fingerprint review (23)

`antiphonPage` remains unset for every row. `page` below is the normalized body page after the corrections above. Candidate pages are direct matches for the real antiphon fingerprint, not the generic block label.

| Location | Ref | Current `page` | Candidate pages | Why deferred |
| --- | --- | ---: | --- | --- |
| W1 SUN lauds `[0]` | Psalm 63:2-9 | 58 | none | No fingerprint match in the local window |
| W1 THU lauds `[0]` | Psalm 57:2-12 | 125 | 124, 126 | Multiple distinct pages |
| W1 FRI lauds `[1]` | Isaiah 45:15-26 | 144 | none | No fingerprint match in the local window |
| W1 FRI vespers `[1]` | Psalm 46:2-12 | 153 | 152, 153, 154 | Multiple distinct pages |
| W1 SAT vespers `[0]` | Psalm 113:1-9 | 288 | 287, 288 | Multiple distinct pages |
| W1 SAT vespers `[2]` | Philippians 2:6-11 | 54 | none | No fingerprint match in the local window |
| W2 SUN lauds `[0]` | Psalm 118:1-16 | 175 | 174, 175 | Multiple distinct pages |
| W2 WED lauds `[2]` | Psalm 97:1-12 | 231 | 231, 232 | Multiple distinct pages |
| W2 FRI lauds `[0]` | Psalm 51:3-19 | 263 | 262, 264 | Multiple distinct pages |
| W2 FRI lauds `[1]` | Habakkuk 3:2-4, 13a, 15-19 | 265 | none | No fingerprint match in the local window |
| W2 SAT lauds `[2]` | Psalm 8:2-10 | 283 | 282, 283 | Multiple distinct pages |
| W2 SAT vespers `[0]` | Psalm 113:1-9 | 288 | 287, 288 | Multiple distinct pages |
| W2 SAT vespers `[2]` | Philippians 2:6-11 | 170 | none | No fingerprint match in the local window |
| W3 MON vespers `[0]` | Psalm 123:1-4 | 323 | 322, 323 | Multiple distinct pages |
| W3 WED vespers `[0]` | Psalm 126:1-6 | 352 | 351, 352 | Multiple distinct pages |
| W3 THU lauds `[0]` | Psalm 87:1-7 | 360 | 359, 360 | Multiple distinct pages |
| W3 THU lauds `[2]` | Psalm 99:1-9 | 363 | 363, 364 | Multiple distinct pages |
| W3 SAT vespers `[0]` | Psalm 113:1-9 | 288 | 287, 288 | Multiple distinct pages |
| W4 SUN lauds `[1]` | Daniel 3:52-57 | 409 | none | No fingerprint match in the local window |
| W4 MON vespers `[2]` | Ephesians 1:3-10 | 436 | none | No fingerprint match in the local window |
| W4 THU vespers `[1]` | Psalm 144:11-15 | 481 | 481, 482 | Multiple distinct pages; Part II overlap |
| W4 FRI lauds `[0]` | Psalm 51:3-19 | 488 | 487, 489 | Multiple distinct pages |
| W4 SAT lauds `[1]` | Ezekiel 36:24-28 | 507 | 506, 507 | Multiple distinct pages; Part II overlap |

The historical 23-row cohort was established before body-page normalization. After normalization, W2 THU lauds `[2]` Psalm 81 has its unique antiphon fingerprint on page 249, two pages before its corrected body page 251. The strengthened verifier therefore keeps it in manual review as `no-antiphon-fingerprint-in-block`; no `antiphonPage` was inferred here.

## Structural Part II skips (6)

These rows retain their existing `page`; `antiphonPage` remains unset. The ordinary H/S rule cannot validate them because the only printed header belongs to Part I.

| Location | Ref | Current `page` | Reason |
| --- | --- | ---: | --- |
| W1 WED vespers `[1]` | Psalm 27:7-14 | 118 | Part II has no independent header anchor |
| W3 FRI vespers `[1]` | Psalm 135:13-21 | 385 | Part II has no independent header anchor |
| W4 MON vespers `[1]` | Psalm 136:10-26 | 434 | Header is on page 432, outside the body window |
| W4 WED vespers `[1]` | Psalm 139:23-24 | 466 | Header is on page 464, outside the body window |
| W4 THU vespers `[1]` | Psalm 144:11-15 | 481 | Part II; also ambiguous at pages 481/482 |
| W4 SAT lauds `[1]` | Ezekiel 36:24-28 | 507 | Part II; also ambiguous at pages 506/507 |

## Outcome

- 22/22 H→S rows now declare the PDF-backed body start page.
- No `antiphonPage` value was changed in this work item.
- The 23 unresolved antiphon fingerprints and six Part II structural skips remain explicitly unassigned for manual review.
