# BookQuest 🎲

Learn a book like a board game. Read short lessons, pass quick tests, advance your token along a winding board, earn XP and badges, and finish with a final grade.

A **vanilla static site** — plain HTML/CSS/JS, no build step, no dependencies, no backend. First book: *Rich Dad Poor Dad*. Adding more books is just dropping in a JSON file.

**▶ Live:** _add your GitHub Pages URL here after deploy_ (e.g. `https://<username>.github.io/bookquest/`)

---

## Run locally

Browsers block reading local JSON over `file://`, so serve it (Python ships with a server):

```bash
python -m http.server
```

Then open **http://localhost:8000**.

## Add a book

1. Copy `content/_TEMPLATE.json` → `content/your-book-id.json` and fill it in (the inline `_notes_*` keys explain every field).
2. Register it: run `python tools/build_manifest.py` (auto-rewrites `content/books.json`), or add one entry by hand.
3. Reload — it appears on the shelf, fully playable. No engine code to touch.

## How it's built

- `index.html` — app shell; screens toggled by JS
- `assets/css/styles.css` — "Play" theme (vibrant, playful, chunky 3D buttons)
- `assets/js/` — `confetti`, `state` (localStorage), `questions` (4 types incl. drag-to-sort), `engine` (game flow), `app` (boot + library + router)
- `content/` — `books.json` manifest, book JSONs, `_TEMPLATE.json`
- `tools/build_manifest.py` — regenerate the manifest from `content/*.json`

The engine renders purely from each book's JSON, so content and code stay fully separated. Full details and the "how to add a book" guide are in **[`[C] README.md`](./%5BC%5D%20README.md)**.
