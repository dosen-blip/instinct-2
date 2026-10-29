// Local-only: photographs are fetched and decoded before they scroll into view, so a fast scroll never waits on one.
// The site lazy-loads its images (loading="lazy"): the browser fetches them as they near the screen and decodes them
// when they are first painted, and that decode is what catches on a fast scroll. Here every image within a few screens
// of the one in view, further ahead in the direction of travel and the faster the page is moving, is fetched and
// decoded in advance, off the main thread (img.decode()). Nothing is done twice; positions are measured only when the
// layout changes, never while scrolling.

const app = document.getElementById('app');
const root = document.documentElement;
const done = new WeakSet();
let spots = [], lastY = scrollY, lastT = performance.now(), speed = 0, queued = false;

function measure() {
  spots = [...app.querySelectorAll('img')].filter((img) => !done.has(img)).map((img) => {
    const r = img.getBoundingClientRect();
    return { img, top: r.top + scrollY, bottom: r.bottom + scrollY };
  });
  queue();
}
function scan() {
  queued = false;
  if (root.classList.contains('intro-pending')) return;   // the home intro: nothing can be seen or scrolled yet (see warm)
  const now = performance.now(), dy = scrollY - lastY, H = innerHeight;
  speed += (dy / Math.max((now - lastT) / 1000, 1 / 120) - speed) * 0.5;   // px/s, signed
  lastY = scrollY; lastT = now;
  // two and a half screens ahead at rest, up to eight and a half when flung; a screen behind
  const ahead = H * (2.5 + Math.min(6, Math.abs(speed) / 1500)), down = speed >= 0;
  const lo = scrollY - (down ? H : ahead), hi = scrollY + H + (down ? ahead : H);
  spots = spots.filter((s) => {
    if (s.bottom < lo || s.top > hi) return true;
    done.add(s.img);
    if (s.img.loading === 'lazy') s.img.loading = 'eager';
    s.img.decode().catch(() => {});
    return false;
  });
}
function queue() { if (!queued) { queued = true; requestAnimationFrame(scan); } }

addEventListener('scroll', queue, { passive: true });
addEventListener('resize', measure);
new ResizeObserver(measure).observe(app);
new MutationObserver(measure).observe(app, { childList: true, subtree: true });   // the gallery swaps its results in place
new MutationObserver(() => { if (!root.classList.contains('intro-pending')) queue(); }).observe(root, { attributes: true, attributeFilter: ['class'] });
measure();

