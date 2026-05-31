# GOAL #140 - stale psalmPrayerRich investigation

작성: dvo-res, task #141. 범위: read-only investigation plus this report. No data/code
files were modified or generated.

## Executive Result

The dispatch estimate ("pre-existing stale psalmPrayer rich ~11 refs") needs one
precision correction:

- **Content-stale psalmPrayerRich count is 0** in the current checkout. A read-only
  in-memory rebuild of all 82 eligible `psalmPrayer + psalmPrayerPage` refs with
  current `buildProsePrayer` logic returned **82/82 PASS, failures 0, stale
  rich-vs-rebuilt 0**.
- The live stale surface is **occurrence-bound metadata**, not rich prayer text:
  12 ref-keyed catalog entries have `psalmPrayerRich.page` for the catalog/default
  occurrence while one or more week occurrences override `psalmPrayerPage` and/or
  `psalmPrayer`. This is the old F-X2 multi-occurrence class. If Psalm 92:2-9
  pilot #219 is excluded, the historical "remaining batch" count is 11
  (`docs/handoff-fx2-psalmprayer-audit.md:103`,
  `docs/handoff-fx2-psalmprayer-audit.md:107`,
  `docs/handoff-fx2-psalmprayer-audit.md:118`,
  `docs/handoff-fx2-psalmprayer-audit.md:345`).
- Two refs, `Psalm 141:1-9` and `Psalm 142:1-7`, are **not stale rich** because
  they have no `psalmPrayerRich` field. They are first-vespers/catalog-completion
  backlog and currently render through plain fallback where used
  (`parsed_data/first-vespers-versed-map.json:42`,
  `parsed_data/first-vespers-versed-map.json:53`,
  `src/data/loth/prayers/commons/psalter-texts.rich.json:61410`,
  `src/data/loth/prayers/commons/psalter-texts.rich.json:61987`).

## Method

Read-only checks performed:

1. Traced render path: `psalmPrayerRich` is loaded from the shared rich catalog,
   propagated by `resolvePsalm`, and rendered by `PsalmBlock` when present
   (`src/lib/prayers/rich-overlay.ts:292`,
   `src/lib/hours/resolvers/psalm.ts:70`,
   `src/lib/hours/resolvers/psalm.ts:142`,
   `src/components/psalm-block.tsx:300`,
   `src/components/psalm-block.tsx:307`).
2. Confirmed `RichContent` does **not** render `content.page`; the visible page
   chip belongs to the parent section header
   (`src/components/prayer-sections/rich-content.tsx:8`,
   `src/components/psalm-block.tsx:304`).
3. Imported `buildProsePrayer` and ran an in-memory rebuild against
   `public/psalter.pdf`, using the same section heading/end-of-block contract as
   `scripts/build-psalter-prayers-rich.mjs` (`scripts/build-psalter-prayers-rich.mjs:37`,
   `scripts/build-psalter-prayers-rich.mjs:44`,
   `scripts/build-psalter-prayers-rich.mjs:141`,
   `scripts/parsers/rich-builder.mjs:926`). No writer script was run.
4. Compared flattened current `psalmPrayerRich` text to both
   `src/data/loth/psalter-texts.json` `psalmPrayer` and the in-memory rebuilt
   rich text. Result: current rich-vs-source mismatches `[]`; eligible missing
   rich `["Psalm 141:1-9","Psalm 142:1-7"]`; builder passes 82, failures 0,
   stale rich-vs-rebuilt `[]`.

## Classification Table

