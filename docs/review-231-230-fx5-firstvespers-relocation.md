# Review #231: #230 F-X5 — Saturday First Vespers / First Compline → Sunday relocation (Phase A + Phase B cumulative)

> **TL;DR (R2 amended)** — APPROVED_WITH_ISSUES (CONDITIONAL, cumulative Phase A + Phase B). 842/842 vitest + tsc + eslint 모두 clean. **Phase B (349e43c)** 가 Phase A 의 핵심 follow-up 3개 (Q4=P, sanctoral.firstVespers.psalms, label verbatim claim) 를 해결 + Phase A latent 버그 (firstCompline eve-shift 가 weekday Solemnity Christmas Friday 에서 Thursday 슬롯 fetch 잘못) 까지 fix (PDF p.512 subhead `НЯМ ГАРАГУУДАД БОЛОН ИХ БАЯРУУДАД` SSOT 따라 always-SAT 채택). 누적 13 검토 포인트 (R1 9 + R2 10): 13 PASS / 6 WARN / 1 NOT_MET. Phase B 신규 finding 4건 (Sunday-eve-of-Solemnity 중복 렌더링 major, ordinary 평일 URL hardening minor, lauds/vespers F-2 effectiveLiturgicalDay 비소비 minor, test 코멘트 stale nit). 머지 권장 — 단 4개 follow-up tracking 조건부.

> **TL;DR (R1, original)** — APPROVED_WITH_ISSUES (CONDITIONAL). 835/835 vitest + tsc + eslint 모두 clean. 핵심 relocation 경로 (assembleHour data-key 변환, eve-shift, getHoursSummary, sw v4→v5) 구조적으로 견고. 9 검토 포인트 중 7 PASS / 2 WARN. Q4=Q (Saturday-only) 결정은 합류 follow-up 트래킹 조건부 수용. AC1 PARTIAL (`/pray/SAT/vespers` 백워드 호환) 합리. 5개 follow-up 권고. 머지 권장.

