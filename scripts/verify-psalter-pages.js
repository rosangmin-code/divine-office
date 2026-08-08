#!/usr/bin/env node
/**
 * verify-psalter-pages.js
 *
 * Validates existing `page` values on `psalms[]` entries in
 * src/data/loth/psalter/week-{1..4}.json against parsed_data/full_pdf.txt.
 *
 * Triple-anchor evidence rule (see docs/PRD.md NFR-009c):
 *   - Anchor S (hard): first-stanza fingerprint on one bodyStartPage.
 *     The declared `page` MUST equal bodyStartPage (no +/-1 tolerance).
 *   - Anchor H (position evidence): psalm/canticle header tokens on headerPage
 *     e.g. "Дуулал 11", "Даниел 3", "1Шастирын дээд 29"
 *     and headerPage MUST be bodyStartPage or bodyStartPage - 1 (2-up spread).
 *   - Anchor A (hard): the actual selected antiphon text fingerprint on one
 *     antiphonStartPage. The generic "Шад дуулал <i+1>" marker is only a
 *     block locator; it is never accepted as the antiphon fingerprint.
 *
 * All three anchors must resolve uniquely. Ambiguous or missing evidence is
 * sent to manual-review rather than guessed (NFR-009b).
 *
 * Read-only. Emits:
 *   scripts/out/psalter-page-corrections.json  (verified bucket — patch file)
 *   scripts/out/psalter-page-review.json       (manual-review bucket with diag)
 */

const fs = require('fs')
const path = require('path')
const {
  tokenize,
  buildSourceIndex,
  buildFirstTokenIndex,
  findAllPagesForFingerprint,
} = require('./lib/page-fingerprint')

const ROOT = path.resolve(__dirname, '..')
const FULL_PDF = path.join(ROOT, 'parsed_data/full_pdf.txt')
const PSALTER_TEXTS = path.join(ROOT, 'src/data/loth/psalter-texts.json')
const OUT_DIR = path.join(ROOT, 'scripts/out')
const OUT_CORRECTIONS = path.join(OUT_DIR, 'psalter-page-corrections.json')
const OUT_REVIEW = path.join(OUT_DIR, 'psalter-page-review.json')

// Book-name tokens (post-tokenize, lowercased) for canticle refs.
// Verified against parsed_data/full_pdf.txt actual headers.
const CANTICLE_HEADERS = {
  Daniel: ['даниел'],
  Revelation: ['илчлэл'],
  '1 Chronicles': ['1шастирын', 'дээд'],
  Ephesians: ['ефес'],
  Tobit: ['тобит'],
  Judith: ['иудит'],
  Colossians: ['колоссай'],
  Jeremiah: ['иеремиа'],
  Isaiah: ['исаиа'],
  Exodus: ['гэтлэл'],
  Philippians: ['филиппой'],
  Sirach: ['сирак'],
  '1 Samuel': ['1', 'самуел'],
  Habakkuk: ['хабаккук'],
  Deuteronomy: ['дэд', 'хууль'],
  Wisdom: ['мэргэн', 'ухаан'],
  Ezekiel: ['езекиел'],
}

// Psalms whose data ref does not match the printed body at the expected position
// (e.g. data claims Ps 116:10-19 but book prints Ps 130 at that slot). These need
// ref/antiphon reconciliation before page correction; excluded from auto-correction.
const CROSS_REFERENCE_SKIPS = new Set([])

// Part II psalms (or canticles) whose correct page is the "Шад дуулал <i+1>"
// continuation page, NOT the `Дуулал N` header page (which belongs to Part I).
// The triple-anchor rule (H ∧ S on p_h) structurally cannot validate these —
// header is only on Part I page. Verified manually and patched out of band.
const PART_II_SKIPS = new Set([
  'week-1|WED|vespers|Psalm 27:7-14',
  'week-2|MON|vespers|Psalm 45:11-18',
  'week-2|TUE|vespers|Psalm 49:14-21',
  // 2026-08-08: 데이터 신설 시 `72:12-20` → `72:12-19` 로 정정. 인쇄면 x.256-257
  // 의 II부는 `Амэн, Амэн.`(19절)로 끝나고 20절(다윗의 기도 종결 콜로폰)은
  // 인쇄돼 있지 않다. 절 단위로 세어도 12~19 의 8절. 종전 값은 데이터가 없던
  // 시절 추정으로 들어가 아무것도 매칭하지 않는 dead entry 였다.
  'week-2|THU|vespers|Psalm 72:12-19',
  'week-3|THU|vespers|Psalm 132:11-18',
  'week-3|FRI|vespers|Psalm 135:13-21',
  'week-4|FRI|vespers|Psalm 145:14-21',
  'week-4|SAT|lauds|Ezekiel 36:24-28',
  // Added task #40 Stage 4: Psalm Part II entries whose header-anchor
  // page is 2+ pages before the body page (Part I body + "II" marker
  // sits between header and Part II body — beyond the verifier's ±1
  // window). Body text content verified manually against PDF.
  'week-4|MON|vespers|Psalm 136:10-26',     // header on 432, body on 434 (Part II)
  'week-4|WED|vespers|Psalm 139:23-24',     // header on 464, body on 466 (tail verses of split Psalm 139)
  'week-4|THU|vespers|Psalm 144:11-15',     // header on 480, body on 481-482 (Part II)
])

