# GOAL #167 RCA A - psalm/canticle boundary identity

Task: `wi-001`. Scope: identify and locate two reported Lauds boundary issues; no code/data fix in this task.

## Executive finding

Both reported fragments are in Week 1 Monday Lauds. The user report date `2026-06-01` is a Monday memorial with `psalterWeek: 1`, so it loads `src/data/loth/psalter/week-1.json` `MON.lauds`.

Command evidence:

```text
$ node - <<'NODE'
romcal.calendarFor({year: 2026, locale: 'en'})...
NODE
{"date":"2026-06-01","name":"Saint Justin Martyr","type":"MEMORIAL","season":"Later Ordinary Time","psalterWeek":1,"week":23,"day":152}
$ date -d 2026-06-01 +%A
Monday
```

`src/data/loth/psalter/week-1.json:192` starts `MON.lauds`; its first two psalmody entries are `Psalm 5:2-10, 12-13` at `:197` and `1 Chronicles 29:10-13` at `:209`.

## Case 1 - `зочин болгон` / `цаглашгүй баяр баясгалан`

### Identity

The fragment is not a psalm verse, responsory, or antiphon. It is a psalm-header/preface caption printed between the Psalm 5 title and the first Psalm 5 verse.

PDF source shape:

- `parsed_data/full_pdf.txt:2441` to `:2443` prints the Psalm 5 antiphon: `Шад дуулал 1 ...`.
- `parsed_data/full_pdf.txt:2455` to `:2456` prints `Дуулал 5:2-10, 12-13` and its title.
- `parsed_data/full_pdf.txt:2457` to `:2459` prints the reported fragment.
- `parsed_data/full_pdf.txt:2460` starts the actual first verse: `ЭЗЭН, үгэнд минь чих тавьж,`.

Therefore the boundary error is data classification: a header/preface line was imported into psalm body text.

### Current data locations

Plain body data includes the preface as the first stanza line:

- `src/data/loth/psalter-texts.json:273` starts `Psalm 5:2-10, 12-13`.
- `src/data/loth/psalter-texts.json:276` stores the full reported fragment as the first stanza line.
- `src/data/loth/psalter-texts.json:277` then starts the actual psalm verse.

Rich body data mirrors the same misclassification:

- `src/data/loth/prayers/commons/psalter-texts.rich.json:3404` starts `Psalm 5:2-10, 12-13`.
- `src/data/loth/prayers/commons/psalter-texts.rich.json:3414`, `:3423`, and `:3432` store the three PDF lines of the reported fragment as stanza body lines.
- `src/data/loth/prayers/commons/psalter-texts.rich.json:3441` then starts the actual psalm verse.

The dedicated psalter-header catalog has no `Psalm 5:2-10` / `зочин болгон` entry. Command evidence:

```text
$ rg -n "Psalm 5:2-10|зочин болгон|цаглашгүй баяр баясгалан" src/data/loth/prayers/commons/psalter-headers.rich.json || true
# no output
```

That absence matters because `src/data/loth/prayers/commons/psalter-headers.rich.json:1` to `:2` documents this catalog as the place for patristic/typological material that appears between a psalm title and first verse.

### Exposure context

The fragment appears in Week 1 Monday Lauds:

- `src/data/loth/psalter/week-1.json:192` starts `MON.lauds`.
- `src/data/loth/psalter/week-1.json:197` maps the first Lauds psalm to `Psalm 5:2-10, 12-13`.
- `src/data/loth/psalter/week-1.json:200` gives the title `Тусламж гуйдаг өглөөний залбирал`.

For the user report date, this means `/pray/2026-06-01/lauds` and `/api/loth/2026-06-01/lauds`.

## Case 2 - `Бидний эцэг өвөг Израилийн Тэнгэрбурхан` + next-line `ЭЗЭН,`

### Identity

This is not the Benedictus ordinarium. It is the Week 1 Monday Lauds canticle `1 Chronicles 29:10-13`, titled `Суу алдар ба нэр хүнд зөвхөн Тэнгэрбурханд л байх зохистой`.

