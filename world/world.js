// Local-only: every page of the site built in the hero's world (see lab/SITE-EXPLORATION.md).
// The wall the hero itself baked (hero-3d ?still) runs behind the page, lit by one shared set of lights: soft pools from
// fixtures overhead (one over each heading, more at intervals down long pages), the lit-slab buttons, and fireflies.
// Ivy grows on the same wall, so it is lit and shadowed with it, and the photos and posters read the same lights.
// On the home page the wall starts under the live hero's fade, carrying its ivy on down.
//
// Layers, back to front, all behind the page content (#app sits above at z-index 1):
//   albedo    the wall still and the ivy
//   light     every light as an element (fixtures, slabs, fireflies) summed over the room's fill, multiplied over the albedo
//   vignette  the hero grade's vignette, fixed to the screen (static)
//   veil      the room's haze (as in the hero), added flat
//   bodies    the fireflies themselves, added on top
//   grain     film grain, as the hero's grade
// Everything that belongs to the wall is positioned on the page, so the browser scrolls it with the content on its own
// thread and nothing can trail behind a fast scroll. Per frame, only the fireflies and slabs near the screen move or
// change brightness, and nothing depends on the scroll position.

const OVERLAP = 420;                        // home: the baked wall starts this far above the end of the live wall, under its fade
const STILL = { w: 2560, h: 1440 };         // the baked wall, at one CSS px per pixel (the hero's scale on the page)
// The room's own dim light and its haze, fitted to the live wall's pixels just above the seam, mid-screen (percentiles
// of the hero's output against the still: page = still x AMBIENT + VEIL). Further down, and on pages without the hero,
// both thin out, as the room does further from its light.
// (refitted after the hero's room was darkened to the other pages' mood; further down the home page is lit as they are)
const AMBIENT = [0.185, 0.245, 0.174], AMBIENT_FAR = [0.075, 0.1, 0.075];
const VEIL = [0.034, 0.05, 0.037], VEIL_FAR = [0.012, 0.026, 0.016];
const HOME_HEAD = 0.75, HOME_POOL = 0.46;   // home fixtures: over each heading, and down the bands (as PAGE_HEAD / PAGE_POOL)
// the other pages: a little darker, and lit with more contrast (brighter fixtures over less fill and haze)
const AMBIENT_PAGE = [0.075, 0.1, 0.075], VEIL_PAGE = [0.012, 0.026, 0.016], PAGE_HEAD = 0.75, PAGE_POOL = 0.46;
// desktop pages (round 6, "a tiny bit too dark"): the fill and haze about 20% up, more fixtures (see buildRoom, addBands)
const AMBIENT_DESK = [0.148, 0.198, 0.148], VEIL_DESK = [0.017, 0.037, 0.023];   // (round 8: middle ground, ×.86 of round 7)   // (round 7: up again, ~65%/40%, measured on the GL wall)
// phones: the seam under the baked hero plate, fitted the same way to the plate's own pixels over its fade (plate rows
// 1100-1400 against the phone wall tile there, percentiles 10-90 per channel, after the plates' dithered re-bake): the
// plate is greener and darker there than the desktop hero's seam
const AMBIENT_PLATE = [0.088, 0.24, 0.069], VEIL_PLATE = [0.009, 0.001, 0.018];
const pageFill = () => (geo.phone ? AMBIENT_PAGE : AMBIENT_DESK), pageVeil = () => (geo.phone ? VEIL_PAGE : VEIL_DESK);
const FAR = 1400;   // px below the seam over which the room thins out
const OVERHEAD = [0.86, 1, 0.8];            // the hero's soft overhead fill (ROOM.top), as a colour
const SIGN = [1, 0.94, 0.86];               // the backlit resin (hero uGlowColor)
const KINDS = {                             // as in the hero (fx.js): colour, light power, body size
  blink: { c: [0.72, 1, 0.28], power: 1.5, size: 1 },
  orb: { c: [0.55, 1, 0.72], power: 0.75, size: 1.5 },
  moth: { c: [1, 0.86, 0.55], power: 0.9, size: 0.8 },
};
const IVY_CELLS = [[0, 2], [1, 1], [2, 1], [3, 0.8], [4, 1.1], [5, 1], [6, 2.4], [7, 1]];   // as vines.js
const FALLOFF = [[0, 1], [0.12, 0.62], [0.3, 0.3], [0.55, 0.11], [0.8, 0.03], [1, 0]];       // every light's soft radial shape
// lit-slab buttons (world.css styles the same list): each page's primary action, and the pressed gallery filter
const SLABS = '.archive-shell > .archive-actions > a:first-child, .archive-artist-hero .archive-actions:first-of-type > a:first-child, .button, .archive-filters button[aria-pressed="true"]';
// photographs and posters, which take the wall's light; and what each one is mounted in (that catches a passing firefly)
const PRINTS = ':is(.archive-card-image, .archive-artist-image, .archive-media-image, .archive-lineup-image, .archive-poster, .archive-spotlight-poster, .archive-artist-hero figure, .about-grid figure) img';
const MOUNTS = '.archive-card, .archive-artist-image, .archive-media-image, .archive-lineup-card, .archive-poster, .archive-spotlight-poster, figure';
const HEADINGS = '.archive-heading, .archive-section-heading h2, .archive-section > h2, .archive-gallery-context h2, .about-grid h2, .archive-home-spotlight h2, .archive-home-gallery h2, .archive-announcement-grid h2';
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
// phones (<=720px) get the world too, scaled to a phone (lab/MOBILE.md); ?noworld leaves a page without it
const phoneMq = matchMedia('(max-width: 720px)'), NOWORLD = new URLSearchParams(location.search).has('noworld'), NOHERO = new URLSearchParams(location.search).has('nohero');
const STILL_PHONE = { w: 800, h: 1440 };    // phones: the middle 800 px of the same bake, same scale (assets/wall-phone.webp)
// phones: more ivy and more fireflies, all of the ivy within a few px of the margins (lab/MOBILE.md, second phone pass)
const PHONE_FLIES = 62000;   // px² of band per firefly (desktop 110000): 6 to a 1000 px band at 375 px
const PHONE_GRIDS = '.archive-card-grid, .archive-media-grid, .archive-lineup-grid, .archive-artist-grid, .archive-appearances';
const HERO_TONE = 0.8;       // the strands hung over the phone hero's plate, toned to the plate's own lit ivy
let over = null, overIn = null;   // phones: the layer over the hero's plate (under the vignette and grain) those strands hang in
// ?vines: log every strand created, removed or (re)started, and every rebuild with its reason, to __world.log
const TRACE = new URLSearchParams(location.search).has('vines'), traceLog = [];
const trace = TRACE ? (type, info = {}) => { const e = { t: Math.round(performance.now()), type, ...info }; traceLog.push(e); console.log('[vines]', type, info); } : () => {};

const rng = (seed) => () => {
  seed |= 0; seed = seed + 0x6D2B79F5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
const seedOf = (text) => [...text].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);
const hash = (x) => { const s = Math.sin(x * 127.1) * 43758.5453; return s - Math.floor(s); };
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ease = (x) => 1 - (1 - clamp01(x)) ** 3;
const rgb = (c, k = 1) => c.map((v) => Math.round(Math.min(1, v * k) * 255)).join(',');
const asset = (path) => new URL(path, import.meta.url).href;
const load = (src) => new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = src; });
const el = (tag, className, parent) => { const e = document.createElement(tag); e.className = className; e.setAttribute('aria-hidden', 'true'); parent?.append(e); return e; };
// the page's own elements only (a page transition holds the page being left on screen for a moment, outside #app)
const inApp = (sel) => document.getElementById('app').querySelectorAll(sel);
const pageRect = (e) => { const r = e.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; };

const [atlas, atlasMeta] = await Promise.all([
  load(asset(phoneMq.matches ? './assets/leaf-atlas-phone.webp' : '../hero-3d/assets/leaf-atlas.webp')),
  fetch(asset('../hero-3d/assets/leaf-atlas.json')).then((r) => r.json()),
]);

const albedo = el('div', 'world-albedo');
const light = el('div', 'world-light'), lightFade = el('div', 'world-light__fade', light);
const vignette = el('div', 'world-vignette');
const veil = el('div', 'world-veil');
const bodies = el('div', 'world-bodies');
const grain = el('div', 'world-grain');
document.body.prepend(albedo, light, vignette, veil, bodies, grain);
// one light: the same soft radial falloff everywhere, as an element in the light layer
const LIGHT_STOPS = (c, i) => FALLOFF.map(([d, v]) => `rgb(${rgb(c, i * v)}) ${d * 100}%`).join(', ');
function lightEl(c, i) { const e = el('i', 'world-lamp', light); e.style.backgroundImage = `radial-gradient(closest-side, ${LIGHT_STOPS(c, i)})`; return e; }
function placeLight(e, l) { Object.assign(e.style, { left: `${l.x - l.rx}px`, top: `${l.y - l.ry - geo.top}px`, width: `${l.rx * 2}px`, height: `${l.ry * 2}px` }); }
{
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), img = g.createImageData(256, 256), R = rng(9);
  for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (R() - 0.5) * 230; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  grain.style.backgroundImage = `url(${c.toDataURL()})`;
}

// ------------------------------------------------------------------ ivy sprites: the hero's leaf albedo, baked once
// (desaturated towards grey and tinted like LEAF_FRAG: mix(lum, rgb, .62) * (.72, .92, .62)), three tones per leaf as
// the hero varies each leaf by .6-1.2 (darker overall than the atlas: matched to the hero's leaves at the seam)
const sprites = IVY_CELLS.map(([cell]) => {
  const m = atlasMeta[cell], W = atlas.naturalWidth, H = atlas.naturalHeight;
  const sx = m.u0 * W, sy = (1 - m.v1) * H, sw = (m.u1 - m.u0) * W, sh = (m.v1 - m.v0) * H;
  const tones = [0.6, 0.78, 0.96].map((b) => {
    const c = document.createElement('canvas'); c.height = 160; c.width = Math.round(160 * sw / sh);
    const g = c.getContext('2d');
    g.filter = `saturate(.62) brightness(${b})`; g.drawImage(atlas, sx, sy, sw, sh, 0, 0, c.width, c.height); g.filter = 'none';
    g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgb(184,235,158)'; g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'destination-in'; g.drawImage(atlas, sx, sy, sw, sh, 0, 0, c.width, c.height);
    return c;
  });
  return { tones, aspect: m.aspect };
});
const pickIvy = (R) => {
  let t = R() * IVY_CELLS.reduce((s, c) => s + c[1], 0);
  for (let i = 0; i < IVY_CELLS.length; i++) if ((t -= IVY_CELLS[i][1]) <= 0) return i;
  return 0;
};

