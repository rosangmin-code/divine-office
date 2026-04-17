import { NextResponse } from 'next/server'
import { getCelebrationOptions } from '@/lib/celebrations'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ date: string }> },
) {
  const { date } = await params

  const result = getCelebrationOptions(date)
  if (!result) {
    return NextResponse.json(
      { error: `No liturgical data found for ${date}` },
      { status: 404 },
    )
  }

  return NextResponse.json(result)
}
