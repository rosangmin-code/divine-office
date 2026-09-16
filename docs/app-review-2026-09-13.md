# 전체 앱 리뷰 — 2026-09-13

- **대상**: `main` @ `94c89bc` (몽골어 성무일도 Next.js 16 앱)
- **방법**: 6개 리뷰 에이전트 병렬 (코어 로직 / UI·접근성 / PWA·보안·배포 / 데이터 파이프라인 / 테스트·CI·문서 / 품질게이트 실행+런타임 스모크) + 리더가 치명·높음 항목을 실제 함수 호출로 독립 재현
- **파일 수정**: 없음 (본 문서와 `docs/bug-reports/2026-09-13-*.md` 4건만 신규)
- **로그·스크린샷**: 세션 scratchpad `core/ data/ pwa/ testci/ ui/ runtime/` (임시)

---

## 0. 총평

**엔지니어링 기반은 탄탄하다.** lint 0 에러, tsc 클린, vitest 1,851 케이스 전부 통과, 프로덕션 빌드 15초, 모든 라우트 콘솔 에러 0, 모바일 가로 스크롤 0, 타임존·입력 검증·SW navigation 계약이 코드·테스트·문서 3중으로 고정돼 있다. 몽골어 UI 오탈자 규칙 위반도 0건이다.

**그러나 전례 정확성에서 치명 결함 3건이 실측으로 확인됐다.** 이 앱의 존재 이유가 "오늘의 올바른 기도문" 인데, (1) 연중시기 **모든 주일**의 본기도·복음찬가 후렴이 다른 주일 것이고 — 오늘 화면에도 나가고 있다 — (2) 성삼일 3일이 사순 1주로 리셋되며, (3) 2028년부터 주일과 겹친 성인 대축일이 사순·대림·부활 주일을 덮어쓴다. 셋 다 `calendar.ts` 의 전례력→데이터 키 매핑 한 층에서 나온 것이라 함께 고치면 하루 안에 끝난다.

**운영 리스크는 두 가지다.** `next@16.2.4` 는 치명 2·높음 10 권고에 노출된 미패치 버전이고, CI 는 배포를 게이트하지 않는다(브랜치 보호 없음, `next build`·UI e2e 954 케이스 실행 지점 없음). 여기에 데이터 검증기 5종이 5개월간 RED 인 채 방치돼 있다.

| 영역 | 판정 | 치명 | 높음 | 중간 | 낮음 |
|---|---|---|---|---|---|
| 코어 로직 (`src/lib`) | ⚠️ 치명 결함 | 2 | 2 | 4 | 3 |
| 데이터·스크립트 | ⚠️ 게이트 공백 | 0 | 3 | 5 | 7 |
| UI·접근성 | 🟡 양호, a11y 보강 필요 | 0 | 4 | 7 | 4 |
| PWA·보안·배포 | ⚠️ next 미패치 | 1 | 1 | 4 | 8 |
| 테스트·CI·문서 | 🟡 CI 비게이트 | 0 | 3 | 6 | 6 |
| 품질게이트 실행 | ✅ 전부 통과 | – | – | – | – |

---

## 1. 즉시 조치 (P0 — 이번 주)

> **2026-09-14 갱신**: P0-1·2·3 은 main `1eca5c7..7c0e415`(8커밋) 로 수정·머지됨 (독립 검증 PASS: main 대비 2026 전일자 출력 스윕 범주 밖 차이 0, vitest 1,881 통과, 브랜치 고유 e2e 실패 0). 검증 중 드러난 파생 문제 2건도 함께 수정: 특권 주일 저녁이 다음 날 이관 대축일 제1저녁기도를 채택하던 것(`becef1f`), 연중 34주 토요일 저녁이 빈 후렴을 내던 것(`5cc8a80`). `public/sw.js` 는 무변경 — 정적 자산·프리캐시·SW 로직 변경이 없어 CLAUDE.md 기준 `CACHE_VERSION` bump 대상이 아님(HTML 은 network-only, chunk 는 content-hash). **origin 에 push 하지 않았음** — 배포는 사용자 판단.

### P0-1. ✅ 연중 주일 본기도·후렴 주차 오조회 → `docs/bug-reports/2026-09-13-ot-sunday-propers-weekofseason.md`
`loth-service.ts:174-181` 등이 시즌 카운터 `day.weekOfSeason` 으로 `ordinary-time.json weeks[N]` 을 조회하는데, 데이터는 전례력 연중 N주 기준이다. 오늘(24주일) 아침기도는 weeks[16], 제1저녁기도 후렴은 weeks[17] 이 나간다. #256 은 라벨(`otWeek`) 만 고쳤다. **조치**: 연중시기는 `weekOfSeason = otWeek` (또는 `propersWeek` 신설) + 2026·2027 주일 전수 회귀 테스트.

### P0-2. ✅ 성삼일 → 사순 1주 리셋 → `docs/bug-reports/2026-09-13-triduum-season-key-holyweek-space.md`
`calendar.ts:122` `seasonKey === 'HolyWeek'` — romcal 실제 키는 `'Holy Week'`(공백). 성목·성금·성토가 weekOfSeason=1 로 떨어져 `lent.json weeks['6'].THU/FRI/SAT` 전체가 도달 불가. 성금요일 아침기도 짧은 독서가 이사 53:11b-12(사순 1주 금) 로 나감. **조치**: 문자열 1개 교정 + 성삼일 3개 연도 단위 테스트.

### P0-3. ✅ 주일=SOLEMNITY 뭉개기 + MM-DD 단독 sanctoral 조회 → `docs/bug-reports/2026-09-13-sunday-solemnity-sanctoral-override.md`
`mappings.ts:34` `SUNDAY→SOLEMNITY`, `calendar.ts:54-58`/`loth-service.ts:559-564` 가 romcal 선택과 무관하게 MM-DD 로 sanctoral 을 붙인다. 2028-03-19 사순 3주일 → "성 요셉", 2030-12-08 대림 2주일 → 원죄없는잉태, 2035-03-25 **부활 주일** → 주님탄생예고. **조치**: romcal `type`/`key` 보존 후 "romcal 이 선택한 날만" sanctoral 적용.

### P0-4. ✅ `next@16.2.4` → `16.3.5` 업그레이드 (semver-minor, `fixAvailable: true`)
> **2026-09-14 완료** (`fc1feb1`, `4918d7e`): audit critical 1 → 0, 잔여 high 1 = `pdfjs-dist`(6.x major, worker 사본·CACHE_VERSION 동시 교체 필요, 별도 과제). e2e 실패 집합 main 과 동일(고유 회귀 0). 프로덕션 실측: `x-powered-by` 제거. `/_next/image?url=…` 는 로컬 `next start` 에선 404, Vercel 에선 플랫폼이 `unoptimized` 를 인지해 원본 파일로 직접 매핑(`x-matched-path: /apple-icon.png`, 200) — 최적화 파이프라인은 타지 않으므로 목적 달성.

`npm audit`: critical 1 (next, 9.3.4-canary.0 ~ 16.3.2, advisory 24건). RSC DoS·Server Action 엔드포인트 노출(`src/app/actions/calendar.ts` 'use server' 존재)·이미지 최적화 DoS(프로덕션 `/_next/image` 가 살아 있음, `next/image` 미사용) 가 실제 해당. `docs/security-incident-2026-04-vercel.md:21` 의 "의존성 조치 불필요" 는 stale. **조치**: `npm i next@^16.3.3 eslint-config-next@^16.3.3` → build+e2e; `next.config.ts` 에 `images:{unoptimized:true}`, `poweredByHeader:false`; CI 에 `npm audit --omit=dev --audit-level=high`. 부수: `pdfjs-dist@5.6.205` high (악성 PDF JS 실행, 고정 `/psalter.pdf` 만 열어 실질 낮음, fix 는 6.x major).

### P0-5. 🟡 배포 게이트 — CI 강화 완료, Vercel Deployment Checks 등록은 사용자 몫
> **2026-09-14 코드 측 완료** (`bc8eda9`, `e3d61e7`, `9b426f1`, `f7d832e`, `3a360a2`): CI quality job 에 `npm audit --audit-level=critical` + `next build` + `.next` 아티팩트, e2e job 을 `next start` 기반 core 세트(api + `prayer-sections`·`page-references`·`pwa`·`calendar-list-month`·`prayer-footer`, 258 케이스 ≈2분) 로 교체, `forbidOnly`/html 리포터, nightly 전체 e2e(정보성), `docs/ops-rollback.md`. 첫 실행 성공(run 3a360a2: quality 2m01s, e2e 1m57s). **남은 단계(사용자, Vercel 대시보드)**: Settings → Build and Deployment → Deployment Checks → GitHub provider 로 `Lint · Typecheck · Unit tests` 와 `Playwright · API smoke + core UI` 두 job 을 Required 등록 (둘 다 필수 — quality 실패 시 e2e 는 skipped 라 하나만 걸면 통과로 셀 수 있음). 등록 전까지는 여전히 push 즉시 배포.

