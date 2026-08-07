#!/usr/bin/env python3
"""
GOAL 106 후속 — 판정 대상의 **인쇄면**을 잘라 PNG 로 저장한다 (read-only).

왜 필요한가: 지금까지의 대조는 전부 "PDF 에서 추출한 텍스트" 끼리의 비교였다.
두 추출 뷰(기하 복원 / full_pdf.txt)가 일치해도 둘 다 같은 폰트 매핑 문제를
겪으므로 함께 틀릴 수 있다 — 실제로 `хоньчnн`(라틴 n), `Н..`(마침표 중복),
`Та сүр сүр`(단어 중복), `х ариузалбирал`(글자 분리) 같은 추출 파손이 확인됐다.

인쇄면을 직접 렌더하면 그 불확실성이 사라진다. 어형 추정도 불필요하다 —
실측으로 저자의 추정이 2회 빗나갔다(#12 `даяар` 는 표준 표기지만 인쇄본은
`даяр`, #15 는 "정렬 문제" 로 오분류했으나 실제로 데이터가 틀렸다).

사용:
    python3 docs/research/goal106-followup/render-crops.py [pages.pkl]

`pages.pkl` 이 없으면 geometry_pages() 로 만든다(~37초). 출력은
`<이 스크립트 폴더>/crops/*.png`. 데이터·PDF 는 읽기만 한다.
"""
import importlib.util
import pickle
import re
import sys
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[3]
SWEEP = ROOT / "docs/research/51-truncation-sweep"
HERE = Path(__file__).resolve().parent
CACHE = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "pages.pkl"
OUT = HERE / "crops"

sys.path.insert(0, str(SWEEP))
spec = importlib.util.spec_from_file_location("scanc", SWEEP / "scan-shard-c.py")
scanc = importlib.util.module_from_spec(spec)
sys.modules["scanc"] = scanc
spec.loader.exec_module(scanc)

COLUMN_BOUNDARY = 297.0

# (라벨, 앵커) — 앵커는 indel-candidates.md §문맥 원문 표의 **PDF 열**(공백 제거 형태)이다.
# 데이터 문맥은 차이 때문에 PDF 에 없으므로 PDF 문맥을 써야 위치가 특정된다.
# 번호는 indel-candidates.md 와 대응하며, 인쇄면으로 이미 확정된 2·7·12·15 와
# 교정 완료된 5 는 제외했다.
CASES = [
    ('01_Deut32', 'Ндингэжхариубарьжбайгааюмуу?Чам'),
    ('03_Ezek36_a', 'эхнутагтчиньаваачихболно.Битан'),
    ('04_Ezek36_b', 'нарыгхамагхирбуртгаасчинь,хам'),
    ('06_Jer14_edge', 'биднийгюундэдгэшгүйгээрцохив'),
    ('08_gilh_fn3', 'Иохан14:1315:16,16:23ба2'),
    ('09_easter_sur', 'идтайхамтТасүрсүржавхлангийнхаа'),
    ('10_ot_w13', 'рдуудагдсанбид.Танытэнгэрлэгу'),
    ('11_ot_w3', 'анысүржавхлангдалдлахгүйбайж'),
    ('13_easter_sur_plain', 'аачидтайхамтТасүрсүржавхлангийн'),
    ('14_ot_w3_plain', 'анысүржавхлангдалдлахгүйбайж'),
    ('16_1Sam2_orgoh', 'үнсхогноосөргөхдөөӨргөмжлөнтэ'),
    ('17_Exod15_hayagch', 'далайдхаягчньТэрбилээ.Шил'),
    ('18_Isa33_muu', 'уугүзэхгүйнтул'),
    ('19_Jer14_hesuu', 'хэрэнхэсүүчлэхээрявжээ.Та'),
    ('20_Ps135_tushmed', 'үүнийбүхтүшмэддээрилгээсэнюм.'),
    ('21_Wis9_tanyg', 'аныгертөнцийгб'),
    ('22_Wis9_uhaal', 'нийажилүйлсийгухаалгаарудирда'),
]


def load_pages():
    if CACHE.exists():
        with CACHE.open("rb") as fh:
            return pickle.load(fh)
    import os
    os.chdir(ROOT)
    pages = {bp: p.visual for bp, p in scanc.geometry_pages().items()}
    with CACHE.open("wb") as fh:
        pickle.dump(pages, fh)
    return pages


def main() -> None:
    pages = load_pages()
    OUT.mkdir(exist_ok=True)
    squash = lambda s: re.sub(r"\s+", "", s)
    pdf = pdfplumber.open(ROOT / "public/psalter.pdf")

    for label, anchor in CASES:
        key = squash(anchor)
        hits = [bp for bp in sorted(pages) if key in squash(pages[bp])]
        if not hits:
            print(f"[{label}] 앵커 '{anchor}' 를 어느 북페이지에서도 못 찾음")
            continue
        if len(hits) > 1:
            print(f"[{label}] 앵커가 {len(hits)} 곳에 등장 {hits} — 첫 번째 사용 (앵커를 더 좁힐 것)")
        bp = hits[0]
        phys, col = bp // 2, ("left" if bp % 2 == 0 else "right")
        page = pdf.pages[phys]
        if page.width < COLUMN_BOUNDARY + 50:
            x0, x1 = 0, page.width
        else:
            x0, x1 = (0, COLUMN_BOUNDARY) if col == "left" else (COLUMN_BOUNDARY, page.width)

        chars = [c for c in page.chars if x0 <= c["x0"] < x1]
        rows: dict[float, list[str]] = {}
        for c in sorted(chars, key=lambda c: (round(c["top"], 1), c["x0"])):
            rows.setdefault(round(c["top"], 1), []).append(c["text"])
        # 앵커의 첫 단어가 있는 줄을 찾는다
        head = squash(anchor)[:10]
        target = next((t for t, cs in rows.items() if head in squash("".join(cs))), None)
        top = max(0, (target if target is not None else 0) - 60)
        bottom = min(page.height, top + 170)

        page.crop((x0, top, x1, bottom)).to_image(resolution=350).save(str(OUT / f"{label}.png"))
        print(f"[{label}] 북페이지 {bp} (물리 {phys}, {col}단) → crops/{label}.png")

    pdf.close()
    print(f"\n저장 위치: {OUT}")
    print("판정: 이미지의 활자를 데이터 값과 직접 대조한다. 추출 텍스트는 참고만 할 것.")


if __name__ == "__main__":
    main()
