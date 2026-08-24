#!/usr/bin/env node
/* ============================================================================
   build.mjs — generates the whole static site from three data files.

     tools/albums.json   the 31 series
     tools/i18n.json     every string, in EN and ES
     tools/site.json     domain, base path, contact address, sizes, papers

   Output: real HTML pages, one per section per language, plus one per series.
   No hash router, no client-side rendering of primary content: a crawler and a
   visitor with JavaScript off both get the full page. That is the whole SEO
   argument for building it this way rather than as a single-page app.

   Zero dependencies on purpose — every npm package in a build chain is another
   thing that could ship someone else's code into this site.

   Usage:  node tools/build.mjs
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const SITE    = read('tools/site.json');
const I18N    = read('tools/i18n.json');
const ALBUMS  = read('tools/albums.json').albums;

const IMG_DIR = path.join(ROOT, 'assets/img');
const LANGS   = ['en', 'es'];
const YEAR    = new Date().getFullYear();
const TODAY   = new Date().toISOString().slice(0, 10);

/* ---------------------------------------------------------------- helpers */

/* Everything that reaches the page goes through this. The data files are
   trusted, but escaping at the boundary means a stray quote in a title can
   never break out of an attribute — and never become markup. */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
/* Some strings in i18n.json carry deliberate entities (&amp;). Titles and
   descriptions are written as final text, so they are inserted raw but still
   quote-escaped for attribute use. */
