// Local-only (lab/mobile): the hero on phones, baked from the real WebGL hero (tools/bake.js) and played back for almost
// nothing. Three plates of the same frame (same camera, same ivy), all covering the whole plate (no windows, so no edge
// can show at any point of the light), differing only in their light:
//   A  the sign alone, the room still dark
//   C  the room lit, the sign off (430 x 1520 CSS px at 3x)
//   S  the sign's light on the lit room: the baked "sign on, room lit" frame minus C, added over C (plus-lighter)
// Light adds, so the hero's own intro is reproduced by opacity alone, on the compositor (Web Animations, no per-frame
// script): black; the sign strikes (A at the hero's Flicker boot); the room comes up (C+S over A at the hero's room
// curve) while the camera settles (the plate scales from the dolly's 16/14.6 to 1); the header, the definition and the
// page follow at INTRO.reveal. After that C+S becomes one static canvas and the decoded plates are released: nothing on
// the plate moves once the intro is over.
//
// The plate is positioned on the page (like the desktop canvas), behind the world's vignette and grain, so the hero gets
// the same grade as every other screen of the site. It fades into the world's baked wall over its last 420 px (world.js
// OVERLAP), and its ivy is handed to world.js, which carries it on down.
const root = document.documentElement;
const params = new URLSearchParams(location.search);
const phone = matchMedia('(max-width: 720px)').matches;
const still = matchMedia('(prefers-reduced-motion: reduce)').matches || params.has('still');
const INTRO = { roomStart: 2.9, roomEnd: 6.8, reveal: 5.4, settled: 6.4 };   // as hero.js
const PLATE = { w: 430, h: 1520, wordmarkY: 440, centerY: 474, win: [180, 780], crop: 45, wpp: 0.009045 };
// where the lit letters are on the plate (plate px, measured from plate A: x 53-372, y 431-481)
const WORDMARK = { x0: 53, y0: 431, x1: 372, y1: 481 };
const DOLLY = 16 / 14.6;   // hero: the camera starts 1.4 closer (CAM_Z 16) and settles back
const SKIP_EVENTS = ['wheel', 'keydown', 'pointerdown', 'touchstart', 'scroll'];
const HZ = 30;             // keyframe rate for the light tracks

const hash = (x) => { const s = Math.sin(x * 127.1) * 43758.5453; return s - Math.floor(s); };
const smoother = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * t * (t * (t * 6 - 15) + 10); };
const rng = (seed) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const url = (p) => new URL(p, import.meta.url).href;
const timing = { start: performance.now() };

// ------------------------------------------------------------------ the sign's light: hero fx.js Flicker, sampled
// boot (0-3.4 s): dead, a few failed strikes, then it catches; after that a hum, with stutters, dips and outs now and then
function flickerTrack(t0, t1, events = []) {
  const out = [];
  let value = 0;
  const dt = 1 / 240;   // the hero smooths at dt * 45 per frame; integrate finely, sample at HZ
  for (let t = 0, n = 0; t <= t1 + 1e-9; t += dt, n++) {
    let v = 0.93 + 0.04 * Math.sin(t * 2.3) * Math.sin(t * 0.71) + 0.03 * (hash(Math.floor(t * 24)) - 0.5);
    if (t < 3.4) {
      const strike = t > 0.7 && hash(Math.floor(t * 13)) > (t < 2 ? 0.72 : 0.35);
      v *= t < 0.7 ? 0 : t < 2.8 ? (strike ? 0.35 + 0.6 * hash(Math.floor(t * 31)) : 0.03) : Math.min(1, (t - 2.8) / 0.6 + 0.4);
    } else {
      const e = events.find((e) => t >= e.start && t < e.start + e.dur);
      if (e) {
        const p = (t - e.start) / e.dur;
        if (e.type === 'stutter') v *= hash(Math.floor(t * 38)) > 0.45 ? 1 : 0.12;
        else if (e.type === 'dip') v *= 1 - 0.55 * Math.sin(Math.PI * p);
        else v *= 0.04;
      }
    }
    value += (v - value) * Math.min(1, dt * 45);
    if (t >= t0 - 1e-9 && n % (240 / HZ) === 0) out.push(+value.toFixed(4));
  }
  return out;
}
const roomTrack = () => Array.from({ length: Math.round(INTRO.roomEnd * HZ) + 1 }, (_, i) => +smoother(INTRO.roomStart, INTRO.roomEnd, i / HZ).toFixed(4));

// ------------------------------------------------------------------ the plate on the page
const host = document.createElement('div');
host.className = 'home-opening__plate';   // world.js finds the live wall's end by this
host.setAttribute('aria-hidden', 'true');
// The plates get their src only once they are downloaded and decoded off the main thread (see boot), so no paint ever
// waits on them. decoding="sync" then just says "paint them in the frame that shows them" (from the decode cache): with
// "async" Chrome can leave an image out of a frame, and a page that is not producing frames shows a black plate.
host.innerHTML = `
  <div class="m-plate__stage">
    <div class="m-plate__dolly">
      <img class="m-plate__a" alt="" decoding="sync" width="1290" height="4560">
      <div class="m-plate__room">
        <img class="m-plate__c" alt="" decoding="sync" width="1290" height="4560">
        <img class="m-plate__s" alt="" decoding="sync" width="1290" height="4560">
      </div>
    </div>
  </div>`;
