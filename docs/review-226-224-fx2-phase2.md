# Review #226: #224 F-X2 Phase 2 batch — 12 occurrence psalmPrayerPage overrides

> **TL;DR** — APPROVED_WITH_ISSUES. 12 PDF-verbatim 검증된 occurrence override 가 깔끔하게 land. Phase 1 review #221 의 I-1 nit (Bible-fallback anchor 부재) CLOSED. 8 AC 중 7 MET, 1 PARTIALLY_MET (audit script ergonomics, non-blocking). 머지 권장.

| 메타 | 값 |
|---|---|
| Reviewer | divine-review (adversarial-reviewer) |
| Author | member-01 |
| Target branch | `worktree-224-member-01` (commit `ae9424d`, 9 files / +655 / -3) |
| Base | `c20f4395` |
| Review session | `adhoc-review-226-224-fx2p2` |
| Decision | `dec_1` (APPROVED_WITH_ISSUES, R1 consensus) |
| Peer | quality_auditor (codex), exchange `ex_20260502T142130Z_c6887e89` |

---

## 변경 범위 (9 files)

### Data overrides (3 files / +12 lines, code 변경 0)

| File | LOC | 추가된 occurrences |
|---|---|---|
| `src/data/loth/psalter/week-2.json` | +1 | Psalm 51:3-19 W2-FRI-Lauds (`psalmPrayerPage: 265`) |
| `src/data/loth/psalter/week-3.json` | +4 | Psalm 110/119/51/67 W3 (305 / 392 / 377 / 334) |
| `src/data/loth/psalter/week-4.json` | +7 | Psalm 118/150/110/135/144/51/8 W4 (408 / 412 / 416 / 429 / 482 / 490 / 509) |

**types.ts / psalm.ts UNCHANGED** — Phase 1 의 lean schema 와 nullish-coalesce resolver 가 Phase 2 데이터를 자동으로 라우팅. 데이터-only batch.

### Test (1 file / +128 -1)

| File | 변경 |
|---|---|
| `src/lib/hours/resolvers/__tests__/psalm.test.ts` | 5 신규 anchor — Phase 2 sample (W4-FRI Psalm 51 → 490, W3-SUN Psalm 110 → 305, W1-SUN Psalm 110 → 69 catalog default 회귀 가드) + 2 Bible-fallback (Psalm 200:1-3 mock with empty stanzas + lookupRef synthetic verse, override + catalog default 두 분기 모두 검증) |

### Tooling + audit artifact (3 files / +669)

| File | 변경 |
|---|---|
| `scripts/audit-fx2-phase2-pages.js` | NEW (+247) — PDF verbatim 검증기. parsed_data/full_pdf.txt 의 form-feed 기반 line-to-page 매핑 + day-marker / 시편 label 스코핑 + 'Дууллыг төгсгөх залбирал' header 위치 보고 |
| `scripts/out/fx2-phase2-page-verification.json` | NEW (+182) — 위 script 의 자동 생성 산출물 |
| `scripts/out/psalter-page-{corrections,review}.json` | timestamp 만 갱신 (drift 0) |

### Doc (1 file / +92)

| File | 변경 |
|---|---|
| `docs/handoff-fx2-phase2-batch.md` | Handoff doc. 12 적용 + 3 deferred + 4 audit-estimate corrections + Phase 3 candidates |

---

## AC verdict

| AC | Type | Verdict | Evidence |
|---|---|---|---|
| AC-1 | structural | **MET** | 12 landed override 모두 `scripts/out/fx2-phase2-page-verification.json` 의 PDF actual `found` 와 일치. 4건 (`Psalm 51 W2/W3/W4 +1`, `Psalm 118 W4 +2`) 은 audit estimate 와 다르나 PDF verbatim 우선. e.g. week-2.json:817 (265) ↔ verification.json:55 (found 265). 12/12 verified. |
| AC-2 | structural | **MET** | `git diff HEAD -- src/lib/hours/resolvers/psalm.ts src/lib/types.ts` 빈 결과. Phase 1 schema/resolver 그대로 활용. 데이터 batch only. |
| AC-3 | semantic | **MET** | 3 deferred (Psalm 110 W2 / Psalm 100 W3 / Psalm 147 W4) 모두 `prayerMatches: false` 로 PDF 본문이 catalog 와 다름 검증됨 (`verification.json:11, 94, 178`). 단순 punctuation 차이 아니라 본문 시작어 자체가 다름 ("Эцэг минь..." vs "Төгс хүчит..." / "Бидэнд хайртай..."). page-only override 시 chip↔display inconsistency 가 새로 발생할 위험 — defer 가 옳은 결정. Phase 3 (text+page joint override) 핸드오프 정합. |
| AC-4 | executable | **MET** | Phase 1 review #221 I-1 (Bible-fallback path anchor 부재) CLOSED. `psalm.test.ts:266-365` 에 `Psalm 200:1-3` mock + `lookupRef` synthetic verse 로 resolver 가 line 109 (Bible fallback) 도달. 두 anchor (override 1234 + catalog default 999) 가 line 122 의 nullish-coalesce 양 분기 직접 검증. |
| AC-5 | executable | **PARTIALLY_MET** | `scripts/audit-fx2-phase2-pages.js` line-to-page 매핑 정확 (sanity probes line 9536→p.280, line 17528→p.506 통과). 12 occurrence 모두 단일 candidate (day-marker distance 38-131 lines 안전 margin). **이슈**: script 의 `expect[]` (라인 31-46) 는 audit ESTIMATE 값을 보유하므로 4건 PDF-corrected rows (Psalm 51 W2/W3/W4, Psalm 118 W4) 는 `ok: false` + script `process.exit(1)`. 데이터 정확성 문제 아닌 CI ergonomics. 추가: parsed_data/full_pdf.txt 의존성 (worktree 에 누락 시 ENOENT) — `feedback_pdf_reference_cp_workaround.md` 의 cp 우회 적용해 검증함. |
| AC-6 | executable | **MET** | 단일-occurrence 80+ 시편은 모두 override 부재 → resolver fallback (psalmText.psalmPrayerPage) 으로 catalog default 그대로 surface. vitest 817/817 (44 files) PASS — 이전 baseline 회귀 0. |
| AC-7 | structural | **MET** | `/pray/2026-05-02/lauds` (= W4 SAT Lauds) 두 번째 시편 = Psalm 8:2-10. week-4.json:1029 의 entry 가 `psalmPrayerPage: 509` 보유 → resolver override → `assembledPsalm.psalmPrayerPage = 509`. 사용자 신고 surface 해소. |
| AC-8 | executable | **MET** | `scripts/out/psalter-page-{corrections,review}.json` diff 는 `generated` field timestamp 만 (`2026-04-29 → 2026-05-02`). content 0 drift. verifier 가 새로운 `psalmPrayerPage` field 는 검증 범위 밖 (handoff §4 도 언급) — 별 NFR-009d 확장 작업으로 분리. |

