export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header skeleton */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-2 h-9 w-48 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-700" />
        <div className="mx-auto h-4 w-32 animate-pulse rounded bg-stone-100 dark:bg-stone-800" />
      </div>

      {/* Date nav skeleton */}
      <div className="mb-6 flex items-center justify-center gap-4">
        <div className="h-10 w-10 animate-pulse rounded-lg bg-stone-100 dark:bg-stone-800" />
        <div className="h-10 w-36 animate-pulse rounded-lg bg-stone-100 dark:bg-stone-800" />
        <div className="h-10 w-10 animate-pulse rounded-lg bg-stone-100 dark:bg-stone-800" />
      </div>

      {/* Liturgical day skeleton */}
      <div className="mb-8 animate-pulse rounded-xl bg-white p-6 shadow-sm dark:bg-neutral-900 dark:shadow-none dark:ring-1 dark:ring-stone-800">
        <div className="flex items-center gap-3">
          <div className="h-4 w-1 rounded bg-stone-200 dark:bg-stone-700" />
          <div>
            <div className="mb-2 h-5 w-40 rounded bg-stone-200 dark:bg-stone-700" />
            <div className="h-3 w-56 rounded bg-stone-100 dark:bg-stone-800" />
          </div>
        </div>
      </div>

      {/* Hour cards skeleton — single column, 3 cards */}
      <div className="space-y-4">
        {/* First card (normal) */}
        <div className="flex animate-pulse items-center gap-4 rounded-xl bg-white p-5 shadow-sm dark:bg-neutral-900 dark:shadow-none dark:ring-1 dark:ring-stone-800">
          <div className="h-7 w-7 rounded bg-stone-200 dark:bg-stone-700" />
          <div className="flex-1">
            <div className="mb-1 h-4 w-32 rounded bg-stone-200 dark:bg-stone-700" />
            <div className="h-3 w-20 rounded bg-stone-100 dark:bg-stone-800" />
          </div>
        </div>
        {/* Second card (current — larger) */}
        <div className="flex animate-pulse items-center gap-4 rounded-xl bg-white p-6 shadow-md ring-2 ring-stone-200 dark:bg-neutral-900 dark:shadow-none dark:ring-stone-700">
          <div className="h-7 w-7 rounded bg-stone-200 dark:bg-stone-700" />
          <div className="flex-1">
            <div className="mb-1 h-5 w-40 rounded bg-stone-200 dark:bg-stone-700" />
            <div className="h-3 w-20 rounded bg-stone-100 dark:bg-stone-800" />
          </div>
          <div className="h-6 w-28 rounded-full bg-stone-200 dark:bg-stone-700" />
        </div>
        {/* Third card (normal) */}
        <div className="flex animate-pulse items-center gap-4 rounded-xl bg-white p-5 shadow-sm dark:bg-neutral-900 dark:shadow-none dark:ring-1 dark:ring-stone-800">
          <div className="h-7 w-7 rounded bg-stone-200 dark:bg-stone-700" />
          <div className="flex-1">
            <div className="mb-1 h-4 w-32 rounded bg-stone-200 dark:bg-stone-700" />
            <div className="h-3 w-20 rounded bg-stone-100 dark:bg-stone-800" />
          </div>
        </div>
      </div>
    </div>
  )
}
