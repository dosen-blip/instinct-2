#!/usr/bin/env node
// Instinct Groove site preflight. Run it from anywhere inside the repository:
//
//   node .agents/skills/publish-instinct-site/scripts/verify-site.mjs
//
// It checks the ordinary content (code syntax, the image and archive audits, links, cache keys) and that the site's
// rendering system is intact: the 3D hero, the lit wall with its lights and vines, the page slides and the phone
// version. That system is maintained by the studio and must never be edited here. Every problem is printed in plain
// English with how to fix it; the exit code is non-zero when anything fails.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const problems = [];
const passed = [];
const fail = (title, fix) => problems.push({ title, fix });
const ok = (line) => passed.push(line);

function tryRun(command, args, cwd) {
  try {
    return { ok: true, out: execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (error) {
    return { ok: false, out: `${error.stdout || ''}${error.stderr || ''}`.trim() || error.message };
  }
}
const top = tryRun('git', ['rev-parse', '--show-toplevel'], process.cwd());
const repo = top.ok ? top.out.trim() : process.cwd();
const run = (command, args) => tryRun(command, args, repo);
const at = (path) => resolve(repo, path);
const read = (path) => readFileSync(at(path), 'utf8');
const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const firstLines = (text, n = 6) => text.split('\n').filter(Boolean).slice(0, n).join('\n   ');
const gitOk = top.ok;
const base = gitOk ? ['origin/main', 'HEAD'].find((ref) => run('git', ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]).ok) : null;
const atBase = (path) => {
  if (!base) return null;
  const r = run('git', ['show', `${base}:${path}`]);
  return r.ok ? r.out : null;
};
const tracked = (path) => gitOk && run('git', ['ls-files', '--error-unmatch', '--', path]).ok;
const restore = (path) => (tracked(path)
  ? `Restore it with: git checkout -- ${path}`
  : 'It is not in the saved history, so remove it or ask the studio');
const lines = (...parts) => parts.filter(Boolean).join('\n   ');   // a fix in several steps, one per line

// ------------------------------------------------------------------ 1. the files this check needs
const MANIFEST = 'client-handoff-pack/rendering-manifest.json';
const required = ['index.html', 'app.js', 'styles.css', 'archive.css', 'content.js', 'catalog.js', 'image-manifest.js',
  'image-optimization-report.json', 'scripts/audit-images.mjs', 'scripts/audit-archive.mjs', 'scripts/rekey.mjs',
  '.github/workflows/static.yml', 'world/transitions.js', 'world/world.js', MANIFEST];
const missing = required.filter((path) => !existsSync(at(path)));
if (missing.length) {
  console.log(`Site preflight could not run: these files are missing: ${missing.join(', ')}.`);
  console.log('Restore them from the saved history (git checkout -- <file>) or ask the studio.');
  process.exit(1);
}

// ------------------------------------------------------------------ 2. code syntax, audits, whitespace
for (const file of ['app.js', 'content.js', 'catalog.js', 'image-manifest.js']) {
  const r = run(process.execPath, ['--check', file]);
  if (!r.ok) fail(`${file} has a syntax error, so the site would not load.`, `Fix the error it reports:\n   ${firstLines(r.out)}`);
}
if (!problems.length) ok('Code syntax: app.js, content.js, catalog.js, image-manifest.js');
for (const [script, what] of [['scripts/audit-images.mjs', 'Image audit'], ['scripts/audit-archive.mjs', 'Archive audit']]) {
  const r = run(process.execPath, [script]);
  if (r.ok) ok(`${what}: ${r.out.trim().split('\n')[0]}`);
  else {
    const said = (r.out.match(/AssertionError[^:]*:\s*(.+)/) || [])[1] || firstLines(r.out);
    const hint = /Unreachable shell: (\S+)/.test(said) ? ` A page needs a matching record in content.js: add the record first, or remove ${said.match(/Unreachable shell: (\S+)/)[1]}.` : '';
    fail(`The ${what.toLowerCase()} failed (the live release runs it too and would stop): ${said}`, `Fix what it names, then run the preflight again.${hint}`);
  }
}
if (gitOk) {
  const r = run('git', ['diff', '--check']);
  if (r.ok) ok('No stray whitespace in the changes');
  else fail('The changes contain stray whitespace or conflict leftovers.', `Clean these lines:\n   ${firstLines(r.out)}`);
}

// ------------------------------------------------------------------ 3. the pages: one head for all, home's extras only
const pages = readdirSync(repo).filter((name) => name.endsWith('.html')).sort();
const subpages = pages.filter((name) => name !== 'index.html');
const html = new Map(pages.map((page) => [page, read(page)]));
const BLOCK = /    <!-- world: [\s\S]*?<!-- \/world -->\n/;
const headOf = (text) => (text.match(/<head>([\s\S]*?)<\/head>/) || [, ''])[1];
const untitled = (head) => head.replace(/<title>[^<]*<\/title>/, '<title></title>');
const withoutBlock = (head) => head.replace(BLOCK, '');

for (const page of pages) {
  const text = html.get(page);
  if (!text.includes('<main id="app"></main>')) fail(`${page} has lost the page's single render area (<main id="app"></main>).`, lines(`Copy ${page === 'index.html' ? 'it' : 'the page'} again from a sibling page (vol-7.html) and change only the title.`, restore(page)));
  if (!/<title>[^<]+<\/title>/.test(text)) fail(`${page} has no page title.`, 'Add the title back in the <title> line.');
}
// (a) every page other than home: the same head, apart from its title
const tally = new Map();
for (const page of subpages) { const h = untitled(headOf(html.get(page))); tally.set(h, (tally.get(h) || 0) + 1); }
const refHead = [...tally].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
const refPage = ['vol-7.html', 'next-event.html', ...subpages].find((page) => html.has(page) && page !== 'index.html' && untitled(headOf(html.get(page))) === refHead);
for (const page of subpages) {
  const head = untitled(headOf(html.get(page)));
  if (head === refHead) continue;
  const a = refHead.split('\n'), b = head.split('\n');
  const i = a.findIndex((line, k) => line !== b[k]);
  fail(`${page}: its hidden page setup (the <head>) differs from the other pages (first difference at head line ${i + 1}: expected "${(a[i] ?? '(nothing)').trim().slice(0, 110)}", found "${(b[i] ?? '(nothing)').trim().slice(0, 110)}"). Page slides compare these heads, and the rendering system expects them to be identical.`,
    lines(`Make the page a whole copy of ${refPage} with only its <title> changed.`, tracked(page) && `To undo the edit instead: git checkout -- ${page}`));
}
if (subpages.length && tally.size === 1) ok(`Page heads: all ${subpages.length} pages other than home are identical apart from their titles`);

// the list of scripts and stylesheets the page slides compare: exactly world/transitions.js's shellOf()
// (head script[src] and link[rel="stylesheet"], without data-dynamic, their raw src/href, minus the hero's own hero-3d/)
const attr = (tag, name) => (tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')) || []).slice(1).find((v) => v !== undefined);
const has = (tag, name) => new RegExp(`\\s${name}(?=[\\s=>/])`, 'i').test(tag);
function shellOf(text) {
  const head = headOf(text).replace(/<!--[\s\S]*?-->/g, '');
  const out = [];
  for (const [tag] of head.matchAll(/<(?:script|link)\b[^>]*>/gi)) {
    if (has(tag, 'data-dynamic')) continue;
    const url = /^<script/i.test(tag) ? attr(tag, 'src') : (attr(tag, 'rel') === 'stylesheet' ? attr(tag, 'href') : undefined);
    if (url !== undefined && !/hero-3d\//.test(url)) out.push(url);
  }
  return out;
}
const refShell = refPage ? shellOf(html.get(refPage)) : [];
let shellsOk = true;
for (const page of pages) {
  const shell = shellOf(html.get(page));
  if (shell.join('\n') === refShell.join('\n')) continue;
  shellsOk = false;
  const extra = shell.filter((u) => !refShell.includes(u)), lacking = refShell.filter((u) => !shell.includes(u));
  fail(`${page} loads a different list of scripts and stylesheets from the other pages${extra.length ? ` (extra: ${extra.join(', ')})` : ''}${lacking.length ? ` (missing: ${lacking.join(', ')})` : ''}${!extra.length && !lacking.length ? ' (same files, different order)' : ''}. Clicking to or from it would no longer slide along the wall; the lights would dip and the page reload instead.`,
    page === 'index.html' ? lines(restore(page), 'Never add, drop or reorder script or stylesheet lines; after editing a site file, run node scripts/rekey.mjs, which updates every page the same way.')
      : `Copy the head of ${refPage} into it whole and change only the title. Never add, drop or reorder script or stylesheet lines; to refresh keys run node scripts/rekey.mjs.`);
}
if (shellsOk) ok(`Page slides: all ${pages.length} pages load the same ${refShell.length} scripts and stylesheets, in the same order (the comparison the slides make)`);

// (b) home: the same head as the others, plus only its own opening (the phone hero's images, the intro switch and
// the phone hero's loader), all inside the rendering block
const HOME_EXTRA = [
  /^    <link rel="preload" as="image" href="\.\/mobile\/hero\/hero-[a-z]\.webp" media="\(max-width: 720px\)" fetchpriority="high">\n/gm,
  /^    <script>\n      \/\/ the lit-sign intro[\s\S]*?\n    <\/script>\n/gm,
  /^    <link rel="modulepreload" href="\.\/mobile\/mobile-hero\.js\?v=[0-9a-f]{8}" media="\(max-width: 720px\)">\n/gm,
  /^    <script type="module">if \(matchMedia\('\(max-width: 720px\)'\)\.matches\) import\('\.\/mobile\/mobile-hero\.js\?v=[0-9a-f]{8}'\)[^\n]*<\/script>\n/gm,
];
const homeHead = untitled(headOf(html.get('index.html')));
const homeBlock = (homeHead.match(BLOCK) || [''])[0], subBlock = (refHead.match(BLOCK) || [''])[0];
const homeBare = HOME_EXTRA.reduce((t, re) => t.replace(re, ''), homeBlock);
if (withoutBlock(homeHead) !== withoutBlock(refHead)) {
  fail('index.html (home): its head, outside the rendering block, differs from the other pages\'.', lines(`Home's head must match ${refPage}'s apart from the title.`, restore('index.html')));
} else if (!homeBlock || homeBare !== subBlock) {
  fail('index.html (home): its rendering block is not the other pages\' block plus home\'s own opening lines.', restore('index.html'));
} else ok('Home head: the shared head plus only its own opening lines (phone hero images, intro switch, phone hero loader)');

// ------------------------------------------------------------------ 4. the rendering system: unchanged since the studio's release
const manifest = JSON.parse(read(MANIFEST));
const PROTECTED = ['hero-3d', 'world', 'mobile', 'assets/vendor'];
const onDisk = [];
const walk = (dir) => { for (const name of readdirSync(dir)) { const p = join(dir, name); if (statSync(p).isDirectory()) walk(p); else if (name !== '.DS_Store') onDisk.push(relative(repo, p).split('\\').join('/')); } };
for (const dir of PROTECTED) if (existsSync(at(dir))) walk(at(dir));
let renderingOk = true;
const why = 'It is part of the site\'s rendering system (the 3D hero, the lit wall and its lights and vines, the page slides, the phone version), which the studio maintains.';
for (const [path, hash] of Object.entries(manifest.files)) {
  if (!existsSync(at(path))) { renderingOk = false; fail(`${path} is missing. ${why}`, restore(path)); continue; }
  if (sha256(readFileSync(at(path))) !== hash) { renderingOk = false; fail(`${path} has been changed. ${why}`, lines(restore(path), 'If the request really needs a change there, offer to pass it to the studio instead.')); }
}
for (const path of onDisk) {
  if (!(path in manifest.files)) { renderingOk = false; fail(`${path} is a new file inside a studio-only folder (${path.split('/').slice(0, path.startsWith('assets/') ? 2 : 1).join('/')}/). ${why}`, `Remove it: nothing for the client side belongs there.${tracked(path) ? ` (It is in the history: git rm -- ${path})` : ''}`); }
}
const manifestEdited = gitOk && tracked(MANIFEST) && !run('git', ['diff', '--quiet', 'HEAD', '--', MANIFEST]).ok;
// the manifest itself: only ever changed by a studio commit (a release, or a revert of one), and such a commit always
// carries rendering files with it. An uncommitted change, or a commit that changes the manifest alone, is not the studio's.
// (The commit that first adds it, before the live version has one, is the pack's own and is not checked.)
let manifestLone = [];
if (gitOk && tracked(MANIFEST)) {
  const studio = /^(hero-3d|world|mobile|assets\/vendor)\//m;
  const uncommitted = manifestEdited;
  const commits = base && base !== 'HEAD' && atBase(MANIFEST) !== null ? run('git', ['log', '--format=%H', `${base}..HEAD`, '--', MANIFEST]).out.split('\n').filter(Boolean) : [];
  const lone = commits.filter((sha) => !studio.test(run('git', ['show', '--name-only', '--format=', sha]).out));
  manifestLone = lone;
  if (uncommitted || lone.length) {
    renderingOk = false;
    fail(`${MANIFEST} has been ${uncommitted ? 'changed' : 'changed in a commit without any studio files'}. Only the studio's own releases change it; it must never be edited or regenerated here.`,
      uncommitted ? `Restore it with: git checkout HEAD -- ${MANIFEST}` : `Undo that commit with: git revert ${lone[0].slice(0, 12)}`);
  }
}
const badBlocks = pages.filter((page) => {
  const block = (html.get(page).match(BLOCK) || [null])[0];
  return !block || sha256(Buffer.from(block, 'utf8')) !== (page === 'index.html' ? manifest.worldBlock.home : manifest.worldBlock.subpage);
});
if (badBlocks.length > 3) {
  renderingOk = false;
  fail(`${badBlocks.length} pages' rendering blocks (from <!-- world: to <!-- /world -->) do not match the studio's record (${badBlocks.slice(0, 4).join(', ')}, ...). ${manifestEdited || manifestLone.length ? 'The pages may be fine: the record itself (the rendering manifest) was changed; see its own problem.' : why}`,
    manifestEdited ? `Restore the record first: git checkout HEAD -- ${MANIFEST}` : manifestLone.length ? `Undo the record's change first: git revert ${manifestLone[0].slice(0, 12)}` : lines('Restore the pages from the saved history: git checkout -- <page>.html for each one.', 'Never edit the rendering block; ask the studio if a request needs it changed.'));
}
for (const page of badBlocks.length > 3 ? [] : badBlocks) {
  const block = (html.get(page).match(BLOCK) || [null])[0];
  renderingOk = false;
  fail(`${page}: the rendering block in its head (from <!-- world: to <!-- /world -->) is ${block ? 'not the studio\'s version' : 'missing'}. ${why}`,
    tracked(page) ? `Restore it with: git checkout -- ${page} (this also undoes any other edit to that page; for a page you just made, copy ${refPage} again and change only the title).`
      : `Copy ${page === 'index.html' ? 'index.html from the saved history' : refPage} again and change only the title.`);
}
if (renderingOk) ok(`Rendering system: ${Object.keys(manifest.files).length} studio files and the rendering block on all ${pages.length} pages match the studio's release`);

// ------------------------------------------------------------------ 5. no development or third-party code in the pages
let refsOk = true;
for (const page of pages) {
  const code = html.get(page).replace(/<!--[\s\S]*?-->/g, '');
  const lab = code.match(/["'(=](?:\.{1,2}\/)*lab\//);
  const cdn = code.match(/(?:src|href)\s*=\s*["']?(?:https?:)?\/\/[^"'\s>]+/i) || code.match(/jsdelivr|unpkg|cdnjs|cdn\.|googleapis/i);
  if (lab) { refsOk = false; fail(`${page} points at the studio's development folder (lab/), which is not published.`, lines('Remove that reference.', restore(page))); }
  if (cdn) { refsOk = false; fail(`${page} loads something from another website (${cdn[0].slice(0, 80)}). The site loads only its own files.`, lines('Remove it.', restore(page))); }
}
for (const file of ['app.js', 'styles.css', 'archive.css']) {
  if (/["'(](?:\.{1,2}\/)*lab\//.test(read(file))) { refsOk = false; fail(`${file} points at the studio's development folder (lab/), which is not published.`, 'Remove that reference.'); }
}
if (refsOk) ok('No development-folder or outside-website references in the pages');

// ------------------------------------------------------------------ 6. the rendering hooks in app.js and the home structure
const app = read('app.js');
const HOOKS = [
  [`window.addEventListener('popstate',event=>{if(window.__txPop)window.__txPop(event);});`, 'the Back/Forward hook of the page slides (__txPop)'],
  [`mobileMedia.addEventListener('change',()=>{if(!window.__worldReinit)render();});`, 'the phone/computer switch guard (__worldReinit)'],
  ['function setupLookahead()', 'the image look-ahead (setupLookahead)'],
  ['const cleanupLookahead = setupLookahead();', 'the image look-ahead being started (setupLookahead)'],
  ['window.INSTINCT_PAGE_MARKUP = route =>', 'the page preview used to preload the next page (INSTINCT_PAGE_MARKUP)'],
  ['const next = scrolled ? window.scrollY > 0 : window.scrollY > 24;', 'the steady header condense rule'],
  ["return `<video ${deferred?'':'autoplay '}muted loop playsinline preload=\"${deferred?'none':'metadata'}\"", 'the phone film without autoplay'],
  ["homePreviewMedia('mobile-home-preview', 'Event preview', true)", 'the phone film without autoplay (its call)'],
  [' decoding="async" alt="', 'images decoding off the main thread (decoding="async")'],
  ['loading="${priority ? \'eager\' : \'lazy\'}"', 'lazy image loading'],
  [' srcset="${record.candidates.map(', 'responsive image sizes (srcset)'],
  [' width="${record.width}" height="${record.height}"', 'image width and height'],
];
let hooksOk = true;
for (const [needle, what] of HOOKS) {
  if (!app.includes(needle)) { hooksOk = false; fail(`app.js has lost ${what}. The rendering system relies on this exact line.`, 'Put the line back as it was (compare with the saved version: git diff app.js). It is studio-maintained; never change it.'); }
}
const pop = app.indexOf('window.__txPop(event)'), popRender = app.indexOf("window.addEventListener('popstate',render);");
if (pop > -1 && (popRender < 0 || popRender < pop)) { hooksOk = false; fail('app.js: the page slides\' Back/Forward hook must be registered before render\'s own popstate listener.', 'Put the two popstate lines back in their original order (git diff app.js).'); }
if (!/<div class="home-opening">\s*<section class="home-hero">[\s\S]*?\$\{homeDefinition\(\)\}\s*<\/div>\s*<section class="preview-panel section-border">/.test(app)) {
  hooksOk = false; fail('app.js: the computer home page\'s opening has changed shape. The 3D hero needs the opening box (home-opening) to hold the hero picture then the definition, with the "Inside Instinct" panel (preview-panel) right after it.', 'Put that part of renderHome() back as it was (git diff app.js); add new home content after the "Inside Instinct" panel instead.');
}
if (!/<div class="home-opening">\s*<section class="mobile-home-hero">[\s\S]*?\$\{homeDefinition\(\)\}\s*<\/div>/.test(app) || !app.includes('class="mobile-home-video"') || !app.includes('<div class="mobile-view mobile-home">')) {
  hooksOk = false; fail('app.js: the phone home page\'s opening has changed shape. The phone hero needs the opening box (home-opening) with the hero then the definition, and the film box (mobile-home-video).', 'Put that part of renderMobileHome() back as it was (git diff app.js).');
}
// the class names the lit wall reads (world/world.js: the photo mounts, the headings that get a lamp, the lit buttons,
// the prints): each one the live version of app.js uses must still be there
const world = read('world/world.js');
const lists = ['MOUNTS', 'HEADINGS', 'SLABS', 'PRINTS', 'PHONE_GRIDS'].map((name) => (world.match(new RegExp(`const ${name} = '([^']+)'`)) || [, ''])[1]).join(' ');
const sectionNames = [...world.matchAll(/inApp\('([^']+)'\)/g)].map((m) => m[1]).join(' ');
const classes = [...new Set([...`${lists} ${sectionNames} .site-footer .archive-heading .desktop-view .with-mobile .section-border`.matchAll(/\.([a-z][\w-]*)/g)].map((m) => m[1]))];
const word = (name) => new RegExp(`(?<![\\w-])${name}(?![\\w-])`);
const liveApp = atBase('app.js') ?? app;
const lost = classes.filter((name) => word(name).test(liveApp) && !word(name).test(app));
if (lost.length) { hooksOk = false; fail(`app.js no longer uses these class names, which the lit wall reads to place lamps, vines and lit frames: ${lost.join(', ')}.`, 'Keep these class names on the same kinds of elements (rename the look in styles.css instead of the class).'); }
if (hooksOk) ok(`Rendering hooks in app.js and the home opening are intact (${classes.filter((name) => word(name).test(app)).length} class names the lit wall reads are present)`);

// ------------------------------------------------------------------ 7. scroll smoothness: nothing heavy added since the live version
// Each count must not grow compared with the live version: page-sized fixed, blurred or blended layers and big soft
// shadows are what made scrolling stutter on phones, and a scroll listener that measures the page does the same.
function shadowsOver(css, limit = 40) {
  let n = 0;
  for (const [, value] of css.matchAll(/(?:box|text)-shadow\s*:\s*([^;}]+)/g)) {
    const layers = value.replace(/\([^)]*\)/g, '()').split(',');
    for (const layer of layers) {
      const lengths = [...layer.matchAll(/(-?\d*\.?\d+)(px|rem|em)?/g)].map((m) => Number(m[1]) * (m[2] === 'rem' || m[2] === 'em' ? 16 : 1));
      if (lengths.length >= 3 && lengths[2] >= limit) n++;
    }
  }
  return n;
}
const ROOT_RULE = /(?:^|[}\s,])(?:html|body|#app)\s*(?:,[^{]*)?\{[^}]*(?<![\w-])(?:overflow(?:-[xy])?|position|z-index|transform|contain|filter)\s*:/g;
const WATCH = [
  ['background blur (backdrop-filter)', /backdrop-filter\s*:/g],
  ['blend modes (mix-blend-mode)', /mix-blend-mode\s*:/g],
  ['layers fixed to the screen (position: fixed)', /position\s*:\s*fixed/g],
  ['filters (filter:)', /(?<![\w-])filter\s*:/g],
  ['rules on the page frame (html, body or #app: overflow, position, z-index, transform, contain or filter)', ROOT_RULE],
];
let smoothOk = true;
if (base) {
  for (const file of ['styles.css', 'archive.css']) {
    const now = read(file), then = atBase(file);
    if (then === null) continue;
    for (const [what, re] of WATCH) {
      const a = (then.match(re) || []).length, b = (now.match(re) || []).length;
      if (b > a) { smoothOk = false; fail(`${file} adds ${b - a} new ${what} compared with the live version. These make scrolling stutter (especially on phones) or break the lit wall behind the page.`, 'Remove the new rule, or get the look another way (a plain colour or border). If it really is needed, ask the studio.'); }
    }
    const a = shadowsOver(then), b = shadowsOver(now);
    if (b > a) { smoothOk = false; fail(`${file} adds ${b - a} large soft shadow${b - a > 1 ? 's' : ''} (blur of 40px or more) compared with the live version. Big blurred shadows are slow to draw while scrolling.`, 'Use a smaller blur (under 40px) or a plain border.'); }
  }
  const scrolls = (text) => (text.match(/addEventListener\(\s*['"]scroll['"]|\bonscroll\b/g) || []).length;
  const then = atBase('app.js');
  if (then !== null && scrolls(app) > scrolls(then)) { smoothOk = false; fail('app.js adds a new scroll listener. Code that runs on every scroll (especially one that measures the page) makes fast scrolling stutter.', 'Use an IntersectionObserver instead (as setupLookahead does), or leave the effect out.'); }
  if (smoothOk) ok(`Scroll smoothness: no new blurs, blends, fixed layers, filters, big shadows or scroll listeners compared with ${base}`);
} else ok('Scroll smoothness: skipped (no saved version to compare with)');

// ------------------------------------------------------------------ 8. cache keys, links, release workflow, conflicts
const rekey = run(process.execPath, ['scripts/rekey.mjs', '--check']);
if (rekey.ok) ok(`Cache keys: ${rekey.out.trim().split('\n').pop()}`);
else fail('The cache keys (?v=) are out of date or differ between pages, so visitors could keep seeing an old version.', `Run: node scripts/rekey.mjs\n   It reported:\n   ${firstLines(rekey.out.split('Problems:')[1] || rekey.out)}`);

const routeFiles = new Set([...app.matchAll(/['"]\.\/([a-z0-9-]+\.html)['"]/g)].map((match) => match[1]));
const deadRoutes = [...routeFiles].filter((file) => !existsSync(at(file)));
if (deadRoutes.length) fail(`Links point to pages that do not exist: ${deadRoutes.join(', ')}.`, 'Create the page by copying a sibling page whole (see the site map), or fix the link.');
else ok(`Fixed page links: ${routeFiles.size} targets exist`);

const workflow = read('.github/workflows/static.yml');
const wf = [['branches: ["main"]', 'is limited to the main branch'], ['node scripts/audit-images.mjs', 'runs the image audit'], ['node scripts/audit-archive.mjs', 'runs the archive audit']];
const wfMissing = wf.filter(([needle]) => !workflow.includes(needle));
if (wfMissing.length) fail(`The release workflow no longer ${wfMissing.map(([, what]) => what).join(' and ')}.`, lines(restore('.github/workflows/static.yml'), 'The workflow is studio-maintained.'));
else ok('Release workflow: main only, with the image and archive audits');

if (gitOk) {
  const textExtensions = new Set(['.css', '.html', '.js', '.json', '.md', '.mjs', '.sh', '.yml', '.yaml']);
  const files = run('git', ['ls-files', '-z']).out.split('\0').filter(Boolean);
  const conflicted = files.filter((file) => textExtensions.has(extname(file)) && existsSync(at(file)) && /^(<<<<<<<|=======|>>>>>>>)( |$)/m.test(read(file)));
  if (conflicted.length) fail(`Unresolved merge leftovers in: ${conflicted.join(', ')}.`, 'Resolve them before publishing.');
  else ok('No unresolved merge leftovers');
}

// ------------------------------------------------------------------ report
console.log('Instinct Groove site preflight\n');
for (const line of passed) console.log(`PASS  ${line}`);
if (problems.length) {
  console.log(`\nFAILED: ${problems.length} problem${problems.length > 1 ? 's' : ''} to fix before publishing\n`);
  problems.forEach((p, i) => console.log(`${i + 1}. ${p.title}\n   Fix: ${p.fix}\n`));
  process.exit(1);
}
console.log('\nSite preflight passed. Still look at the affected pages on a phone and a computer (see verification.md).');
