# GOAL #126 - Psalm 63 Caption Break Provenance Verdict

Task: `wi-138-002` / `[#126-sub-2]`
Scope: research-only provenance verdict. No code or data changes.
Shard: none-justified, md-only research. Floor markers: N/A.

## Verdict

Verdict **(b) intended with evidence package**.

The Psalm 63 caption has one authored source break between the two PDF/source
caption lines:

1. `Гэм нүглийн харанхуйгаас салсан хэнбугай ч`
2. `Тэнгэрбурханыг хүсэн тэмүүлнэ.`

That break is intentionally preserved in `psalter-headers.rich.json` as an
`uncited_caption` `preface_text` newline. A narrow mobile viewport can also
soft-wrap the first caption source line after `салсан`; that is browser layout,
not a source-data break and not an extraction bug. No RED test is required
because the current source, data storage, renderer convention, and GOAL #126
mental model all agree on the intended behavior.

No fixes were applied.

## Source Quote

Primary source quote from `/home/min/myproject/divineoffice/parsed_data/full_pdf.txt`:

```text
1810  Дуулал 63:2-9
1811  Тэнгэрбурханаар цангаж буй сэтгэл
1812  Гэм нүглийн харанхуйгаас салсан хэнбугай ч
1813  Тэнгэрбурханыг хүсэн тэмүүлнэ.
1814  Тэнгэрбурхан, Та миний Тэнгэрбурхан
1815  Би Таныг эртлэн хайх болой.
```

The week-1 extraction input carries the same line boundary:

```text
335  Дуулал 63:2-9
336  Тэнгэрбурханаар цангаж буй сэтгэл
337  Гэм нүглийн харанхуйгаас салсан хэнбугай ч
338  Тэнгэрбурханыг хүсэн тэмүүлнэ.
339  Тэнгэрбурхан, Та миний Тэнгэрбурхан
340  Би Таныг эртлэн хайх болой.
```

Implication: source line 1812 is a single source line ending with `хэнбугай ч`.
If a screenshot shows `хэнбугай ч` on its own visual row, that row is caused by
viewport wrapping inside line 1812, not by a second source newline.

## Storage and Render Convention

`src/data/loth/prayers/commons/psalter-headers.rich.json:2` defines the
psalter-header catalog as text that appears between the Psalm title and the
first verse. The loader returns the first authored entry for a ref
(`src/lib/prayers/rich-overlay.ts:360-365`), and `PsalmBlock` renders
`headerRich` between the title and the stanza body
(`src/components/psalm-block.tsx:96-128`).

The current type contract explicitly models three header kinds:
`patristic_preface`, `nt_typological`, and `uncited_caption`
(`src/lib/types.ts:849-853`). `attribution` is optional so
`uncited_caption` can have no parenthetical citation. For `uncited_caption`,
the renderer uses `whitespace-pre-line` and omits attribution parentheses
(`src/components/psalm-block.tsx:98-110`). Therefore the stored newline in
Psalm 63 is semantic and intentional, while browser wrapping inside a long line
remains normal layout.

## Comparison Captions

