# GOAL #147 - Trinity Sunday Second Vespers concluding prayer implementation spec

Task: WI-158. This spec follows the WI-148 investigation in `docs/research/GOAL147-trinity-2vespers-collect.md`.

## Target outcome

`/api/loth/2026-05-31/vespers` and `/pray/2026-05-31/vespers` must render a `concludingPrayer` section for Trinity Sunday Second Vespers. The section should use the existing Trinity collect text already present in `trinitySunday.SUN.firstVespers`, including its optional prayer toggle.

The same data omission affects Trinity Lauds, so the recommended data patch should populate both `trinitySunday.SUN.lauds` and `trinitySunday.SUN.vespers2` from the existing Trinity collect fields. This is still a data-only correction; no Mongolian machine translation and no assembler change are required.

## Current failure

- `docs/research/GOAL147-trinity-2vespers-collect.md:7` records that `/api/loth/2026-05-31/vespers` currently returns no `concludingPrayer` section.
- `docs/research/GOAL147-trinity-2vespers-collect.md:14` records the user-visible symptom: after the Lord's Prayer, the page jumps directly to `ТӨГСГӨЛ`.
- `src/data/loth/propers/ordinary-time.json:3470` to `src/data/loth/propers/ordinary-time.json:3476` has the authoritative local Trinity `firstVespers` collect fields.
- `src/data/loth/propers/ordinary-time.json:3478` to `src/data/loth/propers/ordinary-time.json:3499` has Trinity `lauds` without `concludingPrayer`, `alternativeConcludingPrayer`, or page fields.
- `src/data/loth/propers/ordinary-time.json:3500` to `src/data/loth/propers/ordinary-time.json:3521` has Trinity `vespers2` without `concludingPrayer`, `alternativeConcludingPrayer`, or page fields.
- `src/lib/hours/vespers.ts:83` to `src/lib/hours/vespers.ts:95` only emits `concludingPrayer` when those fields exist in `ctx.mergedPropers`.
- `src/lib/hours/lauds.ts:112` to `src/lib/hours/lauds.ts:124` has the same gate for Lauds.

## Data patch

Patch only `src/data/loth/propers/ordinary-time.json`.

Copy these four fields from `trinitySunday.SUN.firstVespers` into `trinitySunday.SUN.lauds` and `trinitySunday.SUN.vespers2`:

```json
{
  "concludingPrayer": "Аяа, Эцэг минь, Та биднийг үнэн рүү авчрахын тулд Өөрийн Үгийг илгээсэн бөгөөд биднийг ариун болгохын тулд Өөрийн Сүнсийг илгээсэн билээ. Эдгээрээр дамжуулан бид Таны амьдралын далд нууцыг мэдэж эхэлсэн. Биднийг Танд итгэх итгэл бишрэлээ тунхаглаж, түүгээр амьдарснаараа Гурван бодгаль дахь ганц Тэнгэрбурханд мөргөхөд тусална уу. Тантай, Ариун Сүнсний нэгдэлтэй, үүрд мөнх оршин хаанчилдаг Тэнгэрбурхан Есүс Христ бидний Эзэн, Таны Хүүгээр уламжлан тийн болтугай.",
  "alternativeConcludingPrayer": "Аяа, Тэнгэрбурхан минь, бид Таныг магтан дуулж байна. Төгс хүчит Эцэг, Аврагч Эзэн Христ, Хайрын Сүнс минь, Та биднийг Өөрийн амьдрал болон хайрыг хуваалцахад удирддаг. Гурван бодгаль дахь ганц Тэнгэрбурхан Та Өөрийн дүр төрхөөр бүтээсэн хүмүүстэйгээ ойр дотно байж, Өөрийн хайраар амьд болгосон энэ дэлхий ертөнцтэй ойр дөт харилцаатай явна уу. Үүнийг бид үүрд мөнх, үнэн амьд цорын ганц Тэнгэрбурхан Эцэг, Хүү, Ариун Сүнсээр уламжлан гуйж байна.",
  "concludingPrayerPage": 745,
  "alternativeConcludingPrayerPage": 748
}
```

Do not add `concludingPrayerRich` or `alternativeConcludingPrayerRich` in this task. The existing working source for Trinity `firstVespers` is plain text, and there is no local Trinity rich-overlay file under `src/data/loth/prayers/seasonal/ordinary-time/`.

Do not modify `conditionalRubrics`, `gospelCanticleAntiphon`, or psalmody data. The Week-1 Sunday psalmody substitute for `vespers2` remains correct and unrelated to the missing collect.

## Test patch

Add targeted integration coverage in `src/lib/__tests__/movable-solemnity-vespers2.test.ts`, near the existing Trinity row and `/vespers` assertions.

Recommended helper reuse:

- Use the existing `section(hour, 'concludingPrayer')` helper from the file.
- Assert on the real assembler via `assembleHour('2026-05-31', 'vespers')`, matching the current test style.

Required assertions for Second Vespers:

```ts
const h = await assembleHour('2026-05-31', 'vespers')
expect(h).not.toBeNull()

const cp = section(h!, 'concludingPrayer')
expect(cp.text).toContain('Өөрийн Үгийг илгээсэн')
expect(cp.alternateText).toContain('Төгс хүчит Эцэг')
expect(cp.page).toBe(745)
expect(cp.alternatePage).toBe(748)
```

Add a Lauds assertion in the same file or a nearby Lauds-focused test, because the same PDF/source block supplies the collect for Morning Prayer:

```ts
const h = await assembleHour('2026-05-31', 'lauds')
expect(h).not.toBeNull()

const cp = section(h!, 'concludingPrayer')
expect(cp.text).toContain('Өөрийн Үгийг илгээсэн')
expect(cp.alternateText).toContain('Төгс хүчит Эцэг')
expect(cp.page).toBe(745)
expect(cp.alternatePage).toBe(748)
```

Keep the existing psalmody assertions unchanged:

- Trinity Second Vespers still returns `Psalm 110:1-5, 7`, `Psalm 114:1-8`, and `Revelation 19:1-7`.
- Trinity Lauds still returns Week-1 Sunday Lauds psalmody.

## Verification command

Run the narrow integration shard:

```bash
npx vitest run src/lib/__tests__/movable-solemnity-vespers2.test.ts --reporter=verbose
```

Optional manual API/page checks after the implementation:

- `/api/loth/2026-05-31/vespers` includes a `concludingPrayer` section after `ourFather` and before `dismissal`.
- `/pray/2026-05-31/vespers` displays `Төгсгөлийн даатгал залбирал` after the Lord's Prayer and before `ТӨГСГӨЛ`.
- The optional prayer control displays `Сонголтот залбирал`; this is rendered by `src/components/concluding-prayer-section.tsx:36` to `src/components/concluding-prayer-section.tsx:50` when `alternateText` exists.

## Non-goals

- Do not introduce a new resolver fallback that copies First Vespers collect data at runtime. The omission is localized data, and the assemblers already render the section correctly when fields exist.
- Do not change Trinity First Vespers psalmody here; GOAL #150 tracks that separately.
- Do not change rich-overlay extraction conventions in this task.
