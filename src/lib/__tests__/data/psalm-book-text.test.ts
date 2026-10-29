import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import fixture from './psalm-book-text.fixture.json'

// 2026-10-27 — 시편·찬가 본문이 책과 낱말 하나까지 같은지, 앱이 본문을 그리는 모든 자리에서 본다.
// docs/bug-reports/2026-10-27-psalm-omission-audit.md
//
// 전수 대조(docs/research/psalm-omission-audit/)에서 본문 18개가 책과 달랐다. 쪽이 바뀌는
// 자리에서 행이 빠지거나(시편 33·47·131·137·147 …), 이웃 찬가의 첫 연이 끝에 붙거나(시편 80),
// 펼침면 왼쪽·오른쪽 쪽의 연이 엇갈려 들어갔다(시편 42·65·81). 테스트에서 책 PDF 를 읽을 수는
// 없으므로 대조 스크립트가 자리마다 책 본문의 지문(sha1)을 fixture 로 남기고, 여기서는 앱 본문을
// 같은 규칙으로 정규화해 맞춘다. 실패하면 `audit.py STREAM --show "<ref>@<page>"` 로 어디가
// 다른지 본다. 책이 바뀌면 `audit.py STREAM --emit-fixture` 로 지문을 다시 만든다.

const ROOT = process.cwd()
const DATA = path.join(ROOT, 'src/data/loth')
const HOMOGLYPH_FROM = 'ABCEHKMOPTXYaceopxy'
const HOMOGLYPH_TO = 'АВСЕНКМОРТХУасеорху'
const NUMERAL_LINE = /^\s*(I|II|III|IV)\s*$/

// 책과 일부러 다르게 두는 자리 — 이유가 사라지면(= 다시 같아지면) 테스트가 지우라고 알린다.
const KNOWN_DIFFERENCES: Record<string, string> = {
  'psalter-texts:Psalm 67:2-8@333':
    '책은 시편 67 을 세 번 인쇄하는데(p.30 초대송, p.239, p.333) 끝 후렴 반복은 p.333 에만 있다. ' +
    '제2주간 수 저녁(p.239)과 본문 하나를 같이 쓰므로 p.239 에 맞춘 채 둔다 — 사용자 판단 대기',
  'psalter-texts:Revelation 11:17-18; 12:10b-12a@137':
    '책은 «Тандаа бид бид талархал өргөе» 로 «бид» 를 두 번 찍는다(네 인쇄본 모두). 앱은 한 번 — ' +
    'STC-025, 사용자 지시 2026-10-29. 신부님께 3차 오식 목록 LH-052·057·062·065 로 보냄',
  'psalter-texts:Revelation 11:17-18; 12:10b-12a@257':
    '책은 «Тандаа бид бид талархал өргөе» 로 «бид» 를 두 번 찍는다(네 인쇄본 모두). 앱은 한 번 — ' +
    'STC-025, 사용자 지시 2026-10-29. 신부님께 3차 오식 목록 LH-052·057·062·065 로 보냄',
  'psalter-texts:Revelation 11:17-18; 12:10b-12a@370':
    '책은 «Тандаа бид бид талархал өргөе» 로 «бид» 를 두 번 찍는다(네 인쇄본 모두). 앱은 한 번 — ' +
    'STC-025, 사용자 지시 2026-10-29. 신부님께 3차 오식 목록 LH-052·057·062·065 로 보냄',
  'psalter-texts:Revelation 11:17-18; 12:10b-12a@483':
    '책은 «Тандаа бид бид талархал өргөе» 로 «бид» 를 두 번 찍는다(네 인쇄본 모두). 앱은 한 번 — ' +
    'STC-025, 사용자 지시 2026-10-29. 신부님께 3차 오식 목록 LH-052·057·062·065 로 보냄',
}

/** audit.py 의 words() 를 띄어쓰기 없이 이은 것과 같다. */
function normalize(lines: string[]): string {
  return lines
    .filter((l) => !NUMERAL_LINE.test(l))
    .map((l) => [...l].map((c) => {
      const i = HOMOGLYPH_FROM.indexOf(c)
      return i >= 0 ? HOMOGLYPH_TO[i] : c
    }).join(''))
    .map((l) => l.toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu, ' '))
    .flatMap((l) => l.split(/\s+/))
    .map((w) => w.replace(/^[-_]+|[-_]+$/g, ''))
    .filter(Boolean)
    .join('')
}