function attr(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
const json = (o) => JSON.stringify(o, null, 2).replace(/</g, '\\u003c');

/* ------------------------------------------------------------- the catalog

   A series' photographs are whatever files actually exist as
   <slug>-gbq-<n>.jpg. Until those are committed, `expected` from albums.json
   stands in so the layout is real and every missing file is named on screen —
   the page tells you exactly which filename it is waiting for. */

let dims = {};
try { dims = read('assets/img/dimensions.json'); } catch { /* not generated yet */ }

function photosFor(album) {
  let found = [];
  try {
    const re = new RegExp('^' + album.slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '-gbq-(\\d+)\\.jpg$');
    found = fs.readdirSync(IMG_DIR)
      .map((f) => { const m = re.exec(f); return m ? { file: f, n: Number(m[1]) } : null; })
      .filter(Boolean)
      .sort((a, b) => a.n - b.n);
  } catch { /* assets/img not created yet */ }

  const list = found.length
    ? found
    : Array.from({ length: album.expected || 0 }, (_, i) => ({ file: `${album.slug}-gbq-${i + 1}.jpg`, n: i + 1 }));

  return list.map((p) => ({
    f: p.file,
    n: p.n,
    w: dims[p.file]?.w || null,
    h: dims[p.file]?.h || null,
    real: found.length > 0
  }));
}

const CATALOG = ALBUMS.map((a) => ({ ...a, photos: photosFor(a) }));

/* A photography portfolio indexed with no photographs in it is worse than not
   being indexed at all: Google sees thin pages and 250 image URLs that 404,
   and that first impression takes weeks to undo. So indexing is tied to the
   photographs actually existing, and turns itself on the moment they land —
   nobody has to remember to flip a switch on launch day.
     "auto" (default) · index only once at least one photograph is on disk
     true / false      · force it either way */
const HAS_PHOTOS = CATALOG.some((a) => a.photos.some((p) => p.real));
const INDEXABLE = SITE.indexable === true ? true
                : SITE.indexable === false ? false
                : HAS_PHOTOS;

/* The image every share card and every social preview uses. Named in
   site.json so it is a decision, not an accident of sort order. */
function coverPhoto() {
  const a = CATALOG.find((x) => x.slug === SITE.cover) || CATALOG.find((x) => x.photos.length);
  return a?.photos[0] || null;
}
const TOTAL_PHOTOS = CATALOG.reduce((s, a) => s + a.photos.length, 0);
const READY = CATALOG.filter((a) => a.photos.some((p) => p.real)).length;

/* --------------------------------------------------------------- routing */

/* Every page knows its own depth so asset URLs stay relative. Relative URLs
   are what let the same build run at github.io/willy_/, at the root of a
   custom domain, and from a file:// preview without a rebuild. */
const PAGES = [
  { id: 'home',      file: 'index.html',     depth: 0 },
  { id: 'work',      file: 'work.html',      depth: 0 },
  { id: 'prints',    file: 'prints.html',    depth: 0 },
  { id: 'selection', file: 'selection.html', depth: 0 },
  { id: 'about',     file: 'about.html',     depth: 0 },
  { id: 'contact',   file: 'contact.html',   depth: 0 }
];

function up(depth) { return depth === 0 ? '' : '../'.repeat(depth); }

/* Prefix for anything under /assets/, which is shared by both languages and
   lives at the site root. Spanish pages are one directory deeper than their
   English twins, so they need one more step out than their `depth` says. */
function assetPrefix(lang, depth) { return up(depth + (lang === 'es' ? 1 : 0)); }

/* path of a page, relative to the language root */
function pagePath(id, slug) {
  if (id === 'album') return `albums/${slug}.html`;
  return PAGES.find((p) => p.id === id).file;
}

/* absolute URL, for canonical / og / sitemap */
function absUrl(lang, id, slug) {
  const dir = lang === 'es' ? 'es/' : '';
  const p = pagePath(id, slug);
  return `${SITE.origin}${SITE.base}/${dir}${p === 'index.html' ? '' : p}`;
}

/* link from one page to another, both within the same language */
function link(fromDepth, id, slug) {
  return up(fromDepth) + pagePath(id, slug);
}

/* the same page in the other language */
function otherLangHref(lang, depth, id, slug) {
  const target = lang === 'en' ? 'es' : 'en';
  const p = pagePath(id, slug);
  // depth is measured from the language root; step out of it, then back in
  return lang === 'en' ? up(depth) + 'es/' + p : up(depth) + '../' + p;
}

/* ------------------------------------------------------------------ chrome */

function head({ lang, id, slug, title, desc, image, depth, jsonld }) {
  const t = I18N[lang];
  const A = assetPrefix(lang, depth);
  const canonical = absUrl(lang, id, slug);
  const altEn = absUrl('en', id, slug);
  const altEs = absUrl('es', id, slug);
  const ogImage = image ? `${SITE.origin}${SITE.base}/assets/img/${image}` : '';
  const ogDim = image && dims[image] ? `
<meta property="og:image:width" content="${dims[image].w}" />
<meta property="og:image:height" content="${dims[image].h}" />` : '';

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<!-- ===== security =====
     GitHub Pages cannot send response headers, so everything expressible as a
     meta tag is set here; vercel.json and public/_headers carry the rest on
     hosts that can. Policy is deny-by-default: 'none', then only what this
     site genuinely uses is allowed back, and no external origin is allowed at
     all. Fonts, styles and scripts are self-hosted, so injected markup has
     nowhere to call out to. Trusted Types is on, which means no code path in
     this site is allowed to assign a string to innerHTML.
     See SECURITY.md. -->
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-src 'none'; object-src 'none'; media-src 'none'; worker-src 'none'; manifest-src 'self'; require-trusted-types-for 'script'; upgrade-insecure-requests" />
<meta name="referrer" content="strict-origin-when-cross-origin" />

<!-- ===== identity ===== -->
<title>${esc(title)}</title>
<meta name="description" content="${attr(desc)}" />
<meta name="author" content="${esc(t['site.name'])}" />
<link rel="canonical" href="${canonical}" />
<meta name="robots" content="${INDEXABLE
  ? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
  : 'noindex, nofollow'}" />

<!-- ===== languages =====
     Separate URLs per language rather than a JavaScript toggle: this is what
     lets Google serve the English pages to the United States, Canada and the
     UK and the Spanish ones to Spain and Latin America, instead of picking
     one and indexing half the site. -->
<link rel="alternate" hreflang="en" href="${altEn}" />
<link rel="alternate" hreflang="es" href="${altEs}" />
<link rel="alternate" hreflang="x-default" href="${altEn}" />

<meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff" />
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0d0d0d" />

<!-- ===== sharing =====
     Most of this site's discovery is image search, so max-image-preview:large
     above and a real og:image matter more here than on an ordinary site. -->
<meta property="og:type" content="website" />
<meta property="og:site_name" content="${esc(t['site.name'])}" />
<meta property="og:title" content="${attr(title)}" />
<meta property="og:description" content="${attr(desc)}" />
<meta property="og:url" content="${canonical}" />
<meta property="og:locale" content="${t.locale}" />
<meta property="og:locale:alternate" content="${lang === 'en' ? 'es_ES' : 'en_US'}" />${ogImage ? `
<meta property="og:image" content="${ogImage}" />${ogDim}
<meta property="og:image:alt" content="${attr(title)}" />` : ''}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${attr(title)}" />
<meta name="twitter:description" content="${attr(desc)}" />${ogImage ? `
<meta name="twitter:image" content="${ogImage}" />` : ''}

<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 fill=%22%230d0d0d%22/><rect x=%2230%22 y=%2222%22 width=%2240%22 height=%2256%22 fill=%22none%22 stroke=%22%23fff%22 stroke-width=%226%22/></svg>" />

<link rel="preload" href="${A}assets/fonts/jost-300-latin.woff2" as="font" type="font/woff2" crossorigin />
<link rel="stylesheet" href="${A}assets/css/fonts.css" />
<link rel="stylesheet" href="${A}assets/css/style.css" />
<script src="${A}assets/js/boot.js"></script>

<script type="application/ld+json">
${json(jsonld)}
</script>
</head>
<body data-page="${id}"${slug ? ` data-album="${esc(slug)}"` : ''} data-lang="${lang}" data-base="${A}">

<a href="#content" class="skip-link">${esc(t.skip)}</a>
`;
}

function chrome({ lang, id, slug, depth }) {
  const t = I18N[lang];
  const L = (pid) => link(depth, pid);
  const nav = [
    ['home', t['nav.home']], ['work', t['nav.work']], ['prints', t['nav.prints']],
    ['selection', t['nav.selection']], ['about', t['nav.about']], ['contact', t['nav.contact']]
  ];
  const rail = [
    SITE.behance ? `<a href="${SITE.behance}" target="_blank" rel="noopener noreferrer">BEHANCE</a>` : '',
    SITE.instagram ? `<a href="${SITE.instagram}" target="_blank" rel="noopener noreferrer">INSTAGRAM</a>` : ''
  ].filter(Boolean).join('\n  ');

  return `
<!-- ===== FIXED CHROME ===== -->
<a href="${L('home')}" class="wordmark">
  <span class="wordmark-name"><i>GUILLERMO</i><b>BERNALDO DE QUIRÓS</b></span>
  <span class="wordmark-sub">${esc(t['site.role'])}</span>
</a>

<div class="chrome-right">
  <a class="sel-badge" id="selBadge" href="${L('selection')}" hidden>
    <span class="sel-badge-n" id="selBadgeN">0</span>
    <span class="sr-only">${esc(t['nav.selection'])}</span>
  </a>
  <button class="burger" id="burger" aria-label="${esc(t['menu.open'])}"
          data-open="${attr(t['menu.open'])}" data-close="${attr(t['menu.close'])}"
          aria-expanded="false" aria-controls="menu">
    <span></span><span></span>
  </button>
</div>

${rail ? `<footer class="rail">\n  ${rail}\n</footer>` : ''}

<!-- ===== MENU OVERLAY ===== -->
<nav class="menu" id="menu" aria-hidden="true" aria-label="${esc(t['nav.main'])}">
  <ul>
${nav.map(([pid, label]) =>
  `    <li><a href="${L(pid)}"${pid === id ? ' class="is-current" aria-current="page"' : ''}>${esc(label)}</a></li>`
).join('\n')}
  </ul>
  <div class="menu-controls">
    <a class="lang-link" href="${otherLangHref(lang, depth, id, slug)}" hreflang="${lang === 'en' ? 'es' : 'en'}" rel="alternate">${esc(t['lang.other'])}</a>
    <button type="button" class="theme-toggle" id="themeToggle" aria-pressed="false">
      <span class="theme-icon" aria-hidden="true"></span>
      <span class="sr-only">${esc(t['theme.label'])}</span>
    </button>
  </div>
  <p class="menu-copy">© ${YEAR} ${esc(t['site.name'])}</p>
</nav>
`;
}

function lightbox(lang) {
  const t = I18N[lang];
  return `
<!-- ===== LIGHTBOX ===== -->
<div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-hidden="true">
  <button class="lb-close" id="lbClose" aria-label="${esc(t['lb.close'])}"><span aria-hidden="true">✕</span></button>
  <figure class="lb-stage">
    <div class="lb-frame" id="lbFrame">
      <button class="lb-nav lb-prev" id="lbPrev" aria-label="${esc(t['lb.prev'])}"><span aria-hidden="true">‹</span></button>
      <button class="lb-nav lb-next" id="lbNext" aria-label="${esc(t['lb.next'])}"><span aria-hidden="true">›</span></button>
      <img id="lbImage" alt="" draggable="false" />
      <div class="lb-shield" aria-hidden="true"></div>
      <div class="lb-watermark" aria-hidden="true"><span>GBQ</span><span>GBQ</span><span>GBQ</span></div>
    </div>
    <figcaption class="lb-meta">
      <h2 id="lbTitle"></h2>
      <p id="lbPlace"></p>
      <dl class="lb-spec">
        <div><dt>${esc(t['lb.print'])}</dt><dd>${esc(t['lb.printval'])}</dd></div>
      </dl>
      <button type="button" class="btn lb-cta" id="lbAdd">${esc(t['sel.add'])}</button>
      <p class="lb-protect">${esc(t['lb.protect'])}</p>
    </figcaption>
  </figure>
</div>
`;
}

function foot({ lang, depth }) {
  const t = I18N[lang];
  const A = assetPrefix(lang, depth);
  return `
<footer class="site-foot">
  <p>© ${YEAR} ${esc(t['site.name'])}. ${esc(t['foot.rights'])}</p>
</footer>

<script src="${A}assets/js/catalog.js"></script>
<script src="${A}assets/js/main.js"></script>
</body>
</html>
`;
}

/* -------------------------------------------------------------- fragments */

function shot({ album, photo, lang, depth, eager }) {
  const t = I18N[lang];
  const A = assetPrefix(lang, depth);
  const name = `${album[lang]} № ${photo.n}`;
  const place = album[`place_${lang}`];
  const alt = [album[lang], place, t['site.name']].filter(Boolean).join(' — ');
  const dim = photo.w ? ` width="${photo.w}" height="${photo.h}"` : '';
  return `      <figure class="shot${photo.w ? '' : ' no-dims'}" data-file="${esc(photo.f)}" data-album="${esc(album.slug)}">
        <img src="${A}assets/img/w960/${esc(photo.f)}"
             srcset="${A}assets/img/w480/${esc(photo.f)} 480w, ${A}assets/img/w960/${esc(photo.f)} 960w, ${A}assets/img/${esc(photo.f)} 1600w"
             sizes="(max-width: 620px) 100vw, (max-width: 1000px) 50vw, 33vw"${dim}
             alt="${attr(alt)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async" draggable="false" />
        <figcaption class="shot-cap">${esc(name)}</figcaption>
        <button type="button" class="shot-add" data-file="${esc(photo.f)}" data-album="${esc(album.slug)}"
                aria-label="${attr(t['sel.add'] + ' — ' + name)}"><span aria-hidden="true">✛</span></button>
      </figure>`;
}

function albumCard({ album, lang, depth }) {
  const t = I18N[lang];
  const A = assetPrefix(lang, depth);
  const cover = album.photos[Math.min((album.cover || 1) - 1, album.photos.length - 1)];
  const n = album.photos.length;
  const place = album[`place_${lang}`];
  return `    <a class="card" href="${link(depth, 'album', album.slug)}" data-theme="${esc(album.theme)}">
      <span class="card-img${cover ? '' : ' is-empty'}">${cover ? `<img src="${A}assets/img/w480/${esc(cover.f)}"
             srcset="${A}assets/img/w480/${esc(cover.f)} 480w, ${A}assets/img/w960/${esc(cover.f)} 960w"
             sizes="(max-width: 620px) 100vw, (max-width: 1000px) 50vw, 33vw"
             alt="${attr(album[lang])}" loading="lazy" decoding="async" draggable="false" />` : ''}</span>
      <span class="card-body">
        <span class="card-title">${esc(album[lang])}</span>
        <span class="card-meta">${place ? esc(place) + ' · ' : ''}${n} ${esc(n === 1 ? t['work.count.one'] : t['work.count.many'])}</span>
      </span>
    </a>`;
}

/* ---------------------------------------------------------------- JSON-LD */

function personNode() {
  return {
    '@type': 'Person',
    '@id': `${SITE.origin}${SITE.base}/#person`,
    name: 'Guillermo Bernaldo de Quirós',
    jobTitle: ['Photographer', 'Behavioral Neurologist'],
    url: `${SITE.origin}${SITE.base}/`,
    address: { '@type': 'PostalAddress', addressLocality: SITE.locality, addressCountry: SITE.country },
    alumniOf: { '@type': 'CollegeOrUniversity', name: 'Harvard University' },
    worksFor: { '@type': 'MedicalOrganization', name: 'CEMIC' },
    knowsAbout: ['Fine art photography', 'Architectural photography', 'Landscape photography', 'Behavioral neurology'],
    sameAs: [SITE.behance, SITE.instagram].filter(Boolean)
  };
}

