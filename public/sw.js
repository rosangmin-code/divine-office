// v50 — GOAL #210: hymn page-break stanza-drift correction deploy prep. 본
// bump 는 `scripts/fix-hymn-pagebreak-stanza-drift.mjs` 의 20개 hymn 대상
// 병합과 `src/data/loth/prayers/hymns/*.rich.json` + `src/data/loth/
// ordinarium/hymns.json` 본문/phrase 재생성으로 영향 받는 시간경의 SSR HTML
// 출력이 바뀌는 것을 반영한다. stale-cache 클라이언트가 cache-first 구 chunk
// 로 구 본문을 계속 받는 회귀 방지를 위해 v49 → v50. SW 로직 변경 없음 —
// navigation 은 `network-only` 유지, caches.put(html) 미도입. 자산 경로/
// PRECACHE 대상(offline.html·icon.svg) 무변경.
// v49 — GOAL #193: psalter body DATA correction deploy prep. 본 bump 는
// `src/data/loth/psalter-texts.json` + `src/data/loth/prayers/commons/
// psalter-texts.rich.json` 의 본문 데이터 교정(27개 page-break stanza 병합 +
// Psalm 111/139 누락 본문 줄 복원)으로 영향 받는 시간경의 SSR HTML 출력이
// 바뀌는 것을 반영한다. stale-cache 클라이언트가 cache-first 구 chunk 로
// 구 본문을 계속 받는 회귀 방지를 위해 v48 → v49. SW 로직 변경 없음 —
// navigation 은 `network-only` 유지, caches.put(html) 미도입. 자산 경로/
// PRECACHE 대상(offline.html·icon.svg) 무변경.
// v48 — GOAL #172: psalter/hymn body data correction deploy prep. 본 bump 는
// `src/data/loth/psalter-texts.json` + `src/data/loth/prayers/commons/
// psalter-texts.rich.json` 의 본문 데이터 교정으로 영향 받는 시간경/날짜의
// SSR HTML 출력이 바뀌는 것을 반영한다. stale-cache 클라이언트가
// cache-first 구 chunk 로 구 본문을 계속 받는 회귀 방지를 위해 v47 → v48.
// SW 로직 변경 없음 — navigation 은 `network-only` 유지, caches.put(html)
// 미도입. 자산 경로/PRECACHE 대상(offline.html·icon.svg) 무변경.
// v43 — 테마 토글 storage-blocked 수정 (GOAL #69) + PDF 페이지 까맣게 근본수정
// (GOAL #80): (1) settings.tsx updateSettings 가 localStorage 쓰기 차단(iOS
// 사파리 프라이빗/인앱 WebView) 환경에서 무음 no-op 이던 것을 in-memory
// fallback + dispatchEvent 를 try 밖에서 항상 발생하도록 수정 → 저장소 막힌
// 환경에서도 야간/낮 모드 토글 작동. (2) pdf-viewer.tsx 페이지 표면을 테마독립
// 종이배경으로 + 고dpr 캔버스를 MAX_CANVAS_DIM(4096)/area(16.7M) 로 clamp →
// 다크모드 로딩/에러/넘김/고dpr 에서 PDF 페이지가 검정으로 비치던 회귀 제거.
// bump 사유: 두 컴포넌트(settings.tsx·pdf-viewer.tsx) chunk 내용 변경 →
// stale-cache 클라이언트가 cache-first 구 chunk 로 구 동작(토글 먹통·PDF 검정)을
// 계속 받는 회귀 방지(프로젝트 v37~v42 conservative 컨벤션 + 적대/peer 리뷰
// 합의). SW 자체 로직 변경 없음 — navigation `network-only` 유지, caches.put(html)
// 미도입. 자산 경로/PRECACHE 대상(offline.html·icon.svg) 무변경. v42 → v43.
//
// v42 — 디자인 dogfooding 수정 cohort (GOAL #2/#3): (1) 섹션 제목(Магтуу 등)
// faint stone-500 → 전례 빨강 `--color-liturgical-red`(#c1121f/다크 #ef4444)
// 통일 (14개 컴포넌트, DESIGN.md §Section title SSOT). (2) psalmPrayer 설정
// 토글 극성 정정 — '숨기기'(ON=숨김) 역방향 → '보이기'(ON=보임) 양수,
// showPageRefs 와 일관 (settings/page.tsx) + psalm-block 게이트 하드닝.
// bump 사유: 컴포넌트 chunk 내용 변경 → stale-cache 클라이언트가 cache-first
// 구 chunk 로 구 색/구 극성을 계속 받는 회귀 방지(프로젝트 v37~v41 conservative
// 컨벤션 + 적대/peer 리뷰 합의). SW 자체 로직 변경 없음 — navigation
// `network-only` 유지, caches.put(html) 미도입. 자산 경로/PRECACHE 대상
// (offline.html·icon.svg) 무변경. v41 → v42.
//
// v41 — GOAL #54 (#54-sub-2): PWA chrome/아이콘/오프라인 페이지 재스킨. 본
// bump 가 묶는 변경:
//   - `public/icon.svg` 앱 아이콘 아트워크 recolor (사용자 승인본 그대로):
//     espresso 바탕(#2b1f14)/brass(#a8893c·#c9a961 일부)/violet 리본(#7b2d8b)
//     → 따뜻한 다크 바탕 #211711 + 책(#3a2c1e/#54422d) + 골드 통일
//     (#9a7b2e·#c9a961). 형태(책/십자/렉턴/코너 다이아) 유지, 색상만 교체.
//     ※ 아이콘 아트워크 배경(#211711 다크) ≠ manifest theme_color(#faf9f5 크림).
//   - `public/apple-icon.png` 새 icon.svg(다크 #211711) 기준 180×180 재렌더.
//   - `public/offline.html` 오프라인 폴백 페이지 recolor — theme-color+body
//     bg #f4ecd8(양피지) → #faf9f5(크림), 본문 → ink #141413, 버튼/포커스
//     brass·espresso → 골드 #9a7b2e, 장식 ✝ 글리프 + .icon 박스 제거(#68
//     선례, DESIGN.md 장식글리프 금지). dark-mode bg #1a1510 유지.
//   - `src/app/manifest.ts` theme_color·background_color #f4ecd8(양피지) →
//     #faf9f5(크림 캔버스), `src/app/layout.tsx` viewport.themeColor light
//     동기화 (dark #1a1510 유지).
// CACHE_VERSION bump 사유 (strict criteria): `/icon.svg` 와 `/offline.html`
// 둘 다 PRECACHE_URLS(`['/offline.html', '/icon.svg']`) 의 프리캐시 대상 —
// 두 자산 "내용" 이 변했으므로 정확한 bump 트리거(프리캐시 대상 내용 변경)에
// 해당. v40 잔존 시 install 단계의 cache.addAll 이 구 espresso/brass 아이콘 +
// 양피지 오프라인 페이지를 cache-first 로 무한 서빙 → 재스킨이 기존 사용자
// 에게 안 보임. SW 자체 로직 변경 없음 — navigation 은 `network-only` 유지,
// caches.put(html) 미도입. manifest theme_color 는 자산경로 무변경(라우트/
// Content-Type 불변)이라 단독으로는 bump 불요지만, icon.svg/offline.html
// 내용 변경이 bump 를 강제하므로 함께 v40 → v41.
// v40 — GOAL #24 (FR-164): 기도문 화면 PrayerFooter — 하단 strip 탭 →
// 전례력/설정 메뉴 슬라이드. 본 bump 가 묶는 변경:
//   - 신규 client 컴포넌트 `src/components/prayer-footer.tsx` (#29 WI-A
//     컴포넌트 구조 + #30 WI-B 인터랙션 로직 — controlled/uncontrolled
//     hybrid + slide-up animation + Esc/outside-tap dismiss + focus
//     management + always-mounted panel + motion-reduce)
//   - `src/app/pray/[date]/[hour]/page.tsx` PrayerFooter 통합 + 상단
//     SettingsLink 제거 + 본문 pb-16 (#31 WI-C)
//   - `src/app/pray/[date]/[hour]/loading.tsx` skeleton 갱신 — settings-
//     icon skeleton 제거 + 신규 PrayerFooter strip skeleton (실제 컴포넌트
//     와 동일 32px geometry, layout shift 회피) (#31 WI-C)
// SW 자체 로직 변경 없음 — navigation 은 `network-only` 유지. ?date= /
// /settings 등 기존 URL 패턴 그대로 — 신규 라우트 / Content-Type / 자산
// 경로 변경 0. 그러나 위 변경이 정적 자산 (script chunks: prayer-footer
// 신규 + page.tsx + loading.tsx) 의 강제 재정렬을 요구하므로 v39 → v40
// conservative bump 채택 (v19 GOAL #4 bump 와 동일 패턴 — 신규 컴포넌트
// + page 통합 시 script chunk hash 변동). v39 잔존 시 구 prayer page
// chunk (상단 SettingsLink 잔존 + PrayerFooter 부재) cache-first 무한
// 서빙 → 사용자 깨진 UX (⚙ 두 곳 + footer strip 부재). PRECACHE_URLS =
// ['/offline.html', '/icon.svg'] 변동 없음.
// FR-164 ↔ FR-162 supersede relation 없음 — FR-162 (home Footer credit
// chevron) 는 PrayerFooter 와 별개 컴포넌트로 prayer page 에 공존 (D4=b).
// v39 — GOAL #4 (FR-163): 첫 화면 calendar list 가 'today-centric infinite
// scroll' 에서 'month-mode (한 달씩 끊어 보기 + MonthNav)' 로 전환.
// 본 bump 가 묶는 변경:
//   - 신규 client 컴포넌트 `src/components/month-nav.tsx` (#15 / wi-003)
//   - `src/components/liturgical-calendar-list.tsx` infinite scroll
//     메커니즘 (IntersectionObserver + loadOlder/loadNewer + hasScrolled +
//     exhausted*/loading* state + sentinels) 제거 (#17 / wi-005, net -155
//     production LOC)
//   - `src/app/page.tsx` 의 ?month=YYYY-MM 라우팅 도입 + ±60일 윈도우
//     제거 + getCalendarMonth 어댑터 호출 (#14 / wi-002)
//   - `src/app/page.tsx` header 의 SettingsLink 제거 + MonthNav wiring
//     (#16 / wi-004)
// SW 자체 로직 변경 없음 — navigation 은 `network-only` 유지. 그러나
// 위 변경이 정적 자산 (script chunks: page / liturgical-calendar-list /
// month-nav + 신규 client manifest) 의 강제 재정렬을 요구하므로 v38 →
// v39 conservative bump 채택. v38 잔존 시 구 LiturgicalCalendarList chunk
// (infinite scroll 잔존) 가 cache-first 로 무한 서빙되어 month-mode 페
// 이지가 정상 동작 안 함 — 사용자에게 깨진 링크 / 잘못된 anchor 노출
// 가능. PRECACHE_URLS = ['/offline.html', '/icon.svg'] 는 변동 없음.
// FR-163 ↔ FR-145 (이전 today-centric infinite scroll 정의) 의 supersede
// relation: FR-145 는 'iter 1 결정' 으로 보존되고 FR-163 가 'iter 2
// 결정 (GOAL #4 의 5가지 통합 요구)' 으로 갱신. ?month=YYYY-MM URL 신규
// cache 처리: navigation request 라 network-only handler 가 자동 처리
// (`request.mode === 'navigate'` 분기), 별도 path 매칭 추가 불요. sw.test.ts
// 회귀 가드: ?month= URL 도 network-only path 로 흐르고 cache.put 미호출
// 되는 regression case 추가됨.
// v38 — WI #41: gospel-canticle 헤딩 빨강 복원 (#25/#30 매핑 오류 revert).
// 사용자 directive (2026-05-16): '되돌리기 진행해' → `gospel-canticle-
// section.tsx` L233-238 헤딩 className 의 색상 클래스 `text-stone-800
// dark:text-stone-200` 를 `text-red-700 dark:text-red-400` 로 복원.
// 배경 — WI #25/#30 은 사용자의 'magtuu/막토' 보고를 gospel-canticle
// (Benedictus / Magnificat / Nunc Dimittis) 으로 잘못 매핑해 헤딩을
// 까망 처리했음. 사용자 진짜 의도는 hymn (Магтуу) 영역으로 WI #39 에서
// 별도 해결됨. gospel-canticle 헤딩 까망은 다른 prayer-section 헤딩
// 빨강 컨벤션 + PDF rubric 컨벤션과 비대칭이라 revert 가 정합.
// `data-role="canticle-heading"` 색상-독립 anchor 는 WI #30 도입 그대로
// 보존 (e2e selector 안정성 + ordering test #29 anchor). HTML byte 출력
// (헤딩 span className) 이 변하므로 v37 precache snapshot 과 어긋날 수
// 있어 conservative bump. v37 잔존 시 3 hour (lauds/vespers/compline)
// 헤딩이 까망 그대로 노출되어 의도된 빨강 복원이 안 보임.
// v37 — WI #39: hymn (Магтуу) section 빨간 글씨 19건 까망 처리.
// 사용자 directive (2026-05-16): '다른 거 필요 없어. 19건 해결해.' →
// `hymn-section.tsx` L32 + L42 의 헤딩 className `text-sm font-semibold
// text-red-700 dark:text-red-400` 에서 색상 제거 (헤딩 1건). 본문 refrain
// 18건은 `prayer-sections/rich-content.tsx` 의 renderBlock stanza phrase
// 분기 (L377) 에서 `isRefrain ? RUBRIC_CLASS` 트리거 제거 — `psalm-block.tsx`
// 의 GOAL #1 fix(psalter+sw): #3 시편 refrain 까망 패턴과 동일. `data-role=
// "psalm-phrase-refrain"` 메타데이터는 회중 응답 식별 / e2e selector 안정성을
// 위해 보존. doxology italic 강세는 무변경. RichContent 의 다른 caller
// (short-reading / responsory / intercessions / concluding-prayer / psalmPrayer
// natural-flow) 는 refrain phrase 를 emit 하지 않으므로 회귀 없음. HTML byte
// 출력 (Магтуу 헤딩 + refrain span className) 변동으로 v36 precache snapshot
// 과 어긋날 수 있어 conservative bump.
// v33 — WI #21: 막토 (Gospel canticle) 안티폰의 rubric / rubric-line
// 스팬에서 `text-red-700 dark:text-red-400` 트리거 제거. 사용자 directive
// (2026-05-15): '막토 안에는 빨간 글씨 필요 없어. 제목은 빨간 글씨 그대로
// 해.' → `gospel-canticle-section.tsx` L27 (renderAntiphonSpan, kind:'rubric')
// + L112 (renderAntiphonRich, kind:'rubric-line') 의 두 className 만
// 색상 제거. kind 메타데이터 / `not-italic` / 데이터 layer (canticles.json,
// antiphonRich AST) 모두 보존. 섹션 제목 헤딩 (L205) 의 `text-red-700` 은
// 시스템 공통 컨벤션이므로 그대로 유지. HTML byte 출력 (안티폰 내부 rubric
// 스팬의 className) 이 변하므로 v32 precache snapshot 과 어긋날 수 있어
// bump. v32 잔존 시 안티폰 안 부활 시기 overlay '(Аллэлуяа)' /
// 'Амилалтын улирал:' 등이 그대로 빨간색으로 노출됨.
// v32 — task #16 (WI-15 follow-up): 끝기도 6개 시편 (Psalm 91:1-16,
// 31:2-6, 16:1-11, 88:2-19, 4, 134) 의 `phrases` 배열 배포. WI-15
// 에서 catalog 본문 (lines[]) 만 land 했었고 phrase grouping 은 다음
// 단계로 분리됨. 본 bump 는 `scripts/regroup-phrases-by-capital.mjs
// --force-inject` 로 6개 entry 에 FR-161 capital-start phrase grouping
// 을 일괄 주입 (총 147 phrases, multi-line wrap-continuation 22건).
// 데이터 변경 surface — `psalter-texts.rich.json` 의 6 stanza block 에
// `phrases?: PhraseGroup[]` 필드만 추가 (lines/indent/paragraphBoundaries/
// role propagation 모두 unchanged). 기존 121 refs 의 phrases 는 손상
// 무 (atomic — only 6 targeted refs touched).
// 시각적 효과 — 6 entry 가 legacy line-render fallback (FR-161 R-3 분기
// 비활성) → phrase render path 로 전환. 일반 시편의 capital-start
// indent grouping + paragraphBoundaries 와 동일 trace.
// CACHE_VERSION bump 사유 (defensive conservative): SW navigate (HTML)
// 는 `network-only` 라 직접 충돌 없음. 그러나 SSR HTML 출력에 147 새
// markup 추가 + 정적 자산 (script chunk) hash 변동 가능 — connected-
// deploy 일관성을 위해 v31→v32 채택 (v28/v29 같은 phrase-mode 데이터
// 변경 시점의 운영 관행 정합).
// PRECACHE_URLS = ['/offline.html', '/icon.svg'] 는 변동 없음. WI-15
// (v30→v31) 는 changelog 코멘트가 빠졌으나 본 entry 에서 함께
// documented.
// v31 — task #15 (WI-15): 끝기도 6개 시편 (Psalm 91:1-16, 31:2-6,
// 16:1-11, 88:2-19, 4, 134) 의 PDF 본문 (lines[]) 을 catalog 에
// verbatim 추가. phrases 배열은 follow-up (task #16, v32 참고) 으로
// 분리. CACHE_VERSION bump 사유: SSR HTML 출력에 6 신규 entry 의
// 라인 본문 markup 추가 (130 → 136 entries) → 정적 자산 hash 변동.
// v30 — task #8 (FR-145): 첫 화면(`/`) 을 image.png 스타일 전례력
// list (LiturgicalCalendarList) 로 교체 + CelebrationOption v2
// (`kind` 분류 필드) + 신규 `loadCalendarWindowAction` server action
// (`/_next/data` 경유) 추가. 새 라우트는 없음 (기존 `/` + `/pray/[date]/[hour]`
// 재사용); navigation (HTML) 은 여전히 `network-only` 이므로 첫 화면
// HTML 변경은 v29 precache snapshot 과 직접 충돌하지 않는다. 그러나:
//   - 새 클라이언트 컴포넌트 2개 (LiturgicalCalendarList +
//     LiturgicalCalendarRow) → 빌드 chunk 해시 변동
//   - 새 server action 엔드포인트 (Next.js 가 자동 생성하는 RPC URL)
//   - 기존 `/?date=&celebration=` 쿼리 파라미터 의미 확장 (이전 single-day
//     card 컨텍스트 → 전례력 list anchor 컨텍스트)
// 위 세 가지 모두 정적 자산 (script chunk) 의 강제 재정렬을 요구하므로
// conservative bump 적용. PRECACHE_URLS = ['/offline.html', '/icon.svg']
// 는 변동 없음.
// v29 — task #4: phrase-injection 파이프라인의 `lines[].role` →
// `phrases[].role` 전파 fix. `scripts/build-phrases-into-rich.mjs` 의
// `regroupPhrasesByCapitalStart()` 및 `translatePhrases()` 후처리에 role
// propagation pass 추가 (conservative tie-break — phrase coverage 내 모든
// 라인이 동일 defined role 일 때만 phrase.role 부여). 기존 카탈로그는
// `scripts/migrate-phrase-role-from-lines.mjs` 로 back-fill — 14 refs /
// 130 phrases 에 phrase.role='refrain' 주입 (이전 phrase mode 렌더에서
// refrain markup 0건 emit 되던 회귀 해소). 영향 refs:
//   - Daniel 3:57-88, 56 (44 line.refrain → 38 phrase.refrain via
//     line-aggregation, uncovered=0)
//   - Daniel 3:52-57 (19 → 12, uncovered=0)
//   - Revelation 19:1-7 (12 → 8, 4 uncovered — conservative tie-break
//     으로 mixed-role phrase 제외 사례)
//   - Psalm 24:1-10 (6 → 6), 67:2-8 (4 → 4), 8:2-10 (6 → 6),
//     42:2-6 (4 → 4), 46:2-12 (6 → 6), 99:1-9 (3 → 3),
//     115:1-13 (3 → 3), 116:10-19 (2 → 2), 80:2-8,15-20 (9 → 9),
//     136:1-9 (9 → 9), 136:10-26 (20 → 20)
// 데이터 변경: psalter-texts.rich.json 의 `phrases[].role='refrain'`
// 필드만 추가 (line.role 은 unchanged, indent/lineRange unchanged).
// 색상 변화는 없음 — task #3 의 시편 본문 까만색 정책 (text-red-*
// 트리거 제거) 은 무손상으로 유지.
//
// CACHE_VERSION bump 사유 (defensive conservative): SW 의 navigate (HTML)
// fetch handler 는 `network-only` + offline fallback (lines 357-365 참고)
// 이므로 HTML byte 출력 변화는 v28 precache snapshot 과 직접 충돌하지
// 않는다 — PRECACHE_URLS 는 `['/offline.html', '/icon.svg']` 만 보유,
// rich.json 같은 server-side import 데이터는 SW 시야 밖. 본 bump 의
// 실질 효과는 정적 자산 (script/style/font/image) 캐시의 강제 재정렬 —
// 다음 사용자 방문 시 cache-first 정적 자산이 신선한 빌드의 chunk hash
// 와 다시 정렬됨. CACHE_VERSION bump 정확 criteria (정적 자산 경로/
// 내용 변경 / 프리캐시 대상 변경 / SW 로직 변경) 어느 것도 본 PR 이
// strict 하게 트리거하지는 않지만, JSON 데이터 변경이 SSR HTML 출력에
// 새 markup 130건을 추가하므로 connected-deploy 일관성을 위해
// conservative bump 채택 (v27/v26 같은 indent/PB 데이터 변경 시점의
// 운영 관행과 정합).
// v28 — #503: Phase 2 R-3 Sweep — 나머지 122 refs (시편 + 구약/신약
// 찬가) paragraphBoundaries 일괄 재추출. #501 Pilot 의 Python
// pdfplumber y-gap extractor (1.4× median threshold) 를 rich.json
// 의 전체 ref/stanza 그리드 (368 stanza blocks across 125 refs) 에
// 적용. Psalm 42:2-6 + Psalm 63:2-9 (#501 Pilot) 은 idempotent 재계산
// 으로 bit-identical 결과 (regression guard 통과).
// 적용 결과 — block-level delta:
//   - SAME / SAME_EMPTY:    7  (이전 결과 보존: 주로 Pilot 2 refs +
//                                F-X11 기 정확 매치)
//   - NEW_EMPTY:          205  (이전 PB 없음 + 새 mechanism 도 없음:
//                                naturally single-paragraph stanza)
//   - NEW_ADD / ADD:      123  (이전 PB 없었으나 PDF y-gap 으로 detect:
//                                대부분 시편 본문의 stanza-internal
//                                paragraph break — F-X11 text heuristic
//                                이 놓쳤던 자연 paragraph)
//   - REMOVE:              13  (F-X11 text heuristic 이 false-positive
//                                로 추가했던 break: Daniel 3:57-88
//                                refrain b0/b1/b10/b11, Revelation 19
//                                refrain b1/b2/b3, Daniel 3:52-57
//                                b0/b2-b6 — y-gap 으로 검증 시 모두
//                                refrain continuation 으로 정상 분류)
//   - DIFF:                19  (PB 수/위치 변화: 대부분 추가 detect.
//                                Psalm 8:2-10 / Psalm 86:1-17 등이
//                                기존 [3,24] → [3,10,13,17,21,24] 처럼
//                                자연 paragraph 풍부하게 인식)
//   - SKIP:                 1  (Psalm 31:1-17 b1: rich.json L0 에
//                                section-title 노이즈 "Шөнийн даатгал
//                                залбирал" 가 포함된 data-quality
//                                결함 — 별 task. 기존 PB=[] 보존)
// Total PB entries: 88 → 458 (+370). Refs with PB delta: 102.
// Pilot idempotency: Psalm 42:2-6 b0=[4,8,12] / b3=[3,7,11,15,19],
// Psalm 63:2-9 b0=[2,8] / b1=[6] — bit-identical to #501 commit
// 19fab90.
// Mechanism 변경사항 vs Pilot extractor:
//   1. `--column multi` 모드 추가 — 동일 page 의 left+right 두 column
//      을 동일 line stream 에 흘려 보내고, cross-column 인접 line gap
//      을 None 으로 처리 (cross-page 와 동일). 한 block 이 column 경계
//      를 가로지르는 케이스 (Daniel 3:57-88 의 invocation+refrain
//      pair 가 left col 1줄 / right col 5줄 로 펴진 형태) 지원.
//   2. Page-header / section-title 노이즈 필터 (`is_page_header_line`
//      port from scripts/dev/page-header-filter.mjs) — 다른 column /
//      page 로 walk 시 running header ("Ням гарагийн өглөө 61" 류)
//      가 line stream 에 끼어들어 매칭 실패하던 root cause.
//   3. Whitespace-stripped equality (3rd tier in `line_matches` +
//      `try_wrap_bridge`) — pdfplumber 가 char spacing drift 로 인접
//      단어 사이 공백을 누락 (예 PDF "хийгээдсүр" vs rich
//      "хийгээд сүр") 시 fallback 매칭.
//   4. Reverse-bridge walker (`try_reverse_bridge`) — rich.json 이
//      1 visual PDF line 을 2~4 logical lines 로 split 한 케이스
//      (Revelation 4:11 b1 L14+L15 "Алдар ба" + "магтаалыг…",
//      Revelation 11 b0 L12+L13 "Эдүгээ… ялалт," + "ид чадал,")
//      를 1 PDF line 으로 absorb 후 consumption=0 으로 표기, gap=0
//      으로 처리 (paragraph break 미발생).
// 데이터 변경: rich.json paragraphBoundaries 만 변경, phrases /
// lines / indent 는 보존. Driver 는
// `scripts/dev/sweep-paragraphs-into-rich.mjs` (atomic 367-block
// inject). HTML byte 출력 (paragraph mt-3 위치 변경) 이 변하므로
// v27 precache snapshot 과 어긋날 수 있어 bump. v27 잔존 시 신규
// 자연 paragraph 분할이 노출되지 않음.
// v27 — #502: 시편/찬가 본문 왼쪽 여백 통일. Renderer 의 phrase.indent
// / line.indent 의 영향 제거 (모두 indent=0 = `pl-6 -indent-6` 레벨로
// 통일, hanging indent 는 wrap continuation 의 시각 구분 보존 위해
// 유지). 사용자 SoT — Psalm 63 b0 의 line 0-1 (indent=0) vs 2-12
// (indent=1) 의 들여쓰기 차이가 "갑자기 왼쪽 여백이 넓어지는" 효과
// 를 일으킴 → 가장 작은 들여쓰기 (현재 indent=0 = pl-6) 로 통일.
// 영향 범위:
//   - Phrase mode (block.phrases): pl-12 / pl-18 → pl-6 (indent 1/2)
//   - Legacy line mode (line.indent): pl-6 / pl-12 → '' (indent 1/2)
//   - Plain stanzas mode (leading-whitespace encoding): pl-6 / pl-12
//     → '' (level 1/2; leading whitespace 는 strip 유지)
// 데이터 (rich.json phrase.indent / line.indent) 는 변경하지 않음 —
// PDF SoT 보존, renderer 단에서만 무시. HTML className 변경 → v26
// precache snapshot 과 어긋날 수 있어 bump. v26 잔존 시 구 indent
// 분기 className 이 노출되어 사용자 issue 가 재현됨.
// v26 — #501: Phase 2 R-2 Pilot — paragraph extractor (Python pdfplumber +
// y-gap heuristic 1.4× median) 도입. PDF page-physical y-coordinate 측정
// 으로 stanza-internal 의 line-spacing baseline (median) 대비 ≥1.4× 인
// 위치를 paragraph 로 분류. Pilot 범위: Psalm 63:2-9 + Psalm 42:2-6 의
// 6 stanza blocks (PB-applicable 4 + refrain-empty 2).
//   - Psalm 63:2-9 b0: PB [8] → [2, 8]  (text-based old missed v3 paragraph
//                                         "Тэнгэрбурхан, Та миний…" — diff
//                                         vs F-X11 text heuristic surfaced
//                                         R-1 hypothesis)
//   - Psalm 63:2-9 b1: PB ∅ → [6]        (new paragraph at "Шөнөжин Таны…")
//   - Psalm 42:2-6 b0: PB ∅ → [4, 8, 12] (R-1 PoC consistent: PDF body
//                                         idx 4/8/13 maps to rich idx
//                                         4/8/12 after 1 wrap-join collapse)
//   - Psalm 42:2-6 b1 / b2: PB ∅          (6-line + 4-line refrains; gap
//                                         analysis finds no within-block
//                                         paragraph — expected)
//   - Psalm 42:2-6 b3: PB ∅ → [3, 7, 11, 15, 19]  (5 paragraphs across 20
//                                                  rich lines, 1 wrap-join)
// Mechanism (scripts/lib/extract-paragraphs-from-pdf.py): pdfplumber.chars
// → top-cluster lines → column filter (x0 < 297) → walk per-block lines
// with wrap-tolerant bridge (strict-eq first, then 12-char prefix +
// length fence) → gap = first_top[i] - last_top[i-1] (bottom-to-top
// across wrap-joined lines so the bridge does not inflate gaps by one
// line-spacing per wrap depth) → median across non-null gaps → classify
// (paragraph if gap ≥ 1.4 × median, stanza-break warning if gap ≥ 1.95 ×
// median).
// Node bridge (scripts/build-paragraphs-into-rich.mjs) child_process
// spawns the Python extractor per-block, parses JSON, replaces rich.json
// stanza block's paragraphBoundaries (or removes when extractor finds
// none). Pilot manifest enumerates the 6 blocks; sweep over remaining
// 122 refs follows in a separate task.
// HTML byte 출력 (paragraph 분할 위치 변경 → multi-line phrase mt-3
// boundary 변동) 변경 → v25 precache snapshot 과 어긋날 수 있어 bump.
// v25 잔존 시 Psalm 63 b0 의 첫 paragraph 분할이 누락된 구 렌더가 노출.
// v25 — #499: Phase 1 Sweep — phrase grouping rebuild 122 refs (제외
// Psalm 63/42). #498 pilot 결과를 사용자가 화면 검증 OK 후, 나머지
// 122 refs (시편 + 구약/신약 찬가 본문) 에 동일한 키릴 대문자 시작 규칙을
// 일괄 적용. 처리 범위 = 121 refs touched (out of 125 stanza-block refs):
//   - 121 refs 가 이전부터 phrases 보유 (F-X11 cohort PASS subset)
//   - 4 refs (Psalm 88:2-10 / Psalm 118:1-16 / Psalm 31:1-17 / Isaiah
//     61:10-62:5) 는 phrases 가 존재하지 않아 SKIP — 이전과 같이 legacy
//     line-render 유지 (별도 inject task 에서 처리 예정)
// Total phrase 집계: 3057 → 3133 (+76); 355 multi-line phrase 신규;
// 46 zero-delta refs (all-capital 라인 — 변동 없음).
// Outlier (사용자 spot-check 권고, 모두 narrator + quoted response/speech
// 의 mechanical merge 결과로 규칙대로의 출력):
//   - Revelation 19:1-7  25 → 17 phrases ('(Х. Аллэлуяа!)' response 가
//     paren 으로 시작 → 직전 narrator 라인의 continuation 으로 merge)
//   - Psalm 87:1-7       18 → 12 phrases (smart-quote 시작 quoted speech
//     dialog 라인 다수 → narrator phrase 와 merge)
// Pilot 재적용 idempotency 확인됨: Psalm 63:2-9 + Psalm 42:2-6 의 sweep
// 후 stanzasRich 가 #498 commit 806d8e7 의 결과와 bit-identical.
// HTML byte 출력 (phrase span 그룹화) 변경 → v24 precache snapshot 과
// 어긋날 수 있어 bump. 다른 정적 자산은 변동 없음.
// v24 — #498: Phase 1 Pilot — phrase grouping rebuild (Psalm 63 + Psalm
// 42 only). 키릴 대문자 시작 = 새 phrase 시작 규칙으로 multi-line phrase
// 묶음 (Cyrillic-capital-start rule). The rich.json `phrases` arrays for
// `Psalm 63:2-9` block 1 and `Psalm 42:2-6` blocks 0/3 collapse adjacent
// wrap-continuation lines (smart-quote dialogue prefix, lowercase
// continuation) into single multi-line PhraseGroups:
//   - Psalm 63:2-9 b1: 13 → 12 phrases  (L4-L5 merge: 'Ам минь
//     баясгалант уруулаар магтаалуудыг' + 'өргөнө.')
//   - Psalm 42:2-6 b0: 19 → 18 phrases  (L8-L9 merge: 'Хүмүүс надад'
//     + '"Чиний Тэнгэрбурхан хаана байна?"…')
//   - Psalm 42:2-6 b3: 20 → 18 phrases  (L11-L12 + L17-L18 merges:
//     both quote-prefixed continuation lines)
// `lines[]` text + `paragraphBoundaries` UNCHANGED — only the phrase
// grouping. Other 122 refs of psalter-texts.rich.json are NOT touched
// in this pilot (sweep follows post-user-validation).
// HTML byte 출력 (phrase span 그룹화) 변경 → v23 precache snapshot 과
// 어긋날 수 있어 bump. 다른 정적 자산은 변동 없음.
// v23 — #496: F-X11 Phase 2-K — Eph 1:3-10 b1 restructure (Col 1
// leakage 제거, F-X11 100% closure). #495 batch review 가 발견한
// MAJOR data-quality 회귀 fix:
//   b1 lines 4-7 (4 lines) 가 Colossians 1:12-13 본문이었음 —
//   초기 데이터 입력 시 인접 reading (Colossians 1:9b-13) 의 본문이
//   잘못 끼어든 leakage. 사용자 가시화면에 "Эцэгт талархал өргөөсэй
//   хэмээн хүсэж байна. / Тэр биднийг харанхуйн эрх мэдлээс
//   авраад, хайрт / Хүүгийнхээ хаанчлалд шилжүүлсэн юм." 등 Col 1
//   text 가 Eph 1 canticle 자리에 표시되던 회귀.
//   Fix: rich.json b1 L4-L7 (Col 1 leakage 4 lines) 제거 — b1 = 4
//   lines 로 축소 (PDF :2836-2839 verbatim 만 유지). 동시에 plain
//   catalog (psalter-texts.json) 의 동일 leakage 제거 — stanza 1
//   L3 의 concatenated 'Хишиг ивээлээ бидэнд хүртээсэн билээ.
//   өвийг хуваалцахад...' 를 'Хишиг ивээлээ бидэнд хүртээсэн
//   билээ.' 만 유지 + L4-L6 (Col 1 leakage 3 lines) 제거. SSOT
//   양쪽 동시 정정.
//   Inject delta: 3 stanza blocks (b0/b1/b2) phrases inject (0 PB —
//   single-paragraph stanzas).
//   Phase 2-K Post-fix dryrun: PASS 124 / DRIFT 0 ← F-X11 100%
//   closure (Eph 1 newly-PASS, 1 잔여 → 0). HTML byte 출력 (b1 4
//   lines 제거 + phrase 단위 indent) 변경 → v22 precache snapshot
//   과 어긋날 수 있어 bump.
// v22 — #494: F-X11 Phase 2-J — 4 refs phrases inject post-splitter-fix.
// #492 (Phase 2-I1b) pdftotext-column-splitter right-column-bleed fix
// 후, batch dryrun 의 verdict 가 변경된 4 refs 를 일괄 inject:
//   - Psalm 96:1-13       (newly-PASS, 2 stanzas / 27 phrases first inject)
//   - Psalm 42:2-6        (newly-PASS, 4 stanzas / 49 phrases first inject)
//   - Jeremiah 31:10-14   (collateral re-inject; phrases bit-identical
//                          to #490 post-typo-fix state — splitter fix
//                          had 0 effect on this ref's alignment)
//   - Psalm 144:11-15     (collateral re-inject; phrases bit-identical
//                          to #489 post-pageMap-fix state — splitter fix
//                          had 0 effect on this ref's alignment)
// Idempotency check (4 refs pre-J vs post-J JSON 비교):
//   Jer 31 / Ps 144:11 → IDENTICAL (splitter fix delta = 0 on these refs)
//   Psalm 96 / Psalm 42 → CHANGED (newly-injected, was empty)
// Post-J dryrun: PASS 123 (was 121, +2 newly-PASS) / DRIFT 1 (Eph 1 만,
// structural DEFER per #488 pushback). HTML byte 출력 (paragraph 분할
// + phrase 단위 indent) 변경 → v21 precache snapshot 과 어긋날 수 있어
// bump.
// v21 — #491+#493: Jer 14 + Exod 15 typography fix cohort (Phase 2-I1a +
// 2-I1a.5). #488 pushback (matcher cross-stanza 보강 → typography
// drift) 후 dev 가 typo + b3 unmask 처리.
// v20 — #489: F-X11 Phase 2-I2 pageMap fix Psalm 144:11-15 (#451 mirror).
//   page 483 → 481 정정 + phrases re-align inject.
// v19 — #490: F-X11 Phase 2-I3 Jeremiah 31:10-14 b1 typo fix + inject.
// b1 line 4 'Тэд иржу,' → 'Тэд ирж,' (extra 'у' 제거, PDF 4200 SoT)
// + b1 line 7 'улмаас баярлатгэнэ.' → 'улмаас гэрэлтэнэ.' (transcription
// 오류 — non-existent word → "shines/glows", PDF 4203 SoT). 두 typo 가
// matcher 의 12-char prefix tolerance 를 초과하여 alignAtProbe 가 b1
// L3 에서 stop 시켜 ext=3 reported (rich=9). 정정 후 b1 9 lines 가
// PDF 4197-4205 9 lines 와 정합되어 PASS. 동시에 plain catalog
// (psalter-texts.json) 의 동일 typo 2건도 정정 (rich.json 와 SSOT
// 일관성). Inject delta: 3 stanza blocks (b0/b1/b2) 에 phrases inject
// (16 phrases / 0 PB — natural single-paragraph stanzas).
// HTML byte 출력 (b1 line text 2자 변경 + phrase 단위 indent) 이
// 변하므로 v18 precache snapshot 과 어긋날 수 있어 bump. v18 잔존
// 시 'иржу'/'баярлатгэнэ' 오자가 그대로 노출됨.
// v18 — #485: F-X11 Phase 2-H. G4 depth-progression escalate (#481) 가
// process-fx11-phase2-batch.mjs depth predicate 변경으로 collateral
// newly-PASS 가 된 6 refs (1 Samuel 2:1-10, Daniel 3:57-88, 56,
// Daniel 3:26-27, 29, 34-41, Isaiah 38:10-14, 17-20, Colossians
// 1:12-20, Psalm 51:3-19) 의 paragraphBoundaries + phrases 를
// 처음으로 inject. 모두 page-bridge mechanism (forward gather depth
// 5+ 로 다음 PDF 페이지의 stanza 까지 매칭) 으로 align (#483 review
// 6/6 LEGITIMATE 검증). Total: 52 stanza blocks 에 241 phrases +
// 4 paragraphBoundaries (Daniel 3:57-88, 56 b3 의 refrain-style PB
// 만 비-empty). HTML byte 출력 (paragraph 분할 + phrase 단위
// indent + hanging-indent wrap continuation) 이 변하므로 v17
// precache snapshot 과 어긋날 수 있어 bump.
// v17 — #482: F-X11 Phase 2-G1.5 Wisdom 9 b4/b5 unmask typo fix
// (post-G1 propagation). G1 (#480) 이 b1/b3 typo fix 후 b4/b5 가
// 노출된 mask-shift 로 추가 typo 발견. PDF SoT 정정 (singular ↔
// plural 어형 + 어간 정정).
// v16 — #480: F-X11 Phase 2-G1 CAT-T1 typo fix. Wisdom 9:1-6, 9-11
// + Psalm 135:1-12 의 4 typo (PDF parsed_data 정정). DRIFT 잔여
// ~10 refs G-band fix 의 첫 단추.
// v15 — #476 + #477 통합 bump (CACHE conflict resolution).
//
// #477: F-X11 Phase 2-F builder propagation guard + 29 SAFE refs
// reinject. Phase 2-D (#463) 의 phrase.indent ← line.indent
// propagation 이 의도적 non-zero phrase.indent (Pattern B Roman
// 'I'/'II' centered marker / Pattern C 짧은 hanging-indent wrap-
// continuation) 까지 silently flatten 시키던 #475 audit MAJOR-2
// (39 refs / 331 mismatches) 결함의 build-side fix. skip-if-explicit
// guard (phrase.indent !== 0 && phrase.indent !== uniformLineIndent
// → preserve, do NOT propagate) 추가 후 audit GO_WITH_CAVEAT 의
// 29 SAFE refs (Pattern A only — Isaiah 26:1-6, Psalm 98:1-9 등)
// 에 한해 reinject, 10 EXCLUDE refs (Pattern B/C contamination —
// Psalm 49/145/45/62/139/27/132/72/136 + Revelation 15:3-4) 는
// --only allow-list 에서 의도적으로 제외. 28 SAFE refs 의
// phrase.indent 가 0 → 1 로 정정.
//
// #476: 1 Samuel 2:1-10 추가 typo fix (b4/b5/b6, PDF SoT 정정).
//   - b4 line 4: 'Дордруулдаг' → 'Дордуулдаг' (extra р 제거, PDF :7803)
//   - b5 line 1: 'үнс хогноос өргөмждөө' → 'үнс хогноос өргөхдөө' (PDF :7805)
//   - b6 line 2: 'Гагц гүүнийхээ дээр' → 'Гагц үүнийхээ дээр' (PDF :7825)
//
// 두 commit 모두 HTML byte 출력 변경 → v13 precache snapshot 과
// 어긋날 수 있어 v15 으로 한 번에 bump. v14 으로 각각 bump 시도가
// 동일 line 충돌 → manual resolve 로 v15 통합.
// v13 — #473: 1 Samuel 2:1-10 b2 typo fix (PDF SoT 정정). rich.json
// 한 line text 변경 (`Хамаг үйлсийг dэнслэгч` → `Хамаг үйлийг
// дэнслэгч` — singular accusative 'үйлийг' per PDF parsed_data
// /full_pdf.txt:7791). NFR-002 PDF verbatim 정책 엄격 적용 (user
// 결정). HTML byte 출력 (시편 본문 한 줄 문자) 이 바뀌므로 v12
// precache snapshot 과 어긋날 수 있어 bump. v12 잔존 시 구
// 'үйлсийг' 텍스트가 그대로 노출됨.
// v12 — #472: F-X11 Phase 2-E 4 typography drift typo fix (Psalm
// 100 b1 'тулгар' → 'тулгуур', Psalm 110 b3 'хлжэрээгүйг' →
// 'хижрээгүйг', Psalm 116:10-19 b3 'дээдэлэн' → 'дээдлэн',
// Tobit 13:1-8 b3 'буулга' → 'буулгаа') + Isaiah 33:13-16 PB
// inject. HTML byte 출력 (시편 본문 4 line text + Isaiah 33 PB)
// 이 바뀌므로 v11 precache snapshot 과 어긋날 수 있어 bump.
// v11 — #463: F-X11 Phase 2-D 데이터 변경 반영. translatePhrases() lineRange
// dedup pass 추가 (Psalm 16:1-6 b0 / Psalm 137:1-6 b1 의 NFR-009j 0-OVERLAP
// 회귀 fix — 두 phrase 가 같은 [k,k] 로 collapse 되어 화면에 같은 line 2회
// 렌더되던 결함) + 빌더의 phrase.indent 가 rich line.indent 를 채택하도록
// propagation 추가 (Psalm 30:2-13 b0/b2/b4 antiphon block 의 indent flatten
// fix). 추가로 #456 WI-A2-2 reverse-bridge matcher 로 newly-PASS 가 된
// 3 refs (Revelation 4:11; 5:9-10, 12 b1, Revelation 11:17-18; 12:10b-12a b0,
// Psalm 65:2-9 b0) 도 처음으로 phrases inject. 총 6 refs delta. HTML byte
// 출력 (phrase 단위 indent + 중복 line 제거) 이 바뀌므로 v10 precache
// snapshot 과 어긋날 수 있어 bump. v10 잔존 시 Psalm 16/137 의 중복
// 렌더링 버그가 그대로 노출됨.
// v10 — #453: F-X11 Phase 2-C 데이터 변경 반영. #452 matcher-side wrap-
// tolerant 비교 도입으로 6 refs (Psalm 16/21/30/119:105-112/137/144:1-10)
// 가 DRIFT_LINE_COUNT → PASS 전환, paragraphBoundaries + phrases 신규
// inject. Psalm 21:2-8, 14 block 0 PB=[8] (송영 구분), 그 외 5 refs 는
// phrases-only (PB 빈 배열, line-level grouping 만 추가). 추가로 Isaiah
// 61:10-62:5, Psalm 88:2-10 (newly-PASS, 미주입 잔여) 도 phrases inject.
// HTML byte 출력 (phrase 단위 wrap 적용) 이 바뀌므로 v9 precache snapshot
// 과 어긋날 수 있어 bump. v9 잔존 시 신규 phrase wrap 미적용 위험.
// v9 — #443: F-X11 Phase 2-B 데이터 변경 반영. 새 detectRefrains
// 일반화 heuristic (3+/4-line refrain 지원) 으로 124 refs 재추출,
// Psalm 24:1-10 + Daniel 3:52-57 multi-line refrain paragraphBoundaries
// 신규 detect, Psalm 46/80/8 hotfix SSOT consolidation. HTML byte
// 출력 (paragraph 분할 단위) 이 변하므로 v8 precache snapshot 과
// 어긋날 수 있어 bump. v8 잔존 시 깨진 paragraph 렌더링 노출 위험.
// v8 — #410: F-X9/X10/X12 fix cohort. psalter-headers data 재생성 (77
// entries, 시편 제목/성경구절 prefix/suffix 노이즈 제거), psalter-texts
// 119 refs +660 LOC re-injection (PDF 들여쓰기 wrap continuation 정상
// 분류), intercessions-section.tsx renderer (응답구절 italic 헤리스틱).
// HTML byte 출력이 변하므로 v7 precache snapshot 과 어긋날 수 있어 bump.
// v7 — #361: hour-card-list 의 라벨 옆 `→` 화살표를 모바일에서 숨김
// (`hidden md:inline` + aria-hidden). HTML byte 출력 (className 문자열 +
// span 가시성) 이 바뀌므로 v6 precache snapshot 과 어긋날 수 있어 bump.
// v6 — #360: mobile horizontal padding reduced (`px-4` → `px-2`) on all
// main page containers (pray/home/guide/ordinarium/settings + loadings).
// HTML byte output changes (className string), so existing precache
// snapshots could mismatch; bumping forces `activate` to evict v5 caches.
// v5 — FR-NEW #230 (F-X5): new routes `/pray/[date]/firstVespers` and
// `/pray/[date]/firstCompline` introduced; bumping invalidates the prior
// HTML/asset cache so existing PWA installs do NOT serve a 404 from
// stale `network-only` HTML or stale precache. See CLAUDE.md
// "Service Worker 캐시 — 배포 회귀 1순위 리스크".
// v44 — FR-168 (GOAL #90): saturday-mary Lauds Benedictus 후렴 6옵션
// 드롭다운 + 안내 루브릭 도입. /pray/[date]/lauds?celebration=saturday-mary
// 의 SSR HTML 출력이 바뀌고(드롭다운/루브릭 마크업) gospel-canticle 섹션의
// 클라이언트 hydration 동작이 추가됨 → 기존 PWA 설치본이 stale HTML/asset
// 을 서빙하지 않도록 bump. CLAUDE.md "Service Worker 캐시" 참조.
// v45 — GOAL #105 (Psalm 114 psalm-prayer page-boundary truncation root-fix:
// psalmPrayer restored to the complete text from the PDF source) + GOAL #115
// (remove the closing Lord's-Prayer guidance rubric after intercessions + drop
// the trailing "Амэн" from the Lord's Prayer body). Both change SSR HTML output
// (prayer body text / rubric+amen markup) → bump so existing PWA installs do not
// serve stale HTML/asset. See CLAUDE.md "Service Worker 캐시 — 배포 회귀 1순위 리스크".
// v46 — GOAL #130 (Psalm 63:2-9 Lauds caption reposition): the 2-line uncited
// caption ('Гэм нүглийн…' / '…тэмүүлнэ.') is relocated out of the psalm body and
// rendered as an uncited_caption header directly after the psalm title. The
// /pray/[date]/lauds SSR HTML output changes (caption markup moves from a body
// stanza phrase to the post-title header slot) → bump so existing PWA installs do
// not serve stale HTML/asset. See CLAUDE.md "Service Worker 캐시 — 배포 회귀 1순위 리스크".
// v47 — GOAL #147 (Trinity Sunday 2nd Vespers + Lauds concluding prayer/collect
// added) + GOAL #150 (Trinity First Vespers proper psalmody now taken from Week-1
// Sunday First Vespers: Psalm 141/142/Philippians 2 with antiphons, replacing the
// stale Sunday-2nd-Vespers fallback). Both change SSR HTML output for Trinity
// Sunday Vespers/Lauds -> bump so existing PWA installs do not serve stale
// HTML/asset. See CLAUDE.md "Service Worker 캐시 — 배포 회귀 1순위 리스크".
// v51 — GOAL #273 F1 (#284): invitatory 헤더의 출처 page-ref 를 접힘
// 상태에서도 항상 렌더하도록 invitatory-section.tsx 의 `!collapsed &&`
// 게이트 제거 (RCA #268 — 기본 invitatoryCollapsed=true 접힘 화면에서
// page-ref 0건이던 회귀 해소). navigation 은 여전히 network-only (HTML
// 미캐시) 이고 Next 청크는 content-hash 라 hard requirement 는 아니지만,
// (1) invitatory 접힘 분기의 client 빌드 청크 해시 변동, (2) 모든
// /pray/[date]/[hour] 의 SSR HTML 헤더 markup 변경 — v30/v31 의 보수적
// bump 선례 (navigation network-only + 기본사용자 SSR 무변경이어도 client
// 청크 해시가 바뀌면 connected-deploy 일관성을 위해 bump) 를 따라
// conservative bump. activate 훅이 구버전 캐시를 정리. PRECACHE_URLS 변동
// 없음. See CLAUDE.md "Service Worker 캐시 — 배포 회귀 1순위 리스크".
// v52 — GOAL #13 (магтуу 문단구분): rich-content.tsx 의 stanza phrase/
// legacy line 렌더 경로에 `block.paragraphBoundaries` → `mt-3` 문단 간격
// 적용 (psalm-block.tsx 미러) + 37.rich.json 에 paragraphBoundaries
// [2,6,8] 추가. navigation 은 여전히 network-only (HTML 미캐시) 이고 Next
// 청크는 content-hash 라 hard requirement 는 아니지만, (1) rich-content.tsx
// 는 client 컴포넌트 (hymn-section/psalm-block) 가 import → client 빌드
// 청크 해시 변동, (2) магтуу #37 등 hymn 의 SSR HTML 에 새 mt-3/
// data-paragraph-boundary markup 추가 — v30/v31/v51 의 보수적 bump 선례
// (cache-first 정적 자산이 구 no-gap 렌더 청크를 무한 서빙하는 회귀 방지)
// 를 따라 conservative bump. activate 훅이 구버전 캐시를 정리.
// PRECACHE_URLS 변동 없음. See CLAUDE.md "Service Worker 캐시".
// v53 — GOAL #31 / WI #33 (콜론 없는 청원 파싱): parseIntercessions
// (lib/hours/intercessions.ts) 에 colonless psalter fallback 추가 — 원문
// PDF 에 ':' 가 없는 4개 시편집 청원(W1 WED Vespers, W3 SUN Lauds,
// W4 SUN Lauds, W4 MON Vespers)이 petitions:[] 로 떨어져 intercessions-
// section.tsx 가 flat fallback 을 렌더하던 회귀 해소. navigation 은 여전히
// network-only (HTML 미캐시) 이고 Next 청크는 content-hash 라 hard
// requirement 는 아니지만, (1) intercessions-section.tsx (client 컴포넌트)
// 가 @/lib/hours/intercessions 를 import → client 빌드 청크 해시 변동,
// (2) 위 4개 /pray/[date]/[hour] 의 SSR HTML 이 flat 불릿에서 structured
// (introduction/refrain/petitions) markup 으로 변경 — v30/v31/v51/v52 의
// 보수적 bump 선례 (cache-first 정적 자산이 구 flat 렌더 청크를 무한
// 서빙하는 회귀 방지) 를 따라 conservative bump. activate 훅이 구버전
// 캐시를 정리. PRECACHE_URLS 변동 없음. See CLAUDE.md "Service Worker 캐시".
// v54 — #42 (GOAL #43, W3 SUN Lauds 청원-4 분리): parseIntercessions
// (lib/hours/intercessions.ts) 의 colonless psalter petition split 이 응답
// 마커의 끝 공백을 선택적으로 허용 (SEPARATOR_PSALTER_PETITION). 원문 PDF
// (full_pdf.txt:10356) 가 청원-4 응답마커를 '-Тэдэнд'(대시 뒤 공백 없음)
// 로 인쇄 → 데이터가 byte-verbatim 보존 (week-3.json:92) → strict
// /\s[-—]\s/ 미매칭 → 청원-4 가 versicle-only 로 렌더되던 #42 버그 해소.
// navigation 은 여전히 network-only (HTML 미캐시) 이고 Next 청크는
// content-hash 라 hard requirement 는 아니지만, (1) intercessions-section.tsx
// (client 컴포넌트) 가 @/lib/hours/intercessions 를 import → client 빌드
// 청크 해시 변동, (2) W3 SUN Lauds /pray SSR HTML 의 청원-4 가 versicle-only
// 에서 versicle+response 로 변경 — v53 의 보수적 bump 선례를 따라
// conservative bump. activate 훅이 구버전 캐시를 정리. PRECACHE_URLS 변동
// 없음. See CLAUDE.md "Service Worker 캐시".
const CACHE_VERSION = 'divine-office-v54'
const OFFLINE_URL = '/offline.html'
const PRECACHE_URLS = [OFFLINE_URL, '/icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_VERSION)
          .map((name) => caches.delete(name)),
      ),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    // Network-only for HTML: Vercel already sends no-store headers, and
    // caching the response here caused stale markup to be served for users
    // whose PageRef links were still pointing at the old external PDF href.
    // Fall back to the offline page only when the network is unreachable.
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
    )
    return
  }

  const destination = request.destination
  if (
    destination === 'script' ||
    destination === 'style' ||
    destination === 'font' ||
    destination === 'image'
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone()
              caches
                .open(CACHE_VERSION)
                .then((cache) => cache.put(request, copy))
            }
            return response
          }),
      ),
    )
  }
})
