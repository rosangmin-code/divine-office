# F-X2 Phase 3 audit — emergent text-mismatch schema 권고 (#344)

**Task**: #344 (workitem dispatch from team-lead) | **Branch**: `worktree-344-divine-researcher`
**Member**: divine-researcher (Explore profile, research domain) | **Base commit**: `3fa501b`
**SHARD**: targeted (audit-only, read-only investigation; no data/code change)
**Pre-context**: #218 audit, #219 Phase 1 pilot, #224 Phase 2 batch (12 land + 3 deferred → this audit)

## TL;DR

1. **3 occurrences confirmed** as `text + page` joint mismatches via PDF-verbatim
   re-verification: Psalm 110:1-5,7 W2-Sun-vespers @186, Psalm 100:1-5 W3-Fri-lauds @380,
   Psalm 147:12-20 W4-Fri-lauds @493 (multi-page span 493→494). All 3 print a wholly
   different `Дууллыг төгсгөх залбирал` than the `psalter-texts.json` catalog default.
2. **Schema recommendation: Option A** — extend `PsalmEntry` with
   `psalmPrayer?: string`, mirroring Phase 2's `psalmPrayerPage?: number`. Symmetric
   pattern, smallest blast radius, peer-consensus-locked at R2 (`research_methodologist`).
3. **Rich-overlay rule: Strategy R-1 (resolver-side suppression)** — when
   `entry.psalmPrayer` is set, resolver returns `psalmPrayerRich: undefined` to
   prevent plain↔rich text mismatch. Phase 4 (per-occurrence rich) is reserved
   for future user-reported phrase-unit drift on these 3 occurrences.
4. **Fix scope: ~25-35 LOC** across 4 files + 3 data lines + 4 test anchors.
   Land 3 occurrences with full text+page joint override.

## 1. Verbatim diff (PDF vs current catalog)

PDF source: `parsed_data/full_pdf.txt` (32761 lines). Each prayer extracted by
locating `Дууллыг төгсгөх залбирал` header within the page bracket containing
the multi-occurrence psalm body.

### 1.1 Case 1 — Psalm 110:1-5, 7 — W2 Sunday vespers — PDF page 186

**PDF source location**: lines 6235-6247 (page-marker 186, header at L6240)

| Field | Catalog (`psalter-texts.json` line 212) | PDF p.186 (verbatim) |
|-------|----------------------------------------|----------------------|
| `psalmPrayerPage` | 69 (W1 default) | **186** |
| `psalmPrayer` (full) | `"Эцэг минь, амар амгалан ба ялалтыг бидэнд хайрлаж өгнө үү!" хэмээн бид Танаас залбиран гуйж байна. Бидний Хаан ба Эзэн, Есүс Христийн доторх бид Таны баруун гар Талд аль хэдийнээ заларсан байна. Тэнгэрлэг эх орон дээрх Таны хамаг гэгээнтнүүдийн нөхөрлөлийн дунд Таныг магтан сайшаахыг бид хүсэн хүлээж байна.` | `Төгс хүчит Тэнгэрбурхан минь, Та Өөрийн тосолсон Нэгэн болох Христийн хаанчлалыг бүрэн төгс болгоно уу. Шинэ Йерусалимын мөнхийн тахилч болсон Таны Хүүгийн төгс тахил нь газар бүрт Таны нэрээр өргөгдөх болтугай. Мөн Та бүх үндэстнүүдийг Өөрийнхөө төлөөх ариун хүмүүс болгоно уу.` |

Current week-2.json (line 100-117) has `page: 185` (psalm body) and no `psalmPrayerPage` /
`psalmPrayer` override. Resolver therefore renders the catalog text linked to chip page 69 —
which is W1's prayer at W1's page, semantically wrong for the W2 occurrence.

W3-Sun-vespers and W4-Sun-vespers occurrences for the same ref were Phase 2-fixed with
`psalmPrayerPage: 305` / `416` only (catalog text already matched), confirming this W2
occurrence is genuinely a text-different case.

### 1.2 Case 2 — Psalm 100:1-5 — W3 Friday lauds — PDF page 380

**PDF source location**: lines 13093-13117 (page-marker 380, header at L13109)

