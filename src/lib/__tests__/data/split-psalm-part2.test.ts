import { describe, expect, it } from 'vitest'

import week1 from '@/data/loth/psalter/week-1.json'
import week2 from '@/data/loth/psalter/week-2.json'
import week3 from '@/data/loth/psalter/week-3.json'
import week4 from '@/data/loth/psalter/week-4.json'
import psalterTexts from '@/data/loth/psalter-texts.json'
import psalterTextsRich from '@/data/loth/prayers/commons/psalter-texts.rich.json'
import psalterHeaders from '@/data/loth/prayers/commons/psalter-headers.rich.json'

// 2026-08-08 회귀 방지 — docs/bug-reports/2026-08-08-split-psalm-part2-missing.md
//
// 긴 시편은 책에서 I부 / II부로 나뉘어 인쇄되고 각 부에 고유 후렴이 붙는다.
// week-*.json 의 두 슬롯이 같은 `ref` 를 들고 있으면 `resolvePsalm` 이 같은
// 본문을 두 번 내려 **I부가 두 번 렌더되고 II부가 사라진다**. 후렴과
// `antiphonPage` 는 II부 것이 맞게 들어 있어 겉보기로는 정상이라 눈으로
// 잡히지 않았고, `verify-psalter-pages.js` 도 두 슬롯의 `page` 가 같으면
// 이상을 못 느껴 5건 중 1건만(그것도 쪽 오류로 오진해서) 걸렸다.
//
// 그래서 다음 두 가지를 데이터 불변식으로 고정한다:
//   (1) 한 시간전례 안에서 동일 `ref` 가 두 번 나오지 않는다
//   (2) 참조된 모든 `ref` 는 plain·rich 본문이 실제로 존재한다
//       — ref 중복이 "본문 없음" 을 가려 왔으므로 (1) 만으로는 부족하다.

type PsalmEntry = {
  type?: string
  ref?: string
  psalmPrayer?: string
  psalmPrayerPage?: number
  gloria_patri?: boolean
  continuesInNextPart?: boolean
}
type Hour = { psalms?: PsalmEntry[] }
type Day = Record<string, Hour>
type WeekFile = { days?: Record<string, Day> } & Record<string, unknown>

const WEEKS: [number, WeekFile][] = [
  [1, week1 as WeekFile],
  [2, week2 as WeekFile],
  [3, week3 as WeekFile],
  [4, week4 as WeekFile],
]

const plainTexts = psalterTexts as Record<
  string,
  { stanzas?: string[][]; psalmPrayer?: string; psalmPrayerPage?: number }
>
const richTexts = psalterTextsRich as Record<
  string,
  { stanzasRich?: { blocks?: unknown[] }; psalmPrayerRich?: unknown }
>

/** 모든 (week, day, hour) 의 psalms[] 를 평평하게 훑는다. */
function* eachHour(): Generator<{
  week: number
  day: string
  hour: string
  psalms: PsalmEntry[]
}> {
  for (const [week, file] of WEEKS) {
    const days = (file.days ?? file) as Record<string, Day>
    for (const [day, hours] of Object.entries(days)) {
      if (!hours || typeof hours !== 'object') continue
      for (const [hour, node] of Object.entries(hours)) {
        const psalms = (node as Hour)?.psalms
        if (Array.isArray(psalms)) yield { week, day, hour, psalms }
      }
    }
  }
}

