# GOAL #125 Step-4 root-cause — intercessions parenthesized-alternate boundary

> **TL;DR** — The W2 Wednesday Vespers parenthesized alternate `(эсвэл … адисална уу)` is
> mis-grouped because **`endsSentence()` (`src/lib/hours/intercessions.ts:105-109`) returns
> `false` for the response `Бидний гэрүүдийг адисална уу)`** — the string ends in `)` (not a
> recognized terminal, and the strip regex on L107 does not remove `)`; in fact the response has
> **no** sentence-terminal `.` at all, only the optative `уу` followed by `)`). That `false` is
> consumed in the petition loop's `inResponse` branch (**L397-398**), so instead of flushing the
> petition the parser **appends** the next petition's first line at **L402-403**, gluing
> `Та итгэлт талийгаачдад Өөрийнхөө царайгаа` onto the alternate response and stripping it from
> the next petition's versicle. This is a **distinct** parenthesis-boundary defect — **not** the
> GOAL#31 colonless route (this block has a colon → colon path) and **not** the deferred #42
> dash-no-space case (separators here are normal ` - `). **Regression surface is uniquely
> scoped: exactly ONE intercessions block in all of `src/data/loth` contains `(`** (the target),
> so the proposed parenthesis-balance-gated fix has zero collateral. RED re-run still failing
> (reproduction confirmed). **No production code changed — analysis only (fix is Step 5 #133).**
> This document satisfies GOAL #125 `[D1]`.
>
> Author: dvo-sol (solver, task wi-129-003 / `[#125-sub-4]`). Worktree `wi-129-003-dvo-sol`,
> base `7ae50ada` (the RED commit). Blueprint:
> `docs/design/mental-models/goal125-intercessions-paragraph-split.md`.

---

## 1. Root cause — exact file:line + mechanism

### Code sites

```
src/lib/hours/intercessions.ts
  105  function endsSentence(text: string | undefined): boolean {
  106    if (!text) return false
  107    const trimmed = text.trimEnd().replace(/["'”»]+$/u, '')   // ← strips quotes, NOT ')'
  108    return /[.!?。！？]$/.test(trimmed)                          // ← requires .!? at very end
  109  }
  ...
  355  while (i < lines.length) {                                   // petition loop
  ...
  397      } else if (inResponse) {
  398        if (endsSentence(current.response)) {                  // ← boundary check (returns false)
  399          flush()
  400          current = { versicle: line }
  401          inResponse = false
  402        } else {
  403          current.response = [current.response, line]...join(' ')  // ← BUG: appends next petition
  404        }
```

### Mechanism (traced against the real `days.WED.vespers.intercessions`, week-2.json:627-650)

This block **has a colon** (element `[3]` `ийн залбирцгаая:`), so `hasColon === true` and parsing
takes the **colon path** (`parseIntercessions` L278 `else` branch); `petitionSeparator` is the
strict `SEPARATOR` `/\s[-—]\s/` (L271). Colonless routing (L273-277) is **not** entered. The
alternate region is array elements `[18..21]`:

```
[18] "(эсвэл Аяа, Эзэн, Та бүх зовлон зүдгүүрээс"
[19] "биднийг аварна уу. - Бидний гэрүүдийг адисална уу)"
[20] "Та итгэлт талийгаачдад Өөрийнхөө царайгаа"
[21] "харуулна уу. - Тэднийг Өөрийн оршихуйгаар баярлуулна уу."
[22] "“Тэнгэр дэх Эцэг минь ээ...”"   (closing incipit)
```

Step-by-step in the petition loop:

1. `[18]` — no separator, prior response (`…болох юм.`) ends `.` ⇒ `endsSentence` true ⇒ **flush**;
   new petition `current.versicle = "(эсвэл Аяа, Эзэн, Та бүх зовлон зүдгүүрээс"`, `inResponse=false`.
2. `[19]` — `splitOnSeparator` matches ` - ` ⇒ `before="биднийг аварна уу."`,
   `after="Бидний гэрүүдийг адисална уу)"`. `inResponse===false` branch (L379-384): versicle
   accumulates to `"(эсвэл … биднийг аварна уу."`, **`response = "Бидний гэрүүдийг адисална уу)"`**,
   `inResponse=true`. ✔ correct so far (petition[4]).
3. `[20]` — no separator, `inResponse===true` ⇒ **L398 `endsSentence("Бидний гэрүүдийг адисална уу)")`**:
   - L107 `trimEnd().replace(/["'”»]+$/u,'')` → `)` is **not** in the strip class → `"… уу)"`.
   - L108 `/[.!?。！？]$/.test("… уу)")` → ends with `)` → **false**. (And note: the string has **no**
     `.!?` anywhere — even stripping `)` would leave `"… уу"`, still false. The optative `уу` is the
     grammatical end; the `)` is the only structural boundary marker.)
   - ⇒ L402-403 **append**: `response = "Бидний гэрүүдийг адисална уу) Та итгэлт талийгаачдад Өөрийнхөө царайгаа"`. ← **the bug**.
4. `[21]` — `splitOnSeparator` matches ` - ` ⇒ `before="харуулна уу."`,
   `after="Тэднийг Өөрийн оршихуйгаар баярлуулна уу."`. `inResponse===true` branch (L374-378):
   **flush** the corrupted petition[4], new petition `current = { versicle: "харуулна уу.",
   response: "Тэднийг Өөрийн оршихуйгаар баярлуулна уу." }` (petition[5], **damaged** — its head
   `Та итгэлт талийгаачдад Өөрийнхөө царайгаа` was absorbed in step 3).
5. `[22]` — `isClosingLine` true ⇒ flush petition[5], `result.closing = [22]`.

Resulting (buggy) parse:
- `petitions[4].response = "Бидний гэрүүдийг адисална уу) Та итгэлт талийгаачдад Өөрийнхөө царайгаа"` (should be `"Бидний гэрүүдийг адисална уу)"`).
- `petitions[5].versicle = "харуулна уу."` (should be `"Та итгэлт талийгаачдад Өөрийнхөө царайгаа харуулна уу."`).

This matches the MM **State Model → Parser State** prediction (MM:99-107) and **Scenario S1**
(MM:184-191) exactly.

### RED reproduction (re-run once on base `7ae50ada`)

```
$ npx vitest run src/lib/hours/__tests__/intercessions.test.ts
 FAIL  src/lib/hours/__tests__/intercessions.test.ts > parseIntercessions — GOAL #125 parenthesized alternate boundary RED > keeps Week 2 Wednesday Vespers alternate pair separate from the following petition
AssertionError: expected 'Бидний гэрүүдийг адисална уу) Та итгэ…' to be 'Бидний гэрүүдийг адисална уу)'
Expected: "Бидний гэрүүдийг адисална уу)"
Received: "Бидний гэрүүдийг адисална уу) Та итгэлт талийгаачдад Өөрийнхөө царайгаа"
 Test Files  1 failed (1) | Tests  1 failed (1)
```

The received value is the exact glue predicted in step 3 ⇒ root cause confirmed empirically.

---

## 2. Relation to history (GOAL#31 colonless route, deferred #42 dash-no-space)

| Prior work | What it changed | Relation to this defect |
|------------|-----------------|--------------------------|
| **GOAL#31 colonless route** (WI#33 psalter hyphen / WI#41 propers em-dash; `intercessions.ts:32-78, 123-239, 263-277`) | Added colonless intro/refrain recovery, routed on separator (hyphen→psalter, em-dash→propers). | **Not this defect.** The W2 WED block **has a colon** (`[3] …залбирцгаая:`) ⇒ colon path; the colonless branches never run. #31 added new branches but did **not** touch the shared petition-loop response-completion logic (L397-403) where this bug lives. |
| **Deferred #42 dash-no-space** (`SEPARATOR_PSALTER_PETITION = /\s[-—]\s?/`, `intercessions.ts:48-67`; scoped to colonless-psalter loop only) | Relaxed the trailing space so W3 SUN Lauds `-Тэдэнд` (dash, no trailing space) splits. | **Not this defect, distinct shape.** The W2 WED separators are normal ` - ` (space-hyphen-space) and `splitOnSeparator` works correctly here — the failure is purely in **response CLOSE detection** (`endsSentence` vs `уу)`), not in separator detection. #42 is about the *split* marker; this is about the *boundary* marker `)`. |

**Verdict:** a **new, distinct parenthesized-alternate boundary defect** in the shared colon-path
petition loop — orthogonal to both #31 (routing) and #42 (separator relaxation). It would equally
affect a colonless block if one ever carried a `(…)` alternate, because `endsSentence` is shared.

---

## 3. Fix plan (Step 5 #133 — NO code changed here)

### Recommended — Option A: parenthesis-balance-gated response completion (narrow, structural)

Add a small helper and OR it into the L398 boundary check:

```ts
// A parenthesized alternate (versicle opens "(", response closes ")") is a
// complete petition even though the response carries no .!? terminal.
function responseClosesParenAlternate(p: ParsedPetition | null): boolean {
  if (!p || !p.response) return false
  const v = p.versicle ?? ''
  const openUnmatched = (v.split('(').length - 1) > (v.split(')').length - 1)
  return openUnmatched && /\)\s*$/.test(p.response)
}
```

Change L398 from:
```ts
if (endsSentence(current.response)) {
```
to:
```ts
if (endsSentence(current.response) || responseClosesParenAlternate(current)) {
```

**Expected effect on the failing block:**
- At `[20]`: versicle `"(эсвэл … уу."` has 1 unmatched `(`, response `"… уу)"` ends `)` ⇒ helper
  true ⇒ **flush** petition[4] with clean `response = "Бидний гэрүүдийг адисална уу)"`; new petition
  starts `versicle = "Та итгэлт талийгаачдад Өөрийнхөө царайгаа"`.
- At `[21]`: split ⇒ `petitions[5] = { versicle: "Та итгэлт талийгаачдад Өөрийнхөө царайгаа харуулна уу.",
  response: "Тэднийг Өөрийн оршихуйгаар баярлуулна уу." }`.
- ⇒ matches MM Scenario S1 exactly (`petitions[4]` / `petitions[5]`). The strict `SEPARATOR`,
  `splitOnSeparator`, `isClosingLine`, and both colonless paths are **untouched** (MM A1 constraints).

### Rejected — Option B: make `endsSentence` treat trailing `)` as terminal

Rejected per **MM A1** ("Do not treat every closing parenthesis in every context as proof of a
valid boundary"). `endsSentence` is shared by the colonless intro/refrain extractors
(`intercessions.ts:154, 169`) and the colon-path refrain accumulator (`:313`); a blanket `)` rule
could shift those boundaries. Option A is gated on **versicle parenthesis balance**, firing only
when an alternate is genuinely open.

### Test contract (Step 5/6)
- Keep the existing RED spec `src/lib/hours/__tests__/intercessions.test.ts` (GREEN after fix:
  `petitions[4].response === "Бидний гэрүүдийг адисална уу)"` AND
  `petitions[5].versicle === "Та итгэлт талийгаачдад Өөрийнхөө царайгаа харуулна уу."`).
- Keep `src/components/prayer-sections/__tests__/intercessions-section.test.ts` green (no glued
  substring `адисална уу) Та итгэлт`).
- `git diff -- src/data/loth/psalter/week-2.json` MUST stay empty (no SoT mutation, MM Non-Goals).
- `public/sw.js` `CACHE_VERSION` bump at deploy if the runtime bundle changes.

---

## 4. Regression-risk survey

Full scan of `src/data/loth/**/*.json` intercessions blocks (counts + samples):

| Pattern | Block count | Blocks | Fix impact |
|---------|-------------|--------|------------|
| Contains `(` | **1** | **W2 WED Vespers (the target)** | Option A's `openUnmatched` gate fires ONLY where a versicle has an unmatched `(`. Only this block qualifies ⇒ **zero collateral**. |
| Contains `эсвэл` (alternate marker) | **1** | W2 WED Vespers (same) | Alternate-petition pattern is unique to this block. |
| Dash-no-space (`\S[-—]\s` / `\s[-—]\S`) | **3** | W3 SUN Lauds (`…санана уу, -Тэдэнд…`), W2 THU Vespers (`…Н. -г`), lent W6 FRI Vespers (`…Н. -г Та…`) | **Unrelated** — none contains `(`, so `responseClosesParenAlternate` returns false for all three; they stay on their current (#42 colonless / strict) behavior. |

Representative samples:
- `(` / `эсвэл`: `week-2.json days.WED.vespers` — `(эсвэл Аяа, Эзэн … адисална уу)` (target).
- dash-no-space #1: `week-3.json days.SUN.lauds` — `хүмүүсийг эргэн санана уу, -Тэдэнд цорын ганц …` (#42 case; `(`:false).
- dash-no-space #2: `week-2.json days.THU.vespers` — `Пап лам Н. болон бидний хамба лам Н. -г` (`(`:false).
- dash-no-space #3: `lent.json weeks/6/FRI/vespers` — `Манай Пап лам Н. -г Та хамгаална уу.` (`(`:false).

General `)` safety: because exactly one intercessions block contains `(` corpus-wide, **no other
response ends in `)`**; the gate cannot mis-close any non-alternate petition. Every other block's
responses close on `.!?` via the unchanged `endsSentence`, so the OR-extension is purely additive.

---

## 5. AC mapping (this WI → MM sections)

| AC (Step-4) | Verdict | Evidence | MM-conformance |
|-------------|---------|----------|----------------|
| Exact file:line + mechanism documented | PASS | §1 — `endsSentence` L105-109 (L107 strip lacks `)`, L108 needs `.!?`) consumed at petition loop L397-403; full trace of `[18..22]`. | yes (MM State Model §Parser State + Scenario S1) |
| Relation to GOAL#31 / deferred #42 stated | PASS | §2 — distinct defect; colon path (not colonless), strict ` - ` (not #42 dash-no-space). | yes (MM Action Map A1 constraints + Citation Index parser refs) |
| Fix plan + regression-risk survey (grep counts + 3 samples) | PASS | §3 Option A (parenthesis-balance gated) + §4 table (1 `(`, 1 `эсвэл`, 3 dash-no-space + samples). | yes (MM A1 + Test Scenario Map T1-T4 + Visibility Boundary) |
| No production code changed | PASS | Committed diff is doc-only; RED spec re-run (not modified); helper shown as plan, not applied. | yes (MM Non-Goals) |

---

## 6. Citation index

- **MM blueprint:** `docs/design/mental-models/goal125-intercessions-paragraph-split.md`
  (State Model :99-107, Scenario S1 :184-191, Action Map A1 :132-152, Non-Goals :49-59).
- **Parser (root cause):** `src/lib/hours/intercessions.ts:105-109` (`endsSentence`),
  `:355-422` (petition loop), `:397-403` (the `inResponse` append branch), `:263-277` (colon vs
  colonless routing), `:32-67` (separators incl. #42 `SEPARATOR_PSALTER_PETITION`).
- **Failing data:** `src/data/loth/psalter/week-2.json` `days.WED.vespers.intercessions`
  (`:627-650`, alternate at array `[18..21]`).
- **RED spec (re-run, still failing):** `src/lib/hours/__tests__/intercessions.test.ts:31-33`;
  tee `~/.claude/pair-cowork/scratch/dvo/test-out-task-wi-129-003.log`.
- **Renderer (downstream, unchanged this step):**
  `src/components/prayer-sections/intercessions-section.tsx`.
