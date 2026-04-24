# FR-156 Scope — First Vespers of Sunday 전용 propers 지원

작성: 2026-04-24 · 상태: 계획

## 배경

Roman Rite 전례에서 Sunday 의 Vespers 는 두 번 노래된다:
- **1st Vespers (First Vespers)**: Saturday 저녁 — 다가오는 Sunday 의 1st Vespers
- **2nd Vespers**: Sunday 저녁 — 같은 Sunday 의 2nd Vespers (GIRM/GILH 용어로 "regular Sunday vespers")

1st Vespers 는 **자체 proper antiphons / psalms** 를 가지며 Sunday regular vespers 와 내용이 다르다. PDF "Монгол Католик Чуулганы Цаг Үйл Ариунсны Ном" p166-167 에서 확인:

```
2 ДУГААР ДОЛОО ХОНОГ
НЯМ ГАРАГ
1 дүгээр Оройн даатгал залбирал     ← 전용 섹션
...
Шад дуулал 1 Аяа Эзэн минь, Таны үг бол бидний замыг...
  Ирэлтийн цаг улирал: …              (advent variant)
  Дөчин хоногийн цаг улирлын 2 дахь:…  (lentSunday[2])
  Дөчин хоногийн цаг улирал, Эзэний тарчлалтын Ням гараг: …  (Passion Sunday)
  Амилалтын цаг улирлын 6 дахь:…       (easterSunday[6])
Дуулал 119:105-112 [body]
...[2 more psalms 동일 패턴]
```

## 현재 구현 한계

- **`src/lib/loth-service.ts:94-99`** — Saturday vespers 일 때 `getSeasonHourPropers(season, weekOfSeason+1, 'SUN', 'vespers', ...)` 로 **다음 Sunday 의 regular vespers propers** 를 재사용. First Vespers 의 고유 proper 는 **미활용**.
- **FR-155 variant extractor** — psalter `default_antiphon` prefix 매치로 앵커 바인딩. First Vespers 의 default_antiphon 은 psalter 계통과 다른 텍스트 → task #18 에서 3 orphan (PDF line 5554/5618/5693) 발생.
- **데이터 소스** — `propers/{season}.json` 에 `firstVespers` 슬롯 자체가 부재.

## 전례적 정확성 차이

현재 Saturday 저녁 렌더:
- Sunday 의 regular vespers propers (antiphon/responsory/intercessions/prayers) 재사용
- psalter default antiphon 그대로 표시

정확한 First Vespers:
- 전용 psalm 배열 (예: Week 2 Sunday 1st Vespers = Ps 119:105-112 + ...)
- 각 psalm 의 전용 default antiphon + 4-5종 seasonal variant
- 별도 shortReading / responsory / gospelCanticleAntiphon / concludingPrayer
- 별도 ref text (본 scope 에서는 reuse psalter-texts.json 가능)

## Phase 분할 (제안)

**Phase 1 — 스키마 + resolver wiring**
- `src/lib/types.ts`: `FirstVespersPropers` 타입 (기존 `HourPropers` 확장 또는 병렬)
- `src/lib/schemas.ts`: 동기화
- `src/data/loth/propers/{season}.json`: 각 Sunday 에 `firstVespers?: FirstVespersPropers` 슬롯 허용
- `src/lib/loth-service.ts`: Saturday vespers 분기에서 `firstVespers` 존재 시 **우선 채택**, 부재 시 기존 Sunday regular vespers fallback
- 기존 테스트 회귀 없음 + Phase 1 unit +3~5

**Phase 2 — 데이터 추출 스크립트**
- `scripts/extract-first-vespers.js` 신규 — PDF 의 "1 дүгээр Оройн даатгал залбирал" 섹션 블록 파싱
  - 섹션 앵커: `/^1 дүгээр Оройн даатгал залбирал\s*$/`
  - psalm 엔트리: `Шад дуулал N {default}` + seasonal markers + `Дуулал NNN` body
  - shortReading / responsory / gospelCanticleAntiphon / concludingPrayer 섹션 파싱 (기존 추출기 reuse)
- `scripts/verify-first-vespers.js` — byte-equal verifier
- 커버리지 리포트: Week 1-5 Advent / Lent / Easter 시즌별 Sunday 1st Vespers 건수

**Phase 3 — 렌더 + e2e**
- 기존 PrayerRenderer 분기가 `firstVespers` 데이터를 투명하게 처리하도록 확인 (타입만 맞으면 재사용)
- e2e: Saturday `/pray/2026-03-28/vespers` (Passion Sunday 전야) → First Vespers antiphon 노출 검증
- 기존 `easter-antiphon.spec.ts` / `prayer-vespers.spec.ts` 등 회귀 체크

**Phase 4 — 후속 정리**
- task #18 에서 flag 된 3 orphan (w2 first vespers Passion Sunday) 복구 확인
- FR-155 Phase 3 의 memorials Easter alt 3건은 별도 FR (deceased 전례 렌더링) 이 처리

## 종속성 / 전제

- FR-155 Phase 0-3c 완료 (시즌 variant 스키마 + extractor 파이프라인 기반 재사용 가능)
- `docs/PRD.md` NFR-009d 페이지 검증 규약 준수 (새로 주입되는 page 값)
- CLAUDE.md 의 SW 캐시 정책 — 링크/데이터 스키마 변경이라 `CACHE_VERSION` bump 검토

## 수용 기준 (overall)

- Saturday 저녁에 `/pray/{date}/vespers` 접속 시 First Vespers 전용 antiphon / responsory / prayer 가 렌더
- 기존 Sunday 저녁 (`/pray/{Sunday}/vespers`) 는 regular vespers 유지 (회귀 없음)
- `verify-first-vespers.js` mismatch=0 PASS
- vitest 회귀 없음 (241+ PASS 유지)
- Playwright e2e +2~3 (Saturday vespers First Vespers 렌더 검증)

## 규모 추정

- Phase 1: ~1일 (스키마 + resolver + 단위 테스트)
- Phase 2: ~1.5일 (PDF 추출 스크립트 + verifier + 4주 × 시즌 데이터 주입)
- Phase 3: ~0.5일 (e2e + 수동 브라우저 확인)
- 총 **~3일**

## 비스코프

- Sanctoral feast 의 First Vespers (별도 FR — sanctoral propers 영역)
- 평일 First Vespers (해당 안 됨 — 일요일/대축일 전용 개념)
- Office for the Dead First Vespers (FR-155 Phase 3 의 memorials.json easterAlt 와 연관된 별도 workstream)
