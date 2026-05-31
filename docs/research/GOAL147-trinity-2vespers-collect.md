# GOAL #147 — Trinity Sunday 2nd Vespers concluding collect investigation

Task: WI-148, read-only research. Date under investigation: `2026-05-31`, Trinity Sunday / Solemnity, route `/pray/2026-05-31/vespers`.

## Findings summary

[D1] Confirmed. The rendered Second Vespers route is `/pray/2026-05-31/vespers`; `secondVespers` is not a valid public hour. The API for `/api/loth/2026-05-31/vespers` returns section types:

```text
openingVersicle, hymn, psalmody, shortReading, responsory, gospelCanticle,
intercessions, ourFather, dismissal
```

There is no `concludingPrayer` section. A Playwright capture of the page found the Second Vespers Magnificat antiphon, but did not find either `Төгсгөлийн даатгал залбирал` or the collect incipit `Аяа, Эцэг минь`; after the Lord's Prayer the page jumps directly to `ТӨГСГӨЛ`.

[D1] Root cause: `src/data/loth/propers/ordinary-time.json` has Trinity `firstVespers.concludingPrayer` and `alternativeConcludingPrayer`, but the sibling `lauds` and `vespers2` blocks have only the gospel-canticle antiphon and psalmody substitute rubric. The assembler correctly routes movable Solemnity `/vespers` to `vespers2`, but because `vespers2` has no concluding-prayer fields, `assembleVespers` never pushes the section.

[D1] Additional observed gap: `/api/loth/2026-05-31/lauds` also lacks `concludingPrayer`. The user-facing issue was reported for Second Vespers, but the same data omission affects Lauds. `/api/loth/2026-05-31/firstVespers` does have the primary and optional concluding prayers.

[D2] Reuse of the existing firstVespers/PDF collect is liturgically appropriate. GILH no. 199 says Morning Prayer and Evening Prayer use the proper concluding prayer on solemnities, and nos. 226-227 specify that Evening Prayer I/II and Morning Prayer on solemnities have proper concluding prayers. For this local source, the PDF prints one Trinity concluding prayer plus one optional prayer immediately after the Lauds Benedictus antiphon and before the Second Vespers heading; those exact strings are already present in `firstVespers`. No Mongolian machine translation is needed.

## Evidence

Route validity:

- Valid hours are `lauds`, `vespers`, `compline`, `firstVespers`, and `firstCompline` in `src/app/pray/[date]/[hour]/page.tsx:17` and `src/app/api/loth/[date]/[hour]/route.ts:6`.
- `/api/loth/2026-05-31/secondVespers` returns `Invalid hour: secondVespers...`.
- Movable Solemnity Second Vespers is intentionally rendered through ordinary `/vespers`: `src/lib/loth-service.ts:168` to `src/lib/loth-service.ts:195` swaps `seasonPropers` to `getSeasonVespers2(...)`.

Data shape:

- Trinity `firstVespers` carries `concludingPrayer`, `alternativeConcludingPrayer`, and page fields at `src/data/loth/propers/ordinary-time.json:3470` to `src/data/loth/propers/ordinary-time.json:3476`.
- Trinity `lauds` begins at `src/data/loth/propers/ordinary-time.json:3478`; it has `gospelCanticleAntiphon`, `gospelCanticleAntiphonPage`, and `conditionalRubrics`, but no concluding-prayer fields before it closes at `src/data/loth/propers/ordinary-time.json:3499`.
- Trinity `vespers2` begins at `src/data/loth/propers/ordinary-time.json:3500`; it has `gospelCanticleAntiphon`, `gospelCanticleAntiphonPage`, and `conditionalRubrics`, but no concluding-prayer fields before it closes at `src/data/loth/propers/ordinary-time.json:3521`.
- There is no Trinity rich overlay file under `src/data/loth/prayers/seasonal/ordinary-time/`; the rich loader special-key path would look for `wtrinitySunday-<DAY>-<hour>.rich.json` and does not fall through when absent (`src/lib/prayers/rich-overlay.ts:122` to `src/lib/prayers/rich-overlay.ts:148`).

