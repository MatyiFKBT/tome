"""Library sweep for closed books (plugin build 34).

Server half: batch partial-MD5 matching + the fill-gaps-only adoption
endpoint. The invariant under test: a closed book's stale sidecar can NEVER
overwrite state the live sync or the user already owns.
"""
from backend.models.tome_sync import ApiKey, TomeSyncPosition
from backend.models.user import User
from backend.models.user_book_status import UserBookStatus
from backend.services.ko_hash import record_ko_hash
from backend.core.security import hash_password


def _api_key_for(db, user_id: int) -> str:
    plaintext = ApiKey.generate()
    db.add(ApiKey(user_id=user_id, key_hash=ApiKey.hash_key(plaintext),
                  key_prefix=plaintext[:11], label="test"))
    db.flush()
    return plaintext


def _hdr(db, user):
    return {"Authorization": f"Bearer {_api_key_for(db, user.id)}"}


# ── match-hashes ─────────────────────────────────────────────────────────────

def test_match_hashes_batch(db, client, admin_user, make_book):
    user, _ = admin_user
    b1 = make_book(title="Hashed One")
    b2 = make_book(title="Hashed Two")
    record_ko_hash(db, b1.id, "a" * 32)
    record_ko_hash(db, b2.id, "b" * 32)
    db.commit()

    r = client.post("/api/tome-sync/match-hashes", headers=_hdr(db, user),
                    json={"hashes": ["a" * 32, "b" * 32, "c" * 32]})
    assert r.status_code == 200, r.text
    assert r.json()["matches"] == {"a" * 32: b1.id, "b" * 32: b2.id}


def test_match_hashes_empty_object_coerced(db, client, admin_user):
    user, _ = admin_user
    # Lua rapidjson sends {} for an empty list
    r = client.post("/api/tome-sync/match-hashes", headers=_hdr(db, user),
                    json={"hashes": {}})
    assert r.status_code == 200 and r.json()["matches"] == {}


def test_match_hashes_respects_visibility(db, client, admin_user, make_book):
    admin, _ = admin_user
    owner = User(username="sweep-owner", email="so@example.com",
                 hashed_password=hash_password("pw"), is_active=True, role="member")
    peeker = User(username="sweep-peeker", email="sp@example.com",
                  hashed_password=hash_password("pw"), is_active=True, role="member")
    db.add_all([owner, peeker])
    db.flush()
    private = make_book(title="Private Hashed")
    private.added_by = owner.id
    record_ko_hash(db, private.id, "d" * 32)
    db.flush()

    r = client.post("/api/tome-sync/match-hashes", headers=_hdr(db, peeker),
                    json={"hashes": ["d" * 32]})
    # Invisible book == unmatched hash, indistinguishable by design.
    assert r.json()["matches"] == {}


# ── sweep adoption: fill gaps only ───────────────────────────────────────────

def _sweep(client, hdr, book_id, **body):
    return client.post(f"/api/tome-sync/sweep/{book_id}", headers=hdr, json=body)


def test_sweep_fills_everything_on_virgin_book(db, client, admin_user, make_book):
    user, _ = admin_user
    book = make_book(title="Virgin")
    hdr = _hdr(db, user)

    r = _sweep(client, hdr, book.id, status="read", rating=4.5,
               review="great", percentage=1.0, progress="/body/x", device="kindle")
    assert r.status_code == 200, r.text
    applied = r.json()["applied"]
    assert applied["status"] == "read"
    assert applied["rating"] == 4.5
    assert applied["review"] is True
    assert applied["progress_pct"] == 1.0
    assert applied["position"] is True

    row = db.query(UserBookStatus).filter_by(user_id=user.id, book_id=book.id).first()
    assert (row.status, row.rating, row.review, row.progress_pct) == ("read", 4.5, "great", 1.0)
    pos = db.query(TomeSyncPosition).filter_by(user_id=user.id, book_id=book.id).first()
    assert pos.progress == "/body/x" and pos.percentage == 1.0 and pos.device == "kindle"


