import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import invitatory from '@/data/loth/ordinarium/invitatory.json'

// @fr FR-183
//
// 초대송(Урих дуудлага) 시편의 **논리 행** 계약.
//
// 사용자 ruling (2026-10-14): 앱은 책의 인쇄행을 1:1 재현하지 않는다. 책에서
// 들여쓰기된 행은 단 폭 때문에 접힌 것이므로 **앞 행과 같은 논리 행**이고,
// 앱은 그 논리 행을 복원해 화면 폭에 맞춰 다시 접으며 접힌 줄에만 행잉
// 들여쓰기(`invitatory-section.tsx` 의 `pl-6 -indent-6`)를 준다. 시편집 본문
// (`psalter-texts.rich.json` 의 `phrases`)·복음찬가(`canticles.json` 의
// `verses`)가 이미 이 형태이고, 초대송이 FR-183 에서 여기에 합류했다.
//
// 판정 기준은 **책의 들여쓰기(PDF x 좌표)** 다 — 대문자 시작이나 문장부호가
// 아니다. 신명(`ЭЗЭН…`)이 행 중간에서 대문자로 시작해 문장 시작처럼 보이는
// 함정이 있어 특히 그렇다. 근거 인쇄면: 책 p.28-29(시편 95), p.30(시편 100),
// p.31(시편 67), p.31-32(시편 24).
//
// 재편은 regroup-only 였다 — 단어·문장부호는 한 글자도 바뀌지 않았고 행
// 경계만 옮겼다. (c) 의 해시가 그 불변식을 고정한다.

interface InvitatoryPsalm {
  ref: string
  page: number
  stanzas: string[][]
}

const PSALMS = (invitatory as { invitatoryPsalms: InvitatoryPsalm[] }).invitatoryPsalms

function psalm(ref: string): InvitatoryPsalm {
  const found = PSALMS.find((p) => p.ref === ref)
  if (!found) throw new Error(`invitatory psalm not found: ${ref}`)
  return found
}

/** 모든 공백을 하나로 접은 전체 본문 — 행 경계와 무관한 단어 동일성 지문. */
function normalisedBody(p: InvitatoryPsalm): string {
  return p.stanzas.flat().join(' ').replace(/\s+/g, ' ').trim()
}

