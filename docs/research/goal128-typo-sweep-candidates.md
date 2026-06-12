# GOAL #128 — Source-PDF Typo Sweep: Candidate Inventory (D2)

> **TL;DR** — Executed the MM's sweep methodology (M2 token-frequency anomaly + M4
> OCR-confusion single-substitution; M1 hunspell infeasible) over the **entire**
> `src/data/loth` prayer-data surface (356 JSON files, 174,299 Cyrillic tokens).
> The heuristic surfaced ~40 anomaly candidates; rigorous E1–E4 + context + PDF-corpus
> triage reduces them to **2 PDF-origin typos** (arl→ard seed + **Гэнгэрбурханд→Тэнгэрбурханд** NEW),
> **2 data-entry divergences** (туд→тул, Харагтүн→Харагтун — restore PDF fidelity, no ledger),
> and **1 leader-resolved KEEP** (ёолон, valid Rom 8:26 "groaning" form). The remaining ~33 are **KEEP** — legitimate
> rare words one edit from a common word (false positives the MM predicted). **Zero data edits**
> in this WI. Coverage gaps (multi-char edits, word-boundary/spacing, punctuation) are documented
> in §6 and feed follow-up scope.
>
> Author: dvo-plan-cl (planner, WI `wi-156-002` / `[#128-sub-2b]`). Methodology SSOT:
> `docs/design/mental-models/goal128-source-typo-sweep.md` (§1 E1–E4 bar, §3 M1–M4).
> Mongolian text quoted verbatim (citation exception). NO data edits — this is an inventory.

---

## 1. Methodology executed (per MM §3, M1–M4)

| Candidate | Status | What was run |
|-----------|--------|--------------|
| **M1** spellcheck diff | **NOT feasible** | `hunspell` absent; `aspell` present but no Mongolian dictionary. No OOV pass possible without sourcing a `mn_MN` Hunspell dict (deferred — see §6). |
| **M2** token-frequency anomaly | **EXECUTED** | `scratch/dvo/sweep_freq.py`: tokenized all Cyrillic words across 356 JSON files; flagged tokens with freq ≤ 3 whose single-substitution neighbor has freq ≥ 12 and ≥ 8× the token's freq. |
| **M3** cross-occurrence | **PARTIAL (subsumed by M2)** | Frequency dominance IS the cross-occurrence signal (e.g. `ард түмн` 675× vs `арл түмн` 1×). No separate formula-clustering pass; gap noted §6. |
| **M4** targeted OCR-confusion grep | **EXECUTED (merged into M2)** | Single-substitution restricted to a curated confusion set (д/л, г/т, н/и/п/я, о/е/с, ц/щ, з/э, и/й, ь/ъ, е/ё, у/ү, о/ө, …) as PASS A (high precision); arbitrary single-sub with very-frequent neighbor as PASS B (recall net). |

**Triage protocol** (MM §1.3 evidence bar, applied to every candidate):
E1 non-word · E2 minimal OCR edit · E3 standard collocation · E4 corpus corroboration —
**plus** an occurrence-context read and a **PDF-corpus provenance check**
(`scripts/out/psalter_layout.txt` + `parsed_data/full_pdf.txt`) to separate
**PDF-origin** typos (policy exception applies → correct + ledger) from
**data-entry divergence** (PDF already correct → restore fidelity, no ledger).

---

## 2. Coverage (what was scanned)

- **Surface**: every `*.json` under `src/data/loth/` — **356 files**:
  psalter (`psalter/week-{1..4}.json`, `psalter-texts.json`), commons
  (`prayers/commons/**` incl. `psalter-texts.rich.json`, `psalter-headers.rich.json`,
  `compline/**`), hymns (`prayers/hymns/*.rich.json` ×122), seasonal
  (`advent/lent/easter/christmas/ordinary-time`), propers, sanctoral,
  ordinarium, `gilh.json`.
- **Corpus**: 174,299 Cyrillic word tokens; 10,179 distinct vocab. JSON parse failures: **0**.
- **PDF provenance corpus**: `scripts/out/psalter_layout.txt` (18,700 lines, tracked) +
  `parsed_data/full_pdf.txt` (32,761 lines, main-tree — absent in worktree, read via absolute path).
- **compline** (7 files) scanned — **no anomaly candidate** surfaced (clean).

Explicit exclusions: see §6.

---

## 3. Actionable candidates (CORRECT / CONFIRM)

### 3a. PDF-origin typos → CORRECT + ledger (MM §1 exception applies)