function siteNode(lang) {
  return {
    '@type': 'WebSite',
    '@id': `${SITE.origin}${SITE.base}/#website`,
    url: `${SITE.origin}${SITE.base}/`,
    name: `${I18N[lang]['site.name']} — Photography`,
    inLanguage: ['en', 'es'],
    author: { '@id': `${SITE.origin}${SITE.base}/#person` },
    copyrightHolder: { '@id': `${SITE.origin}${SITE.base}/#person` }
  };
}

function crumbs(lang, trail) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((x, i) => ({
      '@type': 'ListItem', position: i + 1, name: x.name, item: x.url
    }))
  };
}

/* -------------------------------------------------------------- the pages */

function pageHome(lang) {
  const t = I18N[lang], depth = 0;
  const featured = CATALOG.filter((a) => a.photos.length >= 6).slice(0, 6);
  const graph = [personNode(), siteNode(lang), {
    '@type': 'CollectionPage',
    '@id': absUrl(lang, 'home') + '#page',
    url: absUrl(lang, 'home'),
    name: t['home.title'],
    description: t['home.desc'],
    inLanguage: lang,
    isPartOf: { '@id': `${SITE.origin}${SITE.base}/#website` },
    about: { '@id': `${SITE.origin}${SITE.base}/#person` }
  }];

  const cover = coverPhoto();

  return head({ lang, id: 'home', title: t['home.title'], desc: t['home.desc'], depth,
                image: cover?.f, jsonld: { '@context': 'https://schema.org', '@graph': graph } })
    + chrome({ lang, id: 'home', depth })
    + `
<main id="content">
<h1 class="sr-only">${esc(t['home.h1'])} — ${esc(t['site.name'])}</h1>

<section class="hero">
  <div class="slides" id="slides"></div>
  <noscript><div class="slide is-current">${cover
    ? `<img src="${assetPrefix(lang, 0)}assets/img/w960/${esc(cover.f)}" alt="${attr(t['home.h1'])}" />` : ''}</div></noscript>
  <div class="hero-copy">
    <p class="hero-tag">${esc(t['site.tagline'])}</p>
    <a class="btn btn-light" href="${link(0, 'work')}">${esc(t['home.enter'])}</a>
  </div>
  <div class="home-controls">
    <button type="button" class="slide-pause" id="slidePause" aria-pressed="false"></button>
    <div class="slide-count" id="slideCount" aria-live="off"></div>
  </div>
</section>

<section class="band">
  <header class="band-head">
    <h2>${esc(t['home.featured'])}</h2>
    <a class="band-more" href="${link(0, 'work')}">${esc(t['home.featured.all'])} <span aria-hidden="true">→</span></a>
  </header>
  <div class="cards">
${featured.map((a) => albumCard({ album: a, lang, depth })).join('\n')}
  </div>
</section>

<section class="band band-sell">
  <div class="sell">
    <h2>${esc(t['home.sell.title'])}</h2>
    <p>${esc(t['home.sell.body'])}</p>
    <a class="btn" href="${link(0, 'selection')}">${esc(t['home.sell.cta'])}</a>
  </div>
</section>
</main>
` + foot({ lang, depth });
}

