# GOAL #150 - Trinity Sunday First Vespers psalmody investigation

Task: WI-151, revised by WI-153 after WI-152 review feedback. Date under investigation: `2026-05-31`, Trinity Sunday / Solemnity, route `/api/loth/2026-05-31/firstVespers` and `/pray/2026-05-31/firstVespers`.

## Findings summary

[D1] Confirmed. Trinity Sunday `firstVespers` currently renders the same psalmody as Trinity Sunday Second Vespers / Week-1 Sunday regular Vespers:

```text
Psalm 110:1-5, 7 @ p.68
Psalm 114:1-8 @ p.70
Revelation 19:1-7 @ p.71
```

`/api/loth/2026-05-31/vespers` returns the same three refs/pages, with the Trinity `vespers2` Magnificat antiphon and the `ot-trinity-sun-vespers2-psalmody-substitute` directive. Therefore the First Vespers route is using Sunday Second Vespers psalms.

[D1] Rendered-page check agrees with the API. `/pray/2026-05-31/firstVespers` displays the Trinity First Vespers title and Trinity First Vespers Magnificat antiphon, but its psalmody text contains the Week-1 Sunday Vespers titles `Аврагч бол хаан ба тахилч юм`, `Израильчууд Египетийн боолчлолоос чөлөөлөгдсөн байна`, and `Хурганы хурим`.

[D1] Root cause: `trinitySunday.SUN.firstVespers` is partial. It carries only `gospelCanticleAntiphon`, concluding prayers, and pages; it has no `psalms` array. The explicit firstVespers assembler starts with base psalmody from `getPsalterPsalmody(day.psalterWeek, 'SUN', 'vespers')`, then only replaces it if `firstVespersData.psalms` exists. Since the Trinity special-key firstVespers block has no psalms, the regular Sunday Vespers base remains.

[D2] Corrected after WI-152 review: the target is not Week-1 Sunday First Vespers (`Psalm 141`, `Psalm 142`, `Philippians 2`). GILH no. 134 says solemnity Evening Prayer I uses the Laudate psalms; GILH no. 226 gives the solemnity arrangement as Laudate psalms plus the noted New Testament canticle. Universalis for Trinity Sunday First Vespers gives this concrete target:

```text
Psalm 113:1-9        (Universalis Psalm 112/113)
Psalm 147:12-20      (Universalis Psalm 147B)
Ephesians 1:3-10
```

The psalm/canticle body text already exists locally, so the data fix does not require Mongolian machine translation for the bodies. The unresolved source gap is the Trinity-specific Mongolian antiphons for those three entries; they were not found in the current local Trinity block or by repo/PDF text search. Those antiphons must be confirmed from the official Mongolian Ordo/PDF/proper/common source before implementation; do not infer them from English Universalis and do not reuse unrelated weekly antiphons unless an authoritative source matches.

## Evidence

Current API comparison:

- `/api/loth/2026-05-31/firstVespers` returns psalm refs `Psalm 110:1-5, 7`, `Psalm 114:1-8`, `Revelation 19:1-7`, pages `68`, `70`, `71`, and the Trinity First Vespers Magnificat antiphon page `745`.
- `/api/loth/2026-05-31/vespers` returns the same psalm refs/pages, with Trinity Second Vespers Magnificat page `748` and the `ot-trinity-sun-vespers2-psalmody-substitute` directive.
- The current three refs/pages exactly match `src/data/loth/psalter/week-1.json:94` to `src/data/loth/psalter/week-1.json:153`.

Liturgical/source target:

- GILH no. 134 distinguishes solemnity Morning Prayer, Evening Prayer I, and Evening Prayer II psalmody. It says Evening Prayer I on solemnities uses the Laudate psalms, while Evening Prayer II uses proper psalms/canticles.
- GILH no. 225 states solemnities have Evening Prayer I on the preceding day.
- GILH no. 226 says Evening Prayer I and II use proper elements, missing parts come from the common, and Evening Prayer I ordinarily takes both psalms from the Laudate set: Ps 113, 117, 135, 146, 147A, 147B. Source consulted: https://www.ewtn.com/catholicism/library/general-instruction-on-the-liturgy-of-the-hours-2175
- Universalis Trinity Sunday First Vespers source for the US calendar on the preceding evening (`https://universalis.com/usa/20260530/vespers.htm`) lists `Psalm 112 (113)`, `Psalm 147 (147B)`, and `Canticle | Ephesians 1`. In this repo's local references that maps to `Psalm 113:1-9`, `Psalm 147:12-20`, and `Ephesians 1:3-10`.

Local body-text availability for the corrected target:

- `src/data/loth/psalter-texts.json:1667` contains `Psalm 113:1-9`.
- `src/data/loth/psalter-texts.json:4520` contains `Psalm 147:12-20`.
- `src/data/loth/psalter-texts.json:424` contains `Ephesians 1:3-10`.
- `src/data/loth/prayers/commons/psalter-texts.rich.json:22244` contains rich text for `Psalm 113:1-9`.
- `src/data/loth/prayers/commons/psalter-texts.rich.json:59051` contains rich text for `Psalm 147:12-20`.
- `src/data/loth/prayers/commons/psalter-texts.rich.json:5828` contains rich text for `Ephesians 1:3-10`.

Local implementation/root-cause evidence:

