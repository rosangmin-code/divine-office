# Shard D truncation-sweep evidence

- Work item: `wi-106-005` / `[#106-sub-3d]`
- Scanner: `dvo-ref-co`
- Frozen source HEAD: `52a8d02b50d4bc5374b9987bd89eb1bf2c2e234d`
- Shard: `D`
- Terminal rows: `4531`
- Shard address SHA-256: `2ca3c9a06fa4adf2353de87554baecdcd554f9a9fa82042a4828838be20df103`
- Shard address+content SHA-256: `5aa2af6414061ede4d0142fe64f70e9c0f6155f4b2f08533d1b14ed0ec757ce7`
- Frozen full-population address SHA-256: `1aabb72bdbd92157854e6a7df3f985e7b0ac981be8bc54c8223e8b0bc51a8a10`
- Text SoT SHA-256: `f12f6135556f77df75593d2627ec2642ec6113c2a56f52b26102653580c1b330`
- Geometry PDF SHA-256: `fa0397e9674745f2dc740094eb53f4a367740f6b55d50e1edcf8970972fc3fcd`

## Method and gates

The scan enumerated every Cyrillic scalar under the eight shard-D areas with the frozen JSON-pointer and `gospelCanticleAntiphon*` exclusion contract. Each row retains the literal value hash and receives exactly one plan-approved terminal disposition.

`pdftotext -layout` was run across physical pages 1–482. The tracked column splitter reconstructed left/right book-page streams using the empirically verified book-page mapping. Physical pages 483–485 are blank; the extracted range still covers book pages through 963, beyond every shard-D page hint. Comparisons never use raw interleaved order.

Comparison tiers are literal, whitespace-only (including visual wraps), typography (NFKC plus quote/dash variants), and whitespace-stripped. No letters, inflections, word order, punctuation presence, or vocabulary are rewritten. A literal occurrence is not automatically accepted when geometry shows a same-line positive tail; it remains `REVIEW_DIVERGENCE` unless the tail is proved to be a stored neighbor/structural anchor. Lowercase continuation is recorded only as a triage signal, never a verdict. Multi-span rich lines are compared as a complete semantic unit before an individual leaf can match.

The coordinator KEEP ledger at `/home/min/myproject/divineoffice/docs/research/51-truncation-sweep/intentional-divergences.jsonl` was loaded at scan time. Only exact address + current value-SHA matches became `KEEP_RULED`; no phrase-global suppression was applied. Exact shard-D KEEP hits: 2.

## Tier-truthfulness self-audit

- `MATCH_LITERAL` rows with `evidence.data !== evidence.pdf_visual`: `0`.
- `MATCH_NORMALIZED` rows with byte-equal evidence: `0`.
- `MATCH_NORMALIZED` rows failing their recorded whitespace/typography normalization equality: `0`.
- `SOURCE_NOT_FOUND` rows whose literal data occurs in `/home/min/myproject/divineoffice/parsed_data/full_pdf.txt`: `0`.

## Terminal reconciliation

| Disposition | Count |
|---|---:|
| `KEEP_RULED` | 2 |
| `MATCH_LITERAL` | 3,026 |
| `MATCH_NORMALIZED` | 1,243 |
| `REVIEW_DIVERGENCE` | 39 |
| `REVIEW_GEOMETRY` | 115 |
| `SOURCE_NOT_FOUND` | 106 |
| **Total** | **4,531** |

## Candidate packets

