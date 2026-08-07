#!/usr/bin/env python3
"""
GOAL 106 후속 — 커버리지 갭 기반 절단 검출 (read-only).

기존 scan-shard-c.py 는 "저장값이 PDF 페이지에 부분문자열로 있는가"만 보므로
절단된 값도 MATCH_LITERAL 로 통과한다. 그리고 "페이지 잔여 = 잘린 꼬리" 는
정상 값도 858자 꼬리를 갖기 때문에 성립하지 않는다 (plan.md 게이트 5).

여기서는 반대로 접근한다: 북페이지 텍스트에서 **어느 데이터 주소에도 덮이지
않은 구간(갭)** 을 찾는다. 꼬리가 "다음 유닛"이면 그 유닛이 다른 주소로
매칭되므로 갭이 아니다 — 게이트 5가 마커 사전 없이 자연히 충족된다.

거짓 양성 회피 규칙 (README §거짓 양성 4종 참조):
  - 커버리지로 인정할 행 = MATCH_* 이면서 정규화 후 data == pdf_visual 인 것만.
    anchored/unproven 행의 pdf_visual 은 근사 구간이라 저장값과 정렬되지 않는다.
  - 오프셋 배정은 페이지 안에서 단조 증가 커서로 한다. text.find() 단순 배정은
    반복 텍스트에서 앞 행에 잘못 배정된다.
  - 신뢰 불가 행이 하나라도 있는 페이지는 판정 불가로 제외한다. 불완전한
    커버리지 위에서 갭을 주장하지 않는다.

사용:
    python3 docs/research/goal106-followup/coverage-gap.py [pages_cache.pkl]

기존 산출물·데이터는 읽기만 한다. scan-shard-c.py 는 import 만 하고 main() 은
부르지 않는다 (__main__ 가드가 있어 부작용 없음).
"""
import importlib.util
import json
import pickle
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SWEEP = ROOT / "docs/research/51-truncation-sweep"
CACHE = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / ".goal106-pages.pkl"

sys.path.insert(0, str(SWEEP))
spec = importlib.util.spec_from_file_location("scanc", SWEEP / "scan-shard-c.py")
scanc = importlib.util.module_from_spec(spec)
sys.modules["scanc"] = scanc  # @dataclass 가 sys.modules 를 참조한다
spec.loader.exec_module(scanc)

TRANS = {0x201C: '"', 0x201D: '"', 0x2018: "'", 0x2019: "'",
         0x2014: "-", 0x2013: "-", 0x2212: "-", 0x2026: "..."}
MEANINGFUL = re.compile(r"[^\W\d_]{4,}", re.UNICODE)
TERMINAL = re.compile(r"[.!?…:;»”’)\]]\s*$")
NUM = re.compile(r"(\d+)")


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", s).translate(TRANS)).strip()


def sortkey(addr: str):
    """배열 인덱스를 숫자로 취급해 자연 정렬 (…/10 이 …/9 뒤에 오도록)."""
    return [int(t) if t.isdigit() else t for t in NUM.split(addr)]


def load_pages() -> dict[int, str]:
    if CACHE.exists():
        with CACHE.open("rb") as fh:
            return pickle.load(fh)
    import os
    os.chdir(ROOT)  # scan-shard-c.py 는 Path.cwd() 기준으로 경로를 만든다
    pages = {bp: page.visual for bp, page in scanc.geometry_pages().items()}
    with CACHE.open("wb") as fh:
        pickle.dump(pages, fh)
    return pages


def load_rows() -> list[dict]:
    rows = []
    for shard in "ABCD":
        path = SWEEP / f"shard-{shard}-results.jsonl"
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                rows.append(json.loads(line))
    return rows


def main() -> None:
    pages = load_pages()
    rows = load_rows()
    print(f"북페이지 스트림: {len(pages)}   원장 행: {len(rows)}")

    by_page: dict[int, list] = {}
    suspect: set[int] = set()
    stat: Counter = Counter()

    for r in rows:
        bp = r.get("page")
        ev = r.get("evidence") or {}
        disp = r.get("disposition", "")
        data, vis = ev.get("data") or "", ev.get("pdf_visual") or ""

        if disp == "NOT_APPLICABLE_METADATA":
            stat["metadata"] += 1
            continue
        if bp is None or bp not in pages:
            stat["페이지 미상"] += 1
            continue
        if not disp.startswith("MATCH") or not vis or norm(data) != norm(vis):
            suspect.add(bp)
            stat["신뢰불가"] += 1
            continue
        by_page.setdefault(bp, []).append((r["address"], vis))

    assigned: dict[int, list] = {}
    for bp, items in by_page.items():
        items.sort(key=lambda t: sortkey(t[0]))
        text, cursor, spans, ok = pages[bp], 0, [], True
        for addr, vis in items:
            i = text.find(vis, cursor)
            if i < 0:
                i = text.find(vis)          # 순서 가정이 깨진 경우 (페이지 경계 등)
                if i < 0:
                    ok = False
                    stat["배정 실패"] += 1
                    break
                stat["순서 역전(허용)"] += 1
            spans.append((i, i + len(vis), addr))
            cursor = max(cursor, i + len(vis))
        if ok:
            assigned[bp] = spans
            stat["배정 성공(행)"] += len(spans)
        else:
            suspect.add(bp)

    print("행 처리:", dict(stat))
    clean = {bp: sp for bp, sp in assigned.items() if bp not in suspect}
    print(f"\n판정 가능 페이지: {len(clean)} / {len(pages)} "
          f"({len(clean) / len(pages) * 100:.1f}%)   판정 불가: {len(suspect)}")

    findings = []
    for bp, spans in sorted(clean.items()):
        text = pages[bp]
        spans.sort()
        merged: list[list] = []
        for s, e, a in spans:
            if merged and s <= merged[-1][1]:
                if e > merged[-1][1]:
                    merged[-1][1], merged[-1][2] = e, a
            else:
                merged.append([s, e, a])
        for i, (s, e, a) in enumerate(merged):
            if i + 1 >= len(merged):
                continue
            gap = text[e:merged[i + 1][0]]
            if not gap.strip() or not MEANINGFUL.search(gap):
                continue
            if len(gap) - len(gap.lstrip()) > 1:   # 매칭 구간 바로 뒤가 아니면 제외
                continue
            tail = text[max(s, e - 50):e]
            findings.append({
                "book_page": bp, "address": a, "next_address": merged[i + 1][2],
                "prev_tail": tail, "gap": gap.strip(),
                "unterminated": not bool(TERMINAL.search(tail)),
            })

    unterm = [f for f in findings if f["unterminated"]]
    print(f"인접 갭: {len(findings)}   그중 문장 미종결(절단 시그니처): {len(unterm)}")
    for f in sorted(unterm, key=lambda x: len(x["gap"]))[:20]:
        print(f"\n  p.{f['book_page']}  {f['address'][-85:]}")
        print(f"     앞  …{f['prev_tail'][-45:]!r}")
        print(f"     ▶ GAP({len(f['gap'])}): {f['gap'][:120]!r}")
        print(f"     뒤  {f['next_address'][-75:]}")

    out = Path("/tmp/goal106-gaps.json")
    out.write_text(json.dumps(findings, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\n전체 결과: {out}")
    print("\n주의: 남은 후보도 형제 필드(fullResponse 등)가 이미 담고 있는지,")
    print("      페이지 경계를 넘는 유닛인지 반드시 개별 확인해야 한다 (README §거짓 양성).")


if __name__ == "__main__":
    main()
