# 버그 리포트 — 주일과 겹친 고정일 대축일이 주일(사순·대림·부활 포함)을 덮어씀

- **작성**: 2026-09-13 전체 앱 리뷰 (team-lead, 코어 리뷰 에이전트 발견 → 리더 독립 재현)
- **분류**: 전례 등급 매핑 (`SUNDAY → SOLEMNITY` 뭉개기) + MM-DD 단독 sanctoral 조회
- **심각도**: 높음 (해당 연도의 특정 주일에 전례력상 이관된 대축일이 그대로 표시됨; 2028-03-19 부터 실제 발생)
- **상태**: ✅ 수정됨 (2026-09-14, main 머지 `1eca5c7..7c0e415`; 이 버그는 `4036840` + 후속 `becef1f`·`5ae7e4f`). 신규 `src/lib/sanctoral-resolver.ts`, `LiturgicalDayInfo.romcalType/romcalKey`, sanctoral JSON 에 `romcalKey`/`outranksSunday` 메타 추가.

---

## 1. 증상

romcal 이 주일로 판정한 날(사순 3주일 등)에, 같은 MM-DD 의 고정일 대축일(성 요셉 03-19, 주님 탄생 예고 03-25, 원죄 없이 잉태되신 성모 12-08) 이 이름·본기도·제1저녁기도까지 그대로 렌더된다. 전례 규범상 이런 대축일은 다음 날(월요일)로 이관되며 romcal 도 그렇게 낸다.

## 2. 재현 (명령 + 출력)

```js
for (const d of ['2028-03-19','2028-03-20','2035-03-25','2030-12-08']) {
  const e = romcal.calendarFor({year:+d.slice(0,4), locale:'en'}).find(x => x.moment.slice(0,10) === d);
  const x = cal.getLiturgicalDay(d);
  console.log(d, '| romcal:', e.type, e.name, '| app nameMn:', x.nameMn, '| rank', x.rank);
}
const a = await svc.assembleHour('2028-03-19', 'lauds');  // 사순 3주일
const b = await svc.assembleHour('2035-03-25', 'lauds');  // 부활 주일
```

출력 (2026-09-13):

```
2028-03-19 | romcal: SUNDAY 3rd Sunday of Lent          | app nameMn: Гэгээн Иосеф | rank SOLEMNITY
2028-03-20 | romcal: SOLEMNITY Joseph, Husband of Mary  | app nameMn: Дөч хоногийн цаг улирлын 3-р долоо хоног | rank SOLEMNITY
2035-03-25 | romcal: SOLEMNITY Easter Sunday            | app nameMn: Эзэний тухай Хэл мэдээ хүргэсэн их баярын өдөр | rank SOLEMNITY
2030-12-08 | romcal: SUNDAY 2nd Sunday of Advent        | app nameMn: Язгуурын гэм нүгэлгүй бүрэлдсэн төгс жаргалт Цэвэр Охин Мариа | rank SOLEMNITY

2028-03-19 (사순 3주일) lauds concl: Аяа, Эцэг минь, Та бидний Аврагчийг Гэгээн Иосефийн халамжид даатгасан тул…   ← 요셉 본기도
2035-03-25 (부활 주일) lauds concl: Аяа, Тэнгэрбурхан Эцэг минь, Таны Үг бие махбод болж, Цэвэр Охин Мариагаас мэндэ…  ← 탄생예고 본기도
```

## 3. 원인

1. `src/lib/mappings.ts:34` `RANK_MAP['SUNDAY'] = 'SOLEMNITY'` — romcal 의 `SUNDAY` 타입이 앱 내부에서 `SOLEMNITY` 로 뭉개져 "주일" 과 "대축일" 을 구분할 수 없다.
2. `src/lib/calendar.ts:54-58` 과 `src/lib/loth-service.ts:559-564` 는 `rank === 'SOLEMNITY' || 'FEAST' || 'MEMORIAL'` 이면 **romcal 이 그날 무엇을 선택했는지와 무관하게** `getSanctoralPropers(mmdd)` 를 MM-DD 만으로 조회한다. 주일은 항상 SOLEMNITY 이므로 같은 날짜에 sanctoral 항목만 있으면 무조건 붙는다.
3. 이관된 실제 날짜(2028-03-20) 에는 romcal 이 `Joseph, Husband of Mary` 를 내지만 MM-DD 가 03-20 이라 sanctoral 조회가 빗나가 사순 평일로 렌더된다.

## 4. 영향 범위

- 앱이 보유한 sanctoral 항목(~14일) 중 고정일 대축일이 주일과 겹치는 해: 2028-03-19(요셉), 2029-03-25·2035-03-25(탄생예고; 2035 는 부활 주일), 2030-12-08(원죄없는잉태) 등. 전날 토요일 저녁은 해당 대축일 제1저녁기도로 렌더된다(`hoursSummary` 에 firstVespers 카드 노출).
- 2026·2027 에는 겹침이 없어 현재 사용자에게 보이지 않지만, 2028 사순부터 실제로 노출된다.

## 5. 수정 제안

1. `getLiturgicalDay` 에서 romcal 의 `entry.type`/`entry.key` 를 보존(`romcalType`, `celebrationKey`) 하고, sanctoral 은 "romcal 이 그날 해당 축일을 선택했을 때만" 붙인다 (MM-DD 단독 조회 폐기 또는 게이트).
2. 이관일에는 romcal 의 key 로 sanctoral 을 찾도록 키 매핑(예: `joseph` → `03-19` 항목) 추가.
3. 회귀 테스트: 2026~2035 범위에서 `getLiturgicalDay(d).nameMn` 이 romcal `type === 'SUNDAY'` 인 날에 sanctoral 이름을 포함하지 않는지 sweep.

## 6. 관련

- 형제 버그: `2026-09-13-triduum-season-key-holyweek-space.md`, `2026-09-13-ot-sunday-propers-weekofseason.md`
- 배경 메모: `docs/bug-reports/2026-06-13-immaculate-heart-ot-collect-data-gap.md` (sanctoral 데이터 공백은 별개 이슈)
- 종합 리뷰: `docs/app-review-2026-09-13.md`
