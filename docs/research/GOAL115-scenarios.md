# GOAL #115 — Scenario elaboration (Step 2)

> Input: `docs/design/mental-models/goal115-lords-prayer-rubric-amen-removal.md` (Step-1 MM).
> Scenarios mapped to AC **[D1] / [D2] / [D3]** as happy / failure(regression) / edge.
> Authored by `dvo-ref`. English prose; Mongolian-Cyrillic source strings quoted verbatim.

GOAL: in Lauds (아침기도) and Vespers (저녁기도), (1) remove the Lord's-Prayer
guidance cue rendered after the intercessions, and (2) drop the trailing
"Амэн." from the Lord's Prayer body — both because the next section follows
immediately.

---

## ⚠️ Step-2 escalation of MM §6 (empirically resolved)

The Step-1 MM flagged the legacy `items[]` render path as a "verify" item.
**Step-2 empirical scan (faithful port of `parseIntercessions` over all 172
intercessions blocks) resolves it as a MUST-HANDLE case, not optional:**

| metric | count |
|--------|-------|
| total intercessions blocks (psalter w1-4 + propers + sanctoral) | 172 |
| blocks where parser sets `closing` (Lord's-Prayer incipit cue present) | 53 |
| blocks routing to **legacy `items[]` path** (`petitions.length === 0`) | 11 |
| ↳ of those, blocks that **also** carry the closing incipit | **3** |

The 3 legacy-path + incipit blocks are **real Lauds/Vespers**:
- `week-3.json days.SUN.lauds`
- `week-4.json days.SUN.lauds`
- `week-4.json days.MON.vespers`

Root mechanism: these blocks have `" - "` separators but **no `:` colon**, so
`parseIntercessions`'s intro loop (which only terminates on `:` or the closing
line, `intercessions.ts:59-95`) swallows the entire body into `introduction`,
leaving `petitions = []`. The component then takes the **legacy path**
(`petitions.length > 0` is false → `intercessions-section.tsx:145-176`), which
re-renders the **raw `section.items`** as `— {item}` bullets — *including* the
final `"Тэнгэр дэх Эцэг минь ээ..."` incipit as a plain bullet (NOT the
guillemet `«…»` form).

