# Stage 6 Rich 확산 — 후속 작업 핸드오프 보고서

작성: 2026-04-23 · 기준 HEAD `d95458c`

---

## 1. 현재 상태

**Stage 6 Rich Propagation: CLOSED.** FR-153 pilot (`f604835`) 이후 6개 하위 FR 로 분할 확산 완료. 병렬 세션(최대 3 concurrent) 진행, 총 17 커밋, working tree clean.

| FR | 영역 | 커버리지 | 대표 커밋 |
|---|---|---|---|
| FR-153a | concludingPrayer | 135/135 (100%) | `9fd51be` |
| FR-153b | intercessions | 56/56 (100%) | `503272c` |
| FR-153c | alternativeConcludingPrayer | 58/58 (100%) | `503272c` |
| FR-153d | responsory | 107/107 (100%) | `8a5e63f` + `ef66ce4` + `d1a3d3c` |
| FR-153e | shortReading | 106/126 (84.1%) | `f05456b` + `baa1f02` + `29c399e` |
| FR-153f | psalter stanzasRich | 137/137 (100%) | `9f25a29` + `aa26631` + `3329fba` + `048c9be` |
| base (hymn) | 카탈로그 + wiring + 빈 text | 122/122 | `adc846f` + `f7c0d5d` + `e92fe93` |

전체 공통 구조·수용 기준·병렬 세션 교훈은 `docs/PRD.md §12.2.2` 참조.

---

## 2. 남은 후속 작업

우선순위별로 **🟢 빠른 승리 / 🟡 중간 / 🔴 큰 작업** 세 층위.

---

### 🟢 빠른 승리 (반일~일일)

#### FR-153h — psalmPrayer rich 확산 (88 refs)

- **목적**: `psalter-texts.json` 의 `psalmPrayer: string` 필드(88 refs 보유) 를 `psalmPrayerRich: PrayerText` 로 확장. Stage 6 Rich 확산의 자연스러운 마지막 타일.
- **입력**: `src/data/loth/psalter-texts.json` 의 각 ref 별 `psalmPrayer` + `psalmPrayerPage`.
- **접근**: `scripts/parsers/rich-builder.mjs` 의 `buildProsePrayer` 를 그대로 재사용 (FR-153a/c 와 동일 prose 계통). 신규 스크립트 `scripts/build-psalter-prayers-rich.mjs`.
- **출력 위치**: `src/data/loth/prayers/commons/psalter-texts.rich.json` 의 각 ref 엔트리에 `psalmPrayerRich` 필드 추가 (dual-field, 기존 `stanzasRich` 와 동일 파일 내 공존).
- **수용 게이트**: `buildProsePrayer` 의 normalised byte-equal. FAIL 발생 시 `scripts/out/psalter-prayers-rich-failures.md` 큐잉.
- **렌더 연결**: `src/components/psalm-block.tsx` 가 concluding prayer 영역에서 `psalmPrayerRich` 있으면 `<RichContent>`, 없으면 legacy. `src/lib/hours/resolvers/psalm.ts` 에서 `stanzasRich` 전파 경로에 `psalmPrayerRich` 동반 전파.
- **기대 커버리지**: ≥ 85% (다른 prose 영역 경험치). FAIL 은 PDF 원문 오탈자 / canon 정오표 패턴과 유사할 것.
- **예상 공수**: 반나절. 스크립트 0.5h + 실행 + 검증 + e2e 1~2 케이스 + 문서.
- **주의**: `psalmPrayer` 는 모든 ref 에 있는 게 아님 — 88/137 만. 없는 ref 는 자연 skip.

---

### 🟡 중간 (1~2일)

#### Task #13 — shortReading 14건 page 오류 (NFR-009d body-fingerprint) ✅ 완료