Mapping evidence:

- `src/data/loth/psalter/week-1.json:209` maps the second `MON.lauds` psalmody entry to `1 Chronicles 29:10-13`.
- `src/data/loth/psalter/week-1.json:212` stores the canticle title.

The report's lowercase `эзэн` form was not found at this location; source and app data use uppercase `ЭЗЭН,`.

Command evidence:

```text
$ rg -n "^эзэн| эзэн|эзэн," parsed_data/full_pdf.txt src/data/loth/psalter-texts.json ...
# no match for this reported Week 1 Monday canticle phrase; matched unrelated lowercase hymn/prose words only
```

### PDF line and verse structure

The PDF extraction has a physical line break after `Тэнгэрбурхан`; `ЭЗЭН,` is on the next source line:

- `parsed_data/full_pdf.txt:2523` to `:2526` prints `Магтаал`, `1Шастирын дээд 29:10-13`, and the canticle title.
- `parsed_data/full_pdf.txt:2527` to `:2528` prints a header citation: `Бидний Эзэн Есүс Христийн Эцэг Тэнгэрбурхан магтагдах болтугай. (Ефес 1:3)`.
- `parsed_data/full_pdf.txt:2529` prints `Бидний эцэг өвөг Израилийн Тэнгэрбурхан`.
- `parsed_data/full_pdf.txt:2530` prints `ЭЗЭН,`.
- `parsed_data/full_pdf.txt:2531` continues `Та мөнхийн мөнхөд магтагдах болтугай.`

So the word is not on the same physical PDF-extraction line as `Тэнгэрбурхан`. Semantically, it is part of the opening canticle clause, not a separate antiphon/header/responsory. The current data preserves the physical split as separate stanza lines.

### Current data locations

Plain body data:

- `src/data/loth/psalter-texts.json:320` starts `1 Chronicles 29:10-13`.
- `src/data/loth/psalter-texts.json:323` stores `Бидний эцэг өвөг Израилийн Тэнгэрбурхан`.
- `src/data/loth/psalter-texts.json:324` stores `ЭЗЭН,`.
- `src/data/loth/psalter-texts.json:325` stores the continuation.

Rich body data:

- `src/data/loth/prayers/commons/psalter-texts.rich.json:4077` starts `1 Chronicles 29:10-13`.
- `src/data/loth/prayers/commons/psalter-texts.rich.json:4087` stores `Бидний эцэг өвөг Израилийн Тэнгэрбурхан`.
- `src/data/loth/prayers/commons/psalter-texts.rich.json:4096` stores `ЭЗЭН,`.
- `src/data/loth/prayers/commons/psalter-texts.rich.json:4105` stores the continuation.

## RCA boundary classification

Case 1 is a true content-contamination defect: the Psalm 5 preface belongs in header/preface metadata, not in `psalter-texts` stanza body. It currently appears as body because both plain and rich body catalogs include it before the actual first verse.

Case 2 is a line/phrase grouping defect, not content contamination. The phrase belongs to the `1 Chronicles 29:10-13` canticle body. Current data mirrors the PDF extraction's physical split (`Тэнгэрбурхан` line, then `ЭЗЭН,` line), but semantically these lines form one opening clause. A follow-up fix should decide whether the rich/body renderer needs phrase-level joining for short orphan lines like `ЭЗЭН,`, rather than removing it or reclassifying it as header material.

## Self-check

AC self verdict: MET.

Outcome evidence: case 1 identity is Psalm 5 header/preface at `parsed_data/full_pdf.txt:2457-2459`, currently misfiled into body at `src/data/loth/psalter-texts.json:276` and rich body at `src/data/loth/prayers/commons/psalter-texts.rich.json:3414-3432`; case 2 identity is Week 1 Monday Lauds `1 Chronicles 29:10-13`, with PDF split at `parsed_data/full_pdf.txt:2529-2530` and matching data split at `src/data/loth/psalter-texts.json:323-324`.
