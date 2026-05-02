# Review #221: #219 F-X2 Phase 1 pilot — Psalm 92:2-9 W4-SAT-Lauds psalmPrayerPage override

> **TL;DR** — APPROVED_WITH_ISSUES. Lean Option A (deeper audit 권고대로) 정확히 구현. 7 AC 중 6 MET, 1 PARTIALLY_MET (Bible-fallback resolver path 회귀 anchor 부재). 머지 권장.

| 메타 | 값 |
|---|---|
| Reviewer | divine-review (adversarial-reviewer) |
| Author | member-01 |
| Target branch | `worktree-219-member-01` (commit `0471b05`, 4 functional + 2 generated files / +90 / -4) |
| Base | `e7973f37` (= ca009bc + 161f247 deeper audit merge). 0471b05 의 부모는 `ca009bc` — 161f247 audit 가 이 base 에 추가됨 (diff range 아티팩트로만 표시). |
| Review session | `adhoc-review-221-219-fx2` |
| Decision | `dec_1` (APPROVED_WITH_ISSUES, R3 consensus) |
| Peer | quality_auditor (codex), exchange `ex_20260502T133346Z_af45a6e7` |

---

## 변경 범위

### 기능 변경 (4 files / 88 LOC)

| File | LOC delta | 변경 |
|---|---|---|
| `src/lib/types.ts` | +10 / -0 | `PsalmEntry` 에 optional `psalmPrayerPage?: number` (occurrence-bound metadata 위치) + JSDoc semantics |
| `src/lib/hours/resolvers/psalm.ts` | +12 / -2 | 두 return site (PDF stanza :80, Bible fallback :122) 모두 `entry.psalmPrayerPage ?? psalmText?.psalmPrayerPage` 으로 nullish-coalesce. signature 불변. |
| `src/data/loth/psalter/week-4.json` | +1 / -0 | SAT-lauds Psalm 92:2-9 entry 에 `"psalmPrayerPage": 506` 한 줄 (page=505 와 seasonal_antiphons 사이) |
| `src/lib/hours/resolvers/__tests__/psalm.test.ts` | +65 / -0 | 회귀 anchor 3 + mock loadPsalterTexts 에 `Psalm 92:2-9` 추가 (catalog default 280 시뮬) |

### 자동 생성 (2 files / timestamp only)

`scripts/out/psalter-page-corrections.json`, `scripts/out/psalter-page-review.json` — `verify-psalter-pages.js` 재실행 결과의 `generated` 타임스탬프만 갱신. Content drift 0.

---

## AC verdict

| AC | Type | Verdict | Evidence |
|---|---|---|---|
| AC-1 | structural | **MET** | `types.ts:182` — optional `psalmPrayerPage?: number` 가 occurrence-bound `page?: number` (line 172) 옆에 거주 + JSDoc 가 catalog fallback / occurrence-specific override semantics 명시 (`:173-181`). |
| AC-2 | structural | **MET** | `psalm.ts:80` (PDF stanza path): `psalmPrayerPage: entry.psalmPrayerPage ?? psalmText.psalmPrayerPage`. `psalm.ts:122` (Bible fallback): `psalmPrayerPage: entry.psalmPrayerPage ?? psalmText?.psalmPrayerPage`. 두 site 동일 시맨틱. resolver signature 불변 (7th param 폐기). |
| AC-3 | structural | **MET** | `week-4.json:1002` — `"psalmPrayerPage": 506`. PDF p.506 는 deeper audit (`handoff-fx2-psalmprayer-audit.md:35-40`) 가 byte-identical 검증한 W4-SAT-Lauds occurrence page. |
| AC-4 | executable | **MET** | W2-SAT-Lauds (`week-2.json:964-973`) 에는 `psalmPrayerPage` 부재 → resolver fallback 으로 catalog default 280 (`psalter-texts.json["Psalm 92:2-9"].psalmPrayerPage = 280` 사전 확인) 유지. test `psalm.test.ts:207-219` 회귀 anchor. |
| AC-5 | executable | **PARTIALLY_MET** | 3 anchor (W4 override→506 / W2 default→280 / generic backward-compat→280) 모두 mock `loadPsalterTexts['Psalm 92:2-9'].stanzas` non-empty 이므로 resolver 가 PDF stanza path (line 80) 에서 종료. **Bible-fallback path (line 122) 는 회귀 anchor 부재** — 동일 nullish-coalesce 식이라 위험은 LOW 이나 분기 자체가 직접 검증되지 않음. |
| AC-6 | executable | **MET** | vitest 784/784 (43 files) PASS. tsc clean. eslint 0 errors. `verify-psalter-pages.js` 재실행 산출물의 timestamp 외 content drift 0. |
| AC-7 | structural | **MET** | `loth-service.ts` 의 `getPsalterPsalmody(day.psalterWeek, dayOfWeek, hour)` 가 W4-SAT-Lauds 시 week-4.json 의 SAT lauds psalms[0] (Psalm 92:2-9 with `psalmPrayerPage: 506`) 를 로드 → resolver 가 override 적용 → `assembledPsalm.psalmPrayerPage = 506`. 사용자 신고 surface (2026-05-02 W4 토요일 Lauds Psalm 92 첫 시편 page chip) 해소. |

