// GLSL for the hero lab. World space: wall is the z = 0 plane, camera looks down -z.

export const NFF = 24;

export const COMMON = /* glsl */`
uniform float uTime;
// where the wall's material (concrete, cracks, moss, grime) is read: scale, then offset, so the hero's wall can line up
// with lab/world/wall-gl.js's wall wherever the home page hangs on it (identity unless set: (1, 0, 0))
uniform vec3 uWallXf;
vec2 M(vec2 w){ return w * uWallXf.x + uWallXf.yz; }
uniform int uPass;            // 0 = beauty, 1 = god-ray occlusion buffer
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
const mat2 ROT = mat2(1.6, 1.2, -1.2, 1.6);
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++){ s += a * vnoise(p); p = ROT * p + 17.3; a *= .5; } return s / .97; }
float fbm3(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 3; i++){ s += a * vnoise(p); p = ROT * p + 17.3; a *= .5; } return s / .875; }
// distance to the nearest Voronoi border (Inigo Quilez)
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

export const WORDMARK = /* glsl */`
uniform sampler2D uSdf;
uniform vec2 uSdfMin, uSdfSize, uWmCenter;
uniform float uWmScale, uChipAmp;
uniform float uGlow;          // flickering backlight level
uniform vec3 uBulb;           // xy = bulb position behind the wall, z = its distance behind
uniform vec3 uGlowColor;
float wmSdfRaw(vec2 w){
  vec2 uv = ((w - uWmCenter) / uWmScale - uSdfMin) / uSdfSize, c = clamp(uv, 0., 1.);
  return (texture(uSdf, c).r + length((uv - c) * uSdfSize)) * uWmScale;
}
// broken concrete along the rim of the openings (only ever widens them); driven by the concrete photo so it stays cheap
uniform sampler2D uChipTex;
float chip(vec2 w){
  float a = texture(uChipTex, w * .21).r, b = texture(uChipTex, w * .83 + .37).r;
  return -uChipAmp * (pow(smoothstep(.35, .75, a), 1.5) + .45 * smoothstep(.3, .8, b));
}
float wmSdf(vec2 w, float z){ return wmSdfRaw(w) + chip(w) * smoothstep(-.06 * uWmScale, 0., z); }
vec2 wmGrad(vec2 w){
  float e = uWmScale * .006;
  vec2 g = vec2(wmSdfRaw(w + vec2(e, 0.)) - wmSdfRaw(w - vec2(e, 0.)), wmSdfRaw(w + vec2(0., e)) - wmSdfRaw(w - vec2(0., e)));
  return g / max(length(g), 1e-5);
}
float backIrr(vec2 w){ vec2 d = w - uBulb.xy; float h = uBulb.z; return uGlow * (.3 + .7 * h * h / (dot(d, d) + h * h)); }
`;

export const LIGHTS = /* glsl */`
#define NFF ${NFF}
uniform vec4 uFF[NFF];        // fireflies: xyz position, w power
uniform vec3 uFFCol[NFF];
uniform vec3 uKeyDir, uKeyCol, uTopPos, uTopCol, uAmb;
void ffLights(vec3 P, vec3 N, vec3 V, float shin, inout vec3 dif, inout vec3 spec, inout vec3 back){
  for (int i = 0; i < NFF; i++){
    vec3 Lv = uFF[i].xyz - P; float d2 = dot(Lv, Lv);
    float att = uFF[i].w / (1. + d2 * 14.) * (1. - smoothstep(2., 9., d2));
    if (att < 1e-4) continue;
    vec3 L = Lv * inversesqrt(d2), c = uFFCol[i] * att; float nl = dot(N, L);
    dif += c * max(nl, 0.);
    back += c * max(-nl, 0.);
    spec += c * pow(max(dot(N, normalize(L + V)), 0.), shin);
  }
}
void envLights(vec3 P, vec3 N, float shadow, inout vec3 dif, inout vec3 back){
  float k = dot(N, uKeyDir);
  dif += uKeyCol * max(k, 0.) * (1. - shadow);
  back += uKeyCol * max(-k, 0.) * (1. - shadow);
  vec3 Lv = uTopPos - P; float d2 = dot(Lv, Lv), t = dot(N, Lv * inversesqrt(d2)), att = 1. / (1. + d2 * .025);
  dif += uTopCol * att * max(t, 0.) * (1. - shadow * .85);
  back += uTopCol * att * max(-t, 0.) * (1. - shadow);
  dif += uAmb;
}
`;

// One lighting environment shared by every surface: the glowing letters as an area light,
// leaf shadows from the soft overhead light, and a thin haze that all light scatters in.
export const SCENE = /* glsl */`
uniform vec2 uDomMin, uDomSize, uGlowRes, uShadowShift;
uniform sampler2D uGlowTex, uShadow;
uniform float uGlowGain, uHaze, uFFHaze, uHazeInline;   // uHazeInline: 1 = per-pixel haze in each material (pre-Tier-2 path)
uniform vec3 uHazeCol;
float luma(vec3 c){ return dot(c, vec3(.2126, .7152, .0722)); }
// emission of the letter openings blurred over a footprint that widens with height above the wall,
// summed over several scales so the light has a long, soft tail
float glowLod(vec3 P){ return log2(max((.03 + max(P.z, 0.) * .9) / (uDomSize.x / uGlowRes.x), 1.)); }
vec3 glowField(vec3 P){
  vec2 uv = (P.xy - uDomMin) / uDomSize; float lod = glowLod(P);
  return (textureLod(uGlowTex, uv, lod).rgb * .45 + textureLod(uGlowTex, uv, lod + 1.5).rgb * .27
        + textureLod(uGlowTex, uv, lod + 3.).rgb * .17 + textureLod(uGlowTex, uv, lod + 4.5).rgb * .11) * uGlowGain;
}
void glowLight(vec3 P, vec3 N, inout vec3 dif, inout vec3 back){
  vec2 uv = (P.xy - uDomMin) / uDomSize; float lod = glowLod(P) + 1.5;
  vec2 o = exp2(lod) / uGlowRes;
  vec2 g = vec2(luma(textureLod(uGlowTex, uv + vec2(o.x, 0.), lod).rgb) - luma(textureLod(uGlowTex, uv - vec2(o.x, 0.), lod).rgb),
                luma(textureLod(uGlowTex, uv + vec2(0., o.y), lod).rgb) - luma(textureLod(uGlowTex, uv - vec2(0., o.y), lod).rgb));
  vec3 E = glowField(P);
  float gl = length(g), rel = clamp(gl / (luma(textureLod(uGlowTex, uv, lod).rgb) * 2. + 1e-4), 0., 1.);
  vec2 dir = gl > 1e-7 ? g / gl * rel : vec2(0.);
  vec3 L = normalize(vec3(dir, .12 - max(P.z, 0.) * 1.4 * (1. - rel * .6)));
  float nl = dot(N, L);
  dif += E * max(nl, 0.);
  back += E * max(-nl, 0.);
}
// coverage of the leaf shadow on the wall
float wallShadow(vec2 w){
  vec2 uv = (w - uDomMin) / uDomSize;
  return textureLod(uShadow, uv, 1.5).r * .55 + textureLod(uShadow, uv, 3.5).r * .45;
}
// is anything sitting between this point and the overhead light (leaves shading leaves)
float leafShadow(vec3 P){
  vec2 uv = (P.xy + uShadowShift * P.z - uDomMin) / uDomSize;
  return smoothstep(.03, .16, textureLod(uShadow, uv, 1.).g * 4. - P.z);
}
// single scattering along the view ray: the letters' glow and every firefly light up the haze in front of the wall,
// so anything nearer the camera naturally cuts into those halos
vec3 inScatterGlow(vec3 P, vec3 ro){
  vec3 rv = P - ro; float len = length(rv); vec3 rd = rv / len;
  float tA = rd.z < -1e-4 ? clamp((2.6 - ro.z) / rd.z, 0., len) : len;
  float seg = len - tA;
  vec3 s = vec3(0);
  for (int i = 0; i < 4; i++) s += glowField(ro + rd * mix(tA, len, (float(i) + .5) / 4.));
  return s * seg / 4. * uHaze + uHazeCol * seg;
}
vec3 inScatter(vec3 P, vec3 ro){
  vec3 rv = P - ro; float len = length(rv); vec3 rd = rv / len;
  vec3 s = inScatterGlow(P, ro);
  for (int i = 0; i < NFF; i++){
    vec3 pc = uFF[i].xyz - ro; float tc = dot(pc, rd);
    float h = max(sqrt(max(dot(pc, pc) - tc * tc, 0.)), .025);
    s += uFFCol[i] * uFF[i].w * (atan((len - tc) / h) + atan(tc / h)) / h * uFFHaze;
  }
  return s;
}
`;

// emission of the letter openings in wall space; mipmapped every frame and sampled by SCENE.glowField
export const GLOW_FRAG = /* glsl */`
${COMMON}
${WORDMARK}
uniform vec2 uDomMin, uDomSize, uGlowRes;
uniform float uFaceGain;
varying vec2 vUv;
void main(){
  vec2 w = uDomMin + vUv * uDomSize;
  float px = uDomSize.x / uGlowRes.x;
  gl_FragColor = vec4(uGlowColor * backIrr(w) * smoothstep(px, -px, wmSdfRaw(w)) * uFaceGain * .5, 1.);
}
`;

export const FS_VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }
`;

