# Security

This is a static photography site that sells prints. It is worth writing down
what that means, because the usual answer to "how do we keep the tokens safe"
is a list of controls — and here the answer is that **there are no tokens.**

## The design decision everything else follows from

The pages are plain HTML, CSS and one JavaScript file. They have:

- no database, no account, no session, no payment step
- no API key or access token **in anything the browser downloads**
- no third-party script, font, stylesheet, image, embed, analytics or cookie
- no request to any external origin — `connect-src` is `'self'`, so the only
  thing the page may talk to is this site's own enquiry endpoint

There is exactly **one** secret in the whole project: the key that sends the
enquiry email. It lives in a Vercel environment variable, is read only by
`api/enquiry.js` on the server, and never appears in a page, a response body,
a log line, or this repository. A visitor can read every byte the site serves
them and find nothing worth having.

That is the honest version of "keep the tokens safe": not that no credential
exists, but that the one that does never crosses into the browser, and that
the scanners and the ignore rules make it hard to commit by accident.

### If no key is configured

The endpoint answers `503` and the page falls back — first to `mailto:`, then
to the clipboard. The form keeps working, nothing the visitor typed is lost,
and the same build runs unchanged on GitHub Pages, which cannot execute a
function at all. That fallback is a tested path, not a theory.

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

## Real risk 2 — the enquiry endpoint

`api/enquiry.js` is the only code here that runs on a server and the only thing
that accepts input from strangers, so it treats everything it receives as
hostile:

- **Hard caps** on every field and on the whole body, checked before any work
  is done. This is what stops a payload attack.
- **The selection is re-validated against the generated catalogue.** A
  photograph that is not in the catalogue is dropped, and the email is written
  from the catalogue's own text rather than the client's — so the structured
  part of the form cannot be used to smuggle arbitrary content into what
  arrives looking like a verified list.
- **Newlines are stripped** from anything that reaches a subject line or an
  address. A newline in a name is how one header becomes two.
- **A honeypot field and a submission-time floor**, which catch naive bots at
  no cost to a real visitor. A bot that trips either gets a `200` and silence,
  because telling it why would help it try again.
- **A per-instance rate limit.** Best effort by nature — serverless instances
  come and go — so it is a speed bump, not a control.
- **Errors never echo the cause.** A failed provider call can quote the key
  back in its response; the handler returns a generic code and logs only a
  status number.

There is no CAPTCHA, deliberately. Adding one means a third-party script on a
site whose entire posture is that it loads nothing from anywhere.

## Real risk 3 — the CI supply chain

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

## Real risk 4 — the photographs themselves

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
selection, theme and language. It leaves their device only when they press
send, and then only as part of the enquiry they chose to send. Everything read
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
