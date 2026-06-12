# Mental Model - Intercessions Parenthetical Alternate Paragraph Split (GOAL #125)

> Blueprint SSOT for GOAL #125 / `[#125-sub-1]`. This document defines the
> intended state, action boundaries, scenarios, tests, and sync surface for the
> intercessions paragraph-split defect shown in
> `/home/min/myproject/divineoffice/Screenshot_20260610_215923_Samsung Browser.jpg`.
> It is an English MM-definition document; Mongolian source strings are quoted
> verbatim as source evidence.

---

## Intended Behavior

Week 2 Wednesday Vespers intercessions must render each petition and its response
as a complete pair. The parenthesized alternate petition:

```text
(эсвэл Аяа, Эзэн, Та бүх зовлон зүдгүүрээс
биднийг аварна уу. - Бидний гэрүүдийг адисална уу)
```

is a self-contained alternate versicle/response pair. Its response ends at the
closing parenthesis after `Бидний гэрүүдийг адисална уу)`. The following line:

```text
Та итгэлт талийгаачдад Өөрийнхөө царайгаа
харуулна уу. - Тэднийг Өөрийн оршихуйгаар баярлуулна уу.
```

is the next petition, not a continuation of the alternate response.

The fix must recover this boundary in parser/render structure only. Source data
in `src/data/loth/psalter/week-2.json` remains byte-for-byte faithful to the
book; no punctuation or wording is inserted into the SoT data.

## Observable Outcome

On the real Week 2 Wednesday Vespers screen, e.g. `/pray/2026-06-10/vespers`,
the malformed sequence visible in the screenshot is gone:

- `- Бидний гэрүүдийг адисална уу)` is not glued to `Та итгэлт талийгаачдад...`.
- `Та итгэлт талийгаачдад Өөрийнхөө царайгаа харуулна уу.` starts its own
  petition line.
- `- Тэднийг Өөрийн оршихуйгаар баярлуулна уу.` remains the response for that
  petition.
- The Lord's Prayer section still follows after the intercessions; GOAL #115's
  removal of the Lord's-Prayer guidance cue is not reopened.

## Non-Goals

- No edits to Mongolian source strings in `week-2.json` or any other SoT data.
- No insertion of a period before the closing parenthesis. The source text is
  `уу)`, and the parser must handle that structural boundary.
- No broad rewrite of all intercessions parsing. The bug is a narrow
  parenthesized alternate response boundary in the existing `string[]` path.
- No change to rich intercessions that already render through `PrayerText` and
  `RichContent`.
- No change to the Lord's Prayer, concluding prayer, psalmody, responsory,
  gospel canticle, or `/ordinarium` surfaces.

## AC Link

- **[D1] Alternate pair boundary** - Week 2 Wednesday Vespers parses the
  parenthesized `(эсвэл ... - ...)` alternate as a complete petition/response
  pair; its response is exactly `Бидний гэрүүдийг адисална уу)`.
- **[D2] Next petition separation** - `Та итгэлт талийгаачдад Өөрийнхөө царайгаа
  харуулна уу.` is a separate petition with response `Тэднийг Өөрийн
  оршихуйгаар баярлуулна уу.`, not response continuation text.
- **[D3] Source fidelity and regression control** - data text remains
  unchanged; other intercessions split behavior, legacy refrain italic behavior,
  structured response italic behavior, and closing-incpit filtering remain
  unchanged.

---

## State Model

### Raw Data State

Intercessions enter the hour assembler as `HourPropers.intercessions: string[]`.
The failing raw block is `src/data/loth/psalter/week-2.json:627-650`, page 243.
The relevant raw lines are:

```text
"Эзэн, Та бидэнд сайхан цаг агаар хайрлана уу. - Ингэвэл бид дэлхийн үр жимсийг элбэгээр",
"хурааж болох юм.",
"(эсвэл Аяа, Эзэн, Та бүх зовлон зүдгүүрээс",
"биднийг аварна уу. - Бидний гэрүүдийг адисална уу)",
"Та итгэлт талийгаачдад Өөрийнхөө царайгаа",
"харуулна уу. - Тэднийг Өөрийн оршихуйгаар баярлуулна уу.",
"“Тэнгэр дэх Эцэг минь ээ...”"
```

### Parser State

