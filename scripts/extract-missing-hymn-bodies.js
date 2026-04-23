#!/usr/bin/env node
/**
 * extract-missing-hymn-bodies.js — T12
 *
 * 15개 empty-text hymn 의 본문을 parsed_data/full_pdf.txt 에서 추출해
 * src/data/loth/ordinarium/hymns.json 의 해당 entry.text 에 채운다.
 *
 * Strategy:
 *  - full_pdf.txt 는 page-tagged (bare integer lines 가 page marker).
 *  - "<num>. <title>" 마커의 **마지막** 발견 위치가 body 시작점 (앞쪽은
 *    목차/색인).
 *  - body 끝은 다음 "<M>. " 마커 (M > num 이고 reasonable 범위).
 *  - form-feed (\f) 및 blank line 은 보존 (stanza 경계).
 *
 * 재실행 시 idempotent — 이미 non-empty text 인 entry 는 건드리지 않는다.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SOURCE = path.join(ROOT, 'parsed_data/full_pdf.txt')
const TARGET = path.join(ROOT, 'src/data/loth/ordinarium/hymns.json')

const TARGETS = [
  { num: 41, title: 'Есүс мэндэлсэн магтаал' },
  { num: 44, title: 'Есүс Эзэн хааны магтаал' },
  { num: 45, title: 'Есүсийн ариун зүрхний магтаал' },
  { num: 46, title: 'Жавхлант Иосеф оо!' },
  { num: 50, title: 'Иосеф гэгээнтний магтаал' },
  { num: 81, title: 'Сүсэгтнүүд цугларч' },
  { num: 82, title: 'Сүсэгтнүүд ээ, ирж мөргөсүгэй' },
  { num: 89, title: 'Та Иосеф' },
  { num: 92, title: 'Та Эхэн ба Эцэс' },
  { num: 93, title: 'Танд хайртай миний Есүс ээ' },
  { num: 105, title: 'Хамт алхацгаая' },
  { num: 108, title: 'Хүнийг энэрэгч Есүсийн магтаал' },
  { num: 111, title: 'Эзэн амилсны магтаал' },
  { num: 115, title: 'Эзэн мэндэлсэн магтаал' },
  { num: 117, title: 'Эзэн тэнгэрийн оронд заларсан магтаал' },
]

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function loadLines() {
  const raw = fs.readFileSync(SOURCE, 'utf-8')
  const lines = raw.split('\n')
  let page = null
  const all = []
  for (const line of lines) {
    const t = line.trim()
    if (/^\d{1,4}$/.test(t)) {
      page = parseInt(t, 10)
      continue
    }
    all.push({ page, text: line })
  }
  return all
}

function extractHymn(all, num, title) {
  // Marker regex: start of line, "<num>. " + title prefix (permissive — title
  // may vary in trailing punctuation between TOC and body).
  const titlePrefix = title.slice(0, Math.min(title.length, 18))
  const markerRe = new RegExp(`^${num}\\.\\s+${escapeRe(titlePrefix)}`)
  const matches = []
  for (let i = 0; i < all.length; i++) {
    if (markerRe.test(all[i].text.trim())) matches.push(i)
  }
  if (matches.length === 0) return { error: `no marker match for ${num}. ${title}` }

  // Body starts AFTER the last marker (== real body, not TOC).
  const start = matches[matches.length - 1] + 1
  // End: next "<M>. " where M > num AND M <= num + 30 (avoid crossing section).
  const nextMarkerRe = /^(\d+)\.\s+/
  let end = all.length
  for (let i = start; i < Math.min(start + 800, all.length); i++) {
    const m = nextMarkerRe.exec(all[i].text.trim())
    if (m) {
      const mn = parseInt(m[1], 10)
      if (mn > num && mn <= num + 30) {
        end = i
        break
      }
    }
    // Also end on a section header (all-caps Cyrillic + length > 4).
    const trimmed = all[i].text.trim()
    if (trimmed.length >= 4 && /^[А-ЯЁӨҮ\s]+$/u.test(trimmed)) {
      end = i
      break
    }
  }

  const bodyLines = []
  for (let i = start; i < end; i++) {
    const line = all[i].text
    if (line === '\f') continue
    // Strip trailing whitespace but keep leading (indent).
    bodyLines.push(line.replace(/\s+$/, ''))
  }
  // Trim trailing blanks.
  while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1] === '') bodyLines.pop()
  // Trim leading blanks.
  while (bodyLines.length > 0 && bodyLines[0] === '') bodyLines.shift()

  return {
    bodyLines,
    startPage: all[start]?.page,
    endPage: all[end - 1]?.page,
    markerCount: matches.length,
  }
}

function main() {
  const all = loadLines()
  const hymns = JSON.parse(fs.readFileSync(TARGET, 'utf-8'))

  const results = []
  let updated = 0
  let skipped = 0
  let failed = 0

  for (const t of TARGETS) {
    const entry = hymns[String(t.num)]
    if (!entry) {
      results.push({ num: t.num, status: 'missing-entry' })
      failed++
      continue
    }
    if (typeof entry.text === 'string' && entry.text.trim().length > 0) {
      results.push({ num: t.num, status: 'already-filled', len: entry.text.length })
      skipped++
      continue
    }

    const ext = extractHymn(all, t.num, t.title)
    if (ext.error) {
      results.push({ num: t.num, status: 'extract-failed', error: ext.error })
      failed++
      continue
    }
    if (!ext.bodyLines || ext.bodyLines.length === 0) {
      results.push({ num: t.num, status: 'empty-extract', markerCount: ext.markerCount })
      failed++
      continue
    }

    const bodyText = ext.bodyLines.join('\n')
    entry.text = bodyText
    results.push({
      num: t.num,
      status: 'updated',
      lines: ext.bodyLines.length,
      chars: bodyText.length,
      startPage: ext.startPage,
      endPage: ext.endPage,
    })
    updated++
  }

  // Preserve stable key ordering: title, text, page.
  const next = {}
  for (const [num, entry] of Object.entries(hymns)) {
    const ordered = {}
    if ('title' in entry) ordered.title = entry.title
    if ('text' in entry) ordered.text = entry.text
    if ('page' in entry) ordered.page = entry.page
    for (const k of Object.keys(entry)) if (!(k in ordered)) ordered[k] = entry[k]
    next[num] = ordered
  }
  fs.writeFileSync(TARGET, JSON.stringify(next, null, 2) + '\n', 'utf-8')

  console.log(`updated=${updated} skipped=${skipped} failed=${failed}`)
  for (const r of results) {
    const details = Object.entries(r).filter(([k]) => k !== 'num' && k !== 'status').map(([k, v]) => `${k}=${v}`).join(' ')
    console.log(`  ${String(r.num).padStart(3)} ${r.status.padEnd(16)} ${details}`)
  }
}

main()
