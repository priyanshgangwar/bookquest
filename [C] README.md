# BookQuest 🎲

Learn a book like a board game. Read short lessons, pass the tests, advance your token along a winding board, earn badges, and finish with a final grade.

Built as a **vanilla static site** — plain HTML/CSS/JS, **no build step, no dependencies**. First book shipped: *Rich Dad Poor Dad*. Adding more books is just dropping in a JSON file.

---

## Run it locally

Browsers block reading local JSON over `file://`, so open it through a tiny local server (Python ships with one):

```bash
cd "02 Projects/BookQuest"
python -m http.server
```

Then open **http://localhost:8000** in your browser. That's it — no install.

> Opening `index.html` by double-clicking will show a friendly "run a server" message instead of the library, because the content can't be fetched over `file://`.

## Deploy it (host-agnostic)

It's a static folder, so it works on **GitHub Pages, Netlify, Vercel** or any static host with zero config. All paths are relative, so it also works from a subpath (e.g. `username.github.io/bookquest/`) unchanged.

- **GitHub Pages:** push the folder, enable Pages on the branch/folder.
- **Netlify / Vercel:** drag-and-drop the folder, or point it at the repo. No build command, publish directory = the BookQuest folder.

Once hosted, content loads normally — no local server needed.

---

## How to add a book

1. Copy `content/_TEMPLATE.json` → `content/your-book-id.json`.
2. Fill in the title, cover, levels, lessons, questions, badges, and final grades. The inline `_notes_*` keys in the template explain every field.
3. Register it in the manifest, either:
   - **Automatically:** `python tools/build_manifest.py` (scans `content/*.json` and rewrites `books.json`), or
   - **By hand:** add one entry to `content/books.json` (`id`, `file`, `title`, `author`, `tagline`, `cover`, `levels`).
4. Reload. The new book appears on the shelf, fully playable. No engine code to touch.

**The last level in a book is always the boss/final exam** — finishing it shows the grade certificate instead of a normal reward screen.

### Question types
- `mcq` — multiple choice (`answer` = 0-based index of the correct option)
- `tf` — true/false (`answer` = `true`/`false`)
- `scenario` — "what would X do?" (same shape as `mcq`)
- `sort` — drag items into buckets; works with mouse drag **and** tap-to-place on touch

---

## How it's built

```
index.html                 app shell; screens are <section>s toggled by JS
assets/css/styles.css       "Game Night" theme — felt table, parchment cards, brass
assets/js/
  confetti.js               offline canvas confetti (no CDN)
  state.js                  localStorage progress, one record per book
  questions.js              renderers + scoring for each question type
  engine.js                 game flow: map → lesson → quiz → reward → final
  app.js                    boot, manifest load, library shelf, screen router
content/
  books.json                manifest (list of books)
  rich-dad-poor-dad.json     first book
  _TEMPLATE.json             blank book template with field notes
tools/build_manifest.py     optional: regenerate books.json from content/*.json
```

**Engine vs. content are fully separated** — the engine renders purely from a book's JSON, so adding a book never touches code.

Progress is stored per book in `localStorage` under `bookquest:<bookId>`. The **Reset** button in the top bar clears the current book's progress on this device.

### Notes
- The two display fonts (Anton, Mulish) load from Google Fonts with system fallbacks, so the site still works and looks fine offline. All game data and logic are local — no other network calls.
- Respects `prefers-reduced-motion` (token hops and confetti are disabled), has visible keyboard focus, and is responsive down to phone width.