def test_sweep_never_overwrites_existing_state(db, client, admin_user, make_book):
    user, _ = admin_user
    book = make_book(title="Owned")
    hdr = _hdr(db, user)
    db.add(UserBookStatus(user_id=user.id, book_id=book.id, status="read",
                          rating=5.0, review="mine", progress_pct=0.8))
    db.add(TomeSyncPosition(user_id=user.id, book_id=book.id,
                            progress="/live/pos", percentage=0.8, device="kindle"))
    db.commit()

    r = _sweep(client, hdr, book.id, status="reading", rating=2.0,
               review="stale", percentage=0.3, progress="/stale/pos")
    assert r.status_code == 200
    assert r.json()["applied"] == {}

    row = db.query(UserBookStatus).filter_by(user_id=user.id, book_id=book.id).first()
    assert (row.status, row.rating, row.review, row.progress_pct) == ("read", 5.0, "mine", 0.8)
    pos = db.query(TomeSyncPosition).filter_by(user_id=user.id, book_id=book.id).first()
    assert pos.progress == "/live/pos" and pos.percentage == 0.8


def test_sweep_fills_gaps_granularly(db, client, admin_user, make_book):
    """A book with a status but no rating takes the rating and nothing else."""
    user, _ = admin_user
    book = make_book(title="Partial")
    hdr = _hdr(db, user)
    db.add(UserBookStatus(user_id=user.id, book_id=book.id, status="reading"))
    db.commit()

    r = _sweep(client, hdr, book.id, status="read", rating=3.5, percentage=0.5)
    applied = r.json()["applied"]
    assert "status" not in applied          # reading is curation — not downgraded to sweep data
    assert applied["rating"] == 3.5
    assert applied["progress_pct"] == 0.5
    assert applied["position"] is True

    row = db.query(UserBookStatus).filter_by(user_id=user.id, book_id=book.id).first()
    assert row.status == "reading" and row.rating == 3.5


def test_sweep_is_idempotent(db, client, admin_user, make_book):
    user, _ = admin_user
    book = make_book(title="Twice")
    hdr = _hdr(db, user)
    _sweep(client, hdr, book.id, status="read", rating=4.0, percentage=1.0)
    r = _sweep(client, hdr, book.id, status="read", rating=4.0, percentage=1.0)
    assert r.json()["applied"] == {}


def test_sweep_validates_and_404s(db, client, admin_user, make_book):
    user, _ = admin_user
    book = make_book(title="Vld")
    hdr = _hdr(db, user)
    assert _sweep(client, hdr, book.id, rating=4.3).status_code == 400  # not a half-star step
    assert _sweep(client, hdr, 999999, status="read").status_code == 404


# ── generated-impl contract ──────────────────────────────────────────────────

def _impl() -> str:
    from backend.api.tome_sync import _main_impl_lua
    return _main_impl_lua("https://tome.example.org", "tk_testkey", "tester")


def _body(lua: str, func: str) -> str:
    start = lua.find(f"\nfunction TomeSync:{func}")
    assert start != -1, f"missing function {func}"
    return lua[start:lua.find("\nfunction ", start + 1)]


def test_sweep_menu_entry_exists():
    assert "Sync closed books" in _impl()


def test_sweep_is_mtime_gated_and_ack_gated():
    body = _body(_impl(), "_sweepLibraryImpl")
    assert "findSidecarFile" in body
    assert '(sweep.done[path] or -1) < smtime' in body       # mtime gate
    assert "sweep.done[c.path] = c.smtime" in body           # ack after adopt


def test_sweep_skips_books_already_synced():
    body = _body(_impl(), "_sweepLibraryImpl")
    assert "not self.book_map[path]" in body


def test_sweep_matches_feed_the_book_map():
    # A sweep match is a full resolve — positions/annotations gain from it too.
    body = _body(_impl(), "_sweepLibraryImpl")
    assert "self.book_map[c.path] = book_id" in body
    assert 'self:_saveState("tomesync_book_map"' in body


def test_adopt_reads_closed_sidecar_and_maps_status():
    body = _body(_impl(), "_adoptSidecar")
    assert "DocSettings.open" in body
    assert 'summary.status == "complete"' in body
    assert '"read"' in body
    assert "percent_finished" in body