// ------------------------------------------------------------------ ivy
// A strand is a polyline in page px, root first. Static strands are drawn once, fully grown; growing ones start bare
// each time the page loads and grow in when they come into view (nothing about them is remembered between visits).
let vines = [];   // fixed to the page, growing, and per band: see buildRoom and addBands
let vineId = 0;
// kind: what sort of strand it is (hanger, climber, divider, carry, edge-hanger, edge-climber), so the page transitions
// know how it hangs (it swings about its root, lib/world/transitions.js); gap and leaf scale its leaves' spacing and size
function makeVine(pts, R, { size = 1, width = [4.2, 1.4], leafFrom = 0, grows = false, right = false, kind = 'strand', gap = 1, leaf = 1 } = {}) {
  pts[0].s = 0;
  for (let i = 1; i < pts.length; i++) pts[i].s = pts[i - 1].s + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  const len = pts[pts.length - 1].s, leaves = [];
  let side = 1;
  for (let s = 10; s < len - 6; s += (9 + R() * 11) * gap) {
    const i = pts.findIndex((p) => p.s >= s), p = pts[i], q = pts[Math.max(0, i - 1)];
    const stem = Math.atan2(p.y - q.y, p.x - q.x);
    side = R() < 0.75 ? -side : side;
    const f = s / len;
    // each leaf on a short stalk, pointing away from the stem and leaning on towards the tip; gravity pulls the
    // whole thing down a little, more on the lower side. Smaller towards the growing tip, some turned (narrower).
    let a = stem + side * (Math.PI / 2) * (0.35 + 0.6 * R()) - side * 0.25;
    a += (Math.PI / 2 - a) * (side > 0 ? 0.3 : 0.12) * R();
    const stalk = 4 + R() * 9, h = (36 + R() * 26) * size * leaf * (1 - 0.32 * f);
    const sp = sprites[pickIvy(R)];
    const w = h * sp.aspect * (0.62 + 0.38 * R()) * (R() < 0.5 ? -1 : 1), img = sp.tones[Math.floor(R() * 3)];
    if (s >= leafFrom) leaves.push({ s, x: p.x, y: p.y, a, stalk, h, w, img });
  }
  // its own canvas on the wall, just big enough for the stem and its leaves
  const pad = 80 * size, xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const box = { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad };
  box.w = Math.max(...xs) + pad - box.x; box.h = Math.max(...ys) + pad - box.y;
  const canvas = el('canvas', 'world-vine', albedo), dpr = Math.min(devicePixelRatio, 2);
  Object.assign(canvas.style, { width: `${box.w}px`, height: `${box.h}px` });
  canvas.width = Math.round(box.w * dpr); canvas.height = Math.round(box.h * dpr);
  const v = { id: ++vineId, kind, pts, len, leaves, box, canvas, g: canvas.getContext('2d'), dpr, width, grows, right, dy: 0, grow: null, drawn: -1 };
  canvas.dataset.vine = v.id;   // grow: the clock when it started (null: not yet)
  placeVine(v);
  trace('vine:create', { grows, x: Math.round(pts[0].x), y: Math.round(pts[0].y), stack: TRACE ? new Error().stack.split('\n').slice(2, 5).join(' < ') : '' });
  if (!grows) drawVine(v, 1);
  return v;
}
// While a strand grows, only the stretch that changed since the last frame is cleared and redrawn (the new stem, the
// leaves still unfurling, and their shadows), clipped to whole device pixels so the result is exactly the full redraw;
// the rest of the canvas is left alone. Starting over (or going back) redraws the whole strand.
const LEAF_UNFURL = 46;
function dirtyRect(v, from, reach) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (x, y, r) => { x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r); };
  for (let i = 1; i < v.pts.length && v.pts[i - 1].s <= reach; i++) if (v.pts[i].s > from) { add(v.pts[i - 1].x, v.pts[i - 1].y, v.width[0]); add(v.pts[i].x, v.pts[i].y, v.width[0]); }
  for (const L of v.leaves) { if (L.s > reach) break; if (L.s > from - LEAF_UNFURL) add(L.x, L.y, L.stalk + Math.hypot(L.h, L.w)); }
  if (x0 > x1) return null;
  // the shadow: offset (5, 9) and blurred 7 px, so it reaches ~11 px past the offset shape
  const { dpr, box } = v, f = (x) => Math.floor(x), c = (x) => Math.ceil(x);
  const r = { x0: f((x0 - 12 - box.x) * dpr), y0: f((y0 - 12 - box.y) * dpr), x1: c((x1 + 18 - box.x) * dpr), y1: c((y1 + 22 - box.y) * dpr) };
  return { x: r.x0 / dpr + box.x, y: r.y0 / dpr + box.y, w: (r.x1 - r.x0) / dpr, h: (r.y1 - r.y0) / dpr };
}
const overlaps = (r, x, y, d) => x + d > r.x && x - d < r.x + r.w && y + d > r.y && y - d < r.y + r.h;
function drawVine(v, p) {
  if (p === v.drawn) return;
  const { g, dpr, box } = v, reach = v.len * p;
  const clip = v.drawn >= 0 && p > v.drawn ? dirtyRect(v, v.len * v.drawn, reach) : null;
  v.drawn = p;
  // wall-gl hook: what changed on this canvas since wall-gl.js last uploaded it (device px; 'all' for a full redraw)
  v.glDirty = !clip || v.glDirty === 'all' ? 'all' : ((r, d) => (d ? { x0: Math.min(d.x0, r.x0), y0: Math.min(d.y0, r.y0), x1: Math.max(d.x1, r.x1), y1: Math.max(d.y1, r.y1) } : r))({ x0: Math.floor((clip.x - box.x) * dpr), y0: Math.floor((clip.y - box.y) * dpr), x1: Math.ceil((clip.x + clip.w - box.x) * dpr), y1: Math.ceil((clip.y + clip.h - box.y) * dpr) }, v.glDirty);
  g.setTransform(dpr, 0, 0, dpr, -box.x * dpr, -box.y * dpr);
  if (clip) { g.save(); g.beginPath(); g.rect(clip.x, clip.y, clip.w, clip.h); g.clip(); g.clearRect(clip.x, clip.y, clip.w, clip.h); }
  else g.clearRect(box.x, box.y, box.w, box.h);
  g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 7 * dpr; g.shadowOffsetX = 5 * dpr; g.shadowOffsetY = 9 * dpr;   // light from above, as in the hero
  // woody stem, thick at the root, tapering to the growing tip
  g.lineCap = 'round';
  for (let i = 1; i < v.pts.length && v.pts[i].s <= reach; i++) {
    const a = v.pts[i - 1], b = v.pts[i], f = b.s / v.len;
    if (clip && !overlaps(clip, (a.x + b.x) / 2, (a.y + b.y) / 2, 30)) continue;
    g.strokeStyle = f < 0.6 ? '#3a3021' : '#36401f';
    g.lineWidth = v.width[0] + (v.width[1] - v.width[0]) * f;
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
  }
  g.strokeStyle = '#33401f'; g.lineWidth = 1.3;
  for (const L of v.leaves) {
    if (L.s > reach) break;
    if (clip && !overlaps(clip, L.x, L.y, L.stalk + Math.hypot(L.h, L.w) + 30)) continue;
    const k = ease((reach - L.s) / LEAF_UNFURL);   // unfurls once the stem has passed
    g.save();
    g.translate(L.x, L.y); g.rotate(L.a); g.scale(k, k);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(L.stalk, 0); g.stroke();
    g.translate(L.stalk - 2, 0); g.rotate(Math.PI / 2);   // the sprite's base is its bottom edge, tip up
    g.scale(Math.sign(L.w), 1);
    g.drawImage(L.img, -Math.abs(L.w) / 2, -L.h, Math.abs(L.w), L.h);
    g.restore();
  }
  if (clip) g.restore();
}
// strand shapes, all in page px, root first
function divider(y, fromRight, R) {   // along a section edge, in from one side of the page
  const reach = Math.min(geo.vw * (0.62 + 0.14 * R()), 1100), pts = [], ph = R() * 6;
  for (let d = -30; d <= reach; d += 6) {
    const x = fromRight ? geo.vw - d : d;
    pts.push({ x, y: y + Math.sin(d * 0.011 + ph) * 7 + Math.sin(d * 0.037) * 2.5 + (hash(Math.floor(d / 90) + ph) - 0.5) * 3 });
  }
  return pts;
}
function climber(x0, y0, len, R) {   // up a page edge from y0, hugging it
  const pts = [], ph = R() * 6, sign = x0 < geo.vw / 2 ? 1 : -1;
  for (let d = 0; d <= len; d += 6) pts.push({ x: x0 + sign * (Math.sin(d * 0.013 + ph) * 12 + Math.sin(d * 0.041 + ph) * 4), y: y0 - d });
  return pts;
}
function hanger(x0, y0, len, R, { curlK = 1, wave = 6, bias = 0 } = {}) {   // down from the top of the page, swinging slightly out
  const pts = [], ph = R() * 6, curl = (R() - 0.5 + bias) * 0.0005 * curlK;
  for (let d = 0; d <= len; d += 6) pts.push({ x: x0 + Math.sin(d * 0.02 + ph) * wave + d * d * curl, y: y0 + d });
  return pts;
}
function carryOn(nodes, R) {   // the live wall's ivy, from where its fade begins, a little way on down the baked wall
  // strands near the page edges run on further; the ones crossing the middle stop soon after the seam, clear of the text
  const x = nodes[nodes.length - 1].x, edge = x < geo.vw * 0.2 || x > geo.vw * 0.8;
  const end = geo.liveEnd + (edge ? 160 + R() * 260 : 30 + R() * 110);
  const pts = nodes.filter((n) => n.y > geo.liveEnd - 360 && n.y < end).map((n) => ({ x: n.x, y: n.y }));
  return pts.length > 1 ? pts : null;
}