function weekKey(weekNum, day, hour, ref) {
  return `week-${weekNum}|${day}|${hour}|${ref}`
}

// Some psalms are printed with a Cyrillic part suffix in Mongolian
// (e.g. `Дуулал 19А` / `Дуулал 19Б`). The suffix attaches to the chapter
// digits without whitespace, so tokenize() emits a single token `19а`
// instead of two tokens `19` `а`. We probe the bare form first, then
// fall back to suffixed variants.
const PSALM_PART_SUFFIXES = ['а', 'б', 'в']

function parseRef(ref) {
  let m = ref.match(/^Psalm\s+(\d+)/i)
  if (m) {
    const num = m[1]
    const headerCandidates = [['дуулал', num]]
    for (const suf of PSALM_PART_SUFFIXES) {
      headerCandidates.push(['дуулал', num + suf])
    }
    return { kind: 'psalm', headerCandidates, chapterNum: parseInt(num, 10) }
  }
  m = ref.match(/^(.+?)\s+(\d+)[:\s]/)
  if (m) {
    const book = m[1].trim()
    const chap = m[2]
    const bookTokens = CANTICLE_HEADERS[book]
    if (!bookTokens) return { kind: 'unknown-canticle', book }
    return { kind: 'canticle', headerCandidates: [[...bookTokens, chap]], chapterNum: parseInt(chap, 10), book }
  }
  return { kind: 'unparseable' }
}

// Patterns that should NOT contribute to the stanza fingerprint:
// - Roman-numeral Part markers ("I", "II", ...) that indicate a split psalm
//   Part header rather than a body line.
// - Doxology markers ("Тантай, Ариун Сүнсний нэгдэлтэй..." etc.) that leak
//   into some stanzas[0] from adjacent liturgical prayers.
const STANZA_ROMAN_RE = /^(I{1,3}|IV|V|VI{0,3}|IX|X|XI{0,3})\.?$/
const STANZA_DOXOLOGY_RE = /^(Тантай,\s*Ариун\s+Сүнсний|Эцэг,\s*Хүү,?\s*Ариун\s+Сүнсэнд)/

function isNoisePrefix(line) {
  const t = (line || '').trim()
  if (!t) return true
  if (STANZA_ROMAN_RE.test(t)) return true
  if (STANZA_DOXOLOGY_RE.test(t)) return true
  return false
}

function stanzaFingerprint(ref, psalmTexts, tokenCount = 6) {
  const entry = psalmTexts[ref]
  if (!entry) return null
  const stanzas = entry.stanzas || []
  // Try stanza[0], then stanza[1] as fallback. Skip noise prefixes
  // (Roman numerals, doxology) at the head of each stanza when computing
  // the fingerprint — these do not appear at the PDF's declared page
  // body location for split psalms / post-stanza doxology data leaks.
  //
  // Within each stanza, prefer a SINGLE-LINE fingerprint when it already
  // yields ≥ 4 tokens. Multi-line joining produces fingerprints that
  // span PDF page-breaks, which are polluted by running headers ("2
  // дугаар долоо хоног", day-of-week) that `buildSourceIndex` does NOT
  // filter out (only pure-numeric page-marker lines are skipped).
  // Single-line fingerprints are resilient to that noise.
  for (let si = 0; si < Math.min(2, stanzas.length); si++) {
    const stanza = stanzas[si]
    if (!Array.isArray(stanza) || stanza.length === 0) continue
    // Drop leading noise lines before picking fingerprint source.
    let startLine = 0
    while (startLine < stanza.length && isNoisePrefix(stanza[startLine])) startLine++
    if (startLine >= stanza.length) continue
    // First try the single leading non-noise line (most resilient).
    const firstLineToks = tokenize(stanza[startLine]).slice(0, tokenCount)
    if (firstLineToks.length >= 4) return firstLineToks
    // Fall back to joining multiple lines of this stanza.
    const toks = tokenize(stanza.slice(startLine).join(' ')).slice(0, tokenCount)
    if (toks.length >= 4) return toks
  }
  return null
}

