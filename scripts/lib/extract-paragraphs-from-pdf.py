#!/usr/bin/env python3
"""extract-paragraphs-from-pdf.py — F-X11 Phase 2 R-2 paragraph extractor.

Per-stanza-block PDF y-coordinate extractor. Takes a rich.json stanza
block's logical line texts as input, locates each line on the PDF, then
classifies the inter-line gaps to derive paragraph boundaries.

Mechanism (R-1 PoC, #500):

  1. pdfplumber.open(pdf).pages[page_idx]
  2. Cluster page.chars by `top` (rounded ±1.5pt) → physical PDF lines
  3. Split into left/right columns by x0 < COLUMN_BOUNDARY (=297pt)
  4. Concatenate lines across the supplied pages, preserving column order
  5. Find the rich block's first line in the PDF column-line stream
  6. Walk forward, matching each rich block line to ONE or MORE consecutive
     PDF physical lines (wrap-tolerant — Cyrillic LotH typography drift
     covered via 12-char prefix tolerance and a length-aware wrap bridge).
  7. Per matched rich line, record the TOP of the first PDF physical
     line (the rich line's visual start).
  8. Compute consecutive top-to-top gaps between rich lines.
  9. Compute median gap (= line spacing baseline).
 10. Classify gaps:
       gap < THRESHOLD_RATIO × median  → continuation
       gap >= THRESHOLD_RATIO × median → paragraph break
     (Stanza-level gaps — >= 1.95 × median — DO NOT occur within a single
     block because the block has been pre-split by rich.json. They surface
     here as warnings.)
 11. Emit `paragraphBoundaries` = rich-line indices where the INCOMING
     gap signals a paragraph break.

CLI input (single block):

  python3 scripts/lib/extract-paragraphs-from-pdf.py \\
      --pdf public/psalter.pdf \\
      --pages 97 \\
      --column right \\
      --block-lines-json /tmp/block-lines.json \\
      [--threshold-ratio 1.4]

Where `block-lines.json` is `["line0 text", "line1 text", ...]`.

Output (stdout JSON):

  {
    "ref":              "...",
    "matched":          true,
    "matchedLines":     19,
    "expectedLines":    19,
    "medianGap":        13.20,
    "thresholdRatio":   1.4,
    "thresholdPt":      18.48,
    "lineTops":         [163.90, 177.10, ...],
    "gaps":             [null, 13.20, ...],
    "paragraphBoundaries": [4, 8, 12]
  }
"""
import argparse
import json
import re
import sys
from statistics import median
from typing import List, Optional

import pdfplumber


COLUMN_BOUNDARY = 297.0
TOP_EPS = 1.5
STANZA_RATIO = 1.95
DEFAULT_THRESHOLD_RATIO = 1.4
MAX_WRAP_DEPTH = 4  # 1 primary + up to 3 absorbed wraps
PREFIX_MATCH_LEN = 12


def normalize(s: str) -> str:
    """Normalize whitespace + typography for tolerant matching."""
    s = s.strip()
    s = re.sub(r"\s+", " ", s)
    # Curly quotes → straight, em/en dashes → hyphen
    s = s.replace("“", '"').replace("”", '"').replace("‘", "'").replace("’", "'")
    s = s.replace("—", "-").replace("–", "-").replace("…", "...")
    return s


def line_matches(pdf_text: str, rich_text: str) -> bool:
    """Exact match or 12-char prefix tolerance (typography drift)."""
    a = normalize(pdf_text)
    b = normalize(rich_text)
    if a == b:
        return True
    if len(a) >= PREFIX_MATCH_LEN and len(b) >= PREFIX_MATCH_LEN:
        return a[:PREFIX_MATCH_LEN] == b[:PREFIX_MATCH_LEN]
    return False


def cluster_lines(chars: list) -> list:
    """Cluster pdfplumber chars by `top` into physical PDF lines."""
    if not chars:
        return []
    sorted_chars = sorted(chars, key=lambda c: (c["top"], c["x0"]))
    lines = []
    current_top: Optional[float] = None
    current_chars: list = []
    for c in sorted_chars:
        if current_top is None or abs(c["top"] - current_top) <= TOP_EPS:
            if current_top is None:
                current_top = c["top"]
            current_chars.append(c)
        else:
            text = "".join(cc["text"] for cc in sorted(current_chars, key=lambda x: x["x0"]))
            x0_min = min(cc["x0"] for cc in current_chars)
            lines.append({"top": current_top, "text": text, "x0": x0_min})
            current_top = c["top"]
            current_chars = [c]
    if current_chars:
        text = "".join(cc["text"] for cc in sorted(current_chars, key=lambda x: x["x0"]))
        x0_min = min(cc["x0"] for cc in current_chars)
        lines.append({"top": current_top, "text": text, "x0": x0_min})
    return lines


