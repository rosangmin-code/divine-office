# PRD: 몽골어 성무일도 웹앱 (Mongolian Liturgy of the Hours)

**문서 버전**: 1.1  
**작성일**: 2026-04-09 (최종 수정: 2026-04-12)  
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
| 통상문 (Ordinarium) | 찬미가, 초대송/초대송 교송, 찬가(canticles), 끝기도, 공통기도문 | `src/data/loth/ordinarium/{invitatory.json,invitatory-antiphons.json,hymns.json,hymns-index.json,canticles.json,compline.json,common-prayers.json}` |
| 시편 본문 (stanza 구조) | 교독 낭송용 stanza 단위 시편 본문 | `src/data/loth/psalter-texts.json` |
| 몽골어 성경 | 구약/신약/복음서 JSONL | `src/data/bible/{bible_ot,bible_nt_rest,bible_gospels}.jsonl` |
| romcal | 전례력 계산 라이브러리 | npm dependency |

---

## 2. 기능 요구사항 (Functional Requirements)

모듈별 상세 요구사항은 아래 문서를 참조:

| 모듈 | 문서 | FR 범위 | 상태 요약 |
|------|------|---------|-----------|
| 전례력 | [calendar.md](modules/calendar.md) | FR-001~006 | 전체 완료 |
| 기도시간 조립 | [hour-assembly.md](modules/hour-assembly.md) | FR-010~016 | 아침/저녁/끝기도 완료. 낮기도는 assembler 구현됨이나 propers 데이터 미비로 **API/UI 비활성화**. 독서기도는 미구현 |
| 4주 시편집 | [psalter.md](modules/psalter.md) | FR-020~023 | 전체 완료 |
| 고유문 | [propers.md](modules/propers.md) | FR-030~032, FR-040~045, FR-050~051 | 대부분 완료 (성인축일 확장 미완료) |
| 찬미가 | [hymns.md](modules/hymns.md) | FR-060~063 | 전체 완료 |
| 성경 본문 | [bible.md](modules/bible.md) | FR-070~072 | 전체 완료 |
| REST API | [api.md](modules/api.md) | FR-080~083 | 전체 완료 |
| UI 페이지/컴포넌트 | [ui.md](modules/ui.md) | FR-090~098 | 전체 완료 |
| 가이드 (총지침) | [guide.md](modules/guide.md) | FR-100~102 | 전체 완료 (범위: 원서 p.8-20 — 서문·소개 발췌·지침 개요·각주 28개. 원서 p.22 이후의 "Залбиралт цагийн ёслолын дэг жаяг" 공통문 본문은 [hour-assembly](modules/hour-assembly.md)가 `/pray/[date]/[hour]`로 제공) |
| PWA 설치 기능 | [PRD §8](#8-pwa-설치-기능) | FR-110~114 | 전체 완료 |
| 시편 본문 · stanza | [PRD §9](#9-시편-본문-및-stanza-구조) | FR-120~122 | 전체 완료 |

---

## 3. 비기능 요구사항 (Non-Functional Requirements)

| ID | 요구사항 | 상태 |
|----|----------|------|
| NFR-001 | 모바일 반응형 디자인: 터치 타겟 44px 이상, 글꼴 14px 이상. `max-w-2xl` 기본, `lg:max-w-3xl` 확장. | 완료 |
| NFR-002 | 몽골어 UI: 모든 사용자 대면 텍스트는 몽골어(키릴 문자)로 표시한다. 홈/기도 페이지 전례일 카드는 `LiturgicalDayInfo.nameMn`(sanctoral 몽골어 이름 우선, 이외에는 `시기 + N-р долоо хоног + 요일` 합성)을 렌더링하며, 홈 헤더에는 영어 부제 "Liturgy of the Hours"를 표시하지 않는다. | 완료 |
| NFR-003 | Vercel 배포: Fluid Compute 기반 서버리스 함수, Next.js App Router SSR. | 부분 완료 (코드 배포 가능 상태이나 `vercel.json`/`vercel.ts` 미존재, Vercel 기본 감지에 의존) |
| NFR-004 | TypeScript strict mode로 전체 코드베이스를 작성한다. | 완료 |
| NFR-005 | 데이터 캐싱: 전례력(yearCache), 시편집(psalterCache), 계절 고유문(seasonCache), 성인축일(sanctoralCache), 찬미가(_hymns, _hymnsIndex)를 인메모리 캐시한다. | 완료 |
| NFR-006 | E2E 테스트: Playwright로 API 및 페이지 테스트를 수행한다. | 완료 |
| NFR-013 | 모바일 박스 여백 최적화: 박스형 섹션(`article`, 배경색 섹션, `AntiphonBox`)의 padding을 모바일에서 축소하고 `md:` 이상에서만 기본값 사용. 375px 뷰포트에서 기도 본문 가용 폭 ≥ 280px, 중첩 antiphon 박스 내부 폭 ≥ 260px 보장. | 완료 |

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
├── guide/
│   └── page.tsx                       # 성무일도 총지침 가이드
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
| `LiturgicalDayInfo` | 날짜, 전례일명(`name` 영어·내부용/`nameMn` 몽골어·UI 표시용), 시기, 색상, 등급, 주일주기, 평일주기, 시편집주간 |
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
| 낮기도 (Terce/Sext/None) | **비활성화** | `assembleDaytimePrayer` 조립기는 구현됨 (시편+찬미가 기본). 짧은독서/화답/마침기도 데이터 미완성으로 API `VALID_HOURS` 및 홈 `getHoursSummary()`에서 제외됨 — 사용자 접근 불가 |
| 독서기도 (Office of Readings) | **비활성화** | 타입(`OfficeOfReadingsPropers`, `PatristicReading`)만 정의, assembler 미등록. API `VALID_HOURS` 및 홈 `getHoursSummary()`에서 제외됨 |

### 6.2 남은 작업

| 우선순위 | 작업 | 관련 ID |
|----------|------|---------|
| P1 | 성인축일 고유문 확장 (14개 → 로마 보편 달력 전체) | FR-045 |
| P2 | 낮기도 짧은 독서/화답/마침기도 데이터 보충 **→ 완료 후 `VALID_HOURS`/`getHoursSummary()` 재활성화** | FR-014 |
| P2 | 독서기도 assembler 구현 및 교부 독서 데이터 확보 **→ 완료 후 `VALID_HOURS`/`getHoursSummary()` 재활성화** | FR-015 |
| P2 | `vercel.ts` 프로젝트 설정 파일 추가 (현재 Vercel 기본 감지 의존) | NFR-003 |
| P3 | Triduum (성삼일) 특별 전례 처리 | - |
| ~~P3~~ | ~~오프라인 지원 (Service Worker / PWA)~~ → 구현 완료 | FR-110~114 |
| P3 | 주간/월간 기도 달력 뷰 | - |
| P2 | PDF 페이지 주석 확장 (week-1 일요일 → 전체 4주 + 계절 고유문) | FR-017 |

---

## 7. PDF 페이지 참조 기능

### 7.1 기능 요구사항

| ID | 요구사항 | 모듈 | 우선순위 | 상태 |
|----|----------|------|----------|------|
| FR-017 | **PDF 페이지 참조 표시**: 각 기도문 섹션(시편, 교송, 찬미가, 짧은독서, 화답, 복음찬가교송, 중보기도, 마침기도 등)에 원본 PDF의 페이지 번호를 루브리카 스타일로 표시한다. 형식: `(х. N)` — 빨간색 60% 투명도, 섹션 헤더 옆에 위치. | UI | P2 | 구현 완료 (데이터 일부) |
| FR-018 | **페이지 참조 토글 설정**: `/settings` 페이지의 "Хуудасны лавлагаа" switch로 페이지 참조 표시를 켜고 끌 수 있다. 기본값: 꺼짐. 설정은 localStorage에 영구 저장되며, 페이지 새로고침 후에도 유지된다. | UI/설정 | P2 | 완료 |
| FR-019 | **설정 시스템 기반**: SettingsProvider React Context를 통한 확장 가능한 설정 시스템. 모든 설정은 독립 설정 페이지(`/settings`)에서 통합 관리한다. 기도 페이지 헤더에는 `/settings`로 이동하는 톱니바퀴 링크(`SettingsLink`)만 배치한다. | UI/설정 | P2 | 완료 |

### 7.2 비기능 요구사항

| ID | 요구사항 | 상태 |
|----|----------|------|
| NFR-007 | **SSR 하이드레이션 호환**: 설정 토글은 client component로 구현하되, SSR 기본값과 client 하이드레이션 사이 불일치를 방지해야 한다. | 완료 |
| NFR-008 | **접근성**: `/settings`의 페이지 참조 switch는 `role="switch"` + `aria-checked` + `aria-labelledby` 패턴 사용. PageRef에 aria-label 제공. | 완료 |
| NFR-009 | **성능 무영향**: page 필드는 optional이므로 데이터 미주석 상태에서도 기존 기능에 영향 없음. | 완료 |

### 7.3 구현 상세

- **데이터 스키마**: `PsalmEntry`, `ShortReading`, `Responsory`, `AssembledPsalm`, `HourSection` 11개 variant에 `page?: number` 필드 추가. `HourPropers`에 `hymnPage?`, `intercessionsPage?`, `concludingPrayerPage?`, `gospelCanticleAntiphonPage?` 추가.
- **설정 시스템**: `src/lib/settings.tsx`에 `SettingsProvider` + `useSettings()` hook 구현. localStorage 키 `loth-settings`.
- **UI**: `src/components/page-ref.tsx` — `PageRef` client component. `src/app/settings/page.tsx` "Хуудасны лавлагаа" switch(`role="switch"`) — 페이지 참조 표시 on/off 단일 진입점.
- **데이터 주석 현황**: `week-1.json` 일요일 lauds에 샘플 page 번호 주석 완료. 나머지 JSON 파일은 점진적으로 확장 필요.

---

## 8. PWA 설치 기능

### 8.1 기능 요구사항

| ID | 요구사항 | 모듈 | 우선순위 | 상태 |
|----|----------|------|----------|------|
| FR-110 | **Web App Manifest**: Next.js App Router `manifest.ts` 컨벤션으로 `/manifest.webmanifest`를 자동 서빙한다. 몽골어 `name`/`short_name`/`description`, `lang: "mn"`, `display: "standalone"`, `start_url: "/"`, `theme_color: "#2d6a4f"`, `background_color: "#fafaf9"` 포함. | PWA | P3 | 완료 |
| FR-111 | **앱 아이콘**: `public/icon.svg`(전례 녹색 배경의 십자가)를 매니페스트 `any` + `maskable` 목적으로 제공. Next.js `icon.tsx`/`apple-icon.tsx`로 favicon(32px)과 Apple touch icon(180px)을 `ImageResponse`로 자동생성한다. | PWA | P3 | 완료 |
| FR-112 | **Service Worker 등록**: `SwRegistrar` client component가 프로덕션 환경에서 `load` 이벤트 이후 `/sw.js`를 scope `/`로 등록한다. localhost/개발 환경에서는 등록하지 않아 HMR 충돌을 방지한다. | PWA | P3 | 완료 |
| FR-113 | **오프라인 폴백**: 네트워크 불가 시 내비게이션 요청에 대해 `/offline.html`(몽골어 "Интернэт холболтгүй байна" + 재시도 버튼)을 제공한다. 자체 완결적(외부 리소스 없음), 다크모드 대응. | PWA | P3 | 완료 |
| FR-114 | **캐싱 전략**: Service Worker는 내비게이션 요청은 network-first(실패 시 캐시/오프라인 폴백), 정적 자산(script/style/font/image)은 cache-first로 처리한다. 활성화 시 구버전 캐시를 정리한다. | PWA | P3 | 완료 |

### 8.2 비기능 요구사항

| ID | 요구사항 | 상태 |
|----|----------|------|
| NFR-010 | **PWA 설치 가능성**: 유효한 매니페스트 + 등록된 SW + HTTPS(Vercel) 조건을 만족해 브라우저 A2HS 프롬프트 기준을 통과한다. | 완료 |
| NFR-011 | **SW 업데이트**: `next.config.ts`에서 `/sw.js`에 `Cache-Control: no-cache, no-store, must-revalidate` + `Service-Worker-Allowed: /` 헤더를 강제하여 Vercel CDN이 SW를 캐시하지 않도록 한다. | 완료 |
| NFR-012 | **오프라인 페이지 UX**: `public/offline.html`은 외부 의존성 없이 인라인 CSS로 렌더링되며, 앱 디자인(stone-50/neutral-950, 전례 녹색 CTA)과 일치한다. | 완료 |

### 8.3 구현 상세

- **매니페스트**: `src/app/manifest.ts` — `MetadataRoute.Manifest` 타입, `/manifest.webmanifest`로 서빙. Next.js가 `<link rel="manifest">`를 `<head>`에 자동 삽입.
- **아이콘**: `public/icon.svg` (매니페스트 레퍼런스), `src/app/icon.tsx` (32x32 favicon), `src/app/apple-icon.tsx` (180x180 apple-touch-icon). `next/og`의 `ImageResponse`로 PNG 런타임 생성.
- **Service Worker**: `public/sw.js` — `divine-office-v1` 캐시, `install`에서 `/offline.html`+`/icon.svg` 프리캐시, `activate`에서 구버전 정리, `fetch`에서 navigation(network-first) / static-asset(cache-first) 분기.
- **등록**: `src/components/sw-registrar.tsx` — `'use client'`, `useEffect`에서 `navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })`. `NODE_ENV !== 'production'`에서는 건너뜀.
- **레이아웃**: `src/app/layout.tsx` — `<SwRegistrar />` 렌더링, `viewport.themeColor: '#2d6a4f'`, `metadata.appleWebApp` 추가.
- **헤더**: `next.config.ts`의 `async headers()`에서 `/sw.js` 라우트에 no-cache + Service-Worker-Allowed 헤더 주입.

---

## 9. 시편 본문 및 Stanza 구조

### 9.1 기능 요구사항

| ID | 요구사항 | 모듈 | 우선순위 | 상태 |
|----|----------|------|----------|------|
| FR-120 | **Stanza 단위 시편 본문 저장**: `src/data/loth/psalter-texts.json`에 각 시편 참조(`"Psalm 63:2-9"` 등)를 키로 stanza 배열(문자열 배열의 배열)을 저장한다. PDF 원서의 교독 낭송 구분을 그대로 반영한다. | 데이터 | P2 | 완료 |
| FR-121 | **Stanza 해석 파이프라인**: `resolvePsalm()`(`src/lib/hours/shared.ts`)이 stanza 정보를 `AssembledPsalm`의 구조화 필드로 전달해, 교독 낭송(antiphonal recitation)을 위한 UI 표시가 가능하도록 한다. | 조립 | P2 | 완료 |
| FR-122 | **초대송 교송 분리 데이터**: `src/data/loth/ordinarium/invitatory-antiphons.json`에 시기/축일별 초대송 교송을 분리 저장한다. `buildInvitatory()`가 이를 참조해 적절한 교송을 선택한다. | 데이터 | P2 | 완료 |

### 9.2 구현 상세

- **Stanza 데이터**: `src/data/loth/psalter-texts.json` (5,900+ 줄). 스크립트: `scripts/extract-psalm-texts.js` (PDF 파싱 결과 `parsed_data/` → stanza 추출).
- **렌더링**: `src/components/psalm-block.tsx`가 stanza 경계에서 시각적 구분을 제공. 루브리카 스타일과 통합.
- **초대송 교송**: `src/lib/hours/shared.ts`의 `buildInvitatory()`가 `invitatory-antiphons.json`에서 선택, `invitatory.json`의 Venite 본문과 결합.

---

## 10. 사용자 설정 페이지

### 10.1 기능 요구사항

| ID | 요구사항 | 모듈 | 우선순위 | 상태 |
|----|----------|------|----------|------|
| FR-025 | **글씨 크기 조정**: `/settings`에서 5단계(XS/S/M/L/XL, 각각 87.5%/93.75%/100%/112.5%/125%)로 본문 글씨 크기를 선택한다. `<html>`의 `font-size`를 백분율로 스케일하므로 Tailwind `rem` 기반 텍스트가 전 페이지에서 비례 반영된다. 기본값 M. | UI/설정 | P2 | 완료 |
| FR-026 | **글꼴 선택**: Sans(Noto Sans) / Serif(Noto Serif) 중 택일. `<html>`의 `data-font-family` 속성으로 전역 적용. 기본값 Sans. | UI/설정 | P2 | 완료 |
| FR-027 | **테마 모드**: 라이트/다크/시스템 3-way 선택. `/settings` 페이지의 Горим 섹션에서만 변경 가능(단일 진입점). "시스템"은 `prefers-color-scheme`을 따르고 OS 설정 변경에 실시간 반응한다. 기본값 시스템. 저장소는 `loth-settings.theme`. | UI/설정 | P2 | 완료 |
| FR-028 | **헤더 기어 아이콘**: 홈, 가이드, 기도 페이지 헤더에 `/settings`로 가는 기어 아이콘 링크를 제공한다. `aria-label="Тохиргоо"`. 별도의 헤더 테마 토글은 제공하지 않는다(FR-027 단일 진입점 원칙). | UI | P2 | 완료 |
| FR-029 | **설정 페이지 헤더 뒤로가기**: `/settings` 페이지 상단에 홈으로 돌아가는 화살표 아이콘 링크를 제공한다. `aria-label="Нүүр хуудас"`. 최소 44×44px 터치 타겟, 홈/가이드 헤더 아이콘 버튼과 동일한 스타일. | UI/설정 | P2 | 완료 |
| FR-030 | **글꼴 미리보기**: `/settings`의 `Үсгийн хэлбэр` 섹션 하단에 현재 `fontSize` + `fontFamily`를 반영한 미리보기 박스를 표시한다. 몽골어(주기도문 발췌) + 라틴어(`Dominus tecum.`) 한 줄씩. `data-testid="font-preview"`. | UI/설정 | P2 | 완료 |
| FR-031 | **초대송 접기/펼치기**: 아침기도의 초대송(`Урих дуудлага`) 섹션을 헤더 한 줄로 접을 수 있다. 기본값은 접힘. 제목 옆 chevron 토글 버튼(`aria-expanded`, `aria-controls="invitatory-body"`)으로 상태를 전환한다. 접힘 시 versicle/response/교송/시편/영광송 모두 숨기고 제목만 남긴다. 상태는 `loth-settings.invitatoryCollapsed`로 localStorage에 영구 저장되며 새로고침 후에도 유지된다. | UI/설정 | P2 | 완료 |

### 10.2 비기능 요구사항

| ID | 요구사항 | 상태 |
|----|----------|------|
| NFR-014 | **FOUC 방지**: `<head>` 인라인 스크립트가 paint 이전에 `loth-settings`를 localStorage에서 읽어 `<html>`의 `data-font-size`/`data-font-family`/`dark` 클래스를 선반영한다. | 완료 |
| NFR-015 | **설정 페이지 접근성**: 라디오 그룹은 `role="radiogroup"` + `aria-labelledby`, 각 옵션은 `role="radio"` + `aria-checked`. 페이지참조 토글은 `role="switch"` + `aria-checked`. 최소 44px 터치 타겟. | 완료 |
| NFR-016 | **팔레트 일관성**: 설정 페이지의 활성 강조색과 토글 스위치는 전체 parchment/sepia/brass-gold 팔레트와 일관되도록 `liturgical-gold`(`#a8893c` / dark `#c9a961`)를 사용한다. 전례색으로서의 `liturgical-green`은 전례 배지·경계에만 국한한다. | 완료 |
| NFR-017 | **테마 모드 그리드 반응형**: `Горим` 3-way 선택 버튼은 모바일(`< sm`)에서 `grid-cols-1`, sm 이상에서 `grid-cols-3`로 배치하여 긴 라벨의 줄바꿈과 타겟 크기 유지를 보장한다. | 완료 |

### 10.3 구현 상세

- **Settings 확장**: `src/lib/settings.tsx` — `FontSize`/`FontFamily`/`ThemeMode` 타입 추가, `DEFAULTS`에 기본값 포함. `useEffect`가 설정 변경 시 `document.documentElement`의 data 속성과 dark 클래스를 적용. `system` 테마일 때 `matchMedia('(prefers-color-scheme: dark)')` 리스너 등록.
- **CSS 스케일링**: `src/app/globals.css` — `html[data-font-size="xs|sm|md|lg|xl"]`에 `font-size: 87.5%..125%`; `html[data-font-family="serif"] body`에 Serif 전환.
- **Pre-paint 스크립트**: `src/app/layout.tsx`의 `<head>` 인라인 스크립트가 `loth-settings`를 우선 읽고, 없으면 구 `theme` 키, 최종 fallback으로 `prefers-color-scheme`.
- **UI**: `src/app/settings/page.tsx` — 라디오 그룹 3개 + 스위치 1개, 몽골어 레이블. `src/components/settings-link.tsx` — 헤더 기어 아이콘 `<Link>`.
- **테마 변경 단일 진입점**: 헤더 전용 `ThemeToggle` 컴포넌트는 제거되었으며, 테마 변경은 `/settings`의 Горим 섹션에서만 이루어진다. `loth-settings.theme` 단일 저장소는 유지.
- **팔레트**: 활성 라디오/스위치는 `border-liturgical-gold` / `bg-liturgical-gold/10` / `bg-liturgical-gold` 조합. 카드 표면은 `bg-white`(parchment `#faf6ec` 오버라이드) + `ring-1 ring-stone-200`.
- **미리보기**: 폰트 패밀리 섹션 하단 `data-testid="font-preview"` 박스가 현재 `<html data-font-size>` + `data-font-family`를 통해 스타일을 상속한다.

---

## 11. 용어 정의

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
