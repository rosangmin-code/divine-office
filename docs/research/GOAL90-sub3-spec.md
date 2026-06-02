# GOAL #90 Step3 — Spec/Design Lock (성모 Benedictus 후렴 드롭다운 + 안내 루브릭)

- **작성**: dvo-plan-cl (research/planner, task #93 / `[#90-sub-3]`)
- **일자**: 2026-05-30
- **선행**: #91 `GOAL90-marian-antiphon-source.md`(원문/MM) + #92 `GOAL90-sub2-scenarios.md`(시나리오/코드 grounding, 동일 작성자)
- **목적**: 설계 표면을 **단일 reviewable spec으로 lock** — 재설계 아님, target files/interfaces/contracts 확정. **코드/데이터 수정 없음**(#94 test 작성 → #96 develop이 구현).
- **peer**: §9 기록.

---

## 0. Scope / Non-goals

| | |
|---|---|
| **In** | saturday-mary **Lauds Benedictus** 후렴을 6옵션 드롭다운(default=옵션1)+안내 루브릭으로. 스키마(`gospelCanticle` 섹션 + `HourPropers`)·resolver·assembler·렌더러·데이터(memorials.json)·Zod schema·CACHE_VERSION 변경 표면. |
| **Out** | Magnificat/Vespers(A안 드롭 — §8). 시편후렴/짧은독서/응송/지향(2안). compline/기타 시간경. 후렴 **영속(cross-visit) 저장**(§3 — ephemeral 채택, 변경 시 사용자 확인 flag). |

**설계 원칙**: 기존 candidates 선례 3개(hymn/invitatory/marianAntiphon) **차용** — 신규 메커니즘 최소화. Gate-β 복잡도는 선례 재사용으로 단일 사이클 유지(§10).

---

## 1. [결정 1] `gospelCanticle` 섹션 + `HourPropers` 스키마

**선례 차용**: hymn(`types.ts:851`), invitatory(`843-848`), marianAntiphon(`921`) 의 `candidates`/`selectedIndex`(+invitatory `rubric`) 패턴.

### 1a. `HourSection` `gospelCanticle` variant (`src/lib/types.ts:855-903`)
추가 필드(전부 optional — additive, regression-safe):
```ts
| {
    type: 'gospelCanticle'
    canticle: 'benedictus' | 'magnificat' | 'nuncDimittis'
    antiphon: string                       // 기존: default 후렴(=candidates[selectedIndex].text)
    // ── 신규 ──
    candidates?: GospelCanticleAntiphonCandidate[]   // 후렴 택1 옵션 배열
    selectedIndex?: number                 // default 선택 인덱스(서버 주입; saturday-mary=0)
    rubric?: string                        // 안내 루브릭(별도 필드 — §4)
    // 기존 유지: text, verses, page, bodyPage, antiphonRich, paragraphBoundaries
  }
```
신규 타입(hymn `HymnCandidate` 패턴):
```ts
export interface GospelCanticleAntiphonCandidate {
  text: string
  page?: number            // 후렴별 seasonal antiphon page (p863 또는 864)
  textRich?: PrayerText    // optional rich overlay (§4 — default 옵션만 적용)
}
```

### 1b. `HourPropers` (`src/lib/types.ts` ~327-351, `gospelCanticleAntiphon*` 인접)
```ts
gospelCanticleAntiphon?: string                  // 기존(default 후렴 평문)
gospelCanticleAntiphonPage?: number              // 기존
gospelCanticleAntiphonRich?: PrayerText          // 기존
// ── 신규 ──
gospelCanticleAntiphonCandidates?: GospelCanticleAntiphonCandidate[]
gospelCanticleAntiphonSelectedIndex?: number     // default index(데이터 주입; 부재→0)
gospelCanticleAntiphonRubric?: string
```

**contract**: candidates 부재 → 기존 단일 antiphon 경로 그대로(레거시 무변경). candidates 존재 → 드롭다운 렌더(§4).

---

## 2. [결정 1·resolver] `resolveGospelCanticle` (`src/lib/hours/resolvers/canticle.ts:20-89`)

시그니처 확장(말미 optional 인자 — 기존 호출부 무변경):
```ts
export function resolveGospelCanticle(
  hour, canticlesData, antiphon, page?, antiphonRich?,
  candidates?: GospelCanticleAntiphonCandidate[],   // 신규
  selectedIndex?: number,                           // 신규
  rubric?: string,                                  // 신규
): HourSection | null
```
- 반환 `gospelCanticle` 섹션에 `candidates`/`selectedIndex`/`rubric` 그대로 passthrough(`antiphonRich`/`paragraphBoundaries`와 동일 passthrough 컨벤션).
- `antiphon`(기존 default 평문)은 `candidates?.[selectedIndex]?.text ?? antiphon` 로 일관 — 렌더러 fallback과 정합.

**assembler** `src/lib/hours/lauds.ts:66-74`: `resolveGospelCanticle(... , ctx.mergedPropers.gospelCanticleAntiphonCandidates, ctx.mergedPropers.gospelCanticleAntiphonSelectedIndex ?? 0, ctx.mergedPropers.gospelCanticleAntiphonRubric)` 추가. vespers.ts/compline.ts 는 candidates 미전달 → 무변경(Benedictus 전용).

**merge** `src/lib/loth-service.ts` Layer3 sanctoral(L644~): `sanctoral.lauds`(=saturday-mary.lauds)의 신규 3필드를 `mergedPropers`로 복사(기존 `gospelCanticleAntiphon` 복사 패턴 미러). `applySeasonalAntiphon`(L718)은 candidates 비대상(saturday-mary는 seasonal 변형 없음) — candidates 경로는 seasonal 후처리 skip 명시.

**[peer-corrected] conditional-rubric-resolver** `src/lib/hours/conditional-rubric-resolver.ts`: gospelCanticle 대상 `skip`/`substitute` 루브릭 경로가 `gospelCanticleAntiphon`을 치환/제거할 때 **신규 `gospelCanticleAntiphonCandidates`/`gospelCanticleAntiphonSelectedIndex`/`gospelCanticleAntiphonRubric`도 함께 clear/replace** 해야 함(아니면 후렴은 치환됐는데 구 candidates/rubric가 남아 불일치). saturday-mary는 conditional rubric 비대상일 가능성이 높으나, 필드 정합성 위해 #96에서 동반 처리 lock.

---

## 3. [결정 2] selectedIndex 영속성 정책 ★사용자 확인 항목

**조사 결과(코드 근거)**: 기존 candidates 선례의 선택 상태는 **순수 ephemeral React state**.
- 서버: `selectedIndex` = **결정적 default**만 산출(hymn=`computeRotationIndex` `propers-loader.ts:533`; saturday-mary=고정 0).
- UI: `const [selectedIdx,setSelectedIdx]=useState(section.selectedIndex ?? 0)` (`hymn-section.tsx:15`, `marian-antiphon-section.tsx:62`). 사용자 선택은 `setSelectedIdx(i)` (`hymn-section.tsx:89`, `marian-antiphon-section.tsx:137`)로 **React state만** 갱신 — **localStorage/settings/useEffect 영속 전무**. 리마운트·네비게이션·리로드 시 default로 리셋.

**lock 결정 (권장)**: **ephemeral 채택**(hymn/marianAntiphon와 동일). settings 백킹 **아님**.
- **근거**: (a) 기존 후렴-택1 UI 3건과 일관, (b) 신규 영속 메커니즘 0 → 복잡도·리스크 최소.
- **default**: 항상 옵션1(index 0). 데이터의 `gospelCanticleAntiphonSelectedIndex` 부재 시 렌더러 `?? 0`.

⚠️ **[peer-corrected] ephemeral ≠ D2-E5 자동 방지** — 검증 결과 반증됨: `prayer-renderer.tsx:56`이 섹션을 **배열 index로 키잉**(`key={i}`)한다. 날짜 이동은 `/pray/[date]/[hour]` 라우트 간 `<Link>` 클라이언트 네비게이션(`page.tsx:86,128`)이므로, 트리 동일 위치+동일 key의 `GospelCanticleSection` 인스턴스가 **재사용**되어 `useState(selectedIdx)`가 **새 날짜로 보존**될 수 있다(= D2-E5 누수). `useState`는 mount 시 1회만 prop을 읽으므로 날짜가 바뀌어도 자동 리셋되지 않는다. (기존 hymn/marianAntiphon도 동일 잠재 거동 — 본 WI는 gospelCanticle로 범위 한정하되 리더에게 관찰 사실로 보고.)

**리셋 메커니즘 lock (D2-E5 충족 — 명시 필수)**: selectedIdx는 **렌더 대상 날짜/시간경이 바뀌면 반드시 default(옵션1)로 리셋**(cross-date carry-over 금지). #96 구현 = 둘 중 택1(권장①):
- ① (권장) `prayer-renderer.tsx`에서 gospelCanticle 섹션 element에 **날짜-안정 key** 부여: `key={`gc-${assembled.date}-${assembled.hourType}-${i}`}` → 날짜 변경 시 remount → useState가 `section.selectedIndex ?? 0`로 재초기화. (전 섹션 통일 적용도 가능하나 fadeIn 애니 재실행 영향 검토 — 범위 한정 시 gospelCanticle만.)
- ② GospelCanticleSection 내부에서 candidate-set 시그니처(첫 candidate 텍스트/날짜) prop 변화 시 `setSelectedIdx(section.selectedIndex ?? 0)` 리셋(React "reset via key" 또는 동등 가드).

**[peer-corrected] D2-H3 ↔ D2-E5 충돌 해소**: "재진입" 의미 분리 —
- **D2-H3(유지)** = **동일 mount 내** 드롭다운 옵션 전환 후 그 화면에서 유지(React state). "같은 날 재진입=route revisit/remount/reload"는 **유지 대상 아님**.
- **D2-E5(리셋)** = 날짜 변경/remount/reload → default 복귀.
- #94 테스트는 두 케이스를 **분리**: (a) in-mounted 옵션 교체 지속 / (b) 날짜이동·리로드 시 default 리셋.

★ **사용자 확인 필요(flag, 유일 human decision)**: "사용자가 고른 후렴이 **다음 방문/날짜에도 유지**되길 원하는가?" — YES(진짜 취향 영속)면 ephemeral이 아닌 신규 settings 백킹 필요(별도 WI, 범위 확장). **권장=NO(ephemeral+날짜리셋)**, 기존 UX 일관. 리더가 사용자 확인.

---

## 4. [결정 3·4] clamp + 루브릭 렌더

### 4a. clamp(범위 밖 index → 옵션1)
- 렌더러 fallback 이미 내장: `candidates?.[selectedIdx] ?? section.text/antiphon` (`hymn-section.tsx:19-20`) — OOR/NaN index → undefined → default 평문 fallback(크래시·빈 후렴 없음, D2-E2/E3 충족).
- **명시 lock**: gospel-canticle-section은 `const safeIdx = Number.isInteger(selectedIdx) && selectedIdx>=0 && selectedIdx<candidates.length ? selectedIdx : 0` 로 **0 clamp** 후 사용(fallback 의존이 아닌 명시적 — 옵션1 표시 보장).
- **[peer-corrected] safeIdx 일관 사용 필수**: 표시 텍스트, `page`(AntiphonBox), 선택 스타일링, **`aria-selected`**, antiphonRich 적용 자격 — **전부 동일 `safeIdx`** 로 계산(서로 다른 index 혼용 금지). 한 군데라도 raw `selectedIdx`를 쓰면 OOR 시 불일치.
- **resolver `?? 0`**: `resolveGospelCanticle`는 candidates 존재 시 `selectedIndex` 부재/undefined → **`?? 0`** 으로 섹션에 0 주입(렌더러와 이중 가드).

### 4b. 루브릭(후렴 본문과 분리, role=instruction)
- **별도 `section.rubric` 필드**(§1) — antiphon 텍스트에 **혼입 금지**(D3-E2). 드롭다운과 **동반 렌더**(루브릭 단독/드롭다운 단독 금지, D3-E3).
- 렌더: `gospel-canticle-section.tsx`에서 드롭다운 위에 빨강 지시문(`text-liturgical-red`, role=instruction 의미). 평일(candidates 부재)엔 미렌더(D3-E1).
- **원문**: `propers_final.txt:L9854` = `Дараах шад магтаалуудын дундаас аль нэгийг сонгож болно:` (authentic, #91 §3.1).

### 4c. 렌더러 변경(`src/components/prayer-sections/gospel-canticle-section.tsx:168-260`)
- 현재 `renderAntiphon`(AntiphonBox/AntiphonRichBox) 단일 → **candidates 존재 시** hymn-section 패턴(useState `selectedIdx`, 메뉴 toggle, 항목 선택 `setSelectedIdx`)으로 드롭다운+루브릭 렌더; **부재 시 기존 경로**(레거시 무변경).
- rich overlay는 **default 옵션(safeIdx==section.selectedIndex)만** 적용, 타 옵션은 평문(`hymn-section.tsx:25-28` 컨벤션 차용).
- **[peer-corrected] 렌더 게이트 보정**: 현재 `shouldRender = !!section.antiphon || hasRich` (`:188`). candidates 경로에서는 **candidates 존재 시 무조건 렌더**(default 평문 동기화는 §6에서 보장하나, 데이터 누락으로 `antiphon`이 빈 경우에도 candidates가 있으면 드롭다운/후렴이 떠야 함) → 게이트를 `!!section.antiphon || hasRich || (section.candidates?.length ?? 0) > 0` 으로 확장.
- **[peer-corrected] 안정 test hook**: 드롭다운/루브릭에 색상-독립 `data-role` anchor 노출 — `data-role="canticle-antiphon-dropdown"`, `data-role="canticle-antiphon-rubric"`, 선택 트리거 `role="combobox"`/`aria-selected`(CLAUDE.md data-role 우선 + #94 selector 안정성).

---

## 5. [결정 5] page 필드 정책

- `gospelCanticle.page` = **seasonal 후렴 page**(=선택 candidate의 page, p863 또는 864) → AntiphonBox에 표시. `gospelCanticle.bodyPage` = **고정 Benedictus 본문 page(p34)** → 헤딩 PageRef(기존 `types.ts:862-872` 정책 유지, task #11).
- 각 candidate `page` 보유(옵션별 p863/864). 렌더러 AntiphonBox `page`는 `candidates[safeIdx].page ?? section.page`.
- **#96 검증**: 옵션별 정확 page(863 vs 864)는 PDF 인쇄면 대조(`bookPageToPdfPage(863)=432`, `(864)=433`) — #92 §6. NFR-009 계열 page verifier 영향은 sanctoral 대상(`scripts/verify-sanctoral-pages.js`) 확인.

---

## 6. [결정 6] 데이터 형태 (`src/data/loth/sanctoral/memorials.json` saturday-mary.lauds)

기존 `lauds:{concludingPrayer, concludingPrayerPage:865}` 에 **추가**(L9856-9882 verbatim, 6개):
```jsonc
"lauds": {
  "gospelCanticleAntiphonCandidates": [
    { "text": "<옵션1 L9856-9864 verbatim>", "page": 863 },
    { "text": "<옵션2 L9865-9867>", "page": 863 },
    { "text": "<옵션3 L9868-9871>", "page": 863 },
    { "text": "<옵션4 L9872-9875>", "page": 864 },
    { "text": "<옵션5 L9876-9879>", "page": 864 },
    { "text": "<옵션6 L9880-9882>", "page": 864 }
  ],
  "gospelCanticleAntiphonSelectedIndex": 0,
  "gospelCanticleAntiphonRubric": "Дараах шад магтаалуудын дундаас аль нэгийг сонгож болно:",
  "gospelCanticleAntiphon": "<옵션1 텍스트 — default 평문 동기화>",
  "gospelCanticleAntiphonPage": 863,
  "concludingPrayer": "…(기존 유지)…",
  "concludingPrayerPage": 865
}
```
- **Zod schema** `src/lib/schemas.ts`: `HourPropers`/sanctoral entry 스키마에 신규 3필드(optional) 추가. **[peer-corrected]** 기존 Zod가 loose(unknown key 통과)면 parse 실패 회피용으로 추가가 필수는 아니나, **데이터 무결성 어서션은 별도 필요**: candidates = **정확히 6개, 텍스트 비어있지 않음, 중복 0, page 커버리지(863/864) 충족**(D2-E6, D4-H1). #94 테스트 또는 page verifier(`scripts/verify-sanctoral-pages.js` 확장)로 검증 — #96 target.
- 옵션별 정확 텍스트는 #96이 `propers_final.txt` L9856-9882에서 직접 복사(기계번역 0, #91 §3.1 원문 = SoT).

---

## 7. [결정 7] CACHE_VERSION bump 계획

- 변경 성격: 데이터(memorials.json)+렌더러(JS 번들) 변경. 새 라우트·Content-Type 변경 **없음**(`/lauds` 내부).
- **#96 필수**: `public/sw.js` `CACHE_VERSION` `divine-office-vN` → `v(N+1)` bump(현재 v43, b627ca8 기준 → v44). 누락 시 구 번들 `cache-first` 무한 서빙(CLAUDE.md SW 정책).
- **수동 체크리스트**(Playwright 미재현): iOS Safari 구 HTML 캐시 / A2HS PWA 업그레이드 — CLAUDE.md "테스트가 못 잡는 것들".

---

## 8. Magnificat/Vespers 드롭 (A안 lock)

- 성모 Magnificat 후렴 데이터 **추가 안 함**. 토요일 vespers는 항상 다음 주일 제1저녁기도(#91 §3.2, task #89 실증) → 성모 후렴 렌더 기회 영구 부재. authentic 원문도 부재(추측 금지).
- 기존 `memorials.json saturday-mary.vespers.concludingPrayer`(L96-99)는 이미 렌더 안 되는 dead data — **이번 범위에서 건드리지 않음**(별도 정리 비대상).

---

## 9. Target file change map (#96 develop 인계)

| 파일 | 변경 | 결정 |
|---|---|---|
| `src/lib/types.ts:855-903, ~327-351` | `gospelCanticle` 섹션 + `HourPropers` 신규 3필드 + `GospelCanticleAntiphonCandidate` 타입 | 1 |
| `src/lib/hours/resolvers/canticle.ts:20-89` | resolver 시그니처 +3 optional 인자, passthrough | 1·2 |
| `src/lib/hours/lauds.ts:66-74` | assembler가 candidates/selectedIndex/rubric 전달 | 2 |
| `src/lib/loth-service.ts:644~` | sanctoral Layer3 merge에 신규 3필드 복사 | 2 |
| `src/components/prayer-sections/gospel-canticle-section.tsx:168-260` | 드롭다운+루브릭 렌더(hymn-section 패턴) + safeIdx 0 clamp + 렌더 게이트 확장 + data-role hook | 3·4 |
| `src/components/prayer-renderer.tsx:54-79` | **[peer-added]** gospelCanticle 섹션 날짜-안정 key(D2-E5 리셋, §3 메커니즘①) | 3 |
| `src/lib/hours/conditional-rubric-resolver.ts` | **[peer-added]** gospelCanticle skip/substitute에 신규 3필드 동반 clear/replace | 1·4 |
| `src/data/loth/sanctoral/memorials.json:88-100` | saturday-mary.lauds 6 candidates+rubric+default | 6 |
| `src/lib/schemas.ts` | Zod: 신규 3필드 optional + 무결성(정확히 6·비공백·중복0·page) 어서션 경로 | 1·6 |
| `public/sw.js` | CACHE_VERSION v43→v44 | 7 |

**#94 test hook**: 기능 검증(D1·D2·D3) → `data-role` anchor 신설(`canticle-antiphon-dropdown`, `canticle-antiphon-rubric`)/`getByRole('combobox')`/`aria-selected`; 몽골어 문구(D4·D3-H2) → `getByText('<키릴 원문>')` (CLAUDE.md selector 축 분리). **[peer-corrected] D2-H3 vs D2-E5 분리 테스트**: (a) 동일 mount 내 옵션 교체 지속 / (b) 날짜이동·리로드 시 default(옵션1) 리셋 — 두 케이스를 별개 test로(같은-날 영속을 기대하지 말 것).

---

## 10. Gate-β 인계 노트 (리더 판정용)

- **복잡도**: 범위가 스키마+resolver+assembler+merge+렌더러+데이터+schema+sw 8파일로 상승. 단 **전부 기존 선례(hymn/invitatory/marianAntiphon candidates) 차용** — 신규 알고리즘/메커니즘 0(영속성도 ephemeral 재사용). 단일 develop 사이클(#96) 유지 가능 평가.
- **사용자 확인 필요(1건)**: §3 영속성 — ephemeral(권장) vs cross-visit 저장. 권장 채택 시 추가 WI 불필요. 저장 원하면 범위 확장(별도 WI).
- **잔여 검증(→#96)**: Zod strict 여부, 옵션별 정확 page(863/864), sanctoral page verifier 영향.

---

## 11. peer 적대검증 / 한계

- **peer**(codex, role=`research_methodologist`, exchange `ex_20260530T121514Z_b5890af7`): **APPROVED_WITH_ISSUES** — 핵심 lock(ephemeral·additive schema·clamp·rubric 분리) 타당 확인, 단 5건 보정 지적. extra_user_decisions=0(영속성 flag가 유일 human decision 확인).
- **반영 5건**(전부 `[peer-corrected]`/`[peer-added]` 표기):
  1. §3 **D2-E5 과대주장 교정** — `prayer-renderer.tsx:56` index 키잉으로 cross-date 누수 가능 → 코드 검증 완료 후 **날짜-안정 key 리셋 메커니즘 lock**(target map +`prayer-renderer.tsx`).
  2. §3·§9 **D2-H3↔D2-E5 충돌 해소** — in-mounted 지속 vs 날짜리셋 분리, #94 별개 test.
  3. §4a **clamp safeIdx 일관 사용**(text/page/aria-selected/styling/rich) + resolver `?? 0`.
  4. §2 **conditional-rubric-resolver** 신규 필드 동반 clear/replace(target map +`conditional-rubric-resolver.ts`).
  5. §4c·§6 **렌더 게이트 확장**(candidates 존재 시 antiphon 빈 경우도 렌더) + **데이터 무결성 어서션**(정확히 6·비공백·중복0·page).
- **DEGRADED 아님**(peer 정상). 본 step은 설계 lock만(코드/데이터 미수정). 모든 file:line 직접 인용 — 리뷰어 독립 검증 가능.
