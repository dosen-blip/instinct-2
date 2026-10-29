import * as THREE from 'three';

// Rasterises a one-colour SVG into a spray-paint stencil mask for the wall shader:
// r = crisp coverage, g = slightly soft edge (spray falloff), b = wide halo (overspray), on a padded canvas.
export async function buildStencil(url, { height = 1600, pad = .1 } = {}) {
  const svg = await (await fetch(url)).text();
  const vb = svg.match(/viewBox="([^"]+)"/)[1].trim().split(/[\s,]+/).map(Number);
  const aspect = vb[2] / vb[3];
  const contentH = Math.round(height / (1 + 2 * pad)), contentW = Math.round(contentH * aspect);
  const W = Math.round(contentW * (1 + 2 * pad)), H = height;
  const img = new Image();
  img.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  await img.decode();

  const layer = (blur) => {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    if (blur) ctx.filter = `blur(${blur}px)`;
    ctx.drawImage(img, (W - contentW) / 2, (H - contentH) / 2, contentW, contentH);
    // coverage = how dark the artwork is: the white rings and eyes drawn over the black body become bare wall
    const d = ctx.getImageData(0, 0, W, H).data, cov = new Uint8Array(W * H);
    for (let i = 0, j = 0; j < cov.length; i += 4, j++) cov[j] = d[i + 3] * (1 - (d[i] + d[i + 1] + d[i + 2]) / 765);
    return cov;
  };
  const crisp = layer(0), soft = layer(height * .003), halo = layer(height * .02);

  const out = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x, o = ((H - 1 - y) * W + x) * 4;   // flip so v points up the wall
      out[o] = crisp[i]; out[o + 1] = soft[i]; out[o + 2] = halo[i]; out[o + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(out, W, H, THREE.RGBAFormat);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  // world size of the padded mask relative to the artwork's own height
  return { texture, aspect, padScale: [W / contentH, H / contentH] };
}
