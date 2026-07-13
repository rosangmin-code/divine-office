# Shard A — truncation sweep evidence

Geometry method: `public/psalter.pdf` glyphs clustered at ±1.5pt, split at x=297, then sorted by y within each book-page column. Raw-text substring status was not used as a verdict.

## CLEAR_TRUNCATION packets

No row passed all nine gates, so there are no CLEAR_TRUNCATION fix packets. The 12 mechanical strict-prefix signals were individually reviewed: 11 are headings/structural labels whose apparent tail is TOC numbering or neighboring prose, and one is Psalm 51 typography whose sole tail is a layout dash. Their per-address gate rejection is recorded below.

## Candidate-family adjudication

- 12 strict-prefix signals: individually rejected from CLEAR on identity, positive-tail, or boundary proof; retained as `REVIEW_DIVERGENCE` for coordinator visibility.
- 39 values occurring only inside a larger geometry unit: fail strict-prefix identity (gate 3).
- 49 anchored-prefix/whole-alignment failures: fail strict-prefix/no-contrary-content gates (3 and 6).
- 148 mixed complete/prefix occurrences: fail unique identity and visual-order localization gates (1 and 2).
- 43 source-not-found rows: fail identity gate (1); no source unit is invented.

## REVIEW and SOURCE_NOT_FOUND items

### `src/data/loth/gilh.json#/footnotes/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `17`
- Data: `Харьцуул. Үйлс 1:14, 4:24, 12:5 ба 12.; Харьцуул. бас Ефес 5:19-21.`
- Geometry visual: `1) Харьцуул. Үйлс 1:14, 4:24, 12:5 ба 12. ;`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `16 Танилцуулга Танилцуулга 17 | мөчлөгийг Тэнгэрбурханд зориулах үйл хэрэг Зүүлт тайлбар | мөн. [56] 1) Харьцуул. Үйлс 1:14, 4:24, 12:5 ба 12. ; | Харьцуул. бас Ефес 5:19-21. | 11. “Залбиралт цагийн ёслол”-ын зорилго бол 2) Харьцуул. Үйлс 2:1-15. | 30) Матай 5:44, 7:7, 26:41; Марк 13:33, 14:38;`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/gilh.json#/footnotes/1/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `17`
- Data: `Харьцуул. Үйлс 2:1-15.`
- Geometry visual: `Харьцуул. Үйлс 2:1-15.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/gilh.json#/footnotes/10/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `17`
- Data: `Харьцуул. Ром 8:15 ба 26; 1 Коринт 12:3; Галат 4:6; Иуда 20.`
- Geometry visual: `Харьцуул. Ром 8:15 ба 26; 1 Коринт 12:3; Галат 4:6; Иуда 20.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/gilh.json#/footnotes/11/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `17`
- Data: `Харьцуул. 2 Коринт 1:20; Колоссай 3:17.`
- Geometry visual: `Харьцуул. 2 Коринт 1:20; Колоссай 3:17.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/gilh.json#/footnotes/12/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `17`
- Data: `Харьцуул. Еврей 13:15.`
- Geometry visual: `Харьцуул. Еврей 13:15.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/gilh.json#/footnotes/13/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `17`
- Data: `Харьцуул. Ром 12:12; 1 Коринт 7:5; Ефес 6:18; Колоссай 4:2; 1 Тесалоник 5:17; 1 Тимот 5:5; 1 Петр 4:7.`
- Geometry visual: `Харьцуул. Ром 12:12; 1 Коринт 7:5; Ефес 6:18; Колоссай 4:2; 1 Тесалоник 5:17; 1 Тимот 5:5; 1 Петр 4:7.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/gilh.json#/footnotes/14/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `17`
- Data: `Харьцуул. 1 Тимот 4:5; Иаков 5:15; 1 Иохан 3:22, 5:14.`
- Geometry visual: `Харьцуул. 1 Тимот 4:5; Иаков 5:15; 1 Иохан 3:22, 5:14.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/gilh.json#/footnotes/15/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `17`
- Data: `Харьцуул. Ефес 5:19ff.; Еврей 13:15; Илчлэл 19:5.`
- Geometry visual: `Харьцуул. Ефес 5:19ff.; Еврей 13:15; Илчлэл 19:5.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/gilh.json#/footnotes/16/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `17`
- Data: `Харьцуул. Колоссай 3:17; Филиппой 4:6; 1 Тесалоник 5:17; 1 Тимот 2:1.`
- Geometry visual: `44) Харьцуул. Колоссай 3:17; Phil 4:6;`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `43) Харьцуул. Ефес 5:19ff.; Еврей 13:15; Илчлэл 19:5. | тогтоосон цагийн үнэн цаг үетэй холбоотой цаг | 44) Харьцуул. Колоссай 3:17; Phil 4:6; | мөчид унших нь хамгийн сайн арга юм”. [58] 1 Тесалоник 5:17; 1 Тимот 2:1. | 45) Харьцуул. Ром 8:26; Phil 4:6. | 46) Харьцуул. Ром 15:30; 1 Тимот 2:1; Ефес 6:18;`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/gilh.json#/footnotes/17/text`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Харьцуул. Ром 8:26; Филиппой 4:6.`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/gilh.json#/footnotes/18/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `17`
- Data: `Харьцуул. Ром 15:30; 1 Тимот 2:1; Ефес 6:18; 1 Тесалоник 5:25; Иаков 5:14 ба 16.`
- Geometry visual: `Харьцуул. Ром 15:30; 1 Тимот 2:1; Ефес 6:18; 1 Тесалоник 5:25; Иаков 5:14 ба 16.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/gilh.json#/footnotes/19/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `17`
- Data: `Харьцуул. 1 Тимот 2:5; Еврей 8:6, 9:15, 12:24.`
- Geometry visual: `Харьцуул. 1 Тимот 2:5; Еврей 8:6, 9:15, 12:24.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/gilh.json#/footnotes/2/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `17`
- Data: `Матай 5:44, 7:7, 26:41; Марк 13:33, 14:38; Лук 6:28, 10:2, 11:9, 22:40 ба 46.`
- Geometry visual: `Матай 5:44, 7:7, 26:41; Марк 13:33, 14:38; Лук 6:28, 10:2, 11:9, 22:40 ба 46.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/gilh.json#/footnotes/20/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `17`
- Data: `Харьцуул. Ром 5:2; Ефес 2:18, 3:12.`
- Geometry visual: `Харьцуул. Ром 5:2; Ефес 2:18, 3:12.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/gilh.json#/footnotes/21/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `17`
- Data: `Харьцуул. Лук 10:21, "Тэр мөчид Есүс Ариун Сүнс дотор хөөрөн баясаж, Аав Тандаа талархъя, тэнгэр газрын Эзэн минь!....".`
- Geometry visual: `Харьцуул. Лук 10:21, "Тэр мөчид Есүс Ариун Сүнс дотор хөөрөн баясаж, Аав Тандаа талархъя, тэнгэр газрын Эзэн минь!....".`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/gilh.json#/footnotes/22/text`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Харьцуул. Үйлс 2:42.`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/gilh.json#/footnotes/23/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `17`
- Data: `Харьцуул. Матай 6:6.`
- Geometry visual: `Харьцуул. Матай 6:6.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/gilh.json#/footnotes/24/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `17`
- Data: `Харьцуул. Ватиканы Хоёрдугаар Дээд Хуралдаан, Шашны ёслол үйлдэх талаарх Туйлын Нандин Дээд Хуралдаан (Sacrosanctum Concilium) хэмээх Ягшмал Үндсэн хууль, д. 12.`
- Geometry visual: `Харьцуул. Ватиканы Хоёрдугаар Дээд Хуралдаан, Шашны ёслол үйлдэх талаарх Туйлын Нандин Дээд Хуралдаан (Sacrosanctum Concilium) хэмээх Ягшмал Үндсэн хууль, д. 12.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/gilh.json#/footnotes/25/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `17`
- Data: `Харьцуул. Туйлын Нандин Дээд Хуралдаан (Sacrosanctum Concilium) д. 83-84.`
- Geometry visual: `Харьцуул. Туйлын Нандин Дээд Хуралдаан (Sacrosanctum Concilium) д. 83-84.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/gilh.json#/footnotes/26/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `17`
- Data: `Харьцуул. Туйлын Нандин Дээд Хуралдаан (Sacrosanctum Concilium) д. 88.`
- Geometry visual: `Харьцуул. Туйлын Нандин Дээд Хуралдаан (Sacrosanctum Concilium) д. 88.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/gilh.json#/footnotes/27/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `17`
- Data: `Харьцуул. Туйлын Нандин Дээд Хуралдаан (Sacrosanctum Concilium) д. 94.`
- Geometry visual: `56) Харьцуул. Туйлын Нандин Дээд Хуралдаан`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `Шашны ёслол үйлдэх талаарх Туйлын Нандин Дээд Хуралдаан | (Sacrosanctum Concilium) хэмээх Ягшмал Үндсэн хууль, д. 12. | 56) Харьцуул. Туйлын Нандин Дээд Хуралдаан | ( Sacrosanctum Concilium) д. 83-84. | 57) Харьцуул. Туйлын Нандин Дээд Хуралдаан | ( Sacrosanctum Concilium) д. 88.`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/gilh.json#/footnotes/3/text`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Иохан 14:13, 15:16, 16:23 ба 26.`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/gilh.json#/footnotes/4/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `17`
- Data: `Харьцуул. Матай 6:9-13; Лук 11:2-4.`
- Geometry visual: `Харьцуул. Матай 6:9-13; Лук 11:2-4.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/gilh.json#/footnotes/5/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `17`
- Data: `Харьцуул. Лук 18:1.`
- Geometry visual: `Харьцуул. Лук 18:1.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/gilh.json#/footnotes/6/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `17`
- Data: `Харьцуул. Лук 18:9-14.`
- Geometry visual: `Харьцуул. Лук 18:9-14.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/gilh.json#/footnotes/7/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `17`
- Data: `Харьцуул. Лук 21:36; Марк 13:33.`
- Geometry visual: `Харьцуул. Лук 21:36; Марк 13:33.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/gilh.json#/footnotes/8/text`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Харьцуул. Лук 11:5-13, 18:1-8; Иохан 14:13, 16:23.`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/gilh.json#/footnotes/9/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `17`
- Data: `Харьцуул. Матай 6:5-8, 23:14; Лук 20:47; Иохан 4:23.`
- Geometry visual: `Харьцуул. Матай 6:5-8, 23:14; Лук 20:47; Иохан 4:23.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/gilh.json#/sections/0/paragraphs/0`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `8`
- Data: `Ариун Сүнсний дотор Христ Эзэн Католик шашнаар дамжуулан "хүн төрөлхтнийг цагаатгах болон Тэнгэрбурханыг төгс алдаршуулах их үйлс"-ийг хэрэгжүүлсээр байдаг. Үүнийг Тэрээр Талархал-магтаалын мөргөлийг ёслон тэмдэглэх цагт мөн үндсэн ёслолыг хүртээх үед төдийгүй өөр бусад арга замаар ялангуяа "Залбиралт цагийн ёслол"-ыг хийн гүйцэтгэх үед биелүүлдэг. "Залбиралт цагийн ёслол"-ын дунд Христ Эзэн цугларсан сүсэгтнүүдийн бүлгээр, Тэнгэрбурханы Үгийн тунхаглалаар болон "Католик шашны залбирал ба магтаал"-аар дамжуулан Өөрөө байдаг.`
- Geometry visual: `Ариун Сүнсний дотор Христ Эзэн Католик`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `Өмнөтгөл үг ба магтуунуудыг нь Ариун Бичээсний хэл | яриагаар зохиосон ажээ. | Ариун Сүнсний дотор Христ Эзэн Католик | шашнаар дамжуулан “хүн төрөлхтнийг цагаатгах “Залбиралт цагийн ёслол” бол бүхэл | болон Тэнгэрбурханыг төгс алдаршуулах Шашны даатгал залбирал мөн. Түүний бүтцийг | их үйлс”-ийг хэрэгжүүлсээр байдаг. Үүнийг хялбаршуулснаараа Ватиканы хоёрдугаар`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/gilh.json#/sections/0/paragraphs/2`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `8`
- Data: `"Залбиралт цагийн ёслол"-д оролцогчид тус ёслолоор их л чухалчилсан амь хайрлагч Тэнгэрбурханы Үгээр дамжуулан туйлын дээд ариун байдалд хүрдэг. Учир нь уншлагууд нь Ариун Бичээснээс гардаг, Дууллуудын доторх Тэнгэрбурханы үгсийг оршихуйд нь дуулдаг бөгөөд гуйлтын залбирлууд, даатгал залбирлууд ба магтуунуудыг нь Ариун Бичээсний хэл яриагаар зохиосон ажээ.`
- Geometry visual: `"Залбиралт цагийн ёслол"-ыг хийн гүйцэтгэх`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `яриагаар зохиосон ажээ. | Ариун Сүнсний дотор Христ Эзэн Католик | шашнаар дамжуулан “хүн төрөлхтнийг цагаатгах “Залбиралт цагийн ёслол” бол бүхэл | болон Тэнгэрбурханыг төгс алдаршуулах Шашны даатгал залбирал мөн. Түүний бүтцийг | их үйлс”-ийг хэрэгжүүлсээр байдаг. Үүнийг хялбаршуулснаараа Ватиканы хоёрдугаар | Тэрээр Талархал-магтаалын мөргөлийг ёслон Дээд Хуралдааны Шашны ёслолын өөрчлөн`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/gilh.json#/sections/0/paragraphs/5`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `8`
- Data: `"Залбиралт цагийн ёслол"-ыг нэг л ботид багтаан нийтлүүлсэн энэхүү "Христийн шашны залбирлын хураангуй судар" дээр дурдсан зорилгыг биелүүлэхийг зорьж байна. Тус судар Өглөөний болон Оройн даатгал залбиралд зориулсан сонгодог эх бичвэрүүдийг харуулдаг бөгөөд хэмжээ нь эгэл сүсэгтнүүдийн хувьд "Залбиралт цагийн ёслол"-ыг дөрвөн ботиор бүтээсэн "Христийн шашны залбирлын дэлгэрэнгүй судар"-аас хэрэглэхэд илүү хялбархан.`
- Geometry visual: `"Залбиралт цагийн ёслол"-ыг хийн гүйцэтгэх`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `яриагаар зохиосон ажээ. | Ариун Сүнсний дотор Христ Эзэн Католик | шашнаар дамжуулан “хүн төрөлхтнийг цагаатгах “Залбиралт цагийн ёслол” бол бүхэл | болон Тэнгэрбурханыг төгс алдаршуулах Шашны даатгал залбирал мөн. Түүний бүтцийг | их үйлс”-ийг хэрэгжүүлсээр байдаг. Үүнийг хялбаршуулснаараа Ватиканы хоёрдугаар | Тэрээр Талархал-магтаалын мөргөлийг ёслон Дээд Хуралдааны Шашны ёслолын өөрчлөн`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/gilh.json#/sections/0/title`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `8`
- Data: `Өмнөтгөл үг`
- Geometry visual: `Өмнөтгөл үг`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/gilh.json#/sections/1/subsections/0/paragraphs/0`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `11`
- Data: `Тэнгэрбурханы ард түмний нийтийн болон хамтын залбирал нь Католик шашны үндсэн үүргүүдийн дотор зөвөөр байдаг гэж үздэг. Бүр анхнаасаа Ариун угаалыг хүртэгчид "элч нарын сургаал, нөхөрлөл, талх хуваалт, залбиралд өөрсдийгөө зориулдаг байлаа." (Үйлс 2:42). Христэд итгэгчдийн анхны бүлгэм санаа нэгтэйгээр залбирч байсан гэсэн бодит зүйлийн талаар Үйлс ном нэг бус удаа гэрчилж байна. [1]`
- Geometry visual: `Тэнгэрбурханы ард түмний нийтийн болон хамтын залбирал нь Католик шашны үндсэн үүргүүдийн дотор зөвөөр байдаг гэж үздэг. Бүр анхнаасаа Ариун угаалыг хүртэгчид "элч нарын сургаал, нөхөрлөл, талх хуваалт, залбиралд өөрсдийгөө зориулдаг байлаа." (Үйлс 2:42). Христэд итгэгчдийн анхны бүлгэм санаа нэгтэйгээр залбирч байсан гэсэн бодит зүйлийн талаар Үйлс ном нэг бус удаа гэрчилж байна. [1]`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/gilh.json#/sections/1/subsections/0/paragraphs/2`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `11`
- Data: `Түүхийн явцад, өөр бусад цагуудыг нийтийн болон хамтын залбирлаар дамжуулан ариусгаж байсан. Эдгээрийг Үйлс ном зөгнөсөн гэж Шашны анхны багш нар үзэж байсан. Энд Есүсийн шавь нар нь өдрийн гуравдугаар цагт хамтдаа цугларч байсан гэдгийг бид уншиж байна. [2] Элч нарын "ван" болсон Петр "зургаадугаар цагийн орчимд тэднийг хотод дөхөж очих үед залбирахаар байшингийн дээвэр дээр гарав." (10:9); "Петр, Иохан нар залбирал болдог есдүгээр цагт сүм рүү явж байв." (3:1); "Шөнө дундын үед Паул, Силас хоёр залбирч, Тэнгэрбурханд магтуу дуулж байгааг хоригдлууд сонсоцгоож байлаа." (16:25).`
- Geometry visual: `Түүхийн явцад, өөр бусад цагуудыг нийтийн`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `дуусаж, нар мандах үед анхны цаг болох гэх мэт. | шалтгаанаар “Христийн шашны залбирлын | Түүхийн явцад, өөр бусад цагуудыг нийтийн | дэлгэрэнгүй судар”-ыг уншиж чадахгүйд хүрэх | болон хамтын залбирлаар дамжуулан ариусгаж | үед лам санваартнуудад ч ач тустай бас байх`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/gilh.json#/sections/1/subsections/0/title`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `11`
- Data: `Тэнгэрбурханы ард түмний нийтийн болон хамтын залбирал`
- Geometry visual: `Тэнгэрбурханы ард түмний нийтийн болон хамтын залбирал`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/gilh.json#/sections/1/subsections/1/paragraphs/0`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `12`
- Data: `Ийм хамтын даатгал залбирал нь аяндаа цагийн горимын хэлбэртэйгээр бий болжээ. Сүнслэг уншлагуудаар баяжуулсан энэхүү "Залбиралт цагийн ёслол" буюу "Тэнгэрлэг хурал" бол голдуу магтаал ба гуйлтын даатгал залбирал юм. Үнэндээ энэ нь Шашны Христтэй хамт байх ба Христэд хандсан даатгал залбирал мөн.`
- Geometry visual: `Ийм хамтын даатгал залбирал нь аяндаа цагийн горимын хэлбэртэйгээр бий болжээ. Сүнслэг уншлагуудаар баяжуулсан энэхүү "Залбиралт цагийн ёслол" буюу "Тэнгэрлэг хурал" бол голдуу магтаал ба гуйлтын даатгал залбирал юм. Үнэндээ энэ нь Шашны Христтэй хамт байх ба Христэд хандсан даатгал залбирал мөн.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/gilh.json#/sections/1/subsections/1/title`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `3`
- Data: `Залбиралт цагийн ёслол`
- Geometry visual: `Залбиралт цагийн ёслол дахь`
- Omitted-tail signal: `дахь`
- Raw interleaved fragment: `ЗАЛБИРЛЫН | ХУРААНГУЙ СУДАР | Залбиралт цагийн ёслол дахь | “Дуулал” номын | дөрвөн долоо хоног | ӨГЛӨӨНИЙ БОЛОН`
- Reason: stored value is a strict prefix ending inside a geometry-reconstructed physical line; nine-gate human adjudication required
- Nine-gate adjudication: CLEAR rejected: identity/boundary gates fail; matched run-in heading “Залбиралт цагийн ёслол дахь”, where “дахь” belongs to neighboring heading prose, not an omitted tail of this stored structural title.

