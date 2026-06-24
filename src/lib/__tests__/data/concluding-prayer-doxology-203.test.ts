// #203 (WI-212): concludingPrayer Trinitarian doxology truncation regression.
// Two user reports (book p.448 Week-4 Tue Lauds, p.828 John Baptist 06-24
// Lauds + 2nd Vespers) showed the collect ending mid-petition with the
// closing Trinitarian doxology lost to a PDF-extraction page break.
// This guards the restored text at the production assembler boundary
// (buildConcludingPrayerFields → HourSection.text, which the
// ConcludingPrayerSection component renders verbatim in a <p>).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  buildConcludingPrayerFields,
  shouldUseAlternateConcludingPrayer,
} from '../../hours/concluding-prayer'
import type { LiturgicalDayInfo, DayOfWeek } from '../../types'

// Standard collect doxology (full_pdf.txt p.448 L15499-15502 / p.828 L28144-47).
const STD_DOXOLOGY =
  'Тантай, Ариун Сүнсний нэгдэлтэй, үүрд мөнх оршин хаанчилдаг Тэнгэрбурхан Есүс Христ бидний Эзэн, Таны Хүүгээр уламжлан тийн болтугай.'
// John Baptist First Vespers short doxology variant (full_pdf.txt p.827 L28117-19).
const FV_DOXOLOGY =
  'Тэрээр Тантай, Ариун Сүнсний нэгдэлтэй, үүрд мөнх оршин хаанчилдаг цорын ганц Тэнгэрбурхан билээ.'

const week4 = JSON.parse(
  readFileSync(resolve('src/data/loth/psalter/week-4.json'), 'utf8'),
)
const solemnities = JSON.parse(
  readFileSync(resolve('src/data/loth/sanctoral/solemnities.json'), 'utf8'),
)

// Resolve the concludingPrayer text the renderer actually receives, through
// the real production assembler (primary↔alternate swap included).
function renderedText(
  primaryText: string,
  day: LiturgicalDayInfo,
  dow: DayOfWeek,
  alternateText?: string,
): string {
  const swap = shouldUseAlternateConcludingPrayer(day, dow)
  return buildConcludingPrayerFields({ primaryText, alternateText }, swap).text
}

const OT_WEEKDAY = { season: 'ORDINARY_TIME', psalterWeek: 4 } as LiturgicalDayInfo
const SOLEMNITY_WEEKDAY = {
  season: 'ORDINARY_TIME',
  rank: 'SOLEMNITY',
} as unknown as LiturgicalDayInfo

describe('#203 concludingPrayer Trinitarian doxology (truncation regression)', () => {
  it('Week-4 Tuesday Lauds (book p.448) renders the full doxology', () => {
    const text = renderedText(week4.days.TUE.lauds.concludingPrayer, OT_WEEKDAY, 'TUE')
    expect(text.endsWith(STD_DOXOLOGY)).toBe(true)
  })

  it('John Baptist 06-24 Lauds (book p.828) renders the full doxology', () => {
    const e = solemnities['06-24']
    const text = renderedText(
      e.lauds.concludingPrayer,
      SOLEMNITY_WEEKDAY,
      'WED',
      e.lauds.alternativeConcludingPrayer,
    )
    expect(text.endsWith(STD_DOXOLOGY)).toBe(true)
  })

  it('John Baptist 06-24 Second Vespers (book p.828) renders the full doxology', () => {
    const e = solemnities['06-24']
    const text = renderedText(
      e.vespers2.concludingPrayer,
      SOLEMNITY_WEEKDAY,
      'WED',
      e.vespers2.alternativeConcludingPrayer,
    )
    expect(text.endsWith(STD_DOXOLOGY)).toBe(true)
  })

  it('John Baptist 06-24 First Vespers keeps its complete short doxology', () => {
    expect(
      solemnities['06-24'].firstVespers.concludingPrayer.endsWith(FV_DOXOLOGY),
    ).toBe(true)
  })
})
