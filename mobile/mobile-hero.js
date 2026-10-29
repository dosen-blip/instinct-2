// Local-only (lab/mobile): the hero on phones, baked from the real WebGL hero (tools/bake.js) and played back for almost
// nothing. Three plates of the same frame (same camera, same ivy), all covering the whole plate (no windows, so no edge
// can show at any point of the light), differing only in their light:
//   A  the sign alone, the room still dark
//   C  the room lit, the sign off (430 x 1520 CSS px at 3x)
//   S  the sign's light on the lit room: the baked "sign on, room lit" frame minus C, added over C (plus-lighter)
// Light adds, so the hero's own intro is reproduced by opacity alone, on the compositor (Web Animations, no per-frame
// script): black; the sign strikes (A at the hero's Flicker boot); the room comes up (C+S over A at the hero's room
// curve) while the camera settles (the plate scales from the dolly's 16/14.6 to 1); the header, the definition and the
// page follow at INTRO.reveal. After that the sign hums and now and then stutters or dips (S's level over C, a 40 s loop of the
// hero's Flicker), and a few fireflies drift and blink over the wall, waking one by one as the room comes up. All of it
// is precomputed keyframes, so a busy main thread or a fast flick can never make it stutter.
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
// the hum after the intro: a loop whose events are drawn once per visit (the hero draws them with Math.random too)
function humTrack(loop = 40) {
  const R = rng(Math.floor(Math.random() * 1e9)), events = [];
  for (let t = 2 + R() * 4; t < loop - 1.5; t += 2.5 + R() * 6) {
    const r = R(), type = r < 0.55 ? 'stutter' : r < 0.88 ? 'dip' : 'out';
    const dur = type === 'stutter' ? 0.15 + R() * 0.7 : type === 'dip' ? 0.25 + R() * 0.5 : 0.08 + R() * 0.35;
    events.push({ type, start: 3.4 + t, dur });
    t += dur;
  }
  // sampled from the steady hum on, then shifted to start at 0; the loop seam is the hum's own slow sine, nearly flat
  return flickerTrack(3.4, 3.4 + loop, events);
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
      <div class="m-plate__flies"></div>
    </div>
  </div>`;
const [imgA, imgC, imgS] = ['a', 'c', 's'].map((k) => host.querySelector(`.m-plate__${k}`));
const room = host.querySelector('.m-plate__room'), dolly = host.querySelector('.m-plate__dolly'), fliesEl = host.querySelector('.m-plate__flies');

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

// ------------------------------------------------------------------ fireflies over the hero (the hero's 24, thinned)
function flies() {
  const R = rng(91), rand = (a, b) => a + (b - a) * R(), halfW = 260, halfH = 474;   // compose px (520 x 948 frame)
  const list = [];
  const per = { moth: 3, blink: 6, orb: 5 };   // 14 (the hero has 24)
  const KINDS = { blink: { c: '184,255,71', s: 1 }, orb: { c: '140,255,184', s: 1.5 }, moth: { c: '255,219,140', s: 0.8 } };
  for (const kind of ['moth', 'blink', 'orb']) for (let i = 0; i < per[kind]; i++) {
    let x, y, ax, ay;
    if (kind === 'moth') { x = 260 + rand(-0.45, 0.45) * 322; y = PLATE.wordmarkY - rand(-0.6, 0.9) * 60; ax = rand(0.25, 0.6); ay = rand(0.12, 0.3); }
    else if (kind === 'blink') { x = 260 + rand(-0.2, 1) * halfW * (R() < 0.7 ? 1 : -1); y = halfH - rand(-0.95, 0.8) * halfH; ax = rand(0.4, 1.2); ay = rand(0.25, 0.6); }
    else { x = 260 + rand(-0.95, 0.95) * halfW; y = halfH - rand(-0.8, 0.85) * halfH; ax = rand(0.4, 1.2); ay = rand(0.25, 0.6); }
    // frequencies rounded to whole cycles per loop, so the 60 s path loops seamlessly
    const LOOP = 60, f = (a, b) => Math.max(1, Math.round(rand(a, b) * (kind === 'moth' ? 1.3 : 1) * LOOP / (2 * Math.PI))) * 2 * Math.PI / LOOP;
    list.push({ kind, ...KINDS[kind], x: x - PLATE.crop, y, ax: ax / PLATE.wpp, ay: ay / PLATE.wpp, fx: f(0.08, 0.25), fy: f(0.1, 0.3), px: R() * 6.3, py: R() * 6.3, period: rand(2.6, 6.5), offset: R() * 10, z: R(), LOOP });
  }
  return list;
}
function buildFlies(list) {
  return list.map((f, i) => {
    const wake = document.createElement('i'); wake.className = 'm-fly';
    const body = document.createElement('i'); body.className = 'world-fly';
    const glow = document.createElement('i'); glow.className = 'm-fly__light';
    body.style.setProperty('--c', f.c); body.style.setProperty('--s', (f.s * (0.8 + 0.5 * f.z)).toFixed(2));
    glow.style.setProperty('--c', f.c);
    const drift = document.createElement('i'); drift.className = 'm-fly__drift';   // carries it after the scroll (followFlies)
    wake.append(glow, body); drift.append(wake);
    fliesEl.append(drift);
    wake.style.left = `${f.x.toFixed(1)}px`; wake.style.top = `${f.y.toFixed(1)}px`;
    return { ...f, i, wake, body, glow, drift };
  });
}
// As over the desktop hero (fx.js follow, pace), and as the world's fireflies below do: as the page scrolls, each firefly
// drifts down after the screen, by its own share of the scroll (.6-.95) and at its own pace (.35-.85 /s), so the ones in
// view trail along and float back into place once the page stops; the moths keep to the sign. Scroll-driven, so it only
// runs while one is still catching up. A firefly drifting into the plate's fade fades with it rather than being cut off
// at the plate's edge.
function followFlies(list) {
  const k = () => Number(host.style.getPropertyValue('--k')) || 1;
  const fl = list.filter((f) => f.kind !== 'moth').map((f) => ({ f, follow: 0.6 + 0.35 * (f.i * 0.618 % 1), pace: 0.35 + 0.5 * (f.i * 0.382 % 1), pan: null }));
  let raf = 0, last = 0;
  const tick = (now) => {
    const dt = Math.min((now - last) / 1000, 1 / 20), sk = k();
    last = now;
    let moving = false;
    for (const d of fl) {
      const to = scrollY * d.follow;
      d.pan = d.pan === null || still ? to : d.pan + (to - d.pan) * (1 - Math.exp(-dt * d.pace));
      if (Math.abs(to - d.pan) > 0.5) moving = true; else d.pan = to;
      const y = d.pan / sk;   // stage px
      d.f.drift.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
      d.f.drift.style.opacity = Math.min(1, Math.max(0, (PLATE.h - 120 - d.f.y - y) / 320)).toFixed(3);
    }
    raf = moving ? requestAnimationFrame(tick) : 0;
  };
  const go = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };
  addEventListener('scroll', go, { passive: true });
  go();
}
function animateFlies(list, n, at) {
  const anims = [];
  for (const f of list) {
    // drift: the hero's two sines per axis, 4 keyframes a second over the loop (slow enough for linear steps)
    const path = [];
    for (let k = 0; k <= f.LOOP * 4; k++) {
      const t = k / 4, s = (fr, ph) => Math.sin(t * fr + ph) + 0.35 * Math.sin(t * fr * 2.9 + ph * 1.3);
      path.push({ transform: `translate3d(${(f.ax * s(f.fx, f.px)).toFixed(1)}px, ${(f.ay * s(f.fy, f.py)).toFixed(1)}px, 0)` });
    }
    // blink: its level over one period (a soft swell), or a slow breathing for orbs and moths
    const level = [], P = f.kind === 'blink' ? f.period : f.kind === 'orb' ? 2 * Math.PI / 0.6 : 2 * Math.PI / 0.9;
    for (let k = 0; k <= Math.round(P * HZ); k++) {
      const t = k / HZ;
      const v = f.kind === 'blink' ? 0.12 + 0.88 * Math.exp(-(((t + f.offset) % f.period - 0.8) ** 2) / 0.09)
        : f.kind === 'moth' ? 0.6 + 0.25 * Math.sin(t * 0.9 + f.i * 3) : 0.45 + 0.35 * Math.sin(t * 0.6 + f.offset);
      level.push({ opacity: +v.toFixed(3) });
    }
    const o = { iterations: Infinity, easing: 'linear' };
    anims.push(f.body.animate(path, { ...o, duration: f.LOOP * 1000, iterationStart: (f.offset / f.LOOP) % 1 }));
    anims.push(f.glow.animate(path, { ...o, duration: f.LOOP * 1000, iterationStart: (f.offset / f.LOOP) % 1 }));
    anims.push(f.body.animate(level, { ...o, duration: P * 1000, composite: 'replace' }));
    anims.push(f.glow.animate(level, { ...o, duration: P * 1000 }));
    // they wake one by one as the room comes up (hero: (room - i / N * .45) / .55, smoothstepped)
    if (at !== null) {
      const wake = roomTrack().map((r) => { const w = Math.min(1, Math.max(0, (r - f.i / n * 0.45) / 0.55)); return { opacity: +(w * w * (3 - 2 * w)).toFixed(4) }; });
      const a = f.wake.animate(wake, { duration: INTRO.roomEnd * 1000, fill: 'both', easing: 'linear' });
      a.startTime = at;
      introAnims.push(a);
    }
  }
  return anims;
}

// ------------------------------------------------------------------ intro
let introAnims = [], hum = null, loopAnims = [], revealed = false, introAt = null;
// the extra ivy the world layer hangs over the plate (.world-over) comes up with the room's light, on the same clock
function syncOver() {
  const over = document.querySelector('.world-over');
  if (!over || introAt === null || over.dataset.intro) return;
  over.dataset.intro = '1';
  const a = over.animate(roomTrack().map((v) => ({ opacity: v })), { duration: INTRO.roomEnd * 1000, fill: 'both', easing: 'linear' });
  a.startTime = introAt;
  introAnims.push(a);
  if (revealed) a.finish();
}
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
function startHum() {
  if (hum || still) return;
  const track = humTrack();
  hum = imgS.animate(track.map((v) => ({ opacity: v })), { duration: (track.length - 1) / HZ * 1000, iterations: Infinity, easing: 'linear' });
  loopAnims.push(hum);
}
function skip() {
  for (const a of introAnims) a.finish();
  imgA.style.display = 'none';
  startHum();
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
  r.finished.then(() => { timing.done = Math.round(performance.now() - timing.start); imgA.style.display = 'none'; startHum(); }).catch(() => {});
  // the page's reveal on the same clock as the light (an empty animation as a cue), so the two never drift apart
  const cue = room.animate([], { duration: INTRO.reveal * 1000 });
  cue.startTime = at;
  introAnims.push(cue);
  cue.finished.then(reveal).catch(() => {});
}

// ------------------------------------------------------------------ boot
window.__mobileHero = { host, timing, anims: () => [...introAnims, ...loopAnims], skip };
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
  const list = buildFlies(flies());
  followFlies(list);
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
    addEventListener('resize', () => requestAnimationFrame(publish));
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
  if (still || !root.classList.contains('intro-pending')) {
    imgA.style.display = 'none';
    if (!still) { startHum(); loopAnims.push(...animateFlies(list, list.length, null)); }
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
      loopAnims.push(...animateFlies(list, list.length, at));
      // a hard finish, counted from when the clock really started, well after the room should be up
      setTimeout(() => { if (!revealed || introAnims.some((a) => a.playState !== 'finished')) skip(); }, (INTRO.roomEnd + 3) * 1000);
    }
  }
  // nothing loops while the hero is off screen
  new IntersectionObserver(([e]) => { for (const a of loopAnims) e.isIntersecting ? a.play() : a.pause(); }).observe(host.querySelector('.m-plate__stage'));
}
