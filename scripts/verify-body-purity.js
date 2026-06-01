#!/usr/bin/env node
/**
 * verify-body-purity.js
 *
 * GOAL #172 D3 — semantic purity gate for psalter body catalogs.
 *
 * This verifier is intentionally orthogonal to page/ref/geometry checks:
 * it scans the actual stanza/body lines in both:
 *
 *   - src/data/loth/psalter-texts.json
 *   - src/data/loth/prayers/commons/psalter-texts.rich.json
 *
 * and fails hard when liturgical non-body material or suspicious broken
 * line starts are present. Current live data is allowed to fail until the
 * D1/D2 data cleanup branches merge; fixture tests lock the detector.
 *
 * CLI:
 *   node scripts/verify-body-purity.js
 *   node scripts/verify-body-purity.js --check
 *   node scripts/verify-body-purity.js --ref "Psalm 147:12-20"
 *   node scripts/verify-body-purity.js --plain <path> --rich <path>
 */

'use strict'

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const DEFAULT_PLAIN = 'src/data/loth/psalter-texts.json'
const DEFAULT_RICH = 'src/data/loth/prayers/commons/psalter-texts.rich.json'

const CLASS_A_PATTERNS = [
  {
    code: 'A_DOXOLOGY_TAIL',
    message: 'concluding-prayer/doxology tail leaked into body',
    test: (line) =>
      line.includes('Тантай, Ариун Сүнсний') ||
      line.includes('Таны Хүүгээр уламжлан тийн болтугай') ||
      line.includes('Тэнгэрбурхан Есүс Христ бидний Эзэн, Таны Хүүгээр'),
  },
  {
    code: 'A_RUBRIC_PAGE_DIRECTIVE',
    message: 'rubric/page directive leaked into body',
    test: (line) =>
      /^Төгсгөлийг дэг жаягийн дагуу/.test(line) ||
      /дэг жаягийн дагуу.*х\.\s*\d+/.test(line) ||
      /дуусгана,\s*х\.\s*\d+/.test(line),
  },
  {
    code: 'A_SECTION_HEADER',
    message: 'section header leaked into body',
    test: (line) =>
      /^(ӨГЛӨӨНИЙ|ОРОЙН|ШӨНИЙН|МАГТУУ|ДУУЛАЛ БА МАГТААЛ|МАРИАГИЙН МАГТААЛ|ЗАХАРИАГИЙН МАГТААЛ|УНШЛАГА|ХАРИУЛТАТ ДУУЛАЛ)(\s|$)/.test(
        line,
      ),
  },
  {
    code: 'A_UNQUOTED_EPIGRAPH',
    message: 'uncited epigraph leaked into body',
    test: (line) =>
      /^Үгийг зүрх сэтгэлийнхээ зочин болгон/.test(line) ||
      /цаглашгүй баяр баясгаланг эдлэх болно$/.test(line),
  },
]

const MONGOLIAN_LOWERCASE_START = /^[а-яөүё]/
const TERMINAL_PUNCTUATION = /[.!?;:…]$/
const ONE_TOKEN_UPPERCASE_ORPHAN = /^[А-ЯӨҮЁ]+,?$/

