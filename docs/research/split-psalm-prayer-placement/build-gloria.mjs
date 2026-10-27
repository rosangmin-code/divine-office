// 분할 시편 앞 부(I부) 자리 10곳 — 책대로 영광송을 끈다 (2026-10-27).
//
// 책은 I부 끝에 영광송도 «영광송을 하지 않는다» 루브릭도 싣지 않고 바로 II부
// 후렴으로 넘어간다 (scan-gloria.py). 앞 부 자리에 `gloria_patri: false` 와
// `continuesInNextPart: true` 를 넣는다. 후자가 마침 기도도 끄므로 2026-10-25 의
// `omitPsalmPrayer` (제3주간 금 저녁 135:1-12) 는 지운다.
//
//   node docs/research/split-psalm-prayer-placement/build-gloria.mjs           # dry-run
//   node docs/research/split-psalm-prayer-placement/build-gloria.mjs --write
import fs from 'node:fs'

const WRITE = process.argv.includes('--write')
const psalmNo = (ref) => /^Psalm (\d+):/.exec(ref ?? '')?.[1]

const changes = []
const pending = []
for (const week of [1, 2, 3, 4]) {
  const file = `src/data/loth/psalter/week-${week}.json`
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  let touched = false
  for (const [day, hours] of Object.entries(data.days ?? {})) {
    for (const [hour, h] of Object.entries(hours)) {
      const psalms = h?.psalms ?? []
      for (let i = 0; i + 1 < psalms.length; i++) {
        const n = psalmNo(psalms[i].ref)
        if (!n || psalmNo(psalms[i + 1].ref) !== n) continue
        const e = psalms[i]
        if (e.gloria_patri !== true || e.continuesInNextPart) {
          throw new Error(`이미 바뀐 자리: week-${week} ${day} ${hour} ${e.ref}`)
        }
        // gloria_patri 바로 뒤에 continuesInNextPart 를 두도록 키 순서를 다시 짠다
        const next = {}
        for (const [k, v] of Object.entries(e)) {
          if (k === 'omitPsalmPrayer') continue
          next[k] = k === 'gloria_patri' ? false : v
          if (k === 'gloria_patri') next.continuesInNextPart = true
        }
        psalms[i] = next
        touched = true
        changes.push(`week-${week} ${day} ${hour} [${i}] ${e.ref}${e.omitPsalmPrayer ? '  (omitPsalmPrayer 제거)' : ''}`)
      }
    }
  }
  if (touched) pending.push([file, data])
}

console.log(changes.join('\n'))
if (changes.length !== 10) throw new Error(`10 자리여야 한다: ${changes.length}`)
if (WRITE) for (const [file, data] of pending) fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
console.log(`${changes.length} 자리${WRITE ? ' — 기록함' : ' (dry-run)'}`)
