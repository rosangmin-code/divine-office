> **TL;DR** — #427 F-X11 Phase 2 (124 deferred refs paragraphBoundaries 일괄 inject) data integrity·idempotency·tests 통과, 18 multi-PB refrain stanza 중 2건 (Psalm 80 4-line refrain 중간 분할, Psalm 8 3-line refrain 마지막 줄 누락) visual-layout 회귀 위험 — curator queue 에 surface 되어 있어 BLOCKING 아님. **Status**: APPROVED_WITH_ISSUES (CONDITIONAL). **Risk**: MEDIUM (시각 회귀, 기능 회귀 없음). **Next**: 사용자 모바일 smoke + Phase 2-A curator pass.

# Review #428 — F-X11 Phase 2 (124 deferred refs paragraphBoundaries 일괄 inject)

## Scope

- **Land commit**: `0c1c25e` (Merge 427-member-01) on top of `b0f738c` (#426 follow-up batch).
- **Files**: `scripts/dev/process-fx11-phase2-batch.mjs` (NEW +432) + `src/data/loth/prayers/commons/psalter-texts.rich.json` (DATA +538 -2). 970 line delta total.
- **Inject scope**: 123 refs in scope (124 - Psalm 46:2-12 EXCLUDE_REFS guard); 95 PASS atomic gate → 22 refs gained PB; 28 drift refs preserved without PB; 1 page-missing ref (Psalm 31:1-17) skipped.
- **Reviewer**: divine-review (Owner ≠ Verifier verified — author claimed_by_member member-01).
- **Peer**: codex/quality_auditor (consensus reached round 1, both AGREE on APPROVED_WITH_ISSUES).

## AC Verdicts

| AC | Type | Verdict | Evidence |
|---|---|---|---|
| AC-1 vitest 1045 pass | executable | MET | npm test → 50 files, 1045 tests passed (5.27s). |
| AC-2 data integrity | semantic | MET | Programmatic audit (worktree script): 31 stanza blocks with PB / 80 PB entries / 23 refs with PB / 0 schema or index errors. PB confined to PrayerBlock kind:'stanza'. |
| AC-3 idempotency (Psalm 46) | semantic | MET | Psalm 46:2-12 block 0 [7,9,17,19] preserved bit-for-bit. EXCLUDE_REFS guard verified. |
| AC-4 refrain detection accuracy | semantic | PARTIALLY_MET | M-1: Psalm 80 [6,8,10,19,21,23] 4-line refrain split mid-stream. M-2: Psalm 8 [2,24,26] 3-line opening refrain detected as 2-line. Both flagged in needsReview. |
| AC-5 drift handling | semantic | MET | 3 drift-with-existing refs (Rev 4 / Col 1 / Rev 11) preserve all phrases[]. Psalm 31:1-17 page-missing correctly skipped. |
| AC-6 curator queue | structural | MET | 203 entries / 95 distinct refs (= ALL PASS-set refs flagged for needsReview). Psalm 46 correctly excluded. |
| AC-7 backward-compat | structural | MET | data-only Phase 2; no extractor/builder/renderer code touched. Schema unchanged. |
| AC-8 visual smoke recommendations | semantic | PARTIALLY_MET | Mobile + dark-mode smoke recommended on Daniel 3:52-57, Psalm 67/80, Psalm 136:10-26, Psalm 8 before user release. |

## Findings

### MAJOR
**M-1 (AC-4) — Psalm 80:2-8, 15-20 4-line refrain over-fragmentation** — *severity: major / category: bug*
- File: `src/data/loth/prayers/commons/psalter-texts.rich.json`, key `Psalm 80:2-8, 15-20`, block 0, paragraphBoundaries: `[6,8,10,19,21,23]`
- The 4-line refrain "Түг түмдийн Тэнгэрбурхан / Биднийгээ дахин босгооч / Нүүр царайгаа гэрэлтүүлээч / Тэгвэл бид аврагдана" is detected by `detectRefrains` (extract-phrases-from-pdf.mjs:555) as TWO separate 2-line patterns (lines [6,7]+[19,20] and lines [8,9]+[21,22]). Merged refrainEnterExit produces PBs at lines 8 and 21 — INSIDE the 4-line refrain block. Renderer will insert visual paragraph gap mid-refrain.
- Algorithmic limitation acknowledged in extract-phrases-from-pdf.mjs:581 ("3+-line refrains are also uncommon").
- **Action**: Phase 2-A curator pass (manual PB override `[6, 10, 19, 23]`), or extractor enhancement to merge adjacent 2-line patterns into N-line refrain blocks. Not blocking — curator queue covers it.

**M-2 (AC-4) — Psalm 8:2-10 3-line opening refrain mis-detected** — *severity: major / category: bug*
- File: same; key `Psalm 8:2-10`, block 0, paragraphBoundaries: `[2,24,26]`
- PB at line `[2]` places break BEFORE closing line "Юутай суу алдартай вэ!" (line 2 is the END of opening 3-line refrain `ЭЗЭН, бидний Эзэн! / Таны нэр... / Юутай суу...`). Should be PB at `[3]` (after refrain ends, before body verse).
- Closing refrain at lines 24-26 has same shape — PB at `[24, 26]` similarly mis-cuts.
- Dispatch already flagged `needs_curator`. Curator queue confirms 2 entries.
- **Action**: Curator manual override or extractor 3-line refrain support. Not blocking.

### MINOR
**N-1 (AC-4) — Psalm 136:10-26 heavy fragmentation** — *severity: minor / category: design*
- File: same; key `Psalm 136:10-26`, block 0, paragraphBoundaries: `[1,3,4,6,7,9,10,12,13,15,19,21,26]` (13 PBs / 28 lines).
- Litany pattern "Учир нь Түүний хайр энэрэл мөнхийнх" repeated 14× — exhaustively flagged. Visually heavy. May match PDF litany typesetting but warrants user mobile smoke validation.

**N-2 (AC-4) — Psalm 136:1-9 inconsistent PB density** — *severity: minor / category: design*
- File: same; key `Psalm 136:1-9`, block 0, paragraphBoundaries: `[11,13,14,16]` (4 PBs / 23 lines).
- Same litany pattern as Psalm 136:10-26 but ~4× lower PB density. Suggests heuristic non-determinism on this pattern. Worth cross-checking with extractor unit tests.

**N-3 (AC-8) — Mobile/dark-mode visual smoke evidence absent** — *severity: minor / category: process*
- Phase 2 ships data-only changes affecting rendering; #427 completion did not attach mobile screenshots per project CLAUDE.md "Playwright 만으로 끝내지 말 것" mandate. User must perform manual smoke before release.

### NIT
**I-1 — Curator queue location gitignored** — `.claude/scaffold/phrase-extract-review-queue.json` is gitignored; cross-worktree visibility limited. Reviewer must `cp` from member's worktree (per `feedback_pdf_reference_cp_workaround` memory).

**I-2 — Psalm 31:1-17 missing page** — separate task to track resolution; otherwise this ref will keep being skipped by future Phase 3+ batches.

## Spot-Check Results (refrain detection PDF cross-validation)

| Ref | PB (audit) | Verdict | Notes |
|---|---|---|---|
| Psalm 46:2-12 block 0 | [7,9,17,19] | EXPECTED | #417 hotfix preserved. |
| Psalm 67:2-8 block 0 | [6,8,11,13] | EXPECTED | Clean 2-line refrain × 2. |
| Daniel 3:52-57 multi-block | [2,4]/[1,3]/[1,3]/[2,4]/[2]/[2] | EXPECTED | Antiphonal call/response across blocks. |
| Psalm 32:1-11 block 1 | [5] | EXPECTED | Plausible thought break ("Ухаангүй адуу..."). |
| Psalm 8:2-10 block 0 | [2,24,26] | M-2 | 3-line refrain mis-detection (false-positive). |
| Psalm 80:2-8, 15-20 block 0 | [6,8,10,19,21,23] | M-1 | 4-line refrain split mid-stream. |
| Psalm 136:1-9 block 0 | [11,13,14,16] | N-2 | Under-detection vs counterpart. |
| Psalm 136:10-26 block 0 | [13 entries] | N-1 | Heavy fragmentation. |

## Visual Smoke Recommendations

1. Daniel 3:52-57 (refrain 4×) — mobile paragraph-break rendering (multi-block antiphonal)
2. Psalm 67:2-8 (4 PBs, clean 2-line refrain × 2) — baseline refrain case
3. **Psalm 80:2-8, 15-20** (M-1 — 4-line refrain over-fragmentation) — likely incorrect rendering
4. **Psalm 136:10-26** (N-1 — heavy fragmentation) — verify litany visual
5. **Psalm 8:2-10** (M-2 — known false-positive) — verify mid-refrain split impact
6. iOS Safari + dark mode + Slow 3G (per project CLAUDE.md SW manual checklist)

## Verdict: APPROVED_WITH_ISSUES (CONDITIONAL)

Phase 2 data integrity, idempotency, drift handling, curator queue, backward-compat, and tests all PASS. The 18 refrain-style multi-PB stanzas include 2 known false-positive risks (M-1 Psalm 80, M-2 Psalm 8) and 2 minor concerns (N-1, N-2 Psalm 136). All flagged in needsReview curator queue, so the workflow is sound — but **shipping data with KNOWN incorrect PBs to production puts visual rendering responsibility on the user**.

**Conditions for upgrading to PASS**:
1. User performs mobile smoke test on the 5 spot-check refs above and confirms acceptable visual rendering.
2. M-1 / M-2 are explicitly tracked in a Phase 2-A follow-up (curator-pass or extractor enhancement to handle 4-line/3-line refrains).
3. Sidecar M-1 channel (curator queue regeneration) is documented as the recovery path with a target deadline for Phase 2-A.

**Peer (codex/quality_auditor) consensus**: CONDITIONAL / APPROVED_WITH_ISSUES, confidence HIGH. Phase 2 data-only bar met; M-1/M-2 surfaced via curator queue but require mobile-smoke follow-up.

## Test evidence

```
npm test (vitest run) — divine-office@0.1.0
50 files passed, 1045 tests passed (5.27s)
Pre-#427 baseline (post-#426): 1031 tests
+14 from build-phrases-into-rich.test.mjs (M-2 length-mismatch additions)
```

## Files reviewed

- `scripts/dev/process-fx11-phase2-batch.mjs` (NEW, +432, dev-time only)
- `src/data/loth/prayers/commons/psalter-texts.rich.json` (DATA, +538 -2)
- `scripts/parsers/extract-phrases-from-pdf.mjs` (REF, no change — heuristic source)
- `.claude/scaffold/phrase-extract-review-queue.json` (REF, regenerated by builder; cp from 427-member-01 worktree)
- `parsed_data/full_pdf.txt` (REF, PDF cross-check; cp from main checkout)
