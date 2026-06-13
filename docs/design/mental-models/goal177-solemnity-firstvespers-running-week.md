# Mental Model - Solemnity First Vespers Running Sunday First-Vespers Psalmody (GOAL #177)

> Blueprint SSOT for GOAL #177 / `[#177-sub-1]`.
> Related background:
> `docs/design/mental-models/goal115-solemnity-firstvespers-laudate.md` and
> `docs/design/mental-models/solemnity-psalmody-gilh.md`.

## Intended Behavior

For in-scope movable solemnities in Ordinary Time, First Vespers psalmody must
come from the date's running four-week psalter cycle, but specifically from that
week's Sunday **First Vespers** set.

In-scope movable solemnities:

- Trinity Sunday: `trinitySunday`
- Corpus Christi / Body and Blood: `corpusChristi`
- Sacred Heart: `sacredHeart`
- Christ the King: `christTheKing`

Target rule:

```text
movable solemnity firstVespers psalmody
= weeks[day.psalterWeek].SUN.firstVespers.psalms
= fv-wN-sun-* Sunday First Vespers psalms and paired antiphons
```

This is the user-selected fallback while local Mongolian Laudate antiphons are
unavailable. GILH/Laudate remains the full-source target for future enrichment,
but this GOAL must not fabricate Laudate antiphons and must not hardcode one
fixed week for every year.

## Observable Outcome

If an in-scope movable solemnity has `day.psalterWeek = N`, its First Vespers
psalmody renders the Sunday First Vespers `fv-wN-sun-*` set:

| `day.psalterWeek` | Sunday First Vespers fallback |
|---|---|
| 1 | `Psalm 141:1-9`, `Psalm 142:1-7`, `Philippians 2:6-11` |
| 2 | `Psalm 119:105-112`, `Psalm 16:1-6`, `Philippians 2:6-11` |
| 3 | `Psalm 113:1-9`, `Psalm 116:10-19`, `Philippians 2:6-11` |
| 4 | `Psalm 122:1-9`, `Psalm 130:1-8`, `Philippians 2:6-11` |

2026 Trinity Sunday is not enough to prove the rule, because it has
`psalterWeek = 1`; the output happens to match the old Week-1-looking shape.
Regression coverage must include at least one in-scope movable solemnity where
`psalterWeek != 1`.

## Current Defect

The original dispatch premise was stale: current special-key blocks for
`trinitySunday`, `corpusChristi`, `sacredHeart`, and `christTheKing` no longer
inline `firstVespers.psalms`.

However, the current runtime still does not implement the target rule. When a
special-key First Vespers block has no `psalms`, the existing resolver falls
through to regular Sunday Vespers psalmody:

```text
getPsalterPsalmody(day.psalterWeek, 'SUN', 'vespers')
```

That is Sunday Second-Vespers-shaped psalmody, not the Sunday First Vespers
`fv-wN-sun-*` set. For example:

| `day.psalterWeek` | Current regular Sunday Vespers base |
|---|---|
| 1 | `Psalm 110:1-5, 7`, `Psalm 114:1-8`, `Revelation 19:1-7` |
| 2 | `Psalm 110:1-5, 7`, `Psalm 115:1-13`, `Revelation 19:1-7` |
| 3 | `Psalm 110:1-5, 7`, `Psalm 111:1-10`, `Revelation 19:1-7` |
| 4 | `Psalm 110:1-5, 7`, `Psalm 112:1-10`, `Revelation 19:1-7` |

The latent bug is therefore:

```text
running week is followed, but with the wrong Sunday hour's psalmody.
```

## Non-Goals

- Do not inline Laudate psalms or antiphons for these solemnities.
- Do not change UI components.
- Do not change the proper solemnity parts:
  `gospelCanticleAntiphon`, `concludingPrayer`,
  `alternativeConcludingPrayer`, readings, responsories, intercessions, and
  page metadata.
