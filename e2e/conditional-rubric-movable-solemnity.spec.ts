import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

// GOAL #20 (#20-sub-2) — data-less movable-Solemnity psalmody + gospel-
// canticle antiphon injection + Second-Vespers (vespers2) routing (option
// B) e2e coverage, exercised through the real `/api/loth/<date>/<hour>`
// route (Next.js → assembleHour → JSON), the same path the /pray page
// renders from.
//
// This is the routing follow-up the easter spec flagged as a "future PR":
//   conditional-rubric-easter.spec.ts noted the pentecost vespers2 cell
//   "is reachable only when an upstream resolver promotes (future PR)".
//   Option B (this WI) is that promotion — so the Second Vespers now
//   actually renders on /vespers for every movable Solemnity.
//
// @fr FR-160-B-6
// @fr FR-156

interface DirectiveProbe {
  rubricId?: string
  mode?: string
  text?: string
}
interface PsalmProbe {
  reference?: string
  antiphon?: string
}
interface Section {
  type: string
  psalms?: PsalmProbe[]
  directives?: DirectiveProbe[]
  antiphon?: string
  canticle?: string
  ref?: string
}

function sec(sections: Section[], type: string): Section | undefined {
  return sections.find((s) => s.type === type)
}
function psalmRefs(sections: Section[]): string[] {
  return (sec(sections, 'psalmody')?.psalms ?? []).map((p) => p.reference ?? '')
}

const WEEK1_SUN_LAUDS = ['Psalm 63:2-9', 'Daniel 3:57-88, 56', 'Psalm 149:1-9']
const WEEK1_SUN_VESPERS = ['Psalm 110:1-5, 7', 'Psalm 114:1-8', 'Revelation 19:1-7']

interface SolCase {
  label: string
  date: string
  season: 'EASTER' | 'ORDINARY_TIME'
  nameFrag: string
  benedictus: string
  magnificat2: string
}

const SOLEMNITIES: SolCase[] = [
  { label: 'Trinity Sunday', date: DATES.trinitySundayDay2026, season: 'ORDINARY_TIME', nameFrag: 'trinity', benedictus: 'хуваагдашгүй Ариун Гурвал', magnificat2: 'бүх зүрх сэтгэл, дуу хоолойгоороо Таныг магтан' },
  { label: 'Corpus Christi', date: DATES.corpusChristiDay2026, season: 'ORDINARY_TIME', nameFrag: 'corpus', benedictus: 'Би бол тэнгэрээс бууж ирсэн амьд талх', magnificat2: 'Христ бидний амин зуулга болсон энэхүү их баяр' },
  { label: 'Sacred Heart (Friday)', date: DATES.sacredHeartDay2026, season: 'ORDINARY_TIME', nameFrag: 'sacred heart', benedictus: 'Нигүүлсэнгүй өршөөлөөр бидний Тэнгэрбурхан', magnificat2: 'Эзэн өршөөлийн амлалтаа дурсан санасан' },
  { label: 'Christ the King', date: DATES.christTheKingDay2026, season: 'ORDINARY_TIME', nameFrag: 'king', benedictus: 'Тэнгэрбурхан ба Эцэгийнхээ төлөөх тахилч нар болгосон', magnificat2: 'Тэнгэр газар дээрх бүх эрх мэдлийг Надад өгсөн' },
  { label: 'Ascension (Thursday)', date: DATES.ascensionDay2026, season: 'EASTER', nameFrag: 'ascension', benedictus: 'Би Эцэгтээ буюу та нарын Эцэгт', magnificat2: 'Ялагч Хаан, төгс хүчит Эзэн минь, өнөөдөр Та сүр жавхлангаар' },
]

test.describe('GOAL #20 — movable-Solemnity Lauds + Second Vespers (option B)', () => {
  for (const c of SOLEMNITIES) {
    test(`${c.label} lauds: borrowed Week-1 Sunday psalmody + proper Benedictus antiphon`, async ({ request }) => {
      const res = await request.get(`/api/loth/${c.date}/lauds`)
      expect(res.ok()).toBe(true)
      const body = await res.json()
      expect(body.liturgicalDay?.rank).toBe('SOLEMNITY')
      expect(String(body.liturgicalDay?.name ?? '').toLowerCase()).toContain(c.nameFrag)

      // Borrowed Week-1 Sunday Lauds psalm BODY (not a pointer note).
      expect(psalmRefs(body.sections)).toEqual(WEEK1_SUN_LAUDS)
      // Substitute affordance surfaces on psalmody.directives.
      const dir = (sec(body.sections, 'psalmody')?.directives ?? []).find((d) => d.mode === 'substitute')
      expect(dir, 'psalmody substitute directive surfaces').toBeDefined()
      // Proper Benedictus antiphon.
      const gc = sec(body.sections, 'gospelCanticle')
      expect(gc?.canticle).toBe('benedictus')
      expect(gc?.antiphon ?? '').toContain(c.benedictus)
    })

    test(`${c.label} /vespers: Second Vespers via option B — Week-1 vespers psalmody + proper Magnificat antiphon`, async ({ request }) => {
      const res = await request.get(`/api/loth/${c.date}/vespers`)
      expect(res.ok()).toBe(true)
      const body = await res.json()
      expect(String(body.liturgicalDay?.name ?? '').toLowerCase()).toContain(c.nameFrag)

      // Option B routed /vespers → the vespers2 cell: Week-1 Sunday vespers
      // psalm BODY + the Second-Vespers Magnificat antiphon.
      expect(psalmRefs(body.sections)).toEqual(WEEK1_SUN_VESPERS)
      const gc = sec(body.sections, 'gospelCanticle')
      expect(gc?.canticle).toBe('magnificat')
      expect(gc?.antiphon ?? '').toContain(c.magnificat2)
    })
  }

  test('Pentecost Sunday /vespers renders EP-II (option B): Eph 4:3-6 + EP-II Magnificat + Week-1 psalms', async ({ request }) => {
    const res = await request.get(`/api/loth/${DATES.pentecostDay2026}/vespers`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(String(body.liturgicalDay?.name ?? '').toLowerCase()).toContain('pentecost')

    const gc = sec(body.sections, 'gospelCanticle')
    expect(gc?.canticle).toBe('magnificat')
    // EP-II antiphon, NOT the EP-I "Ариун Сүнс бууж…" duplicate.
    expect(gc?.antiphon ?? '').toContain('Өнөөдөр бид Ариун Сүнсний буултын баярын')
    expect(gc?.antiphon ?? '').not.toContain('Ариун Сүнс бууж, бүх итгэгчдийн')
    // EP-II reading is Eph 4:3-6 (EP-I was Rom 8:9-11).
    expect(sec(body.sections, 'shortReading')?.ref).toBe('Eph 4:3-6')
    // Week-1 Sunday vespers psalms — NOT the running psalter week.
    expect(psalmRefs(body.sections)).toEqual(WEEK1_SUN_VESPERS)
  })

  test('NEGATIVE: a plain Ordinary-Time Sunday vespers gets NO movable-Solemnity substitute', async ({ request }) => {
    // The substitute rubrics live only inside the special-key cells, so a
    // regular OT Sunday must not borrow / surface a substitute directive.
    const res = await request.get(`/api/loth/${DATES.ordinarySunday}/vespers`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    const dirs = sec(body.sections, 'psalmody')?.directives ?? []
    expect(dirs.find((d) => d.mode === 'substitute')).toBeUndefined()
  })
})