const [imgA, imgC, imgS] = ['a', 'c', 's'].map((k) => host.querySelector(`.m-plate__${k}`));
const room = host.querySelector('.m-plate__room'), dolly = host.querySelector('.m-plate__dolly');

// below the world's vignette and grain, above its wall and light: right after .world-light once world.js has built it
function seat() {
  const light = document.querySelector('.world-light');
  if (light && host.previousElementSibling !== light) light.after(host);
  else if (!light && !host.isConnected) document.body.prepend(host);
}
function scale() {
  // the plate is composed for 430 px; wider phones and small tablets scale it to cover (the wall's grain grows a little)
  host.style.setProperty('--k', Math.max(1, document.documentElement.clientWidth / PLATE.w).toFixed(4));
}

// (round 20: the hero's fireflies are gone on phones; every version with them stuttered on a real phone)

// ------------------------------------------------------------------ intro
let introAnims = [], revealed = false, introAt = null, plateReady = false, plateSettled = false;
// the extra ivy the world layer hangs over the plate (.world-over) comes up with the room's light, on the same clock
function syncOver() {
  const over = document.querySelector('.world-over');
  if (!over || introAt === null || over.dataset.intro) return;
  over.dataset.intro = '1';
  const a = over.animate(roomTrack().map((v) => ({ opacity: v })), { duration: INTRO.roomEnd * 1000, fill: 'both', easing: 'linear' });
  a.startTime = introAt;
  introAnims.push(a);
  a.finished.then(() => settle(a)).catch(() => {});
  if (revealed) a.finish();
}
// An opacity animation held at its end (fill: both) keeps its element a group the compositor composes off screen every
// frame, for nothing once it is at 1: the plate's room (the whole plate, recomposed with every step of the sign's hum)
// and the strands over it. Once one finishes, its end value is written to the element and the animation let go.
// (and dropped from the intro's list, so a later skip() does not finish it, and hold it, again)
function settle(a) { try { a.commitStyles(); a.cancel(); } catch {} introAnims = introAnims.filter((x) => x !== a); }
document.addEventListener('world:room', () => syncOver());
function reveal() {
  if (revealed) return;
  revealed = true;
  timing.reveal = Math.round(performance.now() - timing.start);
  root.dataset.heroTiming = JSON.stringify(timing);   // readable from outside (a DOM dump, a remote phone)
  root.classList.remove('intro-pending');
  SKIP_EVENTS.forEach((type) => removeEventListener(type, skip));
  setTimeout(() => root.classList.remove('intro'), 2600);
  document.dispatchEvent(new CustomEvent('hero:revealed'));
}
function settlePlate() {
  // Keep the sign lit after the intro, then flatten its two large image layers once. A looping light blended over
  // a 4560px-tall plate kept that entire surface live even while the phone was trying to scroll past it.
  if (!plateReady || plateSettled) return;
  plateSettled = true;
  Promise.all([imgC.decode(), imgS.decode()]).then(() => {
    const c = document.createElement('canvas'), density = Math.min(devicePixelRatio || 1, 1.5);
    c.width = Math.round(PLATE.w * density); c.height = Math.round(PLATE.h * density);
    c.className = 'm-plate__finished';
    const g = c.getContext('2d');
    g.drawImage(imgC, 0, 0, c.width, c.height);
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.95;
    g.drawImage(imgS, 0, 0, c.width, c.height);
    // Release finished animation groups and decoded plate references once the final canvas is ready.
    for (const a of [...introAnims]) if (a.playState === 'finished') settle(a);
    room.replaceChildren(c);
    for (const img of [imgA, imgC, imgS]) { img.removeAttribute('src'); img.remove(); }
  }).catch(() => { plateSettled = false; });
}
function skip() {
  for (const a of introAnims) a.finish();
  imgA.style.display = 'none';
  settlePlate();
  reveal();
}
function intro(at) {
  const glow = flickerTrack(0, INTRO.roomEnd).map((v) => ({ opacity: v }));
  const o = { duration: INTRO.roomEnd * 1000, fill: 'both', easing: 'linear' };
  const a = imgA.animate(glow, o), b = imgS.animate(glow, o);
  const r = room.animate(roomTrack().map((v) => ({ opacity: v })), o);
  const d = dolly.animate([{ transform: `scale(${DOLLY})` }, { transform: 'scale(1)' }], { duration: INTRO.settled * 1000, fill: 'both', easing: 'cubic-bezier(.33, 1, .68, 1)' });
  introAnims.push(a, b, r, d);
  introAt = at;
  syncOver();
  for (const x of [a, b, r, d]) x.startTime = at;   // one clock for all of them
  r.finished.then(() => { timing.done = Math.round(performance.now() - timing.start); imgA.style.display = 'none'; settle(r); settlePlate(); }).catch(() => {});
  // the page's reveal on the same clock as the light (an empty animation as a cue), so the two never drift apart
  const cue = room.animate([], { duration: INTRO.reveal * 1000 });
  cue.startTime = at;
  introAnims.push(cue);
  cue.finished.then(reveal).catch(() => {});
}

