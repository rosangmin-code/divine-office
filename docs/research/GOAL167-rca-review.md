# GOAL167 RCA adversarial review

Task: `wi-004` / `[#167-sub-3]`.

Reviewed inputs:

- `docs/research/GOAL167-rca-A-identity.md`
- `docs/research/GOAL167-rca-B-rootcause.md`
- `docs/research/GOAL167-rca-C-scan-fix.md`

## Verdict

PASS.

The three RCA reports are materially correct on cite integrity, class
assignment, and the requested completeness scan. I found no blocking review
issues.

Important scope note: "complete" here means complete for the explicitly
requested defect families and grep/structural patterns: uncited Psalm 5-style
epigraph contamination, concluding-prayer/rubric tails, lowercase-first body
starts, and uppercase one-token orphan continuations across
`psalter-texts.json` and `psalter-texts.rich.json`. It is not a formal proof
that no other semantic body-boundary issue exists in the whole psalter corpus.

## Cite Integrity

### Extractor predicates

- `scripts/extract-psalm-texts.js:495-518` confirms `skipEpigraph` scans up to
  eight non-empty lines and only skips when a scanned line ends with `)` or
  `).`. That supports RCA B's claim that an uncited Psalm 5 caption can enter
  body text.
- `scripts/build-phrases-into-rich.mjs:172-222` confirms
  `CYRILLIC_CAPITAL_START_RE = /^[А-ЯЁӨҮ]/` and `regroupPhrasesByCapitalStart`
  starts a new phrase on uppercase Cyrillic. This supports the B1 line/phrase
  boundary diagnosis.
- `scripts/extract-psalm-texts.js:89-137` confirms `mergeColumnWraps` and
  `mergeAcrossStanzaBoundaries` merge only lowercase Cyrillic starts
  (`/^[а-яёөү]/`). `scripts/extract-psalm-texts.js:380-397` shows those merges
  are applied after body collection.
- `scripts/extract-psalm-texts.js:317-377` confirms title/epigraph skipping is
  followed by a broad body collector that keeps any non-noise, non-end-marker
  line. This is consistent with the Psalm 5 and Psalm 137 contamination paths.

### Data instances

Confirmed five catalog instances:

| id | class | confirmed location | review conclusion |
|---|---|---|---|
| A1 | content contamination | `src/data/loth/psalter-texts.json:273-277`; `src/data/loth/prayers/commons/psalter-texts.rich.json:3404-3441` | Psalm 5 pre-body epigraph/caption is stored before the first actual verse. |
| A2 | content contamination | `src/data/loth/psalter-texts.json:4265-4269` | Psalm 137 plain catalog begins with a concluding-prayer doxology tail. |
| A3 | content contamination | `src/data/loth/psalter-texts.json:4270-4278` | Psalm 137 plain catalog includes the rubric `Төгсгөлийг дэг жаягийн дагуу...`. |
| B1 | boundary defect | `src/data/loth/psalter-texts.json:320-325`; `src/data/loth/prayers/commons/psalter-texts.rich.json:4077-4105` | `ЭЗЭН,` is legitimate 1 Chronicles body text but is split as a one-word orphan line. |
| B2 | boundary/text-loss defect | `src/data/loth/psalter-texts.json:4518-4522`; `src/data/loth/prayers/commons/psalter-texts.rich.json:59018-59029` | Psalm 147 starts mid-verse at lowercase `хөндлүүдийг...`; preceding source lines are missing from the catalog. |

The plain/rich asymmetry for Psalm 137 is also correctly described: rich
`Psalm 137:1-6` starts with the real body at
`src/data/loth/prayers/commons/psalter-texts.rich.json:56119-56160`, so A2/A3
are latent plain fallback defects rather than current rich-first render defects.

## Classification Check

Class A is correct:

- A1 is not Psalm 5 body. The source prints Psalm 5 title at
  `parsed_data/full_pdf.txt:2455-2456`, the reported caption at
  `parsed_data/full_pdf.txt:2457-2459`, and the first actual verse at
  `parsed_data/full_pdf.txt:2460`.
