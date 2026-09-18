# 성탄 시기 평일 formulary 도달 불가 — 1/2~공현 전날, 공현 다음날~세례 전날이 시편집 기본값 (FR-181)

- **발견/작업**: 2026-09-18, `docs/handoff-2026-09-17-review-session.md` §3 "`epiphanyWeek` 도달 불가" 후속
- **대상**: 성탄 시기 평일 두 구간 — ① 1/2 ~ 공현 전날, ② 공현 다음날 ~ 세례 전날. 공현·세례·1/1·성가정·12/26–31 은 무변경
- **영향**: 매년 4–10일 × lauds·vespers. 2026 은 1/2·1/3(구간 ①), 1/5–1/10(구간 ②) 8일. 2029·2034·2035 는 세례가 월요일이라 구간 ② 가 없다

---

## 1. 증상 — 성탄 시기 평일인데 성탄 시기 기도문이 하나도 없다

프로덕션(수정 전 배포본 `0222e0e`, 2026-09-18 실측). `/api/loth/<date>/<hour>` JSON 에서
복음찬가 후렴·마침기도 앞 60자와 짧은독서 참조만 뽑았다:

```
$ for d in 2026-01-05 2026-01-03 2026-01-02 2026-01-07; do curl -s -o prod-$d-lauds.json https://divine-office.vercel.app/api/loth/$d/lauds; done
$ curl -s -o prod-2026-01-05-vespers.json https://divine-office.vercel.app/api/loth/2026-01-05/vespers
$ node -e '… gospelCanticle.antiphon / concludingPrayer.text / shortReading.reference …'
prod-2026-01-05-lauds   | Monday after Epiphany                | ant: "Эзэн ерөөлтэй еэ, Тэрээр ард түмэндээ очиж, тэднийгээ аварда" | prayer: "Аяа, төгс хүчит Эцэг минь, Та биднийг шинэ өдрийн гэрэл рүү " | sr: Иеремиа 15:15-16
prod-2026-01-05-vespers | Monday after Epiphany                | ant: "Сэтгэл минь Эзэний агуу байдлыг мөнхөд тунхаглах болно."      | prayer: "Аяа, төгс хүчит Эцэг минь, Та энэ өдрийн турш бидэнд ажиллах" | sr: 1Тесалоник2:11-14
prod-2026-01-03-lauds   | The Most Holy Name of Jesus          | ant: "Эзэн, Та харанхуйн дотор, үхлийн сүүдэрт буй хүмүүсийг гийгү" | prayer: "Аяа, Эзэн минь, Та биднийг үхлийн харанхуйгаас чөлөөлнө үү. " | sr: 2 Петр 1:10-11
prod-2026-01-02-lauds   | Saints Basil the Great and Gregory … | ant: "Эзэн Өөрийн ард түмэн рүү ирж, тэднийгээ чөлөөлсөн юм."       | prayer: "Аяа, Тэнгэрбурхан Эцэг минь, Та Үгийнхээ гэгээн гэрлээр мунх" | sr: Ефес 4:29-32
prod-2026-01-07-lauds   | Saint Raymond of Penyafort, Priest   | ant: "Амьдралынхаа бүх өдрүүдэд Эзэндээ ариун гэгээн байдал дотор " | prayer: "Аяа, Эзэн минь, шинэ өдөр болоход бидний зүрхийг гэрэлтүүлэх" | sr: Ром 8:35-39
```

전부 4주 시편집의 요일 기본값이다(2026-01-05 는 시편집 2주 월요일, 01-02·01-03 은 1주
금·토). 성탄 시기의 독서·응송·청원·후렴·본기도가 **하나도** 실리지 않는다.

책이 인쇄한 것(`src/data/loth/propers/christmas.json` 에 이미 저작돼 있던 셀):

```
$ node -e '… christmas.json weeks.{octave,epiphanyWeek}.SUN.{lauds,vespers} …'
octave       lauds   | ant: "Эзэний мэндэлсэн өдөр тэнгэрэлчийн найрал дуу: «Хаанаар өргө" | prayer: "Аяа, төгс хүчит Тэнгэрбурхан минь, хүмүүнийн дундах Таны Хүү" | sr: Isa 9:6-7   | pages ant/prayer/sr: 602 603 601
octave       vespers | ant: "Тэнгэрбурханы ариун эх, Та бидний аврагч Есүс Христийг төрүү" | prayer: "Аяа, төгс хүчит Тэнгэрбурхан минь, хүмүүнийн дундах Таны Хүү" | sr: 2 Pet 1:3-4 | pages ant/prayer/sr: 604 603 604
epiphanyWeek lauds   | ant: "Гурван мэргэд Тэнгэрбурханы Хүү, дээдийн дээд Хаан болох Эзэ" | prayer: "Аяа, Эцэг минь, Таны Хүү Өөрийгөө хүмүүн бидний мөн чанарт и" | sr: Isa 4:2-3   | pages ant/prayer/sr: 611 613 611
epiphanyWeek vespers | ant: "Христ, Та бол Гэрлийн Гэрэл; Таныг энэ дэлхий дээр илчлэгдэх" | prayer: "Аяа, Эцэг минь, Таны Хүү Өөрийгөө хүмүүн бидний мөн чанарт и" | sr: Eph 2:3b-5  | pages ant/prayer/sr: 614 613 613
```