`assembleVespers` and `assembleLauds` call `parseIntercessions()` and pass both
the raw `items` and parsed fields into the `intercessions` `HourSection`.

Current parser failure state:

- `splitOnSeparator()` correctly sees the ` - ` separator inside the alternate.
- The parsed alternate response becomes `Бидний гэрүүдийг адисална уу)`.
- `endsSentence()` does not treat this as a closed response because it ends in
  `)`, not a recognized sentence terminal.
- The next raw line is appended to the response, producing
  `Бидний гэрүүдийг адисална уу) Та итгэлт талийгаачдад Өөрийнхөө царайгаа`.
- The final `харуулна уу. - ...` line becomes a damaged standalone petition.

Intended parser state:

- A response that closes a parenthesized alternate with `)` after an optative
  prayer ending such as `уу)` is terminal for petition-boundary purposes.
- After that terminal response, the next raw line starts a new petition.
- `isClosingLine()` behavior for `“Тэнгэр дэх Эцэг минь ээ...”` remains
  unchanged.

### Render State

`IntercessionsSection` has three render routes:

- rich route: `section.rich.blocks.length > 0` -> `RichContent`.
- structured route: `section.petitions.length > 0` -> petition `<li>` plus
  response `<div data-role="intercessions-response">`.
- legacy route: raw `items[]`, with the F-X12 refrain italic heuristic and
  GOAL #115 closing-incipit filter.

The failing screen uses the structured route. Therefore the fix belongs in
parser structure, not in CSS or presentation text.

## Action Map

### A1 - Parser Boundary Contract

Target: `src/lib/hours/intercessions.ts`.

Define a narrow terminal-boundary rule for parenthesized alternate responses so
that a parsed response ending with the close of an alternate prayer is complete.
The rule must be structural, not data-mutating. It must not change the raw
string array.

Allowed implementation shapes:

- extend the sentence-completion predicate used after response accumulation; or
- add a helper specific to intercessions response completion.

Required constraints:

- Keep `splitOnSeparator()` separator semantics unchanged.
- Keep colonless psalter and colonless propers routing unchanged.
- Keep `isClosingLine()` unchanged.
- Do not treat every closing parenthesis in every context as proof of a valid
  intercession boundary unless tests prove that scope safe.

### A2 - Renderer Contract

Target: `src/components/prayer-sections/intercessions-section.tsx`.

No renderer workaround is the primary fix. The renderer should receive correct
`petitions[]` state from `parseIntercessions()` and render it through the
existing structured path. Existing F-X12 response italic and GOAL #115 closing
cue behavior are invariants.

### A3 - Test Contract

Add direct parser coverage for the Week 2 Wednesday Vespers raw block and keep
existing renderer tests green. If a renderer regression test is added, it should
assert the structured output does not contain the glued substring
`адисална уу) Та итгэлт`.

### A4 - Verification Contract

Use a real route or component integration check for `/pray/2026-06-10/vespers`
as the user-facing proof. The screenshot is evidence for the pre-fix symptom,
not a target artifact to modify.

## Scenarios

### S1 - Happy Path: Week 2 Wednesday Vespers

Given `src/data/loth/psalter/week-2.json` `days.WED.vespers.intercessions`,
when `parseIntercessions()` runs, the alternate parenthetical line becomes its
own petition/response pair and the deceased petition starts separately.

Expected parsed tail:

```text
petition[4].versicle = "(эсвэл Аяа, Эзэн, Та бүх зовлон зүдгүүрээс биднийг аварна уу."
petition[4].response = "Бидний гэрүүдийг адисална уу)"
petition[5].versicle = "Та итгэлт талийгаачдад Өөрийнхөө царайгаа харуулна уу."
petition[5].response = "Тэднийг Өөрийн оршихуйгаар баярлуулна уу."
```

### S2 - Failure Guard: Do Not Glue Adjacent Petitions

The string `Бидний гэрүүдийг адисална уу) Та итгэлт талийгаачдад` must not
appear in parsed responses or rendered HTML.

### S3 - Regression Guard: Ordinary Split Behavior

Existing ` - ` and ` — ` petition splits continue to work:

- standard psalter pairs still split into `versicle` plus `response`;
- colonless psalter handling still recognizes the W3 `-Тэдэнд` case;
- propers em-dash blocks still use the propers route;
- F-X12 response italic tests remain green.

