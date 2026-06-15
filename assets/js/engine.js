/* engine.js — per-book game flow: map -> lesson -> quiz -> reward -> final.
   Renders purely from the book JSON; no book-specific logic lives here.
   Depends on: BQ.state, BQ.questions, BQ.confetti, BQ.show (app.js). */
(function () {
  window.BQ = window.BQ || {};

  var XP_PER_CORRECT = 10;
  var PERFECT_BONUS = 25;

  var E = {
    book: null,
    rec: null,
    li: 0,        // current level index
    ci: 0,        // current lesson card index
    qi: 0,        // current question index
    tally: null   // { correct, total }
  };

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---------------------------------------------------------------- HUD
  function updateHUD() {
    $('hud-title').textContent = E.book.title;
    $('hud-xp').textContent = E.rec.xp;
    $('hud-streak').textContent = E.rec.streak;
    $('hud-badges').textContent = E.rec.badges.length;
    var pct = BQ.state.overallPct(E.book, E.rec);
    $('hud-fill').style.width = pct + '%';
    $('hud-pct').textContent = pct + '%';
  }

  function persist() { BQ.state.save(E.book.id, E.rec); updateHUD(); }

  // ---------------------------------------------------------------- load
  E.loadBook = function (book) {
    E.book = book;
    E.rec = BQ.state.load(book.id);
    updateHUD();
    E.showMap();
  };

  E.resetCurrent = function () {
    E.rec = BQ.state.reset(E.book.id);
    updateHUD();
    E.showMap();
  };

  // ---------------------------------------------------------------- MAP
  E.showMap = function (hop) {
    var s = $('screen-map');
    s.innerHTML = '';

    var head = el('div', 'map-head');
    head.appendChild(el('div', null,
      '<p class="eyebrow">' + esc(E.book.journeyName || 'The Journey') + '</p>' +
      '<h2>' + esc(E.book.title) + '</h2>' +
      '<p class="sub muted">' + esc(E.book.tagline || '') + '</p>'));
    s.appendChild(head);

    var board = el('div', 'board');
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'board__track');
    svg.innerHTML = '<path class="road"></path><path class="dash"></path>';
    board.appendChild(svg);

    var currentIndex = -1;
    E.book.levels.forEach(function (lvl, i) {
      var status = BQ.state.statusOf(E.book, E.rec, i);
      if (status === 'current') currentIndex = i;
      var node = el('div', 'node');
      var tag = status === 'locked' ? 'div' : 'button';
      var st = el(tag, 'station station--' + status + (i === E.book.levels.length - 1 ? ' station--boss' : ''));
      if (tag === 'button') { st.type = 'button'; }
      st.appendChild(el('span', 'station__num', String(i + 1)));
      st.appendChild(el('span', 'station__icon', lvl.icon || '◆'));
      st.appendChild(el('span', 'station__title', esc(lvl.title)));
      var c = E.rec.completed[lvl.id];
      st.appendChild(el('span', 'station__meta', c ? (c.score + '/' + c.total + (c.perfect ? ' ★' : '')) : (lvl.questions ? lvl.questions.length + ' tests' : '')));
      if (status === 'locked') {
        st.appendChild(el('span', 'station__lock', '🔒'));
      } else {
        st.addEventListener('click', function () { E.openLevel(i); });
      }
      if (status === 'current') {
        var token = el('span', 'token' + (hop ? ' token--hop' : ''), '♟');
        st.appendChild(token);
      }
      node.appendChild(st);
      board.appendChild(node);
    });

    s.appendChild(board);
    s.appendChild(el('footer', 'bq-foot',
      'Tap the glowing station to play. Progress saves automatically on this device.'));

    BQ.show('screen-map');
    // draw the winding track once tiles have a layout
    requestAnimationFrame(function () { layoutTrack(board, svg); });
    E._activeBoard = { board: board, svg: svg };
  };

  function layoutTrack(board, svg) {
    var stations = board.querySelectorAll('.station');
    if (!stations.length) return;
    var br = board.getBoundingClientRect();
    var pts = [];
    stations.forEach(function (st) {
      var r = st.getBoundingClientRect();
      pts.push([r.left - br.left + r.width / 2, r.top - br.top + r.height / 2]);
    });
    var w = board.clientWidth, h = board.clientHeight;
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    var d = smoothPath(pts);
    svg.querySelector('.road').setAttribute('d', d);
    svg.querySelector('.dash').setAttribute('d', d);
  }

  // Catmull-Rom -> cubic Bezier, for a gentle winding trail through the tiles
  function smoothPath(p) {
    if (p.length < 2) return '';
    var d = 'M' + p[0][0] + ',' + p[0][1];
    for (var i = 0; i < p.length - 1; i++) {
      var p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += 'C' + c1x + ',' + c1y + ' ' + c2x + ',' + c2y + ' ' + p2[0] + ',' + p2[1];
    }
    return d;
  }

  // relayout the track on resize while the map is on screen
  var rzT;
  window.addEventListener('resize', function () {
    if ($('screen-map').hasAttribute('hidden') || !E._activeBoard) return;
    clearTimeout(rzT);
    rzT = setTimeout(function () { layoutTrack(E._activeBoard.board, E._activeBoard.svg); }, 120);
  });

  // ---------------------------------------------------------------- LESSON
  E.openLevel = function (index) {
    if (!BQ.state.isUnlocked(E.book, E.rec, index)) return;
    E.li = index; E.ci = 0;
    renderLesson();
  };

  function renderLesson() {
    var lvl = E.book.levels[E.li];
    var lessons = lvl.lessons || [];
    var s = $('screen-lesson');
    s.innerHTML = '';
    var wrap = el('div', 'lesson-wrap');

    wrap.appendChild(el('div', 'lesson-top',
      '<div><p class="eyebrow">Station ' + (E.li + 1) + ' · Learn</p>' +
      '<h2 class="display" style="font-size:clamp(1.4rem,4.5vw,2rem)">' + esc(lvl.title) + '</h2></div>' +
      '<span class="station__icon" aria-hidden="true">' + (lvl.icon || '') + '</span>'));

    var deck = el('div', 'deck');
    var card = el('article', 'card');
    var l = lessons[E.ci] || { heading: '', body: '' };
    var bodyHTML = '<p>' + String(l.body || '').split('\n\n').map(esc).join('</p><p>') + '</p>';
    card.innerHTML =
      '<p class="card__kicker">' + esc(lvl.title) + ' · ' + (E.ci + 1) + ' / ' + lessons.length + '</p>' +
      '<h3 class="card__h">' + esc(l.heading || '') + '</h3>' +
      '<div class="card__body">' + bodyHTML + '</div>' +
      (l.quote ? '<blockquote class="card__quote">“' + esc(l.quote) + '”</blockquote>' : '');
    deck.appendChild(card);
    wrap.appendChild(deck);

    var nav = el('div', 'deck-nav');
    var back = el('button', 'btn btn--ghost', E.ci === 0 ? '◀ Map' : '◀ Back');
    back.type = 'button';
    back.addEventListener('click', function () {
      if (E.ci === 0) E.showMap(); else { E.ci--; renderLesson(); }
    });
    var dots = el('div', 'dots');
    lessons.forEach(function (_, i) { dots.appendChild(el('span', 'dot' + (i === E.ci ? ' dot--on' : ''))); });
    var next = el('button', 'btn', E.ci < lessons.length - 1 ? 'Next ▶' : 'Take the test ▶');
    next.type = 'button';
    next.addEventListener('click', function () {
      if (E.ci < lessons.length - 1) { E.ci++; renderLesson(); }
      else startQuiz();
    });
    nav.appendChild(back); nav.appendChild(dots); nav.appendChild(next);
    wrap.appendChild(nav);

    s.appendChild(wrap);
    BQ.show('screen-lesson');
  }

  // ---------------------------------------------------------------- QUIZ
  function startQuiz() {
    E.qi = 0;
    E.tally = { correct: 0, total: (E.book.levels[E.li].questions || []).length };
    renderQuestion();
  }

  function renderQuestion() {
    var lvl = E.book.levels[E.li];
    var qs = lvl.questions || [];
    var q = qs[E.qi];
    var s = $('screen-quiz');
    s.innerHTML = '';
    var wrap = el('div', 'quiz-wrap');

    wrap.appendChild(el('div', 'quiz-top',
      '<span class="quiz-count">Question ' + (E.qi + 1) + ' of ' + qs.length + '</span>' +
      '<span class="qtype-tag">' + esc(BQ.questions.label(q.type)) + '</span>'));
    wrap.appendChild(el('p', 'q-stem', esc(q.q || q.prompt || '')));

    var card = el('article', 'card');
    var inner = el('div', 'card__body');
    var mount = el('div', 'q-mount');
    inner.appendChild(mount);
    var feedback = el('div', 'feedback');
    feedback.innerHTML = '<div class="feedback__head"></div><div class="feedback__body"></div>';
    inner.appendChild(feedback);
    card.appendChild(inner);
    wrap.appendChild(card);

    var actions = el('div', 'quiz-actions');
    var checkBtn = el('button', 'btn', 'Check');
    checkBtn.type = 'button'; checkBtn.disabled = true;
    var nextBtn = el('button', 'btn', E.qi < qs.length - 1 ? 'Next ▶' : 'Finish ▶');
    nextBtn.type = 'button'; nextBtn.style.display = 'none';
    actions.appendChild(checkBtn); actions.appendChild(nextBtn);
    wrap.appendChild(actions);

    s.appendChild(wrap);
    BQ.show('screen-quiz');

    var ctrl = BQ.questions.mount(q, mount, {
      onChange: function () { checkBtn.disabled = !ctrl.canCheck(); }
    });

    checkBtn.addEventListener('click', function () {
      if (!ctrl.canCheck()) return;
      var res = ctrl.check();
      recordAnswer(res.correct);
      feedback.className = 'feedback show ' + (res.correct ? 'feedback--ok' : 'feedback--no');
      feedback.querySelector('.feedback__head').innerHTML =
        (res.correct ? '✓ ' + pickPraise() : '✗ Not quite') + ' <span style="font-family:var(--font-mono);font-size:.8rem;opacity:.8">' + (res.correct ? '+' + XP_PER_CORRECT + ' XP' : '') + '</span>';
      feedback.querySelector('.feedback__body').innerHTML = res.explainHTML;
      checkBtn.style.display = 'none';
      nextBtn.style.display = '';
      nextBtn.focus();
    });

    nextBtn.addEventListener('click', function () {
      if (E.qi < qs.length - 1) { E.qi++; renderQuestion(); }
      else finishLevel();
    });
  }

  var PRAISE = ['Cha-ching!', 'Money move.', 'Rich Dad nods.', 'Asset acquired.', 'Smart play.'];
  function pickPraise() { return PRAISE[(Math.random() * PRAISE.length) | 0]; }

  function recordAnswer(correct) {
    if (correct) {
      E.tally.correct++;
      E.rec.xp += XP_PER_CORRECT;
      E.rec.streak++;
      if (E.rec.streak > E.rec.bestStreak) E.rec.bestStreak = E.rec.streak;
    } else {
      E.rec.streak = 0;
    }
    persist();
  }

  // ---------------------------------------------------------------- FINISH
  function finishLevel() {
    var lvl = E.book.levels[E.li];
    var total = E.tally.total;
    var correct = E.tally.correct;
    var pct = total ? correct / total : 1;
    var perfect = total > 0 && correct === total;
    var passed = pct >= BQ.state.passThreshold(E.book);
    var isBoss = E.li === E.book.levels.length - 1;

    if (perfect) E.rec.xp += PERFECT_BONUS;

    // keep best score; passed is sticky
    var prev = E.rec.completed[lvl.id];
    var bestScore = prev ? Math.max(prev.score, correct) : correct;
    E.rec.completed[lvl.id] = {
      score: bestScore, total: total,
      perfect: (prev && prev.perfect) || perfect,
      passed: (prev && prev.passed) || passed
    };

    var newBadge = null;
    if (passed && lvl.badge && E.rec.badges.indexOf(lvl.badge.name) === -1) {
      E.rec.badges.push(lvl.badge.name);
      newBadge = lvl.badge;
    }
    persist();

    if (isBoss) showFinal(correct, total, pct);
    else showResult({ correct: correct, total: total, perfect: perfect, passed: passed, badge: newBadge, lvl: lvl });
  }

  // ---------------------------------------------------------------- RESULT
  function showResult(r) {
    var s = $('screen-result');
    s.innerHTML = '';
    var wrap = el('div', 'result-wrap');
    var pass = r.passed;

    wrap.appendChild(el('div', 'reward-emoji', pass ? (r.perfect ? '🏆' : '🎉') : '🧭'));
    wrap.appendChild(el('h2', null, pass ? (r.perfect ? 'Flawless!' : 'Station cleared!') : 'Almost there'));
    wrap.appendChild(el('p', 'scoreline', 'You scored ' + r.correct + ' / ' + r.total +
      (pass ? '' : ' — you need ' + Math.ceil(BQ.state.passThreshold(E.book) * r.total) + ' to advance')));

    if (r.badge) {
      var b = el('div', 'badge');
      b.innerHTML = '<span class="badge__icon">' + esc(r.badge.icon || '🏅') + '</span><span class="badge__name">' + esc(r.badge.name) + '</span>';
      wrap.appendChild(b);
    }

    wrap.appendChild(el('div', 'reward-tallies',
      '<div class="tally"><b>' + E.rec.xp + '</b><span>Total XP</span></div>' +
      '<div class="tally"><b>' + E.rec.streak + '</b><span>Streak 🔥</span></div>' +
      '<div class="tally"><b>' + BQ.state.overallPct(E.book, E.rec) + '%</b><span>Journey</span></div>'));

    var actions = el('div', 'result-actions');
    if (pass) {
      var cont = el('button', 'btn btn--lg', 'Continue journey ▶');
      cont.type = 'button';
      cont.addEventListener('click', function () { E.showMap(true); });
      actions.appendChild(cont);
    } else {
      var retry = el('button', 'btn btn--lg', '↻ Try again');
      retry.type = 'button';
      retry.addEventListener('click', function () { E.openLevel(E.li); });
      actions.appendChild(retry);
      var toMap = el('button', 'btn btn--ghost', 'Back to map');
      toMap.type = 'button';
      toMap.addEventListener('click', function () { E.showMap(); });
      actions.appendChild(toMap);
    }
    wrap.appendChild(actions);
    s.appendChild(wrap);
    BQ.show('screen-result');
    if (pass) BQ.confetti.burst({ count: r.perfect ? 180 : 120 });
  }

  // ---------------------------------------------------------------- FINAL
  function showFinal(correct, total, pct) {
    var grades = (E.book.finalGrades || []).slice().sort(function (a, b) { return a.minPct - b.minPct; });
    var p100 = Math.round(pct * 100);
    var grade = grades[0] || { title: 'Graduate', blurb: '' };
    for (var i = 0; i < grades.length; i++) { if (p100 >= grades[i].minPct) grade = grades[i]; }

    var s = $('screen-final');
    s.innerHTML = '';
    var wrap = el('div', 'final-wrap');
    wrap.appendChild(el('div', 'reward-emoji', '🏁'));
    wrap.appendChild(el('h2', null, 'Financial Freedom Exam'));
    wrap.appendChild(el('p', 'scoreline', 'Final score ' + correct + ' / ' + total + ' · ' + p100 + '%'));

    var cert = el('article', 'cert');
    cert.innerHTML =
      '<p class="eyebrow">Your rank</p>' +
      '<h3 class="grade-title">' + esc(grade.title) + '</h3>' +
      '<p class="grade-blurb">' + esc(grade.blurb || '') + '</p>';
    var gallery = el('div', 'badge-gallery');
    E.book.levels.forEach(function (lvl) {
      if (!lvl.badge) return;
      var earned = E.rec.badges.indexOf(lvl.badge.name) !== -1;
      gallery.appendChild(el('span', 'minibadge' + (earned ? '' : ' minibadge--off'), esc(lvl.badge.icon || '🏅')));
    });
    cert.appendChild(gallery);
    wrap.appendChild(cert);

    var actions = el('div', 'result-actions');
    var toMap = el('button', 'btn btn--lg', 'Back to the board ▶');
    toMap.type = 'button';
    toMap.addEventListener('click', function () { E.showMap(); });
    actions.appendChild(toMap);
    var toLib = el('button', 'btn btn--ghost', 'Library');
    toLib.type = 'button';
    toLib.addEventListener('click', function () { BQ.toLibrary(); });
    actions.appendChild(toLib);
    wrap.appendChild(actions);

    s.appendChild(wrap);
    BQ.show('screen-final');
    BQ.confetti.burst({ count: 220 });
  }

  BQ.engine = E;
})();
