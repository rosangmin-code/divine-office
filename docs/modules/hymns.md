# 찬미가 (Hymns)

## 담당 소스 파일
- `src/lib/propers-loader.ts` — `getHymnForHour()`: hymns-index.json의 seasonalAssignments 기반 자동 배정, weekOfSeason + dayOfWeek 일별 결정론적 rotation
- `src/lib/propers-loader.ts` — `getHymnCandidatesForHour()`: 해당 전례시기/기도시간의 전체 찬미가 후보 목록 반환
- `src/components/hymn-section.tsx` — 찬미가 표시 + 후보 선택 메뉴 UI (클라이언트 컴포넌트)

### 추출 파이프라인 (build-time, `scripts/`)
- `scripts/parsers/types.ts` — 공통 타입(`LineKind`, `ClassifiedLine`, `ParseResult<T>`)
- `scripts/parsers/lexer.ts` — 줄 단위 분류기(`classifyLine`, `classifyLines`). 몽골어 키릴(А-Я, Ё, Ө, Ү) 전역 반영
- `scripts/parsers/hymn-parser.ts` — `parseHymn(raw, { knownTitles })`: 3단계 파이프라인
  - ① 날짜 헤더 꼬리 태깅(`dateHeader` 이후 줄들을 구조적 단절 전까지 `dateHeaderTail`로 강등)
  - ② 연(stanza) 마커 승격(`N. 본문` 형태에서 제목이 `knownTitles`에 있으면 TOC 참조로 유지·폐기, 아니면 `stanzaMarker`로 승격하여 가사 보존)
  - ③ 세그먼트 분할·필터링(빈 줄로 분리, 유효 content 줄 ≥ 2개인 세그먼트만 유지)
- `scripts/extract-hymns.ts` — `hymns-index.json`에서 `knownTitles` 구성 후 `parseHymn` 호출해 `src/data/loth/ordinarium/hymns.json` 재생성

## 관련 데이터 파일
- `src/data/loth/ordinarium/hymns.json` — 122개 슬롯 중 107개 가사 채움 (부활시기 후보 15개로 계산). entry 별 `page?: number` 필드는 `scripts/extract-hymn-pages.js` 가 `parsed_data/hymns/hymns_full.txt` 의 `<번호>. <제목> <첫 3 본문줄>` 지문으로 매칭해 채운다 (본문 보유 entry 기준 100% 커버리지).
- `src/data/loth/ordinarium/hymns-index.json` — 전례시기/기도시간별 찬미가 배정 규칙 (seasonalAssignments)

## 관련 테스트 파일
- `src/lib/__tests__/hymn-rotation.test.ts` — 일별 순환 로직 + 후보 함수 단위 테스트
- `scripts/parsers/hymn-parser.test.ts` — 파서 6 케이스: 클린/attribution/오염 preamble/TOC-only/빈 입력/연 마커 보존
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
| FR-067 | 상위 `divine-office-reader` PDF 추출물에서 TOC 찌꺼기(전례일 헤더 꼬리, 대문자 섹션 제목, 세로 한 단어 목차, 교차참조 `N. 제목`)를 구조별 파서로 제거하고, 연(stanza) 번호가 붙은 실제 가사 줄은 보존해 `hymns.json`을 재생성한다. 파서는 `hymns-index.json` 제목 집합을 외부 컨텍스트로 받아 TOC 참조와 stanza 마커를 구분한다. | 완료 |

## 의존성
- **calendar** — 전례시기, 주간 번호, 요일 정보 (찬미가 선택에 필요)
- **propers** — 고유문/성인축일에서 찬미가가 직접 지정된 경우 우선 적용
