import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { NFF, FF_VERT, FF_FRAG, DUST_VERT, DUST_FRAG, GODRAYS_FRAG, FS_VERT } from './shaders.js';
import { rng } from './vines.js';

// A failing lamp behind the wall: steady hum, random stutters, dips and short blackouts, plus a boot-up sequence.
export class Flicker {
  // the first stutter waits until the intro and the page's reveal are over, so it never lands on the settle
  constructor() { this.value = 0; this.event = null; this.next = 7.65 + Math.random() * 4; }
  update(dt, t) {
    const hash = (x) => { const s = Math.sin(x * 127.1) * 43758.5453; return s - Math.floor(s); };
    let v = .93 + .04 * Math.sin(t * 2.3) * Math.sin(t * .71) + .03 * (hash(Math.floor(t * 24)) - .5);
    if (t < 2.05) {
      // boot: dead, a few failed strikes, then catches. The same sequence of events at twice the pace (b is the old
      // boot's clock): the strike phase that ran .7-3.4 s now runs .7-2.05 s
      const b = t < .7 ? t : .7 + (t - .7) * 2;
      const strike = b > .7 && hash(Math.floor(b * 13)) > (b < 2 ? .72 : .35);
      v *= b < .7 ? 0 : b < 2.8 ? (strike ? .35 + .6 * hash(Math.floor(b * 31)) : .03) : Math.min(1, (b - 2.8) / .6 + .4);
    } else {
      if (!this.event && t > this.next) {
        const r = Math.random();
        this.event = r < .55 ? { type: 'stutter', start: t, dur: .15 + Math.random() * .7 }
          : r < .88 ? { type: 'dip', start: t, dur: .25 + Math.random() * .5 }
          : { type: 'out', start: t, dur: .08 + Math.random() * .35 };
      }
      if (this.event) {
        const e = this.event, p = (t - e.start) / e.dur;
        if (p >= 1) { this.event = null; this.next = t + 2.5 + Math.random() * 6; }
        else if (e.type === 'stutter') v *= hash(Math.floor(t * 38)) > .45 ? 1 : .12;
        else if (e.type === 'dip') v *= 1 - .55 * Math.sin(Math.PI * p);
        else v *= .04;
      }
    }
    this.value += (v - this.value) * Math.min(1, dt * 45);
    return this.value;
  }
}

