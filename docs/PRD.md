# PRD: 몽골어 성무일도 웹앱 (Mongolian Liturgy of the Hours)

**문서 버전**: 1.0  
**작성일**: 2026-04-09  
**상태**: 진행 중  

---

## 1. 개요

### 1.1 제품 요약

몽골어 성무일도(Liturgy of the Hours / Divine Office) 웹 애플리케이션. 몽골어 축약본 *"Христийн шашны залбирлын хураангуй судар"* (485쪽 PDF)에서 파싱한 전례 데이터를 기반으로, 날짜와 기도시간에 맞는 완전한 기도문을 자동으로 조립하여 제공한다.

### 1.2 기술 스택

| 항목 | 기술 |
|------|------|
| 프레임워크 | Next.js 16.2 (App Router) |
| 언어 | TypeScript (strict mode) |
| UI | React 19, Tailwind CSS 4 |
| 전례력 | romcal ^1.3.0 |
| 배포 | Vercel (Fluid Compute) |
| 테스트 | Playwright (E2E) |

### 1.3 데이터 소스

| 소스 | 설명 | 위치 |
|------|------|------|
| 몽골어 축약본 PDF | 485쪽, 시편집 + 고유문 + 통상문 파싱 결과 | `parsed_data/` |
| 4주 시편집 | 주간별 시편 + 공통문 (독서, 화답, 중보기도, 마침기도) | `src/data/loth/psalter/week-{1..4}.json` |
| 계절 고유문 | 5개 전례시기별 고유문 | `src/data/loth/propers/{advent,christmas,lent,easter,ordinary-time}.json` |
| 성인축일 고유문 | 대축일/축일/기념일 | `src/data/loth/sanctoral/{solemnities,feasts,memorials}.json` |
| 통상문 (Ordinarium) | 찬미가, 초대송, 찬가(canticles), 끝기도, 공통기도문 | `src/data/loth/ordinarium/` |
| 몽골어 성경 | 구약/신약/복음서 JSONL | `src/data/bible/{bible_ot,bible_nt_rest,bible_gospels}.jsonl` |
| romcal | 전례력 계산 라이브러리 | npm dependency |

---

## 2. 기능 요구사항 (Functional Requirements)

### 2.1 전례력 계산

| ID | 요구사항 | 상태 |
|----|----------|------|
| FR-001 | romcal 라이브러리를 사용하여 임의 날짜의 전례일 정보를 계산한다 (전례일명, 시기, 색상, 등급, 시편집 주간). | 완료 |
| FR-002 | 5개 전례시기를 지원한다: ADVENT, CHRISTMAS, LENT, EASTER, ORDINARY_TIME. | 완료 |
| FR-003 | 전례색 5가지를 지원한다: GREEN, VIOLET, WHITE, RED, ROSE. | 완료 |
| FR-004 | 축일 등급 5단계를 지원한다: SOLEMNITY, FEAST, MEMORIAL, OPTIONAL_MEMORIAL, WEEKDAY. | 완료 |
| FR-005 | 주일주기(A/B/C), 평일주기(1/2), 시편집 주간(I-IV)을 자동 계산한다. | 완료 |
| FR-006 | 연중시기 주간 번호(otWeek)를 romcal 전례일명에서 파싱하여 할당한다. | 완료 |

### 2.2 기도시간 조립

| ID | 요구사항 | 상태 |
|----|----------|------|
| FR-010 | 아침기도(Lauds) 조립: 초대송, 찬미가, 시편 3개, 짧은 독서, 화답, 복음찬가(Benedictus)+교송, 중보기도, 주님의 기도, 마침기도, 파견. | 완료 |
| FR-011 | 저녁기도(Vespers) 조립: 찬미가, 시편 3개, 짧은 독서, 화답, 복음찬가(Magnificat)+교송, 중보기도, 주님의 기도, 마침기도, 파견. | 완료 |
| FR-012 | 끝기도(Compline) 조립: 양심성찰, 찬미가, 시편, 짧은 독서, 화답, Nunc Dimittis+교송, 마침기도, 강복, 성모교송(Salve Regina 등). | 완료 |
| FR-013 | 낮기도(Terce/Sext/None) 조립: 찬미가, 시편 3개, 파견. | 부분 완료 |
| FR-014 | 낮기도에 짧은 독서, 화답, 마침기도를 추가한다. | 미완료 (축약본 미포함) |
| FR-015 | 독서기도(Office of Readings) 조립: 시편 3개, 성경 독서, 교부 독서, 화답. | 미구현 (타입만 정의) |
| FR-016 | 초대송(Invitatory): 하루의 첫 번째 기도시간(lauds)에 "Ай Эзэн минь, уруулыг минь нээж өгөөч" 초대송을 포함한다. | 완료 |

