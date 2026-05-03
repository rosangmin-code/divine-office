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
    return NextResponse.json(
      {
        error: `${hour} is not available for ${date}: the date does not carry First Vespers content (must be a Sunday, or a Solemnity/Feast with firstVespers data).`,
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
