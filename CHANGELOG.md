# Changelog

All notable changes to Tome are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Security
- Closed exploitable path-traversal in the upload/ingest endpoints (file
  basename is stripped before being joined to the temp directory, with a
  defense-in-depth resolved-path assertion).
- Global libraries (owner_id IS NULL) are now admin-only for mutations; any
  authenticated user including guests could previously delete every global
  library on a default install.
- `POST /api/libraries` now requires at least the `member` role.
- OPDS download and both comic-page streaming endpoints now apply
  `user_can_see_book` — closes IDORs where any user with auth could
  download books outside their visibility scope by guessing IDs.
- TomeSync `ApiKey` is now stored as `sha256(key)` rather than plaintext.
  Existing KOReader plugin installs keep working; database leak no longer
  yields a fleet of usable credentials.
- KOSync userkey now compared with `hmac.compare_digest` (timing-safe).
- `get_comic_page` now uses the same JWT signing key resolver as the rest
  of the app; was silently broken when `TOME_SECRET_KEY` was unset and the
  auto-generated `data/secret.key` was in use.
- `bindery.reject_book` now resolves cover deletions under `covers_dir`
  rather than the server's CWD.

### Added
- Per-user backup endpoint and Settings → Backup UI. Downloads a JSON
  snapshot of reading status, sessions, sync positions, shelves, and
  client preferences.
- Persistent KOReader sync-status badge in Dashboard and Stats headers
  (dot-only on mobile, full label on desktop).
- Unified reading-streak calculation: Dashboard and Stats now agree, with
  a 4-hour rollover so late-night reading sessions count toward the
  previous day.

### Fixed
- Infinite scroll re-attaches after switching dashboard tabs.
- SQLite connection-pool exhaustion under load (switched to NullPool).
- Comic reader view settings persist; final page now reports 100%.

## [0.2.0] — 2026-04-17

### TomeSync Series Download (Plugin v4)
- Browse series from KOReader's wrench menu — lists all series in your
  library with book counts.
- Download full series or rest-of-series from within a book.
- Downloads organised by book type: `<download_dir>/<book_type>/<series_name>/`.
- Format preference: epub → kepub.epub → cbz → pdf → mobi → azw3.
- Skips books already on the device (matched by book ID).
- Plugin self-registers in KOReader's wrench menu.

### Roles & Permissions
- Replaced 14 granular permission flags with 3 roles: Admin, Member, Guest.
- Per-user book visibility: members see their own + assigned library books;
  guests see public only.

### Bindery Auto-Import
- Automatic ingestion from incoming directory on a configurable interval
  (`TOME_AUTO_IMPORT`, `TOME_AUTO_IMPORT_INTERVAL`).
- Unreviewed book queue with accept/reject workflow.

### Stats
- New Insights tab: completion estimates, year in review, period
  comparison, reading-speed trends.
- Per-book time breakdown, monthly comparison, genre over time.
- Fixed completion estimates to use actual progress gained.

### Themes
- Overhauled theme system: 3 built-in themes (light, dark, amber) plus
  fully custom themes via 10-value hex palette stored in localStorage.

### Web Reader
- Bidirectional position sync: web reader progress syncs to KOReader and back.
- Fixed crash when opening KOReader-synced books.

### UI
- Shift-click range selection across all list views.
- Mobile PWA improvements: safe areas, touch feedback, smoother animations.
- Fixed comic reader stuck spinner.
- Renamed Saved Filters to Shelves.

### Build
- `.dockerignore` for faster Docker builds.

## [0.1.0] — 2026-04-04

First public release.

- Library management: scan folders, upload files, organise into libraries.
- Built-in reader: EPUB (CFI position tracking), manga/comics (CBZ/CBR
  with two-page spread, RTL, webtoon scroll), PDF.
- Metadata: auto-extraction from files; fetching from Hardcover, Google
  Books, and OpenLibrary with side-by-side diff UI.
- KOReader integration: TomeSync plugin for reading position and session
  sync (works offline), OPDS feed, OPDS PINs.
- Reading stats: session tracking, streaks, time-of-day patterns, heatmap.
- Bindery: inbox for incoming books with metadata preview and batch
  accept/reject.
- Series browsing with per-book progress and "continue reading".
- Multi-user: JWT auth, granular permissions, Quick Connect (6-char code
  sign-in), admin impersonation.
- 9 themes: light, dark, Catppuccin (4 flavours), Nord, Neon, 8-bit.
- Mobile-responsive PWA.
- Single Docker image (FastAPI + React + SQLite).

[Unreleased]: https://github.com/bndct-devops/tome/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/bndct-devops/tome/releases/tag/v0.2.0
[0.1.0]: https://github.com/bndct-devops/tome/releases/tag/v0.1.0