| Ref | Kind | Source lines | Catalog storage | Render convention |
| --- | --- | --- | --- | --- |
| `Psalm 63:2-9` | `uncited_caption` | `full_pdf.txt:1812-1813` has exactly two caption lines after the title and before the body. | `preface_text` is `"Гэм ... хэнбугай ч\nТэнгэрбурханыг ..."` with no `attribution` (`psalter-headers.rich.json:4-15`). | Rendered in the post-title header slot with `whitespace-pre-line`; no attribution span or parentheses. Source newline is preserved; viewport soft-wraps may add visual rows. |
| `Psalm 67:2-8` | `nt_typological` | `full_pdf.txt:940-942` wraps one attributed preface across multiple source lines and ends with `(Үйлс 28:28).` | Catalog normalizes the preface body into one string and stores `attribution: "Үйлс 28:28"` separately (`psalter-headers.rich.json:18-29`). | Rendered in the same header slot as `preface_text (attribution)` without `whitespace-pre-line`; source wrapping is not preserved as semantic line breaks. |
| `Psalm 141:1-9` | `nt_typological` | `full_pdf.txt:1507-1511` contains multi-line preface text plus a standalone attribution line `(Илчлэл 8:4).` | Catalog stores a single `preface_text` sentence string and `attribution: "Илчлэл 8:4"`. | Rendered as attribution-backed header text; line breaks from PDF wrapping are storage-normalized. |
| `Psalm 149:1-9` | `patristic_preface` | `full_pdf.txt:2005-2006` splits the preface across source lines, with `(Хэсихиус)` on the second line. | Catalog stores `preface_text` as one body string and `attribution: "Хэсихиус"`. | Rendered as `preface_text (Хэсихиус)` in the post-title header slot. |
| `Psalm 114:1-8` | `patristic_preface` | `full_pdf.txt:2213-2215` wraps the preface across three source lines, with `(Гэгээн Августин).` at the end. | Catalog stores one normalized `preface_text` and separate `attribution`. | Rendered as an attribution-backed header; physical source wraps are not semantic breaks. |

Comparison conclusion: regular attributed headers normalize PDF physical wraps
into a single preface body plus separate attribution. Psalm 63 is different
because it is an uncited two-line caption: it has no attribution and the
two-line break is the authored caption structure, so the newline is preserved.

## Evidence Commands

```bash
nl -ba /home/min/myproject/divineoffice/parsed_data/full_pdf.txt | sed -n '1810,1815p'
nl -ba /home/min/myproject/divineoffice/parsed_data/week1/week1_final.txt | sed -n '335,340p'
node - <<'NODE'
const fs = require('fs')
const full = fs.readFileSync('/home/min/myproject/divineoffice/parsed_data/full_pdf.txt', 'utf8').split(/\r?\n/)
const catalog = JSON.parse(fs.readFileSync('src/data/loth/prayers/commons/psalter-headers.rich.json', 'utf8'))
for (const [ref, idx] of [['Psalm 63:2-9', 0], ['Psalm 67:2-8', 0], ['Psalm 141:1-9', 0], ['Psalm 149:1-9', 0], ['Psalm 114:1-8', 0]]) {
  const entry = catalog.refs[ref].entries[idx]
  const [start, end] = entry.evidence_line_range
  console.log(ref, entry.kind, JSON.stringify(entry.preface_text), entry.attribution ?? '')
  for (let line = start; line <= end; line++) console.log(`${line}: ${full[line - 1]}`)
}
NODE
```

Observed result: Psalm 63 line 1812 is the full first caption source line,
line 1813 is the second caption source line, and the catalog stores the same
two lines with one newline. The comparison entries show the normal
attribution-backed convention: source wraps are normalized into a body string
and attribution is split out.

## Acceptance Criteria Mapping

- **AC1 - Source quote of `full_pdf.txt` lines included.** Satisfied by
  `Source Quote`, aligned with GOAL #126 MM `State Model / Source State` and
  `Scenarios / S1-S2`.
- **AC2 - 3+ comparison captions with storage/render convention documented.**
  Satisfied by `Comparison Captions`, aligned with GOAL #126 MM
  `State Model / Data State`, `State Model / Render State`, and `Sync Surface`.
- **AC3 - Explicit verdict (a) bug with RED test OR (b) intended with evidence
  package; no fixes applied.** Satisfied by `Verdict` and `Storage and Render
  Convention`, aligned with GOAL #126 MM `Intended Behavior`, `Action Map`,
  `Visibility Boundary`, and `Test Scenario Map`.

## Final Research Result

The break between Psalm 63 caption source lines 1812 and 1813 is intended. The
extra visual break that can appear before `хэнбугай ч` on a narrow screen is
not a persisted source break. It is a normal soft wrap inside source line 1812.
The correct artifact for this WI is this evidence package, not a RED test or a
code/data fix.
