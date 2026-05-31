# GOAL #150 — Trinity Sunday First Vespers psalmody investigation

Task: WI-151, read-only research. Date under investigation: `2026-05-31`, Trinity Sunday / Solemnity, route `/api/loth/2026-05-31/firstVespers` and `/pray/2026-05-31/firstVespers`.

## Findings summary

[D1] Confirmed. Trinity Sunday `firstVespers` currently renders the same psalmody as Trinity Sunday Second Vespers / Week-1 Sunday regular Vespers:

```text
Psalm 110:1-5, 7 @ p.68
Psalm 114:1-8 @ p.70
Revelation 19:1-7 @ p.71
```

`/api/loth/2026-05-31/vespers` returns the same three refs/pages, with the Trinity `vespers2` Magnificat antiphon and the `ot-trinity-sun-vespers2-psalmody-substitute` directive. Therefore the First Vespers route is using Sunday Second Vespers psalms.

[D1] Rendered-page check agrees with the API. `/pray/2026-05-31/firstVespers` displays the Trinity First Vespers title and Trinity First Vespers Magnificat antiphon, but its psalmody text contains the Week-1 Sunday Vespers titles `Аврагч бол хаан ба тахилч юм`, `Израильчууд Египетийн боолчлолоос чөлөөлөгдсөн байна`, and `Хурганы хурим`; it does not contain the expected First Vespers markers `Аюулын үед унших`, `Эзэн, Та бол миний хоргодох`, or `Филиппой`.

[D1] Root cause: `trinitySunday.SUN.firstVespers` is partial. It carries only `gospelCanticleAntiphon`, concluding prayers, and pages; it has no `psalms` array. The explicit firstVespers assembler starts with base psalmody from `getPsalterPsalmody(day.psalterWeek, 'SUN', 'vespers')`, then only replaces it if `firstVespersData.psalms` exists. Since the Trinity special-key firstVespers block has no psalms, the regular Sunday Vespers base remains.

[D2] Correct source in this project is the existing Week-1 Sunday First Vespers psalmody, not Second Vespers. The relevant existing data is:

```text
Psalm 141:1-9 @ p.49
Psalm 142:1-7 @ p.51
Philippians 2:6-11 @ p.53
```

The local PDF Trinity section prints only proper antiphons/prayers for Trinity: First Vespers has a proper Magnificat antiphon at p.747, Lauds has a proper Benedictus antiphon, and Second Vespers has a proper Magnificat antiphon. It does not print a special Trinity First Vespers psalmody block. Therefore the missing proper material should be supplied from the already-authored First Vespers psalter data, without translating new text.

## Evidence

Current API comparison:

- `/api/loth/2026-05-31/firstVespers` returns psalm refs `Psalm 110:1-5, 7`, `Psalm 114:1-8`, `Revelation 19:1-7`, pages `68`, `70`, `71`, and the Trinity First Vespers Magnificat antiphon page `745`.
- `/api/loth/2026-05-31/vespers` returns the same psalm refs/pages, with Trinity Second Vespers Magnificat page `748` and the `ot-trinity-sun-vespers2-psalmody-substitute` directive.
- The current three refs/pages exactly match `src/data/loth/psalter/week-1.json:94` to `src/data/loth/psalter/week-1.json:153`.

Expected existing First Vespers psalter source:

- `src/data/loth/propers/ordinary-time.json:14` to `src/data/loth/propers/ordinary-time.json:69` defines Week-1 Sunday `firstVespers.psalms`: `Psalm 141:1-9`, `Psalm 142:1-7`, and `Philippians 2:6-11`, with pages `49`, `51`, and `53`.
- PDF page 49 starts Week-1 Sunday First Vespers and its first psalm antiphon at `parsed_data/full_pdf.txt:1471` to `parsed_data/full_pdf.txt:1486`; Psalm 141 body begins at `parsed_data/full_pdf.txt:1505`.
- The second First Vespers psalm antiphon begins at `parsed_data/full_pdf.txt:1565`; Psalm 142 body begins at `parsed_data/full_pdf.txt:1597`.
- The First Vespers New Testament canticle antiphon is at `parsed_data/full_pdf.txt:1640` to `parsed_data/full_pdf.txt:1641`; Philippians 2:6-11 begins at `parsed_data/full_pdf.txt:1666` to `parsed_data/full_pdf.txt:1668`.

Trinity proper source:

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
- `getSeasonFirstVespers` returns a movable special-key firstVespers block before falling back to the numeric week (`src/lib/propers-loader.ts:262` to `src/lib/propers-loader.ts:276`), so Trinity receives the partial `trinitySunday.SUN.firstVespers` block and never reaches `weeks['1'].SUN.firstVespers`.
- Existing tests assert the Trinity special-key firstVespers antiphon/prayer path but do not assert psalms (`src/lib/__tests__/first-vespers.test.ts:821` to `src/lib/__tests__/first-vespers.test.ts:835`). Existing vespers2 tests assert Week-1 Sunday Vespers psalms for Second Vespers (`src/lib/__tests__/movable-solemnity-vespers2.test.ts:110` to `src/lib/__tests__/movable-solemnity-vespers2.test.ts:120`).

Liturgical norm:

- GILH no. 225 states solemnities have Evening Prayer I on the preceding day.
- GILH no. 226 treats Evening Prayer I and II as distinct solemnity offices and says proper elements are used, with missing material supplied from the common.
- GILH no. 134 also distinguishes Morning Prayer, Evening Prayer I, and Evening Prayer II psalmody on solemnities. This does not support using the Second Vespers psalm set as a fallback for First Vespers simply because both are `vespers` in the route/assembler.
- Source consulted: EWTN mirror of the General Instruction, around nos. 134 and 225-226: https://www.ewtn.com/catholicism/library/general-instruction-on-the-liturgy-of-the-hours-2175

## Proposed fix scope

Data-only, no translation:

1. Add a `psalms` array to `src/data/loth/propers/ordinary-time.json` at `trinitySunday.SUN.firstVespers`.
2. Copy the existing objects from `weeks['1'].SUN.firstVespers.psalms` (`Psalm 141:1-9`, `Psalm 142:1-7`, `Philippians 2:6-11`) into that array, preserving refs, antiphon keys, antiphons, `gloria_patri`, seasonal variants, and page fields.
3. Do not change `trinitySunday.SUN.vespers2`; its Week-1 Sunday Vespers substitute is correct for Second Vespers and already covered by `src/lib/__tests__/movable-solemnity-vespers2.test.ts`.
4. Add regression coverage that `/api/loth/2026-05-31/firstVespers` returns `Psalm 141:1-9`, `Psalm 142:1-7`, and `Philippians 2:6-11`, while `/api/loth/2026-05-31/vespers` continues to return `Psalm 110:1-5, 7`, `Psalm 114:1-8`, and `Revelation 19:1-7`.

This keeps all psalm text and antiphons sourced from existing psalter/proper data and avoids Mongolian machine translation.
