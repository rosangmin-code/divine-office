# GOAL #90 Step2 — 시나리오 도출 (성모 Benedictus 후렴 드롭다운 + 안내 루브릭)

- **작성**: dvo-plan-cl (research/planner, task #92 / `[#90-sub-2]`)
- **일자**: 2026-05-30
- **선행**: #91 `docs/research/GOAL90-marian-antiphon-source.md` (MM 정의 + Benedictus 6옵션 원문 확보 + Magnificat 부재 확정)
- **범위**: ACs(D1-D4)에서 happy/fail/edge 시나리오 도출 + AC 매핑. **코드/데이터 수정 없음**(시나리오 도출만). 실제 스키마/렌더러 변경은 #93(spec lock) → #96(develop).
- **peer**: codex 제공자 호출 결과는 §6 기록(가능 시 적대적 교차검증, 실패 시 DEGRADED MODE). 모든 시나리오는 소스 file:line 직접 인용으로 독립 검증 가능.

---

## 1. 사용자 결정(FU) 요약 — 이 시나리오들이 커버하는 동작

토요일 성모 기념(`saturday-mary`) **아침기도(Lauds)**에:
1. Benedictus(`Захариагийн магтаал`) 후렴을 **평일(ferial)과 다른 성모 고유 후렴**으로 표시.
2. breviary 6개 후렴(p863-864) 중 **드롭다운으로 택1**, **기본값=옵션1**.
3. 그 위/옆에 **안내 루브릭**("다음 후렴 중 하나를 고르십시오" 류) 표시.
4. **Magnificat(Vespers)은 드롭** — 전례상 토요일 성모 기념은 Lauds 전용이고, 토요일 저녁기도는 항상 다음 주일 제1저녁기도로 렌더(#91 §3.2, task #89 실증). authentic 원문도 부재.

---

## 2. 코드/데이터 현황 — 시나리오의 grounding (읽기 전용 확인)

| 항목 | 현황 | file:line |
|---|---|---|
| Lauds Benedictus 렌더 | `resolveGospelCanticle('lauds', …, mergedPropers.gospelCanticleAntiphon, …)` → **단일 antiphon 문자열** | `src/lib/hours/lauds.ts:66-74` |
| `gospelCanticle` 섹션 타입 | `antiphon: string` 단일. **`candidates`/`selectedIndex`/`rubric` 필드 없음** | `src/lib/types.ts:855-903` |
| 드롭다운 선례 ① hymn | `candidates?: HymnCandidate[]; selectedIndex?: number` | `src/lib/types.ts:851` |
| 드롭다운 선례 ② invitatory | `candidates?…; selectedIndex?; rubric?: string` | `src/lib/types.ts:843-847` |
| 드롭다운 선례 ③ marianAntiphon | `candidates?: MarianAntiphonCandidate[]; selectedIndex?: number` | `src/lib/types.ts:921` |
| resolver | `resolveGospelCanticle(...)` 가 단일 `antiphon` 받음 — candidates 미지원 | `src/lib/hours/resolvers/canticle.ts:20-89` |
| saturday-mary 데이터 | `lauds:{concludingPrayer, …}` 만. **`gospelCanticleAntiphon`(후렴) 없음** → 현재 평일과 동일 | `src/data/loth/sanctoral/memorials.json:88-100` |
| saturday-mary `vespers.concludingPrayer` | 존재하나 **렌더 안 됨**(토요일 vespers=주일 제1저녁기도) = dead data | `memorials.json:96-99` |
| ferial Benedictus 후렴(대조 기준) | `"Эзэн минь, Та биднийг амар амгалангийн зам мөрөөр хөтөлнө үү"` (task #89 확인) | #91 §1 |
| 6개 성모 후렴 원문 | propers_final.txt **L9856-9882**, book p863-864 | #91 §3.1 |
| 안내 루브릭 원문 | `"Дараах шад магтаалуудын дундаас аль нэгийг сонгож болно:"` propers_final.txt **L9854** | #91 §3.1 |

> **핵심 함의**: 드롭다운(D2) + 6옵션 저장 + 루브릭(D3)은 `gospelCanticle` 섹션에 `candidates`/`selectedIndex`/`rubric` 추가가 **필수** → 스키마+resolver+렌더러+데이터 변경. **#93에서 lock**. 아래 시나리오가 그 UI 동작을 커버한다. hymn/invitatory/marianAntiphon 의 candidates 패턴을 차용하면 일관성·clamp 거동을 재사용할 수 있다(#93 확인 대상).

---

## 3. 시나리오 — AC별 happy / fail·edge

표기: **H**=happy, **E**=fail/edge. 각 행 끝 `→ ACx` 는 검증 대상 AC.

### [D1] 성모 선택 시 Benedictus 후렴이 평일과 다르게 렌더 + 기본값=옵션1

| ID | 유형 | 시나리오 | 기대 결과 |
|---|---|---|---|
| **D1-H1** | happy | 연중 토요일, 사용자가 성모 선택 기념(`saturday-mary`) 채택 → Lauds 진입 | Benedictus 후렴 = **옵션1 원문**(propers_final.txt L9856-9864). `selectedIndex` 미지정 → **default=0(옵션1)** → D1 |
| **D1-H2** | happy | 같은 날 평일 ferial 후렴과 비교 | 렌더 후렴 ≠ ferial(`"Эзэн минь, Та биднийг…"`) — **텍스트 byte 불일치** → D1 |
| **D1-E1** | edge(RED) | #96 develop 전, memorials.json 에 후렴 candidates 미주입 상태 | 후렴이 평일과 **동일**(현재 상태) — 이게 RED 기준선(#95). 데이터 주입 후 GREEN → D1 |
| **D1-E2** | fail | 평일(월~금, 또는 성모 미채택 토요일) Lauds | **ferial Benedictus 유지**, 성모 후렴/드롭다운/루브릭 **미표시** → D1 |
| **D1-E3** | edge | 연중 토요일이지만 선택 기념을 **채택 안 함**(ferial 우선) | 성모 후렴 **미적용**(D1-E2 와 동일 경로) → D1 |
| **D1-E4** | fail | **달력 충돌** — 토요일에 상위 등급(주일/대축일/축일/의무기념 등)이 saturday-mary(OPTIONAL_MEMORIAL)를 override | 성모 Benedictus 드롭다운·루브릭 **미렌더**(상위 등급 propers 우선). saturday-mary 는 연중 평일 토요일에서만 활성 → D1 *(peer-added)* |

### [D2] 6개 후렴 드롭다운 선택 → 해당 후렴으로 교체

| ID | 유형 | 시나리오 | 기대 결과 |
|---|---|---|---|
| **D2-H1** | happy | 드롭다운 열어 **옵션2** 선택 | 후렴이 옵션2 원문(L9865-9867)으로 **교체**, `selectedIndex=1` → D2 |
| **D2-H2** | happy | 옵션3·4·5·6 각각 선택 | 해당 인덱스 원문(L9868·9872·9876·9880)으로 교체 — **6개 모두 candidates 에 보존** → D2 |
| **D2-H3** | happy | 옵션N 선택 후 재진입(같은 날) | 마지막 선택 **유지**(hymn/marianAntiphon candidates 의 selectedIndex 저장 패턴 차용; 저장 범위·키 정책은 #93 lock) → D2 |
| **D2-E1** | edge | 드롭다운 **미선택**(초기 진입) | `selectedIndex` 기본=0 → **옵션1 유지**(D1-H1 과 일관) → D2 |
| **D2-E2** | fail | **잘못된 index**(범위 밖: 6, 7, 음수) | **안전 clamp → default(0)**, 크래시·빈 후렴 없음(기존 candidates clamp 거동 #93 확인) → D2 |
| **D2-E3** | edge | candidates 길이=6 인데 손상된 `selectedIndex`(NaN/문자열) | 0 으로 안전 fallback → D2 |
| **D2-E4** | fail | 평일 Lauds | candidates 없음 → **단일 antiphon 경로**, 드롭다운 자체 미렌더(D1-E2 결합) → D2 |
| **D2-E5** | edge | **날짜 간 영속성 누수** — A 토요일에 옵션3 선택 후 B 토요일(또는 평일) 진입 | 다른 날짜로 **잘못 carry-over 되지 않음**. 저장 키 범위(날짜별 vs 전역 preference)는 #93 의도적 정의 — 의도와 다르면 FAIL → D2 *(peer-added)* |
| **D2-E6** | fail | **손상/부분 candidate 데이터** — candidates 개수≠6, 옵션 중복, 옵션 텍스트 누락/빈 문자열 | 명시적 실패(빈 후렴 노출 금지) 또는 **안전 fallback**(default 0). 정확히 6개·중복 0 은 데이터 무결성 검증 대상(#94/#96) → D2, D4 *(peer-added)* |

### [D3] 안내 루브릭 표시

| ID | 유형 | 시나리오 | 기대 결과 |
|---|---|---|---|
| **D3-H1** | happy | saturday-mary Lauds Benedictus 섹션 | 드롭다운 위/옆에 **안내 루브릭** 표시(빨간 지시문, rubric role=`instruction`) → D3 |
| **D3-H2** | happy | 루브릭 텍스트 정확성 | = breviary L9854 원문 `"Дараах шад магтаалуудын дундаас аль нэгийг сонгож болно:"` (authentic 몽골어) → D3, D4 |
| **D3-E1** | fail | 평일(non-marian) Lauds | 드롭다운 없음 → **루브릭도 미표시** → D3 |
| **D3-E2** | edge | 루브릭 vs 후렴 분리 | 루브릭이 **antiphon 자리(후렴 본문)로 들어가지 않음** — 별도 `rubric` 필드/스팬으로 분리 렌더 → D3 |
| **D3-E3** | edge | 루브릭↔드롭다운 동반 | 루브릭만 뜨고 드롭다운/후렴 누락되는 조합 **없음**(항상 함께) → D3 |
| **D3-E4** | edge | **접근성(a11y)** — 드롭다운/루브릭 | 드롭다운에 **몽골어 accessible name/role**(`combobox`), 키보드 조작·포커스 순서, 루브릭↔드롭다운 연결(`aria-describedby` 류). aria-label 도 **몽골어 키릴, 영어 fallback 없음**(NFR-002) → D3, D4 *(peer-added)* |

### [D4] 모든 후렴 = breviary p863-864 원문 일치 authentic 몽골어(맞춤법 NFR-002)

| ID | 유형 | 시나리오 | 기대 결과 |
|---|---|---|---|
| **D4-H1** | happy | 6개 candidates 각 텍스트 대조 | 각각 propers_final.txt **L9856-9882 verbatim(byte 일치)** — #91 §3.1 원문 기준 → D4 |
| **D4-H2** | happy | 몽골어 키릴 맞춤법 | NFR-002 + CLAUDE.md 빈출 오타(`Гүйлтын`→`Гуйлтын`, `Зургадугаар`→`Зургаадугаар` 등) 패턴 **없음** 확인 → D4 |
| **D4-E1** | fail | 영어 fallback | 후렴/루브릭/`aria-label` 전부 **몽골어 키릴**, 영어 혼입 **0**(NFR-002) → D4 |
| **D4-E2** | fail | 기계번역/추측 텍스트 | **0** — 모든 텍스트는 breviary SoT 직접 인용(#91 §3.1) → D4 |
| **D4-E3** | edge | page 매핑 | 후렴 page = p863-864(→/pdf 432-433). page 필드 정책은 #93 lock(antiphon page vs bodyPage 구분, `types.ts:862-872`) → D4 |

---

## 4. Cross-cutting / non-goal edge (범위 경계 명시)

| ID | 시나리오 | 처리 |
|---|---|---|
| **X-E1** | **Vespers Magnificat 미적용** | (A)안 확정 — 성모 Magnificat 데이터 **추가 안 함**. 토요일 vespers 는 항상 주일 제1저녁기도(#91 §3.2, task #89). 기존 `saturday-mary.vespers.concludingPrayer` 는 이미 렌더 안 되는 dead data(이번 범위 외, 별도 정리 대상 아님) |
| **X-E2** | Compline/기타 시간경 | 무관 — Benedictus 는 **Lauds 전용**(`resolveGospelCanticle` hour 분기, `canticle.ts:39-42`) |
| **X-E3** | 스키마/렌더러 변경 필요 | `gospelCanticle` 섹션에 `candidates`/`selectedIndex`/`rubric` 추가 — hymn/invitatory/marianAntiphon 패턴 차용. **#93 spec lock**, 시나리오 D2·D3 가 동작 커버 |
| **X-E4** | **SW 캐시 검증** | 새 라우트·Content-Type 변경 **없음**(기존 `/lauds` 렌더 내부 데이터/UI). 단 데이터·렌더러 변경 → 배포 후 **구 캐시 번들이 ferial 후렴/구 스키마를 계속 서빙하지 않음** 을 검증해야 함. `CACHE_VERSION` bump 필요(CLAUDE.md SW 정책) — **#96 develop + 수동 실기기 체크리스트**(Playwright 미재현, A2HS/iOS Safari 구 HTML) *(peer-added: 명시 검증으로 격상)* |

---

## 5. #93/#94 인계 노트 (시나리오 → spec·test)

- **#93 spec lock 결정사항**: (a) `gospelCanticle` 섹션 candidates/selectedIndex/rubric 필드 명세, (b) selectedIndex 저장 범위·키(세션/날짜/전역), (c) clamp 거동(범위 밖 index → 0), (d) 루브릭 렌더 위치·role, (e) page 필드 정책.
- **#94 test selector 축 분리(CLAUDE.md 규약)**:
  - **기능 검증**(D1·D2·D3: 후렴 교체·드롭다운·루브릭 존재) → `data-role`/`data-testid`/`getByRole('combobox')` 등 — 로케일 비결합.
  - **몽골어 문구 정확성**(D4, D3-H2: 후렴/루브릭 원문 일치) → `getByText('…키릴…')` 의도적 텍스트 결합.
- **RED 기준선(#95)**: D1-E1 = 후렴 미주입 상태에서 "성모 후렴이 평일과 다름" 테스트가 **FAIL**(현재 평일과 동일). #96 데이터+렌더러 주입 후 GREEN.
- **default=옵션1 불변식**: D1-H1 = D2-E1 (미선택=옵션1) — 한 불변식이 두 AC 를 가로지름. 테스트는 default 경로를 단일 케이스로 묶고 옵션2-6 교체를 별도 케이스로.

---

## 6. peer 적대검증 / 한계

- **peer**(codex, role=`research_methodologist`, exchange `ex_20260530T120348Z_4c4124af`): **APPROVED_WITH_ISSUES**, confidence HIGH, **모순(contradiction) 0건**, D1-E1 RED 기준선 **타당 확인**.
- peer 지적 누락 5건 → **전부 반영**: D1-E4(달력 충돌 suppress), D2-E5(날짜 간 영속성 누수), D2-E6(손상/부분 candidate 데이터), D3-E4(접근성 a11y + 영어 fallback 없음), X-E4(SW 캐시 명시 검증으로 격상). 표에 `*(peer-added)*` 표기.
- DEGRADED MODE 아님(peer 정상 응답). 단 모든 시나리오는 §2 file:line 직접 인용으로 리뷰어 독립 검증 가능 — 증거 강도 유지.
- 본 step 은 시나리오 도출만(코드/데이터 미수정). 스키마 명세=#93, 데이터·렌더러 구현=#96, 테스트 작성=#94.
