# Mental Model - Solemnity First Vespers Laudate Correction (GOAL #115)

> Blueprint SSOT for `[#115-sub-1]` Step 1. Primary source handoff:
> `docs/handoff-2026-06-08-solemnity-firstvespers-laudate.md`. Related
> broader policy: `docs/design/mental-models/solemnity-psalmody-gilh.md`.
> This MM is written in English; source Mongolian text is cited only where the
> exact data string or rubric identifier matters.

## State Model

Solemnity psalmody is hour-specific. The resolver must not treat "Week 1
Sunday" as a general solemnity rule.

| State | Meaning | Runtime treatment |
|---|---|---|
| `solemnity.firstVespers.sourcedLaudate` | A solemnity First Vespers block has authoritative Mongolian Laudate psalms, antiphons, and page evidence. | Inline the sourced Laudate psalmody and proper elements. |
| `solemnity.firstVespers.unsourcedLaudate` | GILH requires Laudate psalmody, but the project lacks authoritative Mongolian antiphons for that solemnity. | Keep the running four-week psalter for that evening and prepend the existing current-week psalmody notice. |
| `solemnity.firstVespers.invalidWeek1Copy` | A First Vespers block copies Sunday Week 1 First Vespers psalms (`Psalm 141:1-9`, `Psalm 142:1-7`, `Philippians 2:6-11`) only because those antiphons were available. | Treat as a bug. Remove the inline psalm copy unless authoritative Laudate antiphons are sourced. |
| `solemnity.lauds.week1Sunday` | Solemnity Morning Prayer has the GILH section 227 source. | Use Week 1 Sunday Lauds psalmody when the solemnity data calls for it. |
| `solemnity.vespers2.properOrPolicy` | Second Vespers has its own GILH section 226 rule and existing route/test coverage. | Do not change as part of the First Vespers correction. |
| `ordinary.sundayFirstVespers` | Normal Sunday First Vespers from the four-week psalter. | Unchanged. This is not the target of the solemnity correction. |

The key invariant is source classification, not resolver cleverness: a
`firstVespers.psalms` array is valid only when it is sourced for the solemnity's
First Vespers. Availability of a nearby Sunday psalter antiphon is not a valid
source.

## Action Map

1. Classify the target hour before reading psalm data.
   - First Vespers of a solemnity follows GILH section 226: two Laudate psalms
     from `Psalm 113`, `Psalm 117`, `Psalm 135`, `Psalm 146`, `Psalm 147A`,
     `Psalm 147B`, plus the noted New Testament canticle.
   - Lauds follows GILH section 227: Week 1 Sunday psalmody.
   - Second Vespers follows its own GILH section 226 proper-psalm rule and is
     outside this correction.

2. Preserve sourced proper elements.
   - `gospelCanticleAntiphon`, `concludingPrayer`,
     `alternativeConcludingPrayer`, readings, responsories, intercessions, and
     page fields remain usable even when `psalms` are absent.
   - A partial proper block with no sourced Laudate psalms may still be valid.

3. Handle sourced Laudate psalmody strictly.
   - Only authoritative Mongolian sources may define the solemnity's Laudate
     psalm refs, antiphons, and pages.
   - English Universalis, inference from GILH alone, or machine translation may
     inform research but must not populate Mongolian antiphon data.

4. Handle unsourced Laudate psalmody visibly.
   - Do not fabricate missing antiphons.
   - Do not copy Sunday Week 1 First Vespers psalms as a stand-in.
   - Keep the running four-week psalter and prepend the existing current-week
     notice (`target.text`: `Дуулал ба магтаалыг явагдаж буй долоо хоногоос татаж авна.`).

5. Remove known invalid Week 1 copies.
   - Trinity First Vespers is the concrete bug shape: it had proper non-psalm
     elements, but its `psalms` were copied from Sunday Week 1 First Vespers.
   - The corrected shape is a proper non-psalm `firstVespers` block with no
     `psalms` array and a psalmody notice.

## Scenarios

### S1 - Trinity First Vespers, no sourced Laudate antiphons

When `/api/loth/2026-05-30/vespers` resolves to the eve of Trinity Sunday,
the proper Trinity Magnificat antiphon and concluding prayer surface, but the
psalmody does not use `Psalm 141:1-9`, `Psalm 142:1-7`, or `Philippians 2:6-11`
from Sunday Week 1 First Vespers. The page keeps running psalmody and shows the
current-week psalmody notice.

### S2 - Pentecost First Vespers, sourced proper psalmody exists

When `/api/loth/2026-05-23/vespers` resolves to Pentecost First Vespers, the
existing sourced psalm set remains authoritative: `Psalm 113:1-9`,
`Psalm 147:1-11`, and `Revelation 15:3-4`, with Pentecost proper elements.
The fallback notice must not displace sourced psalmody.

### S3 - Other movable solemnities with proper non-psalm elements only

Ascension, Corpus Christi, Sacred Heart, Christ the King, and comparable
movable solemnities may have proper Magnificat antiphons and prayers but no
sourced Laudate psalm antiphons. They stay in `unsourcedLaudate`: running
psalter plus notice, no invented psalms.

### S4 - Solemnity Lauds remains Week 1 Sunday

Morning Prayer is not corrected toward Laudate. If a solemnity Lauds rule uses
Week 1 Sunday psalmody, that is the GILH section 227 target and must not be
undone by this First Vespers work.

