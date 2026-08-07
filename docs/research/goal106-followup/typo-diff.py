#!/usr/bin/env python3
"""
GOAL 106 후속 3차 — PDF ↔ 데이터 **문자 수준 차이** 검출 (read-only).

동기: 커버리지 갭 접근(v1~v5)은 이 데이터 구조(시편 반복 인쇄 + 데이터가
PDF 의 일부만 수록)에서 신호 대 잡음비가 근본적으로 나쁘다. 반면 첫 시도에서
실제 결함이 나왔다 — Jeremiah 14:17-21 의 `халдварт` → `халдвар` (т 누락).

그 건은 기존 원장이 plain=SOURCE_NOT_FOUND / rich=REVIEW_DIVERGENCE 로
**이상 표시만 하고 판정하지 않은 991건 잔여** 중 하나였다. 그래서 이 스크립트는
그 991건(REVIEW_DIVERGENCE / REVIEW_GEOMETRY / SOURCE_NOT_FOUND)을 타겟으로
PDF 에서 근사 위치를 찾아 문자 단위로 비교한다.

판정이 아니라 **후보 생성**이다. 모든 후보는 PDF 원문 육안 대조가 필요하다.
"""
import difflib
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
HERE = Path(__file__).resolve().parent
CACHE = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "pages.pkl"

sys.path.insert(0, str(SWEEP))
spec = importlib.util.spec_from_file_location("scanc", SWEEP / "scan-shard-c.py")
scanc = importlib.util.module_from_spec(spec)
sys.modules["scanc"] = scanc
spec.loader.exec_module(scanc)

TARGET_DISPOSITIONS = {"REVIEW_DIVERGENCE", "REVIEW_GEOMETRY", "SOURCE_NOT_FOUND"}
MIN_LEN = 12          # 너무 짧으면 우연 일치가 많다
SIM_MIN = 0.82        # 이보다 낮으면 "다른 텍스트"로 본다
MAX_EDITS = 6         # 이보다 많이 다르면 오탈자가 아니라 다른 문장


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


def norm_map(s: str):
    """공백 제거 + 타이포그래피 정규화. (정규화문자열, 원본인덱스맵) 반환."""
    out, off = [], []
    for oi, ch in enumerate(s):
        for c in unicodedata.normalize("NFKC", ch).translate(scanc.TYPOGRAPHY_TRANSLATION):
            if c.isspace():
                continue
            out.append(c)
            off.append(oi)
    return "".join(out), off


def main() -> None:
    pages = load_pages()
    stream = " ".join(pages[b] for b in sorted(pages))
    ws_text, ws_off = norm_map(stream)
    print(f"스트림 {len(stream):,} / ws뷰 {len(ws_text):,}")

    rows = []
    for shard in "ABCD":
        for line in (SWEEP / f"shard-{shard}-results.jsonl").read_text(encoding="utf-8").splitlines():
            if line.strip():
                rows.append(json.loads(line))

    targets = [r for r in rows if r.get("disposition") in TARGET_DISPOSITIONS]
    print(f"타겟(미판정 잔여): {len(targets)}")

    stat = Counter()
    findings = []

    for r in targets:
        val = ((r.get("evidence") or {}).get("data") or "").strip()
        if len(val) < MIN_LEN:
            stat["짧아서 건너뜀"] += 1
            continue
        vn, _ = norm_map(val)
        if not vn:
            stat["빈 값"] += 1
            continue

        if vn in ws_text:
            stat["PDF 에 그대로 있음"] += 1
            continue

        # 앞 조각으로 후보 위치를 잡고 같은 길이 구간을 비교한다.
        head = vn[: max(10, len(vn) // 3)]
        best = None
        start = 0
        while True:
            i = ws_text.find(head, start)
            if i < 0:
                break
            cand = ws_text[i : i + len(vn)]
            sim = difflib.SequenceMatcher(None, vn, cand).ratio()
            if best is None or sim > best[0]:
                best = (sim, i, cand)
            start = i + 1
            if start > len(ws_text):
                break

        if best is None:
            # 뒤 조각으로 한 번 더
            tail = vn[-max(10, len(vn) // 3):]
            i = ws_text.find(tail)
            if i >= 0:
                s0 = max(0, i + len(tail) - len(vn))
                cand = ws_text[s0 : s0 + len(vn)]
                best = (difflib.SequenceMatcher(None, vn, cand).ratio(), s0, cand)

        if best is None:
            stat["PDF 에서 근사 위치 못 찾음"] += 1
            continue

        sim, i, cand = best
        if sim < SIM_MIN:
            stat["유사도 낮음(다른 텍스트)"] += 1
            continue

        ops = [op for op in difflib.SequenceMatcher(None, vn, cand).get_opcodes() if op[0] != "equal"]
        edits = sum(max(a2 - a1, b2 - b1) for _, a1, a2, b1, b2 in ops)
        if edits == 0:
            stat["차이 없음"] += 1
            continue
        if edits > MAX_EDITS:
            stat["차이 큼(다른 문장)"] += 1
            continue

        diffs = []
        for tag, a1, a2, b1, b2 in ops:
            diffs.append({"tag": tag, "data": vn[a1:a2], "pdf": cand[b1:b2],
                          "ctx": vn[max(0, a1 - 18):a2 + 18]})
        findings.append({
            "address": r["address"], "disposition": r["disposition"],
            "similarity": round(sim, 4), "edits": edits,
            "pdf_at": ws_off[i] if i < len(ws_off) else None,
            "diffs": diffs,
        })
        stat[f"후보(edits={edits})"] += 1

    print("\n처리:", dict(stat))
    print(f"\n▶ 오탈자 후보: {len(findings)}")

    findings.sort(key=lambda f: (f["edits"], -f["similarity"]))
    for f in findings[:40]:
        print(f"\n  [{f['edits']}자] {f['address'][-88:]}")
        print(f"     {f['disposition']} / 유사도 {f['similarity']}")
        for d in f["diffs"][:3]:
            print(f"     데이터 {d['data']!r}  ←→  PDF {d['pdf']!r}")
            print(f"       문맥: …{d['ctx']}…")

    out = Path("/tmp/goal106-typos.json")
    out.write_text(json.dumps(findings, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\n전체: {out}")
    print("주의: 후보일 뿐이다. 각 건은 PDF 원문 육안 대조 후에만 교정한다.")


if __name__ == "__main__":
    main()