// ------------------------------------------------------------------ page model
// The room belongs to the page and the screen width, not to the content: what is in it is laid out in fixed bands
// down the page, each from its own seed, so content changing length (the gallery's filters) only adds bands at the end
// (ones past the end are simply cut off by the room's edge) and everything else stays exactly where it was.
// It is built once per visit, for the width it was built at: the content moving or changing length (the header
// condensing on scroll, images and fonts arriving, the filters) never rebuilds it, and neither does a small resize,
// which only carries the right-hand strands with the right edge. Only a new route, a real change of width (over 15%)
// or the live hero laying its ivy out afresh (home) builds it again.
const BAND = 1000;
const bandRng = (route, k, salt) => rng(seedOf(route) + k * 7919 + salt);
// vw is the width the room was built at; dx and sx carry it to the width as it is now (see placeVine, placePool)
const geo = { on: false, top: 0, bottom: 0, vw: 0, dx: 0, sx: 1 };
let room = null, pools = [], roomPools = [], bandList = [], slabs = new Map(), prints = [];
let growing = [], fixedVines = [];
// the live wall's ivy as the hero last laid it out (home), as far as the carried-on strands depend on it. The hero
// publishes it only when it lays itself out (not when the content moves), with a new object each time.
const ivySig = (ivy) => (geo.live && ivy ? ivy.strands.map((s) => [s[0], s[s.length - 1]].map((n) => `${Math.round(n.x)},${Math.round(n.y)}`).join(';')).join('|') : '');
function measure() {
  const app = document.getElementById('app'), route = document.documentElement.dataset.route || 'index';
  // phones included: the home page renders its own phone view (.mobile-view) there, every other page is the same markup
  geo.phone = phoneMq.matches;
  // (#app empty for a moment, as while a page transition lifts the old page out before the next is rendered: the world
  // keeps its state rather than switching itself off and back on)
  if (!NOWORLD && !app.firstElementChild) return false;
  geo.on = !NOWORLD;
  document.documentElement.classList.toggle('has-world', geo.on);
  if (!geo.on) return false;
  // the live wall: the desktop WebGL hero (it runs on to the end of the preview panel) or, on phones, the hero's baked
  // plate (lab/mobile/mobile-hero.js), which ends where it ends
  // (looked up inside #app only: during a page transition the page being left is still in the document as a held copy)
  const plate = geo.phone ? document.querySelector('body > .home-opening__plate') : null;   // the plate hangs in <body>, beside the world's layers, not in #app
  // (home rendered again by a page transition: the hero puts its canvas back a moment later, so a home with the hero in
  // this document counts as live from the start, rather than being built twice)
  const heroBack = route === 'index' && !geo.phone && window.__siteHero && !NOHERO && document.querySelector('#app .home-opening .home-hero');
  const live = route === 'index' && (plate || inApp('.home-opening.has-3d')[0] || heroBack), panel = inApp('.desktop-view .preview-panel')[0];
  const footer = inApp('.site-footer')[0];
  geo.route = route;
  geo.live = !!live;
  geo.liveEnd = plate ? pageRect(plate).y + plate.offsetHeight : panel ? pageRect(panel).y + panel.offsetHeight : 0;
  geo.plate = !!plate;
  geo.bottom = footer ? pageRect(footer).y : document.documentElement.scrollHeight;
  // what the room is built for (see buildRoom); otherwise it stays where it was built, top included: on the home page
  // the live wall does not move when the content does (the header condensing), so neither does the baked wall it
  // hands over to, nor the hero's ivy carried on down it
  const vw = document.documentElement.clientWidth, ivy = ivySig(window.__heroIvy);
  const rebuild = !room || room.route !== route || room.live !== geo.live || room.ivy !== ivy || Math.abs(innerWidth - room.w) > room.w * 0.15;
  geo.top = rebuild ? (route === 'index' ? geo.liveEnd - (live ? OVERLAP : 0) : 0) : room.top;

  // the wall: copies of the still down the page, every other one mirrored so there is no seam
  const h = geo.bottom - geo.top;
  Object.assign(albedo.style, { top: `${geo.top}px`, height: `${h}px` });
  // the room's fill, as at the seam and thinning out down the page (home), or the darker pages' own
  Object.assign(light.style, { top: `${geo.top}px`, height: `${h}px`, background: geo.live
    ? `linear-gradient(rgb(${rgb(geo.plate ? AMBIENT_PLATE : AMBIENT)}) ${geo.liveEnd - geo.top}px, rgb(${rgb(AMBIENT_FAR)}) ${geo.liveEnd + FAR - geo.top}px)`
    : `rgb(${rgb(pageFill())})` });
  Object.assign(bodies.style, { top: `${geo.top}px`, height: `${h}px` });
  // the haze: as at the seam, thinning out down the page, gone into the dark above the footer
  const near = geo.live ? geo.liveEnd - geo.top : 0, far = geo.live ? VEIL_FAR : pageVeil();
  Object.assign(veil.style, { top: `${geo.top}px`, height: `${h}px`, background: `linear-gradient(${geo.plate ? '#000 0px, ' : ''}rgb(${rgb(geo.live ? (geo.plate ? VEIL_PLATE : VEIL) : far)}) ${near}px, rgb(${rgb(far)}) ${near + (geo.live ? FAR : 0)}px, rgb(${rgb(far)}) ${h - 340}px, #000 ${h}px)` });
  geo.h = h;
  if (over) { over.style.height = `${geo.top + 600}px`; overIn.style.top = `${geo.top}px`; }   // phones: the strands over the plate share the wall's coordinates
  placeWall();

  if (rebuild) {
    trace('room:rebuild', { from: room && `${room.route}|${room.w}|${room.live}|${room.ivy.length}`, to: `${route}|${innerWidth}|${geo.live}|${ivy.length}` });
    buildRoom(route, vw, ivy);
  }
  // its right-hand side keeps to the right edge
  geo.dx = vw - room.vw; geo.sx = vw / room.vw;
  addBands(Math.ceil((geo.bottom - geo.top) / BAND));
  followEdges(route);
  for (const v of vines) placeVine(v);
  for (const p of pools) placePool(p);

  // slabs: the lights people press
  const found = new Set(inApp(SLABS));
  for (const [e, s] of slabs) if (!found.has(e)) { s.el.remove(); slabs.delete(e); }
  for (const e of found) if (!slabs.has(e)) bindSlab(e);
  for (const [e, s] of slabs) { s.r = pageRect(e); s.l = { x: s.r.x + s.r.w / 2, y: s.r.y + s.r.h / 2, rx: 230 + s.r.w * 0.35, ry: 150 }; placeLight(s.el, s.l); }

  // prints take the steady light where they hang (the fixtures and the slabs at rest), worked out once here
  const steady = [...pools.filter((p) => p.on).map((p) => ({ ...p, x: p.px, y: p.py })), ...[...slabs.values()].map((s) => ({ ...s.l, c: SIGN, i: 1.25 * IDLE }))];
  prints = [...inApp(PRINTS)].map((img) => {
    const r = pageRect(img), lit = (0.8 + 0.32 * Math.min(1, lightAt(steady, r.x + r.w / 2, r.y + r.h * 0.3))).toFixed(2);
    if (img.style.getPropertyValue('--lit') !== lit) img.style.setProperty('--lit', lit);
    return { img, mount: img.closest(MOUNTS) || img.parentElement, r, rim: -1 };
  });
  // a new room: say so (page transitions restore what the page had grown here)
  if (rebuild) document.dispatchEvent(new CustomEvent('world:room', { detail: { route } }));
  return rebuild;
}

// The wall: copies of the wide still (assets/wall-tile.webp, 5120 px, horizontally tileable, so it simply repeats across)
// placed as wall.webp was: its stretch from x0 is the original 2560 px still, centred on the page. Down the page every
// other copy is mirrored, so there is no seam. The camera (setCamera) is where the page hangs on the one continuous wall:
// x, y in CSS px of wall, (0, 0) the starting position (the original still centred, its top at the room's top). Only
// what the room's box shows is placed.
const WALL = { src: asset('./assets/wall-tile.webp'), w: 5120, x0: 1536 };   // x0: where wall.webp's left edge sits in it
const camera = { x: 0, y: 0 }, wallTiles = [];
let wallKey = '';
const phoneTiles = [];
let phoneKey = '';
function placePhoneWall() {
  const vw = document.documentElement.clientWidth, h = geo.h || 0, S = STILL_PHONE, H2 = S.h * 2;
  const Y = ((camera.y % H2) + H2) % H2, c0 = (vw - S.w) / 2, key = `${vw}|${h}|${Y}`;
  if (key === phoneKey) return;
  phoneKey = key; wallKey = '';
  for (const t of wallTiles) t.style.display = 'none';
  let k = 0;
  for (let j = Math.floor(Y / S.h); j * S.h < h + Y; j++, k++) {
    let t = phoneTiles[k];
    if (!t) {
      t = phoneTiles[k] = el('div', 'world-albedo__tile', albedo);
      albedo.prepend(t);   // under the ivy
      Object.assign(t.style, { left: 0, top: 0, right: 'auto', width: `${S.w}px`, height: `${S.h}px`, backgroundImage: `url(${asset('./assets/wall-phone.webp')})`, backgroundSize: `${S.w}px ${S.h}px`, backgroundPosition: '0 0', backgroundRepeat: 'no-repeat' });
    }
    t.style.display = '';
    t.style.transform = `translate3d(${c0}px, ${j * S.h - Y}px, 0) scale(1, ${j & 1 ? -1 : 1})`;
  }
  for (; k < phoneTiles.length; k++) phoneTiles[k].style.display = 'none';
}
function placeWall() {
  if (geo.phone) return placePhoneWall();
  if (phoneKey) { phoneKey = ''; for (const t of phoneTiles) t.style.display = 'none'; }
  const vw = document.documentElement.clientWidth, h = geo.h || 0, H2 = STILL.h * 2;
  const X = ((camera.x % WALL.w) + WALL.w) % WALL.w, Y = ((camera.y % H2) + H2) % H2, c0 = (vw - STILL.w) / 2 - WALL.x0;
  const key = `${vw}|${h}|${X}|${Y}`;
  if (key === wallKey) return;
  wallKey = key;
  let k = 0;
  for (let j = Math.floor(Y / STILL.h); j * STILL.h < h + Y; j++) {
    for (let i = Math.floor((X - c0) / WALL.w); i * WALL.w < vw - c0 + X; i++, k++) {
      let t = wallTiles[k];
      if (!t) {
        t = wallTiles[k] = el('div', 'world-albedo__tile', albedo);
        albedo.prepend(t);   // under the ivy
        Object.assign(t.style, { left: 0, top: 0, right: 'auto', width: `${WALL.w}px`, backgroundImage: `url(${WALL.src})`, backgroundSize: `${WALL.w}px ${STILL.h}px`, backgroundPosition: '0 0', backgroundRepeat: 'no-repeat' });
      }
      t.style.display = '';
      t.style.transform = `translate3d(${i * WALL.w + c0 - X}px, ${j * STILL.h - Y}px, 0) scale(1, ${j & 1 ? -1 : 1})`;
    }
  }
  for (; k < wallTiles.length; k++) wallTiles[k].style.display = 'none';
}
function setCamera(x, y) { camera.x = x; camera.y = y; placeWall(); placeEdges(); lastScroll = scrollY; scrollV = 0; }   // a camera move is not a scroll: nothing is startled

// growing strands: how far each has grown (0-1; -1 not started), on the world clock, and setting it back exactly
const growthOf = (v) => (v.grow === null ? -1 : still ? 1 : ease((clock - v.grow) / 3.2));
function growth() { return growing.map(growthOf); }
function setGrowth(progress = []) {
  growing.forEach((v, i) => {
    const p = progress[i] ?? -1;
    // ease(x) = 1 - (1 - x)^3, so x = 1 - (1 - p)^(1/3); fully grown is set a little past the end
    v.grow = p < 0 ? null : clock - (p >= 1 ? 4 : 1 - Math.cbrt(1 - p)) * 3.2;
    drawVine(v, Math.max(0, p));
    trace('vine:set', { y: Math.round(v.edgeY), p: +p.toFixed(3) });
  });
}

