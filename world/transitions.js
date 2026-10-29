// Local-only prototype (see lab/TRANSITIONS.md): "one wall" page transitions for the lab subpages.
//
// The pages hang side by side on one continuous wall. Following a link to another subpage does not load a new
// document: the next page is rendered in place (app.js already renders whatever route the URL names on popstate), the
// world layer (world.js) stays alive, and the camera pans sideways along the wall to it. The page you leave slides off
// with its own ivy, lights and fireflies; the wall is continuous across the seam because the new page's stretch of
// wall is chosen to carry on exactly from where the camera was (horizontally one screen over, vertically at the depth
// you were reading at). Back and forward pan the other way. Growing vines keep how far they grew for the rest of this
// visit (held in memory only, so a cold load still grows them fresh).
//
// Where a pan can't be done (going home, whose live 3D hero is a document of its own; a page with a different shell;
// phones, where there is no world; reduced motion) the room's lights dip out instead and the next document's lights
// come back up (the lights-dip from SITE-EXPLORATION.md).
//
// Debug: window.__tx  (state, last: metrics of the last transition, go(url), wall)

// ------------------------------------------------------------------ the camera move
// A camera move, not a slide: it eases in from rest (a quarter-sine ramp of speed), cruises, then spends the longer
// part of the move settling, its speed falling off smoothly to nothing with no overshoot ((1 - w)^3 (1 + 3w): zero
// speed and zero acceleration at both ends). The profile is sampled into a CSS linear() easing, so the compositor runs
// it; the same profile drives the motion blur (by speed) and the ivy's swing (by acceleration).
const PAN_MS = 720, ACCEL = 0.24, CRUISE = 0.38;
const speedShape = (u) => (u < ACCEL ? Math.sin((Math.PI / 2) * u / ACCEL) ** 2 : u < CRUISE ? 1 : ((w) => (1 - w) ** 3 * (1 + 3 * w))((u - CRUISE) / (1 - CRUISE)));
const PROFILE = (() => {
  const N = 720, E = [0], V = [0];
  for (let i = 1; i <= N; i++) { const u0 = (i - 1) / N, u1 = i / N; E.push(E[i - 1] + (speedShape(u0) + speedShape(u1)) / 2 / N); }
  const area = E[N];
  for (let i = 0; i <= N; i++) { E[i] /= area; V[i] = speedShape(i / N) / area; }
  const at = (arr, u) => { const x = Math.min(N, Math.max(0, u * N)), i = Math.min(N - 1, Math.floor(x)); return arr[i] + (arr[i + 1] - arr[i]) * (x - i); };
  const vmax = Math.max(...V);
  return { E: (u) => at(E, u), V: (u) => at(V, u), vmax, A: (u) => (at(V, u + 0.5 / N) - at(V, u - 0.5 / N)) * N };
})();
const PAN_EASE = `linear(${Array.from({ length: 49 }, (_, i) => { const u = i / 48; return `${PROFILE.E(u).toFixed(4)} ${(u * 100).toFixed(2)}%`; }).join(', ')})`;
// depth: the wall, its lights and its ivy are one plane; the content sits a touch in front of it, the fireflies further
const DEPTH = { albedo: 1, light: 1, veil: 1, bodies: 1.08, app: 1.012 };
// motion blur: the wall and its ivy smear sideways with the camera's speed, at most this much (px, Gaussian sd)
const BLUR_PEAK = 9;
// how the blur and the aberration follow the move: a camera whip, rising fast and settling long (the speed's own
// profile, lifted: its low tail stays visible longer and the rise is steeper), aberration up to CA_PEAK x its rest value
const CA_PEAK = 3;
const whip = (u) => (PROFILE.V(Math.min(1, Math.max(0, u))) / PROFILE.vmax) ** 0.7;
// a pan that carries the live hero (to or from home): it gets the same blur and aberration each frame, in its lighter
// pipeline (lite: its god rays and haze eased out while it moves), and no lens breathing on the GL wall (the hero has none)
let heroPan = false;
const heroCamera = (w) => { if (heroPan) window.__siteHero?.camera?.({ blur: BLUR_PEAK * w, ca: 1 + (CA_PEAK - 1) * w, lite: true }); };
const heroRest = () => { if (heroPan) window.__siteHero?.camera?.(); };
// the ivy's swing: a damped spring per strand, driven by the camera's acceleration, settling within this long after
const SWAY_SETTLE = 1500;
const DIP_MS = 200;
const DECODE_WAIT = 160;                            // longest we hold the pan for the next page's first photos
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const until = (test) => new Promise((resolve) => { const t = () => (test() ? resolve() : setTimeout(t, 30)); t(); });   // not rAF: a background tab never runs it
const routeOf = (url) => (url.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '');
const html = document.documentElement;