- `src/data/loth/propers/ordinary-time.json:3468` starts the `trinitySunday` special key.
- `src/data/loth/propers/ordinary-time.json:3470` to `src/data/loth/propers/ordinary-time.json:3476` defines Trinity `firstVespers`, but it contains no `psalms` field.
- `src/data/loth/propers/ordinary-time.json:3500` to `src/data/loth/propers/ordinary-time.json:3521` defines Trinity `vespers2`, also without explicit psalms; its psalmody is intentionally borrowed via the vespers2 substitute directive.
- The PDF Trinity section starts at `parsed_data/full_pdf.txt:25872` to `parsed_data/full_pdf.txt:25879`.
- Trinity First Vespers prints only the Magnificat antiphon at `parsed_data/full_pdf.txt:25879` to `parsed_data/full_pdf.txt:25885`, then immediately moves to Lauds at `parsed_data/full_pdf.txt:25886`.
- Trinity Second Vespers starts at `parsed_data/full_pdf.txt:25924` and prints its Magnificat antiphon at `parsed_data/full_pdf.txt:25926` to `parsed_data/full_pdf.txt:25932`.

Resolver path:

- `firstVespers` is structurally mapped to `dataLookupHour = 'vespers'` in `src/lib/loth-service.ts:121` to `src/lib/loth-service.ts:128`.
- Base psalmody for firstVespers is loaded as Sunday `vespers` in `src/lib/loth-service.ts:130` to `src/lib/loth-service.ts:147`.
- The explicit firstVespers route then tries sanctoral, movable special-key, and plain-Sunday firstVespers lookups in `src/lib/loth-service.ts:317` to `src/lib/loth-service.ts:380`.
- It replaces `psalmEntries` only when `firstVespersData.psalms` exists (`src/lib/loth-service.ts:382` to `src/lib/loth-service.ts:388`).
- `getSeasonFirstVespers` returns a movable special-key firstVespers block before falling back to the numeric week (`src/lib/propers-loader.ts:262` to `src/lib/propers-loader.ts:276`), so Trinity receives the partial `trinitySunday.SUN.firstVespers` block and never reaches any numeric-week firstVespers fallback.
- Existing tests assert the Trinity special-key firstVespers antiphon/prayer path but do not assert psalms (`src/lib/__tests__/first-vespers.test.ts:821` to `src/lib/__tests__/first-vespers.test.ts:835`). Existing vespers2 tests assert Week-1 Sunday Vespers psalms for Second Vespers (`src/lib/__tests__/movable-solemnity-vespers2.test.ts:110` to `src/lib/__tests__/movable-solemnity-vespers2.test.ts:120`).

Rejected earlier conclusion:

- `src/data/loth/propers/ordinary-time.json:14` to `src/data/loth/propers/ordinary-time.json:69` defines Week-1 Sunday `firstVespers.psalms`: `Psalm 141:1-9`, `Psalm 142:1-7`, and `Philippians 2:6-11`, with pages `49`, `51`, and `53`.
- That data is normal Sunday First Vespers psalter data. It is not the correct target for Trinity Sunday First Vespers because GILH and the concrete Trinity source point to Laudate-series psalms plus `Ephesians 1`.

## Proposed fix scope

Data-first, no Mongolian machine translation:

1. Add a `psalms` array to `src/data/loth/propers/ordinary-time.json` at `trinitySunday.SUN.firstVespers`.
2. Use refs `Psalm 113:1-9`, `Psalm 147:12-20`, and `Ephesians 1:3-10`.
3. Preserve `gloria_patri: true` behavior for the psalms/canticle, consistent with existing psalmody entries.
4. Add Trinity-specific antiphon keys under the movable/proper namespace, for example `movable-trinity-fv-ps1`, `movable-trinity-fv-ps2`, and `movable-trinity-fv-canticle`.
5. Fill those antiphon values and page numbers only from an authoritative Mongolian Ordo/PDF/proper/common source. Current evidence confirms the target refs, but the exact Mongolian antiphons/pages still need source confirmation.
6. Do not change `trinitySunday.SUN.vespers2`; its Week-1 Sunday Vespers substitute remains correct for Second Vespers and already has test coverage.

Regression expectations:

1. `/api/loth/2026-05-31/firstVespers` should return psalm refs `Psalm 113:1-9`, `Psalm 147:12-20`, and `Ephesians 1:3-10`.
2. `/api/loth/2026-05-31/firstVespers` should no longer return `Psalm 110:1-5, 7`, `Psalm 114:1-8`, or `Revelation 19:1-7`.
3. `/api/loth/2026-05-31/vespers` should continue to return `Psalm 110:1-5, 7`, `Psalm 114:1-8`, and `Revelation 19:1-7`.
4. Rendered `/pray/2026-05-31/firstVespers` should show the Trinity First Vespers proper material plus body markers for Psalm 113, Psalm 147B, and Ephesians 1, and should not show the Psalm 114 body/title.
5. GOAL #105 impact: removing `Psalm 114:1-8` from First Vespers is the expected fix, not a regression. Any Psalm 114 psalm-prayer or toggle checks for Trinity should target Second Vespers (`/vespers`), where Psalm 114 remains valid.

This revision keeps the original symptom/root-cause finding from WI-151, corrects the target psalmody after WI-152, and explicitly blocks fabricated Mongolian antiphons.
