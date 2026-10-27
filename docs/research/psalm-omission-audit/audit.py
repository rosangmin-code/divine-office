"""시편·찬가 본문 빠짐 전수 대조 — 앱 데이터의 시편 자리마다 책의 해당 블록과 단어 단위로 맞춘다.

python3 docs/research/psalm-omission-audit/audit.py STREAM.json [--all]
python3 docs/research/psalm-omission-audit/audit.py STREAM.json --emit-fixture   # 회귀 테스트 지문 갱신
python3 docs/research/psalm-omission-audit/audit.py STREAM.json --show "Psalm 42:2-6@195"

책 쪽 블록: 그 자리의 `page` 근처에서 앱 본문 첫 행을 찾고(앵커), 위로는 제목·머리말·
부 표지(빨강·이탤릭·괄호 출처)를 만날 때까지, 아래로는 영광송·후렴·빨간 행·이탤릭 행을
만날 때까지를 본문으로 본다. 그 안의 로만 11pt 행 단어열을 앱 stanzas 단어열과
difflib 로 맞춰, 책에만 있는 구간(빠짐)·앱에만 있는 구간(덧붙음)을 낸다.

GOAL 106 의 "책 전체 커버리지 갭" 방식은 시편이 책 여러 곳에 반복 인쇄되어 잡음에
묻혔다(docs/research/goal106-followup/README.md). 여기서는 자리마다 책의 구조 표지로
블록을 잘라 그 문제를 피한다.
"""
import hashlib
import json
import re
import sys
from collections import defaultdict
from difflib import SequenceMatcher
from pathlib import Path

DATA = Path("src/data/loth")
HOMOGLYPH = str.maketrans("ABCEHKMOPTXYaceopxy", "АВСЕНКМОРТХУасеорху")
NUMERAL_LINE = re.compile(r"^\s*(I|II|III|IV)\s*$")
GLORIA = "эцэг хүү ариун сүнсэнд жавхланг"
MAJOR = 3  # 이 단어 수 이상 어긋나면 빠짐/덧붙음 후보


def words(text):
    t = text.translate(HOMOGLYPH).lower()
    t = re.sub(r"[^\w\-]+", " ", t)
    out = []
    for w in t.split():
        w = w.strip("-_")
        if w:
            out.append(w)
    return out


def kind(row):
    """행 종류: furniture / red / inline / antiphon / italic / small / gloria / attrib / roman.

    - 빨간 머리 행 중 `-`·`(Х.`·`Х.` 로 시작하는 것은 본문의 응답 행이다 (찬가 Илчлэл 19 등).
    - 머리말 끝 행은 이탤릭 인용 + 로만 출처가 섞이므로 이탤릭 비율 0.15 이상이면 머리말로 본다.
    - `(Гэгээн` / `Атаназ).` 처럼 출처 괄호가 다음 행으로 넘어간 둘째 행은 attrib.
    - 대문자 한 글자뿐인 행은 장식 글자 조각이다 (p.32 «М») — 본문 아님.
    """
    if row["top"] < 40 or row["font"].startswith("MinionPro"):
        return "furniture"
    if row["red"] > 0.9:
        # 초대송 95 의 «(Шад дуулал давтагдана)» 처럼 연 사이에 끼는 괄호 지시문은 본문을 끊지 않는다
        return "inline" if row["text"].lstrip().startswith("(") else "red"
    text = row["text"].lstrip()
    if row["first_red"]:
        return "roman" if text.startswith(("-", "–", "(Х", "Х.")) else "antiphon"
    if row["italic"] >= 0.15:
        return "italic"
    if row["size"] < 10.5:
        return "small"
    if " ".join(words(text)).startswith(GLORIA):
        return "gloria"
    if re.match(r"^[^(]*\)\.?$", text):
        return "attrib"
    if re.fullmatch(r"[A-ZА-ЯЁӨҮ]", text.strip()):
        return "furniture"
    return "roman"