// ---------------------------------------------------------------- wall bake (static maps)
export const BAKE_FRAG = /* glsl */`
${COMMON}
${WORDMARK}
uniform sampler2D tDark, tLight, tGrowth;
uniform vec2 uDomMin, uDomSize;
varying vec2 vUv;
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
  vec2 w = uDomMin + vUv * uDomSize, m = M(w);   // w: where on the wall (letters, streaks); m: the material there
  float dk = texture(tDark, (m + vec2(10., 4.29)) / vec2(20., 8.58)).r;
  float lt = texture(tLight, m / vec2(9., 6.)).r;
  float cr = crackField(m);
  float s = wmSdf(w, 0.);
  float h = .55 * lt + .35 * dk - cr * .5;
  h -= (1. - smoothstep(0., .05 * uWmScale, s)) * .35;          // rim bevel into the openings

  float g = texture(tGrowth, vUv).r;
  float mn = fbm(m * 7.) * .6 + fbm(m * 23.) * .4;
  float moss = smoothstep(.38, .78, g * .95 + mn * .55 - .25 + cr * .3 * g) * smoothstep(0., .08 * uWmScale, s);
  h += moss * .1 * mn;

  // grime running down from the lower edges of the letters
  float streak = 0.;
  for (int i = 1; i <= 16; i++){
    float dy = float(i) * .09 * uWmScale;
    streak += (1. - smoothstep(0., .05 * uWmScale, wmSdfRaw(w + vec2(0., dy)))) * (1. - float(i) / 17.);
  }
  streak = clamp(streak / 5., 0., 1.) * smoothstep(.3, .8, vnoise(vec2(w.x * 22. / uWmScale, w.y * .9))) * smoothstep(.25, .6, fbm(w * 1.4 + 12.)) * smoothstep(0., .02, s);
  float drips = smoothstep(.68, .92, vnoise(vec2(m.x * 6., m.y * .25))) * smoothstep(.5, .85, fbm(m * .5 + 40.)) * .35;
  gl_FragColor = vec4(h, cr, moss, clamp(streak + drips, 0., 1.));
}
`;