// arriving from a lights-dip: the inline script in <head> started the lights-up (transitions.css); end it cleanly
try { sessionStorage.removeItem('tx-arrive'); } catch {}
setTimeout(() => html.classList.remove('tx-arriving'), 900);
addEventListener('pageshow', (e) => { if (e.persisted) html.classList.remove('tx-dipping'); });

await until(() => window.__world && window.INSTINCT_CONTENT && window.INSTINCT_ARCHIVE && document.getElementById('app').firstElementChild);
const W = window.__world;
const app = document.getElementById('app');
const layer = (name) => document.querySelector(`body > .world-${name}`);

// ------------------------------------------------------------------ the site laid out along the wall
// Left to right: the nav order, with each section's own pages after it (events oldest to newest, so the pager's
// "← older" pans left and "newer →" right; artists A to Z, as the directory lists them).
const ORDER = (() => {
  const c = window.INSTINCT_CONTENT, a = window.INSTINCT_ARCHIVE.create(c);
  const events = [...a.events].sort((x, y) => x.date.localeCompare(y.date)).map((e) => e.id);
  const artists = Object.values(c.artists).sort((x, y) => x.name.localeCompare(y.name)).map((x) => x.id);
  const list = ['index', 'next-event', 'past-events', ...events, ...Object.keys(c.collaborations || {}), 'artists', ...artists, 'gallery'];
  return new Map(list.map((id, i) => [id, i]));
})();
const directionTo = (from, to) => Math.sign((ORDER.get(to) ?? 1e3) - (ORDER.get(from) ?? 1e3)) || 1;

// ------------------------------------------------------------------ state
// Each history entry is a column on the wall (col: how many screens over from where this visit began) plus where it
// was scrolled to. The vertical position of the wall is not stored: it is chosen per pan, so the pan is always
// level and the wall always continuous (no one can tell which stretch of concrete a page had last time; its ivy,
// lights and fireflies are its own and come back exactly).
const entry = () => history.state?.tx ?? { col: 0, scroll: 0 };
const writeEntry = (patch) => history.replaceState({ ...history.state, tx: { ...entry(), ...patch } }, '');
if (!history.state?.tx) writeEntry({ col: 0, scroll: scrollY });
const cam = { col: entry().col, Y: 0, path: location.pathname + location.search, route: routeOf(location) };
let saveQueued = 0;
addEventListener('scroll', () => {
  clearTimeout(saveQueued);
  saveQueued = setTimeout(() => { if (!busy) writeEntry({ scroll: scrollY }); }, 150);
}, { passive: true });

// ------------------------------------------------------------------ the wall, placed by the camera
// world.js places the still where the camera is (__world.setCamera), mirrored both ways so it runs on seamlessly
// sideways too. (0, 0) is its starting position, so a cold load is unchanged.
const wall = { get X() { return W.camera.x; }, get Y() { return W.camera.y; } };
// (one column is the width the room was built at: never a width read while the document is momentarily empty)
const colWidth = () => W.geo.vw || html.clientWidth;
function setCamera(col, Y) {
  cam.col = col; cam.Y = Y;
  W.setCamera(col * colWidth(), Y);
}
addEventListener('resize', () => setCamera(cam.col, cam.Y));
setCamera(cam.col, 0);
// a reload of an entry this made (scroll restoration is manual once a pan has happened): back to where it was
if (history.scrollRestoration === 'manual' && entry().scroll && !html.classList.contains('intro-pending')) scrollTo({ top: entry().scroll, behavior: 'instant' });   // (never into home's intro: it opens at the top)

// ------------------------------------------------------------------ growing vines: kept for this visit only
// Each page keeps how far its strands had grown (__world.growth(), exact, on the world clock), in memory only: a page
// not seen yet, or any page after a cold load, grows them fresh.
const growth = new Map();

// ------------------------------------------------------------------ the shell each page needs
// (elements added at run time, such as wall-gl.js's stylesheet, carry data-dynamic and are not part of the shell)
// The shell: the scripts and stylesheets a page needs. Home differs by design (the hero's own stylesheet and module,
// and the import map they need): those are left out of the comparison, and a page may pan to another whose shell is
// the same as its own or a part of it.
const HERO_ASSET = /hero-3d\//;
const shellOf = (doc) => [...doc.querySelectorAll('head script[src]:not([data-dynamic]), head link[rel="stylesheet"]:not([data-dynamic])')]
  .map((e) => e.getAttribute('src') || e.getAttribute('href')).filter((u) => !HERO_ASSET.test(u));
