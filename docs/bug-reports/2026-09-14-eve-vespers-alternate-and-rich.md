# 버그 리포트 — 전야 저녁기도의 F-2 대체 본기도 오판정 + rich 오버레이가 plain 과 다른 소스에서 섞임

- **작성**: 2026-09-14 (`docs/app-review-2026-09-13.md` §8 잠재 회귀 격리 4건 조사)
- **분류**: FR-156 전야(eve) 제1저녁기도 경로의 identity 승격 누락 (요일·시즌) + Layer 4 rich overlay 의 소스 불일치
- **심각도**: 높음 — 매주 토요일 저녁 본기도가 대체본으로 뒤바뀌어 있었고(2026 년 46 회), 모든 성인·성 요셉·성탄 전야 등에서 화면에 **다른 날의 본기도** 가 rich 로 표시됨
- **상태**: ✅ 수정됨 — `88ed2d3` (F-2 요일) · `2601f59` (rich 소스 parity) · `5b7de1d` (시즌 변형 + 통합 테스트) · `3c22b21` (e2e fixme 해제) · `17014b2` (주일 제1저녁기도 시즌 고유부 우선 병합, §4-b) · `86ff381` / `713dfb6` / `83dfe6b` (§6 제품 결정 1·3·4 반영). §6 전 항목 종결.

---

## 1. 증상 (§8 4건)

| # | 날짜 / 시간경 | 증상 | 판정 |
|---|---|---|---|
| 건 2 | 2026-05-13 수 `/vespers` (승천 전야), 2026-12-24 목 `/vespers` (성탄 전야) | `concludingPrayer.text` 가 블록의 `alternativeConcludingPrayer` | **의도된 동작** — 책 p.516 (`parsed_data/full_pdf.txt` L17864 "Эсвэл: Ням гарагт үл тохиох Их баярын өдөр" = "또는: 주일에 오지 않는 대축일") 에 따라 목·금요일 대축일은 대체 본기도가 기본. `/firstVespers` 라우트와 동일. 코드 무수정, e2e 기대값 갱신 |
| 건 3 | 2026-05-30 토 `/vespers` (삼위일체 전야) | 주일 대축일인데 swap 발화 — `/2026-05-31/firstVespers` 는 primary | **버그** — `vespers.ts:85` 가 rank 는 승격된 내일(`effectiveLiturgicalDay`) 에서, 요일은 전야의 `ctx.dayOfWeek`(SAT) 에서 읽음. romcal 이 모든 주일을 SOLEMNITY 로 내므로 **토요일 저녁 전부**(46/년) 가 영향 |
| 건 4 | 2026-12-24 `/vespers` `alternateTextRich` 에 대림 1주 목요일 본기도(p.571) | plain 은 sanctoral 12-25 firstVespers(p.588) 인데 rich 는 시즌 평일 | **버그** — Layer 4 rich 가 전야 날짜의 (시즌/주차/요일) 로 조회. 같은 클래스가 대축일 당일 lauds/vespers·성삼일 응송·대축일 제2저녁기도에도 존재 (§3) |
| 건 1 | 2025-11-29 토 `/vespers` (연중 34주 → 대림 1주일) | `liturgicalDay.season = ORDINARY_TIME`, 시편 141 후렴이 psalter 기본 | **반은 버그, 반은 제품 결정** — 본문(propers) 은 `5cc8a80` 로 대림에서 오지만 시편 후렴의 시즌 변형은 토요일 `day.season`(OT) 로 골라 대림 변형 미적용 → 수정. `liturgicalDay` 재라벨은 현행 계약(civil identity 유지) 대로 두고 §6 |

## 2. 재현 (명령 + 출력, 수정 전 main `9661188`)

worktree 의 `src/lib` 를 CJS 로 transpile 해 `assembleHour` 직접 호출 (scratchpad `eve/probe-many.js`).

