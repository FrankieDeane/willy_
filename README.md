# AURELIA — Premium Photography Studio (preview)

A single-page marketing site concept for a high-end fine art photography studio.
Built as static HTML/CSS/JS with no build step and no dependencies — open
`index.html` in a browser and it runs.

## Preview it

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` directly via `file://` works too.

## Structure

```
index.html            markup for every section
assets/css/style.css  design tokens + all styling
assets/js/main.js     scroll, filtering, counters, carousel, forms
assets/img/           placeholder art plates (see below)
```

## What's in it

| Section | Notes |
| --- | --- |
| Hero | Full-bleed image, gradient scrim, dual CTA, scroll cue |
| Intro | Positioning copy + stat counters that animate into view |
| Portfolio | Masonry gallery with category filtering and hover captions |
| Services | Three pricing tiers, middle one highlighted |
| Studio | Founder story with signature block |
| Press | "As featured in" wordmark row |
| Testimonials | Auto-rotating quotes with clickable dots |
| Journal | Three-post blog teaser grid |
| Contact | Two-column enquiry form + studio details |
| Footer | Nav, newsletter capture, back-to-top |

## Design system

Tokens live at the top of `style.css`:

- **Ink** `#14120f` — near-black, used for dark sections and primary text
- **Cream** `#f7f3ec` — warm off-white page ground
- **Gold** `#c9a24b` — the single accent, used sparingly
- **Type** — Cormorant Garamond (display) over Jost (UI), loaded from Google Fonts
  with a serif/sans fallback so the layout holds if the request fails

## Placeholder imagery

`assets/img/` contains generated abstract plates — warm, grainy, vignetted —
so the repo is self-contained and the site works offline. **Replace them with
real photography before this goes anywhere near production.** Keep the same
filenames and roughly the same aspect ratios and no markup changes are needed:

| File | Aspect | Used by |
| --- | --- | --- |
| `hero.jpg` | 3:2 landscape | Hero background |
| `work-01..09.jpg` | mixed portrait/landscape | Portfolio gallery |
| `studio.jpg` | 9:11 portrait | Studio section |
| `journal-01..03.jpg` | 7:5 landscape | Journal cards |

Ship real photos as WebP/AVIF with `<picture>` sources — the current JPEGs are
sized for a placeholder, not for a production image budget.

## Behaviour notes

- Reveal-on-scroll is gated behind a `.js` class on `<html>`, so with JavaScript
  disabled every section renders visible rather than blank.
- `prefers-reduced-motion` disables reveals, counters' easing and smooth scroll.
- Gallery images below the fold are `loading="lazy"`.

## Not implemented

This is a front-end preview. The enquiry form and newsletter signup are wired to
`preventDefault()` and show a confirmation message — **nothing is sent
anywhere.** Point them at a real endpoint (Formspree, a serverless function, your
CRM) before launch. There is also no lightbox on the gallery, no real journal
pages, and the copy, pricing and testimonials are invented placeholder content.
