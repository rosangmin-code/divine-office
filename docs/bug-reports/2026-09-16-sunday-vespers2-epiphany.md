# 버그 리포트 — 주일 제2저녁기도 미적용 · 주님 공현 고유부 미도달 · 성가정 제1저녁기도 미승격

- **작성**: 2026-09-16 · GOAL #268 · 기준 커밋 `f0be94f`
- **근거 조사**: `docs/research/2026-09-16-sunday-vespers2.md` (읽기 전용 조사, 인쇄면 크롭 판독 + 프로덕션 API 실측)
- **수정 FR**: FR-171(주일 EP II) · FR-172(공현·세례·성가정 romcalKey 매칭) · FR-173(FEAST 특수키 제1저녁기도 승격)
- **판정 도구**: `pdftoppm -r 200` 인쇄면 렌더 → PIL 크롭 → 직접 판독. 추출 텍스트(`parsed_data/full_pdf.txt`)는 보조 대조에만 사용.

---

## 1. 증상 (수정 전)

| # | 증상 | 사용자 노출 | 연간 빈도 |
|---|---|---|---|
| A | 주일 당일 `/vespers` 가 **제1저녁기도 후렴**을 렌더 (대림·사순·부활은 독서·응송·청원까지 EP I) | 전 주일 | 2026년 41회 |
| B | **주님 공현 대축일**의 아침·저녁·제1저녁기도에서 복음찬가 후렴과 본기도가 **빈 문자열** | 공현 당일 + 그 전야 | 연 2일 (전야 포함) |
| C | `/pray/<eve>/vespers` legacy URL 이 카드 모델과 불일치 — 성가정·세례 전야에 성탄 8일 평일/전주 저녁을 렌더 | legacy URL 한정 | 연 2일 |

재현 로그 (`main f0be94f`, 로컬 `assembleHour` = 프로덕션 API 동일):

```
2026-01-04 vespers | Epiphany [CHRISTMAS wk1 psw2 SOLEMNITY] eff=-
   reading=2 Тесалоник 2:13-14 p191 | Mag="" pundefined | concl=NONE
2026-01-04 lauds   | Epiphany … Mag="" | concl=NONE
2026-01-03 vespers | The Most Holy Name of Jesus … Mag="" | concl=NONE
2026-09-20 vespers | 25th Sunday of OT … Mag="Та нар усан үзмийн талбай руу яв…" p799   ← EP I (p.800 이 정답)
2026-12-26 vespers | Saint Stephen … reading=2 Pet 1:3-4 p604 | Mag="Тэнгэрбурханы ариун эх…" p604 | concl=p603
   (같은 저녁의 카드 경로 2026-12-27 firstVespers → Mag="Есүс хүү Йерусалимд үлджээ…" p599 | concl=p600)
resolveSpecialKey(CHRISTMAS, 'Epiphany', '2026-01-04') → null      ← romcalKey 는 'epiphany'
```

---

## 2. 원인

### A — 주일 EP II (FR-171)

책은 모든 주일 고유부를 `1 дүгээр Оройн даатгал залбирал`(EP I) / `Өглөөний даатгал залбирал` / `2 дугаар Оройн даатгал залбирал`(EP II) 3단으로 인쇄한다 (인쇄면 p.759-760 / 797-798 등 직접 판독, 가/나/다해 표기는 책 전체에 0건). 데이터도 그대로 `SUN.vespers`=EP I, `SUN.vespers2`=EP II 인데 `loth-service` 는 주일 당일 `/vespers` 에서 토요일 저녁과 **같은 `SUN.vespers` 셀**을 재사용했다. `getSeasonVespers2` 는 주석대로 "특수키 전용"(`never for a plain weekday/Sunday`)이라 평범한 주일에서는 아예 호출되지 않았다.

### B — 공현 고유부 미도달 (FR-172)

`propers-loader.ts` `resolveSpecialKey` 의 CHRISTMAS 분기가 romcal **표시 이름**을 부분일치로 검사한다:

```ts
if (lower.includes('epiphany of the lord') || lower.includes('the epiphany')) return 'epiphany'
```

romcal 1.3 은 공현을 `name = "Epiphany"` / `key = "epiphany"` 로 내므로 **두 게이트 모두 항상 실패** → `weeks['epiphany']` 도 `weeks['epiphanyWeek']` 도 도달 불가 → 공현의 lauds/vespers/firstVespers 고유부가 전부 null.