// ---------------------------------------------------------------- wall + intruded wordmark
export const WALL_VERT = /* glsl */`
varying vec3 vWorld;
void main(){ vec4 wp = modelMatrix * vec4(position, 1.); vWorld = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }
`;

export const WALL_FRAG = /* glsl */`
${COMMON}
${WORDMARK}
${LIGHTS}
${SCENE}
uniform sampler2D tDark, tLight, uBake;
uniform vec2 uBakeTexel;
uniform float uDepth, uFaceGain, uSideGain, uBumpBig, uBumpFine;
uniform sampler2D uOctTex;            // spray stencil: r crisp, g soft edge, b overspray halo
uniform vec2 uOctCenter, uOctSize;    // world centre and size of the padded stencil
uniform vec3 uOctColor;
uniform float uOctOpacity;
uniform sampler2D uFFMap, uFFDir;      // firefly light on the wall: rgb = sum of light, xyz = light-weighted direction
uniform float uFFMapOn;
varying vec3 vWorld;

// all fireflies at once from the light map: total light from their combined direction (exact when one dominates)
void ffMapLights(vec3 P, vec3 N, vec3 V, float shin, inout vec3 dif, inout vec3 spec){
  vec2 uv = (P.xy - uDomMin) / uDomSize;
  vec3 E = texture(uFFMap, uv).rgb, d = texture(uFFDir, uv).xyz;
  float dl = length(d);
  if (dl < 1e-6) return;
  vec3 L = d / dl;
  dif += E * max(dot(N, L), 0.);
  spec += E * pow(max(dot(N, normalize(L + V)), 0.), shin);
}

vec2 octUV(vec2 w){ return (w - uOctCenter) / uOctSize + .5; }
// how much spray paint covers this spot of wall (0-1), before moss and grime grow back over it
float sprayPaint(vec2 w, float height, float crack){
  vec2 uv = octUV(w);
  if (any(lessThan(uv, vec2(0.))) || any(greaterThan(uv, vec2(1.)))) return 0.;
  vec3 m = texture(uOctTex, uv).rgb;
  // crisp stencil (keeps the suction-cup rings and eyes open) with a little spray falloff, plus speckled
  // overspray that thins out away from the strokes
  float body = max(m.r, m.g * .3);
  float speck = smoothstep(.72, .9, vnoise(w * 260.) * .7 + vnoise(w * 90.) * .3 + m.b * .35 - .1) * m.b * (1. - m.r);
  float paint = max(body, speck * .7);
  // thin paint catches the high points of the concrete and misses the pits
  paint *= mix(.45, 1., smoothstep(.2, .6, height + .25 * vnoise(w * 120.)));
  // weathering: faded patches, flaked spots, and broken wherever the wall has cracked
  paint *= 1. - .5 * smoothstep(.4, .75, fbm(w * 1.6 + 7.));
  paint *= 1. - .8 * smoothstep(.64, .69, fbm(w * 26. + 3.)) * smoothstep(.3, .6, fbm(w * 2. + 41.));
  paint *= 1. - crack;
  // a few drips running down from the heavier strokes
  float col = smoothstep(.8, .95, vnoise(vec2(w.x * 55., 1.7)));
  if (col > 0.){
    float len = .1 + .35 * vnoise(vec2(w.x * 23., 5.)), drip = 0.;
    for (int i = 1; i <= 8; i++){
      float f = float(i) / 8.;
      drip = max(drip, texture(uOctTex, octUV(w + vec2(0., f * len))).r * (1. - f * .9));
    }
    paint = max(paint, drip * col * (1. - m.r) * .8);
  }
  return paint;
}

vec3 shadeFace(vec3 q, vec3 rd){
  float sc = uWmScale;
  vec2 w = q.xy, lw = (w - uWmCenter) / sc;
  float sIn = max(-wmSdfRaw(w), 0.) / sc;
  vec2 g = wmGrad(w);
  float edge = 1. - smoothstep(0., .08, sIn), corner = 1. - smoothstep(0., .022, sIn);
  float bottom = edge * smoothstep(.15, .9, -g.y);
  vec2 par = rd.xy / max(-rd.z, .05) / sc;      // parallax into the translucent slab, letter units per world depth

  float cloud = fbm(lw * 2.4 + par * .1 * sc);
  float grain = fbm(lw * 9. + par * .035 * sc + 5.);
  float vein = 1. - smoothstep(0., .04, abs(fbm(lw * 1.7 + par * .06 * sc + 3.) - .52));

  float drip = smoothstep(.66, .94, vnoise(vec2(lw.x * 16., lw.y * 1.1 + 3.))) * smoothstep(.3, .85, fbm(lw * .8 + 70.));
  float dirt = smoothstep(.6, .86, fbm(lw * 3. + 90.));

  // light through a slab of uneven thickness: thin spots burn white, thick or dirty ones absorb towards amber.
  // Kept fairly clean: milky depth first, grime as an accent.
  float thick = .1 + 1.3 * pow(1. - cloud, 1.8) + .25 * grain + .45 * vein + .55 * edge + .8 * corner + .7 * dirt + .35 * drip;
  vec3 trans = exp(-thick * vec3(.24, .32, .5));

  vec3 tint = vec3(1.);
  tint = mix(tint, vec3(1., .86, .62), smoothstep(.45, .85, fbm(lw * 1.1 + 11.)) * .35);    // aged yellowing
  tint = mix(tint, vec3(.7, .87, .6), smoothstep(.62, .88, fbm(lw * 2.2 + 31.)) * .25);     // algae bloom
  float tide = smoothstep(.9, 1., fract(fbm(lw * 1.6 + 2.) * 3.5)) * smoothstep(.5, .7, fbm(lw * .9 + 50.));
  tint *= 1. - tide * .2;
  tint = mix(tint, vec3(.5, .37, .22), bottom * .4);                                         // tea-brown pooling low

  vec2 cq = lw * 2.3 + vec2(fbm(lw * 2.), fbm(lw * 2. + 8.)) * .45;
  float ce = voronoiEdge(cq), cmask = smoothstep(.56, .68, fbm(lw * 1.3 + 13.));
  float crack = (1. - smoothstep(.003, .011, ce)) * cmask;
  float scratch = smoothstep(.93, 1., vnoise(vec2(lw.x * 1.4 + lw.y * .2, lw.y * 85.))) * smoothstep(.55, .75, fbm(lw * 2.5 + 60.));

  // glossy poured-resin skin: rounded edges plus a faint ripple so reflections never sit perfectly flat
  float bev = 1. - smoothstep(0., .05, sIn);
  vec2 ripple = vec2(vnoise(lw * 4. + 3.), vnoise(lw * 4. + 11.)) - .5;
  vec3 N = normalize(vec3(g * pow(bev, 1.8) * 1.3 + ripple * .07, 1.));
  vec3 V = -rd, R = reflect(rd, N);
  float F = .05 + .95 * pow(1. - max(dot(N, V), 0.), 5.);
  // what the gloss reflects: the overhead fill as a soft panel, a dim room everywhere else
  vec3 env = mix(uAmb * 2., uTopCol * 1.6, smoothstep(-.2, .85, R.y))
           + uTopCol * 7. * smoothstep(.5, .85, R.y) * (1. - smoothstep(.25, .6, abs(R.x)));
  vec3 dif = vec3(0), spec = vec3(0), back = vec3(0);
  ffLights(q, N, V, 180., dif, spec, back);
  vec3 Lt = normalize(uTopPos - q);
  spec += uTopCol * pow(max(dot(N, normalize(Lt + V)), 0.), 260.) * 7.5;

  float irr = backIrr(w);
  vec3 em = uGlowColor * irr * uFaceGain * (tint * trans * (1. - crack * .6) + .2 * (1. - smoothstep(0., .04, ce)) * (1. - crack) * cmask * trans + scratch * .15);
  em *= 1. - bev * .3;                                     // light bends away at the rounded rim
  if (uPass == 1) return em;
  return em * (1. - F) + env * (F * 2.5 + .02) + spec * 1.35;
}

vec3 shadeSide(vec3 q, vec3 rd){
  vec2 g = wmGrad(q.xy);
  float d01 = clamp(-q.z / uDepth, 0., 1.);
  float gr = texture(tLight, q.xy * .3 + vec2(q.z * 2., 0.)).r;
  vec3 alb = vec3(.15, .18, .14) * (.5 + .9 * gr);
  float irr = backIrr(q.xy);
  vec3 lightIn = uGlowColor * irr * (.04 + 1.2 * pow(d01, 2.4)) * uSideGain;
  return alb * (lightIn + uAmb * .4);
}

vec3 shadeCavity(vec3 P, vec3 rd){
  float horiz = max(length(rd.xy), 1e-4);
  float tFace = (-uDepth - P.z) / rd.z;
  float t = 0., tPrev = 0.; bool side = false;
  for (int i = 0; i < 56; i++){
    vec3 q = P + rd * t;
    float s = wmSdf(q.xy, q.z);
    if (s >= 0.){ side = true; break; }
    tPrev = t;
    t += max(-s * .85, .0006 * uWmScale) / horiz;
    if (t >= tFace){ t = tFace; break; }
  }
  if (side){
    float lo = tPrev, hi = t;
    for (int k = 0; k < 6; k++){ float m = (lo + hi) * .5; vec3 q = P + rd * m; if (wmSdf(q.xy, q.z) >= 0.) hi = m; else lo = m; }
    t = hi;
  }
  vec3 q = P + rd * t;
  return side && t < tFace - 1e-5 ? shadeSide(q, rd) : shadeFace(P + rd * tFace, rd);
}

vec3 shadeWall(vec3 P, vec3 V, float s){
  vec2 buv = (P.xy - uDomMin) / uDomSize;
  vec4 b = texture(uBake, buv);
  float hx = texture(uBake, buv + vec2(uBakeTexel.x, 0.)).r - texture(uBake, buv - vec2(uBakeTexel.x, 0.)).r;
  float hy = texture(uBake, buv + vec2(0., uBakeTexel.y)).r - texture(uBake, buv - vec2(0., uBakeTexel.y)).r;
  vec2 mp = M(P.xy);   // the material here (see uWallXf)
  vec2 luv = mp / vec2(6., 4.); vec2 lt = vec2(1.5 / 3072., 1.5 / 2048.);
  float fx = texture(tLight, luv + vec2(lt.x, 0.)).r - texture(tLight, luv - vec2(lt.x, 0.)).r;
  float fy = texture(tLight, luv + vec2(0., lt.y)).r - texture(tLight, luv - vec2(0., lt.y)).r;
  vec3 N = normalize(vec3(-(hx * uBumpBig + fx * uBumpFine), -(hy * uBumpBig + fy * uBumpFine), 1.));

  float dk = texture(tDark, (mp + vec2(10., 4.29)) / vec2(20., 8.58)).r;
  float crack = b.g, moss = b.b, grime = b.a;
  vec3 alb = mix(vec3(.03, .055, .032), vec3(.15, .235, .135), smoothstep(.04, .42, dk));
  alb *= .75 + .5 * fbm(mp * .32);
  alb = mix(alb, alb * vec3(.85, 1.1, .8), smoothstep(.4, .7, fbm(mp * .5 + 31.)));     // greener damp patches
  float paint = sprayPaint(P.xy, b.r, crack) * uOctOpacity;                                  // the octopus, sprayed on
  alb = mix(alb, uOctColor * (.75 + .5 * fbm(P.xy * 4. + 9.)), paint);
  alb = mix(alb, vec3(.1, .19, .055) * (.65 + .7 * fbm(mp * 9.)), moss * .85);
  alb *= (1. - grime * .6) * (1. - crack * .78);

  float sh = wallShadow(P.xy);
  float ao = (1. - crack * .6) * (1. - sh * .45);
  vec3 dif = vec3(0), spec = vec3(0), back = vec3(0);
  envLights(P, N, sh, dif, back);
  dif *= ao;
  vec3 local = vec3(0);
  if (uFFMapOn > .5) ffMapLights(P, N, V, 14., local, spec);
  else ffLights(P, N, V, 14., local, spec, back);
  glowLight(P, N, local, back);
  dif += local * (1. - crack * .5);
  return alb * dif + spec * (.06 + moss * .04);
}

void main(){
  vec3 P = vWorld, V = normalize(cameraPosition - P);
  float s0 = wmSdf(P.xy, 0.);
  float fw = max(fwidth(s0), 1e-5);
  float a = smoothstep(-fw, fw, s0);
  vec3 cav = vec3(0), wall = vec3(0);
  if (a < 1.) cav = shadeCavity(P, -V);
  if (a > 0. && uPass == 0) wall = shadeWall(P, V, s0);
  vec3 col = mix(cav, wall, a);
  if (uPass == 0 && uHazeInline > .5) col += inScatter(P, cameraPosition);
  gl_FragColor = vec4(col, 1.);
}
`;

