# 부활시기 propers 회귀 audit (task #202, 2026-04-29)

> **TL;DR** — 사용자 reported 회귀 ("부활시기인데 시편후렴/독서/응송/Marian/intercession/concluding 이 연중시기로 폴백") 의 정적 분석 결과. PDF p.700 rubric (부활 1주차만 author, 시즌 전체 반복) 은 명문 확인. propers-loader.ts (#54 wk1 fallback) + rich-overlay.ts (Tier1/2/3 fallback) + loth-service.ts (5-layer merge) 의 resolver chain 은 정적 분석상 정상 동작해야 함. **정적 reproduction 안 됨** — 동적 reproduction 필요. 가장 유력 단서: `gospelCanticleAntiphonRich` 등 일부 *Rich 필드가 easter w1 rich.json 에 부재 → UI 가 plain Layer2 fallback 을 못 살리면 ordinary 처럼 보일 가능성.

@fr FR-NEW-easter-regression (task #202)
base: 0f406ef docs(fr-161): handoff R-14a + R-14c land 반영

---

## 1. PDF p.700 rubric (GILH 명문)

`parsed_data/full_pdf.txt` L24261-24268:

> **Амилалтын цаг улиралд зориулсан нэг л долоо хоногийн залбирлууд өгөгдсөн байна. Эдгээр залбирлуудыг амилалтын цаг улирлын турш давтаж уншиж болно.** Амилалтын цаг улирлын магтуу: х. 876-877.

**번역**: 부활시기를 위해 한 주 분량의 기도문만 제공된다. 이 기도문들을 부활시기 전체에 걸쳐 반복해서 사용할 수 있다. (찬가는 PDF 876-877쪽 참조.)

**적용 elements**:
- 시편 후렴 (`antiphons` via `psalm.json` `default_antiphon`)
- 독서 (`shortReading`)
- 응송 (`responsory`)
- 성모찬송 후렴 (`gospelCanticleAntiphon` = Magnificat / Benedictus antiphon)
- 청원기도 (`intercessions`)
- 마침기도 (`concludingPrayer`)

---

## 2. 데이터 구조

### `src/data/loth/propers/easter.json`

| 영역 | 상태 |
|---|---|
| `weeks['1']` | 7요일 (SUN/MON/TUE/WED/THU/FRI/SAT) full populated. 각 요일에 lauds/vespers/vespers2 hours, hours 별 shortReading + responsory + gospelCanticleAntiphon + intercessions + concludingPrayer + page |
| `weeks['2']..weeks['7']` | 각 SUN slot 만 존재 (lauds/vespers/vespers2 일부) |
| special-keys | `easterSunday`, `ascension`, `pentecost` |
| PDF 의도와 일치 | YES — wk1 만 author 한 것을 그대로 반영 |

### `src/data/loth/prayers/seasonal/easter/`

21 rich files: `w1-{SUN..SAT}-{lauds,vespers,vespers2 일부}` + special-keys (`weasterSunday`, `wascension`, `wpentecost`).

**Field coverage 표본 점검** (`w1-WED-lauds.rich.json`):
- 보유: `concludingPrayerRich`, `intercessionsRich`, `responsoryRich`, `shortReadingRich` (4 keys)
- **부재 (의심 단서)**: `gospelCanticleAntiphonRich`, `alternativeConcludingPrayerRich`, `hymnRich`
- advent/lent/christmas 의 동일 hour 도 비슷하게 4 keys → 데이터 측 명백한 누락은 아님. 다만 사용자가 "성모찬송 후렴" 까지 연중시기라고 한 부분이 이 부재와 연결될 가능성

---

## 3. Resolver chain 정적 trace

### `propers-loader.ts` `getSeasonHourPropers` (L150-221)

```
special-key 분기 → weeks[weekKey][day] → weeks['1'][day] (wk1 fallback) → weeks['1'][day][hour]
```

PDF 의 'Easter 평일 wk1 반복' 의도 그대로 구현 (#54 task fix, commit 76d3e00).

### `rich-overlay.ts` `loadSeasonalRichOverlay` (L106-159)

3-tier:
1. Tier1: special-key (Sunday-slot fallback)
2. Tier2: exact `weekKey`
3. Tier3: wk1 fallback

`propers-loader` 와 대칭 구현. `weasterSunday` 같은 special-key 매치 시 wk1 fallback skip (#54 회귀 가드).

### `loth-service.ts` `assembleHour` (L342-388)

5-layer merge:
1. **Layer1**: psalter commons (lowest, ordinary 4-week cycle)
2. **Layer2**: season propers (override)
3. **Layer3**: sanctoral (override)
4. **Layer4**: rich overlay spread (`resolveRichOverlay` 결과 통째로 spread, mergedPropers 의 plain text 와 별개 fields)
5. **Layer5**: seasonal antiphon augmentation (Easter Alleluia, FR-155 task #12)

### Theoretical simulation (date = 2026-04-29 Easter wk4 WED lauds)

| Layer | 동작 | 기대 결과 |
|---|---|---|
| `weeks['4'].WED` | undefined | wk1 fallback 진입 |
| `weeks['1'].WED` | defined | Easter wk1 WED plain text 반환 |
| seasonal Tier3 fallback | `seasonal/easter/w1-WED-lauds.rich.json` present | 4 *Rich fields (Easter content) 반환 |
| psalter commons `w4-WED-lauds` | 2 fields (responsoryRich + shortReadingRich, ordinary) | seasonal spread 가 override |
| Layer5 | applySeasonalAntiphon | Alleluia augment |

**최종 mergedPropers** (정적 simulation):
- shortReading = Easter wk1 WED (Layer2)
- shortReadingRich = Easter wk1 WED (Layer4 seasonal > Layer1 psalter commons)
- responsory / responsoryRich = Easter
- intercessions / intercessionsRich = Easter
- concludingPrayer / concludingPrayerRich = Easter
- gospelCanticleAntiphon = Easter (Layer2 plain) — **그러나 `gospelCanticleAntiphonRich` 는 부재 → UI 분기 의심**
- + Layer5 Alleluia augmentation

**Verdict**: 정적 분석상 회귀 없음. resolver chain 은 PDF p.700 rubric 의도대로 동작해야 함.

---

## 4. git log 회귀 commit 추적

### Prior Easter fixes (사용자 기억의 "지난번 수정" 후보)

| commit | date | scope |
|---|---|---|
| `92f234c` | 2026-04-23 | feat(hours): Easter 시즌 psalm/canticle antiphon 복원 (task #12, FR-155). applySeasonalAntiphon 헬퍼 + Layer5 augmentation |
| `76d3e00` | 2026-04-25 직전 | fix(rich-overlay): loadSeasonalRichOverlay wk1 fallback + special-key 가드 (task #54). Easter wk2-7 평일에서 ref/page 와 본문 mismatch 해결. e2e `prayer-rich-overlay-fallback.spec.ts` 가 회귀 가드 |

두 commit 모두 사용자가 기억하는 "지난번" fix 의 후보. 동일 증상 (Easter wk2-7 평일이 ordinary 로 leak) 의 직전 fix.

### Recent commits touching resolver (최근 1개월)

```
ef2cf6a fr-160-b PR-10 PageRedirect inline body hydrate (B6) — Layer 4.5 page redirect
8f90e20 fr-160 Phase B PR-8 B4 — conditional rubric sectionOverrides 확장
9d568b5 fr-160 Phase B PR-1 schema + Layer 4.5 hydrate
782e5b6 fix(loth): firstVespers 분기에서 psalter commons rich 적재 skip — Symptom A
edccbcb fix(hours): plain-Sunday Saturday vespers concludingPrayer 회귀 + e2e
b6ec552 feat(rich-overlay): Christmas special-keys + day→SUN slot fallback
227a21a feat(rich-overlay): special-key disk file 로드
76d3e00 fix(rich-overlay): wk1 fallback (task #54) — directly relevant
```

### Recent commits touching easter data

```
82f5549 feat(fr-160): Phase B PR-5 — easter 1차 마킹
08ca495 feat(propers): easter firstVespers bare→versed rewrite
d3f1b66 fix(propers): typography drift 14 cells
```

**회귀 commit 가설**: **none confirmed**. 최근 1개월 commit 에서 easter resolver chain 을 명백히 깨뜨릴 변경 없음. 다만 fr-160 Phase B (#139~#151) 의 Layer 4.5 conditional rubric / page redirect 추가가 광범위하므로 *간접적* 영향 가능성 배제 못함.

---

## 5. Reproduction 시도

| 항목 | 결과 |
|---|---|
| date | 2026-04-29 (Easter wk4 WED) |
| sanctoral 04-29 | solemnities/feasts/memorials.json 모두 null → plain Easter 평일 (rank=WEEKDAY) |
| 정적 simulation (§3) | 정상 — Easter wk1 WED 콘텐츠가 모든 layer 에서 살아남아야 함 |
| **정적 reproduction status** | **NOT REPRODUCED** |
| caveat | 동적 reproduction (assembleHour 직접 호출, e2e fetch) 이 필요하나 read-only audit scope 밖 |
| sw.js 영향 | navigation HTML = network-only, /api/loth/* = SW unhandled. SW caching 은 원인 아닐 가능성 높음 |

---

## 6. Fix 권고 (priority 순)

### Priority A — Dynamic reproduction (vitest anchor)

**Action**: vitest 단위 테스트 신설. `assembleHour('2026-04-29','lauds')` 직접 호출, 모든 *Rich + plain 필드의 `source.season==='EASTER'` 또는 page 가 Easter wk1 범위 (700-720) 인지 assert. 6 anchor: Wk2 MON / Wk3 SAT / Wk4 WED / Wk5 SUN / Wk6 FRI / Wk7 TUE.

**Why**: e2e `prayer-rich-overlay-fallback.spec.ts` 는 wk2 MON / wk3 SAT 만 cover. wk4/5/6/7 평일 + 모든 hour 조합은 미보호 → 본 회귀가 그 사각지대에서 발생 중일 가능성.

### Priority B — Layer capture logging (dev-only)

**Action**: `loth-service.ts` `assembleHour` 에 (NODE_ENV=development 한정) Layer1/Layer2/Layer4 결과 console.log 트레이서 임시 추가 → 사용자 reported 날짜에서 어느 layer 가 ordinary 로 누설되는지 직접 capture.

**Why**: 정적 분석 한계, 동적 capture 가 가장 빠른 path.

### Priority C — Renderer audit

**Action**: prayer page renderer (`/pray/[date]/[hour]` route) 가 `mergedPropers` 의 어느 필드 우선순위로 렌더하는지 검증 — 특히 plain `shortReading` 과 `shortReadingRich` 가 모두 있을 때 분기.

**Why**: resolver 정상 + 데이터 정상이면 의심 다음 단계는 UI.

### Priority D — Seasonal rich field coverage (가장 유력 단서)

**Action**: `seasonal/easter/w1-{day}-{hour}.rich.json` 14개 파일이 _쉽게 누락되는 필드_ (`gospelCanticleAntiphonRich`, `alternativeConcludingPrayerRich`, `hymnRich`) 를 갖고 있는지 검증. 만약 fr-160 PR-5 (commit 82f5549) 가 marker 만 추가하고 본문 *Rich 는 author 안 했다면, 그 필드는 plain Layer2 로만 채워져 사용자가 rich UI 에서 보지 못할 수 있음.

**Why**: easter w1-WED-lauds 는 4 fields 만 있고 `gospelCanticleAntiphonRich` 는 부재. 사용자가 '성모찬송 후렴' 도 ordinary 라고 하는 이유일 수 있음 — 다만 plain `gospelCanticleAntiphon` 은 Layer2 에서 Easter 으로 set 됨. UI 가 plain 도 정상 렌더하는지 재확인 필요.

### Priority E — Existing e2e run

**Action**: 기존 e2e 실행 — `easter-antiphon.spec.ts` (FR-155 task #12) + `prayer-rich-overlay-fallback.spec.ts` (task #54) — 모두 PASS 인지 확인.

**Why**: 가장 빠른 회귀 검증 path. PASS 면 사용자가 본 증상은 기존 가드 사각지대에서 발생 — Priority A 의 추가 anchor 가 적절.

---

## 7. Out-of-scope notes

- **task #12 FR-155 state**: psalm/canticle antiphon Alleluia augmentation (Layer5 `applySeasonalAntiphon`) 은 코드상 살아 있음. 만약 사용자가 시편 후렴에서도 Alleluia 누락을 본다면, `applySeasonalAntiphon` 이 어디선가 bypass 되고 있는 가능성.
- **FR-161 recent changes**: R-13~R-18 은 RichContent 내부 phrase wrap / sentence flow / hanging indent 등 _렌더링_ 측 변경. resolver chain (이번 audit 대상) 은 unchanged.

---

## 8. 다음 dispatch 권고

team-lead 가 implementer 에게 **Priority A + D 통합 dispatch** (member-01 적합):
- A: vitest anchor 6개 추가 → reproduction 즉시 시도
- D: easter w1-*.rich.json 의 누락 필드 (gospelCanticleAntiphonRich 등) 검증 + 사용자 reported 증상과 매칭

A 통과 시:
1. (1) 사용자 reported 증상이 _재현 안 됨_ → reproduction 단서 추가 요청 (사용자 측 화면 스크린샷 / 구체 date)
2. (2) 재현됨 → 정확히 어느 layer 가 leak 인지 즉시 식별 → Priority B/C 후속 dispatch
