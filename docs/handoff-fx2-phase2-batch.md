# F-X2 Phase 2 batch handoff — psalmPrayerPage 전수 (#224)

**Task**: #224 (workitem dispatch from team-lead) | **Branch**: `worktree-224-member-01`
**Member**: member-01 (implementer profile) | **Base commit**: `2fbed12`
**SHARD**: full-suite (vitest 803 + tsc + verify-psalter-pages re-run)
**Pilot precedent**: #219 (Phase 1, Psalm 92:2-9 W4 → 506) — Option A lean infrastructure already in place.

## TL;DR

1. **12 of 15 occurrences landed** as `psalmPrayerPage` overrides in `week-{2,3,4}.json` after PDF-verbatim verification of every estimate from `docs/handoff-fx2-psalmprayer-audit.md` §3.1. 4 audit estimates were off-by-+1 or +2 — corrected against PDF.
2. **3 occurrences deferred to Phase 3** (emergent scope discovery): the catalog (`psalter-texts.json`) prayer text for these refs differs *between LOTH 4-week occurrences*, breaking the audit's premise that "occurrences share byte-identical prayer text and only differ by page". Page-only override on these would create a NEW UX inconsistency (display text ≠ chip page's text). Detailed below.
3. **Test coverage**: 5 new vitest anchors (Phase 2 sample + Bible-fallback path per review #221 I-1). All 803 tests pass.
4. **Audit tooling**: `scripts/audit-fx2-phase2-pages.js` committed — re-runnable PDF verifier for any future psalmPrayerPage occurrence sweep.

## 1. Applied overrides (12 occurrences / 9 keys)

| # | Ref | Occurrence | week-N.json | `psalmPrayerPage` | PDF-verified | Audit estimate |
|--|-----|-----------|-------------|------------------|-----|----|
| 1 | Psalm 51:3-19 | w2-FRI-lauds | week-2.json | **265** | ✓ | 264 (off +1) |
| 2 | Psalm 110:1-5, 7 | w3-SUN-vespers | week-3.json | 305 | ✓ | 305 ✓ |
| 3 | Psalm 119:145-152 | w3-SAT-lauds | week-3.json | 392 | ✓ | 392 ✓ |
| 4 | Psalm 51:3-19 | w3-FRI-lauds | week-3.json | **377** | ✓ | 376 (off +1) |
| 5 | Psalm 67:2-8 | w3-TUE-lauds | week-3.json | 334 | ✓ | 334 ✓ |
| 6 | Psalm 110:1-5, 7 | w4-SUN-vespers | week-4.json | 416 | ✓ | 416 ✓ |
| 7 | Psalm 51:3-19 | w4-FRI-lauds | week-4.json | **490** | ✓ | 489 (off +1) |
| 8 | Psalm 118:1-16 | w4-SUN-lauds | week-4.json | **408** | ✓ | 406 (off +2) |
| 9 | Psalm 150:1-6 | w4-SUN-lauds | week-4.json | 412 | ✓ | 412 ✓ |
| 10 | Psalm 8:2-10 | w4-SAT-lauds | week-4.json | 509 | ✓ | 509 ✓ |
| 11 | Psalm 135:1-12 | w4-MON-lauds | week-4.json | 429 | ✓ | 429 ✓ |
| 12 | Psalm 144:1-10 | w4-THU-vespers | week-4.json | 482 | ✓ | 482 ✓ |

**4 audit-estimate corrections** (rows 1, 4, 7, 8 above): the audit's heuristic (`occurrence_psalm_page + 1 또는 +2`) under-counted in cases where the psalm body spans 2 pages. PDF-verbatim verification (`scripts/audit-fx2-phase2-pages.js`) located the actual `Дууллыг төгсгөх залбирал` header line in `parsed_data/full_pdf.txt` and read its printed-page number. The audit explicitly anticipated this ("실제 정정 시 PDF 본문 verbatim 검증으로 확정해야 함" — §3.1 footnote).

## 2. Deferred — emergent Phase 3 scope (3 occurrences)

The audit's premise (§1) held that prayer text is byte-identical across all occurrences of a multi-occurrence ref, so only the page chip needs overriding. Verbatim PDF cross-check during Phase 2 found **3 refs whose later-week occurrence prints a *different* prayer text** than the catalog (= W1 representative):

| Ref | Occurrence | Catalog prayer (W1/W2 default, first 30 ch) | PDF actual prayer at that occurrence |
|-----|-----------|--------------------------------------------|--------------------------------------|
| Psalm 110:1-5, 7 | w2-SUN-vespers (p.186) | `"Эцэг минь, амар амгалан...` | `Төгс хүчит Тэнгэрбурхан минь, Та Өөрийн тосолсон Нэгэн...` |
| Psalm 100:1-5 | w3-FRI-lauds (p.380) | `Эзэн, баяр баясгалангаар...` | `Бидэнд хайртай Эцэг Тэнгэрбурхан минь, Та ид хүчнийхээ...` |
| Psalm 147:12-20 | w4-FRI-lauds (p.493) | `Эзэн, Та Йерусалимын хил хязгаарт...` | `Төгс хүчит Тэнгэрбурхан минь, хишиг ивээлээр бялхаасан...` |

**Why deferred**: Applying `psalmPrayerPage` alone to these would point the chip to a page whose printed prayer differs from what the app displays — creating a *new* display↔link inconsistency that didn't exist before. The right fix needs both prayer-text override **and** page override, paired per occurrence.

**Phase 3 recommendation**: extend the schema with `psalmPrayer?: string` (mirroring the new `psalmPrayerPage?: number`) on `PsalmEntry`, plus matching nullish-coalesce in `resolvePsalm` for `psalmPrayer` / `psalmPrayerRich`. Land 3 occurrences with full text+page override. Tracker entry recommended (the dispatch title's "11 keys / 15 occurrences" needs amending; this Phase 2 actually completes 9 keys / 12 occurrences cleanly, with 3 deferred).

## 3. Test additions

`src/lib/hours/resolvers/__tests__/psalm.test.ts` — 5 new anchors in a new `F-X2 Phase 2` describe block:

1. **W4-FRI-Lauds Psalm 51:3-19 → 490** — pins the +2 page case (psalm body spans p.488-489, prayer on p.490).
2. **W3-SUN-Vespers Psalm 110:1-5, 7 → 305** — pins multi-week ref override.
3. **W1-SUN-Vespers Psalm 110:1-5, 7 (no override) → 69 catalog default** — guards against accidental promotion of W3/W4 override into W1.
4. **Bible-fallback path with override** — *closes review #221 I-1*. New mock entries: `Psalm 200:1-3` with empty stanzas (forces fallback) + `lookupRef(psalm 200) → synthetic verse` (so `allVerses.length > 0`). Confirms the second `psalmPrayerPage: entry.psalmPrayerPage ?? psalmText?.psalmPrayerPage` site at psalm.ts:122 honors the override.
5. **Bible-fallback path without override → catalog default** — pairs with #4 to cover both branches of the `??` operator at psalm.ts:122.

Existing 3 Phase 1 anchors and 10 antiphon-selection anchors unchanged.

## 4. Verification gates

| Gate | Command | Result |
|---|---|---|
| vitest | `npx vitest run` | **803 passed (43 files), 0 failed** (was 784 in #219 review; +19 = 5 new + 14 from intervening tasks) |
| typecheck | `npx tsc --noEmit` | clean (no errors) |
| eslint | targeted `npx eslint <changed-files>` | 0 errors (3 JSON-no-config warnings, expected) |
| `verify-psalter-pages.js` | `node scripts/verify-psalter-pages.js` | agree 157 / verified-correction 4 / drift 0 (same as pre-pilot baseline; verifier validates psalm body `page`, not new `psalmPrayerPage` field) |
| PDF audit script | `node scripts/audit-fx2-phase2-pages.js` | 12/15 ALL_VERIFIED (3 deferred for text-differs as above) |

## 5. Files changed

| File | Type | Change |
|---|---|---|
| `src/data/loth/psalter/week-2.json` | data | +1 line — Psalm 51:3-19 W2-FRI-Lauds `psalmPrayerPage: 265` |
| `src/data/loth/psalter/week-3.json` | data | +4 lines — Psalm 110/119/51/67 W3 overrides |
| `src/data/loth/psalter/week-4.json` | data | +7 lines — Psalm 118/150/110/135/144/51/8 W4 overrides |
| `src/lib/hours/resolvers/__tests__/psalm.test.ts` | test | +95 lines — 5 new anchors, mock psalterTexts + lookupRef expanded |
| `scripts/audit-fx2-phase2-pages.js` | tool | +247 lines — re-runnable PDF page verifier for occurrence sweeps |
| `scripts/out/psalter-page-{corrections,review}.json` | gen | timestamp only |

(Resolver `psalm.ts` and types `PsalmEntry` *unchanged* — Phase 1 infrastructure already supports per-occurrence override; Phase 2 is data-only + tests.)

## 6. Phase 3 candidates (out of scope, hand-back to leader)

- **Phase 3 (text+page override for 3 differing occurrences)**: `psalmPrayer?: string` field on `PsalmEntry` with matching resolver fall-back. Affected: Psalm 110 W2, Psalm 100 W3, Psalm 147 W4. Suggested new WI.
- **Phase 4 (psalter-headers catalog occurrence-keyed shape)**: `rich-overlay.ts:305-306` deferred work — would consolidate Phase 3's text override pattern into the existing rich catalog structure.
- **NFR-009d verifier extension**: extend `verify-psalter-pages.js` to also validate `psalmPrayerPage` per occurrence (currently only validates psalm body `page`). Audit §3 final bullet.
- **ORPHAN 4 keys** (Saturday First Vespers I etc.): per audit §3.3 — separate sweep when ordinarium/compline/propers/sanctoral psalter reuse audit happens.

## 7. Peer evidence

This skill (pair-process-workitem) ran in solo mode (member-01 implementer profile). No peer consultation step was invoked because the dispatch payload did not include a peer_consultation_required flag and the work was a pure data + test extension of an already-reviewed Phase 1 design (`docs/review-221-219-fx2-phase1.md` APPROVED_WITH_ISSUES). degraded_mode: false — peer was simply not part of the protocol for this WI shape.