```
$ run.sh probe-many.js build-main - 2026-05-30:vespers 2026-05-31:firstVespers 2026-12-24:vespers 2025-11-29:vespers
{ "case": "2026-05-30:vespers", "day": "Saturday of the 8th week of Ordinary Time | ORDINARY_TIME w8 WEEKDAY",
  "cp": { "page": 748, "text": "Аяа, Тэнгэрбурхан минь, бид Таныг магтан дуулж байна…",     ← alternate 가 text
          "altPage": 745, "alt": "Аяа, Эцэг минь, Та биднийг үнэн рүү авчрахын тулд Өөрийн Үги…" } }
{ "case": "2026-05-31:firstVespers", "day": "Trinity Sunday | ORDINARY_TIME w9 SOLEMNITY",
  "cp": { "page": 745, "text": "Аяа, Эцэг минь, Та биднийг үнэн рүү авчрахын тулд Өөрийн Үги…",  ← primary
          "altPage": 748, "alt": "Аяа, Тэнгэрбурхан минь, бид Таныг магтан дуулж байна…" } }
{ "case": "2026-12-24:vespers", "day": "Thursday of the 4th week of Advent | ADVENT w4 WEEKDAY",
  "cp": { "page": 588, "text": "Аяа, хамаг сайн сайхны Эцэг…", "altPage": 588, "alt": "Аяа, Тэнгэрбурхан бидний Эцэг минь, жил бүр…",
          "altRich": { "page": 571, "source": { "kind": "seasonal", "season": "ADVENT", "weekKey": "1", "dayKey": "THU", "hour": "vespers" } } } }
                                                                                                   ↑ 대림 1주 목요일 본기도 rich
{ "case": "2025-11-29:vespers", "day": "Saturday of the 34th week of Ordinary Time | ORDINARY_TIME w34 WEEKDAY",
  "cp": { "page": 550, "text": "Аяа, Тэнгэр дэх Эцэг минь, бидний зүрх сэтгэл…" (alternate) },
  "psalms": [ "Psalm 141:1-9 [p49] ant=\"Аяа Эзэн минь, залбирал минь таны өмнө у\"", … ],   ← psalter 기본 후렴
  "gcAnt": "p549 \"Алсаас ирж буй Эзэнийг харагтун…\"" }                                    ← 대림 (5cc8a80 정상)
```

플레인 주일 전야도 동일 (`2026-01-17:vespers` text = alternate p754, `2026-01-18:firstVespers` text = primary).

concludingPrayer rich page ≠ plain page 전수 (`eve/parity.js`, 2026 전 일자 × 4 시간경, main):

```
mismatches=26
2026-02-01 vespers | 4th Sunday of OT (주님 봉헌 전야)      | textRich p757 ≠ plain p821 [seasonal:ORDINARY_TIME/4/SUN/vespers] ; altRich p757 but no alternateText
2026-03-19 lauds   | Joseph, Husband of Mary               | textRich p641 ≠ plain p823 [seasonal:LENT/1/THU/lauds]
2026-05-14 vespers | Ascension of the Lord (제2저녁기도)     | textRich p732 ≠ plain p731 [seasonal:EASTER/ascension/SUN/vespers]   ← text 는 빈 문자열
2026-11-01 lauds   | All Saints                            | textRich p811 ≠ plain p837 [seasonal:ORDINARY_TIME/31/SUN/lauds]
2026-11-01 vespers | All Saints                            | textRich p811 ≠ plain p837 [seasonal:ORDINARY_TIME/31/SUN/vespers]
2026-12-24 lauds   | Thursday of the 4th week of Advent    | textRich p571 ≠ plain p582 [seasonal:ADVENT/1/THU/lauds]
2026-12-25 vespers | Christmas (제2저녁기도)                 | textRich p588 ≠ plain p598 [seasonal:CHRISTMAS/dec25/SUN/vespers]
… (총 26건: 03-18/03-24/12-07/12-31 전야, 03-25/12-08 당일 lauds·vespers·firstVespers, 06-28/09-13/11-08 주일 전야, 05-24 성령강림 제2저녁기도 등)
```

성삼일 응송 (`eve/probe-resp.js`, main): 2026-04-02 vespers 렌더 응송 = 시즌 단일 구절 "Бидний төлөө Христ үхлийг…" 인데 `rich` = 시편집 w2 THU 응송(p259, "Эзэн бол миний хоньчин…") — 렌더러는 rich 우선이라 화면엔 시편 23 응송.

## 3. 원인

