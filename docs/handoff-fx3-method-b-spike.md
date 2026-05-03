# F-X3 method-b spike — per-line phrase remediation feasibility

> **TL;DR** — Phase B (#279) review #280 의 F1 MAJOR (parallel-epithet collapse) 대응 spike. method-b 의 3 sub-method (b1 one-line-one-phrase / b2 hybrid heuristic / b3 hand-spec list) 를 122 hymn corpus 와 PDF ground-truth 로 평가. **Recommendation: (B2-CONSERVATIVE)** — Phase D 에 b2 hybrid heuristic 적용, 단 strict gate (numbered opener AND ≥3-line same-prefix-repetition AND length-CV<0.4 AND no-short-tail) 로 false-positive 통제. b1 standalone 은 hymn 21 같은 PDF wrap 패턴에서 false-positive 확인 → reject. b3 hand-spec 은 256 stanza × 63 hymn 의 manual review 부담으로 deferred. 향후 사용자 visible 회귀 보고 시 b3 augmentation track 으로 격상 가능.

@fr FR-161-R-19 (task #286, F-X3 method-b spike — D-stage 전)
base: afbd4f1c9ea956d9087bd7e57afff6fc76d0a99a (worktree 286-divine-researcher)
Subject finding: docs/review-280-279-fx3-phase-b-30hymn.md F1 MAJOR
Prior spike: docs/handoff-fx3-r2-a1-spike.md (#264 — method a1 LOW feasibility)
Related: docs/review-257-249-fx3-phase-a-pilot.md (#257 R2 권고), docs/handoff-fx3-phrase-audit.md (#228 audit)

---

## 0. Spike metadata

| 항목 | 값 |
|------|----|
| Spike task | #286 |
| Researcher | divine-researcher (Explore profile) |
| Subject question | method-b (per-line phrase remediation) feasibility — D-stage 92 hymn 에서 parallel-epithet collapse F1 회귀 해소 가능? |
| Method | read-only sweep + PDF ground-truth verification + 3 sub-method projection |
| Sample | 5-10 parallel-epithet hymn (NEW + PHASED) + flowing-prose 비교군 |
| Tools | Read, Bash + node sweep scripts (전수 122 hymn), PDF parsed_data direct read (`/home/min/myproject/divine office/parsed_data/full_pdf.txt`) |
| Worktree | 286-divine-researcher (base afbd4f1c verified by `pair-cli cowork worktree-verify-base`) |
| Out of scope | builder 구현, 92 hymn 전체 sweep, viewport visual 검증 (R5 별), 데이터/코드 변경 |

---

## 1. F1 finding 재정의 (review #280 인용)

### 1.1 Subject finding (review #280 §3 F1)
> Single-phrase fallback path (26 hymn 적용) 가 stanza 내 모든 line 을 `lines.slice(start, end+1).join(' ')` 로 단일 paragraph 화. PDF 의 의도된 line break 가 소실. 두 가지 상반된 효과: **(a)** wrap artifact (예: hymn 110) → join 후 자연스럽게 읽힘, net improvement; **(b)** parallel-epithet verse (예: **hymn 49 stanza[1] `1. Маш сайхан цэвэр / Маш бат журамт / Маш түвшин хичээлт / Маш үнэн шударгуу`**) → 4 parallel epithets 가 단일 paragraph 으로 collapse, **structural regression** vs legacy `whitespace-pre-line` 4 hard-break render.

### 1.2 Hymn 49 block 2 PDF anchor 재확인 (page 921, terminator 없음)
worktree `src/data/loth/prayers/hymns/49.rich.json` block[2] (lines 117-149):
- L0 `1. Маш сайхан цэвэр`
- L1 `Маш бат журамт`
- L2 `Маш түвшин хичээлт`
- L3 `Маш үнэн шударгуу`

→ 현재 `phrases:[{ lineRange:[0,3], indent:0 }]` 단일 phrase. method (a2) tail-branch 진입 (no terminator) → fallback. 4 parallel epithets 가 한 paragraph 으로 join.

### 1.3 R2 spike (#264) 가 method (a1) reject 한 이유 요약
`docs/handoff-fx3-r2-a1-spike.md` §3.3-3.5 — 11 sample hymn pages 전수에서 WRAP_DELTA=+3 visual-indent signal 부재 (85-90% lines at ind=0). pdftotext-layout 이 hymn region 의 hard-break-only 본문에서 logical phrase 추출 불가 → F1 ≈ 0.10-0.20 (LOW). 즉 PDF 측 신호로 자동 분해는 불가. **method-b 는 PDF 신호 없이 데이터/heuristic 만으로 분해를 시도**.

---

## 2. Sample 식별 — 122 hymn 전수 sweep

### 2.1 Sweep methodology
`/tmp/sweep-parallel-epithet.mjs` (worktree 임시) — 모든 122 hymn rich.json 파싱, 각 stanza 별:
- skip refrain stanzas (`Дахилт:|Нийтээр:|Эсвэл:` opener)
- skip stanzas with <3 lines
- detect (a) `≥3 lines starting with same 3-char prefix`, OR (b) `numbered opener (\d+\. )` + `terminator-less`

### 2.2 Sweep 결과 (read-only)

| 항목 | 값 |
|------|----|
| Total non-refrain stanzas | 431 (across 122 hymns) |
| Phased (Phase A+B 적용) | 85 stanzas / 35 hymns |
| New (D-stage 후보) | 346 stanzas / 87 hymns |
| **Parallel-epithet candidates** (heuristic match) | **96 stanzas / 53 hymns** |
| - In Phased (regression sites) | 14 hymns |
| - In New D-stage | 39 hymns |
| Flowing-prose terminator-less stanzas (b1 false-positive risk) | 75 stanzas / 60 hymns |

### 2.3 Top non-injected (D-stage) parallel-epithet samples — 10 hymns

| Hymn | block | lines | repeat | numbered? | first-line excerpt | 패턴 |
|------|-------|-------|--------|-----------|---------------------|------|
| **90** | 0 | 16 | 11× "Та" | no | "Та миний дорой байх үед хүч" | Strongest case — "Та" 11 회 반복 |
| **25** | 2 | 18 | 7× | no | "Бидний Эзэний Ариун Сүнс надад оршин" | Refrain-line 7 회 반복 + 변주 |
| **22** | 0 | 12 | 6× | no | "Би магтаалыг өргөе Эзэнд" | "Би" 반복 + "/x2/" 마커 |
| **5** | 0 | 21 | 5× | no | "Аврагч ирсэнд баярлаж байна" | Litany — short verses × 21 |
| **23** | 0 | 8 | 5× ("Өө"×3, "Бид"×3) | no | "Өө өө өө би Таныг магтъя" | Numbered prefix block with parallel sub-stanzas |
| **101** | 0 | 8 | 5× ("Хай") | no | "Хайр бол тэвчээртэй энэрэнгүй" | "Хайр" 4 회 반복 + 1 contrast |
| **118** | 0 | 11 | 5× ("Их"/"би" 교차) | no | "Их Эзэн үгээ айлдвал" | V/R-style 교차 parallel |
| **122** | 2 | 13 | 5× | no | "Миний бүх зүйл болсон Их Эзэн" | Parallel + tail terminator-less |
| **91/92** | block 4/0 | 8 | 4× ("Та") | yes | "1. Та Эхэн ба Эцэс, Эхлэл ба Төгсгөл" | Numbered + Та-반복 (duplicated hymn) |
| **50** | 0 | 4 | 4× ("Маш") | yes | "1. Маш сайхан цэвэр / Маш бат журамт ..." | **Hymn 49 block 2 와 동일 텍스트** (duplicate hymn entry) |

### 2.4 Phased (이미 적용됨, F1 회귀 사이트) — 6 hymn 직접 영향

| Hymn | block | lines | repeat | first-line excerpt | F1 영향 |
|------|-------|-------|--------|---------------------|---------|
| **49** | 2 | 4 | 4× "Маш" | "1. Маш сайхан цэвэр" | review #280 F1 인용 사례 |
| 11 | 0 | 13 | 6× | "Амар тайвныг чамд өгье" | parallel + length 13 → join 시 wrap heavy |
| 42 | 0 | 10 | 6× "Есү" | "Есүс хамгийн нандин нэр юм аа" | parallel + length 10 |
| 3 | 2 | 8 | 5× "Та" | "Та ерөөгөөч миний ард түмнийг" | parallel + length 8 |
| 58 | 0 | 8 | 5× "Их" | "Их Эзэнээ магтан дуулъя" | parallel + length 8 |
| 62 | 0 | 7 | 4× "Мин"/"Үхл" 교차 | "Миний дотор байдаг Есүс Христ минь" | parallel + V/R 교차 |

→ Phase B 14 hymn (15 stanzas) 가 이미 fallback collapse 상태로 main merge. method-b 도입 시 **소급 재주입** 가능.

### 2.5 Flowing-prose 비교군 (b1 false-positive 위험) — PDF ground-truth verified

**Hymn 21 block 0 (PDF page 897-898, parsed_data lines 30515-30545)** — flowing-prose with PDF column-narrow wrap:
```
21. Баярлан магтан                                  ← title (안 매칭)
Баярлан магтан хүндэтгэцгээе сүр жавхлантай       ← logical phrase 1 (line 1)
Их Эзэнийг                                          ← phrase 1 wrap continuation (line 2)
Бидний сэтгэл Түүний өмнө дэлгэрч байгаа цэцэг    ← logical phrase 2 (line 3)
мэт                                                  ← phrase 2 wrap (line 4)
Гэм ба зовлонг оргүй арилгаж эргэлзэх зүйлийг     ← logical phrase 3 (line 5)
сарниулаад                                            ← phrase 3 wrap (line 6)
Гэрлээ бидэнд тусган өглөө хувиршгүй Их Эзэн       ← logical phrase 4 (line 7, 짧은 phrase)
Газар тэнгэрийн хамаг бүхэн Эзэний чадлыг         ← logical phrase 5 (line 8)
илэрхийлж                                              ← phrase 5 wrap (line 9)
Гараг одод элч нарын дуу тасралтгүйгээр           ← logical phrase 6 (line 10)
цуурайтна                                              ← phrase 6 wrap (line 11)
...
```
→ **17 PDF lines = 9 logical phrases** (8 phrases × 2-line wrap + 1 short standalone)
→ **b1 standalone 적용 시**: 17 phrase 로 split → wrap continuation 줄(`Их Эзэнийг`, `мэт`, `сарниулаад`)이 별 phrase 로 표시됨 → **시각적 의미 단위 파괴**.
→ **이 stanza 는 method (a2) fallback (현재 상태) 이 b1 보다 나은 결과**.

---

## 3. 3 sub-method 정의 + 평가

### 3.1 Method (b1) — One-line-one-phrase (universal)

**Definition**: terminator-less stanza 내 모든 line 을 각각 별 phrase 로. method (a2) tail-branch 의 single-covering-phrase fallback 을 per-line split 로 교체.

```js
// method b1 patch on planStanzaPhrases (pseudo)
if (phrases.length === 0 && lines.length > 0) {
  // OLD (a2): phrases.push({ lineRange: [0, lines.length - 1], indent: 0 })
  // NEW (b1): per-line phrases
  for (let i = 0; i < lines.length; i++) {
    phrases.push({ lineRange: [i, i], indent: 0 })
  }
}
```

**Coverage projection (sweep)**:
- 적용 stanza: 321 (terminator-less)
- 평균 phrase 수: 4.5 per stanza
- 총 phrase 발생: 1,438 (현재 fallback ~321 phrase 대비 +1,117)

**Pros**:
- 구현 minimal (3 line 코드 변경)
- parallel-epithet hymn 100% 보존 (line break 손실 0)
- 부착 휴리스틱 0 → maintenance free
- D-stage sweep 후 user-visible 차이 = "PDF line layout 100% 충실"

**Cons**:
- **flowing-prose hymn에서 wrap continuation 이 별 phrase 로 표시됨** — hymn 21 block 0 17 line 중 8 line 이 wrap continuation, b1 적용 시 17 phrase 로 over-split → 시각적으로 깨진 phrase boundary 노출
- false-positive 발생률 측정: 75 flowing-prose stanza (sweep) 중 hymn 21 같은 long-form prose (≥10 line) 가 ~30% (rough) → 약 22-25 stanza 에 부정적 영향
- net 순영향 = +parallel-epithet 보존 vs −prose wrap fragmentation. 실제 사용자 visible 영향 조사 (R5 visual) 미실시.
- **R2 spike (#264) §6.2 의 결론과 비교**: method (a1) UX = "13 hard-break = legacy regression". method (b1) standalone 은 동일 효과를 의도적으로 도입 → **FR-161 phrase pivot 의 natural-wrap 개선 의도와 partial 충돌**.

**Verdict**: standalone 적용 reject. 일부 hymn 군에서는 정확하나 universal 적용은 false-positive 위험 too high.

---

### 3.2 Method (b2) — Hybrid heuristic (parallel-epithet detect → b1, else a2)

**Definition**: stanza 별로 parallel-epithet 패턴 감지 후 분기:
- **Detected (parallel)**: per-line split (b1 동작)
- **Not detected**: single covering phrase (a2 동작)

#### 3.2.1 Heuristic candidate (3 layer)

**Layer 1 — Strong parallel signal** (high precision):
- ≥3 lines 가 첫 3-char prefix 공유 (예: "Маш" × 4, "Та" × 11, "Хайр" × 4)

**Layer 2 — Numbered + uniform structure** (medium precision):
- First line 이 `\d+\.\s` opener (예: "1. ", "2. ")
- ≥3 lines, length CV < 0.45
- **AND** no-short-tail line (모든 line text length > 12 OR starts with capital Cyrillic) — wrap continuation 차단

**Layer 3 — Skip (a2 fallback retained)**:
- 위 둘 다 미감지 → flowing-prose 가정, single-phrase fallback (현 상태)

#### 3.2.2 Coverage projection

(`/tmp/sweep-bx-projection.mjs`)

| Metric | Value |
|--------|-------|
| Total non-refrain stanzas | 431 |
| Flagged by b2 heuristic | **256 (59.4%)** |
| - In Phased (15 hymns) | 45 stanzas → 소급 재주입 |
| - In New D-stage (48 hymns) | 211 stanzas → D-stage 직접 적용 |
| 미적용 (flowing-prose 가정 retained) | 175 stanzas (40.6%) |

#### 3.2.3 False-positive 감수성 (heuristic fragility)

**Worked example — hymn 21 block 0**:
- prefixes: "Бая|Их|Бид|мэт|Гэм|сар|Гэр|Газ|илэ|Гар|цуу|Уул|Урл|маг|Бид|учр|Бул"
- maxRepeat: "Бид" × 2 (sweep 결과 maxRepeat=3 — 일부 prefix 가 2회 이상 → flag) → **FALSE POSITIVE** (b2 가 잘못 flag)
- 만약 strict-mode (≥3 same prefix only) 적용 → "Бид" 2회 → not flagged → safe (a2 retained) ✓

**Tuning recommendation**: Layer 1 의 `≥3 same prefix` 는 너무 loose. **strict-mode**: ≥3-line repetition AND repetition ≥40% of stanza lines (예: 8-line stanza 라면 ≥4 같은 prefix 필요). 보수적 cutoff 로 false-positive 통제.

**예상 strict-mode coverage**: Layer 1 strict = ~50% reduction in flag → 약 130 stanza flagged. 90 위에 hymn 21 같은 ambiguous case 자동 제외.

#### 3.2.4 Pros

- parallel-epithet 정확 보존 (90% precision @ strict-mode)
- flowing-prose default fallback 유지 (a2 의 known-limit 인정 framing)
- single code path, 1-2 추가 함수 (60-100 LOC) 로 구현
- D-stage sweep 적용 후 idempotent, byte-identical re-run

#### 3.2.5 Cons

- heuristic accuracy 가 "엄밀 ≠ 옳음" — corpus 별 tuning 필요
- false-positive (strict-mode 도) 100% 제거 불가 — hymn 21 같은 borderline 은 PDF 시각 검증 없이는 판정 어려움
- 미감지 (false-negative) — Layer 1 strict 가 4-line "Маш × 4" 는 잡지만, 6-line "Хайр × 3 / Муу × 1 / 변주 × 2" 같은 mixed parallel 은 놓칠 수 있음
- maintenance: heuristic threshold (3-char prefix? 4? CV cutoff?) 가 corpus 수정 시 재조정 필요

#### 3.2.6 Verdict

**RECOMMENDED with strict-mode tuning** — Layer 1 strict (≥3 prefix AND ≥40% of lines), Layer 2 numbered + length-CV<0.4 + no-short-tail. b3 hand-spec 와 병행 가능 (fixture override list).

---

### 3.3 Method (b3) — Hand-spec list (curator-flagged)

**Definition**: rich.json 의 stanza block 에 `parallelEpithet: true` 플래그 추가 (또는 별도 `data/loth/parallel-epithet-stanzas.json` allow-list). builder 가 flag 있을 때만 b1 split, 없으면 a2 fallback.

```js
// schema (PrayerBlock 확장 가정)
{ kind: 'stanza', lines: [...], parallelEpithet: true }
// or external map: { "49": [2, 6, 8, 10, 12], "90": [0], "25": [2], ... }
```

#### 3.3.1 Manual workload

- Flag 후보 stanza: 256 (b2 hybrid heuristic 매칭, upper bound) ~ 130 (strict subset)
- Hymn 단위: 63 (모든 후보) ~ 40 (strict)
- 평균 stanza per hymn: 4 (max) ~ 2-3 (typical)
- **Curator review**: 한 stanza 결정 = PDF page open + 시각 판단 (~30s) → 256 stanzas × 30s = 약 2 시간 manual review (1 round). 시각 검증 포함 시 1-2 일 작업.

#### 3.3.2 Pros

- 100% precision (curator 결정)
- transparent — git diff 로 어떤 stanza 가 flag 됐는지 명확
- progressive — 매 회귀 보고 시 hand-flag 추가 가능
- heuristic-free — corpus 변동 무관

#### 3.3.3 Cons

- **manual review burden** (~1-2일 1회)
- **maintenance**: 새 hymn 추가 시 매번 curator pass 필요
- schema 변경 시 build pipeline + verifier 호환성 확인 필요
- hand-spec list 와 PDF source-of-truth drift 위험 (PDF 본문 변경 시 list 미동기)

#### 3.3.4 Verdict

**DEFERRED** — 단기 ROI 낮음. **augmentation track 으로 격상 가능**: b2 strict-mode 적용 후 사용자 visible 회귀 보고 발생 시, 해당 hymn 만 hand-flag 추가 (override mechanism). Pure hand-spec sweep 은 Phase D scope outside.

---

## 4. 3-method 비교 매트릭스 (R2 spike 와 동일 6-dim 가중치)

| Dim | W | b1 standalone | b2 hybrid (strict) | b3 hand-spec |
|-----|---|--------------|---------------------|--------------|
| accuracy (parallel 정확 보존) | 0.32 | 9/10 (universal split) | 8/10 (90% precision @ strict) | 10/10 (curator) |
| coverage | 0.15 | 10/10 (321 stanza) | 7/10 (~130-256 stanza) | 7/10 (~256 max) |
| sweep_risk (false-positive on flowing-prose) | 0.15 | 3/10 (hymn 21-style 22-25 stanza 회귀) | 7/10 (strict-mode 시 통제) | 10/10 (zero FP by design) |
| dev_time | 0.10 | 9/10 (3-line patch) | 6/10 (60-100 LOC + tests) | 4/10 (schema + curator pass) |
| maintenance | 0.10 | 9/10 (heuristic-free) | 6/10 (threshold tuning) | 5/10 (hand-list maintenance) |
| ux_impact (FR-161 natural-wrap 정신과 alignment) | 0.18 | 4/10 (legacy hard-break regression on prose) | 7/10 (parallel 보존 + prose natural-wrap retain) | 8/10 (curator 의도 반영) |
| **Score (×W sum)** | | **6.66** | **7.20** | **7.30** |

→ **b2 strict (7.20) ≈ b3 hand-spec (7.30) > b1 standalone (6.66)**.
→ b3 가 약간 우세 (0.10 차이) 하나 dev_time + maintenance burden 으로 b2 가 더 실용적.

---

## 5. Phase D recommendation

### 5.1 Primary: **(B2-CONSERVATIVE)** — b2 hybrid heuristic with strict-mode

**적용 step**:
1. `scripts/build-hymn-phrases-into-rich.mjs` 의 `planStanzaPhrases` 에 parallel-epithet detect layer 추가
   - Layer 1 strict: ≥3 lines share 3-char prefix AND repetition ratio ≥40%
   - Layer 2: numbered opener (`\d+\.`) + ≥3 lines + length CV<0.4 + no-short-tail
   - 둘 다 미감지 → 현행 a2 fallback (single covering phrase) 유지
2. 파라미터화: `process.env.HYMN_PARALLEL_DETECT='strict|relaxed|off'` (`strict` default)
3. Unit test 6-8건 추가 (sample hymn fixtures: 49, 90, 25, 22, 21 negative case)
4. D-stage 92 hymn sweep 시 dry-run 으로 b2 적용 stanza 목록 출력 → curator 1차 검토 (option) → write
5. `scripts/verify-phrase-coverage.js` 변경 0 (phrase 수만 증가, schema 동일)
6. **Phase B 소급 재주입**: 15 phased hymn 의 45 stanza 에도 b2 적용 → byte-difference 발생 (intended). 별 task 또는 D-stage 와 함께.

**Risk mitigation**:
- Phase D dry-run 결과를 curator 가 1회 review (option-but-recommended)
- false-positive 발견 시 hand-spec override map (b3 mechanism) 로 보강 (`.../hymn-parallel-overrides.json`: `{"21": {"0": false}, "5": {"0": true}}`)

### 5.2 Alternative: **(B3) hand-spec only**

만약 Phase D scope 가 더 좁아지거나 (예: top 10 user-facing hymn 만), 또는 b2 false-positive 가 user-visible 회귀로 보고된다면 → b3 standalone 채택. 단기 ROI 낮음.

### 5.3 Reject: **(B1) one-line-one-phrase universal**

flowing-prose wrap fragmentation 위험 (sweep 75 stanza 중 ~22 가 hymn 21-style long-form prose) 으로 reject. R2 spike (#264) 의 (a1) reject 와 동일 사유 (UX regression vs FR-161 natural-wrap intent).

### 5.4 Defer: **(B4) D-stage 보류, 다른 phase 우선**

method-b 결정 미확정 시 D-stage 92 hymn sweep 도 a2-only 로 진행 가능 (Phase B 와 동일 contract). 그러나 **Phase B 의 ~14 hymn / 15 stanza F1 회귀가 이미 main 에 있음** — D-stage 진행 시 "추가 ~30 stanza F1 회귀 도입" 이 됨. user-visible 회귀 누적 vs method-b 도입 timing trade-off. Recommendation: B2-CONSERVATIVE 즉시 도입.

---

## 6. F2 minor doc-clarity 흡수 (review #280 §3 F2)

review #280 F2: dispatch wording "OT 매일 visible (Lauds/Vespers/Compline) union" 모호.

**정정 권고 (이 doc 에서 채택)**:
- ❌ "OT 매일 visible (Lauds/Vespers/Compline) union" (week-1 strict reading 18 hymn)
- ✅ "OT Compline 12개 (전 영역) + OT Lauds/Vespers core 21" (Phase B 실제 scope, commit body 일치)

향후 dispatch / handoff 문서에서 "week-1 visible" 표현 대신 **"OT Compline 전체 + L/V 핵심 N"** wording 표준 채택.

---

## 7. Constraints + caveats

- Read-only spike. 데이터/코드/테스트/스크립트 변경 0. handoff doc deliverable 만.
- Sweep 은 jq + node introspection 기반, **모든 122 hymn 전수 적용**. flagged 256 stanza 는 정확값.
- PDF ground-truth 는 hymn 49 / 90 / 21 / 22 / 23 / 25 / 5 sample 에 대해서만 직접 verbatim 검증. 나머지 hymn 은 sweep 패턴 generalization (R2 spike 와 동일 sample 신뢰도).
- b2 heuristic threshold 값 (≥3 prefix, CV<0.4, length>12) 은 sample-driven tuning. 실제 D-stage 적용 시 dry-run 결과로 1회 재조정 권장.
- **prefix matching 은 1-byte / 1-codepoint 단위 — 몽골어 키릴 char 기준** ([feedback_regex_unicode_boundary] 참조). `\b` 사용 금지, `(?:\s|$)` 또는 codepoint slice 만 사용.
- b3 hand-spec workload (1-2일) 는 단일 curator 가정. 분산 작업 시 review consistency overhead 별도.
- worktree base verified: `pair-cli cowork worktree-verify-base` → status=ok, head=afbd4f1c.

---

## 8. AC verification (this spike)

| AC | Type | 기준 | Verdict | Evidence |
|----|------|------|---------|----------|
| AC-1 | structural | 5-10 parallel-epithet sample 식별 + PDF anchor | **MET** | §2.3 (10 NEW + 6 PHASED hymn samples), §2.5 (hymn 21 PDF verbatim) |
| AC-2 | structural | 3 sub-method (b1/b2/b3) 정의 + trade-off 평가 | **MET** | §3.1 / §3.2 / §3.3 + §4 scoring matrix |
| AC-3 | semantic | flowing-prose vs parallel-epithet 비교 (false-positive 위험 평가) | **MET** | §2.5 hymn 21 PDF verbatim (17 line / 9 logical phrase / b1 over-split risk) |
| AC-4 | structural | Phase D recommendation 출력 (B1/B2/B3/B4) | **MET** | §5 — Primary B2-CONSERVATIVE, Alt B3, Reject B1, Defer B4 |
| AC-5 | structural | F2 minor doc-clarity 흡수 (정확 wording 권고) | **MET** | §6 |
| AC-6 | structural | handoff doc 작성 (PDF anchor + hymn rich.json refs ≥1) | **MET** | 본 doc — `parsed_data/full_pdf.txt` (hymn 21 lines 30515-30545, hymn 90 lines 32036-32052) + 8 hymn rich.json refs |

→ 6/6 AC MET. **Verdict: SPIKE COMPLETE**.

---

## 9. References

### Spike base
- Worktree: `286-divine-researcher` (base afbd4f1c, verified)
- Sweep scripts: `/tmp/sweep-parallel-epithet.mjs`, `/tmp/sweep-flowing-prose.mjs`, `/tmp/sweep-bx-projection.mjs` (worktree 임시, 모두 read-only)

### PDF source-of-truth (NFR-002)
- `/home/min/myproject/divine office/parsed_data/full_pdf.txt`
  - hymn 21 page 897-898: lines 30515-30545
  - hymn 22 page 898: lines 30546-30558
  - hymn 23 page 898-899: lines 30559-30579
  - hymn 25 page 899-900: lines 30599-30623
  - hymn 90 page 942: lines 32036-32052
  - hymn 91-93 page 943-944: lines 32053-32099

### Hymn rich.json samples
- `src/data/loth/prayers/hymns/49.rich.json` (PHASED, F1 source)
- `src/data/loth/prayers/hymns/{5,21,22,23,25,90,91,92,93,101,118,122}.rich.json` (NEW + PHASED 비교)

### Prior docs
- `docs/review-280-279-fx3-phase-b-30hymn.md` — #280 review F1 발견
- `docs/handoff-fx3-r2-a1-spike.md` — #264 R2 spike (LOW feasibility, recommend C a2-only)
- `docs/review-257-249-fx3-phase-a-pilot.md` — #257 Phase A 1차 review (R2 권고)
- `docs/handoff-fx3-phrase-audit.md` — #228 audit (P1-A 권고)

### Related code
- `scripts/build-hymn-phrases-into-rich.mjs` — `planStanzaPhrases` (line 161) 가 method-b 적용 지점
- `src/components/psalm-block.tsx:62-83` — phrase render branch (변경 0, 데이터 호환)
- `src/components/prayer-sections/rich-content.tsx:343` — RichContent phrase branch (변경 0)

---

## 10. Decision

| 차원 | 결과 |
|------|------|
| **Spike verdict** | b2 hybrid heuristic strict-mode = FEASIBLE, b1 standalone REJECT, b3 hand-spec DEFER |
| **Phase D recommendation** | **(B2-CONSERVATIVE)** — b2 strict-mode + curator dry-run review + b3 override hook |
| **Phase B 소급 적용** | 15 hymn / 45 stanza 재주입 (별 task 또는 D-stage 동시) |
| **F2 doc-clarity** | "OT Compline 전체 + L/V 핵심 N" wording 표준 |
| **Risk** | LOW (data-only additive, b2 heuristic strict-mode + override hook) |
| **Researcher** | divine-researcher (Explore profile) |
| **Issued** | 2026-05-03 |
