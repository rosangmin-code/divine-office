#!/usr/bin/env python3
"""
인쇄면에서 시편 부(部)의 `lines[]` + `paragraphBoundaries` 를 낸다 (read-only).

블록 = 북페이지(단) 하나. 저장 데이터와 같은 규약:
  - 부 마커("I"/"II") 는 블록 0 의 첫 행으로 포함
  - lines[] 는 인쇄 행 1:1 (접힘 병합은 phrases 단계에서)
  - paragraphBoundaries 는 lines[] 인덱스, 세로 간격이 벌어진 지점

`--validate` 는 I부로 돌려 저장된 paragraphBoundaries 와 대조한다.
"""
import json
import sys
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from extract_shared import CASES, column_lines, is_furniture  # noqa: E402

DOXOLOGY = "Эцэг, Хүү, Ариун Сүнс"
ANTIPHON2 = "Шад дуулал 2"


def region(pdf, bps, marker, end_texts):
    lines = [ln for bp in bps for ln in column_lines(pdf, bp)]
    s = next((i for i, l in enumerate(lines) if l["text"].strip() == marker), None)
    if s is None:
        return None
    e = next((i for i, l in enumerate(lines[s + 1:], s + 1)
              if any(t in l["text"] for t in end_texts)), len(lines))
    return [l for l in lines[s:e] if not is_furniture(l["text"])]


def to_blocks(sel, merge=False):
    """북페이지별로 나누고 각 블록의 연 경계를 낸다.

    merge=True 면 쪽이 바뀌어도 한 블록으로 잇는다 — 블록은 렌더에서
    `space-y-5` 간격을 만들므로, 쪽 넘김 자리에 없던 큰 여백이 생기는 것을
    막는다 (저장 데이터의 ps49·ps132 가 같은 방식). 쪽 경계의 연 구분은
    세로 간격을 잴 수 없으므로 넣지 않는다 — 인쇄면 육안 확인 몫.
    """
    blocks = []
    for ln in sel:
        if not blocks or blocks[-1]["bp"] != ln["bp"]:
            blocks.append({"bp": ln["bp"], "rows": []})
        blocks[-1]["rows"].append(ln)
    if merge and len(blocks) > 1:
        rows, pb, off = [], [], 0
        for b in blocks:
            r = b["rows"]
            gaps = [round(r[i]["top"] - r[i - 1]["top"], 1) for i in range(1, len(r))]
            base = sorted(gaps)
            med = base[len(base) // 2] if base else 0
            pb += [off + i + 1 for i, g in enumerate(gaps) if g > med * 1.4]
            rows += r
            off += len(r)
        return [{"bookPage": blocks[0]["bp"],
                 "spansPages": [b["bp"] for b in blocks],
                 "lines": [r["text"] for r in rows],
                 "paragraphBoundaries": pb}]
    out = []
    for b in blocks:
        rows = b["rows"]
        gaps = [round(rows[i]["top"] - rows[i - 1]["top"], 1) for i in range(1, len(rows))]
        base = sorted(gaps)
        med = base[len(base) // 2] if base else 0
        pb = [i + 1 for i, g in enumerate(gaps) if g > med * 1.4]
        out.append({"bookPage": b["bp"],
                    "lines": [r["text"] for r in rows],
                    "paragraphBoundaries": pb})
    return out


def main() -> None:
    pdf = pdfplumber.open(ROOT / "public/psalter.pdf")
    validate = "--validate" in sys.argv
    labels = [a for a in sys.argv[1:] if not a.startswith("--")] or list(CASES)
    rich = json.load(open(ROOT / "src/data/loth/prayers/commons/psalter-texts.rich.json"))
    ok = True
    for label in labels:
        c = CASES[label]
        if validate:
            sel = region(pdf, c["one"], "I", [ANTIPHON2])
            blocks = to_blocks(sel)
            stored = rich[c["key"]]["stanzasRich"]["blocks"]
            for i, (b, sb) in enumerate(zip(blocks, stored)):
                same_n = len(b["lines"]) == len(sb["lines"])
                same_pb = b["paragraphBoundaries"] == (sb.get("paragraphBoundaries") or [])
                if not (same_n and same_pb):
                    ok = False
                print(f"{label} b{i} (x.{b['bookPage']}): 행 {len(b['lines'])}/{len(sb['lines'])} "
                      f"{'OK' if same_n else 'X'} | 연경계 {b['paragraphBoundaries']} vs "
                      f"{sb.get('paragraphBoundaries')} {'OK' if same_pb else 'X'}")
            if len(blocks) != len(stored):
                ok = False
                print(f"{label}: 블록 수 {len(blocks)} vs 저장 {len(stored)}  X")
        else:
            sel = region(pdf, c["two"], "II", [DOXOLOGY])
            payload = {"ref": c["key"], "blocks": to_blocks(sel, merge=True)}
            (HERE / f"part2-{label}.json").write_text(
                json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"[{label}] 블록 {len(payload['blocks'])} → part2-{label}.json")
            for b in payload["blocks"]:
                print(f"   x.{b['bookPage']}: {len(b['lines'])}행, 연경계 {b['paragraphBoundaries']}")
    pdf.close()
    if validate:
        print("\n검출기 재현:", "전부 일치" if ok else "차이 있음 — 아래 X 확인")
        sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