### `src/data/loth/gilh.json#/sections/1/subsections/2/paragraphs/0`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `12`
- Data: `Есүс өөрийн үйлдэж байсантай адил үйлд гэж бидэнд заан тушаасан. Ихэнх тохиолдолд Тэр: "Залбир", "Гуй", "Хай" [30], "Миний нэрээр" [31] гэж айлдсан. "Эзэний даатгал залбирал" [32] гэсэн нэрийн доор танигдсан хэлбэрээр хэрхэн залбирахыг бидэнд зааж өгсөн. Залбирал гэдэг нь хэрэгтэй [33] бөгөөд тэр нь даруу [34], сэрэмжтэй [35], тууштай, Эцэгийн сайнд итгэлтэй [36], хоёргүй сэтгэлтэй, мөн Тэнгэрбурханы мөн чанарт нийцтэй [37] байх ёстой гэж заан сургасан.`
- Geometry visual: `Есүс өөрийн үйлдэж байсантай адил үйлд гэж бидэнд заан тушаасан. Ихэнх тохиолдолд Тэр: "Залбир", "Гуй", "Хай" [30], "Миний нэрээр" [31] гэж айлдсан. "Эзэний даатгал залбирал" [32] гэсэн нэрийн доор танигдсан хэлбэрээр хэрхэн залбирахыг бидэнд зааж өгсөн. Залбирал гэдэг нь хэрэгтэй [33] бөгөөд тэр нь даруу [34], сэрэмжтэй [35], тууштай, Эцэгийн сайнд итгэлтэй [36], хоёргүй сэтгэлтэй, мөн Тэнгэрбурханы мөн чанарт нийцтэй [37] байх ёстой гэж заан сургасан.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/gilh.json#/sections/1/subsections/2/paragraphs/1`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `12`
- Data: `Ихэнх тохиолдолд өөрсдийн захидлуудаар дамжуулан Есүсийн элч нар олон залбирлуудыг, ялангуяа магтаалууд ба талархлын залбирлуудыг бидэнд уламжилсан. Ариун Сүнсний дотор [38] Есүс Христээр дамжуулан [39] Тэнгэрбурхандаа залбирахдаа [40] сонор сэрэмжтэй, тууштай сэтгэлтэй [41] байх ёстой гэдгийг тэд бидэнд зааж өгдөг. Мөн залбирал гэдэг нь ариусгахдаа бат найдвартай, ид хүчтэй [42] байдгийг бидэнд мэдэгддэг бөгөөд магтаал [43], талархал [44], гуйлт [45], бусдын нэрийн өмнөөс зуучлалын залбирал [46] гэсэн залбирлуудын талаар ярьдаг.`
- Geometry visual: `Ихэнх тохиолдолд өөрсдийн захидлуудаар`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `чанарт нийцтэй [37] байх ёстой гэж заан сургасан. | Энэхүү залбирал нийт хүн төрөлхтөн болон | Ихэнх тохиолдолд өөрсдийн захидлуудаар | тэдний авралын төлөө бүх нийтийн Шашин | дамжуулан Есүсийн элч нар олон залбирлуудыг, | болон түүний хамаг гишүүдээр дамжуулан`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/gilh.json#/sections/1/subsections/3/paragraphs/0`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `13`
- Data: `Хүмүүн бид Тэнгэрбурханаас бүхлээрээ хамааралтай байдаг тул даатгал залбирлын арга замаар дамжуулан хамаг үеийн итгэлт ард түмний үйлдэж байсантай адил Бүтээгчийн энэхүү бүрэн эрхийг хүлээн зөвшөөрөх ба илэрхийлэх хэрэгтэй.`
- Geometry visual: `Хүмүүн бид Тэнгэрбурханаас бүхлээрээ хамааралтай байдаг тул даатгал залбирлын арга замаар дамжуулан хамаг үеийн итгэлт ард түмний үйлдэж байсантай адил Бүтээгчийн энэхүү бүрэн эрхийг хүлээн зөвшөөрөх ба илэрхийлэх хэрэгтэй.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/gilh.json#/sections/1/subsections/4/paragraphs/0`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `13`
- Data: `Залбирал дахь Шашны эв нэгдэл Ариун Сүнсээр дамжуулан бий болдог бөгөөд Тэрээр Христ дотор, [52] бүхэл Шашны дунд болон Ариун угаалыг хүртэгч бүрийн дотор нэгэн адил байдаг. Түүнчлэн Ариун Сүнс бас "бидний сул дорой байдалд тусалдаг" бөгөөд "Өөрөө үгээр илэрхийлшгүйгээр ёолон бидний төлөө зуучлан гуйдаг". (Ром 8:26). Хүүгийн Сүнс болохын хувьд Тэрээр "үрчлэлийн Сүнсийг" бидэнд соёрхдог бөгөөд "Түүгээр бид "Ааба аа! Аав минь!" гэж дууддаг." (Ром 8:15; харьцуул. Галат 4:6; 1 Коринт 12:3; Ефес 5:18; Иуда 20). Тиймээс бүхэл Шашныг нэг болгодог хийгээд түүнийг Хүүгээр нь дамжуулан Эцэг рүү нь удирдаж буй Ариун Сүнсний үйлсгүйгээр хийх Христийн даатгал залбирал гэж байдаггүй.`
- Geometry visual: `8. Залбирал дахь Шашны эв нэгдэл Ариун`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `бидэнд уламжилсан. Ариун Сүнсний дотор [38] | Есүс Христээр дамжуулан [39] Тэнгэрбурхандаа Ариун Сүнсний үйлс | залбирахдаа [40] сонор сэрэмжтэй, тууштай 8. Залбирал дахь Шашны эв нэгдэл Ариун | сэтгэлтэй [41] байх ёстой гэдгийг тэд бидэнд Сүнсээр дамжуулан бий болдог бөгөөд Тэрээр`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/gilh.json#/sections/1/subsections/5/paragraphs/0`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `14`
- Data: `Дээр дурдсан зүйлсээс үзэхэд тасралтгүй бөгөөд тууштай залбирлын талаарх бидний Эзэн болон Түүний элч нарын үлгэр дуурайл ба номлол сургаал бол зөвхөн нэг л номын дэг журам биш гэж дүгнэж болно. Учир нь тэдгээр нь итгэгчдийн бүлгэм болсон Шашны үнэн мөн чанарт хамрагддаг бөгөөд тэр нь бүлгэмийн хувьд өөрийн мөн чанарыг даатгал залбирлаар дамжуулан илэрхийлэх ёстой. Үнэндээ Үйлс номыг итгэгчдийн бүлгэмийг анх удаа дурдахад тэр нь "Есүсийн эх Мариа болон Түүний дүү нартай нэг санаагаар байнга өөрсдийгөө залбиралд зориулж байсан нь" (Үйлс 1:14) нэгэн бүлгэм мэт харагддаг. "Итгэсэн олон нэг зүрх, сэтгэлтэй байсан." (Үйлс 4:32) бөгөөд тэдний зүрх, сэтгэл нэгтэй гэсэн сүнслэг хандлага нь Тэнгэрбурханы үг, хайр энэрлийн нөхөрлөл мөн Талархал-магтаалын мөргөлд үндэслэгдэн суурилсан байжээ. [53]`
- Geometry visual: `9. Дээр дурдсан зүйлсээс үзэхэд тасралтгүй`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `залбирал гэж байдаггүй. 18:20). | Бүлгэмийн даатгал залбирлын тухай Цаг хугацааг ариусгах нь | 9. Дээр дурдсан зүйлсээс үзэхэд тасралтгүй 10. Христ бидэнд ийн зааж өгсөн: “Сэтгэл | бөгөөд тууштай залбирлын талаарх бидний алдрахгүйгээр байнга залбирах ёстой.” (Лук | Эзэн болон Түүний элч нарын үлгэр дуурайл 18:1). Энэхүү номлол сургаалд Шашин үнэнч | ба номлол сургаал бол зөвхөн нэг л номын дэг бөгөөд дуулгавартай байсаар байдаг. Тэр нь`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/gilh.json#/sections/1/subsections/6/paragraphs/0`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `15`
- Data: `Христ бидэнд ийн зааж өгсөн: "Сэтгэл алдрахгүйгээр байнга залбирах ёстой." (Лук 18:1). Энэхүү номлол сургаалд Шашин үнэнч бөгөөд дуулгавартай байсаар байдаг. Тэр нь тасралтгүй залбирч өгдөг бөгөөд "Түүгээр (Есүсээр) дамжуулан Тэнгэрбурханд магтаалын тахилыг үргэлж өргөцгөөе." (Еврей 13:15) гэсэн үг сургамжийг өөрийнх нь болгосон. Энэхүү сургамжийг Шашин зөвхөн Талархал-магтаалын мөргөлийг ёслон тэмдэглэхээр бус харин элдэв олон арга замаар ялангуяа "Залбиралт цагийн ёслол"-оор уламжлан биелүүлдэг. Христийн нэн эртний уламжлалын дагуу "Залбиралт цагийн ёслол"-ын бусад хурлаас ялгарах онцлог шинж бол түүгээр нь дамжуулан өдөр шөнийн бүхэл мөчлөгийг Тэнгэрбурханд зориулах үйл хэрэг мөн. [56]`
- Geometry visual: `10. Христ бидэнд ийн зааж өгсөн: "Сэтгэл`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `залбирал гэж байдаггүй. 18:20). | Бүлгэмийн даатгал залбирлын тухай Цаг хугацааг ариусгах нь | 9. Дээр дурдсан зүйлсээс үзэхэд тасралтгүй 10. Христ бидэнд ийн зааж өгсөн: “Сэтгэл | бөгөөд тууштай залбирлын талаарх бидний алдрахгүйгээр байнга залбирах ёстой.” (Лук | Эзэн болон Түүний элч нарын үлгэр дуурайл 18:1). Энэхүү номлол сургаалд Шашин үнэнч | ба номлол сургаал бол зөвхөн нэг л номын дэг бөгөөд дуулгавартай байсаар байдаг. Тэр нь`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/gilh.json#/sections/1/subsections/7/paragraphs/0`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `16`
- Data: `"Залбиралт цагийн ёслол"-ын зорилго бол өдөр шөнийг болон хүмүүний үйл ажиллагааны бүхэл хүрээг ариун нандин болгох үйл хэрэг мөн. Тиймээс залбирлын цаг болгоныг аль болохоор байгалийн цагтай холбогдуулах хийгээд одоогийн амьдралын нөхцөл байдлыг харгалзан үзэхийн тулд "Залбиралт цагийн ёслол"-ын бүтэц шинэчлэгдэж байв. [57]`
- Geometry visual: `"Залбиралт цагийн ёслол"-ын зорилго бол өдөр шөнийг болон хүмүүний үйл ажиллагааны бүхэл хүрээг ариун нандин болгох үйл хэрэг мөн. Тиймээс залбирлын цаг болгоныг аль болохоор байгалийн цагтай холбогдуулах хийгээд одоогийн амьдралын нөхцөл байдлыг харгалзан үзэхийн тулд "Залбиралт цагийн ёслол"-ын бүтэц шинэчлэгдэж байв. [57]`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/gilh.json#/sections/1/subsections/7/title`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `16`
- Data: `"Залбиралт цагийн ёслол"-ын зорилго`
- Geometry visual: `"Залбиралт цагийн ёслол"-ын зорилго`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/gilh.json#/sections/1/title`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `5`
- Data: `Танилцуулга`
- Geometry visual: `Танилцуулга..........................................................11`
- Omitted-tail signal: `..........................................................11`
- Raw interleaved fragment: `ГАРЧИГ | Өмнөтгөл үг............................................................8 | Танилцуулга..........................................................11 | Залбиралт цагийг ёслон тэмдэглэх заавар.........18 | Залбиралт цагийн ёслолын дэг жаяг | Өглөөний даатгал залбирал.................................22`
- Reason: stored value is a strict prefix ending inside a geometry-reconstructed physical line; nine-gate human adjudication required
- Nine-gate adjudication: CLEAR rejected: identity/boundary gates fail; matched table-of-contents entry, and the dot leader/page number is navigation layout rather than omitted authored title text.

