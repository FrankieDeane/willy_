# Security

This is a static photography site that sells prints. It is worth writing down
what that means, because the usual answer to "how do we keep the tokens safe"
is a list of controls — and here the answer is that **there are no tokens.**

## The design decision everything else follows from

The site is plain HTML, CSS and one JavaScript file. It has:

- no backend, no database, no serverless function
- no API key, access token, session, or account of any kind
- no third-party script, font, stylesheet, image, embed, analytics or cookie
- no network request of its own — `connect-src` is `'none'`, and nothing in
  `assets/js/main.js` calls `fetch`, `XMLHttpRequest` or a WebSocket

An enquiry is composed **in the visitor's browser** and handed to their own
mail client via `mailto:`, or copied to their clipboard. Nothing is posted
anywhere. There is no payment step, so there is no card data and no processor
credential.

The consequence: there is no secret in the deployed site to steal, and no
server-side surface to attack. The realistic risks are all somewhere else, and
they are covered below.

## Real risk 1 — a credential committed by accident

The likeliest way this project ever leaks something is a Google Drive OAuth
client, a deploy token, or a `.env` dropped in while wiring up the photo
import.

- `.gitignore` refuses `.env*`, `client_secret*.json`, `service-account*.json`,
  `credentials.json`, `token.json`, `*.pem`, `*.key`, `*.p12`, `.npmrc`, `.netrc`.
- `tools/scan-secrets.mjs` scans every text file for AWS, GitHub, Google,
  Slack, Stripe, Netlify and Supabase credential shapes, private key blocks,
  JWTs and generic assigned secrets. It runs on every push and pull request,
  and weekly on a schedule, and **fails the build**.
- The weekly run matters because files added through the GitHub web interface
  bypass `.gitignore` entirely.

Turn on **Settings ▸ Code security ▸ Secret scanning ▸ Push protection** as
well. It is the only control that stops a secret *before* it reaches the
history rather than after.

## Real risk 2 — the CI supply chain

The workflows are where this repository has real privilege, so they are kept
narrow:

- `deploy.yml` and `checks.yml` run with `contents: read`. They cannot push a
  commit or open a pull request even if a step is compromised.
- `photos.yml` is the only job with `contents: write`, it runs **only** on the
  `photos` branch, and it pushes only to that branch. An accidental upload
  cannot rewrite the live site.
- `persist-credentials: false` on every checkout that does not push, so no git
  credential is left in the runner's working copy.
- `npm ci` against a committed `tools/package-lock.json`: every transitive
  dependency is pinned to an exact version and integrity hash, and the install
  fails rather than silently resolving something newer.
- One dependency in the whole project (`sharp`), needed only by the image step.
  `build.mjs`, `check-links.mjs` and `scan-secrets.mjs` run on plain Node.
- Dependabot watches both the actions and the npm tree weekly.

Actions are referenced by major tag rather than by commit digest. Pinning to a
digest is stronger and worth doing — it is the one control here that is
deliberately left as a follow-up, because a digest has to be verified against
the upstream repository at the moment it is written down.

## Real risk 3 — the photographs themselves

- Only preview-resolution files are published: 1600px on the long edge, which
  is not printable at 65×100cm, let alone 150×240cm. The originals never enter
  the repository, and `assets/img/_incoming/` is git-ignored so they cannot
  enter its history either.
- `tools/prepare-photos.mjs` **strips all metadata** — EXIF, IPTC, XMP and ICC.
  This is not housekeeping: camera and phone exports routinely carry GPS
  coordinates, and a landscape photographer's GPS trail is a map of where they
  live and work.
- Every file is decoded and re-encoded, so nothing appended after the image
  data survives the trip out of Drive.
- Right-click and drag are blocked on images, and the lightbox carries a
  watermark overlay. These are deterrents against casual copying, not DRM — a
  visitor can always take a screenshot. The resolution is the real control.

## Browser-side controls

Content-Security-Policy is deny-by-default: `default-src 'none'`, then only
`'self'` for scripts, styles, fonts and images. **No external origin is allowed
at all**, so injected markup has nowhere to call out to and no third party can
be pulled in.

`require-trusted-types-for 'script'` is on. The browser refuses any
string-to-markup assignment, which is enforceable only because no code path in
`assets/js/main.js` uses `innerHTML` — every node is built with
`createElement` and every string goes in through `textContent`. A tampered
`localStorage` value or a hostile album title cannot become an element.

Also set: `frame-ancestors 'none'` and `X-Frame-Options: DENY` (no clickjacking),
`form-action 'none'` (nothing can be submitted anywhere), `base-uri 'none'`,
`nosniff`, HSTS with preload, a `Permissions-Policy` that denies camera,
microphone, geolocation, payment, USB and the rest, and the three
cross-origin isolation headers.

The one browser storage in use is `localStorage`, holding the visitor's print
selection, theme and language. It never leaves their device. Everything read
back out of it is re-validated against the generated catalogue, so a value
edited by hand is discarded rather than rendered.

### Where each control is enforced

| | GitHub Pages | Vercel | Netlify / Cloudflare |
|---|---|---|---|
| CSP, referrer policy | `<meta>` in every page | `vercel.json` + `<meta>` | `_headers` + `<meta>` |
| HSTS, `nosniff`, frame, COOP/CORP/COEP, Permissions-Policy | **not possible** | `vercel.json` | `_headers` |

GitHub Pages cannot send response headers. Everything expressible as a `<meta>`
tag is in the pages, but HSTS, `nosniff`, `X-Frame-Options`, `Permissions-Policy`
and the cross-origin headers cannot be delivered there at all. If those matter,
serve the site from Vercel, Netlify or Cloudflare Pages — the configuration for
each is already committed and they carry the identical policy.

## What is deliberately not here

No cookie banner, because there are no cookies. No analytics, no pixel, no tag
manager, no consent framework — nothing to configure, nothing to leak, nothing
to keep lawful under GDPR or CCPA. That is a considered choice for a site whose
audience is in the United States and the European Union.

## Reporting

Open a private security advisory on this repository (**Security ▸ Advisories ▸
Report a vulnerability**), or write to the address on the contact page.

Please do not open a public issue for anything exploitable.
