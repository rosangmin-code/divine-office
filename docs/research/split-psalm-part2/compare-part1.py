#!/usr/bin/env python3
"""I부의 인쇄면 행 ↔ 저장 데이터 행을 나란히 놓아 각 시편의 큐레이션 규약을 읽는다.

데이터는 인쇄면 행을 그대로 쓰지 않는다 — 단 폭에서 접힌 행을 논리 시행으로 다시
잇고, 일부 행에는 선행 공백 2칸(들여쓰기 마커)을 붙인다. II부를 만들려면 그
규약을 먼저 확정해야 한다.
"""
import json
import sys
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from extract_shared import CASES, column_lines, is_furniture  # noqa: E402

END_I = "Шад дуулал 2"


def main() -> None:
    pdf = pdfplumber.open(ROOT / "public/psalter.pdf")
    plain = json.load(open(ROOT / "src/data/loth/psalter-texts.json"))
    rich = json.load(open(ROOT / "src/data/loth/prayers/commons/psalter-texts.rich.json"))
    for label in (sys.argv[1:] or list(CASES)):
        c = CASES[label]
        lines = [ln for bp in c["one"] for ln in column_lines(pdf, bp)]
        s = next(i for i, l in enumerate(lines) if l["text"].strip() == "I")
        e = next(i for i, l in enumerate(lines[s:], s) if END_I in l["text"])
        body = [l for l in lines[s + 1:e] if not is_furniture(l["text"])]
        stored = plain[c["key"]]["stanzas"][0][1:]
        pb = rich[c["key"]]["stanzasRich"]["blocks"][0].get("paragraphBoundaries") or []
        print(f"=== {label} {c['key']}  인쇄 {len(body)}행 / 저장 {len(stored)}행  "
              f"연경계(저장,'I'포함) {pb} ===")
        j = 0
        for i, l in enumerate(body):
            joined = ""
            if j < len(stored):
                st = stored[j]
                if st.strip() == l["text"]:
                    tag = "="
                    j += 1
                elif st.strip().startswith(l["text"]):
                    tag = "접힘머리"
                    joined = st
                else:
                    tag = "?"
            else:
                tag = "잉여"
                st = "—"
            print(f" {i:3} ind{l['indent']:5.1f} [{l['bp']}] {tag:6} {l['text']}")
            if tag == "접힘머리":
                print(f"     {'':16} 저장→ {joined!r}")
                j += 1
            elif tag == "?":
                print(f"     {'':16} 저장→ {st!r}")
                j += 1
        print()
    pdf.close()


if __name__ == "__main__":
    main()