### `src/data/loth/gilh.json#/sections/2/subsections/0/paragraphs/1`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `18`
- Data: `"Эзэн, уруулыг минь нээгээч."
— "Тэгвэл ам минь Таны магтаалыг тунхаглана."`
- Geometry visual: `"Эзэн, уруулыг минь нээгээч."`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `дуудлагаар эхэлдэг: | дуулалтай хамт дуулал, шинэ гэрээний магтаал | “Эзэн, уруулыг минь нээгээч.” | ба дуулал | -“ Тэгвэл ам минь Таны магтаалыг | Уншлага`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/gilh.json#/sections/2/subsections/0/paragraphs/4`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Уншлагыг "Алдаршуулал" ("Эцэг, Хүү, Ариун Сүнсэнд жавхланг…") хэмээн залбирлаар төгсгөнө.`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/gilh.json#/sections/2/subsections/2/paragraphs/8`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `20`
- Data: `"Төгс Хүчит Эзэн биднийг адисалж […]." — "Амэн."`
- Geometry visual: `"Төгс Хүчит Эзэн биднийг адисалж [...]."-`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `шад дуулалтай хамт Симеоны магтаал) | Төгсгөлийн даатгал залбирал | “Төгс Хүчит Эзэн биднийг адисалж […].”- | “Амэн.” | Төгс жаргалт Цэвэр Охин Мариагийн | хүндэтгэлийн дуу`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/gilh.json#/sections/2/title`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `19`
- Data: `Залбиралт цагийг ёслон тэмдэглэх заавар`
- Geometry visual: `Залбиралт цагийг ёслон тэмдэглэх заавар 19`
- Omitted-tail signal: `19`
- Raw interleaved fragment: `Залбиралт цагийг ёслон тэмдэглэх заавар 19 | ЗАЛБИРАЛТ ЦАГИЙГ ЁСЛОН Магтуу | ТЭМДЭГЛЭХ ЗААВАР Өглөөний даатгал залбирал: өөрийн гэсэн шад | дуулалтай хамт дуулал, хуучин гэрээний магтаал`
- Reason: stored value is a strict prefix ending inside a geometry-reconstructed physical line; nine-gate human adjudication required
- Nine-gate adjudication: CLEAR rejected: identity/boundary gates fail; the trailing printed page number is running/TOC layout rather than omitted authored title text.

