# Mental Model — Psalm 63 Caption Line Break and Placement (GOAL #126)

> Blueprint SSOT for `[#126-sub-1]` / WI `wi-138-001`.
> This document defines the expected mental model for the Psalm 63 Lauds
> caption line break and placement behavior. It is an English MM-definition
> step only: no data re-extraction, code change, cache-version bump, or
> artifact regeneration belongs to this WI.
>
> Source context: `docs/research/GOAL116-methodology.md`,
> `docs/research/GOAL116-rootcause-fixplan.md`,
> `docs/design/mental-models/goal130-psalm63-caption-reposition.md`,
> and the untracked main-tree screenshot
> `/home/min/myproject/divineoffice/Screenshot_20260612_091540_Samsung Browser.jpg`.
> Mongolian liturgical text is quoted verbatim from PDF-sourced project data.

---

## Intended Behavior

For `Psalm 63:2-9` in Sunday Lauds, the Psalm header area is ordered as:

1. Psalm reference and page marker.
2. Title: `Тэнгэрбурханаар цангаж буй сэтгэл`.
3. Uncited caption:
   `Гэм нүглийн харанхуйгаас салсан хэнбугай ч`
   followed by `Тэнгэрбурханыг хүсэн тэмүүлнэ.`
4. Body first line: `Тэнгэрбурхан, Та миний Тэнгэрбурхан`.

The caption is not a body stanza, not an antiphon, and not an attribution.
It is a two-source-line, post-title `uncited_caption`. The authored data break
is the newline between the two caption source lines. Browser wrapping may split
the long first caption line visually on narrow screens; that visual wrap is a
layout consequence, not a new source line or extraction error.

The caption must be preserved exactly. The canonical spelling is
`Тэнгэрбурханыг хүсэн тэмүүлнэ.`; do not normalize it to the user-typed variant
`тэмүүлэнэ`, and do not use machine translation or inferred corrections.

---

## State Model

### Source State

- PDF/source evidence places the caption after the Psalm 63 title and before
  the first body line (`parsed_data/full_pdf.txt:1810-1815` and
  `parsed_data/week1/week1_final.txt:335-340` when the source corpus is present).
- The untracked screenshot
  `/home/min/myproject/divineoffice/Screenshot_20260612_091540_Samsung Browser.jpg`
  shows the intended visible order: reference/title, italic caption, then the
  larger body text.
- The Psalm 63 antiphon comes from `src/data/loth/psalter/week-1.json`; it is
  outside the caption state.

### Data State

- `src/data/loth/psalter-texts.json` must keep `Psalm 63:2-9.stanzas[0][0]`
  as `Тэнгэрбурхан, Та миний Тэнгэрбурхан`.
- `src/data/loth/prayers/commons/psalter-texts.rich.json` must keep the first
  rich-rendered stanza line as the same body line.
- `src/data/loth/prayers/commons/psalter-headers.rich.json` must carry a
  `Psalm 63:2-9` entry whose selected header has `kind: "uncited_caption"` and
  whose `preface_text` preserves the two caption lines with a single newline.

### Render State

- `src/components/psalm-block.tsx` renders `headerRich` after the title and
  before stanza content.
- For `kind === "uncited_caption"`, the renderer must use the post-title header
  slot without attribution parentheses or an empty attribution span.
- The caption style may wrap by viewport width, but the source newline remains
  only the boundary between the two caption lines.

---

## Action Map

### When Updating Data or Extraction

1. Match the special skip only by `ref === "Psalm 63:2-9"` plus the exact two
   caption source lines.
2. Move the caption out of `stanzas` / `stanzasRich`; do not delete it.
3. Preserve it in `psalter-headers.rich.json` as `uncited_caption`.
4. Leave `src/data/loth/psalter/week-1.json` unchanged unless a separate
   antiphon-routing task explicitly owns that file.
5. Keep negative guards for `Revelation 19:1-7` and `Psalm 139:1-18`; their
   superficially similar starts are real body text.

### When Updating Rendering

1. Render `uncited_caption` in the existing post-title `headerRich` slot.
2. Preserve line breaks with a whitespace-preserving style or equivalent text
   handling.
3. Suppress attribution parentheses and attribution spans for uncited captions.
4. Do not change antiphon order, stanza grouping, or unrelated Psalm header
   rendering.

### For This WI Only

- Author this markdown MM document.
- Do not re-extract `psalter-texts.json`.
- Do not edit implementation/data files.
- Shard floor markers: N/A, because this is md-only and has no executable
  behavior delta.

---

## Scenarios

### S1 — User-Facing Caption Placement

Given the user opens Sunday Lauds where the first psalm is `Psalm 63:2-9`, the
screen shows the title `Тэнгэрбурханаар цангаж буй сэтгэл`, then the two caption
source lines, then the body first line `Тэнгэрбурхан, Та миний Тэнгэрбурхан`.
The screenshot evidence named above is the visual reference for this ordering.

### S2 — Caption Line Break Semantics