describe('split psalm Part II data invariants', () => {
  // @fr NFR-009c
  it('한 시간전례 안에 동일 ref 가 중복되지 않는다', () => {
    const duplicates: string[] = []
    for (const { week, day, hour, psalms } of eachHour()) {
      const seen = new Map<string, number>()
      for (const p of psalms) {
        if (!p?.ref) continue
        seen.set(p.ref, (seen.get(p.ref) ?? 0) + 1)
      }
      for (const [ref, n] of seen) {
        if (n > 1) duplicates.push(`week-${week} ${day} ${hour}: ${ref} ×${n}`)
      }
    }
    expect(duplicates).toEqual([])
  })

  // @fr NFR-009c
  it('참조된 모든 시편 ref 에 plain·rich 본문이 존재한다', () => {
    const missing: string[] = []
    for (const { week, day, hour, psalms } of eachHour()) {
      for (const [i, p] of psalms.entries()) {
        if (!p?.ref) continue
        const where = `week-${week} ${day} ${hour} psalms[${i}] ${p.ref}`
        if (!plainTexts[p.ref]?.stanzas?.length) missing.push(`${where} — plain 없음`)
        if (!richTexts[p.ref]?.stanzasRich?.blocks?.length) {
          missing.push(`${where} — rich 없음`)
        }
      }
    }
    expect(missing).toEqual([])
  })

  // @fr NFR-009c
  it('분할 시편 7건의 II부가 I부와 다른 본문을 가진다', () => {
    const PAIRS: [string, string][] = [
      ['Psalm 45:2-10', 'Psalm 45:11-18'],
      ['Psalm 49:1-13', 'Psalm 49:14-21'],
      ['Psalm 72:1-11', 'Psalm 72:12-19'],
      ['Psalm 132:1-10', 'Psalm 132:11-18'],
      ['Psalm 145:1-13', 'Psalm 145:14-21'],
      // 2026-10-24 — docs/bug-reports/2026-10-24-psalter-139-missing-144-duplicate-verses.md
      ['Psalm 139:1-12', 'Psalm 139:13-18, 23-24'],
      ['Psalm 144:1-8', 'Psalm 144:9-15'],
    ]
    const flat = (ref: string) => (plainTexts[ref]?.stanzas ?? []).flat().join('\n')
    for (const [one, two] of PAIRS) {
      expect(flat(one), `${one} 본문 없음`).not.toBe('')
      expect(flat(two), `${two} 본문 없음`).not.toBe('')
      expect(flat(two), `${two} 가 ${one} 과 같은 본문`).not.toBe(flat(one))
      // II부는 인쇄면의 부 마커로 시작한다 (I부는 "I")
      expect(plainTexts[two]?.stanzas?.[0]?.[0]).toBe('II')
    }
  })

  // @fr NFR-009c
  it('한 시간전례 안의 두 시편이 같은 본문 행을 갖지 않는다', () => {
    // 2026-10-24: 제4주간 목요일 저녁 시편 144 I부가 화요일 키(1–10절)를 써서
    // 9–10절이 II부와 겹쳤고, 화요일 아침 시편 101 끝에는 같은 날 성경찬가
    // (다니엘 3) 첫 연이 붙어 있었다. 한 엔트리 안에서 되풀이되는 행(후렴형)과
    // 짧은 행(`ЭЗЭНийг магтагтун!` 등)은 빼고 본다.
    const bodyLines = (ref: string) => {
      const all = (plainTexts[ref]?.stanzas ?? []).flat().map((l) => l.trim().replace(/\s+/g, ' '))
      const count = new Map<string, number>()
      for (const l of all) count.set(l, (count.get(l) ?? 0) + 1)
      return new Set(all.filter((l) => l.length > 20 && count.get(l) === 1))
    }
    const shared: string[] = []
    for (const { week, day, hour, psalms } of eachHour()) {
      const refs = psalms.map((p) => p?.ref).filter((r): r is string => !!r)
      for (let i = 0; i < refs.length; i++) {
        for (let j = i + 1; j < refs.length; j++) {
          const other = bodyLines(refs[j])
          for (const l of bodyLines(refs[i])) {
            if (other.has(l)) shared.push(`week-${week} ${day} ${hour}: ${refs[i]} ∩ ${refs[j]} — ${l}`)
          }
        }
      }
    }
    expect(shared).toEqual([])
  })

  // @fr NFR-009c
  it('시편 139 II부는 13–18·23–24절, 시편 144 목요일 I부는 1–8절이다', () => {
    const flat = (ref: string) => (plainTexts[ref]?.stanzas ?? []).flat()
    const ps139 = flat('Psalm 139:13-18, 23-24')
    expect(ps139[1]).toBe('Учир нь Та гэдэс дотрыг минь хэлбэржүүлж') // 13절 (책 p.466)
    expect(ps139).toContain('Аяа, Тэнгэрбурхан, надад хандсан бодлууд тань хэчнээн нандин бэ!') // 17절
    expect(ps139.at(-1)).toBe('Мөнхийн замаар намайг удирдаач!') // 24절
    expect(flat('Psalm 139:1-12').at(-1)).toBe('Гэрэл харанхуй хоёр хоёулаа адилхан юм.') // 12절
    expect(flat('Psalm 144:1-8').at(-1)).toBe('Баруун гар нь худлын баруун гар юм.') // 8절 (책 p.481)
    expect(flat('Psalm 101:1-8').at(-1)?.trim()).toBe('Бүх хорон муу хүнийг устгана.') // 8절 (책 p.442)

    const week4Days = (week4 as WeekFile).days as Record<string, Day>
    const refs = (day: string, hour: string) => (week4Days[day][hour].psalms ?? []).map((p) => p.ref)
    expect(refs('WED', 'vespers').slice(0, 2)).toEqual(['Psalm 139:1-12', 'Psalm 139:13-18, 23-24'])
    expect(refs('THU', 'vespers').slice(0, 2)).toEqual(['Psalm 144:1-8', 'Psalm 144:9-15'])
    expect(refs('TUE', 'lauds')[2]).toBe('Psalm 144:1-10') // 화요일 아침은 책도 1–10절

    // 책은 머리말을 I부 앞에, 마침 기도를 II부 뒤에 한 번만 인쇄한다
    expect(plainTexts['Psalm 139:1-12'].psalmPrayer).toBeUndefined()
    expect(plainTexts['Psalm 144:1-8'].psalmPrayer).toBeUndefined()
    expect(plainTexts['Psalm 139:13-18, 23-24'].psalmPrayer).toBeTruthy()
    expect(plainTexts['Psalm 144:9-15'].psalmPrayer).toBeTruthy()
    const headers = (psalterHeaders as { refs: Record<string, { entries: { attribution?: string }[] }> }).refs
    expect(headers['Psalm 139:13-18, 23-24']).toBeUndefined()
    expect(headers['Psalm 144:1-8'].entries[0].attribution).toBe('Гэгээн Хилайр') // p.480, 화요일과 다름
  })

  // @fr FR-035
  it('분할 시편의 마침 기도는 마지막 부 뒤에 한 번만 나온다', () => {
    // 2026-10-25 — docs/bug-reports/2026-10-25-split-psalm-prayer-placement.md
    // 책은 분할 시편 10건 모두 기도를 II부 뒤에 한 번만 인쇄한다. 데이터는
    // 45·49·132·145 를 I부에, 135 를 두 부 모두에 붙였고 27·72 는 기도가 없었다.
    // resolver 와 같은 우선순위로 자리별 실효 기도를 계산한다.
    const prayerOf = (p: PsalmEntry) =>
      p.continuesInNextPart ? undefined : (p.psalmPrayer ?? plainTexts[p.ref!]?.psalmPrayer)
    const richPrayerOf = (p: PsalmEntry) =>
      p.continuesInNextPart || p.psalmPrayer != null ? undefined : richTexts[p.ref!]?.psalmPrayerRich
    const pageOf = (p: PsalmEntry) => p.psalmPrayerPage ?? plainTexts[p.ref!]?.psalmPrayerPage
    const psalmNo = (ref?: string) => ref?.match(/^Psalm (\d+):/)?.[1]

    const groups: string[] = []
    const wrong: string[] = []
    for (const { week, day, hour, psalms } of eachHour()) {
      for (let i = 0; i < psalms.length; ) {
        const n = psalmNo(psalms[i]?.ref)
        let j = i
        while (n && j + 1 < psalms.length && psalmNo(psalms[j + 1]?.ref) === n) j++
        if (j > i) {
          const where = `week-${week} ${day} ${hour} Psalm ${n}`
          groups.push(where)
          for (let k = i; k < j; k++) {
            if (prayerOf(psalms[k]) || richPrayerOf(psalms[k])) {
              wrong.push(`${where} — 앞 부 ${psalms[k].ref} 에 기도`)
            }
          }
          const last = psalms[j]
          if (!prayerOf(last)) wrong.push(`${where} — 마지막 부 ${last.ref} 에 기도 없음`)
          else if (!pageOf(last)) wrong.push(`${where} — 마지막 부 ${last.ref} 기도 쪽수 없음`)
        }
        i = j + 1
      }
    }
    expect(wrong).toEqual([])
    expect(groups).toHaveLength(10) // 27·45·49·72·132·135·136·139·144·145

    // 135:1-12 는 제4주간 월 아침에 단독 시편 — 거기선 기도가 남아야 한다 (p.429)
    const w4mon = ((week4 as WeekFile).days as Record<string, Day>).MON.lauds.psalms ?? []
    const ps135 = w4mon.find((p) => p.ref === 'Psalm 135:1-12')!
    expect(prayerOf(ps135)).toBeTruthy()
    expect(pageOf(ps135)).toBe(429)
  })

  // @fr FR-037
  it('분할 시편의 영광송은 마지막 부 뒤에만 — 앞 부는 영광송도 생략 루브릭도 없다', () => {
    // 2026-10-27 — 같은 bug report §6. 책은 10건 모두 I부 끝에서 영광송 없이
    // 바로 II부 후렴으로 넘어간다 (scan-gloria.py, 인쇄면 확인). 앞 부 자리는
    // `gloria_patri: false` + `continuesInNextPart: true`, 마지막 부는 둘 다 아니다.
    // `continuesInNextPart` 는 분할 시편 앞 부 밖에서는 쓰지 않는다.
    const psalmNo = (ref?: string) => ref?.match(/^Psalm (\d+):/)?.[1]
    const wrong: string[] = []
    let partOnes = 0
    for (const { week, day, hour, psalms } of eachHour()) {
      psalms.forEach((p, i) => {
        const where = `week-${week} ${day} ${hour} ${p.ref}`
        const n = psalmNo(p.ref)
        const continues = Boolean(n) && psalmNo(psalms[i + 1]?.ref) === n
        if (continues) {
          partOnes++
          if (p.gloria_patri !== false) wrong.push(`${where} — 앞 부인데 영광송`)
          if (!p.continuesInNextPart) wrong.push(`${where} — 앞 부 표시 없음`)
        } else if (p.continuesInNextPart) {
          wrong.push(`${where} — 앞 부가 아닌데 continuesInNextPart`)
        } else if (n && psalmNo(psalms[i - 1]?.ref) === n && p.gloria_patri !== true) {
          wrong.push(`${where} — 마지막 부에 영광송 없음`)
        }
      })
    }
    expect(wrong).toEqual([])
    expect(partOnes).toBe(10)

    // 135:1-12 단독 자리(제4주간 월 아침)는 영광송이 그대로다
    const w4mon = ((week4 as WeekFile).days as Record<string, Day>).MON.lauds.psalms ?? []
    const ps135 = w4mon.find((p) => p.ref === 'Psalm 135:1-12')!
    expect(ps135.gloria_patri).toBe(true)
    expect(ps135.continuesInNextPart).toBeUndefined()
  })
})
