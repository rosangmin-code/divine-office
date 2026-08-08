# 분할 시편 II부 5건 복원 (2026-08-08)

책은 긴 시편을 I부 / II부로 나눠 인쇄한다. 앱 데이터는 II부 슬롯에 I부의 `ref` 를
그대로 들고 있어 **I부가 두 번 렌더되고 II부가 한 번도 나오지 않았다**.
증상·원인·검증은 `docs/bug-reports/2026-08-08-split-psalm-part2-missing.md`.
이 폴더는 II부 본문을 인쇄면에서 복원한 과정의 재현 자료다.

## 왜 이렇게 했나

`psalter-texts.json` 은 추출본이 아니라 **큐레이트 자산**이라 전체 재추출이 금지돼 있다
([[psalter-curated-no-full-reextract]]). 그래서 새 5건만 수술적으로 만들되, 기존 I부를
**정답지로 삼아 파이프라인을 먼저 검증**하고 같은 코드로 II부를 생성했다.

렌더가 실제로 소비하는 필드는 세 가지다 (`src/components/psalm-block.tsx`):

- `blocks[].lines[].spans[].text` — 인쇄 행 1:1
- `blocks[].phrases[].lineRange` — 단 폭에서 접힌 행을 논리 시행으로 병합
- `blocks[].paragraphBoundaries` — 연 사이 `mt-3` 간격

`line.indent` / `phrase.indent` 는 WI #502 이후 렌더에서 무시된다. plain
`stanzas[]` 는 phrase 결합 결과와 같다 (블록 하나가 배열 하나).

## 스크립트

| 파일 | 역할 |
|---|---|
| `extract_shared.py` | 인쇄면 단(column) 행 추출 공용 (pdfplumber, 5건 쪽 매핑) |
| `emit-lines.py` | II부 구간의 `lines[]` + `paragraphBoundaries` 산출. `--validate` 로 I부 재현 검증 |
| `compare-part1.py` | I부 인쇄 행 ↔ 저장 데이터 행 대조 (접힘·큐레이션 규약 파악용) |
| `dump-indent.py` | 저장 `line.indent` ↔ 인쇄면 x0 대응 확인 |
| `crop-columns.py` | II부가 실린 단을 PNG 로 렌더 → `crops/` |
| `build-part2.mjs` | plain·rich 엔트리 생성 + `week-*.json` ref/page 교정 (`--write`) |

```
python3 docs/research/split-psalm-part2/emit-lines.py --validate   # 검출기 검증
python3 docs/research/split-psalm-part2/emit-lines.py              # part2-*.json 생성
node    docs/research/split-psalm-part2/build-part2.mjs            # dry-run
node    docs/research/split-psalm-part2/build-part2.mjs --write    # 반영
```

## 검증 결과

**행·연 검출기** (`emit-lines.py --validate`) — I부 기준

| 시편 | 행 수 | `paragraphBoundaries` |
|---|---|---|
| ps45 | 14/14, 15/15 | `[4,7,11]`, `[5,10]` 완전 일치 |
| ps72 | 28/28 | `[5,10,14,20,24]` 완전 일치 |
| ps145 | 16/16, 16/16 | `[4,8,12]`, `[5,10]` 완전 일치 |
| ps49 · ps132 | — | 저장본이 두 쪽을 **한 블록**으로 합쳐 둔 차이만 (블록 병합 시 오프셋 적용해 일치) |

블록은 렌더에서 `space-y-5` 간격을 만든다. 쪽 넘김 자리에 없던 큰 여백이 생기지
않도록 II부는 전부 **한 블록**으로 만들었다 (저장본 ps49·ps132 와 같은 방식).

**phrase 병합** — `scripts/build-phrases-into-rich.mjs` 의
`regroupPhrasesByCapitalStart(lines)` 가 I부 5건 **전 블록의 저장된 `phrases` 를
정확히 재현**하는 것을 확인하고 그대로 썼다.

예외 하나: 이 함수의 `^[А-ЯЁӨҮ]` 는 여는 따옴표를 못 넘겨 `“Биеийн…` 같은 행을 앞
phrase 로 잘못 병합한다 (저장된 `Psalm 132:1-10` I부가 실제로 그 상태). 새 데이터에
같은 결함을 재생산하지 않도록 따옴표 뒤 대문자도 phrase 시작으로 봤고, 발동한
ps132 2곳 모두 선행 행이 짧아 줄바꿈 지점이 아님을 인쇄면으로 확인했다.
기존 37건은 인용이 같은 절의 연속인 경우가 섞여 있어 건별 판정이 필요 — 미수정.

**본문 글자** — `crops/bp*.png` 로 인쇄면을 직접 봤다. 추출 텍스트끼리의 대조는
근거가 못 된다 ([[pdf-verdict-render-printed-page]]).

## 산출물

`part2-*.json` 은 검토용 중간 산출물이다 (인쇄면 행 + 연 경계).
`crops/bp{204,205,220,221,256,257,369,498,499}.png` 는 판정 근거 이미지.
