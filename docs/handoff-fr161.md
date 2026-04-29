# FR-161 Handoff (2026-04-29, updated)

시편 / 기도문 phrase-unit-aware 줄바꿈 reform 의 진행 상태 + 다음 작업자가 이어받기 위한 컨텍스트.

## 현재 main HEAD

```
9e80fcb feat(fr-161): R-16 sentence-mode boundary refinement (task #197)
b364b64 feat(fr-161): R-15 sentence-mode flow — 전체 마침 기도문 문장 단위 grouping (#196 / #197 amend)
8f44847 feat(fr-161): R-15 RichContent flow mode — 마침 기도문 + 짧은 독서 자연 wrap (task #196)
c5cf5f3 docs(fr-161): handoff for next session
869dc9d docs(fr-161): R-14 PDF indent inconsistency audit (task #191)
4dba0dc feat(fr-161): R-13 hanging indent — phrase wrap continuation 들여쓰기 (task #190)
```

origin/main 동기화 완료 (`9e80fcb` push 완료, Vercel 재배포 트리거됨).

## 검증 baseline (main, 2026-04-29 R-16 직후)

| 항목 | 값 |
|---|---|
| vitest | **663 PASS** / 0 FAIL |
| tsc | 0 errors |
| verify-phrase-coverage (NFR-009j) | OK 215 stanzas / 0 violations |
| 6 page verifier | 무회귀 (page 필드 무수정) |
| psalter-headers preface catalog | 64 refs / 77 entries (FR-160-C-2 기준 유지) |
| sw.js | untouched (CACHE_VERSION bump 불필요) |
| CI gate | `verify:phrase-coverage` step active in `.github/workflows/ci.yml` |

## FR-161 phrase-unit pivot — 종합 상태

**Coverage**: 96/125 refs (77%) 시편이 phrase-unit-aware rendering 으로 전환. 215 stanzas with phrases / 0 violations.

**파이프라인 (모두 land)**

| Sub-WI | 산출 | commit |
|---|---|---|
| R-0 PDF spike | `pdftotext -layout` 채택, +3 column wrap delta 검증 | d5380dc |
| R-1 extractor | `scripts/parsers/extract-phrases-from-pdf.mjs` | aa94642 |
| R-2 builder | `scripts/build-phrases-into-rich.mjs` (atomic + idempotent + dry-run) | ea90443 |
| R-3 schema | `PhraseGroup` additive on stanza | 54504a7 |
| R-4 + R-5 renderer | psalm-block + rich-content phrase-render branch | 06202e7 |
| R-6 verifier | `scripts/verify-phrase-coverage.js` (4 invariant) | d2943ea |
| R-7 pilot | Psalm 110:1-5,7 end-to-end Phase 0 milestone | 11c8ab4 |
| R-8 Phase 1 | week 1 batch (24/42 refs) + 자동화 도구 2 신설 | 5f7a774 |
| R-9.D | mid-stream drift / multi-page (+63 refs) | 51296c8 |
| R-9.A | multi-candidate trial-align | 6cd2b8e |
| R-9.C | section-title noise filter (+5 refs) | 83077de |
| R-9.B | defensive V/R prefix strip | f856ae5 |
| R-9.E | typography drift normalize | 36710bc |
| R-10 | NFR-009j CI gate | d64b082 |
| R-11 | PRD/traceability 등재 | 928eabc |
| R-12.1 | column-merge artifact fix (데이터 품질) | 71c6702 |
| R-12.3 | deep wrap depth 6→10 (defensive) | 9a466be |
| R-13 | hanging indent (wrap continuation 들여쓰기) | 4dba0dc |
| R-14 | PDF indent inconsistency audit | 869dc9d |
| R-15 | RichContent flow mode `'natural' \| 'sentence'` | 8f44847 + b364b64 |
| R-16 | sentence-mode boundary refinement (colon + look-ahead capital + 'legacy' literal) | 9e80fcb |

**핵심 자동화 도구 (재사용 가능)**