부수 원인 2: 토→주일 제1저녁기도 분기가 **토요일 자신의** `day.name`/`dateStr` 로 특수키를 풀었다. 연중처럼 주차 번호 키에서는 무해하지만, 성탄 시기의 이름 키(baptism/holyFamily/epiphany) 는 주일의 식별자가 있어야 풀린다 → 2026-01-10 은 `weeks['baptism'].SUN.firstVespers` 가 존재하는데도 null.

부수 원인 3 (데이터): `christmas.json` 의 `epiphany` 버킷과 `epiphanyWeek` 버킷 **내용이 서로 뒤바뀌어** 있었다 (§3).

### C — FEAST 특수키 제1저녁기도 미승격 (FR-173)

FR-156 eve 분기 Path 2 가 `tomorrowDay.rank === 'SOLEMNITY'` 로 게이트 → 성가정·주님 세례(둘 다 FEAST, 주님의 축일)는 배제. 이어지는 토→주일 분기는 `!seasonPropers` 가드에서 탈락한다(12-26 은 `octave` 날짜키로 토요일 자신의 고유부가 이미 잡힘). 결과적으로 `getHoursSummary` 는 12-26 의 저녁기도 카드를 제거해 12-27 `firstVespers` 카드로 유도하는데(정상), legacy URL `/pray/2026-12-26/vespers` 만 성탄 8일 평일 저녁을 냈다 — 코드 주석이 명시한 "FR-156 promotion preserved on those URLs" 계약 위반.

---

## 3. 데이터 결함 (인쇄면 근거)

| 파일 / 키 | 결함 | 인쇄면 근거 | 조치 |
|---|---|---|---|
| `ordinary-time.json` 12·15·25주 `SUN.vespers2` | **부재** (책에는 인쇄됨) | p.774 / p.780 / p.800 크롭 판독 | 추가 |
| `ordinary-time.json` 16주 `SUN.vespers2` | 내용이 **15주 EP II**(p.780) | 진짜 16주 EP II 는 p.782 «Өөрөөс нь булаагдашгүй сайныг Мариа сонгон авчээ.» | 교체 |
| `ordinary-time.json` 6주 `vespers.gospelCanticleAntiphonPage` | 647 (오기) | p.761 (후렴 본문 일치) | 761 |
| `ordinary-time.json` 20주 `vespers2.gospelCanticleAntiphonPage` | 751 (오기) | p.790 (후렴 본문 일치) | 790 |
| `ordinary-time.json` 34주 `vespers2.gospelCanticleAntiphonPage` | 816 (오기, 33주 EP II 페이지) | p.818 | 818 |
| `christmas.json` `epiphany` ↔ `epiphanyWeek` | 두 버킷 내용 **전도** | p.607-610 = 공현 대축일 / p.611-615 = 공현 후 평일 | 셀 교환 (각 키의 `pageRedirects` 는 잔류) |
| `christmas.json` `epiphany.SUN.lauds.gospelCanticleAntiphonPage` | 607 | 해당 후렴은 p.609 에 인쇄 | 609 |
| `christmas.json` `epiphany.SUN.vespers.gospelCanticleAntiphon` | **1월 1일 EP II** 본문(p.608) | 공현 EP I 은 p.609 «Одыг хараад мэргэд…» | 교체 (p.608 본문은 `solemnities.json 01-01.vespers2` 에 그대로 보존됨 — 유실 없음) |

독립 확인: `scripts/verify-propers-pages.js` 가 이미 `epiphanyWeek.SUN.lauds` 607→609, `34.SUN.vespers2` 816→818 두 건을 `manual-review` 로 플래그하고 있었다(수정 후 review 16 → 14, `verified-correction` 0 유지).

옮긴 몽골어 문자열 (인쇄면에서 한 글자씩 판독):

- p.774 (연중 12주 EP II): `Хэн нэг нь Миний араас дагахыг хүсвэл тэр өөрийгөө үгүйсгэн, загалмайгаа авч Намайг дага.`
- p.780 (연중 15주 EP II): `"Багш аа, хуулийн аль тушаал нь агуу вэ?" гэв. Есүс түүнд -"Чи Тэнгэрбурхан Эзэнээ бүх зүрх, бүх сэтгэл, бүх оюун ухаанаараа хайрла." гэж хэлжээ.`
- p.782 (연중 16주 EP II): `Өөрөөс нь булаагдашгүй сайныг Мариа сонгон авчээ.`
- p.800 (연중 25주 EP II): `Ямар ч зарц, хоёр эзэнд үйлчилж чадахгүй. Та нар Тэнгэрбурхан, эд баялаг хоёрт зэрэг үйлчилж чадахгүй.`
- p.609 (공현 EP I): `Одыг хараад мэргэд “Энэ нь агуу хааны төрөлтийг илэрхийлэх тэмдэг байх ёстой. Бүгдээрээ түүнийг хайж олоод алт, гүгэл, миррийг бэлэг болгон хөлд нь тавья” гэжээ.`

