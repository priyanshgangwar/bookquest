#!/usr/bin/env python3
"""Regenerate content/books.json by scanning content/*.json.

Each book JSON (anything in content/ except books.json and files starting with
'_') contributes one manifest entry. Run after adding or editing a book:

    python tools/build_manifest.py

It pulls id/title/author/tagline/cover from each book and counts its levels,
so the library shelf can show progress. Existing manifest is overwritten.
"""
import json
import sys
from pathlib import Path

CONTENT = Path(__file__).resolve().parent.parent / "content"
MANIFEST = CONTENT / "books.json"


def main() -> int:
    if not CONTENT.is_dir():
        print(f"content folder not found: {CONTENT}", file=sys.stderr)
        return 1

    books = []
    for path in sorted(CONTENT.glob("*.json")):
        if path.name == "books.json" or path.name.startswith("_"):
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as exc:
            print(f"skipping {path.name}: {exc}", file=sys.stderr)
            continue

        book_id = data.get("id") or path.stem
        books.append({
            "id": book_id,
            "file": path.name,
            "title": data.get("title", book_id),
            "author": data.get("author", ""),
            "tagline": data.get("tagline", ""),
            "cover": data.get("cover", {"emoji": "📘", "color": "#2e7d32"}),
            "levels": len(data.get("levels", [])),
        })

    MANIFEST.write_text(
        json.dumps({"books": books}, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {MANIFEST.relative_to(CONTENT.parent)} with {len(books)} book(s):")
    for b in books:
        print(f"  - {b['title']} ({b['levels']} levels)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
