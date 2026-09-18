# Review #227: #225 F-X1c — 4 Marian antiphons phrase-unit + hanging indent (PDF p.544-545)

> **TL;DR** — APPROVED_WITH_ISSUES. 29/29 PDF phrase boundaries 검증 완료. 5 functional files 가 `lines` field 을 일관되게 wire. 8 AC 중 6 MET, 2 PARTIALLY_MET (NIT, defensive 홈만 차이). 머지 권장.

| 메타 | 값 |
|---|---|
| Reviewer | divine-review (adversarial-reviewer) |
| Author | dev |
| Target branch | `worktree-225-dev` (commit `311290a`, 5 functional + 2 generated files / +362 / -10) |
| Base | `c20f4395` |
| Review session | `adhoc-review-227-225-marian` |
| Decision | `dec_1` (APPROVED_WITH_ISSUES, R1 consensus) |
| Peer | quality_auditor (codex), exchange `ex_20260502T143328Z_91b21cde` |

---

## 변경 범위

### Schema + 인프라 (3 files / +24 / -6)

| File | LOC | 변경 |
|---|---|---|
| `src/lib/types.ts` | +13 -1 | `MarianAntiphonCandidate.lines?: string[]` + `HourSection.marianAntiphon.lines?: string[]` optional |
| `src/lib/psalter-loader.ts` | +8 -4 | `ComplineData.marianAntiphon` item type + `marianOptions` array carry `lines?` `page?` |
| `src/lib/hours/compline.ts` | +3 -1 | `assembleCompline` propagates `page` + `lines` from `marian` candidate to section |

### Renderer (1 file / +23 -2)

| File | LOC | 변경 |
|---|---|---|
| `src/components/marian-antiphon-section.tsx` | +23 -2 | 우선순위 `current?.lines ?? section.lines ?? splitMarianTextOnAlleluia(displayText)`. 각 phrase 가 `<p data-testid="marian-antiphon-line" className="pl-6 -indent-6">` 렌더 |

### 데이터 (1 file / +37)

| File | LOC | 변경 |
|---|---|---|
| `src/data/loth/ordinarium/compline.json` | +37 | 4 Marian antiphons (anteMarian.salveRegina + alternatives[0..2]) 모두 `lines: string[]` 추가. Salve 7 / Alma 8 / Regina 6 / Hail Mary 8 phrases. |

### 테스트 (1 file / +284)

| File | LOC | 변경 |
|---|---|---|
| `src/components/__tests__/marian-antiphon-section.test.ts` | +284 | 9 신규 cases — 1 precedence test, 4 PDF anchors (line counts + content per antiphon), 1 fallback test, 1 NFR-002 anchor (line count + Regina Аллэлуяа suffix), 4 L2 integration (assembleCompline 실제 dates 3개 + candidates check). 12 preserved #223 splitMarianTextOnAlleluia fallback tests. |

### 자동 생성 (2 files)

`scripts/out/compline-page-{corrections,review}.json` — `verify-compline-pages.js` 재실행 timestamp 만 갱신.

---

## PDF Spot-Check (manual, parsed_data/full_pdf.txt:18836-18883)

| Antiphon | PDF lines | Authored phrase count | Match |
|---|---|---|---|
| Salve Regina | 18836-18848 | 7 | **7/7 ✓** |
| Аврагчийн хайрт эх (Alma Redemptoris) | 18851-18858 | 8 | **8/8 ✓** |
| Тэнгэрийн Хатан (Regina Caeli) | 18878-18883 | 6 | **6/6 ✓** (PDF 의 'Тэнгэрийн Xатан' 의 Latin X 는 OCR artifact, json 은 정확히 Cyrillic Х) |
| Амар амгалан Мариа (Hail Mary) | 18860-18876 | 8 | **8/8 ✓** (cross-page break at line 18866=p.545 wrap correctly detected as one phrase) |