### S5 - Sunday First Vespers remains normal Sunday psalter data

Ordinary Sunday First Vespers is not a solemnity-data fallback. Its existing
psalter data remains valid for Sundays and for non-solemnity Saturday evenings.

### S6 - Second Vespers is isolated

The correction does not change movable `vespers2`, fixed solemnity Second
Vespers, or tests that assert Second Vespers routing.

## Visibility Boundary

User-visible:

- The psalmody section for the evening before a solemnity.
- The presence or absence of the current-week psalmody notice.
- Proper Magnificat antiphons, concluding prayers, readings, responsories, and
  intercessions that were already sourced.

Developer-visible:

- `firstVespers.psalms` presence or absence in `src/data/loth/propers/*.json`
  and `src/data/loth/sanctoral/*.json`.
- `conditionalRubrics[]` entries that prepend the current-week psalmody notice.
- Resolver lookup order in `src/lib/loth-service.ts` and
  `src/lib/propers-loader.ts`.
- Verifier results for first-vespers data and page/source coverage.

Out of scope:

- New Mongolian antiphon authoring without an authoritative source.
- Full re-extraction of psalter texts.
- Sunday First Vespers data.
- Lauds Week 1 Sunday substitution.
- Second Vespers routing or psalm source policy.
- Service-worker cache bumps for documentation-only work.

## Test Scenario Map

| ID | Covers | Command | Required assertion |
|---|---|---|---|
| T0 | MM document integrity for this Step 1 task | `test -f docs/design/mental-models/goal115-solemnity-firstvespers-laudate.md && rg -n '^## (State Model|Action Map|Scenarios|Visibility Boundary|Test Scenario Map|Sync Surface)' docs/design/mental-models/goal115-solemnity-firstvespers-laudate.md` | The file exists and all six required MM sections are present. |
| T1 | S1 invalid Week 1 copy removed | `npx vitest run src/lib/__tests__/first-vespers.test.ts` | Trinity First Vespers has proper non-psalm elements, has no `psalms` array, and carries the `ot-trinity-sun-firstvespers-weekday-psalmody-notice` prepend rubric. |
| T2 | S2 sourced Pentecost retained | `npx vitest run src/lib/__tests__/first-vespers.test.ts` | Pentecost First Vespers still returns `Psalm 113:1-9`, `Psalm 147:1-11`, and `Revelation 15:3-4`. |
| T3 | Movable solemnity user surface | `npx playwright test e2e/movable-first-vespers.spec.ts` | Ascension, Pentecost, Trinity, and Christ the King eve routes expose the expected proper elements; Pentecost exposes sourced psalmody. |
| T4 | Byte/source verifier coverage | `node scripts/verify-movable-first-vespers.js && node scripts/verify-solemnity-first-vespers.js` | Existing first-vespers byte/source verifiers report zero mismatches. |
| T5 | Ref coverage invariant | `npm run verify:first-vespers-ref` | First Vespers psalm refs that remain in data are versed-form and catalog-backed. |

## Sync Surface

- `docs/handoff-2026-06-08-solemnity-firstvespers-laudate.md` remains the
  detailed evidence handoff for GILH sections 225-229, local excerpt behavior,
  and the internal history of the invalid Week 1 copy.
- `docs/design/mental-models/solemnity-psalmody-gilh.md` is the broader
  GILH-policy note. This file is the narrower First Vespers Laudate blueprint
  and should be cited by later Step 2/3/implementation artifacts.
- `docs/PRD.md` FR-170 and `docs/traceability-matrix.md` should cite this MM
  when implementation or doc-sync work next touches the solemnity psalmody row.
- Data comments or `liturgicalBasis` strings that say "Mental Model policy"
  for First Vespers Laudate fallback should point to this file.
- If authoritative Mongolian Laudate antiphons are later obtained, update this
  MM first, then update data/tests. The update must identify the source,
  exact refs, antiphons, pages, and affected solemnities.

## Non-Goals And Guardrails

- No machine translation and no inferred Mongolian antiphons.
- No "temporary" Week 1 Sunday First Vespers copy for a solemnity.
- No resolver fallback that silently hides an unsourced Laudate gap.
- No changes to Pentecost sourced psalmody.
- No changes to Lauds Week 1 Sunday substitution.
- No changes to Second Vespers.
- No `extract-psalm-texts.js` full-overwrite workflow for this policy.

## Citation Index

- GILH/source handoff:
  `docs/handoff-2026-06-08-solemnity-firstvespers-laudate.md`.
- Broader GILH policy:
  `docs/design/mental-models/solemnity-psalmody-gilh.md`.
- Current Trinity policy-bearing data:
  `src/data/loth/propers/ordinary-time.json` special key
  `trinitySunday.SUN.firstVespers`.
- Current Pentecost sourced-data guard:
  `src/data/loth/propers/easter.json` special key
  `pentecost.SUN.firstVespers`.
- Resolver surface:
  `src/lib/loth-service.ts`, `src/lib/propers-loader.ts`.
- Regression tests:
  `src/lib/__tests__/first-vespers.test.ts`,
  `e2e/movable-first-vespers.spec.ts`,
  `scripts/verify-movable-first-vespers.js`,
  `scripts/verify-solemnity-first-vespers.js`,
  `scripts/verify-first-vespers-ref-coverage.js`.
