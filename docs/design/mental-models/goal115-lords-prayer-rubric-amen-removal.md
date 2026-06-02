# MM — GOAL #115: Remove Lord's-Prayer guidance rubric after intercessions + drop trailing "Амэн" from the Lord's Prayer

> Mental Model (Step 1) for TEAM GOAL #115. Authored by `dvo-ref`.
> Two screen-output changes in the prayer-hour render flow
> (Гуйлтын залбирал → Эзэний даатгал залбирал → Төгсгөлийн залбирал).
> Code authored in English prose; Mongolian-Cyrillic source strings are
> quoted verbatim as exceptions.

---

## Intended behavior

In the prayer-hour render flow, after the intercessions (청원기도, Гуйлтын
залбирал) the Lord's Prayer (주님의 기도, Эзэний даатгал залбирал) follows
**immediately** with no intervening guidance cue, and the Lord's Prayer
itself ends **without a trailing "Амэн."** because the concluding prayer
(마침기도, Төгсгөлийн залбирал) follows immediately.

Both changes are confined to the two hours that actually render
intercessions + the Lord's Prayer: **Lauds (아침기도) and Vespers
(저녁기도)**. Compline does not include either section (see Scope below).

## Observable outcome (user perception)

On a Lauds or Vespers page (e.g. `/pray/{date}/lauds`):

1. **No "<< >>" guidance rubric after the intercessions.** Today the
   intercessions section ends with a guillemet-wrapped Lord's-Prayer incipit
   cue rendered as `«"Тэнгэр дэх Эцэг минь ээ..."»` (italic). After the fix
   this line is gone — the intercessions section ends with its last petition
   (and any structured response), and the Lord's Prayer section begins
   directly below.
2. **The Lord's Prayer ends without "Амэн."** Today the hardcoded body ends
   `...харин хорон муу бүхнээс гэтэлгэн соёрхоно уу. Амэн.` After the fix the
   final sentence is `...гэтэлгэн соёрхоно уу.` with no "Амэн.", and the
   concluding prayer follows.

(Visual proof is by Playwright screenshot — see Design contract §4.)

## Non-goals

- **No text change to the Lord's Prayer or concluding prayer body** beyond
  deleting the single trailing "Амэн." token (and its preceding space) in the
  Lord's Prayer.
- **No change to intercession petition bodies** — only the trailing
  Lord's-Prayer cue line is suppressed, never a petition/versicle/response.
- **No change to the `/ordinarium` reference page** (`src/data/loth/ordinarium.json`
  + `ordinarium/common-prayers.json`). Those carry a *standalone* Lord's Prayer
  (with its liturgically-correct "Амэн.") and explanatory rubrics for a
  different surface; they are NOT the prayer-hour render path (see Findings §C).
  This GOAL is about the *flow* in Lauds/Vespers where the Lord's Prayer is
  immediately followed by the concluding prayer.
- **No structural change to other hours** (Compline already excludes both
  sections; no other hour assemblers exist).
- **No machine translation / guessing.** Only deletion of existing tokens; no
  new Mongolian text is authored.

## AC link