rich overlay(`src/data/loth/prayers/seasonal/christmas/woctave-SUN-*.rich.json`,
`wepiphanyWeek-SUN-*.rich.json`)도 저작돼 있었다. 데이터는 다 있는데 아무 날짜도
거기에 닿지 않았다.

## 2. 인쇄면 — 책의 성탄 시기 구조

인쇄면 렌더(물리면 = (책면+1)/2, `pdftoppm -f N -l N -r 100 -png "Four-Week psalter.- 2025.pdf"`):

| 물리면 | 책면 | 내용 |
|---|---|---|
| 301 | 600–601 | 성가정 제2저녁기도 끝 → **«ЭЗЭНИЙ МЭНДЭЛТИЙН ДАРААХ ДОЛОО ХОНОГУУД»** (성탄 후 주간**들**, 복수). 초대송, 아침기도(«Магтуу, шад дуулал … Эзэний Мэндэлсэн өдрийн өглөөний даатгал залбиралтай адил байдаг: 589», 독서 Isaia 9:6-7) |
| 302 | 602–603 | 같은 formulary — Benedictus 후렴 «Эзэний мэндэлсэн өдөр тэнгэрэлчийн найрал дуу…», 청원, 마침기도 |
| 303 | 604–605 | 같은 formulary — 저녁기도(독서 2 Петр 1:3-4, Magnificat 후렴 «Тэнгэрбурханы ариун эх…», 청원) |
| 305 | 608–609 | 1/1 제2저녁기도 끝 → **«ЭЗЭНИЙ ИЛРЭХҮЙ»** 표제 «1 дүгээр сарын 6 эсвэл 1 дүгээр сарын 2-оос 8-ны хоорондох Ням гараг» (1/6 또는 1/2–8 사이의 주일) |
| 306 | 610–611 | 공현 제2저녁기도 끝 → **«ЭЗЭНИЙ ИЛРЭХҮЙН ДАРААХ ДОЛОО ХОНОГ»** (공현 후 주간, 단수). 초대송, 아침기도(독서 Isaia 4:2-3, 응송, Benedictus 후렴 «Гурван мэргэд…») |
| 307 | 612–613 | 같은 formulary — 청원, 마침기도 «Аяа, Эцэг минь, Таны Хүү Өөрийгөө…», 저녁기도 독서 Ефес 2:3б-5, 응송 |
| 308 | 614–615 | 같은 formulary — Magnificat 후렴 «Христ, Та бол Гэрлийн Гэрэл…», 청원, 마침기도 |

성탄 시기 평일 formulary 는 **둘뿐**이다. p.601 은 성가정(p.599)과 1/1(p.606) 사이에
있고 표제가 복수(«хоногууд»)이며, 1/2–5 용 별도 formulary 는 어디에도 없다. 그래서
p.601 셀(`octave`)을 12/26–31 뿐 아니라 **1/2 ~ 공현 전날**에도 적용한다 — 이것은 복수
표제와 "책에 다른 것이 없다"에 근거한 판단이다(§6 (a)). p.611 셀(`epiphanyWeek`)은
공현 다음날 ~ 세례 전날.

## 3. 원인 — `resolveSpecialKey` 가 1월을 1/1 외엔 null 로

`src/lib/propers-loader.ts` `resolveSpecialKey` 의 CHRISTMAS 분기(수정 전):

```ts
if (dateStr) {
  …
  if (month === 12 && dayOfMonth === 25) return 'dec25'
  if (month === 1 && dayOfMonth === 1) return 'jan1'
  if (month === 12 && dayOfMonth >= 26 && dayOfMonth <= 31) return 'octave'
}
// epiphanyWeek (weekdays Jan 7..Baptism eve) requires explicit
// date-range tracking that depends on the Baptism date. Left as a
// follow-up — the wepiphanyWeek-SUN-* rich files remain unloaded.
return null
```

