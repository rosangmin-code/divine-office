# GOAL #115 - Solemnity First Vespers Laudate Audit Sweep

Task: `[#115-sub-2]` / `wi-116-002`. Scope: RED/audit only; no data fixes.

Source model: `docs/design/mental-models/goal115-solemnity-firstvespers-laudate.md`.
The audit applies the MM `State Model` and `Action Map` to the 13 solemnities
named by the dispatch: seven fixed solemnities and six movable solemnities.

## Result

No target solemnity currently has `solemnity.firstVespers.invalidWeek1Copy`.
No RED test was added for a found violation because there is no remaining
target violation to pin. The audit outcome is the zero-violation branch
required by the work item: document the full sweep and add GREEN verifier
coverage for the zero-copy invariant.

State summary:

| State | Count | Members |
|---|---:|---|
| `solemnity.firstVespers.unsourcedLaudate` | 12 | 03-19, 03-25, 06-24, 06-29, 08-15, 11-01, 12-08, Ascension, Trinity Sunday, Corpus Christi, Sacred Heart, Christ the King |
| `solemnity.firstVespers.sourcedLaudate` | 1 | Pentecost |
| `solemnity.firstVespers.invalidWeek1Copy` | 0 | none |

Audit discriminator:

- Invalid Week 1 copy means a target solemnity `firstVespers.psalms` array
  exactly carries `Psalm 141:1-9`, `Psalm 142:1-7`, `Philippians 2:6-11`
  as a stand-in for missing solemnity Laudate antiphons.
- Ordinary Sunday First Vespers entries are excluded by MM `Scenarios` S5.
  They may legitimately use the same psalter cycle material because they are
  not solemnity fallback data.

## Audit Table

| # | Solemnity | Data location | Psalm refs in target `firstVespers` | Notice evidence | Classification | Violation |
|---:|---|---|---|---|---|---|
| 1 | St Joseph (03-19) | `src/data/loth/sanctoral/solemnities.json:93` | none | `sanctoral-solemnity-03-19-st-joseph-firstvespers-weekday-psalmody-notice` at `src/data/loth/sanctoral/solemnities.json:100` | `solemnity.firstVespers.unsourcedLaudate` | no |
| 2 | Annunciation (03-25) | `src/data/loth/sanctoral/solemnities.json:216` | none | `sanctoral-solemnity-03-25-annunciation-firstvespers-weekday-psalmody-notice` at `src/data/loth/sanctoral/solemnities.json:223` | `solemnity.firstVespers.unsourcedLaudate` | no |
| 3 | Nativity of John the Baptist (06-24) | `src/data/loth/sanctoral/solemnities.json:336` | none | `sanctoral-solemnity-06-24-baptist-firstvespers-weekday-psalmody-notice` at `src/data/loth/sanctoral/solemnities.json:343` | `solemnity.firstVespers.unsourcedLaudate` | no |
| 4 | Peter and Paul (06-29) | `src/data/loth/sanctoral/solemnities.json:456` | none | `sanctoral-solemnity-06-29-peter-paul-firstvespers-weekday-psalmody-notice` at `src/data/loth/sanctoral/solemnities.json:463` | `solemnity.firstVespers.unsourcedLaudate` | no |
| 5 | Assumption (08-15) | `src/data/loth/sanctoral/solemnities.json:575` | none | `sanctoral-solemnity-08-15-assumption-firstvespers-weekday-psalmody-notice` at `src/data/loth/sanctoral/solemnities.json:582` | `solemnity.firstVespers.unsourcedLaudate` | no |
| 6 | All Saints (11-01) | `src/data/loth/sanctoral/solemnities.json:695` | none | `sanctoral-solemnity-11-01-all-saints-firstvespers-weekday-psalmody-notice` at `src/data/loth/sanctoral/solemnities.json:702` | `solemnity.firstVespers.unsourcedLaudate` | no |
| 7 | Immaculate Conception (12-08) | `src/data/loth/sanctoral/solemnities.json:800` | none | `sanctoral-solemnity-12-08-immaculate-conception-firstvespers-weekday-psalmody-notice` at `src/data/loth/sanctoral/solemnities.json:807` | `solemnity.firstVespers.unsourcedLaudate` | no |
| 8 | Ascension | `src/data/loth/propers/easter.json:1063` | none | `easter-ascension-sun-firstvespers-weekday-psalmody-notice` at `src/data/loth/propers/easter.json:1072` | `solemnity.firstVespers.unsourcedLaudate` | no |
| 9 | Pentecost | `src/data/loth/propers/easter.json:1276` | `Psalm 113:1-9`; `Psalm 147:1-11`; `Revelation 15:3-4` at `src/data/loth/propers/easter.json:1280`, `:1288`, `:1296` | none | `solemnity.firstVespers.sourcedLaudate` | no |
| 10 | Trinity Sunday | `src/data/loth/propers/ordinary-time.json:3470` | none | `ot-trinity-sun-firstvespers-weekday-psalmody-notice` at `src/data/loth/propers/ordinary-time.json:3479` | `solemnity.firstVespers.unsourcedLaudate` | no |
| 11 | Corpus Christi | `src/data/loth/propers/ordinary-time.json:3549` | none | `ot-corpus-sun-firstvespers-weekday-psalmody-notice` at `src/data/loth/propers/ordinary-time.json:3558` | `solemnity.firstVespers.unsourcedLaudate` | no |
| 12 | Sacred Heart | `src/data/loth/propers/ordinary-time.json:3620` | none | `ot-sacredheart-sun-firstvespers-weekday-psalmody-notice` at `src/data/loth/propers/ordinary-time.json:3629` | `solemnity.firstVespers.unsourcedLaudate` | no |
| 13 | Christ the King | `src/data/loth/propers/ordinary-time.json:3691` | none | `ot-christtheking-sun-firstvespers-weekday-psalmody-notice` at `src/data/loth/propers/ordinary-time.json:3698` | `solemnity.firstVespers.unsourcedLaudate` | no |

