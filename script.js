(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  document.documentElement.classList.add('js');

  // 1. Tiles rise in when they scroll into view
  var cards = document.querySelectorAll('.card');
  cards.forEach(function (card, i) {
    card.style.setProperty('--i', i);
  });

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    cards.forEach(function (card) { observer.observe(card); });
  } else {
    cards.forEach(function (card) { card.classList.add('in'); });
  }

  // 2. Tiles tilt and light up under the cursor (mouse devices only)
  if (window.matchMedia('(hover: hover)').matches) {
    cards.forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width;
        var y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', (x * 100) + '%');
        card.style.setProperty('--my', (y * 100) + '%');
        card.style.transform =
          'perspective(900px) rotateX(' + ((0.5 - y) * 8) + 'deg) rotateY(' + ((x - 0.5) * 8) + 'deg) translateY(-6px)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transform = '';
      });
    });
  }

  // 3. Slow floating gold dust in the background
  var canvas = document.getElementById('dust');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w, h;
  var specks = [];

  function resize() {
    w = canvas.width = window.innerWidth * dpr;
    h = canvas.height = window.innerHeight * dpr;
  }

  function makeSpeck() {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      r: (Math.random() * 1.4 + 0.4) * dpr,
      v: (Math.random() * 0.25 + 0.08) * dpr,
      a: Math.random() * 0.5 + 0.15,
      p: Math.random() * 6.28
    };
  }

  resize();
  for (var i = 0; i < 45; i++) specks.push(makeSpeck());
  window.addEventListener('resize', resize);

  function frame(t) {
    ctx.clearRect(0, 0, w, h);
    specks.forEach(function (s) {
      s.y -= s.v;
      s.x += Math.sin(t / 2000 + s.p) * 0.25 * dpr;
      if (s.y < -10) {
        s.y = h + 10;
        s.x = Math.random() * w;
      }
      var twinkle = 0.6 + 0.4 * Math.sin(t / 900 + s.p);
      ctx.beginPath();
      ctx.fillStyle = 'rgba(236, 208, 152, ' + (s.a * twinkle) + ')';
      ctx.arc(s.x, s.y, s.r, 0, 6.283);
      ctx.fill();
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
