#!/usr/bin/env python3
"""II부가 실린 단(column)을 통째로 PNG 로 렌더한다 (read-only).

추출 텍스트는 폰트 매핑을 거치므로 그것만으로는 글자를 확정할 수 없다
([[pdf-verdict-render-printed-page]]). 인쇄면을 직접 보고 대조한다.
"""
import sys
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent / "crops"
COLUMN_BOUNDARY = 297.0
PAGES = [204, 205, 220, 221, 256, 257, 369, 498, 499]

OUT.mkdir(exist_ok=True)
pdf = pdfplumber.open(ROOT / "public/psalter.pdf")
for bp in (int(a) for a in sys.argv[1:]) if len(sys.argv) > 1 else PAGES:
    phys, col = bp // 2, bp % 2
    page = pdf.pages[phys]
    if page.width < COLUMN_BOUNDARY + 50:
        x0, x1 = 0, page.width
    else:
        x0, x1 = (0, COLUMN_BOUNDARY) if col == 0 else (COLUMN_BOUNDARY, page.width)
    page.crop((x0, 0, x1, page.height)).to_image(resolution=260).save(str(OUT / f"bp{bp}.png"))
    print(f"x.{bp} (물리 {phys}, {'좌' if col == 0 else '우'}단) → crops/bp{bp}.png")
pdf.close()
