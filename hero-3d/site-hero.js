// Local-only: puts the WebGL hero behind the real site's home opening (hero + definition) and runs the intro:
// all black, the sign strikes and lights the room, the scene settles, then the header and the rest of the page arrive.
// As the page scrolls the camera travels down the same wall, through the "Inside Instinct" panel, and hands over to the
// wall further down (lab/world) with a soft fade.
//
// One document, many pages (lab/world/transitions.js renders other routes in place and pans between them): the hero
// stays alive across them instead of being made again. This module is in every page's shell; three.js and the hero
// itself are only loaded when the home page is shown. For page transitions:
//   __siteHero.hold()        the home page is being left: keeps rendering (camera held where it was) while its layer slides off
//   __siteHero.park()        after the move: stops rendering, keeps everything (GPU memory included)
//   __siteHero.mount(app?)   the home page is shown again: back into #app, laid out for the current scroll, drawn at once
//   __siteHero.resume()      the same, into the current #app
//   __siteHero.ensure({ intro: false })  a document that started elsewhere: make the hero (sign lit, no intro), fade it in;
//                            resolves once its first frame is drawn (mounts it if it already exists)
//   __siteHero.camera({ blur, ca })  every frame of a pan that carries it: motion blur (CSS px) and the aberration multiple
//   __siteHero.setCA(mult)   the radial chromatic aberration as a multiple of its resting strength (pans ramp it)
//   __siteHero.wallAt(x, y)  the hero's wall (world xy) at a page point, from the page's layout alone (lab/world/wall-gl.js)
const root = document.documentElement;
const params = new URLSearchParams(location.search);
const SKIP_EVENTS = ['wheel', 'keydown', 'pointerdown', 'touchstart', 'scroll'];   // the scrollbar stays during the intro
const HANDOVER = 320;   // px over which the live wall fades into the page below it (lab/world draws the wall there)
const PAN = params.has('pan') ? Number(params.get('pan')) : null;   // debug (captures): the camera held at this scroll
const CAM_Z = 16, TAN15 = Math.tan(Math.PI / 12);   // as hero.js
let hero = null, creating = null, mode = 'live', heldPan = null;

function reveal() {
  if (!root.classList.contains('intro-pending')) return;
  root.classList.remove('intro-pending');
  SKIP_EVENTS.forEach((type) => removeEventListener(type, skip));
  setTimeout(() => root.classList.remove('intro'), 2600);
}
function skip() { hero?.skipIntro(); reveal(); }
if (root.classList.contains('intro-pending')) {
  SKIP_EVENTS.forEach((type) => addEventListener(type, skip, { passive: true }));
  setTimeout(reveal, 12000);   // never hold the site hostage if something stalls
}

const host = document.createElement('div');
host.className = 'home-opening__scene';
let app = document.getElementById('app');
const opening = () => app.querySelector('.home-opening');
// keep the wordmark centred on the hero section, not on the whole opening (hero + definition)
const focusY = () => {
  const o = opening(), h = o?.querySelector('.home-hero');
  return o && h ? (h.offsetTop + h.offsetHeight * .5) / o.offsetHeight : .5;
};

// The canvas is positioned on the page, not fixed to the screen: each frame the hero draws is placed where it belongs,
// and between frames the page carries it like everything else, so it can never trail a fast scroll. It overhangs the
// screen by OVERSCAN above and below, so a late frame never shows an edge.
let OVERSCAN = .2;
const box = { top: 0, height: 1, end: 1, ov: 0 };
// page geometry, in page px: the opening is the frame the scene is composed in; the live wall runs on to the bottom of
// the panel after it
function measure() {
  const o = opening();
  if (!o || mode === 'held') return;   // (held: its page is sliding off, laid out as it was)
  const r = o.getBoundingClientRect(), panel = o.nextElementSibling?.matches('.preview-panel') ? o.nextElementSibling : o;
  Object.assign(box, { top: r.top + scrollY, height: o.offsetHeight, end: panel.getBoundingClientRect().bottom + scrollY, ov: Math.round(innerHeight * OVERSCAN) });
  host.style.height = `${innerHeight + 2 * box.ov}px`;
}
const frame = () => { measure(); return { height: box.height, top: box.top + box.ov, shift: box.ov, below: box.end + HANDOVER - (box.top + box.height) }; };
function placeCanvas(panPx) {
  const top = panPx - box.ov;
  host.style.transform = `translate3d(0, ${top}px, 0)`;
  host.style.setProperty('--live-end', `${box.end - top}px`);   // the fade into the baked wall, in the canvas's own px
}
const curPan = () => heldPan ?? PAN ?? scrollY;
const active = () => mode !== 'parked' && (mode === 'held' || curPan() <= box.end);
const onScroll = () => { if (mode === 'live') host.classList.toggle('is-off', scrollY > box.end); };
addEventListener('scroll', onScroll, { passive: true });
const resizer = new ResizeObserver(() => measure());

function place() {
  const o = opening();
  if (!o || !o.querySelector('.home-hero')) return null;   // phone layout or another route: leave the site as is
  if (host.parentNode !== app) app.prepend(host);
  o.classList.add('has-3d');
  return o;
}