function antiphonFingerprint(entry, tokenCount = 6) {
  const toks = tokenize(entry.default_antiphon || '').slice(0, tokenCount)
  return toks.length >= 4 ? toks : null
}

function pagesMatching(needleTokens, srcTokens, firstTokenIndex) {
  return new Set(findAllPagesForFingerprint(needleTokens, srcTokens, firstTokenIndex).filter(p => p !== null))
}

function classify(entry, psalmIndex, ctx) {
  const parsed = parseRef(entry.ref)
  if (parsed.kind === 'unknown-canticle') {
    return { status: 'manual-review', reason: 'unknown-canticle-header', diag: { book: parsed.book } }
  }
  if (parsed.kind === 'unparseable') {
    return { status: 'manual-review', reason: 'unparseable-ref' }
  }
  const declared = entry.page
  if (typeof declared !== 'number') {
    return { status: 'manual-review', reason: 'no-declared-page' }
  }

  // Search locally to discover an adjacent correction, but never use this
  // window as verdict tolerance: `agree` below requires declared === S.
  const window = [declared - 1, declared, declared + 1]
  const headerPages = new Set()
  for (const cand of parsed.headerCandidates) {
    for (const p of pagesMatching(cand, ctx.srcTokens, ctx.firstTokenIndex)) headerPages.add(p)
  }
  const stanzaToks = stanzaFingerprint(entry.ref, ctx.psalmTexts)
  if (!stanzaToks) {
    return {
      status: 'manual-review',
      reason: 'no-stanza-fingerprint',
      diag: { headerAll: [...headerPages].sort((a, b) => a - b), window },
    }
  }
  const stanzaPages = pagesMatching(stanzaToks, ctx.srcTokens, ctx.firstTokenIndex)
  const bodyCandidates = window.filter(p => stanzaPages.has(p))
  const antiphonToks = antiphonFingerprint(entry)
  const locatorToks = ['шад', 'дуулал', String(psalmIndex + 1)]
  const locatorPages = pagesMatching(locatorToks, ctx.srcTokens, ctx.firstTokenIndex)

  if (bodyCandidates.length === 0) {
    return {
      status: 'manual-review',
      reason: 'no-unique-body-start-in-window',
      diag: {
        headerAll: [...headerPages].sort((a, b) => a - b),
        stanzaAll: [...stanzaPages].sort((a, b) => a - b),
        locatorAll: [...locatorPages].sort((a, b) => a - b),
        window,
      },
    }
  }
  if (bodyCandidates.length > 1) {
    return {
      status: 'manual-review',
      reason: 'multiple-body-start-pages-in-window',
      diag: {
        bodyCandidates,
        stanzaAll: [...stanzaPages].sort((a, b) => a - b),
        window,
      },
    }
  }

  const bodyStartPage = bodyCandidates[0]
  const allowedHeaderPages = [bodyStartPage - 1, bodyStartPage]
  const headerCandidates = allowedHeaderPages.filter(p => headerPages.has(p))
  if (headerCandidates.length !== 1) {
    return {
      status: 'manual-review',
      reason: headerCandidates.length === 0
        ? 'header-not-on-body-or-previous-page'
        : 'multiple-header-pages-for-body',
      bodyStartPage,
      diag: {
        bodyStartPage,
        allowedHeaderPages,
        headerCandidates,
        headerAll: [...headerPages].sort((a, b) => a - b),
      },
    }
  }
  const headerPage = headerCandidates[0]

  if (!antiphonToks) {
    return {
      status: 'manual-review',
      reason: 'no-antiphon-fingerprint',
      bodyStartPage,
      headerPage,
      diag: { bodyStartPage, headerPage, locatorTokens: locatorToks },
    }
  }

  // The generic marker only locates the occurrence block. Match the actual
  // default antiphon text within the local body-adjacent block. The marker is
  // retained as contextual evidence, but never substitutes for (or vetoes) a
  // unique real-text fingerprint because book formatting varies.
  const blockWindow = [bodyStartPage - 1, bodyStartPage, bodyStartPage + 1]
  const locatorCandidates = blockWindow.filter(p => locatorPages.has(p))
  const antiphonPages = pagesMatching(antiphonToks, ctx.srcTokens, ctx.firstTokenIndex)
  const antiphonCandidates = blockWindow.filter(p => antiphonPages.has(p))
  if (antiphonCandidates.length !== 1) {
    return {
      status: 'manual-review',
      reason: antiphonCandidates.length === 0
        ? 'no-antiphon-fingerprint-in-block'
        : 'multiple-antiphon-pages-in-block',
      bodyStartPage,
      headerPage,
      diag: {
        bodyStartPage,
        headerPage,
        blockWindow,
        locatorTokens: locatorToks,
        locatorCandidates,
        locatorAll: [...locatorPages].sort((a, b) => a - b),
        antiphonTokens: antiphonToks,
        antiphonCandidates,
        antiphonAll: [...antiphonPages].sort((a, b) => a - b),
      },
    }
  }
  const antiphonStartPage = antiphonCandidates[0]
  const evidence = {
    bodyStartPage,
    headerPage,
    antiphonStartPage,
    body: { tokens: stanzaToks, foundAt: [...stanzaPages].sort((a, b) => a - b) },
    header: { tokenCandidates: parsed.headerCandidates, foundAt: [...headerPages].sort((a, b) => a - b) },
    antiphon: {
      tokens: antiphonToks,
      foundAt: [...antiphonPages].sort((a, b) => a - b),
      locator: { tokens: locatorToks, foundAt: [...locatorPages].sort((a, b) => a - b) },
    },
  }
  if (declared === bodyStartPage) {
    return { status: 'agree', bodyStartPage, evidence }
  }
  return { status: 'verified-correction', bodyStartPage, evidence }
}

