# FR-153f pilot — psalter stanzasRich (T9 step 1~3)

- 입력: `src/data/loth/psalter-texts.pilot.json` (3 refs)
- 출력: `src/data/loth/prayers/commons/psalter-texts.pilot.rich.json`
- 빌더 소스: **3A (Source JSON only)**
- indent 버킷: 0 → 0 | 1-3 → 1 | ≥4 → 2
- refrain 검출: ref 내 중복 trimmed-line ≥3 회 → `role: 'refrain'`
- 종합 gate: ✅ PASS (3/3)

## per-ref 결과

### Psalm 63:2-9

- stanza 8 | line 26
- indent (raw leading-space hist): 0sp×2, 3sp×24
- indent (bucketed 0/1/2): 2/24/0
- refrain 검출 keys (≥3x): (없음)
- refrain 라인 수: 0
- gate (a) 텍스트 byte-equal: ✅ PASS (len a/b = 747/747)
- gate (b) 구조 동등성: ✅ PASS (stanza OK; refrain src/rich=0/0)

### Daniel 3:57-88, 56

- stanza 19 | line 84
- indent (raw leading-space hist): 0sp×14, 2sp×14, 3sp×28, 5sp×11, 6sp×17
- indent (bucketed 0/1/2): 14/42/28
- refrain 검출 keys (≥3x): 
  - `Эзэнийг магтагтун`
  - `Түүнийг магтаж`
  - `бүгдийн дээр үүрд мөнх өргөмжлөгтүн`
- refrain 라인 수: 44
- gate (a) 텍스트 byte-equal: ✅ PASS (len a/b = 1931/1931)
- gate (b) 구조 동등성: ✅ PASS (stanza OK; refrain src/rich=44/44)

### Psalm 149:1-9

- stanza 1 | line 25
- indent (raw leading-space hist): 3sp×25
- indent (bucketed 0/1/2): 0/25/0
- refrain 검출 keys (≥3x): (없음)
- refrain 라인 수: 0
- gate (a) 텍스트 byte-equal: ✅ PASS (len a/b = 741/741)
- gate (b) 구조 동등성: ✅ PASS (stanza OK; refrain src/rich=0/0)

## PDF 샘플 실측 (pdfjs-style-overlay)

| book page | half | lines | spans | italic | rubric(all) | rubric(body) | italic % | rubric(all) % | rubric(body) % | smallCaps |
|---:|:---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 58 | left | 30 | 34 | 0 | 7 | 1 | 0.00% | 20.59% | 2.94% | 3 |
| 60 | left | 30 | 35 | 0 | 7 | 2 | 0.00% | 20.00% | 5.71% | 2 |
| 64 | left | 30 | 32 | 0 | 3 | 0 | 0.00% | 9.38% | 0.00% | 2 |

**합계 spans**: 101 | italic 0 (0.00%) | rubric-all 17 (16.83%) | rubric-body 3 (2.97%)

### rubric(all) vs rubric(body) 분류

`rubric(all)` 은 페이지 상의 모든 빨간색 span 을 포함한다. 여기에는:

- 페이지 running header (예: `1 дүгээр долоо хоног`)
- 시편/찬가 ref heading (예: `Дуулал 63:2-9`, `Магтаал Даниел 3:57-88, 56`)
- 시편 subtitle (예: `Тэнгэрбурханаар цангаж буй сэтгэл`)
- 타 시즌 교차 사용 표시 (예: `Дөчин хоногийн цаг улирлын 1 дэх Ням гараг:`)

…이 모두 포함된다. 이들은 **본문 밖 metadata** 로 이미 `psalter/week-*.json` 의 `title` 및 카탈로그 상의 ref 라벨로 저장돼 있고, stanzasRich 의 범위가 아니다.

`rubric(body)` 는 heading-zone + heading-pattern 을 제외한 진짜 본문 내부 rubric span 수.

#### rubric(body) 샘플
- p58: `Тэнгэрбурханаар цангаж буй сэтгэл`
- p60: `Даниел 3:57-88, 56`
- p60: `Эзэний хамаг бүтээлүүд ээ, Эзэнийг магтагтун`

### 3A vs 3C 결정
- 본문 italic 0.00% / rubric-body 2.97% 모두 < 5% → **3A 확정** (3C 업그레이드 이득 낮음)

## 중복 trimmed-line 상위 (refrain 후보)

- **Daniel 3:57-88, 56**: 3 종, 라인 44개
  - `Эзэнийг магтагтун`
  - `Түүнийг магтаж`
  - `бүгдийн дээр үүрд мөнх өргөмжлөгтүн`