function pageWork(lang) {
  const t = I18N[lang], depth = 0;
  const themes = ['all', 'architecture', 'landscape', 'street', 'travel'];
  const graph = [personNode(), siteNode(lang),
    crumbs(lang, [
      { name: t['nav.home'], url: absUrl(lang, 'home') },
      { name: t['work.h'],   url: absUrl(lang, 'work') }
    ]),
    {
      '@type': 'CollectionPage',
      url: absUrl(lang, 'work'),
      name: t['work.title'],
      description: t['work.desc'],
      inLanguage: lang,
      hasPart: CATALOG.map((a) => ({
        '@type': 'ImageGallery',
        name: a[lang],
        url: absUrl(lang, 'album', a.slug),
        author: { '@id': `${SITE.origin}${SITE.base}/#person` }
      }))
    }];

  return head({ lang, id: 'work', title: t['work.title'], desc: t['work.desc'], depth,
                image: coverPhoto()?.f, jsonld: { '@context': 'https://schema.org', '@graph': graph } })
    + chrome({ lang, id: 'work', depth })
    + `
<main id="content" class="page-doc">
  <header class="page-head">
    <h1>${esc(t['work.h'])}</h1>
    <span class="rule"></span>
    <div class="page-lede"><p>${esc(t['work.lede'])}</p></div>
  </header>

  <div class="filters" id="filters" role="group" aria-label="${esc(t['work.h'])}">
${themes.map((th, i) =>
  `    <button type="button" data-filter="${th}"${i === 0 ? ' class="is-active" aria-pressed="true"' : ' aria-pressed="false"'}>${esc(t['work.filter.' + th])}</button>`
).join('\n')}
  </div>

  <div class="cards cards-all" id="albumGrid">
${CATALOG.map((a) => albumCard({ album: a, lang, depth })).join('\n')}
  </div>
</main>
` + foot({ lang, depth });
}

