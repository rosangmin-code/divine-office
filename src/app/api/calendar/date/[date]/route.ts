import { NextResponse } from 'next/server'
import { getLiturgicalDay } from '@/lib/calendar'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ date: string }> },
) {
  const { date } = await params
  const day = getLiturgicalDay(date)

  if (!day) {
    return NextResponse.json(
      { error: `No liturgical data found for ${date}` },
      { status: 404 },
    )
  }

  return NextResponse.json(day)
}
