#!/usr/bin/env python3
"""Reproduce shard C of the g-51 geometry-first truncation sweep.

This is deliberately a read-only detector.  It enumerates the frozen shard-C
addresses, reconstructs book-page reading order from PDF glyph coordinates,
applies the coordinator's exact address+value-hash KEEP ledger, and writes one
terminal row per address.  It never edits source data.

Run from the repository root:

    python3 docs/research/51-truncation-sweep/scan-shard-c.py
"""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass
from functools import cached_property, lru_cache
from pathlib import Path
from typing import Any, Iterable

import pdfplumber


ROOT = Path.cwd()
OUT_DIR = ROOT / "docs/research/51-truncation-sweep"
RESULTS_OUT = OUT_DIR / "shard-C-results.jsonl"
SOURCE_TEXT = Path("/home/min/myproject/divineoffice/parsed_data/full_pdf.txt")
PDF = ROOT / "public/psalter.pdf"
KEEP_LEDGER = Path(
    "/home/min/myproject/divineoffice/docs/research/51-truncation-sweep/"
    "intentional-divergences.jsonl"
)

SHARD_ROOTS = (
    ROOT / "src/data/loth/propers",
    ROOT / "src/data/loth/psalter",
    ROOT / "src/data/loth/sanctoral",
    ROOT / "src/data/loth/prayers/commons/compline",
)

EXPECTED_AREAS = {
    "src/data/loth/propers": 2265,
    "src/data/loth/psalter": 2051,
    "src/data/loth/sanctoral": 168,
    "src/data/loth/prayers/commons/compline": 42,
}
EXPECTED_TOTAL = 4526
EXPECTED_HEAD = "52a8d02b50d4bc5374b9987bd89eb1bf2c2e234d"
EXPECTED_SOURCE_SHA = "f12f6135556f77df75593d2627ec2642ec6113c2a56f52b26102653580c1b330"
EXPECTED_PDF_SHA = "fa0397e9674745f2dc740094eb53f4a367740f6b55d50e1edcf8970972fc3fcd"
EXPECTED_LOTH_ADDRESS_SHA = "1aabb72bdbd92157854e6a7df3f985e7b0ac981be8bc54c8223e8b0bc51a8a10"
EXPECTED_SHARD_ADDRESS_SHA = "283e83ca9c46a0d3c5186dc410d9befffcb9ab52e2630ab62a2acd57a1eb1c0d"
EXPECTED_SHARD_CONTENT_SHA = "f4b386fd9c652802de155db6b7571b2d5c57b4c9df2c931c044dc698b9124e50"

ADJUDICATED_DIVERGENCES = {
    "src/data/loth/propers/advent.json#/weeks/1/SUN/lauds/responsory/versicle": {
        "page": 552,
        "pdf_visual": "running header: Ирэлтийн цаг улирал | versicle: Та ирэх ёстой Нэгэн мөн.",
        "rationale": (
            "Stored scalar prepends the page running header to the real versicle. This is contrary "
            "header contamination, not strict-prefix loss."
        ),
    },
    "src/data/loth/psalter/week-2.json#/days/WED/lauds/intercessions/6": {
        "page": 234,
        "pdf_visual": (
            "book 234: Эзэн минь энэ өдрийн турш Та бидэнтэй хамт байгаарай. | "
            "book 235: - Таны хишиг ивээл хэзээ ч жаргадаггүй нар минь байх болтугай."
        ),
        "rationale": (
            "Stored scalar joins the end of book page 234 to a distinct response on book page 235; "
            "this is cross-page contamination/reorder, not strict-prefix loss."
        ),
    },
    "src/data/loth/psalter/week-3.json#/days/MON/lauds/intercessions/13": {
        "page": 320,
        "pdf_visual": (
            "book 320: Өдөр тутмын ажлаа эхэлж буй биднийг Та таалан болгооно уу. | "
            "book 321: - Бид Таны хамтран ажиллагчид байх болтугай."
        ),
        "rationale": (
            "Stored scalar joins separate visual units across the 320/321 spread boundary; contrary "
            "content precedes the second fragment, so the truncation signature fails."
        ),
    },
    "src/data/loth/psalter/week-3.json#/days/THU/lauds/psalms/1/title": {
        "page": 361,
        "pdf_visual": "Сайн хоньчnн бол дээдийн дээд бөгөөд туйлын билиг ухаантай Тэнгэрбурхан мөн",
        "rationale": (
            "The localized PDF title contains mixed-script хоньчnн while data has Хоньчин; this is a "
            "character substitution/correction, not suffix truncation."
        ),
    },
    "src/data/loth/sanctoral/memorials.json#/deceased/name": {
        "page": 844,
        "pdf_visual": "Талийгаач бологсдын төлөөх хурал",
        "rationale": (
            "The localized PDF heading has Талийгаач while data has Талийгааг; this is a final-character "
            "substitution, not strict-prefix loss."
        ),
    },
}

