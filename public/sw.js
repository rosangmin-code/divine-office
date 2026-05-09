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
const CACHE_VERSION = 'divine-office-v10'
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