### D-001 — `src/data/loth/ordinarium/compline.json#/anteMarian/alternatives/2/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 544; physical 273 left
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=26
- Data: "Амар амгалан Мариа минь ээ, Та хишиг ивээлээр бялхам билээ. Эзэн тантай хамт байна. Таныг эмэгтэйчүүдийн дундаас адисалсан билээ. Таны хэвлий дэх үр Есүсийг бас адисалсан билээ. Тэнгэрбурханы эх Мариа Гэгээн минь ээ, Та одоо болон насан эцэслэх мөчид нүгэлт бидний төлөө залбиран соёрхоно уу."
- Raw reconstructed fragment: "Амар амгалан Мариа минь ээ\n   Та хишиг ивээлээр бялхам билээ.\n   Эзэн тантай хамт байна.\n   Таныг эмэгтэйчүүдийн дундаас адисалсан"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: none identified

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=26 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-002 — `src/data/loth/ordinarium/compline.json#/blessing/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 517; physical 259 right
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=33
- Data: "Төгс хүчит Эзэн биднийг адисалж, энэ шөнө амар тайван байлгаж, амар амгалангаар сахин хамгаалтугай."
- Raw reconstructed fragment: "Төгс хүчит Эзэн биднийг адисалж,\nЭнэ шөнө амар тайван байлгаж,\nАмар амгалангаар сахин хамгаалтугай.\n\n- Амэн.\n\nТөгс жаргалт Цэвэр Охин               Мариагийн\nхүндэтгэлийн дуу, х. 544-545.\n\n2 ДУГААР ОРОЙН ЗАЛБИРЛЫН ДАРАА.\nНЯМ ГАРАГУУДАД БОЛОН ИХ БАЯРУУДАД\n\nДууллын залбирал\n\nШад"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: none identified

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=33 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-003 — `src/data/loth/ordinarium/compline.json#/days/SAT/concludingPrayer/primary`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 516; physical 259 left
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=57
- Data: "Аяа, Эзэн минь, энэ шөнийн турш бидэнтэй хамт байгаарай. Өдөр болоход бид нойрноосоо сэрж, Христийн амилалтад баярлан цэнгэх болтугай. Тэрээр үүрд мөнх оршин хаанчилдаг билээ."
- Raw reconstructed fragment: "Аяа, Эзэн минь, энэ шөнийн турш бидэнтэй хамт\n\nбайгаарай. өдөр болоход бид нойрноосоо сэрж,\n\nХристийн амилалтад баярлан цэнгэх болтугай.\n\nТэрээр үүрд мөнх оршин хаанчилдаг билээ.\n\nЭсвэл: Ням гарагт үл тохиох Их баярын өдөр\n\nАяа, Эзэн минь, Та энэ гэрт зочлон орж, эндээс\n\nдайсны үхлийн хамаг ид хүчийг зайлуулж өгнө\n\nүү хэмээн Танаас бид залб"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: none identified

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=57 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-004 — `src/data/loth/ordinarium/compline.json#/days/WED/concludingPrayer/primary`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 534; physical 268 left
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=36
- Data: "Аяа, Эзэн Есүс Христ минь, Та Өөрийн дагалдагчдадаа эелдэг болон даруу төлөв зангийн үлгэр дуурайлыг үзүүлж, хөнгөн ачаа, аятай буулгыг өгсөн билээ. Та бидний энэ өдрийн даатгал залбирал, ажил хөдөлмөрийг хүлээн зөвшөөрж, мөн биднийг хүчирхэгжүүлэх амралтыг хайрлан соёрхоно уу. Тиймийн тул бид Танд илүү үнэнчээр үйлчлэх болно. Та үүрд мөнх оршин хаанчилдаг билээ."
- Raw reconstructed fragment: "Аяа, Эзэн Есүс Христ минь, Та              Өөрийн"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: none identified

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=36 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-005 — `src/data/loth/ordinarium/compline.json#/nuncDimittis/antiphon`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 515; physical 258 right
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=185
- Data: "Эзэн минь, биднийг сэрүүн байхад ч хамгаалж, унтаж байхад ч сахин хамгаална уу. Тиймээс сэрүүн байхдаа бид Христтэй хамт сэрэмжтэй байж, унтаж байхдаа Түүний амар амгаланд нойрсож болно."
- Raw reconstructed fragment: "Эзэн минь, биднийг сэрүүн байхад\nч хамгаалж, унтаж байхад ч сахин хамгаална уу.\nТиймээс сэрүүн байхдаа бид Христтэй хамт\nсэрэмжтэй байж, унтаж байхдаа Түүний амар\nамгаланд нойрсож болно (Аллэлуяа!).\n\n\nСайнмэдээний айлдлын магтаал        Лук 2:29-32\nХрист бол харь үндэстэнд илчлэгдэх гэгээн гэрэл,\n  Израилийг алдаршуулах сүр жавхлан мөн."
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: none identified

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=185 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-006 — `src/data/loth/ordinarium/hymns.json#/121/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 961; physical 481 right
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=52
- Data: "ЭЗЭНийг магтагтун\nЭЗЭНийг магтагтун\nАрд түмнүүд ээ, Аллэлуяа\nLaudate Dominum\nLaudate Dominum\nOmnes Gentes alleluia"
- Raw reconstructed fragment: "ЭЗЭНийг магтагтун\nЭЗЭНийг магтагтун\nАрд түмнүүд ээ, Aллэлуяа\n\nLaudate Dominum\n\nLaudate Dominum\n\nOmnes Gentes alleluia\n\n       122. Эзэнийг магтан хүндэтгэн\n\nЭзэнийг магтан хүндэтгэн\n\nМиний хэлэхийг хүсэж буй үг нь Би Танд хайртай"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: `src/data/loth/prayers/hymns/121.rich.json#/hymnRich`

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=52 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-007 — `src/data/loth/ordinarium/hymns.json#/23/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 898; physical 450 left
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=141
- Data: "Өө өө өө би Таныг магтъя\nӨө өө өө би Таныг магтъя\nБидний гэмийг уучлаач\nБидний гэмийг уучлаач Есүс ээ\nБидний амьдралыг жолоодооч Их эзэн\nБид Таны сүнсээр амьдарьяа\nБид Таны хайраар мөнхөрье өө\nӨө өө Бид Таны хайраар амьдарьяа\nБидний итгэлийг аваач Есүс ээ\nБидний зүтгэлийг аваач Их Эзэн\nБид Таныг үүрд хүндлэе ээ\nБид Таныг үүрд магтая аа\nӨө өө Бид Таныг үүрд магтъя аа"
- Raw reconstructed fragment: "Өө өө өө би Таныг магтъя\n\nӨө өө өө би Таныг магтъя\n\nБидний гэмийг уучлаач\n\nБидний гэмийг уучлаач Есүс ээ\n\nБидний амьдралыг жолоодооч Их эзэн\nБид Tаны сүнсээр амьдарьяа\nБид Tаны хайраар мөнxөpьe өө\nӨө өө Бид Tаны хайраар амьдарьяа"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: `src/data/loth/prayers/hymns/23.rich.json#/hymnRich`

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=141 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-008 — `src/data/loth/ordinarium/hymns.json#/36/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 906; physical 454 left
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=223
- Data: "Дэлхийн зах хязгаар бүр авралыг үзлээ\nДэлхийн зах хязгаар бүр\nБурханы авралыг үзлээ\nБурханы авралыг үзлээ\n1. Эзэнд шинэ дууг дуулагтун\nТэрээр гайхамшигт үйлсийг хийж\nТүүний баруун гар ба Ариун мутар\nБидэнд авралыг хүргэсэн\nБидний Бурханы авралыг үзлээ\nЭзэнд баяртайгаар хашхирагтун\nДуу гарган дуулагтун\n3. Ятгаар болон ая эгшигээр\nЯтгаар Эзэнд магтан дуулж\nБүрээнүүд ба бүрээн дуугаар\nХааны өмнө хашхирагтун"
- Raw reconstructed fragment: "Дэлхийн зах хязгаар бүр авралыг үзлээ\nДэлхийн зах хязгаар бүр\nБурханы авралыг үзлээ\n\nБурханы авралыг үзлээ\n\n1. Эзэнд шинэ дууг дуулагтун\nТэрээр гайхамшигт үйлсийг хийж\nТүүний баруун гар ба Ариун мутар\nБидэнд авралыг хүргэсэн\n\n2. Дэлхийн зах хязгаар бүр\nБидний Бурханы авралыг үзлээ\nЭзэнд баяртайгаар хашхирагтун\nДуу гарган дуулагтун\n3. Ятгаар болон ая эгшигээр\nЯтгаар Эзэнд магтан дуулж\nБүрээнүүд ба бүрээн дуугаар\nХааны өмнө хашхирагтун\n\n              37. Дээдийн дээд\nДээдийн дээд Хаадын Хаан болсон Эзэн\nЕсүсийн алдр…"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: `src/data/loth/prayers/hymns/36.rich.json#/hymnRich`

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=223 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-009 — `src/data/loth/ordinarium/hymns.json#/51/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 922; physical 462 left
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=59
- Data: "Ирээч Ариун Сүнс ээ над дээр буугаач\nНамайг тослооч өөрийн хүч чадлаараа\nСүнсийг минь хооллогч ариун сүнсэнд\nби хайртай\nӨдөр бүр Таны хайранд өсдөг\nЗүрхэнд тань хүрэх юмсан\nАмьдралыг минь атгаач Та\nНадтай улам ойр байгаач\nХүч чадлыг тань мэдрэхсэн\nЮутай ч зүйрлэшгүй оршихуйд\nТаньтайгаа учран уулзахсан\nСүнсээр ба үнэнээр хүндэлье Таныг"
- Raw reconstructed fragment: "Ирээч Ариун Сүнс ээ над дээр буугаач\nНамайг тослооч өөрийн xүч чадлаараа\nСүнсийг минь xооллогч ариун сүнсэнд\n\nби xайртай\n\nӨдөр бүр Таны xайранд өсдөг\n\nЗүрxэнд тань xүрэх юмсан\nАмьдралыг минь атгаач Та\n\nНадтай улам ойр байгаач\n\nХүч чадлыг тань мэдрэхсэн\n\nЮутай ч зүйрлэшгүй оршихуйд\n\nТаньтайгаа учран уулзахсан\n\nСүнсээр ба үнэнээр xүндэлье Tаныг\n\n             52. Итгэмжтэйгээр\n\nИтгэмжтэйгээр үнэн зүрхээр\n\nАриун замаар хөтлөн дагуулаач"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: `src/data/loth/prayers/hymns/51.rich.json#/hymnRich`

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=59 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-010 — `src/data/loth/ordinarium/hymns.json#/71/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 930; physical 466 left
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=233
- Data: "Тэнгэрбурханы хайрыг гэрчилж\nТэнгэрлэг түүх соёлоо эрхэмлэж\nЭв нэгдэл шударга ёсыг бэхжүүлж\nЭнэрэнгүйгээр нийгэмдээ үйлчилье\nДахилт:\nАриун Сүнсээр хөтлүүлсэн\nМонгол дахь Католик сүм\nИтгэл бишрэлээрээ нэгдэж\nӨөрийгөө зориулан ажиллая\nЭнэрэлт Эзэний үгийг түгээж\nЭрдэнийн эх дэлхийгээ хамгаалан\nЗалбирал ба айлдлыг хүндлэн дээдэлж\nЗалуучууд ба гэр бүлийг дэмжье\nДахилт:\nАриун Сүнсээр хөтлүүлсэн\nМонгол дахь Католик сүм\nИтгэл бишрэлээрээ нэгдэж\nӨөрийгөө зориулан ажиллая"
- Raw reconstructed fragment: "Тэнгэрбурханы хайрыг гэрчилж\nТэнгэрлэг түүх соёлоо эрхэмлэж\nЭв нэгдэл шударга ёсыг бэхжүүлж\nЭнэрэнгүйгээр нийгэмдээ үйлчилье\nДахилт:\nАриун Сүнсээр хөтлүүлсэн\nМонгол дахь Католик сүм\nИтгэл бишрэлээрээ нэгдэж\nӨөрийгөө зориулан ажиллая\n\n2. Оролцоот сүмийн төлөө\nЭнэрэлт Эзэний үгийг түгээж"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: `src/data/loth/prayers/hymns/71.rich.json#/hymnRich`

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=233 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-011 — `src/data/loth/ordinarium/hymns.json#/86/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 939; physical 470 right
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=269
- Data: "Та бол хайрыг авахын төлөө төрсөн хүн билээ\nТа өөрийн амьдралдаа тэр хайрыг амсан байна уу\nТа бол хайрыг авахын төрсөн хүн билээ\nТа өөрийн амьдралдаа тэр хайрыг амсан байна уу\nӨнө эрт цагаас эхэлсэн Их Эзэний минь агуу хайр\nБидний уулзалтаар дамжуулан үр жимсийг\nгарган\nЭнэ хорвоо дэлхий дээр таны амьдарч байгаа\nтань\nБид бүхэнд үнэхээрийн баяр хөөрийг авчирдаг\nТа бол тэр хайрыг авахын төлөө төрсөн хүн билээ\nГайхамшигт тэр хайрыг Та авч байна уу\nТа бол тэр хайрыг авахын төлөө төрсөн хүн билээ\nГайхамшигт тэр хайрыг та авч байна уу"
- Raw reconstructed fragment: "Та бол хайрыг авахын төлөө төрсөн хүн билээ\nТа өөрийн амьдралдаа тэр хайрыг амсан байна уу\nТа бол хайрыг авахын төрсөн хүн билээ\nТа өөрийн амьдралдаа тэр хайрыг амсан байна уу\n\nӨнө эрт цагаас эхэлсэн Их Эзэний минь агуу хайр\n\nБидний уулзалтаар дамжуулан үр жимсийг\nгарган"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: `src/data/loth/prayers/hymns/86.rich.json#/hymnRich`

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=269 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-012 — `src/data/loth/prayers/commons/psalter/w4-SUN-lauds.rich.json#/responsoryRich/blocks/0/spans/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 413; physical 207 right
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=19
- Data: "Тэнгэрбурхан минь, бид Таны нэрээр дуудан Танд талархал өргөж байна."
- Raw reconstructed fragment: "Тэнгэрбурхан минь, Та бидний төлөө өршөөл\n\nнигүүлслийн хаалгыг нээсэн тул\n\n- Амьдралын замаасаа хэзээ ч хазайхгүй\n\nамьдарцгаая.\nБиднийг Таны хайртай Хүүгийн тань амилалтыг\nтэмдэглэхдээ\n- Энэ өдрийг баярлан өнгөрүүлэхэд Та тусална\nу"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: none identified

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=19 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-013 — `src/data/loth/prayers/commons/psalter/w4-SUN-lauds.rich.json#/responsoryRich/blocks/4/spans/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 413; physical 207 right
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=19
- Data: "Тэнгэрбурхан минь, бид Таны нэрээр дуудан Танд талархал өргөж байна."
- Raw reconstructed fragment: "Тэнгэрбурхан минь, Та бидний төлөө өршөөл\n\nнигүүлслийн хаалгыг нээсэн тул\n\n- Амьдралын замаасаа хэзээ ч хазайхгүй\n\nамьдарцгаая.\nБиднийг Таны хайртай Хүүгийн тань амилалтыг\nтэмдэглэхдээ\n- Энэ өдрийг баярлан өнгөрүүлэхэд Та тусална\nу"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: none identified

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=19 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-014 — `src/data/loth/prayers/commons/psalter/w4-SUN-lauds.rich.json#/shortReadingRich/blocks/0/spans/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 412; physical 207 left
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=166
- Data: "Сайнмэдээний дагуу, Давидын үр сад болох үхэгсдээс амилуулагдсан Есүс Христийг сана. Энэ бол итгэмжит үг. Хэрэв бид Түүнтэй хамт үхсэн бол Түүнтэй хамт мөн амьдарна. Хэрэв бид тэвчвэл Түүнтэй хамт мөн хаанчилна. Хэрэв бид Түүнийг үгүйсгэвэл Тэр ч бас биднийг үгүйсгэнэ. Бид итгэмжгүй байлаа ч, Тэр итгэмжит хэвээр байна. Учир нь Тэр Өөрийгөө үгүйсгэж үл чадна."
- Raw reconstructed fragment: "Сайнмэдээний дагуу, Давидын үр сад болох\n\nүхэгсдээс амилуулагдсан Есүс Христийг сана.\n\nЭнэ бол итгэмжит үг.\n\nХэрэв бид Түүнтэй хамт үхсэн бол\n\n   Түүнтэй хамт мөн амьдарна.\n                                                  Та\nХэрэв бид тэвчвэл\n\n   Түүнтэй хамт мөн хаанчилна.\n\nХэрэв бид Түүнийг үгүйсгэвэл\n\n   Тэр ч бас биднийг үгүйсгэнэ.\n\nБид итгэмжгүй байлаа ч,\n\n   Тэр итгэмжит хэвээр байна.\n\n       Учир нь Тэр Өөрийгөө үгүйсгэж үл чадна.\n\nХариу залбирал\nТэнгэрбурхан минь, бид Таны нэрээр дуудан\nТанд талархал өргө…"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: none identified

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=166 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-015 — `src/data/loth/prayers/commons/psalter/w4-THU-lauds.rich.json#/responsoryRich/blocks/3/spans/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 479; physical 240 right
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=21
- Data: "Эцэг, Хүү, Ариун Сүнсийг магтан дуулъя."
- Raw reconstructed fragment: "Эцэг, Хүү, Ариун Сүнсэнд жавхланг\nЭхэн цагт байсан мэт аливаа цагт болготугай.\nАмэн. Аллэлуяа!\nДөчин хоногийн цаг улиралд “Аллэлуяа” хэмээн\nхэлэхгүй."
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: none identified

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=21 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-016 — `src/data/loth/prayers/commons/psalter/w4-THU-vespers.rich.json#/responsoryRich/blocks/3/spans/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 486; physical 244 left
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=21
- Data: "Эцэг, Хүү, Ариун Сүнсийг магтан дуулъя."
- Raw reconstructed fragment: "Эцэг, Хүү, Ариун Сүнсэнд жавхланг\n                                                - Эхэн цагт байсан мэт аливаа цагт болготугай.\n                                                Амэн. Аллэлуяа!\n                                                Дөчин хоногийн цаг улиралд “Аллэлуяа” хэмээн\n                                                хэлэхгүй.\n                                                Магтуу: х. 878-879. Жирийн цаг улирлаас гадна:"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: none identified

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=21 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-017 — `src/data/loth/prayers/hymns/121.rich.json#/hymnRich/blocks/0/lines/2/spans/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 961; physical 481 right
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=16
- Data: "Ард түмнүүд ээ, Аллэлуяа"
- Raw reconstructed fragment: "Ард түмнүүд ээ, Aллэлуяа\n\nLaudate Dominum\n\nLaudate Dominum\n\nOmnes Gentes alleluia\n\n       122. Эзэнийг магтан хүндэтгэн\n\nЭзэнийг магтан хүндэтгэн\n\nМиний хэлэхийг хүсэж буй үг нь Би Танд хайртай"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: `src/data/loth/ordinarium/hymns.json#/121/text`

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=16 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-018 — `src/data/loth/prayers/hymns/51.rich.json#/hymnRich/blocks/0/lines/1/spans/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 922; physical 462 left
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=22
- Data: "Намайг тослооч өөрийн хүч чадлаараа"
- Raw reconstructed fragment: "Намайг тослооч өөрийн xүч чадлаараа\nСүнсийг минь xооллогч ариун сүнсэнд\n\nби xайртай\n\nӨдөр бүр Таны xайранд өсдөг\n\nЗүрxэнд тань xүрэх юмсан\nАмьдралыг минь атгаач Та\n\nНадтай улам ойр байгаач\n\nХүч чадлыг"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: `src/data/loth/ordinarium/hymns.json#/51/text`

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=22 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-019 — `src/data/loth/prayers/hymns/51.rich.json#/hymnRich/blocks/0/lines/11/spans/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 922; physical 462 left
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=19
- Data: "Сүнсээр ба үнэнээр хүндэлье Таныг"
- Raw reconstructed fragment: "Сүнсээр ба үнэнээр xүндэлье Tаныг\n\n             52. Итгэмжтэйгээр\n\nИтгэмжтэйгээр үнэн зүрхээр\n\nАриун замаар хөтлөн дагуулаач"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: `src/data/loth/ordinarium/hymns.json#/51/text`

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=19 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-020 — `src/data/loth/prayers/hymns/51.rich.json#/hymnRich/blocks/0/lines/2/spans/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 922; physical 462 left
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=13
- Data: "Сүнсийг минь хооллогч ариун сүнсэнд"
- Raw reconstructed fragment: "Сүнсийг минь xооллогч ариун сүнсэнд\n\nби xайртай\n\nӨдөр бүр Таны xайранд өсдөг\n\nЗүрxэнд тань xүрэх юмсан\nАмьдралыг минь атгаач Та\n\nНадтай улам ойр байгаач\n\nХүч чадлыг тань мэдрэхсэн\n\nЮутай ч зүйрлэшгүй о"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: `src/data/loth/ordinarium/hymns.json#/51/text`

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=13 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-021 — `src/data/loth/prayers/hymns/51.rich.json#/hymnRich/blocks/0/lines/4/spans/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 922; physical 462 left
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=14
- Data: "Өдөр бүр Таны хайранд өсдөг"
- Raw reconstructed fragment: "Өдөр бүр Таны xайранд өсдөг\n\nЗүрxэнд тань xүрэх юмсан\nАмьдралыг минь атгаач Та\n\nНадтай улам ойр байгаач\n\nХүч чадлыг тань мэдрэхсэн\n\nЮутай ч зүйрлэшгүй оршихуйд\n\nТаньтайгаа учран уулзахсан\n\nСүнс"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: `src/data/loth/ordinarium/hymns.json#/51/text`

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=14 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-022 — `src/data/loth/prayers/hymns/67.rich.json#/hymnRich/blocks/2/lines/0/spans/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 929; physical 465 right
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=39
- Data: "1. Миний төлөө бартаат замыг туулсан тэр л хөл"
- Raw reconstructed fragment: "1. Миний төлөө бартаат замыг туулсан тэp л хөл\n\nАлхам тутамд агуу хайраа сийлэн үлдээжээ\n\nДахилт: Надад байгаа анхилуун тосоо Эзэнд авч\n\nирээд\nТүүний ариун хөл дээр үнсээд тосоо түрхлээ\n\n2. Миний төлөө загалмай"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: `src/data/loth/ordinarium/hymns.json#/67/text`

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=39 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-023 — `src/data/loth/prayers/seasonal/advent/w1-SUN-lauds.rich.json#/intercessionsRich/blocks/5/lines/0/spans/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 552; physical 277 left
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=53
- Data: "Та эдгээр өдрүүдэд биднийг ариун байдал дотор алхуулж,"
- Raw reconstructed fragment: "Та эдгээр өдрүүдэд биднийг ариун байдал дотор\nалхуулж.\n\n- Зөвт бөгөөд сүсэг бишрэлтэй амьдралаар энэ\n\nдэлхийд амьдруулна уу.\n\nБид Эзэн Есүс Христээр хувцаслаж\n\n- Ариун Сүнсээр дүүрэх болтугай.\nЭзэн, Таны Хүү бүх сүр жа"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: none identified

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=53 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-024 — `src/data/loth/prayers/seasonal/advent/wdec24-SUN-lauds.rich.json#/concludingPrayerRich/blocks/0/spans/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 582; physical 292 left
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=84
- Data: "Аяа, Эзэн Есүс ээ, хоцролгүй ирэгтүн. Таны хайранд итгэдэг хүмүүст шинэ эр зоригийг хайрлана уу. Та Өөрийн ирэлтээрээ биднийг хаанчлалынхаа баяр баясгаланд хүргэнэ үү. Тэнд Та Тэнгэр Эцэгтэй болон Ариун Сүнсний нэгдэлтэй, үүрд мөнх оршин хаанчилдаг Тэнгэрбурхан билээ."
- Raw reconstructed fragment: "Аяа, Эзэн Есүс ээ, хоцролгүй ирэгтүн. Таны\nхайранд итгэдэг хүмүүст шинэ эр зоригийг     Дууллын залбирал\nхайрлана уу. Та Өөрийн ирэлтээрээ биднийг\nхаанчлалынхаа баяр баясгаланд хүргэнэ үү.\nТэнд Та Тэнгэр Эцэгтэй болон Ариун Сүнсний\nнэгдэлтэй, үүрд мөнх оршин хаанчилдаг\nТэнгэрбурхан билээ.\n                                                ЭЗЭНий нэрийг\n                                                Эдүгээгээс өнө\n                                                ЭЗЭНий нэр маг\n                                         …"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: none identified

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=84 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-025 — `src/data/loth/prayers/seasonal/christmas/wbaptism-SUN-lauds.rich.json#/alternativeConcludingPrayerRich/blocks/0/spans/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 617; physical 309 right
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=211
- Data: "Аяа, тэнгэр дэх Эцэг минь, Иордан голын дээрээс өгүүлсэн дуу хоолойгоор Христийг Өөрийн Хүүгээ хэмээн илчилсэн билээ. Христийн хүүгийн мөн чанарт хамаг хуваалцагчид хүн төрөлхтөнд үйлчлэх Түүний замаар даган явж, дэлхийн хязгаар хүртэл Түүний хаанчлалын цог жавхланг тусгах болтугай."
- Raw reconstructed fragment: "Аяа, тэнгэр дэх Эцэг минь, Иордан голын дээрээс\nөгүүлсэн дуу хоолойгоор Христийг Өөрийн\nХүүгээ хэмээн илчилсэн билээ. Христийн\nхүүгийн мөн чанарт хамаг хуваалцагчид хүн\nтөрөлхтөнд үйлчлэх Түүний замаар даган явж.\nдэлхийн хязгаар хүртэл Түүний хаанчлалын цог\nжавхланг тусгах болтугай.\n\nТэрээр үүрд мөнх оршин хаанчилдаг билээ.\n\n      2 дугаар Оройн даатгал залбирал\nМариагийн магтаал\nШад магтаал Христ Есүс биднийг хайрласан\nбөгөөд Өөрийнхөө цусаар бид"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: none identified

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=211 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-026 — `src/data/loth/prayers/seasonal/easter/w1-SUN-lauds.rich.json#/intercessionsRich/blocks/7/lines/1/spans/1/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 704; physical 353 left
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=73
- Data: "Хүний дур сэтгэлийг татах даллах гэм нүглийн хүчид биднийгээ бүү орхиоч."
- Raw reconstructed fragment: "- Хүний дур сэтгэлийг татах даллах гэм нүглийн\nхүчид биднийгээ бүү орхиоч:\nХристтэй хамт Тэнгэрбурханд нууцлагдсан\nбидний амь дэлхийн өмнө гэрэлтэх болтугай.\n- Мөн шинэ тэнгэр, шинэ газрыг зөгнөх болтугай."
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: none identified

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=73 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-027 — `src/data/loth/prayers/seasonal/easter/wpentecost-SUN-vespers.rich.json#/shortReadingRich/blocks/0/spans/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 736; physical 369 left
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=433
- Data: "Хэрэв Тэнгэрбурханы Сүнс үнэхээр та нарын дотор оршиж байвал, та нар махбод дотор бус, харин Сүнс дотор байна. Хэрэв хэн нэгэнд Христийн Сүнс байхгүй бол тэр Түүнийх биш. Хэрэв Христ та нарын дотор байгаа бол, нүглээс болж бие чинь үхмэл хэдий ч, зөвт байдлын улмаас Сүнс амь чинь болжээ. Мөн үхэгсдээс Есүсийг амилуулсан Нэгэний Сүнс та нарын дотор оршвоос, Христийг үхэгсдээс амилуулсан Тэрээр та нарын дотор оршдог Өөрийн Сүнсээр дамжуулан үхлийн биест чинь амь өгнө."
- Raw reconstructed fragment: "Хэрэв Тэнгэрбурханы Сүнс үнэхээр та нарын\n\nдотор оршиж байвал, та нар махбод дотор бус,\n\nхарин Сүнс дотор байна. Хэрэв хэн нэгэнд\n\nХристийн Сүнс байхгүй бол тэр Түүнийх биш.\n\nХэрэв Христ та нарын дотор байгаа бол, нүглээс\n\nболж бие чинь үхмэл хэдий ч, зөвт байдлын\n\nулмаас Сүнс амь чинь болжээ. Мөн үхэгсдээс\n\nЕсүсийг амилуулсан Нэгэний Сүнс та нарын\n\nдотор оршвоос, Христийг үхэгсдээс амилуулсан\n\nТэрээр та нарын дотор оршдог Өөрийн Сүнсээр\n                                                  шинэчлэх\nдамжуулан үхлийн б…"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: none identified

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=433 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-028 — `src/data/loth/prayers/seasonal/lent/w1-SUN-lauds.rich.json#/alternativeConcludingPrayerRich/blocks/2/spans/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 620; physical 311 left
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=30
- Data: "шорооноос хүнийг хэлбэржүүлж, амин"
- Raw reconstructed fragment: "шорооноос     хүнийг      хэлбэржүүлж, Амин\n\nамьсгалыг үлээж оруулсан боловч тэр Танаас\n\nнүүр бууруулан, гэм нүгэл үйлдсэн билээ.\nГэмших энэ цаг үеэр бид Танаас өршөөлийг гуйж\nбайна. Биднийг Тан руу болон"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: none identified

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=30 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-029 — `src/data/loth/prayers/seasonal/lent/w1-SUN-vespers.rich.json#/alternativeConcludingPrayerRich/blocks/2/spans/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 620; physical 311 left
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=30
- Data: "шорооноос хүнийг хэлбэржүүлж, амин"
- Raw reconstructed fragment: "шорооноос     хүнийг      хэлбэржүүлж, Амин\n\nамьсгалыг үлээж оруулсан боловч тэр Танаас\n\nнүүр бууруулан, гэм нүгэл үйлдсэн билээ.\nГэмших энэ цаг үеэр бид Танаас өршөөлийг гуйж\nбайна. Биднийг Тан руу болон"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: none identified

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=30 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-030 — `src/data/loth/prayers/seasonal/lent/w1-THU-lauds.rich.json#/intercessionsRich/blocks/0/spans/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 640; physical 321 left
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=166
- Data: "Христ бидний Эзэн биднийг үхлийн харанхуйд биш, харин Өөрийнхөө гэрэлд алхуулахын тулд дэлхий ертөнцийн гэрэл болж бидний дунд ирсэн билээ. Түүнийг алдаршуулан Түүнд ийн хандан залбирцгаая:"
- Raw reconstructed fragment: "Христ бидний Эзэн биднийг үхлийн харанхуйд\n\nбиш, харин Өөрийнхөө гэрэлд алхуулахын тулд\n\nдэлхий ертөнцийн гэрэл болж бидний дунд ирсэн\n\nбилээ. Түүнийг алдаршуулан Түүнд мйн хандан"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: none identified

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=166 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-031 — `src/data/loth/prayers/seasonal/lent/w1-THU-lauds.rich.json#/shortReadingRich/blocks/0/spans/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 639; physical 320 right
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=81
- Data: "Тэд бол Таны ард түмэн ба Египет буюу төмөр хайлуулдаг зуухны дотроос Таны гаргаж авсан өв тань билээ. Ингэснээрээ Таныг дуудах бүрд нь Та сонсож, боолынхоо ба ард түмэн Израилийнхаа гуйлт бүхэнд Таны мэлмий тусах болно. Та өвөг дээдсийг минь Египетээс удирдан гаргахдаа Өөрийн боол Мосегээр дамжуулан хэлсэнчлэн израильчуудыг Өөрийн өв болгон, дэлхийн бүх ард түмнээс тусгаарласан шүү дээ."
- Raw reconstructed fragment: "Тэд бол Таны ард түмэн ба Египет буюу\nтөмөр хайлуулдаг зуухны дотроос Таны гаргаж"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: none identified

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=81 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-032 — `src/data/loth/prayers/seasonal/lent/w1-TUE-lauds.rich.json#/shortReadingRich/blocks/0/spans/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 630; physical 316 left
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=137
- Data: "ЭЗЭН тунхаглаж байна. Одоо гэлтгүй мацаг, уйлаан, гашуудал дор Над руу зүрхээрээ эргэгтүн! Та нар хувцсаа биш, харин зүрхээ урж тасчигтун. Тэнгэрбурхан ЭЗЭНдээ эргэгтүн. Учир нь Тэрээр нигүүлсэнгүй, өршөөнгүй, Уурлахдаа удаан, хайр энэрлээр бялхам, Шийтгэхдээ зөөлөрдөг."
- Raw reconstructed fragment: "ЭЗЭН тунхаглаж байна.\nОдоо гэлтгүй мацаг, уйлаан, гашуудал дор\n    Над руу зүрхээрээ эргэгтүн!\nТа нар хувцсаа биш, харин зүрхээ урж тасчигтун”\n    Тэнгэрбурхан ЭЗЭНдээ эргэгтүн.\nУчир нь Тэрээр нигүүлсэнгүй, өршөөнгүй,\n    Уурлахдаа удаан, хайр энэрлээр бялхам,\n    Шийтгэхдээ зөөлөрдөг.\n\nХариу залбирал\nТэнгэрбурхан Өөрөө намайг анчны урхинаас"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: none identified

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=137 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-033 — `src/data/loth/prayers/seasonal/lent/w1-WED-lauds.rich.json#/intercessionsRich/blocks/0/spans/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 636; physical 319 left
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=175
- Data: "Бүх зүйлсийг бий болгох цагт хүн төрөлхтнийг Өөрийн дотор шинэ бүтээл болгохыг зарлигласан авралыг хайрлагч Тэнгэрбурхан ерөөлтэй еэ! Агуу их итгэлтэйгээр Түүнээс ийн гуйцгаая:"
- Raw reconstructed fragment: "Бүх зүйлсийг бий болгох цагт хүн төрөлхтнийг\nӨөрийн дотор шинэ бүтээл болгохыг зарлигласан\nавралыг хайрлагч Тэнгэрбурхан ерөөлтэй еэ!\nАгуу их итгэлтэйгээр Түүнээс ийн гуйцгаая.\n   Эзэн, биднийг Сүнсэн дотроо шинэчилнэ үү.\nЭзэн, Та шинэ тэнгэр, шинэ дэлхийг амласан\nтул Сүнсээрээ дамжуулан биднийг өдөр бүр\nшинэчилнэ үү.\n- Ингэснээр бид тэн"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: none identified

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=175 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-034 — `src/data/loth/prayers/seasonal/lent/w1-WED-vespers.rich.json#/intercessionsRich/blocks/0/spans/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 638; physical 320 left
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=249
- Data: "Эцэгийн хувьд биднийг дээрээс харж, сахин хамгаалдаг төгс хүчит Тэнгэрбурхан ерөөлтэй еэ! Тэр бидний бүх хэрэгцээг мэддэг атлаа эхлээд биднийг Өөрийн хаанчлалыг хайгаасай хэмээн бид нараас хүсдэг. Түүний ард түмний хувьд Түүнээс ийн гуйн залбирцгаая:"
- Raw reconstructed fragment: "Эцэгийн хувьд биднийг дээрээс харж, сахин\nхамгаалдаг төгс хүчит Тэнгэрбурхан ерөөлтэй\n\nеэ! Тэр бидний бүх хэрэгцээг мэддэг атлаа эхлээд\nбиднийг Өөрийн хаанчлалыг хайгаасай хэмээн\nбид нараас хүсдэг. Түүний ард түмний хувьд\nТүүнээс ийн гуйн залбирцгаая.\n    Таны хаанчлал орших болтугай, Тиймээс\nшударга ёс хаанчлах болно.\nБүх ариун гэгээн байдлын Эцэг минь, Та бидэнд\nХристийг бидний сүнсний хоньчин болгон өгсөн\n\nтул"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: none identified

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=249 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-035 — `src/data/loth/prayers/seasonal/ordinary-time/w13-SUN-vespers.rich.json#/alternativeConcludingPrayerRich/blocks/0/spans/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 775; physical 388 right
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=145
- Data: "Аяа, тэнгэр дэх Эцэг минь, Есүсийн гэрэл гэм нүглийн болон өшөө хорслын харанхуйг хөөн саринуулсан билээ. Энэхүү гэрэлд амьдрахаар дуудагдсан бид Таны тэнгэрлэг удирдлагыг гуйн залбирч байна. Өөрийнхөө үнэн дотроо бидний"
- Raw reconstructed fragment: "Аяа, тэнгэр дэх Эцэг минь, Есүсийн гэрэл гэм\nнүглийн болон өшөө хорслын харанхуйг хөөн\nсаринуулсан билээ. Энэхүү гэрэлд амьдрахаар\nдуудагдсан бид.Таны тэнгэрлэг удирдлагыг гуйн\nзалбирч байна. Өөрийнхөө үнэн дотроо бидний"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: none identified

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=145 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-036 — `src/data/loth/prayers/seasonal/ordinary-time/w23-SUN-lauds.rich.json#/concludingPrayerRich/blocks/2/spans/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 795; physical 398 right
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=115
- Data: "цагаатгасан бөгөөд Христ дотор Өөрийн охид хөвгүүд болгосон тул биднийг сахин харж, үнэн жинхэнэ эрх чөлөөг хайрлаж, биднийг амласан газартаа аваачна уу. Тантай, Ариун Сүнсний нэгдэлтэй, үүрд мөнх оршин хаанчилдаг Тэнгэрбурхан Есүс Христ бидний Эзэн, Таны Хүүгээр уламжлан тийн болтугай."
- Raw reconstructed fragment: "цагаатгасан бөгөөд Христ дотор Өөрийн охид\nхөвгүүд болгосон тул биднийг сахин харж, үнэн\nжинхэнэ эрх чөлөөг хайрлаж. биднийг амласан\nгазартаа аваачна уу.\nТантай, Ариун Сүнсний нэгдэлтэй, үүрд мөнх\nоршин хаанчилдаг Тэнгэрбурхан Есүс Христ\nбидний Эзэн, Таны Хүүгээр уламжлан тийн\nболтугай.\n              Сонголтот залбирал\nАяа, Тэнгэрбурхан Эзэн минь, Таны дотор хайр\nэнэрэл болон үнэн хамтдаа уулзжээ. Зүйрлэшгүй\nих хайраар Та биднийг үхлээс аварсан бөгөөд\nамьдр"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: none identified

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=115 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-037 — `src/data/loth/prayers/seasonal/ordinary-time/w23-SUN-vespers.rich.json#/concludingPrayerRich/blocks/2/spans/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 795; physical 398 right
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=115
- Data: "цагаатгасан бөгөөд Христ дотор Өөрийн охид хөвгүүд болгосон тул биднийг сахин харж, үнэн жинхэнэ эрх чөлөөг хайрлаж, биднийг амласан газартаа аваачна уу. Тантай, Ариун Сүнсний нэгдэлтэй, үүрд мөнх оршин хаанчилдаг Тэнгэрбурхан Есүс Христ бидний Эзэн, Таны Хүүгээр уламжлан тийн болтугай."
- Raw reconstructed fragment: "цагаатгасан бөгөөд Христ дотор Өөрийн охид\nхөвгүүд болгосон тул биднийг сахин харж, үнэн\nжинхэнэ эрх чөлөөг хайрлаж. биднийг амласан\nгазартаа аваачна уу.\nТантай, Ариун Сүнсний нэгдэлтэй, үүрд мөнх\nоршин хаанчилдаг Тэнгэрбурхан Есүс Христ\nбидний Эзэн, Таны Хүүгээр уламжлан тийн\nболтугай.\n              Сонголтот залбирал\nАяа, Тэнгэрбурхан Эзэн минь, Таны дотор хайр\nэнэрэл болон үнэн хамтдаа уулзжээ. Зүйрлэшгүй\nих хайраар Та биднийг үхлээс аварсан бөгөөд\nамьдр"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: none identified

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=115 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-038 — `src/data/loth/prayers/seasonal/ordinary-time/w7-SUN-lauds.rich.json#/concludingPrayerRich/blocks/0/spans/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 763; physical 382 right
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=90
- Data: "Аяа, Эцэг минь, Хүүгээрээ дамжуулан илчилсэн хайр энэрэл болон билиг ухааныг Та бидний нүдний өмнө байлгасаар байгаад, биднийг үгээрээ болон үйлдлээрээ Түүн лүгээ адил болоход тусална уу. Тэрээр Тантай, Ариун Сүнсний нэгдэлтэй, үүрд мөнх оршин хаанчилдаг цорын ганц Тэнгэрбурхан билээ."
- Raw reconstructed fragment: "Аяа, Эцэг минь, Хүүгээрээ дамжуулан илчилсэн\nхайр энэрэл болон билиг ухааныг Та бидний\nнүдинй өмнө байлгасаар байгаад, биднийг\nүгээрээ болон үйлдлээрээ Түүн лүгээ адил\nболоход тусална уу.\nТэрээр Тантай, Ариун Сүнсний нэгдэлтэй,\nүүрд мөнх оршин хаанчилдаг цорын ганц\nТэнгэрбурхан билээ.\n              Сонголтот залбирал\nАяа, төгс хүчит Тэнгэрбурхан минь, Есүс Христ\nбидний Эзэний Эцэг минь, Таны үгэнд итгэх итгэл\nбол биднийг мэргэн ухаанд хүргэх зам бөгөөд"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: none identified

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=90 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

