# Curator Review Queue 206 audit — 2026-05-09

**Audit by**: divine-researcher (Explore profile, read-only) — task #446
**Doc materialized by**: leader (divine-researcher write 불가)
**main HEAD**: 5fadb22 (#445 NIT batch merged + pushed)

## TL;DR

Queue 206 entries / 96 distinct refs ≈ 2.15 entries/ref. **Re-framing: the queue is mostly SCAN BYPRODUCTS of the multi-page gather**, not actually-injected stanzas needing curator review. Each entry = ONE column-window the extractor walked during `MULTI_PAGE_DEPTH=4` page gather; only the WINNING column (line-count match to rich.json) drove the actual paragraphBoundaries inject.

**35-40% (~70-80) entries are header/section/page-title artifacts** (page titles, prayer names, doxology, Roman numerals, week/season headers). Among the body-content remainder (~125-135), most are also scan-noise from non-matching columns — the actionable subset that genuinely affects rich.json data is likely **< 20 entries**.

**Bulk-hotfix candidate**: a one-line filter in `collectReviewQueue` (`scripts/build-phrases-into-rich.mjs:448`) skipping stanzas whose `firstLine` matches the header pattern + dedupe on (firstLine, lineCount) would cut queue noise ~50% with **zero rich.json impact**.

---

## §1. Queue mechanism

Each queue entry has `ref` + `stanzaIndex: 0` + `firstLine` + `lineCount` (24-30, mostly column-height).

**Mechanism** (verified):
1. `processOne` tries `depth = 0..4` → `gatherStanzas` walks `bookPage..bookPage+1+depth` pages
2. Each page → `runExtractor` returns column-aware paragraph stanzas; flattened across pages
3. Each batch stanza runs Stage 1 (visual indent) + Stage 2 (sentence-end + capital-start)
4. `needsReview = true` when Stage 1 ≠ Stage 2 → push to queue **regardless** of inject
5. `injectPhrasesIntoRichData` matches by line-count equality. Only matching stanzas drive inject.

**Implication**: Multi-page gather scans 2-5 columns per ref; ALL needsReview-flagged stanzas land in queue. The MAJORITY correspond to columns the extractor scanned but did NOT use (line-count mismatch).

## §2. Pattern categorization

| Category | Count | Verdict | Action |
|---|---|---|---|
| A. Page-title (`Дуулал N`) | 14 | SCAN-NOISE | BULK filter |
| B. Book-section (`Магтаал\t...`) | 5 | SCAN-NOISE | BULK filter |
| C. Doxology firstLine | 7 | SCAN-NOISE | BULK filter |
| D. Day/season/page header | ~38 | SCAN-NOISE | BULK filter |
| E. Cross-ref firstLine duplicate | ~50 (overlaps A-D) | SCAN-NOISE | BULK dedupe |
| F-noise. Body content, no match | ~110-120 | SCAN-NOISE | DEFER |
| F-actionable. Body content, matching | ~10-20 | needs check | INDIVIDUAL audit |
| (Out of queue) DRIFT_LINE_COUNT | 28 refs | rich.json drift | SEPARATE task |
| (Out of queue) Psalm 31:1-17 page-missing | 1 ref | page mapping | SEPARATE task |

## §3. PDF spot-check (12/12 confirmed SCAN-NOISE)

| # | ref | firstLine | Cat | PDF verdict |
|---|---|---|---|---|
| 1 | Psalm 80:2-8, 15-20 | "Дуулал 80" | A | PDF p246 line 8337 = title; SCAN-NOISE |
| 2 | Psalm 80:2-8, 15-20 | "Эзэн минь ээ," | F | column-window non-match |
| 3 | Psalm 24:1-10 | "Дуулал 24" | A | PDF p92 line 969 = title; lineCount 27 ≠ 20/13 |
| 4 | Psalm 24:1-10 | "Таны царайг..." | F | body fragment, no match |
| 5 | Psalm 11:1-7 | "Оройн даатгал залбирал" | D | p39 procedural intro |
| 6 | Tobit 13:1-8 | "Магтаал\t\t..." | B | column-aligned header |
| 7 | Psalm 149:1-9 | "Эцэг, Хүү, Ариун Сүнсэнд..." | C | doxology |
| 8 | Psalm 136:1-9 | "I" | D | Roman numeral divider |
| 9 | Psalm 113:1-9 | "3 ДУГААР ДОЛОО ХОНОГ" | D | week-3 header |
| 10 | Psalm 122:1-9 | "Бямба гарагийн орой" | D | Saturday-evening |
| 11 | Psalm 80 | "Үндэстнүүдийг хөөгөөд," | F | mid-stream window |
| 12 | Psalm 142:1-7 | "Шүүгчид нь хадны..." | E | dup with Psalm 141 |

**Critical finding**: Psalm 24:1-10 의 injected block-1 PB `[2,5,8,11]` (Phase 2-A 새 3-line refrain detection) 은 13-line stanza 에서 inject. 이 stanza 의 needsReview 는 likely false (Stage 1+2 agreed). Queue 의 두 Psalm 24 entries (lineCount 27/24) 는 **inject 와 무관**.

## §4. 처리 권고

### Option Bulk-hotfix (즉시 가능, RECOMMENDED)
**작업**: `collectReviewQueue` 에 header filter + dedupe 추가 (`scripts/build-phrases-into-rich.mjs:448`).
**Filter**:
```js
function isHeaderArtifact(firstLine) {
  return /^(Дуулал \d+|Магтаал[\t ]|Эцэг, Хүү, Ариун Сүнсэнд|Оройн даатгал залбирал|Дууллын залбирал|Шад (дуулал|магтаал)|Бямба|[1-4] ДУГААР ДОЛОО ХОНОГ|Ариун долоо хоног|Амилалтын улирал|Дөчин хоногийн|12 сарын \d|I{1,2}$)/.test(firstLine.trim());
}
// + dedupe on (firstLine, lineCount) within batch
```
**효과**: 206 → ~50-80 entries (60-75% 감소). zero rich.json impact.
**Effort**: 1 LOW WI (~1h: filter + unit test + queue regen).

### Option Individual-audit (Bulk 후, 권고)
**Scope**: `lineCount` 가 rich.json block 에 매치 가능한 ~10-20 actionable F-subset.
**Effort**: 1 MEDIUM WI (~2-3h: per-entry matcher + spot-check).

### 별 task — DRIFT_LINE_COUNT (28 refs)
24 DRIFT_LINE_COUNT + 4 DRIFT_NO_MATCH. rich.json `lines[]` 가 PDF re-read 와 drift. PB inject skipped.
**Effort**: 1 HIGH WI.

### 별 task — Psalm 31:1-17 (1 ref)
pageMap 에 페이지 미해결.
**Effort**: 1 LOW WI.

### Defer (110-120 body content scan-noise)
사용자 모바일 smoke 후 결정.

## §5. References
- `.claude/scaffold/phrase-extract-review-queue.json` (206 entries, gitignored)
- `parsed_data/full_pdf.txt` (32761 lines)
- `scripts/build-phrases-into-rich.mjs:420-462` (collectReviewQueue — bulk-hotfix 대상)
- `scripts/parsers/extract-phrases-from-pdf.mjs:870-898, 950-983` (Stage 1/2 + needsReview)
- `src/data/loth/prayers/commons/psalter-texts.rich.json`
- `docs/review-428-fx11-phase2.md` (M-1/M-2/M-3)
- `docs/handoff-fx11-phase2b-2026-05-09.md`
- Memory: `feedback_pdf_reference_cp_workaround.md`
