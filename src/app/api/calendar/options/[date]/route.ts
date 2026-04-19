import { NextResponse } from 'next/server'
import { getCelebrationOptions } from '@/lib/celebrations'
import { isValidDateStr } from '@/lib/date-validation'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ date: string }> },
) {
  const { date } = await params

  if (!isValidDateStr(date)) {
    return NextResponse.json(
      { error: `Invalid date: ${date}. Expected YYYY-MM-DD.` },
      { status: 400 },
    )
  }

  const result = getCelebrationOptions(date)
  if (!result) {
    return NextResponse.json(
      { error: `No liturgical data found for ${date}` },
      { status: 404 },
    )
  }

  return NextResponse.json(result)
}
