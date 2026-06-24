# Bug report — week-4.json THU vespers Psalm 144:1-10 page off-by-one (481 → 480)

- **Date**: 2026-06-24
- **Found by**: dvo-sol during WI #209 (#200-sub-2, restore Psalm 144:1-10 missing 12 lines)
- **Status**: FIXED in the same commit as WI #209 (leader-approved bundle, NECESSARY incidental)
- **Severity**: minor (wrong "see page" reference; psalm text itself was correct)
- **Class**: pre-existing latent data bug, surfaced (not introduced) by the WI #209 fix

## Symptom

`src/data/loth/psalter/week-4.json` `days.THU.vespers.psalms[0]` ("Psalm 144:1-10")
recorded `page: 481`. The psalm actually **starts on book page 480**; 481 is the
page the psalm spills onto mid-text. The user-facing "х. 480/481" page reference
was therefore off by one for Thursday vespers (week 4).

## Surfacing mechanism (why it was latent)

`scripts/verify-psalter-pages.js` confirms a recorded page by matching the
stanza's leading tokens against `parsed_data/full_pdf.txt` and reading the
nearest page marker. Before WI #209, `psalter-texts.json` "Psalm 144:1-10"
`stanza[0]` had been truncated by a page-break extraction loss to a single line
("Гарыг минь дайтахад,") — too few tokens for the verifier to reach its
confidence threshold, so the discrepancy sat in a lower bucket and was never
flagged as a `verified-correction`.

WI #209 restored the 12 missing lines. The added line
"Хурууг минь тулалдахад бэлтгэдэг," gave the verifier enough tokens to
confidently locate the psalm on page 480 and flag `page: 481` as a correction.

## SoT evidence (`parsed_data/full_pdf.txt`, THU-vespers occurrence)

```
L16606  480                         <- page marker 480
L16623  Дуулал 144                  <- psalm header (on page 480)
L16628  I
L16629  Гарыг минь дайтахад,        <- psalm body starts (on page 480)
...
L16642  481                         <- page marker 481 (mid-psalm page break)
L16643  Пүрэв гарагийн орой         <- "Thursday evening" = THU vespers (confirms entry)
```

Header + body start are between markers 480 and 481 → psalm starts on **480**.

## Verifier log (before / after the fix)

```
# BEFORE (with WI #209 12-line restore, week-4.json page still 481)
$ node scripts/verify-psalter-pages.js
  agree                : 159
  verified-correction  : 1     <- week-4.json THU vespers Ps144  481 -> 480
corrections: scripts/out/psalter-page-corrections.json (1 entries)

# AFTER (week-4.json page 481 -> 480)
$ node scripts/verify-psalter-pages.js
  agree                : 160
  verified-correction  : 0     <- NFR-009c gate green
corrections: scripts/out/psalter-page-corrections.json (0 entries)
```

## Fix

`src/data/loth/psalter/week-4.json` `days.THU.vespers.psalms[0].page`: `481` → `480`.

## Note

Worth a future sweep: other psalms whose stanzas were/are truncated by
page-break extraction loss may hide the same below-threshold page off-by-one.
Re-running `verify-psalter-pages.js` after each text-restore WI catches them.
