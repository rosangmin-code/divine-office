#!/usr/bin/env python3
"""
v5 — 블록 단위 통째 매칭으로 오프셋 오배정을 근절한다.

v4 잔여 결함: 짧은 행을 개별로 찾으면 같은 문자열이 여러 번 나오는 시편에서
엉뚱한 위치에 배정된다 (Psalm 115 의 'Тусламж ба бамбай нь Тэр юм.' 은 한
시편에 두 번 등장). 그 결과 실제로는 다음 줄들이 덮고 있는 구간이 갭으로
보인다 — v4 후보를 샘플링한 5건이 전부 이 원인이었다.

v5: 같은 부모(배열)의 형제 값들을 **순서대로 이어붙여 한 덩어리로** 스트림에서
찾는다. 덩어리가 통째로 매칭되면 각 형제의 위치가 자동으로 정확해진다.
덩어리 매칭에 실패한 그룹만 판정 불가로 남긴다 — 개별 폴백을 두지 않는다
(그게 오배정의 원인이므로).
"""
import importlib.util
import json
import pickle
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path("/home/min/myproject/divineoffice")
SWEEP = ROOT / "docs/research/51-truncation-sweep"
S = Path(__file__).resolve().parent  # 캐시 위치 (pages.pkl / rematch.pkl)

sys.path.insert(0, str(SWEEP))
spec = importlib.util.spec_from_file_location("scanc", SWEEP / "scan-shard-c.py")
scanc = importlib.util.module_from_spec(spec)
sys.modules["scanc"] = scanc
spec.loader.exec_module(scanc)

pages = pickle.load((S / "pages.pkl").open("rb"))
order = sorted(pages)
parts, starts = [], {}
pos = 0
for bp in order:
    starts[bp] = pos
    parts.append(pages[bp]); parts.append(" ")
    pos += len(pages[bp]) + 1
stream = "".join(parts)

# whitespace-stripped 뷰 (가장 관대한 티어 하나로 통일 — 덩어리 매칭에는 충분)
def norm_map(s: str):
    out, off = [], []
    for oi, ch in enumerate(s):
        for c in unicodedata.normalize("NFKC", ch).translate(scanc.TYPOGRAPHY_TRANSLATION):
            if c.isspace():
                continue
            out.append(c); off.append(oi)
    return "".join(out), off

ws_text, ws_off = norm_map(stream)
print(f"스트림 {len(stream):,} / ws뷰 {len(ws_text):,}")

rows = []
for shard in "ABCD":
    for line in (SWEEP / f"shard-{shard}-results.jsonl").read_text(encoding="utf-8").splitlines():
        if line.strip():
            rows.append(json.loads(line))

NUM = re.compile(r"(\d+)")
sortkey = lambda a: [int(t) if t.isdigit() else t for t in NUM.split(a)]

def parent(addr):
    f, _, ptr = addr.partition("#")
    seg = ptr.rsplit("/", 1)
    return (f, seg[0]) if len(seg) == 2 and seg[1].isdigit() else (f, ptr)

groups = defaultdict(list)
for r in rows:
    if r.get("disposition") == "NOT_APPLICABLE_METADATA":
        continue
    v = (r.get("evidence") or {}).get("data") or ""
    if v.strip():
        groups[parent(r["address"])].append((r["address"], v, r.get("page")))

print(f"그룹: {len(groups)}")

stat = Counter()
spans = []          # (start, end, address)
unresolved = []

for key, items in groups.items():
    items.sort(key=lambda t: sortkey(t[0]))
    chunk = " ".join(v for _, v, _ in items)
    n, _ = norm_map(chunk)
    if not n:
        stat["빈 덩어리"] += 1
        continue
    j = ws_text.find(n)
    if j < 0:
        stat["덩어리 매칭 실패"] += 1
        unresolved.append((key, len(items)))
        continue
    if ws_text.find(n, j + 1) >= 0:
        stat["덩어리 중복(모호)"] += 1
        unresolved.append((key, len(items)))
        continue
    # 덩어리 안에서 각 형제의 위치를 순서대로 배정
    cur = j
    for addr, v, _ in items:
        vn, _ = norm_map(v)
        if not vn:
            continue
        k = ws_text.find(vn, cur)
        if k < 0 or k >= j + len(n):
            stat["형제 배정 실패"] += 1
            continue
        spans.append((ws_off[k], ws_off[k + len(vn) - 1] + 1, addr))
        cur = k + len(vn)
    stat["덩어리 매칭 성공"] += 1
    stat["배정된 행"] += len(items)

print("결과:", dict(stat))
resolved_groups = stat["덩어리 매칭 성공"]
print(f"그룹 회수율: {resolved_groups}/{len(groups)} = {resolved_groups/len(groups)*100:.1f}%")
print(f"행 회수: {stat['배정된 행']} / {sum(len(v) for v in groups.values())}")

# 커버리지 병합 & 갭
spans.sort()
merged = []
for s, e, a in spans:
    if merged and s <= merged[-1][1]:
        if e > merged[-1][1]:
            merged[-1][1], merged[-1][2] = e, a
    else:
        merged.append([s, e, a])
cov = sum(e - s for s, e, _ in merged)
print(f"병합 구간 {len(merged)}   커버 {cov:,}/{len(stream):,} ({cov/len(stream)*100:.1f}%)")

MEANINGFUL = re.compile(r"[^\W\d_]{4,}", re.UNICODE)
TERMINAL = re.compile(r"[.!?…:;»”’)\]]\s*$")
cands = []
for i, (s, e, a) in enumerate(merged):
    if i + 1 >= len(merged):
        continue
    gap = stream[e:merged[i + 1][0]]
    if not gap.strip() or not MEANINGFUL.search(gap):
        continue
    if len(gap) - len(gap.lstrip()) > 1:
        continue
    tail = stream[max(s, e - 60):e]
    if TERMINAL.search(tail):
        continue
    cands.append({"address": a, "next_address": merged[i + 1][2],
                  "prev_tail": tail, "gap": gap.strip()})

freq = Counter(re.sub(r"\s+", "", c["gap"]).lower() for c in cands)
uniq = [c for c in cands if freq[re.sub(r"\s+", "", c["gap"]).lower()] == 1]
print(f"\n인접+미종결 갭: {len(cands)}   고유(반복 아님): {len(uniq)}")

Path("/tmp/goal106-v5.json").write_text(json.dumps(uniq, ensure_ascii=False, indent=1), encoding="utf-8")
for c in sorted(uniq, key=lambda x: len(x["gap"]))[:20]:
    print(f"\n  {c['address'][-88:]}")
    print(f"     앞  …{c['prev_tail'][-48:]!r}")
    print(f"     ▶ GAP({len(c['gap'])}): {c['gap'][:120]!r}")
print(f"\n전체: /tmp/goal106-v5.json")
