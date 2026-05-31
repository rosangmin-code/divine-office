import { describe, it, expect } from 'vitest'
import { assembleHour } from '../loth-service'
import type { AssembledHour, HourSection } from '../types'

// GOAL #20 (#20-sub-2) — data-less movable-Solemnity psalmody + gospel-
// canticle antiphon injection + Pentecost EP-II (vespers2) routing (option
// B) + runaway-parse contamination truncation (6 cells).
//
// L2 integration assertions against the REAL assembler (assembleHour) +
// REAL propers/psalter JSON — no mocks. They prove the user-perceptible
// outcome: the five data-less Solemnities (Trinity, Corpus Christi, Sacred
// Heart, Christ the King, Ascension) now render the borrowed Week-1 Sunday
// psalmody (psalm BODY, not a pointer note) under their proper Magnificat/
// Benedictus antiphon, and the Solemnity's own day /vespers renders the
// correct Second Vespers.

function section<T extends HourSection['type']>(
  hour: AssembledHour,
  type: T,
): Extract<HourSection, { type: T }> {
  const s = hour.sections.find((x) => x.type === type)
  if (!s) throw new Error(`section ${type} not found`)
  return s as Extract<HourSection, { type: T }>
}

function psalmRefs(hour: AssembledHour): string[] {
  return section(hour, 'psalmody').psalms.map((p) => p.reference)
}

// A psalm renders its BODY either as poetic `stanzas` (PDF source) or as
// fallback `verses`. Either non-empty means the body is inlined (not a
// directive-only pointer note).
function hasBody(hour: AssembledHour, idx: number): boolean {
  const p = section(hour, 'psalmody').psalms[idx]
  return (p.stanzas?.length ?? 0) > 0 || p.verses.length > 0
}

const WEEK1_SUN_LAUDS = ['Psalm 63:2-9', 'Daniel 3:57-88, 56', 'Psalm 149:1-9']
const WEEK1_SUN_VESPERS = ['Psalm 110:1-5, 7', 'Psalm 114:1-8', 'Revelation 19:1-7']
const TRINITY_FIRST_VESPERS = ['Psalm 113:1-9', 'Psalm 147:12-20', 'Ephesians 1:3-10']

interface Sol {
  name: string
  date: string // the Solemnity's own day (2026)
  nameFrag: string // lowercase fragment of liturgicalDay.name
  benedictus: string // Lauds gospel-canticle antiphon fragment
  magnificat2: string // Second Vespers gospel-canticle antiphon fragment
}

// Dates verified against this project's romcal calendar (2026):
//   Trinity 05-31 SUN · Ascension 05-14 THU · Corpus Christi 06-07 SUN ·
//   Sacred Heart 06-12 FRI · Christ the King 11-22 SUN.
// Sacred Heart (Fri) + Ascension (Thu) are weekday Solemnities — they
// exercise the season-only vespers2 `when` (no dayOfWeek:SUN gate) +
// SUN-slot block fallback.
const SOLEMNITIES: Sol[] = [
  {
    name: 'Trinity Sunday',
    date: '2026-05-31',
    nameFrag: 'trinity',
    benedictus: 'хуваагдашгүй Ариун Гурвал',
    magnificat2: 'бүх зүрх сэтгэл, дуу хоолойгоороо Таныг магтан',
  },
  {
    name: 'Corpus Christi',
    date: '2026-06-07',
    nameFrag: 'corpus',
    benedictus: 'Би бол тэнгэрээс бууж ирсэн амьд талх',
    magnificat2: 'Христ бидний амин зуулга болсон энэхүү их баяр',
  },
  {
    name: 'Sacred Heart',
    date: '2026-06-12',
    nameFrag: 'sacred heart',
    benedictus: 'Нигүүлсэнгүй өршөөлөөр бидний Тэнгэрбурхан',
    magnificat2: 'Эзэн өршөөлийн амлалтаа дурсан санасан',
  },
  {
    name: 'Christ the King',
    date: '2026-11-22',
    nameFrag: 'king',
    benedictus: 'Тэнгэрбурхан ба Эцэгийнхээ төлөөх тахилч нар болгосон',
    magnificat2: 'Тэнгэр газар дээрх бүх эрх мэдлийг Надад өгсөн',
  },
  {
    name: 'Ascension',
    date: '2026-05-14',
    nameFrag: 'ascension',
    benedictus: 'Би Эцэгтээ буюу та нарын Эцэгт',
    magnificat2: 'Ялагч Хаан, төгс хүчит Эзэн минь, өнөөдөр Та сүр жавхлангаар',
  },
]

describe.each(SOLEMNITIES)(
  'data-less movable Solemnity — $name ($date)',
  ({ date, nameFrag, benedictus, magnificat2 }) => {
    it('Lauds: proper Benedictus antiphon + Week-1 Sunday lauds psalm BODY', async () => {
      const h = await assembleHour(date, 'lauds')
      expect(h).not.toBeNull()
      expect(h!.liturgicalDay.name.toLowerCase()).toContain(nameFrag)
      expect(h!.liturgicalDay.rank).toBe('SOLEMNITY')

      const gc = section(h!, 'gospelCanticle')
      expect(gc.canticle).toBe('benedictus')
      expect(gc.antiphon).toContain(benedictus)

      expect(psalmRefs(h!)).toEqual(WEEK1_SUN_LAUDS)
      expect(hasBody(h!, 0)).toBe(true)
    })

    it('Second Vespers (/vespers): proper Magnificat antiphon + Week-1 Sunday vespers psalm BODY', async () => {
      const h = await assembleHour(date, 'vespers')
      expect(h).not.toBeNull()
      expect(h!.liturgicalDay.name.toLowerCase()).toContain(nameFrag)

      const gc = section(h!, 'gospelCanticle')
      expect(gc.canticle).toBe('magnificat')
      expect(gc.antiphon).toContain(magnificat2)

      expect(psalmRefs(h!)).toEqual(WEEK1_SUN_VESPERS)
      expect(hasBody(h!, 0)).toBe(true)
    })
  },
)

