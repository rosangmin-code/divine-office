# Phase 2-G audit — DRIFT 잔여 16 refs / 7 카테고리 / fix plan — 2026-05-10

**Audit by**: divine-researcher (Explore profile, read-only) — task #479
**Doc materialized by**: leader
**main HEAD**: 3e93da2 (Phase 2-F merged + v15 conflict resolved)

## TL;DR

Phase 2-B dryrun re-run on main HEAD 3e93da2:
- **DRIFT_LINE_COUNT: 16** (post Phase 2-A→2-F + #472/473/476)
- **DRIFT_NO_MATCH: 0** (#456 reverse-bridge 모두 회복 — 재확인 완료)
- **Aggregate atomic gate: PASS** (108 PASS refs 정상)

**Trajectory**: 28 (#448) → 20 (#454) → 16 (현재) → 예상 3-5 (post-G1~G5)
**Recovery potential**: 11-13 / 16 (G1+G2+G3+G4+G5 실행 시), CAT-T7 3건 DEFER

## §1. Dispatch 가설 정정

#472 (Phase 2-E) dispatch 가 Wisdom 9 b3 + Psalm 135 b5 를 page-footer artifact 로 분류했으나 spot-check 결과 **typography drift** 였음:

| Ref | dispatch 가설 | 실제 mechanism | 증거 |
|---|---|---|---|
| Wisdom 9:1-6 b3 | page-footer | **typography drift (2 typos)** | PDF 13562-13568 한 page 내, no break |
| Psalm 135:1-12 b5 | page-footer | **typography drift (2 typos)** | PDF 13256-13262 한 page left column 내 |

## §2. 7-카테고리 재분류 (16 refs)

| CAT | Mechanism | Refs | Bulk vs Individual | Priority |
|---|---|---|---|---|
| **T1** | Typography drift (Phase 2-E unmasked typos) | 2 / 4 typos | **Bulk** | G1 (LOW, ROI★★★) |
| **T2** | Page-footer-bridge (cross-stanza page break) | 2 | **Bulk** | G2 (MEDIUM, ROI★★) |
| **T3** | Refrain interpolation + page-break (Daniel 3) | 2 | Bulk | G3 (HIGH, ROI★) |
| **T4** | Cross-column wrap residual (Isaiah 38 b8) | 1 | Individual | G5 (MEDIUM, ROI★) |
| **T5** | Depth-progression (script bug) | 1 | Individual | G4 (LOW, ROI★★★) |
| **T6** | Long-block multi-fragment | 5 | Individual triage | G6 (HIGH, ROI variable) |
| **T7** | Structural drift (rich block 융합) | 3 | **DEFER** | G7 (impact 미미) |

## §3. Per-ref full list

### CAT-T1 (2 refs / 4 typos) — Bulk fix candidate

1. **Wisdom 9:1-6, 9-11 b3**:
   - Line 3: rich `Таны` → PDF `Таныг` (accusative -г 누락)
   - Line 5: rich `таалагмжтай` → PDF `тааламжтай` (자모 metathesis)
2. **Psalm 135:1-12 b5**:
   - Line 2: rich `Хүний хүүхдээс,` → PDF `Хүний хүүхэд,` (어간 다름)
   - Line 7: rich `түшмэдэд илгээсэн` → PDF `түшмэд дээр илгээсэн` (case marker 다름)

### CAT-T2 (2 refs) — page-footer-bridge

3. **1 Samuel 2:1-10 b5**: page 229→230→231 break
4. **Jeremiah 14:17-21 b6**: page 379→380 break

### CAT-T3 (2 refs) — refrain + page-break

5. **Daniel 3:57-88, 56 b8**: rich=6 ext=1, refrain pattern + page 62 break
6. **Daniel 3:26-27, 29, 34-41 b7**: rich=5 ext=3, refrain pattern (less severe)

### CAT-T4 (1 ref) — cross-column wrap residual

7. **Isaiah 38:10-14, 17-20 b8**: rich=4 ext=2, #456 reverse-bridge unresolved

### CAT-T5 (1 ref) — depth-progression script bug

8. **Psalm 118:1-16 b3**: rich=2 ext=1, depth=2 isolated PASS / depth=1 batch break

### CAT-T6 (5 refs) — long-block multi-fragment

9. Ephesians 1:3-10 b1 (rich=8 ext=4)
10. Colossians 1:12-20 b5 (rich=8 ext=3)
11. Jeremiah 31:10-14 b1 (rich=9 ext=3)
12. Exodus 15:1-4a, 8-13, 17-18 b2 (rich=7 ext=3)
13. Psalm 144:11-15 b0 (rich=7 ext=1)

### CAT-T7 (3 refs) — DEFER (structural drift)

14. Psalm 51:3-19 b2 (rich=8 ext=1)
15. Psalm 42:2-6 b3 (rich=20 ext=1)
16. Psalm 96:1-13 b0 (rich=31 ext=4)

## §4. Phase 2-G fix plan (ROI 순)

### G1 — CAT-T1 typo fix (4 typos / 2 refs)
- **Owner**: dev (Phase 2-E pattern)
- **Effort**: LOW (~30min)
- **Approach**: rich.json 직접 정정 + post-verifier (Phase 2-E 재사용)
- **Recovery**: 2/2
- **Note**: Phase 2-E 가 b2/b3 typo fix 후 b5/b6 의 NEW typos unmasked. **post-G1 dryrun mandatory** (또 unmask 가능).

### G2 — CAT-T2 page-footer-bridge (2 refs)
- **Owner**: solver (extractor) 또는 dev (matcher)
- **Effort**: MEDIUM (~3h)
- **Two options**:
  - **Option A (extractor recommended)**: stripPageHeadersFromStanzas + 인접 stanza merge — stanza N mid-sentence 종결 + N+1 lowercase/continuation 시작 + 사이 page-footer 패턴(blank+page#+header) → merge
  - **Option B (matcher)**: alignAtProbe stanza-cross extension
- **Recovery**: 2/2
- **권고**: Option A (root-cause)

### G3 — CAT-T3 refrain-aware + page-break (2 refs Daniel 3)
- **Owner**: solver
- **Effort**: HIGH (~4h)
- **Approach**: Phase 2-A detectRefrains 일반화 (#435) + page-break tolerant
- **Recovery**: 2/2

### G4 — CAT-T5 depth-progression (1 ref Psalm 118)
- **Owner**: solver
- **Effort**: LOW (~1h)
- **Approach**: process-fx11-phase2-batch.mjs MULTI_PAGE_DEPTH default 4 → escalate 자동화 (depth=1 fail → depth=2 retry)
- **Recovery**: 1/1

### G5 — CAT-T4 Isaiah 38 b8 individual (1 ref)
- **Owner**: solver 또는 member-01
- **Effort**: MEDIUM (~2h)
- **Approach**: rich.json 수동 phrase split OR matcher 추가 보강 — case-by-case
- **Recovery**: 1/1

### G6 — CAT-T6 long-block triage (5 refs) [낮은 우선순위]
- **Owner**: member-01 + solver
- **Effort**: HIGH (~5h, 5 refs × 1h)
- **Recovery**: 3-5/5

### G7 (DEFER) — CAT-T7 structural drift (3 refs)
- **Reason**: rich.json 본문 통째 단일 block 융합. PB inject 만 차단, render 정상, 사용자 impact 미미.
- **Recovery**: 0 (의도적 보류)

## §5. Member matching

| Member | Phase | Effort |
|---|---|---|
| dev | G1 (typo fix) | LOW ~30min |
| solver | G2/G3/G4 (extractor/matcher) | LOW-HIGH |
| member-01 | G5/G6 (rich.json data) | MEDIUM-HIGH |
| divine-researcher (next) | post-G1 dryrun audit (unmask 검증) | LOW |

## §6. References

- `scripts/dev/process-fx11-phase2-batch.mjs` (DRIFT detection)
- `scripts/build-phrases-into-rich.mjs` (matcher alignAtProbe)
- `scripts/parsers/extract-phrases-from-pdf.mjs` (extractor)
- `src/data/loth/prayers/commons/psalter-texts.rich.json` (rich SSOT)
- `parsed_data/full_pdf.txt` (PDF verbatim)
- PDF spot-check: 1 Sam 2 (7795-7820), Jeremiah 14 (13044-13070), Wisdom 9 (13554-13585), Psalm 135 (13205-13280), Psalm 144:11-15 (15400-15420), Daniel 3:57-88 (1924-1948)
- Prior audits: `docs/audit-drift-refs-2026-05-09.md` (#448), `docs/audit-drift-residual-2026-05-09.md` (#454), `docs/audit-typo-drift-2026-05-10.md` (#465), `docs/audit-indent-mismatch-2026-05-10.md` (#475)
