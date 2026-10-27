# 분할 시편 마침 기도 위치 (2026-10-25)

증상·원인·검증은 `docs/bug-reports/2026-10-25-split-psalm-prayer-placement.md`.

| 파일 | 역할 |
|---|---|
| `build.mjs` | 45·49·132·145 기도를 II부 키로 이동, 27·72 기도 추가(p.119/257), 139 II부 기도 쪽수, `week-3.json` 금 저녁 135 I부 자리 `omitPsalmPrayer` (`--write`) |

```
node docs/research/split-psalm-prayer-placement/build.mjs           # dry-run
node docs/research/split-psalm-prayer-placement/build.mjs --write
```

`--write` 는 한 번만 돌릴 수 있다. 이미 옮겨진 뒤에는 시작할 때 멈춘다(II부에 이미 기도가 있음).

인쇄면 확인은 `docs/research/split-psalm-part2/extract_shared.py` 의 `column_lines` 로 부 표지·영광송·기도 제목의 순서를 보고, 새로 넣은 기도 두 건은 `pdftoppm` 인쇄면 PNG 와 글자를 대조했다.
