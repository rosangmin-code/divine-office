#!/usr/bin/env python3
"""
v4 1단계 — anchored/unproven 행을 스트림 위에서 재매칭해 회수율을 측정한다.

v3 한계: 커버리지로 인정한 행이 3,480개뿐(신뢰불가 5,416 / 배정실패 547).
그래서 판정 가능 페이지가 8.8% 에 그쳤다.

v4 접근:
  - 968 북페이지를 **읽기 순서대로 이어붙인 단일 스트림**을 만든다.
    → 페이지 경계를 넘는 유닛(거짓 양성 3)이 구조적으로 사라진다.
  - 각 행의 저장값을 scan-shard-c.py 와 동일한 3티어(literal/typography/
    whitespace)로 스트림에서 직접 재검색한다. 기존 원장의 pdf_visual 을
    믿지 않고 **저장값 자체로** 구간을 확정한다 (거짓 양성 1 제거).
"""
import importlib.util
import pickle
import re
import sys
import unicodedata
from bisect import bisect_right
from collections import Counter
from pathlib import Path

ROOT = Path("/home/min/myproject/divineoffice")
SWEEP = ROOT / "docs/research/51-truncation-sweep"
S = Path(__file__).resolve().parent  # 캐시 위치 (pages.pkl / rematch.pkl)

sys.path.insert(0, str(SWEEP))
spec = importlib.util.spec_from_file_location("scanc", SWEEP / "scan-shard-c.py")
scanc = importlib.util.module_from_spec(spec)
sys.modules["scanc"] = scanc
spec.loader.exec_module(scanc)

import json

pages = pickle.load((S / "pages.pkl").open("rb"))

# ── 연속 스트림 구성 ────────────────────────────────────────────────
order = sorted(pages)
parts, starts, bp_at = [], {}, []
pos = 0
for bp in order:
    starts[bp] = pos
    parts.append(pages[bp])
    bp_at.append((pos, bp))
    pos += len(pages[bp]) + 1  # 페이지 사이 구분 공백 1
    parts.append(" ")
stream = "".join(parts)
bounds = [p for p, _ in bp_at]
print(f"스트림 길이: {len(stream):,}  ({len(order)} 북페이지)")


def page_of(i: int) -> int:
    return bp_at[bisect_right(bounds, i) - 1][1]


# ── 3티어 정규화 뷰 (scan-shard-c.py 와 동일 규칙) ──────────────────
def norm_map(s: str, strip_ws: bool):
    out, off = [], []
    for oi, ch in enumerate(s):
        t = unicodedata.normalize("NFKC", ch).translate(scanc.TYPOGRAPHY_TRANSLATION)
        for c in t:
            if strip_ws and c.isspace():
                continue
            out.append(c)
            off.append(oi)
    return "".join(out), off


typo_text, typo_off = norm_map(stream, False)
ws_text, ws_off = norm_map(stream, True)
print(f"typography view: {len(typo_text):,}   whitespace view: {len(ws_text):,}")

# ── 원장 로드 ──────────────────────────────────────────────────────
rows = []
for shard in "ABCD":
    for line in (SWEEP / f"shard-{shard}-results.jsonl").read_text(encoding="utf-8").splitlines():
        if line.strip():
            rows.append(json.loads(line))
print(f"원장 행: {len(rows)}")


def find_span(value: str, hint: int | None):
    """저장값을 스트림에서 3티어로 찾아 (start, end, tier) 반환. 힌트 페이지 근처 우선."""
    if not value.strip():
        return None
    windows = []
    if hint is not None and hint in starts:
        lo = starts[hint]
        hi = starts[hint] + sum(len(pages[b]) + 1 for b in order[order.index(hint):order.index(hint) + 3] if b in pages)
        windows.append((max(0, lo - 2000), min(len(stream), hi + 2000)))
    windows.append((0, len(stream)))          # 전역 폴백

    for lo, hi in windows:
        # literal
        i = stream.find(value, lo, hi)
        if i >= 0:
            return i, i + len(value), "literal"
        # typography
        n, _ = norm_map(value, False)
        tlo = bisect_right(typo_off, lo - 1) if lo else 0
        j = typo_text.find(n, tlo)
        if j >= 0 and typo_off[j] < hi:
            return typo_off[j], typo_off[j + len(n) - 1] + 1, "typography"
        # whitespace
        n2, _ = norm_map(value, True)
        if n2:
            wlo = bisect_right(ws_off, lo - 1) if lo else 0
            k = ws_text.find(n2, wlo)
            if k >= 0 and ws_off[k] < hi:
                return ws_off[k], ws_off[k + len(n2) - 1] + 1, "whitespace"
    return None


stat = Counter()
recovered = []
for r in rows:
    disp = r.get("disposition", "")
    if disp == "NOT_APPLICABLE_METADATA":
        stat["metadata(제외)"] += 1
        continue
    val = (r.get("evidence") or {}).get("data") or ""
    span = find_span(val, r.get("page"))
    if span is None:
        stat["재매칭 실패"] += 1
        continue
    s, e, tier = span
    stat[f"재매칭 성공/{tier}"] += 1
    recovered.append({"address": r["address"], "start": s, "end": e, "tier": tier,
                      "disposition": disp, "hint": r.get("page"), "page_at": page_of(s)})

print("\n재매칭 결과:", dict(stat))
ok = sum(v for k, v in stat.items() if k.startswith("재매칭 성공"))
tot = len(rows) - stat["metadata(제외)"]
print(f"회수율: {ok}/{tot} = {ok/tot*100:.1f}%   (v3 는 3,480행 = {3480/tot*100:.1f}%)")

# 힌트 페이지와 실제 위치가 다른 경우 = 원장 page 값이 틀렸을 수 있음
drift = [r for r in recovered if r["hint"] is not None and abs(r["page_at"] - r["hint"]) > 1]
print(f"힌트 페이지와 2쪽 이상 어긋난 행: {len(drift)}")

with (S / "rematch.pkl").open("wb") as fh:
    pickle.dump({"recovered": recovered, "starts": starts, "order": order,
                 "stream_len": len(stream)}, fh)
print(f"저장: {S/'rematch.pkl'}")
