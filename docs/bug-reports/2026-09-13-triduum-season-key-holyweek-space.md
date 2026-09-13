# 버그 리포트 — 성삼일(성목·성금·성토)이 "사순 1주" 로 리셋되어 6주차 고유 데이터가 도달 불가

- **작성**: 2026-09-13 전체 앱 리뷰 (team-lead, 코어 리뷰 에이전트 발견 → 리더 독립 재현)
- **분류**: 전례력 → 데이터 키 매핑 버그 (romcal 시즌 키 문자열 불일치)
- **심각도**: 치명 (성삼일 3일간 아침·저녁기도 본문이 전부 잘못된 주차)
- **상태**: ✅ 수정됨 (2026-09-14, main 머지 `1eca5c7..7c0e415`; 이 버그는 `1eca5c7`). 성목요일 lauds 는 `lent.weeks[6].THU` 에 lauds 데이터가 없어 week-1 폴백 유지(데이터 공백, 지어내지 않음).

---

## 1. 증상

성목요일·성금요일·성토요일 (`/pray/2026-04-02..04/*`) 의 헤더가 "Дөч хоногийн цаг улирлын **1-р** долоо хоног" 로 표시되고, 짧은 독서·본기도가 **사순 1주 평일** 것으로 나온다. 저작된 `propers/lent.json weeks['6'].THU/FRI/SAT` 데이터(성삼일 고유 본문)는 어느 경로로도 렌더되지 않는다.

## 2. 재현 (명령 + 출력)

`src/lib` 를 CJS 로 transpile 한 뒤 실제 함수를 호출했다 (스크립트: 세션 scratchpad `core/verify-lead.js`, `core/verify-lead2.js`; 핵심 부분을 아래에 인라인).

```js
const r = require('romcal'); const romcal = r.default ?? r;
const c26 = romcal.calendarFor({ year: 2026, locale: 'en' });
for (const d of ['2026-03-29','2026-04-01','2026-04-02','2026-04-03','2026-04-04','2026-04-05'])
  { const e = c26.find(e => e.moment.slice(0,10) === d); console.log(d, e.type, e.name, JSON.stringify(e.data.season.key)); }
for (const d of ['2026-04-02','2026-04-03','2026-04-04'])
  { const x = cal.getLiturgicalDay(d); console.log(d, x.season, x.weekOfSeason, x.nameMn); }
const gf = await svc.assembleHour('2026-04-03', 'lauds');
console.log(gf.sections.find(s => s.type === 'shortReading')?.ref, lent.weeks['6'].FRI.lauds.shortReading.ref, lent.weeks['1'].FRI.lauds.shortReading.ref);
```

출력 (`NODE_PATH=node_modules node …`, 2026-09-13):

```
=== 1. romcal season key on Holy Week / Triduum ===
2026-03-29 | type SUNDAY | name Palm Sunday | season.key = "Holy Week"
2026-04-01 | type HOLY_WEEK | name Wednesday of Holy Week | season.key = "Holy Week"
2026-04-02 | type TRIDUUM | name Holy Thursday | season.key = "Holy Week"
2026-04-03 | type TRIDUUM | name Good Friday | season.key = "Holy Week"
2026-04-04 | type TRIDUUM | name Holy Saturday/Easter Vigil | season.key = "Holy Week"
2026-04-05 | type SOLEMNITY | name Easter Sunday | season.key = "Easter"

=== 2. getLiturgicalDay on Triduum ===
2026-04-02 | season LENT | weekOfSeason 1 | nameMn Дөч хоногийн цаг улирлын 1-р долоо хоног
2026-04-03 | season LENT | weekOfSeason 1 | nameMn Дөч хоногийн цаг улирлын 1-р долоо хоног
2026-04-04 | season LENT | weekOfSeason 1 | nameMn Дөч хоногийн цаг улирлын 1-р долоо хоног

Good Friday lauds shortReading ref via app: Isa 53:11b-12
  | lent.weeks[6].FRI.lauds.shortReading.ref: Исаиа 52:13-15
  | weeks[1].FRI: Isa 53:11b-12
Holy Saturday vespers header: Дөч хоногийн цаг улирлын 1-р долоо хоног | shortReading Colossians 1:2б-6
```

로마 성무일도 기준 성금요일 아침기도 짧은 독서는 이사 52:13-15 이고, 이사 53:11b-12 는 사순 1주 금요일 것이다. 앱은 후자를 낸다.

## 3. 원인

`src/lib/calendar.ts:122`:

```ts
const isHolyWeek = seasonKey === 'HolyWeek' || entry.name.includes('Holy Week') || entry.name === 'Palm Sunday'
```

romcal 1.3 의 실제 시즌 키는 공백이 있는 `'Holy Week'` 이다 (`src/lib/mappings.ts:11` 의 `SEASON_MAP` 은 올바르게 `'Holy Week'` 을 쓴다). 그래서 첫 조건은 항상 false 이고, 성지주일(`name === 'Palm Sunday'`)과 성주간 월~수(`name.includes('Holy Week')`)만 이름 조건으로 구제된다. 성삼일의 이름(`Holy Thursday`, `Good Friday`, `Holy Saturday/Easter Vigil`)은 'Holy Week' 을 포함하지 않으므로 `effectiveSeasonKey` 가 `'Holy Week'` 으로 바뀌고 `calendar.ts:125-129` 에서 새 시즌으로 인식되어 `weekOfSeason` 이 `1` 로 리셋된다.

`src/lib/loth-service.ts:39` 의 `GOOD_FRIDAY_TRIDUUM_WEEK = 6` 과 `usesGoodFridayVespersIntercessions` 는 이 증상을 저녁기도 청원 한 경로에서만 우회하는 증상 패치다. `src/lib/hours/__tests__/intercessions.test.ts:201-205` 는 "Triduum remaps to LENT week 1 … UNREACHABLE" 이라고 인지한 채 dead-data 로 분류하고 있다.

## 4. 영향 범위

- 매년 성삼일 3일 × (아침·저녁·끝기도) 전부. 2026/2027/2028 실측 동일.
- `lent.json weeks['6'].THU/FRI/SAT` 전체가 도달 불가 데이터.

## 5. 수정 제안

1. `calendar.ts:122` 를 `seasonKey === 'Holy Week'` 로 교정 (또는 `SEASON_MAP` 키를 재사용).
2. 성삼일 `weekOfSeason` 이 6 인지 단위 테스트 추가 (`calendar.test.ts`, 2026·2027·2028 3개 연도).
3. `intercessions.test.ts:201-205` 의 UNREACHABLE 주석을 제거하고 실제 성삼일 데이터를 검증하도록 전환.
4. `GOOD_FRIDAY_TRIDUUM_WEEK` 우회 코드 제거 검토.

## 6. 관련

- 같은 리뷰에서 발견된 형제 버그: `2026-09-13-ot-sunday-propers-weekofseason.md`, `2026-09-13-sunday-solemnity-sanctoral-override.md`
- 종합 리뷰: `docs/app-review-2026-09-13.md`
