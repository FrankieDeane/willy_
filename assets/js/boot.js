/* Runs before first paint so the stored theme and language are applied without
   a flash of the wrong one. Kept as a file rather than an inline <script> so
   the Content-Security-Policy can forbid inline script outright. */
(function () {
  var d = document.documentElement;
  d.classList.add('js');
  try {
    var t = localStorage.getItem('gbq-theme');
    if (t === 'dark' || t === 'light') d.setAttribute('data-theme', t);
    var l = localStorage.getItem('gbq-lang');
    if (l === 'en' || l === 'es') d.setAttribute('lang', l);
  } catch (e) { /* storage blocked — fall back to system preference */ }
})();