| Field | Catalog (`psalter-texts.json` line 1433) | PDF p.380 (verbatim) |
|-------|------------------------------------------|----------------------|
| `psalmPrayerPage` | 148 (W1 / Lauds default) | **380** |
| `psalmPrayer` (full) | `Эзэн, баяр баясгалангаар бид Таныг дуудаж байгаа төдийгүй Таны магтаалыг дуулж, Таны сайн сайхан, Таны үнэнийг тунхаглахын тулд Та бидний зүрх сэтгэлийг нээнэ үү хэмээн гуйж байна.` | `Бидэнд хайртай Эцэг Тэнгэрбурхан минь, Та ид хүчнийхээ тэмдгийг үзүүлснээрээ биднийг бүтээсэн төдийгүй Өөрийнхөө сайн сайхныг харуулснаараа биднийг Өөрийн ард түмнээр сонгосон билээ. Хамаг хүмүүс Таны хашаанд магтаалтайгаар орохын тулд Та охид хөвгүүдийнхээ өргөж буй дуун магтаалыг минь хүлээн авна уу.` |

Psalm 100:1-5 has only one other occurrence (W1-FRI-lauds) that uses the catalog default —
this W3 case is the sole emergent variant.

### 1.3 Case 3 — Psalm 147:12-20 — W4 Friday lauds — PDF page 493 (spans 493→494)

**PDF source location**: lines 17086-17104 (header at L17087, body wraps over page break
at L17094-17097 to page 494, prayer ends at L17104)

| Field | Catalog (`psalter-texts.json` line 4568) | PDF p.493-494 (verbatim) |
|-------|------------------------------------------|---------------------------|
| `psalmPrayerPage` | 268 (W2-FRI-lauds default; page 268 carries catalog text) | **493** |
| `psalmPrayer` (full) | `Эзэн, Та Йерусалимын хил хязгаарт амар тайвныг тогтоосон. Та одоо итгэгч нараа амар амгаланг хайрлан соёрхоно уу. Амар амгалан энэ амьдралд биднийг удирдан залахаар зогсохгүй мөнхийн амьдралд биднийг бялхаах болтугай. Та биднийг хамгийн сайхан улаан буудайгаар дүүргэх гэж байгаа тул одоо толинд бүдэг бадаг харагддаг зүйлийг бид Таны үнэний гэрэл дотор тод харахыг Та хайрлан соёрхоно уу.` | `Төгс хүчит Тэнгэрбурхан минь, хишиг ивээлээр бялхаасан ба Ариун Сүнсээр хүчирхэгжүүлсэн Шашнаараа уламжлан Та Өөрийн үгийг бүх үндэстэн рүү илгээдэг. Тиймийн тул Та Өөрийн Шашныг дээдийн дээд амин зуулгаар тэжээн тэтгэж, итгэл бишрэлдээ эргэлзээгүй болгоно уу. Түүнчлэн Та түүний охид хөвгүүдийг олон болгож өгнө үү. Ингэснээр тэд тэнгэр дээрх тахилын ширээн дээр Таны хайрын нууцуудыг нэгэн сэтгэлээр тэмдэглэх болно.` |

NB: Psalm 147:12-20 W2-FRI-lauds (week-2.json line 838, `page: 267` body / catalog prayer
on p.268) was correctly left unchanged by Phase 2 — that occurrence's PDF prayer **does**
match the catalog. Only the W4 occurrence diverges.

### 1.4 PDF page-number consistency

All 3 page numbers (186, 380, 493) verified via in-text page markers, not by audit
heuristic. No off-by-one risk (the +1/+2 estimation drift that caused Phase 2's
4 audit-estimate corrections is not applicable here — the data was extracted by
direct line-number anchor in `parsed_data/full_pdf.txt`).

## 2. Schema option trade-off matrix

Phase 2 #224 schema state: `psalmPrayerPage?: number` on `PsalmEntry`, resolver uses
nullish-coalesce `entry.psalmPrayerPage ?? psalmText.psalmPrayerPage` at psalm.ts:80
(catalog path) and psalm.ts:122 (Bible-fallback path). Plain `psalmPrayer` text is
pulled from `psalmText.psalmPrayer` (no override mechanism). `psalmPrayerRich`
overlay is loaded via `loadPsalterTextPsalmPrayerRich(entry.ref)` from
`psalter-texts.rich.json`, single representation per ref.

