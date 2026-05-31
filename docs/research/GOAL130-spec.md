# GOAL #130 - Psalm 63 Caption Reposition Spec

작성: dvo-res, task #133. 범위: Step 4 test authoring and Step 6 development input.
This spec consolidates the locked #116 fix plan, #131 mental model, and #132
scenarios; it does not reopen root-cause investigation.

## Locked User Outcome

For 2026-05-31 Lauds, the first psalm (`Psalm 63:2-9`) must render in this
screen order:

1. Title: `Тэнгэрбурханаар цангаж буй сэтгэл`
2. Caption/header: `Гэм нүглийн харанхуйгаас салсан хэнбугай ч` /
   `Тэнгэрбурханыг хүсэн тэмүүлнэ.`
3. Body first line: `Тэнгэрбурхан, Та миний Тэнгэрбурхан`

The caption is relocated, not deleted. It must not appear as the first stanza
body line (`docs/design/mental-models/goal130-psalm63-caption-reposition.md:39`,
`docs/research/GOAL130-scenarios.md:36`).

## Implementation Contract

### 1. Body Extraction Rule

Target: `scripts/extract-psalm-texts.js::extractPsalmBody`.

Add one Psalm-63-only caption skip after title skipping and before normal body
collection. The rule fires only when all conditions are true:

- `ref === "Psalm 63:2-9"`.
- The next two meaningful source lines are exactly:
  - `Гэм нүглийн харанхуйгаас салсан хэнбугай ч`
  - `Тэнгэрбурханыг хүсэн тэмүүлнэ.`

On match, advance the body start index by those two source lines. Keep the
existing `skipEpigraph` parenthetical-citation behavior unchanged. Do not add a
generic shape-only heuristic based on indentation, casing, or "two unindented
lines then indented body"; that would corrupt legitimate body starts for
`Revelation 19:1-7` and `Psalm 139:1-18`
(`docs/research/GOAL116-rootcause-fixplan.md:60`,
`docs/design/mental-models/goal130-psalm63-caption-reposition.md:90`,
`scripts/extract-psalm-texts.js:273`).

Required implementation detail: `extractPsalmBody` currently receives
`(lines, headerIdx, title, ownHeaderRegexes = [])`, so Step 6 must thread the
canonical `ref` into the function call before this rule can be correctly
ref-keyed. Do not infer Psalm 63 from the title text alone.

### 2. Caption Preservation

Add a `Psalm 63:2-9` entry to
`src/data/loth/prayers/commons/psalter-headers.rich.json`. The entry must
preserve the exact source spelling:

```json
{
  "kind": "uncited_caption",
  "preface_text": "Гэм нүглийн харанхуйгаас салсан хэнбугай ч\nТэнгэрбурханыг хүсэн тэмүүлнэ.",
  "page": 58,
  "source": "manual",
  "evidence_line_range": [1812, 1813]
}
```

Lock the header model change as follows:

- Extend `PsalterHeaderRich.kind` to include `uncited_caption`.
- Make `attribution` optional for `uncited_caption` entries only.
- Keep existing `patristic_preface` and `nt_typological` entries attribution-
  backed and behavior-compatible.
- In `src/components/psalm-block.tsx`, render `uncited_caption` in the existing
  post-title `headerRich` position, but do not emit attribution parentheses or an
  empty attribution span for that kind.

The existing renderer/resolver path already places `headerRich` after the title
and before stanza rendering; only the uncited no-attribution branch is new
(`docs/design/mental-models/goal130-psalm63-caption-reposition.md:101`,
`src/components/psalm-block.tsx:81`,
`src/components/psalm-block.tsx:96`,
`src/components/psalm-block.tsx:117`,
`src/lib/types.ts:811`).

### 3. Expected Data Delta

Committed data changes are surgical:

- `src/data/loth/psalter-texts.json`: for `Psalm 63:2-9`, remove only the two
  caption lines from `stanzas[0]`; the first stanza line becomes
  `Тэнгэрбурхан, Та миний Тэнгэрбурхан`.
- `src/data/loth/prayers/commons/psalter-texts.rich.json`: mirror the same
  removal from `Psalm 63:2-9.stanzasRich.blocks[0].lines`; rebuild/refresh rich
  text after the source stanza change.
- `src/data/loth/prayers/commons/psalter-headers.rich.json`: add only the Psalm
  63 uncited caption entry.
