"""시편 머리말(제목 아래 이탤릭 인용 + 출처)과 제목(빨간 부제) 전수 대조 — 책 vs 앱.

python3 docs/research/psalm-header-audit/audit_headers.py STREAM.json [--json OUT]

STREAM 은 docs/research/psalm-omission-audit/stream.py 의 인쇄면 행 스트림이다. 본문 블록을 찾는
방법(앵커·블록 경계)도 그 폴더의 audit.py 를 그대로 쓴다. 본문 첫 행에서 위로 거슬러 올라가며
부 표지(«I»)·장식 조각을 건너뛰고 이탤릭 행과 출처 행(«(…»·«…)»)을 모으면 책 머리말이 된다.
빨간 제목·후렴을 만나면 멈춘다.

앱 머리말은 `psalter-headers.rich.json` 에서 로더와 같은 규칙으로 고른 항목이다 — 자리의 쪽 ±1 에
인쇄된 항목 (2026-10-27 전에는 쪽과 무관하게 `entries[0]`). 초대송은 `invitatory.json` 의 `epigraph`.

제목: 머리말(없으면 본문) 위의 빨간 행들 — «Дуулал N» / «Магтаал …» 제목 줄 바로 아래부터.
앱 제목은 그 자리 항목의 `title`.
"""
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "psalm-omission-audit"))
from audit import find_anchor, kind, line_offsets, occurrences, region, words  # noqa: E402

DATA = Path("src/data/loth")
PART_MARK = re.compile(r"^(I|II|III|IV)$")
HEADING = re.compile(r"^(Дуулал\s*\d|Магтаал\b)")
ATTRIB_TAIL = re.compile(r"\(([^()]*)\)\.?\s*$")


def squash(s):
    """낱말을 띄어쓰기 없이 이은 것 — PDF 가 두 낱말을 붙여 내는 것(«Та нароюун»)은 차이로 보지 않는다."""
    return "".join(words(s or ""))


def book_header(stream, kinds, start):
    """본문 첫 행 start 위의 머리말 행 번호들 (위→아래)."""
    i, rows = start - 1, []
    while i >= 0:
        k, t = kinds[i], stream[i]["text"].strip()
        if k in ("furniture", "small", "inline") or (k == "red" and PART_MARK.match(t)):
            i -= 1
            continue
        if k in ("italic", "attrib") or (k == "roman" and t.startswith("(")):
            rows.append(i)
            i -= 1
            continue
        break
    return list(reversed(rows))


def book_title(stream, kinds, first):
    """머리말(또는 본문) 첫 행 first 위의 빨간 부제 행들. 제목 줄(«Дуулал N»)에서 멈춘다."""
    i, rows = first - 1, []
    while i >= 0:
        k, t = kinds[i], stream[i]["text"].strip()
        if k in ("furniture", "small", "inline") or (k == "red" and PART_MARK.match(t)):
            i -= 1
            continue
        if k == "red" and not HEADING.match(t):
            rows.append(i)
            i -= 1
            continue
        break
    # 제목 줄을 못 만나면(Part II 등) 부제가 아니다
    if i < 0 or not (kinds[i] == "red" and HEADING.match(stream[i]["text"].strip())):
        return []
    return list(reversed(rows))


def entry_at(where):
    """'psalter/week-1.json.days.SUN.lauds.psalms[0]' → 그 JSON 항목."""
    f, _, path = where.partition(".json")
    node = json.load(open(DATA / (f + ".json")))
    for part in re.findall(r"\.([^.\[]+)|\[(\d+)\]", path):
        node = node[part[0]] if part[0] else node[int(part[1])]
    return node


def split_header(text):
    """'인용 (출처).' → (인용, 출처). 출처 괄호가 없으면 (text, None)."""
    m = ATTRIB_TAIL.search(text)
    if not m:
        return text.strip(), None
    return text[: m.start()].rstrip(), m.group(1).strip()