**Consequence for the fix:** removing only the structured-path `«closing»`
block (`intercessions-section.tsx:139-143`) leaves the cue visible on these 3
pages. **The render-layer fix MUST also filter the closing incipit out of the
legacy `items[]` rendering** (reuse the `"Тэнгэр дэх Эцэг"` prefix predicate,
i.e. the parser's `isClosingLine`). The other 8 legacy blocks have no incipit,
so the filter is a safe no-op for them.

---

## [D1] — Guidance rubric removed after intercessions

### [D1-happy-structured] Structured-path block (50 blocks; the common case)
- **Precondition:** Lauds/Vespers whose intercessions parse to `petitions > 0`
  and a `closing` incipit (e.g. `week-1.json days.SUN.lauds`).
- **Action:** Render the page after the fix.
- **Expected:** After the last petition (and its `- response`), **no**
  `«"Тэнгэр дэх Эцэг минь ээ..."»` italic cue line; the Lord's Prayer heading
  (`Эзэний даатгал залбирал`) follows directly.
- **Verify (1 line):** Playwright — assert the rendered intercessions section
  contains no text matching `«…Тэнгэр дэх Эцэг…»`; component test on a section
  with `closing` set asserts the guillemet `<p>` is absent.

### [D1-happy-legacy] Legacy-path block carrying the incipit (the 3 blocks)
- **Precondition:** `week-3 SUN lauds` / `week-4 SUN lauds` / `week-4 MON
  vespers` (`petitions === 0`, incipit present).
- **Action:** Render the page after the fix.
- **Expected:** The trailing `— "Тэнгэр дэх Эцэг минь ээ..."` bullet is **gone**;
  remaining intercession lines unchanged; Lord's Prayer heading follows.
- **Verify (1 line):** Playwright on `week-4 SUN lauds` (date that resolves to
  it) — assert no list item text contains `Тэнгэр дэх Эцэг минь ээ`; component
  test with `petitions: [], items: [...,incipit]` asserts the incipit bullet is
  not rendered.

## [D2] — Lord's Prayer ends without "Амэн."

### [D2-happy]
- **Precondition:** Any Lauds/Vespers page (`OurFatherSection` is hardcoded,
  shared by both hours; `our-father-section.tsx`).
- **Action:** Render the Lord's Prayer section after the fix.
- **Expected:** The body's final sentence is `…харин хорон муу бүхнээс
  гэтэлгэн соёрхоно уу.` with **no** trailing ` Амэн.` (token is `Амэн` with
  `э`, not `Амен`); the concluding prayer (`Төгсгөлийн залбирал`) follows
  directly.
- **Verify (1 line):** Playwright — assert the Lord's-Prayer paragraph text does
  not end with `Амэн`; component test asserts `OurFatherSection` output excludes
  `Амэн` while retaining the body.

## [D3] — Regression / failure scenarios (what must NOT change)

### [D3-a] Intercession bodies unchanged; zero petition leakage
- **Precondition:** Structured-path block with petitions + responses.
- **Action:** Apply the render-layer fix (NOT a parse-layer change).
- **Expected:** Every petition `versicle` and `- response` renders exactly as
  before; the incipit never leaks into a petition. (This is the recorded reason
  the **parse-layer** approach is rejected — dropping `closing` detection in
  `parseIntercessions` would re-attach the incipit to the last petition's
  response.)
- **Verify (1 line):** Component test — snapshot/assert petition+response text
  identical pre/post fix on `week-1 SUN lauds`.

### [D3-b] Lord's Prayer & concluding-prayer bodies otherwise unchanged
- **Precondition:** `our-father-section.tsx` + concluding-prayer render.
- **Action:** Remove only ` Амэн.` (preceding space + token + period).
- **Expected:** All other Lord's-Prayer words unchanged; concluding-prayer body
  fully unchanged (the amen edit touches nothing in `concluding-prayer-section`).
- **Verify (1 line):** Component test asserts Lord's-Prayer body minus `Амэн`
  equals the original body string; concluding-prayer test unaffected.

### [D3-c] `/ordinarium` reference page keeps its standalone Lord's-Prayer "Амэн" (out of scope)
- **Precondition:** `/ordinarium` page (renders `ordinarium.json` +
  `ordinarium/common-prayers.json`).
- **Action:** Apply the GOAL #115 fix (which touches only the prayer-hour
  components).
- **Expected:** The reference page's standalone Lord's Prayer
  (`common-prayers.json:9`, `ordinarium.json:341`) **still ends with "Амэн."**
  — it is a standalone prayer, liturgically correct, and `loaders.ts:31-50` does
  NOT load top-level `ordinarium.json` into the hour build, so the prayer-hour
  fix cannot and must not affect it.
- **Verify (1 line):** Read assertion — `common-prayers.json` Lord's-Prayer
  string still contains `Амэн.` after the change; grep diff touches no
  `src/data/loth/ordinarium*` files.

### [D3-d] Compline unaffected
- **Precondition:** Compline page.
- **Action:** Apply the fix.
- **Expected:** No change — Compline includes neither intercessions nor the
  Lord's Prayer (`compline.test.ts:90-93`).
- **Verify (1 line):** Existing `compline.test.ts` still green (no
  intercessions/ourFather sections).

## [edge] Legacy `items[]` render path must not leak the cue
- **Precondition:** the 3 legacy-path + incipit blocks above (+ forward-safety
  for any future separator-less block that gains an incipit).
- **Action:** Apply the render-layer fix that handles BOTH the structured
  `«closing»` block AND the legacy `items[]` path.
- **Expected:** No Lord's-Prayer incipit appears via either render path on any
  of the 172 blocks.
- **Verify (1 line):** Component test driving the legacy path
  (`petitions: []`, `items` ending in the incipit) asserts the incipit is not
  rendered; an invariant/data test may additionally assert "no block routes to
  legacy path while carrying an incipit that survives the filter."

---

## Verification-method summary

- **Mechanism (necessary, not sufficient):** component tests on
  `intercessions-section.tsx` (both render paths) + a Lord's-Prayer unit test.
- **Outcome ([D3] gate, sufficient):** Playwright on real Lauds/Vespers pages —
  text-absence assertions for the guillemet cue, the legacy-path incipit bullet,
  and the trailing `Амэн`, plus a screenshot of the intercessions → Lord's
  Prayer → concluding-prayer region. (Existing-SW-cache / A2HS upgrade remains
  the documented manual-only exception.)
- **CACHE bump:** component-output change → bump `divine-office-v43 → v44`
  (`public/sw.js:511`); navigation stays `network-only`.

## Handoff to Step 3 (Spec/Design lock)
1. The fix is **render-layer, dual-path** (structured `«closing»` removal +
   legacy `items[]` incipit filter). This is now a hard requirement, not a
   "verify" — backed by the 3 concrete blocks above.
2. Keep `parseIntercessions` unchanged (preserves petition boundaries; [D3-a]).
3. Assign the next FR number; add PRD + traceability-matrix rows.
