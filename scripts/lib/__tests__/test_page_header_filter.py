"""F-X16 (#508) — page-header filter pattern coverage (Python mirror).

Mirror of scripts/dev/__tests__/page-header-filter.test.mjs. Both files
MUST stay in sync — the Node + Python implementations are kept
structurally identical (see scripts/dev/page-header-filter.mjs and
scripts/lib/extract-paragraphs-from-pdf.py module headers).

The extractor module name has hyphens (not a valid Python identifier),
so we load it via importlib.util.spec_from_file_location.

Run: pytest scripts/lib/__tests__/test_page_header_filter.py
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
EXTRACTOR_PATH = REPO_ROOT / "scripts" / "lib" / "extract-paragraphs-from-pdf.py"


def _load_extractor():
    spec = importlib.util.spec_from_file_location(
        "extract_paragraphs_from_pdf", str(EXTRACTOR_PATH)
    )
    assert spec is not None and spec.loader is not None, (
        f"Could not load spec for {EXTRACTOR_PATH}"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture(scope="module")
def filter_mod():
    return _load_extractor()


# --- A-1: Compline section header literal -------------------------------

class TestA1ComplineSectionHeader:
    def test_pass_bare_literal(self, filter_mod):
        assert filter_mod.is_page_header_line("Шөнийн даатгал залбирал") is True

    def test_pass_leading_trailing_whitespace(self, filter_mod):
        assert filter_mod.is_page_header_line("   Шөнийн даатгал залбирал   ") is True

    def test_pass_extra_inner_whitespace(self, filter_mod):
        # PDF column spacing sometimes inflates inner spaces.
        assert filter_mod.is_page_header_line("Шөнийн   даатгал   залбирал") is True

    def test_fail_confounding_body_sentence(self, filter_mod):
        # Body verse that happens to start with the section title — must
        # remain visible (parallel to existing 'Магтаалыг өргөгтүн' case).
        assert filter_mod.is_page_header_line("Шөнийн даатгал залбирал нь сайн юм") is False


# --- A-2: bare nominative weekday header -------------------------------

class TestA2BareWeekday:
    def test_pass_baasan(self, filter_mod):
        assert filter_mod.is_page_header_line("Баасан гараг") is True

    def test_pass_byamba(self, filter_mod):
        assert filter_mod.is_page_header_line("Бямба гараг") is True

    def test_pass_all_seven_weekdays(self, filter_mod):
        weekdays = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"]
        for wd in weekdays:
            assert filter_mod.is_page_header_line(f"{wd} гараг") is True, wd

    def test_fail_locative_inflection(self, filter_mod):
        # 'гарагт' (locative) ≠ 'гараг' (nominative). The end-anchor must
        # reject inflected forms so body text like "Баасан гарагт болсон"
        # survives.
        assert filter_mod.is_page_header_line("Баасан гарагт") is False

    def test_fail_weekday_alone(self, filter_mod):
        assert filter_mod.is_page_header_line("Баасан") is False


# --- A-3: uppercase weekday header (IGNORECASE flag) -------------------

class TestA3UppercaseWeekday:
    def test_pass_baasan_caps(self, filter_mod):
        assert filter_mod.is_page_header_line("БААСАН ГАРАГ") is True

    def test_pass_nyam_caps(self, filter_mod):
        assert filter_mod.is_page_header_line("НЯМ ГАРАГ") is True

    def test_pass_all_seven_caps(self, filter_mod):
        weekdays_caps = ["НЯМ", "ДАВАА", "МЯГМАР", "ЛХАГВА", "ПҮРЭВ", "БААСАН", "БЯМБА"]
        for wd in weekdays_caps:
            assert filter_mod.is_page_header_line(f"{wd} ГАРАГ") is True, wd


# --- A-4: ordinal week label (page-less) -------------------------------

class TestA4OrdinalWeekLabel:
    def test_pass_first_week(self, filter_mod):
        assert filter_mod.is_page_header_line("Эхний Долоо хоног") is True

    def test_pass_second_week(self, filter_mod):
        assert filter_mod.is_page_header_line("Хоёр дахь Долоо хоног") is True

    def test_pass_all_four_ordinals(self, filter_mod):
        assert filter_mod.is_page_header_line("Эхний Долоо хоног") is True
        assert filter_mod.is_page_header_line("Хоёр дахь Долоо хоног") is True
        assert filter_mod.is_page_header_line("Гурав дахь Долоо хоног") is True
        assert filter_mod.is_page_header_line("Дөрөв дахь Долоо хоног") is True

    def test_fail_confounding_existing_numbered_pattern(self, filter_mod):
        # Distinct pattern (page-prefixed) — must remain caught by the
        # pre-existing NUMBERED_WEEK_HEADER_RE, NOT by the new ordinal
        # regex (which requires a leading ordinal word).
        assert filter_mod.is_page_header_line("85 1 дугаар долоо хоног") is True


# --- Regression: original four patterns still match --------------------

class TestRegressionOriginalPatterns:
    def test_weekday_header(self, filter_mod):
        assert filter_mod.is_page_header_line("Даваа гарагийн орой 85") is True

    def test_numbered_week_header(self, filter_mod):
        assert filter_mod.is_page_header_line("85 1 дугаар долоо хоног") is True

    def test_bare_page_number(self, filter_mod):
        assert filter_mod.is_page_header_line("85") is True

    def test_section_title_literal_existing(self, filter_mod):
        assert filter_mod.is_page_header_line("Магтаал") is True

    def test_section_title_literal_dululu(self, filter_mod):
        assert filter_mod.is_page_header_line("Дууллыг төгсгөх залбирал") is True

    def test_regression_lock_body_text_must_remain(self, filter_mod):
        # The classic confounding case from R-9.C — the new patterns
        # must not regress this.
        assert filter_mod.is_page_header_line("Магтаалыг өргөгтүн") is False

    def test_empty_or_whitespace(self, filter_mod):
        assert filter_mod.is_page_header_line("") is False
        assert filter_mod.is_page_header_line("   ") is False
        assert filter_mod.is_page_header_line(None) is False