def main(stream_path, out_json=None):
    stream = json.load(open(stream_path))
    kinds = [kind(r) for r in stream]
    headers = json.load(open(DATA / "prayers/commons/psalter-headers.rich.json"))["refs"]
    inv = {p["ref"]: p for p in json.load(open(DATA / "ordinarium/invitatory.json"))["invitatoryPsalms"]}

    def inv_title(key):
        return inv[key.split(":", 1)[1].rsplit("@", 1)[0]].get("title") or ""
    rows = []
    for (label, page), o in sorted(occurrences().items(), key=lambda x: (x[0][1], x[0][0])):
        key = o["key"]
        if key.startswith("canticles:"):
            continue  # 복음 찬가는 머리말이 없다
        aw = [w for ln in o["lines"] for w in words(ln)]
        anchor, _ = find_anchor(stream, kinds, page, aw, line_offsets(o["lines"]))
        start, _, _, _ = region(stream, kinds, anchor)
        hrows = book_header(stream, kinds, start)
        text = " ".join(stream[i]["text"].strip() for i in hrows)
        trows = book_title(stream, kinds, hrows[0] if hrows else start)
        b_title = " ".join(stream[i]["text"].strip() for i in trows) or None
        a_titles = sorted({entry_at(w).get("title") or "" for w in o["where"]} - {""}) if not key.startswith("invitatory:") else [inv_title(key)]
        if not b_title and not a_titles:
            t_status = "none"
        elif not b_title:
            t_status = "EXTRA"
        elif not a_titles:
            t_status = "MISSING"
        elif all(squash(t) == squash(b_title) for t in a_titles):
            t_status = "ok"
        else:
            t_status = "DIFF"
        b_pre, b_attr = split_header(text) if hrows else (None, None)

        if key.startswith("invitatory:"):
            ref = key.split(":", 1)[1].rsplit("@", 1)[0]
            ep = inv[ref].get("epigraph")
            a_pre, a_attr = split_header(ep) if ep else (None, None)
        else:
            ref = label
            # 로더(loadPsalterHeaderRich(ref, page))와 같다 — 자리의 쪽 ±1 에서 가장 가까운 항목
            near = [x for x in (headers.get(ref) or {}).get("entries", []) if abs(x["page"] - page) <= 1]
            e = min(near, key=lambda x: abs(x["page"] - page)) if near else None
            a_pre = e["preface_text"].replace("\n", " ") if e else None
            a_attr = e.get("attribution") if e else None

        if not hrows and a_pre is None:
            status = "none"
        elif not hrows:
            status = "EXTRA"
        elif a_pre is None:
            status = "MISSING"
        elif squash(b_pre) == squash(a_pre) and squash(b_attr) == squash(a_attr):
            status = "ok"
        else:
            status = "DIFF"
        rows.append({
            "key": key, "ref": ref, "page": page, "where": o["where"], "status": status,
            "book": {"preface": b_pre, "attribution": b_attr,
                     "page": stream[hrows[0]]["bp"] if hrows else None, "lines": [stream[i]["text"].strip() for i in hrows]},
            "app": {"preface": a_pre, "attribution": a_attr},
            "title": {"status": t_status, "book": b_title, "app": a_titles},
        })

    from collections import Counter
    print("머리말: 자리", len(rows), "—", ", ".join(f"{k} {v}" for k, v in sorted(Counter(r["status"] for r in rows).items())))
    print("제목:   자리", len(rows), "—", ", ".join(f"{k} {v}" for k, v in sorted(Counter(r["title"]["status"] for r in rows).items())))
    for r in rows:
        if r["status"] in ("ok", "none"):
            continue
        print(f"\n[{r['status']}] {r['key']}  ({len(r['where'])}자리: {r['where'][0]})")
        if r["book"]["preface"] is not None:
            print(f"   책 p.{r['book']['page']}: «{r['book']['preface']}» ({r['book']['attribution']})")
        if r["app"]["preface"] is not None:
            print(f"   앱       : «{r['app']['preface']}» ({r['app']['attribution']})")
    for r in rows:
        t = r["title"]
        if t["status"] in ("ok", "none"):
            continue
        print(f"\n[제목 {t['status']}] {r['key']}")
        print(f"   책: «{t['book']}»")
        print(f"   앱: {['«' + x + '»' for x in t['app']]}")
    if out_json:
        Path(out_json).write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"\n→ {out_json}")


if __name__ == "__main__":
    out = sys.argv[sys.argv.index("--json") + 1] if "--json" in sys.argv else None
    main(sys.argv[1], out)
