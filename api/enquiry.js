/* ============================================================================
   POST /api/enquiry — receives a print enquiry and delivers it.

   This is the only server-side code in the project, and it exists so that the
   one credential this site needs never reaches a browser. The delivery key
   lives in a Vercel environment variable, is read here, and is never sent to
   the client, never written to a log, and never appears in a response.

   Configure exactly one delivery route (Project ▸ Settings ▸ Environment
   Variables). If none is set the endpoint answers 503 and the page falls back
   to composing the enquiry in the visitor's own mail client, so the form keeps
   working either way.

     ENQUIRY_TO         the address that receives enquiries          (required)

     RESEND_API_KEY     an API key from resend.com                   (route 1)
     ENQUIRY_FROM       verified sender, e.g. "Site <hi@example.com>"
                        defaults to Resend's onboarding sender

     ENQUIRY_WEBHOOK    any URL that accepts a JSON POST             (route 2)
                        — a Google Apps Script bound to the responses
                        spreadsheet, Zapier, Make, whatever. No third-party
                        account is implied; the URL is the whole config.

   Anti-abuse, in order of how much each one actually buys:

     * A hard cap on every field and on the whole body, checked before any
       work is done. This is what stops a payload attack.
     * Server-side validation of the selection against the generated
       catalogue. A photograph that is not in the catalogue is dropped, so the
       email body cannot be used to smuggle arbitrary text through the part of
       the form that looks structured.
     * A honeypot field and a submission-time floor. These catch naive bots,
       which is most of them, and cost a legitimate visitor nothing.
     * A per-instance rate limit. Best effort by nature: serverless instances
       come and go, so treat it as a speed bump, not a control.

   No CAPTCHA. Adding one would mean a third-party script on a site whose
   entire security posture is that it loads nothing from anywhere.
   ========================================================================== */

/* Generated alongside assets/js/catalog.js by tools/build.mjs. Files under
   api/ whose name starts with an underscore are not routed, so this ships with
   the function without being served. */
const catalog = require('./_catalog.json');

const LIMITS = {
  body: 16 * 1024,
  name: 120,
  email: 254,
  country: 80,
  message: 4000,
  spec: 200,
  selection: 40
};

/* Best-effort, per-instance. A cold start resets it; that is understood. */
const seen = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip) {
  const now = Date.now();
  for (const [k, v] of seen) if (now - v.first > WINDOW_MS) seen.delete(k);
  const hit = seen.get(ip);
  if (!hit) { seen.set(ip, { first: now, n: 1 }); return false; }
  hit.n += 1;
  return hit.n > MAX_PER_WINDOW;
}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= LIMITS.email;

/* Header injection: a newline in a value that ends up in a subject line or an
   address turns one header into two. Everything interpolated into either is
   flattened first. */
const oneLine = (v) => v.replace(/[\r\n]+/g, ' ').trim();

/* Resolve each submitted photograph against the catalogue and return the
   catalogue's own text, never the client's. */
function resolveSelection(items) {
  if (!Array.isArray(items)) return [];
  const out = [];
  for (const item of items.slice(0, LIMITS.selection)) {
    if (!item || typeof item.a !== 'string' || typeof item.f !== 'string') continue;
    const album = catalog.albums.find((a) => a.slug === item.a);
    if (!album) continue;
    const photo = album.photos.find((p) => p.f === item.f);
    if (!photo) continue;
    out.push({ album: album.en, place: album.place_en || '', n: photo.n, file: photo.f });
  }
  return out;
}

function plainText(d) {
  const lines = [];
  if (d.selection.length) {
    lines.push(`Selection (${d.selection.length}):`);
    d.selection.forEach((s, i) => {
      lines.push(`  ${i + 1}. ${s.album} No. ${s.n}${s.place ? ` — ${s.place}` : ''}  [${s.file}]`);
    });
    lines.push('');
  }
  if (d.work) { lines.push(`Series: ${d.work}`); lines.push(''); }
  if (d.spec) { lines.push(`Printed as: ${d.spec}`); lines.push(''); }
  if (d.message) { lines.push(d.message); lines.push(''); }
  lines.push(`From: ${d.name} <${d.email}>`);
  if (d.country) lines.push(`Country: ${d.country}`);
  lines.push(`Language: ${d.lang}`);
  return lines.join('\n');
}

async function deliver(subject, text, replyTo) {
  const to = process.env.ENQUIRY_TO;
  if (!to) return { ok: false, code: 503, why: 'no ENQUIRY_TO configured' };

  if (process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.ENQUIRY_FROM || 'Enquiries <onboarding@resend.dev>',
        to: [to],
        reply_to: replyTo,
        subject,
        text
      })
    });
    if (!res.ok) {
      // The provider's response can quote the key back; never log the body.
      return { ok: false, code: 502, why: `delivery provider returned ${res.status}` };
    }
    return { ok: true };
  }

  if (process.env.ENQUIRY_WEBHOOK) {
    const res = await fetch(process.env.ENQUIRY_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, text, replyTo })
    });
    if (!res.ok) return { ok: false, code: 502, why: `webhook returned ${res.status}` };
    return { ok: true };
  }

  return { ok: false, code: 503, why: 'no delivery route configured' };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) return res.status(429).json({ ok: false, error: 'too_many' });

  let body = req.body;
  if (typeof body === 'string') {
    if (body.length > LIMITS.body) return res.status(413).json({ ok: false, error: 'too_large' });
    try { body = JSON.parse(body); } catch { return res.status(400).json({ ok: false, error: 'bad_json' }); }
  }
  if (!body || typeof body !== 'object') return res.status(400).json({ ok: false, error: 'bad_body' });

  /* A bot fills every field it finds, including the one no human can see. */
  if (str(body.company, 200)) return res.status(200).json({ ok: true });

  /* Nobody reads a page, chooses prints and types a message in two seconds. */
  const elapsed = Number(body.ts) ? Date.now() - Number(body.ts) : null;
  if (elapsed !== null && elapsed < 2500) return res.status(200).json({ ok: true });

  const d = {
    name: str(body.name, LIMITS.name),
    email: str(body.email, LIMITS.email),
    country: str(body.country, LIMITS.country),
    message: str(body.message, LIMITS.message),
    spec: str(body.spec, LIMITS.spec),
    work: str(body.work, LIMITS.spec),
    lang: body.lang === 'es' ? 'es' : 'en',
    selection: resolveSelection(body.selection)
  };

  if (!d.name || !emailOk(d.email)) return res.status(400).json({ ok: false, error: 'invalid' });

  const subject = d.selection.length
    ? `Print enquiry — ${d.selection.length} photograph${d.selection.length === 1 ? '' : 's'} — ${oneLine(d.name)}`
    : `Print enquiry — ${oneLine(d.name)}`;

  let result;
  try {
    result = await deliver(subject, plainText(d), oneLine(d.email));
  } catch {
    // Never surface the thrown error: it can contain the request that carried
    // the key. The client only needs to know to fall back.
    return res.status(502).json({ ok: false, error: 'delivery_failed' });
  }

  if (!result.ok) {
    console.error(`enquiry not delivered: ${result.why}`);
    return res.status(result.code).json({ ok: false, error: result.code === 503 ? 'not_configured' : 'delivery_failed' });
  }
  return res.status(200).json({ ok: true });
};