describe('Trinity Sunday (2026-05-31) — concludingPrayer injection', () => {
  it('/firstVespers renders Trinity proper psalmody without stale page anchors', async () => {
    const h = await assembleHour('2026-05-31', 'firstVespers')
    expect(h).not.toBeNull()

    const psalmody = section(h!, 'psalmody')
    expect(psalmRefs(h!)).toEqual(TRINITY_FIRST_VESPERS)
    expect(psalmRefs(h!)).not.toContain('Psalm 114:1-8')
    expect(psalmody.psalms.every((p) => p.page == null)).toBe(true)
    expect(psalmody.psalms.every((p) => p.antiphon === '')).toBe(true)
    expect(hasBody(h!, 0)).toBe(true)
    expect(hasBody(h!, 1)).toBe(true)
    expect(hasBody(h!, 2)).toBe(true)
  })

  it('/vespers renders Second Vespers collect with optional prayer metadata', async () => {
    const h = await assembleHour('2026-05-31', 'vespers')
    expect(h).not.toBeNull()

    const cp = section(h!, 'concludingPrayer')
    expect(cp.text).toContain('Өөрийн Үгийг илгээсэн')
    expect(cp.alternateText).toContain('Төгс хүчит Эцэг')
    expect(cp.page).toBe(745)
    expect(cp.alternatePage).toBe(748)

    expect(psalmRefs(h!)).toEqual(WEEK1_SUN_VESPERS)
    expect(psalmRefs(h!)).toContain('Psalm 114:1-8')
    expect(psalmRefs(h!)).not.toEqual(TRINITY_FIRST_VESPERS)
  })

  it('/lauds renders Trinity collect with optional prayer metadata', async () => {
    const h = await assembleHour('2026-05-31', 'lauds')
    expect(h).not.toBeNull()

    const cp = section(h!, 'concludingPrayer')
    expect(cp.text).toContain('Өөрийн Үгийг илгээсэн')
    expect(cp.alternateText).toContain('Төгс хүчит Эцэг')
    expect(cp.page).toBe(745)
    expect(cp.alternatePage).toBe(748)

    expect(psalmRefs(h!)).toEqual(WEEK1_SUN_LAUDS)
  })
})

describe('runaway-parse contamination truncated (firstVespers prayers)', () => {
  // The five Solemnities + Pentecost: their firstVespers concluding /
  // alternative-concluding prayer previously swallowed the whole Second
  // Vespers office + next-Solemnity header. None may carry the marker
  // string of a swallowed Second-Vespers office anymore.
  const FV_DATES = [
    '2026-05-31', // Trinity
    '2026-06-07', // Corpus
    '2026-06-12', // Sacred Heart
    '2026-11-22', // Christ the King
    '2026-05-14', // Ascension
    '2026-05-24', // Pentecost
  ]
  it.each(FV_DATES)('firstVespers %s prayers are clean', async (date) => {
    const h = await assembleHour(date, 'firstVespers')
    expect(h).not.toBeNull()
    const cp = section(h!, 'concludingPrayer')
    const blob = `${cp.text ?? ''}\n${cp.alternateText ?? ''}`
    expect(blob).not.toContain('2 дугаар Оройн даатгал залбирал')
    expect(blob).not.toContain('Эзэний баяр')
    // No swallowed next-Solemnity ALL-CAPS headers.
    expect(blob).not.toContain('ТУЙЛЫН АРИУН НАНДИН')
    expect(blob).not.toContain('ПЭНТИКОСТ АРИУН СҮНСНИЙ БУУЛТ')
    expect(blob).not.toContain('ГЭГЭЭНТНҮҮДИЙН ОНЦЛОГ ШИНЖ')
  })
})

describe('Pentecost Sunday (2026-05-24) — EP-II vespers2 routing (option B)', () => {
  it('/vespers renders Second Vespers (EP-II): Eph 4:3-6 reading + EP-II Magnificat + Week-1 psalms', async () => {
    const h = await assembleHour('2026-05-24', 'vespers')
    expect(h).not.toBeNull()
    expect(h!.liturgicalDay.name.toLowerCase()).toContain('pentecost')

    // EP-II Magnificat antiphon — NOT the EP-I "Ариун Сүнс бууж…" duplicate.
    const gc = section(h!, 'gospelCanticle')
    expect(gc.canticle).toBe('magnificat')
    expect(gc.antiphon).toContain('Өнөөдөр бид Ариун Сүнсний буултын баярын')
    expect(gc.antiphon).not.toContain('Ариун Сүнс бууж, бүх итгэгчдийн')

    // EP-II short reading is Eph 4:3-6 (EP-I was Rom 8:9-11).
    const sr = section(h!, 'shortReading')
    expect(sr.ref).toBe('Eph 4:3-6')

    // Week-1 SUN vespers psalmody (Ps110/Ps114/Rev19) — NOT the running
    // psalter week (week-4 = Ps110/Ps112/Rev19). The Ps114 vs Ps112
    // distinction is the single-psalm tell from WI-21 §2.4.
    expect(psalmRefs(h!)).toEqual(WEEK1_SUN_VESPERS)
  })
})