공현·세례·성가정은 그 위에서 `romcalKey` 로 잡히지만, 그 사이 평일은 romcalKey 가
`mondayAfterEpiphany` 같은 요일 키이거나(기념일이면) 성인 키라서 아무 분기에도 걸리지
않고 null. `christmas.json` 은 숫자 주차 키(`weeks['1']` 등)가 없으므로
`getSeasonHourPropers` 는 null 을 돌려주고, 조립기는 곧바로 시편집 기본값으로 떨어진다.
rich overlay 의 Tier 1(특수 키) 적재도 같은 함수를 쓰므로 함께 비었다.

## 4. 수정

`resolveSpecialKey` CHRISTMAS 날짜 분기에 1월 산술을 더했다. 공현·세례 날짜는 romcal
설정(공현 = 1/2–8 사이 주일)과 같은 규칙으로 계산한다:

```ts
export function christmasMovableDates(year): { epiphany, baptism }
// 공현 = 1/2 이후 첫 주일. 세례 = 공현 +7일, 단 공현이 1/7·8 이면 다음 월요일(+1).

if (month === 1 && dayOfMonth >= 2) {
  const { epiphany, baptism } = christmasMovableDates(year)
  if (dateStr < epiphany) return 'octave'                          // p.601
  if (dateStr > epiphany && dateStr < baptism) return 'epiphanyWeek' // p.611
}
```

공현·세례 당일은 위의 `romcalKey` 분기가 먼저 잡으므로 산술은 사이 평일만 본다.
다른 소스는 손대지 않았다 — propers 조회·rich Tier 1·`getSeasonVespers2`·
`getSeasonFirstVespers` 가 전부 이 함수를 경유하고, `getSeasonFirstVespers` 의 기존 가드
(`vespers2` 없는 셀은 누구의 제1저녁기도로도 쓰지 않는다)가 `octave`/`epiphanyWeek` 를
EP I 경로에서 계속 배제한다.

romcal 이 실제로 내는 날짜와의 일치:

```
2026 epiphany 01-04 Sun | baptism 01-11 Sun    2029 epiphany 01-07 Sun | baptism 01-08 Mon
2027 epiphany 01-03 Sun | baptism 01-10 Sun    2030 epiphany 01-06 Sun | baptism 01-13 Sun
2028 epiphany 01-02 Sun | baptism 01-09 Sun    2034 epiphany 01-08 Sun | baptism 01-09 Mon
```

## 5. 검증

**단위** — 신규 `src/lib/__tests__/christmas-weekday-propers.test.ts` (`@fr FR-181`):

```
$ npx vitest run src/lib/__tests__/christmas-weekday-propers.test.ts
 Test Files  1 passed (1)
      Tests  16 passed (16)
```

- `christmasMovableDates(y)` ↔ `getCalendarForYear(y)` 의 `epiphany`/`baptismOfTheLord` 날짜, 2025–2040 전 연도
- 키 표: 2026 (01-02·03 → octave, 01-04 → epiphany, 01-05…10 → epiphanyWeek, 01-11 → baptism), 2029 (01-02…06 → octave, epiphanyWeek 날 0), 2030 (01-07…12 → epiphanyWeek), 12/25·12/26–31·1/1 불변, romcalKey·name 없는 호출자는 공현·세례 당일 null 그대로
- 실데이터 조립: 2026-01-05 lauds·vespers(rich page 611/613), 01-07 선택기념일, 01-02 기념일, 01-03 토 lauds octave + vespers 공현 EP I 무회귀, 01-10 토 lauds epiphanyWeek + vespers 세례 EP I 무회귀, compline 불변, 12-29 불변, 01-12 연중 불변

전체 `npx vitest run` — 2155 passed / 0 failed (FR-172 `sunday-vespers2-epiphany.test.ts` 의
"공현 후 평일을 'epiphany' 로 삼키지 않는다" 케이스만 기대값 null → `'epiphanyWeek'` 로
갱신; 의도였던 "'epiphany' 가 아님" 은 유지).

**e2e** — 신규 `e2e/christmas-weekdays.spec.ts` (`@fr FR-181`, 단언은 `christmas.json` 셀을
읽어 비교), 프로덕션 빌드 `next start -p 3200`:

```
$ npx playwright test e2e/christmas-weekdays.spec.ts --reporter=line
  18 passed (1.5s)
$ npx playwright test prayer-rich-overlay-fallback conditional-rubric-christmas mary-mother-of-god-vespers2 solemnity-first-vespers first-vespers liturgical-calendar date-navigation homepage page-redirect
  132 passed, 6 skipped (14.9s)
```

**전일자 지문 스윕 2025-01-01 ~ 2031-12-31** — 날짜별 lauds/vespers/compline 의
(effectiveLiturgicalDay, 복음찬가 후렴 40자, 마침기도 40자, 짧은독서 ref+page, rich 플래그).
baseline 은 `git stash push -- src/lib/propers-loader.ts`, 비교는 `rtk proxy diff`
(scratchpad `sweep-fr181/{before,after,diff,classification}.txt`):