def collect_column_lines(pdf_path: str, pages: List[int], column: str) -> list:
    """Cluster + filter chars for the given pages/column. Returns list with
    {top, text, x0, pageIdx}. NOTE: tops are PAGE-LOCAL — caller must NOT
    use them for cross-page gap computation."""
    all_lines = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_idx in pages:
            page = pdf.pages[page_idx]
            chars = page.chars
            if column == "left":
                col_chars = [c for c in chars if c["x0"] < COLUMN_BOUNDARY]
            elif column == "right":
                col_chars = [c for c in chars if c["x0"] >= COLUMN_BOUNDARY]
            elif column == "auto":
                # Default to whichever side has more chars
                left = [c for c in chars if c["x0"] < COLUMN_BOUNDARY]
                right = [c for c in chars if c["x0"] >= COLUMN_BOUNDARY]
                col_chars = left if len(left) >= len(right) else right
            else:
                raise ValueError(f"unknown column: {column}")
            lines = cluster_lines(col_chars)
            # Drop whitespace-only clusters (LotH PDF emits stray space
            # glyphs at column margins that cluster into 1-char lines).
            # Keeping them inflates gaps and de-syncs the walker (R-2 Pilot
            # hit this on Psalm 63 page-29-right line 2 = lone ' ' glyph
            # between PDF lines 1 and 3).
            lines = [ln for ln in lines if normalize(ln["text"]) != ""]
            for ln in lines:
                ln["pageIdx"] = page_idx
            all_lines.extend(lines)
    return all_lines


def find_anchor_index(col_lines: list, anchor_text: str) -> Optional[int]:
    """Find the index of the line whose normalized text matches anchor."""
    for i, ln in enumerate(col_lines):
        if line_matches(ln["text"], anchor_text):
            return i
    return None


def try_wrap_bridge(
    col_lines: list, start_idx: int, target_text: str
) -> Optional[int]:
    """Try absorbing up to MAX_WRAP_DEPTH PDF lines starting at start_idx to
    match `target_text`. Returns the count consumed (>=1) on success, else
    None.

    Strategy (FAIL FAST on the SHORT side, FAIL DEEP on the LONG side):

      1. Pass 1 (strict equality): try depth=1..MAX with full normalized
         equality. Return the FIRST depth that yields exact match.
      2. Pass 2 (prefix tolerance for typography drift): try depth=1..MAX
         with 12-char prefix match AND length-aware fence (within 15% /
         4 chars of target length). Return first depth that fits.

    Two-pass ordering is critical for wrap-join scenarios where the
    SINGLE PDF line shares its first 12 chars with the JOINED rich line.
    Without the strict-first pass, depth=1 prefix-only would accept a
    short PDF line as the wrap target, then de-sync the rest of the walk
    (R-2 Pilot symptom: wrap-target absorbed as depth=1, next-line walker
    then tries to align the orphan continuation against the wrong rich
    line and the entire bridge walk fails).
    """
    n = len(col_lines)
    target_norm = normalize(target_text)
    max_depth = min(MAX_WRAP_DEPTH, n - start_idx)
    # Pass 1 — strict normalized equality, longest-acceptable wins
    # We still iterate ascending depth and return first equality match;
    # this is safe because the FIRST true equality at any depth is the
    # canonical bridge (longer concats that re-match a different target
    # are filtered by the outer walker's full-block validation).
    for depth in range(1, max_depth + 1):
        if depth == 1:
            if normalize(col_lines[start_idx]["text"]) == target_norm:
                return 1
        else:
            joined = " ".join(
                normalize(col_lines[start_idx + k]["text"]) for k in range(depth)
            )
            if joined == target_norm:
                return depth
    # Pass 2 — prefix tolerance with length-aware fence. Used for
    # typography drift (smart-quote vs straight, em-dash drift, etc).
    for depth in range(1, max_depth + 1):
        if depth == 1:
            cand = normalize(col_lines[start_idx]["text"])
        else:
            cand = " ".join(
                normalize(col_lines[start_idx + k]["text"]) for k in range(depth)
            )
        if (
            len(cand) >= PREFIX_MATCH_LEN
            and len(target_norm) >= PREFIX_MATCH_LEN
            and cand[:PREFIX_MATCH_LEN] == target_norm[:PREFIX_MATCH_LEN]
        ):
            tol = max(4, int(0.15 * max(len(cand), len(target_norm))))
            if abs(len(cand) - len(target_norm)) <= tol:
                return depth
    return None


