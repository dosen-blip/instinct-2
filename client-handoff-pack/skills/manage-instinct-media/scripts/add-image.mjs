#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync
} from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import vm from 'node:vm';

const widths = [480, 960, 1440];
const maxLongEdge = 2048;
const maxBytes = 750 * 1024;

function usage() {
  console.log(`Usage:
  node add-image.mjs --input FILE --name logical-name [--replace] [--text-heavy] [--dry-run] [--repo PATH]

Examples:
  node add-image.mjs --input ~/Downloads/poster.png --name vol5-poster --dry-run
  node add-image.mjs --input ~/Downloads/poster.png --name vol5-poster --text-heavy
  node add-image.mjs --input ~/Downloads/new.jpg --name home-hero --replace`);
}

function parseArgs(argv) {
  const options = { replace: false, textHeavy: false, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--input') options.input = argv[++i];
    else if (arg === '--name') options.name = argv[++i];
    else if (arg === '--repo') options.repo = argv[++i];
    else if (arg === '--replace') options.replace = true;
    else if (arg === '--text-heavy') options.textHeavy = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function commandExists(command) {
  const result = spawnSync(command, ['-version'], { encoding: 'utf8' });
  return result.status === 0;
}

function gitRoot() {
  return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
}

function runCwebp(input, output, width, height, initialQuality) {
  for (let quality = initialQuality; quality <= 94; quality += 2) {
    const args = [
      '-q', String(quality),
      '-m', '6',
      '-alpha_q', '100',
      '-print_psnr',
      '-metadata', 'none',
      '-resize', String(width), String(height),
      input,
      '-o', output
    ];
    const result = spawnSync('cwebp', args, { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(result.stderr || `cwebp failed for ${input}`);
    const combined = `${result.stdout}\n${result.stderr}`;
    const psnr = Number(combined.match(/All-PSNR(?:\s+[\d.]+){3}\s+([\d.]+) dB/)?.[1]);
    if (!psnr) throw new Error(`Could not read PSNR for ${basename(output)}`);
    if (psnr >= 40 || quality >= 94) {
      const bytes = statSync(output).size;
      if (bytes > maxBytes) {
        throw new Error(`${basename(output)} is ${(bytes / 1024).toFixed(0)} KiB; the site limit is ${maxBytes / 1024} KiB`);
      }
      if (psnr < 40) throw new Error(`${basename(output)} did not reach the 40 dB quality threshold`);
      return { quality, psnr, bytes };
    }
  }
  throw new Error(`Could not encode ${basename(output)}`);
}

function probeDimensions(input, staging) {
  const probe = join(staging, 'probe.webp');
  const result = spawnSync('cwebp', ['-q', '100', '-m', '0', '-metadata', 'none', input, '-o', probe], {
    encoding: 'utf8'
  });
  if (result.status !== 0) throw new Error(result.stderr || `Could not read ${input}`);
  const combined = `${result.stdout}\n${result.stderr}`;
  const match = combined.match(/Dimension:\s+(\d+)\s+x\s+(\d+)/);
  if (!match) throw new Error(`Could not read dimensions for ${input}`);
  return { width: Number(match[1]), height: Number(match[2]) };
}

function resizedDimensions(sourceWidth, sourceHeight, targetWidth) {
  const scale = Math.min(1, targetWidth / sourceWidth, maxLongEdge / Math.max(sourceWidth, sourceHeight));
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale))
  };
}

function atomicWrite(path, contents) {
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, contents);
  renameSync(temporary, path);
}

function manifestRecords(manifestText) {
  const context = { window: {} };
  vm.runInNewContext(manifestText, context);
  return context.window.INSTINCT_IMAGES || {};
}

function restoreFiles(snapshot) {
  for (const [path, contents] of snapshot) {
    if (contents === null) {
      if (existsSync(path)) unlinkSync(path);
    } else {
      mkdirSync(resolve(path, '..'), { recursive: true });
      writeFileSync(path, contents);
    }
  }
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  usage();
  process.exit(0);
}
if (!options.input || !options.name) {
  usage();
  throw new Error('--input and --name are required');
}
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(options.name)) {
  throw new Error('--name must use lowercase letters, numbers, and single hyphens');
}

const input = resolve(process.cwd(), options.input);
if (!existsSync(input)) throw new Error(`Input does not exist: ${input}`);
const extension = extname(input).toLowerCase();
if (!['.png', '.jpg', '.jpeg', '.webp'].includes(extension)) {
  throw new Error('Input must be PNG, JPEG, or WebP');
}
if (!commandExists('cwebp') || !commandExists('webpinfo')) {
  throw new Error('Required WebP tools are missing: cwebp and webpinfo');
}

const repo = resolve(options.repo || gitRoot());
const assetsDir = join(repo, 'assets');
const manifestPath = join(repo, 'image-manifest.js');
const reportPath = join(repo, 'image-optimization-report.json');
const auditPath = join(repo, 'scripts', 'audit-images.mjs');
for (const path of [assetsDir, manifestPath, reportPath, auditPath]) {
  if (!existsSync(path)) throw new Error(`Expected repository path is missing: ${path}`);
}

