#!/usr/bin/env node
/**
 * fix-ps101.mjs — 시편 101 끝에 섞여 든 다니엘 3:26 첫 연(4행)을 뗀다 (2026-10-24).
 *
 * 책 p.442 의 시편 101 은 `Бүх хорон муу хүнийг устгана.`(8절)에서 끝나고 곧바로
 * 영광송·마침 기도가 온다. 데이터는 그 뒤에 같은 날 아침 성경찬가
 * (`Daniel 3:26-27, 29, 34-41`, p.443)의 첫 연을 한 연 더 달고 있었다.
 * 시편 101 은 제4주간 화요일 아침기도에서만 쓰인다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const WRITE = process.argv.includes('--write')
const PLAIN = 'src/data/loth/psalter-texts.json'
const RICH = 'src/data/loth/prayers/commons/psalter-texts.rich.json'
const REF = 'Psalm 101:1-8'
const STRAY_HEAD = 'Эзэн, бидний өвөг дээдсийн Тэнгэрбурхан'

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'))
const writeJson = (p, v) =>
  fs.writeFileSync(path.join(ROOT, p), JSON.stringify(v, null, 2) + '\n', 'utf8')
const lineText = (l) => l.spans.map((s) => s.text ?? '').join('')

const plain = readJson(PLAIN)
const rich = readJson(RICH)

const stanzas = plain[REF].stanzas
const blocks = rich[REF].stanzasRich.blocks
if (stanzas.at(-1)[0].trim() !== STRAY_HEAD) throw new Error('plain 마지막 연이 예상과 다름')
if (lineText(blocks.at(-1).lines[0]).trim() !== STRAY_HEAD) throw new Error('rich 마지막 블록이 예상과 다름')

const canticle = plain['Daniel 3:26-27, 29, 34-41'].stanzas[0].map((l) => l.trim())
if (JSON.stringify(stanzas.at(-1).map((l) => l.trim())) !== JSON.stringify(canticle)) {
  throw new Error('떼어 낼 연이 다니엘 3 첫 연과 다름')
}

stanzas.pop()
blocks.pop()
console.log(`${REF}: 마지막 연(다니엘 3:26 첫 연 ${canticle.length}행) 제거 — ` +
  `plain ${stanzas.length}연, rich ${blocks.length}블록, 끝 행 «${stanzas.at(-1).at(-1).trim()}»`)

if (!WRITE) {
  console.log('\nDRY RUN — --write 로 반영한다.')
  process.exit(0)
}
writeJson(PLAIN, plain)
writeJson(RICH, rich)
console.log('반영 완료')
