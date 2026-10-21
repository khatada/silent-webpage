import { execFileSync } from 'node:child_process';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium, type Browser } from '@playwright/test';
import { PNG } from 'pngjs';
import { createServer } from 'vite';
import { artSourceHash } from './art-source-hash';

const { values } = parseArgs({ options: { output: { type: 'string' }, subject: { type: 'string', default: 'cat' } } });
if (!values.output) throw new Error('Provide an existing review directory with --output art-reviews/<name>.');
const subjects = {
  cat: { entry: '/scripts/cat-review-entry.ts', render: 'renderCatReview', prefix: 'atlas', cellSize: 2, scale: 2 },
  curtains: { entry: '/scripts/curtain-review-entry.ts', render: 'renderCurtainReview', prefix: 'curtain-atlas', cellSize: 4, scale: 4 },
};
if (!Object.hasOwn(subjects, values.subject ?? '')) throw new Error('subject must be cat or curtains.');
const subject = subjects[values.subject as keyof typeof subjects];
if (!subject) throw new Error('subject must be cat or curtains.');
const outputDirectory = resolve(values.output);
if (!(await stat(outputDirectory)).isDirectory()) throw new Error('The output path must be an existing directory.');
const sourcePath = resolve(outputDirectory, `${subject.prefix}-source.png`);
const correctedPath = resolve(outputDirectory, `${subject.prefix}-corrected.png`);
const sourceSha256 = await artSourceHash();
const server = await createServer({
  configFile: false,
  root: process.cwd(),
  server: { host: '127.0.0.1', port: 4174, strictPort: true },
  plugins: [{
    name: 'static-pixel-art-review',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] !== '/art-review') return next();
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.end('<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#171e30}canvas{display:block;image-rendering:pixelated}</style></head><body></body></html>');
      });
    },
  }],
});
let browser: Browser | undefined;
let metadata: unknown;
try {
  await server.listen();
  browser = await chromium.launch({
    executablePath: process.env.ART_BROWSER_PATH || undefined,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 360, height: 120 }, deviceScaleFactor: 1 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4174/art-review');
  metadata = await page.evaluate(async ({ entry, render }) => {
    const module = await import(entry);
    return module[render]();
  }, subject);
  const source = await page.locator('canvas[data-ready="true"]').screenshot();
  await writeFile(sourcePath, source, { flag: 'wx' });
  await page.close();
  if (errors.length) throw new Error(errors.join('\n'));
} finally {
  await browser?.close();
  await server.close();
}
execFileSync(process.execPath, ['--import', 'tsx', 'scripts/correct-pixel-art.ts',
  '--input', sourcePath, '--output', correctedPath, '--cell-size', String(subject.cellSize), '--scale', String(subject.scale)], { stdio: 'inherit' });
const finalSourceSha256 = await artSourceHash();
if (sourceSha256 !== finalSourceSha256) throw new Error('Art source changed during capture; discard these images.');
const source = PNG.sync.read(await readFile(sourcePath));
const corrected = PNG.sync.read(await readFile(correctedPath));
await writeFile(resolve(outputDirectory, `${subject.prefix}-capture.json`), JSON.stringify({
  sourceSha256, finalSourceSha256, metadata,
  method: 'Current artwork drawing modules rendered once on a blank review page; no scene ticker or simulated wait.',
  rgbaUnchanged: source.width === corrected.width && source.height === corrected.height && source.data.equals(corrected.data),
  adoption: 'PENDING_LLM_VISUAL_REVIEW',
}, null, 2) + '\n', { flag: 'wx' });
console.log(`Open ${subject.prefix}-corrected.png and record the LLM adoption decision. No image was automatically accepted.`);
