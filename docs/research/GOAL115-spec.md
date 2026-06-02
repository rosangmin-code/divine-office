# GOAL #115 — Spec / Design lock (Step 3)

> Inputs: `docs/design/mental-models/goal115-lords-prayer-rubric-amen-removal.md` (MM)
> + `docs/research/GOAL115-scenarios.md` (scenarios, incl. the legacy-path 3-page escalation).
> This document is **lockable**: exact files, line ranges, before/after, module
> boundary, and regression guarantees — no remaining ambiguity. It is the input
> for Gate-β and Step-4 test authoring.
> Authored by `dvo-ref`. English prose; Mongolian-Cyrillic strings verbatim.

---

## 0. Summary & module boundary

Two screen-output changes in **Lauds (아침기도) + Vespers (저녁기도)** only
(Compline excludes both sections):

- **[D1]** Remove the Lord's-Prayer guidance cue after the intercessions —
  via **BOTH** render paths (structured `«closing»` AND legacy `items[]`).
- **[D2]** Drop the trailing `Амэн.` from the Lord's Prayer body.

**Module boundary: render-layer only.** `parseIntercessions`
(`src/lib/hours/intercessions.ts`) logic is **NOT** modified — only the existing
pure predicate `isClosingLine` is *exported* for reuse. Hour assemblers
(`lauds.ts`/`vespers.ts`), data files, and types are untouched.

---

## 1. Locked change set (3 source files)

### C1 — `src/lib/hours/intercessions.ts` (export an existing pure helper; NO behavior change)

Expose `isClosingLine` so the render layer can reuse the exact same
`"Тэнгэр дэх Эцэг"` prefix predicate (SSOT — avoids duplicating the prefix /
quote-stripping logic in the component).

```diff
- function isClosingLine(line: string): boolean {
+ export function isClosingLine(line: string): boolean {
    const cleaned = line.replace(/^[\s"'“”«»]+/u, '')
    return cleaned.startsWith(CLOSING_PREFIX)
  }
```

- This adds an `export` keyword only. `parseIntercessions` and all internal
  call sites (`intercessions.ts:61,78,86,117`) are byte-for-byte unchanged.
- Rationale this is NOT a "parse-layer change" the dispatch forbids: the parser
  produces identical `ParsedIntercessions` output; we merely surface a helper.

### C2 — `src/components/prayer-sections/intercessions-section.tsx`

**C2.1 — import the helper** (top of file, alongside the existing imports):

```diff
  import { DirectiveBlock, partitionDirectives } from './directive-block'
+ import { isClosingLine } from '@/lib/hours/intercessions'
```

**C2.2 — [D1](a) structured path: delete the `«closing»` block** (current L139-143):

```diff
-          {section.closing && (
-            <p className="mt-3 font-serif italic text-stone-700 dark:text-stone-300">
-              «{section.closing}»
-            </p>
-          )}
```

(Removes the whole `{section.closing && ( … )}` JSX expression. The 50
structured-path blocks that carry a closing incipit lose the cue.)

**C2.3 — [D1](b) legacy `items[]` path: filter the closing incipit** (current L152-173).
Insert a `.filter(...)` before `.map(...)` and source the refrain look-back
(`prev`) from the filtered array via the map callback's 3rd argument
(index-consistent — only the trailing incipit is removed, so earlier
relationships are unchanged):

```diff
          <ul className="mt-2 space-y-2">
-            {section.items.map((item, i) => {
+            {section.items
+              .filter((item) => !isClosingLine(item.trim()))
+              .map((item, i, items) => {
                // F-X12 Phase A: cohortative trigger on previous line elevates
                // the next item to refrain (italic). i === 0 always plain.
-              const prev = i > 0 ? section.items[i - 1] : ''
+              const prev = i > 0 ? items[i - 1] : ''
                const isRefrain =
                  i > 0 &&
                  LEGACY_INTERCESSION_REFRAIN_LEAD_RE.test(prev.trim())
                return (
                  …
                )
              })}
          </ul>
```

(Affects the 3 legacy-path blocks carrying the incipit: `week-3 SUN lauds`,
`week-4 SUN lauds`, `week-4 MON vespers`. For the 8 other legacy blocks the
filter matches nothing → safe no-op.)

**Residual note (no action):** after C2.2, the `closing` field is still
populated by the parser but no longer rendered. Leave the field in the model /
type (`section.closing`) — removing it would touch the parser/types/assemblers,
outside the locked render-layer boundary. Harmless dead data.

### C3 — `src/components/prayer-sections/our-father-section.tsx` ([D2])

Drop the trailing ` Амэн.` (preceding space + token + period) on current L12:

```diff
-        харин хорон муу бүхнээс гэтэлгэн соёрхоно уу. Амэн.
+        харин хорон муу бүхнээс гэтэлгэн соёрхоно уу.
```

