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
const CACHE_VERSION = 'divine-office-v24'
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