총 29 phrase boundaries 모두 PDF visual line layout 과 일치. dev 의 heuristic ("capital-letter starts new phrase, lowercase continues wrap") 가 4 antiphons 전부 PDF 에 충실.

---

## AC verdict

| AC | Type | Verdict | Evidence |
|---|---|---|---|
| AC-1 | semantic | **MET** | `compline.json:282/297/312/325` 의 4 `lines` 배열 = `parsed_data/full_pdf.txt:18836-18883` 의 PDF visual phrases (29/29). cross-page wrap 도 정확히 one-phrase 처리. |
| AC-2 | structural | **MET** | types.ts:339 + :716, psalter-loader.ts:153, compline.ts:287, marian-antiphon-section.tsx:64 - `lines` field 전부 일관되게 propagate. |
| AC-3 | executable | **MET** | `marian-antiphon-section.tsx:76` — `(current?.lines ?? section.lines) ?? splitMarianTextOnAlleluia(displayText)`. precedence 명시. test :250-265 검증 (precedence 직접 anchor). |
| AC-4 | structural | **MET** | `marian-antiphon-section.tsx:96` `pl-6 -indent-6` = `psalm-block.tsx:80` 동일 Tailwind class. FR-161 R-13 psalm phrase 시각 패턴 reuse. |
| AC-5 | executable | **PARTIALLY_MET** | absent `lines` → fallback to splitMarianTextOnAlleluia 정상 (test :395-408 anchor). 그러나 **empty `lines: []` defensive gap** — `[]` 은 truthy/defined 이므로 `??` 가 fallback fire 안 함, 결과로 zero `<p>` 렌더. 현재 production 데이터는 모든 lines 가 non-empty (test :495 candidates check 가 보장) 이므로 surface 안 함. |
| AC-6 | executable | **MET** | F-easter-3 selectSeasonalMarianIndex 무변경. test :430+471+455 가 Eastertide → Regina, ADVENT → Alma, Default → Salve 검증. |
| AC-7 | semantic | **PARTIALLY_MET** | `lines` 4 antiphons 모두 PDF verbatim. 그러나 **Hail Mary `text` field 가 PDF 와 다름** — `compline.json:324` text 는 'минь ээ,' (comma) / 'нүгэлт' (lowercase) 보유, `lines` (`:325`) 는 PDF 처럼 'минь ээ' (no comma) / 'Нүгэлт' (capital). 렌더링은 lines 우선이므로 UX 정확. duplicate-source field drift NIT. |
| AC-8 | human-judgment | **MET** | 사용자 요구 4건 visible: (a) Тэнгэрийн Хатан 6 phrase 각 Аллэлуяа! 직후 줄바꿈 ✓, (b) PDF p.544-545 정합 (29/29 검증) ✓, (c) 4 antiphons 모두 PDF 참고 ✓, (d) hanging indent (pl-6 -indent-6) ✓. |

---

## Issues

### I-1 — Empty `lines: []` defensive gap (NIT, low risk)
- **위치**: `src/components/marian-antiphon-section.tsx:76` — `(current?.lines ?? section.lines) ?? splitMarianTextOnAlleluia(displayText)`.
- **상황**: nullish-coalesce 가 `[]` 을 defined-truthy 로 취급. 따라서 `lines: []` (의도치 않은 empty array) 은 splitMarianTextOnAlleluia fallback 을 우회하고 zero phrase `<p>` 렌더.
- **영향**: 현재 production 데이터는 모든 lines 가 non-empty (test :495 가 candidates 의 lines.length > 0 보장). 사용자 직접 미친다 가정 시: dropdown 에서 4 candidates 모두 정상 렌더, ❌ surface.
- **권고 (선택)**: precedence 식을 `(current?.lines?.length ? current.lines : section.lines?.length ? section.lines : splitMarianTextOnAlleluia(displayText))` 로 강화. 현재는 production-safe.

