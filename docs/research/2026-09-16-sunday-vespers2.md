# 조사 리포트 — 주일 저녁기도 고유부(`SUN.vespers` / `SUN.vespers2`) 구조 규명 + 성탄 시기 토요일 저녁 2건

- **작성**: 2026-09-16, main `f0be94f` 기준, **읽기 전용 조사** (소스·데이터 무수정)
- **판정 도구**: 인쇄면 렌더 (`pdftoppm -r 200`, 물리 페이지 = ⌈책 페이지 / 2⌉, 한 물리 페이지에 좌=짝수·우=홀수 책 페이지 2쪽) → PIL 크롭 → Read 로 직접 판독. 추출 텍스트(`parsed_data/full_pdf.txt`)는 34주 전수 대조용 보조.
- **앱 출력**: 프로덕션 API `https://divine-office.vercel.app/api/loth/<date>/<hour>` + 로컬 main 의 `src/lib` CJS transpile 후 `assembleHour` 직접 호출 (`scratchpad/vsp2/probe-*.js`). 두 출력 일치 확인.
- **스크래치**: `/tmp/claude-1000/-home-min-myproject-divineoffice/6c8f87aa-bf28-48e6-b28b-6072578929fb/scratchpad/vsp2/` (이하 `vsp2/`)

---

## 0. 결론 3줄

1. **조사 1 — 버그.** 책은 모든 주일 고유부를 `1 дүгээр Оройн даатгал залбирал`(제1저녁기도) / `Өглөөний даатгал залбирал`(아침기도) / `2 дугаар Оройн даатгал залбирал`(제2저녁기도) 로 조판한다 — 가/나/다해 구분은 책 어디에도 없다. 데이터의 `SUN.vespers` = 제1저녁기도(EP I), `SUN.vespers2` = 제2저녁기도(EP II) 이고, 앱은 **주일 당일 `/vespers`(EP II) 에 EP I 후렴을 렌더**한다. 2026년 52 주일 중 **41회** 오류(38회 후렴 오류 + 3회 데이터 공백), 대림·사순·부활 16 주일은 독서·응송·청원까지 EP I 것. `sundayCycle` 은 무관(책에 해 변형 없음).
2. **조사 2 — 버그 (코드 2 + 데이터 1).** 2026-01-03(공현 전야)·01-04(공현 당일 아침/저녁/제1저녁)·01-10(세례 전야, legacy URL) 에 후렴·본기도 부재. 원인: ① `resolveSpecialKey` 가 romcal 명칭 `"Epiphany"` 를 매칭 못 함(`'the epiphany'`/`'epiphany of the lord'` 만 허용) → 공현 고유부 전체 미도달, ② 토→주일 분기가 토요일 자신의 `day.name`/`dateStr` 로 특수키를 풀어 세례·공현 키에 도달 못 함, ③ `christmas.json` 의 `epiphany` ↔ `epiphanyWeek` 셀 내용이 뒤바뀌어 있고 공현 EP I 후렴(p.609 «Одыг хараад мэргэд…») 은 데이터에 없음.
3. **조사 3 — 버그(경미, legacy URL 한정) / 제품 결정 불필요.** 카드 UI 는 정상(12-26 카드에서 저녁기도 제거 → 12-27 `firstVespers` 카드가 성가정 EP I 을 정확히 렌더). `/2026-12-26/vespers` 직접 URL 만 미승격(성탄 8일 저녁을 렌더). 규범(전례일 순위표 II.5 주님 축일 > II.7 성인 축일 > II.9 성탄 8일 내 평일, 보편규범 61항) 과 책 p.599 적색 규정 모두 성가정 EP I 이 우선함을 뒷받침. 원인은 FR-156 Path 2 가 `SOLEMNITY` 로 게이트돼 FEAST 특수키(성가정·세례) 를 배제하는 것.

---

## 1. 조사 1 — `SUN.vespers` vs `SUN.vespers2` 의 정체

### 1-1. 인쇄면 증거 (직접 판독)