- `src/data/loth/psalter/week-1.json`: no diff; ref, title, and
  `default_antiphon` are already correct.
- `public/sw.js`: bump `CACHE_VERSION` only during Step 6 data-bundle
  integration, coordinated with #105 and any earlier cache-version claims.

The current contaminated Psalm 63 data begins with the two caption lines in both
plain and rich psalter data, and `week-1.json` already maps 2026-05-31 Sunday
Lauds first psalm to Psalm 63 with the correct title/antiphon
(`src/data/loth/psalter-texts.json:2`,
`src/data/loth/prayers/commons/psalter-texts.rich.json:2`,
`src/data/loth/psalter/week-1.json:8`).

### 4. Module Boundary

In scope for Step 6:

- `scripts/extract-psalm-texts.js`: `extractPsalmBody` signature/call sites and
  the Psalm-63 exact-text/ref-keyed skip.
- `src/lib/types.ts`: `PsalterHeaderRich` union/optional attribution shape.
- `src/components/psalm-block.tsx`: no-attribution render branch for
  `uncited_caption`.
- `src/data/loth/psalter-texts.json`,
  `src/data/loth/prayers/commons/psalter-texts.rich.json`, and
  `src/data/loth/prayers/commons/psalter-headers.rich.json`: surgical Psalm 63
  data updates.
- `public/sw.js`: cache bump at integration time only.

Out of scope:

- `extractPsalmPrayer` and #105 psalm-prayer continuation logic.
- `src/data/loth/psalter/week-1.json`.
- `/ordinarium` reference-page behavior.
- Any full psalter re-extraction/regeneration diff beyond the surgical Psalm 63
  stanza/header delta.

#105 touches the same extractor file but a different function
(`extractPsalmPrayer`, currently the page-boundary continuation area), and both
GOALs regenerate shared data/cache artifacts. Develop #130 on top of #105 after
#105 merges, or combine the two in one integration branch while preserving
separate expected deltas
(`docs/research/GOAL116-rootcause-fixplan.md:15`,
`docs/design/mental-models/goal130-psalm63-caption-reposition.md:135`,
`scripts/extract-psalm-texts.js:360`).

## Test Contract

Step 4 tests must cover these assertions:

- Positive data: `Psalm 63:2-9 stanzas[0][0] ===
  "Тэнгэрбурхан, Та миний Тэнгэрбурхан"`.
- Positive rich data: the first rendered rich stanza line for Psalm 63 is
  `Тэнгэрбурхан, Та миний Тэнгэрбурхан`.
- Positive header: `psalter-headers.rich.json` has a `Psalm 63:2-9`
  `uncited_caption` entry preserving the two caption lines exactly.
- Positive UI: `/pray/2026-05-31/lauds` renders the first psalm in order title
  -> caption/header -> body first line.
- Negative data: `Revelation 19:1-7 stanzas[0][0] === "Аллэлуяа!"`.
- Negative data: `Psalm 139:1-18 stanzas[0][0] === "I"`.
- Invariant: `src/data/loth/psalter/week-1.json` has no diff.
- Out-of-scope guard: `/ordinarium` has no Psalm 63 side effect.

Required commands after implementation:

```bash
node scripts/verify-psalter-stanzas.js
node scripts/verify-psalter-pages.js
node scripts/audit-psalter-ref-consistency.js
```

The ref-consistency suspect count must not increase. Playwright must assert the
visible screen order for `/pray/2026-05-31/lauds`. The #105 truncation sweep is
additional only when #130 is validated on a combined #105 integration branch; it
does not replace the Psalm 63 body/header assertions
(`docs/research/GOAL116-rootcause-fixplan.md:70`,
`docs/research/GOAL130-scenarios.md:47`).

## Operational Lock

- Use the source-corpus files if present; if an isolation worktree lacks
  `parsed_data/`, Step 6 must symlink/provide the source corpus before any
  extraction validation.
- Keep committed data diffs curated and surgical. A full psalter re-extraction
  is not an acceptable committed delta for this GOAL.
- Re-check `public/sw.js` `CACHE_VERSION` at Step 6. Current observed value in
  this worktree is `divine-office-v43`; whichever data-bundle GOAL lands first
  takes the next version, and the later integration must use the next value or a
  single combined bump
  (`docs/design/mental-models/goal130-psalm63-caption-reposition.md:144`,
  `public/sw.js:511`).
