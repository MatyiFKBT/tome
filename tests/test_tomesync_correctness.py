"""Server-side TomeSync correctness fixes (2026-07-03 audit).

- C1-C4: filename→book resolution must not silently map a file onto the wrong
  book. Word-boundary/min-length matching, index-aware volume handling, and a
  bounded volume regex.
- B2: one reading-position row per (user, book) — the two writers (device
  heartbeat, web autosave) converge instead of forking duplicates.
- B3: resetting a book to "unread" on the web clears the synced position, so
  the device can't re-pull it and undo the reset.
"""
import pytest
from sqlalchemy.exc import IntegrityError
from starlette.testclient import TestClient

from backend.models.tome_sync import ApiKey, TomeSyncPosition
from backend.models.user_book_status import UserBookStatus


@pytest.fixture()
def api_key(db, admin_user) -> str:
    user, _ = admin_user
    plaintext = ApiKey.generate()
    db.add(ApiKey(user_id=user.id, key_hash=ApiKey.hash_key(plaintext),
                  key_prefix=plaintext[:11], label="test"))
    db.flush()
    return plaintext


def _resolve(client: TestClient, api_key: str, filename: str):
    return client.get(
        "/api/tome-sync/resolve",
        params={"filename": filename},
        headers={"Authorization": f"Bearer {api_key}"},
    )


# ---------------------------------------------------------------------------
# C1 — short titles / word boundaries
# ---------------------------------------------------------------------------

class TestResolveC1:
    def test_short_title_does_not_swallow_unrelated_file(self, client, db, make_book, api_key):
        make_book(title="It")  # Stephen King, 2 chars
        db.commit()
        # Never served by Tome → no md5/path hit → heuristic fallback.
        r = _resolve(client, api_key, "The Italian Job.epub")
        assert r.status_code == 404

    def test_short_title_still_matches_exact_stem(self, client, db, make_book, api_key):
        book = make_book(title="It")
        db.commit()
        r = _resolve(client, api_key, "It.epub")
        assert r.status_code == 200
        assert r.json()["book_id"] == book.id

    def test_title_must_be_whole_phrase(self, client, db, make_book, api_key):
        # "Room" as a substring of "Mushroom Cookbook" must not match.
        make_book(title="Room")
        db.commit()
        r = _resolve(client, api_key, "Mushroom Cookbook.epub")
        assert r.status_code == 404

    def test_most_specific_title_wins(self, client, db, make_book, api_key):
        make_book(title="Dune")
        messiah = make_book(title="Dune Messiah")
        db.commit()
        r = _resolve(client, api_key, "Dune Messiah.epub")
        assert r.status_code == 200
        assert r.json()["book_id"] == messiah.id

    def test_plain_title_still_resolves(self, client, db, make_book, api_key):
        # Regression guard: the emulator-verified Frankenstein path.
        book = make_book(title="Frankenstein")
        db.commit()
        r = _resolve(client, api_key, "Frankenstein; or, the modern prometheus.epub")
        assert r.status_code == 200
        assert r.json()["book_id"] == book.id


# ---------------------------------------------------------------------------
# C2 — volume number vs index-less book
# ---------------------------------------------------------------------------

class TestResolveC2:
    def test_numbered_file_does_not_land_on_standalone(self, client, db, make_book, api_key):
        make_book(title="Foo", series=None, series_index=None)  # standalone
        db.commit()
        # "Foo v2" — vol 2 of a Foo series that isn't in Tome.
        r = _resolve(client, api_key, "Foo v2.epub")
        assert r.status_code == 404

    def test_numbered_file_resolves_to_matching_index(self, client, db, make_book, api_key):
        v2 = make_book(title="Gantz", series="Gantz", series_index=2)
        db.commit()
        r = _resolve(client, api_key, "Gantz v2.epub")
        assert r.status_code == 200
        assert r.json()["book_id"] == v2.id

    def test_series_browser_filename_resolves(self, client, db, make_book, api_key):
        v1 = make_book(title="Berserk, Vol. 1", series="Berserk", series_index=1)
        db.commit()
        r = _resolve(client, api_key, "Vol. 1 — Berserk, Vol. 1.cbz")
        assert r.status_code == 200
        assert r.json()["book_id"] == v1.id

    def test_wrong_volume_number_refuses(self, client, db, make_book, api_key):
        make_book(title="Gantz", series="Gantz", series_index=1)
        db.commit()
        r = _resolve(client, api_key, "Gantz v2.epub")  # only vol 1 exists
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# C3 — reverse fallback minimum length
# ---------------------------------------------------------------------------