function pageAlbum(lang, album, prev, next) {
  const t = I18N[lang], depth = 1;
  const place = album[`place_${lang}`];
  const title = `${album[lang]} — ${lang === 'en' ? 'Fine Art Photography Prints' : 'Copias de arte fotográfico'} | ${t['site.name']}`;
  const desc = `${album[`blurb_${lang}`]} ${album.photos.length} ${album.photos.length === 1 ? t['work.count.one'] : t['work.count.many']}${place ? ` — ${place}` : ''}. ${lang === 'en' ? 'Signed limited edition prints.' : 'Copias de edición limitada firmadas.'}`;

  const graph = [personNode(), siteNode(lang),
    crumbs(lang, [
      { name: t['nav.home'], url: absUrl(lang, 'home') },
      { name: t['work.h'],   url: absUrl(lang, 'work') },
      { name: album[lang],   url: absUrl(lang, 'album', album.slug) }
    ]),
    {
      '@type': 'ImageGallery',
      '@id': absUrl(lang, 'album', album.slug) + '#gallery',
      url: absUrl(lang, 'album', album.slug),
      name: album[lang],
      description: album[`blurb_${lang}`],
      inLanguage: lang,
      author: { '@id': `${SITE.origin}${SITE.base}/#person` },
      copyrightHolder: { '@id': `${SITE.origin}${SITE.base}/#person` },
      ...(place ? { contentLocation: { '@type': 'Place', name: place } } : {}),
      /* One ImageObject per photograph. This is what puts individual frames
         into Google Images with a creator and a licence page attached, which
         for a print seller is the single highest-value piece of markup here. */
      associatedMedia: album.photos.map((p) => ({
        '@type': 'ImageObject',
        contentUrl: `${SITE.origin}${SITE.base}/assets/img/${p.f}`,
        thumbnailUrl: `${SITE.origin}${SITE.base}/assets/img/w480/${p.f}`,
        name: `${album[lang]} № ${p.n}`,
        ...(p.w ? { width: p.w, height: p.h } : {}),
        creator: { '@id': `${SITE.origin}${SITE.base}/#person` },
        copyrightNotice: `© ${YEAR} Guillermo Bernaldo de Quirós`,
        creditText: 'Guillermo Bernaldo de Quirós',
        acquireLicensePage: absUrl(lang, 'prints'),
        license: absUrl(lang, 'prints')
      }))
    }];

  const shots = album.photos.length
    ? `  <div class="grid">\n${album.photos.map((p, i) =>
        shot({ album, photo: p, lang, depth, eager: i < 3 })).join('\n')}\n  </div>`
    : `  <p class="empty-note">${esc(t['album.soon'])}</p>`;

  return head({ lang, id: 'album', slug: album.slug, title, desc, depth,
                image: album.photos[0]?.f, jsonld: { '@context': 'https://schema.org', '@graph': graph } })
    + chrome({ lang, id: 'album', slug: album.slug, depth })
    + `
<main id="content" class="page-doc">
  <a class="back-link" href="${link(depth, 'work')}"><span aria-hidden="true">←</span> ${esc(t['album.back'])}</a>

  <header class="page-head">
    <h1>${esc(album[lang])}</h1>
    <span class="rule"></span>
    <div class="page-lede">
      <p>${esc(album[`blurb_${lang}`])}</p>
      ${place ? `<p class="page-place">${esc(place)}</p>` : ''}
    </div>
  </header>

${shots}

  <p class="album-cta">${esc(t['album.cta'])} <a href="${link(depth, 'selection')}">${esc(t['album.cta.link'])}</a>.</p>

  <nav class="album-nav" aria-label="${esc(t['work.h'])}">
    <a class="album-nav-prev" href="${link(depth, 'album', prev.slug)}"><span aria-hidden="true">←</span> <span>${esc(t['album.prev'])}<b>${esc(prev[lang])}</b></span></a>
    <a class="album-nav-next" href="${link(depth, 'album', next.slug)}"><span>${esc(t['album.next'])}<b>${esc(next[lang])}</b></span> <span aria-hidden="true">→</span></a>
  </nav>
</main>
` + lightbox(lang) + foot({ lang, depth });
}

function pagePrints(lang) {
  const t = I18N[lang], depth = 0;
  const graph = [personNode(), siteNode(lang),
    crumbs(lang, [
      { name: t['nav.home'],  url: absUrl(lang, 'home') },
      { name: t['prints.h'],  url: absUrl(lang, 'prints') }
    ]),
    {
      '@type': 'Service',
      name: t['prints.title'],
      description: t['prints.desc'],
      serviceType: lang === 'en' ? 'Fine art photographic printing' : 'Impresión fotográfica de arte',
      provider: { '@id': `${SITE.origin}${SITE.base}/#person` },
      areaServed: ['US', 'CA', 'GB', 'IE', 'ES', 'FR', 'DE', 'IT', 'NL', 'AR'],
      availableChannel: { '@type': 'ServiceChannel', serviceUrl: absUrl(lang, 'selection') }
    }];

  return head({ lang, id: 'prints', title: t['prints.title'], desc: t['prints.desc'], depth,
                jsonld: { '@context': 'https://schema.org', '@graph': graph } })
    + chrome({ lang, id: 'prints', depth })
    + `
<main id="content" class="page-doc">
  <header class="page-head">
    <h1>${esc(t['prints.h'])}</h1>
    <span class="rule"></span>
    <div class="page-lede">
      <p>${esc(t['prints.p1'])}</p>
      <p>${esc(t['prints.p2'])}</p>
      <p>${esc(t['prints.p3'])}</p>
    </div>
  </header>

  <div class="specs">
    <section class="spec">
      <h2>${esc(t['prints.sizes.h'])}</h2>
      <ul class="spec-list">
${SITE.sizes.map((s) => `        <li><b>${esc(s.label)}</b><span>${esc(s.inches)}</span></li>`).join('\n')}
      </ul>
      <p class="spec-note">${esc(t['prints.sizes.note'])}</p>
    </section>

    <section class="spec">
      <h2>${esc(t['prints.papers.h'])}</h2>
      <dl class="spec-dl">
        <dt>${esc(t['prints.paper1.n'])}</dt><dd>${esc(t['prints.paper1.d'])}</dd>
        <dt>${esc(t['prints.paper2.n'])}</dt><dd>${esc(t['prints.paper2.d'])}</dd>
      </dl>
    </section>

    <section class="spec">
      <h2>${esc(t['prints.frame.h'])}</h2>
      <p>${esc(t['prints.frame.d'])}</p>
    </section>

    <section class="spec">
      <h2>${esc(t['prints.edition.h'])}</h2>
      <p>${esc(t['prints.edition.d'])}</p>
      <p class="spec-price"><b>${esc(t['prints.price'])}</b> ${esc(t['prints.price.note'])}</p>
    </section>
  </div>

  <p class="center-cta"><a class="btn" href="${link(0, 'selection')}">${esc(t['prints.cta'])}</a></p>
</main>
` + foot({ lang, depth });
}