```
changed lines: 96
changed dates: 54
categories: {"preEpiphany_octave":30,"postEpiphany_epw":66,"other":0}
lauds-only dates (eve of Epiphany/Baptism, vespers promoted → unchanged): 12 all-eves=true
```

```
< 2025-01-02 lauds eff=- ant=Эзэнд ариун байдал дотор үйлчилцгээе. Тэ | pr=Аяа, төгс хүчит мөнхийн Тэнгэрбурхан мин | sr=Исаиа 66:1-2 p130 | rich=0
> 2025-01-02 lauds eff=- ant=Эзэний мэндэлсэн өдөр тэнгэрэлчийн найра | pr=Аяа, төгс хүчит Тэнгэрбурхан минь, хүмүү | sr=Isa 9:6-7 p601 | rich=11
```

- 바뀐 54일 전부 1/2 ~ 세례 전날의 평일(공현·세례·1/1 제외), 범주 밖 0
- `effectiveLiturgicalDay` 변화 0, compline 변화 0 — 공현·세례 전야 토요일 12건은 lauds 만 바뀌고 저녁은 승격돼 있어 불변
- 바뀐 96줄 전부 rich 플래그 `01`(마침기도 rich 없음) → `11`: `woctave`·`wepiphanyWeek` rich overlay 가 실제로 적재됨

## 6. 남긴 것

| 항목 | 이유 |
|---|---|
| **(a) 1/2–5 에 p.601 formulary 를 적용한 것은 판단** | 책 표제가 복수(«долоо хоногууд»)이고 1/2–5 용 다른 formulary 가 없어 같은 셀을 썼다. 라틴 원전은 12/29–31 과 1/2–5 를 따로 인쇄하지만 몽골어 책은 하나로 묶었다고 읽었다. 다르게 보면 `resolveSpecialKey` 의 `dateStr < epiphany → 'octave'` 한 줄만 빼면 이전처럼 시편집으로 돌아간다 |
| **(b) 세례가 월요일인 해(2029·2034·2035)** | 세례 lauds 의 짧은독서가 세례 셀(Езекиел 37:12б-14)이 아니라 시편집 월요일(Иеремиа 15:15-16)로 나오고(후렴·본기도는 세례), `/pray/<세례>/firstVespers` 가 404(FR-173 의 `SUN` 게이트). 이번 변경 전부터 그랬고 이번 범위 밖. **2026-09-18 판정: 버그 아님** — 책 p.616 은 세례 짧은독서를 인쇄하지 않고 앱은 sanctoral/특수 셀에 독서가 없으면 진행 중인 시편집 요일 독서로 fallback 한다(2026-02-02 봉헌·08-06 변모·06-29 베드로바오로·08-15 성모승천 전부 동일; 주일 세례의 Езекиел 37 도 시편집 주일 독서). `/firstVespers` 404 는 공현(I.2) EP II 가 세례(II.5) EP I 을 이기는 보편 규범대로이며 2029-01-07 저녁은 공현 EP II 로 렌더됨 — 다만 코드상 보호는 `keepsOwnEveningPrayerII` 가 아니라 FR-173 Path 2b 의 `SUN` 게이트가 담당(결과 옳음, 근거 간접). 회귀 가드: `christmas-weekday-propers.test.ts` 마지막 describe |
| **(c) `wepiphanyWeek-SUN-{lauds,vespers}.rich.json` 의 `source.weekKey`** | `"epiphany"` 로 적혀 있다(파일명·본문은 epiphanyWeek 맞음). parity 는 텍스트 동일성으로 판정해 적재엔 영향 없음 — 메타데이터 오기. **2026-09-18 수정됨** — 두 파일 10곳 `"epiphanyWeek"` 로 교체(코드는 `source.weekKey` 를 읽지 않아 동작 무변경) |
| **(d) 1/2 바실리오·그레고리오 기념일, 1/7 라이몬도 선택기념일** | 앱이 보유한 성인 고유부가 ~14일뿐이라 `memorials.json` 에 항목이 없고, 시즌 formulary 로만 렌더된다. 기존 systemic 공백(memory `sanctoral-ot-fallback-systemic`), 이번엔 시편집 → 성탄 시기 formulary 로 좋아진 것뿐 |
| **octave `vespers` 셀 마침기도가 lauds 와 같은 p.603** | 책 p.605 가 "Өглөөний … адил" 로 아침기도 것을 참조하라고 하므로 데이터가 맞다. 무변경 |
