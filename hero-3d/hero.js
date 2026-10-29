import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { buildWordmarkSDF } from './wordmark.js';
import { buildStencil } from './stencil.js';
import { NFF, FS_VERT, BAKE_FRAG, GLOW_FRAG, WALL_VERT, WALL_FRAG, GRADE_FRAG, OCC_FRAG, HAZE_FRAG, FFMAP_VERT, FFMAP_FRAG } from './shaders.js';
import { Vines, rng } from './vines.js';
import { Flicker, Fireflies, Dust, GodRaysPass } from './fx.js';

// Intro timeline (seconds): black, the sign strikes and lights the room by itself (Flicker boot, ~0.7-3.4 s),
// then the room's own fill light, haze and fireflies come up and the camera settles back (dolly ends at `settled`).
// The page's reveal (onSettled) starts at `reveal`, under the tail of the room light, so the scene is still easing in
// as the header arrives instead of stopping first; the frame rate only starts stepping down after `calm` (reveal done).
// Every ramp ends with zero slope and zero acceleration (smootherstep / cubic), so nothing visibly lands.
// The sign's power-on (Flicker boot) runs at twice its old pace (.7-2.05 s), and every later marker comes 1.35 s sooner.
export const INTRO = { roomStart: 1.55, roomEnd: 5.45, reveal: 4.05, settled: 5.05, calm: 6.25 };
const CAM_Z = 16, BAKE_W = 4096;
const BOKEH = { band: .2, sd: 2.2 };   // edge bokeh: as lab/world/wall-gl.js
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const smoother = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * t * (t * (t * 6 - 15) + 10); };
// idle frame-rate steps (ms between frames) after `calm`: the display's own rate, then 60, 40 and 30 fps, ~0.8 s apart,
// so the cadence eases down instead of halving at once (on a 60 Hz display that is 60 -> 30, long after the intro)
const IDLE_STEPS = [[1500, 0], [2300, 1000 / 60], [3100, 1000 / 40], [Infinity, 1000 / 30]];
const assetUrl = (name) => new URL(`./assets/${name}`, import.meta.url).href;

/**
 * Mounts the WebGL hero into `container` (any positioned element; the canvas fills it).
 * focusY: fraction of the container height where the wordmark centre should sit.
 * onSettled: called once when the intro has finished settling.
 * pointerTarget: element whose pointer movement drives the camera parallax (defaults to the container).
 * frame: () => ({ height, top, below }) in CSS px. The scene is composed for a frame of that height whose top sits `top`
 *   px below the canvas top; the canvas is a window onto it (the site: a viewport-sized canvas over the home opening).
 *   `below` is how much more wall the page shows under the frame, so the wall maps reach that far.
 * pan: () => CSS px the camera has travelled down the wall (the site: page scroll, so the wall moves with the page).
 * active: () => false skips rendering (the site: the live part of the page is scrolled away).
 *   frame() may also give `shift`: how far above the pan the canvas's top sits (the site: overscan above the screen).
 * place: (panPx) => called just before a frame is drawn for that pan, so the page can put the canvas where that frame
 *   belongs (the site: a page-positioned canvas, which the page then carries until the next frame).
 * onLayout: called after every layout with the wall's ivy in page px ({ strands: [[{ x, y }, ...], ...] }, top to bottom),
 *   so the page can carry it on below the live wall.
 */
