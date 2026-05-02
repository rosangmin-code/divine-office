# Review #220: #217 F-X1 — Nunc Dimittis 줄바꿈 + seasonal augmentation

> **TL;DR** — APPROVED_WITH_ISSUES. 8개 AC 중 7개 MET, 1개 PARTIALLY_MET (NIT). 795/795 vitest pass, tsc clean, lint 0 errors. 머지 권장.

| 메타 | 값 |
|---|---|
| Reviewer | divine-review (adversarial-reviewer) |
| Author | dev |
| Target branch | `worktree-217-dev` (commits `6870846`, `1de09e2`) |
| Base | `ca009bc` |
| Review session | `adhoc-review-220-217-fx1` |
| Decision | `dec_1` (APPROVED_WITH_ISSUES) |
| Peer | quality_auditor (codex), exchange `ex_20260502T132016Z_b4fe7f19` |
| Final verdict | **APPROVED_WITH_ISSUES** (consensus, round 1) |

---

## 변경 범위 (6 files)

| File | LOC delta | Role |
|---|---|---|
| `src/components/prayer-sections/gospel-canticle-section.tsx` | +12 / -1 | Renderer: inter-block + inter-stanza separator `<span>{' '}</span>` → `<br/>` |
| `src/lib/hours/seasonal-antiphon.ts` | +89 / -3 | NEW `applySeasonalAntiphonRich` (rich-path Easter Alleluia) |
| `src/lib/loth-service.ts` | +24 / -3 | Layer 5 wires rich helper; Layer 8b re-augments plain after Compline merge |
| `src/components/prayer-sections/__tests__/gospel-canticle-section.test.ts` | +43 / -1 | 3 new cases (stanza, multi-block, divider) |
| `src/lib/hours/__tests__/seasonal-antiphon.test.ts` | +127 / -4 | 9 new cases for `applySeasonalAntiphonRich` |
| `src/lib/__tests__/hours/compline.test.ts` | +122 / -0 | 3 L2 cases (Eastertide SAT, ORDINARY_TIME SAT, multi-block end-to-end) |

---

## AC verdict

| AC | Type | Verdict | Evidence |
|---|---|---|---|
| AC-1 | executable | **MET** | `gospel-canticle-section.tsx:78-80` — `if (!firstEmitted) out.push(<br/>)` between non-divider blocks. Test `gospel-canticle-section.test.ts:207-237` (`brCount >= 2` for 3 blocks). |
| AC-2 | executable | **MET** | `gospel-canticle-section.tsx:85-89` — `if (li > 0) out.push(<br/>)` between stanza lines. Test `gospel-canticle-section.test.ts:185-204`. |
| AC-3 | executable | **MET** | `firstEmitted=true` initial guard at `gospel-canticle-section.tsx:67-81` — single-block authoring (the common case) renders unchanged. Test `gospel-canticle-section.test.ts:53-93`. |
| AC-4 | executable | **PARTIALLY_MET** | EASTER gate `seasonal-antiphon.ts:64`, idempotent scan `:69-101`, last-para target `:103-108`, mutation-free `:110-125`. Two NIT-level robustness gaps documented under "Issues" below. |
| AC-5 | executable | **MET** | Layer 5 augments rich at `loth-service.ts:428-433` after Layer 4 rich overlay merge (line 387). Non-Compline (lauds/vespers) flows here once. |
| AC-6 | executable | **MET** | Layer 8b at `loth-service.ts:454-459` re-applies plain `applySeasonalAntiphon` AFTER `mergeComplineDefaults` fills `gospelCanticleAntiphon` from `nuncDimittisAntiphon`. L2 test `compline.test.ts:782-805` verifies Eastertide SAT plain + rich both carry Alleluia. |
| AC-7 | executable | **MET** | Plain `applySeasonalAntiphon:28` and rich `applySeasonalAntiphonRich:64` both `season !== 'EASTER' → return input`. Regression test `compline.test.ts:881-895` (2026-08-29 SAT ORDINARY_TIME — neither plain nor rich AST contains Аллэлуяа). |
| AC-8 | executable | **MET** | Multi-block AST end-to-end L2 at `compline.test.ts:820-878`. Synthesizes 3-block AST (rubric-line + para + para), runs through `assembleCompline`, renders via production `GospelCanticleSection`, asserts `<br/>` between blocks + amber-italic cascade + rubric not-italic + `data-render-mode="rich"`. |