// ---------------------------------------------------------------- leaves
export const LEAF_VERT = /* glsl */`
attribute vec4 aRect;     // atlas rect u0 v0 u1 v1
attribute vec4 aParams;   // fold, curl, tint, translucency
varying vec2 vUv;
varying vec3 vN, vW;
varying vec4 vP;
void main(){
  vec3 p = position;
  p.z += abs(p.x) * aParams.x + p.y * p.y * aParams.y;
  vec3 n = normalize(vec3(-sign(p.x) * aParams.x, -2. * p.y * aParams.y, 1.));
  mat3 m = mat3(instanceMatrix);
  vec3 sc = vec3(length(m[0]), length(m[1]), length(m[2]));
  vN = normalize(mat3(modelMatrix) * (m * (n / (sc * sc))));
  vec4 wp = modelMatrix * instanceMatrix * vec4(p, 1.);
  vW = wp.xyz;
  vUv = mix(aRect.xy, aRect.zw, uv);
  vP = aParams;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const LEAF_FRAG = /* glsl */`
${COMMON}
${WORDMARK}
${LIGHTS}
${SCENE}
uniform sampler2D uAtlas;
uniform float uLeafTrans, uLeafGain;
varying vec2 vUv;
varying vec3 vN, vW;
varying vec4 vP;
void main(){
  vec4 t = texture(uAtlas, vUv);
  float a = clamp((t.a - .5) / max(fwidth(t.a), 1e-4) + .5, 0., 1.);
  if (a < .01) discard;
  if (uPass == 1){ gl_FragColor = vec4(0., 0., 0., a); return; }
  vec3 N = normalize(vN); bool front = gl_FrontFacing; if (!front) N = -N;
  vec3 V = normalize(cameraPosition - vW);
  float lum = dot(t.rgb, vec3(.3, .59, .11));
  vec3 alb = mix(vec3(lum), t.rgb, .62) * vec3(.72, .92, .62) * (.6 + .6 * vP.z);
  if (!front) alb = mix(alb, vec3(lum) * vec3(.5, .62, .45), .45);
  alb *= .8 + .4 * smoothstep(.1, .9, vUv.y - floor(vUv.y));

  // same lights as the wall: soft overhead fill (shaded by leaves above), fireflies, the letters' glow
  float occ = leafShadow(vW);
  vec3 dif = vec3(0), spec = vec3(0), back = vec3(0);
  envLights(vW, N, occ * .85, dif, back);
  dif *= 1. - occ * .35;
  ffLights(vW, N, V, 40., dif, spec, back);
  glowLight(vW, N, dif, back);

  vec3 transCol = t.rgb * t.rgb * vec3(1.25, 1.55, .55) * (.5 + .9 * lum);
  vec3 col = alb * dif * uLeafGain + transCol * back * uLeafTrans * vP.w + spec * .25 * (1. - occ * .7);
  if (uHazeInline > .5) col += inScatter(vW, cameraPosition);
  gl_FragColor = vec4(col, a);
}
`;

export const LEAF_SHADOW_VERT = /* glsl */`
attribute vec4 aRect;
attribute vec4 aParams;
uniform vec2 uShadowShift;
varying vec2 vUv;
varying float vZ;
void main(){
  vec3 p = position;
  p.z += abs(p.x) * aParams.x + p.y * p.y * aParams.y;
  vec4 wp = modelMatrix * instanceMatrix * vec4(p, 1.);
  vZ = wp.z;
  wp.xy += uShadowShift * wp.z;
  vUv = mix(aRect.xy, aRect.zw, uv);
  gl_Position = projectionMatrix * viewMatrix * vec4(wp.xy, 0., 1.);
}
`;

// shadow map, blended with MAX: r = coverage, g = height of the highest occluder / 4
export const LEAF_SHADOW_FRAG = /* glsl */`
uniform sampler2D uAtlas;
varying vec2 vUv;
varying float vZ;
void main(){ if (texture(uAtlas, vUv).a < .5) discard; gl_FragColor = vec4(1., vZ / 4., 0., 1.); }
`;

// ---------------------------------------------------------------- stems
export const STEM_VERT = /* glsl */`
varying vec3 vN, vW;
void main(){ vec4 wp = modelMatrix * vec4(position, 1.); vW = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }
`;

export const STEM_FRAG = /* glsl */`
${COMMON}
${WORDMARK}
${LIGHTS}
${SCENE}
varying vec3 vN, vW;
void main(){
  if (uPass == 1){ gl_FragColor = vec4(0., 0., 0., 1.); return; }
  vec3 N = normalize(vN), V = normalize(cameraPosition - vW);
  float occ = leafShadow(vW);
  vec3 dif = vec3(0), spec = vec3(0), back = vec3(0);
  envLights(vW, N, occ * .85, dif, back);
  dif *= 1. - occ * .35;
  ffLights(vW, N, V, 20., dif, spec, back);
  glowLight(vW, N, dif, back);
  // woody ivy stem: brown bark with green young growth, fine ridges, matte
  float ridge = vnoise(vW.xy * 140.) * .5 + vnoise(vW.xy * 37.) * .5;
  vec3 alb = mix(vec3(.055, .07, .03), vec3(.085, .062, .04), smoothstep(.35, .7, vnoise(vW.xy * 6.)));
  alb *= .55 + .7 * ridge;
  gl_FragColor = vec4(alb * (dif + back * .15) + spec * .02 + (uHazeInline > .5 ? inScatter(vW, cameraPosition) : vec3(0)), 1.);
}
`;

export const STEM_SHADOW_VERT = /* glsl */`
uniform vec2 uShadowShift;
varying float vZ;
void main(){ vec4 wp = modelMatrix * vec4(position, 1.); vZ = wp.z; wp.xy += uShadowShift * wp.z; gl_Position = projectionMatrix * viewMatrix * vec4(wp.xy, 0., 1.); }
`;

export const STEM_SHADOW_FRAG = /* glsl */`varying float vZ; void main(){ gl_FragColor = vec4(1., vZ / 4., 0., 1.); }`;

// ---------------------------------------------------------------- fireflies + dust
export const FF_VERT = /* glsl */`
uniform float uPx;
attribute vec3 aColor;
attribute float aSize;
varying vec3 vColor;
void main(){
  vec4 mv = viewMatrix * modelMatrix * vec4(position, 1.);
  vColor = aColor;
  gl_PointSize = aSize * uPx / -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

export const FF_FRAG = /* glsl */`
uniform int uPass;
varying vec3 vColor;
void main(){
  vec2 c = gl_PointCoord - .5; float r2 = dot(c, c) * 4.;
  if (r2 > 1.) discard;
  // just the hot body of the light; its glow comes from SCENE.inScatter so it shares the haze with everything else
  float core = exp(-r2 * 70.) * 7. + exp(-r2 * 22.) * .7;
  gl_FragColor = vec4(vColor * core * (uPass == 1 ? 0. : 1.), 1.);
}
`;

export const DUST_VERT = /* glsl */`
${COMMON}
${WORDMARK}
${LIGHTS}
${SCENE}
attribute vec4 aSeed;
uniform vec3 uBoxMin, uBoxSize, uBoxOrigin;   // origin: where the box started; uBoxMin: where it is now (it follows the camera)
uniform float uPx;
varying vec3 vCol;
void main(){
  float t = uTime;
  vec3 p = uBoxOrigin + aSeed.xyz * uBoxSize;
  p += vec3(t * (.025 + .03 * aSeed.y) + sin(t * .11 + aSeed.w * 30.) * .3, t * (.015 + .04 * aSeed.x), sin(t * .07 + aSeed.y * 20.) * .25);
  p.x += .12 * sin(t * .5 + p.y * 1.3 + aSeed.w * 6.);
  p = uBoxMin + mod(p - uBoxMin, uBoxSize);

  // motes only show where the scene's own lights reach them
  vec3 L = vec3(0);
  for (int i = 0; i < NFF; i++){ vec3 d = uFF[i].xyz - p; L += uFFCol[i] * uFF[i].w / (1. + dot(d, d) * 14.) * (1. - smoothstep(2., 9., dot(d, d))); }
  vCol = (L * .5 + glowField(p) * .9 + uAmb * 2.) * (.3 + .7 * fract(aSeed.w * 7.31));

  vec4 mv = viewMatrix * vec4(p, 1.);
  gl_PointSize = (.006 + .012 * aSeed.w) * uPx / -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

export const DUST_FRAG = /* glsl */`
varying vec3 vCol;
void main(){ float a = smoothstep(.5, .1, length(gl_PointCoord - .5)); gl_FragColor = vec4(vCol * a, 1.); }
`;

// ---------------------------------------------------------------- post
export const GODRAYS_FRAG = /* glsl */`
uniform sampler2D tDiffuse, tOcc, tHaze;
uniform vec2 uLightUV;
uniform float uDensity, uWeight, uDecay, uExposure, uTime, uHazeOn, uFFHaze, uHazeMix;   // uHazeMix: 1, eased to 0 by a pan's lite mode
uniform vec4 uFF[${NFF}];
uniform vec3 uFFCol[${NFF}];
uniform mat4 uInvViewProj;
uniform vec3 uEye;
// each firefly lighting the haze along this pixel's view ray (closed-form single scattering)
vec3 fireflyHaze(vec2 uv){
  vec4 a = uInvViewProj * vec4(uv * 2. - 1., -1., 1.), b = uInvViewProj * vec4(uv * 2. - 1., 1., 1.);
  vec3 rd = normalize(b.xyz / b.w - a.xyz / a.w);
  float len = (texture(tOcc, uv).a - uEye.z) / rd.z;
  vec3 s = vec3(0);
  for (int i = 0; i < ${NFF}; i++){
    if (uFF[i].w < 1e-4) continue;
    vec3 pc = uFF[i].xyz - uEye; float tc = dot(pc, rd);
    float h = max(sqrt(max(dot(pc, pc) - tc * tc, 0.)), .025);
    s += uFFCol[i] * uFF[i].w * (atan((len - tc) / h) + atan(tc / h)) / h * uFFHaze;
  }
  return s;
}
varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453); }
void main(){
  #ifndef TAPS
  #define TAPS 96
  #endif
  const int N = TAPS;
  vec2 delta = (vUv - uLightUV) * uDensity / float(N);
  vec2 uv = vUv - delta * h(vUv);
  float illum = 1.; vec3 acc = vec3(0);
  if (uExposure > 0.) for (int i = 0; i < N; i++){ uv -= delta; acc += texture(tOcc, uv).rgb * illum * uWeight; illum *= uDecay; }
  // also composite the haze here (before bloom, as when it lived in the materials): glow haze from its
  // reduced-res pass, fireflies' sharp halos at full res
  vec3 haze = uHazeOn > .5 && uHazeMix > 0. ? (texture(tHaze, vUv).rgb + fireflyHaze(vUv)) * uHazeMix : vec3(0);
  gl_FragColor = vec4(texture(tDiffuse, vUv).rgb + acc * uExposure + haze, 1.);
}
`;

export const GRADE_FRAG = /* glsl */`
uniform sampler2D tDiffuse;
uniform float uTime, uVignette, uGrain, uLift, uCA;   // uLift: 0 keeps the opening frames truly black; uCA: 0 for stills
uniform vec2 uRes;
uniform vec3 uLiftCol;   // the green the blacks are lifted to
uniform vec2 uEdges;     // the screen's bottom and top edges in this canvas (uv y): the canvas overhangs the screen on the site
uniform float uMBlur;   // a pan's horizontal motion blur (Gaussian-ish sd, device px; lab/world/transitions.js)
uniform float uBokeh, uBand;   // edge bokeh (as lab/world/wall-gl.js): blur radius at the very edge and the band it eases over, device px
varying vec2 vUv;
const vec2 DISC[12] = vec2[12](vec2(-.326, -.406), vec2(-.840, -.074), vec2(-.696, .457), vec2(-.203, .621), vec2(.962, -.195), vec2(.473, -.480),
  vec2(.519, .767), vec2(.185, -.893), vec2(.507, .064), vec2(.896, .412), vec2(-.322, -.933), vec2(-.792, -.598));