- A2/A3 are not Psalm 137 body. The clean source at
  `parsed_data/full_pdf.txt:15530-15544` moves from Psalm 137 heading/epigraph
  into actual body text; the doxology and rubric appear in the polluted
  intermediate file at `parsed_data/week4/week4_final.txt:1745-1755` and then in
  plain `psalter-texts.json`.

Class B is correct:

- B1 is body text, not an antiphon/header/responsory. The source shows
  `Бидний эцэг өвөг Израилийн Тэнгэрбурхан`, then `ЭЗЭН,`, then the continuation
  at `parsed_data/full_pdf.txt:2529-2531`. The current data preserves that
  physical break at `src/data/loth/psalter-texts.json:323-325`.
- B2 is more serious because it is text loss, not only a bad line break. The
  source has the missing opening lines at `parsed_data/week2/week2_final.txt:3391-3394`
  and `parsed_data/full_pdf.txt:17058-17068`, while the catalog starts at the
  last of those line fragments.

False-positive exclusions are sound:

- Revelation 19 `Х. Аллэлуяа!` lines are part of the responsorial canticle body
  in the source (`parsed_data/full_pdf.txt:2273-2301`) and rich data marks them
  as `role: "refrain"` (for example
  `src/data/loth/prayers/commons/psalter-texts.rich.json:3158-3167` and
  `:3261-3270`). They should not be classified as rubric contamination.
- Isaiah's `Хариу нь Түүний өмнө байна.` is ordinary body text. It appears in
  the source at `parsed_data/full_pdf.txt:12441-12445`, in plain data at
  `src/data/loth/psalter-texts.json:3732-3736`, and in rich data at
  `src/data/loth/prayers/commons/psalter-texts.rich.json:49454-49470`.

## Completeness Scan

I independently scanned both catalogs with a structured Node script over plain
`stanzas` and rich `stanzasRich.blocks[].lines[]`.

Patterns checked:

- lowercase first body line: `/^[а-яёөү]/`
- uppercase one-token orphan line: `/^[А-ЯЁӨҮ]+[,]?$/`
- doxology tail: `Тантай, Ариун Сүнсний` / `Таны Хүүгээр уламжлан тийн болтугай`
- rubric tail: `Төгсгөлийг дэг жаягийн дагуу` / page directive tail
- known uncited Psalm 5 epigraph text: `Үгийг зүрх...` / `цаглашгүй баяр баясгаланг`

Captured result:

```json
{
  "plain": {
    "lowercaseFirst": ["Psalm 147:12-20: хөндлүүдийг бэхжүүлэн"],
    "upperOne": ["1 Chronicles 29:10-13: ЭЗЭН,"],
    "dox": ["Psalm 137:1-6"],
    "rubric": ["Psalm 137:1-6"],
    "psalm5": ["Psalm 5:2-10, 12-13"]
  },
  "rich": {
    "lowercaseFirst": ["Psalm 147:12-20: хөндлүүдийг бэхжүүлэн"],
    "upperOne": ["1 Chronicles 29:10-13: ЭЗЭН,"],
    "dox": [],
    "rubric": [],
    "psalm5": ["Psalm 5:2-10, 12-13 lines 0-1"]
  }
}
```

A direct `rg` cross-check for the five fragments returned exactly the same
catalog locations:

- `src/data/loth/psalter-texts.json:276`, `:324`, `:4268`, `:4277`, `:4521`
- `src/data/loth/prayers/commons/psalter-texts.rich.json:3414`, `:3423`,
  `:4096`, `:59028`

No additional instances appeared under the requested patterns.

## Review Issues

None.

## Fix Direction Check

RCA C's fix direction is appropriate:

- Data sanitize is required for the five catalog defects.
- Extraction should not use a broad uppercase-merge rule. B1 needs targeted
  handling; Revelation/Daniel-style acclamations prove uppercase short lines can
  be legitimate body/refrain units.
- A semantic verifier over both plain and rich body catalogs is the right
  recurrence guard because current page/ref/phrase-geometry verifiers do not
  assert body purity.

## Self Check

Outcome self evidence: three RCA reports were checked against direct file:line
reads and independent catalog scans. The five-instance list is confirmed, B2
source text loss is confirmed from both week2 intermediate and full PDF source,
and the false-positive exclusions are supported by source/rich-role evidence.
