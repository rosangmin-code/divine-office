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
| 몽골어 성경 | 구약/신약/복음서 JSONL (MoSociety 2019). 시편 fallback 및 짧은 독서용. **복음 노래(Benedictus/Magnificat/Nunc Dimittis)는 PDF 원문과 번역이 다르므로 사용하지 않음** — `canticles.json`의 `verses` 배열 사용 | `src/data/bible/{bible_ot,bible_nt_rest,bible_gospels}.jsonl` |
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
| 찬미가 | [hymns.md](modules/hymns.md) | FR-060~067 | 전체 완료 |
| 성경 본문 | [bible.md](modules/bible.md) | FR-070~072 | 전체 완료 |
| REST API | [api.md](modules/api.md) | FR-080~083 | 전체 완료 |
| UI 페이지/컴포넌트 | [ui.md](modules/ui.md) | FR-090~098 | 전체 완료 |
| 가이드 (총지침) | [guide.md](modules/guide.md) | FR-100~102 | 전체 완료 (범위: 원서 p.8-20 — 서문·소개 발췌·지침 개요·각주 28개) |
| 공통문 (дэг жаяг) | [ordinarium.md](modules/ordinarium.md) | FR-103~105 | 전체 완료 (범위: 원서 p.22-48 — 아침·저녁 기도 공통문·루브릭·시편 95/100/67/24·Benedictus·Magnificat) |
| PWA 설치 기능 | [PRD §8](#8-pwa-설치-기능) | FR-110~114 | 전체 완료 |
| 시편 본문 · stanza | [PRD §9](#9-시편-본문-및-stanza-구조) | FR-120~122 | 전체 완료 |
| 기도문 선택 | [PRD §13](#13-기도문-선택-기능) | FR-130~131 | 전체 완료 |
| 축일 선택 | [PRD §14](#14-축일-선택-기능) | FR-140~144 | 완료 |

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
| NFR-014 | 모바일 시편 가독성: stanza 단위 시각적 그룹화. stanza 내부 줄 간격은 `leading-relaxed`(line-height 1.625)만으로 처리하고 줄 사이 vertical margin은 0. stanza 간 간격은 모바일 ≥20px(`space-y-5`), 데스크톱 ≥16px(`md:space-y-4`). 모바일 시편 좌측 padding ≥12px(`pl-3`). NFR-013 본문 가용 폭 보장과 호환. | 완료 |

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
| HourCardList | 기도시간 카드 목록 (단순 링크 목록, 시간 기반 상태 표시 없음) |
| HourIcon | 기도시간별 아이콘 |
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
| `HourSection` | 16가지 discriminated union: invitatory, hymn, psalmody, shortReading, responsory, gospelCanticle, intercessions, ourFather, concludingPrayer, dismissal, patristicReading, examen, blessing, marianAntiphon. hymn에 `candidates`/`selectedIndex`, marianAntiphon에 `candidates?: MarianAntiphonCandidate[]`/`selectedIndex?`, concludingPrayer에 `alternateText?`, intercessions에 파싱된 `introduction?`/`refrain?`/`petitions?: { versicle; response? }[]`/`closing?` 포함 |

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
| P3 | Triduum (성삼일) 특별 전례(수난예식·부활성야) 처리 — 성주간 평일 기도문(성목·성금·성토 lauds/vespers)은 `lent.json weeks.6`에 구현 | - |
| ~~P3~~ | ~~오프라인 지원 (Service Worker / PWA)~~ → 구현 완료 | FR-110~114 |
| P3 | 주간/월간 기도 달력 뷰 | - |
| P2 | PDF 페이지 주석 확장 (week-1 일요일 → 전체 4주 + 계절 고유문) | FR-017 |

---

## 12. 루브릭(빨간색 텍스트) 및 교송 라벨링

### 12.1 기능 요구사항

| ID | 요구사항 | 모듈 | 우선순위 | 상태 |
|----|----------|------|----------|------|
| FR-125 | **교송 라벨 구분**: PDF 원문에 따라 시편(psalm) 교송에는 "Шад дуулал:", 찬가(canticle) 교송에는 "Шад магтаал:" 접두사를 표시한다. `AntiphonBox` 컴포넌트가 `label` prop('psalm' \| 'canticle')을 받아 구분 렌더링한다. | UI | P1 | 완료 |
| FR-126 | **Dismissal 루브릭 빨간색 표시**: 전례 지시문("Санваартан эсвэл тахилч удирдаж байгаа бол:", "Хувийн уншлагын үед:")을 PDF 원문과 동일하게 빨간색으로 렌더링한다. | UI | P1 | 완료 |
| FR-127 | **초대송 루브릭 렌더링**: `invitatory.json`의 `rubric` 필드(대체 시편 선택 안내)를 초대송 섹션 상단에 빨간색 이탤릭으로 표시한다. | UI | P1 | 완료 |
| FR-128 | **Gloria Patri 생략 루브릭**: `gloriaPatri: false`인 찬가에서 "Эцэг, Хүү, Ариун Сүнсэнд жавхланг... уншихгүй" 빨간색 루브릭 텍스트를 표시한다. | UI | P1 | 완료 |
| FR-129 | **조건부 Alleluia 분리**: sanctoral 고유문에서 `(Аллэлуяа!)` 조건부 루브릭을 교송 텍스트에서 분리하고 `alleluiaConditional: true` 필드로 표현한다. | 데이터 | P1 | 완료 |
| FR-150 | **중보기도 역할 구조화 (Гүйлтын залбирал)**: 중보기도 섹션을 파싱하여 도입부와 화답 후렴(amber 박스 + italic)을 분리하고, 각 청원의 부제 몫(versicle)과 회중 응답을 다른 줄로 나눠 렌더링한다. 응답 줄 앞에는 PDF 원문과 동일하게 빨간색 `- ` 접두사를 붙이며 별도의 `R.`/`Д.` 역할 라벨은 사용하지 않는다. 구분자 `" - "`(시편집) 및 `" — "`(계절/성인 고유문) 모두 인식하며, `"Тэнгэр дэх Эцэг минь ээ..."` 마침 힌트는 italic 문단으로 분리한다. 빨간색 dash는 §12.1 루브릭 규칙(`text-red-700 dark:text-red-400`)을 따른다. 파싱 실패 시 기존 flat 리스트 폴백. | UI / 데이터 | P1 | 완료 |

### 12.2 데이터 품질 수정 (2026-04-16)

| 수정 내용 | 영향 파일 |
|-----------|-----------|
| 잘린 concludingPrayer/gospelCanticleAntiphon 텍스트 6건 복원 | `week-2.json`, `week-3.json`, `week-4.json`, `christmas.json` |
| Week 3 TUE vespers intercessions 오염 데이터 정리 (33→7개, shortReading 중복 제거) | `week-3.json` |
| Week 1/3 SAT vespers 시편 3개씩 빈 antiphon/title 채움 | `week-1.json`, `week-3.json` |

### 12.3 구현 상세

- **교송 라벨**: `src/components/prayer-renderer.tsx`의 `AntiphonBox`가 `label?: 'psalm' | 'canticle'` prop을 받음. `psalm-block.tsx`에서 `psalm.psalmType`에 따라 전달, gospel canticle 섹션에서는 `label="canticle"` 고정, invitatory에서는 기본값 `'psalm'` 사용.
- **루브릭 색상**: Dismissal 지시문은 `text-red-700/80 dark:text-red-400/80`으로 변경. 초대송 rubric은 `invitatory-section.tsx`에서 `text-xs italic text-red-700/80` 렌더링.
- **초대송 루브릭 전파**: `src/lib/hours/types.ts`의 `Ordinarium.invitatory`에 `rubric?: string` 추가 → `shared.ts`의 `loadOrdinarium()`에서 추출 → `buildInvitatory()`에서 `HourSection`으로 전달 → `invitatory-section.tsx`에서 렌더링.
- **Gloria Patri 생략**: `psalm-block.tsx`에서 `gloriaPatri === false`(명시적 false) 조건으로 빨간색 안내 텍스트 표시.
- **조건부 Alleluia**: `solemnities.json`(03-19, 03-25), `feasts.json`(11-09)에서 `(Аллэлуяа!)` 텍스트 제거 + `"alleluiaConditional": true` 필드 추가.
- **중보기도 파서 (FR-150)**: `src/lib/hours/intercessions.ts`의 `parseIntercessions(raw: string[])`가 JSON 원본을 `{ introduction?, refrain?, petitions: [{ versicle, response? }], closing? }` 구조로 변환. 응답 종결 휴리스틱(마침표/물음표/느낌표로 끝나면 다음 줄을 새 petition으로 판단)으로 다중 라인 응답을 올바르게 병합. lauds/vespers assembler에서 호출하여 `HourSection.intercessions`에 파싱 필드와 raw `items`를 함께 전달. `prayer-renderer.tsx`의 `IntercessionsSection`은 `petitions.length > 0`이면 구조화 뷰(도입부 본문 / 후렴 amber 박스 / 청원 versicle + 빨간 `- ` 접두 응답 / 마침), 그렇지 않으면 기존 flat 리스트 뷰로 폴백 렌더링. PDF 원문은 응답 줄 앞에 빨간 `-`만 두고 별도 `R.`/`Д.` 라벨이 없으므로 라벨 span은 모두 제거.

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
| FR-123 | **PDF 컬럼 wrap 정규화**: `extract-psalm-texts.js`가 stanza 내(및 인접 stanza 경계)에서 키릴 소문자로 시작하는 줄을 직전 줄의 wrap continuation으로 간주해 합친다. 의미 있는 절(hemistich) 줄바꿈은 보존. | 데이터 | P2 | 완료 |
| FR-124 | **시편 구간 정확 매칭**: `Psalm N:start-end` 참조에 대해 추출기는 chapter + verseStart까지 함께 매칭한다. 매칭 실패 시 chapter-only fallback은 PDF가 전체 시편을 하나로 낭송하는 경우(예: `Дуулал 11`)에만 허용하며, sub-section 헤더(`Дуулал 119:145-152`)에는 매칭하지 않는다. 같은 chapter의 서로 다른 구간이 동일 본문을 공유하지 않는다. | 데이터 | P1 | 완료 |
| FR-132 | **Дууллыг төгсгөх залбирал (시편 마침기도)**: 각 시편 본문 뒤 Gloria Patri 직후에 PDF 원서의 "Дууллыг төгсгөх залбирал" 제목 + 기도문을 표시한다. 데이터는 `src/data/loth/psalter-texts.json`의 entry에 `psalmPrayer?: string` 필드로 저장되며 `extract-psalm-texts.js`가 parsed_data에서 stanza와 함께 추출한다. `AssembledPsalm.psalmPrayer`를 통해 `PsalmBlock`이 렌더링(`data-role="psalm-prayer"`)하며, 데이터가 없으면 섹션을 완전히 숨긴다. 동일 `ref`에서 기도문 충돌 시 첫값 유지. | UI/데이터 | P1 | 완료 |

### 9.2 구현 상세

- **Stanza 데이터**: `src/data/loth/psalter-texts.json`. 스크립트: `scripts/extract-psalm-texts.js`. 추출 단계에서 `mergeColumnWraps()`(소문자 시작 줄을 직전 줄로 합침)와 `mergeAcrossStanzaBoundaries()`(stanza 경계를 가로지르는 wrap continuation 처리)가 적용됨(FR-123). 헤더 매칭은 `parseRefKey()`가 verseStart까지 추출해 `buildHeaderRegexes()`가 precise + chapter-only fallback을 분리해 시도(FR-124).
- **시편 마침기도(FR-132)**: `psalter-texts.json` entry에 `psalmPrayer?: string` 필드 확장. `extract-psalm-texts.js`의 `extractPsalmPrayer()`가 `Дууллыг төгсгөх залбирал` 마커 뒤에서 다음 END_MARKER까지 텍스트를 수집한다. 본문 단락 내부에서 나타나는 빈 줄은 PDF 페이지 브레이크로 인한 분할로 간주해 lookahead로 이어진 줄이 소문자 키릴 시작이면 계속 수집, 그 외(새 rubric/섹션)면 종료. `mergeColumnWraps()` 적용 후 공백 결합해 한 문단 문자열로 저장. `PsalmBlock`이 Gloria Patri 바로 아래 렌더링.
- **렌더링**: `src/components/psalm-block.tsx`. stanza = 1개의 `<p>`, 줄 = `<span className="block">` 패턴. stanza 내부 줄 사이 vertical margin 0, stanza 사이 모바일 `space-y-5`/데스크톱 `md:space-y-4`. 모바일 좌측 padding `pl-3`(NFR-014).
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
| 교송 | Шад дуулал / Шад магтаал | Antiphon | 시편 전후에 바치는 짧은 구절. 시편용은 "Шад дуулал", 찬가용은 "Шад магтаал" |
| 화답 | - | Responsory | 독서 후 응답 구절 |
| 찬미가 | - | Hymn | 전례 시가 |
| 초대송 | - | Invitatory | 하루 첫 기도의 도입부 |
| 복음찬가 | - | Gospel Canticle | Benedictus / Magnificat / Nunc Dimittis |
| 중보기도 | - | Intercessions | 공동 청원 기도 |
| 마침기도 | - | Concluding Prayer | 기도시간 마무리 기도 |
| 성모교송 | - | Marian Antiphon | 끝기도 후 성모 관련 교송 (Salve Regina 등) |

---

## 13. 기도문 선택 기능

### 13.1 기능 요구사항

| ID | 요구사항 | 모듈 | 우선순위 | 상태 |
|----|----------|------|----------|------|
| FR-130 | **성모교송 선택**: 끝기도의 성모교송(Marian Antiphon) 4개 옵션 중 사용자가 자유롭게 선택할 수 있다. 기본값은 Salve Regina("Төгс жаргалт Цэвэр Охин Мариагийн хүндэтгэлийн дуу"). 대안: "Аврагчийн хайрт эх", "Тэнгэрийн Хатан", "Амар амгалан Мариа". 찬미가 선택 메뉴와 동일한 UI 패턴 사용. | UI/조립 | P1 | 완료 |
| FR-131 | **대체 마침기도 선택**: 마침기도(concludingPrayer)에 대안(alternativeConcludingPrayer)이 존재하는 경우, 사용자가 기본/대체 기도문을 토글로 선택할 수 있다. 아침기도/저녁기도는 계절 고유문의 `alternativeConcludingPrayer` 필드(70건), 끝기도는 `compline.json`의 `concludingPrayer.alternate` (일요일/토요일)를 사용. 대안이 없는 날에는 토글 미표시. | UI/조립 | P1 | 완료 |

### 13.2 구현 상세

- **성모교송 선택**: `src/components/marian-antiphon-section.tsx` — `'use client'` 컴포넌트, `hymn-section.tsx`와 동일한 `useState` + 드롭다운 패턴. `HourSection`의 `marianAntiphon` 타입에 `candidates?: MarianAntiphonCandidate[]`와 `selectedIndex?: number` 추가. `compline.ts`가 `complineData.marianAntiphon[]` 전체를 candidates로 전달.
- **대체 마침기도 선택**: `src/components/concluding-prayer-section.tsx` — `'use client'` 컴포넌트, 2개 옵션이므로 단순 토글 버튼 UI. `HourSection`의 `concludingPrayer` 타입에 `alternateText?: string` 추가. `lauds.ts`/`vespers.ts`는 `mergedPropers.alternativeConcludingPrayer`를, `compline.ts`는 `complineData.concludingPrayer.alternate`를 fallback으로 전달.
- **데이터 변경 없음**: `compline.json`(4개 성모교송), `propers/*.json`(alternativeConcludingPrayer 70건) 모두 이미 완비. 로더(`psalter-loader.ts`, `propers-loader.ts`)도 변경 불필요.

---

## 14. 축일 선택 기능

### 14.1 배경 및 목적

romcal은 하루에 **한 가지 전례일**만 반환하지만, 실제 전례에서는 여러 축일/기념일이 겹치거나 **선택 가능한 기념일(Optional Memorial, 사선택 기념일)** 이 존재한다. 사용자는 다음 상황에서 축일을 스스로 선택해 해당 축일의 기도를 바칠 수 있어야 한다:

1. **연중시기 평일 + 선택 기념일**: 평일 기도 또는 성인 기념 기도 중 선택.
2. **연중시기 토요일의 성모 기념(`saturday-mary`)**: 이미 데이터는 있으나 UI에서 선택할 수 없음 → 이 섹션에서 노출.
3. **같은 날 여러 선택 기념일**: 예) 같은 날 두 성인 중 한 명을 선택.

기본값은 romcal이 반환하는 전례일이며, 사용자가 선택기로 다른 축일을 고를 때만 바뀐다.

### 14.2 기능 요구사항

| ID | 요구사항 | 모듈 | 우선순위 | 상태 |
|----|----------|------|----------|------|
| FR-140 | **선택 가능 축일 데이터**: `src/data/loth/sanctoral/optional-memorials.json`에 MM-DD 키 + 슬러그별 선택 기념일 엔트리를 정의한다. 각 엔트리는 `name`, `nameMn`, `rank`(OPTIONAL_MEMORIAL 기본), `color`(색상), `lauds`/`vespers` 고유문(HourPropers)을 포함한다. 토요일 성모 기념(`saturday-mary`)은 토요일 연중시기 평일에 가상 MM-DD로 노출된다. | 데이터 | P1 | 구현 진행 |
| FR-141 | **축일 옵션 API**: `GET /api/calendar/options/[date]` — 주어진 날짜의 선택 가능한 모든 축일 옵션(`CelebrationOption[]`)을 반환한다. 응답 각 항목: `id`(슬러그), `name`, `nameMn`, `rank`, `color`, `colorMn`, `isDefault`, `source`('romcal'\|'optional'\|'votive'). 옵션이 단 1개(default만)인 날짜도 단일 배열로 반환. | API | P1 | 구현 진행 |
| FR-142 | **축일 선택 UI**: 홈 페이지에서 해당 날짜에 대체 옵션이 존재하면(options.length > 1) 축일 선택기(라디오 그룹)를 표시한다. 선택 시 URL 쿼리(`?celebration=<id>`)가 갱신되고, 각 시간 카드의 링크(`/pray/[date]/[hour]?celebration=<id>`)에 쿼리가 전파된다. 단일 옵션만 있는 날짜에는 선택기를 숨긴다. | UI | P1 | 구현 진행 |
| FR-143 | **기도 조립 오버라이드**: `assembleHour(dateStr, hour, { celebrationId })` 시그니처 확장. `celebrationId`가 해당 날짜의 유효 옵션이면 Layer 3 sanctoral propers를 해당 엔트리로 교체하고, `liturgicalDay.nameMn`·`rank`·`color`·`colorMn`을 override한다. 기본값(`celebrationId === 'default'` 또는 미지정)은 기존 romcal 흐름을 유지한다. `/api/loth/[date]/[hour]?celebration=<id>` 쿼리 파라미터로도 동일하게 적용. | 조립/API | P1 | 구현 진행 |
| FR-144 | **pray 페이지 쿼리 전파**: `/pray/[date]/[hour]?celebration=<id>` 경로는 선택된 축일을 반영해 렌더링하며, 헤더의 전례일 라벨과 시기 배지 색상이 동기화된다. 내부 네비게이션(이전/다음 시간, 뒤로 링크)에도 쿼리 유지. | UI | P1 | 구현 진행 |

### 14.3 데이터 모델

```ts
// src/lib/types.ts 추가
export interface CelebrationOption {
  id: string                   // 'default' | `${mmdd}-${slug}` | 'saturday-mary'
  name: string                 // English
  nameMn: string               // Mongolian
  rank: CelebrationRank
  color: LiturgicalColor
  colorMn: string
  isDefault: boolean           // romcal이 반환한 당일 대표 전례
  source: 'romcal' | 'optional' | 'votive'
}

// src/data/loth/sanctoral/optional-memorials.json 샘플
{
  "04-17-benedict-joseph-labre": {
    "mmdd": "04-17",
    "name": "Saint Benedict Joseph Labre",
    "nameMn": "Гэгээн Бенедикт Иосеф Лабрэ",
    "rank": "OPTIONAL_MEMORIAL",
    "color": "WHITE",
    "lauds": { "concludingPrayer": "..." },
    "vespers": { "concludingPrayer": "..." }
  }
}
```

### 14.4 구현 상세

- **데이터 로더**: `src/lib/propers-loader.ts` — `loadOptionalMemorials()` + `getOptionalMemorialEntry(id)` 추가. 파일 누락 시 빈 객체 반환(기존 `memorials.json` 패턴과 동일).
- **옵션 계산**: `src/lib/celebrations.ts` (신설) — `getCelebrationOptions(dateStr)` 함수. ① romcal 기본 전례일을 default로 추가 → ② 연중시기 평일(`WEEKDAY`)이면 optional-memorials.json에서 MM-DD 매칭 엔트리 추가 → ③ 연중시기 토요일이면 `saturday-mary` 옵션 추가. 항상 단일 배열 반환.
- **조립 확장**: `src/lib/loth-service.ts` — `assembleHour(dateStr, hour, { celebrationId? })` 시그니처. `celebrationId !== 'default'`일 때 해당 옵션을 sanctoral 엔트리로 사용하고, `AssembledHour.liturgicalDay`의 `nameMn`/`rank`/`color`/`colorMn`를 덮어쓴다.
- **API**: 
  - 신설: `src/app/api/calendar/options/[date]/route.ts`.
  - 수정: `src/app/api/loth/[date]/[hour]/route.ts` — `URL.searchParams.get('celebration')`를 `assembleHour`에 전달.
- **UI**:
  - 신설: `src/components/celebration-picker.tsx` — `'use client'`, 라디오 그룹, 변경 시 `router.replace`로 쿼리 갱신.
  - 수정: `src/app/page.tsx` — options 로드, 다중 옵션 시 picker 렌더링, hour card 링크에 쿼리 전파.
  - 수정: `src/components/hour-card-list.tsx` — `celebrationId` prop 전달 지원.
  - 수정: `src/app/pray/[date]/[hour]/page.tsx` — `searchParams.celebration`을 `assembleHour`에 전달, 헤더에 선택된 축일 정보 반영. 내부 링크에 쿼리 유지.

### 14.5 테스트 전략

- **단위 (Vitest)**: `src/lib/__tests__/celebrations.test.ts`
  - 연중시기 평일(옵션 없음)은 `length === 1`.
  - 연중시기 토요일은 `saturday-mary`를 포함 → `length >= 2`.
  - 특정 MM-DD(테스트용 엔트리 추가한 날짜)는 해당 옵션 포함.
  - 알 수 없는 `celebrationId` 전달 시 기본값 fallback.
  - `assembleHour` 오버라이드: 사용 시 sanctoral 고유문(`concludingPrayer`)이 반영됨.

- **E2E (Playwright)**: `e2e/feast-selection.spec.ts`
  - 홈페이지 토요일 방문 → 축일 선택기 보임 → 성모 기념 선택 → 시간 카드 링크에 쿼리 반영.
  - `/pray/<sat>/lauds?celebration=saturday-mary` 직접 접근 → 성모 기념 마침기도 확인, 전례일 라벨이 성모 기념 이름으로 바뀜.
  - 단일 옵션 날짜(예: 대축일)는 선택기 미표시.
  - API `GET /api/calendar/options/[date]` 구조 검증.

### 14.6 스키마 요약

```
GET /api/calendar/options/2026-04-25
→ 200 { "date": "2026-04-25", "options": [
    { "id": "default", "name": "Saturday of the 3rd week of Easter", ... "isDefault": true, "source": "romcal" },
    { "id": "saturday-mary", "nameMn": "Төгс жаргалт цэвэр Охин Мариагийн Бямба гарагийг дурсахуй", ..., "source": "votive" }
]}

GET /api/loth/2026-04-25/lauds?celebration=saturday-mary
→ 200 AssembledHour { liturgicalDay.nameMn: "Төгс жаргалт…", sections: [ ..., concludingPrayer: <성모 마침기도> ] }
```
