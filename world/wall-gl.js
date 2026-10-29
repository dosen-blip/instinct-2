// Local-only: the wall and its ivy drawn and lit in WebGL at the screen's own resolution, with the hero's materials.
// On by default on desktop (world.js imports it); ?nowallgl, phones, reduced motion and no WebGL2 keep the CSS world.
//
// The CSS world (world.js) draws the wall as a 1-CSS-px still with its ivy canvases, multiplied by a light layer of
// radial gradients. Once this tier is ready it fades in over them (300 ms) and they are hidden: one opaque, page-carried
// canvas (placed per frame like the hero's, with its overscan, so the page carries it between frames and it never
// trails a scroll) in its own layer just above world.js's light layer, under the veil, fireflies, vignette and grain.
//   1. bake: the hero's own wall fields (shaders.js BAKE_FRAG: concrete, cracks, damp moss, drips) evaluated per device
//      pixel in world space, so it never repeats or mirrors, into a ring cache that bakes rows as they come into reach.
//      Progressive: rows met during a fast scroll, a jump or far from the screen are baked at half resolution and
//      refined to full once the page calms down and they are near the screen.
//   2. light: the still's own key light (its tone, so the seam fit holds) plus every light in the room (fixtures,
//      slabs, fireflies from __world) as real lights: normal response from the bake's relief and the concrete's grain,
//      a little sheen, a smooth falloff, a faint haze. Foveated: full resolution only in the middle of the screen, half
//      resolution in the bands at the top and bottom edges (and the overscan), which the edge bokeh softens anyway.
//   3. ivy: every strand's canvas (world.js draws them) as a texture, lit by the same lights as the CSS layer lit it;
//      a growing strand re-uploads only what it redrew; a swinging one (transitions.js skews its canvas) follows.
//   4. out: edge bokeh (a depth-of-field blur easing in toward the top and bottom of the screen), horizontal motion blur
//      during a pan, the hero's radial chromatic aberration, and the dark above the footer.
// Pans (transitions.js): see __wallgl.pan below. Debug: __wallgl (bench(), stats, S).
const W = window.__world, T = W?.tone;
const params = new URLSearchParams(location.search);
const OVERSCAN = 0.2, WPP = 0.009045, CA = 1.25, MAXL = 48;   // WPP: the still's scale (a visit starting at home takes the hero's)
const KEY_DIR = [-0.55, 0.7, 0.45], KEY = [0.06 * 24, 0.08 * 24, 0.055 * 24], AMB = [0.008 * 4, 0.014 * 4, 0.01 * 4];   // the ?still bake's lights
const SIGN = [1, 0.94, 0.86];
// edge bokeh: eases in over BAND of the screen's height from its top and bottom edges, to SD (Gaussian-ish sd, CSS px)
// at the very edge; the same constants are in hero-3d/hero.js so the live hero's edges match
export const BOKEH = { band: 0.2, sd: 2.2 };
// foveated lighting: half resolution within the bokeh bands and the overscan (with a 24 px blend)
const FOVEA_LO = 0.5;
// progressive baking: rows met faster than this (px/s), or by a jump, or as margin, bake at half resolution first
const COARSE_SPEED = 1200, BLOCK = 32, REFINE_ROWS = 192;
// home: the GL fill fitted to the hero just above the seam (same world, so the same cracks run on under the fade):
// band [room top, live end], x 30-70%, MOOD .65. The hero's medians there (10 deterministic capture frames, fireflies
// included, calibrated as world.js's AMBIENT fit) [.073, .147, .071], less the CSS veil [.039, .055, .039], against the
// GL fill alone [.039, .102, .035]: a gain on the fill near the seam
const HOME_FIT = [0.87, 0.9, 0.91];
// the room a little lighter than the CSS world further from the hero (home below the seam, and every other page): the
// hero's own room came back up (MOOD .3 -> .65, its seam about 1.25x brighter), and the GL wall follows it
const PAGE_LIFT = 1.2;
// home: the cracks and relief near the seam fitted to the hero's in the overlap band, easing back to 1 over FAR below
// it. Fitted on a visit that started on a subpage and panned home (the hero lined up with this wall): local contrast
// (luminance against its 50 px mean) percentiles p2 / p10 / p90 / p98 of the hero -.34 / -.20 / .17 / .43, the GL wall
// before -.74 / -.43 / .42 / .66, after about -.38 / -.18 / .19 / .32
const HOME_RELIEF = { crack: 0.35, relief: 0.25 };

const canvas = document.createElement('canvas');
canvas.className = 'world-wallgl';
canvas.setAttribute('aria-hidden', 'true');
const gl = T && canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
const ok = gl && gl.getExtension('EXT_color_buffer_float');
if (!ok) console.warn('[wall-gl] unavailable, keeping the CSS wall');

const COMMON = /* glsl */`
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
const mat2 ROT = mat2(1.6, 1.2, -1.2, 1.6);
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++){ s += a * vnoise(p); p = ROT * p + 17.3; a *= .5; } return s / .97; }
float voronoiEdge(vec2 x){
  vec2 n = floor(x), f = fract(x), mg, mr; float md = 8.;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
    vec2 g = vec2(i, j), r = g + hash22(n + g) - f; float d = dot(r, r);
    if (d < md){ md = d; mr = r; mg = g; }
  }
  md = 8.;
  for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++){
    vec2 g = mg + vec2(i, j), r = g + hash22(n + g) - f;
    if (dot(mr - r, mr - r) > 1e-5) md = min(md, dot(.5 * (mr + r), normalize(r - mr)));
  }
  return md;
}
`;
const VERT = `#version 300 es
in vec2 aPos; void main(){ gl_Position = vec4(aPos, 0., 1.); }`;
// the lights, shared by the wall and the ivy (sRGB terms, as world.js's light layer: page = still x light + veil)
const LIGHTS = /* glsl */`
uniform vec3 uFill0, uFill1, uGain0, uGain1;   // the fill near and far, and a gain on each (see draw)
uniform vec2 uFillY;                   // page y where the fill starts and finishes thinning (equal: flat)
uniform int uN;
uniform vec4 uL[${MAXL}];              // view page x, y, rx, ry
uniform vec4 uLc[${MAXL}];             // colour x intensity x opacity
uniform vec4 uLp[${MAXL}];             // the light itself: view page x, y, height above the wall (px)
const float FX[6] = float[6](0., .12, .3, .55, .8, 1.), FY[6] = float[6](1., .62, .3, .11, .03, 0.), FT[6] = float[6](-3.1667, -2.4722, -1.2689, -.54, -.235, -.15);
// world.js FALLOFF as a monotone cubic, same energy: no kinks to band at
float smoothFall(float d){
  if (d >= 1.) return 0.;
  for (int i = 1; i < 6; i++) if (d <= FX[i]){
    float h = FX[i] - FX[i - 1], t = (d - FX[i - 1]) / h, t2 = t * t, t3 = t2 * t;
    return 1.068 * ((2. * t3 - 3. * t2 + 1.) * FY[i - 1] + (t3 - 2. * t2 + t) * h * FT[i - 1] + (-2. * t3 + 3. * t2) * FY[i] + (t3 - t2) * h * FT[i]);
  }
  return 0.;
}
float fillT(float y){ return uFillY.y > uFillY.x ? clamp((y - uFillY.x) / (uFillY.y - uFillY.x), 0., 1.) : 0.; }
vec3 fillAt(float y){ return mix(uFill0 * uGain0, uFill1 * uGain1, fillT(y)); }
vec3 lightAt(vec2 page){   // the light the CSS layer would give here (with the smooth falloff)
  vec3 l = fillAt(page.y);
  for (int i = 0; i < ${MAXL}; i++){
    if (i >= uN) break;
    vec2 d = (page - uL[i].xy) / uL[i].zw; float dd = dot(d, d);
    if (dd < 1.) l += uLc[i].rgb * smoothFall(sqrt(dd));
  }
  return l;
}
`;