| # | Current → Proposed | Location | Evidence (E1–E4) | PDF provenance | Verdict |
|---|--------------------|----------|------------------|----------------|---------|
| A1 | `арл түмнийг` → `ард түмнийг` | `psalter/week-2.json:944` (W2 Fri Vespers intercession) | E1✓ `арл` hapax non-word · E2✓ д/л · E3✓ `ард түмэн` · E4✓ `ард түмн` 675× vs 1× | **PDF-origin** — `psalter_layout.txt:5247` has `арл түмнийг` | **CORRECT** — *seed; owned by D1 `wi-156-001`. Still present at this base (not yet merged).* |
| A2 | `Гэнгэрбурханд` → `Тэнгэрбурханд` | `prayers/commons/psalter-headers.rich.json:643` (`preface_text`) | E1✓ `Гэнгэрбурхан` non-word · E2✓ г/т@0 · E3✓ `Тэнгэрбурхан`=God · E4✓ neighbor 220× | **PDF-origin** — `psalter_layout.txt:5494` has same phrase `"Христээр дамжуулан Гэнгэрбурханд магтаалын"`; `Гэнгэрбурхан` = 1× data, 1× PDF | **CORRECT (NEW)** — strongest new finding; eligible for ledger. |

### 3b. Data-entry divergence → CORRECT, restore PDF fidelity (NO ledger — PDF already correct)

| # | Current → Proposed | Location | Evidence | PDF provenance | Verdict |
|---|--------------------|----------|----------|----------------|---------|
| B1 | `Тиймийн туд` → `Тиймийн тул` | `psalter/week-1.json:797` (concludingPrayer) | E1✓ `туд` non-word here · E2✓ д/л · E3✓ `Тиймийн тул`="therefore" · E4✓ `тул` 780× | **Data-entry** — PDF has `Тиймийн тул` **15×**, `Тиймийн туд` **0×** | **CORRECT** — fidelity restore (not a PDF deviation → no ledger row). |
| B2 | `Харагтүн` → `Харагтун` | `sanctoral/solemnities.json:491` & `:730` (Magnificat antiphon, Lk 1:48) | E1✓ vowel-harmony violation (`харах` back-vowel ⇒ `-тун`) · E2✓ ү/у · E3✓ `харагтун`="behold!" · E4✓ 51× | **Data-entry** — PDF has `харагтун` **9×**, `харагтүн` **0×** | **CORRECT** — fidelity restore (no ledger). |

### 3c. CONFIRM (ambiguous — user decision required, never silent-correct)

| # | Current → ? | Location | Why ambiguous | Verdict |
|---|-------------|----------|---------------|---------|
| C1 | `ёолон` | `gilh.json:73` (General Instruction reference doc) | Leader verdict: `ёолон` is valid here as the Rom 8:26 quote's "groaning" form (`ёолох` = groan); PDF has it **2×**. | **KEEP** — no data change. Recorded by D3 `wi-156-003`. |
| C2 | `нэрэн`, `дүнд`, `хүртэнэ`, `тэрэнд`, `гэгэн`, `боджээ`, `зориулая` | various (see §4) | Each is a **valid form** in context (poetic/archaic/converb) but is a nonstandard or low-frequency variant a confusion-edit from a common word. Not obvious typos; flag only if a reviewer reading the screen disagrees. | **CONFIRM→lean KEEP** — see §4 reasons; no action unless reviewer flags. |

---

## 4. KEEP — false positives (the frequency heuristic's expected noise)

The MM rated M2 "medium precision"; these confirm why. Each is a **legitimate Mongolian
word**, contextually correct, that merely sits one confusion-edit from a high-frequency word.
**No action.**