function normalizeLine(text) {
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function lineTextFromRichLine(line) {
  if (!line || typeof line !== 'object') return ''
  if (!Array.isArray(line.spans)) return normalizeLine(line.text)
  return normalizeLine(
    line.spans
      .map((span) => {
        if (!span || typeof span !== 'object') return ''
        return span.text ?? ''
      })
      .join(' '),
  )
}

function isAllowedAcclamation({ ref, line, meta }) {
  if (meta?.role === 'refrain') return true
  if (meta?.phraseRole === 'refrain') return true

  if (/^Revelation 19:/.test(ref)) {
    return /Аллэлуяа|аллэлуяа/.test(line)
  }

  if (/^Daniel 3:/.test(ref)) {
    return (
      line === 'Эзэнийг магтагтун.' ||
      line === 'Түүнийг магтаж,' ||
      line === 'бүгдийн дээр үүрд мөнх өргөмжлөгтүн.'
    )
  }

  return false
}

function phraseRoleForLine(stanza, lineIndex) {
  const phrases = Array.isArray(stanza?.phrases) ? stanza.phrases : []
  const phrase = phrases.find((p) => {
    const range = p?.lineRange
    return (
      Array.isArray(range) &&
      range.length === 2 &&
      lineIndex >= range[0] &&
      lineIndex <= range[1]
    )
  })
  return phrase?.role
}

function* iterPlainLines(plainData, refFilter = null) {
  const refs = refFilter ? [refFilter] : Object.keys(plainData)
  for (const ref of refs) {
    const entry = plainData[ref]
    if (!entry || typeof entry !== 'object') continue
    const stanzas = Array.isArray(entry.stanzas) ? entry.stanzas : []
    for (let stanzaIndex = 0; stanzaIndex < stanzas.length; stanzaIndex++) {
      const stanza = stanzas[stanzaIndex]
      if (!Array.isArray(stanza)) continue
      for (let lineIndex = 0; lineIndex < stanza.length; lineIndex++) {
        const line = normalizeLine(stanza[lineIndex])
        if (!line) continue
        yield {
          source: 'plain',
          ref,
          stanzaIndex,
          lineIndex,
          line,
          previousLine:
            lineIndex > 0 ? normalizeLine(stanza[lineIndex - 1]) : null,
          isFirstBodyLine: stanzaIndex === 0 && lineIndex === 0,
          meta: {},
        }
      }
    }
  }
}

function* iterRichLines(richData, refFilter = null) {
  const refs = refFilter ? [refFilter] : Object.keys(richData)
  for (const ref of refs) {
    const entry = richData[ref]
    const blocks = entry?.stanzasRich?.blocks
    if (!Array.isArray(blocks)) continue
    let stanzaOrdinal = -1
    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
      const block = blocks[blockIndex]
      if (!block || block.kind !== 'stanza') continue
      stanzaOrdinal += 1
      const lines = Array.isArray(block.lines) ? block.lines : []
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lineTextFromRichLine(lines[lineIndex])
        if (!line) continue
        yield {
          source: 'rich',
          ref,
          blockIndex,
          stanzaIndex: stanzaOrdinal,
          lineIndex,
          line,
          previousLine:
            lineIndex > 0 ? lineTextFromRichLine(lines[lineIndex - 1]) : null,
          isFirstBodyLine: stanzaOrdinal === 0 && lineIndex === 0,
          meta: {
            role: lines[lineIndex]?.role,
            phraseRole: phraseRoleForLine(block, lineIndex),
          },
        }
      }
    }
  }
}

function locationOf(slot) {
  const stanzaPart =
    slot.source === 'rich'
      ? `blocks[${slot.blockIndex}].lines[${slot.lineIndex}]`
      : `stanzas[${slot.stanzaIndex}][${slot.lineIndex}]`
  return `${slot.source}:${slot.ref}:${stanzaPart}`
}

function checkSlot(slot) {
  if (isAllowedAcclamation(slot)) return []

  const violations = []
  for (const pattern of CLASS_A_PATTERNS) {
    if (pattern.test(slot.line)) {
      violations.push({
        class: 'A',
        code: pattern.code,
        message: pattern.message,
        location: locationOf(slot),
        line: slot.line,
      })
    }
  }

  if (slot.isFirstBodyLine && MONGOLIAN_LOWERCASE_START.test(slot.line)) {
    violations.push({
      class: 'B',
      code: 'B_LOWERCASE_FIRST_LINE',
      message: 'body starts mid-verse with a lowercase first line',
      location: locationOf(slot),
      line: slot.line,
    })
  }

  if (
    slot.previousLine &&
    !TERMINAL_PUNCTUATION.test(slot.previousLine) &&
    ONE_TOKEN_UPPERCASE_ORPHAN.test(slot.line)
  ) {
    violations.push({
      class: 'B',
      code: 'B_UPPERCASE_ORPHAN',
      message: 'one-token uppercase orphan follows a non-terminal line',
      location: locationOf(slot),
      line: slot.line,
      previousLine: slot.previousLine,
    })
  }

  return violations
}

