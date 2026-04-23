#!/usr/bin/env node
/**
 * audit-short-reading-bleed.js
 *
 * Cross-section bleed-over audit for shortReading entries.
 *
 * Motivation (wi-004 discovery):
 *   PSALTER/w1/SAT/lauds p163 (2 Петр 1:10-11) had the tail of the preceding
 *   Psalm 117:1-2 ("Бүх үндэстэн, ЭЗЭНийг магтагтун Бүх ард түмэн, Түүнийг
 *   өргөмжлөгтүн!") accidentally appended to the reading text during manual
 *   PDF transcription. The bug was invisible to existing validators — only
 *   the rich-builder's byte-equal gate caught it. This audit sweeps all 137
 *   shortReading entries for the same pattern so future transcription errors
 *   surface proactively.
 *
 * Method:
 *   - Collect every shortReading.text from seasonal propers + psalter commons
 *     + compline commons.
 *   - Build a flattened corpus of every psalm body from psalter-texts.json
 *     (stanzas → single whitespace-normalised string per ref).
 *   - For each shortReading, take the last N chars (tail) and first N chars
 *     (head) of the normalised text and check substring membership against
 *     every psalm in the corpus.
 *   - Bucket: suspect (at least one match) / clean (no match) /
 *     verified-correction (historical cases documented for traceability).
 *
 * Parameters:
 *   --window N   window size in chars (default 30, allowed range [30, 80]).
 *                30 catches the p163-class (~68 char) bleed; widen to 80 to
 *                suppress common-phrase false positives when reviewing.
 *
 * Output:
 *   scripts/out/short-reading-bleed-audit.json  (structured)
 *   scripts/out/short-reading-bleed-audit.md    (human-readable)
 *
 * Exit:
 *   0 — read-only informational. The --check mode (future) could exit
 *       non-zero when suspects.length > baseline, suitable for CI.
 *
 * NFR-009c 패턴: verified-correction 버킷은 역사적 보정 기록 (baseline),
 * suspect 는 current drift, clean 은 통과. baseline drift 여부는 sweep
 * 결과의 delta 로 확인.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const PROPERS_ROOT = path.join(ROOT, 'src/data/loth/propers')
const PSALTER_ROOT = path.join(ROOT, 'src/data/loth/psalter')
const COMPLINE_PATH = path.join(ROOT, 'src/data/loth/ordinarium/compline.json')
const PSALTER_TEXTS = path.join(ROOT, 'src/data/loth/psalter-texts.json')
const OUT_DIR = path.join(ROOT, 'scripts/out')
const OUT_JSON = path.join(OUT_DIR, 'short-reading-bleed-audit.json')
const OUT_MD = path.join(OUT_DIR, 'short-reading-bleed-audit.md')

const SEASONS = [
  { file: 'advent.json', season: 'ADVENT' },
  { file: 'christmas.json', season: 'CHRISTMAS' },
  { file: 'easter.json', season: 'EASTER' },
  { file: 'lent.json', season: 'LENT' },
  { file: 'ordinary-time.json', season: 'ORDINARY_TIME' },
]

const HOURS = ['lauds', 'vespers', 'vespers2', 'compline']

// Historical bleed-over cases already discovered + corrected.
// Kept here for traceability — future sweeps confirm no regression + new
// audits can compare suspect membership against this known baseline.
//
// direction codes:
//   - 'shortReading<-psalm' : psalm body tail leaked into shortReading text
//   - 'psalm<-shortReading' : shortReading text leaked into psalm body
//   - 'psalm<-antiphon'     : seasonal antiphon leaked into psalm body
const VERIFIED_CORRECTIONS = [
  {
    id: 'PSALTER/w1/SAT/lauds',
    direction: 'shortReading<-psalm',
    page: 163,
    ref: '2 Петр 1:10-11',
    bled_from: 'Psalm 117:1-2',
    commit: 'deb4d2b',
    wi: 'wi-004',
    note: 'Psalm 117:1-2 tail ("Бүх үндэстэн, ЭЗЭНийг магтагтун Бүх ард түмэн, Түүнийг өргөмжлөгтүн!") had been appended to 2 Петр 1:10-11 text during transcription; removed. Rich builder acceptance gate now PASS.',
  },
  {
    id: 'psalter-texts.json → Psalm 33:1-9',
    direction: 'psalm<-shortReading',
    page: 96,
    ref: 'Psalm 33:1-9',
    bled_from: 'Rom 13:14 (shortReading at ADVENT/w1/SUN/lauds p551)',
    commit: 'TBD (this WI)',
    wi: 'task-9',
    note: 'Spurious stanza ["Эзэн Есүс Христийг өөртөө өмс. Хүсэл тачаалыг нь хангах юугаар ч махбодыг бүү тэтгэ."] was inserted between legitimate stanzas[2] and stanzas[4] in Psalm 33:1-9 body. Content is Romans 13:14, unrelated to psalm. Removed. PDF p96-98 has no such line.',
  },
  {
    id: 'psalter-texts.json → Psalm 57:2-12',
    direction: 'psalm<-antiphon+shortReading',
    page: 125,
    ref: 'Psalm 57:2-12',
    bled_from: 'Easter antiphon ("Амилалтын цаг улирал…Аллэлуяа!") + prophetic formula fragment ("сайхнаар хангалуун байх болно гэж ЭЗЭН тунхаглаж байна.")',
    commit: 'TBD (this WI)',
    wi: 'task-9',
    note: 'Psalm body stanza[1] had two intruder elements: (a) a prophetic-formula tail grafted to legitimate line "Үүрийн гэгээг би сэрээнэ." and (b) an Easter-season antiphon line. Both removed. Simultaneously, the psalm body was truncated (ended at Ps 57:8); Ps 57:9-12 (PDF p126 lines 4155-4163) restored verbatim.',
  },
]

// Suspects that remain after full sweep but represent legitimate Scripture
// overlap (shortReading ref is a subset of a canticle/psalm ref in the
// psalter-texts.json corpus, OR parallel Pauline formulae across different
// epistles). These are NOT bleed-over — document here to suppress noise
// during future triage.
//
// Match key: `<shortReading.id>|<psalm_corpus_ref>`
const LEGITIMATE_OVERLAPS = {
  'ADVENT/w1/MON/lauds|Isaiah 2:2-5': {
    reason: 'Isa 2:3-4 is a proper subset of the canticle Isaiah 2:2-5; identical Scripture text by design.',
  },
  'PSALTER/w1/SUN/vespers|Ephesians 1:3-10': {
    reason: 'Pauline blessing formula "Бидний Эзэн Есүс Христийн Эцэг Тэнгэрбурхан ерөөлтэй еэ!" opens both 2 Cor 1:3 (this shortReading) and Eph 1:3 (canticle in psalter-texts). Parallel doctrinal formula, not contamination.',
  },
  'PSALTER/w1/SAT/vespers|Ephesians 1:3-10': {
    reason: 'Saturday 1st-Vespers reuses Sunday 2nd-Vespers shortReading (liturgical pattern); same Pauline formula overlap as PSALTER/w1/SUN/vespers.',
  },
  'PSALTER/w2/SUN/lauds|Ezekiel 36:24-28': {
    reason: 'Ezek 36:25-28 (shortReading) is a proper subset of the canticle Ezekiel 36:24-28; identical Scripture text by design.',
  },
}

function parseArgs() {
  const args = process.argv.slice(2)
  let windowSize = 30
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--window' && args[i + 1]) {
      const v = parseInt(args[i + 1], 10)
      if (Number.isNaN(v) || v < 30 || v > 80) {
        console.error(`--window must be integer in [30, 80]; got ${args[i + 1]}`)
        process.exit(1)
      }
      windowSize = v
      i++
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log('Usage: audit-short-reading-bleed.js [--window N]')
      console.log('  --window N   character window size, 30 ≤ N ≤ 80 (default 30)')
      process.exit(0)
    }
  }
  return { windowSize }
}

function normalise(s) {
  return String(s ?? '').replace(/\s+/g, ' ').trim()
}

function collectShortReadings() {
  const out = []
  // (1) seasonal propers — weeks.{week}.{day}.{hour}.shortReading
  for (const def of SEASONS) {
    const p = path.join(PROPERS_ROOT, def.file)
    if (!fs.existsSync(p)) continue
    const j = JSON.parse(fs.readFileSync(p, 'utf8'))
    const weeks = j?.weeks ?? {}
    for (const wk of Object.keys(weeks)) {
      const dayMap = weeks[wk] ?? {}
      for (const d of Object.keys(dayMap)) {
        const dayObj = dayMap[d] ?? {}
        for (const h of HOURS) {
          const e = dayObj[h]
          if (!e || typeof e !== 'object' || !e.shortReading) continue
          out.push({
            id: `${def.season}/w${wk}/${d}/${h}`,
            ref: e.shortReading.ref ?? null,
            text: e.shortReading.text ?? '',
            page: typeof e.shortReading.page === 'number' ? e.shortReading.page : null,
            source: 'seasonal',
            sourceFile: `propers/${def.file}`,
          })
        }
      }
    }
  }
  // (2) psalter commons — days.{day}.{hour}.shortReading
  for (const wk of ['1', '2', '3', '4']) {
    const p = path.join(PSALTER_ROOT, `week-${wk}.json`)
    if (!fs.existsSync(p)) continue
    const j = JSON.parse(fs.readFileSync(p, 'utf8'))
    const days = j?.days ?? {}
    for (const d of Object.keys(days)) {
      const dayObj = days[d] ?? {}
      for (const h of ['lauds', 'vespers', 'vespers2']) {
        const e = dayObj[h]
        if (!e || typeof e !== 'object' || !e.shortReading) continue
        out.push({
          id: `PSALTER/w${wk}/${d}/${h}`,
          ref: e.shortReading.ref ?? null,
          text: e.shortReading.text ?? '',
          page: typeof e.shortReading.page === 'number' ? e.shortReading.page : null,
          source: 'psalter-commons',
          sourceFile: `psalter/week-${wk}.json`,
        })
      }
    }
  }
  // (3) compline commons — days.{day}.shortReading
  if (fs.existsSync(COMPLINE_PATH)) {
    const j = JSON.parse(fs.readFileSync(COMPLINE_PATH, 'utf8'))
    const days = j?.days ?? {}
    for (const d of Object.keys(days)) {
      const sr = days[d]?.shortReading
      if (!sr) continue
      out.push({
        id: `COMPLINE/${d}`,
        ref: sr.ref ?? null,
        text: sr.text ?? '',
        page: typeof sr.page === 'number' ? sr.page : null,
        source: 'compline-commons',
        sourceFile: 'ordinarium/compline.json',
      })
    }
  }
  return out
}

function collectPsalmCorpus() {
  const j = JSON.parse(fs.readFileSync(PSALTER_TEXTS, 'utf8'))
  const corpus = []
  for (const ref of Object.keys(j)) {
    const e = j[ref]
    const stanzas = Array.isArray(e?.stanzas) ? e.stanzas : []
    const lines = []
    for (const stanza of stanzas) {
      if (!Array.isArray(stanza)) continue
      for (const line of stanza) {
        if (typeof line === 'string' && line.trim().length > 0) lines.push(line)
      }
    }
    const flat = normalise(lines.join(' '))
    if (flat.length === 0) continue
    corpus.push({ ref, flat })
  }
  return corpus
}

function detectBleedOver(sr, corpus, windowSize) {
  const normText = normalise(sr.text)
  const matches = []
  if (normText.length < windowSize) {
    return { matched: false, matches, textLen: normText.length }
  }
  const tail = normText.slice(-windowSize)
  const head = normText.slice(0, windowSize)
  for (const p of corpus) {
    if (p.flat.includes(tail)) {
      matches.push({ psalm: p.ref, direction: 'tail', window: tail })
    }
    // Avoid double-reporting head+tail for ultra-short texts where head==tail.
    if (head !== tail && p.flat.includes(head)) {
      matches.push({ psalm: p.ref, direction: 'head', window: head })
    }
  }
  return { matched: matches.length > 0, matches, textLen: normText.length }
}

function main() {
  const { windowSize } = parseArgs()
  console.log(`=== audit-short-reading-bleed (window=${windowSize}) ===`)

  const shortReadings = collectShortReadings()
  console.log(`shortReadings collected: ${shortReadings.length}`)

  const corpus = collectPsalmCorpus()
  console.log(`psalm corpus entries   : ${corpus.length}`)

  const suspects = []
  const legitimate = []
  const cleans = []
  const tooShort = []
  for (const sr of shortReadings) {
    const r = detectBleedOver(sr, corpus, windowSize)
    if (r.textLen < windowSize) {
      tooShort.push({ ...sr, textLen: r.textLen })
    } else if (r.matched) {
      // Split matches: all psalm keys known-legitimate → legitimate bucket;
      // otherwise any unknown → suspect bucket.
      const unknownMatches = []
      const knownMatches = []
      for (const m of r.matches) {
        const key = `${sr.id}|${m.psalm}`
        if (LEGITIMATE_OVERLAPS[key]) {
          knownMatches.push({ ...m, reason: LEGITIMATE_OVERLAPS[key].reason })
        } else {
          unknownMatches.push(m)
        }
      }
      if (unknownMatches.length === 0) {
        legitimate.push({ ...sr, matches: knownMatches })
      } else {
        suspects.push({ ...sr, matches: unknownMatches, knownMatches })
      }
    } else {
      cleans.push(sr)
    }
  }

  const report = {
    generated: new Date().toISOString(),
    window: windowSize,
    total_short_readings: shortReadings.length,
    psalm_corpus_size: corpus.length,
    buckets: {
      suspect: suspects.length,
      legitimate_overlap: legitimate.length,
      clean: cleans.length,
      too_short: tooShort.length,
      verified_correction_historical: VERIFIED_CORRECTIONS.length,
    },
    suspects: suspects.map((s) => ({
      id: s.id,
      ref: s.ref,
      page: s.page,
      source_file: s.sourceFile,
      match_count: s.matches.length,
      matches: s.matches,
    })),
    legitimate_overlaps: legitimate.map((s) => ({
      id: s.id,
      ref: s.ref,
      page: s.page,
      source_file: s.sourceFile,
      match_count: s.matches.length,
      matches: s.matches,
    })),
    too_short: tooShort.map((s) => ({ id: s.id, ref: s.ref, page: s.page, textLen: s.textLen })),
    verified_corrections: VERIFIED_CORRECTIONS,
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + '\n')

  const lines = []
  lines.push('# shortReading Cross-Section Bleed-Over Audit')
  lines.push('')
  lines.push(`- generated: ${report.generated}`)
  lines.push(`- window: ${windowSize} chars`)
  lines.push(`- shortReadings total: ${shortReadings.length}`)
  lines.push(`- psalm corpus: ${corpus.length} entries`)
  lines.push('')
  lines.push('## Buckets')
  lines.push('')
  lines.push(`- **suspect** (unknown bleed-over, needs review): ${suspects.length}`)
  lines.push(`- **legitimate-overlap** (annotated Scripture/parallel): ${legitimate.length}`)
  lines.push(`- **clean**: ${cleans.length}`)
  if (tooShort.length > 0) {
    lines.push(`- **too-short** (< window): ${tooShort.length}`)
  }
  lines.push(`- **verified-correction (historical)**: ${VERIFIED_CORRECTIONS.length}`)
  lines.push('')
  if (suspects.length > 0) {
    lines.push('## Suspect Entries')
    lines.push('')
    lines.push('각 entry 에 대해 tail (본문 마지막 N chars) 또는 head (처음 N chars) 가 ')
    lines.push('psalter-texts.json 의 어떤 시편 본문에서 substring match 됨. 수동 PDF 대조 필요.')
    lines.push('')
    for (const s of suspects) {
      lines.push(`### ${s.id} (page ${s.page ?? '—'})`)
      lines.push(`- ref: \`${s.ref}\``)
      lines.push(`- source_file: ${s.sourceFile}`)
      lines.push(`- match_count: ${s.matches.length}`)
      for (const m of s.matches) {
        lines.push(`  - **${m.direction}** vs \`${m.psalm}\``)
        lines.push(`    - window: \`${m.window}\``)
      }
      lines.push('')
    }
  }
  if (legitimate.length > 0) {
    lines.push('## Legitimate Overlaps (known Scripture/parallel, annotated)')
    lines.push('')
    lines.push('substring match 가 의도적 성서 인용·병행 공식으로 확인된 항목. 교정 대상 아님.')
    lines.push('')
    for (const s of legitimate) {
      lines.push(`### ${s.id} (page ${s.page ?? '—'})`)
      lines.push(`- ref: \`${s.ref}\``)
      lines.push(`- source_file: ${s.sourceFile}`)
      for (const m of s.matches) {
        lines.push(`  - **${m.direction}** vs \`${m.psalm}\``)
        lines.push(`    - reason: ${m.reason}`)
      }
      lines.push('')
    }
  }
  if (tooShort.length > 0) {
    lines.push('## Too-Short Entries (본문 길이 < window)')
    lines.push('')
    lines.push('window 보다 짧은 reading. 검증 불가 — window 축소 후 재실행 고려.')
    lines.push('')
    for (const s of tooShort) {
      lines.push(`- ${s.id} (page ${s.page ?? '—'}, ref \`${s.ref}\`, len ${s.textLen})`)
    }
    lines.push('')
  }
  lines.push('## Verified Corrections (historical, for traceability)')
  lines.push('')
  lines.push('과거 스윕/수동 검토로 발견 + 교정 완료한 bleed-over 사례. 재발 감지용 baseline.')
  lines.push('')
  for (const v of VERIFIED_CORRECTIONS) {
    lines.push(`- **${v.id}** (page ${v.page}, ref \`${v.ref}\`, commit ${v.commit}, ${v.wi})`)
    lines.push(`  - bled_from: \`${v.bled_from}\``)
    lines.push(`  - note: ${v.note}`)
  }
  lines.push('')
  fs.writeFileSync(OUT_MD, lines.join('\n'))

  console.log('')
  console.log('--- buckets ---')
  console.log(`  suspect              : ${suspects.length}`)
  console.log(`  legitimate-overlap   : ${legitimate.length}`)
  console.log(`  clean                : ${cleans.length}`)
  if (tooShort.length > 0) {
    console.log(`  too-short            : ${tooShort.length}`)
  }
  console.log(`  verified-correction  : ${VERIFIED_CORRECTIONS.length} (historical)`)
  console.log('')
  console.log(`json: ${path.relative(ROOT, OUT_JSON)}`)
  console.log(`md  : ${path.relative(ROOT, OUT_MD)}`)
}

main()