### `src/data/loth/gilh.json#/title`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Залбиралт цагийн заавар`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/ordinarium.json#/sections/0/subsections/0/blocks/0/text`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `22`
- Data: `Удиртгал`
- Geometry visual: `Удиртгал`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/ordinarium.json#/sections/0/subsections/0/blocks/1/r`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `18`
- Data: `Тэгвэл ам минь Таны магтаалыг тунхаглана.`
- Geometry visual: `Тэгвэл ам минь Таны магтаалыг тунхаглана.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/ordinarium.json#/sections/0/subsections/0/blocks/10/items/14/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `27`
- Data: `Ирэгтүн! Мариагийн Хүү Христэд мөргөцгөөе! эсвэл Энэ өдрийг бид Төгс жаргалт цэвэр охин Мариагийн дурсгалд зориулж байгаа тул Эзэндээ дуулцгаая!`
- Geometry visual: `Ирэгтүн! Мариагийн Хүү Христэд мөргөцгөөе!`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `Эзэний хувиргалт Төгс жаргалт цэвэр Охин Мариагийн Бямба | Ирэгтүн! Өндөрт өргөмжлөгдсөн, цог жавхлант гарагийг дурсахуй | Хаанд мөргөцгөөе! Ирэгтүн! Мариагийн Хүү Христэд мөргөцгөөе!`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/ordinarium.json#/sections/0/subsections/0/blocks/4/items/0/day`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `22`
- Data: `Ням гараг`
- Geometry visual: `Ням гараг`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/ordinarium.json#/sections/0/subsections/0/blocks/5/items/0/day`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `22`
- Data: `Ням гараг`
- Geometry visual: `Ням гараг`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/ordinarium.json#/sections/0/subsections/0/blocks/5/items/6/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `278`
- Data: `Бүгдээрээ Тэнгэрбурханы дуу хоолойг сонсоцгоож, Түүний амралтад орцгооё!`
- Geometry visual: `Бүгдээрээ Тэнгэрбурханы дуу хоолойг сонсоцгоож, Түүний амралтад орцгооё!`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/ordinarium.json#/sections/0/subsections/0/blocks/8/items/1/day`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `25`
- Data: `Дөчин хоногийн цаг улирал`
- Geometry visual: `Дөчин хоногийн цаг улирал`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/ordinarium.json#/sections/0/subsections/0/blocks/8/season`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `25`
- Data: `Дөчин хоногийн цаг улирал`
- Geometry visual: `Дөчин хоногийн цаг улирал`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/ordinarium.json#/sections/0/subsections/0/blocks/9/items/3/day`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `25`
- Data: `Пэнтикост их баяр`
- Geometry visual: `Пэнтикост их баяр`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/ordinarium.json#/sections/0/subsections/0/blocks/9/items/3/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `739`
- Data: `Аллэлуяа, Эзэний Сүнс энэ дэлхийг бялхаасан билээ. Ирэгтүн! Түүндээ мөргөцгөөе. Аллэлуяа!`
- Geometry visual: `Аллэлуяа, Эзэний Сүнс энэ дэлхийг бялхаасан билээ. Ирэгтүн! Түүндээ мөргөцгөөе. Аллэлуяа!`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/ordinarium.json#/sections/0/subsections/1/blocks/13/lines/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `29`
- Data: `Эхэн цагт байсан мэт аливаа цагт болготугай. Амэн.`
- Geometry visual: `Эхэн цагт байсан мэт аливаа цагт болготугай. Амэн.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/ordinarium.json#/sections/0/subsections/1/title`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Урих дуудлагын дуулал (Дуулал 95 · 100 · 67 · 24)`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/ordinarium.json#/sections/0/subsections/2/blocks/0/text`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `19`
- Data: `Магтуу`
- Geometry visual: `Магтуу`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/ordinarium.json#/sections/0/subsections/2/blocks/2/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `33`
- Data: `Дууллын залбирал`
- Geometry visual: `Дууллын залбирал нь магтуу дуулсны дараа`
- Omitted-tail signal: `нь магтуу дуулсны дараа`
- Raw interleaved fragment: `32 Дэг жаяг Өглөөний даатгал залбирал 33 | Гол мөрнүүд дээр түүнийг байгуулжээ. Дууллын залбирал | Дууллын залбирал нь магтуу дуулсны дараа | ЭЗЭНий уул өөд хэн авирч болох вэ? | явагдах бөгөөд тохиромжтой шад дуулал | Ариун газарт нь хэн зогсож болох вэ?`
- Reason: stored value is a strict prefix ending inside a geometry-reconstructed physical line; nine-gate human adjudication required
- Nine-gate adjudication: CLEAR rejected: identity/boundary gates fail; stored structural label is localized inside a prose sentence, so the following words are neighboring prose rather than an omitted tail.

### `src/data/loth/ordinarium.json#/sections/0/subsections/2/title`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Магтуу · Дууллын залбирал`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/ordinarium.json#/sections/0/subsections/3/blocks/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `33`
- Data: `Уншлага`
- Geometry visual: `Уншлага эсвэл номлолын дараа аниргүй богино`
- Omitted-tail signal: `эсвэл номлолын дараа аниргүй богино`
- Raw interleaved fragment: `Тэнгэрбурханы Үгийн хариу залбирал | Мөнхийн үүднүүд ээ, өргөгдөгтүн! | Уншлага эсвэл номлолын дараа аниргүй богино | Сүр жавхлангийн энэ Хаан хэн бэ? цаг мөчийг сахиж болно. | Түг түмдийн ЭЗЭН, Хожим нь хариу дуу эсвэл уншлагын дараа | Тэрээр сүр жавхлангийн Хаан болой. бичигдсэн хариу залбирлыг уншина.`
- Reason: stored value is a strict prefix ending inside a geometry-reconstructed physical line; nine-gate human adjudication required
- Nine-gate adjudication: CLEAR rejected: identity/boundary gates fail; stored structural label is localized inside a prose sentence, so the following words are neighboring prose rather than an omitted tail.

### `src/data/loth/ordinarium.json#/sections/0/subsections/3/blocks/3/text`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Тэнгэрбурханы Үгийн хариу залбирал`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/ordinarium.json#/sections/0/subsections/3/title`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Уншлага · Тэнгэрбурханы Үгийн хариу залбирал`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/ordinarium.json#/sections/0/subsections/4/blocks/0/subtitle`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `34`
- Data: `Лук 1:68-79`
- Geometry visual: `Лук 1:68-79`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/ordinarium.json#/sections/0/subsections/4/blocks/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `19`
- Data: `Сайнмэдээний айлдлын магтаал · Захариагийн магтаал`
- Geometry visual: `Сайнмэдээний айлдлын магтаал (өөрийн гэсэн`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `Уншлагын дараах хариу залбирал | Дараа нь өөрийн гэсэн шад дуулалтай хамт 95-р, | Сайнмэдээний айлдлын магтаал (өөрийн гэсэн | 100-р, 67-р эсвэл 24-р урих дуудлагын дууллыг | шад дуулалтай хамт Захариагийн магтаал эсвэл | уншина.`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/ordinarium.json#/sections/0/subsections/4/blocks/11/lines/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `29`
- Data: `Эхэн цагт байсан мэт аливаа цагт болготугай. Амэн.`
- Geometry visual: `Эхэн цагт байсан мэт аливаа цагт болготугай. Амэн.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/ordinarium.json#/sections/0/subsections/4/title`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `19`
- Data: `Сайнмэдээний айлдлын магтаал (Захариагийн магтаал)`
- Geometry visual: `Сайнмэдээний айлдлын магтаал (өөрийн гэсэн`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `Уншлагын дараах хариу залбирал | Дараа нь өөрийн гэсэн шад дуулалтай хамт 95-р, | Сайнмэдээний айлдлын магтаал (өөрийн гэсэн | 100-р, 67-р эсвэл 24-р урих дуудлагын дууллыг | шад дуулалтай хамт Захариагийн магтаал эсвэл | уншина.`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/ordinarium.json#/sections/0/subsections/5/blocks/9/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `36`
- Data: `Тэнгэр дэх Эцэг минь ээ хэмээх даатгал залбирлыг өргөн барьснаараа өөрсдийн залбирлууд ба магтаалуудаа гүйцэлдүүлцгээе:`
- Geometry visual: `Тэнгэр дэх Эцэг минь ээ хэмээх даатгал залбирлыг`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `36 Дэг жаяг Өглөөний даатгал залбирал 37 | Шад дуулал ердийн байдлаар давтагдана. магтаалуудаа гүйцэлдүүлцгээе: | гуйлТын залбирал Тэнгэр дэх Эцэг минь ээ хэмээх даатгал | Сайнмэдээний айлдлын магтаалын дараа залбирлаар өөрсдийн залбирлуудыг төгсгөцгөөе: | гуйлтын залбирал байдаг. | Ахиад нэг удаа Тэнгэрбурханд магтаалуудаа`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/ordinarium.json#/sections/0/subsections/7/blocks/0/text`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `20`
- Data: `Төгсгөлийн даатгал залбирал`
- Geometry visual: `Төгсгөлийн даатгал залбирал`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/ordinarium.json#/sections/0/subsections/7/blocks/10/r`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `38`
- Data: `Тэнгэрбурхандаа талархъя.`
- Geometry visual: `Тэнгэрбурхандаа талархъя.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/ordinarium.json#/sections/0/subsections/7/blocks/11/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `38`
- Data: `Санваартан эсвэл тахилчийн эзгүйд болон хувийн уншлагын үед Өглөөний Даатгал залбирлыг ийн төгсгөнө:`
- Geometry visual: `Санваартан эсвэл тахилчийн эзгүйд болон`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `ТөгСгөл | МагТуу | Санваартан эсвэл тахилч хурлыг удирдаж байгаа | Үүний дараа тохиромжтой магтууг дуулна. | бол тэр сүсэгтэн олныг адисалж ийн тараана: | Эзэн та нартай хамт байх болтугай. Дууллын залбирал`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/ordinarium.json#/sections/0/subsections/7/blocks/12/r`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `29`
- Data: `Амэн.`
- Geometry visual: `Амэн.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/ordinarium.json#/sections/0/subsections/7/blocks/4/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `38`
- Data: `Төгсгөл`
- Geometry visual: `Төгсгөлийн залбирлыг Долоо хоногийн`
- Omitted-tail signal: `ийн залбирлыг Долоо хоногийн`
- Raw interleaved fragment: `38 Дэг жаяг Оройн даатгал залбирал 39 | Төгсгөлийн залбирлыг Долоо хоногийн ОРОЙН ДААТГАЛ ЗАЛБИРАЛ | өдрүүдийн хурлын үед энэ номын “Дөрвөн долоо | Тэнгэрбурхан минь, | хоног” гэсэн хэсгийн зөв долоо хоногоос, бусад`
- Reason: stored value is a strict prefix ending inside a geometry-reconstructed physical line; nine-gate human adjudication required
- Nine-gate adjudication: CLEAR rejected: identity/boundary gates fail; stored structural label is localized inside a different inflected prose token, not a same-unit strict prefix.

### `src/data/loth/ordinarium.json#/sections/0/subsections/7/blocks/6/r`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `38`
- Data: `Таны амь сүнстэй хамт байх болтугай.`
- Geometry visual: `Таны амь сүнстэй хамт байх болтугай.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/ordinarium.json#/sections/0/subsections/7/blocks/7/r`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `29`
- Data: `Амэн.`
- Geometry visual: `Амэн.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/ordinarium.json#/sections/0/subsections/7/title`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `20`
- Data: `Төгсгөлийн даатгал залбирал · Төгсгөл`
- Geometry visual: `Төгсгөлийн даатгал залбирал`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `Сайнмэдээний айлдлын магтаал (өөрийн гэсэн | шад дуулалтай хамт Симеоны магтаал) | Төгсгөлийн даатгал залбирал | “Төгс Хүчит Эзэн биднийг адисалж […].”- | “Амэн.” | Төгс жаргалт Цэвэр Охин Мариагийн`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/ordinarium.json#/sections/0/title`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `18`
- Data: `Өглөөний даатгал залбирал`
- Geometry visual: `Өглөөний даатгал залбирал доор дурдсан урих`
- Omitted-tail signal: `доор дурдсан урих`
- Raw interleaved fragment: `Залбиралт цагийг ёслон тэмдэглэх заавар 19 | ЗАЛБИРАЛТ ЦАГИЙГ ЁСЛОН Магтуу | ТЭМДЭГЛЭХ ЗААВАР Өглөөний даатгал залбирал: өөрийн гэсэн шад | дуулалтай хамт дуулал, хуучин гэрээний магтаал | Залбиралт цагийн ёслолын удиртгал | ба дуулал`
- Reason: stored value is a strict prefix ending inside a geometry-reconstructed physical line; nine-gate human adjudication required
- Nine-gate adjudication: CLEAR rejected: identity/boundary gates fail; the title is localized as the start of an explanatory sentence, whose continuation is not part of the title unit.

