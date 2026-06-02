# BUG: FR-161 paragraphBoundaries 스냅샷 drift — Psalm 63:2-9 (사전 존재)

- **발견일**: 2026-06-02
- **발견 경위**: GOAL #193(시편 페이지바꿈 문단 분리 근본수정) 머지 후 리더 통합검증(`npx vitest run src/lib/__tests__/ scripts/__tests__/`) 중 노출
- **심각도**: LOW (테스트-데이터 drift / 단위 테스트 1건 red. 실제 사용자 화면 회귀 아님)
- **상태**: **사전 존재(pre-existing)** — #193 이전부터 red. #193과 무관(별도 수정 필요)
- **분류**: 테스트 스냅샷 vs 실제 데이터 불일치 (FR-161 `paragraphBoundaries`)

## 증상

`scripts/__tests__/build-paragraphs-into-rich.test.mjs`(FR-161, "Pilot snapshot — rich.json post-inject")의 `Psalm 63:2-9 block 0` 단언이 실패한다. 테스트는 block 0의 `paragraphBoundaries`가 `[2, 8]`이길 기대하나, 실제 `psalter-texts.rich.json`의 값은 `[6]`이다.

## 로그 기록

```text
# npx vitest run src/lib/__tests__/ scripts/__tests__/  (merged main 1d1fa06)
PASS (964) FAIL (1)
AssertionError: expected [ 6 ] to deeply equal [ 2, 8 ]
    at /home/min/myproject/divineoffice/scripts/__tests__/build-paragraphs-into-rich.test.mjs:138:24
```

테스트 기대값 (build-paragraphs-into-rich.test.mjs:113-117):
```js
const EXPECTED = {
  'Psalm 63:2-9': {
    0: [2, 8], // text-based old [8] became PDF-based [2, 8]
    1: [6],    // new finding
  },
  ...
}
```

## 사전 존재 / #193 무관 입증 (로그)

```text
# 1) #193 데이터 diff가 Ps63을 건드렸는가? → 0건 (본문 변경 없음)
$ git diff d8ed7d1 1d1fa06 -- src/data/loth/prayers/commons/psalter-texts.rich.json | grep -c "Psalm 63"
0
  (※ '63' 매칭은 diff hunk-header 행번호 @@ -463 / -3637 뿐 — 본문 아님)

# 2) #193 이전 커밋(c18c8f1)의 Ps63 block0 PB는 이미 [6] 였는가? → 그렇다
$ git show c18c8f1:src/data/loth/prayers/commons/psalter-texts.rich.json | node -e "...['Psalm 63:2-9'].stanzasRich.blocks..."
PRE-#193 Ps63 block0 PB: [6]
PRE-#193 Ps63 block1 PB: [6]

# 3) 독립 감사자(ephemeral) — c18c8f1 fresh worktree에서 동일 실패 재현
isolation check via fresh worktree at pre-#193 commit c18c8f1 ->
  Ps63 snapshot test ALREADY failed identically (expected [6] to deeply equal [2,8]) before #193
```

→ Ps63:2-9는 #193의 27개 병합 대상 목록(docs/research/GOAL193-triage.md)에 **없으며**, #193 데이터 diff에 **본문 변경 0건**. 실패는 **#193 이전부터** 존재했다. (#172/#187 사이클에서도 이 테스트는 targeted shard에 포함되지 않아 조용히 red였던 것으로 추정.)

## 원인 (추정)

`psalter-texts.rich.json`의 `Psalm 63:2-9` block 0 실제 `paragraphBoundaries`는 `[6]`인데, FR-161 스냅샷 테스트는 `[2, 8]`을 고정값으로 단언한다. 어느 시점엔가 rich 빌더(`build-paragraphs-into-rich`) 산출 또는 데이터가 변했는데 스냅샷 기대값이 동기화되지 않은 **snapshot drift**로 보인다. (테스트 주석 자체가 "text-based old [8] became PDF-based [2, 8]" / block1 "new finding [6]"이라 적어 값이 유동적이었음을 시사.)

## 영향

- 단위 테스트 1건 red. 실제 사용자 화면(Ps63 렌더)에 즉각적 회귀가 있다는 의미는 아님 — `paragraphBoundaries`는 rich 문단 레이아웃 힌트.
- 다만 **어느 쪽이 옳은지 미결**: 실제 데이터의 `[6]`이 맞는지(→ 테스트 기대값을 `[6]`로 갱신) vs 스냅샷 `[2,8]`이 맞는지(→ rich 데이터/빌더 수정). FR-161 원본 레이아웃(full_pdf Ps63) 기준 판단 필요.

## 권장 조치 (별도 작업)

1. full_pdf.txt의 Psalm 63:2-9 원문 문단 구조를 확인해 block 0의 올바른 `paragraphBoundaries`(`[2,8]` vs `[6]`)를 결정.
2. 결정에 따라 (a) 테스트 기대값을 실제값으로 갱신 + 주석/sw.js 합리화 블록 동기화, 또는 (b) rich 데이터/빌더 정정.
3. 테스트 주석(build-paragraphs-into-rich.test.mjs:110-112)이 요구하는 대로, 스냅샷 변경 시 CACHE_VERSION bump 동반 검토.

## 비고

- GOAL #193 자체는 clean(audit PASS, 본 버그와 무관)하게 종결됨.
- 함께 관측된 `audit-psalter-ref-consistency` suspect 3→4 증가분(병합 시편이 full_pdf 페이지 분절을 가로지름)은 의도된 병합의 heuristic false-positive이며 데이터는 full_pdf 축자 대조로 정합 확인됨 — 본 버그와 별개의 양성 신호.
