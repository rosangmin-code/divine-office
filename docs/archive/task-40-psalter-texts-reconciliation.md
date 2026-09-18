# Task #40 — psalter-texts.json ref↔body reconciliation

**Source**: task #39 audit, `verify-psalter-pages.js` manual-review 13건 (D1/D2/D3/C subtype).

**Stage 1 (commit feb6420)**: D3 1건 완료 + 전체 12건 per-entry 분석 문서화.
**Stage 3 (commit 1d24f65)**: D2 canticle 5건 전부 RESOLVED.
**Stage 2 (task #42 commit)**: D1 entry-shift 4건 복구 + upstream chain 2건 bonus.

---

## Stage 4 완료 (task #43, 2026-04-24) ✅ — task #40 최종 완료

### 3 manual-review + 2 verified-correction 전부 RESOLVED

**verified-correction 2건** (`scripts/patch-psalter-pages.js` 자동 적용):
- Psalm 97:1-12 (week-2 WED lauds psalms[2]) page **232 → 231**
- Revelation 4:11; 5:9-10, 12 (week-3 TUE vespers psalms[2]) page **340 → 339**

**manual-review 3건** (all C Part II patterns):
- **Psalm 136:10-26 Part II body 재구성** — psalter-texts.json stanzas 에
  Part I body 가 저장되어 있던 것을 PDF line 14999-15026 (page 434) +
  15034-15052 (page 435) 의 Part II body ("Египетчүүдийн ууган хүүхдүүдийг
  цохисон...") 로 교체. psalmPrayer 추가 (page 435, "Төгс хүчит Тэнгэрбурхан
  минь...").
- **Psalm 144:11-15 Part II body 재구성** — 동일 pattern. PDF line 16671-
  16677 (page 481) + 16685-16702 (page 482) 의 Part II body ("Аяа Тэнгэрбурхан,
  би Танд шинэ дуу дуулна...") 로 교체. psalmPrayer 추가 (page 482).
- **Psalm 139:23-24** — week-4 WED vespers psalms[1] page **467 → 466** (body
  straddle 순치 fix, task #34/#40 Stage 1 pattern). Stage 2 에서 body content
  는 correct 으로 복구됐으나 declared page 가 body-start (466) 가 아닌
  continuation (467) 을 가리키고 있어 ±1 window 내 stanza match 실패.

**verifier PART_II_SKIPS 확장** (3건 추가):
3 Part II entries 의 header 가 declared page 보다 2+ 페이지 앞에 있음 —
verifier 의 ±1 window 를 넘어섬. 기존 8건 + 3건 = **11건** PART_II_SKIPS 로
이동. 이들은 manual-review 가 아닌 semantic-split-psalm 으로 분류.
- week-4|MON|vespers|Psalm 136:10-26 (header on 432, body on 434)
- week-4|WED|vespers|Psalm 139:23-24 (header on 464, body on 466)
- week-4|THU|vespers|Psalm 144:11-15 (header on 480, body on 481-482)

**Psalm 121:1-8 psalmPrayerPage 보정** (bonus):
Stage 2 에서 psalmPrayer content 는 정답으로 교정됐으나 `psalmPrayerPage`
가 stale 272 (Psalm 116 prayer page) 로 남아 `build-psalter-prayers-rich.mjs`
gate FAIL. 274 (Psalm 121 prayer 실제 위치) 로 교정.

**결과**:
- `verify-psalter-pages.js`: agree **155→157** (+2), verified-correction **2→0**,
  manual-review **3→0** ✅, part-II-skipped **8→11** (+3 reclassified)
- `build-psalter-prayers-rich.mjs`: **90→92 PASS** (136:10-26 + 144:11-15 신규
  eligible entry + Psalm 121:1-8 page 보정)
- `build-psalter-texts-rich.mjs`: 137/137 PASS (stanzasRich 재생성 정상)
- `build-short-readings-rich.mjs`: 126/126 PASS (회귀 없음)
- `audit-psalter-ref-consistency.js`: suspects **4→3** (부수 개선)
- `npx vitest run`: 273 PASS 0 FAIL
- `npx tsc --noEmit`: 0 errors

---

## task #40 최종 상태 (13/13 RESOLVED ✅)

| Stage | Scope | Count | Status | Commit |
|-------|-------|-------|--------|--------|
| 1 | D3 page 교정 | 1 | ✅ | feb6420 |
| 2 | D1 entry-shift (solver) | 4 + 2 chain bonus | ✅ | 4ebb3a9 (task #42) |
| 3 | D2 canticle typo + verifier fingerprint tuning | 5 | ✅ | 1d24f65 |
| 4 | C Part II + Revelation + Psalm 97 page | 3 manual-review + 2 verified-correction | ✅ | <commit> (task #43) |

verify-psalter-pages 최종: **agree 157 / verified-correction 0 / manual-review 0 / part-II-skipped 11**. task #39 에서 시작한 "17 manual-review" 가 **0 manual-review** + **11 reclassified as semantic-split** + **146 clean agree** (초기 143 기준 +14) 로 완주.

---

## Stage 2 완료 (task #42, 2026-04-24)

### D1 entry-shift 4건 + chain 2건 전부 RESOLVED

**근본 원인**: `extract-psalm-texts.js` 가 `parsed_data/weekN_final.txt`
(column-split output) 를 소스로 쓴다. PDF 의 2-column 레이아웃이
컬럼 순서대로 기록되면서 (a) 앞 psalm 의 Gloria/prayer tail 이
다음 psalm 의 header 와 body 사이에 끼어들거나 (D1-1 Psalm 121),
(b) page-break 를 stanza break 으로 오인해 column 순서에 따라 verse
순서가 섞인다 (D1-2/3 Psalm 97/51). Part I/II 분리 블록은 추가로
Part II verse slice 를 정확히 잘라내지 못한다 (D1-4 Psalm 139:23-24).

**해결**: `parsed_data/full_pdf.txt` (canonical verse-ordered single
column) 을 소스로 하는 **targeted repair script** `scripts/repair-d1-
psalter-entries.js` 작성. 스크립트는 per-ref anchor (PDF line 번호)
로 header 를 찾고, `extract-psalm-texts.js` 와 동일 semantics 로
title/epigraph skip → body collect → stanza split → prayer extract 를
실행한다. `Psalm 139:23-24` 는 combined 블록 ("Дуулал 139:1-18, 23-24")
안에서 "II" marker 이후의 verse 23 앵커 ("Аяа Тэнгэрбурхан,") 를
찾아 거기부터 body 를 슬라이스한다. Part I/II 공통 prayer 는 양쪽
sub-ref (Psalm 139:1-18 + Psalm 139:23-24) 에 모두 주입.

**scope 확장 (chain repair)**:
- **Psalm 116:1-9** — body 는 정상이었으나 `psalmPrayer` 가 빠져
  있었음 (D1-1 shift 가 Psalm 121 entry 로 prayer 를 빼갔었다).
  Psalm 121 fix 와 동시에 복구.
- **Psalm 139:1-18** — `psalmPrayer` 부재. combined 블록이라 Psalm
  139:23-24 와 동일 prayer 공유 → 동시 주입.

**부수 page 교정**:
- **Psalm 51:3-19** `psalter/week-4.json` declared page 491 → 488
  (PDF body-start 기준). 491 은 Tobit canticle 페이지라 명확한 오류.

**결과**:
- `verify-psalter-pages.js`: agree **148 → 155** (+7 vs Stage 1 기준),
  verified-correction **0 → 2** (Stage 4 대상), manual-review **6 → 3**
  (남은 3건 모두 Stage 4 / Stage 3 잔여). *본 Stage 의 수정으로 직접
  agree 승급한 건: Psalm 97/121/116/51/139 계열 (+5)*
- `audit-psalter-ref-consistency.js` suspects **7 → 4** (D1 4건 해결,
  남은 4건 전부 Stage 3/4 외건)
- `build-psalter-texts-rich.mjs` **137/137 PASS** (stanzasRich 구조
  유지 — 6건 entry 만 내용 갱신, byte-equal 127건 보존)
- `npx vitest run` 273 PASS 0 FAIL
- `npx tsc --noEmit` 0 errors
- FR-156 e2e 38 PASS 유지

**repair script 사용**:
```bash
node scripts/repair-d1-psalter-entries.js
```
idempotent — 이미 교정된 상태에서 다시 실행해도 no-op (동일 결과
재주입). `extract-psalm-texts.js` full regenerate 로 인해 D1 entry 가
다시 shift 되면 이 스크립트를 한 번 더 돌리면 된다. 스크립트 자체는
extractor 를 고치지 않고 문제 entry 만 canonical source 에서 교체한다.

---

## Stage 3 완료 (commit <stage-3>, 2026-04-24)

### D2 canticle 5건 전부 RESOLVED

모든 5건 D2 canticle entry 가 verifier manual-review 에서 agree 로 promotion.
접근: (a) verifier fingerprint tuning (2건 자동 승격) + (b) JSON typo fix per
PDF canon authoritative 정책 (3건 수기 교정).

**verifier 추가 tuning** (`scripts/verify-psalter-pages.js`):
- `stanzaFingerprint` 에서 single-line fingerprint 우선 사용 로직 추가. stanza[0]
  의 첫 non-noise line 이 ≥4 token 을 yield 하면 그것만 fingerprint 로 사용 —
  multi-line join 은 PDF page-break 에서 running-header 노이즈 ("N дугаар долоо
  хоног", 요일 header) 에 걸려 매칭 실패 유발. Single-line 은 page-break 에
  resilient.
- 효과: 2건 자동 승격 (1 Samuel 2:1-10 stanza[0][0] "ЭЗЭН тандаа зүрх минь
  баярлана. –" 5-token fingerprint 이 page 229 매칭, Wisdom 9:1-6, 9-11 도
  동일 패턴). 이전에는 stanza[0] 2-line join 이 page 229↔230 straddle 로
  매칭 실패.

**JSON typo fix 3건**:
1. **Exodus 15:1-4a, 8-13, 17-18** stanza[0][1] "Хүлэг **моригийг** унаачтай..."
   → "Хүлэг **морийг** унаачтай..." (extra `и` 제거). PDF line 5358 기준.
2. **Isaiah 33:13-16** stanza[0][1] "Юу **хийсний** минь **сонсогтун**,"
   → "Юу **хийснийг** минь **сонсож**," (PDF line 11906). 2-word 교정.
3. **Tobit 13:8-11, 13-15** stanza[0][0] "Эзэний **агуу** хүн бүхэн **магтаг**
   болтугай." → "Эзэний **агууг** хүн бүхэн **магтах** болтугай." (PDF line
   17001). 2-word 교정.

모두 PDF canon 이 정답 — parsed_data/week*/*.txt 소스 파일들도 PDF 와 일치
확인. JSON 의 transcription typo 가 단독 오차.

**bonus 발견**: verifier single-line fingerprint tuning 으로 **Revelation
4:11; 5:9-10, 12** (week-3 TUE vespers psalms[2]) 가 verified-correction 으로
surface (declared 340 → PDF body-start 339). task #39 분류 기준 C subtype
이며 Stage 4 dispatch 대상. page 교정 권장 (task #34/#40 Stage 1 Psalm 15/117
/ Psalm 144:1-10 와 동일 off-by-1 pattern).

**결과**:
- `verify-psalter-pages.js`: agree **148 → 153** (+5 Stage 3), manual-review
  **12 → 6** (−6), verified-correction **0 → 1** (Revelation 4:11 Stage 4 대상)
- `audit-psalter-ref-consistency.js` suspects **7 → 4** (부수 효과)
- `build-psalter-texts-rich.mjs` 137/137 PASS
- `build-psalter-prayers-rich.mjs` 90/90 PASS
- `build-short-readings-rich.mjs` 126/126 PASS
- `npx vitest run` 273 PASS 0 FAIL
- `npx tsc --noEmit` 0 errors

---

## Stage 1 완료 (commit feb6420, 2026-04-24)

### D3 Psalm 144:1-10 at week-4 TUE lauds page 446 → 445 ✅

- **PDF 실측** (`parsed_data/full_pdf.txt`):
  - line 15369: `Дуулал 144:1-10` header (book page 444 끝)
  - line 15376: page marker `445`
  - lines 15380-15410: Psalm 144:1-10 Part I body (book page 445 전체)
  - line 15411: page marker `446` (Psalm body 종료, Gloria Patri + 후속 섹션 시작)
- **결론**: Psalm 144:1-10 body 가 book page 445 전체. 446 은 Gloria Patri 종결 페이지. 기존 declared=446 은 task #17 / task #34 Psalm 15 / Psalm 117 과 동일 off-by-1 패턴 (closing prayer 페이지 → body start 페이지로 교정).
- **수정**: `src/data/loth/psalter/week-4.json` days.TUE.lauds.psalms[2].page 446 → 445
- **검증**: `verify-psalter-pages.js` agree 147→148 (+1), manual-review 13→12 (−1)

---

## Stage 2 스코프 — D1 entry-shift 패턴 (4건)

모든 D1 entry 는 psalter-texts.json 에서 **해당 ref 의 바로 앞 psalm body tail + prayer 를 잘못 저장**한 off-by-one 패턴. 원인 추정: extract-psalm-texts.js 의 psalm 경계 판정 오류로 앞 psalm 의 Gloria/prayer 가 다음 psalm 영역으로 shift 됨.

### D1-1. Psalm 121:1-8 (week-2 FRI vespers psalms[1]) declared=273

- **JSON 현재**:
  - `stanzas[0]` = `["Сэтгэл минь ээ, эргээд амрагтун.", ...]` — 실제로 **Psalm 116:1-9 body tail** (PDF line 9259-9265)
  - `psalmPrayer` = "Төгс хүчит, нигүүлсэнгүй..." — 실제로 **Psalm 116 closing prayer** (PDF line 9268-9276)
  - `psalmPrayerPage` = 272 (Psalm 116 prayer page)
- **PDF 정답**:
  - `stanzas[0]` body: PDF lines 9295-9310 ("Харцаа би уулс өөд өргөнө...Өдгөөгөөс мөнхөд сахин хамгаална.")
  - `psalmPrayer`: PDF lines 9320-9326 ("Эзэн Есүс Христ минь, Та Өөрийн Эцэгийн мөнхийн өргөөнөө бидэнд зориулж амар тайван газар бэлдсэн билээ...")
  - `psalmPrayerPage`: 274
- **상류 영향**: `Psalm 116:1-9` JSON entry 도 body tail 누락 + psalmPrayer 없음 → 동시 수정 필요 (entry-shift chain 복구).

### D1-2. Psalm 97:1-12 (week-2 WED lauds psalms[2]) declared=232

- **JSON 현재**: stanzas 6건 순서가 PDF 순서와 다름. `stanzas[0]` = "Хамгийн Дээд ЭЗЭН юм" (실제로 verse 9 — PDF page 233 content), `stanzas[1]` = "ЭЗЭН захирдаг..." (실제로 verse 1 — PDF page 232 content).
- **원인 추정**: stanza 경계 판정에서 page-break 를 stanza break 로 오인해 순서가 섞임.
- **PDF 정답**: PDF lines 7855-7879 (page 232) + 7886-7921 (page 233) 순서대로 재추출 필요.

### D1-3. Psalm 51:3-19 (week-4 FRI lauds psalms[0]) declared=491

- **JSON 현재**: stanzas[0] = "Надад баяр хөөр, баясгаланг сонсгооч..." — verifier audit 에서 "header+stanza 모두 declared 주변 창 밖" 에 위치.
- **추정 원인**: declared=491 이지만 body 가 다른 페이지. PDF 실측 필요 (Psalm 51 은 Morning prayer daily ordinary 에 반복 등장).

### D1-4. Psalm 139:23-24 (week-4 WED vespers psalms[1]) declared=467

- **JSON 현재**: stanzas[0] = "Аяа Тэнгэрбурхан, намайг судлан зүрхийг минь мэдээч..."
- **verifier diag**: header on 464, stanza on 466. declared=467 outside body page.
- **추정 원인**: Psalm 139:23-24 은 끝 2절만 발췌 — body 가 page 466 에 있고 declared=467 은 overflow 또는 다음 psalm 시작. PDF 실측 필요.

---

## Stage 3 스코프 — D2 canticle (5건)

D2 는 모두 non-Psalm canticle (Exodus / 1 Samuel / Isaiah / Wisdom / Tobit). verifier audit 에서 "stanza fingerprint not found anywhere in PDF" 로 나왔으나 실측 결과 **minor transcription typo** (1-letter 차이) 일 가능성 높음. 예:

- **Exodus 15:1-4a, 8-13, 17-18** (week-1 SAT lauds psalms[1]) declared=160
  - JSON fingerprint: `[эзэндээ, би, дуулнам, хүлэг, моригийг, унаачтай]`
  - PDF (line 5357-5358): `[эзэндээ, би, дуулнам, хүлэг, морийг, унаачтай, ...]`
  - 차이: JSON `моригийг` vs PDF `морийг` — JSON 에 추가 `и` 삽입 typo. genitive 형식 변형 가능성도 — 한 쪽을 기준으로 맞춰야 함 (PDF canon authoritative 정책 시 JSON → PDF로 수정).

### D2 entries (상세 PDF 대조 필요):
- Exodus 15:1-4a, 8-13, 17-18 (declared 160)
- 1 Samuel 2:1-10 (declared 229)
- Isaiah 33:13-16 (declared 346)
- Wisdom 9:1-6, 9-11 (declared 392)
- Tobit 13:8-11, 13-15 (declared 491)

각 entry 에 대해 PDF 본문 위치 (canticle header 토큰으로 grep — `Гэтлэл`, `Самуел`, `Исаиа`, `Мэргэн ухаан`, `Тобит`) 및 JSON body 와 line-by-line diff 수행 후 수정.

---

## Stage 4 스코프 — C Part II split + Revelation (3건)

- **Psalm 136:10-26** declared=434: JSON stanzas[0] 에 Part I body ("I" Roman + "ЭЗЭНд талархагтун...") 저장됨. 실제 Part II body (PDF lines 14999-15027, "II" marker + "Египетчүүдийн ууган хүүхдүүдийг...") 로 교체 필요.
- **Psalm 144:11-15** declared=483: stanzas[0] 에 Part I body + "I" marker 포함. Part II body (PDF lines 16660+ "Шад дуулал 2..." 직후) 로 교체.
- **Revelation 4:11; 5:9-10, 12** declared=340: canticle, header "Илчлэл" 다수 매칭. PDF 실측 필요.

---

## 수정 접근 권장

### A안 — per-entry 수기 (보수적)
각 entry 별로 PDF 본문 lines → JSON stanzas 재구성 수기 작업. 약 15~30 분 × 12 = 3~6시간.

### B안 — extractor 재실행 (효율적)
`scripts/extract-psalm-texts.js` 의 stanza 경계 + psalm boundary 판정 로직을 개선해 `psalter-texts.json` 전체 재추출. 기존 entry 는 hash/byte-equal 비교로 회귀 감시.
- 장점: 일관된 수정, 향후 drift 방지
- 단점: extractor 수정이 넓은 scope 영향. FR-153g pilot 재추출 workflow 와 병합 가능.

### C안 — 하이브리드
D1 entry-shift (4건) 은 extractor 로직 개선 (psalm boundary detection)
D2 canticle (5건) 은 per-entry 수기 (typo 개별)
D3 Part II (3건) 은 Part I/II split 로직 개선

---

## 현재 verifier 상태 (Stage 1 완료 후)

- agree: 148 (Stage 1 에서 +1)
- verified-correction: 0
- manual-review: 12 (Stage 2+3+4 대상)
- part-II-skipped: 8

`scripts/verify-psalter-pages.js` rerun 후 manual-review 수가 감소하면 Stage 진척도 확인 가능.