const SHELL = new Set(shellOf(document));
const shellFits = (doc) => shellOf(doc).every((u) => SHELL.has(u));
// the live hero: home pans only where it can be shown (this document has it, or can load it: __siteHero.ensure)
// (its canvas host is out of the page while another page is shown, so the one seen last is remembered)
let heroHost = null;
const heroReady = () => !!(window.__siteHero && (document.querySelector('.home-opening__scene') || heroHost || window.__siteHero.ensure || window.__siteHero.mount));
const pages = new Map();   // url -> Promise<{ title, ok }>
function page(url) {
  const key = url.pathname;
  if (!pages.has(key)) {
    pages.set(key, fetch(url.href).then((r) => (r.ok ? r.text() : Promise.reject(r.status))).then((text) => {
      const doc = new DOMParser().parseFromString(text, 'text/html');
      return { title: doc.title, ok: shellFits(doc) };
    }).catch(() => ({ ok: false })));
  }
  return pages.get(key);
}
const panRoute = (url) => html.classList.contains('has-world') && (routeOf(url) !== 'index' || heroReady());
function eligible(url) {
  return url.origin === location.origin && url.pathname.startsWith(location.pathname.replace(/[^/]*$/, ''))
    && /\.html$/.test(url.pathname) && panRoute(url);
}

// ------------------------------------------------------------------ the page you leave: a still of it, sliding off
// Its content is moved (not copied, so its photos stay decoded) into a layer fixed to the screen, at the depth you
// were reading at; its wall, ivy, lights and fireflies are copied, each into the matching place in the stack, so the
// lights still multiply over its own wall, its haze and fireflies still add, and the screen's vignette and grain (the
// camera's grade, which does not pan) still sit over both pages.
// Each page's lights end at its own edge, so where the two pages meet the light would change in a hard line: on both
// sides of the seam the lamps fade back to the room's own fill (the dark between two fixtures), and on the new page
// that falls away again as the seam leaves the screen.
function feather(lightEl, side) {
  const f = document.createElement('i'), fill = getComputedStyle(lightEl).backgroundColor;
  f.className = `tx-feather is-${side}`;
  f.style.background = `linear-gradient(to ${side === 'left' ? 'right' : 'left'}, ${fill}, transparent)`;
  lightEl.append(f);
  return f;
}
// With the GL wall tier on (wall-gl.js: html.wall-gl, __wallgl.pan), the GL canvas draws the wall, the ivy and the
// lights of both pages as one surface, driven by the camera each frame (wall-gl.css then hides the CSS wall and light
// layers and the held copy of them; the held ivy canvases stay, as the GL tier reads each one's swing off them).
// (not gated on html.wall-gl: at the top of home the world is off screen and the tier has not shown yet; prepare() turns it on)
const glPan = () => !!window.__wallgl?.pan?.camera && tx.glPan !== false;
function holdOldPage(sy, dir) {
  const parts = [];
  // the room's fireflies are handed over by world.js and keep flying in the held copy until it is released
  const held = W.hold && !tx.noHold ? W.hold() : { flies: [], release() {} };   // __tx.noHold: a frozen copy instead (A/B)
  for (const f of held.flies) { f.body.remove(); f.light.remove(); }
  const box = (cls, before) => {
    const outer = document.createElement('div'), inner = document.createElement('div');
    outer.className = `tx-old ${cls}`; outer.setAttribute('aria-hidden', 'true'); outer.inert = true;
    inner.className = 'tx-old__page'; inner.style.transform = `translate3d(0, ${-sy}px, 0)`;
    outer.append(inner); before.before(outer); parts.push(outer);
    return inner;
  };
  const copy = (src, into) => {
    if (!src) return;
    const c = src.cloneNode(true);
    const from = src.querySelectorAll('canvas'), to = c.querySelectorAll('canvas');
    to.forEach((cv, k) => { if (from[k].width && from[k].height) cv.getContext('2d').drawImage(from[k], 0, 0); });
    into.append(c);
  };
  const back = box('tx-old--back', layer('vignette'));
  copy(layer('albedo'), back); copy(layer('light'), back);
  const lightCopy = back.lastChild;
  if (lightCopy) { feather(lightCopy, dir > 0 ? 'right' : 'left'); lightCopy.style.setProperty('--tx-fill', getComputedStyle(lightCopy).backgroundColor); }
  const air = box('tx-old--air', layer('grain'));
  copy(layer('bodies'), air);   // the haze is even across the wall, so it stays put (no seam to show) and is not copied
  const bodiesCopy = air.lastChild;
  for (const f of held.flies) { lightCopy?.append(f.light); bodiesCopy?.append(f.body); }
  const content = box('tx-old--page', app), shell = document.createElement('div');
  shell.className = 'tx-old__app';
  shell.style.width = `${app.offsetWidth}px`;
  shell.append(...app.childNodes);
  content.append(shell);
  return { parts, held };
}

