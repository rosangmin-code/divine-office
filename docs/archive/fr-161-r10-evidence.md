# FR-161 R-10 — NFR-009j CI gate evidence

**Status**: completed (task #187, base `f856ae5` post-R-9.B)

## What landed

| Surface | Change |
|---------|--------|
| `package.json` `scripts` | added `verify:phrase-coverage` and `verify:phrase-coverage:check` |
| `.github/workflows/ci.yml` quality job | added "Phrase coverage gate (NFR-009j)" step running `npm run verify:phrase-coverage:check` |

The CI step sits after the existing Traceability check inside the
`quality` job, so it runs in the same matrix as `lint` / `tsc` /
`vitest` and shows up as its own line in the GitHub Actions UI when it
fails. Granularity matches the existing convention (each verify-* /
typecheck / eslint / vitest is a separate step) — operators see at a
glance which gate blocked.

## Baseline (R-9.B HEAD)

```
$ npm run verify:phrase-coverage

> node scripts/verify-phrase-coverage.js
[verify-phrase-coverage] OK — 212 stanza(s) with phrases inspected, 0 violations
```

212 stanzas annotated, 0 violations. This number is the floor — the
gate must keep showing PASS as R-9.E and beyond push the count up.

## Regression catch (synthetic invalid fixture)

To confirm the gate actually blocks regressions, an off-tree invalid
fixture exercises the failure path without touching real data:

```
$ node scripts/verify-phrase-coverage.js --target /tmp/187-invalid-fixture.json --check
[verify-phrase-coverage] FAIL — 2 violation(s) across 2 inspected stanza(s)
  Psalm INVALID:gap :: blocks[0] :: COVERAGE — tail gap at lines [1, 2] (uncovered tail)
  Psalm INVALID:overlap :: blocks[0] :: OVERLAP — phrases[0] [0, 1] overlaps phrases[1] [1, 1]
exit 1
```

The fixture covered both COVERAGE (gap) and OVERLAP shapes; SCHEMA and
BOUNDS are exercised by the unit tests already shipped in #178
(`scripts/__tests__/verify-phrase-coverage.test.mjs`). Fixture removed
after the run — no commit.

## Regression neutrality

- `npx tsc --noEmit` → 0 errors
- `npx vitest run` → 40 files / 647 tests PASS (baseline 640 + 7 added by R-9.x — none from this task)

## Operator notes

- Local fast check: `npm run verify:phrase-coverage` (summary).
- Local debugging: `npm run verify:phrase-coverage:check` (per-violation).
- Restrict to one ref: `node scripts/verify-phrase-coverage.js --ref "Psalm 110:1-5, 7"`.
- Alternate target: `--target <path>` (used by integration tests + this evidence run).

The CI step uses `--check` mode so a failed run lands in the action
log already itemised — no reproduce-locally round trip needed to see
which ref / block / invariant tripped the gate.