### 2.3 4주 시편집 및 공통문

| ID | 요구사항 | 상태 |
|----|----------|------|
| FR-020 | 4주 주기 시편집에서 각 기도시간의 시편을 로드한다 (week-1.json ~ week-4.json). | 완료 |
| FR-021 | GILH SS157/SS183/SS199에 따라, 연중 평일의 짧은 독서/화답/중보기도/복음찬가교송/마침기도를 4주 주기 공통문(psalter commons)에서 순환 배정한다. | 완료 |
| FR-022 | 끝기도는 7일(요일별) 고정 주기를 사용한다 (compline.json). | 완료 |
| FR-023 | 시편 본문을 성경 JSONL에서 참조(reference) 기반으로 로드하고, 절 범위(verse range)와 접미사(a/b/c 반절)를 지원한다. | 완료 |

### 2.4 계절 고유문

| ID | 요구사항 | 상태 |
|----|----------|------|
| FR-030 | 5개 전례시기별 고유문(propers)을 로드하여 공통문을 덮어쓴다: advent.json, christmas.json, lent.json, easter.json, ordinary-time.json. | 완료 |
| FR-031 | 대림 12/17-24 특별 고유문을 날짜 키(dec17~dec24)로 우선 적용한다. | 완료 |
| FR-032 | 토요일 저녁기도는 다음 날 주일의 제1저녁기도(1st Vespers)로 처리한다 — 마침기도/복음찬가교송을 주일 고유문에서 가져온다. | 완료 |

### 2.5 성인축일 고유문

| ID | 요구사항 | 상태 |
|----|----------|------|
| FR-040 | 성인축일 고유문을 MM-DD 키로 로드하여 계절 고유문보다 높은 우선순위로 적용한다. | 완료 |
| FR-041 | 대축일 7개: 성 요셉(03-19), 주님 탄생 예고(03-25), 세례자 요한 탄생(06-24), 성 베드로와 성 바오로(06-29), 성모 승천(08-15), 모든 성인(11-01), 원죄 없이 잉태되신 복되신 동정 마리아(12-08). | 완료 |
| FR-042 | 축일 4개: 주님 봉헌(02-02), 주님 변모(08-06), 성 십자가 현양(09-14), 라테란 대성전 봉헌(11-09). | 완료 |
| FR-043 | 기념일 3개: 위령의 날(11-02), 위령 공통(deceased), 토요일 성모 기념(saturday-mary). | 완료 |
| FR-044 | 대축일/축일에서 replacesPsalter 플래그로 시편집 전체를 고유 시편으로 교체할 수 있다. | 완료 |
| FR-045 | 성인축일 고유문을 확장한다 (현재 14개 → 목표: 로마 보편 달력 전체). | 미완료 |

### 2.6 3단계 Fallback 로직

| ID | 요구사항 | 상태 |
|----|----------|------|
| FR-050 | 기도문 조립 시 3단계 우선순위를 적용한다: (1) psalter commons → (2) season propers → (3) sanctoral propers. 상위 레이어가 하위를 덮어쓴다. | 완료 |
| FR-051 | 교송(antiphon) 역시 동일한 우선순위로 덮어쓴다: 시편집 기본 교송 → 계절 교송 → 성인축일 교송. | 완료 |

### 2.7 찬미가 배정