function checkCatalogs({ plainData = {}, richData = {}, ref = null } = {}) {
  const violations = []
  let linesInspected = 0

  for (const slot of iterPlainLines(plainData, ref)) {
    linesInspected += 1
    violations.push(...checkSlot(slot))
  }

  for (const slot of iterRichLines(richData, ref)) {
    linesInspected += 1
    violations.push(...checkSlot(slot))
  }

  return { violations, linesInspected }
}

function parseCliArgs(argv) {
  const args = { check: false, ref: null, plain: DEFAULT_PLAIN, rich: DEFAULT_RICH }
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    if (flag === '--check') {
      args.check = true
    } else if (flag === '--ref') {
      args.ref = argv[++i] || null
    } else if (flag === '--plain') {
      args.plain = argv[++i] || null
    } else if (flag === '--rich') {
      args.rich = argv[++i] || null
    } else if (flag === '--help' || flag === '-h') {
      args.help = true
    } else {
      args.unknown = flag
    }
  }
  return args
}

function printHelp() {
  process.stdout.write(
    'Usage: node scripts/verify-body-purity.js [--check] [--ref <key>] [--plain <path>] [--rich <path>]\n' +
      '\n' +
      'Fails on semantic body contamination in psalter-texts.json and psalter-texts.rich.json.\n' +
      '  --check       verbose per-violation output\n' +
      "  --ref <key>   restrict to one ref (e.g. 'Psalm 147:12-20')\n" +
      `  --plain <p>   alternate plain catalog path (default: ${DEFAULT_PLAIN})\n` +
      `  --rich <p>    alternate rich catalog path (default: ${DEFAULT_RICH})\n`,
  )
}

function resolveRepoPath(input) {
  return path.isAbsolute(input) ? input : path.join(ROOT, input)
}

function readJson(label, input) {
  const target = resolveRepoPath(input)
  if (!fs.existsSync(target)) {
    throw new Error(`${label} target not found: ${target}`)
  }
  try {
    return JSON.parse(fs.readFileSync(target, 'utf8'))
  } catch (err) {
    throw new Error(`${label} JSON parse failed: ${err.message}`)
  }
}

function main() {
  const args = parseCliArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return 0
  }
  if (args.unknown) {
    console.error(`[verify-body-purity] unknown argument: ${args.unknown}`)
    printHelp()
    return 1
  }

  let plainData
  let richData
  try {
    plainData = readJson('plain', args.plain)
    richData = readJson('rich', args.rich)
  } catch (err) {
    console.error(`[verify-body-purity] ${err.message}`)
    return 1
  }

  if (args.ref && !(args.ref in plainData) && !(args.ref in richData)) {
    console.error(`[verify-body-purity] ref not found in either catalog: ${args.ref}`)
    return 1
  }

  const { violations, linesInspected } = checkCatalogs({
    plainData,
    richData,
    ref: args.ref,
  })

  if (violations.length === 0) {
    console.log(
      `[verify-body-purity] OK — ${linesInspected} body line(s) inspected, 0 violations`,
    )
    return 0
  }

  console.error(
    `[verify-body-purity] FAIL — ${violations.length} violation(s) across ${linesInspected} inspected body line(s)`,
  )

  if (args.check) {
    for (const v of violations) {
      const prev = v.previousLine ? ` | previous="${v.previousLine}"` : ''
      console.error(
        `  ${v.location} :: ${v.code} (${v.class}) — ${v.message}: "${v.line}"${prev}`,
      )
    }
  } else {
    const byCode = violations.reduce((acc, v) => {
      acc[v.code] = (acc[v.code] || 0) + 1
      return acc
    }, {})
    console.error(
      `  ${Object.entries(byCode)
        .map(([code, n]) => `${code}=${n}`)
        .join(' ')}`,
    )
    console.error('  re-run with --check for per-violation detail')
  }

  return 1
}

if (require.main === module) {
  process.exit(main())
}

module.exports = {
  checkCatalogs,
  checkSlot,
  iterPlainLines,
  iterRichLines,
  normalizeLine,
}