Assembler/render path:

- `getSeasonVespers2` returns `weeks[specialKey]?.SUN.vespers2` for movable solemnities in `src/lib/propers-loader.ts:310` to `src/lib/propers-loader.ts:320`.
- Psalter commons are loaded first, then `seasonPropers` are spread on top in `src/lib/loth-service.ts:625` to `src/lib/loth-service.ts:642`. Week 1 Sunday commons do not supply a concluding prayer in `src/data/loth/psalter/week-1.json:5` to `src/data/loth/psalter/week-1.json:93`, so there is no fallback collect for Trinity Lauds.
- `assembleVespers` only pushes a concluding-prayer section if `ctx.mergedPropers.concludingPrayer` or `ctx.mergedPropers.concludingPrayerRich` exists (`src/lib/hours/vespers.ts:83` to `src/lib/hours/vespers.ts:95`).
- `assembleLauds` has the same gate (`src/lib/hours/lauds.ts:112` to `src/lib/hours/lauds.ts:124`).
- The React page only renders `ConcludingPrayerSection` when a `concludingPrayer` section exists (`src/components/prayer-renderer.tsx:95` to `src/components/prayer-renderer.tsx:98`).
- `ConcludingPrayerSection` renders the heading `Төгсгөлийн даатгал залбирал`, the page reference, primary text/rich content, and optional-prayer toggle when present (`src/components/concluding-prayer-section.tsx:16` to `src/components/concluding-prayer-section.tsx:50`).

PDF/source text:

- The Trinity PDF section prints First Vespers Magnificat at `parsed_data/full_pdf.txt:25880` to `parsed_data/full_pdf.txt:25885`, then Lauds Benedictus at `parsed_data/full_pdf.txt:25886` to `parsed_data/full_pdf.txt:25891`.
- It then prints `Төгсгөлийн даатгал залбирал` and the primary collect at `parsed_data/full_pdf.txt:25892` to `parsed_data/full_pdf.txt:25911`.
- It prints `Сонголтот залбирал` at `parsed_data/full_pdf.txt:25912` to `parsed_data/full_pdf.txt:25923`.
- It then starts `2 дугаар Оройн даатгал залбирал` at `parsed_data/full_pdf.txt:25924`; no separate Second Vespers collect is printed before the next solemnity heading begins at `parsed_data/full_pdf.txt:25940`.

Liturgical norm:

- General Instruction of the Liturgy of the Hours no. 199: Morning Prayer and Evening Prayer use the proper concluding prayer on solemnities.
- GILH no. 226: at Evening Prayer I and II of solemnities, the concluding prayer is proper.
- GILH no. 227: at Morning Prayer of solemnities, the concluding prayer is proper.
- Source consulted: EWTN mirror of the General Instruction, lines around nos. 199 and 226-227: https://www.ewtn.com/catholicism/library/general-instruction-on-the-liturgy-of-the-hours-2175

## Proposed fix scope

Data-only, no translation:

1. Copy the existing Trinity `firstVespers.concludingPrayer`, `alternativeConcludingPrayer`, `concludingPrayerPage`, and `alternativeConcludingPrayerPage` into `trinitySunday.SUN.lauds`.
2. Copy the same fields into `trinitySunday.SUN.vespers2`.
3. Do not invent `concludingPrayerRich` unless a later rich-overlay extraction task creates `wtrinitySunday-SUN-lauds.rich.json` / `wtrinitySunday-SUN-vespers.rich.json` or an explicit vespers2-rich convention. Plain text is already the current working source for `firstVespers`.

Suggested verification after the fix:

- `/api/loth/2026-05-31/lauds` and `/api/loth/2026-05-31/vespers` both include section type `concludingPrayer`.
- `/pray/2026-05-31/vespers` displays `Төгсгөлийн даатгал залбирал` after the Lord's Prayer and before `ТӨГСГӨЛ`.
- Existing `src/lib/__tests__/movable-solemnity-vespers2.test.ts` should gain an assertion that Trinity Second Vespers includes `concludingPrayer.text` containing `Аяа, Эцэг минь`.
