# 시편·찬가 본문 전수 대조 (2026-10-27)

증상·원인·검증은 `docs/bug-reports/2026-10-27-psalm-omission-audit.md`.

앱이 시편·찬가 본문을 그리는 모든 자리(198곳)를 책의 해당 블록과 낱말 단위로 맞춘다. 2026-10-24 시편 139 II부에서 13–18절이 통째로 빠진 것이 발견된 뒤 "빠짐은 겹침 검사로 안 잡힌다 — 자리마다 책과 대조해야 한다"고 남겨 둔 일(`2026-10-24-psalter-139-missing-144-duplicate-verses.md` §4)을 한 것이다.

GOAL 106 의 "책 전체에서 어느 데이터에도 덮이지 않은 구간" 방식은 시편이 책 여러 곳에 반복 인쇄되어 잡음에 묻혔다(`docs/research/goal106-followup/README.md`). 여기서는 **자리마다** 책의 구조 표지(빨간 제목·이탤릭 머리말·부 표지 → 영광송·후렴)로 블록을 잘라 그 문제를 피한다.

| 파일 | 역할 |
|---|---|
| `stream.py` | `public/psalter.pdf` 전체를 북페이지 읽기 순서로, 행마다 글꼴·색·크기를 붙인 스트림으로 저장 (~36초) |
| `audit.py` | 자리마다 책 블록을 잘라 앱 본문과 difflib 로 대조. `--show "<ref>@<page>"` 는 한 자리를 나란히 보여 준다. `--emit-fixture` 는 회귀 테스트 지문을 다시 만든다 |
| `emit-fixes.py` | 복원할 인쇄 행 구간 → `fix-lines.json` |
| `fix-lines.json` | 복원 행 (검토용 중간 산출물) |
| `build.mjs` | plain·rich·머리말·본문 시작 쪽 반영 (`--write`, 한 번만 — 다시 돌리면 시작할 때 멈춘다) |

```
S=/tmp/stream.json
python3 docs/research/psalm-omission-audit/stream.py $S
python3 docs/research/psalm-omission-audit/audit.py $S                 # 어긋난 자리만
python3 docs/research/psalm-omission-audit/audit.py $S --show "Psalm 42:2-6@195"
python3 docs/research/psalm-omission-audit/emit-fixes.py $S
node    docs/research/psalm-omission-audit/build.mjs                    # dry-run
python3 docs/research/psalm-omission-audit/audit.py $S --emit-fixture  # 책이 바뀌었을 때
```

## 블록 자르기 규칙 (`audit.py` 의 `kind()`·`region()`)

- 본문 = 로만 11pt 검은 행. 이탤릭 비율 0.15 이상은 머리말(인용 + 로만 출처가 한 행에 섞인다), `(…)` 로 시작하거나 `…)` 로 끝나는 행은 출처, 10pt 는 시기별 후렴, 대문자 한 글자 행은 장식 조각(p.32 «М»).
- 빨간 머리 글자 행은 후렴(`Шад дуулал …`)·루브릭이라 블록을 끊는다. 단 `-`·`(Х.`·`Х.` 로 시작하는 행은 찬가의 응답 행(Илчлэл 19)이라 본문이다. 빨간 `(…)` 행(초대송 95 의 «(Шад дуулал давтагдана)»)은 끊지 않고 건너뛴다.
- 앵커: `page` ±2 쪽에서 앱 첫 행의 첫 네 낱말. 못 찾으면 둘째·셋째 행으로 다시 찾는다(시편 47 처럼 머리말이 본문 첫 행에 들어간 경우 — 건너뛴 앱 낱말은 '앱에만 있음'으로 드러난다).
- 낱말 정규화: 소문자, 라틴 동형 글자→키릴, 문장부호 제거. «Аяа,» 쉼표(STC-019)는 문장부호라 비교에 걸리지 않는다.

## 남은 차이 (수정 후)

`audit.py` 실행 결과 `MAJOR 1, minor 9, ok 188`.

- MAJOR 1 — 시편 67 p.333: 책이 끝 후렴을 이 인쇄본에만 한 번 더 싣는다(p.30·p.239 에는 없음). 사용자 판단 대기 — bug report §7.
- minor 9 — 모두 PDF 쪽에서 두 낱말이 붙어 추출되는 것(`хийгээдсүр`, `учирмөнхөд` …). 앱이 맞다. 회귀 테스트는 낱말을 띄어쓰기 없이 이어 비교하므로 걸리지 않는다.
