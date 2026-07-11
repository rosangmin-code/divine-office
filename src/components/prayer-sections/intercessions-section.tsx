import type { HourSection } from '@/lib/types'
import { PageRef } from '../page-ref'
import { RichContent } from './rich-content'
import { DirectiveBlock, partitionDirectives } from './directive-block'
// FR-169 (#115 C2.1): reuse the parser's closing-incipit predicate (SSOT) to
// filter the Lord's-Prayer cue out of the legacy items[] render path.
import { isClosingLine } from '@/lib/hours/intercessions'

// F-X12 Phase A (#374): legacy-path heuristic — when a petition line ends with
// "...залбирцгаая" (cohortative "let us pray") plus optional sentence-end
// punctuation, the IMMEDIATELY following item is the intercession's response
// refrain. PDF renders this refrain in italics; we mirror that visual cue.
// Narrow scope: only matches the exact stem "залбирцгаая" (audit §3.5 —
// keeps recall low to avoid italicizing normal versicle/response pairs).
// Other cohortative suffixes (e.g. "алдаршуулцгаая") are intentionally
// excluded; extend case-by-case on user follow-up.
//
// Trailing-whitespace tolerant; punctuation optional and covers `:` / `.` /
// `;` / `!` / `?` / bare (NIT batch #409 — review #382 NIT-2 expansion;
// future PDF petition variants may use any sentence-end form). Cyrillic-only
// stem keeps ASCII keyword interactions impossible. The `u` flag aligns this
// regex with the F-X9 cohort patterns (`extract-psalter-headers.js:262`,
// `psalter-headers.test.ts:238`) for codebase consistency (NIT batch #409 —
// review #382 NIT-1).
export const LEGACY_INTERCESSION_REFRAIN_LEAD_RE = /залбирцгаая[:;.!?]?\s*$/u