function pageSelection(lang) {
  const t = I18N[lang], depth = 0;
  const graph = [personNode(), siteNode(lang),
    crumbs(lang, [
      { name: t['nav.home'], url: absUrl(lang, 'home') },
      { name: t['sel.h'],    url: absUrl(lang, 'selection') }
    ]),
    { '@type': 'WebPage', url: absUrl(lang, 'selection'), name: t['sel.title'],
      description: t['sel.desc'], inLanguage: lang }];

  return head({ lang, id: 'selection', title: t['sel.title'], desc: t['sel.desc'], depth,
                jsonld: { '@context': 'https://schema.org', '@graph': graph } })
    + chrome({ lang, id: 'selection', depth })
    + `
<main id="content" class="page-doc">
  <header class="page-head">
    <h1>${esc(t['sel.h'])}</h1>
    <span class="rule"></span>
    <div class="page-lede"><p>${esc(t['sel.lede'])}</p></div>
  </header>

  <div class="sel-empty" id="selEmpty">
    <h2>${esc(t['sel.empty.h'])}</h2>
    <p>${esc(t['sel.empty.b'])}</p>
    <a class="btn" href="${link(0, 'work')}">${esc(t['sel.empty.cta'])}</a>
  </div>

  <div class="sel-live" id="selLive" hidden>
    <p class="sel-count" id="selCount" role="status" aria-live="polite"></p>
    <div class="sel-grid" id="selGrid"></div>
    <p class="sel-hang" id="selHang"></p>
    <button type="button" class="link-btn" id="selClear">${esc(t['sel.clear'])}</button>

    <form class="sel-form" id="selForm" novalidate>
      <fieldset>
        <legend>${esc(t['sel.spec.h'])}</legend>
        <div class="field-row">
          <label><span>${esc(t['sel.size'])}</span>
            <select name="size">
${SITE.sizes.map((s) => `              <option value="${esc(s.label)}">${esc(s.label)} · ${esc(s.inches)}</option>`).join('\n')}
            </select></label>
          <label><span>${esc(t['sel.paper'])}</span>
            <select name="paper">
${SITE.papers.map((p) => `              <option value="${esc(p[lang])}">${esc(p[lang])}</option>`).join('\n')}
            </select></label>
          <label><span>${esc(t['sel.frame'])}</span>
            <select name="frame">
              <option value="${esc(t['sel.frame.no'])}">${esc(t['sel.frame.no'])}</option>
              <option value="${esc(t['sel.frame.yes'])}">${esc(t['sel.frame.yes'])}</option>
            </select></label>
        </div>
      </fieldset>

      <fieldset>
        <legend>${esc(t['sel.you'])}</legend>
        <div class="field-row">
          <label><span>${esc(t['form.name'])}</span><input type="text" name="name" autocomplete="name" required /></label>
          <label><span>${esc(t['form.email'])}</span><input type="email" name="email" autocomplete="email" required /></label>
          <label><span>${esc(t['form.country'])}</span><input type="text" name="country" autocomplete="country-name" /></label>
        </div>
        <label><span>${esc(t['form.message'])}</span><textarea name="message" rows="3"></textarea></label>
      </fieldset>

      <div class="hp" aria-hidden="true">
        <label>${esc(t['form.hp'])}<input type="text" name="company" tabindex="-1" autocomplete="off" /></label>
      </div>
      <div class="sel-actions">
        <button type="submit" class="btn">${esc(t['sel.send'])}</button>
        <button type="button" class="btn btn-ghost" id="selCopy">${esc(t['sel.copy'])}</button>
      </div>
      <p class="form-status" id="selStatus" role="status" aria-live="polite"></p>
      <p class="sel-privacy">${esc(t['sel.privacy'])}</p>
      <noscript><p class="sel-privacy">${esc(t['form.noscript'])}</p></noscript>
    </form>
  </div>
</main>
` + foot({ lang, depth });
}

