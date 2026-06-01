import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const {
  extractPsalmBody,
  mergeColumnWraps,
  isBodySkipLine,
} = require('../extract-psalm-texts.js')

describe('extract-psalm-texts boundary guards', () => {
  it('skips the Psalm 5 uncited post-title preface before body capture', () => {
    const lines = [
      'Дуулал 5:2-10, 12-13',
      'Тусламж гуйдаг өглөөний залбирал',
      'Үгийг зүрх сэтгэлийнхээ зочин болгон, хүлээн',
      'авдаг тэдгээр нь цаглашгүй баяр баясгаланг',
      'эдлэх болно',
      'ЭЗЭН, үгэнд минь чих тавьж,',
      'Ёолохыг минь анхаараач.',
      'Эцэг, Хүү, Ариун Сүнсэнд жавхланг…',
    ]

    const result = extractPsalmBody(
      lines,
      0,
      'Тусламж гуйдаг өглөөний залбирал',
      [],
      'Psalm 5:2-10, 12-13',
    )

    expect(result.stanzas[0][0]).toBe('ЭЗЭН, үгэнд минь чих тавьж,')
    expect(result.stanzas.flat().join('\n')).not.toContain('зочин болгон')
  })

  it('excludes page-directive rubrics from captured body lines', () => {
    const lines = [
      'Дуулал 137:1-6',
      'Вавилоны гол мөрнүүдийн дэргэд',
      'Вавилоны гол мөрнүүдийн дэргэд',
      'Бид сууж, Сионыг санан уйлцгаасан.',
      'Төгсгөлийг дэг жаягийн дагуу дуусгана, х. 38.',
      'Учир нь тэнд олзлон авагчид маань',
      'Эцэг, Хүү, Ариун Сүнсэнд жавхланг…',
    ]

    expect(isBodySkipLine('Төгсгөлийг дэг жаягийн дагуу дуусгана, х. 38.')).toBe(true)

    const result = extractPsalmBody(
      lines,
      0,
      'Вавилоны гол мөрнүүдийн дэргэд',
      [],
      'Psalm 137:1-6',
    )
    const flat = result.stanzas.flat()
    expect(flat).toContain('Бид сууж, Сионыг санан уйлцгаасан.')
    expect(flat).toContain('Учир нь тэнд олзлон авагчид маань')
    expect(flat.join('\n')).not.toContain('Төгсгөлийг дэг жаягийн дагуу')
  })

  it('merges the targeted uppercase divine-name wrap into the prior invocation', () => {
    expect(mergeColumnWraps([
      'Бидний эцэг өвөг Израилийн Тэнгэрбурхан',
      'ЭЗЭН,',
      'Та мөнхийн мөнхөд магтагдах болтугай.',
    ])).toEqual([
      'Бидний эцэг өвөг Израилийн Тэнгэрбурхан ЭЗЭН,',
      'Та мөнхийн мөнхөд магтагдах болтугай.',
    ])
  })

  it('does not merge legitimate uppercase acclamation lines broadly', () => {
    expect(mergeColumnWraps([
      'Аллэлуяа!',
      'Хурганы хуримын өдөр боллоо.',
      'Түүнд зориулан сүйт бүсгүй нь гоёжээ.',
    ])).toEqual([
      'Аллэлуяа!',
      'Хурганы хуримын өдөр боллоо.',
      'Түүнд зориулан сүйт бүсгүй нь гоёжээ.',
    ])
  })
})