export function IntercessionsSection({
  section,
}: {
  section: Extract<HourSection, { type: 'intercessions' }>
}) {
  const { hasSkip, prepends, appends, substitutes, skips } = partitionDirectives(
    section.directives,
  )

  // FR-160-B PR-9a: skip-only hides petition body but still renders the
  // section heading + skip directive so the user knows why no
  // petitions appear (e.g. an All Souls' substitute on Sunday).
  if (hasSkip && section.items.length === 0) {
    return (
      <section aria-label="Гуйлтын залбирал" className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-liturgical-red dark:text-liturgical-red-dark">
          Гуйлтын залбирал
        </p>
        <DirectiveBlock directives={skips} />
      </section>
    )
  }

  if (section.rich && section.rich.blocks.length > 0) {
    return (
      <section aria-label="Гуйлтын залбирал" className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-liturgical-red dark:text-liturgical-red-dark">
          Гуйлтын залбирал <PageRef page={section.page} />
        </p>
        <DirectiveBlock directives={prepends} />
        <RichContent content={section.rich} className="mt-2" />
        <DirectiveBlock directives={substitutes} />
        <DirectiveBlock directives={appends} />
      </section>
    )
  }

  if (section.items.length === 0) {
    return (
      <section aria-label="Гуйлтын залбирал" className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-liturgical-red dark:text-liturgical-red-dark">
          Гуйлтын залбирал
        </p>
        <p
          className="mt-1 text-sm italic text-stone-500 dark:text-stone-400"
          role="note"
        >
          [Орчуулга хийгдэж байна]
        </p>
      </section>
    )
  }

  const petitions = section.petitions ?? []
  const structured = petitions.length > 0

  return (
    <section aria-label="Гуйлтын залбирал" className="mb-4">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-liturgical-red dark:text-liturgical-red-dark">
        Гуйлтын залбирал <PageRef page={section.page} />
      </p>

      <DirectiveBlock directives={prepends} />
      <DirectiveBlock directives={substitutes} />

      {structured ? (
        <>
          {section.introduction && (
            <p className="mt-3 font-reading text-stone-800 dark:text-stone-200">
              {section.introduction}
            </p>
          )}
          {section.refrain && (
            <p
              data-role="intercessions-refrain"
              className="mt-3 rounded-md bg-amber-50/60 px-3 py-2 font-reading italic text-stone-800 dark:bg-stone-800/50 dark:text-stone-200"
            >
              {section.refrain}
            </p>
          )}
          <ul className="mt-3 space-y-3">
            {petitions.map((p, i) => (
              <li
                key={i}
                data-role="intercessions-petition"
                className="font-reading text-stone-800 dark:text-stone-200"
              >
                <div>{p.versicle}</div>
                {p.response && (
                  // F-X12 Phase A.1 (#425) — structured petitions[].response
                  // mirrors the PDF visual cue: each per-petition response
                  // (the line prefixed with `-` in the PDF) renders italic.
                  // PDF spot-check (audit doc §3.5):
                  //   p67 Sun Lauds:    "Эзэн, Та бол бидний амь болон аврал билээ." italic
                  //   p75 Sun Vespers:  "Эзэн, Таны хаанчлал орших болтугай." italic
                  //   p83 Mon Lauds:    "Эзэн, Та бидэнд Сүнсээ хайрлана уу." italic
                  // The structured `response` field is parsed by
                  // `parseIntercessions` (lib/hours/intercessions.ts) from the
                  // post-`-` segment, so we know it is the italic response —
                  // no heuristic / regex match required (vs the legacy
                  // items[] path which uses LEGACY_INTERCESSION_REFRAIN_LEAD_RE).
                  // Idempotent: italic is applied via stable className, so
                  // repeated renders of the same petition produce identical
                  // markup; no double-italic compounding possible.
                  <div
                    data-role="intercessions-response"
                    className="mt-1 italic"
                  >
                    <span className="not-italic text-liturgical-gold dark:text-liturgical-gold-dark">- </span>
                    {p.response}
                  </div>
                )}
              </li>
            ))}
          </ul>
          {/* FR-169 (#115 C2.2): the Lord's-Prayer guidance cue («closing»)
              is removed. The Lord's Prayer (ourFather) section follows
              immediately, so no incipit cue is needed. `section.closing` is
              still populated by the parser (petition-boundary detection
              unchanged — D3-a) but is intentionally no longer rendered. */}
        </>
      ) : (
        <>
          {section.intro && (
            <p className="mt-2 font-reading text-stone-800 dark:text-stone-200">
              {section.intro}
            </p>
          )}
          <ul className="mt-2 space-y-2">
            {section.items
              // FR-169 (#115 C2.3): filter the trailing Lord's-Prayer incipit
              // cue out of the legacy render path (the 3 legacy+incipit blocks:
              // week-3 SUN lauds, week-4 SUN lauds, week-4 MON vespers). Reuses
              // the parser's `isClosingLine` predicate (SSOT — same
              // `Тэнгэр дэх Эцэг` prefix + quote-stripping). The other 8 legacy
              // blocks carry no incipit, so the filter is a safe no-op there.
              .filter((item) => !isClosingLine(item.trim()))
              .map((item, i, items) => {
                // F-X12 Phase A: cohortative trigger on previous line elevates
                // the next item to refrain (italic). i === 0 always plain.
                // `prev` look-back sources from the FILTERED `items` (map 3rd
                // arg) so refrain detection stays index-consistent after the
                // trailing incipit is dropped.
                const prev = i > 0 ? items[i - 1] : ''
                const isRefrain =
                  i > 0 &&
                  LEGACY_INTERCESSION_REFRAIN_LEAD_RE.test(prev.trim())
                return (
                  <li
                    key={i}
                    data-role={
                      isRefrain ? 'intercessions-refrain' : undefined
                    }
                    className={`font-reading text-stone-800 dark:text-stone-200${
                      isRefrain ? ' italic' : ''
                    }`}
                  >
                    — {item}
                  </li>
                )
              })}
          </ul>
        </>
      )}
      <DirectiveBlock directives={appends} />
    </section>
  )
}
