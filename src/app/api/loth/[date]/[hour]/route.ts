import { NextResponse } from 'next/server'
import { assembleHour } from '@/lib/loth-service'
import type { HourType } from '@/lib/types'

const VALID_HOURS: HourType[] = [
  'officeOfReadings', 'lauds', 'terce', 'sext', 'none', 'vespers', 'compline',
]

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ date: string; hour: string }> },
) {
  const { date, hour } = await params

  if (!VALID_HOURS.includes(hour as HourType)) {
    return NextResponse.json(
      { error: `Invalid hour: ${hour}. Valid hours: ${VALID_HOURS.join(', ')}` },
      { status: 400 },
    )
  }

  const assembled = await assembleHour(date, hour as HourType)

  if (!assembled) {
    return NextResponse.json(
      { error: `No data found for ${date}` },
      { status: 404 },
    )
  }

  return NextResponse.json(assembled)
}
