# Task #40 — psalter-texts.json ref↔body reconciliation

**Source**: task #39 audit, `verify-psalter-pages.js` manual-review 13건 (D1/D2/D3/C subtype).

**Stage 1 (이번 dispatch, commit)**: D3 1건 완료 + 전체 12건 per-entry 분석 문서화.

**Stage 2/3 (후속 dispatch)**: 나머지 12건 데이터 교정 (subtype 별 배치).

---

## Stage 1 완료

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
