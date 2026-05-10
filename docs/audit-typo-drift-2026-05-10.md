# Typography drift 6 typos / 5 refs identify — 2026-05-10

**Audit by**: divine-researcher (Explore profile, read-only) — task #465
**Doc materialized by**: leader
**main HEAD**: 7dd70a19 (#463 Phase 2-D merged)

## TL;DR

#454 CAT-A1 9 refs 중:
- PASSED (#456): 1 ref (Revelation 4:11)
- Byte-identical (typo 아님, line-count residual): 2 refs (Psalm 118:1-16 b3, Isaiah 38:10-14 b8)
- **Typography drift**: 5 refs / 6 typos

**Apply PDF (4 unambiguous, Phase 2-E)**: 4 refs / 4 typos
**Defer + user escalate**: 1 ref (1 Samuel 2:1-10 b2) / 2 typos

## §1. CAT-A1 candidate 매핑

| Ref/block | Status | Reason |
|---|---|---|
| Revelation 4:11; 5:9-10, 12 b1 | PASSED (#456) | reverse-bridge fix |
| Psalm 118:1-16 b3 | NOT typography — byte-identical | line-count residual (depth-progression) |
| Isaiah 38:10-14, 17-20 b8 | NOT typography — byte-identical | line-count residual (cross-column wrap unresolved) |
| **1 Samuel 2:1-10 b2** | **Typography drift (2 typos)** | DEFER both (OCR + semantic) |
| **Isaiah 33:13-16 b2** | **Typography drift (1 typo)** | Apply PDF |
| **Jeremiah 14:17-21 b2** | **Typography drift (1 typo)** | Apply PDF |
| **Wisdom 9:1-6, 9-11 b2** | **Typography drift (1 typo)** | Apply PDF |
| **Psalm 135:1-12 b3** | **Typography drift (1 typo)** | Apply PDF |

## §2. Phase 2-E apply scope (4 unambiguous typos)

### Typo #2 — Isaiah 33:13-16 b2

- rich.json 44466: `Муу үзэхгүйн тулд нүдээ анигч нь`
- PDF 11926: `Мууг үзэхгүйн тулд нүдээ анигч нь`
- Diff: rich missing accusative 'г' — `Муу` → `Мууг`
- Decision: **Apply PDF** (clear data-quality typo)

### Typo #3 — Jeremiah 14:17-21 b2

- rich.json 47226: `хэрэн хэсүүлсээр явжээ.`
- PDF 13042: `хэрэн хэсүүчлэхээр явжээ.`
- Diff: different verb stem (хэсүүл- vs хэсүүчл-) — `хэсүүлсээр` → `хэсүүчлэхээр`
- Decision: **Apply PDF**

### Typo #4 — Wisdom 9:1-6, 9-11 b2

- rich.json 48428: `Хэн ч бас гэж тооцогдох болно.`
- PDF 13561: `Хэн ч биш гэж тооцогдох болно.`
- Diff: rich `бас` (also) vs PDF `биш` (not) — semantic flip
- Decision: **Apply PDF** (PDF semantic 가 zin-context 에 적합 — '아무도 not 으로 간주됨')

### Typo #5 — Psalm 135:1-12 b3

- rich.json 47555: `Далайнууд ба`
- PDF 13249, 14815 (consistent 2 instances): `Далайнуудад ба`
- Diff: rich missing dative-locative 'ад' — `Далайнууд` → `Далайнуудад`
- Decision: **Apply PDF**

## §3. DEFER + user escalate (1 Samuel 2:1-10 b2 — 2 typos)

### Typo #1 — `Тэнгэрбурхан ЭЗЭН` (with-space) vs `ТэнгэрбурханЭЗЭН` (no-space)

- rich.json 29507: `Хамгийг мэдэгч Тэнгэрбурхан ЭЗЭН тул`
- PDF 7791: `Хамгийг мэдэгч ТэнгэрбурханЭЗЭН тул`
- Diff: PDF 두 단어 사이 공백 없음 (concatenation)
- **PDF directionality**: PDF 의 `ТэнгэрбурханЭЗЭН` (no-space) 은 line 7791 의 단 1회만, 정상형 `Тэнгэрбурхан ЭЗЭН` (with-space) 은 PDF 25회 출현. → PDF OCR/typesetting artifact 로 강력 추정
- Decision: **DEFER (rich.json 유지)** — PDF defect 반영하면 회귀

### Typo #6 — `үйлсийг` (plural) vs `үйлийг` (singular)

- rich.json 29516: `Хамаг үйлсийг дэнслэгч нь чухамдаа Тэр билээ.`
- PDF 7792: `Хамаг үйлийг дэнслэгч нь чухамдаа Тэр билээ.`
- Diff: rich `үйлсийг` (plural accusative, '행동들을') vs PDF `үйлийг` (singular accusative, '행동을')
- **Semantic nuance**: 1 Samuel 2:3 영문 표준은 'by Him deeds (pl.) are weighed' — plural 가 의미상 더 자연스러우나 PDF SoT 는 singular
- Decision: **DEFER + user escalate** — semantic 의미 변형 (plural → singular) 은 leader 단독 결정 부적절

## §4. 잔여 line-count residual 2 refs (별 task)

- **Psalm 118:1-16 b3** = depth-progression issue (depth=2 isolated PASS, batch break at depth=1) — process-fx11-phase2-batch.mjs depth handling 별 task
- **Isaiah 38:10-14, 17-20 b8** = cross-column wrap residual — reverse-bridge unresolved 케이스 (matcher 추가 보강 또는 manual phrase 단위 분할)

## §5. References

- `parsed_data/full_pdf.txt:7789-7792` (1 Samuel 2:1-10 b2 PDF)
- `parsed_data/full_pdf.txt:11926` (Isaiah 33:13-16 b2 PDF)
- `parsed_data/full_pdf.txt:13042` (Jeremiah 14:17-21 b2 PDF)
- `parsed_data/full_pdf.txt:13561` (Wisdom 9:1-6 b2 PDF)
- `parsed_data/full_pdf.txt:13249, 14815` (Psalm 135:1-12 b3 PDF)
- `src/data/loth/prayers/commons/psalter-texts.rich.json:29388-29521` (1 Samuel 2 b2)
- `src/data/loth/prayers/commons/psalter-texts.rich.json:44320-44466` (Isaiah 33 b2)
- `src/data/loth/prayers/commons/psalter-texts.rich.json:47098-47226` (Jeremiah 14 b2)
- `src/data/loth/prayers/commons/psalter-texts.rich.json:47377-47569` (Psalm 135 b3)
- `src/data/loth/prayers/commons/psalter-texts.rich.json:48219-48433` (Wisdom 9 b2)
- `docs/audit-drift-residual-2026-05-09.md` (#454 audit)
- `docs/audit-drift-refs-2026-05-09.md` (#448 audit)
- #456 solver completion (audit_caveat 6 typos verbatim)
