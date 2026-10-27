"""자리마다 책 머리말 → header-book.json (build-headers.mjs 입력) + 회귀 테스트 fixture.

python3 docs/research/psalm-header-audit/emit-headers.py STREAM.json

행 나눔과 위치는 인쇄면 행 스트림(pdfplumber)에서, 띄어쓰기는 parsed_data/full_pdf.txt 에서 가져온다
— pdfplumber 는 두 낱말을 붙여 내는 일이 있다 («Та нароюун» = «Та нар оюун», 시편 51 p.142).
두 쪽의 글자(공백 제외)가 같은 구간을 full_pdf.txt 에서 찾아 그 행들을 쓰고, 그 행 번호를
evidence_line_range 로 남긴다 (기존 항목과 같은 규약).
"""
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / "psalm-omission-audit"))
from audit import find_anchor, kind, line_offsets, occurrences, region, words  # noqa: E402
from audit_headers import book_header, split_header  # noqa: E402

FULL = Path("parsed_data/full_pdf.txt")
FIXTURE = Path("src/lib/__tests__/data/psalm-book-headers.fixture.json")


def squash(s):
    return "".join(words(s))


# full_pdf.txt 의 쪽 넘김 잡음 — 빈 행, 쪽 번호, 러닝 헤더 («3 дугаар долоо хоног», «… гарагийн орой»)
FURNITURE = re.compile(r"^\s*(\d{1,3}\s*)*$|долоо хоног\s*$|гарагийн (өглөө|орой)\s*$")


def full_pdf_runs(full_lines, target):
    """target(공백 없는 정규화 글자)과 같은 연속 행 구간들 [(start, end)] (0-base, end 포함)."""
    norm = ["" if FURNITURE.search(ln) else squash(ln) for ln in full_lines]
    out = []
    for s in range(len(norm)):
        if not norm[s] or not target.startswith(norm[s]):
            continue
        acc, e = "", s
        while e < len(norm) and len(acc) < len(target):
            acc += norm[e]
            e += 1
        if acc == target:
            out.append((s, e - 1))
    return out


def classify(attribution):
    if attribution is None:
        return "uncited_caption"
    return "nt_typological" if re.search(r"\d", attribution) else "patristic_preface"


def main(stream_path):
    stream = json.load(open(stream_path))
    kinds = [kind(r) for r in stream]
    full_lines = FULL.read_text(encoding="utf-8").splitlines()
    rows = []
    for (label, page), o in sorted(occurrences().items(), key=lambda x: (x[0][1], x[0][0])):
        key = o["key"]
        if key.startswith("canticles:"):
            continue
        aw = [w for ln in o["lines"] for w in words(ln)]
        anchor, _ = find_anchor(stream, kinds, page, aw, line_offsets(o["lines"]))
        start, _, _, _ = region(stream, kinds, anchor)
        hrows = book_header(stream, kinds, start)
        row = {"key": key, "ref": label if key.startswith("psalter-texts:") else key.split(":", 1)[1].rsplit("@", 1)[0],
               "page": page, "header": None}
        if hrows:
            lines = [stream[i]["text"].strip() for i in hrows]
            row["header"] = {"page": stream[hrows[0]]["bp"], "pdf_lines": lines}
        rows.append(row)

    # 같은 머리말이 여러 번 인쇄되면 full_pdf.txt 의 출현을 쪽 순서대로 짝짓는다
    by_text = {}
    for r in rows:
        if r["header"]:
            by_text.setdefault(squash(" ".join(r["header"]["pdf_lines"])), []).append(r)
    for target, group in by_text.items():
        runs = full_pdf_runs(full_lines, target)
        pages = sorted({r["header"]["page"] for r in group})
        for r in group:
            h = r["header"]
            if not runs:
                raise SystemExit(f"{r['key']}: full_pdf.txt 에서 머리말을 못 찾음 — {h['pdf_lines']}")
            idx = min(pages.index(h["page"]), len(runs) - 1)
            s, e = runs[idx]
            text = " ".join(full_lines[i].strip() for i in range(s, e + 1) if not FURNITURE.search(full_lines[i]))
            preface, attribution = split_header(text)
            h.update({
                "text": text, "preface": preface, "attribution": attribution, "kind": classify(attribution),
                "evidence_line_range": [s + 1, e + 1], "full_pdf_matches": len(runs),
            })

    (HERE / "header-book.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    fixture = {
        "_about": (
            "시편 자리마다 책(public/psalter.pdf)이 제목 아래 인쇄한 머리말(이탤릭 인용 + 출처). 없으면 null. "
            "docs/research/psalm-header-audit/emit-headers.py 가 만든다 — 책이 바뀌면 다시 만든다. "
            "검사: psalm-book-headers.test.ts"
        ),
        "entries": {r["key"]: ({"preface": r["header"]["preface"], "attribution": r["header"]["attribution"]}
                               if r["header"] else None) for r in sorted(rows, key=lambda r: r["key"])},
    }
    FIXTURE.write_text(json.dumps(fixture, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    n = sum(1 for r in rows if r["header"])
    multi = sorted({r["key"] for r in rows if r["header"] and r["header"]["full_pdf_matches"] != len(
        {x["header"]["page"] for x in by_text[squash(" ".join(r["header"]["pdf_lines"]))]})})
    print(f"자리 {len(rows)}, 책 머리말 있음 {n} → header-book.json, {FIXTURE}")
    if multi:
        print("full_pdf.txt 출현 수와 인쇄 쪽 수가 다른 머리말 (행 번호만 참고):", *multi, sep="\n  ")


if __name__ == "__main__":
    main(sys.argv[1])