---

## 4. 수정

| 영역 | 내용 |
|---|---|
| `src/lib/propers-loader.ts` | `resolveSpecialKey(season, name, dateStr, **romcalKey**)` — CHRISTMAS 분기에서 romcalKey(`epiphany`/`holyFamily`/`baptismOfTheLord`) 우선, 이름은 폴백(정확 일치 `'epiphany'` 추가; "Monday/Saturday after Epiphany" 는 계속 null). `getSeasonVespers2` 에 per-week + week-1 폴백(특수키는 short-circuit). |
| `src/lib/loth-service.ts` | step 3b 주일(또는 FEAST 특수키 당일) `/vespers` 에 `{...vespers, ...vespers2}` 오버레이. FR-156 eve 분기에 Path 2b(FEAST + 내일 주일 + 특수키 + 오늘 ≠ SOLEMNITY, `mergeSundayFirstVespers` 합성). 토→주일 분기에 주일의 `name`/`romcalKey` 전달(`dateStr` 은 토요일 유지). 전 로더 호출부에 romcalKey 스루. |
| `src/lib/prayers/resolver.ts`·`rich-overlay.ts` | `ResolveRichContext.romcalKey`. `RichOverlayLayers.seasonalFallback` + `RichSourceCells.seasonalFallback` — 두 셀을 합성한 EP II 에서 `-vespers` rich 를 **자기 셀로 parity 검사**해 2차 소스로 사용. |
| 데이터 | §3 전부. rich 파일 `wepiphany-SUN-{lauds,vespers}.rich.json` ↔ `wepiphanyWeek-SUN-{lauds,vespers}.rich.json` 동반 교환. |

---

## 5. 검증

**main(`f0be94f`) ↔ 브랜치 전일자 지문 diff 스윕** (`assembleHour` × lauds/vespers/firstVespers/compline, day 필드·섹션 타입·시편 ref+후렴·독서 ref+page·응송·복음찬가 후렴+page·본기도(+alt,+rich 유무)·청원 첫 항목):

| 연도 | 전체 키 | 차이 | 범주 |
|---|---|---|---|
| 2026 + 2027 | 2,920 | **98** | (A) 주일 당일 EP II **85** · (B) 공현 당일+전야 **8** · (C) 성가정·세례 전야 **3** · (D) 페이지값 교정 **2** |
| 2028·2029·2033·2034·2039 (경계 연도) | 7,304 | **256** | (A) **223** (주일 219 + FEAST 특수키 당일 4 — 월요일 세례 2029·2034, 금요일 성가정 2033·2039) · (B) **17** · (C) **6** · (D) **10** |

범주 내역 (2026+2027): (A) = SUN `/vespers` 87건 중 공현 2건을 뺀 85. (B) = 공현 2일 × (lauds·vespers·firstVespers) + 그 전야 토요일 2건 = 8. (C) = 2026-01-10·2026-12-26·2027-01-09 전야. (D) = 연중 6주 `gospelCanticleAntiphonPage` 647→761 이 닿는 2026-02-14 토요일 전야 + 2026-02-15 `/firstVespers` (본문 동일, page 만 변경).

범주 밖 차이 **0**. 특히 **평일·토요일 `/vespers`·`/firstVespers` 는 불변**(변경된 토요일 6건은 전부 공현·세례·성가정 전야, firstVespers 3건은 공현 2 + 6주 페이지 교정 1). 불변 확인한 경계:

- 2033-12-29 / 2039-12-29 (성탄이 주일인 해의 성가정 전야) **UNCHANGED** — 책 p.599 적색 규정대로 제1저녁기도 없음
- 2027-12-25 (토요일 성탄) **UNCHANGED** — 성탄 제2저녁기도 유지 (순위표 I.2 > II.5)
- 2028-12-23/24 (주일 12-24) **UNCHANGED** — 토→주일 분기에 `dateStr` 을 토요일로 유지한 덕분
- 2026-11-01 모든 성인 · 11-22 그리스도왕 · 04-05 부활 주일 · 05-24 성령강림 · 월요일 대축일 전야 4건 **UNCHANGED**

게이트: `vitest` 121 files / 2,019 passed / 4 todo (기준선 120 / 1,982 / 4 + 신규 37) · `tsc --noEmit` 0 · `eslint src e2e scripts` 0 errors(기존 warning 2) · `generate-test-fr-map --check` OK · `verify:all` 14 PASS · `verify:psalter-parity:check` OK · `verify-propers-pages` agree 767→775 / review 16→14 / verified-correction 0.

