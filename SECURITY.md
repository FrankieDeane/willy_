# Security

A static site: no server, no database, no user accounts, no secrets in the
repository. The attack surface is small by construction, and the measures below
keep it that way.

## What is in place

**Content-Security-Policy** (`<meta http-equiv>` in `index.html`). Starts at
`default-src 'none'` and allows back only what the site uses. Every source is
`'self'` — no external origin is permitted at all, so injected markup cannot
pull in a script, style, font or frame from anywhere else.

**No inline script.** The pre-paint theme/language script lives in
`assets/js/boot.js` rather than inline, so the CSP can forbid inline script
outright without needing `'unsafe-inline'`, a nonce or a hash to be maintained.

**Self-hosted fonts.** Jost is served from `assets/fonts/`, not a font CDN. No
visitor's IP address is disclosed to a third party on page load, and there is
no third-party origin to trust in the CSP.

**`form-action 'none'`.** The enquiry form is handled entirely in the browser
and never posts. If markup were ever injected to add a form, it could not
submit anywhere.

**External links** carry `rel="noopener noreferrer"`, so a linked page cannot
reach back through `window.opener` or read the full referrer.

**No `innerHTML` with variable data.** Everything user-visible is written with
`textContent` or built via `createElement`, so gallery titles and form input
cannot become markup.

**Least-privilege CI.** The deploy workflow grants `contents: read` and only
the Pages permissions it needs. It has no access to secrets.

## What a static host cannot do

GitHub Pages does not let a site set response headers, so these are **not**
active and cannot be fixed from within this repository:

| Control | Why it needs a header |
|---|---|
| `Strict-Transport-Security` | HSTS is ignored in a meta tag |
| `X-Content-Type-Options: nosniff` | header only |
| `frame-ancestors` / `X-Frame-Options` | `frame-ancestors` is ignored in a meta tag, so the page can still be framed |
| `Permissions-Policy` | header only |

GitHub Pages does serve the site over HTTPS and will redirect to it when
*Enforce HTTPS* is enabled in repository settings.

To close the remaining gaps, put the site behind a host or CDN that can set
headers — Cloudflare, Netlify and Vercel can all do this with a small config
file, and the CSP above can move to a real header at the same time.

## Reporting a problem

Open an issue on the repository. There is no user data to breach here, so
anything found is a code or configuration matter rather than an incident.