// 1. bake: as BAKE_FRAG (no letters here) and shadeWall's albedo. The damp the moss follows is the ?still's patchy
// growth map, made procedural so it runs on forever. Texel (i, j) of the target is wall device px uBase + (i, j) * uStep.
const BAKE = `#version 300 es
precision highp float;
${COMMON}
uniform sampler2D tDark, tLight;
uniform vec2 uOrigin, uBase;          // world at wall (0, 0); wall device px of the target's texel (0, 0)
uniform float uWpp, uDpr, uStep;
layout(location = 0) out vec4 oField;   // height, crack
layout(location = 1) out vec4 oAlb;     // albedo, sqrt-encoded
float crackField(vec2 w){
  vec2 q = w * .55 + vec2(fbm(w * .7), fbm(w * .7 + 17.)) * .9;
  float e = voronoiEdge(q);
  float width = mix(.004, .028, pow(fbm(w * 1.3 + 3.), 2.));
  float big = (1. - smoothstep(width * .25, width, e)) * smoothstep(.34, .56, fbm(w * .45 + 9.));
  vec2 q2 = w * 1.7 + vec2(fbm(w * 2.), fbm(w * 2. + 5.)) * .6;
  float fine = (1. - smoothstep(.002, .011, voronoiEdge(q2))) * smoothstep(.5, .7, fbm(w * .8 + 21.)) * .55;
  return max(big, fine);
}
void main(){
  vec2 wd = uBase + (gl_FragCoord.xy - .5) * uStep + .5 * uStep;   // wall device px (texel centre)
  vec2 w = uOrigin + vec2(wd.x, -wd.y) / uDpr * uWpp;
  float dk = texture(tDark, (w + vec2(10., 4.29)) / vec2(20., 8.58)).r;
  float lt = texture(tLight, w / vec2(9., 6.)).r;
  float cr = crackField(w);
  float h = .55 * lt + .35 * dk - cr * .5;
  float g = .36 + (fbm(w * .3 + 50.) - .5) * 1.1;
  float mn = fbm(w * 7.) * .6 + fbm(w * 23.) * .4;
  float moss = smoothstep(.38, .78, g * .95 + mn * .55 - .25 + cr * .3 * g);
  h += moss * .1 * mn;
  float drips = smoothstep(.68, .92, vnoise(vec2(w.x * 6., w.y * .25))) * smoothstep(.5, .85, fbm(w * .5 + 40.)) * .35;
  vec3 alb = mix(vec3(.03, .055, .032), vec3(.15, .235, .135), smoothstep(.04, .42, dk));
  alb *= .75 + .5 * fbm(w * .32);
  alb = mix(alb, alb * vec3(.85, 1.1, .8), smoothstep(.4, .7, fbm(w * .5 + 31.)));
  alb = mix(alb, vec3(.1, .19, .055) * (.65 + .7 * fbm(w * 9.)), moss * .85);
  alb *= 1. - clamp(drips, 0., 1.) * .6;   // (the cracks darken it in the light pass: see uCrackK)
  oField = vec4(h, cr, 0., 1.);
  oAlb = vec4(sqrt(clamp(alb * 3., 0., 1.)), 1.);
}`;
// half-resolution rows into the ring: the coarse bake, upsampled
const COPY = `#version 300 es
precision highp float;
uniform sampler2D tField, tAlb;
uniform vec2 uSrcSize; uniform float uRow0, uRows;   // the segment's rows in the coarse target: [0, uRows)
layout(location = 0) out vec4 oField;
layout(location = 1) out vec4 oAlb;
void main(){
  vec2 p = vec2(gl_FragCoord.x, gl_FragCoord.y - uRow0) * .5;
  p = vec2(p.x, clamp(p.y, .5, uRows - .5)) / uSrcSize;   // never past the segment (the rows beyond are another one's)
  oField = texture(tField, p); oAlb = texture(tAlb, p);
}`;

// 2. the wall, lit
const LIGHT = `#version 300 es
precision highp float;
${LIGHTS}
uniform sampler2D tField, tAlb, tLight;
uniform vec2 uOrigin, uView, uCache0, uCacheSize;   // world at wall (0, 0); wall device px of canvas (0, 0) (top-left); the cache
uniform float uWpp, uDpr, uScale, uH, uCanvasTop;
uniform vec3 uKey, uKeyDir, uAmb;
uniform vec2 uCrackK, uReliefK;   // crack darkening and relief strength, near the seam and further down (home: fitted to the hero)
out vec4 oCol;
vec3 aces(vec3 c){
  c *= 1.05 / .6;
  c = mat3(.59719, .07600, .02840, .35458, .90834, .13383, .04823, .01566, .83777) * c;
  vec3 a = c * (c + .0245786) - .000090537, b = c * (.983729 * c + .4329510) + .238081;
  c = mat3(1.60475, -.10208, -.00327, -.53108, 1.10813, -.07276, -.07367, -.00605, 1.07602) * (a / b);
  return clamp(c, 0., 1.);
}
vec3 srgb(vec3 c){ return mix(pow(c, vec3(1. / 2.4)) * 1.055 - .055, c * 12.92, step(c, vec3(.0031308))); }
vec3 tone(vec3 c){ return srgb(aces(c)); }
void main(){
  vec2 fc = gl_FragCoord.xy / uScale;                    // full-resolution canvas device px (rows bottom-up)
  float r = uH - fc.y;                                   // canvas device row, top-down
  vec2 wd = uView + vec2(fc.x, r);                       // wall device px
  vec2 page = vec2(fc.x / uDpr, uCanvasTop + r / uDpr);  // view page px
  vec2 cuv = (wd - uCache0) / uCacheSize;
  vec3 alb = texture(tAlb, cuv).rgb; alb = alb * alb / 3.;
  vec4 f = texture(tField, cuv);
  // relief, as the hero's shadeWall: bake slope over the hero bake's texel (.75 CSS px) and the concrete's fine grain
  vec2 o = vec2(.75 * uDpr) / uCacheSize;
  float hx = texture(tField, cuv + vec2(o.x, 0.)).r - texture(tField, cuv - vec2(o.x, 0.)).r;
  float hy = texture(tField, cuv - vec2(0., o.y)).r - texture(tField, cuv + vec2(0., o.y)).r;   // world y runs up the page
  vec2 w = uOrigin + vec2(wd.x, -wd.y) / uDpr * uWpp;
  vec2 luv = w / vec2(6., 4.), lt = vec2(1.5 / 3072., 1.5 / 2048.);
  float fx = texture(tLight, luv + vec2(lt.x, 0.)).r - texture(tLight, luv - vec2(lt.x, 0.)).r;
  float fy = texture(tLight, luv + vec2(0., lt.y)).r - texture(tLight, luv - vec2(0., lt.y)).r;
  float ft = fillT(page.y), ck = mix(uCrackK.x, uCrackK.y, ft), rk = mix(uReliefK.x, uReliefK.y, ft);
  vec3 N = normalize(vec3(-(hx * 9. + fx * .9) * rk, -(hy * 9. + fy * .9) * rk, 1.));
  alb *= 1. - f.g * .78 * ck;
  float ao = 1. - f.g * .6 * ck;
  vec3 lit = fillAt(page.y) * tone(alb * ao * (uKey * max(dot(N, uKeyDir), 0.) + uAmb));
  vec3 eflat = uKey * uKeyDir.z + uAmb, haze = vec3(0);
  for (int i = 0; i < ${MAXL}; i++){
    if (i >= uN) break;
    vec4 L = uL[i];
    vec2 d = (page - L.xy) / L.zw; float dd = dot(d, d);
    if (dd >= 1.) continue;
    float k = smoothFall(sqrt(dd));
    vec3 Ld = normalize(vec3(uLp[i].x - page.x, page.y - uLp[i].y, uLp[i].z));
    float rr = max(dot(N, Ld), 0.) / max(Ld.z, .3);
    float sp = pow(max(dot(N, normalize(Ld + vec3(0., 0., 1.))), 0.), 14.) * .035;
    lit += uLc[i].rgb * k * tone(alb * ao * eflat * rr + sp * eflat);
    haze += uLc[i].rgb * smoothFall(sqrt(dd) * 1.25) * .022;
  }
  oCol = vec4(lit + haze, 1.);
}`;