| 책 p. | 물리 p. | 크롭 파일 (`vsp2/`) | 판독한 헤더 원문 (그대로) | 내용 |
|---|---|---|---|---|
| 797 | 399 (우) | `crop-p797-ot24-ep1-mp.png` | **ЖИРИЙН ЦАГ УЛИРЛЫН ХОРИН ДӨРӨВ ДЭХ НЯМ ГАРАГ** / Дууллын залбирал: 4 дүгээр долоо хоног / **1 дүгээр Оройн даатгал залбирал** / МАРИАГИЙН МАГТААЛ / Шад магтаал Есүс Петрт айлдсан нь: “Би чамд долоон удаа бус, харин дал дахин долоон удаа” гэж хэлье. / **Өглөөний даатгал залбирал** / ЗАХАРИАГИЙН МАГТААЛ / Шад магтаал “Хэн Миний төлөө, Сайнмэдээний төлөө амиа алдана…” / ТӨГСГӨЛИЙН ДААТГАЛ ЗАЛБИРАЛ / Сонголтот залбирал | 24주일 EP I 후렴 = 데이터 `weeks.24.SUN.vespers.gospelCanticleAntiphon` (p.797) ✓ |
| 798 | 400 (좌) | `crop-p798-ot24-ep2.png` | **2 дугаар Оройн даатгал залбирал** / МАРИАГИЙН МАГТААЛ / Шад магтаал Би та нарт хэлье. “Нэг нүгэлтэн гэмшвэл Тэнгэрбурханы тэнгэрэлч нарын оршихуйд баяр хөөр болно” гэв. | 24주일 EP II 후렴 = 데이터 `weeks.24.SUN.vespers2` (p.798) ✓ |
| 759 | 380 (우) | `crop-p759-ot5-ep1-mp.png` | **ЖИРИЙН ЦАГ УЛИРЛЫН ТАВ ДАХЬ НЯМ ГАРАГ** / **1 дүгээр Оройн даатгал залбирал** / Шад магтаал Та нар ертөнцийн гэрэл мөн… / **Өглөөний даатгал залбирал** / Шад магтаал Үүр шөнөөр Есүс босоод… / Төгсгөлийн… / Сонголтот… | 5주일 EP I = `weeks.5.SUN.vespers` ✓ |
| 760 | 381 (좌) | `crop-p760-ot5-ep2.png` | **2 дугаар Оройн даатгал залбирал** / Шад магтаал Эзэнтэн, бид шөнөжингөө зүдэж зүтгээд юу ч бариагүй, гэхдээ хэлснээр Тань тороо доошлуулъя гэв. | 5주일 EP II = `weeks.5.SUN.vespers2` ✓ |
| 774 | 388 (좌) | `crop-p774-ot12-ep2.png` | **2 дугаар Оройн даатгал залбирал** / Шад магтаал Хэн нэг нь Миний араас дагахыг хүсвэл тэр өөрийгөө үгүйсгэн, загалмайгаа авч Намайг дага. | 12주일 EP II — **책에 있으나 데이터 없음** |
| 780 | 391 (좌) | `crop-p780-ot15-ep2.png` | **2 дугаар Оройн даатгал залбирал** / Шад магтаал “Багш аа, хуулийн аль тушаал нь агуу вэ?” гэв. Есүс түүнд -“Чи Тэнгэрбурхан Эзэнээ бүх зүрх, бүх сэтгэл, бүх оюун ухаанаараа хайрла.” гэж хэлжээ. | 15주일 EP II — **책에 있으나 데이터에는 16주 `vespers2` 로 잘못 들어감** |
| 782 | 392 (좌) | `crop-p782-ot16-ep2.png` | **2 дугаар Оройн даатгал залбирал** / Шад магтаал Өөрөөс нь булаагдашгүй сайныг Мариа сонгон авчээ. | 16주일 EP II — **데이터 없음(16주 `vespers2` 는 p.780 내용)** |
| 800 | 401 (좌) | `crop-p800-ot25-ep2.png` | **2 дугаар Оройн даатгал залбирал** / Шад магтаал Ямар ч зарц, хоёр эзэнд үйлчилж чадахгүй. Та нар Тэнгэрбурхан, эд баялаг хоёрт зэрэг үйлчилж чадахгүй. | 25주일 EP II — **책에 있으나 데이터 없음** |
| 753 | 377 (우) | (추출 텍스트 L26067) | ЖИРИЙН ЦАГ УЛИРЛЫН НЭГ ДЭХ ДОЛОО ХОНОГ / «Жирийн цаг улирлын нэг дэх Ням гарагийн оронд Эзэний Ариун Угаал хэмээх баяр (х. 616) байдаг.» / Төгсгөлийн даатгал залбирал | 1주일은 주일 고유부 자체가 없음(세례 축일로 대체) — `vespers2` 부재가 **정상** |
| 818 | 410 (좌) | `crop-p818-ctk-ep2.png` | **2 дугаар Оройн даатгал залбирал** / Шад магтаал “Тэнгэр газар дээрх бүх эрх мэдлийг Надад өгсөн” хэмээн Эзэн айлдаж байна. | 그리스도왕 EP II (데이터 `weeks.34.SUN.vespers2` 페이지값 816 은 오기, 실제 818) |

가/나/다해 표기 검색: 책 전체 추출 텍스트에서 `A/B/C жил`, `(A)`, `мөчлөг`, `цикл` 등 어떤 형태의 해 표기도 **0건** (`мөчлөг` 1건은 서문 p.16 의 일반 문장). 헤더는 전부 시간경 기준.

