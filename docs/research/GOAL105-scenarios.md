# GOAL #105 — 시나리오 도출 (시편기도 페이지경계 절단 근본수정)

> 입력 SSOT: `docs/design/mental-models/goal105-psalmprayer-truncation-fix.md`(#106 MM) — 불변식 C1(case→completeness), 설계계약 C1-C8, 신규발견 C5(dual extraction path).
> 작성: dvo-sol (research, task #107 / `[#105-sub-2]`). 권위 데이터 = `node docs/research/GOAL100-truncation-sweep.mjs` 재실행(2026-05-31): `마커 102 | L397 break 5 | 진짜절단 1 | 정상STOP 4`(현 상태 stable).
> 분류: **happy**(정상 동작) / **failure**(버그 재현·회피해야 할 결과) / **edge**(경계조건). 각 시나리오에 AC 매핑 + 검증방법 1줄.

---

## 0. 불변식 요약 (판정 순서 — 시나리오의 공통 전제)

수집루프가 빈줄 뒤 다음 의미줄 `next` 를 만났을 때, **이 순서로** 판정한다(C2: 하드가드가 완결성판정보다 **먼저**):

1. `next` 가 `isEndMarker` / `ANY_PSALM_HEADER_RE` / `ANY_CANTICLE_HEADER_RE` → **STOP**(기존 L396, 무변경).
2. `SKIP_PATTERNS` 노이즈(페이지번호 / 러닝헤더 L46) → **skip**(계속 peek, 무변경).
3. **[신규 C1]** 직전 수집텍스트가 **미완결**(末이 쉼표 `,` 또는 문장종결부호[`. ! … ) ” »`] 부재) → **ABSORB**(continuation).
4. 직전이 **완결**(末 종결부호 존재) →
   - `next` 가 마커/헤더면 위 1에서 이미 STOP.
   - `next` 가 **비마커**면 → **STOP + NEEDS_REVIEW 플래그**(C4: silent STOP 금지, 적극 흡수도 금지).

> 기존 버그 = 위 3·4 자리에 `if (!/^[а-яёөү]/.test(next)) break`(L397, case-only)가 있어, **미완결인데 next 가 대문자**면 잘못 STOP → 절단.

---

## 1. [D1] happy — 시편 114편 직후 기도 온전 추출

| 항목 | 내용 |
|---|---|
| **class** | happy |
| **AC** | [D1] (화면 끝까지 표시) |
| **precondition** | `week1_final.txt` L740 부근. 직전 수집末 = `...төгс хүчит Тэнгэрбурхан минь,`(쉼표=**미완결**). 빈줄+페이지번호`71`+러닝헤더`Ням гарагийн орой`+빈줄+`71` 뒤 next = `Та ус ба Сүнсний...`(대문자 Т). |
| **expected** | 노이즈 skip(C2-2) → 직전 미완결(C1) → **ABSORB** → 종결어 `...Таныг тахин шүтэх болтугай.`(末 종결부호 `.`)까지 수집 → 다음 줄 `Шад магтаал...`(END_MARKER)에서 정상 STOP. psalmPrayer = 전반+후반 완전체. |
| **검증방법** | 파서 단위 픽스처: `extractPsalmPrayer(week1 fixture)` → 반환문자열이 `болтугай.` 로 끝나고 `Та ус ба Сүнсний` 포함. + sweep 의 진짜절단 카운트 1→0. |

---

## 2. [D2] regression (전수) — over-extension/신규절단 0

### 2.1 정상 STOP 4건 유지 (over-absorb 금지) — happy/regression
직전 末이 **종결부호**로 끝나는 4건은 흡수되지 않고 그대로 STOP(다음 섹션 미혼입). sweep 권위 데이터:

| # | 위치 | 직전 末(완결) | drop(다음 섹션) | 새 게이트 판정 |
|---|---|---|---|---|
| S1 | w2 L3577 | `...Та хамгаалж өгнө үү.` | `Амилалтын улирал: Эзэн...`(부활시기 후렴 라벨) | 완결→STOP. drop 비흡수. |
| S2 | w3 L644 | `...бид хүсэн хүлээж байна.` | `Хоол хүнс өгчээ.`(다음 시편 후렴) | 완결→STOP. |
| S3 | w4 L55 | `...мөнхийн хотод ирэх болно.` | `Манаач хүн өглөө...`(다음 섹션) | 완결→STOP. |
| S4 | w4 L691 | `...гэрлийг харах болтугай.` | `(Х. Аллэлуяа!)`(알렐루야 응답) | 완결→STOP. |

- **class**: regression(happy 유지) | **AC**: [D2]
- **expected**: 4건 모두 psalmPrayer 末이 변하지 않음. drop 텍스트가 해당 기도에 **부재**. (구 case-게이트도 우연히 STOP했고, 새 completeness-게이트는 **설계상** STOP — 동일 결과, 회귀 0.)
- **검증방법**: 파서 단위 픽스처 4건(각 입력→반환문자열에 drop 미포함) + sweep 정상STOP 4 유지 + 재생성-후 데이터 단언(4 drop 줄이 어떤 psalmPrayer 에도 부재).

### 2.2 edge — 미완결 + 다음줄이 END_MARKER/러닝헤더 → 흡수 금지
- **class**: edge | **AC**: [D2]
- **precondition**: 직전 末 미완결(쉼표)인데 빈줄 뒤 next 가 `Шад магтаал`(END_MARKER) 또는 `Ням гарагийн орой`(러닝헤더, SKIP_PATTERNS L46).
- **expected**: END_MARKER → C2-1 에서 STOP(미완결이어도 흡수 안 함, 하드가드 우선). 러닝헤더 → C2-2 skip 후 **그 다음** 의미줄로 판정(러닝헤더 자체를 흡수 대상으로 보지 않음). **흡수도 silent-STOP도 아닌 올바른 경계처리.**
- **검증방법**: 파서 단위 픽스처 2종(미완결+END_MARKER next / 미완결+러닝헤더 then 마커) → 반환에 마커·헤더 텍스트 미포함.

### 2.3 edge — 완결 + 다음줄이 비마커 → STOP + NEEDS_REVIEW (C4)
- **class**: edge | **AC**: [D2] (+ 미래안전)
- **precondition**: 직전 末 **완결**(종결부호)인데 next 가 END_MARKER/헤더가 **아님**. 현 corpus 의 §2.1 4건이 정확히 이 형태(drop 라벨들이 END_MARKERS 목록에 부재 → L397 도달).
- **expected**: **STOP(흡수 안 함 → over-extension 0, [D2] 충족)** + **NEEDS_REVIEW 플래그**(로그/실패카운트). "완결 후 continuation"인 진짜 page-crossing 가능성을 침묵으로 'STOP 증명'하지 않음. NEEDS_REVIEW ≠ 실패 — STOP+감사신호. 현 4건은 사전검증된 STOP(drop=다음섹션)이므로 audit 으로 confirm.
- **검증방법**: sweep/추출기가 이 조합을 NEEDS_REVIEW 로 분류·집계; audit 으로 drop ∈ 다음섹션 confirm(4건). (Step 3 가 NEEDS_REVIEW 를 실제 구현할지/문서화로 그칠지 결정 — MM C4.)

### 2.4 edge — 다음 시편/섹션 본문으로의 과잉흡수(over-absorb) 방지
- **class**: edge/failure-avoidance | **AC**: [D2]
- **precondition**: 만약 완결성 판정을 잘못 구현해(예: 종결 집합 누락) 완결 기도를 미완결로 오판하면, S1 의 `Амилалтын улирал:...` 같은 **다음 섹션이 기도에 흡수**됨.
- **expected**: 발생 금지. 종결집합(C3, 좁게-정의)이 `үү.`/`байна.`/`болно.`/`болтугай.` 의 末 `.` 를 종결로 정확 인식 → 4건 흡수 안 함.
- **검증방법**: sweep 의 정상STOP 4 유지(흡수 시 카운트가 STOP→다른 분류로 변함) + 재생성-후 단언(4 drop 부재).

### 2.5 [C5] dual-path — rich buildProsePrayer 동일 불변식 (failure path 명시)
- **class**: failure path(회피 대상) | **AC**: [D2]
- **메커니즘**: psalmPrayer 는 두 경로 생성 — ① `extract-psalm-texts.js:397`→`psalter-texts.json`, ② `build-psalter-prayers-rich.mjs`→`rich-builder.mjs buildProsePrayer`(PDF 독립 재구성, maxExtraPages:4) + acceptance gate(`originalText`=psalter-texts.json 의 psalmPrayer 와 대조, `firstDivergenceAt`)→`psalter-texts.rich.json`.
- **failure 시나리오**: extract**만** 고쳐 psalmPrayer(originalText)가 완전해지면, buildProsePrayer 재구성이 여전히 절단(동일 case-bug 잔존)→`reconstructedNorm`≠`originalText`→**divergence→gate FAIL→psalmPrayerRich 미갱신**→**혼합출력**(json 완전 / rich.json:3011 절단 잔존). *현재 rich.json:3011 末이 `минь,`로 json 과 동일 절단임을 byte 확인 → 두 경로가 같은 절단이라 gate 가 지금 통과 중*; 한쪽만 고치면 깨짐.
- **expected(올바름)**: buildProsePrayer 도 동일 완결성 불변식 적용 → 양 경로 완전 재구성 → gate PASS. **완료기준 = 재추출 후 `build-psalter-prayers-rich` failure count = 0**(coverage≥85% 부분기준 불충분 — partial-write 가 혼합 남김; 실패 SSOT `scripts/out/psalter-prayers-rich-failures.md`).
- **검증방법**: 재생성-후 `build-psalter-prayers-rich` 출력 `실패: 0` + rich.json:3011 psalmPrayerRich 末이 `болтугай.`(종결, json 과 일치).

---

## 3. [D3] — 복원 본문 byte 일치 (원문 충실)

| 항목 | 내용 |
|---|---|
| **class** | happy/검증 |
| **AC** | [D3] (추측/기계번역 아님) |
| **precondition** | 복원된 시편 114 후반. |
| **expected** | psalmPrayer 후반이 `full_pdf.txt` L2244-2250 과 **byte 일치**: `Та ус ба Сүнсний төрөлтөөр шинэ Израилийг амьдруулж, ... Таныг тахин шүтэх болтугай.`(컬럼-wrap merge 후 단일 문단). 한 글자 생성/보정 0. |
| **검증방법** | 재생성-후 데이터 단언: psalter-texts.json 의 Psalm 114 psalmPrayer 가 `full_pdf.txt` L2234-2251 의 마커後 본문(컬럼-wrap normalize)과 byte 동치. 특정 지문 `Та ус ба Сүнсний` 포함 + `болтугай.` 종결. |

---

## 4. failure paths 요약 (회피해야 할 결과)

| FP | 설명 | 어느 시나리오가 잡나 |
|---|---|---|
| **FP1 (구버그)** | case 기반 오STOP — 미완결인데 next 대문자라서 절단(시편 114). | §1 happy + sweep 진짜절단 1→0. |
| **FP2 (dual-path divergence)** | extract만 고쳐 rich gate FAIL→혼합출력. | §2.5 — failure count 0. |
| **FP3 (over-absorb)** | 완결 기도가 다음 섹션을 흡수(종결집합 오류/NEEDS_REVIEW 미흡). | §2.4 + §2.1 — STOP 4 유지. |
| **FP4 (silent STOP)** | 완결+비마커를 침묵으로 STOP 단정(미래 page-crossing 누락 위험). | §2.3 — NEEDS_REVIEW 플래그. |

---

## 5. 검증방법 3종 (시나리오 ↔ 도구 매핑)

| 도구 | 커버 시나리오 | 성격 |
|---|---|---|
| **(a) 파서 단위 픽스처** (`extractPsalmPrayer` 직접) | §1, §2.1(4), §2.2 | drift 방지(sweep 로직중복 보완), 입력→반환 정밀단언 |
| **(b) 아티팩트-프리 전수 sweep** (`GOAL100-truncation-sweep.mjs` 류) | §2.1, §2.3, §2.4 | 전수 회귀(진짜절단 1→0, 정상STOP 4 유지, NEEDS_REVIEW 집계) |
| **(c) 재생성-후 데이터 단언** | §1, §2.5, §3 | 최종 산출(json/rich) byte·종결·delta범위·failure=0 |

---

## 6. 추가 시나리오 (peer completeness 보강 — `ex_20260531T011522Z_d3c66c1a`, HIGH)

peer completeness-critic 가 식별한 누락 14건 중 material 항목. Step 3 설계lock·Step 4 테스트작성이 반드시 커버.

### 6.1 **[검증 blind-spot — 최우선]** 회귀 sweep 은 *新* 로직을 모델링해야 함
- **class**: failure-avoidance(verification gap) | **AC**: [D2]
- **문제**: `GOAL100-truncation-sweep.mjs` 는 **구 L397 case-gate 를 복제**한다. 이는 구버그가 만든 break 지점만 본다. 수정 후 **새 completeness 로직이 새로 유발하는 over-absorb 는 구 break-set 밖**이라 이 sweep 으로 안 보임.
- **요구(Step 4)**: 회귀는 **실제 수정된 `extractPsalmPrayer` 를 전 weekN 102 마커에 직접 실행**해 산출을 단언(또는 sweep 시뮬레이터를 新 completeness 로직으로 갱신)한다. 구-로직 복제 sweep 단독 금지.
- **검증방법**: 수정된 파서 실제 실행 → 102 마커 산출 스냅샷; 기준선(시편114=완전, 나머지 101 byte-불변) diff.

### 6.2 multi-hop continuation (>1 페이지 hop)
- **class**: edge | **AC**: [D1]/[D3]
- **precondition**: 미완결 기도가 한 페이지hop 흡수 후 **또 다른 빈줄+노이즈 블록**을 만나 종결부호 도달까지 2+ hop 필요. (rich-builder `maxExtraPages:4` + 주석 "3+ 페이지 필요한 edge case 관찰됨" → 실재.)
- **expected**: extract 수집루프가 **각 hop 마다 완결성 재평가**(while 재진입). 매 hop 직전상태가 미완결이면 계속 흡수, 종결 도달 시 정지.
- **검증방법**: 파서 단위 픽스처(2-hop 입력 → 종결까지 완수) + rich `maxExtraPages` 경로 동치 확인.

### 6.3 종결부호 정규화/순서 (closing quote·paren·abbreviation)
- **class**: edge/failure-avoidance | **AC**: [D2] (C3 정밀화)
- **a. 닫는 인용/괄호 뒤 종결**: `.”` `.)` 처럼 종결부호 뒤 닫기문자 → terminal 판정이 末문자 단독(`)` 만 보고 완결)이 아니라 **정규화/순서검사**(trailing `”)»` 무시하고 그 앞 `.` 확인)로 판정.
- **b. 약어 false-terminal**: 末이 `.` 인데 문장종결이 아닌 **약어/이니셜**(`Х.`=Хор/응답 약어가 w4 L691 drop `(Х. Аллэлуяа!)` 에 실재)이면 미완결을 완결로 오판할 위험. **현 corpus 검증 결과 = 위험 미실현**: 85 psalmPrayer 본문 내부 `[А-ЯӨҮЁ]\.` 약어-마침표 **0건**(2026-05-31 스캔) → 시편114 수정 범위에서 false-terminal 0. 단 미래 robustness 로 종결집합은 약어를 종결로 단정하지 않도록 유지.
- **검증방법**: 종결집합 단위테스트(`.”`/`.)`=완결) + corpus grep(내부 `[А-ЯӨҮЁ]\.` 스캔 — 현재 0, 회귀 감시).

### 6.4 소문자 next-section 은 completeness-gate 가 보호 못 함 (marker 의존)
- **class**: edge(caveat) | **AC**: [D2]
- **요지**: case-gate 제거로 **소문자로 시작하는 다음-섹션**이 직전 미완결과 만나면 completeness-gate 는 **흡수**한다(소문자라 막지 못함). 유일한 방어 = `END_MARKERS`/헤더/rubric 가드(C2). 따라서 **END_MARKERS 목록 충분성**이 안전의 핵심 — Step 3 가 psalter 섹션 시작 패턴(후렴 라벨 `Амилалтын улирал:` 류 포함 여부)을 재점검. (현 corpus 4 STOP drop 은 모두 대문자/괄호라 우연히 무관하나, 불변식상 소문자 next-section 위험은 marker 로만 닫힘.)
- **검증방법**: 소문자 시작 다음-섹션 픽스처(미완결 직전) → END_MARKER 로 STOP 확인; END_MARKERS 미포함 섹션라벨 enumerate.

### 6.5 NEEDS_REVIEW 노이즈 = 고정 baseline 필요
- **class**: edge | **AC**: [D2] (§2.3 정밀화)
- **요지**: 알려진-양호 4 STOP 을 매번 NEEDS_REVIEW 로 올리면, **미래의 진짜 케이스가 반복 노이즈에 묻힌다**. → 4건의 **고정 기대 baseline(시그니처: w·line·末·drop)**을 allowlist 로 두고, **baseline 밖 신규 NEEDS_REVIEW 만 경보**.
- **검증방법**: sweep/추출기가 NEEDS_REVIEW 를 baseline(4 시그니처) 대비 diff → 신규 0 단언.

### 6.6 재생성 idempotency + stale rich 제거
- **class**: edge/failure-avoidance | **AC**: [D2] (C5/C6 보강)
- **요지**: `build-psalter-prayers-rich` 는 partial-write → **재실행 byte-stable** 해야 하고, **gate FAIL 시 구(절단) psalmPrayerRich 를 그대로 남기면 안 됨**(stale). 또 `psalmPrayerPage` 부재 entry 는 rich 빌더가 skip → plain 만 고치고 rich 미갱신될 수 있음(시편114 는 page=70 보유라 해당없음, 일반 불변식으로 명시).
- **검증방법**: 빌더 2회 연속 실행 → 산출 byte 동일; 시편114 ref 가 gate PASS 로 rich 갱신됨 + 末 `болтугай.`; failure count 0.

### 6.7 delta-scope 음성 단언 (counts 아닌 content)
- **class**: 검증강화 | **AC**: [D2]/[D3] (C6)
- **요지**: "카운트 통과"가 아니라 **content 음성 단언** — (a) 시편114 외 84 psalmPrayer + 대응 외 psalmPrayerRich 가 **byte-불변**, `stanzasRich` 보존; (b) 4 drop 줄(`Амилалтын улирал:`/`Хоол хүнс өгчээ.`/`Манаач хүн...`/`(Х. Аллэлуяа!)`)이 **psalmPrayer 와 psalmPrayerRich 양쪽에 부재**.
- **검증방법**: git diff 범위(2 파일, 시편114 ref 한정) + 양 파일 grep 음성단언.

---

## 7. 인용 색인
- MM: `docs/design/mental-models/goal105-psalmprayer-truncation-fix.md`(#106, C1-C8).
- 근본원인: `docs/research/GOAL100-psalmprayer-truncation.md`(#100), sweep `docs/research/GOAL100-truncation-sweep.mjs`(재실행 `마커102|진짜절단1|정상STOP4`).
- 추출경로1: `scripts/extract-psalm-texts.js:397`(절단 gate), :41-51(SKIP_PATTERNS, 러닝헤더 L46), :61-76(END_MARKERS), :360-413(extractPsalmPrayer).
- 추출경로2: `scripts/build-psalter-prayers-rich.mjs:135,141,156-182`, `scripts/parsers/rich-builder.mjs`(buildProsePrayer).
- 절단 데이터: `src/data/loth/psalter-texts.json:236`, `src/data/loth/prayers/commons/psalter-texts.rich.json:3011`(末 `минь,` 확인).
- 소스 원문: `parsed_data/full_pdf.txt:2234-2251`(누락 후반 L2244-2250, 종결 `болтугай.` L2249-2250), `parsed_data/week1/week1_final.txt:740`.
- peer(설계검증, #106): codex research_methodologist `ex_20260531T010212Z_f214b978`(APPROVED_WITH_ISSUES/HIGH) — terminal 좁게정의·하드가드선행·NEEDS_REVIEW·파서픽스처·재생성단언·rich failure0·delta범위.