// 3. a strand of ivy: its canvas, skewed as transitions.js swings it, lit as the CSS light layer lit it
const STRAND_V = `#version 300 es
in vec2 aPos;
uniform vec4 uBox, uM; uniform vec2 uO, uT, uSize; uniform float uCanvasTop, uDpr;
out vec2 vUv; out vec2 vPage;
void main(){
  vec2 p = uBox.xy + aPos * uBox.zw;
  vec2 q = uO + mat2(uM.x, uM.y, uM.z, uM.w) * (p - uO) + uT;
  vec2 dev = vec2(q.x, q.y - uCanvasTop) * uDpr;
  vUv = aPos; vPage = q;
  gl_Position = vec4(dev.x / uSize.x * 2. - 1., 1. - dev.y / uSize.y * 2., 0., 1.);
}`;
const STRAND_F = `#version 300 es
precision highp float;
${LIGHTS}
uniform sampler2D tIvy;
in vec2 vUv; in vec2 vPage;
out vec4 oCol;
void main(){ vec4 c = texture(tIvy, vUv); oCol = vec4(c.rgb * lightAt(vPage), c.a); }`;

// 4. out
const OUT = `#version 300 es
precision highp float;
uniform sampler2D tLit, tLo;
uniform vec2 uSize, uLoScale, uScreen, uFovea;   // canvas device size; lo RT scale; screen top/bottom rows; full-res rows
uniform float uCA, uBokeh, uBand, uBlur, uUseFull, uDpr, uCanvasTop, uBottom, uZoom;
out vec4 oCol;
const vec2 DISC[12] = vec2[12](vec2(-.326, -.406), vec2(-.840, -.074), vec2(-.696, .457), vec2(-.203, .621), vec2(.962, -.195), vec2(.473, -.480),
  vec2(.519, .767), vec2(.185, -.893), vec2(.507, .064), vec2(.896, .412), vec2(-.322, -.933), vec2(-.792, -.598));
vec3 pick(vec2 uv, vec2 off, float full){
  vec3 lo = vec3(texture(tLo, (uv - off) * uLoScale).r, texture(tLo, uv * uLoScale).g, texture(tLo, (uv + off) * uLoScale).b);
  if (full <= 0.) return lo;
  vec3 hi = vec3(texture(tLit, uv - off).r, texture(tLit, uv).g, texture(tLit, uv + off).b);
  return mix(lo, hi, full);
}
void main(){
  // lens breathing (a pan eases the wall in by up to ~1.5 %, about the screen's centre)
  vec2 sc = vec2(.5, 1. - (uScreen.x + uScreen.y) * .5 / uSize.y);
  vec2 uv = sc + (gl_FragCoord.xy / uSize - sc) / uZoom, c = uv - .5;
  vec2 off = c * dot(c, c) * .02 * uCA;
  float r = uSize.y - gl_FragCoord.y;                    // canvas device row, top-down
  float full = uUseFull * smoothstep(uFovea.x, uFovea.x + 48., r) * (1. - smoothstep(uFovea.y - 48., uFovea.y, r));
  float e = min(r - uScreen.x, uScreen.y - r);           // device px from the nearer screen edge
  float rad = uBokeh * (1. - smoothstep(0., uBand, e));
  vec2 ext = vec2(max(rad, uBlur * 2.2), rad);           // the disc, stretched sideways by the pan's motion blur
  vec3 col;
  if (ext.x < .5) col = pick(uv, off, full);
  else {
    col = vec3(0);
    for (int i = 0; i < 12; i++) col += pick(uv + DISC[i] * ext / uSize, off, full);
    col /= 12.;
  }
  float py = uCanvasTop + r / uDpr;
  col *= clamp((uBottom - py) / 340., 0., 1.);           // the dark above the footer (world.js light__fade)
  oCol = vec4(col, 1.);
}`;

function program(fs, vs = VERT) {
  const p = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    gl.attachShader(p, s);
  }
  gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, ''); u[name] = gl.getUniformLocation(p, name); }
  return { p, u };
}
function tex(w, h, internal, filter, wrapT = gl.CLAMP_TO_EDGE) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texStorage2D(gl.TEXTURE_2D, 1, internal, w, h);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
  return t;
}
function fbo(...texs) {
  const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
  texs.forEach((t, i) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0));
  gl.drawBuffers(texs.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
  return f;
}
// a pair of bake targets (field RG16F, albedo RGBA8) and its framebuffer
function cache(w, h, wrapT) {
  const field = tex(w, h, gl.RG16F, gl.LINEAR, wrapT), alb = tex(w, h, gl.RGBA8, gl.LINEAR, wrapT);
  return { w, h, field, alb, fb: fbo(field, alb), free() { gl.deleteTexture(field); gl.deleteTexture(alb); gl.deleteFramebuffer(this.fb); } };
}
async function image(url, wrap) {
  const img = new Image(); await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, gl.RED, gl.UNSIGNED_BYTE, img);   // (only red is read)
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  const af = gl.getExtension('EXT_texture_filter_anisotropic');
  if (af) gl.texParameterf(gl.TEXTURE_2D, af.TEXTURE_MAX_ANISOTROPY_EXT, 8);
  return t;
}

