import { notFound } from 'next/navigation'
import { isValidDateStr } from '@/lib/date-validation'
import { isValidHourType, isEveHourType } from '@/lib/hour-validation'
import { isFirstVespersEligibleDate } from '@/lib/loth-service'

/**
 * URL validation gate for `/pray/{date}/{hour}`.
 *
 * These checks live in the *layout* rather than the page because `loading.tsx`
 * wraps only the page:
 *
 *     <Layout>            ← runs here, before anything is flushed
 *       <Suspense fallback={<Loading/>}>
 *         <Page/>         ← a notFound() thrown here arrives after the headers
 *       </Suspense>
 *     </Layout>
 *
 * A `notFound()` raised inside the Suspense boundary streams the 404 body with
 * a **200** status line, because the shell has already gone out. Raising it in
 * the layout keeps the status code correct (app-review 2026-09-13 §2 HTTP
 * smoke: `/pray/2026-02-29/lauds` answered 200).
 *
 * The same reason is why the home-page skeleton lives in the `(home)` route
 * group — a root-level `loading.tsx` would re-introduce the boundary above
 * every route, including this one.
 */
export default async function PrayLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ date: string; hour: string }>
}) {
  const { date, hour } = await params

  if (!isValidDateStr(date)) {
    notFound()
  }

  if (!isValidHourType(hour)) {
    notFound()
  }

  // #242 F-X5 FU#2 — firstVespers/firstCompline URLs on dates that carry no
  // First Vespers content (ordinary weekdays with no Solemnity/Feast). Without
  // this gate the URL silently returned an out-of-rubric Sunday-vespers
  // fallback. The eligibility check is independent of `assembleHour`, and the
  // yearly calendar it reads is memoized, so running it here costs a lookup.
  if (isEveHourType(hour) && !isFirstVespersEligibleDate(date)) {
    notFound()
  }

  return <>{children}</>
}
