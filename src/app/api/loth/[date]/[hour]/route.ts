import { NextResponse } from 'next/server'
import { assembleHour, isFirstVespersEligibleDate } from '@/lib/loth-service'
import { isValidDateStr } from '@/lib/date-validation'
import type { HourType } from '@/lib/types'

const VALID_HOURS: HourType[] = ['lauds', 'vespers', 'compline', 'firstVespers', 'firstCompline']

export async function GET(
  request: Request,
  { params }: { params: Promise<{ date: string; hour: string }> },
) {
  const { date, hour } = await params

  if (!isValidDateStr(date)) {
    return NextResponse.json(
      { error: `Invalid date: ${date}. Expected YYYY-MM-DD.` },
      { status: 400 },
    )
  }

  if (!VALID_HOURS.includes(hour as HourType)) {
    return NextResponse.json(
      { error: `Invalid hour: ${hour}. Valid hours: ${VALID_HOURS.join(', ')}` },
      { status: 400 },
    )
  }

  // #242 F-X5 FU#2 — 404 gate for firstVespers/firstCompline routes on
  // dates that do NOT carry First Vespers content. Mirrors the page.tsx
  // gate so the API surface and SSR surface stay aligned.
  if (
    (hour === 'firstVespers' || hour === 'firstCompline') &&
    !isFirstVespersEligibleDate(date)
  ) {
    // #247 NIT-3 — UX hint: a typical direct-URL miss (e.g. typing
    // /api/loth/2022-12-24/firstVespers expecting Christmas Eve) lands
    // here because the firstVespers content lives on the celebration
    // date itself (post-#230 F-X5: Sat Dec 24 → Sun/Christmas URL).
    // Surface the next-day URL so the caller can self-correct without
    // having to re-derive the rubric. We deliberately do NOT redirect
    // (`303`) — caching/SW semantics make a JSON 404+hint safer than
    // a server-issued redirect that could pin the wrong URL.
    const nextDate = new Date(date + 'T00:00:00Z')
    nextDate.setUTCDate(nextDate.getUTCDate() + 1)
    const nextStr = nextDate.toISOString().slice(0, 10)
    return NextResponse.json(
      {
        error: `${hour} is not available for ${date}: the date does not carry First Vespers content (must be a Sunday, or a Solemnity/Feast with firstVespers data).`,
        hint: `Try /api/loth/${nextStr}/${hour} — the celebration's First Vespers/Compline lives on the celebration date itself (post-#230 F-X5).`,
      },
      { status: 404 },
    )
  }

  const celebrationId = new URL(request.url).searchParams.get('celebration')
  const assembled = await assembleHour(date, hour as HourType, { celebrationId })

  if (!assembled) {
    return NextResponse.json(
      { error: `No data found for ${date}` },
      { status: 404 },
    )
  }

  return NextResponse.json(assembled)
}