| ID | 요구사항 | 상태 |
|----|----------|------|
| FR-060 | hymns-index.json의 seasonalAssignments를 사용하여 전례시기/기도시간에 맞는 찬미가를 자동 배정한다. | 완료 |
| FR-061 | 주간 번호(weekOfSeason) 기반 결정론적 순환(rotation)으로 찬미가를 선택한다. | 완료 |
| FR-062 | 고유문(propers) 또는 성인축일에서 찬미가가 지정된 경우 자동 배정보다 우선한다. | 완료 |
| FR-063 | ~100개 찬미가 텍스트를 hymns.json에서 로드한다. | 완료 |

### 2.8 성경 본문 로드

| ID | 요구사항 | 상태 |
|----|----------|------|
| FR-070 | JSONL 파일 3개(bible_ot.jsonl, bible_nt_rest.jsonl, bible_gospels.jsonl)에서 성경 본문을 로드한다. | 완료 |
| FR-071 | 시편 참조(예: "Psalm 63:2-9")를 파싱하여 해당 절만 추출한다. | 완료 |
| FR-072 | 짧은 독서(short reading)의 성경 참조를 해석하여 본문을 로드한다. | 완료 |

### 2.9 API

| ID | 요구사항 | 상태 |
|----|----------|------|
| FR-080 | `GET /api/calendar/today` — 오늘의 전례일 정보를 JSON으로 반환한다. | 완료 |
| FR-081 | `GET /api/calendar/date/[date]` — 지정 날짜(YYYY-MM-DD)의 전례일 정보를 JSON으로 반환한다. | 완료 |
| FR-082 | `GET /api/loth/[date]/[hour]` — 지정 날짜/기도시간의 조립된 기도문을 JSON으로 반환한다. 유효한 hour: lauds, terce, sext, none, vespers, compline. | 완료 |
| FR-083 | 잘못된 hour 파라미터에 400, 데이터 없음에 404를 반환한다. | 완료 |

### 2.10 UI 페이지

| ID | 요구사항 | 상태 |
|----|----------|------|
| FR-090 | 홈페이지(`/`): 오늘의 전례일 정보 표시, 6개 기도시간 카드 목록, 날짜 전후 이동 네비게이션. | 완료 |
| FR-091 | 날짜 선택기(DatePicker)로 임의 날짜 이동을 지원한다. | 완료 |
| FR-092 | 기도 페이지(`/pray/[date]/[hour]`): 조립된 기도문을 섹션별로 렌더링한다. | 완료 |
| FR-093 | 기도 페이지에서 이전/다음 기도시간으로 네비게이션할 수 있다. | 완료 |
| FR-094 | 전례색에 따른 좌측 보더 색상을 표시한다 (GREEN, VIOLET, WHITE, RED, ROSE). | 완료 |
| FR-095 | PrayerRenderer 컴포넌트가 16가지 섹션 타입을 렌더링한다: invitatory, hymn, psalmody, shortReading, responsory, gospelCanticle, intercessions, ourFather, concludingPrayer, dismissal, patristicReading, examen, blessing, marianAntiphon 등. | 완료 |
| FR-096 | 다크 모드/라이트 모드 토글을 지원한다 (ThemeToggle). | 완료 |
| FR-097 | loading.tsx로 Skeleton UI를 제공한다. | 완료 |
| FR-098 | error.tsx, not-found.tsx로 에러/404 상태를 처리한다. | 완료 |

---

## 3. 비기능 요구사항 (Non-Functional Requirements)

| ID | 요구사항 | 상태 |
|----|----------|------|
| NFR-001 | 모바일 반응형 디자인: 터치 타겟 44px 이상, 글꼴 14px 이상. `max-w-2xl` 기본, `lg:max-w-3xl` 확장. | 완료 |
| NFR-002 | 몽골어 UI: 모든 사용자 대면 텍스트는 몽골어(키릴 문자)로 표시한다. | 완료 |
| NFR-003 | Vercel 배포: Fluid Compute 기반 서버리스 함수, Next.js App Router SSR. | 완료 |
| NFR-004 | TypeScript strict mode로 전체 코드베이스를 작성한다. | 완료 |
| NFR-005 | 데이터 캐싱: 전례력(yearCache), 시편집(psalterCache), 계절 고유문(seasonCache), 성인축일(sanctoralCache), 찬미가(_hymns, _hymnsIndex)를 인메모리 캐시한다. | 완료 |
| NFR-006 | E2E 테스트: Playwright로 API 및 페이지 테스트를 수행한다. | 완료 |

