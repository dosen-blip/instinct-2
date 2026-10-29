import * as THREE from 'three';
import { LEAF_VERT, LEAF_FRAG, LEAF_SHADOW_VERT, LEAF_SHADOW_FRAG, STEM_VERT, STEM_FRAG, STEM_SHADOW_VERT, STEM_SHADOW_FRAG, LEAF_OCC_FRAG, STEM_OCC_FRAG } from './shaders.js';

export const rng = (seed) => () => {
  seed |= 0; seed = seed + 0x6D2B79F5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

// Physics: climbers are pinned to the wall. Hanging tendrils are ropes (Gauss-Seidel distance constraints plus a
// long-range cap to the anchor, so they can't stretch) swinging under gravity. Upright stalks and the loose strand
// bend as a whole on one slow, well-damped sway spring (~0.7-1 Hz), so stems arc smoothly instead of wobbling.
const GRAVITY = 24, STEP = 1 / 240, ITERATIONS = 4, ROPE_ITERATIONS = 32, RADIAL = 6, LEAF_SCALE = 1.35, STEM_SCALE = .6;
const IVY_CELLS = [[0, 2], [1, 1], [2, 1], [3, .8], [4, 1.1], [5, 1], [6, 2.4], [7, 1]];
const SPRIG_CELLS = [8, 9, 10];

// Layout in viewport-normalised units: x, y span the visible wall in [-1, 1]; z is world units off the wall.
const STRANDS = [
  // climbing ivy, pinned to the concrete
  { kind: 'climb', pts: [[.86, -1.15, .05], [.8, -.75, .06], [.84, -.35, .05], [.76, .05, .07], [.8, .4, .06], [.7, .75, .05], [.74, 1.15, .05]], r: [.034, .02], leaf: { size: [.18, .34], per: 3, spread: .2 } },
  { kind: 'climb', pts: [[.98, -1.15, .06], [.93, -.6, .08], [.97, -.1, .07], [.9, .3, .08]], r: [.028, .014], leaf: { size: [.2, .36], per: 3, spread: .2 } },
  { kind: 'climb', pts: [[.74, .62, .06], [.58, .57, .08], [.44, .66, .07], [.3, .6, .09], [.18, .66, .1], [.07, .61, .12]], r: [.02, .009], leaf: { size: [.14, .26], per: 2, spread: .07 } },
  { kind: 'climb', pts: [[1.12, .96, .05], [.98, .88, .06], [.93, .7, .05], [.97, .5, .06], [.92, .3, .05]], r: [.026, .012], leaf: { size: [.16, .3], per: 2, spread: .14 } },
  { kind: 'climb', loose: true, pts: [[.8, .24, .07], [.7, .13, .12], [.62, .03, .17], [.55, -.09, .2], [.5, -.21, .18]], r: [.018, .007], leaf: { size: [.14, .24], per: 1, spread: .05 } },
  { kind: 'climb', pts: [[-.45, -1.12, .06], [-.2, -.9, .08], [.1, -.95, .07], [.4, -.84, .08], [.72, -.9, .06], [1.12, -.8, .06]], r: [.026, .014], leaf: { size: [.2, .38], per: 3, spread: .2 } },
  { kind: 'climb', pts: [[-1.12, -.6, .05], [-.95, -.77, .06], [-.86, -.97, .06], [-.8, -1.15, .05]], r: [.02, .01], leaf: { size: [.16, .28], per: 1, spread: .08 } },
  { kind: 'climb', pts: [[-.76, 1.14, .05], [-.7, .96, .06], [-.77, .82, .07]], r: [.016, .008], leaf: { size: [.14, .24], per: 1, spread: .06 } },
  // free-hanging tendrils that swing with real weight
  { kind: 'hang', from: [2, .42], len: 1.3, z: .16, r: [.011, .004], leaf: { size: [.13, .22] } },
  { kind: 'hang', from: [2, 1], len: .7, z: .18, r: [.01, .004], leaf: { size: [.12, .2] } },
  { kind: 'hang', top: -.58, len: 2.5, z: .36, r: [.013, .004], leaf: { size: [.13, .23] } },
  { kind: 'hang', top: -.4, len: 1.5, z: .26, r: [.011, .004], leaf: { size: [.12, .21] } },
  { kind: 'hang', from: [3, .45], len: 1.8, z: .22, r: [.012, .004], leaf: { size: [.13, .23] } },
  { kind: 'hang', from: [0, .52], len: 1.1, z: .2, r: [.011, .004], leaf: { size: [.12, .21] } },
  { kind: 'hang', top: .5, len: 'wordmark', z: .46, r: [.013, .004], leaf: { size: [.13, .24] } },
  { kind: 'hang', top: .22, len: 1.2, z: .3, r: [.01, .004], leaf: { size: [.12, .2] } },
  // springy foreground growth rising from the bottom edge, close to camera
  { kind: 'stalk', base: [.98, -1.08, 1.1], height: 2.3, lean: [-.35, .1], r: [.03, .008], leaf: { size: [.36, .62] } },
  { kind: 'stalk', base: [.72, -1.08, .7], height: 1.6, lean: [-.2, .2], r: [.026, .007], leaf: { size: [.3, .52] } },
  { kind: 'stalk', base: [.5, -1.08, 1.5], height: 1.3, lean: [.25, .1], r: [.026, .007], leaf: { size: [.38, .64] } },
  { kind: 'stalk', base: [.86, -1.08, 1.8], height: 1.8, lean: [.2, .2], r: [.03, .008], leaf: { size: [.42, .7] } },
  { kind: 'stalk', base: [.62, -1.08, 2.4], height: 1.1, lean: [-.1, .3], r: [.03, .008], leaf: { size: [.45, .75] } },
  { kind: 'stalk', base: [.12, -1.08, .9], height: 1.0, lean: [-.15, .1], r: [.022, .006], leaf: { size: [.3, .5] } },
  { kind: 'stalk', base: [-.05, -1.08, 1.4], height: .8, lean: [.2, .15], r: [.022, .006], leaf: { size: [.34, .56] } },
  { kind: 'stalk', base: [-.88, -1.08, 1.2], height: 1.1, lean: [.25, .1], r: [.024, .006], leaf: { size: [.32, .55] } },
];

// Below the hero (only when the page scrolls the camera down the wall): the ivy keeps climbing up from further down, and
// the foreground stalks turn out to be branches that leave the wall lower down. Static (pinned exactly, no simulation),
// built from their own random stream so everything above is unchanged. `join`: the strand index whose first node this
// one runs into. y spans the page down to about -3.2 (the bottom of the live part of the home page).
const IVY = (size, per, spread) => ({ size, per, spread });
const EXTENSION = [
  { kind: 'climb', join: 0, pts: [[.9, -3.3, .05], [.83, -2.75, .07], [.9, -2.2, .05], [.82, -1.65, .07], [.86, -1.15, .05]], r: [.04, .034], leaf: IVY([.18, .34], 3, .2) },
  { kind: 'climb', join: 1, pts: [[1.04, -3.3, .06], [.96, -2.6, .08], [1.01, -2, .06], [.94, -1.55, .08], [.98, -1.15, .06]], r: [.034, .028], leaf: IVY([.2, .36], 3, .2) },
  { kind: 'climb', join: 5, pts: [[-.62, -3.3, .06], [-.5, -2.6, .08], [-.6, -1.85, .07], [-.45, -1.12, .06]], r: [.03, .026], leaf: IVY([.16, .3], 2, .14) },
  { kind: 'climb', join: 6, pts: [[-.98, -3.3, .05], [-.86, -2.65, .06], [-.93, -2.05, .05], [-.78, -1.6, .06], [-.8, -1.15, .05]], r: [.022, .01], leaf: IVY([.14, .26], 2, .1) },
  { kind: 'climb', pts: [[-1.12, -3.25, .05], [-1.01, -2.8, .06], [-1.07, -2.35, .05], [-.97, -1.95, .07], [-1.13, -1.6, .05]], r: [.026, .01], leaf: IVY([.16, .3], 2, .14) },
  { kind: 'climb', pts: [[1.12, -2.9, .05], [.99, -2.5, .06], [.9, -2.62, .07], [.78, -2.5, .06], [.66, -2.62, .07]], r: [.02, .008], leaf: IVY([.14, .26], 2, .08) },
  // branches: from the wall, up and away from it into each foreground stalk's base (the stalk then sways from there)
  ...[[16, .1], [17, .2], [18, .38], [19, .16], [20, .3], [21, .1], [22, -.15], [23, -.12]].map(([stalk, dx]) => {
    const [bx, , bz] = STRANDS[stalk].base;
    return { kind: 'climb', join: stalk, branch: true, pts: [[bx + dx, -2.75, .06], [bx + dx * .8, -2.15, bz * .3], [bx + dx * .3, -1.5, bz * .8], [bx, -1.08, bz]],
      r: [STRANDS[stalk].r[0] * 1.25, STRANDS[stalk].r[0]], leaf: IVY([.14, .26], 1, .04) };
  }),
];

export class Vines {
  constructor(U, atlas, atlasMeta) {
    this.U = U;
    this.meta = atlasMeta;
    this.group = new THREE.Group();
    const leafUniforms = { ...U, uAtlas: { value: atlas }, uLeafTrans: { value: 1.7 }, uLeafGain: { value: 1 } };
    this.leafUniforms = leafUniforms;
    this.leafMat = new THREE.ShaderMaterial({ uniforms: leafUniforms, vertexShader: LEAF_VERT, fragmentShader: LEAF_FRAG, side: THREE.DoubleSide, alphaToCoverage: true });
    // shadow map keeps the highest occluder per texel (MAX blending) so leaves can shade leaves beneath them
    const maxBlend = { blending: THREE.CustomBlending, blendEquation: THREE.MaxEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, depthTest: false, depthWrite: false };
    this.leafShadowMat = new THREE.ShaderMaterial({ uniforms: { uAtlas: leafUniforms.uAtlas, uShadowShift: U.uShadowShift }, vertexShader: LEAF_SHADOW_VERT, fragmentShader: LEAF_SHADOW_FRAG, side: THREE.DoubleSide, ...maxBlend });
    this.stemMat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: STEM_VERT, fragmentShader: STEM_FRAG });
    this.stemShadowMat = new THREE.ShaderMaterial({ uniforms: { uShadowShift: U.uShadowShift }, vertexShader: STEM_SHADOW_VERT, fragmentShader: STEM_SHADOW_FRAG, ...maxBlend });
    // god-ray / haze source: black occluders that record their height (no alpha-to-coverage, alpha carries z)
    this.leafOccMat = new THREE.ShaderMaterial({ uniforms: { uAtlas: leafUniforms.uAtlas }, vertexShader: LEAF_VERT, fragmentShader: LEAF_OCC_FRAG, side: THREE.DoubleSide, depthTest: false, depthWrite: false });
    this.stemOccMat = new THREE.ShaderMaterial({ vertexShader: STEM_VERT, fragmentShader: STEM_OCC_FRAG, depthTest: false, depthWrite: false });
    this.wind = new THREE.Vector3();
  }

  build(halfW, halfH, wm, { extend = false } = {}) {
    this.dispose();
    const main = rng(1337), more = rng(4241);
    let R = main;
    const rand = (a, b) => a + (b - a) * R();
    const extra = (spec) => EXTENSION.includes(spec);
    const nodes = this.nodes = [], links = this.links = [], strands = this.strands = [], leaves = this.leaves = [];
    // k: per-substep pull to the rest position (pinned ivy); K: shape-memory stiffness in 1/s² (= ω²); c: air drag in 1/s
    const node = (x, y, z, o) => {
      const n = { x, y, z, px: x, py: y, pz: z, rx: x, ry: y, rz: z, w: 1, k: 0, K: 0, c: 3, g: 1, wk: 1, zMin: .02, follow: null, ...o };
      nodes.push(n); return n;
    };
    const chain = (list, kind, spec) => {
      const sway = kind === 'stalk' || !!spec.loose, flexible = kind === 'hang';
      for (let i = 1; i < list.length; i++) {
        const a = list[i - 1], b = list[i];
        b.sx = b.x - a.x; b.sy = b.y - a.y; b.sz = b.z - a.z;
        b.len = Math.hypot(b.sx, b.sy, b.sz);
        b.dx = b.sx / b.len; b.dy = b.sy / b.len; b.dz = b.sz / b.len;
        b.reach = (a.reach || 0) + b.len;
        if (!flexible && (a.w || b.w)) links.push({ a, b, len: b.len });   // a link between two pinned nodes does nothing
      }
      const st = { nodes: list, kind, spec, flexible, still: extra(spec) };
      if (sway) {
        const w = (spec.loose ? .7 : .9) * rand(.85, 1.15) * Math.PI * 2;
        st.sway = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, K: w * w, c: 2 * .55 * w, wk: spec.loose ? .8 : 1.8 };
      }
      strands.push(st);
    };

    for (const spec of extend ? [...STRANDS, ...EXTENSION] : STRANDS) {
      R = extra(spec) ? more : main;
      const list = [];
      if (spec.kind === 'climb') {
        const pts = spec.pts.map(([x, y, z]) => new THREE.Vector3(x * halfW, y * halfH, z));
        const join = spec.join !== undefined ? strands[spec.join].nodes[0] : null;
        if (join) pts[pts.length - 1].set(join.rx, join.ry, join.rz);
        const curve = new THREE.CatmullRomCurve3(pts);
        const count = Math.max(4, Math.round(curve.getLength() / .07));
        curve.getSpacedPoints(count).forEach((p, i) => {
          const jitter = join && i === count ? 0 : (R() - .5) * .025;
          list.push(node(p.x + jitter, p.y, p.z, extra(spec) ? { w: 0, zMin: 0 } : spec.loose ? { w: 0, zMin: .05 } : { k: .2, c: 6, g: 0, wk: .12 }));
        });
      } else if (spec.kind === 'hang') {
        let anchor;
        if (spec.from) {
          const parent = strands[spec.from[0]].nodes;
          const p = parent[Math.round(spec.from[1] * (parent.length - 1))];
          anchor = node(p.x, p.y, p.z, { w: 0, follow: p });
        } else {
          // anchored well above the frame (and its overscan), so the tendril reads as hanging in from out of view, with
          // or without the header covering the top edge; the extra reach is added to the rope's length below
          anchor = node(spec.top * halfW, halfH * 1.6, spec.z * .5, { w: 0 });
        }
        list.push(anchor);
        const reach = spec.from ? 0 : halfH * (1.6 - 1.12);
        const len = spec.len === 'wordmark' ? anchor.y - (wm.y + wm.h * .55) : spec.len + reach;
        const count = Math.max(4, Math.round(len / .06));
        const side = R() < .5 ? -1 : 1, curl = rand(.12, .4) * len * .3;
        for (let i = 1; i <= count; i++) {
          const f = i / count, kink = (i % 2 ? 1 : -1) * .006;
          // tendrils keep a slight outward curl; gravity does the rest, swinging like a pendulum (~0.6 Hz for 1.5 units)
          list.push(node(anchor.x + side * curl * f * f + kink, anchor.y - f * len, anchor.z + (spec.z - anchor.z) * Math.min(1, f * 3),
            { K: 2.5, c: 1.5, g: 1, wk: 1, zMin: .04 }));
        }
      } else {
        const [bx, by, bz] = spec.base;
        const count = Math.max(4, Math.round(spec.height / .08));
        for (let i = 0; i <= count; i++) {
          const f = i / count, kink = (i % 2 ? 1 : -1) * .008;
          list.push(node(bx * halfW + spec.lean[0] * f * f + kink, by * halfH + spec.height * f, bz + spec.lean[1] * f * f, { w: 0, zMin: .1 }));
        }
      }
      chain(list, spec.kind, spec);
    }
    this.flexible = strands.filter((st) => st.flexible);
    this.swaying = strands.filter((st) => st.sway);
    this.anchors = nodes.filter((n) => n.follow);

    // leaves along every strand
    const pickIvy = () => {
      let t = R() * IVY_CELLS.reduce((s, c) => s + c[1], 0);
      for (const [cell, wgt] of IVY_CELLS) if ((t -= wgt) <= 0) return cell;
      return 0;
    };
    const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qc = new THREE.Quaternion();
    const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
    for (const st of strands) {
      const { nodes: list, kind, spec } = st;
      R = st.still ? more : main;
      const start = kind === 'climb' ? 0 : kind === 'hang' ? 2 : Math.floor(list.length * .3);
      let side = 1;
      for (let i = start; i < list.length - 1; i++) {
        const a = list[i], b = list[i + 1];
        const tan = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z).normalize();
        const per = kind === 'climb' ? Math.max(1, spec.leaf.per - (R() < .35)) : kind === 'hang' ? 1 + (R() < .35) : 1 + (R() < .5);
        for (let j = 0; j < per; j++) {
          side = -side;
          const px = -tan.y * side, py = tan.x * side;
          let dir, pitch, roll, yaw = 0, flutter;
          const offset = new THREE.Vector3();
          const f = i / list.length;
          let size = rand(...spec.leaf.size) * LEAF_SCALE, cell = pickIvy();
          if (kind === 'climb') {
            dir = new THREE.Vector2(px * .85, py * .85 - .45).normalize().rotateAround(new THREE.Vector2(), rand(-.55, .55));
            pitch = rand(.12, 1.0); roll = rand(-.4, .4);
            offset.set(px, py, 0).multiplyScalar(rand(0, spec.leaf.spread)).add(new THREE.Vector3(rand(-.02, .02), rand(-.02, .02), rand(.005, .07)));
            size *= 1 - .25 * f;
            if (R() < .04) { cell = SPRIG_CELLS[Math.floor(R() * 3)]; size *= 1.5; }
            flutter = rand(.015, .04);
          } else if (kind === 'hang') {
            dir = new THREE.Vector2(px, py - .5).normalize().rotateAround(new THREE.Vector2(), rand(-.45, .45));
            pitch = rand(.25, 1.1); roll = rand(-.5, .5);
            offset.set(rand(-.01, .01), rand(-.01, .01), rand(0, .03));
            size *= 1 - .35 * f;
            flutter = rand(.03, .07);
          } else {
            dir = new THREE.Vector2(px, py + .55).normalize().rotateAround(new THREE.Vector2(), rand(-.7, .7));
            pitch = rand(-.2, 1.1); roll = rand(-.6, .6); yaw = rand(-1.1, 1.1);
            offset.set(rand(-.02, .02), 0, rand(-.04, .04));
            if (R() < .35 || i === list.length - 2) { cell = SPRIG_CELLS[Math.floor(R() * 3)]; size *= 1.35; }
            flutter = rand(.025, .06);
          }
          const theta = Math.atan2(dir.y, dir.x) - Math.PI / 2;
          const q = new THREE.Quaternion().setFromAxisAngle(Y, yaw)
            .multiply(qa.setFromAxisAngle(Z, theta))
            .multiply(qb.setFromAxisAngle(X, pitch))
            .multiply(qc.setFromAxisAngle(Y, roll));
          const m = this.meta[cell];
          leaves.push({
            a, b, q, offset, restTan: tan.clone(),
            scale: new THREE.Vector3(size * m.aspect, size, size),
            rect: [m.u0, m.v0, m.u1, m.v1],
            params: [rand(.04, .26), rand(-.12, .28), R(), rand(.65, 1)],
            flutter, freq: rand(.5, 1.2), phase: R() * Math.PI * 2,
          });
        }
      }
    }

    // instanced leaf mesh
    const geo = new THREE.PlaneGeometry(1, 1, 4, 6).translate(0, .5, 0);
    const n = leaves.length;
    const rect = new Float32Array(n * 4), params = new Float32Array(n * 4);
    leaves.forEach((l, i) => { rect.set(l.rect, i * 4); params.set(l.params, i * 4); });
    geo.setAttribute('aRect', new THREE.InstancedBufferAttribute(rect, 4));
    geo.setAttribute('aParams', new THREE.InstancedBufferAttribute(params, 4));
    this.leafMesh = new THREE.InstancedMesh(geo, this.leafMat, n);
    this.leafMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.leafMesh.frustumCulled = false;
    this.leafMesh.layers.enable(1);
    this.leafMesh.renderOrder = 2;

    // stems: one tube per strand, rebuilt every frame from the simulated nodes
    let verts = 0; const index = [];
    for (const st of strands) {
      st.base = verts;
      for (let i = 0; i < st.nodes.length - 1; i++) {
        for (let k = 0; k < RADIAL; k++) {
          const a = verts + i * RADIAL + k, b = verts + i * RADIAL + (k + 1) % RADIAL;
          index.push(a, a + RADIAL, b, b, a + RADIAL, b + RADIAL);
        }
      }
      verts += st.nodes.length * RADIAL;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts * 3), 3).setUsage(THREE.DynamicDrawUsage));
    sg.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(verts * 3), 3).setUsage(THREE.DynamicDrawUsage));
    sg.setIndex(index);
    this.stemMesh = new THREE.Mesh(sg, this.stemMat);
    this.stemMesh.frustumCulled = false;
    this.stemMesh.layers.enable(1);
    this.stemMesh.renderOrder = 1;

    this.group.add(this.stemMesh, this.leafMesh);
    this.updateLeaves(0);
    this.updateStems();
  }

  // Soft growth map for the wall bake: moss and damp follow the climbing ivy.
  // ground: world y where the damp band at the foot of the wall is full (y0) and where it has faded (y1); below y0 it stays damp
  drawGrowth(canvas, domMin, domSize, ground) {
    const ctx = canvas.getContext('2d');
    const sx = canvas.width / domSize.x, sy = canvas.height / domSize.y;
    const X = (x) => (x - domMin.x) * sx, Y = (y) => canvas.height - (y - domMin.y) * sy;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const grd = ctx.createLinearGradient(0, Y(ground.y0), 0, Y(ground.y1));
    grd.addColorStop(0, 'rgba(255,255,255,.55)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [blur, width, alpha] of [[40, 1.1, .5], [14, .45, .8]]) {
      ctx.filter = `blur(${blur}px)`;
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = width * sx;
      for (const st of this.strands) {
        if (st.kind !== 'climb') continue;
        ctx.beginPath();
        st.nodes.forEach((n, i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, X(n.rx), Y(n.ry)));
        ctx.stroke();
      }
    }
    ctx.filter = 'none';
  }

  // Just a slow, even breeze for now (no gusts, no turbulence): a calm ~7 s back-and-forth sway.
  windAt(x, y, t, out) {
    return out.set(Math.sin(t * .9 + x * .12) * 1.1, 0, Math.sin(t * .7 + y * .15 + 1.3) * .45);
  }

  // Where each node of a flexible strand wants to be: its rest segment carried along by the parent segment's current rotation.
  bendTargets(list) {
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1], b = list[i];
      if (i === 1) { b.tx = a.x + b.sx; b.ty = a.y + b.sy; b.tz = a.z + b.sz; continue; }
      const p = list[i - 2];
      let bx = a.x - p.x, by = a.y - p.y, bz = a.z - p.z;
      const bl = Math.hypot(bx, by, bz) || 1; bx /= bl; by /= bl; bz /= bl;
      const c = a.dx * bx + a.dy * by + a.dz * bz;
      if (c < -.95) { b.tx = a.x + b.sx; b.ty = a.y + b.sy; b.tz = a.z + b.sz; continue; }
      // minimal rotation taking the parent's rest direction onto its current direction, applied to this rest segment
      const kx = a.dy * bz - a.dz * by, ky = a.dz * bx - a.dx * bz, kz = a.dx * by - a.dy * bx;
      const vx = b.sx, vy = b.sy, vz = b.sz, kv = (kx * vx + ky * vy + kz * vz) / (1 + c);
      b.tx = a.x + vx * c + (ky * vz - kz * vy) + kx * kv;
      b.ty = a.y + vy * c + (kz * vx - kx * vz) + ky * kv;
      b.tz = a.z + vz * c + (kx * vy - ky * vx) + kz * kv;
    }
  }

  // Rope: root-to-tip distance constraints, then a long-range cap so no node drifts farther from the anchor than its rope length.
  solveRope(list) {
    for (let it = 0; it < ROPE_ITERATIONS; it++) {
      for (let i = 1; i < list.length; i++) {
        const a = list[i - 1], b = list[i];
        const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        const d = Math.hypot(dx, dy, dz) || 1e-6, k = (d - b.len) / (d * (a.w + b.w));
        a.x += dx * k * a.w; a.y += dy * k * a.w; a.z += dz * k * a.w;
        b.x -= dx * k * b.w; b.y -= dy * k * b.w; b.z -= dz * k * b.w;
      }
    }
    const root = list[0];
    for (let i = 1; i < list.length; i++) {
      const n = list[i], dx = n.x - root.x, dy = n.y - root.y, dz = n.z - root.z, d = Math.hypot(dx, dy, dz);
      if (d > n.reach) { const k = n.reach / d; n.x = root.x + dx * k; n.y = root.y + dy * k; n.z = root.z + dz * k; }
    }
  }

  // Exact segment lengths for posed (not simulated) strands: pull each node back onto its parent's sphere.
  keepLengths(list) {
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1], b = list[i];
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, k = b.len / (Math.hypot(dx, dy, dz) || 1e-6);
      b.x = a.x + dx * k; b.y = a.y + dy * k; b.z = a.z + dz * k;
    }
  }

  // one fixed-size simulation step (verlet needs a constant step; variable frame times make it kick)
  step(h, t, pointer) {
    const h2 = h * h, W = this.wind;
    {
      for (const n of this.anchors) { n.px = n.x; n.py = n.y; n.pz = n.z; n.x = n.follow.x; n.y = n.follow.y; n.z = n.follow.z; }
      for (const st of this.flexible) this.bendTargets(st.nodes);
      for (const n of this.nodes) {
        if (n.w === 0) continue;
        const damp = Math.exp(-n.c * h);
        const vx = (n.x - n.px) * damp, vy = (n.y - n.py) * damp, vz = (n.z - n.pz) * damp;
        this.windAt(n.x, n.y, t, W);
        let ax = W.x * n.wk, ay = W.y * n.wk - GRAVITY * n.g, az = W.z * n.wk;
        if (n.K) { ax += (n.tx - n.x) * n.K; ay += (n.ty - n.y) * n.K; az += (n.tz - n.z) * n.K; }
        if (pointer.active) {
          const dx = n.x - pointer.x, dy = n.y - pointer.y, dz = (n.z - pointer.z) * .5;
          const d2 = dx * dx + dy * dy + dz * dz, R2 = .7 * .7;
          if (d2 < R2) {
            const d = Math.sqrt(d2) + 1e-4, f = 1 - d / .7;
            const push = f * f * 45 / d;
            ax += dx * push + pointer.vx * f * 6; ay += dy * push + pointer.vy * f * 6; az += Math.abs(dx * push) * .3;
          }
        }
        n.px = n.x; n.py = n.y; n.pz = n.z;
        n.x += vx + ax * h2; n.y += vy + ay * h2; n.z += vz + az * h2;
        if (n.k) { n.x += (n.rx - n.x) * n.k; n.y += (n.ry - n.y) * n.k; n.z += (n.rz - n.z) * n.k; }
      }
      for (let it = 0; it < ITERATIONS; it++) {
        for (const c of this.links) {
          const a = c.a, b = c.b;
          const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
          const k = (d - c.len) / (d * (a.w + b.w || 1));
          a.x += dx * k * a.w; a.y += dy * k * a.w; a.z += dz * k * a.w;
          b.x -= dx * k * b.w; b.y -= dy * k * b.w; b.z -= dz * k * b.w;
        }
      }
      for (const st of this.flexible) this.solveRope(st.nodes);
      for (const st of this.swaying) this.swayStep(st, t, h, pointer);
      for (const n of this.nodes) if (n.z < n.zMin) n.z = n.zMin;
    }
  }

  // One damped spring per stalk drives its tip; the stem follows in a smooth arc (stiff base, loose tip).
  swayStep(st, t, h, pointer) {
    const S = st.sway, list = st.nodes, last = list.length - 1, tip = list[last], W = this.wind;
    this.windAt(tip.rx, tip.ry, t, W);
    let fx = W.x * S.wk, fy = W.y * S.wk * .5, fz = W.z * S.wk;
    if (pointer.active) {
      let px = 0, py = 0, pz = 0;
      for (let i = 1; i <= last; i++) {
        const n = list[i], lever = i / last;
        const dx = n.x - pointer.x, dy = n.y - pointer.y, dz = (n.z - pointer.z) * .5, d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > .49) continue;
        const d = Math.sqrt(d2) + 1e-4, f = 1 - d / .7, push = f * f * 30 / d * lever;
        px += dx * push + pointer.vx * f * lever * 2; py += dy * push + pointer.vy * f * lever * 2; pz += Math.abs(dx * push) * .3;
      }
      fx += px * 3 / last; fy += py * 3 / last; fz += pz * 3 / last;
    }
    S.vx += (fx - S.K * S.x - S.c * S.vx) * h; S.vy += (fy - S.K * S.y - S.c * S.vy) * h; S.vz += (fz - S.K * S.z - S.c * S.vz) * h;
    S.x += S.vx * h; S.y += S.vy * h; S.z += S.vz * h;
    for (let i = 1; i <= last; i++) {
      const n = list[i], w = (i / last) ** 2;
      n.px = n.x; n.py = n.y; n.pz = n.z;
      n.x = n.rx + S.x * w; n.y = n.ry + S.y * w; n.z = n.rz + S.z * w;
    }
    this.keepLengths(list);
  }

  updateLeaves(time) {
    const arr = this.leafMesh.instanceMatrix.array;
    const tan = this._tan ??= new THREE.Vector3(), qb = this._qb ??= new THREE.Quaternion(), qf = this._qf ??= new THREE.Quaternion();
    const q = this._q ??= new THREE.Quaternion(), e = this._e ??= new THREE.Euler(), p = this._p ??= new THREE.Vector3();
    const o = this._o ??= new THREE.Vector3(), m = this._m ??= new THREE.Matrix4();
    for (let i = 0; i < this.leaves.length; i++) {
      const L = this.leaves[i], a = L.a, b = L.b;
      tan.set(b.x - a.x, b.y - a.y, b.z - a.z).normalize();
      qb.setFromUnitVectors(L.restTan, tan);
      // leaves follow their stem and drift on one slow sine each; nothing reads velocity, so nothing can flick
      const fl = Math.sin(time * L.freq + L.phase) * L.flutter;
      e.set(fl, fl * .6, fl * .3);
      qf.setFromEuler(e);
      q.copy(qb).multiply(L.q).multiply(qf);
      o.copy(L.offset).applyQuaternion(qb);
      p.set(a.x + o.x, a.y + o.y, a.z + o.z);
      m.compose(p, q, L.scale).toArray(arr, i * 16);
    }
    this.leafMesh.instanceMatrix.needsUpdate = true;
  }

  updateStems() {
    const pos = this.stemMesh.geometry.attributes.position, nor = this.stemMesh.geometry.attributes.normal;
    const P = pos.array, N = nor.array;
    const t = new THREE.Vector3(), u = new THREE.Vector3(), v = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1);
    for (const st of this.strands) {
      if (st.still && st.posed) continue;   // pinned strands never move: their tubes are written once
      st.posed = true;
      const list = st.nodes, [r0, r1] = st.spec.r, last = list.length - 1;
      for (let i = 0; i <= last; i++) {
        const a = list[Math.max(0, i - 1)], b = list[Math.min(last, i + 1)], c = list[i];
        t.set(b.x - a.x, b.y - a.y, b.z - a.z).normalize();
        u.crossVectors(t, Z); if (u.lengthSq() < 1e-6) u.set(1, 0, 0); u.normalize();
        v.crossVectors(t, u);
        const r = (r0 + (r1 - r0) * (i / last)) * STEM_SCALE;
        for (let k = 0; k < RADIAL; k++) {
          const ang = k / RADIAL * Math.PI * 2, cs = Math.cos(ang), sn = Math.sin(ang);
          const nx = u.x * cs + v.x * sn, ny = u.y * cs + v.y * sn, nz = u.z * cs + v.z * sn;
          const j = (st.base + i * RADIAL + k) * 3;
          P[j] = c.x + nx * r; P[j + 1] = c.y + ny * r; P[j + 2] = c.z + nz * r;
          N[j] = nx; N[j + 1] = ny; N[j + 2] = nz;
        }
      }
    }
    pos.needsUpdate = nor.needsUpdate = true;
  }

  update(dt, time, pointer) {
    this.acc = Math.min((this.acc ?? 0) + dt, .1);
    this.simTime ??= 0;
    while (this.acc >= STEP) { this.simTime += STEP; this.acc -= STEP; this.step(STEP, this.simTime, pointer); }
    this.updateLeaves(time);
    this.updateStems();
  }

  useShadowMaterials(on) {
    if (!this.leafMesh) return;
    this.leafMesh.material = on ? this.leafShadowMat : this.leafMat;
    this.stemMesh.material = on ? this.stemShadowMat : this.stemMat;
  }

  useOcclusionMaterials(on) {
    if (!this.leafMesh) return;
    this.leafMesh.material = on ? this.leafOccMat : this.leafMat;
    this.stemMesh.material = on ? this.stemOccMat : this.stemMat;
  }

  dispose() {
    if (!this.leafMesh) return;
    this.group.remove(this.leafMesh, this.stemMesh);
    this.leafMesh.geometry.dispose();
    this.stemMesh.geometry.dispose();
    this.leafMesh.dispose();
    this.leafMesh = this.stemMesh = null;
  }
}
