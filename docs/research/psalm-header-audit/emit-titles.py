"""시편 제목(빨간 부제) — 데이터 항목마다 책과 비교 → title-book.json (build-titles.mjs 입력).

python3 docs/research/psalm-header-audit/emit-titles.py STREAM.json

audit_headers.py 는 (ref, 쪽) 자리 단위로 제목을 모아 비교해서, 같은 자리를 가리키는 항목 중 하나만
제목이 있어도 '있음'으로 셌다. 화면에 나오는 것은 그 시간경이 실제로 쓰는 항목의 `title` 이므로
(예: 주일 제1저녁은 시기 고유부 `weeks[N].SUN.firstVespers` 항목), 여기서는 항목마다 본다.
제목 글자는 인쇄 행(pdfplumber)을 잇는다. full_pdf.txt 는 행 번호(evidence)만 참고한다 — 짧은 제목은
같은 글자의 다른 행에 잘못 짝지어질 수 있다(시편 150 «Эзэнийг магтагтун!» 이 다니엘 3장 후렴
«…магтагтун.» 에 짝지어짐).
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / "psalm-omission-audit"))
from audit import find_anchor, kind, line_offsets, occurrences, region, words  # noqa: E402
from audit_headers import book_header, book_title, entry_at  # noqa: E402

import importlib.util  # noqa: E402

_spec = importlib.util.spec_from_file_location("emit_headers", HERE / "emit-headers.py")
_eh = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_eh)
FULL, FURNITURE, full_pdf_runs, squash = _eh.FULL, _eh.FURNITURE, _eh.full_pdf_runs, _eh.squash
TITLE_FIXTURE = Path("src/lib/__tests__/data/psalm-book-titles.fixture.json")


def main(stream_path):
    stream = json.load(open(stream_path))
    kinds = [kind(r) for r in stream]
    full_lines = FULL.read_text(encoding="utf-8").splitlines()
    places = []
    for (label, page), o in sorted(occurrences().items(), key=lambda x: (x[0][1], x[0][0])):
        if not o["key"].startswith("psalter-texts:"):
            continue
        aw = [w for ln in o["lines"] for w in words(ln)]
        anchor, _ = find_anchor(stream, kinds, page, aw, line_offsets(o["lines"]))
        start, _, _, _ = region(stream, kinds, anchor)
        hrows = book_header(stream, kinds, start)
        trows = book_title(stream, kinds, hrows[0] if hrows else start)
        title = None
        if trows:
            title = {"page": stream[trows[0]]["bp"], "pdf_lines": [stream[i]["text"].strip() for i in trows]}
        places.append({"ref": label, "page": page, "where": o["where"], "title": title})

    # 띄어쓰기: full_pdf.txt 에서 같은 글자열(공백 제외)을 찾아 그 행들을 쓴다. 여러 번 인쇄되면 쪽 순서로 짝짓기
    by_text = {}
    for p in places:
        if p["title"]:
            by_text.setdefault(squash(" ".join(p["title"]["pdf_lines"])), []).append(p)
    for target, group in by_text.items():
        runs = full_pdf_runs(full_lines, target)
        pages = sorted({p["title"]["page"] for p in group})
        for p in group:
            t = p["title"]
            t["text"] = " ".join(t["pdf_lines"])
            if runs:
                s, e = runs[min(pages.index(t["page"]), len(runs) - 1)]
                t["full_pdf_lines"] = [s + 1, e + 1]
            else:
                t["full_pdf_lines"] = None

    rows = []
    for p in places:
        b = p["title"]["text"] if p["title"] else None
        for w in p["where"]:
            a = entry_at(w).get("title")
            if not a and not b:
                status = "none"
            elif not b:
                status = "EXTRA"
            elif not a:
                status = "MISSING"
            elif a == b:
                status = "ok"
            elif squash(a) == squash(b):
                status = "ok~"  # 글자는 같고 띄어쓰기·문장부호만 다름
            else:
                status = "DIFF"
            rows.append({"where": w, "ref": p["ref"], "page": p["page"], "status": status, "app": a, "book": b,
                         "book_page": p["title"]["page"] if p["title"] else None,
                         "book_lines": p["title"]["pdf_lines"] if p["title"] else None,
                         "full_pdf_lines": p["title"]["full_pdf_lines"] if p["title"] else None})

    (HERE / "title-book.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    fixture = {
        "_about": (
            "시편 자리마다 책(public/psalter.pdf)이 «Дуулал N» 아래 인쇄한 빨간 부제. 없으면 null. "
            "docs/research/psalm-header-audit/emit-titles.py 가 만든다 — 책이 바뀌면 다시 만든다. "
            "검사: psalm-book-titles.test.ts (글자만 비교 — 띄어쓰기·문장부호·대소문자는 보지 않는다)"
        ),
        "entries": {f"psalter-texts:{p['ref']}@{p['page']}": (p["title"]["text"] if p["title"] else None)
                    for p in sorted(places, key=lambda p: f"{p['ref']}@{p['page']}")},
    }
    TITLE_FIXTURE.write_text(json.dumps(fixture, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    from collections import Counter
    print("제목 (항목 단위):", len(rows), "—", ", ".join(f"{k} {v}" for k, v in sorted(Counter(r["status"] for r in rows).items())))
    for r in rows:
        if r["status"] in ("ok", "none"):
            continue
        print(f"[{r['status']}] {r['where']}  {r['ref']}@{r['page']}\n   책: {r['book']!r}\n   앱: {r['app']!r}")


if __name__ == "__main__":
    main(sys.argv[1])
