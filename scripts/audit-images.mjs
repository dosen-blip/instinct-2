#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const maxBytes = 750 * 1024;
const maxLongEdge = 2048;
const failures = [];
const hashes = new Map();
const assets = readdirSync('assets').filter((file) => /\.(?:png|jpe?g|webp)$/i.test(file));

for (const file of assets) {
  if (!file.endsWith('.webp')) failures.push(`Unexpected raster format: assets/${file}`);
  const fullPath = resolve('assets', file);
  if (statSync(fullPath).size > maxBytes) failures.push(`Oversized image: assets/${file}`);
  const info = execFileSync('webpinfo', [fullPath], { encoding: 'utf8' });
  const width = Number(info.match(/Width:\s+(\d+)/)?.[1]);
  const height = Number(info.match(/Height:\s+(\d+)/)?.[1]);
  if (!width || !height) failures.push(`Unreadable dimensions: assets/${file}`);
  if (Math.max(width, height) > maxLongEdge) failures.push(`Image exceeds ${maxLongEdge}px: assets/${file}`);
  const hash = createHash('sha256').update(readFileSync(fullPath)).digest('hex');
  if (hashes.has(hash)) failures.push(`Duplicate image bytes: assets/${file} and assets/${hashes.get(hash)}`);
  hashes.set(hash, file);
}

const context = { window: {} };
vm.runInNewContext(readFileSync('image-manifest.js', 'utf8'), context);
const manifest = context.window.INSTINCT_IMAGES || {};
const referencedFiles = new Set();
for (const [name, record] of Object.entries(manifest)) {
  if (!record.src || !record.width || !record.height || !record.candidates?.length) {
    failures.push(`Incomplete manifest record: ${name}`);
    continue;
  }
  for (const candidate of record.candidates) {
    referencedFiles.add(candidate.src.split('/').pop());
    if (!existsSync(resolve(candidate.src.replace('./', '')))) failures.push(`Missing candidate for ${name}: ${candidate.src}`);
  }
}
for (const file of assets) {
  if (!referencedFiles.has(file)) failures.push(`Unreferenced generated image: assets/${file}`);
}

const report = JSON.parse(readFileSync('image-optimization-report.json', 'utf8'));
for (const item of report) {
  for (const check of item.qualityChecks || []) {
    if (check.psnr < 40) failures.push(`Quality threshold failed: ${check.file} (${check.psnr} dB)`);
  }
}

const app = readFileSync('app.js', 'utf8');
for (const match of app.matchAll(/asset\('([^']+)'\)/g)) {
  if (!manifest[match[1]]) failures.push(`Referenced image missing from manifest: ${match[1]}`);
}
if ((app.match(/<img/g) || []).length !== 1) failures.push('Image markup must be emitted through imageTag().');

for (const file of readdirSync('.').filter((name) => name.endsWith('.html'))) {
  const html = readFileSync(file, 'utf8');
  if (html.indexOf('image-manifest.js') < 0 || html.indexOf('image-manifest.js') > html.indexOf('app.js')) {
    failures.push(`Manifest must load before app.js: ${file}`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Image audit passed: ${assets.length} WebP files, ${Object.keys(manifest).length} manifest names.`);