// ------------------------------------------------------------------ the ivy's swing
// Each strand near the screen is a damped spring hanging from its root: the camera's acceleration throws its free end
// back (it lags as the move starts), it swings through as the move slows, and settles. Weighty, never rubbery: about
// 0.8 to 1.6 Hz by length, damped at 0.4-0.5 of critical, a few degrees at most for the hanging strands and about one
// for those climbing the wall. The response is worked out once (the move's profile is known), then played as transform
// keyframes on each strand's canvas (a skew about its root), so the compositor runs it and nothing is redrawn. A strand
// that crosses a page edge has the same seed on both pages (its height on the wall), so its two halves swing as one.
const SWING = { hanger: 3.2, 'edge-hanger': 3, climber: -1, 'edge-climber': -1 };   // peak, degrees; climbers lean the other way (rooted below)
function swayResponse(f, zeta, dir) {
  const T = PAN_MS / 1000, total = T + SWAY_SETTLE / 1000, dt = 1 / 240, w = 2 * Math.PI * f, out = [];
  let d = 0, v = 0, peak = 1e-6;
  for (let t = 0, k = 0; t <= total + 1e-9; t += dt, k++) {
    const a = t < T ? -dir * PROFILE.A(t / T) : 0;   // the page's acceleration (px/s^2 up to scale): it moves against dir
    v += (-a - w * w * d - 2 * zeta * w * v) * dt; d += v * dt;   // in the page's frame the strand feels -a
    if (k % 8 === 0) out.push(d);   // 30 samples a second
    peak = Math.max(peak, Math.abs(d));
  }
  // it settles to rest, it is never cut: over the last 35% of its time the swing eases out (smoothstep: zero slope at
  // the end), so the last keyframe is exactly 0 with no velocity, and the animation simply runs to its end
  const n = out.length - 1;
  return out.map((x, i) => { const u = Math.max(0, (i / n - 0.65) / 0.35); return (x / peak) * (1 - u * u * (3 - 2 * u)); });
}
function swayKeyframes(v, seedY, dx) {
  const peak = SWING[v.kind];
  if (!peak) return null;
  const h = (n) => { const s = Math.sin((seedY + n * 37.7) * 12.9898) * 43758.5453; return s - Math.floor(s); };
  const len = v.len || 300, f = Math.min(1.6, Math.max(0.8, 1.15 * Math.sqrt(300 / len))) * (0.9 + 0.2 * h(1)), zeta = 0.4 + 0.1 * h(2);
  const r = swayResponse(f, zeta, Math.sign(dx)), amp = peak * (0.8 + 0.4 * h(3)) * Math.min(1.3, Math.max(0.6, len / 300));
  return r.map((x) => ({ transform: `skewX(${(x * amp).toFixed(3)}deg)` }));
}
function swayOn(canvas, v, seedY, dx) {
  const frames = swayKeyframes(v, seedY, dx);
  if (!frames) return null;
  canvas.style.transformOrigin = `${(v.pts[0].x - v.box.x).toFixed(1)}px ${(v.pts[0].y - v.box.y).toFixed(1)}px`;
  return canvas.animate(frames, { duration: PAN_MS + SWAY_SETTLE, easing: 'linear' });
}
const near = (v, sy) => v.box.y + v.box.h > sy - 300 && v.box.y < sy + innerHeight + 300;
function swayLive(dx, sy) {
  return W.vines().filter((v) => !v.grows && near(v, sy)).map((v) => swayOn(v.canvas, v, v.pts[0].y + W.camera.y, dx)).filter(Boolean);
}
function swayOld(p, dx) {
  const out = [];
  for (const c of p.parts[0].querySelectorAll('canvas[data-vine]')) {
    const v = p.oldVines.get(c.dataset.vine);
    if (v && !v.grows && near(v, p.sy)) { const a = swayOn(c, v, v.pts[0].y + p.Y0, dx); if (a) out.push(a); }   // it moves with the new page
  }
  return out;
}

