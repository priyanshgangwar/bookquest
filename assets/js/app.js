/* app.js — boot, book library/shelf, screen router. Loads the manifest and
   each book on demand. One global namespace: window.BQ. */
(function () {
  window.BQ = window.BQ || {};

  var SCREENS = ['screen-library', 'screen-map', 'screen-lesson', 'screen-quiz', 'screen-result', 'screen-final'];
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---- router ----
  BQ.show = function (id) {
    SCREENS.forEach(function (sid) {
      var s = $(sid);
      if (sid === id) s.removeAttribute('hidden'); else s.setAttribute('hidden', '');
    });
    var inBook = id !== 'screen-library';
    var hud = $('hud');
    if (inBook) hud.removeAttribute('hidden'); else hud.setAttribute('hidden', '');
    var active = $(id);
    if (active && active.focus) active.focus();
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  BQ.toLibrary = function () { BQ.show('screen-library'); };

  // ---- library shelf ----
  function passedCount(rec) {
    var n = 0;
    for (var k in rec.completed) { if (rec.completed.hasOwnProperty(k) && rec.completed[k].passed) n++; }
    return n;
  }

  function renderLibrary(manifest) {
    var s = $('screen-library');
    s.innerHTML = '';

    var hero = el('div', 'lib-hero');
    hero.innerHTML =
      '<h1 class="lib-wordmark">Book<span class="q">Quest</span></h1>' +
      '<p class="lib-tag">Learn a book like a board game. Read short lessons, pass the tests, advance your token, collect badges.</p>' +
      '<div class="lib-dice" aria-hidden="true">🎲</div>';
    s.appendChild(hero);

    var shelf = el('div', 'shelf');
    (manifest.books || []).forEach(function (b) {
      var rec = BQ.state.load(b.id);
      var lid = el('button', 'boxlid');
      lid.type = 'button';
      lid.style.setProperty('--accent', (b.cover && b.cover.color) || '#2e7d32');
      var levels = b.levels || 0;
      var done = passedCount(rec);
      var pct = levels ? Math.round((done / levels) * 100) : 0;
      var statusLabel = done === 0 ? 'New' : (pct >= 100 ? 'Completed' : 'In progress');
      lid.innerHTML =
        '<span class="boxlid__art" aria-hidden="true">' + esc((b.cover && b.cover.emoji) || '📘') + '</span>' +
        '<h2 class="boxlid__title">' + esc(b.title) + '</h2>' +
        '<span class="boxlid__author">' + esc(b.author || '') + '</span>' +
        '<p class="boxlid__tag">' + esc(b.tagline || '') + '</p>' +
        '<div class="boxlid__foot">' +
          '<div class="track"><div class="track__fill" style="width:' + pct + '%"></div></div>' +
          '<span class="boxlid__pct">' + statusLabel + ' · ' + pct + '% · 🪙 ' + rec.xp + '</span>' +
        '</div>';
      lid.addEventListener('click', function () { openBook(b); });
      shelf.appendChild(lid);
    });

    // "add a book" affordance (points to the README)
    var add = el('div', 'boxlid boxlid--add');
    add.innerHTML = '<span class="plus">+</span><span>Add a book<br><small class="muted">drop a JSON in /content</small></span>';
    shelf.appendChild(add);

    s.appendChild(shelf);
    s.appendChild(el('footer', 'bq-foot', 'Built as a board game. Progress is saved locally in your browser.'));
    BQ.show('screen-library');
  }

  function openBook(entry) {
    fetchJSON('content/' + entry.file).then(function (book) {
      if (!book.id) book.id = entry.id;
      BQ.engine.loadBook(book);
    }).catch(function () {
      alert('Could not load "' + entry.title + '". If you opened index.html directly, run a local server instead:\n\n    python -m http.server\n\nthen open http://localhost:8000');
    });
  }

  // ---- fetch helper ----
  function fetchJSON(path) {
    return fetch(path, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    });
  }

  // ---- reset button ----
  $('hud-reset').addEventListener('click', function () {
    if (!BQ.engine.book) return;
    if (confirm('Reset all progress for "' + BQ.engine.book.title + '"? This clears XP, badges, and unlocked stations on this device.')) {
      BQ.engine.resetCurrent();
    }
  });
  $('hud-back').addEventListener('click', function () { BQ.toLibrary(); });

  // ---- boot ----
  fetchJSON('content/books.json').then(renderLibrary).catch(function () {
    var s = $('screen-library');
    s.innerHTML =
      '<div class="lib-hero"><h1 class="lib-wordmark">Book<span class="q">Quest</span></h1>' +
      '<p class="lib-tag">Couldn\'t load the library. Browsers block reading local files over <code>file://</code>.</p>' +
      '<div class="card" style="max-width:520px;margin:1rem auto;text-align:left">' +
      '<div class="card__body"><p><b>Run a tiny local server</b> from the BookQuest folder:</p>' +
      '<p style="font-family:var(--font-mono);background:var(--ink);padding:.7rem .9rem;border-radius:12px;color:#fff;font-weight:700">python -m http.server</p>' +
      '<p>then open <b>http://localhost:8000</b></p></div></div></div>';
    BQ.show('screen-library');
  });
})();