| Current | "Neighbor" | KEEP reason (context) |
|---------|-----------|------------------------|
| `мартах` / `мартана` / `мартдаг` | магтах | `мартах`=**forget** — Ps 137:5 "if I **forget** you, Jerusalem"; Ps... "do not **forget** the departed"; Jas 1:24. Opposite of магтах=praise. |
| `сум` | сүм | `сум`=**arrow** — Ps 57:4 "teeth like spears and **arrows**". |
| `дээл` | дээд | `дээл`=**robe** — Rev 7:9 "clothed in white **robes**". |
| `гүгэл` | нүгэл | `гүгэл`=**frankincense** — Mt 2:11 "gold, **frankincense**, myrrh". |
| `назар` | газар | `Назар`=**Nazareth** (proper noun) — `solemnities.json:12`. |
| `тасална` | тусална | `таслах`=**cut off** — Ps 118:10 "in the name of the LORD I will **cut them off**". |
| `өчиж` | очиж | `өчих`=**confess/declare** — Phil 2:11 "every tongue **confess**". |
| `дэндүү` | дэнлүү | `дэндүү`=**too/exceedingly** — Ps 139:6 "knowledge **too** wonderful". |
| `тэсэн` | гэсэн | `тэсэн ядан`=fixed idiom **"impatiently/barely enduring"**. |
| `ганд` | танд | `ган`=**drought**, `ганд`="in drought" — "summer **drought**". |
| `гэрээр` | тэрээр | `гэр`=**house**, `гэрээр`="through the house" — Ps 118:3 "the **house** of Aaron". |
| `бодон` | болон | `бодох`=**think**, converb `бодон` — "**thinking** of the Lord's love". |
| `зов` | зөв | `зовох`=**worry**, imperative `бүү зов`="**don't worry**" — Phil 4:6. |
| `зориулая` | зориулан | `зориулъя/зориулая`=**"let us dedicate"** (volitive) — hymn. |
| `хотол` | хотод | `хотол түмэн`=archaic **"all the people"** — Ps 111:1. |
| `оддог` | олдог | `одох`=**depart**, "нисэн **оддог**"="fly **away**" — Ps 90:10. |
| `үрийн` | үгийн | `үр`=**seed/offspring** — Gen 3:15 "her **seed**". |
| `дууд` / `дуудагтун` | дуул / дуулагтун | `дуудах`=**call** — "**call** upon his name" (Ps 105:1 / Isa 55:6). |
| `идэгтүн` | ирэгтүн | `идэх`=**eat**, imperative — Isa 55:1 "buy and **eat**" (both words in same verse, both correct). |
| `тэрийг` | гэрийг | `Тэр`=**He**, accusative `Тэрийг` — Jn 1:29 "Behold **Him**". |
| `гийн` | тийн | genitive suffix `-гийн` on quoted `"Хүний Хүү"` — tokenization artifact, not a word. |
| `нэгд` | нэрд | `арван нэгд`="**to the eleven**" (disciples). |
| `чөлөөт` | чөлөөг | `чөлөөт цаг`="**free** time" (adjective). |
| `байраа` | байгаа | `байр`=**dwelling/place** + reflexive — Jn 14:23 "make our **home**". |
| `боджээ` | болжээ | `бодох`=**think** — Ps 48:9 "we have **thought** on your lovingkindness". |
| `нэрэн` / `нэрэнд` | нэгэн / нэгэнд | poetic connective/dative of `нэр`=**name** — "under the **name** of Christ"; "thanks **to your name**". |
| `гэгэн` | нэгэн | `гэгэн`=**holy/serene** (variant of гэгээн; cf. "Богд гэгээн"). |
| `тэрэнд` | тэдэнд | colloquial dative of `тэр`=**it** — Ps 62:10 "set not your heart **on it**". |
| `хорсон` | хоосон | `хорсох`=**be embittered** (converb) — obscure hymn line; valid verb. |
| `дүнд` | дунд | `дүн`=**result**, "as a **result** of the trial" — 1 Pet 1:7. |
| `хүртэнэ` | хүргэнэ | `хүртэх`=**receive/attain** — Pentecost antiphon; valid. |
| `иерусалим` | йерусалим | transliteration variant of **Jerusalem** (data has both `Иерусалим` and `Йерусалим`) — normalization, not a typo (see §6). |
| `ёолон` | ёслол / ёслон | **KEEP per leader verdict (D3 `wi-156-003`)** — valid `ёолох` "groan" form in the Rom 8:26 quotation; PDF uses the same form 2×, so `gilh.json:73` stays unchanged. |

*(PASS-B recall-net remainder — ~200 lower-confidence single-substitution pairs — sampled;
every sampled item resolved to KEEP for the same "valid word in context" reason. Full PASS-B
list is reproducible via `scratch/dvo/sweep_freq.py`.)*

---

## 5. Recommendation for D3 (apply step)