Implements GOAL #115 acceptance criteria **[D1][D2][D3]**:
- **[D1]** Guidance rubric (`«…»` Lord's-Prayer cue) no longer appears after
  the intercessions in Lauds/Vespers.
- **[D2]** Lord's Prayer body ends without trailing "Амэн." in Lauds/Vespers.
- **[D3]** Both changes verified on the real rendered screen (not mechanism-only).

---

## Findings — verified code/data map (grep + Read)

### A. Render order is data-driven; sequence already correct

`PrayerRenderer` (`src/components/prayer-renderer.tsx:33-101`) maps over
`hour.sections[]` in array order. The order
`…gospelCanticle → intercessions → ourFather → concludingPrayer → dismissal`
is fixed by the hour assemblers:
- `src/lib/hours/lauds.ts:77-118` — pushes `intercessions` (L79), then
  `{ type: 'ourFather' }` (L93), then `concludingPrayer` (L117).
- `src/lib/hours/vespers.ts` — identical pattern (intercessions → ourFather
  L70 → concludingPrayer).

So intercessions is *already* immediately followed by the Lord's Prayer, which
is *already* immediately followed by the concluding prayer. The two targets are
purely the two extra cues, not the ordering.

### B. Target 1 — the "<< >>" guidance rubric = intercessions `section.closing`

- `OurFatherSection` (`src/components/prayer-sections/our-father-section.tsx`)
  takes **no props and reads no data** — it is fully hardcoded. So the cue is
  NOT inside the Lord's Prayer component.
- The cue is the intercessions **`closing`** field, rendered with guillemets:
  `src/components/prayer-sections/intercessions-section.tsx:139-143`
  ```tsx
  {section.closing && (
    <p className="mt-3 font-serif italic text-stone-700 dark:text-stone-300">
      «{section.closing}»
    </p>
  )}
  ```
- `closing` is produced by `parseIntercessions`
  (`src/lib/hours/intercessions.ts:117-127`): the parser splits off the trailing
  data line(s) whose text (after stripping `"'""«»` chars) **starts with the
  prefix `"Тэнгэр дэх Эцэг"`** (`CLOSING_PREFIX`, L27) — i.e. the Lord's-Prayer
  incipit. Set into the section by `lauds.ts:86` / `vespers.ts` (`closing: parsed.closing`).
- Concrete data confirmation — `src/data/loth/psalter/week-1.json:90` (SUN Lauds
  intercessions array) last element:
  ```json
  "“Тэнгэр дэх Эцэг минь ээ...”"
  ```
  → parsed as `closing` → rendered as `«"Тэнгэр дэх Эцэг минь ээ..."»`.
- The dispatch's literal `<< >>` corresponds to the component's guillemets
  `« »` (U+00AB/U+00BB). No literal `<<`/`>>` ASCII markers exist in the
  prayer source/data (`git grep "<<|>>"` → none in components/psalter).

**Render-path nuance (must be handled by the fix):** the intercessions
component has TWO render paths:
- **Structured path** (`petitions.length > 0`, L89-144) — renders `«closing»`
  at L139-143. This is the path exercised by real psalter/propers data, which
  all use `" - "` / `" — "` petition separators (see `intercessions.ts` header
  doc + week-1 sample). The closing incipit is *excluded* from `petitions` by
  the parser, so suppressing the L139-143 block fully removes the cue here.
- **Legacy `items[]` path** (`petitions.length === 0`, L145-176) — renders the
  raw `section.items` (which still contains the incipit as its last element,
  `lauds.ts:82 items: ctx.mergedPropers.intercessions`) as plain `— {item}`
  bullets. If any intercessions block ever yields zero petitions, the incipit
  would surface here as a bullet. **Design contract requires the fix to cover
  this path too** (filter the closing incipit), OR a test proving no
  intercessions data routes to the legacy path. (Strong evidence the legacy
  path is dormant, but it must be confirmed, not assumed.)

### C. Target 2 — trailing "Амэн" = hardcoded token in `OurFatherSection`

- Exact location: `src/components/prayer-sections/our-father-section.tsx:12`
  (last sentence of the hardcoded `<p>`):
  ```
  …харин хорон муу бүхнээс гэтэлгэн соёрхоно уу. Амэн.
  ```
- **Spelling correction vs dispatch:** the actual token is **`Амэн`** (with
  `э`), NOT `Амен` (with `е`) as the dispatch text wrote. The fix removes
  ` Амэн.` (leading space + token + period), leaving `…соёрхоно уу.`
- Because `OurFatherSection` is hardcoded and shared by both Lauds and Vespers,
  this single edit covers both hours.
- The Lord's Prayer copies in `ordinarium/common-prayers.json:9` and
  `ordinarium.json` also end in `Амэн.` — these are the `/ordinarium` reference
  page surface (loaded by `src/app/ordinarium/page.tsx`), **out of scope** (see
  Non-goals). The prayer-hour `OurFatherSection` does NOT consume them.

### D. Scope confirmation — Lauds + Vespers only

- Only three hour assemblers exist (`src/lib/hours/index.ts:7-11`): `lauds`,
  `vespers`, `compline`.
- Only `lauds.ts` and `vespers.ts` push `{ type: 'ourFather' }` and build the
  `intercessions` section. Compline includes neither (asserted by
  `src/lib/__tests__/hours/compline.test.ts:90-93`).
- No office-of-readings / daytime / midday assembler exists. → Both removals
  apply uniformly to **Lauds and Vespers**, and there is no per-hour
  divergence to worry about.

### E. `ordinarium.json` rubrics are NOT in the render path

`src/data/loth/ordinarium.json:319,324-325,341,350` contain richer
Lord's-Prayer rubrics (e.g. `"Гуйлтын залбирлын дараа бүгдээрээ "Тэнгэр дэх
Эцэг минь ээ"…"`). `src/lib/hours/loaders.ts:31-50` loads ONLY
`ordinarium/{invitatory, invitatory-antiphons, canticles, common-prayers,
compline}.json` — it does **not** load top-level `ordinarium.json`. Those
rubrics render on the `/ordinarium` reference page, not in Lauds/Vespers.
→ Out of scope; no action.

---

## Core questions (the MM answers)

**Q1. Is the guidance rubric data or component? Common across all hours?**
- It is **component render of a data-derived field**: the
  `intercessions-section.tsx` `«{section.closing}»` block (component), where
  `closing` is parsed from data (`parseIntercessions` prefix-match on
  `"Тэнгэр дэх Эцэг"`). It is common to every Lauds/Vespers whose intercessions
  data carries the incipit cue line (the standard case across psalter weeks 1-4
  + propers + sanctoral). Recommended removal is at the **component render
  layer** (single SSOT point), NOT per-data-file.

**Q2. Is "Амэн" inside the Lord's Prayer body string or a separate field?
Does removal affect other amens?**
- It is an inline token at the **end of the hardcoded body string**
  (`our-father-section.tsx:12`), not a separate field. Removing ` Амэн.` there
  affects ONLY the prayer-hour Lord's Prayer (Lauds/Vespers). It does **not**
  touch: the many other `Амэн.` occurrences in `ordinarium.json` /
  `common-prayers.json` (gloryBe, blessings, reference-page Lord's Prayer), nor
  any Bible-text `Амен`. The edit is a literal string deletion scoped to one
  component line — zero blast radius beyond the two target hours.

---

## Design contract (draft — for Step 3 lock)

### 1. Removal target & approach

| # | Target | File:line | Approach (recommended) |
|---|--------|-----------|------------------------|
| D1 | "<< >>" Lord's-Prayer cue | `src/components/prayer-sections/intercessions-section.tsx:139-143` (structured path) + legacy `items[]` path L145-176 | **Render-layer removal.** Delete the `{section.closing && (…«closing»…)}` block in the structured path. For the legacy path, filter out the closing-incipit item (reuse the same `"Тэнгэр дэх Эцэг"` prefix predicate) **or** add a test proving no data routes to the legacy path. Keep `parseIntercessions` `closing` detection intact so petition boundaries stay correct (do NOT change the parser). |
| D2 | Trailing "Амэн." | `src/components/prayer-sections/our-father-section.tsx:12` | Delete ` Амэн.` (space + token + period); leave `…соёрхоно уу.` |

**Rejected alternatives (rationale recorded so Step 3 doesn't relitigate):**
- *Parse-layer* (stop populating `closing`): REJECTED — the parser currently
  flushes the in-progress petition when it hits the closing line; dropping
  detection would leak the incipit into the last petition's response. Regression
  risk on petition rendering.
- *Data-layer* (delete the incipit line from every intercessions array):
  REJECTED — high touch count (14 blocks × 4 psalter weeks + propers + sanctoral),
  error-prone, and the closing line also drives the parser's petition-flush
  boundary. The render-layer fix is one SSOT edit.

### 2. SW cache (`public/sw.js`)

- Current: `const CACHE_VERSION = 'divine-office-v43'` (`public/sw.js:511`).
- This is a **component-output change** (built JS chunk content changes), not a
  link/URL/asset-path/Content-Type change. Per project CLAUDE.md the SW
  precaches built chunks; to avoid stale chunks serving the old render to
  returning users, **bump `divine-office-v43` → `divine-office-v44`**. Navigation
  remains `network-only` (no change to SW logic). Confirm the bump in the
  Step 6 develop diff.

### 3. Tests (Step 4/5/7)

- **Unit (`intercessions-section.test.ts`)**: assert that a section with a
  `closing` value renders **no** `«…»` cue (negative assertion on the guillemet
  text / a `data-role`); assert petitions still render. Add a legacy-path case
  (petitions empty, items include the incipit) asserting the incipit is not
  shown.
- **Unit (Lord's Prayer)**: assert `OurFatherSection` output does not end with
  `Амэн` (and still contains the body). Note the spelling is `Амэн` (э).
- Tag with `@fr` per CLAUDE.md `@fr` convention (assign the next FR number for
  this change at Step 3).
- These are component/unit (mechanism) tests — necessary but **not sufficient**
  per [D3].

### 4. Playwright visual verification (the [D3] outcome gate)

Per project CLAUDE.md, UI changes are verified by Playwright (not deferred to
the user). Acceptance plan:
- `npm run dev`; open a Lauds page and a Vespers page that carry intercessions.
- Screenshot the intercessions → Lord's Prayer → concluding-prayer region.
- Assert on the rendered DOM/screenshot: (a) no guillemet `«"Тэнгэр дэх Эцэг
  минь ээ…"»` cue between the last petition and the Lord's Prayer heading
  (`Эзэний даатгал залбирал`); (b) the Lord's Prayer paragraph text does not
  end with `Амэн`.
- Check console clean. (Existing-SW-cache / A2HS upgrade is the documented
  manual-only exception — flag for the user only if a returning-user cache
  scenario must be validated.)

### 5. Files expected to change (Step 6)

- `src/components/prayer-sections/our-father-section.tsx` (drop ` Амэн.`)
- `src/components/prayer-sections/intercessions-section.tsx` (suppress `«closing»`
  render; handle/verify legacy path)
- `public/sw.js` (`CACHE_VERSION` v43 → v44)
- `src/components/prayer-sections/__tests__/intercessions-section.test.ts`
  (+ a Lord's-Prayer unit test) and an e2e/acceptance spec
- `docs/PRD.md` + `docs/traceability-matrix.md` (new FR row, per CLAUDE.md FR rules)

### 6. Open verification item handed to Step 2/3

Confirm empirically whether any intercessions data block yields zero petitions
(routing to the legacy `items[]` render path). If yes → the fix must filter the
closing incipit in that path; if provably no → structured-path removal alone is
complete, recorded with the proving test.
