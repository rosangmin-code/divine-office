# 버그 리포트: 티없이 깨끗하신 성모 성심 기념일(2026-06-13) 본기도가 연중(OT)으로 렌더 — 고유 기도문 데이터 공백

- **일시**: 2026-06-13
- **신고**: 사용자 — "오늘 티없이 깨끗하신 성모 성심 기념일인데 본기도 등이 성모님 관련 내용이 아니라 연중이 들어간 거 같아. 원인 파악해서 보고해봐."
- **팀/GOAL**: dvo, [TEAM GOAL] #187 (research/base-lifecycle/LOW). 조사 sub-task #188 → dvo-sol(Explore 교차검증) + 리더 직접 코드/라이브 실측.
- **심각도**: MEDIUM (전례 정확성 — 기념일 고유 기도문 미표시. 코드 크래시는 아님)
- **분류**: 데이터 공백(missing sanctoral propers) — 코드 버그 아님.

---

## 증상

2026-06-13 = 티없이 깨끗하신 성모 성심(Immaculate Heart of Mary) 기념일(예수 성심 대축일 다음 토요일). 앱에서 이 날의 본기도(collect/concludingPrayer) 등 고유 기도가 성모 고유부가 아니라 **연중(Ordinary Time) 평일 토요일 기도문**으로 렌더됨.

---

## 근본 원인 (확정: 가설 b — 날짜는 인식되나 고유 데이터 부재 → OT 폴백)

### 1) 달력 인식은 정상 — `romcal`이 성모 성심으로 인식

```
$ node -e "const romcal=require('romcal').default||require('romcal');
  const cal=romcal.calendarFor({year:2026,locale:'en'});
  const arr=Array.isArray(cal)?cal:(cal.dates||[]);
  for(const h of arr.filter(e=>(e.date||'').toString().includes('2026-06-13')))
    console.log(JSON.stringify({name:h.name,type:h.type}));"
{"name":"Immaculate Heart of Mary","type":"FEAST"}
```

→ 달력 레이어는 2026-06-13을 "Immaculate Heart of Mary"로 정확히 식별. **가설 (a) "달력 미등록" 반증.**

### 2) 고유 기도문 데이터가 앱에 부재

```
$ python3 -c "import json; d=json.load(open('src/data/loth/sanctoral/memorials.json')); print(list(d.keys()))"
['11-02', 'deceased', 'saturday-mary']
```

`memorials.json`의 최상위 키는 `11-02`(위령)·`deceased`·`saturday-mary` **셋뿐** — `06-13`(성모 성심) 항목 없음. `solemnities.json` / `feasts.json` / `optional-memorials.json` 어디에도 "Immaculate Heart" / "Heart of Mary" / `06-13` 없음 (grep 0건). `solemnities.json`의 "immaculate"는 **12-08 Immaculate Conception(성모 잉태)**일 뿐 성심이 아님.

### 3) 해석 경로가 비어서 연중으로 폴백

- `src/lib/calendar.ts:56-57` — SOLEMNITY/FEAST/MEMORIAL 이면 `getSanctoralPropers(mmdd)?.name` 조회. mmdd='06-13' → `getSanctoralPropers`(`propers-loader.ts:345`, solemnities→feasts→memorials 순 mmdd 키 검색)가 **null** 반환(데이터 없음).
- movable 대축일 매처 `resolveSpecialKey`(`propers-loader.ts:97-148`)의 ORDINARY_TIME 분기는 `trinity`/`corpusChristi`/`sacredHeart`/`christTheKing` **4개만** 매치 — 성모 성심 없음. 게다가 이 함수는 `rank === 'SOLEMNITY'` 일 때만 호출됨(`calendar.ts:64`, `:154`) — 성모 성심은 **기념일(MEMORIAL)**이라 애초에 이 경로를 안 탐.
- 고유 데이터를 못 얻으니 `getSeasonHourPropers`(`propers-loader.ts:150-202`)의 마지막 폴백 `weeks[weekKey]?.[day] ?? weeks['1']?.[day]` = **연중 주간 토요일 기도문**이 그대로 렌더됨.

→ "데이터 없으면 연중으로 채운다"는 설계상 안전망(폴백)이 그대로 노출된 것. **코드 버그가 아니라 데이터 공백.**

---

## 수정 방향 (BLOCKED — 전례 텍스트 출처 결정 필요)

1. 정석: `memorials.json`에 `06-13` 성모 성심 고유부(본기도 + 후렴) 추가.
   - **전제**: 프로젝트 정책상 몽골어 고유 기도문은 추측/MT 금지 → 몽골어 책(`full_pdf.txt`) 실제 인쇄본에 성모 성심 고유 기도문이 있는지부터 확인. 있으면 그 텍스트로, 없으면 폴백 정책 적용.
2. 우회안: 이미 데이터에 존재하는 일반 토요일 성모 기념 `saturday-mary`(`getSaturdayMaryMemorial()`)를 06-13에 폴백 연결. 단 성모 '성심' 고유 본기도는 아니므로 전례 정확성은 부분적 — 전례 판단 필요.

사용자 결정(2026-06-13): **이번 GOAL은 원인 보고로 종결**. 실제 고유 기도문 채우기(수정)는 몽골어 책 원문 확보 후 별도 GOAL.

---

## 관련 기록
- 메모리: `solemnity-firstvespers-book-fallback`(대축일 고유부 출처/폴백 정책), `divineoffice-prayer-source-model`.
- 동일 영역 선행: GOAL #177(가동 대축일 제1저녁 running-week 폴백, `loth-service.ts:~423`).
