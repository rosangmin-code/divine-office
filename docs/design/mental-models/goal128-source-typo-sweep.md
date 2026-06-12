# Mental Model — Source-PDF Typo Sweep & Correction Policy (GOAL #128)

> Blueprint SSOT for GOAL #128 (`[g-5]` 원본 PDF 유래 오타 전수조사·교정 —
> `арл түмнийг` → `ард түмнийг` 외). This is a **campaign-level POLICY +
> METHODOLOGY** Mental Model, not a single frozen fix. It defines (1) the
> correction-eligibility policy that introduces a *bounded exception* to the
> project's "PDF SoT verbatim" principle, (2) the correction-ledger design,
> (3) the sweep methodology **candidates** (enumerated, NOT executed here),
> (4) the interaction contract with existing verifiers, and (5) the AC link +
> AC-separability table that feeds Gate-alpha.
>
> Author: dvo-plan-cl (planner, task #156 / `[#128-sub-1]`). Authored in
> English with Mongolian original liturgical text quoted verbatim (citation
> exception). **This step performs investigation only "just enough for the
> MM"; it executes no sweep and applies no correction.** Downstream Steps
> (#157–#164) take this MM as their blueprint; the leader decomposes per the
> AC-separability table in §5.

---

## 0. Confirmed seed finding (the user's reported defect)

| Field | Value |
|-------|-------|
| Screen | Week 2 · **Friday** · **Vespers (Evening Prayer)** · Intercessions (Гуйлт) |
| Defect | Invitatory line reads `Эзэн, Та Өөрийн **арл** түмнийг нигүүлсэнэ үү.` |
| Correct | `Эзэн, Та Өөрийн **ард** түмнийг нигүүлсэнэ үү.` (`ард түмэн` = the people) |
| App data | `src/data/loth/psalter/week-2.json:944` |
| PDF extraction | `scripts/out/psalter_layout.txt:5247` — **the PDF original itself carries `арл`** |
| User authorization | GOAL #128 POLICY NOTE (2026-06-13): intentional deviation from the PDF is authorized **when the PDF itself carries an obvious typo** |
| Screenshot (untracked) | `/home/min/myproject/divineoffice/Screenshot_20260612_210840_Samsung Browser.jpg` |

This single occurrence is the **[D1] seed**; the campaign generalizes it into a
policy + sweep (`[D2]`/`[D3]`) under verification (`[D4]`).

---

## 1. Policy MM — what qualifies as an "obvious source typo"

*(canonical MM mapping: **State Model** + **Action Map** — the decision states a
candidate token can occupy, and the action taken in each)*

### 1.1 The principle and its bounded exception

The project's default is **"PDF SoT verbatim"**: app data faithfully reproduces
the Mongolian print original; fabrication and machine-translation are forbidden
(NFR-002). GOAL #128 introduces a **narrow exception** authorized by the user:
*where the PDF original itself carries an obvious, linguistically-clear
orthographic typo, the app may deviate from the PDF to render the correct form* —
**provided** every such deviation is (a) gated by the evidence bar in §1.3,
(b) recorded in the correction ledger (§2) as an intentional PDF-deviation, and
(c) never the product of guessing/MT.

The exception is **orthographic only**. It does **not** license:
rewording, modernization, re-punctuation for taste, grammar "improvement",
or any change that alters meaning. It restores an **attested** Mongolian form
that the print clearly intended; it never invents text.

### 1.2 Three decision states (the State Model)

Every candidate token resolves into exactly one state:

| State | Meaning | Action (Action Map) |
|-------|---------|---------------------|
| **CORRECT** | Linguistically-clear typo; all evidence conjuncts (§1.3) met | Apply correction **and** log a ledger row. Never silent — the ledger entry IS the audit trail. |
| **CONFIRM** | Suspect but not clear-cut (see §1.4 triggers) | **Stop. Ask the user.** Never auto-correct. Record the question + user's ruling in the ledger. |
| **KEEP** | No evidence of error (variant / archaic / dialectal / proper noun / legitimate rare form) | Leave verbatim. PDF-SoT default holds. |

**Hard rule:** ambiguous cases go to CONFIRM — *never* silently corrected.
Fabrication / MT remain forbidden in **all** states.

### 1.3 Linguistic evidence bar (CORRECT requires ALL of E1–E4)

| ID | Test | `арл`→`ард` seed |
|----|------|------------------|
| **E1** Non-word | The PDF token is **not** a valid Mongolian word in any reading fitting the syntactic slot | ✓ `арл` is a non-word; it is a hapax standalone token (only occurrence in all `src/data`: `week-2.json:944`) |
| **E2** Minimal OCR/print edit | The intended form is reachable by a **known confusion within ~1 edit** (л/д, г/т, н/я, о/е, …) | ✓ `д`→`л` is a single-glyph confusion |
| **E3** Standard collocation | The corrected form yields a **standard lexical/liturgical collocation** | ✓ `ард түмэн` ("the people") is standard |
| **E4** Corpus corroboration | The corrected form already **dominates** in the same corpus (ideally same template) | ✓ `ард түмн` appears **675×** in `src/data` vs `арл түмн` **1×** (675:1) |

When all four hold, the correction is **deterministic, not interpretive** — the
print clearly intended the dominant attested form. Failing **any** conjunct
downgrades the candidate to CONFIRM (or KEEP if no error signal at all).

### 1.4 CONFIRM triggers (must escalate to the user)

- The PDF token **is** a valid Mongolian word but is contextually suspect
  (semantic, not orthographic, doubt).
- **More than one** plausible target form exists (E2 reachable from two words).
- The token is a **proper noun**, place name, or rare liturgical/biblical term
  where corpus frequency is not authoritative.
- The "typo" could be a **legitimate dialectal/archaic spelling**.
- The correction would change **meaning**, not just orthography.

### 1.5 Non-goals (비목표)

- **No silent correction of ambiguous cases** — §1.4 always routes to the user.
- **No fabrication / no MT** — a correction must restore an *attested* form; not
  one character is invented.
- **No semantic/stylistic editing** — orthographic typos only.
- **No full re-extraction** — corrections are **surgical string edits** to the
  curated data (see §4.3; `psalter-texts.json` re-extraction is non-idempotent
  and regresses refs — memory: *psalter-curated-no-full-reextract*).
- **No undocumented deviation** — every applied correction MUST appear in the
  ledger (§2). A PDF-deviation absent from the ledger is a policy violation.

---

## 2. Correction ledger design — the SoT-deviation registry

*(canonical MM mapping: **Sync Surface** — the durable record that keeps app
data, PDF original, and the deviation rationale in sync over time)*

**Proposal:** a tracked markdown ledger `docs/data/source-typo-ledger.md`
(created at the apply step `[D3]`, **not** in this MM step). It becomes the
**single registry of every intentional deviation** from the PDF original. Any
future "why does the app differ from the book here?" question resolves against
this one file.

### 2.1 Row schema (one row per applied correction)

| Column | Content |
|--------|---------|
| `id` | Stable id, e.g. `STC-001` (Source-Typo-Correction) |
| `location` | File + JSON path/line, e.g. `week-2.json` → fri vespers intercessions[3] (`:944`) |
| `screen` | Human locus, e.g. Week 2 · Fri · Vespers · Intercessions |
| `pdf_original` | Verbatim PDF token/line + PDF-extraction citation (`psalter_layout.txt:5247`) |
| `corrected` | Verbatim corrected token/line |
| `evidence` | Which of E1–E4 hold + the key numbers (e.g. 675:1) |
| `state` | `CORRECT` (auto-eligible) or `CONFIRM→approved` (with user ruling) |
| `date` | ISO date applied |
| `applied_by` | member / GOAL ref (#128) |

### 2.2 Seed row (illustrative — to be written at `[D3]`)

```
STC-001 | week-2.json fri-vespers intercessions[3] (:944)
        | PDF: "...Өөрийн арл түмнийг нигүүлсэнэ үү." (psalter_layout.txt:5247)
        | →   "...Өөрийн ард түмнийг нигүүлсэнэ үү."
        | E1✓ (арл hapax non-word) E2✓ (д/л) E3✓ (ард түмэн) E4✓ (675:1)
        | state=CORRECT | 2026-06-?? | #128
```

### 2.3 Ledger invariants

- **Append-only** within a campaign; never silently rewrite a prior row.
- **CONFIRM rows require a cited user ruling** before `state` flips to applied.
- The ledger is a **doc**, not data — it does not enter the app bundle and does
  not affect `sw.js` / `CACHE_VERSION`.

---

## 3. Sweep methodology — CANDIDATES (enumerated, NOT executed)

*(canonical MM mapping: **Scenarios** — the alternative ways the sweep `[D2]`
could be run; the leader/Step-author picks the mix. This MM does **not** run any
of them.)*

| # | Candidate | Tooling / availability | Precision | Recall | Effort | Verdict |
|---|-----------|------------------------|-----------|--------|--------|---------|
| M1 | **Mongolian spellcheck diff** — flag OOV tokens | `hunspell` **NOT installed**; `aspell` present but **no mn dictionary**. Needs sourcing a Mongolian Hunspell dict (e.g. LibreOffice `mn_MN`) + Cyrillic-string tokenizer over the JSONs | Low–Med (many OOV liturgical/biblical terms → false positives) | **High** for true non-words | Med–High (dict sourcing + triage) | Recall **safety-net**; mandatory human triage |
| M2 | **Token-frequency anomaly** — flag hapax/near-hapax tokens whose minimal-edit neighbor is high-frequency | Pure script over all prayer-text fields; no external dict | Med | Med (misses typos that are valid words elsewhere) | Low–Med | **First-pass backbone** — `арл`(1) vs `ард`(675) is exactly this signal |
| M3 | **Cross-occurrence comparison** — cluster repeated formulae/refrains; flag a lone divergent spelling among otherwise-identical strings | Script: normalize + cluster recurring liturgical strings | **HIGH** | Limited to repeated text | Med | **Best precision** — nails collocation-level typos like `ард түмэн`(675:1) |
| M4 | **Targeted OCR-confusion grep** — curated regex passes around known-good collocations (л/д, г/т, н/я, о/е…) | `grep`/`rg` seeded with real collocations | High (when seeded) | Low (only finds what you look for) | Low | **Fast seed pass** over highest-value collocations |

**Recommended mix (for the leader's decomposition — NOT run here):** M3 + M2 as
the precision/recall backbone, M1 as a recall safety-net **with mandatory human
triage**, M4 as a quick seed pass. Every machine-flagged candidate still passes
the §1.3 evidence bar and the §1.2 state gate before any edit — the sweep
**proposes**, the policy **disposes**, the user **confirms** ambiguous cases.

The `[D2]` deliverable is an **evidence-backed candidate report** (columns:
location · PDF original · proposed correction · evidence E1–E4 · state), **not**
a data change. No correction is applied in `[D2]`.

---

## 4. Interaction with existing verifiers (regression contract)

*(canonical MM mapping: **Visibility Boundary** — what corrections may touch vs
what must stay invariant; and the **Sync Surface** with deploy)*

### 4.1 Page verifiers are content-agnostic (but re-run anyway)

`scripts/verify-*-pages.js` (`verify-psalter-pages.js`,
`verify-psalter-body-pages.js`, `verify-hymn-pages.js`,
`verify-compline-pages.js`, `verify-propers-pages.js`,
`verify-sanctoral-pages.js`) compare the **`page` integers** to the PDF layout —
they are **content-agnostic**, so an orthographic correction of a *text* field
must not change their verdicts. Per CLAUDE.md NFR-009c/d, the verifier for **any
touched data area** MUST still be re-run to confirm zero regression.

> **Boundary rule:** a typo correction edits **string content only** — it MUST
> NOT touch `page`, `ref`, `antiphon_key`, or structural keys. If a candidate
> would require changing a `page`/`ref`, it is **out of policy scope** → CONFIRM.

### 4.2 Ref/stanza consistency audit (the real regression risk)

`scripts/audit-psalter-ref-consistency.js` verifies `ref` ↔ declared-`page`
stanza-fingerprint consistency (window ±2). A correction **inside psalm stanza
text** can shift a stanza fingerprint. **Rule: a correction MUST NOT increase the
suspect count** (CLAUDE.md self-review). For the seed (`арл түмнийг` lives in an
**intercession**, not a psalm stanza), this audit's fingerprint path is not
engaged — but the rule is binding for any psalm-body correction the sweep finds.

### 4.3 Curated-data discipline (no full re-extract)

`psalter-texts.json` and the rich JSONs are **curated** (extractor + canticles +
manual corrections accumulated). A full re-extraction overwrite is
**non-idempotent** and regresses refs (memory:
*psalter-curated-no-full-reextract*). Corrections are **surgical string edits**
to the specific occurrence(s), never a re-run of `extract-psalm-texts.js`
in full-overwrite mode.

### 4.4 Deploy / Service-Worker contract

A data-bundle change (e.g. editing `week-2.json`) requires bumping
`public/sw.js` `CACHE_VERSION` (CLAUDE.md — "배포 회귀 1순위 리스크"), so stale
cached data is evicted. This is **content-only**: no link/route/Content-Type
change, so the **`network-only` navigation policy is untouched**. The
`CACHE_VERSION` bump belongs to the apply step `[D3]`, not this MM step.

---

## 5. AC link [D1..D4] + AC-separability table (Gate-alpha input)

### 5.1 DOGFOODING AC (from GOAL #128 description)

- **[D1]** On the reported screen, `арл түмнийг` is displayed as `ард түмнийг`.
  — user-facing / `semantic` (real-screen acceptance) + `structural` (data).
- **[D2]** A corpus-wide sweep reports the source-origin typo **candidate list
  with evidence** (current value / proposed correction / justification /
  location). — research deliverable / `structural`+`semantic`.
- **[D3]** Confirmed typos are corrected **and** each is documented in the
  intentional-PDF-deviation **ledger** (ambiguous cases handled after user
  confirmation). — `behavior` (data edit) + doc.
- **[D4]** Post-correction **verifiers/tests are GREEN** (no page/ref
  regression). — `executable` (gate).

### 5.2 AC-separability table

| AC | Feature | Separable? | Depends on | Test type | Shippable alone? |
|----|---------|-----------|-----------|-----------|------------------|
| **[D1]** | Single targeted seed fix (`арл`→`ард` in `week-2.json:944`) + `CACHE_VERSION` bump | **YES** | this MM's policy (§1) | semantic (real render) + structural (data) | **YES** — minimal, ships the user's exact reported screen immediately |
| **[D2]** | Corpus-wide sweep → evidence-backed candidate report | **YES** | this MM's methodology (§3) | structural/semantic (report) | **YES** — produces a report, applies no data change |
| **[D3]** | Apply confirmed corrections + create/append ledger (§2) | **NO** | `[D2]` candidate list + user-confirm on ambiguous | behavior + doc | Partial — needs `[D2]` output |
| **[D4]** | Verification — verifiers/tests GREEN, no page/ref regression | **NO** | `[D1]`/`[D3]` edits | executable | Gate, not a standalone feature |

**`multi_feature_ac` = YES → HIGH.** Recommended decomposition for the leader:
ship **[D1]** as a fast standalone fix (immediate user value), run **[D2]** as a
research WI, run **[D3]** as an apply+ledger WI gated on **[D2]** (with a
user-confirm sub-gate for ambiguous candidates), and fold **[D4]** into each of
**[D1]**/**[D3]** as their GREEN gate.

---

## 6. Test Scenario Map (blueprint for downstream steps — reproduce, don't reinvent)

*(canonical MM section: **Test Scenario Map**. When a downstream step's AC is
covered by a row here, REPRODUCE that row's command/assertion rather than
inventing a new recipe.)*

| ID | Scenario | Level | Command / assertion |
|----|----------|-------|---------------------|
| **S1** | Seed fix applied (structural) | structural | `week-2.json:944` contains `ард түмнийг`; `арл түмнийг` absent from `src/data` |
| **S2** | Seed fix on screen (user-facing) | semantic (real render) | Render Week 2 · Fri · Vespers · Intercessions; the invitatory box shows `Эзэн, Та Өөрийн ард түмнийг нигүүлсэнэ үү.` |
| **S3** | No page regression | executable | `node scripts/verify-psalter-pages.js` (and `-body`/`hymn`/`compline`/`propers`/`sanctoral` for any other touched area) exit 0 |
| **S4** | No ref/stanza regression | executable | `node scripts/audit-psalter-ref-consistency.js` — suspect count **not increased** |
| **S5** | Ledger documents each deviation | structural | `docs/data/source-typo-ledger.md` has one row per applied correction (schema §2.1) |
| **S6** | Sweep candidate report exists | structural/semantic | `[D2]` report lists candidates with current / proposed / evidence / location |
| **S7** | Deploy hygiene | structural | `public/sw.js` `CACHE_VERSION` bumped when data bundle changed |

> **Scope note for THIS WI (#156):** the only AC for the MM-definition step is
> *the MM doc exists and covers deliverables (1)–(5)* — a `structural` check.
> Rows S1–S7 are the **blueprint for Steps #157–#164**, not gates on #156.

---

## 7. Citation index (인용 색인)

- **User request (verbatim)** + POLICY NOTE: GOAL #128 description (TaskGet #128).
- **Screenshot (untracked, main-tree)**:
  `/home/min/myproject/divineoffice/Screenshot_20260612_210840_Samsung Browser.jpg`.
- **Defect in app data**: `src/data/loth/psalter/week-2.json:944`
  (Week 2 · Fri · Vespers · `intercessions[3]`; block `:940-956`).
- **Defect in PDF extraction (proves PDF-origin)**:
  `scripts/out/psalter_layout.txt:5247` (context `:5246-5248`).
- **Frequency anomaly (E4)**: `ард түмн` **675×** vs `арл түмн` **1×** in
  `src/data`; `арл` standalone token = **1** occurrence (the defect itself).
- **Verifiers (regression contract §4)**: `scripts/verify-psalter-pages.js`,
  `verify-psalter-body-pages.js`, `verify-hymn-pages.js`,
  `verify-compline-pages.js`, `verify-propers-pages.js`,
  `verify-sanctoral-pages.js`, `audit-psalter-ref-consistency.js`.
- **Tooling availability (§3)**: `hunspell` **absent**; `aspell` present
  (`/usr/bin/aspell`, no Mongolian dictionary).
- **Curated-data discipline (§4.3)**: project memory
  *psalter-curated-no-full-reextract* (extract-psalm-texts.js full-overwrite is
  non-idempotent: 130→117 refs regression).
- **Deploy contract (§4.4)**: `public/sw.js` `CACHE_VERSION`; CLAUDE.md
  "Service Worker 캐시 — 배포 회귀 1순위 리스크".
- **Proposed ledger (§2)**: `docs/data/source-typo-ledger.md` (to be created at
  `[D3]`, not in this step).

---

## Appendix — canonical MM section ↔ this document (reviewer MM-conformance map)

| Canonical MM section | Where in this doc |
|----------------------|-------------------|
| State Model | §1.2 (three decision states CORRECT/CONFIRM/KEEP) |
| Action Map | §1.2 action column + §1.3 evidence-gated action |
| Scenarios | §3 (sweep methodology candidates M1–M4) |
| Visibility Boundary | §4.1 boundary rule + §1.5 non-goals (orthographic-only; no page/ref) |
| Test Scenario Map | §6 (S1–S7) |
| Sync Surface | §2 (ledger) + §4.4 (deploy / `CACHE_VERSION`) |