1. **F-2 요일 (건 3)** — `src/lib/hours/{vespers,lauds,compline}.ts` 가 `shouldUseAlternateConcludingPrayer(effectiveDay, ctx.dayOfWeek)` 로 호출. `#242 (1f4ccb7)` 이 rank 를 `effectiveLiturgicalDay` 로 바꾸면서 요일은 그대로 두어 rank 와 요일이 다른 날을 가리키게 됨. 토요일→주일 승격 분기(`loth-service.ts` Saturday→Sunday) 도 `effectiveLiturgicalDay = sundayDay`(rank SOLEMNITY) 를 세팅하므로 모든 토요일 저녁이 해당.
2. **rich 소스 (건 4)** — `loth-service.ts` Layer 4 `resolveRichOverlay({ season: day.season, weekKey, day: dayOfWeek, … })` 가 항상 **오늘** 의 키로 조회. 전야 분기는 plain 을 내일의 sanctoral/special-key firstVespers 로 갈아끼우지만 rich 는 오늘 평일 cell 의 것. 더 넓게는 Layer 1-3 plain 병합(psalter ⟩ seasonal ⟩ sanctoral) 이 필드 단위인데 rich 병합은 plain 이 어느 layer 에서 왔는지 보지 않아, 상위 layer 가 plain 을 이기고 rich 를 안 가진 필드마다 하위 layer 의 rich 가 남았다 (sanctoral 대축일 당일, 성삼일 시즌 응송 vs 시편집 rich, vespers2 cell vs `-vespers` rich).
3. **시즌 변형 (건 1)** — `resolvePsalm(entry, overrides, day.season, …)` 의 season 이 승격 전 토요일(OT). `effectiveDayOfWeek`/`effectiveWeekOfSeason` 은 승격됐지만 season 은 아니었음. 시즌 경계를 넘는 승격은 연중 34주 토요일→대림 1주일뿐.

## 4. 수정

| 커밋 | 내용 |
|---|---|
| `88ed2d3` | `resolveConcludingPrayerSwap(ctx)` (`hours/concluding-prayer.ts`) — rank 와 요일을 `effectiveLiturgicalDay.date` 한 곳에서. 세 시간경 공유. 픽스처(`date` 없음) 는 `ctx.dayOfWeek` 폴백 |
| `2601f59` | 전야 분기의 `richLookupIdentity`(내일의 season/week/요일/sanctoralKey/name/date) + `applyRichSourceParity`(`prayers/resolver.ts`): rich 필드는 생성된 cell 의 plain 과 merged plain 이 글자 단위로 같을 때만 유지(구두점·따옴표 glyph·`ref` 무시). seasonal cell 은 rich 와 같은 키로 `getSeasonHourPropers` 재조회. 대체 본기도 rich 는 primary 와 같은 layer 에서만. rich loader 에 dec17~24 date-key tier(propers-loader 대칭) |
| `5b7de1d` | 시편 해석 season = `effectiveLiturgicalDay.season`. 통합 테스트 `src/lib/__tests__/eve-vespers-alternate-and-rich.test.ts` (21 케이스) |
| `3c22b21` | e2e fixme 해제·기대값 갱신 (§5) |
| `17014b2` (§4-b, 코디네이터 승인) | `mergeSundayFirstVespers` (`hours/first-vespers-merge.ts`): 플레인 주일 제1저녁기도 조립(`/firstVespers` Path 3 + 토요일 전야) 에서 shortReading / responsory / intercessions / concludingPrayer(+alternative, +page) 는 시즌 `SUN.vespers` cell 이 인쇄하면 그것이 우선, firstVespers cell 은 시편·후렴·hymn 등 나머지만. 근거: 책 시즌 섹션이 주일 EP I 고유부를 인쇄(대림 p548-550 1 Thess 5:19-24, 사순 p618-620 2 Cor 6:1-4a, 종려 p651-653 1 Pet 1:18-21, 부활 p700-702 1 Pet 2:9-10); Phase-2 firstVespers cell 은 시편집 주일 EP I 블록 발췌(`intercessionsPage` 56/172/292/403, 연중용). 지금까지 화면(rich) 이 보여주던 것과 동일해지고 API/전야 plain 도 일치. 연중·성탄 시즌은 `SUN.vespers` 에 독서/응송/청원이 없어 무영향(sweep 실증) |

수정 후 parity 전수: `mismatches=0` (2026 전 일자 × 4 시간경).

## 5. 검증