### I-2 — Hail Mary `text` vs `lines` field drift (NIT, UX 영향 0)
- **위치**: `src/data/loth/ordinarium/compline.json:324` (text) vs `:325-334` (lines).
- **상황**: 
  - `text`: "Амар амгалан Мариа минь ээ, Та хишиг ивээлээр... Тэнгэрбурханы эх Мариа Гэгээн минь ээ, Та одоо... нүгэлт..."
  - `lines[0]`: "Амар амгалан Мариа минь ээ" (comma 없음)
  - `lines[5]`: "Тэнгэрбурханы эх Мариа Гэгээн минь ээ" (comma 없음)
  - `lines[7]`: "Нүгэлт..." (capital N — PDF 와 일치)
  - `text`: 'нүгэлт' lowercase.
- **분석**: PDF 원문은 `lines` 와 일치 (no comma at phrase boundaries, capital "Нүгэлт"). `text` 는 더 오래된 transcription 을 join (comma 추가, lowercase 보존) 했었고 deprecated.
- **영향**: 렌더러는 `lines` 우선이므로 사용자 화면은 PDF-faithful. `text` 는 `lines` 부재 시 fallback path 에서만 사용. 현재 4 antiphons 모두 lines 보유 → text 는 dead-data 와 동급.
- **권고 (선택)**: `text` 를 `lines.join(' ')` 으로 정규화하거나, `lines` 가 있을 때 `text` 를 deprecated 표시. NFR-002 strict 정의 ("text mutation 0") 하에선 부분 미충족이나 surface 영향 0.

### I-3 — 테스트 gap: dropdown click 직접 검증 부재 (INFO, no action)
- **상황**: `:250-265` precedence test 는 `selectedIndex: 2` 를 props 로 직접 주입. 실제 dropdown button click → setSelectedIdx → re-render path 는 RTL/jest-dom 으로 단위 테스트 안 함.
- **분석**: 구현 inspection 으로 정확함 확인 (`:144` button onClick → `setSelectedIdx(i)` → React re-render → `current = candidates[selectedIdx]`). 테스트 누락은 review depth 의 한계, 구현 정확성 영향 0.
- **권고 (선택)**: e2e selector 가 이미 있고 (`marian-antiphon-line` testid), Playwright 단계에서 dropdown 시나리오 cover 가능. 별도 단위 테스트 불필요.

---

## Verification evidence

| Gate | Command | Result |
|---|---|---|
| vitest | `vitest run` | **825 passed (44 files), 0 failed** |
| Targeted | `vitest run src/components/__tests__/marian-antiphon-section.test.ts` | (전체에 포함) |
| typecheck | `tsc --noEmit` | clean |
| eslint | `eslint <changed files>` | 0 errors |
| PDF spot-check | manual against `parsed_data/full_pdf.txt:18836-18883` | 29/29 phrases ✓ |
| Hanging indent reuse | `grep -n 'pl-6 -indent-6' src/components/*.tsx` | matches `psalm-block.tsx:80` (FR-161 R-13 pattern) |
| Verifier drift | `git diff scripts/out/compline-page-*.json` | timestamps only |
| User intent | F-X1c #225 사용자 요구 4건 | 모두 충족 |

---

## Recommendation

**APPROVED — merge-ready.** I-1 (empty array defensive gap) 와 I-2 (Hail Mary text/lines drift) 는 모두 NIT, 현재 production 데이터에서 surface 영향 0. I-3 는 information-only.

핵심 강점:
- PDF p.544-545 visual layout 의 29 phrase boundary 에 대한 정확한 dev heuristic
- `lines` field 가 schema/loader/assembler/renderer 4 layer 일관 wire
- 9 신규 vitest + 12 preserved #223 fallback 테스트로 backward-compat 도 안전
- F-easter-3 (#205) 시즌 selector 와 명확히 분리된 path

Verdict 는 독립 peer (`quality_auditor`) consensus 와 일치 (R1).

향후 hardening 권고 (별 nit follow-up):
- 빈 `lines: []` defensive 처리 (length 체크 추가)
- Hail Mary `text` 와 `lines` 정규화 (text deprecation 또는 join 동기)
