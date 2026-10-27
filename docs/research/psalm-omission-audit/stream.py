"""인쇄면 행 스트림 — public/psalter.pdf 의 모든 북페이지를 읽기 순서대로, 행마다 글꼴·색·크기를 붙여 저장한다.

python3 docs/research/psalm-omission-audit/stream.py OUT.json

북페이지 bp 는 물리 페이지 bp//2 의 왼쪽(bp 짝수)/오른쪽(bp 홀수) 단이다
(docs/research/split-psalm-part2/extract_shared.py 와 같은 규약).
"""
import json
import sys
from collections import Counter

import pdfplumber

COLUMN_BOUNDARY = 297.0
RED = {(1.0, 0.0, 0.0)}


def is_red(c):
    col = c.get("non_stroking_color")
    return tuple(col) in RED if isinstance(col, (list, tuple)) else False


def column_rows(page, col):
    lo, hi = (0, COLUMN_BOUNDARY) if col == 0 else (COLUMN_BOUNDARY, page.width)
    rows = {}
    for c in page.chars:
        if lo <= c["x0"] < hi:
            rows.setdefault(round(c["top"], 1), []).append(c)
    out = []
    for top in sorted(rows):
        cs = sorted(rows[top], key=lambda c: c["x0"])
        ink = [c for c in cs if c["text"].strip()]
        if not ink:
            continue
        text = "".join(c["text"] for c in cs).strip()
        fonts = Counter(c["fontname"].split("+")[-1] for c in ink)
        sizes = Counter(round(c["size"], 1) for c in ink)
        out.append({
            "text": text,
            "top": top,
            "x0": round(ink[0]["x0"] - lo, 1),
            "size": sizes.most_common(1)[0][0],
            "font": fonts.most_common(1)[0][0],
            "italic": sum(n for f, n in fonts.items() if "Italic" in f) / len(ink),
            "red": sum(1 for c in ink if is_red(c)) / len(ink),
            "first_red": is_red(ink[0]),
        })
    return out


def main(out_path):
    stream = []
    with pdfplumber.open("public/psalter.pdf") as pdf:
        for phys, page in enumerate(pdf.pages):
            for col in (0, 1):
                bp = phys * 2 + col
                for row in column_rows(page, col):
                    row["bp"] = bp
                    stream.append(row)
    with open(out_path, "w") as f:
        json.dump(stream, f, ensure_ascii=False)
    print(f"{len(stream)} rows → {out_path}")


if __name__ == "__main__":
    main(sys.argv[1])
