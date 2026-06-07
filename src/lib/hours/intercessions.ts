/**
 * Гуйлтын залбирал (intercessions) parser.
 *
 * 원문은 두 가지 포맷으로 존재한다.
 *  - 시편집(psalter/week-*.json): intro가 여러 배열 원소에 걸쳐 있고(`":"`로 끝나는 원소까지),
 *    refrain은 그 다음 단독 원소이며, 각 청원은 `" - "`(space-hyphen-space)로
 *    부제 몫과 응답을 구분한다. 청원이 다음 원소로 이어질 수도 있다.
 *  - 계절/성인 고유문(propers/*.json): intro와 refrain이 한 문자열에 `":"`로 결합되어 있고,
 *    각 청원은 `" — "`(space-emdash-space) 구분자로 한 문자열에 완결된다.
 *
 * 두 포맷 모두 마지막 원소가 `"Тэнгэр дэх Эцэг минь ээ..."`이면 closing hint로 분리한다.
 */

export interface ParsedPetition {
  versicle: string
  response?: string
}

export interface ParsedIntercessions {
  introduction?: string
  refrain?: string
  petitions: ParsedPetition[]
  closing?: string
}

const SEPARATOR = /\s[-—]\s/
// GOAL #31 / WI #33 — the colonless fallback routing is gated on the PSALTER
// separator (space-hyphen-space " - ") ONLY. The file-header format contract is
// psalter=hyphen, propers=em-dash (" — "); a full-data scan confirms the split
// is exact (4 colonless psalter blocks use " - " and 0 em-dash; the 7 colonless
// propers blocks use " — " and 0 hyphen). Gating routing on this separator
// keeps colonless PROPERS blocks (whose intro+refrain share the first element —
// a different shape this WI does not handle) on their prior behavior. Petition
// SPLITTING still uses the general SEPARATOR below — only ROUTING is narrowed.
const SEPARATOR_PSALTER = /\s-\s/
const CLOSING_PREFIX = 'Тэнгэр дэх Эцэг'

// GOAL #31 / WI #33 — colonless psalter fallback. A petition-1 versicle that
// wraps backward from the first separator normally stops at the previous
// sentence boundary; it must NOT stop when the versicle's leading sentence is
// grammatically dependent on the one before it (a subordinating/causal
// "Учир нь" / "for, because" clause), because the two sentences are then ONE
// versicle. Scoped to the single such boundary among the four affected
// colonless psalter blocks (W4 SUN Lauds, full_pdf.txt:14258-14266). Extend
// case-by-case only if a future colonless block exposes another binding
// conjunction at the refrain↔versicle seam.
// NB: a trailing `\b` does NOT work here — JS `\w`/`\b` treat Cyrillic letters
// as non-word characters even under `/u`, so `\b` after "нь" never matches.
// Use an explicit whitespace/end lookahead instead.
const CONTINUATION_LEAD = /^Учир нь(?=\s|$)/u