- 단위/통합: `npx vitest run` 119 files / 1,961 passed / 4 todo (기준선 118 / 1,929 + 신규 32).
- `npx tsc --noEmit` OK · `npm run lint -- src e2e scripts` 0 errors(기존 경고 2) · `node scripts/generate-test-fr-map.mjs --check` OK · `npm run verify:all` 14 PASS.
- e2e (빌드 서버 :3210, `--workers=1`, chromium + mobile-chrome): `first-vespers` / `movable-first-vespers` / `solemnity-first-vespers` 42 passed · 2 skipped(제품 결정 fixme) ; `special-days` / `prayer-vespers` 30 passed ; 관련 19 spec(chromium) 188 passed.
- 화면 확인(Playwright 스크린샷): `/pray/2026-12-24/vespers` 성탄 대체 본기도 + rich 문단 + "Сонголтот залбирал" 토글, `/pray/2026-11-01/lauds` 모든 성인 본기도(plain), `/pray/2026-05-30/vespers` 삼위일체 primary. 콘솔 에러 0.
- **main 대비 출력 sweep** (2026 전 일자 × lauds/vespers/firstVespers(카드 노출일만)/compline, concludingPrayer text/alt/rich·시편 후렴·Magnificat·짧은 독서/응송/청원/찬미가 rich 지문; scratchpad `eve/sweep-2026-table.md`, 2027 도 동일 패턴 89건):

| 범주 | 건수 (2026) | 내용 |
|---|---|---|
| A 토요일 전야 swap 해제 | 46 (전부 SAT vespers) | alternate → primary. `/firstVespers` 라우트와 일치 |
| B1 전야 rich → 승격된 celebration 소스 | 4 | 12-24 (dec25 p.586-588), 12-31 (jan1 p.607/608), 05-13 (ascension p.731/732), 05-23 (pentecost) — 종전엔 없거나 타 cell rich |
| B2 sanctoral/self-contained plain 위 타 cell rich 제거 | 21 | 02-01·03-18·03-24·06-28·09-13·11-08·12-07 전야, 03-19·03-25·11-01·12-08 당일 lauds/vespers/firstVespers, 05-14·05-24·12-25 제2저녁기도(`-vespers` rich) |
| B3 vespers2 빈 text 복구 | (05-14 포함) | 승천 제2저녁기도 text '' → primary p.731 |
| B4 성삼일 응송 | 5 | 04-02 v, 04-03 l/v, 04-04 l/v: 시편집 응송 rich 제거 |
| B5 12-24 lauds | 1 | dec24 tier: p.571 → p.582/577/581 (plain 과 일치) |
| D 사순·대림·부활 주일 EP I 독서·응송·청원·본기도 시즌 고유부 우선 (§4-b) | 16 `/firstVespers` + 16 토요일 전야(A 와 겹침) | plain 이 시편집 발췌(p.55/171/292/402) → 시즌본(p.548/618/651/700), **rich 는 유지(page 일치)**. §4-b 이전 스윕에서는 같은 16건이 "rich 제거"(B6) 로 나타났음 — 화면 퇴행이 될 것이라 시즌 우선 병합으로 해소 |
| C 시편 후렴 대림 변형 | 1 | 11-28 (+A) |

범주 밖 차이 없음 (2026 93건 / 2027 89건, `eve/sweep-2026-table-v5.md`). 연중 주일(예: 09-13 `/firstVespers`, 09-12 전야) 은 D 에 없음 — 독서 2 Peter 1:19-21 p.402 / 본기도 p.797 그대로. `getHoursSummary` 가 노출하지 않는 평일 `firstVespers` URL 은 sweep 에서 제외.

## 6. 제품 결정 (2026-09-14 결정·반영 — 건 2 는 `17014b2`, 건 1·3·4 는 `86ff381` / `713dfb6` / `83dfe6b`)

