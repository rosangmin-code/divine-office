# 2026-06-03 Ordinary-Time Week Off By One

## Symptom

User-reported artifact for Wednesday, 2026-06-03:

```text
Date label: Лха 3 6-р сар
Season label shown: Жирийн цаг улирлын 8-р долоо хоног
Expected season label: Жирийн цаг улирлын 9-р долоо хоног
```

The page header displays `assembled.liturgicalDay.nameMn`, so this label comes from the calendar layer, not from psalmody rendering (`src/app/pray/[date]/[hour]/page.tsx:103`-`src/app/pray/[date]/[hour]/page.tsx:115`). `buildLiturgicalNameMn` emits the Mongolian weekday-season label as `{season genitive} {weekOfSeason}-р долоо хоног` for non-Sundays (`src/lib/mappings.ts:139`-`src/lib/mappings.ts:156`).

## Expected Vs Actual

Expected: 2026-06-03 is Wednesday of the 9th week of Ordinary Time. Liturgical reasoning: Advent I 2026 is 2026-11-29, therefore Christ the King / 34th Sunday of Ordinary Time is 2026-11-22; counting Sundays backward makes 2026-05-31 the 9th Sunday of Ordinary Time, so 2026-06-01 through 2026-06-06 are weekdays of the 9th week.

Actual: `getLiturgicalDay("2026-06-03")` returns `otWeek=8` and `nameMn=Жирийн цаг улирлын 8-р долоо хоног`.

## Reproduction

Command:

```bash
node - <<'NODE'
const { createJiti } = require('jiti')
const jiti = createJiti(process.cwd() + '/')
const { getLiturgicalDay } = jiti('./src/lib/calendar.ts')
for (const date of ['2026-02-10','2026-05-31','2026-06-01','2026-06-03','2026-06-07','2026-06-08','2026-11-22','2026-11-29','2025-06-08','2025-06-09','2025-06-11','2025-11-23','2025-11-30']) {
  const d = getLiturgicalDay(date)
  console.log(`${date} name=${d?.name} season=${d?.season} weekOfSeason=${d?.weekOfSeason} otWeek=${d?.otWeek ?? 'none'} nameMn=${d?.nameMn} psalterWeek=${d?.psalterWeek}`)
}
NODE
```

Output:

```text
2026-02-10 name=Saint Scholastica, Virgin season=ORDINARY_TIME weekOfSeason=4 otWeek=5 nameMn=Жирийн цаг улирлын 5-р долоо хоног psalterWeek=1
2026-05-31 name=Trinity Sunday season=ORDINARY_TIME weekOfSeason=1 otWeek=8 nameMn=Туйлын Ариун Нандин Гурвалын Ням гараг — Их баяр psalterWeek=1
2026-06-01 name=Saint Justin Martyr season=ORDINARY_TIME weekOfSeason=1 otWeek=8 nameMn=Жирийн цаг улирлын 8-р долоо хоног psalterWeek=1
2026-06-03 name=Saints Charles Lwanga and Companions, Martyrs season=ORDINARY_TIME weekOfSeason=1 otWeek=8 nameMn=Жирийн цаг улирлын 8-р долоо хоног psalterWeek=1
2026-06-07 name=Corpus Christi season=ORDINARY_TIME weekOfSeason=2 otWeek=9 nameMn=Христийн Туйлын Ариун Нандин Бие ба Цус — Их баяр psalterWeek=2
2026-06-08 name=Monday of the 10th week of Ordinary Time season=ORDINARY_TIME weekOfSeason=2 otWeek=10 nameMn=Жирийн цаг улирлын 10-р долоо хоног psalterWeek=2
2026-11-22 name=Christ the King season=ORDINARY_TIME weekOfSeason=26 otWeek=33 nameMn=Есүс Христ Бидний Эзэн Ертөнцийн Хаан — Их баяр psalterWeek=2
2026-11-29 name=1st Sunday of Advent season=ADVENT weekOfSeason=1 otWeek=none nameMn=Ирэлтийн цаг улирлын 1-р Ням psalterWeek=1
2025-06-08 name=Pentecost Sunday season=EASTER weekOfSeason=8 otWeek=none nameMn=Пэнтикост — Ариун Сүнсний буулт — Их баяр psalterWeek=4
2025-06-09 name=Mary, Mother of The Church season=ORDINARY_TIME weekOfSeason=1 otWeek=none nameMn=Жирийн цаг улирлын 1-р долоо хоног psalterWeek=2
2025-06-11 name=Saint Barnabas the Apostle season=ORDINARY_TIME weekOfSeason=1 otWeek=10 nameMn=Жирийн цаг улирлын 10-р долоо хоног psalterWeek=2
2025-11-23 name=Christ the King season=ORDINARY_TIME weekOfSeason=24 otWeek=33 nameMn=Есүс Христ Бидний Эзэн Ертөнцийн Хаан — Их баяр psalterWeek=2
2025-11-30 name=1st Sunday of Advent season=ADVENT weekOfSeason=1 otWeek=none nameMn=Ирэлтийн цаг улирлын 1-р Ням psalterWeek=1
```

