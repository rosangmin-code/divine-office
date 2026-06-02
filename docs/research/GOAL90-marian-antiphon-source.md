# GOAL #90 Step1 — MM 정의 + 성모 Benedictus/Magnificat 후렴 원문 확보

- **작성**: dvo-sol (research, task #91 / `[#90-sub-1]`)
- **일자**: 2026-05-30
- **GOAL**: 토요일 성모 기념(saturday-mary) 아침기도에 성모 고유 Benedictus 후렴 추가(1안). vespers Magnificat 후렴도 데이터에 추가(대축일 전야엔 정당 suppress) — *단 원문 확보 결과 이 가정에 중대 단서 발견(§3.2)*.
- **범위**: 이번 step은 **MM 정의 + authentic 원문 확보만**. 코드/데이터 수정 절대 금지. **기계번역 금지** — 모든 텍스트는 breviary SoT(`parsed_data/propers/propers_final.txt`) 직접 인용.
- **peer**: codex 제공자가 호출 시 일관 PROVIDER_ERROR('Reading prompt from stdin') → **DEGRADED MODE(solo)**. 단 모든 findings는 소스 file:line 직접 인용으로 독립 검증 가능(아래 라인번호로 누구나 대조).

---

## 1. MM (Mental Model) 정의

| 항목 | 내용 |
|---|---|
| **intended** | 사용자가 '토요일 성모 기념'을 선택하면 아침기도(Lauds)의 Benedictus(Захариагийн магтаал = 즈가리야 노래) 후렴이 **평일(ferial)과 다른 성모 고유 후렴**으로 표시된다. |
| **observable** | 렌더된 Benedictus 후렴 텍스트 = breviary 토요일 성모 기념 원문(propers_final.txt L9853-9882). task #89에서 확인된 ferial 후렴("Эзэн минь, Та биднийг амар амгалангийн зам мөрөөр хөтөлнө үү")과 달라야 한다. |
| **non-goals** | 시편후렴·짧은독서·응송·지향(=완전 성모 공통, 2안)은 범위 외. 스키마/렌더러 변경 없음 — 기존 `gospelCanticleAntiphon` 필드 재사용. |
| **AC link** | **[D1]** 성모 선택 시 Benedictus 후렴이 평일과 다르게 렌더. **[D2]** 렌더 후렴 = breviary authentic 원문(byte 일치). |

---

## 2. 출처 및 매핑

- **SoT**: `parsed_data/propers/propers_final.txt` (4주 시편집 + propers). 토요일 성모 기념 섹션 = **L9767–10037+**, breviary book page **861–868**.
- **앱 데이터 현황**: `src/data/loth/sanctoral/memorials.json` saturday-mary = `{name, rank, note, lauds:{concludingPrayer, concludingPrayerPage:865}, vespers:{concludingPrayer, concludingPrayerPage:865}}` — **현재 후렴 데이터 없음**(task #89 확인). `concludingPrayer`는 L9952-9966(p865-867)과 일치 확인됨.
- **용어(glossary 대조)**: `Захариагийн магтаал` = **Benedictus**(즈가리야 노래, Lauds 복음찬가), `Мариагийн магтаал` = **Magnificat**(마리아 노래, Vespers 복음찬가). 출처: `glossary/sources/bible_gospels.jsonl:45` (Luke 1 헤딩 "Захариагийн эш үзүүллэг"/"Мариагийн магтаалын дуу").

---

## 3. 원문 확보 결과

### 3.1 Benedictus 후렴(Lauds) — ✅ 확보 성공

- **위치**: `parsed_data/propers/propers_final.txt` **L9853**(헤더 `Захариагийн магтаал`) → L9854 안내 `Дараах шад магтаалуудын дундаас аль нэгийг сонгож болно:`(다음 후렴 중 **하나를 선택**) → **6개 옵션**(L9856–9882). breviary book page **863–864**.
- breviary가 6개 중 택1 구조이므로, 앱 default 후렴 선택은 **하위 step(#93 spec/design)의 결정사항**. 아래는 원문 verbatim(키릴, 기계번역 아님):

1. (L9856-9864) **Төгс жаргалт Цэвэр Охин Мариагийн дурсахуйд зориулсан энэ өдрийг агуу их бишрэлтэйгээр ёслон тэмдэглэцгээе. Тэр Эзэн Есүс Христтэй хамт бидний төлөө зуучлан залбирах болтугай.**
2. (L9865-9867) **Дээдийн дээд Эзэн Тэнгэрбурхан энэ дэлхий дээрх бүх эмэгтэйчүүдээс илүү Цэвэр Охин Мариа таныг адисалсан.**
3. (L9868-9871) **Гэм нүгэлгүй, Цэвэр Ариун Мариа таны ачаар алдсан амьдралыг маань бидэнд дахин хайрлан соёрхсон юм. Та тэнгэрээс хүүхэд хүлээн аваад, дэлхийн Аврагчийг төрүүлсэн.**
4. (L9872-9875) **Амар амгалан Мариа минь ээ, Та хишиг ивээлээр бялхам билээ. Эзэн Тантай хамт байна. Таныг эмэгтэйчүүдийн дундаас адисалсан билээ. Аллэлуяа!**
5. (L9876-9879) **Гэм нүгэлгүй Цэвэр Ариун Мариа минь ээ, би таныг магтах үгсийг хэрхэн олох вэ? Учир нь таны ачаар бид манай аврагч Эзэн Есүс Христийг хүлээн авсан.**
6. (L9880-9882) **Та бол Израилийн баяр хөөр, Йерусалимын цог жавхлан юм. Та бол манай үндэстний дээд зэргийн нэр төр юм.**

> 권장(잠정, 하위 step 확정 대상): 옵션 1이 가장 일반적("성모 기념에 바쳐진 이 날을 큰 경배로 기념하자… 성자와 함께 우리를 위해 zuuchlal[중재]하시기를")이라 default로 적합. 단 6개 모두를 데이터에 보존하고 1을 default로 두는 안 / 1만 채택하는 안은 #93에서 사용자·리더 확정.

### 3.2 Magnificat 후렴(Vespers) — ⚠️ 원문 부재(추측 금지 → 사용자 확인 필요)

- **확보 실패 — 단, 이는 데이터 누락이 아니라 전례 구조상 부재**: 토요일 성모 기념 섹션(L9767–10037)은 **Урих дуудлага(초대)+Өглөөний даатгал залбирал(아침기도)만** 수록. **`Оройн даатгал залбирал`(저녁기도)도, `Мариагийн магтаал`(Magnificat) 후렴도 없음.** (grep L9767-10120 → Vespers/Magnificat 0건.)
- **전례적 근거**: 토요일 성모 기념은 **Lauds 전용** 준례다. 토요일 저녁기도는 항상 다음 주일의 **제1저녁기도**이므로, 토요일 성모 기념 자체에는 Vespers/Magnificat이 없다. (task #89에서 2026-05-30 vespers가 삼위일체 대축일 제1저녁기도로 렌더됨을 실증 — saturday-mary는 vespers에서 항상 정당 suppress.)
- **'성모 공통(нийтлэг шинж)'**: L9784에서 찬가 출처로 **참조만** 됨. 그 Common 섹션의 Vespers/Magnificat 전문은 `propers_final.txt`·`propers_full.txt` 어디에도 **없음**(별도 full_pdf/Marian Common 문서 영역으로 추정, 미파싱).

**→ GOAL 가정('Magnificat 후렴도 데이터에 추가')에 대한 중대 단서**: saturday-mary용 **authentic Magnificat 후렴 원문이 존재하지 않는다**. 추측·기계번역으로 채우는 것은 금지. 사용자 확인이 필요한 2개 안:

- **(A) Magnificat 생략(권장)** — 전례적으로 정확. 토요일 성모 기념은 Lauds 전용이고 토요일 vespers는 항상 주일 제1저녁기도라, 성모 Magnificat을 데이터에 넣어도 **실제로 렌더되는 일이 영구히 없음**(task #89 실증). 즉 1안의 가치는 **Benedictus(Lauds) 후렴 추가에 집중**되고 Magnificat은 불필요.
- **(B) Common of the BVM에서 Magnificat 조달** — '성모 공통'의 Vespers Magnificat 후렴을 별도로 찾아(full_pdf/Marian Common PDF 영역) 추가. 단 그 섹션이 현재 파싱된 propers에 없으므로 **별도 원문 확보 작업 + 출처 page 확인 + 사용자 승인** 필요. 데이터엔 넣되 suppress한다는 GOAL 가정은 (B)를 택해야 성립하나, 렌더되지 않을 데이터를 추가하는 실익은 낮음.

---

## 4. 확보 상태 요약

| 후렴 | 상태 | 출처 | 비고 |
|---|---|---|---|
| **Benedictus(Lauds)** | ✅ **SUCCESS** | propers_final.txt L9853-9882, book p863-864 | 6개 옵션, default 선택은 #93 결정 |
| **Magnificat(Vespers)** | ⚠️ **NOT FOUND** | (토요일 성모 기념 섹션에 부재) | 전례상 Lauds 전용 → 사용자 확인: (A)생략 권장 / (B)Common 조달 |

---

## 5. 사용자 확인 필요 사항(리더 경유)

1. **Magnificat 처리**: (A) 생략 — Benedictus만 추가(전례 정확·권장) / (B) Common of the BVM에서 Magnificat 별도 조달(추가 원문확보 작업 필요). **추측 채움은 불가.**
2. **Benedictus default**: 6개 옵션 중 default 1개(권장: 옵션1) vs 6개 전부 보존+택1 UI. (#93 확정 대상, 사용자 취향 확인 가능.)

---

## 6. 한계 / 잔여

- **DEGRADED MODE**: peer(codex) 호출 일관 실패(PROVIDER_ERROR 'Reading prompt from stdin')로 적대적 교차검증 미수행. 단 모든 findings는 propers_final.txt 직접 인용(L번호 명시)이라 리더/리뷰어가 동일 라인 read로 독립 검증 가능 — 증거 강도 유지.
- breviary book page → /pdf 뷰어 매핑: `bookPageToPdfPage(863)=floor(863/2)+1=432`, `(864)=433`. 앱 /pdf 뷰어로 인쇄면 교차확인 가능(이번 step 범위 외, 필요시 #92).
- 코드/데이터 **미수정**(검증·확보만). 실제 데이터 추가는 #96(develop).
