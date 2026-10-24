import { copyFile, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PNG } from 'pngjs';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';
import { catPose } from '../src/animation';
import { generatedLayout } from '../src/generated-layout';
import { pixelViewport } from '../src/pixel-viewport';
import { artSourceHash } from './art-source-hash';

const { values } = parseArgs({ options: { output: { type: 'string' } } });
if (!values.output) throw new Error('Provide a new directory with --output art-reviews/<name>; serve the current production build on 4173 first.');
const output = values.output;
const sourceSha256 = await artSourceHash();
const temporary = await mkdtemp(join(tmpdir(), 'seated-cat-look-'));
await mkdir(output, { recursive: false });
const browser = await chromium.launch({
  executablePath: process.env.ART_BROWSER_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const samples: unknown[] = [];
const comparisons: unknown[] = [];
try {
  for (const [name, width, height, dpr] of [
    ['desktop', 1440, 900, 1], ['mobile', 390, 844, 2], ['portrait-large', 900, 1600, 1],
  ] as const) {
    const viewport = pixelViewport(width, height, dpr);
    const layout = generatedLayout(viewport.width, viewport.height);
    const sceneScale = layout.scale * layout.composition.actorScale;
    // Discover held pose intervals through the actual production timing function.
    // Midpoints avoid the 20fps ticker's last RAF landing on a transition boundary.
    const intervals: { start: number; end: number; state: string }[] = [];
    for (let tick = 0; tick < 2100; tick++) {
      const seconds = tick / 100;
      const pose = catPose(seconds, viewport.width, sceneScale);
      const state = pose.frame === 4 ? pose.lookFrame === undefined ? 'neutral' : `look-${pose.lookFrame}` : 'other';
      const previous = intervals.at(-1);
      if (previous?.state === state) previous.end = seconds + .01;
      else intervals.push({ start: seconds, end: seconds + .01, state });
    }
    const first = intervals.findIndex(interval => interval.state === 'look-0');
    const selected = intervals.slice(first - 1, first + 4);
    if (first < 1 || selected.map(interval => interval.state).join(',') !== 'neutral,look-0,look-1,look-0,neutral') {
      throw new Error(`${name}: expected complete seated look cycle; inspect production timing before capture`);
    }
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr, reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date(0) });
    await page.clock.pauseAt(new Date(0));
    await page.goto('http://127.0.0.1:4173/silent-webpage/');
    await page.waitForSelector('html[data-ready="true"]', { state: 'attached' });
    await page.addStyleTag({ content: '.settings-open{visibility:hidden!important}' });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const crop = {
      x: Math.floor(viewport.width * .75 - 54 * .25 * sceneScale - 16) * dpr,
      y: Math.floor(layout.catY - 138 * .25 * sceneScale - 12) * dpr,
      width: Math.ceil(108 * .25 * sceneScale + 32) * dpr,
      height: Math.ceil(139 * .25 * sceneScale + 24) * dpr,
    };
    const atlas = new PNG({ width: crop.width * 5, height: crop.height });
    let previousMilliseconds = 0;
    for (const [index, interval] of selected.entries()) {
      const requestedMilliseconds = Math.round((interval.start + interval.end) * 500);
      // Keep each clock operation short. fastForward would discard RAF callbacks
      // and Pixi's deltaMS clamp would prevent advancing the actual scene clock.
      while (previousMilliseconds < requestedMilliseconds) {
        const step = Math.min(1000, requestedMilliseconds - previousMilliseconds);
        await page.clock.runFor(step);
        previousMilliseconds += step;
      }
      const label = ['neutral-before', 'shallow-out', 'clear', 'shallow-back', 'neutral-after'][index]!;
      const input = `${temporary}/${name}-${label}-source.png`;
      await page.locator('canvas').screenshot({ path: input });
      const screenshot = PNG.sync.read(await readFile(input));
      if (crop.x < 0 || crop.y < 0 || crop.x + crop.width > screenshot.width || crop.y + crop.height > screenshot.height) {
        throw new Error(`${name}: seated cat context crop is outside the captured canvas`);
      }
      // Copy existing screenshot pixels only; this QA atlas creates no artwork.
      PNG.bitblt(screenshot, atlas, crop.x, crop.y, crop.width, crop.height, index * crop.width, 0);
      if (label === 'clear') {
        const fullSource = `${output}/${name}-clear-source.png`;
        await copyFile(input, fullSource);
        execFileSync(process.execPath, ['--import', 'tsx', 'scripts/correct-pixel-art.ts',
          '--input', fullSource, '--output', `${output}/${name}-clear-corrected.png`,
          '--cell-size', String(dpr), '--scale', String(dpr)], { stdio: 'ignore' });
      }
      const expected = catPose(requestedMilliseconds / 1000, viewport.width, sceneScale);
      samples.push({ name, label, requestedSeconds: requestedMilliseconds / 1000,
        expectedFrame: expected.frame, expectedLookFrame: expected.lookFrame ?? null,
        native: [viewport.width, viewport.height], dpr, sceneScale, catX: expected.x, footY: layout.catY,
        atlasPanel: index, cropPhysical: crop });
    }
    const changedPixels = (left: number, right: number, firstY = 0) => {
      let count = 0;
      for (let y = firstY; y < atlas.height; y++) for (let x = 0; x < crop.width; x++) {
        const a = (y * atlas.width + left * crop.width + x) * 4;
        const b = (y * atlas.width + right * crop.width + x) * 4;
        if (!atlas.data.subarray(a, a + 4).equals(atlas.data.subarray(b, b + 4))) count++;
      }
      return count;
    };
    comparisons.push({ name,
      changedFromNeutral: [1, 2, 3, 4].map(panel => changedPixels(0, panel)),
      changedLowerHalfFromNeutral: [1, 2, 3, 4].map(panel => changedPixels(0, panel, Math.ceil(atlas.height / 2))),
      changedShallowOutVsBack: changedPixels(1, 3),
    });
    const atlasSource = `${output}/${name}-sequence-source.png`;
    await writeFile(atlasSource, PNG.sync.write(atlas));
    execFileSync(process.execPath, ['--import', 'tsx', 'scripts/correct-pixel-art.ts',
      '--input', atlasSource, '--output', `${output}/${name}-sequence-corrected.png`,
      '--cell-size', String(dpr), '--scale', String(dpr)], { stdio: 'ignore' });
    await page.close();
    if (errors.length) throw new Error(errors.join('\n'));
  }
} finally { await browser.close(); }
if (sourceSha256 !== await artSourceHash()) throw new Error('Rendering source changed during capture; discard these screenshots.');
await writeFile(`${output}/capture.json`, JSON.stringify({ sourceSha256,
  method: 'Unmodified production page on 4173. Paused clock before navigation, OS motion enabled after initialization, sequential runFor steps of at most 1000ms. Sample midpoints discovered via catPose. Five native cat-context crops are copied into each device sequence atlas; only clear full scenes are retained in the review directory. Other full scenes remain temporary. Requested seconds and expected poses are calculated; actual output is reviewed visually, with the last 20fps RAF potentially preceding the requested time.',
  samples, comparisons, adoption: 'PENDING_LLM_VISUAL_REVIEW' }, null, 2) + '\n');
// Keep sample scalars on single lines to avoid repetitive review metadata.
const capturePath = `${output}/capture.json`;
const capture = JSON.parse(await readFile(capturePath, 'utf8')) as Record<string, unknown>;
const formatted = `{\n${Object.entries(capture).map(([key, value]) =>
  `  ${JSON.stringify(key)}: ${key === 'samples' || key === 'comparisons'
    ? `[\n${(value as unknown[]).map(row => `    ${JSON.stringify(row)}`).join(',\n')}\n  ]`
    : JSON.stringify(value)}`).join(',\n')}\n}\n`;
if (JSON.stringify(JSON.parse(formatted)) !== JSON.stringify(capture)) throw new Error('Metadata formatting changed content');
await writeFile(capturePath, formatted);
