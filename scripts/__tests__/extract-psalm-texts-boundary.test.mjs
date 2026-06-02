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

  it('merges Ps24 uppercase continuation across page/header-noise-bounded gap', () => {
    const lines = [
      'Дуулал 24:1-10',
      'ЭЗЭНий гэрт хэн очиж болох вэ?',
      'Иаковын Тэнгэрбурхан,',
      '',
      '68',
      'Даваа гарагийн өглөө',
      '',
      'Таны царайг хайдаг хүмүүс юм.',
      'Эцэг, Хүү, Ариун Сүнсэнд жавхланг…',
    ]

    const result = extractPsalmBody(
      lines,
      0,
      'ЭЗЭНий гэрт хэн очиж болох вэ?',
      [],
      'Psalm 24:1-10',
    )

    expect(result.stanzas).toEqual([
      ['Иаковын Тэнгэрбурхан, Таны царайг хайдаг хүмүүс юм.'],
    ])
  })

  it('merges Ps29 uppercase continuation across page/header-noise-bounded gap', () => {
    const lines = [
      'Дуулал 29:1-11',
      'ЭЗЭНий дуу хоолой',
      'Сирионыг зэрлэг үхрийн тугал шиг',
      '',
      '116',
      'Мягмар гарагийн орой',
      '',
      'Тэрээр оодгонуулдаг билээ.',
      'Эцэг, Хүү, Ариун Сүнсэнд жавхланг…',
    ]

    const result = extractPsalmBody(
      lines,
      0,
      'ЭЗЭНий дуу хоолой',
      [],
      'Psalm 29:1-11',
    )

    expect(result.stanzas).toEqual([
      ['Сирионыг зэрлэг үхрийн тугал шиг Тэрээр оодгонуулдаг билээ.'],
    ])
  })

  it('preserves genuine stanza breaks when the gap is not page/header noise', () => {
    const lines = [
      'Дуулал 99:1-9',
      'ЭЗЭН бол хаан',
      'ЭЗЭН Сионд агуу бөгөөд',
      '',
      'Ард түмнүүдийн дээр өргөмжлөгдсөн.',
      'Эцэг, Хүү, Ариун Сүнсэнд жавхланг…',
    ]

    const result = extractPsalmBody(
      lines,
      0,
      'ЭЗЭН бол хаан',
      [],
      'Psalm 99:1-9',
    )

    expect(result.stanzas).toEqual([
      ['ЭЗЭН Сионд агуу бөгөөд'],
      ['Ард түмнүүдийн дээр өргөмжлөгдсөн.'],
    ])
  })

  it('preserves page/header-noise-bounded breaks after terminal punctuation', () => {
    const lines = [
      'Дуулал 33:1-9',
      'Магтаалын дуу',
      'Ятгаар Түүнд магтаал өргө.',
      '',
      '180',
      'Баасан гарагийн өглөө',
      '',
      'Шинэ дууг Түүнд дуулагтун.',
      'Эцэг, Хүү, Ариун Сүнсэнд жавхланг…',
    ]

    const result = extractPsalmBody(
      lines,
      0,
      'Магтаалын дуу',
      [],
      'Psalm 33:1-9',
    )

    expect(result.stanzas).toEqual([
      ['Ятгаар Түүнд магтаал өргө.'],
      ['Шинэ дууг Түүнд дуулагтун.'],
    ])
  })
})