float h(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main(){
  vec2 c = vUv - .5; float r2 = dot(c, c);
  vec2 off = c * r2 * .02 * uCA;   // lateral chromatic aberration: zero at the centre so the wordmark stays crisp, grows toward the corners
  // edge bokeh: a depth-of-field blur easing in toward the screen's top and bottom (the wordmark, mid-screen, stays crisp)
  float yd = vUv.y * uRes.y, e = min(yd - uEdges.x * uRes.y, uEdges.y * uRes.y - yd);
  float rad = uBokeh * (1. - smoothstep(0., uBand, e));
  vec2 ext = vec2(max(rad, uMBlur * 2.2), rad);   // the disc, stretched sideways by a pan's motion blur
  vec3 col;
  if (ext.x < .5) col = vec3(texture(tDiffuse, vUv - off).r, texture(tDiffuse, vUv).g, texture(tDiffuse, vUv + off).b);
  else {
    col = vec3(0);
    for (int i = 0; i < 12; i++){ vec2 p = vUv + DISC[i] * ext / uRes; col += vec3(texture(tDiffuse, p - off).r, texture(tDiffuse, p).g, texture(tDiffuse, p + off).b); }
    col /= 12.;
  }
  float l = dot(col, vec3(.2126, .7152, .0722));
  col += uLiftCol * (1. - smoothstep(0., .12, l)) * uLift;  // green-lifted blacks
  col *= mix(vec3(1.), vec3(1.04, 1., .93), smoothstep(.4, 2.5, l));        // warm highlights
  float v = smoothstep(1.0, .22, length(c * vec2(1., 1.2)));
  v *= mix(.62, 1., smoothstep(-.05, .45, vUv.y));                           // heavier at the bottom, like the poster
  col *= mix(1., v, uVignette);
  col += (h(vUv * uRes + fract(uTime * 13.) * 517.) - .5) * uGrain * (.25 * uLift + sqrt(l));
  gl_FragColor = vec4(max(col, 0.), 1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  // half a level of dither on the 8-bit output: the sign's haze falls off over just a few levels near black, and
  // without it those levels quantise into flat steps (the coarse glow mips make them run the full width: a "band").
  // The moving grain hides this on screen; it matters where grain is off (the phone plates, stills).
  // (ordered, 4 x 4 Bayer: as smooth to the eye as noise, and a still keeps it losslessly at a fraction of the size)
  const float BAYER[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
  ivec2 bq = ivec2(mod(gl_FragCoord.xy, 4.));
  gl_FragColor.rgb += ((BAYER[bq.y * 4 + bq.x] + .5) / 16. - .5) / 255.;
}
`;

// ---------------------------------------------------------------- Tier 2: cheaper atmosphere passes
// Rebuilds the world point a screen pixel sees at height z above the wall, from the camera's inverse view-projection.
const VIEW_RAY = /* glsl */`
uniform mat4 uInvViewProj;
uniform vec3 uEye;
vec3 viewRay(vec2 uv){
  vec4 a = uInvViewProj * vec4(uv * 2. - 1., -1., 1.), b = uInvViewProj * vec4(uv * 2. - 1., 1., 1.);
  return normalize(b.xyz / b.w - a.xyz / a.w);
}
`;

// God-ray source at quarter res: the letters' glow map seen on the wall (alpha = surface height, 0 for the wall).
export const OCC_FRAG = /* glsl */`
${VIEW_RAY}
uniform sampler2D uGlowTex;
uniform vec2 uDomMin, uDomSize;
uniform float uOccGain;
varying vec2 vUv;
void main(){
  vec3 rd = viewRay(vUv);
  vec2 w = uEye.xy + rd.xy * (-uEye.z / rd.z);
  gl_FragColor = vec4(textureLod(uGlowTex, (w - uDomMin) / uDomSize, 0.).rgb * uOccGain, 0.);
}
`;

// Leaves and stems in the god-ray source: black occluders that record their height for the haze pass.
export const LEAF_OCC_FRAG = /* glsl */`
uniform sampler2D uAtlas;
varying vec2 vUv;
varying vec3 vN, vW;
varying vec4 vP;
void main(){ if (texture(uAtlas, vUv).a < .5) discard; gl_FragColor = vec4(0., 0., 0., vW.z); }
`;
export const STEM_OCC_FRAG = /* glsl */`
varying vec3 vN, vW;
void main(){ gl_FragColor = vec4(0., 0., 0., vW.z); }
`;

// Haze at reduced resolution: the same single-scattering integral, evaluated once per low-res pixel.
export const HAZE_FRAG = /* glsl */`
${COMMON}
${WORDMARK}
${LIGHTS}
${SCENE}
${VIEW_RAY}
uniform sampler2D tOcc;
varying vec2 vUv;
void main(){
  vec3 rd = viewRay(vUv);
  float z = texture(tOcc, vUv).a;
  gl_FragColor = vec4(inScatterGlow(uEye + rd * ((z - uEye.z) / rd.z), uEye), 1.);   // fireflies' sharp halos are added at full res in the grade
}
`;

// Firefly light map: each firefly splats its light onto the wall plane (rendered with the top-down shadow camera).
export const FFMAP_VERT = /* glsl */`
${LIGHTS}
uniform float uTexelWorld;
varying vec4 vLight;
varying vec3 vCol;
void main(){
  vLight = uFF[gl_VertexID];
  vCol = uFFCol[gl_VertexID];
  gl_Position = projectionMatrix * viewMatrix * vec4(vLight.xy, 0., 1.);
  gl_PointSize = 6. / uTexelWorld;   // the light's full reach (d² < 9)
}
`;
export const FFMAP_FRAG = /* glsl */`
uniform int uMode;
varying vec4 vLight;
varying vec3 vCol;
void main(){
  vec2 off = (gl_PointCoord - .5) * vec2(6., -6.);   // this wall point relative to the firefly
  float d2 = dot(off, off) + vLight.z * vLight.z;
  float att = vLight.w / (1. + d2 * 14.) * (1. - smoothstep(2., 9., d2));
  gl_FragColor = uMode == 0 ? vec4(vCol * att, att) : vec4(normalize(vec3(-off, vLight.z)) * att, 0.);
}
`;
