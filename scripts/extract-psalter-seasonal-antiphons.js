#!/usr/bin/env node
/**
 * Extract seasonal antiphon variants from parsed_data/full_pdf.txt and map
 * them to each psalter antiphon_key in src/data/loth/psalter/week-{1..4}.json.
 *
 * PDF layout (per psalm/canticle block):
 *   Шад {дуулал|магтаал} [N] {default antiphon ...wraps...}
 *   <optional noise: page numbers, headers>
 *   <blank>
 *   [MARKER:] {seasonal variant antiphon ...}
 *   [MARKER:] {another variant ...}
 *   ...
 *   {Дуулал NN | Магтаал | ...}    ← psalm/canticle body heading terminates block
 *
 * Anchor patterns:
 *   Шад дуулал [N] …       → psalm entry
 *   Шад магтаал …          → canticle entry (usually unnumbered)
 *
 * Markers recognised:
 *   Амилалтын улирал:                                        → easter
 *   Эсвэл, амилалтын цаг улирлын үед:                        → easterAlt
 *   Ирэлтийн цаг улирал:                                     → advent
 *   12 сарын 17-23:                                          → adventDec17_23
 *   12 сарын 24:                                             → adventDec24
 *   Амилалтын цаг улирлын {M,N} дэх/дахь Ням гараг:         → easterSunday[N]
 *   Дөчин хоногийн цаг улирлын N дэх/дахь Ням гараг:        → lentSunday[N]
 *   тарчлалтын Ням гараг:                                    → lentPassionSunday
 *
 * Matching strategy:
 *   Sequential: JSON entries appear in PDF in the same order (w1 SUN
 *   lauds ps1, cant, ps3, vespers ps1, cant, ps3, w1 MON lauds ...).
 *   We walk the anchor list once, binding each anchor to the next JSON
 *   entry whose `default_antiphon` prefix matches the anchor preview.
 *   Anchors with no match are skipped (sample/ordinary sections).
 *
 * Output: scripts/output/seasonal-antiphons-extracted.json
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const PDF_PATH = path.join(ROOT, 'parsed_data', 'full_pdf.txt')
const PSALTER_DIR = path.join(ROOT, 'src', 'data', 'loth', 'psalter')
const OUT_DIR = path.join(ROOT, 'scripts', 'output')
const OUT_PATH = path.join(OUT_DIR, 'seasonal-antiphons-extracted.json')
const DEBUG_PATH = path.join(OUT_DIR, 'seasonal-antiphons-debug.json')

// -------------------- inputs --------------------

function loadEntries() {
  const entries = []
  for (const n of [1, 2, 3, 4]) {
    const json = JSON.parse(
      fs.readFileSync(path.join(PSALTER_DIR, `week-${n}.json`), 'utf8'),
    )
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
    for (const day of days) {
      if (!json.days[day]) continue
      // Hour order as it appears in PDF: lauds before vespers.
      const hours = ['lauds', 'vespers']
      for (const hour of hours) {
        if (!json.days[day][hour]) continue
        const psalms = json.days[day][hour].psalms
        if (!Array.isArray(psalms)) continue
        psalms.forEach((p, idx) => {
          entries.push({
            week: n,
            day,
            hour,
            idx,
            antiphon_key: p.antiphon_key,
            default_antiphon: p.default_antiphon,
            type: p.type,
          })
        })
      }
    }
  }
  return entries
}

// -------------------- noise / terminators --------------------

const NOISE_PATTERNS = [
  /^\s*$/,
  /^\d{1,3}\s*$/, // page number, possibly with trailing whitespace
  /^\d{1,3}\s*\t+\s*$/, // page number + tabs (e.g. "360\t\t")
  /^\d{1,3}\s+\d{1,3}\s*$/, // doubled page number
  /^\d+\s*\t+.*(дугаар|дүгээр)\s+долоо\s+хоног/,
  /^\s*\d+\s+(дугаар|дүгээр)\s+долоо\s+хоног\s*$/,
  // Day-header page banner: "Ням гараг", "Ням гарагийн өглөө", etc.
  // Must NOT end with `:` (that would be a marker continuation like
  // "Ням гараг: [antiphon variant]" which we want to keep).
  /^\s*(Ням|Даваа|Мягмар|Лхагва|Пүрэв|Баасан|Бямба)\s+гараг(ийн\s+(өглөө|орой))?\s*$/,
  /^\s*(Өглөөний|Оройн|Шөнийн)\s+(даатгал|урих)\s+залбирал/,
  /^\s*\f\s*$/, // form-feed alone
]

function isNoise(line) {
  for (const re of NOISE_PATTERNS) if (re.test(line)) return true
  return false
}

// Terminators come in two tiers:
//   HARD_TERMINATORS — absolute end of this anchor's variant block.
//   Seeing one ends scanning. Covers next-anchor and post-body prayer
//   headings.
//
//   BODY_ENTRY_MARKERS — the line starts the canticle/psalm body text.
//   The variant walker enters an `inBody` state here: no text is
//   accumulated into any variant while scrolling through the body.
//   Scanning RESUMES when a real MARKER (or SKIP_MARKER) appears after
//   the body (see task #16 — w2-sun-vesp-cant's Passion Sunday marker
//   at PDF line 6411 lives past the body heading at 6367).
const HARD_TERMINATORS = [
  // `\b` does not behave on Cyrillic in JS regex (Cyrillic letters are
  // not "word chars" by the ASCII-era definition), so use explicit
  // whitespace/end-of-line boundaries instead. Without this, the
  // terminator silently fails on lines like "Шад дуулал 2 Тэнгэрбурхан
  // …" and the walker over-runs past the next anchor.
  /^Шад\s+(дуулал|магтаал)(?:\s|$)/,
  /^Шад\s+магтуу(?:\s|$)/,
  // Psalm/canticle prayer heading, in both case forms that appear in
  // the PDF (genitive "Дууллын ... залбирал" and accusative "Дууллыг
  // төгсгөх залбирал"). Both mark the end of the current entry's
  // variant block — any markers past this point belong elsewhere.
  /^Дууллы[нг]\s+(?:төгсгөх\s+)?залбирал/,
  /^Магтууллы[нг]\s+(?:төгсгөх\s+)?залбирал/,
  // Rubric instruction that appears after some psalms
  //   "Дуулал 67" нь урих дуудлагын дуулал болсон тохиолдолд ...
  /^["“][Дд]уулал\s+\d+["”]\s+нь/,
]
const BODY_ENTRY_MARKERS = [
  /^Дуулал\s+\d/,
  /^Магтаал\s*$/,
  /^Магтаал\s+\d/,
  // Roman-numeral section markers ("I", "II", "III", "IV", "V") mark
  // the start of a psalm part's body text (e.g. Psalm 45 Part II at
  // PDF line 6898). Walker must enter body-skip here — otherwise the
  // body verse lines get appended to the last-captured variant.
  /^(I|II|III|IV|V|VI|VII|VIII|IX|X)\s*$/,
]

// SKIP markers: these introduce antiphon variants that the schema does
// not represent yet (Holy Week fine-grained Triduum antiphons, conditional
// Dec 24 rubric). When encountered, we flush the current variant (if any)
// and switch to a "discard" state that consumes following text until the
// next real marker or terminator. This prevents bleed-through into the
// preceding legitimate variant.
//
// Phase 3 (task #15) promoted bare `тарчлалтын Ням гараг:` to
// lentPassionSunday (see MARKERS below). Task #16 additionally promotes
// the Week-2 compound wrap form (`Ням гараг Дөчин хоногийн цаг улирал,
// Эзэний тарчлалтын Ням гараг:`) because it carries the same Passion
// Sunday semantic and its prior SKIP behaviour was masking a real
// per-entry rubric (w2-sun-vesp-cant line 6411). The Week-1 compound
// form (`Дөчин хоногийн цаг улирал, Эзэний тарчлалтын ...`) is left in
// SKIP because it appears in contexts where accepting it would change
// capture counts for other Week-1 entries — a deliberate scope line;
// promoting it is a separate follow-up.
const SKIP_MARKERS = [
  /^Ариун\s+долоо\s+хоног:/,
  /^Хэрэв\s+энэ\s+Ням\s+гараг/,
  // Wrapped / compound Passion Sunday form — Week 1 wrap ("Дөчин
  // хоногийн цаг улирал, Эзэний тарчлалтын ..."). Kept as SKIP pending
  // a dedicated scope decision.
  /^Дөчин хоногийн цаг улирал,\s+Эзэний тарчлалтын\s+Ням\s+гараг:/,
]

// -------------------- markers --------------------

const MARKERS = [
  // per-Sunday markers must come BEFORE general season markers because
  // their prefix overlaps ("Амилалтын цаг улирлын ..." vs "Амилалтын
  // улирал:"). Same for Lent.
  {
    season: 'lentSunday',
    re: /^Дөчин хоногийн цаг улирлын\s+([\d,\s]+)\s+(?:дэх|дахь)\s+Ням\s+гараг:\s*(.*)$/,
    isPerSunday: true,
  },
  {
    season: 'easterSunday',
    re: /^Амилалтын цаг улирлын\s+([\d,\s]+)\s+(?:дэх|дахь)\s+Ням\s+гараг:\s*(.*)$/,
    isPerSunday: true,
  },
  // Passion Sunday (Phase 3 task #15 + Phase 3b task #16). Three label
  // forms in the PDF — list longer compound first so prefix-overlap
  // doesn't let the bare form shadow the compound label's lead-in.
  //   form B (Week 2 compound wrap, promoted in task #16): "Ням гараг
  //     Дөчин хоногийн цаг улирал, Эзэний тарчлалтын Ням гараг:"
  //   form 0 (bare, Phase 3): "тарчлалтын Ням гараг:"
  //
  // Form A (Week 1 compound wrap) remains in SKIP_MARKERS (see note).
  {
    season: 'lentPassionSunday',
    re: /^Ням\s+гараг\s+Дөчин хоногийн цаг улирал,\s+Эзэний\s+тарчлалтын\s+Ням\s+гараг:\s*(.*)$/,
  },
  {
    season: 'lentPassionSunday',
    re: /^тарчлалтын\s+Ням\s+гараг:\s*(.*)$/,
  },
  // Easter alternate (Phase 3, task #15). Marker precedes easter (short
  // form) because both start with "Амилалтын"; longer prefix must match
  // first to avoid being shadowed.
  {
    season: 'easterAlt',
    re: /^Эсвэл,\s+амилалтын\s+цаг\s+улирлын\s+үед:\s*(.*)$/,
  },
  {
    season: 'adventDec24',
    re: /^12\s+сарын\s+24:\s*(.*)$/,
  },
  {
    season: 'adventDec17_23',
    re: /^12\s+сарын\s+17[–-]23:\s*(.*)$/,
  },
  {
    season: 'easter',
    re: /^Амилалтын улирал:\s*(.*)$/,
  },
  // PDF uses TWO forms for the season-wide Easter marker:
  //   "Амилалтын улирал: ..."   (short, 99 occurrences)
  //   "Амилалтын цаг улирал ..." (long, 44 occurrences, no colon)
  // Both carry the same season meaning → easter. The long form must NOT
  // eat per-Sunday markers "Амилалтын цаг улир*лын* N дахь ..." — those
  // start with "улирлын" (different suffix) so the prefix "улирал " is
  // safe.
  {
    season: 'easter',
    re: /^Амилалтын цаг улирал\s+(.*)$/,
  },
  {
    season: 'advent',
    re: /^Ирэлтийн цаг улирал:\s*(.*)$/,
  },
]

// -------------------- helpers --------------------

function norm(s) {
  // Strip punctuation (including smart quotes ", ', ", "), collapse
  // whitespace, lowercase. Matching proceeds on this simplified form so
  // that ". vs ," or straight/smart quote mismatches between JSON and
  // PDF do not break the prefix match.
  return s
    .replace(/[.,!?;:"'«»“”‘’—–\-()\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function prefixOverlap(a, b) {
  const lim = Math.min(a.length, b.length, 60)
  let i = 0
  while (i < lim && a[i] === b[i]) i++
  return i
}

// Fallback similarity when prefix match is too weak (e.g. PDF parser
// reordered words): fraction of the anchor preview's tokens that appear
// in the default antiphon's leading window.
function tokenOverlapRatio(ancNorm, defNorm) {
  const ancToks = ancNorm.split(/\s+/).filter(t => t.length >= 3)
  if (ancToks.length === 0) return 0
  // Consider first 15 tokens of default as the relevant window.
  const defHead = defNorm.split(/\s+/).slice(0, 15).join(' ')
  let hits = 0
  for (const t of ancToks) if (defHead.includes(t)) hits++
  return hits / ancToks.length
}

// Parse an anchor line. Returns { type:'psalm'|'canticle', num:number|null,
// preview:string } or null.
function parseAnchor(line) {
  const m1 = line.match(/^Шад\s+дуулал(?:\s+(\d+))?\s+(.+)$/)
  if (m1) {
    const rest = m1[2].trim()
    // skip the rubric "Шад дуулал ердийн байдлаар давтагдана."
    if (/^ердийн/.test(rest)) return null
    return { type: 'psalm', num: m1[1] ? parseInt(m1[1], 10) : null, preview: rest }
  }
  const m2 = line.match(/^Шад\s+магтаал(?:\s+(\d+))?\s+(.+)$/)
  if (m2) {
    const rest = m2[2].trim()
    if (/^ердийн/.test(rest)) return null
    return { type: 'canticle', num: m2[1] ? parseInt(m2[1], 10) : null, preview: rest }
  }
  return null
}

function collectAnchors(lines) {
  const anchors = []
  for (let i = 0; i < lines.length; i++) {
    const a = parseAnchor(lines[i])
    if (!a) continue
    // When the anchor line itself has a short preview (antiphon wraps to
    // next line immediately), fold the next 1-2 non-noise lines into
    // `preview` so prefix-overlap matching has enough signal.
    if (a.preview.length < 25) {
      let extra = ''
      let j = i + 1
      let lookCount = 0
      while (j < lines.length && lookCount < 3) {
        const nxt = lines[j]
        if (isNoise(nxt)) {
          j++
          continue
        }
        // Stop at terminator or marker (another anchor / marker / body heading).
        if (parseAnchor(nxt)) break
        if (HARD_TERMINATORS.some(re => re.test(nxt))) break
        if (BODY_ENTRY_MARKERS.some(re => re.test(nxt))) break
        if (MARKERS.some(m => m.re.test(nxt))) break
        extra += (extra ? ' ' : '') + nxt.trim()
        if (a.preview.length + extra.length >= 30) break
        lookCount++
        j++
      }
      if (extra) a.preview = (a.preview + ' ' + extra).trim()
    }
    anchors.push({ ...a, lineIdx: i })
  }
  return anchors
}

// Read default antiphon from startIdx (a `Шад ...` anchor line) until
// blank line, terminator, or marker.
function readDefaultAntiphon(lines, startIdx) {
  const m = lines[startIdx].match(/^Шад\s+(?:дуулал|магтаал)(?:\s+\d+)?\s+(.*)$/)
  if (!m) return null
  const parts = [m[1].trim()]
  let sawBlank = false
  let i = startIdx + 1
  for (; i < lines.length; i++) {
    const line = lines[i]
    if (/^\s*$/.test(line)) {
      // After seeing a blank AND we've already accumulated a complete
      // antiphon (ends with punctuation), stop.
      if (sawBlank || /[.!?]$/.test(parts.join(' ').trim())) break
      sawBlank = true
      continue
    }
    if (HARD_TERMINATORS.some(re => re.test(line))) break
    if (BODY_ENTRY_MARKERS.some(re => re.test(line))) break
    if (MARKERS.some(m2 => m2.re.test(line))) break
    if (isNoise(line)) continue
    parts.push(line.trim())
    sawBlank = false
  }
  return { defaultText: parts.join(' ').replace(/\s+/g, ' ').trim(), endIdx: i }
}

// PDF occasionally wraps long marker labels across line breaks:
//   "Дөчин хоногийн цаг улирлын 2 дахь Ням\ngараг: ..."
// When the current line ends with a known marker prefix fragment and
// the next non-noise line begins with the completion ("гараг:"), splice
// them into a single line string before matching.
function maybeJoinMarker(lines, i) {
  const curr = lines[i]
  // Current line ends with a marker-prefix fragment that suggests the
  // next line completes it. Covered cases:
  //   "... Ням\nгараг: ..."                  (main per-Sunday marker wrap)
  //   "... Ариун долоо\nхоног: ..."           (Holy Week skip marker wrap)
  //   "... Эзэний тарчлалтын\nНям гараг: ..." (Passion Sunday wrap form A,
  //                                             Week 1 — ends with "тарчлалтын")
  //   "... Эзэний\nтарчлалтын Ням гараг: ..." (Passion Sunday wrap form B,
  //                                             Week 2 — ends with "Эзэний",
  //                                             task #16)
  //   "... Хэрэв энэ Ням\nгараг ..."           (rubric wrap)
  if (
    !/(Ням\s*$)|(Ням\s+хоног\s*$)|(Ариун\s+долоо\s*$)|(тарчлалтын\s*$)|(Эзэний\s*$)|(энэ\s+Ням\s*$)/.test(
      curr,
    )
  ) {
    return null
  }
  for (let j = i + 1; j < lines.length && j < i + 4; j++) {
    const nxt = lines[j]
    if (/^\s*$/.test(nxt) || isNoise(nxt)) continue
    if (
      /^гараг:/.test(nxt) ||
      /^хоног:/.test(nxt) ||
      /^Ням\s+гараг:/.test(nxt) ||
      /^тарчлалтын\s+Ням\s+гараг:/.test(nxt)
    ) {
      return { joined: curr + ' ' + nxt, consumed: j - i }
    }
    break
  }
  return null
}

// From startIdx, collect variant blocks until a HARD_TERMINATOR.
//
// State machine:
//   `current`    — accumulating the text of the latest marker-tagged variant
//   `discarding` — we just flushed a SKIP_MARKER; drop non-marker lines
//                  until the next real marker (or terminator) arrives
//   `inBody`     — we crossed a BODY_ENTRY_MARKER (`Магтаал`, `Дуулал N`,
//                  …); drop body text until a real marker arrives. This
//                  lets the walker reach per-entry rubrics that live past
//                  the body heading (task #16 — w2-sun-vesp-cant Passion
//                  Sunday at PDF line 6411). Exits immediately when the
//                  next MARKER/SKIP_MARKER fires.
function readVariantBlocks(lines, startIdx) {
  const variants = []
  let current = null
  let discarding = false
  let inBody = false
  let i = startIdx
  for (; i < lines.length; i++) {
    let line = lines[i]
    let extraConsumed = 0

    // Try to splice a wrapped marker (label split across line break).
    const join = maybeJoinMarker(lines, i)
    if (join) {
      line = join.joined
      extraConsumed = join.consumed
    }

    if (HARD_TERMINATORS.some(re => re.test(line))) break
    // Blank lines and noise are transparent in all states.
    if (/^\s*$/.test(line) || isNoise(line)) continue

    // SKIP marker: flush current variant, enter discard mode. Also
    // exits the body-skip state so post-body SKIP labels don't leak
    // back into body.
    if (SKIP_MARKERS.some(re => re.test(line))) {
      if (current) {
        variants.push(current)
        current = null
      }
      discarding = true
      inBody = false
      i += extraConsumed
      continue
    }

    // Real marker match. Any marker pulls us out of inBody/discarding.
    let matched = false
    for (const mk of MARKERS) {
      const mm = line.match(mk.re)
      if (mm) {
        if (current) variants.push(current)
        current = {
          season: mk.season,
          isPerSunday: !!mk.isPerSunday,
          weekNums: mk.isPerSunday
            ? mm[1]
                .split(',')
                .map(s => parseInt(s.trim(), 10))
                .filter(n => Number.isFinite(n))
            : null,
          text: mm[mk.isPerSunday ? 2 : 1].trim(),
        }
        discarding = false
        inBody = false
        matched = true
        i += extraConsumed
        break
      }
    }
    if (!matched) {
      // Body-entry heading (canticle `Магтаал`, numbered `Дуулал N`) —
      // flush the in-progress variant and enter body-skip. Further
      // text will be dropped until the next MARKER re-enters the
      // variant scan.
      if (BODY_ENTRY_MARKERS.some(re => re.test(line))) {
        if (current) {
          variants.push(current)
          current = null
        }
        inBody = true
        continue
      }
      if (inBody) continue
      if (discarding) continue
      if (current) {
        current.text = (current.text + ' ' + line.trim())
          .replace(/\s+/g, ' ')
          .trim()
      }
      // else: unexpected prose between anchor and marker — ignore
    }
  }
  if (current) variants.push(current)
  return { variants, endIdx: i }
}

// -------------------- main --------------------

function main() {
  const pdfText = fs.readFileSync(PDF_PATH, 'utf8')
  const lines = pdfText.split(/\r?\n/)
  const entries = loadEntries()
  const anchors = collectAnchors(lines)

  const extracted = {}
  const debug = []
  const unmatched = []

  const MIN_OVERLAP = 15 // min chars of default_antiphon ↔ anchor.preview overlap

  // Build index: for each anchor, precompute normalised preview.
  for (const anc of anchors) {
    anc.previewNorm = norm(anc.preview)
  }

  for (const entry of entries) {
    const expectedType = entry.type === 'canticle' ? 'canticle' : 'psalm'
    const defNorm = norm(entry.default_antiphon)

    // Find best anchor: highest prefix overlap among same-type anchors.
    // Anchors may be shared across weeks (e.g. SAT vespers uses the same
    // psalm antiphons in w1, w2, w3), so we do NOT mark anchors as claimed.
    // Tie-break: choose the anchor with matching `num` if available, then
    // the first PDF occurrence.
    let foundIdx = -1
    let bestOverlap = 0
    for (let p = 0; p < anchors.length; p++) {
      const anc = anchors[p]
      if (anc.type !== expectedType) continue
      const ov = prefixOverlap(anc.previewNorm, defNorm)
      if (ov < MIN_OVERLAP) continue
      // Score: prefer matching num; otherwise prefer larger overlap; then earlier PDF position.
      let score = ov
      const expectedNum = entry.idx === 1 && entry.type === 'canticle' ? null : entry.idx + 1
      if (anc.num !== null && anc.num === expectedNum) score += 50
      if (score > bestOverlap) {
        bestOverlap = score
        foundIdx = p
      }
    }

    // Fallback: PDF parser may have reordered words (observed for
    // w2-fri-lauds-cant) so prefix overlap fails. Try token-set overlap.
    if (foundIdx === -1) {
      let bestRatio = 0
      for (let p = 0; p < anchors.length; p++) {
        const anc = anchors[p]
        if (anc.type !== expectedType) continue
        const r = tokenOverlapRatio(anc.previewNorm, defNorm)
        if (r >= 0.7 && r > bestRatio) {
          bestRatio = r
          foundIdx = p
        }
      }
    }

    if (foundIdx === -1) {
      unmatched.push({
        key: entry.antiphon_key,
        type: entry.type,
        week: entry.week,
        day: entry.day,
        hour: entry.hour,
        idx: entry.idx,
        antStart: entry.default_antiphon.slice(0, 40),
      })
      continue
    }

    const anchor = anchors[foundIdx]

    const defRead = readDefaultAntiphon(lines, anchor.lineIdx)
    if (!defRead) continue

    const variantsRead = readVariantBlocks(lines, defRead.endIdx)
    const seasonalAntiphons = {}
    for (const v of variantsRead.variants) {
      if (v.isPerSunday) {
        const bucket = seasonalAntiphons[v.season] || {}
        for (const wnum of v.weekNums) bucket[wnum] = v.text
        seasonalAntiphons[v.season] = bucket
      } else {
        seasonalAntiphons[v.season] = v.text
      }
    }

    debug.push({
      key: entry.antiphon_key,
      pdfLine: anchor.lineIdx + 1,
      pdfLineEnd: variantsRead.endIdx + 1,
      anchorNum: anchor.num,
      anchorPreview: anchor.preview.slice(0, 40),
      defaultPrefix: entry.default_antiphon.slice(0, 40),
      variantCount: variantsRead.variants.length,
      seasons: Object.keys(seasonalAntiphons),
    })

    if (Object.keys(seasonalAntiphons).length > 0) {
      extracted[entry.antiphon_key] = seasonalAntiphons
    }
  }

  // stats
  let total = 0
  const bySeason = {}
  for (const k of Object.keys(extracted)) {
    const sa = extracted[k]
    for (const s of Object.keys(sa)) {
      if (s === 'easterSunday' || s === 'lentSunday') {
        const nkeys = Object.keys(sa[s]).length
        bySeason[s] = (bySeason[s] || 0) + nkeys
        total += nkeys
      } else {
        bySeason[s] = (bySeason[s] || 0) + 1
        total++
      }
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(OUT_PATH, JSON.stringify(extracted, null, 2) + '\n', 'utf8')
  fs.writeFileSync(
    DEBUG_PATH,
    JSON.stringify({ debug, unmatched, stats: { total, bySeason } }, null, 2) + '\n',
    'utf8',
  )

  console.log(`\n[extract] wrote ${OUT_PATH}`)
  console.log(`[extract] entries scanned: ${entries.length}`)
  console.log(`[extract] matched: ${entries.length - unmatched.length}`)
  console.log(`[extract] unmatched: ${unmatched.length}`)
  console.log(`[extract] entries with variants: ${Object.keys(extracted).length}`)
  console.log(`[extract] total variants: ${total}`)
  console.log(`[extract] by season:`, bySeason)
  if (unmatched.length > 0) {
    console.log('\n[extract] Unmatched entries:')
    for (const u of unmatched) {
      console.log(
        `  - ${u.key} (w${u.week} ${u.day} ${u.hour} idx=${u.idx} ${u.type}) "${u.antStart}..."`,
      )
    }
  }
}

main()
