import { describe, expect, it } from 'vitest'

import { assembleHour } from '../../loth-service'
import type { AssembledPsalm, HourType, PrayerText } from '../../types'

// Expected text comes from the printed prayers in the 2026-11-02 PDF,
// independently checked in docs/research/pdf-recheck-2026-11-03/errata/
// app-prayer-independent-review.json and its page images (pp.87,126,163,394).
// Keep the book text here rather than importing the app's canonical data:
// plain/rich parity alone passed while both copies had the wrong owner.
const BOOK_PRAYERS = {
  ps15: 'Эзэн, бидний амьдралыг өөгүй гэм зэмгүй болгож өгнө үү. Бидэнд зөвийг үйлдэж, үнэнийг ярихад тусална уу. Ингэснээр бид Таны асарт оршин сууж, Таны ариун ууланд амьдран суух боломжтой болно.',
  ps57: 'Эзэн минь, Та биднийг чөтгөрийн занганаас аврахаар өршөөл ба үнэнээ илгээнэ үү. Ингэснээр Таны Хүүгийн анд нөхөд хэмээн танигдаж байгаадаа баяртай бид ард түмний дунд Таныг магтаж, үндэстнүүдийн дунд Таныг тунхаглах болно.',
  ps117: 'Тэнгэрбурхан, Эцэг минь, бүх үндэстэн болон бүх ард түмэн Таныг магтах болтугай. Тантай үүрд мөнхөд хамт амьдардаг, мөн итгэмжит бөгөөд үнэнч гэж нэрлэгддэг Есүс хүмүүн бидний зүрх сэтгэлийг үүрд эзэмших болтугай.',
} as const

const normalise = (text: string) => text.replace(/\s+/g, ' ').trim()

function richBody(content: PrayerText | undefined): string {
  if (!content) return ''
  return normalise(content.blocks.flatMap((block) => {
    if (block.kind === 'para') return [block.spans.map((span) => span.text).join('')]
    if (block.kind === 'stanza') {
      return block.lines.map((line) => line.spans.map((span) => span.text).join(''))
    }
    if (block.kind === 'rubric-line') return [block.text]
    return []
  }).join(' '))
}

async function psalmsFor(date: string, hour: HourType): Promise<AssembledPsalm[]> {
  const assembled = await assembleHour(date, hour)
  const psalmody = assembled?.sections.find((section) => section.type === 'psalmody')
  if (!psalmody || psalmody.type !== 'psalmody') {
    throw new Error(`${date}/${hour}: psalmody missing`)
  }
  return psalmody.psalms
}

const PLACEMENTS = [
  { date: '2026-01-12', hour: 'vespers', ref: 'Psalm 15:1-5', index: 1, prayerPage: 87, text: BOOK_PRAYERS.ps15 },
  { date: '2026-01-15', hour: 'lauds', ref: 'Psalm 57:2-12', index: 0, prayerPage: 126, text: BOOK_PRAYERS.ps57 },
  { date: '2026-01-17', hour: 'lauds', ref: 'Psalm 117:1-2', index: 2, prayerPage: 163, text: BOOK_PRAYERS.ps117 },
  { date: '2026-01-31', hour: 'lauds', ref: 'Psalm 117:1-2', index: 2, prayerPage: 394, text: BOOK_PRAYERS.ps117 },
] as const

describe('printed psalm prayers belong to their psalm in assembled hours', () => {
  // @fr FR-153h
  it.each(PLACEMENTS)('$date/$hour — $ref has its complete book prayer and p.$prayerPage link', async (expected) => {
    const psalms = await psalmsFor(expected.date, expected.hour)
    const owner = psalms[expected.index]

    expect(owner.reference).toBe(expected.ref)
    expect(owner.psalmPrayer).toBe(expected.text)
    expect(owner.psalmPrayerPage).toBe(expected.prayerPage)
    expect(owner.psalmPrayerRich).toBeDefined()
    expect(richBody(owner.psalmPrayerRich)).toBe(expected.text)

    // A prayer must not also survive on the neighbouring canticle after
    // being restored to its psalm (the former plain and rich bug).
    expect(psalms.filter((psalm) => psalm.psalmPrayer === expected.text))
      .toHaveLength(1)
    expect(psalms.filter((psalm) => richBody(psalm.psalmPrayerRich) === expected.text))
      .toHaveLength(1)
  })

  // @fr FR-032
  it.each([
    { date: '2026-01-15', ref: 'Jeremiah 31:10-14', index: 1, owner: 'Psalm 57:2-12', ownerIndex: 0 },
    { date: '2026-01-17', ref: 'Exodus 15:1-4a, 8-13, 17-18', index: 1, owner: 'Psalm 117:1-2', ownerIndex: 2 },
  ])('$date/lauds — $ref has no prayer borrowed from $owner', async (expected) => {
    const psalms = await psalmsFor(expected.date, 'lauds')
    const canticle = psalms[expected.index]

    // The PDF moves directly from this canticle's doxology to the next
    // psalm antiphon (pp.128 and 162), without a prayer in between.
    expect(canticle.reference).toBe(expected.ref)
    expect(canticle.psalmType).toBe('canticle')
    expect(canticle.psalmPrayer).toBeUndefined()
    expect(canticle.psalmPrayerRich).toBeUndefined()
    expect(canticle.psalmPrayerPage).toBeUndefined()
    expect(psalms[expected.ownerIndex].reference).toBe(expected.owner)
  })
})