| Option | Description | Schema delta | LOC | Pros | Cons |
|--------|-------------|--------------|-----|------|------|
| **A** | `psalmPrayer?: string` on `PsalmEntry`, mirrors Phase 2 page-override | types.ts +1 line, psalm.ts +~6 (2 sites) | ~25-35 | Symmetric with #224, occurrence-bound metadata co-located in week-N.json (consistent SSOT placement), smallest blast radius | Plain-only — needs explicit psalmPrayerRich handling rule (covered below) |
| B | `psalmPrayerTextOverride?: { plain, rich? }` joint object | types.ts +4-5 lines, psalm.ts +~10 (object destructure) | ~40-55 | Explicit "this is a NEW prayer for this occurrence" semantics; bundles plain+rich | Verbose; 2 fields where 1 + suppression rule does; Phase 4 R-2 (catalog occurrence-keyed) becomes the cleaner long-term shape anyway |
| C | `psalter-texts.json` extension: `occurrences: { <occurrence_key>: { psalmPrayer, psalmPrayerPage } }` | catalog refactor for 3 refs + resolver key-composer | ~80-120 | Catalog as single SSOT for prayer text; clean for any future occurrence variant | Reverses Phase 2's deliberate decision to keep occurrence-bound metadata in week-N.json (page / antiphon_key already there); requires occurrence-key derivation logic at resolver |
| D | Hybrid: A's plain text on entry + catalog rich extension `occurrencesRich: { <key>: psalmPrayerRich }` | Option A +catalog rich extension | ~50-70 | Plain & rich both occurrence-aware without rebuilding catalog plain-text shape | More moving parts; rich for these 3 cases doesn't exist in the build pipeline yet so no current rich data to attach |

### 2.1 Why not B/C/D today

- **B** (joint object) gains expressivity that's wasted for plain-only cases; its
  rich slot is `?: PrayerText` and would be `undefined` for all 3 Phase 3 cases —
  same observable behavior as Option A + suppression at higher cost.
- **C** (catalog occurrence-keyed) is the *correct* shape if and only if multi-occurrence
  text variation becomes the dominant pattern. Today's audit found 3 cases out of
  ~157 active week-N psalm entries (≈2%). Phase 2 surveyed 15 candidates and only
  3 needed text divergence. Refactoring the catalog for 3 cases inverts cost/benefit.
- **D** depends on rich-overlay data existing for the 3 occurrences, which it does
  not. Phase 4 trigger ("user reports phrase-unit drift on these 3 prayer texts")
  has not fired. Building the catalog extension preemptively is YAGNI.

### 2.2 Rich-overlay handling (CRITICAL — peer R2 consensus)

`psalmPrayerRich` is keyed only by `ref` in `psalter-texts.rich.json`. None of the
3 Phase 3 occurrences has a rich overlay matching the *PDF text* — the catalog rich
encodes the W1 default text. If Option A lands without rich-handling, resolver
would emit:
- `psalmPrayer`: PDF-verbatim text (correct)
- `psalmPrayerRich`: catalog rich AST of the *different* W1 prayer (wrong)

Renderer (`rich-content.tsx`) prefers rich when present, so the user would see
W1's rich prayer despite the override.

**Strategy R-1 (LOCKED, peer R2 AGREE)**: at the resolver, when
`entry.psalmPrayer !== undefined`, return `psalmPrayerRich: undefined`
unconditionally. This forces the renderer's plain-text fallback path — already
exercised by FR-153h and 4 existing resolver tests. The 3 occurrences temporarily
lose phrase-unit / hanging-indent UX (FR-161), but since FR-161 phrase coverage
for these 3 PDF prayer texts didn't exist anyway, net-delta is **zero UX
regression**.

**Strategy R-2 (RESERVED for Phase 4)**: extend `psalter-texts.rich.json` with
`psalmPrayerRichByOccurrence: { <occurrence_key>: PrayerText }`, add builder
support in `scripts/build-phrases-into-rich.mjs`, thread occurrence key through
resolver. Trigger: explicit user report of phrase-unit drift on one of these 3
occurrences, OR a 4th emergent text-mismatch case lands.

## 3. Recommendation (consensus-locked)

**Land Option A + Strategy R-1 as a single Phase 3 fix WI**, dispatched to a member
with implementer profile (member-01 / dev / solver). Recommended dispatch shape:

- **WI title**: `F-X2 Phase 3: psalmPrayer text+page joint override (3 occurrences) — Option A + R-1`
- **Schema**: `psalmPrayer?: string` on `PsalmEntry`
- **Resolver gate**: when `entry.psalmPrayer` set → emit `psalmPrayerRich: undefined`
  (both psalm.ts return sites)
- **Data**: 3 entries in week-{2,3,4}.json gain `psalmPrayer` + `psalmPrayerPage`
- **Tests**: 4 anchors minimum (3 occurrence-positive + 1 resolver R-1 suppression
  assertion); 1 W1-no-override regression test recommended (≅5 total)
