#!/usr/bin/env node
/* ============================================================================
   scan-secrets.mjs — refuses to let a credential reach the repository.

   This site holds no key by design, which is exactly why a leak here would be
   an accident rather than a decision — a Drive OAuth client dropped in to run
   the photo import, a .env from a local experiment, a deploy token pasted into
   a config while debugging. Those are the realistic ways a static photography
   site ends up leaking, and they are what this catches.

   It runs on plain Node with no dependencies. A scanner is the last place to
   want a third-party package: it reads every file in the repository, so any
   dependency here would too.

   Usage:  node tools/scan-secrets.mjs [path]
   Exit:   0 clean · 1 something found
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));

/* Directories with nothing hand-written in them. node_modules is skipped
   because a dependency's own test fixtures are full of fake keys. */
const SKIP_DIRS = new Set(['.git', 'node_modules', '_site', 'dist', '.cache']);
const SKIP_EXT  = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.ico',
                           '.woff', '.woff2', '.ttf', '.otf', '.eot',
                           '.pdf', '.zip', '.gz', '.mp4', '.mov', '.psd', '.tif', '.tiff']);
const MAX_BYTES = 2 * 1024 * 1024;

/* Files that should never exist here at all, whatever is inside them. */
const FORBIDDEN_NAMES = [
  /^\.env(\..*)?$/i, /^credentials\.json$/i, /^token\.json$/i,
  /^client_secret.*\.json$/i, /^service[-_]account.*\.json$/i,
  /\.(pem|key|p12|pfx|keystore|jks)$/i, /^id_(rsa|dsa|ecdsa|ed25519)$/i,
  /^\.npmrc$/i, /^\.netrc$/i
];

const RULES = [
  ['AWS access key id',            /\bAKIA[0-9A-Z]{16}\b/],
  ['AWS secret access key',        /aws_secret_access_key\s*[=:]\s*['"]?[A-Za-z0-9/+=]{40}\b/i],
  ['GitHub personal access token', /\bgh[pousr]_[A-Za-z0-9]{36,255}\b/],
  ['GitHub fine-grained token',    /\bgithub_pat_[A-Za-z0-9_]{22,255}\b/],
  ['Google API key',               /\bAIza[0-9A-Za-z\-_]{35}\b/],
  ['Google OAuth client secret',   /\bGOCSPX-[A-Za-z0-9\-_]{20,}\b/],
  ['Private key block',            /-----BEGIN (RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY( BLOCK)?-----/],
  ['Slack token',                  /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/],
  ['Stripe live key',              /\b[sr]k_live_[A-Za-z0-9]{20,}\b/],
  ['Netlify token',                /\bnfp_[A-Za-z0-9]{30,}\b/],
  ['Supabase service role key',    /\bservice_role\b[\s\S]{0,80}?\beyJ[A-Za-z0-9_-]{20,}\b/],
  ['JSON Web Token',               /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/],
  ['Generic assigned secret',      /\b(api[_-]?key|secret|passwd|password|token|client[_-]?secret)\b\s*[:=]\s*['"][A-Za-z0-9/+_\-.=]{16,}['"]/i]
];

/* Lines that are documentation about secrets, not secrets. Without this the
   scanner flags SECURITY.md for the crime of naming the things it defends
   against, and everyone learns to ignore its output. */
const ALLOW = [
  /^\s*[/*#-]/,                                    // comment lines
  /\b(example|placeholder|dummy|sample|redacted|your[-_ ]?(api|key|token)|xxx+|<[a-z-]+>)\b/i,
  /\b(process\.env|secrets\.|env\.|\$\{\{)/,        // reading a secret is fine; holding one is not
  /['"]{2}|:\s*""/                                 // empty string assignments
];

const findings = [];

function scanFile(abs) {
  const rel = path.relative(ROOT, abs);
  const name = path.basename(abs);

  for (const re of FORBIDDEN_NAMES) {
    if (re.test(name)) { findings.push({ rel, line: 0, rule: 'Credential file committed', text: name }); return; }
  }
  if (SKIP_EXT.has(path.extname(abs).toLowerCase())) return;
  let st; try { st = fs.statSync(abs); } catch { return; }
  if (st.size > MAX_BYTES) return;

  let text; try { text = fs.readFileSync(abs, 'utf8'); } catch { return; }
  if (text.indexOf('\u0000') !== -1) return;             // binary

  text.split(/\r?\n/).forEach((line, i) => {
    if (line.length > 4000) return;
    if (ALLOW.some((re) => re.test(line))) return;
    for (const [rule, re] of RULES) {
      if (re.test(line)) {
        findings.push({ rel, line: i + 1, rule, text: line.trim().slice(0, 120) });
        break;
      }
    }
  });
}

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name)); }
    else if (e.isFile()) scanFile(path.join(dir, e.name));
  }
}

walk(ROOT);

if (!findings.length) {
  console.log('secret scan: clean');
  process.exit(0);
}
console.error(`secret scan: ${findings.length} finding(s)\n`);
for (const f of findings) {
  console.error(`  ${f.rel}:${f.line}  ${f.rule}`);
  console.error(`    ${f.text}\n`);
}
console.error('If one of these is a false positive, make it obviously so (name it');
console.error('"example", or read it from the environment) rather than widening the rules.');
process.exit(1);