- Token spelling is `Амэн` (Cyrillic `э`), NOT `Амен`. Rendered body now ends
  `…соёрхоно уу.`
- `OurFatherSection` takes no props → single edit covers Lauds + Vespers.

---

## 2. Regression guarantees ([D3] — what must NOT change)

| ID | Guarantee | Why it holds under this spec |
|----|-----------|------------------------------|
| **D3-a** | Petition `versicle`/`response` bodies unchanged; zero incipit leakage into petitions | `parseIntercessions` untouched → petition parsing identical. The legacy filter removes ONLY trailing items matching `isClosingLine`; the refrain look-back uses the filtered array so earlier indices are unchanged. (This is the recorded reason the **parse-layer** approach was rejected.) |
| **D3-b** | Lord's-Prayer & concluding-prayer bodies otherwise unchanged | C3 deletes only ` Амэн.`; `concluding-prayer-section.tsx` is not touched. |
| **D3-c** | `/ordinarium` reference page keeps its standalone Lord's-Prayer `Амэн.` | No data files changed; `loaders.ts:31-50` does not load top-level `ordinarium.json`; `OurFatherSection` does not read `common-prayers.json`. The fix is structurally incapable of affecting that surface. |
| **D3-d** | Compline unaffected | Compline assembles neither `intercessions` nor `ourFather` (`compline.test.ts:90-93`); none of the 3 changed symbols appear in its render. |

---

## 3. Affected-surface ledger (from the Step-2 172-block scan)

| Render path | blocks with incipit cue | fixed by |
|-------------|------------------------|----------|
| structured (`petitions > 0`) | 50 | C2.2 (delete `«closing»` block) |
| legacy (`petitions === 0`) | 3 — `week-3 SUN lauds`, `week-4 SUN lauds`, `week-4 MON vespers` | C2.3 (filter `isClosingLine` from `items`) |
| legacy without incipit | 8 | unaffected (filter no-op) |
| total intercessions blocks | 172 | — |

---

## 4. Test inputs for Step 4 (test authoring)

**Component tests — `intercessions-section.test.ts`:**
1. *Structured path, closing present* → assert NO element renders `«…»` / no
   text containing `Тэнгэр дэх Эцэг минь ээ`; assert all petitions+responses
   still render.
2. *Legacy path with incipit* → props `{ petitions: [], items: [<petition
   lines…>, "“Тэнгэр дэх Эцэг минь ээ...”"] }` → assert the incipit bullet is
   NOT rendered; assert the non-incipit bullets ARE rendered; assert refrain
   italic heuristic still applies to surviving items.
3. *Legacy path without incipit* (no-op) → all items render unchanged.

**Component test — Lord's Prayer:**
4. `OurFatherSection` output does NOT end with / contain `Амэн`; still contains
   `Тэнгэр дэх Эцэг минь ээ` (body intact).

**Outcome ([D3] gate) — Playwright on real pages (Step 7 acceptance):**
5. A date resolving to `week-1 SUN lauds` (structured) — no guillemet cue;
   a date resolving to `week-4 SUN lauds` (legacy) — no incipit bullet;
   Lord's-Prayer paragraph ends without `Амэн`; screenshot of intercessions →
   Lord's Prayer → concluding-prayer region. Console clean.
   (Existing-SW-cache / A2HS upgrade = documented manual-only exception.)

**Regression guards:** existing `compline.test.ts` green; a read-assertion that
`common-prayers.json` Lord's-Prayer still contains `Амэн.`

`@fr` tagging: assign the next FR number (per CLAUDE.md FR rules) at
implementation; add PRD + traceability-matrix rows.

---

## 5. CACHE / deploy

- Component-bundle content changes (2 components) → bump
  `public/sw.js:511` `divine-office-v43 → divine-office-v44`. Navigation stays
  `network-only` (no SW logic change). **Leader decides the exact bump value at
  merge time** (avoid collisions with other in-flight GOALs).

---

## 6. Lock checklist (ambiguity-free)

- [x] [D1] dual-path: structured `«closing»` delete (C2.2) + legacy `items[]`
      filter (C2.3) — both specified with exact diffs.
- [x] [D2] amen: exact ` Амэн.` deletion (C3), spelling `э` confirmed.
- [x] Helper reuse: `isClosingLine` exported (C1), imported (C2.1) — SSOT, no
      parser behavior change.
- [x] `parseIntercessions` untouched (parse-layer rejected; D3-a preserved).
- [x] Target files enumerated: `intercessions.ts` (export only),
      `intercessions-section.tsx`, `our-father-section.tsx`.
- [x] Regression set [D3 a-d] guaranteed with mechanism rationale.
- [x] Test inputs + outcome gate defined for Step 4/7.
- [x] CACHE bump flagged (value = leader at merge).