Backward-count command for post-Pentecost correctness:

```bash
node - <<'NODE'
function sundayWeekByBackwardCount(target, advent1) {
  const dayMs = 86400000
  const t = new Date(target + 'T00:00:00Z')
  const a = new Date(advent1 + 'T00:00:00Z')
  const christKing = new Date(a); christKing.setUTCDate(a.getUTCDate() - 7)
  const sunday = new Date(t); sunday.setUTCDate(t.getUTCDate() - t.getUTCDay())
  const weeksBack = Math.floor((christKing - sunday) / (7 * dayMs))
  const otWeek = 34 - weeksBack
  return `${target}: Sunday anchor ${sunday.toISOString().slice(0,10)}, ChristKing ${christKing.toISOString().slice(0,10)}=OT34, expected OT week ${otWeek}`
}
console.log(sundayWeekByBackwardCount('2026-06-03','2026-11-29'))
console.log(sundayWeekByBackwardCount('2025-06-09','2025-11-30'))
NODE
```

Output:

```text
2026-06-03: Sunday anchor 2026-05-31, ChristKing 2026-11-22=OT34, expected OT week 9
2025-06-09: Sunday anchor 2025-06-08, ChristKing 2025-11-23=OT34, expected OT week 10
```

## Root Cause

The root cause is `assignOTWeeks` in `src/lib/calendar.ts`. It derives `otWeek` by parsing the English `day.name` with `/(\d+)\w*\s+(?:Sunday|week)\s+of\s+Ordinary\s+Time/i` (`src/lib/calendar.ts:172`-`src/lib/calendar.ts:179`) and then carries the last parsed `currentOTWeek` forward through contiguous Ordinary-Time days (`src/lib/calendar.ts:181`-`src/lib/calendar.ts:192`). `getCalendarForYear` then rebuilds `nameMn` using `day.otWeek ?? day.weekOfSeason` (`src/lib/calendar.ts:138`-`src/lib/calendar.ts:166`).

That name-parsing algorithm works only on days whose romcal name explicitly says `N-th Sunday/week of Ordinary Time`. It fails on the resumed post-Pentecost boundary when the Sunday and early weekdays are movable solemnities or memorials. For 2026:

```text
2026-05-28 Thursday of the 8th week of Ordinary Time -> regex sets currentOTWeek=8
2026-05-31 Trinity Sunday -> regex does not match, so it carries 8
2026-06-01 Saint Justin Martyr -> regex does not match, so it carries 8
2026-06-03 Saints Charles Lwanga and Companions -> regex does not match, so it carries 8
2026-06-04 Thursday of the 9th week of Ordinary Time -> regex finally sets currentOTWeek=9
```

The supporting probe shows exactly that sequence:

```text
2026-05-28 name=Thursday of the 8th week of Ordinary Time season=ORDINARY_TIME weekOfSeason=1 otWeek=8 nameMn=Жирийн цаг улирлын 8-р долоо хоног
2026-05-31 name=Trinity Sunday season=ORDINARY_TIME weekOfSeason=1 otWeek=8 nameMn=Туйлын Ариун Нандин Гурвалын Ням гараг — Их баяр
2026-06-01 name=Saint Justin Martyr season=ORDINARY_TIME weekOfSeason=1 otWeek=8 nameMn=Жирийн цаг улирлын 8-р долоо хоног
2026-06-03 name=Saints Charles Lwanga and Companions, Martyrs season=ORDINARY_TIME weekOfSeason=1 otWeek=8 nameMn=Жирийн цаг улирлын 8-р долоо хоног
2026-06-04 name=Thursday of the 9th week of Ordinary Time season=ORDINARY_TIME weekOfSeason=1 otWeek=9 nameMn=Жирийн цаг улирлын 9-р долоо хоног
```

The romcal source names in the same window confirm that the missing increment is caused by special names, not by a date-parsing issue:

