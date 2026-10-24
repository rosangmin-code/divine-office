# 시편 139 II부 복원 · 시편 144 목요일 I부 분리 · 시편 101 혼입 제거 (2026-10-24)

증상·원인·검증은 `docs/bug-reports/2026-10-24-psalter-139-missing-144-duplicate-verses.md`.
이 폴더는 데이터를 고친 과정의 재현 자료다. 방법은 `docs/research/split-psalm-part2/`
(2026-08-08 분할 시편 II부 5건)와 같고, 그 폴더의 단(column) 추출기를 그대로 불러 쓴다.

| 파일 | 역할 |
|---|---|
| `emit-lines.py` | 인쇄면 행 + 연 경계 추출. `--validate` 는 저장된 시편 139 I부·시편 144 II부를 재현해 본다 |
| `ps139-II.json` · `ps144-I.json` | 추출 결과 (검토용 중간 산출물) |
| `build.mjs` | plain·rich·머리말·`week-4.json` 반영 + 시편 85 «ЭЗЭН,» (`--write`) |
| `fix-ps101.mjs` | 시편 101 끝의 다니엘 3 첫 연 제거 (`--write`) |

```
python3 docs/research/psalter-139-144-verses/emit-lines.py --validate
python3 docs/research/psalter-139-144-verses/emit-lines.py
node    docs/research/psalter-139-144-verses/build.mjs          # dry-run
node    docs/research/psalter-139-144-verses/fix-ps101.mjs      # dry-run
```

`build.mjs --write` 는 한 번만 돌릴 수 있다. 옛 키(`Psalm 139:1-18` 등)가 없어진 뒤에는 시작할 때 멈춘다.

검출기 재현 결과(수정 후): 저장된 시편 139 I부·시편 144 II부가 행 글자와 연 경계까지 인쇄면과 전부 일치한다. 수정 전에는 두 곳이 달랐다. 하나는 139 I부의 연 경계 하나로, p.465 «Хэлэн дээр минь…» 앞의 빈 줄이 데이터에 빠져 있었다. 다른 하나는 144 II부의 `II` 표지다. «Аяа,» 쉼표(STC-019)는 비교할 때 인쇄면 쪽에 같은 규칙을 적용했다. 새 구간은 인쇄면 PNG(p.466–467, 480–481)로 글자와 연 경계를 대조했다.