### `src/data/loth/ordinarium.json#/sections/1/subsections/0/blocks/0/text`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `22`
- Data: `Удиртгал`
- Geometry visual: `Удиртгал`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/ordinarium.json#/sections/1/subsections/0/blocks/1/r`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `18`
- Data: `Эзэн минь, надад туслахаар яаравчилна уу.`
- Geometry visual: `Эзэн минь, надад туслахаар яаравчилна уу.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/ordinarium.json#/sections/1/subsections/0/blocks/2/r`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `18`
- Data: `Аллэлуяа!`
- Geometry visual: `Аллэлуяа!`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/ordinarium.json#/sections/1/subsections/0/blocks/2/v`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `29`
- Data: `Эцэг, Хүү, Ариун Сүнсэнд жавхланг Эхэн цагт байсан мэт аливаа цагт болготугай. Амэн.`
- Geometry visual: `Эцэг, Хүү, Ариун Сүнсэнд жавхланг Эхэн цагт байсан мэт аливаа цагт болготугай. Амэн.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/ordinarium.json#/sections/1/subsections/0/title`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `22`
- Data: `Удиртгал`
- Geometry visual: `Удиртгал`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/ordinarium.json#/sections/1/subsections/1/blocks/0/text`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `19`
- Data: `Магтуу`
- Geometry visual: `Магтуу`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/ordinarium.json#/sections/1/subsections/1/blocks/2/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `33`
- Data: `Дууллын залбирал`
- Geometry visual: `Дууллын залбирал нь магтуу дуулсны дараа`
- Omitted-tail signal: `нь магтуу дуулсны дараа`
- Raw interleaved fragment: `32 Дэг жаяг Өглөөний даатгал залбирал 33 | Гол мөрнүүд дээр түүнийг байгуулжээ. Дууллын залбирал | Дууллын залбирал нь магтуу дуулсны дараа | ЭЗЭНий уул өөд хэн авирч болох вэ? | явагдах бөгөөд тохиромжтой шад дуулал | Ариун газарт нь хэн зогсож болох вэ?`
- Reason: stored value is a strict prefix ending inside a geometry-reconstructed physical line; nine-gate human adjudication required
- Nine-gate adjudication: CLEAR rejected: identity/boundary gates fail; stored structural label is localized inside a prose sentence, so the following words are neighboring prose rather than an omitted tail.

### `src/data/loth/ordinarium.json#/sections/1/subsections/1/title`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Магтуу · Дууллын залбирал`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/ordinarium.json#/sections/1/subsections/2/blocks/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `33`
- Data: `Уншлага`
- Geometry visual: `Уншлага эсвэл номлолын дараа аниргүй богино`
- Omitted-tail signal: `эсвэл номлолын дараа аниргүй богино`
- Raw interleaved fragment: `Тэнгэрбурханы Үгийн хариу залбирал | Мөнхийн үүднүүд ээ, өргөгдөгтүн! | Уншлага эсвэл номлолын дараа аниргүй богино | Сүр жавхлангийн энэ Хаан хэн бэ? цаг мөчийг сахиж болно. | Түг түмдийн ЭЗЭН, Хожим нь хариу дуу эсвэл уншлагын дараа | Тэрээр сүр жавхлангийн Хаан болой. бичигдсэн хариу залбирлыг уншина.`
- Reason: stored value is a strict prefix ending inside a geometry-reconstructed physical line; nine-gate human adjudication required
- Nine-gate adjudication: CLEAR rejected: identity/boundary gates fail; stored structural label is localized inside a prose sentence, so the following words are neighboring prose rather than an omitted tail.

### `src/data/loth/ordinarium.json#/sections/1/subsections/2/blocks/3/text`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Тэнгэрбурханы Үгийн хариу залбирал`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/ordinarium.json#/sections/1/subsections/2/title`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Уншлага · Тэнгэрбурханы Үгийн хариу залбирал`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/ordinarium.json#/sections/1/subsections/3/blocks/0/subtitle`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `40`
- Data: `Лук 1:46-55`
- Geometry visual: `Лук 1:46-55`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/ordinarium.json#/sections/1/subsections/3/blocks/0/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `19`
- Data: `Сайнмэдээний айлдлын магтаал · Мариагийн магтаал`
- Geometry visual: `Сайнмэдээний айлдлын магтаал (өөрийн гэсэн`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `Уншлагын дараах хариу залбирал | Дараа нь өөрийн гэсэн шад дуулалтай хамт 95-р, | Сайнмэдээний айлдлын магтаал (өөрийн гэсэн | 100-р, 67-р эсвэл 24-р урих дуудлагын дууллыг | шад дуулалтай хамт Захариагийн магтаал эсвэл | уншина.`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/ordinarium.json#/sections/1/subsections/3/blocks/11/lines/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `29`
- Data: `Эхэн цагт байсан мэт аливаа цагт болготугай. Амэн.`
- Geometry visual: `Эхэн цагт байсан мэт аливаа цагт болготугай. Амэн.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/ordinarium.json#/sections/1/subsections/3/title`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `19`
- Data: `Сайнмэдээний айлдлын магтаал (Мариагийн магтаал)`
- Geometry visual: `Сайнмэдээний айлдлын магтаал (өөрийн гэсэн`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `Уншлагын дараах хариу залбирал | Дараа нь өөрийн гэсэн шад дуулалтай хамт 95-р, | Сайнмэдээний айлдлын магтаал (өөрийн гэсэн | 100-р, 67-р эсвэл 24-р урих дуудлагын дууллыг | шад дуулалтай хамт Захариагийн магтаал эсвэл | уншина.`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/ordinarium.json#/sections/1/subsections/4/blocks/9/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `36`
- Data: `Тэнгэр дэх Эцэг минь ээ хэмээх даатгал залбирлыг өргөн барьснаараа өөрсдийн залбирлууд ба магтаалуудаа гүйцэлдүүлцгээе:`
- Geometry visual: `Тэнгэр дэх Эцэг минь ээ хэмээх даатгал залбирлыг`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `36 Дэг жаяг Өглөөний даатгал залбирал 37 | Шад дуулал ердийн байдлаар давтагдана. магтаалуудаа гүйцэлдүүлцгээе: | гуйлТын залбирал Тэнгэр дэх Эцэг минь ээ хэмээх даатгал | Сайнмэдээний айлдлын магтаалын дараа залбирлаар өөрсдийн залбирлуудыг төгсгөцгөөе: | гуйлтын залбирал байдаг. | Ахиад нэг удаа Тэнгэрбурханд магтаалуудаа`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/ordinarium.json#/sections/1/subsections/6/blocks/0/text`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `20`
- Data: `Төгсгөлийн даатгал залбирал`
- Geometry visual: `Төгсгөлийн даатгал залбирал`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/ordinarium.json#/sections/1/subsections/6/blocks/10/r`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `38`
- Data: `Тэнгэрбурхандаа талархъя.`
- Geometry visual: `Тэнгэрбурхандаа талархъя.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/ordinarium.json#/sections/1/subsections/6/blocks/12/r`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `35`
- Data: `Амэн.`
- Geometry visual: `Амэн.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/ordinarium.json#/sections/1/subsections/6/blocks/4/text`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `38`
- Data: `Төгсгөл`
- Geometry visual: `Төгсгөлийн залбирлыг Долоо хоногийн`
- Omitted-tail signal: `ийн залбирлыг Долоо хоногийн`
- Raw interleaved fragment: `38 Дэг жаяг Оройн даатгал залбирал 39 | Төгсгөлийн залбирлыг Долоо хоногийн ОРОЙН ДААТГАЛ ЗАЛБИРАЛ | өдрүүдийн хурлын үед энэ номын “Дөрвөн долоо | Тэнгэрбурхан минь, | хоног” гэсэн хэсгийн зөв долоо хоногоос, бусад`
- Reason: stored value is a strict prefix ending inside a geometry-reconstructed physical line; nine-gate human adjudication required
- Nine-gate adjudication: CLEAR rejected: identity/boundary gates fail; stored structural label is localized inside a different inflected prose token, not a same-unit strict prefix.

### `src/data/loth/ordinarium.json#/sections/1/subsections/6/blocks/6/r`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `38`
- Data: `Таны амь сүнстэй хамт байх болтугай.`
- Geometry visual: `Таны амь сүнстэй хамт байх болтугай.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: value occurs only inside a larger geometry unit; start/end unit identity is not proven

### `src/data/loth/ordinarium.json#/sections/1/subsections/6/blocks/7/r`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `35`
- Data: `Амэн.`
- Geometry visual: `Амэн.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/ordinarium.json#/sections/1/subsections/6/title`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `20`
- Data: `Төгсгөлийн даатгал залбирал · Төгсгөл`
- Geometry visual: `Төгсгөлийн даатгал залбирал`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `Сайнмэдээний айлдлын магтаал (өөрийн гэсэн | шад дуулалтай хамт Симеоны магтаал) | Төгсгөлийн даатгал залбирал | “Төгс Хүчит Эзэн биднийг адисалж […].”- | “Амэн.” | Төгс жаргалт Цэвэр Охин Мариагийн`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/ordinarium.json#/sections/1/title`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `39`
- Data: `Оройн даатгал залбирал`
- Geometry visual: `Оройн даатгал залбирал 39`
- Omitted-tail signal: `39`
- Raw interleaved fragment: `38 Дэг жаяг Оройн даатгал залбирал 39 | Төгсгөлийн залбирлыг Долоо хоногийн ОРОЙН ДААТГАЛ ЗАЛБИРАЛ | өдрүүдийн хурлын үед энэ номын “Дөрвөн долоо | Тэнгэрбурхан минь,`
- Reason: stored value is a strict prefix ending inside a geometry-reconstructed physical line; nine-gate human adjudication required
- Nine-gate adjudication: CLEAR rejected: identity/boundary gates fail; the printed page number is heading layout rather than omitted title content.

