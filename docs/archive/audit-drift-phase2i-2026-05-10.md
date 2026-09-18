# Phase 2-I audit — DRIFT 잔여 7 refs / T7 EMPTY / T8 NEW — 2026-05-10

**Audit by**: divine-researcher (Explore profile, read-only) — task #486
**Doc materialized by**: leader
**main HEAD**: 43a47b5 (Phase 2-H + G1.5/1.6/G4 모두 merged)

## TL;DR

DRIFT 7 refs 잔여. **#479 T7 'structural drift' 가설 무효화** (Psalm 51 #483 + Psalm 42/96 본 audit 모두 T2 page-bridge). **T8 NEW (pageMap drift)** 발견 — Psalm 144:11-15.

**Trajectory**: 28 (#448) → 16 (#479) → 7 (현재) → 예상 0-2 (post-2-I)
**Recovery potential**: 5-7 / 7 (거의 100%)

## §1. 재분류 (#479 T1-T7 → T2/T6/T8)

| # | Ref | block | rich/ext | #479 CAT | **재분류** | 증거 |
|---|---|---|---|---|---|---|
| 1 | Ephesians 1:3-10 | b1 | 8/4 | T6 | **T2 variant (page-bridge with reading interleave)** | rich line 1-4 = book 88, line 5-8 = book 89 |
| 2 | Jeremiah 31:10-14 | b1 | 9/3 | T6 | **T6 (genuine long-block)** | book 127 right contiguous |
| 3 | Exodus 15:1-4a, 8-13, 17-18 | b2 | 7/3 | T6 | **T2 page-footer** (#479 misclassified) | book 160→161 break |
| 4 | Psalm 42:2-6 | b3 | 20/1 | T7 | **T2 page-bridge** | book 196→197 break |
| 5 | Psalm 96:1-13 | b0 | 31/4 | T7 | **T2 multi-page-bridge** | book 317→318 break |
| 6 | Jeremiah 14:17-21 | b6 | 4/3 | T2 | **T2 (G4 partial, matcher cross-stanza root cause)** | G4 가 ext 2→3 회복했으나 matcher 한계로 last line 미회수 |
| 7 | Psalm 144:11-15 | b0 | 7/1 | T6 | **T8 NEW pageMap drift** | rich line 1-7 = book **482 right** (현재 pageMap 483 — 오차) |

## §2. 카테고리 summary

| CAT | Refs | Mechanism |
|---|---|---|
| **T2 page-bridge** | **5** (Eph 1, Exod 15, Ps 42, Ps 96, Jer 14) | matcher cross-stanza single fix → 모두 해결 |
| T6 long-block | 1 (Jer 31) | 단일 page 안 발생, 별도 mechanism |
| **T8 NEW pageMap drift** | 1 (Ps 144:11) | #451 mirror pattern |
| ~~T7 structural drift~~ | **0** | 가설 무효화 — #479 의 3 refs 모두 misclassification |

## §3. Jeremiah 14 b6 G4-resistance root cause

가설 a/b/c 모두 ✗. **확정**: G4 (depth-escalate) 가 gather depth 만 증가, matcher behavior unchanged. matcher 의 `alignAtProbe` (`scripts/build-phrases-into-rich.mjs:730`) 가 ONE stanza 내에서만 walk — page-footer 후 다음 stanza 의 wrap-continuation 흡수 불가. G4 = partial enabler, 진정 fix = Phase 2-I1.

## §4. Phase 2-I fix plan

### I1 — Matcher cross-stanza alignment (T2 bulk, 5 refs)
- **Owner**: solver (extends #452/#456 matcher 영역)
- **Effort**: HIGH (~4-6h)
- **Approach**: `alignAtProbe` 확장:
  - 현재: stanza N 내에서만 walk (`stream` flatten 이지만 stanza boundary 무시)
  - 보강: rich line k 가 stanza N 마지막까지 매칭 후, stanza N+1 첫 line(s) 가 mid-sentence continuation OR rich line k+1 와 wrap-merge 가능 → 흡수
  - 안전장치: stanza N+1 가 'I'/'II' Roman / page-header / glory marker 면 skip
- **Recovery**: **4-5 / 5** (Eph 1 partial 가능)

### I2 — pageMap drift fix (T8, 1 ref Ps 144:11-15)
- **Owner**: dev (mirror of #451)
- **Effort**: LOW (~30min)
- **Approach**: psalter rota 의 Ps 144:11-15 page 483 → 482 (실제 PDF 위치)
- **Recovery**: **1 / 1**

### I3 — Jer 31 b1 individual triage (T6, 1 ref)
- **Owner**: member-01 (rich.json) 또는 solver (matcher consume-multi-ext)
- **Effort**: MEDIUM (~2h)
- **Approach**: PDF 4197-4210 (14 lines contiguous) 가 rich 9 phrases 와 wrap-merge 정합 가능한지 spot-check
- **Recovery**: **0-1 / 1**

## §5. Total recovery

**5-7 / 7** (Phase 2-I1+I2+I3 실행 시):
- I1 alone: 4-5 refs
- I2: +1
- I3: +0-1

## §6. Bonus discoveries

1. **T7 retroactively EMPTY**: 시편 본문 통째 단일 block 융합은 데이터 결함이 아니라 matcher stanza-boundary 한계의 표면화.
2. **T8 NEW (pageMap drift) 패턴 재발견**: Psalm 144 시리즈 2건 (1-10 + 11-15). 다른 ref 비슷한 'multi-occurrence + 다른 책쪽' 점검 필요.
3. **F-X11 closure 단계**: I1+I2+I3 완료 시 0-2 DRIFT, 28→0-2 = ~93-100% recovery.
4. **#481 G4 = partial enabler**: depth-escalate 가 stanza 추가 gather → 1 line 일부 회복. 진정 fix = matcher cross-stanza.

## §7. References

- `scripts/dev/process-fx11-phase2-batch.mjs` (DRIFT detection)
- `scripts/build-phrases-into-rich.mjs:730` (alignAtProbe — Phase 2-I1 target)
- `src/data/loth/prayers/commons/psalter-texts.rich.json`
- `parsed_data/full_pdf.txt` (7 ref full spot-check)
- Prior audits: `#454`, `#479`, `#465`, `#475`
- `#481` G4 (partial enabler analysis)
- `#483` (Psalm 51 T7→T2 hypothesis seed)
- `#451` (T8 mirror pattern)
- PDF: Eph 1 (2836-2874, book 88-89), Jer 31 (4185-4210, book 127), Exod 15 (5360-5394, book 160-161), Ps 42 (6585-6627, book 196-197), Ps 96 (10848-10897, book 317-318), Jer 14 (13044-13062, book 379-380), Ps 144:11 (16660-16700, book 482-483)
