#!/usr/bin/env node
/* ============================================================================
   prepare-photos.mjs — turns a Drive dump into the site's image set.

   INPUT   assets/img/_incoming/<Drive folder name>/*.jpg
           One subfolder per series, named exactly as it is in Drive
           (La Vicuña Agency ▸ Willy ▸ Porfolio ▸ <name>).

   OUTPUT  assets/img/<slug>-gbq-<n>.jpg        long edge 1600  · the "full" file
           assets/img/w960/<slug>-gbq-<n>.jpg   long edge  960  · grid + carousel
           assets/img/w480/<slug>-gbq-<n>.jpg   long edge  480  · phones + covers
           assets/img/dimensions.json           real w/h, so pages reserve space

   What it does on the way through:

   * Renames to <slug>-gbq-<n>.jpg. The slug comes from tools/albums.json, so
     the naming is a decision recorded in a file, not a guess made at runtime.
   * De-duplicates. The Drive export ships the same frame twice — once as
     …_rw_1200.jpg and once as …_rw_1920.jpg — and sometimes a third time as
     "… (1).jpg". Files are grouped by the UUID the export puts in front, and
     the largest version of each group wins.
   * Strips ALL metadata. This is the security-relevant step: camera exports
     routinely carry GPS coordinates, and a landscape photographer's GPS trail
     is a map of where they live and work. sharp drops EXIF, IPTC, XMP and ICC
     unless told otherwise, and it is told nothing here on purpose.
   * Re-encodes every file. A JPEG decoded and re-encoded by sharp cannot carry
     a payload appended after the image data, so nothing hostile survives the
     trip out of Drive.

   Usage
     node tools/prepare-photos.mjs            process, leave _incoming alone
     node tools/prepare-photos.mjs --consume  process, then delete _incoming
     node tools/prepare-photos.mjs --force    re-encode files that already exist

   Then always:  node tools/build.mjs
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IN   = path.join(ROOT, 'assets/img/_incoming');
const OUT  = path.join(ROOT, 'assets/img');
const ALBUMS = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/albums.json'), 'utf8')).albums;

const CONSUME = process.argv.includes('--consume');
const FORCE   = process.argv.includes('--force');

const SIZES = [
  { dir: '',     edge: 1600, q: 82 },
  { dir: 'w960', edge: 960,  q: 80 },
  { dir: 'w480', edge: 480,  q: 78 }
];

/* Folder names arrive with whatever spacing and case Drive had. Compare on a
   normalised form so "In Tuscany", "in tuscany" and "In  Tuscany" all match. */
const norm = (s) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
                     .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const byFolder = new Map();
for (const a of ALBUMS) byFolder.set(norm(a.drive), a);

/* The export's filename is "<uuid>_rw_<width>.jpg", sometimes with " (1)"
   appended by a second download. Everything before "_rw_" identifies the
   photograph; the rest identifies the copy. */
function groupKey(file) {
  const base = path.basename(file, path.extname(file));
  return base.replace(/\s*\(\d+\)\s*$/, '').replace(/_rw_\d+$/, '').trim().toLowerCase();
}

if (!fs.existsSync(IN)) {
  console.log(`nothing to do — ${path.relative(ROOT, IN)}/ does not exist`);
  console.log('create it, drop one folder per series inside, and run this again');
  process.exit(0);
}

const dimsPath = path.join(OUT, 'dimensions.json');
let dims = {};
try { dims = JSON.parse(fs.readFileSync(dimsPath, 'utf8')); } catch { /* first run */ }

for (const d of SIZES) if (d.dir) fs.mkdirSync(path.join(OUT, d.dir), { recursive: true });

const folders = fs.readdirSync(IN, { withFileTypes: true })
  .filter((e) => e.isDirectory()).map((e) => e.name);

if (!folders.length) { console.log(`no series folders inside ${path.relative(ROOT, IN)}/`); process.exit(0); }