## RED-Test Decision

No new RED test for a found invalid copy is appropriate in this step.

Reasoning:

- AC says to write RED tests for every `invalidWeek1Copy` instance found, or
  provide an explicit zero-violation report with GREEN verifier output.
- The target sweep found zero `invalidWeek1Copy` instances.
- Existing coverage already included the critical former bug shape:
  `src/lib/__tests__/first-vespers.test.ts` asserts Trinity Sunday
  `getSeasonFirstVespers(...)` returns a proper block with `psalms` undefined
  and the `ot-trinity-sun-firstvespers-weekday-psalmody-notice` prepend rubric.
- This step adds a narrow GREEN invariant in
  `src/lib/__tests__/first-vespers.test.ts`: all 13 GOAL #115 targets are
  present, the 12 unsourced Laudate targets have no local `psalms` array,
  Pentecost keeps its sourced Laudate refs, and no target carries the exact
  invalid Week 1 trio.

## Verification Results

Commands required by the dispatch and MM `Test Scenario Map`:

```bash
npx vitest run src/lib/__tests__/first-vespers.test.ts
node scripts/verify-solemnity-first-vespers.js
node scripts/verify-movable-first-vespers.js
node scripts/verify-first-vespers-ref-coverage.js
```

Observed result in the isolated `wi-116-002-dvo-dev-co` worktree:

| Command | Result | Notes |
|---|---|---|
| `npx vitest run src/lib/__tests__/first-vespers.test.ts` | PASS | GREEN zero-copy invariant for all 13 GOAL #115 targets, plus existing First Vespers routing coverage. |
| `node scripts/verify-first-vespers-ref-coverage.js` | PASS | Scanned 162 cells; bare-ref, catalog-miss, and antiphon-slot drift violations were all 0. |
| `node scripts/verify-solemnity-first-vespers.js` | FAIL | Existing broader byte-equal verifier drift: mismatch 17, missing 0, unexpected 10. Visible failures are prayer/page extraction drift and `conditionalRubrics` unexpected by the fixture, not target `firstVespers.psalms` Week 1 copies. |
| `node scripts/verify-movable-first-vespers.js` | FAIL | Existing broader byte-equal verifier drift: mismatch 15, missing 0, unexpected 5. Visible failures are prayer/page extraction drift and `conditionalRubrics` unexpected by the fixture, not target `firstVespers.psalms` Week 1 copies. |

The two byte-equal verifier failures are outside this RED/audit-only data-fix
boundary. They compare whole firstVespers payloads and currently fail on
non-psalmody drift in this checkout; no data fix is included here.

## AC to MM Mapping

| Work-item AC | MM section | Audit evidence |
|---|---|---|
| Audit table covers all 13 solemnities with per-solemnity classification and file:path evidence | `State Model`, `Action Map`, `Visibility Boundary` | The table above covers all 7 fixed + 6 movable dispatch targets with line-level data evidence. |
| RED tests exist for every invalidWeek1Copy instance found, or explicit zero-violation report with GREEN verifier output | `State Model`, `Scenarios` S1/S2/S3, `Test Scenario Map` T1/T2/T4/T5 | Zero target `invalidWeek1Copy` instances found; no RED tests for found violations added; `first-vespers.test.ts` now includes a GREEN invariant for all 13 targets and `verify-first-vespers-ref-coverage.js` is GREEN. Broader byte-equal verifier drift is documented above. |
| No data fixes included in this step | `Visibility Boundary`, `Non-Goals And Guardrails` | This step adds the audit report and a test guard only; source data files are unchanged. |