e2e(3230, `--workers=1`): `first-vespers` · `solemnity-first-vespers` · `movable-first-vespers` · `special-days` · `prayer-vespers` · `conditional-rubric-christmas` · `api` = **51 passed / 0 failed**. `special-days.spec.ts` 의 "Sunday firstVespers shares core propers with Sunday vespers" 1건은 옛 동작(EP I == EP II)을 고정하던 단언이라 FR-171 에 맞춰 갱신(본기도는 계속 일치, 복음찬가 후렴은 달라야 하고 page 는 +1).

화면(브라우저 실측, 콘솔 error 0 / warning 은 폰트 preload 경고만): 공현 2026-01-04 아침기도 — Benedictus 후렴(p.609)과 `ТӨГСГӨЛИЙН ДААТГАЛ ЗАЛБИРАЛ` + `Сонголтот залбирал` 이 채워짐(이전 공백). 공현 저녁기도 — 본기도 p.609 렌더. 연중 25주일 저녁기도 — Magnificat 후렴이 «Ямар ч зарц, хоёр эзэнд…»(p.800, EP II) 이고 대체 본기도 disclosure 유지. 2026-12-26 저녁기도 — 성가정 제1저녁기도 시편·독서·후렴·본기도(p.599/600)가 12-27 `firstVespers` 와 동일.

`public/sw.js`: SSR/API 응답 본문만 바뀌고 라우트·Content-Type·`public/` 자산 경로·precache 목록 변경이 없어 **`CACHE_VERSION` bump 불필요**.

---

## 6. 미수정으로 남긴 것

| 항목 | 이유 |
|---|---|
| **2028-01-01 저녁 (토요일, 천주의 성모) → 공현 제1저녁기도 미승격** | 순위표상 공현(I.2)이 1월 1일(I.3)보다 높아 공현 EP I 이 이겨야 하나, 승격 경로가 `weeks['epiphany'].SUN.firstVespers` 데이터를 요구하는데 책은 공현 제1저녁기도를 별도 블록으로 인쇄하지 않는다(p.609 는 «Их баяр» 바로 아래 Magnificat 후렴으로 시작). 데이터 설계 결정이 필요해 이번 범위 밖. 2026·2027 은 전야가 평일이라 정상 동작. |
| **2027-12-25(토요일 성탄) 카드 목록이 저녁기도 카드를 제거** | `keepsSundayEveningPrayerII` 가 대림·사순·부활 **주일**만 보호해서, 토요일에 떨어진 대축일은 보호되지 않는다. 본문은 이번 수정으로 성탄 제2저녁기도를 지키지만 카드는 12-26 `firstVespers` 로 유도 → **카드 쪽이 틀렸다**. 기존 버그(이번 변경 전후 동일)이며 카드 규칙 수정은 별도 과제. |
| **공현 제2저녁기도에 p.610 «Сонголтот залбирал» 미표시** | GOAL #20 특수키 스왑이 `vespers2` 셀로 **통째 교체**하는 기존 의미를 그대로 따랐다(승천·성령강림도 동일). 이번 변경 전에는 공현 저녁기도에 본기도 자체가 없었으므로 순수 개선이며, 교체↔오버레이 의미 통일은 별도 과제. |
| **대림·사순·부활 주일 EP II 의 청원(+부활은 응송) rich 미표시** | `w{1,6}-SUN-vespers2.rich.json` 이 `shortReadingRich` 만 authored. EP I 의 rich 는 본문이 실제로 다르므로 parity 가 정당하게 탈락시킨다(오염 방지). 평문은 정상 렌더. `-vespers2` rich 추가 authoring 이 후속. |
| **`epiphanyWeek`(공현 후 평일) 의 `alternativeConcludingPrayer`** | 인쇄면 p.613 에 해당 평일 양식의 «Сонголтот залбирал» 은 없고(공현 p.610 의 것이 잘못 붙어 있음), 다만 `epiphanyWeek` 키는 아직 날짜 범위 매칭이 없어 **도달 불가**라 사용자 노출 0. 텍스트 삭제는 이번 범위(이동만) 밖 — `epiphanyWeek` 날짜 범위 구현과 함께 처리. |
| **이동 대축일 4건·11-01 `vespers2` 후렴 인쇄면 재대조** | 조사 리포트 §5 와 동일 — 기존 GOAL #20/#27 검증을 신뢰. |