def occurrences():
    """앱이 그리는 시편·찬가 본문 자리 → {(label, page): {"lines", "where"}}.

    - 시편집·끝기도·고유부 시편: `psalter-texts.json[ref]` 의 stanzas (resolvePsalm 과 같은 원천)
    - 초대송 시편: `ordinarium/invitatory.json` 각 항목의 자체 stanzas
    - 복음 찬가: `ordinarium/canticles.json` 의 verses
    """
    texts = json.load(open(DATA / "psalter-texts.json"))
    occ = {}

    def add(label, page, lines, where, key):
        item = occ.setdefault((label, page), {"lines": lines, "where": [], "key": key})
        item["where"].append(where)

    def walk(node, path, f):
        if isinstance(node, dict):
            ref = node.get("ref")
            if isinstance(ref, str) and ref in texts and isinstance(node.get("page"), int):
                add(ref, node["page"], app_lines(texts[ref]), f"{f}{path}", f"psalter-texts:{ref}@{node['page']}")
            for k, v in node.items():
                walk(v, f"{path}.{k}", f)
        elif isinstance(node, list):
            for i, v in enumerate(node):
                walk(v, f"{path}[{i}]", f)

    for f in sorted(DATA.rglob("*.json")):
        rel = str(f.relative_to(DATA))
        if f.name.startswith("psalter-texts") or "rich" in f.name or rel == "ordinarium/invitatory.json":
            continue
        walk(json.load(open(f)), "", rel)

    inv = json.load(open(DATA / "ordinarium/invitatory.json"))
    for i, p in enumerate(inv["invitatoryPsalms"]):
        add(f"초대송 {p['ref']}", p["page"], app_lines(p), f"ordinarium/invitatory.json.invitatoryPsalms[{i}]",
            f"invitatory:{p['ref']}@{p['page']}")
    can = json.load(open(DATA / "ordinarium/canticles.json"))
    for k, c in can.items():
        add(f"복음찬가 {k}", c["page"], list(c["verses"]), f"ordinarium/canticles.json.{k}", f"canticles:{k}@{c['page']}")
    return occ


def app_lines(entry):
    return [ln for st in entry["stanzas"] for ln in st if not NUMERAL_LINE.match(ln)]


def line_offsets(lines):
    """각 앱 행이 시작하는 단어 위치."""
    out, n = [], 0
    for ln in lines:
        out.append(n)
        n += len(words(ln))
    return out


def find_anchor(stream, kinds, page, app_words, offsets):
    """page-2..page+2 의 로만 행에서 앱 본문이 시작하는 행 번호.

    앱 첫 행이 책 본문에 없으면(머리말이 본문에 섞인 경우 등) 둘째·셋째 행으로 다시 찾는다.
    앞에서 건너뛴 앱 단어는 비교에서 '앱에만 있음' 으로 드러난다.
    """
    cand = [i for i, r in enumerate(stream) if page - 2 <= r["bp"] <= page + 2 and kinds[i] == "roman"]
    flat = []  # (word, row index)
    for i in cand:
        flat += [(w, i) for w in words(stream[i]["text"])]
    seq = [w for w, _ in flat]
    for nth, off in enumerate(offsets[:3]):
        probe = app_words[off:off + 4]
        if not probe:
            continue
        hits = [j for j in range(len(seq) - len(probe) + 1) if seq[j:j + len(probe)] == probe]
        if hits:
            best = min(hits, key=lambda j: abs(stream[flat[j][1]]["bp"] - page))
            return flat[best][1], "exact" if nth == 0 else f"exact(앱 {nth + 1}행)"
    best, best_ratio = None, 0.0
    for i in cand:
        ratio = SequenceMatcher(None, words(stream[i]["text"])[:6], app_words[:6]).ratio()
        if ratio > best_ratio:
            best, best_ratio = i, ratio
    return (best, f"fuzzy {best_ratio:.2f}") if best_ratio >= 0.6 else (None, f"none {best_ratio:.2f}")


def region(stream, kinds, anchor):
    """앵커가 속한 본문 블록 [start, end) 와 경계 행."""
    start = anchor
    i = anchor - 1
    while i >= 0:
        k = kinds[i]
        if k in ("furniture", "small", "inline"):
            i -= 1
            continue
        if k != "roman" or stream[i]["text"].lstrip().startswith("("):
            break
        start = i
        i -= 1
    before = i
    end = anchor + 1
    while end < len(stream) and stream[end]["bp"] <= stream[anchor]["bp"] + 8:
        k = kinds[end]
        if k in ("furniture", "small", "inline"):
            end += 1
            continue
        if k != "roman":
            break
        end += 1
    return start, end, before, end if end < len(stream) else None


FIXTURE = Path("src/lib/__tests__/data/psalm-book-text.fixture.json")