- Do not change Pentecost First Vespers. Pentecost already has sourced proper
  psalmody under `weeks.pentecost.SUN.firstVespers.psalms`.
- Do not change Lauds or Second Vespers Week-1 substitution policy.
- Do not sweep Christmas-season special keys or fixed-date solemnities under
  this GOAL without a separate source-policy decision.

## AC Link

- **[D1] Running Sunday First Vespers psalmody** - in-scope movable solemnity
  First Vespers uses `weeks[day.psalterWeek].SUN.firstVespers.psalms`, not
  regular Sunday `vespers` psalmody and not a fixed Week 1 copy.
- **[D2] Proper parts unchanged** - solemnity Magnificat antiphons,
  concluding prayers, alternates, readings, responsories, intercessions, and
  page metadata remain sourced from the special-key proper block.
- **[D3] Multi-year and multi-solemnity regression** - tests cover all four
  in-scope special keys and at least one date where `psalterWeek != 1`.

## Current Mechanism

`assembleHour()` currently does this:

1. Identifies explicit First Vespers with `hour === 'firstVespers'`
   (`src/lib/loth-service.ts:112`).
2. Converts the lookup hour to `vespers` (`src/lib/loth-service.ts:139-143`).
3. Seeds base psalmody from
   `getPsalterPsalmody(day.psalterWeek, 'SUN', 'vespers')`
   (`src/lib/loth-service.ts:151-162`).
4. Resolves movable solemnity First Vespers via `resolveSpecialKey(...)` and
   `getSeasonFirstVespers(...)` (`src/lib/loth-service.ts:413-426`,
   `src/lib/propers-loader.ts:262-276`).
5. Treats the special-key path as self-contained for proper fields, then
   overrides psalmody only when `firstVespersData.psalms` exists
   (`src/lib/loth-service.ts:440-446`).

Because current in-scope special-key blocks have no `firstVespersData.psalms`,
step 5 preserves the step-3 regular Sunday Vespers base. It never consults
`weeks[day.psalterWeek].SUN.firstVespers.psalms`.

## Hardcoding Inventory

### In-Scope OT Movable Solemnities

| Special key | Data location | Current `firstVespers.psalms` | Current notice rubric | State |
|---|---|---:|---|---|
| `trinitySunday` | `src/data/loth/propers/ordinary-time.json:3470` | absent | `ot-trinity-sun-firstvespers-weekday-psalmody-notice` | Needs resolver fallback to running Sunday First Vespers. |
| `corpusChristi` | `src/data/loth/propers/ordinary-time.json:3549` | absent | `ot-corpus-sun-firstvespers-weekday-psalmody-notice` | Needs resolver fallback to running Sunday First Vespers. |
| `sacredHeart` | `src/data/loth/propers/ordinary-time.json:3620` | absent | `ot-sacredheart-sun-firstvespers-weekday-psalmody-notice` | Needs resolver fallback to running Sunday First Vespers. |
| `christTheKing` | `src/data/loth/propers/ordinary-time.json:3691` | absent | `ot-christtheking-sun-firstvespers-weekday-psalmody-notice` | Needs resolver fallback to running Sunday First Vespers. |

Current invalid inline Week-1 hardcoding count for the four in-scope blocks:
zero. The defect is not stale data in those blocks; it is the resolver fallback
choosing regular Sunday Vespers.

### Similar Shapes Outside Scope

- Ordinary weekly Sunday `weeks[1..34].SUN.firstVespers.psalms` legitimately
  repeat the four-week cycle, including `fv-w1-sun-*` on weeks whose cycle maps
  to psalter Week 1. They are the desired fallback source.
- `src/data/loth/propers/easter.json` Pentecost has sourced movable proper
  First Vespers psalmody with `movable-pentecost-*` antiphons. It must remain.
- Christmas-season `holyFamily` and `baptism` currently resemble Week-1 copies,
  but they are not one of the four GOAL177 in-scope OT movable solemnities.