// ------------------------------------------------------------------ motion blur
// The wall and its ivy smear sideways with the camera's speed: strongest mid-move, nothing at rest. A horizontal-only
// Gaussian (SVG feGaussianBlur, stdDeviation "x 0") on the two wall layers for the length of the move only; its width
// follows the speed profile each frame. While it runs the wall layers stop clipping at their sides (tx-blurring), so
// the smear at the seam draws on more wall rather than on nothing (which showed as a dark line); the page being left
// is painted over the arriving one and clips itself, so nothing shows where it should not.
// (__tx.blurMode: 'svg', 'css' for an isotropic compositor-run CSS blur, 'off'.)
let blurFilter = null;
function startBlur(targets) {
  if (!targets.length) return null;
  if (tx.blurMode === 'css') {
    const frames = Array.from({ length: 25 }, (_, i) => ({ filter: `blur(${(BLUR_PEAK * 0.5 * whip(i / 24)).toFixed(2)}px)` }));
    let anims = [];
    return { run(ref) { anims = targets.map((e) => e.animate(frames, { duration: PAN_MS, easing: 'linear' })); if (ref.playState === 'paused') anims.forEach((a) => { a.pause(); a.currentTime = ref.currentTime; }); }, stop() { anims.forEach((a) => a.cancel()); } };
  }
  if (!blurFilter) {
    const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    svg.innerHTML = '<filter id="tx-motion-blur" x="-3%" y="0" width="106%" height="100%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="0 0" edgeMode="duplicate"/></filter>';
    document.body.append(svg);
    blurFilter = svg.querySelector('feGaussianBlur');
  }
  let raf = 0, last = '';
  const set = (sd) => { const v = `${sd.toFixed(1)} 0`; if (v !== last) { last = v; blurFilter.setAttribute('stdDeviation', v); } };
  set(0);
  targets.forEach((e) => { e.style.filter = 'url(#tx-motion-blur)'; });
  html.classList.add('tx-blurring');
  return {
    run(ref) { const step = () => { const w = whip((ref.currentTime || 0) / PAN_MS); set(BLUR_PEAK * w); heroCamera(w); raf = requestAnimationFrame(step); }; step(); },
    stop() { cancelAnimationFrame(raf); set(0); heroRest(); targets.forEach((e) => { e.style.filter = ''; }); html.classList.remove('tx-blurring'); },
  };
}

// ------------------------------------------------------------------ the header
// Every page has the same header, so it does not pan: the arriving page's header is shown pinned to the top of the
// screen for the length of the move (a copy, inert) while both pages' own headers are hidden, and it moves only as
// the scroll does: from where the old page's header was (off screen once it had been scrolled past) to where the new
// one will be. It starts in the old header's condensed or full state and eases into the new page's (the header's own
// padding transition), and a Menu left open does not carry over.
function pinHeader(p, timing) {
  const real = app.querySelector('.site-header');
  if (!real) return null;
  const h = real.offsetHeight, wasScrolled = p.oldHeader?.classList.contains('is-scrolled') ?? false;
  const pin = real.cloneNode(true), box = document.createElement('div');
  box.className = 'tx-header'; box.setAttribute('aria-hidden', 'true'); box.inert = true;
  box.style.width = `${app.offsetWidth}px`;
  pin.classList.remove('is-open');
  pin.classList.toggle('is-scrolled', wasScrolled);
  box.append(pin); document.body.append(box);
  if (p.oldHeader) p.oldHeader.style.visibility = 'hidden';
  real.style.visibility = 'hidden';
  requestAnimationFrame(() => pin.classList.toggle('is-scrolled', scrollY > 24));   // into the new page's state
  const from = Math.min(p.sy, h), to = Math.min(scrollY, h);
  const anims = [box.animate([{ transform: `translate3d(0, ${-from}px, 0)`, opacity: from >= h ? 0 : 1 }, { transform: `translate3d(0, ${-to}px, 0)`, opacity: to >= h ? 0 : 1 }], timing)];
  return { anims, done() { box.remove(); real.style.visibility = ''; } };
}

// ------------------------------------------------------------------ the GL wall tier
// When wall-gl.js is on, it draws the wall and ivy of both pages as one surface: each frame of the move it is given
// the camera (where the arriving page hangs, minus what is left of the move) and a blur amount from the speed (the
// CSS fallback's peak, 6 px sd at cruise). The ivy's swing stays here (the skew keyframes on each strand's canvas),
// and __tx.panning tells the GL tier what it needs about both pages.
function driveGL(p, dx, ref, sways) {
  const X = W.camera.x, Y = W.camera.y, panApi = window.__wallgl.pan;
  let raf = 0;
  tx.panning = { dir: p.dir, dx, from: { camera: { x: p.oldX, y: p.Y0 }, scrollY: p.sy, vines: [...p.oldVines.values()] }, to: { camera: { x: X, y: Y }, scrollY },
    progress: () => PROFILE.E(Math.min(1, (ref.currentTime || 0) / PAN_MS)), sways };
  html.classList.add('tx-gl-pan');
  const step = () => {
    const u = Math.min(1, (ref.currentTime || 0) / PAN_MS);
    const w = whip(u);
    panApi.camera(X - dx * (1 - PROFILE.E(u)), Y, { blur: BLUR_PEAK * w, ca: 1 + (CA_PEAK - 1) * w, zoom: heroPan ? 1 : 1 + 0.012 * w });
    heroCamera(w);
    raf = requestAnimationFrame(step);
  };
  step();
  return { stop() { cancelAnimationFrame(raf); panApi.camera(X, Y, { blur: 0, ca: 1, zoom: 1 }); heroRest(); panApi.end(); html.classList.remove('tx-gl-pan'); tx.panning = null; } };
}

