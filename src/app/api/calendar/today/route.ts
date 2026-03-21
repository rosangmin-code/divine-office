import { NextResponse } from 'next/server'
import { getToday } from '@/lib/calendar'

export async function GET() {
  try {
    const today = getToday()
    return NextResponse.json(today)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get today\'s liturgical data' },
      { status: 500 },
    )
  }
}
