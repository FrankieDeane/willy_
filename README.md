# Guillermo Bernaldo de Quirós — photography

A gallery-first site for selling limited edition prints. Static HTML/CSS/JS, no
build step, no dependencies — open `index.html` and it runs.

Portfolio reference: <https://www.behance.net/guillerbernald>

## Preview it

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Structure

```
index.html            one section per page, plus fixed chrome and the lightbox
assets/css/style.css  design tokens + all styling
assets/js/main.js     catalogue, router, menu, galleries, lightbox, i18n, theme
assets/img/           placeholder plates (see below)
```

Pages are sections switched by a hash router (`#/home`, `#/prints`, `#/arch`,
`#/street`, `#/land`, `#/about`, `#/contact`) — every page is linkable and the
browser back button works. Each document page also carries its own **BACK**
button, which reopens the menu rather than navigating — from inside a section,
"back" means back to the list of sections, so the next choice is one click away
instead of a return trip through home.

**Home** is a horizontal carousel over the *whole* catalogue, shuffled freshly
on every visit, crossfading as each frame passes. It advances on its own every
7.5s and by arrow keys or swipe, pauses behind the menu and in hidden tabs, and
does not autoplay under `prefers-reduced-motion`. Frames cross-dissolve over
1.8s with only a hint of drift, so one image fades out as the next fades in
rather than sliding past. Only the current frame and
its two neighbours are ever fetched, so 24 slides cost about three images.

### Adding or changing work

Galleries are built from the `WORKS` array at the top of `main.js` — one record
per photograph, carrying both languages, the year, the edition size and which
galleries it belongs to. Add a row and it appears in the grid, the lightbox and
the contact form's dropdown. No markup to touch.

## Design

Monochrome by design: the photographs carry all the colour, so the interface is
black, white and grey throughout. The one accent is reserved for focus rings and
form errors — never decoration.

- **Jost** throughout, wide letterspacing on titles and the wordmark
- Light `#ffffff` / dark `#0d0d0c`
- No text hero — a photograph fills the first screen

## Features

**Language (EN / ES).** Interface strings live in `STRINGS` in `main.js`; photo
titles and places live alongside each record in `WORKS`. Switching language
re-renders the galleries, so captions, the lightbox and the contact dropdown all
follow. Choice persists in `localStorage` and sets `<html lang>`.

**Theme (light / dark).** Tokens are defined three times so all three viewer
states resolve: bare `:root` for light, `@media (prefers-color-scheme: dark)`
guarded by `:not([data-theme="light"])` for system-dark, and `[data-theme="dark"]`
for an explicit choice. Applied before paint, so there's no flash.

**Lightbox.** Click, or focus and press Enter. Arrow keys navigate *within the
gallery you opened it from*, Escape closes, focus returns to the photo you
opened. "Enquire" carries the work through to the contact form.

**Menu.** The hamburger opens a full-screen overlay. The wordmark and social
labels sit above it so the identity is never hidden. Escape closes it, as does
choosing any link — including the page you are already on.

**Controls live in the menu.** EN/ES and the light/dark toggle sit under the
menu list, on desktop and mobile alike. They were briefly in the fixed chrome so
they would be reachable without opening anything, but over a full-bleed
photograph they cluttered the one screen that should be only the work. The only
thing over the image is the menu button.

On narrow screens the wordmark is capped at the viewport minus the gutters and
the menu button, so his name can never collide with it — verified from 320px up.

## Image protection — read this

The photographs are for sale, so the gallery must not double as a download.
What's implemented:

- **Preview-resolution files only** (~1400px long edge, JPEG q72)
- A repeating **GBQ watermark** over the enlarged view
- A transparent shield above the lightbox photo, so drag-to-desktop and
  long-press-save grab the overlay rather than the file
- Right-click suppressed on photos (and only on photos — text still works)
- `draggable="false"` and non-selectable images

**These are deterrents, not DRM.** Anyone can screenshot the page or read the
file out of the network tab. The protection that actually matters is the first
one: the files served are too small to print, so what a copier gets is worthless
at print size. Keep it that way — never upload full-resolution masters.

## The photographs

`assets/img/` holds 24 of Guillermo's own photographs, all 3:2 landscape at
1440px on the long edge — already preview resolution, so nothing needs
downsizing. Filenames are the originals as uploaded.

Four of them open the site full-bleed; the rest are split across the galleries
by the `gal` field in `WORKS`.

### Still to come from Guillermo

- **Titles** are descriptive placeholders written from looking at each frame.
  They are in `WORKS` in `main.js`, in both languages.
- **Places, years and edition sizes** are deliberately absent rather than
  invented. Add `place_en` / `place_es`, `year` and `ed` to any record and they
  appear automatically; leave them off and the UI omits them cleanly.
- **A portrait of Guillermo** for the About page. There is no portrait-format
  image in the set, so the About column currently uses one of his street
  photographs. Drop in a vertical portrait and point `.about-portrait img` at it.
- **The Instagram URL** in the footer rail is a placeholder.

## Not implemented

The enquiry form is front-end only — it validates, then shows a confirmation.
**Nothing is sent anywhere.** Point it at a real endpoint before launch. There is
also no cart or checkout: the sale path is an enquiry, by design. Prices,
editions, titles and the About copy are placeholders for Guillermo to replace.


## Security

See **[SECURITY.md](SECURITY.md)**. In short: a strict CSP that allows no
external origin at all, no inline script, self-hosted fonts so no visitor IP
reaches a third party, `form-action 'none'`, and no `innerHTML` with variable
data. The controls a static host cannot set — HSTS, `nosniff`, `frame-ancestors`
— are listed there with the fix (put it behind a CDN that can send headers).

## SEO

Implemented: a descriptive title and meta description, canonical URL, Open
Graph and Twitter cards with a real image, `max-image-preview:large` (this site
will be found through image search more than text), JSON-LD for Person, WebSite
and ImageGallery, `robots.txt`, and a `sitemap.xml` whose image entries are
generated from the same `WORKS` catalogue the site renders from, so the two
cannot drift. Title and description update per route.

**The one open question.** Routing is hash-based, so search engines treat the
whole site as a single URL — the galleries cannot rank separately, and content
in the inactive (`display: none`) sections is discounted. For a portfolio of
this size a single strong page is a reasonable trade. If each gallery should
rank on its own, the fix is real paths (`/architecture/`, `/landscape/`) rather
than fragments, which means either a small build step or one HTML file per
section.
