# 주님의 축일 제1저녁기도는 주일에 걸릴 때만 — 비주일 카드·라우트 오발화 + 주일 occurrence 찬미가 자리에 주석문 (FR-180)

- **발견/작업**: 2026-09-18, `docs/bug-reports/2026-09-17-evening-precedence-table.md` §6 "남긴 것" 첫 행 후속
- **대상**: 주님 봉헌(02-02)·거룩한 변모(08-06)·십자가 현양(09-14). 라테라노 대성전 봉헌(11-09)은 무변경
- **영향**: ① 비주일 occurrence — 매년 2~3일 + 그 전날(7년에 6번꼴, 2026 은 3건 전부). ② 주일 occurrence — 2025-02-02·2025-09-14(이미 지남)·2028-08-06·2031-02-02·2031-09-14 와 각각의 전야 토요일

---

## 1. 증상 ① — 비주일인데 제1저녁기도가 뜬다

프로덕션(수정 전 배포본, 2026-09-18 실측):

```
$ for d in 2026-02-02 2026-08-06 2026-09-14; do curl -s -o /dev/null -w "%{http_code}\n" https://divine-office.vercel.app/api/loth/$d/firstVespers; done
200      ← 2026-02-02 월요일 주님 봉헌
200      ← 2026-08-06 목요일 거룩한 변모
200      ← 2026-09-14 월요일 십자가 현양

$ curl -s https://divine-office.vercel.app/api/loth/2026-02-01/vespers | python3 -c "..."
/api/loth/2026-02-01/vespers | effectiveLiturgicalDay = 2026-02-02 | liturgicalDay = 2026-02-01 4th Sunday of Ordinary Time
   gcAnt: 'Хөгшин хүн бяцхан хүүг тэвэрч авсан боловч хүүхэд нь хөгшин '   ← 봉헌 축일 제1저녁기도 후렴
```

연중 4주일(2026-02-01) 저녁이 자기 제2저녁기도 대신 **월요일 축일의 제1저녁기도**로
승격돼 있고, 카드 목록에서도 주일의 `vespers`·`compline` 카드가 사라진다(수정 전
지문: `2026-02-01 cards=firstVespers,firstCompline,lauds`). 2026-08-05(수)·
2026-09-13(연중 24주일)도 같다.

## 2. 증상 ② — 주일 occurrence 에는 찬미가 자리에 주석문

```
$ curl -s https://divine-office.vercel.app/pray/2025-02-02/firstVespers | (aria-label="Магтуу" 섹션 추출)
Магтуу  Хэрэв энэ баяр Ням гарагт таарвал 1 дүгээр Оройн даатгал залбирал уншина.  <div data-role="antiphon" …

$ curl -s https://divine-office.vercel.app/api/loth/2028-08-06/firstVespers | (hymn 섹션)
/api/loth/2028-08-06/firstVespers | liturgicalDay = 2028-08-06 Transfiguration
   hymn: '(Хэрэв энэ баяр Ням гарагт таарвал)'
```

제1저녁기도가 정당한 바로 그 해에 «Магтуу»(찬미가) 본문이 책의 적색 주석문 한
줄로 대체돼 나간다. 전야 토요일 `/pray/2025-02-01/vespers` 도 동일(수정 전 지문
`hy=Хэрэв энэ баяр Ням гарагт таарвал 1 дүгэ`).

---

## 3. 인쇄면 — 세 축일은 조건부, 라테라노는 무조건

```
$ pdftoppm -f 411 -l 411 -r 110 -png "Four-Week psalter.- 2025.pdf" p411   # 책 p.821
$ pdftoppm -f 416 -l 416 ...  # p.830-831   $ pdftoppm -f 418 -l 418 ...  # p.834-835
$ pdftoppm -f 421 -l 421 ...  # p.840-841
```

| 책 | 축일 | 인쇄 |
|---|---|---|
| p.821 | 2 дугаар сарын 2 ЭЗЭНИЙ УГТЛАГЫН ЁСЛОЛ | 적색 «**Хэрэв энэ баяр Ням гарагт таарвал 1 дүгээр Оройн даатгал залбирал уншина.**» → «1 дүгээр Оройн даатгал залбирал» (Magnificat 후렴만) |
| p.831 | 8 дугаар сарын 6 ЭЗЭНИЙ ХУВИРГАЛТ | «1 дүгээр Оройн даатгал залбирал **(Хэрэв энэ баяр Ням гарагт таарвал)**» |
| p.835 | 9 дүгээр сарын 14 АРИУН НАНДИН ЗАГАЛМАЙН АЛДАРШУУЛАЛ | «1 дүгээр Оройн даатгал залбирал **(Хэрэв энэ баяр Ням гарагт таарвал)**» |
| p.840 | 11 дүгээр сарын 9 ЛАТРАНЫ НЭРЭМЖИТ ДЭЭД СҮМИЙН АРАВНАЙ | «1 дүгээр Оройн даатгал залбирал» — 조건 없음 |

