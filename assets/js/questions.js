/* questions.js — renders + scores each question type.
   Contract: BQ.questions.mount(question, mountEl, { onChange }) -> controller
     controller.canCheck()  -> bool  (enough input to grade)
     controller.check()     -> { correct: bool, explainHTML: string }
                               (also reveals right/wrong visually + locks input)
   Types: mcq, tf, scenario (mcq-like), sort (drag + tap fallback). */
(function () {
  window.BQ = window.BQ || {};
  var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function explainHTML(q, correct) {
    var lead = correct ? '' : '';
    return (q.explain ? esc(q.explain) : (correct ? 'Correct.' : 'Not quite.')) + lead;
  }

  // ---- choice-based (mcq / scenario / tf share this core) ----
  function mountChoice(q, mount, opts, choices, answerIndex) {
    var sel = -1;
    var locked = false;
    var box = el('div', q.type === 'tf' ? 'tf' : 'options');
    var btns = [];

    choices.forEach(function (text, i) {
      var b = el('button', 'opt');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      if (q.type !== 'tf') {
        b.appendChild(el('span', 'opt__key', LETTERS[i]));
      }
      b.appendChild(el('span', 'opt__text', esc(text)));
      b.addEventListener('click', function () {
        if (locked) return;
        sel = i;
        btns.forEach(function (x, j) {
          x.classList.toggle('opt--sel', j === i);
          x.setAttribute('aria-pressed', j === i ? 'true' : 'false');
        });
        opts.onChange && opts.onChange();
      });
      btns.push(b);
      box.appendChild(b);
    });
    mount.appendChild(box);

    return {
      canCheck: function () { return sel >= 0; },
      check: function () {
        locked = true;
        var correct = sel === answerIndex;
        btns.forEach(function (b, i) {
          b.disabled = true;
          if (i === answerIndex) b.classList.add('opt--correct');
          else if (i === sel) b.classList.add('opt--wrong');
        });
        return { correct: correct, explainHTML: explainHTML(q, correct) };
      }
    };
  }

  // ---- drag-to-sort ----
  function mountSort(q, mount, opts) {
    var buckets = q.buckets || ['A', 'B'];
    var items = q.items || [];
    var placed = items.map(function () { return null; }); // index -> bucket name
    var locked = false;
    var picked = -1; // tap-to-place selection

    var tray = el('div', 'sort-tray');
    var bucketsWrap = el('div', 'buckets');
    var bucketBodies = {};

    if (q.prompt) mount.appendChild(el('p', 'q-substem muted', esc(q.prompt)));
    mount.appendChild(tray);
    mount.appendChild(bucketsWrap);

    buckets.forEach(function (name) {
      var b = el('div', 'bucket');
      b.appendChild(el('div', 'bucket__label', esc(name)));
      var body = el('div', 'bucket__items');
      b.appendChild(body);
      bucketBodies[name] = body;
      bucketsWrap.appendChild(b);
      wireDrop(b, name);
    });

    function makeChip(i) {
      var chip = el('button', 'chip');
      chip.type = 'button';
      chip.setAttribute('draggable', 'true');
      chip.dataset.i = i;
      chip.innerHTML = esc(items[i].text);
      chip.addEventListener('dragstart', function (e) {
        if (locked) return;
        e.dataTransfer.setData('text/plain', String(i));
        e.dataTransfer.effectAllowed = 'move';
      });
      chip.addEventListener('click', function () {
        if (locked) return;
        if (picked === i) { clearPick(); return; }
        clearPick();
        picked = i;
        chip.classList.add('chip--picked');
      });
      return chip;
    }
    function clearPick() {
      if (picked >= 0) {
        var prev = mount.querySelector('.chip--picked');
        if (prev) prev.classList.remove('chip--picked');
      }
      picked = -1;
    }
    function place(i, bucketName) {
      if (locked) return;
      placed[i] = bucketName;
      render();
      clearPick();
      opts.onChange && opts.onChange();
    }
    function wireDrop(zone, bucketName) {
      zone.addEventListener('dragover', function (e) { if (locked) return; e.preventDefault(); zone.classList.add('drop-hot'); });
      zone.addEventListener('dragleave', function () { zone.classList.remove('drop-hot'); });
      zone.addEventListener('drop', function (e) {
        if (locked) return;
        e.preventDefault(); zone.classList.remove('drop-hot');
        var i = parseInt(e.dataTransfer.getData('text/plain'), 10);
        if (!isNaN(i)) place(i, bucketName);
      });
      // tap-to-place: tapping a bucket drops the picked chip
      zone.addEventListener('click', function () {
        if (locked || picked < 0) return;
        place(picked, bucketName);
      });
    }
    // tray as a drop target (to return a chip)
    tray.addEventListener('dragover', function (e) { if (locked) return; e.preventDefault(); tray.classList.add('drop-hot'); });
    tray.addEventListener('dragleave', function () { tray.classList.remove('drop-hot'); });
    tray.addEventListener('drop', function (e) {
      if (locked) return;
      e.preventDefault(); tray.classList.remove('drop-hot');
      var i = parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (!isNaN(i)) place(i, null);
    });
    tray.addEventListener('click', function (e) {
      if (locked || picked < 0 || e.target !== tray) return;
      place(picked, null);
    });

    function render() {
      tray.innerHTML = '';
      buckets.forEach(function (n) { bucketBodies[n].innerHTML = ''; });
      placed.forEach(function (bucketName, i) {
        var chip = makeChip(i);
        if (bucketName == null) tray.appendChild(chip);
        else bucketBodies[bucketName].appendChild(chip);
      });
    }
    render();

    return {
      canCheck: function () { return placed.every(function (p) { return p != null; }); },
      check: function () {
        locked = true;
        var correct = true;
        // re-render with lock + per-chip correctness marks
        tray.innerHTML = '';
        buckets.forEach(function (n) { bucketBodies[n].innerHTML = ''; });
        placed.forEach(function (bucketName, i) {
          var ok = bucketName === items[i].bucket;
          if (!ok) correct = false;
          var chip = el('span', 'chip ' + (ok ? 'chip--ok' : 'chip--no'));
          chip.setAttribute('draggable', 'false');
          chip.innerHTML = esc(items[i].text) + ' ' + (ok ? '✓' : '✗');
          (bucketName == null ? tray : bucketBodies[bucketName]).appendChild(chip);
        });
        return { correct: correct, explainHTML: explainHTML(q, correct) };
      }
    };
  }

  BQ.questions = {
    label: function (type) {
      return { mcq: 'Multiple choice', tf: 'True / False', scenario: 'What would Rich Dad do?', sort: 'Sort it out' }[type] || type;
    },
    mount: function (q, mount, opts) {
      opts = opts || {};
      mount.innerHTML = '';
      switch (q.type) {
        case 'tf':
          return mountChoice(q, mount, opts, ['True', 'False'], q.answer ? 0 : 1);
        case 'sort':
          return mountSort(q, mount, opts);
        case 'mcq':
        case 'scenario':
        default:
          return mountChoice(q, mount, opts, q.options || [], q.answer || 0);
      }
    }
  };
})();
