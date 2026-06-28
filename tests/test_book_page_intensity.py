"""Per-book reading intensity from imported KOReader page-stats."""
from backend.models.ko_stats import PageStat
from backend.services.reading_stats import compute_book_page_intensity

BASE = 1_700_000_000  # fixed epoch so day-bucketing is deterministic


def test_none_without_pagestats(db, admin_user, make_book):
    user, _ = admin_user
    book = make_book()
    assert compute_book_page_intensity(db, user_id=user.id, book_id=book.id) is None


def test_curve_completion_and_reread(db, admin_user, make_book):
    user, _ = admin_user
    book = make_book()
    # 10-page book: dwell 60s on pages 1–5 (first half); page 1 revisited next day.
    for page in range(1, 6):
        db.add(PageStat(user_id=user.id, book_id=book.id, page=page, total_pages=10,
                        start_time=BASE + page * 60, duration_seconds=60, device="Kindle"))
    db.add(PageStat(user_id=user.id, book_id=book.id, page=1, total_pages=10,
                    start_time=BASE + 90_000, duration_seconds=30, device="Kindle"))  # +1 day
    db.flush()

    it = compute_book_page_intensity(db, user_id=user.id, book_id=book.id, bins=10)
    assert it is not None
    assert it["total_pages"] == 10
    assert it["pages_read"] == 5            # distinct pages 1–5
    assert it["pct_read"] == 50.0           # 5 of 10
    assert it["total_seconds"] == 60 * 5 + 30
    assert len(it["curve"]) == 10
    # page 1 (bin 0) = 60 + 30; pages 2–5 = 60 each in bins 1–4; second half empty.
    assert it["curve"][0] == 90
    assert it["curve"][1:5] == [60, 60, 60, 60]
    assert sum(it["curve"][5:]) == 0
    assert it["reread_bins"] == 1           # bin 0 read on two different days


def test_pagination_change_is_robust(db, admin_user, make_book):
    # Same book read at two different paginations (KOReader re-paginates). Both
    # halves map to the right fraction-of-book regardless of absolute page count.
    user, _ = admin_user
    book = make_book()
    db.add(PageStat(user_id=user.id, book_id=book.id, page=1, total_pages=4,
                    start_time=BASE, duration_seconds=100, device="Kindle"))        # ~0%
    db.add(PageStat(user_id=user.id, book_id=book.id, page=80, total_pages=100,
                    start_time=BASE + 60, duration_seconds=100, device="Kindle"))   # ~79%
    db.flush()
    it = compute_book_page_intensity(db, user_id=user.id, book_id=book.id, bins=100)
    assert it["curve"][0] == 100            # start of book
    assert it["curve"][79] == 100           # ~80% through
    assert it["total_pages"] == 100         # latest pagination wins as the denominator