## State Model

| State | Meaning | Runtime treatment |
|---|---|---|
| `otMovableFirstVespers.noSourcedLaudate` | One of the four in-scope OT movable solemnities has proper non-psalm fields but no sourced Laudate psalmody. | Use `weeks[day.psalterWeek].SUN.firstVespers.psalms`; keep proper fields and notice. |
| `otMovableFirstVespers.sourcedProper` | A future source supplies proper Mongolian Laudate psalms and antiphons for that solemnity. | Use sourced `firstVespers.psalms`; update this MM and tests first. |
| `otMovableFirstVespers.invalidStaticCopy` | A special-key block statically inlines one week's Sunday First Vespers psalms for all years. | Bug; remove the static copy and use dynamic running-week fallback. |
| `ordinarySundayFirstVespers` | Normal Sunday First Vespers data under numeric `weeks[N].SUN.firstVespers`. | Valid fallback source; do not remove. |
| `pentecostProperFirstVespers` | Pentecost has sourced proper First Vespers psalms. | Preserve; do not replace with running fallback. |

## Action Map

1. Resolve the liturgical date and read `day.psalterWeek`.
2. If the hour is not explicit `firstVespers`, leave current behavior alone.
3. If explicit `firstVespers` resolves to one of the four in-scope OT movable
   special keys and that special-key `firstVespers` block has no `psalms`,
   fetch only the psalm array from the numeric weekly Sunday First Vespers
   block selected by `day.psalterWeek`.
4. Merge only those psalms into `psalmEntries`; do not merge weekly Sunday
   readings, responsories, intercessions, prayers, or Magnificat antiphons over
   the special-key proper fields.
5. If the special-key block has sourced `psalms`, preserve them. This protects
   any future sourced proper psalmody and the existing Pentecost pattern.
6. Keep the current-week notice rubric on the in-scope blocks until sourced
   Laudate antiphons exist.

## Minimal Resolver/Data Change

A static data-only change is not sufficient. Adding a `psalms` array to
`trinitySunday.SUN.firstVespers` would freeze one week's psalmody for every
year and reintroduce the exact fixed-week problem.

The minimal resolver change is:

- while resolving explicit First Vespers, compute the special key once;
- when the special key is one of
  `trinitySunday | corpusChristi | sacredHeart | christTheKing`;
- and the returned `firstVespersData` has no `psalms`;
- load the numeric weekly Sunday First Vespers block with
  `getSeasonFirstVespers(day.season, day.psalterWeek)` or an equivalent helper
  that bypasses special-key lookup;
- copy only `weeklyFirstVespers.psalms` into `psalmEntries`.

That implements the target without changing data shape or UI. A helper such as
`getRunningSundayFirstVespersPsalmody(season, psalterWeek)` would make the
special-key bypass explicit and reduce the risk of accidentally re-entering the
same special-key block.

## Scenarios

### S1 - Trinity Sunday, 2026, Week 1

`/pray/2026-05-31/firstVespers` has `psalterWeek = 1`. It renders
`Psalm 141:1-9`, `Psalm 142:1-7`, and `Philippians 2:6-11`, while preserving
the Trinity Magnificat antiphon and concluding prayers. This case is necessary
but not sufficient because Week 1 hides fixed-week regressions.

### S2 - Trinity Sunday, Non-Week-1 Year

For any year where Trinity Sunday has `psalterWeek = 2`, `3`, or `4`, First
Vespers renders that week's `fv-wN-sun-*` psalms. If it renders Week 1 or
regular Sunday Vespers (`Psalm 110...` / `Revelation 19...`), the behavior is
wrong.

### S3 - Corpus Christi, Sacred Heart, Christ the King

Each in-scope special key follows the same dynamic rule. The date's
`psalterWeek` controls the Sunday First Vespers psalm set, while the
celebration-specific Magnificat antiphon and prayer fields remain from the
special-key block.