function edgeCandidates(route) {
  return route === 'index'
    ? [...inApp(':is(.desktop-view, .mobile-view) :is(.about-section, .archive-section, .mobile-home-section)')].map((e) => ({ e, y: pageRect(e).y, top: true }))
      .filter((c) => c.y > geo.liveEnd)
    : [...inApp('.archive-filters, .archive-section, .archive-pager')].map((e) => {
      const r = pageRect(e), filters = e.matches('.archive-filters');
      return { e, y: filters ? r.y + r.h : r.y, top: !filters };
    }).sort((a, b) => a.y - b.y);
}
// A growing strand keeps to its section edge as the content above it moves (the header condensing as the page
// scrolls, an image or a font arriving), and replaces the hairline there. If its edge goes (the gallery re-renders its
// results when filtered), the strand stays where it is on the wall and takes the edge again once a new one is back
// within EDGE_HOLD of it; meanwhile the hairline shows.
const EDGE_HOLD = 60;
function followEdges(route) {
  if (!growing.length) return;
  const found = edgeCandidates(route);
  for (const v of growing) {
    const c = found.find((c) => c.e === v.edgeEl) || found.filter((c) => Math.abs(c.y - v.edgeY) < EDGE_HOLD)
      .sort((a, b) => Math.abs(a.y - v.edgeY) - Math.abs(b.y - v.edgeY))[0];
    if ((c?.e ?? null) !== v.edgeEl || (c && c.top !== v.edgeTop)) {
      trace('vine:edge', { from: v.edgeEl && v.edgeEl.className, to: c && c.e.className, y: c && Math.round(c.y) });
      v.edgeEl?.classList.remove('world-vine-edge', 'is-top', 'is-bottom');
      c?.e.classList.remove('is-top', 'is-bottom');
      c?.e.classList.add('world-vine-edge', c.top ? 'is-top' : 'is-bottom');
      v.edgeEl = c?.e ?? null; v.edgeTop = c?.top;
    }
    if (c) { v.edgeY = c.y; v.dy = c.y - v.edge0; }
  }
}
// where everything built for the room sits on the page now: strands on the right keep to the right edge, the
// fixtures and fireflies spread with the width, and a growing strand keeps to its edge. Only changes are written.
function placeVine(v) {
  const left = v.box.x + (v.right ? geo.dx : 0), top = v.box.y + (v.grows ? v.dy : 0) - geo.top;
  if (left === v.left && top === v.top) return;
  v.left = left; v.top = top;
  Object.assign(v.canvas.style, { left: `${left}px`, top: `${top}px` });
}
function placePool(p) {
  p.px = p.x * geo.sx; p.py = p.y;
  const on = p.room || p.py < geo.bottom - 200, key = `${p.px},${p.py - geo.top},${on}`;
  if (key === p.key) return;
  p.key = key; p.on = on;
  placeLight(p.el, { x: p.px, y: p.py, rx: p.rx, ry: p.ry });
  p.el.style.display = on ? '' : 'none';
}
function addPool(p, isRoom) {
  const q = { ...p, el: lightEl(p.c, p.i), room: isRoom, key: '' };
  pools.push(q); placePool(q);
  return q;
}

// ------------------------------------------------------------------ one long wall
// The pages hang side by side along one wall, in the site's order (lab/TRANSITIONS.md): home, Next Event, Past Events,
// the events oldest to newest, the collaborations, Artists and the artists A to Z, Gallery.
const ORDER = (() => {
  const c = window.INSTINCT_CONTENT, A = c && window.INSTINCT_ARCHIVE?.create(c);
  if (!A) return new Map();
  const events = [...A.events].sort((x, y) => x.date.localeCompare(y.date)).map((e) => e.id);
  const artists = Object.values(c.artists).sort((x, y) => x.name.localeCompare(y.name)).map((x) => x.id);
  return new Map(['index', 'next-event', 'past-events', ...events, ...Object.keys(c.collaborations || {}), 'artists', ...artists, 'gallery'].map((id, i) => [id, i]));
})();
// Each page grows its own kind of ivy from the top: five families, taken in turn along the wall, so no two neighbours
// share a silhouette, and each drawn from the page's own seed. All of it keeps to the corners above the heading and
// the very edges of the page, clear of the text.
const FAMILIES = ['twin', 'left-curtain', 'right-curtain', 'long-creeper', 'tuft'];
const familyOf = (route) => FAMILIES[(ORDER.get(route) ?? seedOf(route) >>> 0) % FAMILIES.length];
function pageStrands(route, R) {
  const vw = geo.vw, fam = familyOf(route), out = [];
  // (round 6: every family a quarter longer and a little leafier)
  const add = (x, len, R, opts = {}, shape = {}) => out.push({ pts: hanger(x, 30, len * 1.5, R, shape), opts: { size: 0.85, right: x > vw / 2, ...opts, gap: (opts.gap ?? 1) * 0.75 } });
  if (fam === 'twin') {   // a hanger in each top corner, as the pages have had
    add(vw * (0.04 + 0.05 * R()), 180 + R() * 160, R);
    add(vw * (0.9 + 0.05 * R()), 240 + R() * 200, R);
  } else if (fam === 'left-curtain' || fam === 'right-curtain') {   // three strands of different lengths in one corner
    const left = fam === 'left-curtain';
    for (let i = 0; i < 3; i++) {
      const x = left ? vw * (0.015 + 0.045 * i + 0.02 * R()) : vw * (0.985 - 0.045 * i - 0.02 * R());
      add(x, [320, 150, 230][i] + R() * 140, R, { size: 0.68 + 0.14 * R(), gap: 0.8, width: [2.6, 1] }, { curlK: 1.6, bias: left ? -0.25 : 0.25 });
    }
    // and a short sprig in the other corner, so it is not bare
    add(left ? vw * (0.955 + 0.02 * R()) : vw * (0.025 + 0.02 * R()), 70 + R() * 50, R, { size: 0.6, gap: 0.7 });
  } else if (fam === 'long-creeper') {   // one long strand down the very edge, big sparse leaves; a sprig opposite
    const left = R() < 0.5;
    add(left ? 10 + R() * 8 : vw - 10 - R() * 8, 560 + R() * 260, R, { size: 0.95, gap: 1.5, leaf: 1.15, width: [3.4, 1.3] }, { curlK: 0.25, wave: 7, bias: left ? -0.5 : 0.5 });   // drifting out, never in
    add(left ? vw * (0.93 + 0.03 * R()) : vw * (0.04 + 0.03 * R()), 90 + R() * 70, R, { size: 0.7 });
  } else {   // tuft: a short, dense, heavy cluster in one corner, nothing in the other
    const left = R() < 0.5;
    for (let i = 0; i < 2; i++) add(left ? vw * (0.03 + 0.03 * i + 0.01 * R()) : vw * (0.97 - 0.03 * i - 0.01 * R()), 110 + R() * 90, R, { size: 0.9, gap: 0.55, leaf: 1.1, width: [3.2, 1.3] }, { curlK: 2.2, wave: 4 });
  }
  return out;
}
// Where a page meets its neighbours: strands that cross the edge between the two, and a firefly or two about it. They
// belong to the wall, not to either page: seeded by where that edge is on the wall (its column) and how far down, they
// come out the same from both sides, so one cut off at a page's edge is seen whole as the camera pans past it. Kept
// within a few px of the page edge (the margins), and only on the pages (home has the hero's own).
const EDGE_BAND = 1000;
let edgeKey = '', edgeVines = [], edgeFlies = [];
function edgeItems(k) {
  const { vw } = room, col = Math.round(camera.x / vw), Y = camera.y, y0 = k * BAND, y1 = y0 + BAND;
  for (const [b, side] of [[col, 'left'], [col + 1, 'right']]) {
    const ox = side === 'right' ? vw : 0;
    for (let s = Math.floor((Y + y0) / EDGE_BAND) - 1; s <= Math.floor((Y + y1) / EDGE_BAND) + 1; s++) {
      const R = rng(Math.imul(b + 1013, 7919) ^ Math.imul(s + 4099, 104729) ^ 0x5bd1e995);
      const ay = s * EDGE_BAND + EDGE_BAND * (0.08 + 0.84 * R()) - Y, kind = R(), make = R() < 0.62;
      // its root is in another band of this page (the first band also takes those rooted above the page's top, which
      // hang down into it). Whether it exists depends on the wall alone, never on this page's own top or length: else a
      // strand seen on one page could be missing on its neighbour, and vanish as the camera crossed the seam.
      if (ay >= y1 || ay < (k === 0 ? -700 : y0)) continue;
      const ok = make;
      if (ok) {
        let pts;
        if (kind < 0.55) {   // hanging across the edge: down from a root just one side of it, drifting over
          const bx = (R() - 0.5) * 50, len = 160 + R() * 260, ph = R() * 6, lean = (R() - 0.5) * 0.12;
          pts = []; for (let d = 0; d <= len; d += 6) pts.push({ x: ox + bx + Math.sin(d * 0.018 + ph) * 16 + d * lean, y: ay + d });
        } else {   // climbing across it: up from one side to the other
          const from = (R() < 0.5 ? -1 : 1) * (14 + R() * 18), len = 260 + R() * 320, ph = R() * 6;
          pts = []; for (let d = 0; d <= len; d += 6) pts.push({ x: ox + from * (1 - 2 * d / len) + Math.sin(d * 0.03 + ph) * 5, y: ay - d });
        }
        const v = makeVine(pts, R, { size: 0.7 + 0.15 * R(), width: [3, 1.1], right: side === 'right', kind: kind < 0.55 ? 'edge-hanger' : 'edge-climber', gap: 0.8 + 0.6 * R() });
        v.edge = true; edgeVines.push(v); vines.push(v);
      }
      // a firefly about the edge, as often as not
      const F = rng(Math.imul(b + 77, 6151) ^ Math.imul(s + 31, 3571));
      if (F() < 0.7) {
        const fy = s * EDGE_BAND + EDGE_BAND * F() - Y;
        if (fy >= y0 && fy < y1 && fy > 80) { addFly(F() < 0.3 ? 'orb' : 'blink', { x: ox + (F() - 0.5) * 180, y: fy }, [30 + F() * 50, 25 + F() * 40], F); edgeFlies.push(flies[flies.length - 1]); }
      }
    }
  }
}
// the camera moved after the page was built (a page transition settling its scroll): the edges are another stretch of wall
function placeEdges() {
  if (!room || room.route === 'index' || geo.phone) return;
  const key = `${Math.round(camera.x / room.vw)}|${Math.round(camera.y)}`;
  if (key === edgeKey) return;
  const first = !edgeKey;
  edgeKey = key;
  if (first) return;
  for (const v of edgeVines) { trace('vine:remove', { grows: false, y: Math.round(v.pts[0].y), edge: true }); v.canvas.remove(); }
  for (const f of edgeFlies) { f.el.remove(); f.light.remove(); }
  vines = vines.filter((v) => !v.edge); flies = flies.filter((f) => !edgeFlies.includes(f));
  edgeVines = []; edgeFlies = [];
  for (const b of bandList) edgeItems(b.k);
  trace('edge:rebuild', { key });
}

