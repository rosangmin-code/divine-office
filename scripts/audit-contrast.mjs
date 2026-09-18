#!/usr/bin/env node
/**
 * 색 대비(WCAG AA) 감사 — 실제 렌더된 모든 텍스트 노드의 전경/배경을 재서
 * 4.5:1(큰 글씨 3:1) 미달 조합만 출력한다. 라이트·다크 두 테마.
 *
 *   npm run build && npx next start --port 3200 &
 *   node scripts/audit-contrast.mjs http://localhost:3200
 *   node scripts/audit-contrast.mjs                       # 프로덕션
 *
 * 왜 캔버스로 정규화하나: Tailwind v4 는 계산된 색을 `oklch()` 로 내보내
 * 정규식으로 rgb 를 뽑으면 엉뚱한 값(1.1:1 같은)이 나온다. `<canvas>` 의
 * fillStyle 에 넣었다 읽으면 브라우저가 sRGB 로 바꿔 준다.
 *
 * 반투명 배경은 부모를 따라 올라가며 합성하고, 반투명 전경(`/70`)은 배경 위에
 * 합성해 실제 보이는 색으로 잰다. verify:all 에는 넣지 않는다 — 서버가 필요.
 * FR-179 (2026-09-18) 에서 미달 0 을 기준선으로 잡았다.
 */
import { chromium } from 'playwright'
const BASE = process.argv[2] || 'https://divine-office.vercel.app'
const b = await chromium.launch()
let failures = 0
const PAGES = ['/', '/pray/2026-09-17/lauds', '/pray/2026-09-17/vespers', '/pray/2026-09-17/compline', '/pray/2026-09-20/firstVespers', '/pray/2026-12-25/vespers', '/settings', '/guide', '/ordinarium', '/pdf/58', '/nonexistent-page', '/?month=2026-12']
const AUDIT = () => {
  const lum = (c) => { const [r,g,bl]=c.map(v=>{const s=v/255;return s<=0.03928?s/12.92:Math.pow((s+0.055)/1.055,2.4)}); return 0.2126*r+0.7152*g+0.0722*bl }
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = 1; const cx = cvs.getContext('2d', { willReadFrequently: true })
  const parse = (s) => {
    // Tailwind v4 emits oklch(); normalise every colour through the canvas so we read real sRGB.
    cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = s; cx.fillRect(0, 0, 1, 1)
    const [r, g, bl, a] = cx.getImageData(0, 0, 1, 1).data
    return { rgb: [r, g, bl], a: a / 255 }
  }
  const hex = (rgb) => '#' + rgb.map(v => Math.round(v).toString(16).padStart(2,'0')).join('')
  const blend = (fg, a, bg) => fg.map((v,i) => Math.round(v*a + bg[i]*(1-a)))
  const bgOf = (el) => {
    let n = el, acc = null
    while (n && n !== document.documentElement) {
      const { rgb, a } = parse(getComputedStyle(n).backgroundColor)
      if (a > 0) { acc = acc ? blend(acc[0], acc[1], rgb) : null; if (a >= 1) return rgb; if (!acc) acc = [rgb, a] }
      n = n.parentElement
    }
    const root = parse(getComputedStyle(document.body).backgroundColor).rgb
    return acc ? blend(acc[0], acc[1], root) : root
  }
  const out = new Map()
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let node
  while ((node = walker.nextNode())) {
    const t = node.textContent.trim(); if (!t) continue
    const el = node.parentElement; if (!el) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none') continue
    const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue
    const fg = parse(cs.color); if (fg.a === 0) continue
    const bg = bgOf(el)
    const fgRgb = fg.a < 1 ? blend(fg.rgb, fg.a, bg) : fg.rgb
    const l1 = lum(fgRgb), l2 = lum(bg); const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]
    const ratio = (hi + 0.05) / (lo + 0.05)
    const px = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700
    const large = px >= 24 || (bold && px >= 18.66)
    const need = large ? 3 : 4.5
    if (ratio >= need) continue
    const key = `${hex(fgRgb)} on ${hex(bg)} ${px}px${bold?' b':''}`
    if (!out.has(key)) out.set(key, { ratio: +ratio.toFixed(2), need, sample: t.slice(0, 30), cls: (el.className||'').toString().split(' ').filter(c=>/text-|stone|gold|opacity/.test(c)).join(' ').slice(0,80), n: 0 })
    out.get(key).n++
  }
  return [...out.entries()].map(([k, v]) => ({ k, ...v })).sort((a, z) => a.ratio - z.ratio)
}
for (const theme of ['light', 'dark']) {
  const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, colorScheme: theme })
  await ctx.addInitScript((t) => { try { localStorage.setItem('loth-settings', JSON.stringify({ theme: t })) } catch {} }, theme)
  const p = await ctx.newPage()
  console.log(`\n================ ${theme.toUpperCase()} ================`)
  for (const url of PAGES) {
    await p.goto(BASE + url, { waitUntil: 'networkidle' }); await p.waitForTimeout(600)
    const rows = await p.evaluate(AUDIT)
    failures += rows.length
    console.log(`--- ${url}  (${rows.length} 미달 조합)`)
    for (const r of rows) console.log(`  ${String(r.ratio).padStart(5)}:1 (need ${r.need})  ${r.k.padEnd(34)} ×${String(r.n).padStart(3)}  "${r.sample}"  [${r.cls}]`)
  }
  await ctx.close()
}
await b.close()
console.log(`\n총 미달 조합: ${failures}`)
process.exit(failures ? 1 : 0)
