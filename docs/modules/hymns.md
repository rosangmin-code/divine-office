# 찬미가 (Hymns)

## 담당 소스 파일
- `src/lib/propers-loader.ts` — `getHymnForHour()`: hymns-index.json의 seasonalAssignments 기반 자동 배정, weekOfSeason + dayOfWeek 일별 결정론적 rotation
- `src/lib/propers-loader.ts` — `getHymnCandidatesForHour()`: 해당 전례시기/기도시간의 전체 찬미가 후보 목록 반환
- `src/components/hymn-section.tsx` — 찬미가 표시 + 후보 선택 메뉴 UI (클라이언트 컴포넌트)

## 관련 데이터 파일
- `src/data/loth/ordinarium/hymns.json` — ~100개 찬미가 텍스트
- `src/data/loth/ordinarium/hymns-index.json` — 전례시기/기도시간별 찬미가 배정 규칙 (seasonalAssignments)

## 관련 테스트 파일
- `src/lib/__tests__/hymn-rotation.test.ts` — 일별 순환 로직 + 후보 함수 단위 테스트
- `e2e/prayer-lauds.spec.ts` — hymn section 존재 확인
- `e2e/prayer-vespers.spec.ts` — hymn section 존재 확인
- `e2e/prayer-sections.spec.ts` — hymn 라벨, 후보 메뉴, 선택 동작 E2E 확인

## 기능 요구사항

| ID | 요구사항 | 상태 |
|----|----------|------|
| FR-060 | hymns-index.json의 seasonalAssignments를 사용하여 전례시기/기도시간에 맞는 찬미가를 자동 배정한다. | 완료 |
| FR-061 | weekOfSeason + dayOfWeek 기반 일별 결정론적 순환(daily rotation)으로 찬미가를 선택한다. | 완료 |
| FR-062 | 고유문(propers) 또는 성인축일에서 찬미가가 지정된 경우 자동 배정보다 우선한다. | 완료 |
| FR-063 | ~100개 찬미가 텍스트를 hymns.json에서 로드한다. | 완료 |
| FR-064 | 기도 화면에서 해당 전례시기/기도시간의 찬미가 후보 목록을 펼쳐볼 수 있다. | 완료 |
| FR-065 | 후보 목록에서 다른 찬미가를 선택하면 해당 찬미가 텍스트로 교체된다. | 완료 |
| FR-066 | 고유문(propers)에서 지정된 찬미가인 경우 후보 메뉴를 표시하지 않는다. | 완료 |

## 의존성
- **calendar** — 전례시기, 주간 번호, 요일 정보 (찬미가 선택에 필요)
- **propers** — 고유문/성인축일에서 찬미가가 직접 지정된 경우 우선 적용
