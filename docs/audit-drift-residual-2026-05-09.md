# DRIFT 잔여 20 refs post-#452 재분류 audit — 2026-05-09

**Audit by**: divine-researcher (Explore profile, read-only) — task #454
**Doc materialized by**: leader
**main HEAD**: 65fbf8a (#452 WI-A2 merged)

## TL;DR

DRIFT 28 → 20 (post-#449/450/451/452). NO_MATCH 4 → 0 (#452 matcher fix 가 모두 회복). 잔여 20 refs LINE_COUNT-only.

**4-카테고리 재분류** (mechanism-driven):
- **CAT-A1** Cross-column wrap residual (8) — bulk via matcher WI-A2-2 reverse direction
- **CAT-A2** Refrain-interpolation canticle (2) — bulk via refrain-aware matcher OR extractor handler
- **CAT-B** Long-block multi-fragment (7) — individual triage per ref
- **CAT-C** Concatenated rich block (3) — DEFER candidate (structural drift, user impact 미미)

**Total recovery potential**: 13-17 / 20.

## §1. Categorization (mechanism-driven)

| CAT | Mechanism | Refs | Bulk vs Individual |
|---|---|---|---|
| A1 | extractor over-merge by trailing punctuation; rich phrase-split vs ext wrap-merged | 8 | **Bulk** (matcher WI-A2-2) |
| A2 | refrain-interpolation canticle (R-9.A); ext 비-interleave vs rich (verse+refrain)*N | 2 | **Bulk** (refrain-aware matcher OR extractor handler) |
| B | long-block multi-fragment (rich 7-24 phrases, ext 3-13 lines, gap 4-11) | 7 | Individual triage |
| C | concatenated rich block (ext=1 또는 ≤rich/5; structural drift) | 3 | DEFER |

## §2. 20 refs full list (rich/ext/gap)

| # | ref | block | rich | ext | gap | CAT | WI-E |
|---|---|---|---|---|---|---|---|
| 1 | Daniel 3:57-88, 56 | 8 | 6 | 1 | 5 | A2 | |
| 2 | Ephesians 1:3-10 | 1 | 8 | 4 | 4 | B | |
| 3 | Revelation 4:11; 5:9-10, 12 | 1 | 16 | 15 | 1 | A1 | ✓ |
| 4 | Colossians 1:12-20 | 5 | 8 | 3 | 5 | B | |
| 5 | Jeremiah 31:10-14 | 1 | 9 | 3 | 6 | B | |
| 6 | Revelation 11:17-18; 12:10b-12a | 0 | 24 | 13 | 11 | B | |
| 7 | Psalm 51:3-19 | 2 | 8 | 1 | 7 | C | |
| 8 | Exodus 15:1-4a, 8-13, 17-18 | 2 | 7 | 3 | 4 | B | |
| 9 | Psalm 118:1-16 | 3 | 2 | 1 | 1 | A1 | ✓ |
| 10 | Psalm 42:2-6 | 3 | 20 | 1 | 19 | C | |
| 11 | Isaiah 38:10-14, 17-20 | 8 | 4 | 2 | 2 | A1 | ✓ |
| 12 | Psalm 65:2-9 | 0 | 10 | 3 | 7 | B | |
| 13 | 1 Samuel 2:1-10 | 2 | 4 | 3 | 1 | A1 | ✓ |
| 14 | Psalm 96:1-13 | 0 | 31 | 4 | 27 | C | |
| 15 | Isaiah 33:13-16 | 2 | 7 | 5 | 2 | A1 | ✓ |
| 16 | Jeremiah 14:17-21 | 2 | 4 | 3 | 1 | A1 | ✓ |
| 17 | Psalm 135:1-12 | 3 | 7 | 5 | 2 | A1 | ✓ |
| 18 | Wisdom 9:1-6, 9-11 | 2 | 4 | 3 | 1 | A1 | (누락) |
| 19 | Daniel 3:26-27, 29, 34-41 | 7 | 5 | 3 | 2 | A2 | ✓ |
| 20 | Psalm 144:11-15 | 0 | 7 | 1 | 6 | B | |

**Cohort 동기화**: WI-E original 8건 + Wisdom 9:1-6 b2 누락분 = CAT-A1 9 refs cluster. (#454 doc 본문에선 8 refs 로 분류 — Wisdom 9:1-6 b2 추가 처리하면 9 refs 통합 처리)

## §3. PDF spot-check (7 refs)

- **Psalm 118:1-16 b3** (gap=1, A1): PDF 5954-5955 verbatim 2 lines '...сайн,' / 'Түүний хайр энэрэл мөнхийнх юм.' 페이지 브레이크(178/2 дугаар долоо хоног) 직후. extractor trailing-comma wrap-merge → ext=1.
- **Psalm 42:2-6 b3** (gap=19, C): rich block 3 = 20 phrase-units (R-8 split). PDF 6594-6614 (21 lines, 단일 stanza). extractor page-break fragmentation OR column-aware 1-line.
- **Psalm 96:1-13 b0** (gap=27, C): rich.json 본문 1-13절 통째 = 31 phrase-units in 1 stanza. PDF multi-stanza split → ext 4-line 첫 stanza 만. **structural drift**.
- **Wisdom 9:1-6 b2** (gap=1, A1): mid-canticle wrap-pair 1건. WI-E 동 mechanism 누락분.
- **Daniel 3:57-88 b8** (gap=5, A2): rich block 8 = (verse + refrain 'Эзэнийг магтагтун.')*3 = 6 lines. extractor refrain interleave 안 함 → 첫 verse 1 line.
- **Daniel 3:26-27 b7** (gap=2, A2): 동 refrain pattern, 더 짧음.
- **Revelation 4:11 b1** (gap=1, A1): 16-phrase block. WI-A2 가 15 ext 회복, 1 wrap-pair 잔여.

## §4. Reconcile priority

### CAT-A1 (highest ROI) — matcher WI-A2-2 reverse direction
**Scope**: scripts/build-phrases-into-rich.mjs alignAtProbe 의 reverse case — rich line N 이 ext line N 보다 짧고 rich[N+1] 이 wrap continuation 일 때 rich[N] + rich[N+1] concat 으로 ext 와 비교.
**Expected recovery**: 6-8/8 (Wisdom 9 포함 시 7-9/9).
**Owner**: dev 또는 solver.
**Effort**: MEDIUM (~2-3h, WI-A2 mirror 작업).

### CAT-A2 — refrain-aware matcher OR extractor refrain handler
**Scope**: rich block 의 role:'refrain' line 을 ext 비교 시 normalize (skip refrain count) OR extractor 가 refrain interpolation 인식.
**Expected recovery**: 2/2.
**Owner**: solver (extractor 영역 더 익숙).
**Effort**: MEDIUM (~2-3h).

### CAT-B — Individual triage
**Scope**: 7 refs 의 PDF 실제 stanza break 유무 ref-by-ref 확인. rich split (member-01) 또는 matcher consume-multi-ext mode (solver).
**Expected recovery**: 5-7/7.
**Effort**: HIGH (~4-6h, 7 refs * 1h).

### CAT-C (DEFER)
**Scope**: Psalm 51:3-19 b2, Psalm 42:2-6 b3, Psalm 96:1-13 b0.
**Reason**: rich.json structural drift — 시편 본문 통째 단일 block 융합. PB inject 가 유일 차단 산출물, render 정상, 사용자 영향 미미. 효용-비용 비합리.
**Recovery if pursued**: 2-3/3.

## §5. References

- `scripts/dev/process-fx11-phase2-batch.mjs` — DRIFT detection runner
- `src/data/loth/prayers/commons/psalter-texts.rich.json` — rich content SSOT
- `parsed_data/full_pdf.txt` — PDF verbatim
- `scripts/parsers/extract-phrases-from-pdf.mjs` — extractor
- `scripts/build-phrases-into-rich.mjs` — matcher (post-#452 wrap-tolerant)
- `docs/audit-drift-refs-2026-05-09.md` — #448 original 28 refs categorize
- PDF spot-check: Psalm 118 5954-5955 / Psalm 42 6594-6614 / Wisdom 9 13558 / Daniel 3:57-88 area
