// GOAL #66 sub-2 (#68) — loading.tsx: 상시 strip 이 제거되어 하단 strip
// skeleton 도 제거(로드 직후 회색 바 노출 방지, page.tsx AC-a 와 정합).
// 본문 컨테이너 여백도 pb-16 → pb-6 로 축소.
export default function PrayLoading() {
  return (
    <>
      <div className="mx-auto max-w-2xl px-1 py-6 pb-6 lg:max-w-3xl md:px-3">
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
    </>
  )
}