현재 push 즉시 Vercel 배포, CI 는 사후 통보(`gh api …/branches/main/protection` 404, `vercel.json` 에 체크 연동 없음). SW 캐시 회귀(CLAUDE.md 1순위 리스크)를 자동으로 막는 장치가 없다.

### P0-6. ✅ 데이터 검증기 RED 정리 → `docs/bug-reports/2026-09-13-verifier-red-and-plain-rich-drift.md`
> **2026-09-14 갱신**: 4커밋으로 수정 (`3abae18` rubric `evidencePdf.kind:'rationale'` 10건 → coverage verifier GREEN · `55dfcaf` plain 5키/7토큰 SoT 동기화 · `b2ddb16` plain↔rich parity verifier NFR-009n · `0150695` 죽은 4종 archive + `npm run verify:all` 14종 + CI 연결). `sw.js` 무변경 — 본문 변경은 SSR HTML 뿐이고 navigation 은 network-only 라 `CACHE_VERSION` bump 대상 아님. 미push.
`verify-conditional-rubric-coverage.js` 10 errors(이동 대축일 5개의 `evidencePdf.text` 가 PDF 인용이 아닌 설명문) 는 진짜 계약 위반. plain `psalter-texts.json` 4건이 rich 와 달리 2026-05-10 오탈자 교정 미반영(fallback·검증기 지문이 구본문). 죽은 검증기 4종(first-vespers 재추출 diff 3 + audit-canticle-refs) 은 archive.

---

## 2. 품질게이트 실행 결과 (2026-09-13, 로컬)

| 단계 | 결과 | 핵심 수치 | 소요 |
|---|---|---|---|
| `npm run lint` | ✅ | 0 errors / 3 warnings (미사용 변수: `docs/research/quote-phrase-merge/apply-split.mjs:14`, `src/lib/__tests__/data/goal127-…test.ts:35-36`) | 12.5s |
| `tsc --noEmit` | ✅ | 0 errors | 3.2s |
| `vitest run` | ✅ | 113 files / 1,851 passed / 4 todo | 15.7s |
| `npm audit` | ⚠️ | critical 1 (next) · high 8 (pdfjs-dist 런타임; brace-expansion·browserslist·js-yaml·nanoid·postcss·sharp·vite 는 devDeps) · moderate 4 · low 1 | – |
| `next build` | ✅ | 14 라우트, 정적 4 (`/settings` `/guide` `/ordinarium` `/_not-found`). Turbopack 경고 1: `page-redirect-resolver.ts` 의 fs 접근이 프로젝트 전체를 NFT trace | 15.0s |
| 클라이언트 JS | ℹ️ | 21 chunks 1,220 KB (최대 475 KB = pdf.js), CSS 58 KB | – |

### HTTP 스모크 (`next start -p 3210`)

| 경로 | 코드 | HTML 바이트 | TTFB | 비고 |
|---|---|---|---|---|
| `/` | 200 | 80 KB | 34 ms | `lang="mn"`, 오늘 카드 3개(1저녁·1끝·아침) |
| `/pray/2026-09-13/lauds` | 200 | 148 KB | 40 ms | |
| `/pray/2026-12-25/lauds` | 200 | 173 KB | 20 ms | 가장 큰 HTML |
| `/pray/2026-02-29/lauds` | **200** | 25 KB | 9 ms | `notFound()` 호출되나 `loading.tsx` 스트리밍 때문에 상태코드 200 |
| `/pray/2026-09-13/nonexistent` | **200** | 22 KB | 14 ms | "Буруу цагийн төрөл: nonexistent" 평문, 뒤로 링크 없음 |
| `/pdf/0`, `/pdf/99999` | **200** | 20 KB | 7 ms | not-found UI 인데 200 |
| `/api/loth/2026-09-13/lauds` | 200 | 72 KB JSON | 189 ms | Cache-Control 없음 |
| `/api/loth/bad-date/lauds` | 400 | 56 B | 3 ms | 검증 정상 |
| `/settings` `/guide` `/ordinarium` | 200 | 27 / 143 / 212 KB | ≤21 ms | 정적, `s-maxage=31536000` |
| `/sw.js` | 200 | 56 KB | 3 ms | `no-store`, 매 콜드 로드 전송 (코드 1.5 KB, 주석 91%) |
| `/manifest.webmanifest` | 200 | 722 B | | `/manifest.json` 은 404 (정상, layout 은 webmanifest 사용) |
| `/nonexistent-route` | 404 | 19 KB | 2 ms | 몽골어 not-found |

### 브라우저 스모크 (Chromium, 390×844 / 1280×800)