export async function createHero(container, { params = new URLSearchParams(), focusY = () => .485, onSettled = () => {}, pointerTarget = null,
  frame = null, pan = () => 0, active = () => true, onLayout = () => {}, place = () => {}, intro = true } = {}) {
  // intro: false starts with the sign already lit and the room up (the site arriving at home from another page)
  const canvas = document.createElement('canvas');
  canvas.className = 'hero3d-canvas';
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  canvas.setAttribute('aria-hidden', 'true');

  // ?legacy rebuilds the pre-optimisation pipeline (MSAA on both buffers, depth everywhere, separate OutputPass,
  // 1024px atlas) so the optimisations can be A/B diffed for pixel identity
  const legacy = params.has('legacy');
  // Tier 2 atmosphere: god rays from the glow map, haze in a reduced-res pass, quarter-res bloom, firefly light map.
  // ?t1 switches back to the previous per-pixel versions for A/B; ?fps60 turns off the 30 fps idle cap.
  const t2 = !legacy && !params.has('t1');
  const fullRate = params.has('fps60');
  // ?still=<world units per CSS px>&size=WxH&capture=1&png&keep=0 bakes a plain stretch of the wall (no sign, octopus, vines,
  // fireflies or haze, lit by the key light alone) at the page's scale, for the baked wall further down the site
  const stillWpp = params.has('still') ? Number(params.get('still')) || .009045 : 0;
  if (stillWpp) focusY = () => -4;   // the letters go far above the bake, out of its reach
  // &sdpr=3 renders the still at 3 px per CSS px (default 1); &density=6.3 bakes its wall fields at that many texels per
  // CSS px (default 1.33, the 2560 still's; the phone hero's plates have 6.3), for the phone wall (lab/world/assets)
  const stillDpr = Number(params.get('sdpr')) || 1, stillDensity = Number(params.get('density')) || 0;
  // ?capture=300 renders fixed 30fps frames (60Hz simulation) and POSTs them to a local receiver on :4600
  const capture = params.has('capture') ? { frames: Number(params.get('capture')) || 300, fps: 30, sub: 2 } : null;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!capture });
  const baseDpr = stillWpp ? stillDpr : Math.min(devicePixelRatio, 2);
  renderer.setPixelRatio(baseDpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
  let camZ = CAM_Z;
  camera.position.set(0, 0, camZ);

  // ------------------------------------------------------------------ assets
  const loader = new THREE.TextureLoader();
  const tex = (url, setup) => loader.loadAsync(url).then((t) => { setup(t); return t; });
  const [sdf, tDark, tLight, atlas, atlasMeta, octopus] = await Promise.all([
    buildWordmarkSDF(assetUrl('wordmark.svg')),
    tex(assetUrl('concrete-dark.webp'), (t) => { t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.anisotropy = 8; }),
    tex(assetUrl('concrete-light.webp'), (t) => { t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.anisotropy = 8; }),
    tex(assetUrl(legacy ? 'leaf-atlas-1024.webp' : 'leaf-atlas.webp'), (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; }),
    fetch(assetUrl(legacy ? 'leaf-atlas-1024.json' : 'leaf-atlas.json')).then((r) => r.json()),
    buildStencil(assetUrl('octopus.svg')),
  ]);

  // ------------------------------------------------------------------ shared uniforms
  // full-screen bakes and maps: nothing depth-tests into them, so no depth buffer
  const mipRT = (type) => new THREE.WebGLRenderTarget(1, 1, { type, depthBuffer: legacy, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
  const bakeRT = mipRT(THREE.HalfFloatType), glowRT = mipRT(THREE.HalfFloatType), shadowRT = mipRT(THREE.UnsignedByteType);
  const v2 = () => ({ value: new THREE.Vector2() }), v3 = (x = 0, y = 0, z = 0) => ({ value: new THREE.Vector3(x, y, z) });
  // the room's own light, scaled by the intro; the sign's glow is separate and lights the room from the start
  const ROOM = { amb: new THREE.Color(.008, .014, .01), key: new THREE.Color(.06, .08, .055), top: new THREE.Color(.34, .45, .3), haze: new THREE.Color(.0022, .0042, .0028) };
  // the mood (as the other pages: darker, more contrast): the room's fill (ambient + key) and its haze turned well down,
  // the overhead fixture (ROOM.top, also what the letters' gloss reflects) and the sign left as they are, and the green
  // lift of the blacks lowered with them. ?oldmood restores the brighter room for A/B. (The ?still bake keeps ROOM as is.)
  const MOOD = params.has('oldmood') ? { fill: 1, haze: 1, lift: 1 } : { fill: .57, haze: .57, lift: .57 };
  const U = {
    uTime: { value: 0 }, uPass: { value: 0 }, uPx: { value: 1 },
    uSdf: { value: sdf.texture }, uSdfMin: { value: new THREE.Vector2(...sdf.min) }, uSdfSize: { value: new THREE.Vector2(...sdf.size) },
    uWmCenter: v2(), uWmScale: { value: 1 }, uChipAmp: { value: 0 },
    uGlow: { value: 0 }, uBulb: v3(0, 0, 2), uGlowColor: { value: new THREE.Color(1, .94, .86) },
    uFF: { value: Array.from({ length: NFF }, () => new THREE.Vector4()) },
    uFFCol: { value: Array.from({ length: NFF }, () => new THREE.Color()) },
    uKeyDir: { value: new THREE.Vector3(-.55, .7, .45).normalize() }, uKeyCol: { value: ROOM.key.clone() },
    uTopPos: v3(), uTopCol: { value: ROOM.top.clone() }, uAmb: { value: ROOM.amb.clone() },
    uShadowShift: { value: new THREE.Vector2(.28, -.55) },
    uWallXf: { value: new THREE.Vector3(1, 0, 0) },   // the wall's material transform (shaders.js COMMON M(); set by setWallXf)
    tDark: { value: tDark }, tLight: { value: tLight }, uChipTex: { value: tLight },
    uDomMin: v2(), uDomSize: v2(),
    // the octopus spray-painted on the wall
    uOctTex: { value: octopus.texture }, uOctCenter: v2(), uOctSize: v2(), uOctColor: { value: new THREE.Color(.42, .62, .38) }, uOctOpacity: { value: .72 },
    // shared environment: letter glow as an area light, leaf shadow map, haze
    uGlowTex: { value: glowRT.texture }, uGlowRes: v2(), uGlowGain: { value: 1.25 },
    uShadow: { value: shadowRT.texture }, uHaze: { value: .075 }, uHazeCol: { value: ROOM.haze.clone() }, uFFHaze: { value: .0022 },
    uHazeInline: { value: t2 ? 0 : 1 },
  };
  const screenRT = () => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
  const hazeRT = screenRT(), ffLightRT = screenRT(), ffDirRT = screenRT();

  // ------------------------------------------------------------------ wall
  const growthCanvas = document.createElement('canvas');
  const growthTex = new THREE.CanvasTexture(growthCanvas);
  const bakeQuad = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: { ...U, tGrowth: { value: growthTex } }, vertexShader: FS_VERT, fragmentShader: BAKE_FRAG }));

  const wallUniforms = {
    ...U, uBake: { value: bakeRT.texture }, uBakeTexel: v2(),
    uDepth: { value: .2 }, uFaceGain: { value: 1.4 }, uSideGain: { value: 1.4 },
    uBumpBig: { value: 9 }, uBumpFine: { value: .9 },
    uFFMap: { value: ffLightRT.texture }, uFFDir: { value: ffDirRT.texture }, uFFMapOn: { value: t2 ? 1 : 0 },
  };
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ uniforms: wallUniforms, vertexShader: WALL_VERT, fragmentShader: WALL_FRAG }));
  scene.add(wall);
  const glowQuad = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: { ...U, uFaceGain: wallUniforms.uFaceGain }, vertexShader: FS_VERT, fragmentShader: GLOW_FRAG }));

  const vines = new Vines(U, atlas, atlasMeta);
  scene.add(vines.group);
  const fireflies = new Fireflies(U);
  scene.add(fireflies.points);
  const dust = new Dust(U);
  scene.add(dust.points);
  const shadowCam = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 50);
  shadowCam.position.z = 10;
  shadowCam.layers.set(1);

  // firefly light map: every firefly splats its light onto the wall plane once per frame (rgb light / xyz direction)
  const ffMapMat = new THREE.ShaderMaterial({
    uniforms: { ...U, uTexelWorld: { value: .04 }, uMode: { value: 0 } }, vertexShader: FFMAP_VERT, fragmentShader: FFMAP_FRAG,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor,
    depthTest: false, depthWrite: false, transparent: true,
  });
  const ffMapPoints = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(NFF * 3), 3)), ffMapMat);
  ffMapPoints.frustumCulled = false;
  ffMapPoints.layers.set(1);
  const ffMapScene = new THREE.Scene().add(ffMapPoints);

  // reduced-res atmosphere: god-ray source from the glow map (+ leaves as occluders) and the haze integral
  const viewUniforms = { uInvViewProj: { value: new THREE.Matrix4() }, uEye: { value: new THREE.Vector3() } };
  const occQuad = new FullScreenQuad(new THREE.ShaderMaterial({
    uniforms: { ...viewUniforms, uGlowTex: U.uGlowTex, uDomMin: U.uDomMin, uDomSize: U.uDomSize, uOccGain: { value: 1.35 } },   // matches the old face-emission source
    vertexShader: FS_VERT, fragmentShader: OCC_FRAG,
  }));
  const hazeQuad = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: { ...U, ...viewUniforms, tOcc: { value: null } }, vertexShader: FS_VERT, fragmentShader: HAZE_FRAG }));

  // ------------------------------------------------------------------ post
  // Only the scene render benefits from MSAA (leaf edges); the ping-pong buffer just takes full-screen passes,
  // so it gets neither MSAA nor depth. sceneTarget is kept as the composer's read buffer at the start of every frame.
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: legacy, samples: legacy ? 4 : 0 }));
  if (!legacy) {
    composer.renderTarget2.dispose();
    composer.renderTarget2 = composer.readBuffer = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  }
  const sceneTarget = composer.renderTarget2;
  composer.addPass(new RenderPass(scene, camera));
  const godrays = new GodRaysPass(legacy, (target) => {
    if (t2) return;   // rendered in renderAtmosphere(), which also feeds the haze
    U.uPass.value = 1; dust.points.visible = false;
    renderer.setRenderTarget(target); renderer.clear(); renderer.render(scene, camera);
    U.uPass.value = 0; dust.points.visible = true;
  }, t2 ? { shift: 2, taps: 64 } : {});
  if (t2) Object.assign(godrays.uniforms, { uDecay: { value: .952 }, uWeight: { value: .03 } });   // same ray length with fewer taps
  // the god-ray pass also composites the haze; uFF/uFFCol/uFFHaze are the shared live uniforms
  Object.assign(godrays.uniforms, { tHaze: { value: hazeRT.texture }, uHazeOn: { value: t2 ? 1 : 0 }, uHazeMix: { value: 1 }, uFF: U.uFF, uFFCol: U.uFFCol, uFFHaze: U.uFFHaze, ...viewUniforms });
  function renderAtmosphere(P = full) {
    viewUniforms.uInvViewProj.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).invert();
    viewUniforms.uEye.value.copy(camera.position);
    const godrays = P.godrays;
    renderer.setRenderTarget(godrays.occ);
    occQuad.render(renderer);
    vines.useOcclusionMaterials(true); camera.layers.set(1);
    const autoClear = renderer.autoClear; renderer.autoClear = false;
    renderer.render(scene, camera);
    renderer.autoClear = autoClear;
    camera.layers.set(0); vines.useOcclusionMaterials(false);
    hazeQuad.material.uniforms.tOcc.value = godrays.occ.texture;
    renderer.setRenderTarget(hazeRT);
    hazeQuad.render(renderer);
  }
  function renderFireflyMap() {
    const m = ffMapMat.uniforms.uMode;
    renderer.setClearColor(0x000000, 0);
    m.value = 0; renderer.setRenderTarget(ffLightRT); renderer.render(ffMapScene, shadowCam);
    m.value = 1; renderer.setRenderTarget(ffDirRT); renderer.render(ffMapScene, shadowCam);
    renderer.setClearColor(0x000000, 1);
  }
  const noRays = params.has('norays');   // ?norays keeps the pass (it carries the haze) but drops the shafts
  if (!t2) godrays.enabled = !noRays;
  composer.addPass(godrays);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .46, .65, .9);   // threshold high enough to leave the letter faces readable
  if (!legacy) for (const rt of [...bloom.renderTargetsHorizontal, ...bloom.renderTargetsVertical, bloom.renderTargetBright]) rt.depthBuffer = false;
  composer.addPass(bloom);
  // uCA 1.25 (was 1): the radial chromatic aberration a touch stronger toward the edges; still zero at the centre
  const grade = new ShaderPass({ uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uCA: { value: 1.25 }, uVignette: { value: 1 }, uGrain: { value: .03 }, uLift: { value: 0 }, uLiftCol: v3(.0025 * MOOD.lift, .008 * MOOD.lift, .004 * MOOD.lift), uRes: v2(), uEdges: { value: new THREE.Vector2(0, 1) }, uBokeh: { value: 0 }, uBand: { value: 1 }, uMBlur: { value: 0 } }, vertexShader: FS_VERT, fragmentShader: GRADE_FRAG });
  composer.addPass(grade);   // last pass: also does ACES tone mapping + sRGB (what OutputPass did), saving a full-screen pass
  if (legacy) composer.addPass(new (await import('three/addons/postprocessing/OutputPass.js')).OutputPass());
  const full = { composer, godrays, sceneTarget };

  // A second, lighter pipeline for when the page is flung past (the site only): the same passes at LOW of the
  // resolution and without MSAA, built once and warmed up while the intro is still black, so switching to it costs
  // nothing. It shares every uniform with the full one, and its last pass still draws into the full-size canvas, so
  // nothing is ever resized or cleared. Motion hides the softer image; at rest it is always the full one.
  const LOW = .62;
  const low = frame && t2 ? (() => {
    const c = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false }));
    c.renderTarget2.dispose();
    c.renderTarget2 = c.readBuffer = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    c.addPass(new RenderPass(scene, camera));
    const g = new GodRaysPass(false, () => {}, { shift: 2, taps: 64 });
    const shared = ['uLightUV', 'uTime', 'uExposure', 'uDensity', 'uDecay', 'uWeight', 'tHaze', 'uHazeOn', 'uHazeMix', 'uFF', 'uFFCol', 'uFFHaze', 'uInvViewProj', 'uEye'];
    for (const k of shared) g.uniforms[k] = godrays.uniforms[k];
    c.addPass(g);
    const b = new UnrealBloomPass(new THREE.Vector2(1, 1), bloom.strength, bloom.radius, bloom.threshold);
    for (const rt of [...b.renderTargetsHorizontal, ...b.renderTargetsVertical, b.renderTargetBright]) rt.depthBuffer = false;
    c.addPass(b);
    const gr = new ShaderPass({ uniforms: {}, vertexShader: FS_VERT, fragmentShader: GRADE_FRAG });
    gr.uniforms = gr.material.uniforms = grade.uniforms;
    c.addPass(gr);
    return { composer: c, godrays: g, sceneTarget: c.renderTarget2 };
  })() : null;
  let useLow = false, uPxFull = 1, moving = false, lite = false, liteF = 0;   // moving: a page transition carries the hero (setMotion)

  // ------------------------------------------------------------------ layout
  const debugLook = params.get('look')?.split(',').map(Number);
  const debugFov = Number(params.get('fov')) || 0;
  const view = { halfW: 1, halfH: 1, wpp: 1, wm: { w: 1, h: 1, y: 0 } };
  let layoutKey = '';
  function layout() {
    const w = container.clientWidth, h = container.clientHeight;
    const dpr = baseDpr;
    if (!w || !h) return;
    const fr = frame ? frame() : { height: h, top: 0, below: 0 }, fh = fr.height;
    // nothing moved (a remount after a page transition, a resize that came back): keep everything, ivy physics included
    const key = [w, h, fh, fr.top, fr.shift, fr.below, focusY()].join('|');
    if (key === layoutKey) return;
    layoutKey = key;
    view.shift = fr.shift || 0;
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    camera.aspect = w / fh;
    camera.fov = 30;
    if (frame) camera.setViewOffset(w, fh, 0, -fr.top, w, h);
    camera.updateProjectionMatrix();
    if (stillWpp) camZ = h * stillWpp / 2 / Math.tan(THREE.MathUtils.degToRad(15));   // same world scale as the page
    const halfH = camZ * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), halfW = halfH * camera.aspect;
    if (debugFov) { camera.fov = debugFov; camera.updateProjectionMatrix(); }
    const wmW = Math.min(halfW * 2 * .62, halfH * 2 * 1.35), wmScale = wmW / sdf.aspect;
    Object.assign(view, { halfW, halfH, fh, w, h, wpp: 2 * halfH / fh, wm: { w: wmW, h: wmScale, y: halfH * (1 - 2 * focusY()) } });
    U.uPx.value = uPxFull = fh * dpr / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    if (low) { low.composer.setPixelRatio(dpr * LOW); low.composer.setSize(w, h); }
    U.uWmScale.value = wmScale;
    U.uWmCenter.value.set(0, view.wm.y);
    U.uChipAmp.value = .028 * wmScale;
    // the octopus: a mural above and behind the sign. Its eyes (39% down the artwork) sit just above the letters,
    // the raised arms reach toward the top of the wall and the lower tentacles pass behind the sign.
    const octTop = halfH * .97, octEyes = view.wm.y + wmScale * 1.15, octH = Math.max(2.5, (octTop - octEyes) / .39);
    U.uOctCenter.value.set(0, octTop - octH / 2);
    U.uOctSize.value.set(octH * octopus.padScale[0], octH * octopus.padScale[1]);
    wallUniforms.uDepth.value = .2 * wmScale;
    U.uTopPos.value.set(halfW * .12, halfH * 1.35, 4.5);
    grade.uniforms.uRes.value.set(w * dpr, h * dpr);
    // edge bokeh, as on the rest of the site (lab/world/wall-gl.js BOKEH: band .2 of the screen, sd 2.2 CSS px at the edge)
    const screenH = frame ? Math.min(h, innerHeight) : h;
    grade.uniforms.uEdges.value.set(1 - (view.shift + screenH) / h, 1 - view.shift / h);
    grade.uniforms.uBokeh.value = stillWpp || params.has('nobokeh') ? 0 : BOKEH.sd * dpr;
    grade.uniforms.uBand.value = BOKEH.band * screenH * dpr;

    // static wall maps cover the view plus parallax margin
    const margin = stillWpp ? 2.4 : 2.5, dom = { x: halfW * margin, y: halfH * margin };
    const ground = { y0: -dom.y / 2, y1: -dom.y / 2 + dom.y * .3 };   // damp band at the foot of the wall, fixed in world space
    let domMinY = -dom.y / 2;
    if (frame) {
      // the page scrolls the wall down past the frame: reach that far, in steps of the coarsest map's texels so the
      // maps over the hero keep the same texel grid
      const need = -halfH - Math.max(fr.below, h - fh - fr.top) * view.wpp - 1.5, step = dom.x / 8;
      const extra = Math.max(0, Math.ceil((domMinY - need) / step) * step);
      dom.y += extra; domMinY -= extra;
    }
    U.uDomMin.value.set(-dom.x / 2, domMinY);
    U.uDomSize.value.set(dom.x, dom.y);
    wall.scale.set(dom.x, dom.y, 1);
    wall.position.y = domMinY + dom.y / 2;
    // a ?still wider than 2560 px keeps the bake's texel density (the wall's look) by widening the bake with it
    const stillK = stillWpp ? w / 2560 : 1;
    const bw = stillWpp && stillDensity ? Math.round(stillDensity * dom.x / view.wpp) : Math.round(BAKE_W * stillK), bh = Math.round(bw * dom.y / dom.x);
    bakeRT.setSize(bw, bh);
    wallUniforms.uBakeTexel.value.set(1 / bw, 1 / bh);
    shadowRT.setSize(2048, Math.round(2048 * dom.y / dom.x));
    glowRT.setSize(1024, Math.round(1024 * dom.y / dom.x));
    ffLightRT.setSize(512, Math.round(512 * dom.y / dom.x)); ffDirRT.setSize(512, Math.round(512 * dom.y / dom.x));
    ffMapMat.uniforms.uTexelWorld.value = dom.x / 512;
    hazeRT.setSize(Math.max(1, (w * dpr) >> 2), Math.max(1, (h * dpr) >> 2));
    U.uGlowRes.value.set(glowRT.width, glowRT.height);
    Object.assign(shadowCam, { left: -dom.x / 2, right: dom.x / 2, top: domMinY + dom.y, bottom: domMinY });
    shadowCam.updateProjectionMatrix();

    vines.build(halfW, halfH, view.wm, { extend: !!frame });
    growthCanvas.width = Math.round(1024 * stillK); growthCanvas.height = Math.round(growthCanvas.width * dom.y / dom.x);
    if (stillWpp) drawStillGrowth(growthCanvas);
    else vines.drawGrowth(growthCanvas, U.uDomMin.value, U.uDomSize.value, ground);
    growthTex.needsUpdate = true;
    renderer.setRenderTarget(bakeRT);
    bakeQuad.render(renderer);
    renderer.setRenderTarget(null);

    fireflies.layout(halfW, halfH, view.wm);
    dust.layout(halfW, halfH);
    lastPan = NaN;
    if (frame) onLayout(ivyOnPage());
  }

  // The static ivy below the hero, in page px, as the settled camera sees it (centred, no drift) once the page has
  // scrolled that point to the middle of the screen; anything standing off the wall would otherwise be off by parallax.
  function ivyOnPage() {
    const cam = camera.clone(), v = new THREE.Vector3(), w = container.clientWidth, h = container.clientHeight;
    const project = (n, pan) => {
      cam.position.set(0, -pan * view.wpp, camZ); cam.lookAt(0, view.wm.y * .5 - pan * view.wpp, 0); cam.updateMatrixWorld();
      v.set(n.rx, n.ry, n.rz).project(cam);
      return { x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * h + pan - view.shift };
    };
    const strands = vines.strands.filter((st) => st.still).map((st) => st.nodes
      .map((n) => ({ ...project(n, project(n, 0).y - h / 2), z: n.rz }))
      .sort((a, b) => a.y - b.y));
    return { strands };
  }

  // ------------------------------------------------------------------ input (camera parallax only for now)
  const pointer = { active: false, nx: 0, ny: 0 };
  const idlePointer = { active: false };
  let lastMove = -1e9, lastPan = NaN, lastPanAt = 0, speed = 0, lowResSince = -1e9, livelyAt = 0;
  const onMove = (e) => {
    lastMove = performance.now();
    const r = container.getBoundingClientRect();
    pointer.nx = (e.clientX - r.left) / r.width * 2 - 1;
    pointer.ny = -((e.clientY - r.top) / r.height * 2 - 1);
    pointer.active = true;
  };
  const onLeave = () => { pointer.active = false; };

  // ------------------------------------------------------------------ mounting, visibility
  let visible = true, resizeTimer;
  const resizer = new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(layout, 120); });
  const watcher = new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; });
  let pointerEl = null;
  function attach(el, pointerSource = el) {
    if (container) { resizer.unobserve(container); watcher.unobserve(container); }
    pointerEl?.removeEventListener('pointermove', onMove); pointerEl?.removeEventListener('pointerleave', onLeave);
    container = el; pointerEl = pointerSource;
    container.append(canvas);
    resizer.observe(container); watcher.observe(container);
    pointerEl.addEventListener('pointermove', onMove); pointerEl.addEventListener('pointerleave', onLeave);
    layout();
  }

  // ------------------------------------------------------------------ profiling (?profile): GPU timer queries per stage
  const gl = renderer.getContext();
  const tq = params.has('profile') ? gl.getExtension('EXT_disjoint_timer_query_webgl2') : null;
  const prof = tq ? { frames: 0, sum: {}, n: {}, pending: [], cpu: 0 } : null;
  let openQuery = null;
  const gpuBegin = () => { if (!prof) return; openQuery = gl.createQuery(); gl.beginQuery(tq.TIME_ELAPSED_EXT, openQuery); };
  const gpuEnd = (name) => { if (!prof || !openQuery) return; gl.endQuery(tq.TIME_ELAPSED_EXT); prof.pending.push({ q: openQuery, name }); openQuery = null; };
  const collect = () => {
    const disjoint = gl.getParameter(tq.GPU_DISJOINT_EXT);
    prof.pending = prof.pending.filter(({ q, name }) => {
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) return true;
      if (!disjoint) { prof.sum[name] = (prof.sum[name] || 0) + gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6; prof.n[name] = (prof.n[name] || 0) + 1; }
      gl.deleteQuery(q);
      return false;
    });
  };
  if (prof) for (const pass of composer.passes) {
    const render = pass.render.bind(pass), name = pass === grade ? 'gpu post: grade' : `gpu post: ${pass.constructor.name}`;
    pass.render = (...args) => { gpuBegin(); render(...args); gpuEnd(name); };
  }

  // ------------------------------------------------------------------ loop
  const flicker = new Flicker();
  const stats = params.has('stats') ? document.getElementById('stats') : null;
  if (stats) stats.style.display = 'block';
  let time = intro ? 0 : INTRO.roomEnd, last = performance.now(), frames = 0, fpsT = 0, settled = false;
  let firstFrame; const drawn = new Promise((r) => { firstFrame = r; });
  const introLog = params.has('introlog') ? (window.__introLog = []) : null;   // [t, glow, room, dolly, revealed, lift] per frame
  const camTarget = new THREE.Vector2(), camBase = new THREE.Vector2(), bulbScreen = new THREE.Vector3();

  function loop(now) { requestAnimationFrame(loop); tick(now); }
  // force: draw now, whatever the frame-rate cap and visibility say (a remount after a page transition)
  function tick(now, force = false) {
    if (!capture && !force && (!visible || document.hidden || !active())) { last = now; return; }   // captures must never skip a step
    // the camera travels down the wall exactly as far as the page has scrolled (world units at the wall plane)
    const panPx = pan();
    // how fast the page is going (px/s, smoothed): the page carries the canvas, so scrolling alone needs no extra
    // frames; only a fling does, to keep the overscan ahead of the screen's edge, and it can afford a softer image
    if (!Number.isNaN(lastPan) && now > lastPanAt) speed += (Math.abs(panPx - lastPan) / ((now - lastPanAt) / 1000) - speed) * .35;
    if (panPx === lastPan && now - lastPanAt > 120) speed *= .5;
    if (panPx !== lastPan) { lastPan = panPx; lastPanAt = now; }
    const flung = frame && speed > 1500;
    if (speed > 900) lowResSince = now;
    useLow = !!low && (moving || speed > 900 || now - lowResSince < 220);
    const panY = panPx * view.wpp;
    // full rate through the intro and the reveal, while the cursor moves the camera, and through a fling; once all of that
    // has been quiet a while the rate steps down to ~30 fps (the motion is slow), a step at a time
    const lively = fullRate || time < INTRO.calm || now - lastMove < 1200 || flung;
    if (lively) livelyAt = now;
    const cap = IDLE_STEPS.find(([until]) => now - livelyAt < until)[1];
    if (!capture && !force && cap && now - last < cap - 3) return;
    place(panPx);
    const dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    time += dt;
    U.uTime.value = time;

    // the sign: a lamp behind the wall that flickers and swings slowly on its cord
    const glow = params.has('steady') ? 1 : flicker.update(dt, time);
    U.uGlow.value = glow;
    const wm = view.wm;
    U.uBulb.value.set(Math.sin(time * .31) * wm.w * .3 + Math.sin(time * .83) * .12, wm.y + .12 * Math.sin(time * .47), wm.w * .3);

    // the room's own light comes up once the sign has caught
    const room = smoother(INTRO.roomStart, INTRO.roomEnd, time);
    U.uAmb.value.copy(ROOM.amb).multiplyScalar(room * MOOD.fill);
    U.uKeyCol.value.copy(ROOM.key).multiplyScalar(room * MOOD.fill);
    U.uTopCol.value.copy(ROOM.top).multiplyScalar(room);
    U.uHazeCol.value.copy(ROOM.haze).multiplyScalar(room * MOOD.haze);
    grade.uniforms.uLift.value = smooth(.6, 2.15, time);   // with the sign's boot
    if (!settled && time >= INTRO.reveal) { settled = true; onSettled(); }

    // camera: slow settle-in, idle drift, pointer parallax
    const dolly = 1 - Math.pow(1 - Math.min(1, time / INTRO.settled), 3);
    if (introLog && time < 9) introLog.push([+time.toFixed(3), +glow.toFixed(3), +room.toFixed(4), +dolly.toFixed(4), settled ? 1 : 0, +grade.uniforms.uLift.value.toFixed(3)]);   // ?introlog
    // as the page carries the camera down the wall it stops drifting, so the wall lines up with the page below the hero
    const settle = frame ? 1 - smooth(0, view.fh * .5, panPx) : 1;
    camTarget.set(pointer.active ? pointer.nx * .7 : 0, pointer.active ? pointer.ny * .4 : 0).multiplyScalar(settle);
    const ease = 1 - Math.exp(-dt * 2.14);   // time-based, so the camera feels the same at 30 and 60 fps
    camBase.x += (camTarget.x + Math.sin(time * .13) * .15 * settle - camBase.x) * ease;
    camBase.y += (camTarget.y + Math.sin(time * .17) * .08 * settle - camBase.y) * ease;
    camera.position.set(camBase.x, camBase.y - panY, camZ - 1.4 * (1 - dolly));   // the pan is exact, never eased: the wall stays locked to the page
    camera.lookAt(0, wm.y * .5 - panY, 0);
    if (stillWpp) { camera.position.set(0, 0, camZ); camera.lookAt(0, 0, 0); }
    if (debugLook) {
      // ?look=x,y&fov=n zooms the camera onto a spot for close inspection
      camera.position.set(debugLook[0], debugLook[1], camZ);
      camera.lookAt(debugLook[0], debugLook[1], 0);
    }
    camera.updateMatrixWorld();

    // pointer pushing vines/fireflies is switched off while we rebuild motion step by step
    const cpu0 = performance.now();
    vines.update(dt, time, idlePointer);
    fireflies.update(time, idlePointer, room, panY, dt);
    dust.follow(panY);
    if (stillWpp) stillScene();

    // emission of the letter openings, mipmapped: the light every surface and the haze read from
    if (prof) prof.cpu += performance.now() - cpu0;
    gpuBegin();
    renderer.setRenderTarget(glowRT);
    glowQuad.render(renderer);

    // leaf shadows projected onto the wall
    gpuEnd('gpu: glow map');
    gpuBegin();
    vines.useShadowMaterials(true);
    renderer.setRenderTarget(shadowRT);
    renderer.setClearColor(0x000000, 0); renderer.clear();
    renderer.render(scene, shadowCam);
    renderer.setClearColor(0x000000, 1);
    renderer.setRenderTarget(null);
    vines.useShadowMaterials(false);
    gpuEnd('gpu: leaf shadow map');
    const P = useLow ? low : full;
    U.uPx.value = uPxFull * (useLow ? LOW : 1);   // points are sized in the buffer's pixels
    // lite (a pan carrying the hero asks for it): the god rays and the haze ease out over ~100 ms and back in over ~150 ms;
    // once fully out their passes are skipped
    liteF = Math.min(1, Math.max(0, liteF + (lite ? dt / .1 : -dt / .15)));
    const keep = 1 - liteF * liteF * (3 - 2 * liteF);
    godrays.uniforms.uHazeMix.value = keep;
    if (t2) { renderFireflyMap(); if (keep > 0) renderAtmosphere(P); }

    bulbScreen.set(U.uBulb.value.x, U.uBulb.value.y, -wallUniforms.uDepth.value - U.uBulb.value.z).project(camera);
    godrays.uniforms.uLightUV.value.set(bulbScreen.x * .5 + .5, bulbScreen.y * .5 + .5);
    godrays.uniforms.uTime.value = time;
    // the shafts fan out from the bulb; once it is a screen and a half above the canvas they no longer reach it
    godrays.uniforms.uExposure.value = noRays || (frame && bulbScreen.y > 4) ? 0 : .1 * glow * keep;
    grade.uniforms.uTime.value = time;
    P.composer.render(dt);
    if (!legacy && P.composer.readBuffer !== P.sceneTarget) P.composer.swapBuffers();
    firstFrame();

    if (prof) {
      collect();
      if (++prof.frames % 120 === 0) {
        const rows = Object.fromEntries(Object.entries(prof.sum).map(([k, v]) => [k, +(v / prof.n[k]).toFixed(2)]));
        const gpu = +Object.values(rows).reduce((a, b) => a + b, 0).toFixed(2);
        window.__heroProfile = { frames: prof.frames, msPerFrame: rows, gpuTotal: gpu, cpuVinesFireflies: +(prof.cpu / prof.frames).toFixed(2) };
      }
    }
    if (stats) {
      frames++; fpsT += dt;
      if (fpsT > .5) { stats.textContent = `${Math.round(frames / fpsT)} fps · ${renderer.info.render.calls} calls`; frames = 0; fpsT = 0; }
    }
  }

  // ?still: only the wall, lit by the key light (so its relief reads) and a little ambient; the page lights it from there
  function stillScene() {
    vines.group.visible = fireflies.points.visible = dust.points.visible = false;
    U.uFF.value.forEach((v) => { v.w = 0; });
    U.uGlow.value = 0; U.uOctOpacity.value = 0;
    U.uKeyCol.value.copy(ROOM.key).multiplyScalar(Number(params.get('key')) || 30);
    U.uTopCol.value.setScalar(0); U.uAmb.value.copy(ROOM.amb).multiplyScalar(4); U.uHazeCol.value.setScalar(0);
    bloom.strength = 0; godrays.uniforms.uExposure.value = 0;
    grade.uniforms.uLift.value = grade.uniforms.uGrain.value = grade.uniforms.uVignette.value = grade.uniforms.uCA.value = 0;
  }
  // patchy damp for the bake's moss, since no ivy grows here to lead it
  // (a wider still keeps the 2560 px still's patches in its middle, at the same size, and adds as many again per width
  // on either side; at 2560 px this draws exactly what it always did)
  function drawStillGrowth(canvas) {
    const ctx = canvas.getContext('2d'), R = rng(77), W = canvas.width, H = canvas.height, S = 1024, side = W - S;
    ctx.fillStyle = 'rgb(92,92,92)'; ctx.fillRect(0, 0, W, H);
    ctx.filter = `blur(${Math.round(S / 40)}px)`;
    const n = 70 + Math.round(70 * side / S);
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = `rgba(${R() < .5 ? '255,255,255' : '0,0,0'},${.15 + .35 * R()})`;
      let x = i < 70 ? side / 2 + R() * S : R() * side;
      if (i >= 70 && x >= side / 2) x += S;
      ctx.beginPath(); ctx.arc(x, R() * H, S * (.02 + .08 * R()), 0, Math.PI * 2); ctx.fill();
    }
    ctx.filter = 'none';
  }

  async function runCapture() {
    const { frames: count, fps, sub } = capture;
    // &png for lossless frames, &keep=a,b,c to upload only those frame numbers
    const png = params.has('png'), keep = params.get('keep')?.split(',').map(Number);
    let now = 0;
    last = 0;
    for (let i = 0; i < count; i++) {
      for (let s = 0; s < sub; s++) { now += 1000 / fps / sub; tick(now); }
      if (keep && !keep.includes(i)) continue;
      const blob = await new Promise((r) => canvas.toBlob(r, png ? 'image/png' : 'image/jpeg', .92));
      await fetch(`http://127.0.0.1:4600/f${String(i).padStart(4, '0')}.${png ? 'png' : 'jpg'}`, { method: 'POST', body: blob });
      if (i % 30 === 0) console.log(`[hero] captured ${i}/${count}`);
    }
    console.log('[hero] capture done');
    document.title = 'capture done';
  }

  const target = container;
  container = null;
  attach(target, pointerTarget || target);
  // compile the scene's shaders off the main thread (KHR_parallel_shader_compile) while the page is still black
  await renderer.compileAsync(scene, camera);
  // warm the light pipeline up now (allocate its buffers, compile its passes) so the first fling doesn't pay for it
  if (low) { renderAtmosphere(low); low.composer.render(0); if (low.composer.readBuffer !== low.sceneTarget) low.composer.swapBuffers(); }
  if (capture) runCapture();
  else requestAnimationFrame((t) => { last = t; loop(t); });
  if (!intro) flicker.value = .93;   // already lit

  const api = {
    canvas, attach,
    get time() { return time; },
    // jump past the intro (e.g. the visitor scrolls or clicks before it finishes)
    skipIntro() { if (time < INTRO.roomEnd) time = INTRO.roomEnd; },
    // the first frame has been drawn
    drawn,
    // draw a frame now (after a remount), at the current pan
    render() { tick(performance.now(), true); },
    // the radial chromatic aberration, as a multiple of its resting strength (a pan ramps it: lab/world/transitions.js)
    setCA(mult = 1) { if (!stillWpp) grade.uniforms.uCA.value = 1.25 * mult; },
    // a page transition: the lighter pipeline while it moves (as in a fling), and its horizontal motion blur (CSS px)
    // lite: ease the god rays and the haze out while it moves (and back in after), skipping their passes when out
    setMotion({ low = false, blur = 0, lite: l = false } = {}) { moving = low; lite = l; grade.uniforms.uMBlur.value = blur * baseDpr; },
    // where the wall's material is read (world = material at world * k + (x, y)), so the hero's wall lines up with
    // lab/world/wall-gl.js's wherever the home page hangs on it; re-bakes the wall (a few ms)
    setWallXf(k, x, y) {
      if (U.uWallXf.value.x === k && U.uWallXf.value.y === x && U.uWallXf.value.z === y) return;
      U.uWallXf.value.set(k, x, y);
      renderer.setRenderTarget(bakeRT); bakeQuad.render(renderer); renderer.setRenderTarget(null);
    },
    get view() { return view; },
    // GPU memory held, estimated from the buffers (MB): what parking could give back
    memory() {
      const rt = (t, bpp, mip = false) => (t ? t.width * t.height * bpp * (t.samples ? t.samples : 1) * (mip ? 4 / 3 : 1) : 0);
      const comp = (c, msaa) => rt(c.renderTarget1, 8) + rt(c.renderTarget2, 8);
      const bloomRTs = (b) => [...b.renderTargetsHorizontal, ...b.renderTargetsVertical, b.renderTargetBright].reduce((s, t) => s + rt(t, 8), 0);
      const full = comp(composer) + bloomRTs(bloom) + rt(godrays.occ, 8) + rt(hazeRT, 8);
      const maps = rt(bakeRT, 8, true) + rt(glowRT, 8, true) + rt(shadowRT, 4, true) + rt(ffLightRT, 8) + rt(ffDirRT, 8);
      const lowB = low ? comp(low.composer) + bloomRTs(low.composer.passes[2]) + rt(low.godrays.occ, 8) : 0;
      const canvasB = canvas.width * canvas.height * 4 * 2;
      const tex = (sdf.texture.image?.width || 0) * (sdf.texture.image?.height || 0) * 8 + 4096 * 1755 * 4 * 4 / 3 + 3072 * 2048 * 4 * 4 / 3 + 2048 * 2048 * 4 * 4 / 3;
      const MB = (b) => +(b / 1048576).toFixed(1);
      return { fullPipeline: MB(full), wallMaps: MB(maps), lowPipeline: MB(lowB), canvas: MB(canvasB), textures: MB(tex), total: MB(full + maps + lowB + canvasB + tex) };
    },
  };
  window.__hero = { ...api, get time() { return time; }, view, low, U, ROOM, MOOD, wallUniforms, bloom, godrays, grade, flicker, vines, renderer, camera, scene, composer, dust, fireflies, wall, glowQuad, glowRT, shadowRT, shadowCam, bakeRT, bakeQuad, layout, hazeRT, hazeQuad, occQuad, renderAtmosphere, ffLightRT, ffDirRT };
  return api;
}