CYRILLIC = re.compile(r"[\u0400-\u052f]")
GCA = re.compile(r"^gospelCanticleAntiphon(?:Rich|Candidates|Rubric)?$")
WS = re.compile(r"\s+")
TOP_EPS = 1.5
COLUMN_BOUNDARY = 297.0
TYPOGRAPHY_TRANSLATION = str.maketrans(
    {
        "“": '"',
        "”": '"',
        "„": '"',
        "‘": "'",
        "’": "'",
        "—": "-",
        "–": "-",
        "−": "-",
        "…": "...",
    }
)

ANCHOR_KEYS = {
    "ref",
    "title",
    "titleMn",
    "heading",
    "name",
    "label",
    "day",
    "hour",
    "id",
    "antiphon_key",
    "rubricId",
    "redirectId",
}

METADATA_KEYS = {"liturgicalBasis", "liturgical_basis", "note", "$comment", "_doc"}


@dataclass
class Scalar:
    rel: str
    pointer: str
    value: str
    leaf_key: str
    path: tuple[Any, ...]
    ancestors: tuple[dict[str, Any], ...]

    @property
    def address(self) -> str:
        return f"{self.rel}#{self.pointer}"

    @property
    def value_sha256(self) -> str:
        return sha_text(self.value)


@dataclass
class BookPage:
    book_page: int
    physical_page: int
    column: str
    raw_lines: list[str]
    comparison_lines: list[str]

    @cached_property
    def raw(self) -> str:
        return "\n".join(self.raw_lines)

    @cached_property
    def visual(self) -> str:
        return collapse_ws(" ".join(self.comparison_lines))

    @cached_property
    def typography_view(self) -> tuple[str, tuple[int, ...]]:
        return normalize_with_map(self.visual, strip_whitespace=False)

    @cached_property
    def normalized(self) -> str:
        return self.typography_view[0]

    @cached_property
    def whitespace_view(self) -> tuple[str, tuple[int, ...]]:
        return normalize_with_map(self.visual, strip_whitespace=True)

    @cached_property
    def whitespace_key(self) -> str:
        return self.whitespace_view[0]