---

## Issues (NIT)

### N-1 — Plain ↔ rich punctuation closure asymmetry (NIT, low impact)
- `applySeasonalAntiphon` (`seasonal-antiphon.ts:33-35`) inserts a closing `.` if the antiphon body lacks a sentence-final punctuation before appending ` Аллэлуяа!`.
- `applySeasonalAntiphonRich` (`seasonal-antiphon.ts:116-122`) does NOT — it appends only `{ kind: 'text', text: ' ' } + { kind: 'rubric', text: 'Аллэлуяа!' }`.
- Effect: a rich antiphon whose last span text is `'Эзэн бол хүч'` (unpunctuated) renders as `Эзэн бол хүч Аллэлуяа!`, while the plain helper would produce `Эзэн бол хүч. Аллэлуяа!`.
- Production impact: LOW — PDF antiphons consistently end with punctuation. Not currently observed in `src/data/loth/psalter/week-*.json`.
- Recommended (optional): mirror the plain `closer` logic on the last text span of the last para before injection.

### N-2 — Idempotent regex `/[Аа]ллэлуяа/` does not catch spelling variant `Аллэлүяа`
- The scan at `seasonal-antiphon.ts:71, 83, 97` matches `Аллэлуяа` (regular `у`).
- Production data audit: antiphon-context Alleluia consistently uses `Аллэлуяа` (psalter, sanctoral, compline overlays). Variant `Аллэлүяа` (Mongolian Cyrillic `ү` between `л` and `я`) appears only in HYMN data (`hymns.json`, `hymns/9.rich.json`), which is not the helper's target.
- Out-of-scope risk: if future antiphon data adopts the `Аллэлүяа` spelling, the helper would double-augment.
- Recommended (defensive): broaden to `/[Аа]ллэл[уү]яа/` for forward-compatibility. Not blocking.

### N-3 — Renderer degenerate cases untested
- Empty-spans para (`{ kind: 'para', spans: [] }`): `firstEmitted` flips to `false` before the inner forEach iterates, so a subsequent block emits a `<br/>` with no preceding visible content. Surface: stray leading break.
- All-divider AST: `out` stays empty, renderer emits only "Шад магтаал: " label + page ref. Defensive but visually sparse.
- These do not appear in production data today; flagged for future hardening.

### Out-of-scope (not a finding)
- `git diff ca009bc..worktree-217-dev` shows `docs/handoff-wi218-fx2-audit.md` as deleted. This is a diff-range artifact — `worktree-217-dev` branched from `3c79873` BEFORE `ca009bc` (which merges in `d6875e2` with the WI-218 audit). Leader's ff-merge into main will preserve the audit doc. Not a real deletion.

---

## Verification evidence

| Gate | Command | Result |
|---|---|---|
| vitest | `vitest run` | **795 passed (43 files), 0 failed** |
| typecheck | `tsc --noEmit` | clean (no output) |
| eslint | `eslint <changed files>` | 0 errors, 1 pre-existing warning (`HOUR_NAMES_MN` unused in `loth-service.ts:10` — predates #217, unrelated) |
| Targeted suites | `vitest run src/lib/hours/__tests__/seasonal-antiphon.test.ts` | 30/30 |
| Targeted suites | `vitest run src/components/prayer-sections/__tests__/gospel-canticle-section.test.ts` | 11/11 |
| Targeted suites | `vitest run src/lib/__tests__/hours/compline.test.ts` | 78/78 |

---

## Recommendation

**APPROVED — merge-ready.** Three NIT-level findings (N-1, N-2, N-3) are robustness suggestions, not defects on production data shapes. They could be folded into a future cleanup pass; none block the F-X1 release. Verdict matches independent peer auditor (`quality_auditor`).
