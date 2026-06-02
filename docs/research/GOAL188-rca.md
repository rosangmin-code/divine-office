# GOAL188 RCA: Psalm 24:6 Stanza Boundary Split

Date checked: 2026-06-02

## Executive Summary

Psalm 24:6 (`Vulgate Psalm 23:6`) is split across two rendered psalmody stanzas in Week 1 Tuesday Lauds. The user-visible path is the psalmody path, not the invitatory selector path:

- Week 1 Tuesday Lauds points to `Psalm 24:1-10` in `src/data/loth/psalter/week-1.json:345` and `src/data/loth/psalter/week-1.json:350`.
- `resolvePsalm` loads exact-key `psalter-texts.json` data and returns its `stanzas` plus `stanzasRich` overlay when present (`src/lib/hours/resolvers/psalm.ts:55`, `src/lib/hours/resolvers/psalm.ts:58`, `src/lib/hours/resolvers/psalm.ts:81`, `src/lib/hours/resolvers/psalm.ts:82`).
- `PsalmodySection` renders each assembled psalm with `PsalmBlock` (`src/components/prayer-sections/psalmody-section.tsx:40`).
- `PsalmBlock` renders rich stanza blocks first when `psalm.stanzasRich.blocks` exists (`src/components/psalm-block.tsx:134`, `src/components/psalm-block.tsx:136`).

The root cause is the `extract-psalm-texts.js` body extractor treating a PDF page break as a stanza break. The source text has a page break after `Иаковын Тэнгэрбурхан,` and before `Таны царайг хайгчдын үе юм.` (`parsed_data/full_pdf.txt:2998`, `parsed_data/full_pdf.txt:2999`, `parsed_data/full_pdf.txt:3001`, `parsed_data/full_pdf.txt:3007`). The extractor keeps blank lines as stanza delimiters (`scripts/extract-psalm-texts.js:61`, `scripts/extract-psalm-texts.js:428`) and groups stanzas on blanks (`scripts/extract-psalm-texts.js:433`, `scripts/extract-psalm-texts.js:437`). Its cross-stanza merge only repairs lowercase-start continuations (`scripts/extract-psalm-texts.js:147`, `scripts/extract-psalm-texts.js:158`), so an uppercase post-page-break continuation remains split.

## D1: User-Visible Symptom

The affected production psalmody cell is Week 1 Tuesday Lauds:

- `src/data/loth/psalter/week-1.json:345` starts `TUE`.
- `src/data/loth/psalter/week-1.json:346` starts `lauds`.
- `src/data/loth/psalter/week-1.json:350` sets `ref: "Psalm 24:1-10"`.
- The existing screenshot harness also identifies this as `/pray/2026-01-13/lauds` for Psalm 24 (`scripts/capture-task3-refrain-screenshots.mjs:22`, `scripts/capture-task3-refrain-screenshots.mjs:23`).

The plain psalter data already contains the split:

- `src/data/loth/psalter-texts.json:450` starts `Psalm 24:1-10`.
- The first stanza ends with `Энэ нь Түүнийг хайгчдын үе юм` and `Иаковын Тэнгэрбурхан,` at `src/data/loth/psalter-texts.json:465` and `src/data/loth/psalter-texts.json:466`.
- The next stanza begins with `Таны царайг хайгчдын үе юм.` at `src/data/loth/psalter-texts.json:468` and `src/data/loth/psalter-texts.json:469`.

The rich overlay used by the current UI preserves the same split:

- `src/data/loth/prayers/commons/psalter-texts.rich.json:6074` starts `Psalm 24:1-10`.
- Rich block 0 contains `Энэ нь...` and `Иаковын Тэнгэрбурхан,` at `src/data/loth/prayers/commons/psalter-texts.rich.json:6242` and `src/data/loth/prayers/commons/psalter-texts.rich.json:6251`.
- Rich block 1 starts with `Таны царайг хайгчдын үе юм.` at `src/data/loth/prayers/commons/psalter-texts.rich.json:6369` and `src/data/loth/prayers/commons/psalter-texts.rich.json:6376`.

Command evidence:

```text
node extract summary from current JSON data:
{
  "psalterStanzaCount": 2,
  "psalterStanza0Tail": [
    "Зөвт байдлыг хүртэх болно.",
    "Энэ нь Түүнийг хайгчдын үе юм",
    "Иаковын Тэнгэрбурхан,"
  ],
  "psalterStanza1Head": [
    "Таны царайг хайгчдын үе юм.",
    "Сүр жавхлангийн Хаан орж ирлээ,",
    "Гулдан хаалганууд аа, толгойгоо өргөж,"
  ],
  "invitatoryStanzaWithVerse6": "Энэ нь Түүнийг хайгчдын үе юм Иаковын Тэнгэрбурхан, Таны царайг хайгчдын үе юм.",
  "richBlockCount": 2,
  "richBlock0Tail": [
    "Энэ нь Түүнийг хайгчдын үе юм",
    "Иаковын Тэнгэрбурхан,"
  ],
  "richBlock1Head": [
    "Таны царайг хайгчдын үе юм.",
    "Сүр жавхлангийн Хаан орж ирлээ,"
  ]
}
```

## D2: Root Cause

### Source Layout

The PDF-derived text has the Psalm 24 body split by a physical page boundary:

- `parsed_data/full_pdf.txt:2998` has `Энэ нь Түүнийг хайгчдын үе юм`.
- `parsed_data/full_pdf.txt:2999` has `Иаковын Тэнгэрбурхан,`.
- `parsed_data/full_pdf.txt:3001` has a form-feed/page break.
- `parsed_data/full_pdf.txt:3003` has the running header `Мягмар гарагийн өглөө`.
- `parsed_data/full_pdf.txt:3007` resumes with `Таны царайг хайгчдын үе юм.`.

`parsed_data/week1/week1_final.txt` carries the same boundary into the extractor input:

- `parsed_data/week1/week1_final.txt:1468` has `Энэ нь Түүнийг хайгчдын үе юм`.
- `parsed_data/week1/week1_final.txt:1469` has `Иаковын Тэнгэрбурхан,`.
- `parsed_data/week1/week1_final.txt:1471` has the running header.
- `parsed_data/week1/week1_final.txt:1475` resumes with `Таны царайг хайгчдын үе юм.`.

### Extractor Behavior

`extract-psalm-texts.js` reads `parsed_data/weekN/weekN_final.txt` and writes `src/data/loth/psalter-texts.json` (`scripts/extract-psalm-texts.js:3`, `scripts/extract-psalm-texts.js:4`). It explicitly treats blank lines as meaningful stanza breaks, not noise (`scripts/extract-psalm-texts.js:61`). During body collection it skips page/header noise but keeps blanks for stanza detection (`scripts/extract-psalm-texts.js:424`, `scripts/extract-psalm-texts.js:426`, `scripts/extract-psalm-texts.js:428`).

After collection, it groups by blank lines (`scripts/extract-psalm-texts.js:433`, `scripts/extract-psalm-texts.js:437`). It then merges column wraps within a stanza (`scripts/extract-psalm-texts.js:439`, `scripts/extract-psalm-texts.js:447`) and merges across stanza boundaries only when the next stanza starts with a lowercase Cyrillic continuation (`scripts/extract-psalm-texts.js:147`, `scripts/extract-psalm-texts.js:158`). Because `Таны` starts uppercase, the page-break continuation is not repaired.

Command evidence from the extractor itself:

```text
node extractPsalmBody(...) on parsed_data/week1/week1_final.txt:
{
  "headerLine": 1446,
  "endLine": 1488,
  "stanzaCount": 2,
  "stanza0Tail": [
    "Зөвт байдлыг хүртэх болно.",
    "Энэ нь Түүнийг хайгчдын үе юм",
    "Иаковын Тэнгэрбурхан,"
  ],
  "stanza1Head": [
    "Таны царайг хайгчдын үе юм.",
    "Сүр жавхлангийн Хаан орж ирлээ,",
    "Гулдан хаалганууд аа, толгойгоо өргөж,",
    "Мөнхийн үүднүүд ээ, өргөгдөгтүн!"
  ]
}
```

### Why Invitatory Is Correct

The invitatory copy is not resolved through `psalter/week-1.json` plus `psalter-texts.json`. `buildInvitatory` takes its psalm candidates directly from `ordinarium.invitatory.invitatoryPsalms` (`src/lib/hours/builders/invitatory.ts:75`, `src/lib/hours/builders/invitatory.ts:79`, `src/lib/hours/builders/invitatory.ts:92`).

That direct invitatory source has Psalm 24:6 as one line:

- `src/data/loth/ordinarium/invitatory.json:97` identifies `Psalm 24:1-10`.
- `src/data/loth/ordinarium/invitatory.json:106` starts the stanza containing verses 3-6.
- `src/data/loth/ordinarium/invitatory.json:110` contains the whole target sentence as one element.

