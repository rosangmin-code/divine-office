# Review #310 — #309 F-X6c First Compline shortReading Rev 22:4-5 → Deuteronomy 6:4-7 (dev)

> **TL;DR** — F-X6 cohort 의 마지막 fix. Sun II → Sun I First Compline shortReading carry-over (Revelation 22:4-5 / page 519) 를 PDF SSOT verbatim (Deuteronomy 6:4-7 Shema / page 514) 로 정정. Base JSON + rich overlay 동시 정정, 'Израиль' soft sign 보존, 4 verses 모두 verbatim. 9개 AC 모두 MET, 추가 carry-over 잔여 없음 (Sun I/II 공유 responsory + Nunc Dimittis antiphon 본문 동일 cross-confirmed). **Verdict**: **APPROVED**.
>
> **Reviewer**: divine-review (adversarial-reviewer profile)
> **Author**: dev (#298 + #307 + #309 연속 cohort)
> **Subject commit**: `724c7e6` → main `9efbfee` (3 files, +52/-5)
> **Pipeline**: analyze → adversarial-scan (peer: codex/quality_auditor, consensus AGREE) → verdict
> **Peer evidence**: exchange `ex_20260503T232252Z_2f694a6d` — APPROVED, HIGH confidence

---

## 1. Scope

dev 가 #308 review F-1 MAJOR finding (이전 review 에서 제가 직접 surface 한 finding) 을 따라 F-X6c 로 정정한 fix 를 검증:

1. `compline.json days.SAT.shortReading`: ref `Revelation 22:4-5` → `Deuteronomy 6:4-7`, text → Shema verbatim, page `519` → `514`.
2. `prayers/commons/compline/SAT.rich.json shortReadingRich`: body → Shema verbatim, page `519` → `514`.
3. `route.test.ts +47`: 2 신규 회귀 test (positive Sun I ref/page/body + negative Sun II ref/page guard).

`days.SUN.shortReading` (Sun II Compline) 무변경, `responsory` / `nuncDimittis` / `blessing` / `concludingPrayer` 모두 무변경 — 모두 검증 완료.

**Author note**: F-X6 cohort 마지막 fix 주장 (#298 page → #307 psalm/antiphon → #309 shortReading 으로 carry-over surface 폐쇄). 본 review 가 "cohort closed" 주장을 cross-check.

## 2. Acceptance Criteria — verdict

| AC | Type | Criterion | Verdict | Evidence |
|----|------|-----------|---------|----------|
| AC-1 | executable | PDF anchor verbatim — p.514-515 line 17793-17802 'Уншлага / Дэд хууль 6:4-7 / Сонс, Израиль аа!...' | **MET** | `sed -n '17787,17812p' parsed_data/full_pdf.txt` 으로 직접 inspection. Body 8줄 (line 17795-17802) 모두 dev's text 와 verbatim 일치. PDF page-514 marker line 17773, page-515 marker line 17811 — Уншлага 헤더 + ref 는 p.514 시작. |
| AC-2 | structural | `compline.json` `days.SAT.shortReading` 필드 정정 + SUN/concludingPrayer/blessing 무변경 | **MET** | `jq` inspection: `days.SAT.shortReading.ref="Deuteronomy 6:4-7"` / `.page=514` / Shema body verbatim ✓. `days.SUN.shortReading.ref="Revelation 22:4-5"` / `.page=519` 무변경 ✓. |
| AC-3 | structural | `SAT.rich.json shortReadingRich` 필드 정정 + 다른 영역 (responsoryRich / gospelCanticleAntiphonRich) 무변경 | **MET** | `Read` SAT.rich.json: shortReadingRich.blocks[0].spans[0].text = Shema verbatim, page=514 ✓. responsoryRich.page=515 + gospelCanticleAntiphonRich.page=515 무변경 (이건 디자인 패턴 — 모든 day rich.json 이 canonical p.515 anchor). |
| AC-4 | structural | Base JSON ↔ rich overlay 텍스트 + page 일관성 | **MET** | `diff <(jq base.text) <(jq rich.text)` → IDENTICAL. 두 파일 page 모두 514. |
| AC-5 | semantic | 'Израиль' soft sign verbatim 보존 (PDF SSOT memory rule) | **MET** | PDF grep: 'Израил' (no suffix) 23, 'Израили' (genitive) 46, 'Израиль' (vocative w/ soft sign) 25. 'Сонс, Израиль аа!' (vocative) 가 PDF 에서 soft-sign 형태이며 dev 가 그대로 보존 ✓. |
| AC-6 | semantic | Shema 4 verses (Deut 6:4-7) 모두 truncate 없이 verbatim | **MET** | v.4 ('Сонс, Израиль аа!...ганц ЭЗЭН.'), v.5 ('Чи Тэнгэрбурхан...хайрла.'), v.6 ('Өнөөдөр чамд...байлгаж,'), v.7 ('хөвгүүдээ үүгээр...түүний тухай ярьж бай.') 모두 dev's text 에 포함. |
| AC-7 | structural | F-X6 cohort closed 주장 cross-check — Sun I First Compline 다른 영역 carry-over 잔여 | **MET** | (a) Nunc Dimittis antiphon: PDF Sun I (line 17832) ↔ Sun II (line 18010) 본문 IDENTICAL — top-level `nuncDimittis` 정확. (b) Responsory body: Sun I (17803) ↔ Sun II (17988) IDENTICAL — top-level `responsory` 정확. (c) Shared commons (responsory/Nunc Dimittis) → all 7 days rich.json anchor canonical p.515 (디자인 패턴, 의도). (d) Compline 에 psalm-prayer / Magnificat 없음. (e) blessing.page=517 → PDF p.517 'Тэгсгөл' line 17873 일치. (f) concludingPrayer.page=516 (#229 F-X4) 일치. **추가 carry-over 잔여 없음**. |
| AC-8 | structural | 2 신규 regression test 적정성 (page+ref+body anchor pin) | **MET** | (a) firstCompline shortReading.ref=`Deuteronomy 6:4-7` + body contains `Сонс, Израиль` + page=514. (b) compline (Sun II) shortReading.ref=`Revelation 22:4-5` + page=519. F-X6b psalm-pin 패턴 미러링. `toContain` for body (drift-tolerant) + `toBe` for ref/page (exact). |
| AC-9 | executable | npm test (915 expected) / tsc / eslint 회귀 0 | **MET** | `npm test`: 46 files / **915 PASS** (913 → +2 신규). `npx tsc --noEmit`: No errors. `npx eslint .`: 0 errors / 16 warnings (모두 pre-existing). 변경 영역 무관. |

**9/9 MET — clean verdict.**

## 3. Adversarial scan — additional findings

### Sun I First Compline 전체 cross-check (PDF p.512-516)

| 영역 | 데이터 위치 | PDF 위치 | 일치 |
|------|------------|----------|------|
| Sun I psalm 1 (Psalm 4) | days.SAT.psalms[0] / antiphon_key compline-sat-ps1 | p.512 line 17727-17732 | ✓ (#307 fix) |
| Sun I psalm 2 (Psalm 134) | days.SAT.psalms[1] / antiphon_key compline-sat-ps2 | p.514 line 17779-17781 | ✓ (#307 fix) |
| Sun I shortReading | days.SAT.shortReading | p.514-515 line 17793-17802 | ✓ (#309 fix — this review) |
| Sun I responsory body | top-level `responsory` | p.515 line 17803-17807 | ✓ (shared commons, 디자인 패턴) |
| Sun I Easter Octave variant | seasonalResponsory.eastertideOctave | p.515 line 17819-17822 | ✓ |
| Sun I Eastertide variant | seasonalResponsory.eastertide | p.515 line 17822-17829 | ✓ |
| Sun I Nunc Dimittis antiphon | top-level `nuncDimittis.antiphon` | p.515 line 17832-17836 | ✓ (Sun I = Sun II IDENTICAL) |
| Sun I Nunc Dimittis canticle | top-level `nuncDimittis.ref="Luke 2:29-32"` | p.515 line 17839 | ✓ |
| Sun I concludingPrayer primary | days.SAT.concludingPrayer.primary | p.516 line 17852-17859 | ✓ (#229 F-X4 fix) |
| Sun I concludingPrayer alternate | days.SAT.concludingPrayer.alternate | p.516 line 17861-17869 | ✓ |
| Sun I blessing | top-level `blessing` page=517 | p.517 line 17873 'Тэгсгөл' | ✓ |

**모든 영역 일치 — "F-X6 cohort closed" 주장 confirmed.**

### Finding F-1 (NIT — informational, no action): Page=514 vs body wrap p.515

**관찰**: PDF 의 Уншлага / Дэд хууль 6:4-7 ref + body 는 PDF p.514 에서 시작 (line 17793 '514' 마커 직후 'Уншлага' line 17793) 하지만 본문 후반부 (line 17801-17802) 가 PDF column wrap 으로 p.515 로 이동.

**평가**: 다른 days.* shortReading entries 도 시작 page 를 anchor 로 사용 (e.g. WED page=533, FRI page=541 모두 reading 시작 page). 일관성 + reader UX (page badge 가 reading 의 시작 위치 가리킴). **No action.** (peer 도 같은 결론.)

### Finding F-2 (LOW — informational, no action): rich overlay shortReading.text 단일-line vs `phrases` block 미사용

**관찰**: SAT.rich.json:shortReadingRich.blocks[0] 가 단일 `para` 의 `text` span. FR-161 의 phrase-unit rendering (verses 단위 줄바꿈) 미적용.

**평가**: shortReading 은 prose form 이고 RichContent flow="natural" / "sentence" mode 가 자동 wrap. phrase-unit rendering 은 시편/찬가 (line-break 의미 있는 텍스트) 에 한정. **현 디자인 의도** ✓. **No action.**

## 4. Test method transparency

| AC-id | Test Level | Method | Actual Command | What Was Asserted | Limitation | level_check |
|-------|-----------|--------|----------------|-------------------|------------|-------------|
| AC-1 | L5 (Observational) | sed line-context inspection | `sed -n '17787,17812p' parsed_data/full_pdf.txt` | PDF lines 17793-17802 verbatim match dev's body | Single-source PDF (no LOTH Latin cross-reference) | OK |
| AC-2 | L3 (Unit) | jq query on compline.json | `jq '.days.SAT.shortReading, .days.SUN.shortReading'` | days.SAT = Deut 6:4-7/p.514/Shema; days.SUN = Rev 22:4-5/p.519 unchanged | Other days slot (MON-FRI) untouched 가정상 | OK |
| AC-3 | L3 (Unit) | Read SAT.rich.json | `Read prayers/commons/compline/SAT.rich.json` | shortReadingRich.text=Shema/p.514; responsoryRich/gospelCanticleAntiphonRich p.515 unchanged | Other day rich.json (MON-SUN) page audit는 cross-check 만 (jq pages query) | OK |
| AC-4 | L3 (Unit) | diff base ↔ rich text + page | `diff <(jq base) <(jq rich)` | IDENTICAL strings + both page 514 | shell escape edge case (몽골 Cyrillic) — diff 0-byte 차 검증 | OK |
| AC-5 | L5 (Observational) | grep 'Израиль' spelling counts | `grep -oE "Израил[ьяи]?" \| sort \| uniq -c` | PDF 사용 spelling: 'Израил'(23) / 'Израили'(46) / 'Израиль'(25). 'Сонс, Израиль аа!' (vocative) preserved | 다른 vocative 사용 cross-section 미수행 | OK |
| AC-6 | L5 (Observational) | manual verse boundary inspection | sed inspection of PDF body 8 lines | v.4 + v.5 + v.6 + v.7 all present | external Bible cross-reference 미수행 (PDF 단일 source) | OK |
| AC-7 | L5 (Observational) | PDF block inspection + jq pages query | sed/grep + cross-check across MON-SUN rich.json | All Sun I First Compline regions (psalm/antiphon/shortReading/responsory/Nunc/concluding/blessing) 일치 | seasonal proper compline override 검토는 #308 review 에서 완료 — 부재 confirmed | OK |
| AC-8 | L3 (Unit) | Read git diff | `git show 724c7e6 -- route.test.ts` | 2 tests pin ref+page+body anchor (Sun I) / ref+page (Sun II) | 실제 실행은 AC-9 가 cover | OK |
| AC-9 | L1 (E2E) | npm test (full suite) | `npm test 2>&1 \| tee /tmp/test-310.log` | 46 files / 915 passed (913 → +2 new), tsc clean, eslint pre-existing only | 모바일 SW 캐시 회귀 manual checklist 미수행 (post-deploy mandate) | OK |

**Anti-cheating verification**:
- Actual Command 모두 NOT_EXECUTED 아님 ✓
- What Was Asserted 모두 NO_ASSERTION 아님 ✓
- Level claims (L1/L3/L5) 와 method 일치 ✓
- Transparency table 본 review doc 에 포함 ✓

## 5. Verdict

**APPROVED**

### Rationale
- Frozen F-X6c scope 정확히 deliver — Sun I First Compline shortReading carry-over 완전 정정.
- PDF SSOT verbatim (line 17793-17802) 와 ref + body + page 모두 일치.
- 'Израиль' soft sign + 4 verses 모두 보존 — truncate / spelling drift 없음.
- Base JSON ↔ rich overlay 일관성 (text + page) — 두 surface 동시 정정.
- 회귀 테스트 강화 디자인이 robust (F-X6b psalm-pin 패턴 미러링 — page+ref+body 동시 pin).
- Sun I First Compline 다른 영역 (psalm/antiphon/responsory/Nunc Dimittis/concluding/blessing) cross-check 완료 — **F-X6 cohort 추가 carry-over 잔여 없음, "cohort closed" 주장 confirmed**.
- Sun II Compline 무영향, 시즌 propers 무영향, top-level commons (responsory/Nunc Dimittis) 무영향.
- npm test 915 PASS (913 → +2 신규), tsc 0 errors, eslint pre-existing only — 회귀 0.

### Issues
없음. (NIT-level F-1, F-2 은 informational only.)

### Recommendation
- Merge as-is (이미 main 에 ff-merge 됨, 9efbfee).
- F-X6 cohort 폐쇄 — 후속 fix task 권고 없음 (#298 / #307 / #309 = 3-step page → psalm/antiphon → shortReading 시퀀스 종료).
- Mobile manual checklist (CLAUDE.md SW navigation policy) 배포 후 점검 권고 (이번에도 JSON 데이터 변경 only — `CACHE_VERSION` bump 불필요).

## 6. Peer evidence

| Field | Value |
|-------|-------|
| peer_role_key | `quality_auditor` |
| provider | `codex` |
| exchange_id | `ex_20260503T232252Z_2f694a6d` |
| peer_stance | `AGREE` (APPROVED) |
| peer_confidence | `HIGH` |
| consensus | AGREE (round 1) |
| degraded_mode | false |

Peer 가 독립적으로 같은 결론: 9/9 MET, 추가 latent defect 없음, page=514 choice 적절 (reading 시작 page = anchor), F-X6 cohort closed 주장 sound (page / psalm-antiphon / shortReading 모두 independently guarded, shared responsory/Nunc Dimittis 는 의도된 commons).

## 7. Files reviewed

| File | LOC delta | Verdict |
|------|-----------|---------|
| `src/data/loth/ordinarium/compline.json` | +3 −3 | MET |
| `src/data/loth/prayers/commons/compline/SAT.rich.json` | +2 −2 | MET |
| `src/app/api/loth/[date]/[hour]/__tests__/route.test.ts` | +47 −0 | MET |

## 8. Test evidence

```
$ npm test 2>&1 | tee /tmp/test-310.log

 Test Files  46 passed (46)
      Tests  915 passed (915)
   Start at  07:21:35
   Duration  5.68s

$ npx tsc --noEmit
TypeScript: No errors found

$ npx eslint .
ESLint: 0 errors / 16 warnings (16 problems, all pre-existing, 변경 영역 무관)
```

## 9. Decision summary

`APPROVED` — F-X6 cohort 마지막 fix 가 PDF SSOT verbatim 정확성 + cross-surface 일관성 + 회귀 테스트 강화 모두 충족. cohort closure claim cross-confirmed. 추가 follow-up 없음.