### S4 - Regression Guard: Closing Incipit

The trailing Lord's-Prayer incipit still parses into `closing`, and the GOAL
#115 renderer behavior still suppresses it in the UI. It must not be treated as
a petition line.

## Visibility Boundary

Affected:

- Lauds/Vespers intercessions that use `HourPropers.intercessions: string[]`.
- The structured petition path in `IntercessionsSection` when parser output
  changes from malformed to correct.
- Week 2 Wednesday Vespers, specifically the user-reported screenshot surface.

Not affected:

- `intercessionsRich` / `PrayerText` data rendered by `RichContent`.
- Lord's Prayer body and GOAL #115 cue-removal behavior.
- Concluding prayers, psalmody, responsory, gospel canticles, and `/ordinarium`.
- SoT data strings in `src/data/loth/psalter/week-2.json`.

## Test Scenario Map

| ID | AC | Command | Assertions |
| --- | --- | --- | --- |
| T1-parser-w2-wed | D1, D2 | `npx vitest run src/lib/hours/__tests__/intercessions.test.ts` | A new parser test using `week-2.json days.WED.vespers.intercessions` asserts the four exact parsed tail strings in Scenario S1. |
| T2-parser-inline | D1, D2 | `npx tsx -e "import data from './src/data/loth/psalter/week-2.json' assert { type: 'json' }; import { parseIntercessions } from './src/lib/hours/intercessions.ts'; const p=parseIntercessions((data as any).days.WED.vespers.intercessions).petitions; if (p[4].response !== 'Бидний гэрүүдийг адисална уу)') throw new Error('alternate response not bounded'); if (p[5].versicle !== 'Та итгэлт талийгаачдад Өөрийнхөө царайгаа харуулна уу.') throw new Error('next petition not separated');"` | Command exits 0 after implementation. Before implementation it fails because `p[4].response` contains the next petition prefix. |
| T3-render-structured | D2, D3 | `npx vitest run src/components/prayer-sections/__tests__/intercessions-section.test.ts` | Existing F-X12 structured response italic tests remain green; any added fixture asserts rendered markup does not contain `адисална уу) Та итгэлт`. |
| T4-data-fidelity | D3 | `git diff -- src/data/loth/psalter/week-2.json` | No diff to SoT data for this GOAL's implementation. |
| T5-visual-route | D1, D2 | Playwright route check for `/pray/2026-06-10/vespers` | Intercessions section has no glued substring `адисална уу) Та итгэлт`; the deceased petition and its `- Тэднийг...` response render as a separate petition/response pair. |

## Sync Surface

Implementation follow-up must coordinate these surfaces:

- `src/lib/hours/intercessions.ts` - parser boundary rule.
- `src/lib/hours/__tests__/intercessions.test.ts` or equivalent parser test -
  new direct coverage for Week 2 Wednesday Vespers.
- `src/components/prayer-sections/__tests__/intercessions-section.test.ts` -
  keep existing F-X12 / GOAL #115 intercessions rendering coverage green; add a
  no-glued-substring fixture only if the implementation changes renderer-facing
  assumptions.
- `public/sw.js` - re-check current `CACHE_VERSION` during implementation. If
  runtime bundle/output changes are deployed behind the service worker, bump per
  the existing project release convention.

This Step 1 MM doc itself is markdown-only and requires no SW/cache/data change.

## Citation Index

- User screenshot evidence:
  `/home/min/myproject/divineoffice/Screenshot_20260610_215923_Samsung Browser.jpg`.
- Failing source data:
  `src/data/loth/psalter/week-2.json:627-650`, especially `:646-649`.
- PDF-layout extraction evidence:
  `scripts/out/psalter_layout.txt:4601-4608`.
- Parser:
  `src/lib/hours/intercessions.ts` (`splitOnSeparator`, `endsSentence`,
  `parseIntercessions`, `isClosingLine`).
- Hour assembly:
  `src/lib/hours/vespers.ts:54-65`, `src/lib/hours/lauds.ts:83-94`.
- Renderer:
  `src/components/prayer-sections/intercessions-section.tsx`.
- Existing test surface:
  `src/components/prayer-sections/__tests__/intercessions-section.test.ts`.
