#!/usr/bin/env python3
"""
시편 139 II부 · 시편 144 I부(목요일) · 시편 144 II부의 인쇄 행 + 연 경계를 낸다.

`docs/research/split-psalm-part2/` 의 단(column) 추출기를 그대로 쓴다.
`--validate` 는 같은 검출기로 이미 저장된 엔트리(시편 139 I부, 시편 144 II부)를
재현해 보고, 일치할 때만 새 구간을 믿는다.
"""
import json
import re
import sys
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "docs/research/split-psalm-part2"))
from extract_shared import column_lines, is_furniture  # noqa: E402
from importlib.util import module_from_spec, spec_from_file_location  # noqa: E402

_spec = spec_from_file_location("emit", ROOT / "docs/research/split-psalm-part2/emit-lines.py")
_emit = module_from_spec(_spec)
_spec.loader.exec_module(_emit)
to_blocks = _emit.to_blocks

DOXOLOGY = "Эцэг, Хүү, Ариун Сүнс"


def app_form(s: str) -> str:
    """앱은 호격 «Аяа» 뒤에 늘 쉼표를 둔다 (source-typo-ledger STC-019)."""
    return re.sub(r"Аяа(?=\s)", "Аяа,", s)
ANTIPHON = "Шад дуулал"


def region(pdf, bps, start, end_texts):
    """start 로 시작하는 행부터 end_texts 중 하나가 든 행 직전까지."""
    lines = [ln for bp in bps for ln in column_lines(pdf, bp)]
    s = next(i for i, l in enumerate(lines) if l["text"].strip() == start)
    e = next((i for i, l in enumerate(lines[s + 1:], s + 1)
              if any(t in l["text"] for t in end_texts)), len(lines))
    return [l for l in lines[s:e] if not is_furniture(l["text"])]


# label → (북페이지, 시작 행, 끝 표지, 비교할 저장 키)
CASES = {
    # 검증용 — 저장된 엔트리 (2026-10-24 키 이름 정정 후: 139:1-18 → 1-12,
    # 144:11-15 → 9-15. 정정 전에는 139 I부 연 경계 하나(9)와 144 II부 "II"
    # 표지만 달랐다)
    "ps139-I":  ([464, 465], "I", [ANTIPHON], "Psalm 139:1-12"),
    "ps144-II": ([481, 482], "II", [DOXOLOGY], "Psalm 144:9-15"),
    # 새로 만들 구간
    "ps139-II": ([466, 467], "II", [DOXOLOGY], None),
    "ps144-I":  ([480, 481], "I", [ANTIPHON], None),
}


def main() -> None:
    pdf = pdfplumber.open(ROOT / "public/psalter.pdf")
    rich = json.load(open(ROOT / "src/data/loth/prayers/commons/psalter-texts.rich.json"))
    validate = "--validate" in sys.argv
    ok = True
    for label, (bps, start, ends, key) in CASES.items():
        if validate != (key is not None):
            continue
        blocks = to_blocks(region(pdf, bps, start, ends), merge=True)
        b = blocks[0]
        if validate:
            sb = rich[key]["stanzasRich"]["blocks"]
            stored = [ln for blk in sb for ln in blk["lines"]]
            stored_txt = ["".join(s.get("text", "") for s in ln["spans"]).strip() for ln in stored]
            same_txt = [app_form(x) for x in b["lines"]] == stored_txt
            # 저장본이 여러 블록이면 블록 경계도 연 경계로 본다
            spb, off = [], 0
            for i, blk in enumerate(sb):
                if i:
                    spb.append(off)
                spb += [off + x for x in (blk.get("paragraphBoundaries") or [])]
                off += len(blk["lines"])
            same_pb = b["paragraphBoundaries"] == spb
            ok &= same_txt and same_pb
            print(f"{label} vs {key}: 행 {len(b['lines'])}/{len(stored_txt)} "
                  f"{'OK' if same_txt else 'X'} | 연경계 {b['paragraphBoundaries']} vs {spb} "
                  f"{'OK' if same_pb else 'X'}")
            if not same_txt:
                for i, (x, y) in enumerate(zip(map(app_form, b["lines"]), stored_txt)):
                    if x != y:
                        print(f"   첫 차이 행 {i}: 인쇄 {x!r} / 저장 {y!r}")
                        break
        else:
            (HERE / f"{label}.json").write_text(
                json.dumps(b, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"[{label}] {len(b['lines'])}행, 연경계 {b['paragraphBoundaries']} → {label}.json")
    pdf.close()
    if validate:
        print("\n검출기 재현:", "전부 일치" if ok else "차이 있음")
        sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