if (ok) {
  const html = document.documentElement;
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = new URL('./wall-gl.css', import.meta.url).href; css.dataset.dynamic = ''; document.head.append(css);   // data-dynamic: not part of the page shell (transitions.js)
  const host = document.createElement('div'); host.className = 'world-wallgl-host'; host.setAttribute('aria-hidden', 'true'); host.append(canvas);
  const heroAssets = new URL('../hero-3d/assets/', import.meta.url).href;
  const [tDark, tLight] = await Promise.all([image(heroAssets + 'concrete-dark.webp', gl.MIRRORED_REPEAT), image(heroAssets + 'concrete-light.webp', gl.MIRRORED_REPEAT)]);
  const P = { bake: program(BAKE), copy: program(COPY), light: program(LIGHT), strand: program(STRAND_F, STRAND_V), out: program(OUT) };
  const tri = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, tri);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  const useTri = () => { gl.bindBuffer(gl.ARRAY_BUFFER, tri); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); };
  const useQuad = () => { gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); };

  const S = { w: 0, h: 0, dpr: 0, ring: null, lo: null, blocks: null, baked: null, lit: null, fbLit: null, litLo: null, fbLo: null,
    key: '', origin: null, wpp: 0, placed: NaN, lastScroll: scrollY, lastScrollAt: performance.now(), speed: 0, calmSince: 0, on: false, shown: false, ready: false };
  const stats = { draws: 0, bakedRows: 0, coarseRows: 0, refinedRows: 0, uploads: 0, uploadPx: 0, ms: 0 };
  let pan = null;   // a camera move in progress (see __wallgl.pan)

  function alloc() {
    const dpr = Math.min(devicePixelRatio, 2), vw = html.clientWidth, H = innerHeight;
    const ov = Math.round(H * OVERSCAN), w = Math.round(vw * dpr), h = Math.round((H + 2 * ov) * dpr);
    if (w === S.w && h === S.h && dpr === S.dpr) return;
    S.ring?.free(); S.lo?.free();
    for (const t of [S.lit, S.litLo]) if (t) gl.deleteTexture(t);
    for (const f of [S.fbLit, S.fbLo]) if (f) gl.deleteFramebuffer(f);
    const cacheH = Math.ceil(h * 1.25 / BLOCK) * BLOCK;
    Object.assign(S, { w, h, dpr, ov, vw, H, cacheH });
    canvas.width = w; canvas.height = h;
    canvas.style.width = `${vw}px`; canvas.style.height = `${H + 2 * ov}px`;
    // the ring wraps down the wall (REPEAT on t): wall device row v lives at row (v mod cacheH), and relief reads across
    S.ring = cache(w, cacheH, gl.REPEAT);
    S.lo = cache(Math.ceil(w / 2), Math.ceil(cacheH / 2), gl.CLAMP_TO_EDGE);   // coarse bakes land here first
    S.blocks = { id: new Float64Array(cacheH / BLOCK).fill(NaN), q: new Uint8Array(cacheH / BLOCK) };
    S.lit = tex(w, h, gl.RGBA8, gl.LINEAR); S.fbLit = fbo(S.lit);
    S.litLo = tex(Math.ceil(w * FOVEA_LO), Math.ceil(h * FOVEA_LO), gl.RGBA8, gl.LINEAR); S.fbLo = fbo(S.litLo);
    S.baked = null; S.key = '';
  }
  const memMB = () => {
    let b = S.w * S.cacheH * 8 + S.lo.w * S.lo.h * 8 + S.w * S.h * 4 * (1 + FOVEA_LO * FOVEA_LO) + S.w * S.h * 4 * 2;   // ring, coarse, lit, canvas
    for (const s of strands.values()) b += s.w * s.h * 4;
    if (pan?.cache) b += pan.cache.w * pan.cache.h * 8;
    return +(b / 1048576).toFixed(1);
  };

  // ------------------------------------------------------------------ where things are on the wall
  // Wall px (u, v): a page point (x, y) under camera c is (x + c.x, y + c.y) (the room's top plays no part: the wall is
  // the page's, whatever the room does). World xy = origin + (u, -v) * wpp. Both are set once per document: a visit
  // that starts at home takes the hero's own wall (its scale, and its cracks running on under the fade, so the hero is
  // exactly as it always was); one that starts anywhere else takes the CSS still's (its top row at the page's top), and
  // the hero lines its wall up with that when it comes (lab/hero-3d/site-hero.js alignWall).
  function origin() {
    const vw = S.vw, home = window.__siteHero?.wallAt && W.geo.live && W.geo.route === 'index' && !W.camera.x && !W.camera.y;
    const h = home && window.__siteHero.wallAt(vw / 2, 0);
    if (h) { S.wpp = h.wpp; return [-vw / 2 * h.wpp, h.y]; }
    S.wpp = WPP; return [-vw / 2 * WPP, 720 * WPP];
  }
  const worldAt = (px, py, cam = W.camera) => (S.origin ? [S.origin[0] + (px + cam.x) * S.wpp, S.origin[1] - (py + cam.y) * S.wpp] : null);
  const viewCam = () => (pan ? pan.cam : W.camera);

  // ------------------------------------------------------------------ baking
  function bakeInto(target, base, step, vx, vy, vw, vh) {
    useTri();
    gl.useProgram(P.bake.p); const u = P.bake.u;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tDark); gl.uniform1i(u.tDark, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tLight); gl.uniform1i(u.tLight, 1);
    gl.uniform2f(u.uOrigin, ...S.origin); gl.uniform1f(u.uWpp, S.wpp); gl.uniform1f(u.uDpr, S.dpr);
    gl.uniform2f(u.uBase, ...base); gl.uniform1f(u.uStep, step);
    gl.viewport(0, 0, target.w, target.h);
    gl.enable(gl.SCISSOR_TEST); gl.scissor(vx, vy, vw, vh);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disable(gl.SCISSOR_TEST);
  }
  // wall rows [v0, v1) (device px, whole blocks) into the ring at full or half resolution
  function bakeRows(v0, v1, coarse) {
    const R = S.ring, u0 = S.ringU0;
    for (let v = v0; v < v1;) {
      const c = ((v % R.h) + R.h) % R.h, n = Math.min(v1 - v, R.h - c);
      if (coarse) {
        const nh = Math.ceil(n / 2);
        bakeInto(S.lo, [u0, v], 2, 0, 0, S.lo.w, nh);
        useTri(); gl.useProgram(P.copy.p); const u = P.copy.u;
        gl.bindFramebuffer(gl.FRAMEBUFFER, R.fb); gl.viewport(0, 0, R.w, R.h);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, S.lo.field); gl.uniform1i(u.tField, 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, S.lo.alb); gl.uniform1i(u.tAlb, 1);
        gl.uniform2f(u.uSrcSize, S.lo.w, S.lo.h); gl.uniform1f(u.uRow0, c); gl.uniform1f(u.uRows, nh);
        gl.enable(gl.SCISSOR_TEST); gl.scissor(0, c, R.w, n); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.disable(gl.SCISSOR_TEST);
        stats.coarseRows += n;
      } else { bakeInto(R, [u0, v - c], 1, 0, c, R.w, n); stats.bakedRows += n; }
      for (let b = Math.floor(v / BLOCK); b < Math.ceil((v + n) / BLOCK); b++) { const i = ((b % S.blocks.q.length) + S.blocks.q.length) % S.blocks.q.length; S.blocks.id[i] = b; S.blocks.q[i] = coarse ? 1 : 2; }
      v += n;
    }
  }
  const blk = (v) => Math.floor(v / BLOCK) * BLOCK, blkUp = (v) => Math.ceil(v / BLOCK) * BLOCK;
  // the rows the canvas needs now [r0, r1) are in the ring; returns true if anything was baked
  function ensure(r0, r1, coarse) {
    r0 = blk(r0); r1 = blkUp(r1);
    const R = S.ring;
    if (S.baked && r0 >= S.baked[0] && r1 <= S.baked[1]) return false;
    if (!S.baked || r1 <= S.baked[0] || r0 >= S.baked[1]) { bakeRows(r0, r1, true); S.baked = [r0, r1]; return true; }   // a jump: coarse now, refined once calm
    if (r1 > S.baked[1]) { bakeRows(S.baked[1], r1, coarse); S.baked = [Math.max(S.baked[0], r1 - R.h), r1]; }
    if (r0 < S.baked[0]) { bakeRows(r0, S.baked[0], coarse); S.baked = [r0, Math.min(S.baked[1], r0 + R.h)]; }
    return true;
  }
  // when nothing else is happening: refine coarse rows on the canvas (centre first), then fill the margins coarsely
  function idleWork(r0, r1) {
    const q = S.blocks.q, id = S.blocks.id, n = q.length;
    const mid = (r0 + r1) / 2, todo = [];
    for (let b = Math.floor(r0 / BLOCK); b < Math.ceil(r1 / BLOCK); b++) { const i = ((b % n) + n) % n; if (id[i] === b && q[i] === 1) todo.push(b); }
    if (todo.length) {
      todo.sort((a, b) => Math.abs(a * BLOCK - mid) - Math.abs(b * BLOCK - mid));
      const take = todo.slice(0, REFINE_ROWS / BLOCK).sort((a, b) => a - b);
      for (const b of take) bakeRows(b * BLOCK, (b + 1) * BLOCK, false);
      stats.refinedRows += take.length * BLOCK;
      return true;
    }
    if (S.baked && S.baked[1] - S.baked[0] < S.ring.h) {
      const room = S.ring.h - (S.baked[1] - S.baked[0]), k = Math.min(256, room);
      if (S.baked[1] - r1 <= r0 - S.baked[0]) { bakeRows(S.baked[1], S.baked[1] + k, true); S.baked[1] += k; }
      else { bakeRows(S.baked[0] - k, S.baked[0], true); S.baked[0] -= k; }
      return true;
    }
    return false;
  }

  // ------------------------------------------------------------------ the room's lights and ivy, in wall px
  // (a page's items are where world.js has them under its camera; the page being left in a pan keeps a snapshot)
  function pageLights(cam, top) {
    const out = [], add = (x, y, rx, ry, c, k, lx, ly, lz) => {
      if (k < 0.004) return;
      out.push({ u: x + cam.x, v: y + cam.y, rx, ry, c: [c[0] * k, c[1] * k, c[2] * k], lu: lx + cam.x, lv: ly + cam.y, lz, k, fix: rx > 160 });
    };
    for (const p of W.pools()) if (p.on) add(p.px, p.py, p.rx, p.ry, p.c, p.i, p.px, p.py - p.ry * 0.5, p.ry * 0.7);
    for (const s of W.slabs.values()) if (s.l) add(s.l.x, s.l.y, s.l.rx, s.l.ry, SIGN, 1.25 * s.glow, s.l.x, s.l.y, 25);
    for (const f of W.flies()) if (f.shown && f.px !== undefined) add(f.px, f.py, 150, 150, f.c, f.power * 0.42 * f.lvl, f.px, f.py, 35 + 70 * (f.z || 0));
    return out;
  }
  const strands = new Map();   // canvas -> { tex, w, h } (uploaded while near the screen)
  function pageStrands(cam, top) {
    return W.vines().map((v) => ({ v, canvas: v.canvas, u: v.left + cam.x, vv: v.top + top + cam.y, w: v.box.w, h: v.box.h, id: v.id }));
  }
  function upload(s) {
    let t = strands.get(s.canvas);
    const c = s.canvas, v = s.v;
    if (!c.width || !c.height) return null;
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    if (!t || t.w !== c.width || t.h !== c.height) {
      if (t) gl.deleteTexture(t.tex);
      t = { tex: tex(c.width, c.height, gl.RGBA8, gl.LINEAR), w: c.width, h: c.height };
      gl.bindTexture(gl.TEXTURE_2D, t.tex);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, c);
      strands.set(c, t); stats.uploads++; stats.uploadPx += c.width * c.height;
      if (v) v.glDirty = null;
    } else if (v && v.glDirty) {
      // a growing strand: only what world.js redrew since (its dirty rect, in device px of the canvas)
      gl.bindTexture(gl.TEXTURE_2D, t.tex);
      if (v.glDirty === 'all') gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, c);
      else {
        const d = v.glDirty, x0 = Math.max(0, d.x0), y0 = Math.max(0, d.y0), x1 = Math.min(c.width, d.x1), y1 = Math.min(c.height, d.y1);
        if (x1 > x0 && y1 > y0) {
          gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, x0); gl.pixelStorei(gl.UNPACK_SKIP_ROWS, y0); gl.pixelStorei(gl.UNPACK_ROW_LENGTH, c.width);
          gl.texSubImage2D(gl.TEXTURE_2D, 0, x0, y0, x1 - x0, y1 - y0, gl.RGBA, gl.UNSIGNED_BYTE, c);
          gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0); gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0); gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0);
          stats.uploadPx += (x1 - x0) * (y1 - y0);
        }
      }
      stats.uploads++; v.glDirty = null;
    }
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    return t;
  }
  // a strand's swing (transitions.js plays a skew on its canvas, or on the held copy of it, during and after a pan)
  function swingOf(el) {
    if (!el || !el.getAnimations().length) return null;
    const cs = getComputedStyle(el), m = cs.transform;
    if (!m || m === 'none') return null;
    const n = m.match(/matrix\(([^)]+)\)/)?.[1].split(',').map(Number);
    if (!n) return null;
    const o = cs.transformOrigin.split(' ').map(parseFloat);
    return { m: n.slice(0, 4), t: n.slice(4, 6), o };
  }

  // ------------------------------------------------------------------ drawing
  const Lb = new Float32Array(MAXL * 4), Cb = new Float32Array(MAXL * 4), Pb = new Float32Array(MAXL * 4);
  let nLights = 0;
  function setLights(list, vc, top, y0, y1) {
    const vis = list.map((l) => ({ ...l, x: l.u - vc.x, y: l.v - vc.y })).filter((l) => l.y + l.ry > y0 && l.y - l.ry < y1 && l.x + l.rx > -50 && l.x - l.rx < S.vw + 50);
    vis.sort((a, b) => (b.fix - a.fix) || (b.k - a.k));   // fixtures and slabs first: fireflies never push a lamp out
    nLights = Math.min(MAXL, vis.length);
    let sig = nLights;
    for (let i = 0; i < nLights; i++) {
      const l = vis[i];
      Lb.set([l.x, l.y, l.rx, l.ry], i * 4); Cb.set([...l.c, 0], i * 4); Pb.set([l.lu - vc.x, l.lv - vc.y, l.lz, 0], i * 4);
      sig = (sig * 31 + Math.round(l.x * 2) + Math.round(l.y * 2) * 7 + Math.round(l.k * 4000)) | 0;
    }
    return sig;
  }
  function lightUniforms(u) {
    const F = fill();
    gl.uniform3f(u.uFill0, ...F.f0); gl.uniform3f(u.uFill1, ...F.f1); gl.uniform2f(u.uFillY, ...F.y);
    gl.uniform1i(u.uN, nLights); gl.uniform4fv(u.uL, Lb); gl.uniform4fv(u.uLc, Cb); if (u.uLp) gl.uniform4fv(u.uLp, Pb);
  }
  function fill() {
    const g = W.geo, r8 = (c) => c.map((v) => Math.round(Math.min(1, v) * 255) / 255);
    if (g.live) return { f0: r8(T.AMBIENT), f1: r8(T.AMBIENT_FAR), y: [g.liveEnd, g.liveEnd + T.FAR] };
    const a = r8(T.AMBIENT_PAGE); return { f0: a, f1: a, y: [0, 0] };
  }

  // one frame of the wall: the lit wall (foveated), the ivy over it, then out to the canvas
  function draw(mode) {   // mode: 'rest' | 'fast' | 'pan'
    const t0 = performance.now();
    const vc = viewCam(), top = W.geo.top, ctop = S.placed - S.ov;
    const cacheSrc = pan?.cache ? pan.cache : S.ring;   // (its departing column is whole from the start; see prepare)
    const c0 = cacheSrc === S.ring ? [S.ringU0, 0] : [pan.cache.u0, pan.cache.v0];
    const view = [vc.x * S.dpr, (ctop + vc.y) * S.dpr];
    const lights = [...pageLights(W.camera, top), ...(pan?.oldLights || [])];
    setLights(lights, vc, top, ctop, ctop + S.h / S.dpr);
    if (window.__wallglNoLights) nLights = 0;   // debug: the fill alone (tone fits)
    stats.lit = { drawn: nLights, fixtures: lights.filter((l) => l.fix).length, pan: !!pan };
    const full = mode === 'rest';
    // the screen's edges and the full-resolution middle, in canvas device rows
    const scr = [S.ov * S.dpr, (S.ov + S.H) * S.dpr], band = S.H * BOKEH.band * S.dpr;
    const fov = window.__wallglNoFovea ? [-64, S.h + 64] : [scr[0] + band * 0.6, scr[1] - band * 0.6];   // (debug: full resolution everywhere)
    const passes = [[S.fbLo, Math.ceil(S.w * FOVEA_LO), Math.ceil(S.h * FOVEA_LO), FOVEA_LO, null]];
    if (full) passes.push([S.fbLit, S.w, S.h, 1, fov]);
    // the strands near the canvas: this page's, and in a pan the page being left
    const items = [...pageStrands(W.camera, top).map((s) => ({ ...s, swing: swingOf(s.canvas) })), ...(pan?.oldStrands || []).map((s) => ({ ...s, swing: swingOf(s.held) }))]
      .map((s) => ({ ...s, x: s.u - vc.x, y: s.vv - vc.y }))
      .filter((s) => s.y + s.h > ctop - 40 && s.y < ctop + S.h / S.dpr + 40 && s.x + s.w > -40 - (pan ? S.vw : 0) && s.x < S.vw + 40 + (pan ? S.vw : 0));
    // textures: what is on the canvas now at once; in a pan the other page's strands too, two a frame, ahead of the move
    let budget = 2;
    for (const s of items) {
      const vis = s.x + s.w > -40 && s.x < S.vw + 40;
      s.t = s.tex ? { tex: s.tex } : strands.has(s.canvas) && !s.v?.glDirty ? strands.get(s.canvas) : vis || budget-- > 0 ? upload(s) : null;
      s.vis = vis;
    }
    // strands far from the screen give their textures back
    if (strands.size > 24) { const used = new Set([...items.map((s) => s.canvas), ...(pan?.oldStrands || []).map((s) => s.canvas)]); for (const [c, t] of strands) if (!used.has(c)) { gl.deleteTexture(t.tex); strands.delete(c); } }
    for (const [fb, w, h, scale, rows] of passes) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.viewport(0, 0, w, h);
      if (rows) { gl.enable(gl.SCISSOR_TEST); gl.scissor(0, Math.floor((S.h - rows[1]) * scale), w, Math.ceil((rows[1] - rows[0]) * scale)); }
      useTri(); gl.useProgram(P.light.p); const u = P.light.u;
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, cacheSrc.field); gl.uniform1i(u.tField, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, cacheSrc.alb); gl.uniform1i(u.tAlb, 1);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, tLight); gl.uniform1i(u.tLight, 2);
      gl.uniform2f(u.uOrigin, ...S.origin); gl.uniform2f(u.uView, ...view); gl.uniform2f(u.uCache0, ...c0); gl.uniform2f(u.uCacheSize, cacheSrc.w, cacheSrc.h);
      gl.uniform1f(u.uWpp, S.wpp); gl.uniform1f(u.uDpr, S.dpr); gl.uniform1f(u.uScale, scale); gl.uniform1f(u.uH, S.h); gl.uniform1f(u.uCanvasTop, ctop);
      const kd = Math.hypot(...KEY_DIR);
      gl.uniform3f(u.uKey, ...KEY); gl.uniform3f(u.uKeyDir, ...KEY_DIR.map((v) => v / kd)); gl.uniform3f(u.uAmb, ...AMB);
      // the wall: the fit near the seam (home), easing to the lighter room further down (and on every other page)
      gl.uniform3f(u.uGain0, ...(W.geo.live ? HOME_FIT : [PAGE_LIFT, PAGE_LIFT, PAGE_LIFT])); gl.uniform3f(u.uGain1, PAGE_LIFT, PAGE_LIFT, PAGE_LIFT);
      gl.uniform2f(u.uCrackK, W.geo.live ? HOME_RELIEF.crack : 1, 1); gl.uniform2f(u.uReliefK, W.geo.live ? HOME_RELIEF.relief : 1, 1);
      lightUniforms(u);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      // the ivy over it, premultiplied
      if (items.length) {
        useQuad(); gl.useProgram(P.strand.p); const q = P.strand.u;
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.uniform2f(q.uSize, S.w, S.h); gl.uniform1f(q.uCanvasTop, ctop); gl.uniform1f(q.uDpr, S.dpr);
        lightUniforms(q);
        // the ivy: lit as the CSS layer lit it at the seam (home), easing to the lighter room further down
        const g0 = W.geo.live ? 1 : PAGE_LIFT; gl.uniform3f(q.uGain0, g0, g0, g0); gl.uniform3f(q.uGain1, PAGE_LIFT, PAGE_LIFT, PAGE_LIFT);
        gl.activeTexture(gl.TEXTURE0); gl.uniform1i(q.tIvy, 0);
        for (const s of items) {
          if (!s.t || !s.vis) continue;
          gl.bindTexture(gl.TEXTURE_2D, s.t.tex);
          gl.uniform4f(q.uBox, s.x, s.y, s.w, s.h);
          const sw = s.swing;
          if (sw) { gl.uniform4f(q.uM, ...sw.m); gl.uniform2f(q.uT, ...sw.t); gl.uniform2f(q.uO, s.x + sw.o[0], s.y + sw.o[1]); }
          else { gl.uniform4f(q.uM, 1, 0, 0, 1); gl.uniform2f(q.uT, 0, 0); gl.uniform2f(q.uO, s.x, s.y); }
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
        gl.disable(gl.BLEND);
      }
      gl.disable(gl.SCISSOR_TEST);
    }
    // out
    useTri(); gl.useProgram(P.out.p); const v = P.out.u;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, S.w, S.h);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, S.lit); gl.uniform1i(v.tLit, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, S.litLo); gl.uniform1i(v.tLo, 1);
    gl.uniform2f(v.uSize, S.w, S.h); gl.uniform2f(v.uLoScale, S.w * FOVEA_LO / Math.ceil(S.w * FOVEA_LO), S.h * FOVEA_LO / Math.ceil(S.h * FOVEA_LO));
    gl.uniform2f(v.uScreen, ...scr); gl.uniform2f(v.uFovea, ...fov);
    gl.uniform1f(v.uCA, CA * (pan?.ca ?? 1)); gl.uniform1f(v.uZoom, pan?.zoom ?? 1); gl.uniform1f(v.uBokeh, window.__wallglNoBokeh ? 0 : BOKEH.sd * S.dpr); gl.uniform1f(v.uBand, band); gl.uniform1f(v.uBlur, (pan?.blur || 0) * S.dpr);
    gl.uniform1f(v.uUseFull, full ? 1 : 0); gl.uniform1f(v.uDpr, S.dpr); gl.uniform1f(v.uCanvasTop, ctop); gl.uniform1f(v.uBottom, W.geo.bottom);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    stats.draws++;
    stats.ms += (performance.now() - t0 - stats.ms) * 0.1;
  }

  // the fireflies' bodies (CSS) take the same edge bokeh
  const flyBlur = new WeakMap();
  function blurFlies(sy) {
    const band = S.H * BOKEH.band;
    for (const f of W.flies()) {
      if (!f.el) continue;
      const y = f.py - sy, e = Math.min(y, S.H - y), k = e >= band ? 0 : 1 - ((t) => t * t * (3 - 2 * t))(Math.max(0, e) / band);
      const b = Math.round(BOKEH.sd * 2 * k * 4) / 4;
      if (flyBlur.get(f.el) !== b) { flyBlur.set(f.el, b); f.el.style.filter = b ? `blur(${b}px)` : ''; }
    }
  }

  function place(sy) {
    // on a device-pixel row, so cache rows and screen rows line up exactly
    S.placed = Math.round(sy * S.dpr) / S.dpr;
    canvas.style.transform = `translate3d(0, ${S.placed - S.ov - W.geo.top}px, 0)`;
  }

  let lastSig = 0;
  function frame(now) { requestAnimationFrame(frame); step(now); }
  function step(now = performance.now(), force = false) {
    const g = W.geo;
    // a pan keeps the tier on even where the world is off screen (home at the top: the world starts below the live
    // wall, so world.js marks it off, and the first pan away from home used to fall back to the CSS path)
    const on = g.on && !g.phone && (!html.classList.contains('world-off') || !!pan || S.preparing);
    if (!on) { if (S.on) { S.on = false; html.classList.remove('wall-gl'); } return; }
    if (host.parentNode !== document.body || host.previousElementSibling?.classList.contains('world-light') !== true) document.querySelector('body > .world-light')?.after(host);
    Object.assign(host.style, { top: `${g.top}px`, height: `${Math.max(0, g.bottom - g.top)}px` });
    alloc();
    const vc = viewCam();
    const key = `${S.w}|${S.h}|${g.top}|${g.live}|${g.liveEnd}|${pan ? 'pan' : `${vc.x}|${vc.y}`}`;
    if (key !== S.key) {
      S.key = key;
      if (!pan) {
        if (!S.origin) { S.origin = origin(); document.dispatchEvent(new CustomEvent('wallgl:origin')); }
        S.ringU0 = Math.round(vc.x * S.dpr); S.ringV = Math.round(vc.y * S.dpr); S.baked = null; S.blocks.id.fill(NaN); S.placed = NaN;
        // just after a pan: the arriving page's wall is already baked, at full resolution, in the pan's wide cache. Copy
        // it into the ring instead of baking the screen again (which would show it at half resolution until refined).
        if (S.adopt) { if (!window.__wallglNoAdopt) adopt(S.adopt); S.adopt.free(); S.adopt = null; }   // (debug: ?__wallglNoAdopt, the old way)
      }
    }
    const sy = scrollY;
    if (now > S.lastScrollAt) S.speed += (Math.abs(sy - S.lastScroll) / Math.max((now - S.lastScrollAt) / 1000, 1e-3) - S.speed) * 0.35;
    if (sy === S.lastScroll && now - S.lastScrollAt > 120) S.speed *= 0.5;
    if (sy !== S.lastScroll) { S.lastScroll = sy; S.lastScrollAt = now; }
    if (S.speed > 200) S.calmSince = now;
    const moved = Number.isNaN(S.placed) || Math.abs(sy - S.placed) > S.ov * 0.25;
    const fast = S.speed > 900;
    if (moved || fast) place(sy);
    // the rows the canvas covers, on the wall (device px)
    const r0 = Math.round((S.placed - S.ov + vc.y) * S.dpr), r1 = r0 + S.h;
    let baked = false;
    if (!pan) baked = ensure(r0, r1, S.speed > COARSE_SPEED);
    const sig = setLights([...pageLights(W.camera, g.top), ...(pan?.oldLights || [])], vc, g.top, S.placed - S.ov, S.placed - S.ov + S.h / S.dpr);
    const growing = W.vines().some((v) => v.glDirty && strands.has(v.canvas));
    const swinging = W.vines().some((v) => v.canvas.getAnimations().length) || !!pan;
    const calm = now - S.calmSince > 150 && !pan;
    let refined = false;
    if (calm && !moved && !baked) refined = idleWork(r0, r1);
    if (!moved && !baked && !refined && !fast && !force && !growing && !swinging && sig === lastSig && !pan) return;
    if (pan) pan.dirty = false;
    lastSig = sig;
    draw(pan ? 'pan' : fast ? 'fast' : 'rest');
    blurFlies(sy);
    if (!S.shown) {
      // first frame: fade in over the CSS world, then hide what it replaces
      S.shown = true; S.on = true; drewResolve();
      const done = () => { if (S.ready) return; html.classList.add('wall-gl'); S.ready = true; readyResolve(); };
      if (pan) { canvas.style.transition = 'none'; canvas.style.opacity = '1'; done(); return; }   // mid-pan: no fade, take over at once
      canvas.style.transition = 'none'; canvas.style.opacity = '0';
      void canvas.offsetWidth;   // (the 0 is applied before the fade starts, without waiting for a frame)
      canvas.style.transition = 'opacity 300ms ease'; canvas.style.opacity = '1';
      canvas.addEventListener('transitionend', done, { once: true });
      const check = () => (getComputedStyle(canvas).opacity === '1' ? done() : setTimeout(check, 200)); setTimeout(check, 350);   // only once it really shows
    } else if (!S.on) { S.on = true; html.classList.add('wall-gl'); }
  }
  let readyResolve; const ready = new Promise((r) => { readyResolve = r; });
  let drewResolve; const drew = new Promise((r) => { drewResolve = r; });   // its first frame (ready: also faded in)
  requestAnimationFrame(frame);

  // the ring's columns (all of them) for wall rows [v0, v0 + h) into cache c at column x
  function blitRing(c, x, v0, h) {
    const R = S.ring;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, R.fb); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, c.fb);
    for (let att = 0; att < 2; att++) {
      gl.readBuffer(gl.COLOR_ATTACHMENT0 + att);
      gl.drawBuffers(att ? [gl.NONE, gl.COLOR_ATTACHMENT1] : [gl.COLOR_ATTACHMENT0, gl.NONE]);
      for (let y = 0; y < h;) {
        const r = (((v0 + y) % R.h) + R.h) % R.h, n = Math.min(h - y, R.h - r);
        gl.blitFramebuffer(0, r, R.w, r + n, x, y, x + R.w, y + n, gl.COLOR_BUFFER_BIT, gl.NEAREST);
        y += n;
      }
    }
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.readBuffer(gl.COLOR_ATTACHMENT0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // the pan's wide cache into the ring: the ring's columns, the whole rows it holds
  function adopt(c) {
    const R = S.ring, sx = S.ringU0 - c.u0, a = blkUp(c.v0), b = blk(c.v0 + c.h);
    if (sx < 0 || sx + R.w > c.w || b <= a || b - a > R.h) return false;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, c.fb); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, R.fb);
    for (let att = 0; att < 2; att++) {
      gl.readBuffer(gl.COLOR_ATTACHMENT0 + att);
      gl.drawBuffers(att ? [gl.NONE, gl.COLOR_ATTACHMENT1] : [gl.COLOR_ATTACHMENT0, gl.NONE]);
      for (let v = a; v < b;) {
        const r = ((v % R.h) + R.h) % R.h, n = Math.min(b - v, R.h - r), y = v - c.v0;
        gl.blitFramebuffer(sx, y, sx + R.w, y + n, 0, r, R.w, r + n, gl.COLOR_BUFFER_BIT, gl.NEAREST);
        v += n;
      }
    }
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]); gl.readBuffer(gl.COLOR_ATTACHMENT0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    S.baked = [a, b];
    const nb = S.blocks.q.length;
    for (let k = a / BLOCK; k < b / BLOCK; k++) { const i = ((k % nb) + nb) % nb; S.blocks.id[i] = k; S.blocks.q[i] = 2; }
    stats.adopted = (stats.adopted || 0) + 1;
    return true;
  }

  // ------------------------------------------------------------------ pans (transitions.js)
  // 1. pan.prepare({ toX, toY }): before world.js moves to the next page (before __world.setCamera / measure()). Holds
  //    this page's ivy and lights (in wall px) so both pages draw as one surface, and bakes the wall for the whole move
  //    (both pages' columns, the rows on screen) into a wide cache, a slice per frame. Resolves when it is baked.
  // 2. pan.camera(x, y, { blur }) every frame of the move: the camera in wall px (as __world.setCamera), and the
  //    horizontal motion blur (Gaussian sd, CSS px; 0 at rest).
  // 3. pan.end(): after the move (the camera at the new page's position); back to the page-carried wall.
  // Strands keep swinging after the move: their skew animations are read off their canvases (or the held copies) each
  // frame. Until pan.camera is first called the view stays where it was.
  function bakeNext(p) {
    const [a, y, wd, n] = p.todo.shift(), c = p.cache;
    bakeInto(c, [c.u0, c.v0], 1, a, y, wd, n);
    stats.bakedRows += n;
    if (!p.todo.length) p.ready = true;
  }
  // the canvas fully shown and what it replaces hidden, at once (a fade-in still in flight would show black under a move)
  function opaque() {
    if (!S.shown) return;
    canvas.style.transition = 'none'; canvas.style.opacity = '1';
    html.classList.add('wall-gl');
    if (!S.ready) { S.ready = true; readyResolve(); }
  }
  const panApi = {
    async prepare({ toX = W.camera.x, toY = W.camera.y } = {}) {
      // Everything the first frames of the move need is made here, before returning to the caller, in whatever order the
      // caller then moves the camera: the tier on and opaque, the departing page's column drawn from rows baked for it.
      if (pan) panApi.end();
      S.preparing = true;   // (the tier draws for the move even where world.js has the world off screen)
      step(performance.now(), true);   // laid out for the current scroll and camera, and drawn
      opaque();
      // the page being left, taken NOW, before any await: transitions.js moves the camera to the next page a microtask
      // after calling this, so anything read after an await would be the arriving page's camera
      const from = { ...W.camera }, top = W.geo.top;
      const oldLights = pageLights(from, top);
      const near = (s) => s.vv - from.y + s.h > S.placed - S.ov - 300 && s.vv - from.y < S.placed - S.ov + S.h / S.dpr + 300;
      const oldStrands = pageStrands(from, top).filter(near).map((s) => ({ ...s, tex: upload(s)?.tex, keep: true, v: null }))
        .filter((s) => s.tex).map((s) => ({ ...s, get held() { return document.querySelector(`.tx-old--back canvas[data-vine="${s.id}"]`); } }));
      // the wide cache: both pages' columns, the canvas's rows (+ a little)
      const x0 = Math.min(from.x, toX), x1 = Math.max(from.x, toX) + S.vw;
      const u0 = Math.floor(x0 * S.dpr) - 8, w = Math.min(Math.ceil(x1 * S.dpr) + 8 - u0, 8192);
      const dy = Math.abs(toY - from.y);
      const v0 = Math.round((S.placed - S.ov + Math.min(from.y, toY)) * S.dpr) - 16, h = Math.min(S.h + Math.ceil(dy * S.dpr) + 32, 4096);
      const c = cache(w, h, gl.CLAMP_TO_EDGE); c.u0 = u0; c.v0 = v0;
      // the departing column now, whole (one bake, ~15 ms of GPU, inside the caller's decode wait): from here on the
      // view may be anywhere on it; the arriving columns follow a slice per frame (camera() finishes them at once if
      // the move starts first)
      const d0 = Math.max(0, Math.round(from.x * S.dpr) - u0 - 8), d1 = Math.min(w, d0 + S.w + 16);
      bakeInto(c, [u0, v0], 1, d0, 0, d1 - d0, h);
      stats.bakedRows += h;
      const todo = [];
      for (let y = 0; y < h; y += 640) for (const [a, b] of [[0, d0], [d1, w]]) if (b > a) todo.push([a, y, b - a, Math.min(640, h - y)]);
      // (in pan mode from here on: the view stays at the departing camera, and the ring is not re-keyed under it)
      const mine = pan = { cam: { ...from }, blur: 0, oldLights, oldStrands, cache: c, ready: false, todo, dirty: true };
      S.preparing = false;
      const next = () => new Promise((r) => { requestAnimationFrame(r); setTimeout(r, 34); });   // a frame (or a moment, if frames are held)
      while (pan === mine && todo.length) { bakeNext(mine); if (todo.length) await next(); }
      if (pan !== mine) return false;   // (ended or superseded meanwhile)
      mine.ready = true; mine.dirty = true;
      return true;
    },
    camera(x, y, { blur = 0, ca = 1, zoom = 1 } = {}) {
      if (!pan) return;
      while (pan.todo?.length) bakeNext(pan);   // (the move began before the slices were done: finish them now)
      opaque();
      pan.cam = { x, y }; pan.blur = blur; pan.ca = ca; pan.zoom = zoom; pan.dirty = true;
      step(performance.now(), true);
    },
    end() {
      if (!pan) return;
      // (its cache becomes the ring's start: see adopt)
      if (S.adopt) S.adopt.free();
      S.adopt = pan.ready ? pan.cache : (pan.cache?.free(), null);
      pan = null; S.preparing = false; S.key = ''; lastSig = 0;
      step(performance.now(), true);
    },
    get active() { return !!pan; },
    get debug() { return pan && { from: pan.cam, cache: pan.cache && { u0: pan.cache.u0, v0: pan.cache.v0, w: pan.cache.w, h: pan.cache.h, fb: pan.cache.fb } }; },
  };

  // ------------------------------------------------------------------ debug
  const px1 = new Uint8Array(4), sync = () => { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px1); };
  const bench = (f, n = 20) => { sync(); f(); sync(); const t = performance.now(); for (let i = 0; i < n; i++) f(); sync(); return +((performance.now() - t) / n).toFixed(2); };
  window.__wallgl = {
    canvas, gl, S, stats, ready, pan: panApi, HOME_FIT, HOME_RELIEF,
    // what it lights with and draws, read live from world.js every frame (lights: every pool/slab/firefly that is on)
    lists: () => ({ lights: pageLights(W.camera, W.geo.top).length, strands: pageStrands(W.camera, W.geo.top).length, uploaded: strands.size, fill: fill(), pageLift: PAGE_LIFT }), worldAt, get wpp() { return S.wpp; }, setCamera: (x, y, o) => panApi.camera(x, y, o), BOKEH,
    step: (force = true) => step(performance.now(), force), draw, sync, get memMB() { return memMB(); },
    bench() {
      const r0 = Math.round((S.placed - S.ov + viewCam().y) * S.dpr);
      // (a bake is timed through a draw that reads it, minus the draw: a readback alone does not wait for it)
      const fast = bench(() => draw('fast'));
      const bk = (coarse, rows) => +(bench(() => { bakeRows(blk(r0), blkUp(r0 + rows), coarse); draw('fast'); }, 4) - fast).toFixed(2);
      return { rest: bench(() => draw('rest')), fast, bakeScreenFull: bk(false, S.h), bakeScreenCoarse: bk(true, S.h), bake133cssRowsFull: bk(false, 266), bake133cssRowsCoarse: bk(true, 266), memMB: memMB() };
    },
  };
  document.dispatchEvent(new CustomEvent('wallgl:ready-api'));
}