const sha1 = (s: string) => createHash('sha1').update(s, 'utf8').digest('hex')
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(DATA, rel), 'utf8'))

type Span = { text?: string }
type RichEntry = { stanzasRich: { blocks: { lines?: { spans: Span[] }[] }[] } }

const plain: Record<string, { stanzas: string[][] }> = readJson('psalter-texts.json')
const rich: Record<string, RichEntry> = readJson('prayers/commons/psalter-texts.rich.json')
const invitatory: { invitatoryPsalms: { ref: string; page: number; stanzas: string[][] }[] } =
  readJson('ordinarium/invitatory.json')
const canticles: Record<string, { page: number; verses: string[] }> = readJson('ordinarium/canticles.json')

/** 앱 데이터에서 본문을 그리는 자리를 모은다 (audit.py occurrences() 와 같은 규칙). */
function placements(): Map<string, string[][]> {
  const out = new Map<string, string[][]>()
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk)
    if (!node || typeof node !== 'object') return
    const o = node as Record<string, unknown>
    if (typeof o.ref === 'string' && o.ref in plain && typeof o.page === 'number') {
      const ref = o.ref
      const richLines = rich[ref].stanzasRich.blocks.flatMap((b) =>
        (b.lines ?? []).map((l) => l.spans.map((s) => s.text ?? '').join('')))
      out.set(`psalter-texts:${ref}@${o.page}`, [plain[ref].stanzas.flat(), richLines])
    }
    Object.values(o).forEach(walk)
  }
  const files = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? files(path.join(dir, d.name)) : d.name.endsWith('.json') ? [path.join(dir, d.name)] : [])
  for (const f of files(DATA)) {
    const rel = path.relative(DATA, f)
    const base = path.basename(f)
    if (base.startsWith('psalter-texts') || base.includes('rich') || rel === 'ordinarium/invitatory.json') continue
    walk(JSON.parse(fs.readFileSync(f, 'utf8')))
  }
  for (const p of invitatory.invitatoryPsalms) out.set(`invitatory:${p.ref}@${p.page}`, [p.stanzas.flat()])
  for (const [k, c] of Object.entries(canticles)) out.set(`canticles:${k}@${c.page}`, [c.verses])
  return out
}

const entries = fixture.entries as Record<string, { chars: number; sha1: string }>

describe('시편·찬가 본문 = 책 (모든 자리)', () => {
  const found = placements()

  // @fr FR-024
  it('본문을 그리는 자리마다 책 지문이 있다 (새 자리가 생기면 지문을 다시 만든다)', () => {
    expect([...found.keys()].filter((k) => !(k in entries)).sort()).toEqual([])
    expect(Object.keys(entries).filter((k) => !found.has(k)).sort()).toEqual([])
  })

  // @fr FR-024
  it('plain·rich 본문이 책과 낱말 단위로 같다 — 빠진 행·섞인 행·뒤바뀐 순서 없음', () => {
    const wrong: string[] = []
    for (const [key, texts] of found) {
      const book = entries[key]
      if (!book) continue // 지문 없는 자리는 위 테스트가 알린다
      texts.forEach((lines, i) => {
        const app = normalize(lines)
        if (sha1(app) !== book.sha1 && !(key in KNOWN_DIFFERENCES)) {
          wrong.push(`${key} ${i === 0 ? '' : '(rich) '}— 책 ${book.chars}자 / 앱 ${app.length}자`)
        }
      })
    }
    expect(wrong).toEqual([])
  })

  // @fr FR-024
  it('일부러 다르게 둔 자리는 아직 다르다 (같아졌으면 KNOWN_DIFFERENCES 에서 지운다)', () => {
    for (const key of Object.keys(KNOWN_DIFFERENCES)) {
      const [lines] = found.get(key) ?? fail(`${key}: 자리가 없음`)
      expect(sha1(normalize(lines)), key).not.toBe(entries[key].sha1)
    }
  })
})

function fail(msg: string): never {
  throw new Error(msg)
}