### `src/data/loth/psalter-texts.json#/1 Chronicles 29:10-13/stanzas/0/6`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `79`
- Data: `Өө, ЭЗЭН минь,`
- Geometry visual: `Өө, ЭЗЭН минь,`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/1 Samuel 2:1-10/stanzas/0/0`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `229`
- Data: `ЭЗЭН тандаа зүрх минь баярлана. –`
- Geometry visual: `ЭЗЭН тандаа зүрх минь баярлана.-`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `сайнаар бялхуулав (Лук 1:52-53). | Жимүүд тань их усанд байв. | Гэлээ ч Таны мөрүүд эс мэдэгджээ. ЭЗЭН тандаа зүрх минь баярлана.–`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/psalter-texts.json#/1 Samuel 2:1-10/stanzas/2/2`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `230`
- Data: `Хамгийг мэдэгч Тэнгэрбурхан ЭЗЭН тул`
- Geometry visual: `Хамгийг мэдэгч ТэнгэрбурханЭЗЭН тул`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `Ихэмсэг үгс амнаас чинь бүү гартугай. | Түүнтэй тэрсэлдэгчид нам дарагдана. | Хамгийг мэдэгч ТэнгэрбурханЭЗЭН тул | Хамаг үйлийг дэнслэгч нь чухамдаа Тэр билээ. Тэгээд тэднийг ЭЗЭН тэнгэрээс бас ниргэнэ. | Дэлхийн хязгаар хүртэл ЭЗЭН шүүх болно. | Дийлэгч агсны нум хугарахад`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/psalter-texts.json#/1 Samuel 2:1-10/stanzas/2/3`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Хамаг үйлсийг дэнслэгч нь чухамдаа Тэр билээ.`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/psalter-texts.json#/1 Samuel 2:1-10/stanzas/5/1`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `230`
- Data: `Үгээгүй ядууг үнс хогноос өргөмждөө`
- Geometry visual: `Үгээгүй ядууг үнс хогноос өргөхдөө`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `Өчүүхэн нэгнийг шорооноос босгохдоо | Дуулал 97 | Үгээгүй ядууг үнс хогноос өргөхдөө | Дэлхийн төлөө тогтоосон зарлигийнхаа доторх | Өргөмжлөн тэднийг дээдсийн дунд суулгаад | Эзэний цог жавхлан`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/psalter-texts.json#/1 Samuel 2:1-10/stanzas/7/3`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Тосолсныхоо эврийг Тэр бас өргөх болно.`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/psalter-texts.json#/Colossians 1:12-20/stanzas/3/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `120`
- Data: `Бүх юмс Түүнд оршин тогтнодог юм.`
- Geometry visual: `Бүх юмс Түүнд оршин тогтнодог юм.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Colossians 1:12-20/stanzas/5/5`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `121`
- Data: `Түүгээр дамжуулан`
- Geometry visual: `Түүгээр дамжуулан`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Colossians 1:12-20/stanzas/5/7`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Өөртэйгөө эвлэрүүлэхийг бас таалсан билээ.`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/psalter-texts.json#/Daniel 3:26-27, 29, 34-41/stanzas/2/3`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `99`
- Data: `  билээ.`
- Geometry visual: `билээ.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:26-27, 29, 34-41/stanzas/6/3`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `443`
- Data: `  болсон билээ.`
- Geometry visual: `болсон билээ.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:52-57/stanzas/0/0`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `179`
- Data: `Тэнгэрбурхан Эзэн,`
- Geometry visual: `Тэнгэрбурхан Эзэн,`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:52-57/stanzas/1/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `82`
- Data: `  магтагдах болтугай.`
- Geometry visual: `магтагдах болтугай.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:52-57/stanzas/5/0`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `180`
- Data: `Тэнгэрийн огторгуй дахь`
- Geometry visual: `Тэнгэрийн огторгуй дахь`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:52-57/stanzas/6/0`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `Эзэний хамаг бүтээлүүд ээ,`
- Geometry visual: `Эзэний хамаг бүтээлүүд ээ,`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:52-57/stanzas/6/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `  Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/0/0`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `Эзэний хамаг бүтээлүүд ээ,`
- Geometry visual: `Эзэний хамаг бүтээлүүд ээ,`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/0/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `  Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/1/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `  Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/11/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `  Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/12/0`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `62`
- Data: `Израил аа,`
- Geometry visual: `Израил аа,`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/12/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `  Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/12/3`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `  Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/12/4`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `62`
- Data: `Эзэний зардас нар аа,`
- Geometry visual: `Эзэний зардас нар аа,`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/12/5`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `  Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/13/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `  Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/13/3`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `  Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/14/5`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `63`
- Data: `Таныг магтаж,`
- Geometry visual: `Таныг магтаж,`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/14/6`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `63`
- Data: `  бүгдийн дээр үүрд мөнх өргөмжлөх`
- Geometry visual: `бүгдийн дээр үүрд мөнх өргөмжлөх`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/14/7`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `56`
- Data: `  болтугай.`
- Geometry visual: `болтугай.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/2/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `  Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/2/3`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `  Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/2/5`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `  Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/3/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `  Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/3/3`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `  Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/3/5`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `  Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/4/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `  Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/4/3`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `  Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/4/5`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `  Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/5/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `  Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/5/3`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `  Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/5/5`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `  Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/6/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `  Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/6/3`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `  Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/6/5`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `  Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/7/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `  Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/8/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `  Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/8/3`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `  Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/8/4`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `62`
- Data: `Хамаг эх булаг аа,`
- Geometry visual: `Хамаг эх булаг аа,`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/8/5`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `  Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/9/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `  Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/9/3`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `  Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Daniel 3:57-88, 56/stanzas/9/5`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `  Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Deuteronomy 32:1-12/stanzas/2/2`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Түүний хүүхэд биш, нүгэлтэй толбо болов.`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/psalter-texts.json#/Deuteronomy 32:1-12/stanzas/2/4`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `281`
- Data: `Та нар ЭЗЭНд ингэж хариу байх байгаа юм уу?`
- Geometry visual: `Та нар ЭЗЭНд ингэж хариу барьж байгаа юм уу?`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `үйлчлэхдээ итгэлтэй, найдвартай байж, хайрын Түүний хүүхэд биш, ичгүүрт толбо болов. | үйлсийг үргэлж ихэд үйлдэж, дэлгэрүүлэх Харалган хийгээд мулгуу ардууд аа! | болтугай. Та нар ЭЗЭНд ингэж хариу барьж байгаа юм уу? | Чамайг бүтээж, чамайг бий болгож, | Шад магтаал Бидний Тэнгэрбурханы сайн | Чамайг тогтоосон Тэр Эцэг чинь бус уу?`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/psalter-texts.json#/Ephesians 1:3-10/stanzas/0/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `87`
- Data: `Тэнгэрбурхан ерөөлтэй еэ!`
- Geometry visual: `Тэнгэрбурхан ерөөлтэй еэ!`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Exodus 15:1-4a, 8-13, 17-18/stanzas/2/3`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `  далайд хаяг нь Тэр билээ.`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/psalter-texts.json#/Exodus 15:1-4a, 8-13, 17-18/stanzas/4/1`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `161`
- Data: `Овоо мэт болсон давалгаа урсхаа умартан,`
- Geometry visual: `Овоо мэт болсон давалгаа урсахаа умартан,`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `Аллэлуяа! | Хамрын тань амьсгал усыг бөөгнөрүүлж, | Магтаал Гэтлэл 15:1-4а, 8-13, 17-18 Овоо мэт болсон давалгаа урсахаа умартан, | Улаан Тэнгисийг гаталсны дараах ялалтын дуу Оёоргүй гүн далайд өтгөрөв. | Араатныг хөрөгтэй нь, нэрийн тоотой нь тэмцэн | “Хөөж бариад, олзоо хуваая.`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/psalter-texts.json#/Exodus 15:1-4a, 8-13, 17-18/stanzas/5/2`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Сэлэм юугаа сугалья,`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/psalter-texts.json#/Exodus 15:1-4a, 8-13, 17-18/stanzas/6/0`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Салхиа Та үлээх,`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/psalter-texts.json#/Exodus 15:1-4a, 8-13, 17-18/stanzas/7/0`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `161`
- Data: `Аяа, ЭЗЭН,`
- Geometry visual: `Аяа, ЭЗЭН,`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Exodus 15:1-4a, 8-13, 17-18/stanzas/8/5`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `162`
- Data: `  тэднийгээ ариун гэрт тань авч ирлээ.`
- Geometry visual: `тэднийгээ ариун гэрт тань авч ирлээ`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `Эцэг, Хүү, Ариун Сүнсэнд жавхланг… | Хүч чадал тань | тэднийгээ ариун гэрт тань авч ирлээ Дууллыг төгсгөх залбирал | Тэнгэрбурхан, Эцэг минь, бүх үндэстэн болон | Та тэднийг авчран | бүх ард түмэн Таныг магтах болтугай. Тантай`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/psalter-texts.json#/Ezekiel 36:24-28/stanzas/0/2`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `507`
- Data: `Та нарыг эх нутагт чинь авчрах болно.`
- Geometry visual: `Та нарыг эх нутагт чинь аваачих болно.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `Та нарыг хамаг нутгаас цуглуулж, | Тэнгэрбурханы маань хүрээнүүдэд тэд | Та нарыг эх нутагт чинь аваачих болно. | цэцэглэнэ. | Хөгширсөн ч тэд жимс гаргана. Би та нар дээр цэвэр ус цацаж, | Шүүслэг бас ногоон хэвээрээ байна. та нар цэвэр болох болно.`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/psalter-texts.json#/Ezekiel 36:24-28/stanzas/1/2`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Би та нарыг хамаг хир бүртгэс чинь,`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/psalter-texts.json#/Ezekiel 36:24-28/stanzas/1/3`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Хамаг шүтээнээс та нарыг арилгах болно.`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/psalter-texts.json#/Ezekiel 36:24-28/stanzas/2/3`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `507`
- Data: `  чулуун зүрхийг зайлуулж,`
- Geometry visual: `чулуун зүрхийг зайлуулж,`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Isaiah 26:1-6/stanzas/0/23`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `332`
- Data: `ЭЗЭН, Та мөн бидний төлөө бүх үйлсийг минь бүтээсэн учраас`
- Geometry visual: `ЭЗЭН, Та мөн бидний төлөө бүх үйлсийг`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `Ертөнцийн суугчид зөв явдалд суралцана. | Учир нь Та хүмүүсийг шударга ёсоор шүүж, | ЭЗЭН, Та мөн бидний төлөө бүх үйлсийг Дэлхий дээрх үндэстнүүдийг захирах болно.`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/psalter-texts.json#/Isaiah 2:2-5/stanzas/0/5`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `316`
- Data: `  Олон ард түмэн ирээд`
- Geometry visual: `Олон ард түмэн ирээд`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Isaiah 33:13-16/stanzas/2/5`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Муу үзэхгүйн тулд нүдээ анигч нь`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/psalter-texts.json#/Isaiah 38:10-14, 17-20/stanzas/8/0`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `213`
- Data: `ЭЗЭН намайг заавал аварна.`
- Geometry visual: `ЭЗЭН намайг заавал аварна.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Isaiah 38:10-14, 17-20/stanzas/8/2`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `214`
- Data: `ЭЗЭНий өргөөнд`
- Geometry visual: `ЭЗЭНий өргөөнд`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Isaiah 61:10-62:5/stanzas/4/0`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Цаашаа чамайг “Мартагдсан” гэж,`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/psalter-texts.json#/Isaiah 61:10-62:5/stanzas/4/4`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Газрыг чинь “Гэрлэлэн” гэж дуудах болно.`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/psalter-texts.json#/Jeremiah 14:17-21/stanzas/0/3`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Хөндүүртэй халдвар шархтай бэртээд`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/psalter-texts.json#/Jeremiah 14:17-21/stanzas/2/3`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `  хэрэн хэсүүлсээр явжээ.`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/psalter-texts.json#/Jeremiah 14:17-21/stanzas/3/2`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Та биднийг юунд эдгүүлэгүйгээр цохив?`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/psalter-texts.json#/Jeremiah 14:17-21/stanzas/6/3`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Бүү цуцлаач.`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/psalter-texts.json#/Judith 16:2-3a, 13-15/stanzas/0/17`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `111`
- Data: `Таны өмнө`
- Geometry visual: `Таны өмнө`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Philippians 2:6-11/stanzas/0/8`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `54`
- Data: `Түүнийг өргөмжилсөн бөгөөд`
- Geometry visual: `Түүнийг өргөмжилсөн бөгөөд`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Psalm 112:1-10/psalmPrayer`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `49`
- Data: `Эзэн Тэнгэрбурхан минь, Та бол сайн хүмүүний зүрх сэтгэлийг гийгүүлдэг мөнхийн гэрэл мөн. Биднийг Таныг хайрлах, Таны алдар сууг магтан дуулах, мөн сүүлийн өдөр хатуу шүүлтээс зайлсхийхийн тулд энэ газар дэлхий дээр зөв амьдрахад Та тусална уу. Цаашдаа бид Таны нүүр царайн гэрлийг харах болтугай.`
- Geometry visual: `Эзэн Тэнгэрбурхан минь, Та биднийг хүлээн авна`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `биднийг аврахаар ирнэ. | Дөчин хоногийн цаг улирлын 1 дэх Ням гараг: Аяа | Эзэн Тэнгэрбурхан минь, Та биднийг хүлээн авна | уу. Эмтэрсэн, гэмшсэн зүрхээр өргөж буй бидний | энэ өдрийн тахил өргөлийг та таалан болгооно уу. | Дөчин хоногийн цаг улирлын 5 дахь Ням гараг:`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/psalter-texts.json#/Psalm 113:1-9/psalmPrayer`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `288`
- Data: `Тэнгэрбурханы Үг, Эзэн Есүс минь, биднийг шорооноос өргөж, Таны жинхэнэ бодгаль ахуйд хуваалцагчид болгохын тулд Та сүр жавхлангийнхаа гэгээн гэрлийг огоороод, хүн болсон ажээ. Тиймээс манай Шашны тоолж баршгүй охид хөвгүүд нар мандахаас жаргах хүртэл Таны нэр алдрыг хүндэтгэж магтах болтугай.`
- Geometry visual: `Тэнгэрбурханы Үг, Эзэн Есүс минь, биднийг`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `Дууллыг төгсгөх залбирал | ЭЗЭНий нэрийг дуудна. | Тэнгэрбурханы Үг, Эзэн Есүс минь, биднийг | шорооноос өргөж, Таны жинхэнэ бодгаль | Бүх ард түмнийх нь өмнө | ахуйд хуваалцагчид болгохын тулд Та сүр`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/psalter-texts.json#/Psalm 114:1-8/psalmPrayer`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `70`
- Data: `Аяа, нэгдэл бөгөөд гурвалын мөнх амьтай далд нууц байдаг төгс хүчит Тэнгэрбурхан минь, Та ус ба Сүнсний төрөлтөөр шинэ Израилийг амьдруулж, түүнийг сонгогдсон угсаа, хаан тахилч, ариун үндэстэн ба Өөрийн эзэмшлийн ард түмнийг болгосон билээ. Шинэ гэрлийн сүр жавхлангаар алхах гэж Танаар дуудагдсан тэдгээр бүх хүмүүс Танд зохистой үйлчилж, Таныг тахин шүтэх болтугай.`
- Geometry visual: `Аяа, нэгдэл бөгөөд гурвалын мөнх амьтай`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `Дууллыг төгсгөх залбирал | (Х. Аллэлуяа!) | Аяа, нэгдэл бөгөөд гурвалын мөнх амьтай | Түүний шүүлт шулуун шударга ба үнэн зөв | далд нууц байдаг төгс хүчит Тэнгэрбурхан минь, | юм.`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/psalter-texts.json#/Psalm 117:1-2/stanzas/0/4`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `163`
- Data: `ЭЗЭНий үнэн үүрд мөнх,`
- Geometry visual: `ЭЗЭНий үнэн үүрд мөнх,`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Psalm 11:1-7/stanzas/0/6`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `84`
- Data: `Харанхуйд шулуун шударга зүрхтэй хүн рүү харвахын тулд болой.`
- Geometry visual: `Харанхуйд шулуун шударга зүрхтэй хүн рүү`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `сумаа тавихаар зэхэж байгаа нь | харахдаа баясан цэнгэх болтугай. | Харанхуйд шулуун шударга зүрхтэй хүн рүү`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/psalter-texts.json#/Psalm 122:1-9/psalmPrayer`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `399`
- Data: `Эзэн Есүс, Та үхлээс амилахдаа Шашныг Өөрийн шинэ биеэ болгон хэлбэржүүлсэн бөгөөд үүнийг шинэ Йерусалим болгон Ариун Сүнсээрээ нэгтгэсэн билээ. Энэ өдрүүдэд бидэнд амар амгаланг хайрлана уу. Бүх үндэстнүүдийг Таны өгсөн билигт хишгүүдийг хуваалцуулахаар Шашиндаа цуглуулна уу. Ингэснээр тэд Танд эцэс төгсгөлгүй их талархаж, Таны мөнхийн хотод ирэх болно.`
- Geometry visual: `Эзэн Есүс, Та үхлээс амилахдаа Шашныг`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `Амилалтын цаг улирлын 4 дэх Ням гараг: Дууллыг төгсгөх залбирал | Христийн амар амгалан Та бүхний зүрх сэтгэлийг | Эзэн Есүс, Та үхлээс амилахдаа Шашныг | баяр баясгалангаар дүүргэх болтугай. Аллэлуяа! | Өөрийн шинэ биеэ болгон хэлбэржүүлсэн бөгөөд | Дуулал 122 үүнийг шинэ Йерусалим болгон Ариун Сүнсээрээ`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/psalter-texts.json#/Psalm 123:1-4/stanzas/0/8`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `323`
- Data: `Бидний сэтгэл`
- Geometry visual: `Бидний сэтгэл`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Psalm 124:1-8/psalmPrayer`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `324`
- Data: `Эзэн Есүс, Та шавь нартаа “Миний нэрээс болж бүгд та нарыг үзэн ядах болно. Гэсэн хэдий ч та нарын толгой дахь ширхэг үс чинь ч устахгүй” гэж зөгнөсөн билээ. Хавчлага шахалтын үед, Та Ариун Сүнсний тайтгарал болон хүч чадлаар биднийг хамгаалж, сэргээнэ үү. Тиймийн тул бид дайснуудаасаа чөлөөлөгдөж, Таны авралын тусламжийг магтах болно.`
- Geometry visual: `Эзэн Есүс, Та шавь нартаа "Миний нэрээс`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `Тэрээр ертөнцийн сууриас урьд | Дууллыг төгсгөх залбирал Христ дотор биднийг сонгосон ажээ. | Эзэн Есүс, Та шавь нартаа “Миний нэрээс | Тэрээр бидэнд Есүс Христээр дамжуулан | болж бүгд та нарыг үзэн ядах болно. Гэсэн хэдий ч | Өөрийн төлөөнөө`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/psalter-texts.json#/Psalm 124:1-8/stanzas/0/15`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `324`
- Data: `Тэнгэр ба газрыг бүтээсэн ЭЗЭНий нэрд бий.`
- Geometry visual: `Тэнгэр ба газрыг бүтээсэнЭЗЭНий нэрд бий.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `Урхи эвдэрсэн бөгөөд бид ч зугтсан. | Бидний тусламж бол Энэрэл хайрын дотор | Тэнгэр ба газрыг бүтээсэн ЭЗЭНий нэрд бий. Түүний оршихуйд биднийг | Ариун гэгээн, гэм нүгэлгүй байлгахын тулд | Эцэг, Хүү, Ариун Сүнсэнд жавхланг… | Тэрээр ертөнцийн сууриас урьд`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/psalter-texts.json#/Psalm 132:1-10/psalmPrayer`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `49`
- Data: `Эзэн Тэнгэрбурхан минь, Та бол бидний Хаан билээ. Биднийг зүрх сэтгэлдээ Таныг байлгах орон зайг олоход бидэнд тусална уу. Та тахилч нараа аврагчийн хүчээр хувцаслаж, ядуу зүдүү хүмүүсийг талхаар хооллож, Өөрийн ариун гэгээн гэрлийг бидний дээр мандуулна уу.`
- Geometry visual: `Эзэн Тэнгэрбурхан минь, Та биднийг хүлээн авна`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `биднийг аврахаар ирнэ. | Дөчин хоногийн цаг улирлын 1 дэх Ням гараг: Аяа | Эзэн Тэнгэрбурхан минь, Та биднийг хүлээн авна | уу. Эмтэрсэн, гэмшсэн зүрхээр өргөж буй бидний | энэ өдрийн тахил өргөлийг та таалан болгооно уу. | Дөчин хоногийн цаг улирлын 5 дахь Ням гараг:`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/psalter-texts.json#/Psalm 135:1-12/stanzas/1/3`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Учир нь тэр сайхан юм. –`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/psalter-texts.json#/Psalm 135:1-12/stanzas/3/5`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Далайнууд ба`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/psalter-texts.json#/Psalm 135:1-12/stanzas/5/1`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Хүний хүүхдээс,`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/psalter-texts.json#/Psalm 135:1-12/stanzas/5/6`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `  түүний бүх түшмэдэд илгээсэн юм.`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/psalter-texts.json#/Psalm 135:13-21/stanzas/0/2`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `385`
- Data: `Учир нь ЭЗЭН`
- Geometry visual: `Учир нь ЭЗЭН`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Psalm 139:1-18/stanzas/0/3`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `464`
- Data: `  Та хаа холоос миний санаа бодлуудыг ойлгодог.`
- Geometry visual: `Та хаа холоос миний санаа бодлуудыг`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `Миний сууж, босохыг ч хүртэл Та мэддэг юм. | дотрыг шалгадаг нь хүн бүрд замуудынх нь дагуу, | Та хаа холоос миний санаа бодлуудыг | үйлсийнх нь үр дүнгийн дагуу өгөхийн тулд юм.`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/psalter-texts.json#/Psalm 146:1-10/psalmPrayer`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `461`
- Data: `Сүр жавхлант, төгс хүчит Тэнгэрбурхан минь, Танд итгэсэн хүмүүс үнэхээр аз жаргалтай байдаг юм. Та бидний дээрээс Өөрийн гэрэлт туяагаа гийгүүлнэ үү. Ингэснээр бид Таныг үргэлж цэвэр ариун зүрх сэтгэлээрээ хайрлах болно.`
- Geometry visual: `Сүр жавхлант, төгс хүчит Тэнгэрбурхан минь,`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `Дууллыг төгсгөх залбирал | байх хэрэгтэй гэсэн утгатай (Арнобиус). | Сүр жавхлант, төгс хүчит Тэнгэрбурхан минь, | Сэтгэл минь ээ, ЭЗЭНийг магтагтун! Танд итгэсэн хүмүүс үнэхээр аз жаргалтай байдаг`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/psalter-texts.json#/Psalm 148:1-14/psalmPrayer`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `301`
- Data: `Эзэн Та, тэнгэрэлч нарын эрх мэдлээр өндөрт өргөмжлөгдөн, дэлхийн бүх бүтээлүүдээр өөрсдийн замаар нь магтан алдаршуулагддаг. Та тэнгэрлэг магтаалын сүр жавхлангаар дүүрэн боловч дэлхийн Танд үзүүлсэн бодит хайранд баясдаг. Тэнгэр газар хамтдаа Таныг Хаан хэмээн алдаршуулах болтугай. Тэнгэрт дуулсан магтаал нь дэлхий дээрх бүх бүтээлүүдийн сэтгэл зүрхэнд цуурайтах болтугай.`
- Geometry visual: `Эзэн Та, тэнгэрэлч нарын эрх мэдлээр өндөрт`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `Тэнгэрийн дээрх ус аа, Түүнийг магтагтун! | Дууллыг төгсгөх залбирал | Түүний тушааснаар тэд бүтээгдсэн тул Эзэн Та, тэнгэрэлч нарын эрх мэдлээр өндөрт | Тэднээр ЭЗЭНий нэрийг магтуул. өргөмжлөгдөн, дэлхийн бүх бүтээлүүдээр | Бас үүрд мөнхөд тэднийг байрлуулж, өөрсдийн замаар нь магтан алдаршуулагддаг. Та | Хэзээ ч өнгөрөн одохгүй зарлигийг тэнгэрлэг магтаалын сүр жавхлангаар дүүрэн`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/psalter-texts.json#/Psalm 16:1-11/stanzas/0/26`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `536`
- Data: `Учир нь Та миний сэтгэлийг Үхэгсдийн`
- Geometry visual: `Учир нь Та миний сэтгэлийг Үхэгсдийн`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Psalm 16:1-11/stanzas/0/28`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `536`
- Data: `Та Өөрийн Ариун Нэгэнд ч ялзрахыг`
- Geometry visual: `Та Өөрийн Ариун Нэгэнд ч ялзрахыг`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Psalm 16:1-11/stanzas/0/31`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `537`
- Data: `Таны өмнө л баяр хөөр дүүрэн байдаг.`
- Geometry visual: `Таны өмнө л баяр хөөр дүүрэн байдаг.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Psalm 20:2-8/psalmPrayer`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `102`
- Data: `Эзэн, Та загалмай дээрх Хүүгийнхээ төгс золиослолыг хүлээж авсан. Биднийг гай зовлонгийн үед минь сонсож, Түүний нэрийн ид хүчээр хамгаална уу. Тэгвэл дэлхий дээр Түүний тэмцэлд оролцож буй бид Түүний ялалтад оролцох зохистой болох болно.`
- Geometry visual: `Эзэн, Та загалмай дээрх Хүүгийнхээ`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `агуу их юм. | Дууллыг төгсгөх залбирал Та түүний дээр алдар, сүр хүчийг өмсгөсөн. | Эзэн, Та загалмай дээрх Хүүгийнхээ Учир нь Та түүнийг мөнхөд | төгс золиослолыг хүлээж авсан. Биднийг гай ерөөлтэй болгодог.–`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/psalter-texts.json#/Psalm 27:7-14/stanzas/0/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `118`
- Data: `  сонсож,`
- Geometry visual: `сонсож,`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Psalm 29:1-10/stanzas/0/15`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `80`
- Data: `  Тийм ээ, ЭЗЭН`
- Geometry visual: `Тийм ээ, ЭЗЭН`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Psalm 29:1-10/stanzas/0/20`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `80`
- Data: `ЭЗЭНий дуу хоолой`
- Geometry visual: `ЭЗЭНий дуу хоолой`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Psalm 29:1-10/stanzas/0/22`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `80`
- Data: `ЭЗЭНий дуу хоолой`
- Geometry visual: `ЭЗЭНий дуу хоолой`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Psalm 29:1-10/stanzas/0/8`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `80`
- Data: `ЭЗЭНий дуу хоолой`
- Geometry visual: `ЭЗЭНий дуу хоолой`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Psalm 36:6-13/stanzas/1/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `110`
- Data: `Та тэднийг`
- Geometry visual: `Та тэднийг`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Psalm 4/stanzas/0/9`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `513`
- Data: `Харин ЭЗЭН`
- Geometry visual: `Харин ЭЗЭН`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Psalm 46:2-12/stanzas/0/9`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `153`
- Data: `Хамгийн Дээд Нэгэний Ариун оршихуйг баясгадаг урсгалт гол бий.`
- Geometry visual: `Хамгийн Дээд Нэгэний Ариун оршихуйг`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `Тэнгэрбурханы хотыг, | Дууллыг төгсгөх залбирал | Хамгийн Дээд Нэгэний Ариун оршихуйг | Бие ба сүнсийг эдгээгч Эзэн Есүс минь, Та | баясгадагурсгалт гол бий. | “энэрэнгүй хүмүүс ерөөлтэй еэ! Учир нь тэд`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/psalter-texts.json#/Psalm 51:3-19/stanzas/1/28`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `143`
- Data: `Йерусалимын хэрмийг барьж босгооч.`
- Geometry visual: `Йерусалимын хэрмийг барьж босгооч. -`
- Omitted-tail signal: `-`
- Raw interleaved fragment: `Өөрийн тааллаар Сионд сайныг үйлдээч. | Би цаснаас цагаан болно. | Йерусалимын хэрмийг барьж босгооч. –`
- Reason: stored value is a strict prefix ending inside a geometry-reconstructed physical line; nine-gate human adjudication required
- Nine-gate adjudication: CLEAR rejected: positive-tail/boundary gates fail; the only trailing glyph is a layout dash after a complete sentence, not an omitted character or token from the psalm line.

