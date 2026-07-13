import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../../../..')
const PSALTER = 'src/data/loth/psalter'

function readWeek(week: number) {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, `${PSALTER}/week-${week}.json`), 'utf8'),
  )
}

describe('Psalter gospel canticle antiphon PDF regressions', () => {
  it('keeps the complete Week 1 Monday Lauds antiphon', () => {
    const lauds = readWeek(1).days.MON.lauds

    expect(lauds.gospelCanticleAntiphon).toBe(
      'Эзэн бидний Тэнгэрбурхан магтагдах болтугай.',
    )
    expect(lauds.gospelCanticleAntiphonPage).toBe(82)
  })

  it('keeps the complete Week 2 Saturday Lauds antiphon', () => {
    const lauds = readWeek(2).days.SAT.lauds

    expect(lauds.gospelCanticleAntiphon).toBe(
      'Эзэн, бидний хөлийг амар амгалангийн зам мөрөөр хөтөлнө үү.',
    )
    expect(lauds.gospelCanticleAntiphonPage).toBe(285)
  })

  it('keeps the complete Week 3 Monday Lauds antiphon', () => {
    const lauds = readWeek(3).days.MON.lauds

    expect(lauds.gospelCanticleAntiphon).toBe(
      'Бидний Тэнгэрбурхан Эзэн ерөөлтэй еэ!',
    )
    expect(lauds.gospelCanticleAntiphonPage).toBe(320)
  })
})
