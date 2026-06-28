"""Page-stat-powered stats: re-reads block + page-based completion estimates."""
from datetime import datetime, timezone

from backend.models.ko_stats import PageStat
from backend.models.user_book_status import UserBookStatus

DAY = 86_400
BASE = 1_700_000_000
NOW = int(datetime.utcnow().replace(tzinfo=timezone.utc).timestamp())


def _page(db, user, book, page, total, day, dur=60):
    db.add(PageStat(user_id=user.id, book_id=book.id, page=page, total_pages=total,
                    start_time=BASE + day * DAY + page, duration_seconds=dur, device="Kindle"))


def test_rereads_block(client, db, admin_user, make_book):
    user, _ = admin_user
    reread = make_book(title="Reread Me")
    once = make_book(title="Read Once")
    # `reread`: pages 1–5 read on day 0, then 1–4 again on day 10 → 4 re-read pages
    for p in range(1, 6):
        _page(db, user, reread, p, 100, 0)
    for p in range(1, 5):
        _page(db, user, reread, p, 100, 10)
    # `once`: each page read a single day → no re-reads
    for p in range(1, 6):
        _page(db, user, once, p, 100, 0)
    db.flush()

    rr = client.get("/api/stats?days=0").json()["rereads"]["books"]
    ids = {b["book_id"]: b for b in rr}
    assert reread.id in ids
    assert ids[reread.id]["reread_pages"] == 4
    assert ids[reread.id]["total_pages"] == 100
    assert once.id not in ids                      # nothing revisited


def test_completion_uses_page_denominator(client, db, admin_user, make_book):
    user, _ = admin_user
    book = make_book(title="In Progress")
    db.add(UserBookStatus(user_id=user.id, book_id=book.id, status="reading", progress_pct=0.02))
    # 200-page book, 40 distinct pages over the last 4 days → 20% done by real pages.
    # Timestamps must fall inside the estimate's 30-day window, so anchor on NOW.
    for day in range(4):
        ts = NOW - (3 - day) * DAY
        for p in range(day * 10 + 1, day * 10 + 11):
            db.add(PageStat(user_id=user.id, book_id=book.id, page=p, total_pages=200,
                            start_time=ts + p, duration_seconds=60, device="Kindle"))
    db.flush()

    rows = client.get("/api/stats/completion-estimates").json()
    row = next(r for r in rows if r["book_id"] == book.id)
    assert row["progress"] == 20.0                 # 40/200, not the stale 2%
    assert row["estimated_days"] is not None       # device-only book still gets an estimate
