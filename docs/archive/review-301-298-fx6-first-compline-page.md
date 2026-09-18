# Review #301 — F-X6 First Compline psalm/antiphon page 512 fix (#298)

> **TL;DR** — APPROVED_WITH_ISSUES. Narrow page-badge fix (1 line: 517→512) verified correct against PDF + psalter-headers + tests (912/912 PASS, lint+tsc clean). 2 findings — 1 MAJOR (content/page semantic mismatch — pre-existing, may be intentional LOTH option-B; needs liturgical decision), 1 MINOR (tests don't pin ref/antiphon). Merge 9e47e44 stands; F-1 raises a follow-up question for team-lead/user.

| Field | Value |
|---|---|
| **Author** | dev |
| **Reviewer** | divine-review |
| **Subject** | merge 9e47e44 (worktree 2932647 onto eb9fcf2) — task #298 |
| **Verdict** | **APPROVED_WITH_ISSUES** |
| **Stance** | AGREE (Claude + Peer both AGREE; peer raised NEED_USER signal on AC-11 specifically) |
| **Rounds** | 1 |
| **Confidence** | HIGH (executable AC), MEDIUM (semantic AC-11 — needs liturgical input) |
| **Peer** | codex / quality_auditor (provider_session_id: `019dee9b-d905-77a1-9745-55da1db7c46a`) |

---

## 1. AC Verdict Matrix

| AC | Type | Criterion | Verdict | Evidence |
|---|---|---|---|---|
| AC-1 | executable | npm test ≥912 PASS | **MET** | 46 files / 912/912 PASS / Duration 5.73s / 0 fail |
| AC-2 | executable | lint 0 errors + tsc clean | **MET** | ESLint 0 errors / 16 warnings (pre-existing). tsc: No errors |
| AC-3 | structural | 1-line data fix at compline.json days.SAT.psalms[0].page 517→512 | **MET** | git diff confirms exactly 1 insertion + 1 deletion at line 150 |
| AC-4 | structural | PDF anchor verbatim p.512 + p.517 | **MET** | parsed_data/full_pdf.txt:17724 (p.512 = 1 ДҮГЭЭР…/Psalm 4) + 17894 (p.517 = 2 ДУГААР…/Psalm 91) — verbatim match |
| AC-5 | structural | psalter-headers cross-ref Psalm 4→p.512 / Psalm 91→p.517 | **MET** | psalter-headers.rich.json refs."Psalm 4"[0].page=512, refs."Psalm 91"[0].page=517 |
| AC-6 | executable | seasonal propers no orphan compline page fields | **MET** | grep across sanctoral/movable/propers JSON: 0 matches for compline/firstCompline |
| AC-7 | structural | regression test design positive + negative + field-level | **MET** | route.test.ts:109-128 — `toBe(512)` + `toBe(517)` exact match, both with date 2026-06-14 |
| AC-8 | executable | targeted test 1 (firstCompline→512) PASS | **MET** | npx vitest -t passes; 2 PASS / 0 FAIL |
| AC-9 | executable | targeted test 2 (compline→517 regression) PASS | **MET** | (same run, both new tests PASS) |
| AC-10 | structural | traceability-matrix FR-NEW row updated | **MET** | +1 -1; appended #298 sub-section preserving prior #245/#240/Phase A+B narrative |
| AC-11 | semantic | content/page consistency for SAT firstCompline + blessing.page | **PARTIALLY_MET** | blessing.page=517 is Second Compline only (untouched, OK). BUT days.SAT.psalms[0] still has ref=Psalm 91 + Sun II antiphon, while page=512 (PDF p.512 = Psalm 4 / Sun I). User opens p.512 in PDF → sees different content than app renders. (See F-1.) |
| AC-12 | semantic | SW CACHE_VERSION bump justification | **MET** | sw.js network-only navigation + no API JSON caching + content-hashed JS bundles; CLAUDE.md rubric: bump only on path/asset/SW logic changes — none triggered |

**Tally**: 11 MET / 1 PARTIALLY_MET / 0 NOT_MET → APPROVED_WITH_ISSUES.

## 2. Findings

### F-1 — Content/page semantic mismatch (MAJOR / bug — pre-existing, may be intentional)

**File**: `src/data/loth/ordinarium/compline.json:142-151`

After #298 fix, `days.SAT.psalms[0]` has:
```json
{
  "ref": "Psalm 91:1-16",
  "default_antiphon": "Тэнгэрбурханы жигүүр дор унтаж байхдаа би шөнийн аймшгаас эс айна.",
  "page": 512  ← FIXED (was 517)
}
```

But PDF p.512 = **First Compline section** = "Шад дуулал 1 Намайгаа өршөөн залбирал…" antiphon + Psalm 4 (canonical Sun I content per Roman LOTH).

PDF p.517 = **Second Compline section** = "Шад дуулал 1 Тэнгэрбурханы жигүүр дор…" antiphon + Psalm 91 (canonical Sun II content).

The data-stored ref (`Psalm 91`) and antiphon ("Тэнгэрбурханы жигүүр…") match PDF p.517 (Second Compline). After the fix, the page badge points to PDF p.512 (First Compline section header) but the rendered psalm + antiphon are Second Compline content.

**Effect on user**: opens page-badge "p.512" in printed PDF → sees Psalm 4 / "Намайгаа өршөөн" — different antiphon/psalm from what the app renders.

**Pre-existing nature**: This is NOT introduced by #298. Before the fix, the inconsistency was hidden because page=517 matched the rendered content (Psalm 91 / Sun II — both at PDF p.517). The user reported the page badge issue (#230 F-X5 exposed Saturday-eve content as `firstCompline` URL surface, where the Sun II content + Sun II page felt incorrect for "First Compline"). #298 narrowly addresses the page-badge alignment to "First Compline section header". It does NOT decide what content should render.

**Two possible interpretations**:
1. **Bug remaining**: data should use Psalm 4 + "Намайгаа өршөөн" antiphon for SAT slot to match PDF p.512.
2. **Intentional LOTH option-B**: Roman LOTH allows "Psalm 91 in place of Psalm 4 + 134" as alternate for First Compline; data reflects the alternate practice; page badge points to section header.

**Recommendation**: Team-lead / user decision needed:
- If interpretation 1 → follow-up ticket to update `ref` to `"Psalm 4:2-9"` (or whatever is canonical) + change `default_antiphon` to "Намайгаа өршөөн залбирал юуг минь сонсооч." per PDF p.512.
- If interpretation 2 → document the intentional option-B substitution in compline.json header comment + add a regression test pinning the existing ref/antiphon.

Severity: **MAJOR** (peer's classification, adopted) — content/page disagreement is user-visible if user uses both app and printed PDF.

Scope: **OUT OF F-X6** — F-X6 is the page-badge fix only. F-1 is a separate ticket candidate.

### F-2 — Tests don't pin ref / default_antiphon (MINOR / test)

**File**: `src/app/api/loth/[date]/[hour]/__tests__/route.test.ts:109-128`

The 2 new tests assert `psalmody.psalms[0].page === 512` (and 517 for the regression guard) but do NOT assert:
- `psalms[0].ref` (could be "Psalm 4" or "Psalm 91" — currently Psalm 91)
- `psalms[0].default_antiphon` (could be Sun I or Sun II text)

If F-1 is resolved (either way), regression tests pinning ref + antiphon would catch future drift.

**Recommendation**: when F-1 decision lands, add `expect(psalmody!.psalms![0].ref).toBe(...)` and `expect(psalmody!.psalms![0].default_antiphon).toContain(...)` assertions.

Severity: **minor** — current tests adequate for the page-only fix; tightening is a follow-up.

## 3. Behavioral Coverage Audit

The 2 new tests:

| Test | Positive? | Negative? | Field-level? | Verdict |
|---|---|---|---|---|
| firstCompline psalm carries page 512 (line 109-118) | ✓ (page=512 expected) | ✓ (status 200, psalmody existence + length>0 guards) | ✓ (`.page` field exact match `toBe(512)`) | **ADEQUATE** |
| compline (Second Compline) psalm carries page 517 (line 120-128) | ✓ (page=517 stable) | ✓ (regression guard against accidental Second Compline tweak) | ✓ (`.page` exact match `toBe(517)`) | **ADEQUATE** |

**ADEQUATE rate**: 2/2 = 100% (target: ≥90%).

No anti-patterns (AP-1..AP-6) detected. Both tests use exact-match `toBe` on specific field values.

## 4. Recommendation

**APPROVED_WITH_ISSUES** — merge 9e47e44 stands. The narrow user-reported page-badge bug is correctly fixed and well-tested.

Follow-ups (non-blocking):

1. **F-1** (MAJOR): liturgical decision on Saturday-eve First Compline content — Psalm 4 (canonical Sun I per PDF p.512) vs Psalm 91 (option-B substitution, currently in data). Either correct data → Psalm 4 OR document option-B intent.
2. **F-2** (MINOR): when F-1 decision lands, add ref + antiphon assertions to the regression tests.

## 5. Pre-supplied Evidence

- AC registry: `.claude/pair-working/sessions/adhoc-review-301-divinerev/transfer/goal-ac-registry.md` (sha256: 81e0a324a2564abd)
- Evidence file: `.claude/pair-working/sessions/adhoc-review-301-divinerev/transfer/evidence-tests.md` (sha256: 6c6b8825b9734c00)
- Peer exchange r1: `ex_20260503T161123Z_22c3fcfb` (proxy_exec request)
- Peer exchange r2: `ex_20260503T161231Z_146feb8e` (verdict)
- PDF source-of-truth: `parsed_data/full_pdf.txt:17724-17910` (p.512-p.517 verbatim)