---

## 4. 시스템 아키텍처

### 4.1 데이터 흐름

```
[romcal] → getLiturgicalDay(date) → LiturgicalDayInfo
                                          │
                                          ▼
                              assembleHour(date, hour)
                                          │
                    ┌─────────────────────┼──────────────────────┐
                    ▼                     ▼                      ▼
          getPsalterPsalmody()   getSeasonHourPropers()   getSanctoralPropers()
          getPsalterCommons()    getHymnForHour()
                    │                     │                      │
                    └─────────────────────┼──────────────────────┘
                                          ▼
                              3단계 Fallback 병합
                       psalterCommons → seasonPropers → sanctoralPropers
                                          │
                                          ▼
                              getAssembler(hour)(ctx)
                         ┌────────┬────────┬──────────┐
                         ▼        ▼        ▼          ▼
                    assembleLauds  assembleVespers  assembleCompline  assembleDaytimePrayer
                                          │
                                          ▼
                                   AssembledHour
                                  (sections: HourSection[])
```

### 4.2 라우트 구조

```
src/app/
├── page.tsx                           # 홈 (날짜별 기도시간 목록)
├── layout.tsx                         # 루트 레이아웃
├── loading.tsx                        # 홈 로딩 스켈레톤
├── error.tsx                          # 에러 바운더리
├── not-found.tsx                      # 404 페이지
├── pray/[date]/[hour]/
│   ├── page.tsx                       # 기도 렌더링 페이지
│   └── loading.tsx                    # 기도 로딩 스켈레톤
└── api/
    ├── calendar/
    │   ├── today/route.ts             # GET /api/calendar/today
    │   └── date/[date]/route.ts       # GET /api/calendar/date/[date]
    └── loth/[date]/[hour]/route.ts    # GET /api/loth/[date]/[hour]
```

### 4.3 핵심 모듈

| 모듈 | 경로 | 역할 |
|------|------|------|
| calendar | `src/lib/calendar.ts` | romcal 래핑, 전례일 계산, 연간 캐시 |
| mappings | `src/lib/mappings.ts` | romcal 키 → 내부 타입 매핑, 몽골어 이름 |
| psalter-loader | `src/lib/psalter-loader.ts` | 4주 시편집/공통문/끝기도 데이터 로드 |
| propers-loader | `src/lib/propers-loader.ts` | 계절 고유문, 성인축일, 찬미가 로드 |
| loth-service | `src/lib/loth-service.ts` | 메인 조립 오케스트레이터 |
| hours/index | `src/lib/hours/index.ts` | 기도시간별 assembler 라우팅 |
| hours/lauds | `src/lib/hours/lauds.ts` | 아침기도 조립기 |
| hours/vespers | `src/lib/hours/vespers.ts` | 저녁기도 조립기 |
| hours/compline | `src/lib/hours/compline.ts` | 끝기도 조립기 |
| hours/daytime-prayer | `src/lib/hours/daytime-prayer.ts` | 낮기도 조립기 (terce/sext/none 공유) |
| hours/shared | `src/lib/hours/shared.ts` | 공통 유틸: 시편 해석, 통상문 로드, 요일 변환 |

### 4.4 UI 컴포넌트

| 컴포넌트 | 역할 |
|----------|------|
| PrayerRenderer | AssembledHour의 sections 배열을 순회하며 16가지 섹션 타입 렌더링 |
| PsalmBlock | 개별 시편/찬가 블록 (교송, 제목, 절, 영광송) |
| DatePicker | 날짜 선택 입력 |
| HourIcon | 기도시간별 아이콘 |
| ThemeToggle | 다크/라이트 모드 전환 |
| Footer | 하단 정보 |

---

## 5. 데이터 모델

### 5.1 주요 타입 (types.ts)

