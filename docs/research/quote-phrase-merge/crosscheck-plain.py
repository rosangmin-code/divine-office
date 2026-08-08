#!/usr/bin/env python3
"""따옴표 케이스 37건을 plain 저장본과 교차 검증한다.

rich 의 phrases 는 `^[А-ЯЁӨҮ]` 휴리스틱 산출물이지만, plain `stanzas[]` 는
별도로 큐레이트된 시행 목록이다. 같은 자리에서 plain 이 따옴표 행을 **독립
항목**으로 갖고 있으면 rich 의 병합이 결함이라는 독립 근거가 된다.

캘리브레이션 결과 이 책의 접힘 신호는 **소문자 시작**이고 들여쓰기나 단 폭은
아니다 (확실한 접힘 277건의 앞 행 여유 중앙값 55pt — 단 끝까지 차지 않는다).
따옴표 뒤 대문자는 책의 규약상 새 시행이므로, 그 판단이 plain 과 일치하는지 본다.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent

rich = json.load(open(ROOT / "src/data/loth/prayers/commons/psalter-texts.rich.json"))
plain = json.load(open(ROOT / "src/data/loth/psalter-texts.json"))
cases = json.load(open(HERE / "verdicts.json"))

agree = disagree = nodata = 0
rows = []
for c in cases:
    ref, bi = c["ref"], c["block"]
    st = (plain.get(ref) or {}).get("stanzas") or []
    if bi >= len(st):
        rows.append((ref, c["line"], "plain 없음", c["quote"]))
        nodata += 1
        continue
    entries = [e.strip() for e in st[bi]]
    q = c["quote"].strip()
    merged = f"{c['prev'].strip()} {q}"
    if any(e == q for e in entries):
        rows.append((ref, c["line"], "plain 도 분리", q)); agree += 1
    elif any(e == merged for e in entries):
        rows.append((ref, c["line"], "plain 도 병합", q)); disagree += 1
    else:
        hit = next((e for e in entries if q in e), None)
        rows.append((ref, c["line"], f"plain 부분포함: {hit[:50] if hit else '미발견'}", q))
        nodata += 1

for ref, ln, verdict, q in rows:
    print(f"{verdict:22} {ref} line{ln}  {q[:52]}")
print(f"\nplain 도 분리 {agree} / plain 도 병합 {disagree} / 판정불가 {nodata}  (총 {len(rows)})")
