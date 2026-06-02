# Mental Model — Psalm 63 Lauds Caption Reposition (body → post-title header) (GOAL #130)

> Blueprint SSOT. Root-cause analysis + fix plan = `docs/research/GOAL116-rootcause-fixplan.md`
> (#116, peer + adversarial review PASS at #128/#129). This document **consolidates** that
> locked analysis into the implementation GOAL's intent / observable outcome / non-goals /
> AC link / design contract. It introduces **no new investigation** — the design is frozen.
> Detailed spec/design lock happens at Step 3 (#133), taking this MM's **Design contract** as input.
>
> Author: dvo-plan-cl (research, task #131 / `[#130-sub-1]`). **FAST-TRACK consolidation** —
> design already locked & adversarially reviewed at #116; re-investigation prohibited per dispatch.
> Authored in English with Mongolian original liturgical text quoted verbatim (citation exception).

---

## Intended behavior (의도된 동작)

For Psalm 63:2-9 (2026-05-31 **Lauds** first psalm), the two-line caption
`Гэм нүглийн харанхуйгаас салсан хэнбугай ч` / `Тэнгэрбурханыг хүсэн тэмүүлнэ.` is rendered in the
**header/caption slot after the psalm title**, NOT as the first stanza of the psalm body.

Root cause: the extractor `scripts/extract-psalm-texts.js::extractPsalmBody` skips the title line(s)
but only skips a post-title caption when it ends with a **parenthetical citation** (the epigraph
pattern handled by `skipEpigraph`). Psalm 63's two lines carry **no parenthetical citation**, so
`skipEpigraph` returns the start index unchanged and the body-collection loop stores both lines into
`bodyLines` — which is why `psalter-texts.json` and `psalter-texts.rich.json` currently hold the
caption as the psalm's first stanza.

The fix adds a **Psalm-63 exact-text / ref-keyed skip rule** in `extractPsalmBody` (immediately after
the title skip, before body collection) so the caption is excluded from the body, AND **preserves**
the caption as a `psalter-headers.rich.json` entry that the renderer already draws after the title.

Key discriminator: the skip is keyed on **`ref === "Psalm 63:2-9"` + the exact two source lines**,
NOT a shape-only heuristic. Case/indentation shape is explicitly **not** the gate.

---

## Observable outcome (관찰 가능한 결과 — 사용자 지각)

Screen order for the 2026-05-31 Lauds first psalm becomes:

1. Title `Тэнгэрбурханаар цангаж буй сэтгэл`
2. Caption (2 lines) `Гэм нүглийн харанхуйгаас салсан хэнбугай ч` / `Тэнгэрбурханыг хүсэн тэмүүлнэ.`
3. Body first line `Тэнгэрбурхан, Та миний Тэнгэрбурхан`

- The caption **no longer intrudes above the body** and no longer appears as the body's first
  rendered line.
- The caption is **preserved** (relocated, not deleted) — it remains visible between title and body.
- The first-psalm antiphon is unchanged — it stays sourced from `week-1.json` `default_antiphon`.
- (developer perception) After re-extraction, `Psalm 63:2-9` `stanzas[0][0]` ===
  `Тэнгэрбурхан, Та миний Тэнгэрбурхан`, and the two negative-guard refs
  (`Revelation 19:1-7` → `Аллэлуяа!`, `Psalm 139:1-18` → `I`) are **unchanged**.

---

## Non-goals (비목표)

- **Caption deletion is FORBIDDEN** — preservation is mandatory. The two lines exist in the PDF
  original (`parsed_data/full_pdf.txt:1812-1813`); the user intent is **reposition, not removal**.
- **Shape-only heuristic FORBIDDEN** — a generic "two-unindented-then-indented" rule would corrupt
  the legitimate body starts of `Revelation 19:1-7` (`Аллэлуяа!`) and `Psalm 139:1-18` (`I`), whose
  first lines share that shape but are genuine body text (Rev 19 starts its body right after the ref;
  Ps 139's epigraph ends with `(Ром 11:34)` then the `I` part-marker begins the body).
- **`week-1.json` is invariant** — its ref / title / antiphon mapping is already correct and is **not**
  a change target.
- **`/ordinarium` reference page is unrelated** — out of scope.
- **No machine translation / no guessing** — any retained text must come from the PDF original only;
  not one character is generated or corrected.

---

## AC link (GOAL #130 description — DOGFOODING AC)

- **[D1]** On the Lauds Psalm 63 screen, `Гэм нүглийн … тэмүүлнэ.` is shown **after the title** (not
  as the body's first stanza), and the body first line is `Тэнгэрбурхан, Та миний Тэнгэрбурхан`.
  — user-facing / `semantic` (real-screen acceptance).
- **[D2]** The caption is **not deleted** — it is preserved as a post-title header. — user-facing /
  `structural` (header entry present + rendered).
- **[D3]** Legitimate body starts sharing the same 2-line signature (`Revelation 19:1-7`,
  `Psalm 139:1-18`) are **unchanged**. — `executable` (negative-guard regression).

> Note: the GOAL description spells the second caption word `тэмүүлэнэ`; the PDF original and
> production data spell it `тэмүүлнэ` (`parsed_data/full_pdf.txt:1813`,
> `parsed_data/week1/week1_final.txt:338`). Assertions and the preserved header MUST use the data
> spelling `тэмүүлнэ`; the AC quote is the user's verbatim wording.

---

## Design contract (Step 3 #133 input — from #116 reviewed fix plan)

### C1. Skip-rule discriminator (the core design invariant)
The new skip rule fires **only** when `ref === "Psalm 63:2-9"` **and** the next two meaningful lines
are exactly `Гэм нүглийн харанхуйгаас салсан хэнбугай ч` / `Тэнгэрбурханыг хүсэн тэмүүлнэ.`. On match,
the body-collection start index advances past those two lines. The existing `skipEpigraph`
(parenthetical-citation epigraphs) is **kept** for its original purpose. A general
"two-unindented-then-indented" shape heuristic is **prohibited** — it would damage `Revelation 19:1-7`
and `Psalm 139:1-18` (C4 negative guards).
Placement: in `extractPsalmBody`, **after** the title skip and **before** body collection
(`scripts/extract-psalm-texts.js:273-349`, title skip `:277-299`, epigraph skip `:301-304`,
body loop `:306-329`).

### C2. Caption preservation (deletion prohibited — mandatory path)
Add a `Psalm 63:2-9` entry to `src/data/loth/prayers/commons/psalter-headers.rich.json` (currently
absent — `rg` for the caption returns `exit=1`) so the caption is rendered **after the title and
before the first stanza**. The renderer already draws a post-title `headerRich` block
(`src/components/psalm-block.tsx:81-114`, stanza render `:117-240`); simple deletion is forbidden.
**Nuance (Step 3 must resolve):** the existing `headerRich` path is **attribution-oriented**
(patristic Father / NT typological — it renders `preface_text` + `attribution`, FR-160-C / F-X9 #373).
The Psalm 63 caption is an **uncited** 2-line caption with **no attribution**. So the header
entry / extractor needs an **uncited-caption type** (per #116 fix plan point 2) that renders both
lines without requiring an `attribution`, OR a confirmed code path that tolerates a null attribution.

### C3. Re-extraction deltas (minimal, ref-scoped)
- `src/data/loth/psalter-texts.json`: remove the two caption lines from `Psalm 63:2-9` `stanzas[0]`;
  the resulting first line MUST be `Тэнгэрбурхан, Та миний Тэнгэрбурхан` (contaminated region today:
  `:2-17`).
- `src/data/loth/prayers/commons/psalter-texts.rich.json`: remove the same two lines from
  `Psalm 63:2-9` `stanzasRich.blocks[0].lines` (contaminated region today: `:2-34`). The rich builder
  consumes the source JSON, so it must be **re-run after** the source edit
  (`scripts/build-psalter-texts-rich.mjs:4-7`, `:127-130`).
- `src/data/loth/psalter/week-1.json`: **unchanged** — ref/title/antiphon already correct (`:8-14`).
- Expected delta is confined to `stanzas` / `stanzasRich` / `headerRich`. (#105's expected delta is
  `psalmPrayer` only — see C5.)

### C4. Regression controls (positive + negative guards)
Required assertions:
- `Psalm 63:2-9` `stanzas[0][0]` === `Тэнгэрбурхан, Та миний Тэнгэрбурхан`.
- `Psalm 63:2-9` `stanzasRich` first rendered line === `Тэнгэрбурхан, Та миний Тэнгэрбурхан`.
- `Psalm 63:2-9` header/caption renders **after** title and **before** first stanza.
- `Psalm 63:2-9` antiphon remains `week-1.json` `default_antiphon` (`:8-14`).
- **Negative guard** `Revelation 19:1-7` `stanzas[0][0]` === `Аллэлуяа!` (unchanged).
- **Negative guard** `Psalm 139:1-18` `stanzas[0][0]` === `I` (unchanged).
Commands: `node scripts/verify-psalter-stanzas.js`, `node scripts/verify-psalter-pages.js`,
`node scripts/audit-psalter-ref-consistency.js` (suspect count must not increase).

### C5. #105 coordination (cross-GOAL coupling — MANDATORY)
GOAL #130 and #105 both touch `scripts/extract-psalm-texts.js` (**different functions** —
`extractPsalmBody` here vs `extractPsalmPrayer` L397 in #105), both regenerate
`psalter-texts.json` / `psalter-texts.rich.json`, and both require a `public/sw.js` `CACHE_VERSION`
bump. If each re-extracts independently, one side's fix is dropped from the shared artifacts.
**Sequencing: develop on top of #105 after it merges; the leader coordinates Step 6 / integration.**
Expected-delta separation keeps the diffs reviewable: #105 changes `psalmPrayer`; #130 changes
`stanzas` / `stanzasRich` / `headerRich`.

### C6. Operational checkpoints (CLAUDE.md self-review + deploy)
- **CACHE_VERSION**: data-bundle change → bump `public/sw.js` `CACHE_VERSION`. Current value is
  `divine-office-v43` (`public/sw.js:511`). #90/#96/#98 or #105 may take `v44` first; whichever GOAL
  merges first uses `v44`, the later uses `v45` (or a single bump on an integration merge). Re-check
  the live value at Step 6 (`docs/design/mental-models/goal105-psalmprayer-truncation-fix.md:79-80`).
- **psalter verifiers**: run `verify-psalter-pages.js` (page integrity) and
  `audit-psalter-ref-consistency.js` (ref ↔ stanza consistency — suspect count must not increase).
- **Source-corpus in worktree**: `parsed_data/` may be absent in an isolation worktree (same issue as
  #109). At Step 6, symlink the source corpus before re-extraction.
- e2e/unit are mostly build-time-data-agnostic; if a component snapshot reads Psalm 63 stanzas, refresh it.

---

## Citation index (인용 색인)

- **Root-cause + fix plan**: `docs/research/GOAL116-rootcause-fixplan.md` (#116, peer + adversarial
  review PASS) — conclusion, scope-limit, regression spec.
- **Source original**: `parsed_data/full_pdf.txt:1810-1815` (structure: ref → title → 2-line caption
  `:1812-1813` → body), extraction input `parsed_data/week1/week1_final.txt:335-340`.
- **Contaminated production data**: `src/data/loth/psalter-texts.json:2-17`,
  `src/data/loth/prayers/commons/psalter-texts.rich.json:2-34`.
- **Extractor (root cause)**: `scripts/extract-psalm-texts.js::extractPsalmBody` (`:273-349`; title
  skip `:277-299`, epigraph skip `:301-304` / `:424-438`, body loop `:306-329`).
- **Header catalog (absent today)**: `src/data/loth/prayers/commons/psalter-headers.rich.json`
  (`extract-psalter-headers.js:5-18`; `rg` for Psalm 63 caption → `exit=1`).
- **Rich builder**: `scripts/build-psalter-texts-rich.mjs:4-7`, `:127-130` (source JSON → rich.json).
- **Renderer**: `src/components/psalm-block.tsx:81-114` (title + optional `headerRich`), `:117-240`
  (stanza render).
- **Antiphon source (invariant)**: `src/data/loth/psalter/week-1.json:8-14` (`default_antiphon`).
- **Negative guards**: `Revelation 19:1-7` (`parsed_data/full_pdf.txt:2271-2278`,
  `src/data/loth/psalter-texts.json:239-248`), `Psalm 139:1-18`
  (`parsed_data/full_pdf.txt:16066-16073`, `src/data/loth/psalter-texts.json:4422-4428`).
- **Deploy**: `public/sw.js:511` (`CACHE_VERSION = 'divine-office-v43'`).
- **#105 coordination**: `docs/design/mental-models/goal105-psalmprayer-truncation-fix.md:79-80`
  (CACHE_VERSION wave), `:27-31` / `:45-58` (`extractPsalmPrayer` scope separation).
