#!/usr/bin/env python3
"""판정 근거 이미지 — 따옴표 케이스가 실린 자리를 인쇄면에서 잘라낸다."""
import json
import sys
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import importlib.util
spec = importlib.util.spec_from_file_location("adj", HERE / "adjudicate.py")
adj = importlib.util.module_from_spec(spec)
sys.modules["adj"] = adj
spec.loader.exec_module(adj)

WANT = sys.argv[1:] or ["Psalm 110:1-5, 7", "Psalm 87:1-7", "Psalm 41:2-14"]
geo = adj.load_geometry()
cases = json.load(open(HERE / "verdicts.json"))
OUT = HERE / "crops"
OUT.mkdir(exist_ok=True)

with pdfplumber.open(ROOT / "public/psalter.pdf") as pdf:
    for c in cases:
        if c["ref"] not in WANT:
            continue
        hits = adj.locate(geo, c["prev"], c["quote"])
        if len(hits) != 1:
            print(f"[{c['ref']} line{c['line']}] 위치 {len(hits)}건 — 건너뜀")
            continue
        bp, i = hits[0]
        phys, col = bp // 2, bp % 2
        page = pdf.pages[phys]
        x0, x1 = ((0, adj.COLUMN_BOUNDARY) if col == 0
                  else (adj.COLUMN_BOUNDARY, page.width))
        top = geo[bp][i]["top"]
        name = f"{c['ref'].replace(':', '_').replace(' ', '').replace(',', '')}-l{c['line']}.png"
        page.crop((x0, max(0, top - 55), x1, min(page.height, top + 55))) \
            .to_image(resolution=320).save(str(OUT / name))
        print(f"[{c['ref']} line{c['line']}] x.{bp} → crops/{name}")
