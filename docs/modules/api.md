# REST API

## 담당 소스 파일
- `src/app/api/calendar/today/route.ts` — `GET /api/calendar/today`
- `src/app/api/calendar/date/[date]/route.ts` — `GET /api/calendar/date/[date]`
- `src/app/api/loth/[date]/[hour]/route.ts` — `GET /api/loth/[date]/[hour]`

## 관련 데이터 파일
- 없음 (API 레이어는 다른 모듈의 서비스를 호출)

## 관련 테스트 파일
- `e2e/api.spec.ts` — 전례력 API 응답 구조, 기도 조립 API 상세 검증, 에러 응답 코드
- `e2e/error-handling.spec.ts` — invalid hour/date 에러 메시지

## 기능 요구사항

| ID | 요구사항 | 상태 |
|----|----------|------|
| FR-080 | `GET /api/calendar/today` — 오늘의 전례일 정보를 JSON으로 반환한다. | 완료 |
| FR-081 | `GET /api/calendar/date/[date]` — 지정 날짜(YYYY-MM-DD)의 전례일 정보를 JSON으로 반환한다. | 완료 |
| FR-082 | `GET /api/loth/[date]/[hour]` — 지정 날짜/기도시간의 조립된 기도문을 JSON으로 반환한다. 유효한 hour: lauds, vespers, compline. | 완료 |
| FR-083 | 잘못된 hour 파라미터에 400, 데이터 없음에 404를 반환한다. | 완료 |

## 의존성
- **hour-assembly** — `assembleHour()` 호출 (기도 조립 API)
- **calendar** — `getLiturgicalDay()` 호출 (전례력 API)