---

## Issues

### I-1 — Bible-fallback path 회귀 anchor 부재 (NIT, LOW risk)
- **위치**: `src/lib/hours/resolvers/psalm.ts:122` — `psalmPrayerPage: entry.psalmPrayerPage ?? psalmText?.psalmPrayerPage`.
- **상황**: 3 anchor 가 mock 에 `Psalm 92:2-9` stanzas 를 넣어 두므로 resolver 가 line 58 의 `if (psalmText && psalmText.stanzas.length > 0)` 가지에서 line 80 으로 분기, fallback path 는 traverse 안 됨.
- **위험도**: LOW — line 122 의 식은 line 80 과 byte-identical (피연산자만 `psalmText?.` 옵셔널 체이닝 차이) 이며, 양쪽 모두 단순 nullish-coalesce. 회귀 시 두 site 가 동시에 깨질 가능성이 압도적이고, 두 site 가 분기되어 silent skew 가 생길 시나리오는 실질적으로 없음.
- **권고 (선택)**: mock 의 `Psalm 92:2-9.stanzas` 를 빈 배열로 두는 4번째 anchor 추가 시 line 122 직접 검증. 1줄 변경 + bible-loader mock 확장 필요. Phase 2 batch 에 함께 land 가능.

### I-2 — Field placement convention (INFO, no action)
- 새 `psalmPrayerPage` 가 `page` (line 1001) 와 `seasonal_antiphons` (line 1003) 사이에 삽입됨. 기존 entry 의 schema 순서 (`type → ref → antiphon_key → default_antiphon → title → gloria_patri → page → seasonal_antiphons`) 와 정합. 새 field 는 page 와 의미상 가까우므로 위치 적절.

### Out-of-scope artifact (no action)
- `git diff e7973f37..0471b05` 에 `docs/handoff-fx2-psalmprayer-audit.md` 가 deletion (-382) 으로 표시. 0471b05 의 부모가 `ca009bc` 이며 audit doc 은 `161f247` 에서 추가되어 base merge `e7973f37` 에 포함됐기 때문. leader merge 시 `worktree-219-member-01` 을 `e7973f37` 위로 ff-merge 하면 audit 가 그대로 보존됨. **실제 삭제 아님**.

---

## Verification evidence

| Gate | Command | Result |
|---|---|---|
| vitest | `vitest run` | **784 passed (43 files), 0 failed** |
| Targeted | `vitest run src/lib/hours/resolvers/__tests__/psalm.test.ts` | 13/13 (3 신규 anchor 포함) |
| typecheck | `tsc --noEmit` | clean |
| eslint | `eslint <changed files>` | 0 errors (warning은 JSON file no-config — lint 대상 아님) |
| Catalog cross-check | `node -e "require('./src/data/loth/psalter-texts.json')['Psalm 92:2-9'].psalmPrayerPage"` | `280` (mock 과 일치) |
| Audit citation | `handoff-fx2-psalmprayer-audit.md:35-40` | p.506 = W4-SAT-Lauds 정답 (PDF byte-identical 확인됨) |
| Verifier drift | `git diff scripts/out/*.json` | 타임스탬프만 (`generated` field), content 0 drift |

---

## Architectural eval (취소된 책무 확인)

이전 #221 follow-up 에서 dispatch 한 architectural eval (Option B catalog vs Option A lean) 은 redirect 후 무효. member-01 이 deeper audit Option A (lean) 정확히 적용. 변경 면적 (4 files / 88 LOC) 은 audit 권고 (3 files / ~5 LOC) 에 근접하며 차이는:

- types.ts +10 (audit 권고는 schema 추가 카운트 누락) — 적정
- psalm.ts +12 (audit 권고 +5 는 단일 site 추정 — 두 site 모두 패치 필요하므로 +12 가 정확)
- test +65 (audit 권고 미언급, 책임 있는 추가)
- week-4.json +1 (=1 line — audit 와 일치)

**Phase 2 cost**: 11 multi-occurrence keys 의 15 추가 occurrence 는 week-N.json 에 평균 1줄/occurrence 추가로 완료 가능. resolver/types.ts 추가 변경 없음. 예측대로 lean.

---

## Recommendation

**APPROVED — merge-ready.** 단일 PARTIALLY_MET (Bible-fallback anchor 부재) 는 LOW risk 이며 동일 식이 line 80 에서 검증되었으므로 머지를 차단하지 않음. Phase 2 batch 시 4번째 anchor 합류 권고. Verdict 는 독립 peer auditor (`quality_auditor`) consensus 와 일치 (R3, 3 라운드).
