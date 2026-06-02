# Mental Model — 시편 114편 시편기도 페이지경계 절단 근본수정 (GOAL #105)

> 블루프린트 SSOT. 근본원인 분석 = `docs/research/GOAL100-psalmprayer-truncation.md`(#100, peer+적대 리뷰 검증). 이 문서는 그 분석을 **수정 GOAL**의 의도·관찰가능결과·비목표·계약(초안)으로 한 장에 고정한다. 상세 설계 lock 은 Step 3(#108)에서, 본 MM 의 **Design contract 초안**을 입력으로 확정한다.
> 작성: dvo-sol (research, task #106 / `[#105-sub-1]`). peer(codex research_methodologist) APPROVED_WITH_ISSUES(HIGH) — 7개 concern 을 Design contract 초안에 반영.

---

## Intended behavior (의도된 동작)

PDF 페이지 경계를 넘어 분할된 시편기도(psalmPrayer)의 **뒷부분이 온전히 추출/저장**되어, 데이터(psalter-texts.json / psalter-texts.rich.json)에 완전한 기도문이 들어간다. 구체적으로 추출 파서 `scripts/extract-psalm-texts.js`의 continuation gate(L397)가, 페이지 경계 다음 줄이 **대문자로 시작하는 새 문장**이라도 그것이 **같은 기도의 continuation 이면 흡수**하도록 완화된다 — 단, **정상 종료된 기도를 다음 섹션(후렴/알렐루야/헤더)과 오병합하지 않는다.**

핵심 판별 전환: **다음 줄의 대소문자(case)** 가 아니라 **직전까지 수집된 텍스트의 완결성(completeness)** 을 흡수 기준으로 삼는다.

---

## Observable outcome (관찰 가능한 결과 — 사용자 지각)

- 삼위일체 축일 **제1저녁기도**의 첫 시편(**시편 114편**) 직후 기도가 화면에서 `…далд нууц байдаг төгс хүчит Тэнгэрбурхан минь,` 에서 **끊기지 않고** 마지막 종결어 `…Таныг тахин шүтэх болтугай.` 까지 **끝까지 보인다**.
- 복원된 뒷부분은 PDF 원문(`full_pdf.txt` L2244-2250)과 **byte 일치** — 추측/기계번역 0.
- **다른 어떤 시편기도도** 이 수정으로 새로 잘리거나(절단) 잘못 늘어나지(다음 섹션 흡수) 않는다 — 화면상 다른 시간경/요일의 기도문 동작 무변경.
- (개발자 지각) 재추출 후 `node docs/research/GOAL100-truncation-sweep.mjs` 의 **진짜절단 카운트가 1→0**, 정상STOP 4건 유지.

---

## Non-goals (비목표)

- **추출 파이프라인 전면 재설계 금지** — 최소변경 원칙. L397 gate 완화 + 필요한 경우 두 번째 추출경로(rich-builder)의 동일 정합만 손본다. 수집루프 구조/`SKIP_PATTERNS`/`END_MARKERS` 전면 개편 안 함.
- **타 데이터영역 동시수정 금지** — hymn / compline / propers / sanctoral 등 다른 추출기·데이터는 범위 외. 이 GOAL 은 psalter weekN → psalter-texts.json(+rich) 경로 전용.
- **기계번역/추측보정 금지** — 복원 텍스트는 `full_pdf.txt` 원문만 근거. 한 글자도 생성/보정하지 않음.
- **신규 page-crossing 케이스의 적극 발굴/보정 금지** — 현 corpus 의 확정 절단 1건(시편 114편)만 수정 대상. sweep 이 추가 절단을 0건으로 보고하므로, "미래의 완결문장-후-continuation" 케이스는 **수정이 아니라 NEEDS_REVIEW 플래그**로만 다룬다(아래 Design contract D 참조).
- **응답/렌더 컴포넌트 변경 없음** — 버그는 추출(빌드타임 데이터)에 있고 런타임 렌더는 정상. UI 코드 무변경.

---

## AC link (GOAL #105 description)

- **[D1]** 삼위일체 제1저녁기도 첫 시편(시편 114편) 직후 기도문이 **화면에서 끝까지 온전히 표시**(중간 절단 없음). — user-facing / `semantic`(실화면 acceptance)
- **[D2]** 이 수정으로 **다른 시편기도가 새로 잘리거나 잘못 늘어나지 않음** — 전수 회귀(아티팩트-프리 sweep `GOAL100-truncation-sweep.mjs` 류). — `executable`(회귀)
- **[D3]** 복원된 뒷부분 본문이 **PDF 원문**(`full_pdf.txt` 해당 구간)과 **일치**(추측/기계번역 아님). — `executable`/`structural`(byte 대조)

---

## Design contract 초안 (Step 3 #108 입력 — peer 7-concern 반영)

### C1. 판별 불변식 (핵심 — 본 MM 이 답해야 하는 설계질문)
continuation 흡수 여부는 **직전 수집 텍스트의 완결성**으로 판정한다:

- **흡수(continuation)** = 직전 수집 텍스트가 **미완결**(종결부호 없이 끝남 — 쉼표 `,` 로 끝나거나 문장종결 부호 부재)일 때 **그리고** 다음 의미줄이 end-marker/헤더가 아닐 때.
- **정지(STOP)** = 직전 수집 텍스트가 **완결**(문장종결)일 때 — case 와 무관하게 멈춘다.
- **case 는 더 이상 gate 가 아니다.** 기존 `if (!/^[а-яёөү]/.test(next)) break`(L397)를 완결성 판정으로 교체.

이 불변식이 §4.3(GOAL100) 의 1 절단(시편 114, 末 `минь,`=미완결→흡수) 과 4 정상STOP(末 `…үү.`/`…байна.`/`…болно.`/`…болтугай.`=완결→유지) 을 정확히 분리한다.

### C2. 하드 가드는 완결성 판정 **앞**에 유지 (peer concern 2)
`isEndMarker` / `ANY_PSALM_HEADER_RE` / `ANY_CANTICLE_HEADER_RE` 검사(L396, L402-403)와 `SKIP_PATTERNS` 노이즈 필터(L391, L404)는 **완결성 판정보다 먼저** 그대로 작동한다. 즉 완화는 **additive** — 다음 줄이 end-marker/헤더면 직전이 미완결이어도 STOP. running-header(`/гарагийн\s+(өглөө|орой)/i`, L46)·페이지번호 배제 무변경. (소문자로 시작하는 다음-섹션이 직전 미완결과 결합해 흡수되는 일이 없도록, end-marker/헤더 목록의 충분성을 Step 3 에서 재확인.)

### C3. "완결(terminal)" 정의는 **좁게, 테스트로 뒷받침** (peer concern 1)
종결 판정 집합은 **명시적 문장부호 집합**(`. ! … ) ” »` 및 쉼표=비종결)으로 한정한다. 모호한 "알려진 종결 단어(known closing word)" 목록에 의존하지 않는다 — 그런 휴리스틱은 *종결부호 누락형 절단*을 종결로 오판해 버그를 가린다. (`болтугай` 등은 그 뒤의 `.` 로 종결 판정되며 단어 자체로 종결 판정하지 않음.)

### C4. 완결+비마커-continuation → **NEEDS_REVIEW** (silent STOP 금지) (peer concern 3)
"직전이 완결인데 다음 의미줄이 end-marker/헤더가 **아닌**" 경우는 현 corpus 에 없다(sweep 의 4 STOP 은 모두 다음 줄이 다음-섹션). 그러나 이를 **"증명된 STOP"으로 단정하지 않는다** — 미래 안전을 위해 추출기/sweep 이 이 조합을 만나면 **NEEDS_REVIEW 로 플래그**(로그/실패 카운트)하여 침묵 절단을 방지한다. (적극 흡수는 하지 않음 — Non-goals.)

### C5. 두 추출경로 정합 (cross-artifact coupling — peer concern 6, **본 task 신규발견**)
psalmPrayer 데이터는 **두 경로**로 만들어진다:
1. `scripts/extract-psalm-texts.js`(L360-413, gate L397) → `src/data/loth/psalter-texts.json` 의 `psalmPrayer`.
2. `scripts/build-psalter-prayers-rich.mjs` → `scripts/parsers/rich-builder.mjs` 의 `buildProsePrayer({originalText: entry.psalmPrayer, maxExtraPages:4})` 가 **PDF 에서 독립 재구성**(`result.prayerText`) 한 뒤 `originalText`(=psalter-texts.json 의 psalmPrayer) 와 **acceptance gate**(`firstDivergenceAt`, `pass`) 로 대조 → 통과 시에만 `psalter-texts.rich.json` 의 `psalmPrayerRich` 갱신.

→ **현재 gate 통과**는 두 경로가 *동일하게 절단*되어 있어 일치하기 때문일 수 있다. `extract-psalm-texts.js` 만 고쳐 `psalmPrayer`(originalText) 가 완전해지면, `buildProsePrayer` 의 재구성이 여전히 절단되면 **divergence→FAIL→psalmPrayerRich 미갱신→혼합출력**(json 완전 / rich 절단). 따라서 Step 3 는 **buildProsePrayer 의 페이지경계 처리(`maxExtraPages:4` 경로)가 동일 완결성 불변식으로 시편 114 를 완전 재구성하는지 검증**하고, 필요시 동일 수정을 적용한다. **완료기준: 재추출 후 `build-psalter-prayers-rich` 의 failure count = 0**(coverage ≥85% 같은 부분기준 불충분 — partial-write 가 혼합출력을 남김). 실패목록 SSOT = `scripts/out/psalter-prayers-rich-failures.md`.

### C6. JSON delta 범위 최소 (peer concern 7)
- `src/data/loth/psalter-texts.json`: **시편 114편 ref 의 `psalmPrayer`(+필요시 `psalmPrayerPage`)만** 변경. 그 외 84개 psalmPrayer 무변경(diff 로 확인).
- `src/data/loth/prayers/commons/psalter-texts.rich.json`: **대응 ref 의 `psalmPrayerRich` 만** 변경, **`stanzasRich` 등 다른 필드 보존**.

### C7. 회귀 control = 듀얼 (peer concern 4·5 — sweep 단독 금지)
- **(a) 파서 단위 픽스처** — 중복로직 drift 방지를 위해 `extractPsalmPrayer` **자체**에 대한 단위 테스트: 시편 114 입력→완전 흡수, 4 STOP 입력→미흡수(다음 섹션 배제). (sweep 은 파서 로직을 복제하므로 단독 control 로는 drift 위험.)
- **(b) 아티팩트-프리 전수 sweep** — `GOAL100-truncation-sweep.mjs` 재실행: 진짜절단 1→0, 정상STOP 4 유지, 신규절단 0.
- **(c) 재생성-후 데이터 단언** — 시편 114 `psalmPrayer` 가 `Та ус ба Сүнсний` 를 포함하고 `болтугай.` 로 끝남; 어떤 `psalmPrayer` 도 쉼표/비종결로 끝나지 않음; 4 STOP 의 dropped 줄(다음섹션 텍스트)이 해당 기도에 **부재**.

### C8. 운영 체크포인트 (CLAUDE.md self-review + 배포)
- **CACHE_VERSION**: 재추출로 번들 데이터(psalter-texts.json/rich) 변경 → `public/sw.js` CACHE_VERSION bump 필요. 단 **#90(#96/#98)이 이미 v43→v44 를 점유** — 본 GOAL 도 v44 를 올리면 충돌. **머지 순서 조율**: 먼저 머지되는 GOAL 이 v44, 나중이 v45(또는 통합 머지 시 단일 bump). Step 6/머지 시 실제 현재값 확인 후 결정.
- **psalter verifier**: `node scripts/verify-psalter-pages.js`(page 정합), `node scripts/audit-psalter-ref-consistency.js`(ref↔본문 stanza 정합 — **suspect 수 증가 0** 확인) — psalmPrayer 본문 변경이 ref 정합 회귀를 일으키지 않는지.
- e2e/단위는 빌드타임 데이터 변경이라 대부분 무관하나, psalter-texts 를 읽는 컴포넌트 스냅샷이 있으면 갱신.

---

## 인용 색인

- **근본원인 분석**: `docs/research/GOAL100-psalmprayer-truncation.md`(#100) — L397 gate, scope=1, §4 시뮬레이션.
- **절단 데이터**: `src/data/loth/psalter-texts.json:236`(key `Psalm 114:1-8`, `psalmPrayer` 末 `минь,`, `psalmPrayerPage:70`), `src/data/loth/prayers/commons/psalter-texts.rich.json:3011`.
- **소스 원문**: `parsed_data/full_pdf.txt:2234-2251`(전반 L2235-2236, page-break 아티팩트 L2237-2243, 누락 후반 L2244-2250, 다음섹션 L2251), `parsed_data/week1/week1_final.txt:740`.
- **추출 경로 1**: `scripts/extract-psalm-texts.js` — `SKIP_PATTERNS` L41-51(러닝헤더 L46), `END_MARKERS` L61-76, `extractPsalmPrayer` L360-413, **절단 gate L397** `if (!/^[а-яёөү]/.test(next)) break`.
- **추출 경로 2(rich)**: `scripts/build-psalter-prayers-rich.mjs`(psalter-texts.json→rich.json, acceptance gate L156-182, failures→`scripts/out/psalter-prayers-rich-failures.md`), `scripts/parsers/rich-builder.mjs` `buildProsePrayer`(PDF 독립 재구성, `maxExtraPages:4`).
- **회귀 control**: `docs/research/GOAL100-truncation-sweep.mjs`(repo 커밋).
- **peer**: codex `research_methodologist`, exchange `ex_20260531T010212Z_f214b978` — APPROVED_WITH_ISSUES(HIGH). 7 concern(terminal 좁게 정의 / 하드가드 선행 / 완결+비마커→NEEDS_REVIEW / 파서단위 픽스처 / 재생성-후 단언 / rich failure=0 / JSON delta 범위) → C1-C8 반영.
