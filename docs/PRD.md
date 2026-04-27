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
| 기도시간 조립 | [hour-assembly.md](modules/hour-assembly.md) | FR-010~012 | 아침/저녁/끝기도 전체 완료 |
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
| NFR-018 | 모바일 시편 가독성: stanza 단위 시각적 그룹화. stanza 내부 줄 간격은 `leading-relaxed`(line-height 1.625)만으로 처리하고 줄 사이 vertical margin은 0. stanza 간 간격은 모바일 ≥20px(`space-y-5`), 데스크톱 ≥16px(`md:space-y-4`). 모바일 시편 좌측 padding ≥12px(`pl-3`). NFR-013 본문 가용 폭 보장과 호환. | 완료 |

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
                         ┌────────┬────────┐
                         ▼        ▼        ▼
                    assembleLauds  assembleVespers  assembleCompline
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
| hours/shared | `src/lib/hours/shared.ts` | 공통 유틸: 시편 해석, 통상문 로드, 요일 변환 |

### 4.4 UI 컴포넌트

| 컴포넌트 | 역할 |
|----------|------|
| PrayerRenderer | AssembledHour의 sections 배열을 순회하며 15가지 섹션 타입 렌더링 |
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
| `HourType` | `'lauds' \| 'vespers' \| 'compline'` |
| `PsalmEntry` | 시편/찬가 참조, 교송 키, 기본 교송, 영광송 포함 여부 |
| `HourPropers` | 교송 오버라이드, 짧은 독서, 화답, 복음찬가교송, 중보기도, 마침기도, 찬미가 |
| `SanctoralEntry` | 성인축일 고유문 (lauds/vespers/vespers2, 고유 시편 교체 옵션) |
| `AssembledHour` | 최종 조립 결과: hourType, 날짜, 전례일 정보, sections 배열 |
| `HourSection` | 15가지 discriminated union: invitatory, openingVersicle, hymn, psalmody, shortReading, responsory, gospelCanticle, intercessions, ourFather, concludingPrayer, dismissal, examen, blessing, marianAntiphon. hymn에 `candidates`/`selectedIndex`, marianAntiphon에 `candidates?: MarianAntiphonCandidate[]`/`selectedIndex?`, invitatory에 `candidates?`/`selectedIndex?` (4개 초대송 시편 대체), concludingPrayer에 `alternateText?`, intercessions에 파싱된 `introduction?`/`refrain?`/`petitions?: { versicle; response? }[]`/`closing?` 포함 |

---

## 6. 현재 상태 및 남은 작업

### 6.1 완성도 요약

| 기도시간 | 상태 | 비고 |
|----------|------|------|
| 아침기도 (Lauds) | **완성** | 연중시기 전체 (4주 공통문 + 5개 계절 고유문) |
| 저녁기도 (Vespers) | **완성** | 연중시기 전체 (4주 공통문 + 5개 계절 고유문) |
| 끝기도 (Compline) | **완성** | 7일 고정 주기, 양심성찰~성모교송까지 전체 |

### 6.2 남은 작업

