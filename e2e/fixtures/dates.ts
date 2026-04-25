export const DATES = {
  // Ordinary Time Week 1 Sunday — FR-153 pilot date. Romcal labels this
  // 2nd Sunday of OT but weekOfSeason=1 (1st Sunday is Baptism of the Lord).
  otWeek1Sunday: '2026-01-18',

  // Ordinary Time weekday (GREEN, WEEKDAY rank)
  ordinaryWeekday: '2026-02-04', // Wednesday, OT Week 4

  // Ordinary Time Sunday
  ordinarySunday: '2026-02-08',

  // Ordinary Time Saturday — the day BEFORE ordinarySunday.
  // FR-011: Saturday vespers must use next Sunday's vespers propers
  // (liturgical 1st Vespers of Sunday).
  ordinarySaturday: '2026-02-07',

  // Advent weekday (VIOLET)
  adventWeekday: '2025-12-04', // Advent Week 1 Thursday (no memorial)

  // Late Advent date-keyed propers (Dec 17-24)
  adventDec20: '2025-12-20',

  // Christmas (WHITE)
  christmasDay: '2025-12-25',

  // Lent weekday (VIOLET)
  lentWeekday: '2026-03-04', // Lent Week 1 Wednesday

  // Sacred Triduum — Holy Thursday Lauds uses the simplified single-antiphon
  // responsory format (FR-152 Triduum fallback branch).
  holyThursday: '2026-04-02',

  // Saturday evening before Palm Sunday — FR-156 Phase 2 (task #20)
  // regression guard. Lent W5 Saturday vespers = 1st Vespers of Palm
  // Sunday (Lent W6 per romcal). PDF authors the Passion/Palm Sunday
  // antiphon variants inside the PDF_W2 First Vespers block; the
  // injector maps weeks['6'].SUN.firstVespers → PDF_W2 so the Saturday
  // vespers render surfaces lentPassionSunday.
  palmSundayEve: '2026-03-28',

  // Christmas Eve — FR-156 Phase 3b (task #22) e2e target.
  // 2026-12-24 Thursday evening (4th Thursday of Advent) → tomorrow is
  // 2026-12-25 Christmas (SOLEMNITY). Phase 3a resolver adopts the
  // sanctoral/solemnities.json 12-25 firstVespers (Phase 3b injection)
  // and surfaces the Christmas Magnificat antiphon + Ps 113 + Ps 147.
  // Overrides the ADVENT date-key (dec24) vigil propers that would
  // otherwise render.
  christmasEve2026: '2026-12-24',
  // Saturday evening before Assumption — 2026-08-14 Friday. Tomorrow
  // 2026-08-15 = Assumption (SOLEMNITY per romcal). Currently injected
  // as feasts.json key 08-15 via the sanctoral merge path (rank from
  // PDF was "Баяр" but the solemnities.json already carried the entry).
  assumptionEve2026: '2026-08-14',

  // FR-156 Phase 4b (task #24) — movable solemnity First Vespers
  // evening-before dates. Phase 4a resolver already wires the special-
  // key lookups in propers/{easter,ordinary-time}.json; Phase 4b
  // populates the data. All six eves drop a SOLEMNITY on the NEXT day,
  // so the `assembleHour` resolver's tomorrow-check adopts
  // `weeks['<specialKey>'].SUN.firstVespers`.
  ascensionEve2026: '2026-05-13',       // Wed eve — Ascension Thu May 14
  pentecostEve2026: '2026-05-23',       // Sat eve — Pentecost Sun May 24
  trinitySundayEve2026: '2026-05-30',   // Sat eve — Trinity Sun May 31
  christTheKingEve2026: '2026-11-21',   // Sat eve — Christ the King Sun Nov 22

  // FR-156 task #30 — FEAST rank First Vespers eves.
  // Resolver now accepts rank === 'FEAST' so the 4 feast entries whose
  // PDF authors 1st Vespers (02-02, 08-06, 09-14, 11-09) surface on
  // the evening before.
  presentationEve2026: '2026-02-01',       // Sun eve — Presentation Mon Feb 2
  transfigurationEve2026: '2026-08-05',    // Wed eve — Transfiguration Thu Aug 6
  holyCrossEve2026: '2026-09-13',          // Sun eve — Exaltation Mon Sep 14
  lateranBasilicaEve2026: '2026-11-08',    // Sun eve — Lateran Basilica Mon Nov 9

  // Easter Sunday (WHITE)
  easterSunday: '2026-04-05',

  // Easter Octave weekday (psalterWeek=5 from romcal, clamped to 1)
  easterFriday: '2026-04-10',

  // Easter 3rd Sunday (normal psalterWeek=3)
  easter3rdSunday: '2026-04-19',

  // Easter Week 2 Thursday — the day whose vespers propers carry
  // `gospelCanticleAntiphonPage: 722` (easter.json line 298). Task #11
  // exercises the Magnificat heading/antiphon page split here.
  easterW2Thursday: '2026-04-16',

  // Easter weekday (mid-season, outside the Octave) — verifies psalm /
  // canticle antiphons carry the Easter Alleluia ending even when the
  // proper isn't a special day. 2026-04-23 is a Thursday in Easter week 3.
  easterWeekday: '2026-04-23',

  // Task #54 — rich-overlay wk1 fallback regression dates.
  // Easter wk2 MON / wk3 SAT both fall through propers-loader's wk1
  // fallback for JSON propers; the matching seasonal rich file lives at
  // `seasonal/easter/w1-{day}-{hour}.rich.json` (Easter Octave). Without
  // the symmetric rich fallback, these dates render the JSON ref/page
  // from week 1 alongside a body sourced from psalter commons rich.
  easterW2Monday: '2026-04-13', // Easter Week 2 Monday
  easterW3Saturday: '2026-04-25', // Easter Week 3 Saturday
  // Lent / Advent weekday representatives for cross-season fallback guard.
  // Lent Week 2 Tuesday (2026-03-03) and Advent Week 2 Wednesday
  // (2025-12-10) both repeat their respective wk1 weekday formularies
  // per propers-loader.
  lentW2Tuesday: '2026-03-03',
  adventW2Wednesday: '2025-12-10',

  // Solemnity: St. Joseph
  stJoseph: '2026-03-19',

  // Season transition boundary
  lastOTSaturday: '2025-11-29',
  firstAdventSunday: '2025-11-30',

  // Year boundary
  newYearsEve: '2025-12-31',
  newYearsDay: '2026-01-01',
} as const

export const ALL_HOURS = ['lauds', 'vespers', 'compline'] as const

export const HOUR_NAMES_MN: Record<string, string> = {
  lauds: 'Өглөөний даатгал залбирал',
  vespers: 'Оройн даатгал залбирал',
  compline: 'Шөнийн даатгал залбирал',
}

export const SEASON_NAMES_MN: Record<string, string> = {
  ORDINARY_TIME: 'Жирийн цаг улирал',
  ADVENT: 'Ирэлтийн цаг улирал',
  CHRISTMAS: 'Мэндэлсэн өдрийн цаг улирал',
  LENT: 'Дөч хоногийн цаг улирал',
  EASTER: 'Дээгүүр өнгөрөх цаг улирал',
}
