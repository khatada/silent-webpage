import { copyFile, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { PNG } from 'pngjs';
import { chromium } from '@playwright/test';
import { generatedLayout } from '../src/generated-layout';
import { generatedArt } from '../src/generated-art';
import { pixelViewport } from '../src/pixel-viewport';
import { travelPosition } from '../src/animation';
import { trainServiceOffsets } from '../src/train-service';
import { artSourceHash } from './art-source-hash';

const { values } = parseArgs({ options: { output: { type: 'string' } } });
if (!values.output) throw new Error('Provide a new --output directory and serve the frozen production build on 4173.');
const output = values.output;
const sourceSha256 = await artSourceHash();
const temporary = await mkdtemp(join(tmpdir(), 'train-service-'));
await mkdir(output, { recursive: false });
const correct = (input: string, corrected: string, dpr: number) => execFileSync(process.execPath,
  ['--import', 'tsx', 'scripts/correct-pixel-art.ts', '--input', input, '--output', corrected,
    '--cell-size', String(dpr), '--scale', String(dpr)], { stdio: 'ignore' });
const browser = await chromium.launch({ executablePath: process.env.ART_BROWSER_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const layouts: unknown[] = [], samples: unknown[] = [];
try {
  for (const [name, cssWidth, cssHeight, dpr] of [
    ['desktop', 1440, 900, 1], ['mobile', 390, 844, 2], ['narrow', 295, 844, 1],
  ] as const) {
    const viewport = pixelViewport(cssWidth, cssHeight, dpr);
    const layout = generatedLayout(viewport.width, viewport.height);
    const trainScale = layout.scale * .24 * layout.composition.actorScale;
    const trainWidth = generatedArt.frames.train[2] * trainScale;
    const trainHeight = generatedArt.frames.train[3] * trainScale;
    const speed = layout.scale * 16;
    // Read-only reconstruction of the unchanged production pole-derived lead position.
    let leadInitialX = viewport.width * .1, nearest = Infinity;
    const visiblePoles: { x: number; width: number; center: number }[] = [];
    for (const [x, y, w, h] of layout.composition.railPoles) {
      const px = Math.round(layout.originX + x * layout.scale), py = Math.round(layout.originY + y * layout.scale);
      if (px + w * layout.scale <= 0 || px >= viewport.width || py + h * layout.scale <= 0 || py >= viewport.height) continue;
      const center = Math.round(layout.originX + (x + w / 2) * layout.scale);
      visiblePoles.push({ x: px, width: w * layout.scale, center });
      const distance = Math.abs(center - viewport.width * .25);
      if (distance < nearest) { nearest = distance; leadInitialX = center - trainWidth / 2; }
    }
    const offsets = trainServiceOffsets(viewport.width, trainWidth);
    const times = [0, 1, 8];
    let secondFirstWrapSeconds: number | null = null;
    if (name === 'mobile' && offsets.length > 1) {
      const span = viewport.width + trainWidth;
      secondFirstWrapSeconds = ((viewport.width - leadInitialX - offsets[1]!) % span + span) % span / speed;
      times.push(Math.max(0, secondFirstWrapSeconds - .15), secondFirstWrapSeconds + .15, secondFirstWrapSeconds + 1);
    }
    const selected = [...new Set(times.map(seconds => Math.round(seconds * 1000) / 1000))].sort((a, b) => a - b);
    const railTop = Math.max(0, Math.floor(layout.railBottom - trainHeight - 24));
    const railHeight = Math.min(viewport.height, Math.ceil(layout.railBottom + 24)) - railTop;
    const atlas = new PNG({ width: viewport.width * dpr, height: railHeight * dpr * selected.length });
    layouts.push({ name, native: [viewport.width, viewport.height], dpr, trainWidth, trainHeight,
      calculatedNativeSpeed: speed, leadInitialX, offsets, calculatedTrainCount: offsets.length,
      secondFirstWrapSeconds, visiblePoles, railTop, railHeight, atlasTimes: selected });
    const page = await browser.newPage({ viewport: { width: cssWidth, height: cssHeight }, deviceScaleFactor: dpr, reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date(0) });
    await page.clock.pauseAt(new Date(0));
    await page.goto('http://127.0.0.1:4173/silent-webpage/');
    await page.waitForSelector('html[data-ready="true"]', { state: 'attached' });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    let previous = 0;
    for (const [panel, seconds] of selected.entries()) {
      while (previous < seconds * 1000) {
        const step = Math.min(1000, seconds * 1000 - previous);
        await page.clock.runFor(step);
        previous += step;
      }
      const input = `${temporary}/${name}-${seconds}.png`;
      await page.locator('canvas').screenshot({ path: input, style: '.settings-open{visibility:hidden!important}' });
      const screenshot = PNG.sync.read(await readFile(input));
      // Native strips only copy existing production pixels; no original artwork is created.
      PNG.bitblt(screenshot, atlas, 0, railTop * dpr, screenshot.width, railHeight * dpr, 0, panel * railHeight * dpr);
      if (seconds === 8) {
        const fullSource = `${output}/${name}-8-source.png`;
        await copyFile(input, fullSource);
        correct(fullSource, `${output}/${name}-8-corrected.png`, dpr);
      }
      samples.push({ name, panel, requestedSceneSeconds: seconds,
        calculatedTrainXs: offsets.map(offset => travelPosition(seconds, viewport.width, trainWidth, speed, leadInitialX + offset)) });
    }
    const atlasSource = `${output}/${name}-rail-source.png`;
    await writeFile(atlasSource, PNG.sync.write(atlas));
    correct(atlasSource, `${output}/${name}-rail-corrected.png`, dpr);
    await page.close();
    if (errors.length) throw new Error(errors.join('\n'));
  }
} finally { await browser.close(); }
if (sourceSha256 !== await artSourceHash()) throw new Error('Rendering source changed during capture; discard screenshots.');
const capture = { sourceSha256,
  method: 'Unmodified production page; clock paused before navigation, motion enabled after initialization, runFor steps <=1000ms. Train counts/positions/speed and wrap timing are calculated expectations, not pixel measurements. Actual last 20fps RAF may precede requested time. Native rail-strip atlases show initial movement, mobile second-train wrap and pole occlusion; full scenes are retained only at 8 seconds. LLM visual review decides adoption.',
  layouts, samples, adoption: 'PENDING_LLM_VISUAL_REVIEW' };
const formatted = `{\n${Object.entries(capture).map(([key, value]) => `  ${JSON.stringify(key)}: ${Array.isArray(value)
  ? `[\n${value.map(row => `    ${JSON.stringify(row)}`).join(',\n')}\n  ]` : JSON.stringify(value)}`).join(',\n')}\n}\n`;
if (JSON.stringify(JSON.parse(formatted)) !== JSON.stringify(capture)) throw new Error('Metadata formatting changed content');
await writeFile(`${output}/capture.json`, formatted);
