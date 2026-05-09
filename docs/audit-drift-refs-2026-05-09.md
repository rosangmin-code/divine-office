# DRIFT 28 refs audit — 2026-05-09

**Audit by**: divine-researcher (Explore profile, read-only) — task #448
**Doc materialized by**: leader
**main HEAD**: 320ef64 (#447 curator queue bulk-hotfix merged + pushed)

## TL;DR

28 refs (24 DRIFT_LINE_COUNT + 4 DRIFT_NO_MATCH) skipped Phase 2-B atomic gate.

**Root cause**: ~17-19 refs (60-65%) suffer from **page-break stanza split** — extractor `splitOnEveryBlank` legacy splitter terminates blank-bounded stanza at PDF page-break boundaries. **Single extractor improvement** (page-footer-aware blank bridging) recovers most DRIFT cases.

Remaining: typo/text mismatch (~3-5), rubric/header blocks in rich.json (~2-3 refs / 4-5 blocks), pageMap (1), wrap-continuation residual (~3-5, defer until WI-A).

## §1. Categorization

| CAT | Mechanism | Refs | Coverage |
|---|---|---|---|
| 1 | Page-break stanza split (extractor terminates at blank between page-footer) | ~17-19 | 60-65% |
| 2 | rich.json text typo (missing/extra char vs PDF) | ~3-5 | ~15% |
| 3 | Rubric/header blocks in rich.json (not psalm body) | ~2-3 refs / 4-5 blocks | ~10% |
| 4 | pageMap wrong (Psalm 144:1-10 → 445 vs 444) | 1 | ~3% |
| 5 | Small drift residual (gap=1-2, may resolve after CAT 1 fix) | ~3-5 | deferred |

## §2. PDF spot-check (7/7 confirmed)

| ref | block | rich | ext | CAT | verdict |
|---|---|---|---|---|---|
| Daniel 3:57-88, 56 | 8 | 6 | 1 | 1 | page-break confirmed (line 1931 blank + footer 1932-34) |
| Psalm 16:1-6 | 0 | 24 | 4 | 1 | page-break (line 5633 blank + footer) |
| Psalm 96:1-13 | 0 | 31 | 4 | 1 | page-break (line 10869 blank + footer) |
| Psalm 119:105-112 | 0 | 16 | 3 | 1 | page-break (line 5573+) |
| Wisdom 9:1-6, 9-11 | 0 | 10 | 1 | 2 | rich missing "минь,"; "Нигүүлсхүйн" vs PDF "Нигүүлсэхүйн" |
| Psalm 88:2-10 | 1 | NO_MATCH | — | 3 | block 1="Шөнийн даатгал залбирал", block 2="Баасан гараг" (Compline+Friday header, NOT psalm body) |
| Isaiah 61:10-62:5 | 4 | NO_MATCH | — | 2 | rich "Цаашаа" vs PDF "Цаашид" |

추가:
- Psalm 137:1-6 b1 = "Төгсгөлийг дэг жаягийн дагуу дуусгана, х. 38." (rubric, 3회 반복)
- Psalm 144:1-10 b0 line 15373 (book p.444 LEFT col trailing) → CAT 4 pageMap

## §3. Reconcile 권고 (4 WI parallel)

### WI-A (CAT 1, RECOMMENDED FIRST) — Extractor page-footer bridge
**Scope**: scripts/parsers/extract-phrases-from-pdf.mjs `splitOnEveryBlank` legacy 모드에 page-footer-aware blank bridging
**Page-footer pattern**:
```
{blank}
{page_number}        // ^\d+$
{page_number}\t\t\t  // ^\d+\s+\dугаар долоо хоног$ 등
{blank}
{day_or_week_header} // ^[1-7]\s+(дугаар|дахь|тэр)\s+долоо\s+хоног$, ^Бямба гарагийн (орой|өглөө)$ 등
{blank}
```
Bridge logic: blank → page-footer pattern (4-7 lines) → resume → 단일 bridging blank 으로 처리.
**Expected**: 17-19 refs recovery (60-70%)
**Effort**: MEDIUM-HIGH (~3-5h, solver fit)

### WI-B (CAT 3) — Rubric/header blocks 제거
**Scope**: src/data/loth/prayers/commons/psalter-texts.rich.json 에서 rubric/header 4-5 blocks 제거:
- Psalm 88:2-10 block 1 ("Шөнийн даатгал залбирал")
- Psalm 88:2-10 block 2 ("Баасан гараг")
- Psalm 137:1-6 block 1 ("Төгсгөлийг дэг жаягийн...")
- Psalm 137:1-6 block 3 ("Оройн даатгал залбирал")
**Expected**: Psalm 88 / Psalm 137 PASS recovery
**Effort**: LOW (~1h)

### WI-C (CAT 2) — rich.json typo fix
**Scope**:
- Wisdom 9:1-6, 9-11 block 0: "Тэнгэрбурхан," → "Тэнгэрбурхан минь,"; "Нигүүлсхүйн" → "Нигүүлсэхүйн"
- Isaiah 61:10-62:5 block 4: "Цаашаа" → "Цаашид"
- 잠재 ~1-3 refs (gap-small refs 의 per-ref diff)
**Effort**: LOW-MEDIUM (~2h)

### WI-D (CAT 4) — pageMap Psalm 144:1-10
**Scope**: pageMap (week-N.json 또는 propers/sanctoral) 에서 Psalm 144:1-10 page 445 → 444 또는 gather backwards (`bookPage-1`).
**Effort**: LOW (~1h)

### WI-E (CAT 5, DEFERRED) — Small drift residual
**Scope**: WI-A 후 재분류
**Refs**: Revelation 4:11 b1 (gap=1), Psalm 30:2-13 b1 (gap=2), Psalm 118:1-16 b3 (gap=1), 1 Samuel 2:1-10 b2 (gap=1), Jeremiah 14:17-21 b2 (gap=1), Isaiah 38:10-14 b8 (gap=2), Daniel 3:26-27 b7 (gap=2), Isaiah 33:13-16 b2 (gap=2), Psalm 135:1-12 b3 (gap=2)

## §4. References
- `/home/min/.claude/pair-cowork/scratch/divineoffice/fx11-phase2b-dryrun-v2.json` (Phase 2-B v2 dryrun)
- `parsed_data/full_pdf.txt` (PDF verbatim)
- `src/data/loth/prayers/commons/psalter-texts.rich.json`
- `scripts/parsers/extract-phrases-from-pdf.mjs:870-1000` (WI-A target)
- `scripts/build-phrases-into-rich.mjs:280-370, 150-186` (verdict source)
- `scripts/dev/process-fx11-phase2-batch.mjs:175-262` (gatherStanzas, processOne, classifyResult)
- `docs/handoff-fx11-phase2b-2026-05-09.md`
- `docs/audit-curator-queue-2026-05-09.md` (#446 audit, methodology precedent)