Given the caption is stored as an `uncited_caption`, the source text contains
one semantic newline between:

- `Гэм нүглийн харанхуйгаас салсан хэнбугай ч`
- `Тэнгэрбурханыг хүсэн тэмүүлнэ.`

If a narrow viewport wraps the first line into multiple visual rows, no data
change is required. The renderer should still preserve the source newline.

### S3 — Body Data Is Clean

Given the caption has been relocated, `Psalm 63:2-9.stanzas[0][0]` and the first
rich stanza line are both `Тэнгэрбурхан, Та миний Тэнгэрбурхан`; neither caption
line appears inside Psalm 63 stanza 0.

### S4 — No Shape-Only Regression

Given `Revelation 19:1-7` and `Psalm 139:1-18` share a rough
"two-unindented-then-indented" surface shape, they must not be affected by the
Psalm 63 rule. `Revelation 19:1-7.stanzas[0][0]` remains `Аллэлуяа!`, and
`Psalm 139:1-18.stanzas[0][0]` remains `I`.

### S5 — MM-Definition Work Item

Given this WI is md-only, success is the committed creation of this document at
`docs/design/mental-models/goal126-psalm63-caption-break.md`, with the required
State Model, Action Map, Scenarios, Visibility Boundary, Test Scenario Map, and
Sync Surface sections. There is no re-extraction, no SW cache bump, and no
runtime test floor to satisfy.

---

## Visibility Boundary

- Visible to users: the order and text in the Psalm 63 header/body area.
- Visible to developers: JSON placement, renderer branch, tests, and this MM.
- Not user-visible in this WI: repository history, worklist lineage, shard
  classification, or md-only floor-marker notes.
- Out of scope: `/ordinarium`, psalm-prayer continuation bugs, machine
  translation, new Psalm header discovery, generic body-start heuristics,
  cache-version bumps, and full corpus re-extraction.
- Source-corpus availability is environment-dependent in isolated worktrees.
  If `parsed_data/` is absent, use the main-tree screenshot and tracked current
  data/tests as this WI's evidence. Future extraction WIs must restore or link
  the corpus before running source-corpus checks.

---

## Test Scenario Map

| Scenario | Command | Assertions |
| --- | --- | --- |
| S5 md-only MM structure | `test -f docs/design/mental-models/goal126-psalm63-caption-break.md && rg -n '^## (State Model|Action Map|Scenarios|Visibility Boundary|Test Scenario Map|Sync Surface)$' docs/design/mental-models/goal126-psalm63-caption-break.md` | File exists and all required MM section headings are present. |
| S5 markdown diff hygiene | `git diff --check -- docs/design/mental-models/goal126-psalm63-caption-break.md` | No whitespace errors in the committed markdown. |
| S1/S2/S3/S4 data regression | `npx vitest run src/lib/__tests__/data/psalm63-caption-reposition.test.ts` | Psalm 63 body starts at `Тэнгэрбурхан...`; caption is preserved as `uncited_caption`; Rev 19 / Ps 139 / week-1 invariants pass. |
| S1/S2 renderer regression | `npx vitest run src/components/__tests__/psalm63-caption-reposition.test.ts` | Render order is title -> caption -> body; `uncited_caption` has no attribution span or empty parentheses. |
| Corpus verifier follow-up | `node scripts/verify-psalter-stanzas.js && node scripts/verify-psalter-pages.js && node scripts/audit-psalter-ref-consistency.js` | Re-extraction or data-changing WIs must not increase stanza/page/ref-consistency suspect counts. N/A for this md-only WI unless data files change. |

For `wi-138-001`, run only the first two rows unless local policy requires
extra confidence; the remaining rows are the reusable blueprint for future
implementation or regression-review WIs.

---

## Sync Surface

- Primary MM file: `docs/design/mental-models/goal126-psalm63-caption-break.md`.
- Related MM: `docs/design/mental-models/goal130-psalm63-caption-reposition.md`.
- Research inputs: `docs/research/GOAL116-methodology.md`,
  `docs/research/GOAL116-rootcause-fixplan.md`, `docs/research/GOAL130-spec.md`,
  and `docs/research/GOAL130-scenarios.md`.
- Data surfaces: `src/data/loth/psalter-texts.json`,
  `src/data/loth/prayers/commons/psalter-texts.rich.json`,
  `src/data/loth/prayers/commons/psalter-headers.rich.json`, and
  `src/data/loth/psalter/week-1.json`.
- Render surface: `src/components/psalm-block.tsx`.
- Regression surfaces: `src/lib/__tests__/data/psalm63-caption-reposition.test.ts`
  and `src/components/__tests__/psalm63-caption-reposition.test.ts`.
- Main-tree screenshot evidence:
  `/home/min/myproject/divineoffice/Screenshot_20260612_091540_Samsung Browser.jpg`.
- Shard: none-justified; md-only.
- Floor markers: N/A; md-only document with no runtime floor.

Any future change that moves behavior outside this state/action/test map must
update this MM before implementation.
