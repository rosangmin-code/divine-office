# shortReading Cross-Section Bleed-Over Audit

- generated: 2026-04-23T08:40:13.892Z
- window: 30 chars
- shortReadings total: 126
- psalm corpus: 137 entries

## Buckets

- **suspect** (unknown bleed-over, needs review): 0
- **legitimate-overlap** (annotated Scripture/parallel): 4
- **clean**: 122
- **verified-correction (historical)**: 3

## Legitimate Overlaps (known Scripture/parallel, annotated)

substring match 가 의도적 성서 인용·병행 공식으로 확인된 항목. 교정 대상 아님.

### ADVENT/w1/MON/lauds (page 556)
- ref: `Isa 2:3-4`
- source_file: propers/advent.json
  - **tail** vs `Isaiah 2:2-5`
    - reason: Isa 2:3-4 is a proper subset of the canticle Isaiah 2:2-5; identical Scripture text by design.

### PSALTER/w1/SUN/vespers (page 73)
- ref: `2 Коринт 1:3-7`
- source_file: psalter/week-1.json
  - **head** vs `Ephesians 1:3-10`
    - reason: Pauline blessing formula "Бидний Эзэн Есүс Христийн Эцэг Тэнгэрбурхан ерөөлтэй еэ!" opens both 2 Cor 1:3 (this shortReading) and Eph 1:3 (canticle in psalter-texts). Parallel doctrinal formula, not contamination.

### PSALTER/w1/SAT/vespers (page 73)
- ref: `2 Коринт 1:3-7`
- source_file: psalter/week-1.json
  - **head** vs `Ephesians 1:3-10`
    - reason: Saturday 1st-Vespers reuses Sunday 2nd-Vespers shortReading (liturgical pattern); same Pauline formula overlap as PSALTER/w1/SUN/vespers.

### PSALTER/w2/SUN/lauds (page 182)
- ref: `Езекиел 36:25-28`
- source_file: psalter/week-2.json
  - **tail** vs `Ezekiel 36:24-28`
    - reason: Ezek 36:25-28 (shortReading) is a proper subset of the canticle Ezekiel 36:24-28; identical Scripture text by design.

## Verified Corrections (historical, for traceability)

과거 스윕/수동 검토로 발견 + 교정 완료한 bleed-over 사례. 재발 감지용 baseline.

- **PSALTER/w1/SAT/lauds** (page 163, ref `2 Петр 1:10-11`, commit deb4d2b, wi-004)
  - bled_from: `Psalm 117:1-2`
  - note: Psalm 117:1-2 tail ("Бүх үндэстэн, ЭЗЭНийг магтагтун Бүх ард түмэн, Түүнийг өргөмжлөгтүн!") had been appended to 2 Петр 1:10-11 text during transcription; removed. Rich builder acceptance gate now PASS.
- **psalter-texts.json → Psalm 33:1-9** (page 96, ref `Psalm 33:1-9`, commit TBD (this WI), task-9)
  - bled_from: `Rom 13:14 (shortReading at ADVENT/w1/SUN/lauds p551)`
  - note: Spurious stanza ["Эзэн Есүс Христийг өөртөө өмс. Хүсэл тачаалыг нь хангах юугаар ч махбодыг бүү тэтгэ."] was inserted between legitimate stanzas[2] and stanzas[4] in Psalm 33:1-9 body. Content is Romans 13:14, unrelated to psalm. Removed. PDF p96-98 has no such line.
- **psalter-texts.json → Psalm 57:2-12** (page 125, ref `Psalm 57:2-12`, commit TBD (this WI), task-9)
  - bled_from: `Easter antiphon ("Амилалтын цаг улирал…Аллэлуяа!") + prophetic formula fragment ("сайхнаар хангалуун байх болно гэж ЭЗЭН тунхаглаж байна.")`
  - note: Psalm body stanza[1] had two intruder elements: (a) a prophetic-formula tail grafted to legitimate line "Үүрийн гэгээг би сэрээнэ." and (b) an Easter-season antiphon line. Both removed. Simultaneously, the psalm body was truncated (ended at Ps 57:8); Ps 57:9-12 (PDF p126 lines 4155-4163) restored verbatim.