1. **전야 응답의 `liturgicalDay` 재라벨** (건 1 후반, e2e `first-vespers.spec.ts` 별도 fixme). 현행 계약: 전야 `/vespers` 의 `liturgicalDay` 는 토요일(연중 34주) civil identity, 본문만 승격 (`loth-service.ts` `effectiveLiturgicalDay` 주석, `first-vespers.test.ts`). 옵션 (a) 유지 — 카드 목록·헤더가 날짜 기준으로 일관, `effectiveLiturgicalDay` 를 API 에 추가 노출해 클라이언트가 선택; (b) 재라벨 — 헤더가 "대림 1주일 제1저녁기도" 로 보이지만 `getHoursSummary`·홈 카드·다른 시간경(compline 등) 과 헤더가 어긋남. **권장: (a)** + API 에 `effectiveLiturgicalDay` 노출(별도 FR).
   **결정·반영 (a), `86ff381`** — `AssembledHour.effectiveLiturgicalDay?: LiturgicalDayInfo` 추가. 전야 승격(토→주일, 대축일·축일 전야) 으로 본문 identity 가 다른 날로 옮겨진 경우에만 그 날의 정보를 넣고, 아니면 필드 자체 생략(`effectiveLiturgicalDay.date !== day.date` 일 때만 spread; `/firstVespers`·`/firstCompline` 라우트는 생략). `liturgicalDay` 는 civil 유지, 헤더·홈 카드 무수정. `/api/loth/[date]/[hour]` 가 그대로 직렬화. 테스트: `loth-service.test.ts` 3건, `e2e/api.spec.ts` 2건, `e2e/first-vespers.spec.ts` fixme 해제(2025-11-29: liturgicalDay OT34 civil + effectiveLiturgicalDay ADVENT w1). 2026 sweep: 승격일 62건(토 48 + 평일·주일 전야 14) 에만 필드 추가, 본문 지문 차이 0. FR-156 행(PRD/매트릭스) 갱신.
2. **주일 제1저녁기도의 짧은 독서·응송·청원 소스** (sweep B6). Phase-2 `weeks[N].SUN.firstVespers` cell 은 시편집 주일 I 저녁기도 발췌(`intercessionsPage` 56/172/292/403 = 시편집 1~4주) 인데 `{...sundayRegular, ...firstVespers}` 병합에서 시즌 주일 EP I cell(대림 p.548 1 Thess 5, 사순 p.618, 부활 p.700) 을 이긴다. 지금까지 `/firstVespers` 라우트에서는 시즌 rich 가 우연히 그 위를 덮어 화면엔 시즌 본문이, API/전야에는 시편집 본문이 나갔다; parity 이후 둘 다 시편집 본문(plain). GILH 상 시즌 고유부가 시편집 공통부에 우선하므로 **권장: 병합 순서를 시즌 우선으로**(`{...firstVespers, ...sundayRegular}`; psalms 는 firstVespers 유지) — 연중은 `vespers` cell 에 독서/응송/청원이 없어 무영향, 대림·사순·부활 주일 전야/라우트 ~17일 변경. `ot-week-propers.test.ts` 의 shortReading ref 단언 조정 필요.
   **반영 완료, `17014b2`** (§4-b).
3. **대축일 제2저녁기도 rich** — `w{key}-SUN-vespers2.rich.json`(pentecost/dec25/w1, 짧은 독서만) 은 어떤 경로도 읽지 않는다. vespers2 swap 시 `-vespers2` 파일을 읽는 convention 을 정하면 성탄·성령강림 제2저녁기도에 rich 복원 가능(`docs/research/GOAL147` 의 "explicit vespers2-rich convention").
   **결정·반영, `713dfb6`** — `SeasonalRichHourKey = HourType | 'vespers2'` (`rich-overlay.ts`) + `ResolveRichContext.seasonalHour?` (`resolver.ts`, 시즌 레이어 전용). GOAL #20 swap(`getSeasonVespers2`) 이 발화하면 `loth-service` 가 시즌 rich 를 `w{key}-{day}-vespers2.rich.json` 에서 읽고 parity 셀도 `getSeasonVespers2` 로 재조회; `-vespers2` 파일 부재 시 `-vespers` 파일 폴백(parity 가 EP I≠EP II 필드를 걸러냄 — 승천 05-14 본기도 p.731 은 동일 텍스트라 종전대로 유지). 디스크 실사(`find`): `christmas/wdec25-SUN-vespers2` · `easter/wpentecost-SUN-vespers2` (도달) + `advent/w1` · `lent/w1,w6` · `easter/w1` SUN-vespers2(플레인 주일 vespers2 셀을 읽는 경로가 없어 미도달), 전부 `shortReadingRich` 만(`build-short-readings-rich.mjs` 만 vespers2 셀을 순회 — 빌더 미실행). 결과: 12-25 vespers 1 John 1:1-3 p.596 · 05-24 vespers Eph 4:3-6 p.743 shortReadingRich 복원(page = plain), 05-14 무변화. 테스트: `movable-solemnity-vespers2.test.ts` 3건, `prayers/__tests__/resolver.test.ts` 2건. 2026 sweep 차이 = 위 2건뿐.
