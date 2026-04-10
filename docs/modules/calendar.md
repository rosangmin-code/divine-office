# 전례력 (Calendar)

## 담당 소스 파일
- `src/lib/calendar.ts` — romcal 기반 연간 전례력 생성, 시기/색상/등급/시편주간 매핑
- `src/lib/mappings.ts` — romcal 키를 내부 타입으로 변환 (SEASON_MAP, COLOR_MAP, RANK_MAP), 몽골어 이름
- `src/lib/types.ts` — `LiturgicalDayInfo`, `LiturgicalSeason`, `LiturgicalColor` 타입 정의

## 관련 데이터 파일
- romcal (npm dependency) — 전례력 계산 라이브러리

## 관련 테스트 파일
- `e2e/liturgical-calendar.spec.ts` — 5개 시기별 색상/시기명 검증, 시기 전환 경계 테스트
- `src/lib/__tests__/calendar.test.ts`

## 기능 요구사항

| ID | 요구사항 | 상태 |
|----|----------|------|
| FR-001 | romcal 라이브러리를 사용하여 임의 날짜의 전례일 정보를 계산한다 (전례일명, 시기, 색상, 등급, 시편집 주간). | 완료 |
| FR-002 | 5개 전례시기를 지원한다: ADVENT, CHRISTMAS, LENT, EASTER, ORDINARY_TIME. | 완료 |
| FR-003 | 전례색 5가지를 지원한다: GREEN, VIOLET, WHITE, RED, ROSE. | 완료 |
| FR-004 | 축일 등급 5단계를 지원한다: SOLEMNITY, FEAST, MEMORIAL, OPTIONAL_MEMORIAL, WEEKDAY. | 완료 |
| FR-005 | 주일주기(A/B/C), 평일주기(1/2), 시편집 주간(I-IV)을 자동 계산한다. | 완료 |
| FR-006 | 연중시기 주간 번호(otWeek)를 romcal 전례일명에서 파싱하여 할당한다. | 완료 |

## 의존성
- 없음 (기반 모듈)
