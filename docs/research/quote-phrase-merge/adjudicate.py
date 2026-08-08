#!/usr/bin/env python3
"""
여는 따옴표로 시작하는 행이 앞 phrase 에 병합된 37건을 인쇄면 기하로 판정한다.

문제: `regroupPhrasesByCapitalStart` 의 `^[А-ЯЁӨҮ]` 가 여는 따옴표를 못 넘겨
`“Биеийн…` 같은 행을 앞 phrase 에 붙인다. 그런데 **전부 결함은 아니다** —
인용이 같은 절의 연속이라 원래 한 시행인 경우가 섞여 있다.

이 스크립트는 **케이스 수집과 위치 특정**만 한다. 판정 근거는 README 참조.

처음에 "앞 행이 단 오른쪽 끝까지 찼으면 접힘" 이라는 기하 규칙을 세웠으나
`calibrate.py` 가 반증했다 — 확실한 접힘 277건의 앞 행 여유가 중앙값 55pt 로,
이 책은 단 끝에서 접는 조판이 아니다. 아래 `gap` 은 그 반증의 기록이자 참고
수치일 뿐 판정에 쓰지 않는다.

실제 판별 신호는 **들여쓰기 + 소문자 시작**이다 (인쇄면 실측: `crops/*.png`).
따옴표 뒤 대문자는 기준 들여쓰기에 놓인 별개 시행이다.
"""
import json
import pickle
import re
import sys
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
CACHE = HERE / "line-geometry.pkl"
COLUMN_BOUNDARY = 297.0
QUOTE_CAPITAL_RE = re.compile(r"^[“\"„«]\s*[А-ЯЁӨҮ]")
PAGE_NUM = re.compile(r"^\d{1,3}$")
HEADER_HINT = re.compile(r"(гарагийн|ДААТГАЛ ЗАЛБИРАЛ|долоо хоног|сарын)")


def build_geometry(pdf):
    """{bp: [{text,x0,x1,top}]} — 단별 행 기하."""
    out = {}
    for phys, page in enumerate(pdf.pages):
        for col in (0, 1):
            if page.width < COLUMN_BOUNDARY + 50:
                if col:
                    continue
                lo, hi = 0, page.width
            else:
                lo, hi = (0, COLUMN_BOUNDARY) if col == 0 else (COLUMN_BOUNDARY, page.width)
            rows = {}
            for c in page.chars:
                if lo <= c["x0"] < hi:
                    rows.setdefault(round(c["top"], 1), []).append(c)
            lines = []
            for top in sorted(rows):
                cs = sorted(rows[top], key=lambda c: c["x0"])
                text = "".join(c["text"] for c in cs).strip()
                if text:
                    lines.append({"text": text, "x0": round(cs[0]["x0"], 1),
                                  "x1": round(max(c["x1"] for c in cs), 1), "top": top})
            out[phys * 2 + col] = lines
    return out


def load_geometry():
    if CACHE.exists():
        with CACHE.open("rb") as fh:
            return pickle.load(fh)
    with pdfplumber.open(ROOT / "public/psalter.pdf") as pdf:
        geo = build_geometry(pdf)
    with CACHE.open("wb") as fh:
        pickle.dump(geo, fh)
    return geo


def body_right_margin(lines):
    """단의 본문 우측 경계 = 본문 행 x1 의 최댓값 (러닝 헤더/쪽번호 제외)."""
    xs = [l["x1"] for l in lines
          if not PAGE_NUM.match(l["text"]) and not HEADER_HINT.search(l["text"])]
    return max(xs) if xs else 0.0


def collect_cases():
    rich = json.load(open(ROOT / "src/data/loth/prayers/commons/psalter-texts.rich.json"))
    cases = []
    for ref, entry in rich.items():
        for bi, b in enumerate(entry.get("stanzasRich", {}).get("blocks", [])):
            lines = b.get("lines", [])
            txt = lambda i: "".join(s.get("text", "") for s in lines[i]["spans"]).strip()
            for p in b.get("phrases") or []:
                s, e = p["lineRange"]
                for i in range(s + 1, e + 1):
                    if QUOTE_CAPITAL_RE.match(txt(i)):
                        cases.append({"ref": ref, "block": bi, "phrase": [s, e],
                                      "line": i, "prev": txt(i - 1), "quote": txt(i)})
    return cases


def locate(geo, prev, quote):
    """prev 와 quote 가 연속 행으로 나타나는 (bp, idx) 를 찾는다."""
    hits = []
    for bp, lines in geo.items():
        for i in range(1, len(lines)):
            if lines[i - 1]["text"] == prev and lines[i]["text"] == quote:
                hits.append((bp, i))
    return hits


def main() -> None:
    geo = load_geometry()
    cases = collect_cases()
    want_crops = "--crops" in sys.argv
    rows = []
    for c in cases:
        hits = locate(geo, c["prev"], c["quote"])
        if len(hits) != 1:
            rows.append({**c, "verdict": "미특정", "hits": len(hits), "gap": None})
            continue
        bp, i = hits[0]
        lines = geo[bp]
        margin = body_right_margin(lines)
        gap = round(margin - lines[i - 1]["x1"], 1)
        rows.append({**c, "verdict": "위치 특정", "bp": bp, "gap": gap, "margin": margin})
    (HERE / "verdicts.json").write_text(
        json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    order = {"위치 특정": 0, "미특정": 1}
    for r in sorted(rows, key=lambda r: (order[r["verdict"]], r["ref"])):
        gap = "  —  " if r["gap"] is None else f"{r['gap']:5.1f}"
        bp = r.get("bp", "?")
        print(f"{r['verdict']:10} 앞행여유{gap}pt(참고)  x.{bp}  {r['ref']} b{r['block']} "
              f"phrase{r['phrase']}→line{r['line']}")
        print(f"{'':10}   앞: {r['prev'][:62]}")
        print(f"{'':10}   인용: {r['quote'][:62]}")
    from collections import Counter
    print("\n집계:", dict(Counter(r["verdict"] for r in rows)), f"/ 총 {len(rows)}")

    if want_crops:
        out = HERE / "crops"
        out.mkdir(exist_ok=True)
        with pdfplumber.open(ROOT / "public/psalter.pdf") as pdf:
            for n, r in enumerate(rows):
                if r["gap"] is None:
                    continue
                bp = r["bp"]
                phys, col = bp // 2, bp % 2
                page = pdf.pages[phys]
                x0, x1 = ((0, COLUMN_BOUNDARY) if col == 0 else (COLUMN_BOUNDARY, page.width))
                top = geo[bp][max(0, 0)]["top"]
                tgt = next(l["top"] for l in geo[bp] if l["text"] == r["quote"])
                page.crop((x0, max(0, tgt - 40), x1, min(page.height, tgt + 40))) \
                    .to_image(resolution=300).save(str(out / f"{n:02d}-{r['ref'].replace(':','_').replace(' ','')}.png"))
        print(f"\ncrops → {out}")


if __name__ == "__main__":
    main()