- 12 페이지×뷰포트 조합 전부 **console error 0, pageerror 0, 가로 스크롤 0**. `failReq` 로 집계된 것은 전부 `?_rsc=` Link 프리페치 abort 로 실제 실패 아님.
- 전송량: 홈 379 KB, 아침기도 156 KB, 설정 29 KB. **`/pdf/100` 은 4.5 MB** (psalter.pdf 전체 다운로드 — 로컬 `next start` 가 Range 요청을 안 받아서일 수 있음, 프로덕션 Vercel 에서 Range 로 부분 로드되는지 미확인).
- SW 는 localhost 에서 등록·활성(`CACHE_VERSION = 'divine-office-v83'`).
- 홈 → 아침기도 카드 클릭 → h1 렌더 497 ms, 뒤로가기 정상.
- 다크모드 아침기도: 배경/본문/루브릭 대비 양호. PDF 100쪽 캔버스 780×1262(DPR 2) 정상 렌더, 흑/백 단색 아님.
- 스크린샷 소견: 레이아웃 깨짐·겹침·잘림 없음. 홈 캘린더 리스트의 대축일명 줄바꿈("эсвэл Төгс жаргалт цэвэр Охин Мариагийн Бямба гарагийн дурсахуй")이 2줄로 흐르는 것 외 문제 없음.
- **영문 성경 참조 라벨 노출** (스크린샷·HTML 실측): 시편/찬가 제목 아래 `PSALM 118:1-16`, `DANIEL 3:52-57` 등 라틴 문자 ref 가 대문자로 렌더된다 (`psalm-block.tsx:122` 가 데이터 `psalm.reference` 원문을 그대로 출력, `:97` aria-label 도 동일). 정적 UI 리뷰가 놓친 **가장 눈에 띄는 NFR-002 영어 혼입** — 모든 시편 헤더에 나타난다. 몽골어 책 표기(Дуулал N) 로 매핑할지 결정 필요. **✅ 2026-09-14 P1 반영** — `src/lib/scripture-ref-mn.ts` `formatRefMn` 이 책 이름만 몽골어로 (`Дуулал 118:1-16`, `Магтаал`/`Даниел 3:52-57` — PDF 레이아웃 재현), aria-label 동일; 원본 키는 `data-ref` 보존.
- **토요일 저녁 헤더 라벨**: `/pray/2026-09-12/vespers` 본문은 제4주간 주일 제1저녁기도(시편 122·130, `/pray/2026-09-13/firstVespers` 와 후렴 동일) 로 정확하나, 헤더는 "23-р долоо хоног · Бямба · Дуулалтын **III**" 로 토요일의 시편주간을 표시해 본문(IV)과 불일치.
- 오늘 주일 카드에 시간경 3개(제1저녁·제1끝·아침)만 뜨는 것은 09-14 성십자가 현양 축일의 제1저녁기도 우선 규칙(#240, Universal Norms n.61) — 의도된 동작. 직접 URL `/pray/2026-09-13/vespers` 는 200.
- `.next/server` 27 MB, `.next/static` 2.3 MB. 서버 SSR 청크에 `pdfjs-dist legacy` 1.3 MB .map 이 포함(dynamic import 이지만 SSR 그래프에 트레이스됨).

---

## 3. 영역별 발견

### 3.1 코어 로직 (`src/lib`) — 전문: scratchpad `core/review-core-lib.md`

**강점**: `timezone.ts` 만 `new Date()` 를 쓰고 UTC 앵커 일관(연도 경계·윤년 실측 OK); `date-validation.ts` round-trip 을 API/SSR 공유; `allSettled` 부분 실패 격리; 모듈 캐시로 warm `assembleHour` 0.5 ms / 366일 캘린더 8 ms; 순환 import 없음; 루브릭 엔진 순수·불변.

| # | 심각도 | 위치 | 문제 |
|---|---|---|---|
| 1 | 치명 | `calendar.ts:122` | P0-2 성삼일 시즌 키 오타 |
| 2 | 치명 | `calendar.ts:111-137`, `loth-service.ts:174-181,469-474,506-519` | P0-1 연중 주일 propers 주차 |
| 3 | 높음 | `mappings.ts:34`, `calendar.ts:54-58`, `loth-service.ts:559-564` | P0-3 주일 sanctoral 덮어쓰기 |
| 4 | 높음 | `loth-service.ts:151-165`, `hours/loaders.ts:20-28`, `resolvers/psalm.ts:103-111`, `propers-loader.ts:36,332,373,421,439`, `schemas.ts:141-147` | 무음 fallback 정책 불일치: 시편집 로드 실패 → 빈 시편 무로그; psalter-texts 실패 → 전 시편이 성경 JSONL 번역으로 대체; `safeParse` 결과 버림; sanctoral 스키마 `record<unknown>`. 반면 `page-redirect-resolver.ts:128-137` 은 키 오타 1개에 throw → `assembleHour` try 없음(`:817-821`) → 페이지 500 |
| 5 | 중간 | `propers-loader.ts:202,215-219,279,286-289` | week-1 무조건 폴백이 잘못된 주차 키를 은폐 (재의수요일 주 wos=0 → 1주 propers) |
| 6 | 중간 | `app/actions/calendar.ts:12-22` | `anchorDate` 미검증 → `shiftDate` RangeError 500(실측); before/after 3650 허용 → 7,301행 1.1 s/호출 — 공개 Server Action DoS 표면 |
| 7 | 중간 | `psalter-loader.ts:181-213`, `hours/loaders.ts:47`, `resolvers/psalm.ts:31-38` | 캐스트 벽; `compline.json` 중복 파싱(`Ordinarium.complineData` 소비자 없음); 위치 인자 6개 |
| 8 | 중간 | `loth-service.ts` 전반 | `assembleHour` 4중 First-Vespers 경로, "내일 MM-DD" 계산 6곳 복제, DOW 배열 4곳, `first-vespers-identity.ts` 는 항등함수 |
| 9 | 낮음 | `hours/builders/invitatory.ts:30-58` | 몽골어 name 비교는 `day.name` 이 영어라 죽은 분기; `'Good Friday'` substring 매직 문자열 |
| 10 | 낮음 | `prayers/catalog.ts`, `getMongoliaHour`, `getTodayHour`, `RANK_NAMES_MN`, `schemas.ts:306-307` | 미사용 export |
| 11 | 낮음 | `api/calendar/today/route.ts:8-13` | 에러 삼킴(무로그); 날짜 키 API 에 Cache-Control 없음 |

**구조 제안**: (a) `calendar.ts` 에서 `celebrationKey / romcalType / propersWeek` 를 확정하고 하류는 `propersWeek` 만 소비 (≈1일, 치명 1·2·높음 3 근본 해결). (b) `assembleHour` 를 resolveIdentity → resolvePsalmody → resolvePropers(단일 `resolveFirstVespersSource`) → hydrate → assemble 로 분해 (2–3일). (c) `loadJson(schema, {onFail})` 헬퍼 + 실스키마 + CI `verify:data` (1–2일).

### 3.2 데이터 파이프라인·스크립트·리포 위생 — 전문: 데이터 에이전트 보고 (scratchpad `data/`)

**강점**: 페이지 앵커 verifier 의 삼중 증거 규칙(S/H/A) 문서화 + 결정론적(2026-08-08 커밋본과 바이트 동일); `scripts/__tests__` 21 파일 472 테스트 통과; `docs/data/source-typo-ledger.md` E1–E4 증거 등급; `.gitignore` 근거 주석; `schemas.test.ts` 가 week-1..4/propers/sanctoral/hymns 실파일 acceptance.

| # | 심각도 | 문제 |
|---|---|---|
| 1 | 높음 | plain↔rich 본문 드리프트 5건, 대조 verifier 0개 (P0-6) |
| 2 | 높음 | `verify-conditional-rubric-coverage.js` RED 10 errors, 5개월 미감지 (P0-6) |
| 3 | 높음 | SoT `parsed_data/full_pdf.txt` 미추적 → 32개 스크립트·페이지 앵커 verifier 8종이 CI 진입 불가. `verify:body-purity:check` 는 package.json 에만 있고 어디에도 미연결 |
| 4 | 중간 | 파이프라인 재현 불가: `extract-psalm-texts.js:14-28` "full overwrite 재실행 금지", build-*-rich 17개는 2026-04-23 1회 실행 후 rich 73커밋 손수정. 하드코딩 `/home/min/venv/bin/python3` 2곳. SoT 텍스트 덤프 2종(`verify-psalter-stanzas.js:30` 은 루트 `psalter_full_text.txt`) |
| 5 | 중간 | 재추출-diff verifier 3종 영구 RED (STC-003 교정·`conditionalRubrics` 추가마다) |
| 6 | 중간 | `audit-canticle-refs.js` 가 정상 전례 반복(시편 110·묵시 19)을 "duplicate" 로 exit 1 |
| 7 | 중간 | zod 가 전수 게이트 아님: sanctoral/optional-memorials `z.record(unknown)`, `psalter-texts.json`·ordinarium 5종·rich 313개 무스키마, `verify-phrase-coverage.js:62-74` 에 `PhraseGroupSchema` 복제 |
| 8 | 중간 | 산출물 커밋: `scripts/out/` 4.15 MB(PNG 1.5 MB + `psalter_layout.txt` 1.9 MB), `docs/research/51-truncation-sweep/shard-*.jsonl` 28 MB × 3버전 = 히스토리 상위 blob 12개 전부. loose 4,261개/76 MB (`git gc` 필요) |
| 9 | 낮음 | 커밋된 감사 산출물 2종 stale(`psalter-stanza-review.json` 2834→2745줄) |
| 10 | 낮음 | 데드: `psalter-texts.pilot*.json` 소비자 0, `rich-overlay.ts:166-169 loadSanctoralRichOverlay` 는 존재하지 않는 디렉터리 → 항상 null |
| 11 | 낮음 | 언어 혼재 61 .js / 65 .mjs / 10 .ts / 2 .py / 1 .sh; `scripts/**/*.js` 61개 lint 제외; 21개는 어떤 문서에도 언급 0; `normalize` 7벌·`tokenize` 3벌 복붙 |

**스크립트 분류**: 최상위 96개 중 일회성 완료 추정 ≈63개(66%) — 추출 14/17, 주입 5/5, 수정·마이그레이션 13/14, 빌드-rich 14/17, 감사 4/7, 검증 4/20, 캡처 7/7, 진단 2/2. archive 디렉터리 없음.

**구조 제안**: (a) `npm run verify:all` + CI 에서 `pdftotext -layout public/psalter.pdf` 로 SoT 재생성 → 페이지 앵커 8종·ref-consistency·rubric-coverage·body-purity + 신설 plain↔rich 동등성 verifier 를 한 타깃으로, Makefile/CI 통일. (b) `scripts/archive/<goal>/` + `scripts/README.md` 인덱스, `scripts/out` 바이너리·연구 shard 제거 후 `git gc`. (c) `src/lib/schemas.ts` 단일 소스(스크립트에서 import) + "src/data 모든 JSON 이 어느 스키마든 통과" acceptance.

### 3.3 UI·컴포넌트·접근성 — 전문: scratchpad `ui/ui-review.md`

**강점**: "오늘" 은 서버에서 Asia/Ulaanbaatar 로만 계산해 prop 전달(클라이언트 날짜 로직 0건 → 하이드레이션 불일치 없음); `layout.tsx:56-74` 인라인 스크립트로 폰트·테마 FOUC 방지; `settings.tsx:78-121` 타입가드 마이그레이션 + 쓰기 실패 시 메모리 SoT + storage 이벤트 탭 동기화; `pdf-viewer.tsx` iOS 캔버스 클램프·렌더 race 가드·aria-live; 골드 focus-visible·reduced-motion 전역; NFR-002 를 테스트로 고정.

| # | 심각도 | 위치 | 문제 |
|---|---|---|---|
| H1 | 높음 | `settings.tsx:137` | ✅ **2026-09-14 수정** (`0dd0018`): `getClientSnapshot` 의 `window.localStorage` getter·`getItem` 을 try/catch 로 감싸 실패 시 마지막 파싱값(초기 DEFAULTS) 동일 참조 반환 + warn 1회. 회귀 테스트 5건 (`settings-storage-blocked.test.ts`, @fr FR-019). `sw.js` 무변경. 미push. — 원문: 렌더 중 호출되는 `localStorage.getItem` 에 try/catch 없음 → 저장소 차단 브라우저(쿠키 전체 차단·일부 WebView)에서 SettingsProvider 가 루트를 감싸므로 **모든 페이지가 error.tsx** |
| H2 | 높음 | `prayer-footer.tsx:61-93` | ✅ **2026-09-16 수정**: FR-164 의도(기도 중 화면을 가리지 않는 큰 진입점) 보존하며 재설계 — (a) 상시 노출 명시적 트리거 `data-role="prayer-footer-handle"` (하단 우측 44px 칩, 본문 flow 불점유) 추가 → 스크린리더·키보드의 결정적 경로 확보. (b) 본문 탭 제스처는 유지하되 `src/lib/prayer-footer-gesture.ts` 의 순수 함수 `shouldOpenOnBodyTap` 으로 좁힘 — 합성 click(`detail===0`, AT 더블탭)·스크롤 직후 600ms·이동 10px 초과(드래그)·500ms 초과(롱프레스)·텍스트 선택 중 전부 배제. (c) 패널 `role="dialog" aria-modal="true" aria-labelledby` + Tab 포커스 트랩 + Esc + **배경 inert**(조상 사슬 형제 `inert`) + 닫을 때 **원래 포커스 복원**. (d) 백드롭 `<button aria-hidden tabindex=-1>` → 포커스 불가 `<div>` (aria-hidden 제거). 테스트: 단위 `prayer-footer-gesture.test.ts` 12 + `prayer-footer.test.ts` +5, e2e `prayer-footer.spec.ts` D8~D11 (트리거/dialog/배경 inert, Esc 포커스 복원, 스크롤 직후 탭 무시, 백드롭 shape). `sw.js` 무변경(라우트·자산·Content-Type 불변). — 원문: 본문 아무 곳 탭 = 설정 패널 열기 + 포커스 강제 이동. SR 더블탭에 파괴적, `role=dialog`/inert 없음, 백드롭 `<button aria-hidden>` |
| H3 | 높음 | `gospel-canticle-section.tsx:312-357`, `hymn-section.tsx:63-110`, `invitatory-section.tsx:99-143`, `marian-antiphon-section.tsx:109-156` | ✅ **2026-09-16 수정**: 네 곳을 공용 훅 `src/components/ui/listbox.tsx` 의 `useListbox` + `listboxOptionClassName` 으로 수렴 (순수 키보드 로직은 `src/lib/roving-nav.ts`). 트리거 `role="combobox" aria-haspopup="listbox" aria-expanded aria-controls` + 열렸을 때 `aria-activedescendant`, 목록 `role="listbox"`, 항목 `<li role="option" id aria-selected tabindex>` 로 **중첩 `<button>` 제거**(option 자식은 presentational). 키보드 ↑/↓·Home/End(순환 없음)·Enter/Space 선택·Esc 닫고 트리거 포커스 복원·Tab 이탈 시 닫힘·바깥 클릭 닫힘, 열릴 때 현재 선택 항목으로 포커스(roving tabindex). `role="combobox"` 는 name-from-content 금지 역할이라 네 트리거 모두 몽골어 `aria-label` 부여(NFR-002). 네이티브 `<select>` 회귀 금지 계약 유지(#96→#98). 테스트: 단위 `roving-nav.test.ts` 23, e2e `a11y-listbox-keyboard.spec.ts` 5 + `prayer-sections.spec.ts` selector 이관(`li button` → `role=option`, `button` → `combobox`). — 원문: 커스텀 listbox 4곳: `<li role=option>` 안 `<button>` 중첩, 화살표/Esc/포커스 관리 전무, `aria-activedescendant` 없음 |
| H4 | 높음 | `page-ref.tsx:14`, `footer.tsx:41,44`, `pray/[date]/[hour]/page.tsx:96`, `liturgical-calendar-row.tsx:91,103`, `psalm-block.tsx:125,337,344` | 색 대비 3.2~3.8:1 (stone-400, 골드 kicker, 오늘 행 골드, 다크 stone-500) — DESIGN.md 자체 AA 4.5:1 미달 |
| M1 | 중간 | `settings.tsx:163-165`, `prayer-renderer.tsx:68-77`, `page-ref.tsx:9`, `psalm-block.tsx:372-374` | 설정 의존 UI(페이지참조·초대송 접힘·시편 마침기도) 가 SSR 기본값 → 하이드레이션 후 변경 = 레이아웃 시프트 (느린 3G 에서 수 초) |
| M2 | 중간 | 13개 섹션 제목이 `<p>`, `psalm-block.tsx:118` 만 `<h4>` | `/pray` 헤딩 계층 h1→h4 점프, SR 헤딩 탐색 불가 |
| M3 | 중간 | `pdf-viewer.tsx` | 보이는 이전/다음/뒤로 컨트롤 없음(sr-only nav + 스와이프 + 화살표키만); iOS A2HS 는 좌측 16px 데드존; pdf.js 영문 오류 원문 노출(`:332-334`) |
| M4 | 중간 | `pray/[date]/[hour]/page.tsx:33-39,59-64` | 잘못된 hour·assemble 실패가 200 평문(뒤로 링크 없음); 날짜 오류는 `notFound()` 지만 스트리밍 때문에 역시 200 |
| M5 | 중간 | `install-app-section.tsx:4` ↔ `settings/page.tsx:6,28-54` | 순환 import + page 파일에서 스타일 상수 export |
| M6 | 중간 | `psalm-block.tsx:180-311` vs `rich-content.tsx:401-486`, `gospel-canticle-section.tsx:36-158`, `invitatory-section.tsx:149-164` | phrase/paragraphBoundaries 렌더 4벌 (이미 en-dash 제거·indent 정책이 갈라짐), 응답 마커 `- ` 8파일 11곳, `flush` prop 무효 |
| M7 | 중간 | `settings/page.tsx:177-193,216-232,247-294`, `celebration-picker.tsx:51-92` | 🟡 **2026-09-16 부분 수정**: radiogroup 3곳(글꼴·테마·celebration-picker)에 H3 와 **같은 훅**(`useRadioGroup`) 으로 roving tabindex + 방향키(순환) 적용, radio·스위치에 `type="button"` 부여. 스위치 물리 치수(28×48px) 는 이번 범위 밖(H4 색 대비와 함께 후속). — 원문: radiogroup roving tabindex 없음, 스위치 28×48px·`type="button"` 누락 |
| L1–L4 | 낮음 | `footer.tsx:71-80`(button+router.push → Link), `hour-card-list.tsx:59`(`→` 유니코드), `layout.tsx:66`(레거시 theme 키 불일치), `month-nav.tsx:100,151-161`, `error.tsx`(error 미사용·global-error 부재), `/pray`·`/pdf` metadata 없음 | |

**NFR-002 영어/라틴 혼입 8곳**: **`psalm-block.tsx:122` 시편·찬가 헤더의 영문 `psalm.reference`(`PSALM 118:1-16`, `DANIEL 3:52-57` — 런타임 스크린샷으로 확인, 모든 시편에 노출)** ✅ 2026-09-14 — `formatRefMn` 으로 헤더·aria-label 몽골어화 (초대송·짧은 독서 `ref`·directive `ref` 폴백 동일 함수), 단위 17 + 컴포넌트 9 케이스 (`@fr NFR-002`); `guide/page.tsx:267-268` "General Instruction of the Liturgy of the Hours"; `settings/page.tsx:204` "Dominus tecum."; `:148` "Aa"; `:10-18→151` "XS S M L XL XXL XXXL 4XL 5XL"; `guide/page.tsx:195`·`ordinarium/page.tsx:136-138` "R."; 런타임 `pdf-viewer.tsx:332-334`(pdf.js 오류), `pray/[date]/[hour]/page.tsx:36`(URL 세그먼트 에코). 오탈자 규칙(Гүйлтын/Зургадугаар/Илгээлт) 위반 **0건**.

**구조 제안**: (a) 공용 `PhraseStanza` + `ResponseLine` 프리미티브로 4벌 수렴. (b) `layout.tsx` 인라인 스크립트가 이미 `loth-settings` 를 파싱하므로 showPageRefs 등도 `html[data-*]` + CSS 게이트로 → 시프트 제거, 리프가 서버 컴포넌트로 복귀; 토큰은 `src/lib/ui-tokens.ts`. (c) `<SectionHeading level>` 컴포넌트로 13개 복붙 통합 + 헤딩 계층·대비 토큰 한 곳 처리.

### 3.4 PWA·Service Worker·배포·보안 — 전문: scratchpad `pwa/pwa-sw-security-review.md`

**강점**: navigation network-only 3중 고정(`sw.js:735-743`, `sw.test.ts:192-256`, CLAUDE.md) + 프로덕션 HTML `no-store` 실측; API 입력 검증 견고(`date-validation.ts:6-19`, hour allowlist, `/pdf/[page]` 범위); 비밀 위생(`.env*` 없음, `.vercel/`·사고문서 untracked, 히스토리 클린); 보안 헤더 실배포(CSP/XFO/nosniff/Referrer/Permissions + Vercel HSTS); `sw.test.ts:29-77` 가 실제 sw.js 를 vm 로드; PWA 표면 몽골어 일관.

| # | 심각도 | 문제 |
|---|---|---|
| 1 | 치명 | `next@16.2.4` 미패치 (P0-4) |
| 2 | 높음 | `CACHE_VERSION` 83회 bump 중 CLAUDE.md 기준 실제 필요는 3~5회(고정 URL 자산 변경). SSR HTML(캐시 안 함)·`_next/static`(content-hash + immutable) 변경엔 불필요한데 bump 마다 전 사용자 캐시 전면 삭제 → chunk·Noto 폰트 재다운로드. v15 머지 충돌 사례(`sw.js:494-496`) |
| 3 | 중간 | **오프라인 안내 vs 구현 불일치**: SW 는 항상 offline.html 로 떨어져 어떤 기도문도 오프라인 열람 불가인데 `install-app-section.tsx:141` 은 "офлайн хэрэглэх боломжтой". 캐시된 chunk 는 HTML 이 없어 오프라인에서 한 번도 안 쓰임 = static cache-first 분기 가치 0 |
| 4 | 중간 | CSP `script-src 'self' 'unsafe-inline' 'unsafe-eval'`(`vercel.json:29`) → 스크립트 보호 0. `'unsafe-eval'` 은 Next 프로덕션·pdf.js 모두 불필요 → 즉시 제거 가능; `'unsafe-inline'` 은 `layout.tsx:56-74` 때문 → next 업그레이드 후 nonce. `interest-cohort=()` 폐기 토큰 |
| 5 | 중간 | CI 비게이트 + `next build` 부재 + 롤백 문서 0 (P0-5) |
| 6 | 중간 | `sw.js` 55.9 KB 중 코드 1.5 KB(60줄), 주석 702줄(91%), `no-store` 라 매 콜드 로드 전송 (HTML 80 KB 대비 +70%) |
| 7 | 중간·미확인 | manifest 에 192/512 PNG 없음(SVG any + 180 PNG) → Android 설치 프롬프트 미발화 가능 → 30초 뒤 "지원 안 함". 실기기 확인 필요. `id:'/'` 권장 |
| 8 | 낮음 | `/api/*` 무캐시(CDN MISS) + rate limit 없음 + UI 미사용 → `s-maxage=86400, stale-while-revalidate` 또는 제거 |
| 9 | 낮음 | `public/_mockup` 6개 프로덕션 공개(CSP 에 막혀 깨진 채) → docs/ 로 |
| 10 | 낮음 | `x-powered-by` 노출; 보안 헤더는 vercel.json·캐시는 next.config 로 이원화 → Vercel 이탈 시 소실 |
| 11 | 낮음 | `sw.js:760-762` cache.put 예외 미처리·상한 없음; `:711,724` skipWaiting+claim 직후 구 탭 lazy chunk 404 가능(controllerchange 처리 0) |
| 12 | 낮음 | 사고문서 stale + P0/P1 체크 전부 미완(`security-incident…md:29-52`); devDeps 취약 `npm audit fix` |

**SW 전략 실측** (`sw.js:727-769`): navigation → network-only(실패 시 offline.html) / `_next/static` script·style·font → cache-first(만료 없음, HTTP immutable 과 중복) / image(`/icon.svg` 등 고정 URL) → cache-first(**bump 가 진짜 필요한 유일 경로**) / `/api/*`·`/psalter.pdf`·`/pdf.worker.min.mjs`·RSC·cross-origin → SW 미개입.

**구조 제안**: (a) `sw.js` 템플릿 + `prebuild` 에서 `VERCEL_GIT_COMMIT_SHA` 주입, cache-first 를 `/_next/static/` 로 한정(build-id 키), 고정 URL 자산은 stale-while-revalidate → 수동 bump 폐지, 이력 주석은 git log 로. (b) 오프라인 정책 명시 결정: HTML 을 build-id 키 캐시에 network-first(새 배포=새 SW=구 HTML 전량 삭제라 FR-017i 재발 안 함) 또는 오프라인 포기+문구 정정+static 분기 제거(SW≈20줄). (c) next.config 에 보안 헤더·`poweredByHeader:false`·`images.unoptimized` 집약, CSP nonce, CI `next build`+audit+Vercel checks, `docs/ops-rollback.md`.

### 3.5 테스트·CI·문서 프로세스 — 전문: scratchpad `testci/review-test-ci-docs.md`

**강점**: `e2e/fixtures/dates.ts` 전부 고정 날짜, spec/unit 에 `new Date()` 0건, TZ 고정 → 연도 바뀌어도 안 깨짐; selector 규약 실효(role/testid 394 vs getByText 134, 58 파일 중 36 이 텍스트 0); phrase-coverage → CI, hymn-phrase-merge → pre-merge 연결; `traceability-auto.md` 최신·최근 CI 8회 success; 컴포넌트 테스트 29개 대부분 실제 렌더; CLAUDE.md 언급 파일 15개 전부 실존.

| # | 심각도 | 문제 |
|---|---|---|
| 1 | 높음 | 배포 전 게이트 부재 (P0-5) |
| 2 | 높음 | UI e2e 954 케이스 실행 지점 없음 (`ci.yml:51-71` 은 api 만, `Makefile:33` 은 vitest·e2e 둘 다 없음 → worktree 머지가 유닛도 안 돎) |
| 3 | 높음 | FR 번호 3중 네임스페이스: `traceability-matrix.md:8-9` 가 "매트릭스 고유 번호" 선언. FR-011 = PRD/`modules/hour-assembly.md:25` 저녁기도 조립 vs matrix:27 토요일 1st Vespers; FR-032 = `PRD.md:449` 시편마침기도 토글 vs `modules/propers.md:32` vs matrix:59 성모교송. 테스트 태그도 문서마다 다른 뜻으로 섞임 |
| 4 | 중간 | `generate-test-fr-map.mjs:15` `.ts` 만 스캔(.mjs 14 파일·FR-160/161 태그 ~80건 미집계), `:16` 정규식이 `FR-NEW`/`FR-XXX`/`FR-easter-1` 20곳 무시, `:115` substring 단방향 |
| 5 | 중간 | PRD 110 ID 중 73(66%) 태그된 테스트 없음(NFR 전부), coverage 도구 미설치, 직접 테스트 없는 src/lib 7개(`liturgical-colors`, `prayers/catalog`, `hours/date-utils`, `hours/index`, `builders/versicle`, `resolvers/canticle`, `resolvers/reading`) |
| 6 | 중간 | `playwright.config.ts` reporter 미설정 → CI 기본 `dot` → `playwright-report/` 미생성 → `ci.yml:73-79` 아티팩트 업로드 항상 빈 결과; `forbidOnly` 없음 |
| 7 | 중간 | 사문화 spec 이 "통과" 로 집계: `liturgical-calendar-list.spec.ts` 전체 skip(SUPERSEDED), `homepage.spec.ts` 3 skip, `feast-selection.spec.ts` 2 fixme, `psalm110-phrase-render.spec.ts:33-38` 홈이 캘린더라 100% skip |
| 8 | 중간 | 스냅샷이 assertion 아님: `calendar-list-month.spec.ts:273` `page.screenshot({path})`, `toHaveScreenshot` 0건, PNG 8개 git 추적 → 매 실행 덮어쓰기 |
| 9 | 중간 | `global-font-family.test.ts:36-40` vitest 안 `chromium.launch` → quality job 에 `playwright install` 강제; `font-family-unification.spec.ts` 와 중복 |
| 10 | 낮음 | 하드코딩 sleep(`pdf-viewer-theme.spec.ts:55,59`, `page-references.spec.ts:443,452`); e2e 가 src/data JSON 직접 읽음 4곳; CI lint 는 bare `eslint`(docs/research 까지) vs Makefile scoped; `tsconfig.json:31` `.next/dev/types` 포함 → stale `.next` 거짓 실패; `cancel-in-progress` 로 중간 커밋 CI 판정 없음 |
| 11 | 낮음 | 테스트 디렉터리 이원화(`src/lib/__tests__/hours/` vs `src/lib/hours/__tests__/`), GOAL 번호 명명 17개, e2e 헬퍼 중복(`findPsalmody`×3), `e2e/helpers` 없음 |
| 12 | 낮음 | 문서 정합: `PRD.md:172` "HourSection 15가지" 인데 14; `traceability-matrix.md:4` "최종 2026-04-19" 인데 마지막 커밋 08-06; `docs/modules` 4~5개월 정체; PRD 6월 이후 4 커밋 vs src 130 |
| 13 | 낮음 | `e2e/mobile.spec.ts:83,96` 이 영어 `aria-label*="Psalm"` 에 결합 — 몽골어화 시 조용히 skip — ✅ 2026-09-14 `data-role="psalm-block"` 로 이관 + 0건 skip → 실패로 강화. 같은 결합 20곳(`section[aria-label="Psalm …"]`)은 `[data-role="psalm-block"][data-ref="Psalm …"]` 로, `prayer-compline.spec.ts` 의 사문화 `h4.text-sm…` 셀렉터도 `data-ref` 로 |

**docs/ 분류**: 루트 98 파일 중 68(69%) 이 완료된 handoff(25)/review(36)/audit(7) 로그. README 없음, `research/` 135 파일. 신규 기여자 진입 경로는 CLAUDE.md → PRD.md 만 암묵.

**구조 제안**: (a) CI 를 3단(quality → build+핵심 e2e 5개 → nightly 전체 e2e) 으로, main 보호 + Vercel required checks, Makefile `check-all-lints` 에 vitest 추가. (b) FR 번호를 PRD 로 단일화 + 트레이서빌리티 스크립트에 .mjs 스캔·비정형 태그 fail·역방향 검사. (c) `docs/archive/2026-Q2/` 로 완료 로그 68개 이동 + `README.md`(진입 경로·검증 명령·배포 절차) 신설.

---

## 4. 강점 요약 (유지할 것)

1. **타임존 설계** — "오늘" 은 서버에서 Asia/Ulaanbaatar 로만 계산, 클라이언트 날짜 로직 0. 테스트도 고정 날짜.
2. **SW navigation 계약** — 코드·단위테스트·CLAUDE.md 3중 고정, 프로덕션 실측 일치.
3. **입력 검증** — date/hour/page/celebration 전부 allowlist·round-trip. API 400 정확.
4. **데이터 큐레이션 규율** — 증거 등급 ledger, 삼중 증거 페이지 앵커, 추측 교정 금지가 코드 헤더까지 반영.
5. **테스트 양** — vitest 1,851 + e2e 976 케이스, 스크립트 테스트 472. 통과율 100%.
6. **몽골어 UI 일관성** — 오탈자 규칙 0건, manifest/offline/설치 안내까지 몽골어.
7. **성능** — warm `assembleHour` 0.5 ms, 캘린더 366일 8 ms, 아침기도 HTML 148 KB / 전송 156 KB, 콘솔 에러 0.

---

## 5. 로드맵 제안

| 기간 | 항목 |
|---|---|
| **이번 주** | P0-1~3 전례 버그 (calendar.ts 한 층, ≈1일 + 회귀 테스트) · P0-4 next 업그레이드 · P0-5 브랜치 보호+CI build · P0-6 rubric-coverage GREEN + plain 4건 동기화 |
| **2주 내** | 시편 헤더 영문 ref 라벨 몽골어화 결정 (NFR-002) · 토요일 저녁 헤더 시편주간 라벨 규칙 확정 · `settings.tsx:137` try/catch (H1) · CSP `'unsafe-eval'` 제거 · `verify:all` + CI SoT 프로비저닝 · plain↔rich 동등성 verifier · Playwright reporter/forbidOnly · 사문화 spec 정리 · 오프라인 안내 문구 결정 |
| **1개월** | 무음 fallback 정책 통일 + `loadJson(schema)` · `assembleHour` 분해 · listbox/radiogroup a11y (H3/M7) · 헤딩 계층 (M2) · 대비 토큰 (H4) · prayer-footer 탭 동작 재설계 (H2) · FR 번호 단일화 · docs 아카이브 + README |
| **분기** | `sw.js` 빌드 ID 템플릿화 + bump 폐지 · 오프라인 정책 구현(택1) · 렌더 프리미티브 수렴 (M6) · scripts archive + 리포 대용량 정리 + `git gc` · pdfjs-dist 6.x 검토 |

---

## 6. 미확인 (실기기·대시보드 확인 필요)

- Vercel 대시보드: MFA / Deployment Protection / Require checks / env Sensitive 설정
- `public/psalter.pdf` 저작권·배포 허가 표기
- SVG-only manifest 아이콘의 Android 설치 프롬프트 발화 여부
- 프로덕션에서 `/psalter.pdf` Range 부분 로드 여부 (로컬은 4.5 MB 전체 전송)
- PrayerRenderer 가 'use client' 라 AssembledHour 전체가 RSC 페이로드로 직렬화 — 실기기 3G 에서 체감
- pdf-viewer 언마운트 시 `pdfPage.cleanup()` 미호출 — 실기기 메모리
- 연중 외 시즌(부활 8일·성탄 8일) 에서 weekOfSeason 카운터가 데이터 키와 맞는지 (본 리뷰는 연중·성삼일만 실측)

---

## 7. 추가 발견 (2026-09-14, P0 수정 검증 중) — UI e2e 스위트 기존 실패 101건

P0 전례 버그 수정 브랜치를 검증하며 **UI e2e 전체(976 케이스)를 main 과 브랜치 양쪽에서 실행**했다. 브랜치 고유 실패는 `pdf-fidelity-pilot.spec.ts:17` 2건(chromium/mobile — 옛 주차 가정, 후속 커밋으로 수정)뿐이고, **나머지 101건은 main 에서도 동일하게 실패**한다. 프로덕션 서버(`next build && next start`) 와 설정대로의 `next dev` 양쪽에서 1:1 동일 (dev 전용 실패 2건은 `mobile.spec.ts:64` flaky, 재실행 6/6 통과).

§3.5 의 "UI e2e 954 케이스 실행 지점 없음" 이 실제로 초래한 결과다. CI 는 녹색이지만 스위트의 약 10% 가 사문화돼 있고, 그 안에 실제 동작 변경(잠재 회귀) 도 섞여 있다.

| spec (실패 수) | 원인 분류 | 근거 |
|---|---|---|
| `liturgical-calendar` (28) | UI 변경 미반영 | 홈이 월 캘린더 리스트로 재설계(FR-145, 2026-05-14) 되어 `.border-liturgical-*`, `h1.text-liturgical-*` 등 셀렉터 대상 0건 |
| `prayer-rich-overlay-fallback` (12), `prayer-short-reading` (8) | UI 구조 변경 | shortReading 이 `<p data-render-mode="flow">` 로 직접 렌더, `div.space-y-2` 래퍼 없음 |
| `date-navigation` (10) | 사문화 | "Өмнөх өдөр / Дараа өдөр" 링크가 src 에 0건 (월 네비게이션만 존재) |
| `first-vespers` (10) | API 형상 변경 + 동작 변경 | psalm 본문이 `stanzas/stanzasRich` 로 이동해 `verses` 항상 `[]`; 2026-02-07 시편 세트가 책 4주 토요일(122/130/필리) 로 바뀜(#177); 2025-11-29 토요 vespers 의 `liturgicalDay.season` 이 ADVENT 로 재라벨되지 않음 |
| `error-handling` (6) | 사문화 3 + `notFound()` 스트리밍 200 3 | 홈은 잘못된 date 를 무시; `/pray/*/firstVespers` 비적격이 200 (§2 HTTP 스모크와 동일 원인) |
| `movable-first-vespers` (6), `solemnity-first-vespers` (4) | 사문화 + **잠재 회귀** | ref 가 versed 형식(`Psalm 113:1-9`)이라 exact 비교 실패; **전야 `vespers` 가 시편은 대축일 제1저녁기도 것을 쓰면서 본기도/후렴은 당일 것을 반환** (12-24, 승천 전야 05-13, 삼위일체 전야 05-30). 기대 문자열은 데이터에 여전히 존재 → 별도 조사 필요 |
| `settings` (4) | 사문화 | NFR-002 로 글꼴 라디오 라벨이 `Орчин үеийн`/`Сонгодог` 로 교체됨 |
| `conditional-rubric-all-souls` (2), `mary-mother-of-god-vespers2` (2) | UI 구조 변경 | 조건부 루브릭 directive 가 `psalmody-section` 밖(article 상단) 에 렌더 |
| `conditional-rubric-sanctoral` (2) | 데이터 증가 | 인벤토리 상수 22 → 실제 49 |
| `feast-selection` (2) | 동작 변경 | 홈 캘린더 행의 picker 가 URL 대신 React state 만 갱신(FR-145) |
| `special-days` (2) | 단언 가정 오류 | 연중 주일 firstVespers/lauds/vespers 본기도가 책 기준 동일 텍스트 |
| `prayer-lauds` (2) | 데이터 행 재분할 | 시편 100 첫 행이 두 행으로 분리되어 단일 행 정규식 불일치 |
| `mobile` (1) | UI 변경 | stanza 가 `p[data-role="psalm-stanza"]`, `p.font-reading` 셀렉터가 다른 요소에 걸림 |

**권장**: (1) 사문화 셀렉터·상수·라벨 건은 현재 UI 기준으로 일괄 갱신(대부분 기계적), (2) `first-vespers`/`movable-first-vespers`/`solemnity-first-vespers` 의 "전야 본기도·후렴이 당일 것" 은 별도 버그 조사 후 테스트 복원, (3) 갱신이 끝나면 §3.5 제안대로 핵심 spec 을 CI 에 승격하고 나머지는 nightly 로 — 그래야 이 표가 다시 자라지 않는다.

로그: 세션 scratchpad `verify/e2e.log`(브랜치), `verify/e2e-main-parity.log`(main, prod), `e2edev/e2e-dev.log`(main, dev), `e2edev/compare.txt`.

---

## 8. P1 진행 (2026-09-14) 및 잠재 회귀 격리 4건

P1 세 건 완료 (`0dd0018` settings localStorage 보호 / `42b8dfc` 시편·찬가 헤더 참조 몽골어 표기 / `af8a3ef`~`2c7221c` UI e2e 101건 정리). e2e 는 934 passed / 0 failed / 42 skipped. §7 의 101건 중 93건은 테스트 측 갱신으로 GREEN, **8건(4 테스트 × 2 프로젝트)은 앱 동작이 의심되어 `test.fixme` 로 격리**했다. §7 표의 "전야 본기도가 당일 것" 분류는 부정확했고, 실제로는 **같은 대축일 블록의 `alternativeConcludingPrayer` 가 primary 로 swap** 된 것이다.

| 테스트 | 증상 | 재현 | 판단 |
|---|---|---|---|
| `first-vespers.spec.ts:239` (2025-11-29 토 `/vespers`) | 연중 34주 → 대림 1주 경계 토요일 저녁이 대림 제1저녁기도로 승격되지 않음 (season ORDINARY_TIME, 시편 141/142/필리 에 psalter 기본 후렴) | `/api/loth/2025-11-30/firstVespers` 는 정상(ADVENT + advent 후렴), `/api/loth/2025-11-29/vespers` 만 실패 | **조사 필요**. `5cc8a80` 이 2026-11-28 은 고쳤으나 2025-11-29 는 다른 경로(`liturgicalDay.season` 재라벨)일 가능성 |
| `movable-first-vespers.spec.ts:46` (2026-05-13 수, 승천 전야) | concludingPrayer 가 `alternativeConcludingPrayer` | 정식 `/api/loth/2026-05-14/firstVespers` 도 동일 | F-2(#214) `shouldUseAlternateConcludingPrayer`(SOLEMNITY && dayOfWeek≠SUN, 책 p.516 rubric) 의 **의도된 swap 일 가능성 높음** — 테스트가 F-2 이전 작성. 확인 후 단언을 `text ∪ alternateText` 로 |
| `movable-first-vespers.spec.ts:82` (2026-05-30 토, 삼위일체 전야) | 대축일이 **주일**인데 swap 발화 | 정식 `/api/loth/2026-05-31/firstVespers` 는 primary, 전야 `/api/loth/2026-05-30/vespers` 만 alternative | **조사 필요**. `vespers.ts:85` 가 `ctx.dayOfWeek`(=SAT) 로 판정해 승격된 SUN 을 미반영 의심 |
| `solemnity-first-vespers.spec.ts:62` (2026-12-24 목, 성탄 전야) | concludingPrayer 가 alternative + `alternateTextRich` 에 대림 1주 목요일 vespers rich(page 571) 혼입 | 정식 경로도 alternative(F-2 의도 가능) | swap 은 #46 과 같은 판단. **`alternateTextRich` 혼입은 별도 버그** — rich overlay 키가 전야 날짜의 시즌 propers 로 조회되는 것으로 보임 |

관련 pre-existing: `notFound()` 가 `loading.tsx` 스트리밍 뒤라 잘못된 날짜/시간경 URL 이 HTTP 200 (§2). `error-handling.spec.ts` 는 본문 단언으로 전환했고 상태코드 문제는 별도 과제.

### 8.1 격리 4건 결과 (2026-09-14) → `docs/bug-reports/2026-09-14-eve-vespers-alternate-and-rich.md`

| 건 | 판정 | 근거 | 조치 |
|---|---|---|---|
| 건 2 승천 전야 05-13 · 성탄 전야 12-24 alternative | **의도된 동작** | 책 p.516 (`full_pdf.txt` L17864 "Эсвэл: Ням гарагт үл тохиох Их баярын өдөр") — 목·금요일 대축일은 대체 본기도가 기본; `/firstVespers` 라우트와 동일 | 코드 무수정. e2e 기대값을 alternate 로 갱신 + primary 가 `alternateText` 인지·라우트 일치·rich page 일치 단언, fixme 해제 (`3c22b21`) |
| 건 3 삼위일체 전야 05-30 swap | **버그** | `vespers.ts:85` 가 rank 는 승격된 내일, 요일은 전야 `ctx.dayOfWeek`(SAT). romcal 이 모든 주일을 SOLEMNITY 로 내므로 **매 토요일 저녁**(46/년) 이 대체본 — `/firstVespers` 라우트와 불일치 (#242 `1f4ccb7` 이후) | `resolveConcludingPrayerSwap(ctx)` 한 곳에서 rank+요일을 `effectiveLiturgicalDay.date` 기준으로, lauds/vespers/compline 공유 (`88ed2d3`). 회귀 없음: 05-13·12-24·08-14/08-15(토요일 대축일)·부활 8일 불변 |
| 건 4 성탄 전야 `alternateTextRich` 대림 1주 목 p.571 | **버그** (같은 클래스가 대축일 당일 lauds/vespers·성삼일 응송·대축일 제2저녁기도에도) | Layer 4 rich 가 오늘의 (시즌/주차/요일) 로만 조회, plain 의 layer 를 보지 않음. main 에서 concludingPrayer rich page ≠ plain page 26건 (모든 성인 11-01 lauds 가 연중 31주일 본기도 rich p.811, 승천 05-14 제2저녁기도 text '' 등) | 전야 분기 rich identity = 내일 + `applyRichSourceParity`(rich 는 생성된 cell 의 plain 과 글자 단위로 같을 때만) + dec17~24 rich tier (`2601f59`). 수정 후 26 → 0 |
| 건 1 2025-11-29 대림 미승격 | **반 버그 / 반 제품 결정** | 2026-11-28 과 동일 동작(연도 차 아님). propers 는 `5cc8a80` 로 대림; 시편 후렴 시즌 변형만 토요일 `day.season`(OT) 로 골라 미적용. `liturgicalDay` 는 현행 계약(civil identity 유지) | 시편 해석 season = `effectiveLiturgicalDay.season` (`5b7de1d`). 후렴·본기도·Magnificat 단언은 fixme 해제, `liturgicalDay` 재라벨 기대는 별도 테스트로 분리해 fixme 유지 |

**후속 `17014b2` (코디네이터 승인)**: 위 rich parity 만 적용하면 사순·대림·부활 주일 `/firstVespers` 16건에서 독서·응송·청원이 화면상 시즌본(rich) → 시편집 발췌(plain) 로 바뀌는 퇴행이라, `mergeSundayFirstVespers` 로 플레인 주일 제1저녁기도(라우트 Path 3 + 토요일 전야) 의 독서·응송·청원·본기도를 **시즌 `SUN.vespers` 고유부 우선** 으로 병합 (책 시즌 섹션 대림 p548-550 / 사순 p618-620 / 종려 p651-653 / 부활 p700-702 가 주일 EP I 고유부를 인쇄; Phase-2 firstVespers cell 은 시편집 블록 p55/171/292/402 발췌). 화면은 종전과 같고 API/전야 plain 이 화면과 일치. 연중·성탄 시즌은 무영향.

main 대비 2026 전 일자 출력 sweep(최종): 바뀐 셀 93 = 토요일 swap 해제 46 · 전야 rich 소스 정정 4 · 타 cell rich 제거 21(+성삼일 5, 12-24 lauds dec24 tier 1) · 사순/대림/부활 주일 EP I 독서·응송·청원·본기도 시즌 고유부 우선 16 `/firstVespers` + 16 전야(plain 시즌본, **rich 유지·page 일치**) · 시편 후렴 대림 변형 1. 범주 밖 없음 (2027 89건 동일 패턴). 게이트: vitest 120/1,969 · tsc · lint · traceability · verify:all 14 PASS · e2e 5 spec 72 passed/2 skipped(제품 결정 fixme) + 관련 19 spec 188 passed. `sw.js` 는 SSR/API 응답만 바뀌어 bump 대상 아님.

**제품 결정 필요** (리포트 §6): ① 전야 응답 `liturgicalDay` 재라벨 여부 — 권장 유지 + `effectiveLiturgicalDay` API 노출; ③ `-vespers2.rich.json` 읽기 convention; ④ 12-25 sanctoral ↔ christmas.json Magnificat 후렴 한 글자 드리프트(`өргөөнөөсөө`/`өргөнөөсөө`). (② 주일 EP I 시즌 우선 병합은 위 후속으로 해결.)

**제품 결정 반영 (2026-09-14, 리포트 §6)**: ① 유지 + `AssembledHour.effectiveLiturgicalDay?` 노출(승격일만, `86ff381`; 2026 sweep 62건 필드 추가, 본문 차이 0; e2e fixme 해제) · ③ `SeasonalRichHourKey`/`seasonalHour` 규약으로 `-vespers2.rich.json` 읽기(`713dfb6`; 12-25·05-24 제2저녁기도 shortReadingRich 복원 2건, 그 외 차이 0) · ④ 인쇄면 p.587 = `өргөөнөөсөө` → `christmas.json` 한 단어 fidelity 복원(`83dfe6b`, GOAL #128 §3b B3; PDF 가 옳아 ledger 비기록). 게이트: vitest 120/1,982 · tsc · lint · traceability · verify:all 14 PASS · e2e 4 spec 70 passed/0 skipped + 관련 4 spec 33 passed.

---

## 9. 주일 제2저녁기도 · 주님 공현 · 성가정 제1저녁기도 (2026-09-16, GOAL #268)

§8 후속 조사(`docs/research/2026-09-16-sunday-vespers2.md`) 에서 드러난 3건. 전부 **버그** 로 판정돼 수정했다 — 제품 결정 불요. 상세·근거·미수정 항목은 `docs/bug-reports/2026-09-16-sunday-vespers2-epiphany.md`.

| # | 증상 | 판정 | 근거 | 조치 |
|---|---|---|---|---|
| 9-1 | 주일 당일 `/vespers` 가 **제1저녁기도** 후렴을 렌더 (대림·사순·부활은 독서·응송·청원까지 EP I). 2026년 41회 | **버그** | 인쇄면 p.759-760·797-798 등: 책은 모든 주일을 `1 дүгээр Оройн…`(EP I) / `Өглөөний…` / `2 дугаар Оройн…`(EP II) 3단으로 인쇄하고 가/나/다해 표기는 책 전체 0건. 데이터도 `SUN.vespers`=EP I, `SUN.vespers2`=EP II | **FR-171** — 주일(및 FEAST 특수키 당일) `/vespers` 에 `{...vespers, ...vespers2}` 오버레이(연중 대체 본기도 보존), `getSeasonVespers2` 에 week-1 템플릿 폴백. 토요일 저녁·`/firstVespers` 불변 |
| 9-2 | **주님 공현 대축일**의 아침·저녁·제1저녁기도 복음찬가 후렴·본기도가 **빈 문자열** (2026-01-04, 2027-01-03 …) | **버그(P0)** | romcal 이 `name="Epiphany"`/`key="epiphany"` 를 내는데 `resolveSpecialKey` 는 `'epiphany of the lord'`·`'the epiphany'` 부분일치만 검사 → 항상 실패. 추가로 `christmas.json` 의 `epiphany`↔`epiphanyWeek` 셀이 전도(p.607-610 공현 ↔ p.611-615 공현 후 평일) | **FR-172** — `romcalKey` 우선 매칭(+정확 일치 `'epiphany'` 폴백, "after Epiphany" 는 계속 null), 토→주일 분기에 **주일의** name/romcalKey 전달, 두 버킷 셀 교환 + 공현 EP I 후렴(p.609) 복원 |
| 9-3 | `/pray/2026-12-26/vespers` 등 legacy 전야 URL 이 카드(다음날 `firstVespers`) 와 불일치 — 성탄 8일 평일 저녁을 렌더 | **버그(경미, legacy URL 한정)** | 순위표 II.5(주님의 축일) > II.7 > II.9 + 보편규범 61항, 책 p.599 적색 규정. FR-156 Path 2 가 `SOLEMNITY` 로 게이트돼 FEAST 특수키 배제 | **FR-173** — Path 2b(FEAST + 내일 주일 + 특수키 + 오늘 ≠ SOLEMNITY)를 `mergeSundayFirstVespers` 로 합성해 `/firstVespers` 라우트와 byte 일치. 성탄이 주일인 해(성가정 12-30 금)는 "내일이 주일" 게이트가 p.599 규정을 그대로 재현 |

데이터 교정 8건(전부 인쇄면 크롭 판독): 연중 12·15·25주 `vespers2` 추가(p.774/780/800) · 16주 `vespers2` 교체(p.780→p.782) · 페이지값 3건(6주 647→761, 20주 751→790, 34주 816→818) · 공현 버킷 정정 2건. 뒤 두 건은 `verify-propers-pages.js` 가 이미 `manual-review` 로 플래그하고 있던 것(review 16→14, `verified-correction` 0 유지).

main↔브랜치 전일자 지문 스윕: 2026+2027 2,920키 중 **98건** (주일 EP II 85 · 공현 8 · 성가정/세례 전야 3 · 페이지 교정 2), 경계 연도 2028·2029·2033·2034·2039 7,304키 중 **256건** (같은 4범주 + FEAST 특수키 당일 EP II 4). **범주 밖 0** — 평일·토요일 `/vespers`·`/firstVespers` 불변, 성탄이 주일인 해의 성가정 전야(2033·2039-12-29)·토요일 성탄(2027-12-25)·주일 12-24(2028)·모든 성인·그리스도왕·부활 주일·성령강림 전부 불변.

게이트: vitest 121 files / 2,019 passed / 4 todo · tsc · lint(0 errors) · traceability · verify:all 14 PASS · verify:psalter-parity · verify-propers-pages(agree 767→775, verified-correction 0) · e2e 7 spec 51 passed / 0 failed. `sw.js` 는 SSR/API 응답만 바뀌어 bump 대상 아님.

남긴 것: 2028-01-01(천주의 성모 토요일) → 공현 제1저녁기도 미승격(데이터 설계 필요) · 2027-12-25 카드 목록이 성탄 저녁기도 카드를 제거하는 **기존** 카드 규칙 갭 · 공현 EP II 의 p.610 대체 본기도 미표시(GOAL #20 통째 교체 의미 유지) · 대림/사순/부활 EP II 청원 rich 미authored · `epiphanyWeek` 날짜 범위 매칭 미구현(도달 불가 키).
