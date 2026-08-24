#!/usr/bin/env node
/* ============================================================================
   check-links.mjs — every internal link and asset reference must resolve.

   With 77 generated pages cross-linking each other in two languages, a wrong
   relative path is invisible until someone opens that one page. It is also the
   exact bug class that once shipped every Spanish page without its stylesheet,
   because /es/ sits a directory below its English twin. So it is a check now.

   No dependencies, and no HTML parser: a regex over href/src is enough for
   markup this project generates itself.

   Usage:  node tools/check-links.mjs
   Exit:   0 all resolve · 1 something is broken
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['.git', 'node_modules', '_site', 'tools', '.github']);

function htmlFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) htmlFiles(path.join(dir, e.name), out); }
    else if (e.name.endsWith('.html')) out.push(path.join(dir, e.name));
  }
  return out;
}

const REF = /(?:href|src)\s*=\s*"([^"]+)"/gi;
const SRCSET = /srcset\s*=\s*"([^"]+)"/gi;

const pages = htmlFiles(ROOT);
const broken = [];
/* Photographs that have not been added yet are expected to be missing — the
   pages deliberately render a named placeholder for each one. Counting them
   separately keeps the check useful before the images land. */
let pendingPhotos = 0;
let checked = 0;

for (const file of pages) {
  const html = fs.readFileSync(file, 'utf8');
  const dir = path.dirname(file);
  const refs = [];

  for (const m of html.matchAll(REF)) refs.push(m[1]);
  for (const m of html.matchAll(SRCSET)) {
    for (const part of m[1].split(',')) {
      const url = part.trim().split(/\s+/)[0];
      if (url) refs.push(url);
    }
  }

  for (const raw of refs) {
    if (/^(https?:|mailto:|tel:|data:|#|javascript:)/i.test(raw)) continue;
    checked++;
    const target = path.resolve(dir, raw.split('#')[0].split('?')[0]);
    if (fs.existsSync(target)) continue;
    if (/\/assets\/img\/.*\.jpg$/.test(target.replace(/\\/g, '/'))) { pendingPhotos++; continue; }
    broken.push(`${path.relative(ROOT, file)}  →  ${raw}`);
  }
}

console.log(`checked ${checked} references across ${pages.length} pages`);
if (pendingPhotos) console.log(`${pendingPhotos} photograph references are still placeholders (expected until the images are added)`);

if (broken.length) {
  console.error(`\n${broken.length} broken reference(s):\n`);
  broken.slice(0, 40).forEach((b) => console.error('  ' + b));
  if (broken.length > 40) console.error(`  … and ${broken.length - 40} more`);
  process.exit(1);
}
console.log('all non-photograph references resolve');
