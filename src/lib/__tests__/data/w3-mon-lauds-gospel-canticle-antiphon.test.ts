import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../../../..')
const WEEK3 = 'src/data/loth/psalter/week-3.json'

function readWeek3() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, WEEK3), 'utf8'))
}

describe('Week 3 Monday Lauds gospel canticle antiphon', () => {
  it('matches the PDF text and page', () => {
    const lauds = readWeek3().days.MON.lauds

    expect(lauds.gospelCanticleAntiphon).toBe(
      'Бидний Тэнгэрбурхан Эзэн ерөөлтэй еэ!',
    )
    expect(lauds.gospelCanticleAntiphonPage).toBe(320)
  })
})