| Bucket | Items | Action at D3 |
|--------|-------|--------------|
| PDF-origin, obvious | **A2** `Гэнгэрбурханд→Тэнгэрбурханд` | Correct in `psalter-headers.rich.json:643`; **ledger row** (intentional PDF-deviation). |
| PDF-origin, obvious | **A1** `арл→ард` | Already owned by D1 `wi-156-001` — do not double-fix; ensure ledger row exists. |
| Data-entry divergence | **B1** `туд→тул`, **B2** `Харагтүн→Харагтун` (×2) | Restore PDF fidelity; **no ledger** (PDF already has correct form — not a deviation). Optionally a separate "data-fidelity" note. |
| Leader-resolved KEEP | **C1** `ёолон` | No data change; KEEP note recorded above. |

**Cross-artifact note (MM §4.3):** several locations exist in BOTH `psalter-texts.json` and the
generated `psalter-texts.rich.json` / `psalter-headers.rich.json`. A2 lives only in the rich
header file; B1/B2 live in single source files. Any edit must follow the **surgical-edit, no
full-reextract** discipline and re-run `verify-*-pages.js` + `audit-psalter-ref-consistency.js`
(suspect count must not increase), plus a `CACHE_VERSION` bump at apply.

---

## 6. Coverage & limitations (what was NOT covered, and why)

| Gap | Reason / impact | Follow-up |
|-----|-----------------|-----------|
| **M1 spellcheck (OOV pass)** | `hunspell-mn` absent; no `mn_MN` dict installed. Pure non-word recall is therefore bounded by the frequency heuristic. | Source a LibreOffice `mn_MN` Hunspell dict → OOV pass with human triage (emergent WI). |
| **Multi-character typos (>1 edit)** | M2 models **single substitution** only. A 2-edit typo (e.g. two confused glyphs) is invisible unless its neighbor is still 1 edit away. | Levenshtein-2 pass on rare tokens (higher noise; needs stronger triage). |
| **Both-forms-rare typos** | If neither the typo nor its correction is frequent, no anchor exists → not surfaced. | Hunspell/dictionary-based detection (M1). |
| **Word-boundary / spacing errors** | Token-frequency cannot model merges/splits — e.g. GOAL #126 `хэнбугай ч`, mis-spacing like `Зургаадугаар`. | Dedicated spacing/whitespace pass (separate methodology). |
| **Punctuation / quote-pairing** | Out of token scope — e.g. GOAL #127 Psalm 110 quote mismatch. | Owned by separate GOALs (#126/#127). |
| **Insertion/deletion edits** | Only substitution modeled (extra/missing/doubled letter not searched). | Add indel neighbors to M2 (noisier). |
| **Transliteration inconsistency** | `Иерусалим` vs `Йерусалим` flagged but is a **normalization** decision, not a typo. | Separate normalization task if desired. |
| **Semantic typos (valid wrong word)** | Undetectable by any orthographic method. | Out of scope for automated sweep. |
| **`src/data/bible/**`** | **Excluded** — outside dispatched scope (`src/data/loth/**` specified); separate scripture-reference corpus. | Optional follow-up sweep over bible/. |

**Effort note:** completed within the Gate-beta ~30m envelope; no residual-scope promotion
needed. The follow-up items above are genuinely *new* methodology scope (M1 dict sourcing,
indel/multi-edit, spacing) rather than unfinished M2/M4 work — recommend the leader spawn an
emergent WI only if broader recall is desired beyond the single-substitution confusion sweep.

---

## 7. Citation index

- **Methodology SSOT**: `docs/design/mental-models/goal128-source-typo-sweep.md` (§1 E1–E4, §3 M1–M4, §4 verifier contract).
- **Analysis scripts (intermediate, scratch)**: `sweep_freq.py` (M2/M4), `sweep_locate.py` (locate + provenance).
- **A1 seed**: `src/data/loth/psalter/week-2.json:944`; PDF `scripts/out/psalter_layout.txt:5247`.
- **A2 NEW**: `src/data/loth/prayers/commons/psalter-headers.rich.json:643`; PDF `scripts/out/psalter_layout.txt:5494`.
- **B1**: `src/data/loth/psalter/week-1.json:797`; PDF `Тиймийн тул` 15× / `туд` 0× (`parsed_data/full_pdf.txt`).
- **B2**: `src/data/loth/sanctoral/solemnities.json:491,730`; PDF `харагтун` 9× / `харагтүн` 0×.
- **C1**: `src/data/loth/gilh.json:73`; PDF `ёолон` 2× / `ёслол` 42× / `ёслон` 26×.
- **Verifier contract**: `scripts/verify-*-pages.js`, `scripts/audit-psalter-ref-consistency.js`; deploy `public/sw.js CACHE_VERSION`.