function pageAbout(lang) {
  const t = I18N[lang], depth = 0;
  const portrait = coverPhoto();
  const graph = [personNode(), siteNode(lang),
    crumbs(lang, [
      { name: t['nav.home'], url: absUrl(lang, 'home') },
      { name: t['about.h'],  url: absUrl(lang, 'about') }
    ]),
    { '@type': 'AboutPage', url: absUrl(lang, 'about'), name: t['about.title'],
      description: t['about.desc'], inLanguage: lang,
      mainEntity: { '@id': `${SITE.origin}${SITE.base}/#person` } }];

  return head({ lang, id: 'about', title: t['about.title'], desc: t['about.desc'], depth,
                image: portrait?.f, jsonld: { '@context': 'https://schema.org', '@graph': graph } })
    + chrome({ lang, id: 'about', depth })
    + `
<main id="content" class="page-doc">
  <header class="page-head">
    <h1>${esc(t['about.h'])}</h1>
    <span class="rule"></span>
  </header>

  <div class="about">
    <div class="about-portrait">${portrait ? `
      <img src="${assetPrefix(lang, 0)}assets/img/w480/${esc(portrait.f)}"
           srcset="${assetPrefix(lang, 0)}assets/img/w480/${esc(portrait.f)} 480w, ${assetPrefix(lang, 0)}assets/img/w960/${esc(portrait.f)} 960w"
           sizes="(max-width: 820px) 100vw, 33vw"
           alt="${attr(t['site.name'])}" loading="lazy" decoding="async" draggable="false" />` : ''}
    </div>
    <div class="about-body">
      <p class="about-lead">${esc(t['about.lead'])}</p>

      <div class="about-block">
        <h2>${esc(t['about.h.med'])}</h2>
        <p>${esc(t['about.p.med'])}</p>
      </div>
      <div class="about-block">
        <h2>${esc(t['about.h.photo'])}</h2>
        <p>${esc(t['about.p.photo'])}</p>
      </div>
      <div class="about-block">
        <h2>${esc(t['about.h.bridge'])}</h2>
        <p>${esc(t['about.p.bridge'])}</p>
      </div>
${SITE.behance ? `
      <a class="link-out" href="${SITE.behance}" target="_blank" rel="noopener noreferrer">
        ${esc(t['about.behance'])} <span aria-hidden="true">↗</span>
      </a>` : ''}
    </div>
  </div>
</main>
` + foot({ lang, depth });
}

function pageContact(lang) {
  const t = I18N[lang], depth = 0;
  const graph = [personNode(), siteNode(lang),
    crumbs(lang, [
      { name: t['nav.home'],   url: absUrl(lang, 'home') },
      { name: t['contact.h'],  url: absUrl(lang, 'contact') }
    ]),
    { '@type': 'ContactPage', url: absUrl(lang, 'contact'), name: t['contact.title'],
      description: t['contact.desc'], inLanguage: lang }];

  return head({ lang, id: 'contact', title: t['contact.title'], desc: t['contact.desc'], depth,
                jsonld: { '@context': 'https://schema.org', '@graph': graph } })
    + chrome({ lang, id: 'contact', depth })
    + `
<main id="content" class="page-doc">
  <header class="page-head">
    <h1>${esc(t['contact.h'])}</h1>
    <span class="rule"></span>
    <div class="page-lede"><p>${esc(t['contact.lede'])}</p></div>
  </header>

  <form id="enquiryForm" novalidate>
    <div class="field-row">
      <label><span>${esc(t['form.name'])}</span><input type="text" name="name" autocomplete="name" required /></label>
      <label><span>${esc(t['form.email'])}</span><input type="email" name="email" autocomplete="email" required /></label>
    </div>
    <label><span>${esc(t['form.country'])}</span><input type="text" name="country" autocomplete="country-name" /></label>
    <label><span>${esc(t['form.work'])}</span>
      <select name="work">
        <option value="">${esc(t['form.any'])}</option>
${CATALOG.map((a) => `        <option value="${esc(a[lang])}">${esc(a[lang])}</option>`).join('\n')}
      </select></label>
    <label><span>${esc(t['form.message'])}</span><textarea name="message" rows="4"></textarea></label>
    <div class="hp" aria-hidden="true">
      <label>${esc(t['form.hp'])}<input type="text" name="company" tabindex="-1" autocomplete="off" /></label>
    </div>
    <div class="sel-actions">
      <button type="submit" class="btn">${esc(t['form.submit'])}</button>
      <button type="button" class="btn btn-ghost" id="formCopy">${esc(t['sel.copy'])}</button>
    </div>
    <p class="form-status" id="formStatus" role="status" aria-live="polite"></p>
    <noscript><p class="sel-privacy">${esc(t['form.noscript'])}</p></noscript>
  </form>
</main>
` + foot({ lang, depth });
}

/* ------------------------------------------------------------- catalog.js */

function catalogJson() {
  return json({
    generated: TODAY,
    albums: CATALOG.map((a) => ({
      slug: a.slug, en: a.en, es: a.es,
      place_en: a.place_en, place_es: a.place_es,
      photos: a.photos.map((p) => ({ f: p.f, n: p.n }))
    }))
  }) + '\n';
}

function catalogJs() {
  const data = {
    generated: TODAY,
    /* The fallback address, so main.js can build a mailto: when /api/enquiry
       is absent or unconfigured. Split into its two halves rather than shipped
       as one string: a scraper that regexes the static files for an @ finds
       nothing. That is a speed bump against the laziest harvesters, not
       protection — anything that runs JavaScript reassembles it as easily as
       the page does. The real answer is to configure ENQUIRY_TO on the server
       and blank this field, at which point the address never leaves it. */
    email: SITE.email
      ? { u: SITE.email.split('@')[0], d: SITE.email.split('@').slice(1).join('@') }
      : null,
    albums: CATALOG.map((a) => ({
      slug: a.slug, theme: a.theme, en: a.en, es: a.es,
      place_en: a.place_en, place_es: a.place_es,
      photos: a.photos.map((p) => ({ f: p.f, n: p.n, ...(p.w ? { w: p.w, h: p.h } : {}) }))
    }))
  };
  return `/* GENERATED by tools/build.mjs on ${TODAY} — do not edit by hand.
   Source of truth: tools/albums.json + the files in assets/img/.
   Regenerate with: node tools/build.mjs */
window.__CATALOG__ = ${json(data)};
`;
}