There is also an older/alternate ordinarium copy that keeps `Иаковын Тэнгэрбурхан, Таны царайг...` together on one line (`src/data/loth/ordinarium.json:196`, `src/data/loth/ordinarium.json:204`, `src/data/loth/ordinarium.json:205`). This confirms the bad split is not intrinsic to the Mongolian text; it is specific to the psalter-text extraction path.

The project already documents this dual storage: `docs/prayer-inventory.md:14` says Psalm 24 exists in both `psalter-texts.json` and `ordinarium/invitatory.json`, and `docs/prayer-inventory.md:26` describes `ordinarium/invitatory.json` as directly containing four invitatory psalm candidates.

## D3: Recommended Fix

### Fix Plan

1. Patch the curated data for the immediate user-visible defect:
   - Update `src/data/loth/psalter-texts.json` so Psalm 24:1-10 does not split between `Иаковын Тэнгэрбурхан,` and `Таны царайг...`.
   - Regenerate or surgically update `src/data/loth/prayers/commons/psalter-texts.rich.json`, because the UI currently prefers the rich blocks (`src/components/psalm-block.tsx:134`).

2. Make the extraction pipeline idempotent for this class of page break:
   - Add page-break-aware body logic to `extractPsalmBody`, analogous in spirit to the prayer continuation logic that peeks past blanks/noise before deciding to stop or absorb (`scripts/extract-psalm-texts.js:491`, `scripts/extract-psalm-texts.js:497`, `scripts/extract-psalm-texts.js:505`).
   - The body rule should treat `blank(s) + page/running-header noise + blank(s)` as a soft break when the previous kept body line is incomplete, especially comma-ending text like `Иаковын Тэнгэрбурхан,`.
   - Keep real stanza breaks when the previous stanza ends with terminal punctuation or when the blank is not associated with a page/noise block.

3. Add regression coverage:
   - Unit-level: `extractPsalmBody` fixture around `parsed_data/week1/week1_final.txt:1468` through `parsed_data/week1/week1_final.txt:1475` must keep Psalm 24:6 in one stanza.
   - Data-level: assert `src/data/loth/psalter-texts.json["Psalm 24:1-10"]` has no stanza boundary between `Иаковын Тэнгэрбурхан,` and `Таны царайг...`.
   - Rich-level/UI-level: assert `psalter-texts.rich.json` and rendered Psalm 24 on `/pray/2026-01-13/lauds` do not put `Таны царайг...` in a new `data-role="psalm-stanza"` block.

### Tradeoffs

- A data-only patch is low risk and fixes the current UI, but it is not idempotent if someone later reruns `scripts/extract-psalm-texts.js`.
- A broad heuristic that merges every blank after an incomplete line can over-merge legitimate poetic stanza breaks, because many psalm lines are deliberately not sentence-complete.
- A page/noise-aware heuristic is safer: it targets this observed failure mode, but it needs a small fixture suite because `extract-psalm-texts.js` already warns that full re-extraction is non-idempotent against curated data (`scripts/extract-psalm-texts.js:14`, `scripts/extract-psalm-texts.js:20`, `scripts/extract-psalm-texts.js:672`).

## Impact Scope

Confirmed affected rendered path: Week 1 Tuesday Lauds Psalm 24:1-10, visible at the psalmody section. The same text in the invitatory selector is not affected because it is sourced directly from `ordinarium/invitatory.json`.

I did not change production data in this RCA task. The implementation follow-up should update both the plain and rich psalter data or regenerate rich from the corrected plain source.

## Impact Sweep (independent, Step 3)

Reviewer: `dvo-rev-co`. Verdict: **CONDITIONAL**. The RCA's D1/D2/D3 explanation for Psalm 24 resolves against the cited files: the plain psalter split is at `src/data/loth/psalter-texts.json:465` through `src/data/loth/psalter-texts.json:469`; the invitatory copy is unified at `src/data/loth/ordinarium/invitatory.json:106` through `src/data/loth/ordinarium/invitatory.json:110`; the lowercase-only cross-stanza repair is at `scripts/extract-psalm-texts.js:147` and `scripts/extract-psalm-texts.js:158`; and the Psalm 24 source page/header gap is at `parsed_data/full_pdf.txt:2999` through `parsed_data/full_pdf.txt:3007`.

