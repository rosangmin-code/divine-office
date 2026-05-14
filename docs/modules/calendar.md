# 전례력 (Calendar)

## 담당 소스 파일
- `src/lib/calendar.ts` — romcal 기반 연간 전례력 생성, 시기/색상/등급/시편주간 매핑
- `src/lib/mappings.ts` — romcal 키를 내부 타입으로 변환 (SEASON_MAP, COLOR_MAP, RANK_MAP), 몽골어 이름
- `src/lib/types.ts` — `LiturgicalDayInfo`, `LiturgicalSeason`, `LiturgicalColor` 타입 정의
- `src/lib/celebrations.ts` — `getCelebrationOptions(dateStr)`/`resolveCelebration` (FR-140~144). **FR-145 (#8)**: `CelebrationOption.kind` 자동 분류 (`automatic`/`weekday-baseline`/`fixed-sanctoral`/`optional-memorial`).
- **FR-145 (#8)**: `src/lib/calendar-list.ts` — 서버 어댑터 (`getCalendarRow`/`getTodayAnchorRow`/`getCalendarWindow`). image.png 형식 전례력 첫 화면용 행 데이터.
- **FR-145 (#8)**: `src/lib/calendar-list-types.ts` — 클라이언트-안전 타입 + `shouldRowUseRedAccent`(rank 기반) + `shiftDate`.

## 관련 데이터 파일
- romcal (npm dependency) — 전례력 계산 라이브러리

## 관련 테스트 파일
- `e2e/liturgical-calendar.spec.ts` — 5개 시기별 색상/시기명 검증, 시기 전환 경계 테스트
- `src/lib/__tests__/calendar.test.ts`
- `src/lib/__tests__/celebrations.test.ts` — `getCelebrationOptions`/`resolveCelebration`/assembleHour override
- **FR-145 (#8)**: `src/lib/__tests__/calendar-list.test.ts` — 16 케이스

## 기능 요구사항

| ID | 요구사항 | 상태 |
|----|----------|------|
| FR-001 | romcal 라이브러리를 사용하여 임의 날짜의 전례일 정보를 계산한다 (전례일명, 시기, 색상, 등급, 시편집 주간). | 완료 |
| FR-002 | 5개 전례시기를 지원한다: ADVENT, CHRISTMAS, LENT, EASTER, ORDINARY_TIME. | 완료 |
| FR-003 | 전례색 5가지를 지원한다: GREEN, VIOLET, WHITE, RED, ROSE. | 완료 |
| FR-004 | 축일 등급 5단계를 지원한다: SOLEMNITY, FEAST, MEMORIAL, OPTIONAL_MEMORIAL, WEEKDAY. | 완료 |
| FR-005 | 주일주기(A/B/C), 평일주기(1/2), 시편집 주간(I-IV)을 자동 계산한다. | 완료 |
| FR-006 | 연중시기 주간 번호(otWeek)를 romcal 전례일명에서 파싱하여 할당한다. | 완료 |
| FR-007 | 전례일명을 몽골어(`nameMn`)로도 제공한다. 대축일·축일·기념일은 sanctoral JSON의 몽골어 `name`을, 그 외는 `SEASON_NAMES_MN` + 주간번호(OT는 otWeek, 그 외는 weekOfSeason) + `DAY_NAMES_MN`으로 합성한다 (`buildLiturgicalNameMn`). | 완료 |
| FR-145 | 전례력 첫 화면 데이터 어댑터 (`calendar-list.ts` + `calendar-list-types.ts`) — anchor 날짜 기준 ±N일 윈도우, 동기 행 "Today (Автомат)", rank 기반 RED 강조 (`shouldRowUseRedAccent`), `optional-memorials.json` PDF-only 데이터 정책 준수. | 구현 (task #8) |

## 의존성
- 없음 (기반 모듈)