let made = 0, skipped = 0, dropped = 0;
const unknown = [];
const empty = [];

for (const folder of folders) {
  const album = byFolder.get(norm(folder));
  if (!album) { unknown.push(folder); continue; }

  const dir = path.join(IN, folder);
  const files = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|tiff?|webp)$/i.test(f));

  /* keep the largest file of each duplicate group */
  const groups = new Map();
  for (const f of files) {
    const k = groupKey(f);
    const size = fs.statSync(path.join(dir, f)).size;
    const prev = groups.get(k);
    if (!prev || size > prev.size) { if (prev) dropped++; groups.set(k, { f, size }); }
    else dropped++;
  }

  const picked = [...groups.values()].map((g) => g.f).sort((a, b) => a.localeCompare(b, 'en'));

  /* Every series has a drop folder whether or not anything has been put in it
     yet, so most of them are empty most of the time. Announcing each one would
     bury the handful that actually did something under thirty lines of noise —
     and "winter-gbq-1..0" is not a sentence. */
  if (!picked.length) { empty.push(album.en); continue; }

  console.log(`\n${album.en}  (${folder})  →  ${album.slug}-gbq-1..${picked.length}`);

  for (let i = 0; i < picked.length; i++) {
    const src = path.join(dir, picked[i]);
    const name = `${album.slug}-gbq-${i + 1}.jpg`;
    const full = path.join(OUT, name);

    if (!FORCE && fs.existsSync(full) && dims[name]) { skipped++; continue; }

    const meta = await sharp(src).metadata();
    const landscape = (meta.width || 0) >= (meta.height || 0);

    for (const s of SIZES) {
      const dest = path.join(OUT, s.dir, name);
      await sharp(src)
        .rotate()                                   // honour EXIF orientation before dropping it
        .resize(landscape ? { width: s.edge, withoutEnlargement: true }
                          : { height: s.edge, withoutEnlargement: true })
        .jpeg({ quality: s.q, progressive: true, mozjpeg: true, chromaSubsampling: '4:4:4' })
        .toFile(dest);
    }

    const outMeta = await sharp(full).metadata();
    dims[name] = { w: outMeta.width, h: outMeta.height };
    made++;
    process.stdout.write(`  ${name}  ${outMeta.width}×${outMeta.height}\n`);
  }
}

/* Only record dimensions once there are some. Writing an empty {} makes a
   run that processed nothing look like a run that did something: the workflow
   sees a changed file, commits it, and the history grows a "process uploads"
   commit for an upload that never happened. Ask me how I know. */
if (Object.keys(dims).length) {
  fs.writeFileSync(dimsPath, JSON.stringify(dims, null, 2) + '\n');
} else if (fs.existsSync(dimsPath)) {
  fs.rmSync(dimsPath);
}

console.log(`\n${made} photographs written, ${skipped} already present, ${dropped} duplicate exports discarded`);
if (empty.length) {
  console.log(`${empty.length} series still have no photographs${empty.length <= 6 ? ': ' + empty.join(', ') : ''}`);
}
if (unknown.length) {
  console.log('\n! these folders match no "drive" value in tools/albums.json and were left alone:');
  unknown.forEach((f) => console.log(`    ${f}`));
  console.log('  fix the folder name, or add the series to tools/albums.json.');
}
if (CONSUME) {
  /* Remove the photographs, and nothing else. The drop folders and their
     READMEs are the scaffolding for the next batch: deleting them means
     whoever uploads in three months finds an empty directory and no idea what
     goes where. Only image files go. */
  let removed = 0;
  const sweep = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) sweep(full);
      else if (/\.(jpe?g|png|tiff?|webp)$/i.test(entry.name)) { fs.rmSync(full); removed++; }
    }
  };
  sweep(IN);
  console.log(`\n${removed} original(s) removed — they are not kept in the repository`);
  console.log('the drop folders stay, ready for the next batch');
}
console.log('\nnow run:  node tools/build.mjs');
