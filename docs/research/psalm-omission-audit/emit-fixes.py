"""복원할 인쇄 행 구간 → fix-lines.json (build.mjs 입력).

python3 docs/research/psalm-omission-audit/emit-fixes.py STREAM.json

구간마다 (북페이지, 첫 행, 끝 행) 를 인쇄면 행 스트림(stream.py)에서 찾아, 그 사이 본문 행과
연 경계(세로 간격이 그 쪽 행 간격 중앙값의 1.4배를 넘는 자리 — split-psalm-part2/emit-lines.py
와 같은 기준)를 낸다. 각 구간은 인쇄면 PNG 로도 대조했다 (README).
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audit import kind  # noqa: E402

HERE = Path(__file__).resolve().parent

# key → (북페이지, 첫 행, 끝 행)
SPANS = {
    "ps33-end": (98, "ЭЗЭН, Танд бидний найдсан ёсоор", "бидний дээр байх болтугай!"),
    "ps47-end": (113, "Улс үндэстнүүдийн ноёд", "Тэр өндөрт өргөмжлөгдсөн."),
    "jer31-end": (128, "Би тахилч нарын сэтгэлийг", "ЭЗЭН тунхаглаж байна."),
    "isa45-v16": (145, "Шүтээн хийгчид бүгд ичгүүрт орж,", "Гутамшиг болон хамтдаа ичиж зовно."),
    "eph1-end": (88, "Түүний хишиг ивээлийн", "Христ дотор нэгтгэх зорилго юм."),
    "ps62-v3": (237, "Ганцхан Тэр л миний хад, миний аврал,", "Миний бат цайз, би ихээр ганхахгүй."),
    "isa12-start": (249, "Эзэн минь ээ,", "Тэр надад аврал болов."),
    "ps148-v7": (301, "Газар дээрээс ЭЗЭНийг магтагтун!", "Үгийг нь гүйцэтгэдэг салхи шуурга,"),
    "ps131-start": (338, "Аяа, ЭЗЭН, зүрх минь дээгүүр бус.", "Хөхнөөс гарсан хүүхэд эхтэйгээ байх мэт."),
    "ps137-end": (449, "Бид ЭЗЭНий дууг", "Хэл минь тагнайнд минь наалдаг."),
    "ps147-start": (476, "ЭЗЭНийг магтагтун!", "Тэнгэрбурханыгаа магтан дуулах нь"),
}
# 머리말(이탤릭) — 시편 47 은 본문 첫 행에 들어가 있던 것을 머리말로 옮긴다
HEADERS = {
    "ps47-header": (112, "Тэр Эцэгийн баруун баруунтаа суудаг бөгөөд", "түүний хаанчлал хаанчлал эцэс төгсгөлгүй билээ."),
}


def page_median_gap(stream, kinds, bp):
    rows = [r for r, k in zip(stream, kinds) if r["bp"] == bp and k == "roman"]
    gaps = sorted(round(rows[i]["top"] - rows[i - 1]["top"], 1) for i in range(1, len(rows)))
    return gaps[len(gaps) // 2]


def span(stream, kinds, bp, first, last, want):
    idx = [i for i, r in enumerate(stream) if r["bp"] == bp]
    s = next(i for i in idx if stream[i]["text"].strip() == first)
    e = next(i for i in idx if i >= s and stream[i]["text"].strip() == last)
    rows = [stream[i] for i in range(s, e + 1) if kinds[i] in want]
    if len(rows) != len([i for i in range(s, e + 1) if kinds[i] not in ("furniture",)]):
        raise SystemExit(f"p.{bp} {first!r}..{last!r}: 본문이 아닌 행이 끼어 있음")
    return rows


def main(stream_path):
    stream = json.load(open(stream_path))
    kinds = [kind(r) for r in stream]
    out = {}
    for key, (bp, first, last) in SPANS.items():
        rows = span(stream, kinds, bp, first, last, ("roman",))
        med = page_median_gap(stream, kinds, bp)
        breaks = [i for i in range(1, len(rows)) if rows[i]["top"] - rows[i - 1]["top"] > med * 1.4]
        out[key] = {
            "page": bp,
            "lines": [r["text"].strip() for r in rows],
            "x0": [r["x0"] for r in rows],
            "breaks": breaks,
        }
        print(f"[{key}] p.{bp} {len(rows)}행, 연 경계 {breaks}")
    for key, (bp, first, last) in HEADERS.items():
        rows = span(stream, kinds, bp, first, last, ("italic",))
        out[key] = {"page": bp, "lines": [r["text"].strip() for r in rows]}
        print(f"[{key}] p.{bp} 머리말 {len(rows)}행")
    (HERE / "fix-lines.json").write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("→ fix-lines.json")


if __name__ == "__main__":
    main(sys.argv[1])
