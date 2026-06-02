## 빌더 산출

결론: 현재 `scripts/build-paragraphs-into-rich.mjs` 빌더가 `Psalm 63:2-9` block0에 산출하는 `paragraphBoundaries`는 `[6]`이다. 비교 후보였던 `[2,8]`가 아니라, 현재 rich JSON에 들어 있는 값(`src/data/loth/prayers/commons/psalter-texts.rich.json:187-189`)과 같은 `[6]`로 판정된다.

비파괴 확인 명령:

```bash
node scripts/build-paragraphs-into-rich.mjs --dry-run
```

관련 출력:

```text
build-paragraphs-into-rich summary
============================================================
  [SAME] Psalm 63:2-9 b0 lines=11 median=13.2pt threshold=18.48pt
    old=[6] new=[6]
  [SAME] Psalm 63:2-9 b1 lines=13 median=13.2pt threshold=18.48pt
    old=[6] new=[6]
  [SAME] Psalm 42:2-6 b0 lines=19 median=13.2pt threshold=18.48pt wraps=1
    old=[4,8,12] new=[4,8,12]
  [NEW] Psalm 42:2-6 b1 lines=6 median=13.2pt threshold=18.48pt
    old=null new=[]
  [NEW] Psalm 42:2-6 b2 lines=4 median=13.2pt threshold=18.48pt wraps=1
    old=null new=[]
  [SAME] Psalm 42:2-6 b3 lines=20 median=13.2pt threshold=18.48pt wraps=1
    old=[3,7,11,15,19] new=[3,7,11,15,19]

--dry-run: rich.json NOT written.
```

빌더 경로:

- `Psalm 63:2-9` block0은 파일 내 pilot manifest에서 `pages: [29]`, `column: 'left'`로 고정되어 있다(`scripts/build-paragraphs-into-rich.mjs:55-58`).
- 빌더는 대상 stanza block의 `lines[].spans`에서 텍스트 라인만 추출한다(`scripts/build-paragraphs-into-rich.mjs:69-78`).
- 그 라인 배열을 scratch JSON으로 쓰고, `scripts/lib/extract-paragraphs-from-pdf.py`를 `--pdf`, `--pages`, `--column`, `--block-lines-json`, `--ref` 인자로 실행한 뒤 stdout JSON을 파싱한다(`scripts/build-paragraphs-into-rich.mjs:92-129`).
- extractor 결과의 `paragraphBoundaries`가 `newPB`가 되고, 기존 `paragraphBoundaries`와 diff되어 `old=[6] new=[6]` 형태로 출력된다(`scripts/build-paragraphs-into-rich.mjs:189-204`, `scripts/build-paragraphs-into-rich.mjs:223-240`).
- 이번 실행은 `--dry-run`이므로 파일 쓰기 전에 종료하며 `rich.json NOT written`을 출력한다(`scripts/build-paragraphs-into-rich.mjs:247-249`).

PB 산출 알고리즘:

- extractor는 PDF 문자를 `top` 좌표 기준 물리 라인으로 클러스터링하고, `x0 < 297pt` 기준으로 좌/우 컬럼을 나눈다(`scripts/lib/extract-paragraphs-from-pdf.py:10-13`, `scripts/lib/extract-paragraphs-from-pdf.py:186-209`, `scripts/lib/extract-paragraphs-from-pdf.py:212-272`).
- rich block 첫 줄을 PDF 컬럼 라인 스트림에서 찾고, 각 rich 라인을 하나 이상의 연속 PDF 물리 라인에 매칭한다. wrap bridge와 reverse bridge 때문에 한 rich 라인이 여러 PDF 라인을 소비하거나 여러 rich 라인이 한 PDF 라인을 공유할 수 있다(`scripts/lib/extract-paragraphs-from-pdf.py:14-19`, `scripts/lib/extract-paragraphs-from-pdf.py:283-391`, `scripts/lib/extract-paragraphs-from-pdf.py:394-448`).
- 매칭된 각 rich 라인에 대해 첫 PDF 라인의 `top`과 마지막 소비 PDF 라인의 `top`을 기록한다(`scripts/lib/extract-paragraphs-from-pdf.py:496-527`).
- gap은 이전 rich 라인의 마지막 PDF 라인 top에서 현재 rich 라인의 첫 PDF 라인 top까지의 차이로 계산한다. 페이지나 컬럼이 바뀌면 gap은 `None`으로 둔다(`scripts/lib/extract-paragraphs-from-pdf.py:530-547`).
- finite gap들의 median을 기준 줄간격으로 잡고, 기본 `thresholdRatio` 1.4를 곱한 threshold 이상이면 해당 rich 라인 index를 `paragraphBoundaries`에 넣는다. stanza-level gap(`1.95 * median` 이상)도 경고와 함께 PB로 포함된다(`scripts/lib/extract-paragraphs-from-pdf.py:67-70`, `scripts/lib/extract-paragraphs-from-pdf.py:548-565`).
