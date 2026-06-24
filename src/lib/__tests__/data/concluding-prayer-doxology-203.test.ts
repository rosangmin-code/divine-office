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
const memorials = JSON.parse(
  readFileSync(resolve('src/data/loth/sanctoral/memorials.json'), 'utf8'),
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

// WI-215 (#203-sub-3): systemic remainder — same truncation across 4 more
// days/feasts. All 7 render the PRIMARY concludingPrayer by default:
// week-4 FRI vespers = OT weekday (no swap); 11-02/deceased = MEMORIAL rank
// (shouldUseAlternateConcludingPrayer requires SOLEMNITY → no swap even though
// an alternate exists); 03-19 St Joseph = SOLEMNITY weekday but has NO
// alternate → buildConcludingPrayerFields returns the primary.
const MEMORIAL_WEEKDAY = {
  season: 'ORDINARY_TIME',
  rank: 'MEMORIAL',
} as unknown as LiturgicalDayInfo

describe('#203 WI-215 concludingPrayer doxology — systemic remainder (7 surfaces)', () => {
  it('Week-4 Friday Vespers (book p.502→503 page break) renders the full doxology', () => {
    const text = renderedText(week4.days.FRI.vespers.concludingPrayer, OT_WEEKDAY, 'FRI')
    expect(text.endsWith(STD_DOXOLOGY)).toBe(true)
  })

  for (const key of ['11-02', 'deceased']) {
    for (const hour of ['lauds', 'vespers']) {
      it(`Office for the Dead ${key} ${hour} renders the full doxology (book p.852)`, () => {
        const e = memorials[key][hour]
        // MEMORIAL rank → no swap → primary is the default text even though an
        // alternativeConcludingPrayer is present on some hours.
        const text = renderedText(
          e.concludingPrayer,
          MEMORIAL_WEEKDAY,
          'MON',
          e.alternativeConcludingPrayer,
        )
        expect(text.endsWith(STD_DOXOLOGY)).toBe(true)
      })
    }
  }

  for (const hour of ['lauds', 'vespers2']) {
    it(`St Joseph 03-19 ${hour} renders the short doxology variant (book p.824)`, () => {
      const text = renderedText(
        solemnities['03-19'][hour].concludingPrayer,
        SOLEMNITY_WEEKDAY,
        'WED',
      )
      expect(text.endsWith(FV_DOXOLOGY)).toBe(true)
    })
  }

  it('St Joseph 03-19 dead plain "vespers" key is NOT rendered (swapped to vespers2) and left untouched', () => {
    // loth-service swaps hour=vespers → sanctoral.vespers2 for fixed-date
    // solemnities, so the plain key never reaches the renderer; it stays as the
    // truncated source and is correctly out of scope.
    expect(solemnities['03-19'].vespers.concludingPrayer.includes('нэгдэлтэй')).toBe(false)
  })
})
