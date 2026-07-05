"""Phase 3 plumbing: chapter map extraction (BookChapter), fixed-layout page
counts, and the time-per-chapter stat built on both."""
import io
import zipfile
from pathlib import Path

from ebooklib import epub

from backend.models.book import BookChapter
from backend.models.ko_stats import PageStat
from backend.services.metadata import (
    count_pages_fixed_layout,
    extract_chapters_epub,
    extract_metadata,
)
from backend.services.reading_stats import compute_book_chapter_times


def _make_epub(path: Path, chapters: list[tuple[str, str]]) -> None:
    """chapters: list of (title, body-text)."""
    book = epub.EpubBook()
    book.set_identifier("ch-test")
    book.set_title("Chapter Test")
    book.set_language("en")
    items = []
    for i, (title, txt) in enumerate(chapters):
        c = epub.EpubHtml(title=title, file_name=f"c{i}.xhtml", lang="en")
        c.content = f"<html><body><h1>{title}</h1><p>{txt}</p></body></html>"
        book.add_item(c)
        items.append(c)
    book.toc = tuple(items)
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())
    book.spine = ["nav"] + items
    epub.write_epub(str(path), book)


def _make_cbz(path: Path, pages: int) -> None:
    # 1x1 white JPEG, tiny but real enough for a namelist count
    jpeg = bytes.fromhex(
        "ffd8ffe000104a46494600010100000100010000ffdb004300ffffffffffffffff"
        "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
        "ffffffffffffffffffffffffc00b080001000101011100ffc40014000100000000"
        "00000000000000000000000009ffc40014100100000000000000000000000000000"
        "000ffda0008010100003f0037ffd9"
    )
    with zipfile.ZipFile(path, "w") as zf:
        for i in range(pages):
            zf.writestr(f"{i:03d}.jpg", jpeg)


# ── extraction ───────────────────────────────────────────────────────────────

class TestChapterExtraction:
    def test_fractions_follow_word_weight(self, tmp_path):
        # ch1 has 100 words, ch2 has 300 → ch2 starts at 0.25 of the book.
        path = tmp_path / "b.epub"
        _make_epub(path, [
            ("One", " ".join(f"w{i}" for i in range(100))),
            ("Two", " ".join(f"w{i}" for i in range(300))),
        ])
        chapters = extract_chapters_epub(path)
        assert [c["title"] for c in chapters] == ["One", "Two"]
        assert chapters[0]["start_fraction"] == 0.0
        assert abs(chapters[1]["start_fraction"] - 0.25) < 0.03  # h1 text adds a little
        assert chapters[0]["end_fraction"] == chapters[1]["start_fraction"]
        assert chapters[1]["end_fraction"] == 1.0
        assert [c["idx"] for c in chapters] == [0, 1]

    def test_single_chapter_toc_is_no_structure(self, tmp_path):
        path = tmp_path / "b.epub"
        _make_epub(path, [("Only", "some words here")])
        assert extract_chapters_epub(path) == []

    def test_no_toc_returns_empty(self, tmp_path):
        path = tmp_path / "b.epub"
        book = epub.EpubBook()
        book.set_identifier("x")
        book.set_title("No TOC")
        book.set_language("en")
        c = epub.EpubHtml(title="c", file_name="c.xhtml", lang="en")
        c.content = "<html><body><p>text body words</p></body></html>"
        book.add_item(c)
        book.add_item(epub.EpubNcx())
        book.add_item(epub.EpubNav())
        book.spine = ["nav", c]
        epub.write_epub(str(path), book)
        assert extract_chapters_epub(path) == []

    def test_extract_metadata_carries_private_chapters_key(self, tmp_path):
        path = tmp_path / "b.epub"
        _make_epub(path, [("One", "alpha " * 50), ("Two", "beta " * 50)])
        meta = extract_metadata(path, tmp_path)
        assert len(meta["_chapters"]) == 2


class TestFixedLayoutPageCount:
    def test_cbz_counts_images(self, tmp_path):
        path = tmp_path / "c.cbz"
        _make_cbz(path, 7)
        assert count_pages_fixed_layout(path) == 7
        meta = extract_metadata(path, tmp_path)
        assert meta["page_count"] == 7

    def test_epub_gets_no_page_count(self, tmp_path):
        path = tmp_path / "b.epub"
        _make_epub(path, [("One", "alpha"), ("Two", "beta")])
        assert count_pages_fixed_layout(path) is None
        meta = extract_metadata(path, tmp_path)
        assert "page_count" not in meta


# ── time-per-chapter ─────────────────────────────────────────────────────────

def _chapter(db, book_id, idx, title, start, end):
    db.add(BookChapter(book_id=book_id, idx=idx, title=title,
                       start_fraction=start, end_fraction=end))


def _dwell(db, user_id, book_id, page, total, seconds, start_time=1_700_000_000):
    db.add(PageStat(user_id=user_id, book_id=book_id, page=page,
                    total_pages=total, start_time=start_time + page,
                    duration_seconds=seconds, device="kindle"))