| 우선순위 | 작업 | 관련 ID |
|----------|------|---------|
| ~~P1~~ | ~~성인축일 고유문 확장~~ — **PDF authored entries 전수 추출 완료** (task #45, gap=0). PDF 외 로마 보편 달력 항목 추가는 별건 follow-up | ~~FR-045~~ |
| ~~P2~~ | ~~PDF 뷰어 인터랙션 E2E 확장~~ — **페이지 이동 (스와이프 + 키보드) 은 FR-017j 에서 8건 e2e 추가로 구현 완료**. 잔여: 범위 초과 (1~969) 외 영역 검증 / pdfjs 로드 실패 폴백 e2e | ~~FR-017i~~ / FR-017j |
| P3 | Triduum (성삼일) 특별 전례(수난예식·부활성야) 처리 — 성주간 평일 기도문(성목·성금·성토 lauds/vespers)은 `lent.json weeks.6`에 구현 | - |
| P3 | 주간/월간 기도 달력 뷰 | - |

---

## 12. 루브릭(빨간색 텍스트) 및 교송 라벨링

### 12.1 기능 요구사항

| ID | 요구사항 | 모듈 | 우선순위 | 상태 |
|----|----------|------|----------|------|
| FR-125 | **교송 라벨 구분**: PDF 원문에 따라 시편(psalm) 교송에는 "Шад дуулал:", 찬가(canticle) 교송에는 "Шад магтаал:" 접두사를 표시한다. `AntiphonBox` 컴포넌트가 `label` prop('psalm' \| 'canticle')을 받아 구분 렌더링한다. | UI | P1 | 완료 |
| FR-126 | **Dismissal 루브릭 빨간색 표시**: 전례 지시문("Санваартан эсвэл тахилч удирдаж байгаа бол:", "Хувийн уншлагын үед:")을 PDF 원문과 동일하게 빨간색으로 렌더링한다. | UI | P1 | 완료 |
| FR-127 | **초대송 루브릭 렌더링**: `invitatory.json`의 `rubric` 필드(대체 시편 선택 안내)를 초대송 섹션 상단에 빨간색 이탤릭으로 표시한다. | UI | P1 | 완료 |
| FR-128 | **Gloria Patri 생략 루브릭**: `gloriaPatri: false`인 찬가(주일 아침기도 주1·3의 Benedicite, `Daniel 3:57-88, 56`)에서 "Эцэг, Хүү, Ариун Сүнсэнд жавхланг... уншихгүй" 빨간색 루브릭 텍스트를 표시한다. 그 외 모든 시편·찬가는 영광송을 낭송한다(GILH §123, 본문이 이미 삼위일체 송영으로 끝나는 Benedicite만 예외). | UI | P1 | 완료 |
| FR-129 | **조건부 Alleluia 분리**: sanctoral 고유문에서 `(Аллэлуяа!)` 조건부 루브릭을 교송 텍스트에서 분리하고 `alleluiaConditional: true` 필드로 표현한다. | 데이터 | P1 | 완료 |
| FR-150 | **중보기도 역할 구조화 (Гуйлтын залбирал)**: 중보기도 섹션을 파싱하여 도입부와 화답 후렴(amber 박스 + italic)을 분리하고, 각 청원의 부제 몫(versicle)과 회중 응답을 다른 줄로 나눠 렌더링한다. 응답 줄 앞에는 PDF 원문과 동일하게 빨간색 `- ` 접두사를 붙이며 별도의 `R.`/`Д.` 역할 라벨은 사용하지 않는다. 구분자 `" - "`(시편집) 및 `" — "`(계절/성인 고유문) 모두 인식하며, `"Тэнгэр дэх Эцэг минь ээ..."` 마침 힌트는 italic 문단으로 분리한다. 빨간색 dash는 §12.1 루브릭 규칙(`text-red-700 dark:text-red-400`)을 따른다. 파싱 실패 시 기존 flat 리스트 폴백. | UI / 데이터 | P1 | 완료 |
| FR-152 | **응송 6행 구조 (Хариу залбирал)**: 독서 뒤 응송을 PDF 원문과 동일한 6행 구조로 렌더링한다. `Responsory` 데이터는 `{fullResponse, versicle, shortResponse}` 3필드로 저장되며 UI 는 ① 전체 응답(리더) → ② `- ` 전체 응답(회중) → ③ 전구(versicle, 리더) → ④ `- ` 짧은 응답(shortResponse, 회중) → ⑤ 영광송 한 줄(`Эцэг, Хүү, Ариун Сүнсийг магтан дуулъя.`) → ⑥ `- ` 전체 응답(회중 반복) 의 6개 문단으로 출력한다. 응답 줄의 빨간 `- ` 접두는 §12.1 루브릭 규칙을 따르며 별도 `R.`/`Д.` 라벨 없음. 성삼일(Holy Thursday/Friday/Saturday) 간소화 형식은 `fullResponse`/`shortResponse` 가 비어 있고 `_note: "Intentionally empty response..."` 가 붙어 있으면 `versicle` 한 줄만 antiphon 으로 렌더한다(GILH 근거). 섹션 루트에 `data-role="responsory"` 마커. | UI / 데이터 | P1 | 완료 |
| FR-153 | **PDF 원형 재현 — Rich Prayer Content AST (pilot)**: 기도문 텍스트를 `string` 평문 대신 `PrayerText` 트리(`{ blocks: PrayerBlock[] }`) 로 표현해 PDF 의 루브릭 빨간색·italic·V./R. 마커·indent 를 보존한다. 스키마는 `src/lib/types.ts` 의 `PrayerSpan`/`PrayerBlock`/`PrayerSourceRef`/`PrayerText`. 추출은 2-layer 파이프라인 — 본문은 `pdftotext -layout` + `scripts/parsers/pdftotext-column-splitter.mjs` (휴리스틱 최소, 고정 whitespace gutter 로 2-up 칼럼 분리), 스타일은 `scripts/parsers/pdfjs-style-overlay.mjs` (pdfjs-dist `opList` walker 로 `#ff0000` rubric 색·fontName 분류) — 정합은 `scripts/build-rich-pilot.mjs` 가 담당. Rich overlay JSON 은 `src/data/loth/prayers/seasonal/{season-kebab}/w{weekKey}-{DAY}-{hour}.rich.json` 경로. `src/lib/prayers/rich-overlay.ts` 가 로드, `src/lib/prayers/resolver.ts` 가 `sanctoral > seasonal > common` 우선순위로 resolve, `loth-service.ts` 의 Layer 4 merge 가 `mergedPropers` 의 `*Rich` 필드에 싣고, assembler(`lauds/vespers/compline.ts`) 가 `HourSection.*Rich` 로 전달, 섹션 컴포넌트가 rich 있으면 `<RichContent>` 로 아니면 기존 경로 fallback (dual-field 병행). Pilot 범위: Ordinary Time Week 1 SUN Lauds 의 `concludingPrayer`. 수용 기준: (a) 원본 `ordinary-time.json` concludingPrayer 문자열과 공백 정규화 기준 byte-equal, (b) 섹션 헤더 중복 없음, (c) 본문이 한 단락으로 reflow. Stage 6 에서 나머지 기도문 영역·시편 본문·축일 propers 로 확산 예정. | 데이터 / UI / 파이프라인 | P1 | pilot 완료 |
| FR-153a | **concludingPrayer Rich 확산 (Stage 6)**: FR-153 파이프라인을 모든 계절 고유문(ADVENT/CHRISTMAS/LENT/EASTER/ORDINARY_TIME) 의 주일 `concludingPrayer` 로 확산. `scripts/build-concluding-prayers-rich.mjs` 가 `buildProsePrayer` (공용 rich builder) 를 반복 호출해 `src/data/loth/prayers/seasonal/{season-kebab}/w{weekKey}-{DAY}-{hour}.rich.json` 의 `concludingPrayerRich` 필드에 merge. 수용 게이트는 `normaliseForGate` 로 공백·커얼 따옴표·대시·NBSP 를 정규화한 byte-equal 비교. 확산 과정에서 드러난 5개 클래스의 파이프라인 결함을 영구 수정: (1) `pdftotext-column-splitter` 가 우측 전용 라인을 중간에서 이분하던 버그 (firstNonSpace 임계값으로 우측만 할당), (2) 페이지 경계 넘는 기도문 continuation — `maxExtraPages` + original 길이 기반 shortfall guard 로 단일 페이지 완결 케이스 보호, (3) 요일 전치사 (`Ням гарагийн...`) 로 시작하는 후속 섹션 헤딩 추가, (4) PDF 스캔 오탈자 per-page 치환맵 (`PDF_CORRECTIONS_BY_PAGE` — 763 `нүдинй→нүдний`, 795 `хайрлаж.→хайрлаж,`), (5) 게이트 전용 typographic 정규화 (curly↔straight quote). 결과: **135/135 주일×시간(lauds+vespers+compline) = 100% PASS**. 실패 리포트 `scripts/out/concluding-rich-failures.md` 는 `실패: 0` 을 유지. | 데이터 / 파이프라인 | P1 | 완료 |
| FR-153b | **intercessions Rich 확산 (Stage 6)**: FR-153 파이프라인을 모든 계절 고유문(ADVENT/CHRISTMAS/LENT/EASTER/ORDINARY_TIME) 의 주일 `intercessions` 로 확산. `scripts/build-intercessions-rich.mjs` 가 `buildIntercessions` (rich-builder 의 refrain/petition 전용 빌더) 를 반복 호출해 `src/data/loth/prayers/seasonal/{season-kebab}/w{weekKey}-{DAY}-{hour}.rich.json` 의 `intercessionsRich` 필드에 merge. 소스 배열 구조(`items[0]` = "intro ... залбирцгаая: refrain", `items[1..]` = "petition — response" 또는 simple petition) 를 1차 소스로 사용 — PDF 컬럼 분할 우회. AST 설계: 도입문 `para` (indent=0) + refrain `para` (indent=1) + divider + 각 petition 을 2-line `stanza` 로 (line 0=petition indent=0, line 1=response indent=1 with 루브릭 `-` span + 본문 text). em-dash 가 없는 simple petition (성 금요일 등) 은 `para` 단일 블록. 수용 게이트는 (whitespace + em-dash ↔ hyphen) 정규화 byte-equal. 결과: **56/56 주일 intercessions = 100% PASS**. 실패 리포트 `scripts/out/intercessions-rich-failures.md` 는 `실패: 0` 유지. 렌더는 기존 `IntercessionsSection` 의 `section.rich` 분기 (RichContent) 재사용. | 데이터 / 파이프라인 | P1 | 완료 |
| FR-153c | **alternativeConcludingPrayer Rich 확산 (Stage 6)**: FR-153 파이프라인을 모든 계절 고유문의 주일 `alternativeConcludingPrayer` 로 확산. `scripts/build-alt-concluding-prayers-rich.mjs` 가 FR-153a 의 `buildProsePrayer` 를 헤더(`/Сонголтот\s+залбирал/i`) 만 바꿔 재사용, `.rich.json` 에 `alternativeConcludingPrayerRich` 필드로 merge. END_OF_BLOCK 에는 concluding 에 없는 후속 섹션 표지(`Урих дуудлага`, `Шад дуулал`, `Талархал`, `Дараах төгсгөлийн`) 를 추가. PDF_CORRECTIONS_BY_PAGE 로 스캔 오탈자 5건 교정(755 `жавхланг→жавхлангийг`, 763 잉여 "тулд" 제거, 775 `бид.→бид `, 617 `явж.→явж,`, 620 `, Амин→, амин`). rich-builder 의 `applyCorrectionsToLines` 는 치환을 bodyLines 단계에 적용해 단락 경계에 걸친 케이스도 처리. 연관 JSON 데이터 수정 — (a) `easter.json` easterSunday lauds/vespers 의 `alternativeConcludingPrayerPage` 691→693 (실제 PDF 페이지), (b) `ordinary-time.json` w12/w15/w25 SUN/vespers 의 alt 기도문 말미에 누락된 doxology 추가, (c) `lent.json` w1 SUN vespers/sat vespers 의 `Амин`→`амин` 소문자 통일 (lauds 와 정합). 결과: **58/58 alt-concluding = 100% PASS**. | 데이터 / 파이프라인 | P1 | 완료 |
| FR-153d | **responsory Rich 확산 (Stage 6)**: FR-153 파이프라인을 모든 responsory 영역으로 3단계 split 확산. `scripts/parsers/rich-builder.mjs` 에 Layer E (`buildResponsoryBlocks` / `verifyResponsoryEquivalence` / `buildResponsory`) 추가 — 소스 `{fullResponse, versicle, shortResponse}` 3필드만으로 5 `para` 블록 AST 생성 (PDF 직접 접근 없음). 블록 순서: V1 `response` → V2 `versicle` → R2 `response` → V3 고정 Glory Be text (`Эцэг, Хүү, Ариун Сүнсийг магтан дуулъя.`) → R3 `response` (= V1 반복). R1 은 렌더러가 암묵 반복하므로 AST 에서 생략. 수용 게이트는 core 3-block (V1/V2/R2) flatten 과 원문 3필드 join 의 `normaliseForGate` 기준 byte-equal. (a) **T5a seasonal propers** — `scripts/build-responsories-rich.mjs` 가 `src/data/loth/propers/{advent,christmas,easter,lent}.json` 의 responsory 를 `prayers/seasonal/{season-kebab}/w{weekKey}-{DAY}-{hour}.rich.json` 의 `responsoryRich` 필드에 merge (source.kind='seasonal'). 50/50 PASS, 5 skip (LENT w6 Holy Week — 소스 `fullResponse`/`shortResponse` 빈 문자열 결함, 별건). (b) **T5b psalter commons** — 신규 중앙 카탈로그 `prayers/commons/psalter/w{N}-{DAY}-{hour}.rich.json` 생성. `scripts/build-psalter-responsories-rich.mjs` 가 `psalter/week-{1..4}.json` 의 56건 (4주 × 7일 × 2시과 SUN..SAT × lauds/vespers) 을 확산 (source.kind='common', id=`psalter-w{N}-{day}-{hour}-responsory`). 동시에 pilot 이관 — 기존 `prayers/seasonal/ordinary-time/w1-SUN-lauds.rich.json` 의 `responsoryRich` 필드 삭제로 source of truth 단일화 (카탈로그가 공식 소스). 56/56 PASS. (c) **T5c ordinarium compline** — `scripts/build-compline-responsory-rich.mjs` 가 `ordinarium/compline.json` 최상위 공통 responsory 1건을 `prayers/commons/compline/{DAY}.rich.json` 7 요일 파일에 동일 내용으로 배포 (source.kind='common', id='compline-responsory'). loader `loadComplineCommonsRichOverlay(day)` 의 요일 키 규약과 호환. 1/1 PASS × 7 배포. 카탈로그 로더 `loadPsalterCommonsRichOverlay`/`loadComplineCommonsRichOverlay` 는 `src/lib/prayers/rich-overlay.ts` 에 추가, resolver 는 seasonal > psalter commons > compline commons 우선순위로 fallback. 결과: **107/107 = 100% PASS** (seasonal 50 + psalter 56 + compline 1). 실패 리포트 `scripts/out/{responsories,psalter-responsories,compline-responsory}-rich-failures.md` 는 `실패: 0` 유지. | 데이터 / 파이프라인 | P1 | 완료 |
| FR-153e | **shortReading Rich 확산 (Stage 6)**: FR-153 파이프라인을 모든 shortReading 영역으로 확산. `scripts/parsers/rich-builder.mjs` 에 `buildShortReading` (Layer C 의 `buildProseBlocks` 위에 얇게 얹은 단일 단락 prose 빌더) 추가. PDF 의 `Уншлага` 섹션 헤딩 + ref 가 한 라인에 합쳐진 column-split 출력 형태(`Уншлага\t\t\t<ref>`) 에 대응해 헤더 정규식을 `/^[Уу]ншлага(?:[\s\t]|$)/u` 로 확장(case-insensitive — pdfjs 가 small-cap 글리프를 lowercase 로 펼침). END_OF_BLOCK 은 후속 섹션 헤더(`Хариу залбирал`, `Захариагийн/Мариагийн магтаал`, `Гуйлтын залбирал`, 요일 전치사) 외에 Holy Week 변형(`Хариу залбирлын оронд`) 추가. 게이트 정규화는 `normaliseForShortReadingGate` — `normaliseForGate` 위에 `\s*-\s*` → ` - ` 표준화로 inline em-dash dialog 인용(`— `↔`-`)을 동치 처리. 부수적으로 `isRunningHeaderLine` 정규식이 psalter continuation page 의 `74 1 дүгээр долоо хоног` (page+week 두 숫자) 패턴을 인식하도록 `^\d{1,4}(?:\s+\d+)?\s+[^\d]` 로 확장 — 이전에는 첫 번째 숫자만 처리하고 두 번째 숫자에서 매치 실패해 헤더가 본문에 섞여 들어갔다. 데이터 소스 3종을 한 스크립트(`scripts/build-short-readings-rich.mjs`) 가 통합 처리: (a) seasonal propers 5개 시즌 → `prayers/seasonal/{kebab}/w{weekKey}-{DAY}-{hour}.rich.json` 의 `shortReadingRich`, (b) psalter commons 4주 → 신규 `prayers/commons/psalter/w{N}-{DAY}-{hour}.rich.json` (FR-153d 의 카탈로그 경로와 공유), (c) compline commons 7요일 → `prayers/commons/compline/{DAY}.rich.json`. PDF_CORRECTIONS_BY_PAGE: 553/586 의 명백한 punctuation-glued-letter 렌더 결함 (`байна.Юунд` / `Ааба,Аав`) 2건 교정. 결과: **126/126 = 100% PASS**. pilot (`f05456b` / `baa1f02` / `29c399e`) 시점 106/126 (84.1%) 상태에서 20 failures 를 4 commit 으로 분산 해소: (a) `0a0b15c` canon typo 5건, (b) `5c1eabe` true page drift 6건, (c) `29ce2da` (task #33) `buildShortReading` pass-2 threshold 완화로 p556 tail 포섭, (d) `4a533e3` (task #35) regex 완화 `[Уу]ншлаг[аА]?` + pdfjs fallback 으로 p251/p371/p437 heading extraction fix. 남은 분산 entry 는 위 commit 의 부수적 영향으로 흡수됨 (task #37 audit 에서 확인). 실패 리포트 `scripts/out/short-reading-rich-failures.md`. 부수 인프라 — 이 작업 진행 중 발견: FR-153d 가 문서상 `loadPsalterCommonsRichOverlay`/`loadComplineCommonsRichOverlay` 추가를 표기했지만 실제 코드는 미구현이었음. 본 PR 에서 두 로더 + resolver 의 `psalterWeek` 컨텍스트 전달 + `loth-service.ts` Layer 4 wiring 까지 완료 — FR-153d 의 responsory 카탈로그도 같은 경로로 런타임에서 비로소 적재된다. | 데이터 / 파이프라인 / 인프라 | P1 | 완료 (100%, task #37 audit 2026-04-24) |
| FR-153f | **psalter stanzasRich 확산 (Stage 6)**: FR-153 파이프라인을 시편 본문(stanza 구조) 으로 확산. `scripts/parsers/rich-builder.mjs` 에 Layer F (`buildPsalterStanzasRich` / `buildStanzasFromSource` / `detectRefrainLines` / `verifyStanzasTextEquivalence` / `verifyStanzasStructuralEquivalence` / `bucketStanzaIndent`) 추가 — **소스 JSON only** 빌더 (PDF 재추출 없음). 설계 근거: 2025 PDF p58/60/64 실측 결과 시편 본문 내부 italic 0% · rubric 본문 hit ≈ 0% (rubric-all 16.83% 는 전부 running header/ref heading/subtitle 등 metadata, 본문 밖). 3-layer pipeline (3A) 로 충분하고 3C 업그레이드 이득 없음. 재추출 기반 세분화(pilot 규격)는 FR-153g 별건. **indent 3-level 버킷**: `0sp → 0 | 1-3sp → 1 | ≥4sp → 2`. PrayerBlock `stanza` 라인에 `role?: 'refrain' \| 'doxology'` 추가 — refrain auto-detect 는 ref 내 trimmed-line (말미 구두점·대시 제거) 이 ≥3 회 반복되면 `role='refrain'` tagging (Daniel 3 의 "Эзэнийг магтагтун" / "бүгдийн дээр үүрд мөнх өргөмжлөгтүн" 등). **수용 게이트 2단계**: (a) 텍스트 byte-equal — `normaliseForGate(source joined)` == rich flatten, (b) 구조 동등성 — stanza 수 + per-stanza line 수 + refrain 라인 수 일치. 두 게이트 모두 PASS 해야 카탈로그 기록 (**fail-fast** — 단 1건 실패 시 카탈로그 미생성, `psalter-rich-failures.md` 만 emit). 빌더 스크립트 `scripts/build-psalter-texts-rich.mjs` 가 `src/data/loth/psalter-texts.json` 137 refs 를 처리해 중앙 카탈로그 `src/data/loth/prayers/commons/psalter-texts.rich.json` 생성 (ref → `{ stanzasRich: PrayerText }` 1:1 맵). 로더 `loadPsalterTextRich(ref)` 는 `src/lib/prayers/rich-overlay.ts` 에 append (카탈로그 파일을 mtime-cache 로 단일 로드, ref 조회 O(1) — `cache-probe.test.ts` 가 10 call/1 read 계약 검증). Resolver `resolvePsalm` (`src/lib/hours/resolvers/psalm.ts`) 이 `AssembledPsalm.stanzasRich` 에 실어 전파, `PsalmBlock` (`src/components/psalm-block.tsx`) 이 rich 있으면 rich 분기 (dual-field fallback 유지). 렌더: 각 stanza `<p data-role="psalm-stanza">`, 각 라인 `<span>` indent → `pl-0/pl-6/pl-12`, refrain 라인 → `data-role="psalm-stanza-refrain"` + `text-red-700 dark:text-red-400` (§12.1 루브릭). 분포 리포트 `scripts/out/psalter-rich-report.md` 에 stanza 수 히스토그램 (min=1, median=2, max=15) + refrain 보유 refs 15건 요약 + FR-153g 재추출 우선순위 힌트 (coarse refs stanza≤2 line≥20 / non-Psalm canticles) 기록. pilot 재추출본 (`psalter-texts.pilot.rich.json` 3 refs) 은 FR-153g 입력용으로 별도 보관, 카탈로그 비포함. 스크린샷 baseline `.playwright-mcp/fr153f-case{1,2,3}-*.png` (Ps 63 serial 2 stanzas / Dan 3:57-88 refrain 15 stanzas 44 refrain lines all red / Ps 149 simple 1 stanza 22 lines flat). 결과: **137/137 refs = 100% PASS**. | 데이터 / UI / 파이프라인 | P1 | 완료 |
| FR-153g | **coarse refs pilot 규격 재추출 (Stage 6 follow-up)**: FR-153f 의 main `psalter-texts.json` 기반 137 refs 가 PDF 원형 대비 stanza 분할이 coarse (예: Ps 63:2-9 main 2 stanzas vs pilot 8 stanzas, Dan 3:57-88 main 15 vs pilot 19). FR-153g 는 `psalter-texts.pilot.rich.json` (3 refs pilot 규격) 을 입력 규격으로 삼아 `extract-psalm-texts.js` 의 stanza 경계 휴리스틱을 재보정하고, `psalter-rich-report.md` 의 **재추출 우선순위 힌트** (coarse refs stanza≤2 line≥20, non-Psalm canticles) 순으로 재추출. Stage -1 교훈 존중 — `mergeColumnWraps` / `mergeAcrossStanzaBoundaries` 휴리스틱 변경은 Ps 117/135/139 오염 재발 여지. 재추출 전후 `stanza count delta` / `line count delta` 리포트 필수. 수용 기준: 재추출 후 Layer F 가 FR-153f 와 동일하게 137/137 PASS 유지 + pilot 3건과 재추출본 간 structural diff ≤ 5%. | 데이터 / 파이프라인 | P2 | 계획 |
| FR-153h | **psalmPrayer Rich 확산 (Stage 6 follow-up)**: `psalter-texts.json` entry 의 `psalmPrayer: string` 필드 (실측 90개 eligible refs, 중복 prayer 포함 총 137 entry 중 psalmPrayer + psalmPrayerPage 보유) 를 `psalmPrayerRich: PrayerText` dual-field 로 확산. `buildProsePrayer` (FR-153a 의 Layer C 기반) 재사용 — 헤더 `/Дууллыг төгсгөх залбирал/u`, END_OF_BLOCK 은 `уншлага` (lowercase 본문 시작), `Шад дуулал`, `Магтаал`, 시즌 분기 헤더 (`... улир[а-яёөү]*` — Ирэлтийн/Амилалтын/Дөчин хоногийн 굴절 포용), `Антифон`/`Дуулал \\d+` 등 union. `psalmPrayerPage` 는 FR-017h 에서 이미 제공되어 PDF 재추출 가능. 카탈로그 경로는 `prayers/commons/psalter-texts.rich.json` 에 entry 당 `psalmPrayerRich` 필드 추가 (stanzasRich 옆). 렌더는 `PsalmBlock` 의 기존 `psalm-prayer` 분기에 `RichContent` 렌더 우선, `psalmPrayerRich` 미존재 시 legacy plain text fallback. 수용 게이트는 FR-153a/c 의 `normaliseForGate` byte-equal. **task #38 (2026-04-24, 100% 완주)**: pilot 시점 68/90 (75.6%) 에서 잔여 22건 전부 복구. 실측 원인 — END_OF_BLOCK union 에 `уншлага` (소문자, pdfjs small-cap 렌더) 만 포함되어 있어 pdftotext 의 **대문자** `Уншлага\t<scripture-ref>` 헤딩이 body terminator 로 미탐지, pdftotext body 가 다음 shortReading 섹션까지 over-extend 해 pdfjs stylePageBody 와 1:1 alignment 가정(`pdftotext body has more non-blank lines` 예외) 위반. 수정 (A+B 혼합): (A) END_OF_BLOCK 에 `/^[Уу]ншлаг[аА]?(?:[\\s\\t]|$)/u` 추가 — task #33/#35 shortReading HEADING 에서 검증된 relaxed 패턴으로 대소문자 + trailing `а` 선택적 허용 + `(?:[\\s\\t]|$)` boundary 로 inflected false match 배제, (B) pdftotext 컬럼 분할 artifact (p251 `лага`, p371 `шлага` — 앞부분 문자 유실) 대응 `/^(?:шлага|лага)\\t/u` 추가 — 뒤 tab 경계 요구로 일반 Mongolian 단어와 충돌 방지. regression guard: 기존 68 baseline vs 90 current entries JSON stringify 비교 — added=22 / removed=0 / changed=0 (기존 68 entry 100% byte-wise 보존). 결과: **90/90 eligible refs = 100% PASS**, failures.md 실패 0 유지. 나머지 47 refs 는 skipped (psalmPrayer 또는 psalmPrayerPage 부재 — scope 밖). | 데이터 / 파이프라인 | P1 | 완료 (100%, task #38 2026-04-24) |
| FR-155 | **부활 시기 seasonal antiphon 표시 복원 (GILH §113/§272)**: 부활 시기 동안 시편·복음 교송(Benedictus/Magnificat) antiphon 에 "Аллэлуяа" 종결이 필수. 4주 psalter 의 default 후렴은 Ordinary Time 기준으로 저작되어 있어 그대로 렌더하면 부활 시기에도 OT 형태로 노출됨. **Phase 0 (task #12, 완료, commit 52ffd37→main 92f234c)**: `src/lib/hours/seasonal-antiphon.ts` 의 `applySeasonalAntiphon(antiphon, season)` 헬퍼로 EASTER 시 append-Alleluia 보정 (idempotent + 빈값 보호 + 시즌 게이트). `resolvePsalm` + `loth-service` Layer 5 gospelCanticleAntiphon 보강 경로. **Phase 1 (task #13, 완료)**: divine-tester 의 Phase 2 사전 실측(2026-04-23, PDF 마커 284건) 에 맞춰 `PsalmEntry.seasonal_antiphons?: { easter?, advent?, adventDec17_23?, adventDec24?, easterSunday?: Record<number,string>, lentSunday?: Record<number,string> }` 스키마 (`types.ts` + `schemas.ts`) 로 확정 — Christmas / weekday-LENT 시즌 전역 마커는 PDF 에 0건이라 필드 부재. resolver 체인은 `override > per-Sunday override (SUN + weekOfSeason 매치) > date-specific (12/17-23, 12/24) > season general (EASTER / ADVENT 주중) > default_antiphon`, PDF variant 가 사용되면 `applySeasonalAntiphon` append-Alleluia 는 SKIP. unit `seasonal-antiphon.test.ts` 18 (applySeasonalAntiphon 8 + pickSeasonalVariant 10 — 6 variant 각각 + 우선순위 + empty fallback) + resolver `resolvers/__tests__/psalm.test.ts` 8 (default fallback / easter verbatim / per-Sunday 우선 / override 최상위 / adventDec17_23 window / adventDec24 / lentSunday + weekday fallthrough / ORDINARY_TIME 무시). **Phase 2 (task #14, 완료, commit aaf96a2)**: `extract-psalter-seasonal-antiphons.js` + `inject-psalter-seasonal-antiphons.js` + `verify-psalter-seasonal-antiphons.js` 파이프라인으로 PDF 엔트리 variant 를 `week-*.json` 에 주입 (316 variant / 168 entries, mismatch=0 PASS). 2종 rubric 마커 (`тарчлалтын Ням гараг:` / `Эсвэл, амилалтын цаг улирлын үед:`) 은 Phase 3 스키마 확장 대상으로 SKIP. **Phase 3 (task #15, 완료)**: 스키마 2 필드 (`lentPassionSunday?: string` — Lent 5th Sunday 특화 후렴, `easterAlt?: string` — Easter 시즌 대체 후렴 fallback semantic) 추가. resolver 체인 확장: Passion Sunday 판정 `season==LENT && dayOfWeek==SUN && weekOfSeason==5` 시 `lentPassionSunday` 가 `lentSunday[5]` 보다 우선; `easter` 부재/공백 시 `easterAlt` 로 폴백. extractor SKIP_MARKERS 에서 `тарчлалтын Ням гараг:` 승격 (wrapped compound form 은 SKIP 유지) + easterAlt 마커 추가. **실측 커버리지**: PDF 마커 6건 중 **2건 psalter 주입** — (a) Passion Sunday 3건 중 2건 (`w2-sun-vesp-ps1`/`ps2`) 주입, 3번째 (`w2-sun-vesp-cant` 해당 PDF 라인 6411) 는 canticle body 헤딩 뒤에 위치해 variant 워커가 terminator 도달 후 미수집 (별건 워커 재설계), (b) Easter alt 3건 모두 `sanctoral/memorials.json` 의 deceased 전례 `gospelCanticleAntiphon` 필드에 해당 — psalter schema scope 밖 (별도 파이프라인 필요). 스키마+resolver+테스트는 완성 상태로 후속 데이터 확장 대비. unit `seasonal-antiphon.test.ts` +2 (Passion Sunday 우선 + easterAlt 폴백) / resolver `psalm.test.ts` +2 (동일 시나리오 통합). `verify-psalter-seasonal-antiphons.js` mismatch=0 PASS 유지 (318 variant, +2). **Phase 3b (task #16, 완료)**: extractor 워커 재설계로 body-boundary 너머 rubric 수집 + 기존 `\b` 정규식 버그 fix (Cyrillic 에서 JS `\b` 미작동). (a) `TERMINATORS` 를 `HARD_TERMINATORS` (다음 Шад 앵커 / Дууллы[нг] 기도문 헤딩) 와 `BODY_ENTRY_MARKERS` (`Дуулал N` / `Магтаал` / `^(I\|II\|III\|IV\|V)$` 로마 숫자 part marker) 로 분리. 워커에 `inBody` 상태 도입 — body 진입 후 다음 MARKER 나올 때까지 텍스트 skip, post-body rubric 을 자동 재수집. (b) Cyrillic `\b` 이슈 보정 — `/^Шад\s+(дуулал\|магтаал)\b/` 이 "Шад дуулал 2 Тэнгэрбурхан..." (ASCII 단어 경계 없음) 에서 silently 미매치로 walker over-run 유발. `(?:\s\|$)` 명시적 경계로 교체. `Дууллыг` / `Дууллын` 두 케이스 폼도 커버. (c) joiner 확장: Week 2 "Ням гараг Дөчин хоногийн цаг улирал, Эзэний → тарчлалтын Ням гараг:" 래핑을 `Эзэний\s*$` + `^тарчлалтын\s+Ням\s+гараг:` 쌍으로 감지해 조인. 대응 compound form 을 SKIP_MARKERS 에서 MARKER (lentPassionSunday) 로 승격. **결과**: 총 324 variant (`+6` vs Phase 3 기준 318) — +1 lentPassionSunday (w2-sun-vesp-cant 완성, 3/3), +5 lentSunday (w1..w4 SUN VESP 캔티클의 post-body Lent 후렴 신규 수집). 부수 데이터 정정 **+18 entry 값 갱신** (CHANGED) — 모두 기존 `\b` 버그로 ps2 엔트리들이 뒷 엔트리 (cant 의) variant 를 잘못 흡수하던 cross-entry pollution 교정 (w*-*-vesp-ps2.easter/adventDec17_23 계열). `npx vitest run` 240 PASS (+3 new regression guard) / `npx tsc --noEmit` 0 errors / `verify-psalter-seasonal-antiphons.js` mismatch=0 PASS. **Phase 3c (task #18, 완료)**: 마지막 Passion Sunday 래핑 폼 `Дөчин хоногийн цаг улирал, Эзэний тарчлалтын Ням гараг:` (Week 1 compound) 을 SKIP_MARKERS → lentPassionSunday MARKER 로 승격 (Phase 3b joiner 기반 래핑 처리와 동일 필드). **실측**: PDF 6 occurrence 중 **3건 psalter 주입** (w2-sun-lauds-ps1/cant/ps3, PDF lines 5851/5978/6047) — 나머지 3건 (PDF line 5554/5618/5693) 은 "1 дүгээр Оройн даатгал залбирал" (First Vespers of Sunday) 프로퍼-style 섹션의 앵커에 있고 해당 default_antiphon 이 psalter/week-*.json 에 부재 (scope 밖, proper 영역으로 별도 추후 대응). 총 **327 variant** (+3 vs 324). 3 label 폼 (bare + Week 1 compound + Week 2 compound) 모두 동일 필드로 landing 하므로 스키마/resolver 변경 없음. data regression 4 PASS (+1 Week 1 compound 주입 확인). | 데이터 / 파이프라인 | P1 | Phase 0/1/2/3/3b/3c 완료 |
| FR-160 | **Refrain 정합화 — denylist (FP 차단) + allowlist (FN 보강)**: `detectRefrainLines` (rich-builder.mjs Layer F) 의 threshold-based auto-detection (≥3 회 반복 line → `role='refrain'`) 양방향 정합화. (1) FP 차단 (denylist) — 검정 본문 (verse-ending 반복 구절, anaphoric verse-opening 등) 이 rubric refrain 으로 잘못 태그되는 케이스 차단. (2) FN 보강 (allowlist) — threshold=3 미달이라 자동 감지 못한 2-rep authentic refrain (antiphonal Q&A, self-address, peoples-praise, inclusio 등) 의 forced 마킹. **데이터**: `src/data/loth/refrain-denylist.json` (`{entries: [{ref, reason, evidence_pdf, classified_at}]}`) + `src/data/loth/refrain-allowlist.json` (`{entries: [{ref, forced_lines, evidence_pdf, liturgical_basis, classified_at}]}`). **코드**: `detectRefrainLines(stanzas, {ref, denylist, allowlist})` + `buildPsalterStanzasRich({stanzas, ref, denylist, allowlist})` — denylist 우선 게이트 (빈 Set 반환), 그 다음 threshold 카운트, 마지막에 allowlist forced_lines union (refrainKey 정규화 거쳐 add). denylist ∩ allowlist 시 denylist 승리 (defensive guard). `scripts/build-psalter-texts-rich.mjs` 가 두 JSON 을 빌드 시 1회 로드 (fail-hard on parse/schema 오류, .trim() ingest, missing-file fallback) 후 per-ref 호출에 주입. **A1 (task #103, 완료)**: 2026-04-26 사용자 보고 fast-track. **denylist 2 entries** — (a) Psalm 150:1-6 verse-ending 6-rep (p449-450), (b) Psalm 29:1-10 anaphoric verse-opening 'ЭЗЭНий дуу хоолой' 3-rep (p.81, A2 gold dataset 입력 boost). **A2 (task #104, 회신 완료)**: 137 refs 전수 audit gold dataset → A1/A4 입력 보강. **A4 (task #120, 완료)**: refrain false-negative **6 entries 보강** — (a) **Psalm 24:1-10** vv 7-10 antiphonal entrance Q&A 3 forced lines (p.93), (b) **Psalm 116:10-19** vv 14+18 paying-vows 1 (p.290), (c) **Psalm 8:1-10** v1+v9 inclusio 3 (p.284), (d) **Psalm 42:2-6** vv 5+11 self-address 2 (p.197), (e) **Psalm 67:2-8** vv 3+5 peoples-praise 2 (p.240), (f) **Psalm 99:1-9** vv 3+5+9 holy-refrain 2 (p.364, lexical variant accepted). 각 entry PDF 실측 + GILH/공식 전례 근거 양면 evidence (`liturgical_basis` 필드 mandatory). 결과: 진정 refrain 라인 수 (Daniel 3:52-57=19, Daniel 3:57-88, 56=44, Revelation 19:1-7=12, Psalm 136:1-9=9) 보존, denylist 2 refs 검정 본문 0 mistag, allowlist 6 refs 명시 마킹 (총 21 forced refrain lines added in catalog). **D (task #126, 완료)**: psalter-texts.json key 유일성 정합화. 139 keys 중 10 duplicate-content groups (14 redundant) — 동일 stanzas + psalmPrayer + psalmPrayerPage 를 공유하는 verse-range 변종 키. canonical 정책 (peer R1 revision): (1) externalRefs (de-facto 안정성) (2) widest verse range (3) page 보유 (4) numeric verse-order tie-break. 결과 canonical: Psalm 118:1-16 / 132:1-10 / 145:1-13 / 16:1-6 / 19:2-7 / 45:2-10 / 49:1-13 / 72:1-11 / **Psalm 8:2-10** (was 8:1-10) / **Psalm 88:2-10** (was 88:11-19). `scripts/audit-psalter-key-dedup.js` (read-only audit) + `scripts/dedup-psalter-keys.js [--dry-run] [--amend-allowlist] [--check]` (rewrite tool, --check 가 NFR-009g CI gate). 14 redundant 키 → 14 canonical 로 6 외부 refs (psalter/week-{2,3,4}.json) + 14 .rich.json + 1 refrain-allowlist.json (Psalm 8:1-10 → 8:2-10 atomic A4 amendment, 회귀 창 방지) redirect. 카탈로그 139→125 unique. NFR-009g 신설. **BLOCKED A4 1**: Psalm 8:2-10 — D 의 canonical 결정 + atomic allowlist amend 로 unblocked. **NEEDS_USER 2**: Tobit 13:1-8, Isaiah 38:10-14, 17-20 (사용자 결정 후 amendment, 본 PR 외). **C (task #131, 완료)**: psalm-header preface metadata 카탈로그화. PDF 시편 머리 빨간글씨 — patristic Father preface (Хэсихиус/Августин/Касиодор/Арнобиус/Кацен/Ориген) 또는 NT typological citation (Үйлс/Матай/Иохан/Лук/Марк/Ром/Еврей/Ефес/Галат/Илчлэл/Филиппой). 신규 카탈로그 `src/data/loth/prayers/commons/psalter-headers.rich.json` schema `{refs: {<canonical-key>: {entries: [{kind, attribution, preface_text, page, source, evidence_line_range}]}}, unmatched: {...}}`. `PsalterHeaderRich` type + `loadPsalterHeaderRich(ref)` loader (mtime cache). `AssembledPsalm.headerRich` 신규 field, `resolvePsalm` 양 path 에서 propagate. UI `PsalmBlock` 에 시편 제목 아래 italic 빨간글씨 (`data-role="psalm-header-rich"` + `data-kind={patristic_preface|nt_typological}`). 인프라 — `scripts/extract-psalter-headers.js` (raw-text 패턴 매칭, "Дуулал N" 후 15-line lookahead 안의 patristic/NT 인용 검출) + `scripts/build-psalter-headers-catalog.js` (canonical key 매칭 + unmatched 분리). **결과: 62 entries 52 canonical keys** (12 patristic + 50 NT) + 4 unmatched (Psalm 95/4/91/134 — invitatory/compline 으로 분리되어 psalter-cycle 외부, 후속 dispatch). dispatch target 80 entries 대비 18 entry 차이 — `Магтаал` (canticle) 머리 + lookahead 외 patterns 미커버, 잔여 entries 는 divine-researcher 보조 audit dispatch 권장. 단위 6 (catalog schema + lookup contract) + e2e 4 (Psalm 150 patristic Хэсихиус + 빨간글씨 + Psalm 67 NT Үйлс + Daniel 3 negative regression). NFR-009h 신설. **A3 (별건)**: FN audit 확장 (Psalm 116:10-19 외 15 unaudited candidates). parser regex 무수정 — 데이터 측 denylist + allowlist 양방향 정합화 + 키 유일성 + header preface 카탈로그 (NFR-009e + NFR-009f + NFR-009g + NFR-009h 게이트). | 데이터 / 파이프라인 / UI | P1 | A1 완료 + A2 회신 완료 + A4 완료 (denylist 2 + allowlist 6) + D 완료 (key dedup 14 redundant→canonical, NFR-009g 신설) + C 완료 (header preface 62 entries 52 keys, NFR-009h 신설), NEEDS_USER 2 (Tobit/Isaiah) + A3 + C-잔여 (~18 entries divine-researcher) 별건 |
| FR-160-B | **Inline conditional + page-redirect 데이터 모델 (PR-1: schema + Layer 4.5 hydrate)**: PDF 원전 ~150–170 cells 의 (1) 조건부 지시문 (~80–100, "X 의 자리에 Y 를 읽는다" / "송영을 생략한다") 과 (2) 페이지 리다이렉트 (~70, "Магтуу: х. 879") 를 일반 표현하는 데이터 모델 신설. plan: `docs/fr-160-phase-b-conditional-redirect-plan.md` (peer R4 AGREE, 502 lines). **PR-1 (task #139, 완료) — B1+B2 통합 PR**: schema + types + Layer 4.5 hydrate. `src/lib/types.ts` 에 5 신규 type — `ConditionalRubric` (rubricId/when/action/target/appliesTo/evidencePdf/liturgicalBasis) + `ConditionalRubricAction` enum (skip/substitute/prepend/append) + `ConditionalRubricSection` enum 10종 + `ConditionalRubricWhen` (season/dayOfWeek/dateRange MM-DD/predicate) + `PageRedirect` (redirectId/ordinariumKey/page/label/appliesAt/evidencePdf) + `PageRedirectOrdinariumKey` 닫힌 enum 9종 (benedictus/magnificat/nunc-dimittis/dismissal-blessing/compline-responsory/common-prayers/gloria-patri/invitatory-psalms/hymns). `HourPropers` 에 optional `conditionalRubrics?: ConditionalRubric[]` + `pageRedirects?: PageRedirect[]` 필드 추가 (additive, 기존 데이터 미터치). `src/lib/schemas.ts` 에 Zod runtime — `ConditionalRubricSchema` (action='skip' 외 target 강제 refinement) + `PageRedirectSchema` (page 1..969 + closed-enum ordinariumKey) + `OrdinariumKeyCatalogSchema`. 신규 catalog `src/data/loth/ordinarium-key-catalog.json` (9 keys → 표준 PDF 페이지/sourcePath). Layer 4.5 hydrate 모듈 — `src/lib/hours/conditional-rubric-resolver.ts::applyConditionalRubrics(propers, ctx)` (`matchesWhen` 평면 매처 + skip/substitute/prepend/append 4 action 적용; immutable shallow-copy 계약) + `src/lib/hours/page-redirect-resolver.ts::applyPageRedirects(propers, catalog)` (catalog 부재 ordinariumKey fail-hard, mtime cache loader). `src/lib/loth-service.ts` Layer 4 직후 hydrate 호출 추가 — pageRedirects 가 빈 배열이거나 부재 시 catalog 로드도 skip (zero-cost noop). 신규 verifier — `scripts/verify-conditional-rubrics.js` + `scripts/verify-page-redirects.js` 가 5 시즌 propers + 4 sanctoral JSON 의 신 필드를 zod parse + 카탈로그 무결성 검증 (CI gate 후보, NFR-009i 신설 예상). 단위 — schemas.test.ts 에 11 신규 case (positive/negative/closed-enum/refinement) + conditional-rubric-resolver.test.ts 12 case (when 매처 + 4 action 적용 + immutable + noop) + page-redirect-resolver.test.ts 8 case (catalog load + cache + fail-hard + PR-1 byte-equal). vitest 332 → **400 PASS**, tsc 0, sw.js 무수정 (AC-9 PASS), 4 기존 verifier (psalter/hymn/compline/propers/psalter-body/sanctoral) 회귀 0. **PR-2~7 (B3, member-01)**: 시즌별 rewrite tool + 1차 마킹 (advent/christmas/lent/easter/ordinary-time/sanctoral). **PR-8 (B4, solver)**: assembleHour 분기 + applyConditionalRubrics 의 psalmody/intercessions section action 확장 (PR-1 은 concludingPrayer/hymn/shortReading scope). **PR-9 (B5, divine-tester)**: e2e 4 spec + dispatch matrix vitest. | 데이터 / 파이프라인 / UI | P1 | PR-1 완료 (B1+B2 schema + Layer 4.5 hydrate), PR-2~9 별건 dispatch 대기 |
| FR-156 | **First Vespers of Sunday 전용 propers 지원**: 현재 앱의 Saturday vespers 는 `loth-service.ts` 의 날짜 fallback 으로 다음 Sunday 의 regular vespers propers 를 재사용한다 (line 94-99). 그러나 PDF 에는 각 Sunday 마다 별도 "1 дүгээр Оройн даатгал залбирал" (First Vespers of Sunday) 섹션이 존재 — 고유한 psalm 배열 + 4-5종 seasonal variant (default / advent / lentSunday[N] / lentPassionSunday / easterSunday[N]) 를 가진다. 예: Week 2 Sunday 1st Vespers (PDF p166-167) Psalm 119:105-112 + 두 시편. **현재 한계**: FR-155 변형 게이트는 psalter 의 default_antiphon 과 PDF 앵커 prefix 매치를 전제로 작동하는데, First Vespers 의 default_antiphon 은 psalter 계통과 다름 → task #18 에서 3건 (w2 first vespers Passion Sunday marker, PDF line 5554/5618/5693) 이 orphan 으로 drop 됨. 해결 방향: 스키마에 `FirstVespersPropers` 타입 + `propers/{season}.json` 의 각 Sunday 에 `firstVespers` 섹션 + `loth-service.ts` 가 Saturday vespers 에서 Sunday regular 가 아닌 First Vespers propers 를 우선 채택하도록 분기. 구현 시 Phase 분할 권장: 스키마+resolver / 데이터 추출 / 렌더 / 테스트. 범위 MEDIUM~HIGH (~4일 추정). 상세 스코프는 `docs/fr-156-first-vespers-scope.md`. **Phase 1 (task #19, 완료)**: 스키마 + resolver wiring. `src/lib/types.ts` 에 `FirstVespersPropers` (HourPropers extends + optional own `psalms?: PsalmEntry[]`) + `DayPropers.firstVespers?` 추가. `src/lib/propers-loader.ts` 에 `getSeasonFirstVespers(season, sundayWeekOfSeason, dateStr?, celebrationName?)` 추가 — date-key / Easter-special key / 주간 key 3층 lookup (기존 `getSeasonHourPropers` 와 동일 패턴). `src/lib/loth-service.ts` 의 Saturday-vespers 분기 확장: 다음 Sunday 의 `firstVespers` 존재 시 우선 채택 + `firstVespers.psalms` 존재 시 `psalmEntries` 대체, 부재 시 기존 Sunday regular vespers fallback 유지. `schemas.ts` 는 변경 불필요 (`SeasonPropersFileSchema` 가 `z.record(z.string(), z.unknown())` 로 이미 permissive). 신규 unit `first-vespers.test.ts` 3 케이스 — (a) 전 시즌/주차에 대해 현재 `getSeasonFirstVespers` 가 `null` 반환 (Phase 2 데이터 주입 전 상태), (b) mock 된 firstVespers 가 regular vespers 를 덮어쓰는지, (c) firstVespers 부재 시 기존 regular vespers fallback 유지 (회귀 가드). 총 `npx vitest run` 244 PASS (+3) / `npx tsc --noEmit` 0. **Phase 2 (task #20, 완료, commit 9da194f)**: PDF "1 дүгээр Оройн даатгал залбирал" 섹션 추출 스크립트 (`extract-first-vespers.js`) + `propers/{season}.json` 데이터 주입 + verifier. 현 스키마 그대로 runtime 에 반영 완료. **Phase 3a (task #21, 완료)**: Solemnity First Vespers 스키마 + resolver wiring. `SanctoralEntry.firstVespers?: FirstVespersPropers` 신규 필드 (기존 `vespers2` 와 대칭 — `vespers2` 가 solemnity 당일 2nd Vespers 를 다루는 반면 `firstVespers` 는 전날 저녁 1st Vespers 를 다룸). `src/lib/loth-service.ts` 의 vespers 분기에 "evening-before-solemnity" 블록 추가 — `getLiturgicalDay(tomorrow)` 가 SOLEMNITY 이고 그 날의 `sanctoral.firstVespers` 존재 시 **최상위 우선순위**로 채택 (기존 seasonPropers / Saturday→Sunday firstVespers 를 displace). 우선순위 체계: **Solemnity First Vespers > Sunday First Vespers > Sunday regular vespers fallback**. solemnity 데이터는 Phase 3b 에서 주입되므로 Phase 3a 시점 분기는 실질 no-op. 신규 unit 3 케이스 — (a) 2026-12-24 Christmas Eve 에 fake Christmas firstVespers 적용 확인, (b) solemnity 부재 시 기존 Saturday→Sunday 경로 유지, (c) Solemnity 와 Sunday First Vespers 동시 매치 시 precedence (Solemnity 우선). `npx vitest run` 248 PASS (+3) / `npx tsc --noEmit` 0. **Phase 3b (task #22, 완료, commit 328f14c)**: PDF 27건 solemnity firstVespers 추출 스크립트 + `sanctoral/solemnities.json` 주입 + verifier. movable solemnity 8건 (ascension / pentecost / trinitySunday / corpusChristi / sacredHeart / christTheKing + palmSunday + baptismOfTheLord) 은 extractor `movable` 버킷에 보존 — palmSunday/baptismOfTheLord 는 Phase 2 의 lentW6/christmasBaptism 키로 이미 커버, 잔여 6건은 Phase 4 대상. **Phase 4a (task #23, 완료)**: movable solemnity resolver 확장. `src/lib/propers-loader.ts` 에 `resolveSpecialKey(season, celebrationName)` 헬퍼 신설 (기존 Easter special-key 인라인 로직 추출 + OT 시즌 추가). `getSeasonHourPropers` + `getSeasonFirstVespers` 둘 다 이 헬퍼로 통합 — Easter (easterSunday/ascension/pentecost) 외 OT 시즌 4종 (trinitySunday/corpusChristi/sacredHeart/christTheKing) 매칭 추가. celebrationName 은 permissive substring 기반 (`'trinity'` / `'corpus christi'|'body and blood'` / `'sacred heart'` / `'christ the king'|'king of the universe'`). `src/lib/loth-service.ts` evening-before-solemnity 블록 확장: `getSanctoralPropers(MM-DD)` 가 null (movable 은 sanctoral 에 없음) 일 때 `getSeasonFirstVespers(tomorrowDay.season, tomorrowDay.weekOfSeason, tomorrowStr, tomorrowDay.name)` 로 fallback — 이 경로가 Easter + OT special-key 모두 담당. 우선순위 체계 unchanged (Solemnity First Vespers > Sunday First Vespers > regular fallback). 신규 unit 6 케이스 — (a) 2026-05-13 Wed eve → Ascension Thu, (b) 2026-05-23 Sat eve → Pentecost, (c) 2026-05-30 Sat eve → Trinity Sunday (신규 OT 키), (d) 2026-11-21 Sat eve → Christ the King (신규 OT 키), (e) OT movable name 전부 no-throw lookup flow, (f) 무관 OT name 은 per-week fallback 유지. `npx vitest run` 257 PASS (+6 vs 251) / `npx tsc --noEmit` 0. **Phase 4b (task #24, 완료)**: movable 6건 firstVespers 데이터 주입. Phase 3b extractor 의 `movable` 버킷에서 대상 6건 (ascension / pentecost / trinitySunday / corpusChristi / sacredHeart / christTheKing) 을 routing — Easter movables 는 `propers/easter.json` 기존 `weeks['ascension'\|'pentecost'].SUN` 엔트리에 `firstVespers` 필드 병합, OT 4종은 `propers/ordinary-time.json` 에 신규 special-key `weeks['trinitySunday'\|'corpusChristi'\|'sacredHeart'\|'christTheKing'].SUN.firstVespers` 로 삽입 (신규 4 special key 생성). antiphon_key prefix 는 `movable-<slug>-<ps1\|ps2\|cant>` 로 sanctoral fixed key (`solemnity-*` / `feast-*`) 와 namespace 분리. 스크립트: `scripts/inject-movable-first-vespers.js` (Phase 3b injector 패턴 재사용) + `scripts/verify-movable-first-vespers.js` (PDF 재추출 + byte-equal diff, NFR-009c). 실측: pentecost 만 full 블록 (psalms[3] + shortReading + intercessions + antiphon + 2 prayers), 나머지 5건은 antiphon + concludingPrayer + (대부분) alternativeConcludingPrayer — PDF 의 실제 기재 형태로 ascension/trinity/corpusChristi/sacredHeart/christTheKing 의 1st Vespers 가 공통 seasonal form 에 의존해 짧게 끝나기 때문 (Phase 3b 의 fixed 솔레니티 중 08-06/03-19/08-15/12-08 등도 동일 패턴). `getSeasonFirstVespers` 가 celebrationName → `resolveSpecialKey` → `weeks[specialKey].SUN.firstVespers` 를 자동 반환 (Phase 4a 이미 wired). `loth-service.ts` evening-before-solemnity fallback 이 path 1 (sanctoral MM-DD) null → path 2 (season propers special key) 로 자동 승계. 신규 unit 7 케이스 — (a) ascension / (b) pentecost full psalter / (c) trinitySunday / (d) corpusChristi permissive name matching / (e) sacredHeart / (f) christTheKing short+long name / (g) unrelated OT Sunday 은 weekly fallback 유지. 신규 e2e 5 케이스 (`e2e/movable-first-vespers.spec.ts`) — ascension eve 2026-05-13 antiphon + prayer, pentecost eve 2026-05-23 Ps 113+147+Rev15 psalmody + antiphon, trinity eve 2026-05-30 antiphon + prayer, christTheKing eve 2026-11-21 antiphon + prayer. `npx vitest run` 264 PASS (+7 vs 257) / `npx tsc --noEmit` 0 errors / `verify-movable-first-vespers.js` mismatch=0 PASS / 기존 `verify-solemnity-first-vespers.js` + `verify-first-vespers.js` 회귀 없음. movable 잔여 2건 (palmSunday / baptismOfTheLord) 은 Phase 2 의 lentW6 / christmasBaptism 키로 이미 커버, 추출기 `movable` 버킷에는 남아 있으나 inject 스크립트가 `out-of-scope-for-phase-4b` 사유로 SKIP. **Phase 4c (task #25, 완료)**: Phase 4b 검증 중 포착된 Palm Sunday Eve (2026-03-28) ps1 antiphon 회귀 수정. **증상**: ps1 antiphon 이 기대 `lentPassionSunday` variant ("Сүмд өдөр бүр та нартай хамт байж...") 대신 default_antiphon Easter alleluia variant ("Аяа Эзэн минь, Таны үг бол...Аллэлуяа!") 로 렌더. **원인**: Phase 3a (commit 8d76853) 에서 추가된 evening-before-solemnity 분기가 `seasonPropers` override 할 때 `effectiveDayOfWeek` / `effectiveWeekOfSeason` promotion 을 생략함. Palm Sunday 는 `rank=SOLEMNITY` 라 이 분기가 Saturday→Sunday 분기보다 먼저 fire 하고 후자 (line 200-204 의 `effectiveDayOfWeek='SUN'` + `effectiveWeekOfSeason=nextWeek` promotion) 를 skip. 결과 `pickSeasonalVariant` 가 (SAT, W5) context 로 호출되어 `lentPassionSunday` 게이트 (`dayOfWeek==='SUN' && weekOfSeason in {5,6}`) 미충족 → `default_antiphon` (Easter variant) 으로 폴백. Phase 3a 당시 "solemnity propers ship full antiphons" 가정은 fixed sanctoral solemnity (Christmas 등 seasonal_antiphons 없음) 에서는 맞지만, movable solemnity (Palm Sunday) 가 path 2 `getSeasonFirstVespers(LENT, 6, ...)` → `weeks['6'].SUN.firstVespers` (Phase 2 per-week data with `seasonal_antiphons.lentPassionSunday`) 로 resolve 하는 경로에서는 틀렸음. Phase 4a+4b 이전부터 latent 했던 회귀. **수정**: `loth-service.ts` solemnity 분기에 `effectiveDayOfWeek = dateToDayOfWeek(tomorrowStr)` + `effectiveWeekOfSeason = tomorrowDay.weekOfSeason` promotion 추가 — Saturday→Sunday 분기와 동일 semantics ("liturgical identity of the eve IS tomorrow's day"). Fixed sanctoral solemnity psalms 는 `seasonal_antiphons` 부재로 promotion no-op (Christmas 12-25, Assumption 08-15 회귀 없음). 신규 unit regression guard 1 케이스 (2026-03-28 ps1 antiphon 실측 확인 — real loader, mock 없이 PRD 기재값 byte-equal 매치). **결과**: `npx vitest run` 265 PASS (+1 vs 264) / `npx tsc --noEmit` 0 errors / `e2e/first-vespers.spec.ts` + `e2e/solemnity-first-vespers.spec.ts` + `e2e/movable-first-vespers.spec.ts` + `e2e/easter-antiphon.spec.ts` 16/16 PASS / verifier 3종 mismatch=0 유지. **task #30 (FEAST rank 확장, 완료)**: evening-before 분기의 `tomorrowDay.rank === 'SOLEMNITY'` 조건을 `SOLEMNITY || FEAST` 로 완화해 이미 Phase 3b 에서 주입된 4 feast entries (02-02 Presentation / 08-06 Transfiguration / 09-14 Exaltation of the Holy Cross / 11-09 Lateran Basilica) 의 `firstVespers` 가 전날 저녁에 surface 하도록 활성화. GILH/GIRM 상 FEAST 는 통상 1st Vespers 가 없으나 상기 4건만 PDF 원문이 authored — Path 1 (sanctoral.firstVespers 존재 체크) 이 data-driven activation signal 역할. Path 2 (movable special-key via `getSeasonFirstVespers`) 는 SOLEMNITY 전용으로 명시 gate — movable FEAST 버킷은 정의되지 않았고 GILH 상 해당 사례 없음. 신규 unit 5 케이스 (`first-vespers.test.ts` — 4 feast eve 각각 + Path 2 leak 방지 + firstVespers 부재 FEAST 회귀 가드), 신규 e2e 6 케이스 (`e2e/feast-first-vespers.spec.ts` — 4 feast eve Magnificat antiphon + Presentation 의 concluding prayer + FEAST 랭크이지만 firstVespers 미authored 일 경우 레귤러 Sunday vespers 로 fall-through). 데이터 변경 없음 — 4 feast 의 firstVespers 는 Phase 3b (task #22) 에서 이미 `sanctoral/feasts.json` 에 주입됨. `npx vitest run` 270 PASS (+5 vs 265) / `npx tsc --noEmit` 0 errors / e2e 38 PASS (+6) / verifier 3종 (first-vespers/solemnity/movable) mismatch=0 유지. **task #32 (defensive refactor, 완료)**: Phase 4c (task #25) 가 드러낸 "evening-before 분기와 Saturday→Sunday 분기가 동일한 `effectiveDayOfWeek` / `effectiveWeekOfSeason` promotion 을 독립 보유 → 한쪽 누락 silent regression" 구조적 문제 재발 방지. `src/lib/hours/first-vespers-identity.ts::promoteToFirstVespersIdentity(targetDate, targetDayOfWeek, targetWeekOfSeason)` 헬퍼 추출 후 `src/lib/hours/index.ts` barrel 로 공개. evening-before-solemnity-or-feast 분기 + Saturday→Sunday 분기 양쪽 모두 이 헬퍼 단일 호출로 교체. 주석에 "IDENTICAL semantic — 변경 시 함께 움직일 것" 명시 + 헬퍼 docstring 에 FR-156 Phase 4c 회귀 맥락 포함. 순수 refactor — behavior change 0 (`npx vitest run` 273 PASS (+3 helper unit) / `npx tsc --noEmit` 0 / e2e FR-156 matrix 38 PASS 유지 / verifier 3종 mismatch=0 유지). 신규 unit 3 케이스 (`first-vespers-identity.test.ts`). **task #36 (firstVespers page 필드 주입 + verifier 확장, NFR-009d 적용, 완료)**: 71건 firstVespers entries (52 Sunday + 13 solemnity/feast + 6 movable) 에 PDF page 필드 일괄 주입. 신규 `scripts/inject-first-vespers-pages.js` — `propers/*.json` 과 `sanctoral/{solemnities,feasts}.json` 의 firstVespers 서브트리만 walking, 기존 `extract-propers-pages.js` 와 달리 regular (non-firstVespers) 엔트리는 건드리지 않음 (add-only-safe). 페이지 매칭 로직은 기존 `scripts/lib/page-fingerprint.js` + 신규 `scripts/lib/first-vespers-page-annotator.js` (공통 annotator 로 injector 와 verifier 가 공유). annotation 대상 7 필드 카테고리: `concludingPrayerPage` / `alternativeConcludingPrayerPage` / `gospelCanticleAntiphonPage` / `intercessionsPage` / `shortReading.page` / `responsory.page` / `psalms[i].page`. 실측 주입: **332 page fields** (psalms 150 + shortReading 54 + intercessions 54 + responsory 29 + concludingPrayer 19 + gospelCanticleAntiphon 19 + altConcludingPrayer 7). 71/71 블록 각 ≥1 page 필드 보유. verifier 3종 (`verify-{first,solemnity,movable}-first-vespers.js`) 을 확장 — `buildExpectedFirstVespers` 직후 `annotatePagesInPlace(expected, pageIdx)` 호출해 expected 에도 동일 annotation 적용 → 기존 byte-equal diff 가 page 필드 drift 까지 자동 포착 (mismatch=0 유지). 런타임 코드 무수정 — `npx vitest run` 273 PASS (변화 없음) / `npx tsc --noEmit` 0 / FR-156 e2e 38 PASS 유지 / `verify-psalter-pages.js` agree=143 유지. 데이터 변경 outside firstVespers subtree 없음. **task #41 (34 unmatched page 복구 + 27 wrong 값 교정, 완료)**: task #36 의 fingerprint-only 방식이 놓쳤던 34건 unmatched (23 responsory + 11 Ps 113 antiphon) 를 복구하면서 감사 과정에서 발견된 27건 wrong 값 (psalter-1 shortReading 15건 571→55 / psalter-3 responsory 12건 541→292) 동시 교정. **근본 원인**: "Нар мандахаас жаргах хүртэл..." (Ps 113 antiphon) 과 "Аяа, Эзэн, бид Таны үйлсийг..." (psalter-3 responsory) 같은 텍스트가 PDF 여러 섹션에 중복 등장 → fingerprint 매칭이 psalter 밖 occurrence 로 false positive. **해결**: `scripts/lib/first-vespers-page-annotator.js` 에 `PSALTER_WEEK_PAGES` static 맵 추가 (full_pdf.txt 에서 "Шад дуулал"/"Уншлага"/"Хариу залбирал" 마커로 각 4주 psalter 블록의 실제 page 를 직접 읽어 도출 — psalter-1: 49/51/53/55/55, psalter-2: 166/168/170/171/172, psalter-3: 287/289/290/292/292, psalter-4: 398/400/401/402/403). `PSALTER_WEEK_MAPPING` + `getPsalterWeekFromMapping(season, weekKey)` helper export — 52 Sunday propers 엔트리는 대응 psalter week 의 static page 직접 사용. injector (`walkPropers` / `walkSanctoral` 분리) 와 `verify-first-vespers.js` 양쪽 모두 동일한 psalterWeek 컨텍스트 적용. 사원사 (9 solemnity + 4 feast) / movable (6) 엔트리는 fingerprint 유지 — 이들은 PDF section-고유 페이지라 false positive 없음. **결과**: 332 → **369 page fields** (added 37 + changed 27 + unchanged 305). 71/71 blocks 전 필드 커버 (missing 0, wrong 0). `npx tsc --noEmit` 0 / `npx vitest run` 273 PASS / `verify-{first,solemnity,movable}-first-vespers.js` mismatch=0 PASS / `verify-psalter-pages.js` agree=147 유지 / FR-156 e2e 38 PASS 유지. **Phase 5 (bare-ref → versed 데이터 정합화, 완료)**: PDF 본문이 bare 형 ref (`Psalm 122`) 로 기재된 firstVespers cells 가 다음 두 경로 모두 miss 해 빈 시편 카드를 노출하던 회귀 정합 — (1) `psalter-texts.json` catalog 키는 versed 형 (`Psalm 122:1-9`) 만 보유 → bare key 매칭 실패, (2) `scripture-ref-parser.ts` regex 가 콜론 강제 → `parseScriptureRef("Psalm 122")` 빈 배열 반환 → Bible JSONL fallback 도 발화 못함. 결과 `loth-service` 가 placeholder fallback 으로 진입해 SAT vespers 화면에 빈 시편 카드 + (일부 케이스) Magnificat 미렌더. 본 plan: `docs/fr-156-phase5-firstvespers-bare-ref-plan.md`. **결정**: SSOT (`psalter-texts.json` versed 형 invariant) 보존 위해 parser regex 무수정, 데이터 측 normalization 으로 대응. **WI-A1/A2 (task #75/#86/#87)**: `parsed_data/first-vespers-versed-map.json` (7 entries: Psalm 16/113/122/130/142/147 + 141:1-9 sanity) — PDF anchor + body fingerprint dual verification. `scripts/extract-first-vespers-versed-map.js` 추출기 + `scripts/rewrite-first-vespers-bare-refs.js` 자동 rewrite 도구 (18-test 단위 스위트, `--dry-run` / `--season` / `--allow-missing-catalog` 플래그). **WI-A3 (task #74)**: `scripts/verify-first-vespers-ref-coverage.js` 신규 verifier — propers + sanctoral 의 모든 firstVespers `psalms[*].ref` 가 (a) versed-form regex 일치 (b) catalog 키 hit (c) antiphon-slot 일관성 3가지 invariant 검증, 위반 cell 위치 리스트 출력. basal red 81 violations (66 bare + 15 catalog miss). **WI-C (task #88, commit 1356c73)**: catalog 보강 — `psalter-texts.json` 에 Psalm 141:1-9 + Psalm 142:1-7 신규 entry 2건 추가 (PDF stanza 직접 인용, NFR-009b "추측 금지" 준수). **WI-A4 (WI-B1 흡수, task #89)**: byte-equal verifier 3종 (`verify-{first,solemnity,movable}-first-vespers.js`) 의 `diff()` 함수에 `normalizeRef` on `.ref` paths 패치 추가 — `versed-map.json` 의 `rewrite_needed=true` entries 한정으로 PDF extractor canonical bare-form ↔ propers JSON versed-form 동등 처리 (NFR-009c). 한 번 적용 → 모든 후속 WI-B 시즌 자동 수용. **WI-B1~B5 (task #89/#90/#91/#94/#95)**: 5 시즌 데이터 rewrite — easter 8 cells (commit 08ca495), lent 7 cells (a44b9e4), advent 5 cells (cbf351c), christmas + sanctoral 12-25 4 cells (f2fb22b), ordinary-time 42 cells (fd6db42). 시즌별 e2e + integration vitest 추가. **결과**: ref-coverage 81 violations → **0 violations PASS**, byte-equal verifier 3종 mismatch=0 유지, vitest 273 → **332+ PASS**, tsc 0 errors, sw.js 무수정. parser regex 무수정 — verifier-gated normalization 으로 SSOT invariant 영구 enforcement (`docs/fr-156-phase5-firstvespers-bare-ref-plan.md` §7.3 ADR-P5-1/2/3/4 참조). NFR-009b/d 준수 (PDF 본문 직접 인용, byte-equal verifier 가드). **task #96 (WI-D)**: 본 row + traceability matrix + plan §4·§7 갱신 (이 paragraph). | 데이터 / 파이프라인 / 아키텍처 | P2 | Phase 1/2/3a/3b/4a/4b/4c + task #30 + task #32 refactor + task #36 page 주입 + task #41 page gap 복구 + Phase 5 bare-ref 정합화 (66 cells 5 시즌) 완료 |

### 12.2 데이터 품질 수정 (2026-04-16)

| 수정 내용 | 영향 파일 |
|-----------|-----------|
| 잘린 concludingPrayer/gospelCanticleAntiphon 텍스트 6건 복원 | `week-2.json`, `week-3.json`, `week-4.json`, `christmas.json` |
| Week 3 TUE vespers intercessions 오염 데이터 정리 (33→7개, shortReading 중복 제거) | `week-3.json` |
| Week 1/3 SAT vespers 시편 3개씩 빈 antiphon/title 채움 | `week-1.json`, `week-3.json` |

### 12.2.1 Pre-existing 실패 (FR-153f T9 시점 2026-04-23 확인)

아래는 FR-153f 변경 전/후 모두 FAIL 인 기존 이슈로, **T9 변경 무관** 이 `git stash` 기준으로 확인됨. 별건 처리 필요.

| 실패 | 원인 추정 | 별건 처리 |
|-----|---------|-----------|
| `src/lib/__tests__/psalter-loader.test.ts` — Week 3 SUN lauds responsory page 302 vs 303 | psalter-texts / week-3.json 데이터 drift — page 값이 어느 한쪽에서 shift | FR-017 계열 page 감사 워크플로우 (NFR-009c/d) |
| `e2e/prayer-sections.spec.ts` — hymn 선택 드롭다운 text 변화 2 브라우저 | Hymn dropdown 의 `.font-serif` selector 가 최근 hymn-section 리팩토링에서 변경됐거나 hymn 텍스트 비동기 로딩 타이밍 | FR-142 hymn 선택 e2e 유지보수 |

### 12.2.2 Stage 6 Rich 확산 완료 (2026-04-23)

FR-153 pilot (`f604835`) 이후 6개 하위 FR 로 분할 확산 완료. 병렬 세션(최대 3 concurrent)으로 진행됐고 공유 인프라(`rich-overlay.ts` / `resolver.ts` / `loth-service.ts` / `rich-builder.mjs`)는 `8a5e63f` megacommit 으로 흡수. 후속 세션은 그 위에 확산 변경만 쌓음.

| FR | 영역 | 커버리지 | 커밋 | 비고 |
|---|---|---|---|---|
| FR-153a | concludingPrayer | 135/135 | `9fd51be` | 21건 실패 → `maxExtraPages` + `pdfCorrections` 로 전수 통과 |
| FR-153b | intercessions | 56/56 | `503272c` | refrain/petition 구조 빌더 신설 |
| FR-153c | alternativeConcludingPrayer | 58/58 | `503272c` | prose 빌더 재사용 |
| FR-153d | responsory | 107/107 | `8a5e63f` / `ef66ce4` / `d1a3d3c` | 3-split: seasonal 50 + psalter commons 56 + compline commons 1×7. pilot `responsoryRich` 이관 |
| FR-153e | shortReading | 126/126 | `f05456b` / `baa1f02` / `29c399e` / `0a0b15c` / `5c1eabe` / `29ce2da` / `4a533e3` | 100% PASS. 잔여 20건 분산 해소: #14 canon 5 (`0a0b15c`) + #13 page 6 (`5c1eabe`) + #33 threshold 1 (`29ce2da`) + #35 pdfjs fallback 3 (`4a533e3`) + 잔여 5건은 재분류로 위 4 commit 에 흡수 (task #37 audit 확인) |
| FR-153f | psalter stanzasRich | 137/137 | `9f25a29` / `aa26631` / `3329fba` / `048c9be` | fail-fast 빌더 + `role: 'refrain'` 플래그. PDF 실측(italic 0%, rubric body 3%) 기반 3A 확정 |
| base | hymn 카탈로그 + wiring + 빈 text | 122/122 | `adc846f` / `f7c0d5d` / `e92fe93` | 중앙 카탈로그 `prayers/hymns/{N}.rich.json`, loader 와이어링, 15건 PDF 본문 추출 |

**구조 결정 (전 FR 공통)**

- **카탈로그 패턴**: 시즌 중립 공통문은 `src/data/loth/prayers/commons/{psalter,compline}/` 로 분리, 시즌 특이만 `prayers/seasonal/` 에. Hymn 은 `prayers/hymns/{N}.rich.json` 별도 카탈로그.
- **resolver 우선순위**: `sanctoral > seasonal > psalter commons > compline commons`. 필드별 독립 resolve.
- **수용 게이트**: 영역마다 다름 — prose 는 normalised byte-equal, responsory 는 3-field join vs 5-block flatten, psalter stanzas 는 byte-equal + 구조 동등성 (stanza 수·line 수·refrain 수) 2단계.
- **pilot 이관**: `seasonal/ordinary-time/w1-SUN-lauds.rich.json` 의 `responsoryRich` 를 `commons/psalter/w1-SUN-lauds.rich.json` 으로 옮기고 seasonal 에서 필드 삭제 — 카탈로그가 공식 소스.

**병렬 세션 교훈** (MEMORY 별도 기록)

- 공유 인프라 파일 (loader·resolver·wiring) 을 여러 세션이 동시 수정 시 덮어쓰기 위험. 첫 커밋에 흡수되면 후속 세션은 `git diff <선행 커밋> HEAD` 로 자연 배제됨을 확인 후 커밋. T5 megacommit 이 실제로는 T5+T7+T9 인프라 전체를 포함했지만 내용 동일로 손실 0 — 메시지는 교정 amend 대신 git notes 로 갈음.

**후속 (별건)**

| 항목 | Task / FR | 설명 |
|---|---|---|
| shortReading page 오류 14건 | #13 | NFR-009d body-fingerprint 워크플로우 확장 |
| shortReading canon truncation 5건 | #14 | PDF 원문 대조 후 JSON 패치 |
| shortReading layout 특이 1건 | #15 | ADVENT w1 MON p556 중복 헤더 |
| TS narrowing 2건 | #16 | `PrayerSourceRef.id` union narrowing (pre-existing) |
| psalter-loader page drift 1건 | #17 | week-3 SUN lauds responsory 302 vs 303 (pre-existing) |
| psalter pilot 규격 137 refs 재추출 | FR-153g | coarse refs (stanza≤2 · line≥20) 우선순위 |
| psalmPrayer rich 화 | FR-153h | 88 refs, `buildProsePrayer` 재사용 |

### 12.3 구현 상세

- **교송 라벨**: `src/components/prayer-renderer.tsx`의 `AntiphonBox`가 `label?: 'psalm' | 'canticle'` prop을 받음. `psalm-block.tsx`에서 `psalm.psalmType`에 따라 전달, gospel canticle 섹션에서는 `label="canticle"` 고정, invitatory에서는 기본값 `'psalm'` 사용.
- **루브릭 색상**: Dismissal 지시문은 `text-red-700/80 dark:text-red-400/80`으로 변경. 초대송 rubric은 `invitatory-section.tsx`에서 `text-xs italic text-red-700/80` 렌더링.
- **초대송 루브릭 전파**: `src/lib/hours/types.ts`의 `Ordinarium.invitatory`에 `rubric?: string` 추가 → `shared.ts`의 `loadOrdinarium()`에서 추출 → `buildInvitatory()`에서 `HourSection`으로 전달 → `invitatory-section.tsx`에서 렌더링.
- **Gloria Patri 생략**: `psalm-block.tsx`에서 `gloriaPatri === false`(명시적 false) 조건으로 빨간색 안내 텍스트 표시. 현 데이터상 `false`는 `Daniel 3:57-88, 56`(주1·3 주일 아침 Benedicite)에만 적용됨 — 본문 자체가 삼위일체 송영으로 끝나므로 추가 영광송을 생략. 다른 신·구약 찬가는 모두 `true`.
- **조건부 Alleluia**: `solemnities.json`(03-19, 03-25), `feasts.json`(11-09)에서 `(Аллэлуяа!)` 텍스트 제거 + `"alleluiaConditional": true` 필드 추가.
- **중보기도 파서 (FR-150)**: `src/lib/hours/intercessions.ts`의 `parseIntercessions(raw: string[])`가 JSON 원본을 `{ introduction?, refrain?, petitions: [{ versicle, response? }], closing? }` 구조로 변환. 응답 종결 휴리스틱(마침표/물음표/느낌표로 끝나면 다음 줄을 새 petition으로 판단)으로 다중 라인 응답을 올바르게 병합. lauds/vespers assembler에서 호출하여 `HourSection.intercessions`에 파싱 필드와 raw `items`를 함께 전달. `prayer-renderer.tsx`의 `IntercessionsSection`은 `petitions.length > 0`이면 구조화 뷰(도입부 본문 / 후렴 amber 박스 / 청원 versicle + 빨간 `- ` 접두 응답 / 마침), 그렇지 않으면 기존 flat 리스트 뷰로 폴백 렌더링. PDF 원문은 응답 줄 앞에 빨간 `-`만 두고 별도 `R.`/`Д.` 라벨이 없으므로 라벨 span은 모두 제거.
- **응송 3부 데이터 + 6행 렌더러 (FR-152)**: `Responsory` 타입과 `ResponsorySchema` 가 `{fullResponse, versicle, shortResponse, page?}` 3필드 (구조는 `src/lib/types.ts`, `src/lib/schemas.ts`). `src/lib/hours/{lauds,vespers,compline}.ts` 가 `HourSection.responsory` variant 로 3필드 그대로 전달. 렌더러 `src/components/prayer-sections/responsory-section.tsx` 는 6행(전체응답 리더 → 전체응답 회중 `- ` → 전구 리더 → 짧은응답 회중 `- ` → 영광송 한 줄 → 전체응답 회중 `- ` 반복) 을 출력하고, `fullResponse`/`shortResponse` 가 둘 다 비어 있으면 Triduum 간소화형식으로 versicle 한 줄만 렌더. 파서는 `scripts/lib/responsory-parser.js` (Glory Be `Эцэг,` 앵커 + V1 토큰 길이로 R1 랩 경계 복원), 데이터 교정 패처는 `scripts/fix-responsories.js` (118건 token-fingerprint 매칭). PDF 원문 텍스트 소스 `parsed_data/full_pdf.txt` 에서 124개 `Хариу залбирал` 블록을 indexAllResponsories 로 색인한 뒤 기존 JSON 의 `(versicle + response)` 지문으로 lookup. 성삼일 간소화형식은 `_note: "Intentionally empty response..."` 플래그로 구별하여 보존.

## 7. PDF 페이지 참조 기능

### 7.1 기능 요구사항

| ID | 요구사항 | 모듈 | 우선순위 | 상태 |
|----|----------|------|----------|------|
| FR-017 | **PDF 페이지 참조 표시**: 각 기도문 섹션(시편, 교송, 찬미가, 짧은독서, 화답, 복음찬가교송, 중보기도, 마침기도 등)에 원본 PDF의 페이지 번호를 루브리카 스타일로 표시한다. 형식: `(х. N)` — 빨간색 60% 투명도. 배치: **섹션 헤더형** (시편 참조·마침기도 제목 등) 은 헤더 옆, **후렴형(antiphon)** 은 후렴 텍스트 **끝**(`Шад дуулал N: 텍스트... (х. N)`) 에 표시해 헤더 프리픽스의 흐름을 깨지 않는다. | UI | P2 | 완료 |
| FR-017g | **후렴 페이지 표시**: 시편 후렴(`Шад дуулал`), 복음찬가 후렴(`Шад магтаал`), 초대송 후렴 모두 본문 끝에 `(х. N)` 를 표시한다. 시편 후렴은 부모 시편 페이지, 복음찬가·초대송 후렴은 시기별 propers 의 자체 페이지(`gospelCanticleAntiphonPage` / invitatory `section.page`) 를 사용한다. 이유: 후렴은 시기마다 본문이 달라 동일 복음찬가/초대송이라도 페이지가 바뀐다. | UI | P2 | 완료 |
| FR-017h | **시편 마침기도 페이지 표시 (Дууллыг төгсгөх залбирал)**: 각 시편 블록 뒤 post-Gloria Patri 오라치오 제목 옆에 `(х. N)` 표시. `psalter-texts.json` 의 entry 별 `psalmPrayerPage` 병행 키(88/88 자동 주입), `AssembledPsalm.psalmPrayerPage` 로 전파. 이유: 마침기도는 시편 본문과 다른 페이지에 위치하며 사용자가 종이책에서 찾기 위해 별도 페이지 참조가 필요하다. | UI / 데이터 | P2 | 완료 |
| FR-017i | **페이지 번호 클릭 시 앱 내부 PDF 뷰어 열기**: `PageRef` 는 `(х. N)` 을 **내부 링크**(`<Link href="/pdf/{bookPage}">`)로 렌더링한다. 새 탭이 아닌 같은 탭에서 `/pdf/[page]` 라우트로 이동하며, 상단 "Буцах" 버튼 또는 브라우저 뒤로가기로 원래 기도 페이지의 스크롤 위치로 복귀한다. 뷰어는 **`pdfjs-dist` 기반 client-side canvas 렌더러**(`src/components/pdf-viewer.tsx`) 로 `public/psalter.pdf` 에서 해당 책 페이지가 속한 2-up PDF 페이지를 불러온 뒤, **좌/우 반쪽 중 한 쪽만** (짝수 책 페이지=왼쪽, 홀수=오른쪽) 을 canvas 에 그린다. iOS Safari 등 모바일 브라우저가 네이티브 PDF fragment(`#page=N`)를 지원하지 않아 새 탭 접근이 깨지던 문제를 근본 해소. 매핑: `pdfPage = Math.floor(bookPage / 2) + 1`, `side = bookPage % 2 === 0 ? 'left' : 'right'` (`src/lib/pdf-page.ts`). 뷰어에는 이전/다음 책 페이지 네비게이션 버튼 포함. 링크 표시 여부는 `showPageRefs` 토글(FR-018) 로 제어, 링크 요소는 `data-role="page-ref-link"`, canvas 는 `data-role="pdf-canvas"` 마커를 가진다. | UI | P2 | 완료 |
| FR-017j | **PDF 뷰어 UX 개선**: `/pdf/[page]` 라우트에서 (a) 캔버스를 컨테이너 폭 기준 fit-to-width 로 렌더해(cssScale 상한 1.0, dpr 적용 device px) 모바일 글자 크기를 키우고, (b) 헤더/하단 nav 를 제거해 캔버스 영역을 최대화하며, (c) 좌우 스와이프(native PointerEvents, THRESHOLD 60px / EDGE_DEADZONE 16px / VERTICAL_REJECT 1.2 / 100ms debounce) 와 키보드 ArrowLeft/Right + Home/End 로 페이지 이동을 제공한다. (d) "Буцах" 는 좌상단 플로팅 반투명 원형 버튼(44×44, dark 대응, `safe-area-inset` 보정) 으로 유지, prev/next 시각 버튼은 제거하되 sr-only 등가 컨트롤 + `aria-keyshortcuts` + `[role="status"][aria-live="polite"]` 페이지 인디케이터로 a11y 보전. PDF 문서는 컴포넌트 마운트 시 1회만 `getDocument` → `useRef` 캐싱(스와이프 spam 시 재로딩 0). `ResizeObserver` 가 컨테이너 폭 변경/회전 감지 시 같은 페이지 재렌더. CACHE_VERSION bump 없음(`public/sw.js` 무수정), 의존성 추가 없음(`react-swipeable` 등 미도입). | UI | P2 | 완료 |
| FR-017a | **시편 주간 페이지 주석**: `psalter/week-{1..4}.json` 시편/교독성가/짧은독서/응송에 `page` 필드 + `intercessionsPage` 병행 키. 시편 95%↑ / 짧은독서·응송 95%↑ / 중보기도 85%↑. | 데이터 | P2 | 완료 |
| FR-017b | **시즌 propers 페이지 주석**: `propers/{advent,christmas,easter,lent,ordinary-time}.json` 의 마침기도·복음찬가교송·중보기도·짧은독서·응송 각 객체/병행 키에 페이지. 마침기도 99%↑, 응송 85%↑. | 데이터 | P2 | 완료 |
| FR-017c | **성인력 페이지 주석**: `sanctoral/{solemnities,feasts,memorials,optional-memorials}.json` 의 마침기도/복음찬가교송 등에 페이지. 마침기도 90%↑, 복음찬가교송 80%↑. | 데이터 | P2 | 완료 |
| FR-017d | **찬미가 페이지 주석**: `ordinarium/hymns.json` 의 본문 보유 entry 95%↑에 `page` 필드. (본문 미입력 entry 는 추측 금지 원칙으로 비워둠.) | 데이터 | P2 | 완료 |
| FR-017e | **시편 주간 마침기도 병행 키 (`concludingPrayerPage`)**: 평시 평일 마침기도 페이지 100% 커버리지. PDF 재추출(`scripts/reextract-pdf-pages.sh`) 로 2-up 레이아웃을 LEFT/RIGHT 반쪽씩 분리해 깨끗한 페이지 마커 확보 후 자동 매칭으로 44/44 채움. | 데이터 | P2 | 완료 |
| FR-017f | **페이지 커버리지 감시 스크립트**: `scripts/audit-page-coverage.js` 가 카테고리별 페이지 보유율을 측정하고 임계값 미달 시 비-zero 종료한다. CI 연결 가능. | 도구 | P2 | 완료 |
| FR-018 | **페이지 참조 토글 설정**: `/settings` 페이지의 "Хуудасны лавлагаа" switch로 페이지 참조 표시를 켜고 끌 수 있다. 기본값: 꺼짐. 설정은 localStorage에 영구 저장되며, 페이지 새로고침 후에도 유지된다. | UI/설정 | P2 | 완료 |
| FR-019 | **설정 시스템 기반**: SettingsProvider React Context를 통한 확장 가능한 설정 시스템. 모든 설정은 독립 설정 페이지(`/settings`)에서 통합 관리한다. 기도 페이지 헤더에는 `/settings`로 이동하는 톱니바퀴 링크(`SettingsLink`)만 배치한다. | UI/설정 | P2 | 완료 |

### 7.2 비기능 요구사항

| ID | 요구사항 | 상태 |
|----|----------|------|
| NFR-007 | **SSR 하이드레이션 호환**: 설정 토글은 client component로 구현하되, SSR 기본값과 client 하이드레이션 사이 불일치를 방지해야 한다. | 완료 |
| NFR-008 | **접근성**: `/settings`의 페이지 참조 switch는 `role="switch"` + `aria-checked` + `aria-labelledby` 패턴 사용. PageRef에 aria-label 제공. | 완료 |
| NFR-009 | **성능 무영향**: page 필드는 optional이므로 데이터 미주석 상태에서도 기존 기능에 영향 없음. | 완료 |
| NFR-009a | **페이지 커버리지 임계값**: `audit-page-coverage.js` 의 카테고리별 임계값(7.1 참고) 을 통과해야 한다. 임계값은 현재 데이터 소스 한계를 반영하며, 소스 품질 개선 시 상향한다. | 완료 |
| NFR-009b | **추측 금지**: 자동 추출 스크립트는 지문 매칭이 명확히 실패한 entry 의 페이지를 절대 추정·할당하지 않는다(`null`/미할당 유지). 잘못된 페이지 표시는 본문 부재보다 사용자 신뢰에 더 큰 손상을 준다. | 완료 |
| NFR-009c | **기존 페이지 값 교정 조건 (verified correction workflow)**: `scripts/verify-psalter-pages.js` 의 triple-anchor 증거 — Anchor H (`Дуулал N` / canticle 책이름 + 장) 가 창 `{declared-1, declared, declared+1}` 안의 단일 페이지 `p_h` 에, Anchor S (본문 첫 스탠자 토큰) 가 `p_h` 또는 `p_h+1` 에, Anchor A (`Шад дуулал <i+1>`) 는 evidence 수집용 soft — 가 충족될 때에만 `p_h` 로의 자동 교정이 허용된다. 모호하면 `scripts/out/psalter-page-review.json` 으로 분리. 패치 적용 시 hour 내 `psalms[i].page ≤ psalms[i+1].page` monotonicity 위반 수는 증가해서는 안 된다 (증가 시 verifier exit 1 = `MONOTONICITY_REGRESSED`). Cross-reference 시편은 `CROSS_REFERENCE_SKIPS` 에, Part II 시편(Дуулал N header 없이 Шад дуулал <i+1> 으로만 시작)은 `PART_II_SKIPS` 에 하드코딩. | 완료 |
| NFR-009h | **psalter-headers 카탈로그 정합성 (FR-160-C)**: `src/data/loth/prayers/commons/psalter-headers.rich.json` 의 entries 는 (a) `kind` ∈ {patristic_preface, nt_typological}, (b) 비어있지 않은 `attribution` + `preface_text` 문자열, (c) `page` integer, (d) `evidence_line_range` (full_pdf.txt 의 [start,end] line 번호) 4 필드 mandatory. catalog 부재 시 `loadPsalterHeaderRich(ref)` 가 null 반환 → UI `PsalmBlock` 가 header 미렌더 (legacy header-less 동작 그대로 — 회귀 0). 추가 entry 는 PDF 빨간글씨 evidence + Mongolian Cyrillic 패턴 검증 거쳐 ship. `unmatched` 버킷의 psalm refs (psalter-cycle 외부 — invitatory/compline) 는 후속 amendment 로 추가하거나 별도 카탈로그로 분리. canticle 머리 (`Магтаал`) 의 preface 는 본 카탈로그 scope 외 (별건 dispatch 권장). | 완료 |
| NFR-009g | **psalter-texts.json 키 유일성 (dedup gate)**: `src/data/loth/psalter-texts.json` 의 entry 키들은 stanza fingerprint 기준으로 unique 해야 한다. 동일 stanzas/psalmPrayer/page 를 공유하는 다중 verse-range 키 (예: `Psalm 118:1-14`, `Psalm 118:1-16`, `Psalm 118:15-21` 등이 모두 같은 4 stanzas 인용) 는 redundant 로 간주, FR-160-D canonical 정책 (externalRefs 우선 → widest range → page 보유 → numeric verse-order) 에 따라 1개 canonical 만 보존하고 나머지는 propers/sanctoral/psalter/e2e 에서 canonical 로 redirect. 검증 스크립트: `scripts/audit-psalter-key-dedup.js [--check]` — `--check` 모드는 redundant > 0 시 exit 1 (CI gate 후보). dedup 위반 시 (a) 카탈로그 데이터 비대화, (b) propers 에서 어떤 verse-range 키를 쓰느냐에 따라 동일 콘텐츠가 다른 메타 (psalmPrayerPage 등) 와 매핑되는 silent drift 위험. | 완료 |
| NFR-009f | **Refrain 정합성 — 양방향 게이트 (denylist + allowlist)**: rich catalog 빌드 (`scripts/build-psalter-texts-rich.mjs`) 가 두 JSON (`refrain-denylist.json` + `refrain-allowlist.json`) 을 모두 consult 한 후에만 `psalter-texts.rich.json` 을 갱신해야 한다 (FR-160). 양방향 게이트의 의미: (1) denylist 차단 (NFR-009e 의 FP 0 보장) + (2) allowlist 보강 (FN 보강 — threshold=3 미달 authentic refrain 의 forced 마킹). allowlist entry 추가 조건: (a) PDF 원문 페이지 + 본문 색상 시각 확인 (b) GILH/공식 전례 근거 (`liturgical_basis` 필드 mandatory — 단순 lexical 반복이 아닌 회중 응답 기능이 입증되어야 함). denylist ∩ allowlist (논리 모순) 시 denylist 우선 — 알려진 false-positive 가 allowlist 추가로 silently 재도입되는 회귀 방지. NFR-009e (FP 차단) 와 본 NFR-009f (양방향) 는 보완관계 — 둘 다 만족해야 §12.1 루브릭 규칙의 "빨간색 = 회중 응답" semantics 가 정합. | 완료 |
| NFR-009e | **Refrain mistag 0 보장 (denylist 게이트)**: rich catalog 빌드 (`scripts/build-psalter-texts-rich.mjs`) 가 `src/data/loth/refrain-denylist.json` 을 consult 한 후에만 `psalter-texts.rich.json` 을 갱신해야 한다 (FR-160). denylisted ref 는 `detectRefrainLines` 가 빈 Set 을 반환해 어떤 line 도 `role='refrain'` 으로 태그되지 않으며, 결과적으로 UI (`<span data-role="psalm-stanza-refrain">` + `text-red-700`) 에 빨간글씨 노출 0 라인을 보장한다. denylist entry 추가 조건: PDF 원문 페이지 + 본문 색상 (검정 vs rubric red) 시각 확인 필수 (`evidence_pdf` 필드 기재). 잘못된 refrain mistag 은 §12.1 루브릭 규칙 (FR-126/FR-128/FR-150/FR-152) 의 "빨간색 = 전례 지시문/공동 응답" semantics 를 오염시키므로, "본문 부재" 보다 사용자 신뢰에 더 큰 손상이다 (NFR-009b 와 동일 정신). | 완료 |
| NFR-009d | **비-시편 영역 페이지 교정 조건 (body-fingerprint workflow)**: `shortReading`, `responsory`, `intercessions`, `concludingPrayer`, `gospelCanticleAntiphon`, `hymn` 본문, compline·sanctoral 고유기도 등 본문 텍스트 필드가 있는 엔트리의 `page` 교정은 body fingerprint + `safeAmbiguousMin: 15` 로 `lookupPage` 가 `{declared-1, declared, declared+1}` 창 내 단일 페이지를 반환할 때에만 허용된다. 창 밖 매칭·NULL·empty-body 는 manual-review 로 분리. 전용 검증 스크립트: `scripts/verify-{hymn,psalter-body,compline,propers,sanctoral}-pages.js`. 대응 패치 스크립트는 precondition-assert (현재 값 == patch.from) 후 dotted-bracket locator 기반 descent 로만 교체한다. | 완료 |

### 7.3 구현 상세

- **데이터 스키마**: `PsalmEntry`, `ShortReading`, `Responsory`, `AssembledPsalm`, `HourSection` variant 들에 `page?: number` 필드. `AssembledPsalm` 은 추가로 `psalmPrayerPage?` (FR-017h) 보유. `HourPropers` 에 `hymnPage?`, `intercessionsPage?`, `concludingPrayerPage?`, `gospelCanticleAntiphonPage?`, `alternativeConcludingPrayerPage?` 추가. 시편 주간 JSON 의 마침기도·중보기도는 평면 문자열/배열 옆에 `concludingPrayerPage` / `intercessionsPage` **병행 키**(parallel key) 로 저장(하위 호환). `psalter-texts.json` 은 entry 별 `psalmPrayerPage` 병행 키.
- **설정 시스템**: `src/lib/settings.tsx` 의 `SettingsProvider` + `useSettings()` hook. localStorage 키 `loth-settings`.
- **UI**: `src/components/page-ref.tsx` — `PageRef` client component. `src/app/settings/page.tsx` "Хуудасны лавлагаа" switch(`role="switch"`). `AntiphonBox` (prayer-renderer.tsx) 는 `page?: number` prop 을 받아 후렴 텍스트 뒤에 PageRef 를 붙인다 — psalm-block / invitatory-section / gospelCanticle 섹션 모두 동일 경로로 전파 (FR-017g).
- **PDF 자산 및 인앱 뷰어 (FR-017i)**: `public/psalter.pdf` (원본 `Four-Week psalter.- 2025.pdf` 사본, 4.0MB, 485 pages) 를 그대로 유지하고, `public/pdf.worker.min.mjs` 를 함께 배포한다. 매핑/링크 유틸은 `src/lib/pdf-page.ts` 의 `bookPageToPdfPage()` (2-up PDF 페이지 번호), `bookPageSide()` (`'left'|'right'`), `viewerHref()` (`/pdf/{bookPage}`) 로 단일화. `PageRef` 는 `<Link href="/pdf/{bookPage}" data-role="page-ref-link">` 로 렌더링되어 **같은 탭에서 내부 라우트로 이동**한다 (`target="_blank"` 없음 — 모바일 브라우저의 PDF fragment 미지원을 우회). `/pdf/[page]` 라우트는 얇은 서버 컴포넌트(`src/app/pdf/[page]/page.tsx`, 1–969 범위 검증 후 404)로 클라이언트 뷰어(`src/components/pdf-viewer.tsx`)를 감싼다. 뷰어는 `pdfjs-dist` 의 **legacy 빌드** (`import('pdfjs-dist/legacy/build/pdf.min.mjs')` + 같은 경로의 `pdf.worker.min.mjs`) 로 전체 PDF 를 로드한다. 기본 (modern) 빌드는 내부에서 `Uint8Array.prototype.toHex()` (Chrome 140+ / Firefox 133+ / Safari 18.2+) 를 호출해 구형 Android Chrome 에서 `n.toHex is not a function` 으로 실패하므로 ES5 호환 legacy 빌드가 필수. main API 와 worker 는 반드시 같은 빌드 (mix 시 API/Worker version 에러). `bookPageToPdfPage(bookPage)` 의 페이지를 `scale = 1.5 × devicePixelRatio` 로 렌더하되, `canvas.width = viewport.width / 2` 로 자른 뒤 오른쪽 반쪽일 때는 `ctx.setTransform(1,0,0,1,-halfW,0)` 로 오프셋을 주어 **한 책 페이지만** 표시한다. 상단 "Буцах" 버튼은 `router.back()` 을 호출해 원래 기도 페이지의 스크롤 위치를 복원하며, 하단 이전/다음 버튼으로 책 페이지를 한 칸씩 이동 (1 ≤ bookPage ≤ 969). canvas 는 `data-role="pdf-canvas"` + `data-book-page` 속성으로 테스트/디버깅에 식별 가능.
- **추출 파이프라인** (`scripts/`):
  - `reextract-pdf-pages.sh` — `Four-Week psalter.- 2025.pdf` 를 PDF 페이지 단위로 순회해 LEFT/RIGHT 반쪽을 `pdftotext -x -W -H` 로 따로 추출, 각 반쪽 앞에 인쇄 페이지 번호(`2N-2` / `2N-1`)를 bare integer 라인으로 붙여 `parsed_data/full_pdf.txt` 생성 (970개 페이지 마커, ~25초). 기존 단별 추출의 마커 누락(±1 오차) 문제를 근본 해결.
  - `lib/page-fingerprint.js` — 공용 토큰 지문 매칭 모듈 (`tokenize`, `buildSourceIndex`, `buildSourceIndexMulti`, `buildFirstTokenIndex`, `lookupPage`, `countPageFields`).
  - `extract-propers-pages.js` — **2-tier 소스**: PRIMARY = `propers_full.txt` + `hymns_full.txt` (좁은 범위, 짧은 복음찬가교송 false positive 방지), FALLBACK = `full_pdf.txt` (PRIMARY 미매칭 항목만, `safeAmbiguousMin:15`).
  - `extract-hymn-pages.js` — `full_pdf.txt` → `ordinarium/hymns.json` 122개 entry 페이지 주입.
  - `extract-psalter-pages.js` — `full_pdf.txt` (또는 fallback `week{N}_*.txt`) + `page-mapping.json` (있으면 우선) → `psalter/week-*.json`. **add-only**, `safeAmbiguousMin: 15`. `concludingPrayerPage` 도 100% 채움 (FR-017e).
  - `extract-psalm-prayer-pages.js` — `full_pdf.txt` → `src/data/loth/psalter-texts.json` 의 88개 entry 에 `psalmPrayerPage` 병행 키 add-only 주입 (FR-017h, 88/88 매칭).
  - `audit-page-coverage.js` — 카테고리별 커버리지 리포트, 임계값 위반 시 exit code 1.
- **소스 데이터 신뢰도**: `full_pdf.txt` 는 PDF 페이지를 LEFT/RIGHT 로 명시 분할해 페이지 마커 누락이 없다. 그래도 시편 추출은 (a) 기존 손-주석 페이지를 절대 덮어쓰지 않고 (b) 신규 추가는 ≥15 토큰 지문 매칭으로 보수 운영. 검증된 `parsed_data/week{2,3}/page-mapping.json` 이 있으면 우선 사용.

---

## 8. PWA 설치 기능

### 8.1 기능 요구사항

| ID | 요구사항 | 모듈 | 우선순위 | 상태 |
|----|----------|------|----------|------|
| FR-110 | **Web App Manifest**: Next.js App Router `manifest.ts` 컨벤션으로 `/manifest.webmanifest`를 자동 서빙한다. 몽골어 `name`/`short_name`/`description`, `lang: "mn"`, `display: "standalone"`, `start_url: "/"`, `theme_color: "#2d6a4f"`, `background_color: "#fafaf9"` 포함. | PWA | P3 | 완료 |
| FR-111 | **앱 아이콘**: `public/icon.svg`(전례 녹색 배경의 십자가)를 매니페스트 `any` + `maskable` 목적으로 제공. Next.js `icon.tsx`/`apple-icon.tsx`로 favicon(32px)과 Apple touch icon(180px)을 `ImageResponse`로 자동생성한다. | PWA | P3 | 완료 |
| FR-112 | **Service Worker 등록**: `SwRegistrar` client component가 프로덕션 환경에서 `load` 이벤트 이후 `/sw.js`를 scope `/`로 등록한다. localhost/개발 환경에서는 등록하지 않아 HMR 충돌을 방지한다. | PWA | P3 | 완료 |
| FR-113 | **오프라인 폴백**: 네트워크 불가 시 내비게이션 요청에 대해 `/offline.html`(몽골어 "Интернэт холболтгүй байна" + 재시도 버튼)을 제공한다. 자체 완결적(외부 리소스 없음), 다크모드 대응. | PWA | P3 | 완료 |
| FR-114 | **캐싱 전략**: Service Worker 는 내비게이션 요청을 **network-only** (네트워크 실패 시에만 `/offline.html` 폴백) 로 처리해 구버전 HTML 이 캐시되는 문제를 원천 차단한다. 정적 자산(script/style/font/image)은 cache-first. 활성화 시 구버전 캐시를 정리한다. `CACHE_VERSION` 을 bump 하면 이전 캐시 전체가 `activate` 훅에서 제거된다. | PWA | P3 | 완료 |

### 8.2 비기능 요구사항

| ID | 요구사항 | 상태 |
|----|----------|------|
| NFR-010 | **PWA 설치 가능성**: 유효한 매니페스트 + 등록된 SW + HTTPS(Vercel) 조건을 만족해 브라우저 A2HS 프롬프트 기준을 통과한다. | 완료 |
| NFR-011 | **SW 업데이트**: `next.config.ts`에서 `/sw.js`에 `Cache-Control: no-cache, no-store, must-revalidate` + `Service-Worker-Allowed: /` 헤더를 강제하여 Vercel CDN이 SW를 캐시하지 않도록 한다. | 완료 |
| NFR-012 | **오프라인 페이지 UX**: `public/offline.html`은 외부 의존성 없이 인라인 CSS로 렌더링되며, 앱 디자인(stone-50/neutral-950, 전례 녹색 CTA)과 일치한다. | 완료 |

### 8.3 구현 상세

- **매니페스트**: `src/app/manifest.ts` — `MetadataRoute.Manifest` 타입, `/manifest.webmanifest`로 서빙. Next.js가 `<link rel="manifest">`를 `<head>`에 자동 삽입.
- **아이콘**: `public/icon.svg` (매니페스트 레퍼런스), `src/app/icon.tsx` (32x32 favicon), `src/app/apple-icon.tsx` (180x180 apple-touch-icon). `next/og`의 `ImageResponse`로 PNG 런타임 생성.
- **Service Worker**: `public/sw.js` — `divine-office-v3` 캐시, `install` 에서 `/offline.html` + `/icon.svg` 프리캐시 및 `skipWaiting()`, `activate` 에서 구버전 캐시 전체 삭제 및 `clients.claim()`, `fetch` 에서 navigation(network-only, 실패 시 `/offline.html`) / static-asset(cache-first) 분기. navigation 을 network-only 로 전환한 이유는 이전 network-first 구현이 구버전 HTML(구 PageRef 외부 링크)을 캐시해 모바일에서 PDF 가 다운로드로 처리되는 버그를 유발했기 때문. `v3` bump 는 `public/pdf.worker.min.mjs` 를 legacy 빌드로 교체한 데 따른 구 캐시 무효화.
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
- **초대송 교송**: `src/lib/hours/shared.ts`의 `buildInvitatory()`가 `invitatory-antiphons.json`에서 선택, `invitatory.json`의 Venite 본문과 결합. 기본값은 Psalm 95(Venite)이며 사용자 설정(FR-151)에 따라 Psalm 100/67/24로 대체 가능 — 교송·gloryBe·versicle은 불변이고 시편 본문·제목·페이지 참조만 교체된다.

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
| FR-032 | **시편 마침기도 접기 토글**: `/settings` 페이지의 "Дууллыг төгсгөх залбирал" switch로 모든 시편 뒤 마침기도(`data-role="psalm-prayer"`) 블록 표시 여부를 전역 토글한다. 기본값: 펼침(표시). ON 시 각 시편의 Gloria Patri 이후 마침기도 DOM 자체가 제거되어 시편 바로 다음 교송이 이어진다. 상태는 `loth-settings.psalmPrayerCollapsed`로 localStorage에 영구 저장되며 새로고침 후에도 유지된다. FR-031 초대송은 섹션 내부 chevron(inline collapse) 패턴, FR-032는 전역 설정 switch 패턴으로 UX 가 다름. | UI/설정 | P2 | 완료 |

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
- **UI**: `src/app/settings/page.tsx` — 라디오 그룹 3개 + 스위치 2개(FR-018 페이지참조 + FR-032 시편 마침기도 접기), 몽골어 레이블. `src/components/settings-link.tsx` — 헤더 기어 아이콘 `<Link>`.
- **시편 마침기도 접기 (FR-032)**: `src/lib/settings.tsx` 의 `psalmPrayerCollapsed` 불린 필드(기본 `false`). `src/components/psalm-block.tsx` 는 `'use client'` 경계에서 `useSettings()` 로 해당 값을 읽어 `{psalm.psalmPrayer && !settings.psalmPrayerCollapsed && ...}` 조건으로 `data-role="psalm-prayer"` DOM 을 완전히 제거한다(숨김이 아니라 미-렌더링). `/settings` 카드는 기존 "Хуудасны лавлагаа" 스위치와 동일한 `role="switch"` + `liturgical-gold` 패턴 재사용. FR-031 초대송 inline chevron 과 UX 가 다름에 유의.
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
| FR-151 | **초대송 시편 선택**: 초대송(Invitatory)의 4개 시편(Psalm 95/100/67/24) 중 사용자가 자유롭게 선택할 수 있다. 기본값은 Psalm 95(Venite). 루브릭(`invitatory.json#rubric`)이 허용하는 대체 시편(Ps 100/67/24)을 찬미가·성모교송과 동일한 드롭다운 UI로 제공한다. 선택은 `loth-settings.invitatoryPsalmIndex`에 localStorage로 영구 저장되어 매 기도시마다 재선택할 필요가 없다. | UI/조립 | P1 | 완료 |

### 13.2 구현 상세

- **성모교송 선택**: `src/components/marian-antiphon-section.tsx` — `'use client'` 컴포넌트, `hymn-section.tsx`와 동일한 `useState` + 드롭다운 패턴. `HourSection`의 `marianAntiphon` 타입에 `candidates?: MarianAntiphonCandidate[]`와 `selectedIndex?: number` 추가. `compline.ts`가 `complineData.marianAntiphon[]` 전체를 candidates로 전달.
- **대체 마침기도 선택**: `src/components/concluding-prayer-section.tsx` — `'use client'` 컴포넌트, 2개 옵션이므로 단순 토글 버튼 UI. `HourSection`의 `concludingPrayer` 타입에 `alternateText?: string` 추가. `lauds.ts`/`vespers.ts`는 `mergedPropers.alternativeConcludingPrayer`를, `compline.ts`는 `complineData.concludingPrayer.alternate`를 fallback으로 전달.
- **초대송 시편 선택**: `src/components/invitatory-section.tsx` — 기존 접기/펼치기 토글 아래에 `hymn-section.tsx`와 동일한 드롭다운 UI 추가. `HourSection`의 `invitatory` 타입에 `candidates?: { ref; title; epigraph?; stanzas; page? }[]`/`selectedIndex?: number` 추가. `shared.ts`의 `buildInvitatory()`가 `ordinarium.invitatory.invitatoryPsalms` 전체를 candidates로 노출하며 기본 psalm은 `[0]`(Venite)을 유지. 선택 상태는 찬미가와 달리 **설정(`useSettings().invitatoryPsalmIndex`)으로 지속**되며 로드/리로드 시에도 유지. `invitatoryCollapsed`와 공존(별도 키).
- **데이터 변경 없음**: `compline.json`(4개 성모교송), `propers/*.json`(alternativeConcludingPrayer 70건), `invitatory.json`(4개 초대송 시편) 모두 이미 완비. 로더(`psalter-loader.ts`, `propers-loader.ts`)도 변경 불필요.

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
| FR-140 | **선택 가능 축일 데이터**: `src/data/loth/sanctoral/optional-memorials.json`에 MM-DD 키 + 슬러그별 선택 기념일 엔트리를 정의한다. 각 엔트리는 `name`, `nameMn`, `rank`(OPTIONAL_MEMORIAL 기본), `color`(색상), `lauds`/`vespers` 고유문(HourPropers)을 포함한다. 토요일 성모 기념(`saturday-mary`)은 토요일 연중시기 평일에 가상 MM-DD로 노출된다. **task #48 (FR-045 follow-up A)**: PDF 외 외부 출처 3건 (`04-17-benedict-joseph-labre`, `06-13-anthony-of-padua`, `10-04-francis-of-assisi`) 을 제거하여 `optional-memorials.json` 을 빈 객체 `{}` 로 비웠다. 로더/타입/celebrations.ts 인프라는 dormant 유지 — 추후 PDF authored entry 또는 별도 FR 외부 카탈로그 도입 시 즉시 재가동 가능. `saturday-mary` (토요일 성모 기념) 는 `memorials.json` 에 분리 저장되어 영향 없음. | 데이터 | P1 | 인프라 완료 (현재 카탈로그 0 entries) |
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
