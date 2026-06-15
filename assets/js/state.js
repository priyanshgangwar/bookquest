/* state.js — per-book progress in localStorage.
   One record per book under key "bookquest:<bookId>". Reads are
   migration-tolerant: missing/old/corrupt data falls back to safe defaults. */
(function () {
  window.BQ = window.BQ || {};
  var PREFIX = 'bookquest:';

  function defaults() {
    return {
      xp: 0,
      streak: 0,
      bestStreak: 0,
      completed: {},   // levelId -> { score, total, perfect, passed }
      badges: [],      // badge names earned (in order)
      v: 1
    };
  }

  var State = {
    load: function (bookId) {
      var rec = defaults();
      try {
        var raw = localStorage.getItem(PREFIX + bookId);
        if (raw) {
          var parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            rec.xp = +parsed.xp || 0;
            rec.streak = +parsed.streak || 0;
            rec.bestStreak = +parsed.bestStreak || 0;
            rec.completed = (parsed.completed && typeof parsed.completed === 'object') ? parsed.completed : {};
            rec.badges = Array.isArray(parsed.badges) ? parsed.badges : [];
          }
        }
      } catch (e) { /* corrupt -> defaults */ }
      return rec;
    },

    save: function (bookId, rec) {
      try { localStorage.setItem(PREFIX + bookId, JSON.stringify(rec)); }
      catch (e) { /* storage full / blocked — ignore, game still works in-session */ }
    },

    reset: function (bookId) {
      try { localStorage.removeItem(PREFIX + bookId); } catch (e) {}
      return defaults();
    },

    // --- derived helpers (pure) ---
    passThreshold: function (book) {
      return typeof book.passThreshold === 'number' ? book.passThreshold : 0.6;
    },

    isPassed: function (rec, levelId) {
      var c = rec.completed[levelId];
      return !!(c && c.passed);
    },

    // a level is unlocked if it's the first, or the previous level was passed
    isUnlocked: function (book, rec, index) {
      if (index <= 0) return true;
      var prev = book.levels[index - 1];
      return State.isPassed(rec, prev.id);
    },

    statusOf: function (book, rec, index) {
      if (!State.isUnlocked(book, rec, index)) return 'locked';
      if (State.isPassed(rec, book.levels[index].id)) return 'done';
      // current = first unlocked-but-not-passed level
      for (var i = 0; i < book.levels.length; i++) {
        if (State.isUnlocked(book, rec, i) && !State.isPassed(rec, book.levels[i].id)) {
          return i === index ? 'current' : 'unlocked';
        }
      }
      return 'unlocked';
    },

    overallPct: function (book, rec) {
      var total = book.levels.length;
      if (!total) return 0;
      var done = 0;
      for (var i = 0; i < total; i++) {
        if (State.isPassed(rec, book.levels[i].id)) done++;
      }
      return Math.round((done / total) * 100);
    }
  };

  BQ.state = State;
})();