"이 축일이 주일에 걸리면 제1저녁기도를 읽는다" = 비주일에는 제1저녁기도가 **없다**.
전례일 순위표로도 같다 — 축일(II.5)은 주일을 대체할 때만 제1저녁기도를 갖고, 평일
축일은 전날 저녁을 건드리지 않는다. 라테라노는 책이 조건을 인쇄하지 않았으므로
책 재현 원칙대로 매년 유지한다(§7).

---

## 4. 원인 — 책 주석을 "찬미가 치환 규칙"으로 잘못 인코딩

FR-160-B(조건부 루브릭) 때 세 축일의 `firstVespers` 셀에 이런 항목이 들어갔다:

```json
"conditionalRubrics": [{
  "rubricId": "sanctoral-feast-02-02-presentation-firstvespers-sunday",
  "when": { "dayOfWeek": ["SUN"] },
  "action": "substitute",
  "target": { "text": "Хэрэв энэ баяр Ням гарагт таарвал 1 дүгээр Оройн даатгал залбирал уншина." },
  "appliesTo": { "section": "hymn" },
  ...
}]
```

두 가지가 동시에 틀렸다.

1. **의미** — 이 주석은 "제1저녁기도가 존재하는 조건"이지 섹션 지시가 아니다. 그런데
   `substitute hymn when SUN` 이 돼 "주일이면 찬미가를 이 문장으로 바꿔라"가 됐다.
   `conditional-rubric-resolver.ts` 는 hymn 을 PR-1 섹션(필드 직접 치환)으로 다루므로
   Layer 4.5 에서 `propers.hymn` 이 그 문장으로 덮인다 — 당시 e2e 주석("hymn 은
   DIRECTIVE_SECTION_TYPES 에 없어 API 에 안 나온다")은 directive 표면 얘기였고,
   본문 치환은 별개로 일어나고 있었다 (§2).
2. **요일 조건 자체는 어디에도 없었다** — `hasFirstVespersAndCompline`, 전야 승격
   Path 1, `/firstVespers` 라우트 Path 1, sanctoral overlay 네 곳 모두
   `sanctoral.firstVespers` 의 **존재**만 봤다 (§1).

---

## 5. 수정

**데이터 모델** — `FirstVespersPropers.sundayOnly?: { evidencePdf }` (`src/lib/types.ts`,
zod `SanctoralFileSchema.firstVespers.sundayOnly` in `src/lib/schemas.ts`).
`feasts.json` 세 셀에서 rubric 을 지우고 인쇄 근거를 그대로 옮겼다:

```
02-02 sundayOnly.page= 821 conditionalRubrics= -     (text: 전문 — 기존 rubric 은 "…1 дүгээр" 절단본이었다)
08-06 sundayOnly.page= 831 conditionalRubrics= -
09-14 sundayOnly.page= 835 conditionalRubrics= -
11-09 sundayOnly.page= -   conditionalRubrics= -
$ git diff --stat src/data/loth/sanctoral/feasts.json → 1 file changed, 18 insertions(+), 66 deletions(-)
```

**조립** — `src/lib/loth-service.ts` 에 헬퍼 하나:

```ts
function eligibleSanctoralFirstVespers(entry, dateStr): FirstVespersPropers | undefined {
  const fv = entry?.firstVespers
  if (!fv) return undefined
  if (fv.sundayOnly && dateToDayOfWeek(dateStr) !== 'SUN') return undefined
  return fv
}
```

`dateStr` 는 항상 **축일 자신의 날짜**(전야 분기에서는 `tomorrowStr`). 네 소비처가
전부 이 헬퍼를 지나므로 카드·라우트 적격성(404)·전야 승격·`/firstVespers` 본문이
한 답을 낸다. `scripts/__tests__/goal210-hymn-pagebreak-merge.test.mjs` 의
feasts.json 해시는 재고정.

---

## 6. 검증

**단위** — 신규 `src/lib/__tests__/feast-firstvespers-sunday-only.test.ts` (`@fr FR-180`):

```
$ npx vitest run src/lib/__tests__/feast-firstvespers-sunday-only.test.ts
 Test Files  1 passed (1)
      Tests  34 passed (34)
```

전체 `npx vitest run` 127 files / 2,139 passed / 4 todo / 0 failed. `tsc --noEmit` 0,
ESLint 0 error(기존 warning 3).

**루브릭 verifier**:

```
$ node scripts/verify-conditional-rubrics.js
[verify-conditional-rubrics] OK — 9 file(s) scanned, 46 ConditionalRubric entr(ies) validated   (49 → 46)
$ node scripts/verify-conditional-rubric-coverage.js
[verify-conditional-rubric-coverage] OK — integrity gate passed
```

**e2e** (프로덕션 빌드, `next start -p 3200`):

```
$ npx playwright test e2e/feast-first-vespers.spec.ts e2e/sanctoral-first-vespers-pollution.spec.ts e2e/conditional-rubric-sanctoral.spec.ts --reporter=line
  86 passed (6.4s)
$ npx playwright test e2e/error-handling.spec.ts e2e/api.spec.ts e2e/first-vespers.spec.ts e2e/solemnity-first-vespers.spec.ts e2e/movable-first-vespers.spec.ts e2e/special-days.spec.ts e2e/prayer-sections.spec.ts
  176 passed (15.0s)
로컬 스모크: /api/loth/2026-02-02/firstVespers → 404, /api/loth/2025-02-02/firstVespers → 200
```

**전일자 지문 스윕 2025-01-01 ~ 2031-12-31 (2,556일)** — 지문 = 카드 목록 + 적격성 +
vespers(승격 정체성·복음찬가 후렴·찬미가 앞 40자) + firstVespers(적격 시). 수정 전후
`rtk proxy diff` (bare `diff` 는 rtk 훅이 삼켜 빈 출력을 낸다):

```
i_weekday_feast      16  2025-08-06 2026-02-02 2026-08-06 2026-09-14 2027-02-02 2027-08-06 2027-09-14 2028-02-02 2028-09-14 2029-02-02 2029-08-06 2029-09-14 2030-02-02 2030-08-06 2030-09-14 2031-08-06
i_weekday_eve        16  (위 각 날의 전날)
ii_sunday_feast_hymn  5  2025-02-02 2025-09-14 2028-08-06 2031-02-02 2031-09-14
ii_sunday_eve_hymn    5  2025-02-01 2025-09-13 2028-08-05 2031-02-01 2031-09-13
other                 0
```

대표 줄:

```
< 2026-02-01 cards=firstVespers,firstCompline,lauds                  V[eff=2026-02-02|gc=Хөгшин хүн бяцхан хүүг…]
> 2026-02-01 cards=firstVespers,firstCompline,lauds,vespers,compline V[eff=-|gc=Бүгд Тэнгэрбурханы амнаас гарах…]   ← 연중 4주일 자기 EP II
< 2026-02-02 cards=firstVespers,firstCompline,lauds,vespers,compline elig=true  FV[…]
> 2026-02-02 cards=lauds,vespers,compline                            elig=false FV[-]
< 2025-02-02 … FV[gc=Хөгшин хүн…|hy=Хэрэв энэ баяр Ням гарагт таарвал 1 дүгэ]
> 2025-02-02 … FV[gc=Хөгшин хүн…|hy=ЭЗЭНийг магтагтун ЭЗЭНийг магтагтун Ард ]   ← 후렴·카드 불변, 찬미가만
```

비주일 축일 당일의 `vespers`(제2저녁기도, FR-177)는 한 글자도 안 바뀌었다.

### 갱신한 기존 테스트

| 파일 | 이유 |
|---|---|
| `table-of-liturgical-days-evening.test.ts` | `/2026-09-14/firstVespers` = 축일 셀 기대 → 주일 occurrence `2025-09-14` 로 |
| `eve-vespers-alternate-and-rich.test.ts` | 2026-02-01(주일, 월요일 축일 전야) → 2025-02-01(토, 주일 축일 전야). 검증 의도(축일 plain 아래 연중 4주일 rich 미누출)는 동일 |
| `sanctoral-romcal-gate.test.ts` | "평범한 주일이 월요일 제1저녁기도에 양보" 케이스를 2026-09-13→십자가 현양에서 2026-11-08→라테라노로. 십자가 현양은 이제 비주일에 EP I 이 없다 |
| `e2e/feast-first-vespers.spec.ts` | 전면 재작성 — 2026 비주일 전야 3건(옛 동작 고정)을 주일 occurrence 전야 3건 + 비주일 404/자기 저녁 유지 3건으로 |
| `e2e/sanctoral-first-vespers-pollution.spec.ts` | 축일 3건 날짜를 주일 occurrence 로 |
| `e2e/conditional-rubric-sanctoral.spec.ts` | rubric 3개 "authored" 테스트 → `sundayOnly` 데이터 계약 1개, 인벤토리 49→46 |

---

## 7. 남긴 것

| 항목 | 이유 |
|---|---|
| **라테라노(11-09)는 매년 제1저녁기도** | 보편 규범으로는 축일이 주일을 대체할 때만 제1저녁기도를 갖지만, 책 p.840 은 조건 없이 «1 дүгээр Оройн даатгал залбирал» 을 인쇄한다. 앱은 몽골어 책을 재현하므로 플래그를 달지 않았다. 사용자가 보편 규범 쪽을 택하면 `sundayOnly` 한 줄로 바꿀 수 있다 |
| **All Souls(11-02)가 토요일일 때** | 이전 리포트 §6 그대로 — 단일 `vespers` 셀 + FR-160-B-7 고정 |
| **공현 전야의 시편·독서가 `/firstVespers` 라우트와 다르다** | 이전 리포트 §6 그대로 |
| **오늘이 제2저녁기도를 지키는 날에도 내일 `firstVespers` 카드는 내일 날짜에 뜬다** | 카드는 날짜별 목록이라 기존 패턴. 이번 변경과 무관 |
