import * as THREE from 'three';

// Rasterises the SVG wordmark and builds a signed distance field in letter-height units:
// negative inside the letters (the openings cut into the wall), positive in the wall.
export async function buildWordmarkSDF(url, { width = 3072, pad = 1 } = {}) {
  const svg = await (await fetch(url)).text();
  const vb = svg.match(/viewBox="([^"]+)"/)[1].trim().split(/[\s,]+/).map(Number);
  const aspect = vb[2] / vb[3];
  const size = [aspect + pad * 2, 1 + pad * 2];
  const ppu = width / size[0];
  const height = Math.round(size[1] * ppu);

  const img = new Image();
  img.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, pad * ppu, pad * ppu, aspect * ppu, ppu);
  const px = ctx.getImageData(0, 0, width, height).data;

  const n = width * height, INF = 1e20;
  const toIn = new Float64Array(n), toOut = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const inside = px[i * 4 + 3] > 127;
    toIn[i] = inside ? 0 : INF;
    toOut[i] = inside ? INF : 0;
  }
  edt2d(toIn, width, height);
  edt2d(toOut, width, height);

  const data = new Uint16Array(n);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const d = toIn[i] > 0 ? Math.sqrt(toIn[i]) - 0.5 : -(Math.sqrt(toOut[i]) - 0.5);
      data[(height - 1 - y) * width + x] = THREE.DataUtils.toHalfFloat(d / ppu);
    }
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RedFormat, THREE.HalfFloatType);
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return { texture, aspect, min: [-(aspect / 2 + pad), -(0.5 + pad)], size };
}

// Felzenszwalb & Huttenlocher squared Euclidean distance transform, in place.
function edt2d(grid, w, h) {
  const m = Math.max(w, h);
  const f = new Float64Array(m), d = new Float64Array(m), v = new Int32Array(m), z = new Float64Array(m + 1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
    edt1d(f, h, d, v, z);
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    const o = y * w;
    for (let x = 0; x < w; x++) f[x] = grid[o + x];
    edt1d(f, w, d, v, z);
    for (let x = 0; x < w; x++) grid[o + x] = d[x];
  }
}

function edt1d(f, n, d, v, z) {
  let k = 0;
  v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let r = v[k];
    let s = ((f[q] + q * q) - (f[r] + r * r)) / (2 * q - 2 * r);
    while (s <= z[k]) {
      k--; r = v[k];
      s = ((f[q] + q * q) - (f[r] + r * r)) / (2 * q - 2 * r);
    }
    k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const r = v[k];
    d[q] = (q - r) * (q - r) + f[r];
  }
}
