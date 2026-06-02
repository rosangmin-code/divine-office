# GOAL #105 — Spec / Design Lock (시편기도 페이지경계 절단 근본수정)

> **REVIEW/LOCK (재설계 아님).** 입력 SSOT: MM `docs/design/mental-models/goal105-psalmprayer-truncation-fix.md`(#106, C1-C8) + 시나리오 `docs/research/GOAL105-scenarios.md`(#107, §6). 본 문서는 둘을 **모호점 없이 lock 가능한 단일 design-spec** 으로 통합한다. 리더 Gate-β(구조복잡도) 입력 + Step 4(#109 테스트작성) 입력.
> 작성: dvo-sol (research, task #108 / `[#105-sub-3]`). peer(codex research_methodologist) 설계검증(#106 `ex_..._f214b978`)+completeness(#107 `ex_..._d3c66c1a`) 반영. 본 task 신규 실측: 아래 §C 의 dual-path 절단 **확정**.

---

## 0. 범위 & 불변식 (lock)

- **In-scope**: 페이지 경계를 넘는 시편기도 1건(시편 114편)의 뒷부분이 누락되는 절단의 근본수정. 두 추출경로(plain + rich) 정합. 전수 회귀로 무회귀 보장.
- **Out-of-scope(고정)**: 추출 파이프라인 전면 재설계; 타 데이터영역(hymn/compline/propers/sanctoral); 기계번역/추측보정; 신규 page-crossing 케이스 적극발굴(미완결 1건만 수정, 그 외는 NEEDS_REVIEW 플래그).
- **불변식 C1(판정순서, lock)**: 빈줄 뒤 다음 의미줄 `next` 에서 — ① end-marker/헤더면 STOP(하드가드, 선행) → ② SKIP_PATTERN 노이즈면 skip(계속 peek) → ③ **직전 수집末이 미완결(비종결)** 이면 ABSORB → ④ 직전 완결이면 `next` case 무관 STOP(+ next 가 비마커면 NEEDS_REVIEW).

---

## A. extract-psalm-texts.js 수정 (plain 경로) — 정확한 조건식

**대상**: `extractPsalmPrayer(lines, startIdx)` 의 빈줄-peek 블록(현 `:380-399`), 특히 **`:397` `if (!/^[а-яёөү]/.test(next)) break`**.

**현 코드(buggy, lock 대상)**:
```js
const next = lines[j].trim()
if (isEndMarker(next) || ANY_PSALM_HEADER_RE.test(next) || ANY_CANTICLE_HEADER_RE.test(next)) break   // :396 하드가드 (유지)
if (!/^[а-яёөү]/.test(next)) break                                                                      // :397 case-gate (교체)
i = j
continue
```

**수정 계약(lock — 참조구현; Step 6 가 종결정규식만 테스트로 확정)**:
```js
const next = lines[j].trim()
if (isEndMarker(next) || ANY_PSALM_HEADER_RE.test(next) || ANY_CANTICLE_HEADER_RE.test(next)) break   // (1) 하드가드 — 무변경, 선행

// (2) GOAL #105: case-gate → completeness-gate.
// 직전 수집末(가장 최근 prayerLines 항목)의 종결성으로 판정.
const lastCollected = prayerLines.length ? prayerLines[prayerLines.length - 1].trim() : ''
const TERMINAL = /[.!?…][)”»]*\s*$/                 // C3: 명시적 종결집합(종결부호 + 후행 닫기문자). 쉼표/무종결 = 미완결.
if (TERMINAL.test(lastCollected)) {
  // 완결 + (비마커) next  → STOP + NEEDS_REVIEW (C4: silent STOP-단정 금지, 흡수 금지)
  recordNeedsReview({ here: i, next })                  // Step 6: 로그/집계 (구현 §D.3)
  break
}
// 미완결 → continuation 흡수
i = j
continue
```

**lock 포인트**:
- 종결판정은 **직전 수집末**(`prayerLines[last]`) 에 대해. (Psalm 114 末 `...Тэнгэрбурхан минь,`=쉼표→미완결→흡수. 4 STOP 末 `...үү.`/`...байна.`/`...болно.`/`...болтугай.`=종결→STOP.) mergeColumnWraps 前 raw 末 기준(merge 는 return 시점).
- `TERMINAL` 집합(lock — 모호제거): **`. ! ? …`** + 후행 닫기문자(`) ” »`)만. **명시적 비종결 = 쉼표 `,` · 콜론 `:` · 세미콜론 · 무종결**(콜론-종료 라인은 미완결로 흡수 후보 — 단 다음줄이 하드가드(end-marker/헤더)면 거기서 STOP). **`?` 는 종결**(의문문=완결 문장). **세-점 `...` 은 末 `.` 매칭으로 자동 종결**(별도 케이스 불요). "알려진 종결단어" 휴리스틱 금지.
- **corpus 실측 근거(2026-05-31, lock)**: 85 psalmPrayer 末 분포 = `.`×84 / `,`×1(시편114). `? : ; ” » )` 종료 **0건** → `?`/`:`/닫기문자는 **robustness 조항**(현 데이터 미발생). 내부 약어-마침표도 0건(§6.3b, false-terminal 미실현). 닫기문자 집합은 **좁게 유지**(ASCII `"`/곡선 단따옴표는 corpus 증거 없어 제외).
- `NEEDS_REVIEW` 는 **STOP 동작 + 플래그**(흡수 안 함 → over-extension 0, [D2] 충족). 구현은 §D.3.

---

## B. END_MARKERS 충분성 재점검 (§6.4)

**원리**: completeness-gate 는 **소문자로 시작하는 신규 섹션**을 직접 못 막는다(소문자라 흡수 후보로 통과) — 유일 방어 = `isEndMarker`/헤더 가드(C1-①, 선행). 따라서 "직전 미완결 + 다음이 marker 미등록 신규섹션" 이면 오흡수 가능.

**현 corpus 평가(lock)**: 위험 케이스 **부재**. 유일 미완결 케이스(시편 114)의 next 는 **진짜 continuation**(올바른 흡수). 4 STOP 의 next-섹션(`Амилалтын улирал:`/`Хоол хүнс өгчээ.`/`Манаач хүн...`/`(Х. Аллэлуяа!)`)은 모두 **직전이 완결**이라 completeness-gate 가 STOP → END_MARKERS 미등록이어도 무해. ∴ **[D1][D2][D3] 에 대해 현 END_MARKERS(:61-76) 로 충분 — 보강 불요(lock).**

**robustness 권고(OPTIONAL, 비차단)**: 미래 안전을 위해 季節라벨/알렐루야를 END_MARKERS 또는 NEEDS_REVIEW baseline 으로 등록 가능하나, 본 GOAL 범위 밖. Step 6 재량(필수 아님).

> 주의(비대칭): plain 경로는 `END_MARKERS`(:61-76), rich 경로는 **별도 목록 `END_OF_BLOCK_PATTERNS`**(build-psalter-prayers-rich.mjs:44~) 사용. 둘은 다른 리스트 — §C 참조.

---

## C. dual-path (rich) 계약 (C5) — **본 task 신규 실측으로 확정**

**경로**: `build-psalter-prayers-rich.mjs`(psalter-texts.json `psalmPrayer`→rich.json `psalmPrayerRich`) → `rich-builder.mjs buildProsePrayer({originalText, bookPage, maxExtraPages:4})`. buildProsePrayer 는 **PDF(pdftotext -layout 칼럼스트림)에서 독립 재구성**(`reconstructedNorm`) 후 `originalText`(=psalter-texts.json psalmPrayer) 와 **정확일치 acceptance gate**(`pass = originalNorm === reconstructedNorm`, rich-builder.mjs:88-105). pass=true 일 때만 psalmPrayerRich 갱신(:156-158).

**실측 확정(lock)**:
- 현 `scripts/out/psalter-prayers-rich-failures.md`: **실패 0 / coverage 100%** → 시편 114 는 **현재 gate PASS**. 즉 `reconstructedNorm`(rich 재구성) == `originalNorm`(현 절단 psalmPrayer). ∴ **buildProsePrayer 도 현재 시편 114 를 절단 재구성**(rich.json psalmPrayerRich 도 절단 상태와 정합).
- 절단 위치는 **`END_OF_BLOCK_PATTERNS` 오매칭 아님**(`Та ус ба` 는 어느 패턴에도 불일치) → 절단은 **continuation-페이지 읽기 경로**(`extractPdftextContinuation`:258 / `maxExtraPages` 트리거 / 칼럼스트림 page70→71)에 있음. — Step 6 진단 포인터.

**계약(lock)**:
1. extract 수정으로 `psalmPrayer`(=originalText)가 **완전**해지면, **buildProsePrayer 재구성도 완전**해야 gate PASS. 한쪽만 고치면 → divergence→FAIL→psalmPrayerRich 미갱신→**혼합출력**(json 완전/rich 절단). **이 실패경로를 반드시 차단.**
2. **완료기준(lock — fresh-run, peer lockability #2)**: stale 아티팩트 검사 금지. **(i)** 기존 `scripts/out/psalter-prayers-rich-failures.md` 무시/삭제 후 **`node scripts/build-psalter-prayers-rich.mjs` 를 새로 실행**하고, **그 실행의** stdout/재생성 리포트의 `실패: N` 라인을 파싱해 **N==0 단언**. **(ii)** AND §D.2b 의 [D1]/[D3] 완전성 machine 단언(json+rich 가 `Та ус ба Сүнсний`+`болтугай.`). 두 조건 **AND** — 양쪽 절단 유지로 "실패 0" 우회 불가(절단 유지 시 (ii) 가 FAIL).
3. **Step 6 진단·수정 지점**: `extractPdftextContinuation`(rich-builder.mjs:258, running-header 1줄 skip 후 endOfBlock 까지 읽기) + buildProsePrayer 의 `maxExtraPages` continuation 트리거(page70 에서 endOfBlock 미도달 시 page71 이어읽기). 시편 114 가 page71 body `Та ус ба...болтугай.` 를 흡수하도록.

**stale 아티팩트 경고(lock — §6.6)**: failures-file 의 `eligible=92` 는 **stale**(현 live 데이터 = refs 130 / psalmPrayer 85 / eligible(psalmPrayer+page) 82). rich 아티팩트를 현재상태로 신뢰 금지 → **재추출 후 fresh 재생성 + failures 재확인 필수**. 빌더 2회 연속 실행 byte-stable(idempotency) 단언.

---

## D. 회귀 설계 (§6.1 — 치명적) — lock

### D.1 [D2] 전수회귀 = **실제 수정 파서 직접 실행** (구 sweep 단독 금지)
- **금지**: `GOAL100-truncation-sweep.mjs` 단독. 이는 **구 L397 case-gate 복제 시뮬레이터** → 구 break-set 만 봄 → **新 completeness 가 만드는 over-absorb(구 break 밖)를 못 봄(blind-spot)**.
- **lock**: 회귀는 **수정된 `extractPsalmPrayer` 를 전 weekN(week1-4) 102 마커에 직접 실행**해 산출 단언. 구현 택1:
  - (권장) 수정 함수를 import 해 102 마커 산출 스냅샷 생성 → 기준선 diff: **시편114=완전(`болтугай.`종결, `Та ус ба Сүнсний` 포함), 나머지 101 = byte-불변.**
  - (대안) GOAL100-truncation-sweep.mjs 의 판정로직을 **新 completeness 로직으로 갱신**(구 case-gate 복제 폐기). 갱신 시 구 시뮬레이터 잔존 금지.

### D.2 NEEDS_REVIEW = 구체적 관찰가능물 (lock — peer lockability #1)
`recordNeedsReview` 는 **테스트 가능한 산출**이어야 함(추상 플래그 금지, gameable). lock 계약:
- **출력**: 결정적 JSON 배열을 `scripts/out/psalmprayer-needs-review.json` 에 기록(추출 실행마다 덮어씀). 각 entry = `{ "week": <1-4>, "line": <1-based 마커행>, "tailRaw": "<직전 수집末 raw, ≤40자>", "nextHead": "<next 의미줄 head, ≤40자>" }`.
- **동작**: NEEDS_REVIEW 는 **STOP(흡수 안 함) + entry 1건 append**. psalmPrayer 산출에는 영향 없음(STOP 과 동일).
- **고정 baseline allowlist(4 시그니처, lock)** — 현 corpus 의 사전검증 STOP. 회귀는 이 4건과 **정확히 일치**해야 하고 **그 외 신규 entry = 0**:
  | week | line | tailRaw(종결) | nextHead(다음섹션) |
  |---|---|---|---|
  | 2 | 3577 | `...Та хамгаалж өгнө үү.` | `Амилалтын улирал: Эзэн...` |
  | 3 | 644 | `...бид хүсэн хүлээж байна.` | `Хоол хүнс өгчээ.` |
  | 4 | 55 | `...мөнхийн хотод ирэх болно.` | `Манаач хүн өглөө...` |
  | 4 | 691 | `...гэрлийг харах болтугай.` | `(Х. Аллэлуяа!)` |
- **회귀 단언(machine)**: `psalmprayer-needs-review.json` 정렬 후 == 위 4 baseline(week,line 키) AND length==4. 신규 NEEDS_REVIEW(baseline 외) 발견 시 FAIL. (4 known 은 경보 아님 — allowlist.)

### D.2b 데이터 완전성 — 정확 machine 단언 (lock — peer lockability #3, prose 금지)
재생성 후 **정확 문자열 단언**(산문 묘사 금지):
- `psalter-texts.json` Psalm 114:1-8 `.psalmPrayer`: **CONTAINS** `Та ус ба Сүнсний төрөлтөөр` **AND** endsWith `шүтэх болтугай.` **AND** NOT endsWith `Тэнгэрбурхан минь,`.
- `psalter-texts.rich.json` Psalm 114:1-8 `.psalmPrayerRich`(구조체 → 평문 flatten): 동일 3단언(CONTAINS `Та ус ба Сүнсний` + endsWith `болтугай.`).
- **음성 단언**: 4 baseline 의 `nextHead`(`Амилалтын улирал:` 등 4줄)가 **어떤 psalmPrayer/psalmPrayerRich 에도 부재**.
- **delta-scope**: `git diff` 가 psalter-texts.json/rich.json **각각 Psalm 114 ref 한 곳만** 변경; 나머지 84 psalmPrayer + 비대상 psalmPrayerRich + `stanzasRich` **byte-불변**.

### D.3 검증방법 3종 (시나리오 §5 ↔ Step 4)
- **(a) 파서 단위 픽스처** (`extractPsalmPrayer` 직접): §1 시편114 흡수 / §2.1 4 STOP 미흡수 / §2.2 미완결+마커 / §6.2 multi-hop / §6.3 종결정규화.
- **(b) 전수 실행 회귀**(D.1): 진짜절단 1→0, 정상STOP 4 유지, 신규 NEEDS_REVIEW 0, 101 byte-불변.
- **(c) 재생성-후 데이터 단언**: psalmPrayer/Rich 가 `Та ус ба Сүнсний` 포함 + `болтугай.` 종결; **음성 단언** — 4 drop 줄이 양 파일(json+rich)에 부재; delta-scope(시편114 ref 외 byte-불변, `stanzasRich` 보존); build-psalter-prayers-rich 실패 0.

---

## E. target files + module boundaries + CACHE_VERSION

### E.1 target files (lock)
| 파일 | 변경 | 비고 |
|---|---|---|
| `scripts/extract-psalm-texts.js` | L397 region → completeness-gate (§A) + NEEDS_REVIEW(§D.2/3) | plain 경로 근본수정 |
| `scripts/parsers/rich-builder.mjs` | continuation 읽기(§C.3) — Step 6 진단 후 수정(시편114 PASS 까지) | rich 경로; 변경 최소 |
| `src/data/loth/psalter-texts.json` | **재생성** — Psalm 114 `psalmPrayer`(+page 유지) | delta = 1 ref |
| `src/data/loth/prayers/commons/psalter-texts.rich.json` | **재생성** — Psalm 114 `psalmPrayerRich`, `stanzasRich` 보존 | delta = 1 ref |
| `public/sw.js` | CACHE_VERSION bump (§E.3) | 번들 데이터 변경 |
| `scripts/out/psalter-prayers-rich-failures.md` | 재생성 아티팩트(실패 0 확인) | 산출물 |
| (테스트) parser 픽스처 + 전수회귀 러너 | Step 4 신규 | §D |

### E.2 module boundaries
- **plain 경로**: 라인파서(`weekN_final.txt` → `extractPsalmPrayer` → psalter-texts.json). `END_MARKERS`/`SKIP_PATTERNS` 사용.
- **rich 경로**: pdftotext 칼럼스트림(`PDF` → `buildProsePrayer` → rich.json). `END_OF_BLOCK_PATTERNS`/`SECTION_HEADING` 사용, acceptance gate 가 두 경로 결합.
- 두 경로는 **독립 추출기** — 동일 불변식(완전 추출)을 **각자** 만족해야 하며, 결합점은 build-psalter-prayers-rich 의 gate(originalText 대조).

### E.3 CACHE_VERSION 계획 (lock — 머지순서 의존)
- 현 main = `divine-office-v43`. **#90(#96/#98)이 v44 점유 중**.
- **#105 = `v45`** (가정: #90 먼저 머지→v44). **머지순서가 바뀌면 나중-머지 GOAL 이 더 높은 번호** — 리더가 머지 시점에 실제 현재값 확인 후 단일 bump(중복 v44 금지). 통합 머지 시 단일 bump 1회.

---

## F. AC traceability (lock)
| AC | spec 근거 | 검증(Step 4) |
|---|---|---|
| **[D1]** 시편114 화면 끝까지 | §A completeness-gate(흡수) + §C rich 완전 | (a)파서픽스처 + (c)데이터단언(`болтугай.`) + #112 실화면 |
| **[D2]** 무회귀(신규절단/over-absorb 0) | §A(4 STOP 종결→STOP) + §B(END_MARKERS) + §D.1 전수실행 + §D.2 baseline | (b)전수회귀 + (a)픽스처(음성) |
| **[D3]** 원문 byte 일치 | §A 흡수 텍스트 = full_pdf.txt L2244-2250 + §C rich 동치 | (c)byte 대조 단언 |

---

## G. 인용 색인
- 입력: MM `docs/design/mental-models/goal105-psalmprayer-truncation-fix.md`(#106), 시나리오 `docs/research/GOAL105-scenarios.md`(#107).
- plain 경로: `scripts/extract-psalm-texts.js:397`(case-gate), :380-399(peek 블록), :41-51(SKIP_PATTERNS), :61-76(END_MARKERS), :360-413(extractPsalmPrayer).
- rich 경로: `scripts/build-psalter-prayers-rich.mjs:37-50`(SECTION_HEADING/END_OF_BLOCK_PATTERNS), :135-182(gate), `scripts/parsers/rich-builder.mjs:88-105`(acceptance gate), :258-285(extractPdftextContinuation), :374+(buildProsePrayer/maxExtraPages).
- 실측: `scripts/out/psalter-prayers-rich-failures.md`(eligible=92 **stale**; 실패 0 → 시편114 현 PASS=절단정합), live 데이터 refs130/psalmPrayer85/eligible82.
- 절단 데이터: `src/data/loth/psalter-texts.json:236`(末 `минь,`), `prayers/commons/psalter-texts.rich.json:3011`.
- 소스: `parsed_data/full_pdf.txt:2234-2251`(누락 후반 L2244-2250, 종결 `болтугай.`).
- 회귀: `docs/research/GOAL100-truncation-sweep.mjs`(구 case-gate 복제 — **단독 금지**, §D.1).
- peer: codex research_methodologist — 설계검증 `ex_20260531T010212Z_f214b978`(#106) + completeness `ex_20260531T011522Z_d3c66c1a`(#107).