- **상태**: ✅ **완료** (task #37 audit 2026-04-24 확인)
- **등록 근거**: T7 (2026-04-23) 시점의 shortReading rich 확산 20 실패 중 "page 오류" 로 분류된 14건.
- **해소 경로** (복수 commit 으로 분산 해결):
  1. **6건 true page drift** — commit `5c1eabe` (2026-04-23 16:18, 'wi-003 propers shortReading page drift 6건'):
     - advent w1/SUN/vespers 545 → 548
     - easter w1/SUN/lauds 689 → 703
     - easter w1/THU/lauds 501 → 720
     - easter easterSunday/SUN/lauds 689 → 703
     - lent w6/SUN/vespers 650 → 651
     - lent w6/SAT/vespers 650 → 651
  2. **3건 pdftotext column-split** (실제로는 page drift 가 아닌 extractor bug) — commit `4a533e3` (2026-04-24, task #35): p251/p371 의 `Уншлага` 헤더 첫 문자가 pdftotext 컬럼 분할에서 잘림 + p437 source glyph 누락. 해결: regex 완화 (`[Уу]ншлаг[аА]?`) + pdfjs fallback.
  3. **1건 layout** — task #15 / #33 commit `29ce2da` (2026-04-24): ADVENT w1 MON lauds p556 의 body tail 이 threshold 엄격으로 cut — 원 가정 "중복 헤더" 는 오진, 실제 `buildShortReading` pass-2 threshold 완화 (`max(50, 10%)` → `max(30, 7.5%)`).
- **T7 원래 14 건 기준 재분류**: 초기 T7 에서는 모두 "page 오류" 로 분류됐으나 실측 결과 (a) 6 true page drift + (b) 3 pdftotext column bug + (c) 1 threshold too-strict + (d) 4 canon truncation (Task #14 로 분리) 로 세분화. 수정 경로가 섞여 있으나 전체 14 entry 는 rich 확산 PASS 로 해소됨.
- **현 상태**:
  - `scripts/build-short-readings-rich.mjs` 재실행 → **126/126 PASS, 0 FAIL** (2026-04-24T12:30:54 기준)
  - `scripts/verify-propers-pages.js` → shortReading bucket `agree=63, changed=0, review=0` (drift 0)
- **교훈**: pre-extractor era 의 failure 분류가 실측 근거 없이 추정으로 attached 되면 실제 원인과 괴리 발생. 분류 라벨은 fix 전 검증이 중요 — 예컨대 "page 오류" 라 명명된 14건 중 6건만 진짜 page drift, 나머지 8건은 extractor 레벨 문제였음.

#### Task #14 — shortReading 5건 canon truncation/typo 교정 ✅ 완료

- **상태**: ✅ **완료** (task #37 audit 2026-04-24 확인)
- **해소 경로**: commit `0a0b15c` (2026-04-23 16:14, 'shortReading 5건 canon typo 교정 (PDF 기준 byte-equal PASS)'). 5 entry 중:
  1. **CHRISTMAS/octave/SUN/lauds** (p601, Isa 9:6-7) — JSON truncation 복원. "…тогтооно." 에서 종료 → PDF continuation `Түг түмдийн ЭЗЭНий зүтгэл Түүнийг нь гүйцэлдүүлэх болно.` 추가.
  2. **LENT/w1/TUE/lauds** (p630, Иоел 2:12-13) — PDF_CORRECTIONS_BY_PAGE 에 `тасчигтун"` → `тасчигтун.` (고아 닫힌 인용 부호 정정).
  3. **LENT/w1/THU/lauds** (p639, Хаадын дээд 8:51-53а) — PDF_CORRECTIONS 에 trailing comma → 마침표.
  4. **LENT/w1/FRI/lauds** — JSON canon 미세 차이 정정.
  5. **PSALTER w1/SAT/lauds** — overlay rich.json 수동 작성.
- **정답 방향**: 5건 모두 JSON canon 편이 정답이거나, PDF typo 를 PDF_CORRECTIONS_BY_PAGE 로 정규화. 즉 최종 rendered output 은 JSON 측 canon 에 맞춤.
- **현 상태**: rich 확산 126/126 PASS — 5 canon fix 가 accepted 상태.

#### Task #15 — ADVENT w1 MON lauds (p556) 본문 tail 누락 (완료, task #33)

- **상태**: ✅ 완료 (task #33, 2026-04-24)
- **실측 원인 정정**: 초기 trial 가설은 "`Уншлага` 헤더가 두 번 등장" 이었으나 실측 결과 book 556 좌측 컬럼에서 `Уншлага` 는 **딱 한 번만** 등장 (pdftotext + pdfjs + raw 3중 확인). 실제 근본 원인은 `buildShortReading` 의 **pass-2 continuation threshold** 가 너무 엄격한 것:
  ```
  p556 diagnostic:
    origLen   = 419
    reconLen  = 379   (body 가 "...далайхгүй," 에서 끊김)
    shortBy   = 40
    old threshold = max(50, floor(origLen*0.1)) = 50
    40 < 50 → pass 2 NOT triggered ✗
  ```
  누락된 tail `" Дахин хэзээ ч тэд дайтахад суралцахгүй."` (38 chars) 는 book 557 우측 컬럼 top 라인에 이어져 있고 `Хариу залбирал` 이 정상 end-of-block 로 작동한다. continuation 이 트리거만 되면 자연 합류한다.
- **해결**: `buildShortReading` pass-2 threshold 를 `max(50, 10%)` → `max(30, 7.5%)` 로 완화. pass 1 에서 이미 PASS 한 122 entry 는 threshold 와 무관하게 pass-2 에 진입하지 않으므로 회귀 불가. 재실행 결과 122 → **123 PASS** (p556 신규 PASS), 3 FAIL (나머지 3건은 별도 `section heading not found` 예외 — 본 task 범위 외).
- **회귀 가드**: 변경 전 baseline 스냅샷 (122 entries) 대비 변경 후 현재 (123 entries) diff — `added: 1 (p556)`, `removed: 0`, `changed: 0`.
- **원 dispatch scope 변경 기록**: Option A (`sectionHeadingOccurrence` 추가) 는 실제 원인과 맞지 않아 미채택. 조사 단계에서 team-lead 에게 course-correction 승인받고 Option C (threshold 완화) 로 진행.

#### Task #35 — pdftotext section heading exception 3건 (p251/p371/p437) ✅ 완료

- **상태**: ✅ 완료 (task #35, 2026-04-24)
- **증상**: `scripts/build-short-readings-rich.mjs` 실행 시 3건 `section heading not found (pdftotext)` 예외. p251/p371/p437 모두 `Уншлага` 헤더가 pdftotext 에서 매치 실패.
- **실측 원인** (실제로 2종 혼합):
  1. **p251 / p371**: pdftotext 컬럼 분할이 heading 의 **앞부분 문자를 잘라먹음** — p251 `"лага\t\t..."` (Унш 손실), p371 `"шлага\t\t..."` (Ун 손실). pdfjs styled 에서는 `уншлага` 정상 출력.
  2. **p437**: PDF 원본 자체가 glyph 누락 — pdftotext `"Уншлаг 1 Тесалоник..."` / pdfjs `"уншлаг 1 Тесалоник..."` 양쪽 모두 끝 `а` 가 잘림. source-level typesetter 오류.
- **해결** (approach A + B 혼합):
  1. **Regex 완화 (A)**: `SHORT_READING_HEADING` 를 `/^[Уу]ншлага(?:[\s\t]|$)/u` → `/^[Уу]ншлаг[аА]?(?:[\s\t]|$)/u` 로 수정. trailing `а` 를 optional 로 허용해 p437 의 `Уншлаг` 원본 typo 를 흡수. inflected 형태 (`Уншлагатай` / `Уншлагдаж`) 는 뒤의 `(?:[\s\t]|$)` boundary 로 여전히 배제.
  2. **pdfjs fallback (B)**: `extractSectionRegion` 에 pdftotext heading not-found 예외 catch 후 pdfjs styled body 를 source-of-truth 로 swap 하는 fallback 로직 추가. fallback 활성 시 continuation 도 pdfjs 일관 유지해 1:1 line alignment 보존.
- **결과**: 123 → **126 PASS**, **0 FAIL**. 수정 전 3 exception entries (p251/p371/p437) 전원 신규 PASS.
- **회귀 가드**: 기존 123 baseline 대비 현재 126 entries diff — `added: 3`, `removed: 0`, `changed: 0` (기존 123 entry 100% byte-wise 보존).
- **회귀 리스크**: 없음. fallback 은 pdftotext heading miss 예외에서만 활성 (기존 PASS 엔트리는 예외 발생 없으므로 fallback 경로 미진입). regex 완화는 `[аА]?` boundary 조건으로 false positive 최소화 (확인 후 기존 123 entries 모두 byte-equal).

- **상태**: **완료** (commit `974cfcd` 2026-04-23 16:00, task #31 dispatch 2026-04-24 확인)
- **증상**: `src/lib/__tests__/psalter-loader.test.ts:30` — week-3.json SUN lauds responsory.page 가 302, 테스트 기대 303.
- **해결**: PDF 실측 결과 JSON 값 302 가 정답. `parsed_data/full_pdf.txt` line 10294 에 page-marker "302", line 10303 "Уншлага" (shortReading), line 10316 "Хариу залбирал" (responsory), line 10331 에 page-marker "303" (intercessions 시작). 즉 responsory 는 page 302 에 위치하고 intercessions 부터 303 으로 넘어감. `intercessionsPage: 303` 필드가 이미 별도 노출. 테스트 어서션을 303→302 로 교정한 것이 정답.
- **검증** (task #31, 2026-04-24):
  - `npx vitest run` 270 PASS 0 FAIL — psalter-loader.test.ts 8/8 PASS 확인
  - `node scripts/verify-psalter-pages.js` verified-correction bucket = 2 (week-1 MON vespers, week-2 기존 baseline — 별건), 신규 drift 없음
  - `npx tsc --noEmit` 0 errors
- **교훈**: stage6-followup.md 의 pending 항목이 실제 repo 상태와 lag 가능. dispatch 전 `git log` 로 최근 commit history 의 related fix 선검토 필요.

---

### 🟡🟡 중간 (별 PR 단발)

#### Task #16 — pre-existing TS 2건 PrayerSourceRef.id narrowing

- **상태**: pending · pre-existing (git stash 기준 T7 시점 확인)
- **증상**: `PrayerSourceRef` union 의 `id` 필드 narrowing 경로 2곳에서 TS 경고. `npx tsc --noEmit` 는 0 errors 지만 IDE 경고 또는 strict mode 에서만 보일 수 있음.
- **접근**: `src/lib/types.ts` 에서 `PrayerSourceRef` 의 `kind` 기반 discriminated union narrowing 을 명확히. 사용처 (resolver / renderer) 에서 `kind` 체크 후 접근 패턴 일관.
- **추천**: 별 PR 단발 (30분 작업).

---

### 🔴 큰 작업 (여러 날, 위험 ↑)

#### FR-153g — psalter pilot 규격 137 refs 재추출

- **상태**: 등록됨 · PRD §12.1 에 기술
- **목적**: main `psalter-texts.json` 의 stanza 분할이 PDF 원형 대비 coarse (예: Ps 63 main 2 stanzas vs pilot 8). pilot 규격으로 137 refs 전원 재추출.
- **입력 힌트**:
  - `scripts/out/psalter-rich-report.md` 의 stanza 분포 테이블. **coarse refs 우선순위**: `stanza ≤ 2` + `line ≥ 20`. non-Psalm canticles 전수 (Dan 3, Tob 13, Isa 12, Hab 3, Ezek 36 등).
  - `src/data/loth/psalter-texts.pilot.json` (pilot 3건: Ps 63 / Dan 3 / Ps 149) 가 참고 기준.
  - `scripts/build-psalter-texts-rich.pilot.mjs` 가 pilot 3건 재추출 파이프라인 — 확장해서 137 refs 자동화.
- **⚠️ P0 오염 리스크**: 과거 `scripts/extract-psalm-texts.js` 의 `mergeColumnWraps` / `mergeAcrossStanzaBoundaries` 휴리스틱이 Ps 117/135/139 등 6건 본문 오염 유발 (c92abf3 에서 수정). 같은 계통 실수 재현 주의.
- **수용 기준**: 재추출 전후 stanza 분할 세분화 비교 리포트. **기존 byte-equal 게이트 (FR-153f)** 는 stanza 구조가 바뀌므로 재설계 필요 — 텍스트 content 는 동일해야 하지만 stanza 경계는 변동 허용.
- **추천 순서**:
  1. pilot 규격 재추출 스크립트 일반화 (coarse 15~20 refs 만 먼저).
  2. 수동 검수 (PDF vs 재추출 결과 side-by-side).
  3. 통과 시 나머지 refs 자동화.
  4. `psalter-texts.json` 업데이트 → rich 카탈로그 재생성 → FR-153f 의 기존 137 refs 카탈로그 교체.
- **예상 공수**: 3~5일. 신규 세션 권장.

---

## 3. 병렬 세션 protocol (경험 기반)

Stage 6 T5/T7/T9 병렬 진행에서 학습한 교훈 — 차기 대규모 확산에도 적용.

- **Seed commit 선행**: 공유 인프라 (`rich-overlay.ts` loader, `resolver.ts` priority chain, `loth-service.ts` wiring, `rich-builder.mjs` 공통 빌더) 변경이 필요한 여러 세션이면 **하나만 먼저 돌려 seed commit**. 나머지 세션은 seed 기반 rebase 후 착수.
- **Megacommit 발생 시**: amend 정정은 공수 대비 실익 낮음 (HEAD 뒤 여러 커밋 쌓이면 rebase 지옥). git notes 로 갈음 또는 `docs/PRD.md` 에 "megacommit 포섭 범위" 기록 (Stage 6 의 `8a5e63f` 사례).
- **후속 세션 커밋 전 검증**: `git diff <선행 커밋> HEAD -- <공유 파일>` 로 이미 적용된 loader/wiring 을 자연 배제 확인. 재정의 금지.
- **커밋 경계**: 각 세션은 자기 스코프만 staging. 다른 세션의 modified/untracked 는 unstaged 유지. T5 megacommit 은 이 규칙 위반 사례지만 동일 내용이라 손실 0.

자세한 내용은 `~/.claude/projects/-home-min-myproject-divine-office/memory/feedback_parallel_sessions.md`.

---

## 4. 참조 자료

### 커밋 그래프 (Stage 6 전체)

```
d95458c docs(stage6): Stage 6 Rich 확산 완료 요약 + psalter.txt gitignore
048c9be docs(traceability): FR-153f auto-map 재생성 누락 보정
3329fba chore(stage6): FR-153f 렌더 회귀 스크린샷 capture 스크립트
aa26631 test(stage6): FR-153f e2e 3 case (psalter stanzasRich)
9f25a29 feat(prayers): FR-153f psalter stanzasRich 확산 (137/137)
29c399e chore(stage6): FR-153e 렌더 회귀 스크린샷 capture 스크립트
baa1f02 test(stage6): FR-153e e2e 4 case (shortReading rich)
f05456b feat(prayers): FR-153e shortReading Rich 잔여
d1a3d3c test(stage6): FR-153d e2e 3 case + FR-152 legacy 정리
ef66ce4 chore(stage6): FR-153d 렌더 회귀 스크린샷 capture 스크립트
8a5e63f feat(stage6): FR-153d responsory Rich 확산 (megacommit: T5+T7+T9 인프라)
e92fe93 feat(prayers): hymn 빈 text 15건 PDF 본문 추출 + rich 122/122
f7c0d5d feat(prayers): hymn rich loader/resolver 와이어링
503272c feat(prayers): Stage 6 alt-concluding + intercessions Rich 확산
9fd51be fix(prayers): concludingPrayer Rich 확산 135/135 (21→0)
adc846f feat(prayers): hymn text-only rich 확산 (107/122)
f29557f chore(stage6): generic rich builder 추출
2f4ba78 chore(stage6): Stage 6 확산 전 baseline 정비
f604835 feat(prayers): PDF 원형 재현 rich overlay 계층 도입 (FR-153 pilot)
```

### 핵심 문서

| 경로 | 내용 |
|---|---|
| `docs/PRD.md §12` | FR-153 전체 기능 요구사항 + §12.2.2 Stage 6 완료 요약 |
| `docs/traceability-matrix.md` | FR ↔ 테스트 매핑 (FR-039a~f) |
| `docs/traceability-auto.md` | `@fr` 태그 자동 생성 매트릭스 |
| `CLAUDE.md` | 프로젝트 규약 (SW 캐시 / 몽골어 교정 / FR 번호 규칙) |
| `scripts/out/psalter-rich-report.md` | FR-153f stanza 분포 — FR-153g 우선순위 힌트 |
| `scripts/out/short-reading-rich-failures.md` | FR-153e 실패 20건 상세 |

### 핵심 코드 경로

| 경로 | 역할 |
|---|---|
| `scripts/parsers/rich-builder.mjs` | Layer A~F 공통 빌더. buildProsePrayer / buildIntercessionsBlocks / buildResponsoryBlocks / buildStanzaBlocks |
| `src/lib/prayers/rich-overlay.ts` | loader (seasonal/sanctoral/psalter commons/compline commons/hymn/psalter-texts) |
| `src/lib/prayers/resolver.ts` | priority chain (sanctoral > seasonal > psalter commons > compline commons) |
| `src/lib/loth-service.ts` | Layer 4 rich merge + hymn 카탈로그 wiring |
| `src/components/prayer-sections/rich-content.tsx` | 공용 렌더러 |
| `src/components/psalm-block.tsx` | stanzasRich 분기 (FR-153f) |
| `src/components/hymn-section.tsx` | hymn textRich 분기 (f604835) |

### 출력 디렉토리 규약

```
src/data/loth/prayers/
├── seasonal/{advent,christmas,easter,lent,ordinary-time}/w{N}-{DAY}-{hour}.rich.json   시즌 특이
├── commons/
│   ├── psalter/w{N}-{DAY}-{hour}.rich.json                                              psalter 4주 공통
│   ├── compline/{DAY}.rich.json                                                         7일치 compline
│   ├── psalter-texts.rich.json                                                          137 refs stanzasRich 카탈로그
│   └── psalter-texts.pilot.rich.json                                                    FR-153g 입력
├── sanctoral/{celebrationKey}-{hour}.rich.json                                          축일 (미래 확장)
└── hymns/{number}.rich.json                                                             122 hymn 카탈로그
```

---

## 5. 추천 다음 액션

**즉시 가능 (새 세션 하나로 마감)**:
- FR-153h psalmPrayer rich 확산 — 반나절, buildProsePrayer 재사용, Stage 6 의 자연스런 마지막.

**단독 세션 권장**:
- Task #13 (shortReading 14건 page 오류) — body-fingerprint 워크플로우 확장이라 집중 필요.
- FR-153g (psalter 재추출) — P0 리스크로 신중, 여러 날 필요.

**번들로 묶어 한 번에**:
- Task #14 + #15 + #16 + #17 — 각 30분~2시간, 데이터·TS 사소 수정 묶음.

**관찰·계획만**:
- Stage 6 UI 효과 실측 — pilot 날짜들 (2026-01-18 / 2026-02-04) 에서 dev server 로 실사용 감 보기. 스크린샷은 있지만 사용 경험은 다른 레벨의 피드백.

---

끝.
