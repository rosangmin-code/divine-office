#!/usr/bin/env python3
"""저장된 rich line.indent ↔ 인쇄면 x0 대응을 확인한다."""
import json
import sys
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from extract_shared import CASES, column_lines, is_furniture  # noqa: E402

END_I = "Шад дуулал 2"

pdf = pdfplumber.open(ROOT / "public/psalter.pdf")
rich = json.load(open(ROOT / "src/data/loth/prayers/commons/psalter-texts.rich.json"))
plain = json.load(open(ROOT / "src/data/loth/psalter-texts.json"))
for label in (sys.argv[1:] or list(CASES)):
    c = CASES[label]
    lines = [ln for bp in c["one"] for ln in column_lines(pdf, bp)]
    s = next(i for i, l in enumerate(lines) if l["text"].strip() == "I")
    e = next(i for i, l in enumerate(lines[s:], s) if END_I in l["text"])
    printed = [l for l in lines[s:e] if not is_furniture(l["text"])]   # "I" 포함
    blocks = rich[c["key"]]["stanzasRich"]["blocks"]
    stored = [(bi, li, l) for bi, b in enumerate(blocks) for li, l in enumerate(b["lines"])]
    pl = [x for st in plain[c["key"]]["stanzas"] for x in st]
    print(f"=== {label} {c['key']}  인쇄 {len(printed)} / 저장 {len(stored)} ===")
    for i, (pr, (bi, li, sl)) in enumerate(zip(printed, stored)):
        txt = "".join(sp["text"] for sp in sl["spans"])
        ok = "" if txt == pr["text"] else "  ⚠텍스트차이"
        # plain 은 phrase 결합본이라 인쇄 행보다 짧을 수 있다 (접힘 병합분).
        lead = "␣␣" if i < len(pl) and pl[i].startswith("  ") else "  "
        print(f" {i:3} 인쇄x+{pr['indent']:5.1f} [{pr['bp']}] → b{bi}/l{li} indent={sl['indent']} plain{lead} {txt[:56]}{ok}")
    print()
pdf.close()
