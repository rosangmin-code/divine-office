# 제2저녁기도 rich overlay 누락 — 청원·응송·마침기도·선택기도가 평문 fallback (FR-182)

- **발견/작업**: 2026-09-18, `docs/handoff-2026-09-17-review-session.md` §3 "대림·사순·부활 EP II 청원 rich" 후속
- **대상**: 책이 제2저녁기도를 따로 인쇄하는 6개 셀 — `advent w1`, `christmas dec25`, `lent w1`, `lent w6`(성지주일), `easter w1`(부활 2주일 이후 wk1 fallback), `easter wpentecost` — 의 `w{key}-SUN-vespers2.rich.json`
- **영향**: 서식만. 텍스트는 평문으로 정상 렌더됐고, 청원의 의향/응답 구분·응송 구조·마침기도 rich 가 없었다. 매년 6일 × vespers (부활 wk1 은 부활 2–7주일 6일 추가)

---

## 1. 증상 — 같은 날 아침기도는 rich, 저녁기도는 plain

프로덕션(수정 전 배포본 `621dc02`, 2026-09-18 실측). `/api/loth/<date>/<hour>` JSON 의
섹션별 rich 필드(`textRich` / `rich` / `alternateTextRich`) 유무:

```
$ for k in 2026-11-29/vespers 2026-11-29/lauds 2026-02-22/vespers 2026-03-29/vespers 2026-05-24/vespers 2025-12-25/vespers; do
    curl -s -o prod-$k.json https://divine-office.vercel.app/api/loth/$k; done
$ node -e '… sections.find(type).{textRich|rich|alternateTextRich} ? rich : plain …'
2026-11-29/vespers   | shortReading: rich | responsory: rich  | intercessions: plain | concludingPrayer: rich  / alt: rich  | items: 6 | 1st Sunday of Advent
2026-11-29/lauds     | shortReading: rich | responsory: rich  | intercessions: rich  | concludingPrayer: rich  / alt: rich  | items: 5 | 1st Sunday of Advent
2026-02-22/vespers   | shortReading: rich | responsory: rich  | intercessions: plain | concludingPrayer: rich  / alt: rich  | items: 6 | 1st Sunday of Lent
2026-03-29/vespers   | shortReading: rich | responsory: rich  | intercessions: plain | concludingPrayer: rich  / alt: rich  | items: 6 | Palm Sunday
2026-05-24/vespers   | shortReading: rich | responsory: plain | intercessions: plain | concludingPrayer: plain / alt: plain | items: 6 | Pentecost Sunday
2025-12-25/vespers   | shortReading: rich | responsory: plain | intercessions: plain | concludingPrayer: plain / alt: plain | items: 6 | Christmas
```

- 대림 1주일·사순 1주일·성지주일 저녁: 청원만 plain. 응송·마침기도는 `-vespers.rich.json`
  (제1저녁기도 파일)이 `seasonalFallback` 레이어로 실려 이미 rich 였다.
- 성탄·성령강림 저녁: 응송·청원·마침기도·선택기도 전부 plain (`-vespers` 파일이 없는 특수 키).
- 짧은독서만 6일 모두 rich — `shortReadingRich` 만 저작돼 있던 것과 일치.

부활 대축일 당일(2026-04-05)은 대상이 아니다: `easterSunday` 특수 셀은 `vespers2` 가 없고
자기 `vespers` 셀(응송 p.74·마침기도 p.692)을 쓴다. `easter/w1-SUN-vespers2` 는 부활
2주일(2026-04-12, p.706/702)부터 wk1 fallback 으로 쓰인다.

## 2. 원인 — rich 빌더 4개의 시간경 목록에 `vespers2` 가 없다

```
$ grep -n "const HOURS" scripts/build-*-rich.mjs
scripts/build-intercessions-rich.mjs:39:const HOURS = ['lauds', 'vespers', 'compline']
scripts/build-responsories-rich.mjs:41:const HOURS = ['lauds', 'vespers', 'compline']
scripts/build-concluding-prayers-rich.mjs:74:const HOURS = ['lauds', 'vespers', 'compline']
scripts/build-alt-concluding-prayers-rich.mjs:90:const HOURS = ['lauds', 'vespers', 'compline']
scripts/build-short-readings-rich.mjs:49:const HOURS = ['lauds', 'vespers', 'vespers2', 'compline']
```

`vespers2` 셀은 FR-171(주일 제2저녁기도 데이터 규약)로 생겼고, 짧은독서 빌더만 그때
따라갔다. 나머지 4개는 Stage 6 목록 그대로라 `-vespers2.rich.json` 을 열지도 않았다.

평문 셀은 완전하다(6개 모두 `shortReading, responsory, gospelCanticleAntiphon,
intercessions(6), concludingPrayer, alternativeConcludingPrayer` + page). 즉 데이터 공백이
아니라 **생성기 누락**이다.

## 3. 수정

`scripts/build-{intercessions,responsories,concluding-prayers,alt-concluding-prayers}-rich.mjs`:

1. `HOURS` 에 `'vespers2'` 추가.
2. `--only-hour=<hour>` 필터 — 다른 시간경 overlay(일부는 생성 후 손질됨)를 재작성하지 않고
   `vespers2` 만 돌릴 수 있게.
3. **partial `vespers2` 셀 가드** — `hour === 'vespers2' && !Array.isArray(entry.intercessions)` 이면
   건너뛴다. 아래 §4 의 회귀 때문.

실행(각 빌더 `--only-hour=vespers2`, core 에이전트 로그):