const originalManifest = readFileSync(manifestPath, 'utf8');
const records = manifestRecords(originalManifest);
if (records[options.name] && !options.replace) {
  throw new Error(`Image name already exists: ${options.name}. Use --replace only for an intentional replacement.`);
}

const staging = mkdtempSync(join(tmpdir(), 'instinct-add-image-'));
try {
  const original = probeDimensions(input, staging);
  const fallback = resizedDimensions(original.width, original.height, original.width);
  const initialQuality = options.textHeavy || /(poster|hero|tickets|backdrop|card)/.test(options.name) ? 90 : 85;
  const candidates = [];
  const qualityChecks = [];
  const widthsSeen = new Set();

  for (const requestedWidth of widths) {
    const size = resizedDimensions(original.width, original.height, requestedWidth);
    if (size.width >= fallback.width || widthsSeen.has(size.width)) continue;
    widthsSeen.add(size.width);
    const file = `${options.name}-${size.width}.webp`;
    const check = runCwebp(input, join(staging, file), size.width, size.height, initialQuality);
    candidates.push({ src: `./assets/${file}`, width: size.width, height: size.height });
    qualityChecks.push({ file, quality: check.quality, psnr: check.psnr });
  }

  const fallbackFile = `${options.name}.webp`;
  const fallbackCheck = runCwebp(input, join(staging, fallbackFile), fallback.width, fallback.height, initialQuality);
  candidates.push({ src: `./assets/${fallbackFile}`, width: fallback.width, height: fallback.height });
  qualityChecks.push({ file: fallbackFile, quality: fallbackCheck.quality, psnr: fallbackCheck.psnr });

  console.log(`Prepared ${options.name}: ${original.width}x${original.height} -> ${candidates.map((item) => `${item.width}w`).join(', ')}`);
  if (options.dryRun) {
    console.log('Dry run complete. No repository files were changed.');
    rmSync(staging, { recursive: true, force: true });
    process.exit(0);
  }

  execFileSync(process.execPath, [auditPath], { cwd: repo, stdio: 'pipe' });
  const originalReport = readFileSync(reportPath, 'utf8');
  const report = JSON.parse(originalReport);
  const oldRecord = records[options.name];
  records[options.name] = {
    src: `./assets/${fallbackFile}`,
    width: fallback.width,
    height: fallback.height,
    candidates
  };

  const nextReport = report.filter((item) => item.name !== options.name);
  nextReport.push({
    name: options.name,
    originalBytes: statSync(input).size,
    optimizedBytes: qualityChecks.reduce((sum, item) => sum + statSync(join(staging, item.file)).size, 0),
    original,
    fallback,
    qualityChecks
  });
  nextReport.sort((a, b) => a.name.localeCompare(b.name));

  const nextManifest = `// Generated by the Instinct media workflow. Do not edit by hand.\nwindow.INSTINCT_IMAGES = ${JSON.stringify(records, null, 2)};\n`;
  const sourceDir = join(repo, 'source-images');
  mkdirSync(sourceDir, { recursive: true });
  const normalizedExtension = extension === '.jpeg' ? '.jpg' : extension;
  const sourceCopy = join(sourceDir, `${options.name}${normalizedExtension}`);

  const nextFiles = new Set(candidates.map((candidate) => join(repo, candidate.src.replace('./', ''))));
  const oldFiles = new Set((oldRecord?.candidates || []).map((candidate) => join(repo, candidate.src.replace('./', ''))));
  const stillReferenced = new Set(
    Object.values(records).flatMap((record) => (record.candidates || []).map((candidate) => join(repo, candidate.src.replace('./', ''))))
  );
  const touched = new Set([...nextFiles, ...oldFiles, sourceCopy]);
  const snapshot = new Map([...touched].map((path) => [path, existsSync(path) ? readFileSync(path) : null]));

  try {
    for (const candidate of candidates) {
      const file = basename(candidate.src);
      copyFileSync(join(staging, file), join(assetsDir, file));
    }
    for (const oldFile of oldFiles) {
      if (!stillReferenced.has(oldFile) && !nextFiles.has(oldFile) && existsSync(oldFile)) unlinkSync(oldFile);
    }
    if (resolve(input) !== resolve(sourceCopy)) copyFileSync(input, sourceCopy);
    atomicWrite(manifestPath, nextManifest);
    atomicWrite(reportPath, `${JSON.stringify(nextReport, null, 2)}\n`);
    execFileSync(process.execPath, [auditPath], { cwd: repo, stdio: 'pipe' });
  } catch (error) {
    restoreFiles(snapshot);
    atomicWrite(manifestPath, originalManifest);
    atomicWrite(reportPath, originalReport);
    throw new Error(`Import rolled back because validation failed: ${error.stderr?.toString() || error.message}`);
  }

  console.log(`Imported ${options.name} and passed the repository image audit.`);
} finally {
  rmSync(staging, { recursive: true, force: true });
}
