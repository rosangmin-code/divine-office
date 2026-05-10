// v14 — #477: F-X11 Phase 2-F builder propagation guard + 29 SAFE
// refs reinject. Phase 2-D (#463) 의 phrase.indent ← line.indent
// propagation 이 의도적 non-zero phrase.indent (Pattern B Roman
// 'I'/'II' centered marker / Pattern C 짧은 hanging-indent wrap-
// continuation) 까지 silently flatten 시키던 #475 audit MAJOR-2
// (39 refs / 331 mismatches) 결함의 build-side fix. skip-if-explicit
// guard (phrase.indent !== 0 && phrase.indent !== uniformLineIndent
// → preserve, do NOT propagate) 추가 후 audit GO_WITH_CAVEAT 의
// 29 SAFE refs (Pattern A only — Isaiah 26:1-6, Psalm 98:1-9 등)
// 에 한해 reinject, 10 EXCLUDE refs (Pattern B/C contamination —
// Psalm 49/145/45/62/139/27/132/72/136 + Revelation 15:3-4) 는
// --only allow-list 에서 의도적으로 제외. post-verifier 결과 SAFE
// 29 refs 의 mismatch 0, EXCLUDE 10 refs 변경 0 (sha256 baseline
// 일치). 28 SAFE refs 의 phrase.indent 가 0 → 1 로 정정되어 HTML
// byte 출력 (phrase 단위 indent class) 이 바뀌므로 v13 precache
// snapshot 과 어긋날 수 있어 bump. v13 잔존 시 28 refs 의 안티폰
// /본문 wrap 들여쓰기가 flush-left 로 노출됨.
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
const CACHE_VERSION = 'divine-office-v14'
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
