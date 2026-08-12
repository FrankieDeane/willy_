/* ============================================================
   Guillermo Bernaldo de Quirós
   Hash router, overlay menu, galleries, lightbox, i18n, theme.
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  var body = document.body;

  /* Gallery images are created in JS, so a single-file bundle cannot rewrite
     their paths the way it rewrites the markup. When a bundle supplies an
     inlined asset map, resolve through it; otherwise use the normal path. */
  function asset(file) {
    return (window.__ASSETS__ && window.__ASSETS__[file]) || 'assets/img/' + file;
  }

  /* While the image folder is being filled, a missing file shows a labelled
     placeholder naming the file it expects, instead of a broken-image icon. */
  function watchMissing(img, file) {
    function flag() {
      var host = img.closest('.shot, .slide, .about-portrait');
      if (host) { host.classList.add('is-missing'); host.setAttribute('data-missing', file); }
    }
    if (img.complete && img.naturalWidth === 0) flag();
    img.addEventListener('error', flag);
  }

  /* ---------------- catalogue ----------------
     One record per photograph. Galleries are built from this, so adding work
     means adding a row here — no markup to touch. Swap `src` for Guillermo's
     real files and keep the rest. */
  var WORKS = [
    { src: 'p03.jpg', gal: ['arch', 'prints'], en: 'Concrete Light I',  es: 'Luz de hormigón I',    place_en: 'Buenos Aires, Argentina', place_es: 'Buenos Aires, Argentina', year: 2024, ed: 10 },
    { src: 'p07.jpg', gal: ['arch', 'prints'], en: 'Concrete Light II', es: 'Luz de hormigón II',   place_en: 'Buenos Aires, Argentina', place_es: 'Buenos Aires, Argentina', year: 2024, ed: 10 },
    { src: 'p11.jpg', gal: ['arch', 'prints'], en: 'Stairwell',         es: 'Hueco de escalera',    place_en: 'Lisbon, Portugal',        place_es: 'Lisboa, Portugal',        year: 2023, ed: 10 },
    { src: 'p06.jpg', gal: ['arch'],           en: 'Night Traffic',     es: 'Tráfico nocturno',     place_en: 'Buenos Aires, Argentina', place_es: 'Buenos Aires, Argentina', year: 2024, ed: 12 },
    { src: 'p10.jpg', gal: ['arch'],           en: 'Tower, After Rain', es: 'Torre, tras la lluvia',place_en: 'São Paulo, Brazil',       place_es: 'São Paulo, Brasil',       year: 2024, ed: 12 },
    { src: 'p01.jpg', gal: ['arch'],           en: 'Held Breath',       es: 'Aliento contenido',    place_en: 'Madrid, Spain',           place_es: 'Madrid, España',          year: 2024, ed: 12 },

    { src: 'p02.jpg', gal: ['land', 'prints'], en: 'Long Horizon',      es: 'Horizonte largo',      place_en: 'Patagonia, Argentina',    place_es: 'Patagonia, Argentina',    year: 2023, ed: 8 },
    { src: 'p09.jpg', gal: ['land', 'prints'], en: 'Salt Flat',         es: 'Salina',               place_en: 'Salta, Argentina',        place_es: 'Salta, Argentina',        year: 2025, ed: 6 },
    { src: 'p05.jpg', gal: ['land', 'prints'], en: 'Skin of the Earth', es: 'Piel de la tierra',    place_en: 'Jujuy, Argentina',        place_es: 'Jujuy, Argentina',        year: 2025, ed: 6 },
    { src: 'p04.jpg', gal: ['land'],           en: 'Before the Rain',   es: 'Antes de la lluvia',   place_en: 'Córdoba, Argentina',      place_es: 'Córdoba, Argentina',      year: 2023, ed: 8 },
    { src: 'p08.jpg', gal: ['land'],           en: 'Slow Water',        es: 'Agua lenta',           place_en: 'Tierra del Fuego',        place_es: 'Tierra del Fuego',        year: 2023, ed: 8 },
    { src: 'p12.jpg', gal: ['land'],           en: 'Quiet Field',       es: 'Campo en calma',       place_en: 'Buenos Aires Province',   place_es: 'Provincia de Buenos Aires', year: 2025, ed: 6 }
  ];

  /* ---------------- translations ---------------- */
  var STRINGS = {
    en: {
      'skip': 'Skip to content', 'role': 'PHOTOGRAPHY',
      'nav.home': 'HOME', 'nav.prints': 'FINE ART PRINTS', 'nav.arch': 'ARCHITECTURE',
      'nav.land': 'LANDSCAPE', 'nav.about': 'ABOUT', 'nav.contact': 'CONTACT',
      'theme.label': 'Switch theme', 'home.hint': 'SCROLL',
      'prints.title': 'FINE ART PRINTS',
      'prints.p1': 'Photographs are printed on cotton papers with pigment inks, giving a colour life of over a century under normal exhibition conditions.',
      'prints.p2': 'Every photograph in the Fine Art collection is a limited edition, inspected, dated, numbered and signed by Guillermo Bernaldo de Quirós. A certificate of authenticity accompanies each print.',
      'prints.p3': 'Available sizes: 65×100cm, 111×165cm and 150×240cm. Panoramic formats keep the same height, with the length varying.',
      'prints.order': 'To order, write to', 'prints.orderlink': 'the contact page',
      'arch.title': 'ARCHITECTURE',
      'arch.lede': 'Cities read as structure before they read as places. This body of work follows the line, plane and shadow of urban architecture — from modern towers to older, quieter buildings.',
      'land.title': 'LANDSCAPE',
      'land.lede': 'Work made away from the city: long horizons, weather, and the open country of Argentina and beyond, photographed with the same attention to light and composition.',
      'about.title': 'ABOUT',
      'about.lead': 'Guillermo Bernaldo de Quirós is a Buenos Aires-based behavioral neurologist and architectural photographer with a distinguished dual career spanning medicine and visual arts.',
      'about.h.med': 'Medical Background',
      'about.p.med': 'Dr. Bernaldo de Quirós is a recognized expert in behavioral neurology, specializing in childhood hyperactivity disorders (ADHD) and related conditions. He completed his advanced training at the Kennedy Schriver Center at Harvard University in Boston, United States, bringing international expertise to his practice in Argentina. He currently serves as Director of the Center for Behavioral Neurology and works in the Pediatrics Department at CEMIC.',
      'about.h.photo': 'Photography Passion',
      'about.p.photo': 'Alongside his medical career, Guillermo pursues a deep passion for architectural and landscape photography. His work captures the essence of urban architecture across diverse styles, from modern skyscrapers to traditional buildings, with a keen eye for composition and light. His portfolio has been featured on international platforms including Inspiration Grid and has garnered nearly 100,000 project views, reflecting his distinctive visual perspective on cities worldwide.',
      'about.h.bridge': 'Bridging Two Worlds',
      'about.p.bridge': 'Guillermo\'s unique profile combines scientific rigor from his medical training with artistic sensibility from his photography practice, creating a distinctive perspective that informs both his clinical work and his visual documentation of architecture and urban landscapes.',
      'about.behance': 'Full portfolio on Behance',
      'contact.title': 'CONTACT',
      'contact.lede': 'For print orders, exhibition enquiries and commissions. Tell me which photograph you have in mind and I will reply with sizes, framing and availability.',
      'form.name': 'Name', 'form.email': 'Email', 'form.work': 'Photograph',
      'form.message': 'Message', 'form.submit': 'SEND', 'form.any': 'Not sure yet',
      'form.sent': 'Thank you — your enquiry has been noted. (Preview only: nothing was sent.)',
      'form.invalid': 'Please add your name and a valid email address.',
      'lb.edition': 'Edition', 'lb.print': 'Paper', 'lb.printval': 'Cotton rag, pigment ink',
      'lb.enquire': 'ENQUIRE', 'lb.of': 'of',
      'lb.protect': 'Preview resolution. Not licensed for download or reproduction.'
    },
    es: {
      'skip': 'Ir al contenido', 'role': 'FOTOGRAFÍA',
      'nav.home': 'INICIO', 'nav.prints': 'COPIAS DE ARTE', 'nav.arch': 'ARQUITECTURA',
      'nav.land': 'PAISAJE', 'nav.about': 'SOBRE MÍ', 'nav.contact': 'CONTACTO',
      'theme.label': 'Cambiar tema', 'home.hint': 'DESLIZÁ',
      'prints.title': 'COPIAS DE ARTE',
      'prints.p1': 'Las fotografías se imprimen sobre papeles de algodón con tintas de pigmento, lo que garantiza una permanencia del color de más de un siglo en condiciones normales de exhibición.',
      'prints.p2': 'Cada fotografía de la colección Fine Art es una edición limitada, revisada, fechada, numerada y firmada por Guillermo Bernaldo de Quirós. Cada copia se entrega con certificado de autenticidad.',
      'prints.p3': 'Tamaños disponibles: 65×100cm, 111×165cm y 150×240cm. En formatos panorámicos se mantiene la altura y varía el largo.',
      'prints.order': 'Para encargos, escribí a', 'prints.orderlink': 'la página de contacto',
      'arch.title': 'ARQUITECTURA',
      'arch.lede': 'Las ciudades se leen como estructura antes que como lugares. Este cuerpo de trabajo sigue la línea, el plano y la sombra de la arquitectura urbana — de las torres modernas a los edificios más antiguos y callados.',
      'land.title': 'PAISAJE',
      'land.lede': 'Trabajo realizado lejos de la ciudad: horizontes largos, clima y el campo abierto de la Argentina y más allá, fotografiados con la misma atención a la luz y a la composición.',
      'about.title': 'SOBRE MÍ',
      'about.lead': 'Guillermo Bernaldo de Quirós es neurólogo conductual y fotógrafo de arquitectura radicado en Buenos Aires, con una destacada trayectoria doble entre la medicina y las artes visuales.',
      'about.h.med': 'Trayectoria médica',
      'about.p.med': 'El Dr. Bernaldo de Quirós es un reconocido experto en neurología del comportamiento, especializado en trastornos de hiperactividad infantil (TDAH) y afecciones relacionadas. Completó su formación avanzada en el Kennedy Schriver Center de la Universidad de Harvard, en Boston, Estados Unidos, aportando experiencia internacional a su práctica en Argentina. Actualmente es Director del Centro de Neurología del Comportamiento y trabaja en el Departamento de Pediatría del CEMIC.',
      'about.h.photo': 'Pasión por la fotografía',
      'about.p.photo': 'Junto a su carrera médica, Guillermo cultiva una profunda pasión por la fotografía de arquitectura y paisaje. Su obra capta la esencia de la arquitectura urbana en estilos muy diversos, desde rascacielos modernos hasta edificios tradicionales, con una mirada atenta a la composición y a la luz. Su portfolio ha sido destacado en plataformas internacionales como Inspiration Grid y acumula cerca de 100.000 visualizaciones de proyectos, reflejando su perspectiva visual distintiva sobre ciudades de todo el mundo.',
      'about.h.bridge': 'Dos mundos que se encuentran',
      'about.p.bridge': 'El perfil singular de Guillermo combina el rigor científico de su formación médica con la sensibilidad artística de su práctica fotográfica, creando una perspectiva distintiva que nutre tanto su trabajo clínico como su documentación visual de la arquitectura y los paisajes urbanos.',
      'about.behance': 'Portfolio completo en Behance',
      'contact.title': 'CONTACTO',
      'contact.lede': 'Para encargos de copias, consultas de exhibición y trabajos por encargo. Contame qué fotografía tenés en mente y te responderé con tamaños, enmarcado y disponibilidad.',
      'form.name': 'Nombre', 'form.email': 'Email', 'form.work': 'Fotografía',
      'form.message': 'Mensaje', 'form.submit': 'ENVIAR', 'form.any': 'Aún no lo sé',
      'form.sent': 'Gracias — tu consulta ha quedado registrada. (Solo previsualización: no se ha enviado nada.)',
      'form.invalid': 'Añadí tu nombre y un email válido, por favor.',
      'lb.edition': 'Edición', 'lb.print': 'Papel', 'lb.printval': 'Algodón, tinta de pigmento',
      'lb.enquire': 'CONSULTAR', 'lb.of': 'de',
      'lb.protect': 'Resolución de previsualización. Sin licencia para descarga ni reproducción.'
    }
  };

  var lang = root.getAttribute('lang') === 'es' ? 'es' : 'en';
  function t(k) { return (STRINGS[lang] && STRINGS[lang][k]) || STRINGS.en[k] || k; }
  function title(w) { return w[lang] || w.en; }
  function place(w) { return w['place_' + lang] || w.place_en; }

  /* ---------------- galleries ---------------- */
  var order = [];   // lightbox navigates within the gallery on screen

  function buildGalleries() {
    document.querySelectorAll('[data-gallery]').forEach(function (host) {
      var key = host.getAttribute('data-gallery');
      host.innerHTML = '';
      WORKS.forEach(function (w) {
        if (w.gal.indexOf(key) === -1) return;
        var fig = document.createElement('figure');
        fig.className = 'shot';
        fig.tabIndex = 0;
        fig.setAttribute('role', 'button');
        fig.dataset.src = w.src;

        var img = document.createElement('img');
        img.src = asset(w.src);
        watchMissing(img, w.src);
        img.alt = title(w) + ' — ' + place(w);
        img.loading = 'lazy';
        img.draggable = false;

        var cap = document.createElement('figcaption');
        cap.className = 'shot-cap';
        cap.textContent = title(w);

        fig.appendChild(img);
        fig.appendChild(cap);
        fig.addEventListener('click', function () { openLightbox(key, w.src); });
        fig.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(key, w.src); }
        });
        host.appendChild(fig);
      });
    });
    observeShots();
  }

  var io = 'IntersectionObserver' in window
    ? new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -40px 0px' })
    : null;

  function observeShots() {
    document.querySelectorAll('.shot').forEach(function (s) {
      if (io) io.observe(s); else s.classList.add('is-in');
    });
  }

  /* ---------------- router ---------------- */
  var pages = Array.prototype.slice.call(document.querySelectorAll('.page'));
  var menu = document.getElementById('menu');
  var burger = document.getElementById('burger');

  function route() {
    var hash = location.hash || '#/home';
    var target = pages.filter(function (p) { return '#' + p.id === hash; })[0] || pages[0];

    pages.forEach(function (p) { p.classList.toggle('is-active', p === target); });
    body.classList.toggle('on-home', target.classList.contains('page-home'));

    document.querySelectorAll('.menu a').forEach(function (a) {
      a.classList.toggle('is-current', a.getAttribute('href') === '#' + target.id);
    });

    closeMenu();
    window.scrollTo(0, 0);
    if (target.classList.contains('page-home')) target.scrollTop = 0;
  }

  window.addEventListener('hashchange', route);

  /* ---------------- menu ---------------- */
  function openMenu() {
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    burger.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Close menu');
    body.classList.add('menu-open');
  }
  function closeMenu() {
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Open menu');
    body.classList.remove('menu-open');
  }
  burger.addEventListener('click', function () {
    if (menu.classList.contains('is-open')) closeMenu(); else openMenu();
  });
  // clicking the current page's own link does not fire hashchange, so close here too
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) closeMenu(); });

  /* ---------------- image protection ----------------
     Deterrents against casual copying, not DRM — a visitor can always
     screenshot. The real protection is that these files are preview
     resolution and therefore not printable. */
  document.addEventListener('contextmenu', function (e) {
    if (e.target.closest('.shot, .lb-frame, .about-portrait, .slide')) e.preventDefault();
  });
  document.addEventListener('dragstart', function (e) {
    if (e.target.tagName === 'IMG') e.preventDefault();
  });

  /* ---------------- lightbox ---------------- */
  var lb = document.getElementById('lightbox');
  var lbImage = document.getElementById('lbImage');
  var lbTitle = document.getElementById('lbTitle');
  var lbPlace = document.getElementById('lbPlace');
  var lbEdition = document.getElementById('lbEdition');
  var current = -1;
  var lastFocus = null;

  function render(i) {
    var w = order[i];
    lbImage.src = asset(w.src);
    lbImage.alt = title(w) + ' — ' + place(w);
    lbTitle.textContent = title(w);
    lbPlace.textContent = place(w) + ' · ' + w.year;
    lbEdition.textContent = w.ed + ' ' + t('lb.of') + ' ' + w.ed;
  }

  function openLightbox(galKey, src) {
    order = WORKS.filter(function (w) { return w.gal.indexOf(galKey) > -1; });
    current = order.map(function (w) { return w.src; }).indexOf(src);
    if (current < 0) return;
    lastFocus = document.activeElement;
    render(current);
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    body.classList.add('no-scroll');
    document.getElementById('lbClose').focus();
  }

  function closeLightbox() {
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
    body.classList.remove('no-scroll');
    current = -1;
    if (lastFocus) lastFocus.focus();
  }

  function step(d) { current = (current + d + order.length) % order.length; render(current); }

  document.getElementById('lbClose').addEventListener('click', closeLightbox);
  document.getElementById('lbPrev').addEventListener('click', function () { step(-1); });
  document.getElementById('lbNext').addEventListener('click', function () { step(1); });
  lb.addEventListener('click', function (e) {
    if (e.target === lb || e.target.classList.contains('lb-stage')) closeLightbox();
  });
  document.getElementById('lbEnquire').addEventListener('click', function () {
    var sel = document.getElementById('formWork');
    if (current > -1 && sel) sel.value = order[current].src;
    closeLightbox();
  });
  document.addEventListener('keydown', function (e) {
    if (menu.classList.contains('is-open') && e.key === 'Escape') { closeMenu(); return; }
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  });

  /* ---------------- form ---------------- */
  var form = document.getElementById('enquiryForm');
  var status = document.getElementById('formStatus');
  var workSelect = document.getElementById('formWork');

  function buildWorkOptions() {
    var keep = workSelect.value;
    workSelect.innerHTML = '';
    var any = document.createElement('option');
    any.value = ''; any.textContent = t('form.any');
    workSelect.appendChild(any);
    WORKS.forEach(function (w) {
      var o = document.createElement('option');
      o.value = w.src;
      o.textContent = title(w) + ' · ' + w.year;
      workSelect.appendChild(o);
    });
    workSelect.value = keep;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = form.elements.name, email = form.elements.email;
    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    name.setAttribute('aria-invalid', String(!name.value.trim()));
    email.setAttribute('aria-invalid', String(!emailOk));
    if (!name.value.trim() || !emailOk) { status.textContent = t('form.invalid'); return; }
    status.textContent = t('form.sent');
    form.reset();
    name.removeAttribute('aria-invalid');
    email.removeAttribute('aria-invalid');
  });

  /* ---------------- language + theme ---------------- */
  function applyLanguage() {
    root.setAttribute('lang', lang);
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('.lang-switch button').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-lang') === lang);
    });
    buildGalleries();
    buildWorkOptions();
    if (current > -1) render(current);
  }

  document.querySelectorAll('.lang-switch button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      lang = btn.getAttribute('data-lang');
      try { localStorage.setItem('gbq-lang', lang); } catch (e) {}
      applyLanguage();
    });
  });

  var themeToggle = document.getElementById('themeToggle');
  function isDark() {
    var s = root.getAttribute('data-theme');
    return s ? s === 'dark'
             : !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  themeToggle.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('gbq-theme', next); } catch (e) {}
    themeToggle.setAttribute('aria-pressed', String(isDark()));
  });
  themeToggle.setAttribute('aria-pressed', String(isDark()));

  /* ---------------- init ---------------- */
  Array.prototype.forEach.call(document.querySelectorAll('.slide img, .about-portrait img'),
    function (img) { watchMissing(img, (img.getAttribute('src') || '').split('/').pop()); });

  Array.prototype.forEach.call(document.querySelectorAll('.year'), function (el) {
    el.textContent = new Date().getFullYear();
  });
  applyLanguage();
  route();
})();
