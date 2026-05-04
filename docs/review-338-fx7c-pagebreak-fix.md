# Review #338 — #337 F-X7c page-break stanza-drift fix (3 hymns 41/45/111)

**Reviewer**: divine-review (adversarial-reviewer profile)
**Target**: commit 63cac40 (#337 F-X7c, member-01)
**Base**: 4e7c626 (post-#330+331 merge); merge commit f4a2b93b (dispatched base)
**Date**: 2026-05-04
**Verdict**: **APPROVED_WITH_ISSUES**
**Stance consensus**: Claude AGREE / Peer (codex quality_auditor) AGREE — round 1

---

## AC verdict matrix

| AC | Type | Claude | Peer | Final | Evidence |
|---|---|---|---|---|---|
| AC-1 | executable | MET | MET | MET | npm test 47 / 946 pass (matches commit message) |
| AC-2 | executable | MET | MET | MET | tsc --noEmit EXIT=0, 0 errors |
| AC-3 | executable | MET | MET | MET | ESLint 0 errors / 17 warnings (was 16; +1 documented `_drop`) |
| AC-4 | executable | MET | MET | MET | verify-no-page-noise → 0 occurrences (rich + plain) |
| AC-5 | executable | MET | MET | MET | builder OK=122 FAIL=0, idempotent (empty git diff after rerun); total_stanza 552→549 (-3) matches merged 3 |
| AC-6 | executable | MET | MET | MET | verify-phrase-coverage 215 stanzas / 0 violations |
| AC-7 | executable | MET | MET | MET | fix script rerun → 6 NOOP (rich 3 + plain 3), empty git diff |
| AC-8 | structural | MET | MET | MET | All 3 hymn rich.json blocks merged to 4 lines with phrases length 4; ordinarium plain text contiguous (no \n\n gap) |
| AC-9 | semantic | MET | MET | MET | PDF SSOT verbatim match (hymn 41 PDF L30972/30977-30979, hymn 45 L31106-31112, hymn 111 L32481-32487); cohort exhaustive (96 Магтуу page-headers, 93 between-hymn-boundary, 3 mid-stanza fixed) |
| AC-10 | semantic | MET | PARTIALLY_MET | **PARTIALLY_MET** | Defensive guards comprehensive (kind/anchor/line-count + exit 1); off-by-one slice indices correct; AP-1..AP-6 clean. **Idempotence detector is shallow**: only checks head firstLine + total line count + tail-offset firstLine — middle lines not verbatim-checked. **Divider validation only checks `kind`**, not other fields. Practical risk negligible (build pipeline, not adversarial input). |

Final aggregate: **APPROVED_WITH_ISSUES** (1 PARTIALLY_MET, all findings INFO/NIT severity).

---

## Findings

### F-1 (NIT, cosmetic) — Pre-merge indices in reason string
- **File**: `scripts/fix-hymn-pagebreak-stanza-drift.mjs:222`
- **Issue**: `merged blocks ${t.headBlockIdx} (${t.expectedHeadLineCount}L) + ${t.headBlockIdx + 2} (${t.expectedTailLineCount}L) → ${mergedLines.length}L; dropped divider at idx ${t.headBlockIdx + 1}` shows PRE-merge indices, which is correct intent for traceability but a casual reader may expect post-merge indices.
- **Severity**: NIT (cosmetic).

### F-2 (INFO) — Idempotence detector spoofable on middle lines
- **File**: `scripts/fix-hymn-pagebreak-stanza-drift.mjs:133-144` (`isRichTargetAlreadyMerged`)
- **Issue**: Detector verifies head firstLine (line 0) + total line count + tail-offset firstLine (line `expectedHeadLineCount`), but NOT lines 2..N-1 verbatim. A hypothetical corruption that preserves the head/tail anchor texts and total line count but garbles the middle would be silently classified as `already merged` and not re-fixed.
- **Risk**: Practically negligible — build pipeline data is not adversarial; any drift would be caught by `verify-no-page-noise.js` (orthogonal check). Defense-in-depth note only.

### F-3 (INFO) — Divider validation depth
- **File**: `scripts/fix-hymn-pagebreak-stanza-drift.mjs:172-178`
- **Issue**: `divider.kind` is checked but other divider fields (e.g., `lines`, `metadata`) are not validated. If a future divider variant carries semantic data, the script would still merge across it without flagging.
- **Risk**: Theoretical only — current divider blocks are kind-only.

### F-4 (INFO) — PLAIN_TARGETS hard-coded lineIdx
- **File**: `scripts/fix-hymn-pagebreak-stanza-drift.mjs:97-116`
- **Issue**: `lineIdx` values (1, 16, 13) are absolute indices into the `text.split('\n')` array. Any upstream ordinarium edit shifting line counts before the target would surface as a `prev/cur/next` triplet mismatch (errors out, exit 1, non-silent). The `prev`/`next` anchors in error messages mitigate but a maintainer may not immediately realize the assumption.
- **Risk**: Self-defending; surfaces clear error on drift.

### F-5 (INFO) — Cohort sweep methodology
- **File**: `evidence.md` cohort exhaustiveness section
- **Issue**: Secondary sweep used (a) numbered-stanza-single-line check + (b) Магтуу page-header invariant. Hymns whose splits do NOT span numbered-stanza boundaries (e.g., refrain-only blocks) would not appear in (a). However invariant (b) — 96 Магтуу page-headers, all but 3 confirmed between-hymn-boundary, 3 fixed — is the binding ceiling.
- **Mitigation**: 2 false-positive lowercase-divider matches (hymn 1.b4 / 44.b4) are pre-existing F-X3 cross-stanza wraps (per-verse contract handled, documented limitation), out of #337 scope.
- **Severity**: INFO. Cohort closed for F-X7c scope.

---

## Adversarial 6-axis scan

| Axis | Result |
|---|---|
| Edge cases / boundary | `lineText` defends undefined/empty spans; index access guarded by `!head/!divider/!tail` checks |
| Error paths | Pre-mutation guards reject every drift; `process.exit(1)` on any error |
| Off-by-one | `blocks.slice(headBlockIdx + 3)` correctly skips trio; plain `lines.slice(0, lineIdx)` + `lines.slice(lineIdx+1)` removes only empty line |
| Input validation | `kind` check + line-count + anchor-text on each side; div field depth shallow (F-3) |
| Race conditions | N/A (synchronous IO) |
| Resource leaks | readFileSync/writeFileSync, no streams, atomic per-file write |

## Anti-pattern scan (AP-1..AP-6)

| AP | Detection | Result |
|---|---|---|
| AP-1 `d.get(.., True)` | N/A (Node, not Python) — no equivalent default-True patterns | **CLEAN** |
| AP-2 `\|\| true` exit-code swallow | Grep | **CLEAN** |
| AP-3 triple-fallback-PASS | Manual review of every code path | **CLEAN** (all paths return error or exit 1 on any anomaly) |
| AP-4 `else: pass`/`else: ok` | Grep | **CLEAN** |
| AP-5 JSON-valid-only | check after JSON.parse | **CLEAN** (kind/structure validated) |
| AP-6 `not get('error')` proxy | Grep | **CLEAN** |

## PDF SSOT cross-check (AC-9 detail)

| Hymn | PDF lines | Page boundary | Merged result matches PDF |
|---|---|---|---|
| 41 stanza 1 | 30972 (head 1L) → 30977-30979 (tail 3L) | 910→911 +Магтуу | ✓ |
| 45 stanza 3 | 31106-31108 (head 3L) → 31112 (tail 1L) | 914→915 +Магтуу | ✓ |
| 111 stanza 3 | 32481-32482 (head 2L) → 32487-32488 (tail 2L) | 954→955 +Магтуу | ✓ |

All anchor texts verbatim from PDF. No fabrication.

## Recommendations

- **PARTIALLY_MET on AC-10** is INFO-level only (defense-in-depth notes, no functional defect). Acceptable for merge as-is.
- F-1..F-5 may be batched into a future NIT-on-NIT cleanup if accumulating; none are blocking.

## Stance summary

```json
{
  "stance": "APPROVED_WITH_ISSUES",
  "rationale": "All 6 executable AC PASS exactly per commit-message claims. PDF SSOT verbatim verified for all 3 hymns. Cohort exhaustive within F-X7c scope. Fix script defensive guards comprehensive; idempotence verified by NOOP rerun. Two minor depth concerns (idempotence detector middle-line check, divider field validation) are defense-in-depth INFO, not material risks. Anti-pattern scan AP-1..AP-6 clean.",
  "confidence": "HIGH"
}
```