// Fixed to the page: the light over its heading (and over any big photo or poster at its top), the strands hanging
// from the top, the live wall's ivy carried on, and the one or two strands that grow: the first along the first
// section edge below the heading, one further down. Where they grow is decided here, once per visit; one that has
// grown stays grown, even through a rebuild.
// ------------------------------------------------------------------ phones: more ivy, all of it in the margins
// Each strand here draws from its own stream (nothing else on the page moves), roots within a few px of an edge and
// drifts out, never in, with smaller leaves than on desktop, so the text column stays clear.
const edgeX = (left, R, a = 2, b = 7) => (left ? a + R() * b : geo.vw - a - R() * b);
function phoneHang(x, y, len, R, opts = {}) {
  const left = x < geo.vw / 2, pts = hanger(x, y, len, R, { curlK: 0.3, wave: 4, bias: left ? -0.5 : 0.5 });
  return makeVine(pts, R, { size: 0.5 + 0.1 * R(), width: [2.6, 1], right: !left, kind: 'hanger', gap: 0.75 + 0.4 * R(), ...opts });
}
// the top of a page: a cluster in each corner (a long strand and a shorter one, now and then a sprig)
function phoneTop(route) {
  const R = rng(seedOf(route) ^ 0x51ed27), out = [];
  for (const left of [true, false]) {
    out.push(phoneHang(edgeX(left, R, 2, 5), 30, 220 + R() * 170, R));
    out.push(phoneHang(edgeX(left, R, 9, 5), 30, 90 + R() * 130, R));
    if (R() < 0.6) out.push(phoneHang(edgeX(left, R, 16, 4), 30, 45 + R() * 35, R, { size: 0.5 }));
  }
  return out;
}
// beside the photo and card grids: a climber up one margin from the grid's foot, and on a tall grid a strand down the
// other from its head (at most one grid in any 700 px)
function phoneGrids(route) {
  const R = rng(seedOf(route) ^ 0x2f6b1c3), out = [];
  let lastY = -1e9, i = 0;
  for (const g of inApp(PHONE_GRIDS)) {
    const r = pageRect(g);
    if (r.h < 300 || r.y - lastY < 700 || r.y + r.h > geo.bottom - 120 || (geo.live && r.y < geo.liveEnd)) continue;
    lastY = r.y;
    const left = i++ % 2 === 0;
    out.push(makeVine(climber(edgeX(left, R, 2, 5), r.y + r.h - 20, Math.min(r.h * 0.75, 520), R), R, { size: 0.55, width: [3, 1.1], right: !left, kind: 'climber', gap: 0.9 }));
    if (r.h > 900) out.push(phoneHang(edgeX(!left, R), r.y + 10, Math.min(r.h * 0.45, 380), R));
  }
  return out;
}
// down the page: per band, besides its climber, a strand hanging down the other margin, and now and then a sprig
function phoneBand(band, k, y0, page, liveEnd) {
  const H = bandRng(room.route, k, 5), clearTop = page ? 420 : liveEnd + 120, made = [];
  if (H() < 0.75) {
    const left = band.vine ? !!band.vine.right : H() < 0.5, y = y0 + BAND * (0.05 + 0.5 * H());
    if (y > clearTop) made.push(phoneHang(edgeX(left, H), y, 180 + 200 * H(), H));
  }
  if (H() < 0.5) {
    const left = H() < 0.5, y = y0 + BAND * (0.1 + 0.8 * H());
    if (y > clearTop) made.push(phoneHang(edgeX(left, H), y, 70 + 80 * H(), H, { size: 0.52 }));
  }
  band.phone = made;
  vines.push(...made);
}
// the phone hero: strands from the top edge in both corners, ending above the wordmark, and down both sides below it
// to just above the definition; hung over the plate (which hides the wall's own ivy) and toned to its lit ivy
function heroStrands() {
  const P = window.__heroPlate;
  if (!P) return [];
  if (!over) {   // clipped to the page's width (and the plate's height and a little): nothing may widen the page
    over = el('div', 'world-over'); overIn = el('div', 'world-over__in', over);
    Object.assign(over.style, { position: 'absolute', left: 0, right: 0, top: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' });
    Object.assign(overIn.style, { position: 'absolute', left: 0, right: 0, height: 0 });
  }
  if (over.nextElementSibling !== vignette) vignette.before(over);
  over.style.height = `${geo.top + 600}px`; overIn.style.top = `${geo.top}px`;
  const R = rng(seedOf('phone-hero')), out = [], clear = P.y0 - 46;   // tips (and their last leaves) stay above the letters
  // four in each top corner, long to short going in
  for (const left of [true, false]) for (let i = 0; i < 4; i++) {
    const len = clear * [1, 0.6 + 0.35 * R(), 0.35 + 0.45 * R(), 0.25 + 0.25 * R()][i];
    if (len > 50) out.push(phoneHang(edgeX(left, R, 2 + 9 * i, 5), 0, len, R, { size: 0.62 + 0.14 * R() }));
  }
  // a short one either side of the middle, ending well above the welcome line
  for (const left of [true, false]) {
    const len = Math.min(P.y0 - 120, 140 + 90 * R());
    if (len > 50) out.push(phoneHang(geo.vw * (left ? 0.27 + 0.06 * R() : 0.73 - 0.06 * R()), 0, len, R, { size: 0.66 + 0.1 * R(), right: !left }));
  }
  // and two down each side below the letters, to just above the definition
  for (const left of [true, false]) for (let i = 0; i < 2; i++) {
    const y = P.y1 + 50 + 60 * i, len = Math.min(P.defTop - 40 - y, i ? 200 + 120 * R() : 420);
    if (len > 80) out.push(phoneHang(edgeX(left, R, 2 + 9 * i, 4), y, len, R, { size: 0.56 }));
  }
  for (const v of out) {
    v.hero = true; overIn.append(v.canvas);
    // toned once, in the canvas itself (no filter layer to composite every frame): its pixels darkened in place
    const g = v.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop';
    g.fillStyle = `rgba(0,0,0,${1 - HERO_TONE})`; g.fillRect(0, 0, v.canvas.width, v.canvas.height); g.restore();
  }
  return out;
}

function buildRoom(route, vw, ivySignature) {
  const R = rng(seedOf(route)), ivy = window.__heroIvy;
  // a rebuild of the same page keeps what had grown; another page's strands are its own (see setGrowth)
  const grown = room?.route === route ? growing.map((v) => v.grow) : [];
  for (const v of vines) { trace('vine:remove', { grows: v.grows, y: Math.round(v.pts[0].y) }); v.canvas.remove(); }
  for (const p of pools) p.el.remove();
  for (const f of flies) { f.el.remove(); f.light.remove(); }
  for (const v of growing) v.edgeEl?.classList.remove('world-vine-edge', 'is-top', 'is-bottom');
  vines = []; fixedVines = []; growing = []; roomPools = []; pools = []; bandList = []; flies = []; edgeVines = []; edgeFlies = [];
  room = { route, live: geo.live, ivy: ivySignature, w: innerWidth, vw, top: geo.top, liveEnd: geo.liveEnd };
  edgeKey = route === 'index' || geo.phone ? '' : `${Math.round(camera.x / vw)}|${Math.round(camera.y)}`;
  lastScroll = scrollY; scrollV = 0;   // a new room starts still: jumping to its scroll position is not a fling
  Object.assign(geo, { vw, dx: 0, sx: 1 });

  const clearOfSeam = (y, ry) => (geo.live ? Math.max(y, geo.liveEnd + ry * 0.55) : y);
  if (route === 'index') {
    // the home page's content never changes under it, so its fixtures follow its headings
    for (const [node, r] of [...inApp(HEADINGS)].map((e) => [e, pageRect(e)]).sort((a, b) => a[1].y - b[1].y)) {
      if (r.y < geo.top || r.y > geo.bottom || roomPools.some((p) => Math.abs(p.y - r.y) < 420)) continue;
      roomPools.push({ x: r.x + Math.min(r.w, 520) * 0.45, y: clearOfSeam(r.y + 30, 340), rx: geo.phone ? geo.vw * 0.85 : Math.min(820, geo.vw * 0.55), ry: 340, c: OVERHEAD, i: HOME_HEAD });
    }
  } else {
    const head = inApp('.archive-heading')[0];
    if (head) { const r = pageRect(head); roomPools.push({ x: r.x + Math.min(r.w, 520) * 0.45, y: r.y + 30, rx: geo.phone ? geo.vw * 0.85 : Math.min(820, geo.vw * 0.55), ry: 460, c: OVERHEAD, i: PAGE_HEAD }); }
    if (!geo.phone) {
      // the room's own light from above (a skylight's soft wash over the top of the page)
      roomPools.push({ x: geo.vw * 0.5, y: -60, rx: geo.vw * 0.75, ry: 460, c: OVERHEAD, i: 0.42 });
      // a fixture over every section heading down the page, and over the big photos and posters, each where there
      // is not one already (so a long page has light all the way down, every light with a fixture above it)
      const free = (y, d) => !roomPools.some((p) => Math.abs(p.y - y) < d);
      for (const e of inApp(HEADINGS)) {
        const r = pageRect(e);
        if (r.y > geo.bottom - 200 || !free(r.y + 30, 380)) continue;
        roomPools.push({ x: r.x + Math.min(r.w, 520) * 0.45, y: r.y + 30, rx: Math.min(760, geo.vw * 0.55), ry: 400, c: OVERHEAD, i: 0.6 });
      }
      for (const img of inApp('.archive-card-image img, .archive-media-image img, .archive-poster img, .archive-spotlight-poster img, .archive-lineup-image img')) {
        const r = pageRect(img);
        if (r.h < 240 || r.y > geo.bottom - 200 || !free(r.y - 30, 520)) continue;
        roomPools.push({ x: r.x + r.w / 2, y: r.y - 30, rx: Math.max(340, r.w * 0.95), ry: Math.max(320, r.h * 0.85), c: OVERHEAD, i: 0.5 });
      }
    }
  }
  for (const img of inApp('.about-grid figure img, .archive-artist-hero figure img, .archive-announcement-grid .archive-poster')) {
    const r = pageRect(img);
    if (r.h > 200) roomPools.push({ x: r.x + r.w / 2, y: r.y - 40, rx: r.w * 0.95, ry: r.h * 0.9, c: OVERHEAD, i: 0.55 });
  }

  if (geo.live && ivy) for (const nodes of ivy.strands) { const pts = carryOn(nodes, R); if (pts) fixedVines.push(makeVine(pts, R, { size: 0.85, width: [4.6, 1.4], leafFrom: 300, kind: 'carry' })); }
  if (route !== 'index') {
    if (geo.phone) {
      // (phones: tight to the edges and shorter, clear of the heading)
      fixedVines.push(...phoneTop(route));
    } else for (const h of pageStrands(route, R)) fixedVines.push(makeVine(h.pts, R, { width: [3, 1.2], kind: 'hanger', ...h.opts }));
  }

  const candidates = edgeCandidates(route);
  let picks;
  if (route === 'index' || geo.phone) {
    // home (and phones): along the first section edge from the left, and one about 1.6 screens further down from the right
    const first = candidates[0];
    const second = first && candidates.filter((c) => c.y > first.y + Math.max(700, innerHeight * 0.8) && c.y < geo.bottom - 250)
      .sort((a, b) => Math.abs(a.y - first.y - innerHeight * 1.6) - Math.abs(b.y - first.y - innerHeight * 1.6))[0];
    picks = [[first, false, 'divider'], [second, true, 'divider']];
  } else {
    // every other page grows its own: one or two strands, at an edge drawn from the page's own seed (one of its first few
    // section edges, and maybe one a few screens further down), from either side, either along the edge (replacing its
    // hairline) or dropping down the margin from it. Its own random stream, so nothing else on the page moves.
    const G = rng(seedOf(route) ^ 0x2545f491), usable = candidates.filter((c) => c.y < geo.bottom - 250);
    const a = usable[Math.floor(G() * Math.min(4, usable.length))], two = G() < 0.6, far = 1.2 + 2.8 * G(), sideA = G() < 0.5;
    const b = a && two ? usable.filter((c) => c.y > a.y + Math.max(700, innerHeight * 0.8)).sort((p, q) => Math.abs(p.y - a.y - innerHeight * far) - Math.abs(q.y - a.y - innerHeight * far))[0] : null;
    picks = [[a, sideA, G() < 0.65 ? 'divider' : 'drop'], [b, !sideA, G() < 0.55 ? 'divider' : 'drop']];
  }
  picks.forEach(([c, fromRight, shape], i) => {
    if (!c) return;
    const pts = shape === 'drop'   // down the very edge of the margin from the section edge, drifting out, never in
      ? hanger(fromRight ? geo.vw - 12 - 12 * R() : 12 + 12 * R(), c.y + 1, 220 + 200 * R(), R, { curlK: 0.25, wave: 5, bias: fromRight ? 0.5 : -0.5 })
      : divider(c.y + 1, fromRight, R);
    const v = makeVine(pts, R, { grows: true, right: fromRight, kind: shape, size: shape === 'drop' ? 0.85 : 1 });
    Object.assign(v, { edge0: c.y, edgeY: c.y, dy: 0, edgeEl: null });
    if (grown[i] != null) v.grow = grown[i];
    growing.push(v);
    // a fixture over its first stretch, so the new growth is seen
    const xs = v.pts.map((p) => p.x), mid = (Math.min(...xs) + Math.max(...xs)) / 2;
    roomPools.push({ x: fromRight ? Math.max(mid, geo.vw * 0.62) : Math.min(mid, geo.vw * 0.38), y: c.y - 60, rx: geo.phone ? geo.vw * 0.6 : Math.min(640, geo.vw * 0.4), ry: 260, c: OVERHEAD, i: 0.42 });
  });
  if (geo.phone) fixedVines.push(...phoneGrids(route), ...(geo.plate ? heroStrands() : []));
  vines = [...fixedVines, ...growing];
  for (const p of roomPools) addPool(p, true);
  // the moths, which find the slab in view
  const M = rng(seedOf(route) + 3);
  for (let i = 0; i < 3; i++) addFly('moth', null, [50 + M() * 45, 18 + M() * 18], M, { moth: i });
}

// Each band down the page: a fixture overhead (alternating sides), a strand of ivy up one edge, and its fireflies.
// Bands are only ever added, each once, when the page first grows long enough to reach them.
function addBands(count) {
  const { route, vw, top, liveEnd } = room, page = route !== 'index';
  const perBand = Math.round(BAND * vw / (geo.phone ? PHONE_FLIES : 110000) * (page && !geo.phone ? 1.5 : 1));   // (desktop pages: half again as many, round 7)
  for (let k = bandList.length; k < count; k++) {
    const y0 = top + k * BAND, band = { k, vine: null, pool: null };
    const R = bandRng(route, k, 0), F = bandRng(route, k, 1);
    const fy = y0 + BAND * (0.35 + 0.3 * R());
    if (k > 0 && !roomPools.some((p) => Math.abs(p.y - fy) < 450)) {
      band.pool = addPool({ x: vw * ((k + route.length) % 2 ? 0.78 : 0.22) + (R() - 0.5) * 120, y: geo.live ? Math.max(fy, liveEnd + 230) : fy, rx: geo.phone ? vw * 0.75 : Math.min(700, vw * 0.5), ry: 420, c: OVERHEAD, i: page ? PAGE_POOL : HOME_POOL }, false);
    }
    const cy = y0 + BAND * (0.4 + 0.5 * R());
    // each family climbs differently: which side, how often, how long, how leafy (home and phones as before)
    const fam = page && !geo.phone ? FAMILIES.indexOf(familyOf(route)) : -1;
    const chance = [0.85, 0.7, 0.7, 0.55, 0.9][fam] ?? 0.85, lenK = [1, 0.8, 0.8, 1.35, 0.65][fam] ?? 1;
    if (cy > (page ? 700 : liveEnd + 300) && R() < chance) {
      const left = fam === 1 ? k % 3 !== 0 : fam === 2 ? k % 3 === 0 : (k + route.length) % 2 === 0;
      const e = geo.phone ? [1, 4] : [10, 22];   // phones: hugging the edge, smaller leaves, clear of the text column
      band.vine = makeVine(climber(left ? e[0] + R() * e[1] : vw - e[0] - R() * e[1], cy, (380 + R() * 420) * lenK, R), R, { size: geo.phone ? 0.52 : 0.75, width: [3.4, 1.2], right: !left, kind: 'climber', gap: [1, 0.85, 0.85, 1.3, 0.7][fam] ?? 1 });
      vines.push(band.vine);
    }
    // and, on the pages, a strand hanging down the other margin (its own stream: nothing above changes), so a long page
    // keeps its ivy all the way down, not only about its top
    if (page && !geo.phone && k > 0) {
      const Hh = bandRng(route, k, 2);
      if (Hh() < 0.65) {
        const left = band.vine ? !!band.vine.right : Hh() < 0.5, y = y0 + BAND * (0.08 + 0.5 * Hh());
        band.hang = makeVine(hanger(left ? 8 + 14 * Hh() : vw - 8 - 14 * Hh(), y, (160 + 240 * Hh()) * lenK, Hh, { curlK: 0.2, wave: 5, bias: left ? -0.5 : 0.5 }), Hh,
          { size: 0.7 + 0.18 * Hh(), width: [2.8, 1.1], right: !left, kind: 'hanger', gap: 0.75 + 0.5 * Hh() });
        vines.push(band.hang);
      }
    }
    const from = Math.max(y0, geo.live ? liveEnd - 160 : 80), homes = [];
    for (let i = 0; i < perBand; i++) {
      const rand = (a, b) => a + (b - a) * F(), orb = i % 3 === 2;
      homes.push({ kind: orb ? 'orb' : 'blink', home: { x: rand(0.03, 0.97) * vw, y: rand(from, y0 + BAND) }, amp: orb ? [rand(60, 160), rand(30, 80)] : [rand(40, 130), rand(25, 70)] });
    }
    for (const h of homes) addFly(h.kind, h.home, h.amp, F);
    if (page && !geo.phone) { moreInBand(k, y0, band, lenK); edgeItems(k); }
    if (geo.phone) phoneBand(band, k, y0, page, liveEnd);
    bandList.push(band);
    trace('band:create', { k, vine: !!band.vine, hang: !!band.hang, pool: !!band.pool, flies: homes.length });
  }
}

// Desktop pages (round 6): more light and more ivy in each band, each from its own random stream, so nothing placed
// before moves. A second, softer fixture on the side the band's main one is not (so no stretch of wall is unlit), a
// couple of fireflies about each lamp, a hanger on the climber's side too, and a short strand along a section edge from
// the margin. All of it in the margins or along hairlines, clear of the text.
function moreInBand(k, y0, band, lenK) {
  const { route, vw } = room, L = bandRng(route, k, 3), V = bandRng(route, k, 4);
  const mainLeft = band.pool ? band.pool.x < vw / 2 : (k + route.length) % 2 === 0;
  const ly = y0 + BAND * (0.15 + 0.7 * L()), lx = mainLeft ? vw * (0.72 + 0.12 * L()) : vw * (0.16 + 0.12 * L());
  if (!pools.some((p) => Math.abs(p.py - ly) < 260 && Math.abs(p.px - lx) < vw * 0.3)) {
    band.pool2 = addPool({ x: lx, y: ly, rx: Math.min(560, vw * 0.4), ry: 340, c: OVERHEAD, i: 0.3 }, false);
  }
  for (const p of [band.pool, band.pool2].filter(Boolean)) {
    for (let i = 0; i < 2; i++) addFly(i ? 'orb' : 'blink', { x: p.x + (L() - 0.5) * p.rx * 0.9, y: p.y + (L() - 0.2) * p.ry * 0.7 }, [40 + L() * 70, 25 + L() * 40], L);
  }
  if (k > 0 && V() < 0.85) {   // a hanger on the climber's side as well, higher or lower in the band
    const left = band.vine ? !band.vine.right : V() < 0.5, y = y0 + BAND * (0.05 + 0.4 * V());
    const v = makeVine(hanger(left ? 6 + 14 * V() : vw - 6 - 14 * V(), y, (180 + 260 * V()) * lenK, V, { curlK: 0.2, wave: 5, bias: left ? -0.5 : 0.5 }), V,
      { size: 0.75 + 0.2 * V(), width: [3, 1.1], right: !left, kind: 'hanger', gap: 0.7 + 0.4 * V(), leaf: 1.05 });
    band.hang2 = v; vines.push(v);
  }
  // (round 7) no 500 px stretch of either half of the page without a lamp over it
  const X = bandRng(route, k, 5);
  for (const half of [0.25, 0.75]) for (const yy of [y0 + BAND * 0.25, y0 + BAND * 0.75]) {
    const x = vw * half + (X() - 0.5) * vw * 0.12, y = yy + (X() - 0.5) * 160;
    if (y > 120 && y < geo.bottom - 120 && !pools.some((p) => Math.abs(p.py - y) < 380 && Math.abs(p.px - x) < vw * 0.32)) {
      const q = addPool({ x, y, rx: Math.min(520, vw * 0.38), ry: 330, c: OVERHEAD, i: 0.3 }, false);
      (band.fills ||= []).push(q);
      addFly(X() < 0.4 ? 'orb' : 'blink', { x: x + (X() - 0.5) * 300, y: y + (X() - 0.3) * 200 }, [40 + X() * 70, 25 + X() * 40], X);
    }
  }
  // ivy all the way down both margins: a strand hanging from each side twice a band (its own stream)
  for (const left of [true, false]) for (const f of [0.08, 0.4, 0.72]) {
    if (X() > 0.88) continue;
    const y = y0 + BAND * (f + 0.15 * X());
    if (y < 420 || y > geo.bottom - 300) continue;
    const v = makeVine(hanger(left ? 4 + 18 * X() : vw - 4 - 18 * X(), y, 220 + 260 * X(), X, { curlK: 0.15, wave: 6, bias: left ? -0.5 : 0.5 }), X,
      { size: 0.8 + 0.25 * X(), width: [3, 1.1], right: !left, kind: 'hanger', gap: 0.6 + 0.3 * X(), leaf: 1.15 });
    (band.margin ||= []).push(v); vines.push(v);
  }
  // hanging from the tops of the photo and poster mounts, down the gutter beside them (leaves tucked behind the mount)
  const M = bandRng(route, k, 6);
  const mounts = [...inApp('.archive-card, .archive-media-image, .archive-artist-image, .archive-lineup-card, .archive-poster, .archive-spotlight-poster')]
    .map((e) => pageRect(e)).filter((r) => r.y >= y0 && r.y < y0 + BAND && r.y > 300 && r.h > 120);
  for (const r of mounts.slice(0, 8)) {
    if (M() > 0.85) continue;
    const right = M() < 0.5, x = right ? r.x + r.w + 4 + 4 * M() : r.x - 4 - 4 * M();
    const v = makeVine(hanger(x, r.y - 6, Math.min(r.h * 0.9, 120 + 180 * M()), M, { curlK: 0.1, wave: 3 }), M, { size: 0.7 + 0.15 * M(), width: [2.6, 1], right: x > vw / 2, kind: 'hanger', gap: 0.7, leaf: 1.05 });
    (band.mounts ||= []).push(v); vines.push(v);
  }
  // climbing up beside the card grids, in the margin, from their foot
  for (const g of inApp('.archive-card-grid, .archive-media-grid, .archive-artist-grid, .archive-appearances')) {
    const r = pageRect(g), foot = r.y + r.h;
    if (foot < y0 || foot >= y0 + BAND || foot > geo.bottom - 100) continue;
    for (const left of [true, false]) {
      if (M() > 0.75) continue;
      const v = makeVine(climber(left ? Math.max(6, r.x - 14) : Math.min(vw - 6, r.x + r.w + 14), foot - 10, Math.min(r.h * 0.8, 320 + 360 * M()), M), M,
        { size: 0.8, width: [3.2, 1.2], right: !left, kind: 'climber', gap: 0.7, leaf: 1.1 });
      (band.grids ||= []).push(v); vines.push(v);
    }
  }
  // a strand along every section edge in this band, in from alternating margins (on the hairline, not over the text)
  const edges = edgeCandidates(route).filter((c) => c.y >= y0 && c.y < y0 + BAND && c.y > 500 && !growing.some((g) => Math.abs(g.edge0 - c.y) < 40));
  let fromRight = V() < 0.5;
  for (const edge of edges) {
    const make = V() < 0.97, reach = 160 + 220 * V(), ph = V() * 6;
    if (make) {
      const pts = [];
      for (let d = -30; d <= reach; d += 6) pts.push({ x: fromRight ? vw - d : d, y: edge.y + 1 + Math.sin(d * 0.013 + ph) * 5 + Math.sin(d * 0.041) * 2 });
      const v = makeVine(pts, V, { size: 0.8, width: [3.2, 1.2], right: fromRight, kind: 'runner', gap: 0.75 });
      (band.runners ||= []).push(v); vines.push(v);
    }
    fromRight = !fromRight;
  }
}

// ------------------------------------------------------------------ fireflies, in page space with a little depth
// Each one is made once, with the room or its band, and starts dark until the frame loop places it.
let flies = [], wakeAt = -1;
function addFly(kind, home, amp, R, extra = {}) {
  const rand = (a, b) => a + (b - a) * R();
  const f = { kind, ...KINDS[kind], home, amp, freq: [rand(0.08, 0.25), rand(0.1, 0.3)], phase: [R() * 6.3, R() * 6.3], period: rand(2.6, 6.5), offset: R() * 10, z: R(), off: { x: 0, y: 0, vx: 0, vy: 0 }, ...extra };
  f.el = el('i', 'world-fly', bodies);
  f.el.style.setProperty('--c', rgb(f.c));
  f.el.style.setProperty('--s', (f.size * (0.8 + 0.5 * f.z)).toFixed(2));
  // its light on the wall: 150 px of reach, at full strength (opacity carries how bright it is right now)
  f.light = lightEl(f.c, f.power * 0.42);
  Object.assign(f.light.style, { left: '-150px', top: '-150px', width: '300px', height: '300px' });
  f.el.style.opacity = f.light.style.opacity = '0';
  f.shown = false; f.lvl = 0;
  flies.push(f);
}
// A page transition holds the room being left on screen while it slides away: its fireflies are handed over (so the
// next room does not remove them) and kept flying where they were, at the depth the page was left at, until released.
let held = null, brightest = null;
function hold() {
  if (held) held.release();
  const h = { flies, sy: scrollY, H: innerHeight, sx: geo.sx, top: geo.top, lamp: brightest };
  h.release = () => { for (const f of h.flies) { f.el.remove(); f.light.remove(); } if (held === h) held = null; };
  flies = []; edgeFlies = []; edgeKey = '';   // its edge fireflies go with it; the next room lays out its own edges
  held = h;
  return { flies: h.flies.map((f) => ({ body: f.el, light: f.light })), release: h.release };
}
const pointer = { x: -1e4, y: -1e4, at: -1e9 };
addEventListener('pointermove', (e) => { pointer.x = e.clientX + scrollX; pointer.y = e.clientY + scrollY; pointer.at = performance.now(); }, { passive: true });

function updateFlies(clockT, dt, sy, H, scrollV, lamp, list = flies, sx = geo.sx) {
  const t = still ? 0 : clockT;   // reduced motion: every firefly rests where it is, at its own level
  // only those near the screen are worked on; the window runs further ahead the faster the page is moving
  const ahead = H * 1.2 + Math.abs(scrollV) * 30;
  const inView = (y) => y > sy - (scrollV < 0 ? ahead : H * 0.6) && y < sy + H + (scrollV > 0 ? ahead : H * 0.6);
  const light = lamp;
  // the two nearest the cursor drift over to it, gently
  const near = list.map((f, i) => [i, Math.hypot(f.px - pointer.x, f.py - pointer.y)]).filter(([, d]) => d < 320).sort((a, b) => a[1] - b[1]).slice(0, 2).map(([i]) => i);
  list.forEach((f, i) => {
    let bx, by;
    if (f.moth !== undefined) {
      // moths circle the brightest lit slab in view, closer when it burns brighter
      if (!light) { f.lvl = 0; return; }
      const a = t * (0.9 + f.moth * 0.23) + f.moth * 2.1, r = 1.25 - 0.35 * light.s.glow, sr = light.s.r;
      bx = sr.x + sr.w / 2 + Math.cos(a) * f.amp[0] * r * (sr.w / 160 + 0.6) + Math.sin(t * 3.1 + f.moth) * 6;
      by = sr.y + sr.h / 2 + Math.sin(a * 1.3) * f.amp[1] * r - 6 + Math.sin(t * 4.3 + f.moth * 2) * 4;
    } else {
      const hx = f.home.x * sx, hy = f.home.y;   // its home, spread with the width
      if (!inView(hy)) { f.lvl = 0; return; }
      const s = (k) => Math.sin(t * f.freq[k] + f.phase[k]) + 0.35 * Math.sin(t * f.freq[k] * 2.9 + f.phase[k] * 1.3);
      bx = hx + f.amp[0] * s(0); by = hy + f.amp[1] * s(1);
    }
    const o = f.off;
    if (!still) {
      // startled by a fast scroll: a kick that settles back over a few seconds (a slow, well-damped spring)
      if (Math.abs(scrollV) > 3) { o.vx += (hash(i + t) - 0.5) * Math.abs(scrollV) * 2.2; o.vy -= scrollV * (0.8 + f.z); }
      let ax = -o.x * 1.1 - o.vx * 1.7, ay = -o.y * 1.1 - o.vy * 1.7;
      if (near.includes(i) && performance.now() - pointer.at < 4000) {
        const a = t * 0.8 + i, tx = pointer.x + Math.cos(a) * 46 - bx, ty = pointer.y + Math.sin(a) * 30 - 18 - by;
        ax += (tx - o.x) * 1.6; ay += (ty - o.y) * 1.6;
      }
      o.vx += ax * dt; o.vy += ay * dt; o.x += o.vx * dt; o.y += o.vy * dt;
    }
    f.px = bx + o.x; f.py = by + o.y;
    let lvl;
    if (f.kind === 'blink') { const c = (t + f.offset) % f.period; lvl = 0.12 + 0.88 * Math.exp(-((c - 0.8) ** 2) / 0.09); }   // a soft swell
    else if (f.kind === 'moth') lvl = (0.55 + 0.25 * Math.sin(t * 0.9 + i * 3)) * (0.4 + 0.6 * light.s.glow);
    else lvl = 0.45 + 0.35 * Math.sin(t * 0.6 + f.offset);
    f.lvl = lvl * (wakeAt < 0 ? 0 : clamp01((clockT - wakeAt - (i % 12) * 0.14) / 1.1));   // they wake one by one as the wall comes into view
  });
}
function placeBodies(list = flies, top = geo.top) {
  // in page px (relative to the room's top), so the page carries them as it scrolls
  for (const f of list) {
    if (f.lvl < 0.005) {
      if (f.shown) { f.el.style.opacity = f.light.style.opacity = '0'; f.shown = false; }
      continue;
    }
    const tr = `translate3d(${f.px.toFixed(1)}px, ${(f.py - top).toFixed(1)}px, 0)`, o = f.lvl.toFixed(3);
    f.el.style.transform = f.light.style.transform = tr;
    f.el.style.opacity = f.light.style.opacity = o;
    f.shown = true;
  }
}

// ------------------------------------------------------------------ slabs: light boxes with the sign's hum and strike
const IDLE = 0.62;   // their resting backlight
function bindSlab(e) {
  const s = { glow: IDLE, target: IDLE, strike: -1, r: pageRect(e), el: lightEl(SIGN, 1.25) };
  slabs.set(e, s);
  const on = () => { s.target = 1; if (!still) s.strike = clock; };
  const off = () => { s.target = IDLE; s.strike = -1; };
  e.addEventListener('pointerenter', on); e.addEventListener('focus', on);
  e.addEventListener('pointerleave', off); e.addEventListener('blur', off);
}
function updateSlab(e, s, t, dt) {
  if (s.strike >= 0 && t - s.strike > 0.6) s.strike = -1;
  let v = s.target;
  if (s.strike >= 0) {
    // the lamp catching: a couple of failed strikes, then it holds (the hero's Flicker boot, compressed)
    const p = t - s.strike;
    if (p < 0.5) v *= p < 0.08 ? 0.35 : hash(Math.floor(p * 34)) > 0.42 ? 1 : 0.28;
  }
  v *= still ? 0.95 : 0.95 + 0.03 * Math.sin(t * 2.3 + s.r.x) * Math.sin(t * 0.71) + 0.02 * (hash(Math.floor(t * 24) + s.r.y) - 0.5);   // the sign's hum
  s.glow += (v - s.glow) * Math.min(1, dt * (s.strike >= 0 ? 45 : 6));
  const g = s.glow.toFixed(3);
  e.style.setProperty('--glow', g);
  s.el.style.opacity = g;   // its light on the wall is the same backlight
}

// ------------------------------------------------------------------ lights
// Every light is the same soft radial falloff; their sum is the light map the wall, the ivy and the prints all read.
function falloff(d) {
  for (let i = 1; i < FALLOFF.length; i++) {
    const [d1, v1] = FALLOFF[i], [d0, v0] = FALLOFF[i - 1];
    if (d <= d1) return v0 + (v1 - v0) * (d - d0) / (d1 - d0);
  }
  return 0;
}
function lightAt(L, x, y) {
  let r = 0, g = 0, b = 0;
  for (const l of L) {
    if (Math.abs(x - l.x) > l.rx || Math.abs(y - l.y) > l.ry) continue;
    const k = l.i * falloff(Math.min(1, Math.hypot((x - l.x) / l.rx, (y - l.y) / l.ry)));
    r += l.c[0] * k; g += l.c[1] * k; b += l.c[2] * k;
  }
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
// a firefly passing close to a photograph or poster catches the edge of its mount (a few times a second is plenty)
function rimPrints(sy, H) {
  const ff = flies.filter((f) => f.lvl > 0.01);
  for (const p of prints) {
    const r = p.r;
    if (r.y + r.h < sy || r.y > sy + H) continue;
    let best = 0, col = null;
    for (const f of ff) {
      const dx = Math.max(r.x - f.px, 0, f.px - (r.x + r.w)), dy = Math.max(r.y - f.py, 0, f.py - (r.y + r.h));
      const k = f.lvl * f.power * 0.42 * clamp01(1 - Math.hypot(dx, dy) / 120);
      if (k > best) { best = k; col = f.c; }
    }
    const rim = Math.round(best * 0.55 * 20) / 20;
    if (rim !== p.rim) {
      p.rim = rim;
      p.mount.style.setProperty('--rim', rim);
      if (col) p.mount.style.setProperty('--rim-rgb', rgb(col));
    }
  }
}

// ------------------------------------------------------------------ frame
const GROW_CALM = 6;   // px per 60 Hz frame (~360 px/s): faster than this, growth waits
let clock = 0, last = performance.now(), lastScroll = scrollY, scrollV = 0, lastBusy = -1e9, shown = true, rimTick = 0;
const stats = { cpu: 0 };
function resize() {
  // GRADE_FRAG: v = smoothstep(1, .22, |c * (1, 1.2)|) * mix(.62, 1, smoothstep(-.05, .45, uv.y)), applied before the
  // tone curve; on these dark values that comes out at about v^.6 in sRGB. Drawn once per screen shape.
  // a hidden pane, a background tab or a prerender can report a 0x0 viewport: draw a 1x1 vignette rather than throw
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(innerWidth / 8)); c.height = Math.max(1, Math.ceil(innerHeight / 8));
  const g = c.getContext('2d'), img = g.createImageData(c.width, c.height);
  const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    const u = (x + 0.5) / img.width, w = 1 - (y + 0.5) / img.height, cx = u - 0.5, cy = (w - 0.5) * 1.2;
    const v = sm(1, 0.22, Math.hypot(cx, cy)) * (0.62 + 0.38 * sm(-0.05, 0.45, w)), k = (y * img.width + x) * 4;
    img.data[k] = img.data[k + 1] = img.data[k + 2] = Math.round(v ** 0.6 * 255); img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  vignette.style.backgroundImage = `url(${c.toDataURL()})`;
  measure();
}
function frame(now) {
  requestAnimationFrame(frame);
  const sy = scrollY, H = innerHeight;
  const visible = geo.on && sy + H > (geo.plate ? 0 : geo.top) && sy < geo.bottom + 40;
  if (visible !== shown) { shown = visible; document.documentElement.classList.toggle('world-off', !visible); }
  if (!visible) { last = now; lastScroll = sy; return; }
  // 60 fps while something moves quickly (the cursor, growth, a slab striking); ~30 fps otherwise, like the hero.
  // Scrolling needs nothing from here: the page carries the whole room.
  const sprouting = growing.some((v) => v.grow !== null && v.drawn < 1);
  const busy = now - pointer.at < 1200 || sprouting || !!held || [...slabs.values()].some((s) => s.strike >= 0);
  if (busy) lastBusy = now;
  if (now - lastBusy > 1200 && now - last < 1000 / 30 - 3) return;
  if (still && wakeAt >= 0 && clock - wakeAt > 2 && now - lastBusy > 1200) { last = now; lastScroll = sy; return; }   // reduced motion: nothing left to move
  const t0 = performance.now();
  const dt = Math.min((now - last) / 1000, 1 / 20);
  last = now; clock += dt;
  scrollV = scrollV * 0.6 + (sy - lastScroll) / Math.max(dt * 60, 1) * 0.4; lastScroll = sy;   // px per 60 Hz frame
  if (wakeAt < 0) wakeAt = clock;

  // slabs near the screen hum (and strike); the brightest one in view draws the moths
  brightest = null;
  for (const [e, s] of slabs) {
    if (s.r.y + s.r.h < sy - H || s.r.y > sy + 2 * H) continue;
    updateSlab(e, s, clock, dt);
    if (s.r.y > sy && s.r.y < sy + H && (!brightest || s.glow > brightest.s.glow)) brightest = { e, s };
  }
  updateFlies(clock, dt, sy, H, scrollV, brightest);
  // growing strands start when their edge is on screen and the page is nearly still (a beat after the page settles if
  // it is already there). A fling pauses one that is growing, where it is, and it carries on once the page slows:
  // redrawing a strand while the compositor races to keep up with a fling costs frames, and nobody sees it grow then.
  const calm = Math.abs(scrollV) < GROW_CALM;
  for (const v of growing) {
    if (v.grow === null) {
      if (calm && v.edgeY > sy - 100 && v.edgeY < sy + H * 0.85) { v.grow = Math.max(clock, wakeAt + 0.5); trace('vine:grow', { y: v.edgeY }); }
    } else if (!calm && clock - v.grow < 3.2) v.grow += dt;   // paused: its clock stands still
    if (v.grow !== null) drawVine(v, growthOf(v));
  }
  placeBodies();
  if (held) { updateFlies(clock, dt, held.sy, held.H, 0, held.lamp, held.flies, held.sx); placeBodies(held.flies, held.top); }
  if (++rimTick % 6 === 0) rimPrints(sy, H);
  if (!still) grain.style.transform = `translate3d(${-Math.floor(hash(clock) * 128)}px, ${-Math.floor(hash(clock + 7) * 128)}px, 0)`;
  stats.cpu += (performance.now() - t0 - stats.cpu) * 0.05;
}

resize();
let sizeKey = `${innerWidth}x${innerHeight}`;
addEventListener('resize', () => {
  const key = geo.phone ? `${innerWidth}` : `${innerWidth}x${innerHeight}`;
  if (key !== sizeKey) { sizeKey = key; resize(); }
});
new ResizeObserver(() => measure()).observe(document.getElementById('app'));
// app.js re-renders #app on breakpoint changes and status refreshes, and the gallery swaps its results in place (from
// a click, the event select or the search box): measured again once, on the next frame, so the slabs, the prints and
// the edges the growing strands keep to are found again before the next paint. None of this rebuilds the room.
let mutations = 0, measureQueued = false;
new MutationObserver(() => { mutations++; measure(); }).observe(document.getElementById('app'), { childList: true, subtree: true });
document.addEventListener('click', () => { if (!measureQueued) { measureQueued = true; requestAnimationFrame(() => { measureQueued = false; measure(); }); } });
document.addEventListener('hero:ivy', () => measure());
// coming back to a page the browser kept whole (back/forward) still grows its strands again, as a reload does
addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  wakeAt = -1;
  for (const v of growing) { v.grow = null; drawVine(v, 0); trace('vine:regrow', { y: Math.round(v.edgeY) }); }
});
requestAnimationFrame(frame);
// debug: __world.cpu is a rolling average of main-thread ms per frame; with ?vines, __world.log lists every strand
// created, removed, started or regrown and every room rebuild (none should follow the first build while you scroll)
// page transitions (lab/world/transitions.js): setCamera(x, y) places the wall; growth() / setGrowth(p[]) read and
// restore how far each growing strand has grown; hold() keeps the fireflies of the room being left alive; measure()
// returns whether it built a new room, and a 'world:room' event follows every new room
window.__world = { log: traceLog, get mutations() { return mutations; }, geo, flies: () => flies, slabs, vines: () => vines, pools: () => pools, measure, get cpu() { return stats.cpu; },
  setCamera, get camera() { return { ...camera }; }, growth, setGrowth, hold, get clock() { return clock; }, order: ORDER, familyOf };

