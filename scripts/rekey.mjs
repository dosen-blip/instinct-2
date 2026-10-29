#!/usr/bin/env node
// Refresh the cache keys (the ?v=... after a file name) that every page uses to load the site's own files, so visitors'
// browsers fetch a changed file instead of an old saved copy.
//
//   node scripts/rekey.mjs           after editing app.js, styles.css, archive.css, content.js, catalog.js or
//                                    image-manifest.js: sets each file's key, on every page, to the first 8 hex digits
//                                    of the file's sha256 (the scheme the studio's publish step uses for app.js and the
//                                    rendering files), so all pages stay identical
//   node scripts/rekey.mjs --check   changes nothing; fails if pages disagree, or if one of those files changed since the
//                                    live version (origin/main) while its key did not
//
// It never touches the rendering block between <!-- world --> and <!-- /world --> (its keys belong to the studio).
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const KEYED = ['app.js', 'styles.css', 'archive.css', 'content.js', 'catalog.js', 'image-manifest.js'];
export const contentKey = (data) => createHash('sha256').update(data).digest('hex').slice(0, 8);
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// "./styles.css?v=KEY" inside a quoted src/href (so ./mobile/mobile.js never counts as a page's own file)
const keyPattern = (file) => new RegExp(`(["'])(\\./${escape(file)}\\?v=)([^"'\\s>]*)(["'])`, 'g');
const outsideWorld = (html) => html.replace(/<!-- world: [\s\S]*?<!-- \/world -->/, '');

const argv = process.argv.slice(2);
const check = argv.includes('--check');
const rootArg = argv.indexOf('--root');
const root = rootArg >= 0 ? argv[rootArg + 1] : fileURLToPath(new URL('..', import.meta.url));

function git(args) {
  try { return execFileSync('git', args, { cwd: root, encoding: 'buffer', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; }
}
// the live version to compare with: origin/main, else the last saved version (HEAD)
const base = ['origin/main', 'HEAD'].find((ref) => git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]));

const pages = readdirSync(root).filter((name) => name.endsWith('.html')).sort();
const html = new Map(pages.map((page) => [page, readFileSync(join(root, page), 'utf8')]));
const problems = [];
const lines = [];

for (const file of KEYED) {
  const data = readFileSync(join(root, file));
  const expected = contentKey(data);
  const seen = new Map();   // key -> pages
  for (const page of pages) {
    const found = [...outsideWorld(html.get(page)).matchAll(keyPattern(file))].map((m) => m[3]);
    if (found.length !== 1) { problems.push(`${page} should load ${file} exactly once (found ${found.length}). Copy the page's head from a sibling page such as vol-2.html.`); continue; }
    if (!seen.has(found[0])) seen.set(found[0], []);
    seen.get(found[0]).push(page);
  }
  if (seen.size > 1) {
    const variants = [...seen].map(([k, list]) => `${k} on ${list.length} page${list.length > 1 ? 's' : ''} (${list.slice(0, 3).join(', ')}${list.length > 3 ? ', ...' : ''})`);
    problems.push(`The pages disagree about ${file}'s key: ${variants.join('; ')}. Run: node scripts/rekey.mjs`);
    lines.push(`  MIXED   ${file}`);
    continue;
  }
  const current = [...seen.keys()][0];
  if (current === undefined) continue;
  if (current === expected) { lines.push(`  ok      ${file.padEnd(18)} ${current}  matches the file`); continue; }
  if (!check) { lines.push(`  update  ${file.padEnd(18)} ${current} -> ${expected}`); continue; }
  // the key is not this file's content key: fine only while the file is unchanged since the live version
  const live = base && git(['show', `${base}:${file}`]);
  const liveIndex = base && git(['show', `${base}:index.html`]);
  const liveKey = liveIndex && [...outsideWorld(liveIndex.toString('utf8')).matchAll(keyPattern(file))].map((m) => m[3])[0];
  if (live && Buffer.compare(live, data) === 0) {
    lines.push(`  ok      ${file.padEnd(18)} ${current}  (an older label; the file is unchanged since the live version)`);
  } else if (!live) {
    if (/^[0-9a-f]{8}$/.test(current)) problems.push(`${file} has changed but its key (${current}) was not refreshed. Run: node scripts/rekey.mjs`);
    else lines.push(`  note    ${file.padEnd(18)} ${current}  (an older label; no live version to compare with)`);
  } else {
    problems.push(`${file} has changed since the live version but its key ${current === liveKey ? 'is still the old one' : `(${current}) is not its content key`}, so visitors could keep an old copy. Run: node scripts/rekey.mjs`);
    lines.push(`  STALE   ${file.padEnd(18)} ${current}  (should be ${expected})`);
  }
}

if (check) {
  console.log(`Cache keys on ${pages.length} pages${base ? ` (compared with ${base})` : ''}:`);
  console.log(lines.join('\n'));
  if (problems.length) {
    console.log(`\nProblems:\n${problems.map((p) => `- ${p}`).join('\n')}`);
    process.exit(1);
  }
  console.log(`All ${pages.length} pages carry the same keys, and every changed file has a fresh key.`);
  process.exit(0);
}

if (problems.some((p) => p.includes('exactly once'))) {
  console.log(`Nothing changed:\n${problems.map((p) => `- ${p}`).join('\n')}`);
  process.exit(1);
}
let changed = 0;
for (const page of pages) {
  const text = html.get(page);
  const start = text.indexOf('<!-- world: ');
  const head = start >= 0 ? text.slice(0, start) : text;   // the keyed lines come before the rendering block
  let next = head;
  for (const file of KEYED) next = next.replace(keyPattern(file), (m, q, prefix, _key, q2) => `${q}${prefix}${contentKey(readFileSync(join(root, file)))}${q2}`);
  if (next !== head) { writeFileSync(join(root, page), next + text.slice(head.length)); changed++; }
}
console.log(lines.join('\n'));
console.log(changed ? `Refreshed the keys on ${changed} of ${pages.length} pages. Every page now carries the same keys.` : `All ${pages.length} pages were already up to date.`);
