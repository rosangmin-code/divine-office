#!/usr/bin/env python3
"""판정 규칙 캘리브레이션 — 확실한 접힘 vs 확실한 별개 시행의 '여유' 분포를 잰다.

확실한 접힘   : 기존 phrase 안에서 **소문자로 시작하는** 연속 행 (새 시행일 수 없다)
확실한 별개행 : phrase 의 **첫 행** (앞 행과 다른 시행인 것이 이미 확정)
두 분포가 갈리면 여유(pt) 로 따옴표 케이스를 판정할 수 있다.
"""
import json
import statistics
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import importlib.util
spec = importlib.util.spec_from_file_location("adj", HERE / "adjudicate.py")
adj = importlib.util.module_from_spec(spec)
sys.modules["adj"] = adj
spec.loader.exec_module(adj)

geo = adj.load_geometry()
rich = json.load(open(ROOT / "src/data/loth/prayers/commons/psalter-texts.rich.json"))

wraps, starts = [], []
for ref, entry in rich.items():
    for b in entry.get("stanzasRich", {}).get("blocks", []):
        lines = b.get("lines", [])
        txt = lambda i: "".join(s.get("text", "") for s in lines[i]["spans"]).strip()
        for p in b.get("phrases") or []:
            s, e = p["lineRange"]
            for i in range(s + 1, e + 1):
                t = txt(i)
                if t and t[0].islower():
                    wraps.append((txt(i - 1), t))
            if s > 0:
                starts.append((txt(s - 1), txt(s)))


def gaps(pairs, cap=400):
    out = []
    for prev, cur in pairs[:cap]:
        hits = adj.locate(geo, prev, cur)
        if len(hits) != 1:
            continue
        bp, i = hits[0]
        out.append(round(adj.body_right_margin(geo[bp]) - geo[bp][i - 1]["x1"], 1))
    return out


def show(name, vals):
    if not vals:
        print(f"{name}: 표본 0"); return
    vals = sorted(vals)
    q = lambda f: vals[min(len(vals) - 1, int(len(vals) * f))]
    print(f"{name}: n={len(vals)} 최소{vals[0]:6.1f} 25%{q(.25):6.1f} 중앙{statistics.median(vals):6.1f} "
          f"75%{q(.75):6.1f} 90%{q(.90):6.1f} 최대{vals[-1]:6.1f}")
    over = sum(1 for v in vals if v > 6)
    print(f"    여유>6pt 비율: {over}/{len(vals)} = {over/len(vals):.0%}")


show("확실한 접힘 (소문자 연속행)", gaps(wraps))
show("확실한 별개 시행 (phrase 첫 행)", gaps(starts))
