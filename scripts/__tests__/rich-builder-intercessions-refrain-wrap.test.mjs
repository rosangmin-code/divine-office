/**
 * Regression guard for `buildIntercessionsBlocks` refrain wrapping
 * (GOAL #59 / #60 — build-script multi-element 절단 hardening).
 *
 * 원문 PDF 줄바꿈으로 refrain 한 응답이 여러 배열 원소로 쪼개질 수 있다.
 * items[0] 의 `:` 뒤 조각이 refrain 의 머리(절단)일 뿐이고 꼬리가 items[1+]
 * 로 흘러가는 경우, 기존 로직은 items[1+] 를 전부 petition 으로 처리해 refrain
 * 꼬리를 절단하고 첫 petition 을 오염시켰다(intercessions.ts #51 과 동일 계열).
 *
 * 보강: refrain 이 비어있지 않고 문장 종결부호로 끝나지 않으면(= 잘린 상태),
 * 첫 petition 경계(SEPARATOR em-dash `—`) 또는 문장 종결 전까지 후속 items 를
 * refrain 으로 누적한다. 단일 원소 refrain(이미 종결부호로 끝남)은 누적이
 * 일어나지 않아 기존 동작과 동일(무회귀).
 */

import { describe, it, expect } from 'vitest'
import { buildIntercessionsBlocks } from '../parsers/rich-builder.mjs'

/** refrain para(indent=1) 의 텍스트를 추출. */
function refrainText(blocks) {
  const refrain = blocks.find((b) => b.kind === 'para' && b.indent === 1)
  return refrain ? refrain.spans.map((s) => s.text).join('') : null
}

/** 첫 petition stanza 의 petition 줄(line 0) 텍스트. */
function firstPetitionText(blocks) {
  const stanza = blocks.find((b) => b.kind === 'stanza')
  return stanza ? stanza.lines[0].spans.map((s) => s.text).join('') : null
}

function stanzaResponseTexts(blocks) {
  return blocks
    .filter((b) => b.kind === 'stanza')
    .map((b) =>
      b.lines[1].spans
        .filter((s) => s.kind === 'text')
        .map((s) => s.text)
        .join(''),
    )
}

