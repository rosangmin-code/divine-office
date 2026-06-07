import { describe, expect, it } from 'vitest'
import { getPrayerSectionRenderKey } from '../prayer-renderer'
import type { AssembledHour } from '@/lib/types'

type Section = AssembledHour['sections'][number]

describe('PrayerRenderer candidate section keys', () => {
  const hour = { date: '2026-05-02', hourType: 'compline' } as const

  it('date-keys Marian candidate sections so selectedIndex state remounts on date nav', () => {
    const section = {
      type: 'marianAntiphon',
      title: 'Тэнгэрийн Хатан',
      text: 'Regina Caeli',
      candidates: [
        { title: 'Salve Regina', text: 'Salve' },
        { title: 'Тэнгэрийн Хатан', text: 'Regina' },
      ],
      selectedIndex: 1,
    } as Section

    expect(getPrayerSectionRenderKey(hour, section, 8)).toBe(
      'marianAntiphon-2026-05-02-compline-8',
    )
  })

  it('date-keys hymn candidate sections so hymn choices do not leak across dates', () => {
    const section = {
      type: 'hymn',
      text: 'Default hymn',
      candidates: [
        { number: 1, title: 'A', text: 'A' },
        { number: 2, title: 'B', text: 'B' },
      ],
      selectedIndex: 0,
    } as Section

    expect(getPrayerSectionRenderKey(hour, section, 1)).toBe(
      'hymn-2026-05-02-compline-1',
    )
  })

  it('keeps ordinary stateless sections index-keyed', () => {
    const section = { type: 'openingVersicle', text: 'Эзэн минь', response: 'Амен' } as Section

    expect(getPrayerSectionRenderKey(hour, section, 0)).toBe(0)
  })
})