def main(stream_path, show_all, emit_fixture=False):
    stream = json.load(open(stream_path))
    kinds = [kind(r) for r in stream]
    occ = occurrences()
    report = []
    fixture = {}
    for (ref, page), o in sorted(occ.items(), key=lambda x: (x[0][1], x[0][0])):
        app, where = o["lines"], o["where"]
        app_words = [w for ln in app for w in words(ln)]
        anchor, how = find_anchor(stream, kinds, page, app_words, line_offsets(app))
        item = {"ref": ref, "page": page, "where": where, "anchor": how}
        if anchor is None:
            item["status"] = "NO-ANCHOR"
            report.append(item)
            continue
        start, end, before, after = region(stream, kinds, anchor)
        body = [i for i in range(start, end) if kinds[i] == "roman"]
        book_words, owner = [], []
        for i in body:
            for w in words(stream[i]["text"]):
                book_words.append(w)
                owner.append(i)
        item.update({
            "bp": [stream[start]["bp"], stream[end - 1]["bp"]],
            "before": f"[{kinds[before]}] {stream[before]['text'][:50]}" if before >= 0 else "",
            "after": f"[{kinds[after]}] {stream[after]['text'][:50]}" if after is not None else "",
            "book_words": len(book_words),
            "app_words": len(app_words),
        })
        sm = SequenceMatcher(None, book_words, app_words, autojunk=False)
        diffs = []
        for tag, a0, a1, b0, b1 in sm.get_opcodes():
            if tag == "equal":
                continue
            diffs.append({
                "tag": tag,
                "book": " ".join(book_words[a0:a1]),
                "app": " ".join(app_words[b0:b1]),
                "book_n": a1 - a0,
                "app_n": b1 - b0,
                "at_bp": stream[owner[a0]]["bp"] if a0 < len(owner) else stream[owner[-1]]["bp"],
            })
        item["diffs"] = diffs
        joined = "".join(book_words)
        fixture[o["key"]] = {"chars": len(joined), "sha1": hashlib.sha1(joined.encode("utf-8")).hexdigest()}
        major = [d for d in diffs if max(d["book_n"], d["app_n"]) >= MAJOR]
        item["status"] = "MAJOR" if major else ("minor" if diffs else "ok")
        report.append(item)

    counts = defaultdict(int)
    for it in report:
        counts[it["status"]] += 1
    print(f"자리 {len(report)} — " + ", ".join(f"{k} {v}" for k, v in sorted(counts.items())))
    for it in report:
        if it["status"] == "ok" and not show_all:
            continue
        print(f"\n== {it['ref']} p.{it['page']}  [{it['status']}] anchor={it['anchor']}  ({len(it['where'])}자리: {it['where'][0]})")
        if "bp" in it:
            print(f"   블록 p.{it['bp'][0]}–{it['bp'][1]}  책 {it['book_words']}단어 / 앱 {it['app_words']}단어")
            print(f"   위: {it['before']}")
            print(f"   아래: {it['after']}")
        for d in it.get("diffs", []):
            mark = "★" if max(d["book_n"], d["app_n"]) >= MAJOR else " "
            print(f"   {mark} {d['tag']:7} p.{d['at_bp']}  책[{d['book_n']}] «{d['book'][:90]}»  앱[{d['app_n']}] «{d['app'][:90]}»")
    out = Path(stream_path).with_name("audit-report.json")
    json.dump(report, open(out, "w"), ensure_ascii=False, indent=1)
    print(f"\n→ {out}")
    if emit_fixture:
        missing = [it["ref"] for it in report if it["status"] == "NO-ANCHOR"]
        if missing:
            raise SystemExit(f"책 블록을 못 찾은 자리가 있어 지문을 쓰지 않는다: {missing}")
        payload = {
            "_about": (
                "시편·찬가 본문 자리마다 책(public/psalter.pdf)에 인쇄된 본문의 지문. "
                "docs/research/psalm-omission-audit/audit.py --emit-fixture 가 만든다 — 책이 바뀌면 다시 만든다. "
                "글자: 소문자, 라틴 동형 글자→키릴, 문장부호 제거, 단어를 띄어쓰기 없이 이음 "
                "(PDF 의 붙은 낱말과 행 나눔 차이를 지우려고). 검사: psalm-book-text.test.ts"
            ),
            "entries": dict(sorted(fixture.items())),
        }
        FIXTURE.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"→ {FIXTURE} ({len(fixture)}자리)")




def show(stream_path, ref, page):
    """한 자리의 책 블록 행과 앱 stanzas 를 나란히 찍는다 (판정용)."""
    stream = json.load(open(stream_path))
    kinds = [kind(r) for r in stream]
    app = occurrences()[(ref, page)]["lines"]
    app_words = [w for ln in app for w in words(ln)]
    anchor, how = find_anchor(stream, kinds, page, app_words, line_offsets(app))
    print(f"## {ref} p.{page} anchor={how}")
    if anchor is not None:
        start, end, before, after = region(stream, kinds, anchor)
        lo = max(0, (before if before >= 0 else start) - 2)
        hi = min(len(stream), (after if after is not None else end) + 2)
        for i in range(lo, hi):
            r = stream[i]
            mark = ">" if start <= i < end and kinds[i] == "roman" else " "
            print(f" {mark} p.{r['bp']} {r['top']:6.1f} [{kinds[i]:9}] {r['text']}")
    print("-- app lines")
    for li, ln in enumerate(app):
        print(f"   {li:3} | {ln}")


if __name__ == "__main__":
    if "--show" in sys.argv:
        ref, page = sys.argv[sys.argv.index("--show") + 1].rsplit("@", 1)
        show(sys.argv[1], ref, int(page))
    else:
        main(sys.argv[1], "--all" in sys.argv, "--emit-fixture" in sys.argv)