| ref | render use? | classification | evidence | fix needed? |
| --- | --- | --- | --- | --- |
| Psalm 110:1-5, 7 | Mixed. W1/W3/W4 use catalog rich; W2 has `psalmPrayer` override and suppresses rich. | ref-keyed rich metadata stale for W3/W4 page-only overrides; W2 rich text is superseded/suppressed, not user-visible. | Catalog default `psalmPrayerPage` 69 (`src/data/loth/psalter-texts.json:212`); rich page 69 (`src/data/loth/prayers/commons/psalter-texts.rich.json:2711`); W2 override text+page 186 (`src/data/loth/psalter/week-2.json:101`, `:107`); W4 page override 416 (`src/data/loth/psalter/week-4.json:108`, `:114`). | No current rich-content defect. Optional future: occurrence-keyed rich for W2 if phrase-level rich UX is required. |
| Psalm 51:3-19 | Yes, rich content is rendered for all occurrences. | page-only metadata stale; rich text is normal and reused. | Catalog page 144 (`src/data/loth/psalter-texts.json:1350`); rich page 144 (`src/data/loth/prayers/commons/psalter-texts.rich.json:18123`, `:18135`); W2/W3/W4 page overrides 265/377/490 (`src/data/loth/psalter/week-2.json:815`, `:821`; `src/data/loth/psalter/week-3.json:835`, `:841`; `src/data/loth/psalter/week-4.json:841`, `:847`). | No user-visible rich fix. Existing page override fixes visible chip. |
| Psalm 119:145-152 | Yes. | page-only metadata stale; rich text normal. | Catalog page 160 (`src/data/loth/psalter-texts.json:902`); rich page 160 (`src/data/loth/prayers/commons/psalter-texts.rich.json:12210`, `:12270`); W3 page override 392 (`src/data/loth/psalter/week-3.json:996`, `:1002`). | No user-visible rich fix. |
| Psalm 100:1-5 | Mixed. W1 uses catalog rich; W3 has `psalmPrayer` override and suppresses rich. | W3 rich text is superseded/suppressed; no rendered stale rich. | Catalog text/page 148 (`src/data/loth/psalter-texts.json:1430`); rich page 148 (`src/data/loth/prayers/commons/psalter-texts.rich.json:19228`, `:19240`); W3 override text+page 380 (`src/data/loth/psalter/week-3.json:862`, `:868`). | No current defect. Optional future occurrence rich for W3 only. |
| Psalm 118:1-16 | Yes. | page-only metadata stale; rich text normal. | Catalog page 178 (`src/data/loth/psalter-texts.json:1874`); rich page 178 (`src/data/loth/prayers/commons/psalter-texts.rich.json:25199`, `:25211`); W4 page override 408 (`src/data/loth/psalter/week-4.json:9`, `:15`). | No user-visible rich fix. |
| Psalm 150:1-6 | Yes. | page-only metadata stale; rich text normal. | Catalog page 181 (`src/data/loth/psalter-texts.json:1949`); rich page 181 (`src/data/loth/prayers/commons/psalter-texts.rich.json:26042`, `:26054`); W4 page override 412 (`src/data/loth/psalter/week-4.json:46`, `:52`). | No user-visible rich fix. |
| Psalm 67:2-8 | Yes. | page-only metadata stale; rich text normal. | Catalog page 240 (`src/data/loth/psalter-texts.json:2581`); rich page 240 (`src/data/loth/prayers/commons/psalter-texts.rich.json:34190`, `:34214`); W3 page override 334 (`src/data/loth/psalter/week-3.json:398`, `:404`). | No user-visible rich fix. |
| Psalm 92:2-9 | Yes. | page-only metadata stale; rich text normal. This is the pilot/user-reported page-chip class, not part of the "remaining 11" if excluded. | Catalog page 280 (`src/data/loth/psalter-texts.json:3022`); rich page 280 (`src/data/loth/prayers/commons/psalter-texts.rich.json:40261`, `:40273`); W4 page override 506 (`src/data/loth/psalter/week-4.json:1004`, `:1010`). | No current rich fix; visible chip already uses override path. |
| Psalm 8:2-10 | Yes. | page-only metadata stale; rich text normal. | Catalog page 284 (`src/data/loth/psalter-texts.json:3114`); rich page 284 (`src/data/loth/prayers/commons/psalter-texts.rich.json:24456`, `:24504`); W4 page override 509 (`src/data/loth/psalter/week-4.json:1031`, `:1037`). | No user-visible rich fix. |
| Psalm 135:1-12 | Yes. | page-only metadata stale; rich text normal. | Catalog page 386 (`src/data/loth/psalter-texts.json:3915`); rich page 386 (`src/data/loth/prayers/commons/psalter-texts.rich.json:51585`, `:51621`); W4 page override 429 (`src/data/loth/psalter/week-4.json:228`, `:234`). | No user-visible rich fix. |
| Psalm 144:1-10 | Yes. | page-only metadata stale; rich text normal. | Catalog page 446 (`src/data/loth/psalter-texts.json:4264`); rich page 446 (`src/data/loth/prayers/commons/psalter-texts.rich.json:56049`, `:56133`); W4 Thursday override 482 (`src/data/loth/psalter/week-4.json:758`, `:764`). | No user-visible rich fix. |
| Psalm 147:12-20 | Mixed. W2/default uses catalog rich; W4 has `psalmPrayer` override and suppresses rich. | W4 rich text is superseded/suppressed; no rendered stale rich. | Catalog text/page 268 (`src/data/loth/psalter-texts.json:4543`); rich page 268 (`src/data/loth/prayers/commons/psalter-texts.rich.json:59334`, `:59382`); W4 override text+page 493 (`src/data/loth/psalter/week-4.json:867`, `:873`). | No current defect. Optional future occurrence rich for W4 only. |
| Psalm 141:1-9 | Rendered through plain fallback where first-vespers propers reference it; no `psalmPrayerRich` exists. | not stale-rich; missing-rich/catalog-completion backlog. | Plain prayer exists (`src/data/loth/psalter-texts.json:4808`); no rich field at catalog entry (`src/data/loth/prayers/commons/psalter-texts.rich.json:61410`); first-vespers map marks the entry as catalog augmentation/backlog (`parsed_data/first-vespers-versed-map.json:42`). | Not in this stale-rich fix scope; separate first-vespers rich augmentation if desired. |
| Psalm 142:1-7 | Rendered through plain fallback where first-vespers propers reference it; no `psalmPrayerRich` exists. | not stale-rich; missing-rich/catalog-completion backlog. | Plain prayer exists (`src/data/loth/psalter-texts.json:4844`); no rich field at catalog entry (`src/data/loth/prayers/commons/psalter-texts.rich.json:61987`); first-vespers map marks catalog ADD required (`parsed_data/first-vespers-versed-map.json:53`). | Not in this stale-rich fix scope; separate first-vespers rich augmentation if desired. |