// FR-169 (#115 C1): exported so the render layer (intercessions-section.tsx)
// can reuse the EXACT same closing-incipit predicate (SSOT — same
// CLOSING_PREFIX + quote-stripping). This adds an `export` keyword only;
// `parseIntercessions` and every internal call site are byte-for-byte
// unchanged — no parse-layer behavior change (regression guard D3-a).
export function isClosingLine(line: string): boolean {
  const cleaned = line.replace(/^[\s"'“”«»]+/u, '')
  return cleaned.startsWith(CLOSING_PREFIX)
}

function endsSentence(text: string | undefined): boolean {
  if (!text) return false
  const trimmed = text.trimEnd().replace(/["'”»]+$/u, '')
  return /[.!?。！？]$/.test(trimmed)
}

function splitOnSeparator(text: string): [string, string] | null {
  const m = text.match(SEPARATOR)
  if (!m || m.index === undefined) return null
  const before = text.slice(0, m.index).trim()
  const after = text.slice(m.index + m[0].length).trim()
  if (!before || !after) return null
  return [before, after]
}

// GOAL #31 / WI #33 — colonless psalter fallback. The Mongolian book PDF
// (parsed_data/full_pdf.txt) prints four psalter intercession blocks with NO
// ":" after the introduction (W1 WED Vespers, W3 SUN Lauds, W4 SUN Lauds,
// W4 MON Vespers). The colon-terminated intro accumulator in the main parser
// then swallows every line and returns petitions:[], so the render layer
// (intercessions-section.tsx) drops the structured path. Inserting a ":" into
// the data would fabricate punctuation absent from the SoT (MT/날조 금지), so
// the fix lives here: anchor on the petition SEPARATOR (the per-petition
// versicle↔response boundary that survives the PDF→JSON line merge) and split
// intro / refrain / petitions structurally.
//
//   • petition-1 versicle wraps BACKWARD from the first separator over its
//     continuation lines; a sentence-ending line is the boundary EXCEPT when
//     the versicle's leading sentence is a CONTINUATION_LEAD clause (then the
//     two sentences are one versicle).
//   • refrain = the single sentence-unit immediately before that versicle
//     (may wrap across array elements — W4 MON, full_pdf.txt:15153-15154).
//   • introduction = everything before the refrain.
//
// Returns the index at which the shared petition loop should begin. Petition
// parsing itself (separator split, wrapped responses, closing incipit) is
// delegated UNCHANGED to that loop — colon-path behavior is not touched.
function extractColonlessIntroRefrain(
  lines: readonly string[],
  firstSepIdx: number,
  result: ParsedIntercessions,
): number {
  // Walk back from the first separator to the petition-1 versicle start.
  let vs = firstSepIdx
  while (vs - 1 >= 0) {
    const prev = lines[vs - 1]
    if (!endsSentence(prev)) {
      vs -= 1 // clear continuation — prev wraps into this versicle
      continue
    }
    if (CONTINUATION_LEAD.test(lines[vs])) {
      vs -= 1 // dependent leading clause — absorb the preceding sentence too
      continue
    }
    break
  }

  // Refrain = the sentence-unit ending at vs-1 (accumulate its wrapped head).
  let rs = vs
  if (rs - 1 >= 0) {
    rs -= 1
    while (rs - 1 >= 0 && !endsSentence(lines[rs - 1])) rs -= 1
  }

  const introLines = lines.slice(0, rs)
  const refrainLines = lines.slice(rs, vs)
  if (introLines.length > 0) {
    result.introduction = introLines.join(' ').replace(/\s+/g, ' ').trim()
  }
  if (refrainLines.length > 0) {
    result.refrain = refrainLines.join(' ').replace(/\s+/g, ' ').trim()
  }
  return vs
}

export function parseIntercessions(raw: readonly string[]): ParsedIntercessions {
  const result: ParsedIntercessions = { petitions: [] }
  if (!raw || raw.length === 0) return result

  const lines = raw.map((l) => l.trim()).filter((l) => l.length > 0)

  let i = 0

  // GOAL #31 / WI #33: when the source carries NO ":" anywhere but DOES carry a
  // psalter (" - ") petition separator, the introduction is colonless (exactly
  // the four affected psalter blocks: W1 WED Vespers, W3 SUN Lauds, W4 SUN
  // Lauds, W4 MON Vespers). Route through the structural fallback. Every other
  // shape — ":"-bearing psalter/proper formats, colonless PROPERS blocks (which
  // use the em-dash " — " separator and a combined-first-element intro+refrain
  // out of scope for this WI), AND no-colon-no-separator degenerate input —
  // keeps the original colon-terminated intro accumulator, so colon-path
  // behavior is byte-for-byte unchanged. SEPARATOR_PSALTER gating is what keeps
  // the 7 colonless propers blocks on their prior flat-fallback behavior.
  const hasColon = lines.some((l) => l.includes(':'))
  const firstSepIdx = lines.findIndex((l) => SEPARATOR_PSALTER.test(l))

  if (!hasColon && firstSepIdx !== -1) {
    i = extractColonlessIntroRefrain(lines, firstSepIdx, result)
  } else {
    const introBuf: string[] = []

    // 1) Intro: ":"로 끝나는 줄까지 누적. 계절 고유문은 ":"가 줄 중간에 있을 수 있다.
    while (i < lines.length) {
      const line = lines[i]
      if (isClosingLine(line)) break

      const colonIdx = line.indexOf(':')
      if (colonIdx === -1) {
        introBuf.push(line)
        i += 1
        continue
      }

      // ":" 뒤에 텍스트가 남아있으면 refrain과 같은 줄에 있는 형태
      const afterColon = line.slice(colonIdx + 1).trim()
      const beforeColon = line.slice(0, colonIdx).trim()
      if (beforeColon) introBuf.push(beforeColon)
      i += 1

      if (afterColon) {
        result.refrain = afterColon
      } else if (i < lines.length && !isClosingLine(lines[i]) && !SEPARATOR.test(lines[i])) {
        // 시편집 포맷: refrain이 다음 원소(들). 원문 PDF 줄바꿈 때문에 한 응답이
        // 여러 배열 원소로 쪼개질 수 있다(예: week-4 WED vespers
        //   ["Эзэн, Танд итгэж найддаг бүгд Таны дотор", "баясан цэнгэх болтугай."]).
        // 문장 종결부호 또는 첫 petition 구분자(SEPARATOR)/closing 경계까지 누적해
        // 하나의 refrain으로 결합한다. 단일 원소 refrain(이미 종결부호로 끝남)은
        // 첫 원소에서 break 하여 과누적을 막는다(정상 블록 동작 보존).
        const refrainBuf: string[] = []
        while (i < lines.length && !isClosingLine(lines[i]) && !SEPARATOR.test(lines[i])) {
          const piece = lines[i]
          refrainBuf.push(piece)
          i += 1
          if (endsSentence(piece)) break
        }
        result.refrain = refrainBuf.join(' ').replace(/\s+/g, ' ').trim()
      }
      break
    }

    if (introBuf.length > 0) {
      result.introduction = introBuf.join(' ').replace(/\s+/g, ' ').trim()
    }
  }

  // 2) Petitions: 구분자를 만날 때마다 경계 확정. 구분자가 없는 줄은
  //    현재 진행 중인 petition의 versicle(응답 시작 전) 또는 response(응답 시작 후)에 append.
  let current: ParsedPetition | null = null
  let inResponse = false

  const flush = () => {
    if (current) {
      if (current.versicle) result.petitions.push(current)
      current = null
    }
    inResponse = false
  }

  while (i < lines.length) {
    const line = lines[i]

    if (isClosingLine(line)) {
      flush()
      result.closing = line
      i += 1
      // 이후 줄은 closing의 연속으로 취급
      while (i < lines.length) {
        result.closing = `${result.closing} ${lines[i]}`.replace(/\s+/g, ' ').trim()
        i += 1
      }
      break
    }

    const split = splitOnSeparator(line)
    if (split) {
      const [before, after] = split
      if (current) {
        if (inResponse) {
          // 이전 petition 종료 후 새 petition 시작
          flush()
          current = { versicle: before, response: after }
          inResponse = true
        } else {
          // 진행 중 petition의 versicle에 누적된 텍스트 + before → versicle 확정, after → response
          current.versicle = [current.versicle, before].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
          current.response = after
          inResponse = true
        }
      } else {
        current = { versicle: before, response: after }
        inResponse = true
      }
      i += 1
      continue
    }

    // 구분자 없는 줄: 응답이 이미 종결된 문장이면 새 petition 시작, 아니면 현재 petition에 append.
    if (!current) {
      current = { versicle: line }
      inResponse = false
    } else if (inResponse) {
      if (endsSentence(current.response)) {
        flush()
        current = { versicle: line }
        inResponse = false
      } else {
        current.response = [current.response, line].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
      }
    } else {
      current.versicle = [current.versicle, line].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
    }
    i += 1
  }

  flush()

  return result
}
