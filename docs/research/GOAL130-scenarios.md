# GOAL #130 - Psalm 63 Caption Reposition Scenarios

작성: dvo-res, task #132. 범위: scenario elaboration only. Locked design inputs are
`docs/research/GOAL116-rootcause-fixplan.md` and
`docs/design/mental-models/goal130-psalm63-caption-reposition.md`; this document does
not re-investigate root cause or choose a new implementation path.

## Source Baseline

- Psalm 63 source order is ref -> title -> two-line caption -> body, and the current
  extractor misclassifies the caption as body because it only skips post-title
  epigraphs with parenthetical citation
  (`docs/research/GOAL116-rootcause-fixplan.md:7`,
  `docs/research/GOAL116-rootcause-fixplan.md:9`).
- The locked design requires a Psalm-63 exact-text/ref-keyed skip rule and mandatory
  caption preservation in the post-title header/caption slot
  (`docs/design/mental-models/goal130-psalm63-caption-reposition.md:28`,
  `docs/design/mental-models/goal130-psalm63-caption-reposition.md:32`,
  `docs/design/mental-models/goal130-psalm63-caption-reposition.md:101`).
- Expected visible order is title -> caption -> body first line, and the data
  assertion is `Psalm 63:2-9 stanzas[0][0] === "Тэнгэрбурхан, Та миний Тэнгэрбурхан"`
  (`docs/design/mental-models/goal130-psalm63-caption-reposition.md:39`,
  `docs/design/mental-models/goal130-psalm63-caption-reposition.md:49`).
- Regression scope is ref-scoped: `week-1.json` remains invariant, `/ordinarium` is
  unrelated, and shape-only heuristics are forbidden because they would damage real
  body starts for `Revelation 19:1-7` and `Psalm 139:1-18`
  (`docs/design/mental-models/goal130-psalm63-caption-reposition.md:57`,
  `docs/design/mental-models/goal130-psalm63-caption-reposition.md:63`,
  `docs/design/mental-models/goal130-psalm63-caption-reposition.md:65`,
  `docs/design/mental-models/goal130-psalm63-caption-reposition.md:90`).

## Scenario Matrix

