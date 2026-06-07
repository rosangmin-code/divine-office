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
 *
 * 콜론 없는 변형(GOAL #31): 원문 PDF(full_pdf.txt)에 도입부 뒤 `":"`가 없는 블록이 있다.
 *  - 시편집 4건(WI #33): hyphen `" - "` + refrain 단독 원소 → colonless psalter fallback.
 *  - 고유문 7건(WI #41): em-dash `" — "` + intro·refrain 가 첫 원소에 결합 →
 *    colonless propers fallback(cohortative 초대구 경계로 분리).
 * 데이터에 `":"`를 삽입하지 않고(MT/SoT 금지) 파서에서 구조적으로 분리한다.
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
// GOAL #31 / WI #41 — the PROPERS petition separator is the em-dash
// (space-emdash-space " — "). The 7 colonless propers blocks use it exclusively
// (full-data scan: 0 of them carry a hyphen separator), so routing the colonless
// fallback on it — AFTER the hyphen check — targets exactly those 7 blocks and
// never the 4 hyphen psalter blocks.
const SEPARATOR_PROPERS = /\s—\s/
// GOAL #31 / WI #41 — colonless PROPERS invitation marker. In these blocks the
// PDF→JSON extraction collapsed the SoT paragraph break and merged the intro +
// refrain into ONE array element (e.g. advent W1 MON vespers — full_pdf.txt
// 19314-19316 prints the refrain "Эзэн минь ирэгтүн!..." on its own line). The
// intro ends with the leader's cohortative invitation ("let us pray/cry/
// beseech" — Mongolian plural exhortative -цгаая / -цгээ / -цгааж); the refrain
// is the response that follows. 5 of the 7 carry this marker; the other 2 are
// doxological intros handled by a last-sentence fallback (see
// extractColonlessPropersIntroRefrain). Cyrillic-only stem keeps ASCII keyword
// interactions impossible.
const COHORTATIVE_END = /(?:цгаая|цгээ|цгааж)$/u
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

// Split text into sentences on whitespace that follows sentence-terminal
// punctuation. Each returned sentence keeps its trailing punctuation, so the
// intro and refrain re-join byte-for-byte (no Mongolian text mutated).
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/u)
    .map((s) => s.trim())
    .filter(Boolean)
}

// GOAL #31 / WI #41 — colonless PROPERS fallback. Unlike the psalter colonless
// shape (refrain on its own array element), the 7 propers blocks merge the
// intro + refrain into the element(s) BEFORE the first em-dash petition. Split
// that combined text into introduction + refrain at the invitation boundary,
// then delegate petition parsing (em-dash separator, one petition per element)
// to the shared loop UNCHANGED. ":"-bearing propers and the hyphen psalter path
// are untouched — this branch only runs for colonless em-dash blocks.
//
// Boundary rule: the introduction ends at the LAST sentence carrying the
// cohortative invitation marker (COHORTATIVE_END); the refrain is every
// sentence after it. When no cohortative is present (2 doxological-intro blocks
// — advent W1 FRI lauds, lent W6 SAT lauds) the refrain is the final sentence.
function extractColonlessPropersIntroRefrain(
  lines: readonly string[],
  petitionStart: number,
  result: ParsedIntercessions,
): number {
  const combined = lines
    .slice(0, petitionStart)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  const sentences = splitSentences(combined)
  if (sentences.length === 0) return petitionStart

  let boundary = -1
  for (let s = 0; s < sentences.length; s += 1) {
    const bare = sentences[s].replace(/[.!?…”"'»]+$/u, '')
    if (COHORTATIVE_END.test(bare)) boundary = s
  }

  let introSents: string[]
  let refrainSents: string[]
  if (boundary >= 0 && boundary < sentences.length - 1) {
    introSents = sentences.slice(0, boundary + 1)
    refrainSents = sentences.slice(boundary + 1)
  } else {
    // Doxological intro (no cohortative) OR cohortative is the final sentence:
    // treat the last sentence as the refrain.
    introSents = sentences.slice(0, -1)
    refrainSents = sentences.slice(-1)
  }

  if (introSents.length > 0) result.introduction = introSents.join(' ').trim()
  if (refrainSents.length > 0) result.refrain = refrainSents.join(' ').trim()
  return petitionStart
}

export function parseIntercessions(raw: readonly string[]): ParsedIntercessions {
  const result: ParsedIntercessions = { petitions: [] }
  if (!raw || raw.length === 0) return result

  const lines = raw.map((l) => l.trim()).filter((l) => l.length > 0)

  let i = 0

  // Colonless routing (GOAL #31). When the source carries NO ":" anywhere, the
  // intro/refrain boundary must be recovered structurally. Two colonless shapes,
  // disambiguated by petition separator:
  //   • psalter (WI #33): hyphen " - " — refrain on its own array element. The 4
  //     blocks W1 WED Vespers, W3 SUN Lauds, W4 SUN Lauds, W4 MON Vespers.
  //   • propers (WI #41): em-dash " — " — intro+refrain merged into the first
  //     element. The 7 blocks advent W1 MON vespers / W1 FRI lauds / W1 FRI
  //     vespers, christmas epiphany SUN lauds, easter W1 TUE vespers / W1 THU
  //     vespers, lent W6 SAT lauds.
  // A full-data scan confirms 0 of the 172 intercession blocks carry BOTH
  // separators, so the hyphen check first / em-dash check second routes each
  // colonless block to exactly one handler and leaves ":"-bearing formats AND
  // the no-colon-no-separator degenerate input on the original colon path
  // (byte-for-byte unchanged).
  const hasColon = lines.some((l) => l.includes(':'))
  const firstHyphenSep = lines.findIndex((l) => SEPARATOR_PSALTER.test(l))
  const firstEmDashSep = lines.findIndex((l) => SEPARATOR_PROPERS.test(l))

  if (!hasColon && firstHyphenSep !== -1) {
    i = extractColonlessIntroRefrain(lines, firstHyphenSep, result)
  } else if (!hasColon && firstEmDashSep !== -1) {
    i = extractColonlessPropersIntroRefrain(lines, firstEmDashSep, result)
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