### D-039 — `src/data/loth/prayers/seasonal/ordinary-time/w7-SUN-vespers.rich.json#/concludingPrayerRich/blocks/0/spans/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Page: book 763; physical 382 right
- Comparison tier: `prefix_alignment`
- Candidate reason: unique localized prefix; LCP=90
- Data: "Аяа, Эцэг минь, Хүүгээрээ дамжуулан илчилсэн хайр энэрэл болон билиг ухааныг Та бидний нүдний өмнө байлгасаар байгаад, биднийг үгээрээ болон үйлдлээрээ Түүн лүгээ адил болоход тусална уу. Тэрээр Тантай, Ариун Сүнсний нэгдэлтэй, үүрд мөнх оршин хаанчилдаг цорын ганц Тэнгэрбурхан билээ."
- Raw reconstructed fragment: "Аяа, Эцэг минь, Хүүгээрээ дамжуулан илчилсэн\nхайр энэрэл болон билиг ухааныг Та бидний\nнүдинй өмнө байлгасаар байгаад, биднийг\nүгээрээ болон үйлдлээрээ Түүн лүгээ адил\nболоход тусална уу.\nТэрээр Тантай, Ариун Сүнсний нэгдэлтэй,\nүүрд мөнх оршин хаанчилдаг цорын ганц\nТэнгэрбурхан билээ.\n              Сонголтот залбирал\nАяа, төгс хүчит Тэнгэрбурхан минь, Есүс Христ\nбидний Эзэний Эцэг минь, Таны үгэнд итгэх итгэл\nбол биднийг мэргэн ухаанд хүргэх зам бөгөөд"
- Omitted-tail signal: ""
- Next visual line: ""
- Twin addresses: none identified

