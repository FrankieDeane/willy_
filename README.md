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
index.html            markup, with both languages carried in data-* attributes
assets/css/style.css  design tokens + all styling
assets/js/main.js     lightbox, i18n, theme, image protection, enquiry form
assets/img/           placeholder plates (see below)
```

## Design

The palette is grounded in the darkroom: neutral silver grounds and a single
**safelight** accent, reserved for the sale affordance (price, primary action,
focus). The work supplies all the colour, so the interface stays quiet.

- Display **Syne**, UI **Archivo**
- Light `#faf9f7` / dark `#0b0b0c`, accent `#c6371c` (light) and `#ff5233` (dark)
- No text hero — the gallery opens the page

## Features

**Language (EN / ES).** Interface strings live in `STRINGS` in `main.js`. Photo
titles and locations live on each `<figure>` as `data-title-en` / `data-title-es`
/ `data-place-en` / `data-place-es`, so both languages ship in the markup and the
work stays indexable. Choice persists in `localStorage` and sets `<html lang>`.

**Theme (light / dark).** Tokens are defined three times so all three viewer
states resolve: bare `:root` for light, `@media (prefers-color-scheme: dark)`
guarded by `:not([data-theme="light"])` for system-dark, and `[data-theme="dark"]`
for an explicit choice. Applied before paint, so there's no flash.

**Lightbox.** Click, or focus and press Enter. Arrow keys navigate, Escape
closes, focus returns to the photo you opened. "Enquire" carries the work through
to the contact form.

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

## Placeholder imagery

`assets/img/` holds generated monochrome plates standing in for Guillermo's real
photographs, because this environment could not reach Behance. Replace them
keeping the same filenames (`p01.jpg`–`p12.jpg`, `portrait.jpg`) and no markup
changes are needed — then update the titles, places, years, editions and prices
in the `data-*` attributes on each `<figure>` in `index.html`.

Export replacements at preview resolution, per the section above.

## Not implemented

The enquiry form is front-end only — it validates, then shows a confirmation.
**Nothing is sent anywhere.** Point it at a real endpoint before launch. There is
also no cart or checkout: the sale path is an enquiry, by design. Prices,
editions, titles and the About copy are placeholders for Guillermo to replace.
