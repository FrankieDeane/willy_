/* ========================================================
   AURELIA — interactions
   ======================================================== */
(function () {
  'use strict';

  /* ---------- sticky header + scroll progress + back-to-top ---------- */
  var header = document.getElementById('siteHeader');
  var progressBar = document.getElementById('progressBar');
  var backToTop = document.getElementById('backToTop');

  function onScroll() {
    var y = window.scrollY;
    var max = document.documentElement.scrollHeight - window.innerHeight;

    header.classList.toggle('scrolled', y > 60);
    backToTop.classList.toggle('visible', y > 600);
    progressBar.style.width = max > 0 ? (y / max) * 100 + '%' : '0%';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  backToTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---------- mobile nav ---------- */
  var navToggle = document.getElementById('navToggle');
  var mainNav = document.getElementById('mainNav');

  navToggle.addEventListener('click', function () {
    mainNav.classList.toggle('open');
  });
  mainNav.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') mainNav.classList.remove('open');
  });

  /* ---------- reveal on scroll ---------- */
  var revealItems = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    revealItems.forEach(function (el) { observer.observe(el); });
  } else {
    revealItems.forEach(function (el) { el.classList.add('in-view'); });
  }

  /* ---------- animated stat counters ---------- */
  var statNums = document.querySelectorAll('.stat-num');

  function countUp(el) {
    var target = parseInt(el.dataset.count, 10);
    var duration = 1600;
    var start = null;

    function step(ts) {
      if (start === null) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      // ease-out
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if ('IntersectionObserver' in window) {
    var statObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          countUp(entry.target);
          statObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    statNums.forEach(function (el) { statObserver.observe(el); });
  } else {
    statNums.forEach(function (el) { el.textContent = el.dataset.count; });
  }

  /* ---------- portfolio filtering ---------- */
  var filterBtns = document.querySelectorAll('.filter-btn');
  var galleryItems = document.querySelectorAll('.gallery-item');

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var filter = btn.dataset.filter;

      filterBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');

      galleryItems.forEach(function (item) {
        var show = filter === 'all' || item.dataset.cat === filter;
        item.classList.toggle('hidden-item', !show);
      });
    });
  });

  /* ---------- testimonial rotator ---------- */
  var testimonials = document.querySelectorAll('.testimonial');
  var dotsWrap = document.getElementById('testimonialDots');
  var current = 0;
  var timer;

  testimonials.forEach(function (_, i) {
    var dot = document.createElement('button');
    dot.setAttribute('aria-label', 'Testimonial ' + (i + 1));
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', function () { show(i); restart(); });
    dotsWrap.appendChild(dot);
  });

  var dots = dotsWrap.querySelectorAll('button');

  function show(i) {
    testimonials[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = i;
    testimonials[current].classList.add('active');
    dots[current].classList.add('active');
  }

  function next() { show((current + 1) % testimonials.length); }
  function restart() { clearInterval(timer); timer = setInterval(next, 6000); }

  if (testimonials.length > 1) restart();

  /* ---------- forms (preview only — no backend) ---------- */
  var contactForm = document.getElementById('contactForm');
  var formNote = document.getElementById('formNote');

  contactForm.addEventListener('submit', function (e) {
    e.preventDefault();
    formNote.textContent = 'Thank you — your enquiry has been received. We reply within 48 hours.';
    contactForm.reset();
  });

  var newsletterForm = document.getElementById('newsletterForm');
  newsletterForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var input = newsletterForm.querySelector('input');
    input.value = '';
    input.placeholder = 'Subscribed. Welcome.';
  });
})();