| 타입 | 설명 |
|------|------|
| `LiturgicalDayInfo` | 날짜, 전례일명, 시기, 색상, 등급, 주일주기, 평일주기, 시편집주간 |
| `HourType` | `'officeOfReadings' \| 'lauds' \| 'terce' \| 'sext' \| 'none' \| 'vespers' \| 'compline'` |
| `PsalmEntry` | 시편/찬가 참조, 교송 키, 기본 교송, 영광송 포함 여부 |
| `HourPropers` | 교송 오버라이드, 짧은 독서, 화답, 복음찬가교송, 중보기도, 마침기도, 찬미가 |
| `SanctoralEntry` | 성인축일 고유문 (lauds/vespers/vespers2, 고유 시편 교체 옵션) |
| `AssembledHour` | 최종 조립 결과: hourType, 날짜, 전례일 정보, sections 배열 |
| `HourSection` | 16가지 discriminated union: invitatory, hymn, psalmody, shortReading, responsory, gospelCanticle, intercessions, ourFather, concludingPrayer, dismissal, patristicReading, examen, blessing, marianAntiphon |

---

## 6. 현재 상태 및 남은 작업

### 6.1 완성도 요약

| 기도시간 | 상태 | 비고 |
|----------|------|------|
| 아침기도 (Lauds) | **완성** | 연중시기 전체 (4주 공통문 + 5개 계절 고유문) |
| 저녁기도 (Vespers) | **완성** | 연중시기 전체 (4주 공통문 + 5개 계절 고유문) |
| 끝기도 (Compline) | **완성** | 7일 고정 주기, 양심성찰~성모교송까지 전체 |
| 낮기도 (Terce/Sext/None) | **부분 완료** | 시편 + 찬미가만 (독서/화답/마침기도 없음 - 축약본 미포함) |
| 독서기도 (Office of Readings) | **미구현** | 타입(`OfficeOfReadingsPropers`, `PatristicReading`)만 정의, assembler 없음 |

### 6.2 남은 작업

| 우선순위 | 작업 | 관련 ID |
|----------|------|---------|
| P1 | 성인축일 고유문 확장 (14개 → 로마 보편 달력 전체) | FR-045 |
| P2 | 낮기도 짧은 독서/화답/마침기도 데이터 보충 | FR-014 |
| P2 | 독서기도 assembler 구현 및 교부 독서 데이터 확보 | FR-015 |
| P3 | Triduum (성삼일) 특별 전례 처리 | - |
| P3 | 오프라인 지원 (Service Worker / PWA) | - |
| P3 | 주간/월간 기도 달력 뷰 | - |

---

## 7. 용어 정의

| 한국어 | 몽골어 | 영어 | 설명 |
|--------|--------|------|------|
| 성무일도 | Цагийн Залбирал | Liturgy of the Hours | 가톨릭 공적 기도 |
| 아침기도 | Өглөөний залбирал | Lauds | 오전 주요 기도시간 |
| 저녁기도 | Оройн залбирал | Vespers | 오후 주요 기도시간 |
| 끝기도 | Шөнийн залбирал | Compline | 취침 전 기도 |
| 낮기도 | Цагийн залбирал | Terce/Sext/None | 3시/6시/9시 기도 |
| 독서기도 | Уншлагын залбирал | Office of Readings | 성경 + 교부 독서 |
| 시편집 | - | Psalter | 4주 주기 시편 배정표 |
| 고유문 | - | Propers | 계절/축일별 고유 기도문 |
| 공통문 | - | Commons | 4주 주기 기본 기도문 |
| 통상문 | - | Ordinarium | 매일 고정 요소 (초대송, 찬가 등) |
| 교송 | - | Antiphon | 시편 전후에 바치는 짧은 구절 |
| 화답 | - | Responsory | 독서 후 응답 구절 |
| 찬미가 | - | Hymn | 전례 시가 |
| 초대송 | - | Invitatory | 하루 첫 기도의 도입부 |
| 복음찬가 | - | Gospel Canticle | Benedictus / Magnificat / Nunc Dimittis |
| 중보기도 | - | Intercessions | 공동 청원 기도 |
| 마침기도 | - | Concluding Prayer | 기도시간 마무리 기도 |
| 성모교송 | - | Marian Antiphon | 끝기도 후 성모 관련 교송 (Salve Regina 등) |
