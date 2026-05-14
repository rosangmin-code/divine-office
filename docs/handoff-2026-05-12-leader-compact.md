# Handoff — 2026-05-12 Leader Compact

## TL;DR

이번 세션 (2026-05-11 ~ 12) **시편/찬가 줄바꿈 재설계 2-Phase 완료**. main HEAD `cdc4a9c`. push 완료, CI PASS. Phase 1 (phrase grouping by capital-start, #498 Pilot + #499 Sweep) + Phase 2 (paragraphBoundaries by PDF y-gap, #500 R-1 / #501 R-2 Pilot / #503 R-3 Sweep) 모두 land. 사용자 결정에 따라 #502 renderer indent 통일 (좌측 여백 단일화). #497 lint NIT + process docs cleanup. **사용자 화면 검증 대기** (Phase 2 R-3 sweep 변경분). leader ctx 컴팩트 + 멤버 2 clear (member-01 / solver).

## main HEAD progression (이번 세션)

```
249a9e8 (이전 baseline — Phase 1 Sweep merged)
  ↓
806d8e7 feat(phrase-grouping+sw): #498 Phase 1 Pilot — Psalm 63/42 + CACHE v23→v24
f323f6f feat(phrase-grouping+sw): #499 Phase 1 Sweep — 122 refs + CACHE v24→v25
19fab90 feat(paragraphs+sw): #501 Phase 2 R-2 Pilot — paragraph extractor (Python pdfplumber + y-gap heuristic) + Psalm 42/63 + CACHE v25→v26
436773b feat(renderer): #502 시편/찬가 본문 왼쪽 여백 통일 — renderer indent 차이 제거 + CACHE v26→v27
cf3a601 chore(lint+docs): #497 NIT batch — unused-vars cleanup + process docs (CACHE bump policy + typo unmask cascade)
cdc4a9c feat(paragraphs+sw): #503 Phase 2 R-3 Sweep — 122 refs paragraphBoundaries inject (pdfplumber y-gap) + CACHE v27→v28
[현재 main HEAD = cdc4a9c, push 완료, CI PASS]
```

## Phase 2 paragraph rebuild — 메커니즘 SoT

**Extractor**: `scripts/lib/extract-paragraphs-from-pdf.py` (Python pdfplumber)
**Bridge**: `scripts/build-paragraphs-into-rich.mjs` (Node spawnSync)
**Sweep orchestrator**: `scripts/dev/sweep-paragraphs-into-rich.mjs`

알고리즘:
- pdfplumber 로 PDF page 의 chars 추출 → round(top, 1) 기준 line clustering
- x0 으로 좌/우 column 분리 (column hint 입력)
- 본문 line 정렬 후 인접 line 간 top-to-top gap 계산
- median gap 기준 multi-tier 분류:
  - gap < 1.3 × median → continuation (paragraph X)
  - 1.3 × median ≤ gap < 1.95 × median → paragraph break (paragraphBoundaries 에 add)
  - gap ≥ 1.95 × median → stanza break

R-1 PoC (Psalm 42:2-6) gap distribution {13.20: 16, 20.40: 3} 에서 paragraph 위치 line idx 4/8/13 = 100% accuracy. Pilot/Sweep 모두 idempotent (#501 commit 19fab90 결과와 bit-identical 재계산).

## In-flight / Pending

### In-flight
- 없음 (all members idle)

### 사용자 화면 검증 대기 (#503 sweep)

| Spot-check 영역 | 검증 포인트 |
|----------------|------------|
| **ADD**: Psalm 8 / Psalm 86 / Psalm 130 | 이전 PB 1-2 개 → fine-grained PB (paragraph 가 늘어남) |
| **REMOVE**: Daniel 3:57-88 + 3:52-57 | invocation+refrain F-X11 false-positive 가 sweep 으로 정리됨 |
| **DIFF**: Psalm 136 | over-fragmented refrain pattern 단순화 |

처리 안내: 사용자가 시각 검증 후 OK 면 종결, NOT-OK 면 spot-fix dispatch.

### Pending dispatch
- 없음 (cohort 완전 종결, NIT batch 도 #497 로 cleanup 완료)

### Deferred
- **#171** EnterWorktree base mismatch fix Option B (사용자 보류 유지 — 우회책: dispatch 후 worktree rebase --onto)

## CACHE chain (이번 세션)

```
v23 (이전 baseline)
v23 → v24  #498 Phase 1 Pilot — phrase grouping rebuild Psalm 63/42
v24 → v25  #499 Phase 1 Sweep — phrase grouping 122 refs
v25 → v26  #501 Phase 2 R-2 Pilot — paragraph extractor + Psalm 42/63
v26 → v27  #502 renderer indent 통일 (className 변경)
v27 → v28  #503 Phase 2 R-3 Sweep — 122 refs paragraphBoundaries
```

각 bump 의 rationale 은 commit 의 sw.js comment block 참고.

## 데이터 변경 요약 (#503 Phase 2 R-3 Sweep)

`src/data/loth/prayers/commons/psalter-texts.rich.json`:
- paragraphBoundaries 총 개수: 88 → 458 (+370)
- diff: +704 / -32 lines
- Psalm 42:2-6 b0=[4,8,12] b3=[3,7,11,15,19] + Psalm 63:2-9 b0=[2,8] b1=[6] — Pilot 과 bit-identical (idempotent regression guard 통과)
- block-level delta breakdown 은 `public/sw.js` v28 comment block 참고

## 멤버 상태

전부 idle. ctx 정리 완료:
- member-01 / solver: clear 처리 (둘 다 430k+/240k+ ctx → fresh)
- dev / divine-researcher / divine-review / divine-tester / planer: 가벼움, clear 불필요

## 사용자 결정 게이트 (1 미해소)

| Gate | 상태 | 결정 권고 |
|------|------|-----------|
| #503 sweep 시각 검증 | 미해소 | 사용자 확인 (ADD 3, REMOVE 1 group, DIFF 1) |

## 운영 노트 (이번 세션에서 학습된 패턴)

### Worktree base mismatch ad-hoc rebase 패턴 (#503 merge resolution)

상황: main 이 #497 머지로 cf3a601 진행한 사이, member-01 의 worktree-503 은 18e354e (pre-#497) base.

해결:
```bash
cd .claude/worktrees/503-member-01
git rebase main      # #497 과 file 영역 무충돌이라 clean rebase
cd /home/min/myproject/divineoffice
git merge --ff-only worktree-503-member-01
```

#171 의 leader pre-create (Option B) 가 land 되기 전까지 worktree base mismatch 발생 시 표준 우회.

### Parallel dispatch with file-area separation

#503 (rich.json + sw.js) 와 #497 (scripts/ + docs/process/) 를 동시 dispatch 했지만 file 영역 무충돌이라 race 없음. 단 wrap-rate-invariant.test.mjs 는 양쪽이 touch 가능했지만 #503 의 PB 변경이 invariant 의 expected snapshot 을 갱신하는 형태였고 #497 은 그 file 미터치라 무사 통과.

## 참고

- Phase 1 audit: `docs/handoff-fx11-phase2b-2026-05-09.md` (이전 세션 baseline)
- Phase 2 R-1 research: `docs/research/paragraph-grouping-r1-2026-05-11.md` (#500 deliverable)
- 이전 컴팩트: `docs/handoff-2026-05-09-leader-compact.md`
