# UI 페이지/컴포넌트

## 담당 소스 파일

### 페이지
- `src/app/page.tsx` — 홈페이지: 전례일 정보 카드, 기도시간 카드 목록, 날짜 네비게이션
- `src/app/layout.tsx` — 루트 레이아웃, 몽골어 설정, 폰트, 메타데이터
- `src/app/loading.tsx` — 홈 로딩 스켈레톤
- `src/app/error.tsx` — 에러 바운더리
- `src/app/not-found.tsx` — 404 페이지
- `src/app/pray/[date]/[hour]/page.tsx` — 기도 렌더링 페이지
- `src/app/pray/[date]/[hour]/loading.tsx` — 기도 로딩 스켈레톤

### 컴포넌트
- `src/components/prayer-renderer.tsx` — AssembledHour sections 배열 순회, 16가지 섹션 타입 렌더링
- `src/components/psalm-block.tsx` — 개별 시편/찬가 블록 (교송, 제목, 절, 영광송)
- `src/components/date-picker.tsx` — 날짜 선택 입력
- `src/components/hour-icon.tsx` — 기도시간별 아이콘
- `src/components/theme-toggle.tsx` — 다크/라이트 모드 전환
- `src/components/footer.tsx` — 하단 정보

## 관련 데이터 파일
- 없음 (API를 통해 데이터 수신)

## 관련 테스트 파일
- `e2e/homepage.spec.ts` — 기본 렌더링, OT 날짜 렌더링, 몽골어 시간명/아이콘, invalid date 에러
- `e2e/date-navigation.spec.ts` — 이전/다음 날짜 nav, 연도 경계, 연속 nav
- `e2e/mobile.spec.ts` — 수평 스크롤 없음, touch target >= 44px, font-size >= 14px
- `e2e/prayer-sections.spec.ts` — psalm block 구조, hymn 라벨, Our Father 본문, dismissal 구조

## 기능 요구사항

| ID | 요구사항 | 상태 |
|----|----------|------|
| FR-090 | 홈페이지(`/`): 오늘의 전례일 정보 표시, 기도시간 카드 목록(시간 기반 상태 표시 없이 단순 목록), 날짜 전후 이동 네비게이션. 전례일 카드 h2는 `liturgicalDay.nameMn`(몽골어) 단일 표시, 헤더는 몽골어 제목만 유지(영어 부제 "Liturgy of the Hours" 미표시). | 완료 |
| FR-091 | 날짜 선택기(DatePicker)로 임의 날짜 이동을 지원한다. | 완료 |
| FR-092 | 기도 페이지(`/pray/[date]/[hour]`): 조립된 기도문을 섹션별로 렌더링한다. 상단 헤더의 전례일 부제는 `liturgicalDay.nameMn`(몽골어)으로 표시. | 완료 |
| FR-093 | 기도 페이지에서 이전/다음 기도시간으로 네비게이션할 수 있다. | 완료 |
| FR-094 | 전례색에 따른 좌측 보더 색상을 표시한다 (GREEN, VIOLET, WHITE, RED, ROSE). | 완료 |
| FR-095 | PrayerRenderer 컴포넌트가 16가지 섹션 타입을 렌더링한다: invitatory, hymn, psalmody, shortReading, responsory, gospelCanticle, intercessions, ourFather, concludingPrayer, dismissal, patristicReading, examen, blessing, marianAntiphon 등. | 완료 |
| FR-096 | 다크 모드/라이트 모드 토글을 지원한다 (ThemeToggle). | 완료 |
| FR-097 | loading.tsx로 Skeleton UI를 제공한다. | 완료 |
| FR-098 | error.tsx, not-found.tsx로 에러/404 상태를 처리한다. | 완료 |
| FR-099 | 박스형 섹션의 padding은 모바일 우선 축소값을 사용한다: article `p-4 md:p-6 lg:p-8`, 배경색 섹션 박스 `p-3 md:p-4`, AntiphonBox `px-3 md:px-4 py-2`, PsalmBlock 절 컨테이너 `md:pl-2`. NFR-013 참조. | 완료 |

## 의존성
- **api** — REST API를 통해 전례일 정보 및 조립된 기도문 수신