def sha_bytes(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sha_text(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def escape_pointer(value: Any) -> str:
    return str(value).replace("~", "~0").replace("/", "~1")


def pointer(parts: Iterable[Any]) -> str:
    return "/" + "/".join(escape_pointer(part) for part in parts)


def collapse_ws(value: str) -> str:
    return WS.sub(" ", value.strip())


def normalize_with_map(
    value: str,
    *,
    strip_whitespace: bool,
) -> tuple[str, tuple[int, ...]]:
    """Return the tier comparison string plus output->original offsets."""
    output: list[str] = []
    offsets: list[int] = []
    for original_index, original_char in enumerate(value):
        transformed = unicodedata.normalize("NFKC", original_char).translate(
            TYPOGRAPHY_TRANSLATION
        )
        for char in transformed:
            if strip_whitespace and char.isspace():
                continue
            output.append(char)
            offsets.append(original_index)
    return "".join(output), tuple(offsets)


def normalize_typography_only(value: str) -> str:
    return normalize_with_map(value, strip_whitespace=False)[0]


def normalize_typography(value: str) -> str:
    return collapse_ws(normalize_typography_only(value))


def strip_ws(value: str) -> str:
    return "".join(value.split())


def area_for(rel: str) -> str:
    parts = rel.split("/")
    if parts[:4] == ["src", "data", "loth", "propers"]:
        return "src/data/loth/propers"
    if parts[:4] == ["src", "data", "loth", "psalter"]:
        return "src/data/loth/psalter"
    if parts[:4] == ["src", "data", "loth", "sanctoral"]:
        return "src/data/loth/sanctoral"
    return "src/data/loth/prayers/commons/compline"


def iter_json_files(root: Path) -> Iterable[Path]:
    yield from sorted(path for path in root.rglob("*.json") if path.is_file())


def enumerate_scalars(files: Iterable[Path], exclude_gca: bool = True) -> list[Scalar]:
    rows: list[Scalar] = []

    def visit(
        value: Any,
        rel: str,
        parts: tuple[Any, ...],
        ancestors: tuple[dict[str, Any], ...],
    ) -> None:
        if isinstance(value, str):
            if not CYRILLIC.search(value):
                return
            if exclude_gca and any(isinstance(part, str) and GCA.match(part) for part in parts):
                return
            leaf = next((part for part in reversed(parts) if isinstance(part, str)), "(root)")
            rows.append(Scalar(rel, pointer(parts), value, leaf, parts, ancestors))
            return
        if isinstance(value, list):
            for index, item in enumerate(value):
                visit(item, rel, (*parts, index), ancestors)
            return
        if isinstance(value, dict):
            next_ancestors = (*ancestors, value)
            for key, item in value.items():
                visit(item, rel, (*parts, key), next_ancestors)

    for file_path in files:
        rel = file_path.relative_to(ROOT).as_posix()
        value = json.loads(file_path.read_text())
        visit(value, rel, (), ())
    return rows


def all_loth_scalars() -> list[Scalar]:
    files = sorted((ROOT / "src/data/loth").rglob("*.json"))
    return enumerate_scalars(files, exclude_gca=False)


def cluster_lines(chars: list[dict[str, Any]]) -> list[tuple[float, str]]:
    if not chars:
        return []
    chars = sorted(chars, key=lambda char: (char["top"], char["x0"]))
    lines: list[tuple[float, str]] = []
    current_top: float | None = None
    current: list[dict[str, Any]] = []
    for char in chars:
        if current_top is None or abs(char["top"] - current_top) <= TOP_EPS:
            current_top = char["top"] if current_top is None else current_top
            current.append(char)
        else:
            text = "".join(item["text"] for item in sorted(current, key=lambda item: item["x0"]))
            if text.strip():
                lines.append((current_top, text))
            current_top = char["top"]
            current = [char]
    if current:
        text = "".join(item["text"] for item in sorted(current, key=lambda item: item["x0"]))
        if text.strip():
            lines.append((current_top if current_top is not None else 0.0, text))
    return lines


def is_running_header(top: float, text: str, book_page: int) -> bool:
    compact = collapse_ws(text)
    if not compact:
        return True
    if re.fullmatch(r"\d{1,4}", compact):
        return True
    if top <= 36 and re.match(rf"^(?:{book_page}\s+.+|.+\s+{book_page})$", compact):
        return True
    return False


def geometry_pages() -> dict[int, BookPage]:
    result: dict[int, BookPage] = {}
    with pdfplumber.open(PDF) as pdf:
        for physical_index, page in enumerate(pdf.pages):
            columns: list[tuple[str, int, list[dict[str, Any]]]]
            if page.width < COLUMN_BOUNDARY + 50:
                columns = [("single", 0 if physical_index == 0 else physical_index * 2, page.chars)]
            else:
                columns = [
                    ("left", physical_index * 2, [c for c in page.chars if c["x0"] < COLUMN_BOUNDARY]),
                    ("right", physical_index * 2 + 1, [c for c in page.chars if c["x0"] >= COLUMN_BOUNDARY]),
                ]
            for column, book_page, chars in columns:
                lines = cluster_lines(chars)
                raw_lines = [text for _, text in lines]
                comparison = [
                    text for top, text in lines if not is_running_header(top, text, book_page)
                ]
                result[book_page] = BookPage(
                    book_page=book_page,
                    physical_page=physical_index + 1,
                    column=column,
                    raw_lines=raw_lines,
                    comparison_lines=comparison,
                )
    return result


def page_hints(row: Scalar) -> list[int]:
    hints: list[int] = []
    key = row.leaf_key
    companion_keys = {"page", f"{key}Page"}
    if key == "text" and "shortReading" in row.path:
        companion_keys.add("shortReadingPage")
    if key in {"fullResponse", "versicle", "shortResponse"}:
        companion_keys.add("responsoryPage")
    if "intercessions" in row.path:
        companion_keys.add("intercessionsPage")
    if key in {"default_antiphon", "title"}:
        companion_keys |= {"antiphonPage"}
    for ancestor in reversed(row.ancestors):
        for name, value in ancestor.items():
            if name in companion_keys and isinstance(value, int) and 0 <= value <= 2000:
                hints.append(value)
        if hints:
            break
    if not hints:
        for ancestor in reversed(row.ancestors):
            for name, value in ancestor.items():
                if name.lower().endswith("page") and isinstance(value, int) and 0 <= value <= 2000:
                    hints.append(value)
            if hints:
                break
    return list(dict.fromkeys(hints))


def anchors_for(row: Scalar) -> list[str]:
    anchors: list[str] = []
    for ancestor in reversed(row.ancestors):
        for key, value in ancestor.items():
            if key in ANCHOR_KEYS and isinstance(value, str) and value != row.value:
                anchors.append(collapse_ws(value))
        if len(anchors) >= 3:
            break
    structural = [str(part) for part in row.path if isinstance(part, (str, int))]
    if structural:
        anchors.append("/".join(structural[:6]))
    return list(dict.fromkeys(anchors))[:5]


def load_keep_ledger() -> dict[tuple[str, str], dict[str, Any]]:
    ledger: dict[tuple[str, str], dict[str, Any]] = {}
    for line in KEEP_LEDGER.read_text().splitlines():
        if not line.strip():
            continue
        entry = json.loads(line)
        ledger[(entry["address"], entry["value_sha256"])] = entry
    return ledger


def field_family(row: Scalar) -> str:
    for family in (
        "shortReading",
        "responsory",
        "intercessions",
        "concludingPrayer",
        "alternativeConcludingPrayer",
        "psalmPrayer",
        "seasonal_antiphons",
        "default_antiphon",
        "conditionalRubrics",
        "pageRedirects",
    ):
        if family in row.path:
            return family
    return row.leaf_key


def is_metadata(row: Scalar) -> bool:
    if row.leaf_key in METADATA_KEYS:
        return True
    # These `ref` values are internal English scripture identifiers whose
    # only Cyrillic character is the verse suffix (for example 1:2б-6).
    # They are not the Mongolian source label printed by the PDF.
    if row.leaf_key == "ref" and re.search(r"[A-Za-z]", row.value):
        return True
    # The bracketed general-norm paragraphs document a curator inference;
    # unlike ordinary evidencePdf.text leaves, they are not PDF quotations.
    if (
        "conditionalRubrics" in row.path
        and row.leaf_key == "text"
        and row.value.startswith("[Ерөнхий хэм хэмжээ]")
    ):
        return True
    return False


def search_tokens(value: str) -> list[str]:
    return [token for token in re.findall(r"[\w\u0400-\u052f]+", value.lower()) if len(token) >= 2]


def find_match(
    row: Scalar,
    pages: dict[int, BookPage],
    token_pages: dict[str, set[int]],
) -> dict[str, Any] | None:
    literal = row.value
    normalized = normalize_typography_only(row.value)
    whitespace = normalize_with_map(row.value, strip_whitespace=True)[0]
    hints = page_hints(row)
    hinted = [page for hint in hints for page in (hint, hint - 1, hint + 1) if page in pages]
    tokens = search_tokens(normalized)
    global_candidates = sorted(token_pages.get(tokens[0], set(pages))) if tokens else sorted(pages)
    order = list(dict.fromkeys(hinted + global_candidates))

    tiers = ("literal", "typography", "whitespace")
    for book_page in order:
        page = pages[book_page]
        for tier in tiers:
            if tier == "literal":
                needle, haystack, offsets = literal, page.visual, None
            elif tier == "typography":
                needle, haystack, offsets = normalized, page.typography_view[0], page.typography_view[1]
            else:
                needle, haystack, offsets = whitespace, page.whitespace_view[0], page.whitespace_view[1]
            if not needle:
                continue
            index = haystack.find(needle)
            if index >= 0:
                if offsets is None:
                    visual_start = index
                    visual_end = index + len(needle)
                else:
                    visual_start = offsets[index]
                    visual_end = offsets[index + len(needle) - 1] + 1
                return {
                    "tier": tier,
                    "book_page": book_page,
                    "index": index,
                    "needle": needle,
                    "haystack": haystack,
                    "hinted": book_page in hinted,
                    "visual_match": page.visual[visual_start:visual_end],
                    "visual_context": excerpt(page.visual, visual_start, visual_end - visual_start, 60),
                }
    return None


def anchor_candidate(
    row: Scalar,
    pages: dict[int, BookPage],
    token_pages: dict[str, set[int]],
) -> dict[str, Any] | None:
    target = normalize_typography(row.value)
    if len(target) < 12:
        return None
    hints = page_hints(row)
    target_tokens = search_tokens(target)
    global_candidates = sorted(token_pages.get(target_tokens[0], set(pages))) if target_tokens else sorted(pages)
    order = list(
        dict.fromkeys(
            [p for h in hints for p in (h, h - 1, h + 1) if p in pages] + global_candidates
        )
    )
    tokens = [token for token in re.split(r"\W+", target) if len(token) >= 5]
    probes = []
    if len(target) >= 18:
        probes.append(target[:18])
    probes.extend(tokens[:2])
    for book_page in order:
        haystack = pages[book_page].normalized
        hits = [probe for probe in probes if probe and probe in haystack]
        if len(hits) >= 2 or (hits and len(probes) == 1):
            start = haystack.find(hits[0])
            return {
                "book_page": book_page,
                "index": start,
                "hits": hits,
                "haystack": haystack,
                "hinted": book_page in hints,
            }
    return None


def excerpt(value: str, start: int, length: int, flank: int = 100) -> str:
    lo = max(0, start - flank)
    hi = min(len(value), start + length + flank)
    return value[lo:hi]


def raw_source_evidence(
    source_collapsed: str,
    source_normalized: str,
    value: str,
) -> dict[str, Any]:
    needle = collapse_ws(value)
    index = source_collapsed.find(needle)
    if index < 0:
        normalized_needle = normalize_typography(value)
        index = source_normalized.find(normalized_needle)
        if index < 0:
            return {
                "exact": False,
                "excerpt": "[not contiguous in raw interleaved text SoT]",
            }
        return {
            "exact": True,
            "excerpt": excerpt(source_normalized, index, len(normalized_needle), 80),
        }
    return {
        "exact": True,
        "excerpt": excerpt(source_collapsed, index, len(needle), 80),
    }


def opposite_twin_candidates(
    row: Scalar,
    twin_index: dict[str, list[Scalar]],
) -> list[str]:
    norm = normalize_typography(row.value)
    row_rich = row.rel.endswith(".rich.json") or any(
        isinstance(part, str) and part.lower().endswith("rich") for part in row.path
    )

    if row.rel.startswith("src/data/loth/propers/"):
        relevant = "src/data/loth/prayers/seasonal/"
    elif row.rel.startswith("src/data/loth/psalter/"):
        relevant = "src/data/loth/prayers/commons/psalter/"
    elif row.rel.startswith("src/data/loth/prayers/commons/compline/"):
        relevant = "src/data/loth/ordinarium/compline.json"
    else:
        return []

    candidates: list[tuple[int, str]] = []
    row_tokens = set(re.findall(r"[A-Za-z0-9]+", row.address.lower()))
    for candidate in twin_index.get(norm, []):
        if relevant not in candidate.rel:
            continue
        candidate_rich = candidate.rel.endswith(".rich.json") or any(
            isinstance(part, str) and part.lower().endswith("rich") for part in candidate.path
        )
        if row_rich == candidate_rich:
            continue
        candidate_tokens = set(re.findall(r"[A-Za-z0-9]+", candidate.address.lower()))
        score = 10 + len(row_tokens & candidate_tokens)
        candidates.append((score, candidate.address))
    if not candidates:
        return []
    candidates.sort(key=lambda item: (-item[0], item[1]))
    best = candidates[0][0]
    return [address for score, address in candidates if score >= best - 1][:16]


@lru_cache(maxsize=None)
def load_json_cached(path: str) -> Any:
    return json.loads(Path(path).read_text())


def overlay_container_twin(row: Scalar) -> list[str]:
    parts = list(row.path)
    expected_files: list[Path] = []
    family = field_family(row)
    rich_key = {
        "shortReading": "shortReadingRich",
        "responsory": "responsoryRich",
        "intercessions": "intercessionsRich",
        "concludingPrayer": "concludingPrayerRich",
        "alternativeConcludingPrayer": "alternativeConcludingPrayerRich",
    }.get(family)
    if not rich_key:
        return []

    if row.rel.startswith("src/data/loth/propers/") and "weeks" in parts:
        index = parts.index("weeks")
        if len(parts) >= index + 4:
            week, day, hour = parts[index + 1 : index + 4]
            season = Path(row.rel).stem
            directory = ROOT / "src/data/loth/prayers/seasonal" / season
            expected_files = sorted(directory.glob(f"w{week}-{day}-{hour}*.rich.json"))
    elif row.rel.startswith("src/data/loth/psalter/") and "days" in parts:
        index = parts.index("days")
        if len(parts) >= index + 3:
            day, hour = parts[index + 1 : index + 3]
            week_match = re.search(r"week-(\d+)", row.rel)
            if week_match:
                directory = ROOT / "src/data/loth/prayers/commons/psalter"
                expected_files = sorted(directory.glob(f"w{week_match.group(1)}-{day}-{hour}.rich.json"))

    links = []
    value = normalize_typography(row.value)
    for file_path in expected_files:
        doc = load_json_cached(str(file_path))
        container = doc.get(rich_key)
        if not isinstance(container, dict):
            continue
        pieces: list[str] = []

        def gather(item: Any, current_key: str = "") -> None:
            if isinstance(item, str) and current_key == "text":
                pieces.append(item)
            elif isinstance(item, list):
                for child in item:
                    gather(child, current_key)
            elif isinstance(item, dict):
                for key, child in item.items():
                    if key != "source":
                        gather(child, key)

        gather(container)
        flattened = normalize_typography(" ".join(pieces))
        if value and (value in flattened or (len(flattened) >= 12 and flattened in value)):
            rel = file_path.relative_to(ROOT).as_posix()
            links.append(f"{rel}#/{rich_key}")
    return links


def gate_packet(disposition: str, matched: bool, twin_addresses: list[str], human_note: str) -> dict[str, Any]:
    clear = disposition == "CLEAR_TRUNCATION"
    return {
        "identity": clear,
        "visual_order": matched,
        "strict_prefix_loss": clear,
        "positive_tail": clear,
        "boundary_proof": clear,
        "no_contrary_content": clear,
        "no_exact_keep": disposition != "KEEP_RULED",
        "twin_confirmation": bool(twin_addresses) if clear else None,
        "human_evidence": clear,
        "verdict": "PASS" if clear else "NOT_CLEAR_TRUNCATION",
        "note": human_note,
    }


def make_row(
    row: Scalar,
    pages: dict[int, BookPage],
    source_collapsed: str,
    source_normalized: str,
    keep: dict[tuple[str, str], dict[str, Any]],
    twin_index: dict[str, list[Scalar]],
    token_pages: dict[str, set[int]],
) -> dict[str, Any]:
    hints = page_hints(row)
    anchors = anchors_for(row)
    twins = list(
        dict.fromkeys(opposite_twin_candidates(row, twin_index) + overlay_container_twin(row))
    )
    keep_entry = keep.get((row.address, row.value_sha256))
    manual_divergence = ADJUDICATED_DIVERGENCES.get(row.address)
    match = find_match(row, pages, token_pages)
    candidate = None if match else anchor_candidate(row, pages, token_pages)
    raw_source = raw_source_evidence(source_collapsed, source_normalized, row.value)
    raw_exact = raw_source["exact"]

    comparison_tier = "none"
    book_page: int | None = hints[0] if hints else None
    pdf_visual = ""
    pdf_visual_context = ""
    pdf_raw = ""
    omitted_tail = ""
    rationale = ""

    if keep_entry:
        disposition = "KEEP_RULED"
        comparison_tier = match["tier"] if match else "whitelist"
        if match:
            book_page = match["book_page"]
            pdf_visual = match["visual_match"]
            pdf_visual_context = match["visual_context"]
        rationale = (
            f"Exact coordinator ruling {keep_entry['reason_code']} applied by address and value hash; "
            "no phrase-global suppression."
        )
    elif is_metadata(row):
        disposition = "NOT_APPLICABLE_METADATA"
        rationale = "Curator/runtime provenance prose, not a PDF-authored content claim."
    elif manual_divergence:
        disposition = "REVIEW_DIVERGENCE"
        comparison_tier = "manual-geometry"
        book_page = manual_divergence["page"]
        pdf_visual = manual_divergence["pdf_visual"]
        pdf_visual_context = pdf_visual
        rationale = manual_divergence["rationale"]
    elif match:
        disposition = "MATCH_LITERAL" if match["tier"] == "literal" else "MATCH_NORMALIZED"
        comparison_tier = match["tier"]
        book_page = match["book_page"]
        pdf_visual = match["visual_match"]
        pdf_visual_context = match["visual_context"]
        rationale = (
            "Value occurs in geometry-reconstructed book-page reading order"
            + (" at a supplied page hint." if match["hinted"] else ".")
        )
    elif raw_exact:
        disposition = "REVIEW_GEOMETRY"
        comparison_tier = "raw-sot-only"
        if candidate:
            book_page = candidate["book_page"]
            pdf_visual = excerpt(candidate["haystack"], candidate["index"], 120, 80)
            pdf_visual_context = pdf_visual
        rationale = (
            "The wording is exact in the raw text SoT, but styled/baseline glyph ordering prevents "
            "a geometry-reconstructed equality proof; raw substring evidence was not promoted to MATCH."
        )
    elif candidate:
        disposition = "REVIEW_DIVERGENCE"
        book_page = candidate["book_page"]
        comparison_tier = "anchored"
        pdf_visual = excerpt(candidate["haystack"], candidate["index"], 120, 80)
        pdf_visual_context = pdf_visual
        pdf_raw = pages[book_page].raw
        rationale = (
            "At least two independent target-derived anchors localize a geometry page, but strict "
            "equality fails; substitution/reorder/translation review is required."
        )
    elif hints and not any(hint in pages for hint in hints):
        disposition = "REVIEW_GEOMETRY"
        rationale = "Supplied book-page identity lies outside the tracked geometry corpus."
    else:
        disposition = "SOURCE_NOT_FOUND"
        rationale = (
            "No literal/allowed-normalized match and no sufficiently anchored geometry candidate; "
            "raw substring failure was not used as the verdict."
        )

    if disposition != "NOT_APPLICABLE_METADATA":
        pdf_raw = raw_source["excerpt"]
    if not pdf_visual and book_page in pages and disposition != "NOT_APPLICABLE_METADATA":
        pdf_visual = collapse_ws(pages[book_page].visual[:260])
        pdf_visual_context = pdf_visual

    if disposition == "MATCH_LITERAL" and row.value != pdf_visual:
        raise RuntimeError(f"untruthful literal tier: {row.address}")
    if disposition == "MATCH_NORMALIZED":
        if row.value == pdf_visual:
            raise RuntimeError(f"byte-equal normalized tier: {row.address}")
        if comparison_tier == "typography":
            if normalize_typography_only(row.value) != normalize_typography_only(pdf_visual):
                raise RuntimeError(f"untruthful typography tier: {row.address}")
        elif comparison_tier == "whitespace":
            left = normalize_with_map(row.value, strip_whitespace=True)[0]
            right = normalize_with_map(pdf_visual, strip_whitespace=True)[0]
            if left != right:
                raise RuntimeError(f"untruthful whitespace tier: {row.address}")
        else:
            raise RuntimeError(f"unknown normalized tier: {row.address}")

    human_note = (
        "Strict prefix loss and a bounded omitted tail were not established."
        if disposition != "CLEAR_TRUNCATION"
        else "All nine gates were independently evidenced."
    )
    return {
        "address": row.address,
        "value_sha256": row.value_sha256,
        "shard": "C",
        "area": area_for(row.rel),
        "field_family": field_family(row),
        "page": book_page,
        "page_hints": hints,
        "anchors": anchors,
        "comparison_tier": comparison_tier,
        "disposition": disposition,
        "evidence": {
            "data": row.value,
            "pdf_raw": pdf_raw,
            "pdf_visual": pdf_visual,
            "pdf_visual_context": pdf_visual_context,
            "omitted_tail": omitted_tail,
            "rationale": rationale,
        },
        "twin_addresses": twins,
        "clear_truncation_gates": gate_packet(
            disposition,
            bool(match) or bool(manual_divergence),
            twins,
            human_note,
        ),
        "reviewer": "dvo-sol-co",
    }


def verify_freeze(rows: list[Scalar]) -> None:
    changed_data = subprocess.check_output(
        [
            "git",
            "diff",
            "--name-only",
            EXPECTED_HEAD,
            "--",
            "src/data/loth/propers",
            "src/data/loth/psalter",
            "src/data/loth/sanctoral",
            "src/data/loth/prayers/commons/compline",
            "src/data/loth/prayers/seasonal",
            "src/data/loth/prayers/commons/psalter",
            "src/data/loth/ordinarium/compline.json",
            "public/psalter.pdf",
        ],
        text=True,
    ).strip()
    if changed_data:
        raise SystemExit(f"data drift since {EXPECTED_HEAD}: {changed_data}")
    if sha_bytes(SOURCE_TEXT) != EXPECTED_SOURCE_SHA:
        raise SystemExit("full_pdf.txt hash drift")
    if sha_bytes(PDF) != EXPECTED_PDF_SHA:
        raise SystemExit("public/psalter.pdf hash drift")
    if len(rows) != EXPECTED_TOTAL:
        raise SystemExit(f"shard count drift: {len(rows)} != {EXPECTED_TOTAL}")
    counts = Counter(area_for(row.rel) for row in rows)
    if dict(counts) != EXPECTED_AREAS:
        raise SystemExit(f"area count drift: {dict(counts)} != {EXPECTED_AREAS}")
    addresses = "\n".join(sorted(row.address for row in rows))
    contents = "\n".join(sorted(f"{row.address}\t{row.value}" for row in rows))
    if len(set(row.address for row in rows)) != EXPECTED_TOTAL:
        raise SystemExit("duplicate shard address")
    shard_sha = sha_text(addresses)
    content_sha = sha_text(contents)
    if shard_sha != EXPECTED_SHARD_ADDRESS_SHA:
        raise SystemExit(f"shard address drift: {shard_sha} != {EXPECTED_SHARD_ADDRESS_SHA}")
    if content_sha != EXPECTED_SHARD_CONTENT_SHA:
        raise SystemExit(f"shard content drift: {content_sha} != {EXPECTED_SHARD_CONTENT_SHA}")
    print(f"shard_address_sha256={shard_sha}")
    print(f"shard_content_sha256={content_sha}")


def main() -> None:
    shard_files = [file_path for root in SHARD_ROOTS for file_path in iter_json_files(root)]
    rows = enumerate_scalars(shard_files)
    verify_freeze(rows)
    print(f"frozen_loth_address_sha256={EXPECTED_LOTH_ADDRESS_SHA}")
    print("extracting geometry...")
    pages = geometry_pages()
    token_pages: dict[str, set[int]] = defaultdict(set)
    for book_page, page in pages.items():
        for token in set(search_tokens(page.normalized)):
            token_pages[token].add(book_page)
    source_collapsed = collapse_ws(SOURCE_TEXT.read_text())
    source_normalized = normalize_typography(source_collapsed)
    keep = load_keep_ledger()
    all_rows = all_loth_scalars()
    twin_index: dict[str, list[Scalar]] = defaultdict(list)
    for row in all_rows:
        twin_index[normalize_typography(row.value)].append(row)
    print(f"book_page_streams={len(pages)} keep_rows={len(keep)} all_loth_scalars={len(all_rows)}")
    results = [
        make_row(
            row,
            pages,
            source_collapsed,
            source_normalized,
            keep,
            twin_index,
            token_pages,
        )
        for row in rows
    ]
    RESULTS_OUT.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in results))
    dispositions = Counter(row["disposition"] for row in results)
    twin_rows = sum(bool(row["twin_addresses"]) for row in results)
    print(f"results={RESULTS_OUT}")
    print(f"dispositions={dict(sorted(dispositions.items()))}")
    print(f"twin_linked_rows={twin_rows}")


if __name__ == "__main__":
    main()
