# Source Typo Correction Ledger

This ledger records intentional, evidence-gated deviations from the source PDF
when the PDF itself carries an obvious orthographic typo. Each row follows the
GOAL #128 correction policy in
`docs/design/mental-models/goal128-source-typo-sweep.md`.

| id | location | screen | pdf_original | corrected | evidence | state | date | applied_by |
|----|----------|--------|--------------|-----------|----------|-------|------|------------|
| STC-001 | `src/data/loth/psalter/week-2.json` -> `days.FRI.vespers.intercessions[3]` (`:944`) | Week 2 · Friday · Vespers · Intercessions | PDF: `Эзэн, Та Өөрийн арл түмнийг нигүүлсэнэ үү.` (`scripts/out/psalter_layout.txt:5247`) | `Эзэн, Та Өөрийн ард түмнийг нигүүлсэнэ үү.` | E1: `арл` is a hapax non-word in this slot; E2: `д`/`л` is a one-glyph confusion; E3: `ард түмэн` is the standard collocation; E4: `ард түмн` dominates `арл түмн` in `src/data` (675:1). User-authorized PDF deviation: 2026-06-13. | `CORRECT` | 2026-06-13 | `dvo-test-co` / GOAL #128 |