---

## Issues

### I-1 — audit-fx2-phase2-pages.js `expect[]` 와 exit code (NIT, non-blocking)
- **위치**: `scripts/audit-fx2-phase2-pages.js:30-46` (`targets` array `expect:` field) + `:221-237` (`allMatch` + `process.exit`).
- **상황**: Member-01 이 PDF verbatim 으로 4건 audit 추정값 정정 (`Psalm 51 W2/W3/W4 +1`, `Psalm 118 W4 +2`) 했으나 script 의 `expect[]` 는 audit estimate 그대로. 결과적으로 verified-correction rows 가 `ok: false` 로 표시되고 script `exit 1`.
- **영향**: `verification.json` 산출물에는 `found` (PDF actual) 가 정확히 기록되어 있어 데이터 정확성 영향 없음. CI 에서 script 를 게이트로 쓸 경우 false-negative 가능.
- **권고 (선택)**: `expect[]` 를 `landed[]` (week-N.json 의 실제 override 값) 로 이름변경 + 값 갱신, 또는 `expect[]` 제거하고 "PDF found vs catalog default" 만 비교. Phase 3 작업 시 함께 정정 권고.

### I-2 — audit-fx2-phase2-pages.js 의 부수효과 (INFO)
- **위치**: `scripts/audit-fx2-phase2-pages.js:231` — `fs.writeFileSync(scripts/out/fx2-phase2-page-verification.json)`.
- **상황**: 헤더 주석은 "read-only audit helper" 라지만 산출물 file 작성. 산출물이 git 에 커밋되어 있으므로 의도된 동작이나 read-only 계약과 충돌하는 표현. 
- **권고 (선택)**: 헤더 주석 갱신 — "read-only PDF audit helper that writes verification JSON" 정도로 정확화. 동작 변경 불필요.

### Out-of-scope
- audit script 의 `parsed_data/full_pdf.txt` 의존성은 `feedback_pdf_reference_cp_workaround.md` 의 알려진 worktree-isolation 패턴. cp 우회로 검증 가능.

---

## Verification evidence

| Gate | Command | Result |
|---|---|---|
| vitest | `vitest run` | **817 passed (44 files), 0 failed** |
| typecheck | `tsc --noEmit` | clean |
| eslint | `eslint <changed files>` | 0 errors (audit-fx2-phase2-pages.js 는 eslint ignore — script) |
| Audit script (cp 우회 후) | `node scripts/audit-fx2-phase2-pages.js` | 12 PDF-verified + 3 prayer-text DIFFERS (Phase 3 deferred). Sanity probes 통과 (line 9536→280, line 17528→506) |
| Verifier drift | `git diff scripts/out/psalter-page-{corrections,review}.json` | timestamps only |
| User surface | week-4.json:1029 + psalm-block.tsx render | Psalm 8 W4-SAT-Lauds → page chip 509 (was 284) |

---

## Recommendation

**APPROVED — merge-ready.** I-1 (audit script `expect[]` ergonomics) 와 I-2 (부수효과 주석) 는 모두 NIT, 데이터 정확성/회귀 영향 0. Phase 3 (text+page joint override 3 occurrences) 시 audit script `expect[]` 정정 권고. Verdict 는 독립 peer (`quality_auditor`) consensus 와 일치 (R1).

12 occurrence override 의 PDF verbatim 정확도 + Phase 1 review I-1 의 Bible-fallback anchor 합류로 lean schema 의 두 return site 모두 직접 검증되었음. Phase 3 deferred 결정의 합리성도 확인.