// The hero's wall at a page point, from the layout alone (the settled camera: at the page's scroll, looking at the
// letters): the camera is CAM_Z from the wall, 30 degrees over the opening's height, pitched up towards half the
// wordmark's height; the screen's centre row is (innerHeight / 2 - opening top) into the composed frame.
function wallAt(px, py) {
  if (!opening()) return null;
  measure();
  const fh = box.height, wpp = 2 * CAM_Z * TAN15 / fh, wmY = CAM_Z * TAN15 * (1 - 2 * focusY());
  const a = Math.atan2(wmY * .5, CAM_Z), n = 1 - 2 * (innerHeight / 2 - box.top) / fh;
  const s = CAM_Z / (Math.cos(a) - TAN15 * n * Math.sin(a)), k = s * (TAN15 * n * Math.cos(a) + Math.sin(a));
  return { x: (px - root.clientWidth / 2) * wpp, y: k - (py - innerHeight / 2) * wpp, wpp };
}
// line the hero's wall up with the GL wall (lab/world/wall-gl.js) where the home page hangs on it: the same cracks run
// on under the fade. (A document that started at home: the GL wall took the hero's own, so nothing moves.)
function alignWall() {
  const G = window.__wallgl;
  if (!hero || !G?.worldAt || !G.wpp || !opening()) return;
  const px = root.clientWidth / 2, py = (box.end - 210);
  const h = wallAt(px, py), g = G.worldAt(px, py);
  if (!h || !g) return;
  const k = G.wpp / h.wpp, x = g[0] - h.x * k, y = g[1] - h.y * k;
  // (within a hair of identity, as on a visit that started here: leave the hero exactly as it is)
  if (Math.abs(k - 1) < 1e-6 && Math.abs(x) < 1e-3 && Math.abs(y) < 1e-3) hero.setWallXf(1, 0, 0);
  else hero.setWallXf(k, x, y);
}
document.addEventListener('wallgl:origin', () => alignWall());

async function create({ intro = true } = {}) {
  const o = place();
  if (!o) return null;
  measure(); placeCanvas(curPan());
  resizer.observe(app);
  const { createHero } = await import('./hero.js');
  try {
    hero = await createHero(host, { params, intro, focusY, pointerTarget: o, onSettled: reveal, frame, pan: curPan, active, place: placeCanvas,
      // hand the ivy on the wall to the page, so lab/world can carry it on down past the live wall
      onLayout: (ivy) => { window.__heroIvy = ivy; document.dispatchEvent(new CustomEvent('hero:ivy', { detail: ivy })); } });
  } catch (err) {
    console.warn('[hero] WebGL hero unavailable, keeping the static artwork', err);
    host.remove(); o.classList.remove('has-3d'); reveal();
    return null;
  }
  alignWall();
  return hero;
}

// app.js re-renders #app on breakpoint changes and status refreshes; carry the same canvas over instead of rebuilding
const appObserver = new MutationObserver(() => {
  if (!hero || mode !== 'live' || host.isConnected) return;
  const next = place();
  if (next) { hero.attach(host, next); measure(); }
});
appObserver.observe(app, { childList: true });

function mount(appEl = document.getElementById('app')) {
  if (appEl !== app) { resizer.unobserve(app); appObserver.disconnect(); app = appEl; resizer.observe(app); appObserver.observe(app, { childList: true }); }
  const o = place();
  if (!o || !hero) return false;
  mode = 'live'; heldPan = null;
  host.classList.remove('is-off');
  measure();
  hero.attach(host, o);   // (laid out again only if something moved)
  placeCanvas(curPan());
  alignWall();
  hero.render();
  return true;
}

window.__siteHero = {
  box,
  setOverscan(v) { OVERSCAN = v; measure(); },
  mask(on) { host.style.maskImage = host.style.webkitMaskImage = on ? '' : 'none'; },
  get hero() { return hero; },
  get mode() { return mode; },
  host,
  hold() { heldPan = curPan(); mode = 'held'; return host; },
  park() { mode = 'parked'; hero?.setCA(1); hero?.setMotion(); },
  mount,
  resume() { return mount(); },
  async ensure({ intro = false } = {}) {
    if (hero) { mount(); return hero.drawn; }
    if (!creating) {
      creating = (async () => {
        host.style.opacity = '0';
        const h = await create({ intro });
        if (!h) return null;
        h.render();   // its first frame now (it fades in over the GL wall's home column)
        await h.drawn;
        host.style.transition = 'opacity 300ms ease'; void host.offsetWidth; host.style.opacity = '1';
        setTimeout(() => { host.style.transition = ''; }, 320);
        return h;
      })();
    }
    const h = await creating;
    return h?.drawn;
  },
  setCA(mult = 1) { hero?.setCA(mult); },
  // every frame of a pan that carries the hero (as __wallgl.pan.camera): its motion blur (CSS px) and aberration
  // multiple; while it moves it draws with the lighter pipeline (as in a fling). camera() with no arguments: at rest.
  // lite: true drops the god rays and the haze pass while it moves (eased out over ~100 ms, back in over ~150 ms after)
  camera({ blur = 0, ca = 1, lite = false } = {}) { hero?.setCA(ca); hero?.setMotion({ low: blur > 0.05 || ca > 1.01, blur, lite }); },
  wallAt,
};

// the home page as loaded: make it at once, intro and all (?nohero: the page without the 3D hero, for comparisons)
if (params.has('nohero') || !opening()) reveal();
else if (opening()?.querySelector('.home-hero')) create({ intro: root.classList.contains('intro-pending') });
else reveal();