### S4 - Proper Fields Are Not Backfilled From Weekly Sunday

The weekly Sunday First Vespers block is used only as a psalmody source. Its
short reading, responsory, intercessions, Magnificat antiphon, and concluding
prayer do not overwrite the special-key proper fields.

### S5 - Pentecost Remains Sourced Proper Psalmody

Pentecost First Vespers keeps its `movable-pentecost-*` psalm array. The
running-week fallback applies only to no-sourced-Laudate in-scope OT movable
special keys.

## Test Scenario Map

| ID | Covers | Command | Required assertion |
|---|---|---|---|
| T0 | MM document integrity | `test -f docs/design/mental-models/goal177-solemnity-firstvespers-running-week.md && rg -n '^## (Intended Behavior|Observable Outcome|Current Defect|Non-Goals|AC Link|Current Mechanism|Hardcoding Inventory|State Model|Action Map|Minimal Resolver/Data Change|Scenarios|Test Scenario Map|Sync Surface|Step 1 Report)' docs/design/mental-models/goal177-solemnity-firstvespers-running-week.md` | The file exists and all required MM/report sections are present. |
| T1 | Current defect guard | `npx vitest run src/lib/__tests__/first-vespers.test.ts -t "GOAL177"` | Before the fix, a non-week-1 in-scope movable First Vespers exposes regular Sunday Vespers psalms; after the fix it exposes `fv-wN-sun-*`. |
| T2 | Four-key matrix | `npx vitest run src/lib/__tests__/first-vespers.test.ts -t "movable solemnity First Vespers running week"` | Trinity, Corpus Christi, Sacred Heart, and Christ the King all select by `day.psalterWeek`. |
| T3 | Proper fields preserved | `npx vitest run src/lib/__tests__/first-vespers.test.ts -t "proper fields"` | Special-key Magnificat antiphons and concluding prayers are unchanged. |
| T4 | Pentecost exception | `npx vitest run src/lib/__tests__/first-vespers.test.ts -t "Pentecost"` | Pentecost still returns `movable-pentecost-*` sourced psalmody. |

## Sync Surface

- `src/lib/loth-service.ts` First Vespers comments should distinguish:
  regular Sunday Vespers base, weekly Sunday First Vespers fallback, and
  sourced proper First Vespers psalmody.
- `src/lib/propers-loader.ts` should expose or document any helper that returns
  numeric weekly Sunday First Vespers psalms while bypassing special-key lookup.
- `src/lib/__tests__/first-vespers.test.ts` should add GOAL177 regression cases
  with at least one `psalterWeek != 1` date.
- Existing GOAL115 docs remain the source-policy background; this file is the
  corrected runtime fallback model.
- Data `liturgicalBasis` text for the four in-scope notice rubrics should point
  to this MM when next touched.

## Step 1 Report

**(a) Exact current mechanism:** `assembleHour()` seeds explicit First Vespers
with `getPsalterPsalmody(day.psalterWeek, 'SUN', 'vespers')`, then replaces it
only if the special-key `firstVespersData.psalms` exists. The four in-scope OT
movable blocks have no `psalms`, so current runtime follows the running week
but uses regular Sunday Vespers psalmody.

**(b) Hardcoding-pattern list:** none of the four in-scope OT movable
special-key `firstVespers` blocks currently inline `fv-w1-sun-*` psalms.
Trinity, Corpus Christi, Sacred Heart, and Christ the King are all no-psalms
proper-field blocks with current-week notice rubrics. Ordinary weekly Sunday
First Vespers blocks are valid fallback sources, not defects.

**(c) Does removing hardcoded psalms trigger the target fallback?** No. Removal
alone preserves the preloaded regular Sunday Vespers base. The target requires a
resolver fallback that dynamically loads `weeks[day.psalterWeek].SUN.firstVespers.psalms`
for the four in-scope no-sourced-Laudate special keys, while preserving their
proper non-psalm fields.
