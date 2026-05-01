# C-4 Compline Seasonal Propers Coverage Audit

**Task**: wi-003 (dispatched 2026-05-01)
**Member**: divine-researcher (worktree: `wi-003-divine-researcher`)
**Verdict**: **CLOSE** — no compline propers coverage gap exists.
**Peer**: `research_methodologist` — APPROVED_WITH_ISSUES (HIGH confidence)

---

## 1. Audit Scope

Sweep all 5 seasonal propers files for compline-specific override keys
(`compline.shortReading`, `compline.responsory`, `compline.gospelCanticleAntiphon`,
`compline.concludingPrayer`, etc.) and cross-check against the Mongolian LOTH PDF
(`parsed_data/full_pdf.txt`). Determine whether absence of compline overrides is
a coverage gap or an architecturally-correct design.

**Files reviewed**:
- `src/data/loth/propers/advent.json` (802 lines)
- `src/data/loth/propers/christmas.json` (612 lines)
- `src/data/loth/propers/easter.json` (1264 lines)
- `src/data/loth/propers/lent.json` (1232 lines)
- `src/data/loth/propers/ordinary-time.json` (3515 lines)

**Total: 7,425 lines swept.**

## 2. Findings

### 2.1 Zero compline overrides in propers/*.json

Grep for `compline` (case-insensitive) across all 5 files: **0 matches**.

Hour-key inventory (extracted via `dayPropers` enumeration):

| File | Hour keys present |
|---|---|
| advent.json | `firstVespers`, `lauds`, `vespers`, `vespers2` |
| christmas.json | `firstVespers`, `lauds`, `vespers`, `vespers2` |
| easter.json | `firstVespers`, `lauds`, `vespers`, `vespers2` |
| lent.json | `firstVespers`, `lauds`, `vespers`, `vespers2` |
| ordinary-time.json | `firstVespers`, `lauds`, `vespers`, `vespers2`, `conditionalRubrics` |

→ **Compline appears in NONE of the seasonal propers files.**

### 2.2 Schema and loader DO support seasonal compline propers

The absence is by data, not by code:

- **Schema**: `DayPropers` (src/lib/types.ts L357-368) declares `compline?: HourPropers`
  alongside `lauds`, `vespers`. `HourType = 'lauds' | 'vespers' | 'compline'`
  (src/lib/types.ts L57).
- **Loader**: `getSeasonHourPropers(season, week, day, hour, ...)` in
  src/lib/propers-loader.ts L150-205 accepts `hour='compline'` and traverses
  `weeks[N][day][hour]` for any of the three hours uniformly.
- **Merger**: `mergeComplineDefaults` (src/lib/hours/compline.ts L63-83) blends
  `mergedPropers > complineData` (ordinarium) for `shortReading`, `responsory`,
  `gospelCanticleAntiphon` (Nunc Dimittis), and `concludingPrayer`. If a season
  shipped a compline override block, it WOULD take precedence over the weekly
  default.

→ **Wiring is present and operational; the data side simply never authored a
seasonal compline override.**

### 2.3 PDF cross-check: compline structure

PDF table-of-contents (line 114) places "Шөнийн даатгал залбирал" (Compline /
Night Prayer) at page 859. The compline ordinarium content lives at PDF
p.512-545 (early-section, before the seasonal propers blocks).

**Per-day-of-week structure** (PDF p.515-543):
- One per-day formulary (SUN..SAT), each with: psalm + antiphon, short reading,
  responsory, Nunc Dimittis antiphon, concluding prayer, blessing.
- This matches `src/data/loth/ordinarium/compline.json::days.{SUN..SAT}` 1:1.

**Seasonal/feast variations are inline alternates** within the per-day block,
not separate seasonal propers:

1. **Easter Octave Responsory variant** (PDF p.515 lines 17818-17820, marker
   "Амилалтын Найман хоногийн доторх өдрүүдэд:"): replaces the
   versicle/response with "Энэ нь Эзэний бүтээсэн өдөр тул үүнд хөгжилдөн
   баярлацгаая. Аллэлуяа!"
2. **Easter Season Responsory Alleluia** (PDF p.515 lines 17821-17831, marker
   "Амилалтын улирал:"): adds double-Alleluia flourishes to the standard
   versicle/response/repeat structure.
3. **Sundays + Easter Octave alternate concluding prayer** (PDF p.516 lines
   17858-17863, marker "Ням гарагуудад болон амилалтын найм хоногийн үеэр"):
   "Аяа, Эзэн минь, энэ шөнийн турш бидэнтэй хамт байгаарай..." — this is
   captured in code as `compline.json::days.SUN.concludingPrayer.alternate`.
4. **Marian antiphon at end** (PDF p.544-545): four anthems (Salve Regina default
   + Alma Redemptoris + Regina Caeli + Hail Mary). Selection by season is the
   only intrinsically *seasonal* aspect of compline in this PDF.

### 2.4 Marian antiphon seasonal selection — already shipped