class TestResolveC3:
    def test_tiny_stem_does_not_match_longer_title(self, client, db, make_book, api_key):
        make_book(title="1984")
        db.commit()
        r = _resolve(client, api_key, "1.epub")  # split-chapter stem "1"
        assert r.status_code == 404

    def test_truncated_stem_still_resolves(self, client, db, make_book, api_key):
        book = make_book(title="Frankenstein")
        db.commit()
        # A shortened filename that is a leading fragment of exactly one title.
        r = _resolve(client, api_key, "Franken.epub")
        assert r.status_code == 200
        assert r.json()["book_id"] == book.id

    def test_midword_fragment_does_not_match(self, client, db, make_book, api_key):
        make_book(title="Starship Troopers")
        db.commit()
        r = _resolve(client, api_key, "ship.epub")  # not at a word boundary
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# C4 — volume regex bounds (year token, half-volume)
# ---------------------------------------------------------------------------

class TestResolveC4:
    def test_year_token_not_read_as_volume(self, client, db, make_book, api_key):
        # "- 1984 -" must not parse as volume 1984 and then exclude the book.
        book = make_book(title="Collected Orwell", series="Collected Orwell", series_index=3)
        db.commit()
        r = _resolve(client, api_key, "Collected Orwell - 1984 - Essays.epub")
        assert r.status_code == 200
        assert r.json()["book_id"] == book.id

    def test_half_volume_resolves(self, client, db, make_book, api_key):
        book = make_book(title="Chainsaw Man", series="Chainsaw Man", series_index=2.5)
        db.commit()
        r = _resolve(client, api_key, "Chainsaw Man Vol. 2.5.epub")
        assert r.status_code == 200
        assert r.json()["book_id"] == book.id

    def test_separator_volume_still_parses(self, client, db, make_book, api_key):
        book = make_book(title="Some Title", series="Series", series_index=2)
        db.commit()
        r = _resolve(client, api_key, "Series - 02 - Some Title.epub")
        assert r.status_code == 200
        assert r.json()["book_id"] == book.id


# ---------------------------------------------------------------------------
# B2 — one position row per (user, book)
# ---------------------------------------------------------------------------

class TestPositionUniqueness:
    def test_duplicate_insert_rejected_by_constraint(self, db, admin_user, make_book):
        user, _ = admin_user
        book = make_book(title="Dup")
        db.flush()
        db.add(TomeSyncPosition(user_id=user.id, book_id=book.id, percentage=0.1))
        db.flush()
        db.add(TomeSyncPosition(user_id=user.id, book_id=book.id, percentage=0.2))
        with pytest.raises(IntegrityError):
            db.flush()
        db.rollback()

    def test_device_then_web_converge_to_one_row(self, client, db, make_book, admin_user, api_key):
        user, jwt = admin_user
        book = make_book(title="Converge")
        db.commit()

        # Device heartbeat (api-key auth)
        r1 = client.put(
            f"/api/tome-sync/position/{book.id}",
            json={"percentage": 0.30, "progress": "cfi-device", "device": "kindle"},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert r1.status_code == 200
        # Web autosave (JWT auth — client default header)
        r2 = client.put(
            f"/api/books/{book.id}/status",
            json={"status": "reading", "progress_pct": 0.55, "cfi": "cfi-web"},
        )
        assert r2.status_code == 200

        rows = db.query(TomeSyncPosition).filter(
            TomeSyncPosition.user_id == user.id, TomeSyncPosition.book_id == book.id
        ).all()
        assert len(rows) == 1
        assert rows[0].percentage == 0.55  # last writer wins on the single row

    def test_repeated_device_push_updates_in_place(self, client, db, make_book, admin_user, api_key):
        user, _ = admin_user
        book = make_book(title="Repeat")
        db.commit()
        for pct in (0.1, 0.2, 0.3):
            client.put(
                f"/api/tome-sync/position/{book.id}",
                json={"percentage": pct, "progress": f"cfi-{pct}", "device": "kindle"},
                headers={"Authorization": f"Bearer {api_key}"},
            )
        rows = db.query(TomeSyncPosition).filter(
            TomeSyncPosition.user_id == user.id, TomeSyncPosition.book_id == book.id
        ).all()
        assert len(rows) == 1
        assert rows[0].percentage == 0.3


# ---------------------------------------------------------------------------
# B3 — mark unread clears the synced position
# ---------------------------------------------------------------------------

class TestMarkUnreadClearsPosition:
    def test_unread_deletes_position(self, client, db, make_book, admin_user):
        user, _ = admin_user
        book = make_book(title="ReReadMe")
        db.commit()

        # Read to 74% via the web writer → creates a position row.
        client.put(
            f"/api/books/{book.id}/status",
            json={"status": "reading", "progress_pct": 0.74, "cfi": "cfi-74"},
        )
        assert db.query(TomeSyncPosition).filter_by(user_id=user.id, book_id=book.id).count() == 1

        # Reset to unread → the synced position must be gone.
        r = client.put(f"/api/books/{book.id}/status", json={"status": "unread"})
        assert r.status_code == 200
        assert db.query(TomeSyncPosition).filter_by(user_id=user.id, book_id=book.id).count() == 0

        status = db.query(UserBookStatus).filter_by(user_id=user.id, book_id=book.id).first()
        assert status.status == "unread"
        assert status.progress_pct is None