/* ------------------------------------------------- the drop folders

   One folder per series under assets/img/_incoming/, named exactly as it is
   in Drive, each with a README saying what belongs in it and what will come
   out. Generated from albums.json rather than made by hand, so adding a series
   to the registry creates its drop folder on the next build and the two can
   never drift apart.

   Pre-making them matters because the folder NAME is the key: it is what
   matches an upload to a series. A folder dropped in with a slightly different
   name is left untouched and reported, which is safe but means nothing
   happens. Uploading into a folder that is already there and already correct
   removes that failure entirely. */
function dropFolders() {
  const made = [];
  for (const a of CATALOG) {
    const dir = `assets/img/_incoming/${a.drive}`;
    const out = a.expected
      ? `\`${a.slug}-gbq-1.jpg\` … \`${a.slug}-gbq-${a.expected}.jpg\``
      : `\`${a.slug}-gbq-1.jpg\`, \`${a.slug}-gbq-2.jpg\`, …`;
    made.push(write(`${dir}/README.md`, `# ${a.en}

**Soltá acá las fotos de esta serie, y solo de esta serie.**

|  |  |
|---|---|
| Serie | ${a.en} · ${a.es} |
| Carpeta en Drive | [${a.drive}](https://drive.google.com/drive/folders/${a.driveId}) |
| Fotos que había en Drive | ${a.expected} |
| Van a quedar como | ${out} |

Los nombres que traen los archivos de Drive no importan: el proceso los
renombra. Los duplicados del export (\`_rw_1200\` y \`_rw_1920\` de la misma
foto) se descartan solos, y se queda con la versión más grande.

No cambies el nombre de esta carpeta — es lo que la vincula con la serie
\`${a.slug}\` en \`tools/albums.json\`.

Este archivo se regenera desde \`tools/albums.json\`; editarlo a mano no sirve.
`));
  }
  return made;
}

/* --------------------------------------------------------------- sitemap */

function sitemap() {
  const urls = [];
  for (const lang of LANGS) {
    for (const p of PAGES) urls.push({ lang, id: p.id, prio: p.id === 'home' ? '1.0' : '0.8' });
    for (const a of CATALOG) urls.push({ lang, id: 'album', slug: a.slug, prio: '0.7' });
  }
  const body = urls.map(({ lang, id, slug, prio }) => `  <url>
    <loc>${absUrl(lang, id, slug)}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${absUrl('en', id, slug)}" />
    <xhtml:link rel="alternate" hreflang="es" href="${absUrl('es', id, slug)}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${absUrl('en', id, slug)}" />
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${prio}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- GENERATED by tools/build.mjs — do not edit by hand. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${body}
</urlset>
`;
}

function robots() {
  if (!INDEXABLE) {
    return `# ${SITE.origin}${SITE.base}/
#
# Closed to crawlers on purpose: the photographs are not published yet, and a
# photography portfolio indexed with no photographs in it is worse than not
# being indexed at all. This opens itself as soon as the first photograph is
# committed — see "indexable" in tools/site.json.
User-agent: *
Disallow: /
`;
  }
  return `# ${SITE.origin}${SITE.base}/
User-agent: *
Allow: /

# The photographs are sold as signed limited edition prints. They are indexed
# for image search on purpose — that is how buyers find them — but only
# preview-resolution files are published here. The originals never leave.
Disallow: /assets/img/_incoming/

# The enquiry endpoint. Nothing to index, and no reason for a crawler to POST.
Disallow: /api/

Sitemap: ${SITE.origin}${SITE.base}/sitemap.xml
`;
}

/* ------------------------------------------------------------------ write */

function write(rel, contents) {
  const abs = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, contents);
  return rel;
}

const written = [];
for (const lang of LANGS) {
  const dir = I18N[lang].dir;                     // '' for en, 'es/' for es
  written.push(write(`${dir}index.html`,     pageHome(lang)));
  written.push(write(`${dir}work.html`,      pageWork(lang)));
  written.push(write(`${dir}prints.html`,    pagePrints(lang)));
  written.push(write(`${dir}selection.html`, pageSelection(lang)));
  written.push(write(`${dir}about.html`,     pageAbout(lang)));
  written.push(write(`${dir}contact.html`,   pageContact(lang)));

  CATALOG.forEach((a, i) => {
    const prev = CATALOG[(i - 1 + CATALOG.length) % CATALOG.length];
    const next = CATALOG[(i + 1) % CATALOG.length];
    written.push(write(`${dir}albums/${a.slug}.html`, pageAlbum(lang, a, prev, next)));
  });
}
written.push(write('assets/js/catalog.js', catalogJs()));
written.push(write('api/_catalog.json', catalogJson()));
written.push(...dropFolders());
if (INDEXABLE) written.push(write('sitemap.xml', sitemap()));
else if (fs.existsSync(path.join(ROOT, 'sitemap.xml'))) {
  fs.rmSync(path.join(ROOT, 'sitemap.xml'));
  console.log('  removed sitemap.xml — nothing to offer a crawler yet');
}
written.push(write('robots.txt', robots()));

console.log(`built ${written.length} files`);
console.log(`  ${CATALOG.length} drop folders under assets/img/_incoming/`);
console.log(`  ${CATALOG.length} series, ${TOTAL_PHOTOS} photographs, ${LANGS.length} languages`);
console.log(`  ${READY}/${CATALOG.length} series have real image files on disk`);
if (READY < CATALOG.length) {
  console.log('  (the rest render named placeholders — see README, "Cargar las fotos")');
}
if (!INDEXABLE) {
  console.log('\n  ! SEARCH ENGINES ARE BLOCKED: every page carries noindex and robots.txt is closed.');
  console.log('    Reason: ' + (SITE.indexable === false
    ? 'tools/site.json sets "indexable": false.'
    : 'no photographs are on disk yet. This lifts itself when they are added.'));
}
if (!SITE.email) {
  console.log('\n  ! tools/site.json has no "email": enquiry pages fall back to copy-to-clipboard.');
}