// ------------------------------------------------------------------ boot
window.__mobileHero = { host, timing, anims: () => [...introAnims], skip };
if (!phone || params.has('nohero')) {
  root.classList.remove('intro', 'intro-pending');
} else {
  root.classList.add('m-has-plate');
  scale();
  seat();
  new MutationObserver(seat).observe(document.body, { childList: true });
  addEventListener('resize', scale);
  if (root.classList.contains('intro-pending')) {
    SKIP_EVENTS.forEach((type) => addEventListener(type, skip, { passive: true }));
  }
  // the ivy painted on the plate, handed to the world layer in page px so it carries it on down (as site-hero.js does)
  fetch(url('./hero/hero-ivy.json')).then((r) => r.json()).then((ivy) => {
    const publish = () => {
      const r = host.querySelector('.m-plate__stage').getBoundingClientRect(), k = r.width / PLATE.w;
      // the wordmark and the definition, in page px, so the world's strands over the plate keep clear of both
      const x = (px) => r.left + scrollX + px * k, y = (py) => r.top + scrollY + py * k, def = document.querySelector('.home-definition');
      window.__heroPlate = { x0: x(WORDMARK.x0), y0: y(WORDMARK.y0), x1: x(WORDMARK.x1), y1: y(WORDMARK.y1), defTop: def ? def.getBoundingClientRect().top + scrollY : y(900) };
      const strands = ivy.strands.map((s) => s.map((n) => ({ x: r.left + scrollX + (n.x - PLATE.crop) * k, y: r.top + scrollY + n.y * k })));
      window.__heroIvy = { strands };
      document.dispatchEvent(new CustomEvent('hero:ivy', { detail: window.__heroIvy }));
    };
    publish();
    let ivyWidth = document.documentElement.clientWidth;
    addEventListener('resize', () => {
      const width = document.documentElement.clientWidth;
      if (width === ivyWidth) return;   // browser bars/keyboard: the page's ivy has not moved
      ivyWidth = width;
      requestAnimationFrame(publish);
    });
  });
  // 1. Download and decode all three plates off the main thread, holding the black meanwhile; no clock runs yet.
  //    (a page opened hidden may never finish decode(): once loaded, it gets 1.5 s, then goes on with the bytes)
  const SRC = { a: url('./hero/hero-a.webp'), c: url('./hero/hero-c.webp'), s: url('./hero/hero-s.webp') };
  const prep = (src) => {
    const i = new Image(); i.decoding = 'async'; i.src = src;
    const loaded = new Promise((r) => { if (i.complete) r(); else { i.onload = r; i.onerror = r; } });
    return Promise.race([i.decode(), loaded.then(() => new Promise((r) => setTimeout(r, 1500)))]).catch(() => loaded);
  };
  const giveUp = new Promise((r) => setTimeout(r, 15000));   // never hold the site hostage: show what there is
  await Promise.race([Promise.all(Object.values(SRC).map(prep)), giveUp]);
  timing.decoded = Math.round(performance.now() - timing.start);
  imgA.src = SRC.a; imgC.src = SRC.c; imgS.src = SRC.s;
  plateReady = true;
  if (still || !root.classList.contains('intro-pending')) {
    imgA.style.display = 'none';
    settlePlate();
    reveal();
  } else {
    // 2. The clock starts on the second frame the page actually paints with the plates in it. A page that is not
    //    painting at all (hidden, or a pane not shown) never gets there: if the main thread has been free for 1.5 s with
    //    no frame painted, the room is shown lit at once, without the reveal's fades (they would wait on that clock too).
    const ticks = { raf: 0, beats: 0 };
    const painted = new Promise((r) => { const f = () => (++ticks.raf >= 2 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    const stalled = new Promise((r) => { const iv = setInterval(() => { ticks.beats++; if (ticks.raf > 0) clearInterval(iv); else if (ticks.beats >= 6 || document.visibilityState === 'hidden') { clearInterval(iv); r(true); } }, 250); });
    if (await Promise.race([painted, stalled])) {
      timing.stalled = true; skip(); root.classList.remove('intro');
    } else if (!revealed) {
      const at = document.timeline.currentTime;
      timing.clock = Math.round(performance.now() - timing.start);
      intro(at);
      // a hard finish, counted from when the clock really started, well after the room should be up
      setTimeout(() => { if (!revealed || introAnims.some((a) => a.playState !== 'finished')) skip(); }, (INTRO.roomEnd + 3) * 1000);
    }
  }
}
