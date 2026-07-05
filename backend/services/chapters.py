"""Persist a book's chapter map (see BookChapter for the anchor design)."""
import logging

from sqlalchemy.orm import Session

from backend.models.book import BookChapter

logger = logging.getLogger(__name__)


def replace_book_chapters(db: Session, book_id: int, chapters: list[dict] | None) -> int:
    """Replace the stored chapter map for a book with the given extraction
    result (as produced by metadata._extract_epub_chapters). An empty/None
    extraction clears nothing — no TOC today doesn't invalidate a map extracted
    from the same file yesterday. Returns the number of rows written."""
    if not chapters:
        return 0
    db.query(BookChapter).filter(BookChapter.book_id == book_id).delete()
    for c in chapters:
        db.add(BookChapter(
            book_id=book_id,
            idx=c["idx"],
            title=(c["title"] or "")[:512],
            start_fraction=c["start_fraction"],
            end_fraction=c["end_fraction"],
        ))
    return len(chapters)
