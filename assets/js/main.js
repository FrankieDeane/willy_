/* ============================================================
   Guillermo Bernaldo de Quirós — gallery, lightbox, i18n, theme
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  var shots = Array.prototype.slice.call(document.querySelectorAll('.shot'));

  /* ---------------- translations ---------------- */
  var STRINGS = {
    en: {
      'skip': 'Skip to the work',
      'role': 'Photography',
      'nav.work': 'Work', 'nav.about': 'About', 'nav.contact': 'Contact',
      'theme.label': 'Switch theme',
      'intro.title': 'Light, held still.',
      'intro.body': 'Selected photographs by Guillermo Bernaldo de Quirós. Every frame below is a limited edition print — the gallery shows preview files only.',
      'intro.count': '12 works',
      'intro.hint': 'Click any photograph to enlarge',
      'about.kicker': 'About',
      'about.title': 'Guillermo Bernaldo de Quirós',
      'about.lead': 'Guillermo Bernaldo de Quirós is a Buenos Aires-based behavioral neurologist and architectural photographer with a distinguished dual career spanning medicine and visual arts.',
      'about.h.med': 'Medical Background',
      'about.p.med': 'Dr. Bernaldo de Quirós is a recognized expert in behavioral neurology, specializing in childhood hyperactivity disorders (ADHD) and related conditions. He completed his advanced training at the Kennedy Schriver Center at Harvard University in Boston, United States, bringing international expertise to his practice in Argentina. He currently serves as Director of the Center for Behavioral Neurology and works in the Pediatrics Department at CEMIC.',
      'about.h.photo': 'Photography Passion',
      'about.p.photo': 'Alongside his medical career, Guillermo pursues a deep passion for architectural and landscape photography. His work captures the essence of urban architecture across diverse styles, from modern skyscrapers to traditional buildings, with a keen eye for composition and light. His portfolio has been featured on international platforms including Inspiration Grid and has garnered nearly 100,000 project views, reflecting his distinctive visual perspective on cities worldwide.',
      'about.h.bridge': 'Bridging Two Worlds',
      'about.p.bridge': 'Guillermo\'s unique profile combines scientific rigor from his medical training with artistic sensibility from his photography practice, creating a distinctive perspective that informs both his clinical work and his visual documentation of architecture and urban landscapes.',
      'about.behance': 'Full portfolio on Behance',
      'contact.title': 'Enquire about a print',
      'contact.body': 'Tell me which photograph you have in mind and I will reply with sizes, framing options and availability.',
      'form.name': 'Name', 'form.email': 'Email', 'form.work': 'Photograph',
      'form.message': 'Message', 'form.submit': 'Send enquiry',
      'form.any': 'Not sure yet',
      'form.sent': 'Thank you — your enquiry has been noted. (Preview only: nothing was sent.)',
      'form.invalid': 'Please add your name and a valid email address.',
      'lb.edition': 'Edition', 'lb.print': 'Print', 'lb.printval': 'Archival cotton rag',
      'lb.price': 'From', 'lb.enquire': 'Enquire about this print',
      'lb.protect': 'Preview resolution. Not licensed for download or reproduction.',
      'lb.of': 'of',
      'footer.rights': 'All images are protected and may not be reproduced.',
      'footer.preview': 'Preview build — gallery files are low-resolution.'
    },
    es: {
      'skip': 'Ir a las fotografías',
      'role': 'Fotografía',
      'nav.work': 'Obra', 'nav.about': 'Sobre mí', 'nav.contact': 'Contacto',
      'theme.label': 'Cambiar tema',
      'intro.title': 'La luz, detenida.',
      'intro.body': 'Fotografías seleccionadas de Guillermo Bernaldo de Quirós. Cada imagen es una copia de edición limitada — la galería muestra solo archivos de previsualización.',
      'intro.count': '12 obras',
      'intro.hint': 'Haz clic en cualquier fotografía para ampliarla',
      'about.kicker': 'Sobre mí',
      'about.title': 'Guillermo Bernaldo de Quirós',
      'about.lead': 'Guillermo Bernaldo de Quirós es neurólogo conductual y fotógrafo de arquitectura radicado en Buenos Aires, con una destacada trayectoria doble entre la medicina y las artes visuales.',
      'about.h.med': 'Trayectoria médica',
      'about.p.med': 'El Dr. Bernaldo de Quirós es un reconocido experto en neurología del comportamiento, especializado en trastornos de hiperactividad infantil (TDAH) y afecciones relacionadas. Completó su formación avanzada en el Kennedy Schriver Center de la Universidad de Harvard, en Boston, Estados Unidos, aportando experiencia internacional a su práctica en Argentina. Actualmente es Director del Centro de Neurología del Comportamiento y trabaja en el Departamento de Pediatría del CEMIC.',
      'about.h.photo': 'Pasión por la fotografía',
      'about.p.photo': 'Junto a su carrera médica, Guillermo cultiva una profunda pasión por la fotografía de arquitectura y paisaje. Su obra capta la esencia de la arquitectura urbana en estilos muy diversos, desde rascacielos modernos hasta edificios tradicionales, con una mirada atenta a la composición y a la luz. Su portfolio ha sido destacado en plataformas internacionales como Inspiration Grid y acumula cerca de 100.000 visualizaciones de proyectos, reflejando su perspectiva visual distintiva sobre ciudades de todo el mundo.',
      'about.h.bridge': 'Dos mundos que se encuentran',
      'about.p.bridge': 'El perfil singular de Guillermo combina el rigor científico de su formación médica con la sensibilidad artística de su práctica fotográfica, creando una perspectiva distintiva que nutre tanto su trabajo clínico como su documentación visual de la arquitectura y los paisajes urbanos.',
      'about.behance': 'Portfolio completo en Behance',
      'contact.title': 'Consultar por una copia',
      'contact.body': 'Dime qué fotografía tienes en mente y te responderé con tamaños, opciones de enmarcado y disponibilidad.',
      'form.name': 'Nombre', 'form.email': 'Email', 'form.work': 'Fotografía',
      'form.message': 'Mensaje', 'form.submit': 'Enviar consulta',
      'form.any': 'Aún no lo sé',
      'form.sent': 'Gracias — tu consulta ha quedado registrada. (Solo previsualización: no se ha enviado nada.)',
      'form.invalid': 'Añade tu nombre y un email válido, por favor.',
      'lb.edition': 'Edición', 'lb.print': 'Copia', 'lb.printval': 'Algodón de conservación',
      'lb.price': 'Desde', 'lb.enquire': 'Consultar por esta copia',
      'lb.protect': 'Resolución de previsualización. Sin licencia para descarga ni reproducción.',
      'lb.of': 'de',
      'footer.rights': 'Todas las imágenes están protegidas y no pueden reproducirse.',
      'footer.preview': 'Versión de previsualización — los archivos son de baja resolución.'
    }
  };

  var lang = root.getAttribute('lang') === 'es' ? 'es' : 'en';
  var t = function (key) { return (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key; };

  /* Captions are built from data-* so both languages travel with the markup. */
  function shotTitle(fig) { return fig.getAttribute('data-title-' + lang) || fig.getAttribute('data-title-en'); }
  function shotPlace(fig) { return fig.getAttribute('data-place-' + lang) || fig.getAttribute('data-place-en'); }

  function applyLanguage() {
    root.setAttribute('lang', lang);

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });

    shots.forEach(function (fig) {
      var cap = fig.querySelector('.shot-cap');
      if (cap) {
        cap.querySelector('b').textContent = shotTitle(fig);
        cap.querySelector('span').textContent = fig.getAttribute('data-year');
      }
    });

    document.querySelectorAll('.lang-switch button').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-lang') === lang);
    });

    buildWorkOptions();
    if (current > -1) renderLightbox(current);
  }

  document.querySelectorAll('.lang-switch button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      lang = btn.getAttribute('data-lang');
      try { localStorage.setItem('gbq-lang', lang); } catch (e) {}
      applyLanguage();
    });
  });

  /* ---------------- theme ---------------- */
  var themeToggle = document.getElementById('themeToggle');

  function systemPrefersDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function isDark() {
    var set = root.getAttribute('data-theme');
    return set ? set === 'dark' : systemPrefersDark();
  }
  function syncToggle() { themeToggle.setAttribute('aria-pressed', String(isDark())); }

  themeToggle.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('gbq-theme', next); } catch (e) {}
    syncToggle();
  });
  syncToggle();

  /* ---------------- gallery ---------------- */
  shots.forEach(function (fig, i) {
    // caption element is added here so it never renders empty without JS
    var cap = document.createElement('figcaption');
    cap.className = 'shot-cap';
    cap.innerHTML = '<b></b><span></span>';
    fig.appendChild(cap);

    fig.setAttribute('tabindex', '0');
    fig.setAttribute('role', 'button');
    fig.addEventListener('click', function () { openLightbox(i); });
    fig.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(i); }
    });
  });

  // fade each photo in as it arrives
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -40px 0px' });
    shots.forEach(function (f) { io.observe(f); });
  } else {
    shots.forEach(function (f) { f.classList.add('is-in'); });
  }

  /* ---------------- image protection ----------------
     Deterrents against casual copying, not real DRM: a determined visitor can
     always screenshot. The genuine protection is that these files are preview
     resolution, so what they get is not printable. */
  document.addEventListener('contextmenu', function (e) {
    if (e.target.closest('.shot, .lb-frame, .about-portrait')) e.preventDefault();
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
  var lbPrice = document.getElementById('lbPrice');
  var lbEnquire = document.getElementById('lbEnquire');
  var current = -1;
  var lastFocus = null;

  function renderLightbox(i) {
    var fig = shots[i];
    lbImage.src = fig.getAttribute('data-src');
    lbImage.alt = fig.querySelector('img').alt;
    lbTitle.textContent = shotTitle(fig);
    lbPlace.textContent = shotPlace(fig) + ' · ' + fig.getAttribute('data-year');
    lbEdition.textContent = fig.getAttribute('data-edition') + ' ' + t('lb.of') + ' ' + fig.getAttribute('data-edition');
    lbPrice.textContent = fig.getAttribute('data-price');
  }

  function openLightbox(i) {
    current = i;
    lastFocus = document.activeElement;
    renderLightbox(i);
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lb-locked');
    document.getElementById('lbClose').focus();
  }

  function closeLightbox() {
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lb-locked');
    current = -1;
    if (lastFocus) lastFocus.focus();
  }

  function step(delta) {
    current = (current + delta + shots.length) % shots.length;
    renderLightbox(current);
  }

  document.getElementById('lbClose').addEventListener('click', closeLightbox);
  document.getElementById('lbPrev').addEventListener('click', function () { step(-1); });
  document.getElementById('lbNext').addEventListener('click', function () { step(1); });

  // click the backdrop (not the photo or the panel) to dismiss
  lb.addEventListener('click', function (e) {
    if (e.target === lb || e.target.classList.contains('lb-stage')) closeLightbox();
  });

  lbEnquire.addEventListener('click', function () {
    var sel = document.getElementById('formWork');
    if (current > -1 && sel) sel.value = shots[current].getAttribute('data-src');
    closeLightbox();
  });

  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  });

  /* ---------------- enquiry form ---------------- */
  var form = document.getElementById('enquiryForm');
  var status = document.getElementById('formStatus');
  var workSelect = document.getElementById('formWork');

  function buildWorkOptions() {
    var keep = workSelect.value;
    workSelect.innerHTML = '';
    var any = document.createElement('option');
    any.value = '';
    any.textContent = t('form.any');
    workSelect.appendChild(any);

    shots.forEach(function (fig) {
      var o = document.createElement('option');
      o.value = fig.getAttribute('data-src');
      o.textContent = shotTitle(fig) + ' · ' + fig.getAttribute('data-year');
      workSelect.appendChild(o);
    });
    workSelect.value = keep;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = form.elements.name;
    var email = form.elements.email;
    var valid = name.value.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());

    name.setAttribute('aria-invalid', String(!name.value.trim()));
    email.setAttribute('aria-invalid', String(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())));

    if (!valid) { status.textContent = t('form.invalid'); return; }
    status.textContent = t('form.sent');
    form.reset();
    name.removeAttribute('aria-invalid');
    email.removeAttribute('aria-invalid');
  });

  /* ---------------- init ---------------- */
  document.getElementById('year').textContent = new Date().getFullYear();
  applyLanguage();
})();