// ------------------------------------------------------------------ a transition
let busy = null, rendering = null, ownPop = false;
const tx = { state: cam, wall, growth, last: null, log: [] };

function finishRunning() {
  if (!busy) return;
  busy.anims.forEach((a) => a.finish());
  // (the strands' swing is left to settle on its own: finishing it here would snap it to rest)
}

// Before app.js renders the next route: hold the old page, note what it had grown.
function prepare(to, dir, toCol, toScroll) {
  finishRunning();
  const t0 = performance.now(), sy = scrollY, Y0 = cam.Y;
  document.querySelector('dialog[open]')?.close();
  growth.set(cam.route, W.growth());
  const oldVines = new Map(W.vines().map((v) => [String(v.id), v]));
  // (the CSS still is counted from the room's top: home's starts under the hero, the other pages' at the page top)
  const gl = glPan(), oldX = W.camera.x, top0 = W.geo.top, toY = Y0 + sy - toScroll - (gl ? 0 : top0);
  // leaving home: the live hero keeps rendering while its host is moved, with the rest of the page, into the held layer
  const fromHome = cam.route === 'index';
  // leaving home during its opening: end the opening first (as any input does), so nothing stays dimmed for the intro
  if (html.classList.contains('intro-pending')) dispatchEvent(new KeyboardEvent('keydown'));
  if (fromHome) { heroHost = document.querySelector('.home-opening__scene') || heroHost; window.__siteHero?.hold?.(); }
  const { parts, held } = holdOldPage(sy, dir);
  // the camera moves before the next page is built, so the strands and fireflies about its edges are laid out for
  // where it will hang on the wall (one screen over, at the height the old page was being read at). With the GL tier,
  // it first snapshots this page's ivy and lights (pan.prepare: its snapshot runs as the first microtask, its bake over
  // the next frames), so the camera moves just after that, still before app.js renders the next page.
  let glReady = null, camSet = null;
  if (gl) {
    glReady = window.__wallgl.pan.prepare({ toX: toCol * colWidth(), toY }).catch(() => null);
    camSet = new Promise((r) => queueMicrotask(() => { setCamera(toCol, toY); r(); }));
  } else setCamera(toCol, toY);
  return { t0, sy, Y0, top0, fromHome, oldX, gl, glReady, camSet, dir, toCol, toScroll, parts, held, oldVines, oldHeader: parts[2].querySelector('.site-header'), from: cam.path, to };
}