`selectSeasonalMarianIndex` in src/lib/hours/compline.ts L30-57 (FR-easter-3,
task #205) maps season → antiphon index (case-insensitive title match):

- `EASTER` → "Тэнгэрийн Хатан" (Regina Caeli, idx 2)
- `ADVENT | CHRISTMAS` → "Аврагчийн хайрт эх" (Alma Redemptoris, idx 1)
- `LENT` → "Ave Regina" (no Mongolian translation in PDF; falls through to idx 0)
- `ORDINARY_TIME` / unmatched / undefined → 0 (Salve Regina default)

→ **The only intrinsically seasonal compline element is fully implemented.**

## 3. Roman-Rite Reference Check

Standard Roman Rite Compline (Liturgia Horarum):
- Compline psalmody, short reading, responsory, Nunc Dimittis antiphon,
  concluding prayer all follow a **single weekly cycle** (Sun–Sat) repeated
  year-round.
- Seasonal variation is restricted to: (a) Marian antiphon choice by season,
  (b) inline Alleluia additions during Eastertide.
- Sanctoral propers can override compline only on Solemnities of the Lord that
  fall on weekdays (rare; not present in this data set).

→ **The "no compline propers per season" data shape is faithful to the source
PDF and to standard Roman-Rite practice.** (Caveat per peer: full Roman-Rite
correctness of the assembled compline output is out of audit scope; a separate
liturgist review would be required to certify.)

## 4. Recommendation

**Close C-4 audit.** The 5 propers files contain no compline-specific overrides
and that is the correct design — compline is per-day-of-week, not per-season.
The single seasonal element (Marian antiphon) is already implemented via
FR-easter-3 / task #205.

**Action**: none. No data backfill required.

## 5. Out-of-Scope Follow-ups (NOT C-4)

The audit incidentally surfaced two latent feature gaps. They are NOT compline
propers coverage gaps (and so do not block C-4 closure), but should be tracked
separately if a stakeholder wants Eastertide compline to render PDF-faithfully:

- **F-1**: PDF Easter Season Responsory Alleluia variant (PDF p.515 marker
  "Амилалтын улирал:") is not propagated through the compline assembler. Today's
  Easter compline shows the regular non-Alleluia responsory.
- **F-2**: Sunday alternate concluding prayer (PDF p.516, the "Ея гарагуудад…"
  alternative) IS present in `compline.json::days.SUN.concludingPrayer.alternate`
  but the assembler section in compline.ts L136-145 only emits the primary —
  `alternateText` is populated but no UI affordance currently exposes the
  alternate to the user. Verify by reading rendering layer separately.

These are not regressions from any prior shipped behavior; they are absence-of-
feature gaps surfaced by this audit.

## 6. Evidence Index

| Artifact | Reference |
|---|---|
| Hour-key enumeration | `src/data/loth/propers/{advent,christmas,easter,lent,ordinary-time}.json` (lines 1-7425) |
| Schema declaration | `src/lib/types.ts` L57 (HourType), L357-368 (DayPropers) |
| Loader path | `src/lib/propers-loader.ts` L150-205 (getSeasonHourPropers) |
| Merge path | `src/lib/hours/compline.ts` L63-83 (mergeComplineDefaults) |
| Marian selector | `src/lib/hours/compline.ts` L30-57 (selectSeasonalMarianIndex, FR-easter-3) |
| Ordinarium data | `src/data/loth/ordinarium/compline.json` (209 lines, days SUN..SAT + anteMarian.alternatives) |
| PDF compline section | `parsed_data/full_pdf.txt` lines 17776-18832 (per-day formularies p.515-543); p.544-545 anteMarian |
| PDF seasonal markers | "Амилалтын Найман хоногийн доторх өдрүүдэд:" (line 17818), "Амилалтын улирал:" (line 17821), "Ням гарагуудад болон амилалтын найм хоногийн үеэр" (line 17858) |
| Prior task | #205 / FR-easter-3 (Compline Marian seasonal default selector — shipped) |

## 7. Peer Review

- **Peer role**: `research_methodologist`
- **Stance**: APPROVED_WITH_ISSUES
- **Confidence**: HIGH
- **Rationale**: "Verified no compline matches in the 5 propers files;
  schema/loader/merge path supports compline overrides; ordinarium supplies
  weekly defaults, and PDF variants are inline/common-office material rather
  than seasonal propers. Close C-4, but soften broad claim that architecture
  is fully Roman-Rite correct; that needs separate validation."
- **Resolution**: Section 3 caveat added; broader Roman-Rite correctness deferred
  to a liturgist review (out of audit scope).

---

**Audit Verdict**: ✅ CLOSE C-4 — no compline propers coverage gap.
**Date**: 2026-05-01
**Auditor**: divine-researcher
**Worktree base**: f944aca (current main; dispatched 78dc0f8 is ancestor — drift
note: rebase --onto skipped because audit is doc-only, no source modification)
