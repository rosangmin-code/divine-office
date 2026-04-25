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
- `src/data/loth/sanctoral/optional-memorials.json`

### 페이지 주석 (FR-017b / FR-017c)

`scripts/extract-propers-pages.js` 가 `parsed_data/propers/propers_full.txt` + `parsed_data/hymns/hymns_full.txt`(p.795+ OT 23주차 이후) 결합 소스에서 마침기도/복음찬가교송/대체마침기도/중보기도/짧은독서/응송 페이지를 자동 주입한다. 응송은 versicle+response 합쳐서 매칭(짧은 versicle 단독은 ambiguous 거절). 미매칭 항목은 `null` 유지 (PRD §7 NFR-009b 추측 금지). 커버리지 보장: propers 마침기도 99%↑, sanctoral 마침기도 90%↑.

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
| FR-045 | 성인축일 고유문을 확장한다 — PDF "Монгол Католик Чуулганы Цаг Үйл Ариунсны Ном" authored entries 전수 추출 (가능 범위). | 완료 (task #45, PDF 16건 = JSON 16건, gap=0) |

### 3단계 Fallback 로직

| ID | 요구사항 | 상태 |
|----|----------|------|
| FR-050 | 기도문 조립 시 3단계 우선순위를 적용한다: (1) psalter commons → (2) season propers → (3) sanctoral propers. 상위 레이어가 하위를 덮어쓴다. | 완료 |
| FR-051 | 교송(antiphon) 역시 동일한 우선순위로 덮어쓴다: 시편집 기본 교송 → 계절 교송 → 성인축일 교송. | 완료 |

## FR-045 PDF Sanctoral Audit (task #45)

PDF "Монгол Католик Чуулганы Цаг Үйл Ариунсны Ном" (Four-Week psalter.- 2025.pdf) sanctoral 섹션 (pages 821-870, parsed_data/full_pdf.txt lines 27945-29413) 전수 enumeration 결과 — 모든 PDF authored entries 가 sanctoral JSON 에 추출되어 있음을 확인.

### PDF dated entries (12개) — 모두 추출됨

| MM-DD | PDF page | rank | JSON 파일 |
|---|---|---|---|
| 02-02 | 821 | Баяр (FEAST) | `feasts.json` |
| 03-19 | 823 | Их баяр (SOLEMNITY) | `solemnities.json` |
| 03-25 | 825 | Их баяр (SOLEMNITY) | `solemnities.json` |
| 06-24 | 827 | Их баяр (SOLEMNITY) | `solemnities.json` |
| 06-29 | 829 | Их баяр (SOLEMNITY) | `solemnities.json` |
| 08-06 | 831 | Баяр (FEAST) | `feasts.json` |
| 08-15 | 833 | Их Баяр (SOLEMNITY) | `solemnities.json` |
| 09-14 | 835 | Баяр (FEAST) | `feasts.json` |
| 11-01 | 837 | Их баяр (SOLEMNITY) | `solemnities.json` |
| 11-02 | 839 | Дурсахуй (MEMORIAL) | `memorials.json` |
| 11-09 | 840 | Баяр (FEAST) | `feasts.json` |
| 12-08 | 842 | Их баяр (SOLEMNITY) | `solemnities.json` |

### PDF special sections (2개) — 모두 추출됨

| 명칭 | PDF page | JSON 키 |
|---|---|---|
| Талийгаач бологсдын төлөөх хурал (위령 공통) | 844-859 | `memorials.json::deceased` |
| Цэвэр Охин Мариагийн Бямба гарагийг дурсахуй (토요일 성모 기념) | 860-870 | `memorials.json::saturday-mary` |

### Christmas-season propers 출처 (2개) — 별 섹션이지만 sanctoral.json 에 저장됨

| MM-DD | 명칭 | JSON 파일 |
|---|---|---|
| 12-25 | ЭЗЭНИЙ МЭНДЭЛСЭН ӨДӨР (주님 성탄) | `solemnities.json` |
| 01-01 | ТЭНГЭРБУРХАНЫ АРИУН ЭХ МАРИА (천주의 성모 마리아) | `solemnities.json` |

### 비-PDF authored entries (3개) — **task #48 (FR-045 follow-up A) 에서 제거**

PDF 원문에 근거가 없는 외부 출처 3건은 FR-045 closure 직후 follow-up A 결정으로 제거했다 (task #48). `optional-memorials.json` 은 빈 객체 `{}` 로 비웠고, `propers-loader.ts::loadOptionalMemorials` / `celebrations.ts::getOptionalMemorialsForDate` / `types.ts::OptionalMemorialEntry` / API · 컴포넌트 인프라는 dormant 유지 — 추후 PDF authored optional memorial 이 추가되거나 별도 FR 로 외부 출처 카탈로그를 명시 도입할 때 즉시 재가동 가능하다.

| 키 | 제거 사유 | 사후 동작 |
|---|---|---|
| `04-17-benedict-joseph-labre` | PDF grep 0 hits, 외부 출처 (몽골 교구 후원 추정) | 04-17 평일은 default 옵션만 노출 |
| `06-13-anthony-of-padua` | PDF grep 0 hits, 외부 출처 | 06-13 평일은 default 옵션만 노출 |
| `10-04-francis-of-assisi` | PDF grep 0 hits, 외부 출처 | 10-04 평일은 default 옵션만 노출 |

옛 슬러그를 `?celebration=` 쿼리에 그대로 전달해도 `resolveCelebration` 이 graceful fallback 으로 default 를 반환한다 (`celebrations.test.ts` 의 dormant 인프라 회귀 가드 3 케이스 참고).

> **Follow-up (별건)**: PDF 외 로마 보편 달력 항목 (성 미카엘 등) 을 명시적 외부 출처 카탈로그로 추가하려면 별도 FR 로 분리 (소스 명시 + 라이선스 검토 필요).

## 의존성
- **calendar** — 전례시기, 축일 등급 정보 (고유문 파일 선택에 필요)
