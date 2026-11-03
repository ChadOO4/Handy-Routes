(function () {
  'use strict';

  var EMAIL = 'together.handyroutes@gmail.com';
  var WORLD_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

  /* ===== EDIT HERE: add, remove or change places =====
     lat / lon  : decimal degrees (south and west are negative)
     countryId  : optional ISO numeric code, lights up that country
                  (United Kingdom 826, Canada 124, UAE 784)
     status     : short badge text shown on the card
     text       : what you want visitors to read about the place */
  var PLACES = [
    {
      name: 'Cambridge',
      country: 'United Kingdom',
      countryId: '826',
      lat: 52.2053,
      lon: 0.1218,
      status: 'Home base',
      text: 'Where HandyRoutes starts: cleaning, transportation and maintenance, and our first community work.'
    },
    {
      name: 'Canada',
      country: 'Canada',
      countryId: '124',
      lat: 56.13,
      lon: -106.35,
      status: 'On our map',
      text: 'A place we want to reach as we grow. Want HandyRoutes there? Tell us.'
    },
    {
      name: 'Dubai',
      country: 'United Arab Emirates',
      countryId: '784',
      lat: 25.2048,
      lon: 55.2708,
      status: 'On our map',
      text: 'Another place on our list for the future. Want HandyRoutes there? Tell us.'
    }
  ];

  var HOME = PLACES[0];

  /* ---------- Places list and info card (work even if the globe fails) ---------- */

  var chipsEl = document.getElementById('globe-chips');
  var cardEl = document.getElementById('globe-card');
  var selected = null;
  var onSelect = function () {};

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  }

  function renderChips() {
    if (!chipsEl) return;
    PLACES.forEach(function (p) {
      var b = el('button', 'chip', p.name);
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { selectPlace(p); });
      p._chip = b;
      chipsEl.appendChild(b);
    });
  }

  function renderCard() {
    if (!cardEl) return;
    cardEl.textContent = '';
    if (!selected) {
      cardEl.appendChild(el('p', 'place-hint', 'Tap a pin on the globe, or pick a place above, to explore.'));
      return;
    }
    cardEl.appendChild(el('span', 'place-badge', selected.status));
    cardEl.appendChild(el('h3', 'place-name', selected.name));
    cardEl.appendChild(el('p', 'place-country', selected.country));
    cardEl.appendChild(el('p', 'place-text', selected.text));
    var link = el('a', 'btn btn-solid place-link', 'Email us about ' + selected.name);
    link.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent('HandyRoutes in ' + selected.name);
    cardEl.appendChild(link);
  }

  function selectPlace(p) {
    selected = p;
    PLACES.forEach(function (q) {
      if (q._chip) q._chip.setAttribute('aria-pressed', q === p ? 'true' : 'false');
    });
    renderCard();
    onSelect(p);
  }

  renderChips();
  renderCard();

  /* ---------- The globe ---------- */

  var canvas = document.getElementById('globe');
  var statusEl = document.getElementById('globe-status');

  function fail(message) {
    if (statusEl) { statusEl.hidden = false; statusEl.textContent = message; }
    if (canvas) canvas.style.visibility = 'hidden';
  }

  if (!canvas || !canvas.getContext) return;

  if (typeof d3 === 'undefined' || typeof topojson === 'undefined') {
    fail('The globe could not load, but you can still explore our places below.');
    return;
  }

  d3.json(WORLD_URL).then(start).catch(function () {
    fail('The globe could not load, but you can still explore our places below.');
  });

  function start(world) {
    var countries = topojson.feature(world, world.objects.countries).features;
    var borders = topojson.mesh(world, world.objects.countries, function (a, b) { return a !== b; });

    var lit = {};
    PLACES.forEach(function (p) { if (p.countryId) lit[p.countryId] = true; });
    var plain = [];
    var glowing = [];
    countries.forEach(function (f) {
      (lit[String(f.id)] ? glowing : plain).push(f);
    });

    var ctx = canvas.getContext('2d');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var projection = d3.geoOrthographic().clipAngle(90).precision(0.6);
    var path = d3.geoPath(projection, ctx);
    var graticule = d3.geoGraticule10();
    var sphere = { type: 'Sphere' };

    var size = 360;
    var R = 170;
    var zoom = 1;
    var rotation = [-HOME.lon, -HOME.lat * 0.6, 0];
    var spinning = !reduce;
    var dragging = false;
    var moved = false;
    var startPt = null;
    var last = null;
    var anim = null;
    var lastT = 0;

    var spinBtn = document.getElementById('globe-spin');

    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    function syncSpin() {
      if (!spinBtn) return;
      spinBtn.setAttribute('aria-pressed', spinning ? 'true' : 'false');
      spinBtn.textContent = spinning ? 'Pause spin' : 'Spin';
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = canvas.clientWidth || 360;
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = size / 2 - 6;
    }

    function facing(p) {
      return d3.geoDistance([-rotation[0], -rotation[1]], [p.lon, p.lat]) < Math.PI / 2 - 0.03;
    }

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function drawLabel(text, x, y, active) {
      ctx.font = '600 13px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
      var w = ctx.measureText(text).width + 18;
      var h = 24;
      var lx = clamp(x - w / 2, 4, size - w - 4);
      var ly = Math.max(4, y - 16 - h);
      roundRect(lx, ly, w, h, 12);
      ctx.fillStyle = active ? '#1e5a2d' : 'rgba(255, 255, 255, 0.95)';
      ctx.fill();
      ctx.fillStyle = active ? '#ffffff' : '#1e5a2d';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, lx + w / 2, ly + h / 2 + 0.5);
    }

    function draw(t) {
      projection.translate([size / 2, size / 2]).scale(R * zoom).rotate(rotation);
      ctx.clearRect(0, 0, size, size);

      // Ocean
      ctx.beginPath();
      path(sphere);
      var ocean = ctx.createRadialGradient(size * 0.38, size * 0.32, R * 0.1, size / 2, size / 2, R * zoom);
      ocean.addColorStop(0, '#5db0e8');
      ocean.addColorStop(1, '#13507f');
      ctx.fillStyle = ocean;
      ctx.fill();

      // Grid lines
      ctx.beginPath();
      path(graticule);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.13)';
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // Land
      ctx.beginPath();
      plain.forEach(function (f) { path(f); });
      ctx.fillStyle = '#4c9a47';
      ctx.fill();

      // Countries we mention
      ctx.beginPath();
      glowing.forEach(function (f) { path(f); });
      ctx.fillStyle = '#9ee08a';
      ctx.fill();

      // Borders
      ctx.beginPath();
      path(borders);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Light and shadow to make it look round
      ctx.beginPath();
      path(sphere);
      var shade = ctx.createRadialGradient(size * 0.36, size * 0.3, R * 0.15, size / 2, size / 2, R * zoom);
      shade.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
      shade.addColorStop(0.55, 'rgba(255, 255, 255, 0)');
      shade.addColorStop(1, 'rgba(0, 25, 50, 0.45)');
      ctx.fillStyle = shade;
      ctx.fill();

      // Pins
      var pulse = reduce ? 0.4 : ((t / 1500) % 1);
      PLACES.forEach(function (p) {
        p._xy = null;
        if (!facing(p)) return;
        var xy = projection([p.lon, p.lat]);
        if (!xy) return;
        p._xy = xy;
        var active = p === selected;

        ctx.beginPath();
        ctx.arc(xy[0], xy[1], 6 + pulse * 11, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, ' + (0.85 * (1 - pulse)) + ')';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(xy[0], xy[1], active ? 7.5 : 5.5, 0, Math.PI * 2);
        ctx.fillStyle = active ? '#ffd84d' : '#ffffff';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#1e5a2d';
        ctx.stroke();

        if (active || zoom > 1.2 || p === hovered) drawLabel(p.name, xy[0], xy[1], active);
      });
    }

    var hovered = null;

    function frame(t) {
      var dt = Math.min(50, (t - lastT) || 16);
      lastT = t;

      if (anim) {
        var k = Math.min(1, (t - anim.t0) / anim.dur);
        var e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        rotation[0] = anim.r0[0] + (anim.r1[0] - anim.r0[0]) * e;
        rotation[1] = anim.r0[1] + (anim.r1[1] - anim.r0[1]) * e;
        zoom = anim.z0 + (anim.z1 - anim.z0) * e;
        if (k >= 1) anim = null;
      } else if (spinning && !dragging) {
        rotation[0] += dt * 0.006;
      }

      rotation[0] = ((rotation[0] + 180) % 360 + 360) % 360 - 180;
      draw(t);
      requestAnimationFrame(frame);
    }

    function flyTo(lon, lat, z) {
      var d = -lon - rotation[0];
      var dl = ((d + 180) % 360 + 360) % 360 - 180;
      anim = {
        t0: performance.now(),
        dur: reduce ? 1 : 900,
        r0: [rotation[0], rotation[1]],
        r1: [rotation[0] + dl, clamp(-lat, -80, 80)],
        z0: zoom,
        z1: z
      };
    }

    function pointer(e) {
      var rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * size / rect.width,
        y: (e.clientY - rect.top) * size / rect.height
      };
    }

    function hit(pt) {
      for (var i = 0; i < PLACES.length; i++) {
        var xy = PLACES[i]._xy;
        if (!xy) continue;
        var dx = pt.x - xy[0];
        var dy = pt.y - xy[1];
        if (dx * dx + dy * dy < 18 * 18) return PLACES[i];
      }
      return null;
    }

    function stopSpin() {
      if (spinning) { spinning = false; syncSpin(); }
    }

    canvas.addEventListener('pointerdown', function (e) {
      dragging = true;
      moved = false;
      anim = null;
      startPt = { x: e.clientX, y: e.clientY };
      last = { x: e.clientX, y: e.clientY };
      canvas.classList.add('dragging');
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });

    canvas.addEventListener('pointermove', function (e) {
      if (dragging) {
        if (Math.abs(e.clientX - startPt.x) + Math.abs(e.clientY - startPt.y) > 4) {
          moved = true;
          stopSpin();
        }
        var sens = 57.3 / (R * zoom);
        rotation[0] += (e.clientX - last.x) * sens;
        rotation[1] = clamp(rotation[1] - (e.clientY - last.y) * sens, -85, 85);
        last = { x: e.clientX, y: e.clientY };
      } else {
        hovered = hit(pointer(e));
        canvas.style.cursor = hovered ? 'pointer' : '';
      }
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      canvas.classList.remove('dragging');
      if (!moved && e.type === 'pointerup') {
        var h = hit(pointer(e));
        if (h) selectPlace(h);
      }
    }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('pointerleave', function () { hovered = null; });

    canvas.addEventListener('keydown', function (e) {
      var handled = true;
      if (e.key === 'ArrowLeft') rotation[0] += 10;
      else if (e.key === 'ArrowRight') rotation[0] -= 10;
      else if (e.key === 'ArrowUp') rotation[1] = clamp(rotation[1] + 8, -85, 85);
      else if (e.key === 'ArrowDown') rotation[1] = clamp(rotation[1] - 8, -85, 85);
      else if (e.key === '+' || e.key === '=') zoom = clamp(zoom * 1.2, 1, 2.6);
      else if (e.key === '-') zoom = clamp(zoom / 1.2, 1, 2.6);
      else handled = false;
      if (handled) { e.preventDefault(); anim = null; stopSpin(); }
    });

    function bind(id, fn) {
      var node = document.getElementById(id);
      if (node) node.addEventListener('click', fn);
    }

    bind('globe-zoom-in', function () { anim = null; zoom = clamp(zoom * 1.25, 1, 2.6); });
    bind('globe-zoom-out', function () { anim = null; zoom = clamp(zoom / 1.25, 1, 2.6); });
    bind('globe-spin', function () { spinning = !spinning; syncSpin(); });
    bind('globe-reset', function () {
      selectPlace(null);
      spinning = !reduce;
      syncSpin();
      flyTo(HOME.lon, HOME.lat * 0.6, 1);
    });

    // When a place is chosen (pin or button), turn the globe to it
    onSelect = function (p) {
      if (!p) return;
      stopSpin();
      flyTo(p.lon, p.lat, 1.6);
    };

    window.addEventListener('resize', resize);
    resize();
    syncSpin();
    if (statusEl) statusEl.hidden = true;
    requestAnimationFrame(frame);
  }
})();