// After app.js has rendered it: rebuild the room for it, place its wall, and pan.
async function reveal(p, title) {
  const m = { route: routeOf(new URL(location.href)), dir: p.dir };
  // arriving home: let the hero put its host back into the new #app first (its own observer, a microtask away)
  if (m.route === 'index') await null;
  m.hold = performance.now() - p.t0;
  html.classList.add('tx-panning');
  scrollTo({ top: p.toScroll, left: 0, behavior: 'instant' });
  const tm = performance.now();
  m.rebuilt = W.measure();
  W.setGrowth(growth.get(m.route) || []);   // as it was left here this visit, or fresh
  // the camera: one screen over, at the same height on the wall as the old page's view, again if the page turned out
  // too short to scroll to where it was expected, or (the CSS wall) if the room's top is not the page's top (home: the
  // room starts under the hero, and the still is counted from there)
  const wallY = p.Y0 + p.sy - scrollY - (p.gl ? 0 : p.top0 - W.geo.top);
  if (Math.abs(wallY - W.camera.y) > 0.5) setCamera(p.toCol, wallY);
  m.measure = performance.now() - tm;
  cam.path = location.pathname + location.search; cam.route = m.route;
  if (title) document.title = title;

  const vw = html.clientWidth, dx = p.dir * vw;
  const timing = { duration: reduced.matches ? 0 : PAN_MS, easing: PAN_EASE };
  const slide = (e, k, leaving) => e.animate(leaving
    ? [{ transform: 'translate3d(0, 0, 0)' }, { transform: `translate3d(${-dx * k}px, 0, 0)` }]
    : [{ transform: `translate3d(${dx * k}px, 0, 0)` }, { transform: 'translate3d(0, 0, 0)' }], timing);
  const anims = [];
  // the wall layer slides with the page, unless the GL tier draws the wall for both pages from the camera
  for (const name of p.gl ? ['bodies'] : ['albedo', 'light', 'bodies']) if (layer(name)) anims.push(slide(layer(name), DEPTH[name], false));
  anims.push(slide(app, DEPTH.app, false));
  // the page being left: its wall and lights, its haze and fireflies, its content, each at its own depth
  const [oldBack, oldAir, oldPage] = p.parts;
  anims.push(slide(oldPage, DEPTH.app, true));
  if (!p.gl) anims.push(slide(oldBack, 1, true));   // (with the GL tier it is hidden; only its ivy canvases' swing is read)
  anims.push(slide(oldAir, 1, true));
  const oldBodies = oldAir.querySelector('.world-bodies');   // its fireflies a little nearer the camera than its wall
  if (oldBodies) anims.push(oldBodies.animate([{ transform: 'translate3d(0, 0, 0)' }, { transform: `translate3d(${-dx * (DEPTH.bodies - 1)}px, 0, 0)` }], timing));
  // the ivy on both pages swings with the move and settles after it (compositor-run keyframes, no redraws)
  const sways = reduced.matches ? [] : [...swayLive(dx, scrollY), ...swayOld(p, dx)];
  m.swaying = sways.length;
  // motion blur on both walls: in the GL tier's shader (camera-driven below), or the CSS fallback
  // (on the held page the blur goes on its whole clipped box, not on the wall inside it: Chrome widens an ancestor's clip
  // for a blurring descendant, which let the held wall show, unlit, a few px past the seam as a bright line)
  const blur = p.gl || reduced.matches || tx.blurMode === 'off' ? null : startBlur([layer('albedo'), oldBack].filter(Boolean));
  // the header every page shares stays where it is; only what is below it pans
  const header = pinHeader(p, timing);
  if (header) anims.push(...header.anims);
  const seam = layer('light') && feather(layer('light'), p.dir > 0 ? 'left' : 'right');
  if (seam) anims.push(seam.animate([{ opacity: 1 }, { opacity: 1, offset: 0.45 }, { opacity: 0 }], timing));
  anims.forEach((a) => a.pause());
  sways.forEach((a) => a.pause());
  busy = { anims, sways };

  // the next page's first photos, decoded before it comes into view (held for a moment at most)
  const td = performance.now();
  const first = [...app.querySelectorAll('img')].filter((img) => { const r = img.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; });
  first.forEach((img) => { img.loading = 'eager'; });
  await Promise.race([Promise.all(first.map((img) => img.decode().catch(() => {}))), new Promise((r) => setTimeout(r, DECODE_WAIT))]);
  m.decode = performance.now() - td; m.photos = first.length;
  // the GL tier's bake of the wall for the whole move (a slice per frame)
  if (p.glReady) { const tg = performance.now(); await p.glReady; m.glBake = Math.round(performance.now() - tg); }
  // arriving home: the live hero, back in the page and drawing before the move starts (or brought in for the first time
  // in this document; never longer than a moment: the GL wall shows the home column meanwhile)
  if (m.route === 'index') {
    const H = window.__siteHero, th = performance.now();
    // (ensure() mounts the hero if this document has it, ~12 ms, or makes it, ~0.9 s from a document that never had it,
    // resolving on its first frame; the GL wall's home column shows meanwhile. Capped, so a stall never holds the pan.)
    try { if (H?.ensure) await Promise.race([H.ensure({ intro: false }), new Promise((r) => setTimeout(r, 3000))]); }
    catch (err) { console.warn('[tx] hero', err); }
    m.hero = Math.round(performance.now() - th);
  }
  // three frames with nothing moving yet (warmFrames): the new page and the held one are laid out and rastered while the
  // screen still shows the old page exactly as it was, so the pan starts on a warm compositor rather than catching on its
  // first frames (with two, 1 run in 4 had one 34-83 ms frame early in the pan; with three, none in 12)
  const tw = performance.now();
  for (let k = 0; k < tx.warmFrames; k++) await new Promise((r) => requestAnimationFrame(r));
  m.warm = performance.now() - tw;

  // frame pacing over the pan (main thread)
  const gaps = [];
  let last = performance.now(), on = true;
  const tick = (t) => { gaps.push(t - last); last = t; if (on) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  m.start = performance.now() - p.t0;
  heroPan = p.fromHome || m.route === 'index';
  anims.forEach((a) => a.play());
  sways.forEach((a) => a.play());
  blur?.run(anims[0]);
  const glDrive = p.gl ? driveGL(p, dx, anims[0], sways) : null;
  if (tx.freeze != null) [...anims, ...sways].forEach((a) => { a.pause(); a.currentTime = PAN_MS * tx.freeze; });   // debug: hold the pan part-way (__tx.release())
  await Promise.all(anims.map((a) => a.finished.catch(() => {})));
  on = false;
  blur?.stop();
  glDrive?.stop();
  header?.done();
  m.total = performance.now() - p.t0;
  m.gaps = gaps.map(Math.round); m.frames = gaps.length; m.worst = Math.round(Math.max(0, ...gaps.slice(1))); m.slow = gaps.slice(1).filter((g) => g > 20).length;
  anims.forEach((a) => a.cancel());
  p.parts.forEach((e) => e.remove());
  // the strands on the new page carry on settling for a moment after the move; their keyframes end at rest
  Promise.all(sways.map((a) => a.finished.catch(() => {}))).then(() => sways.forEach((a) => { a.cancel(); a.effect?.target && (a.effect.target.style.transformOrigin = ''); }));
  p.held.release();
  seam?.remove();
  if (p.fromHome && m.route !== 'index') window.__siteHero?.park?.();   // the hero rests, its state kept, until home again
  if (busy?.anims !== anims) return;   // cut short by the next one, which carries on from here
  html.classList.remove('tx-panning');
  busy = null;
  writeEntry({ scroll: scrollY });
  // focus the new page's heading for keyboard and screen-reader users, without scrolling
  const h1 = app.querySelector('h1');
  if (h1 && !app.contains(document.activeElement)) { h1.tabIndex = -1; h1.focus({ preventScroll: true }); }
  for (const k of ['hold', 'measure', 'decode', 'warm', 'start', 'total']) m[k] = Math.round(m[k] * 10) / 10;
  tx.last = m; tx.log.push(m);
}

// the lights go down, then the next document loads (and brings them back up: transitions.css)
function dipTo(url) {
  try { sessionStorage.setItem('tx-arrive', '1'); } catch {}
  if (reduced.matches) { location.assign(url); return; }
  html.classList.add('tx-dipping');
  setTimeout(() => location.assign(url), DIP_MS);
}

async function go(url, { push = true } = {}) {
  url = new URL(url, location.href);
  if (url.pathname.endsWith('/')) url.pathname += 'index.html';   // the site's root is home
  if (url.pathname + url.search === cam.path) { scrollTo({ top: 0, behavior: reduced.matches ? 'instant' : 'smooth' }); return; }
  if (!eligible(url)) { dipTo(url.href); return; }
  const info = await page(url);
  if (!info.ok) { dipTo(url.href); return; }
  const from = cam.route, dir = directionTo(from, routeOf(url));
  writeEntry({ scroll: scrollY });
  history.scrollRestoration = 'manual';
  const p = prepare(url, dir, cam.col + dir, 0);
  if (p.camSet) await p.camSet;   // (a microtask: nothing is painted in between)
  history.pushState({ tx: { col: cam.col + dir, scroll: 0 } }, '', url.href);
  ownPop = true;
  dispatchEvent(new PopStateEvent('popstate', { state: history.state }));   // app.js renders the route the URL names
  ownPop = false;
  await reveal(p, info.title);
}

// back / forward: the old page has to be held before app.js replaces it, so this is called from a popstate listener
// registered in <head> before app.js's own (listeners run in the order they were added; a capture listener here does
// not run first in Chrome). The pan runs from a listener added after app.js's, once it has rendered.
window.__txPop = (e) => {
  if (ownPop) return;
  const url = new URL(location.href);
  if (url.pathname + url.search === cam.path) return;          // a hash change: nothing to do
  if (!panRoute(url)) { rendering = null; return; }
  const to = e.state?.tx ?? { col: cam.col - 1, scroll: 0 };
  history.scrollRestoration = 'manual';
  rendering = prepare(url, Math.sign(to.col - cam.col) || -1, to.col, to.scroll);
};
addEventListener('popstate', () => {
  if (ownPop || !rendering) return;
  const p = rendering; rendering = null;
  reveal(p, null);
  page(new URL(location.href)).then((info) => { if (info.title) document.title = info.title; });
});

// links: same-site subpages pan; home and anything else on this site dips; everything else is left alone
document.addEventListener('click', (e) => {
  const a = e.target.closest?.('a[href]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (a.target && a.target !== '_self' || a.hasAttribute('download')) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname)) return;
  if (url.pathname === location.pathname && url.hash) return;
  e.preventDefault();
  go(url);
});
// warm the next page's shell while the pointer is on its way
document.addEventListener('pointerover', (e) => {
  const a = e.target.closest?.('a[href]');
  if (!a) return;
  const url = new URL(a.href, location.href);
  if (eligible(url)) page(url);
}, { passive: true });

window.__tx = Object.assign(tx, { go, ORDER, freeze: null, release: finishRunning, warmFrames: 3, blurMode: 'svg', PROFILE, PAN_EASE });