class TestChapterTimes:
    def test_buckets_dwell_by_fraction(self, db, admin_user, make_book):
        user, _ = admin_user
        book = make_book(title="Bucketed")
        _chapter(db, book.id, 0, "One", 0.0, 0.5)
        _chapter(db, book.id, 1, "Two", 0.5, 1.0)
        # 100-page pagination: pages 1-50 → ch One, 51-100 → ch Two
        _dwell(db, user.id, book.id, page=10, total=100, seconds=60)
        _dwell(db, user.id, book.id, page=40, total=100, seconds=30)
        _dwell(db, user.id, book.id, page=80, total=100, seconds=45)
        db.commit()

        out = compute_book_chapter_times(db, user_id=user.id, book_id=book.id)
        assert [c["seconds"] for c in out] == [90, 45]
        assert [c["title"] for c in out] == ["One", "Two"]
        # When the chapter was read: pages 10 and 40 are 30s apart in _dwell's
        # stamping (base + page), well under the 30-min gap → ONE sitting
        # covering both; chapter Two has a single dwell.
        assert out[0]["sittings"] == [{"start_ts": 1_700_000_010, "end_ts": 1_700_000_070}]
        assert out[1]["sittings"] == [{"start_ts": 1_700_000_080, "end_ts": 1_700_000_125}]

    def test_sittings_split_on_thirty_minute_gap(self, db, admin_user, make_book):
        user, _ = admin_user
        book = make_book(title="TwoSittings")
        _chapter(db, book.id, 0, "One", 0.0, 1.0)
        _chapter(db, book.id, 1, "Two", 1.0, 1.0)
        base = 1_700_000_000
        # _dwell stamps start_time + page. Two dwells ~5 minutes apart (one
        # sitting), then one ~2 hours later (a second sitting).
        _dwell(db, user.id, book.id, page=1, total=100, seconds=60, start_time=base - 1)      # ts base
        _dwell(db, user.id, book.id, page=2, total=100, seconds=60, start_time=base + 298)    # ts base+300
        _dwell(db, user.id, book.id, page=3, total=100, seconds=60, start_time=base + 7197)   # ts base+7200
        db.commit()

        out = compute_book_chapter_times(db, user_id=user.id, book_id=book.id)
        s = out[0]["sittings"]
        assert len(s) == 2
        assert s[0]["start_ts"] == base and s[0]["end_ts"] == base + 360
        assert s[1]["start_ts"] == base + 7200 and s[1]["end_ts"] == base + 7260

    def test_mixed_paginations_map_independently(self, db, admin_user, make_book):
        user, _ = admin_user
        book = make_book(title="Repaged")
        _chapter(db, book.id, 0, "One", 0.0, 0.5)
        _chapter(db, book.id, 1, "Two", 0.5, 1.0)
        # Same physical spot (~75% in) under two different paginations.
        _dwell(db, user.id, book.id, page=75, total=100, seconds=10)
        _dwell(db, user.id, book.id, page=300, total=400, seconds=20)
        db.commit()

        out = compute_book_chapter_times(db, user_id=user.id, book_id=book.id)
        assert out[1]["seconds"] == 30
        assert out[0]["seconds"] == 0

    def test_front_matter_folds_into_first_chapter(self, db, admin_user, make_book):
        user, _ = admin_user
        book = make_book(title="Fronted")
        # First chapter starts at 0.1 (cover/front matter before it).
        _chapter(db, book.id, 0, "One", 0.1, 1.0)
        _chapter(db, book.id, 1, "Two", 1.0, 1.0)
        _dwell(db, user.id, book.id, page=1, total=100, seconds=15)
        db.commit()

        out = compute_book_chapter_times(db, user_id=user.id, book_id=book.id)
        assert out[0]["seconds"] == 15

    def test_none_without_chapters_or_stats(self, db, admin_user, make_book):
        user, _ = admin_user
        no_chapters = make_book(title="NoCh")
        _dwell(db, user.id, no_chapters.id, page=1, total=10, seconds=5)
        no_stats = make_book(title="NoSt")
        _chapter(db, no_stats.id, 0, "One", 0.0, 0.5)
        _chapter(db, no_stats.id, 1, "Two", 0.5, 1.0)
        db.commit()

        assert compute_book_chapter_times(db, user_id=user.id, book_id=no_chapters.id) is None
        assert compute_book_chapter_times(db, user_id=user.id, book_id=no_stats.id) is None

    def test_endpoint_carries_chapters_block(self, db, client, admin_user, make_book):
        user, _ = admin_user
        book = make_book(title="Endpointed")
        _chapter(db, book.id, 0, "One", 0.0, 0.5)
        _chapter(db, book.id, 1, "Two", 0.5, 1.0)
        _dwell(db, user.id, book.id, page=20, total=100, seconds=120)
        db.commit()

        r = client.get(f"/api/books/{book.id}/reading-stats")
        assert r.status_code == 200, r.text
        chapters = r.json()["chapters"]
        assert chapters[0]["seconds"] == 120 and chapters[1]["seconds"] == 0
