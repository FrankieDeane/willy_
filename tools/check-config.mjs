#!/usr/bin/env node
/* ============================================================================
   check-config.mjs — keeps the three copies of the security policy in step,
   and refuses unknown keys in vercel.json.

   Two things this catches, both of which have already happened once:

   1. A stray key in vercel.json. JSON has no comments, and Vercel validates
      against a closed schema — a `"//"` note next to a setting fails the whole
      deployment with "should NOT have additional property". The allowlist
      below is what this project deliberately uses, so anything new has to be
      added here on purpose rather than discovered by a red deploy.

   2. Policy drift. The Content-Security-Policy exists in three places, because
      each host enforces it differently: vercel.json, _headers for
      Netlify/Cloudflare, and a <meta> tag in every generated page for GitHub
      Pages, which cannot send headers at all. Editing one and forgetting the
      others leaves the site protected on one host and open on another, and
      nothing would say so.

   Usage:  node tools/check-config.mjs
   Exit:   0 consistent · 1 something is out of step
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const problems = [];

/* -------------------------------------------------------- vercel.json keys */

const ALLOWED_VERCEL_KEYS = new Set([
  '$schema', 'cleanUrls', 'trailingSlash', 'headers', 'redirects', 'rewrites'
]);

const vercel = JSON.parse(read('vercel.json'));
for (const key of Object.keys(vercel)) {
  if (!ALLOWED_VERCEL_KEYS.has(key)) {
    problems.push(`vercel.json: unknown top-level key ${JSON.stringify(key)}. ` +
      'Vercel rejects the whole deployment for an unrecognised property. ' +
      'If it is a real setting, add it to ALLOWED_VERCEL_KEYS here too.');
  }
}

/* ------------------------------------------------------------- CSP parity */

function directives(csp) {
  const map = new Map();
  for (const part of csp.split(';')) {
    const bits = part.trim().split(/\s+/).filter(Boolean);
    if (bits.length) map.set(bits[0], bits.slice(1).join(' '));
  }
  return map;
}

function findCsp(text, re, label) {
  const m = re.exec(text);
  if (!m) { problems.push(`${label}: no Content-Security-Policy found`); return null; }
  return directives(m[1]);
}

const vercelCsp = (() => {
  for (const group of vercel.headers || []) {
    for (const h of group.headers || []) {
      if (h.key.toLowerCase() === 'content-security-policy') return directives(h.value);
    }
  }
  problems.push('vercel.json: no Content-Security-Policy header');
  return null;
})();

const netlifyCsp = findCsp(read('_headers'), /Content-Security-Policy:\s*(.+)/, '_headers');
const metaCsp = findCsp(read('index.html'),
  /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/, 'index.html <meta>');

/* A <meta> CSP cannot carry frame-ancestors — browsers ignore it there — so
   the header copies legitimately have one directive the pages do not. */
const META_CANNOT_CARRY = new Set(['frame-ancestors']);

if (vercelCsp && netlifyCsp) {
  for (const [name, value] of vercelCsp) {
    if (!netlifyCsp.has(name)) problems.push(`_headers: missing "${name}" that vercel.json sets`);
    else if (netlifyCsp.get(name) !== value) {
      problems.push(`CSP drift on "${name}":\n    vercel.json  ${name} ${value}\n    _headers     ${name} ${netlifyCsp.get(name)}`);
    }
  }
  for (const name of netlifyCsp.keys()) {
    if (!vercelCsp.has(name)) problems.push(`vercel.json: missing "${name}" that _headers sets`);
  }
}

if (vercelCsp && metaCsp) {
  for (const [name, value] of vercelCsp) {
    if (META_CANNOT_CARRY.has(name)) continue;
    if (!metaCsp.has(name)) {
      problems.push(`generated pages: <meta> CSP is missing "${name}". ` +
        'GitHub Pages has only this tag, so the directive is simply absent there. ' +
        'Add it in the head() template in tools/build.mjs.');
    } else if (metaCsp.get(name) !== value) {
      problems.push(`CSP drift on "${name}":\n    vercel.json  ${name} ${value}\n    <meta>       ${name} ${metaCsp.get(name)}`);
    }
  }
}

/* Every generated page must carry the same tag, not just index.html. */
if (metaCsp) {
  const expected = read('index.html').match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)[1];
  const stale = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (!['node_modules', '.git', 'tools', '_site', '.github'].includes(e.name)) walk(p); }
      else if (e.name.endsWith('.html')) {
        const m = /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/.exec(fs.readFileSync(p, 'utf8'));
        if (!m || m[1] !== expected) stale.push(path.relative(ROOT, p));
      }
    }
  };
  walk(ROOT);
  if (stale.length) {
    problems.push(`${stale.length} page(s) carry a different or missing <meta> CSP: ` +
      stale.slice(0, 5).join(', ') + (stale.length > 5 ? ', …' : '') +
      '. Run node tools/build.mjs.');
  }
}

if (!problems.length) {
  console.log('config check: vercel.json keys valid, CSP identical across vercel.json, _headers and all pages');
  process.exit(0);
}
console.error(`config check: ${problems.length} problem(s)\n`);
problems.forEach((p) => console.error('  ' + p + '\n'));
process.exit(1);
