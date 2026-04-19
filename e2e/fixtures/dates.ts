export const DATES = {
  // Ordinary Time weekday (GREEN, WEEKDAY rank)
  ordinaryWeekday: '2026-02-04', // Wednesday, OT Week 4

  // Ordinary Time Sunday
  ordinarySunday: '2026-02-08',

  // Advent weekday (VIOLET)
  adventWeekday: '2025-12-04', // Advent Week 1 Thursday (no memorial)

  // Late Advent date-keyed propers (Dec 17-24)
  adventDec20: '2025-12-20',

  // Christmas (WHITE)
  christmasDay: '2025-12-25',

  // Lent weekday (VIOLET)
  lentWeekday: '2026-03-04', // Lent Week 1 Wednesday

  // Easter Sunday (WHITE)
  easterSunday: '2026-04-05',

  // Easter Octave weekday (psalterWeek=5 from romcal, clamped to 1)
  easterFriday: '2026-04-10',

  // Easter 3rd Sunday (normal psalterWeek=3)
  easter3rdSunday: '2026-04-19',

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
