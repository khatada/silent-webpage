import { copyFile, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { PNG } from 'pngjs';
import { chromium } from '@playwright/test';
import { generatedLayout } from '../src/generated-layout';
import { pixelViewport } from '../src/pixel-viewport';
import { artSourceHash } from './art-source-hash';
import { meteorState } from '../src/meteor-timing';
import { meteorGeometry } from '../src/image-meteor';

const { values } = parseArgs({ options: { output: { type: 'string' }, 'meteor-only': { type: 'boolean', default: false } } });
if (!values.output) throw new Error('Provide a new --output directory and serve the frozen production build on 4173.');
const output = values.output;
const sourceSha256 = await artSourceHash();
const temporary = await mkdtemp(join(tmpdir(), 'readable-motion-'));
await mkdir(output, { recursive: false });
const correct = (input: string, corrected: string, dpr: number) => execFileSync(process.execPath,
  ['--import', 'tsx', 'scripts/correct-pixel-art.ts', '--input', input, '--output', corrected,
    '--cell-size', String(dpr), '--scale', String(dpr)], { stdio: 'ignore' });
const browser = await chromium.launch({ executablePath: process.env.ART_BROWSER_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const layouts: unknown[] = [], comparisons: unknown[] = [];
const meteorOnly = values['meteor-only'];
try {
  for (const [name, cssWidth, cssHeight, dpr] of [
    ['desktop', 1440, 900, 1], ['mobile', 390, 844, 2], ['landscape', 844, 390, 2],
  ] as const) {
    if (meteorOnly && name !== 'desktop') continue;
    const viewport = pixelViewport(cssWidth, cssHeight, dpr);
    const layout = generatedLayout(viewport.width, viewport.height);
    const sourceY = (y: number) => Math.round(layout.originY + y * layout.scale);
    const cityTop = Math.max(0, Math.min(...layout.composition.windows.map(([, y]) => sourceY(y))) - 16);
    const cityBottom = Math.min(viewport.height, Math.max(...layout.composition.windows.map(([, y, , h]) => sourceY(y + h))) + 16);
    const catTop = Math.max(0, Math.floor(layout.catY - 72 * layout.scale * layout.composition.actorScale));
    const catBottom = Math.min(viewport.height, Math.ceil(layout.catY + 16));
    const bands = [
      { name: 'sky', y: 0, height: Math.min(viewport.height, Math.ceil(layout.skyBottom + 8)) },
      { name: 'city-windows', y: cityTop, height: cityBottom - cityTop },
      { name: 'cat', y: catTop, height: catBottom - catTop },
    ];
    const sampleHeight = bands.reduce((sum, band) => sum + band.height, 0) * dpr;
    const atlas = new PNG({ width: viewport.width * dpr, height: sampleHeight * 2 });
    layouts.push(meteorOnly ? { name, native: [viewport.width, viewport.height], dpr, requestedSceneSeconds: 4,
      calculatedMeteorState: meteorState(4), calculatedMeteorGeometry: meteorGeometry(viewport.width, layout.skyBottom) } : { name, native: [viewport.width, viewport.height], dpr, scale: layout.scale, bands,
      atlasOrder: '2s sky/city-windows/cat, then 5s sky/city-windows/cat; all strips retain native pixels',
      calculatedNativePixelsPerSecond: { cloud: layout.scale * 4.8, aircraft: layout.scale * 10, train: layout.scale * 16 },
      calculatedUnwrappedNativeTravel2To5Seconds: { cloud: layout.scale * 4.8 * 3, aircraft: layout.scale * 10 * 3, train: layout.scale * 16 * 3 } });
    const page = await browser.newPage({ viewport: { width: cssWidth, height: cssHeight }, deviceScaleFactor: dpr, reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date(0) });
    await page.clock.pauseAt(new Date(0));
    await page.goto('http://127.0.0.1:4173/silent-webpage/');
    await page.waitForSelector('html[data-ready="true"]', { state: 'attached' });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    async function screenshot(label: string) {
      const path = `${temporary}/${name}-${label}.png`;
      await page.locator('canvas').screenshot({ path, style: '.settings-open{visibility:hidden!important}' });
      return { path, image: PNG.sync.read(await readFile(path)) };
    }
    let previous = 0;
    for (const seconds of meteorOnly ? [4] : [0, 2, 5, 8]) {
      while (previous < seconds * 1000) {
        const step = Math.min(1000, seconds * 1000 - previous);
        await page.clock.runFor(step);
        previous += step;
      }
      const shot = await screenshot(String(seconds));
      if (meteorOnly || seconds === 0 || seconds === 8) {
        const input = `${output}/${name}-${seconds}-source.png`;
        await copyFile(shot.path, input);
        correct(input, `${output}/${name}-${seconds}-corrected.png`, dpr);
      } else {
        let targetY = seconds === 2 ? 0 : sampleHeight;
        for (const band of bands) {
          // These are existing screenshot strips, never newly drawn artwork.
          PNG.bitblt(shot.image, atlas, 0, band.y * dpr, shot.image.width, band.height * dpr, 0, targetY);
          targetY += band.height * dpr;
        }
      }
    }
    if (meteorOnly) {
      await page.close();
      if (errors.length) throw new Error(errors.join('\n'));
      continue;
    }
    const atlasSource = `${output}/${name}-sequence-source.png`;
    await writeFile(atlasSource, PNG.sync.write(atlas));
    correct(atlasSource, `${output}/${name}-sequence-corrected.png`, dpr);
    await page.getByRole('button', { name: '設定を開く' }).click();
    await page.getByRole('checkbox', { name: '動きを減らす' }).check();
    await page.getByRole('button', { name: '設定を閉じる' }).click();
    const before = await screenshot('paused-before');
    await page.clock.runFor(1000);
    const after = await screenshot('paused-after');
    let changedPixels = 0;
    for (let i = 0; i < before.image.data.length; i += 4) {
      if (!before.image.data.subarray(i, i + 4).equals(after.image.data.subarray(i, i + 4))) changedPixels++;
    }
    if (changedPixels !== 0) throw new Error(`${name}: paused city changed ${changedPixels} pixels`);
    const hash = (image: PNG) => createHash('sha256').update(image.data).digest('hex');
    comparisons.push({ name, requestedPauseSceneSeconds: 8, pausedWallSeconds: 1, changedPixels,
      beforeRgbaSha256: hash(before.image), afterRgbaSha256: hash(after.image) });
    await page.close();
    if (errors.length) throw new Error(errors.join('\n'));
  }
} finally { await browser.close(); }
if (sourceSha256 !== await artSourceHash()) throw new Error('Rendering source changed during capture; discard screenshots.');
const capture = { sourceSha256, mode: meteorOnly ? 'desktop-meteor-at-4-seconds' : 'readable-motion',
  method: meteorOnly ? 'Unmodified production desktop page at requested 4 seconds (last RAF may precede requested time), clock paused before navigation and runFor steps <=1000ms. Corrected full-scene screenshot; computed geometry/state do not prove visual salience or lack of occlusion.' : 'Unmodified production page, clock paused before navigation, OS motion enabled after initialization; runFor steps <=1000ms. Requested 0/2/5/8s samples (or --meteor-only desktop at 4s) can follow the last 20fps RAF. Speed/travel metadata are calculated expectations, not pixel-measured motion. 2/5s strip atlases and 0/8s full scenes are corrected for visual review. Real settings UI stops the whole scene and is checked against a second full-canvas RGBA snapshot after 1s; temporary stop snapshots are not added to the PR.',
  layouts, comparisons, adoption: 'PENDING_LLM_VISUAL_REVIEW' };
const formatted = `{\n${Object.entries(capture).map(([key, value]) => `  ${JSON.stringify(key)}: ${Array.isArray(value)
  ? `[\n${value.map(row => `    ${JSON.stringify(row)}`).join(',\n')}\n  ]` : JSON.stringify(value)}`).join(',\n')}\n}\n`;
if (JSON.stringify(JSON.parse(formatted)) !== JSON.stringify(capture)) throw new Error('Metadata formatting changed content');
await writeFile(`${output}/capture.json`, formatted);
