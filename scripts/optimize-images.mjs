#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const widths = [480, 960, 1440];
const maxLongEdge = 2048;
const defaultQuality = 85;
const textQuality = 90;
const textAssetPattern = /(poster|hero|tickets|backdrop|card)/;
const unused = new Set([
  'home-next-poster',
  'mobile-mcp-drink-festival-fuel',
  'mobile-mcp-drink-liquid-cocaine',
  'mobile-mcp-home-next-poster',
  'mobile-mcp-next-babyjake',
  'mobile-mcp-next-dj-cobb',
  'mobile-mcp-next-hero',
  'mobile-mcp-next-seb-balla'
]);

function parseArgs(argv) {
  const options = { input: 'assets', output: 'assets', manifest: 'image-manifest.js' };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--input') options.input = argv[++i];
    else if (argv[i] === '--output') options.output = argv[++i];
    else if (argv[i] === '--manifest') options.manifest = argv[++i];
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  return options;
}

function dimensions(file) {
  const output = execFileSync('webpinfo', [file], { encoding: 'utf8' });
  const width = Number(output.match(/Width:\s+(\d+)/)?.[1]);
  const height = Number(output.match(/Height:\s+(\d+)/)?.[1]);
  if (!width || !height) throw new Error(`Could not read dimensions for ${file}`);
  return { width, height };
}

function fingerprint(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function resizedDimensions(sourceWidth, sourceHeight, targetWidth) {
  const scale = Math.min(1, targetWidth / sourceWidth, maxLongEdge / Math.max(sourceWidth, sourceHeight));
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale))
  };
}

function encode(source, destination, width, height, initialQuality) {
  for (let quality = initialQuality; quality <= 94; quality += 2) {
    const args = [
      '-q', String(quality), '-m', '6', '-alpha_q', '100', '-print_psnr',
      '-metadata', 'none', '-resize', String(width), String(height),
      source, '-o', destination
    ];
    const result = spawnSync('cwebp', args, { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(result.stderr || `cwebp failed for ${source}`);
    const output = `${result.stdout}\n${result.stderr}`;
    const psnr = Number(output.match(/All-PSNR(?:\s+[\d.]+){3}\s+([\d.]+) dB/)?.[1]);
    if (!psnr) throw new Error(`Could not read PSNR for ${destination}`);
    if (psnr >= 40 || quality >= 94) return { quality, psnr };
  }
  throw new Error(`Could not satisfy quality threshold for ${destination}`);
}

const options = parseArgs(process.argv.slice(2));
const inputDir = resolve(options.input);
const outputDir = resolve(options.output);
const manifestFile = resolve(options.manifest);

if (!existsSync(inputDir)) throw new Error(`Input directory does not exist: ${inputDir}`);
if (inputDir === outputDir && existsSync(manifestFile)) {
  throw new Error('Refusing to re-encode generated assets in place. Supply fresh sources with --input.');
}

mkdirSync(outputDir, { recursive: true });
const staging = mkdtempSync(join(tmpdir(), 'instinct-images-'));
const sourceFiles = readdirSync(inputDir)
  .filter((file) => file.endsWith('.webp') && !/-\d+\.webp$/.test(file))
  .sort();

for (const file of sourceFiles) cpSync(join(inputDir, file), join(staging, file));

const canonicalByHash = new Map();
const aliases = new Map();
for (const file of sourceFiles) {
  const name = basename(file, '.webp');
  if (unused.has(name)) continue;
  const hash = fingerprint(join(staging, file));
  const existing = canonicalByHash.get(hash);
  if (!existing || name.length < existing.length || (name.length === existing.length && name < existing)) {
    if (existing) aliases.set(existing, name);
    canonicalByHash.set(hash, name);
  } else {
    aliases.set(name, existing);
  }
}

function canonicalName(name) {
  let current = name;
  while (aliases.has(current)) current = aliases.get(current);
  return current;
}

const records = {};
const report = [];
const canonicalNames = [...new Set([...canonicalByHash.values()].map(canonicalName))].sort();

for (const name of canonicalNames) {
  const source = join(staging, `${name}.webp`);
  const original = dimensions(source);
  const fallback = resizedDimensions(original.width, original.height, original.width);
  const quality = textAssetPattern.test(name) ? textQuality : defaultQuality;
  const candidates = [];
  const qualityChecks = [];

  for (const requestedWidth of widths) {
    const size = resizedDimensions(original.width, original.height, requestedWidth);
    if (size.width >= fallback.width || candidates.some((item) => item.width === size.width)) continue;
    const file = `${name}-${size.width}.webp`;
    const check = encode(source, join(outputDir, file), size.width, size.height, quality);
    candidates.push({ src: `./assets/${file}`, width: size.width, height: size.height });
    qualityChecks.push({ file, ...check });
  }

  const fallbackCheck = encode(source, join(outputDir, `${name}.webp`), fallback.width, fallback.height, quality);
  candidates.push({ src: `./assets/${name}.webp`, width: fallback.width, height: fallback.height });
  qualityChecks.push({ file: `${name}.webp`, ...fallbackCheck });
  records[name] = {
    src: `./assets/${name}.webp`,
    width: fallback.width,
    height: fallback.height,
    candidates
  };
  report.push({
    name,
    originalBytes: statSync(source).size,
    optimizedBytes: candidates.reduce((sum, item) => sum + statSync(resolve(item.src.replace('./', ''))).size, 0),
    original,
    fallback,
    qualityChecks
  });
}

for (const [alias] of aliases) records[alias] = records[canonicalName(alias)];

const generatedFiles = new Set(
  Object.values(records).flatMap((record) => record.candidates.map((candidate) => basename(candidate.src)))
);
for (const file of readdirSync(outputDir)) {
  if (file.endsWith('.webp') && !generatedFiles.has(file)) rmSync(join(outputDir, file));
}

const manifest = `// Generated by scripts/optimize-images.mjs. Do not edit by hand.\nwindow.INSTINCT_IMAGES = ${JSON.stringify(records, null, 2)};\n`;
writeFileSync(manifestFile, manifest);
writeFileSync(resolve('image-optimization-report.json'), `${JSON.stringify(report, null, 2)}\n`);
rmSync(staging, { recursive: true, force: true });

const originalTotal = report.reduce((sum, item) => sum + item.originalBytes, 0);
const optimizedTotal = report.reduce((sum, item) => sum + item.optimizedBytes, 0);
console.log(`Optimized ${report.length} unique images: ${(originalTotal / 1048576).toFixed(2)} MiB -> ${(optimizedTotal / 1048576).toFixed(2)} MiB`);
