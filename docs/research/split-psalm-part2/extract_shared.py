"""분할 시편 II부 작업 공용 — 인쇄면 단(column) 행 추출."""
import re
from pathlib import Path

COLUMN_BOUNDARY = 297.0
PAGE_NUM = re.compile(r"^\d{1,3}$")
HEADER_HINT = re.compile(r"(гарагийн|ДААТГАЛ ЗАЛБИРАЛ|долоо хоног)")

# (라벨, I부 북페이지, II부 북페이지, 데이터의 I부 키)
CASES = {
    "ps45":  {"one": [203, 204], "two": [204, 205], "key": "Psalm 45:2-10"},
    "ps49":  {"one": [219, 220], "two": [220, 221], "key": "Psalm 49:1-13"},
    "ps72":  {"one": [255, 256], "two": [256, 257], "key": "Psalm 72:1-11"},
    "ps132": {"one": [367, 368, 369], "two": [369, 370], "key": "Psalm 132:1-10"},
    "ps145": {"one": [497, 498], "two": [498, 499], "key": "Psalm 145:1-13"},
}


def is_furniture(text: str) -> bool:
    """쪽번호·러닝 헤더 등 본문이 아닌 행."""
    return bool(PAGE_NUM.match(text) or HEADER_HINT.search(text))


def column_lines(pdf, bp: int) -> list[dict]:
    """북페이지 하나의 행 목록 → [{text, x0, indent, top, bp}]."""
    phys, col = bp // 2, bp % 2
    page = pdf.pages[phys]
    if page.width < COLUMN_BOUNDARY + 50:
        lo, hi = 0, page.width
    else:
        lo, hi = (0, COLUMN_BOUNDARY) if col == 0 else (COLUMN_BOUNDARY, page.width)
    rows: dict[float, list[dict]] = {}
    for c in page.chars:
        if lo <= c["x0"] < hi:
            rows.setdefault(round(c["top"], 1), []).append(c)
    out = []
    for top in sorted(rows):
        cs = sorted(rows[top], key=lambda c: c["x0"])
        text = "".join(c["text"] for c in cs).strip()
        if text:
            out.append({"text": text, "x0": round(cs[0]["x0"], 1), "top": top, "bp": bp})
    body = [ln for ln in out if not is_furniture(ln["text"])]
    base = min((ln["x0"] for ln in body), default=0)
    for ln in out:
        ln["indent"] = round(ln["x0"] - base, 1)
    return out
