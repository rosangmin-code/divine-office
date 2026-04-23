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
| P1 | 성인축일 고유문 확장 (14개 → 로마 보편 달력 전체) | FR-045 |
| P2 | `vercel.json` 프로젝트 설정 파일 추가 (현재 Vercel 기본 감지 의존) | NFR-003 |
| P2 | PDF 뷰어 인터랙션 E2E 확장 (페이지 이동 / 범위 초과 1~969 / pdfjs 로드 실패 폴백) | FR-017i |
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
| FR-153e | **shortReading Rich 확산 (Stage 6)**: FR-153 파이프라인을 모든 shortReading 영역으로 확산. `scripts/parsers/rich-builder.mjs` 에 `buildShortReading` (Layer C 의 `buildProseBlocks` 위에 얇게 얹은 단일 단락 prose 빌더) 추가. PDF 의 `Уншлага` 섹션 헤딩 + ref 가 한 라인에 합쳐진 column-split 출력 형태(`Уншлага\t\t\t<ref>`) 에 대응해 헤더 정규식을 `/^[Уу]ншлага(?:[\s\t]|$)/u` 로 확장(case-insensitive — pdfjs 가 small-cap 글리프를 lowercase 로 펼침). END_OF_BLOCK 은 후속 섹션 헤더(`Хариу залбирал`, `Захариагийн/Мариагийн магтаал`, `Гуйлтын залбирал`, 요일 전치사) 외에 Holy Week 변형(`Хариу залбирлын оронд`) 추가. 게이트 정규화는 `normaliseForShortReadingGate` — `normaliseForGate` 위에 `\s*-\s*` → ` - ` 표준화로 inline em-dash dialog 인용(`— `↔`-`)을 동치 처리. 부수적으로 `isRunningHeaderLine` 정규식이 psalter continuation page 의 `74 1 дүгээр долоо хоног` (page+week 두 숫자) 패턴을 인식하도록 `^\d{1,4}(?:\s+\d+)?\s+[^\d]` 로 확장 — 이전에는 첫 번째 숫자만 처리하고 두 번째 숫자에서 매치 실패해 헤더가 본문에 섞여 들어갔다. 데이터 소스 3종을 한 스크립트(`scripts/build-short-readings-rich.mjs`) 가 통합 처리: (a) seasonal propers 5개 시즌 → `prayers/seasonal/{kebab}/w{weekKey}-{DAY}-{hour}.rich.json` 의 `shortReadingRich`, (b) psalter commons 4주 → 신규 `prayers/commons/psalter/w{N}-{DAY}-{hour}.rich.json` (FR-153d 의 카탈로그 경로와 공유), (c) compline commons 7요일 → `prayers/commons/compline/{DAY}.rich.json`. PDF_CORRECTIONS_BY_PAGE: 553/586 의 명백한 punctuation-glued-letter 렌더 결함 (`байна.Юунд` / `Ааба,Аав`) 2건 교정. 결과: **106/126 = 84.1% PASS** (seasonal 56/63 + psalter 43/56 + compline 7/7). 잔존 실패 20건 분류: page 오류 14건(NFR-009d body-fingerprint workflow 별건 처리), canon 텍스트 truncation/typo 5건(데이터 정합 별건), p556 PDF 중복 헤더 1건(LENT w6 등 PDF 레이아웃 특이 케이스). 실패 리포트 `scripts/out/short-reading-rich-failures.md`. 부수 인프라 — 이 작업 진행 중 발견: FR-153d 가 문서상 `loadPsalterCommonsRichOverlay`/`loadComplineCommonsRichOverlay` 추가를 표기했지만 실제 코드는 미구현이었음. 본 PR 에서 두 로더 + resolver 의 `psalterWeek` 컨텍스트 전달 + `loth-service.ts` Layer 4 wiring 까지 완료 — FR-153d 의 responsory 카탈로그도 같은 경로로 런타임에서 비로소 적재된다. | 데이터 / 파이프라인 / 인프라 | P1 | 진행 중 (84.1%) |
| FR-153f | **psalter stanzasRich 확산 (Stage 6)**: FR-153 파이프라인을 시편 본문(stanza 구조) 으로 확산. `scripts/parsers/rich-builder.mjs` 에 Layer F (`buildPsalterStanzasRich` / `buildStanzasFromSource` / `detectRefrainLines` / `verifyStanzasTextEquivalence` / `verifyStanzasStructuralEquivalence` / `bucketStanzaIndent`) 추가 — **소스 JSON only** 빌더 (PDF 재추출 없음). 설계 근거: 2025 PDF p58/60/64 실측 결과 시편 본문 내부 italic 0% · rubric 본문 hit ≈ 0% (rubric-all 16.83% 는 전부 running header/ref heading/subtitle 등 metadata, 본문 밖). 3-layer pipeline (3A) 로 충분하고 3C 업그레이드 이득 없음. 재추출 기반 세분화(pilot 규격)는 FR-153g 별건. **indent 3-level 버킷**: `0sp → 0 | 1-3sp → 1 | ≥4sp → 2`. PrayerBlock `stanza` 라인에 `role?: 'refrain' \| 'doxology'` 추가 — refrain auto-detect 는 ref 내 trimmed-line (말미 구두점·대시 제거) 이 ≥3 회 반복되면 `role='refrain'` tagging (Daniel 3 의 "Эзэнийг магтагтун" / "бүгдийн дээр үүрд мөнх өргөмжлөгтүн" 등). **수용 게이트 2단계**: (a) 텍스트 byte-equal — `normaliseForGate(source joined)` == rich flatten, (b) 구조 동등성 — stanza 수 + per-stanza line 수 + refrain 라인 수 일치. 두 게이트 모두 PASS 해야 카탈로그 기록 (**fail-fast** — 단 1건 실패 시 카탈로그 미생성, `psalter-rich-failures.md` 만 emit). 빌더 스크립트 `scripts/build-psalter-texts-rich.mjs` 가 `src/data/loth/psalter-texts.json` 137 refs 를 처리해 중앙 카탈로그 `src/data/loth/prayers/commons/psalter-texts.rich.json` 생성 (ref → `{ stanzasRich: PrayerText }` 1:1 맵). 로더 `loadPsalterTextRich(ref)` 는 `src/lib/prayers/rich-overlay.ts` 에 append (카탈로그 파일을 mtime-cache 로 단일 로드, ref 조회 O(1) — `cache-probe.test.ts` 가 10 call/1 read 계약 검증). Resolver `resolvePsalm` (`src/lib/hours/resolvers/psalm.ts`) 이 `AssembledPsalm.stanzasRich` 에 실어 전파, `PsalmBlock` (`src/components/psalm-block.tsx`) 이 rich 있으면 rich 분기 (dual-field fallback 유지). 렌더: 각 stanza `<p data-role="psalm-stanza">`, 각 라인 `<span>` indent → `pl-0/pl-6/pl-12`, refrain 라인 → `data-role="psalm-stanza-refrain"` + `text-red-700 dark:text-red-400` (§12.1 루브릭). 분포 리포트 `scripts/out/psalter-rich-report.md` 에 stanza 수 히스토그램 (min=1, median=2, max=15) + refrain 보유 refs 15건 요약 + FR-153g 재추출 우선순위 힌트 (coarse refs stanza≤2 line≥20 / non-Psalm canticles) 기록. pilot 재추출본 (`psalter-texts.pilot.rich.json` 3 refs) 은 FR-153g 입력용으로 별도 보관, 카탈로그 비포함. 스크린샷 baseline `.playwright-mcp/fr153f-case{1,2,3}-*.png` (Ps 63 serial 2 stanzas / Dan 3:57-88 refrain 15 stanzas 44 refrain lines all red / Ps 149 simple 1 stanza 22 lines flat). 결과: **137/137 refs = 100% PASS**. | 데이터 / UI / 파이프라인 | P1 | 완료 |
| FR-153g | **coarse refs pilot 규격 재추출 (Stage 6 follow-up)**: FR-153f 의 main `psalter-texts.json` 기반 137 refs 가 PDF 원형 대비 stanza 분할이 coarse (예: Ps 63:2-9 main 2 stanzas vs pilot 8 stanzas, Dan 3:57-88 main 15 vs pilot 19). FR-153g 는 `psalter-texts.pilot.rich.json` (3 refs pilot 규격) 을 입력 규격으로 삼아 `extract-psalm-texts.js` 의 stanza 경계 휴리스틱을 재보정하고, `psalter-rich-report.md` 의 **재추출 우선순위 힌트** (coarse refs stanza≤2 line≥20, non-Psalm canticles) 순으로 재추출. Stage -1 교훈 존중 — `mergeColumnWraps` / `mergeAcrossStanzaBoundaries` 휴리스틱 변경은 Ps 117/135/139 오염 재발 여지. 재추출 전후 `stanza count delta` / `line count delta` 리포트 필수. 수용 기준: 재추출 후 Layer F 가 FR-153f 와 동일하게 137/137 PASS 유지 + pilot 3건과 재추출본 간 structural diff ≤ 5%. | 데이터 / 파이프라인 | P2 | 계획 |
| FR-153h | **psalmPrayer Rich 확산 (Stage 6 follow-up)**: `psalter-texts.json` entry 의 `psalmPrayer: string` 필드 (88개 refs 보유) 를 `psalmPrayerRich: PrayerText` dual-field 로 확산. `buildProsePrayer` (FR-153a 의 Layer C 기반) 재사용 — 헤더 `/Дууллыг төгсгөх залбирал/u`, 소스 기도문 문자열과 pdftotext 라인 정합. `psalmPrayerPage` 는 FR-017h 에서 이미 제공되므로 PDF 재추출 가능. 카탈로그 경로는 `prayers/commons/psalter-texts.rich.json` 에 entry 당 `psalmPrayerRich` 필드 추가 (stanzasRich 옆), 같은 loader/resolver 경로 재사용. 렌더는 `PsalmBlock` 의 기존 `psalm-prayer` 분기에 rich fallback 추가. 수용 게이트는 FR-153a/c 의 `normaliseForGate` byte-equal. T9 와 분리 이유: stanzasRich 게이트는 구조 동등성 기준, prose 는 단락 reflow 기준 — 섞이면 실패 시 진단 모호. | 데이터 / 파이프라인 | P1 | 계획 |

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
