import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { loadPsalterHeaderRich } from '@/lib/prayers/rich-overlay'
import bodyFixture from './psalm-book-text.fixture.json'
import headerFixture from './psalm-book-headers.fixture.json'

// 2026-10-27 — 시편 머리말(제목 아래 이탤릭 인용 + 출처)이 자리마다 책과 같은지 본다.
// docs/bug-reports/2026-10-27-psalm-header-audit.md
//
// 책은 머리말을 인쇄본마다 싣거나 싣지 않는다(분할 시편 II부, 성탄·성령강림 제1저녁 고유 시편은
// 없음). 대조(docs/research/psalm-header-audit/)에서 65자리에 앱 머리말이 없었고, II부 3곳은
// I부 머리말을 복제해 보여 주고 있었다. 로더는 자리의 쪽으로 그 인쇄본 항목을 고른다.
// fixture 는 emit-headers.py 가 책에서 뽑은 자리별 머리말이다(없으면 null).

const ROOT = process.cwd()
const invitatory: { invitatoryPsalms: { ref: string; page: number; epigraph?: string }[] } = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src/data/loth/ordinarium/invitatory.json'), 'utf8'),
)

type BookHeader = { preface: string; attribution: string | null } | null
const book = headerFixture.entries as Record<string, BookHeader>

// 책과 일부러 다르게 두는 자리(오식 장부) — 같아지면 아래 테스트가 지우라고 알린다.
// 2026-10-30 개정판이 시편 47(p.112)의 겹친 낱말을 고쳐 지금은 비어 있다.
const KNOWN_DIFFERENCES: Record<string, string> = {}

/** 소문자·라틴 동형 글자→키릴·문장부호와 공백 제거 — PDF 의 붙은 낱말(«Та нароюун»)은 차이로 보지 않는다 */
const HOMOGLYPH_FROM = 'ABCEHKMOPTXYaceopxy'
const HOMOGLYPH_TO = 'АВСЕНКМОРТХУасеорху'
const squash = (s: string | null | undefined) =>
  [...(s ?? '')].map((c) => {
    const i = HOMOGLYPH_FROM.indexOf(c)
    return i >= 0 ? HOMOGLYPH_TO[i] : c
  }).join('').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

function appHeader(key: string): BookHeader {
  const colon = key.indexOf(':')
  const source = key.slice(0, colon)
  const rest = key.slice(colon + 1)
  const at = rest.lastIndexOf('@')
  const ref = rest.slice(0, at)
  const page = Number(rest.slice(at + 1))
  if (source === 'invitatory') {
    const ep = invitatory.invitatoryPsalms.find((p) => p.ref === ref && p.page === page)?.epigraph
    if (!ep) return null
    const m = ep.match(/\(([^()]*)\)\.?\s*$/)
    return m ? { preface: ep.slice(0, m.index).trimEnd(), attribution: m[1] } : { preface: ep, attribution: null }
  }
  const h = loadPsalterHeaderRich(ref, page)
  return h ? { preface: h.preface_text, attribution: h.attribution ?? null } : null
}

describe('시편 머리말 = 책 (모든 자리)', () => {
  // @fr FR-160-C
  it('본문 지문이 있는 자리마다 머리말 fixture 도 있다 (복음 찬가 제외)', () => {
    const bodyKeys = Object.keys(bodyFixture.entries).filter((k) => !k.startsWith('canticles:')).sort()
    expect(Object.keys(book).sort()).toEqual(bodyKeys)
  })

  // @fr FR-160-C
  it('자리마다 책이 인쇄한 머리말을 보여 주고, 책에 없는 자리에는 보여 주지 않는다', () => {
    const wrong: string[] = []
    for (const [key, b] of Object.entries(book)) {
      const a = appHeader(key)
      if (!b && !a) continue
      if (key in KNOWN_DIFFERENCES) continue
      if (!b) wrong.push(`${key} — 책에 없는 머리말 «${a!.preface}»`)
      else if (!a) wrong.push(`${key} — 머리말 없음 (책 «${b.preface}»)`)
      else if (squash(a.preface) !== squash(b.preface) || squash(a.attribution) !== squash(b.attribution)) {
        wrong.push(`${key} — 앱 «${a.preface}» (${a.attribution}) / 책 «${b.preface}» (${b.attribution})`)
      }
    }
    expect(wrong).toEqual([])
  })

  // @fr FR-160-C
  it('일부러 다르게 둔 자리는 아직 다르다 (같아졌으면 KNOWN_DIFFERENCES 에서 지운다)', () => {
    for (const key of Object.keys(KNOWN_DIFFERENCES)) {
      const a = appHeader(key)
      const b = book[key]
      expect(a, key).not.toBeNull()
      expect(squash(a!.preface), key).not.toBe(squash(b!.preface))
    }
  })
})