| 메타 | 값 |
|---|---|
| Reviewer | divine-review (adversarial-reviewer) |
| Author | dev |
| Target branch | `worktree-230-dev` (cumulative HEAD `349e43c` Phase B, parent `c144146` Phase A; total 14 files / +677 / −327 vs dispatch base, +405 / −65 actual additive ignoring base diamond artifact) |
| Base | `b8a4ee9` (dispatch); `2409448` (Phase A actual parent — diamond merge with `b8a4ee9`'s #228 audit doc; merge-time 3-way conflict-free) |
| Review session | `adhoc-review-230-fx5` (R1 + R2) |
| Decision | `dec_1` (R1 Phase A) + `dec_2` (R2 Phase B cumulative, both CONDITIONAL/APPROVED_WITH_ISSUES) |
| Peer | quality_auditor (codex), R1 exchange `ex_20260502T153230Z_fddef93c` (165 s, 763 732 / 7 864 tokens), R2 exchange `ex_20260502T154425Z_119733e9` (251 s, 4 234 205 / 18 002 tokens, resumed=true 동일 provider session) |

---

## 변경 범위

### Routing + 데이터-키 (4 files / +260 / −34)

| File | LOC | 변경 |
|---|---|---|
| `src/lib/types.ts` | +18 −2 | `HourType` 에 `firstVespers \| firstCompline` 추가. `HOUR_NAMES_MN` 에 PDF p.49 / p.512 라벨 |
| `src/lib/loth-service.ts` | +211 −14 | `dataLookupHour` / `dataLookupDayOfWeek` 인다이렉션 (psalter, seasonPropers, sanctoral, replacesPsalter, psalterCommons, rich-overlay, hymn, complineDefaults). `if (isFirstVespers)` 분기 (sanctoral Path 1 / movable special-key Path 2 / 평범한 Sunday Path 3). `getHoursSummary` per-day 리스트 (SAT=1 / SUN=5 / Mon-Fri=3). `firstVespersBranchActive` 게이트에 `isFirstVespers \|\| isFirstCompline` OR 확장 |
| `src/app/api/loth/[date]/[hour]/route.ts` | +1 −1 | `VALID_HOURS` 에 신규 hour 2개 추가 |
| `src/app/pray/[date]/[hour]/page.tsx` | +1 −1 | `VALID_HOURS` 에 신규 hour 2개 추가 |

### UI + SW (3 files / +12 / −5)

| File | LOC | 변경 |
|---|---|---|
| `src/components/hour-icon.tsx` | +5 −2 | `firstVespers` → vespers icon (sunset), `firstCompline` → compline icon (crescent moon) — case fall-through |
| `public/sw.js` | +6 −1 | `CACHE_VERSION` `v4 → v5` + 인라인 코멘트 (CLAUDE.md SW 캐시 1순위 리스크 reference) |
| `src/lib/__tests__/sw.test.ts` | +4 −2 | v4 → v5 anchor + v3 → v4 deletion expectation expansion |

### 테스트 (3 files / +124 / −22)

| File | LOC | 변경 |
|---|---|---|
| `src/lib/__tests__/loth-service.test.ts` | +83 −3 | `getHoursSummary` 3 케이스 (Mon=3 / SAT=1 / SUN=5) + `assembleHour` 4 케이스 (firstVespers route assembly, firstVespers===vespers concluding prayer, firstCompline route assembly, firstCompline≠compline concluding prayer) |
| `e2e/special-days.spec.ts` | +37 −25 | FR-011 anchor X 이전: SAT/vespers === SUN/vespers → SUN/firstVespers === SUN/vespers |
| `e2e/homepage.spec.ts` | +34 −2 | 기존 "today's date" 테스트 flake fix (`/?date=${ordinaryWeekday}`) + 2 신규 e2e (SAT 1 카드 / SUN 5 카드 순서) |

### 문서 (1 file / +2 / −1)

| File | LOC | 변경 |
|---|---|---|
| `docs/traceability-matrix.md` | +2 −1 | FR-011 행 갱신 + FR-NEW (#230 F-X5) 신규 행 추가 |

---

## PDF spot-check (parsed_data/full_pdf.txt)

| Label | PDF | Dev 라벨 | 판정 |
|---|---|---|---|
| `firstVespers` | p.49 line 1473 `1 дүгээр Оройн даатгал залбирал` | `1 дүгээр Оройн даатгал залбирал` | **VERBATIM ✓** |
| `firstCompline` | p.512 lines 17724-17725 `1 ДҮГЭЭР ОРОЙН ЗАЛБИРЛЫН ДАРАА. / НЯМ ГАРАГУУДАД БОЛОН ИХ БАЯРУУДАД` (UPPERCASE 섹션 헤더) | `1 дүгээр Оройн залбирлын дараах Шөнийн даатгал залбирал` (lowercase + attributive `дараах` + 표준 Compline suffix) | **SYNTHESIZED — verbatim 아님** (커밋 메시지 overclaim 정정 필요) |

`firstCompline` 라벨은 문법적으로 정확하고 codebase 의 `Шөнийн даатгал залбирал` 명명 패턴에 일관되며 의미상 적절. PDF 섹션 헤더 (대문자) 를 카드 라벨 (소문자 + suffix) 로 정규화한 합리적 합성. **그러나** 커밋 메시지의 "PDF p.512 캐노니컬 라벨" 표현은 misleading — 향후 commit / docs 에서 "synthesized lowercase normalization of UPPERCASE section header" 로 정정 권고.

---

## 적대적 검토 (9 포인트)

| # | 검토 포인트 | 판정 | 근거 |
|---|---|---|---|
| 1 | **Eve-shift correctness for `firstCompline`** (UTC year/month rollover) | PASS | `loth-service.ts:99-107` `new Date(dateStr+'T00:00:00Z'); setUTCDate(d-1)`. UTC semantics 가 12-31 → 12-30, 01-01 → 12-31 자동 처리. `:121-122`, `:578-583` 에서 SAT-keyed compline psalmody/defaults 가 `dataLookupDayOfWeek` 통해 정확히 fetch |
| 2 | **`firstVespersBranchActive` 게이트 widening 회귀** (rich-overlay 그림자 제거) | PASS | `:503-514`. 게이트 OR 확장은 `effectiveDayOfWeek !== dayOfWeek` (FR-156 기존 트리거) OR new hours. 평범한 SUN/vespers 는 `effectiveDayOfWeek === dayOfWeek` 이고 hour 는 vespers (firstVespers/firstCompline 아님) → 분기 비활성, psalterWeek 보존, rich shadowing 정상 동작. 회귀 없음 |
| 3 | **`getAssembler(dataLookupHour)` dispatch** | PASS | `:112-116, :651-657`. `firstVespers→vespers / firstCompline→compline` 매핑 후 호출. assembler registry (`hours/index.ts:7-14`) 는 canonical 3개 키만; vespers/compline assembler 는 `ctx` 모양만 의존, hour literal 무관. 안전 |
| 4 | **Sanctoral.firstVespers Path 1 priority + .psalms 지원** | **WARN** | propers/antiphons priority 는 정확 (`:361-397` step 5 `else if (isFirstVespers && sanctoral?.firstVespers)` 가 step 6 `replacesPsalter` 보다 먼저 평가). **그러나** `sanctoral.firstVespers.psalms` 는 explicit firstVespers route 에서 `psalmEntries` 로 복사되지 않음 — season `firstVespers.psalms` (`:276-297`) 와 `sanctoral.properPsalmody[vespers]` (`:384-396`) 만 가능. Solemnity 가 Sunday 에 떨어지는 드문 경우 (e.g., 2027 Christmas Sunday) 잠재 회귀 위험. dev followup #1 에서 명시적으로 인지 |
| 5 | **getHoursSummary Sunday 카드 순서** | PASS | `:728-734` 순서 = `firstVespers, firstCompline, lauds, vespers, compline`. 전례적으로 토요일 저녁 (firstVespers) → 토요일 밤 (firstCompline) → 일요일 아침 (lauds) → 일요일 저녁 (vespers) → 일요일 밤 (compline). 시간순 일관 |
| 6 | **homepage.spec.ts flake fix** | **WARN** | `e2e/homepage.spec.ts:5-10`. flake 자체는 mechanically sound (`/?date=${ordinaryWeekday}` 고정 wednesday 지정). **그러나** 테스트 이름 `renders with today's date by default` 는 misleading — 고정 fixture 일자 사용 중. cosmetic only, 차후 rename 권고 (`renders default Mon-Fri layout (post-#230)` 류) |
| 7 | **legacy `/pray/SAT/vespers` 보존 isolation** | PASS | `:43-47, :276-302, :304-349`. legacy 분기 게이트 (`dayOfWeek === 'SAT' && hour === 'vespers'`) 와 신규 분기 게이트 (`isFirstVespers`) 상호 배타. assembleHour 는 local 변수만 사용, 서버사이드 stateless → 두 브라우저 탭 동시 호출시 mutable state 공유 없음 |
| 8 | **CACHE_VERSION v4→v5 + sw.test.ts** | PASS | `public/sw.js:1-8, :17-23`. OFFLINE_URL / PRECACHE_URLS 변경 없음. activate 훅이 v5 외 모든 캐시 삭제. `sw.test.ts:96-100` v5 anchor + `:107-128` v4 deletion + v5 retention 검증 |
| 9 | **`docs/handoff-fx3-phrase-audit.md` deletion (diff base artifact)** | PASS | dev 의 분기 base 가 `2409448` (b8a4ee9 의 parent) 인 점에서 발생하는 합법적 다이아몬드 history. dev 가 삭제한 게 아님. leader 의 3-way merge 시 audit 문서 보존 (충돌 없음) |

**Peer (codex/quality_auditor) 동의**: 전 9 포인트 verdict 일치. peer stance = `APPROVED_WITH_ISSUES` (HIGH confidence).

---

## 아키텍처 divergence 평가

### Q4 — 사용자 P, dev Q

- **사용자 명시**: "(P) 평일 Solemnity/Feast eve 도 동일 패턴 적용 ... #216 F-2c follow-up 과 합류 가능"
- **dev**: Q (Saturday only). FR-156 weekday-eve Solemnity/Feast firstVespers promotion (`/pray/MON/vespers` 가 Tue Solemnity 의 firstVespers 콘텐츠 표시) 그대로 유지.
- **judgment**: dev 의 followup (`Q4=P 확장 별건 task 권장`) 명시 트래킹 + #216 F-2c 합류 명시 → **합리적 scope 결정**. Q4=P 를 한 commit 에 함께 구현하면 면적 (다른 위치들도 firstVespers / firstCompline 라우트 도입 필요) 이 너무 커져서 review 부담↑. **단** 사용자 명시 답변 우회는 별건 task 트래킹이 분명한 조건에서만 정당화. → CONDITIONAL.

### AC1 — PARTIAL (`/pray/SAT/vespers` 백워드 호환)

- **사용자 명시**: "토요일 저녁기도에 넣지 말고"
- **dev**: SAT 카드 리스트에서 vespers/compline 제거 ✓. SAT URL 자체는 SW/cache + 30+ first-vespers anchored e2e tests 보존 위해 그대로 resolve.
- **judgment**: "넣지 말고" 의 strong reading 은 URL 자체 제거이지만, weak reading 은 visible card 제거. dev 의 weak reading + 백워드 호환 유지는 합리적 trade-off — SW v4 캐시를 가진 단말이 stale URL 을 누르면 404 대신 콘텐츠를 받게 되어 UX 회귀 방지. **단** 영구 호환인지 / 차후 deprecation/redirect 계획인지 결정 필요. → CONDITIONAL.

---

## Verdict (R1 — Phase A only)

**APPROVED_WITH_ISSUES (CONDITIONAL)**

- 핵심 기능 (Saturday → Sunday relocation) 이 사용자 의도를 충족하며 구조적으로 견고
- 테스트 / lint / typecheck 모두 clean (835/835 passed)
- 머지 권장 — **단 5개 follow-up tracking 조건부**

### Required follow-ups (before-feature-complete) — R1 baseline

1. **Q4=P 합류 트래킹** — `#216 F-2c` 와 합류해서 weekday Solemnity/Feast eve 의 explicit firstVespers/firstCompline 라우트 도입. 별건 WI 생성 또는 #216 description amend.
2. **Sunday Solemnity `sanctoral.firstVespers.psalms` 지원** — `loth-service.ts` `if (isFirstVespers)` 분기 (`:298-349`) 에서 `sanctoral.firstVespers?.psalms` 도 `psalmEntries` 로 복사. 2027 Christmas Sunday / Easter Sunday 류 latent 회귀 차단.
3. **Non-Sunday firstVespers/firstCompline URL 404 게이트** — `route.ts` / `page.tsx` 에서 `(hour === 'firstVespers' \|\| hour === 'firstCompline') && dayOfWeek !== 'SUN'` → 404. 또는 Q4=P 구현 후 적격성 게이트로 확장.
4. **firstCompline 라벨 verbatim claim 정정** — 차후 commit / docs 에서 "PDF p.512 캐노니컬 (synthesized from UPPERCASE section header)" 로 표현. dev 자체 라벨은 변경 불필요.
5. **legacy SAT URL deprecation 결정** — `/pray/SAT/vespers`, `/pray/SAT/compline` 영구 백워드 호환 vs. SW vN 으로 redirect 도입. 별건 결정 record.

---

## R2 amendment — Phase B (349e43c) cumulative re-review

### Phase B 변경 summary

| File | Phase B LOC | 변경 |
|---|---|---|
| `src/lib/loth-service.ts` | +269 −70 | firstCompline `dataLookupDayOfWeek` ALWAYS-SAT (eve-shift 제거 — Phase A latent 버그 fix); firstVespers 3-path lookup (Path 1 sanctoral fixed-date / Path 2 movable special-key / Path 3 plain Sunday); `effectiveLiturgicalDay` 추적; `hasFirstVespersAndCompline` helper; `getHoursSummary` forward-looking eve-strip + Sunday self-preservation |
| `src/lib/hours/types.ts` | +25 −0 | `HourContext.effectiveLiturgicalDay?: LiturgicalDayInfo` optional 필드 추가 (#216 F-2c) |
| `src/lib/hours/compline.ts` | +13 −2 | F-2 alternation: `shouldUseAlternateConcludingPrayer(effectiveDay, ...)` where `effectiveDay = ctx.effectiveLiturgicalDay ?? ctx.liturgicalDay` |
| `src/lib/__tests__/loth-service.test.ts` | +81 −1 | 7 신규 vitest (Mon=3 regression / SAT=1 / SUN=5 / Christmas weekday Solemnity 5 / Christmas Eve strip / Ascension Eve strip / firstVespers route Christmas + Ascension / firstCompline F-2 effective rank) |
| `e2e/homepage.spec.ts` | +30 −0 | 2 신규 e2e (Christmas Day 5 cards / Christmas Eve 1 card) |
| `docs/traceability-matrix.md` | +1 −1 | FR-NEW (#230 F-X5) 행 확장 |

### Phase B PDF SSOT 추가 검증 (R2)

| Item | PDF evidence | 판정 |
|---|---|---|
| firstCompline ALWAYS-SAT 정당성 | PDF p.512 lines 17724-17725 subhead `1 ДҮГЭЭР ОРОЙН ЗАЛБИРЛЫН ДАРАА. / НЯМ ГАРАГУУДАД БОЛОН ИХ БАЯРУУДАД` (= "After 1st Vespers, on Sundays AND Solemnities") + 동일 패턴 p.515 `2 ДУГААР ОРОЙН ЗАЛБИРЛЫН ДАРАА. / НЯМ ГАРАГУУДАД БОЛОН ИХ БАЯРУУДАД` (Sunday II 동일 구조) | **CONFIRMED ✓** Phase A eve-shift 은 weekday Solemnity (Christmas Fri) 에서 Thu 슬롯 fetch 잘못이었음. Phase B always-SAT 가 정확 |
| `Дээд` 사용자 추정 거부 | `parsed_data/full_pdf.txt` grep counts: `Дээд оройн \| Дээд Оройн` = 0 matches; `Оройн даатгал залбирал \| оройн даатгал залбирал` = 178 matches | **CONFIRMED ✓** PDF SSOT (NFR-002) 준수 |

### Phase B 적대적 검토 (10 포인트)

| # | 검토 포인트 | 판정 | 근거 |
|---|---|---|---|
| 1 | **firstCompline ALWAYS-SAT correctness** (sanctoral.compline 충돌 없음) | PASS | `loth-service.ts:113-131, 156-160, 532-535, 587-590, 654-660, 682-687`. `SanctoralEntry` 에 `compline` 필드 없음 (`types.ts:419-440`); `sanctoral/` 데이터에서 compline override 0건 (rg 검증). |
| 2 | **firstVespers Path 1/2/3 priority + movable-Solemnity overlap** | PASS | `:311-335, propers-loader.ts:97-117`. `resolveSpecialKey` 가 Ascension/Pentecost/Trinity/Corpus Christi/Sacred Heart/Christ the King 6 movable solemnities 를 season propers 경유 매핑. 동일 6 solemnity 가 sanctoral 에는 미존재 (rg 0건) → Path 1 이 Path 2 를 가리지 않음 |
| 3 | **`isSelfContained` structural safety** | PASS | `types.ts:263-320, 388-396`. `FirstVespersPropers extends HourPropers`. omitted fields → assembler 의 optional check 통해 graceful degrade (`vespers.ts:21-29, 31-41, 53-67, 75-86`) |
| 4 | **`hasFirstVespersAndCompline` SUN unconditional true** (data coverage) | **WARN** | `:777-793, propers-loader.ts:102-106, 271-282`. 4-week OT/Advent/Christmas/Lent numeric Sunday 모두 firstVespers 보유. **Easter week 1 numeric Sunday 만 firstVespers 미보유** — 단 Easter Sunday 는 special-key `easterSunday` 로 커버 (`easter.json:382-385, 1021, 1207`). 일반 일요일에서 sparse-data 회귀 위험 매우 낮음 |
| 5 | **`effectiveLiturgicalDay` propagation completeness** | PASS | `:268-280, 412-420`. effectiveDayOfWeek 변경 모든 분기 (Solemnity/Feast eve, Saturday→Sunday legacy) 가 `effectiveLiturgicalDay` 도 동시 갱신. firstVespers/firstCompline 분기 (`:362-370`) 는 day mirror (URL date IS identity) |
| 6 | **F-2 alternation regression check (compline vs lauds/vespers)** | **WARN** | `compline.ts:258-270, concluding-prayer.ts:34-43`. compline 은 `effectiveLiturgicalDay ?? liturgicalDay` 정확히 소비. **그러나** lauds (`lauds.ts:95-100`), vespers (`vespers.ts:72-77`) 의 F-2 helper 는 여전히 `ctx.liturgicalDay` 직접 read — legacy promoted vespers URL 이 effective 이득 못 받음. 현재 F-2 는 compline 전용 rubric 이라 즉시 회귀 없음, 단 helper 코멘트가 "F-2 적용 균일" 기재해서 inconsistency. `effectiveLiturgicalDay` 가 compline 만 소비함을 명시화 OR lauds/vespers 도 마이그레이션 필요 |
| 7 | **getHoursSummary tomorrow year-rollover null-safety** | PASS | `:853-864`. UTC date math + `getLiturgicalDay` null-guard → 12-31 → 01-01 전이 충돌 0 |
| 8 | **Sunday-eve-of-Solemnity duplicate rendering** (Sun II vs Mon I 충돌) | **WARN** | `:848-864`. Sunday 은 `dayOfWeek !== 'SUN'` 게이트로 strip 제외 → Sun=ordinary + Mon=Solemnity 시 Sun 카드 5개 (vespers + compline 보존) + Mon 카드 5개 (firstVespers + firstCompline 추가) 모두 surface. 동일 Sunday-night 콘텐츠가 Sun II Vespers/Compline AND Mon firstVespers/firstCompline 양쪽 URL 에서 렌더 — 사용자 명시적 followup 으로 reserve. **major** severity 그러나 by-design + tracked |
| 9 | **PDF "Дээд" 0-match SSOT** | PASS | parsed_data grep 검증: `Дээд оройн` 0 / `Оройн даатгал залбирал` 178. `types.ts:57-60, 74-79` + `traceability-matrix:27` 정확 사용 |
| 10 | **Phase A follow-up resolution status** | **WARN** | 3 RESOLVED + 1 PARTIAL + 1 OPEN — 아래 표 |

### Phase A follow-up resolution (R2)

| FU# | Phase A 책무 | R2 상태 | 근거 / 비고 |
|---|---|---|---|
| 1 | Q4=P 합류 트래킹 (#216 F-2c) | **RESOLVED** ✓ | Phase B 가 Q4=P 직접 구현 + #216 흡수. `loth-service.ts:788-864`, `loth-service.test.ts:64-103`. task #216 completed 처리 |
| 2 | Sunday Solemnity `sanctoral.firstVespers.psalms` 지원 | **RESOLVED** ✓ | Path 1 (`:311-335`) 가 `firstVespersData.psalms` 검사 후 `psalmEntries` 복사 (line 350-356). `solemnities.json:287-313` Christmas firstVespers 데이터 확인 |
| 3 | Non-Sunday firstVespers/firstCompline URL 404 게이트 | **PARTIAL** ⚠ | Q4=P 가 valid URL 범위를 (Sunday + Solemnity/Feast w/ firstVespers) 으로 확장. `route.ts:6-29` / `page.tsx:13-38` `VALID_HOURS` 는 여전히 global — ordinary 평일 firstVespers/firstCompline URL 도 incoherent 한채 200 응답. 적격성 게이트 권고 (`hasFirstVespersAndCompline(date)` 활용) |
| 4 | firstCompline 라벨 verbatim claim 정정 | **RESOLVED** ✓ | Phase B commit 메시지가 PDF subhead+main heading 의 합성 + `-х` 형용절 어미 명시. `traceability-matrix:27` 도 동기화 |
| 5 | legacy `/pray/SAT/{vespers,compline}` URL deprecation 결정 | **OPEN** | 정책 미수립. `loth-service.ts:373-424` legacy branch 보존, `route.ts:21-29` 도 SAT/vespers 200 응답. 영구 백워드 호환 vs SW vN redirect 결정 필요 |

### Phase B 신규 finding

| Severity | Finding |
|---|---|
| major | Sunday-eve-of-Solemnity 중복 렌더링 (B-AC-8): Sun II Vespers/Compline 카드와 Mon firstVespers/firstCompline 카드가 같은 Sunday-night 콘텐츠를 양쪽에서 노출. by-design + followup tracked, 그러나 사용자 인지된 UX edge |
| minor | Ordinary 평일 firstVespers/firstCompline URL 하드닝 부재 (Phase A FU#3 PARTIAL). Q4=P 가 valid 범위 확장했으나 ordinary 평일은 여전히 200 (incoherent) |
| minor | `effectiveLiturgicalDay` 가 compline 만 소비; lauds/vespers F-2 helper 는 `ctx.liturgicalDay` 직접 read — comment 의 "F-2 균일 적용" 표현과 inconsistent |
| nit | `loth-service.test.ts` Christmas firstCompline 테스트 코멘트 ("eve-shifted to Thu slot") 가 stale — Phase B 는 ALWAYS-SAT 으로 변경됨. 테스트 자체는 rank=SOLEMNITY assertion 만 검증, alternate concluding prayer text/page 직접 검증 안 함 (assertion 강화 권고) |

### Verdict (R2 cumulative)

**APPROVED_WITH_ISSUES (CONDITIONAL)** — Phase A 와 동일한 verdict 클래스이지만 의미는 다름:
- Phase B 가 Phase A 의 architectural 핵심 follow-up 3개 (Q4=P + sanctoral.psalms + label claim) 을 해결
- Phase A latent 버그 (firstCompline eve-shift 가 weekday Solemnity 에서 Thursday 슬롯 fetch) 까지 PDF SSOT (p.512 subhead) 따라 always-SAT 으로 fix
- 단, 4개 Phase B 신규 finding + 2개 Phase A 잔여 follow-up 추가 트래킹 필요

### Required follow-ups (before-feature-complete) — R2 amended

1. **firstVespers/firstCompline URL 적격성 게이트** (Phase A FU#3 PARTIAL → OPEN-amended) — `route.ts` / `page.tsx` 에 `hasFirstVespersAndCompline(date)` 호출. ordinary 평일 첫시간 URL 은 404. (Phase B 가 helper 제공해서 구현 단순화됨)
2. **Sunday-eve-of-Solemnity 중복 렌더링 rubric** (Phase B 신규 major) — Sun II Vespers vs Mon Solemnity-I 충돌. universal calendar 통상 Mon Solemnity-I 가 우선 → Sunday strip 게이트 보강 (`tomorrow.rank == SOLEMNITY/FEAST` 시 Sun II strip) 또는 명시적 follow-up 고지
3. **`effectiveLiturgicalDay` 소비 균일화** (Phase B 신규 minor) — lauds/vespers F-2 helper 도 `effectiveLiturgicalDay ?? liturgicalDay` 마이그레이션, OR `compline-only` 의도 명시 코멘트 갱신
4. **stale 테스트 코멘트 정정 + assertion 강화** (Phase B 신규 nit) — `loth-service.test.ts` Christmas firstCompline 테스트의 "eve-shifted to Thu" 코멘트 제거 + alternate concluding prayer text 직접 비교 추가
5. **legacy `/pray/SAT/{vespers,compline}` URL policy** (Phase A FU#5 OPEN — 미해결) — 영구 백워드 호환 vs SW vN redirect 결정

### Optional nits

- `e2e/homepage.spec.ts:5` 테스트 이름 nit (R1) 미수정 — cosmetic only

---

## Tests / lint / typecheck 증거 (R2 amended)

```
vitest run (full suite, /home/min/myproject/divine office/.claude/worktrees/230-dev @ 349e43c)
  Test Files  44 passed (44)
       Tests  842 passed (842)              ← R1 835 + R2 7 new
   Start at  23:40:28
   Duration  5.24 s

tsc --noEmit
  (clean — no output)

eslint (changed files: src/lib/loth-service.ts, src/lib/hours/types.ts,
        src/lib/hours/compline.ts)
  (clean — no output)
```

(R1 의 vitest stale cache 경고 그대로 적용 — `node_modules/.vite/vitest` 캐시 정리가 CI/leader 에서 필수. R2 도 동일 캐시 정리 후 통과 확인.)

### Optional nits

- `e2e/homepage.spec.ts:5` 테스트 이름 `renders with today's date by default` → `renders default Mon-Fri layout` 류로 rename (description 과 실제 동작 일치)
- `e2e/fixtures/dates.ts:164,166` `ALL_HOURS` / `HOUR_NAMES_MN` 픽스처는 의도적으로 Mon-Fri scope 유지 — 신규 hours 가 추가되지 않음. Sunday-targeted 테스트는 이미 inline 배열 사용 중. 의도 명시 코멘트 추가 권고

---

## Tests / lint / typecheck 증거

```
vitest run (full suite, /home/min/myproject/divine office/.claude/worktrees/230-dev)
  Test Files  44 passed (44)
       Tests  835 passed (835)
   Start at  23:28:42
   Duration  5.55 s

tsc --noEmit
  (clean — no output)

eslint (changed files: src/lib/loth-service.ts, types.ts, components/hour-icon.tsx,
        api/loth/[date]/[hour]/route.ts, pray/[date]/[hour]/page.tsx, sw.js)
  ✖ 1 problem (0 errors, 1 warning)   ← sw.js gitignore 패턴 (정상)
```

(테스트 cache stale 경고: 첫 vitest 실행에서 `.vite/vitest` 캐시가 dev 의 이전 iteration 코드 - `dateKeyForFirstVespersLookup` undefined 에러 - 를 보유하고 있었음. 캐시 정리 후 정상 통과. CI / leader merge 측에서 stale cache 가능성 인지 필요.)