> **관찰(판정과 무관)**: 표본 6주(5·6·23·24·25·26주) 에서 EP I 후렴은 가해 복음(마태), 아침기도는 나해(마르코), EP II 는 다해(루카) 본문과 대응한다. 몽골어 편집진이 라틴 LH 의 3개년 후렴을 시간경 3곳에 분배한 흔적으로 보이나, **책은 이를 시간경으로 지정**하므로 앱도 시간경으로 골라야 한다(책 재현 원칙). `sundayCycle` 은 `calendar.ts` 에서 계산만 되고 어디서도 쓰이지 않으며, 그대로 두는 것이 맞다.

### 1-2. 다른 시기도 같은 구조인가 — 표본 렌더 확인

| 시기 | EP I | EP II | 크롭 |
|---|---|---|---|
| 대림 (한 주 템플릿, p.548 «Ирэлтийн цаг улиралд зориулсан нэг л долоо хоногийн даатгал залбирлуудын эх бичвэр байдаг. Эдгээрийг … турш давтан уншиж болно») | p.549 **НЯМ ГАРАГ / 1 дүгээр Оройн даатгал залбирал** — 독서 1 Тесалоник 5:19-24, 응송, 후렴 «Алсаас ирж буй Эзэнийг харагтун…», 청원 | p.553 **2 дугаар Оройн даатгал залбирал** — 독서 Филиппой 4:4-7, 응송, p.554 후렴 «Мариа, бүү ай…», 청원, 본기도 | `crop-p549-advent-ep1.png`, `crop-p553-advent-ep2-header.png`, `crop-p554-advent-ep2-ant.png` |
| 사순 (한 주 템플릿, L21356 동일 문구) | p.618-619 **НЯМ ГАРАГ / 1 дүгээр…** 독서 2 Коринт 6:1-4а, 후렴 «Хүн зөвхөн талхаар бус…» | p.623 **2 дугаар…** 독서 1 Коринт 9:24-27, p.624 후렴 «Мөнхийн Аврагч минь…» | `crop-p619-lent1-ep1.png`, `crop-p624-lent1-ep2.png` |
| 부활 (한 주 템플릿, L24263) | p.700-701 **НЯМ ГАРАГ / 1 дүгээр…** 독서 1 Петр 2:9-10, 후렴 «Би Эцэгээсээ гуйхад…» | p.705 **2 дугаар…** 독서 Еврей 10:12-14, p.706 후렴 «Хэрэв хэн нэг нь Намайг хайрлавал…» | (추출 텍스트 확인) |
| 성가정 | p.599 **1 дүгээр Оройн даатгал залбирал** «Есүс хүү Йерусалимд үлджээ…» | p.601 **2 дугаар…** «Хүү минь, Чи юунд бидэнд ингэж хандав?…» | `crop-p599-holyfamily-ep1.png`, `crop-p601-holyfamily-ep2.png` |
| 세례 | p.616 **1 дүгээр…** «Бидний Аврагч Ариун угаалыг хүртэхээр ирсэн…» | p.617 **2 дугаар…** «Христ Есүс биднийг хайрласан…» | `crop-p616-baptism-ep1.png`, `crop-p617-baptism-ep2.png` |
| 부활 주일 | (없음 — 성야가 대체) | p.696-697 **Оройн даатгал залбирал** (번호 없음) «Долоо хоногийн эхний өдөр буюу тэр өдрийн үдэш…» | — `easterSunday.SUN.vespers` 가 EP II 라 **정상** |

→ 전 시기 동일: `vespers` = EP I, `vespers2` = EP II. 대림·사순·부활 템플릿의 `vespers2` 는 독서·응송·청원·대체본기도까지 완비, 연중·성탄 축일의 `vespers2` 는 후렴 + (EP I 과 동일한) 본기도만 보유.

### 1-3. 데이터 보유 현황

| 파일 | `SUN.vespers2` 보유 | 부재 | 비고 |
|---|---|---|---|
| `ordinary-time.json` | 2–11, 13, 14, 16–24, 26–34 (30주) + trinitySunday/corpusChristi/sacredHeart/christTheKing | **1**(정상: 세례로 대체), **12·15·25**(책 p.774/780/800 에 인쇄 — 추출·큐레이션 누락) | **16주 `vespers2` 내용 오류**(p.780 = 15주 EP II 가 들어감, 진짜 16주 EP II p.782 부재). 페이지값 오기: `6.vespers.gospelCanticleAntiphonPage=647`(→761), `20.vespers2…Page=751`(→790), `34.vespers2…Page=816`(→818). 34주 셀은 christTheKing 과 중복 |
| `advent.json` | w1 | w2–4 는 `firstVespers` 만 → 로더가 w1 로 폴백(책이 한 주 템플릿이므로 의도와 일치) | |
| `lent.json` | w1, w6 | w2–5 → w1 폴백 | |
| `easter.json` | w1, ascension, pentecost | w2–7 → w1 폴백; easterSunday 는 `vespers` 가 EP II | |
| `christmas.json` | dec25, holyFamily, baptism, epiphanyWeek | jan1(EP II 는 `solemnities.json 01-01.vespers2` 로 별도 구제됨), octave, epiphany | `epiphany`↔`epiphanyWeek` 내용 전도(§2) |

