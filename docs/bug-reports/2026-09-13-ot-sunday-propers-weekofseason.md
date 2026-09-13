# 버그 리포트 — 연중시기 주일 본기도·복음찬가 후렴이 틀린 주차(weekOfSeason)로 조회됨

- **작성**: 2026-09-13 전체 앱 리뷰 (team-lead, 코어 리뷰 에이전트 발견 → 리더 독립 재현)
- **분류**: 전례력 주차 값 혼용 (시즌 카운터 `weekOfSeason` vs 전례력 연중 주차 `otWeek`)
- **심각도**: 치명 (연중시기 **모든 주일** 의 본기도·복음찬가 후렴이 다른 주일 것)
- **상태**: ✅ 수정됨 (2026-09-14, main 머지 `1eca5c7..7c0e415`; 이 버그는 `f769a5f` + 후속 `5cc8a80`). 독립 검증: main 대비 2026 전일자 스윕 범주 밖 차이 0, vitest 1,881 통과.
- **정정**: `docs/bug-reports/2026-06-03-ot-week-off-by-one.md` (#256) 는 "라벨만 -1, 본문은 정상" 으로 결론냈으나, 그 판단은 psalterWeek(시편) 에만 성립한다. 주일 고유부(propers) 경로는 여전히 틀린 주차를 읽는다.

---

## 1. 증상

연중 13주일(2026-06-28) 아침기도 헤더는 "Жирийн цаг улирлын 13-р Ням" 인데, 본기도와 Benedictus 후렴은 `ordinary-time.json weeks['5']` (연중 5주일) 내용이다. 연중 2주일(2026-01-18) 은 `weeks['1']` 을 낸다. 성령강림 이후 주일은 약 8주, 그 이전 주일은 1주 어긋난다.

## 2. 재현 (명령 + 출력)

```js
for (const d of ['2026-01-18','2026-02-08','2026-06-07','2026-06-28','2026-08-30','2026-11-22'])
  { const x = cal.getLiturgicalDay(d); console.log(d, 'wos', x.weekOfSeason, 'otWeek', x.otWeek, x.nameMn); }
const ot = require('src/data/loth/propers/ordinary-time.json');
console.log(Object.keys(ot.weeks));
// weeks[5] / weeks[13] SUN.lauds 본기도 앞 90자
const a = await svc.assembleHour('2026-06-28', 'lauds');
console.log(a.sections.find(s => s.type === 'concludingPrayer').text.slice(0, 90));
```

출력 (2026-09-13):

```
=== 3. OT Sundays: weekOfSeason vs otWeek ===
2026-01-18 | wos 1  | otWeek 2  | nameMn Жирийн цаг улирлын 2-р Ням
2026-02-08 | wos 4  | otWeek 5  | nameMn Жирийн цаг улирлын 5-р Ням
2026-06-07 | wos 2  | otWeek 10 | nameMn Христийн Туйлын Ариун Нандин Бие ба Цус — Их баяр
2026-06-28 | wos 5  | otWeek 13 | nameMn Жирийн цаг улирлын 13-р Ням
2026-08-30 | wos 14 | otWeek 22 | nameMn Жирийн цаг улирлын 22-р Ням
2026-11-22 | wos 26 | otWeek 34 | nameMn Есүс Христ Бидний Эзэн Ертөнцийн Хаан — Их баяр

ordinary-time.json weeks keys (38): 1,2,…,34,trinitySunday,corpusChristi,sacredHeart,christTheKing
weeks[5].SUN.lauds  : concl "Аяа, Эзэн минь, бидний бүх найдвар Танд л байдаг тул биднийг Өөрийн хайр халамжид сахин ха…"
                      ant   "Үүр шөнөөр Есүс босоод гадагш гарч зэлүүд газар очин, тэндээ залбирч б…"
weeks[13].SUN.lauds : concl "Аяа, Эцэг минь, Та охид хөвгүүдээ Христийн гэрэлд алхуулахаар дууддаг билээ…"
                      ant   "Есүс харин эргэж харангаа мөнөөх эмэгтэйд: -\"Охин минь, зоригтой бай…"
weeks[1].SUN.lauds  : concl "Аяа, хайрын Эцэг минь, Та бидний даатгал залбирлыг сонсоно уу. Таны дур тааллыг танин мэдэ…"
weeks[2].SUN.lauds  : concl "Аяа, Тэнгэр газрын Эцэг минь, Та бидний даатгал залбирлыг сонсоод, энэ дэлхий дээр амар ам…"

OT13 Sunday 2026-06-28 lauds: concl= "Аяа, Эзэн минь, бидний бүх найдвар Танд л байдаг тул…"   ← weeks[5]
   antiphon= "Үүр шөнөөр Есүс босоод гадагш гарч…" | concl.page= 759
OT2 Sunday 2026-01-18 lauds:  concl= "Аяа, хайрын Эцэг минь, Та бидний даатгал залбирлыг сонсоно уу…"  ← weeks[1]
```

**오늘(2026-09-13, 연중 24주일) 프로덕션 빌드 실측** (`next build` + `next start -p 3210`, 리더 프로브 `core/verify-lead4.js`):

```
2026-09-13 wos 16 otWeek 24
weeks[17].SUN.vespers ant: Тэнгэрийн хаанчлал нь сайн сувд хайгч худалдаачинтай адил юм…
weeks[24].SUN.vespers ant: Есүс Петрт айлдсан нь: "Би чамд долоон удаа бус, харин дал дахин долоон удаа"…   ← 마태 18:21-35 (24주일 A년, 정답)
app firstVespers 09-13 ant: Тэнгэрийн хаанчлал нь хөрөнгө мэт юм. Эмэгтэй түүнийг авч, гурван хэмжүүр гурилд…  ← weeks[17] 계열(누룩 비유)
app lauds 09-13 ant       : Хүмүүсийг хараад Тэр өрөвджээ. Учир нь тэд хоньчингүй хонь мэт…                   ← weeks[16]
app lauds 09-13 concl     : Аяа, Эзэн минь, Та ард түмэндээ өршөөнгүй хандана уу…                            ← weeks[16] 과 동일
weeks[24].SUN.lauds concl : Аяа, төгс хүчит Тэнгэрбурхан минь, бидний бүтээгч, удирдагч минь…               ← 정답(미표시)
```

즉 헤더는 "24-р Ням" 인데 본기도·후렴은 16/17주일 것이 오늘 실제 사용자 화면에 나가고 있다.

데이터 키가 전례력 주차임은 미사경본 본기도와 대조해 확인했다: weeks[1] = "청원을 들으시어 해야 할 일을 알게 하시고"(연중 1주), weeks[2] = "하늘과 땅을 다스리시는… 우리 시대에 평화를"(2주일), weeks[5] = "모든 희망을 주님께 두오니 보살펴 주소서"(5주일), weeks[13] = "빛의 자녀로 부르셨으니"(13주일). 2026-06-28 은 연중 13주일(그리스도왕 11-22 = 34주에서 역산) 이므로 앱이 낸 weeks[5] 는 틀렸다.

## 3. 원인

`src/lib/calendar.ts:111-137` 은 `weekOfSeason` 을 **시즌 카운터**로 센다: 시즌이 바뀌면 1 로 리셋(사순만 0), 주일마다 +1 (첫 주일은 제외). 연중시기는 주님 세례 축일 다음 월요일에 1 로 시작하므로 초기 연중은 `otWeek - 1`, 성령강림 다음 월요일에 다시 1 로 리셋되므로 후기 연중은 `otWeek - 8` 안팎이다.

#256 이 `assignOTWeeks` 로 `otWeek` 을 날짜 기반으로 계산해 **라벨(`nameMn`)만** 고쳤다 (`calendar.ts:142-166`, `effectiveWeek = day.otWeek ?? day.weekOfSeason`). 그러나 고유부 조회는 여전히 `day.weekOfSeason` 을 넘긴다:

- `src/lib/loth-service.ts:174-181` `getSeasonHourPropers(day.season, day.weekOfSeason, …)`
- `src/lib/loth-service.ts:469-474`, `:506-508`, `:518-519` (제1저녁기도 경로의 `nextWeek = day.weekOfSeason + 1`)
- `src/lib/propers-loader.ts:150-158` 은 받은 숫자를 `weeks[String(weekOfSeason)]` 로 그대로 조회.

`propers/ordinary-time.json` 의 `weeks[1..34]` 는 전례력 연중 N주 기준으로 저작되어 있다.

## 4. 영향 범위

- 연중시기 모든 주일의 아침·저녁기도 본기도, 복음찬가(Benedictus/Magnificat) 후렴, 그리고 토요일 저녁 제1저녁기도의 후렴/본기도.
- 이동 대축일(삼위일체·성체성혈·예수성심·그리스도왕) 은 특수 키(`trinitySunday` 등) 로 우회되어 영향 없음. 평일은 psalter commons 이라 영향 없음.
- 사순·대림·부활·성탄 시기는 시즌 시작 시점에 카운터가 리셋되므로 별도 확인 필요(부활 8일 등). 본 리포트는 연중시기만 실측.

## 5. 수정 제안

1. `getLiturgicalDay` 가 연중시기 날짜에 대해 `weekOfSeason = otWeek` 을 내도록 하거나, `propersWeek` 필드를 신설해 하류(loth-service, propers-loader) 가 그것만 소비하게 한다.
2. 회귀 테스트: 2026·2027 의 연중 주일 전수에 대해 `assembleHour(date,'lauds').concludingPrayer` 가 `ordinary-time.json weeks[otWeek].SUN.lauds.concludingPrayer` 와 일치하는지 단위 테스트.
3. `docs/bug-reports/2026-06-03-ot-week-off-by-one.md` 에 "본문 경로는 미수정" 정정 주석 추가.

## 6. 관련

- 형제 버그: `2026-09-13-triduum-season-key-holyweek-space.md`, `2026-09-13-sunday-solemnity-sanctoral-override.md`
- 종합 리뷰: `docs/app-review-2026-09-13.md`
