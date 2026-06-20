# GOAL #189 — 2026 전례력 전수 audit: 고유 기도문 데이터 없어 연중(OT)/평일로 폴백되는 기념일·축일

- **일시**: 2026-06-13 · 팀 dvo · READ-ONLY 조사 (코드/데이터 변경 0)
- **계기**: #187(성모 성심 06-13 본기도 OT 혼입)의 일반화 — 같은 갭이 2026년 다른 날에도 있는지 전수 색출.
- **방법**: 2026년을 4분기로 나눠 4멤버 병렬 조사(dvo-res Q1 / dvo-sol Q2 / dvo-plan-cl Q3 / dvo-dev-co Q4). 각 분기 findings는 `~/.claude/pair-cowork/scratch/dvo/goal189-q{1..4}-gaps.md`. romcal v1.3.0 열거 → 각 대상일 `getSanctoralPropers(mmdd)`(propers-loader.ts:345) + `resolveSpecialKey`(propers-loader.ts:97-148, calendar.ts:64/154 SOLEMNITY 게이트) 보유 확인.

---

## TL;DR — 성모 성심은 빙산의 일각 (systemic)

앱의 sanctoral 고유 기도문 데이터는 **대축일 9개(`solemnities.json`) + 축일 4개(`feasts.json`) + 위령(11-02)** 정도만 존재하고, **나머지 거의 모든 성인 기념일·축일은 고유 데이터가 없어 진행 중인 전례시기의 일반 기도문(연중 평일이면 연중)으로 렌더**된다. 성모 성심(06-13)은 이 광범위한 데이터 공백의 한 사례다. **코드 버그가 아니라 sanctoral 데이터 커버리지 부재**(루트 원인 #187과 동일).

단, raw 구조 카운트는 **과대계상**이다 (dvo-sol 렌더검증으로 입증): 부활 8일축제·주일·사순 기념(commemoration)·선택 기념일 등은 전례상 정상이므로 "진짜 채워야 할 갭"과 구분해야 한다.

---

## 계절 보정 분류 (dvo-sol 방법론 발견 반영)

dvo-sol(Q2)이 `assembleHour` 렌더검증으로 확인: **구조법(2채널 부재→GAP)은 season-authored 고유부를 못 세서 over-report**한다. 이를 4분기에 적용한 정규화 결과:

### ① 진짜 문제 — 연중(OT) 의무 기념일·축일의 고유 본기도 상실 (#187 클래스)
의무 FEAST/MEMORIAL인데 고유부가 없어 **일반 연중 평일 기도문**이 렌더되는 날 (성인 고유 본기도·복음찬가 후렴 상실). 가장 명백히 "성인 기도가 아니라 연중이 나온다"는 케이스:

| 분기 | OT-폴백 의무 기념일·축일 수 | 대표 사례 |
|---|---|---|
| Q1 (1/12–2/17 OT) | 10 | 안토니오, 아녜스, 토마스 아퀴나스, 요한 보스코 등 |
| Q2 (5/25–6/13 OT) | 7 | 교회의 어머니 마리아(5/25), 유스티노(6/1), **성모 성심(6/13)** |
| Q3 (7–9 전부 OT) | 29 | 사도 야고보(7/25)·바르톨로메오(8/24)·마태오(9/21), 마리아 막달레나(7/22), 성모 성탄(9/8), 대천사(9/29), 슬픔의 성모(9/15) |
| Q4 (10/1–11/28 OT) | 14 | 소화 데레사(10/1), 묵주기도 성모(10/7), 시몬과 유다 사도(10/28), 성모 자헌(11/21), 안드레아 사도(11/30) |
| **합계** | **~60일** | |

→ 2026년 **약 60개**의 의무 성인 기념일·축일이 고유 본기도 없이 연중으로 렌더된다. **고위 축일(사도·복음사가)도 다수 포함** — 이들은 전통적으로 고유 성무일도를 가진다.

### ② 같은 원인이나 계절 평일로 폴백 (덜 두드러짐)
고유부 상실은 같으나 연중이 아니라 **해당 시기 평일**로 폴백 (성탄·부활·대림 시기의 성인):
- 성탄시기: 1/2 바실리오·그레고리오 (1건)
- 부활시기: 4/25 마르코, 4/29 시에나의 가타리나, 5/2 아타나시오 (3건)
- 대림시기: 12/3 프란치스코 하비에르, 12/7 암브로시오, 12/14 십자가의 요한 (3건)

### ③ 갭이 아님 — 전례상 정상 (구조법 false positive)
- **부활 8일축제(4/6–4/11) + 하느님 자비 주일(4/12)**: EASTER 시기 고유 본기도가 렌더됨(dvo-sol 렌더검증). 7건 — 정상.
- **사순 기념(commemoration, 2/21–3/23)**: 사순에는 기념일이 기념(commemoration)으로 축소되고 평일 성무일도를 쓰는 것이 루브릭상 정상. 8건 — 정상.
- **선택 기념일(optional memorial)**: 평일이 유효한 기본값이라 강제 갭 아님. Q1에서 9건 카운트됨(Q3/Q4는 처음부터 제외) — 정상.
- **주일**: 시기 주일 성무일도 사용 — 정상.

---

## 데이터 커버리지 (현 상태)
- `solemnities.json` 키 9: 01-01·03-19·03-25·06-24·06-29·08-15·11-01·12-08·12-25
- `feasts.json` 키 4: 02-02·08-06·09-14·11-09
- `memorials.json` 키 3: 11-02·deceased·saturday-mary
- `optional-memorials.json`: 0개
- special-key(`resolveSpecialKey`): OT 4대축일(trinity/corpus/sacredHeart/christTheKing) + Easter(easterSunday/ascension/pentecost) + Christmas(jan1/epiphany/baptism/holyFamily/dec25/octave)

---

## 분기별 raw vs 정규화 (방법론 차이 주의)
| 분기 | 멤버 | raw 구조 GAP | 정규화(의무 등급) | 비고 |
|---|---|---|---|---|
| Q1 | dvo-res | 28 | OT 10 + 성탄 1 (의무) | OPT_MEMORIAL 9 + 사순 commemoration 8 포함해 28로 과대 |
| Q2 | dvo-sol | 17 | OT 7 + 부활평일 3 = 10 (렌더검증) | 부활8일축제+자비주일 7 false positive 제거 |
| Q3 | dvo-plan-cl | 29 | OT 29 (전부 OT, 의무) | 선택기념일 제외, 전부 진짜 OT-폴백 |
| Q4 | dvo-dev-co | 17 | OT 14 + 대림 3 | Christmas octave 등 OK 분리됨 |

---

## 결론 및 다음 단계 (사용자 결정 필요)
1. **성모 성심(#187)은 단발 버그가 아니라 sanctoral 커버리지 정책의 일부** — 거의 모든 성인 고유부가 미수록.
2. **이게 "버그"인지 "의도된 발췌 범위"인지는 전례 정책 결정** — 몽골어 책(`full_pdf.txt`)이 성인 고유부(특히 사도·주요 축일)를 인쇄하는지에 달림. MT/추측 금지 원칙상, 채우려면 책 원문 또는 공통(Common of Saints) 텍스트 확보가 선행.
3. **우선순위 권고(채우기로 한다면)**: 고유 성무일도가 전통적으로 있는 **사도·복음사가 축일**(야고보·바르톨로메오·마태오·마르코·안드레아·토마스·시몬과유다·대천사) + **주요 성모 축일**(성모 성탄 9/8, 슬픔의 성모 9/15, 묵주기도 성모 10/7, 성모 자헌 11/21, 성모 성심 6/13)부터.

---

## References
- 분기 findings: `~/.claude/pair-cowork/scratch/dvo/goal189-q{1,2,3,4}-gaps.md`
- 루트 원인 RCA: `docs/bug-reports/2026-06-13-immaculate-heart-ot-collect-data-gap.md` (#187)
- 코드: `src/lib/propers-loader.ts:97-148`(resolveSpecialKey)·`:150-202`(getSeasonHourPropers 폴백)·`:345`(getSanctoralPropers) / `src/lib/calendar.ts:54-65`·`:148-155` / `src/lib/mappings.ts:27`(RANK_MAP)
- 데이터: `src/data/loth/sanctoral/{solemnities,feasts,memorials,optional-memorials}.json`