| ID | AC | Type | Scenario | Expected outcome | Verification method |
| --- | --- | --- | --- | --- | --- |
| D1-HAPPY-SCREEN-ORDER | D1 | Happy path / user-facing | Open 2026-05-31 Lauds and inspect the first psalm block for `Psalm 63:2-9`. | The rendered order is title `Тэнгэрбурханаар цангаж буй сэтгэл`, then caption `Гэм нүглийн харанхуйгаас салсан хэнбугай ч` / `Тэнгэрбурханыг хүсэн тэмүүлнэ.`, then body first line `Тэнгэрбурхан, Та миний Тэнгэрбурхан`; the caption is not rendered as the first body line. | Playwright screen-order assertion on `/pray/2026-05-31/lauds`: locate the first psalm block and assert title index < caption index < body-first-line index. |
| D1-HAPPY-STANZA-DATA | D1 | Happy path / executable | Read regenerated `src/data/loth/psalter-texts.json` for `Psalm 63:2-9`. | `stanzas[0][0] === "Тэнгэрбурхан, Та миний Тэнгэрбурхан"` and neither caption line appears before that body line in `stanzas[0]`. | Data assertion plus `node scripts/verify-psalter-stanzas.js`. |
| D1-RICH-DATA | D1 | Happy path / executable | Read regenerated `src/data/loth/prayers/commons/psalter-texts.rich.json` for `Psalm 63:2-9`. | The first rich stanza rendered line is `Тэнгэрбурхан, Та миний Тэнгэрбурхан`; the two caption lines are absent from `stanzasRich.blocks[0].lines`. | JSON data assertion against `stanzasRich`, followed by `node scripts/verify-psalter-stanzas.js`. |
| D2-HAPPY-CAPTION-PRESERVED | D2 | Happy path / structural | Read regenerated `src/data/loth/prayers/commons/psalter-headers.rich.json` for a `Psalm 63:2-9` header/caption entry. | The caption is preserved in the Psalm 63 header catalog entry exactly as `Гэм нүглийн харанхуйгаас салсан хэнбугай ч` / `Тэнгэрбурханыг хүсэн тэмүүлнэ.` and is not deleted from the data bundle. | Data assertion on `psalter-headers.rich.json`, then Playwright confirms it renders after the title and before the first stanza. |
| D2-HAPPY-NO-TRANSLATION | D2 | Happy path / source fidelity | Compare the preserved header text with the locked source spelling. | The second caption line uses data/PDF spelling `Тэнгэрбурханыг хүсэн тэмүүлнэ.`; no generated correction such as `тэмүүлэнэ` is introduced. | Exact-string data assertion against `psalter-headers.rich.json`. |
| D3-NEG-REV19 | D3 | Failure/regression guard | Re-run extraction and inspect `Revelation 19:1-7`. | `stanzas[0][0] === "Аллэлуяа!"`; a broad two-unindented-line heuristic did not remove a legitimate body start. | Data assertion plus `node scripts/verify-psalter-stanzas.js`. |
| D3-NEG-PS139 | D3 | Failure/regression guard | Re-run extraction and inspect `Psalm 139:1-18`. | `stanzas[0][0] === "I"`; the Roman-numeral part marker remains a body start. | Data assertion plus `node scripts/verify-psalter-stanzas.js`. |
| D3-WEEK1-INVARIANT | D3 | Failure/regression guard | Inspect `src/data/loth/psalter/week-1.json` after the regeneration. | The `Psalm 63:2-9` ref/title/default-antiphon mapping is unchanged; this GOAL does not rewrite antiphon routing. | Git diff/data assertion on `src/data/loth/psalter/week-1.json`, plus Playwright confirms the first-psalm antiphon source remains unchanged. |
| D3-ORDINARIUM-OUT-OF-SCOPE | D3 | Failure/regression guard | Navigate or test `/ordinarium` after the Psalm 63 fix. | `/ordinarium` behavior and reference-page content are unchanged; the caption reposition only affects psalter extraction/render data for Psalm 63. | Playwright smoke assertion for `/ordinarium` unchanged/no Psalm 63 caption side effect. |
| EDGE-EXACT-REF-KEYED | D3 | Edge guard / executable | Run extraction with the locked discriminator: `ref === "Psalm 63:2-9"` and exact two caption lines only. | The skip applies only to Psalm 63. Other psalms or canticles with similar indentation/case shape retain their existing first body lines. | Unit/data assertion around the skip helper or extractor output, plus `node scripts/audit-psalter-ref-consistency.js` to ensure suspect count does not increase. |

## Verification Plan

- Data assertion: after regeneration, assert `Psalm 63:2-9 stanzas[0][0] ===
  "Тэнгэрбурхан, Та миний Тэнгэрбурхан"` and assert the two caption lines are present
  in `psalter-headers.rich.json`, not in Psalm 63 stanza body.
- Rich-data assertion: assert `psalter-texts.rich.json` first Psalm 63 rendered stanza
  line is `Тэнгэрбурхан, Та миний Тэнгэрбурхан`.
- Negative guards: assert `Revelation 19:1-7 stanzas[0][0] === "Аллэлуяа!"` and
  `Psalm 139:1-18 stanzas[0][0] === "I"`.
- Standard psalter checks: run `node scripts/verify-psalter-stanzas.js`,
  `node scripts/verify-psalter-pages.js`, and
  `node scripts/audit-psalter-ref-consistency.js`; the ref-consistency suspect count
  must not increase
  (`docs/design/mental-models/goal130-psalm63-caption-reposition.md:124`).
- UI order check: use Playwright on `/pray/2026-05-31/lauds` to assert first psalm
  screen order title -> caption -> body first line
  (`docs/design/mental-models/goal130-psalm63-caption-reposition.md:39`).
- Out-of-scope guard: run a `/ordinarium` smoke check only to confirm no unrelated
  page behavior changed.

## #105 Coordination

GOAL #130 must develop on top of #105 after #105 merges because both touch
`scripts/extract-psalm-texts.js`, regenerate shared `psalter-texts.json` /
`psalter-texts.rich.json`, and require a shared `public/sw.js` `CACHE_VERSION` bump;
whichever GOAL lands first takes the next cache version and the later integration must
preserve both GOALs' data deltas
(`docs/design/mental-models/goal130-psalm63-caption-reposition.md:135`,
`docs/research/GOAL116-rootcause-fixplan.md:17`).
