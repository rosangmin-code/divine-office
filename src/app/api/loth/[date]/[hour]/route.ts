import { NextResponse } from 'next/server'
import { assembleHour } from '@/lib/loth-service'
import type { HourType } from '@/lib/types'

const VALID_HOURS: HourType[] = ['lauds', 'vespers', 'compline']

export async function GET(
  request: Request,
  { params }: { params: Promise<{ date: string; hour: string }> },
) {
  const { date, hour } = await params

  if (!VALID_HOURS.includes(hour as HourType)) {
    return NextResponse.json(
      { error: `Invalid hour: ${hour}. Valid hours: ${VALID_HOURS.join(', ')}` },
      { status: 400 },
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
