# 고유문 (Propers)

## 담당 소스 파일
- `src/lib/propers-loader.ts` — `getSeasonHourPropers()`: 계절 고유문 로드, `getSanctoralPropers()`: 성인축일 고유문 로드

## 관련 데이터 파일
- `src/data/loth/propers/advent.json`
- `src/data/loth/propers/christmas.json`
- `src/data/loth/propers/lent.json`
- `src/data/loth/propers/easter.json`
- `src/data/loth/propers/ordinary-time.json`
- `src/data/loth/sanctoral/solemnities.json`
- `src/data/loth/sanctoral/feasts.json`
- `src/data/loth/sanctoral/memorials.json`

## 관련 테스트 파일
- `e2e/special-days.spec.ts` — Advent Dec 20 date-keyed propers 검증, St. Joseph sanctoral propers 확인

## 기능 요구사항

### 계절 고유문

| ID | 요구사항 | 상태 |
|----|----------|------|
| FR-030 | 5개 전례시기별 고유문(propers)을 로드하여 공통문을 덮어쓴다: advent.json, christmas.json, lent.json, easter.json, ordinary-time.json. | 완료 |
| FR-031 | 대림 12/17-24 특별 고유문을 날짜 키(dec17~dec24)로 우선 적용한다. | 완료 |
| FR-032 | 토요일 저녁기도는 다음 날 주일의 제1저녁기도(1st Vespers)로 처리한다 — 마침기도/복음찬가교송을 주일 고유문에서 가져온다. | 완료 |

### 성인축일 고유문

| ID | 요구사항 | 상태 |
|----|----------|------|
| FR-040 | 성인축일 고유문을 MM-DD 키로 로드하여 계절 고유문보다 높은 우선순위로 적용한다. | 완료 |
| FR-041 | 대축일 7개: 성 요셉(03-19), 주님 탄생 예고(03-25), 세례자 요한 탄생(06-24), 성 베드로와 성 바오로(06-29), 성모 승천(08-15), 모든 성인(11-01), 원죄 없이 잉태되신 복되신 동정 마리아(12-08). | 완료 |
| FR-042 | 축일 4개: 주님 봉헌(02-02), 주님 변모(08-06), 성 십자가 현양(09-14), 라테란 대성전 봉헌(11-09). | 완료 |
| FR-043 | 기념일 3개: 위령의 날(11-02), 위령 공통(deceased), 토요일 성모 기념(saturday-mary). | 완료 |
| FR-044 | 대축일/축일에서 replacesPsalter 플래그로 시편집 전체를 고유 시편으로 교체할 수 있다. | 완료 |
| FR-045 | 성인축일 고유문을 확장한다 (현재 14개 → 목표: 로마 보편 달력 전체). | 미완료 |

### 3단계 Fallback 로직

| ID | 요구사항 | 상태 |
|----|----------|------|
| FR-050 | 기도문 조립 시 3단계 우선순위를 적용한다: (1) psalter commons → (2) season propers → (3) sanctoral propers. 상위 레이어가 하위를 덮어쓴다. | 완료 |
| FR-051 | 교송(antiphon) 역시 동일한 우선순위로 덮어쓴다: 시편집 기본 교송 → 계절 교송 → 성인축일 교송. | 완료 |

## 의존성
- **calendar** — 전례시기, 축일 등급 정보 (고유문 파일 선택에 필요)
