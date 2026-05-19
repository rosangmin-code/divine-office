// GOAL #24 WI-C (#31) — loading.tsx 갱신:
//   - 상단 SettingsLink skeleton 제거 (D5=a, page.tsx 의 SettingsLink 제거
//     와 동기)
//   - 하단에 PrayerFooter strip skeleton 추가 (32px bottom strip — 회색
//     띠 단순 모양, fixed bottom)
//   - 본문 컨테이너 pb-16 추가 (PrayerFooter 와 동일한 안전 영역)
export default function PrayLoading() {
  return (
    <>
      <div className="mx-auto max-w-2xl px-1 py-6 pb-16 lg:max-w-3xl md:px-3">
        {/* Back link skeleton — settings-icon skeleton 제거됨 (WI-C). */}
        <div className="mb-4 flex items-center">
          <div className="h-5 w-40 animate-pulse rounded bg-stone-100 dark:bg-stone-800" />
        </div>

        {/* Header skeleton */}
        <div className="mb-6 animate-pulse rounded-xl bg-white p-6 shadow-sm border-l-4 border-stone-200 dark:bg-neutral-900 dark:border-stone-700 dark:shadow-none dark:ring-1 dark:ring-stone-800">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 rounded bg-stone-200 dark:bg-stone-700" />
            <div>
              <div className="mb-2 h-6 w-36 rounded bg-stone-200 dark:bg-stone-700" />
              <div className="mb-1 h-4 w-48 rounded bg-stone-100 dark:bg-stone-800" />
              <div className="h-3 w-32 rounded bg-stone-100 dark:bg-stone-800" />
            </div>
          </div>
        </div>

        {/* Prayer content skeleton */}
        <div className="animate-pulse rounded-xl bg-white p-6 md:p-8 ring-1 ring-stone-200 dark:bg-neutral-900 dark:ring-stone-800">
          <div className="space-y-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i}>
                <div className="mb-2 h-3 w-24 rounded bg-stone-200 dark:bg-stone-700" />
                <div className="space-y-2">
                  <div className="h-4 w-full rounded bg-stone-100 dark:bg-stone-800" />
                  <div className="h-4 w-5/6 rounded bg-stone-100 dark:bg-stone-800" />
                  <div className="h-4 w-4/6 rounded bg-stone-100 dark:bg-stone-800" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* GOAL #24 WI-C — PrayerFooter strip skeleton. 실제 컴포넌트는
          fixed bottom-0 z-40 + 32px h. skeleton 도 동일 모양으로 — 사용자
          가 페이지 진입 시 strip 의 위치/높이가 ready 후 일치하도록
          (layout shift 회피). data-role="prayer-footer-strip-skeleton" 으로
          e2e selector / 디버깅 식별 가능. */}
      <div
        data-role="prayer-footer-strip-skeleton"
        className="fixed inset-x-0 bottom-0 z-40 h-[32px] animate-pulse border-t border-stone-300 bg-stone-200 pb-[env(safe-area-inset-bottom)] dark:border-stone-700 dark:bg-stone-800"
      />
    </>
  )
}
