/* ============================================================================
   Guillermo Bernaldo de Quirós — site behaviour
   Menu, theme, home carousel, lightbox, and the print selection.

   Two rules hold everywhere in this file:

   1. No innerHTML, ever. Every node is built with createElement and every
      piece of text goes in through textContent. That is what lets the pages
      ship `require-trusted-types-for 'script'` in their CSP: the browser
      refuses any string-to-markup assignment, so an injected title or a
      tampered localStorage value cannot become an element.

   2. Nothing leaves the browser. There is no fetch, no analytics, no cookie
      and no API key — an enquiry is composed locally and handed to the
      visitor's own mail client. There is no token here to steal because the
      site never holds one.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var body = document.body;
  var PAGE = body.getAttribute('data-page');
  var LANG = body.getAttribute('data-lang') === 'es' ? 'es' : 'en';
  var BASE = body.getAttribute('data-base') || '';
  var CAT  = (window.__CATALOG__ && window.__CATALOG__.albums) || [];

  var BY_SLUG = {};
  CAT.forEach(function (a) { BY_SLUG[a.slug] = a; });

  function t(k) { return (STR[LANG] && STR[LANG][k]) || STR.en[k] || k; }
  function title(a) { return a[LANG] || a.en; }
  function place(a) { return a['place_' + LANG] || ''; }
  function asset(size, file) { return BASE + 'assets/img/' + (size ? size + '/' : '') + file; }

  /* Strings the markup cannot carry because they are only ever produced at
     runtime. Everything else lives in the generated HTML. */
  var STR = {
    en: {
      pause: 'PAUSE', play: 'PLAY', of: 'of', remove: 'Remove',
      add: 'Add to selection', added: 'In your selection',
      one: 'photograph selected', many: 'photographs selected',
      hang1: 'A single photograph: one wall, one statement.',
      hang2: 'A diptych: two frames, hung with a 6–8 cm gap, read as one work.',
      hang3: 'A triptych: the classic set, and the most requested.',
      hang5: 'A series of five or more: a wall, priced as a set.',
      sending: 'Sending…',
      failed: 'That did not go through. Use “Copy as text” and send it by email instead — nothing you typed is lost.',
      copied: 'Copied — paste it into an email.',
      copyfail: 'Could not copy. Select the text and copy it by hand.',
      sent: 'Your email client should now be open with the selection filled in. If nothing happened, use “Copy as text”.',
      invalid: 'Please add your name and a valid email address.',
      ok: 'Thank you — your enquiry is on its way. I read every one myself and reply within a couple of days.',
      subject: 'Print enquiry', greeting: 'Selection', spec: 'Printed as',
      from: 'From', country: 'Country', note: 'Note'
    },
    es: {
      pause: 'PAUSA', play: 'VER', of: 'de', remove: 'Quitar',
      add: 'Sumar a la selección', added: 'En tu selección',
      one: 'fotografía seleccionada', many: 'fotografías seleccionadas',
      hang1: 'Una sola fotografía: una pared, una afirmación.',
      hang2: 'Díptico: dos cuadros, con 6 a 8 cm de separación, se leen como una obra.',
      hang3: 'Tríptico: el conjunto clásico, y el más pedido.',
      hang5: 'Serie de cinco o más: una pared entera, cotizada como conjunto.',
      sending: 'Enviando…',
      failed: 'No se pudo enviar. Usá «Copiar como texto» y mandala por mail — no se perdió nada de lo que escribiste.',
      copied: 'Copiado — pegalo en un mail.',
      copyfail: 'No se pudo copiar. Seleccioná el texto y copialo a mano.',
      sent: 'Se debería haber abierto tu cliente de correo con la selección cargada. Si no pasó nada, usá «Copiar como texto».',
      invalid: 'Agregá tu nombre y un email válido, por favor.',
      ok: 'Gracias — tu consulta ya salió. Las leo yo y respondo en un par de días.',
      subject: 'Consulta por copias', greeting: 'Selección', spec: 'Impresa como',
      from: 'De', country: 'País', note: 'Nota'
    }
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ------------------------------------------------------------ missing art
     Until a photograph is committed, show a labelled box naming the exact
     file the page is waiting for, instead of a broken-image icon. */
  function watchMissing(img, file) {
    function flag() {
      var host = img.closest('.shot, .slide, .card-img, .about-portrait, .sel-item');
      if (host) { host.classList.add('is-missing'); host.setAttribute('data-missing', file); }
    }
    if (img.complete && img.naturalWidth === 0) flag();
    img.addEventListener('error', flag);
  }
  Array.prototype.forEach.call(document.images, function (img) {
    watchMissing(img, (img.getAttribute('src') || '').split('/').pop());
  });

  /* ------------------------------------------------------------------ menu */
  var menu = document.getElementById('menu');
  var burger = document.getElementById('burger');

  function trapFocus(e, roots) {
    if (e.key !== 'Tab') return;
    var items = [];
    roots.forEach(function (r) {
      if (!r) return;
      Array.prototype.forEach.call(
        r.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'),
        function (n) {
          var s = getComputedStyle(n);
          if (s.visibility !== 'hidden' && s.display !== 'none') items.push(n);
        });
    });
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (items.indexOf(document.activeElement) === -1) { e.preventDefault(); first.focus(); }
  }

  function openMenu() {
    stopSlides();
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    burger.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', burger.getAttribute('data-close') || 'Close menu');
    body.classList.add('menu-open');
  }
  function closeMenu() {
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', burger.getAttribute('data-open') || 'Open menu');
    body.classList.remove('menu-open');
    if (PAGE === 'home') startSlides();
  }
  if (burger) {
    burger.addEventListener('click', function () {
      if (menu.classList.contains('is-open')) closeMenu(); else openMenu();
    });
  }

  /* ----------------------------------------------------------------- theme */
  var themeToggle = document.getElementById('themeToggle');
  function isDark() {
    var s = root.getAttribute('data-theme');
    return s ? s === 'dark'
             : !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  if (themeToggle) {
    themeToggle.setAttribute('aria-pressed', String(isDark()));
    themeToggle.addEventListener('click', function () {
      root.setAttribute('data-theme', isDark() ? 'light' : 'dark');
      try { localStorage.setItem('gbq-theme', root.getAttribute('data-theme')); } catch (e) {}
      themeToggle.setAttribute('aria-pressed', String(isDark()));
    });
  }

  /* ------------------------------------------------------------- selection
     The whole commercial mechanic: a visitor collects photographs across
     series, then sends the set as one enquiry.

     Stored in localStorage, which is attacker-writable in the visitor's own
     browser — so every entry is re-validated against the catalogue on read.
     An entry naming a series or a file that does not exist is dropped, which
     means nothing from storage can reach the DOM or an email body unless the
     build put it in the catalogue first. */
  var SEL_KEY = 'gbq-selection-v1';
  var SEL_MAX = 40;

  function selRead() {
    var raw;
    try { raw = localStorage.getItem(SEL_KEY); } catch (e) { return []; }
    if (!raw) return [];
    var parsed;
    try { parsed = JSON.parse(raw); } catch (e) { return []; }
    if (!Array.isArray(parsed)) return [];
    var seen = {}, out = [];
    parsed.forEach(function (x) {
      if (!x || typeof x.a !== 'string' || typeof x.f !== 'string') return;
      var album = BY_SLUG[x.a];
      if (!album) return;
      if (!album.photos.some(function (p) { return p.f === x.f; })) return;
      if (seen[x.f]) return;
      seen[x.f] = 1;
      if (out.length < SEL_MAX) out.push({ a: x.a, f: x.f });
    });
    return out;
  }
  function selWrite(list) {
    try { localStorage.setItem(SEL_KEY, JSON.stringify(list)); } catch (e) {}
    syncSelection();
  }
  function selHas(file) { return selRead().some(function (x) { return x.f === file; }); }
  function selToggle(slug, file) {
    var list = selRead();
    var i = list.findIndex(function (x) { return x.f === file; });
    if (i > -1) list.splice(i, 1);
    else if (list.length < SEL_MAX) list.push({ a: slug, f: file });
    selWrite(list);
    return i === -1;
  }

  var badge = document.getElementById('selBadge');
  var badgeN = document.getElementById('selBadgeN');

  function syncSelection() {
    var list = selRead();
    if (badge) {
      badge.hidden = list.length === 0;
      if (badgeN) badgeN.textContent = String(list.length);
    }
    Array.prototype.forEach.call(document.querySelectorAll('.shot-add'), function (b) {
      var on = list.some(function (x) { return x.f === b.getAttribute('data-file'); });
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    if (PAGE === 'selection') renderSelection(list);
    if (lbAdd && lbOrder.length && lbIndex > -1) syncLbAdd();
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.shot-add');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    selToggle(b.getAttribute('data-album'), b.getAttribute('data-file'));
  });

  /* ------------------------------------------------------------- lightbox */
  var lb = document.getElementById('lightbox');
  var lbImage = document.getElementById('lbImage');
  var lbTitle = document.getElementById('lbTitle');
  var lbPlace = document.getElementById('lbPlace');
  var lbAdd = document.getElementById('lbAdd');
  var lbOrder = [];
  var lbIndex = -1;
  var lbReturn = null;

  function syncLbAdd() {
    if (!lbAdd) return;
    var cur = lbOrder[lbIndex];
    if (!cur) return;
    var on = selHas(cur.f);
    lbAdd.textContent = on ? t('added') : t('add');
    lbAdd.classList.toggle('is-on', on);
    lbAdd.setAttribute('aria-pressed', String(on));
  }

  function lbRender(i) {
    var cur = lbOrder[i];
    if (!cur) return;
    var album = BY_SLUG[cur.slug];
    lbImage.setAttribute('src', asset('', cur.f));
    lbImage.alt = [title(album), place(album)].filter(Boolean).join(' — ');
    lbTitle.textContent = title(album) + ' № ' + cur.n;
    lbPlace.textContent = place(album);
    lbIndex = i;
    syncLbAdd();
  }
  function lbOpen(file) {
    if (!lb) return;
    var i = lbOrder.findIndex(function (x) { return x.f === file; });
    if (i < 0) return;
    lbReturn = document.activeElement;
    lbRender(i);
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    body.classList.add('no-scroll');
    document.getElementById('lbClose').focus();
  }
  function lbClose() {
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
    body.classList.remove('no-scroll');
    if (lbReturn && lbReturn.focus) lbReturn.focus();
  }
  function lbStep(d) {
    if (!lbOrder.length) return;
    lbRender((lbIndex + d + lbOrder.length) % lbOrder.length);
  }

  if (lb) {
    var slug = body.getAttribute('data-album');
    var album = BY_SLUG[slug];
    if (album) {
      lbOrder = album.photos.map(function (p) { return { slug: slug, f: p.f, n: p.n }; });
    }
    document.getElementById('lbClose').addEventListener('click', lbClose);
    document.getElementById('lbPrev').addEventListener('click', function () { lbStep(-1); });
    document.getElementById('lbNext').addEventListener('click', function () { lbStep(1); });
    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target.classList.contains('lb-stage')) lbClose();
    });
    if (lbAdd) {
      lbAdd.addEventListener('click', function () {
        var cur = lbOrder[lbIndex];
        if (cur) selToggle(cur.slug, cur.f);
      });
    }
    Array.prototype.forEach.call(document.querySelectorAll('.shot'), function (fig) {
      fig.tabIndex = 0;
      fig.setAttribute('role', 'button');
      fig.addEventListener('click', function (e) {
        if (e.target.closest('.shot-add')) return;      // that button has its own job
        lbOpen(fig.getAttribute('data-file'));
      });
      fig.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lbOpen(fig.getAttribute('data-file')); }
      });
    });
  }

  /* -------------------------------------------------------------- keyboard */
  document.addEventListener('keydown', function (e) {
    if (menu && menu.classList.contains('is-open')) {
      if (e.key === 'Escape') { closeMenu(); burger.focus(); return; }
      trapFocus(e, [menu, burger]);
      return;
    }
    if (lb && lb.classList.contains('is-open')) {
      if (e.key === 'Escape') { lbClose(); return; }
      if (e.key === 'ArrowLeft') { lbStep(-1); return; }
      if (e.key === 'ArrowRight') { lbStep(1); return; }
      trapFocus(e, [lb]);
      return;
    }
    if (PAGE === 'home') {
      if (e.key === 'ArrowLeft') nudge(-1);
      else if (e.key === 'ArrowRight') nudge(1);
    }
  });

  /* --------------------------------------------------------- home carousel
     Every photograph in the archive passes through here in a fresh random
     order each visit. Only the current frame and its two neighbours are ever
     fetched, so a 250-frame carousel costs about three images to open. */
  var slidesHost = document.getElementById('slides');
  var countHost = document.getElementById('slideCount');
  var pauseBtn = document.getElementById('slidePause');
  var SLIDE_MS = 7000;
  var slides = [], flat = [], slideIx = 0, slideTimer = null, paused = false;
  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {              // Fisher-Yates
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }
  function at(i) { return (i % slides.length + slides.length) % slides.length; }
  function load(i) {
    if (!slides.length) return;
    var k = at(i), img = slides[k].querySelector('img');
    if (!img.getAttribute('src')) {
      img.setAttribute('src', asset('w960', flat[k].f));
      watchMissing(img, flat[k].f);
    }
  }
  function syncCount() {
    if (!countHost) return;
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    countHost.textContent = '';
    var b = el('b', null, pad(slideIx + 1));
    var sp = el('span', null, '/ ' + pad(slides.length));
    countHost.appendChild(b);
    countHost.appendChild(sp);
  }
  function syncPause() {
    if (!pauseBtn) return;
    pauseBtn.textContent = paused ? t('play') : t('pause');
    pauseBtn.setAttribute('aria-pressed', String(paused));
  }
  function buildSlides() {
    if (!slidesHost) return;
    CAT.forEach(function (a) {
      a.photos.forEach(function (p) { flat.push({ f: p.f, slug: a.slug, n: p.n }); });
    });
    flat = shuffle(flat).slice(0, 60);      // a visit never needs more than this
    slidesHost.textContent = '';
    slides = flat.map(function (x, i) {
      var d = el('div', 'slide' + (i === 0 ? ' is-current' : ''));
      var img = el('img');
      img.alt = title(BY_SLUG[x.slug]);
      img.draggable = false;
      img.decoding = 'async';
      d.appendChild(img);
      slidesHost.appendChild(d);
      return d;
    });
    if (!slides.length) return;
    load(0); load(1); load(-1);
    syncCount(); syncPause();
  }
  function goTo(n, dir) {
    n = at(n);
    if (n === slideIx || !slides.length) return;
    var cur = slides[slideIx], nxt = slides[n];
    var enter = dir > 0 ? 'is-next' : 'is-prev';
    var exit  = dir > 0 ? 'is-prev' : 'is-next';
    load(n); load(n + dir);
    nxt.classList.remove('is-current', 'is-prev', 'is-next');
    nxt.classList.add(enter);
    void nxt.offsetWidth;                                  // commit start position
    cur.classList.remove('is-current');
    cur.classList.add(exit);
    nxt.classList.remove(enter);
    nxt.classList.add('is-current');
    slideIx = n;
    syncCount();
  }
  /* WCAG 2.2.2: motion running past five seconds needs a visible way to stop
     it. `paused` is the visitor's explicit choice and outranks every automatic
     start, so leaving the menu or returning to the tab cannot restart it. */
  function startSlides() {
    if (paused || reduceMotion || slideTimer || slides.length < 2) return;
    slideTimer = setInterval(function () { goTo(slideIx + 1, 1); }, SLIDE_MS);
  }
  function stopSlides() { if (slideTimer) { clearInterval(slideTimer); slideTimer = null; } }
  function nudge(d) { stopSlides(); goTo(slideIx + d, d); startSlides(); }

  if (pauseBtn) {
    pauseBtn.addEventListener('click', function () {
      paused = !paused;
      if (paused) stopSlides(); else startSlides();
      syncPause();
    });
  }
  if (PAGE === 'home') {
    var hero = document.querySelector('.hero');
    var touchX = null;
    if (hero) {
      hero.addEventListener('touchstart', function (e) {
        touchX = e.changedTouches[0].clientX;
      }, { passive: true });
      hero.addEventListener('touchend', function (e) {
        if (touchX === null) return;
        var dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) > 45) nudge(dx < 0 ? 1 : -1);
        touchX = null;
      }, { passive: true });
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopSlides();
      else if (!body.classList.contains('menu-open')) startSlides();
    });
    buildSlides();
    startSlides();
  }

  /* ---------------------------------------------------------- work filters */
  var filters = document.getElementById('filters');
  if (filters) {
    filters.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-filter]');
      if (!b) return;
      var want = b.getAttribute('data-filter');
      Array.prototype.forEach.call(filters.querySelectorAll('button'), function (n) {
        var on = n === b;
        n.classList.toggle('is-active', on);
        n.setAttribute('aria-pressed', String(on));
      });
      Array.prototype.forEach.call(document.querySelectorAll('#albumGrid .card'), function (c) {
        c.hidden = want !== 'all' && c.getAttribute('data-theme') !== want;
      });
    });
  }

  /* ------------------------------------------------- the selection page */
  var selGrid = document.getElementById('selGrid');
  var selEmpty = document.getElementById('selEmpty');
  var selLive = document.getElementById('selLive');
  var selCount = document.getElementById('selCount');
  var selHang = document.getElementById('selHang');
  var selForm = document.getElementById('selForm');
  var selStatus = document.getElementById('selStatus');

  function renderSelection(list) {
    if (!selGrid) return;
    if (selEmpty) selEmpty.hidden = list.length > 0;
    if (selLive) selLive.hidden = list.length === 0;
    if (!list.length) { selGrid.textContent = ''; return; }

    selCount.textContent = list.length + ' ' + (list.length === 1 ? t('one') : t('many'));
    selHang.textContent = list.length === 1 ? t('hang1')
      : list.length === 2 ? t('hang2')
      : list.length === 3 ? t('hang3')
      : t('hang5');

    selGrid.textContent = '';
    list.forEach(function (x) {
      var album = BY_SLUG[x.a];
      var photo = album.photos.find(function (p) { return p.f === x.f; });
      var fig = el('figure', 'sel-item');

      var img = el('img');
      img.setAttribute('src', asset('w480', x.f));
      img.alt = title(album);
      img.loading = 'lazy';
      img.decoding = 'async';
      img.draggable = false;
      watchMissing(img, x.f);

      var cap = el('figcaption', 'sel-item-cap');
      cap.appendChild(el('b', null, title(album) + ' № ' + photo.n));
      if (place(album)) cap.appendChild(el('span', null, place(album)));

      var rm = el('button', 'sel-item-rm');
      rm.type = 'button';
      rm.setAttribute('aria-label', t('remove') + ' — ' + title(album) + ' № ' + photo.n);
      rm.appendChild(el('span', null, '✕'));
      rm.addEventListener('click', function () { selToggle(x.a, x.f); });

      fig.appendChild(img);
      fig.appendChild(cap);
      fig.appendChild(rm);
      selGrid.appendChild(fig);
    });
  }

  var selClear = document.getElementById('selClear');
  if (selClear) selClear.addEventListener('click', function () { selWrite([]); });

  /* Composes the enquiry as plain text. This is the entire "checkout": no
     payment processor, no order database, no credentials anywhere. */
  function selectionText(form) {
    var list = selRead();
    var f = form.elements;
    var lines = [];
    lines.push(t('greeting') + ' (' + list.length + '):');
    list.forEach(function (x, i) {
      var album = BY_SLUG[x.a];
      var photo = album.photos.find(function (p) { return p.f === x.f; });
      lines.push('  ' + (i + 1) + '. ' + title(album) + ' № ' + photo.n +
                 (place(album) ? ' — ' + place(album) : '') + '  [' + x.f + ']');
    });
    lines.push('');
    lines.push(t('spec') + ': ' + f.size.value + ' · ' + f.paper.value + ' · ' + f.frame.value);
    lines.push('');
    lines.push(t('from') + ': ' + f.name.value.trim() + ' <' + f.email.value.trim() + '>');
    if (f.country && f.country.value.trim()) lines.push(t('country') + ': ' + f.country.value.trim());
    if (f.message && f.message.value.trim()) {
      lines.push('');
      lines.push(t('note') + ': ' + f.message.value.trim());
    }
    return lines.join('\n');
  }

  function validate(form) {
    var name = form.elements.name, email = form.elements.email;
    var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    name.setAttribute('aria-invalid', String(!name.value.trim()));
    email.setAttribute('aria-invalid', String(!ok));
    return !!name.value.trim() && ok;
  }

  /* ------------------------------------------------------------- delivery

     Three ways an enquiry can reach Guillermo, tried in order. The first that
     works, wins; the visitor is never left holding a form that did nothing.

       1. POST to /api/enquiry. Real delivery, and the only route where the
          visitor never leaves the page. The credential that sends the mail
          lives in a server environment variable and is never in this file —
          there is nothing here to read out of the browser.
       2. mailto:, if the site knows an address but the endpoint is absent or
          not configured (GitHub Pages has no functions at all).
       3. The clipboard, if there is no address either.

     Every fallback keeps what the visitor typed. Nothing is cleared until
     something has actually succeeded. */

  var MAILTO = (function () {
    var e = window.__CATALOG__ && window.__CATALOG__.email;
    return e && e.u && e.d ? e.u + '@' + e.d : '';
  })();
  var ENDPOINT = '/api/enquiry';
  var loadedAt = Date.now();

  function post(payload) {
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (res.ok) return true;
      // 503 means nobody has configured a delivery route yet; 404/405 mean
      // there is no function here at all. Both are "fall back", not "fail".
      if (res.status === 503 || res.status === 404 || res.status === 405) return false;
      throw new Error('http ' + res.status);
    });
  }

  function mailtoOut(subject, text, status) {
    if (!MAILTO) return copyOut(text, status);
    window.location.href = 'mailto:' + encodeURIComponent(MAILTO) +
      '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(text);
    status.textContent = t('sent');
    return true;
  }

  function copyOut(text, status) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { status.textContent = t('copied'); },
        function () { status.textContent = t('copyfail'); });
    } else {
      status.textContent = t('copyfail');
    }
    return true;
  }

  function send(form, payload, subject, text, status, onSuccess) {
    var button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    status.textContent = t('sending');

    payload.ts = loadedAt;
    payload.lang = LANG;
    payload.company = form.elements.company ? form.elements.company.value : '';

    post(payload).then(function (delivered) {
      if (button) button.disabled = false;
      if (delivered) {
        status.textContent = t('ok');
        form.reset();
        if (onSuccess) onSuccess();
      } else {
        mailtoOut(subject, text, status);       // no backend configured
      }
    }).catch(function () {
      if (button) button.disabled = false;
      if (MAILTO) mailtoOut(subject, text, status);
      else { status.textContent = t('failed'); copyOut(text, status); }
    });
  }

  if (selForm) {
    selForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var list = selRead();
      if (!list.length) return;
      if (!validate(selForm)) { selStatus.textContent = t('invalid'); return; }
      var f = selForm.elements;
      send(selForm, {
        name: f.name.value.trim(),
        email: f.email.value.trim(),
        country: f.country ? f.country.value.trim() : '',
        message: f.message ? f.message.value.trim() : '',
        spec: [f.size.value, f.paper.value, f.frame.value].join(' · '),
        selection: list
      }, t('subject') + ' — ' + list.length, selectionText(selForm), selStatus,
      function () { selWrite([]); });   // only clear once it is actually sent
    });
    var selCopy = document.getElementById('selCopy');
    if (selCopy) {
      selCopy.addEventListener('click', function () {
        if (!validate(selForm)) { selStatus.textContent = t('invalid'); return; }
        copyOut(selectionText(selForm), selStatus);
      });
    }
  }

  /* ------------------------------------------------------- contact form */
  var enquiry = document.getElementById('enquiryForm');
  if (enquiry) {
    var formStatus = document.getElementById('formStatus');

    function enquiryText() {
      var f = enquiry.elements;
      var lines = [];
      if (f.work.value) lines.push(f.work.value);
      if (f.message.value.trim()) lines.push('', f.message.value.trim());
      lines.push('', t('from') + ': ' + f.name.value.trim() + ' <' + f.email.value.trim() + '>');
      if (f.country.value.trim()) lines.push(t('country') + ': ' + f.country.value.trim());
      return lines.join('\n');
    }

    enquiry.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate(enquiry)) { formStatus.textContent = t('invalid'); return; }
      var f = enquiry.elements;
      send(enquiry, {
        name: f.name.value.trim(),
        email: f.email.value.trim(),
        country: f.country.value.trim(),
        message: f.message.value.trim(),
        work: f.work.value
      }, t('subject'), enquiryText(), formStatus);
    });

    var formCopy = document.getElementById('formCopy');
    if (formCopy) {
      formCopy.addEventListener('click', function () {
        if (!validate(enquiry)) { formStatus.textContent = t('invalid'); return; }
        copyOut(enquiryText(), formStatus);
      });
    }
  }

  /* ------------------------------------------------------ image protection
     A deterrent against casual copying, not DRM — a visitor can always take a
     screenshot. The real protection is that these are preview-resolution
     files and therefore not printable. */
  document.addEventListener('contextmenu', function (e) {
    if (e.target.closest('.shot, .lb-frame, .card-img, .about-portrait, .slide, .sel-item')) e.preventDefault();
  });
  document.addEventListener('dragstart', function (e) {
    if (e.target.tagName === 'IMG') e.preventDefault();
  });

  /* ------------------------------------------------------------- reveal in */
  var io = 'IntersectionObserver' in window
    ? new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -40px 0px' })
    : null;
  Array.prototype.forEach.call(document.querySelectorAll('.shot, .card'), function (n) {
    if (io) io.observe(n); else n.classList.add('is-in');
  });

  /* ------------------------------------------------------------------ init */
  Array.prototype.forEach.call(document.querySelectorAll('.year'), function (n) {
    n.textContent = String(new Date().getFullYear());
  });
  syncSelection();
})();