```text
2026-05-31 name=Trinity Sunday seasonKey=Later Ordinary Time calWeek=23 calDay=151 psalter=1
2026-06-01 name=Saint Justin Martyr seasonKey=Later Ordinary Time calWeek=23 calDay=152 psalter=1
2026-06-02 name=Saints Marcellinus and Peter, Martyrs seasonKey=Later Ordinary Time calWeek=23 calDay=153 psalter=1
2026-06-03 name=Saints Charles Lwanga and Companions, Martyrs seasonKey=Later Ordinary Time calWeek=23 calDay=154 psalter=1
2026-06-04 name=Thursday of the 9th week of Ordinary Time seasonKey=Later Ordinary Time calWeek=23 calDay=155 psalter=1
```

In a different year the same mechanism can fall back to `weekOfSeason=1` instead of carrying a stale value. In 2025, the first post-Pentecost Ordinary-Time day is `Mary, Mother of The Church`; it has no parseable OT name and no prior contiguous Ordinary-Time `currentOTWeek`, so `otWeek` remains undefined and `nameMn` uses `weekOfSeason=1`:

```text
2025-06-09 name=Mary, Mother of The Church season=ORDINARY_TIME weekOfSeason=1 otWeek=none nameMn=Жирийн цаг улирлын 1-р долоо хоног
2025-06-10 name=Tuesday of the 10th week of Ordinary Time season=ORDINARY_TIME weekOfSeason=1 otWeek=10 nameMn=Жирийн цаг улирлын 10-р долоо хоног
```

## Impact Range

Pre-Lent Ordinary Time is not generally affected by this bug. Probe: 2026-02-10 is a memorial, but it follows an explicit 5th Sunday and Monday of the 5th week, so `assignOTWeeks` has already seeded `currentOTWeek=5`; the app correctly shows `Жирийн цаг улирлын 5-р долоо хоног`.

```text
2026-02-08 name=5th Sunday of Ordinary Time season=ORDINARY_TIME weekOfSeason=4 otWeek=5 nameMn=Жирийн цаг улирлын 5-р Ням
2026-02-09 name=Monday of the 5th week of Ordinary Time season=ORDINARY_TIME weekOfSeason=4 otWeek=5 nameMn=Жирийн цаг улирлын 5-р долоо хоног
2026-02-10 name=Saint Scholastica, Virgin season=ORDINARY_TIME weekOfSeason=4 otWeek=5 nameMn=Жирийн цаг улирлын 5-р долоо хоног
```

Post-Pentecost Ordinary Time is affected when the resumed OT week starts with movable solemnities or memorials whose names do not include `N-th Sunday/week of Ordinary Time`. The specific wrong dates demonstrated here are:

- 2026-06-01 through 2026-06-03: expected 9th week, actual 8th week.
- 2025-06-09: expected 10th week, actual fallback label 1st week.

Adjacent movable solemnities such as Trinity Sunday, Corpus Christi, and Christ the King may also have stale `otWeek` internally, but their visible `nameMn` is replaced by the movable solemnity name via `buildLiturgicalNameMn` (`src/lib/calendar.ts:151`-`src/lib/calendar.ts:165`, `src/lib/mappings.ts:148`-`src/lib/mappings.ts:155`). The user-visible bug is most apparent on memorial or weekday rows whose label falls back to the computed OT week.

## Recommended Fix Direction

Do not derive Ordinary-Time week numbers from localized or English display names. Replace or augment `assignOTWeeks` with a date-based algorithm:

1. For Early Ordinary Time, keep or compute the week from the Sunday/weekday sequence beginning after Christmas season.
2. For Later Ordinary Time after Pentecost, seed the resumed Sunday by counting backward from the next Advent I: the Sunday one week before Advent I is Christ the King / OT 34, and each prior Sunday decrements by one.
3. Assign every Ordinary-Time day in a Sunday-to-Saturday span the same OT week, even if the day itself is a solemnity, feast, or memorial whose `entry.name` is not parseable.
4. Add regression probes for 2026-06-03 (expected OT 9), 2025-06-09 (expected OT 10), and a pre-Lent control such as 2026-02-10 (expected OT 5).

This is a calendar/name computation fix. If it changes rendered SSR HTML labels, bump or otherwise account for the service-worker cache version because `public/sw.js` owns `CACHE_VERSION` (`public/sw.js:557`) and documents SSR HTML output as a cache-version bump reason (`public/sw.js:171`-`public/sw.js:183`).
