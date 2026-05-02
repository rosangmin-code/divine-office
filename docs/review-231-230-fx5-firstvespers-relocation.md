# Review #231: #230 F-X5 — Saturday First Vespers / First Compline → Sunday relocation

> **TL;DR** — APPROVED_WITH_ISSUES (CONDITIONAL). 835/835 vitest + tsc + eslint 모두 clean. 핵심 relocation 경로 (assembleHour data-key 변환, eve-shift, getHoursSummary, sw v4→v5) 구조적으로 견고. 9 검토 포인트 중 7 PASS / 2 WARN. Q4=Q (Saturday-only) 결정은 합류 follow-up 트래킹 조건부 수용. AC1 PARTIAL (`/pray/SAT/vespers` 백워드 호환) 합리. 5개 follow-up 권고 (Q4=P 합류 트래킹, Solemnity-Sunday `sanctoral.firstVespers.psalms` 미구현, non-Sunday URL 404 게이트 누락, firstCompline 라벨 verbatim claim 정정, legacy SAT URL deprecation 결정). 머지 권장.

| 메타 | 값 |
|---|---|
| Reviewer | divine-review (adversarial-reviewer) |
| Author | dev |
| Target branch | `worktree-230-dev` (commit `c144146`, 11 functional files / +398 / −64) |
| Base | `2409448` (parent of `b8a4ee9`; merge-time 3-way conflict-free) |
| Review session | `adhoc-review-230-fx5` |
| Decision | `dec_1` (CONDITIONAL/APPROVED_WITH_ISSUES, R1 consensus) |
| Peer | quality_auditor (codex), exchange `ex_20260502T153230Z_fddef93c` (165 s, 763 732 input / 7 864 output tokens) |

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

## Verdict

**APPROVED_WITH_ISSUES (CONDITIONAL)**

- 핵심 기능 (Saturday → Sunday relocation) 이 사용자 의도를 충족하며 구조적으로 견고
- 테스트 / lint / typecheck 모두 clean (835/835 passed)
- 머지 권장 — **단 5개 follow-up tracking 조건부**

### Required follow-ups (before-feature-complete)

1. **Q4=P 합류 트래킹** — `#216 F-2c` 와 합류해서 weekday Solemnity/Feast eve 의 explicit firstVespers/firstCompline 라우트 도입. 별건 WI 생성 또는 #216 description amend.
2. **Sunday Solemnity `sanctoral.firstVespers.psalms` 지원** — `loth-service.ts` `if (isFirstVespers)` 분기 (`:298-349`) 에서 `sanctoral.firstVespers?.psalms` 도 `psalmEntries` 로 복사. 2027 Christmas Sunday / Easter Sunday 류 latent 회귀 차단.
3. **Non-Sunday firstVespers/firstCompline URL 404 게이트** — `route.ts` / `page.tsx` 에서 `(hour === 'firstVespers' \|\| hour === 'firstCompline') && dayOfWeek !== 'SUN'` → 404. 또는 Q4=P 구현 후 적격성 게이트로 확장.
4. **firstCompline 라벨 verbatim claim 정정** — 차후 commit / docs 에서 "PDF p.512 캐노니컬 (synthesized from UPPERCASE section header)" 로 표현. dev 자체 라벨은 변경 불필요.
5. **legacy SAT URL deprecation 결정** — `/pray/SAT/vespers`, `/pray/SAT/compline` 영구 백워드 호환 vs. SW vN 으로 redirect 도입. 별건 결정 record.

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