## User-Visible Defect Assessment

No currently rendered `psalmPrayerRich` content shows a page-boundary truncation,
noise line, or text typo relative to its own catalog `psalmPrayer`. The in-memory
rebuild found 82/82 builder passes and no stale rebuilt-vs-current rich entries.

For the three text-variant occurrences (`Psalm 110:1-5, 7` W2, `Psalm 100:1-5`
W3, `Psalm 147:12-20` W4), the resolver deliberately suppresses ref-keyed
`psalmPrayerRich` when `entry.psalmPrayer` is set, so users see the correct
plain override rather than stale W1/default rich text
(`src/lib/hours/resolvers/psalm.ts:70`,
`src/lib/hours/resolvers/psalm.ts:72`,
`src/lib/hours/resolvers/psalm.ts:141`,
`src/lib/hours/resolvers/psalm.ts:143`,
`.claude/worktrees/111-dvo-sol/docs/handoff-fx2-phase3-audit-2026-05-08.md:111`,
`.claude/worktrees/111-dvo-sol/docs/handoff-fx2-phase3-audit-2026-05-08.md:121`,
`.claude/worktrees/111-dvo-sol/docs/handoff-fx2-phase3-audit-2026-05-08.md:221`).

For the nine page-only override refs plus Psalm 92, the rich content remains
usable because the text is identical across occurrences; the visible page chip is
not taken from `psalmPrayerRich.page`, so stale internal rich page metadata is not
user-exposed (`src/components/prayer-sections/rich-content.tsx:8`,
`src/components/psalm-block.tsx:304`).

## D2 Fix Scope

There are **no current user-facing rich-content defect refs** to surgically patch
in `src/data/loth/prayers/commons/psalter-texts.rich.json`.

If the product wants rich rendering for the three occurrence-specific plain
overrides, the surgical follow-up is:

1. Build occurrence-keyed `psalmPrayerRich` only for:
   - `week-2 SUN vespers Psalm 110:1-5, 7` page 186.
   - `week-3 FRI lauds Psalm 100:1-5` page 380.
   - `week-4 FRI lauds Psalm 147:12-20` page 493.
2. Add an occurrence-keyed rich lookup, not a ref-only replacement, so W1/default
   occurrences keep their existing catalog rich.
3. Keep the curated principle: do not full-reextract or rewrite unrelated
   `stanzasRich`; patch only the three new occurrence rich overlays.

This is an enhancement, not a defect fix, because the current resolver suppresses
wrong ref-keyed rich on those occurrences.