### `src/data/loth/psalter-texts.json#/Psalm 57:2-12/stanzas/0/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `125`
- Data: `Намайг өршөөгөөч`
- Geometry visual: `Намайг өршөөгөөч`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Psalm 57:2-12/stanzas/0/32`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `126`
- Data: `Таныг магтан дуулна.`
- Geometry visual: `Таныг магтан дуулна.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Psalm 57:2-12/stanzas/0/35`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `126`
- Data: `Аяа Тэнгэрбурхан,`
- Geometry visual: `Аяа Тэнгэрбурхан,`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Psalm 5:2-10, 12-13/stanzas/0/4`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `77`
- Data: `Учир нь Тандаа би залбирнам. ЭЗЭН,`
- Geometry visual: `Учир нь Тандаа би залбирнам.ЭЗЭН,`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `Хашхиран тусламж гуйхыг минь сонсооч, | Өглөөний даатгал залбирал | Учир нь Тандаа би залбирнам.ЭЗЭН, | Хэрэв өглөөний хурал урих дуудлагаар эхэлбэл | Өглөөд Та дуу хоолойг минь сонсоно. | доор дурдсан бадаг болон хариуг нь үл уншина.`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/psalter-texts.json#/Psalm 5:2-10, 12-13/stanzas/1/10`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `  Таны нэрийг хайрлагчид Танд баясна.`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/psalter-texts.json#/Psalm 5:2-10, 12-13/stanzas/1/9`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `  Та хамгаалсан учир мөнхөд баярлан дуулаг.`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/psalter-texts.json#/Psalm 63:2-9/stanzas/1/0`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Ийнхүү би амьддаа Таныг магтана.`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/psalter-texts.json#/Psalm 72:1-11/stanzas/0/24`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Шеба хийгээд Себагийно хаад`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/psalter-texts.json#/Psalm 80:2-8, 15-20/stanzas/0/17`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `246`
- Data: `Түг түмдийн Тэнгэрбурхан,`
- Geometry visual: `Түг түмдийн Тэнгэрбурхан,`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Psalm 80:2-8, 15-20/stanzas/0/6`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `246`
- Data: `Түг түмдийн Тэнгэрбурхан,`
- Geometry visual: `Түг түмдийн Тэнгэрбурхан,`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Psalm 81:2-11/stanzas/6/4`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `251`
- Data: `Хаднаас гарсан балаар Би хангах байсан”.`
- Geometry visual: `Хаднаас гарсан балаар Би хангах байсан.".`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `Тэрээр Египет нутаг даяар явахдаа Тэдний цаг мөнхөд үргэлжлэх байсан. | Иосефын дотор зарчмыг тогтоосон. Дээд зэргийн буудайгаар тэднийг хооллож, | Хаднаас гарсан балаар Би хангах байсан.”. | Би мэдэхгүй хэлээ сонсов. | “Би мөрнөөс нь ачааг буулгаж, Эцэг, Хүү, Ариун Сүнсэнд жавхланг… | Гарыг нь сагснаас чөлөөлөв.`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/psalter-texts.json#/Psalm 88:2-19/stanzas/0/30`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `317`
- Data: `уу?`
- Geometry visual: `уу?`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Psalm 91:1-16/stanzas/0/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `517`
- Data: `нэгэн`
- Geometry visual: `нэгэн`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Psalm 91:1-16/stanzas/0/22`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `25`
- Data: `юм.`
- Geometry visual: `юм.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Psalm 96:1-13/stanzas/0/9`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `317`
- Data: `Учир нь хүмүүсийн бүх бурхад бол – хоосон шүтээнүүд,`
- Geometry visual: `Учир нь хүмүүсийн бүх бурхад бол -`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `Түүнээс эмээвэл зохино. | Дахин хэзээ ч тэд дайтахад суралцахгүй. | Учир нь хүмүүсийн бүх бурхад бол –`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/psalter-texts.json#/Revelation 11:17-18; 12:10b-12a/stanzas/0/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `137`
- Data: `Тандаа бид бид талархал өргөе.`
- Geometry visual: `Тандаа бид бид талархал өргөе.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Revelation 11:17-18; 12:10b-12a/stanzas/0/18`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `137`
- Data: `Тарчлалтынхаа гэрчлэлтээр ялсан юм.`
- Geometry visual: `Тарчлалтынхаа гэрчлэлтээр ялсан юм.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Revelation 19:1-7/stanzas/0/0`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `52`
- Data: `Аллэлуяа!`
- Geometry visual: `Аллэлуяа!`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Revelation 19:1-7/stanzas/0/2`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `418`
- Data: `  хийгээд сүр жавхлан байдаг юм.`
- Geometry visual: `хийгээд сүр жавхлан байдаг. Аллэлуяа!`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `Тэнгэрбурханд аврал нигүүлсэл, хүчин чадал | Х. Аллэлуяа! (аллэлуяа!). | хийгээд сүр жавхлан байдаг. Аллэлуяа! | Аллэлуяа! | Оройн даатгал залбирлыг дуулах тохиолдолд доор | Хурганы хуримын өдөр боллоо.`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/psalter-texts.json#/Revelation 19:1-7/stanzas/0/4`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `71`
- Data: `Түүний шүүлт шулуун шударга ба үнэн зөв`
- Geometry visual: `Түүний шүүлт шулуун шударга ба үнэн зөв`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Revelation 19:1-7/stanzas/0/5`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `25`
- Data: `  юм.`
- Geometry visual: `юм.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Revelation 19:1-7/stanzas/1/0`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `52`
- Data: `Аллэлуяа!`
- Geometry visual: `Аллэлуяа!`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Revelation 19:1-7/stanzas/2/0`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `52`
- Data: `Аллэлуяа!`
- Geometry visual: `Аллэлуяа!`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Revelation 19:1-7/stanzas/3/0`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `52`
- Data: `Аллэлуяа!`
- Geometry visual: `Аллэлуяа!`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Revelation 4:11; 5:9-10, 12/stanzas/0/0`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `104`
- Data: `  Бидний Эзэн бөгөөд Тэнгэрбурхан минь,`
- Geometry visual: `Бидний Эзэн бөгөөд Тэнгэрбурхан минь,`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Tobit 13:1-8/stanzas/0/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `82`
- Data: `  магтагдах болтугай.`
- Geometry visual: `магтагдах болтугай.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Tobit 13:1-8/stanzas/0/3`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `82`
- Data: `  магтагдах болтугай.`
- Geometry visual: `магтагдах болтугай.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Tobit 13:1-8/stanzas/9/3`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `95`
- Data: `Бүх хүмүүс`
- Geometry visual: `Бүх хүмүүс`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.json#/Tobit 13:8-11, 13-15/stanzas/6/2`