function monotonicityViolations(weekData) {
  let v = 0
  for (const day of Object.keys(weekData.days || {})) {
    for (const hour of Object.keys(weekData.days[day] || {})) {
      const hd = weekData.days[day][hour]
      if (!hd || typeof hd !== 'object') continue
      const pages = (hd.psalms || []).map(p => p.page).filter(p => typeof p === 'number')
      for (let i = 0; i < pages.length - 1; i++) {
        if (pages[i] > pages[i + 1]) v++
      }
    }
  }
  return v
}

function applyPatchInMemory(weekData, patches) {
  for (const p of patches) {
    const entry = weekData.days?.[p.day]?.[p.hour]?.psalms?.[p.idx]
    if (entry) entry.page = p.to
  }
}

function clone(obj) { return JSON.parse(JSON.stringify(obj)) }

function main() {
  console.log('=== verify-psalter-pages ===')
  console.log(`source: ${path.relative(ROOT, FULL_PDF)}`)

  const srcTokens = buildSourceIndex(FULL_PDF)
  const firstTokenIndex = buildFirstTokenIndex(srcTokens)
  console.log(`source tokens: ${srcTokens.length.toLocaleString()}  unique firsts: ${firstTokenIndex.size.toLocaleString()}`)
  const psalmTexts = JSON.parse(fs.readFileSync(PSALTER_TEXTS, 'utf8'))

  const corrections = {
    version: 1,
    generated: new Date().toISOString(),
    source: path.relative(ROOT, FULL_PDF),
    files: {},
  }
  const review = { version: 1, generated: corrections.generated, entries: [] }

  const freq = { 'declared-1': 0, declared: 0, 'declared+1': 0, other: 0, 'no-body': 0 }
  const statusCounts = {
    agree: 0,
    'verified-correction': 0,
    'manual-review': 0,
    'cross-reference-skipped': 0,
    'part-II-skipped': 0,
  }
  const monoRows = []
  const evidenceRows = []

  for (const w of [1, 2, 3, 4]) {
    const file = path.join(ROOT, `src/data/loth/psalter/week-${w}.json`)
    const relFile = path.relative(ROOT, file)
    const weekData = JSON.parse(fs.readFileSync(file, 'utf8'))
    const beforeMono = monotonicityViolations(weekData)

    const patchesForWeek = []
    for (const [day, dayData] of Object.entries(weekData.days || {})) {
      for (const [hour, hourData] of Object.entries(dayData || {})) {
        if (!hourData || typeof hourData !== 'object') continue
        const psalms = hourData.psalms || []
        for (let i = 0; i < psalms.length; i++) {
          const entry = psalms[i]
          if (typeof entry.page !== 'number') continue
          const key = weekKey(w, day, hour, entry.ref)
          if (CROSS_REFERENCE_SKIPS.has(key)) {
            statusCounts['cross-reference-skipped']++
            review.entries.push({
              file: relFile,
              locator: `days.${day}.${hour}.psalms[${i}]`,
              ref: entry.ref,
              declared: entry.page,
              reason: 'cross-reference-skipped',
            })
            continue
          }
          if (PART_II_SKIPS.has(key)) {
            statusCounts['part-II-skipped']++
            review.entries.push({
              file: relFile,
              locator: `days.${day}.${hour}.psalms[${i}]`,
              ref: entry.ref,
              declared: entry.page,
              reason: 'part-II-skipped',
            })
            continue
          }
          const result = classify(entry, i, { srcTokens, firstTokenIndex, psalmTexts })

          evidenceRows.push({
            file: relFile,
            locator: `days.${day}.${hour}.psalms[${i}]`,
            ref: entry.ref,
            declared: entry.page,
            status: result.status,
            reason: result.reason,
            bodyStartPage: result.bodyStartPage ?? result.evidence?.bodyStartPage ?? result.diag?.bodyStartPage ?? null,
            headerPage: result.headerPage ?? result.evidence?.headerPage ?? result.diag?.headerPage ?? null,
            antiphonStartPage: result.evidence?.antiphonStartPage ?? null,
          })

          // Diagnostic only. Unlike the old verifier, adjacent values do not
          // pass: this reports distance while verdict uses exact equality.
          if (result.bodyStartPage != null) {
            if (result.bodyStartPage === entry.page - 1) freq['declared-1']++
            else if (result.bodyStartPage === entry.page) freq['declared']++
            else if (result.bodyStartPage === entry.page + 1) freq['declared+1']++
            else freq['other']++
          } else {
            freq['no-body']++
          }

          if (result.status === 'agree') { statusCounts.agree++; continue }
          if (result.status === 'verified-correction') {
            statusCounts['verified-correction']++
            if (!corrections.files[relFile]) corrections.files[relFile] = []
            corrections.files[relFile].push({
              ref: entry.ref,
              locator: `days.${day}.${hour}.psalms[${i}]`,
              from: entry.page,
              to: result.bodyStartPage,
              evidence: result.evidence,
            })
            patchesForWeek.push({ day, hour, idx: i, to: result.bodyStartPage })
            continue
          }
          statusCounts['manual-review']++
          review.entries.push({
            file: relFile,
            locator: `days.${day}.${hour}.psalms[${i}]`,
            ref: entry.ref,
            declared: entry.page,
            reason: result.reason,
            evidence: result.evidence,
            diag: result.diag,
          })
        }
      }
    }
    const patchedWeek = clone(weekData)
    applyPatchInMemory(patchedWeek, patchesForWeek)
    const afterMono = monotonicityViolations(patchedWeek)
    monoRows.push({ week: w, before: beforeMono, after: afterMono })
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(OUT_CORRECTIONS, JSON.stringify(corrections, null, 2) + '\n')
  fs.writeFileSync(OUT_REVIEW, JSON.stringify(review, null, 2) + '\n')

  console.log('')
  console.log('--- Body-start frequency relative to declared (diagnostic only) ---')
  for (const [k, v] of Object.entries(freq)) console.log(`  ${k.padEnd(12)}: ${v}`)

  console.log('')
  console.log('--- Entry evidence (all rows, including agree) ---')
  for (const row of evidenceRows) {
    console.log(
      `  ${row.status.padEnd(19)} ${row.file} ${row.locator} ${row.ref}` +
      ` declared=${row.declared}` +
      ` bodyStartPage=${row.bodyStartPage ?? 'review'}` +
      ` headerPage=${row.headerPage ?? 'review'}` +
      ` antiphonStartPage=${row.antiphonStartPage ?? 'review'}` +
      `${row.reason ? ` reason=${row.reason}` : ''}`,
    )
  }

  console.log('')
  console.log('--- Monotonicity (psalms[i].page > psalms[i+1].page violations) ---')
  let totBefore = 0, totAfter = 0
  for (const m of monoRows) {
    const d = m.after - m.before
    console.log(`  week-${m.week}: before=${m.before}  after=${m.after}  delta=${d > 0 ? '+' : ''}${d}`)
    totBefore += m.before; totAfter += m.after
  }
  const totDelta = totAfter - totBefore
  console.log(`  TOTAL : before=${totBefore}  after=${totAfter}  delta=${totDelta > 0 ? '+' : ''}${totDelta}`)

  console.log('')
  console.log('--- Status counts ---')
  for (const [k, v] of Object.entries(statusCounts)) console.log(`  ${k.padEnd(30)}: ${v}`)

  console.log('')
  console.log(`corrections: ${path.relative(ROOT, OUT_CORRECTIONS)} (${statusCounts['verified-correction']} entries)`)
  console.log(`review     : ${path.relative(ROOT, OUT_REVIEW)} (${review.entries.length} entries)`)

  if (totAfter > totBefore) {
    console.error('')
    console.error('FAIL: MONOTONICITY_REGRESSED — patch set would increase monotonicity violations.')
    process.exit(1)
  }
  process.exit(0)
}

main()