export class Fireflies {
  constructor(U) {
    this.U = U;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NFF * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(NFF * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(NFF), 1));
    this.material = new THREE.ShaderMaterial({
      uniforms: { uPx: U.uPx, uPass: U.uPass }, vertexShader: FF_VERT, fragmentShader: FF_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
  }

  layout(halfW, halfH, wm) {
    const R = rng(91), rand = (a, b) => a + (b - a) * R();
    this.flies = [];
    for (let i = 0; i < NFF; i++) {
      const kind = i < 6 ? 'moth' : i < 16 ? 'blink' : 'orb';
      let home;
      if (kind === 'moth') home = new THREE.Vector3(rand(-.45, .45) * wm.w, wm.y + rand(-.6, .9) * wm.h, rand(.12, .45));
      else if (kind === 'blink') home = new THREE.Vector3(rand(-.2, 1) * halfW * (R() < .7 ? 1 : -1), rand(-.95, .8) * halfH, rand(.15, 1.4));
      else home = new THREE.Vector3(rand(-.95, .95) * halfW, rand(-.8, .85) * halfH, rand(.3, 3.2));
      const color = kind === 'blink' ? new THREE.Color(.72, 1, .28) : kind === 'moth' ? new THREE.Color(1, .86, .55) : new THREE.Color(.55, 1, .72);
      this.flies.push({
        kind, home, color, off: new THREE.Vector3(),
        amp: kind === 'moth' ? new THREE.Vector3(rand(.25, .6), rand(.12, .3), rand(.05, .18)) : new THREE.Vector3(rand(.4, 1.2), rand(.25, .6), rand(.1, .5)),
        freq: new THREE.Vector3(rand(.08, .25), rand(.1, .3), rand(.08, .2)).multiplyScalar(kind === 'moth' ? 1.3 : 1),
        phase: new THREE.Vector3(R() * 6.3, R() * 6.3, R() * 6.3),
        period: rand(2.6, 6.5), offset: R() * 10,
        size: kind === 'orb' ? rand(.22, .34) : kind === 'moth' ? rand(.12, .17) : rand(.14, .2),
        power: kind === 'blink' ? 1.5 : kind === 'moth' ? .9 : .75,
      });
    }
    // when the camera travels down the wall most of them drift along after it, each at its own pace; moths stay at the sign
    // (derived without the generator so the layout above stays exactly as it was)
    this.flies.forEach((f, i) => { f.follow = f.kind === 'moth' ? 0 : .6 + .35 * (i * .618 % 1); f.pace = .35 + .5 * (i * .382 % 1); f.pan = 0; });
    this.points.geometry.attributes.aSize.array.set(this.flies.map((f) => f.size));
    this.points.geometry.attributes.aSize.needsUpdate = true;
  }

  update(t, pointer, room = 1, pan = 0, dt = 0) {
    const pos = this.points.geometry.attributes.position, col = this.points.geometry.attributes.aColor;
    this.flies.forEach((f, i) => {
      f.pan += (pan * f.follow - f.pan) * (1 - Math.exp(-dt * f.pace));
      const s = (k) => Math.sin(t * f.freq[k] + f.phase[k]) + .35 * Math.sin(t * f.freq[k] * 2.9 + f.phase[k] * 1.3);
      const x = f.home.x + f.amp.x * s('x'), y = f.home.y - f.pan + f.amp.y * s('y'), z = f.home.z + f.amp.z * s('z');
      if (pointer.active) {
        const dx = x + f.off.x - pointer.x, dy = y + f.off.y - pointer.y, d = Math.hypot(dx, dy) + 1e-3;
        if (d < 1.1) { const k = (1 - d / 1.1) * .06; f.off.x += dx / d * k; f.off.y += dy / d * k; }
      }
      f.off.multiplyScalar(.985);
      const px = x + f.off.x, py = y + f.off.y, pz = Math.max(.08, z + f.off.z);
      let lvl;
      if (f.kind === 'blink') {
        const c = (t + f.offset) % f.period;
        lvl = .12 + .88 * Math.exp(-((c - .8) ** 2) / .09);   // a soft swell rather than a snap
      } else if (f.kind === 'moth') lvl = .6 + .25 * Math.sin(t * .9 + i * 3);
      else lvl = .45 + .35 * Math.sin(t * .6 + f.offset);
      const wake = Math.min(1, Math.max(0, (room - i / NFF * .45) / .55));
      lvl *= wake * wake * (3 - 2 * wake);   // they wake one by one as the room comes up, each easing in and out of it
      pos.setXYZ(i, px, py, pz);
      col.setXYZ(i, f.color.r * lvl, f.color.g * lvl, f.color.b * lvl);
      this.U.uFF.value[i].set(px, py, pz, lvl * f.power);
      this.U.uFFCol.value[i].copy(f.color);
    });
    pos.needsUpdate = col.needsUpdate = true;
  }
}

export class Dust {
  constructor(U, count = 6000) {
    const R = rng(5);
    const seeds = new Float32Array(count * 4).map(() => R());
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    this.uniforms = { ...U, uBoxMin: { value: new THREE.Vector3() }, uBoxSize: { value: new THREE.Vector3() }, uBoxOrigin: { value: new THREE.Vector3() } };
    this.points = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: DUST_VERT, fragmentShader: DUST_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.points.frustumCulled = false;
    this.points.renderOrder = 4;
  }
  layout(halfW, halfH) {
    this.uniforms.uBoxOrigin.value.set(-halfW * 1.15, -halfH * 1.15, .05);
    this.uniforms.uBoxMin.value.copy(this.uniforms.uBoxOrigin.value);
    this.uniforms.uBoxSize.value.set(halfW * 2.3, halfH * 2.3, 5);
  }
  // the box of motes travels with the camera; the motes themselves stay put in the room and wrap into it
  follow(panY) { this.uniforms.uBoxMin.value.y = this.uniforms.uBoxOrigin.value.y - panY; }
}

// Volumetric light scattering (GPU Gems 3, ch. 13) from the bulb behind the wall through the letter openings.
export class GodRaysPass extends Pass {
  // shift: occlusion buffer is 1/2^shift of the screen; taps: samples along each ray
  constructor(legacy, renderOcclusion, { shift = 1, taps = 96 } = {}) {
    super();
    this.renderOcclusion = renderOcclusion;
    this.shift = shift;
    // draw order (wall first, then stems and leaves) already gives correct occlusion, so no depth buffer
    this.occ = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: legacy });
    this.uniforms = {
      tDiffuse: { value: null }, tOcc: { value: this.occ.texture }, uLightUV: { value: new THREE.Vector2(.5, .5) },
      uDensity: { value: .38 }, uWeight: { value: .02 }, uDecay: { value: .968 }, uExposure: { value: .13 }, uTime: { value: 0 },
    };
    this.quad = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: FS_VERT, fragmentShader: GODRAYS_FRAG, defines: { TAPS: taps } }));
  }
  setSize(w, h) { this.occ.setSize(Math.max(1, w >> this.shift), Math.max(1, h >> this.shift)); }
  render(renderer, writeBuffer, readBuffer) {
    this.renderOcclusion(this.occ);
    this.uniforms.tDiffuse.value = readBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }
}
