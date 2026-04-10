# 찬미가 (Hymns)

## 담당 소스 파일
- `src/lib/propers-loader.ts` — `getHymnForHour()`: hymns-index.json의 seasonalAssignments 기반 자동 배정, weekOfSeason 결정론적 rotation

## 관련 데이터 파일
- `src/data/loth/ordinarium/hymns.json` — ~100개 찬미가 텍스트
- `src/data/loth/ordinarium/hymns-index.json` — 전례시기/기도시간별 찬미가 배정 규칙 (seasonalAssignments)

## 관련 테스트 파일
- (별도 전용 테스트 파일 없음 — 찬미가 존재 여부는 각 기도시간 E2E에서 간접 검증)
- `e2e/prayer-lauds.spec.ts` — hymn section 존재 확인
- `e2e/prayer-vespers.spec.ts` — hymn section 존재 확인
- `e2e/prayer-sections.spec.ts` — hymn 라벨 렌더링 확인

## 기능 요구사항

| ID | 요구사항 | 상태 |
|----|----------|------|
| FR-060 | hymns-index.json의 seasonalAssignments를 사용하여 전례시기/기도시간에 맞는 찬미가를 자동 배정한다. | 완료 |
| FR-061 | 주간 번호(weekOfSeason) 기반 결정론적 순환(rotation)으로 찬미가를 선택한다. | 완료 |
| FR-062 | 고유문(propers) 또는 성인축일에서 찬미가가 지정된 경우 자동 배정보다 우선한다. | 완료 |
| FR-063 | ~100개 찬미가 텍스트를 hymns.json에서 로드한다. | 완료 |

## 의존성
- **calendar** — 전례시기, 주간 번호 정보 (찬미가 선택에 필요)
- **propers** — 고유문/성인축일에서 찬미가가 직접 지정된 경우 우선 적용