- Disposition: `REVIEW_DIVERGENCE`
- Book page: `492`
- Data: `Учир нь тэд цугларч, шударгатнуудыг Эзэнийг`
- Geometry visual: `Учир нь тэд цугларч, шударгатнуудын Эзэнийг`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `баярлан цэнгэгтүн. | Тэрээр гулдан хаалгануудын чинь | Учир нь тэд цугларч, шударгатнуудын Эзэнийг | хөндлүүдийг бэхжүүлэн | ерөөн магтах болно. | Та нарын дундах хөвгүүдийг чинь`
- Reason: anchored prefix found but whole-value alignment fails (substitution, reorder, contamination, or wrap ambiguity)

### `src/data/loth/psalter-texts.json#/Tobit 13:8-11, 13-15/stanzas/8/0`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Сэтгэл минь Эзэний, агуу Хааныг`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/psalter-texts.json#/Wisdom 9:1-6, 9-11/stanzas/2/3`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Хэн ч бас гэж тооцогдох болно.`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/psalter-texts.json#/Wisdom 9:1-6, 9-11/stanzas/3/2`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Таны ертөнцийг бүтээсэн үед`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/psalter-texts.json#/Wisdom 9:1-6, 9-11/stanzas/4/2`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Түүний буулгаж явуулна уу.`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/psalter-texts.json#/Wisdom 9:1-6, 9-11/stanzas/5/2`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `Тэр миний ажил үйлсийг хааллгаар удирдаж,`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

### `src/data/loth/psalter-texts.json#/Wisdom 9:1-6, 9-11/stanzas/5/4`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `10`
- Data: `  болно.`
- Geometry visual: `болно.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/0/0`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `   Эзэний хамаг бүтээлүүд ээ,`
- Geometry visual: `Эзэний хамаг бүтээлүүд ээ,`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/0/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `      Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/1/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `      Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/11/0`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `     Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/11/10`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `      Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/11/2`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `     Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/11/3`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `62`
- Data: `  Хамаг эх булаг аа,`
- Geometry visual: `Хамаг эх булаг аа,`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/11/4`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `     Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/11/6`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `      Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/11/8`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `      Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/14/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `     Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/15/0`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `62`
- Data: `  Израил аа,`
- Geometry visual: `Израил аа,`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/15/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `     Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/15/3`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `     Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/15/4`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `62`
- Data: `  Эзэний зардас нар аа,`
- Geometry visual: `Эзэний зардас нар аа,`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/15/5`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `     Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/16/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `     Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/17/0`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `      Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/17/10`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `63`
- Data: `   Таныг магтаж,`
- Geometry visual: `Таныг магтаж,`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/17/11`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `63`
- Data: `      бүгдийн дээр үүрд мөнх өргөмжлөх`
- Geometry visual: `бүгдийн дээр үүрд мөнх өргөмжлөх`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/18/0`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `56`
- Data: `      болтугай.`
- Geometry visual: `болтугай.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/2/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `      Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/2/3`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `      Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/2/5`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `      Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/4/0`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `   Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/4/2`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `   Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/5/0`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `   Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/6/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `   Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/7/0`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `   Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/7/2`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `   Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/7/4`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `   Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/7/6`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `   Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/7/8`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `   Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/8/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `   Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/8/3`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `   Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/8/5`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `   Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Daniel 3:57-88, 56/stanzas/9/1`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `60`
- Data: `   Эзэнийг магтагтун.`
- Geometry visual: `Эзэнийг магтагтун.`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Psalm 63:2-9/stanzas/1/2`

- Disposition: `REVIEW_GEOMETRY`
- Book page: `58`
- Data: `   Учир нь хайр энэрэл тань`
- Geometry visual: `Учир нь хайр энэрэл тань`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: same value has both complete-unit and strict-prefix PDF occurrences; address identity is not proven by the available page/structural hints

### `src/data/loth/psalter-texts.pilot.json#/Psalm 63:2-9/stanzas/4/0`

- Disposition: `SOURCE_NOT_FOUND`
- Book page: `None`
- Data: `   Ийнхүү би амьддаа Таныг магтана.`
- Geometry visual: `None`
- Omitted-tail signal: `None`
- Raw interleaved fragment: `None`
- Reason: no 24-character geometry-stream anchor found; no PDF unit can be claimed without inventing identity