def match_block_against_column(col_lines: list, block_lines: List[str]):
    """Walk col_lines from each candidate anchor and try to match all of
    block_lines, returning the (anchor_idx, per_rich_line_consumption) on
    first full match."""
    n_block = len(block_lines)
    if n_block == 0:
        return None
    anchor_text = block_lines[0]
    for start in range(len(col_lines)):
        if not line_matches(col_lines[start]["text"], anchor_text):
            continue
        # Try walking
        consumption: List[int] = []
        cursor = start
        ok = True
        for ri in range(n_block):
            target = block_lines[ri]
            depth = try_wrap_bridge(col_lines, cursor, target)
            if depth is None:
                ok = False
                break
            consumption.append(depth)
            cursor += depth
        if ok:
            return (start, consumption)
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", required=True)
    ap.add_argument(
        "--pages",
        required=True,
        help="comma-separated 0-based PDF page indices, e.g. '97' or '97,98'",
    )
    ap.add_argument(
        "--column",
        default="auto",
        choices=["left", "right", "auto"],
    )
    ap.add_argument(
        "--block-lines-json",
        required=True,
        help="path to JSON file containing array of rich block.lines[].spans[0].text",
    )
    ap.add_argument("--ref", default="")
    ap.add_argument(
        "--threshold-ratio",
        type=float,
        default=DEFAULT_THRESHOLD_RATIO,
    )
    args = ap.parse_args()

    pages = [int(p) for p in args.pages.split(",") if p.strip()]
    with open(args.block_lines_json, encoding="utf-8") as f:
        block_lines = json.load(f)

    col_lines = collect_column_lines(args.pdf, pages, args.column)
    result = match_block_against_column(col_lines, block_lines)
    if result is None:
        out = {
            "ref": args.ref,
            "matched": False,
            "matchedLines": 0,
            "expectedLines": len(block_lines),
            "pages": pages,
            "column": args.column,
            "error": "no anchor + full walk match; check first-line text or column",
        }
        print(json.dumps(out, ensure_ascii=False))
        sys.exit(2)

    anchor_idx, consumption = result
    # Build per-rich-line top-pairs: (first_pdf_top, last_pdf_top, pageIdx).
    # `first` is used for the rich-line's visual start; `last` is the top
    # of the LAST PDF physical line consumed by this rich-line — needed so
    # the next rich-line's gap is measured from the BOTTOM of the wrap-
    # joined line, not from its first PDF row (which would inflate gaps by
    # one line-spacing per wrap depth).
    first_tops: List[float] = []
    last_tops: List[float] = []
    line_pages: List[int] = []
    cursor = anchor_idx
    for depth in consumption:
        first_tops.append(col_lines[cursor]["top"])
        last_tops.append(col_lines[cursor + depth - 1]["top"])
        line_pages.append(col_lines[cursor]["pageIdx"])
        cursor += depth
    line_tops = first_tops  # back-compat export

    # Gaps — None for index 0; also None when the previous line was on a
    # different PDF page (cross-page gap is meaningless because tops are
    # page-local). For wrap-joined lines, gap[i] = first_tops[i] -
    # last_tops[i-1] (BOTTOM-to-TOP, not TOP-to-TOP) — see comment above.
    gaps: List[Optional[float]] = [None] * len(first_tops)
    cross_page_indices: List[int] = []
    for i in range(1, len(first_tops)):
        if line_pages[i] == line_pages[i - 1]:
            gaps[i] = round(first_tops[i] - last_tops[i - 1], 2)
        else:
            gaps[i] = None
            cross_page_indices.append(i)

    finite_gaps = [g for g in gaps if g is not None]
    med = round(median(finite_gaps), 2) if finite_gaps else 0.0
    threshold_pt = round(med * args.threshold_ratio, 2)
    stanza_pt = round(med * STANZA_RATIO, 2)

    paragraph_boundaries: List[int] = []
    stanza_break_warnings: List[dict] = []
    for i, g in enumerate(gaps):
        if g is None or med == 0:
            continue
        if g >= med * STANZA_RATIO:
            stanza_break_warnings.append({"index": i, "gap": g})
            # Still mark as paragraph (a stanza-internal stanza-level gap
            # means the rich block coarsens what the PDF separated)
            paragraph_boundaries.append(i)
        elif g >= med * args.threshold_ratio:
            paragraph_boundaries.append(i)

    out = {
        "ref": args.ref,
        "matched": True,
        "matchedLines": len(line_tops),
        "expectedLines": len(block_lines),
        "pages": pages,
        "column": args.column,
        "medianGap": med,
        "thresholdRatio": args.threshold_ratio,
        "thresholdPt": threshold_pt,
        "stanzaPt": stanza_pt,
        "lineTops": line_tops,
        "linePages": line_pages,
        "gaps": gaps,
        "consumption": consumption,
        "anchorColLineIdx": anchor_idx,
        "paragraphBoundaries": paragraph_boundaries,
        "stanzaBreakWarnings": stanza_break_warnings,
        "crossPageGapIndices": cross_page_indices,
    }
    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