4. **12-25 sanctoral vs christmas.json dec25 텍스트 드리프트** — Magnificat 후렴 `өргөөнөөсөө`(sanctoral) vs `өргөнөөсөө`(seasonal). 글자가 달라 parity 가 12-24/12-25 firstVespers 의 `antiphonRich` 를 내리고 plain 을 쓴다. 어느 쪽이 인쇄면과 같은지 확인 후 한쪽 정정.
   **결정·반영, `83dfe6b`** — 인쇄면(책 p.587 / 물리 p.294 200dpi 크롭) · SoT `full_pdf.txt:20293` · sanctoral 12-25 모두 `өргөөнөөсөө`(ө 4개) → `christmas.json` dec25 셀의 `өргөнөөсөө` 가 데이터 드리프트. 한 단어만 교정(rich 파일에는 해당 문자열 없음, src/data 3-ө 표기 0건). PDF 가 옳은 fidelity 복원이라 GOAL #128 D3 정책(`source-typo-corrections.test.ts` 가드, B1/B2 선례) 상 ledger STC-005 행 대신 `docs/research/goal128-typo-sweep-candidates.md` §3b **B3** 로 기록. `goal210-hymn-pagebreak-merge.test.mjs` 해시 재고정. **정정**: 위 "parity 가 `antiphonRich` 를 내리고" 는 부정확 — `wdec25-SUN-vespers.rich.json` 에 `gospelCanticleAntiphonRich` 가 authored 되어 있지 않아(시즌 rich 는 어디에도 없음, compline commons 만) 렌더 출력에 복귀할 antiphonRich 자체가 없고, 이 셀은 12-24/12-25 에서 sanctoral firstVespers(self-contained) 가 덮어 화면에 나오지도 않는다. 교정 효과는 parity 가드 통과(합성 rich 로 단위 검증) 와 데이터 정합뿐, 2026 sweep 차이 0. 테스트: `eve-vespers-alternate-and-rich.test.ts` 5건.

## 7. 관련

- `docs/app-review-2026-09-13.md` §8 (격리 4건 원표)
- `5cc8a80` 연중 34주 토요일 → 대림 1주일 propers, `1f4ccb7` (#242) effectiveDay 균일화, `d6a55eb` (#214) F-2
- 테스트: `src/lib/__tests__/eve-vespers-alternate-and-rich.test.ts`, `src/lib/__tests__/hours/vespers.test.ts` (F-2 요일 3건), `src/lib/prayers/__tests__/resolver.test.ts` (parity 6건 + dec24 tier 2건)
- §6 반영 검증(2026-09-14): `npx vitest run` 120 files / 1,982 passed / 4 todo (기준선 1,969 + 13) · `tsc` 0 · lint 0 errors(기존 경고 2) · `generate-test-fr-map --check` OK · `verify:all` 14 PASS · e2e(빌드 서버 :3210, `--workers=1`) `api` + `first-vespers` 50 passed, `solemnity-first-vespers` + `movable-first-vespers` 20 passed, `conditional-rubric-{movable-solemnity,easter}` + `prayer-rich-overlay-fallback` + `page-redirect`(chromium) 33 passed · 2026 sweep(main `3cb300e` 대비, 1,161 cells) E1 effectiveLiturgicalDay 62 / E2 vespers2 shortReadingRich 2 / 범주 밖 0.
- 관찰(미수정, 범위 밖): ① 플레인 주일 당일 `/vespers` 가 `weeks[N].SUN.vespers`(대림 p.548 1 Thess 5 = EP I 셀) 를 렌더하고 `SUN.vespers2`(p.553 Phil 4:4-7 = EP II) 는 어떤 경로도 읽지 않음(대림·사순·부활 주일). ② 토요일 전야 `/vespers` 는 rich 키가 토요일 identity 라 시즌 rich 가 붙지 않음(11-28 전야 rich ∅ vs 11-29 `/firstVespers` rich 有) — 카드 미노출 legacy URL. ③ 성탄 시기 토요일(01-03·01-10) `/vespers` 에 concludingPrayer 섹션 부재, 12-26 토(성 스테파노) `/vespers` 가 성가정 축일 제1저녁기도로 승격되지 않음 — 모두 main 과 동일한 기존 상태.
