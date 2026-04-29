# FR-161 R-14c — page-mapping audit findings (task #201)

> **TL;DR** — Cat G page-mapping audit produced **zero data changes**. All 3 audit-script suspects (1 Samuel 2:1-10, Wisdom 9:1-6,9-11, Revelation 4:11; 5:9-10, 12) are confirmed **false positives** caused by the 6-token fingerprint window crossing a PDF page-break with running-header tokens between them. The 3 Cat G refs explicitly listed in the dispatch (Psalm 30:2-13, Psalm 21:2-8/14, Psalm 144:1-10 ×2) are all valid per the existing `verify-psalter-pages.js` triple-anchor convention (header on p_h, body bulk on p_h or p_h+1). audit suspect count remains 3 with reasoning attached; **no week-*.json edits required**.

@fr FR-161-R14c (task #201)
base: 24bc7ad docs(fr-161): handoff R-17 land + push 반영

---

## 1. Audit suspects — root cause (false positives)

`scripts/audit-psalter-ref-consistency.js` builds a 6-token fingerprint from `psalter-texts.json[ref].stanzas[0]` (joined) and looks for that exact consecutive-token sequence in `parsed_data/full_pdf.txt`. When the first stanza spans a PDF page break, the running-header (e.g. `"2 дугаар долоо хоног"`, 4 tokens) sits **between** the 5th and 6th stanza tokens in the source-token stream — breaking the consecutive-match requirement.

### 1.1 1 Samuel 2:1-10 (week-2 WED lauds psalms[1], declared p.229)

| Token position | JSON expects | PDF actual | Page |
|----------------|-------------|-----------|------|
| 1-5 | эзэн тандаа зүрх минь баярлана | ✓ same | **229** (line 15… body line) |
| (header break) | — | `2 дугаар долоо хоног` (4 tokens) | 230 |
| 6+ | эзэнийхээ дотор эвэр минь бас өргөгдөнө | ✓ same | **230** |

5-token fingerprint matches at p.229; 6-token fails because 4 header tokens intervene. **declared 229 is correct** — the psalm body opens on p.229.

### 1.2 Wisdom 9:1-6, 9-11 (week-3 SAT lauds psalms[1], declared p.392)

Same shape but additionally has Cat-B translation drift between JSON and PDF:

| Token position | JSON expects | PDF actual | Page |
|----------------|-------------|-----------|------|
| 1-5 | аяа эцэг өвөг дээдсийн тэнгэрбурхан | ✓ same | **392** |
| 6 | нигүүлсхүйн (no `минь` between) | `минь` then `нигүүлсэхүйн` (extra `минь`, suffixed spelling) | 392 |

5-token fingerprint matches at p.392; 6-token fails because the JSON drops `минь` after `Тэнгэрбурхан` AND uses `Нигүүлсхүйн` vs PDF `Нигүүлсэхүйн`. **declared 392 is correct** — it is genuine Cat-B translation drift, out of FR-161 scope per audit doc §3 Cat B.

### 1.3 Revelation 4:11; 5:9-10, 12 (week-3 TUE vespers psalms[2], declared p.339)

| Token position | JSON expects | PDF actual | Page |
|----------------|-------------|-----------|------|
| 1-5 | бидний эзэн бөгөөд тэнгэрбурхан минь | ✓ same | **339** (canticle reused at 104/222/339/452) |
| (header break) | — | `3 дугаар долоо хоног` (4 tokens) | 340 |
| 6+ | алдар хүндэтгэл хүчийг та хүлээн авах нь зохистой | ✓ same | **340** |

5-token fingerprint matches at {104, 222, 339, 452}. 6-token loses 339 specifically (other 3 reused-pages keep matching because the canticle is also printed contiguously there). **declared 339 is correct**.

### 1.4 Why this is reported by the audit but not by `verify-psalter-pages.js`

`verify-psalter-pages.js`'s `stanzaFingerprint()` already mitigates this (see lines 137-167 of that script): it prefers a **single-line** fingerprint when ≥4 tokens, falling back to `stanzas[1]` first line if `stanzas[0]` is too short. The single-line fingerprint never crosses a page break, so the running-header issue cannot occur. `audit-psalter-ref-consistency.js` joins all `stanzas[0]` lines and takes the first 6 tokens — which is more aggressive against ref/page mismatch (longer = harder to match coincidentally) but more brittle against page-break-crossing.

---

## 2. Cat G refs — page validity per book convention

| Ref | Locator(s) | declared | header @ | stanzas[0] first line @ | stanzas[1] first line @ | verifier verdict |
|-----|-----------|----------|----------|------------------------|------------------------|-------------------|
| Psalm 21:2-8, 14 | week-1 TUE vespers psalms[1] | 103 | 103 | 103 | (n/a) | **agree** ✓ |
| Psalm 30:2-13 | week-1 THU vespers psalms[0] | 132 | 132 | 132 | 132 | **agree** ✓ |
| Psalm 144:1-10 | week-4 TUE lauds psalms[2] | 445 | **444** | **444** (`Гарыг минь дайтахад`) | **445** (`Аяа, ЭЗЭН, тэнгэрсээ…`) | **agree** ✓ — `stanzaPageForStar` = 445 = declared (book convention: declared = body-bulk page, not the teaser line on p_h-1) |
| Psalm 144:1-10 | week-4 THU vespers psalms[0] | 481 | **480** | **480** | **481** | **agree** ✓ — same convention |

The triple-anchor verifier accepts these with explicit code path:
```js
// scripts/verify-psalter-pages.js:251-260
// Accept declared if it matches either the header-anchor page (pStar)
// OR the body-start page (stanzaPageForStar). The Mongolian book's
// declaration convention is "page where the psalm body begins"; when
// the header prints on p_h-1 and body on p_h (common at page-break
// straddles), declared == stanzaPageForStar is also valid.
```

Audit-doc §3 Cat G's note about Psalm 144 ("declared page=445 but rich first line found at PDF physical lines 8578 / 9285") referred to physical-line mismatch, not page-mapping error — the off-by-one IS deliberate per book typography (single-line teaser on p.444, body bulk starts p.445).

---

## 3. Verifier baselines (zero regression — no data changed)

| Verifier | agree | verified-correction | manual-review | other |
|----------|-------|--------------------|--------------|----------|
| verify-psalter-pages | 157 | 4 | 1 | part-II-skipped 6 |
| verify-hymn-pages | 113 | 0 | 9 | — |
| verify-compline-pages | 23 | 0 | 7 | — |
| verify-propers-pages | 751 | 6 | 14 | — |
| verify-psalter-body-pages | 168 | 0 | 44 | — |
| verify-sanctoral-pages | 100 | 5 | 0 | — |
| audit-psalter-ref-consistency | — | — | — | suspects 3 (all false positive) |
| verify-phrase-coverage | — | — | — | 215/0 OK |
| vitest | — | — | — | 674 PASS / 0 FAIL |
| tsc | — | — | — | 0 errors |

The 4 verified-correction entries in `verify-psalter-pages` (Psalm 45:2-10, Psalm 49:1-13, Psalm 132:1-10, Psalm 145:1-13 — all off-by-one declared/actual=p_d-1) are pre-existing (NOT introduced by R-14c) and out of this dispatch's scope.

---

## 4. Recommended follow-ups (not in R-14c)

1. **R-14d (optional, low ROI)** — Align `audit-psalter-ref-consistency.js` `firstStanzaTokens()` with `verify-psalter-pages.js` `stanzaFingerprint()` (single-line preferred, ≥4 tokens, stanzas[1] fallback). This would reduce the 3 false positives to 0 cleanly. Risk: theoretically allows shorter coincidental matches; mitigation: keep `WINDOW_RADIUS=2`. Defer until/unless CI noise from these 3 false positives becomes a friction point.
2. **R-14b (still pending)** — Cat-B translation drift (Wisdom 9 `Нигүүлсхүйн` vs PDF `Нигүүлсэхүйн`, et al.) is the deeper issue masking the audit signal. Out of FR-161 immediate scope per audit doc §3 Cat B.
3. **Pre-existing verified-corrections (4 refs)** — Psalm 45:2-10 / 49:1-13 / 132:1-10 / 145:1-13 are flagged off-by-one by `verify-psalter-pages`. These are pre-existing and could be applied in a separate dispatch.

---

## 5. Constraints + caveats

- **Read-only finding outcome** — the dispatch's "잔여 reasoning 명시" path is taken since no week-*.json values are wrong.
- The Cat-G note about Psalm 144 in `docs/fr-161-r14-pdf-indent-inconsistency.md` §3 is technically accurate at the line-number level but not actionable as a page-mapping fix per the existing book convention encoded in `verify-psalter-pages.js`.
- All evidence verified against `parsed_data/full_pdf.txt` (current HEAD `24bc7ad`).