- **SHARD**: full-suite (resolver + types + data — same shape as #219/#224)
- **PRD/traceability**: extend `FR-NEW` row that #219/#224 introduced (single
  cohesive feature numbering); no NFR change

Phase 2 #224 commit message paraphrased the Option A schema as
`psalmPrayer?: string` (handoff §2 footer). This audit confirms that recommendation
verbatim and adds the previously unstated rich-handling rule.

## 4. Fix scope estimate (per recommended option)

| File | Operation | Lines | Notes |
|------|-----------|-------|-------|
| `src/lib/types.ts` | edit | +1 | Add `psalmPrayer?: string` to `PsalmEntry` (after existing `psalmPrayerPage?` line, with comment mirroring its style) |
| `src/lib/hours/resolvers/psalm.ts` | edit | ~+8 (2 sites × ~4) | At psalm.ts:72 + :116 — change `psalmPrayer: psalmText.psalmPrayer` to read entry override + suppress rich. Pseudo: `const overrideText = entry.psalmPrayer; psalmPrayer: overrideText ?? psalmText.psalmPrayer; psalmPrayerRich: overrideText !== undefined ? undefined : <existing>` |
| `src/data/loth/psalter/week-2.json` | edit | +2 | Psalm 110:1-5,7 W2-SUN-vespers entry: add `psalmPrayer` + `psalmPrayerPage: 186` |
| `src/data/loth/psalter/week-3.json` | edit | +2 | Psalm 100:1-5 W3-FRI-lauds entry: add `psalmPrayer` + `psalmPrayerPage: 380` |
| `src/data/loth/psalter/week-4.json` | edit | +2 | Psalm 147:12-20 W4-FRI-lauds entry: add `psalmPrayer` + `psalmPrayerPage: 493` |
| `src/lib/hours/resolvers/__tests__/psalm.test.ts` | edit | ~+60-80 | 3 positive anchors (one per occurrence — assert `psalmPrayer === <PDF text>` + `psalmPrayerPage === <page>` + `psalmPrayerRich === undefined`); 1 resolver suppression assertion; 1 W1-no-override regression (catalog default fully intact) |

**Total**: ~25-30 LOC code + ~80 LOC test (line-counted plain-text strings inflate
the test file disproportionately; structural delta is small).

**Touched files**: 6 (1 type, 1 resolver, 3 data, 1 test).
**Touched modules at runtime**: 1 (resolver `psalm.ts`).

### 4.1 Verification gates inherited from #224

- `npm test` (vitest): expect 5 new passing anchors layered on the 803/843 baseline
- `npx tsc --noEmit`: clean (additive optional field, no breaks)
- `npx eslint <changed>`: clean
- `node scripts/audit-fx2-phase2-pages.js`: should re-run cleanly; emits ALL_VERIFIED
  for the 3 newly-overridden pages alongside the 12 existing Phase 2 entries
- `node scripts/verify-psalter-pages.js`: psalm body `page` unchanged → `agree 157
  / verified-correction 4 / drift 0` baseline preserved