Nine-gate adjudication: gates 1–2 (identity and reconstructed visual order) are evidenced above. Gates 3 and 6 FAIL: unique localized prefix; LCP=90 ends before the stored value ends, so contrary source content appears before any possible cut. Gate 7 exact address+hash KEEP lookup missed. The row is therefore terminal `REVIEW_DIVERGENCE`, not `CLEAR_TRUNCATION`; twin/fix gates are inapplicable and no fix is authorized.

## Other terminal review closures

These rows did not reach the truncation-signature gates because unique source-unit localization was not proven. Their complete literal values, hashes, anchors, and machine-readable rationales remain in `shard-D-results.jsonl`.

### `REVIEW_GEOMETRY`

| Address | Page | Rationale |
|---|---:|---|
| `src/data/loth/ordinarium/common-prayers.json#/dismissal/individual/versicle` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/common-prayers.json#/dismissal/priest/blessing/text` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/common-prayers.json#/dismissal/priest/dismissalVersicle/response` | — | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/ordinarium/common-prayers.json#/dismissal/priest/dismissalVersicle/versicle` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/common-prayers.json#/dismissal/priest/greeting/response` | — | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/ordinarium/common-prayers.json#/dismissal/priest/greeting/versicle` | — | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/ordinarium/common-prayers.json#/openingVersicle/gloryBe` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/common-prayers.json#/openingVersicle/response` | — | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/ordinarium/common-prayers.json#/openingVersicle/versicle` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/common-prayers.json#/ourFather/text` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/hymns-index.json#/hymns/118/title` | 960 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/ordinarium/hymns.json#/119/title` | 960 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/advent/dec17_23` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/advent/dec24` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/advent/default` | — | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/christmas/afterEpiphany` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/christmas/baptismOfTheLord` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/christmas/default` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/christmas/holyFamily` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/christmas/jan1` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/easter/ascension` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/easter/beforePentecost` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/easter/default` | — | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/easter/pentecost` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/feasts/allSaints` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/feasts/allSouls` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/feasts/annunciation` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/feasts/assumption` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/feasts/birthJohnBaptist` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/feasts/corpusChristi` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/feasts/exaltationOfCross` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/feasts/immaculateConception` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/feasts/peterAndPaul` | — | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/feasts/presentation` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/feasts/sacredHeart` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/feasts/saturdayBVM` | — | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/feasts/stJoseph` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/feasts/transfiguration` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/lent/default` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/lent/goodFriday` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/lent/holySaturday` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/lent/holyWeek` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/ordinaryTime/even/FRI` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/ordinaryTime/even/MON` | — | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/ordinaryTime/even/SAT` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/ordinaryTime/even/SUN` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/ordinaryTime/even/THU` | — | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/ordinaryTime/even/TUE` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/ordinaryTime/even/WED` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/ordinaryTime/odd/FRI` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/ordinaryTime/odd/MON` | — | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/ordinaryTime/odd/SAT` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/ordinaryTime/odd/SUN` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/ordinaryTime/odd/THU` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/ordinaryTime/odd/TUE` | — | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/ordinarium/invitatory-antiphons.json#/ordinaryTime/odd/WED` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory.json#/doxology` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory.json#/gloryBe/shortText` | — | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/ordinarium/invitatory.json#/gloryBe/text` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/ordinarium/invitatory.json#/openingVersicle/response` | — | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/ordinarium/invitatory.json#/openingVersicle/versicle` | — | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/ordinarium/invitatory.json#/rubric` | — | no page hint and no unique value-plus-second-anchor location |
| `src/data/loth/prayers/commons/psalter/w2-MON-lauds.rich.json#/responsoryRich/blocks/1/spans/0/text` | 201 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w2-SAT-vespers.rich.json#/responsoryRich/blocks/1/spans/0/text` | 172 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w2-SAT-vespers.rich.json#/responsoryRich/blocks/2/spans/0/text` | 172 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w2-WED-lauds.rich.json#/responsoryRich/blocks/0/spans/0/text` | 235 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w2-WED-lauds.rich.json#/responsoryRich/blocks/1/spans/0/text` | 235 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w2-WED-lauds.rich.json#/responsoryRich/blocks/3/spans/0/text` | 235 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w2-WED-lauds.rich.json#/responsoryRich/blocks/4/spans/0/text` | 235 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w2-WED-vespers.rich.json#/responsoryRich/blocks/1/spans/0/text` | 243 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w2-WED-vespers.rich.json#/responsoryRich/blocks/2/spans/0/text` | 243 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w2-WED-vespers.rich.json#/responsoryRich/blocks/3/spans/0/text` | 243 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w3-FRI-vespers.rich.json#/responsoryRich/blocks/1/spans/0/text` | 388 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w3-FRI-vespers.rich.json#/responsoryRich/blocks/3/spans/0/text` | 388 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w4-FRI-lauds.rich.json#/responsoryRich/blocks/3/spans/0/text` | 498 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w4-FRI-vespers.rich.json#/responsoryRich/blocks/3/spans/0/text` | 505 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w4-MON-lauds.rich.json#/responsoryRich/blocks/1/spans/0/text` | 431 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w4-MON-lauds.rich.json#/responsoryRich/blocks/2/spans/0/text` | 431 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w4-MON-lauds.rich.json#/responsoryRich/blocks/3/spans/0/text` | 431 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w4-SAT-lauds.rich.json#/responsoryRich/blocks/2/spans/0/text` | 519 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w4-SAT-vespers.rich.json#/responsoryRich/blocks/0/spans/0/text` | 404 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w4-SAT-vespers.rich.json#/responsoryRich/blocks/1/spans/0/text` | 404 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w4-SAT-vespers.rich.json#/responsoryRich/blocks/2/spans/0/text` | 404 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w4-SAT-vespers.rich.json#/responsoryRich/blocks/3/spans/0/text` | 404 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w4-SAT-vespers.rich.json#/responsoryRich/blocks/4/spans/0/text` | 404 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w4-SUN-lauds.rich.json#/responsoryRich/blocks/1/spans/0/text` | 413 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w4-SUN-lauds.rich.json#/responsoryRich/blocks/2/spans/0/text` | 413 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w4-SUN-lauds.rich.json#/responsoryRich/blocks/3/spans/0/text` | 413 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w4-THU-lauds.rich.json#/responsoryRich/blocks/0/spans/0/text` | 479 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w4-THU-lauds.rich.json#/responsoryRich/blocks/1/spans/0/text` | 479 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w4-THU-lauds.rich.json#/responsoryRich/blocks/2/spans/0/text` | 479 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w4-THU-lauds.rich.json#/responsoryRich/blocks/4/spans/0/text` | 479 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w4-THU-vespers.rich.json#/responsoryRich/blocks/0/spans/0/text` | 486 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w4-THU-vespers.rich.json#/responsoryRich/blocks/2/spans/0/text` | 486 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w4-THU-vespers.rich.json#/responsoryRich/blocks/4/spans/0/text` | 486 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w4-TUE-vespers.rich.json#/responsoryRich/blocks/1/spans/0/text` | 454 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w4-TUE-vespers.rich.json#/responsoryRich/blocks/3/spans/0/text` | 454 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w4-WED-vespers.rich.json#/responsoryRich/blocks/1/spans/0/text` | 470 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w4-WED-vespers.rich.json#/responsoryRich/blocks/2/spans/0/text` | 470 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/commons/psalter/w4-WED-vespers.rich.json#/responsoryRich/blocks/3/spans/0/text` | 470 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/hymns/51.rich.json#/hymnRich/blocks/0/lines/3/spans/0/text` | 922 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/seasonal/advent/w1-FRI-vespers.rich.json#/responsoryRich/blocks/2/spans/0/text` | 557 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/seasonal/advent/w1-MON-vespers.rich.json#/responsoryRich/blocks/2/spans/0/text` | 557 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/seasonal/advent/w1-THU-vespers.rich.json#/responsoryRich/blocks/2/spans/0/text` | 557 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/seasonal/advent/w1-TUE-vespers.rich.json#/responsoryRich/blocks/2/spans/0/text` | 557 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/seasonal/advent/w1-WED-vespers.rich.json#/responsoryRich/blocks/2/spans/0/text` | 557 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/seasonal/lent/w6-SAT-vespers.rich.json#/intercessionsRich/blocks/7/lines/1/spans/1/text` | 669 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/seasonal/ordinary-time/w12-SUN-lauds.rich.json#/concludingPrayerRich/blocks/0/spans/0/text` | 773 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/seasonal/ordinary-time/w12-SUN-lauds.rich.json#/concludingPrayerRich/blocks/2/spans/0/text` | 773 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/seasonal/ordinary-time/w12-SUN-vespers.rich.json#/concludingPrayerRich/blocks/0/spans/0/text` | 773 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/seasonal/ordinary-time/w12-SUN-vespers.rich.json#/concludingPrayerRich/blocks/2/spans/0/text` | 773 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/seasonal/ordinary-time/w32-SUN-lauds.rich.json#/concludingPrayerRich/blocks/0/spans/0/text` | 813 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/seasonal/ordinary-time/w32-SUN-lauds.rich.json#/concludingPrayerRich/blocks/2/spans/0/text` | 813 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/seasonal/ordinary-time/w32-SUN-vespers.rich.json#/concludingPrayerRich/blocks/0/spans/0/text` | 813 | literal occurs in raw text SoT; geometry identity remains unresolved |
| `src/data/loth/prayers/seasonal/ordinary-time/w32-SUN-vespers.rich.json#/concludingPrayerRich/blocks/2/spans/0/text` | 813 | literal occurs in raw text SoT; geometry identity remains unresolved |

