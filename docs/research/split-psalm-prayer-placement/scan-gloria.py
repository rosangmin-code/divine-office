"""분할 시편 10건 — I부 시작 쪽부터 II부 뒤까지 인쇄 행에서 부 표지·후렴·영광송·기도 제목의 순서를 본다.

python3 docs/research/split-psalm-prayer-placement/scan-gloria.py
"""
import re
import sys
from pathlib import Path

import pdfplumber

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "split-psalm-part2"))
from extract_shared import column_lines  # noqa: E402

# (라벨, I부 시작 쪽, II부 끝 쪽) — week-*.json 의 page 기준
CASES = [
    ("ps27", 116, 119), ("ps45", 203, 205), ("ps49", 219, 221), ("ps72", 255, 257),
    ("ps132", 367, 369), ("ps135", 383, 386), ("ps136", 433, 435), ("ps139", 464, 467),
    ("ps144", 480, 482), ("ps145", 497, 499),
]
MARK = re.compile(r"^(II\b|Эцэг, Хүү, Ариун Сүнсэнд|Шад дуулал|Дууллыг төгсгөх|Дуулал \d|Магтаал)")

with pdfplumber.open("public/psalter.pdf") as pdf:
    for label, first, last in CASES:
        print(f"== {label}")
        for bp in range(first, last + 1):
            for ln in column_lines(pdf, bp):
                if MARK.match(ln["text"]):
                    print(f"  p.{bp}  {ln['text'][:60]}")
