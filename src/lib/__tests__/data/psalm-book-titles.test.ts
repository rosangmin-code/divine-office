import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import fixture from './psalm-book-titles.fixture.json'

// 2026-10-27 — 시편 제목(«Дуулал N» 아래 빨간 부제)이 데이터 항목마다 책과 같은지 본다.
// docs/bug-reports/2026-10-27-psalm-title-audit.md
//
// 주일 제1저녁 고유 시편(시기 고유부 `weeks[N].SUN.firstVespers`)과 끝기도 시편에 제목이 없었고,
// 분할 시편 II부는 책에 없는 I부 제목을 다시 보여 주었다. 화면에 나오는 것은 그 시간경이 쓰는
// 항목의 `title` 이라 자리(ref·쪽)가 아니라 항목마다 본다. 글자만 비교한다 — 시편 113
// «алдрыг магтан»(책은 붙여 찍음, STC-021)과 이사야 40 «Хоньчин»(STC-009)은 같은 것으로 본다.

const ROOT = process.cwd()
const DATA = path.join(ROOT, 'src/data/loth')
const book = fixture.entries as Record<string, string | null>
const catalog: Record<string, unknown> = JSON.parse(fs.readFileSync(path.join(DATA, 'psalter-texts.json'), 'utf8'))

const squash = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

/** 데이터 항목 중 시편 본문을 그리는 것 (psalm-book-text.test.ts 의 placements 와 같은 규칙) */
function entries(): { where: string; key: string; title: string | undefined }[] {
  const out: { where: string; key: string; title: string | undefined }[] = []
  const walk = (node: unknown, where: string) => {
    if (Array.isArray(node)) return node.forEach((v, i) => walk(v, `${where}[${i}]`))
    if (!node || typeof node !== 'object') return
    const o = node as Record<string, unknown>
    if (typeof o.ref === 'string' && o.ref in catalog && typeof o.page === 'number') {
      out.push({ where, key: `psalter-texts:${o.ref}@${o.page}`, title: o.title as string | undefined })
    }
    for (const [k, v] of Object.entries(o)) walk(v, `${where}.${k}`)
  }
  const files = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? files(path.join(dir, d.name)) : d.name.endsWith('.json') ? [path.join(dir, d.name)] : [])
  for (const f of files(DATA)) {
    const rel = path.relative(DATA, f)
    const base = path.basename(f)
    if (base.startsWith('psalter-texts') || base.includes('rich') || rel === 'ordinarium/invitatory.json') continue
    walk(JSON.parse(fs.readFileSync(f, 'utf8')), rel)
  }
  return out
}

describe('시편 제목 = 책 (데이터 항목마다)', () => {
  const all = entries()

  // @fr FR-024
  it('시편 자리마다 책 제목 fixture 가 있다', () => {
    expect([...new Set(all.map((e) => e.key))].sort()).toEqual(Object.keys(book).sort())
  })

  // @fr FR-024
  it('항목의 제목이 책과 같고, 책에 부제가 없는 자리에는 제목이 없다', () => {
    const wrong: string[] = []
    for (const e of all) {
      const b = book[e.key]
      if (!b && !e.title) continue
      if (!b) wrong.push(`${e.where} — 책에 없는 제목 «${e.title}»`)
      else if (!e.title) wrong.push(`${e.where} — 제목 없음 (책 «${b}»)`)
      else if (squash(e.title) !== squash(b)) wrong.push(`${e.where} — 앱 «${e.title}» / 책 «${b}»`)
    }
    expect(wrong).toEqual([])
  })

  // @fr FR-024
  it('STC-021: 시편 113 제목은 모든 항목에서 «алдрыг магтан» 으로 띄어 쓴다 (책은 붙여 찍음)', () => {
    const titles = all.filter((e) => e.key.startsWith('psalter-texts:Psalm 113:1-9@') && e.title).map((e) => e.title)
    expect(titles.length).toBeGreaterThan(0)
    expect([...new Set(titles)]).toEqual(['Эзэний нэр алдрыг магтан дуулагтун'])
  })
})
