#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';

let repo = process.cwd();

function run(command, args) {
  try {
    return execFileSync(command, args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    const details = `${error.stdout || ''}${error.stderr || ''}`.trim();
    throw new Error(`${command} ${args.join(' ')} failed${details ? `:\n${details}` : ''}`);
  }
}

repo = run('git', ['rev-parse', '--show-toplevel']).trim();
const required = [
  'app.js',
  'styles.css',
  'image-manifest.js',
  'image-optimization-report.json',
  'scripts/audit-images.mjs',
  '.github/workflows/static.yml'
];
for (const relative of required) {
  if (!existsSync(resolve(repo, relative))) throw new Error(`Missing required file: ${relative}`);
}

run(process.execPath, ['--check', 'app.js']);
run(process.execPath, ['--check', 'image-manifest.js']);
const auditOutput = run(process.execPath, ['scripts/audit-images.mjs']).trim();
run('git', ['diff', '--check']);

const htmlFiles = readdirSync(repo).filter((name) => name.endsWith('.html')).sort();
if (!htmlFiles.includes('index.html')) throw new Error('Missing index.html');
for (const file of htmlFiles) {
  const html = readFileSync(resolve(repo, file), 'utf8');
  if (!html.includes('<main id="app"></main>')) throw new Error(`${file} is missing the application root`);
  if (!/<title>[^<]+<\/title>/.test(html)) throw new Error(`${file} is missing a page title`);
  const manifestIndex = html.indexOf('image-manifest.js');
  const appIndex = html.indexOf('app.js');
  if (manifestIndex < 0 || appIndex < 0 || manifestIndex > appIndex) {
    throw new Error(`${file} must load image-manifest.js before app.js`);
  }
}

const app = readFileSync(resolve(repo, 'app.js'), 'utf8');
const routeFiles = new Set([...app.matchAll(/['"]\.\/([a-z0-9-]+\.html)['"]/g)].map((match) => match[1]));
for (const file of routeFiles) {
  if (!existsSync(resolve(repo, file))) throw new Error(`Route points to missing shell: ${file}`);
}

const workflow = readFileSync(resolve(repo, '.github/workflows/static.yml'), 'utf8');
if (!workflow.includes('branches: ["main"]')) throw new Error('Pages workflow is not limited to main pushes as expected');
if (!workflow.includes('node scripts/audit-images.mjs')) throw new Error('Pages workflow is missing the image audit');

const textExtensions = new Set(['.css', '.html', '.js', '.json', '.md', '.mjs', '.sh', '.yml', '.yaml']);
const tracked = run('git', ['ls-files', '-z']).split('\0').filter(Boolean);
for (const file of tracked) {
  if (!textExtensions.has(extname(file))) continue;
  const text = readFileSync(resolve(repo, file), 'utf8');
  if (/^(<<<<<<<|=======|>>>>>>>)/m.test(text)) throw new Error(`Unresolved conflict marker in ${file}`);
}

console.log('Site preflight passed.');
console.log(`- JavaScript syntax: app.js and image-manifest.js`);
console.log(`- Image pipeline: ${auditOutput}`);
console.log(`- Page shells: ${htmlFiles.length}`);
console.log(`- Route targets: ${routeFiles.size}`);
console.log('- Diff whitespace and conflict markers: clean');
console.log('Visual phone/computer review is still required for affected pages.');
