# Review #308 — #307 F-X6b First Compline Psalm 4 + Psalm 134 정정 (dev)

> **TL;DR** — #307 F-X6b 가 #298 F-X6 의 page-only 정정을 ref/antiphon 까지 완성하고 Sun I First Compline 두 번째 시편 (Psalm 134) 을 추가했음. PDF p.512/514/517 verbatim cross-check, 9개 AC 중 8 MET, 1 PARTIALLY_MET (shortReading 평행 결함, F-X6b 와 동급 root cause 이지만 dispatch 에서 명시적으로 out-of-scope 처리됨). **Verdict**: **APPROVED_WITH_ISSUES**. Follow-up: `F-X6c` for `days.SAT.shortReading` (Дэд хууль 6:4-7 vs Revelation 22:4-5) + `prayers/commons/compline/SAT.rich.json` 평행 정정.
>
> **Reviewer**: divine-review (adversarial-reviewer profile)
> **Author**: dev (#298 F-X6 + #307 F-X6b 연속 cohort)
> **Subject commit**: `ce082ef` → main `79ee7ac` (3 files, +73/-23)
> **Pipeline**: analyze → adversarial-scan (peer: codex/quality_auditor, consensus AGREE) → verdict
> **Peer evidence**: exchange `ex_20260503T230102Z_5ac7a5f1` — APPROVED_WITH_ISSUES, HIGH confidence

---

## 1. Scope

dev 의 fix 가 정확히 다음 세 가지를 다루었는지 검증:

1. `compline.json days.SAT.psalms[0]` ref + antiphon 정정 (Psalm 91:1-16 → Psalm 4, 'Тэнгэрбурханы жигүүр' → 'Намайгаа өршөөн', antiphon_key compline-sat → compline-sat-ps1) — page 512 는 #298 에서 이미 정정.
2. `compline.json days.SAT.psalms[1]` 신규 추가 (Psalm 134 + 'Шөнийн аниргүй' antiphon + page 514 + antiphon_key compline-sat-ps2 + gloria_patri true).
3. Regression test 강화 (#301 review F-2 minor 흡수): `route.test.ts` 의 firstCompline + compline 테스트가 page 외에 ref + antiphon 도 pin (3 tests, +61/-19).
4. `docs/traceability-matrix.md` FR-NEW 행에 #307 F-X6b 서브엔트리 추가.

`days.SUN` (Second Compline) 무변경, `blessing.page=517` 무변경, 시즌 propers 무변경 — 모두 검증 완료.

## 2. Acceptance Criteria — verdict

| AC | Type | Criterion | Verdict | Evidence |
|----|------|-----------|---------|----------|
| AC-1 | executable | PDF anchor verbatim 정확성 — p.512 + p.514 + p.517 + Psalm 4 body | **MET** | `parsed_data/full_pdf.txt` line 17724/17727/17732/17779/17781/17894/17897/17902 모두 일치. 본문 (17743 'Миний зөв шударгын Тэнгэрбурхан' / 17770 'Зөвхөн Та билээ') 도 확인. |
| AC-2 | structural | `compline.json` 필드 정정 정확성 + 무변경 부분 | **MET** | `jq` 로 days.SAT.psalms / days.SUN.psalms / blessing.page 직접 확인. psalms[0] = Psalm 4 + 'Намайгаа өршөөн' + page 512 + key compline-sat-ps1; psalms[1] = Psalm 134 + 'Шөнийн аниргүй' + page 514 + key compline-sat-ps2 + gloria_patri true; SUN 무변경; blessing.page=517 무변경. |
| AC-3 | structural | antiphon_key 명명 변경 (compline-sat → compline-sat-ps1, +ps2) 무회귀 | **MET** | `grep -rn "compline-sat" src/ scripts/ data/` → compline.json 자체에서만 매칭. seasonal propers (advent/christmas/lent/easter/ordinary-time) 도 compline 키 override 없음. `antiphonOverrides[entry.antiphon_key]` (psalm.ts:39) dict-key 조회로 매칭 키 없으면 default 사용 — 안전. WED 가 이미 ps1/ps2 규칙 사용 중이라 일관성 있음. |
| AC-4 | structural | 3 regression test (page+ref+antiphon 동시 pin) 적정성 | **MET** | (a) firstCompline psalmody[0] = Psalm 4 + 'Намайгаа өршөөн' + page 512; (b) firstCompline psalmody[1] = Psalm 134 + 'Шөнийн аниргүй' + page 514; (c) compline psalmody[0] = Psalm 91:1-16 + 'Тэнгэрбурханы жигүүр' + page 517 (Second Compline regression guard). `toContain` for antiphon (몽골어 punctuation drift 견고) + `toBe` for ref/page (정확 매칭) 분기 잘 됨. F-2 minor 흡수 cleanly. |
| AC-5 | executable | npm test / tsc / eslint 회귀 0 | **MET** | `npm test`: 46 files / **913 PASS** (matches author claim). `npx tsc --noEmit`: No errors. `npx eslint .`: 0 errors / 16 warnings (모두 pre-existing, 변경 영역 무관). |
| AC-6 | semantic | LOTH 정통 시편 구조 (Sun I = Ps 4 + Ps 134, Sun II = Ps 91 단일) | **MET** | PDF p.512 'НЯМ ГАРАГУУДАД БОЛОН ИХ БАЯРУУДАД' (Sundays AND Solemnities). p.512-516 Sun I 블록에 Дуулал 4 + Дуулал 134 paired. p.517-520 Sun II 블록에 Дуулал 91 단일. Latin Liturgia Horarum 의 Sunday I First Compline 정통 두-시편 짝. |
| AC-7 | structural | psalms array 길이 1→2 변경이 renderer/loader/fallback 무영향 | **MET** | `getComplinePsalmody` (psalter-loader.ts:100) → `PsalmEntry[]` 반환. `loth-service.ts` 가 `psalmEntries.map()` (L480) + `for (let i; i < N; i++)` indexing (L493) — N 요소 array 처리 가능. compline 경로에 `psalms[0]`-only hardcode 없음 (`invitatory.ts` 의 `psalms[0]` 은 invitatory psalm 95 슬롯, 무관). |
| AC-8 | semantic | Out-of-scope 항목이 실제로 out-of-scope 인지 | **PARTIALLY_MET** | (a) **shortReading**: ⚠ days.SAT.shortReading 가 Revelation 22:4-5 + page 519 인데, PDF Sun I First Compline shortReading 는 line 17794 'Дэд хууль 6:4-7' (Deuteronomy 6:4-7, Shema). 이는 F-X6/F-X6b 와 동급의 Sun II carry-over 결함이지만 dispatch 에서 명시적으로 out-of-scope 처리됨. (b) Seasonal compline override: 5개 시즌 모두 부재 ✓. (c) `blessing.page=517`: PDF p.517 'Төгсгөл' (line 17873) 와 일치 ✓. |
| AC-9 | executable | route.test.ts firstCompline + compline 테스트 PASS | **MET** | `npx vitest run src/app/api/loth/[date]/[hour]/__tests__/route.test.ts` → **15/15 PASS**. |

**8/9 MET, 1 PARTIALLY_MET (out-of-scope 영역 발견).**

## 3. Adversarial scan — additional findings

### Finding F-1 (MAJOR — out-of-scope, follow-up 권장): Sun I First Compline shortReading carry-over

**위치**: `src/data/loth/ordinarium/compline.json` `days.SAT.shortReading` + `src/data/loth/prayers/commons/compline/SAT.rich.json` `shortReadingRich`

**현재 상태**:
```json
{
  "ref": "Revelation 22:4-5",
  "text": "Тэд Түүний царайг харна. Түүний нэр тэдний духан дээр байх болно...",
  "page": 519
}
```

**PDF SSOT** (`parsed_data/full_pdf.txt` line 17793-17802, Sun I First Compline 블록):
```
Уншлага
Дэд хууль 6:4-7
Сонс, Израиль аа! ЭЗЭН бол бидний
Тэнгэрбурхан бөгөөд ганц ЭЗЭН. Чи Тэнгэрбурхан
ЭЗЭНээ бүх зүрх, бүх сэтгэл, бүх хүч чадлаараа
хайрла. Өнөөдөр чамд миний тушааж буй энэ
үгсийг чи зүрхэндээ байлгаж, хөвгүүдээ үүгээр
хурцлан, гэртээ сууж байхдаа ч, замд явж байхдаа
ч, хэвтэж байхдаа ч, өндийн босохдоо ч түүний
тухай ярьж бай.
```

PDF page 위치: line 17794 의 'Дэд хууль 6:4-7' 는 p.514 (line 17773) 와 p.515 (line 17811) 사이 — Sun I First Compline shortReading 은 **PDF p.514-515**, 'Илчлэл 22:4-5' (line 17964) 는 **PDF p.519** Sun II Second Compline shortReading.

**Root cause**: F-X6 (#298) + F-X6b (#307) 시리즈의 동일한 carry-over 패턴. #230 F-X5 SAT-keyed relocation 이전에 SAT 슬롯에 Sun II 콘텐츠가 들어가 있던 잔여물. 시편 + 후렴은 #298+#307 로 정정됐지만 shortReading 은 미터치.

**Rich overlay 평행 결함**: `prayers/commons/compline/SAT.rich.json:shortReadingRich.page=519` + 본문도 'Тэд Түүний царайг харна...' (Rev 22:4-5). `assembleCompline` 가 rich overlay 우선 사용하므로 base JSON 만 정정해도 화면에는 여전히 wrong content 가 표시됨 — **두 파일 동시 정정 필수**.

**Severity**: MAJOR (사용자에게 보이는 잘못된 본문 + page badge ↔ 본문 mismatch — F-X6 와 동급)

**Out-of-scope 처리**: dispatch 에서 명시적으로 'shortReading (Revelation 22:4-5 / page 519) out-of-scope. dev 가 별 task 로 분리.' 라고 했으나, **task list 검토 결과 follow-up task 가 등록되지 않음** (#299 F-X7, #300 F-X8 은 hymn 관련, shortReading 무관).

**권고**: `F-X6c` 새 task 등록 — `days.SAT.shortReading` (ref/text/page 모두) + `prayers/commons/compline/SAT.rich.json:shortReadingRich` 평행 정정 + `route.test.ts` shortReading 회귀 테스트 (ref + page + body 일부 텍스트 pin).

**참고**: 이 Finding 은 **#307 F-X6b 의 verdict 에는 영향 없음** (frozen scope 외부). 그러나 dev cohort 가 추적하고 있는지 확인하고, 추적되지 않으면 user 에게 등록 제안.

### Finding F-2 (LOW — informational): SUN slot antiphon_key 일관성

**위치**: `compline.json days.SUN.psalms[0].antiphon_key`

**현재**: `"compline-sun"` (단일 시편이므로 -ps1 suffix 없음, WED ps1/ps2 규칙과 다름).

**평가**: SAT 가 ps1/ps2 로 갔지만 SUN 은 단일이라 무 suffix. WED 같은 다중-시편 슬롯과만 ps1/ps2 사용하는 합리적 분기. 변경 불필요. **No action.** (TUE/THU/MON/FRI 도 단일 시편 + 무 suffix 로 일관성 있음.)

### Finding F-3 (NIT — informational): 평행 평일 First Compline 미점검

**범위**: dispatch 에서 dev 가 'days.SAT' 만 정정. 그러나 #240 F-X5 FU#1 + #245 FU#4/FU#5 에서 평일 Solemnity/Feast eve 도 firstCompline 라우트로 진입함이 확인됨 (data lookup 은 모두 SAT 슬롯).

**평가**: SAT 슬롯이 Sun I First Compline 의 SSOT 이고 평일 eve 도 동일 슬롯을 참조하므로, SAT 정정만으로 모든 firstCompline 진입 지점이 동시에 정정됨. dispatch 결정 정확.

**No action**, dispatch correctness 재확인.

## 4. Test method transparency

| AC-id | Test Level | Method | Actual Command | What Was Asserted | Limitation | level_check |
|-------|-----------|--------|----------------|-------------------|------------|-------------|
| AC-1 | L5 (Observational) | grep + sed line-context inspection of parsed_data/full_pdf.txt | `grep -nF "Намайгаа өршөөн"` + line context via `sed -n` | PDF verbatim line numbers + surrounding context match dev 의 claimed anchors | PDF parsing artifacts (column merge, page header repeat) 가능 — 본문 verse 단위 byte-for-byte 비교는 미수행 | OK (L5 evidence-based) |
| AC-2 | L3 (Unit) | jq query on compline.json | `jq '.days.SAT.psalms, .days.SUN.psalms, .blessing.page, .days.SAT.shortReading.ref'` | Field-level exact match on 8 fields | 다른 day slot (MON-FRI) 미점검, 가정상 unchanged | OK |
| AC-3 | L3 (Unit) | grep across src/ scripts/ data/ | `grep -rn "compline-sat\|antiphon_key" src/ scripts/` | No consumer of 'compline-sat' (구 키) outside compline.json | runtime override 없음 가정 (정적 분석) | OK |
| AC-4 | L3 (Unit) | Read git diff + manual assertion analysis | `git show ce082ef -- ...route.test.ts` | 3 tests 가 page/ref/antiphon 모두 pin; toContain vs toBe 분기 적절 | 실제 실행 결과는 AC-9 가 담당 | OK |
| AC-5 | L1 (E2E) | npm test (vitest run, full suite) + tsc + eslint | `npm test 2>&1 \| tee /tmp/test-out.log` | 46 files / 913 passed; tsc 0 errors; eslint 0 errors / 16 warnings (pre-existing) | 모바일 SW 캐시 회귀 (CLAUDE.md 수동 체크) 미점검 | OK |
| AC-6 | L5 (Observational) | PDF block structural inspection | `grep` + `sed` for Sun I/II header + body | Sun I 블록 = Ps 4 + Ps 134 paired; Sun II 블록 = Ps 91 단일 | LOTH 정통 자료 cross-reference 는 PDF 단일 출처 | OK |
| AC-7 | L3 (Unit) | grep + Read source code | `grep -rn "psalms\[0\]\|psalmEntries"` + Read loth-service.ts:480-493 | array indexing 은 `.map()` + `for (let i)` 으로 N-요소 처리 | runtime profiling 미수행, 가정상 정적 분석 OK | OK |
| AC-8 | L5 (Observational) | PDF block + jq deep-key search | `jq -r '..\|objects\|select(has("compline"))'` for seasonal propers | Seasonal compline override 부재; shortReading 평행 결함 발견 (out-of-scope) | shortReading 의 페이지 정확성은 결함 발견으로 verdict NOT_MET 처리되었으나 frozen scope 밖 | OK |
| AC-9 | L1 (E2E) | npx vitest run (targeted) | `npx vitest run 'src/app/api/loth/[date]/[hour]/__tests__/route.test.ts' --reporter=verbose` | 15/15 PASS | targeted vitest 만 — full suite AC-5 가 cover | OK |

**Anti-cheating verification**:
- Actual Command 모두 NOT_EXECUTED 아님 ✓
- What Was Asserted 모두 NO_ASSERTION 아님 ✓
- L1/L3/L5 claim 과 method 일치 ✓
- Transparency table 본 review doc 에 포함 ✓

## 5. Verdict

**APPROVED_WITH_ISSUES**

### Rationale
- Frozen F-X6b scope (psalm ref/antiphon + Psalm 134 추가 + regression strengthening) 는 정확히 deliver 됨.
- PDF SSOT (parsed_data/full_pdf.txt) 와 8/9 검증 항목 verbatim 일치.
- 회귀 테스트 강화 디자인이 robust (page+ref+antiphon 동시 pin → 단일 silent drift 차단).
- 변경 영역 외부 시스템 (renderer / loader / seasonal propers / SUN slot) 모두 무영향.
- Test/lint/typecheck 회귀 0.

### Issues (non-blocking)
- **MAJOR — F-1 (out-of-scope)**: Sun I First Compline shortReading 평행 carry-over (Дэд хууль 6:4-7 vs Revelation 22:4-5, page 519). Base JSON + rich overlay 양쪽 정정 필요. **Follow-up `F-X6c` 등록 권고** — 현재 task list 에 트래킹 안 됨.

### Recommendation
- Merge as-is (이미 main 에 ff-merge 됨, 79ee7ac).
- F-X6c follow-up task 등록 후 차회 cohort 에서 dev 또는 solver 에게 dispatch.
- Mobile manual checklist (CLAUDE.md) 가 첨부되어 있으므로 배포 후 iOS Safari + A2HS PWA + Slow 3G 점검 권고.

## 6. Peer evidence

| Field | Value |
|-------|-------|
| peer_role_key | `quality_auditor` |
| provider | `codex` |
| exchange_id | `ex_20260503T230102Z_5ac7a5f1` |
| peer_stance | `APPROVED_WITH_ISSUES` |
| peer_confidence | `HIGH` |
| consensus | AGREE (round 1) |
| degraded_mode | false |

Peer 가 독립적으로 같은 결론 도달: shortReading 평행 결함 (Дэд хууль 6:4-7 vs Revelation 22:4-5) 발견 + rich overlay 영향 명시 + F-X6c follow-up 권고. 9개 AC 중 8 MET, 1 NOT_MET (out-of-scope). PDF line numbers (17724-17732, 17779-17781, 17894-17902, 17793-17802, 17963-17969) cross-confirmed.

## 7. Files reviewed

| File | LOC delta | Verdict |
|------|-----------|---------|
| `src/data/loth/ordinarium/compline.json` | +11 −3 | MET (8/9) |
| `src/app/api/loth/[date]/[hour]/__tests__/route.test.ts` | +61 −19 | MET |
| `docs/traceability-matrix.md` | +1 −1 | MET |

## 8. Test evidence

```
$ npm test 2>&1 | tee /tmp/test-out.log | tail -10

 Test Files  46 passed (46)
      Tests  913 passed (913)
   Duration  5.81s

$ npx tsc --noEmit
TypeScript: No errors found

$ npx eslint .
ESLint: 0 errors, 16 warnings in 9 files (모두 pre-existing, 변경 영역 무관)

$ npx vitest run 'src/app/api/loth/[date]/[hour]/__tests__/route.test.ts'
PASS (15) FAIL (0)
```

## 9. Decision summary

`APPROVED_WITH_ISSUES` — frozen scope 완전 충족, 1 out-of-scope follow-up 권고 (F-X6c shortReading parallel fix).
