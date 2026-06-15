# BookQuest — Project Overview

**Goal:** A gamified, hostable web platform that turns books into an interactive board-game journey — read short Claude-written lessons, prove mastery through varied mini-tests, and progress with XP, badges, streaks, and unlockable levels. First book: *Rich Dad Poor Dad*.

**Why:** Make learning a book stick by turning it into a game, and build something polished enough to host and grow (more books over time).

**Status (2026-06-16):** v1 built and playable. Data-driven engine + first full book (8 levels, ~37 questions across all 4 types) complete.

---

## What it is
- **Vanilla static site** — plain HTML/CSS/JS, no build step, no dependencies, host-agnostic (GitHub Pages / Netlify / Vercel).
- **Engine ≠ content.** A reusable game engine renders entirely from per-book JSON. Adding a book = drop a JSON + one manifest line (or run `build_manifest.py`); engine code is never touched.
- **Theme — "Game Night":** deep board-felt green table, parchment "title-deed" lesson cards, brass/gold accents (token, coins, badges); the **winding board path** is the signature element. Type: Anton (board banner) / Mulish (body) / system mono (XP odometer). Grounded in Kiyosaki's CASHFLOW board game.

## Key files
- `index.html` — app shell; screens toggled by JS.
- `assets/css/styles.css` — full theme + components + animations.
- `assets/js/{confetti,state,questions,engine,app}.js` — confetti, localStorage progress, question renderers/scoring, game flow, boot+library+router.
- `content/{books.json, rich-dad-poor-dad.json, _TEMPLATE.json}` — manifest, first book, blank template.
- `tools/build_manifest.py` — optional manifest regenerator.
- `[C] README.md` — run locally, deploy, "how to add a book".

## Gameplay
- 8 stations on a board, unlock-as-you-go. Per station: Learn (swipeable cards) → Test (3–5 mixed questions, instant feedback + explanation) → Reward (XP, confetti, badge, streak, next station unlocks).
- Question types: multiple choice, true/false, scenario ("What would Rich Dad do?"), drag-to-sort (assets vs. liabilities; mouse drag + tap fallback).
- Pass threshold 60% to advance; last station is the boss "Financial Freedom Exam" → final grade (Poor Dad → Middle Class → Rich Dad).
- Progress saved per book in `localStorage` (`bookquest:<bookId>`); Reset button clears it.

## Open problems / next
1. ~~Build the platform + first book~~ ✅ Done — 2026-06-16
2. QA in a browser (run `python -m http.server`, play through; check drag-sort on a narrow viewport).
3. Add more books (copy `_TEMPLATE.json`, run `build_manifest.py`).
4. Optional polish: sound effects, daily streak (calendar), more question types, share/export grade.
5. Optional: deploy to GitHub Pages / Netlify for a live link.