The impact scope above is incomplete. A read-only Node sweep over `src/data/loth/psalter-texts.json` found 29 page/header-gap boundary candidates with the same extractor signature: a stanza boundary after an incomplete line, followed by an uppercase continuation, with `parsed_data/full_pdf.txt` showing a page marker or running header between the two lines. The same affected refs are mirrored in `src/data/loth/prayers/commons/psalter-texts.rich.json` where a rich overlay exists. `src/data/loth/psalter/week-*.json` contains refs but no `"stanzas"` or `"stanzasRich"` bodies (`rg -n '"stanzas"|"stanzasRich"' src/data/loth/psalter/week-*.json` returned no matches), so week files expose these cases by resolving refs through `src/lib/hours/resolvers/psalm.ts:55` through `src/lib/hours/resolvers/psalm.ts:82`.

Confirmed page/header-gap candidates:

| Ref | Plain line | Rich line | full_pdf gap | Split text |
| --- | ---: | ---: | --- | --- |
| Psalm 29:1-10 | `src/data/loth/psalter-texts.json:367` | `src/data/loth/prayers/commons/psalter-texts.rich.json:4653` | `parsed_data/full_pdf.txt:2583` -> `parsed_data/full_pdf.txt:2591` | `Сирионыг зэрлэг үхрийн тугал шиг` / `Тэрээр оодгонуулдаг билээ.` |
| Psalm 24:1-10 | `src/data/loth/psalter-texts.json:469` | `src/data/loth/prayers/commons/psalter-texts.rich.json:6376` | `parsed_data/full_pdf.txt:2999` -> `parsed_data/full_pdf.txt:3007` | `Иаковын Тэнгэрбурхан,` / `Таны царайг хайгчдын үе юм.` |
| Psalm 33:1-9 | `src/data/loth/psalter-texts.json:609` | `src/data/loth/prayers/commons/psalter-texts.rich.json:8203` | `parsed_data/full_pdf.txt:3168` -> `parsed_data/full_pdf.txt:3173` | `Хайр энэрэлд нь найдагчдыг хардаг. –` / `Тэдний амийг үхлээс аварч,` |
| Psalm 16:1-6 | `src/data/loth/psalter-texts.json:652` | `src/data/loth/prayers/commons/psalter-texts.rich.json:8754` | `parsed_data/full_pdf.txt:5667` -> `parsed_data/full_pdf.txt:5675` | `Таны өмнө л баяр хөөр дүүрэн байдаг.–` / `Таны баруун мутарт` |
| Psalm 20:2-8 | `src/data/loth/psalter-texts.json:670` | `src/data/loth/prayers/commons/psalter-texts.rich.json:8927` | `parsed_data/full_pdf.txt:3304` -> `parsed_data/full_pdf.txt:3312` | `Сионоос чамайг түших болтугай. –` / `Тэрээр бүх идээн өргөлийг чинь санаж,` |
| Psalm 57:2-12 | `src/data/loth/psalter-texts.json:1054` | `src/data/loth/prayers/commons/psalter-texts.rich.json:14021` | `parsed_data/full_pdf.txt:4138` -> `parsed_data/full_pdf.txt:4146` | `Тэд хөлд минь тор тавив.–` / `Сэтгэл минь гонсойв.` |
| Psalm 30:2-13 | `src/data/loth/psalter-texts.json:1157` | `src/data/loth/prayers/commons/psalter-texts.rich.json:15345` | `parsed_data/full_pdf.txt:4393` -> `parsed_data/full_pdf.txt:4401` | `ЭЗЭН, Та намайг дээшээ өргөж,` / `Миний дайснуудыг надаас болж` |
| Psalm 32:1-11 | `src/data/loth/psalter-texts.json:1232` | `src/data/loth/prayers/commons/psalter-texts.rich.json:16405` | `parsed_data/full_pdf.txt:4501` -> `parsed_data/full_pdf.txt:4509` | `Та намайг зовлон бэрхшээлээс хамгаалдаг. –` / `Та намайг авралын дуугаар хүрээлүүлдэг.` |
| Revelation 11:17-18; 12:10b-12a | `src/data/loth/psalter-texts.json:1279` | `src/data/loth/prayers/commons/psalter-texts.rich.json:17067` | `parsed_data/full_pdf.txt:4574` -> `parsed_data/full_pdf.txt:4582` | `Тиймээс тэнгэр хийгээд –` / `Тэнгэр нарын гийчид,` |
| Psalm 51:3-19 | `src/data/loth/psalter-texts.json:1336` | `src/data/loth/prayers/commons/psalter-texts.rich.json:17879` | `parsed_data/full_pdf.txt:16949` -> `parsed_data/full_pdf.txt:16957` | `Эмтэрсэн, гэмшсэн зүрхийг –` / `Тэнгэрбурхан Та жигшихгүй.` |
| Isaiah 45:15-26 | `src/data/loth/psalter-texts.json:1381` | `src/data/loth/prayers/commons/psalter-texts.rich.json:18494` | `parsed_data/full_pdf.txt:4847` -> `parsed_data/full_pdf.txt:4855` | `Тэд хамтдаа зөвлөлдөг. –` / `Хэн эртнээс үүнийг мэдүүлсэн бэ?` |
| Psalm 132:1-10 | `src/data/loth/psalter-texts.json:1548` | `src/data/loth/prayers/commons/psalter-texts.rich.json:20771` | `parsed_data/full_pdf.txt:12662` -> `parsed_data/full_pdf.txt:12670` | `Бүх зовлон шаналлыг нь санаач.–` / `ЭЗЭНд тэрээр хэрхэн тангараглан` |
| Psalm 116:10-19 | `src/data/loth/psalter-texts.json:1706` | `src/data/loth/prayers/commons/psalter-texts.rich.json:22714` | `parsed_data/full_pdf.txt:9860` -> `parsed_data/full_pdf.txt:9868` | `Итгэмжит хүмүүсийнх нь үхэл –` / `ЭЗЭНий мэлмийд үнэ цэнтэй.` |
| Psalm 118:1-16 | `src/data/loth/psalter-texts.json:1814` | `src/data/loth/prayers/commons/psalter-texts.rich.json:24543` | `parsed_data/full_pdf.txt:5876` -> `parsed_data/full_pdf.txt:5884` | `Хүн надад юу хийж чадах вэ? –` / `ЭЗЭН надад туслахаар миний талд байна.` |
| Psalm 115:1-13 | `src/data/loth/psalter-texts.json:1980` | `src/data/loth/prayers/commons/psalter-texts.rich.json:26410` | `parsed_data/full_pdf.txt:6305` -> `parsed_data/full_pdf.txt:6313` | `Тэр ерөөнө.–` / `Израилын гэрийг ерөөнө.` |
| Psalm 65:2-9 | `src/data/loth/psalter-texts.json:2297` | `src/data/loth/prayers/commons/psalter-texts.rich.json:30216` | `parsed_data/full_pdf.txt:7288` -> `parsed_data/full_pdf.txt:7296` | `Нугыг хонин сүрэг нөмөрч, –` / `Хөндийнүүд үр тариагаар хучигджээ.` |
| Psalm 49:1-13 | `src/data/loth/psalter-texts.json:2325` | `src/data/loth/prayers/commons/psalter-texts.rich.json:30596` | `parsed_data/full_pdf.txt:7431` -> `parsed_data/full_pdf.txt:7439` | `Золилт үнэхээр байхгүй. –` / `Тэнгэрбурханд төлж чадах төлөөс гэж ч байхгүй.` |
| Psalm 97:1-12 | `src/data/loth/psalter-texts.json:2493` | `src/data/loth/prayers/commons/psalter-texts.rich.json:32871` | `parsed_data/full_pdf.txt:7878` -> `parsed_data/full_pdf.txt:7886` | `Учир нь Та бүх дэлхийн дээр` / `Хамгийн Дээд ЭЗЭН юм.` |
| Psalm 62:2-9 | `src/data/loth/psalter-texts.json:2543` | `src/data/loth/prayers/commons/psalter-texts.rich.json:33599` | `parsed_data/full_pdf.txt:8053` -> `parsed_data/full_pdf.txt:8061` | `Чадал чинээ өсөж нэмэгдвэл –` / `Зүрхээ тэрэнд бүү тогтоо.` |
| Psalm 116:1-9 | `src/data/loth/psalter-texts.json:2850` | `src/data/loth/prayers/commons/psalter-texts.rich.json:37751` | `parsed_data/full_pdf.txt:9242` -> `parsed_data/full_pdf.txt:9250` | `Үхэгсдийн орны урхинууд–` / `Намайг олж иржээ.` |
| Psalm 92:2-9 | `src/data/loth/psalter-texts.json:3005` | `src/data/loth/prayers/commons/psalter-texts.rich.json:39942` | `parsed_data/full_pdf.txt:9513` -> `parsed_data/full_pdf.txt:9521` | `Та над дээр шинэхэн тос цутгасан.–` / `Нүд минь миний дайснуудын уналыг харж,` |
| Psalm 111:1-10 | `src/data/loth/psalter-texts.json:3263` | `src/data/loth/prayers/commons/psalter-texts.rich.json:42875` | `parsed_data/full_pdf.txt:10472` -> `parsed_data/full_pdf.txt:10487` | `Өөрөөс нь эмээгчдэд Тэрээр` / `Түүний мутрын үйлс үнэн ба шударга ёс юм.` |
| Psalm 98:1-9 | `src/data/loth/psalter-texts.json:3643` | `src/data/loth/prayers/commons/psalter-texts.rich.json:48234` | `parsed_data/full_pdf.txt:11980` -> `parsed_data/full_pdf.txt:11988` | `ЭЗЭНий өмнө гол мөрнүүд алга ташин` / `Уул нурууд баярлан дуулаг.` |
| Psalm 90:1-12 | `src/data/loth/psalter-texts.json:4063` | `src/data/loth/prayers/commons/psalter-texts.rich.json:53360` | `parsed_data/full_pdf.txt:14661` -> `parsed_data/full_pdf.txt:14669` | `Та бидний гэм бурууг Өөрийнхөө өмнө,` / `Бидний нууцыг` |
| Psalm 108:2-7 | `src/data/loth/psalter-texts.json:4341` | `src/data/loth/prayers/commons/psalter-texts.rich.json:57017` | `parsed_data/full_pdf.txt:15827` -> `parsed_data/full_pdf.txt:15835` | `Моаб Миний угаалгын сав –` / `Едомын дээр Би гутлаа шиднэ.` |
| Psalm 139:1-18 | `src/data/loth/psalter-texts.json:4415` | `src/data/loth/prayers/commons/psalter-texts.rich.json:57701` | `parsed_data/full_pdf.txt:16074` -> `parsed_data/full_pdf.txt:16086` | `Та хаа холоос миний санаа бодлуудыг` / `Хэлэн дээр минь ганц үг байхаас ч өмнө,` |
| Psalm 143:1-11 | `src/data/loth/psalter-texts.json:4463` | `src/data/loth/prayers/commons/psalter-texts.rich.json:58386` | `parsed_data/full_pdf.txt:16389` -> `parsed_data/full_pdf.txt:16397` | `Сүнс минь доройтож байна.–` / `Надаас нүүрээ бүү нуугаач,` |
| Psalm 147:12-20 | `src/data/loth/psalter-texts.json:4523` | `src/data/loth/prayers/commons/psalter-texts.rich.json:59173` | `parsed_data/full_pdf.txt:9100` -> `parsed_data/full_pdf.txt:9108` | `Тэр үгээ илгээж, тэдгээрийг хайлуулдаг.–` / `Тэр салхиа үлээлгэж, их усыг урсгадаг.` |
| Psalm 144:11-15 | `src/data/loth/psalter-texts.json:4545` | `src/data/loth/prayers/commons/psalter-texts.rich.json:59439` | `parsed_data/full_pdf.txt:16677` -> `parsed_data/full_pdf.txt:16685` | `Баруун гар нь худлын баруун гар болсон, –` / `Гаднынхны гараас намайг салган чөлөөлөөч!` |

False-positive / non-page-signature boundaries from the same heuristic: 16 plain psalter boundaries lacked the page/header gap that defines the Psalm 24 root-cause signature, and one invitatory boundary also matched the punctuation heuristic without the Psalm 24 source-path problem. Examples: `Psalm 42:2-6` at `src/data/loth/psalter-texts.json:2032`, `Psalm 96:1-13` at `src/data/loth/psalter-texts.json:3387`, and `Psalm 95:1-11` at `src/data/loth/ordinarium/invitatory.json:37`. `src/data/loth/ordinarium.json` had 0 matches under the same heuristic.

Review conclusion: D2 is sound for Psalm 24, and D3's page/noise-aware recommendation is directionally sound, but the implementation follow-up should not patch only Psalm 24. It should either repair all 29 confirmed page/header-gap candidates in both plain and rich data, or explicitly decide which candidates are liturgically legitimate stanza breaks after source-layout review. The regression fixture should cover at least Psalm 24 plus one non-Psalm-24 page/header-gap case such as Psalm 29, because `src/data/loth/psalter-texts.json:367` and `parsed_data/full_pdf.txt:2583` through `parsed_data/full_pdf.txt:2591` show the same uppercase-after-page-break failure signature.