// ---- wall-gl hook (lab/world/wall-gl.js): the GL wall and ivy, on by default on desktop (?nowallgl: the CSS world).
// It reads the room's tone from here and its lights and ivy from pools() / slabs / flies() / vines() (glDirty above).
window.__world.tone = { AMBIENT, AMBIENT_FAR, VEIL, VEIL_FAR, AMBIENT_PAGE, VEIL_PAGE, FAR };
if (!new URLSearchParams(location.search).has('nowallgl') && !phoneMq.matches && !still) import('./wall-gl.js');
// ---- end wall-gl hook
// (round 6) the desktop pages' brighter fill and haze, for the GL tier too (it runs on desktop only; phones keep theirs)
if (window.__world.tone) Object.assign(window.__world.tone, { AMBIENT_PAGE: AMBIENT_DESK, VEIL_PAGE: VEIL_DESK });

// ---- crossing the phone breakpoint (round 10): every gate on this site (the hero and the pans on desktop, the phone
// layer and its intro on phones, the GL wall, the leaf atlas, this world's own mode) is decided once, at load. A window
// resized across 720 px, and left there for 300 ms, starts the whole stack again in the right mode: the page reloads,
// keeping where the reader was (as a share of the page, since the two layouts differ in length), and skipping the
// opening it would otherwise play again. No half-state, and never the plain site. (app.js leaves its own breakpoint
// re-render to this while __worldReinit is set.)
{
  const atLoad = phoneMq.matches;
  let timer = 0;
  window.__worldReinit = true;
  phoneMq.addEventListener('change', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (phoneMq.matches === atLoad) return;   // it came back: nothing to do
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      try { sessionStorage.setItem('world-reinit', JSON.stringify({ path: location.pathname + location.search, share: scrollY / max })); } catch {}
      location.reload();
    }, 300);
  });
  let back = null;
  try { back = JSON.parse(sessionStorage.getItem('world-reinit') || 'null'); sessionStorage.removeItem('world-reinit'); } catch {}
  if (back && back.path === location.pathname + location.search) {
    // the opening is skipped (any input does that), and the reader put back where they were
    if (document.documentElement.classList.contains('intro-pending')) dispatchEvent(new KeyboardEvent('keydown'));
    const put = () => scrollTo({ top: back.share * Math.max(0, document.documentElement.scrollHeight - innerHeight), behavior: 'instant' });
    requestAnimationFrame(put); setTimeout(put, 400);
  }
}