- `scripts/parsers/extract-phrases-from-pdf.mjs` — pdftotext-layout + 3-stage detection (visual indent / punctuation+capitalization / cross-check)
- `scripts/build-phrases-into-rich.mjs` — atomic + idempotent + dry-run + window-match alignment
- `scripts/dev/auto-reconcile-wraps.mjs` — wrap 정정 자동화 (5 mechanism: page-header-filter / multi-page extraction / coverage backfill / multi-candidate align / typography normalize)
- `scripts/dev/process-week-phrases.mjs` — week 단위 batch
- `scripts/dev/page-header-filter.mjs` — 공유 모듈 (page-header + section-title token)
- `scripts/verify-phrase-coverage.js` — 4 invariant CI gate

## RichContent flow mode (R-15 + R-16, land 완료)

`src/components/prayer-sections/rich-content.tsx` 의 `flow` prop:

```ts
flow?: 'legacy' | 'natural' | 'sentence'
```

- **`'legacy'`** (default, undefined 와 동작 동일) — 현재 line-by-line `<span class="block">`. psalm 본문 + line-구조 컨텍스트 (responsory / intercessions / hymn) 보존.
- **`'natural'`** — stanza INTERNAL lines 를 inline join. 단일 paragraph 자연 wrap. 시편 마침 기도문 + 짧은 독서.
- **`'sentence'`** — stanza lines 를 문장 경계 detection 으로 grouping. 각 문장 = 별도 `<p data-role="sentence">`. 전체 마침 기도문.

**caller 적용**:
- `psalm-block.tsx` `psalmPrayerRich` → `flow="natural"`
- `prayer-sections/short-reading-section.tsx` → `flow="natural"`
- `concluding-prayer-section.tsx` → `flow="sentence"`
- `prayer-sections/responsory-section.tsx` → 변경 없음 (V/R 구조 보존)
- `prayer-sections/intercessions-section.tsx` → 변경 없음 (petition 구조 보존)
- `hymn-section.tsx` → 변경 없음 (시 line 보존 의도)

**sentence boundary detection (R-16)**:
- line trailing punctuation `[.!?…:]` (콜론 포함 — 몽골어 liturgical 에서 흔함) + optional closing quote/paren
- next-line look-ahead: 다음 line 첫 글자가 Cyrillic 대문자 `\p{Lu}` 일 때만 boundary → `vs.` / `Mr.` 약어 false positive 방지
- 마지막 line 무조건 boundary (trailing fragment 보존)

**알려진 한계 (의도적)**: 약어 false positive 가능성은 next-line look-ahead capital 로 대부분 해소. 몽골어 기도문 cohort 에서 사실상 미발생 — 추가 정교화는 R-16+ 후속 후보.

