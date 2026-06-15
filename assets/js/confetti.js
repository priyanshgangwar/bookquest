/* confetti.js — tiny offline canvas burst. No libraries, no network.
   Respects prefers-reduced-motion (becomes a no-op). */
(function () {
  window.BQ = window.BQ || {};

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var COLORS = ['#8b5cf6', '#ec4899', '#22c55e', '#fbbf24', '#38bdf8', '#fb5a76'];

  BQ.confetti = {
    burst: function (opts) {
      opts = opts || {};
      var canvas = document.getElementById('confetti-canvas');
      if (!canvas || reduced) return;

      var ctx = canvas.getContext('2d');
      var dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var n = opts.count || 130;
      var originX = (opts.x != null ? opts.x : window.innerWidth / 2);
      var originY = (opts.y != null ? opts.y : window.innerHeight * 0.35);
      var parts = [];
      for (var i = 0; i < n; i++) {
        var ang = Math.random() * Math.PI * 2;
        var spd = 4 + Math.random() * 9;
        parts.push({
          x: originX, y: originY,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 6,
          size: 5 + Math.random() * 7,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.3,
          color: COLORS[(Math.random() * COLORS.length) | 0],
          life: 1
        });
      }

      var start = performance.now();
      function frame(now) {
        var dt = Math.min(32, now - (frame._t || now)); frame._t = now;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        var alive = false;
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i];
          p.vy += 0.28 * (dt / 16);
          p.vx *= 0.99;
          p.x += p.vx * (dt / 16);
          p.y += p.vy * (dt / 16);
          p.rot += p.vr;
          p.life -= 0.006 * (dt / 16);
          if (p.life > 0 && p.y < window.innerHeight + 40) {
            alive = true;
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            ctx.restore();
          }
        }
        if (alive && now - start < 4000) {
          requestAnimationFrame(frame);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      requestAnimationFrame(frame);
    }
  };
})();