```
intercessions   : ADVENT/w1 p554 · CHRISTMAS/wdec25 p596 · LENT/w1 p624 · LENT/w6 p658 · EASTER/w1 p706 · EASTER/wpentecost p744 → success=6 failure=0
responsories    : p549 · p596 · p619 · p651 · p706 · p743 → success=6 failure=0
concluding      : p550 · p598 · p620 · p653 · p702 · p741 → success=6 failure=0
alt-concluding  : p550 · p598 · p620 · p653 · p702 · p742 → success=6 failure=0
```

수용 게이트(whitespace + em-dash↔hyphen 정규화 byte-equal) 24/24 통과. 재실행 md5 동일(멱등).
생성물:

```
$ git diff --stat -- src/data/loth/prayers/seasonal/ scripts/
 scripts/build-alt-concluding-prayers-rich.mjs      |  23 +-
 scripts/build-concluding-prayers-rich.mjs          |  23 +-
 scripts/build-intercessions-rich.mjs               |  23 +-
 scripts/build-responsories-rich.mjs                |  23 +-
 .../seasonal/advent/w1-SUN-vespers2.rich.json      | 376 ++++
 .../christmas/wdec25-SUN-vespers2.rich.json        | 316 ++++
 .../seasonal/easter/w1-SUN-vespers2.rich.json      | 352 ++++
 .../easter/wpentecost-SUN-vespers2.rich.json       | 484 ++++
 .../seasonal/lent/w1-SUN-vespers2.rich.json        | 334 ++++
 .../seasonal/lent/w6-SUN-vespers2.rich.json        | 376 ++++
 10 files changed, 2326 insertions(+), 4 deletions(-)
```

각 파일의 `page` 가 평문 셀의 `intercessionsPage` / `responsory.page` / `concludingPrayerPage` /
`alternativeConcludingPrayerPage` 와 일치하고 `source.hour === 'vespers2'`. 기존 `shortReadingRich` 보존.

## 4. 첫 실행에서 생긴 회귀 — partial 셀에 파일이 생기면 선택 마침기도 rich 가 사라진다

가드 없이 `vespers2` 만 추가해 돌리자 마침기도·선택기도 빌더가 **후렴·기도만 인쇄된 partial
`vespers2` 셀**(연중 주일 33개 w2–34, 성가정·공현·세례·승천·삼위일체)에도 `-vespers2.rich.json`
37개를 새로 만들었다. 게이트는 전부 PASS 였지만 런타임 지문이 바뀌었다:

```
2026-09-13 (연중 24주일) vespers  concludingPrayer alt: rich → plain
2026-12-27 (성가정)       vespers  concludingPrayer alt: rich → plain
2026-01-18 (연중 2주일)  vespers  concludingPrayer alt: rich → plain
```

이유: partial 셀은 런타임에 EP I 셀 위에 합성되고(FR-171) rich 는 `-vespers` 파일이
`seasonalFallback` 레이어로 공급한다. partial `-vespers2` 파일이 생기면 그것이 `seasonal`
레이어를 차지해 primary 마침기도 rich 는 거기서, 선택 마침기도 rich 는 여전히 fallback 에서
오는데, `applyRichSourceParity` 의 그룹 규칙(선택기도는 primary 와 **같은 레이어**여야 함)이
선택기도 rich 를 버린다. 공현·세례·승천은 선택기도가 없어 이득도 손해도 0.

→ 37개 삭제, 4개 빌더에 가드(§3-3), 단위 테스트가 (a) partial 셀에 `-vespers2` 파일 부재,
(b) 2026-09-13·01-18·12-27 저녁의 primary+alt rich 동시 존재를 회귀 가드로 고정.

## 5. 검증

- `npx vitest run src/lib/__tests__/vespers2-rich-overlay.test.ts` → **16 passed** (`@fr FR-182`)
  - 6개 파일 4필드 존재·page 일치·`source.hour`
  - 6일 저녁 조립: 청원·응송·마침기도 섹션 rich 존재 + 평문이 propers 셀과 일치
  - partial 셀 파일 부재 + 3일 저녁 primary/alt rich 동시 존재
- 지문 diff(14개 주일·대축일 저녁, `git stash` 전/후): **평문 변화 0**, rich 추가 **9** —
  대림 1주일 청원 / 성탄 응송·청원·마침기도+선택 / 사순 1주일 청원 / 성지주일 청원 /
  성령강림 응송·청원·마침기도+선택
- `npx tsc --noEmit` exit 0 · `npm run lint` 0 errors · `npx vitest run` 129 files / 2171 passed
- `node scripts/verify-all.mjs` **14 PASS / 0 FAIL** (plain-rich parity·phrase coverage 포함)
- `e2e/vespers2-rich-overlay.spec.ts` 20 + `prayer-rich-overlay-fallback` 22 + `prayer-intercessions` 16 → 58 passed
  (프로덕션 빌드 `next start -p 3200`)

## 6. 남긴 것

| 항목 | 이유 |
|---|---|
| 부활 대축일 당일 저녁 | `easterSunday` 셀은 EP II 셀이 없고 자기 `vespers` 셀(p.74 응송·p.692 마침기도)을 쓴다 — 이번 범위 밖, 기존 동작 |
| 삼위일체 `vespers2` 마침기도(p.745) | pdfjs 텍스트에 «Төгсгөлийн даатгал залбирал» 표제가 없어 빌더 ERROR. lauds rich 파일도 없는 기존 공백. partial 셀이라 가드로 어차피 대상 아님 |
| 연중 주일 `vespers2` 셀 | 청원이 없다(시편집 청원 사용) — rich 대상 아님. 마침기도 rich 는 `-vespers` fallback 으로 이미 실린다 |
| 성탄(2025-12-25 목)의 마침기도 | F-2 swap 으로 선택기도가 primary 로 나오고 rich 도 따라간다(p.598 양쪽) — 의도된 동작, 테스트는 집합 비교 |