describe('FR-183 — 초대송 시편의 논리 행', () => {
  // (a) 연별 논리 행 수. 연 경계는 **책의 빈 줄(문단)** 을 따른다 — 사용자
  //     ruling (2026-10-14): "책이 연이 더 많으면 책대로 해야 한다". 연이 곧
  //     후렴 단위라는 것은 책 자체가 증거다: 시편 95(p.28-29)는 문단마다
  //     `(Шад дуулал давтагдана)` 를 인쇄하고, 그 횟수(본문 5 + 영광송 1 = 6)가
  //     `invitatory-section.tsx` 의 렌더 규약(연마다 `AntiphonBox` 하나 +
  //     영광송 뒤 하나)과 정확히 일치한다. 시편 67·24 는 그 표시 없이 빈 줄만
  //     인쇄하지만 같은 규약을 적용해 책 문단 수에 맞췄다.
  it.each([
    { ref: 'Psalm 95:1-11', page: 28, stanzas: [2, 3, 2, 4, 3], lines: 14 },
    { ref: 'Psalm 100:1-5', page: 30, stanzas: [4, 5, 4, 4], lines: 17 },
    // 시편 67 끝의 후렴 반복 연은 2026-10-30 개정판이 넣었다(p.31, 빈 줄로 띄운 문단).
    { ref: 'Psalm 67:2-8', page: 30, stanzas: [5, 2, 3, 2, 4, 2], lines: 18 },
    { ref: 'Psalm 24:1-10', page: 31, stanzas: [4, 5, 6, 3, 3, 3, 3], lines: 27 },
  ])('$ref — 연 $stanzas, 논리 행 $lines', ({ ref, page, stanzas, lines }) => {
    const p = psalm(ref)
    expect(p.page).toBe(page)
    expect(p.stanzas.map((s) => s.length)).toEqual(stanzas)
    expect(p.stanzas.flat()).toHaveLength(lines)
  })

  // 후렴 반복 횟수 가드 — 연 개수 = 후렴 횟수(영광송 뒤 1회는 별도).
  // 시편 67 은 4→5, 시편 24 는 4→7 로 책 문단 수에 맞췄다. 시편 67 은 2026-10-30
  // 개정판이 끝 반복 연을 넣어 6 이다.
  it.each([
    { ref: 'Psalm 95:1-11', stanzaCount: 5 },
    { ref: 'Psalm 100:1-5', stanzaCount: 4 },
    { ref: 'Psalm 67:2-8', stanzaCount: 6 },
    { ref: 'Psalm 24:1-10', stanzaCount: 7 },
  ])('$ref — 연 개수 $stanzaCount (= 후렴 반복 횟수)', ({ ref, stanzaCount }) => {
    expect(psalm(ref).stanzas).toHaveLength(stanzaCount)
  })

  // (a-2) 연 경계 스냅샷 — 각 연의 첫 행. 행 수만으로는 경계가 한 칸씩
  //       밀려도 통과할 수 있어, 어느 행에서 새 연이 시작하는지를 고정한다.
  it.each([
    {
      ref: 'Psalm 95:1-11',
      heads: [
        // 앞 세 연의 첫 행은 책에서 들여쓴 연속행이 병합된 논리 행이다.
        'Ирэгтүн! ЭЗЭНд баясалтайгаар дуулцгаан, Авралынхаа хаданд баяртайгаар хашхирцгаая.',
        'ЭЗЭН бол аугаа их Тэнгэрбурхан бөгөөд Бүх бурхдын дээд аугаа Хаан юм.',
        'Ирэгтүн! Мөргөж, бөхийн, Биднийг бүтээгч ЭЗЭНий өмнө өвдөг сөгдөцгөөе.',
        'Өнөөдөр та нар Түүний дууг сонссон бол',
        'Дөчин жилийн турш Би тэр үеийнхэнд цухалдаж,',
      ],
    },
    {
      ref: 'Psalm 100:1-5',
      heads: [
        'Бүх газар дэлхий,',
        'ЭЗЭН Өөрөө бол Тэнгэрбурхан гэдгийг мэдтүгэй.',
        'Түүний дааман хаалгаар талархалтайгаар,',
        'Учир нь ЭЗЭН бол сайн.',
      ],
    },
    {
      ref: 'Psalm 67:2-8',
      heads: [
        'Тэнгэрбурхан биднийг нигүүлсэн, биднийг адисалж,',
        'Тэнгэрбурхан, Таныг ард түмнүүд магтаг.',
        'Үндэстнүүд баярлан, баяр хөөрөөр дуулаг.',
        'Тэнгэрбурхан, Таныг ард түмнүүд магтаг.',
        'Газар ургацаа ургуулан гаргажээ.',
        'Тэнгэрбурхан, Таныг ард түмнүүд магтаг.',
      ],
    },
    {
      ref: 'Psalm 24:1-10',
      heads: [
        'Газар хийгээд түүнийг дүүргэдэг бүхэн,',
        'ЭЗЭНий уул өөд хэн авирч болох вэ?',
        'Тэрээр ЭЗЭНээс ерөөлийг,',
        'Сүр жавхлангийн Хаан орж ирлээ,',
        'Сүр жавхлангийн энэ Хаан хэн бэ?',
        'Сүр жавхлангийн Хаан орж ирэхийн тулд',
        'Сүр жавхлангийн энэ Хаан хэн бэ?',
      ],
    },
  ])('$ref — 각 연의 첫 행이 책 문단 시작과 일치', ({ ref, heads }) => {
    expect(psalm(ref).stanzas.map((s) => s[0])).toEqual(heads)
  })

  // (b) 책이 들여쓴 행은 앞 행과 한 행에 들어 있어야 한다. 각 시편의 대표
  //     병합 쌍을 고정한다 — 두 조각이 **같은 문자열 안에** 있어야 통과한다.
  it.each([
    {
      ref: 'Psalm 95:1-11',
      head: 'Ирэгтүн! ЭЗЭНд баясалтайгаар дуулцгаан,',
      tail: 'Авралынхаа хаданд баяртайгаар хашхирцгаая.',
    },
    {
      ref: 'Psalm 95:1-11',
      // 신명 대문자 함정: 병합된 뒤쪽이 `Бүх` 로 시작해 새 절처럼 보인다.
      head: 'ЭЗЭН бол аугаа их Тэнгэрбурхан бөгөөд',
      tail: 'Бүх бурхдын дээд аугаа Хаан юм.',
    },
    {
      ref: 'Psalm 95:1-11',
      // 책의 flush 넘침(`бүтээсэн Нэгэн бөгөөд`)과 들여쓴 연속행이 한 행에.
      head: 'Далай ч Түүнийх. Учир нь Тэрээр түүнийг бүтээсэн Нэгэн бөгөөд',
      tail: 'Түүний мутар хуурай газрыг ч дүрсэнд оруулсан.',
    },
    {
      ref: 'Psalm 67:2-8',
      head: 'Газар дэлхийн бүх хязгаарыг',
      tail: 'Өөрөөсөө эмээдэг болгохын тулд',
    },
    {
      ref: 'Psalm 24:1-10',
      head: 'Дэлхий хийгээд түүнд оршигч бүгд',
      tail: 'ЭЗЭНийх юм.',
    },
  ])('$ref — "$tail" 는 앞 행과 같은 논리 행', ({ ref, head, tail }) => {
    const flat = psalm(ref).stanzas.flat()
    const line = flat.find((l) => l.includes(head))
    expect(line, `"${head}" 로 시작하는 행이 있어야 한다`).toBeDefined()
    expect(line).toContain(tail)
    // 분리된 채 남아 있으면 안 된다 — tail 만으로 이루어진 행은 없어야.
    expect(flat).not.toContain(tail)
  })

  // (c) regroup-only 불변식: 행 경계를 옮겨도 본문 단어는 그대로다. 해시가
  //     바뀌면 글자가 바뀐 것이므로 PDF 원문과 다시 대조해야 한다. 시편 67 은
  //     2026-10-30 개정판이 끝 반복 두 행을 더해 해시를 다시 고정했다.
  it.each([
    { ref: 'Psalm 95:1-11', sha: '85478ae5aad13bbf' },
    { ref: 'Psalm 100:1-5', sha: '1ab1bc9fcd098f63' },
    { ref: 'Psalm 67:2-8', sha: '718ab85683d9d2eb' },
    { ref: 'Psalm 24:1-10', sha: '058cb3e4dcb8c4e0' },
  ])('$ref — 본문 단어 동일성 (sha256 $sha)', ({ ref, sha }) => {
    const body = normalisedBody(psalm(ref))
    expect(createHash('sha256').update(body).digest('hex').slice(0, 16)).toBe(sha)
  })

  // 책이 들여쓰지 않은 시편은 병합이 일어나지 않아야 한다 (과잉 병합 가드).
  it('시편 100 은 책에 들여쓴 행이 없어 행 수가 그대로다', () => {
    expect(psalm('Psalm 100:1-5').stanzas.flat()).toHaveLength(17)
  })
})