// Warming during the home intro. For its first ~6 s the home page plays the sign-strike intro: the page underneath is
// already laid out but nobody can see or scroll it, so the network and the image decoders sit idle. Once the hero's own
// assets are in (concrete, leaf atlas, wordmark: it announces its first layout with `hero:ivy`), that time is used to
//  1. fetch and decode every photo on the home page (decoded here, so they paint at once when scrolled to), then
//  2. prefetch the nav targets (Next Event, Past Events, Gallery, Artists): their page and their first screen of photos,
//     in exactly the size variant that page will pick (same srcset and sizes, read from the markup app.js would render).
// A decode cannot be carried into another page, so those are only fetched into the cache; their decode happens on
// arrival, on the raster threads. Everything is low priority, two at a time, and pauses while the page is scrolling,
// so whatever the user scrolls toward (the scroll look-ahead above) always goes first. The other pages are skipped with
// Save-Data or on a 2G-class connection.
const ROUTES = ['next-event', 'past-events', 'gallery', 'artists'];
const FIRST_SCREEN = { 'next-event': 4, 'past-events': 6, gallery: 6, artists: 8 };
let lastScroll = 0;
addEventListener('scroll', () => { lastScroll = performance.now(); }, { passive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function quiet() { while (performance.now() - lastScroll < 300) await sleep(120); }

function heroReady() {
  return new Promise((resolve) => {
    if (!root.classList.contains('intro')) {   // no intro (phones, reduced motion, ?nohero): wait for the page itself
      if (document.readyState === 'complete') resolve(); else addEventListener('load', () => resolve(), { once: true });
      return;
    }
    if (window.__heroIvy) return resolve();
    document.addEventListener('hero:ivy', () => resolve(), { once: true });
    // no WebGL: the hero gives up and reveals the page at once
    new MutationObserver((_, mo) => { if (!root.classList.contains('intro-pending')) { mo.disconnect(); resolve(); } })
      .observe(root, { attributes: true, attributeFilter: ['class'] });
  });
}
function homeJobs() {
  return [...app.querySelectorAll('img')].filter((img) => !done.has(img)).map((img) => async () => {
    if (done.has(img)) return;   // the scroll look-ahead got there first
    done.add(img);
    if (!img.complete) { img.fetchPriority = 'low'; img.loading = 'eager'; }
    await img.decode().catch(() => {});
  });
}
function pageJobs(route) {
  const jobs = [() => {
    const link = Object.assign(document.createElement('link'), { rel: 'prefetch', href: `./${route}.html` });
    link.setAttribute('as', 'document');
    document.head.append(link);
  }];
  const t = document.createElement('template');   // inert: nothing in a template loads
  t.innerHTML = window.INSTINCT_PAGE_MARKUP?.(route) || '';
  for (const src of [...t.content.querySelectorAll('img')].slice(0, FIRST_SCREEN[route])) jobs.push(() => new Promise((resolve) => {
    const img = new Image();
    img.fetchPriority = 'low';
    img.onload = img.onerror = resolve;
    if (src.srcset) { img.sizes = src.sizes; img.srcset = src.srcset; }
    img.src = src.getAttribute('src');
  }));
  return jobs;
}
async function warm() {
  const c = navigator.connection;
  const pages = !(c?.saveData || /2g$/.test(c?.effectiveType || ''));
  // wall-gl (lab/world/wall-gl.js): the hero's two concrete textures, which every other page's GL wall needs, into the
  // cache (the home hero has usually fetched them already), so the next page's wall comes up without the still first
  const concrete = ['concrete-dark', 'concrete-light'].map((n) => () => fetch(new URL(`../hero-3d/assets/${n}.webp`, import.meta.url), { priority: 'low' }).then((r) => r.blob()).catch(() => {}));
  const jobs = [...homeJobs(), ...concrete, ...(pages ? ROUTES.flatMap(pageJobs) : [])];
  window.__warm = { total: jobs.length, done: 0, started: performance.now() };
  const worker = async () => {
    for (let job; (job = jobs.shift());) { await quiet(); await job(); window.__warm.done++; }
  };
  await Promise.all([worker(), worker()]);
  window.__warm.finished = performance.now();
}
if (/(^|\/)(index\.html)?$/.test(location.pathname)) heroReady().then(warm);

// ?perf: a small readout of how smooth the page really is on this machine (frames per second, and how many frames in
// the last five seconds took longer than a 60 Hz frame should), for judging scrolling with a real trackpad
if (new URLSearchParams(location.search).has('perf')) {
  const hud = document.createElement('div');
  hud.style.cssText = 'position:fixed;right:10px;bottom:10px;z-index:9999;padding:6px 9px;font:11px/1.4 ui-monospace,monospace;color:#c8ff6a;background:rgba(0,0,0,.75);pointer-events:none';
  document.body.append(hud);
  const gaps = [];
  let last = performance.now();
  const tick = (t) => {
    gaps.push([t, t - last]); last = t;
    while (gaps.length && gaps[0][0] < t - 5000) gaps.shift();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  setInterval(() => {
    const recent = gaps.filter(([t]) => t > performance.now() - 1000).length;
    const slow = gaps.filter(([, d]) => d > 20).length, worst = Math.max(0, ...gaps.map(([, d]) => d));
    hud.textContent = `${recent} fps · ${slow} slow frames (5 s) · worst ${Math.round(worst)} ms`;
  }, 500);
}