**flow="natural" multi-block 한계 (R-17 진행 중 #198)**: 현재 `flow="natural"` 가 stanza INTERNAL 만 inline join. RichContent 가 multi-block (para + stanza 혼합) 이면 블록 경계에 hard break 남음. 사용자 reported (페이지 458 시편 마침 기도문 "ариун 과 нэр" / "гай 과 зовлон" 줄바꿈) — R-17 fix 진행 중.

## 진행 중 (in_progress)

### #198 FR-161 R-17: flow="natural" multi-block 합치기

- **owner**: member-01 (worktree-198-member-01, base `b364b64` 가 dispatched, main 은 #197 R-16 land 후 `9e80fcb` advance — rebase 필요)
- **type**: workitem
- **사용자 reported gap**: 페이지 458 시편 마침 기도문 — `flow="natural"` 가 stanza INTERNAL 만 합쳐서 multi-block 경계 hard break 남음. 사용자 spec: "기도문 전체를 한 단위로 해서 일반적인 성경 구절처럼 줄에 맞게 줄바꿈"
- **fix**: RichContent 의 `flow="natural"` 시 entire content 를 single `<p>` 로 모든 blocks (para + stanza) inline join. `flow="sentence"` 도 multi-block 대비 — blocks 합쳐서 sentence detection.
- **다음**: 보고 받은 후 leader merge + push → Vercel 재배포 → 모바일 시각 검증

## 후속 작업 큐

### 1. R-17 (#198) merge + push (R-17 land 즉시)

- multi-block flow fix 완료 후 즉시 merge + push → Vercel 재배포
- 사용자 reported 페이지 458 시편 마침 기도문 hard break fix 적용

### 2. R-14a — rich.json data-quality batch (Cat A + C + D + E ~10 refs)

audit (#191) 권고 첫 번째 dispatch.

- Cat A (cross-page typesetting variance 6 refs): Revelation 4/11, Ephesians 1, Colossians 1, Psalm 117/135 — rich.json 의 더 detailed split 을 canonical 로 통일
- Cat C (column-merge 잔재 1+ refs): Ephesians 1:3-10 line 3 split
- Cat D (cross-block contamination 1 ref): Psalm 137:1-6 Trinity formula 오염 line 제거
- Cat E (mid-line truncation ~3 refs): Psalm 81 / 137 / 144 truncated lines 복원
- 예상 coverage: 96 → ~104-106 refs
- 멤버: member-01 (rich.json + auto-reconciler 도구 작성자)

### 3. R-14b — content/translation drift audit (Cat B ~5 refs)

- Mongolian 단어 형태 차이 (case suffixes, verb forms)
- Mongolian-fluent reviewer 권고 — user 직접 검토 또는 별도 curator
- 영향 refs: Colossians 1:12-20, Psalm 135:1-12, Daniel 3:57-88, Jeremiah 31:10-14, Wisdom/Psalm 117/119
- FR-161 scope 외 (translation review track)

### 4. R-14c — page-mapping audit (Cat G ~3 refs)

- `scripts/audit-psalter-ref-consistency.js` 재실행 (NFR-009c)
- 영향 refs: Psalm 30:2-13, Psalm 21:2-8/14, Psalm 144:1-10
- divine-tester 또는 divine-researcher fit

### 5. R-12.5 — extractor wrap-inference heuristic (Cat F ~minority)

- 사용자 reported Psalm 108:2-7 "гэв." 케이스 같은 PDF wrap 누락 처리
- expected delivery: 1-2 refs (cost-model framework 예측)
- R-14a/c 후 잔여 cohort 재조사 후 결정 (defer)

### 6. NEEDS_USER 결정 (FR-160 handoff 에서 이월)

handoff-fr160 §2 의 refrain 분류 — Tobit 13:1-8, Isaiah 38:10-14/17-20 의 allowlist vs denylist. PDF + GILH 권위 참조 필요. 사용자 직접 결정.

## 운영 메모

### Worktree base mismatch (systemic, 16+ 회 재현)

- pair-cowork dispatch 의 `isolation.base_commit` 이 EnterWorktree 에 미전달
- root cause: Claude Code `EnterWorktree` schema 가 base 매개변수 부재 → `findRemoteBase()` 가 stale `origin/main` 자동 선택
- **우회 protocol** (사용자 비공식 승인, #171 deferred):
  1. 멤버: dispatch 받으면 `git rev-parse HEAD` vs `dispatch.isolation.base_commit` 비교
  2. 불일치 시: `git rebase --onto <base> 3ed9f3f worktree-N-member` 또는 `git checkout <base> -- <files>` (member-01 / planer 검증 패턴)
  3. 단일 commit 으로 ff-mergeable 만들기
- 13+ dispatch 모두 우회로 안정 운영
- memory `feedback_enterworktree_base_mismatch.md` + `feedback_dispatch_vs_user_authority.md`

### Cost-model framework (7 of 7 prediction power, R-9 series)

- handler series 의 sum-of-estimates 는 valid, per-handler delivery 점진 감소
- "earlier generic fix absorbs later specific category" 5단계 (R-9.D/A/C/B/E) + 2단계 (R-12.1/12.3) 검증
- per-handler estimate 는 현재 NOVEL_EDGE failure-mode classification 에서 도출 — category-name extrapolation 만으로는 부정확
- memory `feedback_series_cost_model.md`

### CLAUDE.md 정책 준수

- sw.js untouched (R-13 등 renderer 변경에도 navigation network-only 정책 영향 없음, CACHE_VERSION bump 불필요)
- 시각 회귀 0 (R-4 renderer 가 phrase.lineRange.slice + join 으로 byte-identical 출력)
- e2e 안정성: `data-render-mode="phrase"` + `data-role` 마커 보존

## 팀 멤버 (divineoffice)

모두 6명, 활성/idle 상태:

| 멤버 | profile | 적합 task |
|---|---|---|
| divine-researcher | researcher / Explore (read-only) | research, codebase audit, PDF inspection |
| divine-review | adversarial-reviewer | review, peer audit |
| divine-tester | tester | e2e, vitest, AC verification, verifier 작성 |
| member-01 | implementer | renderer, builder, extractor, data migration |
| planer | planner | plan, decompose, traceability |
| solver | problem-solver | bug fix, infrastructure (단 venv 수정은 user 직접 승인 필요, #171 deferred) |

## 참고 문서

- `docs/PRD.md` — FR-161 (§시편/기도문 phrase-unit) + NFR-009j (phrase coverage 정합성)
- `docs/traceability-matrix.md` — FR-161 행 (R-1 ~ R-13 evidence)
- `docs/traceability-auto.md` — 자동 재생성, FR-161 R-0/R-1/R-3/R-4/R-7 태그 자동 수집
- `docs/fr-161-phrase-unit-pivot-plan.md` — FR-161 plan (557줄, planer #172)
- `docs/fr-161-r7-pilot-psalm110-evidence.md` — Phase 0 milestone evidence
- `docs/fr-161-r8-phase1-week1-evidence.md` — Phase 1 확산
- `docs/fr-161-r9d-pattern-d-evidence.md` — multi-page mechanism
- `docs/fr-161-r9a-pattern-a-evidence.md` — Daniel 44-rep canticle stress
- `docs/fr-161-r9c-pattern-c-evidence.md` — section-title filter
- `docs/fr-161-r9b-pattern-b-evidence.md` — defensive V/R
- `docs/fr-161-r9e-typography-evidence.md` — typography normalize
- `docs/fr-161-r10-evidence.md` — CI gate
- `docs/fr-161-r12-1-column-merge-evidence.md` — extractor column boundary fix
- `docs/fr-161-r12-3-deep-wrap-evidence.md` — depth raise (defensive)
- `docs/fr-161-r14-pdf-indent-inconsistency.md` — 7-category audit (R-14)
- `src/components/prayer-sections/__tests__/rich-content-flow.test.ts` — flow mode 15 unit case (6 natural + 6 sentence + 3 R-16 refinement)
- `docs/handoff-fr160.md` — FR-160 phase A/B/C/D 진행 상태 (선행 작업)

## 검증 명령 (재현)

```bash
cd "/home/min/myproject/divine office"
npx vitest run                                              # 663 PASS
npx tsc --noEmit                                            # 0 errors
node scripts/verify-phrase-coverage.js --check              # 215 stanzas, 0 violations
npm run verify:phrase-coverage                              # CI script (동일)
node scripts/build-phrases-into-rich.mjs --extractor-out <json> --target src/data/loth/prayers/commons/psalter-texts.rich.json --dry-run
node scripts/dev/process-week-phrases.mjs --week 1          # batch dry-run
for v in psalter hymn compline propers psalter-body sanctoral; \
  do node scripts/verify-${v}-pages.js; done                # baseline 무회귀
git diff HEAD -- public/sw.js                               # empty
```

## 사용자 권고 수동 검증 (CLAUDE.md self-review)

- iOS Safari / Android Chrome 모바일에서 시편 본문 phrase wrap + hanging indent 시각 확인 (Sun Vespers I → Psalm 110, R-13)
- 시편 마침 기도문 + 짧은 독서 → 한 paragraph 자연 wrap 확인 (R-15 natural mode, R-17 land 후 multi-block hard break 0)
- 전체 마침 기도문 → 두 문장 visible 분리 + 각 자연 wrap 확인 (R-15 sentence + R-16 boundary refinement)
- 페이지 458 시편 마침 기도문 → "ариун нэр" / "гай зовлон" 단어 사이 hard break 0 (R-17 #198 land 후)
- 이전 배포 HTML 캐시된 상태에서 새 페이지 클릭 정상 (sw.js untouched 이므로 안전 예상)
- A2HS 설치된 PWA 재실행 시 새 phrase-render + flow path 반영