34주 전수 대조(추출 텍스트 ↔ 데이터, `vsp2/ot-ep2-conformance.txt`): EP I 후렴 34/34 일치(10주는 마침표만 차이), EP II 후렴 29 MATCH · 3 NO-DATA(12·15·25) · 1 DIFF(16).

### 1-4. 앱 현재 출력 vs 기대 (2026)

코드 경로: `loth-service.ts` L200-215 `getSeasonHourPropers(season, week, 'SUN', 'vespers')` → GOAL #20 스왑은 `day.rank==='SOLEMNITY' && resolveSpecialKey(...)!=null` 일 때만 `getSeasonVespers2` 호출, `propers-loader.ts` L310 `getSeasonVespers2` 는 특수키 전용("never for a plain weekday/Sunday" 주석 — 이 전제가 틀림). 토요일 `/vespers` 와 주일 `/firstVespers` 는 `weeks[N].SUN.vespers`(EP I) 를 쓰므로 **정확**하고, 주일 당일 `/vespers` 만 같은 셀을 재사용해 틀린다.

| 날짜 | 앱 `/vespers` 후렴 (프로덕션 = 로컬) | 책 EP II (기대) |
|---|---|---|
| 2026-02-08 연중 5주일 | «Та нар ертөнцийн гэрэл мөн…» p.759 (EP I) | p.760 «Эзэнтэн, бид шөнөжингөө зүдэж…» |
| 2026-06-21 연중 12주일 | «Хүмүүсийн өмнө Намайг хүлээн зөвшөөрөгч…» p.773 (EP I) | p.774 «Хэн нэг нь Миний араас дагахыг…» (데이터 없음) |
| 2026-09-20 연중 25주일 | «Та нар усан үзмийн талбай руу яв…» p.799 (EP I) | p.800 «Ямар ч зарц, хоёр эзэнд…» (데이터 없음) |
| 2026-11-29 대림 1주일 | 독서 1 Thess 5:19-24 p.548 + «Алсаас ирж буй…» p.549 (EP I 일습) | p.553 Филиппой 4:4-7 + p.554 «Мариа, бүү ай…» |
| 2026-02-22 사순 1주일 | 독서 2 Cor 6:1-4a p.618 + «Хүн зөвхөн талхаар…» p.619 | p.623 1 Коринт 9:24-27 + p.624 «Мөнхийн Аврагч минь…» |
| 2026-04-12 부활 2주일 | 독서 1 Pet 2:9-10 p.700 + «Би Эцэгээсээ гуйхад…» p.701 | p.705 Еврей 10:12-14 + p.706 «Хэрэв хэн нэг нь…» |
| 2026-12-27 성가정 (FEAST) | «Есүс хүү Йерусалимд үлджээ…» p.599 | p.601 «Хүү минь, Чи юунд…» (특수키 있어도 rank FEAST 라 스왑 불발) |
| 2026-01-11 세례 (FEAST) | «Бидний Аврагч Ариун угаалыг…» p.616 | p.617 «Христ Есүс биднийг хайрласан…» |
| 2026-09-13 연중 24주일 | 성십자가 현양 EP I (p.835, `effectiveLiturgicalDay` 노출) | 동일 — 월요일 축일 전야 승격, **정상** |
| 2026-05-24 성령강림 / 05-31 삼위 / 06-07 성체 / 11-22 그리스도왕 | `vespers2` | 동일, **정상** (GOAL #20) |

전 주일 분류 (`vsp2/sundays-2026.txt`, 52 주일):

| 분류 | 횟수 |
|---|---|
| EP I 후렴 렌더, `vespers2` 존재 → **오류** | **38** (연중 20 + 대림 4 + 사순 6 + 부활 6 + 성가정 + 세례) |
| EP I 렌더, `vespers2` 데이터 없음 → **오류(데이터)** | **3** (06-21 w12, 07-12 w15, 09-20 w25) |
| `vespers2` 정상 | 4 (이동 대축일) + 1 (부활 주일 `vespers`=EP II) + 1 (11-01 모든성인 sanctoral vespers2) |
| 월요일 대축일/축일 전야로 승격 (정상) | 4 (02-01, 06-28, 09-13, 11-08) |
| 후렴·본기도 공백 | 1 (01-04 공현 — §2) |

→ **연 41회** 오류. 대림·사순·부활 16회는 독서·응송·청원까지 EP I.

### 1-5. 수정 방향

**A안 (권장) — 코드: 평범한 주일 당일 EP II 스왑을 기존 GOAL #20 경로에 일반화 + 데이터 4건 보정.**
- `assembleHour`: `hour==='vespers' && dayOfWeek==='SUN'` 이고 전야 승격(FR-156 Path 1/2, `keepsSundayEveningPrayerII` 포함) 이 발화하지 않은 경우, 시즌/주차의 `SUN.vespers2` 를 조회해 `seasonPropers = { ...vespers, ...vespers2 }` 로 **오버레이**(연중 `vespers2` 에는 `alternativeConcludingPrayer` 가 없으므로 통째 교체하면 대체 본기도가 사라짐; 대림·사순·부활 템플릿은 `vespers2` 가 완비라 오버레이가 곧 교체). FEAST 특수키(holyFamily·baptism) 도 같은 경로(현재 `rank==='SOLEMNITY'` 게이트를 "특수키 or 주일" 로).
- `propers-loader.ts`: `getSeasonVespers2` 에 주차 폴백(`weeks[N].SUN.vespers2 ?? weeks['1'].SUN.vespers2`) 추가 — 대림 w2-4·사순 w2-5·부활 w2-7 이 w1 템플릿 EP II 를 받도록(책 규정과 일치). 로더 주석("never for a plain Sunday") 갱신.
- rich: `seasonalRichHour='vespers2'` → 기존 `-vespers2` 파일 부재 시 `-vespers` 폴백 + `applyRichSourceParity` 가 이미 있음. 단 `seasonalCellForRich` 가 `getSeasonVespers2` 를 호출하므로 위 폴백 확장이 없으면 대림/사순/부활 w2+ 에서 rich 가 통째로 탈락(plain 으로 표시)하는 정도이지 오염은 아님. 연중 30주는 `-vespers2` rich 가 없고 본기도 텍스트가 EP I 과 동일하므로 `-vespers` rich 가 parity 로 살아남음.
- 데이터: `ordinary-time.json` 12·15·25 `vespers2` 추가(p.774/780/800), 16 `vespers2` 를 p.782 «Өөрөөс нь булаагдашгүй сайныг Мариа сонгон авчээ.» 로 교체, 페이지값 3건(6/20/34) 교정. 인쇄면 크롭 기준으로 입력(추출 텍스트 금지 규칙).
- 회귀 범위: 주일 당일 `/vespers` 만 바뀐다(2026: 41 날짜). 토요일 `/vespers`·주일 `/firstVespers`·`/lauds`·이동 대축일 EP II·전야 승격은 무변경이어야 함 → 메모리 규칙대로 main↔브랜치 **전일자 assembleHour 지문 diff 스윕**으로 diff 집합이 정확히 "주일 vespers" 로 닫히는지 확인. 기존 테스트 중 주일 `/vespers` 후렴을 EP I 로 고정한 단언은 없음(`loth-service.test.ts` L373 은 본기도 동일성만 검사 — `vespers2.concludingPrayer` 가 EP I 과 byte-동일이라 통과 유지). `e2e/first-vespers.spec.ts:294` 는 토요일 경로라 무관. `sanctoral-romcal-gate.test.ts` L219 도 본기도 비교라 유지. PRD FR-156/§5.1 HourSection 문구 및 `docs/traceability-matrix.md` 갱신 필요.

**B안 — 데이터 재키잉만.** `SUN.vespers` 를 EP II 로 바꾸고 EP I 후렴을 `SUN.firstVespers` 셀로 이전. 코드 무수정처럼 보이지만 `mergeSundayFirstVespers` 가 `vespers` 를 "시즌 EP I 고유부" 로 취급해 독서·응송·청원·본기도를 우선 병합하므로(대림·사순·부활에서 EP II 독서가 토요일에 나가게 됨) 병합 규칙, 34개 `w*-SUN-vespers.rich.json` 의 `source.hour`, FR-156 테스트군, 성탄 특수키 셀까지 함께 뒤집어야 한다. 폭발 반경이 A안보다 훨씬 크다 — 비권장.

**C안 — 연중만 우선(코드 최소).** 연중 30주만 A안 적용, 시즌 템플릿은 후속. 대림·사순·부활이 가장 눈에 띄는 오류(독서·응송·청원까지)라 절반만 고치는 셈 — 비권장.

---

## 2. 조사 2 — 성탄 시기 토요일 저녁 본기도 부재 (2026-01-03, 01-10)

### 2-1. 재현 (로컬 main = 프로덕션)

```
2026-01-03 vespers | The Most Holy Name of Jesus [CHRISTMAS wk1 psw1 OPTIONAL_MEMORIAL] eff=-
   reading=2 Коринт 1:3-7 p73 | Mag="" pundefined | concl=NONE
2026-01-04 vespers | Epiphany [CHRISTMAS wk1 psw2 SOLEMNITY] eff=-
   reading=2 Тесалоник 2:13-14 p191 | Mag="" pundefined | concl=NONE
2026-01-04 firstVespers | Epiphany … Mag="" | concl=NONE
2026-01-04 lauds       | Epiphany … Mag="" | concl=NONE
2026-01-10 vespers | Saturday after Epiphany [CHRISTMAS wk1 psw2 WEEKDAY] eff=-
   reading=2 Тесалоник 2:13-14 p191 | Mag="" pundefined | concl=NONE
2026-01-11 firstVespers | Baptism of the Lord … Mag="Бидний Аврагч Ариун угаалыг…" p616 | concl=p616   ← 정상
getHoursSummary: 01-03 → [lauds] · 01-04 → [firstVespers, firstCompline, lauds, vespers, compline] · 01-10 → [lauds] · 01-11 → [firstVespers, …]
resolveSpecialKey(CHRISTMAS, 'Epiphany', '2026-01-04') → null   (romcalKey 'epiphany')
```

사용자 노출: **01-03 저녁**(카드는 01-04 `firstVespers`) 과 **01-04 공현 당일 아침·저녁 전부** 후렴·본기도 없음 — 대축일이라 심각. 01-10 저녁은 카드 경로(01-11 `firstVespers`) 가 정상이고 legacy `/2026-01-10/vespers` URL 만 공백.

### 2-2. 원인 (조회 경로 2 + 데이터 1)

1. `propers-loader.ts` L128: `lower.includes('epiphany of the lord') || lower.includes('the epiphany')` — romcal 명칭은 `"Epiphany"` 라 불일치 → `weeks['epiphany']` 도 `weeks['epiphanyWeek']` 도 도달 불가 → 공현의 lauds/vespers/firstVespers 가 전부 null. (`'epiphany'` 부분 매칭으로 고치면 "Monday after Epiphany" 가 잡히므로 **정확 일치** 또는 `romcalKey==='epiphany'` 로.)
2. `loth-service.ts` L552-590 토→주일 분기: `getSeasonFirstVespers(sundaySeason, nextWeek, dateStr, day.name)` / `getSeasonHourPropers(…, 'SUN', 'vespers', dateStr, day.name)` 에 **토요일 자신의** `dateStr`·`day.name` 을 넘긴다. 연중처럼 주차 번호 키에서는 무해하지만 성탄 시기의 이름 키(baptism/holyFamily/epiphany) 는 주일의 이름이 있어야 풀린다 → 01-10 은 `weeks['baptism'].SUN.firstVespers` 가 있는데도 null. 또 이 분기는 `!seasonPropers` 가드 뒤에 있어 토요일 자신이 날짜 키(`octave`) 로 고유부를 가지면 아예 진입하지 않는다(12-26, §3).
3. `christmas.json` 셀 전도(인쇄면 확인, 크롭 `crop-p608-jan1-ep2.png`·`crop-p609-epiphany.png`·`crop-p610-epiphany-ep2.png`·`crop-p611-epiphanyweek.png`):
   - `epiphanyWeek.SUN` 이 실제로는 **공현 대축일**(p.609-610: ЭЗЭНИЙ ИЛРЭХҮЙ · Их баяр — 아침 후렴 «Өнөөдөр хүргэн Шашин болсон…», 본기도 «…одын удирдлагаар үндэстнүүдэд илчилсэн…», EP II p.610 «Гурван ариун нууц…»). 다만 그 `vespers.gospelCanticleAntiphon` «Аяа Христ минь, дэлхий ертөнцийн Аврагч…»(p.608) 은 **1월 1일 천주의 성모 EP II** 이다(같은 문구가 `solemnities.json 01-01.vespers2` 에 별도 구제돼 있음).
   - `epiphany.SUN` 이 실제로는 **ЭЗЭНИЙ ИЛРЭХҮЙН ДАРААХ ДОЛОО ХОНОГ**(공현 후 평일, p.611-615: 독서 Исаиа 4:2-3 / 후렴 «Гурван мэргэд…» / 저녁 독서 Ефес 2:3б-5 / 후렴 «Христ, Та бол Гэрлийн Гэрэл…»).
   - 공현 EP I 후렴 p.609 «Одыг хараад мэргэд “Энэ нь агуу хааны төрөлтийг илэрхийлэх тэмдэг байх ёстой…”» 는 **데이터 어디에도 없음**(grep 0건). p.609 는 «Их баяр» 바로 아래 «Мариагийн магтаал» 로 시작하며 “1 дүгээр Оройн…” 소제목은 인쇄돼 있지 않으나, 초대송·아침기도 앞에 놓인 Magnificat 후렴이므로 EP I 이다.
   - rich 파일 `wepiphany-SUN-*`·`wepiphanyWeek-SUN-*` 도 같은 키를 따르므로 함께 재키잉 필요.

### 2-3. 책이 그 토요일 저녁에 지시하는 것

- **01-03 (공현 전야)**: p.609 «1 дүгээр сарын 6 эсвэл 1 дүгээр сарын 2-оос 8-ны хоорондох Ням гараг — ЭЗЭНИЙ ИЛРЭХҮЙ — Их баяр — Мариагийн магтаал: Одыг хараад мэргэд…» + 본기도 p.609. (시편은 인쇄 없음 → 공통/시편집 규칙.)
- **01-10 (세례 전야)**: p.616 «ЭЗЭНИЙ АРИУН УГААЛ / 1 дүгээр Оройн даатгал залбирал / Шад магтаал Бидний Аврагч Ариун угаалыг хүртэхээр ирсэн…» + Төгсгөлийн даатгал залбирал p.616 (`crop-p616-baptism-ep1.png`). 앱의 `/2026-01-11/firstVespers` 가 이미 정확히 이것을 렌더.

### 2-4. 수정 방향

- 코드 ①: `resolveSpecialKey` CHRISTMAS 분기에 `lower === 'epiphany'` (또는 romcal 키) 추가. 단위 테스트에 `('CHRISTMAS','Epiphany')→'epiphany'`, `('CHRISTMAS','Monday after Epiphany')→null` 고정.
- 코드 ②: 토→주일 분기에 `sundayStr`/`sundayDay.name` 전달. (§3 의 Path 2 FEAST 확장과 함께.)
- 데이터 ③: `christmas.json` `epiphany`↔`epiphanyWeek` 내용 교환, `epiphany.SUN.vespers.gospelCanticleAntiphon` 을 p.609 «Одыг хараад мэргэд…» 로(크롭 기준 입력), p.608 «Аяа Христ минь…» 는 `jan1.SUN.vespers2` 로 이동(또는 sanctoral 01-01 vespers2 와 중복이면 제거), 페이지값 교정, rich 파일 재키잉. 공현 후 평일(`epiphanyWeek`) 은 L142 주석대로 날짜 범위 매칭이 아직 없어 이번 범위 밖(별도 항목).

---

## 3. 조사 3 — 2026-12-26 성 스테파노 저녁 → 12-27 성가정 EP I 미승격

### 3-1. 재현

```
2026-12-26 vespers | Saint Stephen, The First Martyr [CHRISTMAS wk1 psw4 FEAST] eff=-
   reading=2 Pet 1:3-4 p604 | Mag="Тэнгэрбурханы ариун эх, Та бидний аврагч…" p604 | concl=p603     ← octave 셀(성탄 8일 평일 저녁)
2026-12-27 firstVespers | Holy Family [CHRISTMAS wk1 psw1 FEAST] eff=-
   reading=Romans 11:25, 30-36 p55 | Mag="Есүс хүү Йерусалимд үлджээ…" p599 | concl=p600 alt=true    ← 성가정 EP I 정상
getHoursSummary('2026-12-26') → [lauds]        (저녁기도·끝기도 카드 제거)
getHoursSummary('2026-12-27') → [firstVespers, firstCompline, lauds, vespers, compline]
resolveSpecialKey(CHRISTMAS,'Saint Stephen…','2026-12-26') → 'octave' · (…,'Holy Family',…) → 'holyFamily'
```

### 3-2. 코드 추적

- `getHoursSummary`: 내일이 주일이면 `hasFirstVespersAndCompline` 이 무조건 true → `stripEveCards` 로 12-26 의 vespers/compline 카드 제거 → 사용자는 12-27 `firstVespers` 카드로 유도되고 그 본문은 정확. **카드 모델은 규범대로 동작.**
- `assembleHour('2026-12-26','vespers')` (legacy URL): FR-156 eve 분기(L322-418) — Path 1 `resolveSanctoralForDay(Holy Family)` → 성가정은 MM-DD sanctoral 없음 → undefined. Path 2 는 `tomorrowDay.rank === 'SOLEMNITY'` 게이트 → 성가정은 FEAST → 불발. 이어 토→주일 분기는 `!seasonPropers` 가드에서 탈락(`octave` 날짜 키로 토요일 자신의 고유부가 이미 잡힘). 결과: 성탄 8일 평일 저녁(p.604) 그대로.
- 코드 주석(L1240 부근)은 legacy eve URL 에서도 "FR-156 promotion preserved on those URLs" 를 계약으로 명시 → 카드와 본문 불일치는 **계약 위반 = 버그**. 같은 원인이 세례 전야 legacy URL(§2 01-10) 에도 적용.

### 3-3. 규범·책 판정

- 책 p.599 적색 규정(`crop-p599-holyfamily-ep1.png`): «Хэрэв Эзэний Мэндэлсэн өдөр хэмээх их баяр Ням гарагт таарвал Иосеф, Мариа, Есүсийн Ариун Гэр бүл хэмээх баярыг 12 сарын 30-нд ёслон тэмдэглэх бөгөөд “1 дүгээр Оройн даатгал залбирал” гэж байхгүй.» — 성탄이 주일인 해에만 EP I 이 없다 = **주일에 오는 통상의 경우 EP I 을 그 전날(12-26~31 중 토요일) 저녁에 바친다.** 그리고 p.599 에 «1 дүгээр Оройн даатгал залбирал» 이 실제로 인쇄돼 있다.
- 전례일 순위표: 성가정(주님의 축일, II.5) > 성 스테파노·성 요한·무죄한 어린이(성인 축일, II.7) > 성탄 8일 내 평일(II.9). 보편규범 61항(겹침): 순위가 높은 날의 저녁기도. 라틴 LH 12월 26일도 "저녁기도는 성탄 8일의 것, 단 다음날이 성가정이면 그 제1저녁기도".
- → **성가정 EP I 이 이긴다. 애매하지 않음, 제품 결정 불필요.** 단 성탄이 주일인 해(성가정 = 12-30 금요일, EP I 없음) 를 고치면서 잘못 켜지 않도록 "내일이 주일인 성가정" 조건이 필요.

### 3-4. 수정 방향

- FR-156 Path 2 를 `SOLEMNITY` 전용에서 "SOLEMNITY 또는 (FEAST 이고 특수키 `firstVespers` 데이터가 존재)" 로 확장(데이터 구동 — Path 1 이 FEAST 4건을 그렇게 다루는 것과 동형). holyFamily 는 `tomorrowDow==='SUN'` 게이트. 이로써 12-26 legacy URL 과 01-10 legacy URL 이 카드 본문과 일치하고 `effectiveLiturgicalDay` 도 노출된다.
- 심각도 낮음(카드 경로 정상). §2 코드 ② 와 같은 커밋으로 묶는 것이 자연스럽다.

---

## 4. 인용 크롭·산출물 (`vsp2/`)

인쇄면 크롭(전부 200dpi 렌더 → 좌/우 페이지 크롭, Read 로 판독): `crop-p797-ot24-ep1-mp.png`, `crop-p798-ot24-ep2.png`, `crop-p759-ot5-ep1-mp.png`, `crop-p760-ot5-ep2.png`, `crop-p774-ot12-ep2.png`, `crop-p780-ot15-ep2.png`, `crop-p782-ot16-ep2.png`, `crop-p783-ot17-ep1.png`, `crop-p800-ot25-ep2.png`, `crop-p818-ctk-ep2.png`, `crop-p549-advent-ep1.png`, `crop-p553-advent-ep2-header.png`, `crop-p554-advent-ep2-ant.png`, `crop-p619-lent1-ep1.png`, `crop-p624-lent1-ep2.png`, `crop-p599-holyfamily-ep1.png`, `crop-p601-holyfamily-ep2.png`, `crop-p608-jan1-ep2.png`, `crop-p609-epiphany.png`, `crop-p610-epiphany-ep2.png`, `crop-p611-epiphanyweek.png`, `crop-p616-baptism-ep1.png`, `crop-p617-baptism-ep2.png`. 원본 스프레드 `phys-{275,277,278,300,301,305-310,313,380,381,388,391,392,399,400,401,410}-*.png`.

로그·스크립트: `ot-ep2-conformance.txt`(34주 EP I/EP II 대조), `sundays-2026.txt`(52 주일 분류), `probe-cal.js`·`probe-hour.js`·`probe-summary.js`·`probe-sundays.js`(로컬 main `assembleHour` 프로브, `NODE_PATH=…/node_modules B=vsp2/build node …`), `transpile.js`, `psalter-layout.txt`(`pdftotext -layout` 전체), 프로덕션 응답 `api-<date>-<hour>.json`.

## 5. 미확인

- 이동 대축일 4건과 11-01 모든 성인의 `vespers2` 후렴을 이번에 인쇄면으로 재대조하지 않았다(기존 GOAL #20/#27 검증 신뢰).
- 대림·사순·부활 템플릿 `vespers2` 의 독서·응송·청원 본문 글자 단위 대조는 하지 않았다(헤더·후렴·독서 참조만 확인).
- 공현 후 평일(`epiphanyWeek` 의 진짜 내용, p.611-615) 을 앱이 어떤 날짜 범위에 써야 하는지는 로더 L142 주석대로 미구현이며 이번 범위 밖.
- 라틴 LH 12월 26일 규정 문구는 기억에 의한 인용이며 원문 확인은 하지 않았다(판정은 책 p.599 규정 + 순위표만으로도 성립).
- 가해/나해/다해 대응 관찰은 표본 6주 기준이며 34주 전수는 하지 않았다(판정에 영향 없음).