describe('buildIntercessionsBlocks — refrain multi-element wrapping', () => {
  it('누적: refrain 이 items[1] 로 wrapping 되면 종결부호까지 누적하고 petition 은 그 다음부터', () => {
    // items[0] 의 `:` 뒤 refrain 머리는 종결부호 없이 잘렸고, 꼬리가 items[1].
    const items = [
      'Эзэнд талархан залбирцгаая: Эзэн минь, биднийг',
      'өршөөн соёрхоорой.',
      'Бид Танд гуйя — биднийг сонсооч.',
      'Бид дахин гуйя — биднийг тэтгээч.',
    ]
    const blocks = buildIntercessionsBlocks({ items })

    // refrain 은 머리 + 꼬리가 결합되어 끝까지 표시.
    expect(refrainText(blocks)).toBe('Эзэн минь, биднийг өршөөн соёрхоорой.')

    // 꼬리(items[1]) 는 petition 으로 새지 않는다 — 첫 petition 은 items[2].
    expect(firstPetitionText(blocks)).toBe('Бид Танд гуйя')
    // petition 은 2개만(items[2], items[3]); 꼬리가 추가 petition 을 만들지 않음.
    expect(blocks.filter((b) => b.kind === 'stanza')).toHaveLength(2)
    expect(stanzaResponseTexts(blocks)).toEqual([
      'биднийг сонсооч.',
      'биднийг тэтгээч.',
    ])
  })

  it('무회귀: 단일 원소 refrain(종결부호로 끝남) 은 누적하지 않고 petition 경계 유지', () => {
    const items = [
      'Эзэнд талархан залбирцгаая: Эзэн минь, биднийг өршөөн соёрхоорой.',
      'Бид Танд гуйя — биднийг сонсооч.',
      'Бид дахин гуйя — биднийг тэтгээч.',
    ]
    const blocks = buildIntercessionsBlocks({ items })

    // refrain 은 items[0] 의 `:` 뒤 그대로 — items[1] 을 흡수하지 않는다.
    expect(refrainText(blocks)).toBe('Эзэн минь, биднийг өршөөн соёрхоорой.')
    // petition 은 items[1], items[2] 두 개 (기존 동작과 동일).
    expect(blocks.filter((b) => b.kind === 'stanza')).toHaveLength(2)
    expect(firstPetitionText(blocks)).toBe('Бид Танд гуйя')
  })

  it('경계: refrain 머리가 미종결이어도 첫 SEPARATOR(—) item 에서 멈춘다(과누적 방지)', () => {
    // refrain 머리는 종결부호가 없지만, 다음 item 이 바로 petition(— 포함)이면
    // refrain 누적은 일어나지 않고 그 item 이 첫 petition 이 된다.
    const items = [
      'Эзэнд талархан залбирцгаая: Эзэн минь',
      'Бид Танд гуйя — биднийг сонсооч.',
    ]
    const blocks = buildIntercessionsBlocks({ items })

    expect(refrainText(blocks)).toBe('Эзэн минь')
    expect(blocks.filter((b) => b.kind === 'stanza')).toHaveLength(1)
    expect(firstPetitionText(blocks)).toBe('Бид Танд гуйя')
  })

  it('누적(3원소): refrain 이 items[1], items[2] 두 원소로 wrapping 되면 끝까지 누적', () => {
    // 머리(items[0] :뒤) + 중간(items[1]) + 꼬리(items[2], 종결) 모두 미종결로
    // 이어지다 items[2] 에서 종결 → 셋이 하나의 refrain. petition 은 items[3].
    const items = [
      'Эзэнд талархан залбирцгаая: Эзэн минь, биднийг',
      'энэ өдөр Таны',
      'хайр энэрлээр дүүргээч.',
      'Бид Танд гуйя — биднийг сонсооч.',
    ]
    const blocks = buildIntercessionsBlocks({ items })

    expect(refrainText(blocks)).toBe(
      'Эзэн минь, биднийг энэ өдөр Таны хайр энэрлээр дүүргээч.',
    )
    expect(blocks.filter((b) => b.kind === 'stanza')).toHaveLength(1)
    expect(firstPetitionText(blocks)).toBe('Бид Танд гуйя')
  })

  it('무회귀(no-colon): items[0] 에 `:` 가 없어 refrain 이 비면 누적 안 하고 items[1+] 전부 petition', () => {
    // refrain 이 빈 경우(콜론 없음) `refrain && ...` 가드가 거짓 → petitionStart=1
    // 유지. items[1..] 가 그대로 petition 으로 처리되어 기존 동작과 동일.
    const items = [
      'Эзэнд талархан залбирцгаая',
      'Бид Танд гуйя — биднийг сонсооч.',
      'Бид дахин гуйя — биднийг тэтгээч.',
    ]
    const blocks = buildIntercessionsBlocks({ items })

    // refrain para 없음(콜론 없으니 refrain 미분리).
    expect(refrainText(blocks)).toBeNull()
    // petition 2개 — 어떤 item 도 refrain 으로 흡수되지 않음.
    expect(blocks.filter((b) => b.kind === 'stanza')).toHaveLength(2)
    expect(firstPetitionText(blocks)).toBe('Бид Танд гуйя')
  })

  it('parity: ellipsis "…"(U+2026) 로 끝나는 refrain 머리는 종결로 보지 않고 누적 지속', () => {
    // intercessions.ts:endsSentence 와의 parity — '…' 는 연속 표시이므로 종결로
    // 보면 안 된다. '…' 머리도 wrap 으로 간주해 꼬리(items[1]) 를 누적해야 함.
    const items = [
      'Эзэнд талархан залбирцгаая: Эзэн минь, биднийг…',
      'мөнхөд хамгаалаач.',
      'Бид Танд гуйя — биднийг сонсооч.',
    ]
    const blocks = buildIntercessionsBlocks({ items })

    // '…' 머리 + 꼬리가 결합(누적 skip 안 됨) → 꼬리가 orphan para 로 새지 않음.
    expect(refrainText(blocks)).toBe('Эзэн минь, биднийг… мөнхөд хамгаалаач.')
    expect(blocks.filter((b) => b.kind === 'stanza')).toHaveLength(1)
    expect(firstPetitionText(blocks)).toBe('Бид Танд гуйя')
  })
})
