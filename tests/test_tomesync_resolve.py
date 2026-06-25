"""Tests for `GET /api/tome-sync/resolve` — the filename→book_id fallback the
KOReader plugin uses when it has no cached id for an opened file.

Regression anchor: a series named identically to its first book, downloaded with
a flat `{series} - 02 - {title}` naming template, used to resolve *every* volume
to vol 1 (vol 1's title is a substring of every volume's filename, and the bare
"02" wasn't recognised as a volume). That silently overwrote vol 1's reading
progress with later volumes'. The resolver must now refuse to guess.
"""
from backend.models.tome_sync import ApiKey


def _api_key_for(db, user_id: int) -> str:
    plaintext = ApiKey.generate()
    db.add(ApiKey(user_id=user_id, key_hash=ApiKey.hash_key(plaintext),
                  key_prefix=plaintext[:11], label="test"))
    db.flush()
    return plaintext


def _resolve(client, hdr, filename):
    return client.get("/api/tome-sync/resolve", headers=hdr, params={"filename": filename})


def test_flat_template_series_equals_vol1_title(client, db, admin_user, make_book):
    """The reported bug: series name == vol-1 title, flat `{series} - NN - {title}`
    filenames. Each volume must resolve to itself, never collapse onto vol 1."""
    user, _ = admin_user
    hdr = {"Authorization": f"Bearer {_api_key_for(db, user.id)}"}

    v1 = make_book(title="Shield of Sparrows", series="Shield of Sparrows",
                   series_index=1, file_path="/library/sos/v1.epub")
    v2 = make_book(title="Shield of Sparrows - The Gathering", series="Shield of Sparrows",
                   series_index=2, file_path="/library/sos/v2.epub")

    # Filenames as the flat home-folder template renders them on the device.
    r1 = _resolve(client, hdr, "Shield of Sparrows - 01 - Shield of Sparrows.epub")
    r2 = _resolve(client, hdr, "Shield of Sparrows - 02 - Shield of Sparrows - The Gathering.epub")

    assert r1.status_code == 200 and r1.json()["book_id"] == v1.id, r1.text
    assert r2.status_code == 200 and r2.json()["book_id"] == v2.id, r2.text


def test_duplicate_titles_disambiguated_by_volume(client, db, admin_user, make_book):
    """Both volumes literally share the same title; only the volume number tells
    them apart. The filename's volume must pick the right one."""
    user, _ = admin_user
    hdr = {"Authorization": f"Bearer {_api_key_for(db, user.id)}"}

    v1 = make_book(title="Berserk", series="Berserk", series_index=1,
                   file_path="/library/berserk/v1.epub")
    v2 = make_book(title="Berserk", series="Berserk", series_index=2,
                   file_path="/library/berserk/v2.epub")

    assert _resolve(client, hdr, "Berserk - 01 - Berserk.epub").json()["book_id"] == v1.id
    assert _resolve(client, hdr, "Berserk - 02 - Berserk.epub").json()["book_id"] == v2.id


def test_builtin_vol_prefix_resolves(client, db, admin_user, make_book):
    """Series-browser built-in layout: 'Vol. N — Title.ext'."""
    user, _ = admin_user
    hdr = {"Authorization": f"Bearer {_api_key_for(db, user.id)}"}

    make_book(title="Sword Art Online", series="Sword Art Online", series_index=1,
              file_path="/library/sao/v1.epub")
    v2 = make_book(title="Sword Art Online", series="Sword Art Online", series_index=2,
                   file_path="/library/sao/v2.epub")

    r = _resolve(client, hdr, "Vol. 2 — Sword Art Online.epub")
    assert r.status_code == 200 and r.json()["book_id"] == v2.id, r.text


def test_most_specific_title_wins(client, db, admin_user, make_book):
    """When one title is nested inside another and there's no volume, the longer
    (more specific) match wins — and the shorter standalone still resolves."""
    user, _ = admin_user
    hdr = {"Authorization": f"Bearer {_api_key_for(db, user.id)}"}

    dune = make_book(title="Dune", file_path="/library/dune/dune.epub")
    messiah = make_book(title="Dune Messiah", file_path="/library/dune/messiah.epub")

    assert _resolve(client, hdr, "Dune.epub").json()["book_id"] == dune.id
    assert _resolve(client, hdr, "Dune Messiah.epub").json()["book_id"] == messiah.id


def test_exact_path_match_short_circuits(client, db, admin_user, make_book):
    """An exact on-disk path match is unambiguous and wins outright."""
    user, _ = admin_user
    hdr = {"Authorization": f"Bearer {_api_key_for(db, user.id)}"}

    book = make_book(title="Whatever", file_path="/library/x/the-real-file.epub")
    r = _resolve(client, hdr, "the-real-file.epub")
    assert r.status_code == 200 and r.json()["book_id"] == book.id


def test_volume_contradiction_refuses_rather_than_misresolve(client, db, admin_user, make_book):
    """Filename says volume 2 but the only title-match is vol 1 (its title token
    absent). Resolving to vol 1 would corrupt its progress — return 404 instead."""
    user, _ = admin_user
    hdr = {"Authorization": f"Bearer {_api_key_for(db, user.id)}"}

    make_book(title="Shield of Sparrows", series="Shield of Sparrows", series_index=1,
              file_path="/library/sos/v1.epub")
    # No vol-2 book exists in the library yet.
    r = _resolve(client, hdr, "Shield of Sparrows - 02 -.epub")
    assert r.status_code == 404, r.text


def test_no_match_returns_404(client, db, admin_user, make_book):
    user, _ = admin_user
    hdr = {"Authorization": f"Bearer {_api_key_for(db, user.id)}"}
    make_book(title="Something Else", file_path="/library/se/se.epub")
    assert _resolve(client, hdr, "Totally Unrelated.epub").status_code == 404