### 4.2 Risk register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Resolver R-1 suppression breaks an existing test that asserts `psalmPrayerRich !== undefined` for these refs | LOW | None of these 3 refs has a positive rich anchor today; default-W1 anchors are unaffected (override only fires when entry has the field) |
| User reports phrase-unit drift on one of the 3 prayer texts | LOW (FR-161 doesn't currently cover them) | Phase 4 trigger; R-2 strategy already specced |
| Catalog `psalmPrayer` text gets renamed/reformatted later, accidentally bringing override-text out of sync | MEDIUM | Add `scripts/audit-fx2-phase2-pages.js` regression check against override text (one-line addition at most), or accept as data-quality scrub task |

## 5. References

- `parsed_data/full_pdf.txt` lines 6235-6247 / 13093-13117 / 17086-17104
- `src/data/loth/psalter-texts.json` lines 185-213 / 1411-1434 / 4545-4569
- `src/data/loth/psalter/week-2.json` line 97-117 (Psalm 110 W2 entry)
- `src/data/loth/psalter/week-3.json` line 858-872 (Psalm 100 W3 entry)
- `src/data/loth/psalter/week-4.json` line 864-877 (Psalm 147 W4 entry)
- `src/lib/types.ts` lines 181-232 (PsalmEntry), 655-669 (AssembledPsalm)
- `src/lib/hours/resolvers/psalm.ts` (entire file — 127 lines)
- `src/lib/prayers/rich-overlay.ts` lines 240-297 (psalter-texts catalog loader)
- `docs/handoff-fx2-phase2-batch.md` §2 (Phase 2 deferred table — superseded here)
- Peer R1/R2 exchanges: `.claude/pair-working/sessions/fx2-phase3-audit-344/peer/exchanges/`

## 6. Decision log (peer consensus)

| Round | Claude stance | Peer (research_methodologist) stance | Outcome |
|-------|--------------|--------------------------------------|---------|
| R1 | AGREE on Option A | APPROVED_WITH_ISSUES (Option A + rich concern) | forced_continue (min_rounds=2) |
| R2 | AGREE — lock R-1 | AGREE — lock R-1 | **consensus_reached** at round 2 |

Discussion exchange IDs:
- R1: `ex_20260508T130316Z_8e66a5f6` (15.7s, 557 output tokens)
- R2: `ex_20260508T130432Z_8409a5f8` (9.4s, 804 output tokens)

### 6.1 Phase 3 fix execution (#352, dev, 2026-05-08)

Implemented Option A + Strategy R-1 verbatim per §3 recommendation.

| Aspect | Outcome |
|--------|---------|
| Schema (Option A) | `psalmPrayer?: string` added to `PsalmEntry` (`src/lib/types.ts` L199, mirrors Phase 2's `psalmPrayerPage?: number` placement directly above) |
| Resolver gate (R-1) | Both return sites in `src/lib/hours/resolvers/psalm.ts` updated. When `entry.psalmPrayer !== undefined`: `psalmPrayer` resolves to entry override, `psalmPrayerRich` is set to `undefined` unconditionally (catalog rich AST for the W1-default text is suppressed). Plain-text rendering path takes over — already exercised by FR-153h. |
| Data lands (3 occurrences) | `week-2.json` Psalm 110:1-5,7 W2-SUN-vespers (psalmPrayer + page 186); `week-3.json` Psalm 100:1-5 W3-FRI-lauds (psalmPrayer + page 380); `week-4.json` Psalm 147:12-20 W4-FRI-lauds (psalmPrayer + page 493). Catalog (`psalter-texts.json`) intentionally unchanged — zero data churn, R-1 contract. |
| Tests added | `psalm.test.ts` Phase 3 describe block: 3 occurrence-positive anchors (each asserts `psalmPrayer === <PDF text>` + `psalmPrayerPage === <expected>` + `psalmPrayerRich === undefined`); 1 negative-pair regression (same ref without override → catalog rich + plain still flow); 1 Bible-fallback parity assertion. Loader mock surfaces `SENTINEL_RICH_AST` for the 3 affected refs so the suppression branch is provably distinguishable from vacuous absence. |
| Verification gates | vitest **951 passed / 0 failed** (47 files, baseline 943 + 8 new — 5 Phase 3 anchors plus 3 Phase-3-aware mock entries needed by the existing Phase 2 anchors); `npx tsc --noEmit` clean; `npx eslint <changed>` 0 errors; `verify-phrase-coverage.js` 215/215 OK; `verify-no-page-noise.js` 0 violations; `verify-psalter-pages.js` agree=157 / verified-correction=4 / drift=0 (baseline preserved). |
| audit-fx2-phase2-pages.js (Phase 3 rows) | Rows 1 (Psalm 110 W2 @186), 8 (Psalm 100 W3 @380), 15 (Psalm 147 W4 @493) — page column ✓ (PDF page matches week-N.json `psalmPrayerPage`); prayer-text column shows `✗ DIFFERS` because the script compares to catalog default — this is **expected** per Strategy R-1 (catalog intentionally unchanged). Script's overall `NEEDS_REVIEW` summary is the pre-existing baseline (rows 5/6/7/9 — Phase 2 audit-estimate vs PDF off-by-1/2 — unrelated to Phase 3). |

**Risk register status (§4.2)**: R3 (catalog rename drift) — left as data-quality scrub; not blocking. The audit script's prayer-text comparison column already provides the visibility needed; a future regression check can be added without schema impact.

**LOC actual vs estimated**: ~30 LOC code (1 type field + ~12 LOC across 2 resolver sites + 6 LOC across 3 data files) + ~120 LOC test (5 anchors + 3 mock entries + sentinel rich AST scaffolding). Slightly above the §4 estimate (~25-30 LOC code + ~80 LOC test) due to the rich-overlay sentinel mock pattern needed to make R-1 suppression provably distinguishable.