### `SOURCE_NOT_FOUND`

| Address | Book page | Rationale |
|---|---:|---|
| `src/data/loth/ordinarium/canticles.json#/benedictus/title` | 34 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/ordinarium/canticles.json#/magnificat/doxology` | 40 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/ordinarium/canticles.json#/magnificat/title` | 40 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/ordinarium/canticles.json#/nuncDimittis/title` | 515 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/ordinarium/compline.json#/anteMarian/alternatives/1/lines/0` | 545 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/ordinarium/compline.json#/anteMarian/alternatives/1/text` | 545 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/ordinarium/compline.json#/anteMarian/alternatives/1/title` | 545 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/ordinarium/hymns.json#/67/text` | 929 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/commons/psalter/w2-SAT-vespers.rich.json#/responsoryRich/blocks/0/spans/0/text` | 172 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/commons/psalter/w2-SAT-vespers.rich.json#/responsoryRich/blocks/4/spans/0/text` | 172 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/commons/psalter/w2-WED-lauds.rich.json#/responsoryRich/blocks/2/spans/0/text` | 235 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/commons/psalter/w2-WED-vespers.rich.json#/responsoryRich/blocks/0/spans/0/text` | 243 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/commons/psalter/w2-WED-vespers.rich.json#/responsoryRich/blocks/4/spans/0/text` | 243 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/commons/psalter/w3-FRI-vespers.rich.json#/responsoryRich/blocks/0/spans/0/text` | 388 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/commons/psalter/w3-FRI-vespers.rich.json#/responsoryRich/blocks/2/spans/0/text` | 388 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/commons/psalter/w3-FRI-vespers.rich.json#/responsoryRich/blocks/4/spans/0/text` | 388 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/commons/psalter/w4-FRI-lauds.rich.json#/responsoryRich/blocks/0/spans/0/text` | 498 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/commons/psalter/w4-FRI-lauds.rich.json#/responsoryRich/blocks/1/spans/0/text` | 498 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/commons/psalter/w4-FRI-lauds.rich.json#/responsoryRich/blocks/2/spans/0/text` | 498 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/commons/psalter/w4-FRI-lauds.rich.json#/responsoryRich/blocks/4/spans/0/text` | 498 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/commons/psalter/w4-FRI-vespers.rich.json#/responsoryRich/blocks/0/spans/0/text` | 505 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/commons/psalter/w4-FRI-vespers.rich.json#/responsoryRich/blocks/1/spans/0/text` | 505 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/commons/psalter/w4-FRI-vespers.rich.json#/responsoryRich/blocks/2/spans/0/text` | 505 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/commons/psalter/w4-FRI-vespers.rich.json#/responsoryRich/blocks/4/spans/0/text` | 505 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/commons/psalter/w4-MON-lauds.rich.json#/responsoryRich/blocks/0/spans/0/text` | 431 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/commons/psalter/w4-MON-lauds.rich.json#/responsoryRich/blocks/4/spans/0/text` | 431 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/commons/psalter/w4-SAT-lauds.rich.json#/responsoryRich/blocks/0/spans/0/text` | 519 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/commons/psalter/w4-SAT-lauds.rich.json#/responsoryRich/blocks/1/spans/0/text` | 519 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/commons/psalter/w4-SAT-lauds.rich.json#/responsoryRich/blocks/4/spans/0/text` | 519 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/commons/psalter/w4-THU-vespers.rich.json#/responsoryRich/blocks/1/spans/0/text` | 486 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/commons/psalter/w4-TUE-vespers.rich.json#/responsoryRich/blocks/0/spans/0/text` | 454 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/commons/psalter/w4-TUE-vespers.rich.json#/responsoryRich/blocks/2/spans/0/text` | 454 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/commons/psalter/w4-TUE-vespers.rich.json#/responsoryRich/blocks/4/spans/0/text` | 454 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/commons/psalter/w4-WED-vespers.rich.json#/responsoryRich/blocks/0/spans/0/text` | 470 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/commons/psalter/w4-WED-vespers.rich.json#/responsoryRich/blocks/4/spans/0/text` | 470 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/hymns/23.rich.json#/hymnRich/blocks/0/lines/10/spans/0/text` | 898 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/hymns/23.rich.json#/hymnRich/blocks/0/lines/11/spans/0/text` | 898 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/hymns/23.rich.json#/hymnRich/blocks/0/lines/12/spans/0/text` | 898 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/hymns/23.rich.json#/hymnRich/blocks/0/lines/5/spans/0/text` | 898 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/hymns/23.rich.json#/hymnRich/blocks/0/lines/6/spans/0/text` | 898 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/hymns/23.rich.json#/hymnRich/blocks/0/lines/7/spans/0/text` | 898 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/hymns/51.rich.json#/hymnRich/blocks/0/lines/5/spans/0/text` | 922 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/hymns/86.rich.json#/hymnRich/blocks/0/lines/11/spans/0/text` | 939 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/advent/w1-FRI-vespers.rich.json#/responsoryRich/blocks/1/spans/0/text` | 557 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/advent/w1-MON-vespers.rich.json#/responsoryRich/blocks/1/spans/0/text` | 557 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/advent/w1-THU-vespers.rich.json#/responsoryRich/blocks/1/spans/0/text` | 557 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/advent/w1-TUE-vespers.rich.json#/responsoryRich/blocks/1/spans/0/text` | 557 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/advent/w1-WED-vespers.rich.json#/responsoryRich/blocks/1/spans/0/text` | 557 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/advent/wdec24-SUN-lauds.rich.json#/intercessionsRich/blocks/7/lines/1/spans/1/text` | 581 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/advent/wdec24-SUN-lauds.rich.json#/intercessionsRich/blocks/9/lines/0/spans/0/text` | 581 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/christmas/wdec25-SUN-lauds.rich.json#/intercessionsRich/blocks/0/spans/0/text` | 589 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/christmas/wdec25-SUN-lauds.rich.json#/intercessionsRich/blocks/1/spans/0/text` | 589 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/christmas/wdec25-SUN-lauds.rich.json#/intercessionsRich/blocks/3/lines/0/spans/0/text` | 589 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/christmas/wdec25-SUN-lauds.rich.json#/intercessionsRich/blocks/3/lines/1/spans/1/text` | 589 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/christmas/wdec25-SUN-lauds.rich.json#/intercessionsRich/blocks/5/lines/0/spans/0/text` | 589 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/christmas/wdec25-SUN-lauds.rich.json#/intercessionsRich/blocks/5/lines/1/spans/1/text` | 589 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/christmas/wdec25-SUN-lauds.rich.json#/intercessionsRich/blocks/7/lines/0/spans/0/text` | 589 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/christmas/wdec25-SUN-lauds.rich.json#/intercessionsRich/blocks/7/lines/1/spans/1/text` | 589 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/christmas/wdec25-SUN-lauds.rich.json#/intercessionsRich/blocks/9/lines/0/spans/0/text` | 589 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/christmas/wdec25-SUN-lauds.rich.json#/intercessionsRich/blocks/9/lines/1/spans/1/text` | 589 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/easter/w1-THU-vespers.rich.json#/intercessionsRich/blocks/10/lines/1/spans/1/text` | 722 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/easter/w1-TUE-vespers.rich.json#/intercessionsRich/blocks/4/lines/1/spans/1/text` | 714 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/easter/w1-WED-lauds.rich.json#/intercessionsRich/blocks/7/lines/1/spans/1/text` | 716 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w1-MON-lauds.rich.json#/intercessionsRich/blocks/0/spans/0/text` | 625 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w1-MON-lauds.rich.json#/intercessionsRich/blocks/1/spans/0/text` | 625 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w1-MON-lauds.rich.json#/intercessionsRich/blocks/3/lines/0/spans/0/text` | 625 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w1-MON-lauds.rich.json#/intercessionsRich/blocks/3/lines/1/spans/1/text` | 625 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w1-MON-lauds.rich.json#/intercessionsRich/blocks/5/lines/0/spans/0/text` | 625 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w1-MON-lauds.rich.json#/intercessionsRich/blocks/5/lines/1/spans/1/text` | 625 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w1-MON-lauds.rich.json#/intercessionsRich/blocks/7/lines/0/spans/0/text` | 625 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w1-MON-lauds.rich.json#/intercessionsRich/blocks/7/lines/1/spans/1/text` | 625 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w1-MON-lauds.rich.json#/intercessionsRich/blocks/9/lines/0/spans/0/text` | 625 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w1-MON-lauds.rich.json#/intercessionsRich/blocks/9/lines/1/spans/1/text` | 625 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w1-SUN-vespers.rich.json#/intercessionsRich/blocks/9/lines/1/spans/1/text` | 619 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w1-THU-lauds.rich.json#/intercessionsRich/blocks/9/lines/1/spans/1/text` | 640 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w6-SAT-vespers.rich.json#/intercessionsRich/blocks/11/lines/0/spans/0/text` | 669 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w6-SAT-vespers.rich.json#/intercessionsRich/blocks/11/lines/1/spans/1/text` | 669 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w6-SAT-vespers.rich.json#/intercessionsRich/blocks/3/lines/0/spans/0/text` | 669 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w6-SAT-vespers.rich.json#/intercessionsRich/blocks/3/lines/1/spans/1/text` | 669 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w6-SAT-vespers.rich.json#/intercessionsRich/blocks/5/lines/0/spans/0/text` | 669 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w6-SAT-vespers.rich.json#/intercessionsRich/blocks/5/lines/1/spans/1/text` | 669 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w6-SAT-vespers.rich.json#/intercessionsRich/blocks/7/lines/0/spans/0/text` | 669 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w6-SAT-vespers.rich.json#/intercessionsRich/blocks/9/lines/0/spans/0/text` | 669 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w6-SAT-vespers.rich.json#/intercessionsRich/blocks/9/lines/1/spans/1/text` | 669 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w6-THU-vespers.rich.json#/intercessionsRich/blocks/0/spans/0/text` | 660 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w6-THU-vespers.rich.json#/intercessionsRich/blocks/1/spans/0/text` | 660 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w6-THU-vespers.rich.json#/intercessionsRich/blocks/11/lines/0/spans/0/text` | 660 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w6-THU-vespers.rich.json#/intercessionsRich/blocks/11/lines/1/spans/1/text` | 660 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w6-THU-vespers.rich.json#/intercessionsRich/blocks/3/lines/0/spans/0/text` | 660 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w6-THU-vespers.rich.json#/intercessionsRich/blocks/3/lines/1/spans/1/text` | 660 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w6-THU-vespers.rich.json#/intercessionsRich/blocks/5/lines/0/spans/0/text` | 660 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w6-THU-vespers.rich.json#/intercessionsRich/blocks/5/lines/1/spans/1/text` | 660 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w6-THU-vespers.rich.json#/intercessionsRich/blocks/7/lines/0/spans/0/text` | 660 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w6-THU-vespers.rich.json#/intercessionsRich/blocks/7/lines/1/spans/1/text` | 660 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w6-THU-vespers.rich.json#/intercessionsRich/blocks/9/lines/0/spans/0/text` | 660 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/lent/w6-THU-vespers.rich.json#/intercessionsRich/blocks/9/lines/1/spans/1/text` | 660 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/ordinary-time/w11-SUN-vespers.rich.json#/alternativeConcludingPrayerRich/blocks/2/spans/0/text` | 771 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/ordinary-time/w12-SUN-lauds.rich.json#/concludingPrayerRich/blocks/4/spans/0/text` | 773 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/ordinary-time/w12-SUN-vespers.rich.json#/alternativeConcludingPrayerRich/blocks/0/spans/0/text` | 773 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/ordinary-time/w12-SUN-vespers.rich.json#/concludingPrayerRich/blocks/4/spans/0/text` | 773 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/ordinary-time/w3-SUN-vespers.rich.json#/alternativeConcludingPrayerRich/blocks/2/spans/0/text` | 755 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/ordinary-time/w31-SUN-vespers.rich.json#/alternativeConcludingPrayerRich/blocks/2/spans/0/text` | 811 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/ordinary-time/w32-SUN-lauds.rich.json#/concludingPrayerRich/blocks/4/spans/0/text` | 813 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/ordinary-time/w32-SUN-vespers.rich.json#/alternativeConcludingPrayerRich/blocks/0/spans/0/text` | 813 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/ordinary-time/w32-SUN-vespers.rich.json#/concludingPrayerRich/blocks/4/spans/0/text` | 813 | hinted page/continued section searched; no strict or normalized source unit located |
| `src/data/loth/prayers/seasonal/ordinary-time/w7-SUN-vespers.rich.json#/alternativeConcludingPrayerRich/blocks/2/spans/0/text` | 763 | hinted page/continued section searched; no strict or normalized source unit located |

